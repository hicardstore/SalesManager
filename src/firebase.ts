import { initializeApp } from 'firebase/app';
import { getAuth, signInWithPopup, signInWithRedirect, GoogleAuthProvider, onAuthStateChanged, User, signInWithEmailAndPassword, createUserWithEmailAndPassword, sendPasswordResetEmail, browserPopupRedirectResolver, getRedirectResult } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import firebaseConfig from '../firebase-applet-config.json';

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
// Use the specific firestoreDatabaseId if it exists, otherwise it defaults to (default)
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId || "(default)");

const provider = new GoogleAuthProvider();

export const initAuth = (
  onAuthSuccess?: (user: User) => void,
  onAuthFailure?: () => void
) => {
  return onAuthStateChanged(auth, async (user: User | null) => {
    if (user) {
      if (onAuthSuccess) onAuthSuccess(user);
    } else {
      if (onAuthFailure) onAuthFailure();
    }
  });
};

export const googleSignIn = async (): Promise<{ user: User } | void> => {
  try {
    const result = await signInWithPopup(auth, provider);
    return { user: result.user };
  } catch (error: any) {
    console.error('Sign in error:', error);
    if (error?.code === 'auth/popup-blocked' || error?.code === 'auth/popup-closed-by-user') {
      // Fallback to redirect for mobile devices or browsers that block popups
      await signInWithRedirect(auth, provider);
      return; // Will redirect the page
    }
    throw error;
  }
};


