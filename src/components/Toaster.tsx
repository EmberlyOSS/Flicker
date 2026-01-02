import { useEffect, useState } from 'react'
import { X, CheckCircle, AlertCircle, Info } from 'lucide-react'

export type ToastType = 'success' | 'error' | 'info'

export interface Toast {
  id: string
  message: string
  type: ToastType
  duration?: number
}

interface ToasterProps {
  toasts: Toast[]
  onRemove: (id: string) => void
}

export function Toaster({ toasts, onRemove }: ToasterProps) {
  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 max-w-sm">
      {toasts.map((toast) => (
        <ToastItem key={toast.id} toast={toast} onRemove={onRemove} />
      ))}
    </div>
  )
}

function ToastItem({ toast, onRemove }: { toast: Toast; onRemove: (id: string) => void }) {
  const [isExiting, setIsExiting] = useState(false)

  useEffect(() => {
    const duration = toast.duration || 5000
    const timer = setTimeout(() => {
      setIsExiting(true)
      setTimeout(() => onRemove(toast.id), 300)
    }, duration)

    return () => clearTimeout(timer)
  }, [toast, onRemove])

  const handleClose = () => {
    setIsExiting(true)
    setTimeout(() => onRemove(toast.id), 300)
  }

  const styles = {
    success: {
      bg: 'bg-emerald-500/20 border-emerald-500/40',
      icon: <CheckCircle className="w-5 h-5 text-emerald-400" />,
      text: 'text-emerald-300',
    },
    error: {
      bg: 'bg-red-500/20 border-red-500/40',
      icon: <AlertCircle className="w-5 h-5 text-red-400" />,
      text: 'text-red-300',
    },
    info: {
      bg: 'bg-blue-500/20 border-blue-500/40',
      icon: <Info className="w-5 h-5 text-blue-400" />,
      text: 'text-blue-300',
    },
  }

  const style = styles[toast.type]

  return (
    <div
      className={`
        flex items-start gap-3 p-4 rounded-lg border backdrop-blur-md shadow-lg
        ${style.bg}
        ${isExiting ? 'animate-slide-out' : 'animate-slide-up'}
      `}
    >
      {style.icon}
      <p className={`flex-1 text-sm ${style.text}`}>{toast.message}</p>
      <button
        onClick={handleClose}
        className="p-0.5 rounded hover:bg-white/10 transition-colors"
      >
        <X className="w-4 h-4 text-zinc-400" />
      </button>
    </div>
  )
}

// Hook for managing toasts
let toastId = 0

export function useToaster() {
  const [toasts, setToasts] = useState<Toast[]>([])

  const addToast = (message: string, type: ToastType = 'info', duration?: number) => {
    const id = `toast-${++toastId}`
    setToasts((prev) => [...prev, { id, message, type, duration }])
    return id
  }

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }

  const success = (message: string, duration?: number) => addToast(message, 'success', duration)
  const error = (message: string, duration?: number) => addToast(message, 'error', duration)
  const info = (message: string, duration?: number) => addToast(message, 'info', duration)

  return {
    toasts,
    addToast,
    removeToast,
    success,
    error,
    info,
  }
}
