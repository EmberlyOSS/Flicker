import { Camera } from 'lucide-react'
import { useApp } from '../../context/AppContext'
import { NotificationCenter } from '../notifications'

const PAGE_TITLES: Record<string, string> = {
    upload: 'Upload',
    history: 'Upload History',
    analytics: 'Stats',
    settings: 'Settings',
}

export function Header() {
    const { isLoggedIn, setShowLogin, takeFullscreenScreenshot, notifications, activePage } = useApp()

    return (
        <header className="items-center justify-between hidden px-8 py-3 border-b lg:flex border-border/40 glass-elevated rounded-none">
            <p className="text-sm font-medium text-foreground">{PAGE_TITLES[activePage] || 'Flicker'}</p>

            <div className="flex items-center gap-3">
                {/* Connection Status */}
                <div
                    className={`flex items-center gap-2 px-3 py-1.5 rounded-full border ${
                        isLoggedIn ? 'border-primary/20 bg-primary/10 glow-primary-subtle' : 'border-border/50 bg-secondary/50'
                    }`}
                >
                    <div className={`w-2 h-2 rounded-full ${isLoggedIn ? 'bg-primary' : 'bg-destructive'}`} />
                    <span className={`text-xs ${isLoggedIn ? 'text-primary' : 'text-muted-foreground'}`}>
                        {isLoggedIn ? 'Connected' : 'Disconnected'}
                    </span>
                </div>

                {/* Notification Center */}
                <NotificationCenter
                    notifications={notifications.activeNotifications}
                    unreadCount={notifications.unreadCount}
                    onMarkAsRead={notifications.markAsRead}
                    onMarkAllAsRead={notifications.markAllAsRead}
                    onDismiss={notifications.dismissNotification}
                    onDelete={notifications.deleteNotification}
                    onClearAll={notifications.clearAll}
                    onAction={(actionId, notification) => {
                        console.log('Notification action:', actionId, notification)
                        // Handle actions like 'update-now', etc.
                    }}
                />

                {/* Action Button */}
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
