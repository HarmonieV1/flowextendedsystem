// FXSEDGE Public API — Comparator data endpoint
// GET /api/prices?pair=BTCUSDT

export default async (req) => {
  const url = new URL(req.url)
  const pair = (url.searchParams.get('pair') || 'BTCUSDT').toUpperCase()

  // Validate pair
  if (!/^[A-Z0-9]{4,20}$/.test(pair)) {
    return new Response(JSON.stringify({ error: 'Invalid pair' }), { status: 400, headers: corsHeaders() })
  }

  try {
    // Fetch from multiple exchanges in parallel
    const [binance, bybit] = await Promise.all([
      fetch(`https://api.binance.com/api/v3/ticker/bookTicker?symbol=${pair}`).then(r => r.json()).catch(() => null),
      fetch(`https://api.bybit.com/v5/market/tickers?category=spot&symbol=${pair}`).then(r => r.json()).catch(() => null),
    ])

    const prices = {}

    if (binance?.bidPrice) {
      prices.binance = { bid: +binance.bidPrice, ask: +binance.askPrice }
    }
    if (bybit?.result?.list?.[0]) {
      const t = bybit.result.list[0]
      prices.bybit = { bid: +t.bid1Price, ask: +t.ask1Price }
    }

    // Find best prices
    const asks = Object.entries(prices).filter(([,v]) => v.ask > 0)
    const bids = Object.entries(prices).filter(([,v]) => v.bid > 0)
    const bestAsk = asks.length ? asks.reduce((a, b) => a[1].ask < b[1].ask ? a : b) : null
    const bestBid = bids.length ? bids.reduce((a, b) => a[1].bid > b[1].bid ? a : b) : null

    return new Response(JSON.stringify({
      pair,
      timestamp: Date.now(),
      prices,
      best: {
        ask: bestAsk ? { exchange: bestAsk[0], price: bestAsk[1].ask } : null,
        bid: bestBid ? { exchange: bestBid[0], price: bestBid[1].bid } : null,
      },
      spread: bestAsk && bestBid ? ((bestAsk[1].ask - bestBid[1].bid) / bestBid[1].bid * 100).toFixed(4) + '%' : null,
      _meta: {
        api: 'FXSEDGE Public API v1',
        docs: 'https://fxsedge.com/api',
        rateLimit: '60 req/min',
      }
    }), {
      status: 200,
      headers: corsHeaders(),
    })
  } catch (e) {
    return new Response(JSON.stringify({ error: 'Internal error', message: e.message }), {
      status: 500, headers: corsHeaders()
    })
  }
}

function corsHeaders() {
  return {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET',
    'Cache-Control': 'public, max-age=5',
  }
}

export const config = { path: '/api/prices' }
