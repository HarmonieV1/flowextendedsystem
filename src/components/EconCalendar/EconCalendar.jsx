import { useEffect, useRef } from 'react'
import styles from './EconCalendar.module.css'

export function EconCalendar() {
  const containerRef = useRef(null)

  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    // Clear previous
    el.innerHTML = ''

    const script = document.createElement('script')
    script.src = 'https://s3.tradingview.com/external-embedding/embed-widget-events.js'
    script.async = true
    script.innerHTML = JSON.stringify({
      colorTheme: 'dark',
      isTransparent: true,
      width: '100%',
      height: '100%',
      locale: 'fr',
      importanceFilter: '-1,0,1',
      countryFilter: 'us,eu,gb,jp,cn,au,ca',
    })

    el.appendChild(script)

    return () => { if (el) el.innerHTML = '' }
  }, [])

  return (
    <div className={styles.wrap}>
      <div className={styles.header}>
        <span className={styles.title}>📅 Economic Calendar</span>
        <span className={styles.sub}>Live · TradingView</span>
      </div>
      <div className={styles.widget} ref={containerRef} />
    </div>
  )
}
