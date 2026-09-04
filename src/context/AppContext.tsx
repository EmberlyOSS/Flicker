import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react'
import { invoke } from '@tauri-apps/api/core'
import { AppConfig, UploadResponse, LoginResponse, UploadHistoryItem, UploadCompleteEvent } from '../types'
import { loadConfig, saveConfig, loadUploadHistory, saveUploadHistory, addToUploadHistory } from '../config'
import { useHotkeys } from '../hooks/useHotkeys'
import { useNotifications } from '../hooks/useNotifications'
import { DEFAULT_HOTKEYS } from '../config'

export type PageId = 'upload' | 'history' | 'settings' | 'analytics' | 'shorten'

interface MacPermissions {
    screenRecording: boolean
    accessibility: boolean
    background: boolean
}

interface AppContextValue {
    // Config
    config: AppConfig | null
    updateConfig: (config: AppConfig) => void

    // Auth
    isLoggedIn: boolean
    showLogin: boolean
    setShowLogin: (show: boolean) => void
    handleLogin: (uploadToken: string, user: LoginResponse['user']) => void
    handleLogout: () => void

    // History
    history: UploadHistoryItem[]
    handleUploadComplete: (filePath: string, response: UploadResponse) => void
    handleDeleteFromHistory: (url: string) => void
    handleCopyUrl: (url: string) => void

    // Navigation
    activePage: PageId
    setActivePage: (page: PageId) => void

    // Screenshots
    screenshotStatus: string | null
    takeFullscreenScreenshot: () => void
    takeAllMonitorsScreenshot: () => void
    /** Triggers the region selector overlay */
    takeRegionScreenshot: () => void
    /** Called by RegionSelector with the selected region coords */
    captureAndUploadRegion: (x: number, y: number, width: number, height: number) => Promise<void>
    /** Whether the region selector overlay is currently visible */
    showRegionSelector: boolean
    setShowRegionSelector: (show: boolean) => void

    // Video
    isVideoRecording: boolean
    videoElapsed: number
    toggleVideoRecording: () => Promise<void>
    startVideoRecording: (region?: { x: number; y: number; width: number; height: number } | null) => Promise<void>
    stopVideoRecording: () => Promise<void>

    // macOS Permissions (soft-blocking startup screen)
    macPermissions: MacPermissions
    showPermissionsModal: boolean
    setShowPermissionsModal: (show: boolean) => void
    checkMacPermissions: () => Promise<void>
    requestMacPermissions: (type: 'screen' | 'accessibility' | 'background') => Promise<void>

    // Notifications
    notifications: ReturnType<typeof useNotifications>
}


const AppContext = createContext<AppContextValue | null>(null)

export function useApp() {
    const context = useContext(AppContext)
    if (!context) {
        throw new Error('useApp must be used within AppProvider')
    }
    return context
}

interface AppProviderProps {
    children: ReactNode
}

/**
 * AppProvider component that wraps the application and provides global state and context.
 * It manages configuration, authentication, upload history, navigation, screenshot functionality, and notifications.
 * 
 * @param {AppProviderProps} props - The properties for the AppProvider component.
 * @returns {JSX.Element} The AppProvider component that wraps its children with the AppContext.
 */
