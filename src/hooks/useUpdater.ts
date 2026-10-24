import { useState, useCallback } from 'react'
import { openUrl } from '@tauri-apps/plugin-opener'
import { cachedUpdate, findUpdate, installUpdate } from '../utils/updates'

export interface UpdateInfo {
  available: boolean
  checked?: boolean
  version?: string
  notes?: string
  url?: string
  canInstall?: boolean
  downloading?: boolean
  progress?: number
  error?: string
}

const message = (e: unknown) => (e instanceof Error ? e.message : String(e))

export function useUpdater() {
  const cached = cachedUpdate()
  const [updateInfo, setUpdateInfo] = useState<UpdateInfo>(
    cached ? { available: true, checked: true, ...cached } : { available: false }
  )
  const [checking, setChecking] = useState(false)

  const checkForUpdates = useCallback(async () => {
    setChecking(true)
    try {
      const update = await findUpdate()
      setUpdateInfo(update ? { available: true, checked: true, ...update } : { available: false, checked: true })
    } catch (e) {
      setUpdateInfo({ available: false, checked: true, error: message(e) })
    } finally {
      setChecking(false)
    }
  }, [])

  const installOrDownload = useCallback(async () => {
    if (!updateInfo.canInstall) {
      if (updateInfo.url) await openUrl(updateInfo.url).catch(() => {})
      return
    }
    setUpdateInfo(prev => ({ ...prev, downloading: true, progress: 0, error: undefined }))
    try {
      await installUpdate(progress => setUpdateInfo(prev => ({ ...prev, progress })))
    } catch (e) {
      setUpdateInfo(prev => ({ ...prev, downloading: false, error: message(e) }))
    }
  }, [updateInfo.canInstall, updateInfo.url])

  return { updateInfo, checking, checkForUpdates, installOrDownload }
}
