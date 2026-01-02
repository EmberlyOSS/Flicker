export interface AppConfig {
  uploadToken: string
  visibility: 'PUBLIC' | 'PRIVATE'
  password?: string
  autoUpload: boolean
  defaultNotification: boolean
  // User data from login
  user?: AuthenticatedUser
  // Hotkey settings
  hotkeys?: HotkeyConfig
  // Screenshot settings
  screenshotMode?: ScreenshotMode
}

export type ScreenshotMode = 'primary' | 'active' | 'all'

export interface HotkeyConfig {
  screenshotFullscreen: string // e.g., "Ctrl+Alt+PrintScreen"
  screenshotRegion: string // e.g., "Ctrl+Shift+PrintScreen"
  screenshotAllMonitors: string // e.g., "Ctrl+Shift+A"
  uploadClipboard: string // e.g., "Ctrl+Alt+U"
  openApp: string // e.g., "Ctrl+Alt+E"
}

export interface AuthenticatedUser {
  id: string
  name: string | null
  email: string
  image: string | null
  urlId: string
}

export interface LoginRequest {
  emailOrUsername: string
  password: string
  twoFactorCode?: string
}

export interface LoginResponse {
  success: boolean
  user?: {
    id: string
    name: string | null
    email: string
    uploadToken: string
    image: string | null
    urlId: string
  }
  error?: string
  requires2FA?: boolean
}

export interface UploadResponse {
  url: string
  name: string
  size: number // Size in bytes
  type: string // MIME type
}

export interface ScreenshotResult {
  path: string
  width: number
  height: number
}

export interface UploadCompleteEvent {
  url: string
  name: string
  size: number
  file_type: string
  screenshot_path: string | null
}

export interface MonitorInfo {
  index: number
  id: number
  x: number
  y: number
  width: number
  height: number
  is_primary: boolean
  scale_factor: number
}

export interface UploadProgress {
  uploaded: number
  total: number
  percentage: number
}

export interface SystemInfo {
  platform: string
  arch: string
  temp_dir: string
  screenshots_dir?: string
}

export interface UploadHistoryItem {
  url: string
  name: string
  timestamp: number
  fileType?: string
  size?: number
  thumbnailUrl?: string
}
