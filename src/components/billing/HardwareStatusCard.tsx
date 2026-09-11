import React from 'react'

export const HardwareStatusCard: React.FC = () => {
  return (
    <div className="bg-surface-container-low p-pad-sm rounded-DEFAULT flex items-center justify-between">
      <div className="flex items-center gap-3">
        <span className="material-symbols-outlined text-secondary text-[20px]">sync_alt</span>
        <div>
          <span className="font-label-sm text-label-sm text-on-surface font-semibold block">
            Store Barcode Engine Connected
          </span>
          <span className="font-mono-numeric-sm text-mono-numeric-sm text-on-surface-variant">
            Handheld Zebra DS2208 • Serial USB Com 4 • Ready for scan loop
          </span>
        </div>
      </div>
      <div className="flex items-center gap-1.5">
        <span className="w-2 h-2 rounded-full bg-secondary animate-pulse"></span>
        <span className="font-mono-numeric-sm text-mono-numeric-sm text-secondary font-semibold">
          ONLINE
        </span>
      </div>
    </div>
  )
}
