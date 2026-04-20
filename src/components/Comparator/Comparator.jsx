import { useState, useEffect, useRef } from 'react'
import { useStore } from '../../store'
import { fmtPx } from '../../lib/format'
import styles from './Comparator.module.css'

const SOURCES = [
  { id:'binance', label:'Binance', color:'#f0b90b' },
  { id:'bybit',   label:'Bybit',   color:'#f7a600' },
  { id:'okx',     label:'OKX',     color:'#fff'    },
  { id:'bitunix', label:'Bitunix', color:'#00c2ff' },
  { id:'bitget',  label:'Bitget',  color:'#00d4c8' },
  { id:'uniswap', label:'Uni V3',  color:'#ff007a', dex:true },
]

const FG_COLORS = {
  'Extreme Fear':  '#ef4444',
  'Fear':          '#f97316',
  'Neutral':       '#eab308',
  'Greed':         '#22c55e',
  'Extreme Greed': '#00e5a0',
}

export function Comparator() {
  const pair   = useStore(s => s.pair)
  const lastPx = useStore(s => s.lastPx)
  const [prices, setPrices] = useState({})
  const [fg, setFg] = useState(null) // { value, label }

  const setPrice = (id, bid, ask) => {
    const b = parseFloat(bid), a = parseFloat(ask)
    if (!isFinite(b) || !isFinite(a) || b <= 0 || a <= 0) return
    setPrices(p => ({ ...p, [id]: { bid: b, ask: a } }))
  }

  // ── Binance bookTicker WS (no CORS issue) ──
  useEffect(() => {
    if (!pair) return
    const ws = new WebSocket(`wss://stream.binance.com:9443/ws/${pair.toLowerCase()}@bookTicker`)
    ws.onmessage = e => { try { const d=JSON.parse(e.data); setPrice('binance',d.b,d.a) } catch(_){} }
    return () => { ws.onclose=null; try{ws.close()}catch(_){} }
  }, [pair])

  // ── OKX WS (works without proxy) ──
  useEffect(() => {
    if (!pair) return
    const inst = pair.replace('USDT','-USDT')
    let ws
    try {
      ws = new WebSocket('wss://ws.okx.com:8443/ws/v5/public')
      ws.onopen = () => ws.send(JSON.stringify({ op:'subscribe', args:[{ channel:'tickers', instId:inst }] }))
      ws.onmessage = e => {
        try {
          const d = JSON.parse(e.data)
          if (d.data?.[0]?.bidPx) setPrice('okx', d.data[0].bidPx, d.data[0].askPx)
        } catch(_) {}
      }
    } catch(_) {}
    return () => { if(ws){ws.onclose=null;try{ws.close()}catch(_){}} }
  }, [pair])

  // ── Bybit via Netlify proxy (poll every 3s) ──
  useEffect(() => {
    if (!pair) return
    let dead = false
    const poll = async () => {
      if (dead) return
      try {
        const res = await fetch(`/.netlify/functions/bybit-ticker?symbol=${pair}`)
        const d = await res.json()
        if (d.bid && d.ask) setPrice('bybit', d.bid, d.ask)
      } catch(_) {}
      if (!dead) setTimeout(poll, 3000)
    }
    poll()
    return () => { dead = true }
  }, [pair])

  // ── Bitget via Netlify proxy (poll every 3s) ──
  useEffect(() => {
    if (!pair) return
    let dead = false
    const poll = async () => {
      if (dead) return
      try {
        const res = await fetch(`/.netlify/functions/bitget-ticker?symbol=${pair}`)
        const d = await res.json()
        if (d.bid && d.ask) setPrice('bitget', d.bid, d.ask)
      } catch(_) {}
      if (!dead) setTimeout(poll, 3000)
    }
    poll()
    return () => { dead = true }
  }, [pair])

  // ── Bitunix via Netlify proxy (CORS bloqué côté browser) ──
  useEffect(() => {
    if (!pair) return
    let dead = false
    const poll = async () => {
      if (dead) return
      try {
        const res = await fetch(`/.netlify/functions/bitunix-ticker?symbol=${pair}`)
        const d = await res.json()
        if (d.bid && d.ask) setPrice('bitunix', d.bid, d.ask)
      } catch(_) {}
      if (!dead) setTimeout(poll, 3000)
    }
    poll()
    return () => { dead = true }
  }, [pair])

  // ── 0x Protocol / Uniswap V3 — prix réel via quote API ──
  useEffect(() => {
    if (!pair || !lastPx) return
    let dead = false
    const poll = async () => {
      if (dead) return
      try {
        // ETH en exemple — on quote 0.1 ETH → USDC via 0x
        const base = pair.replace('USDT','')
        // Seulement pour les paires ETH/BTC supportées par 0x
        if (!['ETH','BTC','WBTC'].includes(base)) {
          // Pour les autres paires, spread DEX estimé (~0.3%)
          const s = lastPx * 0.0015
          setPrice('uniswap', lastPx - s, lastPx + s)
          return
        }
        const USDC = '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48'
        const ETH  = '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE'
        const WBTC = '0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599'
        const sellToken = base === 'ETH' ? ETH : WBTC
        const sellAmount = base === 'ETH' ? '100000000000000000' : '1000000' // 0.1 ETH or 0.01 BTC
        const res = await fetch(
          `https://api.0x.org/swap/v1/price?sellToken=${sellToken}&buyToken=${USDC}&sellAmount=${sellAmount}`,
          { headers: { 'Accept': 'application/json' } }
        )
        const d = await res.json()
        if (d.price) {
          const dexPx = parseFloat(d.price)
          const spread = dexPx * 0.001
          setPrice('uniswap', dexPx - spread, dexPx + spread)
        }
      } catch(_) {
        // Fallback spread
        const s = lastPx * 0.0015
        setPrice('uniswap', lastPx - s, lastPx + s)
      }
      if (!dead) setTimeout(poll, 10000) // 0x rate limit — poll 10s
    }
    poll()
    return () => { dead = true }
  }, [pair, lastPx])

  // ── Fear & Greed Index (cached 5min via proxy) ──
  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch('/.netlify/functions/fear-greed')
        const d = await res.json()
        if (d.value) setFg(d)
      } catch(_) {}
    }
    load()
    const t = setInterval(load, 5 * 60 * 1000)
    return () => clearInterval(t)
  }, [])

  // ── Compute best/worst ──
  const valid = SOURCES.map(s => ({ ...s, data: prices[s.id] })).filter(s => s.data?.ask > 0)
  const bestAsk  = valid.length ? Math.min(...valid.map(s => s.data.ask)) : 0
  const worstAsk = valid.length ? Math.max(...valid.map(s => s.data.ask)) : 0
  const savingsPct = bestAsk > 0 && worstAsk > bestAsk ? ((worstAsk - bestAsk) / worstAsk * 100) : 0

  const fgColor = fg ? (FG_COLORS[fg.label] || '#eab308') : '#eab308'
  const fgPct   = fg?.value || 50

  return (
    <div className={styles.bar}>
      <span className={styles.bestLabel}>BEST PRICE</span>

      {SOURCES.map(src => {
        const data = prices[src.id]
        const isBest  = data?.ask > 0 && Math.abs(data.ask - bestAsk) < 0.01
        const diffPct = data?.ask && bestAsk ? ((data.ask - bestAsk) / bestAsk * 100) : null

        return (
          <div key={src.id} className={`${styles.src} ${isBest?styles.best:''} ${src.dex?styles.dex:''}`}>
            {src.dex && <span className={styles.dexTag}>DEX</span>}
            <span className={styles.srcName}>{src.label}</span>
            <span className={styles.srcPx} style={isBest?{color:src.color}:{}}>
              {data?.ask ? fmtPx(data.ask) : <span className={styles.dash}>—</span>}
            </span>
            {isBest && <span className={styles.bestTag}>BEST</span>}
            {diffPct !== null && diffPct > 0.001 && !isBest && (
              <span className={styles.diff}>+{diffPct.toFixed(3)}%</span>
            )}
          </div>
        )
      })}

      <div className={styles.sep}/>

      {/* Savings */}
      {savingsPct > 0.001 && (
        <div className={styles.savings}>
          <span>⚡</span>
          <span>Tu économises <strong>{savingsPct.toFixed(3)}%</strong></span>
        </div>
      )}

      <div className={styles.sep}/>

      {/* Fear & Greed */}
      {fg && (
        <div className={styles.fgWrap} title={`Fear & Greed: ${fg.value}/100`}>
          <span className={styles.fgLabel}>F&G</span>
          <div className={styles.fgBar}>
            <div className={styles.fgFill} style={{ width:`${fgPct}%`, background: fgColor }}/>
          </div>
          <span className={styles.fgVal} style={{ color: fgColor }}>{fg.value}</span>
          <span className={styles.fgText} style={{ color: fgColor }}>{fg.label}</span>
        </div>
      )}

      <span className={styles.nokyc}>no KYC · non-custodial</span>
    </div>
  )
}
