// Bitunix API client — signed HMAC-SHA256
// Docs: https://docs.bitunix.com
// Permission requise : Lecture + Spot Trading (JAMAIS Retrait)

const BITUNIX_BASE = 'https://api.bitunix.com'

// ── Stockage local des clés (obfuscation XOR) ──
const STORAGE_KEY = 'fxs_btu'
const XOR_KEY = 'fxs2025'

function xorEncode(str) {
  return btoa(str.split('').map((c, i) =>
    String.fromCharCode(c.charCodeAt(0) ^ XOR_KEY.charCodeAt(i % XOR_KEY.length))
  ).join(''))
}
function xorDecode(encoded) {
  try {
    const str = atob(encoded)
    return str.split('').map((c, i) =>
      String.fromCharCode(c.charCodeAt(0) ^ XOR_KEY.charCodeAt(i % XOR_KEY.length))
    ).join('')
  } catch { return '' }
}

export function saveApiKeys(apiKey, secretKey) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify({
    k: xorEncode(apiKey),
    s: xorEncode(secretKey),
  }))
}
export function loadApiKeys() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const { k, s } = JSON.parse(raw)
    return { apiKey: xorDecode(k), secretKey: xorDecode(s) }
  } catch { return null }
}
export function clearApiKeys() { localStorage.removeItem(STORAGE_KEY) }
export function hasApiKeys() { return !!localStorage.getItem(STORAGE_KEY) }

// ── HMAC-SHA256 ──
async function sign(message, secret) {
  const enc = new TextEncoder()
  const key = await crypto.subtle.importKey('raw', enc.encode(secret), { name:'HMAC', hash:'SHA-256' }, false, ['sign'])
  const sig = await crypto.subtle.sign('HMAC', key, enc.encode(message))
  return Array.from(new Uint8Array(sig)).map(b => b.toString(16).padStart(2,'0')).join('')
}

// ── Signed request ──
// Bitunix signing: timestamp + nonce + method + path + body
async function signedRequest(method, path, params = {}) {
  const keys = loadApiKeys()
  if (!keys) throw new Error('Clés API Bitunix non configurées')

  const timestamp = Date.now().toString()
  const nonce = Math.random().toString(36).slice(2, 10)
  const body = method === 'GET' ? '' : JSON.stringify(params)
  const queryString = method === 'GET' && Object.keys(params).length
    ? '?' + new URLSearchParams(params).toString()
    : ''

  // Bitunix signature: HMAC of (timestamp + nonce + method + path + body)
  const message = timestamp + nonce + method.toUpperCase() + path + body
  const signature = await sign(message, keys.secretKey)

  const headers = {
    'api-key': keys.apiKey,
    'timestamp': timestamp,
    'nonce': nonce,
    'sign': signature,
    'Content-Type': 'application/json',
  }

  const res = await fetch(`${BITUNIX_BASE}${path}${queryString}`, {
    method,
    headers,
    ...(method !== 'GET' ? { body } : {}),
  })

  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.msg || err.message || `Bitunix error ${res.status}`)
  }

  const data = await res.json()
  if (data.code && data.code !== 0 && data.code !== 200) {
    throw new Error(data.msg || data.message || `Bitunix API error: ${data.code}`)
  }

  return data.data ?? data
}

// ── Test connexion ──
export async function testApiKeys() {
  try {
    await signedRequest('GET', '/api/v1/account/info')
    return { ok: true }
  } catch(e) {
    return { ok: false, error: e.message }
  }
}

// ── Balances ──
export async function getBalances() {
  const data = await signedRequest('GET', '/api/v1/account/balance')
  const assets = Array.isArray(data) ? data : (data.list || data.balances || [])
  return assets
    .filter(b => parseFloat(b.available || b.free || 0) > 0 || parseFloat(b.frozen || b.locked || 0) > 0)
    .map(b => ({
      sym: b.currency || b.coin || b.asset,
      free: parseFloat(b.available || b.free || 0),
      locked: parseFloat(b.frozen || b.locked || 0),
      total: parseFloat(b.available || b.free || 0) + parseFloat(b.frozen || b.locked || 0),
    }))
}

// ── Place order ──
export async function placeOrder({ symbol, side, type, quantity, price, timeInForce = 'GTC' }) {
  const body = {
    symbol,
    side: side.toUpperCase(),    // BUY | SELL
    orderType: type.toUpperCase(), // MARKET | LIMIT
    qty: quantity.toString(),
    ...(type.toUpperCase() !== 'MARKET' ? { price: price?.toString(), timeInForce } : {}),
  }
  return signedRequest('POST', '/api/v1/spot/order', body)
}

// ── Ordres ouverts ──
export async function getOpenOrders(symbol) {
  return signedRequest('GET', '/api/v1/spot/openOrders', symbol ? { symbol } : {})
}

// ── Annuler un ordre ──
export async function cancelOrder(symbol, orderId) {
  return signedRequest('POST', '/api/v1/spot/cancelOrder', { symbol, orderId })
}

// ── Historique des trades ──
export async function getMyTrades(symbol, limit = 50) {
  return signedRequest('GET', '/api/v1/spot/myTrades', { symbol, limit })
}
