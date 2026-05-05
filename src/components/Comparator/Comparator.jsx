import { useState as useAlertState } from 'react'
import { PriceAlerts } from '../PriceAlerts/PriceAlerts'
import { useState, useEffect } from 'react'
import { useStore } from '../../store'
import { fmtPx } from '../../lib/format'
import styles from './Comparator.module.css'
import { logSilent } from '../../lib/errorMonitor'

// Sources confirmées CORS OK
const SOURCES = [
  { id:'fxsedge', label:'FXSEDGE', color:'#8cc63f' },
  { id:'binance', label:'Binance', color:'#f0b90b' },
  { id:'bybit',   label:'Bybit',   color:'#f7a600' },
  { id:'okx',     label:'OKX',     color:'#e8e8e8' },
  { id:'bitget',  label:'Bitget',  color:'#00d4c8' },
  { id:'gate',    label:'Gate.io', color:'#2354e6' },
  { id:'htx',      label:'HTX',     color:'#347deb' },
]

const FG_COLORS = {
  'Extreme Fear':'#ef4444','Fear':'#f97316',
  'Neutral':'#eab308','Greed':'#22c55e','Extreme Greed':'#8cc63f',
}

export function Comparator() {
  const pair   = useStore(s => s.pair)
  const lastPx = useStore(s => s.lastPx)
  const setComparatorPrice = useStore(s => s.setComparatorPrice)
  const [prices, setPrices] = useState({})
  const [fg, setFg] = useState(null)
  const [alertOpen, setAlertOpen] = useState(false)

  const set = (id, bid, ask) => {
    const b = parseFloat(bid), a = parseFloat(ask)
    if (!isFinite(b)||!isFinite(a)||b<=0||a<=0) return
    setPrices(p => ({...p,[id]:{bid:b,ask:a}}))
    setComparatorPrice?.(id, b, a)
  }

  // ── FXSEDGE price (from store, transparent — same as best available) ──
  useEffect(() => {
    if (lastPx > 0) set('fxsedge', lastPx, lastPx)
  }, [lastPx])

  // ── Binance WS ──
  useEffect(() => {
    if (!pair) return
    let ws, dead=false, retryT
    const connect = () => {
      if (dead) return
      ws = new WebSocket(`wss://stream.binance.com:9443/ws/${pair.toLowerCase()}@bookTicker`)
      ws.onmessage = e => { try{const d=JSON.parse(e.data);set('binance',d.b,d.a)}catch(e){logSilent(e,'Comparator')} }
      ws.onerror = () => {}
      ws.onclose = () => { if(!dead) retryT=setTimeout(connect,3000) }
    }
    connect()
    return () => { dead=true;clearTimeout(retryT);if(ws){ws.onclose=null;try{ws.close()}catch(e){logSilent(e,'Comparator')}} }
  }, [pair])

  // ── Bybit REST ──
  useEffect(() => {
    if (!pair) return
    let dead=false
    const poll = async () => {
      if (dead) return
      try {
        const r = await fetch(`https://api.bybit.com/v5/market/tickers?category=spot&symbol=${pair}`,{signal:AbortSignal.timeout(4000)})
        const d = await r.json()
        const t = d?.result?.list?.[0]
        if (t?.bid1Price) set('bybit',t.bid1Price,t.ask1Price)
      } catch(e){logSilent(e,'Comparator')}
      if (!dead) setTimeout(poll,4000)
    }
    poll(); return()=>{dead=true}
  }, [pair])

  // ── OKX WS ──
  useEffect(() => {
    if (!pair) return
    let ws, dead=false, retryT
    const connect = () => {
      if (dead) return
      ws = new WebSocket('wss://ws.okx.com:8443/ws/v5/public')
      ws.onopen = () => ws.send(JSON.stringify({op:'subscribe',args:[{channel:'tickers',instId:pair.replace('USDT','-USDT')}]}))
      ws.onmessage = e => { try{const d=JSON.parse(e.data);if(d.data?.[0]?.bidPx)set('okx',d.data[0].bidPx,d.data[0].askPx)}catch(e){logSilent(e,'Comparator')} }
      ws.onerror = () => {}
      ws.onclose = () => { if(!dead) retryT=setTimeout(connect,3000) }
    }
    connect()
    return()=>{dead=true;clearTimeout(retryT);if(ws){ws.onclose=null;try{ws.close()}catch(e){logSilent(e,'Comparator')}}}
  }, [pair])

  // ── Bitget WS ──
  useEffect(() => {
    if (!pair) return
    let ws, dead=false, retryT
    const connect = () => {
      if (dead) return
      ws = new WebSocket('wss://ws.bitget.com/v2/ws/public')
      ws.onopen = () => ws.send(JSON.stringify({op:'subscribe',args:[{instType:'SPOT',channel:'ticker',instId:pair}]}))
      ws.onmessage = e => { try{const d=JSON.parse(e.data);const t=d.data?.[0];if(t?.bidPr)set('bitget',t.bidPr,t.askPr)}catch(e){logSilent(e,'Comparator')} }
      ws.onerror = () => {}
      ws.onclose = () => { if(!dead) retryT=setTimeout(connect,3000) }
    }
    connect()
    return()=>{dead=true;clearTimeout(retryT);if(ws){ws.onclose=null;try{ws.close()}catch(e){logSilent(e,'Comparator')}}}
  }, [pair])

  // ── Gate.io WS ──
  useEffect(() => {
    if (!pair) return
    const gatePair = pair.replace('USDT','_USDT')
    let ws, dead=false, retryT
    const connect = () => {
      if (dead) return
      try {
        ws = new WebSocket('wss://api.gateio.ws/ws/v4/')
        ws.onopen = () => ws.send(JSON.stringify({time:Math.floor(Date.now()/1000),channel:'spot.book_ticker',event:'subscribe',payload:[gatePair]}))
        ws.onmessage = e => {
          try {
            const d = JSON.parse(e.data)
            // Initial result
            if (d.result?.b && d.result?.a) set('gate', d.result.b, d.result.a)
            // Update events
            if (d.event==='update' && d.result?.b && d.result?.a) set('gate', d.result.b, d.result.a)
          } catch(e){logSilent(e,'Comparator')}
        }
        ws.onerror = () => {}
        ws.onclose = () => { if(!dead) retryT=setTimeout(connect,5000) }
      } catch(_) { if(!dead) retryT=setTimeout(connect,5000) }
    }
    connect()
    return()=>{dead=true;clearTimeout(retryT);if(ws){ws.onclose=null;try{ws.close()}catch(e){logSilent(e,'Comparator')}}}
  }, [pair])

  // ── HTX (Huobi) WS ──
  useEffect(() => {
    if (!pair) return
    const htxPair = pair.toLowerCase().replace('usdt','')
    const sub = 'market.' + htxPair + 'usdt.bbo'
    let ws, dead=false, retryT, pingT
    const connect = () => {
      if (dead) return
      try {
        ws = new WebSocket('wss://api.huobi.pro/ws')
        ws.binaryType = 'arraybuffer'
        ws.onopen = () => { ws.send(JSON.stringify({sub, id:'fxs'})); pingT = setInterval(()=>{ if(ws.readyState===1) ws.send(JSON.stringify({ping:Date.now()})) },20000) }
        ws.onmessage = async e => {
          try {
            let txt
            if (e.data instanceof ArrayBuffer) {
              const ds = new DecompressionStream('gzip')
              const writer = ds.writable.getWriter()
              writer.write(new Uint8Array(e.data))
              writer.close()
              txt = await new Response(ds.readable).text()
            } else if (e.data instanceof Blob) {
              const ab = await e.data.arrayBuffer()
              const ds = new DecompressionStream('gzip')
              const writer = ds.writable.getWriter()
              writer.write(new Uint8Array(ab))
              writer.close()
              txt = await new Response(ds.readable).text()
            } else {
              txt = e.data
            }
            const d = JSON.parse(txt)
            if (d.ping) { ws.send(JSON.stringify({pong:d.ping})); return }
            if (d.tick?.bid && d.tick?.ask) set('htx', d.tick.bid, d.tick.ask)
          } catch(e){logSilent(e,'Comparator')}
        }
        ws.onerror = () => {}
        ws.onclose = () => { clearInterval(pingT); if(!dead) retryT=setTimeout(connect,5000) }
      } catch(_) { if(!dead) retryT=setTimeout(connect,5000) }
    }
    connect()
    return()=>{dead=true;clearTimeout(retryT);clearInterval(pingT);if(ws){ws.onclose=null;try{ws.close()}catch(e){logSilent(e,'Comparator')}}}
  }, [pair])

  // ── Fear & Greed ──
  useEffect(() => {
    const load = async () => {
      try {
        const r = await fetch('https://api.alternative.me/fng/?limit=1',{signal:AbortSignal.timeout(5000)})
        const d = await r.json()
        const item = d?.data?.[0]
        if (item?.value) setFg({value:parseInt(item.value),label:item.value_classification})
      } catch(e){logSilent(e,'Comparator')}
    }
    load(); const t=setInterval(load,5*60*1000); return()=>clearInterval(t)
  }, [])

  const valid     = SOURCES.map(s=>({...s,data:prices[s.id]})).filter(s=>s.data?.ask>0)
  const bestAsk   = valid.length ? Math.min(...valid.map(s=>s.data.ask)) : 0
  const worstAsk  = valid.length ? Math.max(...valid.map(s=>s.data.ask)) : 0
  const savingsPct = bestAsk>0&&worstAsk>bestAsk ? ((worstAsk-bestAsk)/worstAsk*100) : 0
  const fgColor   = fg ? (FG_COLORS[fg.label]||'#eab308') : '#eab308'

  // Arbitrage: best net after 0.1% fees
  const arbSrc = valid.length >= 2 ? (() => {
    const cheap = valid.reduce((a,b) => a.data.ask<b.data.ask ? a : b)
    const dear  = valid.reduce((a,b) => a.data.ask>b.data.ask ? a : b)
    const net   = ((dear.data.ask - cheap.data.ask) / cheap.data.ask * 100 - 0.1)
    return net > 0.01 ? { from:cheap.label, to:dear.label, pct:net.toFixed(3) } : null
  })() : null

  return (
    <div style={{position:'relative'}}>
    <div className={styles.bar}>
      <span className={styles.bestLabel}>BEST PRICE</span>

      {SOURCES.map(src => {
        const data  = prices[src.id]
        // BEST = le prix le plus bas uniquement (pas un seuil), ou ex-aequo si < 0.001% d'écart
        const isBest = data?.ask>0 && bestAsk>0 && ((data.ask-bestAsk)/bestAsk*100) < 0.001
        const diffPct = data?.ask&&bestAsk>0 ? ((data.ask-bestAsk)/bestAsk*100) : null
        return (
          <div key={src.id} className={`${styles.src} ${isBest?styles.best:''}`}>
            <span className={styles.srcName}>{src.label}</span>
            <span className={styles.srcPx} style={isBest?{color:src.color}:{}}>
              {data?.ask ? fmtPx(data.ask) : <span className={styles.dash}>—</span>}
            </span>
            {isBest && valid.filter(v => ((v.data.ask-bestAsk)/bestAsk*100) < 0.001).length < valid.length && <span className={styles.bestTag}>BEST</span>}
            {diffPct!==null&&diffPct>0.001&&!isBest&&<span className={styles.diff}>+{diffPct.toFixed(3)}%</span>}
          </div>
        )
      })}

      {arbSrc && (
        <div className={styles.arb} title={`Acheter ${arbSrc.from}, vendre ${arbSrc.to} — net après frais`}>
          <span>⇄</span>
          <span>{arbSrc.from}→{arbSrc.to}</span>
          <span className={styles.arbPct}>+{arbSrc.pct}%</span>
        </div>
      )}

      <div className={styles.sep}/>
      {savingsPct>0.001 && (
        <div className={styles.savings}>
          <span>⚡</span>
          <strong>{savingsPct.toFixed(3)}%</strong>
          <span>économisé</span>
        </div>
      )}

      <button
        onClick={() => setAlertOpen(o => !o)}
        style={{background:'transparent',border:'1px solid rgba(255,255,255,.1)',borderRadius:'4px',color:alertOpen?'var(--grn)':'var(--txt3)',padding:'2px 8px',cursor:'pointer',fontSize:'11px',flexShrink:0}}
        title="Alertes prix"
      >🔔</button>

      {fg && <>
        <div className={styles.sep}/>
        <div className={styles.fgWrap}>
          <span className={styles.fgLabel}>F&G</span>
          <div className={styles.fgBar}>
            <div className={styles.fgFill} style={{width:`${fg.value}%`,background:fgColor}}/>
          </div>
          <span className={styles.fgVal} style={{color:fgColor}}>
            {fg.value} <span className={styles.fgText}>{fg.label}</span>
          </span>
        </div>
      </>}

      <span className={styles.nokyc}>no KYC · non-custodial</span>
    </div>
    {alertOpen && (
      <div style={{position:'absolute',top:'100%',right:'14px',width:'360px',background:'var(--bg1)',border:'1px solid var(--brd2)',borderRadius:'10px',zIndex:500,boxShadow:'0 8px 40px rgba(0,0,0,.8)',overflow:'hidden',maxHeight:'480px'}}>
        <PriceAlerts />
      </div>
    )}
    </div>
  )
}
