import { useEffect, useState } from 'react'
import { invoke } from '@tauri-apps/api/core'
import { BarChart3, HardDrive, Files, Link2, Eye, Download, Globe, Loader2, AlertCircle } from 'lucide-react'
import { AnalyticsSummary } from '../../types'
import { API_URL } from '../../constants'

interface StatsPageProps {
  uploadToken: string
  uploadUrl?: string
}

function formatSize(bytes: number): string {
  if (!bytes) return '0 B'
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`
}

function StatCard({ icon: Icon, label, value }: { icon: React.ElementType; label: string; value: string | number }) {
  return (
    <div className="glass-card p-4 flex items-center gap-3">
      <div className="p-2.5 rounded-xl bg-primary/10 border border-primary/20">
        <Icon size={18} className="text-primary" />
      </div>
      <div>
        <p className="text-lg font-semibold text-foreground">{value}</p>
        <p className="text-xs text-muted-foreground">{label}</p>
      </div>
    </div>
  )
}

export function StatsPage({ uploadToken, uploadUrl }: StatsPageProps) {
  const [stats, setStats] = useState<AnalyticsSummary | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!uploadToken) {
      setLoading(false)
      return
    }
    setLoading(true)
    setError(null)
    invoke<AnalyticsSummary>('emberly_get_stats', {
      apiUrl: uploadUrl || API_URL,
      token: uploadToken,
    })
      .then(setStats)
      .catch((err) => setError(err instanceof Error ? err.message : String(err)))
      .finally(() => setLoading(false))
  }, [uploadToken, uploadUrl])

  if (loading) {
    return (
      <div className="glass-card p-12 flex flex-col items-center gap-3 text-center">
        <Loader2 size={32} className="text-primary animate-spin" />
        <p className="text-sm text-muted-foreground">Loading your stats...</p>
      </div>
    )
  }

  if (error || !stats) {
    return (
      <div className="glass-card p-12 text-center border-l-4 border-l-destructive">
        <AlertCircle size={32} className="mx-auto mb-3 text-destructive" />
        <h3 className="text-lg font-semibold text-foreground mb-1">Couldn't load stats</h3>
        <p className="text-sm text-muted-foreground">{error || 'Sign in to view your stats.'}</p>
      </div>
    )
  }

  const maxPerDay = Math.max(1, ...stats.uploadsPerDay.map(d => d.count))

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard icon={Files} label="Files" value={stats.basic.totalFiles} />
        <StatCard icon={HardDrive} label="Storage Used" value={formatSize(stats.basic.storageUsed)} />
        <StatCard icon={Link2} label="Short URLs" value={stats.basic.totalUrls} />
        <StatCard icon={Globe} label="Domains" value={`${stats.basic.verifiedDomains}/${stats.basic.domainsCount}`} />
        <StatCard icon={Eye} label="Total Views" value={stats.basic.totalViews} />
        <StatCard icon={Download} label="Total Downloads" value={stats.basic.totalDownloads} />
        <StatCard icon={BarChart3} label="Link Clicks" value={stats.basic.totalUrlClicks} />
      </div>

      {stats.uploadsPerDay.length > 0 && (
        <div className="glass-card p-4 space-y-3">
          <h3 className="text-sm font-semibold text-foreground">Uploads — Last 14 Days</h3>
          <div className="flex items-end gap-1.5 h-24">
            {stats.uploadsPerDay.map(day => (
              <div key={day.date} className="flex-1 flex flex-col items-center gap-1 group relative">
                <div
                  className="w-full rounded-t bg-primary/60 group-hover:bg-primary transition-colors min-h-[2px]"
                  style={{ height: `${Math.max(2, (day.count / maxPerDay) * 100)}%` }}
                  title={`${day.date}: ${day.count} upload${day.count === 1 ? '' : 's'}`}
                />
              </div>
            ))}
          </div>
        </div>
      )}

      {stats.allowed.recentUploads && stats.recentUploads.length > 0 && (
        <div className="glass-card p-4 space-y-2">
          <h3 className="text-sm font-semibold text-foreground mb-2">Recent Uploads</h3>
          {stats.recentUploads.map(file => (
            <div key={file.id} className="flex items-center justify-between gap-3 py-2 border-b border-border/30 last:border-0">
              <p className="text-sm text-foreground truncate flex-1">{file.name}</p>
              <span className="text-xs text-muted-foreground whitespace-nowrap">{formatSize(file.size)}</span>
            </div>
          ))}
        </div>
      )}

      <p className="text-xs text-center text-muted-foreground">Plan: {stats.plan}</p>
    </div>
  )
}
