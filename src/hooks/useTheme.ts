import { useEffect, useState, useMemo } from 'react'
import { DEFAULT_COLORS, THEME_PRESETS, type ColorConfig, hslToHex } from '../colors'

const THEME_STORAGE_KEY = 'emberly-uploader-theme'

/**
 * Convert HSL string (e.g., "222.2 84% 4.9%") to hex color
 */
function hslStringToHex(hslString: string): string {
  const parts = hslString.split(' ')
  if (parts.length >= 3) {
    const h = parseFloat(parts[0])
    const s = parseFloat(parts[1].replace('%', ''))
    const l = parseFloat(parts[2].replace('%', ''))
    return hslToHex(h, s, l)
  }
  return '#000000'
}

export interface ThemePreset {
  name: string
  label: string
  description: string
  primary: string
  secondary: string
  background: string
  colors: ColorConfig
}

export function useTheme() {
  const [currentTheme, setCurrentTheme] = useState('Default Dark')
  const [colors, setColors] = useState<ColorConfig>(DEFAULT_COLORS)

  // Transform presets to include hex colors for UI previews
  const presets: ThemePreset[] = useMemo(() => 
    THEME_PRESETS.map(preset => ({
      name: preset.name,
      label: preset.name,
      description: preset.description,
      primary: hslStringToHex(preset.colors.primary),
      secondary: hslStringToHex(preset.colors.secondary),
      background: hslStringToHex(preset.colors.background),
      colors: preset.colors,
    })),
  [])

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
