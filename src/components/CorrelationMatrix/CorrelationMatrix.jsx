import { useState, useEffect, useRef } from 'react'
import { fmtPx } from '../../lib/format'
import styles from './CorrelationMatrix.module.css'

const PAIRS = ['BTCUSDT','ETHUSDT','SOLUSDT','BNBUSDT','XRPUSDT','DOGEUSDT','AVAXUSDT','LINKUSDT']
const LABELS = PAIRS.map(p => p.replace('USDT',''))
const PERIOD = 24 // hours

export function CorrelationMatrix() {
  const [matrix, setMatrix] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      try {
        // Fetch 1h klines for each pair (24 data points = 24h)
        const allData = await Promise.all(
          PAIRS.map(async pair => {
            const res = await fetch(`https://api.binance.com/api/v3/klines?symbol=${pair}&interval=1h&limit=${PERIOD}`)
            const raw = await res.json()
            return raw.map(r => parseFloat(r[4])) // close prices
          })
        )

        // Compute returns
        const returns = allData.map(prices => {
          const ret = []
          for (let i = 1; i < prices.length; i++) {
            ret.push((prices[i] - prices[i-1]) / prices[i-1])
          }
          return ret
        })

        // Compute correlation matrix
        const n = PAIRS.length
        const corr = Array(n).fill(null).map(() => Array(n).fill(0))

        for (let i = 0; i < n; i++) {
          for (let j = 0; j < n; j++) {
            if (i === j) { corr[i][j] = 1; continue }
            const a = returns[i], b = returns[j]
            const len = Math.min(a.length, b.length)
            let sumA=0, sumB=0, sumAB=0, sumA2=0, sumB2=0
            for (let k = 0; k < len; k++) {
              sumA += a[k]; sumB += b[k]
              sumAB += a[k]*b[k]; sumA2 += a[k]*a[k]; sumB2 += b[k]*b[k]
            }
            const num = len*sumAB - sumA*sumB
            const den = Math.sqrt((len*sumA2-sumA*sumA)*(len*sumB2-sumB*sumB))
            corr[i][j] = den > 0 ? num/den : 0
          }
        }

        setMatrix(corr)
      } catch(e) { console.warn('[CORR] Error:', e.message) }
      setLoading(false)
    }
    load()
    const iv = setInterval(load, 300000) // refresh every 5min
    return () => clearInterval(iv)
  }, [])

  const getColor = (v) => {
    if (v >= 0.8) return '#8cc63f'
    if (v >= 0.5) return '#22c55e'
    if (v >= 0.2) return '#4ade80'
    if (v >= -0.2) return '#71717a'
    if (v >= -0.5) return '#f97316'
    return '#ff3b5c'
  }

  const getBg = (v) => {
    const abs = Math.abs(v)
    if (v >= 0) return `rgba(140,198,63,${abs*0.15})`
    return `rgba(255,59,92,${abs*0.15})`
  }

  return (
    <div className={styles.wrap}>
      <div className={styles.header}>
        <span className={styles.title}>🔗 Matrice de Corrélation</span>
        <span className={styles.period}>24h · Returns horaires</span>
      </div>

      {loading && !matrix && <div className={styles.loading}>Calcul des corrélations...</div>}

      {matrix && (
        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th className={styles.corner}></th>
                {LABELS.map(l => <th key={l} className={styles.th}>{l}</th>)}
              </tr>
            </thead>
            <tbody>
              {matrix.map((row, i) => (
                <tr key={i}>
                  <td className={styles.rowLabel}>{LABELS[i]}</td>
                  {row.map((v, j) => (
                    <td key={j} className={styles.cell}
                      style={{background: i===j ? 'rgba(255,255,255,.03)' : getBg(v), color: getColor(v)}}
                    >
                      {i===j ? '—' : v.toFixed(2)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className={styles.legend}>
        <span style={{color:'#8cc63f'}}>■ Forte positive (&gt;0.8)</span>
        <span style={{color:'#4ade80'}}>■ Positive</span>
        <span style={{color:'#71717a'}}>■ Neutre</span>
        <span style={{color:'#f97316'}}>■ Négative</span>
        <span style={{color:'#ff3b5c'}}>■ Forte inverse</span>
      </div>
      <div className={styles.footer}>
        Corrélation de Pearson · Données Binance · {PAIRS.length} actifs · Mise à jour 5min
      </div>
    </div>
  )
}
