import { useEffect, useRef, useState } from 'react'
import { useStore } from '../../store'
import styles from './Chart.module.css'

// Mapping FXS pairs → TradingView symbols
const toTVSymbol = (pair) => {
  const base = pair.replace('USDT', '')
  return `BINANCE:${base}USDT`
}

// TradingView theme config
const TV_THEME = {
  background: '#09090b',
  gridColor:  'rgba(255,255,255,0.03)',
  textColor:  '#52525b',
  upColor:    '#00e5a0',
  downColor:  '#ff3b5c',
}

export function Chart() {
  const pair = useStore(s => s.pair)
  const tf   = useStore(s => s.tf)
  const setTf = useStore(s => s.setTf)
  const containerRef = useRef(null)
  const widgetRef    = useRef(null)
  const [loading, setLoading] = useState(true)

  // TradingView interval mapping
  const toTVInterval = (tf) => {
    const map = { '1m':'1','5m':'5','15m':'15','1h':'60','4h':'240','1d':'D' }
    return map[tf] || '15'
  }

  useEffect(() => {
    if (!containerRef.current) return
    setLoading(true)

    // Remove existing widget
    if (widgetRef.current) {
      try { widgetRef.current.remove() } catch(_) {}
      widgetRef.current = null
    }
    containerRef.current.innerHTML = ''

    const script = document.createElement('script')
    script.src = 'https://s3.tradingview.com/tv.js'
    script.async = true
    script.onload = () => {
      if (!window.TradingView || !containerRef.current) return
      try {
        widgetRef.current = new window.TradingView.widget({
          // Container
          container_id: containerRef.current.id,
          width:  '100%',
          height: '100%',
          autosize: true,

          // Symbol & interval
          symbol:   toTVSymbol(pair),
          interval: toTVInterval(tf),
          timezone: 'Etc/UTC',

          // Theme — dark matching FXS
          theme: 'dark',
          style: '1', // candlestick
          locale: 'fr',

          // Colors
          toolbar_bg:         TV_THEME.background,
          overrides: {
            'mainSeriesProperties.candleStyle.upColor':         TV_THEME.upColor,
            'mainSeriesProperties.candleStyle.downColor':       TV_THEME.downColor,
            'mainSeriesProperties.candleStyle.borderUpColor':   TV_THEME.upColor,
            'mainSeriesProperties.candleStyle.borderDownColor': TV_THEME.downColor,
            'mainSeriesProperties.candleStyle.wickUpColor':     TV_THEME.upColor,
            'mainSeriesProperties.candleStyle.wickDownColor':   TV_THEME.downColor,
            'paneProperties.background':                        TV_THEME.background,
            'paneProperties.vertGridProperties.color':          TV_THEME.gridColor,
            'paneProperties.horzGridProperties.color':          TV_THEME.gridColor,
            'scalesProperties.textColor':                       TV_THEME.textColor,
          },

          // Features
          allow_symbol_change: false, // we control symbol ourselves
          save_image: false,
          hide_top_toolbar: false,
          hide_legend: false,
          hide_side_toolbar: false,
          withdateranges: true,
          details: false,
          hotlist: false,
          calendar: false,
          show_popup_button: false,

          // Studies pre-loaded (user can add more via the toolbar)
          studies: [
            'Volume@tv-basicstudies',
          ],

          // Disable TradingView branding where possible
          disabled_features: [
            'header_symbol_search',
            'header_compare',
            'display_market_status',
            'go_to_date',
            'timeframes_toolbar',
            'symbol_info',
            'border_around_the_chart',
          ],
          enabled_features: [
            'study_templates',
            'use_localstorage_for_settings',
            'save_chart_properties_to_local_storage',
          ],

          loading_screen: {
            backgroundColor: TV_THEME.background,
            foregroundColor: '#00e5a0',
          },
        })
        setLoading(false)
      } catch(_) { setLoading(false) }
    }
    script.onerror = () => setLoading(false)
    document.head.appendChild(script)

    return () => {
      if (widgetRef.current) {
        try { widgetRef.current.remove() } catch(_) {}
        widgetRef.current = null
      }
    }
  }, [pair, tf])

  // Unique ID per render
  const containerId = `tv_chart_${pair}`

  return (
    <div className={styles.wrap}>
      {/* TF bar — syncs with TradingView */}
      <div className={styles.topBar}>
        <div className={styles.tfRow}>
          {['1m','5m','15m','1h','4h','1d'].map(t => (
            <button
              key={t}
              className={`${styles.tfBtn} ${tf===t?styles.tfOn:''}`}
              onClick={() => setTf(t)}
            >{t}</button>
          ))}
        </div>
        <div className={styles.tvBadge}>
          <span className={styles.tvDot}/>
          TradingView · tous les indicateurs disponibles
        </div>
      </div>

      {/* Chart container */}
      <div className={styles.chartWrap}>
        {loading && (
          <div className={styles.loader}>
            <div className={styles.loaderDot}/>
            <span>Chargement du chart...</span>
          </div>
        )}
        <div
          id={containerId}
          ref={containerRef}
          className={styles.tvContainer}
          style={{ opacity: loading ? 0 : 1 }}
        />
      </div>
    </div>
  )
}
