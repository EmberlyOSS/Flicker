import { useEffect } from 'react'
import { AppearanceConfig } from '../types'

const STORAGE_KEY = 'flicker_appearance'

const FONT_FAMILIES = {
  system: '-apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, sans-serif',
  inter: '"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, sans-serif',
  roboto: '"Roboto", -apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, sans-serif',
  mono: '"JetBrains Mono", "Fira Code", "Consolas", monospace',
  poppins: '"Poppins", -apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, sans-serif',
}

const DEFAULT_APPEARANCE: AppearanceConfig = {
  theme: 'hawkins-neon',
  backgroundOpacity: 1,
  fontScale: 'medium',
  fontFamily: 'system',
  borderRadius: 'medium',
  sidebarPosition: 'left',
  compactMode: false,
  animations: true,
  glassEffect: true,
}

export function useAppearance() {
  useEffect(() => {
    applyAppearance(loadAppearance())
  }, [])

  return {
    loadAppearance,
    saveAppearance,
    applyAppearance,
    DEFAULT_APPEARANCE,
  }
}

export function loadAppearance(): AppearanceConfig {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored) {
      return { ...DEFAULT_APPEARANCE, ...JSON.parse(stored) }
    }
  } catch (e) {
    console.debug('Failed to load appearance settings')
  }
  return DEFAULT_APPEARANCE
}

export function saveAppearance(config: Partial<AppearanceConfig>) {
  const current = loadAppearance()
  const updated = { ...current, ...config }
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated))
    applyAppearance(updated)
  } catch (e) {
    console.debug('Failed to save appearance settings')
  }
  return updated
}

/**
 * Simple function to Apply Appearance Changes.
 * 
 */
export function applyAppearance(config: AppearanceConfig) {
  const root = document.documentElement
  const fontKey = config.fontFamily || 'system'
  const radiusMap = { none: '0px', small: '0.25rem', medium: '0.5rem', large: '0.75rem' }
  const radiusKey = config.borderRadius || 'medium'

  root.setAttribute('data-font', fontKey)
  root.style.setProperty('--font-family', FONT_FAMILIES[fontKey as keyof typeof FONT_FAMILIES] || FONT_FAMILIES.system)
  root.setAttribute('data-font-size', config.fontScale || 'medium')
  root.setAttribute('data-radius', radiusKey)
  root.style.setProperty('--radius', radiusMap[radiusKey as keyof typeof radiusMap] || '0.5rem')
  root.setAttribute('data-animations', String(config.animations ?? true))
  root.setAttribute('data-glass', String(config.glassEffect ?? true))
  root.setAttribute('data-compact', String(config.compactMode ?? false))
  root.setAttribute('data-sidebar', config.sidebarPosition || 'left')
}
