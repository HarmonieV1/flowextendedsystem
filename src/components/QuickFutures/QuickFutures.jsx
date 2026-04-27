import { useState } from 'react'
import { useAccount, useChainId, useSendTransaction, useSwitchChain, useReadContract, useWriteContract } from 'wagmi'
import { parseUnits, encodeFunctionData, erc20Abi, formatUnits, getAddress } from 'viem'
import { useStore } from '../../store'
import { fmt, fmtPx } from '../../lib/format'
import { GMX_CONTRACTS, GMX_MARKETS, GMX_TOKENS, GMX_REFERRAL_CODE, EXCHANGE_ROUTER_ABI, ORDER_TYPES, calcLiquidationPrice } from '../../lib/gmx'
import styles from './QuickFutures.module.css'

const ARB = 42161
const USDC_ADDR = GMX_TOKENS.USDC.address
const ORDER_VAULT = GMX_CONTRACTS[42161].OrderVault
const EX_ROUTER = GMX_CONTRACTS[42161].ExchangeRouter
const LEVERAGES = [2, 5, 10, 20, 50]
const COLLATERALS = [10, 25, 50, 100]

export function QuickFutures({ onOpenWallet }) {
  const { address, isConnected } = useAccount()
  const chainId = useChainId()
  const { sendTransactionAsync } = useSendTransaction()
  const { switchChainAsync } = useSwitchChain()
  const { writeContractAsync } = useWriteContract()
  const lastPx = useStore(s => s.lastPx)
  const pair   = useStore(s => s.pair)

  const [side, setSide]         = useState('long')
  const [leverage, setLeverage] = useState(10)
  const [collateral, setCol]    = useState(null)
  const [status, setStatus]     = useState(null)
  const [errMsg, setErrMsg]     = useState('')

  const isArb     = chainId === ARB
  const base      = pair.replace('USDT','')
  const marketAddr = GMX_MARKETS[base]
  const posUSD    = (collateral || 0) * leverage
  const EXEC_FEE  = parseUnits('0.0002', 18)

  const { data: usdcRaw } = useReadContract({
    address: USDC_ADDR, abi: erc20Abi, functionName: 'balanceOf',
    args: [address], chainId: ARB,
    query: { enabled: !!address && isArb, refetchInterval: 15000 },
  })
  const usdcBal = usdcRaw ? parseFloat(formatUnits(usdcRaw, 6)) : 0

  const { data: allowRaw, refetch: refetchAllow } = useReadContract({
    address: USDC_ADDR, abi: erc20Abi, functionName: 'allowance',
    args: [address, ORDER_VAULT], chainId: ARB,
    query: { enabled: !!address && isArb },
  })
  const allowance = allowRaw ? parseFloat(formatUnits(allowRaw, 6)) : 0
  const needApprove = isArb && !!collateral && allowance < collateral

  const handleApprove = async () => {
    setStatus('approving')
    try {
      await writeContractAsync({ address: USDC_ADDR, abi: erc20Abi, functionName: 'approve', args: [ORDER_VAULT, BigInt('999999000000')], chainId: ARB })
      setTimeout(() => refetchAllow(), 3000)
      setStatus(null)
    } catch(e) { setStatus('error'); setErrMsg('Annulé') }
  }

  const handleTrade = async () => {
    if (!isConnected) { onOpenWallet?.(); return }
    if (!collateral) { setErrMsg('Choisis un montant'); return }
    if (!marketAddr) { setErrMsg(base + ' non dispo sur GMX'); return }
    if (!isArb) {
      try { await switchChainAsync({ chainId: ARB }); return }
      catch(e) { setErrMsg('Switch Arbitrum annulé'); return }
    }
    if (needApprove) { setErrMsg('Approuve USDC d\'abord'); return }

    setStatus('pending'); setErrMsg('')
    try {
      const safeAddr  = getAddress(address)
      const marginWei = parseUnits(collateral.toString(), 6)
      const sizeWei   = BigInt(Math.floor(posUSD)) * (10n ** 30n)
      const slip      = side === 'long' ? 1.01 : 0.99
      const accPrice  = BigInt(Math.floor(lastPx * slip * 1e12))

      const d1 = encodeFunctionData({ abi: EXCHANGE_ROUTER_ABI, functionName: 'sendWnt',    args: [ORDER_VAULT, EXEC_FEE] })
      const d2 = encodeFunctionData({ abi: EXCHANGE_ROUTER_ABI, functionName: 'sendTokens', args: [USDC_ADDR, ORDER_VAULT, marginWei] })
      const d3 = encodeFunctionData({
        abi: EXCHANGE_ROUTER_ABI, functionName: 'createOrder',
        args: [{ addresses: { receiver: safeAddr, callbackContract:'0x0000000000000000000000000000000000000000', uiFeeReceiver:'0x0000000000000000000000000000000000000000', market: marketAddr, initialCollateralToken: USDC_ADDR, swapPath:[] }, numbers: { sizeDeltaUsd: sizeWei, initialCollateralDeltaAmount: marginWei, triggerPrice: 0n, acceptablePrice: accPrice, executionFee: EXEC_FEE, callbackGasLimit: 0n, minOutputAmount: 0n }, orderType: BigInt(ORDER_TYPES.MarketIncrease), decreasePositionSwapType: 0n, isLong: side==='long', shouldUnwrapNativeToken: false, referralCode: GMX_REFERRAL_CODE }],
      })
      const calldata = encodeFunctionData({ abi: EXCHANGE_ROUTER_ABI, functionName: 'multicall', args: [[d1, d2, d3]] })
      await sendTransactionAsync({ to: EX_ROUTER, data: calldata, value: EXEC_FEE, chainId: ARB })
      setStatus('done'); setCol(null)
      setTimeout(() => setStatus(null), 3000)
    } catch(e) {
      setStatus('error')
      const m = e.shortMessage || e.message || ''
      setErrMsg(m.includes('reject') ? 'Annulé' : m.includes('insufficient') ? 'ETH insuffisant' : 'Erreur GMX')
      setTimeout(() => setStatus(null), 4000)
    }
  }

  if (!isConnected) return (
    <div className={styles.wrap}>
      <div className={styles.center}>
        <div className={styles.icon}>⚡</div>
        <div className={styles.title}>Futures GMX v2</div>
        <div className={styles.sub}>Connecte ton wallet pour trader</div>
        <button className={styles.connectBtn} onClick={onOpenWallet}>Connecter Wallet</button>
      </div>
    </div>
  )

  return (
    <div className={styles.wrap}>
      {/* Long / Short */}
      <div className={styles.sides}>
        <button className={styles.sideBtn + ' ' + styles.long + (side==='long'?' '+styles.on:'')} onClick={()=>setSide('long')}>Long ↑</button>
        <button className={styles.sideBtn + ' ' + styles.short + (side==='short'?' '+styles.on:'')} onClick={()=>setSide('short')}>Short ↓</button>
      </div>

      <div className={styles.body}>
        {/* Network warning */}
        {!isArb && (
          <button className={styles.switchBtn} onClick={() => switchChainAsync({ chainId: ARB })}>
            ⚠ Switch vers Arbitrum
          </button>
        )}

        {/* Stats row */}
        <div className={styles.statsRow}>
          <div className={styles.statBox}>
            <span className={styles.statL}>Mark</span>
            <span className={styles.statV}>{fmtPx(lastPx)}</span>
          </div>
          <div className={styles.statBox}>
            <span className={styles.statL}>USDC</span>
            <span className={styles.statV} style={{color: usdcBal > 0 ? 'var(--grn)' : 'var(--txt3)'}}>
              {isArb ? '$' + fmt(usdcBal) : '—'}
            </span>
          </div>
        </div>

        {/* Leverage */}
        <div className={styles.section}>
          <div className={styles.sectionLbl}>Levier</div>
          <div className={styles.leverageGrid}>
            {LEVERAGES.map(l => (
              <button key={l} className={styles.levBtn + (leverage===l?' '+styles.levOn:'')} onClick={()=>setLeverage(l)}>{l}×</button>
            ))}
          </div>
        </div>

        {/* Collateral */}
        <div className={styles.section}>
          <div className={styles.sectionLbl}>Collatéral USDC</div>
          <div className={styles.colGrid}>
            {COLLATERALS.map(c => (
              <button key={c} className={styles.colBtn + (collateral===c?' '+styles.colOn:'')} onClick={()=>setCol(c)}>
                ${c}
              </button>
            ))}
          </div>
        </div>

        {/* Summary */}
        {collateral && (
          <div className={styles.summary}>
            <div className={styles.sumRow}><span>Position</span><strong>${fmt(posUSD)}</strong></div>
            <div className={styles.sumRow}><span>Liquidation</span><strong style={{color:'var(--red)'}}>{fmtPx(calcLiquidationPrice({entryPrice:lastPx,leverage,side}))}</strong></div>
            <div className={styles.sumRow}><span>Exec fee</span><strong style={{color:'#f59e0b'}}>0.0002 ETH</strong></div>
          </div>
        )}

        {errMsg && <div className={styles.errBox}>⚠ {errMsg}</div>}
        {status==='done' && <div className={styles.okBox}>✓ Ordre envoyé à GMX</div>}

        {needApprove && (
          <button className={styles.approveBtn} onClick={handleApprove} disabled={status==='approving'}>
            {status==='approving' ? '⟳...' : 'Approuver USDC'}
          </button>
        )}
      </div>

      <button
        className={styles.execBtn + ' ' + (side==='long' ? styles.execLong : styles.execShort)}
        onClick={handleTrade}
        disabled={status==='pending' || status==='approving'}
      >
        {status==='pending' ? '⟳ Envoi...' : !isArb ? 'Switch Arbitrum' : (side==='long'?'Long ':'Short ') + base + ' ' + leverage + '×'}
      </button>
    </div>
  )
}
