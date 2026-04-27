import { useState, useRef, useEffect, useCallback } from 'react'
import { useStore } from '../../store'
import { fmtPx } from '../../lib/format'
import styles from './HarmonicScanner.module.css'

// ── Fibonacci Ratios ──────────────────────────────────────────────────────────
const FIB = {
  '0.236':0.236,'0.382':0.382,'0.500':0.500,'0.618':0.618,
  '0.707':0.707,'0.786':0.786,'0.886':0.886,'1.000':1.000,
  '1.130':1.130,'1.272':1.272,'1.414':1.414,'1.618':1.618,
  '2.000':2.000,'2.240':2.240,'2.618':2.618,'3.618':3.618,
}

// Tolerance for ratio matching
const TOL = 0.06

function near(val, target, tol = TOL) {
  return Math.abs(val - target) / target <= tol
}
function inRange(val, lo, hi, tol = TOL) {
  return val >= lo * (1 - tol) && val <= hi * (1 + tol)
}

// ── Pattern Definitions ───────────────────────────────────────────────────────
const PATTERNS = [
  {
    name: 'Gartley',
    color: '#7c3aed',
    emoji: '🔮',
    desc: 'Pattern classique de Gartley — retournement haute probabilité',
    check: (r) =>
      near(r.XAB, 0.618) &&
      inRange(r.ABC, 0.382, 0.886) &&
      inRange(r.BCD, 1.272, 1.618) &&
      near(r.XAD, 0.786),
  },
  {
    name: 'Bat',
    color: '#2563eb',
    emoji: '🦇',
    desc: 'Bat pattern — PRZ proche du 0.886 XA retracement',
    check: (r) =>
      inRange(r.XAB, 0.382, 0.500) &&
      inRange(r.ABC, 0.382, 0.886) &&
      inRange(r.BCD, 1.618, 2.618) &&
      near(r.XAD, 0.886),
  },
  {
    name: 'Butterfly',
    color: '#db2777',
    emoji: '🦋',
    desc: 'Butterfly — extension au-delà du point X, fort signal de retournement',
    check: (r) =>
      near(r.XAB, 0.786) &&
      inRange(r.ABC, 0.382, 0.886) &&
      inRange(r.BCD, 1.618, 2.618) &&
      inRange(r.XAD, 1.270, 1.618),
  },
  {
    name: 'Crab',
    color: '#dc2626',
    emoji: '🦀',
    desc: 'Crab — extension extrême 1.618 XA, pattern rare et précis',
    check: (r) =>
      inRange(r.XAB, 0.382, 0.618) &&
      inRange(r.ABC, 0.382, 0.886) &&
      inRange(r.BCD, 2.618, 3.618) &&
      near(r.XAD, 1.618),
  },
  {
    name: 'Deep Crab',
    color: '#991b1b',
    emoji: '🦞',
    desc: 'Deep Crab — variante avec retracement XAB plus profond',
    check: (r) =>
      near(r.XAB, 0.886) &&
      inRange(r.ABC, 0.382, 0.886) &&
      inRange(r.BCD, 2.000, 3.618) &&
      near(r.XAD, 1.618),
  },
  {
    name: 'Cypher',
    color: '#059669',
    emoji: '⚙️',
    desc: 'Cypher — pattern moderne, retracement D au 0.786 XC',
    check: (r) =>
      inRange(r.XAB, 0.382, 0.618) &&
      inRange(r.ABC, 1.130, 1.414) &&
      inRange(r.XCD, 1.272, 2.000) &&
      near(r.XAD, 0.786),
  },
  {
    name: 'Shark',
    color: '#d97706',
    emoji: '🦈',
    desc: 'Shark — pattern 5-0, structure unique à confirmation rapide',
    check: (r) =>
      inRange(r.XAB, 0.446, 0.618) &&
      inRange(r.ABC, 1.130, 1.618) &&
      inRange(r.BCD, 1.618, 2.240) &&
      near(r.XAD, 0.886),
  },
  {
    name: '5-0',
    color: '#0891b2',
    emoji: '5️⃣',
    desc: '5-0 — continuation pattern, AB = CD requis',
    check: (r) =>
      inRange(r.XAB, 1.130, 1.618) &&
      inRange(r.ABC, 1.618, 2.240) &&
      near(r.BCD, 0.500) &&
      near(r.XAD, 0.500),
  },
  {
    name: 'AB=CD',
    color: '#16a34a',
    emoji: '🔁',
    desc: 'AB=CD — pattern harmonique de base, legs symétriques',
    check: (r) =>
      inRange(r.ABC, 0.382, 0.886) &&
      inRange(r.BCD, 1.130, 2.618) &&
      near(r.ABCD_ratio, 1.000, 0.08),
  },
  {
    name: 'Three Drives',
    color: '#7c3aed',
    emoji: '3️⃣',
    desc: 'Three Drives — 3 extensions symétriques, épuisement de tendance',
    check: (r) =>
      inRange(r.ABC, 0.618, 0.618) &&
      inRange(r.BCD, 1.272, 1.272) &&
      near(r.ABCD_ratio, 1.000, 0.1),
  },
]

