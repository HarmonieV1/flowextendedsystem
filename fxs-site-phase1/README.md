# FXS Site

Landing simple (3 pages) pour FXS.

## Pages
- `/` Home
- `/pricing` Offres + boutons Telegram pré-remplis
- `/faq` FAQ + support Telegram

## Liens
- TradingView script: https://fr.tradingview.com/script/pEvKZ6To/
- Telegram: @alpha_fxs (liens pré-remplis dans `src/lib/links.ts`)

## Dev local
```bash
npm install
npm run dev
```

## Déploiement (le plus simple) : Vercel
1. Crée un compte Vercel
2. `New Project` → importe ce dossier (GitHub conseillé)
3. Framework détecté automatiquement (Next.js)
4. Deploy

### Domaine (plus tard)
Tu pourras connecter ton domaine dans Vercel → Settings → Domains.

## Notes
- Couleur accent: `#a0e00d`
- Le texte et les sections sont facilement modifiables dans `src/lib/content.ts`.
