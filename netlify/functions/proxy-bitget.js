// FXSEDGE — Bitget API Proxy (hardened)
// Mirrors the security posture of proxy.js (Bitunix)

const ALLOWED_HOSTS = ['api.bitget.com']

// Simple in-memory rate limiter (per function instance)
const rateMap = new Map()
const RATE_WINDOW = 60_000  // 1 minute
const RATE_LIMIT = 120      // 120 req/min per API key

function checkRate(key) {
  const now = Date.now()
  const entry = rateMap.get(key)
  if (!entry || now - entry.start > RATE_WINDOW) {
    rateMap.set(key, { start: now, count: 1 })
    return true
  }
  entry.count++
  if (entry.count > RATE_LIMIT) return false
  return true
}

// Cleanup
setInterval(() => {
  const now = Date.now()
  for (const [k, v] of rateMap) {
    if (now - v.start > RATE_WINDOW * 2) rateMap.delete(k)
  }
}, 300_000)

function validateUrl(url) {
  try {
    const parsed = new URL(url)
    return ALLOWED_HOSTS.includes(parsed.hostname) && parsed.protocol === 'https:'
  } catch { return false }
}

function sanitizeString(s, maxLen = 200) {
  if (typeof s !== 'string') return ''
  return s.slice(0, maxLen).replace(/[<>'"]/g, '')
}

// Whitelist of headers we'll forward to Bitget
const ALLOWED_HEADERS = new Set([
  'access-key',
  'access-sign',
  'access-timestamp',
  'access-passphrase',
  'content-type',
  'locale',
])

const cors = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': 'https://fxsedge.com',
  'Access-Control-Allow-Headers': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

export default async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors })
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405, headers: cors })
  }

  try {
    const body = await req.json()
    const { url, method, body: payload, headers: reqHeaders } = body || {}

    // ── URL validation (SSRF protection) ──
    if (!url || !validateUrl(url)) {
      return new Response(JSON.stringify({ error: 'URL not allowed' }), { status: 403, headers: cors })
    }

    // ── Method validation ──
    const m = (method || 'GET').toUpperCase()
    if (!['GET', 'POST', 'DELETE'].includes(m)) {
      return new Response(JSON.stringify({ error: 'Method invalid' }), { status: 400, headers: cors })
    }

    // ── Sanitize + filter headers (only Bitget-related) ──
    const cleanHeaders = { 'Content-Type': 'application/json', 'locale': 'en-US' }
    if (reqHeaders && typeof reqHeaders === 'object') {
      for (const [k, v] of Object.entries(reqHeaders)) {
        const lower = String(k).toLowerCase()
        if (ALLOWED_HEADERS.has(lower) && typeof v === 'string') {
          cleanHeaders[k] = sanitizeString(v, 256)
        }
      }
    }

    // ── Rate limit per API key (timing-safe enough for our use case) ──
    const apiKey = cleanHeaders['ACCESS-KEY'] || cleanHeaders['access-key'] || 'anon'
    if (!checkRate(sanitizeString(apiKey, 64))) {
      return new Response(JSON.stringify({ error: 'Rate limit — 120 req/min max' }), { status: 429, headers: cors })
    }

    // ── Anti-replay timestamp check ──
    const ts = parseInt(cleanHeaders['ACCESS-TIMESTAMP'] || cleanHeaders['access-timestamp'] || '0', 10)
    if (ts && Math.abs(Date.now() - ts) > 60_000) {
      return new Response(JSON.stringify({ error: 'Timestamp expired' }), { status: 400, headers: cors })
    }

    // ── Body validation ──
    const fetchOpts = { method: m, headers: cleanHeaders }
    if (payload && m !== 'GET') {
      if (typeof payload !== 'string' || payload.length > 10_000) {
        return new Response(JSON.stringify({ error: 'Body invalid' }), { status: 400, headers: cors })
      }
      try { JSON.parse(payload) } catch {
        return new Response(JSON.stringify({ error: 'Body must be JSON string' }), { status: 400, headers: cors })
      }
      fetchOpts.body = payload
    }

    // Add request timeout
    const ctrl = new AbortController()
    const tt = setTimeout(() => ctrl.abort(), 15_000)
    fetchOpts.signal = ctrl.signal

    const r = await fetch(url, fetchOpts)
    clearTimeout(tt)
    const text = await r.text()
    return new Response(text, { status: r.status, headers: cors })

  } catch (e) {
    // Don't leak error details to client
    return new Response(JSON.stringify({ error: 'Proxy error' }), { status: 500, headers: cors })
  }
}

export const config = { path: '/api/proxy-bitget' }
