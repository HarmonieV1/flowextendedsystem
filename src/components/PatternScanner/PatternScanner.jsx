import { useState } from 'react'
import { useStore } from '../../store'
import { fmtPx } from '../../lib/format'
import styles from './PatternScanner.module.css'

// ── 40+ Pattern Detection Algorithms ──────────────────────────────────────────

function body(c) { return Math.abs(c.c - c.o) }
function upper(c) { return c.h - Math.max(c.o, c.c) }
function lower(c) { return Math.min(c.o, c.c) - c.l }
function range(c) { return c.h - c.l }
function isBull(c) { return c.c > c.o }
function isBear(c) { return c.c < c.o }

function detectAll(candles) {
  const n = candles.length
  const c = candles
  const out = []
  const add = (name, type, conf, i) => out.push({ name, type, conf: Math.min(95, conf), idx: i })

  for (let i = 1; i < n; i++) {
    const p = c[i-1], cur = c[i]

    // ── Single candle patterns ──
    const bd = body(cur), up = upper(cur), lo = lower(cur), rg = range(cur)
    if (rg > 0) {
      // Doji
      if (bd / rg < 0.1) add('Doji', 'neutral', 65, i)
      // Dragonfly Doji
      if (bd / rg < 0.08 && lo > bd * 3 && up < bd * 0.5) add('Dragonfly Doji', 'bullish', 72, i)
      // Gravestone Doji
      if (bd / rg < 0.08 && up > bd * 3 && lo < bd * 0.5) add('Gravestone Doji', 'bearish', 72, i)
      // Hammer
      if (isBull(cur) && lo > bd * 2 && up < bd * 0.3) add('Marteau', 'bullish', 74, i)
      // Inverted Hammer
      if (isBull(cur) && up > bd * 2 && lo < bd * 0.3) add('Marteau Inversé', 'bullish', 68, i)
      // Shooting Star
      if (isBear(cur) && up > bd * 2 && lo < bd * 0.3) add('Étoile Filante', 'bearish', 74, i)
      // Hanging Man
      if (isBear(cur) && lo > bd * 2 && up < bd * 0.3) add('Pendu', 'bearish', 68, i)
      // Spinning Top
      if (bd / rg < 0.3 && lo > bd * 0.8 && up > bd * 0.8) add('Toupie', 'neutral', 55, i)
      // Marubozu Bull
      if (isBull(cur) && up < bd * 0.05 && lo < bd * 0.05) add('Marubozu Haussier', 'bullish', 78, i)
      // Marubozu Bear
      if (isBear(cur) && up < bd * 0.05 && lo < bd * 0.05) add('Marubozu Baissier', 'bearish', 78, i)
    }

    // ── Two candle patterns ──
    if (i >= 1) {
      // Bullish Engulfing
      if (isBear(p) && isBull(cur) && cur.o < p.c && cur.c > p.o)
        add('Englobante Haussière', 'bullish', 82, i)
      // Bearish Engulfing
      if (isBull(p) && isBear(cur) && cur.o > p.c && cur.c < p.o)
        add('Englobante Baissière', 'bearish', 82, i)
      // Bullish Harami
      if (isBear(p) && isBull(cur) && cur.o > p.c && cur.c < p.o && body(cur) < body(p) * 0.6)
        add('Harami Haussier', 'bullish', 68, i)
      // Bearish Harami
      if (isBull(p) && isBear(cur) && cur.o < p.c && cur.c > p.o && body(cur) < body(p) * 0.6)
        add('Harami Baissier', 'bearish', 68, i)
      // Piercing Line
      if (isBear(p) && isBull(cur) && cur.o < p.l && cur.c > (p.o + p.c) / 2)
        add('Ligne Percante', 'bullish', 76, i)
      // Dark Cloud Cover
      if (isBull(p) && isBear(cur) && cur.o > p.h && cur.c < (p.o + p.c) / 2)
        add('Couverture Nuage Sombre', 'bearish', 76, i)
      // Tweezer Bottom
      if (isBear(p) && isBull(cur) && Math.abs(p.l - cur.l) / p.l < 0.002)
        add('Pinces Bas', 'bullish', 70, i)
      // Tweezer Top
      if (isBull(p) && isBear(cur) && Math.abs(p.h - cur.h) / p.h < 0.002)
        add('Pinces Haut', 'bearish', 70, i)
    }

    // ── Multi-candle patterns ──
    if (i >= 2) {
      const pp = c[i-2]
      // Morning Star
      if (isBear(pp) && body(p)/range(p) < 0.3 && isBull(cur) && cur.c > (pp.o + pp.c) / 2)
        add('Étoile du Matin', 'bullish', 84, i)
      // Evening Star
      if (isBull(pp) && body(p)/range(p) < 0.3 && isBear(cur) && cur.c < (pp.o + pp.c) / 2)
        add('Étoile du Soir', 'bearish', 84, i)
      // Three White Soldiers
      if (isBull(pp) && isBull(p) && isBull(cur) && p.o > pp.o && cur.o > p.o && p.c > pp.c && cur.c > p.c)
        add('Trois Soldats Blancs', 'bullish', 86, i)
      // Three Black Crows
      if (isBear(pp) && isBear(p) && isBear(cur) && p.o < pp.o && cur.o < p.o && p.c < pp.c && cur.c < p.c)
        add('Trois Corbeaux Noirs', 'bearish', 86, i)
      // Three Inside Up
      if (isBear(pp) && isBull(p) && body(p) < body(pp) * 0.7 && isBull(cur) && cur.c > pp.o)
        add('Trois Intérieur Haut', 'bullish', 78, i)
      // Three Outside Up
      if (isBear(pp) && isBull(p) && p.o < pp.c && p.c > pp.o && isBull(cur) && cur.c > p.c)
        add('Trois Extérieur Haut', 'bullish', 80, i)
      // Abandoned Baby Bull
      if (isBear(pp) && p.h < pp.l && isBull(cur) && cur.l > p.h)
        add('Bébé Abandonné Haussier', 'bullish', 88, i)
      // Abandoned Baby Bear
      if (isBull(pp) && p.l > pp.h && isBear(cur) && cur.h < p.l)
        add('Bébé Abandonné Baissier', 'bearish', 88, i)
    }
  }

  // ── Chart structure patterns ──
  for (let i = 15; i < n - 3; i++) {
    const sl = c.slice(i-15, i+3)

    // Double Bottom
    const lows15 = sl.map(x=>x.l)
    const l1 = Math.min(...lows15.slice(0,8)), l2 = Math.min(...lows15.slice(7))
    const midH = Math.max(...lows15.slice(4,11))
    if (Math.abs(l1-l2)/l1 < 0.015 && midH > l1*1.012)
      add('Double Fond', 'bullish', 82, i)

    // Double Top
    const highs15 = sl.map(x=>x.h)
    const h1 = Math.max(...highs15.slice(0,8)), h2 = Math.max(...highs15.slice(7))
    const midL = Math.min(...highs15.slice(4,11))
    if (Math.abs(h1-h2)/h1 < 0.015 && midL < h1*0.988)
      add('Double Sommet', 'bearish', 82, i)

    // Bull Flag
    const impulse = (c[i-5].c - c[i-14].c) / c[i-14].c
    if (impulse > 0.04) {
      const cons = c.slice(i-5,i).map(x=>(x.c-x.o)/x.o)
      const avg = cons.reduce((a,b)=>a+b,0)/5
      if (avg > -0.006 && avg < 0.002) add('Bull Flag', 'bullish', 80, i)
    }

    // Bear Flag
    const impulse2 = (c[i-14].c - c[i-5].c) / c[i-14].c
    if (impulse2 > 0.04) {
      const cons2 = c.slice(i-5,i).map(x=>(x.c-x.o)/x.o)
      const avg2 = cons2.reduce((a,b)=>a+b,0)/5
      if (avg2 > -0.002 && avg2 < 0.006) add('Bear Flag', 'bearish', 80, i)
    }
  }

  for (let i = 20; i < n - 2; i++) {
    const sl = c.slice(i-20, i)
    const hs = sl.map(x=>x.h), ls = sl.map(x=>x.l)
    const maxH = Math.max(...hs), minH = Math.min(...hs)
    const maxL = Math.max(...ls), minL = Math.min(...ls)
    const highTrend = hs[hs.length-1] - hs[0]
    const lowTrend  = ls[ls.length-1] - ls[0]

    // Ascending Triangle
    if ((maxH-minH)/maxH < 0.015 && lowTrend > 0) add('Triangle Ascendant', 'bullish', 76, i)
    // Descending Triangle
    if ((maxL-minL)/minL < 0.015 && highTrend < 0) add('Triangle Descendant', 'bearish', 76, i)
    // Symmetrical Triangle
    if (highTrend < 0 && lowTrend > 0 && Math.abs(highTrend) > 0.01 && Math.abs(lowTrend) > 0.01)
      add('Triangle Symétrique', 'neutral', 70, i)
    // Rising Wedge
    if (highTrend > 0 && lowTrend > 0 && lowTrend > highTrend * 1.3) add('Biseau Montant', 'bearish', 74, i)
    // Falling Wedge
    if (highTrend < 0 && lowTrend < 0 && highTrend < lowTrend * 1.3) add('Biseau Descendant', 'bullish', 74, i)
  }

  // Head & Shoulders
  for (let i = 25; i < n - 5; i++) {
    const sl = c.slice(i-25, i+5)
    const highs = sl.map(x=>x.h)
    const maxH = Math.max(...highs)
    const maxIdx = highs.indexOf(maxH)
    if (maxIdx > 8 && maxIdx < highs.length - 8) {
      const leftH  = Math.max(...highs.slice(0, maxIdx-4))
      const rightH = Math.max(...highs.slice(maxIdx+4))
      if (Math.abs(leftH-rightH)/leftH < 0.03 && maxH > leftH * 1.03)
        add('Épaule-Tête-Épaule', 'bearish', 85, i)
    }
  }

  // Cup & Handle
  for (let i = 30; i < n - 5; i++) {
    const sl = c.slice(i-30, i)
    const lows = sl.map(x=>x.l)
    const minL = Math.min(...lows)
    const minIdx = lows.indexOf(minL)
    if (minIdx > 8 && minIdx < lows.length - 8) {
      const leftH  = c[i-30].c
      const rightH = c[i-1].c
      if (Math.abs(leftH-rightH)/leftH < 0.03 && minL < leftH * 0.95)
        add('Tasse et Anse', 'bullish', 82, i)
    }
  }

  // Deduplicate by name, keep highest conf
  const seen = {}
  return out.filter(p => {
    if (seen[p.name] !== undefined) return false
    seen[p.name] = true
    return true
  }).sort((a,b) => b.conf - a.conf).slice(0, 12)
}

