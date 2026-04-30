import { randomUUID } from "node:crypto"

async function hmac(secret, message) {
  const key = await crypto.subtle.importKey(
    "raw", new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" }, false, ["sign"]
  )
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(message))
  return Array.from(new Uint8Array(sig)).map(b => b.toString(16).padStart(2,"0")).join("")
}

export default async (req) => {
  const url    = new URL(req.url)
  const market = url.pathname.startsWith("/bxs") ? "spot" : "futures"
  const path   = url.searchParams.get("e") || ""
  const method = (url.searchParams.get("x") || "GET").toUpperCase()

  const apiKey    = req.headers.get("x-bx-key")    || ""
  const secretKey = req.headers.get("x-bx-secret") || ""

  if (!apiKey || !secretKey) {
    return new Response(JSON.stringify({ code: -1, msg: "Clés API manquantes", needsKeys: true }), {
      status: 401, headers: { "Content-Type": "application/json" }
    })
  }

  // Query params (sans e, x)
  const qp = {}
  url.searchParams.forEach((v, k) => { if (!["e","x"].includes(k)) qp[k] = v })

  // Body
  let bodyStr = "", bodyObj = {}
  if (method === "POST") {
    try { bodyStr = await req.text(); bodyObj = JSON.parse(bodyStr) || {} } catch(_) {}
  }

  const nonce = randomUUID().replace(/-/g, "")
  const ts    = String(Date.now())
  const sortStr = o => Object.keys(o).sort().map(k => `${k}${o[k]}`).join("")
  const sign  = await hmac(secretKey, `${nonce}${ts}${apiKey}${sortStr(qp)}${sortStr(bodyObj)}`)

  const base  = market === "spot" ? "https://openapi.bitunix.com" : "https://fapi.bitunix.com"
  const qs    = Object.keys(qp).length ? "?" + new URLSearchParams(qp) : ""

  const resp  = await fetch(base + path + qs, {
    method,
    headers: {
      "api-key": apiKey, "sign": sign,
      "nonce": nonce, "timestamp": ts,
      "language": "en-US", "Content-Type": "application/json",
    },
    ...(method === "POST" && bodyStr ? { body: bodyStr } : {}),
  })

  const data = await resp.text()
  return new Response(data, {
    status: resp.status,
    headers: { "Content-Type": "application/json" }
  })
}

export const config = { path: ["/bx", "/bxs"] }
