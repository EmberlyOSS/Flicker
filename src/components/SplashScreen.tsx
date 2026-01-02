import { useState, useEffect, useRef } from 'react'
import { Download, RefreshCw } from 'lucide-react'
import { check } from '@tauri-apps/plugin-updater'
import { relaunch } from '@tauri-apps/plugin-process'
import { Logo } from './Logo'
import { APP_NAME, APP_VERSION } from '../constants'

// Fun facts, tips, and easter eggs
const LOADING_FACTS = [
  // Emberly tips
  "💡 Use Ctrl+Shift+S for instant screenshots!",
  "🔥 Emberly uploads are blazingly fast",
  "☁️ All your files are stored securely in the cloud",
  "🎨 Try different themes in Settings > Appearance",
  "📋 URLs are automatically copied to your clipboard",
  "🔒 You can password protect your uploads",
  "⚡ Built with Tauri & React for speed",
  "🌐 Visit embrly.ca to manage your uploads",
  "💜 Join our Discord community for support!",
  "🚀 Uploads are optimized for maximum speed",
  
  // Stranger Things references
  "🔦 Friends don't lie.",
  "🧇 Eleven approves of this upload tool",
  "📺 The Upside Down has terrible WiFi",
  "🎄 Christmas lights not required for uploads",
  "🚲 Will Byers was found. Your files won't be lost.",
  "☎️ No need for Christmas lights to communicate",
  "🧪 Hawkins Lab would be jealous of this tech",
  "👾 The Mind Flayer can't access your uploads",
  "🍕 Surfer Boy Pizza delivers faster than us... jk",
  "🎸 Eddie would shred while waiting for this",
  "🔴 Red means loading, not Vecna",
  "⏱️ Stuck in a time loop? Just kidding, loading...",
  "🎯 Roll for initiative... Upload successful!",
  
  // Memes and easter eggs
  "🐛 No bugs here, only features",
  "☕ Powered by mass amounts of caffeine",
  "🌙 Optimized for 3am coding sessions",
  "🎮 Achievement unlocked: Patient User",
  "📦 Your files are in another castle... jk",
  "🍝 Mom's spaghetti... nervous? Don't be!",
  "🦆 Rubber duck debugging in progress",
  "💾 Saving to the cloud, not a floppy disk",
  "🔮 Consulting the magic 8-ball... Upload likely!",
  "🎪 Nothing up our sleeves, just pure code",
  "🌈 At the end of this rainbow: your upload",
  "🍪 This app uses cookies... delicious ones",
  "🎵 Elevator music not included",
  "🐱 Schrödinger's upload: uploading and not",
  "🚀 To infinity and beyond... your file limit",
  "👀 I see you waiting patiently. Respect.",
  "🎲 Rolling for upload speed... Natural 20!",
  "🧙 A wizard is never late with uploads",
  "🤖 Beep boop, processing your request",
  "🌟 May the uploads be with you",
]

// Get a random fact, avoiding the previous one
let lastFactIndex = -1
function getRandomFact(): string {
  let index: number
  do {
    index = Math.floor(Math.random() * LOADING_FACTS.length)
  } while (index === lastFactIndex && LOADING_FACTS.length > 1)
  lastFactIndex = index
  return LOADING_FACTS[index]
}

interface SplashScreenProps {
  onComplete: () => void
  minDisplayTime?: number
}

type LoadingPhase = 
  | 'init' 
  | 'loading-config' 
  | 'connecting' 
  | 'authenticating'
  | 'checking-update' 
  | 'downloading-update' 
  | 'installing' 
  | 'finalizing'
  | 'ready'

// Minimum display time to show at least 3-4 facts
const DEFAULT_MIN_DISPLAY = 8000

