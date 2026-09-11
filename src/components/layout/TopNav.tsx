import React, { useRef, useEffect } from 'react'
import { usePOS } from '../../context/POSContext'
import { useNavigate } from '@tanstack/react-router'

import { DEFAULT_LIGHT_THEME, DEFAULT_DARK_THEME } from '../../lib/server/services/theme.service'
import { PRESET_PALETTES } from '../../data/theme'

export const TopNav: React.FC = () => {
  const {
    settings,
    currentTime,
    globalSearchQuery,
    setGlobalSearchQuery,
    updateThemeConfig,
    isBackendConnected,
  } = usePOS()
  const searchInputRef = useRef<HTMLInputElement>(null)
  const navigate = useNavigate()

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        searchInputRef.current?.focus()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (globalSearchQuery.trim()) {
      navigate({ to: '/inventory' })
    }
  }

  const matchingPreset = PRESET_PALETTES.find(
    (p) =>
      p.primary.toLowerCase() === (settings.primaryColor || '').toLowerCase() &&
      p.secondary.toLowerCase() === (settings.secondaryColor || '').toLowerCase() &&
      p.background.toLowerCase() === (settings.backgroundColor || '').toLowerCase()
  )

  const handleToggleTheme = () => {
    const nextMode = settings.themeMode === 'dark' ? 'light' : 'dark'
    if (!matchingPreset) {
      // In Custom mode: toggling only flips background & text (white <-> black) without touching custom colors
      const nextBg = nextMode === 'dark' ? '#121212' : '#ffffff'
      const nextText = nextMode === 'dark' ? '#f8fafc' : '#111827'
      updateThemeConfig({
        themeMode: nextMode,
        backgroundColor: nextBg,
        textColor: nextText,
      })
    } else {
      // In Preset mode: switch to defined target preset
      const target = nextMode === 'dark' ? DEFAULT_DARK_THEME : DEFAULT_LIGHT_THEME
      updateThemeConfig({
        themeMode: target.themeMode,
        primaryColor: target.primaryColor,
        secondaryColor: target.secondaryColor,
        buttonHoverColor: target.buttonHoverColor,
        backgroundColor: target.backgroundColor,
        textColor: target.textColor,
      })
    }
  }

  return (
    <header className="fixed top-0 left-[270px] right-0 h-14 bg-surface-container-lowest border-b border-outline-variant/40 z-40 px-pad-md flex items-center justify-between select-none">
      {/* Search and Clock */}
      <div className="flex items-center gap-pad-md">
        <form
          onSubmit={handleSearchSubmit}
          className="flex items-center gap-2 px-2.5 py-1 bg-surface-container-low rounded-DEFAULT border border-outline-variant/40"
        >
          <span className="material-symbols-outlined text-on-surface-variant text-[16px]">
            search
          </span>
          <input
            ref={searchInputRef}
            type="text"
            value={globalSearchQuery}
            onChange={(e) => setGlobalSearchQuery(e.target.value)}
            placeholder="Scan SKU / Search item (Ctrl+K)..."
            className="bg-transparent font-body-sm text-body-sm text-on-surface placeholder:text-on-surface-variant/60 focus:outline-none w-64"
          />
        </form>

        <div className="hidden md:flex items-center gap-2 text-on-surface-variant font-mono-numeric-sm text-mono-numeric-sm">
          <span className="material-symbols-outlined text-[16px]">schedule</span>
          <span>{currentTime || '2024-10-24 14:38:12'}</span>
        </div>
      </div>

      {/* Right side Status Indicator and Theme Toggle */}
      <div className="flex items-center gap-3">
        <div
          className={`flex items-center gap-1.5 px-2.5 py-1 rounded-DEFAULT border font-label-sm text-[11px] font-medium transition-colors ${
            isBackendConnected
              ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30'
              : 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30'
          }`}
          title={
            isBackendConnected
              ? 'Firebase Firestore Connected (Live Cloud Sync)'
              : 'Firebase not configured. Add credentials to .env'
          }
        >
          <span
            className={`w-1.5 h-1.5 rounded-full ${
              isBackendConnected ? 'bg-emerald-500' : 'bg-amber-500'
            }`}
          />
          <span>{isBackendConnected ? 'Cloud Active' : '.env Required'}</span>
        </div>

        <button
          type="button"
          onClick={handleToggleTheme}
          className="flex items-center gap-1.5 px-2.5 py-1 rounded-DEFAULT bg-surface-container-low hover:bg-surface-container border border-outline-variant/40 text-on-surface font-label-sm text-[12px] font-medium transition-all cursor-pointer shadow-2xs"
          title={`Switch to ${settings.themeMode === 'dark' ? 'Light' : 'Dark'} Mode`}
        >
          <span
            className={`material-symbols-outlined text-[16px] ${
              settings.themeMode === 'dark' ? 'text-indigo-400' : 'text-amber-500'
            }`}
          >
            {settings.themeMode === 'dark' ? 'dark_mode' : 'light_mode'}
          </span>
          <span className="capitalize">{settings.themeMode === 'dark' ? 'Dark' : 'Light'}</span>
        </button>
      </div>
    </header>
  )
}
