import { useEffect, useRef } from 'react'
import { useStore } from '../../store'
import styles from './DepthChart.module.css'

export function DepthChart() {
  const bids = useStore(s => s.bids)
  const asks = useStore(s => s.asks)
  const outerRef = useRef(null)
  const canvasRef = useRef(null)

  const draw = () => {
    const cvs = canvasRef.current
    const outer = outerRef.current
    if (!cvs || !outer) return

    const W = outer.clientWidth
    const H = outer.clientHeight
    if (W < 10 || H < 10) return

    cvs.width = Math.floor(W)
    cvs.height = Math.floor(H)

    if (!bids.length || !asks.length) return
    const ctx = cvs.getContext('2d')
    ctx.clearRect(0, 0, W, H)

    let cumBids = [], cumAsks = []
    let sum = 0
    ;[...bids].sort((a,b) => b[0]-a[0]).forEach(([p,s]) => { sum+=s; cumBids.push([p,sum]) })
    sum = 0
    ;[...asks].sort((a,b) => a[0]-b[0]).forEach(([p,s]) => { sum+=s; cumAsks.push([p,sum]) })

    if (!cumBids.length || !cumAsks.length) return

    const allPrices = [...cumBids.map(x=>x[0]), ...cumAsks.map(x=>x[0])]
    const allSizes  = [...cumBids.map(x=>x[1]), ...cumAsks.map(x=>x[1])]
    const minP = Math.min(...allPrices), maxP = Math.max(...allPrices)
    const maxS = Math.max(...allSizes)
    if (!isFinite(minP) || !isFinite(maxP) || !isFinite(maxS) || maxS === 0) return

    const PAD = { t:8, b:24, l:8, r:4 }
    const cW = W - PAD.l - PAD.r
    const cH = H - PAD.t - PAD.b
    const toX = p => PAD.l + ((p-minP)/(maxP-minP))*cW
    const toY = s => PAD.t + cH - (s/maxS)*cH

    const drawArea = (points, color, fillColor) => {
      if (points.length < 2) return
      ctx.beginPath()
      ctx.moveTo(toX(points[0][0]), toY(0))
      points.forEach(([p,s]) => ctx.lineTo(toX(p), toY(s)))
      ctx.lineTo(toX(points[points.length-1][0]), toY(0))
      ctx.closePath()
      ctx.fillStyle = fillColor
      ctx.fill()
      ctx.beginPath()
      points.forEach(([p,s],i) => i===0 ? ctx.moveTo(toX(p),toY(s)) : ctx.lineTo(toX(p),toY(s)))
      ctx.strokeStyle = color
      ctx.lineWidth = 1.5
      ctx.stroke()
    }

    drawArea(cumBids, '#8cc63f', 'rgba(140,198,63,0.1)')
    drawArea(cumAsks, '#ff3b5c', 'rgba(255,59,92,0.1)')

    // Mid price line
    const mid = (cumBids[0][0] + cumAsks[0][0]) / 2
    const midX = toX(mid)
    ctx.setLineDash([3,3])
    ctx.strokeStyle = 'rgba(255,255,255,0.15)'
    ctx.lineWidth = 1
    ctx.beginPath(); ctx.moveTo(midX, PAD.t); ctx.lineTo(midX, H-PAD.b); ctx.stroke()
    ctx.setLineDash([])

    // Price labels
    ctx.font = '9px JetBrains Mono'
    ctx.fillStyle = 'rgba(255,255,255,0.25)'
    ctx.textAlign = 'left';  ctx.fillText(minP.toFixed(1), PAD.l, H-6)
    ctx.textAlign = 'right'; ctx.fillText(maxP.toFixed(1), W-PAD.r, H-6)
    ctx.textAlign = 'center';ctx.fillStyle = 'rgba(255,255,255,0.4)'
    ctx.fillText(mid.toFixed(1), midX, H-6)
  }

  useEffect(() => { draw() }, [bids, asks])

  useEffect(() => {
    const ro = new ResizeObserver(() => draw())
    if (outerRef.current) ro.observe(outerRef.current)
    return () => ro.disconnect()
  }, [bids, asks])

  return (
    <div ref={outerRef} className={styles.wrap}>
      <canvas ref={canvasRef} className={styles.canvas} />
    </div>
  )
}
