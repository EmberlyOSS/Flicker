import { useState, useMemo } from 'react'
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
 * Get the saved theme name from localStorage
 */
function getSavedThemeName(): string {
  if (typeof window === 'undefined') return 'Stranger Things'
  try {
    return localStorage.getItem(THEME_STORAGE_KEY) || 'Stranger Things'
  } catch {
    return 'Stranger Things'
  }
}

/**
 * Get colors for a theme name
 */
function getThemeColors(themeName: string): ColorConfig {
  const preset = THEME_PRESETS.find((p) => p.name === themeName)
  return preset?.colors || DEFAULT_COLORS
}

// ============================================================================
// SYNCHRONOUS THEME INITIALIZATION - runs before React renders
// ============================================================================
const initialThemeName = getSavedThemeName()
const initialColors = getThemeColors(initialThemeName)

// Apply theme immediately (this runs at module load time)
if (typeof document !== 'undefined') {
  applyColors(initialColors)
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
  // Initialize with the already-applied theme (no flash!)
  const [currentTheme, setCurrentTheme] = useState(initialThemeName)
  const [colors, setColors] = useState<ColorConfig>(initialColors)

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
    presets,
  }
}
