import { useCallback } from 'react'
import { useAccount, useSignMessage } from 'wagmi'
import { useStore } from '../store'
import { supabase } from './supabase'

// Generates a SIWE message per EIP-4361
function buildSiweMessage({ address, chainId, nonce, issuedAt }) {
  return [
    `FXS Flow Extended System wants you to sign in with your Ethereum account:`,
    address,
    ``,
    `Sign in to FXS — no password, no email, no KYC.`,
    ``,
    `URI: ${window.location.origin}`,
    `Version: 1`,
    `Chain ID: ${chainId}`,
    `Nonce: ${nonce}`,
    `Issued At: ${issuedAt}`,
  ].join('\n')
}

function randomNonce(len = 16) {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
  return Array.from({ length: len }, () => chars[Math.floor(Math.random() * chars.length)]).join('')
}

export function useSiwe() {
  const { address, chain } = useAccount()
  const { signMessageAsync } = useSignMessage()
  const setConnected = useStore(s => s.setConnected)

  const signIn = useCallback(async () => {
    if (!address) throw new Error('No wallet connected')

    const nonce = randomNonce()
    const issuedAt = new Date().toISOString()
    const chainId = chain?.id ?? 1

    const message = buildSiweMessage({ address, chainId, nonce, issuedAt })

    // Prompt wallet to sign
    const signature = await signMessageAsync({ message })

    // Persist session to Supabase if available
    if (supabase) {
      await supabase.from('siwe_sessions').upsert({
        address,
        chain_id: chainId,
        nonce,
        issued_at: issuedAt,
        signature,
      })
    }

    setConnected(true, address)
    return { address, signature }
  }, [address, chain, signMessageAsync, setConnected])

  return { signIn }
}
