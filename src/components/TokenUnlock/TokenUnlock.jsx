import { useState, useEffect } from 'react'
import styles from './TokenUnlock.module.css'

const UNLOCKS = [
  // ── Mai 2026 ──
  { token:'OP',   date:'2026-05-01', amount:386000000,  pct:8.4,  type:'Ecosystem Fund',     impact:'🟡 Moyen' },
  { token:'ARB',  date:'2026-05-16', amount:920000000,  pct:9.2,  type:'Team/Investors',     impact:'🔴 Élevé' },
  { token:'ZK',   date:'2026-05-24', amount:520000000,  pct:13.0, type:'Investors',          impact:'🔴 Élevé' },
  // ── Juin 2026 ──
  { token:'SUI',  date:'2026-06-03', amount:780000000,  pct:10.8, type:'Early Contributors', impact:'🔴 Élevé' },
  { token:'JUP',  date:'2026-06-15', amount:1000000000, pct:10.0, type:'Foundation',         impact:'🔴 Élevé' },
  { token:'STRK', date:'2026-06-20', amount:128000000,  pct:12.8, type:'Investors/Team',     impact:'🔴 Élevé' },
  // ── Juillet 2026 ──
  { token:'TIA',  date:'2026-07-30', amount:144000000,  pct:12.4, type:'Early Backers',      impact:'🔴 Élevé' },
  { token:'SEI',  date:'2026-07-22', amount:450000000,  pct:9.0,  type:'Team/Investors',     impact:'🔴 Élevé' },
  { token:'DYDX', date:'2026-07-15', amount:67000000,   pct:6.7,  type:'Investors',          impact:'🟡 Moyen' },
  // ── Août 2026 ──
  { token:'APT',  date:'2026-08-12', amount:49000000,   pct:2.1,  type:'Foundation',         impact:'🟢 Faible' },
  { token:'EIGEN',date:'2026-08-29', amount:86000000,   pct:4.3,  type:'Ecosystem',          impact:'🟡 Moyen' },
  { token:'IMX',  date:'2026-08-15', amount:205000000,  pct:8.8,  type:'Ecosystem',          impact:'🟡 Moyen' },
  // ── Septembre 2026 ──
  { token:'MANTA',date:'2026-09-18', amount:180000000,  pct:18.0, type:'Investors',          impact:'🔴 Élevé' },
  { token:'INJ',  date:'2026-09-30', amount:28000000,   pct:7.8,  type:'Ecosystem',          impact:'🟡 Moyen' },
  // ── Q4 2026 ──
  { token:'ARB',  date:'2026-11-16', amount:920000000,  pct:9.2,  type:'Team/Investors',     impact:'🔴 Élevé' },
  { token:'OP',   date:'2026-11-01', amount:386000000,  pct:8.4,  type:'Ecosystem',          impact:'🟡 Moyen' },
  { token:'SUI',  date:'2026-12-03', amount:780000000,  pct:10.8, type:'Early Contributors', impact:'🔴 Élevé' },
  { token:'JUP',  date:'2026-12-31', amount:1000000000, pct:10.0, type:'Team',               impact:'🔴 Élevé' },
]

const fmtAmt = (n) => n >= 1e9 ? (n/1e9).toFixed(1)+'B' : n >= 1e6 ? (n/1e6).toFixed(0)+'M' : (n/1e3).toFixed(0)+'K'
const fmtDate = (s) => { try { const d = new Date(s); return isNaN(d) ? '—' : d.toLocaleDateString('fr',{day:'2-digit',month:'short',year:'numeric'}) } catch { return '—' } }
const daysLeft = (s) => { try { return Math.ceil((new Date(s) - Date.now()) / 86400000) } catch { return 0 } }

export function TokenUnlock() {
  const [filter, setFilter] = useState('all')
  const [sort, setSort]     = useState('date')

  const now = Date.now()
  const filtered = UNLOCKS
    .filter(u => {
      const d = daysLeft(u.date)
      if (filter === 'upcoming') return d > 0
      if (filter === 'soon')    return d > 0 && d <= 90
      if (filter === 'past')    return d <= 0
      if (filter === 'high')    return u.impact.includes('Élevé') && d > 0
      return true
    })
    .sort((a,b) => {
      if (sort === 'date')   return new Date(a.date) - new Date(b.date)
      if (sort === 'pct')    return b.pct - a.pct
      if (sort === 'amount') return b.amount - a.amount
      return 0
    })

  const upcoming = UNLOCKS.filter(u => daysLeft(u.date) > 0 && daysLeft(u.date) <= 30)
  const highImpact = UNLOCKS.filter(u => u.impact.includes('Élevé') && daysLeft(u.date) > 0)

  return (
    <div className={styles.wrap}>
      <div className={styles.header}>
        <span className={styles.title}>🔓 Token Unlock Calendar</span>
        <div className={styles.sort}>
          {[['date','Date'],['pct','%'],['amount','Montant']].map(([id,lbl])=>(
            <button key={id} className={styles.sortBtn+(sort===id?' '+styles.sortOn:'')} onClick={()=>setSort(id)}>{lbl}</button>
          ))}
        </div>
      </div>

      {upcoming.length > 0 && (
        <div className={styles.alert}>
          <span>⚠ {upcoming.length} unlock{upcoming.length>1?'s':''} dans les 30 prochains jours</span>
          <span style={{color:'#f59e0b',fontWeight:700}}>{upcoming.map(u=>u.token).join(' · ')}</span>
        </div>
      )}

      <div className={styles.filters}>
        {[['upcoming','À venir'],['soon','< 90j'],['high','Impact élevé'],['all','Tous'],['past','Passés']].map(([id,lbl])=>(
          <button key={id} className={styles.filterBtn+(filter===id?' '+styles.filterOn:'')} onClick={()=>setFilter(id)}>{lbl}</button>
        ))}
      </div>

      <div className={styles.tableHead}>
        <span>Token</span>
        <span>Date</span>
        <span>Montant</span>
        <span>% Supply</span>
        <span>Type</span>
        <span>Impact</span>
      </div>

      <div className={styles.list}>
        {filtered.map(u => {
          const d = daysLeft(u.date)
          return (
            <div key={u.token+u.date} className={styles.row + (d <= 7 && d > 0 ? ' '+styles.rowUrgent : '')}>
              <span className={styles.token}>{u.token}</span>
              <div className={styles.dateCol}>
                <span>{fmtDate(u.date)}</span>
                <span className={styles.daysLeft} style={{color: d <= 0 ? 'var(--txt3)' : d <= 7 ? 'var(--red)' : d <= 30 ? '#f59e0b' : 'var(--txt3)'}}>
                  {d <= 0 ? 'Passé' : d === 1 ? 'Demain' : `J-${d}`}
                </span>
              </div>
              <span className={styles.amount}>{fmtAmt(u.amount)}</span>
              <span className={styles.pct} style={{color: u.pct > 10 ? 'var(--red)' : u.pct > 5 ? '#f59e0b' : 'var(--txt2)'}}>{u.pct.toFixed(1)}%</span>
              <span className={styles.type}>{u.type}</span>
              <span>{u.impact}</span>
            </div>
          )
        })}
      </div>

      <div className={styles.footer}>Données TokenUnlocks.app · Mise à jour manuelle · Pression vendeuse prévisible</div>
    </div>
  )
}
