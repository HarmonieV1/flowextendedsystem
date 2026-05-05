// FXSEDGE — Bitget API V2 connector
import CryptoJS from 'crypto-js'
import { encrypt, decrypt } from './secureStorage'

const PROXY = '/api/proxy-bitget'
const BITGET_API = 'https://api.bitget.com'

// ── Keys (encrypted) ──
const BG_KEY = 'fxs_bitget_keys'

let _cachedBgKeys = null
let _bgLoaded = false

export async function saveBitgetKeys(k, s, p) {
  const encrypted = await encrypt(JSON.stringify({ k, s, p }))
  localStorage.setItem(BG_KEY, encrypted)
  _cachedBgKeys = { k, s, p }
  _bgLoaded = true
}

export async function loadBitgetKeysAsync() {
  if (_bgLoaded) return _cachedBgKeys
  const raw = localStorage.getItem(BG_KEY) || ""
  if (!raw) { _bgLoaded = true; return null }
  try {
    const decrypted = await decrypt(raw)
    if (!decrypted) { _bgLoaded = true; return null }
    const d = JSON.parse(decrypted)
    if (d?.k && d?.s && d?.p) {
      _cachedBgKeys = d
      // Re-save encrypted if legacy format
      if (raw === btoa(JSON.stringify(d))) {
        const newEnc = await encrypt(JSON.stringify(d))
        localStorage.setItem(BG_KEY, newEnc)
      }
      _bgLoaded = true
      return _cachedBgKeys
    }
  } catch {}
  _bgLoaded = true
  return null
}

export const loadBitgetKeys = () => _cachedBgKeys
export const hasBitgetKeys  = () => !!_cachedBgKeys || !!localStorage.getItem(BG_KEY)
export const clearBitgetKeys = () => {
  localStorage.removeItem(BG_KEY)
  _cachedBgKeys = null
  _bgLoaded = true
}

// Pre-load cache at module init
loadBitgetKeysAsync().catch(() => {})

// ── Signature ──
function sign(timestamp, method, path, body = '') {
  const keys = loadBitgetKeys()
  if (!keys) throw new Error('Bitget API keys not configured')
  const prehash = timestamp + method.toUpperCase() + path + body
  return CryptoJS.HmacSHA256(prehash, keys.s).toString(CryptoJS.enc.Base64)
}

// ── API Call ──
async function call(path, method = 'GET', body = null) {
  let keys = loadBitgetKeys()
  if (!keys) keys = await loadBitgetKeysAsync()
  if (!keys) throw new Error('Connect Bitget API first')
  
  const timestamp = Date.now().toString()
  const bodyStr = body ? JSON.stringify(body) : ''
  const signature = sign(timestamp, method, path, bodyStr)

  const r = await fetch(PROXY, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      url: BITGET_API + path,
      method,
      body: bodyStr,
      headers: {
        'ACCESS-KEY': keys.k,
        'ACCESS-SIGN': signature,
        'ACCESS-TIMESTAMP': timestamp,
        'ACCESS-PASSPHRASE': keys.p,
        'Content-Type': 'application/json',
        'locale': 'en-US',
      }
    }),
    signal: AbortSignal.timeout(15000),
  })

  const text = await r.text()
  let d
  try { d = JSON.parse(text) } catch { throw new Error('Invalid response') }
  if (d.code !== '00000') throw new Error(d.msg || 'Bitget error ' + d.code)
  return d.data
}

// ── Account ──
export const bitgetFuturesBalance = () => call('/api/v2/mix/account/accounts?productType=USDT-FUTURES')
export const bitgetSpotBalance = () => call('/api/v2/spot/account/assets')

// ── Futures Trading ──
export const bitgetPlaceOrder = ({ symbol, side, qty, price, orderType = 'market', leverage = 10 }) => {
  return call('/api/v2/mix/order/place-order', 'POST', {
    symbol: symbol + '_UMCBL',
    productType: 'USDT-FUTURES',
    marginMode: 'crossed',
    marginCoin: 'USDT',
    side: side.toLowerCase(),
    orderType: orderType.toLowerCase(),
    size: String(qty),
    price: price ? String(price) : undefined,
    leverage: String(leverage),
  })
}

export const bitgetGetPositions = () => call('/api/v2/mix/position/all-position?productType=USDT-FUTURES')
export const bitgetClosePosition = ({ symbol, side }) => {
  return call('/api/v2/mix/order/close-positions', 'POST', {
    symbol: symbol + '_UMCBL',
    productType: 'USDT-FUTURES',
    holdSide: side.toLowerCase(),
  })
}

// ── Spot Trading ──
export const bitgetSpotOrder = ({ symbol, side, qty, price, orderType = 'market' }) => {
  return call('/api/v2/spot/trade/place-order', 'POST', {
    symbol,
    side: side.toLowerCase(),
    orderType: orderType.toLowerCase(),
    size: String(qty),
    price: price ? String(price) : undefined,
    force: 'gtc',
  })
}

// ── Orders ──
export const bitgetGetOrders = (symbol) => {
  const params = new URLSearchParams({ productType: 'USDT-FUTURES' })
  if (symbol) params.set('symbol', symbol + '_UMCBL')
  return call('/api/v2/mix/order/orders-pending?' + params.toString())
}

// ── Trade history ──
export const bitgetGetHistory = (symbol) => {
  const endTime = Date.now()
  const startTime = endTime - 7 * 24 * 60 * 60 * 1000 // 7 jours
  const params = new URLSearchParams({
    productType: 'USDT-FUTURES',
    startTime: String(startTime),
    endTime: String(endTime),
    pageSize: '30',
  })
  if (symbol) params.set('symbol', symbol + '_UMCBL')
  return call('/api/v2/mix/order/fills-history?' + params.toString())
}
