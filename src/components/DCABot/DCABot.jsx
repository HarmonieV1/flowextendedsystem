import { useState, useEffect, useRef } from 'react'
import { useStore } from '../../store'
import { hasApiKeys, spotPlaceOrder } from '../../lib/bitunix'
import { fmt, fmtPx } from '../../lib/format'
import styles from './DCABot.module.css'

const STORAGE_KEY = 'fxs_dca_bots'

function loadBots() { try { return JSON.parse(localStorage.getItem(STORAGE_KEY)) || [] } catch { return [] } }
function saveBots(bots) { localStorage.setItem(STORAGE_KEY, JSON.stringify(bots)) }

export function DCABot() {
  const pair = useStore(s => s.pair)
  const lastPx = useStore(s => s.lastPx)
  const base = pair.replace('USDT','')

  const [bots, setBots] = useState(loadBots)
  const [creating, setCreating] = useState(false)
  const [form, setForm] = useState({ amount: '10', interval: '4', unit: 'hours', maxOrders: '30' })
  const timersRef = useRef({})

  // Run active bots
  useEffect(() => {
    const runBot = async (bot) => {
      if (!hasApiKeys() || bot.status !== 'active' || bot.ordersPlaced >= bot.maxOrders) return
      try {
        const qty = (parseFloat(bot.amount) / lastPx).toFixed(6)
        await spotPlaceOrder({ symbol: bot.pair, side: 'BUY', qty: parseFloat(qty), orderType: 'MARKET' })
        // Update bot state
        const updated = loadBots().map(b => 
          b.id === bot.id ? { ...b, ordersPlaced: b.ordersPlaced + 1, totalSpent: b.totalSpent + parseFloat(bot.amount), lastOrder: Date.now() } : b
        )
        saveBots(updated)
        setBots(updated)
      } catch (e) {
        console.error(`[DCA] ${bot.pair} error:`, e.message)
      }
    }

    // Clear old timers
    Object.values(timersRef.current).forEach(clearInterval)
    timersRef.current = {}

    // Set up timers for active bots
    bots.filter(b => b.status === 'active').forEach(bot => {
      const ms = bot.unit === 'minutes' ? bot.interval * 60000 : bot.unit === 'hours' ? bot.interval * 3600000 : bot.interval * 86400000
      // Check if it's time for next order
      const elapsed = Date.now() - (bot.lastOrder || 0)
      if (elapsed >= ms) runBot(bot)
      timersRef.current[bot.id] = setInterval(() => runBot(bot), ms)
    })

    return () => Object.values(timersRef.current).forEach(clearInterval)
  }, [bots, lastPx])

  const createBot = () => {
    const bot = {
      id: Date.now(),
      pair,
      amount: form.amount,
      interval: parseInt(form.interval),
      unit: form.unit,
      maxOrders: parseInt(form.maxOrders),
      ordersPlaced: 0,
      totalSpent: 0,
      status: 'active',
      createdAt: Date.now(),
      lastOrder: 0,
    }
    const updated = [bot, ...bots]
    saveBots(updated)
    setBots(updated)
    setCreating(false)
  }

  const toggleBot = (id) => {
    const updated = bots.map(b => b.id === id ? { ...b, status: b.status === 'active' ? 'paused' : 'active' } : b)
    saveBots(updated)
    setBots(updated)
  }

  const deleteBot = (id) => {
    const updated = bots.filter(b => b.id !== id)
    saveBots(updated)
    setBots(updated)
  }

  const getIntervalLabel = (b) => `${b.interval}${b.unit === 'minutes' ? 'min' : b.unit === 'hours' ? 'h' : 'd'}`
  const getNextOrder = (b) => {
    if (b.status !== 'active') return '—'
    const ms = b.unit === 'minutes' ? b.interval * 60000 : b.unit === 'hours' ? b.interval * 3600000 : b.interval * 86400000
    const next = (b.lastOrder || b.createdAt) + ms
    const diff = Math.max(0, next - Date.now())
    if (diff < 60000) return `${Math.ceil(diff/1000)}s`
    if (diff < 3600000) return `${Math.ceil(diff/60000)}min`
    return `${Math.ceil(diff/3600000)}h`
  }

  return (
    <div className={styles.wrap}>
      <div className={styles.header}>
        <span className={styles.title}>🤖 DCA Bot</span>
        <span className={styles.sub}>Dollar Cost Averaging automatique</span>
        <button className={styles.addBtn} onClick={() => setCreating(!creating)}>
          {creating ? '✕' : '+ Créer'}
        </button>
      </div>

      {creating && (
        <div className={styles.form}>
          <div className={styles.formRow}>
            <span className={styles.formLabel}>Paire</span>
            <span className={styles.formValue}>{pair}</span>
          </div>
          <div className={styles.formRow}>
            <span className={styles.formLabel}>Montant (USDT)</span>
            <input className={styles.input} type="number" value={form.amount} onChange={e => setForm({...form, amount: e.target.value})} placeholder="10"/>
          </div>
          <div className={styles.formRow}>
            <span className={styles.formLabel}>Intervalle</span>
            <div style={{display:'flex',gap:4}}>
              <input className={styles.input} type="number" value={form.interval} onChange={e => setForm({...form, interval: e.target.value})} style={{width:60}}/>
              <select className={styles.select} value={form.unit} onChange={e => setForm({...form, unit: e.target.value})}>
                <option value="minutes">min</option>
                <option value="hours">heures</option>
                <option value="days">jours</option>
              </select>
            </div>
          </div>
          <div className={styles.formRow}>
            <span className={styles.formLabel}>Max ordres</span>
            <input className={styles.input} type="number" value={form.maxOrders} onChange={e => setForm({...form, maxOrders: e.target.value})} style={{width:60}}/>
          </div>
          <div className={styles.formRow}>
            <span className={styles.formLabel}>Total prévu</span>
            <span className={styles.formValue}>${fmt(parseFloat(form.amount||0) * parseInt(form.maxOrders||0), 0)}</span>
          </div>
          <button className={styles.createBtn} onClick={createBot} disabled={!hasApiKeys()}>
            {hasApiKeys() ? `Lancer DCA ${base}` : 'Connecte ton API'}
          </button>
        </div>
      )}

      <div className={styles.list}>
        {bots.length === 0 && !creating && (
          <div className={styles.empty}>
            <div style={{fontSize:32}}>🤖</div>
            <div>Aucun bot DCA actif</div>
            <div style={{fontSize:10,color:'var(--txt3)',marginTop:4}}>Le DCA achète automatiquement à intervalles réguliers pour lisser ton prix d'entrée</div>
          </div>
        )}
        {bots.map(b => (
          <div key={b.id} className={styles.botCard}>
            <div className={styles.botTop}>
              <span className={styles.botPair}>{b.pair.replace('USDT','/USDT')}</span>
              <span className={`${styles.botStatus} ${b.status === 'active' ? styles.active : styles.paused}`}>
                {b.status === 'active' ? '● Actif' : '◌ Pause'}
              </span>
            </div>
            <div className={styles.botStats}>
              <span>${b.amount} / {getIntervalLabel(b)}</span>
              <span>{b.ordersPlaced}/{b.maxOrders} ordres</span>
              <span>Dépensé: ${fmt(b.totalSpent, 2)}</span>
              <span>Next: {getNextOrder(b)}</span>
            </div>
            <div className={styles.botProgress}>
              <div className={styles.botBar} style={{width: `${(b.ordersPlaced/b.maxOrders)*100}%`}}/>
            </div>
            <div className={styles.botActions}>
              <button className={styles.botBtn} onClick={() => toggleBot(b.id)}>
                {b.status === 'active' ? '⏸ Pause' : '▶ Start'}
              </button>
              <button className={styles.botBtn} style={{color:'var(--red)'}} onClick={() => deleteBot(b.id)}>🗑 Supprimer</button>
            </div>
          </div>
        ))}
      </div>

      <div className={styles.footer}>
        Le bot s'exécute uniquement quand l'app est ouverte · Spot market orders via Bitunix
      </div>
    </div>
  )
}
