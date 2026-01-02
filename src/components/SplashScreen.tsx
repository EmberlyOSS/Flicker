import { useState, useEffect, useRef } from 'react'
import { Sparkles, Download } from 'lucide-react'
import { check } from '@tauri-apps/plugin-updater'
import { relaunch } from '@tauri-apps/plugin-process'
import { APP_NAME, APP_VERSION } from '../constants'

interface SplashScreenProps {
  onComplete: () => void
  minDisplayTime?: number
}

type LoadingPhase = 'init' | 'checking-update' | 'downloading-update' | 'installing' | 'ready'

export function SplashScreen({ onComplete, minDisplayTime = 2000 }: SplashScreenProps) {
  const [phase, setPhase] = useState<LoadingPhase>('init')
  const [progress, setProgress] = useState(0)
  const [updateVersion, setUpdateVersion] = useState<string | null>(null)
  const [downloadProgress, setDownloadProgress] = useState(0)
  const startTimeRef = useRef(Date.now())
  const hasStartedRef = useRef(false)

  const getStatusMessage = () => {
    switch (phase) {
      case 'init':
        return 'Initializing...'
      case 'checking-update':
        return 'Checking for updates...'
      case 'downloading-update':
        return `Downloading update v${updateVersion}... ${downloadProgress}%`
      case 'installing':
        return 'Installing update...'
      case 'ready':
        return 'Ready!'
      default:
        return 'Loading...'
    }
  }

  useEffect(() => {
    if (hasStartedRef.current) return
    hasStartedRef.current = true

    const runStartup = async () => {
      try {
        // Phase 1: Init
        setPhase('init')
        setProgress(10)
        await new Promise(r => setTimeout(r, 300))

        // Phase 2: Check for updates
        setPhase('checking-update')
        setProgress(30)

        let updateAvailable = false
        try {
          const update = await check()
          
          if (update) {
            updateAvailable = true
            setUpdateVersion(update.version)
            setProgress(50)
            setPhase('downloading-update')

            // Track download progress
            let downloaded = 0
            let contentLength = 0

            // Download and install the update
            await update.downloadAndInstall((event) => {
              switch (event.event) {
                case 'Started':
                  contentLength = (event.data as { contentLength?: number }).contentLength || 0
                  setDownloadProgress(0)
                  break
                case 'Progress':
                  downloaded += event.data.chunkLength
                  const prog = contentLength > 0
                    ? Math.round((downloaded / contentLength) * 100)
                    : 0
                  setDownloadProgress(prog)
                  setProgress(50 + (prog * 0.4)) // 50-90%
                  break
                case 'Finished':
                  setDownloadProgress(100)
                  setProgress(90)
                  break
              }
            })

            // Installing phase
            setPhase('installing')
            setProgress(95)
            await new Promise(r => setTimeout(r, 500))

            // Relaunch with the new version
            await relaunch()
            return // App will restart
          }
        } catch (error) {
          // Update check/download failed - continue silently
          console.warn('Update check failed, continuing:', error)
        }

        // No update or update failed - continue to app
        setProgress(80)
        
        // Ensure minimum display time
        const elapsed = Date.now() - startTimeRef.current
        const remaining = Math.max(0, minDisplayTime - elapsed)
        
        if (remaining > 0) {
          await new Promise(r => setTimeout(r, remaining))
        }

        setPhase('ready')
        setProgress(100)
        await new Promise(r => setTimeout(r, 300))
        
        onComplete()
      } catch (error) {
        console.error('Startup error:', error)
        // On any error, just continue to the app
        onComplete()
      }
    }

    runStartup()
  }, [onComplete, minDisplayTime])

  const showDownloadUI = phase === 'downloading-update' || phase === 'installing'

  return (
    <div className="fixed inset-0 gradient-bg flex items-center justify-center z-[100]">
      <div className="flex flex-col items-center gap-8 p-8">
        {/* Logo */}
        <div className="relative">
          <div className="w-24 h-24 rounded-2xl bg-primary/20 flex items-center justify-center border border-primary/30 shadow-2xl shadow-primary/20">
            {showDownloadUI ? (
              <Download className="text-primary animate-bounce" size={48} />
            ) : (
              <Sparkles className="text-primary animate-pulse" size={48} />
            )}
          </div>
          {/* Glow effect */}
          <div className="absolute inset-0 w-24 h-24 rounded-2xl bg-primary/30 blur-xl -z-10" />
        </div>

        {/* App Name */}
        <div className="text-center space-y-2">
          <h1 className="text-4xl font-bold text-foreground tracking-tight">
            {APP_NAME}
          </h1>
          <p className="text-sm text-muted-foreground">
            v{APP_VERSION}
          </p>
        </div>

        {/* Progress Bar */}
        <div className="w-64 space-y-3">
          <div className="h-1.5 bg-secondary/30 rounded-full overflow-hidden">
            <div 
              className="h-full bg-gradient-to-r from-primary to-primary/70 rounded-full transition-all duration-300 ease-out"
              style={{ width: `${Math.min(progress, 100)}%` }}
            />
          </div>
          <p className="text-xs text-muted-foreground text-center animate-pulse">
            {getStatusMessage()}
          </p>
        </div>

        {/* Update info */}
        {updateVersion && showDownloadUI && (
          <div className="text-center">
            <p className="text-xs text-primary/70">
              New version available: v{updateVersion}
            </p>
          </div>
        )}

        {/* Footer */}
        <p className="text-xs text-muted-foreground/50 mt-8">
          Screenshot & Upload Tool for Emberly
        </p>
      </div>
    </div>
  )
}
