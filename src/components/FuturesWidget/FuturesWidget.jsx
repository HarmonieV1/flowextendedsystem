import { useState, useEffect } from 'react'
import { useAccount } from 'wagmi'
import { useStore } from '../../store'
import { fmtPx, fmt } from '../../lib/format'
import {
  futuresPlaceOrder, futuresGetBalance, futuresGetPositions,
  futuresClosePosition, futuresSetLeverage
} from '../../lib/bitunix'
import styles from './FuturesWidget.module.css'

const LEVERAGE_PRESETS = [2, 5, 10, 20, 50, 100]

// Bitunix Futures pairs
const PAIRS = {
  BTCUSDT:'BTCUSDT', ETHUSDT:'ETHUSDT', SOLUSDT:'SOLUSDT',
  BNBUSDT:'BNBUSDT', XRPUSDT:'XRPUSDT', DOGEUSDT:'DOGEUSDT',
  AVAXUSDT:'AVAXUSDT', ARBUSDT:'ARBUSDT', LINKUSDT:'LINKUSDT',
  ADAUSDT:'ADAUSDT', SUIUSDT:'SUIUSDT', INJUSDT:'INJUSDT',
}

export function FuturesWidget({ onOpenWallet }) {
  const pair   = useStore(s => s.pair)
  const lastPx = useStore(s => s.lastPx)
  const base   = pair.replace('USDT', '')
  const { isConnected } = useAccount()

  const [side, setSide]       = useState('long')
  const [orderType, setOType] = useState('market')
  const [qty, setQty]         = useState('')
  const [price, setPrice]     = useState('')
  const [leverage, setLev]    = useState(10)
  const [tpsl, setTpsl]       = useState(false)
  const [tp, setTp]           = useState('')
  const [sl, setSl]           = useState('')
  const [tab, setTab]         = useState('trade')
  const [submitting, setSub]  = useState(false)
  const [okMsg, setOk]        = useState('')
  const [errMsg, setErr]      = useState('')
  const [balance, setBalance] = useState(null)
  const [positions, setPos]   = useState([])
  const [loading, setLoad]    = useState(false)
  const [hasKeys, setHasKeys] = useState(false)

  const posUSD = qty && lastPx ? parseFloat(qty) * lastPx : 0
  const sym    = PAIRS[pair] || 'BTCUSDT'

  // Check if API keys are set (via Netlify env → proxy will tell us)
  useEffect(() => {
    fetch('/api/bitunix?_market=futures&_endpoint=/api/v1/futures/account/get_single_account&_method=GET', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }
    })
    .then(r => r.json())
    .then(d => {
      if (d.code === 0) { setHasKeys(true); setBalance(d.data) }
      else if (d.error === 'Clés API Bitunix non configurées') setHasKeys(false)
      else setHasKeys(false)
    })
    .catch(() => setHasKeys(false))
  }, [])

  const loadData = async () => {
    if (!hasKeys) return
    setLoad(true)
    try {
      const [bal, pos] = await Promise.all([futuresGetBalance(), futuresGetPositions()])
      setBalance(bal); setPos(Array.isArray(pos) ? pos : [])
    } catch(e) { console.error(e.message) }
    setLoad(false)
  }

  useEffect(() => { if (hasKeys && tab === 'positions') loadData() }, [tab, hasKeys])

  // KB shortcuts
  useEffect(() => {
    const h = (e) => {
      if (['INPUT','TEXTAREA'].includes(e.target.tagName)) return
      if (e.key === 'l' || e.key === 'L') setSide('long')
      if (e.key === 'x' || e.key === 'X') setSide('short')
      const p = [2,5,10,20,50,100]
      if (e.key >= '1' && e.key <= '6') setLev(p[+e.key-1])
    }
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [])

  const handleTrade = async () => {
    setErr(''); setOk('')
    if (!hasKeys) { setErr('Configure tes clés API Bitunix dans les paramètres Netlify'); return }
    if (!qty || parseFloat(qty) <= 0) { setErr('Entre une quantité'); return }
    setSub(true)
    try {
      // Set leverage first
      await futuresSetLeverage({ symbol: sym, leverage })

      await futuresPlaceOrder({
        symbol:    sym,
        side:      side === 'long' ? 'BUY' : 'SELL',
        qty:       parseFloat(qty),
        price:     orderType === 'limit' ? parseFloat(price) : undefined,
        orderType: orderType === 'limit' ? 'LIMIT' : 'MARKET',
        tradeSide: 'OPEN',
        tpPrice:   tp ? parseFloat(tp) : undefined,
        slPrice:   sl ? parseFloat(sl) : undefined,
      })

      setOk(`✓ ${side === 'long' ? 'Long ↑' : 'Short ↓'} ${base} ×${leverage} envoyé sur Bitunix`)
      setQty(''); setTp(''); setSl('')
      setTimeout(() => { setOk(''); loadData() }, 3000)
    } catch(e) {
      setErr(e.message || 'Erreur')
    }
    setSub(false)
  }

  const handleClose = async (pos) => {
    try {
      await futuresClosePosition({ symbol: pos.symbol, qty: pos.qty, side: pos.side })
      loadData()
    } catch(e) { setErr(e.message) }
  }

  const usdtBal = balance?.marginCoin === 'USDT' ? parseFloat(balance.available) : null

  return (
    <div className={styles.wrap}>
      {/* Header */}
      <div className={styles.header}>
        <div className={styles.platInfo}>
          <span className={styles.platName}>⚡ Bitunix Perps</span>
          <span className={styles.platTag}>CEX · 100+ paires · Jusqu'à 100× · Ref FXSA</span>
        </div>
        <div className={styles.pairBox}>
          <span className={styles.pairSym}>{base}/USDT</span>
          {lastPx > 0 && <span className={styles.pairPx}>{fmtPx(lastPx)}</span>}
        </div>
      </div>

      {!hasKeys && (
        <div className={styles.noKeyBanner}>
          <div className={styles.noKeyTitle}>⚙️ Configuration requise</div>
          <div className={styles.noKeyText}>
            Pour trader via FXSEDGE, configure tes clés API Bitunix :<br/>
            <strong>Bitunix → API Management → Créer une clé</strong><br/>
            Puis ajoute <code>BITUNIX_API_KEY</code> et <code>BITUNIX_SECRET_KEY</code> dans Netlify → Site → Environment Variables
          </div>
          <a href="https://www.bitunix.com/account/apiManagement" target="_blank" rel="noreferrer" className={styles.noKeyBtn}>
            Créer mes clés API Bitunix ↗
          </a>
        </div>
      )}

      {hasKeys && (
        <>
          {/* Stats bar */}
          <div className={styles.statsBar}>
            {usdtBal !== null && (
              <div className={styles.stat}>
                <span className={styles.statL}>Balance dispo</span>
                <span className={styles.statV}>{fmt(usdtBal, 2)} USDT</span>
              </div>
            )}
            <div className={styles.tabBtns}>
              <button className={styles.tabBtn+(tab==='trade'?' '+styles.tabOn:'')} onClick={()=>setTab('trade')}>Trade</button>
              <button className={styles.tabBtn+(tab==='positions'?' '+styles.tabOn:'')} onClick={()=>{setTab('positions');loadData()}}>
                Positions {positions.length > 0 && <span className={styles.posBadge}>{positions.length}</span>}
              </button>
            </div>
          </div>

          {/* KB bar */}
          <div className={styles.kbBar}>
            {[['L','Long'],['X','Short'],['1-6','Levier']].map(([k,v])=>(
              <span key={k} className={styles.kbItem}>
                <span className={styles.kbd}>{k}</span>
                <span className={styles.kbV}>{v}</span>
              </span>
            ))}
          </div>

          {tab === 'trade' && (
            <div className={styles.form}>
              {/* Long / Short */}
              <div className={styles.sides}>
                <button className={styles.sideBtn+(side==='long'?' '+styles.longOn:'')} onClick={()=>setSide('long')}>↑ Long</button>
                <button className={styles.sideBtn+(side==='short'?' '+styles.shortOn:'')} onClick={()=>setSide('short')}>↓ Short</button>
              </div>

              {/* Order type */}
              <div className={styles.typeRow}>
                {['market','limit'].map(t=>(
                  <button key={t} className={styles.typeBtn+(orderType===t?' '+styles.typeOn:'')} onClick={()=>setOType(t)}>
                    {t==='market'?'Market':'Limite'}
                  </button>
                ))}
              </div>

              {/* Price */}
              {orderType==='limit' && (
                <div className={styles.field}>
                  <div className={styles.fLbl}>
                    <span>Prix</span>
                    <button className={styles.lastBtn} onClick={()=>setPrice(lastPx.toString())}>Last {fmtPx(lastPx)}</button>
                  </div>
                  <div className={styles.fRow}>
                    <input className={styles.fIn} type="number" value={price} onChange={e=>setPrice(e.target.value)} placeholder="0.00"/>
                    <span className={styles.fUnit}>USDT</span>
                  </div>
                </div>
              )}

              {/* Quantity */}
              <div className={styles.field}>
                <div className={styles.fLbl}>
                  <span>Quantité</span>
                  {usdtBal && lastPx > 0 && (
                    <button className={styles.lastBtn} onClick={()=>setQty(((usdtBal/lastPx)*0.95).toFixed(4))}>
                      Max {((usdtBal/lastPx)*0.95).toFixed(4)}
                    </button>
                  )}
                </div>
                <div className={styles.fRow}>
                  <input className={styles.fIn} type="number" value={qty} onChange={e=>setQty(e.target.value)} placeholder="0.001"/>
                  <span className={styles.fUnit}>{base}</span>
                </div>
                {posUSD > 0 && <div className={styles.fHint}>≈ ${fmt(posUSD*leverage,2)} position · ${fmt(posUSD,2)} marge</div>}
              </div>

              {/* Leverage */}
              <div className={styles.levBlock}>
                <div className={styles.levTop}><span className={styles.levLbl}>Levier</span><span className={styles.levVal}>{leverage}×</span></div>
                <input type="range" min="1" max="100" value={leverage} onChange={e=>setLev(+e.target.value)}
                  className={styles.levSlider}
                  style={{background:`linear-gradient(to right,var(--grn) ${leverage}%,var(--bg3) ${leverage}%)`}}
                />
                <div className={styles.levPresets}>
                  {LEVERAGE_PRESETS.map(l=>(
                    <button key={l} className={styles.levP+(leverage===l?' '+styles.levPOn:'')} onClick={()=>setLev(l)}>{l}×</button>
                  ))}
                </div>
              </div>

              {/* TP/SL */}
              <button className={styles.tpslBtn+(tpsl?' '+styles.tpslOn:'')} onClick={()=>setTpsl(v=>!v)}>
                {tpsl?'▾':'▸'} TP / SL
              </button>
              {tpsl && (
                <div className={styles.tpslGrid}>
                  <div className={styles.tpslF}>
                    <span className={styles.tpL}>Take Profit</span>
                    <input className={styles.tpslIn} type="number" value={tp} onChange={e=>setTp(e.target.value)} placeholder="Prix TP"/>
                  </div>
                  <div className={styles.tpslF}>
                    <span className={styles.slL}>Stop Loss</span>
                    <input className={styles.tpslIn} type="number" value={sl} onChange={e=>setSl(e.target.value)} placeholder="Prix SL"/>
                  </div>
                </div>
              )}

              {/* Summary */}
              {qty && parseFloat(qty) > 0 && (
                <div className={styles.summary}>
                  <div className={styles.sumRow}><span>Position</span><span>${fmt(posUSD*leverage,2)}</span></div>
                  <div className={styles.sumRow}><span>Marge</span><span>${fmt(posUSD,2)} USDT</span></div>
                  <div className={styles.sumRow}><span>Levier</span><span>{leverage}×</span></div>
                  <div className={styles.sumRow}><span>Frais est.</span><span>${fmt(posUSD*leverage*0.0005,4)}</span></div>
                </div>
              )}

              {errMsg && <div className={styles.errBox}><span>{errMsg}</span><button onClick={()=>setErr('')}>✕</button></div>}
              {okMsg  && <div className={styles.okBox}>{okMsg}</div>}

              <button
                className={styles.ctaBtn+' '+(side==='long'?styles.ctaLong:styles.ctaShort)}
                onClick={handleTrade}
                disabled={submitting || !hasKeys}
              >
                {submitting ? '⟳ Envoi...' : side==='long' ? `↑ Long ${base} ×${leverage}` : `↓ Short ${base} ×${leverage}`}
              </button>
            </div>
          )}

          {tab === 'positions' && (
            <div className={styles.positions}>
              {loading && <div className={styles.posMsg}>Chargement...</div>}
              {!loading && positions.length === 0 && (
                <div className={styles.posMsg}>
                  <div style={{fontSize:28}}>📭</div>
                  <div>Aucune position ouverte</div>
                  <button className={styles.backBtn} onClick={()=>setTab('trade')}>← Ouvrir une position</button>
                </div>
              )}
              {positions.map((pos, i) => (
                <div key={i} className={styles.posRow}>
                  <div className={styles.posTop}>
                    <span className={styles.posSym}>{pos.symbol?.replace('USDT','/USDT')}</span>
                    <span style={{color:pos.side==='long'?'var(--grn)':'var(--red)',fontWeight:700,fontSize:12}}>
                      {pos.side==='long'?'↑ Long':'↓ Short'} {pos.leverage}×
                    </span>
                    <span style={{color:parseFloat(pos.unrealizedPNL||0)>=0?'var(--grn)':'var(--red)',fontFamily:'var(--mono)',fontWeight:800,fontSize:14}}>
                      {parseFloat(pos.unrealizedPNL||0)>=0?'+':''}{fmt(pos.unrealizedPNL||0,2)} USDT
                    </span>
                  </div>
                  <div className={styles.posDetail}>
                    <span>Taille: {pos.qty}</span>
                    <span>Entrée: {fmtPx(pos.avgOpenPrice)}</span>
                    <span style={{color:'var(--red)'}}>Liq: {fmtPx(pos.liqPrice)}</span>
                  </div>
                  <button className={styles.closeBtn} onClick={()=>handleClose(pos)}>Fermer au marché</button>
                </div>
              ))}
              {!loading && <button className={styles.refreshBtn} onClick={loadData}>↻ Actualiser</button>}
            </div>
          )}
        </>
      )}

      <div className={styles.footer}>
        ⚡ Bitunix Perps · Ref FXSA · API clés requises
      </div>
    </div>
  )
}
