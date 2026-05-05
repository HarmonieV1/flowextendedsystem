import { useEffect, useRef, useCallback } from 'react'

const RECONNECT_DELAY = 3000
const BINANCE_WS = 'wss://stream.binance.com:9443/ws/'

export function useWebSocket(streamPath, onMessage, enabled = true) {
  const wsRef = useRef(null)
  const timerRef = useRef(null)
  const mountedRef = useRef(true)

  const connect = useCallback(() => {
    if (!enabled || !streamPath || !mountedRef.current) return

    const ws = new WebSocket(BINANCE_WS + streamPath)
    wsRef.current = ws

    ws.onmessage = (e) => {
      try { onMessage(JSON.parse(e.data)) } catch (_) {}
    }

    ws.onclose = () => {
      if (!mountedRef.current) return
      timerRef.current = setTimeout(connect, RECONNECT_DELAY)
    }

    ws.onerror = () => {
      try { ws.close() } catch (_) {}
    }
  }, [streamPath, onMessage, enabled])

  useEffect(() => {
    mountedRef.current = true
    connect()
    return () => {
      mountedRef.current = false
      clearTimeout(timerRef.current)
      if (wsRef.current) {
        wsRef.current.onclose = null
        try { wsRef.current.close() } catch (_) {}
      }
    }
  }, [connect])
}

// Generic external WS (Bybit, OKX)
export function useExternalWS(url, onOpen, onMessage) {
  const wsRef = useRef(null)

  useEffect(() => {
    if (!url) return
    const ws = new WebSocket(url)
    wsRef.current = ws
    ws.onopen = () => onOpen(ws)
    ws.onmessage = (e) => {
      try { onMessage(JSON.parse(e.data)) } catch (_) {}
    }
    return () => {
      ws.onclose = null
      try { ws.close() } catch (_) {}
    }
  }, [url])
}
