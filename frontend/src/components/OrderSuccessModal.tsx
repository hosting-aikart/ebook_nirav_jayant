import { useEffect, useState } from "react";
import type { OrderReceipt } from "../lib/checkout";
import { useAccount } from "../lib/account";
import { downloadReceipt } from "../lib/receipt";

interface OrderSuccessModalProps {
  order: OrderReceipt;
  onClose: () => void;
}

const inr = (n: number) => `₹${n.toLocaleString("en-IN")}`;

export function OrderSuccessModal({ order, onClose }: OrderSuccessModalProps) {
  useEffect(() => {
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", onKey);
    };
  }, [onClose]);

  // Time the confirmation appeared = time of payment, shown on the receipt.
  const [paidAt] = useState(() => new Date());
  const account = useAccount();
  const { shipTo } = order;
  const firstName = shipTo.name.split(" ")[0] || "friend";

  return (
    <div className="order-backdrop" role="dialog" aria-modal="true" aria-labelledby="order-success-title">
      <div className="order-modal">
        <button className="close-button" onClick={onClose} aria-label="Close confirmation">
          <span />
          <span />
        </button>

        <div className="order-icon-wrap">
          <div className="order-success-icon">
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path
                d="M5 13l4 4L19 7"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>
        </div>

        <span className="eyebrow">ORDER CONFIRMED</span>
        <h2 id="order-success-title">Thank you, {firstName} 🙏</h2>
        <p className="order-lead">
          We've received your payment of <strong>{inr(order.total)}</strong>. Your books will be packed with
          care and shipped to the address below.
        </p>

        <div className="order-items">
          {order.items.map((item) => (
            <div key={item.title} className="order-item">
              <span>
                {item.title}
                {item.quantity > 1 && <small> × {item.quantity}</small>}
              </span>
              <span>{inr(item.unitPrice * item.quantity)}</span>
            </div>
          ))}
          <div className="order-item order-item-total">
            <span>Total paid</span>
            <strong>{inr(order.total)}</strong>
          </div>
        </div>

        <div className="order-ship-to">
          <span>Shipping to</span>
          <p>
            <strong>{shipTo.name}</strong>
            <br />
            {shipTo.address}
            <br />
            {shipTo.city}, {shipTo.state} – {shipTo.pincode}
            <br />
            {shipTo.phone}
          </p>
        </div>

        <div className="order-meta-box">
          <div>
            <span>Order ID</span>
            <strong>{order.orderId}</strong>
          </div>
          <div>
            <span>Payment ID</span>
            <strong>{order.paymentId ?? "—"}</strong>
          </div>
        </div>

        <p className="order-footnote">
          Please keep your order ID for reference.
          {order.email && (
            <>
              {" "}
              We'll contact you at <strong>{order.email}</strong> if we need anything for your delivery.
            </>
          )}
        </p>

        <div className="order-actions">
          <button type="button" className="receipt-button" onClick={() => downloadReceipt(order, paidAt)}>
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M12 4v11m0 0-4.5-4.5M12 15l4.5-4.5M5 19h14" />
            </svg>
            Download receipt (PDF)
          </button>
          {account && (
            <a className="receipt-button" href="/account">
              View my orders
            </a>
          )}
          <button className="primary-button wide-button" onClick={onClose}>
            Continue browsing
          </button>
        </div>
      </div>
    </div>
  );
}
