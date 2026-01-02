import { Download, X, RefreshCw, Sparkles } from 'lucide-react'
import { UpdateInfo } from '../hooks/useUpdater'

interface UpdateNotificationProps {
  updateInfo: UpdateInfo
  onDownload: () => void
  onDismiss: () => void
}

export function UpdateNotification({ updateInfo, onDownload, onDismiss }: UpdateNotificationProps) {
  if (!updateInfo.available) return null

  return (
    <div className="fixed top-4 right-4 z-50 animate-slide-up">
      <div className="glass-card w-80 overflow-hidden shadow-2xl border border-primary/30">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 bg-primary/10 border-b border-primary/20">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-primary" />
            <span className="text-sm font-semibold text-primary">
              Update Available
            </span>
          </div>
          <button
            onClick={onDismiss}
            className="p-1 rounded hover:bg-white/10 transition-colors"
            disabled={updateInfo.downloading}
          >
            <X className="w-4 h-4 text-muted-foreground" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 space-y-3">
          <div>
            <p className="text-sm text-foreground font-medium">
              Version {updateInfo.version} is available
            </p>
            {updateInfo.notes && (
              <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                {updateInfo.notes}
              </p>
            )}
          </div>

          {/* Progress bar when downloading */}
          {updateInfo.downloading && (
            <div className="space-y-2">
              <div className="h-2 bg-secondary/30 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-primary rounded-full transition-all duration-300"
                  style={{ width: `${updateInfo.progress || 0}%` }}
                />
              </div>
              <p className="text-xs text-muted-foreground text-center">
                Downloading... {updateInfo.progress || 0}%
              </p>
            </div>
          )}

          {/* Error message */}
          {updateInfo.error && (
            <p className="text-xs text-destructive">
              {updateInfo.error}
            </p>
          )}

          {/* Actions */}
          {!updateInfo.downloading && (
            <div className="flex gap-2">
              <button
                onClick={onDownload}
                className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors"
              >
                <Download className="w-4 h-4" />
                Update Now
              </button>
              <button
                onClick={onDismiss}
                className="px-3 py-2 bg-secondary/30 text-muted-foreground rounded-lg text-sm hover:bg-secondary/50 transition-colors"
              >
                Later
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

interface UpdateCheckButtonProps {
  checking: boolean
  onClick: () => void
}

export function UpdateCheckButton({ checking, onClick }: UpdateCheckButtonProps) {
  return (
    <button
      onClick={onClick}
      disabled={checking}
      className="flex items-center gap-2 px-3 py-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50"
    >
      <RefreshCw className={`w-3 h-3 ${checking ? 'animate-spin' : ''}`} />
      {checking ? 'Checking...' : 'Check for updates'}
    </button>
  )
}
