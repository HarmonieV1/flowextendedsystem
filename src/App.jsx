import { useState, useEffect, useCallback } from 'react'
import { useAccount } from 'wagmi'
import { useStore } from './store'
import { hasApiKeys } from './lib/bitunix'
import { signIn, signUp, getUser, onAuthChange, signOut, resetPassword, checkPremium } from './lib/auth'
import { Disclaimer } from './components/Disclaimer/Disclaimer'
import { Ticker } from './components/Ticker/Ticker'
import { Comparator } from './components/Comparator/Comparator'
import { Chart } from './components/Chart/Chart'
import { OrderBook } from './components/OrderBook/OrderBook'
import { LiquidityHeatmap } from './components/LiquidityHeatmap/LiquidityHeatmap'
import { SwapWidget } from './components/SwapWidget/SwapWidget'
import { Spot } from './components/Spot/Spot'
import { FuturesWidget } from './components/FuturesWidget/FuturesWidget'
import { MultiChart } from './components/MultiChart/MultiChart'
import { OrdersPanel } from './components/OrdersPanel/OrdersPanel'
import { PortfolioHub } from './components/PortfolioHub/PortfolioHub'
import { WalletPage } from './components/WalletPage/WalletPage'
import { WalletModal } from './components/WalletModal/WalletModal'
import { DepositModal } from './components/DepositModal/DepositModal'
import { WithdrawModal } from './components/WithdrawModal/WithdrawModal'
import { ApiKeyModal } from './components/ApiKeyModal/ApiKeyModal'
import { BottomNav } from './components/BottomNav/BottomNav'
import { PriceAlerts } from './components/PriceAlerts/PriceAlerts'
import { DeltaFlow } from './components/DeltaFlow/DeltaFlow'
import { FundingRates } from './components/FundingRates/FundingRates'
import { OptionsFlow } from './components/OptionsFlow/OptionsFlow'
// New intel components are imported via MarketIntel
import { HarmonicScanner } from './components/HarmonicScanner/HarmonicScanner'
import { NewsTracker } from './components/NewsTracker/NewsTracker'
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

// ── build:1777632834 ──
function SpotForm({ onOpenWallet, onApiKey }) {
  return <Spot onOpenWallet={onOpenWallet} />
}
function FuturesForm({ onOpenWallet }) {
  return <FuturesWidget onOpenWallet={onOpenWallet} />
}
function SwapForm({ onOpenWallet }) {
  return <SwapWidget onOpenWallet={onOpenWallet} />
}
function MobileSpot({ onOpenWallet, onApiKey }) {
  return <Spot onOpenWallet={onOpenWallet} />
}
function MobileFutures({ onOpenWallet }) {
  return <FuturesWidget onOpenWallet={onOpenWallet} />
}
function MobileSwap({ onOpenWallet }) {
  return <SwapWidget onOpenWallet={onOpenWallet} />
}

const LEFT_PANELS = ['split', 'smart']
const COMP_LABELS = { fxsedge:'FXS', binance:'BNB', bybit:'BYB', okx:'OKX', bitget:'BTG', mexc:'MEX', gate:'GIO', htx:'HTX' }

