import React from "react";
import { Link, useNavigate } from "react-router-dom";

export default function ListCard({ list, onEdit, onDelete, onShare, onManageAccess, onClick, isShared = false }) {
  const navigate = useNavigate();
  const memberCount = list.memberIds?.length || 0;
  const sharedCount = Array.isArray(list.sharedWith)
    ? list.sharedWith.length
    : list.sharedWith
      ? Object.keys(list.sharedWith).length
      : 0;
  const shareType = list.shareSettings?.type || 'dynamic';
  
  const shareTypeLabels = {
    dynamic: '🟢 Live Data',
    lastMonth: '🟠 Last Month',
    currentDay: '🔵 Current Day',
    customDay: '📅 Specific Day',
    customMonth: '🗓️ Specific Month'
  };

  return (
    <div 
      className={`bg-white border border-gray-200 rounded-lg shadow-sm hover:shadow-md transition-shadow p-5 ${
        isShared ? 'cursor-pointer hover:border-blue-400' : ''
      }`}
      onClick={isShared ? () => onClick?.(list) : undefined}
    >
      <div className="flex justify-between items-start mb-3">
        <div className="flex-1">
          <h3 className="text-lg font-bold text-gray-800 mb-1">{list.name}</h3>
          {list.description && (
            <p className="text-sm text-gray-600 mb-2">{list.description}</p>
          )}
        </div>
        {!isShared && (
          <div className="flex gap-2">
            {sharedCount > 0 && (
              <>
                <button
                  onClick={() => navigate(`/lists/owner/${list.id}`)}
                  className="text-indigo-600 hover:text-indigo-800 text-sm font-medium px-3 py-1 rounded hover:bg-indigo-50"
                  title="View owner statistics"
                >
                  📊 Stats
                </button>
                <button
                  onClick={() => onManageAccess(list)}
                  className="text-purple-600 hover:text-purple-800 text-sm font-medium px-3 py-1 rounded hover:bg-purple-50"
                  title="Manage who has access"
                >
                  👥 Manage
                </button>
              </>
            )}
            <button
              onClick={() => onShare(list)}
              className="text-green-600 hover:text-green-800 text-sm font-medium px-3 py-1 rounded hover:bg-green-50"
              title="Share this list"
            >
              🔗 Share
            </button>
            <button
              onClick={() => onEdit(list)}
              className="text-blue-600 hover:text-blue-800 text-sm font-medium px-3 py-1 rounded hover:bg-blue-50"
            >
              Edit
            </button>
            <button
              onClick={() => onDelete(list)}
              className="text-red-600 hover:text-red-800 text-sm font-medium px-3 py-1 rounded hover:bg-red-50"
            >
              Delete
            </button>
          </div>
        )}
      </div>

      <div className="flex flex-wrap gap-3 text-sm">
        <div className="flex items-center gap-1 text-gray-700">
          <span className="font-semibold">👥 {memberCount}</span>
          <span>member{memberCount !== 1 ? 's' : ''}</span>
        </div>

        {!isShared && sharedCount > 0 && (
          <div className="flex items-center gap-1 text-gray-700">
            <span className="font-semibold">🔗 {sharedCount}</span>
            <span>share{sharedCount !== 1 ? 's' : ''}</span>
          </div>
        )}

        {!isShared && (
          <div className="flex items-center gap-1 px-2 py-1 bg-gray-100 rounded-full">
            <span className="text-xs">{shareTypeLabels[shareType]}</span>
          </div>
        )}

        {isShared && (
          <div className="flex items-center gap-1 px-2 py-1 bg-blue-100 text-blue-900 rounded-full">
            <span className="text-xs font-medium">📧 Shared by @{list.ownerUsername}</span>
          </div>
        )}
      </div>

      {list.createdAt && (
        <div className="mt-3 pt-3 border-t border-gray-100 text-xs text-gray-500">
          Created: {new Date(list.createdAt.seconds * 1000).toLocaleDateString()}
        </div>
      )}
    </div>
  );
}
