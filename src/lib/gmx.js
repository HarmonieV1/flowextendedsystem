// GMX v2 on Arbitrum — non-custodial perpetuals
// Docs: https://docs.gmx.io
// Contracts: https://github.com/gmx-io/gmx-synthetics

export const GMX_REFERRAL_CODE = '0x' + 'FXS'.padEnd(64, '0').slice(0, 64) // à remplacer par vrai code referral GMX

// GMX Exchange Router sur Arbitrum
export const GMX_CONTRACTS = {
  42161: { // Arbitrum
    ExchangeRouter:   '0x7C68C7866A64FA2160F78EEaE12217FFbf871fa8',
    OrderVault:       '0x31eF83a530Fde1B38EE9A18093A333D8Bbbc40D5',
    DataStore:        '0xFD70de6b91282D8017aA4E741e9Ae325CAb992d8',
    Reader:           '0x60a0fF4cDaF0f6D496d71e0bC0fFa86FE09E406d',
    ReferralStorage:  '0xe6fab3F0c7199b0d34d7FbE83394fc0e0D06e99d',
  }
}

// Tokens GMX sur Arbitrum
export const GMX_TOKENS = {
  ETH:  { address: '0x82aF49447D8a07e3bd95BD0d56f35241523fBab1', decimals: 18, symbol: 'ETH' },
  BTC:  { address: '0x2f2a2543B76A4166549F7aaB2e75Bef0aefC5B0f', decimals: 8,  symbol: 'BTC' },
  SOL:  { address: '0x2BCc6D6CdBbDC0a4071e48bb3B969b06B3330c07', decimals: 9,  symbol: 'SOL' },
  LINK: { address: '0xf97f4df75117a78c1A5a0DBb814Af92458539FB4', decimals: 18, symbol: 'LINK' },
  ARB:  { address: '0x912CE59144191C1204E64559FE8253a0e49E6548', decimals: 18, symbol: 'ARB' },
  USDC: { address: '0xaf88d065e77c8cC2239327C5EDb3A432268e5831', decimals: 6,  symbol: 'USDC' },
}

// Leverage: 1.1x → 100x
export const MIN_LEVERAGE = 1.1
export const MAX_LEVERAGE = 100

// Calcul du liquidation price
export function calcLiquidationPrice({ entryPrice, leverage, side, maintenanceMarginRate = 0.005 }) {
  const p = parseFloat(entryPrice)
  const l = parseFloat(leverage)
  if (side === 'long') {
    return p * (1 - (1/l) + maintenanceMarginRate)
  } else {
    return p * (1 + (1/l) - maintenanceMarginRate)
  }
}

// Calcul du funding fee estimé
export function calcFundingFee({ positionSizeUSD, fundingRatePerHour = 0.0001, hours = 8 }) {
  return positionSizeUSD * fundingRatePerHour * hours
}

// ABI minimal pour createOrder GMX v2
export const EXCHANGE_ROUTER_ABI = [
  {
    name: 'createOrder',
    type: 'function',
    stateMutability: 'payable',
    inputs: [{
      name: 'params',
      type: 'tuple',
      components: [
        { name: 'addresses', type: 'tuple', components: [
          { name: 'receiver', type: 'address' },
          { name: 'callbackContract', type: 'address' },
          { name: 'uiFeeReceiver', type: 'address' },
          { name: 'market', type: 'address' },
          { name: 'initialCollateralToken', type: 'address' },
          { name: 'swapPath', type: 'address[]' },
        ]},
        { name: 'numbers', type: 'tuple', components: [
          { name: 'sizeDeltaUsd', type: 'uint256' },
          { name: 'initialCollateralDeltaAmount', type: 'uint256' },
          { name: 'triggerPrice', type: 'uint256' },
          { name: 'acceptablePrice', type: 'uint256' },
          { name: 'executionFee', type: 'uint256' },
          { name: 'callbackGasLimit', type: 'uint256' },
          { name: 'minOutputAmount', type: 'uint256' },
        ]},
        { name: 'orderType', type: 'uint256' },
        { name: 'decreasePositionSwapType', type: 'uint256' },
        { name: 'isLong', type: 'bool' },
        { name: 'shouldUnwrapNativeToken', type: 'bool' },
        { name: 'referralCode', type: 'bytes32' },
      ]
    }],
    outputs: [{ name: '', type: 'bytes32' }],
  }
]

// Order types GMX v2
export const ORDER_TYPES = {
  MarketIncrease:  0,
  LimitIncrease:   1,
  MarketDecrease:  2,
  LimitDecrease:   3,
  StopLossDecrease: 4,
  Liquidation:     5,
}
