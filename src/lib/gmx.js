// GMX v2 on Arbitrum — non-custodial perpetuals
// Referral: https://app.gmx.io/#/trade/?ref=FXS
// Docs: https://docs.gmx.io/docs/api/contracts-v2

export const GMX_REFERRAL_CODE = '0x4658530000000000000000000000000000000000000000000000000000000000'

export const GMX_CONTRACTS = {
  42161: {
    ExchangeRouter: '0x7C68C7866A64FA2160F78EEaE12217FFbf871fa8',
    OrderVault:     '0x31eF83a530Fde1B38EE9A18093A333D8Bbbc40D5',
    Reader:         '0x60a0fF4cDaF0f6D496d71e0bC0fFa86FE09E406d',
    DataStore:      '0xFD70de6b91282D8017aA4E741e9Ae325CAb992d8',
    WNT:            '0x82aF49447D8a07e3bd95BD0d56f35241523fBab1', // WETH on Arbitrum
  }
}

// GMX v2 Market LP token addresses on Arbitrum
export const GMX_MARKETS = {
  BTC:  '0x47c031236e19d024b42f8AE6780E44A573170703',
  ETH:  '0x70d95587d40A2caf56bd97485aB3Eec10Bee6336',
  SOL:  '0x09400D9DB990D5ed3f35D7be61DfAEB900Af03C9',
  ARB:  '0xC25cEf6061Cf5dE5eb761b50E4743c1F5D7E5407',
  LINK: '0x7f1fa204bb700853D36994DA19F830b6Ad18d232',
  AVAX: '0x7BbBf946883a5701350007320F525c5379B8178A',
}

// Token addresses on Arbitrum
export const GMX_TOKENS = {
  USDC: { address: '0xaf88d065e77c8cC2239327C5EDb3A432268e5831', decimals: 6 },
  USDT: { address: '0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9', decimals: 6 },
  WETH: { address: '0x82aF49447D8a07e3bd95BD0d56f35241523fBab1', decimals: 18 },
  BTC:  { address: '0x2f2a2543B76A4166549F7aaB2e75Bef0aefC5B0f', decimals: 8 },
}

export const ORDER_TYPES = {
  MarketIncrease: 0, LimitIncrease: 1,
  MarketDecrease: 2, LimitDecrease: 3,
}

export const MIN_LEVERAGE = 1.1
export const MAX_LEVERAGE = 100

export function calcLiquidationPrice({ entryPrice, leverage, side, mmr = 0.01 }) {
  const p = parseFloat(entryPrice), l = parseFloat(leverage)
  if (!p || !l) return 0
  return side === 'long' ? p * (1 - 1/l + mmr) : p * (1 + 1/l - mmr)
}

// ── GMX v2 ExchangeRouter ABI ──
// GMX v2 requires multicall: [sendWnt, sendTokens, createOrder]
export const EXCHANGE_ROUTER_ABI = [
  {
    name: 'multicall',
    type: 'function',
    stateMutability: 'payable',
    inputs: [{ name: 'data', type: 'bytes[]' }],
    outputs: [{ name: 'results', type: 'bytes[]' }],
  },
  {
    name: 'sendWnt',
    type: 'function',
    stateMutability: 'payable',
    inputs: [
      { name: 'receiver', type: 'address' },
      { name: 'amount',   type: 'uint256' },
    ],
    outputs: [],
  },
  {
    name: 'sendTokens',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'token',    type: 'address' },
      { name: 'receiver', type: 'address' },
      { name: 'amount',   type: 'uint256' },
    ],
    outputs: [],
  },
  {
    name: 'createOrder',
    type: 'function',
    stateMutability: 'payable',
    inputs: [{
      name: 'params', type: 'tuple',
      components: [
        { name: 'addresses', type: 'tuple', components: [
          { name: 'receiver',               type: 'address' },
          { name: 'callbackContract',       type: 'address' },
          { name: 'uiFeeReceiver',          type: 'address' },
          { name: 'market',                 type: 'address' },
          { name: 'initialCollateralToken', type: 'address' },
          { name: 'swapPath',               type: 'address[]' },
        ]},
        { name: 'numbers', type: 'tuple', components: [
          { name: 'sizeDeltaUsd',                  type: 'uint256' },
          { name: 'initialCollateralDeltaAmount',   type: 'uint256' },
          { name: 'triggerPrice',                  type: 'uint256' },
          { name: 'acceptablePrice',               type: 'uint256' },
          { name: 'executionFee',                  type: 'uint256' },
          { name: 'callbackGasLimit',              type: 'uint256' },
          { name: 'minOutputAmount',               type: 'uint256' },
        ]},
        { name: 'orderType',                type: 'uint256' },
        { name: 'decreasePositionSwapType', type: 'uint256' },
        { name: 'isLong',                   type: 'bool'    },
        { name: 'shouldUnwrapNativeToken',  type: 'bool'    },
        { name: 'referralCode',             type: 'bytes32' },
      ],
    }],
    outputs: [{ name: 'key', type: 'bytes32' }],
  },
]

// GMX Reader ABI
export const GMX_READER_ABI = [
  {
    name: 'getAccountPositions',
    type: 'function',
    stateMutability: 'view',
    inputs: [
      { name: 'dataStore', type: 'address' },
      { name: 'account',   type: 'address' },
      { name: 'start',     type: 'uint256' },
      { name: 'end',       type: 'uint256' },
    ],
    outputs: [{
      name: '', type: 'tuple[]',
      components: [
        { name: 'key', type: 'bytes32' },
        { name: 'addresses', type: 'tuple', components: [
          { name: 'account',          type: 'address' },
          { name: 'market',           type: 'address' },
          { name: 'collateralToken',  type: 'address' },
        ]},
        { name: 'numbers', type: 'tuple', components: [
          { name: 'sizeInUsd',          type: 'uint256' },
          { name: 'sizeInTokens',       type: 'uint256' },
          { name: 'collateralAmount',   type: 'uint256' },
          { name: 'borrowingFactor',    type: 'uint256' },
          { name: 'fundingFeeAmountPerSize', type: 'uint256' },
          { name: 'longTokenClaimableFundingAmountPerSize', type: 'uint256' },
          { name: 'shortTokenClaimableFundingAmountPerSize', type: 'uint256' },
          { name: 'increasedAtBlock',   type: 'uint256' },
          { name: 'decreasedAtBlock',   type: 'uint256' },
          { name: 'increasedAtTime',    type: 'uint256' },
          { name: 'decreasedAtTime',    type: 'uint256' },
        ]},
        { name: 'flags', type: 'tuple', components: [
          { name: 'isLong', type: 'bool' },
        ]},
      ],
    }],
  },
]

export function formatGmxPosition(pos, markets) {
  try {
    const sizeUsd    = Number(pos.numbers.sizeInUsd) / 1e30
    const collateral = Number(pos.numbers.collateralAmount) / 1e6
    const isLong     = pos.flags.isLong
    const mAddr      = pos.addresses.market.toLowerCase()
    const pair       = Object.entries(markets).find(([, a]) => a.toLowerCase() === mAddr)?.[0] || '?'
    return { pair, sizeUsd, collateral, isLong, key: pos.key }
  } catch { return null }
}
