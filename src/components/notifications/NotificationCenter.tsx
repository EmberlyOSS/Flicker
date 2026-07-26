import { useState, useRef, useEffect } from 'react'
import {
  Bell, X, Check, CheckCheck, Trash2, Shield, AlertTriangle,
  Upload, Download, Info, AlertCircle, CheckCircle, Clock
} from 'lucide-react'
import { AppNotification, NotificationCategory, NotificationPriority } from '../../types'

interface NotificationCenterProps {
  notifications: AppNotification[]
  unreadCount: number
  onMarkAsRead: (id: string) => void
  onMarkAllAsRead: () => void
  onDismiss: (id: string) => void
  onDelete: (id: string) => void
  onClearAll: (includeSystem?: boolean) => void
  onAction?: (actionId: string, notification: AppNotification) => void
}

function getCategoryStyle(category: NotificationCategory) {
  const styles: Record<NotificationCategory, { icon: typeof Bell; color: string; bg: string; border: string }> = {
    admin: { icon: Shield, color: 'text-purple-400', bg: 'bg-purple-500/20', border: 'border-purple-500/30' },
    security: { icon: AlertTriangle, color: 'text-orange-400', bg: 'bg-orange-500/20', border: 'border-orange-500/30' },
    account: { icon: Info, color: 'text-blue-400', bg: 'bg-blue-500/20', border: 'border-blue-500/30' },
    update: { icon: Download, color: 'text-cyan-400', bg: 'bg-cyan-500/20', border: 'border-cyan-500/30' },
    upload: { icon: Upload, color: 'text-green-400', bg: 'bg-green-500/20', border: 'border-green-500/30' },
    error: { icon: AlertCircle, color: 'text-red-400', bg: 'bg-red-500/20', border: 'border-red-500/30' },
    success: { icon: CheckCircle, color: 'text-emerald-400', bg: 'bg-emerald-500/20', border: 'border-emerald-500/30' },
    info: { icon: Info, color: 'text-blue-400', bg: 'bg-blue-500/20', border: 'border-blue-500/30' },
  }
  return styles[category] || styles.info
}

function getPriorityBadge(priority: NotificationPriority) {
  if (priority === 'system') {
    return <span className="px-1.5 py-0.5 text-[10px] font-bold bg-red-500/20 text-red-400 rounded">SYSTEM</span>
  }
  if (priority === 'important') {
    return <span className="px-1.5 py-0.5 text-[10px] font-bold bg-yellow-500/20 text-yellow-400 rounded">IMPORTANT</span>
  }
  return null
}

function formatRelativeTime(timestamp: number): string {
  const diff = Date.now() - timestamp
  const minutes = Math.floor(diff / 60000)
  const hours = Math.floor(minutes / 60)
  const days = Math.floor(hours / 24)
  if (days > 0) return `${days}d ago`
  if (hours > 0) return `${hours}h ago`
  if (minutes > 0) return `${minutes}m ago`
  return 'Just now'
}

