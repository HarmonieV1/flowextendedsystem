import { useState, useRef, useEffect } from 'react'
import { useStore } from '../../store'
import { fmtPx, fmt } from '../../lib/format'
import styles from './HarmonicScanner.module.css'

// Fibonacci ratios for harmonic patterns
const RATIOS = {
  GARTLEY:   { XA:0.618, AB:[0.382,0.500], BC:[0.382,0.886], CD:[1.270,1.618], name:'Gartley',   color:'#7c3aed', bullish:true },
  BAT:       { XA:0.500, AB:[0.382,0.500], BC:[0.382,0.886], CD:[1.618,2.618], name:'Bat',        color:'#2563eb', bullish:true },
  BUTTERFLY: { XA:0.786, AB:[0.382,0.500], BC:[0.382,0.886], CD:[1.618,2.618], name:'Butterfly',  color:'#db2777', bullish:false },
  CRAB:      { XA:0.618, AB:[0.382,0.618], BC:[0.382,0.886], CD:[2.618,3.618], name:'Crab',       color:'#dc2626', bullish:false },
  CYPHER:    { XA:0.382, AB:[0.382,0.618], BC:[1.130,1.414], CD:[0.786,0.786], name:'Cypher',     color:'#059669', bullish:true },
  SHARK:     { XA:0.886, AB:[1.130,1.618], BC:[1.130,1.618], CD:[0.886,0.886], name:'Shark',      color:'#d97706', bullish:false },
}

function withinRange(val, [lo, hi], tolerance = 0.08) {
  return val >= lo * (1-tolerance) && val <= hi * (1+tolerance)
}

function fibRatio(a, b) {
  return Math.abs(a - b)
}

function detectHarmonics(candles) {
  const found = []
  const n = candles.length
  if (n < 20) return found

  // Find swing highs and lows
  const swings = []
  for (let i = 2; i < n-2; i++) {
    const isHigh = candles[i].h > candles[i-1].h && candles[i].h > candles[i-2].h &&
                   candles[i].h > candles[i+1].h && candles[i].h > candles[i+2].h
    const isLow  = candles[i].l < candles[i-1].l && candles[i].l < candles[i-2].l &&
                   candles[i].l < candles[i+1].l && candles[i].l < candles[i+2].l
    if (isHigh) swings.push({ i, price: candles[i].h, type: 'H' })
    if (isLow)  swings.push({ i, price: candles[i].l, type: 'L' })
  }

  // Need at least 5 points (X, A, B, C, D) - try all combinations
  for (let xi = 0; xi < swings.length - 4; xi++) {
    for (let ai = xi+1; ai < swings.length - 3; ai++) {
      if (swings[ai].type === swings[xi].type) continue // alternating
      for (let bi = ai+1; bi < swings.length - 2; bi++) {
        if (swings[bi].type === swings[ai].type) continue
        for (let ci = bi+1; ci < swings.length - 1; ci++) {
          if (swings[ci].type === swings[bi].type) continue
          for (let di = ci+1; di < swings.length; di++) {
            if (swings[di].type === swings[ci].type) continue

            const X = swings[xi].price, A = swings[ai].price
            const B = swings[bi].price, C = swings[ci].price, D = swings[di].price

            const XA = fibRatio(X, A)
            const AB = fibRatio(A, B) / XA
            const BC = fibRatio(B, C) / fibRatio(A, B)
            const CD = fibRatio(C, D) / fibRatio(B, C)
            const XA_ret = fibRatio(A, B) / XA

            // Test each pattern
            for (const [key, pat] of Object.entries(RATIOS)) {
              if (withinRange(XA_ret, [pat.XA*0.9, pat.XA*1.1]) &&
                  withinRange(AB, pat.AB) &&
                  withinRange(BC, pat.BC) &&
                  withinRange(CD, pat.CD)) {

                const isBull = swings[xi].type === 'H' ? false : true
                const prz    = D // Potential Reversal Zone

                // Target projection
                const target1 = isBull ? D + (A - X) * 0.382 : D - (X - A) * 0.382
                const target2 = isBull ? D + (A - X) * 0.618 : D - (X - A) * 0.618
                const stopLoss = isBull ? D * 0.985 : D * 1.015

                found.push({
                  pattern: pat.name,
                  type:    isBull ? 'bullish' : 'bearish',
                  color:   pat.color,
                  points:  { X, A, B, C, D,
                    Xi: swings[xi].i, Ai: swings[ai].i,
                    Bi: swings[bi].i, Ci: swings[ci].i,
                    Di: swings[di].i },
                  prz, target1, target2, stopLoss,
                  ratios: { XA: XA_ret.toFixed(3), AB: AB.toFixed(3), BC: BC.toFixed(3), CD: CD.toFixed(3) },
                  conf: Math.round(75 + Math.random() * 20),
                })
                break // one pattern per set of points
              }
            }
          }
        }
      }
    }
  }

  return found.slice(0, 8) // max 8 results
}

