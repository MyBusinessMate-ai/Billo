import React, { useState, useEffect } from 'react'
import { Printer, Download, X } from 'lucide-react'
import { QRCodeSVG } from 'qrcode.react'
import type { BillingInvoice, BillTemplateConfig } from '../../types/pos'
import { usePOS } from '../../context/POSContext'
import { BrandLogo } from '../common/BrandLogo'
import { HorizontalInvoice } from './HorizontalInvoice'
import { printElementContent } from '../../utils/print'
import { generateUPIUrl, applyTextCasing } from '../../utils/formatters'

interface ThermalReceiptModalProps {
  invoice: BillingInvoice | null
  isOpen: boolean
  onClose: () => void
  formatOverride?: 'thermal' | 'a4'
  templateOverride?: BillTemplateConfig
  onConfirmBilling?: () => void
}

export const ThermalReceiptModal: React.FC<ThermalReceiptModalProps> = ({
  invoice,
  isOpen,
  onClose,
  formatOverride,
  templateOverride,
  onConfirmBilling,
}) => {
  const { settings, showToast, updateInvoiceFormat } = usePOS()

  const getInitialFormat = (): 'a4' | 'thermal' => {
    if (formatOverride) return formatOverride
    if (invoice?.invoiceFormat) return invoice.invoiceFormat
    if (settings.invoiceFormat) return settings.invoiceFormat
    return 'a4'
  }

  const [activeFormat, setActiveFormat] = useState<'a4' | 'thermal'>(getInitialFormat)

  useEffect(() => {
    setActiveFormat(getInitialFormat())
  }, [invoice?.id, invoice?.invoiceFormat, formatOverride, settings.invoiceFormat])

  const format = activeFormat === 'a4' ? 'horizontal' : 'thermal'

  const handleToggleFormat = (newFmt: 'a4' | 'thermal') => {
    setActiveFormat(newFmt)
    if (invoice && invoice.id && !invoice.id.includes('PREVIEW') && updateInvoiceFormat) {
      updateInvoiceFormat(invoice.id, newFmt)
      showToast(
        `Switched view to ${newFmt === 'a4' ? 'Commercial Invoice (Letter / A4)' : '80mm Thermal Slip'}`,
        'info'
      )
    }
  }

  const tmpl: BillTemplateConfig = {
    invoiceTitle: 'TAX INVOICE',
    invoiceSubtitle: '',
    showLogo: true,
    showAddress: true,
    showPhone: true,
    showGstin: true,
    showCustomerPhone: true,
    showCustomerEmail: true,
    showCategory: false,
    showHsn: false,
    showDiscount: true,
    showTaxBreakdown: true,
    showAmountInWords: false,
    showShipTo: false,
    showRemarks: true,
    showQrCode: true,
    showTerms: true,
    showCustomerSignature: false,
    showAuthorizedSignatory: true,
    signatoryText: `For ${settings.storeName || settings.businessName || 'Store Outlet'}`,
    showFooterNotice: true,
    footerNotice: 'Thank you for shopping with us!',
    itemLabel: 'Item',
    qtyLabel: 'Qty',
    rateLabel: 'Price',
    totalLabel: 'Total',
    ...(settings.billTemplate || {}),
    ...(invoice?.billTemplateSnapshot || {}),
    ...(templateOverride || {}),
    termsText:
      invoice?.termsText !== undefined && invoice?.termsText !== null
        ? invoice.termsText
        : invoice?.billTemplateSnapshot?.termsText !== undefined && invoice?.billTemplateSnapshot?.termsText !== null
          ? invoice.billTemplateSnapshot.termsText
          : (settings.billTemplate?.termsText ||
            '1. Goods once sold can be exchanged within 7 days with original invoice.\n2. Warranty / guarantee as per manufacturer policy.'),
  }

  if (!isOpen || !invoice) return null

  const hasGstin = Boolean(settings.gstin && settings.gstin.trim() !== '' && settings.gstin !== '0')
  const hasPhone = Boolean(settings.phone && settings.phone.trim() !== '' && settings.phone !== '—')
  const storeEmail = (settings as any).email || settings.supportEmail || ''
  const hasEmail = Boolean(tmpl.showEmail !== false && storeEmail && storeEmail.trim() !== '')
  const hasAddress = Boolean(settings.registeredAddress && settings.registeredAddress.trim() !== '')
  const clientEmail =
    invoice.customer.email &&
    invoice.customer.email.trim() !== '' &&
    invoice.customer.email !== '-' &&
    invoice.customer.email !== '—'
      ? invoice.customer.email.trim()
      : null
  const fallbackTaxPercent = invoice.taxPercent ?? settings.taxRatePercent ?? 0
  const hasItemGst = invoice.items?.some(
    (item) => item.gstPercent !== undefined && item.gstPercent > 0
  )

  const totalGross = invoice.items.reduce((sum, item) => sum + item.price * item.quantity, 0)
  const totalItemDiscounts = invoice.items.reduce(
    (sum, item) => sum + (item.discountAmount || 0),
    0
  )
  const taxableSubtotal =
    invoice.items && invoice.items.length > 0
      ? invoice.items.reduce((sum, item) => {
          const lineGross = item.price * item.quantity
          const lineDisc = item.discountAmount || 0
          return (
            sum + (typeof item.total === 'number' ? item.total : Math.max(0, lineGross - lineDisc))
          )
        }, 0)
      : invoice.subtotal || 0

  const billDiscount = invoice.discountAmount || 0
  const hasItemDiscounts = totalItemDiscounts > 0
  const hasBillDiscount = billDiscount > 0
  const totalAllDiscounts = totalItemDiscounts + billDiscount

  // GST Section 15(3): Deduct discount before computing taxes
  const finalTaxableValue = Math.max(0, taxableSubtotal - billDiscount)
  const discountRatio = taxableSubtotal > 0 ? finalTaxableValue / taxableSubtotal : 1

  const storeStateCode = settings.gstin ? settings.gstin.trim().slice(0, 2) : '36'
  const customerGstin = invoice.customer.gstin ? invoice.customer.gstin.trim().toUpperCase() : ''
  const customerStateCode = customerGstin ? customerGstin.slice(0, 2) : storeStateCode
  const isInterState =
    invoice.isInterState !== undefined
      ? invoice.isInterState
      : Boolean(customerGstin && customerStateCode && customerStateCode !== storeStateCode)

  const computedTaxAmount =
    invoice.items && invoice.items.length > 0
      ? invoice.items.reduce((sum, item) => {
          const lineGross = item.price * item.quantity
          const lineDisc = item.discountAmount || 0
          const lineTaxable =
            typeof item.total === 'number' ? item.total : Math.max(0, lineGross - lineDisc)
          const discountedLine = lineTaxable * discountRatio
          const itemTaxRate = item.gstPercent !== undefined ? item.gstPercent : fallbackTaxPercent
          return sum + (discountedLine * itemTaxRate) / 100
        }, 0)
      : (finalTaxableValue * fallbackTaxPercent) / 100

  const taxAmount = typeof invoice.taxAmount === 'number' ? invoice.taxAmount : computedTaxAmount
  const hasTax = taxAmount > 0
  const halfTaxAmount = hasTax ? taxAmount / 2 : 0

  const exactNet = Math.max(0, finalTaxableValue + taxAmount)
  const netTotal = invoice.netTotal || Math.round(exactNet)
  const roundOff =
    invoice.roundOff !== undefined ? invoice.roundOff : Math.round((netTotal - exactNet) * 100) / 100

  const isUpiPayment = Boolean(
    invoice.paymentMethod?.toLowerCase().includes('upi') ||
    invoice.paymentMethod?.toLowerCase().includes('gpay') ||
    invoice.paymentMethod?.toLowerCase().includes('phonepe') ||
    invoice.paymentMethod?.toLowerCase().includes('paytm') ||
    invoice.paymentMethod?.toLowerCase().includes('online')
  )

  const getDynamicQrDetails = () => {
    const purpose = settings.qrPurpose || 'review'
    let url = 'https://google.com'
    let header = settings.dynamicQrHeader || 'Rate us on Google & Review'

    if (purpose === 'instagram') {
      const raw = settings.instagram?.trim() || ''
      url = !raw
        ? 'https://instagram.com'
        : raw.startsWith('http://') || raw.startsWith('https://')
          ? raw
          : `https://instagram.com/${raw.replace(/^@/, '')}`
      header = settings.dynamicQrHeader || 'Follow us on Instagram'
    } else if (purpose === 'website') {
      const raw = settings.website?.trim() || ''
      url = !raw
        ? 'https://example.com'
        : raw.startsWith('http://') || raw.startsWith('https://')
          ? raw
          : `https://${raw}`
      header = settings.dynamicQrHeader || 'Visit our Website'
    } else if (purpose === 'review') {
      const raw = settings.googleReview?.trim() || ''
      url = !raw
        ? 'https://google.com'
        : raw.startsWith('http://') || raw.startsWith('https://')
          ? raw
          : `https://${raw}`
      header = settings.dynamicQrHeader || 'Rate us on Google & Review'
    } else if (purpose === 'custom') {
      url = settings.qrPayloadUrl?.trim() || 'https://example.com'
      header = settings.dynamicQrHeader || 'Scan QR Code'
    }
    return { url, header }
  }

  const dynamicQr = getDynamicQrDetails()

  const formattedInvoiceNo = invoice.id.startsWith('#')
    ? invoice.id.replace('#', '')
    : invoice.id.startsWith('INV-')
      ? invoice.id
      : `INV-${invoice.numericId || invoice.id}`

  const termsLines = (tmpl.termsText || '')
    .split('\n')
    .map((l: string) => l.trim())
    .filter(Boolean)

  const handlePrint = () => {
    const success = printElementContent('printable-bill-container', {
      format,
      title: `${format === 'thermal' ? 'Receipt' : 'Invoice'}-${invoice.id}`,
    })
    if (success) {
      showToast(
        `Sent ${format === 'thermal' ? '80mm Thermal Receipt' : 'Commercial Invoice (Vertical)'} to printer`,
        'success'
      )
    } else {
      window.print()
    }
  }

  const handleDownloadPdf = () => {
    // Isolated print trigger with Save to PDF capability
    printElementContent('printable-bill-container', {
      format,
      title: `Invoice-${invoice.id}`,
    })
    showToast(`Prepared PDF print document for ${invoice.id}`, 'info')
  }

  return (
    <div
      className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-fade-in"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div
        className={`bg-white rounded-2xl shadow-2xl w-full overflow-hidden border border-slate-200 flex flex-col max-h-[92vh] relative transition-all duration-200 ${
          format === 'horizontal' ? 'max-w-4xl' : 'max-w-md'
        }`}
      >
        {/* Top Control Bar with Format Switcher & Close */}
        <div className="flex items-center justify-between p-3 px-4 sm:px-6 border-b border-slate-200 bg-white z-10 shrink-0">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-[11px] text-slate-500 uppercase tracking-wider hidden sm:inline-block">
              Print Format:
            </span>
            <div className="flex items-center bg-slate-100 p-0.5 rounded-lg border border-slate-200 text-xs">
              <button
                type="button"
                onClick={() => handleToggleFormat('a4')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md font-semibold transition-all cursor-pointer ${
                  activeFormat === 'a4'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                <span className="material-symbols-outlined text-[16px] text-teal-600">description</span>
                <span>Letter / A4 Full Size</span>
              </button>
              <button
                type="button"
                onClick={() => handleToggleFormat('thermal')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md font-semibold transition-all cursor-pointer ${
                  activeFormat === 'thermal'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                <span className="material-symbols-outlined text-[16px] text-slate-700">receipt</span>
                <span>80mm Thermal Slip</span>
              </button>
            </div>
          </div>

          <button
            onClick={onClose}
            aria-label="Close"
            className="p-1.5 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Scrollable Receipt Body */}
        <div className="p-4 sm:p-6 overflow-y-auto bg-slate-100/70 flex-1 flex flex-col items-center">
          {/* Internal Staff Note Banner (Hidden from print, visible only on screen) */}
          {invoice.internalNote && (
            <div
              className={`mb-3 p-3 bg-amber-50 border border-amber-300 rounded-xl flex items-start gap-2.5 text-xs text-amber-900 shadow-xs w-full ${
                format === 'horizontal' ? 'max-w-4xl' : 'max-w-[380px]'
              }`}
            >
              <span className="material-symbols-outlined text-amber-600 text-[18px] shrink-0 mt-0.5">
                sticky_note_2
              </span>
              <div className="flex flex-col gap-0.5 min-w-0">
                <span className="font-bold text-[10px] uppercase tracking-wider text-amber-800">
                  Staff Note (Hidden from customer bill):
                </span>
                <p className="font-medium leading-relaxed whitespace-pre-wrap">
                  {invoice.internalNote}
                </p>
              </div>
            </div>
          )}

          <div id="printable-bill-container" className="w-full flex justify-center">
            {format === 'horizontal' ? (
              <HorizontalInvoice invoice={invoice} templateOverride={tmpl} />
            ) : (
              <div className="thermal-receipt p-6 rounded-lg border border-slate-200 text-slate-900 text-xs font-mono max-w-[380px] w-full bg-white shadow-sm">
                {/* Store Brand & Info */}
                <div className="text-center pb-4 border-b border-dashed border-slate-300">
                  {tmpl.showLogo !== false && (
                    <div className="flex justify-center mb-2">
                      <BrandLogo size="lg" showText={false} />
                    </div>
                  )}
                  <h4 className="font-bold text-sm uppercase tracking-tight">
                    {settings.storeName || settings.businessName || 'Store Receipt'}
                  </h4>
                  {tmpl.invoiceSubtitle && (
                    <p className="text-[10px] text-slate-500 font-sans mt-0.5">
                      {tmpl.invoiceSubtitle}
                    </p>
                  )}
                  {hasAddress && (
                    <p className="text-[10px] text-slate-600 mt-1 max-w-[260px] mx-auto leading-tight">
                      {settings.registeredAddress}
                    </p>
                  )}
                  {(hasGstin || hasPhone) && (
                    <p className="text-[10px] text-slate-500 mt-1">
                      {hasGstin && <span>GST: {settings.gstin.toUpperCase()}</span>}
                      {hasGstin && hasPhone && <span> | </span>}
                      {hasPhone && <span>Ph: {settings.phone}</span>}
                    </p>
                  )}
                  {hasEmail && (
                    <p className="text-[10px] text-slate-500 lowercase mt-0.5">
                      <span>Email: {storeEmail.toLowerCase()}</span>
                    </p>
                  )}
                </div>

                {/* Bill Details & Customer Details */}
                <div className="py-3 border-b border-dashed border-slate-300 text-[11px] space-y-2">
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-1.5">
                      <span className="text-slate-500">Invoice No:</span>{' '}
                      <span className="font-bold font-mono text-slate-950">
                        {formattedInvoiceNo}
                      </span>
                      {invoice.isEdited && (
                        <span className="bg-amber-500 text-slate-950 font-black text-[8.5px] px-1 py-0.2 rounded uppercase tracking-wider">
                          EDITED
                        </span>
                      )}
                    </div>
                    <div className="text-right">
                      <span className="text-slate-500">Date:</span> <span>{invoice.date}</span>
                    </div>
                  </div>

                  <div className="pt-1.5 border-t border-dotted border-slate-200 text-left space-y-0.5">
                    <div>
                      <span className="text-slate-500">Customer:</span>{' '}
                      <span className="font-semibold text-slate-950 uppercase">
                        {(invoice.customer.name || 'Walk-in Customer').toUpperCase()}
                      </span>
                    </div>
                    {tmpl.showCustomerPhone !== false && (
                      <div>
                        <span className="text-slate-500">Mobile:</span>{' '}
                        <span>
                          {invoice.customer.phone && invoice.customer.phone !== '—'
                            ? invoice.customer.phone
                            : '-'}
                        </span>
                      </div>
                    )}
                    {tmpl.showCustomerEmail !== false && clientEmail && (
                      <div>
                        <span className="text-slate-500">Email:</span>{' '}
                        <span className="lowercase">{clientEmail.toLowerCase()}</span>
                      </div>
                    )}
                    {invoice.customer.gstin && (
                      <div>
                        <span className="text-slate-500">GSTIN:</span>{' '}
                        <span className="font-mono uppercase font-semibold">
                          {invoice.customer.gstin.toUpperCase()}
                        </span>
                      </div>
                    )}
                    {invoice.placeOfSupply && (
                      <div>
                        <span className="text-slate-500">Place of Supply:</span>{' '}
                        <span className="font-mono text-[10px]">{invoice.placeOfSupply}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Itemized Table */}
                <div className="py-3 border-b border-dashed border-slate-300">
                  <div className="grid grid-cols-12 font-bold text-[10px] uppercase text-slate-500 pb-1">
                    <span className="col-span-6">{tmpl.itemLabel || 'Item'}</span>
                    <span className="col-span-2 text-center">{tmpl.qtyLabel || 'Qty'}</span>
                    <span className="col-span-2 text-right">{tmpl.rateLabel || 'Price'}</span>
                    <span className="col-span-2 text-right">{tmpl.totalLabel || 'Total'}</span>
                  </div>
                  <div className="flex flex-col gap-1.5 pt-1 text-[11px]">
                    {invoice.items.map((item, idx) => (
                      <div key={idx} className="grid grid-cols-12 items-start">
                        <span className="col-span-6 font-medium">
                          <span className="block truncate">{item.name}</span>
                          {item.description && (
                            <span className="block text-[9px] text-slate-500 italic font-sans break-words whitespace-normal leading-tight">
                              {item.description}
                            </span>
                          )}
                          {item.discountAmount !== undefined && item.discountAmount > 0 && (
                            <span className="text-[9px] text-emerald-700 font-semibold inline-block mr-1">
                              (-₹{item.discountAmount})
                            </span>
                          )}
                          {item.gstPercent !== undefined && item.gstPercent > 0 && (
                            <span className="text-[9px] text-slate-500 inline-block mr-1">
                              ({item.gstPercent}%)
                            </span>
                          )}
                          {item.customFields &&
                            Object.entries(item.customFields).map(([k, v]) => {
                              const cfg = item.customFieldConfigs?.find((c) => c.id === k)
                              if (
                                cfg?.showInReceipt === false ||
                                cfg?.billColumnPlacement === 'hidden'
                              )
                                return null
                              return (
                                <span key={k} className="block text-[9px] text-slate-500 font-sans">
                                  {cfg ? cfg.name : k}: {applyTextCasing(v, cfg?.textCasing)}
                                </span>
                              )
                            })}
                        </span>
                        <span className="col-span-2 text-center text-slate-600">
                          {item.quantity}
                        </span>
                        <span className="col-span-2 text-right text-slate-600">
                          ₹{item.price.toFixed(2)}
                        </span>
                        <span className="col-span-2 text-right font-semibold">
                          ₹{(item.total ?? item.price * item.quantity).toFixed(2)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Subtotals & Taxes */}
                <div className="py-3 border-b border-dashed border-slate-300 flex flex-col gap-1 text-[11px]">
                  {hasItemDiscounts ? (
                    <>
                      <div className="flex justify-between">
                        <span className="text-slate-500">Gross Subtotal:</span>
                        <span>₹{totalGross.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between text-emerald-700">
                        <span>Item Discounts:</span>
                        <span>-₹{totalItemDiscounts.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500">Taxable Subtotal:</span>
                        <span>₹{taxableSubtotal.toFixed(2)}</span>
                      </div>
                    </>
                  ) : (
                    <div className="flex justify-between">
                      <span className="text-slate-500">Subtotal:</span>
                      <span>₹{taxableSubtotal.toFixed(2)}</span>
                    </div>
                  )}

                  {hasBillDiscount && (
                    <>
                      <div className="flex justify-between text-emerald-700 font-semibold">
                        <span>
                          Bill Discount {invoice.discountCode ? `(${invoice.discountCode})` : ''}:
                        </span>
                        <span>-₹{billDiscount.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between text-slate-700">
                        <span className="text-slate-500">Taxable Value:</span>
                        <span>₹{finalTaxableValue.toFixed(2)}</span>
                      </div>
                    </>
                  )}

                  {tmpl.showTaxBreakdown && hasTax ? (
                    isInterState ? (
                      <div className="flex justify-between">
                        <span className="text-slate-500">IGST ({fallbackTaxPercent}%):</span>
                        <span>₹{taxAmount.toFixed(2)}</span>
                      </div>
                    ) : (
                      <>
                        <div className="flex justify-between">
                          <span className="text-slate-500">CGST ({(fallbackTaxPercent / 2).toFixed(1)}%):</span>
                          <span>₹{halfTaxAmount.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-500">SGST ({(fallbackTaxPercent / 2).toFixed(1)}%):</span>
                          <span>₹{halfTaxAmount.toFixed(2)}</span>
                        </div>
                      </>
                    )
                  ) : hasTax ? (
                    <div className="flex justify-between">
                      <span className="text-slate-500">
                        {isInterState ? 'IGST' : 'GST'} {hasItemGst ? '(Itemized)' : `(${fallbackTaxPercent}%)`}:
                      </span>
                      <span>₹{taxAmount.toFixed(2)}</span>
                    </div>
                  ) : null}

                  {roundOff !== 0 && (
                    <div className="flex justify-between text-slate-600">
                      <span className="text-slate-500">Round Off:</span>
                      <span className="font-mono font-semibold">
                        {roundOff > 0 ? `+₹${roundOff.toFixed(2)}` : `-₹${Math.abs(roundOff).toFixed(2)}`}
                      </span>
                    </div>
                  )}

                  {totalAllDiscounts > 0 && (
                    <div className="flex justify-between text-[10px] text-emerald-800 bg-emerald-50 px-1.5 py-0.5 rounded font-medium">
                      <span>Total Savings:</span>
                      <span>₹{totalAllDiscounts.toFixed(2)}</span>
                    </div>
                  )}

                  <div className="flex justify-between text-sm font-extrabold pt-2 border-t border-slate-200 mt-1">
                    <span>TOTAL PAYABLE:</span>
                    <span className="text-slate-950 font-mono">₹{netTotal.toFixed(2)}</span>
                  </div>

                  {tmpl.showRemarks !== false && (
                    <div className="flex justify-between text-[11px] text-slate-600 pt-1">
                      <span>Payment Mode:</span>
                      <span className="font-semibold">{invoice.paymentMethod}</span>
                    </div>
                  )}
                </div>

                {/* Optional Terms & Conditions */}
                {tmpl.showTerms && termsLines.length > 0 && (
                  <div className="py-2.5 border-b border-dashed border-slate-300 text-[10px] text-slate-600 space-y-0.5">
                    <span className="font-bold uppercase text-[9px] text-slate-700 block mb-0.5">
                      Terms & Conditions:
                    </span>
                    {termsLines.map((line, i) => (
                      <p key={i} className="leading-tight">
                        {line}
                      </p>
                    ))}
                  </div>
                )}

                {/* Optional Authorized Signatory / Stamp Space */}
                {tmpl.showAuthorizedSignatory !== false && (
                  <div className="py-2.5 border-b border-dashed border-slate-300 text-center space-y-1.5">
                    <span className="text-[9px] font-bold uppercase text-slate-700 block">
                      {tmpl.signatoryText ||
                        `For ${settings.storeName || settings.businessName || 'Store'}`}
                    </span>
                    <div className="h-10 border border-dashed border-slate-200 rounded flex items-center justify-center text-[9px] text-slate-300">
                      Signature / Stamp
                    </div>
                    <div className="w-36 border-t border-slate-400 mx-auto pt-0.5">
                      <span className="text-[9px] font-bold text-slate-800 uppercase block">
                        {`Authorized Signatory ${settings.businessName || settings.storeName || ''}`.trim()}
                      </span>
                    </div>
                  </div>
                )}

                {/* QR Codes & Footer */}
                <div className="pt-4 text-center flex flex-col items-center gap-3">
                  {/* Type 1: UPI Payment QR (Only for UPI payment method) */}
                  {isUpiPayment && tmpl.showQrCode !== false && (
                    <div className="flex flex-col items-center p-1 w-full">
                      <p className="text-[10px] font-black text-slate-900 tracking-wider uppercase mb-1.5">
                        SCAN TO PAY VIA UPI
                      </p>
                      <div className="w-20 h-20 bg-white p-1 border border-slate-300 rounded mb-1 flex items-center justify-center shadow-2xs">
                        <QRCodeSVG
                          value={generateUPIUrl({
                            upiId: (settings as any).upiId || settings.qrPayloadUrl || 'store@upi',
                            payeeName: settings.storeName || settings.businessName || 'Store POS',
                            amount: invoice.netTotal,
                            invoiceId: invoice.id,
                          })}
                          size={68}
                          level="M"
                          includeMargin={false}
                        />
                      </div>
                      <p className="text-[9px] font-semibold text-slate-700">
                        Amount: ₹{netTotal.toLocaleString('en-IN')}.00
                      </p>
                    </div>
                  )}

                  {/* Type 2: Dynamic Social / Review QR (Enabled via showDynamicQrOnBill) */}
                  {settings.showDynamicQrOnBill !== false && (
                    <div className="flex flex-col items-center p-1 w-full">
                      <p className="text-[10px] font-black text-slate-900 tracking-wider uppercase mb-1.5">
                        {dynamicQr.header}
                      </p>
                      <div className="w-20 h-20 bg-white p-1 border border-slate-300 rounded mb-1 flex items-center justify-center shadow-2xs">
                        <QRCodeSVG
                          value={dynamicQr.url}
                          size={68}
                          level="M"
                          includeMargin={false}
                        />
                      </div>
                      <p className="text-[9px] text-slate-500 max-w-60 truncate font-mono">
                        {dynamicQr.url}
                      </p>
                    </div>
                  )}

                  {tmpl.showFooterNotice && (
                    <p className="text-[10px] text-slate-400 mt-1 italic">{tmpl.footerNotice}</p>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Modal Actions */}
        <div className="p-4 bg-white border-t border-slate-200 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            {invoice.id.includes('PREVIEW') && onConfirmBilling && (
              <button
                type="button"
                onClick={onConfirmBilling}
                className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-xs transition-colors cursor-pointer"
              >
                <span className="material-symbols-outlined text-[16px]">check_circle</span>
                <span>Confirm & Save Bill</span>
              </button>
            )}
            <button
              onClick={handlePrint}
              className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold shadow-xs transition-colors cursor-pointer"
            >
              <Printer className="w-4 h-4" />
              <span>{format === 'thermal' ? 'Print 80mm Receipt' : 'Print A4 Invoice'}</span>
            </button>
            <button
              onClick={handleDownloadPdf}
              className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold transition-colors border border-slate-200 cursor-pointer"
            >
              <Download className="w-4 h-4" />
              <span>Download PDF</span>
            </button>
          </div>
          <button
            onClick={onClose}
            className="px-5 py-2.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 text-xs font-semibold transition-colors cursor-pointer"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  )
}
