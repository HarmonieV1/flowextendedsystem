import styles from './Disclaimer.module.css'

export function Disclaimer({ onAccept }) {
  return (
    <div className={styles.wrap}>
      <div className={styles.card}>
        <div className={styles.logo}>FXSEDGE</div>
        <div className={styles.tag}>Trading Terminal · Non-Custodial · No KYC</div>

        <div className={styles.section}>
          <h3>⚠️ Risk Warning</h3>
          <p>Trading cryptocurrencies involves significant risk and can result in the loss of your entire investment. Leveraged trading amplifies both gains and losses. Only trade with funds you can afford to lose.</p>
        </div>

        <div className={styles.section}>
          <h3>📋 Terms of Use</h3>
          <ul>
            <li><strong>Not an exchange.</strong> FXSEDGE is a trading interface that connects to third-party exchanges via API. We do not hold, custody, or control your funds at any time.</li>
            <li><strong>Non-custodial.</strong> Your API keys are stored locally on your device. FXSEDGE servers never access or store your private keys or funds.</li>
            <li><strong>No financial advice.</strong> Nothing on this platform constitutes financial, investment, or trading advice. All trading decisions are your own.</li>
            <li><strong>Third-party risk.</strong> FXSEDGE relies on third-party exchanges (Bitunix, Binance, etc.) for execution. We are not responsible for their downtime, errors, or insolvency.</li>
            <li><strong>Data accuracy.</strong> Market data is provided as-is from third-party APIs. While we strive for accuracy, we cannot guarantee real-time precision.</li>
            <li><strong>No guarantees.</strong> Past performance of any tool, indicator, or signal does not guarantee future results.</li>
            <li><strong>Age requirement.</strong> You must be at least 18 years old to use this platform.</li>
            <li><strong>Jurisdiction.</strong> You are responsible for ensuring that using FXSEDGE complies with the laws of your jurisdiction.</li>
          </ul>
        </div>

        <div className={styles.section}>
          <h3>🔐 Privacy</h3>
          <p>FXSEDGE does not collect personal data. No KYC, no email, no tracking. API keys are stored locally in your browser and never transmitted to our servers except through the encrypted proxy for trade execution.</p>
        </div>

        <div className={styles.section}>
          <h3>💰 Revenue Model</h3>
          <p>FXSEDGE generates revenue through: (1) a transparent 0.5% fee on DeFi swaps via Paraswap, (2) exchange referral programs, and (3) future premium features. No hidden fees.</p>
        </div>

        <button className={styles.acceptBtn} onClick={onAccept}>
          I understand the risks — Enter FXSEDGE
        </button>

        <div className={styles.footer}>
          © 2026 FXSEDGE · See every fee. Question every spread.
        </div>
      </div>
    </div>
  )
}
