import crypto from "node:crypto";
import express, { Router, type NextFunction, type Request, type Response } from "express";
import { config } from "./config.js";
import { db } from "./db.js";
import { HttpError } from "./http.js";

// ---------- Sign-in ----------
// One admin, set in backend/.env (ADMIN_EMAIL, ADMIN_PASSWORD). A session is a signed token
// the admin panel keeps in the browser and sends as "Authorization: Bearer <token>".

const SESSION_HOURS = 12;
export const adminConfigured = () => Boolean(config.adminEmail && config.adminPassword);

// Derived from the password, so changing ADMIN_PASSWORD signs everyone out.
const sessionKey = () =>
  crypto.createHash("sha256").update(`still-admin-session\0${config.adminEmail}\0${config.adminPassword}`).digest();

const sha256 = (text: string) => crypto.createHash("sha256").update(text).digest();
const sameText = (a: string, b: string) => crypto.timingSafeEqual(sha256(a), sha256(b));

function signSession(email: string) {
  const payload = Buffer.from(JSON.stringify({ email, exp: Date.now() + SESSION_HOURS * 3600_000 })).toString(
    "base64url",
  );
  const mac = crypto.createHmac("sha256", sessionKey()).update(payload).digest("base64url");
  return `${payload}.${mac}`;
}

function readSession(token: string): { email: string } | null {
  const [payload, mac] = token.split(".");
  if (!payload || !mac || !adminConfigured()) return null;
  const expected = crypto.createHmac("sha256", sessionKey()).update(payload).digest("base64url");
  if (!sameText(mac, expected)) return null;
  try {
    const data = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
    return typeof data.exp === "number" && data.exp > Date.now() && data.email === config.adminEmail
      ? { email: data.email }
      : null;
  } catch {
    return null;
  }
}

// Slows down password guessing: 10 failed attempts per 15 minutes per IP address.
const failures = new Map<string, { count: number; resetAt: number }>();
function checkRateLimit(ip: string) {
  const entry = failures.get(ip);
  if (entry && entry.resetAt < Date.now()) failures.delete(ip);
  else if (entry && entry.count >= 10) {
    throw new HttpError(429, "Too many failed sign-in attempts. Please wait 15 minutes and try again.");
  }
}
function recordFailure(ip: string) {
  const entry = failures.get(ip);
  if (entry) entry.count++;
  else failures.set(ip, { count: 1, resetAt: Date.now() + 15 * 60_000 });
}

const locals = (res: Response) => res.locals as { adminEmail?: string };

function requireAdmin(req: Request, res: Response, next: NextFunction) {
  const token = req.headers.authorization?.match(/^Bearer (.+)$/)?.[1];
  const session = token ? readSession(token) : null;
  if (!session) throw new HttpError(401, "Please sign in again.");
  locals(res).adminEmail = session.email;
  next();
}

// ---------- Validation helpers ----------

const bad = (field: string) => new HttpError(400, `Invalid value for "${field}".`);

const text = (max: number, required = false) => (v: unknown, field: string) => {
  if (typeof v !== "string") throw bad(field);
  const value = v.trim().slice(0, max);
  if (required && !value) throw new HttpError(400, `Please enter a ${field}.`);
  return value;
};
const optionalText = (max: number) => (v: unknown, field: string) =>
  v === null || v === "" ? null : text(max)(v, field);
const int = (min: number, max: number) => (v: unknown, field: string) => {
  const n = Number(v);
  if (!Number.isInteger(n) || n < min || n > max) throw bad(field);
  return n;
};
const bool = (v: unknown, field: string) => {
  if (typeof v !== "boolean") throw bad(field);
  return v;
};
const oneOf = (values: string[]) => (v: unknown, field: string) => {
  if (typeof v !== "string" || !values.includes(v)) throw bad(field);
  return v;
};
// jsonb columns are sent as JSON text.
const textList = (maxItems: number, maxLength: number) => (v: unknown, field: string) => {
  if (!Array.isArray(v) || v.length > maxItems || v.some((s) => typeof s !== "string" || s.length > maxLength)) {
    throw bad(field);
  }
  return JSON.stringify(v);
};
const pageList = (v: unknown, field: string) => {
  const ok =
    Array.isArray(v) &&
    v.length <= 60 &&
    v.every((p) => Array.isArray(p) && p.length === 2 && p.every((s) => typeof s === "string" && s.length <= 4000));
  if (!ok) throw bad(field);
  return JSON.stringify(v);
};

