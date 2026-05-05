import { useCallback } from 'react'
import { useStore } from '../store'
import { useWebSocket } from './useWebSocket'

export function useTicker() {
  const pair = useStore(s => s.pair)
  const setLastPx = useStore(s => s.setLastPx)
  const setTicker = useStore(s => s.setTicker)

  const onMessage = useCallback((data) => {
    const px = parseFloat(data.c)
    if (!isFinite(px)) return
    setLastPx(px)
    setTicker(data)
  }, [setLastPx, setTicker])

  useWebSocket(`${pair.toLowerCase()}@ticker`, onMessage)
}

export function useTrades() {
  const pair = useStore(s => s.pair)
  const addTrade = useStore(s => s.addTrade)

  const onMessage = useCallback((data) => {
    addTrade({
      p: parseFloat(data.p),
      q: parseFloat(data.q),
      buy: !data.m,
      t: new Date(data.T),
    })
  }, [addTrade])

  useWebSocket(`${pair.toLowerCase()}@aggTrade`, onMessage)
}
