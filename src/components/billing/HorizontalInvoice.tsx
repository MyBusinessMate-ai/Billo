import React from 'react'
import { QRCodeSVG } from 'qrcode.react'
import type { BillingInvoice, BillTemplateConfig } from '../../types/pos'
import { usePOS } from '../../context/POSContext'
import { numberToWordsIndian, generateUPIUrl } from '../../utils/formatters'

interface HorizontalInvoiceProps {
  invoice: BillingInvoice
  templateOverride?: BillTemplateConfig
}

export const HorizontalInvoice: React.FC<HorizontalInvoiceProps> = ({
  invoice,
  templateOverride,
}) => {
  const { settings } = usePOS()

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
    showAmountInWords: true,
    showShipTo: false,
    showRemarks: true,
    showQrCode: true,
    showTerms: true,
    termsText:
      '1. Goods once sold can be exchanged within 7 days with original invoice.\n2. Warranty / guarantee as per manufacturer policy.',
    showFooterNotice: true,
    footerNotice: 'Thank you for shopping with us!',
    itemLabel: 'Product / Item Description',
    qtyLabel: 'Qty',
    rateLabel: 'Rate (₹)',
    totalLabel: 'Total (₹)',
    ...(settings.billTemplate || {}),
    ...(templateOverride || {}),
  }

  const hasGstin = Boolean(
    tmpl.showGstin && settings.gstin && settings.gstin.trim() !== '' && settings.gstin !== '0'
  )
  const hasPhone = Boolean(
    tmpl.showPhone && settings.phone && settings.phone.trim() !== '' && settings.phone !== '—'
  )
  const hasAddress = Boolean(
    tmpl.showAddress && settings.registeredAddress && settings.registeredAddress.trim() !== ''
  )

  const fallbackTaxPercent = invoice.taxPercent ?? settings.taxRatePercent ?? 0
  const hasItemGst = invoice.items.some((item) => item.gstPercent !== undefined)

  // Subtotal computed from items
  const computedSubtotal =
    invoice.items && invoice.items.length > 0
      ? invoice.items.reduce((sum, item) => sum + (item.total ?? item.price * item.quantity), 0)
      : invoice.subtotal || 0

  // Total tax computed from items or fallback
  const computedTaxAmount =
    invoice.items && invoice.items.length > 0
      ? invoice.items.reduce((sum, item) => {
          const itemTaxRate = item.gstPercent !== undefined ? item.gstPercent : fallbackTaxPercent
          return sum + ((item.total ?? item.price * item.quantity) * itemTaxRate) / 100
        }, 0)
      : invoice.taxAmount || 0

  const taxAmount = invoice.taxAmount > 0 ? invoice.taxAmount : computedTaxAmount
  const hasTax = taxAmount > 0
  const discountAmount = invoice.discountAmount || 0
  const hasDiscount = Boolean(tmpl.showDiscount && discountAmount > 0)
  const netTotal =
    invoice.netTotal || Math.round(Math.max(0, computedSubtotal + taxAmount - discountAmount))

  const halfTaxAmount = hasTax ? taxAmount / 2 : 0
  const totalQty = invoice.items.reduce((sum, item) => sum + item.quantity, 0)

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

  const upiQrPayload = generateUPIUrl({
    upiId: (settings as any).upiId || settings.qrPayloadUrl || 'store@upi',
    payeeName: settings.storeName || settings.businessName || 'Store POS',
    amount: netTotal,
    invoiceId: invoice.id,
  })

  const formattedInvoiceNo = invoice.id.startsWith('#')
    ? invoice.id.replace('#', '')
    : invoice.id.startsWith('INV-')
      ? invoice.id
      : `INV-${invoice.numericId || invoice.id}`

  const termsLines = (tmpl.termsText || '')
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean)
  const hasTerms = Boolean(tmpl.showTerms !== false && termsLines.length > 0)

  return (
    <div
      id="printable-horizontal-invoice"
      className="bg-white text-slate-950 font-sans p-6 sm:p-7 rounded-none border-2 border-slate-900 shadow-sm w-full mx-auto text-xs leading-tight select-text"
      style={{ maxWidth: '11in', minWidth: '680px' }}
    >
      {/* Top Main Commercial Header Block (Clean 2-Column Grid) */}
      <div className="grid grid-cols-12 border-b-2 border-slate-900">
        {/* Left: Supplier Info & Logo (7 cols) */}
        <div className="col-span-7 p-3.5 border-r-2 border-slate-900 flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-3">
              {tmpl.showLogo !== false && settings.logoUrl && (
                <div className="h-10 w-10 shrink-0 flex items-center justify-center">
                  <img
                    src={settings.logoUrl}
                    alt="Store Logo"
                    className="w-full h-full object-contain"
                  />
                </div>
              )}
              <div>
                <h1 className="text-base font-extrabold uppercase tracking-tight text-slate-950 leading-tight">
                  {settings.storeName || settings.businessName || 'Store Identity'}
                </h1>
                {tmpl.invoiceSubtitle && (
                  <span className="text-[10px] text-slate-500 font-medium block">
                    {tmpl.invoiceSubtitle}
                  </span>
                )}
              </div>
            </div>

            <div className="text-[11px] text-slate-700 space-y-0.5 mt-2">
              {hasAddress && <p className="leading-tight">{settings.registeredAddress}</p>}
              {hasPhone && (
                <p>
                  <span className="font-semibold text-slate-900">Ph:</span> {settings.phone}
                </p>
              )}
              {hasGstin && (
                <p className="font-bold text-slate-950">
                  <span>GSTIN:</span> {settings.gstin}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Right: Invoice Title Badge, Details & UPI QR Code (5 cols) */}
        <div className="col-span-5 p-3.5 flex flex-col justify-between">
          <div className="flex justify-between items-center pb-2 border-b border-slate-200">
            <span className="inline-block border border-slate-900 text-slate-900 px-2 py-0.5 text-[11px] font-black uppercase tracking-wider">
              {tmpl.invoiceTitle || 'TAX INVOICE'}
            </span>
            <span className="text-[9px] font-extrabold text-slate-500 uppercase tracking-wider">
              Original Copy
            </span>
          </div>

          <div className="flex items-start justify-between gap-3 pt-2">
            <div className="text-[11px] space-y-1 text-slate-800 flex-1">
              <div>
                <span className="text-slate-500 text-[10px]">Invoice No:</span>{' '}
                <strong className="font-mono text-slate-950 text-xs">{formattedInvoiceNo}</strong>
              </div>
              <div>
                <span className="text-slate-500 text-[10px]">Date:</span>{' '}
                <strong className="text-slate-900">{invoice.date}</strong>
              </div>
              <div>
                <span className="text-slate-500 text-[10px]">Time:</span>{' '}
                <span>{invoice.timestamp || 'Immediate'}</span>
              </div>
              <div>
                <span className="text-slate-500 text-[10px]">Payment:</span>{' '}
                <span className="font-semibold text-slate-900">{invoice.paymentMethod}</span>
              </div>
            </div>

            {/* UPI Payment QR Code (Only for UPI payments) */}
            {isUpiPayment && tmpl.showQrCode !== false && (
              <div className="flex flex-col items-center">
                <div className="w-[66px] h-[66px] p-1 bg-white border border-slate-300 rounded shrink-0 flex items-center justify-center shadow-2xs">
                  <QRCodeSVG value={upiQrPayload} size={58} level="M" includeMargin={false} />
                </div>
                <span className="text-[8px] font-bold text-slate-600 mt-0.5 uppercase tracking-tight">
                  UPI Pay
                </span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Row 2: Customer Details Grid (Uniform font) */}
      <div className="px-3.5 py-2 border-b-2 border-slate-900">
        <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-1 text-xs text-slate-800">
          <div className="flex items-center gap-1.5">
            <span className="text-slate-600 font-semibold">Customer Name:</span>
            <span className="font-bold text-slate-950">
              {invoice.customer.name || 'Walk-in Customer'}
            </span>
          </div>
          <div className="flex flex-wrap items-center gap-x-6 gap-y-1 text-xs text-slate-800">
            {tmpl.showCustomerPhone !== false && (
              <div className="flex items-center gap-1.5">
                <span className="text-slate-600 font-semibold">Mobile:</span>
                <span className="font-bold text-slate-950">
                  {invoice.customer.phone && invoice.customer.phone !== '—'
                    ? invoice.customer.phone
                    : '-'}
                </span>
              </div>
            )}
            {tmpl.showCustomerEmail !== false && (
              <div className="flex items-center gap-1.5">
                <span className="text-slate-600 font-semibold">Email:</span>
                <span className="font-bold text-slate-950">
                  {invoice.customer.email ? invoice.customer.email : '-'}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Optional Ship-To details if enabled */}
        {tmpl.showShipTo && (
          <div className="mt-2 pt-2 border-t border-dashed border-slate-300 text-[11px] text-slate-600 flex justify-between">
            <span>
              <strong className="text-slate-800">Ship To:</strong> Counter Store Delivery
            </span>
            <span className="text-emerald-800 font-bold uppercase">Paid & Delivered</span>
          </div>
        )}
      </div>

      {/* Row 3: Main Line Items Table */}
      <div className="border-b-2 border-slate-900 overflow-hidden">
        <table className="w-full border-collapse text-left">
          <thead>
            <tr className="bg-slate-100 text-[10px] font-black uppercase text-slate-900 border-b-2 border-slate-900">
              <th className="py-2.5 px-2 text-center border-r border-slate-300 w-10">S.No.</th>
              <th className="py-2.5 px-3 border-r border-slate-300">
                {tmpl.itemLabel || 'Product / Item Description'}
              </th>
              {tmpl.showHsn && (
                <th className="py-2.5 px-2 text-center border-r border-slate-300 w-20">HSN/SAC</th>
              )}
              <th className="py-2.5 px-2 text-center border-r border-slate-300 w-14">
                {tmpl.qtyLabel || 'Qty'}
              </th>
              <th className="py-2.5 px-2.5 text-right border-r border-slate-300 w-24">
                {tmpl.rateLabel || 'Rate (₹)'}
              </th>
              <th className="py-2.5 px-2.5 text-right border-r border-slate-300 w-24">
                {tmpl.totalLabel || 'Total (₹)'}
              </th>
              {hasDiscount && (
                <th className="py-2.5 px-2 text-right border-r border-slate-300 w-16">Disc (₹)</th>
              )}
              {tmpl.showTaxBreakdown && hasTax && (
                <>
                  <th className="py-2.5 px-2 text-right border-r border-slate-300 w-20">CGST</th>
                  <th className="py-2.5 px-2 text-right border-r border-slate-300 w-20">SGST</th>
                </>
              )}
              <th className="py-2.5 px-3 text-right w-28">Net Amount (₹)</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-300 text-[11px]">
            {invoice.items.map((item, idx) => {
              const itemTotal = item.total ?? item.price * item.quantity
              const itemTaxRate =
                item.gstPercent !== undefined ? item.gstPercent : fallbackTaxPercent
              const itemCgst = hasTax ? itemTotal * (itemTaxRate / 200) : 0
              const itemSgst = hasTax ? itemTotal * (itemTaxRate / 200) : 0
              const itemNet = itemTotal + itemCgst + itemSgst

              return (
                <tr key={idx} className="bg-white">
                  <td className="py-2 px-2 text-center font-mono text-slate-600 border-r border-slate-300">
                    {idx + 1}
                  </td>
                  <td className="py-2 px-3 font-bold text-slate-950 border-r border-slate-300">
                    <div>{item.name}</div>
                    <div className="flex items-center gap-2">
                      {tmpl.showCategory && item.category && item.category !== item.name && (
                        <span className="text-[10px] font-normal text-slate-500">
                          Cat: {item.category}
                        </span>
                      )}
                      {item.gstPercent !== undefined && (
                        <span className="text-[9px] font-medium text-slate-500">
                          GST: {item.gstPercent}%
                        </span>
                      )}
                    </div>
                  </td>
                  {tmpl.showHsn && (
                    <td className="py-2 px-2 text-center font-mono text-[10px] text-slate-600 border-r border-slate-300">
                      {item.hsn || '84733099'}
                    </td>
                  )}
                  <td className="py-2 px-2 text-center font-mono font-bold text-slate-900 border-r border-slate-300">
                    {item.quantity}
                  </td>
                  <td className="py-2 px-2.5 text-right font-mono text-slate-700 border-r border-slate-300">
                    {item.price.toFixed(2)}
                  </td>
                  <td className="py-2 px-2.5 text-right font-mono text-slate-800 border-r border-slate-300">
                    {itemTotal.toFixed(2)}
                  </td>
                  {hasDiscount && (
                    <td className="py-2 px-2 text-right font-mono text-emerald-700 border-r border-slate-300">
                      0.00
                    </td>
                  )}
                  {tmpl.showTaxBreakdown && hasTax && (
                    <>
                      <td className="py-2 px-2 text-right font-mono text-slate-700 border-r border-slate-300">
                        {itemCgst.toFixed(2)}
                        {item.gstPercent !== undefined && (
                          <span className="block text-[8px] text-slate-400">
                            ({(item.gstPercent / 2).toFixed(1)}%)
                          </span>
                        )}
                      </td>
                      <td className="py-2 px-2 text-right font-mono text-slate-700 border-r border-slate-300">
                        {itemSgst.toFixed(2)}
                        {item.gstPercent !== undefined && (
                          <span className="block text-[8px] text-slate-400">
                            ({(item.gstPercent / 2).toFixed(1)}%)
                          </span>
                        )}
                      </td>
                    </>
                  )}
                  <td className="py-2 px-3 text-right font-mono font-black text-slate-950">
                    {itemNet.toFixed(2)}
                  </td>
                </tr>
              )
            })}
          </tbody>
          {/* Table Totals Row */}
          <tfoot>
            <tr className="bg-white font-extrabold text-[11px] border-t-2 border-slate-900 text-slate-950">
              <td className="py-2.5 px-2 text-center border-r border-slate-300"></td>
              <td className="py-2.5 px-3 uppercase tracking-wider border-r border-slate-300">
                Total Items: {invoice.items.length} ({totalQty} {totalQty === 1 ? 'Unit' : 'Units'})
              </td>
              {tmpl.showHsn && (
                <td className="py-2.5 px-2 text-center border-r border-slate-300">—</td>
              )}
              <td className="py-2.5 px-2 text-center font-mono border-r border-slate-300">
                {totalQty}
              </td>
              <td className="py-2.5 px-2.5 text-right border-r border-slate-300">—</td>
              <td className="py-2.5 px-2.5 text-right font-mono border-r border-slate-300">
                {computedSubtotal.toFixed(2)}
              </td>
              {hasDiscount && (
                <td className="py-2.5 px-2 text-right font-mono text-emerald-700 border-r border-slate-300">
                  {discountAmount.toFixed(2)}
                </td>
              )}
              {tmpl.showTaxBreakdown && hasTax && (
                <>
                  <td className="py-2.5 px-2 text-right font-mono border-r border-slate-300">
                    {halfTaxAmount.toFixed(2)}
                  </td>
                  <td className="py-2.5 px-2 text-right font-mono border-r border-slate-300">
                    {halfTaxAmount.toFixed(2)}
                  </td>
                </>
              )}
              <td className="py-2.5 px-3 text-right font-mono font-black">
                ₹{netTotal.toFixed(2)}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>

      {/* Row 4: Commercial Summary & Terms Grid (Direct Clean Structure) */}
      <div className="grid grid-cols-12 border-b-2 border-slate-900">
        {/* Left: Amount In Words, Payment Details, Terms & Conditions + QR Code (7 cols) */}
        <div className="col-span-7 p-3.5 border-r-2 border-slate-900 flex flex-col justify-between space-y-2">
          {/* Top Info: Amount in Words & Payment Mode */}
          <div className="space-y-1.5">
            {tmpl.showAmountInWords !== false && (
              <div>
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                  Amount In Words:
                </span>
                <p className="text-xs font-bold text-slate-950 uppercase italic leading-tight">
                  {numberToWordsIndian(netTotal)}
                </p>
              </div>
            )}

            {tmpl.showRemarks !== false && (
              <div className="text-xs text-slate-700">
                <span className="text-slate-500 font-semibold">Payment Mode:</span>{' '}
                <span className="font-bold text-slate-900">{invoice.paymentMethod}</span>
                {invoice.discountCode ? (
                  <span className="ml-1 text-slate-500">
                    (Promo: <strong className="text-emerald-700">{invoice.discountCode}</strong>)
                  </span>
                ) : null}
              </div>
            )}
          </div>

          {/* Bottom Area: Terms on Left & QR on Right (Adaptive when Terms is toggled off) */}
          {(hasTerms || settings.showDynamicQrOnBill !== false) && (
            <div
              className={`pt-2 border-t border-slate-200 flex ${
                hasTerms && settings.showDynamicQrOnBill !== false
                  ? 'items-start justify-between gap-4'
                  : 'items-center justify-center'
              }`}
            >
              {/* Terms & Conditions (Left side) */}
              {hasTerms && (
                <div className="flex-1 min-w-0 text-[10px] text-slate-600 space-y-0.5">
                  <span className="font-extrabold text-slate-900 uppercase tracking-wider block mb-0.5">
                    Terms & Conditions:
                  </span>
                  <div className="space-y-0.5 leading-tight">
                    {termsLines.map((line, i) => (
                      <p key={i}>{line}</p>
                    ))}
                  </div>
                </div>
              )}

              {/* Dynamic Social / Review QR Code (Right side or Centered if no terms) */}
              {settings.showDynamicQrOnBill !== false && (
                <div className="flex flex-col items-center text-center shrink-0">
                  <span className="text-[9px] font-extrabold uppercase tracking-wider text-slate-900 block mb-1">
                    {dynamicQr.header}
                  </span>
                  <div className="p-1 bg-white border border-slate-300 rounded inline-flex items-center justify-center shadow-2xs mb-0.5">
                    <QRCodeSVG
                      value={dynamicQr.url}
                      size={hasTerms ? 62 : 78}
                      level="M"
                      includeMargin={false}
                    />
                  </div>
                  <span className="text-[8px] text-slate-500 font-mono truncate block max-w-[160px]">
                    {dynamicQr.url}
                  </span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Right: Detailed Financial Breakdown & Total Payable (5 cols - Direct Layout) */}
        <div className="col-span-5 p-3.5 flex flex-col justify-between space-y-2 text-xs">
          <div className="space-y-1.5">
            <div className="flex justify-between text-slate-700">
              <span>Subtotal:</span>
              <span className="font-mono font-semibold">₹{computedSubtotal.toFixed(2)}</span>
            </div>

            {hasDiscount && (
              <div className="flex justify-between text-emerald-700 font-semibold">
                <span>Discount:</span>
                <span className="font-mono">-₹{discountAmount.toFixed(2)}</span>
              </div>
            )}

            {tmpl.showTaxBreakdown && hasTax ? (
              <>
                <div className="flex justify-between text-slate-700 text-[11px]">
                  <span>CGST ({(fallbackTaxPercent / 2).toFixed(1)}%):</span>
                  <span className="font-mono font-semibold">₹{halfTaxAmount.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-slate-700 text-[11px]">
                  <span>SGST ({(fallbackTaxPercent / 2).toFixed(1)}%):</span>
                  <span className="font-mono font-semibold">₹{halfTaxAmount.toFixed(2)}</span>
                </div>
              </>
            ) : hasTax ? (
              <div className="flex justify-between text-slate-700">
                <span>GST {hasItemGst ? '(Itemized)' : `(${fallbackTaxPercent}%)`}:</span>
                <span className="font-mono font-semibold">₹{taxAmount.toFixed(2)}</span>
              </div>
            ) : null}
          </div>

          {/* Total Payable (Direct Layout Row) */}
          <div className="pt-2 border-t-2 border-slate-900 flex justify-between items-center">
            <div>
              <span className="text-xs font-black uppercase tracking-wider block text-slate-900">
                Total Payable
              </span>
              <span className="text-[9px] text-slate-500 font-medium">(Incl. all taxes)</span>
            </div>
            <span className="font-mono font-black text-lg text-slate-950">
              ₹
              {netTotal.toLocaleString('en-IN', {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}
            </span>
          </div>
        </div>
      </div>

      {/* Footer Line */}
      {tmpl.showFooterNotice && (
        <div className="pt-2 flex items-center justify-between text-[9px] text-slate-500 font-medium">
          <span>{settings.storeName || settings.businessName}</span>
          <span className="font-semibold">{tmpl.footerNotice}</span>
          <span>Receipt #{formattedInvoiceNo}</span>
        </div>
      )}
    </div>
  )
}
