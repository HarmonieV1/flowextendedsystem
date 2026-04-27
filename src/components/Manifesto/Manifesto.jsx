import styles from './Manifesto.module.css'

const PRINCIPLES = [
  {
    icon: '🚫',
    title: 'Zéro dark patterns',
    text: 'Pas de countdown artificiel. Pas d\'offre "limitée". Pas de slippage caché. Pas de bouton conçu pour te faire cliquer sur la mauvaise chose. Chaque élément de l\'interface existe pour t\'aider, pas pour te manipuler.',
  },
  {
    icon: '🔑',
    title: 'Zéro KYC',
    text: 'Ton identité ne nous appartient pas. On ne te demande pas de passeport pour voir un graphique. Tu n\'as pas à justifier pourquoi tu veux trader. Tu connectes ton wallet et c\'est parti.',
  },
  {
    icon: '🔒',
    title: 'Non-custodial',
    text: 'Tes clés, tes crypto. FXSEDGE ne touche jamais tes fonds. Le swap passe par 0x Protocol directement depuis ton wallet. Les futures sont on-chain via GMX. Le spot passe par ta clé API Bitunix — pas de retrait possible côté FXSEDGE.',
  },
  {
    icon: '💡',
    title: 'Transparence totale',
    text: 'Les frais sont affichés avant que tu confirmes. On compare nos frais à ceux de Binance, Bybit et OKX en temps réel. Si quelqu\'un fait mieux, on te le dit. Notre modèle de revenus est public : 0.05% sur les swaps DEX, rien d\'autre.',
  },
  {
    icon: '⚡',
    title: 'Information, pas publicité',
    text: 'On ne vend pas de visibilité aux exchanges. On ne met pas en avant un token parce qu\'on est payé pour. Le comparateur de prix affiche le vrai meilleur prix, même si c\'est chez un concurrent. Toujours.',
  },
  {
    icon: '🌐',
    title: 'Open source un jour',
    text: 'La roadmap inclut d\'ouvrir le code source des composants critiques — le comparateur, le fee transparency score, le routing swap. Pour que n\'importe qui puisse vérifier qu\'on fait ce qu\'on dit.',
  },
]

const VS_MOONX = [
  { feature: 'Slippage affiché avant confirmation',  fxs: true,  moonx: false },
  { feature: 'Frais comparés en temps réel',          fxs: true,  moonx: false },
  { feature: 'Non-custodial',                         fxs: true,  moonx: false },
  { feature: 'Zéro KYC',                              fxs: true,  moonx: true  },
  { feature: 'Code source vérifiable',                fxs: true,  moonx: false },
  { feature: 'Pas de countdown artificiel',           fxs: true,  moonx: false },
  { feature: 'Prix multi-source visible',             fxs: true,  moonx: false },
  { feature: 'Liquidité institutionnelle visible',    fxs: true,  moonx: false },
]

export function Manifesto() {
  return (
    <div className={styles.wrap}>
      <div className={styles.hero}>
        <div className={styles.heroInner}>
          <div className={styles.badge}>MANIFESTO</div>
          <h1 className={styles.heroTitle}>
            Le trading devrait être transparent.<br/>
            <span className={styles.heroGreen}>Pas une boîte noire.</span>
          </h1>
          <p className={styles.heroSub}>
            FXSEDGE est construit sur une idée simple : l'interface de trading ne devrait jamais travailler contre toi.
            Pas de manipulation, pas de custody, pas de KYC. Un outil au service du trader.
          </p>
          <div className={styles.heroBadges}>
            <span className={styles.heroBadge}>No KYC</span>
            <span className={styles.heroBadge}>Non-Custodial</span>
            <span className={styles.heroBadge}>No Dark Patterns</span>
            <span className={styles.heroBadge}>Fee Transparent</span>
          </div>
        </div>
      </div>

      <div className={styles.content}>
        {/* Principles */}
        <div className={styles.section}>
          <h2 className={styles.sectionTitle}>Nos principes</h2>
          <div className={styles.principles}>
            {PRINCIPLES.map((p, i) => (
              <div key={i} className={styles.principle}>
                <span className={styles.principleIcon}>{p.icon}</span>
                <div>
                  <div className={styles.principleTitle}>{p.title}</div>
                  <p className={styles.principleText}>{p.text}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* FXS vs MoonX */}
        <div className={styles.section}>
          <h2 className={styles.sectionTitle}>FXSEDGE vs les autres</h2>
          <div className={styles.comparison}>
            <div className={styles.compHeader}>
              <span>Feature</span>
              <span className={styles.compFXS}>FXSEDGE</span>
              <span className={styles.compOther}>Concurrents</span>
            </div>
            {VS_MOONX.map((row, i) => (
              <div key={i} className={styles.compRow}>
                <span className={styles.compFeature}>{row.feature}</span>
                <span className={`${styles.compCell} ${row.fxs ? styles.yes : styles.no}`}>
                  {row.fxs ? '✓' : '✗'}
                </span>
                <span className={`${styles.compCell} ${row.moonx ? styles.yes : styles.no}`}>
                  {row.moonx ? '✓' : '✗'}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Revenue model */}
        <div className={styles.section}>
          <h2 className={styles.sectionTitle}>Notre modèle de revenus (public)</h2>
          <div className={styles.revenue}>
            <div className={styles.revenueItem}>
              <span className={styles.revenueIcon}>⇄</span>
              <div>
                <div className={styles.revenueTitle}>Swap DEX — 0.05%</div>
                <div className={styles.revenueSub}>
                  Chaque swap via 0x Protocol inclut automatiquement 0.05% vers notre wallet on-chain.
                  Visible et vérifiable sur Etherscan. C'est notre seule source de revenus sur le swap.
                </div>
              </div>
            </div>
            <div className={styles.revenueItem}>
              <span className={styles.revenueIcon}>◈</span>
              <div>
                <div className={styles.revenueTitle}>Copy Trading — 10% des profits</div>
                <div className={styles.revenueSub}>
                  Quand un copieur fait du profit en suivant un trader FXS, 10% revient au trader.
                  FXS prend 0% de frais de plateforme sur le copy trading.
                </div>
              </div>
            </div>
            <div className={styles.revenueItem}>
              <span className={styles.revenueIcon}>⊡</span>
              <div>
                <div className={styles.revenueTitle}>GMX Referral — commissions on-chain</div>
                <div className={styles.revenueSub}>
                  Les futures passent via GMX avec notre code referral. GMX reverse automatiquement
                  une partie des frais on-chain. Vérifiable sur le contrat GMX.
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Signature */}
        <div className={styles.signature}>
          <div className={styles.sigName}>Alpha_PRC</div>
          <div className={styles.sigRole}>Fondateur · FXSEDGE</div>
          <div className={styles.sigNote}>
            "J'ai construit cette plateforme parce que je voulais un outil de trading honnête.
            Pas un casino déguisé en interface. Si tu trouves quelque chose qui contredit ce manifeste, dis-le moi."
          </div>
        </div>
      </div>
    </div>
  )
}
