import { ClientPortal } from './ClientPortal'
import { useState } from 'react'
import { DCABot } from '../DCABot/DCABot'
import { useStore } from '../../store'
import { fmt, fmtPx } from '../../lib/format'
import styles from './CopyTrading.module.css'

const DEPOSIT_TRON = 'TFu3sHnfUcUBPzT3piHh2s3oH6Q1Fi3ziH'
const DEPOSIT_ETH  = '0x7109b5Eec69cB071803a7ff0657257e25c56E010'
const DEPOSIT_SOL  = '7n6MSbzKWXT9oTLBNXrKX548Ejg1rPYx1aeyQFdN9ji4'
const CURRENT_PNL_PCT = 26.8
const POOL_AMOUNT     = 32948  // USDC total dans la pool
const MIN_DEPOSIT = 250

const MASTER = {
  name: 'Alpha_PRC', avatar: '⚡', badge: 'MASTER',
  bio: 'Trader 8 ans · Indicateur FXSEDGE publié · Spécialiste BTC/ETH',
  stats: {
    pnlTotal: `+${CURRENT_PNL_PCT}%`, pnlMonth: '+8.2%', pnlWeek: '+2.1%',
    winRate: '61%', sharpe: '2.4', maxDD: '-12%', trades: 627,
  },
}

const RECENT_TRADES = [
  { pair:'BTC/USDT', side:'long',  entry:71200, exit:75400, pnl:'+5.89%', date:'Il y a 2h'  },
  { pair:'ETH/USDT', side:'short', entry:3480,  exit:3210,  pnl:'+7.76%', date:'Il y a 1j'  },
  { pair:'SOL/USDT', side:'long',  entry:138,   exit:152,   pnl:'+10.14%',date:'Il y a 2j'  },
  { pair:'BTC/USDT', side:'long',  entry:69800, exit:71200, pnl:'+2.00%', date:'Il y a 3j'  },
]

const TABS = ['📊 Pool FXSEDGE', '🔄 Copy Traders', 'Mon Copy', '🤖 DCA Bot', '👤 Espace Membre', 'Comment ça marche']

const QR = (text) => `https://api.qrserver.com/v1/create-qr-code/?size=140x140&data=${encodeURIComponent(text)}&bgcolor=09090b&color=00e5a0&margin=8`

// ── Copy Trading classique — 4 traders à copier ─────────────────────────────
const TOP_TRADERS = [
  {
    id: 'alpha',
    name: 'Alpha_0x',
    wallet: '0x1283...42b1',
    pnl30d: 26.8,
    pnlUsd: 32948,
    trades: 47,
    winRate: 61,
    avgLev: 8.2,
    tags: ['BTC','ETH','SOL'],
    desc: 'Swing trader · Tendance + momentum · Max DD 12%',
    color: '#8cc63f',
    badge: '⚡ VOUS',
  },
  {
    id: 'zeus',
    name: 'Zeus_Capital',
    wallet: '0x8f2a...1c44',
    pnl30d: 22.7,
    pnlUsd: 18420,
    trades: 31,
    winRate: 71,
    avgLev: 5.0,
    tags: ['ETH','ARB'],
    desc: 'Position trader · DCA · Faible drawdown',
    color: '#6366f1',
    badge: '🏆 Top',
  },
  {
    id: 'flash',
    name: 'FlashPerps',
    wallet: '0x3b9c...8f11',
    pnl30d: 58.2,
    pnlUsd: 41200,
    trades: 183,
    winRate: 54,
    avgLev: 20.0,
    tags: ['BTC','SOL'],
    desc: 'Scalper · Haute fréquence · Risque élevé',
    color: '#f59e0b',
    badge: '🔥 Actif',
  },
  {
    id: 'nova',
    name: 'Nova_Hedge',
    wallet: '0x7d3e...2a98',
    pnl30d: 14.1,
    pnlUsd: 9870,
    trades: 22,
    winRate: 77,
    avgLev: 3.0,
    tags: ['BTC','LINK'],
    desc: 'Long only · Low leverage · Sécurisé',
    color: '#2d6af6',
    badge: '🛡️ Safe',
  },
]

