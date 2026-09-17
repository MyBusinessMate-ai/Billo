import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  limit,
  onSnapshot,
  serverTimestamp,
  increment,
  type Unsubscribe,
  type DocumentReference,
} from 'firebase/firestore'
import { db } from '../../firebase'
import { COLLECTIONS } from '../../../config/constants'
import type { Customer } from '../../../types/schema'
import type { GenericFirestoreTransaction } from '../../idGenerator'
import { cleanFirestoreData } from '../../../utils/formatters'

export function getCustomerDocRef(customerId: string): DocumentReference | null {
  if (!db) return null
  return doc(db, COLLECTIONS.CUSTOMERS, customerId)
}

export function subscribeCustomers(
  onNext: (customers: Customer[]) => void,
  onError?: (err: Error) => void
): Unsubscribe {
  if (!db) {
    onNext([])
    return () => {}
  }

  const q = query(collection(db, COLLECTIONS.CUSTOMERS), orderBy('createdAt', 'desc'), limit(200))

  return onSnapshot(
    q,
    (snapshot) => {
      const results: Customer[] = []
      snapshot.forEach((docSnap) => {
        results.push(docSnap.data() as Customer)
      })
      onNext(results)
    },
    (err) => {
      console.error('[CustomerRepository] Subscription error:', err)
      if (onError) onError(err)
    }
  )
}

export async function fetchCustomerById(customerId: string): Promise<Customer | null> {
  if (!db) return null
  const ref = doc(db, COLLECTIONS.CUSTOMERS, customerId)
  const snap = await getDoc(ref)
  if (!snap.exists()) return null
  return snap.data() as Customer
}

export async function fetchCustomerByPhone(phone: string): Promise<Customer | null> {
  if (!db) return null
  const q = query(collection(db, COLLECTIONS.CUSTOMERS), where('phoneNo', '==', phone), limit(1))
  const snap = await getDocs(q)
  if (snap.empty) return null
  return snap.docs[0].data() as Customer
}

export async function createCustomerDoc(customer: Customer): Promise<void> {
  if (!db) throw new Error('Firestore is not initialized')
  const ref = doc(db, COLLECTIONS.CUSTOMERS, customer.customerId)
  await setDoc(ref, cleanFirestoreData(customer))
}

export async function updateCustomerDoc(
  customerId: string,
  data: Partial<Customer>
): Promise<void> {
  if (!db) throw new Error('Firestore is not initialized')
  const ref = doc(db, COLLECTIONS.CUSTOMERS, customerId)
  await updateDoc(
    ref,
    cleanFirestoreData({
      ...data,
      updatedAt: serverTimestamp(),
    })
  )
}

export async function deleteCustomerDoc(customerId: string): Promise<void> {
  if (!db) throw new Error('Firestore is not initialized')
  const ref = doc(db, COLLECTIONS.CUSTOMERS, customerId)
  await deleteDoc(ref)
}

export function updateCustomerStatsInTransaction(
  transaction: GenericFirestoreTransaction,
  customerId: string,
  totalSpend: number,
  timestampPayload: unknown = serverTimestamp()
): void {
  if (!db) return
  const ref = doc(db, COLLECTIONS.CUSTOMERS, customerId)
  transaction.set(
    ref as unknown as { id: string; path: string },
    {
      visits: increment(1) as unknown as number,
      totalSpend: increment(totalSpend) as unknown as number,
      lastVisitAt: timestampPayload,
      updatedAt: timestampPayload,
    },
    { merge: true }
  )
}
