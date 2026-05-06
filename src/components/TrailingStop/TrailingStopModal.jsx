// FXSEDGE — Trailing Stop activation modal
import { useState } from 'react'
import { addTrail, getTrail, removeTrail } from '../../lib/trailingStop'
import { fmtPx } from '../../lib/format'
import styles from './TrailingStop.module.css'

export function TrailingStopModal({ position, lastPrice, onClose }) {
  const isLong = (position.side || '').toUpperCase() === 'LONG' || (position.side || '').toUpperCase() === 'BUY'
  const existing = getTrail(position.symbol, isLong ? 'long' : 'short')
  const [distance, setDistance] = useState(existing?.distance || 2)
  const [error, setError] = useState('')

  const entry = parseFloat(position.avgOpenPrice) || lastPrice || 0
  const previewSL = isLong
    ? entry * (1 - distance / 100)
    : entry * (1 + distance / 100)

  const profitNeeded = isLong
    ? entry * (1 + distance / 100)  // price needs to reach this for SL to start trailing into profit
    : entry * (1 - distance / 100)

  const handleActivate = () => {
    if (distance < 0.1 || distance > 20) {
      setError('Distance entre 0.1% et 20%')
      return
    }
    addTrail({
      pair: position.symbol,
      side: isLong ? 'long' : 'short',
      entry,
      distance,
      exchange: position.exchange || 'bitunix',
    })
    onClose()
  }

  const handleDeactivate = () => {
    removeTrail(position.symbol, isLong ? 'long' : 'short')
    onClose()
  }

  return (
    <div className={styles.bg} onClick={onClose}>
      <div className={styles.modal} onClick={e => e.stopPropagation()}>
        <div className={styles.hdr}>
          <span className={styles.title}>📍 Trailing Stop · {position.symbol.replace('USDT', '')}/USDT</span>
          <button className={styles.closeBtn} onClick={onClose}>×</button>
        </div>

        <div className={styles.info}>
          <div className={styles.infoRow}>
            <span className={styles.infoL}>Side</span>
            <span style={{ color: isLong ? 'var(--grn)' : 'var(--red)', fontWeight: 700 }}>
              {isLong ? '↑ LONG' : '↓ SHORT'} ×{position.leverage || 10}
            </span>
          </div>
          <div className={styles.infoRow}>
            <span className={styles.infoL}>Entry</span>
            <span className={styles.infoV}>{fmtPx(entry)}</span>
          </div>
          <div className={styles.infoRow}>
            <span className={styles.infoL}>Last price</span>
            <span className={styles.infoV}>{fmtPx(lastPrice)}</span>
          </div>
        </div>

        <div className={styles.section}>
          <label className={styles.label}>Distance du trailing</label>
          <div className={styles.presets}>
            {[0.5, 1, 2, 3, 5, 10].map(p => (
              <button key={p}
                className={distance === p ? styles.presetOn : styles.preset}
                onClick={() => setDistance(p)}>
                {p}%
              </button>
            ))}
          </div>
          <input type="number" step="0.1" min="0.1" max="20"
            value={distance}
            onChange={e => { setDistance(parseFloat(e.target.value) || 0); setError('') }}
            className={styles.input}
            placeholder="2.0" />
          <div className={styles.help}>
            Le SL bougera automatiquement quand le prix avance de {distance}%.<br/>
            Il <strong>ne reculera jamais</strong>.
          </div>
        </div>

        <div className={styles.preview}>
          <div className={styles.previewRow}>
            <span className={styles.previewL}>SL initial (à l'entry)</span>
            <span className={styles.previewV} style={{ color: 'var(--red)' }}>
              {fmtPx(previewSL)}
            </span>
          </div>
          <div className={styles.previewRow}>
            <span className={styles.previewL}>SL bougera si {isLong ? '↑' : '↓'} dépasse</span>
            <span className={styles.previewV}>{fmtPx(profitNeeded)}</span>
          </div>
        </div>

        {error && <div className={styles.error}>{error}</div>}

        <div className={styles.actions}>
          {existing ? (
            <button onClick={handleDeactivate} className={styles.btnDanger}>
              Désactiver le trailing
            </button>
          ) : (
            <button onClick={handleActivate} className={styles.btnPrimary}>
              Activer trailing stop
            </button>
          )}
        </div>

        <div className={styles.foot}>
          ⚡ Surveillance toutes les 5 secondes via Binance ticker.
          Le SL est mis à jour côté exchange uniquement quand il bouge.
        </div>
      </div>
    </div>
  )
}
