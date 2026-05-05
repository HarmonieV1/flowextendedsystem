// ── Paraswap API v5 — swap natif browser ─────────────────────────────────────
// Pas de clé API, CORS ouvert, utilisé par MetaMask / Ledger / Aave
// Fee: partnerAddress + partnerFeeBps embarqués dans chaque transaction
// Revenue: 0.5% prélevé on-chain automatiquement à chaque swap

const PS_BASE    = 'https://apiv5.paraswap.io'
const PARTNER    = 'fxsedge'

export const FEE_RECIPIENT = '0x12B31352569DDC3a6D4254bc7e22fCB2B75F42b1'
export const FEE_BPS       = 50  // 0.5%
export const NATIVE_TOKEN  = '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE'

// Chain IDs Paraswap: 1=ETH, 10=Optimism, 56=BSC, 137=Polygon, 42161=Arbitrum, 8453=Base
export const CHAINS = {
  1:     { name:'Ethereum', symbol:'ETH',   explorer:'https://etherscan.io' },
  42161: { name:'Arbitrum', symbol:'ETH',   explorer:'https://arbiscan.io' },
  8453:  { name:'Base',     symbol:'ETH',   explorer:'https://basescan.org' },
  137:   { name:'Polygon',  symbol:'MATIC', explorer:'https://polygonscan.com' },
}

export const POPULAR_TOKENS = {
  42161: [ // Arbitrum
    { symbol:'ETH',    address:NATIVE_TOKEN,                                   decimals:18 },
    { symbol:'USDC',   address:'0xaf88d065e77c8cC2239327C5EDb3A432268e5831', decimals:6  },
    { symbol:'USDT',   address:'0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9', decimals:6  },
    { symbol:'WBTC',   address:'0x2f2a2543B76A4166549F7aaB2e75Bef0aefC5B0f', decimals:8  },
    { symbol:'ARB',    address:'0x912CE59144191C1204E64559FE8253a0e49E6548', decimals:18 },
    { symbol:'LINK',   address:'0xf97f4df75117a78c1A5a0DBb814Af92458539FB4', decimals:18 },
    { symbol:'UNI',    address:'0xFa7F8980b0f1E64A2062791cc3b0871572f1F7f0', decimals:18 },
    { symbol:'AAVE',   address:'0xba5DdD1f9d7F570dc94a51479a000E3BCE967196', decimals:18 },
    { symbol:'GMX',    address:'0xfc5A1A6EB076a2C7aD06eD22C90d7E710E35ad0a', decimals:18 },
    { symbol:'PENDLE', address:'0x0c880f6761F1af8d9Aa9C466984b80DAb9a8c9e8', decimals:18 },
    { symbol:'GRT',    address:'0x9623063377AD1B27544C965cCd7342f7EA7e88C7', decimals:18 },
    { symbol:'RDNT',   address:'0x3082CC23568eA640225c2467653dB90e9250AaA0', decimals:18 },
  ],
  1: [ // Ethereum
    { symbol:'ETH',    address:NATIVE_TOKEN,                                   decimals:18 },
    { symbol:'USDC',   address:'0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48', decimals:6  },
    { symbol:'USDT',   address:'0xdAC17F958D2ee523a2206206994597C13D831ec7', decimals:6  },
    { symbol:'WBTC',   address:'0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599', decimals:8  },
    { symbol:'LINK',   address:'0x514910771AF9Ca656af840dff83E8264EcF986CA', decimals:18 },
    { symbol:'UNI',    address:'0x1f9840a85d5aF5bf1D1762F925BDADdC4201F984', decimals:18 },
    { symbol:'AAVE',   address:'0x7Fc66500c84A76Ad7e9c93437bFc5Ac33E2DDaE9', decimals:18 },
    { symbol:'MKR',    address:'0x9f8F72aA9304c8B593d555F12eF6589cC3A579A2', decimals:18 },
    { symbol:'LDO',    address:'0x5A98FcBEA516Cf06857215779Fd812CA3beF1B32', decimals:18 },
    { symbol:'PEPE',   address:'0x6982508145454Ce325dDbE47a25d4ec3d2311933', decimals:18 },
    { symbol:'SHIB',   address:'0x95aD61b0a150d79219dCF64E1E6Cc01f0B64C4cE', decimals:18 },
  ],
  8453: [ // Base
    { symbol:'ETH',    address:NATIVE_TOKEN,                                   decimals:18 },
    { symbol:'USDC',   address:'0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913', decimals:6  },
    { symbol:'AERO',   address:'0x940181a94A35A4569E4529A3CDfB74e38FD98631', decimals:18 },
    { symbol:'DEGEN',  address:'0x4ed4E862860beD51a9570b96d89aF5E1B0Efefed', decimals:18 },
  ],
  137: [ // Polygon
    { symbol:'POL',    address:NATIVE_TOKEN,                                  decimals:18 },
    { symbol:'USDC',   address:'0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359', decimals:6  },
    { symbol:'USDT',   address:'0xc2132D05D31c914a87C6611C10748AEb04B58e8F', decimals:6  },
    { symbol:'WBTC',   address:'0x1BFD67037B42Cf73acF2047067bd4F2C47D9BfD6', decimals:8  },
    { symbol:'LINK',   address:'0x53E0bca35eC356BD5ddDFebbD1Fc0fD03FaBad39', decimals:18 },
    { symbol:'AAVE',   address:'0xD6DF932A45C0f255f85145f286eA0b292B21C90B', decimals:18 },
  ],
}

