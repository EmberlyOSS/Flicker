import { useState, useMemo } from 'react'
import { DEFAULT_COLORS, DEFAULT_THEME_NAME, THEME_PRESETS, type ColorConfig, hslToHex } from '../colors'

const THEME_STORAGE_KEY = 'emberly-uploader-theme'
const EMBER_MIGRATION_KEY = 'flicker-ember-theme-migrated'

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

function applyColors(colorConfig: ColorConfig) {
  Object.entries(colorConfig).forEach(([key, value]) => {
    const cssKey = key.replace(/([A-Z])/g, '-$1').toLowerCase()
    document.documentElement.style.setProperty(`--${cssKey}`, value)
  })
}

function getSavedThemeName(): string {
  if (typeof window === 'undefined') return DEFAULT_THEME_NAME
  try {
    if (!localStorage.getItem(EMBER_MIGRATION_KEY)) {
      localStorage.setItem(THEME_STORAGE_KEY, DEFAULT_THEME_NAME)
      localStorage.setItem(EMBER_MIGRATION_KEY, '1')
    }
    return localStorage.getItem(THEME_STORAGE_KEY) || DEFAULT_THEME_NAME
  } catch {
    return DEFAULT_THEME_NAME
  }
}

function getThemeColors(themeName: string): ColorConfig {
  const preset = THEME_PRESETS.find((p) => p.name === themeName)
  return preset?.colors || DEFAULT_COLORS
}

const initialThemeName = getSavedThemeName()
const initialColors = getThemeColors(initialThemeName)

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
  const [currentTheme, setCurrentTheme] = useState(initialThemeName)
  const [colors, setColors] = useState<ColorConfig>(initialColors)

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

  function switchTheme(themeName: string) {
    const preset = THEME_PRESETS.find((p) => p.name === themeName)
    if (preset) {
      setCurrentTheme(preset.name)
      setColors(preset.colors)
      applyColors(preset.colors)
      localStorage.setItem(THEME_STORAGE_KEY, preset.name)
    }
  }

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
