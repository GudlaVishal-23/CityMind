import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || '',
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || '',
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || '',
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || '',
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || '',
  appId: import.meta.env.VITE_FIREBASE_APP_ID || ''
};

// Check if client keys are present in env
const isConfigured = !!import.meta.env.VITE_FIREBASE_API_KEY;

export const firebaseApp = isConfigured ? initializeApp(firebaseConfig) : null;
export const firebaseAuth = isConfigured ? getAuth(firebaseApp!) : null;

// ponytail: fallback bypass indicators for clean mock execution
export const isAuthBypassed = !isConfigured;
