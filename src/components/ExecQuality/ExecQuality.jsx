import { useState, useEffect } from 'react'
import styles from './ExecQuality.module.css'

const EXCHANGES = [
  { id: 'binance', name: 'Binance', url: 'https://api.binance.com/api/v3/time' },
  { id: 'bybit',   name: 'Bybit',   url: 'https://api.bybit.com/v5/market/time' },
]

export function ExecQuality() {
  const [scores, setScores] = useState({})

  useEffect(() => {
    const measure = async () => {
      const results = {}
      for (const ex of EXCHANGES) {
        const t0 = performance.now()
        try {
          const res = await fetch(ex.url, { signal: AbortSignal.timeout(5000) })
          const t1 = performance.now()
          results[ex.id] = {
            latency: Math.round(t1 - t0),
            status: res.ok ? 'online' : 'degraded',
            score: Math.max(0, 100 - Math.round((t1 - t0) / 10)),
          }
        } catch {
          results[ex.id] = { latency: -1, status: 'offline', score: 0 }
        }
      }
      setScores(results)
    }
    measure()
    const iv = setInterval(measure, 15000)
    return () => clearInterval(iv)
  }, [])

  const getColor = (score) => score >= 80 ? 'var(--grn)' : score >= 50 ? '#f59e0b' : 'var(--red)'

  return (
    <div className={styles.wrap}>
      <div className={styles.title}>Execution Quality</div>
      <div className={styles.grid}>
        {EXCHANGES.map(ex => {
          const s = scores[ex.id]
          if (!s) return <div key={ex.id} className={styles.card}><span className={styles.name}>{ex.name}</span><span className={styles.val}>...</span></div>
          return (
            <div key={ex.id} className={styles.card}>
              <span className={styles.name}>{ex.name}</span>
              <span className={styles.latency} style={{color: getColor(s.score)}}>{s.latency > 0 ? `${s.latency}ms` : 'OFF'}</span>
              <div className={styles.bar}><div className={styles.barFill} style={{width:`${s.score}%`, background: getColor(s.score)}}/></div>
              <span className={styles.status} style={{color: s.status==='online'?'var(--grn)':s.status==='degraded'?'#f59e0b':'var(--red)'}}>
                {s.status === 'online' ? '●' : '○'} {s.score}/100
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}
