import { useState } from 'react'
import { useStore } from '../../store'
import styles from './MultiChart.module.css'

const LAYOUTS = [
  { id:'1x1', label:'1×1', cols:1, rows:1, slots:1 },
  { id:'1x2', label:'1×2', cols:2, rows:1, slots:2 },
  { id:'2x1', label:'2×1', cols:1, rows:2, slots:2 },
  { id:'2x2', label:'2×2', cols:2, rows:2, slots:4 },
]
const ALL_PAIRS = [
  'BTCUSDT','ETHUSDT','SOLUSDT','BNBUSDT','XRPUSDT',
  'DOGEUSDT','ADAUSDT','AVAXUSDT','LINKUSDT','ARBUSDT',
  'UNIUSDT','DOTUSDT','MATICUSDT','NEARUSDT','INJUSDT',
  'APTUSDT','SUIUSDT','TONUSDT','OPUSDT','TIAUSDT',
  'FETUSDT','RENDERUSDT','PEPEUSDT','WIFUSDT','JUPUSDT',
  'AAVEUSDT','MKRUSDT','LTCUSDT','ATOMUSDT','FILUSDT',
]
const TF_OPTIONS = ['1m','5m','15m','1h','4h','1d']
const TF_MAP     = { '1m':'1','5m':'5','15m':'15','1h':'60','4h':'240','1d':'D' }

function buildUrl(pair, tf) {
  const symbol = encodeURIComponent('BINANCE:' + pair)
  return (
    'https://s.tradingview.com/widgetembed/?' +
    'symbol=' + symbol +
    '&interval=' + (TF_MAP[tf] || '60') +
    '&theme=dark&style=1&locale=fr' +
    '&toolbar_bg=%2309090b' +
    '&hide_top_toolbar=0&hide_side_toolbar=0' +
    '&allow_symbol_change=0&withdateranges=0' +
    '&studies=Volume%40tv-basicstudies'
  )
}

function Tile({ pair, tf, onChangePair }) {
  const [showPicker, setShowPicker] = useState(false)

  return (
    <div className={styles.tile}>
      <div className={styles.tileBar}>
        <button className={styles.pairBtn} onClick={() => setShowPicker(p => !p)}>
          {pair.replace('USDT', '/USDT')} ▾
        </button>
      </div>
      <div className={styles.tileChart}>
        <iframe
          key={pair + tf}
          src={buildUrl(pair, tf)}
          className={styles.tileFrame}
          frameBorder="0"
          allowFullScreen
          scrolling="no"
          title={'Chart ' + pair}
        />
      </div>
      {showPicker && (
        <div className={styles.picker}>
          {ALL_PAIRS.map(p => (
            <button key={p} className={styles.pickerItem + (p === pair ? ' ' + styles.pickerOn : '')}
              onClick={() => { onChangePair(p); setShowPicker(false) }}
            >{p.replace('USDT', '')}</button>
          ))}
        </div>
      )}
    </div>
  )
}

export function MultiChart() {
  const mainPair = useStore(s => s.pair)
  const [layout, setLayout] = useState('2x2')
  const [tf,     setTf]     = useState('1h')
  const lay = LAYOUTS.find(l => l.id === layout) || LAYOUTS[3]
  const [pairs, setPairs] = useState(() => {
    const def = ['BTCUSDT','ETHUSDT','SOLUSDT','BNBUSDT']
    def[0] = mainPair
    return def
  })

  const gridStyle = {
    display: 'grid',
    gridTemplateColumns: `repeat(${lay.cols}, 1fr)`,
    gridTemplateRows: `repeat(${lay.rows}, 1fr)`,
    flex: 1,
    minHeight: 0,
    gap: '2px',
  }

  return (
    <div className={styles.wrap}>
      <div className={styles.bar}>
        <div className={styles.layouts}>
          {LAYOUTS.map(l => (
            <button key={l.id} className={styles.layBtn + (layout === l.id ? ' ' + styles.layOn : '')}
              onClick={() => setLayout(l.id)}
            >{l.label}</button>
          ))}
        </div>
        <div className={styles.tfs}>
          {TF_OPTIONS.map(t => (
            <button key={t} className={styles.tfBtn + (tf === t ? ' ' + styles.tfOn : '')}
              onClick={() => setTf(t)}
            >{t}</button>
          ))}
        </div>
      </div>

      <div style={gridStyle}>
        {Array.from({ length: lay.slots }).map((_, i) => (
          <Tile
            key={i}
            pair={pairs[i] || ALL_PAIRS[i] || 'BTCUSDT'}
            tf={tf}
            onChangePair={p => setPairs(prev => { const n = [...prev]; n[i] = p; return n })}
          />
        ))}
      </div>
    </div>
  )
}
