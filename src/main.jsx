import { StrictMode, Component } from 'react'
import { createRoot } from 'react-dom/client'
import { WagmiProvider } from 'wagmi'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { wagmiConfig } from './lib/wagmi'
import { initErrorMonitor } from './lib/errorMonitor'
import './index.css'
import App from './App.jsx'

// Init error monitoring
initErrorMonitor()

// ErrorBoundary global — catch tout sans crash total
class ErrorBoundary extends Component {
  state = { error: null }
  static getDerivedStateFromError(error) { return { error } }
  componentDidCatch(err, info) { console.error('[FXS] Crash caught:', err, info) }
  render() {
    if (this.state.error) {
      return (
        <div style={{padding:20,background:'#09090b',color:'#ff3b5c',fontFamily:'monospace',fontSize:12,minHeight:'100vh'}}>
          <div style={{color:'#8cc63f',fontSize:18,marginBottom:16}}>FXS — Erreur</div>
          <div>{this.state.error.message}</div>
          <button onClick={()=>{this.setState({error:null});location.reload()}} style={{marginTop:20,padding:'12px 24px',background:'#8cc63f',border:'none',borderRadius:8,color:'#000',fontWeight:700,cursor:'pointer'}}>Recharger</button>
        </div>
      )
    }
    return this.props.children
  }
}

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: false, staleTime: 30_000 } }
})

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ErrorBoundary>
      <WagmiProvider config={wagmiConfig}>
        <QueryClientProvider client={queryClient}>
          <App />
        </QueryClientProvider>
      </WagmiProvider>
    </ErrorBoundary>
  </StrictMode>
)

// Register Service Worker for push notifications + offline
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => {})
  })
}
