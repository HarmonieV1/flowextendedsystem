import { useState, useEffect, useCallback, useRef } from 'react'
import { useAccount, useWalletClient, usePublicClient, useSwitchChain } from 'wagmi'
import { parseUnits, formatUnits, erc20Abi } from 'viem'
import {
  getPrice, getQuote, fmtTokenAmount, toBaseUnits,
  CHAINS, POPULAR_TOKENS, NATIVE_TOKEN, FEE_BPS, FEE_RECIPIENT
} from '../../lib/swap0x'
import styles from './SwapWidget.module.css'

const DEFAULT_CHAIN   = 42161 // Arbitrum
const DEFAULT_SELL    = POPULAR_TOKENS[42161][0] // ETH
const DEFAULT_BUY     = POPULAR_TOKENS[42161][1] // USDC

export function SwapWidget({ onOpenWallet }) {
  const { address, isConnected, chain }      = useAccount()
  const { data: walletClient }               = useWalletClient()
  const publicClient                         = usePublicClient()
  const { switchChain }                      = useSwitchChain()

  const [chainId, setChainId]   = useState(DEFAULT_CHAIN)
  const [sellTok, setSellTok]   = useState(DEFAULT_SELL)
  const [buyTok, setBuyTok]     = useState(DEFAULT_BUY)
  const [sellAmt, setSellAmt]   = useState('')
  const [quote, setQuote]       = useState(null)  // price response
  const [loading, setLoading]   = useState(false)
  const [swapping, setSwapping] = useState(false)
  const [txHash, setTxHash]     = useState(null)
  const [error, setError]       = useState(null)
  const [showTokens, setShowTokens] = useState(null) // 'sell' | 'buy'
  const [allowance, setAllowance]   = useState(null)
  const [approving, setApproving]   = useState(false)
  const debounceRef = useRef(null)

  const tokens = POPULAR_TOKENS[chainId] || POPULAR_TOKENS[DEFAULT_CHAIN]

  // Fetch indicative price when amount changes
  const fetchPrice = useCallback(async (amt, sell, buy, cid) => {
    if (!amt || isNaN(amt) || parseFloat(amt) <= 0) { setQuote(null); return }
    setLoading(true); setError(null)
    try {
      const sellAmount = toBaseUnits(amt, sell.decimals).toString()
      if (sellAmount === '0') { setLoading(false); return }
      const data = await getPrice({
        chainId: cid,
        sellToken: sell.address,
        buyToken:  buy.address,
        sellAmount,
        taker: address || undefined,
      })
      setQuote(data)
    } catch(e) {
      setError(e.message)
      setQuote(null)
    }
    setLoading(false)
  }, [address])

  // Debounce price fetch
  useEffect(() => {
    clearTimeout(debounceRef.current)
    if (!sellAmt) { setQuote(null); return }
    debounceRef.current = setTimeout(() => {
      fetchPrice(sellAmt, sellTok, buyTok, chainId)
    }, 600)
    return () => clearTimeout(debounceRef.current)
  }, [sellAmt, sellTok, buyTok, chainId, fetchPrice])

  // Check allowance for ERC20 sell token
  useEffect(() => {
    if (!address || !publicClient || !quote) return
    if (sellTok.address === NATIVE_TOKEN) { setAllowance(null); return }
    const spender = quote.issues?.allowance?.spender
    if (!spender) return
    publicClient.readContract({
      address: sellTok.address,
      abi: erc20Abi,
      functionName: 'allowance',
      args: [address, spender],
    }).then(val => setAllowance(val)).catch(() => {})
  }, [quote, address, sellTok, publicClient])

  const needsApproval = allowance !== null && quote &&
    allowance < toBaseUnits(sellAmt, sellTok.decimals)

  // Approve ERC20
  const handleApprove = async () => {
    if (!walletClient || !quote) return
    setApproving(true); setError(null)
    try {
      const spender = quote.issues?.allowance?.spender
      const hash = await walletClient.writeContract({
        address: sellTok.address,
        abi: erc20Abi,
        functionName: 'approve',
        args: [spender, BigInt('0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff')],
      })
      await publicClient.waitForTransactionReceipt({ hash })
      setAllowance(BigInt('0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff'))
    } catch(e) {
      setError(e.shortMessage || e.message)
    }
    setApproving(false)
  }

  // Execute swap
  const handleSwap = async () => {
    if (!isConnected) { onOpenWallet?.(); return }
    if (!walletClient || !publicClient) return

    // Switch chain if needed
    if (chain?.id !== chainId) {
      try { await switchChain({ chainId }) } catch(e) { setError('Changement de réseau refusé'); return }
    }

    setSwapping(true); setError(null); setTxHash(null)
    try {
      const sellAmount = toBaseUnits(sellAmt, sellTok.decimals).toString()
      // Get firm quote with transaction
      const firmQuote = await getQuote({
        chainId,
        sellToken:   sellTok.address,
        buyToken:    buyTok.address,
        sellAmount,
        taker:       address,
        slippageBps: 50,
      })

      if (!firmQuote.transaction) throw new Error('Quote invalide — réessaie')

      const { to, data, value, gas } = firmQuote.transaction
      const hash = await walletClient.sendTransaction({
        to,
        data,
        value:    value ? BigInt(value) : 0n,
        gas:      gas ? BigInt(gas) : undefined,
        account:  address,
        chain:    { id: chainId },
      })

      setTxHash(hash)
      setSellAmt('')
      setQuote(null)

      // Wait for confirmation
      await publicClient.waitForTransactionReceipt({ hash })
    } catch(e) {
      setError(e.shortMessage || e.message || 'Transaction refusée')
    }
    setSwapping(false)
  }

  const flip = () => {
    setSellTok(buyTok)
    setBuyTok(sellTok)
    setSellAmt('')
    setQuote(null)
  }

  const chainFee = quote?.fees?.integratorFee
  const feeAmt   = chainFee ? fmtTokenAmount(chainFee.amount, buyTok.decimals) : null
  const buyAmt   = quote?.buyAmount ? fmtTokenAmount(quote.buyAmount, buyTok.decimals) : null
  const minBuy   = quote?.minBuyAmount ? fmtTokenAmount(quote.minBuyAmount, buyTok.decimals) : null
  const route    = quote?.route?.fills || []

  return (
    <div className={styles.wrap}>
      {/* Header */}
      <div className={styles.header}>
        <span className={styles.title}>⚡ Swap</span>
        <div className={styles.chainRow}>
          {Object.entries(CHAINS).map(([id, ch]) => (
            <button key={id}
              className={styles.chainBtn + (chainId === +id ? ' '+styles.chainOn : '')}
              onClick={() => {
                setChainId(+id)
                const toks = POPULAR_TOKENS[+id]
                if (toks) { setSellTok(toks[0]); setBuyTok(toks[1] || toks[0]) }
                setSellAmt(''); setQuote(null)
              }}
            >{ch.name}</button>
          ))}
        </div>
      </div>

      <div className={styles.form}>

        {/* Sell */}
        <div className={styles.box}>
          <div className={styles.boxTop}>
            <span className={styles.boxLbl}>Tu vends</span>
            <button className={styles.maxBtn} onClick={() => setSellAmt('0.1')}>Max</button>
          </div>
          <div className={styles.boxRow}>
            <input
              className={styles.amtIn}
              type="number" min="0" step="any"
              value={sellAmt}
              onChange={e => setSellAmt(e.target.value)}
              placeholder="0.0"
            />
            <button className={styles.tokBtn} onClick={() => setShowTokens('sell')}>
              <img src={sellTok.logoURI} className={styles.tokLogo} alt="" onError={e=>e.target.style.display='none'}/>
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
            <span className={styles.boxLbl}>Tu reçois</span>
            {loading && <span className={styles.loadingDot}>...</span>}
          </div>
          <div className={styles.boxRow}>
            <span className={styles.amtOut}>
              {buyAmt || (loading ? '...' : '0.0')}
            </span>
            <button className={styles.tokBtn} onClick={() => setShowTokens('buy')}>
              <img src={buyTok.logoURI} className={styles.tokLogo} alt="" onError={e=>e.target.style.display='none'}/>
              <span className={styles.tokSym}>{buyTok.symbol}</span>
              <span className={styles.tokArrow}>▾</span>
            </button>
          </div>
        </div>

        {/* Quote details */}
        {quote && buyAmt && (
          <div className={styles.details}>
            <div className={styles.detRow}>
              <span>Minimum reçu</span>
              <span className={styles.detVal}>{minBuy} {buyTok.symbol}</span>
            </div>
            <div className={styles.detRow}>
              <span>Slippage</span>
              <span className={styles.detVal}>0.5%</span>
            </div>
            <div className={styles.detRow}>
              <span>Fee FXSEDGE ({FEE_BPS/100}%)</span>
              <span className={styles.detVal}>{feeAmt ? `${feeAmt} ${buyTok.symbol}` : '—'}</span>
            </div>
            {route.length > 0 && (
              <div className={styles.detRow}>
                <span>Route</span>
                <span className={styles.detVal}>{route.map(f => f.source).join(' → ')}</span>
              </div>
            )}
          </div>
        )}

        {/* Error */}
        {error && (
          <div className={styles.errBox}>
            <span>⚠ {error}</span>
            <button className={styles.errDismiss} onClick={() => setError(null)}>✕</button>
          </div>
        )}

        {/* Tx success */}
        {txHash && (
          <div className={styles.successBox}>
            ✓ Swap exécuté !{' '}
            <a href={`https://arbiscan.io/tx/${txHash}`} target="_blank" rel="noreferrer">
              Voir sur Arbiscan ↗
            </a>
          </div>
        )}

        {/* CTA */}
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
          <button
            className={styles.ctaBtn}
            onClick={handleSwap}
            disabled={swapping || !sellAmt || !quote || loading}
          >
            {swapping ? '⟳ Signature...'
              : !sellAmt ? 'Entre un montant'
              : loading ? '⟳ Calcul...'
              : `Swap ${sellTok.symbol} → ${buyTok.symbol} ↗`}
          </button>
        )}

        {/* Fee info */}
        <div className={styles.feeNote}>
          Fee FXSEDGE {FEE_BPS/100}% · Collectée automatiquement on-chain ·
          Liquidité: Uniswap, Curve, Balancer +100 DEX
        </div>
      </div>

      {/* Token selector modal */}
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
                    setShowTokens(null)
                    setSellAmt(''); setQuote(null)
                  }}
                >
                  <img src={tok.logoURI} className={styles.tokLogo} alt="" onError={e=>e.target.style.display='none'}/>
                  <div>
                    <div className={styles.tokName}>{tok.symbol}</div>
                    <div className={styles.tokAddr}>{tok.address.slice(0,6)}…{tok.address.slice(-4)}</div>
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
