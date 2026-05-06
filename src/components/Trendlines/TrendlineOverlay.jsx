// FXSEDGE — Trendline / Drawing tools overlay for the chart
// Uses an absolutely-positioned SVG that maps to the chart's price/time scales
import { useEffect, useRef, useState, useCallback } from 'react'
import { logSilent } from '../../lib/errorMonitor'
import styles from './Trendlines.module.css'

const STORAGE_KEY = 'fxs_drawings'

// Tools: trendline (2 points), horizontal (1 point), rectangle (2 points)
export const TOOL_NONE = 'none'
export const TOOL_TRENDLINE = 'trendline'
export const TOOL_HLINE = 'hline'
export const TOOL_RECT = 'rect'

function loadDrawings() {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}') }
  catch { return {} }
}

function saveDrawings(all) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(all)) } catch {}
}

export function TrendlineOverlay({ chartRef, seriesRef, pair, tf, containerRef }) {
  const [tool, setTool] = useState(TOOL_NONE)
  const [drawings, setDrawings] = useState([])
  const [pendingPoint, setPendingPoint] = useState(null)
  const [size, setSize] = useState({ w: 0, h: 0 })
  const svgRef = useRef(null)
  const drawKey = `${pair}_${tf}`

  // Load drawings for this pair+tf
  useEffect(() => {
    const all = loadDrawings()
    setDrawings(all[drawKey] || [])
    setPendingPoint(null)
  }, [drawKey])

  // Track container size
  useEffect(() => {
    if (!containerRef?.current) return
    const update = () => {
      const r = containerRef.current.getBoundingClientRect()
      setSize({ w: r.width, h: r.height })
    }
    update()
    const ro = new ResizeObserver(update)
    ro.observe(containerRef.current)
    return () => ro.disconnect()
  }, [containerRef])

  // Convert pixel coords to (time, price) using chart APIs
  const pixelToData = useCallback((x, y) => {
    if (!chartRef?.current || !seriesRef?.current) return null
    try {
      const time = chartRef.current.timeScale().coordinateToTime(x)
      const price = seriesRef.current.coordinateToPrice(y)
      if (time == null || price == null) return null
      return { time, price }
    } catch (e) {
      logSilent(e, 'Trendline.pixelToData')
      return null
    }
  }, [chartRef, seriesRef])

  // Convert (time, price) to pixel coords
  const dataToPixel = useCallback((time, price) => {
    if (!chartRef?.current || !seriesRef?.current) return null
    try {
      const x = chartRef.current.timeScale().timeToCoordinate(time)
      const y = seriesRef.current.priceToCoordinate(price)
      if (x == null || y == null) return null
      return { x, y }
    } catch { return null }
  }, [chartRef, seriesRef])

  // Re-render trigger when chart pans/zooms
  const [renderTick, setRenderTick] = useState(0)
  useEffect(() => {
    if (!chartRef?.current) return
    const cb = () => setRenderTick(t => t + 1)
    try {
      chartRef.current.timeScale().subscribeVisibleLogicalRangeChange(cb)
      return () => {
        try { chartRef.current?.timeScale().unsubscribeVisibleLogicalRangeChange(cb) } catch {}
      }
    } catch {}
  }, [chartRef])

  // Re-render on size change
  useEffect(() => { setRenderTick(t => t + 1) }, [size])

  const handleClick = (e) => {
    if (tool === TOOL_NONE || !svgRef.current) return
    const rect = svgRef.current.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top
    const data = pixelToData(x, y)
    if (!data) return

    if (tool === TOOL_HLINE) {
      // 1-point tool — finalize immediately
      const newDrawing = {
        id: Date.now(),
        type: 'hline',
        price: data.price,
      }
      const next = [...drawings, newDrawing]
      setDrawings(next)
      const all = loadDrawings()
      all[drawKey] = next
      saveDrawings(all)
      setTool(TOOL_NONE)
    } else if (tool === TOOL_TRENDLINE || tool === TOOL_RECT) {
      // 2-point tool
      if (!pendingPoint) {
        setPendingPoint(data)
      } else {
        const newDrawing = {
          id: Date.now(),
          type: tool === TOOL_TRENDLINE ? 'trendline' : 'rect',
          a: pendingPoint,
          b: data,
        }
        const next = [...drawings, newDrawing]
        setDrawings(next)
        const all = loadDrawings()
        all[drawKey] = next
        saveDrawings(all)
        setPendingPoint(null)
        setTool(TOOL_NONE)
      }
    }
  }

  const removeDrawing = (id) => {
    const next = drawings.filter(d => d.id !== id)
    setDrawings(next)
    const all = loadDrawings()
    all[drawKey] = next
    saveDrawings(all)
  }

  const clearAll = () => {
    setDrawings([])
    const all = loadDrawings()
    delete all[drawKey]
    saveDrawings(all)
  }

  return (
    <>
      {/* Drawing toolbar */}
      <div className={styles.toolbar}>
        <button className={tool === TOOL_TRENDLINE ? styles.toolOn : styles.tool}
          onClick={() => { setTool(tool === TOOL_TRENDLINE ? TOOL_NONE : TOOL_TRENDLINE); setPendingPoint(null) }}
          title="Trendline (2 clics)">╱</button>
        <button className={tool === TOOL_HLINE ? styles.toolOn : styles.tool}
          onClick={() => setTool(tool === TOOL_HLINE ? TOOL_NONE : TOOL_HLINE)}
          title="Ligne horizontale">─</button>
        <button className={tool === TOOL_RECT ? styles.toolOn : styles.tool}
          onClick={() => { setTool(tool === TOOL_RECT ? TOOL_NONE : TOOL_RECT); setPendingPoint(null) }}
          title="Rectangle (2 clics)">▭</button>
        {drawings.length > 0 && (
          <button className={styles.tool} onClick={clearAll} title="Tout effacer" style={{color:'var(--red)'}}>×</button>
        )}
      </div>

      {/* Pending point indicator */}
      {pendingPoint && tool !== TOOL_NONE && (
        <div className={styles.pendingHint}>
          Clic 2 pour terminer · Esc pour annuler
        </div>
      )}

      {/* SVG drawing layer — captures clicks only when a tool is active */}
      <svg
        ref={svgRef}
        className={styles.svg}
        width={size.w} height={size.h}
        style={{ pointerEvents: tool === TOOL_NONE ? 'none' : 'auto', cursor: tool === TOOL_NONE ? 'default' : 'crosshair' }}
        onClick={handleClick}
      >
        {drawings.map(d => {
          if (d.type === 'hline') {
            const p = dataToPixel(0, d.price)
            if (!p) return null
            return (
              <g key={d.id}>
                <line x1={0} y1={p.y} x2={size.w} y2={p.y}
                  stroke="#8cc63f" strokeWidth="1.5" strokeDasharray="4,3" />
                <text x={size.w - 60} y={p.y - 4} fill="#8cc63f" fontSize="10" fontFamily="monospace">
                  {d.price.toFixed(2)}
                </text>
                <circle cx={size.w - 10} cy={p.y} r="6"
                  fill="rgba(255,59,92,0.2)" stroke="#ff3b5c" strokeWidth="1"
                  className={styles.delHandle}
                  onClick={(e) => { e.stopPropagation(); removeDrawing(d.id) }} />
              </g>
            )
          }
          if (d.type === 'trendline') {
            const a = dataToPixel(d.a.time, d.a.price)
            const b = dataToPixel(d.b.time, d.b.price)
            if (!a || !b) return null
            return (
              <g key={d.id}>
                <line x1={a.x} y1={a.y} x2={b.x} y2={b.y}
                  stroke="#8cc63f" strokeWidth="1.8" />
                <circle cx={a.x} cy={a.y} r="3" fill="#8cc63f" />
                <circle cx={b.x} cy={b.y} r="3" fill="#8cc63f" />
                <circle cx={(a.x + b.x) / 2} cy={(a.y + b.y) / 2} r="6"
                  fill="rgba(255,59,92,0.2)" stroke="#ff3b5c" strokeWidth="1"
                  className={styles.delHandle}
                  onClick={(e) => { e.stopPropagation(); removeDrawing(d.id) }} />
              </g>
            )
          }
          if (d.type === 'rect') {
            const a = dataToPixel(d.a.time, d.a.price)
            const b = dataToPixel(d.b.time, d.b.price)
            if (!a || !b) return null
            const x = Math.min(a.x, b.x), y = Math.min(a.y, b.y)
            const w = Math.abs(b.x - a.x), h = Math.abs(b.y - a.y)
            return (
              <g key={d.id}>
                <rect x={x} y={y} width={w} height={h}
                  fill="rgba(140,198,63,0.08)" stroke="#8cc63f" strokeWidth="1.2" />
                <circle cx={x + w / 2} cy={y + h / 2} r="6"
                  fill="rgba(255,59,92,0.2)" stroke="#ff3b5c" strokeWidth="1"
                  className={styles.delHandle}
                  onClick={(e) => { e.stopPropagation(); removeDrawing(d.id) }} />
              </g>
            )
          }
          return null
        })}
      </svg>
    </>
  )
}
