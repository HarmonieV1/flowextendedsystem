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
[2026-05-05] | Silent catches en masse | Toujours logger via errorMonitor.logSilent au minimum — un catch(_){} en prod = bug invisible. Auto-patcher 25 fichiers avec un script Python est plus fiable que à la main
[2026-05-05] | Lazy loading payoff | React.lazy + Suspense sur les Intel tabs et views = -204KB sur le bundle initial. Garder Futures/Chart/Ticker eager (visibles au premier render)
[2026-05-05] | Web Crypto async dans sync API | Pour migrer btoa→AES-GCM sans casser le flow sync, utiliser un cache mémoire et pre-load au mount avec backward compat (re-encrypt au prochain save)
[2026-05-05] | Solana lightweight | Pas besoin de @solana/web3.js — détection Phantom (window.phantom.solana) + Jupiter REST API + signAndSendTransaction direct. Bundle économisé: ~200KB
[2026-05-05] | SOR via comparator state | Le store Zustand contient déjà les prix des exchanges via WebSocket. Le SOR n'a pas besoin de nouveaux WS — juste lire comparatorPrices et choisir le meilleur
