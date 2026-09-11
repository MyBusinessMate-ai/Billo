import React from 'react'
import { QRCodeSVG } from 'qrcode.react'
import type { BillingInvoice } from '../../types/pos'
import { usePOS } from '../../context/POSContext'
import { generateUPIUrl, formatINR } from '../../utils/formatters'

interface InvoiceDetailsDrawerProps {
  invoice: BillingInvoice | null
  isOpen: boolean
  onClose: () => void
  onOpenReceipt: (invoice: BillingInvoice) => void
}

export const InvoiceDetailsDrawer: React.FC<InvoiceDetailsDrawerProps> = ({
  invoice,
  isOpen,
  onClose,
  onOpenReceipt,
}) => {
  const { invoices, showToast, settings } = usePOS()

  if (!isOpen || !invoice) return null

  const handleCopyId = () => {
    navigator.clipboard.writeText(invoice.id)
    showToast(`Copied ${invoice.id} to clipboard`, 'info')
  }

  // const handleResend = () => {
  //   showToast(`Digital invoice resent to ${invoice.customer.phone}`, 'success')
  // }

  const totalUnits = invoice.items.reduce((s, i) => s + i.quantity, 0)

  // Customer Past Billings Analysis
  const cleanCustomerPhone = invoice.customer.phone ? invoice.customer.phone.replace(/\D/g, '') : ''
  const customerPastInvoices =
    !invoice.customer.isWalkIn &&
    (invoice.customer.id || cleanCustomerPhone || invoice.customer.name)
      ? invoices.filter((inv) => {
          if (invoice.customer.id && inv.customer?.id === invoice.customer.id) return true
          if (cleanCustomerPhone && inv.customer?.phone) {
            const cleanInvPhone = inv.customer.phone.replace(/\D/g, '')
            if (cleanInvPhone.length >= 7 && cleanInvPhone === cleanCustomerPhone) return true
          }
          if (
            invoice.customer.name &&
            invoice.customer.name !== 'Walk-in Customer' &&
            inv.customer?.name &&
            inv.customer.name.trim().toLowerCase() === invoice.customer.name.trim().toLowerCase()
          ) {
            return true
          }
          return false
        })
      : []

  const customerTotalSpend = customerPastInvoices.reduce((sum, inv) => sum + (inv.netTotal || 0), 0)

  return (
    <>
      {/* Active Backdrop Scrim (Structured Non-Blurred Dim) */}
      <div
        className="fixed inset-0 top-14 left-[270px] bg-inverse-surface/30 z-40 transition-opacity duration-300"
        onClick={onClose}
      />

      {/* Active Right-Side Detail Drawer (Width: 460px) */}
      <aside
        id="detailDrawer"
        className="fixed top-14 right-0 bottom-0 w-[460px] bg-surface-container-lowest shadow-2xl z-50 flex flex-col justify-between overflow-hidden border-l border-outline-variant/30 animate-slide-drawer"
      >
        {/* Drawer Header */}
        <div className="px-pad-lg py-pad-md bg-surface-container-low flex flex-col gap-2 border-b border-outline-variant/30">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-on-surface text-[20px]">
                receipt_long
              </span>
              <span className="font-headline-sm text-headline-sm text-on-surface">
                Invoice Details
              </span>
            </div>
            <button
              id="closeDrawerBtn"
              type="button"
              onClick={onClose}
              className="p-1 text-on-surface-variant hover:text-on-surface hover:bg-surface-container rounded-DEFAULT transition-colors cursor-pointer"
            >
              <span className="material-symbols-outlined text-[20px]">close</span>
            </button>
          </div>
          <div className="flex items-center justify-between pt-1">
            <div className="flex items-center gap-2">
              <span className="font-mono-numeric-lg text-title-lg font-bold text-on-surface">
                #{invoice.id}
              </span>
              <button
                type="button"
                onClick={handleCopyId}
                className="p-1 hover:bg-surface-container rounded-DEFAULT text-on-surface-variant transition-colors cursor-pointer"
                title="Copy Invoice ID"
              >
                <span className="material-symbols-outlined text-[15px]">content_copy</span>
              </button>
            </div>
          </div>
        </div>

        {/* Drawer Scrollable Body */}
        <div className="flex-1 overflow-y-auto px-pad-lg py-pad-md flex flex-col gap-pad-md">
          {/* Customer Dossier Card */}
          <div className="bg-surface-container-low p-pad-sm rounded-DEFAULT flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <span className="font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider font-semibold">
                Customer Dossier
              </span>
              {!invoice.customer.isWalkIn && customerPastInvoices.length > 0 && (
                <span className="font-mono-numeric-sm text-[11px] text-secondary font-medium">
                  Total Billings: {formatINR(customerTotalSpend)} ({customerPastInvoices.length}{' '}
                  {customerPastInvoices.length === 1 ? 'bill' : 'bills'})
                </span>
              )}
            </div>
            <div className="flex flex-col">
              <span className="font-headline-sm text-headline-sm text-on-surface font-bold">
                {invoice.customer.name}
              </span>
              <div className="grid grid-cols-2 gap-2 mt-2">
                <div className="flex items-center gap-1.5 text-on-surface-variant">
                  <span className="material-symbols-outlined text-[16px]">call</span>
                  <span className="font-mono-numeric-sm text-mono-numeric-sm text-on-surface">
                    {invoice.customer.phone}
                  </span>
                </div>
                <div className="flex items-center gap-1.5 text-on-surface-variant">
                  <span className="material-symbols-outlined text-[16px]">mail</span>
                  <span className="font-body-sm text-body-sm text-on-surface truncate">
                    {invoice.customer.email || 'guest@ledgerpos.store'}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Timestamp Metadata */}
          <div className="grid grid-cols-2 gap-2 p-2.5 bg-surface-container rounded-DEFAULT">
            <div className="flex flex-col">
              <span className="font-label-sm text-[10px] uppercase text-on-surface-variant">
                Date
              </span>
              <span className="font-mono-numeric-sm text-mono-numeric-sm text-on-surface font-medium mt-0.5">
                {invoice.date}
              </span>
            </div>
            <div className="flex flex-col">
              <span className="font-label-sm text-[10px] uppercase text-on-surface-variant">
                Time Stamp
              </span>
              <span className="font-mono-numeric-sm text-mono-numeric-sm text-on-surface font-medium mt-0.5">
                {invoice.timestamp}
              </span>
            </div>
          </div>

          {/* Line Items Breakdown Table */}
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between">
              <span className="font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider font-semibold">
                Itemized Purchase Ledger
              </span>
              <span className="font-mono-numeric-sm text-mono-numeric-sm text-on-surface font-medium">
                {invoice.items.length} distinct items ({totalUnits} units)
              </span>
            </div>
            <div className="bg-surface-container-low rounded-DEFAULT overflow-hidden">
              <div className="grid grid-cols-12 py-2 px-3 bg-surface-container font-label-sm text-[11px] uppercase tracking-wider text-on-surface-variant font-semibold">
                <div className="col-span-5">Product Details</div>
                <div className="col-span-2 text-right">Price</div>
                <div className="col-span-2 text-center">Qty</div>
                <div className="col-span-3 text-right">Total</div>
              </div>
              {invoice.items.map((item, idx) => (
                <div
                  key={idx}
                  className={`grid grid-cols-12 items-center py-2.5 px-3 ${
                    idx % 2 === 0 ? 'bg-surface-container-lowest' : 'bg-surface-container-low'
                  }`}
                >
                  <div className="col-span-5 flex flex-col min-w-0 pr-1">
                    <span className="font-body-sm text-body-sm text-on-surface font-semibold leading-tight truncate">
                      {item.name}
                    </span>
                    <span className="font-label-sm text-[10px] text-on-surface-variant uppercase">
                      {item.category}
                    </span>
                  </div>
                  <div className="col-span-2 text-right font-mono-numeric-sm text-mono-numeric-sm text-on-surface">
                    ₹{item.price}
                  </div>
                  <div className="col-span-2 text-center font-mono-numeric-sm text-mono-numeric-sm text-on-surface font-medium">
                    {item.quantity}
                  </div>
                  <div className="col-span-3 text-right font-mono-numeric-sm text-mono-numeric-sm text-on-surface font-semibold">
                    ₹{item.total.toFixed(2)}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Financial Summary Breakdown */}
          <div className="bg-surface-container-lowest p-pad-sm rounded-DEFAULT shadow-sm flex flex-col gap-2">
            <div className="flex justify-between items-center text-body-sm font-body-sm text-on-surface-variant">
              <span>Gross Subtotal</span>
              <span className="font-mono-numeric-md text-mono-numeric-md text-on-surface">
                ₹{invoice.subtotal.toFixed(2)}
              </span>
            </div>
            {(invoice.taxPercent ?? settings.taxRatePercent ?? 0) > 0 && invoice.taxAmount > 0 && (
              <div className="flex justify-between items-center text-body-sm font-body-sm text-on-surface-variant">
                <span>Applicable GST ({invoice.taxPercent ?? settings.taxRatePercent}%)</span>
                <span className="font-mono-numeric-md text-mono-numeric-md text-on-surface">
                  ₹{invoice.taxAmount.toFixed(2)}
                </span>
              </div>
            )}
            {invoice.discountAmount > 0 && (
              <div className="flex justify-between items-center text-body-sm font-body-sm text-secondary">
                <span>Store Promo / Member Discount</span>
                <span className="font-mono-numeric-md text-mono-numeric-md font-semibold">
                  -₹{invoice.discountAmount.toFixed(2)}
                </span>
              </div>
            )}
            {/* Total Highlight Bar */}
            <div className="pt-2 mt-1 bg-surface-container-high p-2.5 rounded-DEFAULT flex justify-between items-center">
              <div className="flex flex-col">
                <span className="font-label-sm text-label-sm font-bold uppercase tracking-wider text-on-surface">
                  Final Bill Total
                </span>
                <span className="font-mono-numeric-sm text-[11px] text-on-surface-variant">
                  Inclusive of all local taxes
                </span>
              </div>
              <span className="font-mono-numeric-lg text-mono-numeric-lg text-on-surface font-extrabold">
                ₹{invoice.netTotal.toLocaleString('en-IN')}.00
              </span>
            </div>
          </div>

          {/* Government e-Invoice QR Code & Verification */}
          <div className="bg-surface-container-low p-pad-sm rounded-DEFAULT flex items-center justify-between gap-pad-sm">
            <div className="flex flex-col gap-1 max-w-[240px]">
              <span className="font-label-sm text-label-sm uppercase tracking-wider font-semibold text-on-surface">
                Digital Invoice & UPI
              </span>
              <span className="font-body-sm text-[11px] text-on-surface-variant leading-tight">
                Scan to verify digital tax invoice copy or settle payment via UPI.
              </span>
            </div>
            <div className="p-1.5 bg-surface-container-lowest rounded-DEFAULT shadow-xs border border-outline-variant/30 flex items-center justify-center shrink-0">
              <QRCodeSVG
                value={generateUPIUrl({
                  upiId: (settings as any).upiId || settings.qrPayloadUrl || 'store@upi',
                  payeeName: settings.storeName || settings.businessName || 'Store POS',
                  amount: invoice.netTotal,
                  invoiceId: invoice.id,
                })}
                size={56}
                level="M"
                includeMargin={false}
              />
            </div>
          </div>
        </div>

        {/* Drawer Fixed Footer Action Buttons */}
        <div className="p-pad-md bg-surface-container-low flex flex-col gap-2 border-t border-outline-variant/30">
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => onOpenReceipt(invoice)}
              className="flex items-center justify-center gap-2 bg-primary hover:bg-inverse-surface text-on-primary h-button-lg rounded-DEFAULT font-label-md text-label-md font-semibold transition-colors shadow-sm cursor-pointer"
            >
              <span className="material-symbols-outlined text-[18px]">print</span>
              <span>Print Receipt</span>
            </button>
            <button
              type="button"
              onClick={() => showToast(`Downloaded ${invoice.id}.pdf`, 'info')}
              className="flex items-center justify-center gap-2 bg-surface-container-lowest hover:bg-surface-container text-on-surface h-button-lg rounded-DEFAULT font-label-md text-label-md font-semibold transition-colors shadow-sm cursor-pointer"
            >
              <span className="material-symbols-outlined text-[18px]">picture_as_pdf</span>
              <span>Download PDF</span>
            </button>
          </div>
          {/* <button
            type="button"
            onClick={handleResend}
            className="flex items-center justify-center gap-2 bg-surface-container hover:bg-surface-container-high text-on-surface-variant hover:text-on-surface h-button-sm rounded-DEFAULT font-label-sm text-label-sm font-medium transition-colors cursor-pointer"
          >
            <span className="material-symbols-outlined text-[16px]">forward_to_inbox</span>
            <span>
              Resend to {invoice.customer.name} ({invoice.customer.phone})
            </span>
          </button> */}
        </div>
      </aside>
    </>
  )
}
