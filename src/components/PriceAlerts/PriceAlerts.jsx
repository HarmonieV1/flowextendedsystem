import { triggerAlert, requestNotifPermission } from '../../lib/alertSound'
import { useState, useEffect, useRef } from 'react'
import { useStore } from '../../store'
import { fmtPx } from '../../lib/format'
import styles from './PriceAlerts.module.css'
import { logSilent } from '../../lib/errorMonitor'

const hasNotif = typeof Notification !== 'undefined'

export function PriceAlerts() {
  const lastPx = useStore(s => s.lastPx)
  const pair   = useStore(s => s.pair)
  const [alerts, setAlerts] = useState([])
  const [price, setPrice]   = useState('')
  const [condition, setCond] = useState('above')
  const [triggered, setTriggered] = useState([])
  const prevPx = useRef(lastPx)

  // Load from localStorage
  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem('fxs_alerts') || '[]')
      setAlerts(saved)
    } catch(e){logSilent(e,'PriceAlerts')}
  }, [])

  const save = (arr) => {
    setAlerts(arr)
    try { localStorage.setItem('fxs_alerts', JSON.stringify(arr)) } catch(e){logSilent(e,'PriceAlerts')}
  }

  // Check alerts on price change
  useEffect(() => {
    if (!lastPx || alerts.length === 0) return
    const prev = prevPx.current
    prevPx.current = lastPx
    const newTriggered = []
    const remaining = []
    alerts.forEach(a => {
      if (a.pair !== pair) { remaining.push(a); return }
      const hit = (a.condition === 'above' && lastPx >= a.price && prev < a.price)
               || (a.condition === 'below' && lastPx <= a.price && prev > a.price)
      if (hit) {
        newTriggered.push(a)
        triggerAlert(a.pair, fmtPx(a.price), a.condition)
      } else { remaining.push(a) }
    })
    if (newTriggered.length > 0) {
      save(remaining)
      setTriggered(prev => [...newTriggered, ...prev].slice(0,10))
    }
  }, [lastPx, alerts, pair])

  const addAlert = () => {
    const p = parseFloat(price)
    if (!p || p <= 0) return
    const alert = { id: Date.now(), pair, price: p, condition, created: Date.now() }
    save([...alerts, alert])
    setPrice('')
  }

  const remove = (id) => save(alerts.filter(a => a.id !== id))

  const requestPerm = async () => {
    if (!hasNotif) return
    await Notification.requestPermission()
  }

  const pairAlerts = alerts.filter(a => a.pair === pair)
  const otherAlerts = alerts.filter(a => a.pair !== pair)

  const enableNotifs = async () => {
    await requestNotifPermission()
  }

  return (
    <div className={styles.wrap}>
      <div className={styles.header}>
        <span className={styles.title}>🔔 Alertes prix</span>
        <span className={styles.current}>{pair.replace('USDT','')} · {fmtPx(lastPx)}</span>
      </div>

      {/* Add alert */}
      <div className={styles.addBlock}>
        <div className={styles.condRow}>
          <button className={styles.condBtn + (condition==='above'?' '+styles.condOn:'')} onClick={()=>setCond('above')}>↑ Au-dessus</button>
          <button className={styles.condBtn + (condition==='below'?' '+styles.condOn:'')} onClick={()=>setCond('below')}>↓ En-dessous</button>
        </div>
        <div className={styles.inputRow}>
          <input
            className={styles.input}
            type="number"
            placeholder={fmtPx(lastPx)}
            value={price}
            onChange={e => setPrice(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && addAlert()}
          />
          <button className={styles.addBtn} onClick={addAlert}>+ Ajouter</button>
        </div>
        {hasNotif && Notification.permission !== 'granted' && (
          <button className={styles.notifBtn} onClick={requestPerm}>
            🔔 Activer les notifications
          </button>
        )}
      </div>

      {/* Active alerts for current pair */}
      {pairAlerts.length > 0 && (
        <div className={styles.section}>
          <div className={styles.sectionTitle}>{pair.replace('USDT','')} — {pairAlerts.length} alerte{pairAlerts.length>1?'s':''}</div>
          {pairAlerts.map(a => (
            <div key={a.id} className={styles.alertRow}>
              <span className={styles.alertDir} style={{color: a.condition==='above'?'var(--grn)':'var(--red)'}}>
                {a.condition === 'above' ? '↑' : '↓'}
              </span>
              <span className={styles.alertPrice}>{fmtPx(a.price)}</span>
              <span className={styles.alertDist} style={{color: a.condition==='above'
                ? (lastPx >= a.price ? 'var(--grn)' : 'var(--txt3)')
                : (lastPx <= a.price ? 'var(--grn)' : 'var(--txt3)')
              }}>
                {lastPx >= a.price && a.condition === 'above' ? '✓ Atteint'
                  : lastPx <= a.price && a.condition === 'below' ? '✓ Atteint'
                  : (Math.abs(lastPx - a.price) / a.price * 100).toFixed(2) + '% restant'}
              </span>
              <button className={styles.delBtn} onClick={() => remove(a.id)}>✕</button>
            </div>
          ))}
        </div>
      )}

      {/* Other pairs */}
      {otherAlerts.length > 0 && (
        <div className={styles.section}>
          <div className={styles.sectionTitle}>Autres paires ({otherAlerts.length})</div>
          {otherAlerts.map(a => (
            <div key={a.id} className={styles.alertRow}>
              <span className={styles.alertPair}>{a.pair.replace('USDT','')}</span>
              <span className={styles.alertDir} style={{color: a.condition==='above'?'var(--grn)':'var(--red)'}}>
                {a.condition === 'above' ? '↑' : '↓'}
              </span>
              <span className={styles.alertPrice}>{fmtPx(a.price)}</span>
              <button className={styles.delBtn} onClick={() => remove(a.id)}>✕</button>
            </div>
          ))}
        </div>
      )}

      {/* Triggered */}
      {triggered.length > 0 && (
        <div className={styles.section}>
          <div className={styles.sectionTitle} style={{color:'var(--grn)'}}>✓ Déclenchées</div>
          {triggered.slice(0,5).map((a,i) => (
            <div key={i} className={styles.triggeredRow}>
              <span style={{color:'var(--grn)'}}>⚡</span>
              <span>{a.pair.replace('USDT','')} {a.condition==='above'?'↑':'↓'} {fmtPx(a.price)}</span>
            </div>
          ))}
        </div>
      )}

      {alerts.length === 0 && triggered.length === 0 && (
        <div className={styles.empty}>
          Aucune alerte active. Configure une alerte pour être notifié automatiquement.
        </div>
      )}
    </div>
  )
}
