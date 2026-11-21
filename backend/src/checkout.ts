import { randomUUID } from "node:crypto";
import { config } from "./config.js";
import { db } from "./db.js";
import { HttpError } from "./http.js";
import {
  ORDER_ID_RE,
  PAYMENT_ID_RE,
  ensureCaptured,
  hmacHex,
  razorpay,
  requireRazorpay,
  safeEqual,
  type RazorpayPayment,
} from "./razorpay.js";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_RE = /^[6-9]\d{9}$/;
const PIN_RE = /^[1-9]\d{5}$/;
const MAX_TITLES = 20;
const MAX_COPIES = 10; // per title; matches the order_items check constraint

const NOT_CONFIRMED =
  "We received your payment but couldn't confirm it yet. Please don't pay again — your order is saved and will be confirmed shortly.";

type Line = { bookId: string; title: string; unitPrice: number; quantity: number };

/** What the customer sees on the "Order confirmed" screen. */
export type OrderReceipt = {
  orderId: string;
  paymentId: string | null;
  total: number; // rupees
  email: string | null;
  items: { title: string; quantity: number; unitPrice: number }[];
  shipTo: { name: string; phone: string; address: string; city: string; state: string; pincode: string };
};

// Customer, order and line items in one statement: all saved or none, in a single round trip.
const SAVE_ORDER_SQL = `
with customer as (
  insert into customers (name, email, phone, address, city, state, pincode)
  values ($1, $2, $3, $4, $5, $6, $7)
  on conflict (email) do update set
    name = excluded.name, phone = excluded.phone, address = excluded.address,
    city = excluded.city, state = excluded.state, pincode = excluded.pincode
  returning id
), new_order as (
  insert into orders (customer_id, book_id, book_title, amount, razorpay_order_id,
                      ship_name, ship_phone, ship_address, ship_city, ship_state, ship_pincode)
  select id, $8, $9, $10, $11, $1, $3, $4, $5, $6, $7 from customer
  returning id
)
insert into order_items (order_id, book_id, title, unit_price, quantity, position)
select new_order.id, i.book_id, i.title, i.unit_price, i.quantity, i.position
from new_order, jsonb_to_recordset($12::jsonb)
  as i(book_id text, title text, unit_price integer, quantity integer, position integer)`;

/**
 * POST { items: [{ bookId, quantity }], name, email, phone, address, city, state, pincode }
 * (or the older { bookId } for one copy). Prices the bag from the database, creates the
 * Razorpay order and saves a pending order, then returns what Razorpay Checkout needs.
 * The body comes straight from the browser, so every field is validated here.
 */
