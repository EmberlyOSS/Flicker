import { useState, useEffect } from 'react'
import { AppConfig, HotkeyConfig } from '../types'
import { 
  Save, Eye, EyeOff, User, LogOut, Palette, Cog, Keyboard, 
  AlertTriangle, Info, Github, Heart, ExternalLink, Check,
  Monitor, Bell, Lock, Upload, Globe
} from 'lucide-react'
import { useTheme, ThemePreset } from '../hooks/useTheme'
import { DEFAULT_HOTKEYS } from '../config'
import { HotkeyInput } from './HotkeyInput'
import { APP_NAME, APP_VERSION } from '../constants'

interface SettingsPageProps {
  config: AppConfig
  onSave: (config: AppConfig) => void
  onLogout?: () => void
  onLogin?: () => void
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
      className={`group relative p-4 rounded-xl border-2 transition-all duration-300 text-left overflow-hidden ${
        isActive
          ? 'border-primary bg-primary/10 shadow-lg shadow-primary/20'
          : 'border-border/50 hover:border-primary/40 hover:bg-secondary/30'
      }`}
    >
      {/* Selection indicator */}
      {isActive && (
        <div className="absolute top-2 right-2 w-5 h-5 rounded-full bg-primary flex items-center justify-center">
          <Check size={12} className="text-primary-foreground" />
        </div>
      )}
      
      {/* Color swatches */}
      <div className="flex gap-1.5 mb-3">
        <div 
          className="w-6 h-6 rounded-full border border-white/20 shadow-sm"
          style={{ backgroundColor: preset.primary }}
          title="Primary"
        />
        <div 
          className="w-6 h-6 rounded-full border border-white/20 shadow-sm"
          style={{ backgroundColor: preset.secondary }}
          title="Secondary"
        />
        <div 
          className="w-6 h-6 rounded-full border border-white/20 shadow-sm"
          style={{ backgroundColor: preset.background }}
          title="Background"
        />
      </div>
      
      {/* Theme name */}
      <p className="font-medium text-sm text-foreground truncate">{preset.label}</p>
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
        <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center border border-primary/20">
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

export function SettingsPage({ config, onSave, onLogout, onLogin }: SettingsPageProps) {
  const [formData, setFormData] = useState(config)
  const [showPassword, setShowPassword] = useState(false)
  const [activeTab, setActiveTab] = useState<'account' | 'upload' | 'hotkeys' | 'appearance' | 'about'>('account')
  const [saveSuccess, setSaveSuccess] = useState(false)
  const { currentTheme, switchTheme, presets } = useTheme()

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
    setSaveSuccess(true)
  }

  const tabs = [
    { id: 'account' as const, label: 'Account', icon: User },
    { id: 'upload' as const, label: 'Upload', icon: Upload },
    { id: 'hotkeys' as const, label: 'Hotkeys', icon: Keyboard },
    { id: 'appearance' as const, label: 'Appearance', icon: Palette },
    { id: 'about' as const, label: 'About', icon: Info },
  ]

