import type { OrderReceipt } from "./checkout";

const STORE_NAME = "Sw. Nirav Jayant";

const inr = (n: number) => `₹${n.toLocaleString("en-IN")}`;
const esc = (v: unknown) =>
  String(v ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

/** A standalone, print-ready receipt page (A4). */
export function receiptHtml(order: OrderReceipt, paidAt: Date = new Date()): string {
  const { shipTo } = order;
  const date = paidAt.toLocaleString("en-IN", { dateStyle: "long", timeStyle: "short" });
  const rows = order.items
    .map(
      (i) => `<tr>
        <td>${esc(i.title)}</td>
        <td class="num">${esc(i.quantity)}</td>
        <td class="num">${esc(inr(i.unitPrice))}</td>
        <td class="num">${esc(inr(i.unitPrice * i.quantity))}</td>
      </tr>`,
    )
    .join("");

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>Receipt ${esc(order.orderId)}</title>
<style>
  @page { size: A4; margin: 18mm; }
  * { box-sizing: border-box; }
  body { margin: 0; font-family: "Segoe UI", Arial, "Noto Sans Devanagari", sans-serif; color: #123f48; font-size: 13px; line-height: 1.5; }
  .head { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid #123f48; padding-bottom: 14px; }
  .brand { font-family: Georgia, serif; font-size: 26px; }
  .tag { font-style: italic; font-size: 12px; opacity: .7; }
  .title { text-align: right; }
  .title h1 { margin: 0; font-size: 20px; letter-spacing: .12em; }
  .paid { display: inline-block; margin-top: 6px; padding: 2px 10px; border-radius: 99px; background: #dff1e6; color: #1d6b3d; font-weight: 600; font-size: 11px; letter-spacing: .08em; }
  .grid { display: flex; gap: 40px; margin: 22px 0; }
  .grid > div { flex: 1; }
  h2 { margin: 0 0 6px; font-size: 10px; letter-spacing: .16em; text-transform: uppercase; opacity: .65; }
  table { width: 100%; border-collapse: collapse; margin-top: 6px; }
  th { text-align: left; font-size: 10px; letter-spacing: .12em; text-transform: uppercase; opacity: .65; border-bottom: 1px solid #c9d6d6; padding: 8px 0; }
  td { padding: 10px 0; border-bottom: 1px solid #e4ebeb; }
  .num { text-align: right; white-space: nowrap; }
  th.num { text-align: right; }
  .total td { border-bottom: 0; border-top: 2px solid #123f48; font-weight: 700; font-size: 15px; }
  .ids { margin-top: 22px; padding: 12px 14px; background: #eef3f2; border-radius: 6px; font-family: Consolas, monospace; font-size: 12px; }
  .foot { margin-top: 28px; font-size: 11px; opacity: .7; }
</style>
</head>
<body>
  <div class="head">
    <div>
      <div class="brand">${esc(STORE_NAME)}</div>
      <div class="tag">A Buddha with wine in the marketplace…</div>
    </div>
    <div class="title">
      <h1>RECEIPT</h1>
      <div>${esc(date)}</div>
      <span class="paid">PAID</span>
    </div>
  </div>

  <div class="grid">
    <div>
      <h2>Billed &amp; shipped to</h2>
      <strong>${esc(shipTo.name)}</strong><br>
      ${esc(shipTo.address)}<br>
      ${esc(shipTo.city)}, ${esc(shipTo.state)} – ${esc(shipTo.pincode)}<br>
      Phone: ${esc(shipTo.phone)}${order.email ? `<br>Email: ${esc(order.email)}` : ""}
    </div>
    <div>
      <h2>Payment</h2>
      Paid online via Razorpay<br>
      Amount: <strong>${esc(inr(order.total))}</strong>
    </div>
  </div>

  <table>
    <thead><tr><th>Book</th><th class="num">Qty</th><th class="num">Price</th><th class="num">Amount</th></tr></thead>
    <tbody>
      ${rows}
      <tr class="total"><td colspan="3">Total paid</td><td class="num">${esc(inr(order.total))}</td></tr>
    </tbody>
  </table>

  <div class="ids">
    Order ID: ${esc(order.orderId)}<br>
    Payment ID: ${esc(order.paymentId ?? "—")}
  </div>

  <p class="foot">Thank you for your order. Printed books are delivered to the address above.
  Please keep this receipt and your order ID for reference.</p>
</body>
</html>`;
}

/**
 * Opens the browser's print dialog for the receipt, where "Save as PDF" downloads it.
 * Uses a hidden iframe so it works without pop-up permission, on desktop and mobile.
 */
export function downloadReceipt(order: OrderReceipt, paidAt?: Date) {
  const frame = document.createElement("iframe");
  frame.setAttribute("aria-hidden", "true");
  frame.style.cssText = "position:fixed;right:0;bottom:0;width:0;height:0;border:0;visibility:hidden";
  document.body.appendChild(frame);

  const doc = frame.contentDocument!;
  doc.open();
  doc.write(receiptHtml(order, paidAt));
  doc.close();

  const print = () => {
    const win = frame.contentWindow!;
    win.focus();
    win.print();
    // Remove after the dialog closes (print() blocks on desktop; give mobile time too).
    setTimeout(() => frame.remove(), 60_000);
  };
  if (doc.readyState === "complete") setTimeout(print, 50);
  else frame.addEventListener("load", print, { once: true });
}
