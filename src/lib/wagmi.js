import { createConfig, http } from 'wagmi'
import { mainnet, arbitrum, base, polygon, optimism } from 'wagmi/chains'
import { injected, coinbaseWallet, walletConnect } from 'wagmi/connectors'

// injected() détecte automatiquement:
// MetaMask, Phantom (EVM), Rabby, Brave Wallet, Trust Wallet, Frame, etc.
// coinbaseWallet = Coinbase Wallet + Base Wallet
// walletConnect = 400+ wallets dont Ledger, Rainbow, Zerion, Argent...

const WC_PROJECT_ID = import.meta.env.VITE_WALLETCONNECT_PROJECT_ID
  || '17af070cda2337317b0ca350f879c1e7'

export const wagmiConfig = createConfig({
  chains: [arbitrum, mainnet, base, polygon, optimism],
  transports: {
    [arbitrum.id]:  http('https://arb1.arbitrum.io/rpc'),
    [mainnet.id]:   http('https://cloudflare-eth.com'),
    [base.id]:      http('https://mainnet.base.org'),
    [polygon.id]:   http('https://polygon-rpc.com'),
    [optimism.id]:  http('https://mainnet.optimism.io'),
  },
  connectors: [
    injected({ shimDisconnect: true }),  // MetaMask, Phantom EVM, Rabby, Brave, Trust...
    coinbaseWallet({ appName: 'FXSEDGE', appLogoUrl: 'https://fxsedge.netlify.app/favicon.svg' }),
    walletConnect({ projectId: WC_PROJECT_ID, metadata: {
      name: 'FXSEDGE',
      description: 'Terminal de trading no-KYC',
      url: 'https://fxsedge.netlify.app',
      icons: ['https://fxsedge.netlify.app/favicon.svg'],
    }}),
  ],
})

export const SUPPORTED_CHAINS = [arbitrum, mainnet, base, polygon, optimism]
