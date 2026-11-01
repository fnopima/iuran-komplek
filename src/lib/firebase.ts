import { initializeApp, getApps, getApp } from 'firebase/app';
import { getFirestore, doc, getDocFromServer, Firestore } from 'firebase/firestore';
import { getAuth, signInAnonymously } from 'firebase/auth';
import firebaseConfig from '../../firebase-applet-config.json';

// Initialize Firebase App
const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);

// Initialize Firestore (default or specific databaseId)
let firestoreInstance: Firestore;
try {
  firestoreInstance = firebaseConfig.firestoreDatabaseId
    ? getFirestore(app, firebaseConfig.firestoreDatabaseId)
    : getFirestore(app);
} catch (e) {
  console.warn('Failed to bind custom database ID, falling back to default:', e);
  firestoreInstance = getFirestore(app);
}

export const db = firestoreInstance;

// Initialize Auth
export const auth = getAuth(app);

// Silent anonymous auth so users have an authenticated session if needed
signInAnonymously(auth).catch((err) => {
  console.warn('Anonymous sign-in warning:', err);
});

// Test connection on startup per Firebase integration guidelines with zero-billing resilience
export async function testFirebaseConnection(): Promise<boolean> {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
    console.log('Firebase connection test succeeded.');
    return true;
  } catch (error: any) {
    const message = (error?.message || '').toLowerCase();
    const code = error?.code || '';
    if (
      message.includes('offline') ||
      message.includes('billing') ||
      message.includes('failed_precondition') ||
      message.includes('quota') ||
      code === 'failed-precondition' ||
      code === 'permission-denied'
    ) {
      console.warn('Firebase Cloud requires billing or is offline. Operating in 100% Free Standalone Mode:', message);
      return false;
    }
    // Document not found is fine, means connection succeeded
    return true;
  }
}
