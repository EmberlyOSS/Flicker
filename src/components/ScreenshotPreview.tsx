import { useEffect } from 'react'
import { UploadCompleteEvent } from '../types'

interface ScreenshotPreviewProps {
  upload: UploadCompleteEvent | null
  onClose: () => void
  autoCloseMs?: number
}

export function ScreenshotPreview({
  upload,
  onClose,
  autoCloseMs = 5000,
}: ScreenshotPreviewProps) {
  useEffect(() => {
    if (!upload) return

    const timer = setTimeout(() => {
      onClose()
    }, autoCloseMs)

    return () => clearTimeout(timer)
  }, [upload, autoCloseMs, onClose])

  return null
}
