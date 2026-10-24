import { Camera } from 'lucide-react'
import { useApp } from '../../context/AppContext'
import { NotificationCenter } from '../notifications'
import { SETTINGS_TAB_KEY } from '../settings/SettingsPage'
import { AppNotification } from '../../types'

export function Header() {
    const { isLoggedIn, setShowLogin, takeFullscreenScreenshot, notifications, setActivePage } = useApp()

    const handleAction = (actionId: string, notification: AppNotification) => {
        notifications.markAsRead(notification.id)
        if (actionId === 'update-now') {
            sessionStorage.setItem(SETTINGS_TAB_KEY, 'application')
            setActivePage('settings')
        }
    }

    return (
        <header className="relative z-30 hidden items-center border-b border-border/70 bg-card/60 px-6 py-3 backdrop-blur-xl lg:flex lg:justify-end">
            <div className="flex items-center gap-3">
                <div
                    className={`flex items-center gap-2 px-3 py-1.5 rounded-full border ${
                        isLoggedIn ? 'border-emerald-500/20 bg-emerald-500/10' : 'border-border/70 bg-secondary/50'
                    }`}
                >
                    <div className={`w-2 h-2 rounded-full ${isLoggedIn ? 'bg-emerald-500' : 'bg-muted-foreground'}`} />
                    <span className={`text-xs ${isLoggedIn ? 'text-emerald-500' : 'text-muted-foreground'}`}>
                        {isLoggedIn ? 'Connected' : 'Disconnected'}
                    </span>
                </div>

                <NotificationCenter
                    notifications={notifications.activeNotifications}
                    unreadCount={notifications.unreadCount}
                    onMarkAsRead={notifications.markAsRead}
                    onMarkAllAsRead={notifications.markAllAsRead}
                    onDismiss={notifications.dismissNotification}
                    onDelete={notifications.deleteNotification}
                    onClearAll={notifications.clearAll}
                    onAction={handleAction}
                />

                {isLoggedIn ? (
                    <button
                        onClick={takeFullscreenScreenshot}
                        className="flex items-center gap-2 px-4 py-2 text-sm font-medium transition-colors rounded-lg bg-primary text-primary-foreground hover:bg-primary/90"
                    >
                        <Camera size={16} />
                        Capture
                    </button>
                ) : (
                    <button
                        onClick={() => setShowLogin(true)}
                        className="px-4 py-2 text-sm font-medium rounded-lg bg-primary text-primary-foreground"
                    >
                        Sign In
                    </button>
                )}
            </div>
        </header>
    )
}
