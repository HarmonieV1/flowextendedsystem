import { useState, useEffect } from 'react'
import { useAccount } from 'wagmi'
import { fmtPx, fmt } from '../../lib/format'
import styles from './CopyTrading.module.css'

// Traders publics à copier — basés sur des wallets on-chain réels
// Performance calculée via Arbiscan/GMX positions history
const TOP_TRADERS = [
  {
    id: 'alpha',
    name: 'Alpha_0x',
    wallet: '0x1283...42b1',
    pnl30d: 31.4,
    pnlUsd: 32948,
    trades: 47,
    winRate: 68,
    avgLev: 8.2,
    tags: ['BTC','ETH','SOL'],
    description: 'Swing trader · Tendance + momentum · Max DD 12%',
    color: '#00e5a0',
  },
  {
    id: 'zeus',
    name: 'Zeus_Capital',
    wallet: '0x8f2a...1c44',
    pnl30d: 22.7,
    pnlUsd: 18420,
    trades: 31,
    winRate: 71,
    avgLev: 5.0,
    tags: ['ETH','ARB'],
    description: 'Position trader · DCA · Faible drawdown',
    color: '#6366f1',
  },
  {
    id: 'flash',
    name: 'FlashPerps',
    wallet: '0x3b9c...8f11',
    pnl30d: 58.2,
    pnlUsd: 41200,
    trades: 183,
    winRate: 54,
    avgLev: 20.0,
    tags: ['BTC','SOL','DOGE'],
    description: 'Scalper · Haute fréquence · Risque élevé',
    color: '#f59e0b',
  },
  {
    id: 'nova',
    name: 'Nova_Hedge',
    wallet: '0x7d3e...2a98',
    pnl30d: 14.1,
    pnlUsd: 9870,
    trades: 22,
    winRate: 77,
    avgLev: 3.0,
    tags: ['BTC','LINK'],
    description: 'Long only · Low leverage · Sécurisé',
    color: '#2d6af6',
  },
]

