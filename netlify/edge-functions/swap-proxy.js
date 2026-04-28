// Netlify Edge Function — proxy 0x API avec headers auth
// Intercepte /api/swap-price et /api/swap-quote

export default async (request, context) => {
  const url    = new URL(request.url)
  const path   = url.pathname

  // Route vers le bon endpoint 0x
  let target
  if (path.startsWith('/api/swap-price')) {
    target = 'https://api.0x.org/swap/allowance-holder/price'
  } else if (path.startsWith('/api/swap-quote')) {
    target = 'https://api.0x.org/swap/allowance-holder/quote'
  } else {
    return context.next()
  }

  const apiUrl = `${target}?${url.searchParams.toString()}`

  const resp = await fetch(apiUrl, {
    headers: {
      '0x-api-key': Deno.env.get('VITE_0X_API_KEY') || 'bb02023d-a2d9-4961-8206-ecab0a7e46b6',
      '0x-version':  'v2',
      'Content-Type': 'application/json',
    },
  })

  const data = await resp.text()
  return new Response(data, {
    status: resp.status,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
    },
  })
}

export const config = {
  path: ['/api/swap-price', '/api/swap-quote'],
}
