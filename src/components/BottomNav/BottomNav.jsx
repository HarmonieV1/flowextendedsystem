import styles from './BottomNav.module.css'

const NAV = [
  { view:'trade',   tab:'Futures', icon:'⚡',  label:'Futures'   },
  { view:'trade',   tab:'Swap',    icon:'📊',  label:'Swap'      },
  { view:'intel',   tab:null,      icon:'📡',  label:'Intel'     },
  { view:'copy',    tab:null,      icon:'👥',  label:'Copy'      },
  { view:'wallet',  tab:null,      icon:'💼',  label:'Portfolio' },
]

export function BottomNav({ activeView, activeTab, onNavigate }) {
  return (
    <nav className={styles.nav}>
      {NAV.map(item => {
        const isActive = item.tab
          ? activeView === item.view && activeTab === item.tab
          : activeView === item.view
        return (
          <button key={item.label}
            className={styles.btn + (isActive ? ' ' + styles.active : '')}
            onClick={() => onNavigate(item.view, item.tab)}
          >
            {isActive && <span className={styles.bar}/>}
            <span className={styles.icon}>{item.icon}</span>
            <span className={styles.label}>{item.label}</span>
          </button>
        )
      })}
    </nav>
  )
}
