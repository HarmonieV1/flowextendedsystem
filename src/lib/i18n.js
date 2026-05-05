// FXSEDGE i18n — FR/EN with reactive hook
import { useState, useEffect } from 'react'

const LANG_KEY = 'fxs_lang'

export const translations = {
  // ── Trading ──
  'long': { fr: '↑ Long', en: '↑ Long' },
  'short': { fr: '↓ Short', en: '↓ Short' },
  'market': { fr: 'Marché', en: 'Market' },
  'limit': { fr: 'Limite', en: 'Limit' },
  'mkt': { fr: 'Mkt', en: 'Mkt' },
  'lmt': { fr: 'Lmt', en: 'Lmt' },
  'price': { fr: 'Prix', en: 'Price' },
  'quantity': { fr: 'Quantité', en: 'Quantity' },
  'amount': { fr: 'Montant', en: 'Amount' },
  'leverage': { fr: 'Levier', en: 'Leverage' },
  'margin_required': { fr: 'Marge requise', en: 'Margin required' },
  'position': { fr: 'Position', en: 'Position' },
  'fees_est': { fr: 'Frais est.', en: 'Est. fees' },
  'tp_pnl': { fr: 'TP PnL', en: 'TP PnL' },
  'sl_loss': { fr: 'SL Perte', en: 'SL Loss' },
  'take_profit': { fr: 'Take Profit', en: 'Take Profit' },
  'stop_loss': { fr: 'Stop Loss', en: 'Stop Loss' },
  'tp_price': { fr: 'Prix TP', en: 'TP Price' },
  'sl_price': { fr: 'Prix SL', en: 'SL Price' },
  'close': { fr: 'Fermer', en: 'Close' },
  'close_all': { fr: 'Fermer tout', en: 'Close all' },
  'reverse': { fr: 'Reverse', en: 'Reverse' },
  'sending': { fr: 'Envoi...', en: 'Sending...' },
  'enter_qty': { fr: 'Entre une quantité', en: 'Enter a quantity' },
  'enter_amount': { fr: 'Entre un montant', en: 'Enter an amount' },
  'enter_limit_price': { fr: 'Entre un prix limite', en: 'Enter a limit price' },
  'wait_1s': { fr: 'Attends 1s entre chaque ordre', en: 'Wait 1s between orders' },
  'confirm': { fr: 'Confirmer', en: 'Confirm' },
  'cancel': { fr: 'Annuler', en: 'Cancel' },
  'last': { fr: 'Last', en: 'Last' },
  'max': { fr: 'Max', en: 'Max' },
  'available': { fr: 'dispo', en: 'available' },
  'buy': { fr: 'Acheter', en: 'Buy' },
  'sell': { fr: 'Vendre', en: 'Sell' },
  'side_buy': { fr: 'Achat', en: 'Buy' },
  'side_sell': { fr: 'Vente', en: 'Sell' },
  'insufficient_balance': { fr: 'Solde insuffisant', en: 'Insufficient balance' },
  'invalid_param': { fr: 'Paramètre invalide', en: 'Invalid parameter' },
  'sig_error': { fr: 'Erreur signature — reconnecte tes clés API', en: 'Signature error — reconnect your API keys' },
  'large_order_warn': { fr: 'Marge', en: 'Margin' },
  'of_balance': { fr: 'de ton solde', en: 'of your balance' },
  'order_sent': { fr: 'envoyé', en: 'sent' },
  'liq': { fr: 'Liq', en: 'Liq' },
  'entry': { fr: 'Entrée', en: 'Entry' },
  'size': { fr: 'Taille', en: 'Size' },
  'fee': { fr: 'Fee', en: 'Fee' },
  'funding': { fr: 'Funding', en: 'Funding' },

  // ── Tabs ──
  'trade': { fr: 'Trade', en: 'Trade' },
  'positions': { fr: 'Positions', en: 'Positions' },
  'orders': { fr: 'Ordres', en: 'Orders' },
  'history': { fr: 'Historique', en: 'History' },
  'no_positions': { fr: 'Aucune position', en: 'No positions' },
  'no_orders': { fr: 'Aucun ordre en cours', en: 'No pending orders' },
  'no_trades': { fr: 'Aucun trade récent', en: 'No recent trades' },
  'refresh': { fr: 'Actualiser', en: 'Refresh' },
  'open_position': { fr: 'Ouvrir une position', en: 'Open a position' },
  'loading': { fr: 'Chargement...', en: 'Loading...' },

  // ── Swap ──
  'swap': { fr: 'Swap', en: 'Swap' },
  'from': { fr: 'De', en: 'From' },
  'to': { fr: 'Vers', en: 'To' },
  'slippage': { fr: 'Slippage', en: 'Slippage' },
  'route': { fr: 'Route', en: 'Route' },
  'best_route': { fr: 'Meilleure route', en: 'Best route' },
  'price_impact': { fr: 'Impact prix', en: 'Price impact' },
  'min_received': { fr: 'Min reçu', en: 'Min received' },
  'gas_fee': { fr: 'Frais gas', en: 'Gas fee' },
  'platform_fee': { fr: 'Frais FXSEDGE', en: 'FXSEDGE fee' },
  'approve': { fr: 'Approuver', en: 'Approve' },
  'tx_pending': { fr: 'Transaction en cours...', en: 'Transaction pending...' },
  'tx_rejected': { fr: 'Transaction refusée par le wallet', en: 'Transaction rejected by wallet' },

  // ── Portfolio ──
  'portfolio': { fr: 'Portfolio', en: 'Portfolio' },
  'pnl': { fr: 'PnL', en: 'PnL' },
  'journal': { fr: 'Journal', en: 'Journal' },
  'pnl_net': { fr: 'PnL Net', en: 'Net PnL' },
  'win_rate': { fr: 'Win Rate', en: 'Win Rate' },
  'trades': { fr: 'Trades', en: 'Trades' },
  'equity_curve': { fr: 'Courbe equity', en: 'Equity curve' },
  'export_csv': { fr: 'Export CSV', en: 'Export CSV' },
  'sizer': { fr: 'Sizer', en: 'Sizer' },
  'performance': { fr: 'Performance', en: 'Performance' },

  // ── Intel ──
  'market_intel': { fr: 'Market Intel', en: 'Market Intel' },
  'orderbook': { fr: 'Carnet', en: 'Order Book' },
  'flow': { fr: 'Flow', en: 'Flow' },
  'onchain': { fr: 'On-Chain', en: 'On-Chain' },
  'global_view': { fr: 'Vue Globale', en: 'Global View' },
  'degen': { fr: 'Degen', en: 'Degen' },
  'scanner': { fr: 'Scanner', en: 'Scanner' },
  'patterns': { fr: 'Patterns', en: 'Patterns' },
  'harmonics': { fr: 'Harmoniques', en: 'Harmonics' },
  'sentiment': { fr: 'Sentiment', en: 'Sentiment' },
  'correlation': { fr: 'Corrélation', en: 'Correlation' },
  'calendar': { fr: 'Calendrier', en: 'Calendar' },
  'heatmap': { fr: 'Heatmap 3D', en: '3D Heatmap' },
  'aggregated': { fr: 'Agrégé', en: 'Aggregated' },
  'liq_radar': { fr: 'Radar Liq.', en: 'Liq. Radar' },
  'delta_flow': { fr: 'Delta Flow', en: 'Delta Flow' },
  'funding_rates': { fr: 'Funding', en: 'Funding' },
  'options_iv': { fr: 'Options IV', en: 'Options IV' },
  'alpha_calls': { fr: 'Alpha Calls', en: 'Alpha Calls' },
  'insiders': { fr: 'Insiders', en: 'Insiders' },
  'multi_wallet': { fr: 'Multi-Wallet', en: 'Multi-Wallet' },
  'unlocks': { fr: 'Unlocks', en: 'Unlocks' },
  'flash_crash': { fr: 'Flash Crash', en: 'Flash Crash' },
  'crypto_map': { fr: 'Crypto Map', en: 'Crypto Map' },
  'sectors': { fr: 'Secteurs', en: 'Sectors' },
  'dev_tracker': { fr: 'Dev Tracker', en: 'Dev Tracker' },
  'token_scan': { fr: 'Token Scan', en: 'Token Scan' },
  'flow_detect': { fr: 'Flow Detect', en: 'Flow Detect' },

  // ── Auth ──
  'connect_wallet': { fr: 'Connecter Wallet', en: 'Connect Wallet' },
  'connect_api': { fr: 'Connecter API', en: 'Connect API' },
  'guest_mode': { fr: 'Mode invité (lecture seule)', en: 'Guest mode (read-only)' },
  'access_terminal': { fr: 'Accéder au terminal', en: 'Access terminal' },
  'login': { fr: 'Connexion', en: 'Login' },
  'register': { fr: 'Inscription', en: 'Register' },
  'email': { fr: 'Email', en: 'Email' },
  'password': { fr: 'Mot de passe', en: 'Password' },
  'forgot_password': { fr: 'Mot de passe oublié ?', en: 'Forgot password?' },
  'sign_out': { fr: 'Déconnexion', en: 'Sign out' },
  'create_account': { fr: 'Créer mon compte', en: 'Create account' },

  // ── Risk ──
  'risk_reward': { fr: 'Risk/Reward', en: 'Risk/Reward' },
  'portfolio_risk': { fr: 'Risque portfolio', en: 'Portfolio risk' },
  'kelly_optimal': { fr: 'Kelly optimal', en: 'Kelly optimal' },

  // ── Copy Trading ──
  'copy_trading': { fr: 'Copy Trading', en: 'Copy Trading' },
  'pool': { fr: 'Pool FXSEDGE', en: 'FXSEDGE Pool' },
  'copy_traders': { fr: 'Copy Traders', en: 'Copy Traders' },
  'my_copy': { fr: 'Mon Copy', en: 'My Copy' },
  'dca_bot': { fr: 'DCA Bot', en: 'DCA Bot' },
  'member_zone': { fr: 'Espace Membre', en: 'Member Zone' },
  'how_it_works': { fr: 'Comment ça marche', en: 'How it works' },
  'premium_only': { fr: 'Réservé aux membres Premium', en: 'Premium members only' },
  'premium_locked_msg': { fr: 'La Pool FXSEDGE, Mon Copy et l\'Espace Membre sont réservés aux membres Premium.', en: 'The FXSEDGE Pool, My Copy and Member Zone are reserved for Premium members.' },
  'upgrade_30d': { fr: 'Upgrade → 30 jours d\'essai gratuit à l\'inscription', en: 'Upgrade → 30 day free trial on signup' },

  // ── General ──
  'best_price': { fr: 'BEST PRICE', en: 'BEST PRICE' },
  'saved': { fr: 'économisé', en: 'saved' },
  'no_kyc': { fr: 'no KYC', en: 'no KYC' },
  'non_custodial': { fr: 'non-custodial', en: 'non-custodial' },
  'language': { fr: 'Langue', en: 'Language' },
  'settings': { fr: 'Paramètres', en: 'Settings' },
  'connected': { fr: 'Connecté', en: 'Connected' },
  'disconnected': { fr: 'Déconnecté', en: 'Disconnected' },
  'live': { fr: 'LIVE', en: 'LIVE' },
  'beta': { fr: 'BETA', en: 'BETA' },
  'soon': { fr: 'Bientôt', en: 'Soon' },
  'coming_soon': { fr: 'Bientôt disponible', en: 'Coming soon' },
  'error': { fr: 'Erreur', en: 'Error' },
  'success': { fr: 'Succès', en: 'Success' },
  'warning': { fr: 'Attention', en: 'Warning' },
  'unknown_error': { fr: 'Erreur inconnue', en: 'Unknown error' },

  // ── Navigation ──
  'futures': { fr: 'Futures', en: 'Futures' },
  'spot': { fr: 'Spot', en: 'Spot' },
  'multi_chart': { fr: 'Multi-Chart', en: 'Multi-Chart' },
  'liquidation_map': { fr: 'Liquidation Map', en: 'Liquidation Map' },
}

export function getLang() {
  try { return localStorage.getItem(LANG_KEY) || 'fr' } catch { return 'fr' }
}

export function setLang(lang) {
  try {
    localStorage.setItem(LANG_KEY, lang)
    window.dispatchEvent(new CustomEvent('fxs:langChanged', { detail: { lang } }))
  } catch {}
}

export function t(key, lang) {
  const useLang = lang || getLang()
  const entry = translations[key]
  if (!entry) return key
  return entry[useLang] || entry.fr || key
}

// React hook — re-renders component when language changes
export function useT() {
  const [lang, setLangState] = useState(getLang())
  useEffect(() => {
    const handler = (e) => setLangState(e?.detail?.lang || getLang())
    window.addEventListener('fxs:langChanged', handler)
    return () => window.removeEventListener('fxs:langChanged', handler)
  }, [])
  // Return a function that uses the current lang
  return (key) => t(key, lang)
}
