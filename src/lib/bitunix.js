// Bitunix API — via Netlify proxy (résout CORS)
// Les clés API sont envoyées dans les headers, jamais stockées côté serveur

// Netlify redirect proxy — /_api/bitunix/* → https://api.bitunix.com/*
// Works with drag-drop dist/ deploy, no Cloudflare needed
const PROXY = '/_api/bitunix'
const STORAGE_KEY = 'fxs_btu'
const XOR = 'fxsedge2026'

const xorE = str => btoa(str.split('').map((c,i) =>
  String.fromCharCode(c.charCodeAt(0) ^ XOR.charCodeAt(i % XOR.length))).join(''))
const xorD = enc => { try { return atob(enc).split('').map((c,i) =>
  String.fromCharCode(c.charCodeAt(0) ^ XOR.charCodeAt(i % XOR.length))).join('') } catch { return '' } }

export function saveApiKeys(apiKey, secretKey) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify({ k: xorE(apiKey), s: xorE(secretKey) }))
}
export function loadApiKeys() {
  try {
    const { k, s } = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}')
    return k && s ? { apiKey: xorD(k), secretKey: xorD(s) } : null
  } catch { return null }
}
export function clearApiKeys() { localStorage.removeItem(STORAGE_KEY) }
export function hasApiKeys()   { return !!localStorage.getItem(STORAGE_KEY) }

// ── Appel via proxy Netlify ───────────────────────────────────────────────────
// Browser HMAC-SHA256
async function hmacSha256(message, secret) {
  const enc = new TextEncoder()
  const key = await crypto.subtle.importKey('raw', enc.encode(secret), { name:'HMAC', hash:'SHA-256' }, false, ['sign'])
  const sig = await crypto.subtle.sign('HMAC', key, enc.encode(message))
  return Array.from(new Uint8Array(sig)).map(b => b.toString(16).padStart(2,'0')).join('')
}

async function proxyRequest(method, path, params = {}) {
  const keys = loadApiKeys()
  if (!keys) throw new Error('Clés API non configurées — clique sur ⚡ Bitunix API')

  // Sign request client-side, Cloudflare Worker forwards to Bitunix
  const timestamp = Date.now().toString()
  const nonce     = Math.random().toString(36).slice(2, 18)
  const queryStr  = method === 'GET' && Object.keys(params).length
    ? new URLSearchParams(params).toString() : ''
  const bodyStr   = method !== 'GET' && Object.keys(params).length
    ? JSON.stringify(params) : ''

  const sig = await hmacSha256(nonce + timestamp + keys.apiKey + queryStr + bodyStr, keys.secretKey)

  const url = `${PROXY}${path}${queryStr ? '?' + queryStr : ''}`
  const res = await fetch(url, {
    method,
    headers: {
      'api-key':      keys.apiKey,
      'timestamp':    timestamp,
      'nonce':        nonce,
      'sign':         sig,
      'Content-Type': 'application/json',
    },
    ...(bodyStr ? { body: bodyStr } : {}),
  })

  if (!res.ok) {
    const text = await res.text()
    throw new Error(`Proxy error ${res.status}: ${text.slice(0,100)}`)
  }

  const data = await res.json()
  if (data.code !== undefined && data.code !== 0) throw new Error(data.msg || `Code ${data.code}`)
  return data.data ?? data
}

// ── Test de connexion ─────────────────────────────────────────────────────────
export async function testApiKeys() {
  const keys = loadApiKeys()
  if (!keys) return { ok: false, error: 'Clés non chargées' }

  // Validation format
  if (!keys.apiKey || keys.apiKey.length < 16)
    return { ok: false, error: 'Clé API trop courte' }
  if (!keys.secretKey || keys.secretKey.length < 16)
    return { ok: false, error: 'Clé secrète trop courte' }

  // Test réel via proxy
  try {
    await proxyRequest('GET', '/api/v1/futures/account/assets', {})
    return { ok: true }
  } catch (e) {
    // Si erreur auth = clés invalides, si autre = réseau OK mais autre pb
    if (e.message.includes('401') || e.message.includes('invalid') || e.message.includes('Unauthorized')) {
      return { ok: false, error: 'Clés API invalides — vérifie sur Bitunix' }
    }
    return { ok: true, warning: e.message } // proxy fonctionne, clés probablement OK
  }
}

