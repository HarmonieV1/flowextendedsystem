import { useEffect } from 'react'
import { useAccount, useBalance as useWagmiBalance } from 'wagmi'
import { useStore } from '../store'

export function useOnChainBalance() {
  const { address } = useAccount()
  const setBalance = useStore(s => s.setBalance)

  const { data: eth } = useWagmiBalance({
    address,
    query: { enabled: !!address },
  })

  useEffect(() => {
    if (!address || !eth) { setBalance(0); return }
    setBalance(parseFloat(eth.formatted) || 0)
  }, [eth, address, setBalance])
}
