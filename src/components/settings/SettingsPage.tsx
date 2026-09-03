import { useState, useEffect } from 'react'
import { AppConfig, HotkeyConfig } from '../../types'
import {
  Save, Eye, EyeOff, User, LogOut, Palette, Keyboard,
  Bug, Info, Github, Heart, ExternalLink, Check,
  Camera, Volume2, Image, FileText, Moon, MousePointer, Loader2, Shield, Zap,
  Copy, RefreshCw, Globe, Download, ChevronDown, Monitor, Trash2
} from 'lucide-react'
import { useTheme, ThemePreset } from '../../hooks/useTheme'
import { DEFAULT_HOTKEYS } from '../../config'
import { HotkeyInput } from '../HotkeyInput'
import { Logo } from '../ui/Logo'
import { APP_NAME, APP_VERSION, API_URL } from '../../constants'
import { UpdateInfo } from '../../hooks/useUpdater'
import { invoke } from '@tauri-apps/api/core'
import { TestUploadModal } from '../upload/TestUploadModal'
import { UploadResponse, DomainsResponse, PerksResponse } from '../../types'
import { useSounds } from '../../hooks/useSounds'
import { saveAppearance } from '../../hooks/useAppearance'
import { AuditLogPanel, DeviceInfoPanel } from '../debug'

interface SettingsPageProps {
  config: AppConfig
  onSave: (config: AppConfig) => void
  onLogout?: () => void
  onLogin?: () => void
  // Update props
  updateInfo?: UpdateInfo
  checkingForUpdates?: boolean
  onCheckForUpdates?: () => void
  onDownloadUpdate?: () => void
  onUpload?: (filePath: string, response: UploadResponse) => void
}

// Theme preview component with live color swatches
function ThemePreviewCard({
  preset,
  isActive,
  onClick
}: {
  preset: ThemePreset
  isActive: boolean
  onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      className={`group relative p-4 rounded-xl border-2 transition-all duration-300 text-left overflow-hidden ${isActive
        ? 'border-primary bg-primary/10 shadow-lg shadow-primary/20'
        : 'border-border/50 hover:border-primary/40 hover:bg-secondary/30'
        }`}
    >
      {/* Selection indicator */}
      {isActive && (
        <div className="absolute flex items-center justify-center w-5 h-5 rounded-full top-2 right-2 bg-primary">
          <Check size={12} className="text-primary-foreground" />
        </div>
      )}

      {/* Color swatches */}
      <div className="flex gap-1.5 mb-3">
        <div
          className="w-6 h-6 border rounded-full shadow-sm border-white/20"
          style={{ backgroundColor: preset.primary }}
          title="Primary"
        />
        <div
          className="w-6 h-6 border rounded-full shadow-sm border-white/20"
          style={{ backgroundColor: preset.secondary }}
          title="Secondary"
        />
        <div
          className="w-6 h-6 border rounded-full shadow-sm border-white/20"
          style={{ backgroundColor: preset.background }}
          title="Background"
        />
      </div>

      {/* Theme name */}
      <p className="text-sm font-medium truncate text-foreground">{preset.label}</p>
      <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{preset.description}</p>
    </button>
  )
}

// Settings section wrapper
function SettingsSection({
  icon: Icon,
  title,
  description,
  children
}: {
  icon: React.ElementType
  title: string
  description?: string
  children: React.ReactNode
}) {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <div className="flex items-center justify-center w-10 h-10 border rounded-xl bg-primary/10 border-primary/20">
          <Icon size={20} className="text-primary" />
        </div>
        <div>
          <h3 className="font-semibold text-foreground">{title}</h3>
          {description && <p className="text-xs text-muted-foreground">{description}</p>}
        </div>
      </div>
      <div className="pl-0 lg:pl-13">{children}</div>
    </div>
  )
}

