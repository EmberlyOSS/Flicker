import { useState, useEffect } from 'react'
import { AppConfig, HotkeyConfig } from '../types'
import { Settings as SettingsIcon, Save, Eye, EyeOff, X, User, LogOut, Palette, Cog, Keyboard, AlertTriangle } from 'lucide-react'
import { useTheme } from '../hooks/useTheme'
import { DEFAULT_HOTKEYS } from '../config'
import { HotkeyInput } from './HotkeyInput'

interface SettingsProps {
  config: AppConfig
  onSave: (config: AppConfig) => void
  isOpen: boolean
  onClose: () => void
  onLogout?: () => void
  onLogin?: () => void
}

export function Settings({ config, onSave, isOpen, onClose, onLogout, onLogin }: SettingsProps) {
  const [formData, setFormData] = useState(config)
  const [showPassword, setShowPassword] = useState(false)
  const [activeTab, setActiveTab] = useState<'account' | 'config' | 'hotkeys' | 'theme'>('account')
  const { currentTheme, switchTheme, presets } = useTheme()

  // Sync formData when config changes
  useEffect(() => {
    setFormData(config)
  }, [config])

  const handleChange = (
    field: keyof AppConfig,
    value: any
  ) => {
    setFormData(prev => ({ ...prev, [field]: value }))
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

  const handleSave = () => {
    onSave(formData)
    onClose()
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="glass-card max-w-lg w-full max-h-[90vh] overflow-y-auto space-y-0">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-border">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-lg">
              <SettingsIcon className="text-primary" size={24} />
            </div>
            <h2 className="text-2xl font-bold">Settings</h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-secondary/20 rounded-lg transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex gap-0 border-b border-border px-6 pt-4">
          <button
            onClick={() => setActiveTab('account')}
            className={`flex items-center gap-1.5 px-4 py-2 font-medium text-sm transition-colors border-b-2 ${
              activeTab === 'account'
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            <User size={14} />
            Account
          </button>
          <button
            onClick={() => setActiveTab('config')}
            className={`flex items-center gap-1.5 px-4 py-2 font-medium text-sm transition-colors border-b-2 ${
              activeTab === 'config'
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            <Cog size={14} />
            Upload
          </button>
          <button
            onClick={() => setActiveTab('hotkeys')}
            className={`flex items-center gap-1.5 px-4 py-2 font-medium text-sm transition-colors border-b-2 ${
              activeTab === 'hotkeys'
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            <Keyboard size={14} />
            Hotkeys
          </button>
          <button
            onClick={() => setActiveTab('theme')}
            className={`flex items-center gap-1.5 px-4 py-2 font-medium text-sm transition-colors border-b-2 ${
              activeTab === 'theme'
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            <Palette size={14} />
            Theme
          </button>
        </div>

        {/* Tab Content */}
        <div className="p-6 space-y-4">
          {/* Account Tab */}
          {activeTab === 'account' && (
            <div className="space-y-4">
              {config.user ? (
                <>
                  <div className="flex items-center gap-4 p-4 rounded-lg bg-secondary/20 border border-border">
                    <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center border border-primary/20">
                      {config.user.image ? (
                        <img 
                          src={config.user.image} 
                          alt={config.user.name || 'User'} 
                          className="w-full h-full rounded-full object-cover"
                        />
                      ) : (
                        <User size={24} className="text-primary" />
                      )}
                    </div>
                    <div className="flex-1">
                      <p className="font-semibold text-foreground">{config.user.name || 'Unknown User'}</p>
                      <p className="text-sm text-muted-foreground">{config.user.email}</p>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-foreground">Your Upload Token</label>
                    <div className="flex gap-2">
                      <input
                        type={showPassword ? 'text' : 'password'}
                        value={config.uploadToken}
                        readOnly
                        className="flex-1 px-4 py-2 bg-background/50 border border-input rounded-lg text-sm text-muted-foreground"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="px-3 py-2 bg-secondary/30 border border-border rounded-lg text-muted-foreground hover:text-foreground transition-colors"
                      >
                        {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      This token is used to authenticate your uploads.
                    </p>
                  </div>

                  <button
                    onClick={() => {
                      onLogout?.()
                      onClose()
                    }}
                    className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-destructive/10 text-destructive hover:bg-destructive/20 border border-destructive/20 rounded-lg font-medium transition-colors"
                  >
                    <LogOut size={18} />
                    Sign Out
                  </button>
                </>
              ) : (
                <div className="text-center py-8 space-y-4">
                  <div className="w-16 h-16 mx-auto rounded-full bg-primary/10 flex items-center justify-center border border-primary/20">
                    <User size={32} className="text-primary" />
                  </div>
                  <div>
                    <p className="font-semibold text-foreground">Not signed in</p>
                    <p className="text-sm text-muted-foreground">
                      Sign in to your Emberly account to sync your settings
                    </p>
                  </div>
                  <button
                    onClick={() => {
                      onLogin?.()
                      onClose()
                    }}
                    className="px-6 py-2.5 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90 transition-colors"
                  >
                    Sign In
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Configuration Tab */}
          {activeTab === 'config' && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">Upload Token</label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={formData.uploadToken}
                    onChange={e => handleChange('uploadToken', e.target.value)}
                    placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
                    className="w-full px-4 py-2 bg-background border border-input rounded-lg text-sm text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 transition-colors pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  Get from your Emberly profile (Settings → Tools → Upload Token)
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-2">Default Visibility</label>
                <select
                  value={formData.visibility}
                  onChange={e => handleChange('visibility', e.target.value as 'PUBLIC' | 'PRIVATE')}
                  className="w-full px-4 py-2 bg-background border border-input rounded-lg text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 transition-colors"
                >
                  <option value="PUBLIC">Public</option>
                  <option value="PRIVATE">Private</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-2">Password Protection (Optional)</label>
                <input
                  type="password"
                  value={formData.password || ''}
                  onChange={e => handleChange('password', e.target.value || undefined)}
                  placeholder="Leave empty for no password"
                  className="w-full px-4 py-2 bg-background border border-input rounded-lg text-sm text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 transition-colors"
                />
              </div>

              <div className="space-y-3 pt-2">
                <label className="flex items-center gap-3 cursor-pointer group">
                  <input
                    type="checkbox"
                    checked={formData.autoUpload}
                    onChange={e => handleChange('autoUpload', e.target.checked)}
                    className="w-4 h-4 rounded accent-primary"
                  />
                  <span className="text-sm text-foreground group-hover:text-primary transition-colors">Auto-upload after capture</span>
                </label>
                <label className="flex items-center gap-3 cursor-pointer group">
                  <input
                    type="checkbox"
                    checked={formData.defaultNotification}
                    onChange={e => handleChange('defaultNotification', e.target.checked)}
                    className="w-4 h-4 rounded accent-primary"
                  />
                  <span className="text-sm text-foreground group-hover:text-primary transition-colors">Show notifications on upload</span>
                </label>
              </div>
            </div>
          )}

          {/* Hotkeys Tab */}
          {activeTab === 'hotkeys' && (
            <div className="space-y-5">
              <div className="p-3 rounded-lg bg-primary/10 border border-primary/20">
                <p className="text-sm text-primary font-medium mb-1">🎯 Global Hotkeys</p>
                <p className="text-xs text-muted-foreground">
                  These shortcuts work system-wide, even when Flicker is minimized. 
                  Click any field and press your desired key combination.
                </p>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  📸 Fullscreen Screenshot
                </label>
                <HotkeyInput
                  value={formData.hotkeys?.screenshotFullscreen || ''}
                  onChange={(value) => handleHotkeyChange('screenshotFullscreen', value)}
                  placeholder="Click to set hotkey"
                />
                <p className="text-xs text-muted-foreground mt-1.5">
                  Captures entire screen and uploads automatically
                </p>
              </div>

              <div className="opacity-60">
                <label className="block text-sm font-medium text-foreground mb-2">
                  ✂️ Region Screenshot
                  <span className="ml-2 text-xs text-muted-foreground">(Coming soon)</span>
                </label>
                <HotkeyInput
                  value={formData.hotkeys?.screenshotRegion || ''}
                  onChange={(value) => handleHotkeyChange('screenshotRegion', value)}
                  placeholder="Click to set hotkey"
                  disabled
                />
                <p className="text-xs text-muted-foreground mt-1.5">
                  Select a region of your screen to capture
                </p>
              </div>

              <div className="opacity-60">
                <label className="block text-sm font-medium text-foreground mb-2">
                  📋 Upload from Clipboard
                  <span className="ml-2 text-xs text-muted-foreground">(Coming soon)</span>
                </label>
                <HotkeyInput
                  value={formData.hotkeys?.uploadClipboard || ''}
                  onChange={(value) => handleHotkeyChange('uploadClipboard', value)}
                  placeholder="Click to set hotkey"
                  disabled
                />
                <p className="text-xs text-muted-foreground mt-1.5">
                  Upload image currently in your clipboard
                </p>
              </div>

              <div className="flex items-start gap-2 p-3 rounded-lg bg-amber-500/10 border border-amber-500/20">
                <AlertTriangle size={16} className="text-amber-500 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-sm text-amber-400 font-medium">Note</p>
                  <p className="text-xs text-muted-foreground">
                    Some key combinations may be reserved by Windows or other apps. 
                    If a hotkey doesn't work, try a different combination.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Theme Tab */}
          {activeTab === 'theme' && (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">Choose a theme to customize the app's appearance</p>
              <div className="grid grid-cols-1 gap-2">
                {presets.map((preset) => (
                  <button
                    key={preset.name}
                    onClick={() => switchTheme(preset.name)}
                    className={`p-3 rounded-lg text-left transition-all duration-200 ${
                      currentTheme === preset.name
                        ? 'bg-primary/20 border border-primary text-primary'
                        : 'bg-secondary/10 border border-border text-foreground hover:bg-secondary/20'
                    }`}
                  >
                    <p className="font-medium text-sm">{preset.name}</p>
                    <p className="text-xs text-muted-foreground">{preset.description}</p>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex gap-3 p-6 border-t border-border">
          <button
            onClick={handleSave}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-primary text-primary-foreground hover:bg-primary/90 rounded-lg transition-all duration-200 font-medium"
          >
            <Save size={18} />
            Save Settings
          </button>
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2 bg-secondary/20 text-secondary-foreground hover:bg-secondary/30 border border-border rounded-lg transition-all duration-200 font-medium"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  )
}
