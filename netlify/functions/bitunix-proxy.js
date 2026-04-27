// Netlify Function — Bitunix API Proxy
// Résout le CORS : le browser appelle /.netlify/functions/bitunix-proxy
// Cette fonction tourne côté serveur Netlify et appelle api.bitunix.com sans restriction CORS

const crypto = require('crypto')

const BITUNIX_BASE = 'https://api.bitunix.com'

function hmacSha256(message, secret) {
  return crypto.createHmac('sha256', secret).update(message).digest('hex')
}

exports.handler = async (event) => {
  // Handle CORS preflight
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type,x-api-key,x-secret-key',
      },
      body: '',
    }
  }

  try {
    // API keys passed from client headers (never stored server-side)
    const apiKey    = event.headers['x-api-key']
    const secretKey = event.headers['x-secret-key']

    if (!apiKey || !secretKey) {
      return { statusCode: 401, body: JSON.stringify({ error: 'API keys manquantes' }),
        headers: { 'Access-Control-Allow-Origin': '*' } }
    }

    // Parse request
    const body     = event.body ? JSON.parse(event.body) : {}
    const method   = body.method || 'GET'
    const path     = body.path   || ''
    const params   = body.params || {}

    if (!path.startsWith('/api/')) {
      return { statusCode: 400, body: JSON.stringify({ error: 'Path invalide' }),
        headers: { 'Access-Control-Allow-Origin': '*' } }
    }

    // Build Bitunix signature
    const timestamp = Date.now().toString()
    const nonce     = Math.random().toString(36).slice(2, 18)
    const queryStr  = method === 'GET' && Object.keys(params).length
      ? new URLSearchParams(params).toString() : ''
    const bodyStr   = method !== 'GET' && Object.keys(params).length
      ? JSON.stringify(params) : ''

    const signature = hmacSha256(
      nonce + timestamp + apiKey + queryStr + bodyStr,
      secretKey
    )

    const headers = {
      'api-key':      apiKey,
      'timestamp':    timestamp,
      'nonce':        nonce,
      'sign':         signature,
      'Content-Type': 'application/json',
      'Accept':       'application/json',
    }

    const url = `${BITUNIX_BASE}${path}${queryStr ? '?' + queryStr : ''}`
    const response = await fetch(url, {
      method,
      headers,
      ...(bodyStr ? { body: bodyStr } : {}),
    })

    const data = await response.json()

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
      body: JSON.stringify(data),
    }

  } catch (e) {
    return {
      statusCode: 500,
      headers: { 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({ error: e.message }),
    }
  }
}
