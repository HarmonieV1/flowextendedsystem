// FXSEDGE — Watchlist with 24h sparklines
import { useState, useEffect, useRef } from 'react'
import { useStore } from '../../store'
import { fmtPx } from '../../lib/format'
import { logSilent } from '../../lib/errorMonitor'
import styles from './Watchlist.module.css'

const STORAGE_KEY = 'fxs_watchlist'

const DEFAULT_PAIRS = ['BTCUSDT', 'ETHUSDT', 'SOLUSDT', 'BNBUSDT']

export function getWatchlist() {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || JSON.stringify(DEFAULT_PAIRS)) }
  catch { return DEFAULT_PAIRS }
}

export function setWatchlist(pairs) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(pairs))
    window.dispatchEvent(new CustomEvent('fxs:watchlistChanged'))
  } catch {}
}

export function toggleWatchlist(pair) {
  const list = getWatchlist()
  const idx = list.indexOf(pair)
  if (idx >= 0) list.splice(idx, 1)
  else list.push(pair)
  setWatchlist(list)
}

export function isInWatchlist(pair) {
  return getWatchlist().includes(pair)
}

// Mini sparkline component — uses canvas for perf
function Sparkline({ data, color = '#8cc63f', width = 80, height = 28 }) {
  const ref = useRef(null)
  useEffect(() => {
    if (!ref.current || !data || data.length < 2) return
    const c = ref.current
    const ctx = c.getContext('2d')
    const dpr = window.devicePixelRatio || 1
    c.width = width * dpr
    c.height = height * dpr
    c.style.width = width + 'px'
    c.style.height = height + 'px'
    ctx.scale(dpr, dpr)
    ctx.clearRect(0, 0, width, height)

    const min = Math.min(...data)
    const max = Math.max(...data)
    const range = max - min || 1
    const isUp = data[data.length - 1] >= data[0]
    const lineColor = isUp ? '#8cc63f' : '#ff3b5c'
    const fillColor = isUp ? 'rgba(140,198,63,0.12)' : 'rgba(255,59,92,0.12)'

    // Fill below line
    ctx.beginPath()
    data.forEach((v, i) => {
      const x = (i / (data.length - 1)) * width
      const y = height - ((v - min) / range) * (height - 2) - 1
      if (i === 0) ctx.moveTo(x, y)
      else ctx.lineTo(x, y)
    })
    ctx.lineTo(width, height)
    ctx.lineTo(0, height)
    ctx.closePath()
    ctx.fillStyle = fillColor
    ctx.fill()

    // Stroke
    ctx.beginPath()
    data.forEach((v, i) => {
      const x = (i / (data.length - 1)) * width
      const y = height - ((v - min) / range) * (height - 2) - 1
      if (i === 0) ctx.moveTo(x, y)
      else ctx.lineTo(x, y)
    })
    ctx.strokeStyle = lineColor
    ctx.lineWidth = 1.2
    ctx.stroke()
  }, [data, width, height])

  return <canvas ref={ref} />
}

export function Watchlist({ compact = false }) {
  const [pairs, setPairs] = useState(getWatchlist())
  const [data, setData] = useState({}) // { BTCUSDT: { px, change24h, sparkline: [..] } }
  const setPair = useStore(s => s.setPair)
  const currentPair = useStore(s => s.pair)

  // React to watchlist changes
  useEffect(() => {
    const handler = () => setPairs(getWatchlist())
    window.addEventListener('fxs:watchlistChanged', handler)
    return () => window.removeEventListener('fxs:watchlistChanged', handler)
  }, [])

  // Fetch 24h data (price, change, klines for sparkline)
  useEffect(() => {
    let cancelled = false
    const fetchAll = async () => {
      const next = {}
      await Promise.all(pairs.map(async (p) => {
        try {
          const [tickerR, klinesR] = await Promise.all([
            fetch(`https://api.binance.com/api/v3/ticker/24hr?symbol=${p}`, { signal: AbortSignal.timeout(5000) }),
            fetch(`https://api.binance.com/api/v3/klines?symbol=${p}&interval=1h&limit=24`, { signal: AbortSignal.timeout(5000) }),
          ])
          const ticker = await tickerR.json()
          const klines = await klinesR.json()
          next[p] = {
            px: parseFloat(ticker.lastPrice),
            change24h: parseFloat(ticker.priceChangePercent),
            volume: parseFloat(ticker.quoteVolume),
            sparkline: Array.isArray(klines) ? klines.map(k => parseFloat(k[4])) : [],
          }
        } catch (e) {
          logSilent(e, 'Watchlist.fetch')
        }
      }))
      if (!cancelled) setData(next)
    }
    fetchAll()
    const iv = setInterval(fetchAll, 30_000) // refresh every 30s
    return () => { cancelled = true; clearInterval(iv) }
  }, [pairs])

  const removePair = (e, pair) => {
    e.stopPropagation()
    const next = pairs.filter(p => p !== pair)
    setWatchlist(next)
  }

  if (pairs.length === 0) {
    return (
      <div className={styles.empty}>
        <div style={{fontSize:24,marginBottom:6}}>⭐</div>
        <div>Watchlist vide</div>
        <div style={{fontSize:9,color:'var(--txt3)',marginTop:4}}>Clique sur l'étoile dans le Ticker pour ajouter une paire</div>
      </div>
    )
  }

  return (
    <div className={styles.wrap}>
      {pairs.map(p => {
        const d = data[p]
        const base = p.replace('USDT', '')
        const isActive = currentPair === p
        const isUp = d?.change24h >= 0
        return (
          <button key={p}
            className={styles.row + (isActive ? ' ' + styles.rowOn : '')}
            onClick={() => setPair(p)}
          >
            <div className={styles.left}>
              <span className={styles.sym}>{base}</span>
              {!compact && <span className={styles.spark}>
                {d?.sparkline?.length > 0 && <Sparkline data={d.sparkline} />}
              </span>}
            </div>
            <div className={styles.right}>
              <span className={styles.px}>{d?.px ? fmtPx(d.px) : '—'}</span>
              <span className={styles.chg} style={{color: isUp ? 'var(--grn)' : 'var(--red)'}}>
                {d?.change24h !== undefined ? `${isUp?'+':''}${d.change24h.toFixed(2)}%` : '—'}
              </span>
            </div>
            <button className={styles.removeBtn} onClick={e => removePair(e, p)} title="Retirer">×</button>
          </button>
        )
      })}
    </div>
  )
}
