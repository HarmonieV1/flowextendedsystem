export default async (req) => {
  const url = new URL(req.url)
  const params = url.searchParams

  const apiUrl = `https://api.0x.org/swap/allowance-holder/price?${params.toString()}`

  const resp = await fetch(apiUrl, {
    headers: {
      '0x-api-key': Netlify.env.get('VITE_0X_API_KEY') || 'bb02023d-a2d9-4961-8206-ecab0a7e46b6',
      '0x-version':  'v2',
      'Content-Type': 'application/json',
    },
  })

  const data = await resp.json()
  return new Response(JSON.stringify(data), {
    status: resp.status,
    headers: { 'Content-Type': 'application/json' },
  })
}

export const config = {
  path: '/api/swap-price',
}
