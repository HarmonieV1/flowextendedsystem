import { useState } from 'react'
import { useStore } from '../../store'
import { fmt, fmtPx, baseAsset } from '../../lib/format'
import { useBitunixTrade } from '../../hooks/useBitunixTrade'
import styles from './QuickTrade.module.css'

const PRESETS_PCT = ['25%','50%','75%','MAX']
const PRESETS_USD = [10,25,50,100]

export function QuickTrade({ onConnectBinance, onOpenWallet }) {
  const pair    = useStore(s => s.pair)
  const lastPx  = useStore(s => s.lastPx)
  const connected = useStore(s => s.connected)
  const balance = useStore(s => s.balance)

  const { apiConnected, balances: rawBalances = [], executeOrder } = useBitunixTrade()

  const [side,   setSide]   = useState('buy')
  const [otype,  setOtype]  = useState('market')
  const [qty,    setQty]    = useState('')
  const [preset, setPreset] = useState(null)
  const [status, setStatus] = useState(null)
  const [errMsg, setErrMsg] = useState('')

  const base = baseAsset(pair)
  const usdtBal = rawBalances.find?.(b => b.sym === 'USDT')?.free || balance || 0

  const calcQty = () => {
    if (!lastPx || !preset) return 0
    if (typeof preset === 'string') {
      const pct = parseInt(preset) / 100
      return (usdtBal * pct) / lastPx
    }
    return preset / lastPx
  }

  const displayQty = qty || (preset ? calcQty().toFixed(6) : '')
  const total = parseFloat(displayQty) * lastPx

  const handleTrade = async () => {
    if (!connected) { onOpenWallet?.(); return }
    if (!apiConnected) { onConnectBinance?.(); return }
    const q = parseFloat(displayQty)
    if (!q || q <= 0) { setErrMsg('Entre une quantité'); return }
    setStatus('pending'); setErrMsg('')
    try {
      await executeOrder({ symbol: pair, side, type: otype, quantity: q, price: lastPx })
      setStatus('done'); setQty(''); setPreset(null)
      setTimeout(() => setStatus(null), 2000)
    } catch(e) {
      setStatus('error')
      setErrMsg(e.message?.includes('reject') ? 'Annulé' : e.message?.slice(0,60) || 'Erreur')
      setTimeout(() => setStatus(null), 3000)
    }
  }

  return (
    <div className={styles.wrap}>
      {/* Buy / Sell */}
      <div className={styles.sides}>
        <button className={styles.side + ' ' + styles.sideB + (side==='buy'?' '+styles.on:'')} onClick={()=>setSide('buy')}>
          Acheter {base}
        </button>
        <button className={styles.side + ' ' + styles.sideS + (side==='sell'?' '+styles.on:'')} onClick={()=>setSide('sell')}>
          Vendre {base}
        </button>
      </div>

      <div className={styles.body}>
        {/* Current price */}
        <div className={styles.priceRow}>
          <span className={styles.priceLabel}>Prix actuel</span>
          <span className={styles.priceVal}>{fmtPx(lastPx)}</span>
        </div>

        {/* Order type */}
        <div className={styles.typeRow}>
          {['market','limit','stop'].map(t => (
            <button key={t} className={styles.typeBtn+(otype===t?' '+styles.on:'')} onClick={()=>setOtype(t)}>
              {t.charAt(0).toUpperCase()+t.slice(1)}
            </button>
          ))}
        </div>

        {/* Amount input */}
        <div className={styles.inputRow}>
          <input
            className={styles.input}
            type="number"
            placeholder={side==='buy' ? '0.000000' : '0.000000'}
            value={qty}
            onChange={e => { setQty(e.target.value); setPreset(null) }}
          />
          <span className={styles.inputUnit}>{base}</span>
        </div>

        {/* Quick presets */}
        <div className={styles.presets}>
          {(side==='buy' ? PRESETS_PCT : PRESETS_PCT).map(p => (
            <button key={p}
              className={styles.preset+(preset===p?' '+styles.sel:'')}
              onClick={() => { setPreset(p); setQty('') }}
            >{p}</button>
          ))}
        </div>

        {/* Summary */}
        {(parseFloat(displayQty) > 0) && (
          <div className={styles.summary}>
            <div className={styles.sumRow}><span>Quantité</span><span>{parseFloat(displayQty).toFixed(6)} {base}</span></div>
            <div className={styles.sumRow}><span>Total estimé</span><span>${fmt(total)}</span></div>
            <div className={styles.sumRow}><span>Frais (~0.1%)</span><span>${fmt(total*0.001,3)}</span></div>
            {usdtBal > 0 && <div className={styles.sumRow}><span>Solde USDT</span><span>${fmt(usdtBal)}</span></div>}
          </div>
        )}

        {errMsg && <div className={styles.err}>⚠ {errMsg}</div>}
        {status==='done' && <div className={styles.ok}>✓ Ordre exécuté</div>}

        {!connected && (
          <button className={styles.cpBtn} onClick={onOpenWallet}>Connecter Wallet</button>
        )}
        {connected && !apiConnected && (
          <button className={styles.cpBtn} style={{background:'#f59e0b'}} onClick={onConnectBinance}>
            Connecter Bitunix API
          </button>
        )}
      </div>

      {/* Action button */}
      {connected && apiConnected && (
        <button
          className={styles.execBtn + ' ' + (side==='buy' ? styles.execBuy : styles.execSell)}
          onClick={handleTrade}
          disabled={status==='pending'}
          style={{margin:'0 12px 12px'}}
        >
          {status==='pending' ? '⟳ Envoi...' : side==='buy' ? `Acheter ${base}` : `Vendre ${base}`}
        </button>
      )}
    </div>
  )
}
