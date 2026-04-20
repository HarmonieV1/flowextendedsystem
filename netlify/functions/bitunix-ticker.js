exports.handler = async (event) => {
  const symbol = event.queryStringParameters?.symbol || 'BTCUSDT'
  try {
    const res = await fetch(
      `https://api.bitunix.com/api/v1/ticker/bookTicker?symbol=${symbol}`,
      { headers: { 'Accept': 'application/json' } }
    )
    const d = await res.json()
    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({
        bid: d?.data?.bidPrice || null,
        ask: d?.data?.askPrice || null,
        symbol,
      }),
    }
  } catch(e) {
    return {
      statusCode: 200,
      headers: { 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({ bid: null, ask: null, error: e.message }),
    }
  }
}
