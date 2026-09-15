import React, { useState, useRef, useEffect } from 'react'
import type { DateFilterState, DateFilterType } from '../../utils/dateFilter'
import { getDateFilterLabel } from '../../utils/dateFilter'
import { formatDate } from '../../utils/formatters'

interface DateRangeFilterProps {
  filter: DateFilterState
  onChange: (newFilter: DateFilterState) => void
  referenceDate?: string
  className?: string
  align?: 'left' | 'right'
}

export const DateRangeFilter: React.FC<DateRangeFilterProps> = ({
  filter,
  onChange,
  referenceDate,
  className = '',
  align = 'left',
}) => {
  const [isOpen, setIsOpen] = useState(false)
  const popoverRef = useRef<HTMLDivElement>(null)

  const todayStr = referenceDate || formatDate(new Date())

  // Local state for custom editing before applying
  const [customMode, setCustomMode] = useState<'single' | 'range'>(filter.customMode || 'single')
  const [singleDateInput, setSingleDateInput] = useState<string>(filter.singleDate || todayStr)
  const [startDateInput, setStartDateInput] = useState<string>(filter.startDate || todayStr)
  const [endDateInput, setEndDateInput] = useState<string>(filter.endDate || todayStr)

  // Sync inputs when filter changes externally
  useEffect(() => {
    if (filter.singleDate) setSingleDateInput(filter.singleDate)
    if (filter.startDate) setStartDateInput(filter.startDate)
    if (filter.endDate) setEndDateInput(filter.endDate)
    if (filter.customMode) setCustomMode(filter.customMode)
  }, [filter])

  // Close popover when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        setIsOpen(false)
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isOpen])

  const handleSelectPreset = (type: DateFilterType) => {
    if (type === 'custom') {
      onChange({
        type: 'custom',
        customMode,
        singleDate: customMode === 'single' ? singleDateInput : undefined,
        startDate: customMode === 'range' ? startDateInput : undefined,
        endDate: customMode === 'range' ? endDateInput : undefined,
      })
      // Keep panel open so user can pick their custom date
      return
    }

    onChange({
      type,
    })
    setIsOpen(false)
  }

  const handleApplyCustom = () => {
    onChange({
      type: 'custom',
      customMode,
      singleDate: customMode === 'single' ? singleDateInput : undefined,
      startDate: customMode === 'range' ? startDateInput : undefined,
      endDate: customMode === 'range' ? endDateInput : undefined,
    })
    setIsOpen(false)
  }

  const presets: Array<{ id: DateFilterType; label: string }> = [
    { id: 'all', label: 'All Time' },
    { id: 'today', label: 'Today' },
    { id: 'yesterday', label: 'Yesterday' },
    { id: 'this_week', label: 'This Week' },
    { id: 'this_month', label: 'This Month' },
    { id: 'last_3_months', label: 'Last 3 Months' },
    { id: 'custom', label: 'Custom Date / Range' },
  ]

  const activeLabel = getDateFilterLabel(filter)
  const isFiltered = filter.type !== 'all'

  return (
    <div className={`relative inline-block ${className}`} ref={popoverRef}>
      {/* Trigger Button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`flex items-center gap-2 px-3 py-1.5 rounded-DEFAULT shadow-xs transition-all cursor-pointer font-label-md text-label-md select-none border ${
          isFiltered
            ? 'bg-secondary/15 text-secondary border-secondary/30 hover:bg-secondary/20 font-semibold'
            : 'bg-surface-container-low text-on-surface border-outline-variant/30 hover:bg-surface-container'
        }`}
        id="date-filter-trigger"
      >
        <span
          className={`material-symbols-outlined text-[16px] ${
            isFiltered ? 'text-secondary' : 'text-on-surface-variant'
          }`}
        >
          calendar_today
        </span>
        <span className="truncate max-w-[180px]">{activeLabel}</span>
        <span
          className={`material-symbols-outlined text-[16px] transition-transform duration-200 ${
            isOpen ? 'rotate-180' : ''
          }`}
        >
          expand_more
        </span>
      </button>

      {/* Popover Dropdown Panel */}
      {isOpen && (
        <div
          className={`absolute ${
            align === 'right' ? 'right-0' : 'left-0'
          } mt-1.5 z-50 w-72 bg-surface-container-lowest rounded-DEFAULT shadow-xl border border-outline-variant/40 p-3 space-y-3 animate-in fade-in-50 zoom-in-95 duration-150`}
          id="date-filter-panel"
        >
          <div className="flex items-center justify-between pb-1.5 border-b border-outline-variant/20">
            <span className="font-label-sm text-label-sm font-semibold uppercase tracking-wider text-on-surface-variant">
              Filter by Period
            </span>
            {isFiltered && (
              <button
                type="button"
                onClick={() => handleSelectPreset('all')}
                className="text-[11px] text-secondary hover:underline cursor-pointer font-medium"
              >
                Reset
              </button>
            )}
          </div>

          {/* Quick Preset Buttons */}
          <div className="grid grid-cols-2 gap-1.5">
            {presets.slice(0, 6).map((p) => {
              const isActive = filter.type === p.id
              return (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => handleSelectPreset(p.id)}
                  className={`px-2.5 py-1.5 rounded-DEFAULT text-xs font-medium text-left transition-colors cursor-pointer ${
                    isActive
                      ? 'bg-primary text-on-primary font-semibold shadow-2xs'
                      : 'bg-surface-container-low text-on-surface hover:bg-surface-container'
                  }`}
                >
                  {p.label}
                </button>
              )
            })}
          </div>

          {/* Custom Date / Range Option */}
          <div className="pt-2 border-t border-outline-variant/20 space-y-2">
            <div className="flex items-center justify-between">
              <button
                type="button"
                onClick={() => handleSelectPreset('custom')}
                className={`text-xs font-semibold cursor-pointer flex items-center gap-1.5 ${
                  filter.type === 'custom'
                    ? 'text-primary'
                    : 'text-on-surface-variant hover:text-on-surface'
                }`}
              >
                <span className="material-symbols-outlined text-[14px]">edit_calendar</span>
                <span>Custom Date Pick</span>
              </button>

              {/* Mode Toggle: Single vs Range */}
              <div className="flex bg-surface-container rounded-DEFAULT p-0.5 text-[11px]">
                <button
                  type="button"
                  onClick={() => {
                    setCustomMode('single')
                    if (filter.type === 'custom') {
                      onChange({
                        type: 'custom',
                        customMode: 'single',
                        singleDate: singleDateInput,
                      })
                    }
                  }}
                  className={`px-2 py-0.5 rounded-DEFAULT transition-all cursor-pointer ${
                    customMode === 'single'
                      ? 'bg-surface-container-lowest text-on-surface font-semibold shadow-xs'
                      : 'text-on-surface-variant'
                  }`}
                >
                  Single
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setCustomMode('range')
                    if (filter.type === 'custom') {
                      onChange({
                        type: 'custom',
                        customMode: 'range',
                        startDate: startDateInput,
                        endDate: endDateInput,
                      })
                    }
                  }}
                  className={`px-2 py-0.5 rounded-DEFAULT transition-all cursor-pointer ${
                    customMode === 'range'
                      ? 'bg-surface-container-lowest text-on-surface font-semibold shadow-xs'
                      : 'text-on-surface-variant'
                  }`}
                >
                  Range
                </button>
              </div>
            </div>

            {/* Custom Inputs */}
            {customMode === 'single' ? (
              <div className="space-y-1">
                <label className="text-[11px] font-label-sm text-on-surface-variant block">
                  Select Specific Date
                </label>
                <input
                  type="date"
                  value={singleDateInput}
                  onChange={(e) => setSingleDateInput(e.target.value)}
                  className="w-full bg-surface-container-low px-2.5 py-1.5 rounded-DEFAULT border border-outline-variant/40 text-xs font-mono-numeric-sm text-on-surface focus:outline-none focus:border-primary cursor-pointer"
                />
              </div>
            ) : (
              <div className="space-y-1.5">
                <div className="grid grid-cols-2 gap-1.5">
                  <div>
                    <label className="text-[10px] font-label-sm text-on-surface-variant block mb-0.5">
                      Start Date
                    </label>
                    <input
                      type="date"
                      value={startDateInput}
                      onChange={(e) => setStartDateInput(e.target.value)}
                      className="w-full bg-surface-container-low px-2 py-1 rounded-DEFAULT border border-outline-variant/40 text-[11px] font-mono-numeric-sm text-on-surface focus:outline-none focus:border-primary cursor-pointer"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-label-sm text-on-surface-variant block mb-0.5">
                      End Date
                    </label>
                    <input
                      type="date"
                      value={endDateInput}
                      onChange={(e) => setEndDateInput(e.target.value)}
                      className="w-full bg-surface-container-low px-2 py-1 rounded-DEFAULT border border-outline-variant/40 text-[11px] font-mono-numeric-sm text-on-surface focus:outline-none focus:border-primary cursor-pointer"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Apply Button */}
            <div className="pt-1">
              <button
                type="button"
                onClick={handleApplyCustom}
                className="w-full py-1.5 bg-secondary text-on-secondary rounded-DEFAULT text-xs font-label-md font-semibold hover:bg-on-secondary-container transition-colors cursor-pointer shadow-xs"
              >
                Apply Custom Date
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
