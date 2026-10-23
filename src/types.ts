export interface AppConfig {
  uploadToken: string
  uploadUrl?: string
  visibility: 'PUBLIC' | 'PRIVATE'
  password?: string
  preferredDomain?: string
  autoUpload: boolean
  defaultNotification: boolean
  // User data from login
  user?: AuthenticatedUser
  // Hotkey settings
  hotkeys?: HotkeyConfig
  // Screenshot settings
  screenshotMode?: ScreenshotMode

  // -- NEW CUSTOMIZATION --
  appearance?: AppearanceConfig
  behavior?: BehaviorConfig
  capture?: CaptureConfig
  video?: VideoConfig
}

export interface AppearanceConfig {
  theme: string // 'dark', 'light', 'midnight', etc.
  backgroundOpacity: number // 0.5 to 1.0
  fontScale: 'small' | 'medium' | 'large'
  fontFamily: 'system' | 'inter' | 'roboto' | 'mono' | 'poppins'
  borderRadius: 'none' | 'small' | 'medium' | 'large'
  sidebarPosition: 'left' | 'right'
  compactMode: boolean
  animations: boolean
  glassEffect: boolean
  customColors?: {
    primary: string
    secondary: string
    background: string
  }
}

export type PostUploadAction = 'copy' | 'open' | 'none'
export type ClipboardFormat = 'url' | 'raw-url' | 'markdown' | 'html'

export interface BehaviorConfig {
  postUploadAction: PostUploadAction
  clipboardFormat: ClipboardFormat
  playSound: boolean
  startAtLogin: boolean
}

export interface CaptureConfig {
  format: 'png' | 'jpg'
  quality: number // 1-100 (for jpg)
  delay: number // seconds
  filenamePattern: string // e.g. "Screen_{date}_{time}"
  saveLocally: boolean
  includeCursor: boolean
}

export interface VideoConfig {
  includeSystemAudio: boolean // default true
  includeMic: boolean // default false
  showClicks: boolean
  fps: number // 30
  maxDurationSecs: number // 600 (10m)
  autoUpload: boolean
}

export type ScreenshotMode = 'primary' | 'active' | 'all'

export interface HotkeyConfig {
  screenshotFullscreen: string // e.g., "Ctrl+Alt+PrintScreen"
  screenshotRegion: string // e.g., "Ctrl+Shift+PrintScreen"
  screenshotAllMonitors: string // e.g., "Ctrl+Shift+A"
  uploadClipboard: string // e.g., "Ctrl+Alt+U"
  openApp: string // e.g., "Ctrl+Alt+E"
  recordVideo: string // e.g., Super+Shift+R
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
  id?: string
  url: string
  name: string
  size: number // Size in bytes
  type: string // MIME type
}

export interface UserProfile {
  id: string
  name: string | null
  email: string
  image: string | null
  urlId: string
}

export interface DomainInfo {
  id: string
  domain: string
  verified: boolean
  isPrimary: boolean
  cfStatus: string | null
}

export interface DomainLimit {
  allowed: number | null
  base: number
  purchased: number
  perkBonus: number
  used: number
  remaining: number | null
  unlimited: boolean
}

export interface DomainsResponse {
  domains: DomainInfo[]
  domainLimit: DomainLimit
}

export interface PerksResponse {
  perks: unknown[]
  summary: {
    activePerks: number
    totalPerks: number
    bonuses: {
      storage: string | null
      domains: string | null
    }
  }
}

export interface ShortenedUrlResponse {
  id: string
  shortCode: string
  targetUrl: string
  clicks: number
  createdAt: string
}

export interface RecentUpload {
  id: string
  name: string
  size: number
  uploadedAt: string
  views: number
  downloads: number
}

export interface AnalyticsSummary {
  plan: string
  basic: {
    totalFiles: number
    storageUsed: number
    totalUrls: number
    totalUrlClicks: number
    totalViews: number
    totalDownloads: number
    domainsCount: number
    verifiedDomains: number
  }
  allowed: {
    topFiles: boolean
    topUrls: boolean
    recentUploads: boolean
    detailedList: boolean
  }
  recentUploads: RecentUpload[]
  uploadsPerDay: { date: string; count: number }[]
}

export interface ScreenshotResult {
  path: string
  width: number
  height: number
}

export interface UploadCompleteEvent {
  id?: string
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
  fileId?: string
}

// ============================================================================
// Notification Types
// ============================================================================

export type NotificationPriority = 'system' | 'important' | 'default' | 'transient'
export type NotificationCategory = 'admin' | 'security' | 'account' | 'update' | 'upload' | 'error' | 'info' | 'success'

export interface AppNotification {
  id: string
  priority: NotificationPriority
  category: NotificationCategory
  title: string
  message: string
  timestamp: number
  read: boolean
  dismissed: boolean
  persistent: boolean
  action_label?: string
  action_id?: string
  metadata?: Record<string, unknown>
}

export interface AddNotificationParams {
  priority: NotificationPriority
  category: NotificationCategory
  title: string
  message: string
  persistent?: boolean
  actionLabel?: string
  actionId?: string
  metadata?: Record<string, unknown>
}
