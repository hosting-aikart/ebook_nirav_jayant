import { adminConfigured } from "./admin.js";
import { createApp } from "./app.js";
import { config } from "./config.js";
import { closeDb, dbConfigured, migrate } from "./db.js";
import { razorpayConfigured } from "./razorpay.js";

console.log("\nSTILL. store server");

if (dbConfigured) {
  try {
    await migrate((line) => console.log(line));
    console.log("✔ Database ready");
  } catch (err) {
    console.error("✖ Database:", (err as Error).message);
  }
} else {
  console.warn("⚠ DATABASE_URL is not set in backend/.env: the site shows its built-in books and checkout is off.");
}

if (!razorpayConfigured()) {
  console.warn("⚠ RAZORPAY_KEY_ID / RAZORPAY_KEY_SECRET are not set: checkout is off.");
} else if (config.razorpayKeyId.startsWith("rzp_live_")) {
  console.warn("⚠ Razorpay LIVE keys: payments charge real money.");
} else {
  console.log("✔ Razorpay test keys (no real money)");
}
if (!config.razorpayWebhookSecret) console.log("· No RAZORPAY_WEBHOOK_SECRET: the webhook backup is off (checkout still works).");
if (!adminConfigured()) console.warn("⚠ ADMIN_EMAIL / ADMIN_PASSWORD are not set: admin sign-in is off.");

const server = createApp().listen(config.port, () => {
  console.log(`✔ API on http://localhost:${config.port}\n`);
});

const shutdown = () => {
  server.close();
  closeDb().finally(() => process.exit(0));
};
process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
