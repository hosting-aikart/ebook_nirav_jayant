import { useEffect, useState } from "react";
import { fetchOrders, type OrderRow } from "./data";
import { adminApi } from "./session";
import { Card, StatusBadge, fmtDate, inr } from "./ui";

export default function Dashboard({ onNavigate }: { onNavigate: (tab: "orders" | "books") => void }) {
  const [orders, setOrders] = useState<OrderRow[] | null>(null);
  const [bookCount, setBookCount] = useState<number | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    fetchOrders().then(setOrders).catch((e) => setError(e.message));
    adminApi<unknown[]>("/books")
      .then((books) => setBookCount(books.length))
      .catch(() => setBookCount(null));
  }, []);

  if (error) return <p className="text-red-600">{error}</p>;
  if (!orders) return <p className="text-slate-500">Loading…</p>;

  const paid = orders.filter((o) => o.status === "paid");
  const revenue = paid.reduce((sum, o) => sum + o.amount, 0);
  const buyers = new Set(paid.map((o) => o.customers?.email)).size;
  const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
  const monthRevenue = paid
    .filter((o) => o.paid_at && new Date(o.paid_at) >= monthStart)
    .reduce((sum, o) => sum + o.amount, 0);

  const stats = [
    ["Total revenue", inr(revenue)],
    ["This month", inr(monthRevenue)],
    ["Paid orders", String(paid.length)],
    ["Customers", String(buyers)],
    ["Books", bookCount === null ? "…" : String(bookCount)],
  ];

  return (
    <div className="grid gap-8">
      <div className="grid grid-cols-2 gap-4 md:grid-cols-5">
        {stats.map(([label, value]) => (
          <Card key={label} className="p-5">
            <p className="text-sm text-slate-500">{label}</p>
            <p className="mt-1 text-2xl font-semibold text-[#123f48]">{value}</p>
          </Card>
        ))}
      </div>

      <Card>
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
          <h2 className="font-semibold">Recent orders</h2>
          <button className="text-sm text-[#123f48] hover:underline" onClick={() => onNavigate("orders")}>
            View all →
          </button>
        </div>
        {orders.length === 0 ? (
          <p className="p-5 text-sm text-slate-500">No orders yet.</p>
        ) : (
          <ul className="divide-y divide-slate-100">
            {orders.slice(0, 8).map((o) => (
              <li key={o.id} className="flex flex-wrap items-center gap-x-4 gap-y-1 px-5 py-3 text-sm">
                <span className="min-w-40 font-medium">{o.customers?.name ?? "—"}</span>
                <span className="flex-1 text-slate-500">{o.book_title}</span>
                <span>{inr(o.amount)}</span>
                <StatusBadge status={o.status} />
                <span className="w-44 text-right text-slate-400">{fmtDate(o.created_at)}</span>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
