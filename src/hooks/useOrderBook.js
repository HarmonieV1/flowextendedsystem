import { useCallback } from 'react'
import { useStore } from '../store'
import { useWebSocket } from './useWebSocket'

export function useOrderBook() {
  const pair = useStore(s => s.pair)
  const setBids = useStore(s => s.setBids)
  const setAsks = useStore(s => s.setAsks)

  const onMessage = useCallback((data) => {
    const bids = (data.bids || []).slice(0, 15)
      .map(r => [parseFloat(r[0]), parseFloat(r[1])])
    const asks = (data.asks || []).slice(0, 15)
      .map(r => [parseFloat(r[0]), parseFloat(r[1])])
    setBids(bids)
    setAsks(asks)
  }, [setBids, setAsks])

  useWebSocket(`${pair.toLowerCase()}@depth20@100ms`, onMessage)
}
