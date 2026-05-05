import { useStore } from '../../store'
import { fmtPx, fmtTime } from '../../lib/format'
import styles from './Trades.module.css'

export function Trades() {
  const trades = useStore(s => s.trades)

  return (
    <div className={styles.wrap}>
      <div className={styles.cols}>
        <span>Price</span><span>Size</span><span>Time</span>
      </div>
      <div className={styles.list}>
        {trades.slice(0, 20).map((t, i) => (
          <div key={i} className={`${styles.row} ${t.buy ? styles.buy : styles.sell}`}>
            <span className={styles.price}>{fmtPx(t.p)}</span>
            <span className={styles.size}>{t.q.toFixed(4)}</span>
            <span className={styles.time}>{fmtTime(t.t)}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
