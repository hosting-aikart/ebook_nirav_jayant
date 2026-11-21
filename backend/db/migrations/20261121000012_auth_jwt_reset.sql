-- Stronger customer sign-in: JWT sessions that can be revoked, and password reset by email.

-- Bumped on password reset: every JWT issued before that stops working.
alter table public.accounts add column if not exists token_version integer not null default 0;

-- Server-generated secrets (e.g. the JWT signing key), so they never have to live in a file.
create table if not exists public.app_secrets (
  name text primary key,
  value text not null,
  created_at timestamptz not null default now()
);

-- One row per "Forgot password?" email. Only a hash of the link's token is stored.
create table if not exists public.password_resets (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references public.accounts (id) on delete cascade,
  token_hash text not null unique,
  expires_at timestamptz not null,
  used_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists password_resets_account_idx on public.password_resets (account_id, created_at desc);
