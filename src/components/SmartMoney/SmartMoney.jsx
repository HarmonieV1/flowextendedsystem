import { useState, useEffect, useRef } from 'react'
import styles from './SmartMoney.module.css'

const PAIRS = ['btcusdt','ethusdt','solusdt','bnbusdt','xrpusdt','linkusdt','avaxusdt','arbusdt']
const MIN_USD = 25_000

export function SmartMoney() {
  const [trades, setTrades] = useState([])
  const [filter, setFilter] = useState('all')
  const [wsStatus, setWsStatus] = useState('connecting') // connecting | live | error
  const wsRef = useRef(null)

  useEffect(() => {
    const streams = PAIRS.map(p=>`${p}@aggTrade`).join('/')
    let ws, dead=false, retryT

    const connect = () => {
      if (dead) return
      ws = new WebSocket(`wss://stream.binance.com:9443/stream?streams=${streams}`)
      wsRef.current = ws

      ws.onopen = () => setWsStatus('live')
      ws.onmessage = e => {
        try {
          const d = JSON.parse(e.data).data
          if (!d) return
          const price = parseFloat(d.p)
          const qty   = parseFloat(d.q)
          const usd   = price * qty
          if (usd < MIN_USD) return

          setTrades(prev => [{
            id:      `${d.a}-${d.T}`,
            type:    d.m ? 'sell' : 'buy',
            asset:   d.s.replace('USDT',''),
            usd,
            qty,
            price,
            time:    Date.now(),
            whale:   usd >= 500_000,
          }, ...prev.slice(0, 80)])
        } catch(_) {}
      }

      ws.onerror = () => setWsStatus('error')
      ws.onclose = () => { setWsStatus('connecting'); if (!dead) retryT = setTimeout(connect, 3000) }
    }

    connect()

    // Refresh timeAgo labels
    const tick = setInterval(() => {
      setTrades(prev => [...prev])
    }, 15_000)

    return () => {
      dead = true
      clearTimeout(retryT)
      clearInterval(tick)
      if (ws) { ws.onclose=null; try{ws.close()}catch(_){} }
    }
  }, [])

  const shown = filter === 'all' ? trades
    : trades.filter(t => t.type === filter)

  const buyVol  = trades.reduce((s,t)=>t.type==='buy'  ? s+t.usd : s, 0)
  const sellVol = trades.reduce((s,t)=>t.type==='sell' ? s+t.usd : s, 0)
  const total   = buyVol + sellVol
  const buyPct  = total > 0 ? Math.round(buyVol/total*100) : 50

  const fmtUsd = v => v >= 1e6 ? `$${(v/1e6).toFixed(2)}M` : `$${(v/1e3).toFixed(0)}K`
  const fmtAgo = t => {
    const s = Math.floor((Date.now()-t)/1000)
    return s < 60 ? `${s}s` : s < 3600 ? `${Math.floor(s/60)}m` : `${Math.floor(s/3600)}h`
  }

  return (
    <div className={styles.wrap}>
      {/* Header */}
      <div className={styles.hdr}>
        <div className={styles.hdrTop}>
          <span className={styles.title}>🐋 Whale Tracker</span>
          <span className={styles.badge} style={{
            background: wsStatus==='live' ? 'rgba(140,198,63,.15)' : wsStatus==='error' ? 'rgba(255,59,92,.15)' : 'rgba(255,255,255,.08)',
            color: wsStatus==='live' ? 'var(--grn)' : wsStatus==='error' ? 'var(--red)' : 'var(--txt3)',
            borderColor: wsStatus==='live' ? 'rgba(140,198,63,.3)' : 'var(--brd)'
          }}>
            {wsStatus==='live' ? '● LIVE' : wsStatus==='error' ? '✗ Erreur' : '◌ Connexion...'}
          </span>
          <span className={styles.min}>min $25K · Binance</span>
        </div>
        {total > 0 && (
          <div className={styles.pressure}>
            <span style={{color:'var(--grn)',fontSize:9}}>{buyPct}% Buy</span>
            <div className={styles.bar}>
              <div style={{width:`${buyPct}%`,height:'100%',background:'var(--grn)',borderRadius:'2px 0 0 2px'}}/>
              <div style={{width:`${100-buyPct}%`,height:'100%',background:'var(--red)',borderRadius:'0 2px 2px 0'}}/>
            </div>
            <span style={{color:'var(--red)',fontSize:9}}>{100-buyPct}% Sell</span>
          </div>
        )}
      </div>

      {/* Filters */}
      <div className={styles.filters}>
        {['all','buy','sell'].map(f=>(
          <button key={f}
            className={`${styles.fb} ${filter===f?styles.fbOn:''}`}
            onClick={()=>setFilter(f)}
          >{f==='all'?'Tous':f==='buy'?'↑ Buy':'↓ Sell'}</button>
        ))}
        <span className={styles.count}>{trades.length} trades</span>
      </div>

      {/* List */}
      <div className={styles.list}>
        {trades.length === 0 && (
          <div className={styles.empty}>
            <div className={styles.spin}/>
            <span>En attente de trades &gt;$100K sur Binance...</span>
            <span style={{fontSize:9,opacity:.5}}>BTC/ETH/SOL/BNB/XRP/LINK surveillés</span>
          </div>
        )}
        {shown.map(t => (
          <div key={t.id} className={`${styles.row} ${t.whale?styles.whale:''} ${t.type==='buy'?styles.rowBuy:styles.rowSell}`}>
            <span className={`${styles.side} ${t.type==='buy'?styles.buy:styles.sell}`}>
              {t.type==='buy'?'↑':'↓'}
            </span>
            <div className={styles.mid}>
              <div className={styles.asset}>
                {t.asset}
                {t.whale && <span className={styles.whaleBadge}>🐋</span>}
              </div>
              <div className={styles.detail}>
                {t.qty.toFixed(3)} @ ${t.price.toLocaleString()}
              </div>
            </div>
            <div className={styles.right}>
              <span className={`${styles.usd} ${t.type==='buy'?styles.buy:styles.sell}`}>
                {fmtUsd(t.usd)}
              </span>
              <span className={styles.ago}>{fmtAgo(t.time)}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
