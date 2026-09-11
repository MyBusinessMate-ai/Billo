import { initializeApp, getApps, getApp, type FirebaseApp } from 'firebase/app'
import {
  getFirestore,
  type Firestore,
  initializeFirestore,
  persistentLocalCache,
  persistentMultipleTabManager,
} from 'firebase/firestore'
import { getStorage, type FirebaseStorage } from 'firebase/storage'
import { getAuth, type Auth } from 'firebase/auth'
import { env } from '../config/env'

let app: FirebaseApp | null = null
let db: Firestore | null = null
let storage: FirebaseStorage | null = null
let auth: Auth | null = null

export function isFirebaseConfigured(): boolean {
  return Boolean(env.firebase.apiKey && env.firebase.projectId)
}

function initializeFirebase() {
  if (getApps().length > 0) {
    app = getApp()
  } else if (isFirebaseConfigured()) {
    try {
      app = initializeApp({
        apiKey: env.firebase.apiKey,
        authDomain: env.firebase.authDomain || `${env.firebase.projectId}.firebaseapp.com`,
        projectId: env.firebase.projectId,
        storageBucket: env.firebase.storageBucket || `${env.firebase.projectId}.appspot.com`,
        messagingSenderId: env.firebase.messagingSenderId,
        appId: env.firebase.appId,
        measurementId: env.firebase.measurementId,
      })
    } catch (error) {
      console.warn('[Firebase] Initialization error:', error)
    }
  }

  if (app) {
    try {
      if (typeof window !== 'undefined') {
        db = initializeFirestore(app, {
          localCache: persistentLocalCache({
            tabManager: persistentMultipleTabManager(),
          }),
        })
      } else {
        db = getFirestore(app)
      }
    } catch {
      // Fallback if initializeFirestore was already called
      db = getFirestore(app)
    }

    try {
      storage = getStorage(app)
    } catch (error) {
      console.warn('[Firebase Storage] Init warning:', error)
    }

    try {
      auth = getAuth(app)
    } catch (error) {
      console.warn('[Firebase Auth] Init warning:', error)
    }
  }
}

// Auto-initialize if configured
initializeFirebase()

export { app, db, storage, auth }
