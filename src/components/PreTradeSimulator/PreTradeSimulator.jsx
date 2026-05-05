import { useState } from 'react'
import styles from './PreTradeSimulator.module.css'

// GoPlus Security API — vérifie les smart contracts
const GOPLUS_API = 'https://api.gopluslabs.io/api/v1/token_security/'

export function PreTradeSimulator() {
  const [address, setAddress] = useState('')
  const [chain, setChain] = useState('1')
  const [result, setResult] = useState(null)
  const [loading, setLoading] = useState(false)

  const scan = async () => {
    if (!address) return
    setLoading(true)
    setResult(null)
    try {
      const res = await fetch(`${GOPLUS_API}${chain}?contract_addresses=${address.toLowerCase()}`)
      const data = await res.json()
      const info = data?.result?.[address.toLowerCase()]
      if (info) {
        setResult({
          name: info.token_name || 'Unknown',
          symbol: info.token_symbol || '?',
          isHoneypot: info.is_honeypot === '1',
          canSell: info.is_honeypot !== '1',
          buyTax: parseFloat(info.buy_tax || 0) * 100,
          sellTax: parseFloat(info.sell_tax || 0) * 100,
          isOpenSource: info.is_open_source === '1',
          isProxy: info.is_proxy === '1',
          isMintable: info.is_mintable === '1',
          ownershipRenounced: info.can_take_back_ownership !== '1',
          hasBlacklist: info.is_blacklisted === '1',
          holders: parseInt(info.holder_count || 0),
          lpLocked: info.lp_holders?.some(h => h.is_locked === 1) || false,
          creatorPercent: parseFloat(info.creator_percent || 0) * 100,
          totalSupply: info.total_supply,
          safe: info.is_honeypot !== '1' && parseFloat(info.sell_tax || 0) < 0.1 && info.is_open_source === '1',
        })
      } else {
        setResult({ error: 'Token non trouvé ou non supporté sur cette chaîne' })
      }
    } catch (e) {
      setResult({ error: 'Erreur API: ' + e.message })
    }
    setLoading(false)
  }

  const Check = ({ label, ok, warn }) => (
    <div className={styles.checkRow}>
      <span className={styles.checkIcon} style={{color: ok ? '#8cc63f' : warn ? '#f59e0b' : '#ff3b5c'}}>
        {ok ? '✓' : warn ? '⚠' : '✕'}
      </span>
      <span className={styles.checkLabel}>{label}</span>
    </div>
  )

  return (
    <div className={styles.wrap}>
      <div className={styles.header}>
        <span className={styles.title}>🛡️ Pre-Trade Simulator</span>
        <span className={styles.sub}>Vérifie un token avant d'acheter</span>
      </div>

      <div className={styles.form}>
        <div className={styles.inputRow}>
          <select className={styles.chainSelect} value={chain} onChange={e => setChain(e.target.value)}>
            <option value="1">Ethereum</option>
            <option value="56">BSC</option>
            <option value="42161">Arbitrum</option>
            <option value="8453">Base</option>
            <option value="137">Polygon</option>
          </select>
          <input className={styles.input} placeholder="Contract address (0x...)"
            value={address} onChange={e => setAddress(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && scan()}
          />
          <button className={styles.scanBtn} onClick={scan} disabled={loading}>
            {loading ? '...' : '🔍 Scan'}
          </button>
        </div>
      </div>

      {result && !result.error && (
        <div className={styles.result}>
          <div className={styles.tokenHeader}>
            <div>
              <div className={styles.tokenName}>{result.name} ({result.symbol})</div>
              <div className={styles.tokenHolders}>{result.holders.toLocaleString()} holders</div>
            </div>
            <div className={`${styles.verdict} ${result.safe ? styles.safe : styles.unsafe}`}>
              {result.safe ? '✓ SAFE TO TRADE' : '⚠ RISKY'}
            </div>
          </div>

          <div className={styles.checks}>
            <Check label={`Honeypot: ${result.isHoneypot ? 'YES ← DANGER' : 'No'}`} ok={!result.isHoneypot} />
            <Check label={`Can sell: ${result.canSell ? 'Yes' : 'NO ← BLOCKED'}`} ok={result.canSell} />
            <Check label={`Buy tax: ${result.buyTax.toFixed(1)}%`} ok={result.buyTax < 5} warn={result.buyTax >= 5 && result.buyTax < 15} />
            <Check label={`Sell tax: ${result.sellTax.toFixed(1)}%`} ok={result.sellTax < 5} warn={result.sellTax >= 5 && result.sellTax < 15} />
            <Check label={`Open source: ${result.isOpenSource ? 'Yes' : 'No'}`} ok={result.isOpenSource} />
            <Check label={`Proxy contract: ${result.isProxy ? 'Yes ← modifiable' : 'No'}`} ok={!result.isProxy} warn={result.isProxy} />
            <Check label={`Mintable: ${result.isMintable ? 'Yes ← can inflate' : 'No'}`} ok={!result.isMintable} warn={result.isMintable} />
            <Check label={`Ownership: ${result.ownershipRenounced ? 'Renounced ✓' : 'Not renounced'}`} ok={result.ownershipRenounced} warn={!result.ownershipRenounced} />
            <Check label={`Blacklist: ${result.hasBlacklist ? 'Has blacklist' : 'No blacklist'}`} ok={!result.hasBlacklist} warn={result.hasBlacklist} />
            <Check label={`LP Locked: ${result.lpLocked ? 'Yes ✓' : 'Unknown'}`} ok={result.lpLocked} warn={!result.lpLocked} />
            <Check label={`Creator holds: ${result.creatorPercent.toFixed(1)}%`} ok={result.creatorPercent < 5} warn={result.creatorPercent >= 5 && result.creatorPercent < 20} />
          </div>
        </div>
      )}

      {result?.error && (
        <div className={styles.error}>{result.error}</div>
      )}

      {!result && !loading && (
        <div className={styles.empty}>
          <div style={{fontSize:40,marginBottom:8}}>🛡️</div>
          <div style={{fontSize:12,fontWeight:700,color:'var(--txt)'}}>Colle l'adresse du contrat</div>
          <div style={{fontSize:10,color:'var(--txt3)',marginTop:4}}>Le scanner vérifie : honeypot, tax, mintable, blacklist, LP lock, ownership</div>
          <div style={{fontSize:9,color:'var(--txt3)',marginTop:8}}>Powered by GoPlus Security API</div>
        </div>
      )}
    </div>
  )
}
