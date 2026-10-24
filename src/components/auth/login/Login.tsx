import { useEffect, useRef, useState } from 'react'
import { LogIn, Eye, EyeOff, Loader2, AlertCircle, Shield, ExternalLink, KeyRound, Mail, ArrowLeft, Server } from 'lucide-react'
import { invoke } from '@tauri-apps/api/core'
import { openUrl } from '@tauri-apps/plugin-opener'
import { LoginRequest, LoginResponse } from '../../../types'
import { Logo } from '../../ui/Logo'
import { API_URL } from '../../../constants'

interface LoginProps {
  onLogin: (uploadToken: string, user: LoginResponse['user']) => void
  onSkip: () => void
  server: string
  onServerChange: (url: string) => void
}

const hostOf = (url: string) => {
  try {
    return new URL(url).host
  } catch {
    return url
  }
}

function normalizeServer(input: string) {
  let value = input.trim().replace(/\/+$/, '')
  if (!/^https?:\/\//i.test(value)) value = `https://${value}`
  const url = new URL(value)
  return `${url.protocol}//${url.host}${url.pathname.replace(/\/+$/, '')}`
}

function ServerPicker({ server, onChange, disabled }: { server: string; onChange: (url: string) => void; disabled?: boolean }) {
  const [editing, setEditing] = useState(false)
  const [value, setValue] = useState(server)
  const [checking, setChecking] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const apply = async (input: string) => {
    setError(null)
    let url: string
    try {
      url = normalizeServer(input)
    } catch {
      setError('That doesn’t look like a web address.')
      return
    }
    setChecking(true)
    try {
      const info = await invoke<{ name?: string }>('emberly_get_instance', { apiUrl: url })
      if (!info || typeof info !== 'object') throw new Error()
      onChange(url)
      setEditing(false)
    } catch {
      setError(`Couldn’t find an Emberly server at ${hostOf(url)}.`)
    } finally {
      setChecking(false)
    }
  }

  if (!editing) {
    return (
      <div className="flex items-center justify-center gap-1.5 text-xs text-muted-foreground">
        <Server size={13} />
        <span>
          Server: <span className="font-medium text-foreground">{hostOf(server)}</span>
        </span>
        <button
          type="button"
          disabled={disabled}
          onClick={() => {
            setValue(server)
            setEditing(true)
          }}
          className="text-primary hover:underline disabled:opacity-50"
        >
          Change
        </button>
      </div>
    )
  }

  return (
    <form
      onSubmit={e => {
        e.preventDefault()
        apply(value)
      }}
      className="space-y-2"
    >
      <label htmlFor="flicker-server" className="block text-xs font-medium text-foreground">
        Emberly server
      </label>
      <div className="flex gap-2">
        <input
          id="flicker-server"
          value={value}
          onChange={e => setValue(e.target.value)}
          placeholder="files.example.com"
          autoFocus
          spellCheck={false}
          className={inputClass}
          disabled={checking}
        />
        <button
          type="submit"
          disabled={checking || !value.trim()}
          className="flex shrink-0 items-center gap-1.5 rounded-lg bg-primary px-3 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
        >
          {checking && <Loader2 size={14} className="animate-spin" />}
          Use
        </button>
      </div>
      {error && <ErrorNote message={error} />}
      <div className="flex justify-between text-xs">
        <button type="button" onClick={() => setEditing(false)} className="text-muted-foreground hover:text-foreground">
          Cancel
        </button>
        {hostOf(server) !== hostOf(API_URL) && (
          <button type="button" onClick={() => apply(API_URL)} className="text-muted-foreground hover:text-foreground">
            Use {hostOf(API_URL)}
          </button>
        )}
      </div>
    </form>
  )
}

interface DeviceCode {
  deviceCode: string
  userCode: string
  verificationUriComplete: string
  interval: number
  expiresIn: number
}

type PollResult =
  | { status: 'pending' | 'denied' | 'expired' | 'invalid' }
  | { status: 'approved'; key: string; user: Omit<NonNullable<LoginResponse['user']>, 'uploadToken'> }

const inputClass =
  'w-full px-3 py-2.5 bg-background border border-input rounded-lg text-sm text-foreground placeholder-muted-foreground focus:outline-none focus:border-ring focus:ring-2 focus:ring-ring/20 transition-colors'

function ErrorNote({ message }: { message: string }) {
  return (
    <div className="flex items-center gap-2 rounded-lg border border-destructive/20 bg-destructive/10 p-3 text-sm text-destructive">
      <AlertCircle size={16} className="shrink-0" />
      <span>{message}</span>
    </div>
  )
}

function BrowserSignIn({ onLogin, server }: { onLogin: LoginProps['onLogin']; server: string }) {
  const [device, setDevice] = useState<DeviceCode | null>(null)
  const [starting, setStarting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const cancelled = useRef(false)

  useEffect(() => () => {
    cancelled.current = true
  }, [])

  const start = async () => {
    cancelled.current = false
    setStarting(true)
    setError(null)
    try {
      const code = await invoke<DeviceCode>('device_sign_in_start', { apiUrl: server })
      setDevice(code)
      openUrl(code.verificationUriComplete).catch(() => {})
      poll(code)
    } catch (e) {
      setError(String(e))
    } finally {
      setStarting(false)
    }
  }

  const poll = async (code: DeviceCode) => {
    const deadline = Date.now() + code.expiresIn * 1000
    while (!cancelled.current && Date.now() < deadline) {
      await new Promise(r => setTimeout(r, code.interval * 1000))
      if (cancelled.current) return
      try {
        const result = await invoke<PollResult>('device_sign_in_poll', { apiUrl: server, deviceCode: code.deviceCode })
        if (result.status === 'pending') continue
        if (result.status === 'approved') {
          onLogin(result.key, { ...result.user, uploadToken: result.key })
          return
        }
        setDevice(null)
        setError(result.status === 'denied' ? 'Sign-in was denied in the browser.' : 'That sign-in expired. Start again.')
        return
      } catch (e) {
        setDevice(null)
        setError(String(e))
        return
      }
    }
    if (!cancelled.current) {
      setDevice(null)
      setError('That sign-in expired. Start again.')
    }
  }

  const cancel = () => {
    cancelled.current = true
    setDevice(null)
  }

  if (device) {
    return (
      <div className="space-y-5 text-center">
        <div className="space-y-1">
          <p className="text-sm font-medium text-foreground">Approve Flicker in your browser</p>
          <p className="text-xs text-muted-foreground">Check the code there matches this one.</p>
        </div>
        <div className="rounded-xl border border-border/70 bg-secondary/40 py-4">
          <p className="font-mono text-3xl font-semibold tracking-[0.2em] text-foreground">{device.userCode}</p>
        </div>
        <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
          <Loader2 size={15} className="animate-spin text-primary" />
          Waiting for approval…
        </div>
        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={cancel}
            className="rounded-lg bg-secondary/60 px-4 py-2.5 text-sm font-medium text-foreground transition-colors hover:bg-secondary"
          >
            Cancel
          </button>
          <button
            onClick={() => openUrl(device.verificationUriComplete).catch(() => {})}
            className="flex items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            <ExternalLink size={15} />
            Open browser
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <button
        onClick={start}
        disabled={starting}
        className="flex w-full items-center justify-center gap-2 rounded-lg bg-primary px-4 py-3 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-60"
      >
        {starting ? <Loader2 size={17} className="animate-spin" /> : <Logo size={18} primaryColor="currentColor" accentColor="currentColor" />}
        Sign in with Emberly
      </button>
      <p className="text-center text-xs text-muted-foreground">
        Opens {hostOf(server)} in your browser. Works with every sign-in method, including two-factor, and Flicker gets its own key you can revoke anytime.
      </p>
      {error && <ErrorNote message={error} />}
    </div>
  )
}

function PasswordSignIn({ onLogin, server }: { onLogin: LoginProps['onLogin']; server: string }) {
  const [emailOrUsername, setEmailOrUsername] = useState('')
  const [password, setPassword] = useState('')
  const [twoFactorCode, setTwoFactorCode] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [requires2FA, setRequires2FA] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError(null)
    try {
      const payload: LoginRequest = { emailOrUsername, password }
      if (requires2FA && twoFactorCode) payload.twoFactorCode = twoFactorCode

      const response = await fetch(`${server}/api/auth/desktop`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const data: LoginResponse = await response.json()

      if (data.requires2FA) {
        setRequires2FA(true)
        return
      }
      if (!data.success || !data.user) {
        setError(data.error || 'Sign-in failed')
        return
      }
      onLogin(data.user.uploadToken, data.user)
    } catch (err) {
      console.error('Login error:', err)
      setError(`Couldn't reach ${hostOf(server)}. Check your internet connection.`)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {!requires2FA ? (
        <>
          <div className="space-y-1.5">
            <label className="block text-sm font-medium text-foreground">Email or username</label>
            <input
              type="text"
              value={emailOrUsername}
              onChange={e => setEmailOrUsername(e.target.value)}
              placeholder="name@example.com"
              className={inputClass}
              required
              autoFocus
              disabled={isLoading}
            />
          </div>
          <div className="space-y-1.5">
            <label className="block text-sm font-medium text-foreground">Password</label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="Your password"
                className={`${inputClass} pr-10`}
                required
                disabled={isLoading}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground transition-colors hover:text-foreground"
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>
        </>
      ) : (
        <div className="space-y-4">
          <div className="flex items-center gap-3 rounded-lg border border-primary/20 bg-primary/10 p-3">
            <Shield className="h-5 w-5 shrink-0 text-primary" />
            <p className="text-sm text-foreground">Enter the 6-digit code from your authenticator app</p>
          </div>
          <input
            type="text"
            value={twoFactorCode}
            onChange={e => setTwoFactorCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
            placeholder="000000"
            className={`${inputClass} text-center font-mono text-lg tracking-widest`}
            required
            autoFocus
            disabled={isLoading}
            maxLength={6}
          />
        </div>
      )}

      {error && <ErrorNote message={error} />}

      <button
        type="submit"
        disabled={isLoading}
        className="flex w-full items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
      >
        {isLoading ? <Loader2 size={17} className="animate-spin" /> : <LogIn size={17} />}
        {isLoading ? 'Signing in…' : requires2FA ? 'Verify' : 'Sign in'}
      </button>
    </form>
  )
}

export function Login({ onLogin, onSkip, server, onServerChange }: LoginProps) {
  const [mode, setMode] = useState<'browser' | 'password'>('browser')

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-6">
      <div className="pointer-events-none fixed left-1/2 top-1/3 h-96 w-96 -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary/10 blur-3xl" />

      <div className="relative w-full max-w-sm space-y-6 animate-fade-in">
        <div className="space-y-3 text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl border border-border/70 bg-card shadow-xl shadow-primary/10">
            <Logo size={34} />
          </div>
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-foreground">Welcome to Flicker</h1>
            <p className="text-sm text-muted-foreground">Sign in to your Emberly account to start uploading</p>
          </div>
        </div>

        <div className="glass-card space-y-5 p-6">
          {mode === 'browser' ? (
            <BrowserSignIn key={server} onLogin={onLogin} server={server} />
          ) : (
            <PasswordSignIn key={server} onLogin={onLogin} server={server} />
          )}

          <div className="space-y-1 border-t border-border/60 pt-4">
            {mode === 'browser' ? (
              <button
                onClick={() => setMode('password')}
                className="flex w-full items-center justify-center gap-2 rounded-lg py-2 text-sm text-muted-foreground transition-colors hover:bg-secondary/60 hover:text-foreground"
              >
                <Mail size={15} />
                Sign in with email and password
              </button>
            ) : (
              <button
                onClick={() => setMode('browser')}
                className="flex w-full items-center justify-center gap-2 rounded-lg py-2 text-sm text-muted-foreground transition-colors hover:bg-secondary/60 hover:text-foreground"
              >
                <ArrowLeft size={15} />
                Sign in with your browser instead
              </button>
            )}
            <button
              onClick={onSkip}
              className="flex w-full items-center justify-center gap-2 rounded-lg py-2 text-sm text-muted-foreground transition-colors hover:bg-secondary/60 hover:text-foreground"
            >
              <KeyRound size={15} />
              Use an upload token instead
            </button>
          </div>
        </div>

        <ServerPicker server={server} onChange={onServerChange} />

        <p className="text-center text-xs text-muted-foreground">
          Don't have an account?{' '}
          <a href={`${server}/auth/register`} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
            Sign up at {hostOf(server)}
          </a>
        </p>
      </div>
    </div>
  )
}
