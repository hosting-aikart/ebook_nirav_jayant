import { useEffect, useState } from "react";
import Checkout from "./Checkout";
import { useBackToClose } from "../lib/backToClose";
import type { Bag } from "../lib/bag";
import { MAX_COPIES, type OrderReceipt } from "../lib/checkout";

interface BagDrawerProps {
  bag: Bag;
  onPaid: (receipt: OrderReceipt) => void;
  onBrowseBooks: () => void;
}

const inr = (n: number) => `₹${n.toLocaleString("en-IN")}`;

export function BagDrawer({ bag, onPaid, onBrowseBooks }: BagDrawerProps) {
  const { items, isOpen, close, count, total } = bag;
  const [step, setStep] = useState<"bag" | "details">("bag");
  // Back closes the bag (and first returns from delivery details to the bag).
  useBackToClose(isOpen, close);
  useBackToClose(isOpen && step === "details", () => setStep("bag"));

  useEffect(() => {
    if (!isOpen) return;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && close();
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", onKey);
    };
  }, [isOpen, close]);

  // Always reopen on the bag itself; leave the details step if the bag empties.
  useEffect(() => {
    if (!isOpen || items.length === 0) setStep("bag");
  }, [isOpen, items.length]);

  if (!isOpen) return null;
  const checkingOut = step === "details" && items.length > 0;

  return (
    <div
      className="bag-backdrop"
      onClick={(e) => e.target === e.currentTarget && close()}
      role="dialog"
      aria-modal="true"
      aria-labelledby="bag-title"
    >
      <div className="bag-drawer">
        <div className="bag-header">
          <div className="bag-header-title">
            {checkingOut && (
              <button className="bag-back-btn" onClick={() => setStep("bag")} aria-label="Back to bag">
                ←
              </button>
            )}
            <h2 id="bag-title">{checkingOut ? "Delivery details" : "Your Bag"}</h2>
            <span className="bag-count-pill">
              {count} {count === 1 ? "book" : "books"}
            </span>
          </div>
          <button className="bag-close-btn" onClick={close} aria-label="Close bag">
            ✕
          </button>
        </div>

        <div className="bag-content">
          {items.length === 0 ? (
            <div className="bag-empty">
              <div className="bag-empty-icon">📖</div>
              <h3>Your bag is empty</h3>
              <p>
                Take a moment to explore our collection of thoughtful books for mindfulness, meditation,
                and presence.
              </p>
              <button
                className="primary-button"
                onClick={() => {
                  close();
                  onBrowseBooks();
                }}
              >
                Browse Books
              </button>
            </div>
          ) : checkingOut ? (
            <>
              <div className="bag-order-summary">
                {items.map((item) => (
                  <div key={item.book.id}>
                    <span>
                      {item.book.title}
                      {item.quantity > 1 && <small> × {item.quantity}</small>}
                    </span>
                    <span>{inr(item.book.price * item.quantity)}</span>
                  </div>
                ))}
                <div className="bag-order-summary-delivery">
                  <span>Delivery</span>
                  <span className="bag-free-pill">Free</span>
                </div>
                <div className="bag-order-summary-total">
                  <span>Total</span>
                  <strong>{inr(total)}</strong>
                </div>
              </div>
              <Checkout lines={items} onPaid={onPaid} onCancel={() => setStep("bag")} cancelLabel="Back to bag" />
            </>
          ) : (
            <div className="bag-items-list">
              {items.map((item) => (
                <div key={item.book.id} className="bag-item">
                  <div className="bag-item-cover">
                    {item.book.cover ? (
                      <img src={item.book.cover} alt={item.book.title} className="bag-item-img" />
                    ) : (
                      <div className="bag-item-placeholder">
                        <span>{item.book.title[0]}</span>
                      </div>
                    )}
                  </div>
                  <div className="bag-item-details">
                    <div className="bag-item-header">
                      <h4>{item.book.title}</h4>
                      <span className="bag-item-price">{inr(item.book.price * item.quantity)}</span>
                    </div>
                    <p className="bag-item-author">{item.book.author}</p>
                    <span className="bag-item-format">Printed book · {inr(item.book.price)} each</span>

                    <div className="bag-item-actions">
                      <div className="qty-controls">
                        <button
                          type="button"
                          onClick={() => bag.setQuantity(item.book.id, item.quantity - 1)}
                          aria-label={`Decrease quantity of ${item.book.title}`}
                        >
                          −
                        </button>
                        <span aria-live="polite">{item.quantity}</span>
                        <button
                          type="button"
                          onClick={() => bag.setQuantity(item.book.id, item.quantity + 1)}
                          disabled={item.quantity >= MAX_COPIES}
                          aria-label={`Increase quantity of ${item.book.title}`}
                        >
                          +
                        </button>
                      </div>
                      <button type="button" className="bag-item-remove" onClick={() => bag.remove(item.book.id)}>
                        Remove
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {items.length > 0 && !checkingOut && (
          <div className="bag-footer">
            <div className="bag-summary-row">
              <span>Delivery across India</span>
              <span className="bag-free-pill">Free</span>
            </div>
            <div className="bag-summary-row bag-total-row">
              <span>Total</span>
              <strong>{inr(total)}</strong>
            </div>
            <button className="primary-button bag-checkout-btn" onClick={() => setStep("details")}>
              Checkout
              <svg viewBox="0 0 18 18" aria-hidden="true">
                <path d="M4 14 14 4M6 4h8v8" />
              </svg>
            </button>
            <div className="bag-trust-badges">
              <span>🔒 Secure payments by Razorpay</span>
              <span>•</span>
              <span>UPI · Cards · NetBanking</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
