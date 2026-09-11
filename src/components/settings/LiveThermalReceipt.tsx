import React from 'react'
import { usePOS } from '../../context/POSContext'

interface LiveThermalReceiptProps {
  draftSettings?: Partial<{
    businessName: string
    storeName: string
    registeredAddress: string
    gstin: string
    phone: string
    instagram: string
    website: string
    whatsapp: string
    googleReview: string
    qrPurpose: string
    qrPayloadUrl: string
    logoUrl: string
  }>
}

export const LiveThermalReceipt: React.FC<LiveThermalReceiptProps> = ({ draftSettings }) => {
  const { settings, showToast } = usePOS()

  // Merge draft settings with active settings
  const merged = { ...settings, ...draftSettings }

  const handleTestPrint = () => {
    window.print()
    showToast('Sent test pattern to 80mm ESC/POS printer', 'info')
  }

  const getQrCaption = () => {
    if (merged.qrPurpose === 'review') return 'Scan to Rate Us on Google Reviews'
    if (merged.qrPurpose === 'loyalty') return 'Scan for VIP Points & Rewards'
    return 'Scan to Pay or Download e-Bill'
  }

  const getSocialText = () => {
    if (merged.instagram) return `Instagram: ${merged.instagram}`
    if (merged.website) return `Web: ${merged.website}`
    return 'www.ledgerpos.store'
  }

  return (
    <div className="bg-surface-container-low rounded-DEFAULT border border-outline-variant/40 p-pad-md shadow-sm">
      {/* Header */}
      <div className="flex items-center justify-between pb-pad-sm mb-pad-md border-b border-outline-variant/30">
        <div className="flex items-center gap-2">
          <span className="material-symbols-outlined text-secondary text-[20px]">receipt</span>
          <h3 className="font-headline-sm text-headline-sm text-on-surface">
            Live Thermal Bill Preview (80mm)
          </h3>
        </div>
        <div className="flex items-center gap-1.5 font-mono-numeric-sm text-mono-numeric-sm text-on-surface-variant">
          <span className="w-2 h-2 rounded-full bg-secondary" />
          <span>SYNCHRONIZED</span>
        </div>
      </div>

      {/* Realistic Physical Thermal Slip Paper Container */}
      <div className="relative bg-surface-container-lowest border border-outline-variant/50 shadow-md p-pad-md font-mono-numeric-sm text-on-surface text-[12px] leading-[18px] max-w-[380px] mx-auto select-none transition-all">
        {/* Perforation Top Graphic */}
        <div className="w-full flex justify-between gap-1 mb-pad-sm opacity-30 overflow-hidden">
          <div className="h-0.5 bg-outline-variant flex-1" />
          <div className="h-0.5 bg-outline-variant flex-1" />
          <div className="h-0.5 bg-outline-variant flex-1" />
          <div className="h-0.5 bg-outline-variant flex-1" />
          <div className="h-0.5 bg-outline-variant flex-1" />
          <div className="h-0.5 bg-outline-variant flex-1" />
        </div>

        {/* Receipt Header */}
        <div className="flex flex-col items-center text-center space-y-1 pb-pad-sm">
          <div className="w-8 h-8 flex items-center justify-center p-0.5 mb-0.5">
            {merged.logoUrl ? (
              <img
                alt="Receipt Logo"
                className="w-full h-full object-contain grayscale contrast-200"
                src={merged.logoUrl}
              />
            ) : (
              <span className="material-symbols-outlined text-[24px]">point_of_sale</span>
            )}
          </div>
          <div className="font-bold text-[13px] uppercase tracking-wide" id="preview-store-name">
            {merged.storeName ||
              merged.businessName ||
              (typeof import.meta !== 'undefined' && import.meta.env?.VITE_STORE_NAME) ||
              'Main Store Outlet'}
          </div>
          <div
            className="text-on-surface-variant text-[11px] leading-tight max-w-[280px]"
            id="preview-store-address"
          >
            {merged.registeredAddress || 'Store Commercial Address, City, State - PIN'}
          </div>
          <div className="text-on-surface-variant text-[11px] leading-tight" id="preview-store-tax">
            {merged.gstin ? `GST: ${merged.gstin}` : ''}{' '}
            {merged.phone ? `| Ph: ${merged.phone}` : ''}
          </div>
        </div>

        {/* Receipt Divider */}
        <div className="border-b border-dashed border-outline-variant my-1.5" />

        {/* Meta Details Grid */}
        <div className="grid grid-cols-2 gap-x-2 text-[11px] leading-tight py-1">
          <div>
            Bill #: <span className="font-semibold text-on-surface">1024</span>
          </div>
          <div className="text-right">
            Date: <span className="font-semibold text-on-surface">05 Sep 2026</span>
          </div>
          <div>
            Time: <span className="text-on-surface">14:32:08</span>
          </div>
          <div className="text-right">
            Customer: <span className="text-on-surface">Rajesh S.</span>
          </div>
        </div>

        {/* Receipt Divider */}
        <div className="border-b border-dashed border-outline-variant my-1.5" />

        {/* Itemized Line Items Table */}
        <div className="w-full my-1">
          <div className="grid grid-cols-12 font-semibold text-[11px] border-b border-outline-variant/50 pb-1 uppercase tracking-tight">
            <div className="col-span-6">Item</div>
            <div className="col-span-2 text-center">Qty</div>
            <div className="col-span-2 text-right">Price</div>
            <div className="col-span-2 text-right">Total</div>
          </div>
          <div className="divide-y divide-outline-variant/30 text-[11px]">
            <div className="grid grid-cols-12 py-1 items-center">
              <div className="col-span-6 truncate">Organic Almond 1L</div>
              <div className="col-span-2 text-center font-mono">2</div>
              <div className="col-span-2 text-right font-mono">₹240</div>
              <div className="col-span-2 text-right font-mono font-medium">₹480</div>
            </div>
            <div className="grid grid-cols-12 py-1 items-center">
              <div className="col-span-6 truncate">Artisan Bread</div>
              <div className="col-span-2 text-center font-mono">1</div>
              <div className="col-span-2 text-right font-mono">₹180</div>
              <div className="col-span-2 text-right font-mono font-medium">₹180</div>
            </div>
            <div className="grid grid-cols-12 py-1 items-center">
              <div className="col-span-6 truncate">Greek Yogurt 400g</div>
              <div className="col-span-2 text-center font-mono">3</div>
              <div className="col-span-2 text-right font-mono">₹110</div>
              <div className="col-span-2 text-right font-mono font-medium">₹330</div>
            </div>
            <div className="grid grid-cols-12 py-1 items-center">
              <div className="col-span-6 truncate">Roasted Coffee</div>
              <div className="col-span-2 text-center font-mono">1</div>
              <div className="col-span-2 text-right font-mono">₹450</div>
              <div className="col-span-2 text-right font-mono font-medium">₹450</div>
            </div>
          </div>
        </div>

        {/* Receipt Divider */}
        <div className="border-b border-dashed border-outline-variant my-1.5" />

        {/* Calculation Section */}
        {(() => {
          const subtotal = 1440
          const taxPercent = merged.taxRatePercent ?? 5
          const taxAmount = (subtotal * taxPercent) / 100
          const discount = 50
          const totalPayable = subtotal + taxAmount - discount

          return (
            <>
              <div className="space-y-1 text-[11px] py-1">
                <div className="flex justify-between">
                  <span>Subtotal</span>
                  <span className="font-mono">₹{subtotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span>GST ({taxPercent}%)</span>
                  <span className="font-mono">₹{taxAmount.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-secondary">
                  <span>Discount (REGULAR50)</span>
                  <span className="font-mono">-₹{discount.toFixed(2)}</span>
                </div>
              </div>

              {/* Receipt Divider */}
              <div className="border-b border-dashed border-outline-variant my-1.5" />

              {/* Total Settlement */}
              <div className="flex justify-between text-[13px] font-bold py-1">
                <span>TOTAL PAYABLE</span>
                <span className="font-mono">₹{totalPayable.toFixed(2)}</span>
              </div>
            </>
          )
        })()}
        <div className="text-[11px] text-on-surface-variant pb-1 flex justify-between">
          <span>Payment Mode:</span>
          <span className="font-semibold text-on-surface">UPI (Approved)</span>
        </div>

        {/* Receipt Divider */}
        <div className="border-b border-dashed border-outline-variant my-1.5" />

        {/* Dynamic Crisp QR Code Block */}
        <div className="flex flex-col items-center text-center py-2 space-y-1.5">
          <div className="p-1 bg-surface-container-lowest border border-on-surface/80 rounded-none w-[90px] h-[90px] flex items-center justify-center">
            <svg className="w-full h-full text-on-surface" fill="currentColor" viewBox="0 0 29 29">
              <path d="M0 0h7v7H0zm2 2v3h3V2zm7 0h2v2H9zm4 0h1v1h-1zm3 0h3v1h-3zm5 0h1v2h-1zm-9 2h2v1H9zm5 0h1v2h-1zm4 0h1v2h-1zm3 0h1v1h-1zm-10 2h1v1h-1zm7 0h1v1h-1zm-18 1h7v7H0zm2 2v3h3V9zm16 0h2v1h-2zm-5 1h1v3h-1zm3 0h1v1h-1zm6 0h2v3h-2zm-8 2h1v1h-1zm2 0h1v2h-1zm-16 4h7v7H0zm2 2v3h3v-3zm7-1h1v1H9zm2 0h2v1h-2zm3 0h1v1h-1zm4 0h2v2h-2zm5 0h1v2h-1zm-14 2h1v2H9zm3 0h1v1h-1zm4 0h1v1h-1zm4 0h2v1h-2zm-10 2h2v1H9zm4 0h2v1h-2zm4 0h1v1h-1zm4 0h1v1h-1z" />
            </svg>
          </div>
          <div
            className="text-[10px] font-semibold text-on-surface tracking-tight uppercase"
            id="preview-qr-caption"
          >
            {getQrCaption()}
          </div>
          <div className="text-[10px] text-on-surface-variant font-mono" id="preview-social-handle">
            {getSocialText()}
          </div>
          <div className="text-[11px] font-medium text-on-surface pt-1">
            Thank you for shopping with us!
          </div>
        </div>

        {/* Receipt Bottom Zigzag Cut Edge */}
        <div className="w-full flex justify-between gap-1 pt-pad-xs opacity-30 overflow-hidden">
          <div className="h-0.5 bg-outline-variant flex-1" />
          <div className="h-0.5 bg-outline-variant flex-1" />
          <div className="h-0.5 bg-outline-variant flex-1" />
          <div className="h-0.5 bg-outline-variant flex-1" />
          <div className="h-0.5 bg-outline-variant flex-1" />
          <div className="h-0.5 bg-outline-variant flex-1" />
        </div>
      </div>

      {/* Thermal Feed Control Strip */}
      <div className="mt-pad-md pt-pad-sm border-t border-outline-variant/30 flex items-center justify-between text-on-surface-variant font-label-sm text-label-sm">
        <div className="flex items-center gap-1.5">
          <span className="material-symbols-outlined text-[15px] text-secondary">print</span>
          <span>Density: 100% (Dark)</span>
        </div>
        <div className="flex items-center gap-2">
          <button
            className="hover:text-on-surface transition-colors px-2 py-1 rounded bg-surface-container hover:bg-surface-container-high flex items-center gap-1 cursor-pointer"
            type="button"
            onClick={handleTestPrint}
          >
            <span className="material-symbols-outlined text-[14px]">sim_card_download</span>
            <span>Send Test ESC/POS</span>
          </button>
        </div>
      </div>
    </div>
  )
}
