import Razorpay from "razorpay";
import crypto from "node:crypto";
import dotenv from "dotenv";

dotenv.config();

const keyId = process.env.RAZORPAY_KEY_ID || "";
const keySecret = process.env.RAZORPAY_KEY_SECRET || "";

export const isConfigured = Boolean(
  keyId &&
  keySecret &&
  keyId !== "rzp_test_YOUR_KEY_ID" &&
  keyId !== "rzp_test_placeholder"
);

export const razorpayInstance = isConfigured
  ? new Razorpay({
      key_id: keyId,
      key_secret: keySecret,
    })
  : null;

export function getRazorpayKeyId(): string {
  return isConfigured ? keyId : "rzp_test_placeholder";
}

export function verifyPaymentSignature(
  orderId: string,
  paymentId: string,
  signature: string
): boolean {
  if (!isConfigured) {
    // In mock/development fallback mode without real API keys
    return signature === "mock_signature_success";
  }

  const generatedSignature = crypto
    .createHmac("sha256", keySecret)
    .update(`${orderId}|${paymentId}`)
    .digest("hex");

  return generatedSignature === signature;
}