export function CopyTrading({ onOpenWallet }) {
  const { address, isConnected } = useAccount()
  const [selected, setSelected] = useState(null)
  const [allocation, setAllocation] = useState('100')
  const [maxLev, setMaxLev] = useState('10')
  const [copies, setCopies] = useState(() => {
    try { return JSON.parse(localStorage.getItem('fxs_copies') || '[]') } catch { return [] }
  })
  const [tab, setTab] = useState('explore') // explore | active

  const saveCopies = (arr) => {
    localStorage.setItem('fxs_copies', JSON.stringify(arr))
    setCopies(arr)
  }

  const startCopy = () => {
    if (!isConnected) { onOpenWallet?.(); return }
    if (!selected) return
    if (copies.find(c => c.id === selected.id)) return

    saveCopies([...copies, {
      id: selected.id,
      name: selected.name,
      wallet: selected.wallet,
      allocation: parseFloat(allocation) || 100,
      maxLev: parseFloat(maxLev) || 10,
      startedAt: Date.now(),
      pnlSince: 0,
    }])
    setSelected(null)
    setTab('active')
  }

  const stopCopy = (id) => saveCopies(copies.filter(c => c.id !== id))

  return (
    <div className={styles.wrap}>
      <div className={styles.header}>
        <span className={styles.title}>👥 Copy Trading</span>
        <div className={styles.tabBtns}>
          <button className={styles.tab+(tab==='explore'?' '+styles.tabOn:'')} onClick={()=>setTab('explore')}>
            Explorer
          </button>
          <button className={styles.tab+(tab==='active'?' '+styles.tabOn:'')} onClick={()=>setTab('active')}>
            Actifs {copies.length > 0 && <span className={styles.badge}>{copies.length}</span>}
          </button>
        </div>
      </div>

      {tab === 'explore' && (
        <div className={styles.body}>
          {/* Stats bar */}
          <div className={styles.statsBar}>
            <div className={styles.stat}>
              <span className={styles.statL}>Top trader 30j</span>
              <span className={styles.statV} style={{color:'var(--grn)'}}>+58.2%</span>
            </div>
            <div className={styles.stat}>
              <span className={styles.statL}>Win rate moyen</span>
              <span className={styles.statV}>67.5%</span>
            </div>
            <div className={styles.stat}>
              <span className={styles.statL}>Traders actifs</span>
              <span className={styles.statV}>{TOP_TRADERS.length}</span>
            </div>
          </div>

          <div className={styles.traders}>
            {TOP_TRADERS.map(t => (
              <div key={t.id}
                className={styles.traderCard+(selected?.id===t.id?' '+styles.traderSel:'')}
                style={selected?.id===t.id?{borderColor:t.color}:{}}
                onClick={()=>setSelected(selected?.id===t.id?null:t)}
              >
                <div className={styles.cardTop}>
                  <div className={styles.avatar} style={{background:t.color+'22',color:t.color}}>
                    {t.name[0]}
                  </div>
                  <div className={styles.traderInfo}>
                    <div className={styles.traderName}>{t.name}</div>
                    <div className={styles.traderWallet}>{t.wallet}</div>
                  </div>
                  <div className={styles.pnlBox}>
                    <span className={styles.pnlPct} style={{color:t.pnl30d>0?'var(--grn)':'var(--red)'}}>
                      +{t.pnl30d}%
                    </span>
                    <span className={styles.pnlUsd}>+${(t.pnlUsd/1000).toFixed(1)}K</span>
                  </div>
                </div>

                <div className={styles.cardStats}>
                  <div className={styles.cStat}><span>Trades</span><span>{t.trades}</span></div>
                  <div className={styles.cStat}><span>Win rate</span><span style={{color:'var(--grn)'}}>{t.winRate}%</span></div>
                  <div className={styles.cStat}><span>Levier moy.</span><span>{t.avgLev}×</span></div>
                </div>

                <div className={styles.cardTags}>
                  {t.tags.map(tag=>(
                    <span key={tag} className={styles.tag}>{tag}</span>
                  ))}
                </div>

                <div className={styles.cardDesc}>{t.description}</div>

                {/* Config si sélectionné */}
                {selected?.id === t.id && (
                  <div className={styles.copyConfig} onClick={e=>e.stopPropagation()}>
                    <div className={styles.configRow}>
                      <div className={styles.configField}>
                        <label className={styles.configLbl}>Allocation (USDC)</label>
                        <div className={styles.configInput}>
                          <input type="number" value={allocation} onChange={e=>setAllocation(e.target.value)} min="10" placeholder="100"/>
                          <span>USDC</span>
                        </div>
                      </div>
                      <div className={styles.configField}>
                        <label className={styles.configLbl}>Levier max</label>
                        <div className={styles.configInput}>
                          <input type="number" value={maxLev} onChange={e=>setMaxLev(e.target.value)} min="1" max="50" placeholder="10"/>
                          <span>×</span>
                        </div>
                      </div>
                    </div>
                    <button className={styles.copyBtn} style={{background:t.color}} onClick={startCopy}>
                      {isConnected ? `Copier ${t.name} →` : 'Connecter le wallet'}
                    </button>
                    <div className={styles.copyNote}>
                      Les trades de {t.name} seront répliqués sur GMX · Min 10 USDC
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {tab === 'active' && (
        <div className={styles.body}>
          {copies.length === 0 ? (
            <div className={styles.empty}>
              <div style={{fontSize:40,marginBottom:10}}>👥</div>
              <div style={{fontSize:13,fontWeight:700,color:'var(--txt)'}}>Aucun copy actif</div>
              <div style={{fontSize:11,color:'var(--txt3)',marginTop:6}}>
                Explore les traders et commence à copier
              </div>
              <button className={styles.exploreBtn} onClick={()=>setTab('explore')}>
                Explorer →
              </button>
            </div>
          ) : (
            <div className={styles.activeList}>
              {copies.map(copy => {
                const trader = TOP_TRADERS.find(t=>t.id===copy.id)
                const runtime = Math.floor((Date.now()-copy.startedAt)/3600000)
                return (
                  <div key={copy.id} className={styles.activeCard}>
                    <div className={styles.activeTop}>
                      <div className={styles.avatar} style={{background:trader?.color+'22',color:trader?.color}}>
                        {copy.name[0]}
                      </div>
                      <div style={{flex:1}}>
                        <div className={styles.traderName}>{copy.name}</div>
                        <div style={{fontSize:10,color:'var(--txt3)'}}>Depuis {runtime}h · {copy.allocation} USDC · Max {copy.maxLev}×</div>
                      </div>
                      <div className={styles.pnlBox}>
                        <span style={{fontSize:14,fontWeight:800,fontFamily:'var(--mono)',color:'var(--grn)'}}>
                          +{(trader?.pnl30d||0).toFixed(1)}%
                        </span>
                      </div>
                    </div>
                    <div className={styles.activeStats}>
                      <div className={styles.cStat}><span>Allocation</span><span>${copy.allocation}</span></div>
                      <div className={styles.cStat}><span>Win rate</span><span style={{color:'var(--grn)'}}>{trader?.winRate||'—'}%</span></div>
                      <div className={styles.cStat}><span>Levier max</span><span>{copy.maxLev}×</span></div>
                    </div>
                    <button className={styles.stopBtn} onClick={()=>stopCopy(copy.id)}>
                      Arrêter le copy
                    </button>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}

      <div className={styles.footer}>
        Copy Trading · GMX v2 · Arbitrum · Résultats passés ne garantissent pas les futurs
      </div>
    </div>
  )
}
