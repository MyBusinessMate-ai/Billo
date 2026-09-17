import {
  fetchCustomerById,
  fetchCustomerByPhone,
  createCustomerDoc,
  updateCustomerDoc,
  deleteCustomerDoc,
  subscribeCustomers,
} from '../repositories/customer.repository'
import { getNextSequentialId } from '../repositories/counter.repository'
import { db } from '../../firebase'
import { runTransaction } from 'firebase/firestore'
import { sanitizePhone, formatDateTime } from '../../../utils/formatters'
import type { Customer as FirestoreCustomer } from '../../../types/schema'
import type { Customer as UICustomer, PaymentRail } from '../../../types/pos'

export function mapFirestoreCustomerToUI(c: FirestoreCustomer): UICustomer {
  const lastVisitFormatted = c.lastVisitAt ? formatDateTime(c.lastVisitAt) : ''
  return {
    id: c.customerId,
    name: c.name.toUpperCase(),
    phone: c.phoneNo,
    email: c.email ? c.email.toLowerCase() : '',
    gstin: c.gstin ? c.gstin.toUpperCase() : undefined,
    visits: c.visits || 0,
    totalSpend: 0,
    lastVisit: lastVisitFormatted || formatDateTime(c.createdAt),
    preferredRail: 'UPI' as PaymentRail,
    isNew: (c.visits || 0) <= 1,
  }
}

export function mapUICustomerToFirestore(
  ui: Partial<UICustomer> & { name: string; phone: string; id: string }
): FirestoreCustomer {
  const nowPayload = { seconds: Math.floor(Date.now() / 1000), nanoseconds: 0 }
  const doc: FirestoreCustomer = {
    customerId: ui.id,
    name: ui.name.trim().toUpperCase(),
    phoneNo: sanitizePhone(ui.phone),
    visits: ui.visits || 1,
    createdAt: nowPayload,
    updatedAt: nowPayload,
  }
  if (ui.email?.trim()) {
    doc.email = ui.email.trim().toLowerCase()
  }
  if (ui.gstin?.trim()) {
    doc.gstin = ui.gstin.trim().toUpperCase()
  }
  return doc
}

export const customerService = {
  subscribe(onData: (customers: UICustomer[]) => void, onError?: (err: Error) => void) {
    return subscribeCustomers((firestoreList) => {
      onData(firestoreList.map(mapFirestoreCustomerToUI))
    }, onError)
  },

  async findByPhone(phoneQuery: string): Promise<FirestoreCustomer | null> {
    const clean = sanitizePhone(phoneQuery)
    if (!clean || clean.length < 3) return null
    return fetchCustomerByPhone(clean)
  },

  async findById(customerId: string): Promise<FirestoreCustomer | null> {
    return fetchCustomerById(customerId)
  },

  async registerCustomer(data: {
    name: string
    phone: string
    email?: string
    gstin?: string
  }): Promise<UICustomer> {
    const cleanPhone = sanitizePhone(data.phone)
    if (!data.name || data.name.trim().length === 0) {
      throw new Error('Customer name is required')
    }

    // Check if customer with phone already exists
    if (cleanPhone && cleanPhone.length >= 7) {
      const existing = await fetchCustomerByPhone(cleanPhone)
      if (existing) {
        return mapFirestoreCustomerToUI(existing)
      }
    }

    let customerId = `CUS-${new Date().getFullYear()}-${Math.floor(100000 + Math.random() * 900000)}`

    if (db) {
      try {
        await runTransaction(db, async (transaction) => {
          customerId = await getNextSequentialId(
            transaction as any,
            'customer',
            new Date().getFullYear()
          )
        })
      } catch (err) {
        console.warn('[CustomerService] Fallback to random ID due to counter transaction:', err)
      }
    }

    const nowSeconds = Math.floor(Date.now() / 1000)
    const newFirestoreDoc: FirestoreCustomer = {
      customerId,
      name: data.name.trim().toUpperCase(),
      phoneNo: cleanPhone,
      visits: 1,
      createdAt: { seconds: nowSeconds, nanoseconds: 0 },
      updatedAt: { seconds: nowSeconds, nanoseconds: 0 },
    }
    if (data.email?.trim()) {
      newFirestoreDoc.email = data.email.trim().toLowerCase()
    }
    if (data.gstin?.trim()) {
      newFirestoreDoc.gstin = data.gstin.trim().toUpperCase()
    }

    if (db) {
      await createCustomerDoc(newFirestoreDoc)
    }

    return mapFirestoreCustomerToUI(newFirestoreDoc)
  },

  async updateCustomer(customerId: string, partial: Partial<FirestoreCustomer>): Promise<void> {
    if (db) {
      await updateCustomerDoc(customerId, partial)
    }
  },

  async deleteCustomer(customerId: string): Promise<void> {
    if (db) {
      await deleteCustomerDoc(customerId)
    }
  },
}
