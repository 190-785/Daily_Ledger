import { useState } from 'react';
import { revokeListAccess } from '../firebase';
import { AlertModal, ConfirmModal } from './';

export default function ManageAccessModal({ list, onClose, onAccessRevoked }) {
  const [revoking, setRevoking] = useState(null);
  const [alertModal, setAlertModal] = useState({ isOpen: false, title: '', message: '', type: 'info' });
  const [confirmModal, setConfirmModal] = useState({ isOpen: false, title: '', message: '', onConfirm: null });
  const sharedUsers = Array.isArray(list.sharedWith)
    ? list.sharedWith
    : list.sharedWith
      ? Object.entries(list.sharedWith).map(([userId, data]) => ({
          userId,
          ...data
        }))
      : [];

  const handleRevoke = (sharedUser) => {
    setConfirmModal({
      isOpen: true,
      title: 'Revoke Access',
      message: `Revoke access for @${sharedUser.username}?`,
      onConfirm: async () => {
        setConfirmModal({ isOpen: false, title: '', message: '', onConfirm: null });
        setRevoking(sharedUser.userId);
        try {
          await revokeListAccess(list.id, list.ownerId || list.userId, sharedUser.userId);
          onAccessRevoked?.();
        } catch (error) {
          console.error('Error revoking access:', error);
          setAlertModal({
            isOpen: true,
            title: 'Error',
            message: 'Failed to revoke access. Please try again.',
            type: 'error'
          });
        } finally {
          setRevoking(null);
        }
      }
    });
  };

  const getShareTypeLabel = (type) => {
    switch (type) {
      case 'dynamic':
        return '📅 Dynamic';
      case 'lastMonth':
        return '📆 Last Month';
      case 'currentDay':
        return '📌 Current Day';
      case 'customDay':
        return '📅 Specific Day';
      case 'customMonth':
        return '🗓️ Specific Month';
      default:
        return type;
    }
  };

  const getViewsLabel = (allowedViews) => {
    if (!allowedViews || allowedViews.length === 0) return 'No views';
    if (allowedViews.length === 2) return 'Daily & Monthly';
    return allowedViews[0] === 'daily' ? 'Daily Only' : 'Monthly Only';
  };

  const formatSnapshotDetail = (shareSettings) => {
    if (!shareSettings) return null;
    if (shareSettings.type === 'customDay' && shareSettings.customDay) {
      try {
        return `Snapshot: ${new Date(shareSettings.customDay).toLocaleDateString()}`;
      } catch {
        return `Snapshot Day: ${shareSettings.customDay}`;
      }
    }
    if (shareSettings.type === 'customMonth' && shareSettings.customMonth) {
      try {
        const date = new Date(`${shareSettings.customMonth}-01`);
        return `Snapshot: ${date.toLocaleDateString(undefined, {
          month: 'long',
          year: 'numeric'
        })}`;
      } catch {
        return `Snapshot Month: ${shareSettings.customMonth}`;
      }
    }
    return null;
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ backgroundColor: 'rgba(0, 0, 0, 0.4)' }}
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-2xl bg-white rounded-lg shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">
            Manage Access: {list.name}
          </h2>
          <p className="mt-1 text-sm text-gray-600">
            View and manage who has access to this list
          </p>
        </div>

        {/* Content */}
        <div className="px-6 py-4 max-h-96 overflow-y-auto">
          {sharedUsers.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-gray-500">No users have access to this list yet.</p>
              <p className="text-sm text-gray-400 mt-2">
                Use the Share button to give others access.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {sharedUsers.map((sharedUser, index) => (
                <div
                  key={index}
                  className="flex items-start justify-between p-4 bg-gray-50 rounded-lg border border-gray-200"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-gray-900">
                        @{sharedUser.username}
                      </span>
                      <span className="text-xs text-gray-500">
                        {sharedUser.userId}
                      </span>
                    </div>
                    
                    <div className="mt-2 flex flex-wrap gap-2">
                      {/* Share Type Badge */}
                      <span className="inline-flex items-center px-2 py-1 text-xs font-medium bg-blue-100 text-blue-800 rounded">
                        {getShareTypeLabel(sharedUser.shareSettings?.type)}
                      </span>
                      
                      {/* Views Badge */}
                      <span className="inline-flex items-center px-2 py-1 text-xs font-medium bg-purple-100 text-purple-800 rounded">
                        {getViewsLabel(sharedUser.shareSettings?.allowedViews)}
                      </span>
                      {formatSnapshotDetail(sharedUser.shareSettings) && (
                        <span className="inline-flex items-center px-2 py-1 text-xs font-medium bg-amber-100 text-amber-800 rounded">
                          {formatSnapshotDetail(sharedUser.shareSettings)}
                        </span>
                      )}
                    </div>

                    {/* Shared Date */}
                    {sharedUser.sharedAt && (
                      <p className="mt-2 text-xs text-gray-500">
                        Shared on {new Date(sharedUser.sharedAt.toDate()).toLocaleDateString()}
                      </p>
                    )}
                  </div>

                  {/* Revoke Button */}
                  <button
                    onClick={() => handleRevoke(sharedUser)}
                    disabled={revoking === sharedUser.userId}
                    className={`ml-4 px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                      revoking === sharedUser.userId
                        ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                        : 'bg-red-600 text-white hover:bg-red-700'
                    }`}
                  >
                    {revoking === sharedUser.userId ? 'Revoking...' : 'Revoke Access'}
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-200 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 transition-colors"
          >
            Close
          </button>
        </div>
      </div>

      {/* Alert Modal */}
      <AlertModal
        isOpen={alertModal.isOpen}
        onClose={() => setAlertModal({ isOpen: false, title: '', message: '', type: 'info' })}
        title={alertModal.title}
        message={alertModal.message}
        type={alertModal.type}
      />

      {/* Confirm Modal */}
      <ConfirmModal
        isOpen={confirmModal.isOpen}
        onClose={() => setConfirmModal({ isOpen: false, title: '', message: '', onConfirm: null })}
        onConfirm={confirmModal.onConfirm}
        title={confirmModal.title}
        message={confirmModal.message}
      />
    </div>
  );
}
