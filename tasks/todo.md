# FXSEDGE — TODO Session 3

## EN COURS — par priorité (impact/effort)

### 1. Silent catches → ErrorMonitor (CRIT)
- [ ] Créer logError exporté dans errorMonitor.js
- [ ] Replace tous les catch(_){} et catch(e){} silencieux

### 2. Lazy loading Intel tabs (CRIT)
- [ ] React.lazy() + Suspense sur les 21 Intel components
- [ ] Garder Futures/Chart/Ticker eager

### 3. Bitget orders + history (WARN)
- [ ] Ajouter bitgetGetOrders et bitgetGetHistory dans lib/bitget.js
- [ ] Wire dans FuturesWidget loadData

### 4. API keys — chiffrement Web Crypto (WARN)
- [ ] Migrer btoa → AES-GCM avec password user
- [ ] Backward compat (lire ancien btoa, re-save chiffré)

### 5. i18n complet
- [ ] Étendre src/lib/i18n.js avec toutes les strings
- [ ] Composants principaux: FuturesWidget, SwapWidget, Spot, MarketIntel, CopyTrading

### 6. Mobile responsive
- [ ] Audit composants critiques
- [ ] Fix touch targets, font-sizes, horizontal scroll

### 7. Analytics privacy-friendly (INFO)
- [ ] Plausible script dans index.html (1 ligne)

### 8. Monitoring externe (INFO)
- [ ] Sentry minimal ou Supabase error_logs table
