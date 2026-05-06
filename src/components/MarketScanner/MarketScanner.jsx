import { useState, useEffect, useRef } from 'react'
import { useStore } from '../../store'
import { fmtPx } from '../../lib/format'
import styles from './MarketScanner.module.css'
import { logSilent } from '../../lib/errorMonitor'

const PAIRS = [
  'BTCUSDT','ETHUSDT','SOLUSDT','BNBUSDT','XRPUSDT',
  'DOGEUSDT','ADAUSDT','AVAXUSDT','LINKUSDT','ARBUSDT',
  'DOTUSDT','MATICUSDT','UNIUSDT','AAVEUSDT','NEARUSDT',
  'APTUSDT','SUIUSDT','INJUSDT','TIAUSDT','WIFUSDT',
  'LDOUSDT','OPUSDT','MKRUSDT','SNXUSDT','RUNEUSDT',
]

function simpleRSI(closes, period=14) {
  if (closes.length < 3) return null
  const p = Math.min(period, closes.length-1)
  let gains=0, losses=0
  for (let i=closes.length-p; i<closes.length; i++) {
    const d = closes[i]-closes[i-1]
    if (d>=0) gains+=d; else losses-=d
  }
  const rs = losses===0 ? 999 : gains/losses
  return Math.round(100 - 100/(1+rs))
}

function getSignal(chg, rsi) {
  if (rsi !== null) {
    if (rsi >= 70) return { label:'Suracheté', color:'#ef4444', emoji:'🔴' }
    if (rsi <= 30) return { label:'Survendu', color:'#22c55e', emoji:'🟢' }
  }
  if (chg > 5)  return { label:'Forte hausse', color:'var(--grn)', emoji:'🚀' }
  if (chg > 2)  return { label:'Hausse', color:'var(--grn)', emoji:'↑' }
  if (chg < -5) return { label:'Forte baisse', color:'var(--red)', emoji:'💥' }
  if (chg < -2) return { label:'Baisse', color:'var(--red)', emoji:'↓' }
  return { label:'Neutre', color:'var(--txt3)', emoji:'→' }
}

