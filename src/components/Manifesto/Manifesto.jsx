import { useStore } from '../../store'
import styles from './Manifesto.module.css'

const FEATURES = [
  { icon: '📊', title: 'Futures & Spot Trading', desc: 'Long/Short up to 100x leverage. Flash close, TP/SL draggable on chart, one-click reverse.' },
  { icon: '🔄', title: 'DeFi Swap', desc: 'Multi-chain swaps on Arbitrum, Ethereum, Base, Polygon via Paraswap. 35+ tokens.' },
  { icon: '📈', title: 'Native Chart', desc: '1000+ candles, infinite scroll history, MA20/MA50 indicators, drawing tools.' },
  { icon: '⚡', title: 'Alpha Scanner', desc: 'Real-time detection of pumps, dumps, and volume spikes across 2000+ pairs.' },
  { icon: '🗺️', title: 'Crypto Map', desc: 'Visual heatmap of top 60 cryptos by volume. Click to trade instantly.' },
  { icon: '🔗', title: 'Correlation Matrix', desc: 'Live Pearson correlation between 8 major assets. 24h hourly returns.' },
  { icon: '📊', title: 'Sector Rotation', desc: '7 sectors tracked: L1, L2, DeFi, AI, Meme, Gaming, Exchange. See what\'s hot.' },
  { icon: '🛡️', title: 'Token Scanner', desc: 'Pre-trade simulation via GoPlus. Honeypot, tax, blacklist, LP lock check.' },
  { icon: '🤖', title: 'DCA Bot', desc: 'Automated Dollar Cost Averaging. Set amount, interval, and max orders.' },
  { icon: '📐', title: 'Risk Calculator', desc: 'Risk/Reward ratio, Kelly Criterion, portfolio risk % — before every trade.' },
  { icon: '📅', title: 'Performance Dashboard', desc: 'Calendar heatmap of daily PnL. Win rate, equity curve, CSV export.' },
  { icon: '🔔', title: 'Price Alerts', desc: 'Browser push notifications when price hits your target. Even when app is closed.' },
]

const STATS = [
  { val: '7+', label: 'Exchanges compared' },
  { val: '60+', label: 'Trading pairs' },
  { val: '20+', label: 'Intel tools' },
  { val: '4', label: 'Chains supported' },
  { val: '0', label: 'KYC required' },
  { val: '100%', label: 'Transparent' },
]

const VS = [
  { feature: 'Real-time price comparison', fxs: true, others: false },
  { feature: 'Fee transparency', fxs: true, others: false },
  { feature: 'Non-custodial', fxs: true, others: false },
  { feature: 'No KYC', fxs: true, others: 'partial' },
  { feature: 'Alpha Scanner', fxs: true, others: false },
  { feature: 'Token security scan', fxs: true, others: false },
  { feature: 'DCA Bot', fxs: true, others: 'paid' },
  { feature: 'Free', fxs: true, others: false },
]

