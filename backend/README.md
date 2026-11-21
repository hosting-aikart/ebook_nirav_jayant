# Backend: Express + Neon Postgres + Razorpay

A small Node.js server (`src/`) that the website talks to under `/api`:

| Path | What it does |
|---|---|
| `src/checkout.ts` | Checkout: prices the bag from the database, creates the Razorpay order, verifies the payment, handles Razorpay's webhook |
| `src/admin.ts` | Admin panel API (`/admin` on the site): sign-in, books, image uploads, orders, customers |
| `src/app.ts` | Routes; in production it also serves the built website |
| `src/db.ts` | Database connection (Neon) and the migration runner |
| `db/migrations/*.sql` | Tables and the book catalogue. New files run automatically when the server starts |

The browser never talks to the database and never sees the Razorpay Key Secret.

### How a payment works
1. The customer adds books to the **Bag** (or taps **Buy book** for one copy) and enters their delivery address.
2. `POST /api/checkout/order` looks up every price in the `books` table (the browser never sets the price),
   creates a Razorpay order for the total and saves a **pending** order with its line items.
3. Razorpay Checkout opens (UPI, cards, net banking, wallets). If a payment attempt fails, the customer can retry
   in the same window.
4. On success, `POST /api/checkout/verify` checks Razorpay's signature, captures the payment if it is only
   authorised, marks the order **paid**, and the customer sees an order confirmation with the shipping address.
5. The webhook (`POST /api/razorpay/webhook`) does the same in the background, so an order is still marked paid if
   the customer closes the tab right after paying. Failed attempts are recorded with Razorpay's reason
   (Admin → Orders → Failed).

---

## Setup

### 1. Accounts
- **Neon** (free): https://neon.tech → New project → copy the connection string.
  For production, create the project in the region closest to your customers.
- **Razorpay**: https://dashboard.razorpay.com → Account & Settings → API Keys → Generate key.
  Use **Test mode** keys (`rzp_test_…`) while developing: test payments are free. Live keys (`rzp_live_…`) charge real money.

### 2. `backend/.env`
Copy `backend/.env.example` to `backend/.env` (it is git-ignored) and fill in `DATABASE_URL`, the Razorpay keys
and an admin email and password.

### 3. Run it
From the project root:
```bash
npm run install:all
npm run dev          # backend on :5000 + website on http://localhost:5173
```
On start the server creates the tables and loads the books (only migrations that haven't run yet), and prints
what is switched on: database, Razorpay test/live keys, webhook, admin sign-in.
`npm run db:migrate` does the database step on its own.

### 4. Admin panel
Open http://localhost:5173/admin and sign in with `ADMIN_EMAIL` / `ADMIN_PASSWORD` from `backend/.env`.
Sessions last 12 hours; changing the password signs everyone out. After 10 wrong passwords, sign-in pauses for 15 minutes.

### 4b. "New order" emails
Every paid order sends one email to `NOTIFY_EMAIL` (defaults to `ADMIN_EMAIL`) with the books, total,
customer phone/email and delivery address. It is sent from the Gmail account in `SMTP_USER`.
1. Turn on 2-Step Verification for that Google account.
2. Google Account → Security → **App passwords** → create one (name it "Store") → copy the 16 letters.
3. Put them in `backend/.env` as `SMTP_PASS=...` and restart the backend.

Without `SMTP_PASS` the store still works; the server log just says order emails are off.
Each order is emailed once, even if both the browser and the Razorpay webhook confirm it.

### 4c. Customer accounts (sign-in required to order)
Customers must **sign in or create an account before paying**; checkout shows the sign-in form first,
and the server refuses orders from anyone not signed in. Each order uses the account's email and appears
under **My orders** at **/account** with its delivery status (Ordered → Shipped → Delivered), tracking number
and a receipt download.

How sign-in is protected:
- Passwords are stored only as salted scrypt hashes.
- The session is a **JWT (HS256)** in an `httpOnly`, `SameSite=Lax` cookie (HTTPS-only in production), valid 30 days.
  Page scripts can't read it and other websites can't use it.
- The JWT signing key is random and kept in the database (`app_secrets`), or set `JWT_SECRET` in `.env`.
- Wrong passwords are limited to 10 per 15 minutes per IP address and per account.
- **Forgot password?** emails a one-time link valid for 30 minutes (max 3 per hour per account). Using it sets a
  new password and signs the account out everywhere else. Until email (`SMTP_PASS`) is set up, the link is
  printed in the backend terminal instead (development only).
- Set `SITE_URL` in `.env` to the live website address once hosted, so reset links point there.

### 5. Shipping the books
Books are printed copies delivered to the customer. At checkout the customer gives their mobile number and delivery address.
Each paid order shows up in Admin → Orders with the full address. When you send it, set **Delivery** to "Shipped" and type the courier / tracking number. Set it to "Delivered" once it arrives.

### 6. Razorpay webhook (once the site is online)
Razorpay can only reach a public address, so set this up after deploying (or with a tunnel such as ngrok).
Razorpay Dashboard → Account & Settings → Webhooks → Add, in the same mode (Test or Live) as your keys:
- URL: `https://YOUR-SITE/api/razorpay/webhook`
- Secret: any long random string; put the same string in `RAZORPAY_WEBHOOK_SECRET` and restart the server.
- Events: `payment.authorized`, `payment.captured`, `payment.failed`, `order.paid`

Checkout works without the webhook; it is the backup for customers who close the tab right after paying.

### 7. Test a purchase
Add a couple of books to the **Bag** → **Checkout** → fill in the delivery details → pay. The order then appears
in Admin → Orders, marked "To ship", with every book listed.

- **Test keys:** pay with a Razorpay test card (`4111 1111 1111 1111`, any future expiry, any CVV) or the test
  UPI ID `success@razorpay`. Use `failure@razorpay` to see a failed payment (Admin → Orders → Failed, with the reason).
  The current test cards are at https://razorpay.com/docs/payments/payments/test-card-details/
- **Live keys:** test cards don't work. Make one small real payment, check it in Admin → Orders and the Razorpay
  dashboard, then refund it from the Razorpay dashboard (Razorpay keeps its fee).

### Deploying
```bash
npm run install:all
npm run build        # builds the website and the server
npm start            # one server: the website and /api on the same address
```
Set the same variables as in `backend/.env` in your host's settings (Render, Railway, a VPS, …), with `PORT` if
the host requires it. Uploaded images are stored in the database, so the server keeps no files of its own.
Payments are captured automatically whether your Razorpay account uses automatic or manual capture.

---

## Admin panel features
- **Dashboard**: total revenue, this month's revenue, paid orders, customers, recent orders
- **Books**: add, edit, hide/show, delete, upload cover and preview images, change display order, set language.
  Every visible book is listed on the **Bookshelf** page (`/bookshelf`). Tick **"Also show on home page"** to put it on the home page too; new books start as Bookshelf-only.
  Books that have orders can't be deleted (customer records are kept); use **Hide** instead.
- **Orders**: delivery address for each order, delivery status (To ship / Shipped / Delivered / Cancelled) and tracking number, search, filters, export CSV (handy for printing shipping labels)
- **Customers**: name, email, phone, books bought, total spent, export CSV

## Not built yet (good next steps)
- Automatic order-confirmation and "shipped" emails (e.g. with [Resend](https://resend.com)). Today you see every order and address in Admin → Orders.
- Delivery charges (today the book price is the full amount the customer pays)
- Refunds from the admin panel (use the Razorpay dashboard for now)
- Editing other site sections (hero text, about, shelves) from the admin panel
