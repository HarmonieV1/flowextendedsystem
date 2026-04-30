// Bitunix API — clés stockées localement, Edge Function signe côté serveur
const PROXY = "/bx"   // futures → fapi.bitunix.com
const SPRXY = "/bxs"  // spot    → openapi.bitunix.com
const KEY   = "fxs_bx_v3"

export const saveApiKeys  = (k, s) => localStorage.setItem(KEY, btoa(JSON.stringify({k,s})))
export const clearApiKeys = ()     => localStorage.removeItem(KEY)
export const loadApiKeys  = ()     => { try { const {k,s}=JSON.parse(atob(localStorage.getItem(KEY)||"")); return k&&s?{k,s}:null } catch{return null} }
export const hasApiKeys   = ()     => !!loadApiKeys()

async function call(proxy, path, method="GET", body=null, qp={}) {
  const keys = loadApiKeys()
  if (!keys) throw new Error("Clés API manquantes")
  const qs = new URLSearchParams({e:path, x:method, ...qp}).toString()
  const r  = await fetch(`${proxy}?${qs}`, {
    method: "POST",
    headers: { "Content-Type":"application/json", "x-bx-key":keys.k, "x-bx-secret":keys.s },
    body: body ? JSON.stringify(body) : "{}",
    signal: AbortSignal.timeout(12000),
  })
  const d = await r.json()
  if (d.needsKeys) throw new Error("Clés invalides")
  if (d.code !== 0) throw new Error(d.msg || `Erreur ${r.status}`)
  return d.data
}

export async function testApiKeys() {
  try {
    await call(PROXY, "/api/v1/futures/account/get_single_account")
    return { ok: true }
  } catch(e) {
    return { ok: false, error: e.message }
  }
}

// Futures
export const futuresGetBalance   = () => call(PROXY, "/api/v1/futures/account/get_single_account")
export const futuresGetPositions = () => call(PROXY, "/api/v1/futures/position/get_pending_positions")
export const futuresSetLeverage  = ({symbol,leverage}) => call(PROXY, "/api/v1/futures/account/change_leverage","POST",{symbol,leverage:String(leverage),side:"long"})
export const futuresPlaceOrder   = ({symbol,side,qty,price,orderType="MARKET",tradeSide="OPEN",tpPrice,slPrice}) =>
  call(PROXY, "/api/v1/futures/trade/place_order", "POST", {
    symbol, side:side.toUpperCase(), qty:String(qty),
    orderType:orderType.toUpperCase(), tradeSide:tradeSide.toUpperCase(),
    ...(price?{price:String(price)}:{}),
    ...(tpPrice?{tpPrice:String(tpPrice),tpStopType:"MARK_PRICE",tpOrderType:"MARKET"}:{}),
    ...(slPrice?{slPrice:String(slPrice),slStopType:"MARK_PRICE",slOrderType:"MARKET"}:{}),
  })
export const futuresClosePosition = ({symbol,side,qty}) =>
  call(PROXY, "/api/v1/futures/trade/place_order", "POST", {
    symbol, side:side==="long"?"SELL":"BUY", qty:String(qty), orderType:"MARKET", tradeSide:"CLOSE"
  })
export const getOpenOrders = (symbol) => call(PROXY, "/api/v1/futures/trade/get_pending_orders","GET",null,symbol?{symbol}:{})
export const getMyTrades   = (symbol) => call(PROXY, "/api/v1/futures/trade/get_history_trades","GET",null,symbol?{symbol,pageSize:"30"}:{pageSize:"30"})
export const cancelOrder   = ({orderId,symbol}) => call(PROXY, "/api/v1/futures/trade/cancel_orders","POST",{orderIdList:[orderId],symbol})

// Spot
export const spotGetBalance  = () => call(SPRXY, "/api/v1/spot/account/assets")
export const spotPlaceOrder  = ({symbol,side,qty,price,orderType="MARKET"}) =>
  call(SPRXY, "/api/v1/spot/order/place_order","POST",{
    symbol, side:side.toUpperCase(), qty:String(qty),
    orderType:orderType.toUpperCase(), ...(price?{price:String(price)}:{})
  })
export const spotGetOrders   = () => call(SPRXY, "/api/v1/spot/order/get_pending_orders")

// Aliases
export const placeOrder           = futuresPlaceOrder
export const getBalances          = futuresGetBalance
export const getFuturesBalance    = futuresGetBalance
export const getFuturesPositions  = futuresGetPositions
export const placeFuturesOrder    = futuresPlaceOrder
export const closeFuturesPosition = (symbol,side,qty) => futuresClosePosition({symbol,side,qty})
