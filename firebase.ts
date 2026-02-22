
import * as firebaseApp from 'firebase/app';
import * as firebaseAuth from 'firebase/auth';
import * as firestore from 'firebase/firestore';

// IMPORTANT: Replace with your actual Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyCcnwGHLlfRgDcICbvAHyfULvdqkVmgTbc",
  authDomain: "eintk-ebooks.firebaseapp.com",
  projectId: "eintk-ebooks",
  storageBucket: "eintk-ebooks.firebasestorage.app",
  messagingSenderId: "117143266275",
  appId: "1:117143266275:web:62d1baba71501cc202f6d6",
  measurementId: "G-D1Q63BRRRC"
};

const app = firebaseApp.initializeApp(firebaseConfig);

export const auth = firebaseAuth.getAuth(app);
export const db = firestore.getFirestore(app);

// Enable Offline Persistence
firestore.enableIndexedDbPersistence(db).catch((err) => {
    if (err.code == 'failed-precondition') {
        // Multiple tabs open, persistence can only be enabled in one tab at a a time.
        console.warn('Firestore persistence failed: Multiple tabs open');
    } else if (err.code == 'unimplemented') {
        // The current browser does not support all of the features required to enable persistence
        console.warn('Firestore persistence not supported by browser');
    }
});
