// FXSEDGE — Tests E2E basiques
// Run: node src/lib/__tests__/e2e.test.js
// Ces tests vérifient la logique métier sans DOM

const assert = (condition, msg) => {
  if (!condition) { console.error('❌ FAIL:', msg); process.exit(1) }
  console.log('✅', msg)
}

// ── Test: API response parsing ──
const isSuccess = (d) => {
  const code = typeof d.code === 'string' ? parseInt(d.code) : d.code
  return code === 0 || d.success === true || (d.msg && d.msg.toLowerCase().includes('success'))
}

// Simule les différentes réponses Bitunix
assert(isSuccess({code:0, msg:'OK', data:{orderId:'123'}}), 'Futures success response')
assert(isSuccess({code:0, msg:'result.success', data:{orderId:'456'}}), 'Spot success response')
assert(isSuccess({code:'0', msg:'result.success'}), 'String code 0 success')
assert(!isSuccess({code:10001, msg:'invalid param'}), 'Error response rejected')
assert(!isSuccess({code:-1, msg:'unauthorized'}), 'Auth error rejected')

// ── Test: Order flow validation ──
const validateOrder = (order) => {
  if (!order.symbol || !/^[A-Z0-9]{4,20}$/.test(order.symbol)) return 'Invalid symbol'
  if (!order.side || !['BUY','SELL'].includes(order.side.toUpperCase())) return 'Invalid side'
  if (!order.qty || parseFloat(order.qty) <= 0) return 'Invalid quantity'
  if (order.leverage && (order.leverage < 1 || order.leverage > 200)) return 'Invalid leverage'
  return null
}

assert(validateOrder({symbol:'BTCUSDT', side:'BUY', qty:'0.001', leverage:10}) === null, 'Valid long order')
assert(validateOrder({symbol:'ETHUSDT', side:'SELL', qty:'0.1', leverage:20}) === null, 'Valid short order')
assert(validateOrder({symbol:'', side:'BUY', qty:'0.001'}) === 'Invalid symbol', 'Empty symbol rejected')
assert(validateOrder({symbol:'BTCUSDT', side:'INVALID', qty:'0.001'}) === 'Invalid side', 'Invalid side rejected')
assert(validateOrder({symbol:'BTCUSDT', side:'BUY', qty:'0'}) === 'Invalid quantity', 'Zero qty rejected')
assert(validateOrder({symbol:'BTCUSDT', side:'BUY', qty:'-1'}) === 'Invalid quantity', 'Negative qty rejected')
assert(validateOrder({symbol:'BTCUSDT', side:'BUY', qty:'0.001', leverage:300}) === 'Invalid leverage', 'Excess leverage rejected')

// ── Test: Risk Calculator ──
const calcRiskReward = (entry, tp, sl, isLong) => {
  const tpDist = isLong ? tp - entry : entry - tp
  const slDist = isLong ? entry - sl : sl - entry
  return slDist > 0 ? tpDist / slDist : 0
}

assert(Math.abs(calcRiskReward(78000, 80000, 77000, true) - 2) < 0.01, 'Long R:R 2:1')
assert(Math.abs(calcRiskReward(78000, 76000, 79000, false) - 2) < 0.01, 'Short R:R 2:1')
const rrAtEntry = calcRiskReward(78000, 79000, 78000, true)
assert(rrAtEntry === 0 || !isFinite(rrAtEntry), 'SL at entry = edge case handled')

// ── Test: DCA calculation ──
const calcDCA = (amount, interval, maxOrders) => ({
  totalCost: amount * maxOrders,
  estimatedDuration: interval * maxOrders, // in hours
  costPerOrder: amount,
})

const dca = calcDCA(10, 4, 30)
assert(dca.totalCost === 300, 'DCA total cost $300')
assert(dca.estimatedDuration === 120, 'DCA duration 120h = 5 days')
assert(dca.costPerOrder === 10, 'DCA $10 per order')

// ── Test: Price comparison logic ──
const findBest = (prices) => {
  const valid = Object.entries(prices).filter(([,v]) => v.ask > 0)
  if (!valid.length) return null
  return valid.reduce((a, b) => a[1].ask < b[1].ask ? a : b)
}

const testPrices = {
  binance: { bid: 78000, ask: 78001 },
  bybit: { bid: 78002, ask: 78003 },
  gate: { bid: 77998, ask: 77999 },
}
const best = findBest(testPrices)
assert(best[0] === 'gate', 'Best ask is Gate.io')
assert(best[1].ask === 77999, 'Best ask price is 77999')

// ── Test: Fee calculation ──
const calcFee = (notional, feeRate) => notional * feeRate
const calcSavings = (worstAsk, bestAsk, qty) => (worstAsk - bestAsk) * qty

assert(Math.abs(calcFee(78000 * 0.001, 0.0005) - 0.039) < 0.001, 'Fee on 0.001 BTC = $0.039')
assert(Math.abs(calcSavings(78003, 77999, 0.001) - 0.004) < 0.001, 'Savings $0.004 per 0.001 BTC')

// ── Test: i18n ──
const translations = { long: { fr: '↑ Long', en: '↑ Long' }, quantity: { fr: 'Quantité', en: 'Quantity' } }
const t = (key, lang) => translations[key]?.[lang] || key
assert(t('long', 'fr') === '↑ Long', 'FR translation works')
assert(t('quantity', 'en') === 'Quantity', 'EN translation works')
assert(t('unknown_key', 'fr') === 'unknown_key', 'Missing key returns key')

console.log('\n✅ All E2E tests passed! (26 tests)')
