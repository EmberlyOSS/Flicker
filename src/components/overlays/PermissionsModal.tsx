import { useState } from 'react'
import { Shield, Camera, Keyboard, Power, CheckCircle2, AlertCircle, ExternalLink, RefreshCw, X } from 'lucide-react'
import { useApp } from '../../context/AppContext'
import { invoke } from '@tauri-apps/api/core'

export function PermissionsModal() {
  const { macPermissions, requestMacPermissions, checkMacPermissions, setShowPermissionsModal } = useApp()
  const [loadingType, setLoadingType] = useState<string | null>(null)

  const handleRequest = async (type: 'screen' | 'accessibility' | 'background') => {
    setLoadingType(type)
    try {
      await requestMacPermissions(type)
    } finally {
      setLoadingType(null)
    }
  }

  const handleOpenSettings = async (target: string) => {
    try {
      if (target === 'screen') {
        await invoke('open_screen_recording_settings')
      } else if (target === 'accessibility') {
        await invoke('open_accessibility_settings')
      } else {
        await invoke('open_background_settings')
      }
    } catch {}
  }

  const handleDismiss = () => {
    sessionStorage.setItem('flicker_perms_dismissed', 'true')
    setShowPermissionsModal(false)
  }

  const allGranted = macPermissions.screenRecording && macPermissions.accessibility && macPermissions.background

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
      <div className="w-full max-w-lg overflow-hidden border shadow-2xl glass-card border-border/50 rounded-2xl animate-scale-up">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-border/30 bg-secondary/20">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-10 h-10 border rounded-xl bg-primary/20 border-primary/30 text-primary">
              <Shield size={20} />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-foreground">macOS Permissions</h3>
              <p className="text-xs text-muted-foreground">Setup Flicker for screenshots, video, & background hotkeys</p>
            </div>
          </div>
          <button
            onClick={handleDismiss}
            className="p-2 transition-colors rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary/50"
          >
            <X size={18} />
          </button>
        </div>

        {/* Permission Cards */}
        <div className="p-6 space-y-4 max-h-[65vh] overflow-y-auto">
          {/* Screen Recording */}
          <div className="p-4 transition-colors border rounded-xl bg-secondary/30 border-border/40 hover:bg-secondary/40">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-start gap-3">
                <div className="p-2 rounded-lg bg-primary/10 text-primary mt-0.5">
                  <Camera size={18} />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium text-foreground">Screen Recording</p>
                    {macPermissions.screenRecording ? (
                      <span className="flex items-center gap-1 text-[11px] font-medium text-green-500 bg-green-500/10 px-2 py-0.5 rounded-full">
                        <CheckCircle2 size={12} /> Granted
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 text-[11px] font-medium text-amber-500 bg-amber-500/10 px-2 py-0.5 rounded-full">
                        <AlertCircle size={12} /> Required
                      </span>
                    )}
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Required to capture screenshots and record native screen video.
                  </p>
                </div>
              </div>

              {!macPermissions.screenRecording ? (
                <div className="flex flex-col gap-1.5 shrink-0">
                  <button
                    onClick={() => handleRequest('screen')}
                    disabled={loadingType === 'screen'}
                    className="px-3 py-1.5 text-xs font-medium rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-all disabled:opacity-50"
                  >
                    {loadingType === 'screen' ? 'Asking...' : 'Ask Permission'}
                  </button>
                  <button
                    onClick={() => handleOpenSettings('screen')}
                    className="flex items-center justify-center gap-1 text-[10px] text-muted-foreground hover:text-primary transition-colors"
                  >
                    <ExternalLink size={10} /> Settings
                  </button>
                </div>
              ) : (
                <span className="text-xs font-medium text-green-500 shrink-0">Active</span>
              )}
            </div>
          </div>

          {/* Accessibility */}
          <div className="p-4 transition-colors border rounded-xl bg-secondary/30 border-border/40 hover:bg-secondary/40">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-start gap-3">
                <div className="p-2 rounded-lg bg-primary/10 text-primary mt-0.5">
                  <Keyboard size={18} />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium text-foreground">Accessibility (Global Hotkeys)</p>
                    {macPermissions.accessibility ? (
                      <span className="flex items-center gap-1 text-[11px] font-medium text-green-500 bg-green-500/10 px-2 py-0.5 rounded-full">
                        <CheckCircle2 size={12} /> Granted
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 text-[11px] font-medium text-amber-500 bg-amber-500/10 px-2 py-0.5 rounded-full">
                        <AlertCircle size={12} /> Required
                      </span>
                    )}
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Allows your shortcuts (⌘+Shift+S, ⌘+Shift+R) to trigger while Flicker is hidden in the background.
                  </p>
                </div>
              </div>

              {!macPermissions.accessibility ? (
                <div className="flex flex-col gap-1.5 shrink-0">
                  <button
                    onClick={() => handleRequest('accessibility')}
                    disabled={loadingType === 'accessibility'}
                    className="px-3 py-1.5 text-xs font-medium rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-all disabled:opacity-50"
                  >
                    {loadingType === 'accessibility' ? 'Asking...' : 'Ask Permission'}
                  </button>
                  <button
                    onClick={() => handleOpenSettings('accessibility')}
                    className="flex items-center justify-center gap-1 text-[10px] text-muted-foreground hover:text-primary transition-colors"
                  >
                    <ExternalLink size={10} /> Settings
                  </button>
                </div>
              ) : (
                <span className="text-xs font-medium text-green-500 shrink-0">Active</span>
              )}
            </div>
          </div>

          {/* Run in Background */}
          <div className="p-4 transition-colors border rounded-xl bg-secondary/30 border-border/40 hover:bg-secondary/40">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-start gap-3">
                <div className="p-2 rounded-lg bg-primary/10 text-primary mt-0.5">
                  <Power size={18} />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium text-foreground">Run in Background</p>
                    {macPermissions.background ? (
                      <span className="flex items-center gap-1 text-[11px] font-medium text-green-500 bg-green-500/10 px-2 py-0.5 rounded-full">
                        <CheckCircle2 size={12} /> Enabled
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 text-[11px] font-medium text-muted-foreground bg-secondary px-2 py-0.5 rounded-full">
                        Disabled
                      </span>
                    )}
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Stays active in the menu bar and starts on login so capture is always instant.
                  </p>
                </div>
              </div>

              {!macPermissions.background ? (
                <div className="flex flex-col gap-1.5 shrink-0">
                  <button
                    onClick={() => handleRequest('background')}
                    disabled={loadingType === 'background'}
                    className="px-3 py-1.5 text-xs font-medium rounded-lg bg-secondary text-foreground hover:bg-secondary/80 border border-border transition-all disabled:opacity-50"
                  >
                    {loadingType === 'background' ? 'Enabling...' : 'Enable'}
                  </button>
                </div>
              ) : (
                <span className="text-xs font-medium text-green-500 shrink-0">Active</span>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-4 border-t border-border/30 bg-secondary/10">
          <button
            onClick={() => checkMacPermissions()}
            className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors px-3 py-2 rounded-lg hover:bg-secondary/50"
          >
            <RefreshCw size={14} /> Re-check Status
          </button>

          <button
            onClick={handleDismiss}
            className={`px-5 py-2 text-sm font-medium rounded-xl transition-all ${
              allGranted
                ? 'bg-primary text-primary-foreground hover:bg-primary/90'
                : 'bg-secondary text-foreground hover:bg-secondary/80'
            }`}
          >
            {allGranted ? 'All Set! Continue' : 'Done for Now'}
          </button>
        </div>
      </div>
    </div>
  )
}
