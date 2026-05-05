// Binance REST API client — signed with user's API key
// Clé API = read + trade uniquement, JAMAIS retrait
// Stockée localement, jamais envoyée à nos serveurs

const BINANCE_BASE = 'https://api.binance.com'

// ── Clé API stockée localement (chiffrée XOR simple pour obfuscation) ──
const STORAGE_KEY = 'fxs_bk'
const XOR_KEY = 'fxs2024'

function xorEncode(str) {
  return btoa(str.split('').map((c, i) =>
    String.fromCharCode(c.charCodeAt(0) ^ XOR_KEY.charCodeAt(i % XOR_KEY.length))
  ).join(''))
}

function xorDecode(encoded) {
  const str = atob(encoded)
  return str.split('').map((c, i) =>
    String.fromCharCode(c.charCodeAt(0) ^ XOR_KEY.charCodeAt(i % XOR_KEY.length))
  ).join('')
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
  } catch {
    return null
  }
}

export function clearApiKeys() {
  localStorage.removeItem(STORAGE_KEY)
}

export function hasApiKeys() {
  return !!localStorage.getItem(STORAGE_KEY)
}

// ── HMAC-SHA256 signature ──
async function sign(queryString, secretKey) {
  const encoder = new TextEncoder()
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secretKey),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  )
  const signature = await crypto.subtle.sign('HMAC', key, encoder.encode(queryString))
  return Array.from(new Uint8Array(signature)).map(b => b.toString(16).padStart(2, '0')).join('')
}

// ── Signed GET request ──
async function signedGet(path, params = {}) {
  const keys = loadApiKeys()
  if (!keys) throw new Error('API keys not configured')

  const timestamp = Date.now()
  const queryParams = { ...params, timestamp }
  const queryString = new URLSearchParams(queryParams).toString()
  const signature = await sign(queryString, keys.secretKey)

  const res = await fetch(`${BINANCE_BASE}${path}?${queryString}&signature=${signature}`, {
    headers: { 'X-MBX-APIKEY': keys.apiKey },
  })

  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.msg || `Binance error ${res.status}`)
  }
  return res.json()
}

// ── Signed POST request ──
async function signedPost(path, params = {}) {
  const keys = loadApiKeys()
  if (!keys) throw new Error('API keys not configured')

  const timestamp = Date.now()
  const queryParams = { ...params, timestamp }
  const queryString = new URLSearchParams(queryParams).toString()
  const signature = await sign(queryString, keys.secretKey)

  const res = await fetch(`${BINANCE_BASE}${path}`, {
    method: 'POST',
    headers: {
      'X-MBX-APIKEY': keys.apiKey,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: `${queryString}&signature=${signature}`,
  })

  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.msg || `Binance error ${res.status}`)
  }
  return res.json()
}

// ── Test connectivity ──
export async function testApiKeys() {
  try {
    await signedGet('/api/v3/account')
    return { ok: true }
  } catch(e) {
    return { ok: false, error: e.message }
  }
}

// ── Get account balances ──
export async function getBalances() {
  const account = await signedGet('/api/v3/account')
  return account.balances
    .filter(b => parseFloat(b.free) > 0 || parseFloat(b.locked) > 0)
    .map(b => ({
      sym: b.asset,
      free: parseFloat(b.free),
      locked: parseFloat(b.locked),
      total: parseFloat(b.free) + parseFloat(b.locked),
    }))
}

// ── Place order ──
export async function placeOrder({ symbol, side, type, quantity, price, timeInForce }) {
  const params = {
    symbol,
    side: side.toUpperCase(),   // BUY | SELL
    type: type.toUpperCase(),   // MARKET | LIMIT | STOP_LOSS_LIMIT etc
    quantity,
    ...(type.toUpperCase() !== 'MARKET' ? { price, timeInForce: timeInForce || 'GTC' } : {}),
  }
  return signedPost('/api/v3/order', params)
}

// ── Get open orders ──
export async function getOpenOrders(symbol) {
  return signedGet('/api/v3/openOrders', symbol ? { symbol } : {})
}

// ── Cancel order ──
export async function cancelOrder(symbol, orderId) {
  const keys = loadApiKeys()
  if (!keys) throw new Error('API keys not configured')
  const timestamp = Date.now()
  const params = { symbol, orderId, timestamp }
  const queryString = new URLSearchParams(params).toString()
  const signature = await sign(queryString, keys.secretKey)
  const res = await fetch(`${BINANCE_BASE}/api/v3/order?${queryString}&signature=${signature}`, {
    method: 'DELETE',
    headers: { 'X-MBX-APIKEY': keys.apiKey },
  })
  if (!res.ok) { const err = await res.json().catch(()=>{}); throw new Error(err?.msg || 'Cancel failed') }
  return res.json()
}

// ── Get trade history ──
export async function getMyTrades(symbol, limit = 50) {
  return signedGet('/api/v3/myTrades', { symbol, limit })
}
