import React, { useState, useEffect } from "react";

export default function MemberSelector({ members, selectedMemberIds, onChange }) {
  const [searchQuery, setSearchQuery] = useState("");
  const [filteredMembers, setFilteredMembers] = useState(members);

  useEffect(() => {
    if (!searchQuery.trim()) {
      setFilteredMembers(members);
    } else {
      const query = searchQuery.toLowerCase();
      const filtered = members.filter(member =>
        member.name.toLowerCase().includes(query)
      );
      setFilteredMembers(filtered);
    }
  }, [searchQuery, members]);

  const handleToggle = (memberId) => {
    if (selectedMemberIds.includes(memberId)) {
      onChange(selectedMemberIds.filter(id => id !== memberId));
    } else {
      onChange([...selectedMemberIds, memberId]);
    }
  };

  const handleSelectAll = () => {
    if (selectedMemberIds.length === filteredMembers.length) {
      onChange([]);
    } else {
      onChange(filteredMembers.map(m => m.id));
    }
  };

  const selectedCount = selectedMemberIds.length;
  const totalCount = members.length;

  return (
    <div className="space-y-3">
      {/* Search */}
      <div>
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search members..."
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      {/* Selection Summary */}
      <div className="flex justify-between items-center py-2 border-b">
        <span className="text-sm font-medium text-gray-700">
          {selectedCount} of {totalCount} selected
        </span>
        <button
          type="button"
          onClick={handleSelectAll}
          className="text-sm text-blue-600 hover:text-blue-800 font-medium"
        >
          {selectedCount === filteredMembers.length ? 'Deselect All' : 'Select All'}
        </button>
      </div>

      {/* Member List */}
      <div className="max-h-64 overflow-y-auto space-y-2">
        {filteredMembers.length === 0 ? (
          <p className="text-center text-gray-500 py-4">No members found</p>
        ) : (
          filteredMembers.map((member) => (
            <label
              key={member.id}
              className="flex items-center gap-3 p-3 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer"
            >
              <input
                type="checkbox"
                checked={selectedMemberIds.includes(member.id)}
                onChange={() => handleToggle(member.id)}
                className="w-5 h-5 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
              />
              <div className="flex-1">
                <div className="font-medium text-gray-800">{member.name}</div>
                {member.phone && (
                  <div className="text-xs text-gray-500">{member.phone}</div>
                )}
              </div>
            </label>
          ))
        )}
      </div>
    </div>
  );
}
