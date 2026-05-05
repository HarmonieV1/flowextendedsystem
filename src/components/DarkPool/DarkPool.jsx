import { useState, useEffect, useRef } from 'react'
import { fmtPx } from '../../lib/format'
import styles from './DarkPool.module.css'

const PAIRS = ['BTCUSDT','ETHUSDT','SOLUSDT','BNBUSDT','XRPUSDT']
const ANOMALY_THRESHOLD = 2.5 // price moves X times avg without volume

export function DarkPool() {
  const [signals, setSignals]   = useState([])
  const [monitoring, setMon]   = useState(false)
  const [stats, setStats]       = useState({})
  const wsRef     = useRef(null)
  const dataRef   = useRef({}) // {sym: {prices:[], volumes:[], avgVolume:0}}

  const start = () => {
    if (wsRef.current) { try{wsRef.current.close()}catch(_){} }
    const streams = PAIRS.map(p=>`${p.toLowerCase()}@kline_1m`).join('/')
    const ws = new WebSocket(`wss://stream.binance.com:9443/stream?streams=${streams}`)
    wsRef.current = ws
    ws.onopen = () => setMon(true)
    ws.onclose = () => setMon(false)
    ws.onmessage = e => {
      try {
        const msg = JSON.parse(e.data)
        const d = msg.data.k
        const sym = msg.data.s
        if (!d.x) return // only closed candles

        if (!dataRef.current[sym]) dataRef.current[sym] = { closes:[], volumes:[] }
        const rec = dataRef.current[sym]

        const close = parseFloat(d.c)
        const open  = parseFloat(d.o)
        const vol   = parseFloat(d.v)
        const pctMove = Math.abs((close-open)/open*100)

        rec.closes.push(close)
        rec.volumes.push(vol)
        if (rec.closes.length > 30) { rec.closes.shift(); rec.volumes.shift() }

        const avgVol = rec.volumes.reduce((a,b)=>a+b,0) / rec.volumes.length
        const avgMove = rec.closes.slice(-10).reduce((acc,c,i,arr)=>
          i===0 ? 0 : acc+Math.abs(c-arr[i-1])/arr[i-1]*100, 0) / 9

        setStats(prev => ({...prev, [sym]: { vol, avgVol, pctMove }}))

        // Dark pool signal: significant price move with LOW volume
        if (pctMove >= 0.5 && vol < avgVol * 0.4 && rec.volumes.length >= 10) {
          const signal = {
            id: Date.now() + sym,
            t: Date.now(),
            sym,
            price: close,
            pctMove,
            vol,
            avgVol,
            volRatio: vol/avgVol,
            direction: close > open ? 'up' : 'down',
            confidence: Math.min(95, Math.round(70 + (1 - vol/avgVol) * 30)),
          }
          setSignals(prev => {
            const exists = prev.find(s=>s.sym===sym && Date.now()-s.t<300000)
            if (exists) return prev
            return [signal, ...prev].slice(0,20)
          })
        }
      } catch(_) {}
    }
  }

  const stop = () => { try{wsRef.current?.close()}catch(_){}; setMon(false) }

  // Auto-cleanup on unmount
  useEffect(() => { return () => { try{wsRef.current?.close()}catch(_){} } }, [])

  const fmtTime = ts => new Date(ts).toLocaleTimeString('fr',{hour:'2-digit',minute:'2-digit',second:'2-digit'})
  const fmtAgo  = ts => { const s=Math.floor((Date.now()-ts)/1000); return s<60?`${s}s`:`${Math.floor(s/60)}m` }

  return (
    <div className={styles.wrap}>
      <div className={styles.header}>
        <span className={styles.title}>🕵️ Dark Pool Detector</span>
        <button className={styles.toggleBtn+(monitoring?' '+styles.on:'')} onClick={monitoring?stop:start}>
          {monitoring?'⏹ Stop':'▶ Monitor'}
        </button>
      </div>

      <div className={styles.explainer}>
        Détecte les mouvements de prix significatifs avec un volume anormalement bas — signature des transactions OTC et dark pool.
      </div>

      {/* Live stats */}
      <div className={styles.statsGrid}>
        {PAIRS.map(sym => {
          const s = stats[sym]
          if (!s) return <div key={sym} className={styles.statChip}><span className={styles.chipSym}>{sym.replace('USDT','')}</span><span className={styles.chipVol}>—</span></div>
          const ratio = s.avgVol > 0 ? s.vol/s.avgVol : 1
          return (
            <div key={sym} className={styles.statChip} style={{borderColor: ratio < 0.4 ? 'rgba(245,158,11,.4)' : 'var(--brd)'}}>
              <span className={styles.chipSym}>{sym.replace('USDT','')}</span>
              <span className={styles.chipVol} style={{color: ratio<0.4?'#f59e0b':ratio>1.5?'var(--grn)':'var(--txt3)'}}>
                {(ratio*100).toFixed(0)}%
              </span>
            </div>
          )
        })}
      </div>

      {signals.length === 0 ? (
        <div className={styles.empty}>
          {monitoring
            ? '🔍 Analyse en cours · Signal = move prix + volume < 40% moyenne'
            : 'Lance la surveillance pour détecter l\'activité OTC invisible'}
        </div>
      ) : (
        <div className={styles.signalList}>
          <div className={styles.listTitle}>Signaux détectés ({signals.length})</div>
          {signals.map(s => (
            <div key={s.id} className={styles.signalRow}>
              <div className={styles.sigLeft}>
                <span className={styles.sigIcon}>{s.direction==='up'?'↑':'↓'}</span>
                <div>
                  <div className={styles.sigSym}>{s.sym.replace('USDT','/USDT')}</div>
                  <div className={styles.sigTime}>{fmtTime(s.t)} · {fmtAgo(s.t)} ago</div>
                </div>
              </div>
              <div className={styles.sigMid}>
                <div className={styles.sigMove} style={{color:s.direction==='up'?'var(--grn)':'var(--red)'}}>
                  {s.direction==='up'?'+':'-'}{s.pctMove.toFixed(2)}%
                </div>
                <div className={styles.sigVolRatio} style={{color:'#f59e0b'}}>
                  Vol: {(s.volRatio*100).toFixed(0)}% avg
                </div>
              </div>
              <div className={styles.sigRight}>
                <div className={styles.sigConf}>{s.confidence}%</div>
                <div className={styles.sigConfLabel}>confiance</div>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className={styles.footer}>kline_1m Binance · Volume &lt; 40% avg + move &gt; 0.5% = signal OTC</div>
    </div>
  )
}
