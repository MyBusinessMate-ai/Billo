import React, { useState, useEffect } from 'react'
import { QRCodeSVG } from 'qrcode.react'
import type { BillingInvoice } from '../../types/pos'
import { usePOS } from '../../context/POSContext'
import { generateUPIUrl, formatINR, applyTextCasing } from '../../utils/formatters'
import { authService } from '../../lib/server/services/auth.service'

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
  const { invoices, showToast, settings, deleteInvoice } = usePOS()
  const [isConfirmingDelete, setIsConfirmingDelete] = useState(false)
  const [accountPassword, setAccountPassword] = useState('')
  const [showAccountPassword, setShowAccountPassword] = useState(false)
  const [passwordError, setPasswordError] = useState<string | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  // Reset confirmation and password state whenever drawer opens/closes or invoice changes
  useEffect(() => {
    if (!isOpen || !isConfirmingDelete) {
      setIsConfirmingDelete(false)
      setIsDeleting(false)
      setAccountPassword('')
      setPasswordError(null)
      setShowAccountPassword(false)
    }
  }, [isOpen, isConfirmingDelete, invoice?.id])

  // Handle keyboard escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (isConfirmingDelete) {
          setIsConfirmingDelete(false)
        } else if (isOpen) {
          onClose()
        }
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, onClose, isConfirmingDelete])

  if (!isOpen || !invoice) return null

  const cleanInvoiceId = invoice.id.startsWith('#') ? invoice.id.slice(1) : invoice.id
  const displayInvoiceId = `#${cleanInvoiceId}`

  const handleCopyId = () => {
    navigator.clipboard.writeText(displayInvoiceId)
    showToast(`Copied ${displayInvoiceId} to clipboard`, 'info')
  }

  const handleConfirmDelete = async (e?: React.FormEvent) => {
    if (e) e.preventDefault()
    if (!invoice) return

    const trimmedPassword = accountPassword.trim()
    if (!trimmedPassword) {
      setPasswordError('Please enter your account password to authorize deletion.')
      return
    }

    setIsDeleting(true)
    setPasswordError(null)

    try {
      const isValid = await authService.verifyCurrentPassword(trimmedPassword)
      if (!isValid) {
        setPasswordError('Incorrect account password. Deletion unauthorized.')
        showToast('Incorrect account password', 'error')
        setIsDeleting(false)
        return
      }

      await deleteInvoice(invoice.id)
      setIsConfirmingDelete(false)
      setAccountPassword('')
      onClose()
      showToast(`Bill ${displayInvoiceId} deleted permanently`, 'success')
    } catch (err: any) {
      setPasswordError(err.message || 'Failed to delete bill. Please try again.')
      showToast(err.message || 'Failed to delete bill', 'error')
    } finally {
      setIsDeleting(false)
    }
  }

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
      {/* Active Backdrop Scrim */}
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
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => setIsConfirmingDelete(true)}
                className="p-1 text-on-surface-variant hover:text-error hover:bg-error-container/20 rounded-DEFAULT transition-colors cursor-pointer"
                title="Delete this bill"
              >
                <span className="material-symbols-outlined text-[20px]">delete</span>
              </button>
              <button
                id="closeDrawerBtn"
                type="button"
                onClick={onClose}
                className="p-1 text-on-surface-variant hover:text-on-surface hover:bg-surface-container rounded-DEFAULT transition-colors cursor-pointer"
                title="Close panel"
              >
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>
          </div>
          <div className="flex items-center justify-between pt-1">
            <div className="flex items-center gap-2">
              <span className="font-mono-numeric-lg text-title-lg font-bold text-on-surface">
                {displayInvoiceId}
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

          {/* Internal Staff Note (Staff Only) */}
          {invoice.internalNote && (
            <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-DEFAULT flex items-start gap-2.5 shadow-2xs">
              <span className="material-symbols-outlined text-amber-600 dark:text-amber-400 text-[20px] shrink-0 mt-0.5">
                sticky_note_2
              </span>
              <div className="flex flex-col gap-0.5 min-w-0">
                <span className="font-label-sm text-[10px] font-bold uppercase tracking-wider text-amber-800 dark:text-amber-300">
                  Internal Staff Note (Not printed on bill)
                </span>
                <p className="text-body-sm text-on-surface font-medium leading-relaxed whitespace-pre-wrap">
                  {invoice.internalNote}
                </p>
              </div>
            </div>
          )}

          {/* Timestamp & Format Metadata */}
          <div className="grid grid-cols-3 gap-2 p-2.5 bg-surface-container rounded-DEFAULT">
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
            <div className="flex flex-col">
              <span className="font-label-sm text-[10px] uppercase text-on-surface-variant">
                Format
              </span>
              <span className="inline-flex items-center gap-1 font-label-sm text-[11px] font-semibold text-secondary mt-0.5 truncate">
                <span className="material-symbols-outlined text-[14px]">
                  {invoice.invoiceFormat === 'thermal' ? 'receipt' : 'description'}
                </span>
                <span>{invoice.invoiceFormat === 'thermal' ? '80mm Thermal' : 'Letter / A4'}</span>
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
                  className={`grid grid-cols-12 items-start py-2.5 px-3 ${
                    idx % 2 === 0 ? 'bg-surface-container-lowest' : 'bg-surface-container-low'
                  }`}
                >
                  <div className="col-span-5 flex flex-col min-w-0 pr-1">
                    <span className="font-body-sm text-body-sm text-on-surface font-semibold leading-tight truncate">
                      {item.name}
                    </span>
                    {item.description && (
                      <div className="text-[11px] text-on-surface-variant/80 italic mt-0.5 line-clamp-2">
                        {item.description}
                      </div>
                    )}
                    <div className="flex flex-wrap items-center gap-1 mt-1">
                      <span className="font-label-sm text-[10px] text-on-surface-variant uppercase bg-surface-container px-1 py-0.5 rounded">
                        {item.category}
                      </span>
                      {item.gstPercent !== undefined && item.gstPercent > 0 && (
                        <span className="px-1 py-0.5 text-[9px] rounded bg-secondary-container text-on-secondary-container font-mono font-medium">
                          GST {item.gstPercent}%
                        </span>
                      )}
                      {item.discountAmount !== undefined && item.discountAmount > 0 && (
                        <span className="px-1 py-0.5 text-[9px] rounded bg-tertiary-container text-on-tertiary-container font-mono font-medium">
                          -₹{item.discountAmount.toFixed(2)} Off
                        </span>
                      )}
                      {item.customFields &&
                        Object.entries(item.customFields).map(([k, v]) => {
                          if (v === undefined || v === null || v === '') return null
                          const config = item.customFieldConfigs?.find((c) => c.id === k)
                          const valStr = applyTextCasing(v, config?.textCasing)
                          const label = config ? `${config.name}: ${valStr}` : valStr
                          return (
                            <span
                              key={k}
                              className="px-1.5 py-0.5 text-[9px] rounded bg-surface-container-high text-on-surface-variant font-mono"
                            >
                              {label}
                            </span>
                          )
                        })}
                    </div>
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
        <div className="p-pad-md bg-surface-container-low flex flex-col gap-2.5 border-t border-outline-variant/30">
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => onOpenReceipt(invoice)}
              className="flex items-center justify-center gap-2 bg-primary hover:bg-inverse-surface text-on-primary p-3 px-4 min-h-[46px] rounded-DEFAULT font-label-md text-label-md font-semibold transition-all shadow-sm cursor-pointer active:scale-[0.99]"
            >
              <span className="material-symbols-outlined text-[20px]">print</span>
              <span>Print Bill</span>
            </button>
            <button
              type="button"
              onClick={() => onOpenReceipt(invoice)}
              className="flex items-center justify-center gap-2 bg-surface-container-lowest hover:bg-surface-container text-on-surface p-3 px-4 min-h-[46px] rounded-DEFAULT font-label-md text-label-md font-semibold transition-all shadow-sm border border-outline-variant/40 cursor-pointer active:scale-[0.99]"
            >
              <span className="material-symbols-outlined text-[20px]">picture_as_pdf</span>
              <span>View & Save PDF</span>
            </button>
          </div>

          {/* Delete Bill Action Button */}
          <button
            type="button"
            onClick={() => setIsConfirmingDelete(true)}
            className="w-full flex items-center justify-center gap-2 text-error hover:text-on-error bg-error-container/15 hover:bg-error border border-error/30 p-2.5 rounded-DEFAULT font-label-md text-label-sm font-semibold transition-all cursor-pointer active:scale-[0.99]"
          >
            <span className="material-symbols-outlined text-[18px]">delete_forever</span>
            <span>Delete Bill</span>
          </button>
        </div>
      </aside>

      {/* Confirmation Modal Panel for Bill Deletion with Password Authorization */}
      {isConfirmingDelete && (
        <div
          className="fixed inset-0 z-60 bg-inverse-surface/60 backdrop-blur-2xs flex items-center justify-center p-4 animate-fade-in"
          onClick={(e) => {
            if (e.target === e.currentTarget && !isDeleting) {
              setIsConfirmingDelete(false)
            }
          }}
        >
          <form
            onSubmit={handleConfirmDelete}
            className="bg-surface-container-lowest border border-outline-variant/40 rounded-DEFAULT shadow-2xl p-pad-lg max-w-md w-full flex flex-col gap-pad-md animate-scale-in"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-error-container/40 text-error flex items-center justify-center shrink-0">
                <span className="material-symbols-outlined text-[22px]">delete_forever</span>
              </div>
              <div className="flex flex-col min-w-0">
                <h3 className="font-headline-sm text-headline-sm text-on-surface font-bold">
                  Delete Bill?
                </h3>
                <p className="font-mono-numeric-sm text-[12px] text-on-surface-variant truncate">
                  {displayInvoiceId} • ₹{invoice.netTotal.toLocaleString('en-IN')}.00 •{' '}
                  {invoice.customer.name}
                </p>
              </div>
            </div>

            <p className="font-body-sm text-body-sm text-on-surface-variant leading-relaxed">
              Permanently deleting this record will remove it from transaction history and update
              reporting. Please enter your <strong>account password</strong> to authorize deletion:
            </p>

            {/* Password Authorization Field */}
            <div className="flex flex-col gap-1.5">
              <label className="block text-xs font-semibold text-on-surface">
                Account Password <span className="text-error">*</span>
              </label>
              <div className="relative flex items-center">
                <span className="material-symbols-outlined absolute left-2.5 text-on-surface-variant text-[18px] pointer-events-none select-none">
                  lock
                </span>
                <input
                  type={showAccountPassword ? 'text' : 'password'}
                  id="delete-bill-account-password"
                  value={accountPassword}
                  onChange={(e) => {
                    setAccountPassword(e.target.value)
                    if (passwordError) setPasswordError(null)
                  }}
                  placeholder="Enter account password to authorize"
                  autoFocus
                  disabled={isDeleting}
                  className="w-full pl-8.5 pr-9 py-2.5 bg-surface-container-low border border-outline-variant/60 rounded-DEFAULT text-xs text-on-surface placeholder:text-on-surface-variant/50 focus:outline-none focus:border-error focus:ring-1 focus:ring-error shadow-2xs"
                />
                <button
                  type="button"
                  onClick={() => setShowAccountPassword(!showAccountPassword)}
                  className="absolute right-2 text-on-surface-variant hover:text-on-surface p-1 rounded transition-colors cursor-pointer"
                  title={showAccountPassword ? 'Hide password' : 'Show password'}
                  tabIndex={-1}
                >
                  <span className="material-symbols-outlined text-[16px]">
                    {showAccountPassword ? 'visibility_off' : 'visibility'}
                  </span>
                </button>
              </div>

              {passwordError && (
                <div className="p-2 bg-error-container/20 border border-error/30 rounded-DEFAULT flex items-center gap-1.5 text-error text-[11px] mt-0.5">
                  <span className="material-symbols-outlined text-[16px] shrink-0">error</span>
                  <span>{passwordError}</span>
                </div>
              )}
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-outline-variant/20">
              <button
                type="button"
                onClick={() => setIsConfirmingDelete(false)}
                disabled={isDeleting}
                className="px-3.5 py-1.5 bg-surface-container hover:bg-surface-container-high text-on-surface rounded-DEFAULT font-semibold text-xs transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isDeleting || !accountPassword.trim()}
                className="px-4 py-1.5 bg-error text-on-error hover:bg-error/90 disabled:opacity-50 rounded-DEFAULT font-semibold text-xs transition-colors shadow-xs flex items-center gap-1.5 cursor-pointer"
              >
                <span className="material-symbols-outlined text-[16px]">delete_forever</span>
                <span>{isDeleting ? 'Verifying & Deleting...' : 'Authorize & Delete'}</span>
              </button>
            </div>
          </form>
        </div>
      )}
    </>
  )
}
