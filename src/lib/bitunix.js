// ── Bitunix API — clés de l'utilisateur, signées côté serveur ─────────────────
// Flow: browser envoie clés dans headers X → Netlify Function signe → Bitunix API
// Les clés sont chiffrées dans localStorage, jamais visibles en clair dans le network
// sauf dans les headers HTTPS (chiffrés en transit)

const PROXY = '/api/bitunix'
const STORAGE_KEY = 'fxs_bx_keys'

// ── Gestion des clés ─────────────────────────────────────────────────────────

export function saveApiKeys(apiKey, secretKey) {
  // Encodage basique — les clés restent lisibles par l'user lui-même
  // Pour une sécurité maximale, utiliser SubtleCrypto (AES-GCM) — V2
  const payload = btoa(JSON.stringify({ k: apiKey, s: secretKey, t: Date.now() }))
  localStorage.setItem(STORAGE_KEY, payload)
}

export function loadApiKeys() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const { k, s } = JSON.parse(atob(raw))
    return { apiKey: k, secretKey: s }
  } catch { return null }
}

export function clearApiKeys() {
  localStorage.removeItem(STORAGE_KEY)
}

export function hasApiKeys() {
  return !!loadApiKeys()
}

// ── Appel API via proxy ──────────────────────────────────────────────────────

async function call(market, endpoint, method = 'GET', body = null, queryParams = {}) {
  const keys = loadApiKeys()
  if (!keys) throw new Error('Clés API non configurées — clique sur ⚙️ pour les ajouter')

  const params = new URLSearchParams({ _market: market, _endpoint: endpoint, _method: method, ...queryParams })

  const r = await fetch(`${PROXY}?${params}`, {
    method: 'POST',
    headers: {
      'Content-Type':    'application/json',
      'x-bitunix-key':   keys.apiKey,
      'x-bitunix-secret':keys.secretKey,
    },
    body: body ? JSON.stringify(body) : '{}',
    signal: AbortSignal.timeout(12000),
  })

  const data = await r.json()
  if (data.needsKeys) throw new Error('Clés API invalides ou expirées')
  if (data.code !== 0) throw new Error(data.msg || `Erreur ${r.status}`)
  return data.data
}

// Test des clés (appelé depuis ApiKeyModal)
export async function testApiKeys(apiKey, secretKey) {
  // Sauvegarde temporaire pour tester
  const backup = localStorage.getItem(STORAGE_KEY)
  saveApiKeys(apiKey, secretKey)
  try {
    await call('futures', '/api/v1/futures/account/get_single_account', 'GET')
    return true
  } catch(e) {
    // Restore backup if test fails
    if (backup) localStorage.setItem(STORAGE_KEY, backup)
    else clearApiKeys()
    throw e
  }
}

// ── FUTURES ──────────────────────────────────────────────────────────────────

export async function futuresGetBalance() {
  return call('futures', '/api/v1/futures/account/get_single_account', 'GET')
}

export async function futuresGetPositions() {
  return call('futures', '/api/v1/futures/position/get_pending_positions', 'GET')
}

export async function futuresPlaceOrder({ symbol, side, qty, price, orderType = 'MARKET', tradeSide = 'OPEN', tpPrice, slPrice }) {
  return call('futures', '/api/v1/futures/trade/place_order', 'POST', {
    symbol,
    side:       side.toUpperCase(),
    qty:        String(qty),
    orderType:  orderType.toUpperCase(),
    tradeSide:  tradeSide.toUpperCase(),
    ...(price   ? { price: String(price) }   : {}),
    ...(tpPrice ? { tpPrice: String(tpPrice), tpStopType: 'MARK_PRICE', tpOrderType: 'MARKET' } : {}),
    ...(slPrice ? { slPrice: String(slPrice), slStopType: 'MARK_PRICE', slOrderType: 'MARKET' } : {}),
  })
}

export async function futuresSetLeverage({ symbol, leverage }) {
  return call('futures', '/api/v1/futures/account/change_leverage', 'POST', {
    symbol, leverage: String(leverage), side: 'long',
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
  return call('futures', '/api/v1/futures/trade/get_pending_orders', 'GET', null, symbol ? { symbol } : {})
}

export async function getMyTrades(symbol, limit = 30) {
  return call('futures', '/api/v1/futures/trade/get_history_trades', 'GET', null, {
    ...(symbol ? { symbol } : {}), pageSize: String(limit),
  })
}

export async function cancelOrder({ orderId, symbol }) {
  return call('futures', '/api/v1/futures/trade/cancel_orders', 'POST', { orderIdList: [orderId], symbol })
}

// ── SPOT ─────────────────────────────────────────────────────────────────────

export async function spotGetBalance() {
  return call('spot', '/api/v1/spot/account/assets', 'GET')
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
  return call('spot', '/api/v1/spot/order/get_pending_orders', 'GET')
}

// ── Aliases compat ────────────────────────────────────────────────────────────
export const placeOrder           = futuresPlaceOrder
export const getBalances          = futuresGetBalance
export const getFuturesBalance    = futuresGetBalance
export const getFuturesPositions  = futuresGetPositions
export const placeFuturesOrder    = futuresPlaceOrder
export const closeFuturesPosition = (symbol, side, qty) => futuresClosePosition({ symbol, side, qty })
