import { useState } from 'react'
import { MarketScanner } from '../MarketScanner/MarketScanner'
import { PatternScanner } from '../PatternScanner/PatternScanner'
import { LiquidationMap } from '../LiquidationMap/LiquidationMap'
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
import { SentimentHub } from '../SentimentHub/SentimentHub'
import styles from './MarketIntel.module.css'

// Grouped tabs for clean navigation
const GROUPS = [
  {
    label: '📊 Marché',
    tabs: [
      { id:'scanner',  icon:'🔍', label:'Scanner'    },
      { id:'patterns', icon:'🎯', label:'Patterns'    },
      { id:'sentiment',icon:'🧠', label:'Sentiment'   },
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
      { id:'liqmap',   icon:'💧', label:'Liq. Map'    },
    ]
  },
  {
    label: '🔐 On-Chain',
    tabs: [
      { id:'insider',     icon:'🕵️', label:'Insiders'    },
      { id:'unlock',      icon:'🔓', label:'Unlocks'      },
      { id:'flowdetect',  icon:'⚡', label:'Flow Detect'  },
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
        {tab === 'scanner'  && <MarketScanner />}
        {tab === 'patterns' && <PatternScanner />}
        {tab === 'sentiment'&& <SentimentHub />}
        {tab === 'heatmap'  && <OrderBookHeatmap />}
        {tab === 'aggbook'  && <AggregatedBook />}
        {tab === 'radar'    && <LiquidityRadar />}
        {tab === 'delta'    && <DeltaFlow />}
        {tab === 'funding'  && <FundingRates />}
        {tab === 'options'  && <OptionsFlow />}
        {tab === 'liqmap'  && <LiquidationMap />}
        {tab === 'insider'  && <InsiderTracker />}
        {tab === 'unlock'   && <TokenUnlock />}
        {tab === 'flowdetect' && <FlowDetector />}
      </div>
    </div>
  )
}
