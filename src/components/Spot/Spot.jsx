import { useState } from 'react'
import { useStore } from '../../store'
import { fmtPx } from '../../lib/format'
import styles from './Spot.module.css'

const REF = 'FXSA'
const BITUNIX_SPOT = 'https://www.bitunix.com/spot'

const SPOT_PAIRS = [
  'BTCUSDT','ETHUSDT','SOLUSDT','BNBUSDT','XRPUSDT',
  'DOGEUSDT','AVAXUSDT','ARBUSDT','LINKUSDT','ADAUSDT',
]

export function Spot({ onOpenWallet }) {
  const pair   = useStore(s => s.pair)
  const lastPx = useStore(s => s.lastPx)
  const base   = pair.replace('USDT', '')

  const [side, setSide] = useState('buy')

  const isAvailable = SPOT_PAIRS.includes(pair)

  const openBitunix = () => {
    const sym = pair.replace('USDT', '_USDT')
    const url = `${BITUNIX_SPOT}/${sym}?ref=${REF}`
    window.open(url, '_blank', 'noopener,noreferrer')
  }

  return (
    <div className={styles.wrap}>
      <div className={styles.header}>
        <div className={styles.platInfo}>
          <span className={styles.platName}>⚡ Bitunix Spot</span>
          <span className={styles.platTag}>CEX · 700+ paires · Achat/Vente · Ref FXSA</span>
        </div>
        <div className={styles.pairBox}>
          <span className={styles.pairSym}>{base}/USDT</span>
          {lastPx > 0 && <span className={styles.pairPx}>{fmtPx(lastPx)}</span>}
        </div>
      </div>

      <div className={styles.form}>
        {/* Prix actuel */}
        <div className={styles.priceCard}>
          <span className={styles.priceLabel}>Prix actuel</span>
          <span className={styles.priceValue}>{fmtPx(lastPx)} USDT</span>
        </div>

        {/* Buy / Sell */}
        <div className={styles.sides}>
          <button
            className={styles.sideBtn + (side === 'buy' ? ' ' + styles.buyOn : '')}
            onClick={() => setSide('buy')}
          >↑ Acheter {base}</button>
          <button
            className={styles.sideBtn + (side === 'sell' ? ' ' + styles.sellOn : '')}
            onClick={() => setSide('sell')}
          >↓ Vendre {base}</button>
        </div>

        {!isAvailable && (
          <div className={styles.notAvail}>
            ⚠ {base} n'est pas disponible sur Bitunix Spot.
          </div>
        )}

        {/* CTA */}
        <button
          className={styles.ctaBtn + ' ' + (side === 'buy' ? styles.ctaBuy : styles.ctaSell)}
          onClick={openBitunix}
          disabled={!isAvailable}
        >
          {side === 'buy'
            ? `↑ Acheter ${base} sur Bitunix ↗`
            : `↓ Vendre ${base} sur Bitunix ↗`}
        </button>

        <div className={styles.infoBox}>
          <div className={styles.infoRow}>
            <span>📊 Plateforme</span><span>Bitunix CEX</span>
          </div>
          <div className={styles.infoRow}>
            <span>🔗 Ref</span><span style={{color:'var(--grn)'}}>{REF}</span>
          </div>
          <div className={styles.infoRow}>
            <span>💰 Frais</span><span>0.1% maker / 0.1% taker</span>
          </div>
          <div className={styles.infoRow}>
            <span>🔒 KYC</span><span>Non requis pour le spot</span>
          </div>
        </div>

        <div className={styles.note}>
          Tu seras redirigé sur Bitunix · Tes fonds restent dans ton compte Bitunix
        </div>
      </div>

      <div className={styles.footer}>
        ⚡ Bitunix Spot · Ref FXSA · Revenue sur chaque trade
      </div>
    </div>
  )
}
