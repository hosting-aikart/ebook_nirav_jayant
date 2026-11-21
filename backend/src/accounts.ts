import crypto from "node:crypto";
import { promisify } from "node:util";
import { Router, type Request, type Response } from "express";
import { SignJWT, jwtVerify } from "jose";
import { config } from "./config.js";
import { db } from "./db.js";
import { HttpError } from "./http.js";
import { emailConfigured, sendEmail } from "./notify.js";

// ============================================================
// Customer accounts (mounted at /api/account)
//
// Sign-in is a JWT (HS256) kept in an httpOnly cookie: page scripts can't read it, other
// sites can't send it (SameSite=Lax), and it only travels over HTTPS in production.
// Every request re-checks the account in the database, and each JWT carries the account's
// token_version, so a password reset immediately signs out every old session.
// ============================================================

const scrypt = promisify(crypto.scrypt) as (pw: string, salt: Buffer, len: number) => Promise<Buffer>;

const COOKIE = "still_session";
const SESSION_DAYS = 30;
const RESET_MINUTES = 30;
const ISSUER = "still-store";
const AUDIENCE = "still-customer";
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MIN_PASSWORD = 8;

// ---------- Passwords (scrypt, salted; the password itself is never stored) ----------

async function hashPassword(password: string) {
  const salt = crypto.randomBytes(16);
  const hash = await scrypt(password, salt, 64);
  return `scrypt$${salt.toString("base64")}$${hash.toString("base64")}`;
}

async function checkPassword(password: string, stored: string) {
  const [scheme, salt, hash] = stored.split("$");
  if (scheme !== "scrypt" || !salt || !hash) return false;
  const expected = Buffer.from(hash, "base64");
  const actual = await scrypt(password, Buffer.from(salt, "base64"), expected.length);
  return crypto.timingSafeEqual(actual, expected);
}

// Checked when the email has no account, so the response time doesn't reveal which emails are registered.
const dummyHash = hashPassword(crypto.randomUUID());

function validatePassword(password: string) {
  if (password.length < MIN_PASSWORD) {
    throw new HttpError(400, `Please choose a password of at least ${MIN_PASSWORD} characters.`);
  }
  if (password.length > 200) throw new HttpError(400, "That password is too long.");
}

// ---------- JWT ----------

let secretPromise: Promise<Uint8Array> | null = null;

/** JWT_SECRET from .env, or a random 64-byte key created once and kept in the database. */
function jwtSecret(): Promise<Uint8Array> {
  secretPromise ??= (async () => {
    if (config.jwtSecret) return new TextEncoder().encode(config.jwtSecret);
    await db().query(
      "insert into app_secrets (name, value) values ('jwt_secret', $1) on conflict (name) do nothing",
      [crypto.randomBytes(64).toString("base64")],
    );
    const { rows } = await db().query<{ value: string }>("select value from app_secrets where name = 'jwt_secret'");
    return new Uint8Array(Buffer.from(rows[0].value, "base64"));
  })().catch((err) => {
    secretPromise = null; // try again on the next request
    throw err;
  });
  return secretPromise;
}

async function issueSession(res: Response, account: { id: string; token_version: number }) {
  const token = await new SignJWT({ tv: account.token_version })
    .setProtectedHeader({ alg: "HS256", typ: "JWT" })
    .setSubject(account.id)
    .setIssuer(ISSUER)
    .setAudience(AUDIENCE)
    .setIssuedAt()
    .setExpirationTime(`${SESSION_DAYS}d`)
    .sign(await jwtSecret());
  res.cookie(COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: config.production || config.siteUrl.startsWith("https://"),
    path: "/api",
    maxAge: SESSION_DAYS * 86_400_000,
  });
}

function clearSession(res: Response) {
  res.clearCookie(COOKIE, { path: "/api" });
}

function readCookie(req: Request, name: string): string | null {
  for (const part of (req.headers.cookie ?? "").split(";")) {
    const [key, ...rest] = part.trim().split("=");
    if (key === name) return decodeURIComponent(rest.join("="));
  }
  return null;
}

type AccountRow = { id: string; name: string; email: string; created_at: string; token_version: number };
const profile = (a: AccountRow) => ({ name: a.name, email: a.email, memberSince: a.created_at });

/** The signed-in customer, or null (no cookie, bad signature, expired, or signed out by a password reset). */
export async function currentAccount(req: Request): Promise<AccountRow | null> {
  const token = readCookie(req, COOKIE);
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, await jwtSecret(), {
      algorithms: ["HS256"],
      issuer: ISSUER,
      audience: AUDIENCE,
    });
    if (typeof payload.sub !== "string" || typeof payload.tv !== "number") return null;
    const { rows } = await db().query<AccountRow>(
      "select id, name, email, created_at, token_version from accounts where id = $1 and token_version = $2",
      [payload.sub, payload.tv],
    );
    return rows[0] ?? null;
  } catch {
    return null;
  }
}

