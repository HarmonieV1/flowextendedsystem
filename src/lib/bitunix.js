// FXSEDGE Bitunix API — signature double SHA256 conforme à la doc officielle
import { encrypt, decrypt } from './secureStorage'

const PROXY = "/api/proxy"
const FUTURES = "https://fapi.bitunix.com"
const SPOT    = "https://openapi.bitunix.com"
const KEY = "fxs_bx_v3"

// In-memory cache (cleared on page reload)
let _cachedKeys = null
let _cacheLoaded = false

// Save encrypted, then update cache
export async function saveApiKeys(k, s) {
  const encrypted = await encrypt(JSON.stringify({ k, s }))
  localStorage.setItem(KEY, encrypted)
  _cachedKeys = { k, s }
  _cacheLoaded = true
}

export const clearApiKeys = () => {
  localStorage.removeItem(KEY)
  _cachedKeys = null
  _cacheLoaded = true
}

// Async load — handles encrypted + legacy btoa format
export async function loadApiKeysAsync() {
  if (_cacheLoaded) return _cachedKeys
  const raw = localStorage.getItem(KEY) || ""
  if (!raw) { _cacheLoaded = true; return null }
  try {
    const decrypted = await decrypt(raw)
    if (!decrypted) { _cacheLoaded = true; return null }
    const { k, s } = JSON.parse(decrypted)
    if (k && s) {
      _cachedKeys = { k, s }
      // If legacy format, re-save encrypted
      if (raw === btoa(JSON.stringify({ k, s }))) {
        const newEnc = await encrypt(JSON.stringify({ k, s }))
        localStorage.setItem(KEY, newEnc)
      }
      _cacheLoaded = true
      return _cachedKeys
    }
  } catch {}
  _cacheLoaded = true
  return null
}

// Sync load (uses cache) — load asynchronously on first call, returns null if not yet loaded
export const loadApiKeys = () => _cachedKeys
export const hasApiKeys  = () => !!_cachedKeys || !!localStorage.getItem(KEY)

// Pre-load cache at module init
loadApiKeysAsync().catch(() => {})

// SHA256 hex
async function sha256(str) {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(str))
  return Array.from(new Uint8Array(buf)).map(b=>b.toString(16).padStart(2,"0")).join("")
}

// Bitunix signature: sign = SHA256( SHA256(nonce+timestamp+apiKey+queryParamsStr+bodyStr) + secretKey )
// queryParamsStr = clés triées ASCII, format "key1value1key2value2"
// bodyStr = JSON.stringify du body (sans espaces), ou "" si GET
async function makeSign(nonce, timestamp, apiKey, secretKey, qpStr, bodyStr) {
  const digest = await sha256(nonce + timestamp + apiKey + qpStr + bodyStr)
  return sha256(digest + secretKey)
}

// Trier les query params en ASCII order: "marginCoinUSDT"
function sortQP(qp) {
  if (!qp || !Object.keys(qp).length) return ""
  return Object.keys(qp).sort().map(k => k + qp[k]).join("")
}

// Input validation
function validateSymbol(s) {
  return typeof s === 'string' && /^[A-Z0-9]{2,20}$/.test(s)
}
function validateNumStr(s) {
  const n = parseFloat(s)
  return isFinite(n) && n >= 0
}

async function call(market, path, method="GET", body=null, qp={}) {
  // Ensure keys are loaded from encrypted storage
  let keys = loadApiKeys()
  if (!keys) keys = await loadApiKeysAsync()
  if (!keys) throw new Error("Clés API non configurées")
  const { k: apiKey, s: secretKey } = keys

  // Validate path
  if (typeof path !== 'string' || !path.startsWith('/api/')) {
    throw new Error("Path API invalide")
  }

  const nonce = crypto.randomUUID().replace(/-/g,"")
  const timestamp = String(Date.now())
  const base = market === "spot" ? SPOT : FUTURES

  // Build URL avec query params
  const qs = Object.keys(qp).length ? "?" + new URLSearchParams(qp) : ""
  const url = base + path + qs

  // Body string pour signature et envoi
  const bodyStr = (method === "POST" && body && Object.keys(body).length)
    ? JSON.stringify(body)
    : ""

  // Query params string pour signature
  const qpStr = sortQP(qp)

  // Signature
  const sign = await makeSign(nonce, timestamp, apiKey, secretKey, qpStr, bodyStr)

  // Payload vers le proxy Netlify
  const payload = { url, method, apiKey, sign, nonce, timestamp }
  if (method === "POST" && bodyStr) payload.body = bodyStr

  const r = await fetch(PROXY, {
    method: "POST",
    headers: {"Content-Type":"application/json"},
    body: JSON.stringify(payload),
    signal: AbortSignal.timeout(15000),
  })

  const text = await r.text()
  if (text.trim().startsWith("<")) throw new Error("Proxy non actif")
  let d
  try { d = JSON.parse(text) } catch { throw new Error("Réponse invalide: "+text.slice(0,100)) }
  const code = typeof d.code === 'string' ? parseInt(d.code) : d.code
  // Bitunix Spot returns {code:0, msg:"result.success"} — treat as success
  const isSuccess = code === 0 || d.success === true || (d.msg && d.msg.toLowerCase().includes('success'))
  if (!isSuccess) {
    console.warn('[API] Error response:', JSON.stringify(d).slice(0,300))
    throw new Error(d.msg || d.message || "Erreur " + d.code)
  }
  return d.data
}