/**
 * Étape 1 — Obtenir le meilleur prix (indicatif)
 * Appel direct browser, CORS ouvert, pas de clé API
 */
export async function getPrice({ chainId, sellToken, buyToken, sellAmount }) {
  const params = new URLSearchParams({
    srcToken:    sellToken,
    destToken:   buyToken,
    amount:      String(sellAmount),
    srcDecimals: String(getDecimals(chainId, sellToken)),
    destDecimals:String(getDecimals(chainId, buyToken)),
    side:        'SELL',
    network:     String(chainId),
    partner:     PARTNER,
    partnerAddress: FEE_RECIPIENT,
    partnerFeeBps:  String(FEE_BPS),

  })
  const r = await fetch(`${PS_BASE}/prices/?${params}`, {
    signal: AbortSignal.timeout(10000),
  })
  if (!r.ok) {
    const e = await r.json().catch(() => ({}))
    throw new Error(e.error || `Erreur prix ${r.status}`)
  }
  return r.json()  // { priceRoute: { destAmount, bestRoute, ... } }
}

/**
 * Étape 2 — Construire la transaction (avec fee FXSEDGE embarquée)
 * Appel direct browser, CORS ouvert
 */
export async function buildTx({ chainId, priceRoute, taker, slippageBps = 50 }) {
  if (!taker) throw new Error('Wallet non connecté')

  // Paraswap: destAmount = montant minimum avec slippage appliqué
  // Ne pas passer slippage ET destAmount en même temps
  const slippagePct  = slippageBps / 10000  // 50 bps → 0.005
  const destAmountMin = String(
    BigInt(priceRoute.destAmount) * BigInt(Math.floor((1 - slippagePct) * 10000)) / 10000n
  )

  const body = {
    srcToken:       priceRoute.srcToken,
    destToken:      priceRoute.destToken,
    srcAmount:      priceRoute.srcAmount,
    destAmount:     destAmountMin,
    priceRoute,
    userAddress:    taker,
    // Fee FXSEDGE — collectée on-chain via partnerAddress + partnerFeeBps
    partnerAddress: FEE_RECIPIENT,
    partnerFeeBps:  FEE_BPS,
    partner:        PARTNER,
  }

  const r = await fetch(
    `${PS_BASE}/transactions/${chainId}?ignoreChecks=true`,
    {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify(body),
      signal:  AbortSignal.timeout(12000),
    }
  )
  if (!r.ok) {
    const e = await r.json().catch(() => ({}))
    throw new Error(e.error || `Erreur tx ${r.status}`)
  }
  return r.json()  // { from, to, value, data, gas, ... }
}

// Helper — retrouver les décimales d'un token
function getDecimals(chainId, address) {
  const tokens = POPULAR_TOKENS[chainId] || []
  return tokens.find(t => t.address.toLowerCase() === address.toLowerCase())?.decimals ?? 18
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
