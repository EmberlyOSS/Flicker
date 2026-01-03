import { useState, useCallback } from 'react'
import { invoke } from '@tauri-apps/api/core'
import { open } from '@tauri-apps/plugin-dialog'
import { UploadResponse } from '../../types'
import { Upload, Copy, Check, AlertCircle, Loader2, FileUp, Link2, X } from 'lucide-react'
import { API_URL } from '../../constants'

interface UploadAreaProps {
  onUpload: (filePath: string, response: UploadResponse) => void
  uploadToken: string
  visibility: 'PUBLIC' | 'PRIVATE'
  password?: string
}

export function UploadArea({
  onUpload,
  uploadToken,
  visibility,
  password,
}: UploadAreaProps) {
  const [isDragging, setIsDragging] = useState(false)
  const [uploadUrl, setUploadUrl] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [fileName, setFileName] = useState<string | null>(null)

  const handleUpload = useCallback(
    async (filePath: string) => {
      if (!uploadToken) {
        setError('Please sign in to upload files')
        return
      }

      const name = filePath.split(/[/\\]/).pop() || 'file'
      setFileName(name)

      try {
        setIsLoading(true)
        setError(null)
        setUploadUrl(null)
        const response = await invoke<UploadResponse>('upload_file', {
          filePath,
          apiUrl: API_URL,
          uploadToken,
          visibility,
          password: password || null,
        })
        setUploadUrl(response.url)
        onUpload(filePath, response)
        
        // Auto-copy to clipboard
        navigator.clipboard.writeText(response.url)
        setCopied(true)
        setTimeout(() => setCopied(false), 3000)
      } catch (err) {
        setError(err instanceof Error ? err.message : String(err))
        setFileName(null)
      } finally {
        setIsLoading(false)
      }
    },
    [uploadToken, visibility, password, onUpload]
  )

  const handleSelectFile = async () => {
    try {
      setError(null)
      const file = await open({
        multiple: false,
        directory: false,
      })
      if (file) {
        await handleUpload(file)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    }
  }

  // Note: Global hotkey for file upload is managed in useHotkeys hook

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }

  const handleDragLeave = () => {
    setIsDragging(false)
  }

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
  }

  const copyToClipboard = () => {
    if (uploadUrl) {
      navigator.clipboard.writeText(uploadUrl)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  const clearResult = () => {
    setUploadUrl(null)
    setFileName(null)
    setCopied(false)
  }

  return (
    <div className="space-y-4">
      {/* Upload Zone */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`upload-zone p-8 transition-all duration-200 ${
          isDragging ? 'dragging' : ''
        } ${isLoading ? 'opacity-75' : ''}`}
      >
        <div className="flex flex-col items-center gap-6">
          <div className={`p-6 rounded-2xl transition-all duration-300 ${
            isLoading 
              ? 'bg-primary/20 animate-pulse-soft' 
              : 'bg-secondary/50 hover:bg-primary/10'
          }`}>
            {isLoading ? (
              <Loader2 size={48} className="text-primary animate-spin" />
            ) : (
              <FileUp size={48} className="text-muted-foreground" />
            )}
          </div>
          
          <div className="text-center space-y-2">
            <h3 className="text-lg font-semibold text-foreground">
              {isLoading ? 'Uploading...' : 'Drop files here'}
            </h3>
            <p className="text-sm text-muted-foreground">
              {isLoading && fileName 
                ? fileName 
                : 'or click below to select a file'}
            </p>
          </div>

          <button
            onClick={handleSelectFile}
            disabled={isLoading}
            className="btn-primary px-8 py-3 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
          >
            {isLoading ? (
              <>
                <Loader2 size={18} className="animate-spin" />
                Uploading...
              </>
            ) : (
              <>
                <Upload size={18} />
                Select File
              </>
            )}
          </button>

          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <kbd className="px-2 py-1 bg-secondary/50 rounded font-mono border border-border">
              Ctrl+Shift+U
            </kbd>
            <span>Quick upload</span>
          </div>
        </div>
      </div>

      {/* Error Alert */}
      {error && (
        <div className="glass-card border-l-4 border-l-destructive p-4 animate-slide-up">
          <div className="flex items-start gap-3">
            <AlertCircle className="text-destructive flex-shrink-0 mt-0.5" size={20} />
            <div className="flex-1 space-y-1">
              <p className="font-semibold text-destructive">Upload Failed</p>
              <p className="text-sm text-muted-foreground">{error}</p>
            </div>
            <button 
              onClick={() => setError(null)}
              className="text-muted-foreground hover:text-foreground transition-colors"
            >
              <X size={18} />
            </button>
          </div>
        </div>
      )}

      {/* Success Alert */}
      {uploadUrl && (
        <div className="glass-card border-l-4 border-l-primary p-4 animate-slide-up glow-success">
          <div className="space-y-4">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-primary/20">
                  <Check size={16} className="text-primary" />
                </div>
                <div>
                  <p className="font-semibold text-foreground">Upload Complete!</p>
                  {fileName && (
                    <p className="text-xs text-muted-foreground">{fileName}</p>
                  )}
                </div>
              </div>
              <button 
                onClick={clearResult}
                className="text-muted-foreground hover:text-foreground transition-colors"
              >
                <X size={18} />
              </button>
            </div>
            
            <div className="flex gap-2">
              <div className="flex-1 flex items-center gap-2 px-3 py-2.5 bg-background/50 rounded-lg border border-border">
                <Link2 size={16} className="text-muted-foreground flex-shrink-0" />
                <input
                  type="text"
                  value={uploadUrl}
                  readOnly
                  className="flex-1 bg-transparent text-sm font-mono text-foreground focus:outline-none truncate"
                />
              </div>
              <button
                onClick={copyToClipboard}
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
            
            {copied && (
              <p className="text-xs text-primary animate-fade-in">
                ✨ Link copied to clipboard automatically
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
