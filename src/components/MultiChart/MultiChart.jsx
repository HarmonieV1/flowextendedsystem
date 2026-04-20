import { useState, useEffect, useRef, useCallback } from 'react'
import { createChart, CandlestickSeries, HistogramSeries, ColorType, CrosshairMode } from 'lightweight-charts'
import { useStore } from '../../store'
import { fmtPx, fmtVol } from '../../lib/format'
import styles from './MultiChart.module.css'

const LAYOUTS = [
  { id:'1x1', label:'1×1', cols:1, rows:1, slots:1 },
  { id:'1x2', label:'1×2', cols:2, rows:1, slots:2 },
  { id:'2x1', label:'2×1', cols:1, rows:2, slots:2 },
  { id:'2x2', label:'2×2', cols:2, rows:2, slots:4 },
]
const ALL_PAIRS = ['BTCUSDT','ETHUSDT','SOLUSDT','BNBUSDT','XRPUSDT','DOGEUSDT','ADAUSDT','AVAXUSDT','LINKUSDT','ARBUSDT']

export function MultiChart() {
  const [layout, setLayout] = useState(LAYOUTS[3])
  const [slots, setSlots] = useState(['BTCUSDT','ETHUSDT','SOLUSDT','BNBUSDT'])
  const [pickingSlot, setPickingSlot] = useState(null)
  const setPair = useStore(s => s.setPair)
  const setView = useStore(s => s.setView)

  const handleLayout = (l) => {
    setLayout(l)
    const next = [...slots]
    while (next.length < l.slots) next.push(ALL_PAIRS[next.length % ALL_PAIRS.length])
    setSlots(next.slice(0, l.slots))
  }

  return (
    <div className={styles.root}>
      <div className={styles.toolbar}>
        <span className={styles.toolbarLabel}>Layout</span>
        {LAYOUTS.map(l => (
          <button key={l.id} className={`${styles.layoutBtn} ${layout.id===l.id?styles.layoutOn:''}`} onClick={()=>handleLayout(l)}>{l.label}</button>
        ))}
        <span className={styles.toolbarHint}>⤢ ouvrir en plein écran</span>
      </div>
      <div className={styles.grid} style={{gridTemplateColumns:`repeat(${layout.cols},1fr)`,gridTemplateRows:`repeat(${layout.rows},1fr)`}}>
        {slots.slice(0,layout.slots).map((pair,i)=>(
          <ChartTile key={`${pair}-${i}-${layout.id}`} pair={pair}
            onExpand={()=>{setPair(pair);setView('trade')}}
            onChangePair={()=>setPickingSlot(i)}
          />
        ))}
      </div>
      {pickingSlot!==null&&(
        <div className={styles.overlay} onClick={()=>setPickingSlot(null)}>
          <div className={styles.picker} onClick={e=>e.stopPropagation()}>
            <div className={styles.pickerTitle}>Choisir une paire</div>
            <div className={styles.pairGrid}>
              {ALL_PAIRS.map(p=>(
                <button key={p} className={`${styles.pairBtn} ${slots[pickingSlot]===p?styles.pairOn:''}`}
                  onClick={()=>{const n=[...slots];n[pickingSlot]=p;setSlots(n);setPickingSlot(null)}}
                >{p.replace('USDT','/USDT')}</button>
              ))}
            </div>
            <button className={styles.pickerClose} onClick={()=>setPickingSlot(null)}>Annuler</button>
          </div>
        </div>
      )}
    </div>
  )
}

