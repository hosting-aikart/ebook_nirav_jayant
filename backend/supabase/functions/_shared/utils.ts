import { createClient } from "npm:@supabase/supabase-js@2";

export const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

export function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

/** Service-role client: bypasses RLS. Only ever used server-side. */
export function adminClient() {
  return createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, {
    auth: { persistSession: false },
  });
}

export function env(name: string) {
  const value = Deno.env.get(name);
  if (!value) throw new Error(`Missing secret: ${name}`);
  return value;
}

export async function hmacSha256Hex(secret: string, message: string) {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(message));
  return Array.from(new Uint8Array(sig), (b) => b.toString(16).padStart(2, "0")).join("");
}

/** Constant-time string comparison. */
export function safeEqual(a: string, b: string) {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

/** Marks an order paid (idempotent) and returns it with its book's PDF path. */
export async function markOrderPaid(razorpayOrderId: string, razorpayPaymentId: string) {
  const db = adminClient();
  const { data: order, error } = await db
    .from("orders")
    .update({ status: "paid", razorpay_payment_id: razorpayPaymentId, paid_at: new Date().toISOString() })
    .eq("razorpay_order_id", razorpayOrderId)
    .neq("status", "paid")
    .select("id")
    .maybeSingle();
  if (error) throw error;

  const { data: full } = await db
    .from("orders")
    .select("id, status, book_id, book_title")
    .eq("razorpay_order_id", razorpayOrderId)
    .single();
  return { justPaid: Boolean(order), order: full };
}
