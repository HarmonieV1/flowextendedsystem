import { useEffect, useRef, useState } from 'react'
import { useStore } from '../../store'
import { fmtPx, fmt } from '../../lib/format'
import styles from './LiquidityHeatmap.module.css'

export function LiquidityHeatmap() {
  const bids   = useStore(s => s.bids)
  const asks   = useStore(s => s.asks)
  const lastPx = useStore(s => s.lastPx)
  const outerRef = useRef(null)
  const canvasRef = useRef(null)
  const [topBid, setTopBid] = useState(null)
  const [topAsk, setTopAsk] = useState(null)

  const draw = () => {
    const cvs = canvasRef.current
    const outer = outerRef.current
    if (!cvs || !outer) return
    const W = outer.clientWidth
    const H = outer.clientHeight - 28 // subtract header
    if (W < 10 || H < 10) return

    cvs.width  = Math.floor(W)
    cvs.height = Math.floor(H)

    if (!bids.length || !asks.length) return
    const ctx = cvs.getContext('2d')
    ctx.clearRect(0, 0, W, H)

    // Build levels
    const topAsks = [...asks].sort((a,b) => a[0]-b[0]).slice(0, 15)
    const topBids = [...bids].sort((a,b) => b[0]-a[0]).slice(0, 15)

    if (!topBids.length || !topAsks.length) return

    // Find the largest order (institutional wall)
    const bigBid = [...topBids].sort((a,b)=>b[1]-a[1])[0]
    const bigAsk = [...topAsks].sort((a,b)=>b[1]-a[1])[0]
    setTopBid(bigBid)
    setTopAsk(bigAsk)

    const allLevels = [
      ...topAsks.map(([p,s])=>({p,s,side:'ask'})).reverse(),
      ...topBids.map(([p,s])=>({p,s,side:'bid'})),
    ]
    const maxS = Math.max(...allLevels.map(l=>l.s))
    if (!maxS) return

    const rowH    = Math.floor(H / allLevels.length)
    const midIdx  = topAsks.length

    allLevels.forEach((level, i) => {
      const y = i * rowH
      const intensity = level.s / maxS
      const w = Math.max(4, intensity * (W * 0.7))
      const isWall = intensity > 0.6 // institutional wall threshold

      // Gradient bar
      if (level.side === 'bid') {
        const g = ctx.createLinearGradient(0, y, w, y)
        g.addColorStop(0, `rgba(0,229,160,${0.1 + intensity * 0.5})`)
        g.addColorStop(1, 'transparent')
        ctx.fillStyle = g
      } else {
        const g = ctx.createLinearGradient(0, y, w, y)
        g.addColorStop(0, `rgba(255,59,92,${0.1 + intensity * 0.5})`)
        g.addColorStop(1, 'transparent')
        ctx.fillStyle = g
      }
      ctx.fillRect(0, y, w, rowH - 1)

      // Wall glow for big orders
      if (isWall) {
        ctx.shadowColor = level.side === 'bid' ? 'rgba(0,229,160,0.4)' : 'rgba(255,59,92,0.4)'
        ctx.shadowBlur = 8
        ctx.fillStyle = level.side === 'bid' ? 'rgba(0,229,160,0.15)' : 'rgba(255,59,92,0.15)'
        ctx.fillRect(0, y, w * 1.1, rowH - 1)
        ctx.shadowBlur = 0
      }

      // Price label
      ctx.font = `${rowH > 12 ? 9 : 8}px JetBrains Mono`
      ctx.textAlign = 'right'
      ctx.fillStyle = i === midIdx ? 'rgba(255,255,255,0.6)' : 'rgba(255,255,255,0.25)'
      ctx.fillText(fmtPx(level.p), W - 4, y + rowH - 2)

      // Size for walls
      if (isWall && rowH > 10) {
        ctx.textAlign = 'left'
        ctx.fillStyle = level.side === 'bid' ? 'rgba(0,229,160,0.8)' : 'rgba(255,59,92,0.8)'
        ctx.fillText(`${level.s.toFixed(2)}`, 4, y + rowH - 2)
      }
    })

    // Mid line
    const midY = midIdx * rowH
    ctx.setLineDash([3, 3])
    ctx.strokeStyle = 'rgba(255,255,255,0.2)'
    ctx.lineWidth = 1
    ctx.beginPath(); ctx.moveTo(0, midY); ctx.lineTo(W * 0.75, midY); ctx.stroke()
    ctx.setLineDash([])

    // Spread label
    if (topBids[0] && topAsks[0]) {
      const spread = ((topAsks[0][0] - topBids[0][0]) / topBids[0][0] * 100).toFixed(4)
      ctx.font = '8px JetBrains Mono'
      ctx.fillStyle = 'rgba(255,255,255,0.35)'
      ctx.textAlign = 'left'
      ctx.fillText(`spread ${spread}%`, 4, midY - 2)
    }
  }

  useEffect(() => { draw() }, [bids, asks, lastPx])

  useEffect(() => {
    const ro = new ResizeObserver(() => draw())
    if (outerRef.current) ro.observe(outerRef.current)
    return () => ro.disconnect()
  }, [bids, asks])

  return (
    <div className={styles.wrap} ref={outerRef}>
      <div className={styles.header}>
        <span className={styles.title}>Liquidity Map</span>
        <span className={styles.live}>LIVE</span>
        {topBid && <span className={styles.wall} style={{color:'var(--grn)'}}>
          BID wall {fmt(topBid[1],2)} @ {fmtPx(topBid[0])}
        </span>}
        {topAsk && <span className={styles.wall} style={{color:'var(--red)'}}>
          ASK wall {fmt(topAsk[1],2)} @ {fmtPx(topAsk[0])}
        </span>}
      </div>
      <canvas ref={canvasRef} className={styles.canvas} />
    </div>
  )
}
