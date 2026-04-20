// Fear & Greed Index — Alternative.me API
exports.handler = async () => {
  try {
    const res = await fetch('https://api.alternative.me/fng/?limit=1')
    const data = await res.json()
    const item = data?.data?.[0]
    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Cache-Control': 'max-age=300', // cache 5min
      },
      body: JSON.stringify({
        value: parseInt(item?.value || 50),
        label: item?.value_classification || 'Neutral',
        timestamp: item?.timestamp,
      }),
    }
  } catch(e) {
    return {
      statusCode: 200,
      headers: { 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({ value: 50, label: 'Neutral', error: e.message }),
    }
  }
}
