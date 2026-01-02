import { useState, useMemo } from 'react'
import { 
  Copy, Trash2, ExternalLink, History, Check, Clock, File, 
  Image, Video, Music, FileText, ChevronLeft, ChevronRight,
  Grid, List, Eye, X, Download
} from 'lucide-react'
import { UploadHistoryItem } from '../types'

interface UploadHistoryProps {
  history: UploadHistoryItem[]
  onCopy?: (url: string) => void
  onDelete?: (url: string) => void
}

const ITEMS_PER_PAGE = 12

// Helper to determine file type category
function getFileCategory(item: UploadHistoryItem): 'image' | 'video' | 'audio' | 'document' | 'other' {
  const type = item.fileType?.toLowerCase() || ''
  const url = item.url.toLowerCase()
  
  if (type.startsWith('image/') || /\.(png|jpg|jpeg|gif|webp|bmp|svg)$/i.test(url)) return 'image'
  if (type.startsWith('video/') || /\.(mp4|webm|mov|avi|mkv)$/i.test(url)) return 'video'
  if (type.startsWith('audio/') || /\.(mp3|wav|ogg|flac|m4a)$/i.test(url)) return 'audio'
  if (type.startsWith('text/') || /\.(txt|md|json|xml|html|css|js|ts)$/i.test(url)) return 'document'
  if (/\.(pdf|doc|docx|xls|xlsx|ppt|pptx)$/i.test(url)) return 'document'
  return 'other'
}

// Get icon based on file category
function FileIcon({ category }: { category: ReturnType<typeof getFileCategory> }) {
  switch (category) {
    case 'image': return <Image size={20} className="text-blue-400" />
    case 'video': return <Video size={20} className="text-purple-400" />
    case 'audio': return <Music size={20} className="text-green-400" />
    case 'document': return <FileText size={20} className="text-yellow-400" />
    default: return <File size={20} className="text-muted-foreground" />
  }
}

// Format file size
function formatSize(bytes?: number): string {
  if (!bytes) return ''
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`
}

// Format time
function formatTime(timestamp: number): string {
  const now = Date.now()
  const diff = now - timestamp
  
  if (diff < 60000) return 'Just now'
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`
  if (diff < 604800000) return `${Math.floor(diff / 86400000)}d ago`
  return new Date(timestamp).toLocaleDateString()
}

// Preview Modal Component
function PreviewModal({ 
  item, 
  onClose 
}: { 
  item: UploadHistoryItem
  onClose: () => void 
}) {
  const category = getFileCategory(item)
  
  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in"
      onClick={onClose}
    >
      <div 
        className="relative max-w-4xl w-full max-h-[90vh] glass-card overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border/50">
          <div className="flex items-center gap-3 min-w-0">
            <FileIcon category={category} />
            <div className="min-w-0">
              <p className="font-medium text-sm text-foreground truncate">{item.name}</p>
              <p className="text-xs text-muted-foreground">
                {formatTime(item.timestamp)} {item.size && `• ${formatSize(item.size)}`}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-secondary rounded-lg transition-colors"
          >
            <X size={20} className="text-muted-foreground" />
          </button>
        </div>
        
        {/* Content */}
        <div className="p-4 flex items-center justify-center min-h-[300px] max-h-[60vh] overflow-auto">
          {category === 'image' && (
            <img 
              src={item.url} 
              alt={item.name}
              className="max-w-full max-h-full object-contain rounded-lg"
            />
          )}
          {category === 'video' && (
            <video 
              src={item.url} 
              controls 
              className="max-w-full max-h-full rounded-lg"
            />
          )}
          {category === 'audio' && (
            <div className="w-full max-w-md space-y-4 text-center">
              <div className="w-24 h-24 mx-auto rounded-2xl bg-gradient-to-br from-green-500/20 to-green-500/5 flex items-center justify-center">
                <Music size={40} className="text-green-400" />
              </div>
              <p className="text-foreground font-medium">{item.name}</p>
              <audio src={item.url} controls className="w-full" />
            </div>
          )}
          {(category === 'document' || category === 'other') && (
            <div className="text-center space-y-4">
              <div className="w-24 h-24 mx-auto rounded-2xl bg-secondary/50 flex items-center justify-center">
                <FileIcon category={category} />
              </div>
              <p className="text-foreground font-medium">{item.name}</p>
              <p className="text-sm text-muted-foreground">
                Preview not available for this file type
              </p>
            </div>
          )}
        </div>
        
        {/* Footer */}
        <div className="flex items-center justify-end gap-2 p-4 border-t border-border/50">
          <a
            href={item.url}
            download
            className="px-4 py-2 bg-secondary/50 hover:bg-secondary rounded-lg text-sm font-medium transition-colors flex items-center gap-2"
          >
            <Download size={16} />
            Download
          </a>
          <a
            href={item.url}
            target="_blank"
            rel="noopener noreferrer"
            className="px-4 py-2 bg-primary text-primary-foreground hover:bg-primary/90 rounded-lg text-sm font-medium transition-colors flex items-center gap-2"
          >
            <ExternalLink size={16} />
            Open
          </a>
        </div>
      </div>
    </div>
  )
}

