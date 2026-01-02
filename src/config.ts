import { AppConfig, HotkeyConfig } from './types'

const CONFIG_KEY = 'emberly_uploader_config'
const UPLOAD_HISTORY_KEY = 'emberly_uploader_history'

export const DEFAULT_HOTKEYS: HotkeyConfig = {
  screenshotFullscreen: 'Control+Shift+S',
  screenshotRegion: '',
  screenshotAllMonitors: 'Control+Shift+A',
  uploadClipboard: '',
  openApp: '',
}

const DEFAULT_CONFIG: AppConfig = {
  uploadToken: '',
  visibility: 'PUBLIC',
  password: undefined,
  autoUpload: true,
  defaultNotification: true,
  user: undefined,
  hotkeys: DEFAULT_HOTKEYS,
  screenshotMode: 'primary',
}

export function loadConfig(): AppConfig {
  try {
    const stored = localStorage.getItem(CONFIG_KEY)
    return stored ? { ...DEFAULT_CONFIG, ...JSON.parse(stored) } : DEFAULT_CONFIG
  } catch {
    return DEFAULT_CONFIG
  }
}

export function saveConfig(config: AppConfig): void {
  localStorage.setItem(CONFIG_KEY, JSON.stringify(config))
}

export function loadUploadHistory(): Array<{ url: string; name: string; timestamp: number }> {
  try {
    const stored = localStorage.getItem(UPLOAD_HISTORY_KEY)
    return stored ? JSON.parse(stored) : []
  } catch {
    return []
  }
}

export function saveUploadHistory(history: Array<{ url: string; name: string; timestamp: number }>): void {
  localStorage.setItem(UPLOAD_HISTORY_KEY, JSON.stringify(history.slice(0, 50)))
}

export function addToUploadHistory(url: string, name: string): void {
  const history = loadUploadHistory()
  history.unshift({ url, name, timestamp: Date.now() })
  saveUploadHistory(history)
}
