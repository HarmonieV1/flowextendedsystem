// FXSEDGE — Trailing Stop client-side engine
// Watches positions and adjusts SL when price advances favorably
import { logSilent } from './errorMonitor'

const STORAGE_KEY = 'fxs_trailing_stops'

// Active trailing stops: { [positionKey]: { pair, side, entry, distance, currentSL, exchange } }
let activeTrails = {}
let watchInterval = null
let priceCallback = null

function getKey(pair, side) {
  return `${pair}_${side}`
}

export function loadTrails() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) activeTrails = JSON.parse(raw)
  } catch (e) { logSilent(e, 'trailingStop.load') }
  return activeTrails
}

export function saveTrails() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(activeTrails))
    window.dispatchEvent(new CustomEvent('fxs:trailUpdate'))
  } catch (e) { logSilent(e, 'trailingStop.save') }
}

export function addTrail({ pair, side, entry, distance, exchange = 'bitunix' }) {
  loadTrails()
  const key = getKey(pair, side)
  const isLong = side === 'long' || side === 'LONG' || side === 'BUY'
  // Initial SL at entry +/- distance%
  const initialSL = isLong
    ? entry * (1 - distance / 100)
    : entry * (1 + distance / 100)

  activeTrails[key] = {
    pair, side, entry,
    distance,            // percentage (e.g. 2 means 2%)
    currentSL: initialSL,
    bestPrice: entry,    // tracks the best price reached
    exchange,
    createdAt: Date.now(),
  }
  saveTrails()
  startWatcher()
  return activeTrails[key]
}

export function removeTrail(pair, side) {
  loadTrails()
  const key = getKey(pair, side)
  delete activeTrails[key]
  saveTrails()
  if (Object.keys(activeTrails).length === 0) stopWatcher()
}

export function getTrail(pair, side) {
  loadTrails()
  return activeTrails[getKey(pair, side)] || null
}

export function getAllTrails() {
  loadTrails()
  return Object.values(activeTrails)
}

// Update SL based on current price — returns { needsUpdate, newSL } or null
export function checkAndUpdate(pair, side, currentPrice) {
  loadTrails()
  const key = getKey(pair, side)
  const trail = activeTrails[key]
  if (!trail) return null

  const isLong = side === 'long' || side === 'LONG' || side === 'BUY'
  let updated = false

  if (isLong) {
    // For long: SL trails up when price goes up
    if (currentPrice > trail.bestPrice) {
      trail.bestPrice = currentPrice
      const newSL = currentPrice * (1 - trail.distance / 100)
      if (newSL > trail.currentSL) {
        trail.currentSL = newSL
        updated = true
      }
    }
  } else {
    // For short: SL trails down when price goes down
    if (currentPrice < trail.bestPrice) {
      trail.bestPrice = currentPrice
      const newSL = currentPrice * (1 + trail.distance / 100)
      if (newSL < trail.currentSL) {
        trail.currentSL = newSL
        updated = true
      }
    }
  }

  if (updated) {
    activeTrails[key] = trail
    saveTrails()
    return { needsUpdate: true, newSL: trail.currentSL, trail }
  }
  return { needsUpdate: false, newSL: trail.currentSL, trail }
}

// Set the price callback that the watcher uses to fetch prices
export function setPriceProvider(cb) {
  priceCallback = cb
}

// Watcher loop — runs every 5 seconds
function startWatcher() {
  if (watchInterval) return
  watchInterval = setInterval(async () => {
    if (!priceCallback) return
    const trails = getAllTrails()
    for (const trail of trails) {
      try {
        const price = await priceCallback(trail.pair)
        if (price && price > 0) {
          const result = checkAndUpdate(trail.pair, trail.side, price)
          if (result?.needsUpdate) {
            window.dispatchEvent(new CustomEvent('fxs:trailMove', {
              detail: { pair: trail.pair, side: trail.side, newSL: result.newSL, trail }
            }))
          }
        }
      } catch (e) { logSilent(e, 'trailingStop.watch') }
    }
  }, 5000)
}

function stopWatcher() {
  if (watchInterval) {
    clearInterval(watchInterval)
    watchInterval = null
  }
}

// Default price provider using Binance public API (no auth needed)
export function defaultBinancePriceProvider(pair) {
  return fetch(`https://api.binance.com/api/v3/ticker/price?symbol=${pair}`, {
    signal: AbortSignal.timeout(3000)
  })
    .then(r => r.json())
    .then(d => parseFloat(d.price))
    .catch(() => null)
}

// Auto-init: load trails and start watcher with default provider on import
if (typeof window !== 'undefined') {
  loadTrails()
  setPriceProvider(defaultBinancePriceProvider)
  if (Object.keys(activeTrails).length > 0) startWatcher()
}
