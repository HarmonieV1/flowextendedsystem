import { useState, useEffect, useRef } from 'react'
import { useStore } from '../../store'
import { fmtPx } from '../../lib/format'
import styles from './AggregatedBook.module.css'
import { logSilent } from '../../lib/errorMonitor'

const EXCHANGES = ['Binance','Bybit','Bitget']
const LEVELS = 15

function mergeBooks(books) {
  const bidMap = {}, askMap = {}
  Object.entries(books).forEach(([ex, {bids,asks}]) => {
    bids.forEach(([p,v]) => { bidMap[p] = (bidMap[p]||{total:0,exchanges:{}}); bidMap[p].total+=v; bidMap[p].exchanges[ex]=(bidMap[p].exchanges[ex]||0)+v })
    asks.forEach(([p,v]) => { askMap[p] = (askMap[p]||{total:0,exchanges:{}}); askMap[p].total+=v; askMap[p].exchanges[ex]=(askMap[p].exchanges[ex]||0)+v })
  })
  const bids = Object.entries(bidMap).map(([p,d])=>[parseFloat(p),d.total,d.exchanges]).sort((a,b)=>b[0]-a[0]).slice(0,LEVELS)
  const asks = Object.entries(askMap).map(([p,d])=>[parseFloat(p),d.total,d.exchanges]).sort((a,b)=>a[0]-b[0]).slice(0,LEVELS)
  return {bids,asks}
}

