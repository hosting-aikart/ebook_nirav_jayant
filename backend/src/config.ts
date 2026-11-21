import path from "node:path";
import { fileURLToPath } from "node:url";

/** The backend/ folder (from src/ when run with tsx, from dist/ after a build). */
export const backendDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

// Local development reads backend/.env. On a host, set real environment variables instead
// (they take precedence over the file).
try {
  process.loadEnvFile(path.join(backendDir, ".env"));
} catch {
  /* no .env file */
}

const env = (name: string) => process.env[name]?.trim() ?? "";

export const config = {
  port: Number(env("PORT")) || 5000,
  databaseUrl: env("DATABASE_URL"),
  razorpayKeyId: env("RAZORPAY_KEY_ID"),
  razorpayKeySecret: env("RAZORPAY_KEY_SECRET"),
  /** Optional: only needed once the webhook is set up in the Razorpay dashboard. */
  razorpayWebhookSecret: env("RAZORPAY_WEBHOOK_SECRET"),
  adminEmail: env("ADMIN_EMAIL").toLowerCase(),
  adminPassword: env("ADMIN_PASSWORD"),
  /** Optional: JWT signing key for customer sign-in. If empty, a random key is created and kept in the database. */
  jwtSecret: env("JWT_SECRET"),
  /** The website's public address, used in emailed links (e.g. password reset). */
  siteUrl: (env("SITE_URL") || env("FRONTEND_URL") || "http://localhost:5173").replace(/\/+$/, ""),
  production: env("NODE_ENV") === "production",
  /** Where "new order" emails go. Defaults to the admin email. */
  notifyEmail: (env("NOTIFY_EMAIL") || env("ADMIN_EMAIL")).toLowerCase(),
  /** Mail account that sends them (for Gmail: the address + a 16-character App Password). */
  smtpHost: env("SMTP_HOST") || "smtp.gmail.com",
  smtpPort: Number(env("SMTP_PORT")) || 465,
  smtpUser: env("SMTP_USER"),
  smtpPass: env("SMTP_PASS").replace(/\s+/g, ""),
};
