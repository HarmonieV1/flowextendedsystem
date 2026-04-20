import { useState, useEffect, useCallback } from 'react'
import { useAccount, useChainId, useSendTransaction, useWaitForTransactionReceipt } from 'wagmi'
import { useStore } from '../../store'
import { fmt } from '../../lib/format'
import { FEE_BPS, FEE_RATIO } from '../../lib/config'
import { COMMON_TOKENS, NATIVE_TOKEN, getSwapQuote, toWei, fromWei } from '../../lib/zeroex'
import styles from './Swap.module.css'

export function Swap({ onOpenWallet }) {
  const { address, isConnected } = useAccount()
  const chainId = useChainId()
  const { sendTransactionAsync } = useSendTransaction()

  const lastPx = useStore(s => s.lastPx)

  const tokens = COMMON_TOKENS[chainId] || COMMON_TOKENS[1]
  const tokenList = Object.values(tokens)

  const [fromSym, setFromSym] = useState('ETH')
  const [toSym, setToSym] = useState('USDC')
  const [fromAmt, setFromAmt] = useState('')
  const [slippage, setSlippage] = useState('0.5')
  const [quote, setQuote] = useState(null)
  const [quoteLoading, setQuoteLoading] = useState(false)
  const [quoteError, setQuoteError] = useState(null)
  const [txHash, setTxHash] = useState(null)
  const [txStatus, setTxStatus] = useState(null)
  const [txError, setTxError] = useState(null)

  const { isLoading: txPending } = useWaitForTransactionReceipt({ hash: txHash })

  const fromToken = tokens[fromSym]
  const toToken = tokens[toSym]

  // Fetch quote — debounced 600ms
  useEffect(() => {
    if (!fromAmt || parseFloat(fromAmt) <= 0 || !fromToken || !toToken) {
      setQuote(null); setQuoteError(null); return
    }
    const t = setTimeout(async () => {
      setQuoteLoading(true); setQuoteError(null)
      try {
        const q = await getSwapQuote({
          chainId: chainId || 1,
          sellToken: fromToken.address,
          buyToken: toToken.address,
          sellAmount: toWei(fromAmt, fromToken.decimals),
          slippageBps: Math.round(parseFloat(slippage) * 100),
        })
        setQuote(q)
      } catch(e) {
        setQuoteError(e.message)
        setQuote(null)
      } finally {
        setQuoteLoading(false)
      }
    }, 600)
    return () => clearTimeout(t)
  }, [fromAmt, fromSym, toSym, slippage, chainId])

  // Execute swap
  const doSwap = useCallback(async () => {
    if (!isConnected) { onOpenWallet?.(); return }
    if (!quote) return
    setTxError(null); setTxStatus('swapping')
    try {
      const hash = await sendTransactionAsync({
        to: quote.to,
        data: quote.data,
        value: BigInt(quote.value || '0'),
        gas: quote.gas ? BigInt(quote.gas) : undefined,
      })
      setTxHash(hash)
      setTxStatus('success')
      setFromAmt(''); setQuote(null)
    } catch(e) {
      setTxStatus('error')
      setTxError(e.message?.includes('rejected') ? 'Transaction refusée par le wallet' : e.message)
    }
  }, [isConnected, quote, sendTransactionAsync, onOpenWallet])

  const flip = () => {
    setFromSym(toSym); setToSym(fromSym)
    setFromAmt(''); setQuote(null)
  }

  const toAmt = quote ? fromWei(quote.buyAmount, toToken?.decimals || 6) : ''
  const minReceived = quote ? fromWei(quote.guaranteedPrice
    ? (BigInt(quote.buyAmount) * BigInt(Math.floor((1 - parseFloat(slippage)/100) * 1000)) / BigInt(1000)).toString()
    : quote.buyAmount, toToken?.decimals || 6) : ''
  const priceImpact = quote?.estimatedPriceImpact
  const gasUSD = quote?.estimatedGas && lastPx
    ? `~$${fmt(parseInt(quote.estimatedGas) * 20e-9 * lastPx, 2)}`
    : null
  const fxsFee = fromAmt ? parseFloat(fromAmt) * FEE_RATIO : 0
  const sources = quote?.sources?.filter(s => parseFloat(s.proportion) > 0).slice(0, 4) || []

  const canSwap = isConnected && quote && !quoteLoading && !txPending && txStatus !== 'swapping'

  return (
    <div className={styles.wrap}>
      <div className={styles.inner}>

        {/* Header */}
        <div className={styles.chainRow}>
          <span className={styles.chainDot} />
          <span className={styles.chainLabel}>
            {chainId === 8453 ? 'Base' : chainId === 42161 ? 'Arbitrum' : 'Ethereum'} · 0x Protocol
          </span>
          <span className={styles.feeTag}>FXS {FEE_BPS / 100}%</span>
        </div>

        {/* From */}
        <div className={styles.tokenBox}>
          <div className={styles.boxTop}>
            <span className={styles.boxLabel}>VOUS PAYEZ</span>
            <span className={styles.boxBal}>Balance: — {fromSym}</span>
          </div>
          <div className={styles.boxRow}>
            <input
              className={styles.amtInput}
              type="number"
              placeholder="0.0"
              value={fromAmt}
              onChange={e => setFromAmt(e.target.value)}
            />
            <select className={styles.tokenSel} value={fromSym} onChange={e => setFromSym(e.target.value)}>
              {tokenList.map(t => <option key={t.symbol} value={t.symbol}>{t.symbol}</option>)}
            </select>
          </div>
          {fromAmt && lastPx && (
            <span className={styles.usdEst}>≈ ${fmt(parseFloat(fromAmt) * (fromSym === 'ETH' ? lastPx : 1))}</span>
          )}
        </div>

        {/* Flip */}
        <div className={styles.flipRow}>
          <button className={styles.flipBtn} onClick={flip}>⇅</button>
        </div>

        {/* To */}
        <div className={styles.tokenBox}>
          <div className={styles.boxTop}>
            <span className={styles.boxLabel}>VOUS RECEVEZ</span>
            <span className={styles.boxBal}>Balance: — {toSym}</span>
          </div>
          <div className={styles.boxRow}>
            <div className={styles.toAmt}>
              {quoteLoading
                ? <span className={styles.loading}>Recherche meilleur prix...</span>
                : toAmt
                  ? <span>{toAmt}</span>
                  : <span className={styles.placeholder}>0.0</span>}
            </div>
            <select className={styles.tokenSel} value={toSym} onChange={e => setToSym(e.target.value)}>
              {tokenList.map(t => <option key={t.symbol} value={t.symbol}>{t.symbol}</option>)}
            </select>
          </div>
        </div>

        {/* Error */}
        {quoteError && (
          <div className={styles.errorBox}>⚠ {quoteError}</div>
        )}

        {/* Slippage */}
        <div className={styles.slipRow}>
          <span className={styles.slipLabel}>Slippage</span>
          <div className={styles.slipBtns}>
            {['0.1','0.5','1.0'].map(v => (
              <button key={v} className={`${styles.slipBtn} ${slippage===v?styles.slipOn:''}`} onClick={()=>setSlippage(v)}>{v}%</button>
            ))}
            <input className={styles.slipCustom} type="number" value={slippage} step="0.1" onChange={e=>setSlippage(e.target.value)} />
          </div>
        </div>

        {/* Quote details */}
        {quote && (
          <div className={styles.quoteBox}>
            <div className={styles.quoteRow}>
              <span>Taux</span>
              <span>1 {fromSym} = {fromAmt ? fmt(parseFloat(toAmt)/parseFloat(fromAmt), 4) : '—'} {toSym}</span>
            </div>
            {priceImpact && (
              <div className={styles.quoteRow}>
                <span>Price impact</span>
                <span style={{color: parseFloat(priceImpact) > 1 ? 'var(--red)' : 'var(--grn)'}}>
                  {parseFloat(priceImpact) > 0 ? '+' : ''}{parseFloat(priceImpact).toFixed(3)}%
                </span>
              </div>
            )}
            <div className={styles.quoteRow}>
              <span>Min reçu</span>
              <span>{minReceived} {toSym}</span>
            </div>
            {gasUSD && <div className={styles.quoteRow}><span>Gas estimé</span><span>{gasUSD}</span></div>}
            <div className={styles.quoteRow}>
              <span>FXS fee ({FEE_BPS/100}%)</span>
              <span style={{color:'var(--grn)'}}>{fxsFee.toFixed(6)} {fromSym}</span>
            </div>
          </div>
        )}

        {/* Route sources */}
        {sources.length > 0 && (
          <div className={styles.routeBox}>
            <span className={styles.routeTitle}>ROUTE OPTIMALE</span>
            <div className={styles.routePills}>
              <span className={styles.routePill}>{fromSym}</span>
              <span className={styles.routeArrow}>→</span>
              {sources.map(s => (
                <span key={s.name} className={styles.routePill} style={{color:'var(--grn)',borderColor:'rgba(0,229,160,.3)'}}>
                  {s.name} {Math.round(parseFloat(s.proportion)*100)}%
                </span>
              ))}
              <span className={styles.routeArrow}>→</span>
              <span className={styles.routePill}>{toSym}</span>
            </div>
          </div>
        )}

        {/* TX status */}
        {txStatus === 'swapping' && (
          <div className={styles.statusBox}>
            <div className={styles.spinner} />
            Swap en cours — signe dans ton wallet...
          </div>
        )}
        {txStatus === 'success' && (
          <div className={styles.statusBox} style={{color:'var(--grn)',borderColor:'rgba(0,229,160,.3)'}}>
            ✓ Swap exécuté {txHash && (
              <a href={`https://etherscan.io/tx/${txHash}`} target="_blank" rel="noreferrer" style={{color:'var(--grn)',marginLeft:6}}>
                Etherscan ↗
              </a>
            )}
          </div>
        )}
        {txStatus === 'error' && (
          <div className={styles.statusBox} style={{color:'var(--red)',borderColor:'rgba(255,59,92,.3)'}}>
            ✗ {txError}
          </div>
        )}

        {/* CTA */}
        <button
          className={styles.swapBtn}
          disabled={isConnected && !canSwap}
          onClick={doSwap}
        >
          {!isConnected ? 'Connect Wallet'
            : quoteLoading ? 'Recherche meilleur prix...'
            : quoteError ? 'Quote indisponible'
            : !fromAmt ? 'Entre un montant'
            : !quote ? 'Chargement...'
            : txStatus === 'swapping' ? 'Confirmation en cours...'
            : `Swap ${fromSym} → ${toSym}`}
        </button>

        {/* Transparency */}
        <div className={styles.transBox}>
          <span className={styles.transTitle}>● TRANSPARENCE</span>
          <div className={styles.transRow}><span>Aggregateur</span><span>0x Protocol</span></div>
          <div className={styles.transRow}><span>Inscription requise</span><span style={{color:'var(--grn)'}}>Aucune ✓</span></div>
          <div className={styles.transRow}><span>Custody des fonds</span><span style={{color:'var(--grn)'}}>Non-custodial ✓</span></div>
          <div className={styles.transRow}><span>Frais cachés</span><span style={{color:'var(--grn)'}}>0 ✓</span></div>
          <div className={styles.transRow}><span>FXS fee</span><span>{FEE_BPS/100}% → treasury FXS on-chain</span></div>
        </div>
      </div>
    </div>
  )
}
