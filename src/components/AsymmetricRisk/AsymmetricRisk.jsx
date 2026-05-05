// FXSEDGE — Asymmetric Risk Scanner
// Scans pairs and finds setups where R:R is naturally favorable
// Method: detect recent support/resistance from klines, calculate distance ratio

import { useState, useEffect, useCallback } from 'react'
import { useStore } from '../../store'
import { fmtPx } from '../../lib/format'
import { logSilent } from '../../lib/errorMonitor'
import styles from './AsymmetricRisk.module.css'

const PAIRS = [
  'BTCUSDT', 'ETHUSDT', 'SOLUSDT', 'BNBUSDT', 'XRPUSDT', 'ADAUSDT',
  'AVAXUSDT', 'DOGEUSDT', 'TRXUSDT', 'DOTUSDT', 'LINKUSDT', 'MATICUSDT',
  'ARBUSDT', 'OPUSDT', 'NEARUSDT', 'APTUSDT', 'SUIUSDT', 'INJUSDT',
  'TIAUSDT', 'SEIUSDT', 'JUPUSDT', 'PYTHUSDT', 'STXUSDT', 'AAVEUSDT',
  'UNIUSDT', 'LDOUSDT', 'PENDLEUSDT', 'RNDRUSDT', 'FILUSDT', 'ATOMUSDT',
]

// Detect recent support and resistance from klines
// Method: find pivot lows (support) and pivot highs (resistance) in last N candles
function findPivots(klines, lookback = 5) {
  const highs = klines.map(k => parseFloat(k[2]))
  const lows  = klines.map(k => parseFloat(k[3]))
  const closes = klines.map(k => parseFloat(k[4]))

  let supportLevels = []
  let resistanceLevels = []

  for (let i = lookback; i < klines.length - lookback; i++) {
    // Pivot high: higher than `lookback` candles before AND after
    const isHigh = highs.slice(i - lookback, i).every(h => h <= highs[i]) &&
                   highs.slice(i + 1, i + 1 + lookback).every(h => h <= highs[i])
    if (isHigh) resistanceLevels.push(highs[i])

    const isLow = lows.slice(i - lookback, i).every(l => l >= lows[i]) &&
                  lows.slice(i + 1, i + 1 + lookback).every(l => l >= lows[i])
    if (isLow) supportLevels.push(lows[i])
  }

  return { supportLevels, resistanceLevels, currentPrice: closes[closes.length - 1] }
}

// For a current price, find nearest support below and farthest meaningful resistance above
function analyzeLong(supports, resistances, price) {
  const supBelow = supports.filter(s => s < price).sort((a, b) => b - a) // closest first
  const resAbove = resistances.filter(r => r > price).sort((a, b) => a - b) // closest first

  if (supBelow.length === 0 || resAbove.length === 0) return null

  const support = supBelow[0]
  // Take the FARTHEST resistance for asymmetric setup, not the nearest
  // But cap to avoid pie-in-the-sky targets
  const resistance = resAbove[Math.min(2, resAbove.length - 1)]

  const risk = price - support
  const reward = resistance - price
  if (risk <= 0 || reward <= 0) return null
  const rr = reward / risk

  return {
    direction: 'long',
    entry: price,
    support,
    resistance,
    risk: (risk / price) * 100,    // %
    reward: (reward / price) * 100, // %
    rr,
  }
}

function analyzeShort(supports, resistances, price) {
  const resAbove = resistances.filter(r => r > price).sort((a, b) => a - b)
  const supBelow = supports.filter(s => s < price).sort((a, b) => b - a)

  if (resAbove.length === 0 || supBelow.length === 0) return null

  const resistance = resAbove[0]
  const support = supBelow[Math.min(2, supBelow.length - 1)]

  const risk = resistance - price
  const reward = price - support
  if (risk <= 0 || reward <= 0) return null
  const rr = reward / risk

  return {
    direction: 'short',
    entry: price,
    support,
    resistance,
    risk: (risk / price) * 100,
    reward: (reward / price) * 100,
    rr,
  }
}