function calcRatios(X, A, B, C, D) {
  const XA = Math.abs(A - X)
  const AB = Math.abs(B - A)
  const BC = Math.abs(C - B)
  const CD = Math.abs(D - C)
  const XD = Math.abs(D - X)
  const XC = Math.abs(C - X)
  return {
    XAB: XA > 0 ? AB / XA : 0,
    ABC: AB > 0 ? BC / AB : 0,
    BCD: BC > 0 ? CD / BC : 0,
    XAD: XA > 0 ? XD / XA : 0,
    XCD: XC > 0 ? CD / XC : 0,
    ABCD_ratio: AB > 0 ? CD / AB : 0,
    XA, AB, BC, CD,
  }
}

function findSwings(candles, minDist = 3) {
  const swings = []
  const n = candles.length
  for (let i = minDist; i < n - minDist; i++) {
    const window = candles.slice(i - minDist, i + minDist + 1)
    const isHigh = candles[i].h === Math.max(...window.map(c => c.h))
    const isLow  = candles[i].l === Math.min(...window.map(c => c.l))
    if (isHigh && (!swings.length || swings[swings.length-1].type !== 'H'))
      swings.push({ idx: i, price: candles[i].h, type: 'H' })
    else if (isLow && (!swings.length || swings[swings.length-1].type !== 'L'))
      swings.push({ idx: i, price: candles[i].l, type: 'L' })
  }
  return swings
}

function detectHarmonics(candles, swings) {
  const results = []
  const S = swings

  // Need alternating X A B C D
  for (let xi = 0; xi < S.length - 4; xi++) {
    for (let ai = xi + 1; ai < S.length - 3; ai++) {
      if (S[ai].type === S[xi].type) continue
      for (let bi = ai + 1; bi < S.length - 2; bi++) {
        if (S[bi].type === S[ai].type) continue
        for (let ci = bi + 1; ci < S.length - 1; ci++) {
          if (S[ci].type === S[bi].type) continue
          for (let di = ci + 1; di < S.length; di++) {
            if (S[di].type === S[ci].type) continue

            const X = S[xi].price, A = S[ai].price
            const B = S[bi].price, C = S[ci].price, D = S[di].price

            const ratios = calcRatios(X, A, B, C, D)

            for (const pat of PATTERNS) {
              if (pat.check(ratios)) {
                const isBull = S[xi].type === 'H'
                const prz    = D
                // Targets based on Fibonacci projections from D
                const XA     = Math.abs(A - X)
                const t1 = isBull ? D + XA * 0.382 : D - XA * 0.382
                const t2 = isBull ? D + XA * 0.618 : D - XA * 0.618
                const sl = isBull ? D - XA * 0.236 : D + XA * 0.236

                // Quality score based on ratio precision
                const precision = 1 - (
                  Math.abs(ratios.XAB - 0.618) +
                  Math.abs(ratios.ABC - 0.618) +
                  Math.abs(ratios.BCD - 1.618)
                ) / 3
                const conf = Math.min(94, Math.round(72 + precision * 22))

                results.push({
                  pattern: pat.name,
                  color:   pat.color,
                  emoji:   pat.emoji,
                  desc:    pat.desc,
                  isBull,
                  type:    isBull ? 'bullish' : 'bearish',
                  points:  { X, A, B, C, D,
                    Xi: S[xi].idx, Ai: S[ai].idx,
                    Bi: S[bi].idx, Ci: S[ci].idx,
                    Di: S[di].idx },
                  ratios,
                  prz, target1: t1, target2: t2, stopLoss: sl,
                  conf,
                  rr: Math.abs(t1 - D) / Math.abs(sl - D),
                })
              }
            }
          }
        }
      }
    }
  }

  // Deduplicate by pattern name, keep highest conf
  const seen = {}
  return results
    .sort((a, b) => b.conf - a.conf)
    .filter(r => { if (seen[r.pattern]) return false; seen[r.pattern] = true; return true })
    .slice(0, 10)
}

