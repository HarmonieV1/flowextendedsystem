import styles from './BottomNav.module.css'

const NAV_ITEMS = [
  { id: 'trade-Spot',    icon: '◎', label: 'Spot' },
  { id: 'trade-Futures', icon: '⊡', label: 'Futures' },
  { id: 'trade-Swap',   icon: '⇄', label: 'Swap' },
  { id: 'multi',        icon: '⊞', label: 'Multi' },
  { id: 'wallet',       icon: '👛', label: 'Portfolio' },
]

export function BottomNav({ activeView, activeTab, onNavigate }) {
  return (
    <div className={styles.bar}>
      {NAV_ITEMS.map(item => {
        const [v, t] = item.id.split('-')
        const isActive = v === 'trade'
          ? activeView === 'trade' && activeTab === t
          : activeView === v

        return (
          <button
            key={item.id}
            className={`${styles.item} ${isActive ? styles.active : ''}`}
            onClick={() => onNavigate(v, t)}
          >
            <span className={styles.icon}>{item.icon}</span>
            <span className={styles.label}>{item.label}</span>
          </button>
        )
      })}
    </div>
  )
}
