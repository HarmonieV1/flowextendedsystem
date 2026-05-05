import { useState, useEffect, useCallback, useRef } from 'react'
import { useAccount, usePublicClient } from 'wagmi'
import { useStore } from '../../store'
import { fmtPx, fmt } from '../../lib/format'
import { useT } from '../../lib/i18n'
import { TradeCard } from '../TradeCard/TradeCard'
import { recordTrade } from '../SessionBar/SessionBar'
import {
  hasApiKeys, futuresPlaceOrder, futuresGetBalance,
  futuresGetPositions, futuresClosePosition, futuresSetLeverage,
  getOpenOrders, getMyTrades, loadApiKeysAsync
} from '../../lib/bitunix'
import { hasBitgetKeys, bitgetFuturesBalance, bitgetGetPositions, bitgetPlaceOrder, bitgetClosePosition, bitgetGetOrders, bitgetGetHistory, loadBitgetKeysAsync } from '../../lib/bitget'
import styles from './FuturesWidget.module.css'
import { logSilent } from '../../lib/errorMonitor'

const LEVERAGE_PRESETS = [2,5,10,20,50,100]
const EXCHANGES = [
  { id: 'bitunix', label: 'Bitunix', hasKeys: hasApiKeys },
  { id: 'bitget',  label: 'Bitget',  hasKeys: hasBitgetKeys },
]

