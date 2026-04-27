import { useState } from 'react'
import { useStore } from '../../store'
import { fmtPx } from '../../lib/format'
import styles from './PatternScanner.module.css'

function detectPatterns(candles) {
  if (!candles || candles.length < 20) return []
  const patterns = []
  const n = candles.length
  const c = candles

  // Double Bottom
  for (let i = 10; i < n - 5; i++) {
    const sl = c.slice(i-10, i+5)
    const l1 = Math.min(...sl.slice(0,6).map(x=>x.l))
    const l2 = Math.min(...sl.slice(4).map(x=>x.l))
    const mid = Math.max(...sl.slice(3,7).map(x=>x.h))
    const diff = Math.abs(l1-l2)/l1
    if (diff < 0.015 && mid > l1*1.01) patterns.push({name:'Double Bottom',type:'bullish',conf:Math.min(92,Math.round(75+(1-diff*50)*10)),pair:null,price:0})
  }

  // Double Top
  for (let i = 10; i < n - 5; i++) {
    const sl = c.slice(i-10, i+5)
    const h1 = Math.max(...sl.slice(0,6).map(x=>x.h))
    const h2 = Math.max(...sl.slice(4).map(x=>x.h))
    const mid = Math.min(...sl.slice(3,7).map(x=>x.l))
    const diff = Math.abs(h1-h2)/h1
    if (diff < 0.015 && mid < h1*0.99) patterns.push({name:'Double Top',type:'bearish',conf:Math.min(92,Math.round(75+(1-diff*50)*10)),pair:null,price:0})
  }

  // Bull Flag
  for (let i = 15; i < n - 3; i++) {
    const impulse = (c[i-5].c - c[i-15].c) / c[i-15].c
    if (impulse < 0.04) continue
    const sl = c.slice(i-5, i)
    const avgBody = sl.reduce((a,x) => a + (x.c-x.o)/x.o, 0) / 5
    if (avgBody > -0.008 && avgBody < 0.002) patterns.push({name:'Bull Flag',type:'bullish',conf:Math.min(88,Math.round(68+impulse*200)),pair:null,price:0})
  }

  // Bear Flag
  for (let i = 15; i < n - 3; i++) {
    const impulse = (c[i-15].c - c[i-5].c) / c[i-15].c
    if (impulse < 0.04) continue
    const sl = c.slice(i-5, i)
    const avgBody = sl.reduce((a,x) => a + (x.c-x.o)/x.o, 0) / 5
    if (avgBody > -0.002 && avgBody < 0.008) patterns.push({name:'Bear Flag',type:'bearish',conf:Math.min(88,Math.round(68+impulse*200)),pair:null,price:0})
  }

  // Ascending Triangle
  for (let i = 20; i < n - 2; i++) {
    const sl = c.slice(i-20, i)
    const highs = sl.map(x=>x.h)
    const lows  = sl.map(x=>x.l)
    const hRange = (Math.max(...highs)-Math.min(...highs))/Math.max(...highs)
    const lowTrend = lows[lows.length-1] - lows[0]
    if (hRange < 0.015 && lowTrend > 0) patterns.push({name:'Triangle Ascendant',type:'bullish',conf:74,pair:null,price:0})
  }

  // Descending Triangle
  for (let i = 20; i < n - 2; i++) {
    const sl = c.slice(i-20, i)
    const highs = sl.map(x=>x.h)
    const lows  = sl.map(x=>x.l)
    const lRange = (Math.max(...lows)-Math.min(...lows))/Math.min(...lows)
    const highTrend = highs[highs.length-1] - highs[0]
    if (lRange < 0.015 && highTrend < 0) patterns.push({name:'Triangle Descendant',type:'bearish',conf:74,pair:null,price:0})
  }

  // Bullish Engulfing
  for (let i = 1; i < n; i++) {
    const p=c[i-1],cur=c[i]
    if (p.c<p.o && cur.c>cur.o && cur.o<p.c && cur.c>p.o) patterns.push({name:'Englobante Haussière',type:'bullish',conf:80,pair:null,price:0})
  }

  // Bearish Engulfing
  for (let i = 1; i < n; i++) {
    const p=c[i-1],cur=c[i]
    if (p.c>p.o && cur.c<cur.o && cur.o>p.c && cur.c<p.o) patterns.push({name:'Englobante Baissière',type:'bearish',conf:80,pair:null,price:0})
  }

  // Hammer
  for (let i = 0; i < n; i++) {
    const {o,h,l,c:cl}=c[i]
    const body=Math.abs(cl-o), lower=Math.min(o,cl)-l, upper=h-Math.max(o,cl)
    if (body>0 && lower>body*2 && upper<body*0.3) patterns.push({name:'Marteau',type:'bullish',conf:72,pair:null,price:0})
  }

  // Shooting Star
  for (let i = 0; i < n; i++) {
    const {o,h,l,c:cl}=c[i]
    const body=Math.abs(cl-o), upper=h-Math.max(o,cl), lower=Math.min(o,cl)-l
    if (body>0 && upper>body*2 && lower<body*0.3) patterns.push({name:'Étoile Filante',type:'bearish',conf:72,pair:null,price:0})
  }

  // Doji
  for (let i = 0; i < n; i++) {
    const {o,h,l,c:cl}=c[i]
    const body=Math.abs(cl-o), range=h-l
    if (range>0 && body/range<0.1) patterns.push({name:'Doji',type:'neutral',conf:65,pair:null,price:0})
  }

  // Deduplicate by name
  const seen = new Set()
  return patterns.filter(p => { if(seen.has(p.name)) return false; seen.add(p.name); return true })
    .sort((a,b) => b.conf-a.conf).slice(0,8)
}

