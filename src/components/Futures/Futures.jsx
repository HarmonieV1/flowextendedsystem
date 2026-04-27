import { useState } from 'react'
import { useStore } from '../../store'
import { useKeyboardShortcuts } from '../../hooks/useKeyboardShortcuts'
import { fmtPx, fmt } from '../../lib/format'
import styles from './Futures.module.css'

const BITUNIX_REF = 'FXSA'
const LEVERAGE_PRESETS = [2, 5, 10, 20, 50, 100]

// dYdX v4: autorise iframe, DEX fully decentralized, 200+ marchés
// Affiliate program: 30-50% des taker fees, payés en USDC on-chain
// Builder Codes: embed fees jusqu'à 1% par ordre directement dans le protocole
const DYDX_MARKETS = {
  BTCUSDT:'BTC-USD', ETHUSDT:'ETH-USD', SOLUSDT:'SOL-USD',
  BNBUSDT:'BNB-USD', XRPUSDT:'XRP-USD', DOGEUSDT:'DOGE-USD',
  AVAXUSDT:'AVAX-USD', ARBUSDT:'ARB-USD', LINKUSDT:'LINK-USD',
  ADAUSDT:'ADA-USD', DOTUSDT:'DOT-USD', SUIUSDT:'SUI-USD',
  INJUSDT:'INJ-USD', NEARUSDT:'NEAR-USD', OPUSDT:'OP-USD',
}

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

  const [platform, setPlatform] = useState('dydx')
  const [side, setSide]         = useState('long')
  const [orderType, setOType]   = useState('market')
  const [qty, setQty]           = useState('')
  const [price, setPrice]       = useState('')
  const [leverage, setLeverage] = useState(10)
  const [tpsl, setTpsl]         = useState(false)
  const [tp, setTp]             = useState('')
  const [sl, setSl]             = useState('')

  const posUSD = qty && lastPx ? parseFloat(qty) * lastPx : 0

  useKeyboardShortcuts({
    onLong: () => setSide('long'),
    onShort: () => setSide('short'),
    onSetLeverage: l => setLeverage(l),
    onEsc: () => {},
    enabled: true,
  })

  const openDydx = () => {
    const mkt = DYDX_MARKETS[pair] || 'BTC-USD'
    // dYdX affiliate link — register at trade.dydx.exchange/affiliate
    window.open(`https://trade.dydx.exchange/trade/${mkt}`, '_blank', 'noopener,noreferrer')
  }

  const openBitunix = () => {
    const sym = BTU_SYMS[pair] || 'BTCUSDT'
    window.open(`https://www.bitunix.com/contract-trade/${sym}?vipCode=${BITUNIX_REF}`, '_blank', 'noopener,noreferrer')
  }

  const openGmx = () => {
    const mkt = GMX_MKTS[pair] || 'BTC-USD'
    window.open(`https://app.gmx.io/#/trade?market=${mkt}&isLong=${side==='long'}&ref=FXSEDGE`, '_blank', 'noopener,noreferrer')
  }

  const handleTrade = () => {
    if (platform === 'dydx')    openDydx()
    else if (platform === 'bitunix') openBitunix()
    else openGmx()
  }

  return (
    <div className={styles.wrap}>
      <div className={styles.header}>
        <div className={styles.platRow}>
          <button className={styles.platBtn+(platform==='dydx'?' '+styles.platDydx:'')} onClick={()=>setPlatform('dydx')}>⚡ dYdX</button>
          <button className={styles.platBtn+(platform==='bitunix'?' '+styles.platBtu:'')} onClick={()=>setPlatform('bitunix')}>🟡 Bitunix</button>
          <button className={styles.platBtn+(platform==='gmx'?' '+styles.platGmx:'')} onClick={()=>setPlatform('gmx')}>🔵 GMX</button>
        </div>
        <div className={styles.pairBox}>
          <span className={styles.pairSym}>{base}/USDT</span>
          {lastPx>0 && <span className={styles.pairPx}>{fmtPx(lastPx)}</span>}
        </div>
      </div>

      {/* Platform info strip */}
      <div className={styles.strip}>
        {platform==='dydx' && <span className={styles.stripText}>⚡ dYdX v4 · DEX · 200+ marchés · Affiliate 30-50% fees · Pas de KYC</span>}
        {platform==='bitunix' && <span className={styles.stripText}>🟡 Bitunix Perps · Ref FXSA · Dès $1 · Compte requis</span>}
        {platform==='gmx' && <span className={styles.stripText}>🔵 GMX v2 · Arbitrum · Non-custodial · Min $10</span>}
      </div>

      {/* KB bar */}
      <div className={styles.kbBar}>
        {[['L','Long'],['X','Short'],['1-6','Levier']].map(([k,v])=>(
          <span key={k} className={styles.kbItem}><span className={styles.kbd}>{k}</span><span className={styles.kbV}>{v}</span></span>
        ))}
      </div>

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

        {orderType==='limit' && (
          <div className={styles.field}>
            <div className={styles.fLbl}><span>Prix</span><button className={styles.lastBtn} onClick={()=>setPrice(lastPx.toString())}>Last {fmtPx(lastPx)}</button></div>
            <div className={styles.fRow}><input className={styles.fIn} type="number" value={price} onChange={e=>setPrice(e.target.value)} placeholder="0.00"/><span className={styles.fUnit}>USDT</span></div>
          </div>
        )}

        <div className={styles.field}>
          <div className={styles.fLbl}><span>Quantité</span></div>
          <div className={styles.fRow}><input className={styles.fIn} type="number" value={qty} onChange={e=>setQty(e.target.value)} placeholder="0.001"/><span className={styles.fUnit}>{base}</span></div>
          {posUSD>0 && <div className={styles.fHint}>≈ ${fmt(posUSD*leverage,2)} position · ${fmt(posUSD,2)} marge</div>}
        </div>

        <div className={styles.levBlock}>
          <div className={styles.levTop}><span className={styles.levLbl}>Levier</span><span className={styles.levVal}>{leverage}×</span></div>
          <input type="range" min="1" max="100" value={leverage} onChange={e=>setLeverage(+e.target.value)} className={styles.levSlider}
            style={{background:`linear-gradient(to right,var(--grn) ${leverage}%,var(--bg3) ${leverage}%)`}}/>
          <div className={styles.levPresets}>{LEVERAGE_PRESETS.map(l=>(
            <button key={l} className={styles.levP+(leverage===l?' '+styles.levPOn:'')} onClick={()=>setLeverage(l)}>{l}×</button>
          ))}</div>
        </div>

        <button className={styles.tpslToggle+(tpsl?' '+styles.tpslOn:'')} onClick={()=>setTpsl(v=>!v)}>{tpsl?'▾':'▸'} TP / SL</button>
        {tpsl && (
          <div className={styles.tpslGrid}>
            <div className={styles.tpslF}><span className={styles.tpL}>Take Profit</span><input className={styles.tpslIn} type="number" value={tp} onChange={e=>setTp(e.target.value)} placeholder="Prix TP"/></div>
            <div className={styles.tpslF}><span className={styles.slL}>Stop Loss</span><input className={styles.tpslIn} type="number" value={sl} onChange={e=>setSl(e.target.value)} placeholder="Prix SL"/></div>
          </div>
        )}

        {qty && parseFloat(qty)>0 && (
          <div className={styles.summary}>
            <div className={styles.sumRow}><span>Position</span><span>${fmt(posUSD*leverage,2)}</span></div>
            <div className={styles.sumRow}><span>Marge</span><span>${fmt(posUSD,2)} USDT</span></div>
            <div className={styles.sumRow}><span>Levier</span><span>{leverage}×</span></div>
            <div className={styles.sumRow}><span>Frais est.</span><span>${fmt(posUSD*leverage*0.0005,4)}</span></div>
          </div>
        )}

        <button className={styles.execBtn+' '+(side==='long'?styles.execLong:styles.execShort)} onClick={handleTrade}>
          {side==='long'?'↑ Long ':'↓ Short '}{base} ×{leverage}
          {platform==='dydx'?' → dYdX ↗':platform==='bitunix'?' → Bitunix ↗':' → GMX ↗'}
        </button>

        <div className={styles.note}>
          {platform==='dydx' && 'dYdX v4 · Inscris-toi au programme affilié sur trade.dydx.exchange/affiliate → 30-50% fees'}
          {platform==='bitunix' && 'Bitunix · Connecte-toi avant de cliquer · Ref FXSA actif'}
          {platform==='gmx' && 'GMX v2 · Wallet MetaMask requis · Arbitrum · Min $10'}
        </div>
      </div>

      <div className={styles.footer}>
        {platform==='dydx'?'⚡ dYdX v4 · Cosmos · 200+ perps · DEX fully decentralized'
          :platform==='bitunix'?'🟡 Bitunix Perps · Ref FXSA'
          :'🔵 GMX v2 · Arbitrum · Non-custodial'}
      </div>
    </div>
  )
}
