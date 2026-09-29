// VikasDrishti AI — Firebase Integration Service
// Supports Cloud Firestore for real-time grievance sync & Firebase Hosting

import { initializeApp, getApps } from 'firebase/app';
import { getFirestore, collection, addDoc, onSnapshot, query, orderBy, limit } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || '',
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || '',
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || '',
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || '',
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || '',
  appId: import.meta.env.VITE_FIREBASE_APP_ID || '',
};

export const isFirebaseConfigured = () => {
  return Boolean(firebaseConfig.apiKey && firebaseConfig.projectId);
};

let app = null;
let db = null;

if (isFirebaseConfigured() && getApps().length === 0) {
  try {
    app = initializeApp(firebaseConfig);
    db = getFirestore(app);
    console.log('✅ Firebase initialized successfully');
  } catch (err) {
    console.warn('Firebase initialization skipped or failed:', err);
  }
}

/**
 * Save grievance to Firestore if configured
 */
export async function saveGrievanceToFirebase(grievance) {
  if (!db) return null;
  try {
    const docRef = await addDoc(collection(db, 'grievances'), {
      ...grievance,
      createdAt: new Date().toISOString(),
    });
    return docRef.id;
  } catch (error) {
    console.error('Firestore save error:', error);
    return null;
  }
}

/**
 * Subscribe to real-time grievances from Firestore
 */
export function subscribeToFirebaseGrievances(callback) {
  if (!db) return () => {};
  try {
    const q = query(collection(db, 'grievances'), orderBy('timestamp', 'desc'), limit(50));
    return onSnapshot(q, (snapshot) => {
      const items = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      callback(items);
    }, (err) => {
      console.warn('Firestore subscription error:', err);
    });
  } catch (err) {
    console.warn('Firestore subscription setup failed:', err);
    return () => {};
  }
}
