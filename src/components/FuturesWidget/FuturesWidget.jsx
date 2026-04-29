import { useState, useEffect } from 'react'
import { useStore } from '../../store'
import { fmtPx, fmt } from '../../lib/format'
import styles from './FuturesWidget.module.css'

const REF = 'FXSA'
const LEVERAGE_PRESETS = [2, 5, 10, 20, 50, 100]

const BITUNIX_PAIRS = {
  BTCUSDT:'BTCUSDT', ETHUSDT:'ETHUSDT', SOLUSDT:'SOLUSDT',
  BNBUSDT:'BNBUSDT', XRPUSDT:'XRPUSDT', DOGEUSDT:'DOGEUSDT',
  ARBUSDT:'ARBUSDT', LINKUSDT:'LINKUSDT', ADAUSDT:'ADAUSDT',
  AVAXUSDT:'AVAXUSDT', SUIUSDT:'SUIUSDT',
}

export function FuturesWidget({ onOpenWallet }) {
  const pair   = useStore(s => s.pair)
  const lastPx = useStore(s => s.lastPx)
  const base   = pair.replace('USDT', '')

  const [side, setSide]     = useState('long')
  const [leverage, setLev]  = useState(10)
  const [qty, setQty]       = useState('')
  const [tpsl, setTpsl]     = useState(false)
  const [tp, setTp]         = useState('')
  const [sl, setSl]         = useState('')

  const isAvailable = !!BITUNIX_PAIRS[pair]
  const posUSD      = qty && lastPx ? parseFloat(qty) * lastPx : 0

  // Keyboard shortcuts
  useEffect(() => {
    const h = (e) => {
      if (['INPUT','TEXTAREA'].includes(e.target.tagName)) return
      if (e.key === 'l' || e.key === 'L') setSide('long')
      if (e.key === 'x' || e.key === 'X') setSide('short')
      const lvls = [2, 5, 10, 20, 50, 100]
      if (e.key >= '1' && e.key <= '6') setLev(lvls[+e.key - 1])
    }
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [])

  const openBitunix = () => {
    const sym = BITUNIX_PAIRS[pair] || 'BTCUSDT'
    const params = new URLSearchParams({
      ref: REF,
      ...(qty ? { size: qty } : {}),
    })
    const url = `https://www.bitunix.com/contract/${sym}?${params}`
    window.open(url, '_blank', 'noopener,noreferrer')
  }

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

      {/* KB shortcuts */}
      <div className={styles.kbBar}>
        {[['L','Long'],['X','Short'],['1-6','Levier']].map(([k,v])=>(
          <span key={k} className={styles.kbItem}>
            <span className={styles.kbd}>{k}</span>
            <span className={styles.kbV}>{v}</span>
          </span>
        ))}
        <span style={{flex:1}}/>
        <span className={styles.refTag}>Ref: {REF}</span>
      </div>

      <div className={styles.form}>
        {/* Long / Short */}
        <div className={styles.sides}>
          <button className={styles.sideBtn+(side==='long'?' '+styles.longOn:'')} onClick={()=>setSide('long')}>↑ Long</button>
          <button className={styles.sideBtn+(side==='short'?' '+styles.shortOn:'')} onClick={()=>setSide('short')}>↓ Short</button>
        </div>

        {/* Qty */}
        <div className={styles.field}>
          <div className={styles.fLbl}><span>Quantité</span></div>
          <div className={styles.fRow}>
            <input className={styles.fIn} type="number" value={qty}
              onChange={e=>setQty(e.target.value)} placeholder="0.001"/>
            <span className={styles.fUnit}>{base}</span>
          </div>
          {posUSD > 0 && (
            <div className={styles.fHint}>
              ≈ ${fmt(posUSD*leverage,2)} position · ${fmt(posUSD,2)} marge
            </div>
          )}
        </div>

        {/* Leverage */}
        <div className={styles.levBlock}>
          <div className={styles.levTop}>
            <span className={styles.levLbl}>Levier</span>
            <span className={styles.levVal}>{leverage}×</span>
          </div>
          <input type="range" min="1" max="100" value={leverage}
            onChange={e=>setLev(+e.target.value)}
            className={styles.levSlider}
            style={{background:`linear-gradient(to right,var(--grn) ${leverage}%,var(--bg3) ${leverage}%)`}}
          />
          <div className={styles.levPresets}>
            {LEVERAGE_PRESETS.map(l=>(
              <button key={l}
                className={styles.levP+(leverage===l?' '+styles.levPOn:'')}
                onClick={()=>setLev(l)}
              >{l}×</button>
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
        {qty && parseFloat(qty) > 0 && (
          <div className={styles.summary}>
            <div className={styles.sumRow}><span>Position</span><span>${fmt(posUSD*leverage,2)}</span></div>
            <div className={styles.sumRow}><span>Marge</span><span>${fmt(posUSD,2)} USDT</span></div>
            <div className={styles.sumRow}><span>Levier</span><span>{leverage}×</span></div>
          </div>
        )}

        {!isAvailable && (
          <div className={styles.notAvail}>⚠ {base} non disponible — change de paire</div>
        )}

        {/* CTA */}
        <button
          className={styles.ctaBtn+' '+(side==='long'?styles.ctaLong:styles.ctaShort)}
          onClick={openBitunix}
          disabled={!isAvailable}
        >
          {side==='long'
            ? `↑ Long ${base} ×${leverage} sur Bitunix ↗`
            : `↓ Short ${base} ×${leverage} sur Bitunix ↗`}
        </button>

        <div className={styles.note}>
          Tu seras redirigé sur Bitunix · Tes fonds dans ton compte Bitunix · Ref FXSA actif
        </div>
      </div>

      <div className={styles.footer}>
        ⚡ Bitunix Perps · Ref FXSA · Revenue d'affiliation sur chaque trade
      </div>
    </div>
  )
}
