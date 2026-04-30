import { useState, useEffect, useCallback } from 'react'
import { useAccount, usePublicClient } from 'wagmi'
import { useStore } from '../../store'
import { fmtPx, fmt } from '../../lib/format'
import {
  hasApiKeys, futuresPlaceOrder, futuresGetBalance,
  futuresGetPositions, futuresClosePosition, futuresSetLeverage
} from '../../lib/bitunix'
import styles from './FuturesWidget.module.css'

const LEVERAGE_PRESETS = [2,5,10,20,50,100]

export function FuturesWidget({ onOpenWallet }) {
  const pair   = useStore(s => s.pair)
  const lastPx = useStore(s => s.lastPx)
  const base   = pair.replace('USDT','')

  const [keyed, setKeyed]     = useState(false)
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

  const posUSD = qty && lastPx ? parseFloat(qty)*lastPx : 0

  // Check clés
  useEffect(() => {
    setKeyed(hasApiKeys())
    const h = () => setKeyed(hasApiKeys())
    window.addEventListener('fxs:keysUpdated', h)
    return () => window.removeEventListener('fxs:keysUpdated', h)
  }, [])

  // Keyboard shortcuts
  useEffect(() => {
    const h = e => {
      if (['INPUT','TEXTAREA'].includes(e.target.tagName)) return
      if (e.key==='l'||e.key==='L') setSide('long')
      if (e.key==='x'||e.key==='X') setSide('short')
      const p=[2,5,10,20,50,100]
      if (e.key>='1'&&e.key<='6') setLev(p[+e.key-1])
    }
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [])

  const loadData = useCallback(async () => {
    if (!keyed) return
    setLoad(true)
    try {
      const [bal, pos] = await Promise.all([futuresGetBalance(), futuresGetPositions()])
      setBalance(bal)
      setPos(Array.isArray(pos) ? pos : [])
    } catch(e) { console.error(e.message) }
    setLoad(false)
  }, [keyed])

  useEffect(() => { if (keyed && tab==='positions') loadData() }, [tab, keyed])

  const handleTrade = async () => {
    setErr(''); setOk('')
    if (!qty || parseFloat(qty)<=0) { setErr('Entre une quantité'); return }
    setSub(true)
    try {
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
      setOk(`✓ ${side==='long'?'Long ↑':'Short ↓'} ${base} ×${leverage} envoyé`)
      setQty(''); setTp(''); setSl('')
      setTimeout(()=>{ setOk(''); loadData() }, 3000)
    } catch(e) { setErr(e.message) }
    setSub(false)
  }

  const avail = balance?.available ? parseFloat(balance.available) : null

  return (
    <div className={styles.wrap}>
      <div className={styles.header}>
        <div className={styles.platInfo}>
          <span className={styles.platName}>⚡ Bitunix Perps</span>
          <span className={styles.platTag}>CEX · 100+ paires · Jusqu'à 100× · Ref FXSA</span>
        </div>
        <div className={styles.pairBox}>
          <span className={styles.pairSym}>{base}/USDT</span>
          {lastPx>0 && <span className={styles.pairPx}>{fmtPx(lastPx)}</span>}
        </div>
      </div>

      {!keyed ? (
        <div className={styles.noKey}>
          <div className={styles.noKeyTitle}>⚙️ Connecte ton compte Bitunix</div>
          <div className={styles.noKeyText}>Entre ta clé API Bitunix pour trader directement depuis FXSEDGE. Tes fonds restent dans ton compte Bitunix.</div>
          <button className={styles.noKeyBtn} onClick={()=>window.dispatchEvent(new CustomEvent('fxs:openApiKey'))}>
            Connecter Bitunix →
          </button>
          <a href="https://www.bitunix.com/account/apiManagement" target="_blank" rel="noreferrer" className={styles.noKeyLink}>
            Créer une clé API sur Bitunix ↗
          </a>
        </div>
      ) : (
        <>
          <div className={styles.statsBar}>
            {avail!==null && <span className={styles.statV}>{fmt(avail,2)} USDT dispo</span>}
            <div className={styles.tabBtns}>
              <button className={styles.tabBtn+(tab==='trade'?' '+styles.tabOn:'')} onClick={()=>setTab('trade')}>Trade</button>
              <button className={styles.tabBtn+(tab==='positions'?' '+styles.tabOn:'')} onClick={()=>{setTab('positions');loadData()}}>
                Positions{positions.length>0&&<span className={styles.badge}>{positions.length}</span>}
              </button>
            </div>
          </div>

          <div className={styles.kbBar}>
            {[['L','Long'],['X','Short'],['1-6','Levier']].map(([k,v])=>(
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
                {posUSD>0 && <div className={styles.fHint}>≈ ${fmt(posUSD*leverage,2)} position · ${fmt(posUSD,2)} marge</div>}
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
                  <div className={styles.tpslF}><span className={styles.tpL}>Take Profit</span><input className={styles.tpslIn} type="number" value={tp} onChange={e=>setTp(e.target.value)} placeholder="Prix TP"/></div>
                  <div className={styles.tpslF}><span className={styles.slL}>Stop Loss</span><input className={styles.tpslIn} type="number" value={sl} onChange={e=>setSl(e.target.value)} placeholder="Prix SL"/></div>
                </div>
              )}
              {qty&&parseFloat(qty)>0&&(
                <div className={styles.summary}>
                  <div className={styles.sumRow}><span>Position</span><span>${fmt(posUSD*leverage,2)}</span></div>
                  <div className={styles.sumRow}><span>Marge</span><span>${fmt(posUSD,2)} USDT</span></div>
                  <div className={styles.sumRow}><span>Levier</span><span>{leverage}×</span></div>
                  <div className={styles.sumRow}><span>Frais est.</span><span>${fmt(posUSD*leverage*0.0005,4)}</span></div>
                </div>
              )}
              {err&&<div className={styles.errBox}><span>{err}</span><button onClick={()=>setErr('')}>✕</button></div>}
              {ok&&<div className={styles.okBox}>{ok}</div>}
              <button className={styles.ctaBtn+' '+(side==='long'?styles.ctaLong:styles.ctaShort)} onClick={handleTrade} disabled={submitting}>
                {submitting?'⟳ Envoi...' : side==='long'?`↑ Long ${base} ×${leverage}`:`↓ Short ${base} ×${leverage}`}
              </button>
            </div>
          )}

          {tab==='positions' && (
            <div className={styles.positions}>
              {loading&&<div className={styles.posMsg}>Chargement...</div>}
              {!loading&&positions.length===0&&<div className={styles.posMsg}><div style={{fontSize:28}}>📭</div><div>Aucune position</div><button className={styles.backBtn} onClick={()=>setTab('trade')}>← Ouvrir une position</button></div>}
              {positions.map((p,i)=>(
                <div key={i} className={styles.posRow}>
                  <div className={styles.posTop}>
                    <span className={styles.posSym}>{p.symbol?.replace('USDT','/USDT')}</span>
                    <span style={{color:p.side==='long'?'var(--grn)':'var(--red)',fontWeight:700,fontSize:12}}>{p.side==='long'?'↑ Long':'↓ Short'} {p.leverage}×</span>
                    <span style={{color:parseFloat(p.unrealizedPNL||0)>=0?'var(--grn)':'var(--red)',fontFamily:'var(--mono)',fontWeight:800}}>{parseFloat(p.unrealizedPNL||0)>=0?'+':''}{fmt(p.unrealizedPNL||0,2)} USDT</span>
                  </div>
                  <div className={styles.posDetail}><span>Taille: {p.qty}</span><span>Entrée: {fmtPx(p.avgOpenPrice)}</span><span style={{color:'var(--red)'}}>Liq: {fmtPx(p.liqPrice)}</span></div>
                  <button className={styles.closeBtn} onClick={()=>futuresClosePosition({symbol:p.symbol,side:p.side,qty:p.qty}).then(loadData).catch(e=>setErr(e.message))}>Fermer</button>
                </div>
              ))}
              {!loading&&<button className={styles.refreshBtn} onClick={loadData}>↻ Actualiser</button>}
            </div>
          )}
        </>
      )}

      <div className={styles.footer}>⚡ Bitunix Perps · Ref FXSA · Tes fonds dans ton compte</div>
    </div>
  )
}
