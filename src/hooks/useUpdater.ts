import { useState, useCallback } from 'react'
import { check } from '@tauri-apps/plugin-updater'
import { relaunch } from '@tauri-apps/plugin-process'
import { APP_VERSION } from '../constants'

export interface UpdateInfo {
  available: boolean
  version?: string
  notes?: string
  date?: string
  downloading?: boolean
  progress?: number
  error?: string
}

export function useUpdater() {
  const [updateInfo, setUpdateInfo] = useState<UpdateInfo>({ available: false })
  const [checking, setChecking] = useState(false)

  const checkForUpdates = useCallback(async () => {
    setChecking(true)
    setUpdateInfo({ available: false })

    try {
      const update = await check()
      
      if (update) {
        setUpdateInfo({
          available: true,
          version: update.version,
          notes: update.body || undefined,
          date: update.date || undefined,
        })
        return update
      } else {
        setUpdateInfo({ available: false })
        return null
      }
    } catch (error) {
      console.error('Update check failed:', error)
      // Don't show error to user for update checks - just silently fail
      setUpdateInfo({ available: false })
      return null
    } finally {
      setChecking(false)
    }
  }, [])

  const downloadAndInstall = useCallback(async () => {
    try {
      const update = await check()
      if (!update) return

      setUpdateInfo(prev => ({ ...prev, downloading: true, progress: 0 }))

      // Track download progress
      let downloaded = 0
      let contentLength = 0

      // Download with progress
      await update.downloadAndInstall((event) => {
        switch (event.event) {
          case 'Started':
            contentLength = (event.data as { contentLength?: number }).contentLength || 0
            setUpdateInfo(prev => ({ ...prev, progress: 0 }))
            break
          case 'Progress':
            downloaded += event.data.chunkLength
            const progress = contentLength > 0
              ? Math.round((downloaded / contentLength) * 100)
              : 0
            setUpdateInfo(prev => ({ ...prev, progress }))
            break
          case 'Finished':
            setUpdateInfo(prev => ({ ...prev, progress: 100 }))
            break
        }
      })

      // Relaunch the app
      await relaunch()
    } catch (error) {
      console.error('Update failed:', error)
      setUpdateInfo(prev => ({
        ...prev,
        downloading: false,
        error: error instanceof Error ? error.message : 'Update failed',
      }))
    }
  }, [])

  // Manual check only - splash screen handles startup check
  // Call checkForUpdates() manually when needed

  return {
    updateInfo,
    checking,
    checkForUpdates,
    downloadAndInstall,
    currentVersion: APP_VERSION,
  }
}