export async function createOrder(body: Record<string, unknown>) {
  requireRazorpay();
  const clean = (v: unknown, max = 200) => String(v ?? "").trim().slice(0, max);
  const name = clean(body.name);
  const email = clean(body.email).toLowerCase();
  const phone = clean(body.phone, 20).replace(/[^\d+]/g, "");
  const ship = {
    address: clean(body.address, 500),
    city: clean(body.city),
    state: clean(body.state),
    pincode: clean(body.pincode, 6),
  };

  if (!name || !EMAIL_RE.test(email)) throw new HttpError(400, "Please enter your name and a valid email.");
  if (!PHONE_RE.test(phone.slice(-10))) throw new HttpError(400, "Please enter a valid 10-digit mobile number.");
  if (!ship.address || !ship.city || !ship.state || !PIN_RE.test(ship.pincode)) {
    throw new HttpError(400, "Please enter your full delivery address and a valid 6-digit PIN code.");
  }

  // ---- Bag contents: merge duplicates, keep the customer's order ----
  const rawItems: unknown[] = Array.isArray(body.items)
    ? body.items
    : body.bookId
      ? [{ bookId: body.bookId, quantity: 1 }]
      : [];
  const quantities = new Map<string, number>();
  for (const raw of rawItems) {
    const item = (raw ?? {}) as { bookId?: unknown; quantity?: unknown };
    const bookId = clean(item.bookId, 100);
    const quantity = Number(item.quantity ?? 1);
    if (!bookId || !Number.isInteger(quantity) || quantity < 1) {
      throw new HttpError(400, "Your bag has an invalid item. Please refresh the page and try again.");
    }
    quantities.set(bookId, (quantities.get(bookId) ?? 0) + quantity);
  }
  if (quantities.size === 0) throw new HttpError(400, "Your bag is empty.");
  if (quantities.size > MAX_TITLES) {
    throw new HttpError(400, `You can order up to ${MAX_TITLES} different books at a time.`);
  }
  if ([...quantities.values()].some((q) => q > MAX_COPIES)) {
    throw new HttpError(400, `You can order up to ${MAX_COPIES} copies of each book.`);
  }

  // Prices always come from the database, never from the browser.
  const { rows: books } = await db().query<{ id: string; title: string; price: number }>(
    "select id, title, price from books where is_active and id = any($1::text[])",
    [[...quantities.keys()]],
  );
  const byId = new Map(books.map((b) => [b.id, b]));
  if (byId.size !== quantities.size) {
    throw new HttpError(
      409,
      "Some books in your bag are no longer available. Please refresh the page and check your bag.",
    );
  }

  const lines: Line[] = [...quantities].map(([bookId, quantity]) => {
    const book = byId.get(bookId)!;
    return { bookId, title: book.title, unitPrice: book.price, quantity };
  });
  const total = lines.reduce((sum, l) => sum + l.unitPrice * l.quantity, 0); // rupees
  if (total < 1) throw new HttpError(400, "Order total must be at least ₹1.");
  const summary = lines.map((l) => (l.quantity > 1 ? `${l.title} × ${l.quantity}` : l.title)).join(", ");

  let rzpOrder: { id: string; amount: number; currency: string };
  try {
    rzpOrder = await razorpay("/orders", {
      method: "POST",
      body: {
        amount: total * 100, // paise
        currency: "INR",
        receipt: `still_${Date.now().toString(36)}_${randomUUID().slice(0, 8)}`,
        // Shown in the Razorpay dashboard. Max 15 notes, 256 chars each.
        notes: {
          customer: name.slice(0, 250),
          email,
          phone,
          books: summary.slice(0, 250),
          ship_to: `${ship.city}, ${ship.state} – ${ship.pincode}`.slice(0, 250),
        },
      },
    });
  } catch (err) {
    console.error("Razorpay order creation failed:", (err as Error).message);
    throw new HttpError(502, "Could not start payment. Please try again.");
  }

  await db().query(SAVE_ORDER_SQL, [
    name,
    email,
    phone,
    ship.address,
    ship.city,
    ship.state,
    ship.pincode,
    lines.length === 1 ? lines[0].bookId : null, // multi-book orders have no single book
    summary,
    total,
    rzpOrder.id,
    JSON.stringify(
      lines.map((l, position) => ({
        book_id: l.bookId,
        title: l.title,
        unit_price: l.unitPrice,
        quantity: l.quantity,
        position,
      })),
    ),
  ]);

  return {
    keyId: config.razorpayKeyId,
    razorpayOrderId: rzpOrder.id,
    amount: rzpOrder.amount, // paise
    currency: rzpOrder.currency,
    total, // rupees
    description: (lines.length === 1 && lines[0].quantity === 1 ? lines[0].title : summary).slice(0, 250),
    items: lines.map(({ title, unitPrice, quantity }) => ({ title, unitPrice, quantity })),
  };
}

/** Marks an order paid. Safe to call twice (browser callback and webhook race each other). */
async function markOrderPaid(razorpayOrderId: string, razorpayPaymentId: string) {
  await db().query(
    `update orders set status = 'paid', razorpay_payment_id = $2, paid_at = now(), payment_error = null
     where razorpay_order_id = $1 and status <> 'paid'`,
    [razorpayOrderId, razorpayPaymentId],
  );
}

async function loadReceipt(razorpayOrderId: string): Promise<OrderReceipt> {
  const { rows } = await db().query(
    `select o.razorpay_order_id, o.razorpay_payment_id, o.amount, c.email,
            o.ship_name, o.ship_phone, o.ship_address, o.ship_city, o.ship_state, o.ship_pincode,
            coalesce((select json_agg(json_build_object('title', i.title, 'quantity', i.quantity,
                                                        'unitPrice', i.unit_price) order by i.position)
                      from order_items i where i.order_id = o.id), '[]'::json) as items
     from orders o left join customers c on c.id = o.customer_id
     where o.razorpay_order_id = $1`,
    [razorpayOrderId],
  );
  const row = rows[0];
  return {
    orderId: row.razorpay_order_id,
    paymentId: row.razorpay_payment_id,
    total: row.amount,
    email: row.email ?? null,
    items: row.items,
    shipTo: {
      name: row.ship_name ?? "",
      phone: row.ship_phone ?? "",
      address: row.ship_address ?? "",
      city: row.ship_city ?? "",
      state: row.ship_state ?? "",
      pincode: row.ship_pincode ?? "",
    },
  };
}

