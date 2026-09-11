import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  orderBy,
  onSnapshot,
  serverTimestamp,
  type Unsubscribe,
  type DocumentReference,
} from 'firebase/firestore'
import { db } from '../../firebase'
import { COLLECTIONS } from '../../../config/constants'
import type { Category } from '../../../types/schema'
import { cleanFirestoreData } from '../../../utils/formatters'

export function getCategoryDocRef(categoryId: string): DocumentReference | null {
  if (!db) return null
  return doc(db, COLLECTIONS.CATEGORIES, categoryId)
}

export function subscribeCategories(
  onNext: (categories: Category[]) => void,
  onError?: (err: Error) => void
): Unsubscribe {
  if (!db) {
    onNext([])
    return () => {}
  }

  const q = query(collection(db, COLLECTIONS.CATEGORIES), orderBy('categoryName', 'asc'))

  return onSnapshot(
    q,
    (snapshot) => {
      const results: Category[] = []
      snapshot.forEach((docSnap) => {
        results.push(docSnap.data() as Category)
      })
      onNext(results)
    },
    (err) => {
      console.error('[CategoryRepository] Subscription error:', err)
      if (onError) onError(err)
    }
  )
}

export async function fetchCategories(): Promise<Category[]> {
  if (!db) return []
  const q = query(collection(db, COLLECTIONS.CATEGORIES), orderBy('categoryName', 'asc'))
  const snap = await getDocs(q)
  return snap.docs.map((d) => d.data() as Category)
}

export async function fetchCategoryById(categoryId: string): Promise<Category | null> {
  if (!db) return null
  const ref = doc(db, COLLECTIONS.CATEGORIES, categoryId)
  const snap = await getDoc(ref)
  if (!snap.exists()) return null
  return snap.data() as Category
}

export async function createCategoryDoc(category: Category): Promise<void> {
  if (!db) throw new Error('Firestore is not initialized')
  const ref = doc(db, COLLECTIONS.CATEGORIES, category.categoryId)
  await setDoc(ref, cleanFirestoreData(category))
}

export async function updateCategoryDoc(
  categoryId: string,
  data: Partial<Category>
): Promise<void> {
  if (!db) throw new Error('Firestore is not initialized')
  const ref = doc(db, COLLECTIONS.CATEGORIES, categoryId)
  await updateDoc(
    ref,
    cleanFirestoreData({
      ...data,
      updatedAt: serverTimestamp(),
    })
  )
}

export async function deleteCategoryDoc(categoryId: string): Promise<void> {
  if (!db) throw new Error('Firestore is not initialized')
  const ref = doc(db, COLLECTIONS.CATEGORIES, categoryId)
  await deleteDoc(ref)
}
