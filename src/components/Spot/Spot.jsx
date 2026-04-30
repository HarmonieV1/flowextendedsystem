import { useState, useEffect, useCallback } from 'react'
import { useStore } from '../../store'
import { fmtPx, fmt } from '../../lib/format'
import { hasApiKeys, spotPlaceOrder, spotGetBalance } from '../../lib/bitunix'
import styles from './Spot.module.css'

const PAIRS = ['BTCUSDT','ETHUSDT','SOLUSDT','BNBUSDT','XRPUSDT','DOGEUSDT','AVAXUSDT','ARBUSDT','LINKUSDT','ADAUSDT']

export function Spot({ onOpenWallet }) {
  const pair   = useStore(s => s.pair)
  const lastPx = useStore(s => s.lastPx)
  const base   = pair.replace('USDT','')

  const [keyed, setKeyed]   = useState(false)
  const [side, setSide]     = useState('buy')
  const [orderType, setO]   = useState('market')
  const [amount, setAmount] = useState('')
  const [price, setPrice]   = useState('')
  const [submitting, setSub]= useState(false)
  const [ok, setOk]         = useState('')
  const [err, setErr]       = useState('')
  const [balances, setBal]  = useState([])

  const isAvail = PAIRS.includes(pair)

  useEffect(() => {
    setKeyed(hasApiKeys())
    const h = () => { setKeyed(hasApiKeys()); if(hasApiKeys()) loadBal() }
    window.addEventListener('fxs:keysUpdated', h)
    return () => window.removeEventListener('fxs:keysUpdated', h)
  }, [])

  const loadBal = useCallback(async () => {
    try { const d = await spotGetBalance(); setBal(Array.isArray(d)?d:[]) } catch(_) {}
  }, [])

  useEffect(() => { if (keyed) loadBal() }, [keyed])

  const usdtBal = balances.find(b=>b.coin==='USDT')?.available || null
  const baseBal = balances.find(b=>b.coin===base)?.available || null
  const qty     = amount&&lastPx&&side==='buy' ? (parseFloat(amount)/lastPx).toFixed(6) : ''

  const handleTrade = async () => {
    setErr(''); setOk('')
    if (!amount||parseFloat(amount)<=0) { setErr('Entre un montant'); return }
    if (!isAvail) { setErr(`${base} non disponible`); return }
    setSub(true)
    try {
      await spotPlaceOrder({
        symbol: pair,
        side:   side==='buy'?'BUY':'SELL',
        qty:    side==='buy' ? qty : amount,
        price:  orderType==='limit'?parseFloat(price):undefined,
        orderType: orderType==='limit'?'LIMIT':'MARKET',
      })
      setOk(`✓ ${side==='buy'?'Achat':'Vente'} ${base} confirmé`)
      setAmount('')
      setTimeout(()=>{ setOk(''); loadBal() }, 3000)
    } catch(e) { setErr(e.message) }
    setSub(false)
  }

  return (
    <div className={styles.wrap}>
      <div className={styles.header}>
        <div className={styles.platInfo}>
          <span className={styles.platName}>⚡ Bitunix Spot</span>
          <span className={styles.platTag}>CEX · 700+ paires · Achat/Vente · Ref FXSA</span>
        </div>
        <div className={styles.pairBox}>
          <span className={styles.pairSym}>{base}/USDT</span>
          {lastPx>0&&<span className={styles.pairPx}>{fmtPx(lastPx)}</span>}
        </div>
      </div>

      {!keyed ? (
        <div className={styles.noKey}>
          <div className={styles.noKeyTitle}>⚙️ Connecte ton compte Bitunix</div>
          <div className={styles.noKeyText}>Entre ta clé API Bitunix pour acheter et vendre directement depuis FXSEDGE.</div>
          <button className={styles.noKeyBtn} onClick={()=>window.dispatchEvent(new CustomEvent('fxs:openApiKey'))}>
            Connecter Bitunix →
          </button>
          <a href="https://www.bitunix.com/account/apiManagement" target="_blank" rel="noreferrer" className={styles.noKeyLink}>
            Créer une clé API sur Bitunix ↗
          </a>
        </div>
      ) : (
        <div className={styles.form}>
          {(usdtBal||baseBal) && (
            <div className={styles.balRow}>
              {usdtBal&&<span className={styles.bal}>💵 {fmt(usdtBal,2)} USDT</span>}
              {baseBal&&<span className={styles.bal}>{base}: {fmt(baseBal,6)}</span>}
              <button className={styles.refreshBal} onClick={loadBal}>↻</button>
            </div>
          )}
          {!isAvail&&<div className={styles.notAvail}>⚠ {base} non disponible sur Bitunix Spot</div>}
          <div className={styles.sides}>
            <button className={styles.sideBtn+(side==='buy'?' '+styles.buyOn:'')} onClick={()=>setSide('buy')}>↑ Acheter {base}</button>
            <button className={styles.sideBtn+(side==='sell'?' '+styles.sellOn:'')} onClick={()=>setSide('sell')}>↓ Vendre {base}</button>
          </div>
          <div className={styles.typeRow}>
            {['market','limit'].map(t=>(
              <button key={t} className={styles.typeBtn+(orderType===t?' '+styles.typeOn:'')} onClick={()=>setO(t)}>
                {t==='market'?'Market':'Limite'}
              </button>
            ))}
          </div>
          {orderType==='limit'&&(
            <div className={styles.field}>
              <div className={styles.fLbl}><span>Prix</span><button className={styles.lastBtn} onClick={()=>setPrice(lastPx.toString())}>Last {fmtPx(lastPx)}</button></div>
              <div className={styles.fRow}><input className={styles.fIn} type="number" value={price} onChange={e=>setPrice(e.target.value)} placeholder="0.00"/><span className={styles.fUnit}>USDT</span></div>
            </div>
          )}
          <div className={styles.field}>
            <div className={styles.fLbl}>
              <span>{side==='buy'?'Montant USDT':'Quantité '+base}</span>
              {side==='buy'&&usdtBal&&<button className={styles.lastBtn} onClick={()=>setAmount(usdtBal)}>Max {fmt(usdtBal,2)}</button>}
              {side==='sell'&&baseBal&&<button className={styles.lastBtn} onClick={()=>setAmount(baseBal)}>Max {fmt(baseBal,6)}</button>}
            </div>
            <div className={styles.fRow}>
              <input className={styles.fIn} type="number" value={amount} onChange={e=>setAmount(e.target.value)} placeholder="0"/>
              <span className={styles.fUnit}>{side==='buy'?'USDT':base}</span>
            </div>
            {side==='buy'&&qty&&<div className={styles.fHint}>≈ {qty} {base} @ {fmtPx(lastPx)}</div>}
          </div>
          {side==='buy'&&usdtBal&&(
            <div className={styles.pctRow}>
              {[25,50,75,100].map(p=>(
                <button key={p} className={styles.pctBtn} onClick={()=>setAmount((usdtBal*p/100).toFixed(2))}>{p}%</button>
              ))}
            </div>
          )}
          {err&&<div className={styles.errBox}><span>{err}</span><button onClick={()=>setErr('')}>✕</button></div>}
          {ok&&<div className={styles.okBox}>{ok}</div>}
          <button className={styles.ctaBtn+' '+(side==='buy'?styles.ctaBuy:styles.ctaSell)} onClick={handleTrade} disabled={submitting||!isAvail}>
            {submitting?'⟳ Envoi...' : side==='buy'?`Acheter ${base}`:`Vendre ${base}`}
          </button>
          <div className={styles.note}>Bitunix Spot · Ref FXSA · Tes fonds dans ton compte Bitunix</div>
        </div>
      )}

      <div className={styles.footer}>⚡ Bitunix Spot · Ref FXSA · Tes fonds dans ton compte</div>
    </div>
  )
}
