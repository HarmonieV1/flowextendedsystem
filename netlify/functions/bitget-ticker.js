// Netlify Edge Function — proxies Bitget REST API
// Called from browser as /.netlify/functions/bitget-ticker?symbol=BTCUSDT
exports.handler = async (event) => {
  const symbol = event.queryStringParameters?.symbol || 'BTCUSDT'

  try {
    const res = await fetch(
      `https://api.bitget.com/api/v2/spot/market/tickers?symbol=${symbol}`,
      { headers: { 'Accept': 'application/json' } }
    )
    const data = await res.json()
    const item = data?.data?.[0]

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Cache-Control': 'no-cache',
      },
      body: JSON.stringify({
        bid: item?.bidPr || item?.bestBid || null,
        ask: item?.askPr || item?.bestAsk || null,
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
