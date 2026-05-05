import { useEffect, useRef, useCallback } from 'react'
import { useStore } from '../store'

const BINANCE_REST = 'https://api.binance.com/api/v3/klines'
const BINANCE_WS = 'wss://stream.binance.com:9443/ws/'

export function useKlines() {
  const pair = useStore(s => s.pair)
  const tf = useStore(s => s.tf)
  const setKlines = useStore(s => s.setKlines)
  const updateLastKline = useStore(s => s.updateLastKline)

  const wsRef = useRef(null)
  const mountedRef = useRef(true)

  // Fetch REST history then open WS
  const load = useCallback(async () => {
    if (!mountedRef.current) return

    // Close existing WS
    if (wsRef.current) {
      wsRef.current.onclose = null
      try { wsRef.current.close() } catch (_) {}
      wsRef.current = null
    }

    // Clear klines immediately for clean state
    setKlines([])

    // REST — instant render
    try {
      const res = await fetch(`${BINANCE_REST}?symbol=${pair}&interval=${tf}&limit=1000`)
      const raw = await res.json()
      if (!mountedRef.current || !Array.isArray(raw)) return
      const candles = raw
        .map(r => ({
          t: r[0],
          o: parseFloat(r[1]), h: parseFloat(r[2]),
          l: parseFloat(r[3]), c: parseFloat(r[4]),
          v: parseFloat(r[5]),
        }))
        .filter(c => isFinite(c.c) && isFinite(c.h) && isFinite(c.l))
      setKlines(candles)
    } catch (e) {
      console.warn('klines REST failed', e)
    }

    // WS — live updates
    if (!mountedRef.current) return
    const ws = new WebSocket(`${BINANCE_WS}${pair.toLowerCase()}@kline_${tf}`)
    wsRef.current = ws

    ws.onmessage = (e) => {
      try {
        const k = JSON.parse(e.data).k
        const c = {
          t: k.t,
          o: parseFloat(k.o), h: parseFloat(k.h),
          l: parseFloat(k.l), c: parseFloat(k.c),
          v: parseFloat(k.v),
        }
        if (isFinite(c.c)) updateLastKline(c)
      } catch (_) {}
    }

    ws.onclose = () => {
      if (mountedRef.current) setTimeout(load, 3000)
    }
  }, [pair, tf])

  useEffect(() => {
    mountedRef.current = true
    load()
    return () => {
      mountedRef.current = false
      if (wsRef.current) {
        wsRef.current.onclose = null
        try { wsRef.current.close() } catch (_) {}
      }
    }
  }, [load])
}
