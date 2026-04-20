// Netlify Edge Function — proxies Bybit REST API
// Called from browser as /.netlify/functions/bybit-ticker?symbol=BTCUSDT
exports.handler = async (event) => {
  const symbol = event.queryStringParameters?.symbol || 'BTCUSDT'
  
  try {
    const res = await fetch(
      `https://api.bybit.com/v5/market/tickers?category=spot&symbol=${symbol}`,
      { headers: { 'Accept': 'application/json' } }
    )
    const data = await res.json()
    const item = data?.result?.list?.[0]

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Cache-Control': 'no-cache',
      },
      body: JSON.stringify({
        bid: item?.bid1Price || null,
        ask: item?.ask1Price || null,
        symbol,
      }),
    }
  } catch(e) {
    return {
      statusCode: 200,
      headers: { 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({ bid: null, ask: null, symbol, error: e.message }),
    }
  }
}
