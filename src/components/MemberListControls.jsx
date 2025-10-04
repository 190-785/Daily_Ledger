import React from "react";

export default function MemberListControls({
  searchQuery,
  setSearchQuery,
  sortBy,
  setSortBy,
  showRankOption = false,
  totalMembers,
  filteredCount,
}) {
  return (
    <div className="mb-6 p-4 bg-gray-50 rounded-lg border">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Search */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            🔍 Search Members
          </label>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by name..."
            className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* Sort By */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            📊 Sort By
          </label>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {showRankOption && (
              <option value="rank">Custom Order (Drag & Drop)</option>
            )}
            <option value="addedTime">Date Added (Oldest First)</option>
            <option value="alphabetical">Alphabetical (A-Z)</option>
          </select>
        </div>
      </div>
      {searchQuery && (
        <p className="text-sm text-gray-600 mt-2">
          Showing {filteredCount} of {totalMembers} members
        </p>
      )}
    </div>
  );
}
