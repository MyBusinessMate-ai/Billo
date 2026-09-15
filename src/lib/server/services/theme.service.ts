import { saveThemeDoc, subscribeThemeDoc } from '../repositories/theme.repository'
import { db } from '../../firebase'
import type { ThemeConfig } from '../../../types/pos'
export type { ThemeConfig }

export const DEFAULT_LIGHT_THEME: ThemeConfig = {
  themeMode: 'light',
  primaryColor: '#000000',
  secondaryColor: '#006A63',
  buttonHoverColor: '#1F2937',
  backgroundColor: '#F8F9FF',
  textColor: '#0B1C30',
}

export const DEFAULT_DARK_THEME: ThemeConfig = {
  themeMode: 'dark',
  primaryColor: '#38BDF8',
  secondaryColor: '#17262D',
  buttonHoverColor: '#0EA5E9',
  backgroundColor: '#091013',
  textColor: '#EFFAFF',
}

const LOCAL_STORAGE_KEY = 'pos_theme_config'

/**
 * Reads theme from localStorage synchronously for 0-latency instant initialization.
 */
export function getStoredThemeConfig(): ThemeConfig {
  if (typeof window === 'undefined') return DEFAULT_LIGHT_THEME
  try {
    const raw = window.localStorage.getItem(LOCAL_STORAGE_KEY)
    if (raw) {
      const parsed = JSON.parse(raw)
      return {
        themeMode: parsed.themeMode === 'dark' ? 'dark' : 'light',
        primaryColor: parsed.primaryColor || (parsed.themeMode === 'dark' ? '#38BDF8' : '#0891B2'),
        secondaryColor:
          parsed.secondaryColor || (parsed.themeMode === 'dark' ? '#17262D' : '#E2F3F6'),
        buttonHoverColor:
          parsed.buttonHoverColor || (parsed.themeMode === 'dark' ? '#0EA5E9' : '#0E7490'),
        backgroundColor:
          parsed.backgroundColor || (parsed.themeMode === 'dark' ? '#091013' : '#F5F8FA'),
        textColor: parsed.textColor || (parsed.themeMode === 'dark' ? '#EFFAFF' : '#132027'),
      }
    }
  } catch (err) {
    console.warn('[ThemeService] Failed to read localStorage theme:', err)
  }
  return DEFAULT_LIGHT_THEME
}

/**
 * Writes theme to localStorage synchronously.
 */
export function storeThemeConfigLocally(theme: ThemeConfig): void {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(theme))
  } catch (err) {
    console.warn('[ThemeService] Failed to write localStorage theme:', err)
  }
}

function hexToRgb(hex: string): { r: number; g: number; b: number } {
  let cleaned = (hex || '').replace('#', '').trim()
  if (cleaned.length === 3) {
    cleaned = cleaned
      .split('')
      .map((c) => c + c)
      .join('')
  }
  const num = parseInt(cleaned, 16)
  if (isNaN(num) || cleaned.length !== 6) {
    return { r: 128, g: 128, b: 128 }
  }
  return {
    r: (num >> 16) & 255,
    g: (num >> 8) & 255,
    b: num & 255,
  }
}

function rgbToHex(r: number, g: number, b: number): string {
  const clamp = (n: number) => Math.max(0, Math.min(255, Math.round(n)))
  return `#${((1 << 24) + (clamp(r) << 16) + (clamp(g) << 8) + clamp(b)).toString(16).slice(1)}`
}

function blendHex(hex1: string, hex2: string, weight: number): string {
  const c1 = hexToRgb(hex1)
  const c2 = hexToRgb(hex2)
  const w = Math.max(0, Math.min(1, weight))
  return rgbToHex(c1.r * (1 - w) + c2.r * w, c1.g * (1 - w) + c2.g * w, c1.b * (1 - w) + c2.b * w)
}

export function isHexDark(hex: string): boolean {
  if (!hex) return false
  const { r, g, b } = hexToRgb(hex)
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255
  return luminance < 0.5
}

/**
 * Applies all CSS variables and root attributes cleanly into the DOM.
 */