export async function requireAccount(req: Request, message = "Please sign in again."): Promise<AccountRow> {
  const account = await currentAccount(req);
  if (!account) throw new HttpError(401, message);
  return account;
}

// ---------- Rate limits (slow down password guessing and email spam) ----------

function limiter(max: number, minutes: number, message: string) {
  const hits = new Map<string, { count: number; resetAt: number }>();
  return {
    check(key: string) {
      const entry = hits.get(key);
      if (entry && entry.resetAt < Date.now()) hits.delete(key);
      else if (entry && entry.count >= max) throw new HttpError(429, message);
    },
    hit(key: string) {
      const entry = hits.get(key);
      if (entry) entry.count++;
      else hits.set(key, { count: 1, resetAt: Date.now() + minutes * 60_000 });
    },
    clear(key: string) {
      hits.delete(key);
    },
  };
}
const TOO_MANY = "Too many attempts. Please wait 15 minutes and try again.";
const ipFailures = limiter(10, 15, TOO_MANY); // wrong passwords per IP address
const emailFailures = limiter(10, 15, TOO_MANY); // wrong passwords per account, from any IP
const resetRequests = limiter(5, 15, TOO_MANY); // "Forgot password?" emails per IP address

const ipOf = (req: Request) => req.ip ?? "unknown";

// ---------- Routes ----------

export const accountRouter = Router();

accountRouter.post("/signup", async (req, res) => {
  const ip = ipOf(req);
  ipFailures.check(ip);
  const name = String(req.body?.name ?? "").trim().slice(0, 120);
  const email = String(req.body?.email ?? "").trim().toLowerCase().slice(0, 200);
  const password = String(req.body?.password ?? "");
  if (!name) throw new HttpError(400, "Please enter your name.");
  if (!EMAIL_RE.test(email)) throw new HttpError(400, "Please enter a valid email address.");
  validatePassword(password);

  const { rows } = await db().query<AccountRow>(
    `insert into accounts (name, email, password_hash, last_login_at) values ($1, $2, $3, now())
     on conflict (email) do nothing
     returning id, name, email, created_at, token_version`,
    [name, email, await hashPassword(password)],
  );
  if (!rows[0]) {
    ipFailures.hit(ip); // stops sign-up being used to check many emails quickly
    throw new HttpError(409, "An account with this email already exists. Please sign in instead.");
  }
  await issueSession(res, rows[0]);
  res.status(201).json({ account: profile(rows[0]) });
});

accountRouter.post("/login", async (req, res) => {
  const ip = ipOf(req);
  const email = String(req.body?.email ?? "").trim().toLowerCase().slice(0, 200);
  const password = String(req.body?.password ?? "");
  ipFailures.check(ip);
  emailFailures.check(email);

  const { rows } = await db().query<AccountRow & { password_hash: string }>(
    "select id, name, email, created_at, token_version, password_hash from accounts where email = $1",
    [email],
  );
  const account = rows[0];
  const ok = await checkPassword(password.slice(0, 200), account?.password_hash ?? (await dummyHash));
  if (!account || !ok) {
    ipFailures.hit(ip);
    emailFailures.hit(email);
    throw new HttpError(401, "Wrong email or password.");
  }
  ipFailures.clear(ip);
  emailFailures.clear(email);
  await db().query("update accounts set last_login_at = now() where id = $1", [account.id]);
  await issueSession(res, account);
  res.json({ account: profile(account) });
});

accountRouter.post("/logout", (_req, res) => {
  clearSession(res);
  res.json({ ok: true });
});

accountRouter.get("/me", async (req, res) => {
  const account = await currentAccount(req);
  if (!account) clearSession(res);
  res.set("Cache-Control", "no-store").json({ account: account ? profile(account) : null });
});

/**
 * "Forgot password?": emails a one-time link valid for 30 minutes.
 * Always answers the same way, so it can't be used to find out who has an account.
 */
