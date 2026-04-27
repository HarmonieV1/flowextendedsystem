import { useState, useEffect } from 'react'
import styles from './ClientPortal.module.css'

const STORAGE_KEY = 'fxs_copy_v2'
const CURRENT_PNL = 41.2

// Calcul PnL depuis la date de dépôt
function calcCapital(depositAmt, depositDate) {
  const days = Math.max(0, (Date.now() - new Date(depositDate)) / 86400000)
  const dailyRate = (CURRENT_PNL / 100) / 180
  return depositAmt * (1 + dailyRate * Math.min(days, 180))
}

function loadClient() {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY)) } catch { return null }
}
function saveClient(data) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...data, updatedAt: Date.now() }))
}

export function ClientPortal({ onClose }) {
  const [screen, setScreen] = useState('login')
  const [client, setClient] = useState(null)
  const [form, setForm]     = useState({ email:'', password:'', name:'', deposit:'', network:'tron', txHash:'' })
  const [error, setError]   = useState('')
  const [loading, setLoading] = useState(false)
  const [copied, setCopied]   = useState(false)

  useEffect(() => {
    const saved = loadClient()
    if (saved?.email) { setClient(saved); setScreen('dashboard') }
  }, [])

  const f = (k, v) => setForm(p => ({...p, [k]: v}))

  const register = async e => {
    e.preventDefault(); setError('')
    if (!form.name || !form.email || !form.password) { setError('Tous les champs sont requis'); return }
    if (form.password.length < 8) { setError('Mot de passe : 8 caractères minimum'); return }
    if (parseFloat(form.deposit) < 250) { setError('Dépôt minimum 250 USDT'); return }
    if (!form.txHash || form.txHash.length < 10) { setError('Hash de transaction invalide'); return }
    setLoading(true)
    await new Promise(r => setTimeout(r, 600)) // UX feedback
    const newClient = {
      email: form.email.toLowerCase().trim(),
      name: form.name.trim(),
      pwHash: btoa(form.password).split('').reverse().join(''), // obfuscation basique
      depositAmt: parseFloat(form.deposit),
      depositNetwork: form.network,
      txHash: form.txHash.trim(),
      depositDate: new Date().toISOString(),
      status: 'pending',
      id: Math.random().toString(36).slice(2),
    }
    saveClient(newClient)
    setClient(newClient)
    setScreen('pending')
    setLoading(false)
  }

  const login = async e => {
    e.preventDefault(); setError('')
    setLoading(true)
    await new Promise(r => setTimeout(r, 400))
    const saved = loadClient()
    if (!saved) { setError('Aucun compte trouvé sur cet appareil'); setLoading(false); return }
    const emailMatch = saved.email === form.email.toLowerCase().trim()
    const pwMatch = saved.pwHash === btoa(form.password).split('').reverse().join('')
    if (!emailMatch || !pwMatch) { setError('Email ou mot de passe incorrect'); setLoading(false); return }
    setClient(saved); setScreen('dashboard'); setLoading(false)
  }

  const logout = () => { setClient(null); setScreen('login'); setForm(f => ({...f, password:''})) }

  const currentCap = client ? calcCapital(client.depositAmt, client.depositDate) : 0
  const pnlAmt = currentCap - (client?.depositAmt || 0)
  const pnlPct = client?.depositAmt > 0 ? (pnlAmt / client.depositAmt * 100) : 0
  const commission = Math.max(0, pnlAmt) * 0.1
  const netPnl = pnlAmt - commission

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={e => e.stopPropagation()}>
        <div className={styles.modalHeader}>
          <div className={styles.modalTitle}>
            {screen === 'login'     && '🔐 Espace client'}
            {screen === 'register'  && '📋 Créer un compte'}
            {screen === 'pending'   && '⏳ En attente'}
            {screen === 'dashboard' && `👤 ${client?.name}`}
          </div>
          <button className={styles.closeBtn} onClick={onClose}>✕</button>
        </div>

        {/* ── LOGIN ── */}
        {screen === 'login' && (
          <div className={styles.body}>
            <p className={styles.bodyDesc}>Accède à l'évolution de ton capital dans le pool FXS.</p>
            {error && <div className={styles.errBox}>{error}</div>}
            <form onSubmit={login} className={styles.form}>
              <Field label="Email">
                <input className={styles.inp} type="email" value={form.email}
                  onChange={e => f('email', e.target.value)} placeholder="ton@email.com" required />
              </Field>
              <Field label="Mot de passe">
                <input className={styles.inp} type="password" value={form.password}
                  onChange={e => f('password', e.target.value)} placeholder="••••••••" required />
              </Field>
              <button className={styles.btnPrimary} type="submit" disabled={loading}>
                {loading ? 'Connexion...' : 'Se connecter'}
              </button>
            </form>
            <button className={styles.btnLink} onClick={() => { setScreen('register'); setError('') }}>
              Pas de compte ? Créer un espace client →
            </button>
          </div>
        )}

        {/* ── REGISTER ── */}
        {screen === 'register' && (
          <div className={styles.body}>
            <p className={styles.bodyDesc}>Crée ton espace client après avoir effectué ton dépôt.</p>
            {error && <div className={styles.errBox}>{error}</div>}
            <form onSubmit={register} className={styles.form}>
              <Field label="Prénom / Pseudo">
                <input className={styles.inp} type="text" value={form.name}
                  onChange={e => f('name', e.target.value)} placeholder="Ex: Jean" required />
              </Field>
              <Field label="Email">
                <input className={styles.inp} type="email" value={form.email}
                  onChange={e => f('email', e.target.value)} placeholder="ton@email.com" required />
              </Field>
              <Field label="Mot de passe (min 8 caractères)">
                <input className={styles.inp} type="password" value={form.password}
                  onChange={e => f('password', e.target.value)} placeholder="••••••••" required minLength={8} />
              </Field>
              <Field label="Réseau de dépôt">
                <div className={styles.netRow}>
                  <button type="button" className={`${styles.netBtn} ${form.network==='tron'?styles.netOn:''}`}
                    onClick={() => f('network','tron')}>◈ TRON TRC-20</button>
                  <button type="button" className={`${styles.netBtn} ${form.network==='eth'?styles.netOn:''}`}
                    onClick={() => f('network','eth')}>◈ ETH ERC-20</button>
                </div>
              </Field>
              <Field label="Montant déposé (USDT)">
                <input className={styles.inp} type="number" value={form.deposit}
                  onChange={e => f('deposit', e.target.value)} placeholder="Min 250" min="250" required />
              </Field>
              <Field label="Hash de transaction" hint="Prouve ton dépôt — tu le trouves sur TronScan ou Etherscan">
                <input className={styles.inp} type="text" value={form.txHash}
                  onChange={e => f('txHash', e.target.value)} placeholder="0x... ou hash TRON" required />
              </Field>
              <button className={styles.btnPrimary} type="submit" disabled={loading}>
                {loading ? 'Création...' : 'Créer mon espace client'}
              </button>
            </form>
            <button className={styles.btnLink} onClick={() => { setScreen('login'); setError('') }}>
              ← Retour connexion
            </button>
          </div>
        )}

        {/* ── PENDING ── */}
        {screen === 'pending' && (
          <div className={styles.body}>
            <div className={styles.pendingBlock}>
              <div className={styles.pendingIcon}>⏳</div>
              <div className={styles.pendingTitle}>Validation en cours</div>
              <div className={styles.pendingText}>
                Ton dépôt de <strong>${client?.depositAmt} USDT</strong> ({client?.depositNetwork?.toUpperCase()}) est en cours de vérification par Alpha_PRC.
                Ton espace sera activé sous 24h.
              </div>
              <div className={styles.txBox}>
                <span className={styles.txLabel}>Hash TX</span>
                <span className={styles.txVal}>{client?.txHash?.slice(0,22)}...</span>
              </div>
            </div>
            <button className={styles.btnLink} onClick={logout}>Se déconnecter</button>
          </div>
        )}

        {/* ── DASHBOARD ── */}
        {screen === 'dashboard' && client && (
          <div className={styles.body}>
            {/* Status */}
            <div className={styles.statusRow}>
              <div className={`${styles.statusBadge} ${client.status==='active'?styles.statusActive:styles.statusPending}`}>
                {client.status === 'active' ? '● Compte actif' : '○ En attente de validation'}
              </div>
              <span className={styles.memberSince}>
                Depuis {new Date(client.depositDate).toLocaleDateString('fr')}
              </span>
            </div>

            {client.status === 'active' ? (
              <>
                {/* Capital cards */}
                <div className={styles.capitalGrid}>
                  <CapCard label="Dépôt initial" val={`$${client.depositAmt.toLocaleString()}`} />
                  <CapCard label="Capital actuel" val={`$${currentCap.toFixed(2)}`} green big />
                </div>

                {/* PnL breakdown */}
                <div className={styles.pnlCard}>
                  <div className={styles.pnlRow}>
                    <span className={styles.pnlLabel}>PnL brut</span>
                    <span className={`${styles.pnlVal} ${pnlPct>=0?styles.pnlPos:styles.pnlNeg}`}>
                      {pnlPct>=0?'+':''}{pnlPct.toFixed(2)}% / +${pnlAmt.toFixed(2)}
                    </span>
                  </div>
                  <div className={styles.pnlRow}>
                    <span className={styles.pnlLabel}>Commission Alpha_PRC (10%)</span>
                    <span className={styles.pnlNeg}>-${commission.toFixed(2)}</span>
                  </div>
                  <div className={`${styles.pnlRow} ${styles.pnlTotal}`}>
                    <span className={styles.pnlLabel}>PnL net</span>
                    <span className={`${styles.pnlVal} ${netPnl>=0?styles.pnlPos:styles.pnlNeg}`}>
                      +${netPnl.toFixed(2)}
                    </span>
                  </div>
                </div>

                {/* Pool stats */}
                <div className={styles.poolStats}>
                  <div className={styles.poolStat}>
                    <span>Pool PnL total</span><span className={styles.green}>+{CURRENT_PNL}%</span>
                  </div>
                  <div className={styles.poolStat}>
                    <span>Win Rate</span><span>68%</span>
                  </div>
                  <div className={styles.poolStat}>
                    <span>Réseau</span><span>{client.depositNetwork?.toUpperCase()}</span>
                  </div>
                </div>

                {/* Withdraw CTA */}
                <div className={styles.withdrawBlock}>
                  <div className={styles.withdrawTitle}>Demander un retrait</div>
                  <div className={styles.withdrawText}>
                    Pour retirer ton capital + profits, contacte Alpha_PRC avec ton email de compte.
                    Délai : 48h pour liquider les positions.
                  </div>
                  <a href="mailto:contact@fxs.financial?subject=Demande de retrait Copy Trading"
                    className={styles.withdrawBtn}>
                    📨 Demander un retrait
                  </a>
                </div>
              </>
            ) : (
              <div className={styles.pendingBlock}>
                <div className={styles.pendingIcon} style={{fontSize:32}}>⏳</div>
                <div className={styles.pendingText}>
                  Dépôt de <strong>${client.depositAmt} USDT</strong> en cours de vérification.
                  Ton tableau de bord PnL sera disponible dès l'activation.
                </div>
                <div className={styles.txBox}>
                  <span className={styles.txLabel}>Hash TX</span>
                  <span className={styles.txVal}>{client.txHash?.slice(0,22)}...</span>
                </div>
              </div>
            )}

            <button className={styles.btnLogout} onClick={logout}>Se déconnecter</button>
          </div>
        )}
      </div>
    </div>
  )
}

function Field({ label, hint, children }) {
  return (
    <div className={styles.field}>
      <label className={styles.fieldLabel}>{label}</label>
      {hint && <span className={styles.fieldHint}>{hint}</span>}
      {children}
    </div>
  )
}

function CapCard({ label, val, green, big }) {
  return (
    <div className={styles.capCard}>
      <span className={styles.capLabel}>{label}</span>
      <span className={styles.capVal} style={{
        color: green ? 'var(--grn)' : 'var(--txt)',
        fontSize: big ? 22 : 16
      }}>{val}</span>
    </div>
  )
}