/**
 * POST { razorpay_order_id, razorpay_payment_id, razorpay_signature } from Razorpay Checkout.
 * Verifies the signature, makes sure the payment is captured for the right amount, marks the
 * order paid and returns the receipt.
 */
export async function verifyPayment(body: Record<string, unknown>): Promise<{ ok: true; order: OrderReceipt }> {
  requireRazorpay();
  const orderId = String(body.razorpay_order_id ?? "");
  const paymentId = String(body.razorpay_payment_id ?? "");
  const signature = String(body.razorpay_signature ?? "");
  if (!ORDER_ID_RE.test(orderId) || !PAYMENT_ID_RE.test(paymentId) || !signature) {
    throw new HttpError(400, "Missing payment details.");
  }
  if (!safeEqual(hmacHex(config.razorpayKeySecret, `${orderId}|${paymentId}`), signature)) {
    throw new HttpError(400, "Payment verification failed.");
  }

  try {
    const { rows } = await db().query<{ amount: number; status: string }>(
      "select amount, status from orders where razorpay_order_id = $1",
      [orderId],
    );
    const order = rows[0];
    if (!order) throw new HttpError(404, "Order not found.");

    if (order.status !== "paid") {
      const payment = await ensureCaptured(paymentId, order.amount * 100);
      if (payment.order_id !== orderId || payment.amount !== order.amount * 100) {
        console.error("Payment does not match order", { orderId, paymentId, payment, amount: order.amount });
        throw new HttpError(400, "Payment verification failed.");
      }
      if (payment.status !== "captured") {
        // e.g. capture still in progress; the webhook marks it paid once Razorpay captures it.
        console.warn(`Payment ${paymentId} is ${payment.status}, not captured yet`);
        throw new HttpError(409, NOT_CONFIRMED, { pending: true, paymentId });
      }
      await markOrderPaid(orderId, paymentId);
    }
    return { ok: true, order: await loadReceipt(orderId) };
  } catch (err) {
    if (err instanceof HttpError) throw err;
    console.error("verify-payment failed:", err);
    throw new HttpError(500, NOT_CONFIRMED, { pending: true });
  }
}

/**
 * Razorpay webhook (backup): keeps orders right even if the customer closes the browser
 * before verify-payment runs. Events: payment.authorized, payment.captured, payment.failed, order.paid.
 * Returns the HTTP status to send; anything but 2xx makes Razorpay retry later.
 */
export async function handleWebhook(rawBody: Buffer, signature: string): Promise<number> {
  if (!config.razorpayWebhookSecret) {
    console.error("Razorpay webhook received, but RAZORPAY_WEBHOOK_SECRET is not set in backend/.env");
    return 503;
  }
  if (!safeEqual(hmacHex(config.razorpayWebhookSecret, rawBody), signature)) return 400;

  const event = JSON.parse(rawBody.toString("utf8"));
  const payment: RazorpayPayment | undefined = event?.payload?.payment?.entity;
  if (!payment?.order_id) return 200; // not a payment event we track

  const { rows } = await db().query<{ id: string; amount: number; status: string }>(
    "select id, amount, status from orders where razorpay_order_id = $1",
    [payment.order_id],
  );
  const order = rows[0];
  // Not one of this store's orders (e.g. a payment link made in the dashboard).
  if (!order) return 200;

  switch (event.event) {
    case "payment.authorized": {
      // Manual-capture accounts: capture now so the payment isn't auto-refunded.
      if (order.status !== "paid") {
        const latest = await ensureCaptured(payment.id, order.amount * 100);
        if (latest.status === "captured") await markOrderPaid(payment.order_id, payment.id);
      }
      break;
    }
    case "payment.captured":
    case "order.paid": {
      if (payment.amount !== order.amount * 100) {
        console.error("Captured amount does not match order", { payment, amount: order.amount });
        break;
      }
      await markOrderPaid(payment.order_id, payment.id);
      break;
    }
    case "payment.failed": {
      // A paid order is never downgraded. The customer may still retry and pay,
      // which moves the order from failed to paid.
      await db().query(
        `update orders set status = 'failed', razorpay_payment_id = $2, payment_error = $3
         where id = $1 and status in ('pending', 'failed')`,
        [order.id, payment.id, payment.error_description?.slice(0, 500) ?? "Payment failed"],
      );
      break;
    }
  }
  return 200;
}
