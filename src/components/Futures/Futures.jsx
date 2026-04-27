import { useState } from 'react'
import { useStore } from '../../store'
import { fmtPx, fmt } from '../../lib/format'
import styles from './Futures.module.css'

const BITUNIX_REF = 'FXSA'
const LEVERAGE_PRESETS = [2, 5, 10, 20, 50, 100]

const BTU_SYMS = {
  BTCUSDT:'BTCUSDT',ETHUSDT:'ETHUSDT',SOLUSDT:'SOLUSDT',
  BNBUSDT:'BNBUSDT',XRPUSDT:'XRPUSDT',DOGEUSDT:'DOGEUSDT',
  AVAXUSDT:'AVAXUSDT',ARBUSDT:'ARBUSDT',LINKUSDT:'LINKUSDT',
  ADAUSDT:'ADAUSDT',DOTUSDT:'DOTUSDT',SUIUSDT:'SUIUSDT',
}

const GMX_MKTS = {
  BTCUSDT:'BTC-USD',ETHUSDT:'ETH-USD',SOLUSDT:'SOL-USD',
  ARBUSDT:'ARB-USD',LINKUSDT:'LINK-USD',AVAXUSDT:'AVAX-USD',
}

export function Futures({ onOpenWallet }) {
  const pair   = useStore(s => s.pair)
  const lastPx = useStore(s => s.lastPx)
  const base   = pair.replace('USDT','')

  const [platform, setPlatform] = useState('bitunix')
  const [side, setSide]         = useState('long')
  const [orderType, setOType]   = useState('market')
  const [qty, setQty]           = useState('')
  const [price, setPrice]       = useState('')
  const [leverage, setLeverage] = useState(10)
  const [tpsl, setTpsl]         = useState(false)
  const [tp, setTp]             = useState('')
  const [sl, setSl]             = useState('')

  const sym    = BTU_SYMS[pair] || 'BTCUSDT'
  const posUSD = qty && lastPx ? parseFloat(qty) * lastPx : 0

  // Keyboard shortcuts
  const handleKey = (e) => {
    if (['INPUT','TEXTAREA'].includes(e.target.tagName)) return
    if (e.key === 'l' || e.key === 'L') setSide('long')
    if (e.key === 'x' || e.key === 'X') setSide('short')
    const lvls = [2,5,10,20,50,100]
    if (e.key >= '1' && e.key <= '6') setLeverage(lvls[parseInt(e.key)-1])
  }

  // Open Bitunix with pre-filled params — user must be logged into Bitunix already
  const openBitunix = () => {
    const sym = BTU_SYMS[pair] || 'BTCUSDT'
    const url = new URL('https://www.bitunix.com/contract-trade/' + sym)
    url.searchParams.set('vipCode', BITUNIX_REF)
    // These params pre-fill the form if user is already logged in
    url.searchParams.set('leverage', leverage.toString())
    if (qty) url.searchParams.set('qty', qty)
    if (orderType === 'limit' && price) {
      url.searchParams.set('price', price)
    }
    window.open(url.toString(), '_blank', 'noopener,noreferrer')
  }

  const openGmx = () => {
    const mkt = GMX_MKTS[pair] || 'BTC-USD'
    const url = `https://app.gmx.io/#/trade?market=${mkt}&isLong=${side==='long'}&ref=FXSEDGE`
    window.open(url, '_blank', 'noopener,noreferrer')
  }

  return (
    <div className={styles.wrap} onKeyDown={handleKey} tabIndex={0}>

      {/* Platform + pair header */}
      <div className={styles.header}>
        <div className={styles.platRow}>
          <button className={styles.platBtn+(platform==='bitunix'?' '+styles.btuOn:'')} onClick={()=>setPlatform('bitunix')}>⚡ Bitunix</button>
          <button className={styles.platBtn+(platform==='gmx'?' '+styles.gmxOn:'')} onClick={()=>setPlatform('gmx')}>🔵 GMX v2</button>
        </div>
        <div className={styles.pairBox}>
          <span className={styles.pairSym}>{base}/USDT</span>
          {lastPx>0 && <span className={styles.pairPx}>{fmtPx(lastPx)}</span>}
        </div>
      </div>

      {/* KB hints */}
      <div className={styles.kbBar}>
        {[['L','Long'],['X','Short'],['1-6','Levier']].map(([k,v])=>(
          <span key={k} className={styles.kbItem}><span className={styles.kbd}>{k}</span><span className={styles.kbV}>{v}</span></span>
        ))}
        <span style={{flex:1}}/>
        <span className={styles.refBadge}>Ref: {platform==='bitunix'?BITUNIX_REF:'FXSEDGE'}</span>
      </div>

      {/* Form */}
      <div className={styles.form}>

        {/* Long / Short */}
        <div className={styles.sides}>
          <button className={styles.sideBtn+(side==='long'?' '+styles.longOn:'')} onClick={()=>setSide('long')}>Long ↑</button>
          <button className={styles.sideBtn+(side==='short'?' '+styles.shortOn:'')} onClick={()=>setSide('short')}>Short ↓</button>
        </div>

        {/* Market / Limit */}
        <div className={styles.typeRow}>
          {['market','limit'].map(t=>(
            <button key={t} className={styles.typeBtn+(orderType===t?' '+styles.typeOn:'')} onClick={()=>setOType(t)}>
              {t==='market'?'Market':'Limite'}
            </button>
          ))}
        </div>

        {/* Price (limit only) */}
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
          <div className={styles.fLbl}><span>Quantité</span></div>
          <div className={styles.fRow}>
            <input className={styles.fIn} type="number" value={qty} onChange={e=>setQty(e.target.value)} placeholder="0.001"/>
            <span className={styles.fUnit}>{base}</span>
          </div>
          {posUSD>0 && <div className={styles.fHint}>≈ ${fmt(posUSD*leverage,2)} position · ${fmt(posUSD,2)} marge</div>}
        </div>

        {/* Leverage */}
        <div className={styles.levBlock}>
          <div className={styles.levTop}>
            <span className={styles.levLbl}>Levier</span>
            <span className={styles.levVal}>{leverage}×</span>
          </div>
          <input type="range" min="1" max="100" value={leverage} onChange={e=>setLeverage(+e.target.value)}
            className={styles.levSlider}
            style={{background:`linear-gradient(to right,var(--grn) ${leverage}%,var(--bg3) ${leverage}%)`}}/>
          <div className={styles.levPresets}>
            {LEVERAGE_PRESETS.map(l=>(
              <button key={l} className={styles.levP+(leverage===l?' '+styles.levPOn:'')} onClick={()=>setLeverage(l)}>{l}×</button>
            ))}
          </div>
        </div>

        {/* TP/SL */}
        <button className={styles.tpslToggle+(tpsl?' '+styles.tpslOn:'')} onClick={()=>setTpsl(v=>!v)}>
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
        {qty && parseFloat(qty)>0 && (
          <div className={styles.summary}>
            <div className={styles.sumRow}><span>Position</span><span>${fmt(posUSD*leverage,2)}</span></div>
            <div className={styles.sumRow}><span>Marge</span><span>${fmt(posUSD,2)} USDT</span></div>
            <div className={styles.sumRow}><span>Levier</span><span>{leverage}×</span></div>
            <div className={styles.sumRow}><span>Frais est.</span><span>${fmt(posUSD*leverage*0.0005,4)}</span></div>
          </div>
        )}

        {/* Main CTA */}
        <button
          className={styles.execBtn+' '+(side==='long'?styles.execLong:styles.execShort)}
          onClick={platform==='bitunix'?openBitunix:openGmx}
        >
          {side==='long'?'↑ Long ':'↓ Short '}{base} ×{leverage}
          {platform==='bitunix'?' → Bitunix ↗':' → GMX ↗'}
        </button>

        <div className={styles.note}>
          {platform==='bitunix'
            ? '⚡ Ouvre Bitunix avec tes paramètres · Connecte-toi sur Bitunix pour trader'
            : '🔵 Ouvre GMX · Wallet MetaMask requis · Min $10'}
        </div>

        {/* Bitunix account note */}
        {platform==='bitunix' && (
          <div className={styles.accountBox}>
            <span>Pas de compte Bitunix ?</span>
            <a href={`https://www.bitunix.com/register?vipCode=${BITUNIX_REF}`}
              target="_blank" rel="noreferrer" className={styles.registerLink}>
              Créer un compte ↗
            </a>
          </div>
        )}

      </div>

      <div className={styles.footer}>
        {platform==='bitunix'?`⚡ Bitunix Perps · Ref ${BITUNIX_REF}`:'🔵 GMX v2 · Arbitrum · Non-custodial'}
      </div>
    </div>
  )
}
