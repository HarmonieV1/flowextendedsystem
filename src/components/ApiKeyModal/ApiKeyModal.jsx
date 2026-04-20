import { useState } from 'react'
import { saveApiKeys, testApiKeys, clearApiKeys } from '../../lib/bitunix'
import styles from './ApiKeyModal.module.css'

export function ApiKeyModal({ onClose, onSuccess }) {
  const [apiKey, setApiKey] = useState('')
  const [secretKey, setSecretKey] = useState('')
  const [testing, setTesting] = useState(false)
  const [error, setError] = useState(null)
  const [step, setStep] = useState('form') // 'form' | 'success'

  const handleConnect = async () => {
    if (!apiKey.trim() || !secretKey.trim()) {
      setError('Les deux clés sont requises')
      return
    }
    setTesting(true)
    setError(null)
    saveApiKeys(apiKey.trim(), secretKey.trim())
    const result = await testApiKeys()
    setTesting(false)

    if (result.ok) {
      setStep('success')
      onSuccess?.()
    } else {
      clearApiKeys()
      setError(result.error?.includes('Invalid API') || result.error?.includes('-2014')
        ? 'Clé API invalide — vérifie que tu as bien copié les deux clés'
        : result.error?.includes('IP') || result.error?.includes('-2015')
          ? 'Restriction IP active sur la clé — désactive la restriction IP dans Binance'
          : result.error || 'Connexion échouée')
    }
  }

  return (
    <div className={styles.bg} onClick={onClose}>
      <div className={styles.modal} onClick={e => e.stopPropagation()}>

        {step === 'form' && (
          <>
            <div className={styles.hdr}>
              <span className={styles.title}>Connecter Bitunix</span>
              <button className={styles.closeBtn} onClick={onClose}>×</button>
            </div>

            {/* Instructions */}
            <div className={styles.instructions}>
              <div className={styles.instrTitle}>Comment créer une clé API Binance</div>
              <div className={styles.steps}>
                <div className={styles.instrStep}>
                  <span className={styles.stepNum}>1</span>
                  <span>Va sur <strong>Bitunix.com</strong> → Mon compte → Gestion des API</span>
                </div>
                <div className={styles.instrStep}>
                  <span className={styles.stepNum}>2</span>
                  <span>Crée une nouvelle clé API → nomme-la "FXS"</span>
                </div>
                <div className={styles.instrStep}>
                  <span className={styles.stepNum}>3</span>
                  <span>Active uniquement <strong>Lecture</strong> + <strong>Spot Trading</strong> — <span style={{color:'var(--red)'}}>jamais Retrait</span></span>
                </div>
                <div className={styles.instrStep}>
                  <span className={styles.stepNum}>4</span>
                  <span>Désactive la restriction IP pour commencer (ou ajoute l'IP de ta connexion)</span>
                </div>
                <div className={styles.instrStep}>
                  <span className={styles.stepNum}>5</span>
                  <span>Copie la clé API et la clé secrète ci-dessous</span>
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

              {error && <div className={styles.error}>⚠ {error}</div>}

              <button
                className={styles.connectBtn}
                onClick={handleConnect}
                disabled={testing || !apiKey || !secretKey}
              >
                {testing ? (
                  <><span className={styles.spinner} /> Test de connexion...</>
                ) : (
                  'Connecter Bitunix'
                )}
              </button>

              <div className={styles.disclaimer}>
                Permission <span style={{color:'var(--grn)'}}>Lecture ✓</span> · Spot Trading <span style={{color:'var(--grn)'}}>✓</span> · Retrait <span style={{color:'var(--red)'}}>✗ jamais</span>
              </div>
            </div>
          </>
        )}

        {step === 'success' && (
          <div className={styles.successStep}>
            <div className={styles.successIcon}>✓</div>
            <div className={styles.successTitle}>Bitunix connecté</div>
            <div className={styles.successSub}>
              Tes ordres passent maintenant directement sur Bitunix via ton compte.
              Les fonds restent dans ton compte Bitunix — FXS ne touche jamais à tes actifs.
            </div>
            <button className={styles.connectBtn} onClick={onClose}>Commencer à trader →</button>
          </div>
        )}

      </div>
    </div>
  )
}
