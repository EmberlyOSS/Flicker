import type { CSSProperties, ElementType, ReactNode } from 'react'

const isMac = typeof navigator !== 'undefined' && /Mac/.test(navigator.platform || navigator.userAgent)

export function Section({ icon: Icon, title, description, action, children, className = '' }: {
  icon?: ElementType
  title: string
  description?: string
  action?: ReactNode
  children: ReactNode
  className?: string
}) {
  return (
    <section className={`glass-card p-5 ${className}`}>
      <div className="mb-4 flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          {Icon && (
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 ring-1 ring-primary/20">
              <Icon size={17} className="text-primary" />
            </div>
          )}
          <div className="min-w-0">
            <h3 className="text-sm font-semibold text-foreground">{title}</h3>
            {description && <p className="text-xs text-muted-foreground">{description}</p>}
          </div>
        </div>
        {action}
      </div>
      {children}
    </section>
  )
}

export function SettingRow({ icon: Icon, title, description, children }: {
  icon?: ElementType
  title: string
  description?: ReactNode
  children?: ReactNode
}) {
  return (
    <div className="flex items-center justify-between gap-4 py-3">
      <div className="flex min-w-0 items-center gap-3">
        {Icon && <Icon size={16} className="shrink-0 text-muted-foreground" />}
        <div className="min-w-0">
          <p className="text-sm font-medium text-foreground">{title}</p>
          {description && <div className="text-xs text-muted-foreground">{description}</div>}
        </div>
      </div>
      {children && <div className="shrink-0">{children}</div>}
    </div>
  )
}

export function Segmented<T extends string>({ value, options, onChange }: {
  value: T
  options: { value: T; label: ReactNode; title?: string; style?: CSSProperties }[]
  onChange: (value: T) => void
}) {
  return (
    <div className="inline-flex rounded-lg bg-secondary/60 p-0.5">
      {options.map(o => (
        <button
          key={o.value}
          title={o.title}
          onClick={() => onChange(o.value)}
          style={o.style}
          className={`flex h-7 min-w-9 items-center justify-center gap-1.5 rounded-md px-2.5 text-xs font-medium transition-colors ${
            value === o.value ? 'bg-card text-foreground shadow-sm ring-1 ring-border' : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}

export function Switch({ checked, onChange, label }: { checked: boolean; onChange: (checked: boolean) => void; label: string }) {
  return (
    <button
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors ${checked ? 'bg-primary' : 'bg-muted'}`}
    >
      <span className={`inline-block h-4 w-4 rounded-full bg-white shadow-sm transition-transform ${checked ? 'translate-x-[18px]' : 'translate-x-0.5'}`} />
    </button>
  )
}

export function Kbd({ shortcut }: { shortcut?: string }) {
  if (!shortcut) return <span className="text-[11px] text-muted-foreground/60">Not set</span>
  const keys = shortcut.split('+').map(k => {
    const key = k.trim()
    if (/^(control|ctrl)$/i.test(key)) return isMac ? '⌃' : 'Ctrl'
    if (/^(super|meta|cmd|command)$/i.test(key)) return isMac ? '⌘' : 'Win'
    if (/^alt$/i.test(key)) return isMac ? '⌥' : 'Alt'
    if (/^shift$/i.test(key)) return isMac ? '⇧' : 'Shift'
    if (/^printscreen$/i.test(key)) return 'PrtSc'
    return key.toUpperCase()
  })
  return (
    <span className="inline-flex items-center gap-0.5">
      {keys.map((k, i) => (
        <kbd key={i} className="min-w-5 rounded border border-border/80 bg-secondary/70 px-1.5 py-0.5 text-center font-sans text-[10px] font-medium text-muted-foreground">
          {k}
        </kbd>
      ))}
    </span>
  )
}

export function StatTile({ icon: Icon, label, value, hint }: { icon: ElementType; label: string; value: ReactNode; hint?: ReactNode }) {
  return (
    <div className="glass-card p-4">
      <div className="flex items-center justify-between">
        <p className="text-xs text-muted-foreground">{label}</p>
        <Icon size={15} className="text-muted-foreground" />
      </div>
      <p className="mt-2 text-2xl font-semibold tracking-tight tabular-nums text-foreground">{value}</p>
      {hint && <p className="mt-0.5 text-[11px] text-muted-foreground">{hint}</p>}
    </div>
  )
}

export function EmptyState({ icon: Icon, title, description, action }: { icon: ElementType; title: string; description?: string; action?: ReactNode }) {
  return (
    <div className="glass-card flex flex-col items-center gap-3 px-6 py-12 text-center">
      <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 ring-1 ring-primary/20">
        <Icon size={20} className="text-primary" />
      </div>
      <div>
        <p className="text-sm font-medium text-foreground">{title}</p>
        {description && <p className="mt-0.5 text-xs text-muted-foreground">{description}</p>}
      </div>
      {action}
    </div>
  )
}

export function formatBytes(bytes: number) {
  if (!bytes) return '0 B'
  const units = ['B', 'KB', 'MB', 'GB', 'TB']
  const i = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1)
  return `${(bytes / 1024 ** i).toFixed(i ? 1 : 0)} ${units[i]}`
}

export function timeAgo(timestamp: number) {
  const s = Math.max(0, Math.round((Date.now() - timestamp) / 1000))
  if (s < 60) return 'just now'
  const m = Math.round(s / 60)
  if (m < 60) return `${m}m ago`
  const h = Math.round(m / 60)
  if (h < 24) return `${h}h ago`
  const d = Math.round(h / 24)
  return d < 30 ? `${d}d ago` : new Date(timestamp).toLocaleDateString()
}