// Thumbnail component with loading state
function Thumbnail({ item, onClick }: { item: UploadHistoryItem; onClick: () => void }) {
  const [loaded, setLoaded] = useState(false)
  const [error, setError] = useState(false)
  const category = getFileCategory(item)
  
  if (category === 'image' && !error) {
    return (
      <button 
        onClick={onClick}
        className="relative w-full aspect-video rounded-lg overflow-hidden bg-secondary/30 group"
      >
        {!loaded && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-6 h-6 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
          </div>
        )}
        <img
          src={item.thumbnailUrl || item.url}
          alt={item.name}
          className={`w-full h-full object-cover transition-all duration-300 ${loaded ? 'opacity-100' : 'opacity-0'} group-hover:scale-105`}
          onLoad={() => setLoaded(true)}
          onError={() => setError(true)}
        />
        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors flex items-center justify-center">
          <Eye size={24} className="text-white opacity-0 group-hover:opacity-100 transition-opacity" />
        </div>
      </button>
    )
  }
  
  if (category === 'video') {
    return (
      <button 
        onClick={onClick}
        className="relative w-full aspect-video rounded-lg overflow-hidden bg-secondary/30 group"
      >
        <video
          src={item.url}
          className="w-full h-full object-cover"
          muted
          preload="metadata"
        />
        <div className="absolute inset-0 bg-black/30 flex items-center justify-center">
          <div className="w-12 h-12 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center group-hover:scale-110 transition-transform">
            <Video size={24} className="text-white" />
          </div>
        </div>
      </button>
    )
  }
  
  // Fallback for non-previewable files
  return (
    <div className="w-full aspect-video rounded-lg bg-secondary/30 flex items-center justify-center">
      <div className="text-center space-y-2">
        <div className="w-12 h-12 mx-auto rounded-xl bg-secondary/50 flex items-center justify-center">
          <FileIcon category={category} />
        </div>
        <p className="text-xs text-muted-foreground uppercase tracking-wider">
          {item.name.split('.').pop()}
        </p>
      </div>
    </div>
  )
}

