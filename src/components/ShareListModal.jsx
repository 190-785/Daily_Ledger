import React, { useEffect, useState } from "react";
import { searchUsersByUsername } from "../firebase";

export default function ShareListModal({ isOpen, onClose, list, onShare, onShareSuccess }) {
  const shareSettings = list?.shareSettings;
  const allowedViewsKey = Array.isArray(shareSettings?.allowedViews)
    ? shareSettings.allowedViews.join('|')
    : 'default';

  const [shareType, setShareType] = useState(shareSettings?.type || 'dynamic');
  const [allowedViews, setAllowedViews] = useState(shareSettings?.allowedViews || ['daily', 'monthly']);
  const [customDay, setCustomDay] = useState(shareSettings?.customDay || '');
  const [customMonth, setCustomMonth] = useState(shareSettings?.customMonth || '');
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [message, setMessage] = useState({ type: "", text: "" });

  useEffect(() => {
    if (isOpen) {
      setShareType(shareSettings?.type || 'dynamic');
      setAllowedViews(shareSettings?.allowedViews || ['daily', 'monthly']);
      setSearchQuery("");
      setSearchResults([]);
      setSelectedUser(null);
      setMessage({ type: "", text: "" });
      setCustomDay(shareSettings?.customDay || '');
      setCustomMonth(shareSettings?.customMonth || '');
    }
  }, [isOpen, list?.id, shareSettings?.type, shareSettings?.allowedViews, shareSettings?.customDay, shareSettings?.customMonth, allowedViewsKey]);

  const shareTypeOptions = [
    { value: 'dynamic', label: '🟢 Live Data', description: 'Real-time updates, always current' },
    { value: 'lastMonth', label: '🟠 Last Month', description: 'Previous month data only' },
    { value: 'currentDay', label: '🔵 Current Day', description: 'Today\'s data snapshot' },
    { value: 'customDay', label: '📅 Specific Day', description: 'Pick any day to share as a snapshot' },
    { value: 'customMonth', label: '🗓️ Specific Month', description: 'Pick any month to share as a snapshot' }
  ];

  useEffect(() => {
    if (shareType === 'customDay') {
      setAllowedViews((prev) =>
        prev.length === 1 && prev.includes('daily') ? prev : ['daily']
      );
    } else if (shareType === 'customMonth') {
      setAllowedViews((prev) =>
        prev.length === 1 && prev.includes('monthly') ? prev : ['monthly']
      );
    }
  }, [shareType, setAllowedViews]);

  const isCustomDay = shareType === 'customDay';
  const isCustomMonth = shareType === 'customMonth';

  const handleToggleView = (view) => {
    if (allowedViews.includes(view)) {
      setAllowedViews(allowedViews.filter(v => v !== view));
    } else {
      setAllowedViews([...allowedViews, view]);
    }
  };

  const handleSearch = async () => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      return;
    }

    setSearching(true);
    setMessage({ type: "", text: "" });
    try {
      const results = await searchUsersByUsername(searchQuery.trim());
      setSearchResults(results);
      
      if (results.length === 0) {
        setMessage({ type: 'error', text: 'No user found with that username' });
      }
    } catch (error) {
      console.error('Search error:', error);
      setMessage({ type: 'error', text: 'Error searching for users' });
    } finally {
      setSearching(false);
    }
  };

  const handleSelectUser = (user) => {
    setSelectedUser(user);
  };

  const handleShareSubmit = async () => {
    if (!selectedUser) {
      setMessage({ type: 'error', text: 'Please select a user to share with' });
      return;
    }

    if (isCustomDay && !customDay) {
      setMessage({ type: 'error', text: 'Please pick a day to share.' });
      return;
    }

    if (isCustomMonth && !customMonth) {
      setMessage({ type: 'error', text: 'Please pick a month to share.' });
      return;
    }

    if (allowedViews.length === 0) {
      setMessage({ type: 'error', text: 'Please select at least one view permission' });
      return;
    }

    try {
      const shareSettingsPayload = {
        type: shareType,
        allowedViews: allowedViews,
        ...(isCustomDay ? { customDay } : {}),
        ...(isCustomMonth ? { customMonth } : {}),
      };

      await onShare({
        userId: selectedUser.id,
        username: selectedUser.username,
        email: selectedUser.email,
        shareSettings: shareSettingsPayload
      });
      
      setMessage({ type: 'success', text: `List shared with @${selectedUser.username}!` });
      onShareSuccess?.({
        listId: list?.id,
        listName: list?.name,
        user: selectedUser,
        shareSettings: shareSettingsPayload
      });
      setTimeout(() => {
        onClose();
      }, 1500);
    } catch (error) {
      setMessage({ type: 'error', text: error.message });
    }
  };

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 flex items-center justify-center z-50 p-4"
      style={{ backgroundColor: 'rgba(0, 0, 0, 0.4)' }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex justify-between items-center">
          <h2 className="text-2xl font-bold text-gray-800">
            🔗 Share List: {list?.name}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 text-2xl leading-none"
          >
            ×
          </button>
        </div>

        <div className="p-6 space-y-6">
          {message.text && (
            <div
              className={`p-4 rounded-lg ${
                message.type === "success"
                  ? "bg-green-50 border border-green-200 text-green-800"
                  : "bg-red-50 border border-red-200 text-red-700"
              }`}
            >
              {message.text}
            </div>
          )}

          {/* Share Type Selection */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-3">
              Share Type
            </label>
            <div className="space-y-2">
              {shareTypeOptions.map((option) => (
                <label
                  key={option.value}
                  className={`flex items-start gap-3 p-4 border-2 rounded-lg cursor-pointer transition-all ${
                    shareType === option.value
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <input
                    type="radio"
                    name="shareType"
                    value={option.value}
                    checked={shareType === option.value}
                    onChange={(e) => setShareType(e.target.value)}
                    className="mt-1 w-5 h-5 text-blue-600"
                  />
                  <div className="flex-1">
                    <div className="font-semibold text-gray-800">{option.label}</div>
                    <div className="text-sm text-gray-600">{option.description}</div>
                  </div>
                </label>
              ))}
            </div>
            {isCustomDay && (
              <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <label className="block text-sm font-medium text-blue-900 mb-2">
                  Choose the exact day to share
                </label>
                <input
                  type="date"
                  value={customDay}
                  onChange={(e) => setCustomDay(e.target.value)}
                  className="w-full px-3 py-2 border border-blue-200 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-400"
                />
                <p className="text-xs text-blue-700 mt-2">
                  Recipients will only see data captured for this selected day.
                </p>
              </div>
            )}
            {isCustomMonth && (
              <div className="mt-4 p-4 bg-purple-50 border border-purple-200 rounded-lg">
                <label className="block text-sm font-medium text-purple-900 mb-2">
                  Choose the specific month to share
                </label>
                <input
                  type="month"
                  value={customMonth}
                  onChange={(e) => setCustomMonth(e.target.value)}
                  className="w-full px-3 py-2 border border-purple-200 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-400"
                />
                <p className="text-xs text-purple-700 mt-2">
                  Recipients will only see data summarised for this selected month.
                </p>
              </div>
            )}
          </div>

          {/* View Permissions */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-3">
              Allow Access To
            </label>
            <div className="space-y-2">
              <label className="flex items-center gap-3 p-3 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50">
                <input
                  type="checkbox"
                  checked={allowedViews.includes('daily')}
                  onChange={() => handleToggleView('daily')}
                  className="w-5 h-5 text-blue-600 rounded"
                  disabled={isCustomDay || isCustomMonth}
                />
                <div>
                  <div className="font-medium text-gray-800">📝 Daily View</div>
                  <div className="text-xs text-gray-600">View daily transactions and payments</div>
                </div>
              </label>
              <label className="flex items-center gap-3 p-3 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50">
                <input
                  type="checkbox"
                  checked={allowedViews.includes('monthly')}
                  onChange={() => handleToggleView('monthly')}
                  className="w-5 h-5 text-blue-600 rounded"
                  disabled={isCustomDay || isCustomMonth}
                />
                <div>
                  <div className="font-medium text-gray-800">📅 Monthly View</div>
                  <div className="text-xs text-gray-600">View monthly summaries and stats</div>
                </div>
              </label>
            </div>
            {(isCustomDay || isCustomMonth) && (
              <p className="text-xs text-gray-500 mt-2">
                Snapshot shares lock the available view so recipients only see the selected period.
              </p>
            )}
          </div>

          {/* User Search */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-3">
              Share With User
            </label>
            <div className="flex gap-2 mb-3">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                placeholder="Search by username or email..."
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <button
                onClick={handleSearch}
                disabled={searching}
                className="px-6 py-2 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 disabled:bg-gray-400"
              >
                {searching ? 'Searching...' : 'Search'}
              </button>
            </div>

            {/* Search Results */}
            {searchResults.length > 0 && (
              <div className="border border-gray-200 rounded-lg divide-y">
                {searchResults.map((user) => (
                  <label
                    key={user.id}
                    className={`flex items-center gap-3 p-4 cursor-pointer hover:bg-gray-50 ${
                      selectedUser?.id === user.id ? 'bg-blue-50' : ''
                    }`}
                  >
                    <input
                      type="radio"
                      name="selectedUser"
                      checked={selectedUser?.id === user.id}
                      onChange={() => handleSelectUser(user)}
                      className="w-5 h-5 text-blue-600"
                    />
                    <div className="flex-1">
                      <div className="font-medium text-gray-800">{user.displayName}</div>
                      <div className="text-sm text-gray-600">@{user.username} • {user.email}</div>
                    </div>
                  </label>
                ))}
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 pt-4 border-t">
            <button
              onClick={onClose}
              className="flex-1 px-6 py-3 border border-gray-300 text-gray-700 font-semibold rounded-lg hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              onClick={handleShareSubmit}
              disabled={!selectedUser}
              className="flex-1 px-6 py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 disabled:bg-gray-400"
            >
              Share List
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
