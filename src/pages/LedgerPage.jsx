import React, { useState, useEffect } from "react";
import { db } from "../firebase";
import {
  collection,
  onSnapshot,
  query,
  where,
  addDoc,
  updateDoc,
  doc,
  Timestamp,
  writeBatch,
} from "firebase/firestore";
import { updateDailyStats, updateMonthlyStats } from "../utils/statsCalculator";
import MemberListControls from "../components/MemberListControls";

export default function LedgerPage({ userId }) {
  const [members, setMembers] = useState([]);
  const [displayedMembers, setDisplayedMembers] = useState([]);
  const [selectedDate, setSelectedDate] = useState(
    new Date().toISOString().split("T")[0]
  );
  const [transactions, setTransactions] = useState({});
  const [customAmounts, setCustomAmounts] = useState({});
  const [editingTransaction, setEditingTransaction] = useState(null);
  const [editAmount, setEditAmount] = useState("");
  const [loading, setLoading] = useState(true);
  const [sortBy, setSortBy] = useState("rank");
  const [searchQuery, setSearchQuery] = useState("");
  const [draggedIndex, setDraggedIndex] = useState(null);
  const [dragOverIndex, setDragOverIndex] = useState(null);

  useEffect(() => {
    const membersQuery = query(collection(db, "users", userId, "members"));
    const unsubscribe = onSnapshot(membersQuery, (snapshot) => {
      const membersData = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      setMembers(membersData);
      setLoading(false);
    });
    return () => unsubscribe();
  }, [userId]);

  // Apply sorting and search
  useEffect(() => {
    let filtered = [...members];

    // Apply search filter
    if (searchQuery.trim()) {
      filtered = filtered.filter((member) =>
        member.name.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // Apply sorting
    switch (sortBy) {
      case "rank":
        filtered.sort((a, b) => (a.rank || 0) - (b.rank || 0));
        break;
      case "alphabetical":
        filtered.sort((a, b) => a.name.localeCompare(b.name));
        break;
      case "addedTime":
        filtered.sort((a, b) => {
          const timeA = a.createdOn?.toMillis() || 0;
          const timeB = b.createdOn?.toMillis() || 0;
          return timeA - timeB;
        });
        break;
      default:
        break;
    }

    setDisplayedMembers(filtered);
  }, [members, sortBy, searchQuery]);

  useEffect(() => {
    if (!selectedDate || !userId) return;
    const transQuery = query(
      collection(db, "users", userId, "transactions"),
      where("date", "==", selectedDate)
    );
    const unsubscribe = onSnapshot(transQuery, (snapshot) => {
      const transData = {};
      snapshot.docs.forEach((doc) => {
        const data = doc.data();
        if (!transData[data.memberId]) transData[data.memberId] = [];
        transData[data.memberId].push({ id: doc.id, ...data });
      });
      setTransactions(transData);
    });
    return () => unsubscribe();
  }, [selectedDate, userId]);

  const handleAddTransaction = async (member, amount) => {
    if (!amount || Number(amount) < 0) {
      return;
    }
    await addDoc(collection(db, "users", userId, "transactions"), {
      memberId: member.id,
      memberName: member.name,
      amount: Number(amount),
      date: selectedDate,
      timestamp: Timestamp.now(),
    });
    setCustomAmounts((prev) => ({ ...prev, [member.id]: "" }));
    
    // Update stats in background
    const monthYear = selectedDate.slice(0, 7);
    updateDailyStats(userId, selectedDate).catch(console.error);
    updateMonthlyStats(userId, monthYear).catch(console.error);
  };

  const handleStartEdit = (transaction) => {
    setEditingTransaction(transaction.id);
    setEditAmount(transaction.amount.toString());
  };

  const handleCancelEdit = () => {
    setEditingTransaction(null);
    setEditAmount("");
  };

  const handleUpdateTransaction = async (transactionId) => {
    if (!editAmount || Number(editAmount) < 0) {
      return;
    }
    await updateDoc(doc(db, "users", userId, "transactions", transactionId), {
      amount: Number(editAmount),
    });
    setEditingTransaction(null);
    setEditAmount("");
    
    // Update stats in background
    const monthYear = selectedDate.slice(0, 7);
    updateDailyStats(userId, selectedDate).catch(console.error);
    updateMonthlyStats(userId, monthYear).catch(console.error);
  };

  // Drag and drop handlers
  const handleDragStart = (e, index) => {
    setDraggedIndex(index);
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDragOver = (e, index) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    if (index !== draggedIndex) {
      setDragOverIndex(index);
    }
  };

  const handleDragLeave = () => {
    setDragOverIndex(null);
  };

  const handleDrop = async (e, dropIndex) => {
    e.preventDefault();
    
    if (draggedIndex === null || draggedIndex === dropIndex) {
      setDraggedIndex(null);
      setDragOverIndex(null);
      return;
    }

    const draggedMember = displayedMembers[draggedIndex];
    const dropMember = displayedMembers[dropIndex];

    // Update all ranks in the affected range
    const batch = writeBatch(db);
    
    if (draggedIndex < dropIndex) {
      // Moving down: shift items up
      for (let i = draggedIndex + 1; i <= dropIndex; i++) {
        const member = displayedMembers[i];
        const memberRef = doc(db, "users", userId, "members", member.id);
        batch.update(memberRef, { rank: member.rank - 1 });
      }
      const draggedRef = doc(db, "users", userId, "members", draggedMember.id);
      batch.update(draggedRef, { rank: dropMember.rank });
    } else {
      // Moving up: shift items down
      for (let i = dropIndex; i < draggedIndex; i++) {
        const member = displayedMembers[i];
        const memberRef = doc(db, "users", userId, "members", member.id);
        batch.update(memberRef, { rank: member.rank + 1 });
      }
      const draggedRef = doc(db, "users", userId, "members", draggedMember.id);
      batch.update(draggedRef, { rank: dropMember.rank });
    }

    await batch.commit();
    
    setDraggedIndex(null);
    setDragOverIndex(null);
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
    setDragOverIndex(null);
  };

  return (
    <div className="bg-white p-6 rounded-xl shadow-md">
      <div className="flex flex-wrap justify-between items-center mb-6 gap-4">
        <h2 className="text-3xl font-bold">Daily Ledger</h2>
        <input
          type="date"
          value={selectedDate}
          onChange={(e) => setSelectedDate(e.target.value)}
          className="bg-gray-50 border-gray-300 rounded-lg p-2"
        />
      </div>

      {/* Search and Sort Controls */}
      <MemberListControls
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        sortBy={sortBy}
        setSortBy={setSortBy}
        showRankOption={true}
        totalMembers={members.length}
        filteredCount={displayedMembers.length}
      />

      {loading ? (
        <p>Loading members...</p>
      ) : (
        <div className="space-y-3">
          {displayedMembers.map((member, index) => {
            const memberTransactions = transactions[member.id] || [];
            const totalPaidToday = memberTransactions.reduce(
              (acc, curr) => acc + curr.amount,
              0
            );
            const hasPaid = memberTransactions.length > 0;
            return (
              <div
                key={member.id}
                className={`p-4 rounded-lg border ${
                  totalPaidToday > 0 
                    ? "bg-green-100 border-green-300" 
                    : "bg-red-100 border-red-300"
                } ${
                  draggedIndex === index 
                    ? "opacity-50 border-blue-500" 
                    : dragOverIndex === index 
                    ? "border-blue-400 border-2 shadow-lg" 
                    : ""
                }`}
                draggable={sortBy === "rank"}
                onDragStart={(e) => handleDragStart(e, index)}
                onDragOver={(e) => handleDragOver(e, index)}
                onDragLeave={handleDragLeave}
                onDrop={(e) => handleDrop(e, index)}
                onDragEnd={handleDragEnd}
              >
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    {sortBy === "rank" && (
                      <div 
                        className="cursor-grab active:cursor-grabbing text-gray-400 hover:text-gray-600"
                        title="Drag to reorder"
                      >
                        <svg 
                          xmlns="http://www.w3.org/2000/svg" 
                          width="20" 
                          height="20" 
                          viewBox="0 0 24 24" 
                          fill="none" 
                          stroke="currentColor" 
                          strokeWidth="2" 
                          strokeLinecap="round" 
                          strokeLinejoin="round"
                        >
                          <line x1="8" y1="6" x2="21" y2="6"></line>
                          <line x1="8" y1="12" x2="21" y2="12"></line>
                          <line x1="8" y1="18" x2="21" y2="18"></line>
                          <line x1="3" y1="6" x2="3.01" y2="6"></line>
                          <line x1="3" y1="12" x2="3.01" y2="12"></line>
                          <line x1="3" y1="18" x2="3.01" y2="18"></line>
                        </svg>
                      </div>
                    )}
                    <span className="font-bold text-lg">{member.name}</span>
                  </div>
                  {totalPaidToday > 0 ? (
                    <div className="font-semibold text-green-800">
                      Paid Today: ₹{totalPaidToday.toLocaleString()}
                    </div>
                  ) : (
                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        onClick={() =>
                          handleAddTransaction(
                            member,
                            member.defaultDailyPayment
                          )
                        }
                        className="bg-blue-500 text-white font-semibold py-2 px-4 rounded-lg hover:bg-blue-600 text-sm"
                      >
                        {" "}
                        + ₹{member.defaultDailyPayment.toLocaleString()}
                      </button>
                      <div className="flex items-center">
                        <input
                          type="number"
                          placeholder="Custom"
                          value={customAmounts[member.id] || ""}
                          onChange={(e) =>
                            setCustomAmounts((prev) => ({
                              ...prev,
                              [member.id]: e.target.value,
                            }))
                          }
                          className="w-24 px-2 py-2 border rounded-l-lg text-sm"
                        />
                        <button
                          onClick={() =>
                            handleAddTransaction(
                              member,
                              customAmounts[member.id]
                            )
                          }
                          className="bg-green-500 text-white font-semibold py-2 px-3 rounded-r-lg hover:bg-green-600 text-sm"
                        >
                          Save
                        </button>
                      </div>
                    </div>
                  )}
                </div>
                {hasPaid && (
                  <div className="mt-3 space-y-2">
                    {memberTransactions.map((t) => (
                      <div
                        key={t.id}
                        className="flex justify-between items-center bg-white p-2 rounded-md"
                      >
                        {editingTransaction === t.id ? (
                          <>
                            <div className="flex items-center gap-2">
                              <span className="text-sm">Amount:</span>
                              <input
                                type="number"
                                value={editAmount}
                                onChange={(e) => setEditAmount(e.target.value)}
                                className="w-24 px-2 py-1 border rounded text-sm"
                                autoFocus
                              />
                            </div>
                            <div className="flex gap-2">
                              <button
                                onClick={() => handleUpdateTransaction(t.id)}
                                className="text-xs bg-green-500 hover:bg-green-600 text-white font-bold py-1 px-3 rounded-md"
                              >
                                Save
                              </button>
                              <button
                                onClick={handleCancelEdit}
                                className="text-xs bg-gray-400 hover:bg-gray-500 text-white font-bold py-1 px-3 rounded-md"
                              >
                                Cancel
                              </button>
                            </div>
                          </>
                        ) : (
                          <>
                            <span>Amount: ₹{t.amount.toLocaleString()}</span>
                            <button
                              onClick={() => handleStartEdit(t)}
                              className="text-xs bg-blue-500 hover:bg-blue-600 text-white font-bold py-1 px-3 rounded-md"
                            >
                              Update
                            </button>
                          </>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
          {displayedMembers.length === 0 && members.length > 0 && (
            <p className="text-center py-4 text-gray-500">
              No members found matching your search.
            </p>
          )}
          {members.length === 0 && (
            <p className="text-center py-4 text-gray-500">
              Add members on the 'Members' page to get started.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
