import { useState } from 'react'
import { Copy, Trash2, ExternalLink, History, Check, Clock, File } from 'lucide-react'

interface UploadHistoryProps {
  history: Array<{ url: string; name: string; timestamp: number }>
  onCopy?: (url: string) => void
  onDelete?: (url: string) => void
}

export function UploadHistory({ history, onCopy, onDelete }: UploadHistoryProps) {
  const [copiedUrl, setCopiedUrl] = useState<string | null>(null)

  const handleCopy = (url: string) => {
    navigator.clipboard.writeText(url)
    setCopiedUrl(url)
    setTimeout(() => setCopiedUrl(null), 2000)
    onCopy?.(url)
  }

  const formatTime = (timestamp: number) => {
    const now = Date.now()
    const diff = now - timestamp
    
    if (diff < 60000) return 'Just now'
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`
    return new Date(timestamp).toLocaleDateString()
  }

  if (history.length === 0) {
    return (
      <div className="glass-card p-12 text-center">
        <div className="flex justify-center mb-4">
          <div className="p-4 bg-secondary/50 rounded-2xl">
            <History className="text-muted-foreground" size={40} />
          </div>
        </div>
        <h3 className="text-lg font-semibold text-foreground mb-2">No uploads yet</h3>
        <p className="text-sm text-muted-foreground max-w-xs mx-auto">
          Your upload history will appear here once you upload your first file
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between px-1">
        <h3 className="text-sm font-medium text-muted-foreground">
          Recent Uploads
        </h3>
        <span className="text-xs text-muted-foreground">
          {history.length} file{history.length !== 1 ? 's' : ''}
        </span>
      </div>
      
      <div className="space-y-2">
        {history.map((item, idx) => (
          <div
            key={idx}
            className="glass-card p-4 group animate-fade-in"
            style={{ animationDelay: `${idx * 50}ms` }}
          >
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-primary/10 flex-shrink-0">
                <File size={18} className="text-primary" />
              </div>
              
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm text-foreground truncate">
                  {item.name || 'Unnamed file'}
                </p>
                <div className="flex items-center gap-2 mt-1">
                  <Clock size={12} className="text-muted-foreground" />
                  <span className="text-xs text-muted-foreground">
                    {formatTime(item.timestamp)}
                  </span>
                </div>
              </div>

              <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                  onClick={() => handleCopy(item.url)}
                  title="Copy URL"
                  className={`p-2 rounded-lg transition-all duration-200 ${
                    copiedUrl === item.url
                      ? 'bg-primary/20 text-primary'
                      : 'text-muted-foreground hover:text-primary hover:bg-primary/10'
                  }`}
                >
                  {copiedUrl === item.url ? <Check size={16} /> : <Copy size={16} />}
                </button>
                <a
                  href={item.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  title="Open in browser"
                  className="p-2 text-muted-foreground hover:text-primary hover:bg-primary/10 rounded-lg transition-all duration-200"
                >
                  <ExternalLink size={16} />
                </a>
                {onDelete && (
                  <button
                    onClick={() => onDelete(item.url)}
                    title="Remove from history"
                    className="p-2 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-lg transition-all duration-200"
                  >
                    <Trash2 size={16} />
                  </button>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
