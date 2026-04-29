// Netlify Edge Function — Proxy Bitunix avec signature HMAC
// Tourne sur Deno Edge Runtime — INCLUS dans le drag & drop ZIP
// Path: /bx (futures) et /bxs (spot)

async function handleRequest(req, market) {
  const url = new URL(req.url)

  // Clés de l'utilisateur dans les headers
  const apiKey    = req.headers.get('x-bx-key')    || ''
  const secretKey = req.headers.get('x-bx-secret') || ''

  if (!apiKey || !secretKey) {
    return new Response(
      JSON.stringify({ code: -1, msg: 'Clés API manquantes', needsKeys: true }),
      { status: 401, headers: { 'Content-Type': 'application/json' } }
    )
  }

  // Endpoint et méthode
  const endpoint = url.searchParams.get('e') || ''
  const method   = (url.searchParams.get('x') || 'GET').toUpperCase()

  // Query params (sans nos params internes)
  const qp = {}
  url.searchParams.forEach((v, k) => {
    if (!['e', 'x'].includes(k)) qp[k] = v
  })

  // Body
  let bodyStr = '', bodyObj = {}
  if (method === 'POST') {
    try { bodyStr = await req.text(); bodyObj = JSON.parse(bodyStr) || {} } catch(_) {}
  }

  // Signature HMAC-SHA256 (SubtleCrypto Deno)
  const nonce = crypto.randomUUID().replace(/-/g, '')
  const ts    = String(Date.now())

  const sortStr = o => Object.keys(o).sort().map(k => `${k}${o[k]}`).join('')
  const message = `${nonce}${ts}${apiKey}${sortStr(qp)}${sortStr(bodyObj)}`

  const keyMat = await crypto.subtle.importKey(
    'raw', new TextEncoder().encode(secretKey),
    { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']
  )
  const sigBuf = await crypto.subtle.sign('HMAC', keyMat, new TextEncoder().encode(message))
  const sign   = Array.from(new Uint8Array(sigBuf)).map(b => b.toString(16).padStart(2,'0')).join('')

  // Appel Bitunix
  const base = market === 'spot' ? 'https://openapi.bitunix.com' : 'https://fapi.bitunix.com'
  const qs   = Object.keys(qp).length ? '?' + new URLSearchParams(qp).toString() : ''

  const resp = await fetch(base + endpoint + qs, {
    method,
    headers: {
      'api-key':      apiKey,
      'sign':         sign,
      'nonce':        nonce,
      'timestamp':    ts,
      'language':     'en-US',
      'Content-Type': 'application/json',
    },
    ...(method === 'POST' && bodyStr ? { body: bodyStr } : {}),
  })

  const data = await resp.text()
  return new Response(data, {
    status: resp.status,
    headers: { 'Content-Type': 'application/json' },
  })
}

export default async (req, context) => {
  const url = new URL(req.url)
  if (req.method === 'OPTIONS') return new Response('', { status: 200 })

  const market = url.pathname.startsWith('/bxs') ? 'spot' : 'futures'
  return handleRequest(req, market)
}

export const config = {
  path: ['/bx', '/bxs'],
}
