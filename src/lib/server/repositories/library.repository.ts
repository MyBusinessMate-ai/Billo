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
import type { LibraryAsset } from '../../../types/schema'
import { cleanFirestoreData } from '../../../utils/formatters'

export function getAssetDocRef(assetId: string): DocumentReference | null {
  if (!db) return null
  return doc(db, COLLECTIONS.ASSETS, assetId)
}

export function subscribeAssets(
  onNext: (assets: LibraryAsset[]) => void,
  onError?: (err: Error) => void
): Unsubscribe {
  if (!db) {
    onNext([])
    return () => {}
  }

  const q = query(collection(db, COLLECTIONS.ASSETS), orderBy('createdAt', 'desc'))

  return onSnapshot(
    q,
    (snapshot) => {
      const results: LibraryAsset[] = []
      snapshot.forEach((docSnap) => {
        results.push(docSnap.data() as LibraryAsset)
      })
      onNext(results)
    },
    (err) => {
      console.error('[LibraryRepository] Subscription error:', err)
      if (onError) onError(err)
    }
  )
}

export async function fetchAssets(): Promise<LibraryAsset[]> {
  if (!db) return []
  const q = query(collection(db, COLLECTIONS.ASSETS), orderBy('createdAt', 'desc'))
  const snap = await getDocs(q)
  return snap.docs.map((d) => d.data() as LibraryAsset)
}

export async function fetchAssetById(assetId: string): Promise<LibraryAsset | null> {
  if (!db) return null
  const ref = doc(db, COLLECTIONS.ASSETS, assetId)
  const snap = await getDoc(ref)
  if (!snap.exists()) return null
  return snap.data() as LibraryAsset
}

export async function createAssetDoc(asset: LibraryAsset): Promise<void> {
  if (!db) throw new Error('Firestore is not initialized')
  const ref = doc(db, COLLECTIONS.ASSETS, asset.assetId)
  await setDoc(ref, cleanFirestoreData(asset))
}

export async function updateAssetDoc(assetId: string, data: Partial<LibraryAsset>): Promise<void> {
  if (!db) throw new Error('Firestore is not initialized')
  const ref = doc(db, COLLECTIONS.ASSETS, assetId)
  await updateDoc(
    ref,
    cleanFirestoreData({
      ...data,
      updatedAt: serverTimestamp(),
    })
  )
}

export async function deleteAssetDoc(assetId: string): Promise<void> {
  if (!db) throw new Error('Firestore is not initialized')
  const ref = doc(db, COLLECTIONS.ASSETS, assetId)
  await deleteDoc(ref)
}
