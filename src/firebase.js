import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { 
  getFirestore, 
  doc, 
  getDoc, 
  setDoc, 
  collection, 
  query, 
  getDocs, 
  addDoc, 
  updateDoc, 
  deleteDoc,
  orderBy,
  serverTimestamp
} from 'firebase/firestore';

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

const normalizeSharedWith = (sharedWithMap) => {
  if (!sharedWithMap) return [];
  return Object.entries(sharedWithMap).map(([userId, data]) => ({
    userId,
    ...data
  }));
};

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
      createdAt: serverTimestamp()
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
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
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

// --- List Management Functions ---

/**
 * Creates a new list
 * @param {string} userId - The user's Firebase Auth UID
 * @param {Object} listData - List data (name, description, memberIds)
 * @returns {Promise<string>} - The created list ID
 */
export const createList = async (userId, listData) => {
  try {
    const listsRef = collection(db, 'users', userId, 'lists');
    const docRef = await addDoc(listsRef, {
      name: listData.name,
      description: listData.description || '',
      memberIds: listData.memberIds || [],
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      shareSettings: {
        type: 'dynamic', // 'dynamic' | 'lastMonth' | 'currentDay'
        allowedViews: ['daily', 'monthly']
      },
      sharedWith: {} // Map of userId -> { username, email, accessLevel, sharedAt }
    });
    return docRef.id;
  } catch (error) {
    console.error('Error creating list:', error);
    throw error;
  }
};

/**
 * Gets all lists for a user
 * @param {string} userId - The user's Firebase Auth UID
 * @returns {Promise<Array>} - Array of list objects with IDs
 */
export const getUserLists = async (userId) => {
  try {
    const listsRef = collection(db, 'users', userId, 'lists');
    const q = query(listsRef, orderBy('createdAt', 'desc'));
    const querySnapshot = await getDocs(q);
    
    const lists = [];
    querySnapshot.forEach((docSnapshot) => {
      const data = docSnapshot.data();
      lists.push({
        id: docSnapshot.id,
        ...data,
        ownerId: userId,
        sharedWith: normalizeSharedWith(data.sharedWith)
      });
    });
    
    return lists;
  } catch (error) {
    console.error('Error getting user lists:', error);
    throw error;
  }
};

/**
 * Gets a single list by ID
 * @param {string} userId - The user's Firebase Auth UID
 * @param {string} listId - The list ID
 * @returns {Promise<Object|null>} - List data or null
 */
export const getListById = async (userId, listId) => {
  try {
    const listRef = doc(db, 'users', userId, 'lists', listId);
    const listDoc = await getDoc(listRef);
    if (listDoc.exists()) {
      const data = listDoc.data();
      return {
        id: listDoc.id,
        ...data,
        ownerId: userId,
        sharedWith: normalizeSharedWith(data.sharedWith),
        sharedWithMap: data.sharedWith || {}
      };
    }
    return null;
  } catch (error) {
    console.error('Error getting list:', error);
    return null;
  }
};

/**
 * Updates an existing list
 * @param {string} userId - The user's Firebase Auth UID
 * @param {string} listId - The list ID
 * @param {Object} updates - Fields to update
 */
export const updateList = async (userId, listId, updates) => {
  try {
    const listRef = doc(db, 'users', userId, 'lists', listId);
    await updateDoc(listRef, {
      ...updates,
      updatedAt: new Date()
    });
  } catch (error) {
    console.error('Error updating list:', error);
    throw error;
  }
};

/**
 * Deletes a list
 * @param {string} userId - The user's Firebase Auth UID
 * @param {string} listId - The list ID
 */
export const deleteList = async (userId, listId) => {
  try {
    const listRef = doc(db, 'users', userId, 'lists', listId);
    await deleteDoc(listRef);
  } catch (error) {
    console.error('Error deleting list:', error);
    throw error;
  }
};

/**
 * Gets lists shared with the current user
 * @param {string} userId - The user's Firebase Auth UID
 * @returns {Promise<Array>} - Array of shared list objects
 */
