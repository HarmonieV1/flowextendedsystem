// ── GMX SDK v1 — Perps natifs dans FXSEDGE ───────────────────────────────────
// Toutes les valeurs passées au SDK doivent être des BigInt purs
// leverage format GMX: 10x = 100000n (10 * BASIS_POINTS = 10 * 10000)

import { GmxSdk } from '@gmx-io/sdk'

export const GMX_REF_ACCOUNT = '0x12B31352569DDC3a6D4254bc7e22fCB2B75F42b1'
export const UI_FEE_BPS      = 10  // 0.1%

// GMX v2 market addresses sur Arbitrum
export const GMX_MARKETS = {
  BTCUSDT: {
    market:    '0x47c031236e19d024b42f8AE6780E44A573170703',
    collateral:'0xaf88d065e77c8cC2239327C5EDb3A432268e5831',
    label:     'BTC/USD',
  },
  ETHUSDT: {
    market:    '0x70d95587d40A2caf56bd97485aB3Eec10Bee6336',
    collateral:'0xaf88d065e77c8cC2239327C5EDb3A432268e5831',
    label:     'ETH/USD',
  },
  SOLUSDT: {
    market:    '0x09400D9DB990D5ed3f35D7be61DfAEB900Af03C9',
    collateral:'0xaf88d065e77c8cC2239327C5EDb3A432268e5831',
    label:     'SOL/USD',
  },
  ARBUSDT: {
    market:    '0xC25cEf6061Cf5dE5eb761b50E4743c1F5D7E5407',
    collateral:'0xaf88d065e77c8cC2239327C5EDb3A432268e5831',
    label:     'ARB/USD',
  },
  LINKUSDT: {
    market:    '0x7f1fa204bb700853D36994DA19F830b6Ad18d44D',
    collateral:'0xaf88d065e77c8cC2239327C5EDb3A432268e5831',
    label:     'LINK/USD',
  },
}

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
  if (!market) throw new Error(`Paire ${pair} non supportée sur GMX`)

  sdk.setAccount(account)

  // ── Tout doit être BigInt pur — zéro mélange avec number ──
  // USDC a 6 décimales
  const collateralAmount = BigInt(Math.round(Number(collateralUsd) * 1_000_000))

  // GMX leverage format: 10x = 100_000n (leverage * BASIS_POINTS_DIVISOR = leverage * 10_000)
  // Ne pas confondre avec 10_000n (qui serait 1x)
  const leverageGmx = BigInt(Math.round(Number(leverage))) * 10_000n

  await sdk.orders.long({
    payAmount:              collateralAmount,   // BigInt — montant USDC en unités de base
    marketAddress:          market.market,
    payTokenAddress:        USDC_ARB,
    collateralTokenAddress: market.collateral,
    allowedSlippageBps:     125,               // number — attendu par le SDK comme number
    leverage:               leverageGmx,        // BigInt — 10x = 100_000n
    isLong,
  })
}
