import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react'
import { invoke } from '@tauri-apps/api/core'
import { AppConfig, UploadResponse, LoginResponse, UploadHistoryItem, UploadCompleteEvent } from '../types'
import { loadConfig, saveConfig, loadUploadHistory, saveUploadHistory, addToUploadHistory } from '../config'
import { useHotkeys } from '../hooks/useHotkeys'
import { useNotifications } from '../hooks/useNotifications'
import { DEFAULT_HOTKEYS } from '../config'

export type PageId = 'upload' | 'history' | 'settings' | 'analytics' | 'shorten'

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
        addToUploadHistory(result.url, result.name, result.file_type, result.size, undefined, result.id)
        setHistory(loadUploadHistory())
        notifications.notifyUpload('Screenshot Uploaded', result.name, result.url)
    }, [notifications])

    const handleScreenshotError = useCallback((error: string) => {
        setScreenshotStatus(null)
        console.error('Screenshot error:', error)
        notifications.notifyError('Screenshot Failed', error)
    }, [notifications])

    const { takeFullscreenScreenshot, takeAllMonitorsScreenshot } = useHotkeys({
        hotkeys: config?.hotkeys || DEFAULT_HOTKEYS,
        uploadToken: config?.uploadToken || '',
        visibility: config?.visibility || 'PUBLIC',
        apiUrl: config?.uploadUrl || 'https://embrly.ca',
        domain: config?.preferredDomain,
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
