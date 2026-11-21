import { useEffect, useMemo, useState } from "react";
import { AuthForms, ResetPasswordForm } from "../components/AuthForms";
import { ArrowIcon, Cover } from "../components/BookParts";
import { BagLayer } from "../components/BagLayer";
import { SiteFooter, SiteHeader } from "../components/SiteChrome";
import type { Book } from "../data/books";
import { fetchMyOrders, refreshAccount, signOut, useAccount, type DeliveryStatus, type PastOrder } from "../lib/account";
import { useBag } from "../lib/bag";
import { fetchBooks } from "../lib/books";
import { downloadReceipt } from "../lib/receipt";

const inr = (n: number) => `₹${n.toLocaleString("en-IN")}`;
const fmtDate = (iso: string | null) =>
  iso ? new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) : "";

const statusText: Record<DeliveryStatus, string> = {
  to_ship: "Preparing to ship",
  shipped: "Shipped",
  delivered: "Delivered",
  cancelled: "Cancelled",
};
const steps: { id: DeliveryStatus; label: string }[] = [
  { id: "to_ship", label: "Ordered" },
  { id: "shipped", label: "Shipped" },
  { id: "delivered", label: "Delivered" },
];

export default function AccountPage() {
  const account = useAccount();
  const [books, setBooks] = useState<Book[]>([]);
  const bag = useBag(books);
  // /account/reset?token=… (from the reset email) shows the new-password form until it's saved.
  const [resetToken, setResetToken] = useState(() =>
    window.location.pathname.startsWith("/account/reset") ? new URLSearchParams(window.location.search).get("token") : null,
  );

  useEffect(() => {
    document.title = account ? "My orders · Sw. Nirav Jayant" : "Sign in · Sw. Nirav Jayant";
  }, [account]);

  useEffect(() => {
    fetchBooks().then(setBooks);
  }, []);

  return (
    <div className="site-shell">
      <SiteHeader onHome={false} bagCount={bag.count} onOpenBag={bag.open} />
      <main className="account-page">
        {account && !resetToken ? (
          <MyOrders books={books} onBuyAgain={(list) => list.forEach((b) => bag.add(b))} />
        ) : (
          <SignedOut
            resetToken={resetToken}
            onResetDone={() => {
              window.history.replaceState(null, "", "/account");
              setResetToken(null);
            }}
          />
        )}
      </main>
      <SiteFooter onHome={false} />
      <BagLayer bag={bag} onBrowseBooks={() => (window.location.href = "/bookshelf")} />
    </div>
  );
}

/* ---------------- Signed out: sign in / create account / reset ---------------- */

function SignedOut({ resetToken, onResetDone }: { resetToken: string | null; onResetDone: () => void }) {
  return (
    <section className="auth-layout">
      <div className="auth-intro">
        <span className="eyebrow">YOUR ACCOUNT</span>
        <h1>
          Every book you've ordered,
          <br />
          <em>in one place.</em>
        </h1>
        <ul>
          <li>See all your orders and what you bought</li>
          <li>Follow each delivery: ordered, shipped, delivered</li>
          <li>Download receipts any time</li>
          <li>Faster checkout with your details filled in</li>
        </ul>
      </div>
      {resetToken ? (
        <ResetPasswordForm token={resetToken} onDone={onResetDone} />
      ) : (
        <AuthForms onDone={() => window.scrollTo({ top: 0 })} />
      )}
    </section>
  );
}

/* ---------------- Signed in: profile + order history ---------------- */

