// POST { bookId, name, email, phone, address, city, state, pincode }
// -> creates a Razorpay order + a pending order row, returns data for Razorpay Checkout.
import { adminClient, corsHeaders, env, json } from "../_shared/utils.ts";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_RE = /^[6-9]\d{9}$/;
const PIN_RE = /^\d{6}$/;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  try {
    const { bookId, name, email, phone, address, city, state, pincode } = await req.json();
    const clean = (v: unknown, max = 200) => String(v ?? "").trim().slice(0, max);
    const cleanName = clean(name);
    const cleanEmail = clean(email).toLowerCase();
    const cleanPhone = clean(phone, 20).replace(/[^\d+]/g, "");
    const ship = {
      address: clean(address, 500),
      city: clean(city),
      state: clean(state),
      pincode: clean(pincode, 6),
    };

    if (!bookId || !cleanName || !EMAIL_RE.test(cleanEmail)) {
      return json({ error: "Please enter your name and a valid email." }, 400);
    }
    if (!PHONE_RE.test(cleanPhone.slice(-10))) {
      return json({ error: "Please enter a valid 10-digit mobile number." }, 400);
    }
    if (!ship.address || !ship.city || !ship.state || !PIN_RE.test(ship.pincode)) {
      return json({ error: "Please enter your full delivery address and a valid 6-digit PIN code." }, 400);
    }

    const db = adminClient();

    // Price always comes from the database, never from the browser.
    const { data: book, error: bookErr } = await db
      .from("books")
      .select("id, title, price, is_active")
      .eq("id", bookId)
      .single();
    if (bookErr || !book || !book.is_active) return json({ error: "Book not found." }, 404);

    const { data: customer, error: custErr } = await db
      .from("customers")
      .upsert({ name: cleanName, email: cleanEmail, phone: cleanPhone, ...ship }, { onConflict: "email" })
      .select("id")
      .single();
    if (custErr) throw custErr;

    const keyId = env("RAZORPAY_KEY_ID");
    const rzpRes = await fetch("https://api.razorpay.com/v1/orders", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: "Basic " + btoa(`${keyId}:${env("RAZORPAY_KEY_SECRET")}`),
      },
      body: JSON.stringify({
        amount: book.price * 100, // paise
        currency: "INR",
        receipt: `${book.id}-${Date.now()}`.slice(0, 40),
        notes: { book_id: book.id, email: cleanEmail },
      }),
    });
    const rzpOrder = await rzpRes.json();
    if (!rzpRes.ok) {
      console.error("Razorpay error", rzpOrder);
      return json({ error: "Could not start payment. Please try again." }, 502);
    }

    const { error: orderErr } = await db.from("orders").insert({
      customer_id: customer.id,
      book_id: book.id,
      book_title: book.title,
      amount: book.price,
      razorpay_order_id: rzpOrder.id,
      ship_name: cleanName,
      ship_phone: cleanPhone,
      ship_address: ship.address,
      ship_city: ship.city,
      ship_state: ship.state,
      ship_pincode: ship.pincode,
    });
    if (orderErr) throw orderErr;

    return json({
      keyId,
      razorpayOrderId: rzpOrder.id,
      amount: rzpOrder.amount,
      currency: rzpOrder.currency,
      bookTitle: book.title,
    });
  } catch (err) {
    console.error(err);
    return json({ error: "Something went wrong. Please try again." }, 500);
  }
});
