// Netlify Function — Proxy Bitunix avec clés API de l'utilisateur
// Les clés arrivent dans les headers, signent la requête, et sont oubliées immédiatement
// Jamais stockées côté serveur — juste utilisées pour signer

import crypto from 'crypto'

const FUTURES_BASE = 'https://fapi.bitunix.com'
const SPOT_BASE    = 'https://openapi.bitunix.com'

function buildSign(apiKey, secretKey, nonce, timestamp, queryParams, bodyParams) {
  const sortKeys = (obj) => Object.keys(obj || {}).sort()
    .map(k => `${k}${obj[k]}`).join('')
  const message = `${nonce}${timestamp}${apiKey}${sortKeys(queryParams)}${sortKeys(bodyParams)}`
  return crypto.createHmac('sha256', secretKey).update(message).digest('hex')
}

export default async (req) => {
  if (req.method === 'OPTIONS') return new Response('', { status: 200 })

  try {
    const url      = new URL(req.url)
    const market   = url.searchParams.get('_market')   || 'futures'
    const endpoint = url.searchParams.get('_endpoint')
    const method   = (url.searchParams.get('_method')  || 'POST').toUpperCase()

    if (!endpoint) return new Response(JSON.stringify({ error: '_endpoint required' }), { status: 400 })

    // Clés API de L'UTILISATEUR — envoyées dans les headers par le browser
    // Jamais stockées, utilisées uniquement pour signer cette requête
    const apiKey    = req.headers.get('x-bitunix-key')    || ''
    const secretKey = req.headers.get('x-bitunix-secret') || ''

    if (!apiKey || !secretKey) {
      return new Response(JSON.stringify({
        code: -1,
        msg: 'Clés API manquantes — configure tes clés dans FXSEDGE',
        needsKeys: true,
      }), { status: 401 })
    }

    const nonce     = crypto.randomBytes(16).toString('hex')
    const timestamp = String(Date.now())

    // Query params (sans nos params internes)
    const queryParams = {}
    url.searchParams.forEach((v, k) => {
      if (!k.startsWith('_')) queryParams[k] = v
    })

    // Body
    let bodyStr = ''; let bodyParams = {}
    if (method === 'POST' || req.method === 'POST') {
      try { bodyStr = await req.text(); bodyParams = bodyStr ? JSON.parse(bodyStr) : {} } catch(_) {}
    }

    const sign    = buildSign(apiKey, secretKey, nonce, timestamp, queryParams, bodyParams)
    const base    = market === 'spot' ? SPOT_BASE : FUTURES_BASE
    const qs      = Object.keys(queryParams).length ? '?' + new URLSearchParams(queryParams) : ''
    const fullUrl = base + endpoint + qs

    const resp = await fetch(fullUrl, {
      method: method === 'GET' ? 'GET' : 'POST',
      headers: {
        'api-key':      apiKey,
        'sign':         sign,
        'nonce':        nonce,
        'timestamp':    timestamp,
        'language':     'en-US',
        'Content-Type': 'application/json',
      },
      ...(method !== 'GET' && bodyStr ? { body: bodyStr } : {}),
    })

    const data = await resp.text()
    return new Response(data, {
      status: resp.status,
      headers: { 'Content-Type': 'application/json' },
    })

  } catch (e) {
    return new Response(JSON.stringify({ code: -1, msg: e.message }), { status: 500 })
  }
}

export const config = { path: '/api/bitunix' }