/** Book columns the admin may set, with their checks. */
const BOOK_FIELDS: Record<string, (v: unknown, field: string) => unknown> = {
  title: text(200, true),
  subtitle: text(300),
  eyebrow: text(120),
  author: text(120),
  price: int(0, 1_000_000),
  description: text(4000),
  quote: text(1000),
  cover: optionalText(1000),
  cover_class: text(60),
  category: oneOf(["kids", "meditation", "abundance"]),
  pages: pageList,
  preview_images: textList(40, 1000),
  about: textList(40, 4000),
  highlights: textList(40, 500),
  is_active: bool,
  featured: bool,
  language: text(40, true),
  sort_order: int(-100_000, 100_000),
};

/** Picks the known book fields out of a request body (unknown ones are ignored). */
function bookColumns(body: Record<string, unknown>) {
  const columns: string[] = [];
  const values: unknown[] = [];
  for (const [field, check] of Object.entries(BOOK_FIELDS)) {
    if (body[field] === undefined) continue;
    columns.push(field);
    values.push(check(body[field], field));
  }
  return { columns, values };
}

const SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Turns database constraint errors into messages the admin can act on. */
function friendlyDbError(err: unknown): never {
  const code = (err as { code?: string }).code;
  if (code === "23505") throw new HttpError(409, "A book with this ID already exists. Change the ID.");
  if (code === "23001" || code === "23503") {
    throw new HttpError(
      409,
      "This book has orders, so it can't be deleted (customer records must be kept). Use “Hide” instead to remove it from the website.",
    );
  }
  if (code === "23514" || code === "22P02") throw new HttpError(400, "One of the values isn't allowed. Please check the form.");
  throw err;
}

// ---------- Routes (mounted at /api/admin) ----------

export const adminRouter = Router();

adminRouter.post("/login", (req, res) => {
  if (!adminConfigured()) {
    throw new HttpError(503, "Admin sign-in isn't set up yet. Add ADMIN_EMAIL and ADMIN_PASSWORD to backend/.env and restart the server.");
  }
  const ip = req.ip ?? "unknown";
  checkRateLimit(ip);
  const email = String(req.body?.email ?? "").trim().toLowerCase();
  const password = String(req.body?.password ?? "");
  // Check both, always, so the response time doesn't reveal which one was wrong.
  const emailOk = sameText(email, config.adminEmail);
  const passwordOk = sameText(password, config.adminPassword);
  if (!emailOk || !passwordOk) {
    recordFailure(ip);
    throw new HttpError(401, "Wrong email or password.");
  }
  failures.delete(ip);
  res.json({ token: signSession(config.adminEmail), email: config.adminEmail });
});

adminRouter.use(requireAdmin);

adminRouter.get("/me", (_req, res) => {
  res.json({ email: locals(res).adminEmail });
});

// ---- Books ----

adminRouter.get("/books", async (_req, res) => {
  const { rows } = await db().query("select * from books order by sort_order, created_at");
  res.json(rows);
});

adminRouter.post("/books", async (req, res) => {
  const id = String(req.body?.id ?? "").trim();
  if (!SLUG_RE.test(id) || id.length > 60) {
    throw new HttpError(400, "The book ID may only use lowercase letters, numbers and dashes.");
  }
  if (req.body?.title === undefined) throw new HttpError(400, "Please enter a title.");
  const { columns, values } = bookColumns(req.body);
  const placeholders = columns.map((_, i) => `$${i + 2}`);
  const { rows } = await db()
    .query(`insert into books (id, ${columns.join(", ")}) values ($1, ${placeholders.join(", ")}) returning *`, [
      id,
      ...values,
    ])
    .catch(friendlyDbError);
  res.status(201).json(rows[0]);
});

