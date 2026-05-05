# Setup GitHub + Netlify pour FXS Exchange

## 1. Créer le repo GitHub

1. Va sur github.com → New repository
2. Nom : `fxs-exchange`
3. Visibilité : **Private** (pour protéger ta config)
4. Ne pas initialiser avec README

## 2. Pusher le code

Dans ton terminal (Mac) :

```bash
# Installe git si pas déjà fait
# brew install git

# Clone ce repo localement depuis Claude
# (télécharge le zip et dézippe dans un dossier)

cd fxs-exchange
git init
git config user.email "ton@email.com"
git config user.name "Ton Nom"
git add -A
git commit -m "Initial commit FXS Exchange V1"

# Connecte au repo GitHub
git remote add origin https://github.com/TON_USERNAME/fxs-exchange.git
git branch -M main
git push -u origin main
```

## 3. Connecter Netlify au repo

1. Va sur app.netlify.com
2. "Add new site" → "Import an existing project"
3. Connecte GitHub → sélectionne `fxs-exchange`
4. Build settings (auto-détectés) :
   - Build command : `npm run build`
   - Publish directory : `dist`
   - Functions directory : `netlify/functions`
5. **Variables d'environnement** → Add :
   ```
   VITE_FEE_RECIPIENT = 0x12B31352569DDC3a6D4254bc7e22fCB2B75F42b1
   VITE_SUPABASE_URL  = https://cadstrrvuvwnxatrdxeo.supabase.co
   VITE_SUPABASE_ANON_KEY = [ta clé Supabase]
   VITE_WALLETCONNECT_PROJECT_ID = 17af070cda2337317b0ca350f879c1e7
   ```
6. Deploy site

## 4. Après le déploiement

Les Netlify Functions seront actives :
- `/.netlify/functions/bybit-ticker` → prix Bybit sans CORS
- `/.netlify/functions/bitget-ticker` → prix Bitget sans CORS  
- `/.netlify/functions/bitunix-ticker` → prix Bitunix sans CORS
- `/.netlify/functions/fear-greed` → Fear & Greed Index

## 5. Mises à jour futures

```bash
git add -A
git commit -m "description du changement"
git push
```
Netlify redéploie automatiquement en 1-2 minutes.
