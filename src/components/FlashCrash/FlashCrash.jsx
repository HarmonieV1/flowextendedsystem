import { useState, useEffect, useRef } from 'react'
import { fmtPx } from '../../lib/format'
import styles from './FlashCrash.module.css'
import { logSilent } from '../../lib/errorMonitor'

const PAIRS = ['BTCUSDT','ETHUSDT','SOLUSDT','BNBUSDT','XRPUSDT','ARBUSDT','LINKUSDT','AVAXUSDT']
const THRESHOLD_PCT = 2.0
const WINDOW_MS = 60000

export function FlashCrash() {
  const [events, setEvents] = useState([])
  const [monitoring, setMonitoring] = useState(false)
  const [prices, setPrices] = useState({})
  const priceHistory = useRef({})
  const wsRef = useRef(null)

  const start = () => {
    if (wsRef.current) { try{wsRef.current.close()}catch(e){logSilent(e,'FlashCrash')} }
    const streams = PAIRS.map(p=>`${p.toLowerCase()}@kline_1m`).join('/')
    const ws = new WebSocket(`wss://stream.binance.com:9443/stream?streams=${streams}`)
    wsRef.current = ws
    ws.onopen = () => setMonitoring(true)
    ws.onclose = () => setMonitoring(false)
    ws.onmessage = e => {
      try {
        const msg = JSON.parse(e.data)
        const d = msg.data
        const sym = d.s
        const close = parseFloat(d.k.c)
        const open  = parseFloat(d.k.o)
        const now   = Date.now()

        // Track 1min change
        const pct = (close - open) / open * 100
        setPrices(prev => ({...prev, [sym]: { price: close, pct, t: now }}))

        // Flash crash detection: >2% drop in <60s
        if (pct <= -THRESHOLD_PCT) {
          setEvents(prev => {
            const already = prev.find(ev => ev.sym === sym && now - ev.t < 120000)
            if (already) return prev
            const ev = {
              id: now + sym,
              t: now,
              sym,
              price: close,
              openPrice: open,
              pct,
              recovered: false,
            }
            return [ev, ...prev].slice(0,20)
          })
        }

        // Spike detection: >2% pump in <60s
        if (pct >= THRESHOLD_PCT) {
          setEvents(prev => {
            const already = prev.find(ev => ev.sym === sym && ev.isPump && now - ev.t < 120000)
            if (already) return prev
            return [{
              id: now + sym + 'pump',
              t: now, sym, price: close, openPrice: open, pct, isPump: true
            }, ...prev].slice(0,20)
          })
        }
      } catch(e){logSilent(e,'FlashCrash')}
    }
  }

  const stop = () => {
    if (wsRef.current) { try{wsRef.current.close()}catch(e){logSilent(e,'FlashCrash')} }
    setMonitoring(false)
  }

  // Auto-cleanup on unmount
  useEffect(() => { return () => { try{wsRef.current?.close()}catch(e){logSilent(e,'FlashCrash')} } }, [])

  const fmtTime = ts => new Date(ts).toLocaleTimeString('fr',{hour:'2-digit',minute:'2-digit',second:'2-digit'})
  const fmtAgo  = ts => {
    const s = Math.floor((Date.now()-ts)/1000)
    return s < 60 ? `${s}s` : `${Math.floor(s/60)}m${s%60}s`
  }

  return (
    <div className={styles.wrap}>
      <div className={styles.header}>
        <span className={styles.title}>⚡ Flash Crash Detector</span>
        <div className={styles.controls}>
          <span className={styles.threshold}>Seuil: {THRESHOLD_PCT}% / 1min</span>
          <button className={styles.toggleBtn + (monitoring?' '+styles.toggleOn:'')} onClick={monitoring?stop:start}>
            {monitoring ? '⏹ Stop' : '▶ Monitor'}
          </button>
        </div>
      </div>

      {/* Live prices */}
      <div className={styles.priceGrid}>
        {PAIRS.map(sym => {
          const p = prices[sym]
          if (!p) return null
          return (
            <div key={sym} className={styles.priceChip}>
              <span className={styles.chipSym}>{sym.replace('USDT','')}</span>
              <span className={styles.chipPct} style={{color:p.pct<=-THRESHOLD_PCT?'var(--red)':p.pct>=THRESHOLD_PCT?'var(--grn)':'var(--txt3)'}}>
                {p.pct>=0?'+':''}{p.pct.toFixed(2)}%
              </span>
            </div>
          )
        })}
      </div>

      {events.length === 0 ? (
        <div className={styles.empty}>
          {monitoring ? `🔍 Surveillance active · ${PAIRS.length} paires · Alerte si >${THRESHOLD_PCT}% en 1min` : 'Lance la surveillance pour détecter les flash crashes en temps réel'}
        </div>
      ) : (
        <div className={styles.events}>
          <div className={styles.eventsTitle}>Événements détectés ({events.length})</div>
          {events.map(ev => (
            <div key={ev.id} className={styles.eventRow + (ev.isPump?' '+styles.eventPump:' '+styles.eventCrash)}>
              <div className={styles.evLeft}>
                <span className={styles.evIcon}>{ev.isPump ? '🚀' : '💥'}</span>
                <div>
                  <div className={styles.evSym}>{ev.sym.replace('USDT','/USDT')}</div>
                  <div className={styles.evTime}>{fmtTime(ev.t)} · {fmtAgo(ev.t)} ago</div>
                </div>
              </div>
              <div className={styles.evRight}>
                <span className={styles.evPct} style={{color:ev.isPump?'var(--grn)':'var(--red)'}}>
                  {ev.pct>=0?'+':''}{ev.pct.toFixed(2)}%
                </span>
                <span className={styles.evPrice}>{fmtPx(ev.price)}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className={styles.footer}>Binance kline_1m · {PAIRS.length} paires · Seuil {THRESHOLD_PCT}%</div>
    </div>
  )
}
