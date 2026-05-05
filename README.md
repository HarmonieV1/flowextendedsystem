# FXS Exchange — Flow Extended System

Trading platform no-KYC, non-custodial, multi-source. Built by Alpha_PRC.

## Stack
- **Frontend** — React + Vite, CSS Modules, Zustand
- **Data** — Binance WebSocket + Bybit + OKX live comparator
- **Wallet** — wagmi + RainbowKit + SIWE (no password, no email, no KYC)
- **Backend** — Supabase (watchlist, trade history, alerts)
- **Deploy** — Netlify (auto-deploy on push to main)

## Local Setup
```bash
git clone https://github.com/YOUR_USERNAME/fxs-exchange
cd fxs-exchange
npm install
cp .env.local.example .env.local
# Fill in VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY, VITE_WALLETCONNECT_PROJECT_ID
npm run dev
```

## Supabase Setup
1. Create project at supabase.com
2. SQL Editor → New Query → paste + run `supabase-schema.sql`

## Netlify Deploy
```bash
# Push to GitHub → Netlify → Import from GitHub
# Build: npm run build | Publish: dist
# Add env vars in Netlify site settings
```

## Roadmap
- Phase 1 (current): Aggregator — best prices, no custody, no KYC
- Phase 2: Proprietary DEX — off-chain orderbook, on-chain settlement on Base/Arbitrum  
- Phase 3: Full no-KYC CEX — matching engine, perps, external audit
