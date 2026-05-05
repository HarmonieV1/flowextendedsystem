import { useState, useRef, useCallback } from 'react'
import { useStore } from '../../store'
import { fmt, fmtPx, baseAsset } from '../../lib/format'
import { useBitunixTrade } from '../../hooks/useBitunixTrade'
import styles from './OrderForm.module.css'

const ORDER_TYPES = [
  { id:'MARKET',       label:'Market'    },
  { id:'LIMIT',        label:'Limit'     },
  { id:'STOP_LOSS_LIMIT', label:'Stop'   },
  { id:'LIMIT_MAKER',  label:'Post-Only' },
]
const TIF_OPTIONS = ['GTC','IOC','FOK']

// Fee rates
const FXS_TAKER  = 0.001
const FXS_MAKER  = 0.0002
const BIN_TAKER  = 0.001
const BYBIT_TAKER = 0.001
const OKX_TAKER  = 0.0008

export function OrderForm({ onOpenWallet, onConnectBinance }) {
  const side    = useStore(s => s.side)
  const setSide = useStore(s => s.setSide)
  const pair    = useStore(s => s.pair)
  const lastPx  = useStore(s => s.lastPx)
  const connected = useStore(s => s.connected)
  const balance = useStore(s => s.balance)

  const { apiConnected, balances: rawBalances = [], loading, executeOrder } = useBitunixTrade()

  const [otype,    setOtype]    = useState('MARKET')
  const [amount,   setAmount]   = useState('')
  const [price,    setPrice]    = useState('')
  const [stopPx,   setStopPx]   = useState('')
  const [tif,      setTif]      = useState('GTC')
  const [sizePct,  setSizePct]  = useState(0)
  const [tpsl,     setTpsl]     = useState(false)
  const [tp,       setTp]       = useState('')
  const [sl,       setSl]       = useState('')
  const [orderStatus, setOrderStatus] = useState(null)
  const [orderError,  setOrderError]  = useState(null)
  const [lastOrder,   setLastOrder]   = useState(null)

  const base    = baseAsset(pair)
  const isMarket = otype === 'MARKET'
  const needsPrice = !isMarket
  const needsStop  = otype === 'STOP_LOSS_LIMIT'

  const execPx   = isMarket ? lastPx : (parseFloat(price) || lastPx)
  const amt      = parseFloat(amount) || 0
  const slip     = isMarket ? 0.05 : 0
  const execFinal = side === 'buy' ? execPx*(1+slip/100) : execPx*(1-slip/100)
  const cost     = execFinal * amt
  const myFeeRate = otype === 'LIMIT_MAKER' ? FXS_MAKER : FXS_TAKER
  const fee      = cost * myFeeRate

  const binanceBal  = rawBalances.find?.(b => b.sym === base)
  const binanceUSDT = rawBalances.find?.(b => b.sym === 'USDT')
  const availBal    = apiConnected
    ? (side === 'buy' ? (binanceUSDT?.free || 0) : (binanceBal?.free || 0))
    : (balance || 0)

  const feeCompare = [
    { label:'FXS',    rate: myFeeRate,   me: true },
    { label:'Binance',rate: BIN_TAKER,   me: false },
    { label:'Bybit',  rate: BYBIT_TAKER, me: false },
    { label:'OKX',    rate: OKX_TAKER,   me: false },
  ]
  const maxRate = Math.max(...feeCompare.map(f => f.rate))

  const onSlider = useCallback((val) => {
    const pct = parseInt(val)
    setSizePct(pct)
    if (!execPx || !availBal) return
    setAmount(((availBal * pct / 100) / execPx).toFixed(6))
  }, [execPx, availBal])

  const syncSlider = useCallback((v) => {
    const a = parseFloat(v) || 0
    if (!execPx || !availBal) return
    setSizePct(Math.min(100, Math.round((a * execPx) / availBal * 100)))
  }, [execPx, availBal])

  const handleSubmit = async () => {
    if (!connected)   { onOpenWallet?.();    return }
    if (!apiConnected){ onConnectBinance?.(); return }
    if (!amt) return

    setOrderStatus('pending'); setOrderError(null)
    try {
      const result = await executeOrder({
        side: side === 'buy' ? 'BUY' : 'SELL',
        type: otype,
        quantity: amount,
        price: needsPrice ? price : undefined,
        timeInForce: needsPrice ? tif : undefined,
      })
      setLastOrder(result)
      setOrderStatus('filled')
      setAmount(''); setSizePct(0)
    } catch(e) {
      setOrderStatus('error')
      setOrderError(e.message)
    }
  }

  const portPct = availBal > 0 ? (cost / availBal * 100) : 0
  const riskCls = portPct > 75 ? styles.danger : portPct > 50 ? styles.warn : ''

  return (
    <div className={styles.wrap}>

      {/* Bitunix connection banner */}
      {!apiConnected && (
        <div className={styles.apiBanner}>
          <span>Connecte Bitunix pour trader</span>
          <button className={styles.apiBtn} onClick={onConnectBinance}>Connecter →</button>
        </div>
      )}
      {apiConnected && (
        <div className={styles.apiOk}>
          <span className={styles.apiDot}/><span>Bitunix</span>
          <span className={styles.apiAvail}>
            {side==='buy'?`$${fmt(binanceUSDT?.free||0)} USDT`:`${fmt(binanceBal?.free||0,6)} ${base}`}
          </span>
        </div>
      )}

      {/* Buy / Sell */}
      <div className={styles.sideTog}>
        <button className={`${styles.sBtn} ${styles.buyBtn} ${side==='buy'?styles.sOn:''}`}  onClick={()=>setSide('buy')}>Buy</button>
        <button className={`${styles.sBtn} ${styles.sellBtn} ${side==='sell'?styles.sOn:''}`} onClick={()=>setSide('sell')}>Sell</button>
      </div>

      {/* Order types */}
      <div className={styles.typeRow}>
        {ORDER_TYPES.map(t => (
          <button key={t.id} className={`${styles.tBtn} ${otype===t.id?styles.tOn:''}`} onClick={()=>setOtype(t.id)}>{t.label}</button>
        ))}
      </div>

      {/* TIF */}
      {needsPrice && (
        <div className={styles.tifRow}>
          {TIF_OPTIONS.map(t => <button key={t} className={`${styles.tifBtn} ${tif===t?styles.tifOn:''}`} onClick={()=>setTif(t)}>{t}</button>)}
        </div>
      )}

      {/* Stop price */}
      {needsStop && (
        <div className={styles.fGrp}>
          <div className={styles.fLbl}><span>Stop Price</span></div>
          <div className={styles.fWrap}>
            <input className={styles.fIn} type="number" placeholder={fmtPx(lastPx)} value={stopPx} onChange={e=>setStopPx(e.target.value)}/>
            <span className={styles.fUnit}>USDT</span>
          </div>
        </div>
      )}

      {/* Limit price */}
      {needsPrice && (
        <div className={styles.fGrp}>
          <div className={styles.fLbl}>
            <span>Prix</span>
            <button className={styles.lastBtn} onClick={()=>setPrice(lastPx.toFixed(2))}>Last</button>
          </div>
          <div className={styles.fWrap}>
            <input className={styles.fIn} type="number" placeholder={fmtPx(lastPx)} value={price} onChange={e=>setPrice(e.target.value)}/>
            <span className={styles.fUnit}>USDT</span>
          </div>
        </div>
      )}

      {/* Amount */}
      <div className={styles.fGrp}>
        <div className={styles.fLbl}>
          <span>Quantité ({base})</span>
          <span style={{color:'var(--grn)',fontSize:9}}>{amt&&execPx?'≈ $'+fmt(amt*execPx):'≈ $0'}</span>
        </div>
        <div className={styles.fWrap}>
          <input className={styles.fIn} type="number" placeholder="0.00000" step="0.00001"
            value={amount} onChange={e=>{setAmount(e.target.value);syncSlider(e.target.value)}}/>
          <span className={styles.fUnit}>{base}</span>
        </div>
      </div>

      {/* Slider */}
      <div className={styles.sizingBlock}>
        <div className={styles.sizingTop}>
          <span className={styles.sizingLbl}>Position</span>
          <span className={styles.sizingPct}>{sizePct}%</span>
        </div>
        <input className={styles.slider} type="range" min="0" max="100" value={sizePct} step="1"
          style={{background:`linear-gradient(to right,var(--${side==='buy'?'grn':'red'}) ${sizePct}%,var(--bg4) ${sizePct}%)`}}
          onChange={e=>onSlider(e.target.value)}/>
        <div className={styles.pctRow}>
          {[10,25,50,75,100].map(p=>(
            <button key={p} className={`${styles.pctBtn} ${sizePct===p?styles.pctOn:''}`} onClick={()=>onSlider(p)}>
              {p===100?'Max':`${p}%`}
            </button>
          ))}
        </div>
      </div>

      {/* TP/SL */}
      <button className={`${styles.tpslToggle} ${tpsl?styles.tpslOn:''}`} onClick={()=>setTpsl(!tpsl)}>TP/SL</button>
      {tpsl && (
        <div className={styles.tpslGrid}>
          <div className={styles.tpslField}>
            <span style={{color:'var(--grn)',fontSize:9,fontWeight:700}}>TP</span>
            <input className={styles.tpslIn} type="number" placeholder="0.00" value={tp} onChange={e=>setTp(e.target.value)}/>
          </div>
          <div className={styles.tpslField}>
            <span style={{color:'var(--red)',fontSize:9,fontWeight:700}}>SL</span>
            <input className={styles.tpslIn} type="number" placeholder="0.00" value={sl} onChange={e=>setSl(e.target.value)}/>
          </div>
        </div>
      )}

      {/* Execution preview */}
      <div className={styles.slip}>
        <div className={styles.slipRows}>
          <SlipRow label="Prix d'exécution" val={amt?fmtPx(execFinal):'—'}/>
          <SlipRow label="Slippage estimé"  val={slip>0?slip.toFixed(2)+'%':'0%'}/>
          <SlipRow label={otype==='LIMIT_MAKER'?'Fee maker 0.02%':'Fee taker 0.1%'} val={amt?'$'+fmt(fee,4):'—'}/>
          <div className={styles.slipSep}/>
          <SlipRow label="Coût total" val={amt?'$'+fmt(cost):'—'}/>
        </div>
        <div className={styles.slipTotal}>
          <span>Tu {side==='buy'?'reçois':'dépenses'}</span>
          <span className={styles.slipAcc}>{amt?(side==='buy'?amt.toFixed(6)+' '+base:'$'+fmt(cost-fee)):'—'}</span>
        </div>
      </div>

      {/* Risk row */}
      <div className={styles.riskRow}>
        <RiskItem label="Capital"   val={cost>0?'$'+fmt(cost):'$0'}/>
        <RiskItem label="% Dispo"   val={portPct.toFixed(1)+'%'} cls={riskCls}/>
        <RiskItem label="Fee"       val={fee>0?'$'+fmt(fee,3):'$0'}/>
        <RiskItem label="P&L 1%"   val={cost>0?'$'+fmt(cost*0.01):'$0'}/>
      </div>

      {/* Fee transparency */}
      <div className={styles.feeBox}>
        <div className={styles.feeHdr}>
          <span className={styles.feeTitle}>⚡ Fee Transparency</span>
          {amt>0&&cost>0&&<span className={styles.feeSave}>
            vs Binance: économise ${fmt((BIN_TAKER-myFeeRate)*cost,4)}
          </span>}
        </div>
        {feeCompare.map(f=>(
          <div key={f.label} className={styles.feeBarRow}>
            <span className={styles.feeBarLabel}>{f.label}</span>
            <div className={styles.feeBarTrack}>
              <div className={`${styles.feeBarFill} ${f.me?styles.feeBarMe:''}`}
                style={{width:`${(f.rate/maxRate)*100}%`}}/>
            </div>
            <span className={`${styles.feeBarAmt} ${f.me?styles.feeBarAmtMe:''}`}>
              {(f.rate*100).toFixed(2)}%{amt&&cost?` =$${fmt(f.rate*cost,4)}`:''}
            </span>
          </div>
        ))}
      </div>

      {/* Status */}
      {orderStatus==='pending' && <div className={styles.statusBox}><div className={styles.spinner}/>Envoi sur Bitunix...</div>}
      {orderStatus==='filled'  && <div className={styles.statusBox} style={{color:'var(--grn)',borderColor:'rgba(140,198,63,.3)'}}>✓ Ordre #{lastOrder?.orderId} — {lastOrder?.status}</div>}
      {orderStatus==='error'   && <div className={styles.statusBox} style={{color:'var(--red)',borderColor:'rgba(255,59,92,.3)'}}>✗ {orderError}</div>}

      {/* Submit */}
      <button
        className={`${styles.subBtn} ${side==='buy'?styles.subBuy:styles.subSell}`}
        disabled={(connected&&apiConnected&&!amt)||loading||orderStatus==='pending'}
        onClick={handleSubmit}
      >
        {loading||orderStatus==='pending' ? 'Envoi...'
          : !connected  ? 'Connect Wallet'
          : !apiConnected ? 'Connecter Bitunix'
          : !amt ? 'Entre un montant'
          : `${side==='buy'?'Acheter':'Vendre'} ${base}${!isMarket?' · '+fmtPx(parseFloat(price)||lastPx):' · Market'}`}
      </button>

      {/* Available */}
      <div className={styles.availRow}>
        <span>Disponible</span>
        <span>{apiConnected
          ? side==='buy'?`${fmt(binanceUSDT?.free||0)} USDT`:`${fmt(binanceBal?.free||0,6)} ${base}`
          : connected?`$${fmt(balance)} USDT`:'—'}</span>
      </div>
    </div>
  )
}

const SlipRow = ({label,val}) => (
  <div style={{display:'flex',justifyContent:'space-between'}}>
    <span style={{fontSize:10,color:'var(--txt3)'}}>{label}</span>
    <span style={{fontSize:10,fontWeight:600,color:'var(--txt)'}}>{val}</span>
  </div>
)
const RiskItem = ({label,val,cls}) => (
  <div style={{display:'flex',flexDirection:'column',alignItems:'center',gap:2}}>
    <span style={{fontSize:8,color:'var(--txt3)',textTransform:'uppercase',letterSpacing:'.4px'}}>{label}</span>
    <span className={cls} style={{fontSize:10,fontWeight:600,color:'var(--txt)'}}>{val}</span>
  </div>
)
