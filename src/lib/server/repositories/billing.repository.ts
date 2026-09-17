import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  orderBy,
  limit,
  onSnapshot,
  serverTimestamp,
  updateDoc,
  deleteDoc,
  setDoc,
  type Unsubscribe,
  type DocumentReference,
} from 'firebase/firestore'
import { db } from '../../firebase'
import { COLLECTIONS } from '../../../config/constants'
import type { Billing } from '../../../types/schema'
import type { GenericFirestoreTransaction } from '../../idGenerator'
import { cleanFirestoreData } from '../../../utils/formatters'

export function getBillingDocRef(billingId: string): DocumentReference | null {
  if (!db) return null
  return doc(db, COLLECTIONS.BILLINGS, billingId)
}

export function subscribeBillings(
  onNext: (billings: Billing[]) => void,
  onError?: (err: Error) => void
): Unsubscribe {
  if (!db) {
    onNext([])
    return () => {}
  }

  const q = query(collection(db, COLLECTIONS.BILLINGS), orderBy('createdAt', 'desc'), limit(100))

  return onSnapshot(
    q,
    (snapshot) => {
      const results: Billing[] = []
      snapshot.forEach((docSnap) => {
        results.push(docSnap.data() as Billing)
      })
      onNext(results)
    },
    (err) => {
      console.error('[BillingRepository] Subscription error:', err)
      if (onError) onError(err)
    }
  )
}

export async function fetchBillingById(billingId: string): Promise<Billing | null> {
  if (!db) return null
  const cleanId = billingId.startsWith('#') ? billingId.slice(1) : billingId
  const ref = doc(db, COLLECTIONS.BILLINGS, cleanId)
  const snap = await getDoc(ref)
  if (!snap.exists()) return null
  return snap.data() as Billing
}

export async function fetchRecentBillings(limitCount: number = 50): Promise<Billing[]> {
  if (!db) return []
  const q = query(
    collection(db, COLLECTIONS.BILLINGS),
    orderBy('createdAt', 'desc'),
    limit(limitCount)
  )
  const snap = await getDocs(q)
  return snap.docs.map((d) => d.data() as Billing)
}

export function createBillingDocInTransaction(
  transaction: GenericFirestoreTransaction,
  billing: Billing
): void {
  if (!db) throw new Error('Firestore is not initialized')
  const ref = doc(db, COLLECTIONS.BILLINGS, billing.billingId)
  transaction.set(ref as unknown as { id: string; path: string }, cleanFirestoreData(billing))
}

export async function createBillingDoc(billing: Billing): Promise<void> {
  if (!db) throw new Error('Firestore is not initialized')
  const ref = doc(db, COLLECTIONS.BILLINGS, billing.billingId)
  await setDoc(ref, cleanFirestoreData(billing))
}

export async function updateBillingStatusDoc(billingId: string, status: string): Promise<void> {
  if (!db) throw new Error('Firestore is not initialized')
  const cleanId = billingId.startsWith('#') ? billingId.slice(1) : billingId
  const ref = doc(db, COLLECTIONS.BILLINGS, cleanId)
  await updateDoc(ref, {
    status,
    updatedAt: serverTimestamp(),
  })
}

export async function updateBillingFormatDoc(billingId: string, invoiceFormat: string): Promise<void> {
  if (!db) return
  const cleanId = billingId.startsWith('#') ? billingId.slice(1) : billingId
  const ref = doc(db, COLLECTIONS.BILLINGS, cleanId)
  await updateDoc(ref, {
    invoiceFormat,
    updatedAt: serverTimestamp(),
  })
}

export async function deleteBillingDoc(billingId: string): Promise<void> {
  if (!db) throw new Error('Firestore is not initialized')
  const cleanId = billingId.startsWith('#') ? billingId.slice(1) : billingId
  const ref = doc(db, COLLECTIONS.BILLINGS, cleanId)
  await deleteDoc(ref)
}
