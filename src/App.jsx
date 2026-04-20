import { useState, useEffect } from 'react'
import { useStore } from './store'
import { Ticker } from './components/Ticker/Ticker'
import { Comparator } from './components/Comparator/Comparator'
import { Chart } from './components/Chart/Chart'
import { OrderBook } from './components/OrderBook/OrderBook'
import { DepthChart } from './components/DepthChart/DepthChart'
import { LiquidityHeatmap } from './components/LiquidityHeatmap/LiquidityHeatmap'
import { OrderForm } from './components/OrderForm/OrderForm'
import { Swap } from './components/Swap/Swap'
import { Futures } from './components/Futures/Futures'
import { MultiChart } from './components/MultiChart/MultiChart'
import { OrdersPanel } from './components/OrdersPanel/OrdersPanel'
import { WalletPage } from './components/WalletPage/WalletPage'
import { WalletModal } from './components/WalletModal/WalletModal'
import { DepositModal } from './components/DepositModal/DepositModal'
import { WithdrawModal } from './components/WithdrawModal/WithdrawModal'
import { ApiKeyModal } from './components/ApiKeyModal/ApiKeyModal'
import { BottomNav } from './components/BottomNav/BottomNav'
import { QuickTrade } from './components/QuickTrade/QuickTrade'
import { PriceAlerts } from './components/PriceAlerts/PriceAlerts'
import { useUrlSync } from './hooks/useUrlSync'
import styles from './App.module.css'

export default function App() {
  // Nav state from store (Ticker drives it)
  const view = useStore(s => s.view)
  const tab  = useStore(s => s.tab)
  const setView = useStore(s => s.setView)
  const setTab  = useStore(s => s.setTab)
  const lastPx  = useStore(s => s.lastPx)
  const connected = useStore(s => s.connected)

  const [walletOpen,   setWalletOpen]   = useState(false)
  const [depositOpen,  setDepositOpen]  = useState(false)
  const [withdrawOpen, setWithdrawOpen] = useState(false)
  const [apiKeyOpen,   setApiKeyOpen]   = useState(false)
  const [depositToken, setDepositToken] = useState(null)
  const [withdrawToken,setWithdrawToken]= useState(null)
  const [wsLive,       setWsLive]       = useState(false)
  useUrlSync()

  // Listen for OrdersPanel → open API key modal
  useEffect(() => {
    const handler = () => setApiKeyOpen(true)
    window.addEventListener('fxs:openApiKey', handler)
    return () => window.removeEventListener('fxs:openApiKey', handler)
  }, [])
  const [mobileFormOpen, setMobileFormOpen] = useState(false)
  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => { if (lastPx > 0) setWsLive(true) }, [lastPx])
  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth <= 768)
    check()
    window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [])

  const openDeposit  = t => { setDepositToken(t);  setDepositOpen(true)  }
  const openWithdraw = t => { setWithdrawToken(t); setWithdrawOpen(true) }

  const handleBottomNav = (v, t) => {
    setView(v); if (t) setTab(t); setMobileFormOpen(false)
  }

  const FormContent = () => {
    if (tab === 'QuickTrade') return <QuickTrade onOpenWallet={() => setWalletOpen(true)} onConnectBinance={() => setApiKeyOpen(true)} />
    if (tab === 'Futures') return <Futures onOpenWallet={() => setWalletOpen(true)} />
    if (tab === 'Swap')    return <Swap onOpenWallet={() => setWalletOpen(true)} />
    if (tab === 'Alertes') return <PriceAlerts />
    return <OrderForm onOpenWallet={() => setWalletOpen(true)} onConnectBinance={() => setApiKeyOpen(true)} />
  }

  // Mobile trade button label
  const mobileBtnLabel = mobileFormOpen ? '✕ Fermer'
    : tab === 'QuickTrade' ? '⚡ Quick Trade'
    : tab === 'Futures' ? '⊡ Long / Short'
    : tab === 'Swap'    ? '⇄ Swap'
    : tab === 'Alertes' ? '🔔 Alertes'
    : '◎ Buy / Sell'

  return (
    <div className={styles.root} style={isMobile ? {paddingBottom:'56px'} : {}}>

      {/* ── CHROME ── */}
      <Ticker onOpenWallet={() => setWalletOpen(true)} wsLive={wsLive} />
      <Comparator />

      {/* ── MULTI CHART ── */}
      {view === 'multi' && <MultiChart />}

      {/* ── PORTFOLIO ── */}
      {view === 'wallet' && <WalletPage onDeposit={openDeposit} onWithdraw={openWithdraw} />}

      {/* ── TRADE VIEW ── */}
      {view === 'trade' && (
        <div className={styles.workspace}>

          {/* LEFT COL — orderbook + liquidity map */}
          <div className={styles.leftCol}>
            <div className={styles.leftTop}>
              <OrderBook />
            </div>
            <div className={styles.leftBottom}>
              <LiquidityHeatmap />
            </div>
          </div>

          {/* CENTRE — chart + orders panel */}
          <div className={styles.centreCol}>
            <div className={styles.chartArea}><Chart /></div>
            <div className={styles.ordersArea}><OrdersPanel /></div>
          </div>

          {/* RIGHT — form (desktop only) */}
          {!isMobile && (
            <div className={styles.rightCol}><FormContent /></div>
          )}
        </div>
      )}

      {/* ── MOBILE TRADE BUTTON ── */}
      {isMobile && view === 'trade' && (
        <button
          className={`${styles.mobileBtn} ${mobileFormOpen ? styles.mobileBtnClose : ''}`}
          onClick={() => setMobileFormOpen(o => !o)}
        >{mobileBtnLabel}</button>
      )}

      {/* ── MOBILE BOTTOM SHEET ── */}
      {isMobile && mobileFormOpen && view === 'trade' && (
        <div className={styles.sheet}>
          <div className={styles.sheetHandle} />
          {/* Tabs inside sheet */}
          <div className={styles.sheetTabs}>
            {['QuickTrade','Spot','Futures','Swap','Alertes'].map(t => (
              <button key={t}
                className={`${styles.sheetTab} ${tab===t?styles.sheetTabOn:''}`}
                onClick={() => setTab(t)}
              >{t}</button>
            ))}
          </div>
          <div className={styles.sheetContent}><FormContent /></div>
        </div>
      )}

      {/* ── BOTTOM NAV (mobile) ── */}
      <BottomNav activeView={view} activeTab={tab} onNavigate={handleBottomNav} />

      {/* ── MODALS ── */}
      <WalletModal open={walletOpen} onClose={() => setWalletOpen(false)} />
      {depositOpen  && <DepositModal  token={depositToken}  onClose={() => setDepositOpen(false)}  />}
      {withdrawOpen && <WithdrawModal token={withdrawToken} onClose={() => setWithdrawOpen(false)} />}
      {apiKeyOpen   && <ApiKeyModal   onClose={() => setApiKeyOpen(false)} onSuccess={() => setApiKeyOpen(false)} />}
    </div>
  )
}
