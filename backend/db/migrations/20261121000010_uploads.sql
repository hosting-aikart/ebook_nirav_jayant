-- Cover and preview images uploaded from Admin → Books.
-- Kept in the database (served at /api/uploads/<id>), so the site needs no separate file storage.
create table if not exists public.uploads (
  id uuid primary key default gen_random_uuid(),
  content_type text not null,
  data bytea not null,
  created_at timestamptz not null default now()
);