  return (
    <div className="space-y-6">
      {/* Tabs */}
      <div className="flex gap-1 overflow-x-auto pb-1 -mx-3 px-3 lg:mx-0 lg:px-0 scrollbar-none">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-medium text-sm transition-all duration-300 whitespace-nowrap ${
              activeTab === tab.id
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
      <div className="glass-card p-4 lg:p-6 space-y-6 animate-fade-in">
        {/* Account Tab */}
        {activeTab === 'account' && (
          <div className="space-y-6">
            <SettingsSection icon={User} title="Account" description="Manage your Emberly account">
              {formData.user ? (
                <div className="glass-card p-4 space-y-3">
                  <div className="flex items-center gap-4">
                    {formData.user.image ? (
                      <img 
                        src={formData.user.image} 
                        alt={formData.user.name || ''} 
                        className="w-14 h-14 rounded-xl object-cover border-2 border-primary/30"
                      />
                    ) : (
                      <div className="w-14 h-14 rounded-xl bg-primary/20 flex items-center justify-center border-2 border-primary/30">
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
                <div className="glass-card p-6 text-center space-y-4">
                  <div className="w-16 h-16 rounded-xl bg-primary/20 flex items-center justify-center border-2 border-primary/30 mx-auto">
                    <User size={28} className="text-primary" />
                  </div>
                  <div>
                    <p className="font-medium text-foreground">Not signed in</p>
                    <p className="text-sm text-muted-foreground mt-1">Sign in to sync your settings</p>
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

            <SettingsSection icon={Lock} title="API Token" description="Your upload authentication token">
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={formData.token || ''}
                  onChange={(e) => handleChange('token', e.target.value)}
                  placeholder="Enter your API token"
                  className="w-full px-4 py-3 pr-12 bg-secondary/50 border border-border/50 rounded-xl text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary/50 transition-all font-mono text-sm"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors p-1"
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </SettingsSection>
          </div>
        )}

        {/* Upload Tab */}
        {activeTab === 'upload' && (
          <div className="space-y-6">
            <SettingsSection icon={Globe} title="Default Visibility" description="Who can see your uploads">
              <div className="grid grid-cols-3 gap-2">
                {(['PUBLIC', 'UNLISTED', 'PRIVATE'] as const).map(vis => (
                  <button
                    key={vis}
                    onClick={() => handleChange('visibility', vis)}
                    className={`px-4 py-3 rounded-xl font-medium text-sm transition-all duration-200 ${
                      formData.visibility === vis
                        ? 'bg-primary text-primary-foreground shadow-lg'
                        : 'bg-secondary/50 text-muted-foreground hover:text-foreground hover:bg-secondary'
                    }`}
                  >
                    {vis.charAt(0) + vis.slice(1).toLowerCase()}
                  </button>
                ))}
              </div>
            </SettingsSection>

            <SettingsSection icon={Lock} title="Password Protection" description="Optional password for uploads">
              <input
                type="password"
                value={formData.password || ''}
                onChange={(e) => handleChange('password', e.target.value || undefined)}
                placeholder="Leave blank for no password"
                className="w-full px-4 py-3 bg-secondary/50 border border-border/50 rounded-xl text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary/50 transition-all"
              />
            </SettingsSection>

            <SettingsSection icon={Bell} title="Behavior" description="Upload and notification settings">
              <div className="space-y-3">
                <label className="flex items-center justify-between p-4 rounded-xl bg-secondary/30 hover:bg-secondary/50 cursor-pointer transition-colors">
                  <div className="flex items-center gap-3">
                    <Upload size={18} className="text-muted-foreground" />
                    <span className="text-sm font-medium text-foreground">Auto-upload after capture</span>
                  </div>
                  <input
                    type="checkbox"
                    checked={formData.autoUpload}
                    onChange={(e) => handleChange('autoUpload', e.target.checked)}
                    className="w-5 h-5 rounded-lg border-border accent-primary"
                  />
                </label>

                <label className="flex items-center justify-between p-4 rounded-xl bg-secondary/30 hover:bg-secondary/50 cursor-pointer transition-colors">
                  <div className="flex items-center gap-3">
                    <Bell size={18} className="text-muted-foreground" />
                    <span className="text-sm font-medium text-foreground">Show notifications</span>
                  </div>
                  <input
                    type="checkbox"
                    checked={formData.defaultNotification}
                    onChange={(e) => handleChange('defaultNotification', e.target.checked)}
                    className="w-5 h-5 rounded-lg border-border accent-primary"
                  />
                </label>
              </div>
            </SettingsSection>
          </div>
        )}

        {/* Hotkeys Tab */}
        {activeTab === 'hotkeys' && (
          <div className="space-y-6">
            <div className="p-4 rounded-xl bg-primary/10 border border-primary/20 flex items-start gap-3">
              <AlertTriangle size={18} className="text-primary flex-shrink-0 mt-0.5" />
              <p className="text-sm text-foreground/80">
                Click the input field and press your desired key combination. Use Ctrl, Shift, Alt with letters or PrintScreen.
              </p>
            </div>

            <SettingsSection icon={Monitor} title="Screenshot Hotkeys" description="Customize capture shortcuts">
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-muted-foreground block mb-2">
                    Fullscreen Screenshot
                  </label>
                  <HotkeyInput
                    value={formData.hotkeys?.screenshotFullscreen || ''}
                    onChange={(value) => handleHotkeyChange('screenshotFullscreen', value)}
                    placeholder="e.g., Control+Shift+S"
                  />
                </div>

                <div>
                  <label className="text-sm font-medium text-muted-foreground block mb-2">
                    All Monitors Screenshot
                  </label>
                  <HotkeyInput
                    value={formData.hotkeys?.screenshotAllMonitors || ''}
                    onChange={(value) => handleHotkeyChange('screenshotAllMonitors', value)}
                    placeholder="e.g., Control+Shift+A"
                  />
                </div>

                <div className="opacity-50">
                  <label className="text-sm font-medium text-muted-foreground block mb-2">
                    Region Screenshot <span className="text-xs">(Coming soon)</span>
                  </label>
                  <HotkeyInput
                    value={formData.hotkeys?.screenshotRegion || ''}
                    onChange={(value) => handleHotkeyChange('screenshotRegion', value)}
                    placeholder="Not yet implemented"
                    disabled
                  />
                </div>
              </div>
            </SettingsSection>
          </div>
        )}

        {/* Appearance Tab */}
        {activeTab === 'appearance' && (
          <div className="space-y-6">
            <SettingsSection icon={Palette} title="Theme" description="Choose your preferred color scheme">
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
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

            <div className="p-4 rounded-xl bg-secondary/30 flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-foreground">Current Theme</p>
                <p className="text-xs text-muted-foreground mt-0.5">{currentTheme}</p>
              </div>
              <div className="flex gap-1.5">
                {(() => {
                  const currentPreset = presets.find(p => p.name === currentTheme)
                  return currentPreset ? (
                    <>
                      <div 
                        className="w-8 h-8 rounded-lg border border-white/20"
                        style={{ backgroundColor: currentPreset.primary }}
                      />
                      <div 
                        className="w-8 h-8 rounded-lg border border-white/20"
                        style={{ backgroundColor: currentPreset.secondary }}
                      />
                    </>
                  ) : null
                })()}
              </div>
            </div>
          </div>
        )}

        {/* About Tab */}
        {activeTab === 'about' && (
          <div className="space-y-6">
            {/* App Info */}
            <div className="text-center py-6">
              <div className="w-20 h-20 mx-auto rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center border border-primary/30 mb-4">
                <span className="text-3xl font-bold text-primary">F</span>
              </div>
              <h2 className="text-2xl font-bold text-foreground">{APP_NAME}</h2>
              <p className="text-muted-foreground mt-1">Version {APP_VERSION}</p>
            </div>

            {/* Description */}
            <div className="glass-card p-4 text-center">
              <p className="text-sm text-muted-foreground">
                A powerful, ShareX-like screenshot and upload tool for Emberly. 
                Capture, upload, and share instantly with global hotkeys.
              </p>
            </div>

            {/* Links */}
            <SettingsSection icon={ExternalLink} title="Links" description="Useful resources">
              <div className="space-y-2">
                <a
                  href="https://github.com/EmberlyOSS/Flicker"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-between p-4 rounded-xl bg-secondary/30 hover:bg-secondary/50 transition-colors group"
                >
                  <div className="flex items-center gap-3">
                    <Github size={18} className="text-muted-foreground" />
                    <span className="text-sm font-medium text-foreground">GitHub Repository</span>
                  </div>
                  <ExternalLink size={16} className="text-muted-foreground group-hover:text-foreground transition-colors" />
                </a>

                <a
                  href="https://embrly.ca"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-between p-4 rounded-xl bg-secondary/30 hover:bg-secondary/50 transition-colors group"
                >
                  <div className="flex items-center gap-3">
                    <Globe size={18} className="text-muted-foreground" />
                    <span className="text-sm font-medium text-foreground">Emberly Website</span>
                  </div>
                  <ExternalLink size={16} className="text-muted-foreground group-hover:text-foreground transition-colors" />
                </a>

                <a
                  href="https://embrly.ca/discord"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-between p-4 rounded-xl bg-secondary/30 hover:bg-secondary/50 transition-colors group"
                >
                  <div className="flex items-center gap-3">
                    <svg className="w-[18px] h-[18px] text-muted-foreground" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z"/>
                    </svg>
                    <span className="text-sm font-medium text-foreground">Discord Server</span>
                  </div>
                  <ExternalLink size={16} className="text-muted-foreground group-hover:text-foreground transition-colors" />
                </a>
              </div>
            </SettingsSection>

            {/* Credits */}
            <SettingsSection icon={Heart} title="Credits" description="Built with love">
              <div className="glass-card p-4 text-center space-y-2">
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
      {activeTab !== 'about' && activeTab !== 'appearance' && (
        <div className="sticky bottom-0 pt-4 pb-2 -mx-4 px-4 bg-gradient-to-t from-background via-background to-transparent">
          <button
            onClick={handleSave}
            className={`w-full py-3 rounded-xl font-semibold transition-all duration-300 flex items-center justify-center gap-2 ${
              saveSuccess
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
    </div>
  )
}
