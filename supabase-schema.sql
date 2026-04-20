-- ============================================================
-- FXS Exchange — Supabase Schema
-- Run this in: Supabase Dashboard → SQL Editor → New Query
-- ============================================================

-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- ============================================================
-- SIWE Sessions — auth no-KYC
-- ============================================================
create table if not exists siwe_sessions (
  id          uuid primary key default uuid_generate_v4(),
  address     text not null,          -- 0x wallet address
  chain_id    int  not null default 1,
  nonce       text not null,
  issued_at   timestamptz not null,
  signature   text not null,
  created_at  timestamptz not null default now(),
  
  constraint siwe_sessions_address_nonce_unique unique (address, nonce)
);

-- Index for fast lookups by wallet address
create index if not exists siwe_sessions_address_idx on siwe_sessions(address);

-- ============================================================
-- Watchlist — user's tracked pairs
-- ============================================================
create table if not exists watchlist (
  id          uuid primary key default uuid_generate_v4(),
  user_id     text not null,          -- wallet address (from SIWE)
  pair        text not null,          -- e.g. 'BTCUSDT'
  position    int  not null default 0, -- display order
  created_at  timestamptz not null default now(),
  
  constraint watchlist_user_pair_unique unique (user_id, pair)
);

create index if not exists watchlist_user_idx on watchlist(user_id);

-- Default watchlist for new users (applied in app, not DB)
-- ['BTCUSDT', 'ETHUSDT', 'SOLUSDT']

-- ============================================================
-- Trade History — simulated trades (Phase 1)
-- Phase 2+: replace with on-chain settlement records
-- ============================================================
create table if not exists trade_history (
  id          uuid primary key default uuid_generate_v4(),
  user_id     text not null,
  pair        text not null,
  side        text not null check (side in ('buy', 'sell')),
  type        text not null check (type in ('market', 'limit', 'stop')),
  amount      numeric(28, 8) not null,
  price       numeric(28, 8) not null,
  fee         numeric(28, 8) not null default 0,
  cost        numeric(28, 8) not null,
  status      text not null default 'filled' check (status in ('pending', 'filled', 'cancelled', 'failed')),
  tx_hash     text,                   -- on-chain tx hash (Phase 2+)
  chain_id    int,                    -- which chain
  created_at  timestamptz not null default now()
);

create index if not exists trade_history_user_idx on trade_history(user_id);
create index if not exists trade_history_created_idx on trade_history(created_at desc);

-- ============================================================
-- Price Alerts — notify when pair hits a level
-- ============================================================
create table if not exists price_alerts (
  id          uuid primary key default uuid_generate_v4(),
  user_id     text not null,
  pair        text not null,
  condition   text not null check (condition in ('above', 'below')),
  target      numeric(28, 8) not null,
  triggered   boolean not null default false,
  triggered_at timestamptz,
  created_at  timestamptz not null default now()
);

create index if not exists alerts_user_active_idx on price_alerts(user_id, triggered);

-- ============================================================
-- Row Level Security — users can only see their own data
-- ============================================================

-- Enable RLS on all tables
alter table siwe_sessions  enable row level security;
alter table watchlist      enable row level security;
alter table trade_history  enable row level security;
alter table price_alerts   enable row level security;

-- Policies: user_id must match the wallet address passed in the request
-- In Phase 1, we trust the client to send the correct address.
-- In Phase 2, validate the SIWE signature server-side via Edge Function.

create policy "Users see own siwe sessions"
  on siwe_sessions for all
  using (address = current_setting('app.wallet_address', true));

create policy "Users manage own watchlist"
  on watchlist for all
  using (user_id = current_setting('app.wallet_address', true));

create policy "Users see own trades"
  on trade_history for all
  using (user_id = current_setting('app.wallet_address', true));

create policy "Users manage own alerts"
  on price_alerts for all
  using (user_id = current_setting('app.wallet_address', true));

-- ============================================================
-- Useful views
-- ============================================================

-- PnL summary per user per pair
create or replace view trade_pnl as
select
  user_id,
  pair,
  count(*) filter (where side = 'buy')  as buy_count,
  count(*) filter (where side = 'sell') as sell_count,
  sum(cost) filter (where side = 'buy')  as total_bought,
  sum(cost) filter (where side = 'sell') as total_sold,
  sum(fee) as total_fees,
  max(created_at) as last_trade_at
from trade_history
where status = 'filled'
group by user_id, pair;

-- ============================================================
-- Done. Tables created:
--   siwe_sessions, watchlist, trade_history, price_alerts
-- View created:
--   trade_pnl
-- ============================================================
