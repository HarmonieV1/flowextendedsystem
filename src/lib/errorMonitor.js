// FXSEDGE Error Monitor — capture et enregistre les erreurs en production
// localStorage local + optionnel push vers Supabase (server-side log)

import { supabase } from './supabase'

const STORAGE_KEY = 'fxs_error_log'
const MAX_ERRORS = 50

function getErrors() {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]') } catch { return [] }
}

// Logger principal — utilisable depuis n'importe quel composant
export function logError(error, context = '') {
  try {
    const errors = getErrors()
    const entry = {
      message: error?.message || String(error),
      stack: error?.stack?.split('\n').slice(0, 3).join('\n') || '',
      context,
      url: location.href,
      timestamp: Date.now(),
      userAgent: navigator.userAgent.slice(0, 100),
    }
    errors.unshift(entry)
    localStorage.setItem(STORAGE_KEY, JSON.stringify(errors.slice(0, MAX_ERRORS)))

    // Optional: push critical errors to Supabase (fire-and-forget, never blocks)
    // Only for context tagged 'CRITICAL' to avoid noise
    if (context.includes('CRITICAL') && supabase) {
      supabase.from('error_logs').insert({
        message: entry.message.slice(0, 500),
        context: entry.context.slice(0, 100),
        url: entry.url.slice(0, 200),
        user_agent: entry.userAgent,
      }).then(() => {}).catch(() => {})
    }
  } catch(_) {}
}

// Logger silencieux — pour les catches de WS, fetch optionnels, etc.
// Log dans console en dev, silent en prod
export function logSilent(error, context = '') {
  if (import.meta.env.DEV) {
    console.warn('[FXS]', context, error?.message || error)
  }
  logError(error, '[silent] ' + context)
}

// Global error handlers
export function initErrorMonitor() {
  window.addEventListener('error', (e) => {
    logError(e.error || new Error(e.message), 'window.onerror')
  })
  window.addEventListener('unhandledrejection', (e) => {
    logError(e.reason || new Error('Unhandled rejection'), 'unhandledrejection')
  })
  if (window.PerformanceObserver) {
    try {
      const observer = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if (entry.duration > 5000) {
            logError(new Error(`Slow operation: ${entry.name} (${Math.round(entry.duration)}ms)`), 'performance')
          }
        }
      })
      observer.observe({ entryTypes: ['longtask'] })
    } catch(_) {}
  }
}

export function getErrorLog() { return getErrors() }
export function clearErrorLog() { localStorage.removeItem(STORAGE_KEY) }
export function getErrorCount() { return getErrors().length }
