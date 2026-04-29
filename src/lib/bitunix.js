// ── Bitunix API Client — via Netlify Function proxy ─────────────────────────
// La signature HMAC est faite côté serveur (secretKey jamais exposée)
// Browser → /api/bitunix?_market=futures&_endpoint=/api/v1/...
// Proxy → fapi.bitunix.com avec HMAC signé

const PROXY = '/api/bitunix'

async function call(market, endpoint, method = 'GET', body = null, queryParams = {}) {
  const params = new URLSearchParams({
    _market:   market,
    _endpoint: endpoint,
    _method:   method,
    ...queryParams,
  })

  const r = await fetch(`${PROXY}?${params}`, {
    method:  'POST', // On passe toujours en POST vers notre proxy
    headers: { 'Content-Type': 'application/json' },
    body:    body ? JSON.stringify(body) : null,
    signal:  AbortSignal.timeout(12000),
  })

  const data = await r.json()
  if (!r.ok || data.code !== 0) {
    throw new Error(data.msg || data.error || `Erreur ${r.status}`)
  }
  return data.data
}

// ── FUTURES ─────────────────────────────────────────────────────────────────

export async function futuresPlaceOrder({ symbol, side, qty, price, orderType = 'MARKET', leverage, tradeSide = 'OPEN', tpPrice, slPrice }) {
  // side: BUY | SELL
  // tradeSide: OPEN | CLOSE
  const body = {
    symbol,
    side,
    qty:       String(qty),
    orderType,
    tradeSide,
    ...(price     ? { price: String(price) }     : {}),
    ...(tpPrice   ? { tpPrice: String(tpPrice), tpStopType: 'MARK_PRICE', tpOrderType: 'MARKET' } : {}),
    ...(slPrice   ? { slPrice: String(slPrice), slStopType: 'MARK_PRICE', slOrderType: 'MARKET' } : {}),
  }
  return call('futures', '/api/v1/futures/trade/place_order', 'POST', body)
}

export async function futuresGetPositions() {
  return call('futures', '/api/v1/futures/position/get_pending_positions', 'GET')
}

export async function futuresGetBalance() {
  return call('futures', '/api/v1/futures/account/get_single_account', 'GET')
}

export async function futuresClosePosition({ symbol, qty, side }) {
  // Close = inverse du side ouvert
  const closeSide = side === 'BUY' ? 'SELL' : 'BUY'
  return call('futures', '/api/v1/futures/trade/place_order', 'POST', {
    symbol,
    side:      closeSide,
    qty:       String(qty),
    orderType: 'MARKET',
    tradeSide: 'CLOSE',
  })
}

export async function futuresSetLeverage({ symbol, leverage }) {
  return call('futures', '/api/v1/futures/account/change_leverage', 'POST', {
    symbol,
    leverage: String(leverage),
    side:     'long',
  })
}

// ── SPOT ─────────────────────────────────────────────────────────────────────

export async function spotPlaceOrder({ symbol, side, qty, price, orderType = 'MARKET' }) {
  // symbol: BTCUSDT
  // side: BUY | SELL
  const body = {
    symbol,
    side,
    qty:       String(qty),
    orderType,
    ...(price ? { price: String(price) } : {}),
  }
  return call('spot', '/api/v1/spot/order/place_order', 'POST', body)
}

export async function spotGetBalance() {
  return call('spot', '/api/v1/spot/account/assets', 'GET')
}

export async function spotGetOrders() {
  return call('spot', '/api/v1/spot/order/get_pending_orders', 'GET')
}

// ── Compatibility exports (used by OrdersPanel) ──────────────────────────────
export function hasApiKeys() {
  // Clés configurées côté serveur Netlify — pas accessibles depuis le browser
  // On assume True si la Netlify Function répond
  return true // The proxy will return error if no keys
}

export async function getOpenOrders(pair) {
  return call('futures', '/api/v1/futures/trade/get_pending_orders', 'GET', null, pair ? { symbol: pair } : {})
}

export async function getMyTrades(pair, limit = 30) {
  return call('futures', '/api/v1/futures/trade/get_history_trades', 'GET', null, {
    ...(pair ? { symbol: pair } : {}),
    pageSize: String(limit),
  })
}

export async function cancelOrder({ orderId, symbol }) {
  return call('futures', '/api/v1/futures/trade/cancel_orders', 'POST', { orderIdList: [orderId], symbol })
}

// Spot aliases
export const spotGetOrders_ = spotGetOrders

// Keys management — avec Netlify Function, les clés sont dans les env vars Netlify
// Ces fonctions sont des stubs pour compatibilité avec l'ApiKeyModal existant
export function saveApiKeys(apiKey, secretKey) {
  // Les clés ne sont PAS stockées dans le browser — elles doivent être dans Netlify env vars
  // Cette fonction informe l'utilisateur
  console.warn('Keys must be set as Netlify environment variables BITUNIX_API_KEY and BITUNIX_SECRET_KEY')
}

export function clearApiKeys() {
  // No-op — keys are server-side
}

export async function testApiKeys(apiKey, secretKey) {
  // Test via proxy (les clés doivent être déjà dans Netlify)
  try {
    const r = await fetch('/api/bitunix?_market=futures&_endpoint=/api/v1/futures/account/get_single_account&_method=GET', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }
    })
    const d = await r.json()
    return d.code === 0
  } catch { return false }
}

// Futures balance alias
export async function getFuturesBalance() { return futuresGetBalance() }
export async function getFuturesPositions() { return futuresGetPositions() }
export async function placeFuturesOrder(p) { return futuresPlaceOrder(p) }
export async function closeFuturesPosition(symbol, side, qty) {
  return futuresClosePosition({ symbol, side, qty })
}

export const placeOrder       = futuresPlaceOrder
export const getBalances      = futuresGetBalance
