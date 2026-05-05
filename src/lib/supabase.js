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

// ── Watchlist ──
export async function getWatchlist(userId) {
  if (!supabase) return ['BTCUSDT', 'ETHUSDT', 'SOLUSDT']
  const { data } = await supabase
    .from('watchlist')
    .select('pair')
    .eq('user_id', userId)
    .order('created_at')
  return data?.map(r => r.pair) ?? ['BTCUSDT', 'ETHUSDT', 'SOLUSDT']
}

export async function addToWatchlist(userId, pair) {
  if (!supabase) return
  await supabase.from('watchlist').upsert({ user_id: userId, pair })
}

export async function removeFromWatchlist(userId, pair) {
  if (!supabase) return
  await supabase.from('watchlist').delete().eq('user_id', userId).eq('pair', pair)
}

// ── Trade history ──
export async function saveTrade(trade) {
  if (!supabase) return
  await supabase.from('trade_history').insert(trade)
}

export async function getTradeHistory(userId, limit = 50) {
  if (!supabase) return []
  const { data } = await supabase
    .from('trade_history')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(limit)
  return data ?? []
}
