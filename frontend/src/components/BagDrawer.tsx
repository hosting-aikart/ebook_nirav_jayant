import { useState, useEffect } from "react";
import { CartItem, CustomerDetails, OrderConfirmation } from "../types";
import { createOrder, verifyPayment } from "../services/api";

interface BagDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  cart: CartItem[];
  onUpdateQuantity: (bookId: string, quantity: number) => void;
  onRemoveItem: (bookId: string) => void;
  onPaymentSuccess: (order: OrderConfirmation) => void;
  onBrowseBooks: () => void;
}

export function BagDrawer({
  isOpen,
  onClose,
  cart,
  onUpdateQuantity,
  onRemoveItem,
  onPaymentSuccess,
  onBrowseBooks,
}: BagDrawerProps) {
  const [customer, setCustomer] = useState<CustomerDetails>({
    name: "",
    email: "",
    phone: "",
  });
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [mockModeInfo, setMockModeInfo] = useState<any>(null);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
      setErrorMessage(null);
    } else {
      document.body.style.overflow = "";
      setMockModeInfo(null);
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  const totalAmount = cart.reduce(
    (sum, item) => sum + item.book.price * item.quantity,
    0
  );
  const totalItemCount = cart.reduce((sum, item) => sum + item.quantity, 0);

  const handlePay = async () => {
    setErrorMessage(null);

    if (!customer.name.trim()) {
      setErrorMessage("Please enter your name for delivery.");
      return;
    }
    if (!customer.email.trim() || !customer.email.includes("@")) {
      setErrorMessage("Please enter a valid email address to receive your e-books.");
      return;
    }

    try {
      setIsProcessing(true);

      const orderData = await createOrder(cart, customer);

      // Handle Mock Mode (when user hasn't added real Razorpay test keys yet in backend/.env)
      if (orderData.isMock) {
        setMockModeInfo(orderData);
        setIsProcessing(false);
        return;
      }

      // Live / Real Razorpay Test Flow
      if (typeof (window as any).Razorpay === "undefined") {
        throw new Error(
          "Razorpay SDK failed to load. Please check your internet connection."
        );
      }

      const options = {
        key: orderData.keyId,
        amount: orderData.amount,
        currency: orderData.currency,
        name: "STILL. — Sw. Nirav Jayant",
        description: `Purchase of ${totalItemCount} mindful e-book${
          totalItemCount > 1 ? "s" : ""
        }`,
        image: cart[0]?.book.cover || "/books/zenful-stories.png",
        order_id: orderData.orderId,
        prefill: {
          name: customer.name,
          email: customer.email,
          contact: customer.phone || "",
        },
        theme: {
          color: "#123f48",
        },
        handler: async function (response: any) {
          try {
            const verification = await verifyPayment({
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
            });
            onPaymentSuccess({ ...verification, totalAmount });
            onClose();
          } catch (err: any) {
            setErrorMessage(err.message || "Payment verification failed.");
          } finally {
            setIsProcessing(false);
          }
        },
        modal: {
          ondismiss: function () {
            setIsProcessing(false);
          },
        },
      };

      const razorpayInstance = new (window as any).Razorpay(options);

      razorpayInstance.on("payment.failed", function (response: any) {
        setErrorMessage(
          response.error?.description || "Payment failed. Please try again."
        );
        setIsProcessing(false);
      });

      razorpayInstance.open();
    } catch (err: any) {
      console.error("Checkout error:", err);
      setErrorMessage(
        err.message || "An error occurred while connecting to Razorpay."
      );
      setIsProcessing(false);
    }
  };

  const handleSimulateMockSuccess = async () => {
    if (!mockModeInfo) return;
    try {
      setIsProcessing(true);
      const verification = await verifyPayment({
        razorpay_order_id: mockModeInfo.orderId,
        razorpay_payment_id: `pay_mock_${Date.now()}`,
        razorpay_signature: "mock_signature_success",
      });
      onPaymentSuccess({ ...verification, totalAmount });
      onClose();
    } catch (err: any) {
      setErrorMessage(err.message || "Mock verification failed.");
    } finally {
      setIsProcessing(false);
      setMockModeInfo(null);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="bag-backdrop"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="bag-title"
    >
      <div className="bag-drawer">
        {/* Header */}
        <div className="bag-header">
          <div className="bag-header-title">
            <h2 id="bag-title">Your Bag</h2>
            <span className="bag-count-pill">{totalItemCount} items</span>
          </div>
          <button
            className="bag-close-btn"
            onClick={onClose}
            aria-label="Close bag"
          >
            ✕
          </button>
        </div>

        {/* Content */}
        <div className="bag-content">
          {cart.length === 0 ? (
            <div className="bag-empty">
              <div className="bag-empty-icon">📖</div>
              <h3>Your bag is empty</h3>
              <p>
                Take a moment to explore our collection of thoughtful books for
                mindfulness, meditation, and presence.
              </p>
              <button
                className="primary-button"
                onClick={() => {
                  onClose();
                  onBrowseBooks();
                }}
              >
                Browse Books
              </button>
            </div>
          ) : (
            <>
              {/* Item List */}
              <div className="bag-items-list">
                {cart.map((item) => (
                  <div key={item.book.id} className="bag-item">
                    <div className="bag-item-cover">
                      {item.book.cover ? (
                        <img
                          src={item.book.cover}
                          alt={item.book.title}
                          className="bag-item-img"
                        />
                      ) : (
                        <div className="bag-item-placeholder">
                          <span>{item.book.title[0]}</span>
                        </div>
                      )}
                    </div>
                    <div className="bag-item-details">
                      <div className="bag-item-header">
                        <h4>{item.book.title}</h4>
                        <span className="bag-item-price">
                          ₹{item.book.price * item.quantity}
                        </span>
                      </div>
                      <p className="bag-item-author">{item.book.author}</p>
                      <span className="bag-item-format">Digital · PDF + EPUB</span>

                      <div className="bag-item-actions">
                        <div className="qty-controls">
                          <button
                            type="button"
                            onClick={() =>
                              onUpdateQuantity(item.book.id, item.quantity - 1)
                            }
                            aria-label="Decrease quantity"
                          >
                            −
                          </button>
                          <span>{item.quantity}</span>
                          <button
                            type="button"
                            onClick={() =>
                              onUpdateQuantity(item.book.id, item.quantity + 1)
                            }
                            aria-label="Increase quantity"
                          >
                            +
                          </button>
                        </div>
                        <button
                          type="button"
                          className="bag-item-remove"
                          onClick={() => onRemoveItem(item.book.id)}
                        >
                          Remove
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Delivery / Customer Details */}
              <div className="bag-section">
                <span className="bag-section-title">Delivery Information</span>
                <p className="bag-section-help">
                  Instant download links and receipts are sent to your email.
                </p>
                <div className="bag-form">
                  <div className="bag-input-group">
                    <label htmlFor="customer-name">Full Name *</label>
                    <input
                      id="customer-name"
                      type="text"
                      placeholder="e.g. Maya Sharma"
                      value={customer.name}
                      onChange={(e) =>
                        setCustomer({ ...customer, name: e.target.value })
                      }
                      required
                    />
                  </div>
                  <div className="bag-input-group">
                    <label htmlFor="customer-email">Email Address *</label>
                    <input
                      id="customer-email"
                      type="email"
                      placeholder="maya@example.com"
                      value={customer.email}
                      onChange={(e) =>
                        setCustomer({ ...customer, email: e.target.value })
                      }
                      required
                    />
                  </div>
                  <div className="bag-input-group">
                    <label htmlFor="customer-phone">Phone Number (Optional)</label>
                    <input
                      id="customer-phone"
                      type="tel"
                      placeholder="+91 98765 43210"
                      value={customer.phone}
                      onChange={(e) =>
                        setCustomer({ ...customer, phone: e.target.value })
                      }
                    />
                  </div>
                </div>
              </div>

              {/* Mock Mode Alert Banner if keys not set */}
              {mockModeInfo && (
                <div className="mock-banner">
                  <div className="mock-banner-title">
                    <span>💡 Razorpay Developer Demo Mode</span>
                  </div>
                  <p>
                    Backend is running without live credentials (using placeholder keys).
                    You can test the entire flow right now, or configure your keys in{" "}
                    <code>backend/.env</code>.
                  </p>
                  <button
                    className="mock-pay-btn"
                    onClick={handleSimulateMockSuccess}
                    disabled={isProcessing}
                  >
                    {isProcessing ? "Processing..." : "Complete Test Payment (Simulate Success)"}
                  </button>
                </div>
              )}

              {/* Error Message */}
              {errorMessage && (
                <div className="bag-error-alert" role="alert">
                  {errorMessage}
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        {cart.length > 0 && (
          <div className="bag-footer">
            <div className="bag-summary-row">
              <span>Digital Delivery</span>
              <span className="bag-free-pill">Instant & Free</span>
            </div>
            <div className="bag-summary-row bag-total-row">
              <span>Total</span>
              <strong>₹{totalAmount}</strong>
            </div>

            <button
              className="primary-button bag-checkout-btn"
              onClick={handlePay}
              disabled={isProcessing}
            >
              {isProcessing ? (
                <span className="btn-spinner-wrap">
                  <span className="btn-spinner" /> Connecting to Razorpay...
                </span>
              ) : (
                <>
                  Pay ₹{totalAmount} with Razorpay
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

            <div className="bag-trust-badges">
              <span>🔒 256-bit Secure Encryption</span>
              <span>•</span>
              <span>UPI · Cards · NetBanking</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
