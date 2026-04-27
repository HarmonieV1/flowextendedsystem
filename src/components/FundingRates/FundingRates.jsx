import { useState, useEffect } from 'react'
import styles from './FundingRates.module.css'

const SYMBOLS = [
  'BTCUSDT','ETHUSDT','SOLUSDT','BNBUSDT','XRPUSDT',
  'DOGEUSDT','ARBUSDT','LINKUSDT','AVAXUSDT','MATICUSDT',
  'ADAUSDT','DOTUSDT','NEARUSDT','INJUSDT','SUIUSDT'
]

const fmtRate = r => r === null ? '—' : (r >= 0 ? '+' : '') + r.toFixed(4) + '%'
const rateColor = r => {
  if (r === null) return 'var(--txt3)'
  if (r > 0.05) return '#ef4444'
  if (r > 0.01) return '#f97316'
  if (r < -0.01) return '#22c55e'
  return 'var(--txt2)'
}

async function fetchBinance(sym) {
  try {
    const r = await fetch(`https://fapi.binance.com/fapi/v1/premiumIndex?symbol=${sym}`, {signal:AbortSignal.timeout(5000)})
    const d = await r.json()
    return { rate: parseFloat(d.lastFundingRate) * 100, nextFunding: d.nextFundingTime }
  } catch { return { rate: null, nextFunding: null } }
}

async function fetchBybit(sym) {
  try {
    const r = await fetch(`https://api.bybit.com/v5/market/tickers?category=linear&symbol=${sym}`, {signal:AbortSignal.timeout(5000)})
    const d = await r.json()
    const item = d.result?.list?.[0]
    return parseFloat(item?.fundingRate) * 100 || null
  } catch { return null }
}

export function FundingRates() {
  const [data, setData]       = useState([])
  const [loading, setLoading] = useState(false)
  const [sortBy, setSortBy]   = useState('diff')

  const load = async () => {
    setLoading(true)
    const results = await Promise.all(SYMBOLS.map(async sym => {
      const [bin, bybit] = await Promise.all([fetchBinance(sym), fetchBybit(sym)])
      const binRate = bin.rate
      const diff = binRate !== null && bybit !== null ? Math.abs(binRate - bybit) : null
      return { sym: sym.replace('USDT',''), binRate, bybit, diff, nextFunding: bin.nextFunding }
    }))
    setData(results)
    setLoading(false)
  }

  useEffect(() => { load(); const t = setInterval(load, 5*60*1000); return ()=>clearInterval(t) }, [])

  const sorted = [...data].sort((a,b) => {
    if (sortBy === 'diff') return (b.diff||0) - (a.diff||0)
    if (sortBy === 'bin')  return Math.abs(b.binRate||0) - Math.abs(a.binRate||0)
    return 0
  })

  const arbs = data.filter(r => r.diff && r.diff > 0.01).sort((a,b)=>b.diff-a.diff)
  const extremePositive = data.filter(r => r.binRate && r.binRate > 0.05)
  const extremeNegative = data.filter(r => r.binRate && r.binRate < -0.01)

  const fmtNext = (ts) => {
    if (!ts) return '—'
    const diff = ts - Date.now()
    if (diff < 0) return 'Passé'
    const h = Math.floor(diff / 3600000)
    const m = Math.floor((diff % 3600000) / 60000)
    return `${h}h ${m}m`
  }

  return (
    <div className={styles.wrap}>
      <div className={styles.header}>
        <span className={styles.title}>💰 Funding Rates · {SYMBOLS.length} paires</span>
        <div className={styles.headerRight}>
          <button className={styles.sortBtn + (sortBy==='diff'?' '+styles.sortOn:'')} onClick={()=>setSortBy('diff')}>Diff</button>
          <button className={styles.sortBtn + (sortBy==='bin'?' '+styles.sortOn:'')} onClick={()=>setSortBy('bin')}>Taux</button>
          <button className={styles.refreshBtn} onClick={load} disabled={loading}>{loading?'⟳':'↻'}</button>
        </div>
      </div>

      {/* Alerts */}
      {arbs.length > 0 && (
        <div className={styles.arbBlock}>
          <div className={styles.arbTitle}>⚡ Arbitrage Funding ({arbs.length})</div>
          {arbs.slice(0,4).map(a => (
            <div key={a.sym} className={styles.arbRow}>
              <span className={styles.arbSym}>{a.sym}</span>
              <span className={styles.arbDir}>{a.binRate !== null && a.bybit !== null ? (a.binRate > a.bybit ? 'Long Bybit / Short Binance' : 'Long Binance / Short Bybit') : ''}</span>
              <span className={styles.arbDiff} style={{color:'#f59e0b'}}>+{a.diff?.toFixed(4)}%</span>
            </div>
          ))}
        </div>
      )}

      {/* Sentiment indicators */}
      <div className={styles.sentRow}>
        <div className={styles.sentBox} style={{borderColor:'rgba(239,68,68,.3)'}}>
          <span className={styles.sentVal} style={{color:'#ef4444'}}>{extremePositive.length}</span>
          <span className={styles.sentLbl}>Suracheté (funding élevé)</span>
        </div>
        <div className={styles.sentBox} style={{borderColor:'rgba(34,197,94,.3)'}}>
          <span className={styles.sentVal} style={{color:'#22c55e'}}>{extremeNegative.length}</span>
          <span className={styles.sentLbl}>Survendu (funding négatif)</span>
        </div>
      </div>

      <div className={styles.tableHead}>
        <span>Paire</span>
        <span>Binance</span>
        <span>Bybit</span>
        <span>Diff</span>
        <span>Prochain</span>
      </div>

      <div className={styles.list}>
        {sorted.map(r => (
          <div key={r.sym} className={styles.row}>
            <span className={styles.sym}>{r.sym}</span>
            <span style={{color:rateColor(r.binRate)}}>{fmtRate(r.binRate)}</span>
            <span style={{color:rateColor(r.bybit)}}>{fmtRate(r.bybit)}</span>
            <span style={{color:r.diff&&r.diff>0.01?'#f59e0b':'var(--txt3)'}}>
              {r.diff!=null?r.diff.toFixed(4)+'%':'—'}
            </span>
            <span style={{color:'var(--txt3)',fontSize:9}}>{fmtNext(r.nextFunding)}</span>
          </div>
        ))}
        {data.length === 0 && <div className={styles.loading}>Chargement {SYMBOLS.length} paires...</div>}
      </div>

      <div className={styles.footer}>Binance Perps + Bybit Perps · Refresh 5min · {SYMBOLS.length} paires</div>
    </div>
  )
}