export function AppProvider({ children }: AppProviderProps) {
    const [config, setConfig] = useState<AppConfig | null>(null)
    const [history, setHistory] = useState<UploadHistoryItem[]>([])
    const [showLogin, setShowLogin] = useState(false)
    const [activePage, setActivePage] = useState<PageId>('upload')
    const [screenshotStatus, setScreenshotStatus] = useState<string | null>(null)
    const [showRegionSelector, setShowRegionSelector] = useState(false)
    const [isVideoRecording, setIsVideoRecording] = useState(false)
    const [videoElapsed, setVideoElapsed] = useState(0)
    const [macPermissions, setMacPermissions] = useState<MacPermissions>({ screenRecording: true, accessibility: true, background: true })
    const [showPermissionsModal, setShowPermissionsModal] = useState(false)

    const notifications = useNotifications()

    useEffect(() => {
        try {
            const loadedConfig = loadConfig()
            setConfig(loadedConfig)
            const loadedHistory = loadUploadHistory()
            setHistory(loadedHistory)
            if (!loadedConfig.uploadToken) {
                setShowLogin(true)
            }
            // Also try to sync config to Rust backend for global overlay use
            if ((window as any).__TAURI_INTERNALS__) {
                invoke('save_config', { config: loadedConfig as any }).catch(() => {})
            }
        } catch (error) {
            console.error('Error loading config:', error)
            setConfig({
                uploadToken: '',
                visibility: 'PUBLIC',
                password: undefined,
                autoUpload: true,
                defaultNotification: true,
            })
            setShowLogin(true)
        }
    }, [])

    const checkMacPermissions = useCallback(async () => {
        if (!(window as any).__TAURI_INTERNALS__) return
        try {
            const isMac = /Mac|iPhone|iPad/.test(navigator.platform || (navigator as any).userAgent || '')
            if (!isMac) {
                setMacPermissions({ screenRecording: true, accessibility: true, background: true })
                return
            }
            const [screen, acc, bg] = await Promise.all([
                invoke<boolean>('check_screen_recording_permission').catch(() => true),
                invoke<boolean>('check_accessibility_permission').catch(() => true),
                invoke<boolean>('check_background_permission').catch(() => true),
            ])
            setMacPermissions({ screenRecording: screen, accessibility: acc, background: bg })
        } catch {}
    }, [])

    const requestMacPermissions = useCallback(async (type: 'screen' | 'accessibility' | 'background') => {
        if (!(window as any).__TAURI_INTERNALS__) return
        try {
            if (type === 'screen') {
                const ok = await invoke<boolean>('request_screen_recording_permission').catch(() => false)
                setMacPermissions(prev => ({ ...prev, screenRecording: ok }))
            } else if (type === 'accessibility') {
                await invoke('request_accessibility_permission').catch(() => {})
                const has = await invoke<boolean>('check_accessibility_permission').catch(() => false)
                setMacPermissions(prev => ({ ...prev, accessibility: has as boolean }))
            } else if (type === 'background') {
                const ok = await invoke<boolean>('enable_background').catch(() => false)
                setMacPermissions(prev => ({ ...prev, background: ok }))
                if (!ok) await invoke('open_background_settings').catch(() => {})
            }
            // Re-check all after
            await checkMacPermissions()
        } catch {}
    }, [checkMacPermissions])

    // On mount, check permissions and show soft-blocking modal if any missing and not dismissed this session
    useEffect(() => {
        if (!(window as any).__TAURI_INTERNALS__) return
        const timer = setTimeout(async () => {
            await checkMacPermissions()
            // Read latest state via invokes
            try {
                const isMac = /Mac|iPhone|iPad/.test(navigator.platform || '')
                if (!isMac) return
                if (sessionStorage.getItem('flicker_perms_dismissed')) return
                const [screen, acc, bg] = await Promise.all([
                    invoke<boolean>('check_screen_recording_permission').catch(() => true),
                    invoke<boolean>('check_accessibility_permission').catch(() => true),
                    invoke<boolean>('check_background_permission').catch(() => true),
                ])
                if (!screen || !acc || !bg) {
                    setShowPermissionsModal(true)
                }
            } catch {}
        }, 1200)
        return () => clearTimeout(timer)
    }, [checkMacPermissions])

    // Video recording status polling and events
    useEffect(() => {
        if (!(window as any).__TAURI_INTERNALS__) return
        let interval: any
        let unlistenStart: (() => void) | undefined
        let unlistenStop: (() => void) | undefined
        let unlistenCancel: (() => void) | undefined
        const poll = async () => {
            try {
                const status = await invoke<{ is_recording: boolean; elapsed_seconds: number }>('get_recording_status')
                setIsVideoRecording(status.is_recording)
                setVideoElapsed(status.elapsed_seconds)
            } catch {}
        }
        poll()
        interval = setInterval(poll, 1000)
        ;(async () => {
            try {
                const { listen } = await import('@tauri-apps/api/event')
                unlistenStart = await listen('video_recording_started', () => {
                    setIsVideoRecording(true)
                    setVideoElapsed(0)
                })
                unlistenStop = await listen('video_recording_stopped', () => {
                    setIsVideoRecording(false)
                    setVideoElapsed(0)
                })
                unlistenCancel = await listen('video_recording_canceled', () => {
                    setIsVideoRecording(false)
                    setVideoElapsed(0)
                })
            } catch {}
        })()
        return () => {
            clearInterval(interval)
            try { unlistenStart?.() } catch {}
            try { unlistenStop?.() } catch {}
            try { unlistenCancel?.() } catch {}
        }
    }, [])

    // Listen for captures completed from Rust (system-wide, works even when app hidden)
    // Handles both region (global overlay) and fullscreen (Rust hotkey) — deduped via URL check
    useEffect(() => {
        if (!(window as any).__TAURI_INTERNALS__) return
        let unlistenRegion: (() => void) | undefined
        let unlistenUpload: (() => void) | undefined
        let unlistenScreenshot: (() => void) | undefined
        let unlistenPerm: (() => void) | undefined
        const handleUploadEvent = (result: UploadCompleteEvent, title: string) => {
            if (!result?.url) return
            // Deduplicate: if already in history, skip (prevents double-add when JS callback already handled)
            const existing = loadUploadHistory().some(h => h.url === result.url)
            if (existing) return
            addToUploadHistory(result.url, result.name, result.file_type, result.size, undefined, result.id)
            setHistory(loadUploadHistory())
            notifications.notifyUpload(title, result.name, result.url)
            setScreenshotStatus(null)
            setShowRegionSelector(false)
            navigator.clipboard.writeText(result.url).catch(() => {})
        }
        ;(async () => {
            try {
                const { listen } = await import('@tauri-apps/api/event')
                unlistenRegion = await listen<UploadCompleteEvent>('region_upload_complete', (event) => {
                    handleUploadEvent(event.payload, 'Region Captured')
                })
                unlistenUpload = await listen<UploadCompleteEvent>('upload_complete', (event) => {
                    handleUploadEvent(event.payload, 'Upload Complete')
                })
                unlistenScreenshot = await listen<UploadCompleteEvent>('screenshot_uploaded', (event) => {
                    handleUploadEvent(event.payload, 'Screenshot Uploaded')
                })
                unlistenPerm = await listen('screen_recording_permission_required', (event: any) => {
                    const msg = event.payload?.message || 'Screen Recording permission required. Enable in System Settings > Privacy & Security > Screen Recording.'
                    notifications.notifyError('Permission Required', msg)
                })
            } catch (e) {
                console.warn('Failed to setup region listeners', e)
            }
        })()
        return () => {
            try { unlistenRegion?.() } catch {}
            try { unlistenUpload?.() } catch {}
            try { unlistenScreenshot?.() } catch {}
            try { unlistenPerm?.() } catch {}
        }
    }, [notifications])

    const startVideoRecording = useCallback(async (region?: { x: number; y: number; width: number; height: number } | null) => {
        if (!(window as any).__TAURI_INTERNALS__) {
            notifications.notifyError('Video', 'Video recording only works in the desktop app')
            return
        }
        try {
            const cfg = config || loadConfig()
            const videoCfg = (cfg as any).video || { includeSystemAudio: true, includeMic: false, showClicks: false, fps: 30, maxDurationSecs: 600, autoUpload: true }
            const opts: any = {
                region: region ? { x: Math.round(region.x), y: Math.round(region.y), width: Math.round(region.width), height: Math.round(region.height) } : null,
                include_audio: videoCfg.includeSystemAudio,
                include_system_audio: videoCfg.includeSystemAudio,
                include_mic: videoCfg.includeMic,
                show_clicks: videoCfg.showClicks,
            }
            await invoke('start_video_recording', { options: opts })
            setIsVideoRecording(true)
        } catch (e) {
            const msg = e instanceof Error ? e.message : String(e)
            notifications.notifyError('Video Failed', msg)
        }
    }, [config, notifications])

    const stopVideoRecording = useCallback(async () => {
        if (!(window as any).__TAURI_INTERNALS__) return
        try {
            await invoke('stop_video_recording', { autoUpload: true })
            setIsVideoRecording(false)
        } catch (e) {
            const msg = e instanceof Error ? e.message : String(e)
            notifications.notifyError('Stop Failed', msg)
        }
    }, [notifications])

    const toggleVideoRecording = useCallback(async () => {
        if (isVideoRecording) {
            await stopVideoRecording()
        } else {
            // If we have a region selector, show it for region video; otherwise fullscreen
            // For now, start fullscreen; region video via overlay will be added later
            await startVideoRecording(null)
        }
    }, [isVideoRecording, startVideoRecording, stopVideoRecording])

    const updateConfig = useCallback((newConfig: AppConfig) => {
        saveConfig(newConfig)
        setConfig(newConfig)
        // Sync to Rust backend so global region overlay can use latest token without needing to read localStorage
        if ((window as any).__TAURI_INTERNALS__) {
            invoke('save_config', { config: newConfig as any }).catch((e) => console.warn('Failed to sync config to backend', e))
        }
    }, [])

    const handleLogin = useCallback((uploadToken: string, user: LoginResponse['user']) => {
        if (uploadToken && user) {
            const updatedConfig = {
                ...(config || loadConfig()),
                uploadToken,
                user: { id: user.id, name: user.name, email: user.email, image: user.image, urlId: user.urlId },
            }
            saveConfig(updatedConfig)
            setConfig(updatedConfig)
            if ((window as any).__TAURI_INTERNALS__) {
                invoke('save_config', { config: updatedConfig as any }).catch(() => {})
            }
            setShowLogin(false)
            notifications.notifySuccess('Welcome!', `Signed in as ${user.name || user.email}`)
        }
    }, [config, notifications])

    const handleLogout = useCallback(() => {
        const updatedConfig = { ...(config || loadConfig()), uploadToken: '', user: undefined }
        saveConfig(updatedConfig)
        setConfig(updatedConfig)
        if ((window as any).__TAURI_INTERNALS__) {
            invoke('save_config', { config: updatedConfig as any }).catch(() => {})
        }
        setShowLogin(true)
        setActivePage('upload')
    }, [config])

    const handleUploadComplete = useCallback((_filePath: string, response: UploadResponse) => {
        addToUploadHistory(response.url, response.name, response.type, response.size, undefined, response.id)
        setHistory(loadUploadHistory())
        notifications.notifyUpload('Upload Complete', `${response.name} uploaded successfully`, response.url)
    }, [notifications])

    const handleDeleteFromHistory = useCallback(async (url: string) => {
        const item = history.find(h => h.url === url)

        if (item?.fileId && config?.uploadToken) {
            try {
                await invoke('emberly_delete_file', {
                    apiUrl: config.uploadUrl || 'https://embrly.ca',
                    token: config.uploadToken,
                    fileId: item.fileId,
                })
            } catch (error) {
                console.error('Failed to delete file from server:', error)
            }
        }

        const updatedHistory = history.filter(h => h.url !== url)
        setHistory(updatedHistory)
        saveUploadHistory(updatedHistory)
    }, [history, config])

    const handleCopyUrl = useCallback((url: string) => {
        navigator.clipboard.writeText(url)
    }, [])

    const handleScreenshotStart = useCallback(() => {
        setScreenshotStatus('Capturing...')
    }, [])

    const handleScreenshotHotkeyComplete = useCallback((result: UploadCompleteEvent) => {
        setScreenshotStatus(null)
        setShowRegionSelector(false)
        addToUploadHistory(result.url, result.name, result.file_type, result.size, undefined, result.id)
        setHistory(loadUploadHistory())
        notifications.notifyUpload('Screenshot Uploaded', result.name, result.url)
    }, [notifications])

    const handleScreenshotError = useCallback((error: string) => {
        setScreenshotStatus(null)
        setShowRegionSelector(false)
        console.error('Screenshot error:', error)
        notifications.notifyError('Screenshot Failed', error)
    }, [notifications])

    const { takeFullscreenScreenshot, takeAllMonitorsScreenshot, takeRegionScreenshot, captureAndUploadRegion } = useHotkeys({
        hotkeys: config?.hotkeys || DEFAULT_HOTKEYS,
        uploadToken: config?.uploadToken || '',
        visibility: config?.visibility || 'PUBLIC',
        apiUrl: config?.uploadUrl || 'https://embrly.ca',
        domain: config?.preferredDomain,
        enabled: !!config?.uploadToken,
        onScreenshotStart: handleScreenshotStart,
        onUploadComplete: handleScreenshotHotkeyComplete,
        onError: handleScreenshotError,
        onShowRegionSelector: () => setShowRegionSelector(true),
    })

    // Handle tray-initiated captures (works even when window is hidden)
    useEffect(() => {
        if (!(window as any).__TAURI_INTERNALS__) return
        let unlistenTray: (() => void) | undefined
        ;(async () => {
            try {
                const { listen } = await import('@tauri-apps/api/event')
                unlistenTray = await listen<{ mode: string }>('tray_capture', (event) => {
                    const mode = event.payload?.mode
                    if (mode === 'screen') takeFullscreenScreenshot()
                    else if (mode === 'all') takeAllMonitorsScreenshot()
                    else if (mode === 'region') takeRegionScreenshot()
                })
            } catch (e) {
                console.warn('Failed to setup tray listeners', e)
            }
        })()
        return () => {
            try { unlistenTray?.() } catch {}
        }
    }, [takeFullscreenScreenshot, takeAllMonitorsScreenshot, takeRegionScreenshot])

    const value: AppContextValue = {
        config,
        updateConfig,
        isLoggedIn: !!config?.uploadToken,
        showLogin,
        setShowLogin,
        handleLogin,
        handleLogout,
        history,
        handleUploadComplete,
        handleDeleteFromHistory,
        handleCopyUrl,
        activePage,
        setActivePage,
        screenshotStatus,
        takeFullscreenScreenshot,
        takeAllMonitorsScreenshot,
        takeRegionScreenshot,
        captureAndUploadRegion,
        showRegionSelector,
        setShowRegionSelector,
        isVideoRecording,
        videoElapsed,
        toggleVideoRecording,
        startVideoRecording,
        stopVideoRecording,
        macPermissions,
        showPermissionsModal,
        setShowPermissionsModal,
        checkMacPermissions,
        requestMacPermissions,
        notifications,
    }

    return <AppContext.Provider value={value}>{children}</AppContext.Provider>
}

