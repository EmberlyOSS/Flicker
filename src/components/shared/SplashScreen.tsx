import { useState, useEffect, useRef } from 'react'
import { Logo } from '../ui/Logo'
import { APP_NAME, APP_VERSION } from '../../constants'
import { findUpdate, installUpdate } from '../../utils/updates'

const LOADING_FACTS = [
  '💡 Ctrl+Shift+S takes a screenshot from anywhere',
  '✂️ Ctrl+Shift+X captures just the part you need',
  '📋 Links are copied to your clipboard as soon as they upload',
  '🔒 You can password-protect any upload',
  "🌐 Manage everything you've shared at embrly.ca",
  '🎨 Try a different theme in Settings → Preferences',
  '🧡 Join the Emberly Discord for help and updates',
  '🔥 Warming up the embers…',
  '🕯️ Every great upload starts with a flicker',
  '✨ Catching a spark…',
]

const MIN_DISPLAY_MS = 1200
const UPDATE_CHECK_TIMEOUT_MS = 4000

type Phase = 'starting' | 'checking' | 'updating' | 'restarting' | 'ready'

interface SplashScreenProps {
  onComplete: () => void
}

function SpinnerRing({ size, progress }: { size: number; progress?: number }) {
  const r = size / 2 - 3
  const circumference = 2 * Math.PI * r
  const determinate = progress !== undefined
  return (
    <svg
      width={size}
      height={size}
      className={`absolute inset-0 ${determinate ? '-rotate-90' : 'animate-spin'}`}
      style={determinate ? undefined : { animationDuration: '1.1s' }}
    >
      <defs>
        <linearGradient id="splash-ring" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#FBBF24" />
          <stop offset="0.5" stopColor="#F97316" />
          <stop offset="1" stopColor="#C2410C" />
        </linearGradient>
      </defs>
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="hsl(var(--border))" strokeWidth="3" />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        fill="none"
        stroke="url(#splash-ring)"
        strokeWidth="3"
        strokeLinecap="round"
        strokeDasharray={circumference}
        strokeDashoffset={determinate ? circumference * (1 - progress / 100) : circumference * 0.72}
        className="transition-[stroke-dashoffset] duration-300"
      />
    </svg>
  )
}

export function SplashScreen({ onComplete }: SplashScreenProps) {
  const [phase, setPhase] = useState<Phase>('starting')
  const [updateVersion, setUpdateVersion] = useState<string | null>(null)
  const [downloadProgress, setDownloadProgress] = useState(0)
  const [fact, setFact] = useState(() => LOADING_FACTS[Math.floor(Math.random() * LOADING_FACTS.length)])
  const started = useRef(false)

  useEffect(() => {
    const timer = setInterval(() => {
      setFact(prev => {
        const others = LOADING_FACTS.filter(f => f !== prev)
        return others[Math.floor(Math.random() * others.length)]
      })
    }, 3500)
    return () => clearInterval(timer)
  }, [])

  useEffect(() => {
    if (started.current) return
    started.current = true
    const startedAt = Date.now()

    const run = async () => {
      setPhase('checking')
      const update = (window as any).__TAURI_INTERNALS__
        ? await Promise.race([
            findUpdate().catch(() => null),
            new Promise<null>(resolve => setTimeout(() => resolve(null), UPDATE_CHECK_TIMEOUT_MS)),
          ])
        : null

      if (update?.canInstall) {
        setUpdateVersion(update.version)
        setPhase('updating')
        try {
          await installUpdate(percent => {
            setDownloadProgress(percent)
            if (percent >= 100) setPhase('restarting')
          })
          return
        } catch (error) {
          console.warn('Update failed, continuing with the current version:', error)
        }
      }

      const remaining = MIN_DISPLAY_MS - (Date.now() - startedAt)
      if (remaining > 0) await new Promise(r => setTimeout(r, remaining))
      setPhase('ready')
      setTimeout(onComplete, 250)
    }

    run().catch(error => {
      console.error('Startup error:', error)
      onComplete()
    })
  }, [onComplete])

  const updating = phase === 'updating' || phase === 'restarting'
  const status = {
    starting: 'Starting Flicker…',
    checking: 'Checking for updates…',
    updating: `Downloading v${updateVersion}…`,
    restarting: 'Restarting to finish the update…',
    ready: 'Ready',
  }[phase]

  return (
    <div
      className={`fixed inset-0 z-[100] flex items-center justify-center bg-background transition-opacity duration-200 ${
        phase === 'ready' ? 'opacity-0' : 'opacity-100'
      }`}
    >
      <div className="pointer-events-none absolute left-1/2 top-1/2 h-96 w-96 -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary/10 blur-3xl" />

      <div className="relative flex w-72 flex-col items-center gap-6">
        <div className="relative h-28 w-28">
          <SpinnerRing size={112} progress={phase === 'updating' ? downloadProgress : undefined} />
          <div className="absolute inset-3 flex items-center justify-center rounded-[1.4rem] border border-border/70 bg-card shadow-2xl shadow-primary/10">
            <Logo size={48} />
          </div>
        </div>

        <div className="space-y-1.5 text-center">
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">
            {updating ? 'Updating Flicker' : APP_NAME}
          </h1>
          <p className="text-sm text-muted-foreground">{status}</p>
        </div>

        {updating ? (
          <div className="w-full space-y-2">
            <div className="h-1.5 overflow-hidden rounded-full bg-secondary">
              <div
                className="h-full rounded-full bg-primary transition-[width] duration-300"
                style={{ width: `${downloadProgress}%` }}
              />
            </div>
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>
                v{APP_VERSION} → v{updateVersion}
              </span>
              <span className="tabular-nums">{downloadProgress}%</span>
            </div>
          </div>
        ) : (
          <p key={fact} className="h-10 text-center text-xs text-muted-foreground animate-fade-in">
            {fact}
          </p>
        )}

        <p className="text-[11px] text-muted-foreground/60">v{APP_VERSION}</p>
      </div>
    </div>
  )
}
