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
    const W = outer.clientWidth, H = outer.clientHeight - 28
    if (W < 10 || H < 10) return
    cvs.width = W; cvs.height = H
    if (!bids.length || !asks.length) return
    const ctx = cvs.getContext('2d')

    // Background
    ctx.fillStyle = '#09090b'
    ctx.fillRect(0, 0, W, H)

    const topAsks = [...asks].sort((a,b)=>a[0]-b[0]).slice(0,14)
    const topBids = [...bids].sort((a,b)=>b[0]-a[0]).slice(0,14)
    if (!topBids.length || !topAsks.length) return

    const bigBid = [...topBids].sort((a,b)=>b[1]-a[1])[0]
    const bigAsk = [...topAsks].sort((a,b)=>b[1]-a[1])[0]
    setTopBid(bigBid); setTopAsk(bigAsk)

    const allLevels = [
      ...topAsks.map(([p,s])=>({p,s,side:'ask'})).reverse(),
      ...topBids.map(([p,s])=>({p,s,side:'bid'})),
    ]
    const maxS = Math.max(...allLevels.map(l=>l.s))
    if (!maxS) return

    const rowH = Math.max(14, Math.floor(H / allLevels.length))
    const midIdx = topAsks.length
    const midY = midIdx * rowH
    const fontSize = Math.max(9, Math.min(11, rowH - 3))

    allLevels.forEach((level, i) => {
      const y = i * rowH
      const intensity = level.s / maxS
      const barW = Math.max(6, intensity * W * 0.65)
      const isBid = level.side === 'bid'
      const isWall = intensity > 0.5
      const isMid = i === midIdx

      // Row background (subtle)
      ctx.fillStyle = isBid ? 'rgba(0,229,160,0.04)' : 'rgba(255,59,92,0.04)'
      ctx.fillRect(0, y, W, rowH - 1)

      // Intensity bar with gradient
      const g = ctx.createLinearGradient(0, 0, barW, 0)
      if (isBid) {
        g.addColorStop(0, `rgba(0,229,160,${0.25 + intensity * 0.55})`)
        g.addColorStop(1, 'rgba(0,229,160,0.02)')
      } else {
        g.addColorStop(0, `rgba(255,59,92,${0.25 + intensity * 0.55})`)
        g.addColorStop(1, 'rgba(255,59,92,0.02)')
      }
      ctx.fillStyle = g
      ctx.fillRect(0, y, barW, rowH - 1)

      // Wall highlight
      if (isWall) {
        ctx.shadowColor = isBid ? '#00e5a0' : '#ff3b5c'
        ctx.shadowBlur = 6
        ctx.fillStyle = isBid ? 'rgba(0,229,160,0.12)' : 'rgba(255,59,92,0.12)'
        ctx.fillRect(0, y, barW, rowH - 1)
        ctx.shadowBlur = 0
        // Left border accent
        ctx.fillStyle = isBid ? 'rgba(0,229,160,0.9)' : 'rgba(255,59,92,0.9)'
        ctx.fillRect(0, y, 2, rowH - 1)
      }

      // Separator line
      ctx.fillStyle = 'rgba(255,255,255,0.04)'
      ctx.fillRect(0, y + rowH - 1, W, 1)

      // Price label — right aligned
      ctx.font = `${isWall ? 'bold ' : ''}${fontSize}px JetBrains Mono`
      ctx.textAlign = 'right'
      ctx.fillStyle = isMid ? '#fff' : isWall
        ? (isBid ? '#00e5a0' : '#ff3b5c')
        : 'rgba(255,255,255,0.7)'
      ctx.fillText(fmtPx(level.p), W - 6, y + rowH - 4)

      // Size label for walls — left aligned
      if (isWall && rowH >= 12) {
        ctx.textAlign = 'left'
        ctx.font = `bold ${fontSize - 1}px JetBrains Mono`
        ctx.fillStyle = isBid ? 'rgba(0,229,160,0.85)' : 'rgba(255,59,92,0.85)'
        const sizeStr = level.s >= 1 ? level.s.toFixed(2) : level.s.toFixed(4)
        ctx.fillText(sizeStr, 6, y + rowH - 4)
      }
    })

    // Mid spread line
    ctx.setLineDash([4, 4])
    ctx.strokeStyle = 'rgba(255,255,255,0.25)'
    ctx.lineWidth = 1
    ctx.beginPath(); ctx.moveTo(0, midY); ctx.lineTo(W, midY); ctx.stroke()
    ctx.setLineDash([])

    // Spread text
    if (topBids[0] && topAsks[0]) {
      const spread = ((topAsks[0][0] - topBids[0][0]) / topBids[0][0] * 100).toFixed(4)
      ctx.font = 'bold 9px JetBrains Mono'
      ctx.fillStyle = 'rgba(255,255,255,0.5)'
      ctx.textAlign = 'center'
      ctx.fillText(`spread ${spread}%`, W/2, midY - 3)
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
