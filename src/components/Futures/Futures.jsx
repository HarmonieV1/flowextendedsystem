import { useState } from 'react'
import { useStore } from '../../store'
import { useKeyboardShortcuts } from '../../hooks/useKeyboardShortcuts'
import { fmtPx, fmt } from '../../lib/format'
import styles from './Futures.module.css'

// ── Referral codes ─────────────────────────────────────────────────────────────
// Drift: créer sur app.drift.trade → Overview → Referral → 35% des fees on-chain
// GMX:   créer sur app.gmx.io/#/referrals → code FXSEDGE → 15% des fees
const DRIFT_REF = 'FXSEDGE'
const GMX_REF   = 'FXSEDGE'

const LEVERAGE_PRESETS = [2, 5, 10, 20, 50, 100]

const DRIFT_MARKETS = {
  BTCUSDT:'BTC-PERP', ETHUSDT:'ETH-PERP', SOLUSDT:'SOL-PERP',
  BNBUSDT:'BNB-PERP', XRPUSDT:'XRP-PERP', DOGEUSDT:'DOGE-PERP',
  AVAXUSDT:'AVAX-PERP', ARBUSDT:'ARB-PERP', LINKUSDT:'LINK-PERP',
  ADAUSDT:'ADA-PERP', SUIUSDT:'SUI-PERP', WIFUSDT:'WIF-PERP',
}

const GMX_MARKETS = {
  BTCUSDT:'BTC-USD', ETHUSDT:'ETH-USD', SOLUSDT:'SOL-USD',
  ARBUSDT:'ARB-USD', LINKUSDT:'LINK-USD', AVAXUSDT:'AVAX-USD',
}

