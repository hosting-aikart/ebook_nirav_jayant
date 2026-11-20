// POST { razorpay_order_id, razorpay_payment_id, razorpay_signature }
// -> verifies the signature and marks the order paid (the book is then shipped by the admin).
import { corsHeaders, env, hmacSha256Hex, json, markOrderPaid, safeEqual } from "../_shared/utils.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = await req.json();
    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return json({ error: "Missing payment details." }, 400);
    }

    const expected = await hmacSha256Hex(
      env("RAZORPAY_KEY_SECRET"),
      `${razorpay_order_id}|${razorpay_payment_id}`,
    );
    if (!safeEqual(expected, String(razorpay_signature))) {
      return json({ error: "Payment verification failed." }, 400);
    }

    await markOrderPaid(razorpay_order_id, razorpay_payment_id);
    return json({ ok: true });
  } catch (err) {
    console.error(err);
    return json({ error: "Something went wrong verifying your payment." }, 500);
  }
});
