import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL
const key = import.meta.env.VITE_SUPABASE_ANON_KEY

// Graceful fallback — app works without Supabase during local dev
export const supabase = url && key ? createClient(url, key) : null

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
