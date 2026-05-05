/**
 * FXS Exchange — Cloudflare Worker Proxy
 * Deploy at: workers.cloudflare.com (free tier: 100k req/day)
 * 
 * Routes:
 *   /bitunix/*     → https://api.bitunix.com/*
 *   /etherscan/*   → https://api.etherscan.io/*
 *   /whale/*       → https://api.whale-alert.io/*
 * 
 * DEPLOY INSTRUCTIONS:
 * 1. Va sur workers.cloudflare.com → Create Worker
 * 2. Colle ce code
 * 3. Clique Deploy
 * 4. Copie l'URL du worker (ex: fxs-proxy.username.workers.dev)
 * 5. Dans Netlify → Env vars → ajoute: VITE_PROXY_URL=https://fxs-proxy.username.workers.dev
 */

const ALLOWED_ORIGIN = 'https://delicate-cranachan-e761d0.netlify.app'

const ROUTES = {
  '/bitunix/': 'https://api.bitunix.com/',
  '/etherscan/': 'https://api.etherscan.io/',
  '/whale/': 'https://api.whale-alert.io/',
}

export default {
  async fetch(request) {
    const url = new URL(request.url)
    const origin = request.headers.get('Origin')

    // CORS preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
          'Access-Control-Allow-Headers': '*',
        }
      })
    }

    // Find matching route
    let targetBase = null
    let pathSuffix = url.pathname

    for (const [prefix, target] of Object.entries(ROUTES)) {
      if (url.pathname.startsWith(prefix)) {
        targetBase = target
        pathSuffix = url.pathname.slice(prefix.length)
        break
      }
    }

    if (!targetBase) {
      return new Response('Route not found', { status: 404 })
    }

    // Forward request to target API
    const targetUrl = targetBase + pathSuffix + (url.search || '')
    
    const headers = new Headers(request.headers)
    headers.delete('host')
    headers.delete('origin')
    headers.delete('referer')

    const response = await fetch(targetUrl, {
      method: request.method,
      headers,
      body: request.method !== 'GET' ? request.body : undefined,
    })

    const newResponse = new Response(response.body, response)
    newResponse.headers.set('Access-Control-Allow-Origin', '*')
    newResponse.headers.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
    
    return newResponse
  }
}