export function SettingsPage({
  config,
  onSave,
  onLogout,
  onLogin,
  updateInfo,
  checkingForUpdates,
  onCheckForUpdates,
  onDownloadUpdate,
  onUpload,
}: SettingsPageProps) {
  const [formData, setFormData] = useState(config)
  const [showPassword, setShowPassword] = useState(false)
  const [activeTab, setActiveTab] = useState<'account' | 'capture' | 'hotkeys' | 'preferences' | 'application'>('account')
  const [saveSuccess, setSaveSuccess] = useState(false)
  const [debugLogs, setDebugLogs] = useState<string[]>([])

  // Test Connection State
  const [isTesting, setIsTesting] = useState(false)
  const [testResult, setTestResult] = useState<{ url: string; name: string; localPath?: string } | null>(null)

  // Custom domains (for the upload-domain picker) and perk bonuses
  const [domains, setDomains] = useState<DomainsResponse | null>(null)
  const [domainsLoaded, setDomainsLoaded] = useState(false)
  const [perks, setPerks] = useState<PerksResponse | null>(null)
  const [perksLoaded, setPerksLoaded] = useState(false)

  // macOS permissions — Screen Recording, Accessibility, Background
  const [screenPermission, setScreenPermission] = useState<boolean | null>(null)
  const [accessibilityPermission, setAccessibilityPermission] = useState<boolean | null>(null)
  const [backgroundPermission, setBackgroundPermission] = useState<boolean | null>(null)
  const [checkingPermission, setCheckingPermission] = useState(false)
  const [checkingBackground, setCheckingBackground] = useState(false)
  const isMac = typeof navigator !== 'undefined' && /Mac|iPhone|iPad|iPod/.test(navigator.platform || (navigator as any).userAgent || '')

  useEffect(() => {
    if (activeTab === 'capture' && !domainsLoaded && config.uploadToken) {
      setDomainsLoaded(true)
      invoke<DomainsResponse>('emberly_get_domains', {
        apiUrl: config.uploadUrl || API_URL,
        token: config.uploadToken,
      })
        .then(setDomains)
        .catch((err) => console.error('Failed to load domains:', err))
    }
  }, [activeTab, domainsLoaded, config.uploadToken, config.uploadUrl])

  useEffect(() => {
    if (activeTab === 'account' && !perksLoaded && config.uploadToken) {
      setPerksLoaded(true)
      invoke<PerksResponse>('emberly_get_perks', {
        apiUrl: config.uploadUrl || API_URL,
        token: config.uploadToken,
      })
        .then(setPerks)
        .catch((err) => console.error('Failed to load perks:', err))
    }
  }, [activeTab, perksLoaded, config.uploadToken, config.uploadUrl])

  // Check permissions when entering capture tab (macOS)
  useEffect(() => {
    if (activeTab === 'capture' && (window as any).__TAURI_INTERNALS__) {
      invoke<boolean>('check_screen_recording_permission').then(setScreenPermission).catch(() => setScreenPermission(null))
      invoke<boolean>('check_accessibility_permission').then(setAccessibilityPermission).catch(() => setAccessibilityPermission(null))
      invoke<boolean>('check_background_permission').then(setBackgroundPermission).catch(() => setBackgroundPermission(null))
    }
  }, [activeTab])

  const handleCheckPermission = async () => {
    setCheckingPermission(true)
    try {
      const has = await invoke<boolean>('check_screen_recording_permission')
      setScreenPermission(has)
      if (!has) {
        const granted = await invoke<boolean>('request_screen_recording_permission').catch(() => false)
        setScreenPermission(granted)
      }
      const acc = await invoke<boolean>('check_accessibility_permission').catch(() => null)
      if (acc !== null) setAccessibilityPermission(acc as boolean)
      const bg = await invoke<boolean>('check_background_permission').catch(() => null)
      if (bg !== null) setBackgroundPermission(bg as boolean)
    } catch (e) {
      console.error('Permission check failed', e)
    } finally {
      setCheckingPermission(false)
    }
  }

  const handleEnableBackground = async () => {
    setCheckingBackground(true)
    try {
      const ok = await invoke<boolean>('enable_background')
      setBackgroundPermission(ok)
      if (!ok) {
        await invoke('open_background_settings').catch(() => {})
      }
    } catch (e) {
      console.error('Background enable failed', e)
      await invoke('open_background_settings').catch(() => {})
    } finally {
      setCheckingBackground(false)
    }
  }

  const handleRequestAccessibility = async () => {
    setCheckingPermission(true)
    try {
      await invoke('request_accessibility_permission')
      const has = await invoke<boolean>('check_accessibility_permission').catch(() => false)
      setAccessibilityPermission(has as boolean)
    } catch (e) {
      console.error('Accessibility request failed', e)
    } finally {
      setCheckingPermission(false)
    }
  }

  const { currentTheme, switchTheme, presets } = useTheme()
  const { preferences: soundPrefs, savePreferences, playUploadSuccess, playUploadError, playCopyLink, playSettingsSave, loaded: soundsLoaded } = useSounds()

  // Capture console logs for debug panel
  useEffect(() => {
    const originalConsoleLog = console.log
    const originalConsoleError = console.error
    const originalConsoleWarn = console.warn

    const addLog = (type: string, ...args: any[]) => {
      const timestamp = new Date().toLocaleTimeString()
      const message = args.map(arg =>
        typeof arg === 'object' ? JSON.stringify(arg, null, 2) : String(arg)
      ).join(' ')
      setDebugLogs(prev => [...prev.slice(-99), `[${timestamp}] [${type}] ${message}`])
    }

    console.log = (...args) => {
      originalConsoleLog(...args)
      addLog('LOG', ...args)
    }
    console.error = (...args) => {
      originalConsoleError(...args)
      addLog('ERROR', ...args)
    }
    console.warn = (...args) => {
      originalConsoleWarn(...args)
      addLog('WARN', ...args)
    }

    return () => {
      console.log = originalConsoleLog
      console.error = originalConsoleError
      console.warn = originalConsoleWarn
    }
  }, [])

  useEffect(() => {
    setFormData(config)
  }, [config])

  useEffect(() => {
    if (saveSuccess) {
      const timer = setTimeout(() => setSaveSuccess(false), 3000)
      return () => clearTimeout(timer)
    }
  }, [saveSuccess])

  const handleChange = (field: keyof AppConfig, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  // Helper for nested config changes
  const handleNestedChange = (section: keyof AppConfig, field: string, value: any) => {
    setFormData(prev => {
      const updated = {
        ...prev,
        [section]: {
          ...(prev[section] as any || {}),
          [field]: value
        }
      }

      // Apply appearance changes immediately
      if (section === 'appearance') {
        saveAppearance({ [field]: value })
      }

      return updated
    })
  }

  const handleHotkeyChange = (field: keyof HotkeyConfig, value: string) => {
    setFormData(prev => ({
      ...prev,
      hotkeys: {
        ...(prev.hotkeys || DEFAULT_HOTKEYS),
        [field]: value,
      },
    }))
  }

  const handleTestConnection = async () => {
    if (!formData.uploadToken) return

    // Check if we're in a Tauri environment
    if (!(window as any).__TAURI_INTERNALS__) {
      alert("Test connection only works in the desktop app, not in a web browser.")
      return
    }

    setIsTesting(true)
    try {
      // 1. Get the test image path
      const imagePath = await invoke<string>('get_test_image_path')

      // 2. Upload the file
      const response = await invoke<UploadResponse>('upload_file', {
        filePath: imagePath,
        apiUrl: formData.uploadUrl || API_URL,
        uploadToken: formData.uploadToken,
        visibility: 'PUBLIC',
      })

      setTestResult({
        url: response.url,
        name: response.name,
        localPath: imagePath
      })

      // Add to history
      if (onUpload) {
        onUpload(imagePath, response)
      }
    } catch (error) {
      console.error('Test connection failed:', error)
      const errorMsg = error instanceof Error ? error.message : String(error)
      if (errorMsg.includes("reading 'invoke'")) {
        alert("Connection failed: This feature only works in the desktop application (Tauri).")
      } else {
        alert(`Test connection failed: ${errorMsg}`)
      }
    } finally {
      setIsTesting(false)
    }
  }

  const handleSave = () => {
    onSave(formData)
    setSaveSuccess(true)
    playSettingsSave()
  }

  const tabs = [
    { id: 'account' as const, label: 'Account', icon: User },
    { id: 'capture' as const, label: 'Capture', icon: Camera },
    { id: 'hotkeys' as const, label: 'Hotkeys', icon: Keyboard },
    { id: 'preferences' as const, label: 'Preferences', icon: Palette },
    { id: 'application' as const, label: 'About', icon: Info },
  ]

  return (
    <div className="space-y-6">
      {/* Tabs */}
      <div className="flex gap-1 px-3 pb-1 -mx-3 overflow-x-auto lg:mx-0 lg:px-0 scrollbar-none">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-medium text-sm transition-all duration-300 whitespace-nowrap ${activeTab === tab.id
              ? 'bg-primary text-primary-foreground shadow-lg shadow-primary/25'
              : 'text-muted-foreground hover:text-foreground hover:bg-secondary/50'
              }`}
          >
            <tab.icon size={16} />
            <span className="hidden sm:inline">{tab.label}</span>
          </button>
        ))}
      </div>

      {/* Content Area */}
      <div className="p-4 space-y-6 glass-card lg:p-6 animate-fade-in">
        {/* Account Tab */}
        {activeTab === 'account' && (
          <div className="space-y-6">
            <SettingsSection icon={User} title="Account" description="Manage your Emberly account">
              {formData.user ? (
                <div className="p-4 space-y-3 glass-card">
                  <div className="flex items-center gap-4">
                    {formData.user.image ? (
                      <img
                        src={formData.user.image}
                        alt={formData.user.name || ''}
                        className="object-cover border-2 w-14 h-14 rounded-xl border-primary/30"
                      />
                    ) : (
                      <div className="flex items-center justify-center border-2 w-14 h-14 rounded-xl bg-primary/20 border-primary/30">
                        <User size={24} className="text-primary" />
                      </div>
                    )}
                    <div>
                      <p className="font-semibold text-foreground">{formData.user.name || 'Unknown User'}</p>
                      <p className="text-sm text-muted-foreground">{formData.user.email}</p>
                    </div>
                  </div>
                  {onLogout && (
                    <button
                      onClick={onLogout}
                      className="w-full px-4 py-2.5 bg-destructive/10 text-destructive rounded-xl font-medium hover:bg-destructive/20 transition-all duration-200 flex items-center justify-center gap-2"
                    >
                      <LogOut size={16} />
                      Sign Out
                    </button>
                  )}
                </div>
              ) : (
                <div className="p-6 space-y-4 text-center glass-card">
                  <div className="flex items-center justify-center w-16 h-16 mx-auto border-2 rounded-xl bg-primary/20 border-primary/30">
                    <User size={28} className="text-primary" />
                  </div>
                  <div>
                    <p className="font-medium text-foreground">Not signed in</p>
                    <p className="mt-1 text-sm text-muted-foreground">Sign in to sync your settings</p>
                  </div>
                  {onLogin && (
                    <button
                      onClick={onLogin}
                      className="px-6 py-2.5 bg-primary text-primary-foreground rounded-xl font-medium hover:bg-primary/90 transition-all duration-200"
                    >
                      Sign In
                    </button>
                  )}
                </div>
              )}
            </SettingsSection>

            <SettingsSection icon={Shield} title="API Token" description="Your upload authentication token">
              <div className="space-y-3">
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={formData.uploadToken || ''}
                    onChange={(e) => handleChange('uploadToken', e.target.value)}
                    placeholder="Enter your API token"
                    className="w-full px-4 py-3 pr-12 font-mono text-sm transition-all border bg-secondary/50 border-border/50 rounded-xl text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary/50"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute p-1 transition-colors -translate-y-1/2 right-3 top-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>

                <button
                  onClick={handleTestConnection}
                  disabled={isTesting || !formData.uploadToken}
                  className="w-full py-2.5 rounded-xl border border-primary/20 bg-primary/10 text-primary font-medium text-sm hover:bg-primary/20 transition-all duration-200 flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {isTesting ? (
                    <>
                      <Loader2 size={16} className="animate-spin" />
                      Testing...
                    </>
                  ) : (
                    <>
                      <Zap size={16} />
                      Test Connection
                    </>
                  )}
                </button>
              </div>
            </SettingsSection>

            {perks && perks.summary.activePerks > 0 && (
              <SettingsSection icon={Heart} title="Perks" description="Bonuses from your Emberly account">
                <div className="p-4 space-y-2 glass-card">
                  <p className="text-sm text-foreground">
                    {perks.summary.activePerks} active perk{perks.summary.activePerks !== 1 ? 's' : ''}
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {perks.summary.bonuses.storage && (
                      <span className="badge">{perks.summary.bonuses.storage} storage</span>
                    )}
                    {perks.summary.bonuses.domains && (
                      <span className="badge">{perks.summary.bonuses.domains} domains</span>
                    )}
                  </div>
                </div>
              </SettingsSection>
            )}
          </div>
        )}

        {/* Capture Tab - Combined Upload + Capture settings */}
        {activeTab === 'capture' && (
          <div className="space-y-6">
            {/* Image Settings */}
            <SettingsSection icon={Image} title="Screenshot Settings" description="Format, quality, and file options">
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-muted-foreground">Format</label>
                    <select
                      value={formData.capture?.format || 'png'}
                      onChange={(e) => handleNestedChange('capture', 'format', e.target.value)}
                      className="w-full px-4 py-2.5 bg-secondary/50 border border-border/50 rounded-xl text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                    >
                      <option value="png">PNG</option>
                      <option value="jpg">JPG</option>
                    </select>
                  </div>

                  {formData.capture?.format === 'jpg' && (
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-muted-foreground">Quality ({formData.capture?.quality || 90}%)</label>
                      <input
                        type="range"
                        min="10"
                        max="100"
                        value={formData.capture?.quality || 90}
                        onChange={(e) => handleNestedChange('capture', 'quality', parseInt(e.target.value))}
                        className="w-full h-2 mt-3 rounded-lg appearance-none cursor-pointer bg-secondary accent-primary"
                      />
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div
                    onClick={() => handleNestedChange('capture', 'includeCursor', !(formData.capture?.includeCursor ?? true))}
                    className="flex items-center justify-between p-3 transition-colors cursor-pointer rounded-xl bg-secondary/30 hover:bg-secondary/50"
                  >
                    <div className="flex items-center gap-2">
                      <MousePointer size={16} className="text-muted-foreground" />
                      <span className="text-sm text-foreground">Cursor</span>
                    </div>
                    <div className={`w-9 h-5 rounded-full p-0.5 transition-colors ${(formData.capture?.includeCursor ?? true) ? 'bg-primary' : 'bg-muted'
                      }`}>
                      <div className={`w-4 h-4 rounded-full bg-white transition-transform ${(formData.capture?.includeCursor ?? true) ? 'translate-x-4' : ''
                        }`} />
                    </div>
                  </div>

                  <div
                    onClick={() => handleNestedChange('capture', 'saveLocally', !(formData.capture?.saveLocally ?? false))}
                    className="flex items-center justify-between p-3 transition-colors cursor-pointer rounded-xl bg-secondary/30 hover:bg-secondary/50"
                  >
                    <div className="flex items-center gap-2">
                      <Volume2 size={16} className="text-muted-foreground" />
                      <span className="text-sm text-foreground">Save Local</span>
                    </div>
                    <div className={`w-9 h-5 rounded-full p-0.5 transition-colors ${(formData.capture?.saveLocally ?? false) ? 'bg-primary' : 'bg-muted'
                      }`}>
                      <div className={`w-4 h-4 rounded-full bg-white transition-transform ${(formData.capture?.saveLocally ?? false) ? 'translate-x-4' : ''
                        }`} />
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-muted-foreground">Delay (seconds)</label>
                  <input
                    type="number"
                    min="0"
                    max="10"
                    value={formData.capture?.delay || 0}
                    onChange={(e) => handleNestedChange('capture', 'delay', parseInt(e.target.value))}
                    className="w-full px-4 py-2.5 bg-secondary/50 border border-border/50 rounded-xl text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                  />
                </div>
              </div>
            </SettingsSection>

            {/* Upload Settings */}
            <SettingsSection icon={Camera} title="Upload Settings" description="Visibility and post-upload behavior">
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-2">
                  {(['PUBLIC', 'PRIVATE'] as const).map(vis => (
                    <button
                      key={vis}
                      onClick={() => handleChange('visibility', vis)}
                      className={`px-4 py-2.5 rounded-xl font-medium text-sm transition-all duration-200 ${formData.visibility === vis
                        ? 'bg-primary text-primary-foreground shadow-lg'
                        : 'bg-secondary/50 text-muted-foreground hover:text-foreground hover:bg-secondary'
                        }`}
                    >
                      {vis === 'PUBLIC' ? '🌐 Public' : '🔒 Private'}
                    </button>
                  ))}
                </div>

                {/* Password Protection */}
                <div className="space-y-2">
                  <label className="text-sm font-medium text-muted-foreground">Password Protection</label>
                  <input
                    type="password"
                    value={formData.password || ''}
                    onChange={(e) => handleChange('password', e.target.value || undefined)}
                    placeholder="Leave blank for no password"
                    className="w-full px-4 py-2.5 bg-secondary/50 border border-border/50 rounded-xl text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
                  />
                </div>

                {/* Upload Domain */}
                <div className="space-y-2">
                  <label className="text-sm font-medium text-muted-foreground">Upload Domain</label>
                  <select
                    value={formData.preferredDomain || ''}
                    onChange={(e) => handleChange('preferredDomain', e.target.value || undefined)}
                    className="w-full px-4 py-2.5 bg-secondary/50 border border-border/50 rounded-xl text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                  >
                    <option value="">Default (embrly.ca)</option>
                    {domains?.domains.filter(d => d.verified).map(d => (
                      <option key={d.id} value={d.domain}>{d.domain}</option>
                    ))}
                  </select>
                  {domainsLoaded && domains && domains.domains.filter(d => d.verified).length === 0 && (
                    <p className="text-xs text-muted-foreground">
                      No verified custom domains yet — add one at embrly.ca/dashboard/domains.
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-muted-foreground">After Upload</label>
                  <div className="flex gap-2">
                    {(['copy', 'open', 'none'] as const).map(action => (
                      <button
                        key={action}
                        onClick={() => handleNestedChange('behavior', 'postUploadAction', action)}
                        className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${formData.behavior?.postUploadAction === action
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-secondary/30 hover:bg-secondary text-muted-foreground'
                          }`}
                      >
                        {action === 'copy' ? 'Copy URL' : action === 'open' ? 'Open' : 'Nothing'}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Clipboard Format */}
                <div className="space-y-2">
                  <label className="text-sm font-medium text-muted-foreground">Clipboard Format</label>
                  <div className="grid grid-cols-2 gap-2">
                    {(['url', 'raw-url', 'markdown', 'html'] as const).map(format => (
                      <button
                        key={format}
                        onClick={() => handleNestedChange('behavior', 'clipboardFormat', format)}
                        className={`py-2 rounded-lg text-xs font-medium transition-colors border ${formData.behavior?.clipboardFormat === format
                          ? 'bg-primary/10 text-primary border-primary/20'
                          : 'bg-secondary/30 text-muted-foreground border-transparent hover:bg-secondary'
                          }`}
                      >
                        {format === 'url' ? 'Direct URL' :
                          format === 'raw-url' ? 'Raw URL' :
                            format.charAt(0).toUpperCase() + format.slice(1)}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div
                    onClick={() => handleChange('autoUpload', !formData.autoUpload)}
                    className="flex items-center justify-between p-3 transition-colors cursor-pointer rounded-xl bg-secondary/30 hover:bg-secondary/50"
                  >
                    <span className="text-sm text-foreground">Auto Upload</span>
                    <div className={`w-9 h-5 rounded-full p-0.5 transition-colors ${formData.autoUpload ? 'bg-primary' : 'bg-muted'
                      }`}>
                      <div className={`w-4 h-4 rounded-full bg-white transition-transform ${formData.autoUpload ? 'translate-x-4' : ''
                        }`} />
                    </div>
                  </div>

                  <div
                    onClick={() => handleChange('defaultNotification', !formData.defaultNotification)}
                    className="flex items-center justify-between p-3 transition-colors cursor-pointer rounded-xl bg-secondary/30 hover:bg-secondary/50"
                  >
                    <span className="text-sm text-foreground">Notifications</span>
                    <div className={`w-9 h-5 rounded-full p-0.5 transition-colors ${formData.defaultNotification ? 'bg-primary' : 'bg-muted'
                      }`}>
                      <div className={`w-4 h-4 rounded-full bg-white transition-transform ${formData.defaultNotification ? 'translate-x-4' : ''
                        }`} />
                    </div>
                  </div>

                  <div
                    onClick={() => handleNestedChange('behavior', 'playSound', !(formData.behavior?.playSound ?? true))}
                    className="flex items-center justify-between p-3 transition-colors cursor-pointer rounded-xl bg-secondary/30 hover:bg-secondary/50"
                  >
                    <span className="text-sm text-foreground">Play Sound</span>
                    <div className={`w-9 h-5 rounded-full p-0.5 transition-colors ${(formData.behavior?.playSound ?? true) ? 'bg-primary' : 'bg-muted'
                      }`}>
                      <div className={`w-4 h-4 rounded-full bg-white transition-transform ${(formData.behavior?.playSound ?? true) ? 'translate-x-4' : ''
                        }`} />
                    </div>
                  </div>
                </div>
              </div>
            </SettingsSection>

            {/* Permissions (macOS) — Screen Recording, Accessibility, Background */}
            <SettingsSection icon={Shield} title="Permissions" description="System permissions for screenshots & background">
              <div className="p-4 space-y-4 rounded-xl bg-secondary/30 border border-border/30">
                {/* Screen Recording */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-foreground">Screen Recording</p>
                      <p className="text-xs text-muted-foreground mt-0.5">Required for region capture on macOS</p>
                    </div>
                    <div className="flex items-center gap-2">
                      {screenPermission === null ? (
                        <span className="text-xs text-muted-foreground">Unknown</span>
                      ) : screenPermission ? (
                        <span className="flex items-center gap-1.5 text-xs font-medium text-green-500">
                          <span className="w-2 h-2 rounded-full bg-green-500" /> Granted
                        </span>
                      ) : (
                        <span className="flex items-center gap-1.5 text-xs font-medium text-amber-500">
                          <span className="w-2 h-2 rounded-full bg-amber-500" /> Required
                        </span>
                      )}
                    </div>
                  </div>
                  {screenPermission === false && (
                    <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/20">
                      <p className="text-xs text-amber-700 dark:text-amber-300">
                        Flicker needs Screen Recording to capture regions when in background. Grant in <span className="font-medium">System Settings → Privacy & Security → Screen Recording</span> and restart.
                      </p>
                    </div>
                  )}
                </div>

                {/* Accessibility — for global shortcuts in background */}
                <div className="space-y-2 pt-3 border-t border-border/30">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-foreground">Accessibility</p>
                      <p className="text-xs text-muted-foreground mt-0.5">For global shortcuts when app is in background</p>
                    </div>
                    <div className="flex items-center gap-2">
                      {accessibilityPermission === null ? (
                        <span className="text-xs text-muted-foreground">Unknown</span>
                      ) : accessibilityPermission ? (
                        <span className="flex items-center gap-1.5 text-xs font-medium text-green-500">
                          <span className="w-2 h-2 rounded-full bg-green-500" /> Granted
                        </span>
                      ) : (
                        <span className="flex items-center gap-1.5 text-xs font-medium text-amber-500">
                          <span className="w-2 h-2 rounded-full bg-amber-500" /> Required
                        </span>
                      )}
                    </div>
                  </div>
                  {accessibilityPermission === false && (
                    <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/20">
                      <p className="text-xs text-amber-700 dark:text-amber-300">
                        Global shortcuts (e.g., {isMac ? '⌘+Shift+S' : 'Ctrl+Shift+S'}) need Accessibility to work while Flicker is hidden. Enable in <span className="font-medium">System Settings → Privacy & Security → Accessibility</span>.
                      </p>
                    </div>
                  )}
                  <button
                    onClick={handleRequestAccessibility}
                    disabled={checkingPermission}
                    className="w-full py-2 rounded-lg bg-secondary/50 hover:bg-secondary text-sm font-medium transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    {checkingPermission ? <Loader2 size={14} className="animate-spin" /> : <Shield size={14} />}
                    {accessibilityPermission ? 'Re-check' : 'Open Accessibility Settings'}
                  </button>
                </div>

                {/* Background App — keep running when window closed */}
                <div className="space-y-2 pt-3 border-t border-border/30">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-foreground">Run in Background</p>
                      <p className="text-xs text-muted-foreground mt-0.5">Stay in tray & keep hotkeys alive after closing window</p>
                    </div>
                    <div className="flex items-center gap-2">
                      {backgroundPermission === null ? (
                        <span className="text-xs text-muted-foreground">Unknown</span>
                      ) : backgroundPermission ? (
                        <span className="flex items-center gap-1.5 text-xs font-medium text-green-500">
                          <span className="w-2 h-2 rounded-full bg-green-500" /> Enabled
                        </span>
                      ) : (
                        <span className="flex items-center gap-1.5 text-xs font-medium text-amber-500">
                          <span className="w-2 h-2 rounded-full bg-amber-500" /> Off
                        </span>
                      )}
                    </div>
                  </div>
                  {backgroundPermission === false && (
                    <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/20">
                      <p className="text-xs text-amber-700 dark:text-amber-300">
                        Enable “Run in Background” so Flicker stays in the menu bar and hotkeys work even after you close the window. On macOS this adds Flicker to <span className="font-medium">System Settings → General → Login Items → Allow in Background</span>.
                      </p>
                    </div>
                  )}
                  <button
                    onClick={handleEnableBackground}
                    disabled={checkingBackground}
                    className="w-full py-2 rounded-lg bg-primary/10 hover:bg-primary/20 text-primary border border-primary/20 text-sm font-medium transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    {checkingBackground ? <Loader2 size={14} className="animate-spin" /> : <Shield size={14} />}
                    {backgroundPermission ? 'Re-check' : 'Enable Background & Open Settings'}
                  </button>
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={handleCheckPermission}
                    disabled={checkingPermission}
                    className="flex-1 py-2 rounded-lg bg-secondary/50 hover:bg-secondary text-sm font-medium transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    {checkingPermission ? <Loader2 size={14} className="animate-spin" /> : <Shield size={14} />}
                    Re-check All
                  </button>
                </div>
                <p className="text-xs text-muted-foreground">
                  Tip: Region capture works system-wide — even when Flicker is hidden in the tray. Use <span className="font-mono text-xs bg-secondary/50 px-1.5 py-0.5 rounded border">{formData.hotkeys?.screenshotRegion ? formData.hotkeys.screenshotRegion.split('+').map(k => k === 'Super' ? (isMac ? '⌘' : 'Win') : k).join('+') : 'Control+Shift+X'}</span> anywhere. Single-click a window to capture it with tabs.
                </p>
              </div>
            </SettingsSection>
          </div>
        )}

        {/* Hotkeys Tab */}
        {activeTab === 'hotkeys' && (
          <div className="space-y-6">
            <div className="flex items-start gap-3 p-4 border rounded-xl bg-primary/10 border-primary/20">
              <Bug size={18} className="text-primary flex-shrink-0 mt-0.5" />
              <p className="text-sm text-foreground/80">
                Click the input field and press your desired key combination. Use Ctrl, Shift, Alt with letters or PrintScreen.
              </p>
            </div>

            <SettingsSection icon={Camera} title="Screenshot Hotkeys" description="Customize capture shortcuts">
              <div className="space-y-4">
                <div>
                  <label className="block mb-2 text-sm font-medium text-muted-foreground">
                    Fullscreen Screenshot
                  </label>
                  <HotkeyInput
                    value={formData.hotkeys?.screenshotFullscreen || ''}
                    onChange={(value) => handleHotkeyChange('screenshotFullscreen', value)}
                    placeholder="e.g., Control+Shift+S"
                  />
                </div>

                <div>
                  <label className="block mb-2 text-sm font-medium text-muted-foreground">
                    All Monitors Screenshot
                  </label>
                  <HotkeyInput
                    value={formData.hotkeys?.screenshotAllMonitors || ''}
                    onChange={(value) => handleHotkeyChange('screenshotAllMonitors', value)}
                    placeholder="e.g., Control+Shift+A"
                  />
                </div>

                <div>
                  <label className="block mb-2 text-sm font-medium text-muted-foreground">
                    Region Screenshot
                  </label>
                  <HotkeyInput
                    value={formData.hotkeys?.screenshotRegion || ''}
                    onChange={(value) => handleHotkeyChange('screenshotRegion', value)}
                    placeholder="e.g., Control+Shift+X"
                  />
                  <p className="mt-1 text-xs text-muted-foreground">
                    Global overlay — works even when Flicker is in background. Click to capture screen, drag to select region. On macOS requires Screen Recording permission.
                  </p>
                </div>

                <div>
                  <label className="block mb-2 text-sm font-medium text-muted-foreground">
                    Upload from Clipboard
                  </label>
                  <HotkeyInput
                    value={formData.hotkeys?.uploadClipboard || ''}
                    onChange={(value) => handleHotkeyChange('uploadClipboard', value)}
                    placeholder="e.g., Control+Alt+U"
                  />
                </div>
              </div>
            </SettingsSection>
          </div>
        )}

        {/* Preferences Tab - Combined Appearance + Sounds */}
        {activeTab === 'preferences' && (
          <div className="space-y-6">
            {/* Theme Selection */}
            <SettingsSection icon={Palette} title="Theme" description="Choose your color scheme">
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                {presets.map(preset => (
                  <ThemePreviewCard
                    key={preset.name}
                    preset={preset}
                    isActive={currentTheme === preset.name}
                    onClick={() => switchTheme(preset.name)}
                  />
                ))}
              </div>
            </SettingsSection>

            {/* Typography & Layout */}
            <SettingsSection icon={FileText} title="Display" description="Font and layout options">
              <div className="space-y-4">
                {/* Font Family */}
                <div className="space-y-2">
                  <label className="text-xs font-medium tracking-wide uppercase text-muted-foreground">Font</label>
                  <div className="grid grid-cols-5 gap-2">
                    {([
                      { id: 'system', label: 'System' },
                      { id: 'inter', label: 'Inter' },
                      { id: 'roboto', label: 'Roboto' },
                      { id: 'mono', label: 'Mono' },
                      { id: 'poppins', label: 'Poppins' },
                    ] as const).map(font => (
                      <button
                        key={font.id}
                        onClick={() => handleNestedChange('appearance', 'fontFamily', font.id)}
                        className={`py-2 rounded-lg text-xs font-medium transition-all ${(formData.appearance?.fontFamily || 'system') === font.id
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-secondary/30 text-muted-foreground hover:bg-secondary/50'
                          }`}
                      >
                        {font.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Font Size + Corner Roundness Row */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-xs font-medium tracking-wide uppercase text-muted-foreground">Size</label>
                    <div className="grid grid-cols-3 gap-1">
                      {(['small', 'medium', 'large'] as const).map(size => (
                        <button
                          key={size}
                          onClick={() => handleNestedChange('appearance', 'fontScale', size)}
                          className={`py-2 rounded-lg text-xs font-medium transition-all capitalize ${(formData.appearance?.fontScale || 'medium') === size
                            ? 'bg-primary text-primary-foreground'
                            : 'bg-secondary/30 text-muted-foreground hover:bg-secondary/50'
                            }`}
                        >
                          {size[0].toUpperCase()}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-medium tracking-wide uppercase text-muted-foreground">Corners</label>
                    <div className="grid grid-cols-4 gap-1">
                      {(['none', 'small', 'medium', 'large'] as const).map(r => (
                        <button
                          key={r}
                          onClick={() => handleNestedChange('appearance', 'borderRadius', r)}
                          className={`py-2 rounded-lg text-xs font-medium transition-all ${(formData.appearance?.borderRadius || 'medium') === r
                            ? 'bg-primary text-primary-foreground'
                            : 'bg-secondary/30 text-muted-foreground hover:bg-secondary/50'
                            }`}
                        >
                          {r === 'none' ? '▢' : r === 'small' ? '◜' : r === 'medium' ? '◠' : '⬬'}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Visual Effects Toggles */}
                <div className="grid grid-cols-3 gap-2">
                  <button
                    onClick={() => handleNestedChange('appearance', 'animations', !(formData.appearance?.animations ?? true))}
                    className={`p-3 rounded-lg text-center transition-all ${(formData.appearance?.animations ?? true)
                      ? 'bg-primary/20 border border-primary/30'
                      : 'bg-secondary/30 border border-transparent'
                      }`}
                  >
                    <Zap size={18} className={`mx-auto mb-1 ${(formData.appearance?.animations ?? true) ? 'text-primary' : 'text-muted-foreground'}`} />
                    <span className="text-xs font-medium">Motion</span>
                  </button>

                  <button
                    onClick={() => handleNestedChange('appearance', 'glassEffect', !(formData.appearance?.glassEffect ?? true))}
                    className={`p-3 rounded-lg text-center transition-all ${(formData.appearance?.glassEffect ?? true)
                      ? 'bg-primary/20 border border-primary/30'
                      : 'bg-secondary/30 border border-transparent'
                      }`}
                  >
                    <Moon size={18} className={`mx-auto mb-1 ${(formData.appearance?.glassEffect ?? true) ? 'text-primary' : 'text-muted-foreground'}`} />
                    <span className="text-xs font-medium">Glass</span>
                  </button>

                  <button
                    onClick={() => handleNestedChange('appearance', 'compactMode', !(formData.appearance?.compactMode ?? false))}
                    className={`p-3 rounded-lg text-center transition-all ${(formData.appearance?.compactMode ?? false)
                      ? 'bg-primary/20 border border-primary/30'
                      : 'bg-secondary/30 border border-transparent'
                      }`}
                  >
                    <Camera size={18} className={`mx-auto mb-1 ${(formData.appearance?.compactMode ?? false) ? 'text-primary' : 'text-muted-foreground'}`} />
                    <span className="text-xs font-medium">Compact</span>
                  </button>
                </div>
              </div>
            </SettingsSection>

            {/* Sounds */}
            {soundsLoaded && (
              <SettingsSection icon={Volume2} title="Sounds" description="Audio feedback">
                <div className="space-y-3">
                  {/* Master Toggle */}
                  <div className="flex items-center justify-between p-3 rounded-xl bg-secondary/30">
                    <span className="font-medium text-foreground">Enable Sounds</span>
                    <button
                      onClick={() => savePreferences({ enabled: !soundPrefs.enabled })}
                      className={`w-11 h-6 rounded-full transition-all ${soundPrefs.enabled ? 'bg-primary' : 'bg-secondary/50'
                        } flex items-center px-0.5`}
                    >
                      <div className={`w-5 h-5 bg-white rounded-full transition-transform shadow-sm ${soundPrefs.enabled ? 'translate-x-5' : ''}`} />
                    </button>
                  </div>

                  {/* Sound Options Grid */}
                  {soundPrefs.enabled && (
                    <div className="grid grid-cols-2 gap-2">
                      {[
                        { key: 'uploadSuccess', label: 'Upload Success', icon: Check, color: 'green', play: playUploadSuccess },
                        { key: 'uploadError', label: 'Upload Error', icon: Bug, color: 'red', play: playUploadError },
                        { key: 'copyLink', label: 'Copy Link', icon: Copy, color: 'blue', play: playCopyLink },
                        { key: 'settingsSave', label: 'Settings Save', icon: Save, color: 'purple', play: playSettingsSave },
                      ].map(sound => (
                        <div
                          key={sound.key}
                          className={`p-3 rounded-lg border transition-all ${soundPrefs[sound.key as keyof typeof soundPrefs]
                            ? `bg-${sound.color}-500/10 border-${sound.color}-500/30`
                            : 'bg-secondary/20 border-transparent'
                            }`}
                        >
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2">
                              <sound.icon size={14} className={soundPrefs[sound.key as keyof typeof soundPrefs] ? `text-${sound.color}-400` : 'text-muted-foreground'} />
                              <span className="text-xs font-medium">{sound.label}</span>
                            </div>
                            <button
                              onClick={() => savePreferences({ [sound.key]: !soundPrefs[sound.key as keyof typeof soundPrefs] })}
                              className={`w-8 h-4 rounded-full transition-all ${soundPrefs[sound.key as keyof typeof soundPrefs] ? 'bg-primary' : 'bg-secondary/50'
                                } flex items-center px-0.5`}
                            >
                              <div className={`w-3 h-3 bg-white rounded-full transition-transform ${soundPrefs[sound.key as keyof typeof soundPrefs] ? 'translate-x-4' : ''}`} />
                            </button>
                          </div>
                          <button
                            onClick={sound.play}
                            className="w-full py-1.5 text-xs font-medium bg-white/5 hover:bg-white/10 rounded transition-colors"
                          >
                            ▶ Preview
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </SettingsSection>
            )}
          </div>
        )}

        {/* Application Tab */}
        {activeTab === 'application' && (
          <div className="space-y-6">
            {/* App Info */}
            <div className="py-6 text-center">
              <div className="flex items-center justify-center w-20 h-20 mx-auto mb-4 border rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 border-primary/30">
                <Logo size={48} primaryColor="#ffffff" accentColor="hsl(var(--primary))" />
              </div>
              <h2 className="text-2xl font-bold text-foreground">{APP_NAME}</h2>
              <p className="mt-1 text-muted-foreground">Version {APP_VERSION}</p>
            </div>

            {/* Description */}
            <div className="p-4 text-center glass-card">
              <p className="text-sm text-muted-foreground">
                A powerful, ShareX-like screenshot and upload tool for Emberly.
                Capture, upload, and share instantly with global hotkeys.
              </p>
            </div>

            {/* Updates Section */}
            <SettingsSection icon={Download} title="Updates" description="Check for new versions">
              <div className="space-y-3">
                {updateInfo?.available ? (
                  <div className="p-4 space-y-3 border glass-card border-primary/30">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                      <span className="text-sm font-medium text-primary">Update Available!</span>
                    </div>
                    <p className="text-sm text-foreground">
                      Version {updateInfo.version} is ready to download
                    </p>
                    {updateInfo.notes && (
                      <p className="text-xs text-muted-foreground line-clamp-3">
                        {updateInfo.notes}
                      </p>
                    )}
                    {updateInfo.downloading ? (
                      <div className="space-y-2">
                        <div className="h-2 overflow-hidden rounded-full bg-secondary/30">
                          <div
                            className="h-full transition-all duration-300 rounded-full bg-primary"
                            style={{ width: `${updateInfo.progress || 0}%` }}
                          />
                        </div>
                        <p className="text-xs text-center text-muted-foreground">
                          Downloading... {updateInfo.progress || 0}%
                        </p>
                      </div>
                    ) : (
                      <button
                        onClick={onDownloadUpdate}
                        className="w-full py-2.5 bg-primary text-primary-foreground rounded-lg font-medium text-sm hover:bg-primary/90 transition-colors flex items-center justify-center gap-2"
                      >
                        <Download size={16} />
                        Download & Install
                      </button>
                    )}
                  </div>
                ) : (
                  <div className="flex items-center justify-between p-4 rounded-xl bg-secondary/30">
                    <div>
                      <p className="text-sm font-medium text-foreground">
                        {checkingForUpdates ? 'Checking...' : 'You\'re up to date!'}
                      </p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Current version: {APP_VERSION}
                      </p>
                    </div>
                    <button
                      onClick={onCheckForUpdates}
                      disabled={checkingForUpdates}
                      className="flex items-center gap-2 px-4 py-2 text-sm font-medium transition-colors rounded-lg bg-secondary/50 hover:bg-secondary disabled:opacity-50"
                    >
                      <RefreshCw size={14} className={checkingForUpdates ? 'animate-spin' : ''} />
                      Check
                    </button>
                  </div>
                )}
              </div>
            </SettingsSection>

            {/* Debug/Logs Section */}
            <SettingsSection icon={Bug} title="Debug & Support" description="Logs, diagnostics, and device information">
              <div className="space-y-4">
                {/* Device Info Collapsible */}
                <details className="group">
                  <summary className="flex items-center justify-between p-4 list-none transition-colors cursor-pointer rounded-xl bg-secondary/30 hover:bg-secondary/50">
                    <div className="flex items-center gap-3">
                      <Monitor size={18} className="text-muted-foreground" />
                      <span className="text-sm font-medium text-foreground">Device Information</span>
                    </div>
                    <ChevronDown size={16} className="transition-transform text-muted-foreground group-open:rotate-180" />
                  </summary>
                  <div className="p-4 mt-2 border rounded-xl bg-secondary/20 border-border/30">
                    <DeviceInfoPanel />
                  </div>
                </details>

                {/* Audit Logs Collapsible */}
                <details className="group">
                  <summary className="flex items-center justify-between p-4 list-none transition-colors cursor-pointer rounded-xl bg-secondary/30 hover:bg-secondary/50">
                    <div className="flex items-center gap-3">
                      <FileText size={18} className="text-muted-foreground" />
                      <span className="text-sm font-medium text-foreground">Activity Logs</span>
                    </div>
                    <ChevronDown size={16} className="transition-transform text-muted-foreground group-open:rotate-180" />
                  </summary>
                  <div className="p-4 mt-2 border rounded-xl bg-secondary/20 border-border/30">
                    <AuditLogPanel initialLimit={100} />
                  </div>
                </details>

                {/* Console Logs Collapsible */}
                <details className="group">
                  <summary className="flex items-center justify-between p-4 list-none transition-colors cursor-pointer rounded-xl bg-secondary/30 hover:bg-secondary/50">
                    <div className="flex items-center gap-3">
                      <Bug size={18} className="text-muted-foreground" />
                      <span className="text-sm font-medium text-foreground">Console Logs</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground">{debugLogs.length} entries</span>
                      <ChevronDown size={16} className="transition-transform text-muted-foreground group-open:rotate-180" />
                    </div>
                  </summary>
                  <div className="p-3 mt-2 space-y-2 border rounded-xl bg-secondary/20 border-border/30">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => navigator.clipboard.writeText(debugLogs.join('\n'))}
                        className="p-1.5 hover:bg-secondary rounded transition-colors"
                        title="Copy logs"
                      >
                        <Copy size={14} className="text-muted-foreground" />
                      </button>
                      <button
                        onClick={() => setDebugLogs([])}
                        className="p-1.5 hover:bg-secondary rounded transition-colors"
                        title="Clear logs"
                      >
                        <Trash2 size={14} className="text-muted-foreground" />
                      </button>
                    </div>
                    <div className="h-48 p-2 overflow-auto font-mono text-xs rounded-lg bg-black/30">
                      {debugLogs.length > 0 ? (
                        debugLogs.map((log, i) => (
                          <div
                            key={i}
                            className={`py-0.5 ${log.includes('[ERROR]') ? 'text-red-400' :
                              log.includes('[WARN]') ? 'text-yellow-400' :
                                'text-green-400'
                              }`}
                          >
                            {log}
                          </div>
                        ))
                      ) : (
                        <div className="py-8 text-center text-muted-foreground/50">
                          No logs yet
                        </div>
                      )}
                    </div>
                  </div>
                </details>
              </div>
            </SettingsSection>

            {/* Links */}
            <SettingsSection icon={ExternalLink} title="Links" description="Useful resources">
              <div className="space-y-2">
                <a
                  href="https://github.com/EmberlyOSS/Flicker"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-between p-4 transition-colors rounded-xl bg-secondary/30 hover:bg-secondary/50 group"
                >
                  <div className="flex items-center gap-3">
                    <Github size={18} className="text-muted-foreground" />
                    <span className="text-sm font-medium text-foreground">GitHub Repository</span>
                  </div>
                  <ExternalLink size={16} className="transition-colors text-muted-foreground group-hover:text-foreground" />
                </a>

                <a
                  href="https://embrly.ca"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-between p-4 transition-colors rounded-xl bg-secondary/30 hover:bg-secondary/50 group"
                >
                  <div className="flex items-center gap-3">
                    <Globe size={18} className="text-muted-foreground" />
                    <span className="text-sm font-medium text-foreground">Emberly Website</span>
                  </div>
                  <ExternalLink size={16} className="transition-colors text-muted-foreground group-hover:text-foreground" />
                </a>

                <a
                  href="https://embrly.ca/discord"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-between p-4 transition-colors rounded-xl bg-secondary/30 hover:bg-secondary/50 group"
                >
                  <div className="flex items-center gap-3">
                    <svg className="w-[18px] h-[18px] text-muted-foreground" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z" />
                    </svg>
                    <span className="text-sm font-medium text-foreground">Discord Server</span>
                  </div>
                  <ExternalLink size={16} className="transition-colors text-muted-foreground group-hover:text-foreground" />
                </a>
              </div>
            </SettingsSection>

            {/* Credits */}
            <SettingsSection icon={Heart} title="Credits" description="Built with love">
              <div className="p-4 space-y-2 text-center glass-card">
                <p className="text-sm text-muted-foreground">
                  Made with <Heart size={14} className="inline text-red-500 fill-red-500" /> by the Emberly Team
                </p>
                <p className="text-xs text-muted-foreground/60">
                  © {new Date().getFullYear()} Emberly. All rights reserved.
                </p>
              </div>
            </SettingsSection>
          </div>
        )}
      </div>

      {/* Sticky Save Button */}
      {activeTab !== 'application' && activeTab !== 'preferences' && (
        <div className="sticky bottom-0 px-4 pt-4 pb-2 -mx-4 bg-gradient-to-t from-background via-background to-transparent">
          <button
            onClick={handleSave}
            className={`w-full py-3 rounded-xl font-semibold transition-all duration-300 flex items-center justify-center gap-2 ${saveSuccess
              ? 'bg-green-500 text-white shadow-lg shadow-green-500/25'
              : 'bg-primary text-primary-foreground hover:bg-primary/90 shadow-lg shadow-primary/25'
              }`}
          >
            {saveSuccess ? (
              <>
                <Check size={18} />
                Saved!
              </>
            ) : (
              <>
                <Save size={18} />
                Save Changes
              </>
            )}
          </button>
        </div>
      )}

      {/* Test Upload Modal */}
      {testResult && (
        <TestUploadModal
          isOpen={!!testResult}
          onClose={() => setTestResult(null)}
          imageUrl={testResult.url}
          imageName={testResult.name}
          localPath={testResult.localPath}
        />
      )}
    </div>
  )
}
