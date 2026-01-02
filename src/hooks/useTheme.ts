import { useEffect, useState } from 'react'
import { DEFAULT_COLORS, THEME_PRESETS, type ColorConfig } from '../colors'

const THEME_STORAGE_KEY = 'emberly-uploader-theme'

export function useTheme() {
  const [currentTheme, setCurrentTheme] = useState('Default Dark')
  const [colors, setColors] = useState<ColorConfig>(DEFAULT_COLORS)

  // Load theme from localStorage on mount
  useEffect(() => {
    const savedTheme = localStorage.getItem(THEME_STORAGE_KEY)
    if (savedTheme) {
      const preset = THEME_PRESETS.find((p) => p.name === savedTheme)
      if (preset) {
        setCurrentTheme(preset.name)
        applyColors(preset.colors)
        setColors(preset.colors)
      }
    } else {
      applyColors(DEFAULT_COLORS)
    }
  }, [])

  /**
   * Apply CSS variables to :root
   */
  function applyColors(colorConfig: ColorConfig) {
    Object.entries(colorConfig).forEach(([key, value]) => {
      const cssKey = key.replace(/([A-Z])/g, '-$1').toLowerCase()
      document.documentElement.style.setProperty(`--${cssKey}`, value)
    })
  }

  /**
   * Switch to a different theme preset
   */
  function switchTheme(themeName: string) {
    const preset = THEME_PRESETS.find((p) => p.name === themeName)
    if (preset) {
      setCurrentTheme(preset.name)
      setColors(preset.colors)
      applyColors(preset.colors)
      localStorage.setItem(THEME_STORAGE_KEY, preset.name)
    }
  }

  /**
   * Update custom color and apply
   */
  function updateColor(colorKey: keyof ColorConfig, value: string) {
    const updated = { ...colors, [colorKey]: value }
    setColors(updated)
    applyColors(updated)
  }

  return {
    currentTheme,
    colors,
    switchTheme,
    updateColor,
    presets: THEME_PRESETS,
  }
}
