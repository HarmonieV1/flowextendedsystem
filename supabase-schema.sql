-- ============================================================
-- FXS Exchange — Supabase Schema (V2.5.2 — Phase 2 hardened)
-- Run this in: Supabase Dashboard → SQL Editor → New Query
-- ============================================================
--
-- Security model:
-- - Auth: Supabase Auth (email + password, optionally magic link)
-- - Authorization: Row Level Security policies based on auth.uid()
-- - All tables enforce: a user can only read/write their own rows
-- - The anon key in the client is RLS-restricted (cannot bypass policies)
--
-- ============================================================

create extension if not exists "uuid-ossp";

-- ============================================================
-- profiles — extends auth.users with FXSEDGE-specific fields
-- Created automatically when a user signs up (trigger below)
-- ============================================================
create table if not exists public.profiles (
  id              uuid primary key references auth.users(id) on delete cascade,
  email           text,
  tier            text not null default 'free' check (tier in ('free', 'pro', 'admin')),
  trial_ends_at   timestamptz,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

-- Auto-create profile on signup with 30-day Pro trial
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email, tier, trial_ends_at)
  values (new.id, new.email, 'free', now() + interval '30 days');
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ============================================================
-- watchlist — user's tracked pairs
-- ============================================================
create table if not exists public.watchlist (
  id          uuid primary key default uuid_generate_v4(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  pair        text not null,
  position    int  not null default 0,
  created_at  timestamptz not null default now(),
  constraint watchlist_user_pair_unique unique (user_id, pair)
);
create index if not exists watchlist_user_idx on public.watchlist(user_id);

-- ============================================================
-- trade_history — phase 1 simulated trades; phase 2+ on-chain
-- ============================================================
create table if not exists public.trade_history (
  id          uuid primary key default uuid_generate_v4(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  pair        text not null,
  side        text not null check (side in ('buy', 'sell')),
  type        text not null check (type in ('market', 'limit', 'stop')),
  amount      numeric(28, 8) not null,
  price       numeric(28, 8) not null,
  fee         numeric(28, 8) not null default 0,
  cost        numeric(28, 8) not null,
  status      text not null default 'filled' check (status in ('pending','filled','cancelled','failed')),
  tx_hash     text,
  chain_id    int,
  created_at  timestamptz not null default now()
);
create index if not exists trade_history_user_idx on public.trade_history(user_id);
create index if not exists trade_history_created_idx on public.trade_history(created_at desc);

-- ============================================================
-- price_alerts — alert when pair hits a level
-- ============================================================
create table if not exists public.price_alerts (
  id            uuid primary key default uuid_generate_v4(),
  user_id       uuid not null references auth.users(id) on delete cascade,
  pair          text not null,
  condition     text not null check (condition in ('above', 'below')),
  target        numeric(28, 8) not null,
  triggered     boolean not null default false,
  triggered_at  timestamptz,
  created_at    timestamptz not null default now()
);
create index if not exists alerts_user_active_idx on public.price_alerts(user_id, triggered);

-- ============================================================
-- user_settings — preferences (theme, language, layout)
-- ============================================================
create table if not exists public.user_settings (
  user_id     uuid primary key references auth.users(id) on delete cascade,
  theme       text default 'dark',
  language    text default 'fr',
  preferences jsonb default '{}',
  updated_at  timestamptz not null default now()
);

-- ============================================================
-- api_keys — encrypted API credentials (currently stored client-side
-- in IndexedDB with AES-GCM; this table reserved for Phase 2 sync)
-- ============================================================
create table if not exists public.api_keys (
  id              uuid primary key default uuid_generate_v4(),
  user_id         uuid not null references auth.users(id) on delete cascade,
  exchange        text not null check (exchange in ('bitunix', 'bitget')),
  encrypted_key   text not null,
  encrypted_secret text not null,
  encrypted_passphrase text,
  created_at      timestamptz not null default now(),
  unique (user_id, exchange)
);

-- ============================================================
-- error_logs — server-side monitoring
-- ============================================================
create table if not exists public.error_logs (
  id          uuid primary key default uuid_generate_v4(),
  message     text not null,
  context     text,
  url         text,
  user_agent  text,
  user_id     uuid references auth.users(id) on delete set null,
  created_at  timestamptz not null default now()
);
create index if not exists error_logs_created_idx on public.error_logs(created_at desc);

-- ============================================================
-- ROW LEVEL SECURITY — based on auth.uid() (cryptographically validated)
-- ============================================================

alter table public.profiles      enable row level security;
alter table public.watchlist     enable row level security;
alter table public.trade_history enable row level security;
alter table public.price_alerts  enable row level security;
alter table public.user_settings enable row level security;
alter table public.api_keys      enable row level security;
alter table public.error_logs    enable row level security;

-- profiles: users can read their own profile
drop policy if exists "Users see own profile" on public.profiles;
create policy "Users see own profile" on public.profiles
  for select using (id = auth.uid());

-- profiles: users CANNOT update tier or trial_ends_at directly.
-- These fields are managed server-side (admin/billing functions only).
-- If you want to allow users to update other fields (display_name, avatar, etc.),
-- add those columns and use a column-level UPDATE policy or a SECURITY DEFINER function.
-- Example function for updating allowed fields:
--   create or replace function public.update_profile_safe(p_email text)
--   returns void security definer as $$
--   begin
--     update public.profiles set email = p_email where id = auth.uid();
--   end;
--   $$ language plpgsql;
-- For now, no UPDATE policy on profiles → users cannot self-promote to 'pro'.

-- watchlist: users manage only their own
drop policy if exists "Users manage own watchlist" on public.watchlist;
create policy "Users manage own watchlist" on public.watchlist
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

-- trade_history: users see only their own
drop policy if exists "Users see own trades" on public.trade_history;
create policy "Users see own trades" on public.trade_history
  for select using (user_id = auth.uid());

drop policy if exists "Users insert own trades" on public.trade_history;
create policy "Users insert own trades" on public.trade_history
  for insert with check (user_id = auth.uid());

-- price_alerts: users manage only their own
drop policy if exists "Users manage own alerts" on public.price_alerts;
create policy "Users manage own alerts" on public.price_alerts
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

-- user_settings: users manage only their own
drop policy if exists "Users manage own settings" on public.user_settings;
create policy "Users manage own settings" on public.user_settings
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

-- api_keys: users manage only their own (Phase 2)
drop policy if exists "Users manage own keys" on public.api_keys;
create policy "Users manage own keys" on public.api_keys
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

-- error_logs:
--   - Anyone (anon + authenticated) can INSERT (reporting errors)
--   - Only service_role can SELECT (admin dashboard server-side only)
drop policy if exists "Anyone insert errors" on public.error_logs;
create policy "Anyone insert errors" on public.error_logs
  for insert to anon, authenticated with check (true);

drop policy if exists "Service role read errors" on public.error_logs;
create policy "Service role read errors" on public.error_logs
  for select to service_role using (true);

-- ============================================================
-- Useful views (PnL aggregation)
-- ============================================================
create or replace view public.trade_pnl as
select
  user_id,
  pair,
  count(*) filter (where side = 'buy')   as buy_count,
  count(*) filter (where side = 'sell')  as sell_count,
  sum(cost) filter (where side = 'buy')  as total_bought,
  sum(cost) filter (where side = 'sell') as total_sold,
  sum(fee) as total_fees,
  max(created_at) as last_trade_at
from public.trade_history
where status = 'filled'
group by user_id, pair;

-- ============================================================
-- MIGRATION NOTES (if you previously ran the v1 schema):
-- ============================================================
-- The previous schema used user_id of type TEXT (wallet address).
-- This new schema uses UUID linked to auth.users(id).
--
-- If you have existing data with text user_id, run these in order:
--   1. Backup: pg_dump or export to CSV via dashboard
--   2. Drop old tables: drop table watchlist, trade_history, price_alerts cascade;
--   3. Re-run this whole file
-- The siwe_sessions table from v1 is no longer needed (replaced by Supabase Auth).
-- ============================================================
