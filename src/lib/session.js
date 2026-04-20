// Session persistence — saves user preferences to localStorage
// Restored on app load so users don't have to reconfigure

const KEY = 'fxs_session'

const DEFAULTS = {
  pair: 'BTCUSDT',
  tf: '15m',
  view: 'trade',
  tab: 'Spot',
  side: 'buy',
}

export function saveSession(data) {
  try {
    const saved = loadSession()
    localStorage.setItem(KEY, JSON.stringify({ ...saved, ...data, _ts: Date.now() }))
  } catch(_) {}
}

export function loadSession() {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return DEFAULTS
    const parsed = JSON.parse(raw)
    // Expire after 7 days
    if (Date.now() - parsed._ts > 7 * 24 * 60 * 60 * 1000) return DEFAULTS
    return { ...DEFAULTS, ...parsed }
  } catch(_) { return DEFAULTS }
}

export function clearSession() {
  try { localStorage.removeItem(KEY) } catch(_) {}
}