// ── TEST ──
export async function testApiKeys() {
  try { await call("futures","/api/v1/futures/account","GET",null,{marginCoin:"USDT"}); return {ok:true} }
  catch(e) { return {ok:false,error:e.message} }
}

// ── FUTURES ──
export const futuresGetBalance    = () => call("futures","/api/v1/futures/account","GET",null,{marginCoin:"USDT"})
export const futuresGetPositions  = () => call("futures","/api/v1/futures/position/get_pending_positions")
export const futuresSetLeverage   = ({symbol,leverage}) => call("futures","/api/v1/futures/account/change_leverage","POST",{symbol,marginCoin:"USDT",leverage:String(leverage),side:"LONG"})
export const futuresPlaceOrder    = ({symbol,side,qty,price,orderType="MARKET",tradeSide="OPEN",tpPrice,slPrice}) => {
  if (!validateSymbol(symbol)) throw new Error("Symbol invalide")
  if (!validateNumStr(qty)) throw new Error("Quantité invalide")
  if (price && !validateNumStr(price)) throw new Error("Prix invalide")
  return call("futures","/api/v1/futures/trade/place_order","POST",{
    symbol, side:side.toUpperCase(), qty:String(qty),
    orderType:orderType.toUpperCase(), tradeSide:tradeSide.toUpperCase(),
    ...(price?{price:String(price)}:{}),
    ...(tpPrice?{tpPrice:String(tpPrice),tpStopType:"MARK_PRICE",tpOrderType:"MARKET"}:{}),
    ...(slPrice?{slPrice:String(slPrice),slStopType:"MARK_PRICE",slOrderType:"MARKET"}:{}),
  })
}
// Flash close — fermeture instantanée par positionId (plus fiable que place_order CLOSE)
export const futuresClosePosition = ({symbol, side, qty, positionId}) => {
  // Si on a le positionId, utiliser flash close (recommandé)
  if (positionId) {
    return call("futures","/api/v1/futures/trade/flash_close_position","POST",{positionId:String(positionId)})
  }
  // Fallback: place_order avec tradeSide CLOSE
  const closeSide = (side||'').toLowerCase() === 'long' ? 'SELL' : 'BUY'
  return call("futures","/api/v1/futures/trade/place_order","POST",{
    symbol, side:closeSide, qty:String(qty), orderType:"MARKET", tradeSide:"CLOSE"
  })
}
export const futuresCloseAll = (symbol) => call("futures","/api/v1/futures/trade/close_all_position","POST",{symbol})
export const getOpenOrders = (symbol) => call("futures","/api/v1/futures/trade/get_pending_orders","GET",null,symbol?{symbol}:{})
export const getTpslOrders = (symbol) => call("futures","/api/v1/futures/tpsl/get_pending_orders","GET",null,symbol?{symbol}:{})
export const placeTpsl = ({symbol, positionId, tpPrice, slPrice, tpQty, slQty}) =>
  call("futures","/api/v1/futures/tpsl/place_order","POST",{
    symbol, positionId: String(positionId),
    ...(tpPrice ? {tpPrice:String(tpPrice), tpStopType:"LAST_PRICE", tpOrderType:"MARKET", tpQty:String(tpQty||"")} : {}),
    ...(slPrice ? {slPrice:String(slPrice), slStopType:"LAST_PRICE", slOrderType:"MARKET", slQty:String(slQty||"")} : {}),
  })
export const cancelTpsl = (id) => call("futures","/api/v1/futures/tpsl/cancel_order","POST",{id:String(id)})
export const getMyTrades   = (symbol) => call("futures","/api/v1/futures/trade/get_history_trades","GET",null,symbol?{symbol,pageSize:"30"}:{pageSize:"30"})
export const cancelOrder   = ({orderId,symbol}) => call("futures","/api/v1/futures/trade/cancel_orders","POST",{orderIdList:[orderId],symbol})

// ── SPOT ──
export const spotGetBalance = () => call("spot","/api/spot/v1/user/account")
export const spotPlaceOrder = ({symbol,side,qty,price,orderType="MARKET"}) => {
  if (!validateSymbol(symbol)) throw new Error("Symbol invalide")
  if (!validateNumStr(qty)) throw new Error("Quantité invalide")
  const body = {
    symbol,
    side: side.toUpperCase()==="BUY" ? 2 : 1,
    type: orderType.toUpperCase()==="LIMIT" ? 1 : 2,
    volume: String(qty),
    price: String(price || "0"),
  }
  return call("spot","/api/spot/v1/order/place_order","POST", body)
}
export const spotGetOrders  = (symbol) => call("spot","/api/spot/v1/order/pending/list","POST",{symbol:symbol||""})
export const spotGetHistory = (symbol) => call("spot","/api/spot/v1/order/history/page","POST",{symbol:symbol||"",page:1,pageSize:20})

// ── ALIASES ──
export const placeOrder           = futuresPlaceOrder
export const getBalances          = futuresGetBalance
export const getFuturesBalance    = futuresGetBalance
export const getFuturesPositions  = futuresGetPositions
export const placeFuturesOrder    = futuresPlaceOrder
export const closeFuturesPosition = (symbol,side,qty) => futuresClosePosition({symbol,side,qty})
