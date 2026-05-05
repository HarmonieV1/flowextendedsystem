import { useState, Component, lazy, Suspense } from 'react'
import styles from './MarketIntel.module.css'

// Lazy-loaded Intel components — chargés à la demande pour réduire le bundle initial
const MarketScanner    = lazy(() => import('../MarketScanner/MarketScanner').then(m => ({ default: m.MarketScanner })))
const PatternScanner   = lazy(() => import('../PatternScanner/PatternScanner').then(m => ({ default: m.PatternScanner })))
const HarmonicScanner  = lazy(() => import('../HarmonicScanner/HarmonicScanner').then(m => ({ default: m.HarmonicScanner })))
const MultiAccount     = lazy(() => import('../MultiAccount/MultiAccount').then(m => ({ default: m.MultiAccount })))
const CorrelationMatrix= lazy(() => import('../CorrelationMatrix/CorrelationMatrix').then(m => ({ default: m.CorrelationMatrix })))
const EconCalendar     = lazy(() => import('../EconCalendar/EconCalendar').then(m => ({ default: m.EconCalendar })))
const AlphaScanner     = lazy(() => import('../AlphaScanner/AlphaScanner').then(m => ({ default: m.AlphaScanner })))
const DeltaFlow        = lazy(() => import('../DeltaFlow/DeltaFlow').then(m => ({ default: m.DeltaFlow })))
const FundingRates     = lazy(() => import('../FundingRates/FundingRates').then(m => ({ default: m.FundingRates })))
const OptionsFlow      = lazy(() => import('../OptionsFlow/OptionsFlow').then(m => ({ default: m.OptionsFlow })))
const TokenUnlock      = lazy(() => import('../TokenUnlock/TokenUnlock').then(m => ({ default: m.TokenUnlock })))
const LiquidityRadar   = lazy(() => import('../LiquidityRadar/LiquidityRadar').then(m => ({ default: m.LiquidityRadar })))
const DarkPool         = lazy(() => import('../DarkPool/DarkPool').then(m => ({ default: m.DarkPool })))
const FlashCrash       = lazy(() => import('../FlashCrash/FlashCrash').then(m => ({ default: m.FlashCrash })))
const FlowDetector     = lazy(() => import('../FlowDetector/FlowDetector').then(m => ({ default: m.FlowDetector })))
const OrderBookHeatmap = lazy(() => import('../OrderBookHeatmap/OrderBookHeatmap').then(m => ({ default: m.OrderBookHeatmap })))
const InsiderTracker   = lazy(() => import('../InsiderTracker/InsiderTracker').then(m => ({ default: m.InsiderTracker })))
const AggregatedBook   = lazy(() => import('../AggregatedBook/AggregatedBook').then(m => ({ default: m.AggregatedBook })))
const CryptoMap        = lazy(() => import('../CryptoMap/CryptoMap').then(m => ({ default: m.CryptoMap })))
const SectorRotation   = lazy(() => import('../SectorRotation/SectorRotation').then(m => ({ default: m.SectorRotation })))
const DevWalletTracker = lazy(() => import('../DevWalletTracker/DevWalletTracker').then(m => ({ default: m.DevWalletTracker })))
const PreTradeSimulator= lazy(() => import('../PreTradeSimulator/PreTradeSimulator').then(m => ({ default: m.PreTradeSimulator })))
const SentimentHub     = lazy(() => import('../SentimentHub/SentimentHub').then(m => ({ default: m.SentimentHub })))
const AsymmetricRisk   = lazy(() => import('../AsymmetricRisk/AsymmetricRisk').then(m => ({ default: m.AsymmetricRisk })))

// Loading fallback
const IntelLoader = () => (
  <div style={{display:'flex',alignItems:'center',justifyContent:'center',padding:40,color:'var(--txt3)',fontSize:11,gap:8}}>
    <div style={{width:14,height:14,border:'2px solid var(--brd)',borderTopColor:'var(--grn)',borderRadius:'50%',animation:'spin 0.8s linear infinite'}}/>
    <span>Chargement...</span>
    <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
  </div>
)

// Error boundary pour isoler les crashes des composants Intel
class IntelBoundary extends Component {
  constructor(props) { super(props); this.state = { error: null } }
  static getDerivedStateFromError(error) { return { error: error.message } }
  componentDidCatch(err, info) { console.error('[INTEL] Crash:', err, info) }
  render() {
    if (this.state.error) return (
      <div style={{padding:24,textAlign:'center',color:'var(--txt3)',fontSize:12}}>
        <div style={{fontSize:28,marginBottom:8}}>⚠️</div>
        <div>Ce module a rencontré une erreur</div>
        <div style={{fontFamily:'var(--mono)',fontSize:10,color:'var(--red)',marginTop:6}}>{this.state.error}</div>
        <button onClick={()=>this.setState({error:null})} style={{marginTop:12,padding:'6px 16px',background:'var(--bg3)',border:'1px solid var(--brd)',borderRadius:6,color:'var(--txt)',fontSize:11,cursor:'pointer'}}>
          ↻ Réessayer
        </button>
      </div>
    )
    return this.props.children
  }
}

