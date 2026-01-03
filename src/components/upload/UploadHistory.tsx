import { useState, useMemo } from 'react'
import { 
  Copy, Trash2, ExternalLink, History, Check, Clock, File, 
  Image, Video, Music, FileText, ChevronLeft, ChevronRight,
  Grid3x3, LayoutList, Eye, X, Download, Search, Calendar,
  ArrowUpDown, Filter, SortAsc, SortDesc
} from 'lucide-react'
import { UploadHistoryItem } from '../../types'

interface UploadHistoryProps {
  history: UploadHistoryItem[]
  onCopy?: (url: string) => void
  onDelete?: (url: string) => void
}

const ITEMS_PER_PAGE = 12

type SortOption = 'newest' | 'oldest' | 'name-asc' | 'name-desc' | 'size-asc' | 'size-desc'

// Helper to get preview URL with /raw endpoint
function getPreviewUrl(url: string): string {
  return url.endsWith('/raw') ? url : `${url}/raw`
}

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
function FileIcon({ category, size = 20 }: { category: ReturnType<typeof getFileCategory>; size?: number }) {
  const className = size === 20 ? "w-5 h-5" : `w-${size} h-${size}`
  
  switch (category) {
    case 'image': return <Image className={`${className} text-blue-400`} />
    case 'video': return <Video className={`${className} text-purple-400`} />
    case 'audio': return <Music className={`${className} text-green-400`} />
    case 'document': return <FileText className={`${className} text-yellow-400`} />
    default: return <File className={`${className} text-muted-foreground`} />
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
  onClose,
  onCopy,
  onDelete
}: { 
  item: UploadHistoryItem
  onClose: () => void
  onCopy?: (url: string) => void
  onDelete?: (url: string) => void
}) {
  const [copied, setCopied] = useState(false)
  const category = getFileCategory(item)
  const previewUrl = getPreviewUrl(item.url)
  
  const handleCopy = () => {
    navigator.clipboard.writeText(item.url)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
    onCopy?.(item.url)
  }
  
  return (
    <div 
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in"
      onClick={onClose}
    >
      <div 
        className="relative max-w-4xl w-full max-h-[90vh] glass-card overflow-hidden border border-border/50"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border/50 bg-background/50">
          <div className="flex items-center gap-3 min-w-0 flex-1">
            <div className="flex-shrink-0">
              <FileIcon category={category} size={24} />
            </div>
            <div className="min-w-0 flex-1">
              <p className="font-semibold text-sm text-foreground truncate">{item.name}</p>
              <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
                <Clock className="w-3 h-3" />
                <span>{formatTime(item.timestamp)}</span>
                {item.size && (
                  <>
                    <span>•</span>
                    <span>{formatSize(item.size)}</span>
                  </>
                )}
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-secondary/80 rounded-lg transition-colors ml-2 flex-shrink-0"
          >
            <X className="w-5 h-5 text-muted-foreground" />
          </button>
        </div>
        
        {/* Content */}
        <div className="p-6 flex items-center justify-center min-h-[300px] max-h-[60vh] overflow-auto bg-black/20">
          {category === 'image' && (
            <img 
              src={previewUrl} 
              alt={item.name}
              className="max-w-full max-h-full object-contain rounded-lg shadow-2xl"
            />
          )}
          {category === 'video' && (
            <video 
              src={previewUrl} 
              controls 
              className="max-w-full max-h-full rounded-lg shadow-2xl"
            />
          )}
          {category === 'audio' && (
            <div className="w-full max-w-md space-y-4 text-center">
              <div className="w-24 h-24 mx-auto rounded-2xl bg-gradient-to-br from-green-500/20 to-green-500/5 flex items-center justify-center border border-green-500/20">
                <Music className="w-12 h-12 text-green-400" />
              </div>
              <p className="text-foreground font-medium">{item.name}</p>
              <audio src={previewUrl} controls className="w-full" />
            </div>
          )}
          {(category === 'document' || category === 'other') && (
            <div className="text-center space-y-4">
              <div className="w-24 h-24 mx-auto rounded-2xl bg-secondary/50 flex items-center justify-center border border-border/30">
                <FileIcon category={category} size={48} />
              </div>
              <p className="text-foreground font-medium">{item.name}</p>
              <p className="text-sm text-muted-foreground">
                Preview not available for this file type
              </p>
            </div>
          )}
        </div>
        
        {/* Footer */}
        <div className="flex items-center justify-between gap-2 p-4 border-t border-border/50 bg-background/50">
          <div className="flex gap-2">
            <button
              onClick={handleCopy}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 flex items-center gap-2 ${
                copied
                  ? 'bg-green-500/20 text-green-400 border border-green-500/30'
                  : 'bg-secondary/50 hover:bg-secondary text-foreground border border-border/30'
              }`}
            >
              {copied ? (
                <>
                  <Check className="w-4 h-4" />
                  Copied!
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4" />
                  Copy URL
                </>
              )}
            </button>
            {onDelete && (
              <button
                onClick={() => {
                  onDelete(item.url)
                  onClose()
                }}
                className="px-4 py-2 bg-destructive/10 hover:bg-destructive/20 text-destructive rounded-lg text-sm font-medium transition-all duration-200 flex items-center gap-2 border border-destructive/20"
              >
                <Trash2 className="w-4 h-4" />
                Delete
              </button>
            )}
          </div>
          <div className="flex gap-2">
            <a
              href={previewUrl}
              download
              className="px-4 py-2 bg-secondary/50 hover:bg-secondary rounded-lg text-sm font-medium transition-colors flex items-center gap-2 border border-border/30"
            >
              <Download className="w-4 h-4" />
              Download
            </a>
            <a
              href={item.url}
              target="_blank"
              rel="noopener noreferrer"
              className="px-4 py-2 bg-primary text-primary-foreground hover:bg-primary/90 rounded-lg text-sm font-medium transition-colors flex items-center gap-2"
            >
              <ExternalLink className="w-4 h-4" />
              Open
            </a>
          </div>
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
  const previewUrl = getPreviewUrl(item.thumbnailUrl || item.url)
  
  if (category === 'image' && !error) {
    return (
      <button 
        onClick={onClick}
        className="relative w-full aspect-video rounded-lg overflow-hidden bg-secondary/30 group border border-border/30"
      >
        {!loaded && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-6 h-6 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
          </div>
        )}
        <img
          src={previewUrl}
          alt={item.name}
          className={`w-full h-full object-cover transition-all duration-300 ${loaded ? 'opacity-100' : 'opacity-0'} group-hover:scale-105`}
          onLoad={() => setLoaded(true)}
          onError={() => setError(true)}
        />
        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-all duration-200 flex items-center justify-center">
          <div className="opacity-0 group-hover:opacity-100 transition-opacity bg-white/10 backdrop-blur-sm rounded-full p-3 border border-white/20">
            <Eye className="w-5 h-5 text-white" />
          </div>
        </div>
      </button>
    )
  }
  
  if (category === 'video') {
    return (
      <button 
        onClick={onClick}
        className="relative w-full aspect-video rounded-lg overflow-hidden bg-secondary/30 group border border-border/30"
      >
        <video
          src={previewUrl}
          className="w-full h-full object-cover"
          muted
          preload="metadata"
        />
        <div className="absolute inset-0 bg-black/30 flex items-center justify-center">
          <div className="w-12 h-12 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center group-hover:scale-110 transition-transform border border-white/20">
            <Video className="w-6 h-6 text-white" />
          </div>
        </div>
      </button>
    )
  }
  
  // Fallback for non-previewable files
  return (
    <div className="w-full aspect-video rounded-lg bg-secondary/30 flex items-center justify-center border border-border/30">
      <div className="text-center space-y-2">
        <div className="w-12 h-12 mx-auto rounded-xl bg-secondary/50 flex items-center justify-center border border-border/30">
          <FileIcon category={category} size={24} />
        </div>
        <p className="text-xs text-muted-foreground uppercase tracking-wider font-medium">
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
  const [searchQuery, setSearchQuery] = useState('')
  const [sortBy, setSortBy] = useState<SortOption>('newest')
  const [showFilters, setShowFilters] = useState(false)

  // Filter and search history
  const filteredHistory = useMemo(() => {
    let filtered = history

    // Apply category filter
    if (filter !== 'all') {
      filtered = filtered.filter(item => getFileCategory(item) === filter)
    }

    // Apply search
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter(item => 
        item.name.toLowerCase().includes(query) ||
        item.url.toLowerCase().includes(query)
      )
    }

    // Apply sorting
    const sorted = [...filtered]
    switch (sortBy) {
      case 'newest':
        sorted.sort((a, b) => b.timestamp - a.timestamp)
        break
      case 'oldest':
        sorted.sort((a, b) => a.timestamp - b.timestamp)
        break
      case 'name-asc':
        sorted.sort((a, b) => a.name.localeCompare(b.name))
        break
      case 'name-desc':
        sorted.sort((a, b) => b.name.localeCompare(a.name))
        break
      case 'size-asc':
        sorted.sort((a, b) => (a.size || 0) - (b.size || 0))
        break
      case 'size-desc':
        sorted.sort((a, b) => (b.size || 0) - (a.size || 0))
        break
    }

    return sorted
  }, [history, filter, searchQuery, sortBy])

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

  // Reset page when filter/search changes
  const handleFilterChange = (newFilter: typeof filter) => {
    setFilter(newFilter)
    setCurrentPage(1)
  }

  const handleSearchChange = (query: string) => {
    setSearchQuery(query)
    setCurrentPage(1)
  }

  const handleSortChange = (newSort: SortOption) => {
    setSortBy(newSort)
    setCurrentPage(1)
  }

  // Get count by category
  const categoryCounts = useMemo(() => {
    const counts = { all: history.length, image: 0, video: 0, audio: 0, document: 0 }
    history.forEach(item => {
      const cat = getFileCategory(item)
      if (cat !== 'other') counts[cat]++
    })
    return counts
  }, [history])

  if (history.length === 0) {
    return (
      <div className="glass-card p-12 text-center border border-border/30">
        <div className="flex justify-center mb-4">
          <div className="p-4 bg-secondary/50 rounded-2xl border border-border/30">
            <History className="text-muted-foreground w-10 h-10" />
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
      {/* Search and Controls */}
      <div className="glass-card p-4 space-y-3 border border-border/30 relative z-50">
        {/* Search Bar */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search by filename or URL..."
            value={searchQuery}
            onChange={(e) => handleSearchChange(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-background/50 border border-border/50 rounded-lg text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/50 transition-all"
          />
        </div>

        {/* Filters and View Toggle Row */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          {/* Category Filters */}
          <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-none">
            {(['all', 'image', 'video', 'audio', 'document'] as const).map(f => (
              <button
                key={f}
                onClick={() => handleFilterChange(f)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all whitespace-nowrap border ${
                  filter === f
                    ? 'bg-primary text-primary-foreground border-primary shadow-sm'
                    : 'bg-secondary/30 text-muted-foreground hover:text-foreground hover:bg-secondary/50 border-border/30'
                }`}
              >
                {f.charAt(0).toUpperCase() + f.slice(1)}
                <span className="ml-1.5 opacity-70">({categoryCounts[f]})</span>
              </button>
            ))}
          </div>
          
          {/* Sort & View Controls */}
          <div className="flex items-center gap-2">
            {/* Sort Dropdown */}
            <div className="relative z-50">
              <button
                onClick={() => setShowFilters(!showFilters)}
                className="flex items-center gap-2 px-3 py-1.5 bg-secondary/30 hover:bg-secondary/50 rounded-lg text-xs font-medium text-foreground transition-all border border-border/30"
              >
                <ArrowUpDown className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Sort</span>
              </button>
              
              {showFilters && (
                <>
                  <div 
                    className="fixed inset-0 z-[60]" 
                    onClick={() => setShowFilters(false)}
                  />
                  <div className="absolute right-0 top-full mt-2 w-48 glass-card border border-border/50 rounded-lg shadow-xl z-[70] overflow-hidden">
                  {[
                    { value: 'newest', label: 'Newest First', icon: <Calendar className="w-3.5 h-3.5" /> },
                    { value: 'oldest', label: 'Oldest First', icon: <Calendar className="w-3.5 h-3.5" /> },
                    { value: 'name-asc', label: 'Name (A-Z)', icon: <SortAsc className="w-3.5 h-3.5" /> },
                    { value: 'name-desc', label: 'Name (Z-A)', icon: <SortDesc className="w-3.5 h-3.5" /> },
                    { value: 'size-asc', label: 'Size (Small)', icon: <SortAsc className="w-3.5 h-3.5" /> },
                    { value: 'size-desc', label: 'Size (Large)', icon: <SortDesc className="w-3.5 h-3.5" /> },
                  ].map(option => (
                    <button
                      key={option.value}
                      onClick={() => {
                        handleSortChange(option.value as SortOption)
                        setShowFilters(false)
                      }}
                      className={`w-full flex items-center gap-2 px-3 py-2 text-xs transition-colors ${
                        sortBy === option.value
                          ? 'bg-primary/10 text-primary'
                          : 'text-foreground hover:bg-secondary/50'
                      }`}
                    >
                      {option.icon}
                      <span>{option.label}</span>
                    </button>
                  ))}
                  </div>
                </>
              )}
            </div>

            {/* Results Count */}
            <span className="text-xs text-muted-foreground whitespace-nowrap">
              {filteredHistory.length} {filteredHistory.length === 1 ? 'file' : 'files'}
            </span>

            {/* View Toggle */}
            <div className="flex bg-secondary/30 rounded-lg p-1 border border-border/30">
              <button
                onClick={() => setViewMode('grid')}
                className={`p-1.5 rounded transition-all flex items-center justify-center ${viewMode === 'grid' ? 'bg-primary text-primary-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
                title="Grid View"
              >
                <Grid3x3 className="w-4 h-4" />
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`p-1.5 rounded transition-all flex items-center justify-center ${viewMode === 'list' ? 'bg-primary text-primary-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
                title="List View"
              >
                <LayoutList className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Grid View */}
      {viewMode === 'grid' && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          {paginatedHistory.map((item, idx) => (
            <div
              key={`${item.url}-${idx}`}
              className="glass-card overflow-hidden group animate-fade-in border border-border/30 hover:border-primary/30 transition-all duration-200"
              style={{ animationDelay: `${idx * 30}ms` }}
            >
              <Thumbnail item={item} onClick={() => setPreviewItem(item)} />
              <div className="p-3 space-y-2">
                <p className="text-sm font-medium text-foreground truncate" title={item.name}>
                  {item.name}
                </p>
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs text-muted-foreground flex-shrink-0">{formatTime(item.timestamp)}</span>
                  <div className="flex gap-1 flex-shrink-0">
                    <button
                      onClick={() => handleCopy(item.url)}
                      title="Copy URL"
                      className={`p-1.5 rounded transition-all flex items-center justify-center ${
                        copiedUrl === item.url
                          ? 'bg-primary/20 text-primary'
                          : 'text-muted-foreground hover:text-primary hover:bg-primary/10'
                      }`}
                    >
                      {copiedUrl === item.url ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                    <a
                      href={item.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      title="Open"
                      className="p-1.5 text-muted-foreground hover:text-primary hover:bg-primary/10 rounded transition-all flex items-center justify-center"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                    {onDelete && (
                      <button
                        onClick={() => onDelete(item.url)}
                        title="Delete"
                        className="p-1.5 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded transition-all flex items-center justify-center"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
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
            const previewUrl = getPreviewUrl(item.url)
            
            return (
              <div
                key={`${item.url}-${idx}`}
                className="glass-card p-3 group animate-fade-in flex items-center gap-3 border border-border/30 hover:border-primary/30 transition-all duration-200"
                style={{ animationDelay: `${idx * 30}ms` }}
              >
                {/* Thumbnail */}
                <button 
                  onClick={() => setPreviewItem(item)}
                  className="relative w-16 h-16 rounded-lg overflow-hidden bg-secondary/30 flex-shrink-0 border border-border/30 hover:border-primary/30 transition-all"
                >
                  {category === 'image' ? (
                    <img src={previewUrl} alt={item.name} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <FileIcon category={category} size={24} />
                    </div>
                  )}
                </button>
                
                {/* Info */}
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm text-foreground truncate">{item.name}</p>
                  <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                    <Clock className="w-3 h-3" />
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
                <div className="flex gap-1">
                  <button
                    onClick={() => handleCopy(item.url)}
                    title="Copy URL"
                    className={`p-2 rounded-lg transition-all duration-200 border flex items-center justify-center ${
                      copiedUrl === item.url
                        ? 'bg-primary/20 text-primary border-primary/30'
                        : 'text-muted-foreground hover:text-primary hover:bg-primary/10 border-border/30'
                    }`}
                  >
                    {copiedUrl === item.url ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                  </button>
                  <a
                    href={item.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    title="Open"
                    className="p-2 text-muted-foreground hover:text-primary hover:bg-primary/10 rounded-lg transition-all duration-200 border border-border/30 flex items-center justify-center"
                  >
                    <ExternalLink className="w-4 h-4" />
                  </a>
                  {onDelete && (
                    <button
                      onClick={() => onDelete(item.url)}
                      title="Delete"
                      className="p-2 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-lg transition-all duration-200 border border-border/30 flex items-center justify-center"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* No Results */}
      {filteredHistory.length === 0 && (
        <div className="glass-card p-12 text-center border border-border/30">
          <div className="flex justify-center mb-4">
            <div className="p-4 bg-secondary/50 rounded-2xl border border-border/30">
              <Search className="text-muted-foreground w-10 h-10" />
            </div>
          </div>
          <h3 className="text-lg font-semibold text-foreground mb-2">No files found</h3>
          <p className="text-sm text-muted-foreground max-w-xs mx-auto">
            Try adjusting your search or filter criteria
          </p>
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 pt-2">
          <button
            onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
            disabled={currentPage === 1}
            className="p-2 rounded-lg bg-secondary/30 text-muted-foreground hover:text-foreground hover:bg-secondary/50 disabled:opacity-50 disabled:cursor-not-allowed transition-all border border-border/30"
          >
            <ChevronLeft className="w-4 h-4" />
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
                  className={`w-8 h-8 rounded-lg text-xs font-medium transition-all border ${
                    currentPage === pageNum
                      ? 'bg-primary text-primary-foreground border-primary shadow-sm'
                      : 'bg-secondary/30 text-muted-foreground hover:text-foreground hover:bg-secondary/50 border-border/30'
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
            className="p-2 rounded-lg bg-secondary/30 text-muted-foreground hover:text-foreground hover:bg-secondary/50 disabled:opacity-50 disabled:cursor-not-allowed transition-all border border-border/30"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Preview Modal */}
      {previewItem && (
        <PreviewModal 
          item={previewItem} 
          onClose={() => setPreviewItem(null)}
          onCopy={onCopy}
          onDelete={onDelete}
        />
      )}
    </div>
  )
}