const PAIRS = ['BTCUSDT','ETHUSDT','SOLUSDT','BNBUSDT','XRPUSDT','ARBUSDT','LINKUSDT','AVAXUSDT']
const TFS   = ['15m','1h','4h','1d']

export function PatternScanner() {
  const setPair = useStore(s => s.setPair)
  const setView = useStore(s => s.setView)
  const setTab  = useStore(s => s.setTab)

  const [results, setResults]   = useState([])
  const [scanning, setScanning] = useState(false)
  const [tf, setTf]             = useState('1h')
  const [progress, setProgress] = useState(0)

  const scan = async () => {
    setScanning(true); setResults([]); setProgress(0)
    const found = []
    for (let i = 0; i < PAIRS.length; i++) {
      const pair = PAIRS[i]
      setProgress(Math.round((i / PAIRS.length) * 100))
      try {
        const r = await fetch(`https://api.binance.com/api/v3/klines?symbol=${pair}&interval=${tf}&limit=100`)
        const data = await r.json()
        if (!Array.isArray(data)) continue
        const candles = data.map(d => ({o:+d[1],h:+d[2],l:+d[3],c:+d[4],v:+d[5]}))
        const lastPrice = candles[candles.length-1].c
        detectPatterns(candles).forEach(p => found.push({...p, pair, price: lastPrice}))
      } catch(_) {}
    }
    found.sort((a,b) => b.conf-a.conf)
    setResults(found); setProgress(100); setScanning(false)
  }

  const handleClick = (pair) => {
    setPair(pair); setView('trade'); setTab?.('Spot')
  }

  return (
    <div className={styles.wrap}>
      <div className={styles.header}>
        <span className={styles.title}>🔎 Détecteur de Patterns</span>
        <div className={styles.controls}>
          <div className={styles.tfRow}>
            {TFS.map(t => (
              <button key={t} className={styles.tfBtn+(tf===t?' '+styles.tfOn:'')} onClick={()=>setTf(t)}>{t}</button>
            ))}
          </div>
          <button className={styles.scanBtn} onClick={scan} disabled={scanning}>
            {scanning ? progress+'%' : '⚡ Scanner'}
          </button>
        </div>
      </div>

      {scanning && (
        <div className={styles.progBar}><div className={styles.progFill} style={{width:progress+'%'}}/></div>
      )}

      {!scanning && results.length === 0 && (
        <div className={styles.empty}>
          <div style={{fontSize:48,marginBottom:12}}>🔍</div>
          <div style={{fontSize:14,fontWeight:700,color:'var(--txt)',marginBottom:8}}>Aucun résultat</div>
          <div style={{fontSize:12,color:'var(--txt3)',lineHeight:1.6}}>
            Lance un scan pour détecter automatiquement les patterns techniques sur {PAIRS.length} paires.
          </div>
          <div style={{marginTop:12,fontSize:11,color:'var(--txt3)'}}>
            Double Bottom/Top · Bull/Bear Flag · Triangles · Englobantes · Marteau · Doji
          </div>
        </div>
      )}

      <div className={styles.list}>
        {results.map((r, i) => (
          <div key={i} className={styles.row} onClick={() => handleClick(r.pair)}>
            <div className={styles.rowLeft}>
              <span className={styles.dir} style={{color:r.type==='bullish'?'var(--grn)':r.type==='bearish'?'var(--red)':'var(--txt3)'}}>
                {r.type==='bullish'?'↑':r.type==='bearish'?'↓':'—'}
              </span>
              <div>
                <div className={styles.patName}>{r.name}</div>
                <div className={styles.patPair}>{r.pair.replace('USDT','/USDT')} · {tf}</div>
              </div>
            </div>
            <div className={styles.rowRight}>
              <div className={styles.patPrice}>{fmtPx(r.price)}</div>
              <div className={styles.confRow}>
                <div className={styles.confBar}>
                  <div className={styles.confFill} style={{width:r.conf+'%',background:r.type==='bullish'?'var(--grn)':'var(--red)'}}/>
                </div>
                <span className={styles.confPct}>{r.conf}%</span>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className={styles.footer}>
        Algorithmes natifs · {PAIRS.length} paires · Données Binance
      </div>
    </div>
  )
}
