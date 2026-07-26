import { useState, useCallback, useEffect } from 'react'
import { invoke } from '@tauri-apps/api/core'
import { open } from '@tauri-apps/plugin-dialog'
import { getCurrentWebview } from '@tauri-apps/api/webview'
import { listen } from '@tauri-apps/api/event'
import { writeText } from '@tauri-apps/plugin-clipboard-manager'
import { openUrl } from '@tauri-apps/plugin-opener'
import { BehaviorConfig, UploadProgress, UploadResponse } from '../../types'
import { formatForClipboard } from '../../utils/clipboardFormat'
import { Upload, Copy, Check, AlertCircle, Loader2, FileUp, Link2, X, RotateCcw, ExternalLink } from 'lucide-react'
import { API_URL } from '../../constants'

interface UploadAreaProps {
  onUpload: (filePath: string, response: UploadResponse) => void
  uploadToken: string
  visibility: 'PUBLIC' | 'PRIVATE'
  password?: string
  behavior?: BehaviorConfig
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

export function UploadArea({ onUpload, uploadToken, visibility, password, behavior }: UploadAreaProps) {
  const [isDragging, setIsDragging] = useState(false)
  const [files, setFiles] = useState<QueuedFile[]>([])
  const [copiedId, setCopiedId] = useState<string | null>(null)

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
          apiUrl: API_URL,
          uploadToken,
          visibility,
          password: password || null,
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
    [uploadToken, visibility, password, onUpload, behavior]
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

  // Real drag-and-drop: Tauri's webview-level API gives us actual file paths,
  // which the browser's HTML5 DataTransfer never exposes inside a Tauri app.
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

  // Live upload progress per file, streamed from the Rust backend
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

  return (
    <div className="space-y-4">
      {/* Upload Zone */}
      <div
        className={`upload-zone p-8 transition-all duration-200 ${isDragging ? 'dragging' : ''}`}
      >
        <div className="flex flex-col items-center gap-6">
          <div
            className={`p-6 rounded-2xl transition-all duration-300 ${
              isDragging ? 'bg-primary/20 animate-pulse-soft' : 'bg-secondary/50 hover:bg-primary/10'
            }`}
          >
            <FileUp size={48} className={isDragging ? 'text-primary' : 'text-muted-foreground'} />
          </div>

          <div className="text-center space-y-2">
            <h3 className="text-lg font-semibold text-foreground">
              {isDragging ? 'Drop to upload' : 'Drop files here'}
            </h3>
            <p className="text-sm text-muted-foreground">or click below to select one or more files</p>
          </div>

          <button
            onClick={handleSelectFile}
            className="btn-primary px-8 py-3 flex items-center gap-2"
          >
            <Upload size={18} />
            Select Files
          </button>

          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <kbd className="px-2 py-1 bg-secondary/50 rounded font-mono border border-border">
              Ctrl+Shift+U
            </kbd>
            <span>Quick upload</span>
          </div>
        </div>
      </div>

      {/* File queue */}
      {files.map(file => (
        <div
          key={file.id}
          className={`glass-card border-l-4 p-4 animate-slide-up ${
            file.status === 'error'
              ? 'border-l-destructive'
              : file.status === 'done'
              ? 'border-l-primary glow-primary-subtle'
              : 'border-l-primary/50'
          }`}
        >
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-start gap-3 flex-1 min-w-0">
              <div className="flex-shrink-0 mt-0.5">
                {file.status === 'uploading' && <Loader2 size={20} className="text-primary animate-spin" />}
                {file.status === 'done' && (
                  <div className="p-1 rounded-lg bg-primary/20">
                    <Check size={14} className="text-primary" />
                  </div>
                )}
                {file.status === 'error' && <AlertCircle size={20} className="text-destructive" />}
              </div>
              <div className="flex-1 min-w-0 space-y-1">
                <p className="font-medium text-sm text-foreground truncate">{file.name}</p>
                {file.status === 'uploading' && (
                  <div className="space-y-1">
                    <div className="h-1.5 w-full rounded-full bg-secondary/50 overflow-hidden">
                      <div
                        className="h-full rounded-full bg-primary transition-all duration-150"
                        style={{ width: `${Math.max(2, file.progress)}%` }}
                      />
                    </div>
                    <p className="text-xs text-muted-foreground">{Math.round(file.progress)}%</p>
                  </div>
                )}
                {file.status === 'error' && <p className="text-xs text-muted-foreground">{file.error}</p>}
                {file.status === 'done' && file.url && (
                  <div className="flex items-center gap-2 mt-1">
                    <Link2 size={12} className="text-muted-foreground flex-shrink-0" />
                    <p className="text-xs font-mono text-muted-foreground truncate">{file.url}</p>
                  </div>
                )}
              </div>
            </div>

            <div className="flex items-center gap-1 flex-shrink-0">
              {file.status === 'error' && (
                <button
                  onClick={() => handleRetry(file)}
                  title="Retry"
                  className="p-1.5 text-muted-foreground hover:text-primary hover:bg-primary/10 rounded transition-all"
                >
                  <RotateCcw size={16} />
                </button>
              )}
              {file.status === 'done' && file.url && (
                <>
                  <button
                    onClick={() => handleCopy(file)}
                    title="Copy"
                    className={`p-1.5 rounded transition-all ${
                      copiedId === file.id
                        ? 'text-primary bg-primary/10'
                        : 'text-muted-foreground hover:text-primary hover:bg-primary/10'
                    }`}
                  >
                    {copiedId === file.id ? <Check size={16} /> : <Copy size={16} />}
                  </button>
                  <a
                    href={file.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    title="Open"
                    className="p-1.5 text-muted-foreground hover:text-primary hover:bg-primary/10 rounded transition-all"
                  >
                    <ExternalLink size={16} />
                  </a>
                </>
              )}
              <button
                onClick={() => handleDismiss(file.id)}
                title="Dismiss"
                className="p-1.5 text-muted-foreground hover:text-foreground hover:bg-secondary/50 rounded transition-all"
              >
                <X size={16} />
              </button>
            </div>
          </div>
        </div>
      ))}

      {isUploading && files.length > 1 && (
        <p className="text-xs text-center text-muted-foreground">
          Uploading {files.filter(f => f.status === 'uploading').length} of {files.length} files…
        </p>
      )}
    </div>
  )
}
