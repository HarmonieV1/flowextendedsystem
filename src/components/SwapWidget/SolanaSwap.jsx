// FXSEDGE — Solana Swap (Jupiter Aggregator)
// Sister component to SwapWidget — handles Solana-only flow
import { useState, useEffect, useCallback, useRef } from 'react'
import {
  SOL_TOKENS, FXS_FEE_BPS,
  getPhantom, isPhantomInstalled, connectPhantom, disconnectPhantom, getConnectedAddress,
  getJupiterQuote, getJupiterSwapTx, signAndSendTransaction,
  fmtSolAmount, toSolBaseUnits,
} from '../../lib/solana'
import { logSilent } from '../../lib/errorMonitor'
import styles from './SwapWidget.module.css'

export function SolanaSwap() {
  const [solAddress, setSolAddress] = useState(getConnectedAddress())
  const [sellTok, setSellTok] = useState(SOL_TOKENS[0])
  const [buyTok, setBuyTok] = useState(SOL_TOKENS[1])
  const [sellAmt, setSellAmt] = useState('')
  const [quote, setQuote] = useState(null)
  const [loading, setLoading] = useState(false)
  const [swapping, setSwapping] = useState(false)
  const [txSig, setTxSig] = useState(null)
  const [error, setError] = useState(null)
  const debRef = useRef(null)

  const phantomReady = isPhantomInstalled()

  // Listen for Phantom account changes
  useEffect(() => {
    const phantom = getPhantom()
    if (!phantom) return
    const onChange = () => setSolAddress(getConnectedAddress())
    phantom.on?.('connect', onChange)
    phantom.on?.('disconnect', onChange)
    phantom.on?.('accountChanged', onChange)
    return () => {
      phantom.off?.('connect', onChange)
      phantom.off?.('disconnect', onChange)
      phantom.off?.('accountChanged', onChange)
    }
  }, [])

  // Fetch quote with debounce
  const fetchQuote = useCallback(async (amt, sell, buy) => {
    if (!amt || isNaN(+amt) || +amt <= 0) { setQuote(null); return }
    setLoading(true); setError(null)
    try {
      const amount = toSolBaseUnits(amt, sell.decimals).toString()
      if (amount === '0') { setLoading(false); return }
      const q = await getJupiterQuote({
        inputMint: sell.address,
        outputMint: buy.address,
        amount,
      })
      setQuote(q)
    } catch (e) {
      logSilent(e, 'SolanaSwap.fetchQuote')
      setError(e.message)
      setQuote(null)
    }
    setLoading(false)
  }, [])

  useEffect(() => {
    clearTimeout(debRef.current)
    if (!sellAmt) { setQuote(null); return }
    debRef.current = setTimeout(() => fetchQuote(sellAmt, sellTok, buyTok), 600)
    return () => clearTimeout(debRef.current)
  }, [sellAmt, sellTok, buyTok, fetchQuote])

  const handleConnect = async () => {
    setError(null)
    try {
      const addr = await connectPhantom()
      setSolAddress(addr)
    } catch (e) { setError(e.message) }
  }

  const handleSwap = async () => {
    if (!solAddress) { handleConnect(); return }
    if (!quote) return
    setSwapping(true); setError(null); setTxSig(null)
    try {
      const swapData = await getJupiterSwapTx({ quote, userPublicKey: solAddress })
      const sig = await signAndSendTransaction(swapData.swapTransaction)
      setTxSig(sig)
      setSellAmt(''); setQuote(null)
    } catch (e) {
      logSilent(e, 'SolanaSwap.handleSwap')
      setError(e.message)
    }
    setSwapping(false)
  }

  const flip = () => {
    setSellTok(buyTok); setBuyTok(sellTok); setSellAmt(''); setQuote(null)
  }

  const buyAmt = quote ? fmtSolAmount(quote.outAmount, buyTok.decimals) : null
  const priceImpact = quote?.priceImpactPct ? parseFloat(quote.priceImpactPct) : null
  const routeSteps = quote?.routePlan?.length || 0

  return (
    <div className={styles.wrap}>

      <div className={styles.header}>
        <span className={styles.title}>⚡ Swap Solana</span>
        <div className={styles.chainRow}>
          <span className={styles.chainBtn + ' ' + styles.chainOn} style={{cursor:'default',background:'rgba(153,69,255,.1)',borderColor:'rgba(153,69,255,.3)',color:'#9945ff'}}>
            ◈ Solana
          </span>
        </div>
      </div>

      {!phantomReady && (
        <div style={{padding:14,margin:'10px 14px',background:'rgba(153,69,255,.05)',border:'1px solid rgba(153,69,255,.2)',borderRadius:8,fontSize:11,color:'var(--txt2)',textAlign:'center'}}>
          <div style={{fontSize:24,marginBottom:8}}>👻</div>
          <div style={{color:'var(--txt)',fontWeight:700,marginBottom:4}}>Phantom requis</div>
          <div style={{marginBottom:10}}>Installe Phantom pour swapper sur Solana</div>
          <a href="https://phantom.app/" target="_blank" rel="noreferrer"
            style={{display:'inline-block',padding:'8px 16px',background:'#9945ff',color:'#fff',borderRadius:6,fontWeight:700,textDecoration:'none',fontSize:11}}>
            Installer Phantom →
          </a>
        </div>
      )}

      {phantomReady && !solAddress && (
        <div style={{padding:'14px 14px 0'}}>
          <button onClick={handleConnect}
            style={{width:'100%',padding:12,background:'#9945ff',color:'#fff',border:'none',borderRadius:8,fontWeight:800,fontSize:13,cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',gap:8}}>
            <span>👻</span> Connecter Phantom
          </button>
        </div>
      )}

      {phantomReady && solAddress && (
        <div className={styles.form}>
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'4px 0',marginBottom:8,fontSize:10,color:'var(--txt3)'}}>
            <span>👻 {solAddress.slice(0,4)}...{solAddress.slice(-4)}</span>
            <button onClick={() => { disconnectPhantom(); setSolAddress(null) }}
              style={{background:'transparent',border:'none',color:'var(--txt3)',cursor:'pointer',fontSize:10}}>
              Déconnecter
            </button>
          </div>

          {/* Sell */}
          <div className={styles.box}>
            <div className={styles.boxTop}>
              <span className={styles.boxLbl}>Tu vends</span>
            </div>
            <div className={styles.boxRow}>
              <input type="number" value={sellAmt} onChange={e=>setSellAmt(e.target.value)} placeholder="0.0" className={styles.boxIn}/>
              <select value={sellTok.symbol} onChange={e=>{setSellTok(SOL_TOKENS.find(t=>t.symbol===e.target.value)); setSellAmt('')}}
                style={{background:'var(--bg2)',border:'1px solid var(--brd)',borderRadius:6,padding:'6px 10px',color:'var(--txt)',fontWeight:700,fontSize:13,cursor:'pointer'}}>
                {SOL_TOKENS.map(t => <option key={t.symbol} value={t.symbol}>{t.symbol}</option>)}
              </select>
            </div>
          </div>

          <button onClick={flip}
            style={{margin:'-8px auto',background:'var(--bg2)',border:'1px solid var(--brd)',width:32,height:32,borderRadius:8,cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',color:'var(--txt)',zIndex:1,position:'relative'}}>
            ↕
          </button>

          {/* Buy */}
          <div className={styles.box}>
            <div className={styles.boxTop}>
              <span className={styles.boxLbl}>Tu reçois</span>
            </div>
            <div className={styles.boxRow}>
              <input type="text" value={buyAmt || ''} readOnly placeholder={loading ? 'Calcul...' : '0.0'} className={styles.boxIn} style={{cursor:'default'}}/>
              <select value={buyTok.symbol} onChange={e=>setBuyTok(SOL_TOKENS.find(t=>t.symbol===e.target.value))}
                style={{background:'var(--bg2)',border:'1px solid var(--brd)',borderRadius:6,padding:'6px 10px',color:'var(--txt)',fontWeight:700,fontSize:13,cursor:'pointer'}}>
                {SOL_TOKENS.map(t => <option key={t.symbol} value={t.symbol}>{t.symbol}</option>)}
              </select>
            </div>
          </div>

          {quote && (
            <div style={{padding:'10px 12px',background:'var(--bg2)',borderRadius:8,fontSize:11,color:'var(--txt2)',display:'flex',flexDirection:'column',gap:4}}>
              <div style={{display:'flex',justifyContent:'space-between'}}>
                <span>Route Jupiter</span><span>{routeSteps} hop{routeSteps>1?'s':''}</span>
              </div>
              {priceImpact !== null && (
                <div style={{display:'flex',justifyContent:'space-between'}}>
                  <span>Impact prix</span>
                  <span style={{color:Math.abs(priceImpact)>3?'var(--red)':Math.abs(priceImpact)>1?'#f59e0b':'var(--grn)'}}>
                    {priceImpact.toFixed(3)}%
                  </span>
                </div>
              )}
              <div style={{display:'flex',justifyContent:'space-between'}}>
                <span>Frais FXSEDGE</span><span>{(FXS_FEE_BPS/100).toFixed(2)}%</span>
              </div>
            </div>
          )}

          {error && (
            <div style={{padding:10,background:'rgba(255,59,92,.08)',border:'1px solid rgba(255,59,92,.2)',borderRadius:6,color:'var(--red)',fontSize:11}}>
              ⚠ {error}
            </div>
          )}

          {txSig && (
            <div style={{padding:10,background:'rgba(140,198,63,.08)',border:'1px solid rgba(140,198,63,.2)',borderRadius:6,color:'var(--grn)',fontSize:11}}>
              ✓ Swap exécuté · <a href={`https://solscan.io/tx/${txSig}`} target="_blank" rel="noreferrer" style={{color:'var(--grn)'}}>Voir sur Solscan ↗</a>
            </div>
          )}

          <button onClick={handleSwap} disabled={!quote || swapping || loading}
            style={{padding:14,background:quote && !swapping ? '#9945ff' : 'var(--bg3)',color:quote && !swapping ? '#fff' : 'var(--txt3)',border:'none',borderRadius:8,fontWeight:800,fontSize:13,cursor:quote && !swapping ? 'pointer' : 'not-allowed'}}>
            {swapping ? '⟳ Envoi...' : loading ? 'Calcul...' : !quote ? 'Entre un montant' : `Swap ${sellTok.symbol} → ${buyTok.symbol}`}
          </button>

          <div style={{fontSize:9,color:'var(--txt3)',textAlign:'center'}}>
            ⚡ via Jupiter Aggregator · 0.5% fee FXSEDGE · Non-custodial
          </div>
        </div>
      )}
    </div>
  )
}