export function applyThemeToDOM(theme: ThemeConfig): void {
  if (typeof document === 'undefined') return
  const root = document.documentElement
  const isDark = theme.backgroundColor
    ? isHexDark(theme.backgroundColor)
    : theme.themeMode === 'dark'

  // 1. Root class and data-theme
  if (isDark) {
    root.classList.add('dark')
    root.classList.remove('light')
    root.setAttribute('data-theme', 'dark')
    root.style.colorScheme = 'dark'
  } else {
    root.classList.remove('dark')
    root.classList.add('light')
    root.setAttribute('data-theme', 'light')
    root.style.colorScheme = 'light'
  }

  const prim = theme.primaryColor || (isDark ? '#38BDF8' : '#0891B2')
  const sec = theme.secondaryColor || (isDark ? '#17262D' : '#E2F3F6')
  const bg = theme.backgroundColor || (isDark ? '#110C0B' : '#F5F8FA')
  const text = theme.textColor || (isDark ? '#FFF3EE' : '#132027')
  const hover = theme.buttonHoverColor || (isDark ? '#D95638' : '#0E7490')

  // 2. Action & Accent colors
  root.style.setProperty('--color-primary', prim)
  root.style.setProperty('--color-secondary', sec)
  root.style.setProperty('--color-on-primary-fixed-variant', hover)

  // 3. Background and Typography surfaces
  root.style.setProperty('--color-surface', bg)
  root.style.setProperty('--color-background', bg)
  root.style.setProperty('--color-on-surface', text)

  if (isDark) {
    // Dynamic Dark Theme Palette derivation (all cards, sidebars, borders harmonize with dark bg & secondary)
    const containerLowest = blendHex(bg, sec, 0.2)
    const containerLow = blendHex(bg, sec, 0.45)
    const container = sec
    const containerHigh = blendHex(sec, prim, 0.22)
    const containerHighest = blendHex(sec, prim, 0.38)
    const outlineVar = blendHex(sec, text, 0.32)
    const outline = blendHex(sec, text, 0.55)
    const textVariant = blendHex(text, bg, 0.35)

    root.style.setProperty('--color-surface-container-lowest', containerLowest)
    root.style.setProperty('--color-surface-container-low', containerLow)
    root.style.setProperty('--color-surface-container', container)
    root.style.setProperty('--color-surface-container-high', containerHigh)
    root.style.setProperty('--color-surface-container-highest', containerHighest)
    root.style.setProperty('--color-secondary-container', sec)
    root.style.setProperty('--color-on-secondary-container', blendHex(text, sec, 0.2))
    root.style.setProperty('--color-outline-variant', outlineVar)
    root.style.setProperty('--color-outline', outline)
    root.style.setProperty('--color-on-surface-variant', textVariant)
    root.style.setProperty('--color-inverse-surface', text)
    root.style.setProperty('--color-inverse-on-surface', bg)
    root.style.setProperty('--color-primary-container', blendHex(sec, prim, 0.35))
    root.style.setProperty('--color-on-primary-container', text)
  } else {
    // Dynamic Light Theme Palette derivation (cards, sidebars, headers harmonize with light bg & secondary)
    const containerLowest = '#ffffff'
    const containerLow = blendHex(bg, sec, 0.45)
    const container = sec
    const containerHigh = blendHex(sec, prim, 0.15)
    const containerHighest = blendHex(sec, prim, 0.28)
    const outlineVar = blendHex(sec, text, 0.25)
    const outline = blendHex(sec, text, 0.55)
    const textVariant = blendHex(text, bg, 0.4)

    root.style.setProperty('--color-surface-container-lowest', containerLowest)
    root.style.setProperty('--color-surface-container-low', containerLow)
    root.style.setProperty('--color-surface-container', container)
    root.style.setProperty('--color-surface-container-high', containerHigh)
    root.style.setProperty('--color-surface-container-highest', containerHighest)
    root.style.setProperty('--color-secondary-container', sec)
    root.style.setProperty('--color-on-secondary-container', blendHex(prim, '#000000', 0.25))
    root.style.setProperty('--color-outline-variant', outlineVar)
    root.style.setProperty('--color-outline', outline)
    root.style.setProperty('--color-on-surface-variant', textVariant)
    root.style.setProperty('--color-inverse-surface', text)
    root.style.setProperty('--color-inverse-on-surface', bg)
    root.style.setProperty('--color-primary-container', blendHex(sec, prim, 0.25))
    root.style.setProperty('--color-on-primary-container', prim)
  }
}

export const themeService = {
  getInitialTheme(): ThemeConfig {
    return getStoredThemeConfig()
  },

  subscribe(onData: (theme: ThemeConfig) => void, onError?: (err: Error) => void) {
    return subscribeThemeDoc((doc) => {
      if (doc) {
        const theme: ThemeConfig = {
          themeMode: doc.themeMode || 'light',
          primaryColor: doc.primaryColor || (doc.themeMode === 'dark' ? '#38BDF8' : '#0891B2'),
          secondaryColor: doc.secondaryColor || (doc.themeMode === 'dark' ? '#17262D' : '#E2F3F6'),
          buttonHoverColor:
            doc.buttonHoverColor || (doc.themeMode === 'dark' ? '#0EA5E9' : '#0E7490'),
          backgroundColor:
            doc.backgroundColor || (doc.themeMode === 'dark' ? '#091013' : '#F5F8FA'),
          textColor: doc.textColor || (doc.themeMode === 'dark' ? '#EFFAFF' : '#132027'),
        }
        storeThemeConfigLocally(theme)
        applyThemeToDOM(theme)
        onData(theme)
      }
    }, onError)
  },

  async save(theme: ThemeConfig): Promise<void> {
    // 1. Immediately cache in localStorage and DOM for zero latency
    storeThemeConfigLocally(theme)
    applyThemeToDOM(theme)

    // 2. Persist to Firestore dedicated 'themes' collection
    if (db) {
      try {
        await saveThemeDoc(theme)
      } catch (err) {
        console.warn('[ThemeService] Failed to save to Firestore themes collection:', err)
      }
    }
  },
}
