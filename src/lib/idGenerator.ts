import {
  CustomerIdSchema,
  CategoryIdSchema,
  BillingIdSchema,
  ProductIdSchema,
} from '../types/schema'

export type SequentialEntityType = 'billing' | 'customer' | 'product' | 'category'

export function getCounterDocId(
  entityType: SequentialEntityType,
  year: number = new Date().getFullYear()
): string {
  switch (entityType) {
    case 'billing':
      return `billing_${year}`
    case 'customer':
      return `customer_${year}`
    case 'product':
      return 'product'
    case 'category':
      return 'category'
    default: {
      const _exhaustive: never = entityType
      throw new Error(`Unsupported entity type: ${_exhaustive}`)
    }
  }
}

export function formatSequentialId(
  entityType: SequentialEntityType,
  sequenceNumber: number,
  year: number = new Date().getFullYear()
): string {
  if (sequenceNumber < 1 || !Number.isInteger(sequenceNumber)) {
    throw new Error(`Sequence number must be a positive integer, received: ${sequenceNumber}`)
  }

  const paddedSequence = String(sequenceNumber).padStart(6, '0')

  switch (entityType) {
    case 'billing': {
      const id = `INV-${year}-${paddedSequence}`
      BillingIdSchema.parse(id)
      return id
    }
    case 'customer': {
      const id = `CUS-${year}-${paddedSequence}`
      CustomerIdSchema.parse(id)
      return id
    }
    case 'product': {
      const id = `PROD-${paddedSequence}`
      ProductIdSchema.parse(id)
      return id
    }
    case 'category': {
      const id = `CAT-${paddedSequence}`
      CategoryIdSchema.parse(id)
      return id
    }
    default: {
      const _exhaustive: never = entityType
      throw new Error(`Unsupported entity type: ${_exhaustive}`)
    }
  }
}

export interface GenericFirestoreDocRef {
  id: string
  path?: string
}

export interface GenericFirestoreDocSnapshot {
  exists: (() => boolean) | boolean
  data: () => Record<string, unknown> | undefined
}

export interface GenericFirestoreTransaction {
  get(docRef: any): Promise<any>
  set(docRef: any, data: any, options?: any): any
  update(docRef: any, data: any): any
}

/**
 * Generates the next sequential ID inside an atomic Firestore transaction.
 *
 * This function is concurrency-safe and guarantees no duplicate IDs are issued,
 * even with simultaneous writes across multiple devices/clients.
 *
 * Usage with Firebase Web SDK:
 * ```ts
 * import { runTransaction, doc } from 'firebase/firestore'
 * import { generateNextSequentialIdInTransaction } from '@/lib/idGenerator'
 *
 * await runTransaction(db, async (transaction) => {
 *   const counterRef = doc(db, 'counters', getCounterDocId('billing', 2026))
 *   const nextBillingId = await generateNextSequentialIdInTransaction(
 *     transaction,
 *     counterRef,
 *     'billing',
 *     2026,
 *     serverTimestamp()
 *   )
 *   // Create invoice with nextBillingId...
 * })
 * ```
 */
export async function generateNextSequentialIdInTransaction(
  transaction: GenericFirestoreTransaction,
  counterDocRef: GenericFirestoreDocRef,
  entityType: SequentialEntityType,
  year: number = new Date().getFullYear(),
  timestampPayload: unknown = { seconds: Math.floor(Date.now() / 1000), nanoseconds: 0 }
): Promise<string> {
  const snapshot = await transaction.get(counterDocRef)

  let currentCount = 0
  const isExisting =
    typeof snapshot.exists === 'function' ? snapshot.exists() : Boolean(snapshot.exists)

  if (isExisting) {
    const data = snapshot.data()
    if (data && typeof data.lastValue === 'number') {
      currentCount = data.lastValue
    }
  }

  const nextCount = currentCount + 1

  transaction.set(
    counterDocRef,
    {
      counterId: counterDocRef.id || getCounterDocId(entityType, year),
      lastValue: nextCount,
      updatedAt: timestampPayload,
    },
    { merge: true }
  )

  return formatSequentialId(entityType, nextCount, year)
}
