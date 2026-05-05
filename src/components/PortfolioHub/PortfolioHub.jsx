import { useState, useEffect, useCallback, useRef } from 'react'
import { useAccount } from 'wagmi'
import { hasApiKeys, futuresGetBalance, spotGetBalance, futuresGetPositions, getMyTrades } from '../../lib/bitunix'
import { useOnChainBalance } from '../../hooks/useBalance'
import { TradeJournal } from '../TradeJournal/TradeJournal'
import { PositionSizer } from '../PositionSizer/PositionSizer'
import { fmt, fmtPx } from '../../lib/format'
import styles from './PortfolioHub.module.css'

export function PortfolioHub({ onOpenWallet }) {
  const [tab, setTab] = useState('portfolio')
  const { address, isConnected } = useAccount()
  const onChain = useOnChainBalance()
  
  const [keyed, setKeyed] = useState(false)
  const [futBal, setFutBal] = useState(null)
  const [spotBal, setSpotBal] = useState([])
  const [positions, setPos] = useState([])
  const [loading, setLoading] = useState(false)
  const [spotPrices, setSpotPrices] = useState({})

  useEffect(() => {
    setKeyed(hasApiKeys())
    const h = () => setKeyed(hasApiKeys())
    window.addEventListener('fxs:keysUpdated', h)
    return () => window.removeEventListener('fxs:keysUpdated', h)
  }, [])

  const loadData = useCallback(async () => {
    if (!keyed) return
    setLoading(true)
    try {
      const [fb, sb, pos] = await Promise.all([
        futuresGetBalance().catch(()=>null),
        spotGetBalance().catch(()=>[]),
        futuresGetPositions().catch(()=>[])
      ])
      setFutBal(fb)
      setSpotBal(Array.isArray(sb)?sb:[])
      setPos(Array.isArray(pos)?pos:[])
    } catch(_) {}
    setLoading(false)
  }, [keyed])

  useEffect(() => {
    if (keyed) loadData()
    if (keyed) { const iv = setInterval(loadData, 15000); return () => clearInterval(iv) }
  }, [keyed])

  // Fetch prices for spot coins
  const fetchSpotPrices = useCallback(async (coins) => {
    const toFetch = coins.filter(c => c !== 'USDT' && !spotPrices[c])
    if (!toFetch.length) return
    const prices = {}
    await Promise.all(toFetch.map(async coin => {
      try {
        const r = await fetch(`https://api.binance.com/api/v3/ticker/price?symbol=${coin}USDT`, {signal: AbortSignal.timeout(3000)})
        const d = await r.json()
        if (d?.price) prices[coin] = parseFloat(d.price)
      } catch(_) {}
    }))
    if (Object.keys(prices).length) setSpotPrices(p => ({...p, ...prices}))
  }, [spotPrices])

  useEffect(() => {
    if (spotBal.length) {
      const coins = spotBal.filter(b => parseFloat(b.available||0) > 0.0001).map(b => b.coin)
      fetchSpotPrices(coins)
    }
  }, [spotBal])

  // Futures balance — try multiple field names for robustness
  const futAvail = parseFloat(futBal?.available || futBal?.availableBalance || 0)
  const futEquity = parseFloat(futBal?.equity || futBal?.accountEquity || futBal?.available || 0)
  const futUPnL = parseFloat(futBal?.unrealizedPNL || futBal?.unrealizedProfit || 0)
  const futMargin = parseFloat(futBal?.margin || futBal?.usedMargin || 0)
  // Total futures = available + margin used (si equity pas dispo)
  const futTotal = futEquity > 0 ? futEquity : (futAvail + futMargin)

  const spotTotal = spotBal.reduce((s,b) => {
    const amt = parseFloat(b.available||0)
    if (amt <= 0) return s
    if (b.coin === 'USDT') return s + amt
    const px = spotPrices[b.coin]
    return s + (px ? amt * px : 0)
  }, 0)

  const grandTotal = futTotal + spotTotal + (onChain?.totalUsd||0)

  return (
    <div className={styles.wrap}>
      <div className={styles.tabs}>
        {[["portfolio","📋 Portfolio"],["pnl","📈 PnL"],["perf","📅 Perf"],["sizer","📐 Sizer"],["journal","📓 Journal"]].map(([id,lbl])=>(
          <button key={id} className={styles.tab + (tab===id?" "+styles.tabOn:"")} onClick={()=>setTab(id)}>{lbl}</button>
        ))}
      </div>
      <div className={styles.content}>
        {tab==="portfolio" && (
          <div className={styles.port}>
            {!keyed && !isConnected ? (
              <div className={styles.empty}>
                <div style={{fontSize:40}}>📋</div>
                <div className={styles.emptyTitle}>Portfolio FXSEDGE</div>
                <div className={styles.emptySub}>Connecte ton wallet ou ton API Bitunix pour voir tes actifs</div>
                <div className={styles.emptyBtns}>
                  <button className={styles.emptyBtn} onClick={onOpenWallet}>Connecter Wallet</button>
                  <button className={styles.emptyBtn2} onClick={()=>window.dispatchEvent(new CustomEvent("fxs:openApiKey"))}>Connecter Bitunix</button>
                </div>
              </div>
            ) : (
              <>
                {/* Total */}
                <div className={styles.totalCard}>
                  <div className={styles.totalLabel}>Valeur totale estimée</div>
                  <div className={styles.totalValue}>${fmt(grandTotal, 2)}</div>
                  <div className={styles.totalSub}>Futures + Spot + On-chain</div>
                </div>

                {/* Futures */}
                {keyed && (
                  <div className={styles.section}>
                    <div className={styles.secTitle}>⚡ Futures Bitunix</div>
                    <div className={styles.grid}>
                      <div className={styles.stat}><span className={styles.statL}>Equity</span><span className={styles.statV}>${fmt(futTotal,2)}</span></div>
                      <div className={styles.stat}><span className={styles.statL}>Disponible</span><span className={styles.statV}>${fmt(futAvail,2)}</span></div>
                      <div className={styles.stat}><span className={styles.statL}>PnL non-réalisé</span><span className={styles.statV} style={{color:futUPnL>=0?"var(--grn)":"var(--red)"}}>{futUPnL>=0?"+":""}{fmt(futUPnL,2)}</span></div>
                      <div className={styles.stat}><span className={styles.statL}>Positions</span><span className={styles.statV}>{positions.length}</span></div>
                    </div>
                  </div>
                )}

                {/* Spot */}
                {keyed && spotBal.length > 0 && (
                  <div className={styles.section}>
                    <div className={styles.secTitle}>💰 Spot Bitunix · ${fmt(spotTotal,2)}</div>
                    <div className={styles.assetList}>
                      {spotBal.filter(b=>parseFloat(b.available||0)>0.0001).map(b=>{
                        const amt = parseFloat(b.available||0)
                        const px = b.coin==='USDT' ? 1 : (spotPrices[b.coin]||0)
                        const usdVal = amt * px
                        return (
                        <div key={b.coin} className={styles.assetRow}>
                          <span className={styles.assetCoin}>{b.coin}</span>
                          <span className={styles.assetVal}>{fmt(amt, b.coin==="USDT"?2:6)}</span>
                          {px > 0 && b.coin !== 'USDT' && <span style={{fontSize:10,color:'var(--txt3)',fontFamily:'var(--mono)'}}>≈ ${fmt(usdVal,2)}</span>}
                        </div>
                      )})}
                    </div>
                  </div>
                )}

                {/* On-chain */}
                {isConnected && onChain && (
                  <div className={styles.section}>
                    <div className={styles.secTitle}>🔗 On-chain</div>
                    <div className={styles.assetList}>
                      {onChain.tokens?.filter(t=>t.balance>0).map(t=>(
                        <div key={t.symbol} className={styles.assetRow}>
                          <span className={styles.assetCoin}>{t.symbol}</span>
                          <span className={styles.assetVal}>{fmt(t.balance,t.symbol==="USDT"||t.symbol==="USDC"?2:6)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <button className={styles.refreshAll} onClick={loadData} disabled={loading}>
                  {loading ? "⏳ Chargement..." : "↻ Actualiser"}
                </button>
              </>
            )}
          </div>
        )}
        {tab==="pnl" && <PnLTracker />}
        {tab==="perf" && <PerfDashboard />}
        {tab==="sizer" && <PositionSizer />}
        {tab==="journal" && <TradeJournal />}
      </div>
    </div>
  )
}

// PnL Tracker
function PnLTracker() {
  const [trades, setTrades] = useState([])
  const [loading, setLoading] = useState(true)
  const canvasRef = useRef(null)

  useEffect(() => {
    if (!hasApiKeys()) { setLoading(false); return }
    getMyTrades().then(data => {
      const list = Array.isArray(data) ? data : data?.tradeList || []
      setTrades(list.sort((a,b) => (Number(a.ctime)||0) - (Number(b.ctime)||0)))
    }).catch(()=>{}).finally(()=>setLoading(false))
  }, [])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas || trades.length < 2) return
    const ctx = canvas.getContext('2d')
    const W = canvas.parentElement.offsetWidth || 400
    const H = 160
    canvas.width = W; canvas.height = H
    let cum = 0
    const pts = trades.map(t => { cum += parseFloat(t.profit||t.realizedPNL||0); return cum })
    const lo = Math.min(0, ...pts), hi = Math.max(0.01, ...pts), r = hi-lo||1
    ctx.fillStyle = '#09090b'; ctx.fillRect(0,0,W,H)
    const zy = H*(1-(0-lo)/r)
    ctx.strokeStyle='rgba(255,255,255,.1)';ctx.lineWidth=1;ctx.setLineDash([3,3])
    ctx.beginPath();ctx.moveTo(0,zy);ctx.lineTo(W,zy);ctx.stroke();ctx.setLineDash([])
    ctx.beginPath()
    pts.forEach((p,i)=>{const x=(i/(pts.length-1))*W,y=H*(1-(p-lo)/r);i===0?ctx.moveTo(x,y):ctx.lineTo(x,y)})
    ctx.strokeStyle=cum>=0?'#8cc63f':'#ff3b5c';ctx.lineWidth=2;ctx.stroke()
    ctx.lineTo(W,zy);ctx.lineTo(0,zy);ctx.closePath()
    ctx.fillStyle=cum>=0?'rgba(140,198,63,.08)':'rgba(255,59,92,.08)';ctx.fill()
    ctx.fillStyle='rgba(255,255,255,.4)';ctx.font='9px monospace';ctx.textAlign='left'
    ctx.fillText(`+${fmt(hi,2)}`,4,12);ctx.fillText(`${fmt(lo,2)}`,4,H-4)
    ctx.textAlign='right';ctx.fillText(`Net: ${cum>=0?'+':''}${fmt(cum,2)}`,W-4,12)
  }, [trades])

  if (loading) return <div style={{padding:20,textAlign:'center',color:'var(--txt3)'}}>Chargement...</div>
  if (!hasApiKeys()) return <div style={{padding:20,textAlign:'center',color:'var(--txt3)'}}>Connecte ton API Bitunix</div>
  const totalPnl = trades.reduce((s,t) => s + parseFloat(t.profit||t.realizedPNL||0), 0)
  const totalFees = trades.reduce((s,t) => s + Math.abs(parseFloat(t.fee||0)), 0)
  const wins = trades.filter(t => parseFloat(t.profit||t.realizedPNL||0) > 0).length
  const wr = trades.length > 0 ? (wins/trades.length*100).toFixed(0) : '—'
  return (
    <div style={{padding:12,display:'flex',flexDirection:'column',gap:12}}>
      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:8}}>
        {[['PnL Net',`${totalPnl>=0?'+':''}${fmt(totalPnl,2)}`,totalPnl>=0?'var(--grn)':'var(--red)'],['Win Rate',`${wr}%`,'var(--txt)'],['Trades',trades.length,'var(--txt)']].map(([l,v,c],i)=>(
          <div key={i} style={{background:'var(--bg2)',padding:12,borderRadius:8,border:'1px solid var(--brd)',textAlign:'center'}}>
            <div style={{fontSize:10,color:'var(--txt3)'}}>{l}</div>
            <div style={{fontSize:18,fontWeight:800,fontFamily:'var(--mono)',color:c}}>{v}</div>
          </div>
        ))}
      </div>
      <div style={{background:'var(--bg2)',borderRadius:8,border:'1px solid var(--brd)',overflow:'hidden'}}>
        <div style={{padding:'8px 12px',fontSize:10,color:'var(--txt3)',borderBottom:'1px solid var(--brd)',display:'flex',justifyContent:'space-between',alignItems:'center'}}>
          <span>Courbe equity · Fees: {fmt(totalFees,2)} USDT</span>
          <button onClick={()=>{
            const header = 'Date,Symbol,Side,Qty,Price,PnL,Fee,Leverage\n'
            const rows = trades.map(t => {
              let dateStr = ''
              try { const ts = Number(t.ctime); const d = new Date(ts < 1e12 ? ts*1000 : ts); if (!isNaN(d)) dateStr = d.toISOString() } catch {}
              return [
                dateStr, t.symbol||'', t.side||'', t.qty||t.tradeQty||'', t.price||t.tradePrice||'',
                t.profit||t.realizedPNL||'0', t.fee||'0', t.leverage||''
              ].join(',')
            }).join('\n')
            const blob = new Blob([header+rows], {type:'text/csv'})
            const url = URL.createObjectURL(blob)
            const a = document.createElement('a')
            a.href=url; a.download=`fxsedge-trades-${new Date().toISOString().slice(0,10)}.csv`; a.click()
            URL.revokeObjectURL(url)
          }} style={{padding:'3px 8px',border:'1px solid var(--brd)',borderRadius:4,background:'transparent',color:'var(--txt3)',fontSize:9,cursor:'pointer'}}>
            📥 Export CSV
          </button>
        </div>
        <canvas ref={canvasRef} style={{width:'100%',height:160,display:'block'}}/>
      </div>
      <div style={{maxHeight:200,overflowY:'auto'}}>
        {trades.slice().reverse().slice(0,20).map((t,i)=>{
          const pnl=parseFloat(t.profit||t.realizedPNL||0)
          return <div key={i} style={{display:'flex',justifyContent:'space-between',padding:'6px 0',borderBottom:'1px solid var(--brd)',fontSize:10}}>
            <span style={{color:'var(--txt3)'}}>{(t.symbol||'').replace('USDT','')}</span>
            <span style={{color:(t.side||'')==='BUY'?'var(--grn)':'var(--red)',fontWeight:700}}>{t.side}</span>
            <span style={{fontFamily:'var(--mono)'}}>{t.qty||t.tradeQty||'—'}</span>
            <span style={{fontFamily:'var(--mono)',color:pnl>=0?'var(--grn)':'var(--red)',fontWeight:700}}>{pnl>=0?'+':''}{fmt(pnl,4)}</span>
          </div>})}
      </div>
    </div>
  )
}

// Performance Dashboard — Calendar Heatmap
function PerfDashboard() {
  const [trades, setTrades] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!hasApiKeys()) { setLoading(false); return }
    getMyTrades().then(data => {
      const list = Array.isArray(data) ? data : data?.tradeList || []
      setTrades(list)
    }).catch(()=>{}).finally(()=>setLoading(false))
  }, [])

  if (loading) return <div style={{padding:20,textAlign:'center',color:'var(--txt3)'}}>Chargement...</div>
  if (!hasApiKeys()) return <div style={{padding:20,textAlign:'center',color:'var(--txt3)'}}>Connecte ton API Bitunix</div>

  // Group PnL by day
  const dailyPnl = {}
  trades.forEach(t => {
    const pnl = parseFloat(t.profit||t.realizedPNL||0)
    const d = (() => { try { if (!t.ctime) return null; const ts = Number(t.ctime); const date = new Date(ts < 1e12 ? ts*1000 : ts); return isNaN(date) ? null : date.toISOString().slice(0,10) } catch { return null } })()
    if (!d) return
    dailyPnl[d] = (dailyPnl[d]||0) + pnl
  })

  // Generate last 90 days
  const days = []
  const now = new Date()
  for (let i = 89; i >= 0; i--) {
    const d = new Date(now); d.setDate(d.getDate()-i)
    const key = d.toISOString().slice(0,10)
    days.push({ date: key, pnl: dailyPnl[key]||0, day: d.getDay(), weekNum: Math.floor(i/7) })
  }

  const maxPnl = Math.max(1, ...days.map(d => Math.abs(d.pnl)))
  const totalPnl = days.reduce((s,d) => s+d.pnl, 0)
  const tradingDays = days.filter(d => d.pnl !== 0).length
  const winDays = days.filter(d => d.pnl > 0).length

  const getColor = (pnl) => {
    if (pnl === 0) return 'rgba(255,255,255,.03)'
    const intensity = Math.min(1, Math.abs(pnl)/maxPnl)
    return pnl > 0
      ? `rgba(140,198,63,${0.1+intensity*0.6})`
      : `rgba(255,59,92,${0.1+intensity*0.6})`
  }

  return (
    <div style={{padding:12,display:'flex',flexDirection:'column',gap:12}}>
      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr 1fr',gap:8}}>
        {[
          ['PnL 90j', `${totalPnl>=0?'+':''}${fmt(totalPnl,2)}`, totalPnl>=0?'var(--grn)':'var(--red)'],
          ['Jours actifs', tradingDays, 'var(--txt)'],
          ['Jours gagnants', winDays, 'var(--grn)'],
          ['Win Days %', tradingDays ? (winDays/tradingDays*100).toFixed(0)+'%' : '—', 'var(--txt)'],
        ].map(([l,v,c],i) => (
          <div key={i} style={{background:'var(--bg2)',padding:10,borderRadius:8,border:'1px solid var(--brd)',textAlign:'center'}}>
            <div style={{fontSize:9,color:'var(--txt3)'}}>{l}</div>
            <div style={{fontSize:15,fontWeight:800,fontFamily:'var(--mono)',color:c}}>{v}</div>
          </div>
        ))}
      </div>

      <div style={{background:'var(--bg2)',borderRadius:8,border:'1px solid var(--brd)',padding:12}}>
        <div style={{fontSize:10,color:'var(--txt3)',marginBottom:8}}>Calendar Heatmap · 90 jours</div>
        <div style={{display:'grid',gridTemplateColumns:'repeat(13,1fr)',gap:2}}>
          {days.map((d,i) => (
            <div key={i} title={`${d.date}: ${d.pnl>=0?'+':''}${fmt(d.pnl,2)} USDT`}
              style={{
                aspectRatio:'1',borderRadius:3,background:getColor(d.pnl),
                cursor:'pointer',transition:'transform .1s',minWidth:0,
              }}
              onMouseEnter={e=>e.target.style.transform='scale(1.3)'}
              onMouseLeave={e=>e.target.style.transform='scale(1)'}
            />
          ))}
        </div>
        <div style={{display:'flex',justifyContent:'space-between',marginTop:6,fontSize:8,color:'var(--txt3)'}}>
          <span>{days[0]?.date}</span>
          <div style={{display:'flex',gap:3,alignItems:'center'}}>
            <span>Perte</span>
            {[0.15,0.3,0.5].map((a,i)=><div key={i} style={{width:10,height:10,borderRadius:2,background:`rgba(255,59,92,${a})`}}/>)}
            <div style={{width:10,height:10,borderRadius:2,background:'rgba(255,255,255,.03)'}}/>
            {[0.15,0.3,0.5].map((a,i)=><div key={i} style={{width:10,height:10,borderRadius:2,background:`rgba(140,198,63,${a})`}}/>)}
            <span>Gain</span>
          </div>
          <span>{days[days.length-1]?.date}</span>
        </div>
      </div>
    </div>
  )
}
