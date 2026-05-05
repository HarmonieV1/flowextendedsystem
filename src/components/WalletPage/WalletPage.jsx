import { useState, useEffect } from 'react'
import { useAccount, useBalance, useChainId, useReadContract } from 'wagmi'
import { erc20Abi, formatUnits } from 'viem'
import styles from './WalletPage.module.css'

const ERC20 = {
  1: [
    { sym:'USDC', name:'USD Coin', color:'#2775ca', address:'0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48', dec:6, usdPrice:1 },
    { sym:'USDT', name:'Tether',   color:'#26a17b', address:'0xdAC17F958D2ee523a2206206994597C13D831ec7', dec:6, usdPrice:1 },
  ],
  42161: [
    { sym:'USDC', name:'USD Coin', color:'#2775ca', address:'0xaf88d065e77c8cC2239327C5EDb3A432268e5831', dec:6, usdPrice:1 },
    { sym:'USDT', name:'Tether',   color:'#26a17b', address:'0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9', dec:6, usdPrice:1 },
    { sym:'ARB',  name:'Arbitrum', color:'#9dcced', address:'0x912CE59144191C1204E64559FE8253a0e49E6548', dec:18, usdPrice:0.8 },
  ],
  8453: [
    { sym:'USDC', name:'USD Coin', color:'#2775ca', address:'0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913', dec:6, usdPrice:1 },
  ],
}
const CHAIN_NAME  = { 1:'Ethereum', 42161:'Arbitrum One', 8453:'Base' }
const CHAIN_COLOR = { 1:'#627eea', 42161:'#9dcced', 8453:'#0052ff' }

function useEthPrice() {
  const [p, setP] = useState(2200)
  useEffect(() => {
    const load = () => fetch('https://api.binance.com/api/v3/ticker/price?symbol=ETHUSDT')
      .then(r => r.json()).then(d => { if(d.price) setP(parseFloat(d.price)) }).catch(()=>{})
    load()
    const t = setInterval(load, 60000)
    return () => clearInterval(t)
  }, [])
  return p
}

function EthRow({ address, chainId, ethPrice }) {
  const { data, isLoading } = useBalance({
    address, chainId,
    query: { enabled: !!address, refetchInterval: 15000 },
  })
  // data.value is BigInt — 0n is falsy, must check !== undefined
  const amount = (data !== undefined && data.value !== undefined)
    ? Number(data.value) / 1e18
    : 0
  const safe   = isNaN(amount) ? 0 : amount
  const usdVal = safe * ethPrice

  return (
    <div className={styles.tokenRow}>
      <div className={styles.tokenIcon} style={{background:'#627eea22',color:'#627eea'}}>Ξ</div>
      <div className={styles.tokenInfo}>
        <span className={styles.tokenSym}>ETH</span>
        <span className={styles.tokenName}>Ethereum (natif)</span>
      </div>
      <div className={styles.tokenBal}>
        <span className={styles.tokenAmt}>{isLoading ? '...' : safe.toFixed(6)}</span>
        <span className={styles.tokenUsd}>{isLoading ? '—' : '$' + usdVal.toFixed(2)}</span>
      </div>
    </div>
  )
}

function Erc20Row({ token, address, chainId }) {
  const { data, isLoading } = useReadContract({
    address: token.address, abi: erc20Abi, functionName: 'balanceOf',
    args: [address], chainId,
    query: { enabled: !!address, refetchInterval: 15000 },
  })
  // data is BigInt from contract
  const amount = (data !== undefined && data !== null)
    ? parseFloat(formatUnits(data, token.dec))
    : 0
  const safe   = isNaN(amount) ? 0 : amount
  const usdVal = safe * (token.usdPrice || 1)

  return (
    <div className={styles.tokenRow}>
      <div className={styles.tokenIcon} style={{background:token.color+'22',color:token.color}}>
        {token.sym[0]}
      </div>
      <div className={styles.tokenInfo}>
        <span className={styles.tokenSym}>{token.sym}</span>
        <span className={styles.tokenName}>{token.name}</span>
      </div>
      <div className={styles.tokenBal}>
        <span className={styles.tokenAmt}>{isLoading ? '...' : safe > 0 ? safe.toFixed(token.dec > 6 ? 4 : 2) : '0.00'}</span>
        <span className={styles.tokenUsd}>{isLoading ? '—' : '$' + usdVal.toFixed(2)}</span>
      </div>
    </div>
  )
}

export function WalletPage({ onDeposit, onWithdraw }) {
  const { address, isConnected } = useAccount()
  const chainId  = useChainId()
  const [tab, setTab] = useState('assets')
  const ethPrice = useEthPrice()

  if (!isConnected) return (
    <div className={styles.wrap}>
      <div className={styles.empty}>
        <div className={styles.emptyIcon}>💼</div>
        <div className={styles.emptyTitle}>Portfolio</div>
        <div className={styles.emptySub}>Connecte ton wallet pour voir tes actifs en temps réel</div>
      </div>
    </div>
  )

  const tokens     = ERC20[chainId] || []
  const chainLabel = CHAIN_NAME[chainId] || ('Chain ' + chainId)
  const chainColor = CHAIN_COLOR[chainId] || '#888'

  return (
    <div className={styles.wrap}>
      <div className={styles.header}>
        <div className={styles.addressRow}>
          <div className={styles.avatar} style={{background:chainColor+'33',color:chainColor}}>
            {address.slice(2,4).toUpperCase()}
          </div>
          <div>
            <div className={styles.address}>{address.slice(0,6)}...{address.slice(-4)}</div>
            <div className={styles.chainBadge} style={{color:chainColor}}>● {chainLabel}</div>
          </div>
        </div>
        <div className={styles.actions}>
          <button className={styles.actBtn} onClick={()=>onDeposit?.()}>↓ Dépôt</button>
          <button className={styles.actBtn} onClick={()=>onWithdraw?.()}>↑ Retrait</button>
        </div>
      </div>

      <div className={styles.tabs}>
        {[['assets','💰 Actifs'],['defi','⚡ DeFi']].map(([id,lbl])=>(
          <button key={id} className={styles.tabBtn+(tab===id?' '+styles.tabOn:'')} onClick={()=>setTab(id)}>
            {lbl}
          </button>
        ))}
      </div>

      {tab === 'assets' && (
        <div className={styles.list}>
          <EthRow address={address} chainId={chainId} ethPrice={ethPrice} />
          {tokens.map(t=>(
            <Erc20Row key={t.sym} token={t} address={address} chainId={chainId} />
          ))}
          {!ERC20[chainId] && (
            <div className={styles.noTokens}>
              Switch vers Ethereum, Arbitrum ou Base pour voir tes tokens ERC20
            </div>
          )}
        </div>
      )}

      {tab === 'defi' && (
        <div className={styles.defiWrap}>
          <div className={styles.defiTitle}>Positions GMX · Arbitrum</div>
          <div className={styles.defiSub}>Connecte-toi sur Arbitrum pour voir tes positions ouvertes.</div>
          <a href="https://app.gmx.io/#/dashboard?ref=FXS" target="_blank" rel="noreferrer" className={styles.gmxLink}>
            Voir sur GMX.io ↗
          </a>
        </div>
      )}

      <div className={styles.footer}>
        ⚡ On-chain · ETH ${ethPrice.toFixed(0)} · Refresh 15s
      </div>
    </div>
  )
}
