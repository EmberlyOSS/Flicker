import { useState, useCallback, useEffect } from 'react'
import { invoke } from '@tauri-apps/api/core'
import { open } from '@tauri-apps/plugin-dialog'
import { getCurrentWebview } from '@tauri-apps/api/webview'
import { listen } from '@tauri-apps/api/event'
import { writeText } from '@tauri-apps/plugin-clipboard-manager'
import { openUrl } from '@tauri-apps/plugin-opener'
import { BehaviorConfig, UploadProgress, UploadResponse } from '../../types'
import { formatForClipboard } from '../../utils/clipboardFormat'
import { Upload, Copy, Check, AlertCircle, Loader2, FileUp, X, RotateCcw, ExternalLink, Crosshair, Video, Square, Circle, Monitor, Layers, ClipboardPaste, Image as ImageIcon, ArrowRight } from 'lucide-react'
import { useApp } from '../../context/AppContext'
import { DEFAULT_HOTKEYS } from '../../config'
import { Kbd, Section, timeAgo } from '../ui/kit'
import { API_URL } from '../../constants'

interface UploadAreaProps {
  onUpload: (filePath: string, response: UploadResponse) => void
  uploadToken: string
  visibility: 'PUBLIC' | 'PRIVATE'
  password?: string
  domain?: string
  behavior?: BehaviorConfig

  onCaptureRegion?: () => void
  isVideoRecording?: boolean
  videoElapsed?: number
  onToggleVideo?: () => void
}

type FileStatus = 'uploading' | 'done' | 'error'

interface QueuedFile {
  id: string
  path: string
  name: string
  status: FileStatus
  progress: number
  url?: string
  error?: string
}

let fileIdCounter = 0

interface UploadProgressEvent extends UploadProgress {
  file_path: string
}

