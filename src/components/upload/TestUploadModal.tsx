import { X, Copy, Check } from 'lucide-react'
import { useState } from 'react'

interface TestUploadModalProps {
  isOpen: boolean
  onClose: () => void
  imageUrl: string
  imageName: string
  localPath?: string
}

export function TestUploadModal({ isOpen, onClose, imageUrl, imageName, localPath }: TestUploadModalProps) {
  const [copied, setCopied] = useState(false)
  const [imageError, setImageError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  if (!isOpen) return null

  const handleCopy = () => {
    navigator.clipboard.writeText(imageUrl)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  // Clean and validate the image URL
  const displayUrl = imageUrl.trim()
  
  // Use /raw endpoint for preview to avoid 404 issues
  const previewUrl = displayUrl.endsWith('/raw') ? displayUrl : `${displayUrl}/raw`

  const handleImageLoad = () => {
    setIsLoading(false)
    setImageError(null)
  }

  const handleImageError = (e: React.SyntheticEvent<HTMLImageElement, Event>) => {
    setIsLoading(false)
    const imgElement = e.target as HTMLImageElement
    
    // Determine error type
    let errorMessage = 'Failed to load image'
    
    if (!displayUrl || displayUrl === '') {
      errorMessage = 'Empty or invalid URL provided'
    } else if (!displayUrl.startsWith('http://') && !displayUrl.startsWith('https://')) {
      errorMessage = 'Invalid URL protocol (must be http:// or https://)'
    } else if (imgElement.naturalWidth === 0 && imgElement.naturalHeight === 0) {
      errorMessage = 'Image not found or server returned 404'
    } else {
      errorMessage = 'Network error or CORS policy blocked the image'
    }
    
    setImageError(errorMessage)
  }

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-slate-950/40 animate-fade-in" style={{ backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)' }}>
      <div className="relative w-full max-w-2xl glass-card overflow-hidden animate-slide-up border-2 border-primary/30 shadow-[0_0_80px_-15px_rgba(0,0,0,0.6)] shadow-primary/25">
        {/* Header */}
        <div className="flex items-center justify-center p-6 border-b border-white/10 relative bg-white/5">
          <h2 className="text-xl font-medium text-white text-center">Successfully Uploaded!</h2>
          <button 
            onClick={onClose}
            className="absolute right-4 top-1/2 -translate-y-1/2 p-2 rounded-xl hover:bg-white/10 text-white/60 hover:text-white transition-all duration-200 border border-white/10"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="p-8 space-y-8 bg-slate-900/40">
          {/* Image Preview Container */}
          <div className="relative group rounded-2xl overflow-hidden border border-white/10 bg-black/40 aspect-video flex items-center justify-center shadow-2xl">
            {/* Loading State */}
            {isLoading && !imageError && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/20">
                <div className="w-8 h-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin"></div>
              </div>
            )}
            
            {/* Image Display */}
            {!imageError ? (
              <img 
                src={previewUrl} 
                alt={imageName} 
                className={`relative z-10 max-w-[90%] max-h-[90%] object-contain transition-all duration-500 group-hover:scale-[1.02] drop-shadow-[0_20px_50px_rgba(0,0,0,0.5)] ${isLoading ? 'opacity-0' : 'opacity-100'}`}
                onLoad={handleImageLoad}
                onError={handleImageError}
                loading="eager"
              />
            ) : (
              <div className="text-center space-y-3 p-6 max-w-md">
                <div className="w-16 h-16 mx-auto rounded-full bg-red-500/10 flex items-center justify-center border border-red-500/20">
                  <X size={32} className="text-red-400" />
                </div>
                <p className="text-white/80 text-sm font-medium">Image preview unavailable</p>
                
                {/* Error Details */}
                <div className="space-y-2 bg-red-500/5 border border-red-500/20 rounded-lg p-4">
                  <p className="text-white/60 text-xs font-semibold uppercase tracking-wide">Error Details:</p>
                  <p className="text-red-400/90 text-sm font-mono break-words">{imageError}</p>
                </div>
                
                <p className="text-white/40 text-xs">The URL has been copied and is ready to use</p>
              </div>
            )}
          </div>

          {/* Image Name */}
          <div className="text-center">
            <p className="text-lg font-medium text-white/90 drop-shadow-sm">{imageName}</p>
          </div>

          {/* URL & Copy Section */}
          <div className="flex gap-2">
            <div className="flex-1 flex items-center gap-3 px-4 py-3 bg-black/40 rounded-xl border border-white/10 focus-within:border-primary/50 focus-within:ring-2 focus-within:ring-primary/20 transition-all">
              <input
                type="text"
                value={displayUrl}
                readOnly
                className="flex-1 bg-transparent text-sm font-mono text-white/70 focus:outline-none truncate"
              />
            </div>
            <button
              onClick={handleCopy}
              className={`px-6 py-3 rounded-xl font-medium text-sm flex items-center gap-2 transition-all duration-300 ${
                copied 
                  ? 'bg-green-500 text-white shadow-lg shadow-green-500/20' 
                  : 'bg-primary text-primary-foreground hover:bg-primary/90 shadow-lg shadow-primary/30 active:scale-95'
              }`}
            >
              {copied ? (
                <>
                  <Check size={18} />
                  <span>Copied!</span>
                </>
              ) : (
                <>
                  <Copy size={18} />
                  <span>Copy URL</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}