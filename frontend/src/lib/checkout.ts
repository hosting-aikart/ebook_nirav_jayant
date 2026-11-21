import { useEffect, useState } from "react";
import type { Book } from "../data/books";
import { currentAccount, sessionExpired } from "./account";
import { ApiError, api } from "./api";

/** One book in the order (from the bag, or "Buy book" for a single copy). */
export type CheckoutLine = { book: Book; quantity: number };

export type ShippingDetails = {
  name: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  state: string;
  pincode: string;
};

/** Returned by the verify-payment function once the payment is confirmed. */
export type OrderReceipt = {
  orderId: string;
  paymentId: string | null;
  total: number; // rupees
  email: string | null;
  items: { title: string; quantity: number; unitPrice: number }[];
  shipTo: { name: string; phone: string; address: string; city: string; state: string; pincode: string };
};

type CreatedOrder = {
  keyId: string;
  razorpayOrderId: string;
  amount: number; // paise
  currency: string;
  total: number; // rupees
  description: string;
};

type RazorpaySuccess = {
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
};

type RazorpayFailure = { error?: { description?: string; reason?: string } };

type RazorpayInstance = {
  open: () => void;
  on: (event: "payment.failed", handler: (response: RazorpayFailure) => void) => void;
};

declare global {
  interface Window {
    Razorpay?: new (options: Record<string, unknown>) => RazorpayInstance;
  }
}

export const MAX_COPIES = 10; // per book; the server enforces the same limit

export const INDIAN_STATES = [
  "Andaman and Nicobar Islands", "Andhra Pradesh", "Arunachal Pradesh", "Assam", "Bihar",
  "Chandigarh", "Chhattisgarh", "Dadra and Nagar Haveli and Daman and Diu", "Delhi", "Goa",
  "Gujarat", "Haryana", "Himachal Pradesh", "Jammu and Kashmir", "Jharkhand", "Karnataka",
  "Kerala", "Ladakh", "Lakshadweep", "Madhya Pradesh", "Maharashtra", "Manipur", "Meghalaya",
  "Mizoram", "Nagaland", "Odisha", "Puducherry", "Punjab", "Rajasthan", "Sikkim", "Tamil Nadu",
  "Telangana", "Tripura", "Uttar Pradesh", "Uttarakhand", "West Bengal",
];

// ---------- Razorpay Checkout script ----------

let scriptPromise: Promise<boolean> | null = null;

/** Loads checkout.js once. Called early (when the form opens) so "Pay" feels instant. */
export function loadRazorpay(): Promise<boolean> {
  if (window.Razorpay) return Promise.resolve(true);
  scriptPromise ??= new Promise((resolve) => {
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.async = true;
    script.onload = () => resolve(true);
    script.onerror = () => {
      scriptPromise = null; // allow a retry, e.g. after the connection comes back
      script.remove();
      resolve(false);
    };
    document.body.appendChild(script);
  });
  return scriptPromise;
}

// ---------- Form helpers ----------

const emptyDetails: ShippingDetails = { name: "", email: "", phone: "", address: "", city: "", state: "", pincode: "" };
const DETAILS_KEY = "still_checkout_details";

/**
 * Delivery details, kept for this browser tab only (sessionStorage), so going
 * back to the bag or reopening a book doesn't wipe what the customer typed.
 */
export function useShippingDetails() {
  const [details, setDetails] = useState<ShippingDetails>(() => {
    try {
      return { ...emptyDetails, ...JSON.parse(sessionStorage.getItem(DETAILS_KEY) ?? "{}") };
    } catch {
      return emptyDetails;
    }
  });
  useEffect(() => {
    try {
      sessionStorage.setItem(DETAILS_KEY, JSON.stringify(details));
    } catch {
      /* storage full or disabled: the form still works */
    }
  }, [details]);
  return [details, setDetails] as const;
}

/** Same rules as the create-order function, so most mistakes are caught before the network. */
export function validateDetails(d: ShippingDetails): string | null {
  if (!d.name.trim()) return "Please enter your name.";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(d.email.trim())) return "Please enter a valid email address.";
  if (!/^[6-9]\d{9}$/.test(d.phone.replace(/\D/g, "").slice(-10))) {
    return "Please enter a valid 10-digit mobile number.";
  }
  if (!d.address.trim() || !d.city.trim() || !d.state.trim()) return "Please enter your full delivery address.";
  if (!/^[1-9]\d{5}$/.test(d.pincode.trim())) return "Please enter a valid 6-digit PIN code.";
  return null;
}

// ---------- Payment flow ----------

