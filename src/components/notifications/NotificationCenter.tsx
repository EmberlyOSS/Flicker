import { useState, useRef, useEffect } from 'react'
import { Bell, X, Check, CheckCheck, Trash2, Shield, AlertTriangle, Upload, Download, Info, AlertCircle, CheckCircle } from 'lucide-react'
import { AppNotification, NotificationCategory } from '../../types'
import { timeAgo } from '../ui/kit'

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

const CATEGORY: Record<NotificationCategory, { icon: typeof Bell; color: string }> = {
  admin: { icon: Shield, color: 'text-primary' },
  security: { icon: AlertTriangle, color: 'text-amber-400' },
  account: { icon: Info, color: 'text-muted-foreground' },
  update: { icon: Download, color: 'text-primary' },
  upload: { icon: Upload, color: 'text-emerald-400' },
  error: { icon: AlertCircle, color: 'text-red-400' },
  success: { icon: CheckCircle, color: 'text-emerald-400' },
  info: { icon: Info, color: 'text-muted-foreground' },
}

const iconButton = 'rounded-md p-1 text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground'

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
  const { icon: Icon, color } = CATEGORY[notification.category] || CATEGORY.info

  return (
    <div className={`group relative flex gap-3 px-4 py-3 transition-colors hover:bg-secondary/40 ${notification.read ? '' : 'bg-primary/[0.04]'}`}>
      {!notification.read && <span className="absolute left-1.5 top-[18px] h-1.5 w-1.5 rounded-full bg-primary" />}
      <Icon size={16} className={`mt-0.5 shrink-0 ${color}`} />
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline justify-between gap-2">
          <p className={`truncate text-sm ${notification.read ? 'text-foreground/80' : 'font-medium text-foreground'}`}>
            {notification.title || notification.message}
          </p>
          <span className="shrink-0 text-[11px] text-muted-foreground group-hover:invisible">{timeAgo(notification.timestamp)}</span>
        </div>
        {notification.title && <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">{notification.message}</p>}
        {(notification.priority === 'system' || notification.priority === 'important') && (
          <span className={`mt-1 inline-block text-[10px] font-semibold uppercase tracking-wide ${notification.priority === 'system' ? 'text-red-400' : 'text-amber-400'}`}>
            {notification.priority}
          </span>
        )}
        {notification.action_label && notification.action_id && (
          <button
            onClick={() => onAction?.(notification.action_id!, notification)}
            className="mt-2 block rounded-md border border-border/70 px-2.5 py-1 text-xs font-medium text-foreground transition-colors hover:bg-secondary"
          >
            {notification.action_label}
          </button>
        )}
      </div>
      <div className="absolute right-3 top-2.5 hidden items-center gap-0.5 rounded-md bg-card/95 group-hover:flex">
        {!notification.read && (
          <button onClick={() => onMarkAsRead(notification.id)} className={iconButton} title="Mark as read">
            <Check size={13} />
          </button>
        )}
        <button onClick={() => onDismiss(notification.id)} className={iconButton} title="Dismiss">
          <X size={13} />
        </button>
        {notification.priority !== 'system' && (
          <button onClick={() => onDelete(notification.id)} className={`${iconButton} hover:text-destructive`} title="Delete">
            <Trash2 size={13} />
          </button>
        )}
      </div>
    </div>
  )
}

export function NotificationCenter({ notifications, unreadCount, onMarkAsRead, onMarkAllAsRead, onDismiss, onDelete, onClearAll, onAction }: NotificationCenterProps) {
  const [isOpen, setIsOpen] = useState(false)
  const panelRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!isOpen) return
    const handleClickOutside = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) setIsOpen(false)
    }
    const handleKey = (e: KeyboardEvent) => e.key === 'Escape' && setIsOpen(false)
    document.addEventListener('mousedown', handleClickOutside)
    document.addEventListener('keydown', handleKey)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('keydown', handleKey)
    }
  }, [isOpen])

  const activeNotifications = notifications.filter(n => !n.dismissed)

  return (
    <div className="relative" ref={panelRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`relative flex h-9 w-9 items-center justify-center rounded-lg transition-colors hover:bg-secondary ${isOpen ? 'bg-secondary text-foreground' : 'text-muted-foreground'}`}
        title="Notifications"
      >
        <Bell size={18} />
        {unreadCount > 0 && (
          <span className="absolute right-1 top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[9px] font-bold text-primary-foreground">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 top-full z-50 mt-2 w-80 overflow-hidden rounded-xl border border-border bg-card shadow-2xl animate-fade-in sm:w-96">
          <div className="flex items-center justify-between border-b border-border/70 px-4 py-2.5">
            <p className="text-sm font-semibold text-foreground">
              Notifications
              {unreadCount > 0 && <span className="ml-2 text-xs font-normal text-muted-foreground">{unreadCount} unread</span>}
            </p>
            {activeNotifications.length > 0 && (
              <div className="flex items-center gap-0.5">
                {unreadCount > 0 && (
                  <button onClick={onMarkAllAsRead} className={iconButton} title="Mark all as read">
                    <CheckCheck size={15} />
                  </button>
                )}
                <button onClick={() => onClearAll(false)} className={iconButton} title="Clear all">
                  <Trash2 size={15} />
                </button>
              </div>
            )}
          </div>

          <div className="max-h-[60vh] divide-y divide-border/50 overflow-y-auto">
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
              <div className="flex flex-col items-center gap-2 px-6 py-10 text-center">
                <Bell size={22} className="text-muted-foreground/40" />
                <p className="text-sm text-muted-foreground">You're all caught up</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
