import { useEffect, useRef, useState } from 'react'
import { useStore } from '../../store'
import { fmtPx, fmtVol } from '../../lib/format'
import styles from './MultiView.module.css'

const AVAILABLE_PAIRS = ['BTCUSDT','ETHUSDT','SOLUSDT','BNBUSDT','XRPUSDT','DOGEUSDT','ADAUSDT','AVAXUSDT']

export function MultiView() {
  const tilePairs = useStore(s => s.tilePairs)
  const setTilePair = useStore(s => s.setTilePair)
  const setPair = useStore(s => s.setPair)
  const setView = useStore(s => s.setView)
  const [pickingSlot, setPickingSlot] = useState(null)

  const handleTileClick = (i) => {
    const p = tilePairs[i]
    if (!p) return
    setPair(p)
    setView('single')
  }

  return (
    <>
      <div className={styles.grid}>
        {[0,1,2,3].map(i => {
          const p = tilePairs[i]
          return p
            ? <Tile key={i} pair={p} onClick={() => handleTileClick(i)} />
            : (
              <div key={i} className={styles.addTile} onClick={() => setPickingSlot(i)}>
                <span className={styles.addIcon}>+</span>
                <span className={styles.addLbl}>Add pair</span>
              </div>
            )
        })}
      </div>

      {/* Pair picker modal */}
      {pickingSlot !== null && (
        <div className={styles.modalBg} onClick={() => setPickingSlot(null)}>
          <div className={styles.modal} onClick={e => e.stopPropagation()}>
            <div className={styles.mTitle}>Add pair</div>
            <div className={styles.mSub}>Select a market to watch</div>
            <div className={styles.pairGrid}>
              {AVAILABLE_PAIRS.map(p => (
                <button
                  key={p}
                  className={styles.pairOpt}
                  onClick={() => { setTilePair(pickingSlot, p); setPickingSlot(null) }}
                >
                  {p.replace('USDT', '/USDT')}
                </button>
              ))}
            </div>
            <button className={styles.cancel} onClick={() => setPickingSlot(null)}>Cancel</button>
          </div>
        </div>
      )}
    </>
  )
}

