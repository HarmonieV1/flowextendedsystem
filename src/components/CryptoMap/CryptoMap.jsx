import { useState, useEffect } from 'react'
import { useStore } from '../../store'
import styles from './CryptoMap.module.css'
import { logSilent } from '../../lib/errorMonitor'

export function CryptoMap() {
  const setPair = useStore(s => s.setPair)
  const setView = useStore(s => s.setView)
  const setTab  = useStore(s => s.setTab)

  const goTrade = (sym) => { setPair(sym); setView('trade'); setTab('Futures') }
  const [data, setData] = useState([])
  const [loading, setLoading] = useState(true)
  const [sort, setSort] = useState('mcap') // mcap | change | volume

  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch('https://api.binance.com/api/v3/ticker/24hr')
        const all = await res.json()
        const usdt = all
          .filter(t => t.symbol.endsWith('USDT') && !t.symbol.includes('UP') && !t.symbol.includes('DOWN')
            && !['USDCUSDT','BUSDUSDT','DAIUSDT','TUSDUSDT','FDUSDUSDT'].includes(t.symbol))
          .map(t => ({
            symbol: t.symbol,
            base: t.symbol.replace('USDT',''),
            price: +t.lastPrice,
            change: +t.priceChangePercent,
            vol: +t.quoteVolume,
          }))
          .filter(t => t.vol > 0 && t.price > 0)
          .sort((a,b) => b.vol - a.vol)
          .slice(0, 150)
        setData(usdt)
      } catch(e){logSilent(e,'CryptoMap')}
      setLoading(false)
    }
    load()
    const iv = setInterval(load, 30000)
    return () => clearInterval(iv)
  }, [])

  const sorted = [...data].sort((a,b) => {
    if (sort === 'change') return Math.abs(b.change) - Math.abs(a.change)
    if (sort === 'volume') return b.vol - a.vol
    return b.vol - a.vol // mcap proxy
  })

  const getColor = (chg) => {
    if (chg > 5) return '#8cc63f'
    if (chg > 2) return '#22c55e'
    if (chg > 0) return '#4ade80'
    if (chg > -2) return '#ef4444'
    if (chg > -5) return '#dc2626'
    return '#ff3b5c'
  }
  const getBg = (chg) => {
    const a = Math.min(0.3, Math.abs(chg) * 0.02)
    return chg >= 0 ? `rgba(140,198,63,${a})` : `rgba(255,59,92,${a})`
  }
  const getSize = (vol, maxVol) => {
    const ratio = vol / maxVol
    if (ratio > 0.3) return 'lg'
    if (ratio > 0.05) return 'md'
    return 'sm'
  }

  const maxVol = data.length ? data[0].vol : 1

  return (
    <div className={styles.wrap}>
      <div className={styles.header}>
        <span className={styles.title}>Crypto Heatmap</span>
        <div className={styles.sorts}>
          {[['mcap','Cap'],['change','Move'],['volume','Vol']].map(([id,lbl])=>(
            <button key={id} className={`${styles.sortBtn} ${sort===id?styles.sortOn:''}`} onClick={()=>setSort(id)}>{lbl}</button>
          ))}
        </div>
      </div>
      {loading ? <div className={styles.loading}>Chargement...</div> : (
        <div className={styles.grid}>
          {sorted.map(t => (
            <div key={t.symbol}
              className={`${styles.tile} ${styles[getSize(t.vol, maxVol)]}`}
              style={{background: getBg(t.change)}}
              onClick={() => goTrade(t.symbol)}
              title={`${t.base} · $${t.price < 1 ? t.price.toPrecision(4) : t.price.toLocaleString('en',{maximumFractionDigits:2})} · Vol: ${t.vol >= 1e9 ? (t.vol/1e9).toFixed(1)+'B' : (t.vol/1e6).toFixed(0)+'M'}`}
            >
              <div className={styles.tBase}>{t.base}</div>
              <div className={styles.tChg} style={{color: getColor(t.change)}}>
                {t.change >= 0 ? '+' : ''}{t.change.toFixed(1)}%
              </div>
              <div className={styles.tPrice}>${t.price < 1 ? t.price.toPrecision(3) : t.price >= 1000 ? (t.price/1000).toFixed(1)+'K' : t.price.toFixed(2)}</div>
            </div>
          ))}
        </div>
      )}
      <div className={styles.footer}>Top 150 par volume · Binance · Cliquer pour trader · 30s refresh</div>
    </div>
  )
}
