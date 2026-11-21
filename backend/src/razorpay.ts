import crypto from "node:crypto";
import { config } from "./config.js";
import { HttpError } from "./http.js";

export const ORDER_ID_RE = /^order_[A-Za-z0-9]+$/;
export const PAYMENT_ID_RE = /^pay_[A-Za-z0-9]+$/;

export const razorpayConfigured = () => Boolean(config.razorpayKeyId && config.razorpayKeySecret);

export function requireRazorpay() {
  if (!razorpayConfigured()) {
    throw new HttpError(503, "Online payment isn't switched on yet. Please try again later.");
  }
}

export function hmacHex(secret: string, message: string | Buffer) {
  return crypto.createHmac("sha256", secret).update(message).digest("hex");
}

/** Constant-time comparison, so signatures can't be guessed byte by byte. */
export function safeEqual(a: string, b: string) {
  const x = Buffer.from(a);
  const y = Buffer.from(b);
  return x.length === y.length && crypto.timingSafeEqual(x, y);
}

export class RazorpayError extends Error {
  constructor(
    public status: number,
    public body: unknown,
  ) {
    super(`Razorpay API error ${status}: ${JSON.stringify(body)}`);
  }
}

/** Calls the Razorpay REST API with the account's key pair. */
export async function razorpay<T = Record<string, unknown>>(
  path: string,
  init: { method?: "GET" | "POST"; body?: unknown } = {},
): Promise<T> {
  const res = await fetch(`https://api.razorpay.com/v1${path}`, {
    method: init.method ?? "GET",
    headers: {
      "Content-Type": "application/json",
      Authorization:
        "Basic " + Buffer.from(`${config.razorpayKeyId}:${config.razorpayKeySecret}`).toString("base64"),
    },
    body: init.body === undefined ? undefined : JSON.stringify(init.body),
    signal: AbortSignal.timeout(20_000),
  });
  const data = await res.json().catch(() => null);
  if (!res.ok) throw new RazorpayError(res.status, data);
  return data as T;
}

export type RazorpayPayment = {
  id: string;
  order_id: string | null;
  amount: number; // paise
  currency: string;
  status: "created" | "authorized" | "captured" | "refunded" | "failed";
  error_description?: string | null;
};

/**
 * Makes sure the money is actually collected. Accounts set to manual capture leave
 * payments "authorized", and Razorpay refunds those automatically after a few days.
 * Returns the payment as it stands afterwards (check `status === "captured"`).
 */
export async function ensureCaptured(paymentId: string, amountPaise: number): Promise<RazorpayPayment> {
  const payment = await razorpay<RazorpayPayment>(`/payments/${paymentId}`);
  if (payment.status !== "authorized") return payment;
  if (payment.amount !== amountPaise) {
    console.error(`Not capturing ${paymentId}: amount ${payment.amount} != expected ${amountPaise}`);
    return payment;
  }
  try {
    return await razorpay<RazorpayPayment>(`/payments/${paymentId}/capture`, {
      method: "POST",
      body: { amount: amountPaise, currency: payment.currency },
    });
  } catch (err) {
    // Auto-capture (or the webhook) may have captured it a moment ago: re-read the status.
    console.warn("Capture call failed, re-checking payment:", (err as Error).message);
    return await razorpay<RazorpayPayment>(`/payments/${paymentId}`);
  }
}