// ── Chart Drawing ─────────────────────────────────────────────────────────────
function drawPattern(canvas, result, candles) {
  if (!canvas || !result) return
  const W = canvas.offsetWidth || 520
  const H = 300
  canvas.width  = W
  canvas.height = H

  const ctx = canvas.getContext('2d')

  // Background
  ctx.fillStyle = '#0a0a0d'
  ctx.fillRect(0, 0, W, H)

  // Grid
  ctx.strokeStyle = 'rgba(255,255,255,.04)'
  ctx.lineWidth = 1
  for (let i = 1; i < 8; i++) {
    const x = W * i / 8
    ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H - 20); ctx.stroke()
  }
  for (let i = 1; i < 5; i++) {
    const y = (H - 20) * i / 5
    ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke()
  }

  const { points, color, isBull, prz, target1, target2, stopLoss } = result
  const { X, A, B, C, D, Xi, Ai, Bi, Ci, Di } = points

  const padL = 5, padR = 90, padT = 20, padB = 30
  const chartW = W - padL - padR
  const chartH = H - padT - padB

  // Price range with padding
  const allPrices = [X, A, B, C, D, target2 || target1, stopLoss]
    .filter(Boolean)
  let minP = Math.min(...allPrices)
  let maxP = Math.max(...allPrices)
  const rangeP = maxP - minP
  minP -= rangeP * 0.08
  maxP += rangeP * 0.08

  // Index range
  const idxStart = Math.max(0, Xi - 3)
  const idxEnd   = Math.min(candles.length - 1, Di + 12)
  const rangeI   = idxEnd - idxStart

  const px = (price) => padT + chartH * (1 - (price - minP) / (maxP - minP))
  const ix  = (idx)  => padL + chartW * ((idx - idxStart) / rangeI)

  // Draw candles
  const cw = Math.max(2, chartW / rangeI * 0.7)
  for (let i = idxStart; i <= idxEnd; i++) {
    const c = candles[i]
    if (!c) continue
    const x  = ix(i)
    const yo = px(c.o), yc = px(c.c), yh = px(c.h), yl = px(c.l)
    const bull = c.c >= c.o
    const alpha = 0.45

    // Wick
    ctx.strokeStyle = bull ? `rgba(0,229,160,${alpha})` : `rgba(255,59,92,${alpha})`
    ctx.lineWidth = 1
    ctx.beginPath(); ctx.moveTo(x, yh); ctx.lineTo(x, yl); ctx.stroke()

    // Body
    ctx.fillStyle = bull ? `rgba(0,229,160,${alpha})` : `rgba(255,59,92,${alpha})`
    const by = Math.min(yo, yc), bh = Math.max(1, Math.abs(yc - yo))
    ctx.fillRect(x - cw/2, by, cw, bh)
  }

  // ── PRZ Zone (shaded) ──
  const przY = px(prz)
  ctx.fillStyle = color + '18'
  ctx.fillRect(ix(Di) - 8, przY - 12, W - ix(Di) + 8, 24)
  ctx.strokeStyle = color + '55'
  ctx.lineWidth = 1
  ctx.setLineDash([2, 4])
  ctx.beginPath()
  ctx.moveTo(ix(Di) - 8, przY)
  ctx.lineTo(W - padR + 8, przY)
  ctx.stroke()
  ctx.setLineDash([])

  // ── Target lines ──
  const drawTarget = (price, label, clr) => {
    const y = px(price)
    ctx.strokeStyle = clr
    ctx.lineWidth = 1
    ctx.setLineDash([4, 4])
    ctx.beginPath()
    ctx.moveTo(ix(Di), y)
    ctx.lineTo(W - padR + 40, y)
    ctx.stroke()
    ctx.setLineDash([])
    // Label background
    ctx.fillStyle = clr
    ctx.fillRect(W - padR + 42, y - 8, padR - 46, 16)
    ctx.fillStyle = '#000'
    ctx.font = 'bold 8px monospace'
    ctx.textAlign = 'center'
    ctx.fillText(label, W - padR + 42 + (padR - 46) / 2, y + 3)
    // Price
    ctx.fillStyle = clr
    ctx.font = '8px monospace'
    ctx.textAlign = 'left'
    ctx.fillText(fmtPx(price), W - padR + 44, y - 10)
  }

  if (target2) drawTarget(target2, 'TP2', '#16a34a')
  if (target1) drawTarget(target1, 'TP1', '#22c55e')
  if (stopLoss) drawTarget(stopLoss, ' SL ', '#ef4444')

  // ── Pattern lines XABCD ──
  const pts = [
    { l:'X', p:X, i:Xi },
    { l:'A', p:A, i:Ai },
    { l:'B', p:B, i:Bi },
    { l:'C', p:C, i:Ci },
    { l:'D', p:D, i:Di },
  ]

  // Shadow glow
  ctx.shadowColor = color
  ctx.shadowBlur  = 6

  // Lines
  ctx.strokeStyle = color
  ctx.lineWidth   = 2.5
  ctx.lineJoin    = 'round'
  ctx.setLineDash([])
  ctx.beginPath()
  pts.forEach((pt, j) => {
    const x = ix(pt.i), y = px(pt.p)
    j === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y)
  })
  ctx.stroke()

  // XD diagonal (pattern boundary)
  ctx.strokeStyle = color + '30'
  ctx.lineWidth   = 1
  ctx.setLineDash([3, 5])
  ctx.shadowBlur  = 0
  ctx.beginPath()
  ctx.moveTo(ix(Xi), px(X))
  ctx.lineTo(ix(Di), px(D))
  ctx.stroke()
  ctx.setLineDash([])

  // ── Point Labels ──
  ctx.shadowBlur = 0
  pts.forEach((pt, j) => {
    const x = ix(pt.i), y = px(pt.p)
    const above = y > H / 2

    // Circle
    ctx.fillStyle = color
    ctx.beginPath()
    ctx.arc(x, y, 10, 0, Math.PI * 2)
    ctx.fill()

    // Border
    ctx.strokeStyle = '#000'
    ctx.lineWidth   = 1.5
    ctx.beginPath()
    ctx.arc(x, y, 10, 0, Math.PI * 2)
    ctx.stroke()

    // Letter
    ctx.fillStyle   = '#fff'
    ctx.font        = 'bold 10px monospace'
    ctx.textAlign   = 'center'
    ctx.fillText(pt.l, x, y + 4)

    // Price tag
    ctx.fillStyle   = 'rgba(255,255,255,.65)'
    ctx.font        = '8px monospace'
    ctx.fillText(fmtPx(pt.p), x, above ? y - 14 : y + 22)
  })

  // ── Price axis ──
  ctx.fillStyle = 'rgba(255,255,255,.3)'
  ctx.font      = '8px monospace'
  ctx.textAlign = 'right'
  for (let i = 0; i <= 4; i++) {
    const p = minP + (maxP - minP) * (i / 4)
    const y = px(p)
    ctx.fillText(fmtPx(p), W - padR + 36, y + 3)
  }

  // ── Pattern label ──
  ctx.fillStyle = color
  ctx.font      = 'bold 11px monospace'
  ctx.textAlign = 'left'
  ctx.fillText(`${result.emoji} ${result.pattern}  ${result.type === 'bullish' ? '↑ Bullish' : '↓ Bearish'}  ${result.conf}%`, padL + 8, padT + 14)
}

