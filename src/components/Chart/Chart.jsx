import { useEffect, useRef, useState, useCallback } from 'react'
import { createChart, CrosshairMode, LineStyle, CandlestickSeries, HistogramSeries, LineSeries } from 'lightweight-charts'
import { useStore } from '../../store'
import { useKlines } from '../../hooks/useKlines'
import { hasApiKeys, futuresGetPositions, getOpenOrders, getTpslOrders, placeTpsl, cancelTpsl } from '../../lib/bitunix'
import { fmtPx } from '../../lib/format'
import styles from './Chart.module.css'
import { TrendlineOverlay } from '../Trendlines/TrendlineOverlay'
import { logSilent } from '../../lib/errorMonitor'

const TF_MAP = { '1m':'1m','5m':'5m','15m':'15m','1h':'1h','4h':'4h','1d':'1d' }

export function Chart({ onToggleOrders, ordersOpen }) {
  const pair     = useStore(s => s.pair)
  const tf       = useStore(s => s.tf)
  const setTf    = useStore(s => s.setTf)
  const klines   = useStore(s => s.klines)
  const lastPx   = useStore(s => s.lastPx)
  const base     = pair.replace('USDT','')

  // Activate klines data pipeline
  useKlines()

  const containerRef = useRef(null)
  const chartRef     = useRef(null)
  const candleRef    = useRef(null)
  const volumeRef    = useRef(null)
  const posLinesRef  = useRef([])
  const tpslLinesRef = useRef([])
  const maSeriesRef  = useRef({})

  const [indicators, setIndicators] = useState({ma20:true, ma50:false, rsi:false})
  const [drawMode, setDrawMode] = useState(null) // null | 'hline'
  const drawLinesRef = useRef([])
  const [positions, setPositions] = useState([])
  const [openOrders, setOpenOrders] = useState([])
  const [tpslOrders, setTpslOrders] = useState([])
  const [crosshair, setCrosshair] = useState(null)

  // Load positions + open orders + TP/SL orders
  const loadPositions = useCallback(async () => {
    if (!hasApiKeys()) return
    try {
      const [pos, ords, tpsl] = await Promise.all([
        futuresGetPositions(),
        getOpenOrders(pair).catch(()=>[]),
        getTpslOrders(pair).catch(()=>[])
      ])
      const all = Array.isArray(pos) ? pos : []
      const filtered = all.filter(p => p.symbol === pair)
      const orderList = Array.isArray(ords) ? ords : ords?.orderList || []
      const tpslList = Array.isArray(tpsl) ? tpsl : []
      setPositions(filtered)
      setOpenOrders(orderList)
      setTpslOrders(tpslList)
    } catch(e) { logSilent(e, 'Chart.pos') }
  }, [pair])

  useEffect(() => {
    loadPositions()
    const iv = setInterval(loadPositions, 15000)
    // Listen for order events to refresh positions immediately
    const onPosUpdate = () => setTimeout(loadPositions, 2000) // 2s delay for API propagation
    window.addEventListener('fxs:positionUpdate', onPosUpdate)
    return () => { clearInterval(iv); window.removeEventListener('fxs:positionUpdate', onPosUpdate) }
  }, [loadPositions])

  // Create chart once
  useEffect(() => {
    if (!containerRef.current) return

    const chart = createChart(containerRef.current, {
      layout: {
        background: { color: '#09090b' },
        textColor: '#71717a',
        fontFamily: "'JetBrains Mono', monospace",
        fontSize: 10,
      },
      grid: {
        vertLines: { color: 'rgba(255,255,255,0.03)' },
        horzLines: { color: 'rgba(255,255,255,0.03)' },
      },
      crosshair: {
        mode: CrosshairMode.Normal,
        vertLine: { color: 'rgba(255,255,255,0.15)', style: LineStyle.Dashed, width: 1 },
        horzLine: { color: 'rgba(255,255,255,0.15)', style: LineStyle.Dashed, width: 1 },
      },
      rightPriceScale: {
        borderColor: 'rgba(255,255,255,0.06)',
        scaleMargins: { top: 0.08, bottom: 0.15 },
      },
      timeScale: {
        borderColor: 'rgba(255,255,255,0.06)',
        timeVisible: true,
        secondsVisible: false,
        rightOffset: 5,
        barSpacing: 8,
      },
      handleScroll: { vertTouchDrag: false },
    })

    const candleSeries = chart.addSeries(CandlestickSeries, {
      upColor: '#8cc63f',
      downColor: '#ff3b5c',
      borderUpColor: '#8cc63f',
      borderDownColor: '#ff3b5c',
      wickUpColor: '#8cc63f66',
      wickDownColor: '#ff3b5c66',
    })

    const volumeSeries = chart.addSeries(HistogramSeries, {
      priceFormat: { type: 'volume' },
      priceScaleId: 'vol',
    })
    chart.priceScale('vol').applyOptions({
      scaleMargins: { top: 0.85, bottom: 0 },
    })

    // Crosshair data
    chart.subscribeCrosshairMove(param => {
      if (!param?.time || !param.seriesData) { setCrosshair(null); return }
      const candle = param.seriesData.get(candleSeries)
      if (candle) {
        setCrosshair({
          o: candle.open, h: candle.high,
          l: candle.low, c: candle.close,
          time: param.time,
        })
      }
    })

    chartRef.current = chart
    candleRef.current = candleSeries
    volumeRef.current = volumeSeries

    // Resize observer
    const ro = new ResizeObserver(entries => {
      const { width, height } = entries[0].contentRect
      if (width > 0 && height > 0) chart.resize(width, height)
    })
    ro.observe(containerRef.current)

    return () => {
      ro.disconnect()
      chart.remove()
      chartRef.current = null
      candleRef.current = null
      volumeRef.current = null
    }
  }, [])

  // Update candle + volume data when klines change
  useEffect(() => {
    if (!candleRef.current || !volumeRef.current || !klines.length) return

    const candleData = klines.map(k => ({
      time: Math.floor(k.t / 1000),
      open: k.o, high: k.h, low: k.l, close: k.c,
    }))

    const volData = klines.map(k => ({
      time: Math.floor(k.t / 1000),
      value: k.v,
      color: k.c >= k.o ? 'rgba(140,198,63,0.18)' : 'rgba(255,59,92,0.18)',
    }))

    candleRef.current.setData(candleData)
    volumeRef.current.setData(volData)
  }, [klines])

  // ── Infinite scroll: load older candles when reaching left edge ──
  const loadingMoreRef = useRef(false)
  const prependKlines = useStore(s => s.prependKlines)

  useEffect(() => {
    if (!chartRef.current || !klines.length) return
    const chart = chartRef.current

    const onVisibleRange = (newRange) => {
      if (loadingMoreRef.current || !klines.length) return
      const firstTime = Math.floor(klines[0].t / 1000)
      // If the visible range starts near the first candle, load more
      if (newRange.from <= firstTime + 10) {
        loadingMoreRef.current = true
        const endTime = klines[0].t - 1
        fetch(`https://api.binance.com/api/v3/klines?symbol=${pair}&interval=${tf}&endTime=${endTime}&limit=500`)
          .then(r => r.json())
          .then(raw => {
            if (!Array.isArray(raw) || !raw.length) return
            const older = raw.map(r => ({
              t: r[0], o: +r[1], h: +r[2], l: +r[3], c: +r[4], v: +r[5],
            })).filter(c => isFinite(c.c))
            if (older.length) prependKlines(older)
          })
          .catch(() => {})
          .finally(() => { setTimeout(() => { loadingMoreRef.current = false }, 2000) })
      }
    }

    chart.timeScale().subscribeVisibleLogicalRangeChange(onVisibleRange)
    return () => {
      try { chart.timeScale().unsubscribeVisibleLogicalRangeChange(onVisibleRange) } catch(e){logSilent(e,'Chart')}
    }
  }, [pair, tf, klines.length > 0])

  // Draw position overlays
  useEffect(() => {
    if (!candleRef.current) return

    // Remove old lines
    posLinesRef.current.forEach(line => {
      try { candleRef.current.removePriceLine(line) } catch(e){logSilent(e,'Chart')}
    })
    posLinesRef.current = []
    tpslLinesRef.current = []

    if (!positions.length) return

    positions.forEach(pos => {
      const rawSide = (pos.side || '').toUpperCase()
      const isLong = rawSide === 'LONG' || rawSide === 'BUY'
      const entryPx = parseFloat(pos.avgOpenPrice)
      const liqPx   = parseFloat(pos.liqPrice)
      const pnl     = parseFloat(pos.unrealizedPNL || 0)

      if (entryPx > 0) {
        const entryLine = candleRef.current.createPriceLine({
          price: entryPx,
          color: isLong ? '#8cc63f' : '#ff3b5c',
          lineWidth: 2,
          lineStyle: LineStyle.Solid,
          axisLabelVisible: true,
          title: `${isLong ? '▲ LONG' : '▼ SHORT'} ${pos.leverage}× @ ${fmtPx(entryPx)}`,
        })
        posLinesRef.current.push(entryLine)
      }

      if (liqPx > 0) {
        const liqLine = candleRef.current.createPriceLine({
          price: liqPx,
          color: '#f59e0b',
          lineWidth: 1,
          lineStyle: LineStyle.Dashed,
          axisLabelVisible: true,
          title: `☠ LIQ ${fmtPx(liqPx)}`,
        })
        posLinesRef.current.push(liqLine)
      }
    })

    // Draw TP/SL lines from open orders
    openOrders.forEach(ord => {
      if (ord.symbol !== pair) return
      // TP price lines
      if (ord.tpPrice && parseFloat(ord.tpPrice) > 0) {
        const tpLine = candleRef.current.createPriceLine({
          price: parseFloat(ord.tpPrice),
          color: '#22c55e',
          lineWidth: 1,
          lineStyle: LineStyle.Dashed,
          axisLabelVisible: true,
          title: `TP ${fmtPx(parseFloat(ord.tpPrice))}`,
        })
        posLinesRef.current.push(tpLine)
      }
      // SL price lines
      if (ord.slPrice && parseFloat(ord.slPrice) > 0) {
        const slLine = candleRef.current.createPriceLine({
          price: parseFloat(ord.slPrice),
          color: '#ef4444',
          lineWidth: 1,
          lineStyle: LineStyle.Dashed,
          axisLabelVisible: true,
          title: `SL ${fmtPx(parseFloat(ord.slPrice))}`,
        })
        posLinesRef.current.push(slLine)
      }
      // Pending limit orders
      if (ord.price && parseFloat(ord.price) > 0 && ord.status === 'NEW') {
        const ordLine = candleRef.current.createPriceLine({
          price: parseFloat(ord.price),
          color: '#818cf8',
          lineWidth: 1,
          lineStyle: LineStyle.Dotted,
          axisLabelVisible: true,
          title: `${ord.side} ${ord.type || 'LIMIT'} @ ${fmtPx(parseFloat(ord.price))}`,
        })
        posLinesRef.current.push(ordLine)
      }
    })

    // Draw TP/SL from dedicated TPSL endpoint (Bitunix stores them separately)
    tpslOrders.forEach(tpsl => {
      if (tpsl.symbol !== pair) return
      if (tpsl.tpPrice && parseFloat(tpsl.tpPrice) > 0) {
        const tpLine = candleRef.current.createPriceLine({
          price: parseFloat(tpsl.tpPrice),
          color: '#22c55e',
          lineWidth: 2,
          lineStyle: LineStyle.Dashed,
          axisLabelVisible: true,
          title: `⇕ TP ${fmtPx(parseFloat(tpsl.tpPrice))}`,
        })
        posLinesRef.current.push(tpLine)
        tpslLinesRef.current.push({line:tpLine, type:'tp', id:tpsl.id, positionId:tpsl.positionId, symbol:tpsl.symbol, price:parseFloat(tpsl.tpPrice)})
      }
      if (tpsl.slPrice && parseFloat(tpsl.slPrice) > 0) {
        const slLine = candleRef.current.createPriceLine({
          price: parseFloat(tpsl.slPrice),
          color: '#ef4444',
          lineWidth: 2,
          lineStyle: LineStyle.Dashed,
          axisLabelVisible: true,
          title: `⇕ SL ${fmtPx(parseFloat(tpsl.slPrice))}`,
        })
        posLinesRef.current.push(slLine)
        tpslLinesRef.current.push({line:slLine, type:'sl', id:tpsl.id, positionId:tpsl.positionId, symbol:tpsl.symbol, price:parseFloat(tpsl.slPrice)})
      }
    })
  }, [positions, openOrders, tpslOrders, klines])

  // ── Drawing tools — lignes horizontales uniquement ──
  useEffect(() => {
    const el = containerRef.current
    if (!el || !candleRef.current || drawMode !== 'hline') return

    const onClick = (e) => {
      const rect = el.getBoundingClientRect()
      const y = e.clientY - rect.top
      try {
        const price = candleRef.current.coordinateToPrice(y)
        if (!price || !isFinite(price)) return
        const line = candleRef.current.createPriceLine({
          price, color: '#f59e0b', lineWidth: 1, lineStyle: LineStyle.Solid,
          axisLabelVisible: true, title: fmtPx(price),
        })
        drawLinesRef.current.push(line)
        setDrawMode(null)
      } catch(e){logSilent(e,'Chart')}
    }
    el.style.cursor = 'crosshair'
    el.addEventListener('click', onClick)
    return () => { el.style.cursor = ''; el.removeEventListener('click', onClick) }
  }, [drawMode])

  const clearDrawings = () => {
    drawLinesRef.current.forEach(line => {
      try { candleRef.current.removePriceLine(line) } catch(e){logSilent(e,'Chart')}
    })
    drawLinesRef.current = []
  }

  // ── Interactive TP/SL drag ──
  const dragRef = useRef(null)
  const [dragPrice, setDragPrice] = useState(null)

  useEffect(() => {
    const el = containerRef.current
    if (!el || !candleRef.current) return

    const getPrice = (e) => {
      const rect = el.getBoundingClientRect()
      const y = e.clientY - rect.top
      try { return candleRef.current.coordinateToPrice(y) } catch { return null }
    }

    const onDown = (e) => {
      const price = getPrice(e)
      if (!price || !tpslLinesRef.current.length) return
      // Check if near a TP/SL line (within 0.3%)
      for (const info of tpslLinesRef.current) {
        const dist = Math.abs(price - info.price) / info.price
        if (dist < 0.003) {
          dragRef.current = {...info, startPrice: info.price}
          el.style.cursor = 'ns-resize'
          e.preventDefault()
          return
        }
      }
    }

    const onMove = (e) => {
      if (!dragRef.current) {
        // Hover cursor change
        const price = getPrice(e)
        if (price && tpslLinesRef.current.length) {
          const near = tpslLinesRef.current.some(info => Math.abs(price - info.price) / info.price < 0.003)
          el.style.cursor = near ? 'ns-resize' : ''
        }
        return
      }
      const price = getPrice(e)
      if (!price) return
      setDragPrice(price)
      // Update line position in real-time
      try {
        dragRef.current.line.applyOptions({
          price,
          title: `⇕ ${dragRef.current.type.toUpperCase()} → ${fmtPx(price)}`,
        })
      } catch(e){logSilent(e,'Chart')}
    }

    const onUp = async (e) => {
      if (!dragRef.current) return
      const drag = dragRef.current
      const newPrice = getPrice(e) || dragPrice
      dragRef.current = null
      setDragPrice(null)
      el.style.cursor = ''
      if (!newPrice || Math.abs(newPrice - drag.startPrice) / drag.startPrice < 0.0005) return // no significant change

      // Update via API: cancel old + place new
      try {
        // Cancel existing TPSL
        if (drag.id) await cancelTpsl(drag.id).catch(()=>{})
        // Place new TPSL
        const pos = positions.find(p => p.positionId === drag.positionId)
        if (pos) {
          const params = {symbol: drag.symbol, positionId: drag.positionId}
          if (drag.type === 'tp') params.tpPrice = newPrice
          if (drag.type === 'sl') params.slPrice = newPrice
          await placeTpsl(params)
        }
        setTimeout(loadPositions, 1000)
      } catch(err) {
        logSilent(err, 'Chart.TPSL')
        // Revert line
        try { drag.line.applyOptions({price: drag.startPrice, title: `${drag.type==='tp'?'✓ TP':'✕ SL'} ${fmtPx(drag.startPrice)}`}) } catch(e){logSilent(e,'Chart')}
      }
    }

    el.addEventListener('mousedown', onDown)
    el.addEventListener('mousemove', onMove)
    el.addEventListener('mouseup', onUp)
    // Touch support
    const touchToMouse = (handler) => (e) => {
      if (e.touches.length === 1) {
        const t = e.touches[0]
        handler({clientY:t.clientY, clientX:t.clientX, preventDefault:()=>e.preventDefault()})
      }
    }
    el.addEventListener('touchstart', touchToMouse(onDown), {passive:false})
    el.addEventListener('touchmove', touchToMouse(onMove), {passive:false})
    el.addEventListener('touchend', onUp)

    return () => {
      el.removeEventListener('mousedown', onDown)
      el.removeEventListener('mousemove', onMove)
      el.removeEventListener('mouseup', onUp)
      el.removeEventListener('touchstart', touchToMouse(onDown))
      el.removeEventListener('touchmove', touchToMouse(onMove))
      el.removeEventListener('touchend', onUp)
    }
  }, [tpslOrders, positions, dragPrice])

  // ── Indicators: MA, RSI ──
  useEffect(() => {
    if (!chartRef.current || !candleRef.current || klines.length < 5) return

    // Remove old indicator series
    Object.values(maSeriesRef.current).forEach(s => {
      try { chartRef.current.removeSeries(s) } catch(e){logSilent(e,'Chart')}
    })
    maSeriesRef.current = {}

    const calcMA = (data, period) => {
      if (data.length < period) return []
      const result = []
      for (let i = period - 1; i < data.length; i++) {
        let sum = 0
        for (let j = 0; j < period; j++) sum += data[i-j].c
        const t = data[i].t
        if (!t || !isFinite(sum)) continue
        result.push({ time: Math.floor(t / 1000), value: sum / period })
      }
      return result
    }

    try {
      // MA20
      if (indicators.ma20 && klines.length >= 20) {
        const maData = calcMA(klines, 20)
        if (maData.length > 0) {
          const ma = chartRef.current.addSeries(LineSeries, {
            color: '#f59e0b', lineWidth: 1, priceLineVisible: false, lastValueVisible: false,
          })
          ma.setData(maData)
          maSeriesRef.current.ma20 = ma
        }
      }

      // MA50
      if (indicators.ma50 && klines.length >= 50) {
        const maData = calcMA(klines, 50)
        if (maData.length > 0) {
          const ma = chartRef.current.addSeries(LineSeries, {
            color: '#8b5cf6', lineWidth: 1, priceLineVisible: false, lastValueVisible: false,
          })
          ma.setData(maData)
          maSeriesRef.current.ma50 = ma
        }
      }
    } catch(e) { console.warn('[CHART] Indicator error:', e.message) }

  }, [klines, indicators])

  // Current candle data for the HUD
  const hud = crosshair || (klines.length ? {
    o: klines[klines.length-1].o,
    h: klines[klines.length-1].h,
    l: klines[klines.length-1].l,
    c: klines[klines.length-1].c,
  } : null)

  const chg = hud ? ((hud.c - hud.o) / hud.o * 100) : 0
  const isUp = chg >= 0

  return (
    <div className={styles.wrap}>
      {/* Toolbar */}
      <div className={styles.bar}>
        {Object.keys(TF_MAP).map(t => (
          <button key={t}
            className={styles.tf + (tf === t ? ' ' + styles.tfOn : '')}
            onClick={() => setTf(t)}
          >{t}</button>
        ))}

        {/* OHLC HUD */}
        {hud && (
          <div className={styles.ohlc}>
            <span>O <span style={{color:isUp?'var(--grn)':'var(--red)'}}>{fmtPx(hud.o)}</span></span>
            <span>H <span style={{color:'var(--grn)'}}>{fmtPx(hud.h)}</span></span>
            <span>L <span style={{color:'var(--red)'}}>{fmtPx(hud.l)}</span></span>
            <span>C <span style={{color:isUp?'var(--grn)':'var(--red)'}}>{fmtPx(hud.c)}</span></span>
            <span style={{color:isUp?'var(--grn)':'var(--red)'}}>{isUp?'+':''}{chg.toFixed(2)}%</span>
          </div>
        )}

        {/* Position badge */}
        {positions.length > 0 && (
          <div className={styles.posBadge}>
            {positions.map((p,i) => {
              const isLong = (p.side||'').toUpperCase() === 'LONG' || (p.side||'').toUpperCase() === 'BUY'
              const pnl = parseFloat(p.unrealizedPNL||0)
              return (
                <span key={i} className={styles.posTag} style={{
                  color: isLong ? 'var(--grn)' : 'var(--red)',
                  borderColor: isLong ? 'rgba(140,198,63,.3)' : 'rgba(255,59,92,.3)',
                }}>
                  {isLong?'▲':'▼'} {p.leverage}× <span style={{color:pnl>=0?'var(--grn)':'var(--red)'}}>{pnl>=0?'+':''}{pnl.toFixed(2)}</span>
                </span>
              )
            })}
          </div>
        )}

        {dragPrice && (
          <span className={styles.dragTag}>
            ⇕ {fmtPx(dragPrice)}
          </span>
        )}

        <div className={styles.indBtns}>
          <button className={`${styles.indBtn} ${indicators.ma20?styles.indOn:''}`} onClick={()=>setIndicators(s=>({...s,ma20:!s.ma20}))}>MA20</button>
          <button className={`${styles.indBtn} ${indicators.ma50?styles.indOn:''}`} onClick={()=>setIndicators(s=>({...s,ma50:!s.ma50}))}>MA50</button>
          <span style={{width:1,height:12,background:'var(--brd)',margin:'0 2px'}}/>
          <button className={`${styles.indBtn} ${drawMode==='hline'?styles.indOn:''}`} onClick={()=>setDrawMode(drawMode==='hline'?null:'hline')} title="Support/Résistance">━</button>
          <button className={styles.indBtn} onClick={clearDrawings} title="Effacer">🗑</button>
        </div>

        <span className={styles.badge}><span className={styles.dot}/>LIVE</span>
        {onToggleOrders && (
          <button className={styles.ordBtn} onClick={onToggleOrders}>
            {ordersOpen ? '▾' : '▸'} Ordres
          </button>
        )}
      </div>

      {/* Chart container */}
      <div className={styles.outer} ref={containerRef}>
        <TrendlineOverlay
          chartRef={chartRef}
          seriesRef={candleRef}
          pair={pair}
          tf={tf}
          containerRef={containerRef}
        />
      </div>
    </div>
  )
}
