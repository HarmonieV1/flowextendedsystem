import { useState, useEffect, useRef } from 'react'
import { useStore } from '../../store'
import { fmt, fmtPx } from '../../lib/format'
import styles from './AlphaScanner.module.css'

// Scan all USDT pairs for volume spikes
const BINANCE_24H = 'https://api.binance.com/api/v3/ticker/24hr'

function formatVol(v) {
  if (v >= 1e9) return `$${(v/1e9).toFixed(1)}B`
  if (v >= 1e6) return `$${(v/1e6).toFixed(1)}M`
  if (v >= 1e3) return `$${(v/1e3).toFixed(0)}K`
  return `$${v.toFixed(0)}`
}

export function AlphaScanner() {
  const setPair = useStore(s => s.setPair)
  const setView = useStore(s => s.setView)
  const setTab  = useStore(s => s.setTab)
  const goTrade = (sym) => { setPair(sym); setView('trade'); setTab('Futures') }
  const [alerts, setAlerts] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('all') // all | mega | new | pump | dump
  const [sortBy, setSortBy] = useState('volSpike') // volSpike | priceChg | volume
  const prevDataRef = useRef(null)

  const scan = async () => {
    setLoading(true)
    try {
      const res = await fetch(BINANCE_24H)
      const tickers = await res.json()

      // Filter USDT pairs only, exclude stablecoins and leverage tokens
      const usdt = tickers.filter(t =>
        t.symbol.endsWith('USDT') &&
        !t.symbol.includes('UP') && !t.symbol.includes('DOWN') &&
        !['USDCUSDT','BUSDUSDT','DAIUSDT','TUSDUSDT','FDUSDUSDT','EURUSDT'].includes(t.symbol) &&
        parseFloat(t.quoteVolume) > 0
      )

      // Calculate metrics
      const results = usdt.map(t => {
        const vol24h = parseFloat(t.quoteVolume) // in USDT
        const priceChg = parseFloat(t.priceChangePercent)
        const price = parseFloat(t.lastPrice)
        const high = parseFloat(t.highPrice)
        const low = parseFloat(t.lowPrice)
        const trades = parseInt(t.count)
        const range = high > 0 ? ((high - low) / low * 100) : 0

        // Volume spike score: compare to typical (we use trade count as proxy)
        // High volume + high price change = potential alpha
        const volScore = Math.log10(Math.max(1, vol24h))
        const momentumScore = Math.abs(priceChg)
        const spikeScore = volScore * (1 + momentumScore / 100)

        return {
          symbol: t.symbol,
          base: t.symbol.replace('USDT', ''),
          price,
          priceChg,
          vol24h,
          trades,
          range,
          high, low,
          spikeScore,
          // Classification
          isPump: priceChg > 15,
          isDump: priceChg < -15,
          isMega: vol24h > 500e6,
          isNew: vol24h < 5e6 && Math.abs(priceChg) > 20, // Low cap explosive move
        }
      }).filter(r => r.vol24h > 100000) // Min $100K volume

      // Sort by spike score
      results.sort((a, b) => b.spikeScore - a.spikeScore)

      // Generate alerts for exceptional movers
      const newAlerts = results
        .filter(r => Math.abs(r.priceChg) > 8 || r.vol24h > 200e6)
        .slice(0, 50)

      setAlerts(newAlerts)
      prevDataRef.current = results
    } catch (e) {
      console.warn('[ALPHA] Scan error:', e.message)
    }
    setLoading(false)
  }

  useEffect(() => {
    scan()
    const iv = setInterval(scan, 30000) // Refresh every 30s
    return () => clearInterval(iv)
  }, [])

  // Filter
  const filtered = alerts.filter(a => {
    if (filter === 'mega') return a.isMega
    if (filter === 'pump') return a.isPump
    if (filter === 'dump') return a.isDump
    if (filter === 'new') return a.isNew
    return true
  })

  // Sort
  const sorted = [...filtered].sort((a, b) => {
    if (sortBy === 'priceChg') return Math.abs(b.priceChg) - Math.abs(a.priceChg)
    if (sortBy === 'volume') return b.vol24h - a.vol24h
    return b.spikeScore - a.spikeScore
  })

  return (
    <div className={styles.wrap}>
      <div className={styles.header}>
        <span className={styles.title}>Alpha Calls Scanner</span>
        <span className={styles.count}>{sorted.length} signals</span>
        <button className={styles.refreshBtn} onClick={scan} disabled={loading}>
          {loading ? '...' : '↻'}
        </button>
      </div>

      <div className={styles.filters}>
        {[['all','Tous'],['pump','Pumps ↑'],['dump','Dumps ↓'],['mega','Mega Vol'],['new','Low Cap']].map(([id,lbl]) => (
          <button key={id} className={`${styles.filterBtn} ${filter===id?styles.filterOn:''}`} onClick={()=>setFilter(id)}>{lbl}</button>
        ))}
        <div className={styles.sep}/>
        {[['volSpike','Score'],['priceChg','% Move'],['volume','Volume']].map(([id,lbl]) => (
          <button key={id} className={`${styles.sortBtn} ${sortBy===id?styles.sortOn:''}`} onClick={()=>setSortBy(id)}>{lbl}</button>
        ))}
      </div>

      <div className={styles.list}>
        {loading && alerts.length === 0 && (
          <div className={styles.loading}>Scan de {'>'}2000 paires Binance...</div>
        )}

        {sorted.map((a, i) => (
          <div key={a.symbol} className={styles.row} onClick={() => goTrade(a.symbol)}>
            <div className={styles.rank}>#{i+1}</div>
            <div className={styles.info}>
              <div className={styles.sym}>
                {a.base}
                {a.isPump && <span className={styles.tag} style={{background:'rgba(140,198,63,.15)',color:'#8cc63f'}}>PUMP</span>}
                {a.isDump && <span className={styles.tag} style={{background:'rgba(255,59,92,.15)',color:'#ff3b5c'}}>DUMP</span>}
                {a.isMega && <span className={styles.tag} style={{background:'rgba(245,158,11,.15)',color:'#f59e0b'}}>MEGA</span>}
                {a.isNew && <span className={styles.tag} style={{background:'rgba(139,92,246,.15)',color:'#8b5cf6'}}>LOW CAP</span>}
              </div>
              <div className={styles.price}>{fmtPx(a.price)}</div>
            </div>
            <div className={styles.metrics}>
              <span className={styles.chg} style={{color: a.priceChg >= 0 ? 'var(--grn)' : 'var(--red)'}}>
                {a.priceChg >= 0 ? '+' : ''}{a.priceChg.toFixed(1)}%
              </span>
              <span className={styles.vol}>{formatVol(a.vol24h)}</span>
              <span className={styles.range}>R: {a.range.toFixed(1)}%</span>
            </div>
            <div className={styles.bar}>
              <div className={styles.barFill} style={{
                width: `${Math.min(100, Math.abs(a.priceChg) * 2)}%`,
                background: a.priceChg >= 0 ? 'var(--grn)' : 'var(--red)',
              }}/>
            </div>
          </div>
        ))}

        {!loading && sorted.length === 0 && (
          <div className={styles.empty}>Aucun signal détecté avec ce filtre</div>
        )}
      </div>

      <div className={styles.footer}>
        Scan live toutes les 30s · Binance · {'>'}2000 paires · Cliquer pour trader
      </div>
    </div>
  )
}
