# FXSEDGE — TODO

## ✅ TERMINÉ — Session 2026-05-05

### Bitget Trading — CÂBLÉ
- [x] FuturesWidget: handleTrade() route vers Bitunix OU Bitget selon exchange
- [x] FuturesWidget: loadData() route vers les bonnes APIs
- [x] FuturesWidget: closePosition route selon exchange
- [x] FuturesWidget: closeAllPositions route selon exchange
- [x] FuturesWidget: reverse route selon exchange
- [x] FuturesWidget: fix useEffect dependency [exchange] pour keyed state
- [x] FuturesWidget: reset state (positions/balance) quand switch exchange
- [x] FuturesWidget: passe exchange context via CustomEvent detail
- [x] ApiKeyModal: supporte Bitget (3 champs: key, secret, passphrase)
- [x] ApiKeyModal: sélecteur Bitunix/Bitget dans le modal
- [x] ApiKeyModal: test connexion Bitget via bitgetFuturesBalance()
- [x] ApiKeyModal: messages d'erreur Bitget spécifiques (signature, key, IP)
- [x] App.jsx: passe defaultExchange au ApiKeyModal
- [x] Build OK — Bitunix non cassé

### CORS Proxy — SÉCURISÉ
- [x] proxy.js: * → https://fxsedge.com
- [x] proxy-bitget.js: * → https://fxsedge.com

### Copy Trading — PREMIUM GATE
- [x] Pool FXSEDGE, Mon Copy, Espace Membre: réservés premium
- [x] Tab lock UI (🔒 + opacity + not-allowed)
- [x] Premium gate page (message + CTA upgrade)
- [x] checkPremium intégré dans App.jsx
- [x] isPremium passé à CopyTrading
- [x] Default tab changé vers Copy Traders (accessible à tous)

### Code mort — NETTOYÉ
- [x] Supprimé: oneinch.js, zeroex.js, gmx.js, gmxSdk.js
- [x] Supprimé: Swap/ (ancien composant), QuickFutures/
- [x] config.js: FEE_BPS corrigé 5→50 (aligné avec swap0x.js réel)
- [x] ApiKeyModal backup supprimé

## 🟡 RESTE À FAIRE

- [ ] Spot — tester un vrai achat (action utilisateur)
- [ ] Trailing Stop — timer client qui ajuste SL
- [ ] i18n complet
- [ ] Lazy loading React.lazy() sur Intel tabs
- [ ] Solana chain (Jupiter aggregator)
- [ ] Smart Order Routing optionnel
