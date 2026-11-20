import { useEffect, useMemo, useState } from "react";
import { fetchCustomers, type CustomerRow } from "./data";
import { Button, Card, Input, downloadCsv, fmtDate, inr } from "./ui";

export default function CustomersAdmin() {
  const [customers, setCustomers] = useState<CustomerRow[] | null>(null);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [buyersOnly, setBuyersOnly] = useState(true);

  useEffect(() => {
    fetchCustomers().then(setCustomers).catch((e) => setError(e.message));
  }, []);

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    return (customers ?? [])
      .map((c) => {
        const paid = c.orders.filter((o) => o.status === "paid");
        return { ...c, paid, spent: paid.reduce((s, o) => s + o.amount, 0) };
      })
      .filter((c) => (!buyersOnly || c.paid.length > 0))
      .filter((c) => !q || [c.name, c.email, c.phone].filter(Boolean).some((v) => v!.toLowerCase().includes(q)));
  }, [customers, query, buyersOnly]);

  const exportCsv = () =>
    downloadCsv(
      `customers-${new Date().toISOString().slice(0, 10)}.csv`,
      rows.map((c) => ({
        Name: c.name,
        Email: c.email,
        Phone: c.phone,
        "Books bought": c.paid.map((o) => o.book_title).join("; "),
        "Total spent (INR)": c.spent,
        "First seen": fmtDate(c.created_at),
      })),
    );

  if (error) return <p className="text-red-600">{error}</p>;

  return (
    <div className="grid gap-5">
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="mr-auto text-2xl font-semibold">Customers</h1>
        <label className="flex items-center gap-2 text-sm text-slate-600">
          <input type="checkbox" checked={buyersOnly} onChange={(e) => setBuyersOnly(e.target.checked)} />
          Paying customers only
        </label>
        <Input className="w-64" placeholder="Search name, email, phone…" value={query} onChange={(e) => setQuery(e.target.value)} />
        <Button onClick={exportCsv} disabled={!rows.length}>Export CSV</Button>
      </div>

      <Card className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-4 py-3">Name</th>
              <th className="px-4 py-3">Email</th>
              <th className="px-4 py-3">Phone</th>
              <th className="px-4 py-3">Books bought</th>
              <th className="px-4 py-3 text-right">Total spent</th>
              <th className="px-4 py-3">First seen</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {!customers ? (
              <tr><td colSpan={6} className="px-4 py-6 text-slate-500">Loading…</td></tr>
            ) : rows.length === 0 ? (
              <tr><td colSpan={6} className="px-4 py-6 text-slate-500">No customers found.</td></tr>
            ) : (
              rows.map((c) => (
                <tr key={c.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3 font-medium">{c.name}</td>
                  <td className="px-4 py-3"><a className="hover:underline" href={`mailto:${c.email}`}>{c.email}</a></td>
                  <td className="px-4 py-3 text-slate-500">{c.phone ?? "—"}</td>
                  <td className="px-4 py-3 text-slate-600">{c.paid.map((o) => o.book_title).join(", ") || "—"}</td>
                  <td className="px-4 py-3 text-right">{inr(c.spent)}</td>
                  <td className="whitespace-nowrap px-4 py-3 text-slate-500">{fmtDate(c.created_at)}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </Card>
      <p className="text-sm text-slate-500">{rows.length} customers</p>
    </div>
  );
}
