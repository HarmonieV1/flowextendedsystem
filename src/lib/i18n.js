// FXSEDGE i18n — FR/EN
const LANG_KEY = 'fxs_lang'

export const translations = {
  // ── Trading ──
  'long': { fr: '↑ Long', en: '↑ Long' },
  'short': { fr: '↓ Short', en: '↓ Short' },
  'market': { fr: 'Market', en: 'Market' },
  'limit': { fr: 'Limite', en: 'Limit' },
  'quantity': { fr: 'Quantité', en: 'Quantity' },
  'leverage': { fr: 'Levier', en: 'Leverage' },
  'margin_required': { fr: 'Marge requise', en: 'Margin required' },
  'position': { fr: 'Position', en: 'Position' },
  'fees_est': { fr: 'Frais est.', en: 'Est. fees' },
  'close': { fr: 'Fermer', en: 'Close' },
  'close_all': { fr: 'Fermer tout', en: 'Close all' },
  'reverse': { fr: 'Reverse', en: 'Reverse' },
  'send': { fr: 'Envoi...', en: 'Sending...' },
  'enter_qty': { fr: 'Entre une quantité', en: 'Enter quantity' },
  'wait_1s': { fr: 'Attends 1s entre chaque ordre', en: 'Wait 1s between orders' },
  'confirm': { fr: 'Confirmer', en: 'Confirm' },
  'cancel': { fr: 'Annuler', en: 'Cancel' },

  // ── Tabs ──
  'trade': { fr: 'Trade', en: 'Trade' },
  'positions': { fr: 'Positions', en: 'Positions' },
  'orders': { fr: 'Ordres', en: 'Orders' },
  'history': { fr: 'Historique', en: 'History' },
  'no_positions': { fr: 'Aucune position', en: 'No positions' },
  'no_orders': { fr: 'Aucun ordre', en: 'No orders' },
  'no_trades': { fr: 'Aucun trade récent', en: 'No recent trades' },
  'refresh': { fr: 'Actualiser', en: 'Refresh' },
  'open_position': { fr: 'Ouvrir une position', en: 'Open a position' },
  'loading': { fr: 'Chargement...', en: 'Loading...' },

  // ── Portfolio ──
  'portfolio': { fr: 'Portfolio', en: 'Portfolio' },
  'pnl': { fr: 'PnL', en: 'PnL' },
  'journal': { fr: 'Journal', en: 'Journal' },
  'pnl_net': { fr: 'PnL Net', en: 'Net PnL' },
  'win_rate': { fr: 'Win Rate', en: 'Win Rate' },
  'trades': { fr: 'Trades', en: 'Trades' },
  'equity_curve': { fr: 'Courbe equity', en: 'Equity curve' },
  'export_csv': { fr: 'Export CSV', en: 'Export CSV' },

  // ── Intel ──
  'market': { fr: 'Marché', en: 'Market' },
  'orderbook': { fr: 'Carnet', en: 'Order Book' },
  'flow': { fr: 'Flow', en: 'Flow' },
  'onchain': { fr: 'On-Chain', en: 'On-Chain' },
  'global_view': { fr: 'Vue Globale', en: 'Global View' },
  'scanner': { fr: 'Scanner', en: 'Scanner' },
  'patterns': { fr: 'Patterns', en: 'Patterns' },
  'harmonics': { fr: 'Harmoniques', en: 'Harmonics' },
  'sentiment': { fr: 'Sentiment', en: 'Sentiment' },
  'correlation': { fr: 'Corrélation', en: 'Correlation' },
  'crypto_map': { fr: 'Crypto Map', en: 'Crypto Map' },
  'sectors': { fr: 'Secteurs', en: 'Sectors' },
  'alpha_calls': { fr: 'Alpha Calls', en: 'Alpha Calls' },

  // ── Auth ──
  'connect_wallet': { fr: 'Connecter Wallet', en: 'Connect Wallet' },
  'connect_api': { fr: 'Connecter API Bitunix', en: 'Connect Bitunix API' },
  'guest_mode': { fr: 'Mode invité (lecture seule)', en: 'Guest mode (read-only)' },
  'access_terminal': { fr: 'Accéder au terminal', en: 'Access terminal' },

  // ── Risk ──
  'risk_reward': { fr: 'Risk/Reward', en: 'Risk/Reward' },
  'portfolio_risk': { fr: 'Portfolio risk', en: 'Portfolio risk' },
  'kelly_optimal': { fr: 'Kelly optimal', en: 'Kelly optimal' },

  // ── General ──
  'best_price': { fr: 'BEST PRICE', en: 'BEST PRICE' },
  'saved': { fr: 'économisé', en: 'saved' },
  'no_kyc': { fr: 'no KYC', en: 'no KYC' },
  'non_custodial': { fr: 'non-custodial', en: 'non-custodial' },
}

export function getLang() {
  try { return localStorage.getItem(LANG_KEY) || 'fr' } catch { return 'fr' }
}

export function setLang(lang) {
  try { localStorage.setItem(LANG_KEY, lang) } catch {}
}

export function t(key) {
  const lang = getLang()
  const entry = translations[key]
  if (!entry) return key
  return entry[lang] || entry.fr || key
}
