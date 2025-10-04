import React, { useState, useEffect, useCallback } from "react";
import { collection, query, orderBy as firestoreOrderBy, getDocs } from "firebase/firestore";
import { db, getUserLists, getSharedLists, createList, updateList, deleteList, shareListWithUser } from "../firebase";
import ListCard from "../components/ListCard";
import CreateListModal from "../components/CreateListModal";
import ShareListModal from "../components/ShareListModal";

export default function ListsPage({ userId }) {
  const [myLists, setMyLists] = useState([]);
  const [sharedLists, setSharedLists] = useState([]);
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingList, setEditingList] = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [sharingList, setSharingList] = useState(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      // Fetch user's lists
      const lists = await getUserLists(userId);
      setMyLists(lists);

      // Fetch shared lists
      const shared = await getSharedLists(userId);
      setSharedLists(shared);

      // Fetch members
      const membersRef = collection(db, 'users', userId, 'members');
      const membersQuery = query(membersRef, firestoreOrderBy('rank', 'asc'));
      const membersSnapshot = await getDocs(membersQuery);
      const membersData = [];
      membersSnapshot.forEach((doc) => {
        membersData.push({ id: doc.id, ...doc.data() });
      });
      setMembers(membersData);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleCreateList = async (listData) => {
    try {
      await createList(userId, listData);
      await fetchData(); // Refresh lists
    } catch (error) {
      console.error('Error creating list:', error);
      throw error;
    }
  };

  const handleUpdateList = async (listData) => {
    try {
      if (!editingList) return;
      await updateList(userId, editingList.id, listData);
      setEditingList(null);
      await fetchData(); // Refresh lists
    } catch (error) {
      console.error('Error updating list:', error);
      throw error;
    }
  };

  const handleDeleteList = async (list) => {
    setDeleteConfirm(list);
  };

  const confirmDelete = async () => {
    if (!deleteConfirm) return;
    
    try {
      await deleteList(userId, deleteConfirm.id);
      setDeleteConfirm(null);
      await fetchData(); // Refresh lists
    } catch (error) {
      console.error('Error deleting list:', error);
    }
  };

  const handleEdit = (list) => {
    setEditingList(list);
    setShowCreateModal(true);
  };

  const handleCloseModal = () => {
    setShowCreateModal(false);
    setEditingList(null);
  };

  const handleShare = (list) => {
    setSharingList(list);
  };

  const handleShareSubmit = async (shareData) => {
    if (!sharingList) return;
    
    try {
      await shareListWithUser(userId, sharingList.id, {
        recipientUserId: shareData.userId,
        username: shareData.username,
        email: shareData.email,
        shareSettings: shareData.shareSettings
      });
      
      await fetchData(); // Refresh lists
    } catch (error) {
      console.error('Error sharing list:', error);
      throw error;
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="text-xl font-semibold text-gray-600">Loading lists...</div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto">
      <div className="mb-6 flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-800">📋 My Lists</h1>
          <p className="text-gray-600 mt-1">Organize and share your member lists</p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="px-6 py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition-colors shadow-md flex items-center gap-2"
        >
          <span className="text-xl">+</span>
          Create New List
        </button>
      </div>

      {/* My Lists Section */}
      <div className="mb-10">
        <h2 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
          <span>📁</span>
          My Lists ({myLists.length})
        </h2>
        
        {myLists.length === 0 ? (
          <div className="bg-white border-2 border-dashed border-gray-300 rounded-lg p-12 text-center">
            <div className="text-6xl mb-4">📋</div>
            <h3 className="text-xl font-semibold text-gray-700 mb-2">No Lists Yet</h3>
            <p className="text-gray-500 mb-6">
              Create your first list to organize and share member data
            </p>
            <button
              onClick={() => setShowCreateModal(true)}
              className="px-6 py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition-colors"
            >
              Create Your First List
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {myLists.map((list) => (
              <ListCard
                key={list.id}
                list={list}
                onEdit={handleEdit}
                onDelete={handleDeleteList}
                onShare={handleShare}
              />
            ))}
          </div>
        )}
      </div>

      {/* Shared With Me Section */}
      <div>
        <h2 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
          <span>🔗</span>
          Shared With Me ({sharedLists.length})
        </h2>
        
        {sharedLists.length === 0 ? (
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-8 text-center">
            <div className="text-4xl mb-3">📭</div>
            <p className="text-gray-600">No lists have been shared with you yet</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {sharedLists.map((list) => (
              <ListCard
                key={list.id}
                list={list}
                isShared={true}
              />
            ))}
          </div>
        )}
      </div>

      {/* Create/Edit Modal */}
      <CreateListModal
        isOpen={showCreateModal}
        onClose={handleCloseModal}
        onSubmit={editingList ? handleUpdateList : handleCreateList}
        members={members}
        existingList={editingList}
      />

      {/* Share Modal */}
      <ShareListModal
        isOpen={!!sharingList}
        onClose={() => setSharingList(null)}
        list={sharingList}
        onShare={handleShareSubmit}
      />

      {/* Delete Confirmation */}
      {deleteConfirm && (
        <div 
          className="fixed inset-0 flex items-center justify-center z-50 p-4"
          style={{ backgroundColor: 'rgba(0, 0, 0, 0.4)' }}
        >
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6">
            <h3 className="text-xl font-bold text-gray-800 mb-3">Delete List?</h3>
            <p className="text-gray-600 mb-6">
              Are you sure you want to delete "<strong>{deleteConfirm.name}</strong>"? 
              This action cannot be undone.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setDeleteConfirm(null)}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 font-semibold rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={confirmDelete}
                className="flex-1 px-4 py-2 bg-red-600 text-white font-semibold rounded-lg hover:bg-red-700"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
