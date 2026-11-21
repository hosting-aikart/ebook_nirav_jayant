import nodemailer, { type Transporter } from "nodemailer";
import { config } from "./config.js";

/** What the store owner needs to pack and ship a paid order. */
export type PaidOrderEmail = {
  orderId: string;
  paymentId: string | null;
  total: number;
  customer: { name: string; email: string | null; phone: string };
  shipTo: { address: string; city: string; state: string; pincode: string };
  items: { title: string; quantity: number; unitPrice: number }[];
};

let transporter: Transporter | null = null;
let warned = false;

function mailer(): Transporter | null {
  if (!config.notifyEmail || !config.smtpUser || !config.smtpPass) {
    if (!warned) {
      console.warn(
        "Order emails are off: set NOTIFY_EMAIL, SMTP_USER and SMTP_PASS in backend/.env (see backend/README.md).",
      );
      warned = true;
    }
    return null;
  }
  transporter ??= nodemailer.createTransport({
    host: config.smtpHost,
    port: config.smtpPort,
    secure: config.smtpPort === 465,
    auth: { user: config.smtpUser, pass: config.smtpPass },
  });
  return transporter;
}

const esc = (v: unknown) =>
  String(v ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
const inr = (n: number) => "₹" + n.toLocaleString("en-IN");

function render(o: PaidOrderEmail) {
  const address = [o.shipTo.address, o.shipTo.city, `${o.shipTo.state} – ${o.shipTo.pincode}`]
    .filter((s) => s.trim())
    .join(", ");
  const itemLines = o.items.map((i) => `${i.quantity} × ${i.title} — ${inr(i.unitPrice * i.quantity)}`);
  const count = o.items.reduce((n, i) => n + i.quantity, 0);

  const subject = `New order: ${inr(o.total)} — ${o.customer.name} (${count} ${count === 1 ? "book" : "books"})`;

  const text = [
    "You have a new paid order. Please pack and ship it.",
    "",
    "BOOKS",
    ...itemLines,
    `Total paid: ${inr(o.total)}`,
    "",
    "SHIP TO",
    o.customer.name,
    address,
    `Phone: ${o.customer.phone}`,
    `Email: ${o.customer.email ?? "—"}`,
    "",
    `Razorpay order: ${o.orderId}`,
    `Razorpay payment: ${o.paymentId ?? "—"}`,
    "",
    "Mark it as Shipped in Admin → Orders once it's sent.",
  ].join("\n");

  const html = `
<div style="font-family:Arial,sans-serif;color:#123f48;max-width:560px">
  <h2 style="margin:0 0 4px">New order · ${esc(inr(o.total))}</h2>
  <p style="margin:0 0 20px;color:#555">You have a new paid order. Please pack and ship it.</p>
  <h3 style="margin:0 0 8px;font-size:13px;letter-spacing:.1em">BOOKS</h3>
  <table style="width:100%;border-collapse:collapse;margin-bottom:20px">
    ${o.items
      .map(
        (i) => `<tr>
      <td style="padding:6px 0;border-bottom:1px solid #eee">${esc(i.quantity)} × ${esc(i.title)}</td>
      <td style="padding:6px 0;border-bottom:1px solid #eee;text-align:right">${esc(inr(i.unitPrice * i.quantity))}</td>
    </tr>`,
      )
      .join("")}
    <tr><td style="padding:8px 0"><b>Total paid</b></td><td style="padding:8px 0;text-align:right"><b>${esc(inr(o.total))}</b></td></tr>
  </table>
  <h3 style="margin:0 0 8px;font-size:13px;letter-spacing:.1em">SHIP TO</h3>
  <p style="margin:0 0 20px;line-height:1.6">
    <b>${esc(o.customer.name)}</b><br>${esc(address)}<br>
    Phone: ${esc(o.customer.phone)}<br>Email: ${esc(o.customer.email ?? "—")}
  </p>
  <p style="margin:0;font-size:12px;color:#777">
    Razorpay order: ${esc(o.orderId)}<br>Razorpay payment: ${esc(o.paymentId ?? "—")}<br><br>
    Mark it as Shipped in Admin → Orders once it's sent.
  </p>
</div>`;

  return { subject, text, html };
}

/** Emails the store owner about a newly paid order. Never throws: a mail problem must not break checkout. */
export async function notifyOrderPaid(order: PaidOrderEmail): Promise<void> {
  const transport = mailer();
  if (!transport) return;
  try {
    const { subject, text, html } = render(order);
    await transport.sendMail({
      from: `"Sw. Nirav Jayant – Orders" <${config.smtpUser}>`,
      to: config.notifyEmail,
      replyTo: order.customer.email ?? undefined,
      subject,
      text,
      html,
    });
    console.log(`Order email sent for ${order.orderId}`);
  } catch (err) {
    console.error(`Could not send order email for ${order.orderId}:`, err);
  }
}

/** True when SMTP_USER and SMTP_PASS are set, so emails to customers can be sent. */
export const emailConfigured = () => Boolean(config.smtpUser && config.smtpPass);

/** Sends an email to a customer (e.g. a password-reset link). Returns false if it couldn't be sent. */
export async function sendEmail(message: { to: string; subject: string; text: string; html: string }): Promise<boolean> {
  if (!emailConfigured()) return false;
  transporter ??= nodemailer.createTransport({
    host: config.smtpHost,
    port: config.smtpPort,
    secure: config.smtpPort === 465,
    auth: { user: config.smtpUser, pass: config.smtpPass },
  });
  try {
    await transporter.sendMail({ from: `"Sw. Nirav Jayant" <${config.smtpUser}>`, ...message });
    return true;
  } catch (err) {
    console.error(`Could not send email to ${message.to}:`, err);
    return false;
  }
}
