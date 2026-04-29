// ── GMX v2 — Ordre direct via smart contract ──────────────────────────────────
// On bypasse le SDK @gmx-io/sdk qui a des bugs BigInt internes
// On appelle directement ExchangeRouter.createOrder() comme le fait l'interface GMX
// uiFeeReceiver = notre wallet → fees UI collectées on-chain automatiquement

import { encodeFunctionData, parseUnits } from 'viem'

export const GMX_REF_ACCOUNT = '0x12B31352569DDC3a6D4254bc7e22fCB2B75F42b1'
export const UI_FEE_BPS      = 10  // 0.1%

// Contrats GMX v2 sur Arbitrum
const EXCHANGE_ROUTER   = '0x900173A66dbD345006C51fA35fA3aB760FcD843b'
const ORDER_VAULT       = '0x31eF83a530Fde1B38EE9A18093A333D8Bbbc40D5'
const DATA_STORE        = '0xFD70de6b91282D8017aA4E741e9Ae325CAb992d7'
const REFERRAL_STORE    = '0xe6fab3F0c7199b0d34d7FbE83394fc0e0D06e99d'
const USDC_ARB          = '0xaf88d065e77c8cC2239327C5EDb3A432268e5831'

// Markets GMX v2 Arbitrum
export const GMX_MARKETS = {
  BTCUSDT:  { market:'0x47c031236e19d024b42f8AE6780E44A573170703', label:'BTC/USD' },
  ETHUSDT:  { market:'0x70d95587d40A2caf56bd97485aB3Eec10Bee6336', label:'ETH/USD' },
  SOLUSDT:  { market:'0x09400D9DB990D5ed3f35D7be61DfAEB900Af03C9', label:'SOL/USD' },
  ARBUSDT:  { market:'0xC25cEf6061Cf5dE5eb761b50E4743c1F5D7E5407', label:'ARB/USD' },
  LINKUSDT: { market:'0x7f1fa204bb700853D36994DA19F830b6Ad18d44D', label:'LINK/USD' },
}

// ExchangeRouter ABI — createOrder uniquement
const EXCHANGE_ROUTER_ABI = [
  {
    name: 'multicall',
    type: 'function',
    stateMutability: 'payable',
    inputs: [{ name:'data', type:'bytes[]' }],
    outputs: [{ name:'results', type:'bytes[]' }],
  },
  {
    name: 'sendTokens',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name:'token',  type:'address' },
      { name:'receiver',type:'address' },
      { name:'amount', type:'uint256' },
    ],
    outputs: [],
  },
  {
    name: 'createOrder',
    type: 'function',
    stateMutability: 'payable',
    inputs: [{
      name: 'params',
      type: 'tuple',
      components: [
        {
          name: 'addresses',
          type: 'tuple',
          components: [
            { name:'receiver',            type:'address' },
            { name:'cancellationReceiver',type:'address' },
            { name:'callbackContract',    type:'address' },
            { name:'uiFeeReceiver',       type:'address' },
            { name:'market',              type:'address' },
            { name:'initialCollateralToken', type:'address' },
            { name:'swapPath',            type:'address[]' },
          ],
        },
        {
          name: 'numbers',
          type: 'tuple',
          components: [
            { name:'sizeDeltaUsd',              type:'uint256' },
            { name:'initialCollateralDeltaAmount', type:'uint256' },
            { name:'triggerPrice',              type:'uint256' },
            { name:'acceptablePrice',           type:'uint256' },
            { name:'executionFee',              type:'uint256' },
            { name:'callbackGasLimit',          type:'uint256' },
            { name:'minOutputAmount',           type:'uint256' },
            { name:'validFromTime',             type:'uint256' },
          ],
        },
        { name:'orderType',         type:'uint256' },
        { name:'decreasePositionSwapType', type:'uint256' },
        { name:'isLong',            type:'bool' },
        { name:'shouldUnwrapNativeToken', type:'bool' },
        { name:'autoCancel',        type:'bool' },
        { name:'referralCode',      type:'bytes32' },
      ],
    }],
    outputs: [{ name:'', type:'bytes32' }],
  },
]

const ERC20_ABI = [
  {
    name:'approve', type:'function', stateMutability:'nonpayable',
    inputs:[{name:'spender',type:'address'},{name:'amount',type:'uint256'}],
    outputs:[{name:'',type:'bool'}],
  },
  {
    name:'allowance', type:'function', stateMutability:'view',
    inputs:[{name:'owner',type:'address'},{name:'spender',type:'address'}],
    outputs:[{name:'',type:'uint256'}],
  },
]

