import { useState, useEffect, useRef } from 'react'
import { useStore } from '../../store'
import { fmtPx } from '../../lib/format'
import styles from './OrderBookHeatmap.module.css'

const HISTORY_MS = 30000

export function OrderBookHeatmap() {
  const pair   = useStore(s => s.pair)
  const lastPx = useStore(s => s.lastPx)
  const [status, setStatus] = useState('connecting')
  const canvasRef = useRef(null)
  const wrapRef   = useRef(null)
  const histRef   = useRef([])
  const frameRef  = useRef(null)
  const lastPxRef = useRef(0)

  lastPxRef.current = lastPx

  useEffect(() => {
    histRef.current = []
    setStatus('connecting')
    let dead = false

    const sym = pair.toLowerCase()
    const ws = new WebSocket(`wss://stream.binance.com:9443/ws/${sym}@depth20@100ms`)

    ws.onopen = () => { if (!dead) setStatus('collecting') }
    ws.onerror = () => { if (!dead) setStatus('error') }
    ws.onclose = () => { if (!dead) setStatus('disconnected') }
    ws.onmessage = e => {
      if (dead) return
      try {
        const d = JSON.parse(e.data)
        if (!d.bids || !d.asks) return
        histRef.current.push({
          t: Date.now(),
          bids: d.bids.slice(0,20).map(([p,v])=>[+p,+v]),
          asks: d.asks.slice(0,20).map(([p,v])=>[+p,+v]),
        })
        const cut = Date.now() - HISTORY_MS
        if (histRef.current.length > 20) {
          histRef.current = histRef.current.filter(h => h.t >= cut)
        }
      } catch(_) {}
    }

    const draw = () => {
      if (dead) return
      const canvas = canvasRef.current, wrap = wrapRef.current
      if (!canvas || !wrap) { frameRef.current = requestAnimationFrame(draw); return }

      const W = wrap.offsetWidth || 600, H = wrap.offsetHeight || 280
      if (canvas.width !== W) canvas.width = W
      if (canvas.height !== H) canvas.height = H
      const ctx = canvas.getContext('2d')

      ctx.fillStyle = '#09090b'
      ctx.fillRect(0,0,W,H)

      const hist = histRef.current
      if (hist.length < 3) {
        ctx.fillStyle = 'rgba(255,255,255,.25)'
        ctx.font = '13px monospace'
        ctx.textAlign = 'center'
        ctx.fillText(hist.length > 0 ? 'Collecte... '+hist.length+' pts' : 'Connexion Binance...', W/2, H/2)
        ctx.fillStyle = 'rgba(140,198,63,.3)'
        ctx.fillRect(W*.25, H/2+16, W*.5*(hist.length/3), 3)
        frameRef.current = requestAnimationFrame(draw)
        return
      }

      if (!dead) setStatus('live')

      const now = Date.now()
      const data = hist.filter(h => h.t >= now - HISTORY_MS)
      if (data.length < 2) { frameRef.current = requestAnimationFrame(draw); return }

      let lo=Infinity, hi=-Infinity
      data.forEach(h => {
        h.bids.forEach(([p])=>{ if(p<lo)lo=p; if(p>hi)hi=p })
        h.asks.forEach(([p])=>{ if(p<lo)lo=p; if(p>hi)hi=p })
      })
      if (!isFinite(lo)||lo>=hi) { frameRef.current = requestAnimationFrame(draw); return }
      const pad=(hi-lo)*.05; lo-=pad; hi+=pad

      let maxV=0
      data.forEach(h => {
        h.bids.forEach(([,v])=>{ if(v>maxV)maxV=v })
        h.asks.forEach(([,v])=>{ if(v>maxV)maxV=v })
      })
      if (!maxV) { frameRef.current = requestAnimationFrame(draw); return }

      const cw = W/data.length
      const py = p => H*(1-(p-lo)/(hi-lo))

      // Grid horizontal — repères de prix
      ctx.strokeStyle = 'rgba(255,255,255,.03)'
      ctx.lineWidth = 1
      for (let i=0;i<=8;i++) {
        const y = H*i/8
        ctx.beginPath(); ctx.moveTo(0,y); ctx.lineTo(W,y); ctx.stroke()
      }

      // Heatmap — blocs avec gradient d'intensité
      const blockH = Math.max(3, H / 40) // hauteur adaptative
      data.forEach((h,i) => {
        const x = i*cw
        h.bids.forEach(([p,v]) => {
          if(p<lo||p>hi) return
          const intensity = Math.pow(v/maxV, 0.45)
          const r=0, g=Math.round(130+intensity*125), b=Math.round(100+intensity*60)
          ctx.fillStyle = `rgba(${r},${g},${b},${0.08+intensity*.82})`
          ctx.fillRect(x, py(p)-blockH/2, cw+.5, blockH)
        })
        h.asks.forEach(([p,v]) => {
          if(p<lo||p>hi) return
          const intensity = Math.pow(v/maxV, 0.45)
          const r=Math.round(140+intensity*115), g=Math.round(20+intensity*40), b=Math.round(40+intensity*50)
          ctx.fillStyle = `rgba(${r},${g},${b},${0.08+intensity*.82})`
          ctx.fillRect(x, py(p)-blockH/2, cw+.5, blockH)
        })
      })

      // Walls — murs de liquidité bien visibles
      const wt = maxV * .5
      data.forEach((h,i) => {
        const x = i*cw
        ;[...h.bids,...h.asks].forEach(([p,v]) => {
          if (v>=wt && p>=lo && p<=hi) {
            const isBid = h.bids.some(([bp])=>bp===p)
            ctx.fillStyle = isBid ? 'rgba(140,198,63,.15)' : 'rgba(255,59,92,.15)'
            ctx.fillRect(x, py(p)-blockH, cw+.5, blockH*2)
            // Wall glow
            ctx.shadowColor = isBid ? '#8cc63f' : '#ff3b5c'
            ctx.shadowBlur = 6
            ctx.fillRect(x, py(p)-1, cw+.5, 2)
            ctx.shadowBlur = 0
          }
        })
      })

      // Spread zone — zone entre best bid et best ask
      if (data.length > 0) {
        const last = data[data.length-1]
        const bestBid = Math.max(...last.bids.map(([p])=>p))
        const bestAsk = Math.min(...last.asks.map(([p])=>p))
        if (bestBid < bestAsk && bestBid > lo && bestAsk < hi) {
          ctx.fillStyle = 'rgba(255,255,255,.03)'
          ctx.fillRect(0, py(bestAsk), W, py(bestBid)-py(bestAsk))
        }
      }

      // Current price line
      const curPx = lastPxRef.current || (lo+hi)/2
      if (curPx > lo && curPx < hi) {
        const y = py(curPx)
        ctx.save()
        ctx.strokeStyle = 'rgba(255,255,255,.9)'
        ctx.lineWidth = 1.5; ctx.setLineDash([4,4])
        ctx.beginPath(); ctx.moveTo(0,y); ctx.lineTo(W,y); ctx.stroke()
        ctx.restore()
        // Price tag with background
        const label = fmtPx(curPx)
        const tw = ctx.measureText(label).width + 8
        ctx.fillStyle = 'rgba(255,255,255,.12)'
        ctx.fillRect(W-tw-8, y-10, tw+4, 16)
        ctx.fillStyle = '#fff'
        ctx.font = 'bold 10px monospace'
        ctx.textAlign = 'right'
        ctx.fillText(label, W-8, y+3)
      }

      // Y axis labels
      ctx.fillStyle = 'rgba(255,255,255,.35)'
      ctx.font = '9px monospace'
      ctx.textAlign = 'left'
      for (let i=0;i<=5;i++) {
        const p = lo + (hi-lo)*(i/5)
        ctx.fillText(fmtPx(p), 4, py(p)-3)
      }
      // Time labels
      ctx.fillStyle = 'rgba(255,255,255,.2)'
      ctx.textAlign = 'center'
      ctx.fillText('-30s', 30, H-4)
      ctx.fillText('Now', W-30, H-4)

      frameRef.current = requestAnimationFrame(draw)
    }

    frameRef.current = requestAnimationFrame(draw)

    return () => {
      dead = true
      ws.onopen = ws.onclose = ws.onerror = ws.onmessage = null
      try { ws.close() } catch(_) {}
      if (frameRef.current) cancelAnimationFrame(frameRef.current)
    }
  }, [pair])

  return (
    <div className={styles.wrap}>
      <div className={styles.header}>
        <span className={styles.title}>Order Book Heatmap</span>
        <span className={styles.pair}>{pair.replace('USDT', '/USDT')}</span>
        <span className={styles.window}>30s</span>
        <span className={styles.live} style={{color: status==='live' ? 'var(--grn)' : status==='error'?'var(--red)':'var(--txt3)'}}>
          {status==='live'?'● LIVE':status==='collecting'?'◌ ...':status==='error'?'● ERR':'● OFF'}
        </span>
      </div>
      <div className={styles.legend}>
        <span style={{color:'var(--grn)'}}>■ Bids</span>
        <span className={styles.legendCenter}>Intensité = Volume · Murs = liquidité</span>
        <span style={{color:'var(--red)'}}>■ Asks</span>
      </div>
      <div ref={wrapRef} className={styles.canvasWrap}>
        <canvas ref={canvasRef} className={styles.canvas}/>
      </div>
      <div className={styles.footer}>
        Binance depth20 · 30s · 100ms
      </div>
    </div>
  )
}
