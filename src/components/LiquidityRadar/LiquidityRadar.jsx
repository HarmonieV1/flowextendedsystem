import { useState, useEffect, useRef } from 'react'
import { useStore } from '../../store'
import { fmtPx } from '../../lib/format'
import styles from './LiquidityRadar.module.css'
import { logSilent } from '../../lib/errorMonitor'

export function LiquidityRadar() {
  const pair   = useStore(s => s.pair)
  const storePx = useStore(s => s.lastPx)
  const [midPx, setMidPx] = useState(0)
  const [bids, setBids] = useState([])
  const [asks, setAsks] = useState([])
  const [live, setLive] = useState(false)
  const wsRef  = useRef(null)

  useEffect(() => {
    setBids([]); setAsks([]); setLive(false)
    if (wsRef.current) { try{wsRef.current.close()}catch(e){logSilent(e,'LiquidityRadar')} }

    const ws = new WebSocket(`wss://stream.binance.com:9443/ws/${pair.toLowerCase()}@depth20@100ms`)
    wsRef.current = ws
    ws.onopen = () => setLive(true)
    ws.onclose = () => setLive(false)
    ws.onmessage = e => {
      try {
        const d = JSON.parse(e.data)
        const newBids = d.bids.map(([p,q])=>[parseFloat(p),parseFloat(q)])
        const newAsks = d.asks.map(([p,q])=>[parseFloat(p),parseFloat(q)])
        setBids(newBids)
        setAsks(newAsks)
        if (newBids.length && newAsks.length) {
          setMidPx((newBids[0][0] + newAsks[0][0]) / 2)
        }
      } catch(e){logSilent(e,'LiquidityRadar')}
    }
    return () => { try{ws.close()}catch(e){logSilent(e,'LiquidityRadar')} }
  }, [pair])

  const canvasRef = useRef(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas || bids.length === 0) return
    const ctx = canvas.getContext('2d')
    const W = canvas.width, H = canvas.height
    const cx = W/2, cy = H/2
    const R = Math.min(W,H)/2 - 20

    ctx.clearRect(0,0,W,H)

    // Background circles
    ctx.strokeStyle = 'rgba(255,255,255,.05)'
    for (let i=1; i<=5; i++) {
      ctx.beginPath()
      ctx.arc(cx, cy, R*i/5, 0, Math.PI*2)
      ctx.stroke()
    }

    // Price label rings
    ctx.fillStyle = 'rgba(255,255,255,.2)'
    ctx.font = '9px monospace'
    ctx.textAlign = 'center'

    const maxVol = Math.max(...bids.slice(0,20).map(b=>b[1]), ...asks.slice(0,20).map(a=>a[1]))

    // Draw bids (left semicircle - green)
    bids.slice(0,20).forEach(([price, vol], i) => {
      const angle = Math.PI/2 + (i/20) * Math.PI
      const r = (vol/maxVol) * R
      const x = cx + Math.cos(angle) * r
      const y = cy + Math.sin(angle) * r
      const alpha = 0.2 + (vol/maxVol)*0.7
      ctx.fillStyle = `rgba(140,198,63,${alpha})`
      ctx.beginPath()
      ctx.arc(x, y, Math.max(3, vol/maxVol*12), 0, Math.PI*2)
      ctx.fill()
    })

    // Draw asks (right semicircle - red)
    asks.slice(0,20).forEach(([price, vol], i) => {
      const angle = -Math.PI/2 + (i/20) * Math.PI
      const r = (vol/maxVol) * R
      const x = cx + Math.cos(angle) * r
      const y = cy + Math.sin(angle) * r
      const alpha = 0.2 + (vol/maxVol)*0.7
      ctx.fillStyle = `rgba(255,59,92,${alpha})`
      ctx.beginPath()
      ctx.arc(x, y, Math.max(3, vol/maxVol*12), 0, Math.PI*2)
      ctx.fill()
    })

    // Center price
    ctx.fillStyle = 'white'
    ctx.font = 'bold 13px monospace'
    ctx.textAlign = 'center'
    const px = midPx || storePx
    ctx.fillText(fmtPx(px), cx, cy+5)

    // Labels
    ctx.font = '10px monospace'
    ctx.fillStyle = 'rgba(140,198,63,.8)'
    ctx.textAlign = 'left'
    ctx.fillText('BIDS', 10, H-10)
    ctx.fillStyle = 'rgba(255,59,92,.8)'
    ctx.textAlign = 'right'
    ctx.fillText('ASKS', W-10, H-10)

  }, [bids, asks, midPx, storePx])


  // Detect liquidity gaps
  const gaps = []
  for (let i=1; i<bids.length; i++) {
    const gap = bids[i-1][0] - bids[i][0]
    const avgGap = (bids[0][0] - bids[bids.length-1][0]) / bids.length
    if (gap > avgGap * 3) {
      gaps.push({ price: bids[i][0], side:'bid', size: gap })
    }
  }
  for (let i=1; i<asks.length; i++) {
    const gap = asks[i][0] - asks[i-1][0]
    const avgGap = (asks[asks.length-1][0] - asks[0][0]) / asks.length
    if (gap > avgGap * 3) {
      gaps.push({ price: asks[i][0], side:'ask', size: gap })
    }
  }

  return (
    <div className={styles.wrap}>
      <div className={styles.header}>
        <span className={styles.title}>🎯 Liquidity Depth Radar</span>
        <span className={styles.pair}>{pair.replace('USDT','/USDT')}</span>
        <span className={styles.live} style={{color:live?'var(--grn)':'var(--red)'}}>● {live?'LIVE':'OFF'}</span>
      </div>

      <div className={styles.radarWrap}>
        <canvas ref={canvasRef} width={300} height={300} className={styles.canvas}/>
      </div>

      {gaps.length > 0 && (
        <div className={styles.gapsSection}>
          <div className={styles.gapsTitle}>⚠ Gaps de liquidité détectés</div>
          {gaps.slice(0,5).map((g,i)=>(
            <div key={i} className={styles.gapRow}>
              <span className={styles.gapSide} style={{color:g.side==='bid'?'var(--grn)':'var(--red)'}}>
                {g.side==='bid'?'↑ BID':'↓ ASK'}
              </span>
              <span className={styles.gapPrice}>{fmtPx(g.price)}</span>
              <span className={styles.gapSize}>Gap: {g.size.toFixed(2)}</span>
            </div>
          ))}
        </div>
      )}

      <div className={styles.stats}>
        <div className={styles.statBox}>
          <span className={styles.statL}>Bid depth 1%</span>
          <span className={styles.statV} style={{color:'var(--grn)'}}>
            {bids.filter(b=>b[0]>=(midPx||storePx)*0.99).reduce((s,b)=>s+b[0]*b[1],0).toFixed(0)} USD
          </span>
        </div>
        <div className={styles.statBox}>
          <span className={styles.statL}>Ask depth 1%</span>
          <span className={styles.statV} style={{color:'var(--red)'}}>
            {asks.filter(a=>a[0]<=(midPx||storePx)*1.01).reduce((s,a)=>s+a[0]*a[1],0).toFixed(0)} USD
          </span>
        </div>
      </div>

      <div className={styles.footer}>Binance depth20 · 100ms · Gaps = zones instables</div>
    </div>
  )
}