export default function App() {
  const view    = useStore(s => s.view)
  const tab     = useStore(s => s.tab)
  const setView = useStore(s => s.setView)
  const setTab  = useStore(s => s.setTab)
  const lastPx  = useStore(s => s.lastPx)
  const comparatorPrices = useStore(s => s.comparatorPrices) || {}
  const { isConnected } = useAccount()
  const keyed = hasApiKeys()

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
  const [guestMode,    setGuestMode]    = useState(false)
  const [disclaimerOk, setDisclaimerOk] = useState(() => {
    try { return localStorage.getItem('fxs_disclaimer') === 'accepted' } catch { return false }
  })

  // Auth state (must be before any conditional return)
  const [authMode, setAuthMode] = useState('login')
  const [authEmail, setAuthEmail] = useState('')
  const [authPass, setAuthPass] = useState('')
  const [authErr, setAuthErr] = useState('')
  const [authLoading, setAuthLoading] = useState(false)
  const [supaUser, setSupaUser] = useState(null)
  const [premiumInfo, setPremiumInfo] = useState(null)

  useEffect(() => {
    getUser().then(user => { if (user) setSupaUser(user) }).catch(()=>{})
    const { data } = onAuthChange((event, session) => {
      setSupaUser(session?.user || null)
    })
    return () => { data?.subscription?.unsubscribe() }
  }, [])

  // Check premium status when user changes
  useEffect(() => {
    if (!supaUser?.id) { setPremiumInfo(null); return }
    checkPremium(supaUser.id).then(setPremiumInfo).catch(() => setPremiumInfo(null))
  }, [supaUser])

  useUrlSync()
  useOnChainBalance()

  useEffect(() => { if (lastPx > 0) setWsLive(true) }, [lastPx])

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth <= 768)
    check()
    window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [])

  const [apiKeyExchange, setApiKeyExchange] = useState('bitunix')

  useEffect(() => {
    const h = (e) => {
      setApiKeyExchange(e?.detail?.exchange || 'bitunix')
      setApiKeyOpen(true)
    }
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

  // ── Disclaimer Gate ──
  if (!disclaimerOk) {
    return <Disclaimer onAccept={() => { localStorage.setItem('fxs_disclaimer','accepted'); setDisclaimerOk(true) }} />
  }

  // ── Auth Gate (Supabase + Wallet + API) ──
  const handleAuth = async () => {
    setAuthErr('')
    // Validation
    if (!authEmail || !authEmail.includes('@')) { setAuthErr('Enter a valid email'); return }
    if (!authPass || authPass.length < 6) { setAuthErr('Password must be at least 6 characters'); return }
    
    setAuthLoading(true)
    try {
      if (authMode === 'login') {
        const { data, error } = await signIn(authEmail, authPass)
        if (error) throw error
        if (data?.user) setSupaUser(data.user)
      } else {
        const { data, error } = await signUp(authEmail, authPass)
        if (error) throw error
        if (data?.user && !data.user.email_confirmed_at) {
          setAuthErr('✓ Account created! Check your email to confirm.')
        } else if (data?.user) {
          setSupaUser(data.user)
        }
      }
    } catch(e) {
      const msg = e.message || 'Authentication failed'
      if (msg.includes('Invalid login')) setAuthErr('Wrong email or password')
      else if (msg.includes('already registered')) setAuthErr('Email already registered — try Login')
      else if (msg.includes('rate limit')) setAuthErr('Too many attempts — wait a moment')
      else setAuthErr(msg)
    }
    setAuthLoading(false)
  }

  if (!isConnected && !keyed && !guestMode && !supaUser) {
    return (
      <div className={styles.root} style={{display:'flex',alignItems:'center',justifyContent:'center',background:'#09090b'}}>
        <div style={{maxWidth:420,padding:32,textAlign:'center'}}>
          <div style={{fontSize:28,fontWeight:900,color:'#8cc63f',letterSpacing:-1,marginBottom:4}}>FXSEDGE</div>
          <div style={{fontSize:12,color:'#71717a',marginBottom:32}}>See every fee. Question every spread.</div>
          
          <div style={{background:'#111113',border:'1px solid #27272a',borderRadius:12,padding:24,marginBottom:16}}>
            <div style={{fontSize:14,fontWeight:700,color:'#e4e4e7',marginBottom:16}}>Access Terminal</div>
            
            {/* Email/Password Auth */}
            <div style={{display:'flex',gap:0,marginBottom:12}}>
              <button onClick={()=>setAuthMode('login')} style={{flex:1,padding:'8px',fontSize:11,fontWeight:700,border:'1px solid #27272a',borderRadius:'6px 0 0 6px',background:authMode==='login'?'#1a1a1e':'transparent',color:authMode==='login'?'#8cc63f':'#71717a',cursor:'pointer'}}>Login</button>
              <button onClick={()=>setAuthMode('register')} style={{flex:1,padding:'8px',fontSize:11,fontWeight:700,border:'1px solid #27272a',borderRadius:'0 6px 6px 0',background:authMode==='register'?'#1a1a1e':'transparent',color:authMode==='register'?'#8cc63f':'#71717a',cursor:'pointer'}}>Register</button>
            </div>
            <input type="email" placeholder="Email" value={authEmail} onChange={e=>setAuthEmail(e.target.value)}
              style={{width:'100%',padding:'10px 12px',background:'#1a1a1e',border:'1px solid #27272a',borderRadius:6,color:'#e4e4e7',fontSize:13,outline:'none',marginBottom:8,boxSizing:'border-box'}}/>
            <input type="password" placeholder="Password" value={authPass} onChange={e=>setAuthPass(e.target.value)}
              onKeyDown={e=>e.key==='Enter'&&handleAuth()}
              style={{width:'100%',padding:'10px 12px',background:'#1a1a1e',border:'1px solid #27272a',borderRadius:6,color:'#e4e4e7',fontSize:13,outline:'none',marginBottom:8,boxSizing:'border-box'}}/>
            {authErr && <div style={{fontSize:11,color:authErr.startsWith('✓')?'#8cc63f':'#ff3b5c',marginBottom:8}}>{authErr}</div>}
            <button onClick={handleAuth} disabled={authLoading}
              style={{width:'100%',padding:'12px',background:'#8cc63f',color:'#000',fontWeight:800,fontSize:13,borderRadius:8,border:'none',cursor:'pointer',marginBottom:8}}>
              {authLoading ? '...' : authMode==='login' ? 'Sign In' : 'Create Account'}
            </button>
            {authMode==='login' && (
              <button onClick={async()=>{
                if(!authEmail||!authEmail.includes('@')){setAuthErr('Enter your email first');return}
                setAuthLoading(true)
                const{error}=await resetPassword(authEmail)
                setAuthErr(error?error.message:'✓ Reset link sent to your email')
                setAuthLoading(false)
              }} style={{width:'100%',padding:'6px',background:'transparent',border:'none',color:'#52525b',fontSize:10,cursor:'pointer',marginBottom:4}}>
                Forgot password?
              </button>
            )}

            <div style={{fontSize:10,color:'#52525b',marginBottom:12}}>— or —</div>

            <button onClick={openWallet} style={{width:'100%',padding:'12px',background:'transparent',color:'#e4e4e7',fontWeight:600,fontSize:12,borderRadius:8,border:'1px solid #27272a',cursor:'pointer',marginBottom:8}}>
              Connect Wallet
            </button>
            <button onClick={()=>setApiKeyOpen(true)} style={{width:'100%',padding:'10px',background:'transparent',color:'#71717a',fontWeight:400,fontSize:11,borderRadius:8,border:'1px solid #1a1a1e',cursor:'pointer',marginBottom:8}}>
              Connect Bitunix API
            </button>
            <button onClick={()=>setGuestMode(true)} style={{width:'100%',padding:'8px',background:'transparent',color:'#52525b',fontWeight:400,fontSize:10,borderRadius:8,border:'none',cursor:'pointer'}}>
              Guest mode (read-only)
            </button>
          </div>
          
          <div style={{display:'flex',gap:16,justifyContent:'center',fontSize:10,color:'#71717a'}}>
            <span>No KYC</span><span>·</span><span>Non-custodial</span><span>·</span><span>7+ exchanges</span>
          </div>
        </div>
        {walletOpen && <WalletModal onClose={()=>setWalletOpen(false)} />}
        {apiKeyOpen && <ApiKeyModal onClose={()=>setApiKeyOpen(false)} defaultExchange={apiKeyExchange} />}
      </div>
    )
  }

  return (
    <div className={styles.root}>

      {/* ── CHROME ── */}
      <Ticker onOpenWallet={openWallet} wsLive={wsLive} />
      <MarketOverview />
      <Comparator />

      {/* ── FULL PAGE VIEWS ── */}
      {view === 'multi'     && <MultiChart />}
      {view === 'wallet' && (
        <div className={styles.tradePanel}><PortfolioHub onOpenWallet={openWallet}/></div>
      )}
      {view === 'wallet_noop_DISABLED'    && <WalletPage onDeposit={openDeposit} onWithdraw={openWithdraw} />}
      {view === 'copy'      && <CopyTrading onOpenWallet={openWallet} isPremium={premiumInfo?.isPro} supaUser={supaUser} />}
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
      {view === 'spot' && (
        <div className={styles.tradePanel}><SwapWidget onOpenWallet={openWallet}/></div>
      )}
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
                  : tab === 'Swap' ? <SwapForm onOpenWallet={openWallet} />
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
      {apiKeyOpen && <ApiKeyModal onClose={() => setApiKeyOpen(false)} onSuccess={() => setApiKeyOpen(false)} defaultExchange={apiKeyExchange} />}
    </div>
  )
}
