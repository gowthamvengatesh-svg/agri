import { initializeApp, FirebaseApp } from 'firebase/app';
import { getAuth, Auth } from 'firebase/auth';
import { getFirestore, Firestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID
};

let app: FirebaseApp | undefined;
let authInstance: any;
let dbInstance: any;

export const isFirebaseConfigured = Boolean(
  import.meta.env.VITE_FIREBASE_API_KEY && import.meta.env.VITE_FIREBASE_PROJECT_ID
);

if (isFirebaseConfigured) {
  try {
    app = initializeApp(firebaseConfig);
    authInstance = getAuth(app);
    dbInstance = getFirestore(app);
  } catch (err) {
    console.warn('⚠️ Firebase client initialization failed:', err);
    authInstance = createMockAuth();
    dbInstance = createMockFirestore();
  }
} else {
  console.info('ℹ️ Firebase client config not set. Running in Local Dev / Offline Mode.');
  authInstance = createMockAuth();
  dbInstance = createMockFirestore();
}

function createMockAuth() {
  return {
    currentUser: null,
    onAuthStateChanged: (callback: (user: any) => void) => {
      setTimeout(() => callback(null), 10);
      return () => {};
    }
  };
}

function createMockFirestore() {
  return {};
}

export const auth: Auth = authInstance as Auth;
export const db: Firestore = dbInstance as Firestore;
export default app;