export const getSharedLists = async (userId) => {
  try {
    const sharedListsRef = collection(db, 'users', userId, 'sharedLists');
    const q = query(sharedListsRef, orderBy('sharedAt', 'desc'));
    const querySnapshot = await getDocs(q);
    
    const sharedLists = [];
    querySnapshot.forEach((docSnapshot) => {
      const data = docSnapshot.data();
      sharedLists.push({
        id: docSnapshot.id,
        ...data,
        name: data.name || data.listName || data.list?.name || 'Shared List',
        ownerUsername: data.ownerUsername || data.ownerUserId || 'unknown'
      });
    });
    
    return sharedLists;
  } catch (error) {
    console.error('Error getting shared lists:', error);
    throw error;
  }
};

// --- Sharing Functions ---

/**
 * Searches for users by username
 * @param {string} searchQuery - Username to search for
 * @returns {Promise<Array>} - Array of matching users
 */
export const searchUsersByUsername = async (searchQuery) => {
  try {
    // Get username document
    const usernameDoc = await getDoc(doc(db, 'usernames', searchQuery.toLowerCase()));
    
    if (!usernameDoc.exists()) {
      return [];
    }
    
    const userId = usernameDoc.data().userId;
    const profileDoc = await getDoc(doc(db, 'users', userId, 'profile', 'info'));
    
    if (profileDoc.exists()) {
      return [{
        id: userId,
        ...profileDoc.data()
      }];
    }
    
    return [];
  } catch (error) {
    console.error('Error searching users:', error);
    return [];
  }
};

/**
 * Searches for users by email (exact match)
 * Note: Firestore doesn't support email search directly
 * In production, you'd use Cloud Functions or Algolia for this
 * @returns {Promise<Array>} - Array of matching users
 */
export const searchUsersByEmail = async () => {
  // For now, we'll return empty and rely on username search
  return [];
};

/**
 * Shares a list with another user
 * @param {string} ownerUserId - The list owner's user ID
 * @param {string} listId - The list ID
 * @param {Object} shareData - Share data (recipientUserId, username, email, shareSettings)
 */
export const shareListWithUser = async (ownerUserId, listId, shareData) => {
  try {
    const { recipientUserId, username, email, shareSettings } = shareData;
    const listRef = doc(db, 'users', ownerUserId, 'lists', listId);
    const listSnapshot = await getDoc(listRef);
    if (!listSnapshot.exists()) {
      throw new Error('List not found');
    }
    const listData = listSnapshot.data();
    const currentSharedWith = listData.sharedWith || {};

    await updateDoc(listRef, {
      sharedWith: {
        ...currentSharedWith,
        [recipientUserId]: {
          username: username,
          email: email,
          accessLevel: 'view',
          shareSettings,
          sharedAt: serverTimestamp()
        }
      },
      shareSettings: shareSettings,
      updatedAt: serverTimestamp()
    });

    const ownerProfile = await getUserProfile(ownerUserId);
    // Create entry in recipient's sharedLists collection
    const sharedListRef = doc(db, 'users', recipientUserId, 'sharedLists', listId);
    await setDoc(sharedListRef, {
      originalListId: listId,
      ownerUserId: ownerUserId,
      ownerUsername: ownerProfile?.username || 'unknown',
      name: listData.name,
      listName: listData.name,
      description: listData.description || '',
      memberIds: listData.memberIds || [],
      shareSettings: shareSettings,
      sharedAt: serverTimestamp()
    });
  } catch (error) {
    console.error('Error sharing list:', error);
    throw error;
  }
};

/**
 * Revokes access to a shared list
 * @param {string} ownerUserId - The list owner's user ID
 * @param {string} listId - The list ID
 * @param {string} recipientUserId - The user to revoke access from
 */
export const revokeListAccess = async (ownerUserId, listId, recipientUserId) => {
  try {
    const listRef = doc(db, 'users', ownerUserId, 'lists', listId);
    const listSnapshot = await getDoc(listRef);
    if (!listSnapshot.exists()) {
      throw new Error('List not found');
    }

    // Remove user from sharedWith map (object)
    const updatedSharedWith = { ...(listSnapshot.data().sharedWith || {}) };
    delete updatedSharedWith[recipientUserId];

    await updateDoc(listRef, {
      sharedWith: updatedSharedWith,
      updatedAt: serverTimestamp()
    });
    
    // Remove from recipient's sharedLists
    const sharedListRef = doc(db, 'users', recipientUserId, 'sharedLists', listId);
    await deleteDoc(sharedListRef);
  } catch (error) {
    console.error('Error revoking access:', error);
    throw error;
  }
};

export { auth, db };