function NotificationItem({
  notification,
  onMarkAsRead,
  onDismiss,
  onDelete,
  onAction,
}: {
  notification: AppNotification
  onMarkAsRead: (id: string) => void
  onDismiss: (id: string) => void
  onDelete: (id: string) => void
  onAction?: (actionId: string, notification: AppNotification) => void
}) {
  const style = getCategoryStyle(notification.category)
  const Icon = style.icon

  return (
    <div className={`relative p-3 rounded-lg border transition-all duration-200 ${notification.read ? 'bg-secondary/20 border-border/30' : `${style.bg} ${style.border}`
      }`}>
      {!notification.read && (
        <div className="absolute w-2 h-2 rounded-full top-3 right-3 bg-primary animate-pulse" />
      )}
      <div className="flex gap-3">
        <div className={`flex-shrink-0 w-8 h-8 rounded-lg ${style.bg} flex items-center justify-center`}>
          <Icon size={16} className={style.color} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2 mb-1">
            <div className="flex flex-wrap items-center gap-2">
              {notification.title && (
                <span className="text-sm font-medium text-foreground">{notification.title}</span>
              )}
              {getPriorityBadge(notification.priority)}
            </div>
            <div className="flex items-center gap-1 text-muted-foreground">
              <Clock size={10} />
              <span className="text-[10px]">{formatRelativeTime(notification.timestamp)}</span>
            </div>
          </div>
          <p className="text-xs text-muted-foreground line-clamp-2">{notification.message}</p>
          {notification.action_label && notification.action_id && (
            <button
              onClick={() => onAction?.(notification.action_id!, notification)}
              className="mt-2 px-3 py-1.5 text-xs font-medium bg-primary/20 text-primary rounded-lg hover:bg-primary/30 transition-colors"
            >
              {notification.action_label}
            </button>
          )}
          <div className="flex items-center gap-2 mt-2">
            {!notification.read && (
              <button onClick={() => onMarkAsRead(notification.id)} className="p-1 transition-colors text-muted-foreground hover:text-foreground" title="Mark as read">
                <Check size={14} />
              </button>
            )}
            <button onClick={() => onDismiss(notification.id)} className="p-1 transition-colors text-muted-foreground hover:text-foreground" title="Dismiss">
              <X size={14} />
            </button>
            {notification.priority !== 'system' && (
              <button onClick={() => onDelete(notification.id)} className="p-1 transition-colors text-muted-foreground hover:text-red-400" title="Delete">
                <Trash2 size={14} />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export function NotificationCenter({ notifications, unreadCount, onMarkAsRead, onMarkAllAsRead, onDismiss, onDelete, onClearAll, onAction }: NotificationCenterProps) {
  const [isOpen, setIsOpen] = useState(false)
  const panelRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setIsOpen(false)
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isOpen])

  const activeNotifications = notifications.filter(n => !n.dismissed)

  return (
    <div className="relative" ref={panelRef}>
      <button onClick={() => setIsOpen(!isOpen)} className="relative p-2 transition-colors rounded-lg hover:bg-secondary/50" title="Notifications">
        <Bell size={20} className="text-muted-foreground" />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 flex items-center justify-center text-[10px] font-bold bg-primary text-primary-foreground rounded-full">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 top-full mt-2 w-80 sm:w-96 max-h-[70vh] glass-card border border-border rounded-xl shadow-2xl overflow-hidden z-50 animate-fade-in">
          <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-secondary/30">
            <div className="flex items-center gap-2">
              <Bell size={16} className="text-primary" />
              <span className="font-semibold text-foreground">Notifications</span>
              {unreadCount > 0 && (
                <span className="px-1.5 py-0.5 text-[10px] font-bold bg-primary/20 text-primary rounded">{unreadCount} new</span>
              )}
            </div>
            <div className="flex items-center gap-1">
              {unreadCount > 0 && (
                <button onClick={onMarkAllAsRead} className="p-1.5 text-muted-foreground hover:text-foreground transition-colors" title="Mark all as read">
                  <CheckCheck size={16} />
                </button>
              )}
              <button onClick={() => onClearAll(false)} className="p-1.5 text-muted-foreground hover:text-foreground transition-colors" title="Clear all">
                <Trash2 size={16} />
              </button>
            </div>
          </div>

          <div className="overflow-y-auto max-h-[calc(70vh-60px)] p-2 space-y-2">
            {activeNotifications.length > 0 ? (
              activeNotifications.map(notification => (
                <NotificationItem
                  key={notification.id}
                  notification={notification}
                  onMarkAsRead={onMarkAsRead}
                  onDismiss={onDismiss}
                  onDelete={onDelete}
                  onAction={onAction}
                />
              ))
            ) : (
              <div className="py-12 text-center">
                <Bell size={32} className="mx-auto mb-3 text-muted-foreground/30" />
                <p className="text-sm text-muted-foreground">No notifications</p>
                <p className="mt-1 text-xs text-muted-foreground/60">You're all caught up!</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