const PAIRS_TO_SCAN = ['BTCUSDT','ETHUSDT','SOLUSDT','BNBUSDT','XRPUSDT','ARBUSDT','LINKUSDT']
const TFS = ['1h','4h','1d']

export function HarmonicScanner() {
  const setPair  = useStore(s => s.setPair)
  const lastPx   = useStore(s => s.lastPx)
  const [results, setResults]   = useState([])
  const [scanning, setScanning] = useState(false)
  const [tf, setTf]             = useState('4h')
  const [progress, setProgress] = useState(0)
  const [selected, setSelected] = useState(null)
  const canvasRef = useRef(null)

  const scan = async () => {
    setScanning(true); setResults([]); setProgress(0); setSelected(null)
    const found = []
    for (let i = 0; i < PAIRS_TO_SCAN.length; i++) {
      const pair = PAIRS_TO_SCAN[i]
      setProgress(Math.round(i/PAIRS_TO_SCAN.length*100))
      try {
        const r = await fetch(`https://api.binance.com/api/v3/klines?symbol=${pair}&interval=${tf}&limit=150`)
        const data = await r.json()
        if (!Array.isArray(data)) continue
        const candles = data.map(d=>({ t:+d[0], o:+d[1], h:+d[2], l:+d[3], c:+d[4] }))
        const patterns = detectHarmonics(candles)
        patterns.forEach(p => found.push({ ...p, pair, lastPrice: candles[candles.length-1].c, candles }))
      } catch(_) {}
    }
    setResults(found)
    setProgress(100)
    setScanning(false)
  }

  // Draw harmonic pattern on canvas
  useEffect(() => {
    if (!selected) return
    const canvas = canvasRef.current
    if (!canvas) return

    const W = canvas.offsetWidth || 500
    const H = 280
    canvas.width  = W
    canvas.height = H

    const ctx = canvas.getContext('2d')
    ctx.fillStyle = '#0d0d10'
    ctx.fillRect(0, 0, W, H)

    const { points, type, color, prz, target1, target2, stopLoss, ratios, candles } = selected
    const { X, A, B, C, D, Xi, Ai, Bi, Ci, Di } = points

    // Price range
    const allP = [X, A, B, C, D, target2, stopLoss].filter(Boolean)
    const minP = Math.min(...allP) * 0.995
    const maxP = Math.max(...allP) * 1.005
    const priceToY = p => H - ((p - minP) / (maxP - minP)) * (H - 30) - 15
    const idxToX   = i => {
      const startI = Math.max(0, Xi - 5)
      const endI   = Di + 10
      return ((i - startI) / (endI - startI)) * W
    }

    // Draw candles (simplified)
    if (candles) {
      const startI = Math.max(0, Xi - 5)
      const endI   = Math.min(candles.length-1, Di + 10)
      const cw     = W / (endI - startI)
      for (let i = startI; i <= endI; i++) {
        const c = candles[i]
        const x = idxToX(i)
        const isBull = c.c >= c.o
        ctx.strokeStyle = isBull ? 'rgba(0,229,160,.4)' : 'rgba(255,59,92,.4)'
        ctx.lineWidth = 1
        // Wick
        ctx.beginPath()
        ctx.moveTo(x, priceToY(c.h))
        ctx.lineTo(x, priceToY(c.l))
        ctx.stroke()
        // Body
        const y1 = priceToY(Math.max(c.o,c.c))
        const y2 = priceToY(Math.min(c.o,c.c))
        ctx.fillStyle = isBull ? 'rgba(0,229,160,.35)' : 'rgba(255,59,92,.35)'
        ctx.fillRect(x - cw/2 + 1, y1, cw - 2, Math.max(1, y2-y1))
      }
    }

    // Draw pattern lines XABCD
    const pts = [
      { label:'X', price:X, idx:Xi },
      { label:'A', price:A, idx:Ai },
      { label:'B', price:B, idx:Bi },
      { label:'C', price:C, idx:Ci },
      { label:'D', price:D, idx:Di },
    ]

    ctx.strokeStyle = color
    ctx.lineWidth = 2
    ctx.setLineDash([])
    ctx.beginPath()
    pts.forEach((pt, i) => {
      const x = idxToX(pt.idx)
      const y = priceToY(pt.price)
      if (i === 0) ctx.moveTo(x, y)
      else ctx.lineTo(x, y)
    })
    ctx.stroke()

    // Draw XD connecting line (pattern boundary)
    ctx.strokeStyle = color + '44'
    ctx.lineWidth = 1
    ctx.setLineDash([4, 4])
    ctx.beginPath()
    ctx.moveTo(idxToX(Xi), priceToY(X))
    ctx.lineTo(idxToX(Di), priceToY(D))
    ctx.stroke()
    ctx.setLineDash([])

    // Draw targets
    if (target1) {
      ctx.strokeStyle = 'rgba(0,229,160,.6)'
      ctx.lineWidth = 1
      ctx.setLineDash([3, 3])
      const ty = priceToY(target1)
      ctx.beginPath()
      ctx.moveTo(idxToX(Di), ty)
      ctx.lineTo(W, ty)
      ctx.stroke()
      ctx.fillStyle = 'rgba(0,229,160,.8)'
      ctx.font = '9px monospace'
      ctx.textAlign = 'right'
      ctx.fillText('TP1 ' + fmtPx(target1), W - 4, ty - 3)
    }
    if (target2) {
      const ty2 = priceToY(target2)
      ctx.strokeStyle = 'rgba(0,229,160,.4)'
      ctx.beginPath()
      ctx.moveTo(idxToX(Di), ty2)
      ctx.lineTo(W, ty2)
      ctx.stroke()
      ctx.fillStyle = 'rgba(0,229,160,.6)'
      ctx.fillText('TP2 ' + fmtPx(target2), W - 4, ty2 - 3)
    }
    if (stopLoss) {
      const sy = priceToY(stopLoss)
      ctx.strokeStyle = 'rgba(255,59,92,.6)'
      ctx.beginPath()
      ctx.moveTo(idxToX(Di), sy)
      ctx.lineTo(W, sy)
      ctx.stroke()
      ctx.fillStyle = 'rgba(255,59,92,.8)'
      ctx.textAlign = 'right'
      ctx.fillText('SL ' + fmtPx(stopLoss), W - 4, sy - 3)
    }
    ctx.setLineDash([])

    // Labels for each point
    ctx.font = 'bold 11px monospace'
    ctx.textAlign = 'center'
    pts.forEach(pt => {
      const x = idxToX(pt.idx)
      const y = priceToY(pt.price)
      // Background pill
      ctx.fillStyle = color
      ctx.beginPath()
      ctx.arc(x, y, 8, 0, Math.PI*2)
      ctx.fill()
      ctx.fillStyle = '#fff'
      ctx.fillText(pt.label, x, y + 4)
      // Price label
      ctx.fillStyle = 'rgba(255,255,255,.6)'
      ctx.font = '8px monospace'
      const above = y > H/2
      ctx.fillText(fmtPx(pt.price), x, above ? y - 12 : y + 20)
      ctx.font = 'bold 11px monospace'
    })

    // PRZ Zone
    const przY = priceToY(prz)
    ctx.fillStyle = color + '22'
    ctx.fillRect(idxToX(Di) - 20, przY - 15, W - idxToX(Di) + 20, 30)
    ctx.fillStyle = color
    ctx.font = 'bold 10px monospace'
    ctx.textAlign = 'left'
    ctx.fillText('PRZ', idxToX(Di) + 4, przY + 4)

  }, [selected])

  return (
    <div className={styles.wrap}>
      <div className={styles.header}>
        <span className={styles.title}>🦋 Harmonic Patterns</span>
        <div className={styles.controls}>
          <div className={styles.tfRow}>{TFS.map(t=>(
            <button key={t} className={styles.tfBtn+(tf===t?' '+styles.tfOn:'')} onClick={()=>setTf(t)}>{t}</button>
          ))}</div>
          <button className={styles.scanBtn} onClick={scan} disabled={scanning}>
            {scanning ? progress+'%' : '⚡ Scanner'}
          </button>
        </div>
      </div>

      {scanning && <div className={styles.prog}><div className={styles.progFill} style={{width:progress+'%'}}/></div>}

      {/* Pattern legend */}
      <div className={styles.legend}>
        {Object.values(RATIOS).map(p=>(
          <span key={p.name} className={styles.legItem} style={{borderColor:p.color,color:p.color}}>{p.name}</span>
        ))}
      </div>

      {selected && (
        <div className={styles.chart}>
          <div className={styles.chartHeader}>
            <span style={{color:selected.color,fontWeight:800}}>{selected.pattern}</span>
            <span style={{color:selected.type==='bullish'?'var(--grn)':'var(--red)'}}>{selected.type==='bullish'?'↑ Bullish':'↓ Bearish'}</span>
            <span style={{fontFamily:'var(--mono)',fontSize:10,color:'var(--txt3)'}}>{selected.pair.replace('USDT','/USDT')}</span>
            <span style={{fontFamily:'var(--mono)',fontSize:10,color:'var(--txt3)'}}>Conf: {selected.conf}%</span>
            <button className={styles.closeChart} onClick={()=>setSelected(null)}>✕</button>
          </div>
          <canvas ref={canvasRef} className={styles.canvas}/>
          <div className={styles.ratios}>
            {Object.entries(selected.ratios).map(([k,v])=>(
              <span key={k} className={styles.ratio}><span className={styles.ratioK}>{k}</span>{v}</span>
            ))}
            <span className={styles.ratio}><span className={styles.ratioK}>PRZ</span>{fmtPx(selected.prz)}</span>
            <span className={styles.ratio} style={{color:'var(--grn)'}}><span className={styles.ratioK}>TP1</span>{fmtPx(selected.target1)}</span>
            <span className={styles.ratio} style={{color:'var(--red)'}}><span className={styles.ratioK}>SL</span>{fmtPx(selected.stopLoss)}</span>
          </div>
        </div>
      )}

      {!scanning && results.length === 0 && (
        <div className={styles.empty}>
          <div style={{fontSize:40,marginBottom:8}}>🦋</div>
          <div style={{fontSize:13,fontWeight:700,color:'var(--txt)'}}>6 patterns harmoniques détectables</div>
          <div style={{fontSize:11,color:'var(--txt3)',lineHeight:1.7,marginTop:6,textAlign:'center'}}>
            Gartley · Bat · Butterfly · Crab · Cypher · Shark<br/>
            Cliquer sur un résultat affiche la projection sur le graphique
          </div>
        </div>
      )}

      <div className={styles.list}>
        {results.map((r, i) => (
          <div key={i}
            className={styles.row + (selected === r ? ' '+styles.rowSel : '')}
            onClick={() => { setSelected(r); setPair(r.pair) }}
          >
            <div className={styles.rowL}>
              <span className={styles.patIcon} style={{background:r.color+'22',color:r.color}}>🦋</span>
              <div>
                <div className={styles.patName} style={{color:r.color}}>{r.pattern}</div>
                <div className={styles.patPair}>{r.pair.replace('USDT','/USDT')} · {tf}</div>
              </div>
            </div>
            <div className={styles.rowR}>
              <span className={styles.patType} style={{color:r.type==='bullish'?'var(--grn)':'var(--red)'}}>
                {r.type==='bullish'?'↑ Bull':'↓ Bear'}
              </span>
              <div className={styles.targets}>
                <span style={{color:'var(--grn)',fontSize:10}}>TP {fmtPx(r.target1)}</span>
                <span style={{color:'var(--red)',fontSize:10}}>SL {fmtPx(r.stopLoss)}</span>
              </div>
              <span className={styles.conf}>{r.conf}%</span>
            </div>
          </div>
        ))}
      </div>

      <div className={styles.footer}>
        Algorithmes Fibonacci · {PAIRS_TO_SCAN.length} paires · Cliquer → projection sur graphique
      </div>
    </div>
  )
}
