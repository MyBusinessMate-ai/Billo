import React, { useState } from 'react'
import { usePOS } from '../../context/POSContext'

interface ThemeColorsFormProps {
  values: {
    primaryColor?: string
    secondaryColor?: string
    buttonHoverColor?: string
    themeMode?: 'light' | 'dark'
    backgroundColor?: string
    textColor?: string
  }
  onChange: (field: string, val: string) => void
}

import { PRESET_PALETTES } from '../../data/theme'

export const ThemeColorsForm: React.FC<ThemeColorsFormProps> = ({ values, onChange }) => {
  const { updateThemeConfig, showToast } = usePOS()
  const [isOpen, setIsOpen] = useState(false)
  const [activeTab, setActiveTab] = useState<'preset' | 'custom'>('preset')

  // Saved / active values
  const mode = values.themeMode || 'light'
  const isDark = mode === 'dark'

  const primaryColor = values.primaryColor || '#000000'
  const secondaryColor = values.secondaryColor || '#006a63'
  const buttonHoverColor = values.buttonHoverColor || '#1f2937'
  const backgroundColor = values.backgroundColor || (isDark ? '#0b1326' : '#f8f9ff')
  const textColor = values.textColor || (isDark ? '#f1f5f9' : '#0b1c30')

  // Draft state while picker is open
  const [draftTheme, setDraftTheme] = useState({
    themeMode: mode,
    primaryColor,
    secondaryColor,
    buttonHoverColor,
    backgroundColor,
    textColor,
  })

  // Keep draft in sync if external values change while closed
  React.useEffect(() => {
    if (!isOpen) {
      setDraftTheme({
        themeMode: mode,
        primaryColor,
        secondaryColor,
        buttonHoverColor,
        backgroundColor,
        textColor,
      })
    }
  }, [mode, primaryColor, secondaryColor, buttonHoverColor, backgroundColor, textColor, isOpen])

  // Initial snapshot to revert on Cancel
  const initialSnapshotRef = React.useRef(draftTheme)

  const handleOpen = () => {
    initialSnapshotRef.current = {
      themeMode: mode,
      primaryColor,
      secondaryColor,
      buttonHoverColor,
      backgroundColor,
      textColor,
    }
    setDraftTheme(initialSnapshotRef.current)
    setIsOpen(true)
  }

  const handleCancel = () => {
    // Revert live preview back to initial snapshot
    const initial = initialSnapshotRef.current
    updateThemeConfig(initial, true)
    onChange?.('themeMode', initial.themeMode)
    onChange?.('primaryColor', initial.primaryColor)
    onChange?.('secondaryColor', initial.secondaryColor)
    onChange?.('buttonHoverColor', initial.buttonHoverColor)
    onChange?.('backgroundColor', initial.backgroundColor)
    onChange?.('textColor', initial.textColor)
    setIsOpen(false)
  }

  // Detect which preset matches draft colors (if any)
  const matchingPreset = PRESET_PALETTES.find(
    (p) =>
      p.mode === draftTheme.themeMode &&
      p.primary.toLowerCase() === draftTheme.primaryColor.toLowerCase() &&
      p.secondary.toLowerCase() === draftTheme.secondaryColor.toLowerCase() &&
      p.background.toLowerCase() === draftTheme.backgroundColor.toLowerCase()
  )

  const handleDraftColorInput = (field: string, val: string) => {
    // Update local form state immediately without flashing the DOM while cursor is moving in picker
    setDraftTheme((prev) => ({ ...prev, [field]: val }))
  }

  const handleApplyColorCommit = (field: string, val: string) => {
    // When the color picker window closes (onBlur) or a value is chosen, reflect to DOM
    if (val && (val.startsWith('#') || val.length >= 4)) {
      updateThemeConfig({ [field]: val }, true)
    }
  }

  const handleLiveModeToggle = (nextMode: 'light' | 'dark') => {
    const nextBg = nextMode === 'dark' ? '#0b1326' : '#f8f9ff'
    const nextText = nextMode === 'dark' ? '#f1f5f9' : '#0b1c30'
    const next = {
      ...draftTheme,
      themeMode: nextMode,
      backgroundColor: nextBg,
      textColor: nextText,
    }
    setDraftTheme(next)
    updateThemeConfig(next, true)
  }

  const handleSelectPreset = (presetName: string) => {
    const preset = PRESET_PALETTES.find((p) => p.name === presetName)
    if (!preset) return

    const next = {
      themeMode: preset.mode,
      primaryColor: preset.primary,
      secondaryColor: preset.secondary,
      buttonHoverColor: preset.hover,
      backgroundColor: preset.background,
      textColor: preset.text,
    }
    setDraftTheme(next)
    // Live preview
    updateThemeConfig(next, true)
  }

  const handleConfirmSave = async () => {
    // Propagate all fields to parent form draft
    onChange?.('themeMode', draftTheme.themeMode)
    onChange?.('primaryColor', draftTheme.primaryColor)
    onChange?.('secondaryColor', draftTheme.secondaryColor)
    onChange?.('buttonHoverColor', draftTheme.buttonHoverColor)
    onChange?.('backgroundColor', draftTheme.backgroundColor)
    onChange?.('textColor', draftTheme.textColor)

    // Save atomically to Firestore & localStorage
    await updateThemeConfig(draftTheme, true)

    // Close panel
    setIsOpen(false)

    // Trigger exactly ONE clean toast
    showToast('Theme saved successfully', 'success')
  }

  // Active saved preset detection for collapsed badge
  const activeSavedPreset = PRESET_PALETTES.find(
    (p) =>
      p.mode === mode &&
      p.primary.toLowerCase() === primaryColor.toLowerCase() &&
      p.secondary.toLowerCase() === secondaryColor.toLowerCase() &&
      p.background.toLowerCase() === backgroundColor.toLowerCase()
  )

  return (
    <div className="bg-surface-container-lowest rounded-DEFAULT border border-outline-variant/40 p-pad-lg shadow-sm space-y-pad-md transition-colors">
      {/* Header with Dark / Light Theme Toggle */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-pad-sm border-b border-outline-variant/30">
        <div className="flex items-center gap-2">
          <span className="material-symbols-outlined text-on-surface text-[20px]">palette</span>
          <div>
            <h2 className="font-headline-sm text-headline-sm text-on-surface">
              Brand Colors & Interface Theme
            </h2>
            <p className="font-body-sm text-body-sm text-on-surface-variant text-[11px] mt-0.5">
              Customize theme mode, curated presets, or configure custom background & text colors.
            </p>
          </div>
        </div>

        {/* Quick Mode Toggle */}
        <div className="flex items-center p-1 bg-surface-container-low rounded-DEFAULT border border-outline-variant/50 self-start sm:self-auto">
          <button
            type="button"
            onClick={() => {
              if (isOpen) {
                handleLiveModeToggle('light')
              } else {
                handleLiveModeToggle('light')
                onChange?.('themeMode', 'light')
                onChange?.('backgroundColor', '#f8f9ff')
                onChange?.('textColor', '#0b1c30')
                showToast('Light mode activated', 'info')
              }
            }}
            className={`flex items-center gap-1.5 px-3 py-1 rounded-DEFAULT text-xs font-semibold transition-all cursor-pointer ${
              (isOpen ? draftTheme.themeMode : mode) === 'light'
                ? 'bg-surface-container-lowest text-on-surface shadow-2xs border border-outline-variant/40'
                : 'text-on-surface-variant hover:text-on-surface'
            }`}
          >
            <span className="material-symbols-outlined text-[16px] text-amber-500">light_mode</span>
            <span>Light</span>
          </button>
          <button
            type="button"
            onClick={() => {
              if (isOpen) {
                handleLiveModeToggle('dark')
              } else {
                handleLiveModeToggle('dark')
                onChange?.('themeMode', 'dark')
                onChange?.('backgroundColor', '#0b1326')
                onChange?.('textColor', '#f1f5f9')
                showToast('Dark mode activated', 'info')
              }
            }}
            className={`flex items-center gap-1.5 px-3 py-1 rounded-DEFAULT text-xs font-semibold transition-all cursor-pointer ${
              (isOpen ? draftTheme.themeMode : mode) === 'dark'
                ? 'bg-surface-container-lowest text-on-surface shadow-2xs border border-outline-variant/40'
                : 'text-on-surface-variant hover:text-on-surface'
            }`}
          >
            <span className="material-symbols-outlined text-[16px] text-indigo-400">dark_mode</span>
            <span>Dark</span>
          </button>
        </div>
      </div>

      {/* COLLAPSED VIEW: Summary card when closed */}
      {!isOpen && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 bg-surface-container-low rounded-DEFAULT border border-outline-variant/40 animate-in fade-in duration-150">
          <div className="flex items-center gap-3 min-w-0">
            {/* Color Swatch Bullets */}
            <div className="flex items-center -space-x-1.5 shrink-0">
              <span
                className="w-6 h-6 rounded-full border-2 border-white shadow-2xs"
                style={{ backgroundColor: primaryColor }}
                title={`Primary: ${primaryColor}`}
              />
              <span
                className="w-6 h-6 rounded-full border-2 border-white shadow-2xs"
                style={{ backgroundColor: secondaryColor }}
                title={`Secondary: ${secondaryColor}`}
              />
              <span
                className="w-6 h-6 rounded-full border-2 border-white shadow-2xs"
                style={{ backgroundColor: backgroundColor }}
                title={`Background: ${backgroundColor}`}
              />
            </div>

            {/* Theme Description */}
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="font-semibold text-sm text-on-surface truncate">
                  {activeSavedPreset ? activeSavedPreset.name : 'Custom Palette'}
                </span>
                <span className="text-[10px] uppercase font-mono px-1.5 py-0.2 rounded bg-surface-container-high text-on-surface-variant font-semibold">
                  {mode}
                </span>
              </div>
              <p className="text-[11px] text-on-surface-variant font-mono mt-0.5 truncate">
                Primary: {primaryColor} • Accent: {secondaryColor}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleOpen}
            className="flex items-center justify-center gap-1.5 px-4 py-2 bg-primary text-on-primary hover:bg-on-primary-fixed-variant rounded-DEFAULT text-xs font-semibold transition-all cursor-pointer shadow-xs shrink-0 self-start sm:self-auto"
          >
            <span className="material-symbols-outlined text-[16px]">palette</span>
            <span>Change Theme</span>
          </button>
        </div>
      )}

      {/* EXPANDED VIEW: Palette Selection / Custom Colors + OK Confirm */}
      {isOpen && (
        <div className="space-y-4 pt-1 animate-in fade-in duration-200">
          {/* Mode Tabs: Preset vs Custom */}
          <div className="flex items-center justify-between gap-2">
            <div className="inline-flex p-1 bg-surface-container-low rounded-DEFAULT border border-outline-variant/50">
              <button
                type="button"
                onClick={() => setActiveTab('preset')}
                className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-DEFAULT text-xs font-semibold transition-all cursor-pointer ${
                  activeTab === 'preset'
                    ? 'bg-primary text-on-primary shadow-2xs'
                    : 'text-on-surface-variant hover:text-on-surface'
                }`}
              >
                <span className="material-symbols-outlined text-[16px]">palette</span>
                <span>Preset Themes</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('custom')}
                className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-DEFAULT text-xs font-semibold transition-all cursor-pointer ${
                  activeTab === 'custom'
                    ? 'bg-primary text-on-primary shadow-2xs'
                    : 'text-on-surface-variant hover:text-on-surface'
                }`}
              >
                <span className="material-symbols-outlined text-[16px]">tune</span>
                <span>Custom Colors</span>
              </button>
            </div>

            {/* Currently Selected Preview */}
            <div className="flex items-center gap-2 text-xs text-on-surface-variant font-medium">
              <span className="hidden sm:inline">Preview:</span>
              <div className="flex items-center gap-1.5 px-2.5 py-1 bg-surface-container-low border border-outline-variant/40 rounded-DEFAULT">
                <div className="flex items-center -space-x-1">
                  <span
                    className="w-3 h-3 rounded-full border border-white/70 shadow-2xs"
                    style={{ backgroundColor: draftTheme.primaryColor }}
                  />
                  <span
                    className="w-3 h-3 rounded-full border border-white/70 shadow-2xs"
                    style={{ backgroundColor: draftTheme.secondaryColor }}
                  />
                  <span
                    className="w-3 h-3 rounded-full border border-white/70 shadow-2xs"
                    style={{ backgroundColor: draftTheme.backgroundColor }}
                  />
                </div>
                <span className="font-semibold text-on-surface">
                  {matchingPreset ? matchingPreset.name : 'Custom'}
                </span>
              </div>
            </div>
          </div>

          {/* TAB 1: PRESET PALETTES */}
          {activeTab === 'preset' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
              {PRESET_PALETTES.map((preset) => {
                const isSelected =
                  matchingPreset?.name === preset.name ||
                  (draftTheme.primaryColor.toLowerCase() === preset.primary.toLowerCase() &&
                    draftTheme.secondaryColor.toLowerCase() === preset.secondary.toLowerCase() &&
                    draftTheme.backgroundColor.toLowerCase() === preset.background.toLowerCase())

                return (
                  <button
                    key={preset.name}
                    type="button"
                    onClick={() => handleSelectPreset(preset.name)}
                    className={`flex items-center justify-between p-2.5 px-3 rounded-DEFAULT border text-left transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-secondary/10 border-secondary ring-1 ring-secondary font-semibold shadow-xs'
                        : 'bg-surface-container-lowest hover:bg-surface-container-low border-outline-variant/40'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="flex items-center -space-x-1 shrink-0">
                        <span
                          className="w-4 h-4 rounded-full border border-white/80 shadow-2xs"
                          style={{ backgroundColor: preset.primary }}
                        />
                        <span
                          className="w-4 h-4 rounded-full border border-white/80 shadow-2xs"
                          style={{ backgroundColor: preset.secondary }}
                        />
                        <span
                          className="w-4 h-4 rounded-full border border-white/80 shadow-2xs"
                          style={{ backgroundColor: preset.background }}
                        />
                      </div>
                      <div className="min-w-0">
                        <span className="block text-xs font-semibold text-on-surface truncate">
                          {preset.name}
                        </span>
                      </div>
                    </div>

                    <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 rounded bg-surface-container text-on-surface-variant shrink-0 ml-2">
                      {preset.mode}
                    </span>
                  </button>
                )
              })}
            </div>
          )}

          {/* TAB 2: CUSTOM COLOR PICKERS */}
          {activeTab === 'custom' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
              {/* 1. Primary Action */}
              <div className="space-y-1">
                <label className="block text-xs font-semibold text-on-surface">
                  Primary Action
                </label>
                <div className="flex items-center gap-1.5">
                  <div className="relative w-9 h-9 rounded-DEFAULT overflow-hidden border border-outline-variant/60 shrink-0 shadow-2xs cursor-pointer">
                    <input
                      type="color"
                      value={draftTheme.primaryColor}
                      onChange={(e) => handleDraftColorInput('primaryColor', e.target.value)}
                      onBlur={(e) => handleApplyColorCommit('primaryColor', e.target.value)}
                      className="absolute -inset-2 w-14 h-14 cursor-pointer border-0 p-0"
                    />
                  </div>
                  <input
                    type="text"
                    value={draftTheme.primaryColor}
                    onChange={(e) => handleDraftColorInput('primaryColor', e.target.value)}
                    onBlur={(e) => handleApplyColorCommit('primaryColor', e.target.value)}
                    placeholder="#000000"
                    className="w-full p-2 px-2.5 bg-surface-container-lowest border border-outline-variant/60 rounded-DEFAULT font-mono text-xs text-on-surface uppercase focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary shadow-2xs"
                  />
                </div>
              </div>

              {/* 2. Secondary Accent */}
              <div className="space-y-1">
                <label className="block text-xs font-semibold text-on-surface">
                  Secondary Accent
                </label>
                <div className="flex items-center gap-1.5">
                  <div className="relative w-9 h-9 rounded-DEFAULT overflow-hidden border border-outline-variant/60 shrink-0 shadow-2xs cursor-pointer">
                    <input
                      type="color"
                      value={draftTheme.secondaryColor}
                      onChange={(e) => handleDraftColorInput('secondaryColor', e.target.value)}
                      onBlur={(e) => handleApplyColorCommit('secondaryColor', e.target.value)}
                      className="absolute -inset-2 w-14 h-14 cursor-pointer border-0 p-0"
                    />
                  </div>
                  <input
                    type="text"
                    value={draftTheme.secondaryColor}
                    onChange={(e) => handleDraftColorInput('secondaryColor', e.target.value)}
                    onBlur={(e) => handleApplyColorCommit('secondaryColor', e.target.value)}
                    placeholder="#006a63"
                    className="w-full p-2 px-2.5 bg-surface-container-lowest border border-outline-variant/60 rounded-DEFAULT font-mono text-xs text-on-surface uppercase focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary shadow-2xs"
                  />
                </div>
              </div>

              {/* 3. Background Color */}
              <div className="space-y-1">
                <label className="block text-xs font-semibold text-on-surface">
                  Background Color
                </label>
                <div className="flex items-center gap-1.5">
                  <div className="relative w-9 h-9 rounded-DEFAULT overflow-hidden border border-outline-variant/60 shrink-0 shadow-2xs cursor-pointer">
                    <input
                      type="color"
                      value={draftTheme.backgroundColor}
                      onChange={(e) => handleDraftColorInput('backgroundColor', e.target.value)}
                      onBlur={(e) => handleApplyColorCommit('backgroundColor', e.target.value)}
                      className="absolute -inset-2 w-14 h-14 cursor-pointer border-0 p-0"
                    />
                  </div>
                  <input
                    type="text"
                    value={draftTheme.backgroundColor}
                    onChange={(e) => handleDraftColorInput('backgroundColor', e.target.value)}
                    onBlur={(e) => handleApplyColorCommit('backgroundColor', e.target.value)}
                    placeholder="#f8f9ff"
                    className="w-full p-2 px-2.5 bg-surface-container-lowest border border-outline-variant/60 rounded-DEFAULT font-mono text-xs text-on-surface uppercase focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary shadow-2xs"
                  />
                </div>
              </div>

              {/* 4. Text Color */}
              <div className="space-y-1">
                <label className="block text-xs font-semibold text-on-surface">Text Color</label>
                <div className="flex items-center gap-1.5">
                  <div className="relative w-9 h-9 rounded-DEFAULT overflow-hidden border border-outline-variant/60 shrink-0 shadow-2xs cursor-pointer">
                    <input
                      type="color"
                      value={draftTheme.textColor}
                      onChange={(e) => handleDraftColorInput('textColor', e.target.value)}
                      onBlur={(e) => handleApplyColorCommit('textColor', e.target.value)}
                      className="absolute -inset-2 w-14 h-14 cursor-pointer border-0 p-0"
                    />
                  </div>
                  <input
                    type="text"
                    value={draftTheme.textColor}
                    onChange={(e) => handleDraftColorInput('textColor', e.target.value)}
                    onBlur={(e) => handleApplyColorCommit('textColor', e.target.value)}
                    placeholder="#0b1c30"
                    className="w-full p-2 px-2.5 bg-surface-container-lowest border border-outline-variant/60 rounded-DEFAULT font-mono text-xs text-on-surface uppercase focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary shadow-2xs"
                  />
                </div>
              </div>

              {/* 5. Button Hover */}
              <div className="space-y-1">
                <label className="block text-xs font-semibold text-on-surface">Button Hover</label>
                <div className="flex items-center gap-1.5">
                  <div className="relative w-9 h-9 rounded-DEFAULT overflow-hidden border border-outline-variant/60 shrink-0 shadow-2xs cursor-pointer">
                    <input
                      type="color"
                      value={draftTheme.buttonHoverColor}
                      onChange={(e) => handleDraftColorInput('buttonHoverColor', e.target.value)}
                      onBlur={(e) => handleApplyColorCommit('buttonHoverColor', e.target.value)}
                      className="absolute -inset-2 w-14 h-14 cursor-pointer border-0 p-0"
                    />
                  </div>
                  <input
                    type="text"
                    value={draftTheme.buttonHoverColor}
                    onChange={(e) => handleDraftColorInput('buttonHoverColor', e.target.value)}
                    onBlur={(e) => handleApplyColorCommit('buttonHoverColor', e.target.value)}
                    placeholder="#1f2937"
                    className="w-full p-2 px-2.5 bg-surface-container-lowest border border-outline-variant/60 rounded-DEFAULT font-mono text-xs text-on-surface uppercase focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary shadow-2xs"
                  />
                </div>
              </div>
            </div>
          )}

          {/* BOTTOM ACTION BAR: Cancel & OK Confirm Button */}
          <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-outline-variant/30">
            <button
              type="button"
              onClick={handleCancel}
              className="px-4 py-2 rounded-DEFAULT bg-surface-container-low text-on-surface hover:bg-surface-container text-xs font-semibold transition-colors cursor-pointer border border-outline-variant/50"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleConfirmSave}
              className="flex items-center gap-1.5 px-5 py-2 bg-primary text-on-primary hover:bg-on-primary-fixed-variant rounded-DEFAULT text-xs font-semibold transition-all cursor-pointer shadow-sm active:scale-98"
            >
              <span className="material-symbols-outlined text-[16px] text-secondary-fixed">
                check_circle
              </span>
              <span>OK Confirm</span>
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
