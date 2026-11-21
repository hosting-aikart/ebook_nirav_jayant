-- Several books in one payment (the shopping bag).
-- Each order now has line items. orders.book_title keeps a readable summary
-- ("Playing with Breath × 2, Moneytuition") so the admin lists and CSVs keep working.

create table if not exists public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders (id) on delete cascade,
  -- restrict: a book that has been ordered can't be deleted (use "Hide" instead)
  book_id text not null references public.books (id) on delete restrict,
  title text not null,                                   -- snapshot at purchase time
  unit_price integer not null check (unit_price >= 0),   -- in rupees
  quantity integer not null check (quantity between 1 and 10),
  position integer not null default 0,                   -- order in the customer's bag
  created_at timestamptz not null default now(),
  unique (order_id, book_id)
);

create index if not exists order_items_order_idx on public.order_items (order_id);
create index if not exists order_items_book_idx on public.order_items (book_id);

-- Multi-book orders have no single book. book_id is only set when the order has one title.
alter table public.orders alter column book_id drop not null;

-- Why the last payment attempt failed (from Razorpay), shown in Admin → Orders.
alter table public.orders add column if not exists payment_error text;

-- Older single-book orders get one line item each, so every order reads the same way.
insert into public.order_items (order_id, book_id, title, unit_price, quantity)
select o.id, o.book_id, o.book_title, o.amount, 1
from public.orders o
where o.book_id is not null
  and not exists (select 1 from public.order_items i where i.order_id = o.id);
