// ── GMX SDK v1 — Perps natifs FXSEDGE ────────────────────────────────────────
import { GmxSdk } from '@gmx-io/sdk'

export const GMX_REF_ACCOUNT = '0x12B31352569DDC3a6D4254bc7e22fCB2B75F42b1'
export const UI_FEE_BPS      = 10  // 0.1%

// GMX v2 markets Arbitrum — USDC comme collateral pour tous
export const GMX_MARKETS = {
  BTCUSDT: { market:'0x47c031236e19d024b42f8AE6780E44A573170703', label:'BTC/USD' },
  ETHUSDT: { market:'0x70d95587d40A2caf56bd97485aB3Eec10Bee6336', label:'ETH/USD' },
  SOLUSDT: { market:'0x09400D9DB990D5ed3f35D7be61DfAEB900Af03C9', label:'SOL/USD' },
  ARBUSDT: { market:'0xC25cEf6061Cf5dE5eb761b50E4743c1F5D7E5407', label:'ARB/USD' },
  LINKUSDT:{ market:'0x7f1fa204bb700853D36994DA19F830b6Ad18d44D', label:'LINK/USD' },
}

// USDC natif sur Arbitrum — 6 décimales
export const USDC_ARB = '0xaf88d065e77c8cC2239327C5EDb3A432268e5831'

export function createGmxSdk(walletClient, publicClient) {
  return new GmxSdk({
    chainId:     42161,
    rpcUrl:      'https://arb1.arbitrum.io/rpc',
    oracleUrl:   'https://arbitrum-api.gmxinfra.io',
    subsquidUrl: 'https://gmx.squids.live/gmx-synthetics-arbitrum:prod/api/graphql',
    publicClient,
    walletClient,
    settings: {
      uiFeeReceiverAccount: GMX_REF_ACCOUNT,
    },
  })
}

export async function openPosition({ sdk, pair, isLong, collateralUsd, leverage, account }) {
  const market = GMX_MARKETS[pair]
  if (!market) throw new Error(`${pair.replace('USDT','')} non disponible — utilise BTC, ETH, SOL, ARB ou LINK`)

  sdk.setAccount(account)

  // ── Types stricts attendus par le SDK GMX ──
  // payAmount    : BigInt, USDC en unités de base (6 decimales)
  // leverage     : BigInt, format GMX = levier × 10_000 (ex: 10× = 100_000n)
  // slippageBps  : number ordinaire (pas BigInt)

  const collateralRaw  = BigInt(Math.round(parseFloat(String(collateralUsd)) * 1_000_000))
  const leverageRaw    = BigInt(parseInt(String(leverage), 10)) * 10_000n

  const params = {
    payAmount:              collateralRaw,
    marketAddress:          market.market,
    payTokenAddress:        USDC_ARB,
    collateralTokenAddress: USDC_ARB,
    allowedSlippageBps:     150,        // number — 1.5%
    leverage:               leverageRaw,
  }

  // long() force isLong:true, short() force isLong:false — ne pas passer isLong soi-même
  if (isLong) {
    await sdk.orders.long(params)
  } else {
    await sdk.orders.short(params)
  }
}
