import { useState, useCallback } from 'react'
import { useStore } from '../../store'
import { fmt, fmtPx, baseAsset } from '../../lib/format'
import { useBitunixTrade } from '../../hooks/useBitunixTrade'
import styles from './QuickTrade.module.css'

const QUICK_SIZES = ['25%', '50%', '75%', 'MAX']
const QUICK_AMOUNTS_USD = [10, 25, 50, 100, 250, 500]

export function QuickTrade({ onConnectBinance, onOpenWallet }) {
  const pair    = useStore(s => s.pair)
  const lastPx  = useStore(s => s.lastPx)
  const connected = useStore(s => s.connected)
  const balance = useStore(s => s.balance)

  const { apiConnected, balances: rawBalances = [], loading, executeOrder } = useBitunixTrade()

  const [side, setSide]     = useState('buy')
  const [mode, setMode]     = useState('pct')  // 'pct' | 'usd'
  const [selectedPct, setSelectedPct] = useState(null)
  const [selectedUSD, setSelectedUSD] = useState(null)
  const [status, setStatus] = useState(null)  // null | 'pending' | 'done' | 'error'
  const [errMsg, setErrMsg] = useState('')

  const base = baseAsset(pair)
  const usdtBal = rawBalances.find?.(b => b.sym === 'USDT')?.free || balance || 0

  const calcQty = () => {
    if (!lastPx) return 0
    if (mode === 'pct' && selectedPct !== null) {
      const pcts = [0.25, 0.5, 0.75, 1.0]
      return (usdtBal * pcts[selectedPct]) / lastPx
    }
    if (mode === 'usd' && selectedUSD !== null) {
      return QUICK_AMOUNTS_USD[selectedUSD] / lastPx
    }
    return 0
  }

  const qty = calcQty()
  const costUSD = qty * lastPx

  const handleTrade = useCallback(async () => {
    if (!connected) { onOpenWallet?.(); return }
    if (!apiConnected) { onConnectBinance?.(); return }
    if (!qty || qty <= 0) return

    setStatus('pending')
    try {
      await executeOrder({
        side: side === 'buy' ? 'BUY' : 'SELL',
        type: 'MARKET',
        quantity: qty.toFixed(6),
      })
      setStatus('done')
      setSelectedPct(null); setSelectedUSD(null)
      setTimeout(() => setStatus(null), 2000)
    } catch(e) {
      setStatus('error')
      setErrMsg(e.message?.includes('insufficient') ? 'Fonds insuffisants' : 'Erreur — réessaie')
      setTimeout(() => setStatus(null), 3000)
    }
  }, [connected, apiConnected, qty, side, executeOrder])

  const canTrade = qty > 0 && status !== 'pending'

  return (
    <div className={styles.wrap}>
      {/* Side toggle */}
      <div className={styles.sides}>
        <button
          className={`${styles.side} ${styles.buySide} ${side==='buy'?styles.sideOn:''}`}
          onClick={() => setSide('buy')}
        >Buy</button>
        <button
          className={`${styles.side} ${styles.sellSide} ${side==='sell'?styles.sideOn:''}`}
          onClick={() => setSide('sell')}
        >Sell</button>
      </div>

      {/* Mode toggle */}
      <div className={styles.modeRow}>
        <button className={`${styles.modeBtn} ${mode==='pct'?styles.modeOn:''}`} onClick={() => { setMode('pct'); setSelectedUSD(null) }}>% du portefeuille</button>
        <button className={`${styles.modeBtn} ${mode==='usd'?styles.modeOn:''}`} onClick={() => { setMode('usd'); setSelectedPct(null) }}>Montant fixe</button>
      </div>

      {/* Size grid */}
      {mode === 'pct' && (
        <div className={styles.sizeGrid}>
          {QUICK_SIZES.map((s, i) => (
            <button
              key={s}
              className={`${styles.sizeBtn} ${selectedPct===i?styles.sizeBtnOn:''} ${side==='buy'?styles.sizeBtnBuy:styles.sizeBtnSell}`}
              onClick={() => setSelectedPct(selectedPct===i ? null : i)}
            >{s}</button>
          ))}
        </div>
      )}

      {mode === 'usd' && (
        <div className={styles.usdGrid}>
          {QUICK_AMOUNTS_USD.map((a, i) => (
            <button
              key={a}
              className={`${styles.sizeBtn} ${selectedUSD===i?styles.sizeBtnOn:''} ${side==='buy'?styles.sizeBtnBuy:styles.sizeBtnSell}`}
              onClick={() => setSelectedUSD(selectedUSD===i ? null : i)}
            >${a}</button>
          ))}
        </div>
      )}

      {/* Order preview */}
      <div className={styles.preview}>
        <div className={styles.previewRow}>
          <span>Paire</span><span>{pair.replace('USDT','/USDT')}</span>
        </div>
        <div className={styles.previewRow}>
          <span>Prix</span><span>{fmtPx(lastPx)}</span>
        </div>
        <div className={styles.previewRow}>
          <span>Quantité</span>
          <span className={styles.previewQty}>{qty > 0 ? `${qty.toFixed(6)} ${base}` : '—'}</span>
        </div>
        <div className={styles.previewRow}>
          <span>Total</span>
          <span className={`${styles.previewTotal} ${side==='buy'?styles.buyColor:styles.sellColor}`}>
            {costUSD > 0 ? `$${fmt(costUSD)}` : '—'}
          </span>
        </div>
        <div className={styles.previewRow}>
          <span>Disponible</span>
          <span>${fmt(usdtBal)} USDT</span>
        </div>
      </div>

      {/* Execute button */}
      <button
        className={`${styles.execBtn} ${side==='buy'?styles.execBuy:styles.execSell} ${status==='done'?styles.execDone:''} ${status==='error'?styles.execErr:''}`}
        disabled={!canTrade && connected && apiConnected}
        onClick={handleTrade}
      >
        {status === 'pending' ? <><span className={styles.spinner}/>Envoi...</>
          : status === 'done' ? '✓ Ordre exécuté'
          : status === 'error' ? `✗ ${errMsg}`
          : !connected ? 'Connect Wallet'
          : !apiConnected ? 'Connecter Bitunix →'
          : !qty ? 'Sélectionne une taille'
          : `${side==='buy'?'Acheter':'Vendre'} ${qty.toFixed(4)} ${base} · Market`}
      </button>

      {/* Fee note */}
      {qty > 0 && (
        <div className={styles.feeNote}>
          Fee 0.1% ≈ ${fmt(costUSD * 0.001, 4)} · Non-custodial via Bitunix
        </div>
      )}
    </div>
  )
}