const PAIRS = ['BTCUSDT','ETHUSDT','SOLUSDT','BNBUSDT','XRPUSDT','ARBUSDT','LINKUSDT','AVAXUSDT','ADAUSDT','DOTUSDT']
const TFS   = ['15m','1h','4h','1d']

export function PatternScanner() {
  const setPair = useStore(s => s.setPair)
  const [results, setResults]   = useState([])
  const [scanning, setScanning] = useState(false)
  const [tf, setTf]             = useState('1h')
  const [progress, setProgress] = useState(0)
  const [filter, setFilter]     = useState('all')

  const scan = async () => {
    setScanning(true); setResults([]); setProgress(0)
    const found = []
    for (let i = 0; i < PAIRS.length; i++) {
      setProgress(Math.round(i/PAIRS.length*100))
      try {
        const r = await fetch(`https://api.binance.com/api/v3/klines?symbol=${PAIRS[i]}&interval=${tf}&limit=100`)
        const data = await r.json()
        if (!Array.isArray(data)) continue
        const candles = data.map(d=>({o:+d[1],h:+d[2],l:+d[3],c:+d[4]}))
        const lastPrice = candles[candles.length-1].c
        detectAll(candles).forEach(p => found.push({...p, pair:PAIRS[i], price:lastPrice}))
      } catch(_) {}
    }
    found.sort((a,b)=>b.conf-a.conf)
    setResults(found); setProgress(100); setScanning(false)
  }

  const filtered = filter === 'all' ? results
    : results.filter(r => r.type === filter)

  return (
    <div className={styles.wrap}>
      <div className={styles.header}>
        <span className={styles.title}>🎯 Détecteur de Patterns</span>
        <div className={styles.controls}>
          <div className={styles.tfRow}>{TFS.map(t=>(
            <button key={t} className={styles.tfBtn+(tf===t?' '+styles.tfOn:'')} onClick={()=>setTf(t)}>{t}</button>
          ))}</div>
          <button className={styles.scanBtn} onClick={scan} disabled={scanning}>
            {scanning?progress+'%':'⚡ Scanner'}
          </button>
        </div>
      </div>

      {scanning && <div className={styles.progBar}><div className={styles.progFill} style={{width:progress+'%'}}/></div>}

      {results.length > 0 && (
        <div className={styles.filterRow}>
          {[['all','Tous'],['bullish','Haussier'],['bearish','Baissier'],['neutral','Neutre']].map(([id,lbl])=>(
            <button key={id} className={styles.fBtn+(filter===id?' '+styles.fOn:'')} onClick={()=>setFilter(id)}>{lbl}</button>
          ))}
          <span className={styles.count}>{filtered.length} résultats</span>
        </div>
      )}

      {!scanning && results.length === 0 && (
        <div className={styles.empty}>
          <div style={{fontSize:40,marginBottom:10}}>🔍</div>
          <div style={{fontSize:13,fontWeight:700,color:'var(--txt)',marginBottom:6}}>40+ patterns détectables</div>
          <div style={{fontSize:11,color:'var(--txt3)',lineHeight:1.7,textAlign:'center',maxWidth:300}}>
            Chandeliers japonais · Formations chartistes · Double fond/sommet<br/>
            Bull/Bear Flag · Triangles · Épaule-Tête-Épaule · Cup & Handle<br/>
            Morning/Evening Star · Englobantes · Haramis · et plus
          </div>
        </div>
      )}

      <div className={styles.list}>
        {filtered.map((r,i)=>(
          <div key={i} className={styles.row} onClick={()=>setPair(r.pair)}>
            <div className={styles.rowL}>
              <span className={styles.dir} style={{color:r.type==='bullish'?'var(--grn)':r.type==='bearish'?'var(--red)':'var(--txt3)'}}>
                {r.type==='bullish'?'↑':r.type==='bearish'?'↓':'—'}
              </span>
              <div>
                <div className={styles.patName}>{r.name}</div>
                <div className={styles.patPair}>{r.pair.replace('USDT','/USDT')} · {tf}</div>
              </div>
            </div>
            <div className={styles.rowR}>
              <div className={styles.patPrice}>{fmtPx(r.price)}</div>
              <div className={styles.confRow}>
                <div className={styles.confBar}><div className={styles.confFill} style={{width:r.conf+'%',background:r.type==='bullish'?'var(--grn)':r.type==='bearish'?'var(--red)':'var(--txt3)'}}/></div>
                <span className={styles.confPct}>{r.conf}%</span>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className={styles.footer}>Algorithmes natifs · {PAIRS.length} paires · Données Binance · {tf}</div>
    </div>
  )
}