export function MarketScanner() {
  const setPair = useStore(s => s.setPair)
  const setView = useStore(s => s.setView)
  const setTab  = useStore(s => s.setTab)
  const [data,   setData]   = useState({})
  const [closes, setCloses] = useState({})
  const [sort,   setSort]   = useState('volume')
  const [filter, setFilter] = useState('all')
  const [search, setSearch] = useState('')
  const wsRef = useRef(null)

  // Initial REST load for accurate 24h data, then WS for live updates
  useEffect(() => {
    const loadRest = async () => {
      try {
        const syms = JSON.stringify(PAIRS)
        const r = await fetch(`https://api.binance.com/api/v3/ticker/24hr?symbols=${encodeURIComponent(syms)}`)
        const arr = await r.json()
        if (!Array.isArray(arr)) return
        const update = {}
        arr.forEach(t => {
          if (PAIRS.includes(t.symbol)) {
            update[t.symbol] = {
              price:  parseFloat(t.lastPrice),
              chg:    parseFloat(t.priceChangePercent),
              volume: parseFloat(t.quoteVolume) / 1e6,
              high:   parseFloat(t.highPrice),
              low:    parseFloat(t.lowPrice),
              open:   parseFloat(t.openPrice),
            }
          }
        })
        setData(prev => ({...prev, ...update}))
        setLoaded(prev => prev + Object.keys(update).length)
      } catch(e){logSilent(e,'MarketScanner')}
    }
    loadRest()
  }, [])

  // Binance mini ticker stream — all pairs
  useEffect(() => {
    let ws, dead=false, retryT
    const connect = () => {
      if (dead) return
      ws = new WebSocket('wss://stream.binance.com:9443/ws/!miniTicker@arr')
      ws.onmessage = e => {
        try {
          const arr = JSON.parse(e.data)
          if (!Array.isArray(arr)) return
          const update = {}
          arr.forEach(t => {
            if (PAIRS.includes(t.s)) {
              const close = parseFloat(t.c)
              const open  = parseFloat(t.o)
              // miniTicker doesn't include priceChangePercent — compute it
              const chg = (open > 0 && isFinite(close) && isFinite(open))
                ? ((close - open) / open) * 100
                : 0
              update[t.s] = {
                price:  close,
                chg,
                volume: parseFloat(t.q) / 1e6,
                high:   parseFloat(t.h),
                low:    parseFloat(t.l),
                open,
              }
            }
          })
          setData(prev => {
            const next = {...prev,...update}
            // Update close prices for RSI
            setCloses(cl => {
              const nc = {...cl}
              Object.keys(update).forEach(sym => {
                nc[sym] = [...(nc[sym]||[]), update[sym].price].slice(-20)
              })
              return nc
            })
            return next
          })
        } catch(e){logSilent(e,'MarketScanner')}
      }
      ws.onerror = () => {}
      ws.onclose = () => { if(!dead) retryT=setTimeout(connect,2000) }
    }
    connect()
    return () => { dead=true; clearTimeout(retryT); if(ws){ws.onclose=null;try{ws.close()}catch(e){logSilent(e,'MarketScanner')}} }
  }, [])

  const handlePair = (pair) => {
    setPair(pair)
    setView('trade')
    setTab('Spot')
  }

  const rows = PAIRS
    .filter(p => {
      if (search) return p.toLowerCase().includes(search.toLowerCase())
      const d = data[p]
      if (filter === 'gainers') return (d?.chg||0) > 1
      if (filter === 'losers')  return (d?.chg||0) < -1
      if (filter === 'hot')     return Math.abs(d?.chg||0) > 3
      if (filter === 'volume')  return (d?.volume||0) > 500
      return true
    })
    .sort((a,b) => {
      if (sort === 'volume') return (data[b]?.volume||0)-(data[a]?.volume||0)
      if (sort === 'chg_d')  return (data[b]?.chg||0)-(data[a]?.chg||0)
      if (sort === 'chg_u')  return (data[a]?.chg||0)-(data[b]?.chg||0)
      if (sort === 'rsi') {
        const ra = simpleRSI(closes[a]||[])
        const rb = simpleRSI(closes[b]||[])
        return (rb||50)-(ra||50)
      }
      return 0
    })

  // Stats
  const gainers = PAIRS.filter(p=>(data[p]?.chg||0)>0).length
  const losers  = PAIRS.filter(p=>(data[p]?.chg||0)<0).length
  const loaded  = Object.keys(data).length

  return (
    <div className={styles.wrap}>
      {/* Header */}
      <div className={styles.header}>
        <div className={styles.headerLeft}>
          <span className={styles.title}>📊 Scanner Marché</span>
          {loaded > 0 && (
            <div className={styles.stats}>
              <span style={{color:'var(--grn)'}}>↑ {gainers}</span>
              <span style={{color:'var(--txt3)'}}>·</span>
              <span style={{color:'var(--red)'}}>↓ {losers}</span>
              <span className={styles.liveTag}>LIVE</span>
            </div>
          )}
        </div>
        <input
          className={styles.search}
          placeholder="Rechercher..."
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
      </div>

      {/* Toolbar */}
      <div className={styles.toolbar}>
        <div className={styles.filters}>
          {[
            ['all','Tous'],['gainers','↑ Hausse'],['losers','↓ Baisse'],
            ['hot','🔥 Hot'],['volume','Vol élevé']
          ].map(([id,l]) => (
            <button key={id}
              className={`${styles.fb} ${filter===id?styles.fbOn:''}`}
              onClick={()=>setFilter(id)}
            >{l}</button>
          ))}
        </div>
        <div className={styles.sorts}>
          <span className={styles.sortLabel}>Trier:</span>
          {[['volume','Vol'],['chg_d','↑%'],['chg_u','↓%'],['rsi','RSI']].map(([id,l]) => (
            <button key={id}
              className={`${styles.sb} ${sort===id?styles.sbOn:''}`}
              onClick={()=>setSort(id)}
            >{l}</button>
          ))}
        </div>
      </div>

      {/* Table head */}
      <div className={styles.thead}>
        <span>Paire</span>
        <span>Prix</span>
        <span>24h %</span>
        <span>Volume (M$)</span>
        <span>Haut / Bas</span>
        <span>RSI(14)</span>
        <span>Signal</span>
      </div>

      {/* Rows */}
      <div className={styles.tbody}>
        {rows.length === 0 && loaded === 0 && (
          <div className={styles.loading}>
            <div className={styles.spin}/>Chargement des données...
          </div>
        )}
        {rows.map(pair => {
          const d   = data[pair]
          const rsi = simpleRSI(closes[pair]||[])
          const chg = d?.chg ?? null
          const sig = d ? getSignal(chg, rsi) : null
          const base = pair.replace('USDT','')

          return (
            <div key={pair} className={styles.row} onClick={()=>handlePair(pair)} title={`Trader ${base}/USDT`}>
              <div className={styles.pairCell}>
                <span className={styles.base}>{base}</span>
                <span className={styles.quote}>/USDT</span>
              </div>
              <span className={styles.price}>{d ? fmtPx(d.price) : '—'}</span>
              <span className={styles.chg} style={{color: !d||chg===null||isNaN(chg)?'var(--txt3)':chg>=0?'var(--grn)':'var(--red)'}}>
                {d && chg !== null && !isNaN(chg) ? (chg >= 0 ? '+' : '') + chg.toFixed(2) + '%' : d ? '0.00%' : '—'}
              </span>
              <span className={styles.vol}>{d && isFinite(d.volume) ? d.volume.toFixed(1) : '—'}</span>
              <span className={styles.hl}>
                {d ? <><span style={{color:'var(--grn)'}}>{fmtPx(d.high)}</span> · <span style={{color:'var(--red)'}}>{fmtPx(d.low)}</span></> : '—'}
              </span>
              <span className={styles.rsi} style={{
                color: rsi===null||!isFinite(rsi)?'var(--txt3)':rsi>=70?'#ef4444':rsi<=30?'#22c55e':'var(--txt2)'
              }}>
                {rsi!==null&&isFinite(rsi) ? rsi : '—'}
              </span>
              <span className={styles.signal} style={{color:sig?.color}}>
                {sig ? `${sig.emoji} ${sig.label}` : '...'}
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}
