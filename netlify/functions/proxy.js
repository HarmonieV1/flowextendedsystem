// FXSEDGE Proxy — Sécurisé
// Rate limiting in-memory, URL whitelist, input validation

const ALLOWED_HOSTS = [
  "fapi.bitunix.com",
  "openapi.bitunix.com",
]

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

// Cleanup old entries every 5 minutes
setInterval(() => {
  const now = Date.now()
  for (const [k, v] of rateMap) {
    if (now - v.start > RATE_WINDOW * 2) rateMap.delete(k)
  }
}, 300_000)

function validateUrl(url) {
  try {
    const parsed = new URL(url)
    return ALLOWED_HOSTS.includes(parsed.hostname)
  } catch {
    return false
  }
}

function sanitizeString(s, maxLen = 200) {
  if (typeof s !== "string") return ""
  return s.slice(0, maxLen).replace(/[<>]/g, "")
}

export default async (req) => {
  const cors = {
    "Access-Control-Allow-Origin": "https://fxsedge.com",
    "Access-Control-Allow-Headers": "*",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Content-Type": "application/json",
  }

  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: cors })
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ code: -1, msg: "Method not allowed" }), { status: 405, headers: cors })
  }

  try {
    const body = await req.json()
    const { url, method, apiKey, sign, nonce, timestamp } = body

    // ── Validation ──
    if (!url || !apiKey || !sign || !nonce || !timestamp) {
      return new Response(JSON.stringify({ code: -1, msg: "Params manquants" }), { status: 400, headers: cors })
    }

    if (!validateUrl(url)) {
      return new Response(JSON.stringify({ code: -1, msg: "URL non autorisée" }), { status: 403, headers: cors })
    }

    if (method !== "GET" && method !== "POST") {
      return new Response(JSON.stringify({ code: -1, msg: "Method invalide" }), { status: 400, headers: cors })
    }

    // ── Rate limiting ──
    const rateKey = sanitizeString(apiKey, 64)
    if (!checkRate(rateKey)) {
      return new Response(JSON.stringify({ code: -1, msg: "Rate limit — max 120 req/min" }), { status: 429, headers: cors })
    }

    // ── Sanitize ──
    const cleanSign = sanitizeString(sign, 128)
    const cleanNonce = sanitizeString(nonce, 64)
    const cleanTimestamp = sanitizeString(timestamp, 20)

    // Timestamp drift check — reject if older than 60s
    const ts = parseInt(cleanTimestamp)
    if (isNaN(ts) || Math.abs(Date.now() - ts) > 60_000) {
      return new Response(JSON.stringify({ code: -1, msg: "Timestamp expiré" }), { status: 400, headers: cors })
    }

    const headers = {
      "api-key": rateKey,
      "sign": cleanSign,
      "nonce": cleanNonce,
      "timestamp": cleanTimestamp,
      "language": "en-US",
      "Content-Type": "application/json",
    }

    const fetchOpts = { method: method || "GET", headers }

    if (method === "POST" && body.body) {
      // Validate body is valid JSON string
      try {
        JSON.parse(body.body)
        fetchOpts.body = body.body
      } catch {
        return new Response(JSON.stringify({ code: -1, msg: "Body JSON invalide" }), { status: 400, headers: cors })
      }
    }

    const resp = await fetch(url, fetchOpts)
    const data = await resp.text()

    return new Response(data, { status: resp.status, headers: cors })

  } catch (e) {
    return new Response(JSON.stringify({ code: -1, msg: "Erreur proxy" }), { status: 500, headers: cors })
  }
}

export const config = { path: "/api/proxy" }
