// FXSEDGE Error Monitor — capture et enregistre les erreurs en production
// En l'absence de Sentry, on log les erreurs dans localStorage + console

const STORAGE_KEY = 'fxs_error_log'
const MAX_ERRORS = 50

function getErrors() {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]') } catch { return [] }
}

function logError(error, context = '') {
  try {
    const errors = getErrors()
    errors.unshift({
      message: error.message || String(error),
      stack: error.stack?.split('\n').slice(0, 3).join('\n') || '',
      context,
      url: location.href,
      timestamp: Date.now(),
      userAgent: navigator.userAgent.slice(0, 100),
    })
    // Keep only last N errors
    localStorage.setItem(STORAGE_KEY, JSON.stringify(errors.slice(0, MAX_ERRORS)))
  } catch(_) {}
}

// Global error handlers
export function initErrorMonitor() {
  // Uncaught errors
  window.addEventListener('error', (e) => {
    logError(e.error || new Error(e.message), 'window.onerror')
  })

  // Unhandled promise rejections
  window.addEventListener('unhandledrejection', (e) => {
    logError(e.reason || new Error('Unhandled rejection'), 'unhandledrejection')
  })

  // Performance monitoring — log slow operations
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

// Get error log for debugging
export function getErrorLog() { return getErrors() }

// Clear error log
export function clearErrorLog() { localStorage.removeItem(STORAGE_KEY) }

// Error count badge
export function getErrorCount() { return getErrors().length }
