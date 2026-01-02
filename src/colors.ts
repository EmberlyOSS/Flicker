/**
 * Emberly Color System - Extracted from main website theme system
 * Uses HSL format: "hue saturation% lightness%"
 * All colors are CSS variables that get injected into :root
 */

export interface ColorConfig {
  background: string
  foreground: string
  card: string
  cardForeground: string
  popover: string
  popoverForeground: string
  primary: string
  primaryForeground: string
  secondary: string
  secondaryForeground: string
  muted: string
  mutedForeground: string
  accent: string
  accentForeground: string
  destructive: string
  destructiveForeground: string
  border: string
  input: string
  ring: string
}

/**
 * Default Emberly Dark Theme Colors
 * Dark midnight blue base with bright foregrounds
 */
export const DEFAULT_COLORS: ColorConfig = {
  background: '222.2 84% 4.9%',
  foreground: '210 40% 98%',
  card: '222.2 84% 4.9%',
  cardForeground: '210 40% 98%',
  popover: '222.2 84% 4.9%',
  popoverForeground: '210 40% 98%',
  primary: '210 40% 98%',
  primaryForeground: '222.2 47.4% 11.2%',
  secondary: '217.2 32.6% 17.5%',
  secondaryForeground: '210 40% 98%',
  muted: '217.2 32.6% 17.5%',
  mutedForeground: '215 20.2% 65.1%',
  accent: '217.2 32.6% 17.5%',
  accentForeground: '210 40% 98%',
  destructive: '0 62.8% 30.6%',
  destructiveForeground: '210 40% 98%',
  border: '217.2 32.6% 17.5%',
  input: '217.2 32.6% 17.5%',
  ring: '212.7 26.8% 83.9%',
}

/**
 * Stranger Things Theme - Purple/Red/Cyan neon
 */
export const STRANGER_THINGS_THEME: ColorConfig = {
  background: '232 36% 6%',
  foreground: '210 40% 96%',
  card: '230 32% 8%',
  cardForeground: '210 40% 96%',
  popover: '230 32% 8%',
  popoverForeground: '210 40% 96%',
  primary: '354 82% 52%',
  primaryForeground: '210 40% 98%',
  secondary: '230 28% 16%',
  secondaryForeground: '210 40% 96%',
  muted: '232 20% 24%',
  mutedForeground: '215 16% 72%',
  accent: '197 92% 54%',
  accentForeground: '222 47% 12%',
  destructive: '354 82% 45%',
  destructiveForeground: '210 40% 98%',
  border: '230 30% 14%',
  input: '230 30% 14%',
  ring: '197 100% 60%',
}

/**
 * Christmas Theme - Red/Green/Gold
 */
export const CHRISTMAS_THEME: ColorConfig = {
  background: '140 40% 6%',
  foreground: '210 40% 98%',
  card: '140 36% 8%',
  cardForeground: '210 40% 98%',
  popover: '140 36% 8%',
  popoverForeground: '210 40% 98%',
  primary: '0 75% 48%',
  primaryForeground: '210 40% 98%',
  secondary: '45 90% 45%',
  secondaryForeground: '210 40% 98%',
  muted: '140 30% 18%',
  mutedForeground: '215 20% 65.1%',
  accent: '30 90% 48%',
  accentForeground: '210 40% 98%',
  destructive: '0 85% 48%',
  destructiveForeground: '210 40% 98%',
  border: '140 30% 14%',
  input: '140 30% 14%',
  ring: '45 90% 60%',
}

/**
 * Pride Theme - Rainbow colors
 */
export const PRIDE_THEME: ColorConfig = {
  background: '220 18% 10%',
  foreground: '210 40% 98%',
  card: '220 18% 12%',
  cardForeground: '210 40% 98%',
  popover: '220 18% 12%',
  popoverForeground: '210 40% 98%',
  primary: '300 82% 55%',
  primaryForeground: '210 40% 98%',
  secondary: '50 95% 48%',
  secondaryForeground: '210 40% 98%',
  muted: '200 90% 16%',
  mutedForeground: '215 20% 65.1%',
  accent: '0 85% 48%',
  accentForeground: '210 40% 98%',
  destructive: '345 80% 45%',
  destructiveForeground: '210 40% 98%',
  border: '220 18% 14%',
  input: '220 18% 14%',
  ring: '300 82% 60%',
}

/**
 * Aurora Borealis Theme - Cyan/Green/Purple
 */
export const AURORA_BOREALIS_THEME: ColorConfig = {
  background: '240 40% 6%',
  foreground: '210 40% 98%',
  card: '240 38% 8%',
  cardForeground: '210 40% 98%',
  popover: '240 38% 8%',
  popoverForeground: '210 40% 98%',
  primary: '180 100% 45%',
  primaryForeground: '240 40% 6%',
  secondary: '120 100% 48%',
  secondaryForeground: '240 40% 6%',
  muted: '240 30% 18%',
  mutedForeground: '215 20% 65.1%',
  accent: '300 100% 50%',
  accentForeground: '240 40% 6%',
  destructive: '0 100% 50%',
  destructiveForeground: '210 40% 98%',
  border: '240 30% 14%',
  input: '240 30% 14%',
  ring: '180 100% 55%',
}

