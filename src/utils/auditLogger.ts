import { invoke } from '@tauri-apps/api/core'

/**
 * Global audit logger that captures all console errors, warnings, and other important events
 * This ensures comprehensive tracking for support and debugging purposes
 */

let isInitialized = false

export function initializeAuditLogging() {
  if (isInitialized) return
  isInitialized = true

  const originalError = console.error
  console.error = (...args: any[]) => {
    originalError(...args)
    const message = args
      .map(arg => (typeof arg === 'object' ? JSON.stringify(arg) : String(arg)))
      .join(' ')
    logToAudit('console_error', message, 'error')
  }

  const originalWarn = console.warn
  console.warn = (...args: any[]) => {
    originalWarn(...args)
    const message = args
      .map(arg => (typeof arg === 'object' ? JSON.stringify(arg) : String(arg)))
      .join(' ')
    logToAudit('console_warn', message, 'warning')
  }

  window.addEventListener('unhandledrejection', event => {
    const reason = event.reason
    const message = typeof reason === 'object' ? JSON.stringify(reason) : String(reason)
    logToAudit('unhandled_rejection', `Unhandled Promise Rejection: ${message}`, 'error', {
      type: 'unhandledrejection',
      reason
    })
  })

  window.addEventListener('error', event => {
    const message = event.message || event.type
    logToAudit('global_error', `${event.filename}:${event.lineno} - ${message}`, 'error', {
      filename: event.filename,
      lineno: event.lineno,
      colno: event.colno,
      message: event.message,
    })
  })

  const originalFetch = window.fetch
  window.fetch = function (...args: any[]) {
    const url = typeof args[0] === 'string' ? args[0] : args[0]?.url || 'unknown'
    return originalFetch.apply(window, args as any).catch(error => {
      logToAudit('fetch_error', `Network error fetching ${url}: ${error.message}`, 'error', {
        url,
        error: error.message,
      })
      throw error
    })
  }

  logToAudit('app_init', 'Application initialized', 'info')

  window.addEventListener('beforeunload', () => {
    logToAudit('app_unload', 'Application unloading', 'info')
  })
}


function logToAudit(
  eventType: string,
  message: string,
  level: 'info' | 'warning' | 'error',
  metadata?: Record<string, any>
) {
  if (!(window as any).__TAURI_INTERNALS__) {
    return
  }

  invoke('log_event', {
    event_type: eventType,
    message,
    level,
    metadata: metadata || null,
  }).catch(() => {})
}

export async function logEvent(
  eventType: string,
  message: string,
  level: 'info' | 'warning' | 'error' = 'info',
  metadata?: Record<string, any>
) {
  logToAudit(eventType, message, level, metadata)
}
