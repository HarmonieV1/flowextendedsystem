import { useState, useEffect, useRef } from 'react'
import { useStore } from '../../store'
import { fmt, fmtPx } from '../../lib/format'
import styles from './DeltaFlow.module.css'

const MULTI_PAIRS = ['BTCUSDT','ETHUSDT','SOLUSDT','BNBUSDT','XRPUSDT']
const MAX_PTS = 60
const MIN_WHALE = 50000

export function DeltaFlow() {
  const pair    = useStore(s => s.pair)
  const setPair = useStore(s => s.setPair)
  const lastPx  = useStore(s => s.lastPx)

  const [mode, setMode]         = useState('single') // single | multi
  const [live, setLive]         = useState(false)
  const [ticks, setTicks]       = useState([])
  const [delta1m, setDelta1m]   = useState({ buy:0, sell:0 })
  const [delta5m, setDelta5m]   = useState({ buy:0, sell:0 })
  const [whales, setWhales]     = useState([])
  const [multiData, setMultiData] = useState({})
  const wsRef  = useRef(null)
  const buyRef = useRef(0); const sellRef = useRef(0)
  const ticksRef = useRef([])

  useEffect(() => {
    setTicks([]); buyRef.current=0; sellRef.current=0; ticksRef.current=[]; setLive(false)
    if (wsRef.current) { try{wsRef.current.close()}catch(_){} }
    if (mode !== 'single') return

    const ws = new WebSocket(`wss://stream.binance.com:9443/ws/${pair.toLowerCase()}@aggTrade`)
    wsRef.current = ws
    ws.onopen = () => setLive(true)
    ws.onclose = () => setLive(false)
    ws.onmessage = e => {
      try {
        const d = JSON.parse(e.data)
        const price = parseFloat(d.p), qty = parseFloat(d.q)
        const usd = price * qty
        const isBuy = !d.m
        if (isBuy) buyRef.current += usd; else sellRef.current += usd

        const now = Date.now()
        const tick = { t:now, buy:buyRef.current, sell:sellRef.current }
        ticksRef.current = [...ticksRef.current.slice(-(MAX_PTS-1)), tick]

        // Whale detection
        if (usd >= MIN_WHALE) {
          setWhales(prev => [{
            t: now, side: isBuy ? 'BUY' : 'SELL',
            usd, price, qty: qty.toFixed(4)
          }, ...prev].slice(0,20))
        }

        const t1m = now-60000, t5m = now-300000
        const r1 = ticksRef.current.filter(x=>x.t>t1m)
        const r5 = ticksRef.current.filter(x=>x.t>t5m)
        const calc = (arr) => arr.length<2 ? {buy:0,sell:0} : {
          buy: tick.buy - arr[0].buy,
          sell: tick.sell - arr[0].sell
        }
        setTicks([...ticksRef.current])
        setDelta1m(calc(r1))
        setDelta5m(calc(r5))
      } catch(_) {}
    }
    return () => { try{ws.close()}catch(_){} }
  }, [pair, mode])

  // Multi-pair mode
  useEffect(() => {
    if (mode !== 'multi') return
    const streams = MULTI_PAIRS.map(p => `${p.toLowerCase()}@aggTrade`).join('/')
    const ws = new WebSocket(`wss://stream.binance.com:9443/stream?streams=${streams}`)
    wsRef.current = ws
    ws.onopen = () => setLive(true)
    ws.onclose = () => setLive(false)
    ws.onmessage = e => {
      try {
        const msg = JSON.parse(e.data)
        const d = msg.data
        const sym = d.s
        const usd = parseFloat(d.p) * parseFloat(d.q)
        const isBuy = !d.m
        setMultiData(prev => {
          const curr = prev[sym] || { buy:0, sell:0 }
          return { ...prev, [sym]: { buy: curr.buy+(isBuy?usd:0), sell: curr.sell+(isBuy?0:usd) } }
        })
      } catch(_) {}
    }
    return () => { try{ws.close()}catch(_){} }
  }, [mode])

  const total1m = delta1m.buy + delta1m.sell || 1
  const buyPct1m = delta1m.buy / total1m * 100
  const total5m = delta5m.buy + delta5m.sell || 1
  const buyPct5m = delta5m.buy / total5m * 100
  const signal = buyPct1m > 65 ? '🟢 Pression acheteuse forte' : buyPct1m < 35 ? '🔴 Pression vendeuse forte' : '⚪ Équilibre'
  const maxBuy = ticks.length > 0 ? Math.max(...ticks.map(t=>t.buy-( ticks[0]?.buy||0))) || 1 : 1

  const fmtTime = (ts) => new Date(ts).toLocaleTimeString('fr',{hour:'2-digit',minute:'2-digit',second:'2-digit'})

  return (
    <div className={styles.wrap}>
      <div className={styles.header}>
        <span className={styles.title}>⚡ Delta Flow</span>
        <div className={styles.modeSel}>
          <button className={styles.modeBtn+(mode==='single'?' '+styles.modeOn:'')} onClick={()=>setMode('single')}>
            {pair.replace('USDT','')}
          </button>
          <button className={styles.modeBtn+(mode==='multi'?' '+styles.modeOn:'')} onClick={()=>setMode('multi')}>
            Multi
          </button>
        </div>
        <span className={styles.live} style={{color:live?'var(--grn)':'var(--red)'}}>● {live?'LIVE':'OFF'}</span>
      </div>

      {mode === 'single' && (
        <>
          <div className={styles.signal}>{signal}</div>

          {[['1 minute', buyPct1m, delta1m], ['5 minutes', buyPct5m, delta5m]].map(([lbl, pct, d]) => (
            <div key={lbl} className={styles.section}>
              <div className={styles.sLabel}>{lbl}</div>
              <div className={styles.barRow}>
                <span className={styles.barAmt} style={{color:'var(--grn)'}}>${fmt(d.buy/1000,1)}K</span>
                <div className={styles.barTrack}>
                  <div className={styles.barBuy} style={{width:pct+'%'}}/>
                  <div className={styles.barSell} style={{width:(100-pct)+'%'}}/>
                </div>
                <span className={styles.barAmt} style={{color:'var(--red)'}}>${fmt(d.sell/1000,1)}K</span>
              </div>
              <div className={styles.barPct}>
                <span style={{color:'var(--grn)'}}>{pct.toFixed(0)}% BUY</span>
                <span style={{color:'var(--red)'}}>{(100-pct).toFixed(0)}% SELL</span>
              </div>
            </div>
          ))}

          {/* Delta histogram */}
          <div className={styles.chartWrap}>
            <svg width="100%" height="60" viewBox={`0 0 ${MAX_PTS} 60`} preserveAspectRatio="none">
              <line x1="0" y1="30" x2={MAX_PTS} y2="30" stroke="rgba(255,255,255,.05)" strokeWidth="1"/>
              {ticks.slice(-MAX_PTS).map((t,i,arr) => {
                const prevBuy = arr[Math.max(0,i-1)].buy
                const d = t.buy - prevBuy
                const h = Math.min(28, Math.abs(d)/maxBuy*28)
                return <rect key={i} x={i} y={d>=0?30-h:30} width="1" height={h}
                  fill={d>=0?'rgba(140,198,63,.8)':'rgba(255,59,92,.8)'}/>
              })}
            </svg>
          </div>

          {/* Whale alerts */}
          {whales.length > 0 && (
            <div className={styles.whaleSection}>
              <div className={styles.whaleLbl}>🐋 Whales (${(MIN_WHALE/1000).toFixed(0)}K+)</div>
              <div className={styles.whaleList}>
                {whales.slice(0,8).map((w,i) => (
                  <div key={i} className={styles.whaleRow}>
                    <span className={styles.whaleTime}>{fmtTime(w.t)}</span>
                    <span className={styles.whaleSide} style={{color:w.side==='BUY'?'var(--grn)':'var(--red)'}}>
                      {w.side}
                    </span>
                    <span className={styles.whaleUsd}>${fmt(w.usd/1000,1)}K</span>
                    <span className={styles.whaleQty}>{w.qty} {pair.replace('USDT','')}</span>
                    <span className={styles.whalePrice}>{fmtPx(w.price)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}

      {mode === 'multi' && (
        <div className={styles.multiGrid}>
          {MULTI_PAIRS.map(sym => {
            const d = multiData[sym] || { buy:0, sell:0 }
            const tot = d.buy + d.sell || 1
            const pct = d.buy/tot*100
            return (
              <div key={sym} className={styles.multiCard} onClick={()=>{setPair(sym);setMode('single')}}>
                <div className={styles.multiSym}>{sym.replace('USDT','')}</div>
                <div className={styles.miniBar}>
                  <div className={styles.miniBuy} style={{width:pct+'%'}}/>
                </div>
                <div className={styles.multiStats}>
                  <span style={{color:'var(--grn)'}}>{pct.toFixed(0)}%</span>
                  <span style={{color:'var(--red)'}}>{(100-pct).toFixed(0)}%</span>
                </div>
                <div className={styles.multiVol}>${fmt((d.buy+d.sell)/1e6,2)}M</div>
              </div>
            )
          })}
        </div>
      )}

      <div className={styles.footer}>aggTrade Binance · Temps réel · Whale ≥ ${MIN_WHALE/1000}K</div>
    </div>
  )
}