adminRouter.patch("/books/:id", async (req, res) => {
  const { columns, values } = bookColumns(req.body ?? {});
  if (!columns.length) throw new HttpError(400, "Nothing to save.");
  const sets = columns.map((c, i) => `${c} = $${i + 2}`);
  const { rows } = await db()
    .query(`update books set ${sets.join(", ")} where id = $1 returning *`, [req.params.id, ...values])
    .catch(friendlyDbError);
  if (!rows[0]) throw new HttpError(404, "Book not found.");
  res.json(rows[0]);
});

adminRouter.delete("/books/:id", async (req, res) => {
  const { rowCount } = await db().query("delete from books where id = $1", [req.params.id]).catch(friendlyDbError);
  if (!rowCount) throw new HttpError(404, "Book not found.");
  res.json({ ok: true });
});

// ---- Image uploads (covers and preview pages) ----
// SVG is not accepted: it can carry scripts and is served from the site's own address.
const IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif", "image/avif"];

adminRouter.post("/uploads", express.raw({ type: IMAGE_TYPES, limit: "8mb" }), async (req, res) => {
  const type = req.headers["content-type"]?.split(";")[0].trim().toLowerCase() ?? "";
  if (!IMAGE_TYPES.includes(type) || !Buffer.isBuffer(req.body) || !req.body.length) {
    throw new HttpError(400, "Please choose a JPG, PNG, WebP, GIF or AVIF image.");
  }
  const { rows } = await db().query<{ id: string }>(
    "insert into uploads (content_type, data) values ($1, $2) returning id",
    [type, req.body],
  );
  res.status(201).json({ url: `/api/uploads/${rows[0].id}` });
});

// ---- Orders and customers ----

adminRouter.get("/orders", async (_req, res) => {
  const { rows } = await db().query(
    `select o.*,
            case when c.id is null then null
                 else json_build_object('name', c.name, 'email', c.email, 'phone', c.phone) end as customers,
            coalesce((select json_agg(json_build_object('title', i.title, 'quantity', i.quantity,
                                                        'unit_price', i.unit_price, 'position', i.position)
                                      order by i.position)
                      from order_items i where i.order_id = o.id), '[]'::json) as order_items
     from orders o left join customers c on c.id = o.customer_id
     order by o.created_at desc
     limit 2000`,
  );
  res.json(rows);
});

const DELIVERY_STATUSES = ["to_ship", "shipped", "delivered", "cancelled"];

adminRouter.patch("/orders/:id", async (req, res) => {
  if (!UUID_RE.test(req.params.id)) throw new HttpError(404, "Order not found.");
  const sets: string[] = [];
  const values: unknown[] = [req.params.id];
  if (req.body?.delivery_status !== undefined) {
    values.push(oneOf(DELIVERY_STATUSES)(req.body.delivery_status, "delivery status"));
    sets.push(`delivery_status = $${values.length}`);
    if (req.body.delivery_status === "shipped") sets.push("shipped_at = now()");
  }
  if (req.body?.tracking_info !== undefined) {
    values.push(optionalText(500)(req.body.tracking_info, "tracking info"));
    sets.push(`tracking_info = $${values.length}`);
  }
  if (!sets.length) throw new HttpError(400, "Nothing to save.");
  const { rowCount } = await db().query(`update orders set ${sets.join(", ")} where id = $1`, values);
  if (!rowCount) throw new HttpError(404, "Order not found.");
  res.json({ ok: true });
});

adminRouter.get("/customers", async (_req, res) => {
  const { rows } = await db().query(
    `select c.*,
            coalesce((select json_agg(json_build_object('amount', o.amount, 'status', o.status,
                                                        'book_title', o.book_title) order by o.created_at)
                      from orders o where o.customer_id = c.id), '[]'::json) as orders
     from customers c
     order by c.created_at desc
     limit 5000`,
  );
  res.json(rows);
});
