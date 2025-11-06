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
  where,
  serverTimestamp
} from 'firebase/firestore';

// Load Firebase config from Vite environment variables.
// See `.env.example` for required keys. Using import.meta.env preserves
// values injected at build time by Vite and prevents committing secrets.
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID
};

// Quick runtime check to help developers catch missing env vars early.
const _requiredKeys = [
  'VITE_FIREBASE_API_KEY',
  'VITE_FIREBASE_AUTH_DOMAIN',
  'VITE_FIREBASE_PROJECT_ID',
  'VITE_FIREBASE_STORAGE_BUCKET',
  'VITE_FIREBASE_MESSAGING_SENDER_ID',
  'VITE_FIREBASE_APP_ID'
];

const missing = _requiredKeys.filter((k) => !import.meta.env[k]);
if (missing.length) {
  // In CI or production builds env vars should be set; log an error to help local devs.
  // Don't throw here to avoid breaking non-Firebase flows, but provide a clear message.
  console.error(
    `Missing required Firebase env vars: ${missing.join(', ')}. ` +
      'Create a local `.env` from `.env.example` and add the values, or set them in your hosting provider.'
  );
}

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

// --- Member Archive Functions ---

/**
 * Calculates the current outstanding balance for a member
 * @param {string} userId - The user's Firebase Auth UID
 * @param {string} memberId - The member ID
 * @returns {Promise<number>} - The outstanding balance
 */
export const calculateMemberOutstanding = async (userId, memberId) => {
  try {
    // Get member data
    const memberRef = doc(db, 'users', userId, 'members', memberId);
    const memberDoc = await getDoc(memberRef);
    
    if (!memberDoc.exists()) {
      throw new Error('Member not found');
    }
    
    const member = { id: memberDoc.id, ...memberDoc.data() };
    
    // Get all transactions for this member
    const transactionsRef = collection(db, 'users', userId, 'transactions');
    const transactionsQuery = query(transactionsRef, where('memberId', '==', memberId));
    const transactionsSnap = await getDocs(transactionsQuery);
    
    const allTransactions = transactionsSnap.docs.map(doc => doc.data());
    
    // Calculate total paid (exclude outstanding_cleared transactions)
    const totalPaid = allTransactions
      .filter(t => t.type !== 'outstanding_cleared')
      .reduce((sum, t) => sum + t.amount, 0);
    
    // Get member's start date (creation or earliest transaction)
    const memberCreatedDate = member.createdOn?.toDate() || new Date(0);
    const currentDate = new Date();
    
    // Find earliest transaction date
    let earliestTransactionDate = null;
    if (allTransactions.length > 0) {
      const sortedTransactions = allTransactions
        .map(t => new Date(t.date + "T00:00:00Z"))
        .sort((a, b) => a - b);
      earliestTransactionDate = sortedTransactions[0];
    }
    
    // Use the earlier of member creation or first transaction
    let startDate;
    if (earliestTransactionDate && memberCreatedDate) {
      startDate = earliestTransactionDate < memberCreatedDate 
        ? earliestTransactionDate 
        : memberCreatedDate;
    } else if (earliestTransactionDate) {
      startDate = earliestTransactionDate;
    } else if (memberCreatedDate) {
      startDate = memberCreatedDate;
    } else {
      startDate = new Date(0);
    }
    
    // Calculate expected amount (monthlyTarget * number of months)
    let totalExpected = 0;
    let checkDate = new Date(startDate.getFullYear(), startDate.getMonth(), 1);
    const endDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
    
    // Find most recent cleared month
    let lastClearedMonth = null;
    allTransactions.forEach(t => {
      if (t.type === 'outstanding_cleared') {
        const monthKey = t.date.slice(0, 7);
        if (!lastClearedMonth || monthKey > lastClearedMonth) {
          lastClearedMonth = monthKey;
        }
      }
    });
    
    // If there was a cleared month, start from the month after
    if (lastClearedMonth) {
      const clearedDate = new Date(lastClearedMonth + '-01T00:00:00Z');
      clearedDate.setUTCMonth(clearedDate.getUTCMonth() + 1);
      if (clearedDate > checkDate) {
        checkDate = clearedDate;
      }
    }
    
    // Count months and calculate expected
    while (checkDate <= endDate) {
      totalExpected += member.monthlyTarget || 0;
      checkDate.setMonth(checkDate.getMonth() + 1);
    }
    
    const outstanding = totalExpected - totalPaid;
    return Math.max(0, outstanding); // Return 0 if negative (overpaid)
  } catch (error) {
    console.error('Error calculating outstanding balance:', error);
    throw error;
  }
};

/**
 * Archives a member (removes from daily collection from archive date forward)
 * @param {string} userId - The user's Firebase Auth UID
 * @param {string} memberId - The member ID to archive
 * @param {string} reason - Optional reason for archiving
 * @returns {Promise<{success: boolean, error?: string}>}
 */
export const archiveMember = async (userId, memberId, reason = '') => {
  try {
    // First, check if member has outstanding balance
    const outstanding = await calculateMemberOutstanding(userId, memberId);
    
    if (outstanding > 0) {
      return {
        success: false,
        error: `Cannot archive member with outstanding balance of ₹${outstanding.toLocaleString()}. Please clear the outstanding balance first.`
      };
    }
    
    // Archive the member
    const memberRef = doc(db, 'users', userId, 'members', memberId);
    await updateDoc(memberRef, {
      archived: true,
      archivedOn: serverTimestamp(),
      archivedReason: reason || '',
      rank: null // Reset rank when archiving
    });
    
    return { success: true };
  } catch (error) {
    console.error('Error archiving member:', error);
    return {
      success: false,
      error: error.message || 'Failed to archive member'
    };
  }
};

/**
 * Unarchives a member (restores them to active status)
 * @param {string} userId - The user's Firebase Auth UID
 * @param {string} memberId - The member ID to unarchive
 * @returns {Promise<{success: boolean, error?: string}>}
 */
export const unarchiveMember = async (userId, memberId) => {
  try {
    // Get current max rank to place at end
    const membersRef = collection(db, 'users', userId, 'members');
    const membersQuery = query(membersRef);
    const membersSnap = await getDocs(membersQuery);
    
    const maxRank = membersSnap.docs.reduce((max, doc) => {
      const rank = doc.data().rank || 0;
      return Math.max(max, rank);
    }, 0);
    
    // Unarchive the member and place at end of list
    const memberRef = doc(db, 'users', userId, 'members', memberId);
    await updateDoc(memberRef, {
      archived: false,
      archivedOn: null,
      archivedReason: '',
      rank: maxRank + 1 // Place at end of active members
    });
    
    return { success: true };
  } catch (error) {
    console.error('Error unarchiving member:', error);
    return {
      success: false,
      error: error.message || 'Failed to unarchive member'
    };
  }
};

export { auth, db };

