import { useEffect, useCallback, useRef } from 'react'
import { invoke } from '@tauri-apps/api/core'
import { register, unregister, isRegistered } from '@tauri-apps/plugin-global-shortcut'
import { writeText } from '@tauri-apps/plugin-clipboard-manager'
import {
  isPermissionGranted,
  requestPermission,
  sendNotification,
} from '@tauri-apps/plugin-notification'
import { HotkeyConfig, UploadCompleteEvent } from '../types'
import { API_URL } from '../constants'

interface UseHotkeysOptions {
  hotkeys: HotkeyConfig
  uploadToken: string
  visibility: 'PUBLIC' | 'PRIVATE'
  enabled: boolean
  onScreenshotStart?: () => void
  onUploadComplete?: (result: UploadCompleteEvent) => void
  onError?: (error: string) => void
}

export function useHotkeys({
  hotkeys,
  uploadToken,
  visibility,
  enabled,
  onScreenshotStart,
  onUploadComplete,
  onError,
}: UseHotkeysOptions) {
  const registeredShortcuts = useRef<string[]>([])
  const isCapturing = useRef(false)
  
  // Store callbacks in refs to avoid effect re-runs
  const onScreenshotStartRef = useRef(onScreenshotStart)
  const onUploadCompleteRef = useRef(onUploadComplete)
  const onErrorRef = useRef(onError)
  
  // Keep refs up to date
  useEffect(() => {
    onScreenshotStartRef.current = onScreenshotStart
    onUploadCompleteRef.current = onUploadComplete
    onErrorRef.current = onError
  }, [onScreenshotStart, onUploadComplete, onError])

  // Request notification permission on mount
  useEffect(() => {
    async function setupNotifications() {
      try {
        const granted = await isPermissionGranted()
        if (!granted) {
          await requestPermission()
        }
      } catch (e) {
        console.warn('Notification setup failed:', e)
      }
    }
    setupNotifications()
  }, [])

  // Take fullscreen screenshot and upload - use refs to avoid stale closures
  const takeFullscreenScreenshot = useCallback(async () => {
    // Prevent double execution
    if (isCapturing.current) {
      console.log('Screenshot already in progress, skipping')
      return
    }
    
    if (!uploadToken) {
      onErrorRef.current?.('Please configure your upload token first')
      return
    }

    isCapturing.current = true
    console.log('Starting screenshot capture...')

    try {
      onScreenshotStartRef.current?.()

      const result = await invoke<UploadCompleteEvent>('screenshot_and_upload', {
        apiUrl: API_URL,
        uploadToken,
        visibility,
        monitorIndex: null,
      })

      console.log('Screenshot uploaded successfully:', result.url)

      // Copy URL to clipboard
      try {
        await writeText(result.url)
        console.log('URL copied to clipboard')
      } catch (e) {
        console.error('Failed to copy to clipboard:', e)
      }

      // Show notification
      try {
        const granted = await isPermissionGranted()
        if (granted) {
          await sendNotification({
            title: 'Flicker - Screenshot Uploaded!',
            body: 'URL copied to clipboard',
          })
        }
      } catch (notifError) {
        console.error('Notification error:', notifError)
      }

      onUploadCompleteRef.current?.(result)
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error)
      console.error('Screenshot/upload error:', errorMsg)
      
      // Show error notification
      try {
        const granted = await isPermissionGranted()
        if (granted) {
          sendNotification({
            title: 'Flicker - Screenshot Failed',
            body: errorMsg,
          })
        }
      } catch (notifErr) {
        console.error('Notification error:', notifErr)
      }
      
      onErrorRef.current?.(errorMsg)
    } finally {
      isCapturing.current = false
    }
  }, [uploadToken, visibility]) // Only depend on data, not callbacks

  // Store the screenshot function in a ref to avoid re-registrations
  const takeScreenshotRef = useRef(takeFullscreenScreenshot)
  useEffect(() => {
    takeScreenshotRef.current = takeFullscreenScreenshot
  }, [takeFullscreenScreenshot])

  // Register/unregister shortcuts when hotkey config changes
  useEffect(() => {
    if (!enabled) {
      console.log('Hotkeys disabled - no upload token')
      return
    }

    const fullscreenHotkey = hotkeys.screenshotFullscreen
    if (!fullscreenHotkey || fullscreenHotkey.length === 0) {
      console.log('No fullscreen hotkey configured')
      return
    }

    let mounted = true

    async function registerShortcut() {
      // Unregister all existing shortcuts first
      for (const shortcut of registeredShortcuts.current) {
        try {
          await unregister(shortcut)
          console.log('Unregistered old hotkey:', shortcut)
        } catch (e) {
          // Ignore errors when unregistering
        }
      }
      registeredShortcuts.current = []

      if (!mounted) return

      try {
        // Try to register the hotkey
        await register(fullscreenHotkey, (event) => {
          if (event.state === 'Pressed') {
            console.log('Hotkey pressed:', fullscreenHotkey)
            takeScreenshotRef.current()
          }
        })
        registeredShortcuts.current.push(fullscreenHotkey)
        console.log('✓ Registered hotkey:', fullscreenHotkey)
      } catch (e) {
        console.error('✗ Failed to register hotkey:', fullscreenHotkey, e)
        onErrorRef.current?.(`Failed to register hotkey "${fullscreenHotkey}". Try a different combination.`)
      }
    }

    registerShortcut()

    return () => {
      mounted = false
      // Cleanup on unmount
      for (const shortcut of registeredShortcuts.current) {
        unregister(shortcut).catch(() => {})
      }
      registeredShortcuts.current = []
    }
  }, [enabled, hotkeys.screenshotFullscreen]) // Don't depend on callback - use ref instead

  // Note: We don't need Tauri event listeners here since we handle everything
  // directly in takeFullscreenScreenshot via invoke() which returns the result

  return {
    takeFullscreenScreenshot,
  }
}

// Helper to format bytes to human readable
export function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 Bytes'
  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}
