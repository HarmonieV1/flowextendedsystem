// Netlify Function — Proxy Bitunix API avec signature HMAC côté serveur
// La secretKey ne sort JAMAIS du serveur Netlify
// Browser → /.netlify/functions/bitunix-proxy → fapi.bitunix.com / openapi.bitunix.com

import crypto from 'crypto'

const FUTURES_BASE = 'https://fapi.bitunix.com'
const SPOT_BASE    = 'https://openapi.bitunix.com'

/**
 * Bitunix HMAC-SHA256 signature
 * Docs: https://www.bitunix.com/api-docs/futures/common/sign.html
 * 
 * Step 1: Sort all queryParams alphabetically → queryString
 * Step 2: Sort all body params alphabetically → bodyString  
 * Step 3: sign = HMAC-SHA256(nonce + timestamp + apiKey + queryString + bodyString, secretKey)
 */
function buildSign(apiKey, secretKey, nonce, timestamp, queryParams, bodyParams) {
  const sortKeys = (obj) => Object.keys(obj || {}).sort()
    .map(k => `${k}${obj[k]}`).join('')

  const queryString = sortKeys(queryParams)
  const bodyString  = sortKeys(bodyParams)

  const message = `${nonce}${timestamp}${apiKey}${queryString}${bodyString}`
  return crypto.createHmac('sha256', secretKey).update(message).digest('hex')
}

export default async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('', { status: 200 })
  }

  try {
    const url      = new URL(req.url)
    const market   = url.searchParams.get('_market') || 'futures' // futures | spot
    const endpoint = url.searchParams.get('_endpoint') // e.g. /api/v1/futures/trade/place_order
    const method   = (url.searchParams.get('_method') || 'POST').toUpperCase()

    if (!endpoint) {
      return new Response(JSON.stringify({ error: '_endpoint required' }), { status: 400 })
    }

    // Get API keys from Netlify env
    const apiKey    = Netlify.env.get('BITUNIX_API_KEY')    || ''
    const secretKey = Netlify.env.get('BITUNIX_SECRET_KEY') || ''

    if (!apiKey || !secretKey) {
      return new Response(JSON.stringify({ error: 'Clés API Bitunix non configurées' }), { status: 401 })
    }

    const nonce     = crypto.randomBytes(16).toString('hex') // 32 chars
    const timestamp = String(Date.now())

    // Parse query params (remove our internal params)
    const queryParams = {}
    url.searchParams.forEach((v, k) => {
      if (!k.startsWith('_')) queryParams[k] = v
    })

    // Parse body
    let bodyParams = {}
    let bodyStr    = ''
    if (method === 'POST') {
      try {
        bodyStr    = await req.text()
        bodyParams = bodyStr ? JSON.parse(bodyStr) : {}
      } catch(_) {}
    }

    const sign = buildSign(apiKey, secretKey, nonce, timestamp, queryParams, bodyParams)

    const base    = market === 'spot' ? SPOT_BASE : FUTURES_BASE
    const fullUrl = base + endpoint + (Object.keys(queryParams).length
      ? '?' + new URLSearchParams(queryParams).toString()
      : '')

    const resp = await fetch(fullUrl, {
      method,
      headers: {
        'api-key':      apiKey,
        'sign':         sign,
        'nonce':        nonce,
        'timestamp':    timestamp,
        'language':     'en-US',
        'Content-Type': 'application/json',
      },
      ...(method === 'POST' ? { body: bodyStr } : {}),
    })

    const data = await resp.text()
    return new Response(data, {
      status: resp.status,
      headers: { 'Content-Type': 'application/json' },
    })

  } catch (e) {
    return new Response(JSON.stringify({ error: e.message }), { status: 500 })
  }
}

export const config = {
  path: '/api/bitunix',
}
