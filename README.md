# STILL. — E-Book Store by Sw. Nirav Jayant

A mindful digital e-book platform featuring interactive 3D flip-book reading previews, shopping bag drawer, and secure **Razorpay payment gateway integration**.

---

## 🛠 Tech Stack

* **Frontend**: React 19, TypeScript, Vite, Tailwind CSS v4
* **Backend**: Node.js, Express, TypeScript, Razorpay Node SDK
* **Payment Gateway**: Razorpay (UPI, Debit/Credit Cards, NetBanking, Wallets)

---

## 🚀 Quick Start Guide

### 1. Backend Setup

```bash
cd backend
npm install
```

Configure your Razorpay API keys in `backend/.env`:
```env
PORT=5000
FRONTEND_URL=http://localhost:5173
RAZORPAY_KEY_ID=rzp_test_YOUR_KEY_ID
RAZORPAY_KEY_SECRET=YOUR_KEY_SECRET
```
> **Note**: If left as placeholder keys, the backend automatically runs in **Developer Demo Mode**, allowing you to test the complete order generation and payment verification workflow without real credentials.

Start the backend server:
```bash
npm run dev
```
The backend API runs on `http://localhost:5000`.

---

### 2. Frontend Setup

In a new terminal:
```bash
cd frontend
npm install
npm run dev
```
Open `http://localhost:5173` in your browser.

---

## 💳 Razorpay Payment Flow

1. **Bag Management**:
   * Add books to your bag directly from the bookshelf cards (`+ Add`) or from inside the 3D flip-book preview (`Add e-book to bag`).
   * The header displays live count: `Bag (N)`.
   * Open the serene slide-out drawer to review items, adjust quantities, or remove items.
2. **Order Creation (`POST /api/create-order`)**:
   * Customer enters their Name and Email (for e-book delivery).
   * Backend validates all items and prices against canonical book data (tamper-proof) and creates a secure Razorpay Order.
3. **Checkout Experience**:
   * Launches Razorpay Checkout modal supporting UPI (Google Pay, PhonePe, Paytm), Cards, and NetBanking.
4. **Signature Verification (`POST /api/verify-payment`)**:
   * Razorpay payment ID and cryptographic HMAC-SHA256 signature are verified server-side.
5. **Confirmation & Delivery**:
   * Once verified, an order confirmation screen provides instant PDF and EPUB download links.
