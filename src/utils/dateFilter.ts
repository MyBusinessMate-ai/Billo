import type { BillingInvoice } from '../types/pos'
import { formatDate } from './formatters'

export type DateFilterType =
  'all' | 'today' | 'yesterday' | 'this_week' | 'this_month' | 'last_3_months' | 'custom'

export interface DateFilterState {
  type: DateFilterType
  customMode?: 'single' | 'range'
  singleDate?: string // YYYY-MM-DD
  startDate?: string // YYYY-MM-DD
  endDate?: string // YYYY-MM-DD
}

/**
 * Normalizes any date representation to YYYY-MM-DD string format.
 */
export function normalizeDateString(dateVal?: string): string {
  if (!dateVal) return ''
  const trimmed = dateVal.trim()
  if (/^\d{4}-\d{2}-\d{2}/.test(trimmed)) {
    return trimmed.substring(0, 10)
  }
  const parsed = new Date(trimmed)
  if (!isNaN(parsed.getTime())) {
    return formatDate(parsed)
  }
  return trimmed
}

/**
 * Checks if a given invoice date matches the specified date filter.
 */
export function matchesDateFilter(
  rawInvoiceDate: string | undefined,
  filter: DateFilterState,
  referenceDateStr?: string
): boolean {
  if (filter.type === 'all') return true

  const invDate = normalizeDateString(rawInvoiceDate)
  if (!invDate) return false

  const todayStr = referenceDateStr || formatDate(new Date())
  const todayDate = new Date(`${todayStr}T00:00:00`)

  if (filter.type === 'today') {
    return invDate === todayStr
  }

  if (filter.type === 'yesterday') {
    const yesterday = new Date(todayDate)
    yesterday.setDate(yesterday.getDate() - 1)
    const yesterdayStr = formatDate(yesterday)
    return invDate === yesterdayStr
  }

  if (filter.type === 'this_week') {
    // Week starting Monday
    const day = todayDate.getDay() // 0 = Sun, 1 = Mon, ..., 6 = Sat
    const diffToMonday = day === 0 ? 6 : day - 1
    const monday = new Date(todayDate)
    monday.setDate(todayDate.getDate() - diffToMonday)
    const mondayStr = formatDate(monday)
    return invDate >= mondayStr && invDate <= todayStr
  }

  if (filter.type === 'this_month') {
    const startOfMonthStr = `${todayStr.substring(0, 7)}-01`
    return invDate >= startOfMonthStr && invDate <= todayStr
  }

  if (filter.type === 'last_3_months') {
    const threeMonthsAgo = new Date(todayDate)
    threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3)
    const threeMonthsAgoStr = formatDate(threeMonthsAgo)
    return invDate >= threeMonthsAgoStr && invDate <= todayStr
  }

  if (filter.type === 'custom') {
    if (filter.customMode === 'single' || (!filter.startDate && !filter.endDate)) {
      if (!filter.singleDate) return true
      return invDate === filter.singleDate
    }
    // Range mode
    const start = filter.startDate || ''
    const end = filter.endDate || ''
    if (start && end) {
      return invDate >= start && invDate <= end
    }
    if (start) {
      return invDate >= start
    }
    if (end) {
      return invDate <= end
    }
    return true
  }

  return true
}

/**
 * Returns a human-friendly label for the current date filter.
 */
export function getDateFilterLabel(filter: DateFilterState): string {
  switch (filter.type) {
    case 'all':
      return 'All Time'
    case 'today':
      return 'Today'
    case 'yesterday':
      return 'Yesterday'
    case 'this_week':
      return 'This Week'
    case 'this_month':
      return 'This Month'
    case 'last_3_months':
      return 'Last 3 Months'
    case 'custom': {
      if (filter.customMode === 'single' || (!filter.startDate && !filter.endDate)) {
        return filter.singleDate ? `Date: ${filter.singleDate}` : 'Custom Date'
      }
      if (filter.startDate && filter.endDate) {
        if (filter.startDate === filter.endDate) {
          return `Date: ${filter.startDate}`
        }
        return `${filter.startDate} to ${filter.endDate}`
      }
      if (filter.startDate) return `From ${filter.startDate}`
      if (filter.endDate) return `Until ${filter.endDate}`
      return 'Custom Range'
    }
    default:
      return 'Date Filter'
  }
}

/**
 * Exports billing invoices to CSV format with UTF-8 BOM encoding using Blob download.
 */
export function exportBillingInvoicesToCSV(
  invoices: BillingInvoice[],
  filenamePrefix = 'LedgerPOS_Billing_History'
): void {
  if (!invoices || invoices.length === 0) {
    return
  }

  const headers = [
    'Receipt ID',
    'Date',
    'Timestamp',
    'Customer Name',
    'Customer Phone',
    'Items Count',
    'Subtotal (INR)',
    'Tax (INR)',
    'Discount (INR)',
    'Net Total (INR)',
    'Payment Rail',
    'Status',
    'Internal Note',
  ]

  const escapeCSV = (val: string | number | undefined | null) => {
    if (val === undefined || val === null) return '""'
    const str = String(val).replace(/"/g, '""')
    return `"${str}"`
  }

  const rows = invoices.map((inv) => [
    escapeCSV(inv.id),
    escapeCSV(inv.date || ''),
    escapeCSV(inv.timestamp || ''),
    escapeCSV(inv.customer?.name || 'Walk-in Customer'),
    escapeCSV(inv.customer?.phone || '—'),
    inv.items?.length || 0,
    (inv.subtotal || 0).toFixed(2),
    (inv.taxAmount || 0).toFixed(2),
    (inv.discountAmount || 0).toFixed(2),
    (inv.netTotal || 0).toFixed(2),
    escapeCSV(inv.paymentMethod || 'Cash'),
    escapeCSV((inv.status || 'completed').toUpperCase()),
    escapeCSV(inv.internalNote || ''),
  ])

  const csvString = [headers.join(','), ...rows.map((r) => r.join(','))].join('\r\n')

  const blob = new Blob(['\uFEFF' + csvString], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.setAttribute(
    'download',
    `${filenamePrefix}_${new Date().toISOString().split('T')[0]}_${Date.now()}.csv`
  )
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}
