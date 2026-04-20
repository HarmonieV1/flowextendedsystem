import { FEE_RECIPIENT, FEE_BPS, ONEINCH_BASE, DEFAULT_SLIPPAGE_BPS } from './config'

// Token addresses par chain
const NATIVE_TOKEN = '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE'

export const COMMON_TOKENS = {
  1: { // Ethereum
    ETH:  { address: NATIVE_TOKEN,                                     decimals: 18, symbol: 'ETH'  },
    WETH: { address: '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2', decimals: 18, symbol: 'WETH' },
    USDT: { address: '0xdAC17F958D2ee523a2206206994597C13D831ec7', decimals: 6,  symbol: 'USDT' },
    USDC: { address: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48', decimals: 6,  symbol: 'USDC' },
    DAI:  { address: '0x6B175474E89094C44Da98b954EedeAC495271d0F', decimals: 18, symbol: 'DAI'  },
    WBTC: { address: '0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599', decimals: 8,  symbol: 'WBTC' },
    LINK: { address: '0x514910771AF9Ca656af840dff83E8264EcF986CA', decimals: 18, symbol: 'LINK' },
    UNI:  { address: '0x1f9840a85d5aF5bf1D1762F925BDADdC4201F984', decimals: 18, symbol: 'UNI'  },
    ARB:  { address: '0xB50721BCf8d664c30412Cfbc6cf7a15145234ad1', decimals: 18, symbol: 'ARB'  },
  },
  8453: { // Base
    ETH:  { address: NATIVE_TOKEN,                                     decimals: 18, symbol: 'ETH'  },
    USDC: { address: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913', decimals: 6,  symbol: 'USDC' },
    WETH: { address: '0x4200000000000000000000000000000000000006', decimals: 18, symbol: 'WETH' },
    DAI:  { address: '0x50c5725949A6F0c72E6C4a641F24049A917DB0Cb', decimals: 18, symbol: 'DAI'  },
  },
  42161: { // Arbitrum
    ETH:  { address: NATIVE_TOKEN,                                     decimals: 18, symbol: 'ETH'  },
    USDT: { address: '0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9', decimals: 6,  symbol: 'USDT' },
    USDC: { address: '0xaf88d065e77c8cC2239327C5EDb3A432268e5831', decimals: 6,  symbol: 'USDC' },
    WBTC: { address: '0x2f2a2543B76A4166549F7aaB2e75Bef0aefC5B0f', decimals: 8,  symbol: 'WBTC' },
    ARB:  { address: '0x912CE59144191C1204E64559FE8253a0e49E6548', decimals: 18, symbol: 'ARB'  },
  },
}

// ── GET QUOTE from 1inch ──
export async function getSwapQuote({ chainId, fromToken, toToken, amount, slippageBps = DEFAULT_SLIPPAGE_BPS }) {
  const apiKey = import.meta.env.VITE_ONEINCH_API_KEY
  if (!apiKey) throw new Error('1inch API key missing — add VITE_ONEINCH_API_KEY to .env.local')

  const params = new URLSearchParams({
    src: fromToken,
    dst: toToken,
    amount: amount.toString(),
    includeProtocols: 'true',
    includeGas: 'true',
  })

  const res = await fetch(`${ONEINCH_BASE}/${chainId}/quote?${params}`, {
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Accept': 'application/json',
    },
  })

  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.description || `1inch quote failed: ${res.status}`)
  }

  return res.json()
}

// ── BUILD SWAP TRANSACTION ──
// Returns the tx data to sign + send via wagmi/viem
export async function buildSwapTx({ chainId, fromToken, toToken, amount, fromAddress, slippageBps = DEFAULT_SLIPPAGE_BPS }) {
  const apiKey = import.meta.env.VITE_ONEINCH_API_KEY
  if (!apiKey) throw new Error('1inch API key missing')

  if (!FEE_RECIPIENT || FEE_RECIPIENT === '0x0000000000000000000000000000000000000000') {
    console.warn('FXS: No fee recipient configured — swaps will not generate revenue')
  }

  const params = new URLSearchParams({
    src: fromToken,
    dst: toToken,
    amount: amount.toString(),
    from: fromAddress,
    slippage: (slippageBps / 100).toString(), // 1inch uses % not bps
    // Revenue: FXS takes FEE_BPS basis points on every swap
    ...(FEE_RECIPIENT && FEE_RECIPIENT !== '0x0000000000000000000000000000000000000000' ? {
      fee: FEE_BPS.toString(),               // basis points
      referrerAddress: FEE_RECIPIENT,         // your wallet receives this
    } : {}),
    disableEstimate: 'false',
    allowPartialFill: 'false',
  })

  const res = await fetch(`${ONEINCH_BASE}/${chainId}/swap?${params}`, {
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Accept': 'application/json',
    },
  })

  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.description || `1inch swap failed: ${res.status}`)
  }

  const data = await res.json()
  return {
    to: data.tx.to,
    data: data.tx.data,
    value: BigInt(data.tx.value || '0'),
    gas: BigInt(data.tx.gas || '200000'),
    dstAmount: data.dstAmount,
    protocols: data.protocols,
  }
}

// ── CHECK & BUILD APPROVAL TX ──
// ERC-20 tokens need approval before 1inch can spend them
export async function checkNeedsApproval({ chainId, tokenAddress, ownerAddress, amount }) {
  const apiKey = import.meta.env.VITE_ONEINCH_API_KEY
  const params = new URLSearchParams({ tokenAddress, walletAddress: ownerAddress })
  const res = await fetch(`${ONEINCH_BASE}/${chainId}/approve/allowance?${params}`, {
    headers: { 'Authorization': `Bearer ${apiKey}` },
  })
  const data = await res.json()
  return BigInt(data.allowance || '0') < BigInt(amount)
}

export async function buildApprovalTx({ chainId, tokenAddress, amount }) {
  const apiKey = import.meta.env.VITE_ONEINCH_API_KEY
  const params = new URLSearchParams({ tokenAddress, amount: amount.toString() })
  const res = await fetch(`${ONEINCH_BASE}/${chainId}/approve/transaction?${params}`, {
    headers: { 'Authorization': `Bearer ${apiKey}` },
  })
  return res.json()
}

// ── HELPER: amount in wei ──
export function toWei(amount, decimals) {
  return BigInt(Math.round(parseFloat(amount) * 10 ** decimals)).toString()
}

export function fromWei(amount, decimals) {
  return (Number(amount) / 10 ** decimals).toFixed(decimals > 6 ? 6 : decimals)
}
