import {
  fetchBillingById,
  fetchRecentBillings,
  createBillingDoc,
  createBillingDocInTransaction,
  updateBillingStatusDoc,
  deleteBillingDoc,
  subscribeBillings,
} from '../repositories/billing.repository'
import { getNextSequentialId } from '../repositories/counter.repository'
import { decrementStockInTransaction } from '../repositories/product.repository'
import { updateCustomerStatsInTransaction } from '../repositories/customer.repository'
import { db } from '../../firebase'
import { runTransaction } from 'firebase/firestore'
import { formatDate, formatDateTime } from '../../../utils/formatters'
import type {
  Billing as FirestoreBilling,
  BillingItem as FirestoreBillingItem,
  CategoryCustomField,
} from '../../../types/schema'
import type {
  BillingInvoice as UIBillingInvoice,
  BillingItem as UIBillingItem,
  InvoiceStatus,
} from '../../../types/pos'

export function mapFirestoreBillingToUI(b: FirestoreBilling): UIBillingInvoice {
  const numericPart = parseInt(b.billingId.split('-').pop() || '1', 10)
  const itemsMapped: UIBillingItem[] = b.items.map((it) => ({
    productId: it.productId || it.categoryId,
    name: it.itemName || it.categoryName,
    description: it.description,
    category: it.categoryName,
    price: it.unitPrice,
    quantity: it.quantity,
    total: it.total,
    hsn: it.hsn,
    gstPercent: it.gstPercent,
    discountAmount: it.discountAmount,
    discountPercent: it.discountPercent,
    customFields: it.customFields,
    customFieldConfigs: it.customFieldConfigs,
  }))

  const computedSubtotal = itemsMapped.reduce((s, it) => s + it.total, 0)
  const subtotal = b.subtotal ?? (computedSubtotal > 0 ? computedSubtotal : b.total)
  const taxAmount = b.taxAmount ?? Math.round(subtotal * 0.05 * 100) / 100
  const discountAmount = b.discountAmount ?? 0

  return {
    id: `#${b.billingId}`,
    numericId: isNaN(numericPart) ? 1 : numericPart,
    customer: {
      id: b.customerId,
      name: (b.customerName || (b.customerId ? 'Customer' : 'Walk-in Customer')).toUpperCase(),
      phone: b.customerPhone || '—',
      email: b.customerEmail ? b.customerEmail.toLowerCase() : undefined,
      gstin: b.customerGstin ? b.customerGstin.toUpperCase() : undefined,
      isWalkIn: !b.customerId,
    },
    items: itemsMapped,
    subtotal,
    taxPercent: b.taxPercent ?? 5,
    taxAmount,
    discountCode: b.discountCode,
    discountAmount,
    netTotal: b.total,
    paymentMethod: b.billMode === 'upi' ? 'UPI / QR' : b.billMode === 'card' ? 'Card' : 'Cash',
    status: 'completed' as InvoiceStatus,
    internalNote: b.internalNote,
    invoiceFormat: (b as any).invoiceFormat || 'thermal',
    timestamp: formatDateTime(b.createdAt),
    date: formatDate(b.createdAt),
  }
}

