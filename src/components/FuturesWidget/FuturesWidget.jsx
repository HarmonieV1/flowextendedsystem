import { useState, useEffect, useRef } from 'react'
import { useAccount, useWalletClient, usePublicClient } from 'wagmi'
import { useStore } from '../../store'
import { fmtPx, fmt } from '../../lib/format'
import { openPosition, GMX_MARKETS, UI_FEE_BPS } from '../../lib/gmxSdk'
import styles from './FuturesWidget.module.css'

const LEVERAGE_PRESETS = [2, 5, 10, 20, 50]

export function FuturesWidget({ onOpenWallet }) {
  const pair   = useStore(s => s.pair)
  const lastPx = useStore(s => s.lastPx)
  const base   = pair.replace('USDT', '')

  const { address, isConnected, chain } = useAccount()
  const { data: walletClient }          = useWalletClient()
  const publicClient                    = usePublicClient()

  const [side, setSide]         = useState('long')
  const [collateral, setCol]    = useState('')
  const [leverage, setLeverage] = useState(10)
  const [tpsl, setTpsl]         = useState(false)
  const [tp, setTp]             = useState('')
  const [sl, setSl]             = useState('')
  const [submitting, setSubmit] = useState(false)
  const [okMsg, setOkMsg]       = useState('')
  const [errMsg, setErr]        = useState('')

  const market  = GMX_MARKETS[pair]
  const posUSD  = collateral ? parseFloat(collateral) * leverage : 0
  const wrongChain = isConnected && chain?.id !== 42161

  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e) => {
      if (['INPUT','TEXTAREA'].includes(e.target.tagName)) return
      if (e.key === 'l' || e.key === 'L') setSide('long')
      if (e.key === 'x' || e.key === 'X') setSide('short')
      const lvls = [2, 5, 10, 20, 50]
      if (e.key >= '1' && e.key <= '5') setLeverage(lvls[+e.key - 1])
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [])

  const handleTrade = async () => {
    setErr(''); setOkMsg('')
    if (!isConnected) { onOpenWallet?.(); return }
    if (wrongChain) { setErr('Change le réseau sur Arbitrum dans MetaMask'); return }
    if (!collateral || parseFloat(collateral) < 10) { setErr('Minimum 10 USDC de collateral'); return }
    if (!market) { setErr(`${base} non disponible sur GMX. Essaie BTC, ETH, SOL, ARB, LINK`); return }

    setSubmit(true)
    try {
      const hash = await openPosition({
        walletClient,
        publicClient,
        pair,
        isLong: side === 'long',
        collateralUsd: parseFloat(collateral),
        leverage,
        account: address,
      })
      setOkMsg(`✓ Ordre ${side === 'long' ? 'Long ↑' : 'Short ↓'} envoyé — ${base} ×${leverage} · ${hash?.slice(0,10)}...`)
      setCol('')
      setTimeout(() => setOkMsg(''), 5000)
    } catch(e) {
      setErr(e.shortMessage || e.message || 'Erreur transaction')
    }
    setSubmit(false)
  }

  return (
    <div className={styles.wrap}>

      {/* Header */}
      <div className={styles.header}>
        <div className={styles.platInfo}>
          <span className={styles.platName}>🔵 GMX v2</span>
          <span className={styles.platTag}>Arbitrum · Non-custodial · Min $10 USDC</span>
        </div>
        <div className={styles.pairBox}>
          <span className={styles.pairSym}>{base}/USDT</span>
          {lastPx > 0 && <span className={styles.pairPx}>{fmtPx(lastPx)}</span>}
        </div>
      </div>

      {/* Availability check */}
      {!market && (
        <div className={styles.notAvail}>
          <span>⚠ {base} non disponible sur GMX</span>
          <span className={styles.notAvailSub}>
            Paires disponibles : BTC · ETH · SOL · ARB · LINK
          </span>
        </div>
      )}

      {/* Wrong chain warning */}
      {wrongChain && (
        <div className={styles.chainWarn}>
          ⚠ Change le réseau sur <strong>Arbitrum</strong> dans ton wallet
        </div>
      )}

      {/* Chain info */}
      <div style={{padding:'5px 14px',background:'rgba(45,106,246,.04)',borderBottom:'1px solid var(--brd)',display:'flex',alignItems:'center',gap:8,flexWrap:'wrap',flexShrink:0}}>
        <span style={{fontSize:9,color:'var(--txt3)'}}>Réseau:</span>
        <span style={{fontSize:9,fontWeight:700,color:'#4f9eff',padding:'1px 6px',background:'rgba(45,106,246,.12)',borderRadius:3}}>🔵 Arbitrum</span>
        <span style={{fontSize:9,color:'var(--txt3)',opacity:.5}}>+ Optimism · BNB · Base (V2)</span>
        <span style={{flex:1}}/>
        {wrongChain && (
          <span style={{fontSize:9,color:'#f59e0b',fontWeight:700}}>⚠ Change sur Arbitrum dans MetaMask</span>
        )}
      </div>

      {/* KB shortcuts */}
      <div className={styles.kbBar}>
        {[['L','Long'],['X','Short'],['1-5','Levier']].map(([k,v])=>(
          <span key={k} className={styles.kbItem}>
            <span className={styles.kbd}>{k}</span>
            <span className={styles.kbV}>{v}</span>
          </span>
        ))}
        <span style={{flex:1}}/>
        <span className={styles.feeTag}>Fee UI: {UI_FEE_BPS/100}%</span>
      </div>

      <div className={styles.form}>

        {/* Long / Short */}
        <div className={styles.sides}>
          <button className={styles.sideBtn+(side==='long'?' '+styles.longOn:'')} onClick={()=>setSide('long')}>
            ↑ Long
          </button>
          <button className={styles.sideBtn+(side==='short'?' '+styles.shortOn:'')} onClick={()=>setSide('short')}>
            ↓ Short
          </button>
        </div>

        {/* Collateral */}
        <div className={styles.field}>
          <div className={styles.fLbl}>
            <span>Collateral USDC</span>
            <span className={styles.fHint2}>Min $10</span>
          </div>
          <div className={styles.fRow}>
            <input className={styles.fIn} type="number" min="10" step="1"
              value={collateral} onChange={e=>setCol(e.target.value)} placeholder="100"/>
            <span className={styles.fUnit}>USDC</span>
          </div>
          {posUSD > 0 && (
            <div className={styles.fHint}>≈ ${fmt(posUSD,2)} position (×{leverage})</div>
          )}
        </div>

        {/* Leverage */}
        <div className={styles.levBlock}>
          <div className={styles.levTop}>
            <span className={styles.levLbl}>Levier</span>
            <span className={styles.levVal}>{leverage}×</span>
          </div>
          <input type="range" min="1" max="50" value={leverage}
            onChange={e=>setLeverage(+e.target.value)}
            className={styles.levSlider}
            style={{background:`linear-gradient(to right,var(--grn) ${leverage/50*100}%,var(--bg3) ${leverage/50*100}%)`}}
          />
          <div className={styles.levPresets}>
            {LEVERAGE_PRESETS.map(l=>(
              <button key={l}
                className={styles.levP+(leverage===l?' '+styles.levPOn:'')}
                onClick={()=>setLeverage(l)}
              >{l}×</button>
            ))}
          </div>
        </div>

        {/* TP/SL */}
        <button
          className={styles.tpslBtn+(tpsl?' '+styles.tpslOn:'')}
          onClick={()=>setTpsl(v=>!v)}
        >{tpsl?'▾':'▸'} TP / SL</button>
        {tpsl && (
          <div className={styles.tpslGrid}>
            <div className={styles.tpslF}>
              <span className={styles.tpL}>Take Profit</span>
              <input className={styles.tpslIn} type="number" value={tp}
                onChange={e=>setTp(e.target.value)} placeholder="Prix TP"/>
            </div>
            <div className={styles.tpslF}>
              <span className={styles.slL}>Stop Loss</span>
              <input className={styles.tpslIn} type="number" value={sl}
                onChange={e=>setSl(e.target.value)} placeholder="Prix SL"/>
            </div>
          </div>
        )}

        {/* Summary */}
        {collateral && parseFloat(collateral) >= 10 && (
          <div className={styles.summary}>
            <div className={styles.sumRow}><span>Position</span><span>${fmt(posUSD,2)}</span></div>
            <div className={styles.sumRow}><span>Collateral</span><span>${fmt(parseFloat(collateral),2)} USDC</span></div>
            <div className={styles.sumRow}><span>Levier</span><span>{leverage}×</span></div>
            <div className={styles.sumRow}><span>Fee UI ({UI_FEE_BPS/100}%)</span><span>${fmt(posUSD*UI_FEE_BPS/10000,4)}</span></div>
            <div className={styles.sumRow}><span>Prix entrée est.</span><span>{fmtPx(lastPx)}</span></div>
          </div>
        )}

        {errMsg && <div className={styles.errBox}><span>⚠ {errMsg}</span><button onClick={()=>setErr('')}>✕</button></div>}
        {okMsg  && <div className={styles.okBox}>{okMsg}</div>}

        {/* CTA */}
        {!isConnected ? (
          <button className={styles.ctaBtn} onClick={()=>onOpenWallet?.()}>
            Connecter le wallet
          </button>
        ) : (
          <button
            className={styles.ctaBtn+' '+(side==='long'?styles.ctaLong:styles.ctaShort)}
            onClick={handleTrade}
            disabled={submitting || !market || wrongChain}
          >
            {submitting ? '⟳ Signature MetaMask...'
              : side==='long'
              ? `↑ Long ${base} ×${leverage} sur GMX`
              : `↓ Short ${base} ×${leverage} sur GMX`}
          </button>
        )}

        <div className={styles.note}>
          GMX v2 · Arbitrum · Non-custodial · Tes fonds dans ton wallet · MetaMask requis
        </div>
      </div>

      <div className={styles.footer}>
        🔵 GMX v2 · Arbitrum · Fee UI {UI_FEE_BPS/100}% → {`0x12B3...42b1`}
      </div>
    </div>
  )
}
