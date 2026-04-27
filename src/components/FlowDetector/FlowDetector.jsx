import { useState } from 'react'
import { DarkPool } from '../DarkPool/DarkPool'
import { FlashCrash } from '../FlashCrash/FlashCrash'
import styles from './FlowDetector.module.css'

export function FlowDetector() {
  const [tab, setTab] = useState('crash')
  return (
    <div className={styles.wrap}>
      <div className={styles.tabs}>
        <button className={styles.btn + (tab==='crash'?' '+styles.on:'')} onClick={()=>setTab('crash')}>💥 Flash Crash</button>
        <button className={styles.btn + (tab==='darkpool'?' '+styles.on:'')} onClick={()=>setTab('darkpool')}>🌑 Dark Pool</button>
      </div>
      <div className={styles.content}>
        {tab === 'crash'    && <FlashCrash />}
        {tab === 'darkpool' && <DarkPool />}
      </div>
    </div>
  )
}
