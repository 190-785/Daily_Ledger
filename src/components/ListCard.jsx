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
      className={`bg-white border border-gray-200 rounded-lg shadow-sm transition-all p-4 sm:p-5 ${
        isShared 
          ? 'cursor-pointer hover:shadow-lg hover:border-blue-500 hover:bg-blue-50 active:bg-blue-100' 
          : 'hover:shadow-md'
      }`}
      onClick={isShared ? () => onClick?.(list) : undefined}
    >
      <div className="mb-3">
        <div className="flex justify-between items-start gap-2 mb-2">
          <div className="flex-1 min-w-0">
            <h3 className="text-base sm:text-lg font-bold mb-1 break-words text-gray-900">
              {list.name}
            </h3>
            {list.description && (
              <p className="text-sm text-gray-600 mb-2 break-words">{list.description}</p>
            )}
          </div>
        </div>
        {!isShared && (
          <div className="flex flex-wrap gap-2">
            {sharedCount > 0 && (
              <>
                <button
                  onClick={() => navigate(`/lists/owner/${list.id}`)}
                  className="text-indigo-600 hover:text-indigo-800 active:text-indigo-900 text-xs sm:text-sm font-medium px-2 sm:px-3 py-1.5 sm:py-1 rounded hover:bg-indigo-50 active:bg-indigo-100 whitespace-nowrap touch-manipulation"
                  title="View owner statistics"
                >
                  📊 <span className="hidden xs:inline">Stats</span>
                </button>
                <button
                  onClick={() => onManageAccess(list)}
                  className="text-purple-600 hover:text-purple-800 active:text-purple-900 text-xs sm:text-sm font-medium px-2 sm:px-3 py-1.5 sm:py-1 rounded hover:bg-purple-50 active:bg-purple-100 whitespace-nowrap touch-manipulation"
                  title="Manage who has access"
                >
                  👥 <span className="hidden xs:inline">Manage</span>
                </button>
              </>
            )}
            <button
              onClick={() => onShare(list)}
              className="text-green-600 hover:text-green-800 active:text-green-900 text-xs sm:text-sm font-medium px-2 sm:px-3 py-1.5 sm:py-1 rounded hover:bg-green-50 active:bg-green-100 whitespace-nowrap touch-manipulation"
              title="Share this list"
            >
              🔗 <span className="hidden xs:inline">Share</span>
            </button>
            <button
              onClick={() => onEdit(list)}
              className="text-blue-600 hover:text-blue-800 active:text-blue-900 text-xs sm:text-sm font-medium px-2 sm:px-3 py-1.5 sm:py-1 rounded hover:bg-blue-50 active:bg-blue-100 whitespace-nowrap touch-manipulation"
            >
              ✏️ <span className="hidden xs:inline">Edit</span>
            </button>
            <button
              onClick={() => onDelete(list)}
              className="text-red-600 hover:text-red-800 active:text-red-900 text-xs sm:text-sm font-medium px-2 sm:px-3 py-1.5 sm:py-1 rounded hover:bg-red-50 active:bg-red-100 whitespace-nowrap touch-manipulation"
            >
              🗑️ <span className="hidden xs:inline">Delete</span>
            </button>
          </div>
        )}
      </div>

      <div className="flex flex-wrap gap-2 sm:gap-3 text-sm">
        <div className="flex items-center gap-1 text-gray-900">
          <span className="font-semibold">👥 {memberCount}</span>
          <span className="text-xs sm:text-sm">member{memberCount !== 1 ? 's' : ''}</span>
        </div>

        {!isShared && sharedCount > 0 && (
          <div className="flex items-center gap-1 text-gray-900">
            <span className="font-semibold">🔗 {sharedCount}</span>
            <span className="text-xs sm:text-sm">share{sharedCount !== 1 ? 's' : ''}</span>
          </div>
        )}

        {!isShared && (
          <div className="flex items-center gap-1 px-2 py-1 bg-gray-100 rounded-full">
            <span className="text-xs font-medium text-gray-900 whitespace-nowrap">{shareTypeLabels[shareType]}</span>
          </div>
        )}

        {isShared && (
          <div className="flex items-center gap-1 px-2 py-1 bg-blue-100 text-blue-900 rounded-full">
            <span className="text-xs font-semibold whitespace-nowrap">📧 Shared by @{list.ownerUsername}</span>
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
