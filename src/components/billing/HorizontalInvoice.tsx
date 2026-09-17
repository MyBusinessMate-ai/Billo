import React, { useMemo } from 'react'
import { QRCodeSVG } from 'qrcode.react'
import type { BillingInvoice, BillTemplateConfig, BillingItem } from '../../types/pos'
import { usePOS } from '../../context/POSContext'
import { numberToWordsIndian, generateUPIUrl, applyTextCasing } from '../../utils/formatters'

interface HorizontalInvoiceProps {
  invoice: BillingInvoice
  templateOverride?: BillTemplateConfig
}

export const HorizontalInvoice: React.FC<HorizontalInvoiceProps> = ({
  invoice,
  templateOverride,
}) => {
  const { settings, categories } = usePOS()

  const tmpl: BillTemplateConfig = {
    invoiceTitle: 'TAX INVOICE',
    invoiceSubtitle: '',
    showLogo: true,
    showAddress: true,
    showPhone: true,
    showEmail: true,
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
    showAuthorizedSignatory: true,
    signatoryText: `For ${settings.storeName || settings.businessName || 'Store Outlet'}`,
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
  const storeEmail = (settings as any).email || settings.supportEmail || ''
  const hasEmail = Boolean(
    tmpl.showEmail !== false && storeEmail && storeEmail.trim() !== ''
  )
  const hasAddress = Boolean(
    tmpl.showAddress && settings.registeredAddress && settings.registeredAddress.trim() !== ''
  )
  const clientEmail =
    invoice.customer.email &&
    invoice.customer.email.trim() !== '' &&
    invoice.customer.email !== '-' &&
    invoice.customer.email !== '—'
      ? invoice.customer.email.trim()
      : null

  const fallbackTaxPercent = invoice.taxPercent ?? settings.taxRatePercent ?? 0
  const hasItemGst = invoice.items.some((item) => item.gstPercent !== undefined && item.gstPercent > 0)

  // Total Gross across items (Rate * Qty)
  const totalGross = invoice.items.reduce((sum, item) => sum + item.price * item.quantity, 0)

  // Total Item-wise Discounts
  const totalItemDiscounts = invoice.items.reduce((sum, item) => sum + (item.discountAmount || 0), 0)

  // Taxable Subtotal (Sum of items after item-wise discounts)
  const taxableSubtotal =
    invoice.items && invoice.items.length > 0
      ? invoice.items.reduce((sum, item) => {
          const lineGross = item.price * item.quantity
          const lineDisc = item.discountAmount || 0
          return sum + (typeof item.total === 'number' ? item.total : Math.max(0, lineGross - lineDisc))
        }, 0)
      : invoice.subtotal || 0

  // Total tax computed on taxable amounts
  const computedTaxAmount =
    invoice.items && invoice.items.length > 0
      ? invoice.items.reduce((sum, item) => {
          const lineGross = item.price * item.quantity
          const lineDisc = item.discountAmount || 0
          const lineTaxable = typeof item.total === 'number' ? item.total : Math.max(0, lineGross - lineDisc)
          const itemTaxRate = item.gstPercent !== undefined ? item.gstPercent : fallbackTaxPercent
          return sum + (lineTaxable * itemTaxRate) / 100
        }, 0)
      : invoice.taxAmount || 0

  const taxAmount = typeof invoice.taxAmount === 'number' ? invoice.taxAmount : computedTaxAmount
  const hasTax = taxAmount > 0
  const billDiscount = invoice.discountAmount || 0
  const hasItemDiscounts = totalItemDiscounts > 0
  const hasBillDiscount = billDiscount > 0
  const totalAllDiscounts = totalItemDiscounts + billDiscount

  // hasDiscount determines if the Disc (₹) column in the line item table should be shown
  const hasDiscount = Boolean(tmpl.showDiscount !== false && (hasItemDiscounts || hasBillDiscount))

  const netTotal =
    invoice.netTotal || Math.round(Math.max(0, taxableSubtotal + taxAmount - billDiscount))

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

  // Collect all separate custom columns across all invoice items
  const separateColumns = useMemo(() => {
    const headerMap = new Map<string, { header: string; fieldId: string }>()
    invoice.items.forEach((item) => {
      const configs =
        item.customFieldConfigs ||
        categories.find((c) => c.categoryName.toLowerCase() === item.category.toLowerCase())?.customFields ||
        []
      configs.forEach((cfg) => {
        if (cfg.billColumnPlacement === 'separate' && cfg.billColumnHeader?.trim()) {
          const trimmed = cfg.billColumnHeader.trim()
          if (!headerMap.has(trimmed.toLowerCase())) {
            headerMap.set(trimmed.toLowerCase(), { header: trimmed, fieldId: cfg.id })
          }
        }
      })
    })
    return Array.from(headerMap.values())
  }, [invoice.items, categories])

  const getMergedFieldsForColumn = (item: BillingItem, targetCol: string) => {
    const configs =
      item.customFieldConfigs ||
      categories.find((c) => c.categoryName.toLowerCase() === item.category?.toLowerCase())?.customFields ||
      []
    return configs
      .filter((cfg) => {
        const placement = cfg.billColumnPlacement || 'merged'
        if (placement !== 'merged') return false
        const target = cfg.billTargetColumn || 'description'
        return (
          target === targetCol &&
          item.customFields?.[cfg.id] !== undefined &&
          item.customFields?.[cfg.id] !== ''
        )
      })
      .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
  }


  return (
    <div
      id="printable-horizontal-invoice"
      className="bg-white text-slate-950 font-sans p-5 sm:p-6 rounded-none border-2 border-slate-900 shadow-sm w-full mx-auto text-xs leading-tight select-text flex flex-col justify-between"
      style={{ maxWidth: '8.5in', minHeight: '10.2in', height: '100%' }}
    >
      {/* Top Main Commercial Header Block (Clean 2-Column Grid) */}
      <div className="grid grid-cols-12 border-b-2 border-slate-900">
        {/* Left: Supplier Info & Logo (7 cols) */}
        <div className="col-span-7 p-3.5 border-r-2 border-slate-900 flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-3">
              {tmpl.showLogo !== false && settings.logoUrl && (
                <div className="h-14 w-14 shrink-0 flex items-center justify-center">
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
              {hasEmail && (
                <p>
                  <span className="font-semibold text-slate-900">Email:</span>{' '}
                  <span className="lowercase font-normal">{storeEmail.toLowerCase()}</span>
                </p>
              )}
              {hasGstin && (
                <p className="font-bold text-slate-950">
                  <span>GSTIN:</span> {settings.gstin.toUpperCase()}
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
            <span className="font-bold text-slate-950 uppercase">
              {(invoice.customer.name || 'Walk-in Customer').toUpperCase()}
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
            {tmpl.showCustomerEmail !== false && clientEmail && (
              <div className="flex items-center gap-1.5">
                <span className="text-slate-600 font-semibold">Email:</span>
                <span className="font-bold text-slate-950 lowercase">
                  {clientEmail.toLowerCase()}
                </span>
              </div>
            )}
            {invoice.customer.gstin && (
              <div className="flex items-center gap-1.5">
                <span className="text-slate-600 font-semibold">GSTIN:</span>
                <span className="font-bold text-slate-950 uppercase font-mono">
                  {invoice.customer.gstin.toUpperCase()}
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
      <div className="border-b-2 border-slate-900 flex-1 flex flex-col justify-between">
        <table className="w-full h-full border-collapse text-left">
          <thead>
            <tr className="bg-slate-100 text-[10px] font-black uppercase text-slate-900 border-b-2 border-slate-900">
              <th className="py-2.5 px-2 text-center w-10">S.No.</th>
              <th className="py-2.5 px-3">
                {tmpl.itemLabel || 'Product / Item Description'}
              </th>
              {separateColumns.map((col) => (
                <th
                  key={col.fieldId}
                  className="py-2.5 px-2.5 text-center min-w-[70px]"
                >
                  {col.header}
                </th>
              ))}
              {tmpl.showHsn && (
                <th className="py-2.5 px-2 text-center w-20">HSN/SAC</th>
              )}
              <th className="py-2.5 px-2 text-center w-14">
                {tmpl.qtyLabel || 'Qty'}
              </th>
              <th className="py-2.5 px-2.5 text-right w-24">
                {tmpl.rateLabel || 'Rate (₹)'}
              </th>
              <th className="py-2.5 px-2.5 text-right w-24">
                {tmpl.totalLabel || 'Total (₹)'}
              </th>
              {hasDiscount && (
                <th className="py-2.5 px-2 text-right w-16">Disc (₹)</th>
              )}
              {tmpl.showTaxBreakdown && hasTax && (
                <>
                  <th className="py-2.5 px-2 text-right w-20">CGST</th>
                  <th className="py-2.5 px-2 text-right w-20">SGST</th>
                </>
              )}
              <th className="py-2.5 px-3 text-right w-28">Net Amount (₹)</th>
            </tr>
          </thead>
          <tbody className="text-[11px]">
            {invoice.items.map((item, idx) => {
              const lineGross = item.price * item.quantity
              const lineDiscount = item.discountAmount || 0
              const lineTaxable =
                typeof item.total === 'number' ? item.total : Math.max(0, lineGross - lineDiscount)
              const itemTaxRate =
                item.gstPercent !== undefined ? item.gstPercent : fallbackTaxPercent
              const itemCgst = hasTax ? lineTaxable * (itemTaxRate / 200) : 0
              const itemSgst = hasTax ? lineTaxable * (itemTaxRate / 200) : 0
              const itemNet = lineTaxable + itemCgst + itemSgst

              return (
                <tr key={idx} className="bg-white">
                  <td className="py-2 px-2 text-center font-mono text-slate-600">
                    {idx + 1}
                  </td>
                  <td className="py-2 px-3 font-bold text-slate-950">
                    <div>{item.name}</div>
                    {item.description && (
                      <div className="text-[10px] font-normal text-slate-600 italic mt-0.5">
                        {item.description}
                      </div>
                    )}
                    {/* Render custom fields merged under description in defined top-to-bottom order */}
                    {getMergedFieldsForColumn(item, 'description').map((field) => (
                      <div
                        key={field.id}
                        className="text-[10px] font-normal text-slate-700 mt-0.5 flex items-center gap-1"
                      >
                        <span className="font-semibold text-slate-600">{field.name}:</span>
                        <span>{applyTextCasing(item.customFields?.[field.id], field.textCasing)}</span>
                      </div>
                    ))}
                    <div className="flex items-center gap-2 mt-0.5">
                      {tmpl.showCategory && item.category && item.category !== item.name && (
                        <span className="text-[10px] font-normal text-slate-500">
                          Cat: {item.category}
                        </span>
                      )}
                      {item.gstPercent !== undefined && item.gstPercent > 0 && (
                        <span className="text-[9px] font-medium text-slate-500">
                          GST: {item.gstPercent}%
                        </span>
                      )}
                    </div>
                  </td>
                  {/* Separate Columns */}
                  {separateColumns.map((col) => {
                    const val = item.customFields?.[col.fieldId]
                    const colConfig = categories
                      .flatMap((c) => c.customFields || [])
                      .find((cf) => cf.id === col.fieldId)
                    const formattedVal =
                      val !== undefined && val !== ''
                        ? applyTextCasing(val, colConfig?.textCasing)
                        : '—'
                    return (
                      <td
                        key={col.fieldId}
                        className="py-2 px-2.5 text-center text-slate-800 text-[11px]"
                      >
                        {formattedVal}
                      </td>
                    )
                  })}
                  {tmpl.showHsn && (
                    <td className="py-2 px-2 text-center font-mono text-[10px] text-slate-600">
                      <div>{item.hsn || '84733099'}</div>
                      {getMergedFieldsForColumn(item, 'hsn').map((field) => (
                        <div key={field.id} className="text-[9px] text-slate-500 font-sans">
                          {field.name}: {applyTextCasing(item.customFields?.[field.id], field.textCasing)}
                        </div>
                      ))}
                    </td>
                  )}
                  <td className="py-2 px-2 text-center font-mono font-bold text-slate-900">
                    <div>{item.quantity}</div>
                    {getMergedFieldsForColumn(item, 'qty').map((field) => (
                      <div key={field.id} className="text-[9px] text-slate-500 font-sans font-normal">
                        {field.name}: {applyTextCasing(item.customFields?.[field.id], field.textCasing)}
                      </div>
                    ))}
                  </td>
                  <td className="py-2 px-2.5 text-right font-mono text-slate-700">
                    <div>{item.price.toFixed(2)}</div>
                    {getMergedFieldsForColumn(item, 'rate').map((field) => (
                      <div key={field.id} className="text-[9px] text-slate-500 font-sans">
                        {field.name}: {applyTextCasing(item.customFields?.[field.id], field.textCasing)}
                      </div>
                    ))}
                  </td>
                  <td className="py-2 px-2.5 text-right font-mono text-slate-800">
                    <div>{lineGross.toFixed(2)}</div>
                    {getMergedFieldsForColumn(item, 'total').map((field) => (
                      <div key={field.id} className="text-[9px] text-slate-500 font-sans">
                        {field.name}: {applyTextCasing(item.customFields?.[field.id], field.textCasing)}
                      </div>
                    ))}
                  </td>
                  {hasDiscount && (
                    <td className="py-2 px-2 text-right font-mono text-emerald-700">
                      {lineDiscount > 0 ? lineDiscount.toFixed(2) : '—'}
                    </td>
                  )}
                  {tmpl.showTaxBreakdown && hasTax && (
                    <>
                      <td className="py-2 px-2 text-right font-mono text-slate-700">
                        {itemCgst.toFixed(2)}
                        {item.gstPercent !== undefined && (
                          <span className="block text-[8px] text-slate-400">
                            ({(item.gstPercent / 2).toFixed(1)}%)
                          </span>
                        )}
                      </td>
                      <td className="py-2 px-2 text-right font-mono text-slate-700">
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
            {/* Flexible spacer row that absorbs all remaining height to push the total row to the bottom */}
            <tr style={{ height: '100%' }}>
              <td colSpan={100} className="p-0 border-0 text-transparent select-none pointer-events-none">&nbsp;</td>
            </tr>
          </tbody>
          {/* Table Totals Row pinned at the bottom of the items section */}
          <tfoot>
            <tr className="bg-slate-100 font-extrabold text-[11px] border-t-2 border-slate-900 text-slate-950">
              <td className="py-2 px-2 text-center"></td>
              <td className="py-2 px-3 uppercase tracking-wider">
                TOTAL ITEMS: {invoice.items.length} ({totalQty} {totalQty === 1 ? 'UNIT' : 'UNITS'})
              </td>
              {separateColumns.map((col) => (
                <td key={col.fieldId} className="py-2 px-2.5 text-center">—</td>
              ))}
              {tmpl.showHsn && (
                <td className="py-2 px-2 text-center">—</td>
              )}
              <td className="py-2 px-2 text-center font-mono">
                {totalQty}
              </td>
              <td className="py-2 px-2.5 text-right">—</td>
              <td className="py-2.5 px-2.5 text-right font-mono">
                {totalGross.toFixed(2)}
              </td>
              {hasDiscount && (
                <td className="py-2.5 px-2 text-right font-mono text-emerald-700">
                  {totalItemDiscounts.toFixed(2)}
                </td>
              )}
              {tmpl.showTaxBreakdown && hasTax && (
                <>
                  <td className="py-2.5 px-2 text-right font-mono">
                    {halfTaxAmount.toFixed(2)}
                  </td>
                  <td className="py-2.5 px-2 text-right font-mono">
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

      {/* Row 4: Commercial Summary & Payment Info Grid (Compact & Tightly Spaced) */}
      <div className="grid grid-cols-12 border-b-2 border-slate-900 bg-white">
        {/* Left: Amount In Words & Dynamic QR Code (7 cols) */}
        <div className="col-span-7 px-3 py-2 border-r-2 border-slate-900 flex flex-col justify-between space-y-1.5">
          {/* Top Info: Amount in Words */}
          {tmpl.showAmountInWords !== false && (
            <div>
              <span className="text-[9px] font-bold text-slate-500 uppercase tracking-wider block">
                Amount In Words:
              </span>
              <p className="text-[11px] font-bold text-slate-950 uppercase italic leading-tight mt-0.5">
                {numberToWordsIndian(netTotal)}
              </p>
            </div>
          )}

          {/* Dynamic Social / Payment QR Code */}
          {settings.showDynamicQrOnBill !== false && tmpl.showQrCode !== false && (
            <div className="pt-1.5 border-t border-slate-200 flex items-center gap-2.5">
              <div className="p-0.5 bg-white border border-slate-300 rounded inline-flex items-center justify-center shadow-2xs shrink-0">
                <QRCodeSVG
                  value={dynamicQr.url}
                  size={46}
                  level="M"
                  includeMargin={false}
                />
              </div>
              <div className="min-w-0">
                <span className="text-[8.5px] font-extrabold uppercase tracking-wider text-slate-900 block leading-tight">
                  {dynamicQr.header}
                </span>
                <span className="text-[8.5px] text-slate-600 font-mono truncate block max-w-56 leading-tight">
                  {dynamicQr.url}
                </span>
                <span className="text-[7.5px] text-slate-400 block mt-0.5 leading-tight">
                  Scan with any camera or UPI app
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Right: Detailed Financial Breakdown & Total Payable (5 cols) */}
        <div className="col-span-5 px-3 py-2 flex flex-col justify-between space-y-1 text-[11px]">
          <div className="space-y-0.5 leading-tight">
            {hasItemDiscounts ? (
              <>
                <div className="flex justify-between text-slate-700">
                  <span>Gross Amount:</span>
                  <span className="font-mono font-semibold">₹{totalGross.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-emerald-700 font-semibold">
                  <span>Item Discounts:</span>
                  <span className="font-mono">-₹{totalItemDiscounts.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-slate-700">
                  <span>Taxable Subtotal:</span>
                  <span className="font-mono font-semibold">₹{taxableSubtotal.toFixed(2)}</span>
                </div>
              </>
            ) : (
              <div className="flex justify-between text-slate-700">
                <span>Subtotal:</span>
                <span className="font-mono font-semibold">₹{taxableSubtotal.toFixed(2)}</span>
              </div>
            )}

            {hasBillDiscount && (
              <div className="flex justify-between text-emerald-700 font-semibold">
                <span>
                  Bill Discount {invoice.discountCode ? `(${invoice.discountCode})` : ''}:
                </span>
                <span className="font-mono">-₹{billDiscount.toFixed(2)}</span>
              </div>
            )}

            {tmpl.showTaxBreakdown && hasTax ? (
              <>
                <div className="flex justify-between text-slate-700 text-[10.5px]">
                  <span>CGST ({(fallbackTaxPercent / 2).toFixed(1)}%):</span>
                  <span className="font-mono font-semibold">₹{halfTaxAmount.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-slate-700 text-[10.5px]">
                  <span>SGST ({(fallbackTaxPercent / 2).toFixed(1)}%):</span>
                  <span className="font-mono font-semibold">₹{halfTaxAmount.toFixed(2)}</span>
                </div>
              </>
            ) : hasTax ? (
              <div className="flex justify-between text-slate-700 text-[10.5px]">
                <span>GST {hasItemGst ? '(Itemized)' : `(${fallbackTaxPercent}%)`}:</span>
                <span className="font-mono font-semibold">₹{taxAmount.toFixed(2)}</span>
              </div>
            ) : null}

            {totalAllDiscounts > 0 && (
              <div className="flex justify-between text-[10px] text-emerald-800 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200/60 font-medium">
                <span>Total Savings:</span>
                <span className="font-mono font-bold">₹{totalAllDiscounts.toFixed(2)}</span>
              </div>
            )}
          </div>

          {/* Total Payable */}
          <div className="pt-1 border-t-2 border-slate-900 flex justify-between items-center">
            <div>
              <span className="text-[11px] font-black uppercase tracking-wider block text-slate-900">
                Total Payable
              </span>
              {hasTax && (
                <span className="text-[8.5px] text-slate-500 font-medium block leading-none">
                  (Incl. all taxes)
                </span>
              )}
            </div>
            <span className="font-mono font-black text-base text-slate-950">
              ₹
              {netTotal.toLocaleString('en-IN', {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}
            </span>
          </div>
        </div>
      </div>

      {/* Row 5: Terms & Conditions (Bottom Left Only) & Signature / Stamp (Bottom Right) */}
      {(hasTerms || tmpl.showAuthorizedSignatory !== false) && (
        <div className="grid grid-cols-12 border-b-2 border-slate-900">
          {/* Bottom Left: Terms & Conditions ONLY (7 cols) */}
          <div className="col-span-7 px-3 py-2 border-r-2 border-slate-900 flex flex-col justify-between">
            {hasTerms ? (
              <div className="space-y-0.5 text-[9.5px] text-slate-600">
                <span className="font-extrabold text-slate-900 uppercase tracking-wider block">
                  Terms & Conditions:
                </span>
                <div className="space-y-0.5 leading-tight">
                  {termsLines.map((line, i) => (
                    <p key={i}>{line}</p>
                  ))}
                </div>
              </div>
            ) : (
              <div className="text-[9px] text-slate-400 italic">
                Certified that the particulars given above are true and correct.
              </div>
            )}
          </div>

          {/* Bottom Right: Signature or Stamp Box (5 cols) */}
          <div className="col-span-5 px-3 py-2 flex flex-col justify-between text-right">
            {tmpl.showAuthorizedSignatory !== false ? (
              <>
                <span className="text-[9.5px] font-extrabold uppercase text-slate-900 tracking-wider block">
                  {tmpl.signatoryText || `For ${settings.storeName || settings.businessName || 'Store Outlet'}`}
                </span>

                {/* Physical signature & rubber stamp space */}
                <div className="h-12 flex items-center justify-center text-[10px] text-slate-300 font-sans select-none pointer-events-none my-0.5">
                  <div className="w-full h-full border border-dashed border-slate-200/80 rounded flex items-center justify-center">
                    <span className="text-slate-300 text-[8.5px] font-medium tracking-wide uppercase">
                      Signature / Rubber Stamp
                    </span>
                  </div>
                </div>

                <div className="pt-0.5 inline-block self-end">
                  <div className="min-w-44 border-t border-slate-400 ml-auto" />
                  <span className="text-[9px] font-bold text-slate-800 uppercase tracking-wider block mt-0.5 text-center min-w-44 ml-auto">
                    {`Authorized Signatory ${settings.businessName || settings.storeName || ''}`.trim()}
                  </span>
                </div>
              </>
            ) : (
              <div className="h-10" />
            )}
          </div>
        </div>
      )}

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

export const VerticalInvoice = HorizontalInvoice
export const CommercialInvoice = HorizontalInvoice

