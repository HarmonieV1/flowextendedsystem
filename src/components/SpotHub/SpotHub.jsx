import { useState } from 'react'
import { SwapWidget } from '../SwapWidget/SwapWidget'
import { Spot } from '../Spot/Spot'
import styles from './SpotHub.module.css'

export function SpotHub({ onOpenWallet }) {
  const [sub, setSub] = useState('swap') // 'swap' | 'bitunix'

  return (
    <div className={styles.wrap}>
      {/* Sub-tab switcher */}
      <div className={styles.subTabs}>
        <button
          className={styles.subTab + (sub === 'swap' ? ' ' + styles.subOn : '')}
          onClick={() => setSub('swap')}
        >
          ⚡ Swap DEX
          <span className={styles.subTag}>Paraswap · Non-custodial</span>
        </button>
        <button
          className={styles.subTab + (sub === 'bitunix' ? ' ' + styles.subOn : '')}
          onClick={() => setSub('bitunix')}
        >
          📊 Spot CEX
          <span className={styles.subTag}>Bitunix · Clés API</span>
        </button>
      </div>

      {/* Content */}
      <div className={styles.content}>
        {sub === 'swap'    && <SwapWidget onOpenWallet={onOpenWallet} />}
        {sub === 'bitunix' && <Spot onOpenWallet={onOpenWallet} />}
      </div>
    </div>
  )
}
