-- Books are now printed copies delivered to the customer (not e-books).
-- Each order stores its own shipping address (a customer may ship to different places),
-- plus a delivery status the admin updates from Admin → Orders.

alter table public.customers
  add column if not exists address text,
  add column if not exists city text,
  add column if not exists state text,
  add column if not exists pincode text;

alter table public.orders
  add column if not exists ship_name text,
  add column if not exists ship_phone text,
  add column if not exists ship_address text,
  add column if not exists ship_city text,
  add column if not exists ship_state text,
  add column if not exists ship_pincode text,
  add column if not exists delivery_status text not null default 'to_ship'
    check (delivery_status in ('to_ship', 'shipped', 'delivered', 'cancelled')),
  add column if not exists tracking_info text,
  add column if not exists shipped_at timestamptz;

create index if not exists orders_delivery_idx on public.orders (delivery_status, created_at desc);
