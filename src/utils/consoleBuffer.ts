import { useEffect, useState } from 'react'
import { invoke } from '@tauri-apps/api/core'

const MAX_LINES = 500
const lines: string[] = []
const listeners = new Set<() => void>()
let started = false
let notifyScheduled = false

const isTauri = () => typeof window !== 'undefined' && !!(window as any).__TAURI_INTERNALS__

function format(args: unknown[]) {
  return args
    .map(a => {
      if (a instanceof Error) return a.stack || a.message
      if (typeof a === 'object') {
        try {
          return JSON.stringify(a)
        } catch {
          return String(a)
        }
      }
      return String(a)
    })
    .join(' ')
}

function push(level: string, message: string) {
  lines.push(`${new Date().toTimeString().slice(0, 8)} [APP] ${level} ${message}`)
  if (lines.length > MAX_LINES) lines.splice(0, lines.length - MAX_LINES)
  if (!notifyScheduled) {
    notifyScheduled = true
    setTimeout(() => {
      notifyScheduled = false
      listeners.forEach(l => l())
    }, 0)
  }
}

export function logActivity(eventType: string, message: string, level: 'info' | 'warning' | 'error' = 'info') {
  if (!isTauri()) return
  invoke('log_event', { eventType, message, level, metadata: null }).catch(() => {})
}

export function startConsoleCapture() {
  if (started) return
  started = true

  for (const [method, level] of [['log', 'INFO'], ['info', 'INFO'], ['warn', 'WARN'], ['error', 'ERROR']] as const) {
    const original = console[method].bind(console)
    console[method] = (...args: unknown[]) => {
      original(...args)
      push(level, format(args))
    }
  }

  window.addEventListener('error', e => {
    const message = `${e.message} (${e.filename}:${e.lineno})`
    push('ERROR', message)
    logActivity('app_error', message, 'error')
  })
  window.addEventListener('unhandledrejection', e => {
    const message = `Unhandled promise rejection: ${format([e.reason])}`
    push('ERROR', message)
    logActivity('app_error', message, 'error')
  })
}

export function useConsoleLogs(active: boolean) {
  const [appLines, setAppLines] = useState<string[]>(() => [...lines])
  const [backendLines, setBackendLines] = useState<string[]>([])
  const [clearedAt, setClearedAt] = useState({ app: 0, backend: 0 })

  useEffect(() => {
    const update = () => setAppLines([...lines])
    listeners.add(update)
    return () => {
      listeners.delete(update)
    }
  }, [])

  useEffect(() => {
    if (!active || !isTauri()) return
    const load = () =>
      invoke<string[]>('get_backend_logs')
        .then(setBackendLines)
        .catch(() => {})
    load()
    const timer = setInterval(load, 3000)
    return () => clearInterval(timer)
  }, [active])

  const merged = [
    ...appLines.slice(clearedAt.app),
    ...backendLines.slice(clearedAt.backend).map(l => l.replace(/^(\S+) /, '$1 [CORE] ')),
  ].sort()

  return {
    lines: merged,
    clear: () => setClearedAt({ app: appLines.length, backend: backendLines.length }),
  }
}
