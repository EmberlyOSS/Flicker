import { useEffect, useState } from 'react'
import { invoke } from '@tauri-apps/api/core'
import { BarChart3, HardDrive, Files, Link2, Eye, Download, MousePointerClick, AlertCircle, RefreshCw, Clock } from 'lucide-react'
import { AnalyticsSummary } from '../../types'
import { API_URL } from '../../constants'
import { useApp } from '../../context/AppContext'
import { EmptyState, Section, StatTile, formatBytes, timeAgo } from '../ui/kit'

interface StatsPageProps {
  uploadToken: string
  uploadUrl?: string
}

const MB = 1024 * 1024

function UploadsChart({ days }: { days: { date: string; count: number }[] }) {
  const max = Math.max(1, ...days.map(d => d.count))
  const total = days.reduce((sum, d) => sum + d.count, 0)
  return (
    <Section icon={BarChart3} title="Uploads" description={`${total} in the last ${days.length} days`}>
      <div className="flex h-36 items-end gap-1.5">
        {days.map(d => (
          <div key={d.date} className="group relative flex h-full flex-1 items-end">
            <div
              className="w-full rounded-t-md bg-primary/70 transition-colors group-hover:bg-primary"
              style={{ height: `${Math.max(d.count ? 6 : 2, (d.count / max) * 100)}%`, opacity: d.count ? 1 : 0.25 }}
            />
            <div className="pointer-events-none absolute -top-8 left-1/2 z-10 -translate-x-1/2 whitespace-nowrap rounded-md border border-border bg-popover px-2 py-1 text-[11px] text-foreground opacity-0 shadow-md transition-opacity group-hover:opacity-100">
              {d.count} on {new Date(d.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
            </div>
          </div>
        ))}
      </div>
      <div className="mt-2 flex justify-between text-[11px] text-muted-foreground">
        <span>{new Date(days[0].date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</span>
        <span>Today</span>
      </div>
    </Section>
  )
}

export function StatsPage({ uploadToken, uploadUrl }: StatsPageProps) {
  const { instance } = useApp()
  const [stats, setStats] = useState<AnalyticsSummary | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  const load = () => {
    if (!uploadToken) {
      setLoading(false)
      return
    }
    setLoading(true)
    setError(null)
    invoke<AnalyticsSummary>('emberly_get_stats', { apiUrl: uploadUrl || API_URL, token: uploadToken })
      .then(setStats)
      .catch(err => setError(err instanceof Error ? err.message : String(err)))
      .finally(() => setLoading(false))
  }

  useEffect(load, [uploadToken, uploadUrl])

  if (loading && !stats) {
    return (
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
        {Array.from({ length: 6 }, (_, i) => (
          <div key={i} className="glass-card h-[92px] animate-pulse" />
        ))}
      </div>
    )
  }

  if (error || !stats) {
    return (
      <EmptyState
        icon={AlertCircle}
        title="Couldn't load your stats"
        description={uploadToken ? error ?? undefined : 'Sign in to see your stats.'}
        action={
          uploadToken && (
            <button onClick={load} className="flex items-center gap-1.5 rounded-md bg-secondary/60 px-3 py-1.5 text-xs font-medium text-foreground transition-colors hover:bg-secondary">
              <RefreshCw size={12} />
              Try again
            </button>
          )
        }
      />
    )
  }

  const b = stats.basic
  const n = (v: number) => v.toLocaleString()

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
        <StatTile icon={Files} label="Files" value={n(b.totalFiles)} />
        <StatTile icon={HardDrive} label="Storage used" value={formatBytes(b.storageUsed * MB)} />
        <StatTile icon={Eye} label="Views" value={n(b.totalViews)} />
        <StatTile icon={Download} label="Downloads" value={n(b.totalDownloads)} />
        <StatTile icon={Link2} label="Short links" value={n(b.totalUrls)} />
        <StatTile icon={MousePointerClick} label="Link clicks" value={n(b.totalUrlClicks)} />
      </div>

      {stats.uploadsPerDay?.length > 0 && <UploadsChart days={stats.uploadsPerDay} />}

      {stats.recentUploads?.length > 0 && (
        <Section icon={Clock} title="Recent uploads">
          <div className="divide-y divide-border/60">
            {stats.recentUploads.map(file => (
              <div key={file.id} className="flex items-center justify-between gap-3 py-2.5">
                <div className="min-w-0">
                  <p className="truncate text-sm text-foreground">{file.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {formatBytes(file.size * MB)} · {timeAgo(Date.parse(file.uploadedAt))}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-3 text-xs tabular-nums text-muted-foreground">
                  <span className="flex items-center gap-1"><Eye size={12} />{n(file.views)}</span>
                  <span className="flex items-center gap-1"><Download size={12} />{n(file.downloads)}</span>
                </div>
              </div>
            ))}
          </div>
        </Section>
      )}

      {instance.billingEnabled && <p className="text-center text-xs text-muted-foreground">Plan: {stats.plan}</p>}
    </div>
  )
}
