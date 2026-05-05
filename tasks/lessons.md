# FXSEDGE — Lessons Learned

## Format : [date] | problème | règle

[2026-05-05] | Première session context V2 | Toujours lire FXSEDGE-CONTEXT-V2.md en premier — contient toutes les décisions architecturales et bugs connus
[2026-05-05] | Build OK | Le build Vite passe clean — 4.37s, pas de warnings bloquants
[2026-05-05] | lwc v5 limitation | Pas de trendlines/Fibonacci — coordinateToTime unreliable. Décision actée : V3 avec TradingView widget iframe
[2026-05-05] | Spot non testé | Le fix Spot est déployé mais jamais confirmé par un vrai trade — ne pas marquer comme "done"
[2026-05-05] | API keys localStorage btoa | Obfuscation seulement, pas du chiffrement — dette technique acceptée pour V2
[2026-05-05] | Bitget routing manquant | Toujours vérifier que handleTrade/loadData/close routent selon l'exchange sélectionné — un sélecteur UI sans routing backend est TROMPEUR
[2026-05-05] | useEffect deps manquantes | Quand un useEffect lit un state (exchange), il DOIT être dans le tableau de deps — sinon le callback reste stale
[2026-05-05] | CORS * sur proxy | Ne jamais laisser Access-Control-Allow-Origin: * sur un proxy API — restreindre au domaine production
[2026-05-05] | Code mort accumulé | oneinch.js, zeroex.js, gmx.js, Swap.jsx, QuickFutures — tout mort. Nettoyer régulièrement pour éviter confusion (ex: FEE_BPS 5 vs 50)
[2026-05-05] | Dynamic import inutile | Ne pas faire import() dynamique sur un module déjà importé statiquement — Vite le signale comme INEFFECTIVE_DYNAMIC_IMPORT
