import { useState, useEffect } from 'react'
import { useStore } from '../../store'
import styles from './SentimentHub.module.css'
import { logSilent } from '../../lib/errorMonitor'

const gauge = (val, max=100) => {
  const pct = Math.min(100, Math.max(0, val/max*100))
  return pct
}

export function SentimentHub() {
  const pair = useStore(s => s.pair)
  const [fg, setFg]         = useState(null)
  const [lsRatio, setLs]    = useState(null)
  const [fundRate, setFund] = useState(null)
  const [polymarket, setPoly] = useState(null)
  const [loading, setLoading] = useState(false)

  const load = async () => {
    setLoading(true)
    try {
      // Fear & Greed
      const fgR = await fetch('https://api.alternative.me/fng/?limit=3', {signal:AbortSignal.timeout(5000)})
      const fgD = await fgR.json()
      setFg(fgD.data)
    } catch(e){logSilent(e,'SentimentHub')}

    try {
      // Binance Long/Short ratio
      const sym = 'BTCUSDT'
      const lsR = await fetch(`https://fapi.binance.com/futures/data/globalLongShortAccountRatio?symbol=${sym}&period=5m&limit=3`, {signal:AbortSignal.timeout(5000)})
      const lsD = await lsR.json()
      setLs(lsD)
    } catch(e){logSilent(e,'SentimentHub')}

    try {
      // Funding rate
      const frR = await fetch('https://fapi.binance.com/fapi/v1/premiumIndex?symbol=BTCUSDT', {signal:AbortSignal.timeout(5000)})
      const frD = await frR.json()
      setFund(parseFloat(frD.lastFundingRate)*100)
    } catch(e){logSilent(e,'SentimentHub')}

    try {
      // Polymarket: BTC above $100K by end of 2025
      const polyR = await fetch('https://clob.polymarket.com/markets?next_cursor=&active=true&closed=false&tag_slug=bitcoin', {signal:AbortSignal.timeout(5000)})
      const polyD = await polyR.json()
      const btcMarket = polyD.data?.find(m => m.question?.toLowerCase().includes('bitcoin') && m.question?.toLowerCase().includes('100'))
      if (btcMarket) {
        setPoly({ question: btcMarket.question, yes: btcMarket.outcomePrices?.[0], no: btcMarket.outcomePrices?.[1] })
      }
    } catch(e){logSilent(e,'SentimentHub')}

    setLoading(false)
  }

  useEffect(() => { load(); const t=setInterval(load,5*60*1000); return()=>clearInterval(t) }, [])

  const fgVal   = fg?.[0] ? parseInt(fg[0].value) : null
  const fgLabel = fg?.[0]?.value_classification || '—'
  const fgColor = fgVal !== null ? (fgVal < 25 ? '#ef4444' : fgVal < 45 ? '#f97316' : fgVal < 55 ? '#eab308' : fgVal < 75 ? '#22c55e' : '#16a34a') : 'var(--txt3)'

  const lsVal  = lsRatio?.[0] ? parseFloat(lsRatio[0].longShortRatio) : null
  const longPct = lsVal ? (lsVal / (1+lsVal) * 100) : 50
  const lsSignal = longPct > 65 ? '🔴 Retail trop Long → Bearish' : longPct < 35 ? '🟢 Retail trop Short → Bullish' : '⚪ Équilibré'

  const fundColor = fundRate === null ? 'var(--txt3)' : fundRate > 0.05 ? '#ef4444' : fundRate > 0 ? '#f97316' : '#22c55e'

  // Global score composite
  let score = 50
  if (fgVal !== null) score = score*0.5 + fgVal*0.5
  if (lsVal !== null) score = score*0.7 + (longPct > 50 ? longPct : 100-longPct)*0.3
  if (fundRate !== null) {
    const fundScore = fundRate > 0.05 ? 20 : fundRate > 0.01 ? 40 : fundRate < 0 ? 80 : 60
    score = score*0.8 + fundScore*0.2
  }
  score = Math.round(score)
  const scoreLabel = score < 25 ? 'Peur Extrême' : score < 45 ? 'Peur' : score < 55 ? 'Neutre' : score < 75 ? 'Avidité' : 'Avidité Extrême'
  const scoreColor = score < 25 ? '#ef4444' : score < 45 ? '#f97316' : score < 55 ? '#eab308' : score < 75 ? '#22c55e' : '#16a34a'

  return (
    <div className={styles.wrap}>
      <div className={styles.header}>
        <span className={styles.title}>🧠 Sentiment Aggregator</span>
        <button className={styles.refreshBtn} onClick={load} disabled={loading}>{loading?'⟳':'↻'}</button>
      </div>

      {/* Global score */}
      <div className={styles.scoreBlock}>
        <div className={styles.scoreCircle} style={{borderColor:scoreColor}}>
          <span className={styles.scoreNum} style={{color:scoreColor}}>{score}</span>
          <span className={styles.scoreLbl}>/100</span>
        </div>
        <div className={styles.scoreRight}>
          <div className={styles.scoreLabel} style={{color:scoreColor}}>{scoreLabel}</div>
          <div className={styles.scoreDesc}>Score composite : F&G + Long/Short + Funding</div>
          <div className={styles.scoreMeter}>
            <div className={styles.meterTrack}>
              <div className={styles.meterFill} style={{width:score+'%',background:scoreColor}}/>
              <div className={styles.meterCursor} style={{left:score+'%'}}/>
            </div>
            <div className={styles.meterLabels}>
              <span>Peur</span><span>Neutre</span><span>Avidité</span>
            </div>
          </div>
        </div>
      </div>

      {/* Fear & Greed */}
      <div className={styles.card}>
        <div className={styles.cardHeader}>
          <span className={styles.cardTitle}>😱 Fear & Greed Index</span>
          <span className={styles.cardVal} style={{color:fgColor}}>{fgVal ?? '—'} · {fgLabel}</span>
        </div>
        {fg && (
          <div className={styles.history}>
            {fg.slice(0,3).map((d,i) => (
              <div key={i} className={styles.histRow}>
                <span className={styles.histDate}>{i===0?'Aujourd\'hui':i===1?'Hier':'J-2'}</span>
                <div className={styles.histBar}>
                  <div style={{width:d.value+'%',height:'100%',background:parseInt(d.value)<50?'#ef4444':'#22c55e',borderRadius:2}}/>
                </div>
                <span className={styles.histVal}>{d.value}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Long/Short Ratio */}
      <div className={styles.card}>
        <div className={styles.cardHeader}>
          <span className={styles.cardTitle}>📊 Long/Short Ratio BTC · Binance</span>
        </div>
        <div className={styles.signal}>{lsSignal}</div>
        {lsRatio && (
          <div className={styles.lsBar}>
            <span className={styles.lsLong} style={{color:'var(--grn)'}}>{longPct.toFixed(1)}% Long</span>
            <div className={styles.lsTrack}>
              <div style={{width:longPct+'%',height:'100%',background:'var(--grn)',transition:'width .5s'}}/>
              <div style={{width:(100-longPct)+'%',height:'100%',background:'var(--red)'}}/>
            </div>
            <span className={styles.lsShort} style={{color:'var(--red)'}}>{(100-longPct).toFixed(1)}% Short</span>
          </div>
        )}
      </div>

      {/* Funding Rate */}
      <div className={styles.card}>
        <div className={styles.cardHeader}>
          <span className={styles.cardTitle}>💰 Funding Rate BTC Perp</span>
          <span className={styles.cardVal} style={{color:fundColor}}>
            {fundRate !== null ? (fundRate>=0?'+':'')+fundRate.toFixed(4)+'%' : '—'}
          </span>
        </div>
        <div className={styles.fundDesc}>
          {fundRate === null ? '—'
            : fundRate > 0.05 ? '🔴 Longs paient beaucoup — suracheté, attention'
            : fundRate > 0.01 ? '🟡 Marché haussier modéré'
            : fundRate < -0.01 ? '🟢 Shorts paient — opportunité long potentielle'
            : '⚪ Funding neutre — marché équilibré'}
        </div>
      </div>

      {polymarket && (
        <div className={styles.card}>
          <div className={styles.cardHeader}>
            <span className={styles.cardTitle}>🎲 Polymarket — Prédiction marché</span>
          </div>
          <div style={{fontSize:12,color:'var(--txt2)',marginBottom:8,lineHeight:1.4}}>{polymarket.question}</div>
          <div style={{display:'flex',gap:16}}>
            <div style={{flex:1,textAlign:'center',padding:'8px',background:'rgba(140,198,63,.08)',borderRadius:6,border:'1px solid rgba(140,198,63,.2)'}}>
              <div style={{fontSize:18,fontWeight:800,color:'var(--grn)',fontFamily:'var(--mono)'}}>{polymarket.yes ? (parseFloat(polymarket.yes)*100).toFixed(0)+'%' : '—'}</div>
              <div style={{fontSize:10,color:'var(--txt3)'}}>OUI</div>
            </div>
            <div style={{flex:1,textAlign:'center',padding:'8px',background:'rgba(255,59,92,.08)',borderRadius:6,border:'1px solid rgba(255,59,92,.2)'}}>
              <div style={{fontSize:18,fontWeight:800,color:'var(--red)',fontFamily:'var(--mono)'}}>{polymarket.no ? (parseFloat(polymarket.no)*100).toFixed(0)+'%' : '—'}</div>
              <div style={{fontSize:10,color:'var(--txt3)'}}>NON</div>
            </div>
          </div>
        </div>
      )}
      {/* Smart Money Score */}
      <div className={styles.card}>
        <div className={styles.cardHeader}>
          <span className={styles.cardTitle}>🎯 Smart Money Score</span>
          <span className={styles.cardVal} style={{color:scoreColor,fontSize:16,fontWeight:800}}>{score}/100</span>
        </div>
        <div className={styles.scoreMeter}>
          <div className={styles.meterTrack}>
            <div className={styles.meterFill} style={{width:score+'%',background:scoreColor}}/>
          </div>
          <div className={styles.meterLabels}>
            <span style={{color:'#ef4444'}}>Peur extrême</span>
            <span>Neutre</span>
            <span style={{color:'#22c55e'}}>Avidité</span>
          </div>
        </div>
        <div style={{fontSize:11,color:'var(--txt3)',marginTop:8,lineHeight:1.6}}>
          Score composite: F&G ({fgVal??'—'}) · L/S Ratio · Funding ({fundRate!==null?(fundRate>=0?'+':'')+fundRate.toFixed(4)+'%':'—'})
        </div>
      </div>

      <div className={styles.footer}>Alternative.me · Binance Futures · Polymarket · Refresh 5min</div>
    </div>
  )
}