export function CopyTrading({ onOpenWallet, onConnectWallet, isPremium, supaUser }) {
  onConnectWallet = onConnectWallet || onOpenWallet
  const connected = useStore(s => s.connected)
  const [tab, setTab]           = useState('🔄 Copy Traders')
  const [network, setNetwork]   = useState('tron') // 'tron' | 'eth' | 'sol'
  const [copiedTron, setCopiedTron] = useState(false)
  const [copiedEth,  setCopiedEth]  = useState(false)
  const [portalOpen, setPortalOpen] = useState(false)
  const [selTrader, setSelTrader]   = useState(null)
  const [copyAlloc, setCopyAlloc]   = useState('100')
  const [copyLev,   setCopyLev]     = useState('10')
  const [activeCopies, setActiveCopies] = useState(() => {
    try { return JSON.parse(localStorage.getItem('fxs_copies') || '[]') } catch { return [] }
  })

  const PREMIUM_TABS = ['📊 Pool FXSEDGE', 'Mon Copy', '👤 Espace Membre']
  const isTabLocked = (t) => PREMIUM_TABS.includes(t) && !isPremium

  const saveCopies = (arr) => {
    localStorage.setItem('fxs_copies', JSON.stringify(arr))
    setActiveCopies(arr)
  }
  const startCopy = (trader) => {
    if (activeCopies.find(c => c.id === trader.id)) return
    saveCopies([...activeCopies, { id:trader.id, name:trader.name, alloc:parseFloat(copyAlloc)||100, lev:parseFloat(copyLev)||10, since:Date.now() }])
  }
  const stopCopy = (id) => saveCopies(activeCopies.filter(c => c.id !== id))

  const copyAddr = (addr, setter) => {
    navigator.clipboard.writeText(addr).catch(() => {})
    setter(true)
    setTimeout(() => setter(false), 2000)
  }

  const activeAddr = network === 'tron' ? DEPOSIT_TRON : network === 'eth' ? DEPOSIT_ETH : DEPOSIT_SOL
  const activeNet  = network === 'tron' ? 'TRON TRC-20' : network === 'eth' ? 'Ethereum ERC-20' : 'Solana SPL'
  const activeToken = network === 'tron' ? 'USDT TRC-20' : network === 'eth' ? 'USDT ERC-20' : 'USDT SPL'

  return (
    <div className={styles.wrap}>
      <div className={styles.header}>
        <div className={styles.headerLeft}>
          <span className={styles.title}>Copy Trading</span>
          <span className={styles.beta}>BETA</span>
        </div>
        <div className={styles.pnlHeader}>
          <span className={styles.pnlBig}>+{CURRENT_PNL_PCT}%</span>
          <span className={styles.pnlSub}>PnL depuis le lancement</span>
        </div>
      </div>

      <div className={styles.tabs}>
        {TABS.map(t => (
          <button key={t} className={`${styles.tab} ${tab===t?styles.tabOn:''} ${isTabLocked(t)?styles.tabLocked:''}`}
            onClick={()=> isTabLocked(t) ? null : setTab(t)}
            title={isTabLocked(t) ? 'Réservé aux membres Premium' : ''}
          >{isTabLocked(t) ? '🔒 ' : ''}{t}</button>
        ))}
      </div>

      <div className={styles.content}>

        {/* Premium gate */}
        {PREMIUM_TABS.includes(tab) && !isPremium && (
          <div style={{display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',padding:'60px 20px',textAlign:'center',gap:16}}>
            <div style={{fontSize:48}}>🔒</div>
            <div style={{fontSize:18,fontWeight:800,color:'var(--txt)'}}>Espace Premium</div>
            <div style={{fontSize:12,color:'var(--txt3)',maxWidth:320,lineHeight:1.6}}>
              La Pool FXSEDGE, Mon Copy et l'Espace Membre sont réservés aux membres Premium.
              {!supaUser && ' Connecte-toi d\'abord pour accéder.'}
            </div>
            <div style={{fontSize:11,color:'var(--grn)',padding:'8px 20px',border:'1px solid rgba(140,198,63,.3)',borderRadius:8,background:'rgba(140,198,63,.05)'}}>
              Upgrade → 30 jours d'essai gratuit à l'inscription
            </div>
          </div>
        )}

        {/* ── POOL FXS ── */}
        {tab === '📊 Pool FXSEDGE' && isPremium && (
          <div className={styles.poolSection}>

            {/* Stats bar */}
            <div className={styles.statsBar}>
              <StatBox label="Pool FXSEDGE" value={`$${POOL_AMOUNT.toLocaleString('fr-FR')} USDC`} />
              <StatBox label="PnL Total"    val={`+${CURRENT_PNL_PCT}%`} green big />
              <StatBox label="Ce mois"      val="+18.4%"  green />
              <StatBox label="Cette semaine" val="+4.2%"  green />
              <StatBox label="Win Rate"     val="68%" />
              <StatBox label="Sharpe"       val="2.4" />
              <StatBox label="Max Drawdown" val="-12%"    red />
            </div>

            {/* Deposit section */}
            <div className={styles.depositCard}>
              <div className={styles.depositHeader}>
                <span className={styles.depositTitle}>Déposer dans le Pool FXSEDGE</span>
                <span className={styles.depositMin}>Minimum {MIN_DEPOSIT} USDT</span>
              </div>

              {/* Network selector */}
              <div className={styles.networkSel} style={{gridTemplateColumns:'1fr 1fr 1fr'}}>
                <button
                  className={`${styles.netBtn} ${network==='tron'?styles.netOn:''}`}
                  onClick={() => setNetwork('tron')}
                >
                  <span className={styles.netIcon} style={{color:'#ef4444'}}>◈</span>
                  TRON TRC-20
                  <span className={styles.netFee}>Frais ~$1</span>
                </button>
                <button
                  className={`${styles.netBtn} ${network==='eth'?styles.netOn:''}`}
                  onClick={() => setNetwork('eth')}
                >
                  <span className={styles.netIcon} style={{color:'#627eea'}}>◈</span>
                  Ethereum ERC-20
                  <span className={styles.netFee}>Frais ~$5-15</span>
                </button>
                <button
                  className={`${styles.netBtn} ${network==='sol'?styles.netOn:''}`}
                  onClick={() => setNetwork('sol')}
                >
                  <span className={styles.netIcon} style={{color:'#9945ff'}}>◈</span>
                  Solana SPL
                  <span className={styles.netFee}>Frais ~$0.01</span>
                </button>
              </div>

              {/* QR + Address */}
              <div className={styles.depositBody}>
                <div className={styles.qrWrap}>
                  <img src={QR(activeAddr)} alt="QR" width="140" height="140" className={styles.qrImg} />
                  <span className={styles.qrNet}>{activeNet}</span>
                </div>

                <div className={styles.addrBlock}>
                  <div className={styles.addrLabel}>
                    Adresse {activeNet} — {activeToken} uniquement
                  </div>
                  <div className={styles.addrBox}>
                    <span className={styles.addr}>{activeAddr}</span>
                    <button
                      className={styles.copyBtn}
                      onClick={() => copyAddr(activeAddr, network==='tron'?setCopiedTron:setCopiedEth)}
                    >
                      {(network==='tron'?copiedTron:copiedEth) ? '✓ Copié' : 'Copier'}
                    </button>
                  </div>

                  <div className={styles.warning}>
                    ⚠ Envoie uniquement de l'<strong>{activeToken}</strong> sur ce réseau.
                    Tout autre token ou réseau = perte définitive.
                  </div>

                  <div className={styles.terms}>
                    <Term icon="✓" text={`Dépôt minimum : ${MIN_DEPOSIT} USDT`} />
                    <Term icon="✓" text="Retrait sur demande — délai 48h" />
                    <Term icon="✓" text="Commission : 10% des profits uniquement" />
                    <Term icon="✓" text="Zéro commission si le pool perd" />
                  </div>
                </div>
              </div>

              {/* Contact */}
              <div className={styles.contactNote}>
                <span>📨</span>
                <span>Après ton dépôt, contacte Alpha_PRC pour confirmer et être ajouté au pool.</span>
              </div>
            </div>

          </div>
        )}

        {/* ── MON COPY ── */}
        {/* ── COPY TRADERS CLASSIQUE ── */}
        {tab === '🔄 Copy Traders' && (
          <div className={styles.poolSection}>
            <div className={styles.statsBar}>
              <StatBox label="Meilleur 30j" value="+58.2%" green/>
              <StatBox label="Win rate moy." value="67.5%"/>
              <StatBox label="Actifs" value={activeCopies.length + '/4'}/>
            </div>
            <div style={{display:'flex',flexDirection:'column',gap:10,padding:'10px 14px'}}>
              {TOP_TRADERS.map(t => {
                const isActive = activeCopies.find(cp => cp.id === t.id)
                return (
                  <div key={t.id}
                    style={{background:'var(--bg1)',border:`1px solid ${selTrader?.id===t.id?t.color:'var(--brd)'}`,borderRadius:10,padding:14,cursor:'pointer',display:'flex',flexDirection:'column',gap:10,transition:'all .15s'}}
                    onClick={()=>setSelTrader(selTrader?.id===t.id?null:t)}
                  >
                    <div style={{display:'flex',alignItems:'center',gap:10}}>
                      <div style={{width:38,height:38,borderRadius:'50%',background:t.color+'22',color:t.color,display:'flex',alignItems:'center',justifyContent:'center',fontWeight:800,fontSize:16,flexShrink:0}}>{t.name[0]}</div>
                      <div style={{flex:1}}>
                        <div style={{display:'flex',alignItems:'center',gap:6,flexWrap:'wrap'}}>
                          <span style={{fontWeight:800,color:'var(--txt)',fontSize:13}}>{t.name}</span>
                          <span style={{fontSize:9,fontWeight:700,padding:'2px 6px',background:t.color+'22',color:t.color,borderRadius:4}}>{t.badge}</span>
                        </div>
                        <div style={{fontSize:10,color:'var(--txt3)',fontFamily:'var(--mono)',marginTop:2}}>{t.wallet}</div>
                      </div>
                      <div style={{textAlign:'right',flexShrink:0}}>
                        <div style={{fontFamily:'var(--mono)',fontSize:16,fontWeight:800,color:'var(--grn)'}}>+{t.pnl30d}%</div>
                        <div style={{fontSize:10,color:'var(--txt3)',fontFamily:'var(--mono)'}}>+${(t.pnlUsd/1000).toFixed(1)}K</div>
                      </div>
                    </div>
                    <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:6}}>
                      {[['Trades',t.trades],['Win rate',t.winRate+'%'],['Levier moy.',t.avgLev+'×']].map(([l,v])=>(
                        <div key={l} style={{background:'var(--bg2)',borderRadius:6,padding:'6px 8px'}}>
                          <div style={{fontSize:9,color:'var(--txt3)',textTransform:'uppercase'}}>{l}</div>
                          <div style={{fontSize:12,fontWeight:700,fontFamily:'var(--mono)',color:'var(--txt)',marginTop:2}}>{v}</div>
                        </div>
                      ))}
                    </div>
                    <div style={{display:'flex',gap:5,flexWrap:'wrap'}}>
                      {t.tags.map(tag=><span key={tag} style={{fontSize:9,fontWeight:700,padding:'2px 8px',background:'rgba(140,198,63,.08)',border:'1px solid rgba(140,198,63,.2)',borderRadius:4,color:'var(--grn)',fontFamily:'var(--mono)'}}>{tag}</span>)}
                    </div>
                    <div style={{fontSize:11,color:'var(--txt3)'}}>{t.desc}</div>
                    {isActive && selTrader?.id !== t.id && (
                      <div style={{display:'flex',alignItems:'center',gap:8,padding:'6px 10px',background:'rgba(140,198,63,.08)',borderRadius:6}}>
                        <span style={{fontSize:9,background:'var(--grn)',color:'#000',padding:'2px 6px',borderRadius:3,fontWeight:800}}>ACTIF</span>
                        <span style={{fontSize:10,color:'var(--grn)'}}>{isActive.alloc} USDC · Max {isActive.lev}×</span>
                        <button onClick={e=>{e.stopPropagation();stopCopy(t.id)}} style={{marginLeft:'auto',background:'transparent',border:'none',color:'var(--txt3)',cursor:'pointer',fontSize:13}}>✕</button>
                      </div>
                    )}
                    {selTrader?.id===t.id && (
                      <div style={{background:'var(--bg2)',borderRadius:8,padding:12,display:'flex',flexDirection:'column',gap:10}} onClick={e=>e.stopPropagation()}>
                        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8}}>
                          <div>
                            <div style={{fontSize:10,color:'var(--txt3)',marginBottom:4}}>Allocation (USDC)</div>
                            <div style={{display:'flex',alignItems:'center',background:'var(--bg1)',border:'1px solid var(--brd)',borderRadius:6,overflow:'hidden'}}>
                              <input type="number" value={copyAlloc} onChange={e=>setCopyAlloc(e.target.value)} style={{flex:1,background:'transparent',border:'none',color:'var(--txt)',padding:'8px 10px',fontFamily:'var(--mono)',fontSize:13,outline:'none',minWidth:0}} min="10" placeholder="100"/>
                              <span style={{padding:'0 10px',color:'var(--txt3)',fontSize:11,borderLeft:'1px solid var(--brd)'}}>USDC</span>
                            </div>
                          </div>
                          <div>
                            <div style={{fontSize:10,color:'var(--txt3)',marginBottom:4}}>Levier max</div>
                            <div style={{display:'flex',alignItems:'center',background:'var(--bg1)',border:'1px solid var(--brd)',borderRadius:6,overflow:'hidden'}}>
                              <input type="number" value={copyLev} onChange={e=>setCopyLev(e.target.value)} style={{flex:1,background:'transparent',border:'none',color:'var(--txt)',padding:'8px 10px',fontFamily:'var(--mono)',fontSize:13,outline:'none',minWidth:0}} min="1" max="50"/>
                              <span style={{padding:'0 10px',color:'var(--txt3)',fontSize:11,borderLeft:'1px solid var(--brd)'}}>×</span>
                            </div>
                          </div>
                        </div>
                        {isActive ? (
                          <button onClick={()=>stopCopy(t.id)} style={{padding:12,background:'rgba(255,59,92,.1)',border:'1px solid rgba(255,59,92,.3)',borderRadius:8,color:'var(--red)',fontWeight:800,fontSize:13,cursor:'pointer'}}>
                            ⏹ Arrêter le copy de {t.name}
                          </button>
                        ) : (
                          <button onClick={()=>startCopy(t)} style={{padding:12,background:t.color,border:'none',borderRadius:8,color:'#000',fontWeight:800,fontSize:13,cursor:'pointer'}}>
                            ▶ Copier {t.name} · {copyAlloc} USDC · Max {copyLev}×
                          </button>
                        )}
                        <div style={{fontSize:10,color:'var(--txt3)',textAlign:'center'}}>Config sauvegardée · Réplication trades GMX v2 Arbitrum — V2</div>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {tab === 'Mon Copy' && isPremium && (
          <div className={styles.masterSection}>
            <div className={styles.masterCard}>
              <div className={styles.masterTop}>
                <div className={styles.avatar}>{MASTER.avatar}</div>
                <div className={styles.masterInfo}>
                  <div className={styles.masterName}>
                    {MASTER.name}
                    <span className={styles.badge}>{MASTER.badge}</span>
                    <span className={styles.verified}>✓</span>
                  </div>
                  <div className={styles.masterBio}>{MASTER.bio}</div>
                </div>
                <div className={styles.masterPnl}>
                  <span className={styles.pnlBig} style={{fontSize:24}}>{MASTER.stats.pnlTotal}</span>
                  <span className={styles.pnlSub}>Total PnL</span>
                </div>
              </div>
              <div className={styles.masterStats}>
                {[
                  {l:'Ce mois',   v:MASTER.stats.pnlMonth, g:true},
                  {l:'Cette sem.',v:MASTER.stats.pnlWeek,  g:true},
                  {l:'Win Rate',  v:MASTER.stats.winRate},
                  {l:'Sharpe',    v:MASTER.stats.sharpe},
                  {l:'Max DD',    v:MASTER.stats.maxDD, r:true},
                  {l:'Trades',    v:MASTER.stats.trades},
                ].map((s,i) => (
                  <div key={i} className={styles.statBox}>
                    <span className={styles.statL}>{s.l}</span>
                    <span className={styles.statV} style={{color:s.g?'var(--grn)':s.r?'var(--red)':'var(--txt)'}}>{s.v}</span>
                  </div>
                ))}
              </div>
              <div className={styles.masterCTA}>
                <button className={styles.depositCTA} onClick={()=>setTab('📊 Pool FXSEDGE')}>
                  Déposer dans le pool →
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ── DCA BOT ── */}
        {tab === '🤖 DCA Bot' && <DCABot />}

        {/* ── ESPACE MEMBRE (Copy Trading) ── */}
        {tab === '👤 Espace Membre' && isPremium && (
          <MemberZone />
        )}

        {/* ── COMMENT ÇA MARCHE ── */}
        {tab === 'Comment ça marche' && (
          <div className={styles.howTo}>
            {[
              { n:'1', title:'Dépose de l\'USDT', text:`Envoie minimum ${MIN_DEPOSIT} USDT via TRON (TRC-20) ou Ethereum (ERC-20) à l'adresse du pool. Choisis le réseau avec les frais les plus bas.` },
              { n:'2', title:'Confirme ton dépôt', text:'Contacte Alpha_PRC avec le hash de ta transaction pour être ajouté au pool. Tu reçois une confirmation sous 24h.' },
              { n:'3', title:'Alpha_PRC trade pour toi', text:'Chaque position est répliquée proportionnellement à ta contribution dans le pool. Tu partages les gains et les pertes au prorata.' },
              { n:'4', title:'Retrait à tout moment', text:'Demande un retrait à tout moment. Délai de 48h pour liquider les positions ouvertes. Capital + profits remis en USDT.' },
            ].map((s,i) => (
              <div key={i} className={styles.step}>
                <div className={styles.stepN}>{s.n}</div>
                <div>
                  <div className={styles.stepTitle}>{s.title}</div>
                  <div className={styles.stepText}>{s.text}</div>
                </div>
              </div>
            ))}
            <div className={styles.disclaimer}>
              ⚠ Le trading comporte des risques. Les performances passées ne garantissent pas les performances futures.
              Investis uniquement ce que tu peux te permettre de perdre. Commission : 10% des profits uniquement.
            </div>
          </div>
        )}

      </div>
    {portalOpen && <ClientPortal onClose={() => setPortalOpen(false)} />}
    </div>
  )
}

const StatBox = ({ label, val, green, red, big }) => (
  <div className={styles.statCard}>
    <span className={styles.statCardL}>{label}</span>
    <span className={styles.statCardV}
      style={{color:green?'var(--grn)':red?'var(--red)':'var(--txt)',fontSize:big?18:13}}>
      {val}
    </span>
  </div>
)

const Term = ({ icon, text }) => (
  <div className={styles.term}>
    <span style={{color:'var(--grn)',fontWeight:700}}>{icon}</span>
    <span>{text}</span>
  </div>
)

// ── Espace Membre (Copy Trading — indépendant de l'auth principale) ──
function MemberZone() {
  const [logged, setLogged] = useState(() => {
    try { 
      const raw = localStorage.getItem('fxs_copy_member')
      if (!raw) return null
      const data = JSON.parse(raw)
      return data && data.email ? data : null
    } catch { return null }
  })
  const [email, setEmail] = useState('')
  const [pass, setPass]   = useState('')
  const [err, setErr]     = useState('')
  const [mode, setMode]   = useState('login') // login | register

  const handleAuth = () => {
    setErr('')
    if (!email || !pass) { setErr('Email et mot de passe requis'); return }
    if (mode === 'register' && pass.length < 6) { setErr('Mot de passe minimum 6 caractères'); return }
    // Pour l'instant: stockage local (sera remplacé par Supabase)
    const member = { email, since: Date.now(), balance: 0, pnl: 0 }
    localStorage.setItem('fxs_copy_member', JSON.stringify(member))
    setLogged(member)
  }

  const logout = () => {
    localStorage.removeItem('fxs_copy_member')
    setLogged(null)
  }

  if (!logged) {
    return (
      <div className={styles.howTo} style={{maxWidth:400,margin:'0 auto'}}>
        <div style={{textAlign:'center',marginBottom:16}}>
          <div style={{fontSize:36,marginBottom:8}}>🔐</div>
          <div style={{fontSize:16,fontWeight:800,color:'var(--txt)'}}>Espace Copieurs</div>
          <div style={{fontSize:11,color:'var(--txt3)',marginTop:4}}>Connecte-toi pour voir ton solde et tes positions copiées</div>
        </div>

        <div style={{display:'flex',gap:0,marginBottom:12}}>
          <button style={{flex:1,padding:'8px 0',fontSize:11,fontWeight:700,border:'1px solid var(--brd)',borderRadius:'6px 0 0 6px',
            background:mode==='login'?'var(--bg2)':'transparent',color:mode==='login'?'var(--grn)':'var(--txt3)',cursor:'pointer'}}
            onClick={()=>setMode('login')}>Connexion</button>
          <button style={{flex:1,padding:'8px 0',fontSize:11,fontWeight:700,border:'1px solid var(--brd)',borderRadius:'0 6px 6px 0',
            background:mode==='register'?'var(--bg2)':'transparent',color:mode==='register'?'var(--grn)':'var(--txt3)',cursor:'pointer'}}
            onClick={()=>setMode('register')}>Inscription</button>
        </div>

        <div style={{display:'flex',flexDirection:'column',gap:10}}>
          <input type="email" placeholder="Email" value={email} onChange={e=>setEmail(e.target.value)}
            style={{padding:'10px 12px',background:'var(--bg2)',border:'1px solid var(--brd)',borderRadius:6,color:'var(--txt)',fontSize:13,outline:'none'}}/>
          <input type="password" placeholder="Mot de passe" value={pass} onChange={e=>setPass(e.target.value)}
            onKeyDown={e=>e.key==='Enter'&&handleAuth()}
            style={{padding:'10px 12px',background:'var(--bg2)',border:'1px solid var(--brd)',borderRadius:6,color:'var(--txt)',fontSize:13,outline:'none'}}/>
          {err && <div style={{fontSize:11,color:'var(--red)'}}>{err}</div>}
          <button onClick={handleAuth}
            style={{padding:'12px',background:'var(--grn)',color:'#000',fontWeight:800,fontSize:13,borderRadius:6,border:'none',cursor:'pointer'}}>
            {mode==='login'?'Se connecter':'Créer mon compte'}
          </button>
        </div>

        <div style={{fontSize:9,color:'var(--txt3)',textAlign:'center',marginTop:12}}>
          Compte indépendant du terminal FXSEDGE · Données sécurisées
        </div>
      </div>
    )
  }

  // Logged in — dashboard membre
  return (
    <div className={styles.howTo}>
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:16}}>
        <div>
          <div style={{fontSize:14,fontWeight:800,color:'var(--txt)'}}>👤 {logged.email}</div>
          <div style={{fontSize:10,color:'var(--txt3)'}}>Membre depuis {new Date(logged.since).toLocaleDateString()}</div>
        </div>
        <button onClick={logout}
          style={{padding:'6px 12px',fontSize:10,border:'1px solid var(--brd)',borderRadius:5,color:'var(--txt3)',background:'transparent',cursor:'pointer'}}>
          Déconnexion
        </button>
      </div>

      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8,marginBottom:16}}>
        <div style={{background:'var(--bg2)',padding:14,borderRadius:8,border:'1px solid var(--brd)'}}>
          <div style={{fontSize:10,color:'var(--txt3)'}}>Solde Copy</div>
          <div style={{fontSize:20,fontWeight:800,color:'var(--txt)',fontFamily:'var(--mono)'}}>${fmt(logged.balance, 2)}</div>
        </div>
        <div style={{background:'var(--bg2)',padding:14,borderRadius:8,border:'1px solid var(--brd)'}}>
          <div style={{fontSize:10,color:'var(--txt3)'}}>PnL Total</div>
          <div style={{fontSize:20,fontWeight:800,color:logged.pnl>=0?'var(--grn)':'var(--red)',fontFamily:'var(--mono)'}}>{logged.pnl>=0?'+':''}{fmt(logged.pnl, 2)}%</div>
        </div>
      </div>

      <div style={{background:'rgba(140,198,63,.04)',padding:16,borderRadius:8,border:'1px solid rgba(140,198,63,.15)',textAlign:'center'}}>
        <div style={{fontSize:12,color:'var(--txt3)',marginBottom:8}}>Aucune position copiée active</div>
        <div style={{fontSize:10,color:'var(--txt3)'}}>Dépose des fonds et active le copy trading dans l'onglet "🔄 Copy Traders"</div>
      </div>

      <div style={{fontSize:9,color:'var(--txt3)',textAlign:'center',marginTop:16}}>
        💡 Le smart contract et la source officielle seront intégrés prochainement
      </div>
    </div>
  )
}
