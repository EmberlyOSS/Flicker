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
 * Stranger Things Theme - Purple/Red/Cyan neon (DEFAULT)
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

// Default colors are now the Stranger Things theme
export const DEFAULT_COLORS: ColorConfig = STRANGER_THINGS_THEME

/**
 * Emberly Classic Dark Theme
 * Dark midnight blue base with bright foregrounds
 */
export const EMBERLY_CLASSIC_THEME: ColorConfig = {
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
 * Dracula Theme - Purple/Pink/Green
 */
export const DRACULA_THEME: ColorConfig = {
  background: '231 15% 18%',
  foreground: '60 30% 96%',
  card: '232 14% 20%',
  cardForeground: '60 30% 96%',
  popover: '232 14% 20%',
  popoverForeground: '60 30% 96%',
  primary: '265 89% 78%',
  primaryForeground: '231 15% 18%',
  secondary: '225 27% 28%',
  secondaryForeground: '60 30% 96%',
  muted: '232 14% 25%',
  mutedForeground: '228 8% 62%',
  accent: '135 94% 65%',
  accentForeground: '231 15% 18%',
  destructive: '0 100% 67%',
  destructiveForeground: '60 30% 96%',
  border: '225 27% 24%',
  input: '225 27% 24%',
  ring: '265 89% 78%',
}

/**
 * Tokyo Night Theme - Deep blue with purple accents
 */
export const TOKYO_NIGHT_THEME: ColorConfig = {
  background: '235 21% 13%',
  foreground: '220 13% 91%',
  card: '235 21% 15%',
  cardForeground: '220 13% 91%',
  popover: '235 21% 15%',
  popoverForeground: '220 13% 91%',
  primary: '252 87% 67%',
  primaryForeground: '235 21% 13%',
  secondary: '230 20% 20%',
  secondaryForeground: '220 13% 91%',
  muted: '235 18% 22%',
  mutedForeground: '217 11% 65%',
  accent: '188 97% 66%',
  accentForeground: '235 21% 13%',
  destructive: '348 100% 61%',
  destructiveForeground: '220 13% 91%',
  border: '234 18% 19%',
  input: '234 18% 19%',
  ring: '252 87% 67%',
}

/**
 * Nord Theme - Arctic, bluish-gray
 */
export const NORD_THEME: ColorConfig = {
  background: '220 16% 22%',
  foreground: '218 27% 92%',
  card: '220 16% 24%',
  cardForeground: '218 27% 92%',
  popover: '220 16% 24%',
  popoverForeground: '218 27% 92%',
  primary: '193 43% 67%',
  primaryForeground: '220 16% 22%',
  secondary: '220 16% 28%',
  secondaryForeground: '218 27% 92%',
  muted: '220 16% 30%',
  mutedForeground: '219 28% 75%',
  accent: '179 25% 65%',
  accentForeground: '220 16% 22%',
  destructive: '354 42% 56%',
  destructiveForeground: '218 27% 92%',
  border: '220 16% 28%',
  input: '220 16% 28%',
  ring: '193 43% 67%',
}

/**
 * Sunset Theme - Orange/Pink/Purple gradient feel
 */
export const SUNSET_THEME: ColorConfig = {
  background: '260 30% 8%',
  foreground: '30 100% 96%',
  card: '260 28% 10%',
  cardForeground: '30 100% 96%',
  popover: '260 28% 10%',
  popoverForeground: '30 100% 96%',
  primary: '25 95% 55%',
  primaryForeground: '260 30% 8%',
  secondary: '320 70% 50%',
  secondaryForeground: '30 100% 96%',
  muted: '260 25% 18%',
  mutedForeground: '30 30% 65%',
  accent: '340 82% 52%',
  accentForeground: '30 100% 96%',
  destructive: '0 75% 50%',
  destructiveForeground: '30 100% 96%',
  border: '260 25% 14%',
  input: '260 25% 14%',
  ring: '25 95% 60%',
}

/**
 * Ocean Deep Theme - Deep sea blues and teals
 */
export const OCEAN_DEEP_THEME: ColorConfig = {
  background: '200 50% 6%',
  foreground: '185 30% 94%',
  card: '200 48% 8%',
  cardForeground: '185 30% 94%',
  popover: '200 48% 8%',
  popoverForeground: '185 30% 94%',
  primary: '185 80% 45%',
  primaryForeground: '200 50% 6%',
  secondary: '210 60% 25%',
  secondaryForeground: '185 30% 94%',
  muted: '200 40% 18%',
  mutedForeground: '185 25% 65%',
  accent: '170 75% 40%',
  accentForeground: '200 50% 6%',
  destructive: '0 70% 50%',
  destructiveForeground: '185 30% 94%',
  border: '200 40% 14%',
  input: '200 40% 14%',
  ring: '185 80% 50%',
}

/**
 * Rose Pine Theme - Soft, warm rose colors
 */
export const ROSE_PINE_THEME: ColorConfig = {
  background: '249 22% 12%',
  foreground: '245 50% 91%',
  card: '249 22% 14%',
  cardForeground: '245 50% 91%',
  popover: '249 22% 14%',
  popoverForeground: '245 50% 91%',
  primary: '330 59% 69%',
  primaryForeground: '249 22% 12%',
  secondary: '249 12% 22%',
  secondaryForeground: '245 50% 91%',
  muted: '247 16% 20%',
  mutedForeground: '245 10% 60%',
  accent: '189 43% 73%',
  accentForeground: '249 22% 12%',
  destructive: '343 76% 68%',
  destructiveForeground: '245 50% 91%',
  border: '247 16% 18%',
  input: '247 16% 18%',
  ring: '330 59% 69%',
}

/**
 * Catppuccin Mocha Theme - Warm pastel colors
 */
export const CATPPUCCIN_MOCHA_THEME: ColorConfig = {
  background: '240 21% 15%',
  foreground: '226 64% 88%',
  card: '240 21% 17%',
  cardForeground: '226 64% 88%',
  popover: '240 21% 17%',
  popoverForeground: '226 64% 88%',
  primary: '267 84% 81%',
  primaryForeground: '240 21% 15%',
  secondary: '237 16% 23%',
  secondaryForeground: '226 64% 88%',
  muted: '236 16% 25%',
  mutedForeground: '228 24% 72%',
  accent: '115 54% 76%',
  accentForeground: '240 21% 15%',
  destructive: '343 81% 75%',
  destructiveForeground: '226 64% 88%',
  border: '237 16% 21%',
  input: '237 16% 21%',
  ring: '267 84% 81%',
}

/**
 * Theme presets for easy switching
 */
export const THEME_PRESETS = [
  { name: 'Stranger Things', colors: STRANGER_THINGS_THEME, description: 'Red neon - Hawkins vibes' },
  { name: 'Emberly Classic', colors: EMBERLY_CLASSIC_THEME, description: 'Original midnight blue' },
  { name: 'Dracula', colors: DRACULA_THEME, description: 'Classic purple vampire' },
  { name: 'Tokyo Night', colors: TOKYO_NIGHT_THEME, description: 'Deep blue, purple accents' },
  { name: 'Nord', colors: NORD_THEME, description: 'Arctic bluish-gray' },
  { name: 'Rose Pine', colors: ROSE_PINE_THEME, description: 'Soft warm rose tones' },
  { name: 'Catppuccin', colors: CATPPUCCIN_MOCHA_THEME, description: 'Warm pastel mocha' },
  { name: 'Cyberpunk Neon', colors: CYBERPUNK_NEON_THEME, description: 'Cyan/magenta neon' },
  { name: 'Vaporwave', colors: VAPORWAVE_THEME, description: 'Purple/pink aesthetic' },
  { name: 'Dark Matrix', colors: DARK_MATRIX_THEME, description: 'Green code hacker' },
  { name: 'Aurora Borealis', colors: AURORA_BOREALIS_THEME, description: 'Cyan/green lights' },
  { name: 'Sunset', colors: SUNSET_THEME, description: 'Orange/pink warmth' },
  { name: 'Ocean Deep', colors: OCEAN_DEEP_THEME, description: 'Deep sea blues' },
  { name: 'Christmas', colors: CHRISTMAS_THEME, description: 'Festive red/green' },
  { name: 'Pride', colors: PRIDE_THEME, description: 'Rainbow colors' },
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
