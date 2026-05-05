import { useState, useEffect } from 'react'
import { useStore } from '../../store'
import { fmt } from '../../lib/format'
import styles from './DevWalletTracker.module.css'

// Known deployer/dev wallets for popular tokens (exemple — en prod, enrichir via Etherscan/Dexscreener API)
const TRACKED_WALLETS = {
  'PEPE': { deployer: '0x...deployer', label: 'PEPE Deployer', chain: 'ETH' },
  'WIF': { deployer: '0x...deployer', label: 'WIF Deployer', chain: 'SOL' },
  'BONK': { deployer: '0x...deployer', label: 'BONK Deployer', chain: 'SOL' },
}

// Simulated on-chain activity feed (en prod → Etherscan/Solscan API)
function generateActivity(token) {
  const actions = [
    { type: 'hold', label: 'Holding', icon: '💎', risk: 'low', color: '#8cc63f' },
    { type: 'stake', label: 'Staked LP', icon: '🔒', risk: 'low', color: '#8cc63f' },
    { type: 'transfer', label: 'Transfer to CEX', icon: '⚠️', risk: 'medium', color: '#f59e0b' },
    { type: 'sell', label: 'Sold tokens', icon: '🔴', risk: 'high', color: '#ff3b5c' },
    { type: 'mint', label: 'Minted new tokens', icon: '🚨', risk: 'critical', color: '#ff3b5c' },
    { type: 'renounce', label: 'Ownership renounced', icon: '✅', risk: 'safe', color: '#8cc63f' },
    { type: 'lock', label: 'Liquidity locked', icon: '🔐', risk: 'safe', color: '#8cc63f' },
  ]
  // Deterministic based on token name
  const seed = token.split('').reduce((s,c) => s + c.charCodeAt(0), 0)
  const recent = []
  for (let i = 0; i < 8; i++) {
    const idx = (seed + i * 7) % actions.length
    recent.push({
      ...actions[idx],
      time: Date.now() - (i * 3600000 * (1 + Math.random() * 5)),
      amount: Math.round(Math.random() * 10000000),
    })
  }
  return recent
}

function getRiskScore(activities) {
  let score = 70 // Base
  activities.forEach(a => {
    if (a.risk === 'safe') score += 5
    if (a.risk === 'low') score += 2
    if (a.risk === 'medium') score -= 10
    if (a.risk === 'high') score -= 20
    if (a.risk === 'critical') score -= 30
  })
  return Math.max(0, Math.min(100, score))
}

export function DevWalletTracker() {
  const pair = useStore(s => s.pair)
  const base = pair.replace('USDT', '')
  const [token, setToken] = useState(base)
  const [activities, setActivities] = useState([])
  const [search, setSearch] = useState('')

  useEffect(() => {
    setActivities(generateActivity(token))
  }, [token])

  const riskScore = getRiskScore(activities)
  const riskLabel = riskScore >= 80 ? 'SAFE' : riskScore >= 60 ? 'MODERATE' : riskScore >= 40 ? 'RISKY' : 'DANGER'
  const riskColor = riskScore >= 80 ? '#8cc63f' : riskScore >= 60 ? '#f59e0b' : '#ff3b5c'

  const timeAgo = (t) => {
    const diff = Date.now() - t
    if (diff < 3600000) return `${Math.round(diff/60000)}min ago`
    if (diff < 86400000) return `${Math.round(diff/3600000)}h ago`
    return `${Math.round(diff/86400000)}d ago`
  }

  return (
    <div className={styles.wrap}>
      <div className={styles.header}>
        <span className={styles.title}>🕵️ Dev Wallet Tracker</span>
        <input className={styles.search} placeholder="Token..." value={search}
          onChange={e => setSearch(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter' && search) { setToken(search.toUpperCase()); setSearch('') }}}
        />
      </div>

      {/* Risk Score */}
      <div className={styles.riskCard}>
        <div className={styles.riskTop}>
          <span className={styles.riskToken}>{token}</span>
          <span className={styles.riskLabel} style={{color: riskColor, borderColor: riskColor}}>{riskLabel}</span>
        </div>
        <div className={styles.riskBarWrap}>
          <div className={styles.riskBar}>
            <div className={styles.riskFill} style={{width: `${riskScore}%`, background: riskColor}}/>
          </div>
          <span className={styles.riskVal} style={{color: riskColor}}>{riskScore}/100</span>
        </div>
        <div className={styles.riskChecks}>
          <span className={styles.check}>🔐 Liquidity: {riskScore > 50 ? 'Locked' : 'Unknown'}</span>
          <span className={styles.check}>📋 Contract: {riskScore > 60 ? 'Verified' : 'Unverified'}</span>
          <span className={styles.check}>👛 Holders: {riskScore > 40 ? 'Distributed' : 'Concentrated'}</span>
          <span className={styles.check}>🔄 Tax: {riskScore > 70 ? '0%' : 'Unknown'}</span>
        </div>
      </div>

      {/* Activity Feed */}
      <div className={styles.feed}>
        <div className={styles.feedTitle}>Recent Activity</div>
        {activities.map((a, i) => (
          <div key={i} className={styles.activity}>
            <span className={styles.actIcon}>{a.icon}</span>
            <div className={styles.actInfo}>
              <span className={styles.actLabel}>{a.label}</span>
              {a.amount > 0 && <span className={styles.actAmount}>{(a.amount/1e6).toFixed(1)}M tokens</span>}
            </div>
            <div className={styles.actRight}>
              <span className={styles.actTime}>{timeAgo(a.time)}</span>
              <span className={styles.actRisk} style={{color: a.color}}>● {a.risk}</span>
            </div>
          </div>
        ))}
      </div>

      <div className={styles.footer}>
        ⚠️ Données simulées — En production : Etherscan/Solscan API · Bubblemaps · GoPlus Security
      </div>
    </div>
  )
}
