import { useState } from 'react'
import { useStore } from '../../store'
import styles from './Chart.module.css'

const TF_MAP = { '1m':'1','5m':'5','15m':'15','1h':'60','4h':'240','1d':'D' }

// TradingView embed widget — no SDK, no grey bar, loads instantly
function buildUrl(pair, tf) {
  const symbol = encodeURIComponent('BINANCE:' + pair)
  const interval = TF_MAP[tf] || '240'
  return (
    'https://s.tradingview.com/widgetembed/?' +
    'symbol=' + symbol +
    '&interval=' + interval +
    '&theme=dark' +
    '&style=1' +
    '&locale=fr' +
    '&toolbar_bg=%2309090b' +
    '&hide_top_toolbar=0' +
    '&hide_legend=0' +
    '&hide_side_toolbar=0' +
    '&allow_symbol_change=0' +
    '&studies=Volume%40tv-basicstudies' +
    '&withdateranges=0' +
    '&utm_source=fxsedge.netlify.app' +
    '&utm_medium=widget' +
    '&utm_campaign=chart'
  )
}

export function Chart({ onToggleOrders, ordersOpen }) {
  const pair  = useStore(s => s.pair)
  const tf    = useStore(s => s.tf)
  const setTf = useStore(s => s.setTf)

  return (
    <div className={styles.wrap}>
      <div className={styles.bar}>
        {Object.keys(TF_MAP).map(t => (
          <button key={t}
            className={styles.tf + (tf === t ? ' ' + styles.tfOn : '')}
            onClick={() => setTf(t)}
          >{t}</button>
        ))}
        <span className={styles.badge}><span className={styles.dot}/>TradingView</span>
        {onToggleOrders && (
          <button className={styles.ordBtn} onClick={onToggleOrders}>
            {ordersOpen ? '▾' : '▸'} Ordres
          </button>
        )}
      </div>
      <div className={styles.outer}>
        <iframe
          key={pair + tf}
          src={buildUrl(pair, tf)}
          className={styles.frame}
          frameBorder="0"
          allowFullScreen
          scrolling="no"
          title={'Chart ' + pair}
        />
      </div>
    </div>
  )
}
