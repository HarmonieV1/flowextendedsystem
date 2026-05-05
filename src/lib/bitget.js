// FXSEDGE — Bitget API V2 connector
import CryptoJS from 'crypto-js'

const PROXY = '/api/proxy-bitget'
const BITGET_API = 'https://api.bitget.com'

// ── Keys ──
const BG_KEY = 'fxs_bitget_keys'
export const saveBitgetKeys = (k, s, p) => localStorage.setItem(BG_KEY, btoa(JSON.stringify({k,s,p})))
export const loadBitgetKeys = () => { try { const d = JSON.parse(atob(localStorage.getItem(BG_KEY)||'')); return d?.k && d?.s && d?.p ? d : null } catch { return null } }
export const hasBitgetKeys = () => !!loadBitgetKeys()
export const clearBitgetKeys = () => localStorage.removeItem(BG_KEY)

// ── Signature ──
function sign(timestamp, method, path, body = '') {
  const keys = loadBitgetKeys()
  if (!keys) throw new Error('Bitget API keys not configured')
  const prehash = timestamp + method.toUpperCase() + path + body
  return CryptoJS.HmacSHA256(prehash, keys.s).toString(CryptoJS.enc.Base64)
}

// ── API Call ──
async function call(path, method = 'GET', body = null) {
  const keys = loadBitgetKeys()
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
