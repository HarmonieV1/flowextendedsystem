import { createConfig, http } from 'wagmi'
import { mainnet, arbitrum, base } from 'wagmi/chains'
import { injected, coinbaseWallet } from 'wagmi/connectors'

// IMPORTANT: On utilise injected() uniquement
// metaMask() importe @metamask/connect-evm (~900kb) qui fragmente le bundle
// injected() détecte MetaMask, Rabby, et tout wallet browser automatiquement
// Aucune dépendance externe = bundle mobile léger

export const wagmiConfig = createConfig({
  chains: [mainnet, arbitrum, base],
  transports: {
    [mainnet.id]:  http('https://cloudflare-eth.com'),
    [arbitrum.id]: http('https://arb1.arbitrum.io/rpc'),
    [base.id]:     http('https://mainnet.base.org'),
  },
  connectors: [
    injected({ shimDisconnect: true }),
    coinbaseWallet({ appName: 'FXSEDGE' }),
  ],
})

export const SUPPORTED_CHAINS = [mainnet, arbitrum, base]
