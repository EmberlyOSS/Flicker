import { useState, useEffect } from 'react'
import { AppConfig, HotkeyConfig } from '../../types'
import {
  Save, Eye, EyeOff, User, LogOut, Palette, Keyboard,
  Bug, Info, Github, Heart, ExternalLink, Check,
  Camera, Volume2, Image, FileText, Moon, MousePointer, Loader2, Shield, Zap,
  Copy, RefreshCw, Globe, Download, ChevronDown, Monitor, Trash2, Video, Mic, Clock, Upload, HardDrive, FolderOpen, AlertTriangle, Play,
  Crosshair, Layers, ClipboardPaste, RotateCcw, AppWindow
} from 'lucide-react'
import { openUrl, revealItemInDir } from '@tauri-apps/plugin-opener'
import { useApp } from '../../context/AppContext'
import { listen } from '@tauri-apps/api/event'
import { useTheme, ThemePreset } from '../../hooks/useTheme'
import { DEFAULT_HOTKEYS } from '../../config'
import { logActivity, useConsoleLogs } from '../../utils/consoleBuffer'
import { playSound } from '../../utils/sounds'
import { SettingRow, Segmented, Switch } from '../ui/kit'
import { HotkeyInput } from '../HotkeyInput'
import { Logo } from '../ui/Logo'
import { APP_NAME, APP_VERSION, API_URL } from '../../constants'
import { useUpdater } from '../../hooks/useUpdater'
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

  onUpload?: (filePath: string, response: UploadResponse) => void
}

function ThemePreviewCard({
  preset,
  isActive,
  onClick,
}: {
  preset: ThemePreset
  isActive: boolean
  onClick: () => void
}) {
  const c = (key: keyof ThemePreset['colors']) => `hsl(${preset.colors[key]})`
  return (
    <button
      onClick={onClick}
      aria-pressed={isActive}
      className={`group relative overflow-hidden rounded-xl border text-left transition-colors ${
        isActive ? 'border-primary ring-1 ring-primary/40' : 'border-border/70 hover:border-primary/40'
      }`}
    >
      <div className="flex h-16 gap-1.5 p-2" style={{ backgroundColor: c('background') }}>
        <div className="w-5 space-y-1 rounded-md p-1" style={{ backgroundColor: c('card') }}>
          <div className="h-1.5 rounded-full" style={{ backgroundColor: c('primary') }} />
          <div className="h-1 rounded-full opacity-50" style={{ backgroundColor: c('mutedForeground') }} />
          <div className="h-1 rounded-full opacity-50" style={{ backgroundColor: c('mutedForeground') }} />
        </div>
        <div className="flex flex-1 flex-col justify-between rounded-md border p-1.5" style={{ backgroundColor: c('card'), borderColor: c('border') }}>
          <div className="space-y-1">
            <div className="h-1.5 w-3/4 rounded-full" style={{ backgroundColor: c('foreground') }} />
            <div className="h-1 w-1/2 rounded-full opacity-60" style={{ backgroundColor: c('mutedForeground') }} />
          </div>
          <div className="h-2 w-8 self-end rounded-full" style={{ backgroundColor: c('primary') }} />
        </div>
      </div>
      <div className="flex items-center justify-between gap-2 border-t border-border/60 px-3 py-2">
        <div className="min-w-0">
          <p className="truncate text-xs font-medium text-foreground">{preset.label}</p>
          <p className="truncate text-[11px] text-muted-foreground">{preset.description}</p>
        </div>
        {isActive && (
          <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-primary">
            <Check size={10} className="text-primary-foreground" />
          </span>
        )}
      </div>
    </button>
  )
}




function CornerIcon({ radius }: { radius: number }) {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden>
      <path d={`M2 12 V${2 + radius} Q2 2 ${2 + radius} 2 H12`} stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  )
}

function SettingsSection({
  icon: Icon,
  title,
  description,
  action,
  children
}: {
  icon: React.ElementType
  title: string
  description?: string
  action?: React.ReactNode
  children: React.ReactNode
}) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-10 h-10 border rounded-xl bg-primary/10 border-primary/20">
            <Icon size={20} className="text-primary" />
          </div>
          <div>
            <h3 className="font-semibold text-foreground">{title}</h3>
            {description && <p className="text-xs text-muted-foreground">{description}</p>}
          </div>
        </div>
        {action}
      </div>
      <div className="pl-0 lg:pl-13">{children}</div>
    </div>
  )
}


function HotkeyWarning({ reason }: { reason?: string }) {
  if (!reason) return null
  return (
    <p className="mt-1.5 flex items-center gap-1.5 text-xs text-amber-400">
      <AlertTriangle size={13} className="shrink-0" />
      {reason}. Pick a different shortcut.
    </p>
  )
}

