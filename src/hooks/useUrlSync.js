// Syncs pair and TF to URL hash for sharing
// URL format: #BTC/1h or #ETH/4h
import { useEffect } from 'react'
import { useStore } from '../store'

export function useUrlSync() {
  const pair  = useStore(s => s.pair)
  const tf    = useStore(s => s.tf)
  const setPair = useStore(s => s.setPair)
  const setTf   = useStore(s => s.setTf)

  // On mount — read URL hash and apply
  useEffect(() => {
    const hash = window.location.hash.slice(1) // e.g. "BTC/1h"
    if (!hash) return
    const [base, timeframe] = hash.split('/')
    if (base) {
      const p = base.toUpperCase() + 'USDT'
      setPair(p)
    }
    if (timeframe) {
      const valid = ['1m','5m','15m','1h','4h','1d']
      if (valid.includes(timeframe)) setTf(timeframe)
    }
  }, [])

  // On pair/TF change — update URL
  useEffect(() => {
    const base = pair.replace('USDT','')
    window.history.replaceState(null, '', `#${base}/${tf}`)
  }, [pair, tf])
}
