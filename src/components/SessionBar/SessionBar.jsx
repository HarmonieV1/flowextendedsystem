// FXSEDGE — Session Stats Bar
// Tracks user trading session: duration, trades count, PnL, win rate, best/worst
import { useState, useEffect, useCallback } from 'react'
import { fmt } from '../../lib/format'
import { logSilent } from '../../lib/errorMonitor'
import styles from './SessionBar.module.css'

const STORAGE_KEY = 'fxs_session_stats'

const initSession = () => ({
  startTime: Date.now(),
  trades: [],          // { pair, pnl, side, timestamp }
  totalPnl: 0,
  wins: 0,
  losses: 0,
  best: null,          // { pair, pnl }
  worst: null,         // { pair, pnl }
})

export function getSessionStats() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return initSession()
    const s = JSON.parse(raw)
    // Reset session if older than 24h
    if (Date.now() - s.startTime > 24 * 3600 * 1000) {
      const fresh = initSession()
      localStorage.setItem(STORAGE_KEY, JSON.stringify(fresh))
      return fresh
    }
    return s
  } catch { return initSession() }
}

export function recordTrade({ pair, pnl, side }) {
  const s = getSessionStats()
  const trade = { pair, pnl, side, timestamp: Date.now() }
  s.trades.push(trade)
  s.totalPnl += pnl
  if (pnl > 0) s.wins++
  else if (pnl < 0) s.losses++
  if (!s.best || pnl > s.best.pnl) s.best = { pair, pnl }
  if (!s.worst || pnl < s.worst.pnl) s.worst = { pair, pnl }
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(s))
    window.dispatchEvent(new CustomEvent('fxs:sessionUpdate', { detail: s }))
  } catch (e) { logSilent(e, 'SessionBar.record') }
  return s
}

export function resetSession() {
  const fresh = initSession()
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(fresh))
    window.dispatchEvent(new CustomEvent('fxs:sessionUpdate', { detail: fresh }))
  } catch {}
}

function formatDuration(ms) {
  const totalMin = Math.floor(ms / 60000)
  const h = Math.floor(totalMin / 60)
  const m = totalMin % 60
  if (h > 0) return `${h}h${String(m).padStart(2, '0')}`
  return `${m}m`
}

export function SessionBar() {
  const [stats, setStats] = useState(getSessionStats())
  const [now, setNow] = useState(Date.now())
  const [collapsed, setCollapsed] = useState(false)

  // Auto-update duration every minute
  useEffect(() => {
    const iv = setInterval(() => setNow(Date.now()), 60_000)
    return () => clearInterval(iv)
  }, [])

  // Listen for session updates from elsewhere
  useEffect(() => {
    const h = (e) => setStats(e?.detail || getSessionStats())
    window.addEventListener('fxs:sessionUpdate', h)
    return () => window.removeEventListener('fxs:sessionUpdate', h)
  }, [])

  const duration = formatDuration(now - stats.startTime)
  const totalTrades = stats.trades.length
  const winRate = totalTrades > 0 ? Math.round((stats.wins / totalTrades) * 100) : 0
  const pnlColor = stats.totalPnl > 0 ? 'var(--grn)' : stats.totalPnl < 0 ? 'var(--red)' : 'var(--txt2)'

  if (collapsed) {
    return (
      <div className={styles.collapsed} onClick={() => setCollapsed(false)} title="Afficher la session">
        <span className={styles.dot}/>
        <span className={styles.collapsedTxt}>
          {duration} · {totalTrades} trades · 
          <span style={{color: pnlColor, fontWeight: 700}}> {stats.totalPnl >= 0 ? '+' : ''}${fmt(stats.totalPnl, 2)}</span>
        </span>
      </div>
    )
  }

  return (
    <div className={styles.bar}>
      <div className={styles.cell}>
        <span className={styles.label}>SESSION</span>
        <span className={styles.value}>{duration}</span>
      </div>
      <div className={styles.cell}>
        <span className={styles.label}>TRADES</span>
        <span className={styles.value}>{totalTrades}</span>
      </div>
      <div className={styles.cell}>
        <span className={styles.label}>PNL</span>
        <span className={styles.value} style={{color: pnlColor}}>
          {stats.totalPnl >= 0 ? '+' : ''}${fmt(stats.totalPnl, 2)}
        </span>
      </div>
      <div className={styles.cell}>
        <span className={styles.label}>WIN</span>
        <span className={styles.value}>
          {stats.wins}/{totalTrades}
          {totalTrades > 0 && <span className={styles.subVal}> · {winRate}%</span>}
        </span>
      </div>
      {stats.best && (
        <div className={styles.cell}>
          <span className={styles.label}>BEST</span>
          <span className={styles.value} style={{color: 'var(--grn)'}}>
            {stats.best.pair.replace('USDT', '')} +${fmt(Math.abs(stats.best.pnl), 0)}
          </span>
        </div>
      )}
      {stats.worst && stats.worst.pnl < 0 && (
        <div className={styles.cell}>
          <span className={styles.label}>WORST</span>
          <span className={styles.value} style={{color: 'var(--red)'}}>
            {stats.worst.pair.replace('USDT', '')} -${fmt(Math.abs(stats.worst.pnl), 0)}
          </span>
        </div>
      )}
      <div className={styles.actions}>
        <button onClick={resetSession} className={styles.btn} title="Réinitialiser la session">↻</button>
        <button onClick={() => setCollapsed(true)} className={styles.btn} title="Réduire">─</button>
      </div>
    </div>
  )
}