function PermissionBadge({ granted, on = 'Granted', off = 'Required' }: { granted: boolean | null; on?: string; off?: string }) {
  if (granted === null) return <span className="text-xs text-muted-foreground">Unknown</span>
  return (
    <span className={`flex items-center gap-1.5 text-xs font-medium ${granted ? 'text-emerald-500' : 'text-amber-500'}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${granted ? 'bg-emerald-500' : 'bg-amber-500'}`} />
      {granted ? on : off}
    </span>
  )
}

const fieldClass =
  'rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground placeholder-muted-foreground transition-colors focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring/20'
const buttonClass =
  'flex shrink-0 items-center justify-center gap-1.5 rounded-lg border border-border/70 px-3 py-2 text-xs font-medium text-foreground transition-colors hover:bg-secondary disabled:opacity-50'
const summaryClass =
  'flex cursor-pointer list-none items-center justify-between py-3 text-sm font-medium text-foreground [&::-webkit-details-marker]:hidden'

export const SETTINGS_TAB_KEY = 'flicker-settings-tab'
type SettingsTab = 'account' | 'capture' | 'hotkeys' | 'preferences' | 'application'

export function SettingsPage({
  config,
  onSave,
  onLogout,
  onLogin,
  onUpload,
}: SettingsPageProps) {
  const { updateInfo, checking: checkingForUpdates, checkForUpdates: onCheckForUpdates, installOrDownload: onDownloadUpdate } = useUpdater()
  const [formData, setFormData] = useState(config)
  const [showPassword, setShowPassword] = useState(false)
  const [activeTab, setActiveTab] = useState<SettingsTab>(() => {
    const requested = sessionStorage.getItem(SETTINGS_TAB_KEY) as SettingsTab | null
    sessionStorage.removeItem(SETTINGS_TAB_KEY)
    return requested || 'account'
  })
  const [saveSuccess, setSaveSuccess] = useState(false)
  const [consoleOpen, setConsoleOpen] = useState(false)
  const { lines: debugLogs, clear: clearDebugLogs } = useConsoleLogs(consoleOpen)

  const [isTesting, setIsTesting] = useState(false)
  const [testResult, setTestResult] = useState<{ url: string; name: string; localPath?: string } | null>(null)

  const [domains, setDomains] = useState<DomainsResponse | null>(null)
  const [domainsLoaded, setDomainsLoaded] = useState(false)
  const [perks, setPerks] = useState<PerksResponse | null>(null)
  const [perksLoaded, setPerksLoaded] = useState(false)

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
  const { preferences: soundPrefs, savePreferences, playSettingsSave, loaded: soundsLoaded } = useSounds()


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

  const handleNestedChange = (section: keyof AppConfig, field: string, value: any) => {
    setFormData(prev => {
      const updated = {
        ...prev,
        [section]: {
          ...(prev[section] as any || {}),
          [field]: value
        }
      }

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

    if (!(window as any).__TAURI_INTERNALS__) {
      alert("Test connection only works in the desktop app, not in a web browser.")
      return
    }

    setIsTesting(true)
    try {

      const imagePath = await invoke<string>('get_test_image_path')

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
    logActivity('settings', 'Settings saved')
    setSaveSuccess(true)
    playSettingsSave()
  }

  const withoutAppearance = ({ appearance: _appearance, ...rest }: AppConfig) => rest
  const isDirty = JSON.stringify(withoutAppearance(formData)) !== JSON.stringify(withoutAppearance(config))
  const [avatarFailed, setAvatarFailed] = useState(false)
  const [screenshotsPath, setScreenshotsPath] = useState<string | null>(null)

  useEffect(() => {
    if (activeTab === 'application' && !updateInfo.checked && !checkingForUpdates) onCheckForUpdates()
  }, [activeTab])
  const [hotkeyStatus, setHotkeyStatus] = useState<Record<string, string>>({})

  useEffect(() => {
    if (!(window as any).__TAURI_INTERNALS__) return
    invoke<Record<string, string>>('get_hotkey_status').then(setHotkeyStatus).catch(() => {})
    const unlisten = listen<Record<string, string>>('hotkeys_status', (e) => setHotkeyStatus(e.payload))
    return () => { unlisten.then((fn) => fn()) }
  }, [])

  const hotkeyIssue = (field: string) =>
    (formData.hotkeys as any)?.[field] === (config.hotkeys as any)?.[field] ? hotkeyStatus[field] : undefined

  useEffect(() => {
    if (activeTab === 'capture' && !screenshotsPath && (window as any).__TAURI_INTERNALS__) {
      invoke<string>('get_screenshots_path').then(setScreenshotsPath).catch(() => {})
    }
  }, [activeTab, screenshotsPath])
  const { instance } = useApp()
  const siteUrl = (formData.uploadUrl || API_URL).replace(/\/+$/, '')
  const siteHost = siteUrl.replace(/^https?:\/\//, '')
  const avatarUrl = formData.user?.image
    ? new URL(formData.user.image, formData.uploadUrl || API_URL).toString()
    : null

  const tabs = [
    { id: 'account' as const, label: 'Account', icon: User },
    { id: 'capture' as const, label: 'Capture', icon: Camera },
    { id: 'hotkeys' as const, label: 'Hotkeys', icon: Keyboard },
    { id: 'preferences' as const, label: 'Preferences', icon: Palette },
    { id: 'application' as const, label: 'About', icon: Info },
  ]

  return (
    <div className="space-y-6">

      <div className="flex gap-1 px-3 pb-1 -mx-3 overflow-x-auto lg:mx-0 lg:px-0 scrollbar-none">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-sm whitespace-nowrap transition-colors ${activeTab === tab.id
              ? 'bg-secondary text-foreground font-medium'
              : 'text-muted-foreground hover:text-foreground hover:bg-secondary/60'
              }`}
          >
            <tab.icon size={16} className={activeTab === tab.id ? 'text-primary' : ''} />
            <span className="hidden sm:inline">{tab.label}</span>
          </button>
        ))}
      </div>

      <div className="p-4 space-y-6 glass-card lg:p-6 animate-fade-in">

        {activeTab === 'account' && (
          <div className="space-y-6">
            <SettingsSection icon={User} title="Account" description={`Signed in to ${instance.name} at ${siteHost}`}>
              {formData.user ? (
                <div className="flex flex-wrap items-center gap-4 rounded-xl border border-border/70 bg-secondary/20 p-4">
                  {avatarUrl && !avatarFailed ? (
                    <img src={avatarUrl} alt="" onError={() => setAvatarFailed(true)} className="h-12 w-12 rounded-xl object-cover ring-1 ring-primary/20" />
                  ) : (
                    <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 ring-1 ring-primary/20">
                      <User size={22} className="text-primary" />
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-semibold text-foreground">{formData.user.name || 'Unknown user'}</p>
                    <p className="truncate text-sm text-muted-foreground">{formData.user.email}</p>
                  </div>
                  <div className="flex shrink-0 gap-2">
                    <button onClick={() => openUrl(`${siteUrl}/dashboard`).catch(() => {})} className={buttonClass}>
                      <ExternalLink size={13} />
                      Dashboard
                    </button>
                    {onLogout && (
                      <button onClick={onLogout} className={`${buttonClass} text-destructive hover:bg-destructive/10`}>
                        <LogOut size={13} />
                        Sign out
                      </button>
                    )}
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-between gap-4 rounded-xl border border-border/70 bg-secondary/20 p-4">
                  <div>
                    <p className="text-sm font-medium text-foreground">Not signed in</p>
                    <p className="text-xs text-muted-foreground">Sign in to upload to your Emberly account</p>
                  </div>
                  {onLogin && (
                    <button onClick={onLogin} className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90">
                      Sign in
                    </button>
                  )}
                </div>
              )}
            </SettingsSection>

            <SettingsSection icon={Shield} title="Upload token" description="The key Flicker uploads with">
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={formData.uploadToken || ''}
                    onChange={(e) => handleChange('uploadToken', e.target.value)}
                    placeholder="Paste an upload token"
                    className={`${fieldClass} w-full pr-10 font-mono`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    title={showPassword ? 'Hide' : 'Show'}
                    className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-muted-foreground transition-colors hover:text-foreground"
                  >
                    {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>
                <button onClick={handleTestConnection} disabled={isTesting || !formData.uploadToken} className={buttonClass}>
                  {isTesting ? <Loader2 size={13} className="animate-spin" /> : <Zap size={13} />}
                  Test upload
                </button>
              </div>
              <p className="mt-2 text-xs text-muted-foreground">
                Browser sign-in creates a key named after this device. You can revoke it from your dashboard at any time.
              </p>
            </SettingsSection>

            {instance.cloud && perks && perks.summary.activePerks > 0 && (
              <SettingsSection icon={Heart} title="Perks" description={`${perks.summary.activePerks} active on your account`}>
                <div className="flex flex-wrap gap-2">
                  {perks.summary.bonuses.storage && <span className="badge">{perks.summary.bonuses.storage} storage</span>}
                  {perks.summary.bonuses.domains && <span className="badge">{perks.summary.bonuses.domains} domains</span>}
                </div>
              </SettingsSection>
            )}
          </div>
        )}

        {activeTab === 'capture' && (
          <div className="space-y-6">
            <SettingsSection icon={Image} title="Screenshots" description="How captures are taken and saved">
              <div className="divide-y divide-border/60">
                <SettingRow title="Format" description={formData.capture?.format === 'jpg' ? 'Smaller files, slight quality loss' : 'Lossless, best for text and UI'}>
                  <Segmented
                    value={formData.capture?.format || 'png'}
                    onChange={v => handleNestedChange('capture', 'format', v)}
                    options={[{ value: 'png', label: 'PNG' }, { value: 'jpg', label: 'JPG' }]}
                  />
                </SettingRow>
                {formData.capture?.format === 'jpg' && (
                  <SettingRow title="JPG quality" description={`${formData.capture?.quality || 90}%`}>
                    <input
                      type="range"
                      min="10"
                      max="100"
                      value={formData.capture?.quality || 90}
                      onChange={(e) => handleNestedChange('capture', 'quality', parseInt(e.target.value))}
                      className="w-40 cursor-pointer accent-primary"
                    />
                  </SettingRow>
                )}
                <SettingRow icon={Clock} title="Delay" description="Wait before taking full-screen captures">
                  <Segmented
                    value={String(formData.capture?.delay || 0)}
                    onChange={v => handleNestedChange('capture', 'delay', parseInt(v))}
                    options={['0', '1', '3', '5', '10'].map(s => ({ value: s, label: s === '0' ? 'Off' : `${s}s` }))}
                  />
                </SettingRow>
                <SettingRow icon={MousePointer} title="Include cursor">
                  <Switch
                    label="Include cursor"
                    checked={formData.capture?.includeCursor ?? true}
                    onChange={v => handleNestedChange('capture', 'includeCursor', v)}
                  />
                </SettingRow>
                <SettingRow
                  icon={HardDrive}
                  title="Keep local copies"
                  description={
                    screenshotsPath ? (
                      <span className="flex min-w-0 items-center gap-1.5">
                        <span className="truncate font-mono">{screenshotsPath}</span>
                        <button onClick={() => revealItemInDir(screenshotsPath).catch(() => {})} className="flex shrink-0 items-center gap-1 text-primary hover:underline">
                          <FolderOpen size={12} />
                          Open
                        </button>
                      </span>
                    ) : (
                      'Otherwise captures are deleted once uploaded'
                    )
                  }
                >
                  <Switch
                    label="Keep local copies"
                    checked={formData.capture?.saveLocally ?? false}
                    onChange={v => handleNestedChange('capture', 'saveLocally', v)}
                  />
                </SettingRow>
              </div>
            </SettingsSection>

            <SettingsSection icon={Upload} title="Uploads" description="What happens when a file reaches Emberly">
              <div className="divide-y divide-border/60">
                <SettingRow title="Visibility" description={formData.visibility === 'PRIVATE' ? 'Only you can open the link' : 'Anyone with the link can view'}>
                  <Segmented
                    value={formData.visibility || 'PUBLIC'}
                    onChange={v => handleChange('visibility', v)}
                    options={[{ value: 'PUBLIC', label: 'Public' }, { value: 'PRIVATE', label: 'Private' }]}
                  />
                </SettingRow>
                <SettingRow title="Password" description="Ask viewers for a password">
                  <input
                    type="password"
                    value={formData.password || ''}
                    onChange={(e) => handleChange('password', e.target.value || undefined)}
                    placeholder="None"
                    className={`${fieldClass} w-52`}
                  />
                </SettingRow>
                {instance.features.customDomains && (
                  <SettingRow
                    title="Domain"
                    description={
                      domainsLoaded && domains && !domains.domains.some(d => d.verified)
                        ? 'Add a custom domain from your dashboard'
                        : 'Where your links point'
                    }
                  >
                    <select
                      value={formData.preferredDomain || ''}
                      onChange={(e) => handleChange('preferredDomain', e.target.value || undefined)}
                      className={`${fieldClass} w-52`}
                    >
                      <option value="">{siteHost}</option>
                      {domains?.domains.filter(d => d.verified).map(d => (
                        <option key={d.id} value={d.domain}>{d.domain}</option>
                      ))}
                    </select>
                  </SettingRow>
                )}
                <SettingRow title="After upload">
                  <Segmented
                    value={formData.behavior?.postUploadAction || 'copy'}
                    onChange={v => handleNestedChange('behavior', 'postUploadAction', v)}
                    options={[{ value: 'copy', label: 'Copy link' }, { value: 'open', label: 'Open' }, { value: 'none', label: 'Nothing' }]}
                  />
                </SettingRow>
                <SettingRow title="Copy as">
                  <Segmented
                    value={formData.behavior?.clipboardFormat || 'url'}
                    onChange={v => handleNestedChange('behavior', 'clipboardFormat', v)}
                    options={[
                      { value: 'url', label: 'Link' },
                      { value: 'raw-url', label: 'Raw' },
                      { value: 'markdown', label: 'Markdown' },
                      { value: 'html', label: 'HTML' },
                    ]}
                  />
                </SettingRow>
                <SettingRow icon={Zap} title="Upload captures automatically" description="Send screenshots to Emberly as soon as they're taken">
                  <Switch label="Upload captures automatically" checked={!!formData.autoUpload} onChange={v => handleChange('autoUpload', v)} />
                </SettingRow>
                <SettingRow icon={Info} title="Notifications" description="Show a notification when an upload finishes">
                  <Switch label="Notifications" checked={!!formData.defaultNotification} onChange={v => handleChange('defaultNotification', v)} />
                </SettingRow>
                <SettingRow icon={Volume2} title="Upload sounds" description="Fine-tune individual sounds in Preferences">
                  <Switch
                    label="Upload sounds"
                    checked={formData.behavior?.playSound ?? true}
                    onChange={v => handleNestedChange('behavior', 'playSound', v)}
                  />
                </SettingRow>
              </div>
            </SettingsSection>

            <SettingsSection icon={Video} title="Recording" description="MP4 screen recordings, up to 10 minutes">
              <div className="divide-y divide-border/60">
                <SettingRow title="Frame rate">
                  <Segmented
                    value={String(formData.video?.fps || 30)}
                    onChange={v => handleNestedChange('video', 'fps', parseInt(v))}
                    options={['15', '30', '60'].map(s => ({ value: s, label: `${s} fps` }))}
                  />
                </SettingRow>
                <SettingRow icon={Volume2} title="System audio">
                  <Switch
                    label="System audio"
                    checked={formData.video?.includeSystemAudio ?? true}
                    onChange={v => handleNestedChange('video', 'includeSystemAudio', v)}
                  />
                </SettingRow>
                <SettingRow icon={Mic} title="Microphone">
                  <Switch label="Microphone" checked={formData.video?.includeMic ?? false} onChange={v => handleNestedChange('video', 'includeMic', v)} />
                </SettingRow>
                <SettingRow icon={MousePointer} title="Highlight clicks">
                  <Switch label="Highlight clicks" checked={formData.video?.showClicks ?? false} onChange={v => handleNestedChange('video', 'showClicks', v)} />
                </SettingRow>
                <SettingRow icon={Upload} title="Upload when finished">
                  <Switch label="Upload when finished" checked={formData.video?.autoUpload ?? true} onChange={v => handleNestedChange('video', 'autoUpload', v)} />
                </SettingRow>
              </div>
            </SettingsSection>

            {isMac && (
              <SettingsSection
                icon={Shield}
                title="Permissions"
                description="macOS needs these for capture and shortcuts"
                action={
                  <button onClick={handleCheckPermission} disabled={checkingPermission} className={buttonClass}>
                    <RefreshCw size={13} className={checkingPermission ? 'animate-spin' : ''} />
                    Re-check
                  </button>
                }
              >
                <div className="divide-y divide-border/60">
                  <SettingRow title="Screen Recording" description="System Settings → Privacy & Security → Screen Recording">
                    <PermissionBadge granted={screenPermission} />
                  </SettingRow>
                  <SettingRow title="Accessibility" description="Lets shortcuts work while Flicker is hidden">
                    <div className="flex items-center gap-3">
                      <PermissionBadge granted={accessibilityPermission} />
                      {accessibilityPermission === false && (
                        <button onClick={handleRequestAccessibility} disabled={checkingPermission} className={buttonClass}>
                          Open settings
                        </button>
                      )}
                    </div>
                  </SettingRow>
                  <SettingRow title="Run in background" description="Stay in the menu bar after the window closes">
                    <div className="flex items-center gap-3">
                      <PermissionBadge granted={backgroundPermission} on="Enabled" off="Off" />
                      {backgroundPermission === false && (
                        <button onClick={handleEnableBackground} disabled={checkingBackground} className={buttonClass}>
                          {checkingBackground && <Loader2 size={13} className="animate-spin" />}
                          Enable
                        </button>
                      )}
                    </div>
                  </SettingRow>
                </div>
              </SettingsSection>
            )}
          </div>
        )}

        {activeTab === 'hotkeys' && (
          <div className="space-y-6">
            <SettingsSection icon={Keyboard} title="Shortcuts" description="Click one and press the keys you want. They work while Flicker is in the background.">
              <div className="divide-y divide-border/60">
                {([
                  { key: 'screenshotRegion', title: 'Capture region', description: 'Drag an area, or click a window', icon: Crosshair },
                  { key: 'screenshotFullscreen', title: 'Capture screen', description: 'The screen your cursor is on', icon: Monitor },
                  { key: 'screenshotAllMonitors', title: 'Capture all screens', description: 'Every monitor in one image', icon: Layers },
                  { key: 'recordVideo', title: 'Record video', description: 'Press again to stop', icon: Video },
                  { key: 'uploadClipboard', title: 'Upload clipboard', description: 'Upload a copied image or file', icon: ClipboardPaste },
                  { key: 'openApp', title: 'Open Flicker', description: 'Show the window, or hide it if it’s in front', icon: AppWindow },
                ] as const).map(h => (
                  <div key={h.key}>
                    <SettingRow icon={h.icon} title={h.title} description={h.description}>
                      <div className="w-60">
                        <HotkeyInput
                          value={formData.hotkeys?.[h.key] || ''}
                          onChange={(value) => handleHotkeyChange(h.key, value)}
                          placeholder="Not set"
                        />
                      </div>
                    </SettingRow>
                    {hotkeyIssue(h.key) && (
                      <div className="-mt-2 pb-3 pl-7">
                        <HotkeyWarning reason={hotkeyIssue(h.key)} />
                      </div>
                    )}
                  </div>
                ))}
              </div>
              <div className="mt-3 flex justify-end">
                <button
                  onClick={() => setFormData(prev => ({ ...prev, hotkeys: { ...DEFAULT_HOTKEYS } }))}
                  className={buttonClass}
                >
                  <RotateCcw size={13} />
                  Reset to defaults
                </button>
              </div>
            </SettingsSection>
          </div>
        )}

        {activeTab === 'preferences' && (
          <div className="space-y-6">

            <SettingsSection icon={Palette} title="Theme" description="Ember matches embrly.ca; the rest are just for fun">
              <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 xl:grid-cols-4">
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

            <SettingsSection icon={FileText} title="Display" description="Text, shape and effects">
              <div className="divide-y divide-border/60">
                <SettingRow title="Font" description="Used throughout Flicker">
                  <Segmented
                    value={formData.appearance?.fontFamily || 'inter'}
                    onChange={v => handleNestedChange('appearance', 'fontFamily', v)}
                    options={[
                      { value: 'inter', label: 'Inter', style: { fontFamily: 'Inter' } },
                      { value: 'system', label: 'System', style: { fontFamily: 'system-ui' } },
                      { value: 'roboto', label: 'Roboto', style: { fontFamily: 'Roboto' } },
                      { value: 'poppins', label: 'Poppins', style: { fontFamily: 'Poppins' } },
                      { value: 'mono', label: 'Mono', style: { fontFamily: 'JetBrains Mono, monospace' } },
                    ]}
                  />
                </SettingRow>
                <SettingRow title="Text size">
                  <Segmented
                    value={formData.appearance?.fontScale || 'medium'}
                    onChange={v => handleNestedChange('appearance', 'fontScale', v)}
                    options={[
                      { value: 'small', label: <span className="text-[10px]">A</span>, title: 'Small' },
                      { value: 'medium', label: <span className="text-xs">A</span>, title: 'Medium' },
                      { value: 'large', label: <span className="text-sm">A</span>, title: 'Large' },
                    ]}
                  />
                </SettingRow>
                <SettingRow title="Corners" description="How rounded cards and buttons are">
                  <Segmented
                    value={formData.appearance?.borderRadius || 'large'}
                    onChange={v => handleNestedChange('appearance', 'borderRadius', v)}
                    options={[
                      { value: 'none', label: <CornerIcon radius={0} />, title: 'Square' },
                      { value: 'small', label: <CornerIcon radius={2} />, title: 'Small' },
                      { value: 'medium', label: <CornerIcon radius={4} />, title: 'Medium' },
                      { value: 'large', label: <CornerIcon radius={7} />, title: 'Large' },
                    ]}
                  />
                </SettingRow>
                <SettingRow icon={Zap} title="Animations" description="Transitions and motion effects">
                  <Switch
                    label="Animations"
                    checked={formData.appearance?.animations ?? true}
                    onChange={v => handleNestedChange('appearance', 'animations', v)}
                  />
                </SettingRow>
                <SettingRow icon={Moon} title="Glass surfaces" description="Translucent, blurred panels">
                  <Switch
                    label="Glass surfaces"
                    checked={formData.appearance?.glassEffect ?? true}
                    onChange={v => handleNestedChange('appearance', 'glassEffect', v)}
                  />
                </SettingRow>
                <SettingRow icon={Monitor} title="Compact layout" description="Tighter spacing to fit more on screen">
                  <Switch
                    label="Compact layout"
                    checked={formData.appearance?.compactMode ?? false}
                    onChange={v => handleNestedChange('appearance', 'compactMode', v)}
                  />
                </SettingRow>
              </div>
            </SettingsSection>

            <SettingsSection icon={AppWindow} title="Window" description="What closing the Flicker window does">
              <div className="divide-y divide-border/60">
                <SettingRow
                  title="When you close the window"
                  description={
                    (formData.behavior?.closeAction ?? 'tray') === 'tray'
                      ? `Flicker keeps running in the ${isMac ? 'menu bar' : 'system tray'}, so shortcuts still work.`
                      : (formData.behavior?.closeAction === 'minimize'
                        ? `Flicker stays in the ${isMac ? 'Dock' : 'taskbar'}, so shortcuts still work.`
                        : 'Flicker quits, and shortcuts stop working until you open it again.')
                  }
                >
                  <Segmented
                    value={formData.behavior?.closeAction ?? 'tray'}
                    onChange={v => handleNestedChange('behavior', 'closeAction', v)}
                    options={[
                      { value: 'tray', label: isMac ? 'Menu bar' : 'Tray' },
                      { value: 'minimize', label: isMac ? 'Dock' : 'Taskbar' },
                      { value: 'quit', label: 'Quit' },
                    ]}
                  />
                </SettingRow>
              </div>
            </SettingsSection>

            {soundsLoaded && (
              <SettingsSection icon={Volume2} title="Sounds" description="Audio feedback for what Flicker does">
                <div className="divide-y divide-border/60">
                  <SettingRow title="Play sounds">
                    <Switch label="Play sounds" checked={soundPrefs.enabled} onChange={v => savePreferences({ enabled: v })} />
                  </SettingRow>
                  {([
                    { key: 'uploadSuccess', label: 'Upload complete', description: 'A warm chime when a link is ready', icon: Check },
                    { key: 'capture', label: 'Capture', description: 'A shutter click when you take a screenshot', icon: Camera },
                    { key: 'copyLink', label: 'Copy link', description: 'A short pop when a link is copied', icon: Copy },
                    { key: 'uploadError', label: 'Error', description: 'A soft low tone when something fails', icon: AlertTriangle },
                    { key: 'settingsSave', label: 'Settings saved', description: 'A single tick', icon: Save },
                    { key: 'notification', label: 'Notifications', description: 'A gentle ping', icon: Info },
                  ] as const).map(sound => (
                    <div key={sound.key} className={soundPrefs.enabled ? '' : 'pointer-events-none opacity-40'}>
                      <SettingRow icon={sound.icon} title={sound.label} description={sound.description}>
                        <div className="flex items-center gap-3">
                          <button
                            onClick={() => playSound(sound.key, { force: true })}
                            title="Preview"
                            className="flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
                          >
                            <Play size={13} />
                          </button>
                          <Switch
                            label={sound.label}
                            checked={soundPrefs[sound.key]}
                            onChange={v => savePreferences({ [sound.key]: v })}
                          />
                        </div>
                      </SettingRow>
                    </div>
                  ))}
                </div>
              </SettingsSection>
            )}
          </div>
        )}

        {activeTab === 'application' && (
          <div className="space-y-6">
            <div className="flex items-center gap-4">
              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-primary/10 ring-1 ring-primary/20">
                <Logo size={34} />
              </div>
              <div className="min-w-0">
                <h2 className="text-lg font-semibold text-foreground">
                  {APP_NAME} <span className="text-sm font-normal text-muted-foreground">v{APP_VERSION}</span>
                </h2>
                <p className="text-xs text-muted-foreground">Screenshots, recordings and uploads for Emberly.</p>
              </div>
            </div>

            <SettingsSection icon={Download} title="Updates" description="Flicker checks for new versions when it starts">
              {updateInfo?.available ? (
                <div className="space-y-3 rounded-xl border border-primary/30 bg-primary/5 p-4">
                  <div>
                    <p className="text-sm font-medium text-foreground">Flicker v{updateInfo.version} is available</p>
                    <p className="text-xs text-muted-foreground">You're on v{APP_VERSION}</p>
                  </div>
                  {updateInfo.notes && <p className="line-clamp-3 whitespace-pre-line text-xs text-muted-foreground">{updateInfo.notes}</p>}
                  {updateInfo.downloading ? (
                    <div className="space-y-1.5">
                      <div className="h-1.5 overflow-hidden rounded-full bg-secondary">
                        <div className="h-full rounded-full bg-primary transition-[width] duration-300" style={{ width: `${updateInfo.progress || 0}%` }} />
                      </div>
                      <p className="text-xs text-muted-foreground">Downloading… {updateInfo.progress || 0}%</p>
                    </div>
                  ) : (
                    <button
                      onClick={onDownloadUpdate}
                      className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
                    >
                      <Download size={14} />
                      {updateInfo.canInstall ? 'Install and restart' : 'Download from GitHub'}
                    </button>
                  )}
                </div>
              ) : (
                <SettingRow
                  title={
                    checkingForUpdates
                      ? 'Checking for updates…'
                      : updateInfo.error
                        ? "Couldn't check for updates"
                        : updateInfo.checked
                          ? "You're up to date"
                          : 'Check for a newer version'
                  }
                  description={updateInfo.error || `Version ${APP_VERSION}`}
                >
                  <button onClick={onCheckForUpdates} disabled={checkingForUpdates} className={buttonClass}>
                    <RefreshCw size={13} className={checkingForUpdates ? 'animate-spin' : ''} />
                    Check now
                  </button>
                </SettingRow>
              )}
            </SettingsSection>

            <SettingsSection icon={Bug} title="Diagnostics" description="Handy when reporting a problem">
              <div className="divide-y divide-border/60">
                <details className="group">
                  <summary className={summaryClass}>
                    <span className="flex items-center gap-3"><Monitor size={16} className="text-muted-foreground" />Device information</span>
                    <ChevronDown size={15} className="text-muted-foreground transition-transform group-open:rotate-180" />
                  </summary>
                  <div className="pb-3">
                    <DeviceInfoPanel />
                  </div>
                </details>
                <details className="group">
                  <summary className={summaryClass}>
                    <span className="flex items-center gap-3"><FileText size={16} className="text-muted-foreground" />Activity log</span>
                    <ChevronDown size={15} className="text-muted-foreground transition-transform group-open:rotate-180" />
                  </summary>
                  <div className="pb-3">
                    <AuditLogPanel initialLimit={100} />
                  </div>
                </details>
                <details className="group" onToggle={(e) => setConsoleOpen((e.currentTarget as HTMLDetailsElement).open)}>
                  <summary className={summaryClass}>
                    <span className="flex items-center gap-3"><Bug size={16} className="text-muted-foreground" />Console</span>
                    <span className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground">{debugLogs.length} lines</span>
                      <ChevronDown size={15} className="text-muted-foreground transition-transform group-open:rotate-180" />
                    </span>
                  </summary>
                  <div className="space-y-2 pb-3">
                    <div className="flex justify-end gap-1">
                      <button onClick={() => navigator.clipboard.writeText(debugLogs.join('\n'))} title="Copy" className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground">
                        <Copy size={14} />
                      </button>
                      <button onClick={clearDebugLogs} title="Clear" className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground">
                        <Trash2 size={14} />
                      </button>
                    </div>
                    <div className="max-h-56 min-h-20 overflow-auto rounded-lg border border-border/60 bg-black/30 p-2 font-mono text-[11px]">
                      {debugLogs.length > 0 ? (
                        debugLogs.map((log, i) => (
                          <div
                            key={i}
                            className={`whitespace-pre-wrap break-all py-0.5 ${/ ERROR /.test(log) ? 'text-red-400' : / WARN /.test(log) ? 'text-amber-400' : 'text-muted-foreground'}`}
                          >
                            {log}
                          </div>
                        ))
                      ) : (
                        <p className="py-8 text-center text-muted-foreground/60">Nothing logged yet</p>
                      )}
                    </div>
                  </div>
                </details>
              </div>
            </SettingsSection>

            <SettingsSection icon={Globe} title="Links">
              <div className="divide-y divide-border/60">
                {[
                  { label: 'Emberly', description: siteHost, url: siteUrl, icon: Globe },
                  { label: 'Documentation', description: 'docs.embrly.ca', url: 'https://docs.embrly.ca', icon: FileText },
                  { label: 'Source code', description: 'github.com/EmberlyOSS/Flicker', url: 'https://github.com/EmberlyOSS/Flicker', icon: Github },
                  { label: 'Discord', description: 'Get help and share feedback', url: 'https://embrly.ca/discord', icon: Heart },
                ].map(link => (
                  <button
                    key={link.label}
                    onClick={() => openUrl(link.url).catch(() => {})}
                    className="group flex w-full items-center justify-between gap-3 py-3 text-left"
                  >
                    <span className="flex min-w-0 items-center gap-3">
                      <link.icon size={16} className="shrink-0 text-muted-foreground" />
                      <span className="min-w-0">
                        <span className="block text-sm font-medium text-foreground">{link.label}</span>
                        <span className="block truncate text-xs text-muted-foreground">{link.description}</span>
                      </span>
                    </span>
                    <ExternalLink size={14} className="shrink-0 text-muted-foreground transition-colors group-hover:text-foreground" />
                  </button>
                ))}
              </div>
            </SettingsSection>

            <p className="text-center text-xs text-muted-foreground/70">Made by the Emberly team · © {new Date().getFullYear()}</p>
          </div>
        )}
      </div>

      {activeTab !== 'application' && activeTab !== 'preferences' && (isDirty || saveSuccess) && (
        <div className="sticky bottom-0 flex justify-end px-4 pt-4 pb-2 -mx-4 bg-gradient-to-t from-background via-background to-transparent">
          <button
            onClick={handleSave}
            className={`px-5 py-2.5 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 ${saveSuccess
              ? 'bg-emerald-500 text-white'
              : 'bg-primary text-primary-foreground hover:bg-primary/90'
              }`}
          >
            {saveSuccess ? (
              <>
                <Check size={16} />
                Saved
              </>
            ) : (
              <>
                <Save size={16} />
                Save Changes
              </>
            )}
          </button>
        </div>
      )}

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