function Tile({ pair, onClick }) {
  const [px, setPx] = useState(0)
  const [prevPxVal, setPrevPx] = useState(0)
  const [chg, setChg] = useState(0)
  const [hi, setHi] = useState(0)
  const [lo, setLo] = useState(0)
  const [vol, setVol] = useState(0)
  const [spread, setSpread] = useState(0)
  const [klines, setKlines] = useState([])

  const cvs = useRef(null)
  const wrap = useRef(null)
  const wsTicker = useRef(null)
  const wsKline = useRef(null)
  const wsDepth = useRef(null)

  useEffect(() => {
    const sym = pair.toLowerCase()
    const B = 'wss://stream.binance.com:9443/ws/'

    // Fetch kline history
    fetch(`https://api.binance.com/api/v3/klines?symbol=${pair}&interval=1h&limit=60`)
      .then(r => r.json())
      .then(raw => {
        if (!Array.isArray(raw)) return
        const candles = raw.map(r => ({
          t: r[0], o: parseFloat(r[1]), h: parseFloat(r[2]),
          l: parseFloat(r[3]), c: parseFloat(r[4]), v: parseFloat(r[5])
        })).filter(c => isFinite(c.c))
        setKlines(candles)
      }).catch(() => {})

    // Ticker WS
    const ticker = new WebSocket(B + sym + '@ticker')
    wsTicker.current = ticker
    ticker.onmessage = e => {
      try {
        const d = JSON.parse(e.data)
        const p = parseFloat(d.c)
        if (!isFinite(p)) return
        setPx(prev => { setPrevPx(prev); return p })
        setChg(parseFloat(d.P))
        setHi(parseFloat(d.h))
        setLo(parseFloat(d.l))
        setVol(parseFloat(d.q))
      } catch (_) {}
    }

    // Kline WS
    const kline = new WebSocket(B + sym + '@kline_1h')
    wsKline.current = kline
    kline.onmessage = e => {
      try {
        const k = JSON.parse(e.data).k
        const c = { t: k.t, o: parseFloat(k.o), h: parseFloat(k.h), l: parseFloat(k.l), c: parseFloat(k.c), v: parseFloat(k.v) }
        if (!isFinite(c.c)) return
        setKlines(prev => {
          const arr = [...prev]
          if (arr.length && arr[arr.length - 1].t === c.t) arr[arr.length - 1] = c
          else { arr.push(c); if (arr.length > 80) arr.shift() }
          return arr
        })
      } catch (_) {}
    }

    // BookTicker for spread
    const depth = new WebSocket(B + sym + '@bookTicker')
    wsDepth.current = depth
    depth.onmessage = e => {
      try {
        const d = JSON.parse(e.data)
        const bid = parseFloat(d.b), ask = parseFloat(d.a)
        if (isFinite(bid) && isFinite(ask) && bid > 0) setSpread((ask - bid) / bid * 100)
      } catch (_) {}
    }

    return () => {
      [ticker, kline, depth].forEach(ws => {
        ws.onclose = null
        try { ws.close() } catch (_) {}
      })
    }
  }, [pair])

  // Draw tile chart
  useEffect(() => {
    if (!cvs.current || klines.length < 2) return
    const W = cvs.current.width, H = cvs.current.height
    if (W < 10 || H < 10) return
    const data = klines
    const maxP = Math.max(...data.map(d => d.h))
    const minP = Math.min(...data.map(d => d.l))
    const range = maxP - minP
    if (!isFinite(range) || range <= 0) return

    const ctx = cvs.current.getContext('2d')
    ctx.clearRect(0, 0, W, H)
    const PAD = { t: 3, b: 3, l: 2, r: 2 }
    const cW = W - PAD.l - PAD.r, cH = H - PAD.t - PAD.b
    const margin = range * 0.05
    const lo = minP - margin, hi = maxP + margin, span = hi - lo
    const toY = p => PAD.t + cH - ((p - lo) / span) * cH
    const toX = i => PAD.l + (i + 0.5) * (cW / data.length)
    const bw = Math.min(12, Math.max(1, Math.floor(cW / data.length) - 1))

    data.forEach((d, i) => {
      const x = toX(i)
      const oY = toY(d.o), cY = toY(d.c), hY = toY(d.h), lY = toY(d.l)
      const bull = d.c >= d.o, col = bull ? '#00e5a0' : '#ff3b5c'
      ctx.strokeStyle = col; ctx.lineWidth = 1
      ctx.beginPath(); ctx.moveTo(x, hY); ctx.lineTo(x, lY); ctx.stroke()
      ctx.fillStyle = col
      ctx.fillRect(x - bw / 2, Math.min(oY, cY), bw, Math.max(1, Math.abs(cY - oY)))
    })
  }, [klines])

  // Size canvas
  useEffect(() => {
    if (!wrap.current || !cvs.current) return
    const ro = new ResizeObserver(() => {
      const r = wrap.current?.getBoundingClientRect()
      if (!r || r.width < 10 || r.height < 10) return
      cvs.current.width = Math.floor(r.width)
      cvs.current.height = Math.floor(r.height)
    })
    ro.observe(wrap.current)
    return () => ro.disconnect()
  }, [])

  const dir = px > prevPxVal ? 'up' : px < prevPxVal ? 'dn' : ''

  return (
    <div className={styles.tile} onClick={onClick}>
      <div className={styles.tileHdr}>
        <span className={styles.tilePair}>{pair.replace('USDT', '/USDT')}</span>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span className={`${styles.tilePx} ${styles[dir]}`}>{fmtPx(px)}</span>
          <span className={`${styles.tileChg} ${chg >= 0 ? styles.pos : styles.neg}`}>
            {chg > 0 ? '+' : ''}{chg.toFixed(2)}%
          </span>
        </div>
      </div>
      <div className={styles.tileStats}>
        <TileStat label="High" value={fmtPx(hi)} />
        <TileStat label="Low" value={fmtPx(lo)} />
        <TileStat label="Vol" value={'$' + fmtVol(vol)} />
        <TileStat label="Spread" value={spread > 0 ? spread.toFixed(4) + '%' : '—'} />
      </div>
      <div className={styles.tileChart} ref={wrap}>
        <canvas ref={cvs} style={{ position: 'absolute', top: 0, left: 0 }} />
      </div>
      <div className={styles.tileOverlay}>Open full chart →</div>
    </div>
  )
}

function TileStat({ label, value }) {
  return (
    <div className={styles.tileStat}>
      <span className={styles.tileStatL}>{label}</span>
      <span className={styles.tileStatV}>{value}</span>
    </div>
  )
}
