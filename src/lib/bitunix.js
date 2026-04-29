// ── Bitunix API — signature navigateur + proxy Netlify ───────────────────────
// Flow: browser calcule HMAC-SHA256 (SubtleCrypto) → appelle /bx-futures/* 
// Netlify redirect forward vers fapi.bitunix.com avec tous les headers
// Les clés sont stockées en localStorage (base64), jamais envoyées en clair

const FUTURES_PROXY = '/bx-futures'   // → fapi.bitunix.com via redirect Netlify
const SPOT_PROXY    = '/bx-spot'      // → openapi.bitunix.com via redirect Netlify
const STORAGE_KEY   = 'fxs_bx_v2'

// ── Gestion des clés ─────────────────────────────────────────────────────────

export function saveApiKeys(apiKey, secretKey) {
  const payload = btoa(JSON.stringify({ k: apiKey, s: secretKey }))
  localStorage.setItem(STORAGE_KEY, payload)
}

export function loadApiKeys() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const { k, s } = JSON.parse(atob(raw))
    if (!k || !s) return null
    return { apiKey: k, secretKey: s }
  } catch { return null }
}

export function clearApiKeys() { localStorage.removeItem(STORAGE_KEY) }
export function hasApiKeys()   { return !!loadApiKeys() }

// ── Signature HMAC-SHA256 (SubtleCrypto natif navigateur) ────────────────────

async function hmacSha256(secretKey, message) {
  const enc = new TextEncoder()
  const key = await crypto.subtle.importKey(
    'raw', enc.encode(secretKey),
    { name: 'HMAC', hash: 'SHA-256' },
    false, ['sign']
  )
  const sig = await crypto.subtle.sign('HMAC', key, enc.encode(message))
  return Array.from(new Uint8Array(sig)).map(b => b.toString(16).padStart(2,'0')).join('')
}

function sortedStr(obj) {
  return Object.keys(obj || {}).sort().map(k => `${k}${obj[k]}`).join('')
}

function nonce32() {
  return Array.from(crypto.getRandomValues(new Uint8Array(16)))
    .map(b => b.toString(16).padStart(2,'0')).join('')
}

// ── Appel API ────────────────────────────────────────────────────────────────

async function call(market, path, method = 'GET', body = null, queryParams = {}) {
  const keys = loadApiKeys()
  if (!keys) throw new Error('Clés API non configurées — clique ⚙️ pour les ajouter')

  const { apiKey, secretKey } = keys
  const nonce     = nonce32()
  const timestamp = String(Date.now())

  // Sérialiser le body
  const bodyObj = body || {}
  const bodyStr = method === 'GET' ? '' : JSON.stringify(bodyObj)
  const bodyForSign = method === 'GET' ? {} : bodyObj

  // Signature
  const message = `${nonce}${timestamp}${apiKey}${sortedStr(queryParams)}${sortedStr(bodyForSign)}`
  const sign    = await hmacSha256(secretKey, message)

  // URL via proxy Netlify
  const base = market === 'spot' ? SPOT_PROXY : FUTURES_PROXY
  const qs   = Object.keys(queryParams).length
    ? '?' + new URLSearchParams(queryParams).toString()
    : ''
  const url  = base + path + qs

  const r = await fetch(url, {
    method,
    headers: {
      'api-key':      apiKey,
      'sign':         sign,
      'nonce':        nonce,
      'timestamp':    timestamp,
      'language':     'en-US',
      'Content-Type': 'application/json',
    },
    ...(method !== 'GET' ? { body: bodyStr } : {}),
    signal: AbortSignal.timeout(12000),
  })

  const data = await r.json()
  if (data.code !== 0) throw new Error(data.msg || `Erreur ${r.status}`)
  return data.data
}

// ── Test des clés ────────────────────────────────────────────────────────────

export async function testApiKeys(apiKey, secretKey) {
  // Sauvegarder temporairement et tester
  const backup = localStorage.getItem(STORAGE_KEY)
  saveApiKeys(apiKey, secretKey)
  try {
    await call('futures', '/api/v1/futures/account/get_single_account')
    return true
  } catch(e) {
    // Restore
    if (backup) localStorage.setItem(STORAGE_KEY, backup)
    else clearApiKeys()
    throw e
  }
}

// ── FUTURES ──────────────────────────────────────────────────────────────────

export async function futuresGetBalance() {
  return call('futures', '/api/v1/futures/account/get_single_account')
}

export async function futuresGetPositions() {
  return call('futures', '/api/v1/futures/position/get_pending_positions')
}

export async function futuresSetLeverage({ symbol, leverage }) {
  return call('futures', '/api/v1/futures/account/change_leverage', 'POST', {
    symbol, leverage: String(leverage), side: 'long',
  })
}

export async function futuresPlaceOrder({ symbol, side, qty, price, orderType = 'MARKET', tradeSide = 'OPEN', tpPrice, slPrice }) {
  return call('futures', '/api/v1/futures/trade/place_order', 'POST', {
    symbol,
    side:      side.toUpperCase(),
    qty:       String(qty),
    orderType: orderType.toUpperCase(),
    tradeSide: tradeSide.toUpperCase(),
    ...(price   ? { price:   String(price)   } : {}),
    ...(tpPrice ? { tpPrice: String(tpPrice), tpStopType: 'MARK_PRICE', tpOrderType: 'MARKET' } : {}),
    ...(slPrice ? { slPrice: String(slPrice), slStopType: 'MARK_PRICE', slOrderType: 'MARKET' } : {}),
  })
}

export async function futuresClosePosition({ symbol, side, qty }) {
  return call('futures', '/api/v1/futures/trade/place_order', 'POST', {
    symbol,
    side:      side === 'long' ? 'SELL' : 'BUY',
    qty:       String(qty),
    orderType: 'MARKET',
    tradeSide: 'CLOSE',
  })
}

export async function getOpenOrders(symbol) {
  return call('futures', '/api/v1/futures/trade/get_pending_orders', 'GET', null,
    symbol ? { symbol } : {}
  )
}

export async function getMyTrades(symbol, limit = 30) {
  return call('futures', '/api/v1/futures/trade/get_history_trades', 'GET', null, {
    ...(symbol ? { symbol } : {}), pageSize: String(limit),
  })
}

export async function cancelOrder({ orderId, symbol }) {
  return call('futures', '/api/v1/futures/trade/cancel_orders', 'POST', {
    orderIdList: [orderId], symbol,
  })
}

// ── SPOT ─────────────────────────────────────────────────────────────────────

export async function spotGetBalance() {
  return call('spot', '/api/v1/spot/account/assets')
}

export async function spotPlaceOrder({ symbol, side, qty, price, orderType = 'MARKET' }) {
  return call('spot', '/api/v1/spot/order/place_order', 'POST', {
    symbol,
    side:      side.toUpperCase(),
    qty:       String(qty),
    orderType: orderType.toUpperCase(),
    ...(price ? { price: String(price) } : {}),
  })
}

export async function spotGetOrders() {
  return call('spot', '/api/v1/spot/order/get_pending_orders')
}

// ── Aliases compatibilité ────────────────────────────────────────────────────
export const placeOrder           = futuresPlaceOrder
export const getBalances          = futuresGetBalance
export const getFuturesBalance    = futuresGetBalance
export const getFuturesPositions  = futuresGetPositions
export const placeFuturesOrder    = futuresPlaceOrder
export const closeFuturesPosition = (symbol, side, qty) => futuresClosePosition({ symbol, side, qty })
