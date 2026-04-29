import { useState, useEffect } from 'react'
import { useAccount, useConnect, useDisconnect, useBalance } from 'wagmi'
import { useStore } from '../../store'
import styles from './WalletModal.module.css'

export function WalletModal({ open, onClose }) {
  const { address, isConnected, connector } = useAccount()
  const { connect, connectors, isPending, error: connectError } = useConnect()
  const { disconnect } = useDisconnect()
  const { data: balance } = useBalance({ address: address ?? undefined, query: { enabled: !!address && !!address.length } })
  const setConnected = useStore(s => s.setConnected)
  const [localError, setLocalError] = useState('')

  useEffect(() => {
    setConnected(isConnected, isConnected ? address : null)
    if (isConnected) setLocalError('')
  }, [isConnected, address])

  useEffect(() => {
    if (!connectError) return
    const msg = connectError.message || ''
    if (msg.includes('Provider not found') || msg.includes('not found')) {
      setLocalError('MetaMask non détecté — installe l\'extension MetaMask ou ouvre dans un wallet browser (Trust Wallet, Coinbase Wallet)')
    } else if (msg.includes('rejected') || msg.includes('denied')) {
      setLocalError('Connexion annulée')
    } else {
      setLocalError(msg)
    }
  }, [connectError])

  if (!open) return null

  // Deduplicate by name
  const seen = new Set()
  const unique = connectors.filter(c => {
    if (seen.has(c.name)) return false
    seen.add(c.name)
    return true
  })

  const getInfo = (conn) => {
    const n = (conn.name || conn.id || '').toLowerCase()
    if (n.includes('metamask') || conn.id === 'metaMask') return { icon: '🦊', label: 'MetaMask', sub: 'Connecter MetaMask' }
    if (n.includes('coinbase')) return { icon: '🔵', label: 'Coinbase Wallet', sub: 'App mobile ou extension' }
    if (n.includes('injected')) {
      // Detect specific injected wallet
      if (typeof window !== 'undefined') {
        if (window.phantom?.ethereum) return { icon: '👻', label: 'Phantom', sub: 'EVM · Arbitrum · Base · ETH' }
        if (window.rabby) return { icon: '🐰', label: 'Rabby Wallet', sub: 'Multi-chain · Secure' }
        if (window.ethereum?.isBraveWallet) return { icon: '🦁', label: 'Brave Wallet', sub: 'Intégré au navigateur' }
      }
      return { icon: '🦊', label: 'MetaMask', sub: 'ou wallet EVM détecté' }
    }
    return { icon: '◈', label: conn.name, sub: 'Connecter' }
  }

  const ethBal = balance ? `${parseFloat(balance.formatted).toFixed(4)} ${balance.symbol}` : ''

  return (
    <div className={styles.bg} onClick={onClose}>
      <div className={styles.modal} onClick={e => e.stopPropagation()}>
        <div className={styles.hdr}>
          <span className={styles.title}>Connecter un Wallet</span>
          <button className={styles.x} onClick={onClose}>✕</button>
        </div>
        <p className={styles.sub}>No KYC · Non-custodial · Tes clés, tes crypto</p>

        {isConnected ? (
          <div className={styles.connected}>
            <div className={styles.check}>✓</div>
            <div className={styles.addr}>{address?.slice(0,6)}...{address?.slice(-4)}</div>
            {ethBal && <div className={styles.bal}>{ethBal}</div>}
            <div className={styles.via}>via {connector?.name}</div>
            <button className={styles.discBtn} onClick={() => { disconnect(); onClose() }}>Déconnecter</button>
            <button className={styles.doneBtn} onClick={onClose}>Continuer →</button>
          </div>
        ) : (
          <>
            <div className={styles.list}>
              {unique.map(conn => {
                const info = getInfo(conn)
                return (
                  <button key={conn.uid} className={styles.row}
                    onClick={() => { setLocalError(''); connect({ connector: conn }) }}
                    disabled={isPending}
                  >
                    <span className={styles.icon}>{info.icon}</span>
                    <div className={styles.info}>
                      <span className={styles.name}>{info.label}</span>
                      <span className={styles.desc}>{info.sub}</span>
                    </div>
                    <span className={styles.arr}>{isPending ? '⟳' : '→'}</span>
                  </button>
                )
              })}
            </div>

            {/* Install links if no wallet */}
            <div className={styles.installs}>
              <a href="https://metamask.io/download/" target="_blank" rel="noreferrer" className={styles.installLink}>
                🦊 Installer MetaMask
              </a>
              <a href="https://www.coinbase.com/wallet/downloads" target="_blank" rel="noreferrer" className={styles.installLink}>
                🔵 Coinbase Wallet
              </a>
            </div>

            {localError && <div className={styles.error}>⚠ {localError}</div>}
          </>
        )}
        <p className={styles.note}>🔒 FXSEDGE ne peut jamais accéder à tes fonds</p>
      </div>
    </div>
  )
}
