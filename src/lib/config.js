// ─────────────────────────────────────────────
// FXS Exchange — Platform Configuration
// ─────────────────────────────────────────────
// Source of truth for fee config. swap0x.js has its own copy
// for Paraswap integration (50 bps = 0.5%)

export const FEE_RECIPIENT = import.meta.env.VITE_FEE_RECIPIENT || '0x12B31352569DDC3a6D4254bc7e22fCB2B75F42b1'

// Commission prélevée sur chaque swap via Paraswap (0.5% = 50 basis points)
export const FEE_BPS = 50 // 50 / 10000 = 0.5%
export const FEE_RATIO = FEE_BPS / 10000 // pour l'affichage

// Chains supportées
export const SUPPORTED_CHAINS = {
  1:     { name: 'Ethereum',   rpc: 'https://eth.llamarpc.com' },
  8453:  { name: 'Base',       rpc: 'https://mainnet.base.org' },
  42161: { name: 'Arbitrum',   rpc: 'https://arb1.arbitrum.io/rpc' },
  137:   { name: 'Polygon',    rpc: 'https://polygon-rpc.com' },
  56:    { name: 'BNB Chain',  rpc: 'https://bsc-dataseed.binance.org' },
}

// Slippage par défaut (0.5%)
export const DEFAULT_SLIPPAGE_BPS = 50

