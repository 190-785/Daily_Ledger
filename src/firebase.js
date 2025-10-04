import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyBASO27tHvmYgcWbCFHkR7g38IkYPF5VlY",
  authDomain: "daily-collection-ledger.firebaseapp.com",
  projectId: "daily-collection-ledger",
  storageBucket: "daily-collection-ledger.firebasestorage.app",
  messagingSenderId: "721209757989",
  appId: "1:721209757989:web:9927ea2f23df2467cecacc",
  measurementId: "G-F7VJ9C1P1M"
};

// --- Initialize Firebase ---
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

export { auth, db };