function ChartTile({ pair, onExpand, onChangePair }) {
  const outerRef = useRef(null) // sized by CSS flex
  const innerRef = useRef(null) // explicit px size for LightweightCharts
  const chartRef = useRef(null)
  const candleRef = useRef(null)
  const volRef = useRef(null)
  const wsTickRef = useRef(null)
  const wsKlRef = useRef(null)
  const [px, setPx] = useState(0)
  const [prevPx, setPrevPx] = useState(0)
  const [chg, setChg] = useState(0)
  const [vol, setVol] = useState(0)
  const [tf, setTf] = useState('15m')
  const tfRef = useRef('15m')

  // ── DEFINITIVE CHART INIT ──
  // Strategy: set innerRef to explicit px matching outerRef BEFORE createChart
  useEffect(() => {
    if (!outerRef.current || !innerRef.current) return
    let chart = null, ro = null

    const doInit = () => {
      const outer = outerRef.current
      if (!outer) return
      const W = outer.clientWidth
      const H = outer.clientHeight
      if (W < 10 || H < 10) {
        // Not ready yet, retry
        const t = setTimeout(doInit, 50)
        return () => clearTimeout(t)
      }

      // Set explicit size on inner div BEFORE createChart reads it
      const inner = innerRef.current
      if (!inner) return
      inner.style.width = W + 'px'
      inner.style.height = H + 'px'

      chart = createChart(inner, {
        width: W, height: H,
        layout: {
          background: { type: ColorType.Solid, color: '#09090b' },
          textColor: '#3f3f46', fontSize: 9,
          fontFamily: "'JetBrains Mono', monospace",
        },
        grid: {
          vertLines: { color: 'rgba(255,255,255,0.025)' },
          horzLines: { color: 'rgba(255,255,255,0.025)' },
        },
        crosshair: { mode: CrosshairMode.Normal },
        rightPriceScale: { borderColor: 'rgba(255,255,255,0.04)', textColor: '#3f3f46', scaleMargins: { top: 0.05, bottom: 0.15 } },
        timeScale: { borderColor: 'rgba(255,255,255,0.04)', textColor: '#3f3f46', timeVisible: true, secondsVisible: false },
        handleScroll: true, handleScale: true,
      })

      const candle = chart.addSeries(CandlestickSeries, {
        upColor:'#00e5a0', downColor:'#ff3b5c',
        borderUpColor:'#00e5a0', borderDownColor:'#ff3b5c',
        wickUpColor:'#00e5a0', wickDownColor:'#ff3b5c',
      })
      const volume = chart.addSeries(HistogramSeries, { priceFormat:{type:'volume'}, priceScaleId:'vol' })
      chart.priceScale('vol').applyOptions({ scaleMargins: { top: 0.85, bottom: 0 } })

      chartRef.current = chart
      candleRef.current = candle
      volRef.current = volume

      // ResizeObserver on OUTER — updates chart dimensions
      ro = new ResizeObserver(entries => {
        const { width, height } = entries[0].contentRect
        if (width > 10 && height > 10 && chartRef.current) {
          if (innerRef.current) {
            innerRef.current.style.width = width + 'px'
            innerRef.current.style.height = height + 'px'
          }
          chartRef.current.applyOptions({ width: Math.floor(width), height: Math.floor(height) })
        }
      })
      ro.observe(outer)

      // Load data now that chart exists
      loadDataNow()
    }

    doInit()

    return () => {
      if (ro) ro.disconnect()
      if (chart) { try { chart.remove() } catch(_){} }
      chartRef.current = null; candleRef.current = null; volRef.current = null
    }
  }, []) // mount only

  const loadDataNow = useCallback(async () => {
    if (wsKlRef.current) { try { wsKlRef.current.close() } catch(_){} }
    const currentTf = tfRef.current
    try {
      const res = await fetch(`https://api.binance.com/api/v3/klines?symbol=${pair}&interval=${currentTf}&limit=100`)
      const raw = await res.json()
      if (!Array.isArray(raw) || !candleRef.current) return
      const candles = raw.map(r=>({time:Math.floor(r[0]/1000),open:+r[1],high:+r[2],low:+r[3],close:+r[4]}))
      const vols = raw.map(r=>({time:Math.floor(r[0]/1000),value:+r[5],color:+r[4]>=+r[1]?'rgba(0,229,160,.2)':'rgba(255,59,92,.2)'}))
      candleRef.current.setData(candles)
      volRef.current?.setData(vols)
      chartRef.current?.timeScale().fitContent()
    } catch(_) {}

    const ws = new WebSocket(`wss://stream.binance.com:9443/ws/${pair.toLowerCase()}@kline_${currentTf}`)
    wsKlRef.current = ws
    ws.onmessage = e => {
      try {
        const k = JSON.parse(e.data).k
        if (!candleRef.current) return
        candleRef.current.update({time:Math.floor(k.t/1000),open:+k.o,high:+k.h,low:+k.l,close:+k.c})
        volRef.current?.update({time:Math.floor(k.t/1000),value:+k.v,color:+k.c>=+k.o?'rgba(0,229,160,.2)':'rgba(255,59,92,.2)'})
      } catch(_) {}
    }
  }, [pair])

  // Reload when pair or tf changes (after mount)
  const isFirstRender = useRef(true)
  useEffect(() => {
    if (isFirstRender.current) { isFirstRender.current = false; return }
    tfRef.current = tf
    if (chartRef.current) loadDataNow()
  }, [pair, tf, loadDataNow])

  // Ticker WS
  useEffect(() => {
    if (wsTickRef.current) { try { wsTickRef.current.close() } catch(_){} }
    const ws = new WebSocket(`wss://stream.binance.com:9443/ws/${pair.toLowerCase()}@ticker`)
    wsTickRef.current = ws
    ws.onmessage = e => {
      try {
        const d = JSON.parse(e.data)
        const p = parseFloat(d.c)
        if (!isFinite(p)) return
        setPx(prev => { setPrevPx(prev); return p })
        setChg(parseFloat(d.P))
        setVol(parseFloat(d.q))
      } catch(_) {}
    }
    return () => { ws.onclose=null; try{ws.close()}catch(_){} }
  }, [pair])

  const dir = px > prevPx ? 'up' : px < prevPx ? 'dn' : ''

  return (
    <div className={styles.tile}>
      <div className={styles.tileHdr}>
        <button className={styles.pairChip} onClick={onChangePair}>{pair.replace('USDT','/USDT')} ▾</button>
        <span className={`${styles.tilePx} ${styles[dir]}`}>{px>0?fmtPx(px):'—'}</span>
        {chg!==0&&<span className={`${styles.tileChg} ${chg>=0?styles.pos:styles.neg}`}>{chg>0?'+':''}{chg.toFixed(2)}%</span>}
        <span className={styles.tileVol}>${fmtVol(vol)}</span>
        <div className={styles.tfBtns}>
          {['5m','15m','1h','4h'].map(t=>(
            <button key={t} className={`${styles.tfBtn} ${tf===t?styles.tfOn:''}`} onClick={()=>{tfRef.current=t;setTf(t)}}>{t}</button>
          ))}
        </div>
        <button className={styles.expandBtn} onClick={onExpand}>⤢</button>
      </div>
      {/* outerRef = flex container, innerRef = explicit px div for chart */}
      <div ref={outerRef} className={styles.chartOuter}>
        <div ref={innerRef} className={styles.chartInner} />
      </div>
    </div>
  )
}
