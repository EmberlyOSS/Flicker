import { useState, useEffect, useCallback } from 'react'
import { invoke } from '@tauri-apps/api/core'
import { AppNotification, AddNotificationParams } from '../types'

// Check if we're in a Tauri environment
function isTauri(): boolean {
  return typeof window !== 'undefined' && !!(window as any).__TAURI_INTERNALS__
}

export function useNotifications() {
  const [notifications, setNotifications] = useState<AppNotification[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [loading, setLoading] = useState(true)

  const loadNotifications = useCallback(async (includeDismissed = false) => {
    if (!isTauri()) {
      setLoading(false)
      return []
    }

    try {
      const result = await invoke<AppNotification[]>('notification_get_all', {
        includeDismissed
      })
      setNotifications(result)
      return result
    } catch (error) {
      console.error('Failed to load notifications:', error)
      return []
    }
  }, [])

  const loadUnreadCount = useCallback(async () => {
    if (!isTauri()) return 0

    try {
      const count = await invoke<number>('notification_get_unread_count')
      setUnreadCount(count)
      return count
    } catch (error) {
      console.error('Failed to get unread count:', error)
      return 0
    }
  }, [])

  const addNotification = useCallback(async (params: AddNotificationParams) => {
    try {
      const notification = await invoke<AppNotification>('notification_add', {
        priority: params.priority,
        category: params.category,
        title: params.title,
        message: params.message,
        persistent: params.persistent ?? false,
        actionLabel: params.actionLabel ?? null,
        actionId: params.actionId ?? null,
        metadata: params.metadata ?? null,
      })
      setNotifications(prev => [notification, ...prev])
      setUnreadCount(prev => prev + 1)
      return notification
    } catch (error) {
      console.error('Failed to add notification:', error)
      throw error
    }
  }, [])

  const markAsRead = useCallback(async (id: string) => {
    try {
      await invoke('notification_mark_read', { id })
      setNotifications(prev =>
        prev.map(n => n.id === id ? { ...n, read: true } : n)
      )
      setUnreadCount(prev => Math.max(0, prev - 1))
    } catch (error) {
      console.error('Failed to mark notification as read:', error)
    }
  }, [])

  const markAllAsRead = useCallback(async () => {
    try {
      await invoke('notification_mark_all_read')
      setNotifications(prev => prev.map(n => ({ ...n, read: true })))
      setUnreadCount(0)
    } catch (error) {
      console.error('Failed to mark all as read:', error)
    }
  }, [])

  const dismissNotification = useCallback(async (id: string) => {
    try {
      await invoke('notification_dismiss', { id })
      setNotifications(prev =>
        prev.map(n => n.id === id ? { ...n, dismissed: true, read: true } : n)
      )
      setUnreadCount(prev => Math.max(0, prev - 1))
    } catch (error) {
      console.error('Failed to dismiss notification:', error)
    }
  }, [])

  const deleteNotification = useCallback(async (id: string) => {
    try {
      await invoke('notification_delete', { id })
      setNotifications(prev => prev.filter(n => n.id !== id))
    } catch (error) {
      console.error('Failed to delete notification:', error)
    }
  }, [])

  const clearAll = useCallback(async (includeSystem = false) => {
    try {
      await invoke('notification_clear_all', { includeSystem })
      if (includeSystem) {
        setNotifications([])
      } else {
        setNotifications(prev => prev.filter(n => n.priority === 'system'))
      }
      await loadUnreadCount()
    } catch (error) {
      console.error('Failed to clear notifications:', error)
    }
  }, [loadUnreadCount])

  const checkSystemNotifications = useCallback(async () => {
    if (!isTauri()) return []

    try {
      const systemNotifs = await invoke<AppNotification[]>('notification_check_system')
      if (systemNotifs.length > 0) {
        setNotifications(prev => [...systemNotifs, ...prev])
        setUnreadCount(prev => prev + systemNotifs.length)
      }
      return systemNotifs
    } catch (error) {
      console.error('Failed to check system notifications:', error)
      return []
    }
  }, [])

  const notifySuccess = useCallback((title: string, message: string) => {
    return addNotification({ priority: 'default', category: 'success', title, message, persistent: false })
  }, [addNotification])

  const notifyError = useCallback((title: string, message: string) => {
    return addNotification({ priority: 'important', category: 'error', title, message, persistent: true })
  }, [addNotification])

  const notifyUpload = useCallback((title: string, message: string, url?: string) => {
    return addNotification({
      priority: 'default',
      category: 'upload',
      title,
      message,
      persistent: false,
      metadata: url ? { url } : undefined,
    })
  }, [addNotification])

  const notifyUpdate = useCallback((version: string, notes?: string) => {
    return addNotification({
      priority: 'important',
      category: 'update',
      title: 'Update Available',
      message: `Version ${version} is ready to install`,
      persistent: true,
      actionLabel: 'Update Now',
      actionId: 'update-now',
      metadata: { version, notes },
    })
  }, [addNotification])

  // Initial load
  useEffect(() => {
    const init = async () => {
      if (!isTauri()) {
        setLoading(false)
        return
      }

      setLoading(true)
      await loadNotifications()
      await loadUnreadCount()
      await checkSystemNotifications()
      setLoading(false)
    }
    init()
  }, [loadNotifications, loadUnreadCount, checkSystemNotifications])

  const activeNotifications = notifications.filter(n => !n.dismissed)
  const systemNotifications = notifications.filter(n => n.priority === 'system' && !n.dismissed)
  const importantNotifications = notifications.filter(n => n.priority === 'important' && !n.dismissed)

  return {
    notifications,
    activeNotifications,
    systemNotifications,
    importantNotifications,
    unreadCount,
    loading,
    addNotification,
    markAsRead,
    markAllAsRead,
    dismissNotification,
    deleteNotification,
    clearAll,
    refresh: loadNotifications,
    notifySuccess,
    notifyError,
    notifyUpload,
    notifyUpdate,
  }
}
