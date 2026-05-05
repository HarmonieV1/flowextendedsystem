// Syncs pair and TF to URL hash for sharing
// URL format: #BTC/1h or #ETH/4h
// Guards against Telegram WebApp data injection in hash
import { useEffect } from 'react'
import { useStore } from '../store'

const VALID_PAIRS = [
  'BTC','ETH','SOL','BNB','XRP','DOGE','ADA','AVAX',
  'LINK','ARB','DOT','MATIC','LTC','UNI','AAVE','NEAR',
  'APT','SUI','PEPE','WIF','BONK','JUP','RENDER','FET',
]
const VALID_TFS = ['1m','5m','15m','1h','4h','1d']

export function useUrlSync() {
  const pair    = useStore(s => s.pair)
  const tf      = useStore(s => s.tf)
  const setPair = useStore(s => s.setPair)
  const setTf   = useStore(s => s.setTf)

  // On mount — read URL hash safely
  useEffect(() => {
    const hash = window.location.hash.slice(1)
    if (!hash) return

    // Guard: ignore Telegram WebApp data, query strings, or long hashes
    if (hash.includes('=') || hash.includes('TGWEB') || hash.length > 20) return

    const [base, timeframe] = hash.split('/')
    if (base && VALID_PAIRS.includes(base.toUpperCase())) {
      setPair(base.toUpperCase() + 'USDT')
    }
    if (timeframe && VALID_TFS.includes(timeframe)) {
      setTf(timeframe)
    }
  }, [])

  // On pair/TF change — update URL cleanly
  useEffect(() => {
    const base = pair.replace('USDT','')
    if (VALID_PAIRS.includes(base)) {
      window.history.replaceState(null, '', `#${base}/${tf}`)
    }
  }, [pair, tf])
}