export function AsymmetricRisk() {
  const setPair = useStore(s => s.setPair)
  const [setups, setSetups] = useState([])
  const [loading, setLoading] = useState(false)
  const [progress, setProgress] = useState(0)
  const [minRR, setMinRR] = useState(3)
  const [interval, setInterval] = useState('4h')
  const [direction, setDirection] = useState('both') // both | long | short
  const [lastScan, setLastScan] = useState(null)

  const scan = useCallback(async () => {
    setLoading(true)
    setProgress(0)
    const found = []

    for (let i = 0; i < PAIRS.length; i++) {
      const pair = PAIRS[i]
      try {
        const r = await fetch(
          `https://api.binance.com/api/v3/klines?symbol=${pair}&interval=${interval}&limit=100`,
          { signal: AbortSignal.timeout(5000) }
        )
        if (!r.ok) continue
        const klines = await r.json()
        if (!Array.isArray(klines) || klines.length < 30) continue

        const { supportLevels, resistanceLevels, currentPrice } = findPivots(klines, 5)

        if (direction === 'both' || direction === 'long') {
          const longSetup = analyzeLong(supportLevels, resistanceLevels, currentPrice)
          if (longSetup && longSetup.rr >= minRR) {
            found.push({ pair, base: pair.replace('USDT', ''), ...longSetup })
          }
        }
        if (direction === 'both' || direction === 'short') {
          const shortSetup = analyzeShort(supportLevels, resistanceLevels, currentPrice)
          if (shortSetup && shortSetup.rr >= minRR) {
            found.push({ pair, base: pair.replace('USDT', ''), ...shortSetup })
          }
        }
      } catch (e) { logSilent(e, 'AsymmetricRisk.scan') }
      setProgress(Math.round(((i + 1) / PAIRS.length) * 100))
    }

    found.sort((a, b) => b.rr - a.rr)
    setSetups(found)
    setLastScan(Date.now())
    setLoading(false)
  }, [interval, minRR, direction])

  useEffect(() => { scan() }, []) // initial scan

  return (
    <div className={styles.wrap}>
      <div className={styles.hdr}>
        <div>
          <div className={styles.title}>⚖ Asymmetric Risk Scanner</div>
          <div className={styles.subtitle}>Setups où le R:R est naturellement favorable (1:{minRR}+)</div>
        </div>
        <button onClick={scan} disabled={loading} className={styles.scanBtn}>
          {loading ? `Scan... ${progress}%` : '↻ Scanner'}
        </button>
      </div>

      <div className={styles.filters}>
        <div className={styles.filterGrp}>
          <span className={styles.filterLbl}>Direction</span>
          <div className={styles.btnGrp}>
            {['both', 'long', 'short'].map(d => (
              <button key={d} className={direction === d ? styles.btnOn : styles.btn} onClick={() => setDirection(d)}>
                {d === 'both' ? 'Tous' : d === 'long' ? '↑ Long' : '↓ Short'}
              </button>
            ))}
          </div>
        </div>
        <div className={styles.filterGrp}>
          <span className={styles.filterLbl}>Timeframe</span>
          <div className={styles.btnGrp}>
            {['1h', '4h', '1d'].map(t => (
              <button key={t} className={interval === t ? styles.btnOn : styles.btn} onClick={() => setInterval(t)}>{t}</button>
            ))}
          </div>
        </div>
        <div className={styles.filterGrp}>
          <span className={styles.filterLbl}>R:R min</span>
          <div className={styles.btnGrp}>
            {[2, 3, 4, 5].map(r => (
              <button key={r} className={minRR === r ? styles.btnOn : styles.btn} onClick={() => setMinRR(r)}>1:{r}</button>
            ))}
          </div>
        </div>
      </div>

      <div className={styles.list}>
        {loading && setups.length === 0 && (
          <div className={styles.empty}>
            <div className={styles.spinner}/>
            Scan en cours...
          </div>
        )}
        {!loading && setups.length === 0 && (
          <div className={styles.empty}>
            <div style={{fontSize:32,marginBottom:8}}>🎯</div>
            <div>Aucun setup avec R:R ≥ 1:{minRR}</div>
            <div style={{fontSize:9,color:'var(--txt3)',marginTop:4}}>Essaie un R:R plus bas ou un autre timeframe</div>
          </div>
        )}
        {setups.map((s, i) => {
          const isLong = s.direction === 'long'
          const color = isLong ? 'var(--grn)' : 'var(--red)'
          return (
            <div key={i} className={styles.setupCard} onClick={() => setPair(s.pair)}>
              <div className={styles.setupTop}>
                <div className={styles.setupLeft}>
                  <span className={styles.setupSym}>{s.base}</span>
                  <span className={styles.setupSide} style={{color, background: isLong ? 'rgba(140,198,63,.1)' : 'rgba(255,59,92,.1)'}}>
                    {isLong ? '↑ LONG' : '↓ SHORT'}
                  </span>
                </div>
                <div className={styles.setupRR} style={{color}}>
                  1:{s.rr.toFixed(1)}
                </div>
              </div>
              <div className={styles.setupRow}>
                <div className={styles.setupCell}>
                  <span className={styles.cellL}>Entry</span>
                  <span className={styles.cellV}>{fmtPx(s.entry)}</span>
                </div>
                <div className={styles.setupCell}>
                  <span className={styles.cellL}>{isLong ? 'Support (SL)' : 'Resistance (SL)'}</span>
                  <span className={styles.cellV} style={{color: 'var(--red)'}}>
                    {fmtPx(isLong ? s.support : s.resistance)}
                  </span>
                </div>
                <div className={styles.setupCell}>
                  <span className={styles.cellL}>{isLong ? 'Resistance (TP)' : 'Support (TP)'}</span>
                  <span className={styles.cellV} style={{color: 'var(--grn)'}}>
                    {fmtPx(isLong ? s.resistance : s.support)}
                  </span>
                </div>
              </div>
              <div className={styles.setupRow}>
                <div className={styles.setupCell}>
                  <span className={styles.cellL}>Risque</span>
                  <span className={styles.cellV} style={{color: 'var(--red)'}}>-{s.risk.toFixed(2)}%</span>
                </div>
                <div className={styles.setupCell}>
                  <span className={styles.cellL}>Reward</span>
                  <span className={styles.cellV} style={{color: 'var(--grn)'}}>+{s.reward.toFixed(2)}%</span>
                </div>
                <div className={styles.setupCell}>
                  <span className={styles.cellL}>Action</span>
                  <span className={styles.cellV} style={{color: 'var(--grn)'}}>Trader →</span>
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {lastScan && (
        <div className={styles.foot}>
          {setups.length} setup{setups.length > 1 ? 's' : ''} · Dernier scan : {new Date(lastScan).toLocaleTimeString()}
        </div>
      )}
    </div>
  )
}
