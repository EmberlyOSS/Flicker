import { X, Copy, Check, CheckCircle2, ExternalLink, ImageOff, RefreshCw } from 'lucide-react'
import { useEffect, useState } from 'react'
import { openUrl } from '@tauri-apps/plugin-opener'
import { playSound } from '../../utils/sounds'

interface TestUploadModalProps {
  isOpen: boolean
  onClose: () => void
  imageUrl: string
  imageName: string
  localPath?: string
}

const MAX_ATTEMPTS = 4

export function TestUploadModal({ isOpen, onClose, imageUrl, imageName }: TestUploadModalProps) {
  const [copied, setCopied] = useState(false)
  const [attempt, setAttempt] = useState(0)
  const [status, setStatus] = useState<'loading' | 'loaded' | 'failed'>('loading')

  useEffect(() => {
    setAttempt(0)
    setStatus('loading')
  }, [imageUrl])

  if (!isOpen) return null

  const url = imageUrl.trim().replace(/\/+$/, '')
  const previewUrl = `${url.endsWith('/raw') ? url : `${url}/raw`}?attempt=${attempt}`

  const handleCopy = () => {
    navigator.clipboard.writeText(url)
    playSound('copyLink')
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleError = () => {
    if (attempt + 1 < MAX_ATTEMPTS) {
      setTimeout(() => setAttempt(a => a + 1), 700 * (attempt + 1))
    } else {
      setStatus('failed')
    }
  }

  const retry = () => {
    setStatus('loading')
    setAttempt(0)
  }

  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center bg-background/70 p-4 backdrop-blur-sm animate-fade-in"
      onClick={onClose}
    >
      <div
        className="w-full max-w-xl overflow-hidden rounded-2xl border border-border/70 bg-card shadow-2xl animate-slide-up"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-border/60 px-5 py-4">
          <div className="flex items-center gap-2.5">
            <CheckCircle2 size={18} className="text-emerald-500" />
            <h2 className="text-base font-semibold tracking-tight text-foreground">Upload complete</h2>
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            className="rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
          >
            <X size={18} />
          </button>
        </div>

        <div className="space-y-4 p-5">
          <div className="relative flex aspect-video items-center justify-center overflow-hidden rounded-xl border border-border/60 bg-secondary/30">
            {status === 'loading' && (
              <RefreshCw size={22} className="absolute animate-spin text-muted-foreground" />
            )}
            {status !== 'failed' ? (
              <img
                key={attempt}
                src={previewUrl}
                alt={imageName}
                onLoad={() => setStatus('loaded')}
                onError={handleError}
                className={`max-h-full max-w-full object-contain transition-opacity duration-300 ${status === 'loaded' ? 'opacity-100' : 'opacity-0'}`}
              />
            ) : (
              <div className="space-y-3 p-6 text-center">
                <ImageOff size={28} className="mx-auto text-muted-foreground" />
                <div>
                  <p className="text-sm font-medium text-foreground">Preview isn't ready yet</p>
                  <p className="text-xs text-muted-foreground">Your link works; the image is still being processed.</p>
                </div>
                <button
                  onClick={retry}
                  className="inline-flex items-center gap-1.5 rounded-md bg-secondary/60 px-3 py-1.5 text-xs font-medium text-foreground transition-colors hover:bg-secondary"
                >
                  <RefreshCw size={12} />
                  Try again
                </button>
              </div>
            )}
          </div>

          <p className="truncate text-center text-sm font-medium text-foreground">{imageName}</p>

          <div className="flex gap-2">
            <input
              type="text"
              value={url}
              readOnly
              onFocus={e => e.currentTarget.select()}
              className="min-w-0 flex-1 rounded-lg border border-input bg-background px-3 py-2 font-mono text-xs text-muted-foreground focus:border-ring focus:outline-none"
            />
            <button
              onClick={() => openUrl(url).catch(() => {})}
              title="Open"
              className="flex items-center justify-center rounded-lg bg-secondary/60 px-3 text-foreground transition-colors hover:bg-secondary"
            >
              <ExternalLink size={15} />
            </button>
            <button
              onClick={handleCopy}
              className={`flex items-center gap-1.5 rounded-lg px-4 text-sm font-medium transition-colors ${
                copied ? 'bg-emerald-500 text-white' : 'bg-primary text-primary-foreground hover:bg-primary/90'
              }`}
            >
              {copied ? <Check size={15} /> : <Copy size={15} />}
              {copied ? 'Copied' : 'Copy link'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
