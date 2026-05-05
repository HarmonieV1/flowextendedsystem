import { useState, useEffect, useCallback } from 'react'
import { hasApiKeys, placeOrder, getOpenOrders, getBalances, cancelOrder } from '../lib/binance'
import { useStore } from '../store'

export function useBinanceTrade() {
  const [apiConnected, setApiConnected] = useState(false)
  const [openOrders, setOpenOrders] = useState([])
  const [binanceBalances, setBinanceBalances] = useState([])
  const [loading, setLoading] = useState(false)
  const pair = useStore(s => s.pair)

  // Check if API keys are configured
  useEffect(() => {
    setApiConnected(hasApiKeys())
  }, [])

  // Load open orders + balances when API connected
  const refresh = useCallback(async () => {
    if (!hasApiKeys()) return
    try {
      const [orders, balances] = await Promise.all([
        getOpenOrders(pair),
        getBalances(),
      ])
      setOpenOrders(orders)
      setBinanceBalances(balances)
    } catch(e) {
      console.warn('Binance refresh failed:', e.message)
    }
  }, [pair])

  useEffect(() => {
    if (apiConnected) refresh()
  }, [apiConnected, refresh])

  // Execute order
  const executeOrder = useCallback(async ({ side, type, quantity, price, timeInForce }) => {
    if (!hasApiKeys()) throw new Error('API Binance non configurée')
    setLoading(true)
    try {
      const result = await placeOrder({
        symbol: pair,
        side,
        type,
        quantity: parseFloat(quantity).toFixed(6),
        price: price ? parseFloat(price).toFixed(2) : undefined,
        timeInForce,
      })
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

  return {
    apiConnected,
    setApiConnected,
    openOrders,
    binanceBalances,
    loading,
    executeOrder,
    cancelOrderById,
    refresh,
  }
}