// ── Main Component ────────────────────────────────────────────────────────────
const PAIRS   = ['BTCUSDT','ETHUSDT','SOLUSDT','BNBUSDT','XRPUSDT','ARBUSDT','LINKUSDT','AVAXUSDT']
const TFS     = ['1h','4h','1d']

export function HarmonicScanner() {
  const setPair = useStore(s => s.setPair)

  const [results, setResults]   = useState([])
  const [scanning, setScanning] = useState(false)
  const [tf, setTf]             = useState('4h')
  const [progress, setProgress] = useState(0)
  const [selected, setSelected] = useState(null)
  const [filter, setFilter]     = useState('all')
  const canvasRef = useRef(null)

  const scan = async () => {
    setScanning(true); setResults([]); setProgress(0); setSelected(null)
    const all = []

    for (let i = 0; i < PAIRS.length; i++) {
      setProgress(Math.round(i / PAIRS.length * 100))
      try {
        const r = await fetch(
          `https://api.binance.com/api/v3/klines?symbol=${PAIRS[i]}&interval=${tf}&limit=200`
        )
        const data = await r.json()
        if (!Array.isArray(data)) continue
        const candles = data.map(d => ({
          t:+d[0], o:+d[1], h:+d[2], l:+d[3], c:+d[4]
        }))
        const swings   = findSwings(candles, 3)
        const patterns = detectHarmonics(candles, swings)
        patterns.forEach(p => all.push({
          ...p, pair: PAIRS[i], lastPrice: candles[candles.length - 1].c, candles
        }))
      } catch(_) {}
    }

    all.sort((a, b) => b.conf - a.conf)
    setResults(all)
    setProgress(100)
    setScanning(false)
  }

  // Redraw when selection changes
  useEffect(() => {
    if (!selected || !canvasRef.current) return
    // Wait for canvas to be in DOM
    requestAnimationFrame(() => {
      drawPattern(canvasRef.current, selected, selected.candles)
    })
  }, [selected])

  const handleSelect = (r) => {
    setSelected(r)
    setPair(r.pair)
  }

  const filtered = filter === 'all' ? results
    : results.filter(r => r.type === filter)

  return (
    <div className={styles.wrap}>

      {/* Header */}
      <div className={styles.header}>
        <span className={styles.title}>🦋 Harmonic Patterns</span>
        <div className={styles.controls}>
          <div className={styles.tfRow}>
            {TFS.map(t => (
              <button key={t}
                className={styles.tfBtn + (tf === t ? ' ' + styles.tfOn : '')}
                onClick={() => setTf(t)}
              >{t}</button>
            ))}
          </div>
          <button className={styles.scanBtn} onClick={scan} disabled={scanning}>
            {scanning ? progress + '%' : '⚡ Scanner'}
          </button>
        </div>
      </div>

      {/* Progress */}
      {scanning && (
        <div className={styles.prog}>
          <div className={styles.progFill} style={{ width: progress + '%' }}/>
        </div>
      )}

      {/* Pattern legend */}
      <div className={styles.legend}>
        {PATTERNS.map(p => (
          <span key={p.name} className={styles.legItem}
            style={{ borderColor: p.color + '88', color: p.color, background: p.color + '12' }}>
            {p.emoji} {p.name}
          </span>
        ))}
      </div>

      {/* Chart projection */}
      {selected && (
        <div className={styles.chartWrap}>
          <div className={styles.chartTop}>
            <div className={styles.chartInfo}>
              <span className={styles.chartPat} style={{ color: selected.color }}>
                {selected.emoji} {selected.pattern}
              </span>
              <span className={styles.chartDir}
                style={{ color: selected.type === 'bullish' ? 'var(--grn)' : 'var(--red)' }}>
                {selected.type === 'bullish' ? '↑ Bullish' : '↓ Bearish'}
              </span>
              <span className={styles.chartPair}>{selected.pair.replace('USDT', '/USDT')}</span>
              <span className={styles.chartConf}>{selected.conf}% · R/R {selected.rr?.toFixed(1)}x</span>
            </div>
            <div className={styles.chartRatios}>
              {Object.entries(selected.ratios)
                .filter(([k]) => ['XAB','ABC','BCD','XAD'].includes(k))
                .map(([k, v]) => (
                  <span key={k} className={styles.ratio}>
                    <span className={styles.ratioK}>{k}</span>
                    {(+v).toFixed(3)}
                  </span>
                ))}
            </div>
            <button className={styles.closeBtn} onClick={() => setSelected(null)}>✕</button>
          </div>

          <canvas ref={canvasRef} className={styles.canvas}/>

          <div className={styles.chartFooter}>
            <div className={styles.przInfo}>
              <span style={{ color: selected.color }}>PRZ {fmtPx(selected.prz)}</span>
              <span style={{ color: '#22c55e' }}>TP1 {fmtPx(selected.target1)}</span>
              <span style={{ color: '#16a34a' }}>TP2 {fmtPx(selected.target2)}</span>
              <span style={{ color: '#ef4444' }}>SL {fmtPx(selected.stopLoss)}</span>
            </div>
            <div className={styles.patDesc}>{selected.desc}</div>
          </div>
        </div>
      )}

      {/* Empty state */}
      {!scanning && results.length === 0 && (
        <div className={styles.empty}>
          <div className={styles.emptyEmoji}>🦋</div>
          <div className={styles.emptyTitle}>{PATTERNS.length} patterns harmoniques détectables</div>
          <div className={styles.emptyList}>
            {PATTERNS.map(p => (
              <span key={p.name} style={{ color: p.color }}>{p.emoji} {p.name}</span>
            ))}
          </div>
          <div className={styles.emptyHint}>
            Cliquer sur un résultat → projection graphique avec XABCD + PRZ + TP + SL
          </div>
        </div>
      )}

      {/* Filter + results */}
      {results.length > 0 && (
        <div className={styles.filterRow}>
          {[['all','Tous'],['bullish','↑ Bullish'],['bearish','↓ Bearish']].map(([id, lbl]) => (
            <button key={id}
              className={styles.fBtn + (filter === id ? ' ' + styles.fOn : '')}
              onClick={() => setFilter(id)}
            >{lbl}</button>
          ))}
          <span className={styles.count}>{filtered.length} pattern{filtered.length > 1 ? 's' : ''}</span>
        </div>
      )}

      <div className={styles.list}>
        {filtered.map((r, i) => (
          <div key={i}
            className={styles.row + (selected === r ? ' ' + styles.rowSel : '')}
            style={selected === r ? { borderLeft: '3px solid ' + r.color } : {}}
            onClick={() => handleSelect(r)}
          >
            <div className={styles.rowL}>
              <div className={styles.patDot}
                style={{ background: r.color + '22', color: r.color, border: '1px solid ' + r.color + '55' }}>
                {r.emoji}
              </div>
              <div>
                <div className={styles.patName} style={{ color: r.color }}>{r.pattern}</div>
                <div className={styles.patSub}>{r.pair.replace('USDT','/USDT')} · {tf}</div>
              </div>
            </div>
            <div className={styles.rowMid}>
              <span className={styles.patDir}
                style={{ color: r.type === 'bullish' ? 'var(--grn)' : 'var(--red)' }}>
                {r.type === 'bullish' ? '↑' : '↓'}
              </span>
              <span className={styles.patRR}>R/R {r.rr?.toFixed(1)}x</span>
            </div>
            <div className={styles.rowR}>
              <div className={styles.confBar}>
                <div className={styles.confFill}
                  style={{ width: r.conf + '%', background: r.color }}/>
              </div>
              <span className={styles.confVal}>{r.conf}%</span>
            </div>
          </div>
        ))}
      </div>

      <div className={styles.footer}>
        Ratios Fibonacci · {PAIRS.length} paires · Binance · Cliquer = projection graphique
      </div>
    </div>
  )
}
