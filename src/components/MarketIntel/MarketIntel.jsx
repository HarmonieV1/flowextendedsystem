import { useState, Component } from 'react'
import { MarketScanner } from '../MarketScanner/MarketScanner'
import { PatternScanner } from '../PatternScanner/PatternScanner'
import { HarmonicScanner } from '../HarmonicScanner/HarmonicScanner'
import { MultiAccount } from '../MultiAccount/MultiAccount'
import { CorrelationMatrix } from '../CorrelationMatrix/CorrelationMatrix'
import { EconCalendar } from '../EconCalendar/EconCalendar'
import { AlphaScanner } from '../AlphaScanner/AlphaScanner'
import { DeltaFlow } from '../DeltaFlow/DeltaFlow'
import { FundingRates } from '../FundingRates/FundingRates'
import { OptionsFlow } from '../OptionsFlow/OptionsFlow'
import { TokenUnlock } from '../TokenUnlock/TokenUnlock'
import { LiquidityRadar } from '../LiquidityRadar/LiquidityRadar'
import { DarkPool } from '../DarkPool/DarkPool'
import { FlashCrash } from '../FlashCrash/FlashCrash'
import { FlowDetector } from '../FlowDetector/FlowDetector'
import { OrderBookHeatmap } from '../OrderBookHeatmap/OrderBookHeatmap'
import { InsiderTracker } from '../InsiderTracker/InsiderTracker'
import { AggregatedBook } from '../AggregatedBook/AggregatedBook'
import { CryptoMap } from '../CryptoMap/CryptoMap'
import { SectorRotation } from '../SectorRotation/SectorRotation'
import { DevWalletTracker } from '../DevWalletTracker/DevWalletTracker'
import { PreTradeSimulator } from '../PreTradeSimulator/PreTradeSimulator'
import { SentimentHub } from '../SentimentHub/SentimentHub'
import styles from './MarketIntel.module.css'

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
          {tab === 'scanner'  && <MarketScanner />}
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
        </IntelBoundary>
      </div>
    </div>
  )
}
