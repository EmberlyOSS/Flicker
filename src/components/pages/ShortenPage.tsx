import { useState } from 'react'
import { invoke } from '@tauri-apps/api/core'
import { writeText } from '@tauri-apps/plugin-clipboard-manager'
import { Link2, Copy, Check, Loader2, AlertCircle } from 'lucide-react'
import { ShortenedUrlResponse } from '../../types'
import { API_URL } from '../../constants'

interface ShortenPageProps {
  uploadToken: string
  uploadUrl?: string
}

export function ShortenPage({ uploadToken, uploadUrl }: ShortenPageProps) {
  const [url, setUrl] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<ShortenedUrlResponse | null>(null)
  const [copied, setCopied] = useState(false)

  const handleShorten = async () => {
    if (!url.trim() || !uploadToken) return

    setLoading(true)
    setError(null)
    setResult(null)

    try {
      const response = await invoke<ShortenedUrlResponse>('emberly_shorten_url', {
        apiUrl: uploadUrl || API_URL,
        token: uploadToken,
        url: url.trim(),
      })
      setResult(response)
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setLoading(false)
    }
  }

  const shortUrl = result ? `${uploadUrl || API_URL}/${result.shortCode}` : ''

  const handleCopy = async () => {
    if (!shortUrl) return
    try {
      await writeText(shortUrl)
    } catch {
      navigator.clipboard.writeText(shortUrl)
    }
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="space-y-4">
      <div className="glass-card p-6 space-y-4">
        <div className="flex flex-col items-center gap-4 text-center">
          <div className="p-4 rounded-2xl bg-secondary/50">
            <Link2 size={32} className="text-muted-foreground" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-foreground">Shorten a URL</h3>
            <p className="text-sm text-muted-foreground">Paste a long link to get a short one</p>
          </div>
        </div>

        <div className="flex gap-2">
          <input
            type="text"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleShorten()}
            placeholder="https://example.com/very/long/url"
            className="flex-1 px-4 py-2.5 bg-secondary/50 border border-border/50 rounded-xl text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
          />
          <button
            onClick={handleShorten}
            disabled={loading || !url.trim() || !uploadToken}
            className="btn-primary px-6 py-2.5 flex items-center gap-2 disabled:opacity-50"
          >
            {loading ? <Loader2 size={18} className="animate-spin" /> : 'Shorten'}
          </button>
        </div>
      </div>

      {error && (
        <div className="glass-card border-l-4 border-l-destructive p-4 animate-slide-up flex items-start gap-3">
          <AlertCircle className="text-destructive flex-shrink-0 mt-0.5" size={20} />
          <div>
            <p className="font-semibold text-destructive">Couldn't shorten that URL</p>
            <p className="text-sm text-muted-foreground">{error}</p>
          </div>
        </div>
      )}

      {result && (
        <div className="glass-card border-l-4 border-l-primary p-4 animate-slide-up glow-primary-subtle space-y-3">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-primary/20">
              <Check size={16} className="text-primary" />
            </div>
            <p className="font-semibold text-foreground">Shortened!</p>
          </div>
          <div className="flex gap-2">
            <div className="flex-1 flex items-center gap-2 px-3 py-2.5 bg-background/50 rounded-lg border border-border">
              <Link2 size={16} className="text-muted-foreground flex-shrink-0" />
              <input
                type="text"
                value={shortUrl}
                readOnly
                className="flex-1 bg-transparent text-sm font-mono text-foreground focus:outline-none truncate"
              />
            </div>
            <button
              onClick={handleCopy}
              className={`btn-secondary px-4 py-2.5 flex items-center gap-2 whitespace-nowrap transition-all ${
                copied ? 'bg-primary/20 border-primary text-primary' : ''
              }`}
            >
              {copied ? (
                <>
                  <Check size={16} />
                  Copied!
                </>
              ) : (
                <>
                  <Copy size={16} />
                  Copy
                </>
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
