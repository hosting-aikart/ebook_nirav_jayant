import fs from "node:fs";
import path from "node:path";
import express, { type NextFunction, type Request, type Response } from "express";
import { adminConfigured, adminRouter } from "./admin.js";
import { createOrder, handleWebhook, verifyPayment } from "./checkout.js";
import { backendDir, config } from "./config.js";
import { db, dbConfigured } from "./db.js";
import { HttpError } from "./http.js";
import { razorpayConfigured } from "./razorpay.js";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function createApp() {
  const app = express();
  app.disable("x-powered-by");
  // Real client IPs (for the sign-in rate limit) when behind a local or private-network proxy.
  app.set("trust proxy", ["loopback", "linklocal", "uniquelocal"]);

  // Razorpay signs the raw body, so the webhook reads it before any JSON parsing.
  app.post("/api/razorpay/webhook", express.raw({ type: () => true, limit: "1mb" }), async (req, res) => {
    try {
      const body = Buffer.isBuffer(req.body) ? req.body : Buffer.alloc(0);
      const status = await handleWebhook(body, String(req.headers["x-razorpay-signature"] ?? ""));
      res.status(status).send(status === 200 ? "ok" : "error");
    } catch (err) {
      console.error("Razorpay webhook failed:", err);
      res.status(500).send("error"); // Razorpay retries later
    }
  });

  app.use(express.json({ limit: "200kb" }));

  app.get("/api/health", (_req, res) => {
    res.json({
      ok: true,
      database: dbConfigured,
      razorpay: razorpayConfigured() ? (config.razorpayKeyId.startsWith("rzp_live_") ? "live" : "test") : "not set",
      webhook: Boolean(config.razorpayWebhookSecret),
      admin: adminConfigured(),
    });
  });

  app.get("/api/books", async (_req, res) => {
    const { rows } = await db().query(
      "select * from books where is_active order by sort_order, created_at",
    );
    res.set("Cache-Control", "no-cache").json(rows);
  });

  app.post("/api/checkout/order", async (req, res) => {
    res.json(await createOrder(req.body ?? {}));
  });

  app.post("/api/checkout/verify", async (req, res) => {
    res.json(await verifyPayment(req.body ?? {}));
  });

  app.get("/api/uploads/:id", async (req, res) => {
    if (!UUID_RE.test(req.params.id)) throw new HttpError(404, "Not found.");
    const { rows } = await db().query<{ content_type: string; data: Buffer }>(
      "select content_type, data from uploads where id = $1",
      [req.params.id],
    );
    if (!rows[0]) throw new HttpError(404, "Not found.");
    res
      .set({
        "Content-Type": rows[0].content_type,
        "Cache-Control": "public, max-age=31536000, immutable", // a new upload always gets a new id
        "X-Content-Type-Options": "nosniff",
      })
      .send(rows[0].data);
  });

  app.use("/api/admin", adminRouter);
  app.use("/api", () => {
    throw new HttpError(404, "Not found.");
  });

  // After `npm run build`, this server also serves the website itself (one address for both).
  const site = path.join(backendDir, "..", "frontend", "dist");
  if (fs.existsSync(path.join(site, "index.html"))) {
    app.use(express.static(site, { index: false }));
    app.get(/^(?!\/api\/).*/, (_req, res) => res.sendFile(path.join(site, "index.html")));
  }

  // Express 5 sends errors thrown in async handlers here.
  app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
    if (err instanceof HttpError) {
      res.status(err.status).json({ error: err.message, ...err.extra });
      return;
    }
    const type = (err as { type?: string }).type;
    if (type === "entity.parse.failed") {
      res.status(400).json({ error: "Invalid request." });
      return;
    }
    if (type === "entity.too.large") {
      res.status(413).json({ error: "That's too large. Images can be up to 8 MB." });
      return;
    }
    console.error(err);
    res.status(500).json({ error: "Something went wrong. Please try again." });
  });

  return app;
}
