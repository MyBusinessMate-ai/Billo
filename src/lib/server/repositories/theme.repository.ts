import {
  doc,
  getDoc,
  setDoc,
  onSnapshot,
  serverTimestamp,
  type Unsubscribe,
  type DocumentReference,
} from 'firebase/firestore'
import { db } from '../../firebase'
import { COLLECTIONS, THEME_DOC_ID } from '../../../config/constants'
import type { ThemeDoc } from '../../../types/schema'
import { cleanFirestoreData } from '../../../utils/formatters'

export function getThemeDocRef(): DocumentReference | null {
  if (!db) return null
  return doc(db, COLLECTIONS.THEMES, THEME_DOC_ID)
}

export function subscribeThemeDoc(
  onNext: (theme: ThemeDoc | null) => void,
  onError?: (err: Error) => void
): Unsubscribe {
  if (!db) {
    onNext(null)
    return () => {}
  }

  const ref = doc(db, COLLECTIONS.THEMES, THEME_DOC_ID)

  return onSnapshot(
    ref,
    (snapshot) => {
      if (snapshot.exists()) {
        onNext(snapshot.data() as ThemeDoc)
      } else {
        onNext(null)
      }
    },
    (err) => {
      console.error('[ThemeRepository] Subscription error:', err)
      if (onError) onError(err)
    }
  )
}

export async function fetchThemeDoc(): Promise<ThemeDoc | null> {
  if (!db) return null
  const ref = doc(db, COLLECTIONS.THEMES, THEME_DOC_ID)
  const snap = await getDoc(ref)
  if (!snap.exists()) return null
  return snap.data() as ThemeDoc
}

export async function saveThemeDoc(theme: Partial<ThemeDoc>): Promise<void> {
  if (!db) return
  const ref = doc(db, COLLECTIONS.THEMES, THEME_DOC_ID)
  await setDoc(
    ref,
    cleanFirestoreData({
      ...theme,
      updatedAt: serverTimestamp(),
    }),
    { merge: true }
  )
}
