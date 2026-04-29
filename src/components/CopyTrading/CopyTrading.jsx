import { ClientPortal } from './ClientPortal'
import { useState } from 'react'
import { useStore } from '../../store'
import { fmt, fmtPx } from '../../lib/format'
import styles from './CopyTrading.module.css'

const DEPOSIT_TRON = 'TFu3sHnfUcUBPzT3piHh2s3oH6Q1Fi3ziH'
const DEPOSIT_ETH  = '0x7109b5Eec69cB071803a7ff0657257e25c56E010'
const DEPOSIT_SOL  = '7n6MSbzKWXT9oTLBNXrKX548Ejg1rPYx1aeyQFdN9ji4'
const CURRENT_PNL_PCT = 31.4
const MIN_DEPOSIT = 250

const MASTER = {
  name: 'Alpha_PRC', avatar: '⚡', badge: 'MASTER',
  bio: 'Trader 8 ans · Indicateur FXSEDGE publié · Spécialiste BTC/ETH',
  stats: {
    pnlTotal: `+${CURRENT_PNL_PCT}%`, pnlMonth: '+8.2%', pnlWeek: '+2.1%',
    winRate: '68%', sharpe: '2.4', maxDD: '-12%', trades: 847,
  },
}

const RECENT_TRADES = [
  { pair:'BTC/USDT', side:'long',  entry:71200, exit:75400, pnl:'+5.89%', date:'Il y a 2h'  },
  { pair:'ETH/USDT', side:'short', entry:3480,  exit:3210,  pnl:'+7.76%', date:'Il y a 1j'  },
  { pair:'SOL/USDT', side:'long',  entry:138,   exit:152,   pnl:'+10.14%',date:'Il y a 2j'  },
  { pair:'BTC/USDT', side:'long',  entry:69800, exit:71200, pnl:'+2.00%', date:'Il y a 3j'  },
]

const TABS = ['📊 Pool FXSEDGE', 'Mon Copy', 'Comment ça marche']

const QR = (text) => `https://api.qrserver.com/v1/create-qr-code/?size=140x140&data=${encodeURIComponent(text)}&bgcolor=09090b&color=00e5a0&margin=8`

export function CopyTrading({ onOpenWallet, onConnectWallet }) {
  onConnectWallet = onConnectWallet || onOpenWallet
  const connected = useStore(s => s.connected)
  const [tab, setTab]           = useState('📊 Pool FXSEDGE')
  const [network, setNetwork]   = useState('tron') // 'tron' | 'eth' | 'sol'
  const [copiedTron, setCopiedTron] = useState(false)
  const [copiedEth,  setCopiedEth]  = useState(false)
  const [portalOpen, setPortalOpen] = useState(false)

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
          <button key={t} className={`${styles.tab} ${tab===t?styles.tabOn:''}`} onClick={()=>setTab(t)}>{t}</button>
        ))}
      </div>

      <div className={styles.content}>

        {/* ── POOL FXS ── */}
        {tab === '📊 Pool FXSEDGE' && (
          <div className={styles.poolSection}>

            {/* Stats bar */}
            <div className={styles.statsBar}>
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
        {tab === 'Mon Copy' && (
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
