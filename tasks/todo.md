# FXSEDGE — Session 6 (Security cleanup pré-prod)

## Plan de fix par priorité

### P0 — IMPACT FUNDS (do first)
1. Remplacer FXS_FEE_RECIPIENT_SOL par 7NfhKt5i8guHj4nfhrN4XrdEWK7yxmz92wDyTa9g8EnC

### P1 — RLS Supabase (data integrity)
2. Edge Function pour validation SIWE server-side OU
   policies RLS basées sur auth.uid() (Supabase Auth) au lieu de wallet_address client

### P2 — Robustesse / nettoyage
3. CSP: enlever 'unsafe-inline' de script-src (utiliser nonces ou hashes)
4. checkPremium: déplacer vers RPC server-side (sécuriser le gate Premium)

### P3 — Veille
5. npm audit: surveiller, pas de fix dispo immédiat

## Constraints
- Build clean après chaque fix
- Pas casser : auth flow, trading flow, wallet connect, lazy loading
- Tester chaque modif au build avant de passer à la suivante
