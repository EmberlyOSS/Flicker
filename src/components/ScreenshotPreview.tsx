import { useEffect } from 'react'
import { UploadCompleteEvent } from '../types'

interface ScreenshotPreviewProps {
  upload: UploadCompleteEvent | null
  onClose: () => void
  autoCloseMs?: number
}

// This component is kept for compatibility but notifications are now handled in useHotkeys
export function ScreenshotPreview({
  upload,
  onClose,
  autoCloseMs = 5000,
}: ScreenshotPreviewProps) {
  useEffect(() => {
    if (!upload) return

    // Auto-close after delay
    const timer = setTimeout(() => {
      onClose()
    }, autoCloseMs)

    return () => clearTimeout(timer)
  }, [upload, autoCloseMs, onClose])

  // Notifications handled by useHotkeys, this just manages the state cleanup
  return null
}