export function AggregatedBook() {
  const pair = useStore(s => s.pair)
  const [books, setBooks] = useState({})
  const [merged, setMerged] = useState({bids:[],asks:[]})
  const [status, setStatus] = useState({})
  const wsRefs = useRef({})

  useEffect(() => {
    setBooks({}); setMerged({bids:[],asks:[]})
    Object.values(wsRefs.current).forEach(ws => { try{ws.close()}catch(e){logSilent(e,'AggregatedBook')} })
    wsRefs.current = {}

    const sym = pair.toLowerCase()

    // Binance
    const throttleMs = 1500
    let binTs = 0, bybTs = 0, bitTs = 0
    const bin = new WebSocket(`wss://stream.binance.com:9443/ws/${sym}@depth20@1000ms`)
    bin.onopen = () => setStatus(p=>({...p,Binance:'🟢'}))
    bin.onclose = () => setStatus(p=>({...p,Binance:'🔴'}))
    bin.onmessage = e => {
      const now = Date.now(); if (now - binTs < throttleMs) return; binTs = now
      try {
        const d = JSON.parse(e.data)
        const bids = d.bids.map(([p,v])=>[parseFloat(p),parseFloat(v)])
        const asks = d.asks.map(([p,v])=>[parseFloat(p),parseFloat(v)])
        setBooks(prev => {
          const next = {...prev, Binance:{bids,asks}}
          setMerged(mergeBooks(next))
          return next
        })
      } catch(e){logSilent(e,'AggregatedBook')}
    }
    wsRefs.current.Binance = bin

    // Bybit
    const byb = new WebSocket('wss://stream.bybit.com/v5/public/spot')
    byb.onopen = () => {
      setStatus(p=>({...p,Bybit:'🟢'}))
      byb.send(JSON.stringify({op:'subscribe',args:[`orderbook.50.${pair}`]}))
    }
    byb.onclose = () => setStatus(p=>({...p,Bybit:'🔴'}))
    byb.onmessage = e => {
      const now = Date.now(); if (now - bybTs < throttleMs) return; bybTs = now
      try {
        const d = JSON.parse(e.data)
        if (d.data?.b && d.data?.a) {
          const bids = d.data.b.map(([p,v])=>[parseFloat(p),parseFloat(v)])
          const asks = d.data.a.map(([p,v])=>[parseFloat(p),parseFloat(v)])
          setBooks(prev => {
            const next = {...prev, Bybit:{bids,asks}}
            setMerged(mergeBooks(next))
            return next
          })
        }
      } catch(e){logSilent(e,'AggregatedBook')}
    }
    wsRefs.current.Bybit = byb

    // Bitget WS
    const bitget = new WebSocket('wss://ws.bitget.com/v2/ws/public')
    bitget.onopen = () => {
      setStatus(p=>({...p,Bitget:'🟢'}))
      bitget.send(JSON.stringify({op:'subscribe',args:[{instType:'SPOT',channel:'books5',instId:pair.replace('USDT','-USDT')}]}))
      const ping = setInterval(()=>{ if(bitget.readyState===1) bitget.send('ping') },20000)
      bitget._ping = ping
    }
    bitget.onclose = () => { clearInterval(bitget._ping); setStatus(p=>({...p,Bitget:'🔴'})) }
    bitget.onmessage = e => {
      const now = Date.now(); if (now - bitTs < throttleMs) return; bitTs = now
      try {
        if(e.data==='pong') return
        const d = JSON.parse(e.data)
        if (d.data?.[0]?.bids) {
          const bids = d.data[0].bids.map(([p,v])=>[parseFloat(p),parseFloat(v)])
          const asks = d.data[0].asks.map(([p,v])=>[parseFloat(p),parseFloat(v)])
          setBooks(prev => {
            const next = {...prev, Bitget:{bids,asks}}
            setMerged(mergeBooks(next))
            return next
          })
        }
      } catch(e){logSilent(e,'AggregatedBook')}
    }
    wsRefs.current.Bitget = bitget

    return () => { Object.values(wsRefs.current).forEach(ws=>{try{ws.close()}catch(e){logSilent(e,'AggregatedBook')}}) }
  }, [pair])

  const maxVol = Math.max(
    ...merged.bids.map(b=>b[1]),
    ...merged.asks.map(a=>a[1]),
    1
  )

  const EX_COLORS = {Binance:'#f0b90b',Bybit:'#ff6b00',Bitget:'#00b4d8'}

  return (
    <div className={styles.wrap}>
      <div className={styles.header}>
        <span className={styles.title}>📚 Carnet Agrégé</span>
        <span className={styles.pair}>{pair.replace('USDT','/USDT')}</span>
        <div className={styles.statuses}>
          {EXCHANGES.map(ex => <span key={ex} className={styles.exStatus}>{status[ex]||'⚫'} {ex}</span>)}
        </div>
      </div>

      <div className={styles.cols}>
        {/* BIDS */}
        <div className={styles.col}>
          <div className={styles.colHead}>
            <span>Volume</span><span>Prix</span>
          </div>
          {merged.bids.map(([price, vol, exs], i) => (
            <div key={price+i} className={styles.bidRow}>
              <div className={styles.bar}>
                <div className={styles.barFillBid} style={{width:(vol/maxVol*100)+'%'}}/>
              </div>
              <span className={styles.vol}>{vol.toFixed(3)}</span>
              <span className={styles.price} style={{color:'var(--grn)'}}>{fmtPx(price)}</span>
              <div className={styles.exDots}>
                {EXCHANGES.map(ex => exs[ex] ? <span key={ex} style={{background:EX_COLORS[ex]}} className={styles.dot} title={ex}/> : <span key={ex} className={styles.dotEmpty}/>)}
              </div>
            </div>
          ))}
        </div>

        {/* ASKS */}
        <div className={styles.col}>
          <div className={styles.colHead}>
            <span>Prix</span><span>Volume</span>
          </div>
          {merged.asks.map(([price, vol, exs], i) => (
            <div key={price+i} className={styles.askRow}>
              <div className={styles.exDots}>
                {EXCHANGES.map(ex => exs[ex] ? <span key={ex} style={{background:EX_COLORS[ex]}} className={styles.dot} title={ex}/> : <span key={ex} className={styles.dotEmpty}/>)}
              </div>
              <span className={styles.price} style={{color:'var(--red)'}}>{fmtPx(price)}</span>
              <span className={styles.vol}>{vol.toFixed(3)}</span>
              <div className={styles.bar}>
                <div className={styles.barFillAsk} style={{width:(vol/maxVol*100)+'%'}}/>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className={styles.legend}>
        {EXCHANGES.map(ex => (
          <span key={ex} className={styles.legItem}>
            <span style={{background:EX_COLORS[ex]}} className={styles.legDot}/>
            {ex}
          </span>
        ))}
      </div>
      <div className={styles.footer}>Binance + Bybit + OKX · Temps réel · Murs = même niveau sur 2+ exchanges</div>
    </div>
  )
}
