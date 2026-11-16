import { OrderConfirmation } from "../types";

interface OrderSuccessModalProps {
  order: OrderConfirmation;
  onClose: () => void;
}

export function OrderSuccessModal({ order, onClose }: OrderSuccessModalProps) {
  return (
    <div
      className="order-backdrop"
      role="dialog"
      aria-modal="true"
      aria-labelledby="order-success-title"
    >
      <div className="order-modal">
        <button
          className="close-button"
          onClick={onClose}
          aria-label="Close confirmation dialog"
        >
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
        <h2 id="order-success-title">Thank you, {order.customer.name}</h2>
        <p className="order-lead">
          Your payment was received successfully. We have prepared your mindful reading
          materials below and sent a confirmation to <strong>{order.customer.email}</strong>.
        </p>

        {/* Receipt pill */}
        <div className="order-meta-box">
          <div>
            <span>Order ID</span>
            <strong>{order.orderId}</strong>
          </div>
          <div>
            <span>Payment ID</span>
            <strong>{order.paymentId}</strong>
          </div>
        </div>

        {/* Download links */}
        <div className="order-downloads-section">
          <h3>Your Digital E-Books</h3>
          <p className="order-download-hint">
            Available in universal PDF and e-reader EPUB formats.
          </p>

          <div className="order-download-list">
            {order.downloads.map((item) => (
              <div key={item.id} className="order-download-item">
                <div className="order-download-info">
                  <span className="order-book-badge">E-Book</span>
                  <h4>{item.title}</h4>
                </div>
                <div className="order-download-actions">
                  <a
                    href={item.pdfUrl}
                    download
                    className="order-btn-download"
                    title={`Download PDF format of ${item.title}`}
                    onClick={(e) => {
                      // Trigger friendly notification or sample download
                      e.preventDefault();
                      alert(`Downloading PDF for "${item.title}". Enjoy your reading!`);
                    }}
                  >
                    <span>Download PDF</span>
                  </a>
                  <a
                    href={item.epubUrl}
                    download
                    className="order-btn-download order-btn-epub"
                    title={`Download EPUB format of ${item.title}`}
                    onClick={(e) => {
                      e.preventDefault();
                      alert(`Downloading EPUB for "${item.title}". Enjoy your reading!`);
                    }}
                  >
                    <span>EPUB</span>
                  </a>
                </div>
              </div>
            ))}
          </div>
        </div>

        <button className="primary-button wide-button" onClick={onClose}>
          Return to Bookshelf
        </button>
      </div>
    </div>
  );
}
