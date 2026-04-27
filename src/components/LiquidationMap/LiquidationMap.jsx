import { useState, useEffect, useRef, useCallback } from 'react'
import { useStore } from '../../store'
import { fmtPx, fmt } from '../../lib/format'
import styles from './LiquidationMap.module.css'

// Coinglass public liquidation data (no API key required for basic data)
const CG_BASE = 'https://open-api.coinglass.com/public/v2'

// Fallback: compute estimated liquidation zones from order book + OI
// Using Binance futures OI + funding rate as proxy

const SYMBOLS = {
  BTCUSDT: 'BTC', ETHUSDT: 'ETH', SOLUSDT: 'SOL',
  BNBUSDT: 'BNB', XRPUSDT: 'XRP', ARBUSDT: 'ARB',
}

async function fetchLiqZones(symbol, lastPx) {
  // Use Binance Futures mark price + open interest by price level
  try {
    const base = symbol.replace('USDT','')

    // Get open interest histogram (Binance)
    const [oiRes, fundRes] = await Promise.all([
      fetch(`https://fapi.binance.com/futures/data/openInterestHist?symbol=${symbol}&period=5m&limit=1`),
      fetch(`https://fapi.binance.com/fapi/v1/premiumIndex?symbol=${symbol}`),
    ])
    const oiData   = await oiRes.json()
    const fundData = await fundRes.json()

    const oi        = parseFloat(oiData[0]?.sumOpenInterest || 0)
    const funding   = parseFloat(fundData.lastFundingRate || 0)
    const markPrice = parseFloat(fundData.markPrice || lastPx)

    // Estimate liquidation zones based on typical leverage distribution
    // Most retail uses 10x-25x leverage
    // Longs: liquidated at entry * (1 - 1/leverage)
    // Shorts: liquidated at entry * (1 + 1/leverage)

    const zones = []

    // Long liquidation zones (price going DOWN hits these)
    for (const lev of [5, 10, 20, 50, 100]) {
      const pct = 1/lev
      const liqPx = markPrice * (1 - pct)
      const weight = lev === 10 ? 0.35 : lev === 20 ? 0.25 : lev === 5 ? 0.15 : lev === 50 ? 0.15 : 0.1
      zones.push({
        price: liqPx,
        side: 'long',
        usd: oi * markPrice * weight * 0.3,
        leverage: lev,
      })
    }

    // Short liquidation zones (price going UP hits these)
    for (const lev of [5, 10, 20, 50, 100]) {
      const pct = 1/lev
      const liqPx = markPrice * (1 + pct)
      const weight = lev === 10 ? 0.35 : lev === 20 ? 0.25 : lev === 5 ? 0.15 : lev === 50 ? 0.15 : 0.1
      zones.push({
        price: liqPx,
        side: 'short',
        usd: oi * markPrice * weight * (funding > 0 ? 0.25 : 0.35), // more shorts if funding negative
        leverage: lev,
      })
    }

    return { zones, markPrice, oi, funding }
  } catch(e) {
    console.error('liq fetch:', e.message)
    return null
  }
}

