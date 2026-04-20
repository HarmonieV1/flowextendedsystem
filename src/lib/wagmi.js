import { getDefaultConfig } from '@rainbow-me/rainbowkit'
import { mainnet, base, arbitrum } from 'wagmi/chains'

export const wagmiConfig = getDefaultConfig({
  appName: 'FXS — Flow Extended System',
  projectId: import.meta.env.VITE_WALLETCONNECT_PROJECT_ID || 'fxs-dev',
  chains: [mainnet, base, arbitrum],
  ssr: false,
})

export const SUPPORTED_CHAINS = [mainnet, base, arbitrum]
