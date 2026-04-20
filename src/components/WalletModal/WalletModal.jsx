import { useEffect } from 'react'
import { useAccount, useDisconnect } from 'wagmi'
import { ConnectButton } from '@rainbow-me/rainbowkit'
import { useSiwe } from '../../lib/siwe'
import { useOnChainBalance } from '../../hooks/useBalance'
import { useStore } from '../../store'
import styles from './WalletModal.module.css'

export function WalletModal({ open, onClose }) {
  const { address, isConnected } = useAccount()
  const { signIn } = useSiwe()
  const setConnected = useStore(s => s.setConnected)
  const connected = useStore(s => s.connected)

  useEffect(() => {
    if (isConnected && address && !connected) {
      signIn().catch(console.warn)
    }
    if (!isConnected) {
      setConnected(false, null)
    }
  }, [isConnected, address])

  useOnChainBalance()

  if (!open) return null

  return (
    <div className={styles.bg} onClick={onClose}>
      <div className={styles.modal} onClick={e => e.stopPropagation()}>
        <div>
          <div className={styles.title}>Connect Wallet</div>
          <div className={styles.sub}>No KYC · Non-custodial · Sign once with SIWE</div>
        </div>

        <div className={styles.rbkWrap}>
          <ConnectButton accountStatus="address" chainStatus="icon" showBalance={false} />
        </div>

        {isConnected && !connected && (
          <div className={styles.siwePrompt}>
            <p className={styles.siweText}>Wallet connected. Sign to authenticate — no gas fee.</p>
            <button className={styles.siweBtn} onClick={() => signIn().catch(console.warn)}>
              Sign in with Ethereum
            </button>
          </div>
        )}

        <div className={styles.footer}>
          <span className={styles.noKyc}>🔒 No email · No password · No KYC</span>
        </div>
        <button className={styles.cancel} onClick={onClose}>Close</button>
      </div>
    </div>
  )
}
