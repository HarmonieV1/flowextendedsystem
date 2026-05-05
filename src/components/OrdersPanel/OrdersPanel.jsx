import { useState, useEffect } from 'react'
import { useStore } from '../../store'
import { hasApiKeys, getOpenOrders, getMyTrades, cancelOrder } from '../../lib/bitunix'
import { fmtPx, fmt, fmtTime } from '../../lib/format'
import styles from './OrdersPanel.module.css'

const TABS = ['Open Orders','Order History','Trade History']

export function OrdersPanel() {
  const [tab, setTab] = useState('Open Orders')
  const pair = useStore(s => s.pair)
  const [openOrders, setOpenOrders] = useState([])
  const [tradeHistory, setTradeHistory] = useState([])
  const [loading, setLoading] = useState(false)
  const [cancelling, setCancelling] = useState(null)
  const apiConnected = hasApiKeys()

  const load = async () => {
    if (!apiConnected) return
    setLoading(true)
    try {
      if (tab === 'Open Orders') {
        const orders = await getOpenOrders(pair).catch(() => [])
        setOpenOrders(Array.isArray(orders) ? orders : [])
      } else if (tab === 'Trade History') {
        const trades = await getMyTrades(pair, 30).catch(() => [])
        setTradeHistory(Array.isArray(trades) ? trades : [])
      }
    } finally { setLoading(false) }
  }

  useEffect(() => { load() }, [tab, pair, apiConnected])

  const handleCancel = async (orderId) => {
    setCancelling(orderId)
    try {
      await cancelOrder(pair, orderId)
      setOpenOrders(prev => prev.filter(o => o.orderId !== orderId))
    } catch(e) {
      console.warn('Cancel failed:', e.message)
    } finally { setCancelling(null) }
  }

  return (
    <div className={styles.wrap}>
      <div className={styles.tabs}>
        {TABS.map(t => (
          <button key={t} className={`${styles.tab} ${tab===t?styles.on:''}`} onClick={()=>setTab(t)}>{t}</button>
        ))}
        <div className={styles.spacer} />
        {apiConnected ? (
          <button className={styles.refreshBtn} onClick={load} disabled={loading}>
            {loading ? '⟳' : '↻'}
          </button>
        ) : (
          <span className={styles.hint}>Connecte Bitunix pour voir tes ordres</span>
        )}
      </div>

      <div className={styles.content}>
        {!apiConnected && (
          <div className={styles.emptyAction}>
            <span className={styles.emptyIcon}>🔑</span>
            <span className={styles.emptyText}>API Bitunix non configurée</span>
            <span className={styles.emptySub}>Connecte ton compte pour voir tes ordres en temps réel</span>
            <button className={styles.emptyBtn} onClick={() => {
              // Trigger the API key modal via a custom event
              window.dispatchEvent(new CustomEvent('fxs:openApiKey'))
            }}>Connecter Bitunix →</button>
          </div>
        )}

        {apiConnected && tab === 'Open Orders' && (
          openOrders.length === 0
            ? <Empty icon="📋" text="Aucun ordre ouvert" sub={`Pas d'ordres actifs sur ${pair.replace('USDT','/USDT')}`} />
            : (
              <div className={styles.tableWrap}>
                <div className={styles.thead}>
                  <span>Paire</span><span>Côté</span><span>Type</span>
                  <span>Prix</span><span>Qté</span><span>Rempli</span><span>Action</span>
                </div>
                {openOrders.map(o => (
                  <div key={o.orderId || o.id} className={styles.trow}>
                    <span className={styles.tdPair}>{(o.symbol||pair).replace('USDT','/USDT')}</span>
                    <span className={o.side==='BUY'||o.side==='buy'?styles.buy:styles.sell}>{o.side}</span>
                    <span className={styles.td}>{o.orderType||o.type||'—'}</span>
                    <span className={styles.td}>{o.price?fmtPx(o.price):'Market'}</span>
                    <span className={styles.td}>{fmt(parseFloat(o.qty||o.origQty||0),6)}</span>
                    <span className={styles.td}>{fmt(parseFloat(o.executedQty||o.filledQty||0),6)}</span>
                    <button
                      className={styles.cancelBtn}
                      disabled={cancelling===o.orderId}
                      onClick={() => handleCancel(o.orderId||o.id)}
                    >{cancelling===o.orderId?'...':'Annuler'}</button>
                  </div>
                ))}
              </div>
            )
        )}

        {apiConnected && tab === 'Order History' && (
          <Empty icon="🕐" text="Historique indisponible" sub="L'historique des ordres sera disponible dans la prochaine version" />
        )}

        {apiConnected && tab === 'Trade History' && (
          tradeHistory.length === 0
            ? <Empty icon="✅" text="Aucun trade" sub={`Pas de trades sur ${pair.replace('USDT','/USDT')}`} />
            : (
              <div className={styles.tableWrap}>
                <div className={styles.thead}>
                  <span>Paire</span><span>Côté</span><span>Prix</span>
                  <span>Qté</span><span>Total</span><span>Fee</span><span>Date</span>
                </div>
                {tradeHistory.map((t,i) => (
                  <div key={t.id||i} className={styles.trow}>
                    <span className={styles.tdPair}>{(t.symbol||pair).replace('USDT','/USDT')}</span>
                    <span className={t.isBuyer||t.side==='BUY'?styles.buy:styles.sell}>
                      {t.isBuyer||t.side==='BUY'?'BUY':'SELL'}
                    </span>
                    <span className={styles.td}>{fmtPx(t.price)}</span>
                    <span className={styles.td}>{fmt(parseFloat(t.qty||t.quantity||0),6)}</span>
                    <span className={styles.td}>${fmt(parseFloat(t.quoteQty||t.amount||0))}</span>
                    <span className={styles.td}>{fmt(parseFloat(t.commission||t.fee||0),6)}</span>
                    <span className={styles.td} style={{fontSize:9,color:'var(--txt3)'}}>
                      {t.time?fmtTime(new Date(t.time)):t.createdAt||'—'}
                    </span>
                  </div>
                ))}
              </div>
            )
        )}
      </div>
    </div>
  )
}

function Empty({ icon, text, sub }) {
  return (
    <div className={styles.empty}>
      <span className={styles.emptyIcon}>{icon}</span>
      <span className={styles.emptyText}>{text}</span>
      <span className={styles.emptySub}>{sub}</span>
    </div>
  )
}
