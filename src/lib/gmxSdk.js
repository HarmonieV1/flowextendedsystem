// ── GMX SDK v1 — Perps natifs dans FXSEDGE ───────────────────────────────────
// sdk.orders.long() / short() → signe directement dans MetaMask
// uiFeeReceiverAccount → ton wallet reçoit les fees UI on-chain à chaque trade
// Pas de redirect, pas d'iframe — 100% natif comme le Swap Paraswap

import { GmxSdk } from '@gmx-io/sdk'
import { createPublicClient, createWalletClient, http, custom } from 'viem'
import { arbitrum } from 'viem/chains'

export const GMX_REF_ACCOUNT = '0x12B31352569DDC3a6D4254bc7e22fCB2B75F42b1'
export const UI_FEE_BPS      = 10  // 0.1% fee UI (10 bps) — GMX prélève en plus des fees protocol

// GMX v2 market addresses sur Arbitrum
export const GMX_MARKETS = {
  BTCUSDT: {
    market:    '0x47c031236e19d024b42f8AE6780E44A573170703',
    collateral:'0xaf88d065e77c8cC2239327C5EDb3A432268e5831', // USDC
    wtoken:    '0x2f2a2543B76A4166549F7aaB2e75Bef0aefC5B0f', // WBTC
    label:     'BTC/USD',
  },
  ETHUSDT: {
    market:    '0x70d95587d40A2caf56bd97485aB3Eec10Bee6336',
    collateral:'0xaf88d065e77c8cC2239327C5EDb3A432268e5831', // USDC
    wtoken:    '0x82aF49447D8a07e3bd95BD0d56f35241523fBab1', // WETH
    label:     'ETH/USD',
  },
  SOLUSDT: {
    market:    '0x09400D9DB990D5ed3f35D7be61DfAEB900Af03C9',
    collateral:'0xaf88d065e77c8cC2239327C5EDb3A432268e5831', // USDC
    wtoken:    '0x2bcC6D6CdBbDC0a4071e48bb3B969b06B3330c07', // SOL synthetic
    label:     'SOL/USD',
  },
  ARBUSDT: {
    market:    '0xC25cEf6061Cf5dE5eb761b50E4743c1F5D7E5407',
    collateral:'0xaf88d065e77c8cC2239327C5EDb3A432268e5831', // USDC
    wtoken:    '0x912CE59144191C1204E64559FE8253a0e49E6548', // ARB
    label:     'ARB/USD',
  },
  LINKUSDT: {
    market:    '0x7f1fa204bb700853D36994DA19F830b6Ad18d44D',
    collateral:'0xaf88d065e77c8cC2239327C5EDb3A432268e5831', // USDC
    wtoken:    '0xf97f4df75117a78c1A5a0DBb814Af92458539FB4', // LINK
    label:     'LINK/USD',
  },
}

export const USDC_ARB = '0xaf88d065e77c8cC2239327C5EDb3A432268e5831'

/**
 * Créer une instance du SDK GMX v1
 * walletClient vient de wagmi useWalletClient()
 */
export function createGmxSdk(walletClient, publicClient) {
  return new GmxSdk({
    chainId:    42161,
    rpcUrl:     'https://arb1.arbitrum.io/rpc',
    oracleUrl:  'https://arbitrum-api.gmxinfra.io',
    subsquidUrl:'https://gmx.squids.live/gmx-synthetics-arbitrum:prod/api/graphql',
    publicClient,
    walletClient,
    settings: {
      uiFeeReceiverAccount: GMX_REF_ACCOUNT, // ← fees UI → ton wallet
    },
  })
}

/**
 * Ouvrir une position Long ou Short
 * Signe directement dans MetaMask — zéro redirect
 */
export async function openPosition({ sdk, pair, isLong, collateralUsd, leverage, account }) {
  const market = GMX_MARKETS[pair]
  if (!market) throw new Error(`Paire ${pair} non supportée sur GMX`)

  sdk.setAccount(account)

  // collateral en USDC (6 décimales)
  const collateralAmount = BigInt(Math.floor(Number(collateralUsd) * 1e6))

  // leverage en GMX format: 10x = 100000n (10 * 10000)
  const leverageBigInt = BigInt(Math.floor(leverage)) * 10000n

  await sdk.orders.long({
    payAmount:             collateralAmount,
    marketAddress:         market.market,
    payTokenAddress:       USDC_ARB,
    collateralTokenAddress:market.collateral,
    allowedSlippageBps:    125,  // 1.25%
    leverage:              leverageBigInt,
    ...(isLong ? {} : { isLong: false }),
  })
}

export async function closePosition({ sdk, account, positionKey }) {
  sdk.setAccount(account)
  await sdk.orders.createDecreaseOrder({
    marketAddress:           positionKey.market,
    collateralTokenAddress:  positionKey.collateral,
    isLong:                  positionKey.isLong,
    receiveTokenAddress:     USDC_ARB,
    decreaseAmounts: {
      isFullClose: true,
    },
    allowedSlippage: 125,
    marketsInfoData: positionKey.marketsInfoData,
    tokensData:      positionKey.tokensData,
  })
}

export async function getPositions({ sdk, account, marketsInfoData, tokensData }) {
  sdk.setAccount(account)
  return sdk.positions.getPositions({ marketsInfoData, tokensData, start: 0, end: 100 })
}