export function LiquidationMap() {
  const pair   = useStore(s => s.pair)
  const lastPx = useStore(s => s.lastPx)

  const [data, setData]       = useState(null)
  const [loading, setLoading] = useState(false)
  const canvasRef = useRef(null)
  const wrapRef   = useRef(null)

  const load = useCallback(async () => {
    if (!lastPx) return
    setLoading(true)
    const result = await fetchLiqZones(pair, lastPx)
    setData(result)
    setLoading(false)
  }, [pair, lastPx])

  useEffect(() => { load(); const t = setInterval(load, 60000); return () => clearInterval(t) }, [load])

  // Draw canvas
  useEffect(() => {
    const canvas = canvasRef.current
    const wrap   = wrapRef.current
    if (!canvas || !wrap || !data) return

    const rect = wrap.getBoundingClientRect()
    const W = rect.width || 600
    const H = rect.height || 300
    if (canvas.width !== W || canvas.height !== H) {
      canvas.width = W; canvas.height = H
    }

    const ctx = canvas.getContext('2d')
    ctx.fillStyle = '#09090b'
    ctx.fillRect(0, 0, W, H)

    const { zones, markPrice } = data
    if (!zones.length || !markPrice) return

    // Price range: ±30% from mark
    const minP = markPrice * 0.70
    const maxP = markPrice * 1.30
    const priceToX = p => ((p - minP) / (maxP - minP)) * W

    // Max USD for bar scaling
    const maxUSD = Math.max(...zones.map(z => z.usd)) || 1

    // Grid lines
    ctx.strokeStyle = 'rgba(255,255,255,.04)'
    ctx.lineWidth = 1
    for (let i = 1; i < 10; i++) {
      const x = W * i / 10
      ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke()
    }

    // Zones bars
    zones.forEach(z => {
      const x = priceToX(z.price)
      const barH = (z.usd / maxUSD) * H * 0.8
      const y = H - barH
      const isLong = z.side === 'long'

      // Gradient bar
      const grad = ctx.createLinearGradient(0, y, 0, H)
      if (isLong) {
        grad.addColorStop(0, 'rgba(0,229,160,.0)')
        grad.addColorStop(1, 'rgba(0,229,160,.7)')
      } else {
        grad.addColorStop(0, 'rgba(255,59,92,.0)')
        grad.addColorStop(1, 'rgba(255,59,92,.7)')
      }
      ctx.fillStyle = grad
      const bw = Math.max(8, W * 0.015)
      ctx.fillRect(x - bw/2, y, bw, barH)

      // Label
      if (z.leverage === 10 || z.leverage === 20) {
        ctx.fillStyle = isLong ? 'rgba(0,229,160,.8)' : 'rgba(255,59,92,.8)'
        ctx.font = '8px monospace'
        ctx.textAlign = 'center'
        ctx.fillText(z.leverage + '×', x, y - 4)
      }
    })

    // Current price line
    const markX = priceToX(markPrice)
    ctx.strokeStyle = 'rgba(255,255,255,.9)'
    ctx.lineWidth = 1.5
    ctx.setLineDash([4, 4])
    ctx.beginPath(); ctx.moveTo(markX, 0); ctx.lineTo(markX, H); ctx.stroke()
    ctx.setLineDash([])

    // Price label
    ctx.fillStyle = '#fff'
    ctx.font = 'bold 11px monospace'
    ctx.textAlign = 'center'
    ctx.fillRect(markX - 35, 8, 70, 18)
    ctx.fillStyle = '#000'
    ctx.fillText(fmtPx(markPrice), markX, 21)

    // X axis labels
    ctx.fillStyle = 'rgba(255,255,255,.35)'
    ctx.font = '9px monospace'
    for (let i = 0; i <= 6; i++) {
      const p = minP + (maxP - minP) * (i/6)
      const x = priceToX(p)
      ctx.textAlign = 'center'
      ctx.fillText(fmtPx(p), x, H - 4)
    }

    // Side labels
    ctx.font = 'bold 10px monospace'
    ctx.fillStyle = 'rgba(0,229,160,.7)'
    ctx.textAlign = 'left'
    ctx.fillText('← LONGS liquidés', 10, 16)
    ctx.fillStyle = 'rgba(255,59,92,.7)'
    ctx.textAlign = 'right'
    ctx.fillText('SHORTS liquidés →', W - 10, 16)

  }, [data, lastPx])

  const sym = SYMBOLS[pair] || pair.replace('USDT','')

  return (
    <div className={styles.wrap}>
      <div className={styles.header}>
        <span className={styles.title}>💧 Liquidation Map</span>
        <span className={styles.pair}>{sym}/USDT</span>
        {data && (
          <span className={styles.oi}>
            OI: ${fmt((data.oi * (data.markPrice || lastPx)) / 1e9, 2)}B
          </span>
        )}
        <button className={styles.refreshBtn} onClick={load} disabled={loading}>
          {loading ? '⟳' : '↻'}
        </button>
      </div>

      <div className={styles.legend}>
        <span style={{color:'var(--grn)'}}>■ Longs (liquidés si prix baisse)</span>
        <span className={styles.legendSep}>·</span>
        <span style={{color:'var(--red)'}}>■ Shorts (liquidés si prix monte)</span>
        <span className={styles.legendSep}>·</span>
        <span style={{color:'var(--txt3)'}}>Estimé · Levier moyen retail</span>
      </div>

      {loading && !data && (
        <div className={styles.loading}>Chargement données Binance Futures...</div>
      )}

      <div ref={wrapRef} className={styles.canvasWrap}>
        <canvas ref={canvasRef} className={styles.canvas}/>
      </div>

      {data && (
        <div className={styles.stats}>
          <div className={styles.stat}>
            <span className={styles.statL}>Mark Price</span>
            <span className={styles.statV}>{fmtPx(data.markPrice)}</span>
          </div>
          <div className={styles.stat}>
            <span className={styles.statL}>Funding Rate</span>
            <span className={styles.statV} style={{color: data.funding > 0.0001 ? 'var(--red)' : data.funding < -0.0001 ? 'var(--grn)' : 'var(--txt)'}}>
              {data.funding >= 0 ? '+' : ''}{(data.funding * 100).toFixed(4)}%
            </span>
          </div>
          <div className={styles.stat}>
            <span className={styles.statL}>Zone critique</span>
            <span className={styles.statV}>
              {fmtPx(data.markPrice * 0.9)} – {fmtPx(data.markPrice * 1.1)}
            </span>
          </div>
        </div>
      )}

      <div className={styles.footer}>
        Données Binance Futures · Zones estimées via OI + levier moyen · Refresh 60s
      </div>
    </div>
  )
}
