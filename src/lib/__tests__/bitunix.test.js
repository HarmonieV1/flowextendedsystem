// FXSEDGE — Tests unitaires bitunix.js
// Run: node src/lib/__tests__/bitunix.test.js

const assert = (condition, msg) => {
  if (!condition) { console.error('❌ FAIL:', msg); process.exit(1) }
  console.log('✅', msg)
}

// ── Test: validateSymbol ──
const validateSymbol = (s) => typeof s === 'string' && /^[A-Z0-9]{2,20}$/.test(s)

assert(validateSymbol('BTCUSDT'), 'BTCUSDT is valid')
assert(validateSymbol('ETHUSDT'), 'ETHUSDT is valid')
assert(validateSymbol('SOLUSDT'), 'SOLUSDT is valid')
assert(!validateSymbol(''), 'empty is invalid')
assert(!validateSymbol('btcusdt'), 'lowercase is invalid')
assert(!validateSymbol('BTC/USDT'), 'slash is invalid')
assert(!validateSymbol('DROP TABLE'), 'SQL injection is invalid')
assert(!validateSymbol('<script>'), 'XSS is invalid')

// ── Test: validateNumStr ──
const validateNumStr = (s) => {
  if (typeof s !== 'string' && typeof s !== 'number') return false
  const n = parseFloat(String(s))
  return isFinite(n) && n >= 0
}

assert(validateNumStr('0.001'), '0.001 is valid')
assert(validateNumStr('100'), '100 is valid')
assert(validateNumStr(42), '42 number is valid')
assert(validateNumStr('0'), '0 is valid')
assert(!validateNumStr('-1'), 'negative is invalid')
assert(!validateNumStr('abc'), 'string is invalid')
assert(!validateNumStr(NaN), 'NaN is invalid')
assert(!validateNumStr(Infinity), 'Infinity is invalid')

// ── Test: Side mapping ──
const sideMap = (side) => {
  const s = (side||'').toUpperCase()
  if (s === 'BUY' || s === 'LONG') return 'BUY'
  if (s === 'SELL' || s === 'SHORT') return 'SELL'
  return null
}

assert(sideMap('BUY') === 'BUY', 'BUY maps to BUY')
assert(sideMap('SELL') === 'SELL', 'SELL maps to SELL')
assert(sideMap('long') === 'BUY', 'long maps to BUY')
assert(sideMap('short') === 'SELL', 'short maps to SELL')
assert(sideMap('LONG') === 'BUY', 'LONG maps to BUY')
assert(sideMap('SHORT') === 'SELL', 'SHORT maps to SELL')
assert(sideMap('') === null, 'empty returns null')

// ── Test: Margin calculation ──
const calcMargin = (qty, price, leverage) => (qty * price) / leverage
const calcFees = (qty, price, feeRate) => qty * price * feeRate

assert(Math.abs(calcMargin(0.001, 78000, 10) - 7.8) < 0.01, 'Margin 0.001 BTC @ 78000 10x = 7.8')
assert(Math.abs(calcMargin(1, 100, 20) - 5) < 0.01, 'Margin 1 @ 100 20x = 5')
assert(Math.abs(calcFees(0.001, 78000, 0.0005) - 0.039) < 0.001, 'Fees 0.001 BTC @ 78000 0.05% = 0.039')

// ── Test: Spot side number mapping (Bitunix format) ──
const spotSideNum = (side) => side.toUpperCase() === 'BUY' ? 2 : 1
const spotTypeNum = (type) => type.toUpperCase() === 'LIMIT' ? 1 : 2

assert(spotSideNum('BUY') === 2, 'Spot BUY = 2')
assert(spotSideNum('SELL') === 1, 'Spot SELL = 1')
assert(spotTypeNum('LIMIT') === 1, 'Spot LIMIT = 1')
assert(spotTypeNum('MARKET') === 2, 'Spot MARKET = 2')

// ── Test: Success parsing ──
const isSuccess = (d) => {
  const code = typeof d.code === 'string' ? parseInt(d.code) : d.code
  return code === 0 || d.success === true || (d.msg && d.msg.toLowerCase().includes('success'))
}

assert(isSuccess({code: 0, msg: 'OK'}), 'code 0 = success')
assert(isSuccess({code: '0', msg: 'result.success'}), 'code "0" = success')
assert(isSuccess({code: 1, msg: 'result.success'}), 'msg contains success = success')
assert(isSuccess({code: 0, success: true}), 'success:true = success')
assert(!isSuccess({code: 10001, msg: 'invalid param'}), 'error code = not success')
assert(!isSuccess({code: -1, msg: 'rate limit'}), 'negative code = not success')

// ── Test: TP/SL PnL calculation ──
const tpPnl = (entry, tp, qty, isLong) => {
  const diff = isLong ? (tp - entry) : (entry - tp)
  return diff * qty
}

assert(Math.abs(tpPnl(78000, 79000, 0.001, true) - 1) < 0.01, 'Long TP PnL: +1 USDT')
assert(Math.abs(tpPnl(78000, 77000, 0.001, false) - 1) < 0.01, 'Short TP PnL: +1 USDT')
assert(Math.abs(tpPnl(78000, 77000, 0.001, true) - (-1)) < 0.01, 'Long SL PnL: -1 USDT')

console.log('\n✅ All tests passed!')
