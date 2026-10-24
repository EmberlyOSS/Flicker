import { useCallback, useState } from 'react'
import { DEFAULT_SOUND_PREFS, SOUND_STORAGE_KEY, loadSoundPrefs, playSound, type SoundPreferences } from '../utils/sounds'

export function useSounds() {
  const [preferences, setPreferences] = useState<SoundPreferences>(loadSoundPrefs)

  const savePreferences = useCallback((updates: Partial<SoundPreferences>) => {
    setPreferences(prev => {
      const updated = { ...DEFAULT_SOUND_PREFS, ...prev, ...updates }
      localStorage.setItem(SOUND_STORAGE_KEY, JSON.stringify(updated))
      return updated
    })
  }, [])

  return {
    preferences,
    savePreferences,
    loaded: true,
    playUploadSuccess: useCallback(() => playSound('uploadSuccess'), []),
    playUploadError: useCallback(() => playSound('uploadError'), []),
    playCopyLink: useCallback(() => playSound('copyLink'), []),
    playSettingsSave: useCallback(() => playSound('settingsSave'), []),
    playNotification: useCallback(() => playSound('notification'), []),
    playCapture: useCallback(() => playSound('capture'), []),
  }
}