// ORDER_TYPE: MarketIncrease = 2
const ORDER_TYPE_MARKET_INCREASE = 2n

// Prix "acceptable" — 1% de slippage par rapport au mark price
// On passe 0 pour Market order (le contrat prend le mark price)
// Mais on met une limite large pour éviter revert
const MAX_PRICE   = 2n ** 256n - 1n
const ZERO_PRICE  = 0n
const ZERO_BYTES32 = '0x0000000000000000000000000000000000000000000000000000000000000000'

// Execution fee GMX (en ETH natif Arbitrum) — ~0.0003 ETH en 2025
const EXECUTION_FEE = parseUnits('0.0003', 18)  // 0.0003 ETH

// GMX sizeDeltaUsd format: 30 décimales (1e30 = $1)
const USD_DECIMALS_30 = 10n ** 30n

export async function openPosition({ walletClient, publicClient, pair, isLong, collateralUsd, leverage, account }) {
  const market = GMX_MARKETS[pair]
  if (!market) throw new Error(`${pair.replace('USDT','')} non disponible — utilise BTC, ETH, SOL, ARB ou LINK`)

  // Tout en BigInt strict — zéro mélange
  const col     = parseFloat(String(collateralUsd))
  const lev     = parseFloat(String(leverage))

  // Collateral USDC en unités de base (6 décimales)
  const collateralAmount = parseUnits(col.toFixed(6), 6)

  // Position size = collateral × leverage, en format 30 décimales GMX
  const sizeUsd = BigInt(Math.round(col * lev * 1_000_000))  // en micro-USD
  const sizeDeltaUsd = sizeUsd * (USD_DECIMALS_30 / 1_000_000n)  // → 30 décimales

  // 1. Check & approve USDC si nécessaire
  const currentAllowance = await publicClient.readContract({
    address:      USDC_ARB,
    abi:          ERC20_ABI,
    functionName: 'allowance',
    args:         [account, ORDER_VAULT],
  })

  if (currentAllowance < collateralAmount) {
    const approveTx = await walletClient.writeContract({
      address:      USDC_ARB,
      abi:          ERC20_ABI,
      functionName: 'approve',
      args:         [ORDER_VAULT, collateralAmount * 2n],  // approve 2x pour la prochaine fois
      account,
      chain: { id: 42161 },
    })
    await publicClient.waitForTransactionReceipt({ hash: approveTx })
  }

  // 2. Build createOrder params
  const orderParams = {
    addresses: {
      receiver:               account,
      cancellationReceiver:   account,
      callbackContract:       '0x0000000000000000000000000000000000000000',
      uiFeeReceiver:          GMX_REF_ACCOUNT,  // ← nos fees UI
      market:                 market.market,
      initialCollateralToken: USDC_ARB,
      swapPath:               [],
    },
    numbers: {
      sizeDeltaUsd,
      initialCollateralDeltaAmount: collateralAmount,
      triggerPrice:              0n,
      acceptablePrice:           isLong ? MAX_PRICE : 1n,  // long=max, short=1 (wei)
      executionFee:              EXECUTION_FEE,
      callbackGasLimit:          0n,
      minOutputAmount:           0n,
      validFromTime:             0n,
    },
    orderType:                 ORDER_TYPE_MARKET_INCREASE,
    decreasePositionSwapType:  0n,
    isLong,
    shouldUnwrapNativeToken:   false,
    autoCancel:                false,
    referralCode:              ZERO_BYTES32,
  }

  // 3. Multicall: sendTokens + createOrder
  const sendTokensData = encodeFunctionData({
    abi:          EXCHANGE_ROUTER_ABI,
    functionName: 'sendTokens',
    args:         [USDC_ARB, ORDER_VAULT, collateralAmount],
  })

  const createOrderData = encodeFunctionData({
    abi:          EXCHANGE_ROUTER_ABI,
    functionName: 'createOrder',
    args:         [orderParams],
  })

  const hash = await walletClient.writeContract({
    address:      EXCHANGE_ROUTER,
    abi:          EXCHANGE_ROUTER_ABI,
    functionName: 'multicall',
    args:         [[sendTokensData, createOrderData]],
    value:        EXECUTION_FEE,  // ETH pour l'exécution du keeper
    account,
    chain: { id: 42161 },
  })

  return hash
}