export function Futures({ onOpenWallet }) {
  const pair   = useStore(s => s.pair)
  const lastPx = useStore(s => s.lastPx)
  const base   = pair.replace('USDT', '')

  const [platform, setPlatform] = useState('drift')
  const [side, setSide]         = useState('long')
  const [orderType, setOType]   = useState('market')
  const [qty, setQty]           = useState('')
  const [price, setPrice]       = useState('')
  const [leverage, setLeverage] = useState(10)
  const [tpsl, setTpsl]         = useState(false)
  const [tp, setTp]             = useState('')
  const [sl, setSl]             = useState('')

  const posUSD = qty && lastPx ? parseFloat(qty) * lastPx : 0
  const maxLev = platform === 'drift' ? 101 : 50

  useKeyboardShortcuts({
    onLong:       () => setSide('long'),
    onShort:      () => setSide('short'),
    onSetLeverage: l => setLeverage(Math.min(l, maxLev)),
    onEsc:        () => {},
    enabled:      true,
  })

  const buildDriftUrl = () => {
    const market = DRIFT_MARKETS[pair] || 'SOL-PERP'
    const params = new URLSearchParams({
      ref: DRIFT_REF, market,
      side: side === 'long' ? 'buy' : 'sell',
      leverage: String(leverage),
      ...(qty ? { size: qty } : {}),
      ...(orderType === 'limit' && price ? { price, orderType: 'LIMIT' } : {}),
    })
    return `https://app.drift.trade/?${params}`
  }

  const buildGmxUrl = () => {
    const market = GMX_MARKETS[pair] || 'BTC-USD'
    return `https://app.gmx.io/#/trade?market=${market}&isLong=${side==='long'}&ref=${GMX_REF}`
  }

  const handleTrade = () => {
    const url = platform === 'drift' ? buildDriftUrl() : buildGmxUrl()
    window.open(url, '_blank', 'noopener,noreferrer')
  }

  return (
    <div className={styles.wrap}>

      {/* Platform selector */}
      <div className={styles.header}>
        <div className={styles.platRow}>
          <button
            className={styles.platBtn + (platform==='drift' ? ' '+styles.platDrift : '')}
            onClick={() => setPlatform('drift')}
          >
            <span className={styles.platEmoji}>⚡</span>
            <div>
              <span className={styles.platName}>Drift Protocol</span>
              <span className={styles.platTag}>Solana · 101× · No KYC · 35% fees</span>
            </div>
          </button>
          <button
            className={styles.platBtn + (platform==='gmx' ? ' '+styles.platGmx : '')}
            onClick={() => setPlatform('gmx')}
          >
            <span className={styles.platEmoji}>🔵</span>
            <div>
              <span className={styles.platName}>GMX v2</span>
              <span className={styles.platTag}>Arbitrum · Non-custodial · 15% fees</span>
            </div>
          </button>
        </div>
        <div className={styles.pairBox}>
          <span className={styles.pairSym}>{base}/USDT</span>
          {lastPx > 0 && <span className={styles.pairPx}>{fmtPx(lastPx)}</span>}
        </div>
      </div>

      {/* Info strip */}
      <div className={styles.strip} style={{
        background:     platform==='drift' ? 'rgba(99,102,241,.06)' : 'rgba(45,106,246,.06)',
        borderLeftColor:platform==='drift' ? '#6366f1' : '#2d6af6',
      }}>
        {platform==='drift' ? (
          <span className={styles.stripTxt}>
            ⚡ Drift · DEX Solana · 101× levier max · No KYC ·
            <strong> 35% des fees</strong> reversés via ref FXSEDGE
          </span>
        ) : (
          <span className={styles.stripTxt}>
            🔵 GMX v2 · Arbitrum · Non-custodial · Min $10 ·
            <strong> 15% des fees</strong> via ref FXSEDGE
          </span>
        )}
      </div>

      {/* KB shortcuts */}
      <div className={styles.kbBar}>
        {[['L','Long'],['X','Short'],['1-6','Levier'],['Esc','Reset']].map(([k,v])=>(
          <span key={k} className={styles.kbItem}>
            <span className={styles.kbd}>{k}</span>
            <span className={styles.kbV}>{v}</span>
          </span>
        ))}
        <span className={styles.kbSep}/>
        <span className={styles.refTag}>
          Ref: {platform==='drift' ? DRIFT_REF : GMX_REF}
        </span>
      </div>

      {/* Form */}
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

        {/* Market / Limit */}
        <div className={styles.typeRow}>
          {['market','limit'].map(t => (
            <button key={t}
              className={styles.typeBtn+(orderType===t?' '+styles.typeOn:'')}
              onClick={()=>setOType(t)}
            >{t==='market'?'Market':'Limite'}</button>
          ))}
        </div>

        {/* Price (limit) */}
        {orderType==='limit' && (
          <div className={styles.field}>
            <div className={styles.fLbl}>
              <span>Prix</span>
              <button className={styles.lastBtn} onClick={()=>setPrice(lastPx.toString())}>
                Last {fmtPx(lastPx)}
              </button>
            </div>
            <div className={styles.fRow}>
              <input className={styles.fIn} type="number" value={price}
                onChange={e=>setPrice(e.target.value)} placeholder="0.00"/>
              <span className={styles.fUnit}>USDT</span>
            </div>
          </div>
        )}

        {/* Quantity */}
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
          <input type="range" min="1" max={maxLev} value={leverage}
            onChange={e=>setLeverage(+e.target.value)}
            className={styles.levSlider}
            style={{background:`linear-gradient(to right,var(--grn) ${leverage/maxLev*100}%,var(--bg3) ${leverage/maxLev*100}%)`}}
          />
          <div className={styles.levPresets}>
            {LEVERAGE_PRESETS.filter(l=>l<=maxLev).map(l=>(
              <button key={l}
                className={styles.levP+(leverage===l?' '+styles.levPOn:'')}
                onClick={()=>setLeverage(l)}
              >{l}×</button>
            ))}
          </div>
        </div>

        {/* TP/SL */}
        <button
          className={styles.tpslToggle+(tpsl?' '+styles.tpslOn:'')}
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
        {qty && parseFloat(qty)>0 && (
          <div className={styles.summary}>
            <div className={styles.sumRow}><span>Position</span><span>${fmt(posUSD*leverage,2)}</span></div>
            <div className={styles.sumRow}><span>Marge</span><span>${fmt(posUSD,2)} USDT</span></div>
            <div className={styles.sumRow}><span>Levier</span><span>{leverage}×</span></div>
            <div className={styles.sumRow}><span>Frais est.</span><span>${fmt(posUSD*leverage*0.0005,4)}</span></div>
          </div>
        )}

        {/* CTA */}
        <button
          className={styles.execBtn+' '+(side==='long'?styles.execLong:styles.execShort)}
          onClick={handleTrade}
        >
          {side==='long'?'↑ Long ':'↓ Short '}{base} ×{leverage}
          {platform==='drift'?' → Drift ↗':' → GMX ↗'}
        </button>

        <div className={styles.note}>
          {platform==='drift'
            ? 'Drift Protocol · Solana · Phantom / Solflare wallet requis'
            : 'GMX v2 · Arbitrum · MetaMask requis · Min $10'}
        </div>

        {/* Drift setup banner */}
        {platform==='drift' && (
          <div className={styles.driftBanner}>
            <div className={styles.driftBannerTitle}>💰 Activer tes revenus Drift</div>
            <div className={styles.driftBannerText}>
              Crée ton code ref sur <strong>app.drift.trade → Overview → Referral</strong><br/>
              Tu gagnes <strong>35% des fees</strong> de chaque utilisateur · USDC on-chain · Pas de plafond
            </div>
            <a href="https://app.drift.trade" target="_blank" rel="noreferrer" className={styles.driftBannerBtn}>
              Créer mon code ref Drift ↗
            </a>
          </div>
        )}

        {platform==='gmx' && (
          <div className={styles.gmxBanner}>
            <div className={styles.driftBannerTitle}>💰 Activer tes revenus GMX</div>
            <div className={styles.driftBannerText}>
              Crée ton code ref sur <strong>app.gmx.io/#/referrals</strong><br/>
              Tu gagnes <strong>15% des fees</strong> taker de chaque utilisateur
            </div>
            <a href="https://app.gmx.io/#/referrals" target="_blank" rel="noreferrer" className={styles.driftBannerBtn} style={{background:'#2d6af6'}}>
              Créer mon code ref GMX ↗
            </a>
          </div>
        )}
      </div>

      <div className={styles.footer}>
        {platform==='drift'
          ? '⚡ Drift Protocol · Solana · 35% referral fees · Phantom/Solflare'
          : '🔵 GMX v2 · Arbitrum · 15% referral fees · MetaMask'}
      </div>
    </div>
  )
}
