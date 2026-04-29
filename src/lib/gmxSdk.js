// ── GMX v2 — Ordre direct smart contract Arbitrum ────────────────────────────
// ExchangeRouter mis à jour — adresse vérifiée octobre 2025

import { encodeFunctionData, parseUnits } from 'viem'

export const GMX_REF_ACCOUNT = '0x12B31352569DDC3a6D4254bc7e22fCB2B75F42b1'
export const UI_FEE_BPS      = 10  // 0.1%

// ⚠ Adresses GMX v2 Arbitrum — vérifiées via gouvernance GMX oct 2025
const EXCHANGE_ROUTER = '0x87d66368cD08a7Ca42252f5ab44B2fb6d1Fb8d15'
const ORDER_VAULT     = '0x31eF83a530Fde1B38EE9A18093A333D8Bbbc40D5'
const USDC_ARB        = '0xaf88d065e77c8cC2239327C5EDb3A432268e5831'

export const GMX_MARKETS = {
  BTCUSDT:  { market:'0x47c031236e19d024b42f8AE6780E44A573170703', label:'BTC/USD' },
  ETHUSDT:  { market:'0x70d95587d40A2caf56bd97485aB3Eec10Bee6336', label:'ETH/USD' },
  SOLUSDT:  { market:'0x09400D9DB990D5ed3f35D7be61DfAEB900Af03C9', label:'SOL/USD' },
  ARBUSDT:  { market:'0xC25cEf6061Cf5dE5eb761b50E4743c1F5D7E5407', label:'ARB/USD' },
  LINKUSDT: { market:'0x7f1fa204bb700853D36994DA19F830b6Ad18d44D', label:'LINK/USD' },
}

const ERC20_ABI = [
  { name:'approve',   type:'function', stateMutability:'nonpayable', inputs:[{name:'spender',type:'address'},{name:'amount',type:'uint256'}], outputs:[{name:'',type:'bool'}] },
  { name:'allowance', type:'function', stateMutability:'view',       inputs:[{name:'owner',type:'address'},{name:'spender',type:'address'}], outputs:[{name:'',type:'uint256'}] },
]

const EXCHANGE_ROUTER_ABI = [{
  name: 'multicall',
  type: 'function',
  stateMutability: 'payable',
  inputs: [{ name:'data', type:'bytes[]' }],
  outputs: [{ name:'results', type:'bytes[]' }],
},{
  name: 'sendTokens',
  type: 'function',
  stateMutability: 'nonpayable',
  inputs: [
    { name:'token',    type:'address' },
    { name:'receiver', type:'address' },
    { name:'amount',   type:'uint256' },
  ],
  outputs: [],
},{
  name: 'createOrder',
  type: 'function',
  stateMutability: 'payable',
  inputs: [{ name:'params', type:'tuple', components: [
    { name:'addresses', type:'tuple', components:[
      { name:'receiver',               type:'address' },
      { name:'cancellationReceiver',   type:'address' },
      { name:'callbackContract',       type:'address' },
      { name:'uiFeeReceiver',          type:'address' },
      { name:'market',                 type:'address' },
      { name:'initialCollateralToken', type:'address' },
      { name:'swapPath',               type:'address[]' },
    ]},
    { name:'numbers', type:'tuple', components:[
      { name:'sizeDeltaUsd',                type:'uint256' },
      { name:'initialCollateralDeltaAmount',type:'uint256' },
      { name:'triggerPrice',                type:'uint256' },
      { name:'acceptablePrice',             type:'uint256' },
      { name:'executionFee',                type:'uint256' },
      { name:'callbackGasLimit',            type:'uint256' },
      { name:'minOutputAmount',             type:'uint256' },
      { name:'validFromTime',               type:'uint256' },
    ]},
    { name:'orderType',                type:'uint256' },
    { name:'decreasePositionSwapType', type:'uint256' },
    { name:'isLong',                   type:'bool'    },
    { name:'shouldUnwrapNativeToken',  type:'bool'    },
    { name:'autoCancel',               type:'bool'    },
    { name:'referralCode',             type:'bytes32' },
  ]}],
  outputs:[{ name:'', type:'bytes32' }],
}]

// MarketIncrease = 2
const ORDER_TYPE = 2n
const ZERO32 = '0x0000000000000000000000000000000000000000000000000000000000000000'
// Execution fee ~0.00025 ETH (surplus renvoyé automatiquement par GMX)
const EXEC_FEE = parseUnits('0.00025', 18)
// USD en format 30 décimales GMX
const D30 = 10n ** 30n

export async function openPosition({ walletClient, publicClient, pair, isLong, collateralUsd, leverage, account }) {
  const mkt = GMX_MARKETS[pair]
  if (!mkt) throw new Error(`${pair.replace('USDT','')} non disponible — BTC · ETH · SOL · ARB · LINK`)

  // BigInt stricts — parseFloat→String→BigInt, zéro mélange
  const colUsd  = parseFloat(String(collateralUsd))
  const lev     = parseFloat(String(leverage))
  const colRaw  = parseUnits(colUsd.toFixed(6), 6)           // USDC 6 dec
  const sizeUsd = BigInt(Math.round(colUsd * lev * 1e6))     // en micro-USD
  const sizeDelta = sizeUsd * (D30 / 1_000_000n)             // → 30 dec GMX

  // Approve USDC si nécessaire
  const allowance = await publicClient.readContract({
    address: USDC_ARB, abi: ERC20_ABI,
    functionName: 'allowance', args: [account, ORDER_VAULT],
  })
  if (BigInt(allowance) < colRaw) {
    const appHash = await walletClient.writeContract({
      address: USDC_ARB, abi: ERC20_ABI,
      functionName: 'approve',
      args: [ORDER_VAULT, colRaw * 10n],
      account, chain: { id: 42161 },
    })
    await publicClient.waitForTransactionReceipt({ hash: appHash })
  }

  // Build multicall: sendTokens + createOrder
  const sendData = encodeFunctionData({
    abi: EXCHANGE_ROUTER_ABI, functionName: 'sendTokens',
    args: [USDC_ARB, ORDER_VAULT, colRaw],
  })

  const orderData = encodeFunctionData({
    abi: EXCHANGE_ROUTER_ABI, functionName: 'createOrder',
    args: [{
      addresses: {
        receiver:               account,
        cancellationReceiver:   account,
        callbackContract:       '0x0000000000000000000000000000000000000000',
        uiFeeReceiver:          GMX_REF_ACCOUNT,
        market:                 mkt.market,
        initialCollateralToken: USDC_ARB,
        swapPath:               [],
      },
      numbers: {
        sizeDeltaUsd:                sizeDelta,
        initialCollateralDeltaAmount:colRaw,
        triggerPrice:                0n,
        acceptablePrice:             isLong ? (2n**256n-1n) : 1n,
        executionFee:                EXEC_FEE,
        callbackGasLimit:            0n,
        minOutputAmount:             0n,
        validFromTime:               0n,
      },
      orderType:               ORDER_TYPE,
      decreasePositionSwapType:0n,
      isLong,
      shouldUnwrapNativeToken: false,
      autoCancel:              false,
      referralCode:            ZERO32,
    }],
  })

  return walletClient.writeContract({
    address:      EXCHANGE_ROUTER,
    abi:          EXCHANGE_ROUTER_ABI,
    functionName: 'multicall',
    args:         [[sendData, orderData]],
    value:        EXEC_FEE,
    account,
    chain:        { id: 42161 },
  })
}