export const billingService = {
  subscribe(onData: (invoices: UIBillingInvoice[]) => void, onError?: (err: Error) => void) {
    return subscribeBillings((firestoreList) => {
      onData(firestoreList.map(mapFirestoreBillingToUI))
    }, onError)
  },

  async getRecent(limitCount: number = 50): Promise<UIBillingInvoice[]> {
    const list = await fetchRecentBillings(limitCount)
    return list.map(mapFirestoreBillingToUI)
  },

  async getById(billingId: string): Promise<FirestoreBilling | null> {
    return fetchBillingById(billingId)
  },

  async createInvoice(invoiceData: {
    customerId?: string
    customerName?: string
    customerPhone?: string
    customerEmail?: string
    customerGstin?: string
    items: Array<{
      productId?: string
      productName?: string
      itemName?: string
      description?: string
      categoryId: string
      categoryName: string
      quantity: number
      unitPrice: number
      total: number
      hsn?: string
      gstPercent?: number
      discountAmount?: number
      discountPercent?: number
      customFields?: Record<string, any>
      customFieldConfigs?: CategoryCustomField[]
    }>
    subtotal: number
    taxPercent: number
    taxAmount: number
    discountCode?: string
    discountAmount: number
    netTotal: number
    billMode: 'cash' | 'upi' | 'card'
    invoiceFormat?: 'thermal' | 'a4'
    internalNote?: string
  }): Promise<{ billingId: string }> {
    const year = new Date().getFullYear()
    let generatedBillingId = `INV-${year}-${Math.floor(100000 + Math.random() * 900000)}`

    const firestoreItems: FirestoreBillingItem[] = invoiceData.items.map((it) => ({
      ...(it.productId ? { productId: it.productId } : {}),
      categoryId: it.categoryId || 'CAT-000001',
      categoryName: it.categoryName || 'General',
      itemName: it.productName || it.itemName || 'Item',
      ...(it.description ? { description: it.description } : {}),
      quantity: it.quantity,
      unitPrice: it.unitPrice,
      total: it.total,
      ...(it.hsn ? { hsn: it.hsn } : {}),
      ...(it.gstPercent !== undefined ? { gstPercent: it.gstPercent } : {}),
      ...(it.discountAmount !== undefined ? { discountAmount: it.discountAmount } : {}),
      ...(it.discountPercent !== undefined ? { discountPercent: it.discountPercent } : {}),
      ...(it.customFields ? { customFields: it.customFields } : {}),
      ...(it.customFieldConfigs ? { customFieldConfigs: it.customFieldConfigs } : {}),
    }))

    const nowSeconds = Math.floor(Date.now() / 1000)

    const billingDoc: FirestoreBilling = {
      billingId: generatedBillingId,
      ...(invoiceData.customerId ? { customerId: invoiceData.customerId } : {}),
      ...(invoiceData.customerName ? { customerName: invoiceData.customerName.toUpperCase() } : {}),
      ...(invoiceData.customerPhone ? { customerPhone: invoiceData.customerPhone } : {}),
      ...(invoiceData.customerEmail
        ? { customerEmail: invoiceData.customerEmail.toLowerCase() }
        : {}),
      ...(invoiceData.customerGstin
        ? { customerGstin: invoiceData.customerGstin.toUpperCase() }
        : {}),
      items: firestoreItems,
      subtotal: invoiceData.subtotal,
      taxPercent: invoiceData.taxPercent,
      taxAmount: invoiceData.taxAmount,
      ...(invoiceData.discountCode ? { discountCode: invoiceData.discountCode } : {}),
      discountAmount: invoiceData.discountAmount,
      total: invoiceData.netTotal,
      billMode: invoiceData.billMode,
      invoiceFormat: invoiceData.invoiceFormat || 'thermal',
      ...(invoiceData.internalNote ? { internalNote: invoiceData.internalNote } : {}),
      createdAt: { seconds: nowSeconds, nanoseconds: 0 },
      updatedAt: { seconds: nowSeconds, nanoseconds: 0 },
    }

    if (db) {
      try {
        await runTransaction(db, async (transaction) => {
          // 1. Generate concurrency-safe sequential invoice ID inside transaction
          try {
            generatedBillingId = await getNextSequentialId(transaction as any, 'billing', year)
            billingDoc.billingId = generatedBillingId
          } catch (counterErr) {
            console.warn(
              '[BillingService] Counter transaction skipped, using fallback ID:',
              counterErr
            )
          }

          // 2. Deduct inventory stock for each product in transaction (only for real catalog products)
          for (const item of invoiceData.items) {
            if (item.productId && item.productId.startsWith('PROD-')) {
              try {
                decrementStockInTransaction(transaction as any, item.productId, item.quantity)
              } catch (err) {
                console.warn(
                  '[BillingService] Skipped stock decrement for ad-hoc item:',
                  item.productId
                )
              }
            }
          }

          // 3. Update customer stats if registered customerId provided
          if (invoiceData.customerId && invoiceData.customerId.startsWith('CUS-')) {
            try {
              updateCustomerStatsInTransaction(
                transaction as any,
                invoiceData.customerId,
                invoiceData.netTotal
              )
            } catch (err) {
              console.warn(
                '[BillingService] Skipped customer stats update for:',
                invoiceData.customerId
              )
            }
          }

          // 4. Save billing document inside the same atomic transaction
          createBillingDocInTransaction(transaction as any, billingDoc)
        })
      } catch (transErr) {
        console.warn('[BillingService] Transaction failed or offline, saving directly:', transErr)
        await createBillingDoc(billingDoc)
      }
    }

    return { billingId: generatedBillingId }
  },

  async refundInvoice(billingId: string): Promise<void> {
    if (db) {
      await updateBillingStatusDoc(billingId, 'refunded')
    }
  },

  async deleteInvoice(billingId: string): Promise<void> {
    if (db) {
      await deleteBillingDoc(billingId)
    }
  },
}
