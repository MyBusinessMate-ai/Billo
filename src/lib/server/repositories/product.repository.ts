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
  onSnapshot,
  serverTimestamp,
  increment,
  type Unsubscribe,
  type DocumentReference,
} from 'firebase/firestore'
import { db } from '../../firebase'
import { COLLECTIONS } from '../../../config/constants'
import type { Product } from '../../../types/schema'
import type { GenericFirestoreTransaction } from '../../idGenerator'
import { cleanFirestoreData } from '../../../utils/formatters'

export function getProductDocRef(productId: string): DocumentReference | null {
  if (!db) return null
  return doc(db, COLLECTIONS.PRODUCTS, productId)
}

export function subscribeProducts(
  onNext: (products: Product[]) => void,
  onError?: (err: Error) => void
): Unsubscribe {
  if (!db) {
    onNext([])
    return () => {}
  }

  const q = query(collection(db, COLLECTIONS.PRODUCTS), orderBy('createdAt', 'desc'))

  return onSnapshot(
    q,
    (snapshot) => {
      const results: Product[] = []
      snapshot.forEach((docSnap) => {
        results.push(docSnap.data() as Product)
      })
      onNext(results)
    },
    (err) => {
      console.error('[ProductRepository] Subscription error:', err)
      if (onError) onError(err)
    }
  )
}

export async function fetchProductById(productId: string): Promise<Product | null> {
  if (!db) return null
  const ref = doc(db, COLLECTIONS.PRODUCTS, productId)
  const snap = await getDoc(ref)
  if (!snap.exists()) return null
  return snap.data() as Product
}

export async function fetchActiveProducts(): Promise<Product[]> {
  if (!db) return []
  const q = query(
    collection(db, COLLECTIONS.PRODUCTS),
    where('isActive', '==', true),
    orderBy('productName', 'asc')
  )
  const snap = await getDocs(q)
  return snap.docs.map((d) => d.data() as Product)
}

export async function createProductDoc(product: Product): Promise<void> {
  if (!db) throw new Error('Firestore is not initialized')
  const ref = doc(db, COLLECTIONS.PRODUCTS, product.productId)
  await setDoc(ref, cleanFirestoreData(product))
}

export async function updateProductDoc(productId: string, data: Partial<Product>): Promise<void> {
  if (!db) throw new Error('Firestore is not initialized')
  const ref = doc(db, COLLECTIONS.PRODUCTS, productId)
  await updateDoc(
    ref,
    cleanFirestoreData({
      ...data,
      updatedAt: serverTimestamp(),
    })
  )
}

export async function updateProductStockDoc(productId: string, newStock: number): Promise<void> {
  if (!db) throw new Error('Firestore is not initialized')
  const ref = doc(db, COLLECTIONS.PRODUCTS, productId)
  await updateDoc(ref, {
    quantity: Math.max(0, newStock),
    updatedAt: serverTimestamp(),
  })
}

export async function restockProductDoc(productId: string, addedQty: number): Promise<void> {
  if (!db) throw new Error('Firestore is not initialized')
  const ref = doc(db, COLLECTIONS.PRODUCTS, productId)
  await updateDoc(ref, {
    quantity: increment(addedQty),
    updatedAt: serverTimestamp(),
  })
}

export async function deleteProductDoc(productId: string): Promise<void> {
  if (!db) throw new Error('Firestore is not initialized')
  const ref = doc(db, COLLECTIONS.PRODUCTS, productId)
  await deleteDoc(ref)
}

export function decrementStockInTransaction(
  transaction: GenericFirestoreTransaction,
  productId: string,
  quantitySold: number,
  timestampPayload: unknown = serverTimestamp()
): void {
  if (!db) return
  const ref = doc(db, COLLECTIONS.PRODUCTS, productId)
  transaction.set(
    ref as unknown as { id: string; path: string },
    {
      quantity: increment(-quantitySold) as unknown as number,
      updatedAt: timestampPayload,
    },
    { merge: true }
  )
}
