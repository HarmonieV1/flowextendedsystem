import { useState } from 'react'
import { saveApiKeys, testApiKeys, clearApiKeys } from '../../lib/bitunix'
import { saveBitgetKeys, clearBitgetKeys, bitgetFuturesBalance } from '../../lib/bitget'
import styles from './ApiKeyModal.module.css'

export function ApiKeyModal({ onClose, onSuccess, defaultExchange = 'bitunix' }) {
  const [exch, setExch] = useState(defaultExchange)
  const [apiKey, setApiKey] = useState('')
  const [secretKey, setSecretKey] = useState('')
  const [passphrase, setPassphrase] = useState('')
  const [testing, setTesting] = useState(false)
  const [error, setError] = useState(null)
  const [step, setStep] = useState('form')

  const isBitget = exch === 'bitget'
  const label = isBitget ? 'Bitget' : 'Bitunix'

  const handleConnect = async () => {
    if (!apiKey.trim() || !secretKey.trim()) {
      setError('Les clés API et Secrète sont requises')
      return
    }
    if (isBitget && !passphrase.trim()) {
      setError('La passphrase Bitget est requise')
      return
    }
    setTesting(true)
    setError(null)

    if (isBitget) {
      await saveBitgetKeys(apiKey.trim(), secretKey.trim(), passphrase.trim())
      try {
        await bitgetFuturesBalance()
        setStep('success')
        onSuccess?.()
        window.dispatchEvent(new Event('fxs:keysUpdated'))
      } catch (e) {
        clearBitgetKeys()
        const msg = e.message || ''
        if (msg.includes('40018') || msg.includes('signature'))
          setError('Signature invalide — vérifie ta clé secrète et passphrase')
        else if (msg.includes('40014') || msg.includes('key'))
          setError('Clé API invalide')
        else if (msg.includes('40015') || msg.includes('IP'))
          setError('Restriction IP active — désactive-la dans Bitget')
        else
          setError(msg || 'Connexion échouée')
      }
    } else {
      await saveApiKeys(apiKey.trim(), secretKey.trim())
      const result = await testApiKeys()
      if (result.ok) {
        setStep('success')
        onSuccess?.()
        window.dispatchEvent(new Event('fxs:keysUpdated'))
      } else {
        clearApiKeys()
        setError(result.error?.includes('Invalid API') || result.error?.includes('-2014')
          ? 'Clé API invalide — vérifie que tu as bien copié les deux clés'
          : result.error?.includes('IP') || result.error?.includes('-2015')
            ? 'Restriction IP active — désactive la restriction IP dans Bitunix'
            : result.error || 'Connexion échouée')
      }
    }
    setTesting(false)
  }

  const switchExch = (e) => {
    setExch(e)
    setApiKey(''); setSecretKey(''); setPassphrase('')
    setError(null)
  }

  return (
    <div className={styles.bg} onClick={onClose}>
      <div className={styles.modal} onClick={e => e.stopPropagation()}>

        {step === 'form' && (
          <>
            <div className={styles.hdr}>
              <span className={styles.title}>Connecter {label}</span>
              <button className={styles.closeBtn} onClick={onClose}>×</button>
            </div>

            {/* Exchange selector */}
            <div style={{display:'flex',gap:0,marginBottom:12,borderRadius:6,overflow:'hidden',border:'1px solid var(--brd)'}}>
              {['bitunix','bitget'].map(e => (
                <button key={e} onClick={()=>switchExch(e)} style={{
                  flex:1, padding:'8px', fontSize:11, fontWeight:700, border:'none',
                  background: exch===e ? 'var(--grn)' : 'var(--bg2)',
                  color: exch===e ? '#000' : 'var(--txt3)',
                  cursor:'pointer', transition:'.12s',
                }}>
                  {e === 'bitget' ? 'Bitget' : 'Bitunix'}
                </button>
              ))}
            </div>

            {/* Instructions */}
            <div className={styles.instructions}>
              <div className={styles.instrTitle}>Comment créer une clé API {label}</div>
              <div className={styles.steps}>
                <div className={styles.instrStep}>
                  <span className={styles.stepNum}>1</span>
                  <span>Va sur <strong>{isBitget ? 'Bitget.com' : 'Bitunix.com'}</strong> → {isBitget ? 'API Management' : 'Mon compte → Gestion des API'}</span>
                </div>
                <div className={styles.instrStep}>
                  <span className={styles.stepNum}>2</span>
                  <span>Crée une nouvelle clé API → nomme-la "FXS"</span>
                </div>
                <div className={styles.instrStep}>
                  <span className={styles.stepNum}>3</span>
                  <span>Active uniquement <strong>Lecture</strong> + <strong>{isBitget ? 'Futures Trading' : 'Spot Trading'}</strong> — <span style={{color:'var(--red)'}}>jamais Retrait</span></span>
                </div>
                {isBitget && (
                  <div className={styles.instrStep}>
                    <span className={styles.stepNum}>4</span>
                    <span>Note la <strong>passphrase</strong> que tu as choisie — elle ne peut pas être récupérée après</span>
                  </div>
                )}
                <div className={styles.instrStep}>
                  <span className={styles.stepNum}>{isBitget ? '5' : '4'}</span>
                  <span>Désactive la restriction IP pour commencer</span>
                </div>
                <div className={styles.instrStep}>
                  <span className={styles.stepNum}>{isBitget ? '6' : '5'}</span>
                  <span>Copie {isBitget ? 'les 3 champs' : 'les 2 clés'} ci-dessous</span>
                </div>
              </div>
            </div>

            <div className={styles.securityNote}>
              <span className={styles.secIcon}>🔒</span>
              <span>Tes clés sont stockées <strong>uniquement sur ton appareil</strong>, jamais envoyées à nos serveurs. Sans permission de retrait, tes fonds ne peuvent pas être déplacés.</span>
            </div>

            <div className={styles.form}>
              <div className={styles.fGrp}>
                <label className={styles.label}>Clé API</label>
                <input
                  className={styles.input}
                  type="text"
                  placeholder="Commence par une lettre..."
                  value={apiKey}
                  onChange={e => setApiKey(e.target.value)}
                  autoComplete="off"
                  spellCheck={false}
                />
              </div>
              <div className={styles.fGrp}>
                <label className={styles.label}>Clé Secrète</label>
                <input
                  className={styles.input}
                  type="password"
                  placeholder="••••••••••••••••"
                  value={secretKey}
                  onChange={e => setSecretKey(e.target.value)}
                  autoComplete="off"
                />
              </div>
              {isBitget && (
                <div className={styles.fGrp}>
                  <label className={styles.label}>Passphrase</label>
                  <input
                    className={styles.input}
                    type="password"
                    placeholder="Ta passphrase Bitget"
                    value={passphrase}
                    onChange={e => setPassphrase(e.target.value)}
                    autoComplete="off"
                  />
                </div>
              )}

              {error && <div className={styles.error}>⚠ {error}</div>}

              <button
                className={styles.connectBtn}
                onClick={handleConnect}
                disabled={testing || !apiKey || !secretKey || (isBitget && !passphrase)}
              >
                {testing ? (
                  <><span className={styles.spinner} /> Test de connexion...</>
                ) : (
                  `Connecter ${label}`
                )}
              </button>

              <div className={styles.disclaimer}>
                Permission <span style={{color:'var(--grn)'}}>Lecture ✓</span> · {isBitget ? 'Futures' : 'Spot'} Trading <span style={{color:'var(--grn)'}}>✓</span> · Retrait <span style={{color:'var(--red)'}}>✗ jamais</span>
              </div>
            </div>
          </>
        )}

        {step === 'success' && (
          <div className={styles.successStep}>
            <div className={styles.successIcon}>✓</div>
            <div className={styles.successTitle}>{label} connecté</div>
            <div className={styles.successSub}>
              Tes ordres passent maintenant directement sur {label} via ton compte.
              Les fonds restent dans ton compte {label} — FXSEDGE ne touche jamais à tes actifs.
            </div>
            <button className={styles.connectBtn} onClick={onClose}>Commencer à trader →</button>
          </div>
        )}

      </div>
    </div>
  )
}
