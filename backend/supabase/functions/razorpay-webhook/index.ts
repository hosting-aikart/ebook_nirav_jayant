// Razorpay webhook (backup): marks orders paid even if the customer closes the
// browser before verify-payment runs. Configure in Razorpay Dashboard →
// Webhooks with events: payment.captured, payment.failed.
import { adminClient, env, hmacSha256Hex, markOrderPaid, safeEqual } from "../_shared/utils.ts";

Deno.serve(async (req) => {
  if (req.method !== "POST") return new Response("Method not allowed", { status: 405 });

  const rawBody = await req.text();
  const signature = req.headers.get("x-razorpay-signature") ?? "";
  const expected = await hmacSha256Hex(env("RAZORPAY_WEBHOOK_SECRET"), rawBody);
  if (!safeEqual(expected, signature)) return new Response("Invalid signature", { status: 400 });

  try {
    const event = JSON.parse(rawBody);
    const payment = event?.payload?.payment?.entity;
    if (!payment?.order_id) return new Response("ignored", { status: 200 });

    if (event.event === "payment.captured") {
      await markOrderPaid(payment.order_id, payment.id);
    } else if (event.event === "payment.failed") {
      await adminClient()
        .from("orders")
        .update({ status: "failed", razorpay_payment_id: payment.id })
        .eq("razorpay_order_id", payment.order_id)
        .eq("status", "pending");
    }
    return new Response("ok", { status: 200 });
  } catch (err) {
    console.error(err);
    return new Response("error", { status: 500 });
  }
});
