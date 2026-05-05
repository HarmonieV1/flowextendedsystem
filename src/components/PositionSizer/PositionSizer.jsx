import { useState, useEffect } from 'react'
import { useStore } from '../../store'
import { fmt, fmtPx, baseAsset } from '../../lib/format'
import styles from './PositionSizer.module.css'

export function PositionSizer() {
  const pair    = useStore(s => s.pair)
  const lastPx  = useStore(s => s.lastPx)
  const balance = useStore(s => s.balance) || 0

  const [portfolio,   setPortfolio]   = useState('10000')
  const [riskPct,     setRiskPct]     = useState('1')
  const [entry,       setEntry]       = useState('')
  const [stopLoss,    setStopLoss]    = useState('')
  const [takeProfit,  setTakeProfit]  = useState('')
  const [side,        setSide]        = useState('long')
  const [fee,         setFee]         = useState('0.1')

  // Sync price on load only
  useEffect(() => {
    if (lastPx > 0 && entry === '') setEntry(String(lastPx.toFixed(2)))
  }, [lastPx]) // eslint-disable-line

  const base    = baseAsset(pair)
  const port    = parseFloat(portfolio)  || 0
  const ePx     = parseFloat(entry)      || 0
  const slPx    = parseFloat(stopLoss)   || 0
  const tpPx    = parseFloat(takeProfit) || 0
  const risk    = parseFloat(riskPct)    || 1
  const feeF    = parseFloat(fee)        || 0.1

  const riskUSD = port * risk / 100
  const slDist  = (ePx > 0 && slPx > 0) ? Math.abs(ePx - slPx) : 0
  const qty     = slDist > 0 ? riskUSD / slDist : 0
  const posUSD  = qty * ePx
  const lev     = port > 0 && posUSD > 0 ? posUSD / port : 0
  const fees    = posUSD * feeF / 100 * 2
  const beven   = qty > 0 ? (side === 'long' ? ePx + fees/qty : ePx - fees/qty) : 0
  const tpDist  = (tpPx > 0 && ePx > 0) ? Math.abs(tpPx - ePx) : 0
  const profit  = qty > 0 && tpDist > 0 ? tpDist * qty - fees : 0
  const rr      = (riskUSD + fees) > 0 && profit > 0 ? profit / (riskUSD + fees) : 0

  const slOk = slPx > 0 && ePx > 0 && (side === 'long' ? slPx < ePx : slPx > ePx)
  const tpOk = tpPx === 0 || (ePx > 0 && (side === 'long' ? tpPx > ePx : tpPx < ePx))
  const ok   = port > 0 && ePx > 0 && slPx > 0 && slOk && qty > 0

  return (
    <div className={styles.page}>
      <div className={styles.pageHdr}>
        <div>
          <span className={styles.pageTitle}>📐 Position Sizer</span>
          <span className={styles.pageSub}>Calcul institutionnel du risque · {pair}</span>
        </div>
        {lastPx > 0 && (
          <div className={styles.livePx}>
            <span className={styles.liveDot} />
            <span>{fmtPx(lastPx)}</span>
          </div>
        )}
      </div>

      <div className={styles.layout}>
        {/* LEFT — inputs */}
        <div className={styles.inputs}>

          {/* Side */}
          <div className={styles.field}>
            <div className={styles.fieldLabel}>Direction</div>
            <div className={styles.sideRow}>
              <button
                className={styles.sideBtn + (side==='long' ? ' ' + styles.sideLong : '')}
                onClick={() => setSide('long')}
              >↑ Long</button>
              <button
                className={styles.sideBtn + (side==='short' ? ' ' + styles.sideShort : '')}
                onClick={() => setSide('short')}
              >↓ Short</button>
            </div>
          </div>

          {/* Portfolio */}
          <div className={styles.field}>
            <div className={styles.fieldLabel}>
              Portfolio ($)
              {balance > 0 && <span className={styles.fieldHint}>  Wallet détecté : ${fmt(balance)}</span>}
            </div>
            <input
              className={styles.input}
              type="number"
              value={portfolio}
              onChange={e => setPortfolio(e.target.value)}
              placeholder="10000"
            />
          </div>

          {/* Risk */}
          <div className={styles.field}>
            <div className={styles.fieldLabel}>Risque maximum par trade</div>
            <div className={styles.chipRow}>
              {['0.5','1','2','3'].map(v => (
                <button
                  key={v}
                  className={styles.chip + (riskPct===v ? ' ' + styles.chipActive : '')}
                  onClick={() => setRiskPct(v)}
                >{v}%</button>
              ))}
              <input
                className={styles.chipInput}
                type="number" step="0.1" min="0.1" max="10"
                value={riskPct}
                onChange={e => setRiskPct(e.target.value)}
                title="Risque personnalisé"
              />
              <span className={styles.chipInputSuffix}>%</span>
            </div>
            {port > 0 && (
              <div className={styles.fieldNote}>= ${fmt(port * risk / 100)} USD à risque</div>
            )}
          </div>

          {/* Entry */}
          <div className={styles.field}>
            <div className={styles.fieldLabel}>Prix d'entrée ({base})</div>
            <div className={styles.inputWithBtn}>
              <input
                className={styles.input}
                type="number"
                value={entry}
                onChange={e => setEntry(e.target.value)}
                placeholder={lastPx ? String(lastPx.toFixed(2)) : '0'}
              />
              {lastPx > 0 && (
                <button
                  className={styles.inlineBtn}
                  onClick={() => setEntry(String(lastPx.toFixed(2)))}
                >⟳ Last</button>
              )}
            </div>
          </div>

          {/* Stop Loss */}
          <div className={styles.field}>
            <div className={styles.fieldLabel}>
              Stop-Loss
              <span className={styles.fieldHint}>  {side==='long' ? '< prix d\'entrée' : '> prix d\'entrée'}</span>
              {slPx > 0 && !slOk && <span className={styles.fieldError}>  Direction incorrecte !</span>}
            </div>
            <input
              className={styles.input + (slPx > 0 && !slOk ? ' ' + styles.inputError : '')}
              type="number"
              value={stopLoss}
              onChange={e => setStopLoss(e.target.value)}
              placeholder={ePx > 0 ? String((side==='long' ? ePx*0.97 : ePx*1.03).toFixed(2)) : '0'}
            />
            {slPx > 0 && slOk && ePx > 0 && (
              <div className={styles.fieldNote}>{Math.abs((ePx-slPx)/ePx*100).toFixed(2)}% de distance</div>
            )}
          </div>

          {/* Take Profit */}
          <div className={styles.field}>
            <div className={styles.fieldLabel}>
              Take-Profit
              <span className={styles.fieldHint}>  optionnel · {side==='long' ? '> entrée' : '< entrée'}</span>
              {tpPx > 0 && !tpOk && <span className={styles.fieldError}>  Direction incorrecte !</span>}
            </div>
            <input
              className={styles.input + (tpPx > 0 && !tpOk ? ' ' + styles.inputError : '')}
              type="number"
              value={takeProfit}
              onChange={e => setTakeProfit(e.target.value)}
              placeholder={ePx > 0 ? String((side==='long' ? ePx*1.05 : ePx*0.95).toFixed(2)) : '0'}
            />
            {tpPx > 0 && tpOk && ePx > 0 && (
              <div className={styles.fieldNote}>{Math.abs((tpPx-ePx)/ePx*100).toFixed(2)}% de distance</div>
            )}
          </div>

          {/* Fee */}
          <div className={styles.field}>
            <div className={styles.fieldLabel}>Fee par trade</div>
            <div className={styles.chipRow}>
              {[['0.02','Maker'],['0.05','Mid'],['0.1','Taker']].map(([v,l]) => (
                <button
                  key={v}
                  className={styles.chip + (fee===v ? ' ' + styles.chipActive : '')}
                  onClick={() => setFee(v)}
                >{v}% <small>{l}</small></button>
              ))}
            </div>
          </div>

        </div>

        {/* RIGHT — result */}
        <div className={styles.result}>
          {ok ? (
            <>
              <div className={styles.resultMain}>
                <div className={styles.resultLabel}>TAILLE OPTIMALE</div>
                <div className={styles.resultQty}>
                  <span className={styles.resultBig}>{qty.toFixed(6)}</span>
                  <span className={styles.resultUnit}>{base}</span>
                </div>
                <div className={styles.resultUSD}>${fmt(posUSD)}</div>
              </div>

              <div className={styles.stats}>
                <Stat label="Capital risqué"   val={`$${fmt(riskUSD)}`} />
                <Stat label="Levier implicite"  val={`${lev.toFixed(1)}×`}
                  color={lev>10?'var(--red)':lev>5?'#f59e0b':'var(--grn)'} />
                <Stat label="Fees totaux"       val={`$${fmt(fees,3)}`} />
                <Stat label="Breakeven"         val={fmtPx(beven)} />
                {rr > 0 && (
                  <Stat label="Ratio R:R" val={`1 : ${rr.toFixed(2)}`}
                    color={rr>=2?'var(--grn)':rr>=1.5?'#f59e0b':'var(--red)'} wide />
                )}
                {profit > 0 && (
                  <Stat label="Profit potentiel" val={`$${fmt(profit)}`} color="var(--grn)" wide />
                )}
              </div>

              <div className={styles.warnings}>
                {lev > 10 && <Warn>⚠ Levier {lev.toFixed(1)}× élevé</Warn>}
                {rr > 0 && rr < 1.5 && <Warn>⚠ R:R de {rr.toFixed(2)} — visez minimum 1:2</Warn>}
                {slDist/ePx > 0.05 && <Warn>⚠ Stop large ({(slDist/ePx*100).toFixed(1)}%) = position réduite</Warn>}
              </div>
            </>
          ) : (
            <div className={styles.resultEmpty}>
              <div className={styles.resultEmptyIcon}>📐</div>
              <div className={styles.resultEmptyTitle}>Calcul en attente</div>
              <div className={styles.resultEmptyText}>
                Remplis les champs à gauche :<br />
                Portfolio → Entrée → Stop-Loss
              </div>
              <div className={styles.formula}>
                <div className={styles.formulaLine}>
                  <span>Quantité</span>
                  <span>=</span>
                  <span>Risque $ ÷ Distance SL</span>
                </div>
                <div className={styles.formulaLine}>
                  <span>Risque $</span>
                  <span>=</span>
                  <span>Portfolio × Risque %</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

const Stat = ({ label, val, color, wide }) => (
  <div className={styles.stat + (wide ? ' ' + styles.statWide : '')}>
    <span className={styles.statLabel}>{label}</span>
    <span className={styles.statVal} style={color ? {color} : {}}>{val}</span>
  </div>
)

const Warn = ({ children }) => (
  <div className={styles.warn}>{children}</div>
)