export function Manifesto() {
  const setView = useStore(s => s.setView)

  return (
    <div className={styles.wrap}>

      {/* ── HERO ── */}
      <div className={styles.hero}>
        <div className={styles.heroInner}>
          <div className={styles.badge}>TRADING TERMINAL</div>
          <h1 className={styles.heroTitle}>
            See every fee.<br/>
            <span className={styles.heroGreen}>Question every spread.</span>
          </h1>
          <p className={styles.heroSub}>
            The no-KYC trading terminal that compares prices across 7+ exchanges in real-time.
            Non-custodial. Transparent. Free.
          </p>
          <div className={styles.heroCtas}>
            <button className={styles.ctaPrimary} onClick={() => setView('trade')}>
              Launch Terminal
            </button>
            <button className={styles.ctaSecondary} onClick={() => {
              document.getElementById('features')?.scrollIntoView({behavior:'smooth'})
            }}>
              Explore Features ↓
            </button>
          </div>
          <div className={styles.heroBadges}>
            <span className={styles.heroBadge}>No KYC</span>
            <span className={styles.heroBadge}>Non-Custodial</span>
            <span className={styles.heroBadge}>7+ Exchanges</span>
            <span className={styles.heroBadge}>100% Free</span>
          </div>
        </div>
      </div>

      {/* ── STATS ── */}
      <div className={styles.statsBar}>
        {STATS.map((s, i) => (
          <div key={i} className={styles.statBox}>
            <div className={styles.statVal}>{s.val}</div>
            <div className={styles.statLabel}>{s.label}</div>
          </div>
        ))}
      </div>

      <div className={styles.content}>

        {/* ── PROBLEM ── */}
        <div className={styles.section}>
          <div className={styles.sectionTag}>THE PROBLEM</div>
          <h2 className={styles.sectionTitle}>Your exchange is hiding fees from you.</h2>
          <p className={styles.sectionText}>
            Most trading platforms bury their real costs in the spread. They show you one price, execute at another,
            and pocket the difference. You never see the real market price. You never know how much you're actually paying.
            FXSEDGE changes that — we show you the price on every exchange, in real-time, so you always know the truth.
          </p>
        </div>

        {/* ── FEATURES ── */}
        <div className={styles.section} id="features">
          <div className={styles.sectionTag}>FEATURES</div>
          <h2 className={styles.sectionTitle}>Everything you need. Nothing you don't.</h2>
          <div className={styles.featGrid}>
            {FEATURES.map((f, i) => (
              <div key={i} className={styles.featCard}>
                <span className={styles.featIcon}>{f.icon}</span>
                <div className={styles.featTitle}>{f.title}</div>
                <div className={styles.featDesc}>{f.desc}</div>
              </div>
            ))}
          </div>
        </div>

        {/* ── COMPARISON ── */}
        <div className={styles.section}>
          <div className={styles.sectionTag}>COMPARISON</div>
          <h2 className={styles.sectionTitle}>FXSEDGE vs the competition</h2>
          <div className={styles.comparison}>
            <div className={styles.compHeader}>
              <span>Feature</span>
              <span className={styles.compFXS}>FXSEDGE</span>
              <span className={styles.compOther}>Others</span>
            </div>
            {VS.map((row, i) => (
              <div key={i} className={styles.compRow}>
                <span className={styles.compFeature}>{row.feature}</span>
                <span className={`${styles.compCell} ${styles.yes}`}>✓</span>
                <span className={`${styles.compCell} ${row.others === true ? styles.yes : row.others === 'paid' ? styles.partial : styles.no}`}>
                  {row.others === true ? '✓' : row.others === 'paid' ? '$' : '✗'}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* ── HOW IT WORKS ── */}
        <div className={styles.section}>
          <div className={styles.sectionTag}>HOW IT WORKS</div>
          <h2 className={styles.sectionTitle}>3 steps to transparent trading</h2>
          <div className={styles.steps}>
            <div className={styles.step}>
              <div className={styles.stepNum}>1</div>
              <div className={styles.stepTitle}>Connect</div>
              <div className={styles.stepDesc}>Connect your wallet or Bitunix API keys. No email, no KYC, no registration.</div>
            </div>
            <div className={styles.step}>
              <div className={styles.stepNum}>2</div>
              <div className={styles.stepTitle}>Compare</div>
              <div className={styles.stepDesc}>See real-time prices across 7+ exchanges. Find the best price instantly.</div>
            </div>
            <div className={styles.step}>
              <div className={styles.stepNum}>3</div>
              <div className={styles.stepTitle}>Trade</div>
              <div className={styles.stepDesc}>Execute at the best price with full transparency. Every fee visible, every spread questioned.</div>
            </div>
          </div>
        </div>

        {/* ── REVENUE ── */}
        <div className={styles.section}>
          <div className={styles.sectionTag}>TRANSPARENCY</div>
          <h2 className={styles.sectionTitle}>Our revenue model (public)</h2>
          <div className={styles.revenue}>
            <div className={styles.revenueItem}>
              <span className={styles.revenueIcon}>⇄</span>
              <div>
                <div className={styles.revenueTitle}>DeFi Swap — 0.5%</div>
                <div className={styles.revenueSub}>Transparent fee on Paraswap swaps. Visible before you confirm.</div>
              </div>
            </div>
            <div className={styles.revenueItem}>
              <span className={styles.revenueIcon}>◈</span>
              <div>
                <div className={styles.revenueTitle}>Exchange Referral</div>
                <div className={styles.revenueSub}>Revenue sharing with Bitunix on trading fees. No extra cost to you.</div>
              </div>
            </div>
            <div className={styles.revenueItem}>
              <span className={styles.revenueIcon}>🤖</span>
              <div>
                <div className={styles.revenueTitle}>Future: Pro Features</div>
                <div className={styles.revenueSub}>Advanced bots, unlimited alerts, API access. Core terminal stays free forever.</div>
              </div>
            </div>
          </div>
        </div>

        {/* ── CTA FINAL ── */}
        <div className={styles.finalCta}>
          <h2 className={styles.finalTitle}>Ready to trade transparent?</h2>
          <p className={styles.finalSub}>No registration. No KYC. No hidden fees. Just connect and trade.</p>
          <button className={styles.ctaPrimary} onClick={() => setView('trade')}>
            Launch Terminal →
          </button>
        </div>

        {/* ── FOOTER ── */}
        <div className={styles.signature}>
          <div className={styles.sigName}>FXSEDGE</div>
          <div className={styles.sigRole}>Built by traders, for traders.</div>
          <div className={styles.sigLinks}>
            <span>© 2026 FXSEDGE</span>
            <span>·</span>
            <span>Non-Custodial</span>
            <span>·</span>
            <span>No KYC</span>
            <span>·</span>
            <span>Open Source (soon)</span>
          </div>
        </div>

      </div>
    </div>
  )
}