export type CheckoutErrorKind = "cancelled" | "failed" | "unconfirmed" | "error";

export class CheckoutError extends Error {
  constructor(public kind: CheckoutErrorKind, message: string) {
    super(message);
  }
}

const NOT_CONFIRMED =
  "We received your payment but couldn't confirm it yet. Please don't pay again — your order is saved and will be confirmed shortly.";

/** "98765 43210", "098765…" or "+91 98765…" → "+919876543210" (Indian mobiles; anything else unchanged). */
function toInternational(phone: string) {
  const digits = phone.replace(/\D/g, "");
  const local = digits.length === 12 && digits.startsWith("91") ? digits.slice(2) : digits.replace(/^0/, "");
  return /^[6-9]\d{9}$/.test(local) ? `+91${local}` : phone;
}

// Reopening Razorpay for the same bag and address reuses its order instead of
// creating a new pending order on every attempt.
let lastOrder: { key: string; order: CreatedOrder } | null = null;

/**
 * Creates the order, opens Razorpay Checkout and verifies the payment.
 * Resolves with the receipt; rejects with a CheckoutError when the customer closes
 * the window, the payment fails, or it can't be confirmed.
 */
export async function startCheckout({
  lines,
  details,
  onStage,
}: {
  lines: CheckoutLine[];
  details: ShippingDetails;
  onStage: (message: string) => void;
}): Promise<OrderReceipt> {
  const request = {
    items: lines.map((l) => ({ bookId: l.book.id, quantity: l.quantity })),
    name: details.name.trim(),
    email: details.email.trim(),
    phone: details.phone.trim(),
    address: details.address.trim(),
    city: details.city.trim(),
    state: details.state.trim(),
    pincode: details.pincode.trim(),
  };
  // Orders are linked to the signed-in account, so a different account must create a fresh order.
  const key = JSON.stringify([request, currentAccount()?.email ?? null]);

  onStage("Preparing secure payment…");
  const [loaded, order] = await Promise.all([
    loadRazorpay(),
    lastOrder?.key === key ? lastOrder.order : api<CreatedOrder>("/api/checkout/order", { body: request }),
  ]).catch((err: Error) => {
    // Signed out (or the session expired): the checkout form switches to sign-in.
    if (err instanceof ApiError && err.status === 401) sessionExpired();
    throw new CheckoutError("error", err.message);
  });
  lastOrder = { key, order };
  if (!loaded || !window.Razorpay) {
    throw new CheckoutError("error", "Could not load the payment window. Please check your connection and try again.");
  }

  onStage("Complete the payment in the Razorpay window…");
  return new Promise<OrderReceipt>((resolve, reject) => {
    let lastFailure: string | null = null;

    const rzp = new window.Razorpay!({
      key: order.keyId,
      order_id: order.razorpayOrderId,
      amount: order.amount,
      currency: order.currency,
      name: "Sw. Nirav Jayant",
      description: order.description,
      // Razorpay expects +<country code><number>; without it, it asks for the mobile again.
      prefill: { name: request.name, email: request.email, contact: toInternational(request.phone) },
      notes: { ship_to: `${request.city}, ${request.state} – ${request.pincode}` },
      theme: { color: "#123f48" },
      modal: {
        // Not called after a successful payment (handler runs instead).
        ondismiss: () =>
          reject(
            lastFailure
              ? new CheckoutError("failed", `Payment failed: ${lastFailure} Please try again or choose another payment method.`)
              : new CheckoutError("cancelled", "Payment cancelled. You can try again whenever you're ready."),
          ),
      },
      handler: async (response: RazorpaySuccess) => {
        onStage("Confirming your payment…");
        try {
          const result = await api<{ ok: boolean; order: OrderReceipt }>("/api/checkout/verify", {
            body: response,
          });
          lastOrder = null;
          resolve(result.order);
        } catch (err) {
          lastOrder = null; // this Razorpay order is paid; never reuse it
          // Use the server's reason when it gave one; otherwise (e.g. offline) reassure the customer.
          const message = err instanceof ApiError && err.body?.error ? err.message : NOT_CONFIRMED;
          reject(new CheckoutError("unconfirmed", `${message} Payment ID: ${response.razorpay_payment_id}`));
        }
      },
    });

    // Razorpay keeps its window open so the customer can retry; remember why it failed.
    rzp.on("payment.failed", (response) => {
      const description = response.error?.description?.trim();
      lastFailure = description ? (description.endsWith(".") ? description : `${description}.`) : "The payment did not go through.";
    });

    rzp.open();
  });
}
