import { useCallback, useRef, useState, useEffect } from 'react'

const STORAGE_KEY = 'emberly_sound_prefs'

interface SoundPreferences {
  enabled: boolean
  uploadSuccess: boolean
  uploadError: boolean
  copyLink: boolean
  settingsSave: boolean
  notification: boolean
}

const DEFAULT_PREFS: SoundPreferences = {
  enabled: true,
  uploadSuccess: true,
  uploadError: true,
  copyLink: true,
  settingsSave: true,
  notification: true,
}

// Simple beep using Web Audio API - no external files needed
function playBeep(frequency: number, duration: number, type: OscillatorType = 'sine') {
  try {
    const ctx = new AudioContext()
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()

    osc.type = type
    osc.frequency.value = frequency
    gain.gain.value = 0.1

    osc.connect(gain)
    gain.connect(ctx.destination)

    osc.start()
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration)
    osc.stop(ctx.currentTime + duration)
  } catch {
    // Audio not supported
  }
}

export function useSounds() {
  const [preferences, setPreferences] = useState<SoundPreferences>(DEFAULT_PREFS)
  const [loaded, setLoaded] = useState(false)
  const prefsRef = useRef(preferences)

  // Load preferences from localStorage
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      if (stored) {
        const parsed = JSON.parse(stored)
        setPreferences({ ...DEFAULT_PREFS, ...parsed })
      }
    } catch { }
    setLoaded(true)
  }, [])

  // Keep ref updated
  useEffect(() => {
    prefsRef.current = preferences
  }, [preferences])

  const savePreferences = useCallback((updates: Partial<SoundPreferences>) => {
    setPreferences(prev => {
      const updated = { ...prev, ...updates }
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated))
      return updated
    })
  }, [])

  // Sound players - use simple beeps
  const playUploadSuccess = useCallback(() => {
    if (prefsRef.current.enabled && prefsRef.current.uploadSuccess) {
      playBeep(880, 0.15, 'sine') // A5
      setTimeout(() => playBeep(1108, 0.2, 'sine'), 100) // C#6
    }
  }, [])

  const playUploadError = useCallback(() => {
    if (prefsRef.current.enabled && prefsRef.current.uploadError) {
      playBeep(220, 0.3, 'sawtooth') // Low A
    }
  }, [])

  const playCopyLink = useCallback(() => {
    if (prefsRef.current.enabled && prefsRef.current.copyLink) {
      playBeep(660, 0.1, 'sine') // E5
    }
  }, [])

  const playSettingsSave = useCallback(() => {
    if (prefsRef.current.enabled && prefsRef.current.settingsSave) {
      playBeep(523, 0.1, 'sine') // C5
      setTimeout(() => playBeep(659, 0.15, 'sine'), 80) // E5
    }
  }, [])

  const playNotification = useCallback(() => {
    if (prefsRef.current.enabled && prefsRef.current.notification) {
      playBeep(440, 0.15, 'triangle') // A4
    }
  }, [])

  return {
    preferences,
    savePreferences,
    loaded,
    playUploadSuccess,
    playUploadError,
    playCopyLink,
    playSettingsSave,
    playNotification,
  }
}
