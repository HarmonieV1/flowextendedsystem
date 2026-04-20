import { useState, useCallback } from 'react'
import { useAccount, useChainId, useSendTransaction, useSwitchChain } from 'wagmi'
import { parseUnits, encodeFunctionData } from 'viem'
import { useStore } from '../../store'
import { fmt, fmtPx } from '../../lib/format'
import { GMX_CONTRACTS, GMX_TOKENS, GMX_REFERRAL_CODE, EXCHANGE_ROUTER_ABI, ORDER_TYPES, calcLiquidationPrice, calcFundingFee, MIN_LEVERAGE, MAX_LEVERAGE } from '../../lib/gmx'
import styles from './Futures.module.css'

const LEVERAGE_PRESETS = [2,5,10,20,50,100]
const COLLATERAL_TOKEN = 'USDC'

export function Futures({ onOpenWallet }) {
  const { address, isConnected } = useAccount()
  const chainId = useChainId()
  const { sendTransactionAsync } = useSendTransaction()
  const { switchChain } = useSwitchChain()

  const lastPx = useStore(s => s.lastPx)
  const pair = useStore(s => s.pair)
  const balance = useStore(s => s.balance)

  const [side, setSide] = useState('long')
  const [leverage, setLeverage] = useState(10)
  const [margin, setMargin] = useState('')
  const [otype, setOtype] = useState('market')
  const [limitPx, setLimitPx] = useState('')
  const [tpsl, setTpsl] = useState(false)
  const [tp, setTp] = useState('')
  const [sl, setSl] = useState('')
  const [txStatus, setTxStatus] = useState(null)
  const [txError, setTxError] = useState(null)
  const [txHash, setTxHash] = useState(null)

  const entryPx = otype === 'market' ? lastPx : (parseFloat(limitPx) || lastPx)
  const marginAmt = parseFloat(margin) || 0
  const positionUSD = marginAmt * leverage
  const liqPx = calcLiquidationPrice({ entryPrice: entryPx, leverage, side })
  const fundingFee8h = calcFundingFee({ positionSizeUSD: positionUSD })
  const openFee = positionUSD * 0.001 // GMX ~0.1% open fee
  const executionFeeETH = 0.0002 // ETH needed for keeper
  const executionFeeUSD = executionFeeETH * (lastPx || 3000)
  const totalCostUSD = openFee + executionFeeUSD
  const isArbitrum = chainId === 42161

  const baseToken = pair.replace('USDT','')
  const marketToken = GMX_TOKENS[baseToken]
  const collateralToken = GMX_TOKENS[COLLATERAL_TOKEN]
  const contracts = GMX_CONTRACTS[42161]

  // ── Switch to Arbitrum if needed ──
  const ensureArbitrum = useCallback(async () => {
    if (!isArbitrum) {
      await switchChain({ chainId: 42161 })
      return false
    }
    return true
  }, [isArbitrum, switchChain])

  // ── Open GMX position ──
  const openPosition = useCallback(async () => {
    if (!isConnected) { onOpenWallet?.(); return }
    if (!marginAmt || !entryPx) return

    const onArbitrum = await ensureArbitrum()
    if (!onArbitrum) return

    if (!marketToken || !collateralToken) {
      setTxStatus('error')
      setTxError(`Paire ${baseToken} non supportée sur GMX`)
      return
    }

    setTxStatus('pending')
    setTxError(null)

    try {
      const marginWei = parseUnits(margin, collateralToken.decimals)
      const sizeWei = parseUnits(positionUSD.toFixed(2), 30) // GMX uses 30 decimals for USD
      const acceptablePrice = BigInt(Math.floor(
        side === 'long'
          ? entryPx * 1.003 * 1e12  // +0.3% slippage for long
          : entryPx * 0.997 * 1e12  // -0.3% slippage for short
      ))
      const executionFee = parseUnits('0.001', 18) // ~0.001 ETH execution fee

      const calldata = encodeFunctionData({
        abi: EXCHANGE_ROUTER_ABI,
        functionName: 'createOrder',
        args: [{
          addresses: {
            receiver: address,
            callbackContract: '0x0000000000000000000000000000000000000000',
            uiFeeReceiver: '0x0000000000000000000000000000000000000000',
            market: marketToken.address,
            initialCollateralToken: collateralToken.address,
            swapPath: [],
          },
          numbers: {
            sizeDeltaUsd: sizeWei,
            initialCollateralDeltaAmount: marginWei,
            triggerPrice: 0n,
            acceptablePrice,
            executionFee,
            callbackGasLimit: 0n,
            minOutputAmount: 0n,
          },
          orderType: BigInt(otype === 'market' ? ORDER_TYPES.MarketIncrease : ORDER_TYPES.LimitIncrease),
          decreasePositionSwapType: 0n,
          isLong: side === 'long',
          shouldUnwrapNativeToken: false,
          referralCode: GMX_REFERRAL_CODE,
        }],
      })

      const hash = await sendTransactionAsync({
        to: contracts.ExchangeRouter,
        data: calldata,
        value: executionFee,
      })

      setTxHash(hash)
      setTxStatus('success')
      setMargin('')

    } catch(e) {
      setTxStatus('error')
      setTxError(
        e.message?.includes('rejected') ? 'Transaction refusée'
        : e.message?.includes('insufficient') ? 'Fonds insuffisants'
        : e.message || 'Erreur inconnue'
      )
    }
  }, [isConnected, marginAmt, entryPx, side, leverage, otype, margin, address, marketToken, collateralToken, positionUSD, contracts, ensureArbitrum, sendTransactionAsync, onOpenWallet])

  return (
    <div className={styles.wrap}>
      {/* Stats bar */}
      <div className={styles.statsBar}>
        <StatItem label="Mark Price" val={fmtPx(lastPx)} />
        <StatItem label="Funding 8h" val={`${(0.01).toFixed(4)}%`} />
        <StatItem label="Open Interest" val="$2.4B" />
        <StatItem label="Max Leverage" val="100×" />
      </div>

      {/* Chain warning */}
      {isConnected && !isArbitrum && (
        <div className={styles.chainWarn}>
          <span>⚠ GMX nécessite Arbitrum</span>
          <button className={styles.switchBtn} onClick={() => switchChain({ chainId: 42161 })}>
            Switch vers Arbitrum
          </button>
        </div>
      )}

      <div className={styles.formWrap}>
        {/* Long / Short */}
        <div className={styles.sideTog}>
          <button className={`${styles.sBtn} ${styles.long} ${side==='long'?styles.on:''}`} onClick={()=>setSide('long')}>Long ↑</button>
          <button className={`${styles.sBtn} ${styles.short} ${side==='short'?styles.on:''}`} onClick={()=>setSide('short')}>Short ↓</button>
        </div>

        {/* Order type */}
        <div className={styles.typeRow}>
          <button className={`${styles.tBtn} ${otype==='market'?styles.tOn:''}`} onClick={()=>setOtype('market')}>Market</button>
          <button className={`${styles.tBtn} ${otype==='limit'?styles.tOn:''}`} onClick={()=>setOtype('limit')}>Limit</button>
        </div>

        {/* Limit price */}
        {otype === 'limit' && (
          <div className={styles.fGrp}>
            <div className={styles.fLbl}>
              <span>Prix limite</span>
              <button className={styles.lastBtn} onClick={()=>setLimitPx(lastPx.toFixed(2))}>Last</button>
            </div>
            <div className={styles.fWrap}>
              <input className={styles.fIn} type="number" placeholder={fmtPx(lastPx)} value={limitPx} onChange={e=>setLimitPx(e.target.value)} />
              <span className={styles.fUnit}>USD</span>
            </div>
          </div>
        )}

        {/* Collateral (margin) */}
        <div className={styles.fGrp}>
          <div className={styles.fLbl}>
            <span>Collatéral (USDC)</span>
            <span style={{color:'var(--grn)'}}>Dispo: ${fmt(balance)}</span>
          </div>
          <div className={styles.fWrap}>
            <input className={styles.fIn} type="number" placeholder="0.00" value={margin} onChange={e=>setMargin(e.target.value)} />
            <span className={styles.fUnit}>USDC</span>
          </div>
        </div>

        {/* Leverage slider */}
        <div className={styles.levBlock}>
          <div className={styles.levTop}>
            <span className={styles.levLbl}>Levier</span>
            <span className={styles.levVal}>{leverage}×</span>
          </div>
          <input
            className={styles.levSlider}
            type="range" min="1" max="100" value={leverage} step="1"
            style={{background:`linear-gradient(to right,var(--${side==='long'?'grn':'red'}) ${leverage}%,var(--bg4) ${leverage}%)`}}
            onChange={e=>setLeverage(parseInt(e.target.value))}
          />
          <div className={styles.levPresets}>
            {LEVERAGE_PRESETS.map(l=>(
              <button key={l} className={`${styles.levBtn} ${leverage===l?styles.levOn:''}`} onClick={()=>setLeverage(l)}>{l}×</button>
            ))}
          </div>
        </div>

        {/* TP/SL */}
        <button className={`${styles.tpslToggle} ${tpsl?styles.tpslOn:''}`} onClick={()=>setTpsl(!tpsl)}>
          TP / SL {tpsl?'▲':'▼'}
        </button>
        {tpsl && (
          <div className={styles.tpslGrid}>
            <div className={styles.tpslField}>
              <span className={styles.tpslLbl} style={{color:'var(--grn)'}}>TP</span>
              <input className={styles.tpslIn} type="number" placeholder="0.00" value={tp} onChange={e=>setTp(e.target.value)} />
            </div>
            <div className={styles.tpslField}>
              <span className={styles.tpslLbl} style={{color:'var(--red)'}}>SL</span>
              <input className={styles.tpslIn} type="number" placeholder="0.00" value={sl} onChange={e=>setSl(e.target.value)} />
            </div>
          </div>
        )}

        {/* Order summary */}
        <div className={styles.summary}>
          <div className={styles.sumRow}><span>Taille position</span><span>${fmt(positionUSD)}</span></div>
          <div className={styles.sumRow}><span>Prix d'entrée</span><span>{otype==='market'?'Market':fmtPx(parseFloat(limitPx)||0)}</span></div>
          <div className={styles.sumRow}>
            <span>Prix liquidation</span>
            <span style={{color:'var(--red)'}}>{marginAmt>0?fmtPx(liqPx):'—'}</span>
          </div>
          <div className={styles.sumRow}><span>Funding fee 8h</span><span>${fmt(fundingFee8h,4)}</span></div>
          <div className={styles.sumRow}><span>Frais d'ouverture (0.1%)</span><span>${fmt(openFee,4)}</span></div>
          <div className={styles.sumRow}>
            <span>Execution fee (ETH requis)</span>
            <span style={{color:'#f59e0b'}}>{executionFeeETH} ETH (~${fmt(executionFeeUSD,2)})</span>
          </div>
          <div className={styles.sumRow} style={{borderTop:'1px solid var(--brd)',paddingTop:4,marginTop:2}}>
            <span style={{color:'var(--txt2)',fontWeight:600}}>Coût total estimé</span>
            <span style={{color:'var(--txt)',fontWeight:700}}>${fmt(totalCostUSD,2)}</span>
          </div>
        </div>

        {/* TX Status */}
        {txStatus === 'pending' && (
          <div className={styles.statusBox}>
            <div className={styles.spinner}/> Ouverture de position sur GMX...
          </div>
        )}
        {txStatus === 'success' && (
          <div className={styles.statusBox} style={{color:'var(--grn)',borderColor:'rgba(0,229,160,.3)'}}>
            ✓ Position ouverte {txHash && (
              <a href={`https://arbiscan.io/tx/${txHash}`} target="_blank" rel="noreferrer" style={{color:'var(--grn)',marginLeft:4}}>
                Arbiscan ↗
              </a>
            )}
          </div>
        )}
        {txStatus === 'error' && (
          <div className={styles.statusBox} style={{color:'var(--red)',borderColor:'rgba(255,59,92,.3)'}}>
            ✗ {txError}
          </div>
        )}

        {/* Submit */}
        <button
          className={`${styles.subBtn} ${side==='long'?styles.long:styles.short}`}
          disabled={isConnected && (!marginAmt || txStatus==='pending')}
          onClick={openPosition}
        >
          {!isConnected ? 'Connect Wallet'
            : !isArbitrum ? 'Switch vers Arbitrum'
            : !marginAmt ? 'Entre un collatéral'
            : txStatus === 'pending' ? 'Confirmation...'
            : `${side==='long'?'Long':'Short'} ${pair.replace('USDT','/USDT')} ${leverage}×`}
        </button>

        {/* ETH warning */}
        {isConnected && isArbitrum && marginAmt > 0 && (
          <div className={styles.ethWarn}>
            <span>⚠</span>
            <span>Tu as besoin de <strong>{executionFeeETH} ETH</strong> (~${fmt(executionFeeUSD,2)}) sur Arbitrum en plus du collatéral pour payer les frais d'exécution.</span>
          </div>
        )}

        {/* GMX info */}
        <div className={styles.gmxInfo}>
          <span className={styles.gmxDot}/> GMX v2 · Arbitrum · Non-custodial
          {GMX_REFERRAL_CODE && <span className={styles.refTag}>Referral FXS actif</span>}
        </div>
      </div>

      {/* Open positions placeholder */}
      <div className={styles.posSection}>
        <div className={styles.posHdr}>
          <span>Positions ouvertes</span>
          <span style={{fontSize:9,color:'var(--txt3)'}}>via GMX v2</span>
        </div>
        <div className={styles.posEmpty}>Aucune position — les positions GMX s'afficheront ici</div>
      </div>
    </div>
  )
}

const StatItem = ({label, val}) => (
  <div className={styles.statItem}>
    <span className={styles.statL}>{label}</span>
    <span className={styles.statV}>{val}</span>
  </div>
)
