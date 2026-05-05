// FXSEDGE — Solana via Jupiter Aggregator
// Lightweight integration: Phantom wallet detection + Jupiter API
// No @solana/web3.js dependency to keep bundle small

const JUPITER_API = 'https://quote-api.jup.ag/v6'

export const FXS_FEE_BPS = 50 // 0.5% — same as Paraswap
export const FXS_FEE_RECIPIENT_SOL = 'EUgnQVbJaA7Zj5cwbJLLqjiPjtJCcvbF8N4gxrAGXGyJ' // À remplacer par ton wallet Solana

// Top tokens on Solana
export const SOL_TOKENS = [
  { symbol: 'SOL',   address: 'So11111111111111111111111111111111111111112',   decimals: 9 },
  { symbol: 'USDC',  address: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',  decimals: 6 },
  { symbol: 'USDT',  address: 'Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB',  decimals: 6 },
  { symbol: 'JUP',   address: 'JUPyiwrYJFskUPiHa7hkeR8VUtAeFoSYbKedZNsDvCN',   decimals: 6 },
  { symbol: 'BONK',  address: 'DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263',  decimals: 5 },
  { symbol: 'WIF',   address: 'EKpQGSJtjMFqKZ9KQanSqYXRcF8fBopzLHYxdM65zcjm',   decimals: 6 },
  { symbol: 'PYTH',  address: 'HZ1JovNiVvGrGNiiYvEozEVgZ58xaU3RKwX8eACQBCt3',  decimals: 6 },
  { symbol: 'JTO',   address: 'jtojtomepa8beP8AuQc6eXt5FriJwfFMwQx2v2f9mCL',   decimals: 9 },
  { symbol: 'RAY',   address: '4k3Dyjzvzp8eMZWUXbBCjEvwSkkk59S5iCNLY3QrkX6R',  decimals: 6 },
  { symbol: 'ORCA',  address: 'orcaEKTdK7LKz57vaAYr9QeNsVEPfiu6QeMU1kektZE',   decimals: 6 },
]

// ── Phantom Wallet Detection ──
export function getPhantom() {
  const provider = window?.phantom?.solana
  return provider?.isPhantom ? provider : null
}

export function isPhantomInstalled() {
  return !!getPhantom()
}

// ── Connect Phantom ──
export async function connectPhantom() {
  const phantom = getPhantom()
  if (!phantom) {
    window.open('https://phantom.app/', '_blank')
    throw new Error('Phantom non installé — installe-le et reconnecte')
  }
  try {
    const resp = await phantom.connect()
    return resp.publicKey.toString()
  } catch (e) {
    if (e?.code === 4001) throw new Error('Connexion refusée')
    throw e
  }
}

export async function disconnectPhantom() {
  const phantom = getPhantom()
  if (phantom) await phantom.disconnect().catch(() => {})
}

export function getConnectedAddress() {
  const phantom = getPhantom()
  return phantom?.publicKey?.toString() || null
}

// ── Jupiter Quote ──
export async function getJupiterQuote({ inputMint, outputMint, amount, slippageBps = 50 }) {
  const params = new URLSearchParams({
    inputMint,
    outputMint,
    amount: String(amount),
    slippageBps: String(slippageBps),
    platformFeeBps: String(FXS_FEE_BPS), // FXSEDGE 0.5% fee
  })
  const r = await fetch(`${JUPITER_API}/quote?${params}`, {
    signal: AbortSignal.timeout(8000),
  })
  if (!r.ok) {
    const err = await r.json().catch(() => ({}))
    throw new Error(err.error || `Jupiter quote failed (${r.status})`)
  }
  return r.json()
}

// ── Jupiter Swap ──
export async function getJupiterSwapTx({ quote, userPublicKey }) {
  const r = await fetch(`${JUPITER_API}/swap`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      quoteResponse: quote,
      userPublicKey,
      wrapAndUnwrapSol: true,
      // Fee account: doit être un Associated Token Account du token de sortie
      // détenu par FXS_FEE_RECIPIENT_SOL. À configurer côté backend si activé.
      // feeAccount: ...,
    }),
    signal: AbortSignal.timeout(10000),
  })
  if (!r.ok) {
    const err = await r.json().catch(() => ({}))
    throw new Error(err.error || `Jupiter swap failed (${r.status})`)
  }
  return r.json() // { swapTransaction: base64 string }
}

// ── Sign + Send Transaction via Phantom ──
export async function signAndSendTransaction(swapTransactionBase64) {
  const phantom = getPhantom()
  if (!phantom) throw new Error('Phantom non connecté')

  // Decode base64 transaction
  const txBuffer = Uint8Array.from(atob(swapTransactionBase64), c => c.charCodeAt(0))

  // Phantom expects a versioned transaction object
  // We use the raw method to avoid needing @solana/web3.js
  try {
    const result = await phantom.signAndSendTransaction({
      // Phantom accepts a serialized transaction directly
      serialize: () => txBuffer,
    })
    return result.signature
  } catch (e) {
    if (e?.code === 4001) throw new Error('Transaction refusée par le wallet')
    throw e
  }
}

// ── Format helpers ──
export function fmtSolAmount(raw, decimals) {
  if (!raw) return '0'
  const n = Number(BigInt(raw)) / 10 ** decimals
  if (n < 0.0001) return n.toExponential(2)
  if (n < 1) return n.toFixed(6)
  if (n < 1000) return n.toFixed(4)
  return n.toLocaleString('fr-FR', { maximumFractionDigits: 2 })
}

export function toSolBaseUnits(amount, decimals) {
  if (!amount || isNaN(+amount)) return 0n
  const [int = '0', frac = ''] = String(amount).split('.')
  const pad = frac.padEnd(decimals, '0').slice(0, decimals)
  return BigInt(int) * BigInt(10 ** decimals) + BigInt(pad || 0)
}
