// ── 0x Swap API v2 ────────────────────────────────────────────────────────────
// Docs: https://0x.org/docs/0x-swap-api
// Flow: getPrice (indicatif) → getQuote (ferme + tx) → sendTx (wallet)
//
// Revenue: swapFeeRecipient + swapFeeBps embarqués dans chaque quote
// La fee est prélevée automatiquement on-chain au moment du swap
// ─────────────────────────────────────────────────────────────────────────────

const API_BASE = 'https://api.0x.org'

// ← clé API gratuite sur https://dashboard.0x.org
// sans clé : 10 req/min, avec clé gratuite : 100 req/min
export const ZX_API_KEY = import.meta.env.VITE_0X_API_KEY || ''

// ← wallet FXSEDGE qui reçoit les fees automatiquement on-chain
export const FEE_RECIPIENT = import.meta.env.VITE_FEE_RECIPIENT
  || '0x12B31352569DDC3a6D4254bc7e22fCB2B75F42b1'

// 0.5% de fee FXSEDGE sur chaque swap (50 bps)
// Augmentable jusqu'à 1% (100 bps) selon compétitivité
export const FEE_BPS = 50

// Chains supportées par 0x
export const CHAINS = {
  1:     { name:'Ethereum', symbol:'ETH',  rpc:'https://eth.llamarpc.com' },
  42161: { name:'Arbitrum', symbol:'ETH',  rpc:'https://arb1.arbitrum.io/rpc' },
  8453:  { name:'Base',     symbol:'ETH',  rpc:'https://mainnet.base.org' },
  137:   { name:'Polygon',  symbol:'MATIC', rpc:'https://polygon-rpc.com' },
  10:    { name:'Optimism', symbol:'ETH',  rpc:'https://mainnet.optimism.io' },
  56:    { name:'BNB',      symbol:'BNB',  rpc:'https://bsc-dataseed.binance.org' },
}

// Token natif (ETH, MATIC, BNB…)
export const NATIVE_TOKEN = '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE'

// Tokens populaires par chain
export const POPULAR_TOKENS = {
  42161: [ // Arbitrum
    { symbol:'ETH',  address:NATIVE_TOKEN,                                   decimals:18, logoURI:'https://assets.coingecko.com/coins/images/279/small/ethereum.png' },
    { symbol:'USDC', address:'0xaf88d065e77c8cC2239327C5EDb3A432268e5831', decimals:6,  logoURI:'https://assets.coingecko.com/coins/images/6319/small/usdc.png' },
    { symbol:'USDT', address:'0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9', decimals:6,  logoURI:'https://assets.coingecko.com/coins/images/325/small/Tether.png' },
    { symbol:'WBTC', address:'0x2f2a2543B76A4166549F7aaB2e75Bef0aefC5B0f', decimals:8,  logoURI:'https://assets.coingecko.com/coins/images/7598/small/wrapped_bitcoin_wbtc.png' },
    { symbol:'ARB',  address:'0x912CE59144191C1204E64559FE8253a0e49E6548', decimals:18, logoURI:'https://assets.coingecko.com/coins/images/16547/small/photo_2023-03-29_21.47.00.jpeg' },
    { symbol:'LINK', address:'0xf97f4df75117a78c1A5a0DBb814Af92458539FB4', decimals:18, logoURI:'https://assets.coingecko.com/coins/images/877/small/chainlink-new-logo.png' },
  ],
  1: [ // Ethereum
    { symbol:'ETH',  address:NATIVE_TOKEN,                                   decimals:18, logoURI:'https://assets.coingecko.com/coins/images/279/small/ethereum.png' },
    { symbol:'USDC', address:'0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48', decimals:6,  logoURI:'https://assets.coingecko.com/coins/images/6319/small/usdc.png' },
    { symbol:'USDT', address:'0xdAC17F958D2ee523a2206206994597C13D831ec7', decimals:6,  logoURI:'https://assets.coingecko.com/coins/images/325/small/Tether.png' },
    { symbol:'WBTC', address:'0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599', decimals:8,  logoURI:'https://assets.coingecko.com/coins/images/7598/small/wrapped_bitcoin_wbtc.png' },
  ],
  8453: [ // Base
    { symbol:'ETH',  address:NATIVE_TOKEN,                                   decimals:18, logoURI:'https://assets.coingecko.com/coins/images/279/small/ethereum.png' },
    { symbol:'USDC', address:'0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913', decimals:6,  logoURI:'https://assets.coingecko.com/coins/images/6319/small/usdc.png' },
  ],
}

