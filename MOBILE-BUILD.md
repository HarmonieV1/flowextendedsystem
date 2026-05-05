# FXSEDGE — Build Mobile App Native

## Prérequis
- Node.js 18+
- Pour iOS: Xcode 15+, macOS
- Pour Android: Android Studio, JDK 17+

## Setup (une seule fois)
```bash
# Installer Capacitor
npm install @capacitor/core @capacitor/cli
npm install @capacitor/ios @capacitor/android
npm install @capacitor/status-bar @capacitor/splash-screen @capacitor/keyboard
npm install @capacitor/local-notifications @capacitor/push-notifications

# Initialiser les projets natifs
npx cap add ios
npx cap add android
```

## Build & Deploy

### iOS
```bash
npm run build          # Build React
npx cap sync ios       # Sync vers Xcode
npx cap open ios       # Ouvrir dans Xcode
# Dans Xcode: Product → Run (ou Cmd+R)
```

### Android
```bash
npm run build          # Build React
npx cap sync android   # Sync vers Android Studio
npx cap open android   # Ouvrir dans Android Studio
# Dans AS: Run → Run 'app'
```

## Notes
- Le `webDir: "dist"` dans capacitor.config.json pointe vers le build Vite
- `npx cap sync` copie le build + les plugins natifs
- Les push notifications nécessitent un certificat APNs (iOS) ou Firebase Cloud Messaging (Android)
- Le StatusBar est configuré en dark (#09090b) pour matcher le thème FXSEDGE
