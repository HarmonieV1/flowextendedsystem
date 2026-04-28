// ── 0x Swap API — proxy via fxsedge-proxy.netlify.app ────────────────────────
// Site dédié avec Netlify Functions déployées proprement
// Revenue: 0.5% collecté automatiquement on-chain à chaque swap

const PROXY = 'https://fxsedge-proxy.netlify.app/swap'

export const FEE_RECIPIENT = '0x12B31352569DDC3a6D4254bc7e22fCB2B75F42b1'
export const FEE_BPS       = 50  // 0.5%
export const NATIVE_TOKEN  = '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE'

export const CHAINS = {
  1:     { name:'Ethereum', symbol:'ETH',   explorer:'https://etherscan.io' },
  42161: { name:'Arbitrum', symbol:'ETH',   explorer:'https://arbiscan.io' },
  8453:  { name:'Base',     symbol:'ETH',   explorer:'https://basescan.org' },
  137:   { name:'Polygon',  symbol:'MATIC', explorer:'https://polygonscan.com' },
}

export const POPULAR_TOKENS = {
  42161: [
    { symbol:'ETH',  address:NATIVE_TOKEN,                                   decimals:18 },
    { symbol:'USDC', address:'0xaf88d065e77c8cC2239327C5EDb3A432268e5831', decimals:6  },
    { symbol:'USDT', address:'0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9', decimals:6  },
    { symbol:'WBTC', address:'0x2f2a2543B76A4166549F7aaB2e75Bef0aefC5B0f', decimals:8  },
    { symbol:'ARB',  address:'0x912CE59144191C1204E64559FE8253a0e49E6548', decimals:18 },
    { symbol:'LINK', address:'0xf97f4df75117a78c1A5a0DBb814Af92458539FB4', decimals:18 },
  ],
  1: [
    { symbol:'ETH',  address:NATIVE_TOKEN,                                   decimals:18 },
    { symbol:'USDC', address:'0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48', decimals:6  },
    { symbol:'USDT', address:'0xdAC17F958D2ee523a2206206994597C13D831ec7', decimals:6  },
    { symbol:'WBTC', address:'0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599', decimals:8  },
  ],
  8453: [
    { symbol:'ETH',  address:NATIVE_TOKEN,                                   decimals:18 },
    { symbol:'USDC', address:'0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913', decimals:6  },
  ],
  137: [
    { symbol:'MATIC', address:NATIVE_TOKEN,                                  decimals:18 },
    { symbol:'USDC',  address:'0x2791Bca1f2de4661ED88A30C99A7a9449Aa84173', decimals:6  },
    { symbol:'USDT',  address:'0xc2132D05D31c914a87C6611C10748AEb04B58e8F', decimals:6  },
  ],
}

async function call0x(type, params) {
  const qs = new URLSearchParams({ ...params, _type: type }).toString()
  const r  = await fetch(`${PROXY}?${qs}`, { signal: AbortSignal.timeout(12000) })
  const data = await r.json()
  if (!r.ok) throw new Error(data.reason || data.validationErrors?.[0]?.reason || data.message || `Erreur ${r.status}`)
  return data
}

export async function getPrice({ chainId, sellToken, buyToken, sellAmount, taker }) {
  return call0x('price', {
    chainId: String(chainId), sellToken, buyToken,
    sellAmount: String(sellAmount),
    swapFeeRecipient: FEE_RECIPIENT,
    swapFeeBps:       String(FEE_BPS),
    swapFeeToken:     buyToken,
    ...(taker ? { taker } : {}),
  })
}

export async function getQuote({ chainId, sellToken, buyToken, sellAmount, taker, slippageBps = 50 }) {
  if (!taker) throw new Error('Wallet non connecté')
  return call0x('quote', {
    chainId: String(chainId), sellToken, buyToken,
    sellAmount: String(sellAmount), taker,
    slippageBps: String(slippageBps),
    swapFeeRecipient: FEE_RECIPIENT,
    swapFeeBps:       String(FEE_BPS),
    swapFeeToken:     buyToken,
  })
}

export function fmtTokenAmount(raw, decimals) {
  if (!raw) return '0'
  const n = Number(BigInt(raw)) / 10 ** decimals
  if (n < 0.0001) return n.toExponential(2)
  if (n < 1)      return n.toFixed(6)
  if (n < 1000)   return n.toFixed(4)
  return n.toLocaleString('fr-FR', { maximumFractionDigits: 2 })
}

export function toBaseUnits(amount, decimals) {
  if (!amount || isNaN(+amount)) return 0n
  const [int = '0', frac = ''] = String(amount).split('.')
  const pad = frac.padEnd(decimals, '0').slice(0, decimals)
  return BigInt(int) * BigInt(10 ** decimals) + BigInt(pad || 0)
}
