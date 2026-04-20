import { useRef, useEffect } from 'react'
import { useStore } from '../../store'
import { useOrderBook } from '../../hooks/useOrderBook'
import { fmtPx } from '../../lib/format'
import styles from './OrderBook.module.css'

export function OrderBook() {
  useOrderBook()

  const bids = useStore(s => s.bids)
  const asks = useStore(s => s.asks)
  const lastPx = useStore(s => s.lastPx)
  const prevPx = useStore(s => s.prevPx)

  const maxSize = Math.max(...[...bids, ...asks].map(r => r[1]), 0.001)

  const bid0 = bids[0]?.[0] ?? 0
  const ask0 = asks[0]?.[0] ?? 0
  const spread = ask0 - bid0
  const spreadPct = bid0 > 0 ? ((spread / bid0) * 100).toFixed(4) : '—'

  const midColor = lastPx > prevPx ? 'var(--grn)' : lastPx < prevPx ? 'var(--red)' : 'var(--txt)'

  return (
    <div className={styles.wrap}>
      <div className={styles.cols}>
        <span>Price</span><span>Size</span><span>Total</span>
      </div>

      {/* Asks — reversed so highest ask at top */}
      <div className={styles.side}>
        {asks.slice(0, 8).reverse().map(([p, s], i) => (
          <div key={i} className={`${styles.row} ${styles.ask}`}>
            <span className={styles.price}>{fmtPx(p)}</span>
            <span className={styles.size}>{s.toFixed(4)}</span>
            <span className={styles.total}>{(p * s).toFixed(0)}</span>
            <div
              className={styles.depth}
              style={{ width: `${Math.min((s / maxSize) * 100, 100)}%`, background: 'var(--red)' }}
            />
          </div>
        ))}
      </div>

      <div className={styles.mid}>
        <span style={{ color: midColor, fontWeight: 700, fontSize: 12 }}>
          {fmtPx(lastPx || bid0)}
        </span>
        <span className={styles.spread}>
          Spread {fmtPx(spread)} ({spreadPct}%)
        </span>
      </div>

      {/* Bids */}
      <div className={styles.side}>
        {bids.slice(0, 8).map(([p, s], i) => (
          <div key={i} className={`${styles.row} ${styles.bid}`}>
            <span className={styles.price}>{fmtPx(p)}</span>
            <span className={styles.size}>{s.toFixed(4)}</span>
            <span className={styles.total}>{(p * s).toFixed(0)}</span>
            <div
              className={styles.depth}
              style={{ width: `${Math.min((s / maxSize) * 100, 100)}%`, background: 'var(--grn)' }}
            />
          </div>
        ))}
      </div>
    </div>
  )
}
