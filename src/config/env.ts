export interface FirebaseClientConfig {
  apiKey: string
  authDomain: string
  projectId: string
  storageBucket: string
  messagingSenderId: string
  appId: string
  measurementId?: string
}

const getEnv = (key: string, fallback: string = ''): string => {
  if (typeof import.meta !== 'undefined' && import.meta.env) {
    return (import.meta.env[key] as string) || fallback
  }
  return fallback
}

export const env = {
  isProduction: getEnv('PROD', 'false') === 'true',
  isDevelopment: getEnv('DEV', 'true') === 'true',

  firebase: {
    apiKey: getEnv('VITE_FIREBASE_API_KEY'),
    authDomain: getEnv('VITE_FIREBASE_AUTH_DOMAIN'),
    projectId: getEnv('VITE_FIREBASE_PROJECT_ID') || getEnv('FIREBASE_PROJECT_ID'),
    storageBucket: getEnv('VITE_FIREBASE_STORAGE_BUCKET'),
    messagingSenderId: getEnv('VITE_FIREBASE_MESSAGING_SENDER_ID'),
    appId: getEnv('VITE_FIREBASE_APP_ID'),
    measurementId: getEnv('VITE_FIREBASE_MEASUREMENT_ID'),
  } as FirebaseClientConfig,

  hasFirebaseConfig: Boolean(
    getEnv('VITE_FIREBASE_API_KEY') ||
    getEnv('VITE_FIREBASE_PROJECT_ID') ||
    getEnv('FIREBASE_PROJECT_ID')
  ),

  cloudinary: {
    cloudName: getEnv('VITE_CLOUDINARY_CLOUD_NAME'),
    uploadPreset: getEnv('VITE_CLOUDINARY_UPLOAD_PRESET'),
    folder: getEnv('VITE_CLOUDINARY_FOLDER', ''),
  },

  hasCloudinaryConfig: Boolean(
    getEnv('VITE_CLOUDINARY_CLOUD_NAME') && getEnv('VITE_CLOUDINARY_UPLOAD_PRESET')
  ),

  storage: {
    maxStorageMb: parseInt(getEnv('VITE_MAX_STORAGE_MB', '0'), 10) || 0,
  },
}
