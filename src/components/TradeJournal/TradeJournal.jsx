import { useState, useEffect } from 'react'
import { useStore } from '../../store'
import { fmt, fmtPx, baseAsset } from '../../lib/format'
import styles from './TradeJournal.module.css'

const STORAGE_KEY = 'fxs_journal_v1'

function loadTrades() {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY)) || [] } catch { return [] }
}
function saveTrades(trades) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(trades.slice(0, 500)))
}

// Appelé depuis OrderForm/QuickTrade après un ordre réussi
export function logTrade(trade) {
  const trades = loadTrades()
  trades.unshift({
    id: Date.now(),
    date: new Date().toISOString(),
    pair: trade.pair,
    side: trade.side,     // 'buy' | 'sell'
    type: trade.type,     // 'spot' | 'futures' | 'swap'
    entry: trade.entry,
    exit: trade.exit || null,
    qty: trade.qty,
    pnl: trade.pnl || null,
    fee: trade.fee || 0,
    status: trade.status || 'open', // 'open' | 'closed'
    note: trade.note || '',
  })
  saveTrades(trades)
  window.dispatchEvent(new Event('fxs:journalUpdated'))
}

export function TradeJournal() {
  const connected = useStore(s => s.connected)
  const [trades, setTrades]   = useState([])
  const [filter, setFilter]   = useState('all') // all | open | closed
  const [adding, setAdding]   = useState(false)
  const [form, setForm]       = useState({ pair:'BTC/USDT', side:'buy', type:'spot', entry:'', exit:'', qty:'', fee:'', note:'' })

  useEffect(() => {
    const load = () => setTrades(loadTrades())
    load()
    window.addEventListener('fxs:journalUpdated', load)
    return () => window.removeEventListener('fxs:journalUpdated', load)
  }, [])

  const filtered = filter === 'all' ? trades
    : trades.filter(t => t.status === filter)

  // Stats
  const closed = trades.filter(t => t.status === 'closed' && t.pnl !== null)
  const wins   = closed.filter(t => parseFloat(t.pnl) > 0)
  const totalPnl = closed.reduce((acc,t) => acc + parseFloat(t.pnl||0), 0)
  const winRate  = closed.length > 0 ? (wins.length / closed.length * 100) : 0
  const avgPnl   = closed.length > 0 ? totalPnl / closed.length : 0

  const addTrade = () => {
    if (!form.entry) return
    const pnl = form.exit && form.entry
      ? (parseFloat(form.exit) - parseFloat(form.entry)) * parseFloat(form.qty||1) * (form.side==='sell'?-1:1) - parseFloat(form.fee||0)
      : null
    logTrade({
      pair: form.pair, side: form.side, type: form.type,
      entry: parseFloat(form.entry), exit: form.exit ? parseFloat(form.exit) : null,
      qty: parseFloat(form.qty||1), pnl, fee: parseFloat(form.fee||0),
      note: form.note, status: form.exit ? 'closed' : 'open',
    })
    setForm({ pair:'BTC/USDT', side:'buy', type:'spot', entry:'', exit:'', qty:'', fee:'', note:'' })
    setAdding(false)
  }

  const deleteTrade = id => {
    const updated = trades.filter(t => t.id !== id)
    saveTrades(updated)
    setTrades(updated)
  }

  const closeTrade = (id) => {
    const exit = prompt('Prix de sortie ?')
    if (!exit) return
    const updated = trades.map(t => {
      if (t.id !== id) return t
      const pnl = (parseFloat(exit) - t.entry) * t.qty * (t.side==='sell'?-1:1) - (t.fee||0)
      return { ...t, exit: parseFloat(exit), pnl, status:'closed' }
    })
    saveTrades(updated)
    setTrades(updated)
  }

  if (!connected) {
    return (
      <div className={styles.empty}>
        <span className={styles.emptyIcon}>📓</span>
        <span className={styles.emptyTitle}>Trade Journal</span>
        <span className={styles.emptySub}>Connecte ton wallet pour accéder au journal de trading.</span>
      </div>
    )
  }

  return (
    <div className={styles.wrap}>
      {/* Stats */}
      <div className={styles.stats}>
        <StatCard label="Trades" val={closed.length} />
        <StatCard label="Win Rate" val={`${winRate.toFixed(0)}%`} color={winRate>=50?'var(--grn)':'var(--red)'} />
        <StatCard label="PnL Total" val={`${totalPnl>=0?'+':''}$${fmt(totalPnl)}`} color={totalPnl>=0?'var(--grn)':'var(--red)'} />
        <StatCard label="Avg Trade" val={`${avgPnl>=0?'+':''}$${fmt(avgPnl)}`} color={avgPnl>=0?'var(--grn)':'var(--red)'} />
      </div>

      {/* Toolbar */}
      <div className={styles.toolbar}>
        <div className={styles.filters}>
          {['all','open','closed'].map(f => (
            <button key={f} className={`${styles.fBtn} ${filter===f?styles.fBtnOn:''}`} onClick={()=>setFilter(f)}>{f}</button>
          ))}
        </div>
        <button className={styles.addBtn} onClick={()=>setAdding(a=>!a)}>
          {adding ? '✕ Annuler' : '+ Ajouter'}
        </button>
      </div>

      {/* Add form */}
      {adding && (
        <div className={styles.addForm}>
          <div className={styles.addRow}>
            <Sel value={form.pair} onChange={v=>setForm(p=>({...p,pair:v}))} opts={['BTC/USDT','ETH/USDT','SOL/USDT','BNB/USDT']} />
            <Sel value={form.side} onChange={v=>setForm(p=>({...p,side:v}))} opts={['buy','sell']} />
            <Sel value={form.type} onChange={v=>setForm(p=>({...p,type:v}))} opts={['spot','futures','swap']} />
          </div>
          <div className={styles.addRow}>
            <Inp placeholder="Entrée" value={form.entry} onChange={v=>setForm(p=>({...p,entry:v}))} />
            <Inp placeholder="Sortie (opt)" value={form.exit} onChange={v=>setForm(p=>({...p,exit:v}))} />
            <Inp placeholder="Qté" value={form.qty} onChange={v=>setForm(p=>({...p,qty:v}))} />
            <Inp placeholder="Fee" value={form.fee} onChange={v=>setForm(p=>({...p,fee:v}))} />
          </div>
          <input className={styles.noteInp} placeholder="Note (optionnel)" value={form.note} onChange={e=>setForm(p=>({...p,note:e.target.value}))} />
          <button className={styles.saveBtn} onClick={addTrade}>Enregistrer le trade</button>
        </div>
      )}

      {/* Trade list */}
      <div className={styles.list}>
        {filtered.length === 0 && (
          <div className={styles.noTrades}>Aucun trade — utilise "+ Ajouter" ou connecte Bitunix pour le log automatique</div>
        )}
        {filtered.map(t => {
          const pnl = t.pnl !== null ? parseFloat(t.pnl) : null
          return (
            <div key={t.id} className={`${styles.row} ${t.status==='open'?styles.rowOpen:''}`}>
              <div className={styles.rowMain}>
                <span className={`${styles.side} ${t.side==='buy'?styles.buy:styles.sell}`}>
                  {t.side==='buy'?'↑':'↓'} {t.side.toUpperCase()}
                </span>
                <span className={styles.pair}>{t.pair}</span>
                <span className={styles.badge2}>{t.type}</span>
                <span className={styles.entry}>{fmtPx(t.entry)}</span>
                {t.exit && <span className={styles.arrow}>→ {fmtPx(t.exit)}</span>}
                {pnl !== null ? (
                  <span className={`${styles.pnl} ${pnl>=0?styles.pnlPos:styles.pnlNeg}`}>
                    {pnl>=0?'+':''}{pnl.toFixed(2)}$
                  </span>
                ) : (
                  <span className={styles.open}>OUVERT</span>
                )}
              </div>
              {t.note && <div className={styles.note}>{t.note}</div>}
              <div className={styles.rowActions}>
                <span className={styles.date}>{new Date(t.date).toLocaleDateString('fr')}</span>
                {t.status==='open' && (
                  <button className={styles.closeBtn} onClick={()=>closeTrade(t.id)}>Clore</button>
                )}
                <button className={styles.delBtn} onClick={()=>deleteTrade(t.id)}>✕</button>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

const StatCard = ({label,val,color}) => (
  <div className={styles.statCard}>
    <span className={styles.statL}>{label}</span>
    <span className={styles.statV} style={color?{color}:{}}>{val}</span>
  </div>
)
const Sel = ({value,onChange,opts}) => (
  <select className={styles.sel} value={value} onChange={e=>onChange(e.target.value)}>
    {opts.map(o=><option key={o} value={o}>{o}</option>)}
  </select>
)
const Inp = ({placeholder,value,onChange}) => (
  <input className={styles.inp} type="number" placeholder={placeholder} value={value} onChange={e=>onChange(e.target.value)} />
)
