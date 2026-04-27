import { useState } from 'react'
import { useStore } from '../../store'
import { fmtPx } from '../../lib/format'
import styles from './Spot.module.css'

const BITUNIX_REF = 'FXSA'

const BTU_PAIRS = {
  BTCUSDT:'BTCUSDT',ETHUSDT:'ETHUSDT',SOLUSDT:'SOLUSDT',
  BNBUSDT:'BNBUSDT',XRPUSDT:'XRPUSDT',DOGEUSDT:'DOGEUSDT',
  AVAXUSDT:'AVAXUSDT',ARBUSDT:'ARBUSDT',LINKUSDT:'LINKUSDT',
  ADAUSDT:'ADAUSDT',DOTUSDT:'DOTUSDT',SUIUSDT:'SUIUSDT',
}

export function Spot({ onOpenWallet }) {
  const pair   = useStore(s => s.pair)
  const lastPx = useStore(s => s.lastPx)
  const base   = pair.replace('USDT','')
  const sym    = BTU_PAIRS[pair] || 'BTCUSDT'

  const openBitunix = () => {
    window.open(
      `https://www.bitunix.com/spot-trading/${sym}?vipCode=${BITUNIX_REF}`,
      '_blank', 'noopener,noreferrer'
    )
  }

  return (
    <div className={styles.wrap}>
      {/* Header */}
      <div className={styles.header}>
        <span className={styles.title}>📊 Spot Trading</span>
        <div className={styles.pairBox}>
          <span className={styles.pairSym}>{base}/USDT</span>
          {lastPx > 0 && <span className={styles.pairPx}>{fmtPx(lastPx)}</span>}
        </div>
      </div>

      <div className={styles.body}>
        {/* Bitunix Spot */}
        <div className={styles.card}>
          <div className={styles.cardTop}>
            <span className={styles.cardIcon}>⚡</span>
            <div>
              <div className={styles.cardName}>Bitunix Spot</div>
              <div className={styles.cardTag}>CEX · Dès $1 · 700+ paires</div>
            </div>
            <button className={styles.openBtn} onClick={openBitunix}>
              Ouvrir ↗
            </button>
          </div>
          <div className={styles.cardNote}>
            Compte Bitunix requis · Connecte-toi puis reviens trader
          </div>
          <a
            href={`https://www.bitunix.com/register?vipCode=${BITUNIX_REF}`}
            target="_blank" rel="noreferrer"
            className={styles.registerBtn}
          >
            Créer un compte avec le code {BITUNIX_REF} ↗
          </a>
        </div>

        {/* Coming soon - native integration */}
        <div className={styles.comingSoon}>
          <div className={styles.csIcon}>🚀</div>
          <div className={styles.csTitle}>Trading natif — Bientôt</div>
          <div className={styles.csSub}>
            Intégration directe en cours de développement.<br/>
            Tu pourras acheter et vendre sans quitter FXSEDGE.
          </div>
        </div>

        {/* Info */}
        <div className={styles.infoBox}>
          <div className={styles.infoRow}>
            <span>🔒</span>
            <span>Non-custodial · Tes fonds restent dans ton wallet ou sur Bitunix</span>
          </div>
          <div className={styles.infoRow}>
            <span>⚡</span>
            <span>Paire active synchronisée avec le chart FXSEDGE</span>
          </div>
          <div className={styles.infoRow}>
            <span>📊</span>
            <span>Utilise le chart et les outils Intel pour analyser avant de trader</span>
          </div>
        </div>
      </div>

      <div className={styles.footer}>
        ⚡ Bitunix · Ref {BITUNIX_REF}
      </div>
    </div>
  )
}
