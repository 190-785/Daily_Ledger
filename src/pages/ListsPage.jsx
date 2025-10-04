import React, { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { collection, query, orderBy as firestoreOrderBy, getDocs } from "firebase/firestore";
import { db, getUserLists, getSharedLists, createList, updateList, deleteList, shareListWithUser } from "../firebase";
import ListCard from "../components/ListCard";
import CreateListModal from "../components/CreateListModal";
import ShareListModal from "../components/ShareListModal";
import ManageAccessModal from "../components/ManageAccessModal";
import Button from "../components/Button";
import { Heading, Text } from "../components/Typography";
import LoadingSpinner, { EmptyState } from "../components/LoadingSpinner";
import { FadeIn, Stagger, ModalBackdrop, ModalContent } from "../components/Animations";

export default function ListsPage({ userId }) {
  const navigate = useNavigate();
  const [myLists, setMyLists] = useState([]);
  const [sharedLists, setSharedLists] = useState([]);
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingList, setEditingList] = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [sharingList, setSharingList] = useState(null);
  const [managingAccessList, setManagingAccessList] = useState(null);

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

  const handleManageAccess = (list) => {
    setManagingAccessList(list);
  };

  const handleSharedListClick = (list) => {
    navigate(`/lists/shared/${list.id}`);
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <LoadingSpinner size="lg" text="Loading lists..." />
      </div>
    );
  }

  return (
    <FadeIn>
      <div className="max-w-6xl mx-auto">
        <div className="mb-6 flex flex-wrap justify-between items-center gap-4">
          <div>
            <Heading level="h1" className="flex items-center gap-2">
              📋 My Lists
            </Heading>
            <Text variant="muted" className="mt-1">Organize and share your member lists</Text>
          </div>
          <Button
            onClick={() => setShowCreateModal(true)}
            variant="primary"
            size="lg"
          >
            <span className="text-xl mr-2">+</span>
            Create New List
          </Button>
        </div>

        {/* My Lists Section */}
        <div className="mb-10">
          <Heading level="h3" className="mb-4 flex items-center gap-2">
            <span>📁</span>
            My Lists ({myLists.length})
          </Heading>
          
          {myLists.length === 0 ? (
            <EmptyState
              icon={
                <svg className="w-16 h-16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              }
              title="No Lists Yet"
              description="Create your first list to organize and share member data"
              action={() => setShowCreateModal(true)}
              actionLabel="Create Your First List"
            />
        ) : (
          <Stagger staggerDelay={80}>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {myLists.map((list) => (
              <ListCard
                key={list.id}
                list={list}
                onEdit={handleEdit}
                onDelete={handleDeleteList}
                onShare={handleShare}
                onManageAccess={handleManageAccess}
              />
            ))}
            </div>
          </Stagger>
        )}
      </div>

      {/* Shared With Me Section */}
      <div>
        <Heading level="h3" className="mb-4 flex items-center gap-2">
          <span>🔗</span>
          Shared With Me ({sharedLists.length})
        </Heading>
        
        {sharedLists.length === 0 ? (
          <EmptyState
            icon={
              <svg className="w-16 h-16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
              </svg>
            }
            title="No Shared Lists"
            description="No lists have been shared with you yet"
          />
        ) : (
          <Stagger staggerDelay={80}>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {sharedLists.map((list) => (
                <ListCard
                  key={list.id}
                  list={list}
                  isShared={true}
                  onClick={handleSharedListClick}
                />
              ))}
            </div>
          </Stagger>
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

      {/* Manage Access Modal */}
      {managingAccessList && (
        <ManageAccessModal
          list={managingAccessList}
          onClose={() => setManagingAccessList(null)}
          onAccessRevoked={fetchData}
        />
      )}

      {/* Delete Confirmation */}
      <ModalBackdrop show={!!deleteConfirm} onClick={() => setDeleteConfirm(null)}>
        <ModalContent className="max-w-md w-full p-6">
          <Heading level="h3" className="mb-3">Delete List?</Heading>
          <Text variant="muted" className="mb-6">
            Are you sure you want to delete "<strong>{deleteConfirm?.name}</strong>"? 
            This action cannot be undone.
          </Text>
          <div className="flex gap-3">
            <Button
              onClick={() => setDeleteConfirm(null)}
              variant="outline"
              fullWidth
            >
              Cancel
            </Button>
            <Button
              onClick={confirmDelete}
              variant="danger"
              fullWidth
            >
              Delete
            </Button>
          </div>
        </ModalContent>
      </ModalBackdrop>
      </div>
    </FadeIn>
  );
}