// Grouped tabs for clean navigation
const GROUPS = [
  {
    label: '📊 Marché',
    tabs: [
      { id:'scanner',  icon:'🔍', label:'Scanner'    },
      { id:'asym',     icon:'⚖',  label:'R:R Async.' },
      { id:'patterns', icon:'🎯', label:'Patterns'    },
      { id:'harmonic', icon:'🦋', label:'Harmonics'   },
      { id:'sentiment',icon:'🧠', label:'Sentiment'   },
      { id:'corr',     icon:'🔗', label:'Corrélation'  },
      { id:'calendar', icon:'📅', label:'Calendrier'   },
    ]
  },
  {
    label: '📖 Carnet',
    tabs: [
      { id:'heatmap',  icon:'🔥', label:'Heatmap 3D'  },
      { id:'aggbook',  icon:'📚', label:'Agrégé'      },
      { id:'radar',    icon:'🎯', label:'Radar Liq.'  },
    ]
  },
  {
    label: '⚡ Flow',
    tabs: [
      { id:'delta',    icon:'⚡', label:'Delta Flow'  },
      { id:'funding',  icon:'💰', label:'Funding'     },
      { id:'options',  icon:'📊', label:'Options IV'  },
      { id:'alpha',    icon:'🚀', label:'Alpha Calls' },
    ]
  },
  {
    label: '🔐 On-Chain',
    tabs: [
      { id:'insider',     icon:'🕵️', label:'Insiders'    },
      { id:'multiaccount',icon:'👛', label:'Multi-Wallet' },
      { id:'unlock',      icon:'🔓', label:'Unlocks'      },
      { id:'flowdetect',  icon:'⚡', label:'Flow Detect'  },
    ]
  },
  {
    label: '🗺️ Vue Globale',
    tabs: [
      { id:'cryptomap',  icon:'🟩', label:'Crypto Map'  },
      { id:'sectors',    icon:'📊', label:'Secteurs'    },
    ]
  },
  {
    label: '🧪 Degen Tools',
    tabs: [
      { id:'devwallet',  icon:'🕵️', label:'Dev Tracker'  },
      { id:'pretrade',   icon:'🛡️', label:'Token Scan'   },
    ]
  },
]

const ALL_TABS = GROUPS.flatMap(g => g.tabs)

export function MarketIntel() {
  const [activeGroup, setActiveGroup] = useState('📊 Marché')
  const [tab, setTab] = useState('scanner')

  const currentGroup = GROUPS.find(g => g.label === activeGroup) || GROUPS[0]

  return (
    <div className={styles.wrap}>
      {/* Group selector */}
      <div className={styles.groups}>
        {GROUPS.map(g => (
          <button key={g.label}
            className={styles.group + (activeGroup===g.label ? ' '+styles.groupOn : '')}
            onClick={() => { setActiveGroup(g.label); setTab(g.tabs[0].id) }}
          >
            {g.label}
          </button>
        ))}
      </div>

      {/* Tab bar for current group */}
      <div className={styles.tabs}>
        {currentGroup.tabs.map(t => (
          <button key={t.id}
            className={styles.tab + (tab===t.id ? ' '+styles.tabOn : '')}
            onClick={() => setTab(t.id)}
          >
            <span className={styles.tabIcon}>{t.icon}</span>
            <span className={styles.tabLabel}>{t.label}</span>
          </button>
        ))}
      </div>

      {/* Content */}
      <div className={styles.content}>
        <IntelBoundary key={tab}>
          <Suspense fallback={<IntelLoader />}>
            {tab === 'scanner'  && <MarketScanner />}
            {tab === 'asym'     && <AsymmetricRisk />}
            {tab === 'patterns' && <PatternScanner />}
            {tab === 'harmonic' && <HarmonicScanner />}
            {tab === 'sentiment'&& <SentimentHub />}
            {tab === 'corr'      && <CorrelationMatrix />}
            {tab === 'calendar'  && <EconCalendar />}
            {tab === 'heatmap'  && <OrderBookHeatmap />}
            {tab === 'aggbook'  && <AggregatedBook />}
            {tab === 'radar'    && <LiquidityRadar />}
            {tab === 'delta'    && <DeltaFlow />}
            {tab === 'funding'  && <FundingRates />}
            {tab === 'options'  && <OptionsFlow />}
            {tab === 'alpha'   && <AlphaScanner />}
            {tab === 'insider'  && <InsiderTracker />}
            {tab === 'multiaccount' && <MultiAccount />}
            {tab === 'unlock'   && <TokenUnlock />}
            {tab === 'flowdetect' && <FlowDetector />}
            {tab === 'cryptomap' && <CryptoMap />}
            {tab === 'sectors'   && <SectorRotation />}
            {tab === 'devwallet' && <DevWalletTracker />}
            {tab === 'pretrade'  && <PreTradeSimulator />}
          </Suspense>
        </IntelBoundary>
      </div>
    </div>
  )
}
