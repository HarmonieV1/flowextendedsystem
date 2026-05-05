import { useState } from 'react'
import styles from './HotkeyConfig.module.css'

const STORAGE_KEY = 'fxs_hotkeys'

const DEFAULT_KEYS = {
  long: 'L', short: 'X', market: 'M', limit: 'P',
  lev2: '1', lev5: '2', lev10: '3', lev20: '4', lev50: '5', lev100: '6',
  enter: 'Enter', escape: 'Escape', closeAll: 'Q',
  tabTrade: 'T', tabPositions: 'O', tabHistory: 'H',
}

const LABELS = {
  long:'Long', short:'Short', market:'Market', limit:'Limit',
  lev2:'Levier 2×', lev5:'Levier 5×', lev10:'Levier 10×', lev20:'Levier 20×', lev50:'Levier 50×', lev100:'Levier 100×',
  enter:'Placer ordre', escape:'Annuler', closeAll:'Close All',
  tabTrade:'Tab Trade', tabPositions:'Tab Positions', tabHistory:'Tab Historique',
}

export function loadHotkeys() {
  try { return { ...DEFAULT_KEYS, ...JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}') } }
  catch { return DEFAULT_KEYS }
}

function saveHotkeys(keys) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(keys))
}

export function HotkeyConfig({ onClose }) {
  const [keys, setKeys] = useState(loadHotkeys)
  const [editing, setEditing] = useState(null)

  const handleKeyCapture = (e) => {
    if (!editing) return
    e.preventDefault()
    const key = e.key === ' ' ? 'Space' : e.key.length === 1 ? e.key.toUpperCase() : e.key
    const updated = { ...keys, [editing]: key }
    setKeys(updated)
    saveHotkeys(updated)
    setEditing(null)
  }

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={e => e.stopPropagation()} onKeyDown={handleKeyCapture} tabIndex={0}>
        <div className={styles.header}>
          <span className={styles.title}>⌨️ Raccourcis clavier</span>
          <button className={styles.closeBtn} onClick={onClose}>✕</button>
        </div>
        <div className={styles.list}>
          {Object.entries(LABELS).map(([id, label]) => (
            <div key={id} className={styles.row}>
              <span className={styles.label}>{label}</span>
              <button
                className={`${styles.keyBtn} ${editing === id ? styles.keyEditing : ''}`}
                onClick={() => setEditing(editing === id ? null : id)}
              >
                {editing === id ? '...' : keys[id]}
              </button>
            </div>
          ))}
        </div>
        <div className={styles.footer}>
          <button className={styles.resetBtn} onClick={() => { setKeys(DEFAULT_KEYS); saveHotkeys(DEFAULT_KEYS) }}>
            Réinitialiser
          </button>
          <span className={styles.hint}>Clique sur une touche puis appuie sur la nouvelle touche</span>
        </div>
      </div>
    </div>
  )
}
