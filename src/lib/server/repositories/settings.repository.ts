import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  onSnapshot,
  serverTimestamp,
  type Unsubscribe,
  type DocumentReference,
} from 'firebase/firestore'
import { db } from '../../firebase'
import { COLLECTIONS, SETTINGS_DOC_ID } from '../../../config/constants'
import type { Settings } from '../../../types/schema'
import { cleanFirestoreData } from '../../../utils/formatters'

export function getSettingsDocRef(): DocumentReference | null {
  if (!db) return null
  return doc(db, COLLECTIONS.SETTINGS, SETTINGS_DOC_ID)
}

export function subscribeSettings(
  onNext: (settings: Settings | null) => void,
  onError?: (err: Error) => void
): Unsubscribe {
  if (!db) {
    onNext(null)
    return () => {}
  }

  const ref = doc(db, COLLECTIONS.SETTINGS, SETTINGS_DOC_ID)

  return onSnapshot(
    ref,
    (snapshot) => {
      if (snapshot.exists()) {
        onNext(snapshot.data() as Settings)
      } else {
        onNext(null)
      }
    },
    (err) => {
      console.error('[SettingsRepository] Subscription error:', err)
      if (onError) onError(err)
    }
  )
}

export async function fetchSettings(): Promise<Settings | null> {
  if (!db) return null
  const ref = doc(db, COLLECTIONS.SETTINGS, SETTINGS_DOC_ID)
  const snap = await getDoc(ref)
  if (!snap.exists()) return null
  return snap.data() as Settings
}

export async function saveSettingsDoc(settings: Settings): Promise<void> {
  if (!db) throw new Error('Firestore is not initialized')
  const ref = doc(db, COLLECTIONS.SETTINGS, SETTINGS_DOC_ID)
  await setDoc(
    ref,
    cleanFirestoreData({
      ...settings,
      updatedAt: serverTimestamp(),
    }),
    { merge: true }
  )
}

export async function updateSettingsDoc(data: Partial<Settings>): Promise<void> {
  if (!db) throw new Error('Firestore is not initialized')
  const ref = doc(db, COLLECTIONS.SETTINGS, SETTINGS_DOC_ID)
  await updateDoc(
    ref,
    cleanFirestoreData({
      ...data,
      updatedAt: serverTimestamp(),
    })
  )
}
