-- ============================================================
-- Still eBook Store — core schema
-- Tables: books, customers, orders, admins
-- Storage: covers (public), ebooks (private PDFs)
-- ============================================================

-- ---------- Admins ----------
create table public.admins (
  user_id uuid primary key references auth.users (id) on delete cascade,
  created_at timestamptz not null default now()
);

create or replace function public.is_admin()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (select 1 from public.admins where user_id = auth.uid());
$$;

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

-- ---------- Row Level Security ----------
alter table public.admins enable row level security;
alter table public.books enable row level security;
alter table public.customers enable row level security;
alter table public.orders enable row level security;

-- Admins can see the admin list (used to check "am I an admin?")
create policy "admins read self" on public.admins
  for select using (user_id = auth.uid());

-- Anyone can read active books; admins can read everything
create policy "public read active books" on public.books
  for select using (is_active or public.is_admin());
create policy "admins manage books" on public.books
  for all using (public.is_admin()) with check (public.is_admin());

-- Customers & orders: admins only. (Checkout writes them via Edge Functions
-- using the service-role key, which bypasses RLS.)
create policy "admins read customers" on public.customers
  for select using (public.is_admin());
create policy "admins manage orders" on public.orders
  for all using (public.is_admin()) with check (public.is_admin());

-- ---------- Storage ----------
insert into storage.buckets (id, name, public) values
  ('covers', 'covers', true),
  ('ebooks', 'ebooks', false)
on conflict (id) do nothing;

create policy "admins upload files" on storage.objects
  for insert with check (bucket_id in ('covers', 'ebooks') and public.is_admin());
create policy "admins update files" on storage.objects
  for update using (bucket_id in ('covers', 'ebooks') and public.is_admin());
create policy "admins delete files" on storage.objects
  for delete using (bucket_id in ('covers', 'ebooks') and public.is_admin());
create policy "admins read ebooks" on storage.objects
  for select using (bucket_id = 'ebooks' and public.is_admin());