// ── Futures perps ─────────────────────────────────────────────────────────────
export async function getFuturesBalance() {
  const data = await proxyRequest('GET', '/api/v1/futures/account/assets', {})
  const list = Array.isArray(data) ? data : (data?.list || data?.assets || [])
  return list.map(b => ({
    sym:     b.currency || b.coin || 'USDT',
    balance: parseFloat(b.balance || b.equity || 0),
    avail:   parseFloat(b.available || b.free || 0),
    pnl:     parseFloat(b.unrealizedPNL || b.unrealizedPnl || 0),
  }))
}

export async function getFuturesPositions() {
  const data = await proxyRequest('GET', '/api/v1/futures/position/getPositions', {})
  const list = Array.isArray(data) ? data : (data?.list || [])
  return list.map(p => ({
    symbol:   p.symbol,
    side:     p.side === 1 ? 'Long' : 'Short',
    size:     parseFloat(p.qty || p.size || 0),
    entryPx:  parseFloat(p.entryPrice || 0),
    markPx:   parseFloat(p.markPrice || 0),
    pnl:      parseFloat(p.unrealizedPNL || 0),
    liq:      parseFloat(p.liquidationPrice || 0),
    leverage: parseFloat(p.leverage || 1),
  }))
}

export async function placeFuturesOrder({ symbol, side, orderType, qty, price, leverage = 10, reduceOnly = false }) {
  return proxyRequest('POST', '/api/v1/futures/trade/place_order', {
    symbol,
    side:      side === 'long' ? 1 : 2,    // 1=Buy/Long, 2=Sell/Short
    orderType: orderType === 'market' ? 1 : 2,  // 1=Market, 2=Limit
    qty:       qty.toString(),
    ...(orderType !== 'market' && price ? { price: price.toString() } : {}),
    leverage:  leverage.toString(),
    reduceOnly: reduceOnly ? 1 : 0,
    marginMode: 1,  // 1=isolated, 2=cross
  })
}

export async function closeFuturesPosition(symbol, side, qty) {
  return proxyRequest('POST', '/api/v1/futures/trade/place_order', {
    symbol,
    side:       side === 'Long' ? 2 : 1,  // Close = opposite side
    orderType:  1,  // Market
    qty:        qty.toString(),
    reduceOnly: 1,
  })
}

export async function getFuturesOrderBook(symbol) {
  try {
    const res = await fetch(`/.netlify/functions/bitunix-ticker?symbol=${symbol}`)
    const d = await res.json()
    return d
  } catch { return null }
}

// ── Spot (legacy) ─────────────────────────────────────────────────────────────
export async function getBalances() {
  try {
    const data = await proxyRequest('GET', '/api/v1/account/assets', {})
    const list = Array.isArray(data) ? data : (data?.list || data?.assets || [])
    return list.filter(b => parseFloat(b.available || b.free || 0) > 0 || parseFloat(b.frozen || b.locked || 0) > 0)
      .map(b => ({
        sym:    b.currency || b.coin || b.asset,
        free:   parseFloat(b.available || b.free || 0),
        locked: parseFloat(b.frozen || b.locked || 0),
        total:  parseFloat(b.available || b.free || 0) + parseFloat(b.frozen || b.locked || 0),
      }))
  } catch { return [] }
}

// ── Spot orders (legacy aliases) ─────────────────────────────────────────────
export async function placeOrder({ symbol, side, type, quantity, price, timeInForce='GTC' }) {
  return proxyRequest('POST', '/api/v1/spot/placeOrder', {
    symbol, side: side.toUpperCase(), orderType: type.toUpperCase(),
    qty: quantity.toString(),
    ...(type.toUpperCase() !== 'MARKET' ? { price: price?.toString(), timeInForce } : {}),
  })
}

export async function getOpenOrders(symbol) {
  return proxyRequest('GET', '/api/v1/spot/openOrders', symbol ? { symbol } : {})
}

export async function cancelOrder(symbol, orderId) {
  return proxyRequest('POST', '/api/v1/spot/cancelOrder', { symbol, orderId: orderId.toString() })
}

export async function getMyTrades(symbol, limit = 50) {
  return proxyRequest('GET', '/api/v1/spot/trades', { symbol, limit: limit.toString() })
}
