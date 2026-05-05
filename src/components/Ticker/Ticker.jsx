import { useState, useEffect, useRef } from 'react'
import { useStore } from '../../store'
import { fmtPx } from '../../lib/format'
import { HotkeyConfig } from '../HotkeyConfig/HotkeyConfig'
import styles from './Ticker.module.css'

const ALL_PAIRS = [
  // Top 10
  'BTCUSDT','ETHUSDT','BNBUSDT','SOLUSDT','XRPUSDT','DOGEUSDT','ADAUSDT','AVAXUSDT','TRXUSDT','DOTUSDT',
  // DeFi & L2
  'LINKUSDT','UNIUSDT','AAVEUSDT','MKRUSDT','SNXUSDT','COMPUSDT','CRVUSDT','LDOUSDT','PENDLEUSDT',
  'ARBUSDT','OPUSDT','MATICUSDT','STXUSDT','INJUSDT','TIAUSDT','SEIUSDT','MANTAUSDT','JUPUSDT',
  // L1 & Infra
  'NEARUSDT','APTUSDT','SUIUSDT','ATOMUSDT','ALGOUSDT','FTMUSDT','ICPUSDT','FILUSDT','HBARUSDT',
  'TONUSDT','KASUSDT','RUNEUSDT','EGLDUSDT','VETUSDT','QNTUSDT',
  // AI & Gaming & RWA
  'RENDERUSDT','FETUSDT','TAOUSDT','GRTUSDT','THETAUSDT','AXSUSDT','IMXUSDT','GALAUSDT','WLDUSDT',
  'ONDOUSDT','JASMYUSDT',
  // Meme
  'PEPEUSDT','WIFUSDT','BONKUSDT','SHIBUSDT','FLOKIUSDT','MEMEUSDT','TURBOUST','BRETTUSDT',
  // Exchange & Legacy
  'LTCUSDT','BCHUSDT','ETCUSDT','XLMUSDT','EOSUSDT','XMRUSDT','ZECUSDT',
  // DeFi 2.0
  'PYTHUSDT','JITOMUSDT','ENAUSDT','EIGENUSDT','STRKUSDT','ZKUSDT','BLURUSDT',
  // New 2025/2026
  'LABSUSDT','RAVEUSDT','MOVEUSDT','GRASSUSDT','DRIFTUSDT','AETHUSDT',
]

function useTheme() {
  const [dark, setDark] = useState(() => localStorage.getItem('fxs_theme') !== 'light')
  const toggle = () => setDark(d => { const nd=!d; localStorage.setItem('fxs_theme',nd?'dark':'light'); document.documentElement.setAttribute('data-theme',nd?'dark':'light'); return nd })
  useEffect(() => { document.documentElement.setAttribute('data-theme',dark?'dark':'light') }, [])
  return [dark, toggle]
}

