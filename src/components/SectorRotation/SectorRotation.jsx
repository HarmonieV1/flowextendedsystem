import { useState, useEffect } from 'react'
import { useStore } from '../../store'
import { fmt } from '../../lib/format'
import styles from './SectorRotation.module.css'

const SECTORS = {
  'L1': ['BTCUSDT','ETHUSDT','SOLUSDT','BNBUSDT','ADAUSDT','AVAXUSDT','DOTUSDT','ATOMUSDT','NEARUSDT','APTUSDT','SUIUSDT','TONUSDT','ICPUSDT','ALGOUSDT'],
  'L2': ['ARBUSDT','OPUSDT','MATICUSDT','STXUSDT','MANTAUSDT','SEIUSDT','IMXUSDT'],
  'DeFi': ['UNIUSDT','AAVEUSDT','MKRUSDT','LINKUSDT','SNXUSDT','CRVUSDT','COMPUSDT','LDOUSDT','INJUSDT','PENDLEUSDT','JUPUSDT'],
  'AI': ['FETUSDT','RENDERUSDT','TAOUSDT','GRTUSDT','THETAUSDT','WLDUSDT'],
  'Meme': ['DOGEUSDT','SHIBUSDT','PEPEUSDT','WIFUSDT','BONKUSDT','FLOKIUSDT'],
  'Gaming': ['AXSUSDT','GALAUSDT','IMXUSDT'],
  'Exchange': ['BNBUSDT','LTCUSDT','BCHUSDT','ETCUSDT'],
}

export function SectorRotation() {
  const setPair = useStore(s => s.setPair)
  const setView = useStore(s => s.setView)
  const setTab  = useStore(s => s.setTab)
  const goTrade = (sym) => { setPair(sym); setView('trade'); setTab('Futures') }
  const [sectorData, setSectorData] = useState({})
  const [loading, setLoading] = useState(true)
  const [expanded, setExpanded] = useState(null)

  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch('https://api.binance.com/api/v3/ticker/24hr')
        const all = await res.json()
        const map = {}
        all.forEach(t => { map[t.symbol] = t })

        const results = {}
        for (const [sector, pairs] of Object.entries(SECTORS)) {
          const valid = pairs.filter(p => map[p]).map(p => ({
            symbol: p,
            base: p.replace('USDT',''),
            change: parseFloat(map[p].priceChangePercent),
            vol: parseFloat(map[p].quoteVolume),
            price: parseFloat(map[p].lastPrice),
          }))
          if (!valid.length) continue
          const avgChg = valid.reduce((s,v) => s + v.change, 0) / valid.length
          const totalVol = valid.reduce((s,v) => s + v.vol, 0)
          const best = valid.reduce((a,b) => a.change > b.change ? a : b)
          const worst = valid.reduce((a,b) => a.change < b.change ? a : b)
          results[sector] = { avgChg, totalVol, tokens: valid.sort((a,b) => b.change - a.change), best, worst, count: valid.length }
        }
        setSectorData(results)
      } catch(_) {}
      setLoading(false)
    }
    load()
    const iv = setInterval(load, 60000)
    return () => clearInterval(iv)
  }, [])

  const sectors = Object.entries(sectorData).sort((a,b) => b[1].avgChg - a[1].avgChg)

  const fmtVol = (v) => v >= 1e9 ? `$${(v/1e9).toFixed(1)}B` : `$${(v/1e6).toFixed(0)}M`

  return (
    <div className={styles.wrap}>
      <div className={styles.header}>
        <span className={styles.title}>Sector Rotation</span>
        <span className={styles.sub}>Performance 24h par secteur</span>
      </div>
      {loading ? <div className={styles.loading}>Analyse sectorielle...</div> : (
        <div className={styles.list}>
          {sectors.map(([name, data]) => (
            <div key={name} className={styles.sector}>
              <div className={styles.sectorHead} onClick={() => setExpanded(expanded === name ? null : name)}>
                <span className={styles.sectorName}>{name}</span>
                <span className={styles.sectorCount}>{data.count} tokens</span>
                <div className={styles.sectorBar}>
                  <div className={styles.sectorFill} style={{
                    width: `${Math.min(100, Math.abs(data.avgChg) * 5)}%`,
                    background: data.avgChg >= 0 ? 'var(--grn)' : 'var(--red)',
                  }}/>
                </div>
                <span className={styles.sectorChg} style={{color: data.avgChg >= 0 ? 'var(--grn)' : 'var(--red)'}}>
                  {data.avgChg >= 0 ? '+' : ''}{data.avgChg.toFixed(2)}%
                </span>
                <span className={styles.sectorVol}>{fmtVol(data.totalVol)}</span>
                <span className={styles.expand}>{expanded === name ? '▾' : '▸'}</span>
              </div>
              {expanded === name && (
                <div className={styles.tokens}>
                  {data.tokens.map(t => (
                    <div key={t.symbol} className={styles.token} onClick={() => goTrade(t.symbol)}>
                      <span className={styles.tokenName}>{t.base}</span>
                      <span className={styles.tokenChg} style={{color: t.change >= 0 ? 'var(--grn)' : 'var(--red)'}}>
                        {t.change >= 0 ? '+' : ''}{t.change.toFixed(1)}%
                      </span>
                      <span className={styles.tokenVol}>{fmtVol(t.vol)}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
      <div className={styles.footer}>7 secteurs · Données Binance · Refresh 60s</div>
    </div>
  )
}
