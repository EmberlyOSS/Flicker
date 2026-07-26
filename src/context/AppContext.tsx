import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react'
import { AppConfig, UploadResponse, LoginResponse, UploadHistoryItem, UploadCompleteEvent } from '../types'
import { loadConfig, saveConfig, loadUploadHistory, saveUploadHistory, addToUploadHistory } from '../config'
import { useHotkeys } from '../hooks/useHotkeys'
import { useNotifications } from '../hooks/useNotifications'
import { DEFAULT_HOTKEYS } from '../config'

export type PageId = 'upload' | 'history' | 'settings' | 'analytics'

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

export function AppProvider({ children }: AppProviderProps) {
    const [config, setConfig] = useState<AppConfig | null>(null)
    const [history, setHistory] = useState<UploadHistoryItem[]>([])
    const [showLogin, setShowLogin] = useState(false)
    const [activePage, setActivePage] = useState<PageId>('upload')
    const [screenshotStatus, setScreenshotStatus] = useState<string | null>(null)

    // Notifications hook
    const notifications = useNotifications()

    // Load initial config and history
    useEffect(() => {
        try {
            const loadedConfig = loadConfig()
            setConfig(loadedConfig)
            const loadedHistory = loadUploadHistory()
            setHistory(loadedHistory)
            if (!loadedConfig.uploadToken) {
                setShowLogin(true)
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

    const updateConfig = useCallback((newConfig: AppConfig) => {
        saveConfig(newConfig)
        setConfig(newConfig)
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
            setShowLogin(false)
            notifications.notifySuccess('Welcome!', `Signed in as ${user.name || user.email}`)
        }
    }, [config, notifications])

    const handleLogout = useCallback(() => {
        const updatedConfig = { ...(config || loadConfig()), uploadToken: '', user: undefined }
        saveConfig(updatedConfig)
        setConfig(updatedConfig)
        setShowLogin(true)
        setActivePage('upload')
    }, [config])

    const handleUploadComplete = useCallback((_filePath: string, response: UploadResponse) => {
        addToUploadHistory(response.url, response.name)
        setHistory(loadUploadHistory())
        notifications.notifyUpload('Upload Complete', `${response.name} uploaded successfully`, response.url)
    }, [notifications])

    const handleDeleteFromHistory = useCallback((url: string) => {
        const updatedHistory = history.filter(item => item.url !== url)
        setHistory(updatedHistory)
        saveUploadHistory(updatedHistory)
    }, [history])

    const handleCopyUrl = useCallback((url: string) => {
        navigator.clipboard.writeText(url)
    }, [])

    // Hotkey callbacks
    const handleScreenshotStart = useCallback(() => {
        setScreenshotStatus('Capturing...')
    }, [])

    const handleScreenshotHotkeyComplete = useCallback((result: UploadCompleteEvent) => {
        setScreenshotStatus(null)
        addToUploadHistory(result.url, result.name)
        setHistory(loadUploadHistory())
        notifications.notifyUpload('Screenshot Uploaded', result.name, result.url)
    }, [notifications])

    const handleScreenshotError = useCallback((error: string) => {
        setScreenshotStatus(null)
        console.error('Screenshot error:', error)
        notifications.notifyError('Screenshot Failed', error)
    }, [notifications])

    // Initialize hotkeys
    const { takeFullscreenScreenshot, takeAllMonitorsScreenshot } = useHotkeys({
        hotkeys: config?.hotkeys || DEFAULT_HOTKEYS,
        uploadToken: config?.uploadToken || '',
        visibility: config?.visibility || 'PUBLIC',
        apiUrl: config?.uploadUrl || 'https://embrly.ca',
        enabled: !!config?.uploadToken,
        onScreenshotStart: handleScreenshotStart,
        onUploadComplete: handleScreenshotHotkeyComplete,
        onError: handleScreenshotError,
    })

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
        notifications,
    }

    return <AppContext.Provider value={value}>{children}</AppContext.Provider>
}
