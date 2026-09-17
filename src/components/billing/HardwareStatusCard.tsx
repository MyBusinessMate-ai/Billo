import React from 'react'

export const HardwareStatusCard: React.FC = () => {
  return (
    <div className="bg-surface-container-low p-pad-sm rounded-DEFAULT flex flex-wrap items-center justify-between gap-2 border border-outline-variant/30">
      <div className="flex items-center gap-2.5">
        <span className="material-symbols-outlined text-secondary text-[20px]">barcode_scanner</span>
        <div>
          <span className="font-label-sm text-label-sm text-on-surface font-semibold block">
            USB Barcode Wedge Engine
          </span>
          <span className="font-mono-numeric-sm text-[11px] text-on-surface-variant">
            Hotkeys: <span className="text-slate-800 font-semibold">[F4] Cash</span> •{' '}
            <span className="text-slate-800 font-semibold">[F8] UPI</span> •{' '}
            <span className="text-slate-800 font-semibold">[Ctrl+Enter] Settle</span> •{' '}
            <span className="text-slate-800 font-semibold">[Esc] Clear</span>
          </span>
        </div>
      </div>
      <div className="flex items-center gap-1.5">
        <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
        <span className="font-mono-numeric-sm text-mono-numeric-sm text-emerald-700 font-semibold">
          LISTENING
        </span>
      </div>
    </div>
  )
}