export function SplashScreen({ onComplete, minDisplayTime = DEFAULT_MIN_DISPLAY }: SplashScreenProps) {
  const [phase, setPhase] = useState<LoadingPhase>('init')
  const [progress, setProgress] = useState(0)
  const [updateVersion, setUpdateVersion] = useState<string | null>(null)
  const [downloadProgress, setDownloadProgress] = useState(0)
  const [currentFact, setCurrentFact] = useState(getRandomFact())
  const [factFading, setFactFading] = useState(false)
  const startTimeRef = useRef(Date.now())
  const hasStartedRef = useRef(false)

  // Rotate facts every 3.5 seconds for readability
  useEffect(() => {
    const interval = setInterval(() => {
      setFactFading(true)
      setTimeout(() => {
        setCurrentFact(getRandomFact())
        setFactFading(false)
      }, 300)
    }, 3500)
    
    return () => clearInterval(interval)
  }, [])

  const getStatusMessage = () => {
    switch (phase) {
      case 'init':
        return 'Starting up...'
      case 'loading-config':
        return 'Loading configuration...'
      case 'connecting':
        return 'Connecting to Emberly servers...'
      case 'authenticating':
        return 'Validating session...'
      case 'checking-update':
        return 'Checking for updates...'
      case 'downloading-update':
        return `Downloading v${updateVersion}... ${downloadProgress}%`
      case 'installing':
        return 'Installing update...'
      case 'finalizing':
        return 'Almost there...'
      case 'ready':
        return 'Ready to go!'
      default:
        return 'Loading...'
    }
  }

  // Smooth progress animation helper
  const animateProgress = (from: number, to: number, duration: number) => {
    return new Promise<void>((resolve) => {
      const startTime = Date.now()
      const animate = () => {
        const elapsed = Date.now() - startTime
        const progress = Math.min(elapsed / duration, 1)
        // Ease out cubic for smoother feel
        const eased = 1 - Math.pow(1 - progress, 3)
        setProgress(from + (to - from) * eased)
        
        if (progress < 1) {
          requestAnimationFrame(animate)
        } else {
          resolve()
        }
      }
      animate()
    })
  }

  useEffect(() => {
    if (hasStartedRef.current) return
    hasStartedRef.current = true

    const runStartup = async () => {
      try {
        // Phase 1: Init - brief startup
        setPhase('init')
        await animateProgress(0, 8, 400)
        await new Promise(r => setTimeout(r, 600))

        // Phase 2: Loading config
        setPhase('loading-config')
        await animateProgress(8, 18, 500)
        await new Promise(r => setTimeout(r, 800))

        // Phase 3: Connecting to servers
        setPhase('connecting')
        await animateProgress(18, 35, 700)
        await new Promise(r => setTimeout(r, 1200))

        // Phase 4: Authenticating/validating
        setPhase('authenticating')
        await animateProgress(35, 50, 600)
        await new Promise(r => setTimeout(r, 900))

        // Phase 5: Check for updates
        setPhase('checking-update')
        await animateProgress(50, 60, 400)

        let updateAvailable = false
        try {
          const update = await check()
          
          if (update) {
            updateAvailable = true
            setUpdateVersion(update.version)
            await animateProgress(60, 65, 300)
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
                  setProgress(65 + (prog * 0.25)) // 65-90%
                  break
                case 'Finished':
                  setDownloadProgress(100)
                  setProgress(90)
                  break
              }
            })

            // Installing phase
            setPhase('installing')
            await animateProgress(90, 98, 800)
            await new Promise(r => setTimeout(r, 500))

            // Relaunch with the new version
            await relaunch()
            return // App will restart
          }
        } catch (error) {
          // Update check/download failed - continue silently
          console.warn('Update check failed, continuing:', error)
        }

        // No update - continue with normal loading
        await animateProgress(60, 75, 600)
        await new Promise(r => setTimeout(r, 400))

        // Phase 6: Finalizing
        setPhase('finalizing')
        await animateProgress(75, 92, 800)
        
        // Ensure minimum display time for users to see facts
        const elapsed = Date.now() - startTimeRef.current
        const remaining = Math.max(0, minDisplayTime - elapsed)
        
        if (remaining > 0) {
          // Slowly progress during remaining time
          const chunks = Math.ceil(remaining / 500)
          const progressPerChunk = (98 - 92) / chunks
          for (let i = 0; i < chunks; i++) {
            await new Promise(r => setTimeout(r, 500))
            setProgress(prev => Math.min(prev + progressPerChunk, 98))
          }
        }

        // Final ready state
        setPhase('ready')
        await animateProgress(progress, 100, 300)
        await new Promise(r => setTimeout(r, 400))
        
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
  const isReady = phase === 'ready'

  return (
    <div className="fixed inset-0 gradient-bg flex items-center justify-center z-[100]">
      {/* Animated background particles */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-64 h-64 bg-primary/5 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-primary/3 rounded-full blur-3xl animate-pulse delay-1000" />
      </div>

      <div className="relative flex flex-col items-center gap-6 p-8">
        {/* Logo Container */}
        <div className="relative">
          {/* Outer glow ring */}
          <div className="absolute -inset-4 rounded-3xl bg-gradient-to-r from-primary/20 via-primary/10 to-primary/20 blur-2xl animate-pulse" />
          
          {/* Spinning ring */}
          <div className="absolute -inset-2 rounded-2xl border-2 border-primary/20 animate-[spin_8s_linear_infinite]" />
          <div className="absolute -inset-3 rounded-2xl border border-primary/10 animate-[spin_12s_linear_infinite_reverse]" />
          
          {/* Main logo box */}
          <div className={`relative w-24 h-24 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center border border-primary/30 shadow-2xl shadow-primary/20 backdrop-blur-sm transition-all duration-500 ${isReady ? 'scale-110' : ''}`}>
            {showDownloadUI ? (
              <Download className="text-primary animate-bounce" size={48} />
            ) : phase === 'checking-update' ? (
              <RefreshCw className="text-primary animate-spin" size={48} />
            ) : (
              <div className={`transition-transform duration-1000 ${isReady ? 'scale-110' : 'animate-[spin_20s_linear_infinite]'}`}>
                <Logo size={56} primaryColor="#ffffff" accentColor="hsl(var(--primary))" />
              </div>
            )}
          </div>
        </div>

        {/* App Name & Tagline */}
        <div className="text-center space-y-3 mt-2">
          <h1 className={`text-4xl font-bold text-foreground tracking-tight transition-all duration-500 ${isReady ? 'text-primary scale-105' : ''}`}>
            {APP_NAME}
          </h1>
          
          {/* Rotating fun facts */}
          <div className="h-12 flex items-center justify-center">
            <p 
              className={`text-sm text-muted-foreground max-w-xs text-center transition-all duration-300 ${
                factFading ? 'opacity-0 translate-y-2' : 'opacity-100 translate-y-0'
              }`}
            >
              {currentFact}
            </p>
          </div>
        </div>

        {/* Progress Section */}
        <div className="w-72 space-y-2">
          {/* Progress Bar */}
          <div className="h-1.5 bg-secondary/20 rounded-full overflow-hidden backdrop-blur-sm">
            <div 
              className="h-full bg-gradient-to-r from-primary via-primary to-primary/60 rounded-full transition-all duration-200 ease-out relative"
              style={{ width: `${Math.min(progress, 100)}%` }}
            >
              {/* Shimmer effect */}
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-[shimmer_2s_infinite]" />
            </div>
          </div>
          
          {/* Status Row */}
          <div className="flex items-center justify-between text-xs">
            <span className={`text-muted-foreground transition-colors ${isReady ? 'text-primary font-medium' : ''}`}>
              {getStatusMessage()}
            </span>
            <span className="text-muted-foreground/50 tabular-nums">
              {Math.round(progress)}%
            </span>
          </div>
        </div>

        {/* Update Badge */}
        {updateVersion && showDownloadUI && (
          <div className="px-3 py-1.5 rounded-full bg-primary/10 border border-primary/20">
            <p className="text-xs text-primary font-medium">
              Updating to v{updateVersion}
            </p>
          </div>
        )}

        {/* Footer */}
        <p className="text-xs text-muted-foreground/50 mt-4">
          v{APP_VERSION}
        </p>
      </div>

      {/* Add shimmer keyframes via style tag */}
      <style>{`
        @keyframes shimmer {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(100%); }
        }
      `}</style>
    </div>
  )
}
