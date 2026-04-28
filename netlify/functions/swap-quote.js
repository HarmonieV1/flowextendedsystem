exports.handler = async (event) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json',
  }

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' }
  }

  try {
    const params = event.queryStringParameters || {}
    const qs     = new URLSearchParams(params).toString()
    const url    = `https://api.0x.org/swap/allowance-holder/quote?${qs}`

    const resp = await fetch(url, {
      headers: {
        '0x-api-key': process.env.VITE_0X_API_KEY || '',
        '0x-version': 'v2',
        'Content-Type': 'application/json',
      },
    })

    const data = await resp.json()
    return { statusCode: resp.status, headers, body: JSON.stringify(data) }
  } catch (e) {
    return { statusCode: 500, headers, body: JSON.stringify({ error: e.message }) }
  }
}
