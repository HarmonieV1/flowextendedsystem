import { useState } from 'react'
import { WalletPage } from '../WalletPage/WalletPage'
import { TradeJournal } from '../TradeJournal/TradeJournal'
import styles from './PortfolioHub.module.css'

export function PortfolioHub({ onOpenWallet }) {
  const [tab, setTab] = useState('portfolio')
  return (
    <div className={styles.wrap}>
      <div className={styles.tabs}>
        {[['portfolio','💼 Portfolio'],['journal','📓 Journal']].map(([id,lbl])=>(
          <button key={id}
            className={styles.tab + (tab===id?' '+styles.tabOn:'')}
            onClick={()=>setTab(id)}
          >{lbl}</button>
        ))}
      </div>
      <div className={styles.content}>
        {tab==='portfolio' && <WalletPage onOpenWallet={onOpenWallet}/>}
        {tab==='journal'   && <TradeJournal />}
      </div>
    </div>
  )
}