export function FuturesWidget({ onOpenWallet }) {
  const t = useT()
  const pair   = useStore(s => s.pair)
  const lastPx = useStore(s => s.lastPx)
  const base   = pair.replace('USDT','')

  const [keyed, setKeyed]     = useState(false)
  const [exchange, setExchange] = useState('bitunix')
  const [sorEnabled, setSorEnabled] = useState(() => {
    try { return localStorage.getItem('fxs_sor_enabled') === 'true' } catch { return false }
  })
  const comparatorPrices = useStore(s => s.comparatorPrices) || {}
  const [side, setSide]       = useState('long')
  const [orderType, setOType] = useState('market')
  const [qty, setQty]         = useState('')
  const [price, setPrice]     = useState('')
  const [leverage, setLev]    = useState(10)
  const [tpsl, setTpsl]       = useState(false)
  const [tp, setTp]           = useState('')
  const [sl, setSl]           = useState('')
  const [tab, setTab]         = useState('trade')
  const [loading, setLoad]    = useState(false)
  const [submitting, setSub]  = useState(false)
  const [ok, setOk]           = useState('')
  const [err, setErr]         = useState('')
  const [balance, setBalance] = useState(null)
  const [positions, setPos]   = useState([])
  const [orders, setOrders]   = useState([])
  const [history, setHistory] = useState([])
  const [shareTrade, setShareTrade] = useState(null)

  const posUSD = qty && lastPx ? parseFloat(qty)*lastPx : 0

  // Check clés — re-check when exchange changes; wait for async load
  useEffect(() => {
    let cancelled = false
    const check = async () => {
      // Ensure encrypted keys are loaded from IndexedDB
      await Promise.all([loadApiKeysAsync().catch(()=>null), loadBitgetKeysAsync().catch(()=>null)])
      if (cancelled) return
      setKeyed(exchange === 'bitget' ? hasBitgetKeys() : hasApiKeys())
    }
    check()
    const onUpdate = () => setKeyed(exchange === 'bitget' ? hasBitgetKeys() : hasApiKeys())
    window.addEventListener('fxs:keysUpdated', onUpdate)
    return () => { cancelled = true; window.removeEventListener('fxs:keysUpdated', onUpdate) }
  }, [exchange])

  // Keyboard shortcuts
  const handleTradeRef = useRef(null)
  const closeAllRef = useRef(null)

  useEffect(() => {
    const h = e => {
      if (['INPUT','TEXTAREA','SELECT'].includes(e.target.tagName)) return
      if (e.key==='l'||e.key==='L') setSide('long')
      if (e.key==='x'||e.key==='X') setSide('short')
      if (e.key==='m'||e.key==='M') setOType('market')
      if (e.key==='p'||e.key==='P') setOType('limit')
      if (e.key==='1') { setLev(2); e.preventDefault() }
      if (e.key==='2') { setLev(5); e.preventDefault() }
      if (e.key==='3') { setLev(10); e.preventDefault() }
      if (e.key==='4') { setLev(20); e.preventDefault() }
      if (e.key==='5') { setLev(50); e.preventDefault() }
      if (e.key==='6') { setLev(100); e.preventDefault() }
      if (e.key==='Enter' && handleTradeRef.current) handleTradeRef.current()
      if (e.key==='Escape') { setQty(''); setTp(''); setSl(''); setErr(''); setOk('') }
      if ((e.key==='q'||e.key==='Q') && closeAllRef.current) closeAllRef.current()
      if (e.key==='t'||e.key==='T') setTab('trade')
      if (e.key==='o'||e.key==='O') { setTab('positions'); loadData() }
      if (e.key==='h'||e.key==='H') { setTab('history'); loadData() }
    }
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [])

  const loadData = useCallback(async () => {
    if (!keyed) return
    setLoad(true)
    try {
      if (exchange === 'bitget') {
        // Bitget API
        const [bal, pos, ords, hist] = await Promise.all([
          bitgetFuturesBalance().catch(()=>null),
          bitgetGetPositions().catch(()=>null),
          bitgetGetOrders().catch(()=>null),
          bitgetGetHistory().catch(()=>null),
        ])
        // Bitget balance: array of accounts, find USDT
        if (Array.isArray(bal)) {
          const usdt = bal.find(a => a.marginCoin === 'USDT')
          setBalance(usdt ? { available: usdt.available || usdt.crossedMaxAvailable } : null)
        } else {
          setBalance(bal)
        }
        setPos(Array.isArray(pos) ? pos : [])
        // Bitget orders: { entrustedList: [...] }
        const orderArr = Array.isArray(ords) ? ords : ords?.entrustedList || []
        setOrders(orderArr)
        // Bitget history: { fillList: [...] }
        const histArr = Array.isArray(hist) ? hist : hist?.fillList || []
        setHistory(histArr)
      } else {
        // Bitunix API (existing logic)
        const [bal, pos, ords, hist] = await Promise.all([
          futuresGetBalance(), futuresGetPositions(),
          getOpenOrders().catch(()=>null), getMyTrades().catch(()=>null)
        ])
        setBalance(bal)
        setPos(Array.isArray(pos) ? pos : [])
        const orderArr = Array.isArray(ords) ? ords : ords?.orderList || []
        setOrders(orderArr)
        const histArr = Array.isArray(hist) ? hist : hist?.tradeList || []
        setHistory(histArr)
      }
    } catch(e) { console.error(e.message) }
    setLoad(false)
  }, [keyed, exchange])

  // Auto-load data when keys are connected
  useEffect(() => { if (keyed) loadData() }, [keyed])

  // Persist SOR toggle
  useEffect(() => {
    try { localStorage.setItem('fxs_sor_enabled', String(sorEnabled)) } catch {}
  }, [sorEnabled])

  // Compute best exchange based on comparator prices when SOR is on
  const getBestExchange = useCallback(() => {
    if (!sorEnabled) return exchange
    const isLong = side === 'long'
    const bitunixPx = isLong ? comparatorPrices.bitunix?.ask : comparatorPrices.bitunix?.bid
    const bitgetPx  = isLong ? comparatorPrices.bitget?.ask  : comparatorPrices.bitget?.bid
    if (!bitunixPx && !bitgetPx) return exchange
    if (!bitgetPx) return 'bitunix'
    if (!bitunixPx) return hasBitgetKeys() ? 'bitget' : 'bitunix'
    const bitgetWins = isLong ? bitgetPx < bitunixPx : bitgetPx > bitunixPx
    if (bitgetWins && hasBitgetKeys()) return 'bitget'
    return 'bitunix'
  }, [sorEnabled, exchange, side, comparatorPrices])
  // Refresh every 10s when on positions/orders tab
  useEffect(() => {
    if (!keyed || tab==='trade') return
    const iv = setInterval(loadData, 10000)
    return () => clearInterval(iv)
  }, [keyed, tab])

  const lastOrderRef = useRef(0)
  const [confirmBig, setConfirmBig] = useState(null)

  const handleTrade = async () => {
    setErr(''); setOk('')
    if (!qty || parseFloat(qty)<=0) { setErr(t('enter_qty')); return }
    
    // Rate limit client: 1 ordre par seconde
    const now = Date.now()
    if (now - lastOrderRef.current < 1000) { setErr(t('wait_1s')); return }
    
    // Confirmation gros ordres: si marge > 50% du solde disponible
    const margin = posUSD / leverage
    if (avail && margin > avail * 0.5 && !confirmBig) {
      setConfirmBig({ margin, pct: Math.round(margin/avail*100) })
      return
    }
    setConfirmBig(null)
    
    lastOrderRef.current = now
    setSub(true)
    try {
      const targetExchange = getBestExchange()
      if (targetExchange === 'bitget') {
        // Bitget order
        await bitgetPlaceOrder({
          symbol: pair,
          side: side==='long'?'buy':'sell',
          qty: parseFloat(qty),
          price: orderType==='limit'?parseFloat(price):undefined,
          orderType: orderType==='limit'?'limit':'market',
          leverage,
        })
      } else {
        // Bitunix order
        await futuresSetLeverage({ symbol:pair, leverage })
        await futuresPlaceOrder({
          symbol: pair,
          side: side==='long'?'BUY':'SELL',
          qty: parseFloat(qty),
          price: orderType==='limit'?parseFloat(price):undefined,
          orderType: orderType==='limit'?'LIMIT':'MARKET',
          tradeSide: 'OPEN',
          tpPrice: tp?parseFloat(tp):undefined,
          slPrice: sl?parseFloat(sl):undefined,
        })
      }
      // Success feedback — show actual exchange used (in case SOR routed elsewhere)
      const usedLabel = targetExchange === 'bitget' ? 'Bitget' : 'Bitunix'
      setOk(`✓ ${side==='long'?'Long ↑':'Short ↓'} ${base} ×${leverage} → ${usedLabel}`)
      playOrderSound(side==='long')
      flashScreen(side==='long')
      setQty(''); setTp(''); setSl('')
      // Notify chart to refresh positions
      window.dispatchEvent(new CustomEvent('fxs:positionUpdate'))
      setTimeout(()=>{ setOk(''); loadData() }, 3000)
    } catch(e) { setErr(e.message) }
    setSub(false)
  }

  // Order sound
  const playOrderSound = (isLong) => {
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)()
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.connect(gain)
      gain.connect(ctx.destination)
      osc.type = 'sine'
      // Long = ascending tone, Short = descending
      if (isLong) {
        osc.frequency.setValueAtTime(600, ctx.currentTime)
        osc.frequency.linearRampToValueAtTime(900, ctx.currentTime + 0.15)
      } else {
        osc.frequency.setValueAtTime(900, ctx.currentTime)
        osc.frequency.linearRampToValueAtTime(600, ctx.currentTime + 0.15)
      }
      gain.gain.setValueAtTime(0.12, ctx.currentTime)
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3)
      osc.start(ctx.currentTime)
      osc.stop(ctx.currentTime + 0.3)
      setTimeout(() => ctx.close(), 500)
    } catch(e){logSilent(e,'FuturesWidget')}
  }

  // Flash screen effect
  const flashScreen = (isLong) => {
    const flash = document.createElement('div')
    flash.style.cssText = `position:fixed;inset:0;z-index:9999;pointer-events:none;
      background:${isLong ? 'rgba(140,198,63,0.08)' : 'rgba(255,59,92,0.08)'};
      animation:fxsFlash .4s ease-out forwards;`
    document.body.appendChild(flash)
    setTimeout(() => flash.remove(), 500)
    // Inject keyframes if not exists
    if (!document.getElementById('fxs-flash-style')) {
      const s = document.createElement('style')
      s.id = 'fxs-flash-style'
      s.textContent = '@keyframes fxsFlash{0%{opacity:1}100%{opacity:0}}'
      document.head.appendChild(s)
    }
  }

  const avail = balance?.available ? parseFloat(balance.available) : null

  // Keep ref current for keyboard Enter
  handleTradeRef.current = tab === 'trade' && qty && parseFloat(qty) > 0 && !submitting ? handleTrade : null

  // Close all positions for current pair
  const closeAllPositions = async () => {
    if (!positions.length) return
    for (const p of positions) {
      try {
        const isLong = (p.side||'').toUpperCase() === 'LONG' || (p.side||'').toUpperCase() === 'BUY'
        const pnl = parseFloat(p.unrealizedPNL || 0)
        if (exchange === 'bitget') {
          await bitgetClosePosition({symbol:p.symbol, side:isLong?'long':'short'})
        } else {
          await futuresClosePosition({symbol:p.symbol, side:isLong?'long':'short', qty:p.qty, positionId:p.positionId})
        }
        recordTrade({ pair: p.symbol, pnl, side: isLong ? 'long' : 'short' })
      } catch(e){logSilent(e,'FuturesWidget')}
    }
    playOrderSound(false)
    flashScreen(false)
    window.dispatchEvent(new CustomEvent('fxs:positionUpdate'))
    setTimeout(loadData, 1500)
  }
  closeAllRef.current = positions.length > 0 ? closeAllPositions : null

  return (
    <div className={styles.wrap}>
      <div className={styles.header}>
        <div className={styles.platInfo}>
          <div className={styles.platName}>
            <select value={exchange} onChange={e=>setExchange(e.target.value)} style={{background:'transparent',border:'1px solid var(--brd)',borderRadius:4,color:'var(--txt)',fontSize:11,fontWeight:700,padding:'2px 6px',cursor:'pointer',outline:'none'}}>
              <option value="bitunix" style={{background:'var(--bg1)'}}>⚡ Bitunix Perps</option>
              <option value="bitget" style={{background:'var(--bg1)'}}>⚡ Bitget Perps</option>
            </select>
          </div>
          <span className={styles.platTag}>CEX · 100+ paires · Jusqu'à 100× · Ref FXSA</span>
        </div>
        <div className={styles.pairBox}>
          <span className={styles.pairSym}>{base}/USDT</span>
          {lastPx>0 && <span className={styles.pairPx}>{fmtPx(lastPx)}</span>}
        </div>
      </div>

      {/* Exchange selector */}
      <div style={{display:'flex',gap:0,padding:'0 10px',borderBottom:'1px solid var(--brd)'}}>
        {EXCHANGES.map(ex => (
          <button key={ex.id} onClick={()=>{setExchange(ex.id); setPos([]); setOrders([]); setHistory([]); setBalance(null); setErr(''); setOk('')}} style={{
            flex:1,padding:'6px',fontSize:10,fontWeight:700,border:'none',borderBottom:exchange===ex.id?'2px solid var(--grn)':'2px solid transparent',
            background:'transparent',color:exchange===ex.id?'var(--txt)':'var(--txt3)',cursor:'pointer',transition:'.12s'
          }}>
            {ex.label} {ex.hasKeys() ? '●' : '○'}
          </button>
        ))}
      </div>

      {/* SOR Toggle — appears when both exchanges have keys */}
      {hasApiKeys() && hasBitgetKeys() && (
        <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'6px 12px',background:sorEnabled?'rgba(140,198,63,.05)':'transparent',borderBottom:'1px solid var(--brd)',fontSize:10}}>
          <div style={{display:'flex',alignItems:'center',gap:6}}>
            <span style={{color:sorEnabled?'var(--grn)':'var(--txt3)',fontWeight:700}}>⚡ Smart Order Routing</span>
            {sorEnabled && (() => {
              const best = getBestExchange()
              return best !== exchange ? (
                <span style={{fontSize:9,color:'var(--grn)',padding:'2px 6px',background:'rgba(140,198,63,.1)',borderRadius:3}}>
                  → {best === 'bitget' ? 'Bitget' : 'Bitunix'} (meilleur prix)
                </span>
              ) : null
            })()}
          </div>
          <label style={{display:'flex',alignItems:'center',gap:6,cursor:'pointer'}}>
            <input type="checkbox" checked={sorEnabled} onChange={e=>setSorEnabled(e.target.checked)}
              style={{cursor:'pointer'}}/>
            <span style={{color:sorEnabled?'var(--grn)':'var(--txt3)',fontSize:9}}>{sorEnabled?'ON':'OFF'}</span>
          </label>
        </div>
      )}

      {!keyed ? (
        <div className={styles.noKey}>
          <div className={styles.noKeyTitle}>⚙️ Connecte ton compte {exchange === 'bitget' ? 'Bitget' : 'Bitunix'}</div>
          <div className={styles.noKeyText}>Entre ta clé API {exchange === 'bitget' ? 'Bitget' : 'Bitunix'} pour trader directement depuis FXSEDGE. Tes fonds restent dans ton compte.</div>
          <button className={styles.noKeyBtn} onClick={()=>window.dispatchEvent(new CustomEvent('fxs:openApiKey', {detail:{exchange}}))}>
            Connecter {exchange === 'bitget' ? 'Bitget' : 'Bitunix'} →
          </button>
          <a href={exchange === 'bitget' ? 'https://www.bitget.com/account/newapi' : 'https://www.bitunix.com/account/apiManagement'} target="_blank" rel="noreferrer" className={styles.noKeyLink}>
            Créer une clé API sur {exchange === 'bitget' ? 'Bitget' : 'Bitunix'} ↗
          </a>
        </div>
      ) : (
        <>
          <div className={styles.statsBar}>
            {avail!==null && <span className={styles.statV}>{fmt(avail,2)} USDT dispo</span>}
            <div className={styles.tabBtns}>
              <button className={styles.tabBtn+(tab==='trade'?' '+styles.tabOn:'')} onClick={()=>setTab('trade')}>{t('trade')}</button>
              <button className={styles.tabBtn+(tab==='positions'?' '+styles.tabOn:'')} onClick={()=>{setTab('positions');loadData()}}>
                Positions{positions.length>0&&<span className={styles.badge}>{positions.length}</span>}
              </button>
              <button className={styles.tabBtn+(tab==='orders'?' '+styles.tabOn:'')} onClick={()=>{setTab('orders');loadData()}}>
                Ordres{orders.length>0&&<span className={styles.badge}>{orders.length}</span>}
              </button>
              <button className={styles.tabBtn+(tab==='history'?' '+styles.tabOn:'')} onClick={()=>{setTab('history');loadData()}}>
                Historique
              </button>
            </div>
          </div>

          <div className={styles.kbBar}>
            {[['L','Long'],['X','Short'],['1-6','Lev'],['M','Mkt'],['P','Lmt'],['⏎','Go'],['Q','Close'],['Esc','Clear']].map(([k,v])=>(
              <span key={k} className={styles.kbItem}><span className={styles.kbd}>{k}</span><span className={styles.kbV}>{v}</span></span>
            ))}
          </div>

          {tab==='trade' && (
            <div className={styles.form}>
              <div className={styles.sides}>
                <button className={styles.sideBtn+(side==='long'?' '+styles.longOn:'')} onClick={()=>setSide('long')}>↑ Long</button>
                <button className={styles.sideBtn+(side==='short'?' '+styles.shortOn:'')} onClick={()=>setSide('short')}>↓ Short</button>
              </div>
              <div className={styles.typeRow}>
                {['market','limit'].map(t=>(
                  <button key={t} className={styles.typeBtn+(orderType===t?' '+styles.typeOn:'')} onClick={()=>setOType(t)}>
                    {t==='market'?'Market':'Limite'}
                  </button>
                ))}
              </div>
              {orderType==='limit' && (
                <div className={styles.field}>
                  <div className={styles.fLbl}><span>Prix</span><button className={styles.lastBtn} onClick={()=>setPrice(lastPx.toString())}>Last {fmtPx(lastPx)}</button></div>
                  <div className={styles.fRow}><input className={styles.fIn} type="number" value={price} onChange={e=>setPrice(e.target.value)} placeholder="0.00"/><span className={styles.fUnit}>USDT</span></div>
                </div>
              )}
              <div className={styles.field}>
                <div className={styles.fLbl}><span>Quantité</span>{avail&&lastPx>0&&<button className={styles.lastBtn} onClick={()=>setQty(((avail/lastPx)*0.95).toFixed(4))}>Max</button>}</div>
                <div className={styles.fRow}><input className={styles.fIn} type="number" value={qty} onChange={e=>setQty(e.target.value)} placeholder="0.001"/><span className={styles.fUnit}>{base}</span></div>
                {avail&&lastPx>0&&(
                  <div className={styles.qtyControls}>
                    <input type="range" min="0" max="100" value={avail&&lastPx>0&&qty ? Math.min(100,Math.round(parseFloat(qty)*lastPx/avail*100)) : 0}
                      onChange={e=>{const pct=parseInt(e.target.value); setQty(((avail*pct/100)/lastPx).toFixed(6))}}
                      className={styles.qtySlider}
                      style={{background:`linear-gradient(to right,var(--grn) ${avail&&lastPx>0&&qty?Math.min(100,Math.round(parseFloat(qty)*lastPx/avail*100)):0}%,var(--bg3) ${avail&&lastPx>0&&qty?Math.min(100,Math.round(parseFloat(qty)*lastPx/avail*100)):0}%)`}}
                    />
                    <div className={styles.qtyPcts}>
                      {[10,25,50,75,100].map(pct=>(
                        <button key={pct} className={styles.qtyPct} onClick={()=>setQty(((avail*pct/100)/lastPx).toFixed(6))}>{pct}%</button>
                      ))}
                    </div>
                  </div>
                )}
                {posUSD>0 && <div className={styles.fHint}>≈ ${fmt(posUSD,2)} notionnel · ${fmt(posUSD/leverage,2)} marge</div>}
              </div>
              <div className={styles.levBlock}>
                <div className={styles.levTop}><span className={styles.levLbl}>Levier</span><span className={styles.levVal}>{leverage}×</span></div>
                <input type="range" min="1" max="100" value={leverage} onChange={e=>setLev(+e.target.value)} className={styles.levSlider}
                  style={{background:`linear-gradient(to right,var(--grn) ${leverage}%,var(--bg3) ${leverage}%)`}}/>
                <div className={styles.levPresets}>{LEVERAGE_PRESETS.map(l=><button key={l} className={styles.levP+(leverage===l?' '+styles.levPOn:'')} onClick={()=>setLev(l)}>{l}×</button>)}</div>
              </div>
              <button className={styles.tpslBtn+(tpsl?' '+styles.tpslOn:'')} onClick={()=>setTpsl(v=>!v)}>{tpsl?'▾':'▸'} TP / SL</button>
              {tpsl && (
                <div className={styles.tpslGrid}>
                  <div className={styles.tpslF}><span className={styles.tpL}>{t('take_profit')}</span><input className={styles.tpslIn} type="number" value={tp} onChange={e=>setTp(e.target.value)} placeholder={t('tp_price')}/></div>
                  <div className={styles.tpslF}><span className={styles.slL}>{t('stop_loss')}</span><input className={styles.tpslIn} type="number" value={sl} onChange={e=>setSl(e.target.value)} placeholder={t('sl_price')}/></div>
                </div>
              )}
              {qty&&parseFloat(qty)>0&&(
                <div className={styles.summary}>
                  <div className={styles.sumRow}><span>{t('position')}</span><span>${fmt(posUSD,2)}</span></div>
                  <div className={styles.sumRow}><span>{t('margin_required')}</span><span>${fmt(posUSD/leverage,2)} USDT</span></div>
                  <div className={styles.sumRow}><span>{t('leverage')}</span><span>{leverage}×</span></div>
                  <div className={styles.sumRow}><span>{t('fees_est')}</span><span>${fmt(posUSD*0.0005,4)}</span></div>
                  {tp&&<div className={styles.sumRow}><span>{t('tp_pnl')}</span><span style={{color:'var(--grn)'}}>+${fmt(Math.abs(parseFloat(tp)-lastPx)*parseFloat(qty),2)}</span></div>}
                  {sl&&<div className={styles.sumRow}><span>{t('sl_loss')}</span><span style={{color:'var(--red)'}}>-${fmt(Math.abs(parseFloat(sl)-lastPx)*parseFloat(qty),2)}</span></div>}
                  {tp&&sl&&(()=>{
                    const tpPnl = Math.abs(parseFloat(tp)-lastPx)*parseFloat(qty)
                    const slPnl = Math.abs(parseFloat(sl)-lastPx)*parseFloat(qty)
                    const rr = slPnl>0 ? (tpPnl/slPnl) : 0
                    const portfolioPct = avail ? (posUSD/leverage/avail*100) : 0
                    // Kelly Criterion: f* = (p*b - q) / b where p=winrate, b=rr, q=1-p
                    const estWinRate = 0.5 // conservative estimate
                    const kelly = rr > 0 ? Math.max(0, (estWinRate * rr - (1-estWinRate)) / rr * 100) : 0
                    return (
                      <div style={{borderTop:'1px solid var(--brd)',paddingTop:6,marginTop:4}}>
                        <div className={styles.sumRow}><span>{t('risk_reward')}</span><span style={{color:rr>=2?'var(--grn)':rr>=1?'#f59e0b':'var(--red)',fontWeight:700}}>1:{rr.toFixed(1)} {rr>=2?'✓':rr>=1?'~':'⚠'}</span></div>
                        <div className={styles.sumRow}><span>{t('portfolio_risk')}</span><span style={{color:portfolioPct>50?'var(--red)':portfolioPct>25?'#f59e0b':'var(--grn)'}}>{portfolioPct.toFixed(1)}%</span></div>
                        <div className={styles.sumRow}><span>{t('kelly_optimal')}</span><span style={{color:'var(--txt3)'}}>{kelly.toFixed(0)}%</span></div>
                      </div>
                    )
                  })()}
                </div>
              )}
              {err&&<div className={styles.errBox}><span>{err}</span><button onClick={()=>setErr('')}>✕</button></div>}
              {ok&&<div className={styles.okBox}>{ok}</div>}
              {confirmBig && (
                <div className={styles.confirmBox}>
                  <div style={{fontSize:11,color:'var(--txt)',marginBottom:6}}>
                    ⚠️ Marge = <b>${fmt(confirmBig.margin,2)}</b> ({confirmBig.pct}% de ton solde)
                  </div>
                  <div style={{display:'flex',gap:6}}>
                    <button className={styles.ctaBtn+' '+styles.ctaShort} style={{flex:1,padding:8}} onClick={()=>setConfirmBig(null)}>{t('cancel')}</button>
                    <button className={styles.ctaBtn+' '+(side==='long'?styles.ctaLong:styles.ctaShort)} style={{flex:1,padding:8}} onClick={()=>{setConfirmBig(null);handleTrade()}}>{t('confirm')}</button>
                  </div>
                </div>
              )}
              <button className={styles.ctaBtn+' '+(side==='long'?styles.ctaLong:styles.ctaShort)} onClick={handleTrade} disabled={submitting}>
                {submitting?`⟳ ${t('sending')}` : side==='long'?`↑ Long ${base} ×${leverage}`:`↓ Short ${base} ×${leverage}`}
              </button>
            </div>
          )}

          {tab==='positions' && (
            <div className={styles.positions}>
              {loading&&<div className={styles.posMsg}>{t('loading')}</div>}
              {!loading&&positions.length===0&&<div className={styles.posMsg}><div style={{fontSize:28}}>📭</div><div>{t('no_positions')}</div><button className={styles.backBtn} onClick={()=>setTab('trade')}>← {t('open_position')}</button></div>}
              {positions.map((p,i)=>{
                const rawSide = (p.side||'').toUpperCase()
                const isLong = rawSide==='LONG' || rawSide==='BUY'
                const pnl = parseFloat(p.unrealizedPNL||0)
                return (
                <div key={i} className={styles.posRow}>
                  <div className={styles.posTop}>
                    <span className={styles.posSym}>{p.symbol?.replace('USDT','/USDT')}</span>
                    <span style={{color:isLong?'var(--grn)':'var(--red)',fontWeight:700,fontSize:12}}>{isLong?'↑ Long':'↓ Short'} {p.leverage}×</span>
                    <span style={{color:pnl>=0?'var(--grn)':'var(--red)',fontFamily:'var(--mono)',fontWeight:800}}>{pnl>=0?'+':''}{fmt(pnl,2)} USDT</span>
                  </div>
                  <div className={styles.posDetail}><span>Taille: {p.qty}</span><span>Entrée: {fmtPx(p.avgOpenPrice)}</span><span>Marge: {fmt(p.margin,2)}</span></div>
                  <div className={styles.posDetail}><span>Fee: {fmt(p.fee,4)}</span><span>Funding: {fmt(p.funding,4)}</span><span style={{color:'var(--red)'}}>Liq: {fmtPx(p.liqPrice)}</span></div>
                  <div style={{display:'flex',gap:4,marginTop:4}}>
                    <button className={styles.closeBtn} style={{flex:1}} onClick={async ()=>{
                      try {
                        if (exchange === 'bitget') {
                          await bitgetClosePosition({symbol:p.symbol, side:isLong?'long':'short'})
                        } else {
                          await futuresClosePosition({symbol:p.symbol, side:isLong?'long':'short', qty:p.qty, positionId:p.positionId})
                        }
                        // Record in session stats
                        recordTrade({ pair: p.symbol, pnl, side: isLong ? 'long' : 'short' })
                        playOrderSound(!isLong)
                        flashScreen(!isLong)
                        window.dispatchEvent(new CustomEvent('fxs:positionUpdate'))
                        loadData()
                      } catch(e) { setErr(e.message) }
                    }}>✕ Fermer</button>
                    <button className={styles.reverseBtn} onClick={async ()=>{
                      try {
                        if (exchange === 'bitget') {
                          // Close current position
                          await bitgetClosePosition({symbol:p.symbol, side:isLong?'long':'short'})
                          // Open reverse
                          await bitgetPlaceOrder({
                            symbol: p.symbol,
                            side: isLong ? 'sell' : 'buy',
                            qty: parseFloat(p.qty || p.total || p.openDelegateSize || 0),
                            orderType: 'market',
                            leverage: parseInt(p.leverage || 10),
                          })
                        } else {
                          // Close current position
                          await futuresClosePosition({symbol:p.symbol, side:isLong?'long':'short', qty:p.qty, positionId:p.positionId})
                          // Open reverse position with same params
                          await futuresPlaceOrder({
                            symbol: p.symbol,
                            side: isLong ? 'SELL' : 'BUY',
                            qty: parseFloat(p.qty),
                            orderType: 'MARKET',
                            tradeSide: 'OPEN',
                          })
                        }
                        playOrderSound(!isLong)
                        flashScreen(!isLong)
                        setOk(`↔ Reverse ${isLong?'Short':'Long'} ${p.symbol.replace('USDT','')}`)
                        window.dispatchEvent(new CustomEvent('fxs:positionUpdate'))
                        setTimeout(loadData, 1500)
                      } catch(e) { setErr(e.message) }
                    }}>↔ Reverse</button>
                    <button className={styles.closeBtn} style={{flex:0,padding:'6px 10px',fontSize:9,background:'rgba(245,158,11,.08)',borderColor:'rgba(245,158,11,.3)',color:'#f59e0b'}}
                      onClick={()=>{
                        const entry = parseFloat(p.avgOpenPrice) || 0
                        const exit = lastPx || entry
                        const size = parseFloat(p.qty) || 0
                        const margin = parseFloat(p.margin) || 1
                        const roi = margin > 0 ? (pnl / margin) * 100 : 0
                        const tpDist = p.tpPrice ? Math.abs(parseFloat(p.tpPrice) - entry) : Math.abs(exit - entry)
                        const slDist = p.slPrice ? Math.abs(entry - parseFloat(p.slPrice)) : tpDist / 2 || 1
                        const rr = slDist > 0 ? tpDist / slDist : 1
                        setShareTrade({
                          base: p.symbol.replace('USDT', ''),
                          side: isLong ? 'long' : 'short',
                          leverage: p.leverage || 10,
                          exchange: exchange === 'bitget' ? 'Bitget' : 'Bitunix',
                          pnl, roi, rr,
                          entry, exit, size: size.toFixed(4),
                          duration: 'live',
                          timestamp: Date.now(),
                        })
                      }}>🎴</button>
                  </div>
                </div>
              )})}

              {!loading&&positions.length>0&&(
                <div style={{display:'flex',gap:6,marginTop:4}}>
                  <button className={styles.refreshBtn} onClick={loadData}>↻ {t('refresh')}</button>
                  <button className={styles.closeBtn} style={{flex:1}} onClick={closeAllPositions}>✕ Fermer tout (Q)</button>
                </div>
              )}
              {!loading&&positions.length===0&&<button className={styles.refreshBtn} onClick={loadData}>↻ {t('refresh')}</button>}
            </div>
          )}

          {tab==='orders' && (
            <div className={styles.positions}>
              {loading&&<div className={styles.posMsg}>{t('loading')}</div>}
              {!loading&&orders.length===0&&<div className={styles.posMsg}><div style={{fontSize:28}}>📋</div><div>{t('no_orders')}</div></div>}
              {orders.map((o,i)=>(
                <div key={i} className={styles.posRow} style={{flexDirection:'column',gap:4}}>
                  <div className={styles.posTop}>
                    <span className={styles.posSym}>{o.symbol?.replace('USDT','/USDT')}</span>
                    <span style={{color:o.side==='BUY'?'var(--grn)':'var(--red)',fontWeight:700,fontSize:11}}>{o.side} {o.tradeSide}</span>
                    <span style={{fontSize:10,color:'var(--txt3)'}}>{o.orderType}</span>
                  </div>
                  <div className={styles.posDetail}><span>Qty: {o.qty}</span><span>Prix: {o.price||'Market'}</span><span>{o.status||''}</span></div>
                </div>
              ))}
              {!loading&&<button className={styles.refreshBtn} onClick={loadData}>↻ {t('refresh')}</button>}
            </div>
          )}

          {tab==='history' && (
            <div className={styles.positions}>
              {loading&&<div className={styles.posMsg}>{t('loading')}</div>}
              {!loading&&history.length===0&&<div className={styles.posMsg}><div style={{fontSize:28}}>📜</div><div>{t('no_trades')}</div></div>}
              {history.map((t,i)=>{
                const pnl = parseFloat(t.profit||t.realizedPNL||0)
                const isBuy = (t.side||'').toUpperCase()==='BUY'
                return (
                <div key={i} className={styles.posRow} style={{flexDirection:'column',gap:4}}>
                  <div className={styles.posTop}>
                    <span className={styles.posSym}>{(t.symbol||'').replace('USDT','/USDT')}</span>
                    <span style={{color:isBuy?'var(--grn)':'var(--red)',fontWeight:700,fontSize:11}}>{t.side} {t.tradeSide||''}</span>
                    <span style={{color:pnl>=0?'var(--grn)':'var(--red)',fontFamily:'var(--mono)',fontWeight:700,fontSize:11}}>{pnl>=0?'+':''}{fmt(pnl,4)} USDT</span>
                  </div>
                  <div className={styles.posDetail}>
                    <span>Qty: {t.qty||t.tradeQty||'—'}</span>
                    <span>Prix: {t.price||t.tradePrice||'—'}</span>
                    <span>Fee: {t.fee||'—'}</span>
                    <span>{t.leverage||''}×</span>
                  </div>
                  {(t.ctime||t.mtime) && <div style={{fontSize:9,color:'var(--txt3)'}}>{new Date(t.ctime||t.mtime).toLocaleString()}</div>}
                </div>
              )})}
              {!loading&&<button className={styles.refreshBtn} onClick={loadData}>↻ {t('refresh')}</button>}
            </div>
          )}
        </>
      )}

      <div className={styles.footer}>⚡ {exchange==='bitget'?'Bitget':'Bitunix'} Perps · {exchange==='bitget'?'Ref FXSEDGE':'Ref FXSA'} · Tes fonds dans ton compte</div>
      {shareTrade && <TradeCard trade={shareTrade} onClose={() => setShareTrade(null)} />}
    </div>
  )
}
