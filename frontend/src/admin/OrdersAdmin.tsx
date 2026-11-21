import { useEffect, useMemo, useState } from "react";
import { deliveryLabels, fetchOrders, updateDelivery, type DeliveryStatus, type OrderRow } from "./data";
import { Button, Card, Input, Select, StatusBadge, downloadCsv, fmtDate, inr } from "./ui";

const fullAddress = (o: OrderRow) =>
  [o.ship_address, o.ship_city, o.ship_state && o.ship_pincode ? `${o.ship_state} – ${o.ship_pincode}` : o.ship_state ?? o.ship_pincode]
    .filter(Boolean)
    .join(", ");

/** One line per book, e.g. "Playing with Breath × 2". Falls back to the order summary. */
const bookLines = (o: OrderRow) =>
  o.order_items.length
    ? o.order_items.map((i) => (i.quantity > 1 ? `${i.title} × ${i.quantity}` : i.title))
    : [o.book_title];

export default function OrdersAdmin() {
  const [orders, setOrders] = useState<OrderRow[] | null>(null);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<"all" | OrderRow["status"]>("paid");
  const [delivery, setDelivery] = useState<"all" | DeliveryStatus>("all");
  const [savingId, setSavingId] = useState<string | null>(null);

  const load = () => fetchOrders().then(setOrders).catch((e) => setError(e.message));
  useEffect(() => {
    load();
  }, []);

  const save = async (o: OrderRow, patch: Parameters<typeof updateDelivery>[1]) => {
    setSavingId(o.id);
    try {
      await updateDelivery(o.id, patch);
      setOrders((list) => list?.map((x) => (x.id === o.id ? { ...x, ...patch } : x)) ?? null);
    } catch (e) {
      alert((e as Error).message);
    } finally {
      setSavingId(null);
    }
  };

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return (orders ?? []).filter(
      (o) =>
        (status === "all" || o.status === status) &&
        (delivery === "all" || o.delivery_status === delivery) &&
        (!q ||
          [
            o.customers?.name,
            o.customers?.email,
            o.ship_phone ?? o.customers?.phone,
            o.book_title,
            o.razorpay_payment_id,
            o.ship_city,
            o.ship_pincode,
          ]
            .filter(Boolean)
            .some((v) => v!.toLowerCase().includes(q))),
    );
  }, [orders, query, status, delivery]);

  const exportCsv = () =>
    downloadCsv(
      `orders-${new Date().toISOString().slice(0, 10)}.csv`,
      filtered.map((o) => ({
        Date: fmtDate(o.created_at),
        Customer: o.ship_name ?? o.customers?.name,
        Email: o.customers?.email,
        Phone: o.ship_phone ?? o.customers?.phone,
        Address: o.ship_address,
        City: o.ship_city,
        State: o.ship_state,
        "PIN code": o.ship_pincode,
        Books: bookLines(o).join("; "),
        Copies: o.order_items.reduce((n, i) => n + i.quantity, 0) || 1,
        "Amount (INR)": o.amount,
        Payment: o.status,
        "Payment error": o.payment_error,
        Delivery: deliveryLabels[o.delivery_status] ?? o.delivery_status,
        Tracking: o.tracking_info,
        "Razorpay payment ID": o.razorpay_payment_id,
        "Razorpay order ID": o.razorpay_order_id,
      })),
    );

  if (error) return <p className="text-red-600">{error}</p>;

  return (
    <div className="grid gap-5">
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="mr-auto text-2xl font-semibold">Orders</h1>
        <Input className="w-64" placeholder="Search name, phone, city, book…" value={query} onChange={(e) => setQuery(e.target.value)} />
        <Select className="w-36" value={status} onChange={(e) => setStatus(e.target.value as typeof status)}>
          <option value="paid">Paid</option>
          <option value="pending">Pending</option>
          <option value="failed">Failed</option>
          <option value="all">All payments</option>
        </Select>
        <Select className="w-36" value={delivery} onChange={(e) => setDelivery(e.target.value as typeof delivery)}>
          <option value="all">All deliveries</option>
          {(Object.keys(deliveryLabels) as DeliveryStatus[]).map((d) => (
            <option key={d} value={d}>{deliveryLabels[d]}</option>
          ))}
        </Select>
        <Button variant="ghost" onClick={load}>Refresh</Button>
        <Button onClick={exportCsv} disabled={!filtered.length}>Export CSV</Button>
      </div>

      <Card className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-4 py-3">Date</th>
              <th className="px-4 py-3">Customer</th>
              <th className="px-4 py-3">Ship to</th>
              <th className="px-4 py-3">Books</th>
              <th className="px-4 py-3 text-right">Amount</th>
              <th className="px-4 py-3">Payment</th>
              <th className="px-4 py-3">Delivery</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {!orders ? (
              <tr><td colSpan={7} className="px-4 py-6 text-slate-500">Loading…</td></tr>
            ) : filtered.length === 0 ? (
              <tr><td colSpan={7} className="px-4 py-6 text-slate-500">No orders found.</td></tr>
            ) : (
              filtered.map((o) => (
                <tr key={o.id} className="align-top hover:bg-slate-50">
                  <td className="whitespace-nowrap px-4 py-3 text-slate-500">{fmtDate(o.created_at)}</td>
                  <td className="px-4 py-3">
                    <div className="font-medium">{o.ship_name ?? o.customers?.name}</div>
                    <a className="block text-slate-500 hover:underline" href={`mailto:${o.customers?.email}`}>{o.customers?.email}</a>
                    <span className="text-slate-500">{o.ship_phone ?? o.customers?.phone ?? "—"}</span>
                  </td>
                  <td className="max-w-64 px-4 py-3 text-slate-600">{fullAddress(o) || "—"}</td>
                  <td className="px-4 py-3">
                    {bookLines(o).map((line) => (
                      <div key={line}>{line}</div>
                    ))}
                  </td>
                  <td className="px-4 py-3 text-right">{inr(o.amount)}</td>
                  <td className="px-4 py-3">
                    <StatusBadge status={o.status} />
                    <div className="mt-1 font-mono text-[11px] text-slate-400">{o.razorpay_payment_id ?? ""}</div>
                    {o.status === "failed" && o.payment_error && (
                      <div className="mt-1 max-w-48 text-xs text-red-600">{o.payment_error}</div>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {o.status === "paid" ? (
                      <div className="grid w-44 gap-1.5">
                        <Select
                          value={o.delivery_status}
                          disabled={savingId === o.id}
                          onChange={(e) => save(o, { delivery_status: e.target.value as DeliveryStatus })}
                        >
                          {(Object.keys(deliveryLabels) as DeliveryStatus[]).map((d) => (
                            <option key={d} value={d}>{deliveryLabels[d]}</option>
                          ))}
                        </Select>
                        <Input
                          placeholder="Courier / tracking no."
                          defaultValue={o.tracking_info ?? ""}
                          disabled={savingId === o.id}
                          onBlur={(e) => {
                            const value = e.target.value.trim() || null;
                            if (value !== o.tracking_info) save(o, { tracking_info: value });
                          }}
                        />
                      </div>
                    ) : (
                      <span className="text-slate-400">—</span>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </Card>
      <p className="text-sm text-slate-500">{filtered.length} orders</p>
    </div>
  );
}
