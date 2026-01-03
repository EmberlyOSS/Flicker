import { AppConfig, HotkeyConfig, UploadHistoryItem } from './types'

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
  uploadUrl: 'https://embrly.ca',
  visibility: 'PUBLIC',
  password: undefined,
  autoUpload: true,
  defaultNotification: true,
  user: undefined,
  hotkeys: DEFAULT_HOTKEYS,
  screenshotMode: 'primary',
  appearance: {
    theme: 'dark',
    backgroundOpacity: 0.95,
    fontScale: 'medium',
  },
  behavior: {
    postUploadAction: 'copy',
    clipboardFormat: 'url',
    playSound: true,
    startAtLogin: false,
  },
  capture: {
    format: 'png',
    quality: 100,
    delay: 0,
    filenamePattern: 'Screenshot_%Y-%m-%d_%H-%M-%S',
    saveLocally: false,
    includeCursor: true,
  },
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

export function loadUploadHistory(): UploadHistoryItem[] {
  try {
    const stored = localStorage.getItem(UPLOAD_HISTORY_KEY)
    return stored ? JSON.parse(stored) : []
  } catch {
    return []
  }
}

export function saveUploadHistory(history: UploadHistoryItem[]): void {
  localStorage.setItem(UPLOAD_HISTORY_KEY, JSON.stringify(history.slice(0, 100)))
}

export function addToUploadHistory(url: string, name: string, fileType?: string, size?: number, thumbnailUrl?: string): void {
  const history = loadUploadHistory()
  history.unshift({ 
    url, 
    name, 
    timestamp: Date.now(),
    fileType: fileType || getMimeTypeFromUrl(url),
    size,
    thumbnailUrl: thumbnailUrl || (isImageUrl(url) ? url : undefined),
  })
  saveUploadHistory(history)
}

function getMimeTypeFromUrl(url: string): string {
  const ext = url.split('.').pop()?.toLowerCase() || ''
  const mimeTypes: Record<string, string> = {
    png: 'image/png',
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
    gif: 'image/gif',
    webp: 'image/webp',
    mp4: 'video/mp4',
    webm: 'video/webm',
    mov: 'video/quicktime',
    mp3: 'audio/mpeg',
    wav: 'audio/wav',
    pdf: 'application/pdf',
    txt: 'text/plain',
  }
  return mimeTypes[ext] || 'application/octet-stream'
}

function isImageUrl(url: string): boolean {
  const ext = url.split('.').pop()?.toLowerCase() || ''
  return ['png', 'jpg', 'jpeg', 'gif', 'webp', 'bmp', 'svg'].includes(ext)
}
