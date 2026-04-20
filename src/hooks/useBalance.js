import { useEffect } from 'react'
import { useAccount, useBalance as useWagmiBalance } from 'wagmi'
import { useStore } from '../store'

// USDT contract addresses per chain
const USDT_ADDRESSES = {
  1: '0xdAC17F958D2ee523a2206206994597C13D831ec7',        // Ethereum mainnet
  8453: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',      // Base (USDC used as proxy)
  42161: '0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9',     // Arbitrum
}

export function useOnChainBalance() {
  const { address, chain } = useAccount()
  const setBalance = useStore(s => s.setBalance)
  const connected = useStore(s => s.connected)

  const usdtAddress = USDT_ADDRESSES[chain?.id] ?? USDT_ADDRESSES[1]

  // Read USDT balance
  const { data: usdtBalance } = useWagmiBalance({
    address,
    token: usdtAddress,
    enabled: !!address && connected,
    watch: true,
  })

  // Read native ETH balance
  const { data: ethBalance } = useWagmiBalance({
    address,
    enabled: !!address && connected,
    watch: true,
  })

  useEffect(() => {
    if (!usdtBalance && !ethBalance) return
    // Use USDT balance as primary, fall back to ETH value
    const usdt = usdtBalance ? parseFloat(usdtBalance.formatted) : 0
    setBalance(usdt)
  }, [usdtBalance, ethBalance, setBalance])
}
