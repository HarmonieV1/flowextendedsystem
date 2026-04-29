import { useState, useEffect } from 'react'
import { useAccount, useConnect, useDisconnect, useBalance } from 'wagmi'
import { useStore } from '../../store'
import styles from './WalletModal.module.css'

// Wallets avec icônes et ordre de priorité
const WALLET_CONFIG = [
  { id:'metaMask',    icon:'🦊', label:'MetaMask',       sub:'Extension navigateur',       url:'https://metamask.io' },
  { id:'phantom',     icon:'👻', label:'Phantom',         sub:'EVM · Arbitrum · Base · ETH',url:'https://phantom.app' },
  { id:'coinbaseWallet',icon:'🔵',label:'Coinbase Wallet', sub:'App mobile ou extension',    url:'https://www.coinbase.com/wallet' },
  { id:'walletConnect',icon:'🔗', label:'WalletConnect',   sub:'400+ wallets · Ledger · Rainbow · Trust',url:'' },
  { id:'injected',    icon:'🦊', label:'Browser Wallet',  sub:'Wallet détecté dans le navigateur', url:'' },
  { id:'rabby',       icon:'🐰', label:'Rabby',           sub:'Multi-chain · Sécurisé',      url:'https://rabby.io' },
  { id:'brave',       icon:'🦁', label:'Brave Wallet',    sub:'Intégré à Brave browser',    url:'' },
]

function getWalletInfo(conn) {
  const id   = (conn.id || '').toLowerCase()
  const name = (conn.name || '').toLowerCase()

  // Match par ID exact d'abord
  if (id === 'metamask' || id === 'metamaskwallet') return WALLET_CONFIG[0]
  if (id === 'phantom')      return WALLET_CONFIG[1]
  if (id === 'coinbasewallet') return WALLET_CONFIG[2]
  if (id === 'walletconnect') return WALLET_CONFIG[3]
  if (id === 'injected') {
    // Detect what's injected
    if (typeof window !== 'undefined') {
      if (window.phantom?.ethereum)   return WALLET_CONFIG[1] // Phantom
      if (window.rabby)               return WALLET_CONFIG[5] // Rabby
      if (window.ethereum?.isBraveWallet) return WALLET_CONFIG[6] // Brave
    }
    return WALLET_CONFIG[0] // Default → MetaMask
  }
  // Name-based fallback
  if (name.includes('metamask')) return WALLET_CONFIG[0]
  if (name.includes('phantom'))  return WALLET_CONFIG[1]
  if (name.includes('coinbase')) return WALLET_CONFIG[2]
  if (name.includes('walletconnect') || name.includes('wallet connect')) return WALLET_CONFIG[3]

  return { icon: '◈', label: conn.name || 'Wallet', sub: 'Connecter', url: '' }
}

export function WalletModal({ open, onClose }) {
  const { address, isConnected, connector } = useAccount()
  const { connect, connectors, isPending, error: connectError } = useConnect()
  const { disconnect } = useDisconnect()
  const { data: balance } = useBalance({ address: address ?? undefined, query: { enabled: !!address } })
  const setConnected = useStore(s => s.setConnected)
  const [localError, setLocalError] = useState('')

  useEffect(() => {
    setConnected(isConnected, isConnected ? address : null)
    if (isConnected) { setLocalError(''); onClose?.() }
  }, [isConnected, address])

  useEffect(() => {
    if (!connectError) return
    const msg = connectError.message || ''
    if (msg.includes('not found') || msg.includes('not installed')) {
      setLocalError('Wallet non détecté — installe l\'extension ou ouvre dans un wallet mobile')
    } else if (msg.includes('rejected') || msg.includes('denied') || msg.includes('user')) {
      setLocalError('Connexion annulée')
    } else {
      setLocalError(msg.slice(0, 120))
    }
  }, [connectError])

  if (!open) return null

  // Deduplicate connectors — garder un seul par label affiché
  const seen = new Set()
  const unique = connectors.filter(conn => {
    const info = getWalletInfo(conn)
    const key  = info.label
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })

  const ethBal = balance ? `${parseFloat(balance.formatted).toFixed(4)} ${balance.symbol}` : ''

  return (
    <div className={styles.bg} onClick={onClose}>
      <div className={styles.modal} onClick={e => e.stopPropagation()}>

        <div className={styles.hdr}>
          <span className={styles.title}>
            {isConnected ? '✅ Wallet connecté' : 'Connecter un Wallet'}
          </span>
          <button className={styles.x} onClick={onClose}>✕</button>
        </div>

        {!isConnected && (
          <p className={styles.sub}>No KYC · Non-custodial · Tes clés, tes crypto</p>
        )}

        {isConnected ? (
          <div className={styles.connected}>
            <div className={styles.connectedInfo}>
              <span className={styles.connectedIcon}>
                {getWalletInfo({ id: connector?.id, name: connector?.name }).icon}
              </span>
              <div>
                <div className={styles.connectedAddr}>
                  {address?.slice(0,6)}...{address?.slice(-4)}
                </div>
                <div className={styles.connectedBal}>{ethBal}</div>
              </div>
            </div>
            <a
              href={`https://arbiscan.io/address/${address}`}
              target="_blank" rel="noreferrer"
              className={styles.scanLink}
            >
              Voir sur Arbiscan ↗
            </a>
            <button
              className={styles.disconnectBtn}
              onClick={() => { disconnect(); onClose?.() }}
            >
              Déconnecter
            </button>
          </div>
        ) : (
          <div className={styles.list}>
            {unique.map(conn => {
              const info = getWalletInfo(conn)
              return (
                <button
                  key={conn.uid || conn.id}
                  className={styles.walletBtn}
                  disabled={isPending}
                  onClick={() => {
                    setLocalError('')
                    connect({ connector: conn })
                  }}
                >
                  <span className={styles.wIcon}>{info.icon}</span>
                  <div className={styles.wInfo}>
                    <span className={styles.wLabel}>{info.label}</span>
                    <span className={styles.wSub}>{info.sub}</span>
                  </div>
                  {isPending ? (
                    <span className={styles.wArrow}>⟳</span>
                  ) : (
                    <span className={styles.wArrow}>→</span>
                  )}
                </button>
              )
            })}

            {/* WalletConnect si pas déjà dans la liste */}
            {!unique.find(c => (c.id||'').toLowerCase().includes('walletconnect')) && (
              <button
                className={styles.walletBtn + ' ' + styles.walletBtnWC}
                onClick={() => {
                  const wc = connectors.find(c => (c.id||'').toLowerCase().includes('walletconnect'))
                  if (wc) { setLocalError(''); connect({ connector: wc }) }
                }}
              >
                <span className={styles.wIcon}>🔗</span>
                <div className={styles.wInfo}>
                  <span className={styles.wLabel}>WalletConnect</span>
                  <span className={styles.wSub}>400+ wallets · Ledger · Rainbow · Trust</span>
                </div>
                <span className={styles.wArrow}>→</span>
              </button>
            )}
          </div>
        )}

        {localError && (
          <div className={styles.error}>{localError}</div>
        )}

        {!isConnected && (
          <div className={styles.footer}>
            Compatible : MetaMask · Phantom · Coinbase · Ledger · Rainbow · Trust · Rabby
          </div>
        )}
      </div>
    </div>
  )
}
