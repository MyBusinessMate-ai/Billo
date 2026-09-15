import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  deleteField,
  type DocumentReference,
} from 'firebase/firestore'
import { db } from '../../firebase'

export interface AdminAuthDoc {
  email: string
  passwordHash: string
  salt: string
  updatedAt: string
  resetOtp?: string
  resetToken?: string
  resetExpiresAt?: number
  pendingEmail?: string
  emailChangeOtp?: string
  emailChangeExpiresAt?: number
  pendingPasswordHash?: string
  pendingPasswordSalt?: string
}

const AUTH_COLLECTION = 'auth_config'
const ADMIN_DOC_ID = 'admin'

export function getAdminAuthDocRef(): DocumentReference | null {
  if (!db) return null
  return doc(db, AUTH_COLLECTION, ADMIN_DOC_ID)
}

export async function fetchAdminAuthDoc(): Promise<AdminAuthDoc | null> {
  const ref = getAdminAuthDocRef()
  if (!ref) return null

  try {
    const snap = await getDoc(ref)
    if (snap.exists()) {
      return snap.data() as AdminAuthDoc
    }
    return null
  } catch (err) {
    console.error('[AuthRepository] Error fetching admin auth doc:', err)
    return null
  }
}

export async function saveAdminAuthDoc(data: AdminAuthDoc): Promise<void> {
  const ref = getAdminAuthDocRef()
  if (!ref) return

  try {
    await setDoc(ref, data, { merge: true })
  } catch (err) {
    console.warn('[AuthRepository] Firestore write notice (check security rules):', err)
  }
}

export async function updateAdminAuthDoc(
  partial: Partial<Record<keyof AdminAuthDoc, any>>
): Promise<void> {
  const ref = getAdminAuthDocRef()
  if (!ref) return

  const payload: Record<string, any> = {}
  for (const [key, value] of Object.entries(partial)) {
    if (value === undefined) {
      payload[key] = deleteField()
    } else {
      payload[key] = value
    }
  }

  try {
    await updateDoc(ref, payload)
  } catch (err) {
    console.error('[AuthRepository] Error updating admin auth doc:', err)
    throw err
  }
}
