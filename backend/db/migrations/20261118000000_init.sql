-- ============================================================
-- Still eBook Store — core schema
-- Tables: books, customers, orders
-- Only the backend server connects to the database, so there are no
-- row-level security rules; the server checks admin access itself.
-- ============================================================

-- ---------- Books ----------
create table public.books (
  id text primary key,                         -- slug, e.g. "zenful-stories"
  title text not null,
  subtitle text not null default '',
  eyebrow text not null default '',
  author text not null default 'Sw. Nirav Jayant',
  price integer not null check (price >= 0),   -- in rupees
  description text not null default '',
  quote text not null default '',
  cover text,                                  -- public URL or /books/... path
  cover_class text not null default '',
  category text not null check (category in ('kids', 'meditation', 'abundance')),
  pages jsonb not null default '[]'::jsonb,    -- [[heading, text], ...] preview pages
  pdf_path text,                               -- path inside the private "ebooks" bucket
  is_active boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger books_touch before update on public.books
for each row execute function public.touch_updated_at();

-- ---------- Customers ----------
create table public.customers (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  email text not null unique,
  phone text,
  created_at timestamptz not null default now()
);

-- ---------- Orders ----------
create table public.orders (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references public.customers (id),
  book_id text not null references public.books (id) on delete restrict,
  book_title text not null,                    -- snapshot at purchase time
  amount integer not null,                     -- in rupees
  currency text not null default 'INR',
  status text not null default 'pending' check (status in ('pending', 'paid', 'failed')),
  razorpay_order_id text unique,
  razorpay_payment_id text,
  created_at timestamptz not null default now(),
  paid_at timestamptz
);

create index orders_status_idx on public.orders (status, created_at desc);
