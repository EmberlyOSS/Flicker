import { createContext, useContext, useState, useCallback, ReactNode } from 'react'

export type Notification = {
  id: string
  title: string
  message: string
  type: 'success' | 'error' | 'info' | 'warning'
  timestamp: number
  read: boolean
}

export type Toast = {
  id: string
  message: string
  type: 'success' | 'error' | 'info' | 'warning'
  duration?: number
}

type NotificationContextType = {
  notifications: Notification[]
  toasts: Toast[]
  addNotification: (notification: Omit<Notification, 'id' | 'timestamp' | 'read'>) => string
  dismissNotification: (id: string) => void
  markAsRead: (id: string) => void
  removeToast: (id: string) => void
  notify: {
    toast: (message: string, type?: Toast['type'], duration?: number) => string
    success: (message: string) => string
    error: (message: string) => string
    info: (message: string) => string
    warning: (message: string) => string
  }
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined)

export function NotificationProvider({ children }: { children: ReactNode }) {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [toasts, setToasts] = useState<Toast[]>([])

  // All methods should be non-blocking callbacks
  const addNotification = useCallback((notification: Omit<Notification, 'id' | 'timestamp' | 'read'>) => {
    const newNotification: Notification = {
      ...notification,
      id: `notif-${Date.now()}-${Math.random().toString(36).slice(2)}`,
      timestamp: Date.now(),
      read: false,
    }
    setNotifications(prev => [newNotification, ...prev])
    return newNotification.id
  }, [])

  const dismissNotification = useCallback((id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id))
  }, [])

  const markAsRead = useCallback((id: string) => {
    setNotifications(prev => 
      prev.map(n => n.id === id ? { ...n, read: true } : n)
    )
  }, [])

  const addToast = useCallback((message: string, type: Toast['type'] = 'info', duration = 5000) => {
    const id = `toast-${Date.now()}-${Math.random().toString(36).slice(2)}`
    setToasts(prev => [...prev, { id, message, type, duration }])
    
    // Auto-remove toast after duration
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id))
    }, duration)
    
    return id
  }, [])

  const removeToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id))
  }, [])

  const notify = {
    toast: addToast,
    success: (msg: string) => addToast(msg, 'success'),
    error: (msg: string) => addToast(msg, 'error'),
    info: (msg: string) => addToast(msg, 'info'),
    warning: (msg: string) => addToast(msg, 'warning'),
  }

  // Don't do any async work or invoke calls in the provider itself
  // Keep it purely synchronous

  return (
    <NotificationContext.Provider value={{
      notifications,
      toasts,
      addNotification,
      dismissNotification,
      markAsRead,
      removeToast,
      notify,
    }}>
      {children}
    </NotificationContext.Provider>
  )
}

export function useNotificationContext() {
  const context = useContext(NotificationContext)
  if (!context) {
    throw new Error('useNotificationContext must be used within a NotificationProvider')
  }
  return context
}