function headers() {
  const h = {
    'Content-Type': 'application/json',
    '0x-version': 'v2',
  }
  if (ZX_API_KEY) h['0x-api-key'] = ZX_API_KEY
  return h
}

/**
 * Obtenir un prix indicatif (pas de tx, pour afficher le quote live)
 * Appelé à chaque changement de montant dans l'UI
 */
export async function getPrice({ chainId, sellToken, buyToken, sellAmount, taker }) {
  const params = new URLSearchParams({
    chainId: String(chainId),
    sellToken,
    buyToken,
    sellAmount: String(sellAmount),
    ...(taker ? { taker } : {}),
    // fees FXSEDGE embarquées dans chaque quote
    swapFeeRecipient: FEE_RECIPIENT,
    swapFeeBps: String(FEE_BPS),
    swapFeeToken: buyToken, // fee prélevée dans le token reçu
  })

  const r = await fetch(
    `${API_BASE}/swap/allowance-holder/price?${params}`,
    { headers: headers(), signal: AbortSignal.timeout(8000) }
  )
  if (!r.ok) {
    const err = await r.json().catch(() => ({}))
    throw new Error(err.reason || err.message || `HTTP ${r.status}`)
  }
  return r.json()
}

/**
 * Obtenir un quote ferme avec transaction prête à signer
 * Appelé uniquement au moment où l'user clique "Swap"
 */
export async function getQuote({ chainId, sellToken, buyToken, sellAmount, taker, slippageBps = 50 }) {
  if (!taker) throw new Error('Wallet non connecté')

  const params = new URLSearchParams({
    chainId:    String(chainId),
    sellToken,
    buyToken,
    sellAmount: String(sellAmount),
    taker,
    slippageBps: String(slippageBps),
    // fees FXSEDGE
    swapFeeRecipient: FEE_RECIPIENT,
    swapFeeBps:       String(FEE_BPS),
    swapFeeToken:     buyToken,
  })

  const r = await fetch(
    `${API_BASE}/swap/allowance-holder/quote?${params}`,
    { headers: headers(), signal: AbortSignal.timeout(10000) }
  )
  if (!r.ok) {
    const err = await r.json().catch(() => ({}))
    throw new Error(err.reason || err.message || `HTTP ${r.status}`)
  }
  return r.json()
}

/**
 * Formatter un montant token depuis bigint (unités de base) vers display
 */
export function fmtTokenAmount(raw, decimals) {
  if (!raw) return '0'
  const n = Number(BigInt(raw)) / Math.pow(10, decimals)
  if (n < 0.0001) return n.toExponential(2)
  if (n < 1)      return n.toFixed(6)
  if (n < 1000)   return n.toFixed(4)
  return n.toLocaleString('fr-FR', { maximumFractionDigits: 2 })
}

/**
 * Convertir un montant display vers bigint (unités de base)
 */
export function toBaseUnits(amount, decimals) {
  if (!amount || isNaN(amount)) return 0n
  const factor = BigInt(10 ** decimals)
  const [intPart, fracPart = ''] = String(amount).split('.')
  const frac = fracPart.padEnd(decimals, '0').slice(0, decimals)
  return BigInt(intPart) * factor + BigInt(frac)
}
