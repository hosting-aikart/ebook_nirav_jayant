# Backend: Supabase + Razorpay

This folder holds everything server-side for the store:

| Path | What it does |
|---|---|
| `supabase/migrations/…_init.sql` | Tables (`books`, `customers`, `orders`, `admins`), security rules, storage buckets |
| `supabase/migrations/…_seed_books.sql` | Loads the original 8 books into the database |
| `supabase/functions/create-order` | Checkout step 1: saves the customer and delivery address, creates a Razorpay order |
| `supabase/functions/verify-payment` | Checkout step 2: verifies the payment and marks the order paid |
| `supabase/functions/razorpay-webhook` | Backup: marks orders paid even if the customer closes the tab |

The admin panel lives in the frontend at **`/admin`** (`frontend/src/admin/`).

---

## One-time setup (about 20 minutes)

### 1. Create the accounts
- **Supabase** (free): https://supabase.com → New project. Save the database password.
- **Razorpay**: https://dashboard.razorpay.com → switch to **Test mode** → Settings → API Keys → Generate key. You get a **Key ID** and a **Key Secret**.

### 2. Install the Supabase CLI and push the database
```bash
npm install -g supabase          # or: brew install supabase/tap/supabase
cd backend
supabase login
supabase link --project-ref YOUR-PROJECT-REF   # the ref is in your project URL
supabase db push                               # creates tables + loads the 8 books
```

### 3. Add the secret keys and deploy the functions
```bash
supabase secrets set RAZORPAY_KEY_ID=rzp_test_xxx RAZORPAY_KEY_SECRET=xxx RAZORPAY_WEBHOOK_SECRET=pick-any-long-random-string
supabase functions deploy create-order
supabase functions deploy verify-payment
supabase functions deploy razorpay-webhook
```

### 4. Connect the website
Copy `frontend/.env.example` to `frontend/.env` and fill in the values from Supabase → Project Settings → API:
```
VITE_SUPABASE_URL=https://YOUR-PROJECT-REF.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-public-key
```
Restart `npm run dev`.

### 5. Create your admin login
1. Supabase → Authentication → Users → **Add user** → enter your email and a strong password (tick "Auto confirm").
2. Supabase → SQL Editor → run:
   ```sql
   insert into public.admins (user_id)
   select id from auth.users where email = 'you@example.com';
   ```
3. Open http://localhost:5173/admin and sign in.

Also turn **off** public sign-ups (Authentication → Sign In / Providers → "Allow new users to sign up"). Only admins need accounts.

### 6. Shipping the books
Books are printed copies delivered to the customer. At checkout the customer gives their mobile number and delivery address.
Each paid order shows up in Admin → Orders with the full address. When you send it, set **Delivery** to "Shipped" and type the courier / tracking number. Set it to "Delivered" once it arrives.

### 7. Set up the Razorpay webhook
Razorpay Dashboard → Settings → Webhooks → Add:
- URL: `https://YOUR-PROJECT-REF.supabase.co/functions/v1/razorpay-webhook`
- Secret: the same `RAZORPAY_WEBHOOK_SECRET` you set in step 3
- Events: `payment.captured`, `payment.failed`

### 8. Test a purchase
On the site, open a book → **Buy e-book** → fill in the form → pay with a Razorpay test card
(`4111 1111 1111 1111`, any future expiry, any CVV) or the test UPI ID `success@razorpay`.
The order then appears in Admin → Orders, marked "To ship".

### Going live
Complete Razorpay KYC, generate **Live** keys, and re-run the `supabase secrets set` command with them. Recreate the webhook in Live mode too.

When you host the site (Vercel, Netlify, etc.), add an "SPA rewrite" so `/admin` serves `index.html`:
- **Vercel**: `frontend/vercel.json` → `{ "rewrites": [{ "source": "/(.*)", "destination": "/" }] }`
- **Netlify**: `frontend/public/_redirects` → `/*  /index.html  200`

---

## Admin panel features
- **Dashboard**: total revenue, this month's revenue, paid orders, customers, recent orders
- **Books**: add, edit, hide/show, delete, upload cover, edit preview pages, change display order, set language.
  Every visible book is listed on the **Bookshelf** page (`/bookshelf`). Tick **"Also show on home page"** to put it on the home page too; new books start as Bookshelf-only.
  Books that have orders can't be deleted (customer records are kept); use **Hide** instead.
- **Orders**: delivery address for each order, delivery status (To ship / Shipped / Delivered / Cancelled) and tracking number, search, filters, export CSV (handy for printing shipping labels)
- **Customers**: name, email, phone, books bought, total spent, export CSV

## Not built yet (good next steps)
- Automatic order-confirmation and "shipped" emails (e.g. with [Resend](https://resend.com)). Today you see every order and address in Admin → Orders.
- Delivery charges (today the book price is the full amount the customer pays)
- Editing other site sections (hero text, about, shelves) from the admin panel
- Shopping bag with several books in one payment
