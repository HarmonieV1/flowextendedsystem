import { useState } from 'react'
import { useAccount } from 'wagmi'
import { useStore } from '../../store'
import { fmt, fmtPx } from '../../lib/format'
import styles from './WalletPage.module.css'

const ICON_COLORS = { USDT:'#26a17b',BTC:'#f7931a',ETH:'#627eea',SOL:'#9945ff',BNB:'#f3ba2f',USDC:'#2775ca' }

const sections = [
  { id:'spot',    label:'Spot',                  icon:'◎' },
  { id:'futures', label:'Futures',               icon:'⊡' },
  { id:'history', label:'Historique des trades', icon:'⊟' },
]

export function WalletPage({ onDeposit, onWithdraw }) {
  const { address, isConnected } = useAccount()
  const balance = useStore(s => s.balance)
  const lastPx = useStore(s => s.lastPx)
  const [search, setSearch] = useState('')
  const [hideZero, setHideZero] = useState(false)
  const [activeSection, setActiveSection] = useState('spot')

  // Vraies données uniquement — si pas connecté, on affiche rien
  if (!isConnected) {
    return (
      <div className={styles.wrap}>
        <div className={styles.sidebar}>
          {sections.map(s => (
            <button key={s.id} className={`${styles.sideBtn} ${activeSection===s.id?styles.sideBtnOn:''}`} onClick={()=>setActiveSection(s.id)}>
              <span className={styles.sideBtnIcon}>{s.icon}</span>{s.label}
            </button>
          ))}
          <div className={styles.sideSep} />
          <button className={styles.sideBtn} onClick={()=>onDeposit?.()}>
            <span className={styles.sideBtnIcon}>↓</span>Dépôt
          </button>
          <button className={styles.sideBtn} onClick={()=>onWithdraw?.()}>
            <span className={styles.sideBtnIcon}>↑</span>Retrait
          </button>
        </div>
        <div className={styles.notConnected}>
          <div className={styles.ncIcon}>👛</div>
          <div className={styles.ncTitle}>Connecte ton wallet</div>
          <div className={styles.ncSub}>Tes balances réelles apparaîtront ici une fois le wallet connecté.</div>
        </div>
      </div>
    )
  }

  // Données réelles depuis le store (alimentées par useOnChainBalance)
  // Le balance vient de viem/wagmi — c'est la vraie balance USDT on-chain
  const assets = [
    {
      sym: 'USDT',
      name: 'Tether',
      total: balance || 0,
      available: balance || 0,
      inOrder: 0,
      price: 1,
      change: 0,
    },
    // Les autres actifs seront ajoutés quand on implémente la lecture multi-token
    // Pour l'instant on affiche uniquement ce qu'on lit vraiment
  ]

  const totalUSD = assets.reduce((s,a) => s + a.total * a.price, 0)

  const filtered = assets.filter(a => {
    if (hideZero && a.total === 0) return false
    if (search && !a.sym.toLowerCase().includes(search.toLowerCase())) return false
    return true
  })

  return (
    <div className={styles.wrap}>
      <div className={styles.sidebar}>
        {sections.map(s => (
          <button key={s.id} className={`${styles.sideBtn} ${activeSection===s.id?styles.sideBtnOn:''}`} onClick={()=>setActiveSection(s.id)}>
            <span className={styles.sideBtnIcon}>{s.icon}</span>{s.label}
          </button>
        ))}
        <div className={styles.sideSep} />
        <button className={styles.sideBtn} onClick={()=>onDeposit?.()}>
          <span className={styles.sideBtnIcon}>↓</span>Dépôt
        </button>
        <button className={styles.sideBtn} onClick={()=>onWithdraw?.()}>
          <span className={styles.sideBtnIcon}>↑</span>Retrait
        </button>
      </div>

      <div className={styles.main}>
        <div className={styles.summary}>
          <div className={styles.summaryLeft}>
            <div className={styles.summaryLabel}>Actif total</div>
            <div className={styles.summaryTotal}>
              <span className={styles.summaryAmt}>{fmt(totalUSD,2)}</span>
              <span className={styles.summaryUnit}>USDT</span>
            </div>
            <div className={styles.summaryAddr}>{address?.slice(0,6)}...{address?.slice(-4)}</div>
          </div>
          <div className={styles.summaryActions}>
            <button className={styles.actionBtn} onClick={()=>onDeposit?.()}>↓ Dépôt</button>
            <button className={`${styles.actionBtn} ${styles.actionOutline}`} onClick={()=>onWithdraw?.()}>↑ Retrait</button>
          </div>
        </div>

        <div className={styles.contentTabs}>
          <button className={`${styles.ctab} ${styles.ctabOn}`}>Crypto</button>
          <button className={styles.ctab}>Fiat</button>
        </div>

        <div className={styles.filters}>
          <div className={styles.searchWrap}>
            <span className={styles.searchIcon}>⌕</span>
            <input className={styles.searchInput} placeholder="Recherche" value={search} onChange={e=>setSearch(e.target.value)} />
          </div>
          <label className={styles.hideZero}>
            <input type="checkbox" checked={hideZero} onChange={e=>setHideZero(e.target.checked)} />
            <span>Cacher solde 0</span>
          </label>
        </div>

        <div className={styles.table}>
          <div className={styles.thead}>
            <span>Crypto</span><span>Total</span><span>Disponible</span>
            <span>En commande</span><span>Prix</span><span>24h</span>
            <span style={{textAlign:'right'}}>Action</span>
          </div>
          <div className={styles.tbody}>
            {filtered.length === 0 && (
              <div className={styles.emptyRow}>
                Aucun actif — dépose des fonds pour commencer à trader
              </div>
            )}
            {filtered.map(a => (
              <div key={a.sym} className={styles.trow}>
                <div className={styles.assetCell}>
                  <div className={styles.assetIcon} style={{background:(ICON_COLORS[a.sym]||'#52525b')+'22',color:ICON_COLORS[a.sym]||'#52525b'}}>
                    {a.sym[0]}
                  </div>
                  <div>
                    <div className={styles.assetSym}>{a.sym}</div>
                    <div className={styles.assetName}>{a.name}</div>
                  </div>
                </div>
                <div className={styles.cell}>
                  <div className={styles.cellMain}>{a.total.toFixed(a.sym==='USDT'?2:8)}</div>
                  <div className={styles.cellSub}>≈ ${fmt(a.total*a.price)}</div>
                </div>
                <div className={styles.cell}><div className={styles.cellMain}>{a.available.toFixed(2)}</div></div>
                <div className={styles.cell}><div className={styles.cellMain}>{a.inOrder.toFixed(2)}</div></div>
                <div className={styles.cell}><div className={styles.cellMain}>{fmtPx(a.price)}</div></div>
                <div className={styles.cell}>
                  <div className={`${styles.cellMain} ${a.change>=0?styles.pos:styles.neg}`}>
                    {a.change>=0?'+':''}{a.change.toFixed(2)}%
                  </div>
                </div>
                <div className={styles.actions}>
                  <button className={styles.actBtn} onClick={()=>onDeposit?.(a.sym)}>Dépôt</button>
                  <button className={styles.actBtn} onClick={()=>onWithdraw?.(a.sym)}>Retrait</button>
                  <button className={`${styles.actBtn} ${styles.actBtnPrimary}`}>Trader</button>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className={styles.disclaimer}>
          Les balances affichées sont lues directement depuis la blockchain via ton wallet connecté.
        </div>
      </div>
    </div>
  )
}
