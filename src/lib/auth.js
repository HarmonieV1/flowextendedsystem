// FXSEDGE Auth — Supabase email/password + wallet
import { supabase } from './supabase'

export async function signUp(email, password) {
  if (!supabase) return { data: null, error: new Error('Supabase not configured') }
  return await supabase.auth.signUp({ email, password })
}

export async function signIn(email, password) {
  if (!supabase) return { data: null, error: new Error('Supabase not configured') }
  return await supabase.auth.signInWithPassword({ email, password })
}

export async function signOut() {
  if (!supabase) return
  return await supabase.auth.signOut()
}

export async function getUser() {
  if (!supabase) return null
  try {
    const { data: { user } } = await supabase.auth.getUser()
    return user
  } catch { return null }
}

export async function getSession() {
  if (!supabase) return null
  try {
    const { data: { session } } = await supabase.auth.getSession()
    return session
  } catch { return null }
}

export function onAuthChange(callback) {
  if (!supabase) return { data: { subscription: { unsubscribe: () => {} } } }
  return supabase.auth.onAuthStateChange(callback)
}

// Profile
export async function getProfile(userId) {
  if (!supabase) return null
  const { data } = await supabase.from('profiles').select('*').eq('id', userId).single()
  return data
}

export async function updateProfile(userId, updates) {
  if (!supabase) return
  await supabase.from('profiles').update({ ...updates, updated_at: new Date().toISOString() }).eq('id', userId)
}

// Settings
export async function getSettings(userId) {
  if (!supabase) return null
  const { data } = await supabase.from('user_settings').select('*').eq('user_id', userId).single()
  return data
}

export async function updateSettings(userId, settings) {
  if (!supabase) return
  await supabase.from('user_settings').upsert({ user_id: userId, ...settings, updated_at: new Date().toISOString() })
}

// Forgot password
export async function resetPassword(email) {
  if (!supabase) return { error: new Error('Supabase not configured') }
  return await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: window.location.origin + '/#reset',
  })
}

// Check if user has active trial or is pro
export async function checkPremium(userId) {
  if (!supabase) return { tier: 'free', trialActive: false, daysLeft: 0 }
  try {
    const { data } = await supabase.from('profiles').select('tier, trial_ends_at').eq('id', userId).single()
    if (!data) return { tier: 'free', trialActive: false, daysLeft: 0 }
    const now = new Date()
    const trialEnd = data.trial_ends_at ? new Date(data.trial_ends_at) : null
    const trialActive = trialEnd && trialEnd > now
    const daysLeft = trialActive ? Math.ceil((trialEnd - now) / 86400000) : 0
    return {
      tier: data.tier || 'free',
      trialActive,
      daysLeft,
      isPro: data.tier === 'pro' || data.tier === 'admin' || trialActive,
    }
  } catch { return { tier: 'free', trialActive: false, daysLeft: 0, isPro: false } }
}
