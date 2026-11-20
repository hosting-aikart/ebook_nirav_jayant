import { useState, type FormEvent } from "react";
import type { Book } from "../data/books";
import { supabase } from "../lib/supabase";

type RazorpayResponse = {
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
};

declare global {
  interface Window {
    Razorpay?: new (options: Record<string, unknown>) => { open: () => void };
  }
}

function loadRazorpay(): Promise<boolean> {
  if (window.Razorpay) return Promise.resolve(true);
  return new Promise((resolve) => {
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
}

const inputClass =
  "w-full rounded-full border border-[color-mix(in_srgb,var(--ink)_25%,transparent)] bg-white/70 px-5 py-3 text-[15px] outline-none focus:border-[var(--ink)]";

type Status =
  | { kind: "form" }
  | { kind: "busy"; message: string }
  | { kind: "paid" }
  | { kind: "error"; message: string };

export default function Checkout({ book, onCancel }: { book: Book; onCancel: () => void }) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const [pincode, setPincode] = useState("");
  const [status, setStatus] = useState<Status>({ kind: "form" });

  if (!supabase) {
    return (
      <p className="reader-note">
        Checkout is not configured yet. Add your Supabase keys to <code>frontend/.env</code>.
      </p>
    );
  }
  const db = supabase;

  const pay = async (event: FormEvent) => {
    event.preventDefault();
    if (!/^[6-9]\d{9}$/.test(phone.replace(/\D/g, "").slice(-10))) {
      return setStatus({ kind: "error", message: "Please enter a valid 10-digit mobile number." });
    }
    if (!/^\d{6}$/.test(pincode.trim())) {
      return setStatus({ kind: "error", message: "Please enter a valid 6-digit PIN code." });
    }
    setStatus({ kind: "busy", message: "Preparing secure payment…" });

    const [loaded, created] = await Promise.all([
      loadRazorpay(),
      db.functions.invoke("create-order", {
        body: { bookId: book.id, name, email, phone, address, city, state, pincode },
      }),
    ]);
    if (!loaded) return setStatus({ kind: "error", message: "Could not load the payment window." });
    if (created.error || created.data?.error) {
      const message =
        created.data?.error ??
        (await created.error?.context?.json?.().catch(() => null))?.error ??
        "Could not start payment. Please try again.";
      return setStatus({ kind: "error", message });
    }

    const order = created.data as {
      keyId: string;
      razorpayOrderId: string;
      amount: number;
      currency: string;
    };

    const rzp = new window.Razorpay!({
      key: order.keyId,
      order_id: order.razorpayOrderId,
      amount: order.amount,
      currency: order.currency,
      name: "Sw. Nirav Jayant",
      description: book.title,
      prefill: { name, email, contact: phone },
      theme: { color: "#123f48" },
      modal: { ondismiss: () => setStatus({ kind: "form" }) },
      handler: async (response: RazorpayResponse) => {
        setStatus({ kind: "busy", message: "Confirming your payment…" });
        const verified = await db.functions.invoke("verify-payment", { body: response });
        if (verified.error || !verified.data?.ok) {
          return setStatus({
            kind: "error",
            message:
              "We received your payment but couldn't confirm it automatically. Don't worry — your order is safe and we'll email you a confirmation shortly.",
          });
        }
        setStatus({ kind: "paid" });
      },
    });
    rzp.open();
  };

  if (status.kind === "paid") {
    return (
      <div className="grid gap-3">
        <p className="text-lg font-medium">Thank you! Your payment was successful. 🙏</p>
        <p className="reader-note">
          Your copy of <strong>{book.title}</strong> will be shipped to {address}, {city} – {pincode}.
        </p>
        <p className="reader-note">We'll send order and delivery updates to {email}.</p>
      </div>
    );
  }

  const busy = status.kind === "busy";
  return (
    <form className="grid gap-3" onSubmit={pay}>
      <input className={inputClass} placeholder="Your name" value={name} onChange={(e) => setName(e.target.value)} required disabled={busy} />
      <input className={inputClass} type="email" placeholder="Email (for order updates)" value={email} onChange={(e) => setEmail(e.target.value)} required disabled={busy} />
      <input className={inputClass} type="tel" placeholder="Mobile number (for delivery)" value={phone} onChange={(e) => setPhone(e.target.value)} required disabled={busy} />
      <textarea
        className={`${inputClass} rounded-3xl`}
        rows={2}
        placeholder="Delivery address (house no., street, area)"
        value={address}
        onChange={(e) => setAddress(e.target.value)}
        required
        disabled={busy}
      />
      <div className="grid grid-cols-2 gap-3">
        <input className={inputClass} placeholder="City" value={city} onChange={(e) => setCity(e.target.value)} required disabled={busy} />
        <input className={inputClass} placeholder="State" value={state} onChange={(e) => setState(e.target.value)} required disabled={busy} />
      </div>
      <input className={inputClass} inputMode="numeric" maxLength={6} placeholder="PIN code" value={pincode} onChange={(e) => setPincode(e.target.value.replace(/\D/g, ""))} required disabled={busy} />
      {status.kind === "error" && <p className="text-sm text-[#c0392b]">{status.message}</p>}
      <button className="primary-button wide-button" type="submit" disabled={busy}>
        {busy ? status.message : `Pay ₹${book.price}`}
      </button>
      <button type="button" className="reader-note underline" onClick={onCancel} disabled={busy}>
        Cancel
      </button>
    </form>
  );
}
