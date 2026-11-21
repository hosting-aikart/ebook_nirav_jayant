# STILL. — E-Book Store by Sw. Nirav Jayant

A mindful digital e-book platform featuring interactive 3D flip-book reading previews, shopping bag drawer, and secure **Razorpay payment gateway integration**.

---

## 🛠 Tech Stack

* **Frontend**: React 19, TypeScript, Vite, Tailwind CSS v4
* **Backend**: Node.js + Express 5 (TypeScript), PostgreSQL on **Neon**
* **Payment Gateway**: Razorpay Standard Checkout (UPI, Debit/Credit Cards, NetBanking, Wallets)

---

## 🚀 Quick Start

1. Copy `backend/.env.example` to `backend/.env` and fill in the Neon connection string, Razorpay keys
   and an admin email + password.
2. Run:
   ```bash
   npm run install:all
   npm run dev               # website http://localhost:5173 (API on :5000)
   ```
   The first start creates the database tables and loads the books.

Admin panel: http://localhost:5173/admin. Full setup, webhook, test payments and deployment:
**[backend/README.md](backend/README.md)**.

Production: `npm run build` then `npm start` runs one server for both the website and the API.

---

## 💳 Razorpay Payment Flow

Books are **printed copies delivered across India**.

1. **Bag**: add books from the home page or the Bookshelf (`+ Add`, or *Add to bag* inside a book).
   The bag is saved in the browser and shared between pages. *Buy book* inside a book skips the bag for a single copy.
2. **Delivery details**: name, email, mobile number and delivery address (validated in the browser and again on the server).
3. **Order creation** (`POST /api/checkout/order`): every price is read from the database, never from the browser.
   A Razorpay order is created for the total and a pending order with its line items is saved.
4. **Razorpay Checkout**: UPI (Google Pay, PhonePe, Paytm), cards, net banking and wallets. Failed attempts can be retried in the same window.
5. **Verification** (`POST /api/checkout/verify`): the HMAC-SHA256 signature is checked, the payment amount is matched
   to the order and captured if needed, and the order is marked **paid**.
6. **Confirmation**: the customer sees their order, total, shipping address and order/payment IDs.
7. **Webhook backup** (`POST /api/razorpay/webhook`): marks orders paid even if the customer closes the tab, and records failed payments.
8. **Admin** (`/admin`): every paid order with its books and address, delivery status and tracking, CSV export.

The Razorpay Key Secret stays on the server; the website never sees it.
