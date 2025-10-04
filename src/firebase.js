import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore, doc, getDoc, setDoc } from 'firebase/firestore';

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

// --- Username Helper Functions ---

/**
 * Validates username format
 * Rules: 3-20 characters, alphanumeric with underscores, lowercase
 */
export const validateUsernameFormat = (username) => {
  const usernameRegex = /^[a-z0-9_]{3,20}$/;
  return usernameRegex.test(username);
};

/**
 * Checks if a username is available (not already taken)
 * @param {string} username - The username to check
 * @returns {Promise<boolean>} - true if available, false if taken
 */
export const checkUsernameAvailability = async (username) => {
  try {
    const usernameDoc = await getDoc(doc(db, 'usernames', username.toLowerCase()));
    return !usernameDoc.exists();
  } catch (error) {
    console.error('Error checking username availability:', error);
    throw error;
  }
};

/**
 * Creates a username mapping in the usernames collection
 * @param {string} username - The username
 * @param {string} userId - The user's Firebase Auth UID
 */
export const createUsernameMapping = async (username, userId) => {
  try {
    await setDoc(doc(db, 'usernames', username.toLowerCase()), {
      userId: userId,
      createdAt: new Date()
    });
  } catch (error) {
    console.error('Error creating username mapping:', error);
    throw error;
  }
};

/**
 * Stores username in user's profile
 * @param {string} userId - The user's Firebase Auth UID
 * @param {string} username - The username
 * @param {string} displayName - The user's display name
 * @param {string} email - The user's email
 */
export const createUserProfile = async (userId, username, displayName, email) => {
  try {
    await setDoc(doc(db, 'users', userId, 'profile', 'info'), {
      username: username.toLowerCase(),
      displayName: displayName,
      email: email,
      createdAt: new Date(),
      updatedAt: new Date()
    });
  } catch (error) {
    console.error('Error creating user profile:', error);
    throw error;
  }
};

/**
 * Gets username by user ID
 * @param {string} userId - The user's Firebase Auth UID
 * @returns {Promise<string|null>} - The username or null if not found
 */
export const getUsernameByUserId = async (userId) => {
  try {
    const profileDoc = await getDoc(doc(db, 'users', userId, 'profile', 'info'));
    if (profileDoc.exists()) {
      return profileDoc.data().username;
    }
    return null;
  } catch (error) {
    console.error('Error getting username:', error);
    return null;
  }
};

/**
 * Gets user profile data
 * @param {string} userId - The user's Firebase Auth UID
 * @returns {Promise<Object|null>} - User profile data or null
 */
export const getUserProfile = async (userId) => {
  try {
    const profileDoc = await getDoc(doc(db, 'users', userId, 'profile', 'info'));
    if (profileDoc.exists()) {
      return profileDoc.data();
    }
    return null;
  } catch (error) {
    console.error('Error getting user profile:', error);
    return null;
  }
};

export { auth, db };

