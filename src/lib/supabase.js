import { createClient } from '@supabase/supabase-js'

// Public credentials (anon key is meant to be public — RLS protects the data)
// Fallback ensures app works even if Netlify env vars fail to inject at build time
const FALLBACK_URL = 'https://cadstrrvuvwnxatrdxeo.supabase.co'
const FALLBACK_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNhZHN0cnJ2dXZ3bnhhdHJkeGVvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY1MzczODUsImV4cCI6MjA5MjExMzM4NX0.pZFeRkrgH4hOQbIdxvQc_2_ZfdTCAOONJLAhUEeA_50'

const url = import.meta.env.VITE_SUPABASE_URL || FALLBACK_URL
const key = import.meta.env.VITE_SUPABASE_ANON_KEY || FALLBACK_KEY

export const supabase = url && key ? createClient(url, key) : null

// Diagnostic: log to console which mode is active (helps debug env issues)
if (typeof window !== 'undefined' && !import.meta.env.PROD) {
  if (!import.meta.env.VITE_SUPABASE_URL) {
    console.warn('[FXS] Using fallback Supabase URL (env var missing)')
  }
}

// ── Watchlist (Phase 2 — currently using localStorage in Watchlist.jsx) ──
// SECURITY: These functions rely on Supabase Auth + RLS policies (auth.uid()).
// The user MUST be authenticated via supabase.auth before calling.
// RLS policies in supabase-schema.sql restrict access to rows where user_id = auth.uid().
async function getCurrentUserId() {
  if (!supabase) return null
  const { data: { user } } = await supabase.auth.getUser()
  return user?.id || null
}

export async function getWatchlist() {
  if (!supabase) return ['BTCUSDT', 'ETHUSDT', 'SOLUSDT']
  const userId = await getCurrentUserId()
  if (!userId) return ['BTCUSDT', 'ETHUSDT', 'SOLUSDT']
  const { data } = await supabase
    .from('watchlist')
    .select('pair')
    .eq('user_id', userId)
    .order('created_at')
  return data?.map(r => r.pair) ?? ['BTCUSDT', 'ETHUSDT', 'SOLUSDT']
}

export async function addToWatchlist(pair) {
  if (!supabase) return
  const userId = await getCurrentUserId()
  if (!userId) return
  await supabase.from('watchlist').upsert({ user_id: userId, pair })
}

export async function removeFromWatchlist(pair) {
  if (!supabase) return
  const userId = await getCurrentUserId()
  if (!userId) return
  await supabase.from('watchlist').delete().eq('user_id', userId).eq('pair', pair)
}

// ── Trade history (Phase 2) ──
export async function saveTrade(trade) {
  if (!supabase) return
  const userId = await getCurrentUserId()
  if (!userId) return
  // user_id is automatically validated by RLS policy with check (user_id = auth.uid())
  await supabase.from('trade_history').insert({ ...trade, user_id: userId })
}

export async function getTradeHistory(limit = 50) {
  if (!supabase) return []
  const userId = await getCurrentUserId()
  if (!userId) return []
  const { data } = await supabase
    .from('trade_history')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(limit)
  return data ?? []
}
