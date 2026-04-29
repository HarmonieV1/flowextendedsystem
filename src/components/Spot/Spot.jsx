import { useState, useEffect } from 'react'
import { useStore } from '../../store'
import { fmtPx, fmt } from '../../lib/format'
import { hasApiKeys, spotPlaceOrder, spotGetBalance } from '../../lib/bitunix'
import styles from './Spot.module.css'

const SPOT_PAIRS = [
  'BTCUSDT','ETHUSDT','SOLUSDT','BNBUSDT','XRPUSDT',
  'DOGEUSDT','AVAXUSDT','ARBUSDT','LINKUSDT','ADAUSDT',
]

export function Spot({ onOpenWallet }) {
  const pair   = useStore(s => s.pair)
  const lastPx = useStore(s => s.lastPx)
  const base   = pair.replace('USDT', '')

  const [side, setSide]       = useState('buy')
  const [orderType, setOType] = useState('market')
  const [amount, setAmount]   = useState('') // USDC amount
  const [price, setPrice]     = useState('')
  const [submitting, setSub]  = useState(false)
  const [okMsg, setOk]        = useState('')
  const [errMsg, setErr]      = useState('')
  const [balance, setBalance] = useState(null)
  const [hasKeys, setHasKeys] = useState(false)

  const isAvailable = SPOT_PAIRS.includes(pair)

  // Check keys from localStorage
  useEffect(() => {
    setHasKeys(hasApiKeys())
    const h = () => setHasKeys(hasApiKeys())
    window.addEventListener('fxs:keysUpdated', h)
    return () => window.removeEventListener('fxs:keysUpdated', h)
  }, [])

  // Calc qty from USDC amount
  const qty = amount && lastPx ? (parseFloat(amount) / lastPx).toFixed(6) : ''
  const usdtBal = balance?.find?.(b => b.coin === 'USDT')?.available || null
  const baseBal = balance?.find?.(b => b.coin === base)?.available || null

  const handleTrade = async () => {
    setErr(''); setOk('')
    if (!hasKeys) { setErr('Configure tes clés API Bitunix dans Netlify → Environment Variables'); return }
    if (!amount || parseFloat(amount) <= 0) { setErr('Entre un montant'); return }
    if (!isAvailable) { setErr(`${base} non disponible — change de paire`); return }

    setSub(true)
    try {
      if (side === 'buy') {
        // Buy: on passe le montant USDC
        await spotPlaceOrder({
          symbol:    pair,
          side:      'BUY',
          qty:       qty,
          price:     orderType === 'limit' ? parseFloat(price) : undefined,
          orderType: orderType === 'limit' ? 'LIMIT' : 'MARKET',
        })
        setOk(`✓ Achat de ${qty} ${base} pour ~$${amount}`)
      } else {
        // Sell: on passe la quantité en base
        await spotPlaceOrder({
          symbol:    pair,
          side:      'SELL',
          qty:       amount, // en mode sell, amount = qty en base
          price:     orderType === 'limit' ? parseFloat(price) : undefined,
          orderType: orderType === 'limit' ? 'LIMIT' : 'MARKET',
        })
        setOk(`✓ Vente de ${amount} ${base}`)
      }
      setAmount('')
      setTimeout(() => setOk(''), 4000)
    } catch(e) {
      setErr(e.message || 'Erreur')
    }
    setSub(false)
  }

  return (
    <div className={styles.wrap}>
      <div className={styles.header}>
        <div className={styles.platInfo}>
          <span className={styles.platName}>⚡ Bitunix Spot</span>
          <span className={styles.platTag}>CEX · 700+ paires · Achat/Vente direct · Ref FXSA</span>
        </div>
        <div className={styles.pairBox}>
          <span className={styles.pairSym}>{base}/USDT</span>
          {lastPx > 0 && <span className={styles.pairPx}>{fmtPx(lastPx)}</span>}
        </div>
      </div>

      {!isAvailable && (
        <div className={styles.notAvail}>⚠ {base} non disponible sur Bitunix Spot. Change de paire.</div>
      )}

      {!hasKeys && (
        <div className={styles.noKeyBanner}>
          <div className={styles.noKeyTitle}>⚙️ Clés API requises</div>
          <div className={styles.noKeyText}>
            Configure <code>BITUNIX_API_KEY</code> et <code>BITUNIX_SECRET_KEY</code> dans Netlify → Environment Variables
          </div>
          <div style={{display:'flex',gap:8}}>
            <button className={styles.noKeyBtn}
              onClick={() => window.dispatchEvent(new CustomEvent('fxs:openApiKey'))}>
              ⚙️ Connecter mes clés API
            </button>
            <a href="https://www.bitunix.com/account/apiManagement" target="_blank" rel="noreferrer"
              style={{padding:'10px',background:'var(--bg3)',borderRadius:8,color:'var(--txt3)',fontSize:11,textDecoration:'none',display:'flex',alignItems:'center'}}>
              Créer une clé ↗
            </a>
          </div>
        </div>
      )}

      {hasKeys && (
        <div className={styles.form}>
          {/* Balances */}
          {(usdtBal || baseBal) && (
            <div className={styles.balRow}>
              {usdtBal && <span className={styles.bal}>💵 {fmt(usdtBal, 2)} USDT</span>}
              {baseBal && <span className={styles.bal}>{base}: {fmt(baseBal, 6)}</span>}
            </div>
          )}

          {/* Buy / Sell */}
          <div className={styles.sides}>
            <button className={styles.sideBtn+(side==='buy'?' '+styles.buyOn:'')} onClick={()=>setSide('buy')}>↑ Acheter {base}</button>
            <button className={styles.sideBtn+(side==='sell'?' '+styles.sellOn:'')} onClick={()=>setSide('sell')}>↓ Vendre {base}</button>
          </div>

          {/* Order type */}
          <div className={styles.typeRow}>
            {['market','limit'].map(t=>(
              <button key={t} className={styles.typeBtn+(orderType===t?' '+styles.typeOn:'')} onClick={()=>setOType(t)}>
                {t==='market'?'Market':'Limite'}
              </button>
            ))}
          </div>

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

          <div className={styles.field}>
            <div className={styles.fLbl}>
              <span>{side==='buy'?'Montant (USDT à dépenser)':'Quantité à vendre'}</span>
              {side==='buy' && usdtBal && (
                <button className={styles.lastBtn} onClick={()=>setAmount(usdtBal)}>Max {fmt(usdtBal,2)}</button>
              )}
              {side==='sell' && baseBal && (
                <button className={styles.lastBtn} onClick={()=>setAmount(baseBal)}>Max {fmt(baseBal,6)}</button>
              )}
            </div>
            <div className={styles.fRow}>
              <input className={styles.fIn} type="number" value={amount} onChange={e=>setAmount(e.target.value)} placeholder="0"/>
              <span className={styles.fUnit}>{side==='buy'?'USDT':base}</span>
            </div>
            {side==='buy' && qty && <div className={styles.fHint}>≈ {qty} {base} @ {fmtPx(lastPx)}</div>}
          </div>

          {/* Shortcuts */}
          {side === 'buy' && usdtBal && (
            <div className={styles.pctRow}>
              {[25,50,75,100].map(pct=>(
                <button key={pct} className={styles.pctBtn} onClick={()=>setAmount((usdtBal*pct/100).toFixed(2))}>
                  {pct}%
                </button>
              ))}
            </div>
          )}

          {errMsg && <div className={styles.errBox}><span>{errMsg}</span><button onClick={()=>setErr('')}>✕</button></div>}
          {okMsg  && <div className={styles.okBox}>{okMsg}</div>}

          <button
            className={styles.ctaBtn+' '+(side==='buy'?styles.ctaBuy:styles.ctaSell)}
            onClick={handleTrade}
            disabled={submitting || !isAvailable}
          >
            {submitting ? '⟳ Envoi...' : side==='buy' ? `Acheter ${base}` : `Vendre ${base}`}
          </button>

          <div className={styles.note}>Bitunix Spot · Non-custodial dans ton compte Bitunix · Ref FXSA</div>
        </div>
      )}

      <div className={styles.footer}>⚡ Bitunix Spot · Ref FXSA · Clés API requises</div>
    </div>
  )
}
