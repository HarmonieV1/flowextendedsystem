import { useState, useEffect, useCallback } from 'react'
import { useStore } from '../../store'
import { fmtPx, fmt } from '../../lib/format'
import { hasApiKeys, spotPlaceOrder, spotGetBalance, spotGetOrders, spotGetHistory, loadApiKeysAsync } from '../../lib/bitunix'
import styles from './Spot.module.css'
import { logSilent } from '../../lib/errorMonitor'

export function Spot({ onOpenWallet }) {
  const pair   = useStore(s => s.pair)
  const lastPx = useStore(s => s.lastPx)
  const base   = pair.replace('USDT','')

  const [keyed, setKeyed]   = useState(false)
  const [tab, setTab]       = useState('trade')
  const [side, setSide]     = useState('buy')
  const [orderType, setOT]  = useState('market')
  const [amount, setAmount] = useState('')
  const [price, setPrice]   = useState('')
  const [submitting, setSub]= useState(false)
  const [ok, setOk]         = useState('')
  const [err, setErr]       = useState('')
  const [balances, setBal]  = useState([])
  const [orders, setOrders] = useState([])
  const [history, setHist]  = useState([])
  const [fallbackPx, setFbPx] = useState(0)

  // Fallback: fetch price from REST if WS not ready
  useEffect(() => {
    if (lastPx > 0 || !pair) return
    const fetchPx = async () => {
      try {
        const r = await fetch(`https://api.binance.com/api/v3/ticker/price?symbol=${pair}`, {signal: AbortSignal.timeout(3000)})
        const d = await r.json()
        if (d?.price) setFbPx(parseFloat(d.price))
      } catch(e){logSilent(e,'Spot')}
    }
    fetchPx()
    const t = setInterval(fetchPx, 5000)
    return () => clearInterval(t)
  }, [pair, lastPx])

  const px = lastPx > 0 ? lastPx : fallbackPx

  useEffect(() => {
    let cancelled = false
    loadApiKeysAsync().catch(() => null).then(() => {
      if (!cancelled) setKeyed(hasApiKeys())
    })
    const h = () => { setKeyed(hasApiKeys()); if(hasApiKeys()) loadBal() }
    window.addEventListener('fxs:keysUpdated', h)
    return () => { cancelled = true; window.removeEventListener('fxs:keysUpdated', h) }
  }, [])

  const loadBal = useCallback(async () => {
    try { const d = await spotGetBalance(); setBal(Array.isArray(d)?d:[]) } catch(e){logSilent(e,'Spot')}
  }, [])

  const loadOrders = useCallback(async () => {
    try { const d = await spotGetOrders(pair); setOrders(Array.isArray(d)?d:d?.data||[]) } catch(_) { setOrders([]) }
  }, [pair])

  const loadHistory = useCallback(async () => {
    try { const d = await spotGetHistory(pair); setHist(Array.isArray(d)?d:d?.data||[]) } catch(_) { setHist([]) }
  }, [pair])

  useEffect(() => { if (keyed) loadBal() }, [keyed])
  useEffect(() => {
    if (!keyed) return
    if (tab === 'orders') loadOrders()
    if (tab === 'history') loadHistory()
  }, [keyed, tab])

  useEffect(() => {
    if (!keyed || tab !== 'orders') return
    const iv = setInterval(loadOrders, 10000)
    return () => clearInterval(iv)
  }, [keyed, tab, loadOrders])

  const usdtBal = balances.find(b=>b.coin==='USDT')?.available || null
  const baseBal = balances.find(b=>b.coin===base)?.available || null

  // Doc Bitunix:
  // Market order: volume = base coin qty (ex: 0.001 BTC)
  // Limit order: volume = quote coin qty pour buy (USDT), base pour sell
  const computeVolume = () => {
    const amt = parseFloat(amount)
    if (!amt || amt <= 0) return null
    if (orderType === 'market') {
      if (side === 'buy') {
        if (!px || px <= 0) return null  // prix pas encore chargé
        return (amt / px).toFixed(8)
      }
      return String(amt)
    } else {
      return String(amt)
    }
  }

  const handleTrade = async () => {
    setErr(''); setOk('')
    if (!amount || parseFloat(amount) <= 0) { setErr('Entre un montant'); return }
    if (orderType === "market" && side === "buy" && (!px || px <= 0)) {
      setErr('Prix du marché non disponible — attends quelques secondes')
      return
    }
    if (orderType === 'limit' && (!price || parseFloat(price) <= 0)) {
      setErr('Entre un prix limite')
      return
    }
    const vol = computeVolume()
    if (!vol || parseFloat(vol) <= 0) { setErr('Volume calculé invalide'); return }
    setSub(true)
    try {
      const orderPrice = orderType === 'limit' && price ? String(parseFloat(price)) : "0"
      await spotPlaceOrder({
        symbol: pair,
        side:   side === 'buy' ? 'BUY' : 'SELL',
        qty:    vol,
        price:  orderPrice,
        orderType: orderType === 'limit' ? 'LIMIT' : 'MARKET',
      })
      setOk(`✓ ${side==='buy'?'Achat':'Vente'} ${base} confirmé`)
      // Sound + flash
      try {
        const ctx = new (window.AudioContext || window.webkitAudioContext)()
        const osc = ctx.createOscillator(); const gain = ctx.createGain()
        osc.connect(gain); gain.connect(ctx.destination); osc.type='sine'
        osc.frequency.setValueAtTime(side==='buy'?600:900, ctx.currentTime)
        osc.frequency.linearRampToValueAtTime(side==='buy'?900:600, ctx.currentTime+0.15)
        gain.gain.setValueAtTime(0.12, ctx.currentTime)
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime+0.3)
        osc.start(ctx.currentTime); osc.stop(ctx.currentTime+0.3)
        setTimeout(()=>ctx.close(),500)
      } catch(e){logSilent(e,'Spot')}
      const flash=document.createElement('div')
      flash.style.cssText=`position:fixed;inset:0;z-index:9999;pointer-events:none;background:${side==='buy'?'rgba(140,198,63,0.08)':'rgba(255,59,92,0.08)'};animation:fxsFlash .4s ease-out forwards;`
      document.body.appendChild(flash); setTimeout(()=>flash.remove(),500)
      if(!document.getElementById('fxs-flash-style')){const s=document.createElement('style');s.id='fxs-flash-style';s.textContent='@keyframes fxsFlash{0%{opacity:1}100%{opacity:0}}';document.head.appendChild(s)}
      setAmount('')
      setTimeout(()=>{ setOk(''); loadBal() }, 3000)
    } catch(e) {
      logSilent(e, 'Spot.handleTrade')
      const msg = e.message || 'Erreur inconnue'
      // Show more detail for common Bitunix errors
      if (msg.includes('10007') || msg.includes('balance')) setErr('Solde insuffisant')
      else if (msg.includes('10001') || msg.includes('param')) setErr('Paramètre invalide — vérifier le montant minimum')
      else if (msg.includes('sign') || msg.includes('401')) setErr('Erreur signature — reconnecte tes clés API')
      else setErr(msg)
    }
    setSub(false)
  }

  const estimateQty = () => {
    if (!amount) return ''
    const amt = parseFloat(amount)
    if (!amt || amt <= 0) return ''
    if (side === 'buy') {
      const epx = orderType === "limit" && price ? parseFloat(price) : px
      return epx > 0 ? (amt / epx).toFixed(6) : ''
    }
    return ''
  }

  if (!keyed) return (
    <div className={styles.wrap}>
      <div className={styles.header}>
        <span className={styles.title}>⚡ Bitunix Spot</span>
        <span className={styles.tag}>CEX · Ref FXSA</span>
      </div>
      <div className={styles.noKey}>
        <div className={styles.noKeyIcon}>⚙️</div>
        <div className={styles.noKeyTitle}>Connecte ton compte Bitunix</div>
        <div className={styles.noKeyText}>Entre ta clé API Bitunix pour acheter et vendre directement depuis FXSEDGE.</div>
        <button className={styles.noKeyBtn} onClick={()=>window.dispatchEvent(new CustomEvent('fxs:openApiKey'))}>
          Connecter Bitunix →
        </button>
      </div>
    </div>
  )

  return (
    <div className={styles.wrap}>
      <div className={styles.header}>
        <div>
          <span className={styles.title}>⚡ Bitunix Spot</span>
          <span className={styles.tag}>{base}/USDT · Ref FXSA</span>
        </div>
        {px>0&&<span className={styles.price}>{fmtPx(px)}</span>}
      </div>

      <div className={styles.navRow}>
        {['trade','orders','history'].map(t=>(
          <button key={t} className={`${styles.navBtn} ${tab===t?styles.navOn:''}`} onClick={()=>setTab(t)}>
            {t==='trade'?'Trade':t==='orders'?'Ordres':'Historique'}
          </button>
        ))}
      </div>

      <div className={styles.body}>
        {tab === 'trade' && <>
          {(usdtBal||baseBal) && (
            <div className={styles.balRow}>
              {usdtBal&&<span>💵 {fmt(usdtBal,2)} USDT</span>}
              {baseBal&&<span>{base}: {fmt(baseBal,6)}</span>}
              <button className={styles.refreshBtn} onClick={loadBal}>↻</button>
            </div>
          )}

          <div className={styles.tabRow}>
            <button className={`${styles.tab} ${side==='buy'?styles.tabBuy:''}`} onClick={()=>setSide('buy')}>Acheter</button>
            <button className={`${styles.tab} ${side==='sell'?styles.tabSell:''}`} onClick={()=>setSide('sell')}>Vendre</button>
          </div>

          <div className={styles.typeRow}>
            <button className={`${styles.typeBtn} ${orderType==='market'?styles.typeOn:''}`} onClick={()=>setOT('market')}>Market</button>
            <button className={`${styles.typeBtn} ${orderType==='limit'?styles.typeOn:''}`} onClick={()=>setOT('limit')}>Limite</button>
          </div>

          {orderType==='limit'&&(
            <div className={styles.field}>
              <label className={styles.label}>Prix <button className={styles.lastBtn} onClick={()=>setPrice(px.toString())}>Last</button></label>
              <div className={styles.inputWrap}>
                <input className={styles.input} type="number" value={price} onChange={e=>setPrice(e.target.value)} placeholder="0.00"/>
                <span className={styles.unit}>USDT</span>
              </div>
            </div>
          )}

          <div className={styles.field}>
            <label className={styles.label}>
              {side==='buy'?'Montant':'Quantité'}
              {side==='buy'&&usdtBal&&<button className={styles.lastBtn} onClick={()=>setAmount(usdtBal)}>Max</button>}
              {side==='sell'&&baseBal&&<button className={styles.lastBtn} onClick={()=>setAmount(baseBal)}>Max</button>}
            </label>
            <div className={styles.inputWrap}>
              <input className={styles.input} type="number" value={amount} onChange={e=>setAmount(e.target.value)} placeholder="0"/>
              <span className={styles.unit}>{side==='buy'?'USDT':base}</span>
            </div>
            {estimateQty() && <div className={styles.hint}>≈ {estimateQty()} {base}</div>}
          </div>

          {side==='buy'&&usdtBal&&(
            <div className={styles.pctRow}>
              {[25,50,75,100].map(p=>(
                <button key={p} className={styles.pctBtn} onClick={()=>setAmount((usdtBal*p/100).toFixed(2))}>{p}%</button>
              ))}
            </div>
          )}
          {side==='sell'&&baseBal&&(
            <div className={styles.pctRow}>
              {[25,50,75,100].map(p=>(
                <button key={p} className={styles.pctBtn} onClick={()=>setAmount((baseBal*p/100).toFixed(8))}>{p}%</button>
              ))}
            </div>
          )}

          {err&&<div className={styles.errBox}>{err} <button onClick={()=>setErr('')}>✕</button></div>}
          {ok&&<div className={styles.okBox}>{ok}</div>}

          <button
            className={`${styles.cta} ${side==='buy'?styles.ctaBuy:styles.ctaSell}`}
            onClick={handleTrade}
            disabled={submitting}
          >
            {submitting ? '⟳ Envoi...' : side==='buy' ? `↑ Acheter ${base}` : `↓ Vendre ${base}`}
          </button>

          <div className={styles.footer}>Bitunix Spot · Ref FXSA · Tes fonds dans ton compte</div>
        </>}

        {tab === 'orders' && (
          <div className={styles.listWrap}>
            <div className={styles.listHeader}>
              <span>Ordres en cours</span>
              <button className={styles.refreshBtn} onClick={loadOrders}>↻</button>
            </div>
            {orders.length === 0 ? (
              <div className={styles.empty}>Aucun ordre en cours</div>
            ) : orders.map((o,i) => (
              <div key={o.orderId||i} className={styles.orderCard}>
                <div className={styles.orderTop}>
                  <span className={String(o.side)==='2' ? styles.tagBuy : styles.tagSell}>
                    {String(o.side)==='2'?'BUY':'SELL'}
                  </span>
                  <span className={styles.orderPair}>{o.symbol}</span>
                  <span className={styles.orderType}>{String(o.type)==='1'?'Limit':'Market'}</span>
                </div>
                <div className={styles.orderDetails}>
                  <span>Prix: {o.price||'—'}</span>
                  <span>Vol: {o.volume||o.leftVolume||'—'}</span>
                </div>
              </div>
            ))}
          </div>
        )}

        {tab === 'history' && (
          <div className={styles.listWrap}>
            <div className={styles.listHeader}>
              <span>Historique</span>
              <button className={styles.refreshBtn} onClick={loadHistory}>↻</button>
            </div>
            {history.length === 0 ? (
              <div className={styles.empty}>Aucun trade récent</div>
            ) : history.map((o,i) => (
              <div key={o.orderId||i} className={styles.orderCard}>
                <div className={styles.orderTop}>
                  <span className={String(o.side)==='2' ? styles.tagBuy : styles.tagSell}>
                    {String(o.side)==='2'?'BUY':'SELL'}
                  </span>
                  <span className={styles.orderPair}>{o.symbol}</span>
                  <span className={styles.orderType}>{String(o.type)==='1'?'Limit':'Market'}</span>
                </div>
                <div className={styles.orderDetails}>
                  <span>Prix: {o.avgPrice||o.price||'—'}</span>
                  <span>Vol: {o.dealVolume||o.volume||'—'}</span>
                  <span>Fee: {o.fee||'—'}</span>
                  <span className={
                    o.status==='2'?styles.statusFilled:
                    o.status==='4'?styles.statusCancelled:''
                  }>
                    {o.status==='2'?'✓ Rempli':o.status==='4'?'✕ Annulé':o.status==='3'?'◐ Partiel':o.status}
                  </span>
                </div>
                {o.ctime && <div className={styles.orderTime}>{new Date(o.ctime).toLocaleString()}</div>}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