function MyOrders({ books, onBuyAgain }: { books: Book[]; onBuyAgain: (books: Book[]) => void }) {
  const account = useAccount()!;
  const [orders, setOrders] = useState<PastOrder[] | null>(null);
  const [error, setError] = useState("");
  const byId = useMemo(() => new Map(books.map((b) => [b.id, b])), [books]);

  const load = () => {
    setError("");
    fetchMyOrders()
      .then(setOrders)
      .catch((err) => setError((err as Error).message));
  };
  useEffect(() => {
    refreshAccount().catch(() => undefined);
    load();
  }, []);

  const booksBought = (orders ?? []).reduce((n, o) => n + o.items.reduce((m, i) => m + i.quantity, 0), 0);

  return (
    <section className="orders-layout">
      <header className="orders-head">
        <div>
          <span className="eyebrow">MY ACCOUNT</span>
          <h1>Namaste, {account.name.split(" ")[0]}</h1>
          <p>
            {account.email} · Member since {fmtDate(account.memberSince)}
          </p>
        </div>
        <div className="orders-head-actions">
          <div className="orders-stats">
            <div>
              <strong>{orders?.length ?? "–"}</strong>
              <span>orders</span>
            </div>
            <div>
              <strong>{orders ? booksBought : "–"}</strong>
              <span>books</span>
            </div>
          </div>
          <button className="text-button account-signout" onClick={() => signOut()}>
            Sign out
          </button>
        </div>
      </header>

      <h2 className="orders-title">My orders</h2>

      {error ? (
        <div className="orders-empty">
          <p>{error}</p>
          <button className="primary-button" onClick={load}>
            Try again
          </button>
        </div>
      ) : !orders ? (
        <p className="orders-loading">Loading your orders…</p>
      ) : orders.length === 0 ? (
        <div className="orders-empty">
          <p>You haven't placed an order with this account yet.</p>
          <a className="primary-button" href="/bookshelf">
            Browse the bookshelf <ArrowIcon />
          </a>
        </div>
      ) : (
        <div className="orders-list">
          {orders.map((order) => {
            const stepIndex = steps.findIndex((s) => s.id === order.deliveryStatus);
            const available = order.items
              .map((i) => byId.get(i.bookId))
              .filter(Boolean) as Book[];
            return (
              <article className="order-card" key={order.orderId}>
                <header className="order-card-head">
                  <div>
                    <span>Ordered on</span>
                    <strong>{fmtDate(order.paidAt ?? order.createdAt)}</strong>
                  </div>
                  <div>
                    <span>Total</span>
                    <strong>{inr(order.total)}</strong>
                  </div>
                  <div className="order-card-id">
                    <span>Order ID</span>
                    <strong>{order.orderId}</strong>
                  </div>
                  <span className={`delivery-badge is-${order.deliveryStatus}`}>{statusText[order.deliveryStatus]}</span>
                </header>

                {order.deliveryStatus !== "cancelled" && (
                  <ol className="delivery-steps" aria-label={`Delivery: ${statusText[order.deliveryStatus]}`}>
                    {steps.map((step, i) => (
                      <li key={step.id} className={i <= stepIndex ? "is-done" : ""}>
                        <span />
                        {step.label}
                        {step.id === "shipped" && order.shippedAt && <small>{fmtDate(order.shippedAt)}</small>}
                      </li>
                    ))}
                  </ol>
                )}

                <div className="order-card-body">
                  <ul className="order-card-items">
                    {order.items.map((item) => {
                      const book = byId.get(item.bookId);
                      return (
                        <li key={item.title}>
                          <div className="order-thumb">{book && <Cover book={book} compact />}</div>
                          <div>
                            <strong>{item.title}</strong>
                            <span>
                              Qty {item.quantity} · {inr(item.unitPrice * item.quantity)}
                            </span>
                          </div>
                        </li>
                      );
                    })}
                  </ul>

                  <div className="order-card-side">
                    <span>Shipping to</span>
                    <p>
                      <strong>{order.shipTo.name}</strong>
                      <br />
                      {order.shipTo.address}
                      <br />
                      {order.shipTo.city}, {order.shipTo.state} – {order.shipTo.pincode}
                    </p>
                    {order.tracking && (
                      <p className="order-tracking">
                        <span>Courier / tracking</span>
                        {order.tracking}
                      </p>
                    )}
                  </div>
                </div>

                <footer className="order-card-actions">
                  <button
                    type="button"
                    className="receipt-button"
                    onClick={() => downloadReceipt(order, new Date(order.paidAt ?? order.createdAt))}
                  >
                    Download receipt
                  </button>
                  {available.length > 0 && (
                    <button type="button" className="receipt-button" onClick={() => onBuyAgain(available)}>
                      Buy again
                    </button>
                  )}
                </footer>
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}
