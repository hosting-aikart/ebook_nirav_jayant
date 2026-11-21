import { useEffect, useState, type FormEvent } from "react";
import {
  CheckoutError,
  INDIAN_STATES,
  loadRazorpay,
  startCheckout,
  useShippingDetails,
  validateDetails,
  type CheckoutLine,
  type OrderReceipt,
  type ShippingDetails,
} from "../lib/checkout";

type Status =
  | { kind: "form" }
  | { kind: "busy"; message: string }
  | { kind: "notice"; message: string } // payment window closed by the customer
  | { kind: "error"; message: string };

/**
 * Delivery details + "Pay with Razorpay". Used by "Buy book" in the reader
 * and by the shopping bag. Calls onPaid once the payment is verified.
 */
export default function Checkout({
  lines,
  onPaid,
  onCancel,
  cancelLabel = "Cancel",
}: {
  lines: CheckoutLine[];
  onPaid: (receipt: OrderReceipt) => void;
  onCancel?: () => void;
  cancelLabel?: string;
}) {
  const [details, setDetails] = useShippingDetails();
  const [status, setStatus] = useState<Status>({ kind: "form" });
  const total = lines.reduce((sum, l) => sum + l.book.price * l.quantity, 0);

  // Fetch checkout.js while the customer fills in the form.
  useEffect(() => {
    loadRazorpay();
  }, []);

  const busy = status.kind === "busy";
  const update = (key: keyof ShippingDetails, value: string) => {
    setDetails((d) => ({ ...d, [key]: value }));
    if (status.kind !== "form") setStatus({ kind: "form" }); // hide an old message once they start fixing it
  };
  const field = (key: keyof ShippingDetails) => ({
    value: details[key],
    disabled: busy,
    onChange: (e: { target: { value: string } }) => update(key, e.target.value),
  });

  const pay = async (event: FormEvent) => {
    event.preventDefault();
    const problem = validateDetails(details);
    if (problem) return setStatus({ kind: "error", message: problem });
    if (!lines.length) return setStatus({ kind: "error", message: "Your bag is empty." });

    try {
      const receipt = await startCheckout({
        lines,
        details,
        onStage: (message) => setStatus({ kind: "busy", message }),
      });
      setStatus({ kind: "form" });
      onPaid(receipt);
    } catch (err) {
      const kind = err instanceof CheckoutError ? err.kind : "error";
      const message = (err as Error).message || "Something went wrong. Please try again.";
      setStatus(kind === "cancelled" ? { kind: "notice", message } : { kind: "error", message });
    }
  };

  return (
    <form className="checkout-form" onSubmit={pay} noValidate>
      <div className="checkout-field">
        <label htmlFor="co-name">Full name</label>
        <input id="co-name" autoComplete="name" required {...field("name")} />
      </div>
      <div className="checkout-row">
        <div className="checkout-field">
          <label htmlFor="co-email">Email</label>
          <input id="co-email" type="email" autoComplete="email" required {...field("email")} />
        </div>
        <div className="checkout-field">
          <label htmlFor="co-phone">Mobile number</label>
          <input
            id="co-phone"
            type="tel"
            inputMode="tel"
            autoComplete="tel"
            placeholder="98765 43210"
            maxLength={16}
            required
            {...field("phone")}
          />
        </div>
      </div>
      <div className="checkout-field">
        <label htmlFor="co-address">Delivery address</label>
        <textarea
          id="co-address"
          rows={2}
          autoComplete="street-address"
          placeholder="House no., building, street, area"
          maxLength={500}
          required
          {...field("address")}
        />
      </div>
      <div className="checkout-row checkout-row-3">
        <div className="checkout-field">
          <label htmlFor="co-city">City</label>
          <input id="co-city" autoComplete="address-level2" required {...field("city")} />
        </div>
        <div className="checkout-field">
          <label htmlFor="co-state">State</label>
          <select id="co-state" autoComplete="address-level1" required {...field("state")}>
            <option value="" disabled>
              Select…
            </option>
            {/* Keep a value typed in earlier even if it isn't in the list. */}
            {details.state && !INDIAN_STATES.includes(details.state) && <option>{details.state}</option>}
            {INDIAN_STATES.map((s) => (
              <option key={s}>{s}</option>
            ))}
          </select>
        </div>
        <div className="checkout-field">
          <label htmlFor="co-pincode">PIN code</label>
          <input
            id="co-pincode"
            inputMode="numeric"
            autoComplete="postal-code"
            required
            {...field("pincode")}
            // Strip spaces etc. before limiting to 6, so pasting "411 001" works.
            onChange={(e) => update("pincode", e.target.value.replace(/\D/g, "").slice(0, 6))}
          />
        </div>
      </div>

      {(status.kind === "error" || status.kind === "notice") && (
        <p className={status.kind === "error" ? "checkout-alert" : "checkout-notice"} role="alert">
          {status.message}
        </p>
      )}

      <button className="primary-button checkout-pay" type="submit" disabled={busy}>
        {busy ? (
          <span className="btn-spinner-wrap">
            <span className="btn-spinner" /> {status.message}
          </span>
        ) : (
          <>
            Pay ₹{total.toLocaleString("en-IN")}
            <svg viewBox="0 0 18 18" aria-hidden="true" className="pay-lock-icon">
              <path
                d="M5 8V6a4 4 0 0 1 8 0v2m-9 0h10a1 1 0 0 1 1 1v6a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9a1 1 0 0 1 1-1Z"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.4"
              />
            </svg>
          </>
        )}
      </button>
      <p className="checkout-trust">Secured by Razorpay · UPI · Cards · Net banking · Wallets</p>
      {onCancel && (
        <button type="button" className="checkout-cancel" onClick={onCancel} disabled={busy}>
          {cancelLabel}
        </button>
      )}
    </form>
  );
}
