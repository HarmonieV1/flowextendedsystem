import { useState } from 'react'
import { fmt } from '../../lib/format'
import styles from './WithdrawModal.module.css'

const NETWORKS = [
  { id: 'eth', label: 'Ethereum (ERC-20)', fee: '2.50', min: '10' },
  { id: 'bsc', label: 'BNB Smart Chain (BEP-20)', fee: '0.10', min: '1' },
  { id: 'tron', label: 'Tron (TRC-20)', fee: '1.00', min: '5' },
  { id: 'sol', label: 'Solana', fee: '0.01', min: '0.5' },
  { id: 'arb', label: 'Arbitrum One', fee: '0.10', min: '1' },
]
const TOKENS = ['USDT','USDC','BTC','ETH','SOL','BNB']

export function WithdrawModal({ token: initialToken, onClose }) {
  const [token, setToken] = useState(initialToken || 'USDT')
  const [network, setNetwork] = useState('eth')
  const [address, setAddress] = useState('')
  const [amount, setAmount] = useState('')
  const [step, setStep] = useState(1) // 1=form, 2=confirm

  const net = NETWORKS.find(n => n.id === network) || NETWORKS[0]
  const available = 12000
  const netFee = parseFloat(net.fee)
  const receive = Math.max(0, (parseFloat(amount) || 0) - netFee)

  return (
    <div className={styles.bg} onClick={onClose}>
      <div className={styles.modal} onClick={e => e.stopPropagation()}>
        <div className={styles.hdr}>
          <span className={styles.title}>Retrait</span>
          <button className={styles.closeBtn} onClick={onClose}>×</button>
        </div>

        {step === 1 && (
          <>
            <div className={styles.section}>
              <div className={styles.label}>Crypto</div>
              <div className={styles.tokenGrid}>
                {TOKENS.map(t => (
                  <button key={t} className={`${styles.tokenBtn} ${token===t?styles.on:''}`} onClick={()=>setToken(t)}>{t}</button>
                ))}
              </div>
            </div>

            <div className={styles.section}>
              <div className={styles.label}>Réseau</div>
              {NETWORKS.map(n => (
                <button key={n.id} className={`${styles.netBtn} ${network===n.id?styles.on:''}`} onClick={()=>setNetwork(n.id)}>
                  <span className={styles.netLabel}>{n.label}</span>
                  <span className={styles.netFee}>Frais: {n.fee} {token} · Min: {n.min}</span>
                </button>
              ))}
            </div>

            <div className={styles.section}>
              <div className={styles.label}>Adresse de destination</div>
              <input
                className={styles.addrInput}
                placeholder={`Adresse ${token} sur ${net.label.split('(')[0].trim()}`}
                value={address}
                onChange={e => setAddress(e.target.value)}
              />
            </div>

            <div className={styles.section}>
              <div className={styles.labelRow}>
                <span className={styles.label}>Montant</span>
                <span className={styles.available}>Disponible: {fmt(available)} {token}</span>
              </div>
              <div className={styles.amtWrap}>
                <input
                  className={styles.amtInput}
                  type="number"
                  placeholder="0.00"
                  value={amount}
                  onChange={e => setAmount(e.target.value)}
                />
                <span className={styles.amtUnit}>{token}</span>
                <button className={styles.maxBtn} onClick={() => setAmount(available.toString())}>MAX</button>
              </div>
              <div className={styles.summary}>
                <div className={styles.sumRow}><span>Frais réseau</span><span>{net.fee} {token}</span></div>
                <div className={styles.sumRow}><span>Vous recevez</span><span className={styles.receiveAmt}>{receive > 0 ? fmt(receive) : '0.00'} {token}</span></div>
              </div>
            </div>

            <div className={styles.footer}>
              <div className={styles.warning}>
                <span>⚠</span>
                <span>Vérifiez l'adresse et le réseau. Les erreurs de transfert sont irréversibles.</span>
              </div>
              <button
                className={styles.submitBtn}
                disabled={!address || !amount || parseFloat(amount) <= 0}
                onClick={() => setStep(2)}
              >
                Continuer →
              </button>
            </div>
          </>
        )}

        {step === 2 && (
          <div className={styles.confirmStep}>
            <div className={styles.confirmTitle}>Confirmer le retrait</div>
            <div className={styles.confirmRows}>
              <div className={styles.confirmRow}><span>Crypto</span><span>{token}</span></div>
              <div className={styles.confirmRow}><span>Réseau</span><span>{net.label}</span></div>
              <div className={styles.confirmRow}><span>Adresse</span><span className={styles.confirmAddr}>{address.slice(0,8)}...{address.slice(-6)}</span></div>
              <div className={styles.confirmRow}><span>Montant</span><span>{amount} {token}</span></div>
              <div className={styles.confirmRow}><span>Frais</span><span>{net.fee} {token}</span></div>
              <div className={`${styles.confirmRow} ${styles.confirmTotal}`}><span>Vous recevez</span><span style={{color:'var(--grn)'}}>{fmt(receive)} {token}</span></div>
            </div>
            <div className={styles.confirmBtns}>
              <button className={styles.backBtn} onClick={()=>setStep(1)}>← Retour</button>
              <button className={styles.confirmBtn} onClick={onClose}>Confirmer le retrait</button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
