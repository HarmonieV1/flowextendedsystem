# Créer le repo GitHub — copie-colle exactement

## Étape 1 — Terminal sur Mac
Ouvre Terminal (Cmd+Space → "Terminal")

## Étape 2 — Installe les outils
```bash
# Vérifie si git est installé
git --version
# Si pas installé : xcode-select --install
```

## Étape 3 — Crée le repo sur GitHub.com
1. Va sur https://github.com/new
2. Repository name : **fxs-exchange**
3. Private ✓
4. **NE COCHE PAS** "Add README"
5. Clique "Create repository"
6. Copie l'URL qui s'affiche (ex: https://github.com/TonPseudo/fxs-exchange.git)

## Étape 4 — Copie-colle dans Terminal (remplace URL par la tienne)
```bash
cd ~/Downloads/fxs-exchange
git init
git config user.email "ton@email.com"
git config user.name "Alpha"
git add -A
git commit -m "FXS Exchange V1"
git branch -M main
git remote add origin https://github.com/TonPseudo/fxs-exchange.git
git push -u origin main
```
→ GitHub va demander ton username + un token (pas ton mot de passe)
→ Pour le token : github.com → Settings → Developer settings → Personal access tokens → Generate new token → coche "repo" → Generate → copie-le

## Étape 5 — Connecte Netlify
1. app.netlify.com → "Add new site" → "Import an existing project"
2. GitHub → autorise → sélectionne fxs-exchange
3. Build command : npm run build
4. Publish : dist
5. Add environment variables :
   VITE_FEE_RECIPIENT = 0x12B31352569DDC3a6D4254bc7e22fCB2B75F42b1
6. Deploy

## Étape 6 — Mises à jour futures (depuis ~/Downloads/fxs-exchange)
```bash
git add -A && git commit -m "update" && git push
```
Netlify redéploie automatiquement en 2 min.
