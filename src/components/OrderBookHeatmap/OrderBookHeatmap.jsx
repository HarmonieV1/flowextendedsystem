import { useState, useEffect, useRef, useCallback } from 'react'
import { useStore } from '../../store'
import { fmtPx } from '../../lib/format'
import styles from './OrderBookHeatmap.module.css'

const HISTORY_SECONDS = 30

export function OrderBookHeatmap() {
  const pair   = useStore(s => s.pair)
  const lastPx = useStore(s => s.lastPx)
  const [live, setLive] = useState(false)
  const [dataCount, setDataCount] = useState(0)
  const canvasRef  = useRef(null)
  const wrapRef    = useRef(null)
  const historyRef = useRef([])
  const wsRef      = useRef(null)
  const frameRef   = useRef(null)

  const draw = useCallback(() => {
    const canvas = canvasRef.current
    const wrap   = wrapRef.current
    if (!canvas || !wrap) return

    // Resize canvas to container
    const rect = wrap.getBoundingClientRect()
    const W = wrap.offsetWidth || wrap.clientWidth || 600
    const H = wrap.offsetHeight || wrap.clientHeight || 280
    if (canvas.width !== W || canvas.height !== H) {
      canvas.width  = W
      canvas.height = H
    }

    const ctx = canvas.getContext('2d')
    ctx.fillStyle = '#09090b'
    ctx.fillRect(0, 0, W, H)

    const history = historyRef.current
    if (history.length < 3) {
      ctx.fillStyle = 'rgba(255,255,255,.2)'
      ctx.font = '12px monospace'
      ctx.textAlign = 'center'
      ctx.fillText(dataCount > 0 ? 'Collecte données... ' + dataCount + '/' + HISTORY_SECONDS : 'Connexion Binance...', W/2, H/2)
      // Draw progress bar
      const prog = Math.min(1, dataCount / HISTORY_SECONDS)
      ctx.fillStyle = 'rgba(0,229,160,.3)'
      ctx.fillRect(W*0.2, H/2+20, W*0.6*prog, 4)
      ctx.strokeStyle = 'rgba(0,229,160,.15)'
      ctx.strokeRect(W*0.2, H/2+20, W*0.6, 4)
      return
    }

    const now = Date.now()
    const relevant = history.filter(h => h.t >= now - HISTORY_SECONDS * 1000)
    if (relevant.length < 2) return

    // Price range from all data
    let minP = Infinity, maxP = -Infinity
    relevant.forEach(h => {
      h.bids.slice(0, 20).forEach(([p]) => { if(p<minP)minP=p; if(p>maxP)maxP=p })
      h.asks.slice(0, 20).forEach(([p]) => { if(p<minP)minP=p; if(p>maxP)maxP=p })
    })
    if (!isFinite(minP) || minP === maxP) return

    // Pad range
    const range = maxP - minP
    minP -= range * 0.05
    maxP += range * 0.05

    // Max volume for color scaling
    let maxVol = 0
    relevant.forEach(h => {
      h.bids.forEach(([,v]) => { if(v>maxVol)maxVol=v })
      h.asks.forEach(([,v]) => { if(v>maxVol)maxVol=v })
    })
    if (maxVol === 0) return

    const colW = W / relevant.length
    const priceToY = p => H - ((p - minP) / (maxP - minP)) * H

    // Draw each time column
    relevant.forEach((h, col) => {
      const x = col * colW

      h.bids.slice(0, 20).forEach(([price, vol]) => {
        if (price < minP || price > maxP) return
        const y = priceToY(price)
        const intensity = Math.pow(vol / maxVol, 0.5) // sqrt for better visual
        ctx.fillStyle = `rgba(0,229,160,${0.05 + intensity * 0.85})`
        ctx.fillRect(x, y - 2, colW + 0.5, 5)
      })

      h.asks.slice(0, 20).forEach(([price, vol]) => {
        if (price < minP || price > maxP) return
        const y = priceToY(price)
        const intensity = Math.pow(vol / maxVol, 0.5)
        ctx.fillStyle = `rgba(255,59,92,${0.05 + intensity * 0.85})`
        ctx.fillRect(x, y - 2, colW + 0.5, 5)
      })
    })

    // Current price line
    if (lastPx > minP && lastPx < maxP) {
      const y = priceToY(lastPx)
      ctx.save()
      ctx.strokeStyle = 'rgba(255,255,255,.9)'
      ctx.lineWidth = 1
      ctx.setLineDash([3, 3])
      ctx.beginPath()
      ctx.moveTo(0, y)
      ctx.lineTo(W, y)
      ctx.stroke()
      ctx.restore()
      // Price tag
      ctx.fillStyle = 'rgba(255,255,255,.9)'
      ctx.font = 'bold 10px monospace'
      ctx.textAlign = 'right'
      ctx.fillText(fmtPx(lastPx), W - 6, y - 4)
    }

    // Y-axis price labels
    ctx.fillStyle = 'rgba(255,255,255,.35)'
    ctx.font = '9px monospace'
    for (let i = 0; i <= 4; i++) {
      const p = minP + (maxP - minP) * (i / 4)
      const y = priceToY(p)
      ctx.textAlign = 'left'
      ctx.fillText(fmtPx(p), 4, y - 2)
    }

    // Time labels
    ctx.fillStyle = 'rgba(255,255,255,.25)'
    ctx.font = '9px monospace'
    ctx.textAlign = 'center'
    ctx.fillText('-' + HISTORY_SECONDS + 's', 30, H - 4)
    ctx.fillText('Maintenant', W - 40, H - 4)

  }, [lastPx])

  // Animation loop
  useEffect(() => {
    const loop = () => { draw(); frameRef.current = requestAnimationFrame(loop) }
    frameRef.current = requestAnimationFrame(loop)
    return () => { if(frameRef.current) cancelAnimationFrame(frameRef.current) }
  }, [draw])

  // WebSocket
  useEffect(() => {
    historyRef.current = []
    setLive(false)
    if (wsRef.current) { try{wsRef.current.close()}catch(_){} }

    const ws = new WebSocket(`wss://stream.binance.com:9443/ws/${pair.toLowerCase()}@depth20@500ms`)
    wsRef.current = ws
    ws.onopen = () => { setLive(true); setDataCount(0) }
    ws.onclose = () => setLive(false)
    ws.onmessage = e => {
      try {
        const d = JSON.parse(e.data)
        const now = Date.now()
        setDataCount(n => n+1)
        historyRef.current = [
          ...historyRef.current.filter(h => h.t >= now - HISTORY_SECONDS * 1000),
          {
            t:    now,
            bids: d.bids.map(([p,v]) => [parseFloat(p), parseFloat(v)]),
            asks: d.asks.map(([p,v]) => [parseFloat(p), parseFloat(v)]),
          }
        ]
      } catch(_) {}
    }
    return () => { try{ws.close()}catch(_){} }
  }, [pair])

  return (
    <div className={styles.wrap}>
      <div className={styles.header}>
        <span className={styles.title}>🔥 Order Book Heatmap</span>
        <span className={styles.pair}>{pair.replace('USDT', '/USDT')}</span>
        <span className={styles.window}>{HISTORY_SECONDS}s</span>
        <span className={styles.live} style={{color: live ? 'var(--grn)' : 'var(--red)'}}>
          ● {live ? 'LIVE' : 'OFF'}
        </span>
      </div>
      <div className={styles.legend}>
        <span style={{color:'var(--grn)'}}>■ Bids (acheteurs)</span>
        <span className={styles.legendCenter}>Intensité = Volume · Murs = liquidité forte</span>
        <span style={{color:'var(--red)'}}>■ Asks (vendeurs)</span>
      </div>
      {/* Canvas wrapper fills remaining space */}
      <div ref={wrapRef} className={styles.canvasWrap}>
        <canvas ref={canvasRef} className={styles.canvas}/>
      </div>
      <div className={styles.footer}>
        Binance depth20 · {HISTORY_SECONDS}s historique · 500ms update · Murs de liquidité visibles
      </div>
    </div>
  )
}
