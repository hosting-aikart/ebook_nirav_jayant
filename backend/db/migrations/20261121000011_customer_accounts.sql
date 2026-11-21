-- Customer accounts: sign up / sign in on the website to see "My orders".
-- Orders placed while signed in are linked to the account (orders.account_id).
-- Guest checkout still works; those orders simply have no account.

create table if not exists public.accounts (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  email text not null unique,          -- stored lowercase
  password_hash text not null,         -- scrypt, never the password itself
  created_at timestamptz not null default now(),
  last_login_at timestamptz
);

alter table public.orders
  add column if not exists account_id uuid references public.accounts (id) on delete set null;

create index if not exists orders_account_idx on public.orders (account_id, created_at desc);
