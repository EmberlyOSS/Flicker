import { useEffect, useState } from 'react'
import { invoke } from '@tauri-apps/api/core'
import { readText, writeText } from '@tauri-apps/plugin-clipboard-manager'
import { openUrl } from '@tauri-apps/plugin-opener'
import { Link2, Copy, Check, Loader2, AlertCircle, ExternalLink, History, ArrowRight } from 'lucide-react'
import { ShortenedUrlResponse } from '../../types'
import { API_URL } from '../../constants'
import { playSound } from '../../utils/sounds'
import { EmptyState, Section, timeAgo } from '../ui/kit'

interface ShortenPageProps {
  uploadToken: string
  uploadUrl?: string
}

interface ShortLink {
  shortUrl: string
  targetUrl: string
  createdAt: number
}

const STORAGE_KEY = 'flicker_short_links'
const isUrl = (value: string) => /^https?:\/\/\S+\.\S+/i.test(value.trim())

function loadLinks(): ShortLink[] {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]')
  } catch {
    return []
  }
}

async function copy(text: string) {
  try {
    await writeText(text)
  } catch {
    navigator.clipboard.writeText(text)
  }
  playSound('copyLink')
}

export function ShortenPage({ uploadToken, uploadUrl }: ShortenPageProps) {
  const [url, setUrl] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [links, setLinks] = useState<ShortLink[]>(loadLinks)
  const [copied, setCopied] = useState<string | null>(null)

  useEffect(() => {
    readText()
      .then(text => {
        if (text && isUrl(text) && !text.includes('/u/')) setUrl(text.trim())
      })
      .catch(() => {})
  }, [])

  const handleCopy = async (shortUrl: string) => {
    await copy(shortUrl)
    setCopied(shortUrl)
    setTimeout(() => setCopied(c => (c === shortUrl ? null : c)), 2000)
  }

  const handleShorten = async () => {
    const target = url.trim()
    if (!target || !uploadToken) return
    if (!isUrl(target)) {
      setError('Enter a full link, starting with http:// or https://')
      return
    }
    setLoading(true)
    setError(null)
    try {
      const response = await invoke<ShortenedUrlResponse>('emberly_shorten_url', {
        apiUrl: uploadUrl || API_URL,
        token: uploadToken,
        url: target,
      })
      const link = {
        shortUrl: `${(uploadUrl || API_URL).replace(/\/+$/, '')}/u/${response.shortCode}`,
        targetUrl: target,
        createdAt: Date.now(),
      }
      const next = [link, ...links.filter(l => l.shortUrl !== link.shortUrl)].slice(0, 20)
      setLinks(next)
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
      setUrl('')
      await handleCopy(link.shortUrl)
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setLoading(false)
    }
  }

  const latest = links[0]

  return (
    <div className="space-y-4">
      <Section icon={Link2} title="Shorten a link" description="The short link is copied as soon as it's ready">
        <form
          className="flex gap-2"
          onSubmit={e => {
            e.preventDefault()
            handleShorten()
          }}
        >
          <input
            type="text"
            value={url}
            onChange={e => setUrl(e.target.value)}
            placeholder="https://example.com/a/very/long/link"
            autoFocus
            className="min-w-0 flex-1 rounded-lg border border-input bg-background px-3 py-2.5 text-sm text-foreground placeholder-muted-foreground transition-colors focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring/20"
          />
          <button
            type="submit"
            disabled={loading || !url.trim()}
            className="flex items-center gap-2 rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
          >
            {loading ? <Loader2 size={15} className="animate-spin" /> : <ArrowRight size={15} />}
            Shorten
          </button>
        </form>

        {error && (
          <div className="mt-3 flex items-center gap-2 rounded-lg border border-destructive/20 bg-destructive/10 p-3 text-sm text-destructive">
            <AlertCircle size={15} className="shrink-0" />
            {error}
          </div>
        )}

        {latest && Date.now() - latest.createdAt < 60_000 && (
          <div className="mt-3 flex items-center justify-between gap-3 rounded-lg border border-primary/30 bg-primary/5 p-3">
            <div className="min-w-0">
              <p className="truncate font-mono text-sm text-foreground">{latest.shortUrl}</p>
              <p className="truncate text-xs text-muted-foreground">→ {latest.targetUrl}</p>
            </div>
            <button
              onClick={() => handleCopy(latest.shortUrl)}
              className="flex shrink-0 items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground"
            >
              {copied === latest.shortUrl ? <Check size={13} /> : <Copy size={13} />}
              {copied === latest.shortUrl ? 'Copied' : 'Copy'}
            </button>
          </div>
        )}
      </Section>

      {links.length > 0 ? (
        <Section icon={History} title="Recent links" description="Links you've shortened in Flicker">
          <div className="divide-y divide-border/60">
            {links.map(link => (
              <div key={link.shortUrl} className="group flex items-center justify-between gap-3 py-2.5">
                <div className="min-w-0">
                  <p className="truncate font-mono text-sm text-foreground">{link.shortUrl.replace(/^https?:\/\//, '')}</p>
                  <p className="truncate text-xs text-muted-foreground">
                    {link.targetUrl} · {timeAgo(link.createdAt)}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-1">
                  <button
                    onClick={() => openUrl(link.shortUrl).catch(() => {})}
                    title="Open"
                    className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
                  >
                    <ExternalLink size={14} />
                  </button>
                  <button
                    onClick={() => handleCopy(link.shortUrl)}
                    title="Copy"
                    className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
                  >
                    {copied === link.shortUrl ? <Check size={14} className="text-emerald-500" /> : <Copy size={14} />}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </Section>
      ) : (
        <EmptyState icon={Link2} title="No short links yet" description="Links you shorten here will show up for quick copying." />
      )}
    </div>
  )
}
