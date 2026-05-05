import { useState, useEffect } from 'react'
import { useStore } from '../../store'
import styles from './MarketOverview.module.css'
import { logSilent } from '../../lib/errorMonitor'

export function MarketOverview() {
  const [mcap, setMcap] = useState(null)
  const lastPx = useStore(s => s.lastPx)

  useEffect(() => {
    const load = async () => {
      try {
        const r = await fetch('https://api.coingecko.com/api/v3/global', {
          signal: AbortSignal.timeout(5000)
        })
        if (!r.ok) return
        const d = await r.json()
        setMcap(d?.data?.total_market_cap?.usd || null)
      } catch(e){logSilent(e,'MarketOverview')}
    }
    load()
    const t = setInterval(load, 5 * 60 * 1000)
    return () => clearInterval(t)
  }, [])

  const fmt = (usd) => {
    if (!usd) return null
    if (usd >= 1e12) return '$' + (usd / 1e12).toFixed(2) + 'T'
    if (usd >= 1e9)  return '$' + (usd / 1e9).toFixed(0) + 'B'
    return '$' + (usd / 1e6).toFixed(0) + 'M'
  }

  if (!mcap) return null

  return (
    <div className={styles.bar}>
      <span className={styles.item}>
        <span className={styles.lbl}>MCap</span>
        <span className={styles.val}>{fmt(mcap)}</span>
      </span>
    </div>
  )
}
