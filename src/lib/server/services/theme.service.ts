import { saveThemeDoc, subscribeThemeDoc } from '../repositories/theme.repository'
import { db } from '../../firebase'
import type { ThemeConfig } from '../../../types/pos'
export type { ThemeConfig }

export const DEFAULT_LIGHT_THEME: ThemeConfig = {
  themeMode: 'light',
  primaryColor: '#000000',
  secondaryColor: '#006a63',
  buttonHoverColor: '#1f2937',
  backgroundColor: '#f8f9ff',
  textColor: '#0b1c30',
}

export const DEFAULT_DARK_THEME: ThemeConfig = {
  themeMode: 'dark',
  primaryColor: '#000000',
  secondaryColor: '#006a63',
  buttonHoverColor: '#1f2937',
  backgroundColor: '#0b1326',
  textColor: '#f1f5f9',
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
        primaryColor: parsed.primaryColor || DEFAULT_LIGHT_THEME.primaryColor,
        secondaryColor: parsed.secondaryColor || DEFAULT_LIGHT_THEME.secondaryColor,
        buttonHoverColor: parsed.buttonHoverColor || DEFAULT_LIGHT_THEME.buttonHoverColor,
        backgroundColor:
          parsed.backgroundColor || (parsed.themeMode === 'dark' ? '#0b1326' : '#f8f9ff'),
        textColor: parsed.textColor || (parsed.themeMode === 'dark' ? '#f1f5f9' : '#0b1c30'),
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

/**
 * Applies all CSS variables and root attributes cleanly into the DOM.
 */
export function applyThemeToDOM(theme: ThemeConfig): void {
  if (typeof document === 'undefined') return
  const root = document.documentElement
  const isDark = theme.themeMode === 'dark'

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

  // 2. Action & Accent colors
  if (theme.primaryColor) {
    root.style.setProperty('--color-primary', theme.primaryColor)
  }
  if (theme.secondaryColor) {
    root.style.setProperty('--color-secondary', theme.secondaryColor)
  }
  if (theme.buttonHoverColor) {
    root.style.setProperty('--color-on-primary-fixed-variant', theme.buttonHoverColor)
  }

  // 3. Background and Container surfaces
  const bg = theme.backgroundColor || (isDark ? '#0b1326' : '#f8f9ff')
  const text = theme.textColor || (isDark ? '#f1f5f9' : '#0b1c30')

  root.style.setProperty('--color-surface', bg)
  root.style.setProperty('--color-background', bg)
  root.style.setProperty('--color-on-surface', text)

  if (isDark) {
    root.style.setProperty('--color-surface-container-lowest', '#121d33')
    root.style.setProperty('--color-surface-container-low', '#18253e')
    root.style.setProperty('--color-surface-container', '#1e2e4c')
    root.style.setProperty('--color-surface-container-high', '#273859')
    root.style.setProperty('--color-surface-container-highest', '#324467')
    root.style.setProperty('--color-outline-variant', '#2d3e58')
    root.style.setProperty('--color-on-surface-variant', '#94a3b8')
    root.style.setProperty('--color-inverse-surface', '#f1f5f9')
    root.style.setProperty('--color-inverse-on-surface', '#0b1326')
  } else {
    root.style.setProperty('--color-surface-container-lowest', '#ffffff')
    root.style.setProperty('--color-surface-container-low', '#eff4ff')
    root.style.setProperty('--color-surface-container', '#e5eeff')
    root.style.setProperty('--color-surface-container-high', '#dce9ff')
    root.style.setProperty('--color-surface-container-highest', '#d3e4fe')
    root.style.setProperty('--color-outline-variant', '#c6c6cd')
    root.style.setProperty('--color-on-surface-variant', '#45464d')
    root.style.setProperty('--color-inverse-surface', '#213145')
    root.style.setProperty('--color-inverse-on-surface', '#eaf1ff')
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
          primaryColor: doc.primaryColor || DEFAULT_LIGHT_THEME.primaryColor,
          secondaryColor: doc.secondaryColor || DEFAULT_LIGHT_THEME.secondaryColor,
          buttonHoverColor: doc.buttonHoverColor || DEFAULT_LIGHT_THEME.buttonHoverColor,
          backgroundColor:
            doc.backgroundColor || (doc.themeMode === 'dark' ? '#0b1326' : '#f8f9ff'),
          textColor: doc.textColor || (doc.themeMode === 'dark' ? '#f1f5f9' : '#0b1c30'),
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
