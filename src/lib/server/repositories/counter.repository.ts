import {
  doc,
  getDoc,
  onSnapshot,
  type DocumentReference,
  serverTimestamp,
  type Unsubscribe,
} from 'firebase/firestore'
import { db } from '../../firebase'
import { COLLECTIONS } from '../../../config/constants'
import {
  getCounterDocId,
  type SequentialEntityType,
  generateNextSequentialIdInTransaction,
  type GenericFirestoreTransaction,
} from '../../idGenerator'
import type { Counter } from '../../../types/schema'

export function getCounterRef(
  entityType: SequentialEntityType,
  year: number = new Date().getFullYear()
): DocumentReference | null {
  if (!db) return null
  const docId = getCounterDocId(entityType, year)
  return doc(db, COLLECTIONS.COUNTERS, docId)
}

export function subscribeCounter(
  entityType: SequentialEntityType,
  year: number = new Date().getFullYear(),
  onNext: (counter: Counter | null) => void,
  onError?: (err: Error) => void
): Unsubscribe {
  const ref = getCounterRef(entityType, year)
  if (!ref) {
    onNext(null)
    return () => {}
  }

  return onSnapshot(
    ref,
    (snapshot) => {
      if (snapshot.exists()) {
        onNext(snapshot.data() as Counter)
      } else {
        onNext(null)
      }
    },
    (err) => {
      console.error(`[CounterRepository] Subscription error for ${entityType}:`, err)
      if (onError) onError(err)
    }
  )
}

export async function fetchCounter(
  entityType: SequentialEntityType,
  year: number = new Date().getFullYear()
): Promise<Counter | null> {
  const ref = getCounterRef(entityType, year)
  if (!ref) return null

  const snap = await getDoc(ref)
  if (!snap.exists()) return null
  return snap.data() as Counter
}

export async function getNextSequentialId(
  transaction: GenericFirestoreTransaction,
  entityType: SequentialEntityType,
  year: number = new Date().getFullYear()
): Promise<string> {
  const ref = getCounterRef(entityType, year)
  if (!ref) {
    throw new Error('Firestore is not initialized')
  }
  return generateNextSequentialIdInTransaction(
    transaction,
    ref as unknown as { id: string; path: string },
    entityType,
    year,
    serverTimestamp()
  )
}
