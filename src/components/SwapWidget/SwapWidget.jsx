import { useState, useEffect, useCallback, useRef } from 'react'
import { useAccount, useWalletClient, usePublicClient, useSwitchChain } from 'wagmi'
import { erc20Abi } from 'viem'
import { arbitrum, mainnet, base, polygon } from 'wagmi/chains'
import {
  getPrice, buildTx, fmtTokenAmount, toBaseUnits,
  CHAINS, POPULAR_TOKENS, NATIVE_TOKEN, FEE_BPS, FEE_RECIPIENT
} from '../../lib/swap0x'
import { SolanaSwap } from './SolanaSwap'
import { useT } from '../../lib/i18n'
import styles from './SwapWidget.module.css'

const DEFAULT_CHAIN = 42161
const SOLANA_CHAIN = 'solana'

export function SwapWidget({ onOpenWallet }) {
  const t = useT()
  const { address, isConnected, chain } = useAccount()
  const { data: walletClient }          = useWalletClient()
  const publicClient                    = usePublicClient()
  const { switchChain }                 = useSwitchChain()

  const [chainId, setChainId]     = useState(DEFAULT_CHAIN)
  const [sellTok, setSellTok]     = useState(POPULAR_TOKENS[DEFAULT_CHAIN][0])
  const [buyTok, setBuyTok]       = useState(POPULAR_TOKENS[DEFAULT_CHAIN][1])
  const [sellAmt, setSellAmt]     = useState('')
  const [priceRoute, setPriceRoute] = useState(null)
  const [loading, setLoading]     = useState(false)
  const [swapping, setSwapping]   = useState(false)
  const [txHash, setTxHash]       = useState(null)
  const [error, setError]         = useState(null)
  const [showTokens, setShowTokens] = useState(null)
  const [allowance, setAllowance] = useState(null)
  const [approving, setApproving] = useState(false)
  const debounceRef               = useRef(null)

  const tokens = POPULAR_TOKENS[chainId] || POPULAR_TOKENS[DEFAULT_CHAIN]

  // Fetch price when amount changes
  const fetchPrice = useCallback(async (amt, sell, buy, cid) => {
    if (!amt || isNaN(+amt) || +amt <= 0) { setPriceRoute(null); return }
    setLoading(true); setError(null)
    try {
      const sellAmount = toBaseUnits(amt, sell.decimals).toString()
      if (sellAmount === '0') { setLoading(false); return }
      const data = await getPrice({ chainId: cid, sellToken: sell.address, buyToken: buy.address, sellAmount })
      setPriceRoute(data.priceRoute)
    } catch(e) {
      setError(e.message)
      setPriceRoute(null)
    }
    setLoading(false)
  }, [])

  useEffect(() => {
    clearTimeout(debounceRef.current)
    if (!sellAmt) { setPriceRoute(null); return }
    debounceRef.current = setTimeout(() => fetchPrice(sellAmt, sellTok, buyTok, chainId), 600)
    return () => clearTimeout(debounceRef.current)
  }, [sellAmt, sellTok, buyTok, chainId, fetchPrice])

  // Check ERC20 allowance
  useEffect(() => {
    if (!address || !publicClient || !priceRoute || sellTok.address === NATIVE_TOKEN) {
      setAllowance(null); return
    }
    const spender = priceRoute.tokenTransferProxy || priceRoute.contractAddress
    if (!spender) return
    publicClient.readContract({
      address: sellTok.address, abi: erc20Abi,
      functionName: 'allowance', args: [address, spender],
    }).then(v => setAllowance(v)).catch(() => {})
  }, [priceRoute, address, sellTok, publicClient])

  const needsApproval = allowance !== null && priceRoute &&
    allowance < toBaseUnits(sellAmt, sellTok.decimals)

  const handleApprove = async () => {
    if (!walletClient || !priceRoute) return
    setApproving(true); setError(null)
    try {
      const spender = priceRoute.tokenTransferProxy || priceRoute.contractAddress
      const hash = await walletClient.writeContract({
        address: sellTok.address, abi: erc20Abi,
        functionName: 'approve',
        args: [spender, BigInt('0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff')],
      })
      await publicClient.waitForTransactionReceipt({ hash })
      setAllowance(BigInt('0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff'))
    } catch(e) { setError(e.shortMessage || e.message) }
    setApproving(false)
  }

  const handleSwap = async () => {
    if (!isConnected) { onOpenWallet?.(); return }
    if (!walletClient || !publicClient || !priceRoute) return
    if (chain?.id !== chainId) {
      try { await switchChain({ chainId }) }
      catch { setError('Network switch refused'); return }
    }
    setSwapping(true); setError(null); setTxHash(null)
    try {
      const tx = await buildTx({ chainId, priceRoute, taker: address })
      // Paraswap peut retourner value en hex ou en decimal string
      const txValue = tx.value
        ? (typeof tx.value === 'string' && tx.value.startsWith('0x')
            ? BigInt(tx.value)
            : BigInt(Math.round(Number(tx.value))))
        : 0n

      const chainMap = { 1: mainnet, 42161: arbitrum, 8453: base, 137: polygon }
      // On est sur Arbitrum (42161) par défaut
      const viemChain = chainMap[chainId] || arbitrum

      const hash = await walletClient.sendTransaction({
        to:      tx.to,
        data:    tx.data,
        value:   txValue,
        gas:     tx.gas ? BigInt(Math.round(Number(tx.gas))) : undefined,
        account: address,
        chain:   viemChain,
      })
      setTxHash(hash)
      setSellAmt(''); setPriceRoute(null)
      await publicClient.waitForTransactionReceipt({ hash })
    } catch(e) { setError(e.shortMessage || e.message || t('tx_rejected')) }
    setSwapping(false)
  }

  const flip = () => {
    setSellTok(buyTok); setBuyTok(sellTok)
    setSellAmt(''); setPriceRoute(null)
  }

  const buyAmt = priceRoute ? fmtTokenAmount(priceRoute.destAmount, buyTok.decimals) : null
  const route  = priceRoute?.bestRoute?.[0]?.swaps || []
  const chainInfo = CHAINS[chainId]
  const [showSolana, setShowSolana] = useState(false)

  // If user picked Solana, render the Solana panel instead
  if (showSolana) {
    return (
      <div style={{display:'flex',flexDirection:'column',height:'100%'}}>
        <div className={styles.header} style={{paddingBottom:0}}>
          <span className={styles.title}>⚡ Swap</span>
          <div className={styles.chainRow}>
            {Object.entries(CHAINS).map(([id, ch]) => (
              <button key={id} className={styles.chainBtn} onClick={() => {
                setShowSolana(false); setChainId(+id)
                const toks = POPULAR_TOKENS[+id] || POPULAR_TOKENS[DEFAULT_CHAIN]
                setSellTok(toks[0]); setBuyTok(toks[1] || toks[0])
              }}>{ch.name}</button>
            ))}
            <button className={styles.chainBtn + ' ' + styles.chainOn}
              style={{background:'rgba(153,69,255,.1)',borderColor:'rgba(153,69,255,.3)',color:'#9945ff'}}>
              Solana
            </button>
          </div>
        </div>
        <SolanaSwap />
      </div>
    )
  }

  return (
    <div className={styles.wrap}>

      <div className={styles.header}>
        <span className={styles.title}>⚡ Swap</span>
        <div className={styles.chainRow}>
          {Object.entries(CHAINS).map(([id, ch]) => (
            <button key={id}
              className={styles.chainBtn + (chainId === +id ? ' '+styles.chainOn : '')}
              onClick={() => {
                setChainId(+id)
                const toks = POPULAR_TOKENS[+id] || POPULAR_TOKENS[DEFAULT_CHAIN]
                setSellTok(toks[0]); setBuyTok(toks[1] || toks[0])
                setSellAmt(''); setPriceRoute(null)
              }}
            >{ch.name}</button>
          ))}
          <button className={styles.chainBtn} onClick={() => setShowSolana(true)}
            style={{borderColor:'rgba(153,69,255,.2)',color:'#9945ff'}}>
            Solana
          </button>
        </div>
      </div>

      <div className={styles.form}>

        {/* Sell */}
        <div className={styles.box}>
          <div className={styles.boxTop}>
            <span className={styles.boxLbl}>{t('from')}</span>
          </div>
          <div className={styles.boxRow}>
            <input className={styles.amtIn} type="number" min="0" step="any"
              value={sellAmt} onChange={e => setSellAmt(e.target.value)} placeholder="0.0"/>
            <button className={styles.tokBtn} onClick={() => setShowTokens('sell')}>
              <span className={styles.tokSym}>{sellTok.symbol}</span>
              <span className={styles.tokArrow}>▾</span>
            </button>
          </div>
        </div>

        {/* Flip */}
        <button className={styles.flip} onClick={flip}>⇅</button>

        {/* Buy */}
        <div className={styles.box}>
          <div className={styles.boxTop}>
            <span className={styles.boxLbl}>{t('to')}</span>
            {loading && <span className={styles.loadingDot}>calcul...</span>}
          </div>
          <div className={styles.boxRow}>
            <span className={styles.amtOut}>{buyAmt || '0.0'}</span>
            <button className={styles.tokBtn} onClick={() => setShowTokens('buy')}>
              <span className={styles.tokSym}>{buyTok.symbol}</span>
              <span className={styles.tokArrow}>▾</span>
            </button>
          </div>
        </div>

        {/* Details */}
        {priceRoute && buyAmt && (
          <div className={styles.details}>
            <div className={styles.detRow}>
              <span>Route</span>
              <span className={styles.detVal}>
                {route.map(s => s?.swapExchanges?.map(e => e.exchange).join(', ')).join(' → ') || 'Paraswap'}
              </span>
            </div>
            <div className={styles.detRow}>
              <span>{t('slippage')}</span>
              <span className={styles.detVal}>0.5%</span>
            </div>
            <div className={styles.detRow}>
              <span>Fee FXSEDGE ({FEE_BPS/100}%)</span>
              <span className={styles.detVal}>Collectée on-chain</span>
            </div>
          </div>
        )}

        {error && (
          <div className={styles.errBox}>
            <span>⚠ {error}</span>
            <button className={styles.errX} onClick={() => setError(null)}>✕</button>
          </div>
        )}

        {txHash && (
          <div className={styles.successBox}>
            ✓ Swap exécuté !{' '}
            <a href={`${chainInfo?.explorer}/tx/${txHash}`} target="_blank" rel="noreferrer">
              Voir ↗
            </a>
          </div>
        )}

        {!isConnected ? (
          <button className={styles.ctaBtn} onClick={() => onOpenWallet?.()}>
            Connecter le wallet
          </button>
        ) : needsApproval ? (
          <button className={styles.ctaBtn + ' '+styles.ctaApprove}
            onClick={handleApprove} disabled={approving}>
            {approving ? '⟳ Approbation...' : `Autoriser ${sellTok.symbol}`}
          </button>
        ) : (
          <button className={styles.ctaBtn} onClick={handleSwap}
            disabled={swapping || !sellAmt || !priceRoute || loading}>
            {swapping ? '⟳ Signature...'
              : !sellAmt ? 'Entre un montant'
              : loading ? `⟳ ${t('loading')}`
              : `Swap ${sellTok.symbol} → ${buyTok.symbol} ↗`}
          </button>
        )}

        <div className={styles.feeNote}>
          Paraswap · {FEE_BPS/100}% fee → {FEE_RECIPIENT.slice(0,6)}...{FEE_RECIPIENT.slice(-4)} ·
          Uniswap, Curve, Balancer +100 DEX
        </div>
      </div>

      {/* Token selector */}
      {showTokens && (
        <div className={styles.modal} onClick={() => setShowTokens(null)}>
          <div className={styles.modalBox} onClick={e => e.stopPropagation()}>
            <div className={styles.modalHead}>
              <span>Sélectionner un token</span>
              <button onClick={() => setShowTokens(null)}>✕</button>
            </div>
            <div className={styles.tokList}>
              {tokens.map(tok => (
                <button key={tok.address} className={styles.tokRow}
                  onClick={() => {
                    if (showTokens === 'sell') setSellTok(tok)
                    else setBuyTok(tok)
                    setShowTokens(null); setSellAmt(''); setPriceRoute(null)
                  }}>
                  <div className={styles.tokCircle}>{tok.symbol[0]}</div>
                  <div>
                    <div className={styles.tokName}>{tok.symbol}</div>
                    <div className={styles.tokAddr}>{tok.address.slice(0,8)}…{tok.address.slice(-6)}</div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
