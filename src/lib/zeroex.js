import { FEE_RECIPIENT, FEE_BPS, DEFAULT_SLIPPAGE_BPS } from './config'

// 0x Protocol — zero API key required for basic usage
// Docs: https://docs.0x.org/0x-swap-api/api-references
const OX_BASE = 'https://api.0x.org/swap/v1'

export const NATIVE_TOKEN = '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE'

export const COMMON_TOKENS = {
  1: {
    ETH:  { address: NATIVE_TOKEN,                                     decimals: 18, symbol: 'ETH',  name: 'Ethereum' },
    WETH: { address: '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2', decimals: 18, symbol: 'WETH', name: 'Wrapped ETH' },
    USDT: { address: '0xdAC17F958D2ee523a2206206994597C13D831ec7', decimals: 6,  symbol: 'USDT', name: 'Tether' },
    USDC: { address: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48', decimals: 6,  symbol: 'USDC', name: 'USD Coin' },
    DAI:  { address: '0x6B175474E89094C44Da98b954EedeAC495271d0F', decimals: 18, symbol: 'DAI',  name: 'Dai' },
    WBTC: { address: '0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599', decimals: 8,  symbol: 'WBTC', name: 'Wrapped BTC' },
    LINK: { address: '0x514910771AF9Ca656af840dff83E8264EcF986CA', decimals: 18, symbol: 'LINK', name: 'Chainlink' },
    UNI:  { address: '0x1f9840a85d5aF5bf1D1762F925BDADdC4201F984', decimals: 18, symbol: 'UNI',  name: 'Uniswap' },
    ARB:  { address: '0xB50721BCf8d664c30412Cfbc6cf7a15145234ad1', decimals: 18, symbol: 'ARB',  name: 'Arbitrum' },
  },
  8453: {
    ETH:  { address: NATIVE_TOKEN,                                     decimals: 18, symbol: 'ETH',  name: 'Ethereum' },
    USDC: { address: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913', decimals: 6,  symbol: 'USDC', name: 'USD Coin' },
    WETH: { address: '0x4200000000000000000000000000000000000006', decimals: 18, symbol: 'WETH', name: 'Wrapped ETH' },
    DAI:  { address: '0x50c5725949A6F0c72E6C4a641F24049A917DB0Cb', decimals: 18, symbol: 'DAI',  name: 'Dai' },
  },
  42161: {
    ETH:  { address: NATIVE_TOKEN,                                     decimals: 18, symbol: 'ETH',  name: 'Ethereum' },
    USDT: { address: '0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9', decimals: 6,  symbol: 'USDT', name: 'Tether' },
    USDC: { address: '0xaf88d065e77c8cC2239327C5EDb3A432268e5831', decimals: 6,  symbol: 'USDC', name: 'USD Coin' },
    WBTC: { address: '0x2f2a2543B76A4166549F7aaB2e75Bef0aefC5B0f', decimals: 8,  symbol: 'WBTC', name: 'Wrapped BTC' },
    ARB:  { address: '0x912CE59144191C1204E64559FE8253a0e49E6548', decimals: 18, symbol: 'ARB',  name: 'Arbitrum' },
  },
}

// ── GET QUOTE — 0x Protocol, no API key needed ──
export async function getSwapQuote({ chainId, sellToken, buyToken, sellAmount, slippageBps = DEFAULT_SLIPPAGE_BPS }) {
  const params = new URLSearchParams({
    sellToken,
    buyToken,
    sellAmount: sellAmount.toString(),
    slippagePercentage: (slippageBps / 10000).toString(),
    // Fee recipient — 0x sends this % to your wallet automatically
    ...(FEE_RECIPIENT && FEE_RECIPIENT !== '0x0000000000000000000000000000000000000000' ? {
      feeRecipient: FEE_RECIPIENT,
      buyTokenPercentageFee: (FEE_BPS / 10000).toString(), // e.g. 0.0005 = 0.05%
    } : {}),
  })

  // 0x uses different base URLs per chain
  const base = chainId === 8453
    ? 'https://base.api.0x.org/swap/v1'
    : chainId === 42161
      ? 'https://arbitrum.api.0x.org/swap/v1'
      : OX_BASE

  const res = await fetch(`${base}/quote?${params}`, {
    headers: { 'Content-Type': 'application/json' },
  })

  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.reason || err.validationErrors?.[0]?.reason || `Quote failed (${res.status})`)
  }

  return res.json()
}

// ── PRICE ONLY (lighter, no tx data) ──
export async function getSwapPrice({ chainId, sellToken, buyToken, sellAmount }) {
  const base = chainId === 8453
    ? 'https://base.api.0x.org/swap/v1'
    : chainId === 42161
      ? 'https://arbitrum.api.0x.org/swap/v1'
      : OX_BASE

  const params = new URLSearchParams({ sellToken, buyToken, sellAmount: sellAmount.toString() })
  const res = await fetch(`${base}/price?${params}`)
  if (!res.ok) throw new Error(`Price fetch failed (${res.status})`)
  return res.json()
}

// ── HELPERS ──
export function toWei(amount, decimals) {
  const n = parseFloat(amount)
  if (isNaN(n) || n <= 0) return '0'
  return BigInt(Math.round(n * 10 ** decimals)).toString()
}

export function fromWei(amount, decimals) {
  const n = Number(amount)
  if (!n) return '0'
  return (n / 10 ** decimals).toFixed(Math.min(decimals, 6))
}