export function UploadArea({ onUpload, uploadToken, visibility, password, domain, behavior, onCaptureRegion, isVideoRecording, videoElapsed, onToggleVideo }: UploadAreaProps) {
  const [isDragging, setIsDragging] = useState(false)
  const [files, setFiles] = useState<QueuedFile[]>([])
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const { config, history, setActivePage, takeFullscreenScreenshot, takeAllMonitorsScreenshot, uploadClipboardImage } = useApp()
  const hotkeys = { ...DEFAULT_HOTKEYS, ...config?.hotkeys }

  const uploadOne = useCallback(
    async (path: string, existingId?: string) => {
      const id = existingId || `f${++fileIdCounter}`
      const name = path.split(/[/\\]/).pop() || 'file'

      setFiles(prev => {
        const withoutOld = prev.filter(f => f.id !== existingId)
        return [{ id, path, name, status: 'uploading', progress: 0 }, ...withoutOld]
      })

      try {
        const response = await invoke<UploadResponse>('upload_file', {
          filePath: path,
          apiUrl: config?.uploadUrl || API_URL,
          uploadToken,
          visibility,
          password: password || null,
          domain: domain || null,
        })

        setFiles(prev =>
          prev.map(f => (f.id === id ? { ...f, status: 'done', progress: 100, url: response.url } : f))
        )
        onUpload(path, response)

        const action = behavior?.postUploadAction ?? 'copy'
        if (action === 'copy') {
          const text = formatForClipboard(response.url, response.name, behavior?.clipboardFormat)
          try {
            await writeText(text)
          } catch {
            navigator.clipboard.writeText(text)
          }
          setCopiedId(id)
          setTimeout(() => setCopiedId(current => (current === id ? null : current)), 3000)
        } else if (action === 'open') {
          openUrl(response.url).catch(() => window.open(response.url, '_blank'))
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err)
        setFiles(prev => prev.map(f => (f.id === id ? { ...f, status: 'error', progress: 0, error: message } : f)))
      }
    },
    [uploadToken, visibility, password, domain, onUpload, behavior, config?.uploadUrl]
  )

  const handleFiles = useCallback(
    (paths: string[]) => {
      if (!uploadToken) {
        setFiles(prev => [
          {
            id: `f${++fileIdCounter}`,
            path: paths[0] || '',
            name: paths[0]?.split(/[/\\]/).pop() || 'file',
            status: 'error',
            progress: 0,
            error: 'Please sign in to upload files',
          },
          ...prev,
        ])
        return
      }
      paths.forEach(p => uploadOne(p))
    },
    [uploadToken, uploadOne]
  )

  // Tauri's drag-drop event gives real file paths, which HTML5 DataTransfer never exposes in a Tauri app.
  useEffect(() => {
    let unlisten: (() => void) | undefined
    getCurrentWebview()
      .onDragDropEvent(event => {
        if (event.payload.type === 'over') {
          setIsDragging(true)
        } else if (event.payload.type === 'drop') {
          setIsDragging(false)
          handleFiles(event.payload.paths)
        } else {
          setIsDragging(false)
        }
      })
      .then(fn => {
        unlisten = fn
      })
    return () => unlisten?.()
  }, [handleFiles])

  useEffect(() => {
    let unlisten: (() => void) | undefined
    listen<UploadProgressEvent>('upload_progress', event => {
      const { file_path, percentage } = event.payload
      setFiles(prev =>
        prev.map(f => (f.path === file_path && f.status === 'uploading' ? { ...f, progress: percentage } : f))
      )
    }).then(fn => {
      unlisten = fn
    })
    return () => unlisten?.()
  }, [])

  const handleSelectFile = async () => {
    try {
      const selection = await open({ multiple: true, directory: false })
      if (!selection) return
      const paths = Array.isArray(selection) ? selection : [selection]
      handleFiles(paths)
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      setFiles(prev => [
        { id: `f${++fileIdCounter}`, path: '', name: 'File selection', status: 'error', progress: 0, error: message },
        ...prev,
      ])
    }
  }

  const handleRetry = (file: QueuedFile) => uploadOne(file.path, file.id)

  const handleDismiss = (id: string) => setFiles(prev => prev.filter(f => f.id !== id))

  const handleCopy = async (file: QueuedFile) => {
    if (!file.url) return
    const text = formatForClipboard(file.url, file.name, behavior?.clipboardFormat)
    try {
      await writeText(text)
    } catch {
      navigator.clipboard.writeText(text)
    }
    setCopiedId(file.id)
    setTimeout(() => setCopiedId(current => (current === file.id ? null : current)), 2000)
  }

  const isUploading = files.some(f => f.status === 'uploading')
  const recent = history.slice(0, 6)
  const recordingTime = `${Math.floor((videoElapsed || 0) / 60)}:${((videoElapsed || 0) % 60).toString().padStart(2, '0')}`

  const actions = [
    { label: 'Region', description: 'Select an area', icon: Crosshair, shortcut: hotkeys.screenshotRegion, run: onCaptureRegion },
    { label: 'Screen', description: 'Current screen', icon: Monitor, shortcut: hotkeys.screenshotFullscreen, run: takeFullscreenScreenshot },
    { label: 'All screens', description: 'Every monitor', icon: Layers, shortcut: hotkeys.screenshotAllMonitors, run: takeAllMonitorsScreenshot },
    { label: 'Clipboard', description: 'Upload a copied image', icon: ClipboardPaste, shortcut: hotkeys.uploadClipboard, run: uploadClipboardImage },
  ]

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        {actions.map(action => (
          <button
            key={action.label}
            onClick={() => action.run?.()}
            disabled={!action.run}
            className="glass-card glass-hover group flex flex-col items-start gap-3 p-4 text-left disabled:opacity-50"
          >
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 ring-1 ring-primary/20 transition-colors group-hover:bg-primary/20">
              <action.icon size={17} className="text-primary" />
            </div>
            <div className="space-y-0.5">
              <p className="text-sm font-medium text-foreground">{action.label}</p>
              <p className="text-xs text-muted-foreground">{action.description}</p>
            </div>
            <Kbd shortcut={action.shortcut} />
          </button>
        ))}
        {onToggleVideo && (
          <button
            onClick={onToggleVideo}
            className={`glass-card glass-hover group flex flex-col items-start gap-3 p-4 text-left ${isVideoRecording ? 'border-red-500/50 bg-red-500/10' : ''}`}
          >
            <div className={`flex h-9 w-9 items-center justify-center rounded-lg ring-1 transition-colors ${isVideoRecording ? 'bg-red-500 ring-red-500/40' : 'bg-primary/10 ring-primary/20 group-hover:bg-primary/20'}`}>
              {isVideoRecording ? <Square size={14} className="fill-white text-white" /> : <Video size={17} className="text-primary" />}
            </div>
            <div className="space-y-0.5">
              <p className="text-sm font-medium text-foreground">{isVideoRecording ? 'Stop recording' : 'Record'}</p>
              <p className="text-xs text-muted-foreground">{isVideoRecording ? `Recording ${recordingTime}` : 'Screen to MP4'}</p>
            </div>
            {isVideoRecording ? (
              <span className="flex items-center gap-1.5 text-[11px] font-medium text-red-400">
                <Circle size={7} className="animate-pulse fill-red-500 text-red-500" />
                Live
              </span>
            ) : (
              <Kbd shortcut={hotkeys.recordVideo} />
            )}
          </button>
        )}
      </div>

      <div
        className={`flex flex-col items-center justify-between gap-4 rounded-xl border-2 border-dashed px-5 py-5 transition-colors sm:flex-row ${
          isDragging ? 'border-primary bg-primary/5' : 'border-border/80 bg-card/40'
        }`}
      >
        <div className="flex items-center gap-3">
          <FileUp size={22} className={isDragging ? 'text-primary' : 'text-muted-foreground'} />
          <div>
            <p className="text-sm font-medium text-foreground">{isDragging ? 'Drop to upload' : 'Drag files here to upload'}</p>
            <p className="text-xs text-muted-foreground">Anywhere in this window works. Links are copied automatically.</p>
          </div>
        </div>
        <button
          onClick={handleSelectFile}
          className="flex shrink-0 items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
        >
          <Upload size={15} />
          Choose files
        </button>
      </div>

      {files.length > 0 && (
        <div className="space-y-2">
          {files.map(file => (
            <div key={file.id} className="glass-card flex items-center gap-3 px-4 py-3 animate-slide-up">
              <div className="shrink-0">
                {file.status === 'uploading' && <Loader2 size={18} className="animate-spin text-primary" />}
                {file.status === 'done' && <Check size={18} className="text-emerald-500" />}
                {file.status === 'error' && <AlertCircle size={18} className="text-destructive" />}
              </div>
              <div className="min-w-0 flex-1 space-y-1">
                <p className="truncate text-sm font-medium text-foreground">{file.name}</p>
                {file.status === 'uploading' && (
                  <div className="flex items-center gap-2">
                    <div className="h-1 flex-1 overflow-hidden rounded-full bg-secondary">
                      <div className="h-full rounded-full bg-primary transition-[width] duration-150" style={{ width: `${Math.max(2, file.progress)}%` }} />
                    </div>
                    <span className="w-9 text-right text-[11px] tabular-nums text-muted-foreground">{Math.round(file.progress)}%</span>
                  </div>
                )}
                {file.status === 'error' && <p className="text-xs text-destructive">{file.error}</p>}
                {file.status === 'done' && file.url && <p className="truncate font-mono text-xs text-muted-foreground">{file.url}</p>}
              </div>
              <div className="flex shrink-0 items-center gap-0.5">
                {file.status === 'error' && (
                  <button onClick={() => handleRetry(file)} title="Retry" className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground">
                    <RotateCcw size={15} />
                  </button>
                )}
                {file.status === 'done' && file.url && (
                  <>
                    <button onClick={() => handleCopy(file)} title="Copy link" className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground">
                      {copiedId === file.id ? <Check size={15} className="text-emerald-500" /> : <Copy size={15} />}
                    </button>
                    <button onClick={() => file.url && openUrl(file.url).catch(() => {})} title="Open" className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground">
                      <ExternalLink size={15} />
                    </button>
                  </>
                )}
                <button onClick={() => handleDismiss(file.id)} title="Dismiss" className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground">
                  <X size={15} />
                </button>
              </div>
            </div>
          ))}
          {isUploading && files.length > 1 && (
            <p className="text-center text-xs text-muted-foreground">
              Uploading {files.filter(f => f.status === 'uploading').length} of {files.length} files…
            </p>
          )}
        </div>
      )}

      {recent.length > 0 && (
        <Section
          icon={ImageIcon}
          title="Recent uploads"
          action={
            <button onClick={() => setActivePage('history')} className="flex items-center gap-1 text-xs font-medium text-primary hover:underline">
              View all
              <ArrowRight size={12} />
            </button>
          }
        >
          <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
            {recent.map(item => (
              <button
                key={item.url}
                onClick={() => openUrl(item.url).catch(() => {})}
                title={item.name}
                className="group overflow-hidden rounded-lg border border-border/70 bg-secondary/30 text-left transition-colors hover:border-primary/40"
              >
                <div className="flex aspect-[4/3] items-center justify-center overflow-hidden bg-secondary/40">
                  {item.thumbnailUrl ? (
                    <img src={item.thumbnailUrl} alt="" loading="lazy" className="h-full w-full object-cover" onError={e => (e.currentTarget.style.display = 'none')} />
                  ) : (
                    <FileUp size={18} className="text-muted-foreground" />
                  )}
                </div>
                <div className="px-2 py-1.5">
                  <p className="truncate text-[11px] font-medium text-foreground">{item.name}</p>
                  <p className="text-[10px] text-muted-foreground">{timeAgo(item.timestamp)}</p>
                </div>
              </button>
            ))}
          </div>
        </Section>
      )}
    </div>
  )
}
