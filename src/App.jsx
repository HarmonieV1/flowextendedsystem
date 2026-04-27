import { useState, useEffect, useCallback } from 'react'
import { useStore } from './store'
import { Ticker } from './components/Ticker/Ticker'
import { Comparator } from './components/Comparator/Comparator'
import { Chart } from './components/Chart/Chart'
import { OrderBook } from './components/OrderBook/OrderBook'
import { LiquidityHeatmap } from './components/LiquidityHeatmap/LiquidityHeatmap'
import { OrderForm } from './components/OrderForm/OrderForm'
import { Spot } from './components/Spot/Spot'
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
import { QuickFutures } from './components/QuickFutures/QuickFutures'
import { PriceAlerts } from './components/PriceAlerts/PriceAlerts'
import { DeltaFlow } from './components/DeltaFlow/DeltaFlow'
import { FundingRates } from './components/FundingRates/FundingRates'
import { OptionsFlow } from './components/OptionsFlow/OptionsFlow'
// New intel components are imported via MarketIntel
import { LiquidationMap } from './components/LiquidationMap/LiquidationMap'
import { MarketIntel } from './components/MarketIntel/MarketIntel'
import { PatternScanner } from './components/PatternScanner/PatternScanner'
import { MarketOverview } from './components/MarketOverview/MarketOverview'
import { SmartMoney } from './components/SmartMoney/SmartMoney'
import { Manifesto } from './components/Manifesto/Manifesto'
import { CopyTrading } from './components/CopyTrading/CopyTrading'
import { TradeJournal } from './components/TradeJournal/TradeJournal'
import { MarketScanner } from './components/MarketScanner/MarketScanner'
import { PositionSizer } from './components/PositionSizer/PositionSizer'
import { useUrlSync } from './hooks/useUrlSync'
import { useOnChainBalance } from './hooks/useBalance'
import styles from './App.module.css'

// ── Composants définis HORS de App() — sinon remount à chaque render ──
function SpotForm({ onOpenWallet, onApiKey }) {
  return <Spot onOpenWallet={onOpenWallet} />
}
function FuturesForm({ onOpenWallet }) {
  return <Futures onOpenWallet={onOpenWallet} />
}
function SwapForm({ onOpenWallet }) {
  return <Swap onOpenWallet={onOpenWallet} />
}
function MobileSpot({ onOpenWallet, onApiKey }) {
  return <Spot onOpenWallet={onOpenWallet} />
}
function MobileFutures({ onOpenWallet }) {
  return <QuickFutures onOpenWallet={onOpenWallet} />
}
function MobileSwap({ onOpenWallet }) {
  return <Swap onOpenWallet={onOpenWallet} />
}

const LEFT_PANELS = ['split', 'smart']
const COMP_LABELS = { binance:'BNB', bybit:'BYB', okx:'OKX', bitget:'BTG', mexc:'MEX', gate:'GIO', htx:'HTX' }

