import { useState, useEffect } from 'react'
import { useReadContract } from 'wagmi'
import { erc20Abi, formatUnits } from 'viem'
import styles from './MultiAccount.module.css'

const CHAIN_COLORS = { 1:'#627eea', 42161:'#9dcced', 8453:'#0052ff' }
const CHAIN_NAMES  = { 1:'Ethereum', 42161:'Arbitrum', 8453:'Base' }

const ERC20_TOKENS = [
  { sym:'USDC', address:'0xaf88d065e77c8cC2239327C5EDb3A432268e5831', decimals:6, chainId:42161, price:1 },
  { sym:'USDT', address:'0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9', decimals:6, chainId:42161, price:1 },
]

function isValidAddress(addr) {
  return /^0x[0-9a-fA-F]{40}$/.test(addr)
}

export function MultiAccount() {
  const [wallets, setWallets]     = useState(() => {
    try { return JSON.parse(localStorage.getItem('fxs_wallets') || '[]') } catch { return [] }
  })
  const [input, setInput]         = useState('')
  const [label, setLabel]         = useState('')
  const [ethPx, setEthPx]         = useState(2000)
  const [error, setError]         = useState('')
  const [totalUSD, setTotalUSD]   = useState(0)

  useEffect(() => {
    fetch('https://api.binance.com/api/v3/ticker/price?symbol=ETHUSDT')
      .then(r=>r.json()).then(d=>{ if(d.price) setEthPx(parseFloat(d.price)) }).catch(()=>{})
  }, [])

  useEffect(() => {
    localStorage.setItem('fxs_wallets', JSON.stringify(wallets))
  }, [wallets])

  const addWallet = () => {
    setError('')
    const addr = input.trim()
    if (!isValidAddress(addr)) { setError('Adresse invalide — format: 0x...'); return }
    if (wallets.find(w=>w.address.toLowerCase()===addr.toLowerCase())) { setError('Wallet déjà ajouté'); return }
    setWallets(prev => [...prev, {
      address: addr,
      label: label.trim() || addr.slice(0,6)+'...'+addr.slice(-4),
      chainId: 42161,
      added: Date.now(),
    }])
    setInput(''); setLabel('')
  }

  const removeWallet = (addr) => setWallets(prev => prev.filter(w=>w.address!==addr))

  const colors = ['#7c3aed','#2563eb','#059669','#d97706','#dc2626','#db2777','#0891b2','#65a30d']

  return (
    <div className={styles.wrap}>
      <div className={styles.header}>
        <span className={styles.title}>👛 Multi-Account View</span>
        <span className={styles.count}>{wallets.length} wallet{wallets.length>1?'s':''}</span>
      </div>

      {/* Add wallet form */}
      <div className={styles.addForm}>
        <input
          className={styles.addrInput}
          value={input}
          onChange={e=>setInput(e.target.value)}
          placeholder="0x... adresse wallet"
          onKeyDown={e=>e.key==='Enter'&&addWallet()}
        />
        <input
          className={styles.labelInput}
          value={label}
          onChange={e=>setLabel(e.target.value)}
          placeholder="Label (optionnel)"
          onKeyDown={e=>e.key==='Enter'&&addWallet()}
        />
        <button className={styles.addBtn} onClick={addWallet}>+ Ajouter</button>
      </div>
      {error && <div className={styles.error}>{error}</div>}

      {wallets.length === 0 ? (
        <div className={styles.empty}>
          <div style={{fontSize:36,marginBottom:10}}>👛</div>
          <div style={{fontSize:13,fontWeight:700,color:'var(--txt)'}}>Aucun wallet ajouté</div>
          <div style={{fontSize:11,color:'var(--txt3)',marginTop:6,lineHeight:1.6}}>
            Ajoute plusieurs wallets pour voir ton P&L global agrégé<br/>
            Compatible Ethereum · Arbitrum · Base
          </div>
        </div>
      ) : (
        <div className={styles.walletsWrap}>
          {/* Summary bar */}
          <div className={styles.summaryBar}>
            <div className={styles.sumItem}>
              <span className={styles.sumL}>Wallets</span>
              <span className={styles.sumV}>{wallets.length}</span>
            </div>
            <div className={styles.sumItem}>
              <span className={styles.sumL}>Réseau</span>
              <span className={styles.sumV}>Arbitrum</span>
            </div>
            <div className={styles.sumItem}>
              <span className={styles.sumL}>ETH Price</span>
              <span className={styles.sumV}>${ethPx.toFixed(0)}</span>
            </div>
          </div>

          <div className={styles.list}>
            {wallets.map((w, i) => (
              <WalletRow key={w.address} wallet={w} color={colors[i%colors.length]}
                ethPx={ethPx} onRemove={()=>removeWallet(w.address)}/>
            ))}
          </div>
        </div>
      )}

      <div className={styles.footer}>Lecture seule · Balances on-chain · Refresh au chargement</div>
    </div>
  )
}

function WalletRow({ wallet, color, ethPx, onRemove }) {
  const { data: ethBal } = useReadContract({
    address: '0x0000000000000000000000000000000000000000',
    abi: [], functionName: 'balanceOf', args: [wallet.address],
    query: { enabled: false }
  })

  // Simple ETH balance via useBalance-like approach
  const [eth, setEth]   = useState(null)
  const [usdc, setUsdc] = useState(null)

  useEffect(() => {
    // Fetch ETH balance via Arbitrum RPC
    const fetchBalances = async () => {
      try {
        const r = await fetch('https://arb1.arbitrum.io/rpc', {
          method:'POST',
          headers:{'Content-Type':'application/json'},
          body: JSON.stringify({ jsonrpc:'2.0', id:1, method:'eth_getBalance', params:[wallet.address,'latest'] })
        })
        const d = await r.json()
        if (d.result) setEth(parseInt(d.result,16) / 1e18)
      } catch(_) {}
    }
    fetchBalances()
  }, [wallet.address])

  const totalUSD = (eth || 0) * ethPx + (usdc || 0)
  const short = wallet.address.slice(0,6)+'...'+wallet.address.slice(-4)

  return (
    <div className={styles.walletRow}>
      <div className={styles.walletTop}>
        <div className={styles.walletAvatar} style={{background:color+'22',color:color}}>
          {wallet.label[0].toUpperCase()}
        </div>
        <div className={styles.walletInfo}>
          <div className={styles.walletLabel}>{wallet.label}</div>
          <div className={styles.walletAddr}>{short}</div>
        </div>
        <div className={styles.walletTotal}>
          <div className={styles.walletUSD}>${totalUSD.toFixed(2)}</div>
          <div className={styles.walletNet}>Arbitrum</div>
        </div>
        <button className={styles.removeBtn} onClick={onRemove}>✕</button>
      </div>
      <div className={styles.walletAssets}>
        <div className={styles.assetRow}>
          <span style={{color:'#627eea',fontWeight:700}}>ETH</span>
          <span>{eth !== null ? eth.toFixed(4) : '...'}</span>
          <span className={styles.assetUSD}>${eth !== null ? (eth*ethPx).toFixed(2) : '—'}</span>
        </div>
      </div>
      <a href={`https://arbiscan.io/address/${wallet.address}`} target="_blank" rel="noreferrer" className={styles.scanLink}>
        Voir sur Arbiscan ↗
      </a>
    </div>
  )
}
