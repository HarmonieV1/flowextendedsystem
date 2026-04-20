import { useState, useEffect, useRef } from 'react'
import { useStore } from '../../store'
import { fmtPx } from '../../lib/format'
import styles from './PriceAlerts.module.css'

const STORAGE_KEY = 'fxs_alerts'

function loadAlerts() {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]') } catch { return [] }
}
function saveAlerts(alerts) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(alerts)) } catch {}
}

export function PriceAlerts() {
  const pair   = useStore(s => s.pair)
  const lastPx = useStore(s => s.lastPx)

  const [alerts, setAlerts]       = useState(loadAlerts)
  const [newPrice, setNewPrice]   = useState('')
  const [newType, setNewType]     = useState('above') // 'above' | 'below'
  const [permission, setPermission] = useState(Notification.permission)
  const triggeredRef = useRef(new Set())

  // Persist alerts
  useEffect(() => saveAlerts(alerts), [alerts])

  // Check alerts on price update
  useEffect(() => {
    if (!lastPx || !alerts.length) return
    alerts.forEach(alert => {
      if (alert.triggered) return
      const key = `${alert.id}`
      if (triggeredRef.current.has(key)) return

      const hit = alert.type === 'above'
        ? lastPx >= alert.price
        : lastPx <= alert.price

      if (hit) {
        triggeredRef.current.add(key)
        // Mark as triggered
        setAlerts(prev => prev.map(a => a.id === alert.id ? { ...a, triggered: true } : a))
        // Fire notification
        fireNotification(alert, lastPx)
      }
    })
  }, [lastPx])

  const fireNotification = (alert, px) => {
    const dir = alert.type === 'above' ? '🟢 Au-dessus de' : '🔴 En-dessous de'
    const msg = `${alert.pair} est ${dir} ${fmtPx(alert.price)} — Prix actuel: ${fmtPx(px)}`

    if (Notification.permission === 'granted') {
      new Notification(`⚡ FXS Alert — ${alert.pair}`, {
        body: msg,
        icon: '/favicon.ico',
        badge: '/favicon.ico',
        tag: `fxs-alert-${alert.id}`,
      })
    }
    // Also play a subtle sound
    try {
      const ctx = new AudioContext()
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.connect(gain); gain.connect(ctx.destination)
      osc.frequency.value = alert.type === 'above' ? 880 : 440
      gain.gain.setValueAtTime(0.1, ctx.currentTime)
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3)
      osc.start(); osc.stop(ctx.currentTime + 0.3)
    } catch(_) {}
  }

  const requestPermission = async () => {
    const result = await Notification.requestPermission()
    setPermission(result)
  }

  const addAlert = () => {
    const price = parseFloat(newPrice)
    if (!price || price <= 0) return
    const alert = {
      id: Date.now(),
      pair,
      price,
      type: newType,
      triggered: false,
      createdAt: Date.now(),
    }
    setAlerts(prev => [...prev, alert])
    setNewPrice('')
  }

  const removeAlert = (id) => {
    setAlerts(prev => prev.filter(a => a.id !== id))
    triggeredRef.current.delete(`${id}`)
  }

  const resetAlert = (id) => {
    setAlerts(prev => prev.map(a => a.id === id ? { ...a, triggered: false } : a))
    triggeredRef.current.delete(`${id}`)
  }

  const activeAlerts  = alerts.filter(a => !a.triggered)
  const doneAlerts    = alerts.filter(a => a.triggered)

  return (
    <div className={styles.wrap}>
      <div className={styles.header}>
        <span className={styles.title}>⚡ Price Alerts</span>
        <span className={styles.count}>{activeAlerts.length} actives</span>
      </div>

      {/* Notification permission */}
      {permission !== 'granted' && (
        <div className={styles.permBanner}>
          <span>Active les notifications pour recevoir les alertes même en arrière-plan</span>
          <button className={styles.permBtn} onClick={requestPermission}>
            {permission === 'denied' ? 'Bloqué — débloque dans le navigateur' : 'Activer →'}
          </button>
        </div>
      )}

      {/* Add alert */}
      <div className={styles.addRow}>
        <div className={styles.typeToggle}>
          <button className={`${styles.typeBtn} ${newType==='above'?styles.typeAbove:''}`} onClick={()=>setNewType('above')}>
            ↑ Au-dessus
          </button>
          <button className={`${styles.typeBtn} ${newType==='below'?styles.typeBelow:''}`} onClick={()=>setNewType('below')}>
            ↓ En-dessous
          </button>
        </div>
        <div className={styles.inputRow}>
          <input
            className={styles.priceInput}
            type="number"
            placeholder={`Prix cible (actuel: ${fmtPx(lastPx)})`}
            value={newPrice}
            onChange={e => setNewPrice(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && addAlert()}
          />
          <button className={styles.addBtn} onClick={addAlert} disabled={!newPrice}>
            + Ajouter
          </button>
        </div>
        <div className={styles.pairNote}>Paire active : {pair.replace('USDT','/USDT')}</div>
      </div>

      {/* Active alerts */}
      {activeAlerts.length > 0 && (
        <div className={styles.section}>
          <div className={styles.sectionTitle}>Actives</div>
          {activeAlerts.map(a => (
            <div key={a.id} className={styles.alertRow}>
              <span className={`${styles.alertDir} ${a.type==='above'?styles.above:styles.below}`}>
                {a.type==='above'?'↑':'↓'}
              </span>
              <span className={styles.alertPair}>{a.pair.replace('USDT','/USDT')}</span>
              <span className={styles.alertPrice}>{fmtPx(a.price)}</span>
              <span className={styles.alertDist}>
                {lastPx && a.price ? (
                  `${((a.price - lastPx) / lastPx * 100).toFixed(2)}%`
                ) : '—'}
              </span>
              <button className={styles.alertDel} onClick={() => removeAlert(a.id)}>✕</button>
            </div>
          ))}
        </div>
      )}

      {/* Triggered alerts */}
      {doneAlerts.length > 0 && (
        <div className={styles.section}>
          <div className={styles.sectionTitle}>Déclenchées</div>
          {doneAlerts.map(a => (
            <div key={a.id} className={`${styles.alertRow} ${styles.alertDone}`}>
              <span className={styles.alertCheck}>✓</span>
              <span className={styles.alertPair}>{a.pair.replace('USDT','/USDT')}</span>
              <span className={styles.alertPrice}>{fmtPx(a.price)}</span>
              <div className={styles.alertActions}>
                <button className={styles.alertReset} onClick={() => resetAlert(a.id)}>↺</button>
                <button className={styles.alertDel} onClick={() => removeAlert(a.id)}>✕</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {alerts.length === 0 && (
        <div className={styles.empty}>
          Aucune alerte configurée — ajoute ton premier niveau de prix
        </div>
      )}
    </div>
  )
}