accountRouter.post("/forgot-password", async (req, res) => {
  const ip = ipOf(req);
  resetRequests.check(ip);
  resetRequests.hit(ip);
  const email = String(req.body?.email ?? "").trim().toLowerCase().slice(0, 200);
  if (!EMAIL_RE.test(email)) throw new HttpError(400, "Please enter a valid email address.");

  const reply = {
    ok: true,
    message: "If an account exists for this email, we've sent a link to reset the password. It's valid for 30 minutes.",
  };

  const { rows } = await db().query<{ id: string; name: string; recent: number }>(
    `select a.id, a.name,
            (select count(*)::int from password_resets r
             where r.account_id = a.id and r.created_at > now() - interval '1 hour') as recent
     from accounts a where a.email = $1`,
    [email],
  );
  const account = rows[0];
  // At most 3 reset emails per account per hour.
  if (!account || account.recent >= 3) return res.json(reply);

  const token = crypto.randomBytes(32).toString("base64url");
  await db().query(
    `insert into password_resets (account_id, token_hash, expires_at)
     values ($1, $2, now() + make_interval(mins => $3))`,
    [account.id, crypto.createHash("sha256").update(token).digest("hex"), RESET_MINUTES],
  );
  const link = `${config.siteUrl}/account/reset?token=${token}`;

  if (!emailConfigured()) {
    console.warn("Password reset requested, but email isn't set up (SMTP_USER / SMTP_PASS in backend/.env).");
    // Development only: print the link so the flow can be tested without email.
    if (!config.production) console.warn(`  Reset link for ${email}: ${link}`);
    return res.json(reply);
  }

  const first = account.name.split(" ")[0] || "there";
  await sendEmail({
    to: email,
    subject: "Reset your password",
    text: [
      `Hi ${first},`,
      "",
      "We received a request to reset the password for your account.",
      `Open this link to choose a new password (valid for ${RESET_MINUTES} minutes):`,
      link,
      "",
      "If you didn't ask for this, you can ignore this email; your password stays the same.",
    ].join("\n"),
    html: `<div style="font-family:Arial,sans-serif;color:#123f48;max-width:520px">
  <p>Hi ${escapeHtml(first)},</p>
  <p>We received a request to reset the password for your account.</p>
  <p><a href="${escapeHtml(link)}" style="display:inline-block;padding:12px 22px;background:#123f48;color:#fffaf4;text-decoration:none;border-radius:999px">Choose a new password</a></p>
  <p style="font-size:13px;color:#555">This link is valid for ${RESET_MINUTES} minutes and can be used once.<br>
  If you didn't ask for this, you can ignore this email; your password stays the same.</p>
</div>`,
  });
  res.json(reply);
});

/** Sets a new password from an emailed link, signs out every other session, and signs this browser in. */
accountRouter.post("/reset-password", async (req, res) => {
  const token = String(req.body?.token ?? "");
  const password = String(req.body?.password ?? "");
  validatePassword(password);
  const invalid = new HttpError(400, "This reset link is invalid or has expired. Please ask for a new one.");
  if (!/^[A-Za-z0-9_-]{43}$/.test(token)) throw invalid;

  const tokenHash = crypto.createHash("sha256").update(token).digest("hex");
  const passwordHash = await hashPassword(password);
  const client = await db().connect();
  let account: AccountRow | undefined;
  try {
    await client.query("begin");
    const { rows: resets } = await client.query<{ id: string; account_id: string }>(
      `select id, account_id from password_resets
       where token_hash = $1 and used_at is null and expires_at > now()
       for update`,
      [tokenHash],
    );
    if (!resets[0]) {
      await client.query("rollback");
      throw invalid;
    }
    ({
      rows: [account],
    } = await client.query<AccountRow>(
      `update accounts set password_hash = $2, token_version = token_version + 1, last_login_at = now()
       where id = $1 returning id, name, email, created_at, token_version`,
      [resets[0].account_id, passwordHash],
    ));
    // This link and any other outstanding links for the account can't be used again.
    await client.query("update password_resets set used_at = now() where account_id = $1 and used_at is null", [
      resets[0].account_id,
    ]);
    await client.query("commit");
  } catch (err) {
    await client.query("rollback").catch(() => undefined);
    throw err;
  } finally {
    client.release();
  }
  emailFailures.clear(account!.email);
  await issueSession(res, account!);
  res.json({ account: profile(account!) });
});

/** The customer's paid orders, newest first, with delivery status. */
accountRouter.get("/orders", async (req, res) => {
  const account = await requireAccount(req);
  const { rows } = await db().query(
    `select o.razorpay_order_id as "orderId", o.razorpay_payment_id as "paymentId", o.amount as total,
            o.created_at as "createdAt", o.paid_at as "paidAt",
            o.delivery_status as "deliveryStatus", o.tracking_info as "tracking", o.shipped_at as "shippedAt",
            c.email,
            json_build_object('name', coalesce(o.ship_name, ''), 'phone', coalesce(o.ship_phone, ''),
                              'address', coalesce(o.ship_address, ''), 'city', coalesce(o.ship_city, ''),
                              'state', coalesce(o.ship_state, ''), 'pincode', coalesce(o.ship_pincode, '')) as "shipTo",
            coalesce((select json_agg(json_build_object('title', i.title, 'quantity', i.quantity,
                                                        'unitPrice', i.unit_price, 'bookId', i.book_id)
                                      order by i.position)
                      from order_items i where i.order_id = o.id), '[]'::json) as items
     from orders o left join customers c on c.id = o.customer_id
     where o.account_id = $1 and o.status = 'paid'
     order by coalesce(o.paid_at, o.created_at) desc
     limit 200`,
    [account.id],
  );
  res.set("Cache-Control", "no-store").json({ orders: rows });
});

function escapeHtml(v: string) {
  return v.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
}