/**
 * Cyberpunk Neon Theme - Cyan/Magenta
 */
export const CYBERPUNK_NEON_THEME: ColorConfig = {
  background: '270 20% 5%',
  foreground: '210 40% 98%',
  card: '270 25% 8%',
  cardForeground: '210 40% 98%',
  popover: '270 25% 8%',
  popoverForeground: '210 40% 98%',
  primary: '180 100% 45%',
  primaryForeground: '270 20% 5%',
  secondary: '300 100% 50%',
  secondaryForeground: '270 20% 5%',
  muted: '270 20% 18%',
  mutedForeground: '215 20% 65.1%',
  accent: '0 100% 50%',
  accentForeground: '270 20% 5%',
  destructive: '0 100% 50%',
  destructiveForeground: '210 40% 98%',
  border: '270 20% 16%',
  input: '270 20% 16%',
  ring: '180 100% 60%',
}

/**
 * Dark Matrix Theme - Green code theme
 */
export const DARK_MATRIX_THEME: ColorConfig = {
  background: '120 40% 5%',
  foreground: '120 100% 90%',
  card: '120 35% 7%',
  cardForeground: '120 100% 90%',
  popover: '120 35% 7%',
  popoverForeground: '120 100% 90%',
  primary: '120 100% 50%',
  primaryForeground: '120 40% 5%',
  secondary: '220 30% 15%',
  secondaryForeground: '120 100% 90%',
  muted: '120 30% 16%',
  mutedForeground: '120 80% 70%',
  accent: '60 100% 50%',
  accentForeground: '120 40% 5%',
  destructive: '0 100% 45%',
  destructiveForeground: '120 100% 90%',
  border: '120 30% 12%',
  input: '120 30% 12%',
  ring: '120 100% 60%',
}

/**
 * Vaporwave Theme - Purple/Pink/Cyan
 */
export const VAPORWAVE_THEME: ColorConfig = {
  background: '300 40% 8%',
  foreground: '210 40% 98%',
  card: '300 35% 10%',
  cardForeground: '210 40% 98%',
  popover: '300 35% 10%',
  popoverForeground: '210 40% 98%',
  primary: '280 80% 50%',
  primaryForeground: '300 40% 8%',
  secondary: '180 90% 45%',
  secondaryForeground: '300 40% 8%',
  muted: '300 30% 18%',
  mutedForeground: '215 20% 65.1%',
  accent: '20 100% 50%',
  accentForeground: '300 40% 8%',
  destructive: '0 100% 50%',
  destructiveForeground: '210 40% 98%',
  border: '300 30% 14%',
  input: '300 30% 14%',
  ring: '280 100% 60%',
}

/**
 * Theme presets for easy switching
 */
export const THEME_PRESETS = [
  { name: 'Default Dark', colors: DEFAULT_COLORS, description: 'Emberly default - midnight blue' },
  { name: 'Stranger Things', colors: STRANGER_THINGS_THEME, description: 'Purple/red neon theme' },
  { name: 'Christmas', colors: CHRISTMAS_THEME, description: 'Red/green holiday theme' },
  { name: 'Pride', colors: PRIDE_THEME, description: 'Rainbow pride colors' },
  { name: 'Aurora Borealis', colors: AURORA_BOREALIS_THEME, description: 'Cyan/green aurora lights' },
  { name: 'Cyberpunk Neon', colors: CYBERPUNK_NEON_THEME, description: 'Cyan/magenta neon' },
  { name: 'Dark Matrix', colors: DARK_MATRIX_THEME, description: 'Green code theme' },
  { name: 'Vaporwave', colors: VAPORWAVE_THEME, description: 'Purple/pink/cyan aesthetic' },
]

/**
 * Convert HSL to Hex color
 * Used for color picker compatibility
 */
export function hslToHex(h: number, s: number, l: number): string {
  l = l / 100
  const a = (s * Math.min(l, 1 - l)) / 100
  const f = (n: number) => {
    const k = (n + h / 30) % 12
    const color = l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1)
    return Math.round(255 * color)
      .toString(16)
      .padStart(2, '0')
  }
  return `#${f(0)}${f(8)}${f(4)}`.toUpperCase()
}

/**
 * Convert Hex to HSL string
 * Used for color picker compatibility
 */
export function hexToHSL(hex: string): string {
  const parts = hex.replace(/^#/, '').split('')
  if (parts.length === 6) {
    const [r, g, b] = [parts.slice(0, 2), parts.slice(2, 4), parts.slice(4, 6)].map((x) =>
      parseInt(x.join(''), 16) / 255
    )
    const max = Math.max(r, g, b)
    const min = Math.min(r, g, b)
    let h = 0
    let s = 0
    const l = (max + min) / 2

    if (max !== min) {
      const d = max - min
      s = l > 0.5 ? d / (2 - max - min) : d / (max + min)
      switch (max) {
        case r:
          h = ((g - b) / d + (g < b ? 6 : 0)) / 6
          break
        case g:
          h = ((b - r) / d + 2) / 6
          break
        case b:
          h = ((r - g) / d + 4) / 6
          break
      }
    }

    return `${Math.round(h * 360)} ${Math.round(s * 100)}% ${Math.round(l * 100)}%`
  }

  return '0 0% 0%'
}
