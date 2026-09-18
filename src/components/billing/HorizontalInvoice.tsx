import React, { useMemo, useState, useLayoutEffect, useRef } from 'react'
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
  const hasEmail = Boolean(tmpl.showEmail !== false && storeEmail && storeEmail.trim() !== '')
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
  const hasItemGst = invoice.items.some(
    (item) => item.gstPercent !== undefined && item.gstPercent > 0
  )

  // Total Gross across items (Rate * Qty)
  const totalGross = invoice.items.reduce((sum, item) => sum + item.price * item.quantity, 0)

  // Total Item-wise Discounts
  const totalItemDiscounts = invoice.items.reduce(
    (sum, item) => sum + (item.discountAmount || 0),
    0
  )

  // Taxable Subtotal (Sum of items after item-wise discounts)
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

  // Taxable Value after bill discount (Indian GST Section 15(3))
  const finalTaxableValue = Math.max(0, taxableSubtotal - billDiscount)
  const discountRatio = taxableSubtotal > 0 ? finalTaxableValue / taxableSubtotal : 1

  // Place of Supply & Inter-State Detection
  const storeStateCode = settings.gstin ? settings.gstin.trim().slice(0, 2) : '36'
  const customerGstin = invoice.customer.gstin ? invoice.customer.gstin.trim().toUpperCase() : ''
  const customerStateCode = customerGstin ? customerGstin.slice(0, 2) : storeStateCode
  const isInterState =
    invoice.isInterState !== undefined
      ? invoice.isInterState
      : Boolean(customerGstin && customerStateCode && customerStateCode !== storeStateCode)

  const placeOfSupply =
    invoice.placeOfSupply ||
    (isInterState ? `Inter-State (Code ${customerStateCode})` : `Intra-State (Telangana - 36)`)

  // Total tax computed on discounted taxable amounts
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

  // hasDiscount determines if the Disc (₹) column in the line item table should be shown
  const hasDiscount = Boolean(tmpl.showDiscount !== false && (hasItemDiscounts || hasBillDiscount))

  const exactNet = Math.max(0, finalTaxableValue + taxAmount)
  const netTotal = invoice.netTotal || Math.round(exactNet)
  const roundOff =
    invoice.roundOff !== undefined
      ? invoice.roundOff
      : Math.round((netTotal - exactNet) * 100) / 100

  const halfTaxAmount = hasTax ? taxAmount / 2 : 0
  const totalQty = invoice.items.reduce((sum, item) => sum + item.quantity, 0)

  const hsnSummaryList = useMemo(() => {
    const map = new Map<
      string,
      { hsn: string; taxableAmount: number; rate: number; taxAmount: number }
    >()

    invoice.items.forEach((item) => {
      const hsnCode = item.hsn || '84733099'
      const lineGross = item.price * item.quantity
      const lineDisc = item.discountAmount || 0
      const lineTaxable =
        (typeof item.total === 'number' ? item.total : Math.max(0, lineGross - lineDisc)) *
        discountRatio
      const rate = item.gstPercent !== undefined ? item.gstPercent : fallbackTaxPercent
      const lineTax = (lineTaxable * rate) / 100

      const existing = map.get(hsnCode)
      if (existing) {
        existing.taxableAmount += lineTaxable
        existing.taxAmount += lineTax
      } else {
        map.set(hsnCode, {
          hsn: hsnCode,
          taxableAmount: lineTaxable,
          rate,
          taxAmount: lineTax,
        })
      }
    })

    return Array.from(map.values())
  }, [invoice.items, discountRatio, fallbackTaxPercent])

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
        categories.find((c) => c.categoryName.toLowerCase() === item.category.toLowerCase())
          ?.customFields ||
        []
      configs.forEach((cfg) => {
        if (
          cfg.billColumnPlacement === 'separate' &&
          item.customFields?.[cfg.id] !== undefined &&
          item.customFields?.[cfg.id] !== ''
        ) {
          if (!headerMap.has(cfg.id)) {
            headerMap.set(cfg.id, {
              header: cfg.billColumnHeader || cfg.name,
              fieldId: cfg.id,
            })
          }
        }
      })
    })
    return Array.from(headerMap.values())
  }, [invoice.items, categories])

  // Get merged custom fields for a specific column on an item
  const getMergedFieldsForColumn = (item: BillingItem, targetCol: string) => {
    const configs =
      item.customFieldConfigs ||
      categories.find((c) => c.categoryName.toLowerCase() === item.category.toLowerCase())
        ?.customFields ||
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

  // --- Real DOM Measurement & Dynamic Height Estimation ---
  const measureRef = useRef<HTMLDivElement>(null)
  const [measuredHeights, setMeasuredHeights] = useState<{
    header: number
    contHeader: number
    tableHead: number
    totals: number
    closing: number
    rows: number[]
  } | null>(null)

  useLayoutEffect(() => {
    if (!measureRef.current) return
    const container = measureRef.current

    const headerEl = container.querySelector('[data-measure="header"]') as HTMLElement | null
    const contHeaderEl = container.querySelector(
      '[data-measure="cont-header"]'
    ) as HTMLElement | null
    const tableHeadEl = container.querySelector('[data-measure="table-head"]') as HTMLElement | null
    const totalsEl = container.querySelector('[data-measure="totals"]') as HTMLElement | null
    const closingEl = container.querySelector('[data-measure="closing"]') as HTMLElement | null
    const rowNodes = container.querySelectorAll('[data-measure="item-rows"] > tr')

    const header = headerEl ? Math.ceil(headerEl.getBoundingClientRect().height) : 155
    const contHeader = contHeaderEl ? Math.ceil(contHeaderEl.getBoundingClientRect().height) : 30
    const tableHead = tableHeadEl ? Math.ceil(tableHeadEl.getBoundingClientRect().height) : 24
    const totals = totalsEl ? Math.ceil(totalsEl.getBoundingClientRect().height) : 26
    const closing = closingEl ? Math.ceil(closingEl.getBoundingClientRect().height) : 200

    const rows: number[] = []
    rowNodes.forEach((node) => {
      rows.push(Math.ceil((node as HTMLElement).getBoundingClientRect().height))
    })

    setMeasuredHeights((prev) => {
      if (
        prev &&
        prev.header === header &&
        prev.contHeader === contHeader &&
        prev.tableHead === tableHead &&
        prev.totals === totals &&
        prev.closing === closing &&
        prev.rows.length === rows.length &&
        prev.rows.every((h, i) => Math.abs(h - rows[i]) < 1)
      ) {
        return prev
      }
      return { header, contHeader, tableHead, totals, closing, rows }
    })
  }, [invoice.items, invoice.customer, invoice.id, tmpl, categories, settings, separateColumns])

  // --- Dynamic Multi-Page Pagination Algorithm ---
  const { pages } = useMemo(() => {
    const getItemHeight = (originalIndex: number, item: BillingItem): number => {
      if (measuredHeights && measuredHeights.rows[originalIndex] !== undefined) {
        return measuredHeights.rows[originalIndex]
      }

      // Adaptive fallback when DOM not yet measured:
      // Real A4 at 7.7in width has ~200px description cell. Font is 9px. ~28 chars per line.
      let h = 27 // Base row: padding (12px) + font (14px) + border (1px)
      if (item.name && item.name.length > 25) {
        h += Math.max(0, Math.ceil(item.name.length / 25) - 1) * 14
      }
      if (item.description && item.description.trim()) {
        const descLines = Math.max(1, Math.ceil(item.description.trim().length / 28))
        h += descLines * 12 + 2
      }
      const mergedFields = getMergedFieldsForColumn(item, 'description')
      if (mergedFields.length > 0) {
        const fieldLines = Math.ceil(mergedFields.length / 2)
        h += fieldLines * 12 + 2
      }
      const hasCat = tmpl.showCategory && item.category && item.category !== item.name
      const hasGst = item.gstPercent !== undefined && item.gstPercent > 0
      if (hasCat || hasGst) {
        h += 10
      }
      return h
    }

    // Usable canvas inside 10.0in page (960px - 28px padding - 4px border = 928px)
    // 915px provides a bulletproof safe margin against any printer drivers / Letter / A4
    const PAGE_USABLE_HEIGHT = 915
    const PAGE1_TOP_HEIGHT = measuredHeights ? measuredHeights.header : 155
    const CONTINUATION_HEADER_HEIGHT = measuredHeights ? measuredHeights.contHeader : 30
    const TABLE_HEADER_HEIGHT = measuredHeights ? measuredHeights.tableHead : 24
    const TOTALS_ROW_HEIGHT = measuredHeights ? measuredHeights.totals : 26
    const CLOSING_SUMMARY_HEIGHT =
      (measuredHeights ? measuredHeights.closing : 200) + TOTALS_ROW_HEIGHT
    const PAGE1_BOTTOM_BAR_HEIGHT = 26

    // Single-page budget
    const singlePageCapacity = PAGE_USABLE_HEIGHT - PAGE1_TOP_HEIGHT - CLOSING_SUMMARY_HEIGHT
    const allItemsWithIndex = invoice.items.map((item, idx) => ({ item, originalIndex: idx }))
    const totalItemHeight = allItemsWithIndex.reduce(
      (sum, it) => sum + getItemHeight(it.originalIndex, it.item),
      0
    )

    // Scenario A: Everything cleanly fits on 1 single page!
    if (totalItemHeight <= singlePageCapacity) {
      return {
        pages: [
          {
            pageNumber: 1,
            totalPages: 1,
            isFirstPage: true,
            isLastPage: true,
            items: allItemsWithIndex,
          },
        ],
      }
    }

    // Scenario B: Multi-page invoice needed!
    const page1Capacity = PAGE_USABLE_HEIGHT - PAGE1_TOP_HEIGHT - PAGE1_BOTTOM_BAR_HEIGHT
    const finalPageCapacity =
      PAGE_USABLE_HEIGHT - CONTINUATION_HEADER_HEIGHT - TABLE_HEADER_HEIGHT - CLOSING_SUMMARY_HEIGHT
    const middlePageCapacity =
      PAGE_USABLE_HEIGHT -
      CONTINUATION_HEADER_HEIGHT -
      TABLE_HEADER_HEIGHT -
      PAGE1_BOTTOM_BAR_HEIGHT

    const pageList: Array<{
      pageNumber: number
      totalPages: number
      isFirstPage: boolean
      isLastPage: boolean
      items: Array<{ item: BillingItem; originalIndex: number }>
    }> = []

    let remaining = [...allItemsWithIndex]
    let currentPageNum = 1

    while (remaining.length > 0) {
      const isFirst = currentPageNum === 1
      const remHeight = remaining.reduce(
        (sum, it) => sum + getItemHeight(it.originalIndex, it.item),
        0
      )

      // If not first page and all remaining items fit on final page with closing summary:
      if (!isFirst && remHeight <= finalPageCapacity) {
        pageList.push({
          pageNumber: currentPageNum,
          totalPages: currentPageNum,
          isFirstPage: false,
          isLastPage: true,
          items: remaining,
        })
        break
      }

      const capacity = isFirst ? page1Capacity : middlePageCapacity
      const currentItems: Array<{ item: BillingItem; originalIndex: number }> = []
      let currentH = 0

      for (let i = 0; i < remaining.length; i++) {
        const it = remaining[i]
        const h = getItemHeight(it.originalIndex, it.item)
        const itemsLeftAfterThis = remaining.length - (i + 1)

        // When splitting across pages, ensure at least 2 items remain on the final page
        // so the closing page is not an orphan summary page
        if (isFirst && remaining.length > 2 && itemsLeftAfterThis > 0 && itemsLeftAfterThis < 2) {
          break
        }

        if (currentH + h <= capacity || currentItems.length === 0) {
          currentItems.push(it)
          currentH += h
        } else {
          break
        }
      }

      const isLast = currentItems.length === remaining.length
      pageList.push({
        pageNumber: currentPageNum,
        totalPages: currentPageNum,
        isFirstPage: isFirst,
        isLastPage: isLast,
        items: currentItems,
      })

      remaining = remaining.slice(currentItems.length)
      currentPageNum++
    }

    const totalP = pageList.length
    pageList.forEach((p) => {
      p.totalPages = totalP
      p.isLastPage = p.pageNumber === totalP
    })

    return { pages: pageList }
  }, [
    measuredHeights,
    invoice.items,
    tmpl.showHsn,
    hasTax,
    hsnSummaryList.length,
    hasTerms,
    tmpl.showAuthorizedSignatory,
    tmpl.showFooterNotice,
    tmpl.showCategory,
    separateColumns,
  ])

  // --- Modular Component Sub-Renderers ---

  const renderStoreHeader = () => (
    <div className="grid grid-cols-12 border-b-2 border-slate-900 print-keep-together">
      {/* Left: Supplier Info & Logo (7 cols) */}
      <div className="col-span-7 p-3 border-r-2 border-slate-900 flex flex-col justify-between">
        <div>
          <div className="flex items-center gap-3">
            {tmpl.showLogo !== false && settings.logoUrl && (
              <div className="h-12 w-12 shrink-0 flex items-center justify-center">
                <img
                  src={settings.logoUrl}
                  alt="Store Logo"
                  className="w-full h-full object-contain"
                />
              </div>
            )}
            <div>
              <h1 className="text-sm font-extrabold uppercase tracking-tight text-slate-950 leading-tight">
                {settings.storeName || settings.businessName || 'Store Identity'}
              </h1>
              {tmpl.invoiceSubtitle && (
                <span className="text-[9.5px] text-slate-500 font-medium block">
                  {tmpl.invoiceSubtitle}
                </span>
              )}
            </div>
          </div>

          <div className="text-[10px] text-slate-700 space-y-0.5 mt-1.5 leading-tight">
            {hasAddress && <p>{settings.registeredAddress}</p>}
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
      <div className="col-span-5 p-3 flex flex-col justify-between">
        <div className="flex justify-between items-center pb-1.5 border-b border-slate-200">
          <span className="inline-block border border-slate-900 text-slate-900 px-2 py-0.5 text-[10px] font-black uppercase tracking-wider">
            {tmpl.invoiceTitle || 'TAX INVOICE'}
          </span>
          <span className="text-[8.5px] font-extrabold text-slate-500 uppercase tracking-wider">
            Original Copy
          </span>
        </div>

        <div className="flex items-start justify-between gap-2 pt-1.5">
          <div className="text-[10px] space-y-0.5 text-slate-800 flex-1 leading-tight">
            <div>
              <span className="text-slate-500 text-[9.5px]">Invoice No:</span>{' '}
              <strong className="font-mono text-slate-950 text-[11px]">{formattedInvoiceNo}</strong>
            </div>
            <div>
              <span className="text-slate-500 text-[9.5px]">Date:</span>{' '}
              <strong className="text-slate-900">{invoice.date}</strong>
            </div>
            <div>
              <span className="text-slate-500 text-[9.5px]">Time:</span>{' '}
              <span>{invoice.timestamp || 'Immediate'}</span>
            </div>
            <div>
              <span className="text-slate-500 text-[9.5px]">Payment:</span>{' '}
              <span className="font-semibold text-slate-900">{invoice.paymentMethod}</span>
            </div>
          </div>

          {/* UPI Payment QR Code (Only for UPI payments) */}
          {isUpiPayment && tmpl.showQrCode !== false && (
            <div className="flex flex-col items-center">
              <div className="w-[58px] h-[58px] p-0.5 bg-white border border-slate-300 rounded shrink-0 flex items-center justify-center shadow-2xs">
                <QRCodeSVG value={upiQrPayload} size={52} level="M" includeMargin={false} />
              </div>
              <span className="text-[7.5px] font-bold text-slate-600 mt-0.5 uppercase tracking-tight">
                UPI Pay
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  )

  const renderCustomerDetails = () => (
    <div className="px-3 py-1.5 border-b-2 border-slate-900 text-[10.5px]">
      <div className="flex flex-wrap items-center justify-between gap-x-5 gap-y-1 text-slate-800">
        <div className="flex items-center gap-1.5">
          <span className="text-slate-600 font-semibold">Customer Name:</span>
          <span className="font-bold text-slate-950 uppercase">
            {(invoice.customer.name || 'Walk-in Customer').toUpperCase()}
          </span>
        </div>
        <div className="flex flex-wrap items-center gap-x-5 gap-y-1">
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
          {placeOfSupply && (
            <div className="flex items-center gap-1.5">
              <span className="text-slate-600 font-semibold">Place of Supply:</span>
              <span className="font-bold text-slate-900 font-mono text-[9.5px]">
                {placeOfSupply}
              </span>
            </div>
          )}
        </div>
      </div>

      {tmpl.showShipTo && (
        <div className="mt-1 pt-1 border-t border-dashed border-slate-300 text-[10px] text-slate-600 flex justify-between">
          <span>
            <strong className="text-slate-800">Ship To:</strong> Counter Store Delivery
          </span>
          <span className="text-emerald-800 font-bold uppercase">Paid & Delivered</span>
        </div>
      )}
    </div>
  )

  const renderContinuationHeader = (pageNumber: number, totalPages: number) => (
    <div className="border-b-2 border-slate-900 px-3 py-1.5 bg-slate-50 flex items-center justify-between text-[10.5px]">
      <div className="flex items-center gap-2">
        <span className="font-black uppercase text-slate-900">
          {settings.storeName || settings.businessName || 'TAX INVOICE'}
        </span>
        <span className="text-slate-400">•</span>
        <span className="font-mono text-slate-700">Inv #{formattedInvoiceNo}</span>
        <span className="text-slate-400">•</span>
        <span className="text-slate-600">{invoice.date}</span>
      </div>
      <div className="flex items-center gap-3">
        <span className="text-slate-700 font-medium">
          Customer:{' '}
          <strong className="text-slate-950 uppercase">
            {invoice.customer.name || 'Walk-in Customer'}
          </strong>
        </span>
        <span className="bg-slate-900 text-white font-black px-2 py-0.5 rounded text-[9.5px] uppercase tracking-wider">
          Page {pageNumber} of {totalPages}
        </span>
      </div>
    </div>
  )

  const renderTableHeaders = () => (
    <tr className="bg-slate-100 text-[9.5px] font-black uppercase text-slate-900 border-b-2 border-slate-900">
      <th className="py-2 px-2 text-center w-10">S.No.</th>
      <th className="py-2 px-3">{tmpl.itemLabel || 'Product / Item Description'}</th>
      {separateColumns.map((col) => (
        <th key={col.fieldId} className="py-2 px-2 text-center min-w-[65px]">
          {col.header}
        </th>
      ))}
      {tmpl.showHsn && <th className="py-2 px-2 text-center w-16">HSN/SAC</th>}
      <th className="py-2 px-2 text-center w-12">{tmpl.qtyLabel || 'Qty'}</th>
      <th className="py-2 px-2 text-right w-20">{tmpl.rateLabel || 'Rate (₹)'}</th>
      <th className="py-2 px-2 text-right w-20">{tmpl.totalLabel || 'Total (₹)'}</th>
      {hasDiscount && <th className="py-2 px-2 text-right w-14">Disc (₹)</th>}
      {tmpl.showTaxBreakdown &&
        hasTax &&
        (isInterState ? (
          <th className="py-2 px-2 text-right w-18">IGST</th>
        ) : (
          <>
            <th className="py-2 px-2 text-right w-16">CGST</th>
            <th className="py-2 px-2 text-right w-16">SGST</th>
          </>
        ))}
      <th className="py-2 px-3 text-right w-24">Net Amount (₹)</th>
    </tr>
  )

  const renderItemRow = (item: BillingItem, originalIndex: number) => {
    const lineGross = item.price * item.quantity
    const lineDiscount = item.discountAmount || 0
    const lineTaxable =
      typeof item.total === 'number' ? item.total : Math.max(0, lineGross - lineDiscount)
    const itemTaxRate = item.gstPercent !== undefined ? item.gstPercent : fallbackTaxPercent
    const lineTax = hasTax ? (lineTaxable * discountRatio * itemTaxRate) / 100 : 0
    const itemCgst = lineTax / 2
    const itemSgst = lineTax / 2
    const itemIgst = lineTax
    const itemNet = lineTaxable + lineTax

    const mergedDescFields = getMergedFieldsForColumn(item, 'description')
    const hasCategoryBadge = tmpl.showCategory && item.category && item.category !== item.name
    const hasGstBadge = item.gstPercent !== undefined && item.gstPercent > 0
    const hasSecondaryMetadata = mergedDescFields.length > 0 || hasCategoryBadge || hasGstBadge

    return (
      <tr key={originalIndex} className="bg-white">
        <td className="py-1.5 px-2 text-center font-mono text-slate-600 text-[10.5px] align-top">
          {originalIndex + 1}
        </td>
        <td className="py-1.5 px-3 font-bold text-slate-950 align-top">
          <div className="text-[10.5px] leading-snug">{item.name}</div>
          {item.description && (
            <div className="text-[9px] font-normal text-slate-600 italic mt-0.5 leading-tight">
              {item.description}
            </div>
          )}
          {/* Render custom fields and category and GST compactly inline */}
          {hasSecondaryMetadata && (
            <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 mt-0.5 text-[8.5px] text-slate-600 font-normal leading-tight">
              {mergedDescFields.map((field) => (
                <span key={field.id} className="inline-flex items-center gap-0.5">
                  <span className="font-semibold text-slate-600">{field.name}:</span>
                  <span>{applyTextCasing(item.customFields?.[field.id], field.textCasing)}</span>
                </span>
              ))}
              {hasCategoryBadge && <span className="text-slate-500">Cat: {item.category}</span>}
              {hasGstBadge && (
                <span className="text-slate-500 font-medium">GST: {item.gstPercent}%</span>
              )}
            </div>
          )}
        </td>
        {/* Separate Columns */}
        {separateColumns.map((col) => {
          const val = item.customFields?.[col.fieldId]
          const colConfig = categories
            .flatMap((c) => c.customFields || [])
            .find((cf) => cf.id === col.fieldId)
          const formattedVal =
            val !== undefined && val !== '' ? applyTextCasing(val, colConfig?.textCasing) : '—'
          return (
            <td
              key={col.fieldId}
              className="py-1.5 px-2 text-center text-slate-800 text-[10.5px] align-top"
            >
              {formattedVal}
            </td>
          )
        })}
        {tmpl.showHsn && (
          <td className="py-1.5 px-2 text-center font-mono text-[9.5px] text-slate-600 align-top">
            <div>{item.hsn || '84733099'}</div>
            {getMergedFieldsForColumn(item, 'hsn').map((field) => (
              <div key={field.id} className="text-[8.5px] text-slate-500 font-sans">
                {field.name}: {applyTextCasing(item.customFields?.[field.id], field.textCasing)}
              </div>
            ))}
          </td>
        )}
        <td className="py-1.5 px-2 text-center font-mono font-bold text-slate-900 text-[10.5px] align-top">
          <div>{item.quantity}</div>
          {getMergedFieldsForColumn(item, 'qty').map((field) => (
            <div key={field.id} className="text-[8.5px] text-slate-500 font-sans font-normal">
              {field.name}: {applyTextCasing(item.customFields?.[field.id], field.textCasing)}
            </div>
          ))}
        </td>
        <td className="py-1.5 px-2 text-right font-mono text-slate-700 text-[10.5px] align-top">
          <div>{item.price.toFixed(2)}</div>
          {getMergedFieldsForColumn(item, 'rate').map((field) => (
            <div key={field.id} className="text-[8.5px] text-slate-500 font-sans">
              {field.name}: {applyTextCasing(item.customFields?.[field.id], field.textCasing)}
            </div>
          ))}
        </td>
        <td className="py-1.5 px-2 text-right font-mono text-slate-800 text-[10.5px] align-top">
          <div>{lineGross.toFixed(2)}</div>
          {getMergedFieldsForColumn(item, 'total').map((field) => (
            <div key={field.id} className="text-[8.5px] text-slate-500 font-sans">
              {field.name}: {applyTextCasing(item.customFields?.[field.id], field.textCasing)}
            </div>
          ))}
        </td>
        {hasDiscount && (
          <td className="py-1.5 px-2 text-right font-mono text-emerald-700 text-[10.5px] align-top">
            {lineDiscount > 0 ? lineDiscount.toFixed(2) : '—'}
          </td>
        )}
        {tmpl.showTaxBreakdown &&
          hasTax &&
          (isInterState ? (
            <td className="py-1.5 px-2 text-right font-mono text-slate-700 text-[10.5px] align-top">
              {itemIgst.toFixed(2)}
              {item.gstPercent !== undefined && (
                <span className="block text-[7.5px] text-slate-400">
                  ({item.gstPercent.toFixed(1)}%)
                </span>
              )}
            </td>
          ) : (
            <>
              <td className="py-1.5 px-2 text-right font-mono text-slate-700 text-[10.5px] align-top">
                {itemCgst.toFixed(2)}
                {item.gstPercent !== undefined && (
                  <span className="block text-[7.5px] text-slate-400">
                    ({(item.gstPercent / 2).toFixed(1)}%)
                  </span>
                )}
              </td>
              <td className="py-1.5 px-2 text-right font-mono text-slate-700 text-[10.5px] align-top">
                {itemSgst.toFixed(2)}
                {item.gstPercent !== undefined && (
                  <span className="block text-[7.5px] text-slate-400">
                    ({(item.gstPercent / 2).toFixed(1)}%)
                  </span>
                )}
              </td>
            </>
          ))}
        <td className="py-1.5 px-3 text-right font-mono font-black text-slate-950 text-[10.5px] align-top">
          {itemNet.toFixed(2)}
        </td>
      </tr>
    )
  }

  const renderTotalsRow = () => (
    <tr className="bg-slate-100 font-extrabold text-[10.5px] border-t-2 border-b border-slate-900 text-slate-950 print-keep-together">
      <td className="py-1.5 px-2 text-center"></td>
      <td className="py-1.5 px-3 uppercase tracking-wider">
        TOTAL ITEMS: {invoice.items.length} ({totalQty} {totalQty === 1 ? 'UNIT' : 'UNITS'})
      </td>
      {separateColumns.map((col) => (
        <td key={col.fieldId} className="py-1.5 px-2 text-center">
          —
        </td>
      ))}
      {tmpl.showHsn && <td className="py-1.5 px-2 text-center">—</td>}
      <td className="py-1.5 px-2 text-center font-mono">{totalQty}</td>
      <td className="py-1.5 px-2 text-right">—</td>
      <td className="py-1.5 px-2 text-right font-mono">{totalGross.toFixed(2)}</td>
      {hasDiscount && (
        <td className="py-1.5 px-2 text-right font-mono text-emerald-700">
          {totalItemDiscounts.toFixed(2)}
        </td>
      )}
      {tmpl.showTaxBreakdown &&
        hasTax &&
        (isInterState ? (
          <td className="py-1.5 px-2 text-right font-mono">{taxAmount.toFixed(2)}</td>
        ) : (
          <>
            <td className="py-1.5 px-2 text-right font-mono">{halfTaxAmount.toFixed(2)}</td>
            <td className="py-1.5 px-2 text-right font-mono">{halfTaxAmount.toFixed(2)}</td>
          </>
        ))}
      <td className="py-1.5 px-3 text-right font-mono font-black">₹{netTotal.toFixed(2)}</td>
    </tr>
  )

  const renderPageBottomBar = (pageNumber: number, totalPages: number) => (
    <div className="border-t-2 border-slate-900 py-1.5 px-3 flex justify-between items-center text-[9.5px] font-bold text-slate-700 bg-slate-100 print-keep-together">
      <span>
        Page {pageNumber} of {totalPages}
      </span>
      <span className="text-slate-900 uppercase tracking-wider">
        Continued on Page {pageNumber + 1} ➔
      </span>
    </div>
  )

  const renderClosingSummary = () => (
    <div className="print-keep-together">
      {/* Optional HSN/SAC Tax Summary Table (GST Section 15 Compliance) */}
      {tmpl.showHsn !== false && hasTax && hsnSummaryList.length > 0 && (
        <div className="border-b-2 border-slate-900 bg-slate-50/70 px-3 py-1.5 print-keep-together">
          <div className="text-[8.5px] font-black uppercase text-slate-700 tracking-wider mb-1 flex items-center justify-between">
            <span>HSN/SAC Tax Breakdown</span>
            <span className="text-[8px] font-bold text-slate-500">
              {isInterState ? 'Inter-State Supply (IGST)' : 'Intra-State Supply (CGST + SGST)'}
            </span>
          </div>
          <table className="w-full text-left text-[9.5px] border border-slate-300">
            <thead>
              <tr className="bg-slate-200/80 text-slate-800 font-bold border-b border-slate-300">
                <th className="py-0.5 px-2 border-r border-slate-300">HSN/SAC</th>
                <th className="py-0.5 px-2 text-right border-r border-slate-300">
                  Taxable Value (₹)
                </th>
                {isInterState ? (
                  <th className="py-0.5 px-2 text-right border-r border-slate-300">
                    IGST Rate & Amt (₹)
                  </th>
                ) : (
                  <>
                    <th className="py-0.5 px-2 text-right border-r border-slate-300">CGST (₹)</th>
                    <th className="py-0.5 px-2 text-right border-r border-slate-300">SGST (₹)</th>
                  </>
                )}
                <th className="py-0.5 px-2 text-right">Total Tax (₹)</th>
              </tr>
            </thead>
            <tbody>
              {hsnSummaryList.map((h, i) => (
                <tr key={i} className="border-b border-slate-200 bg-white">
                  <td className="py-0.5 px-2 font-mono font-semibold text-slate-900 border-r border-slate-200">
                    {h.hsn}
                  </td>
                  <td className="py-0.5 px-2 text-right font-mono text-slate-800 border-r border-slate-200">
                    {h.taxableAmount.toFixed(2)}
                  </td>
                  {isInterState ? (
                    <td className="py-0.5 px-2 text-right font-mono text-slate-800 border-r border-slate-200">
                      {h.taxAmount.toFixed(2)}{' '}
                      <span className="text-[8px] text-slate-500">({h.rate}%)</span>
                    </td>
                  ) : (
                    <>
                      <td className="py-0.5 px-2 text-right font-mono text-slate-800 border-r border-slate-200">
                        {(h.taxAmount / 2).toFixed(2)}{' '}
                        <span className="text-[8px] text-slate-500">
                          ({(h.rate / 2).toFixed(1)}%)
                        </span>
                      </td>
                      <td className="py-0.5 px-2 text-right font-mono text-slate-800 border-r border-slate-200">
                        {(h.taxAmount / 2).toFixed(2)}{' '}
                        <span className="text-[8px] text-slate-500">
                          ({(h.rate / 2).toFixed(1)}%)
                        </span>
                      </td>
                    </>
                  )}
                  <td className="py-0.5 px-2 text-right font-mono font-bold text-slate-950">
                    {h.taxAmount.toFixed(2)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Commercial Summary & Payment Info Grid */}
      <div className="grid grid-cols-12 border-b-2 border-slate-900 bg-white">
        {/* Left: Amount In Words & Dynamic QR Code (7 cols) */}
        <div className="col-span-7 px-3 py-1.5 border-r-2 border-slate-900 flex flex-col justify-between space-y-1">
          {tmpl.showAmountInWords !== false && (
            <div>
              <span className="text-[8.5px] font-bold text-slate-500 uppercase tracking-wider block">
                Amount In Words:
              </span>
              <p className="text-[10px] font-bold text-slate-950 uppercase italic leading-tight mt-0.5">
                {numberToWordsIndian(netTotal)}
              </p>
            </div>
          )}

          {settings.showDynamicQrOnBill !== false && tmpl.showQrCode !== false && (
            <div className="pt-1 border-t border-slate-200 flex items-center gap-2">
              <div className="p-0.5 bg-white border border-slate-300 rounded inline-flex items-center justify-center shadow-2xs shrink-0">
                <QRCodeSVG value={dynamicQr.url} size={42} level="M" includeMargin={false} />
              </div>
              <div className="min-w-0">
                <span className="text-[8px] font-extrabold uppercase tracking-wider text-slate-900 block leading-tight">
                  {dynamicQr.header}
                </span>
                <span className="text-[8px] text-slate-600 font-mono truncate block max-w-56 leading-tight">
                  {dynamicQr.url}
                </span>
                <span className="text-[7px] text-slate-400 block mt-0.5 leading-tight">
                  Scan with any camera or UPI app
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Right: Detailed Financial Breakdown & Total Payable (5 cols) */}
        <div className="col-span-5 px-3 py-1.5 flex flex-col justify-between space-y-0.5 text-[10px]">
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
              <>
                <div className="flex justify-between text-emerald-700 font-semibold">
                  <span>
                    Bill Discount {invoice.discountCode ? `(${invoice.discountCode})` : ''}:
                  </span>
                  <span className="font-mono">-₹{billDiscount.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-slate-800 font-medium">
                  <span>Taxable Value (Sec 15):</span>
                  <span className="font-mono font-semibold">₹{finalTaxableValue.toFixed(2)}</span>
                </div>
              </>
            )}

            {tmpl.showTaxBreakdown && hasTax ? (
              isInterState ? (
                <div className="flex justify-between text-slate-700 text-[10px]">
                  <span>IGST ({fallbackTaxPercent}%):</span>
                  <span className="font-mono font-semibold">₹{taxAmount.toFixed(2)}</span>
                </div>
              ) : (
                <>
                  <div className="flex justify-between text-slate-700 text-[10px]">
                    <span>CGST ({(fallbackTaxPercent / 2).toFixed(1)}%):</span>
                    <span className="font-mono font-semibold">₹{halfTaxAmount.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-slate-700 text-[10px]">
                    <span>SGST ({(fallbackTaxPercent / 2).toFixed(1)}%):</span>
                    <span className="font-mono font-semibold">₹{halfTaxAmount.toFixed(2)}</span>
                  </div>
                </>
              )
            ) : hasTax ? (
              <div className="flex justify-between text-slate-700 text-[10px]">
                <span>
                  {isInterState ? 'IGST' : 'GST'}{' '}
                  {hasItemGst ? '(Itemized)' : `(${fallbackTaxPercent}%)`}:
                </span>
                <span className="font-mono font-semibold">₹{taxAmount.toFixed(2)}</span>
              </div>
            ) : null}

            {roundOff !== 0 && (
              <div className="flex justify-between text-slate-600 text-[10px]">
                <span>Round Off:</span>
                <span className="font-mono font-semibold">
                  {roundOff > 0 ? `+₹${roundOff.toFixed(2)}` : `-₹${Math.abs(roundOff).toFixed(2)}`}
                </span>
              </div>
            )}

            {totalAllDiscounts > 0 && (
              <div className="flex justify-between text-[9px] text-emerald-800 bg-emerald-50 px-1 py-0.5 rounded border border-emerald-200/60 font-medium">
                <span>Total Savings:</span>
                <span className="font-mono font-bold">₹{totalAllDiscounts.toFixed(2)}</span>
              </div>
            )}
          </div>

          {/* Total Payable */}
          <div className="pt-1 border-t-2 border-slate-900 flex justify-between items-center">
            <div>
              <span className="text-[10.5px] font-black uppercase tracking-wider block text-slate-900">
                Total Payable
              </span>
              {hasTax && (
                <span className="text-[8px] text-slate-500 font-medium block leading-none">
                  (Incl. all taxes)
                </span>
              )}
            </div>
            <span className="font-mono font-black text-sm text-slate-950">
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
          <div className="col-span-7 px-3 py-1.5 border-r-2 border-slate-900 flex flex-col justify-between">
            {hasTerms ? (
              <div className="space-y-0.5 text-[9px] text-slate-600">
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
              <div className="text-[8.5px] text-slate-400 italic">
                Certified that the particulars given above are true and correct.
              </div>
            )}
          </div>

          {/* Bottom Right: Signature or Stamp Box (5 cols) */}
          <div className="col-span-5 px-3 py-1.5 flex flex-col justify-between text-right">
            {tmpl.showAuthorizedSignatory !== false ? (
              <>
                <span className="text-[9px] font-extrabold uppercase text-slate-900 tracking-wider block">
                  {tmpl.signatoryText ||
                    `For ${settings.storeName || settings.businessName || 'Store Outlet'}`}
                </span>

                {/* Physical signature & rubber stamp space */}
                <div className="h-10 flex items-center justify-center text-[9px] text-slate-300 font-sans select-none pointer-events-none my-0.5">
                  <div className="w-full h-full border border-dashed border-slate-200/80 rounded flex items-center justify-center">
                    <span className="text-slate-300 text-[8px] font-medium tracking-wide uppercase">
                      Signature / Rubber Stamp
                    </span>
                  </div>
                </div>

                <div className="pt-0.5 inline-block self-end">
                  <div className="min-w-40 border-t border-slate-400 ml-auto" />
                  <span className="text-[8.5px] font-bold text-slate-800 uppercase tracking-wider block mt-0.5 text-center min-w-40 ml-auto">
                    {`Authorized Signatory ${settings.businessName || settings.storeName || ''}`.trim()}
                  </span>
                </div>
              </>
            ) : (
              <div className="h-8" />
            )}
          </div>
        </div>
      )}

      {/* Footer Line */}
      {tmpl.showFooterNotice && (
        <div className="pt-1.5 flex items-center justify-between text-[8.5px] text-slate-500 font-medium">
          <span>{settings.storeName || settings.businessName}</span>
          <span className="font-semibold">{tmpl.footerNotice}</span>
          <span>Receipt #{formattedInvoiceNo}</span>
        </div>
      )}
    </div>
  )

  return (
    <div id="printable-horizontal-invoice" className="w-full flex flex-col gap-6 items-center">
      {/* Hidden Measurement Sandbox: Exact print width (7.7in) and padding (14px) */}
      <div
        ref={measureRef}
        aria-hidden="true"
        className="no-print pointer-events-none select-none overflow-hidden"
        style={{
          position: 'fixed',
          left: '-99999px',
          top: 0,
          width: '7.7in',
          maxWidth: '7.7in',
          padding: '14px',
          boxSizing: 'border-box',
          visibility: 'hidden',
          zIndex: -9999,
        }}
      >
        <div data-measure="header">
          {renderStoreHeader()}
          {renderCustomerDetails()}
        </div>
        <div data-measure="cont-header">{renderContinuationHeader(2, 2)}</div>
        <table className="w-full border-collapse text-left text-[11px]">
          <thead data-measure="table-head">{renderTableHeaders()}</thead>
          <tbody data-measure="item-rows">
            {invoice.items.map((item, idx) => renderItemRow(item, idx))}
          </tbody>
          <tfoot data-measure="totals">{renderTotalsRow()}</tfoot>
        </table>
        <div data-measure="closing">{renderClosingSummary()}</div>
      </div>

      {pages.map((page) => (
        <div
          key={page.pageNumber}
          className="invoice-page bg-white text-slate-950 font-sans p-3.5 rounded-none border-2 border-slate-900 shadow-md w-full mx-auto text-xs leading-tight select-text flex flex-col justify-between"
          style={{
            maxWidth: '7.7in',
            minHeight: '10.0in',
            boxSizing: 'border-box',
          }}
        >
          {page.isFirstPage ? (
            <>
              {renderStoreHeader()}
              {renderCustomerDetails()}
            </>
          ) : (
            renderContinuationHeader(page.pageNumber, page.totalPages)
          )}

          {/* Row 3: Main Line Items Table */}
          <div className="border-b-2 border-slate-900 flex-1 flex flex-col justify-between">
            <table className="w-full h-full border-collapse text-left">
              <thead>{renderTableHeaders()}</thead>
              <tbody className="text-[11px]">
                {page.items.map(({ item, originalIndex }) => renderItemRow(item, originalIndex))}
                {/* Flexible spacer row that absorbs all remaining height to push the totals row cleanly to the bottom */}
                <tr style={{ height: '100%' }}>
                  <td
                    colSpan={100}
                    className="p-0 border-0 text-transparent select-none pointer-events-none"
                  >
                    &nbsp;
                  </td>
                </tr>
                {page.isLastPage && renderTotalsRow()}
              </tbody>
            </table>
          </div>

          {/* Bottom Bar or Closing Summary */}
          {page.isLastPage
            ? renderClosingSummary()
            : renderPageBottomBar(page.pageNumber, page.totalPages)}
        </div>
      ))}
    </div>
  )
}

export const VerticalInvoice = HorizontalInvoice
export const CommercialInvoice = HorizontalInvoice
