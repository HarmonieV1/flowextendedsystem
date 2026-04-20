import { useState, useEffect, useCallback } from 'react'
import { hasApiKeys, placeOrder, getOpenOrders, getBalances, cancelOrder } from '../lib/bitunix'
import { useStore } from '../store'

export function useBitunixTrade() {
  const [apiConnected, setApiConnected] = useState(false)
  const [openOrders, setOpenOrders] = useState([])
  const [balances, setBalances] = useState([])
  const [loading, setLoading] = useState(false)
  const pair = useStore(s => s.pair)

  useEffect(() => { setApiConnected(hasApiKeys()) }, [])

  const refresh = useCallback(async () => {
    if (!hasApiKeys()) return
    try {
      const [orders, bals] = await Promise.all([
        getOpenOrders(pair).catch(() => []),
        getBalances().catch(() => []),
      ])
      setOpenOrders(Array.isArray(orders) ? orders : [])
      setBalances(Array.isArray(bals) ? bals : [])
    } catch(e) {
      console.warn('Bitunix refresh:', e.message)
    }
  }, [pair])

  useEffect(() => { if (apiConnected) refresh() }, [apiConnected, refresh])

  const executeOrder = useCallback(async ({ side, type, quantity, price, timeInForce }) => {
    if (!hasApiKeys()) throw new Error('Clés API Bitunix non configurées')
    setLoading(true)
    try {
      const result = await placeOrder({ symbol: pair, side, type, quantity, price, timeInForce })
      await refresh()
      return result
    } finally {
      setLoading(false)
    }
  }, [pair, refresh])

  const cancelOrderById = useCallback(async (orderId) => {
    await cancelOrder(pair, orderId)
    await refresh()
  }, [pair, refresh])

  return { apiConnected, setApiConnected, openOrders, balances, loading, executeOrder, cancelOrderById, refresh }
}