export function Ticker({ onOpenWallet, wsLive }) {
  const pair = useStore(s => s.pair)
  const setPair = useStore(s => s.setPair)
  const lastPx = useStore(s => s.lastPx)
  const setView = useStore(s => s.setView)
  const view = useStore(s => s.view)
  const tab = useStore(s => s.tab)
  const setTab = useStore(s => s.setTab)
  const connected = useStore(s => s.connected)

  const [ticker, setTicker] = useState({})
  const [pairSearch, setPairSearch] = useState('')
  const [pairModalOpen, setPairModalOpen] = useState(false)
  const [hotkeyOpen, setHotkeyOpen] = useState(false)
  const [dark, toggleTheme] = useTheme()
  const searchRef = useRef(null)

  // Ticker WS pour la paire active
  useEffect(() => {
    if (!pair) return
    const ws = new WebSocket(`wss://stream.binance.com:9443/ws/${pair.toLowerCase()}@ticker`)
    ws.onmessage = e => {
      try { setTicker(JSON.parse(e.data)) } catch(_) {}
    }
    return () => { ws.onclose=null; try{ws.close()}catch(_){} }
  }, [pair])

  useEffect(() => {
    if (pairModalOpen && searchRef.current) searchRef.current.focus()
  }, [pairModalOpen])

  const chg = parseFloat(ticker.P || 0)
  const high = parseFloat(ticker.h || 0)
  const low = parseFloat(ticker.l || 0)
  const vol = parseFloat(ticker.q || 0)
  const bid = parseFloat(ticker.b || lastPx || 0)
  const ask = parseFloat(ticker.a || lastPx || 0)
  const spread = ask && bid ? ((ask - bid) / bid * 100).toFixed(4) : '0.0000'

  const filteredPairs = ALL_PAIRS.filter(p =>
    p.toLowerCase().includes(pairSearch.toLowerCase())
  )

  const base = pair.replace('USDT','')

  return (
    <>
      <div className={styles.header}>
        {/* Logo */}
        <div className={styles.logo}>FXS<span className={styles.logoFlow}>EDGE</span></div>

        {/* Pair selector button */}
        <button className={styles.pairBtn} onClick={() => setPairModalOpen(true)}>
          <span className={styles.pairName}>{base}<span className={styles.pairQuote}>/USDT</span></span>
          <span className={styles.pairArr}>▾</span>
        </button>

        {/* Main nav — Spot / Futures / Swap */}
        <nav className={styles.mainnav}>
          {['Futures','Spot','Swap'].map(t => (
            <button
              key={t}
              className={`${styles.navBtn} ${tab===t&&view==='trade'?styles.navOn:''}`}
              onClick={() => { setView('trade'); setTab(t) }}
            >{t}</button>
          ))}
          <div className={styles.navSep} />
          <button className={`${styles.navBtn} ${view==='multi'?styles.navOn:''}`} onClick={() => setView('multi')}>Multi ⊞</button>
          <button className={`${styles.navBtn} ${view==='copy'?styles.navOn:''}`} onClick={() => setView('copy')}>Copy ⟳</button>
          <button className={`${styles.navBtn} ${view==='manifesto'?styles.navOn:''}`} onClick={() => setView('manifesto')}>Landing</button>
          <button className={`${styles.navBtn} ${view==='intel'?styles.navOn:''}`} onClick={() => setView('intel')}>📡 Intel</button>
          <button className={`${styles.navBtn} ${view==='wallet'?styles.navOn:''}`} onClick={() => setView('wallet')}>Portfolio</button>
        </nav>

        {/* Right — Lang + Theme + WS + wallet */}
        <div className={styles.right}>
          <button
            className={styles.themeBtn}
            onClick={() => setHotkeyOpen(true)}
            title="Raccourcis clavier"
          >⌨</button>
          <button
            className={styles.themeBtn}
            onClick={() => { const { getLang, setLang } = require('../../lib/i18n'); const cur = getLang(); setLang(cur === 'fr' ? 'en' : 'fr'); location.reload() }}
            title="FR / EN"
          >{(() => { try { return require('../../lib/i18n').getLang().toUpperCase() } catch { return 'FR' } })()}</button>
          <button
            className={styles.themeBtn}
            onClick={toggleTheme}
            title={dark ? 'Light mode' : 'Dark mode'}
          >{dark ? '☀' : '🌙'}</button>
          {wsLive && <span className={styles.wsPill}><span className={styles.wsDot}/>LIVE</span>}
          <button className={styles.connectBtn} onClick={onOpenWallet}>
            {connected ? `${useStore.getState().address?.slice(0,6)}...` : 'Connect Wallet'}
          </button>
        </div>
      </div>

      {hotkeyOpen && <HotkeyConfig onClose={() => setHotkeyOpen(false)} />}

      {/* Ticker stats row */}
      <div className={styles.statsRow}>
        <div className={styles.mainPx}>
          <span className={styles.price}>{fmtPx(lastPx || parseFloat(ticker.c || 0))}</span>
          <span className={`${styles.chg} ${chg>=0?styles.pos:styles.neg}`}>{chg>0?'+':''}{chg.toFixed(2)}%</span>
        </div>
        <div className={styles.stats}>
          <Stat label="24H HIGH" val={high?fmtPx(high):'—'} />
          <Stat label="24H LOW" val={low?fmtPx(low):'—'} />
          <Stat label="24H VOL" val={vol?'$'+(vol/1e6).toFixed(2)+'M':'—'} />
          <Stat label="BID" val={bid?fmtPx(bid):'—'} />
          <Stat label="ASK" val={ask?fmtPx(ask):'—'} />
          <Stat label="SPREAD" val={spread+'%'} />
        </div>
      </div>

      {/* Pair search modal */}
      {pairModalOpen && (
        <div className={styles.modalBg} onClick={() => setPairModalOpen(false)}>
          <div className={styles.modal} onClick={e => e.stopPropagation()}>
            <div className={styles.modalHdr}>
              <span className={styles.modalTitle}>Choisir une paire</span>
              <button className={styles.modalClose} onClick={() => setPairModalOpen(false)}>✕</button>
            </div>
            <div className={styles.searchWrap}>
              <span className={styles.searchIcon}>⌕</span>
              <input
                ref={searchRef}
                className={styles.searchInput}
                placeholder="BTC, ETH, SOL..."
                value={pairSearch}
                onChange={e => setPairSearch(e.target.value)}
              />
            </div>
            <div className={styles.pairList}>
              {filteredPairs.map(p => (
                <button
                  key={p}
                  className={`${styles.pairRow} ${pair===p?styles.pairRowOn:''}`}
                  onClick={() => { setPair(p); setPairModalOpen(false); setPairSearch('') }}
                >
                  <span className={styles.pairRowName}>{p.replace('USDT','/USDT')}</span>
                  {pair===p && <span className={styles.pairRowCheck}>✓</span>}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  )
}

const Stat = ({ label, val }) => (
  <div className={styles.stat}>
    <span className={styles.statL}>{label}</span>
    <span className={styles.statV}>{val}</span>
  </div>
)
