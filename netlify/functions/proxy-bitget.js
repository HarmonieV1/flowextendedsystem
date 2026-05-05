// FXSEDGE — Bitget API Proxy
// Forwards signed requests to Bitget API

const ALLOWED = ['https://api.bitget.com']
const cors = { 'Content-Type':'application/json', 'Access-Control-Allow-Origin':'https://fxsedge.com', 'Access-Control-Allow-Methods':'POST,OPTIONS' }

export default async (req) => {
  if (req.method === 'OPTIONS') return new Response('', { headers: cors })
  if (req.method !== 'POST') return new Response(JSON.stringify({error:'Method not allowed'}), {status:405, headers:cors})

  try {
    const { url, method, body, headers } = await req.json()
    
    // Validate URL
    if (!url || !ALLOWED.some(a => url.startsWith(a))) {
      return new Response(JSON.stringify({error:'URL not allowed'}), {status:403, headers:cors})
    }

    // Forward request
    const opts = { method: method || 'GET', headers: headers || {} }
    if (body && method !== 'GET') opts.body = body

    const r = await fetch(url, opts)
    const text = await r.text()

    return new Response(text, { status: r.status, headers: cors })
  } catch (e) {
    return new Response(JSON.stringify({error: e.message}), {status:500, headers:cors})
  }
}

export const config = { path: '/api/proxy-bitget' }
