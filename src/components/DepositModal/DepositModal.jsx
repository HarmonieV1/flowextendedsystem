import { useAccount } from 'wagmi'
import { useState } from 'react'
import styles from './DepositModal.module.css'

const NETWORKS = [
  { id: 'eth', label: 'Ethereum (ERC-20)', fee: '~$2-5', time: '~5 min' },
  { id: 'bsc', label: 'BNB Smart Chain (BEP-20)', fee: '~$0.10', time: '~1 min' },
  { id: 'tron', label: 'Tron (TRC-20)', fee: '~$1', time: '~2 min' },
  { id: 'sol', label: 'Solana', fee: '~$0.01', time: '~30s' },
  { id: 'arb', label: 'Arbitrum One', fee: '~$0.10', time: '~1 min' },
  { id: 'base', label: 'Base', fee: '~$0.05', time: '~1 min' },
]

const TOKENS = ['USDT','USDC','BTC','ETH','SOL','BNB','ARB']



export function DepositModal({ token: initialToken, onClose }) {
  const { address, isConnected } = useAccount()
  const depositAddress = isConnected ? address : null
  const [token, setToken] = useState(initialToken || 'USDT')
  const [network, setNetwork] = useState('eth')
  const [copied, setCopied] = useState(false)

  const net = NETWORKS.find(n => n.id === network) || NETWORKS[0]

  const copy = () => {
    navigator.clipboard.writeText(depositAddress || '— Connect wallet to see your address —').catch(() => {})
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className={styles.bg} onClick={onClose}>
      <div className={styles.modal} onClick={e => e.stopPropagation()}>
        <div className={styles.hdr}>
          <span className={styles.title}>Dépôt</span>
          <button className={styles.closeBtn} onClick={onClose}>×</button>
        </div>

        {/* Token selector */}
        <div className={styles.section}>
          <div className={styles.label}>Crypto</div>
          <div className={styles.tokenGrid}>
            {TOKENS.map(t => (
              <button
                key={t}
                className={`${styles.tokenBtn} ${token===t?styles.tokenOn:''}`}
                onClick={() => setToken(t)}
              >{t}</button>
            ))}
          </div>
        </div>

        {/* Network selector */}
        <div className={styles.section}>
          <div className={styles.label}>Réseau</div>
          <div className={styles.networkList}>
            {NETWORKS.map(n => (
              <button
                key={n.id}
                className={`${styles.networkBtn} ${network===n.id?styles.networkOn:''}`}
                onClick={() => setNetwork(n.id)}
              >
                <span className={styles.networkLabel}>{n.label}</span>
                <span className={styles.networkMeta}>{n.fee} · {n.time}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Deposit address */}
        <div className={styles.section}>
          <div className={styles.label}>Adresse de dépôt ({token} · {net.label.split('(')[0].trim()})</div>
          <div className={styles.addrBox}>
            <span className={styles.addr}>{depositAddress || '— Connect wallet to see your address —'}</span>
            <button className={styles.copyBtn} onClick={copy}>
              {copied ? '✓ Copié' : 'Copier'}
            </button>
          </div>
          <div className={styles.qrPlaceholder}>
            <div className={styles.qrGrid}>
              {Array.from({length:64}).map((_,i) => (
                <div key={i} className={styles.qrCell} style={{background: Math.random()>.5?'var(--txt)':'transparent'}} />
              ))}
            </div>
          </div>
        </div>

        {/* Warning */}
        <div className={styles.warning}>
          <span className={styles.warningIcon}>⚠</span>
          <span>Envoie uniquement du <strong>{token}</strong> sur le réseau <strong>{net.label.split('(')[0].trim()}</strong>. Tout autre token ou réseau entraîne une perte définitive des fonds.</span>
        </div>

        <div className={styles.minDeposit}>
          Dépôt minimum : 1 {token} · Confirmations requises : 12
        </div>
      </div>
    </div>
  )
}