export default function App() {
  const view    = useStore(s => s.view)
  const tab     = useStore(s => s.tab)
  const setView = useStore(s => s.setView)
  const setTab  = useStore(s => s.setTab)
  const lastPx  = useStore(s => s.lastPx)
  const comparatorPrices = useStore(s => s.comparatorPrices) || {}

  const [walletOpen,   setWalletOpen]   = useState(false)
  const [depositOpen,  setDepositOpen]  = useState(false)
  const [withdrawOpen, setWithdrawOpen] = useState(false)
  const [apiKeyOpen,   setApiKeyOpen]   = useState(false)
  const [depositToken, setDepositToken] = useState(null)
  const [withdrawToken,setWithdrawToken]= useState(null)
  const [wsLive,       setWsLive]       = useState(false)
  const [leftPanel,    setLeftPanel]    = useState('split')

  const [ordersOpen,   setOrdersOpen]   = useState(false)
  const [isMobile,     setIsMobile]     = useState(false)

  useUrlSync()
  useOnChainBalance() // sync wallet balance to store

  useEffect(() => { if (lastPx > 0) setWsLive(true) }, [lastPx])

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth <= 768)
    check()
    window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [])

  useEffect(() => {
    const h = () => setApiKeyOpen(true)
    window.addEventListener('fxs:openApiKey', h)
    return () => window.removeEventListener('fxs:openApiKey', h)
  }, [])

  const openWallet   = useCallback(() => setWalletOpen(true),  [])
  const openApiKey   = useCallback(() => setApiKeyOpen(true),  [])
  const openDeposit  = useCallback(t => { setDepositToken(t);  setDepositOpen(true)  }, [])
  const openWithdraw = useCallback(t => { setWithdrawToken(t); setWithdrawOpen(true) }, [])
  const handleNav    = useCallback((v, t) => { setView(v); if (t) setTab(t) }, [setView, setTab])

  // Mini comparator for mobile
  const validPrices = Object.entries(comparatorPrices)
    .map(([id, d]) => ({ id, label: COMP_LABELS[id] || id.slice(0,3).toUpperCase(), ask: d?.ask }))
    .filter(s => s.ask > 0)
  const bestAsk = validPrices.length ? Math.min(...validPrices.map(s => s.ask)) : 0

  return (
    <div className={styles.root}>

      {/* ── CHROME ── */}
      <Ticker onOpenWallet={openWallet} wsLive={wsLive} />
      <MarketOverview />
      <Comparator />

      {/* ── FULL PAGE VIEWS ── */}
      {view === 'multi'     && <MultiChart />}
      {view === 'wallet'    && <WalletPage onDeposit={openDeposit} onWithdraw={openWithdraw} />}
      {view === 'copy'      && <CopyTrading onConnectWallet={openWallet} />}
      {view === 'manifesto' && <Manifesto />}
      {view === 'sizer'     && <PositionSizer />}
      {view === 'journal'   && <TradeJournal />}
      {view === 'intel'     && <MarketIntel />}
      {view === 'liqmap'    && <LiquidationMap />}
      {view === 'scanner'   && <MarketScanner />}
      {view === 'patterns'  && <div style={{flex:1,minHeight:0,overflow:'hidden',display:'flex',flexDirection:'column'}}><PatternScanner /></div>}
      {view === 'delta'     && <div style={{flex:1,minHeight:0,overflow:'hidden',display:'flex',flexDirection:'column'}}><DeltaFlow /></div>}
      {view === 'funding'   && <div style={{flex:1,minHeight:0,overflow:'hidden',display:'flex',flexDirection:'column'}}><FundingRates /></div>}
      {view === 'options'   && <div style={{flex:1,minHeight:0,overflow:'hidden',display:'flex',flexDirection:'column'}}><OptionsFlow /></div>}

      {/* ── ALERTS INLINE (shown as compact bar below comparator) ── */}
      {/* PriceAlerts integrated into Comparator component */}

      {/* ── TRADE VIEW ── */}
      {view === 'trade' && (
        <div className={styles.tradeView}>

          {/* Mobile price strip */}
          {isMobile && validPrices.length > 0 && (
            <div className={styles.mobileComp}>
              <span className={styles.mcBest}>BEST</span>
              {validPrices.map(src => {
                const isBest = Math.abs(src.ask - bestAsk) < 0.5
                return (
                  <div key={src.id} className={`${styles.mcItem} ${isBest ? styles.mcItemBest : ''}`}>
                    <span className={styles.mcName}>{src.label}</span>
                    <span className={styles.mcPx}>{src.ask.toFixed(1)}</span>
                    {isBest && <span className={styles.mcTick}>✓</span>}
                  </div>
                )
              })}
            </div>
          )}

          {/* Desktop + Mobile: workspace (chart/book) */}
          <div className={styles.workspace}>

            {/* LEFT col — desktop only */}
            <div className={styles.leftCol}>
              <div className={styles.leftTabs}>
                <button
                  className={`${styles.leftTab} ${leftPanel === 'split' ? styles.leftTabOn : ''}`}
                  onClick={() => setLeftPanel('split')}
                >Book + Map</button>
                <button
                  className={`${styles.leftTab} ${leftPanel === 'smart' ? styles.leftTabOn : ''}`}
                  onClick={() => setLeftPanel('smart')}
                >🐋 Whales</button>
              </div>
              {leftPanel === 'split' ? (
                <div className={styles.leftSplit}>
                  <div className={styles.leftTop}><OrderBook /></div>
                  <div className={styles.leftBottom}><LiquidityHeatmap /></div>
                </div>
              ) : (
                <div className={styles.leftContent}><SmartMoney /></div>
              )}
            </div>

            {/* CENTRE — chart */}
            <div className={`${styles.centreCol} ${ordersOpen ? styles.centreColWithOrders : ''}`}>
              <div className={styles.chartArea}>
                <Chart onToggleOrders={() => setOrdersOpen(o=>!o)} ordersOpen={ordersOpen} />
              </div>
              {!isMobile && ordersOpen && <div className={styles.ordersArea}><OrdersPanel /></div>}
            </div>

            {/* RIGHT — order form (desktop only) */}
            {!isMobile && (
              <div className={styles.rightCol}>
                {tab === 'Futures' ? <FuturesForm onOpenWallet={openWallet} />
                  : tab === 'Spot' ? <SpotForm onOpenWallet={openWallet} />
                  : <SwapForm onOpenWallet={openWallet} />}
              </div>
            )}
          </div>

          {/* MOBILE FORM — below chart, fixed height */}
          {isMobile && (
            <div className={styles.mobileForm}>
              {tab === 'Futures' ? <MobileFutures onOpenWallet={openWallet} />
                : tab === 'Spot' ? <MobileSpot onOpenWallet={openWallet} />
                : <MobileSwap onOpenWallet={openWallet} />}
            </div>
          )}

        </div>
      )}

                  {/* ── BOTTOM NAV ── */}
      <BottomNav activeView={view} activeTab={tab} onNavigate={handleNav} />

      {/* ── MODALS ── */}
      <WalletModal open={walletOpen} onClose={() => setWalletOpen(false)} />
      {depositOpen  && <DepositModal  token={depositToken}  onClose={() => setDepositOpen(false)} />}
      {withdrawOpen && <WithdrawModal token={withdrawToken} onClose={() => setWithdrawOpen(false)} />}
      {apiKeyOpen   && <ApiKeyModal   onClose={() => setApiKeyOpen(false)} onSuccess={() => setApiKeyOpen(false)} />}
    </div>
  )
}