export function UploadHistory({ history, onCopy, onDelete }: UploadHistoryProps) {
  const [copiedUrl, setCopiedUrl] = useState<string | null>(null)
  const [currentPage, setCurrentPage] = useState(1)
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')
  const [previewItem, setPreviewItem] = useState<UploadHistoryItem | null>(null)
  const [filter, setFilter] = useState<'all' | 'image' | 'video' | 'audio' | 'document'>('all')

  // Filter history
  const filteredHistory = useMemo(() => {
    if (filter === 'all') return history
    return history.filter(item => getFileCategory(item) === filter)
  }, [history, filter])

  // Pagination
  const totalPages = Math.ceil(filteredHistory.length / ITEMS_PER_PAGE)
  const paginatedHistory = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE
    return filteredHistory.slice(start, start + ITEMS_PER_PAGE)
  }, [filteredHistory, currentPage])

  const handleCopy = (url: string) => {
    navigator.clipboard.writeText(url)
    setCopiedUrl(url)
    setTimeout(() => setCopiedUrl(null), 2000)
    onCopy?.(url)
  }

  // Reset page when filter changes
  const handleFilterChange = (newFilter: typeof filter) => {
    setFilter(newFilter)
    setCurrentPage(1)
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
    <div className="space-y-4">
      {/* Header with filters and view toggle */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        {/* Filters */}
        <div className="flex gap-1 overflow-x-auto pb-1 scrollbar-none">
          {(['all', 'image', 'video', 'audio', 'document'] as const).map(f => (
            <button
              key={f}
              onClick={() => handleFilterChange(f)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors whitespace-nowrap ${
                filter === f
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-secondary/50 text-muted-foreground hover:text-foreground hover:bg-secondary'
              }`}
            >
              {f.charAt(0).toUpperCase() + f.slice(1)}
              {f === 'all' && ` (${history.length})`}
            </button>
          ))}
        </div>
        
        {/* View toggle */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">
            {filteredHistory.length} file{filteredHistory.length !== 1 ? 's' : ''}
          </span>
          <div className="flex bg-secondary/30 rounded-lg p-1">
            <button
              onClick={() => setViewMode('grid')}
              className={`p-1.5 rounded transition-colors ${viewMode === 'grid' ? 'bg-secondary text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
            >
              <Grid size={16} />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`p-1.5 rounded transition-colors ${viewMode === 'list' ? 'bg-secondary text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
            >
              <List size={16} />
            </button>
          </div>
        </div>
      </div>

      {/* Grid View */}
      {viewMode === 'grid' && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          {paginatedHistory.map((item, idx) => (
            <div
              key={`${item.url}-${idx}`}
              className="glass-card overflow-hidden group animate-fade-in"
              style={{ animationDelay: `${idx * 30}ms` }}
            >
              <Thumbnail item={item} onClick={() => setPreviewItem(item)} />
              <div className="p-3 space-y-2">
                <p className="text-sm font-medium text-foreground truncate" title={item.name}>
                  {item.name}
                </p>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">{formatTime(item.timestamp)}</span>
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => handleCopy(item.url)}
                      className={`p-1.5 rounded transition-colors ${
                        copiedUrl === item.url
                          ? 'bg-primary/20 text-primary'
                          : 'text-muted-foreground hover:text-primary hover:bg-primary/10'
                      }`}
                    >
                      {copiedUrl === item.url ? <Check size={14} /> : <Copy size={14} />}
                    </button>
                    {onDelete && (
                      <button
                        onClick={() => onDelete(item.url)}
                        className="p-1.5 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded transition-colors"
                      >
                        <Trash2 size={14} />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* List View */}
      {viewMode === 'list' && (
        <div className="space-y-2">
          {paginatedHistory.map((item, idx) => {
            const category = getFileCategory(item)
            return (
              <div
                key={`${item.url}-${idx}`}
                className="glass-card p-3 group animate-fade-in flex items-center gap-3"
                style={{ animationDelay: `${idx * 30}ms` }}
              >
                {/* Thumbnail */}
                <button 
                  onClick={() => setPreviewItem(item)}
                  className="relative w-16 h-16 rounded-lg overflow-hidden bg-secondary/30 flex-shrink-0"
                >
                  {category === 'image' ? (
                    <img src={item.url} alt={item.name} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <FileIcon category={category} />
                    </div>
                  )}
                </button>
                
                {/* Info */}
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm text-foreground truncate">{item.name}</p>
                  <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                    <Clock size={12} />
                    <span>{formatTime(item.timestamp)}</span>
                    {item.size && (
                      <>
                        <span>•</span>
                        <span>{formatSize(item.size)}</span>
                      </>
                    )}
                  </div>
                </div>
                
                {/* Actions */}
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
            )
          })}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 pt-4">
          <button
            onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
            disabled={currentPage === 1}
            className="p-2 rounded-lg bg-secondary/50 text-muted-foreground hover:text-foreground hover:bg-secondary disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <ChevronLeft size={18} />
          </button>
          
          <div className="flex items-center gap-1">
            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
              let pageNum: number
              if (totalPages <= 5) {
                pageNum = i + 1
              } else if (currentPage <= 3) {
                pageNum = i + 1
              } else if (currentPage >= totalPages - 2) {
                pageNum = totalPages - 4 + i
              } else {
                pageNum = currentPage - 2 + i
              }
              
              return (
                <button
                  key={pageNum}
                  onClick={() => setCurrentPage(pageNum)}
                  className={`w-8 h-8 rounded-lg text-sm font-medium transition-colors ${
                    currentPage === pageNum
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-secondary/50 text-muted-foreground hover:text-foreground hover:bg-secondary'
                  }`}
                >
                  {pageNum}
                </button>
              )
            })}
          </div>
          
          <button
            onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
            disabled={currentPage === totalPages}
            className="p-2 rounded-lg bg-secondary/50 text-muted-foreground hover:text-foreground hover:bg-secondary disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <ChevronRight size={18} />
          </button>
        </div>
      )}

      {/* Preview Modal */}
      {previewItem && (
        <PreviewModal item={previewItem} onClose={() => setPreviewItem(null)} />
      )}
    </div>
  )
}
