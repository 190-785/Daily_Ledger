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
  deleteDoc,
  getDocs,
} from "firebase/firestore";
import MemberListControls from "../components/MemberListControls";
import { exportMemberMonthlyToExcel } from "../utils/excelExport";
import { AlertModal, ConfirmModal } from "../components";

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
  const [alertModal, setAlertModal] = useState({ isOpen: false, title: '', message: '', type: 'info' });
  const [confirmModal, setConfirmModal] = useState({ isOpen: false, title: '', message: '', onConfirm: null });

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
    if (searchQuery.trim()) {
      filtered = filtered.filter((member) =>
        member.name.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }
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
        // Skip outstanding_cleared transactions from display
        if (data.type === 'outstanding_cleared') return;
        if (!transData[data.memberId]) transData[data.memberId] = [];
        transData[data.memberId].push({ id: doc.id, ...data });
      });
      setTransactions(transData);
    });
    return () => unsubscribe();
  }, [selectedDate, userId]);

  const handleAddTransaction = async (member, amount) => {
    // Prevent adding 0 or negative amounts
    if (!amount || Number(amount) <= 0) {
      setAlertModal({
        isOpen: true,
        title: 'Invalid Amount',
        message: 'Please enter a valid amount greater than zero.',
        type: 'warning'
      });
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
    // If user updates to 0 or less, treat it as a delete action.
    if (!editAmount || Number(editAmount) <= 0) {
      handleDeleteTransaction(transactionId);
      setEditingTransaction(null);
      setEditAmount("");
      return;
    }
    await updateDoc(doc(db, "users", userId, "transactions", transactionId), {
      amount: Number(editAmount),
    });
    setEditingTransaction(null);
    setEditAmount("");
  };

  // This is now a real delete function.
  const handleDeleteTransaction = (transactionId) => {
    setConfirmModal({
      isOpen: true,
      title: 'Delete Transaction',
      message: 'Are you sure you want to delete this entry?',
      onConfirm: async () => {
        await deleteDoc(doc(db, "users", userId, "transactions", transactionId));
        setConfirmModal({ isOpen: false, title: '', message: '', onConfirm: null });
      }
    });
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
    const batch = writeBatch(db);
    if (draggedIndex < dropIndex) {
      for (let i = draggedIndex + 1; i <= dropIndex; i++) {
        const member = displayedMembers[i];
        const memberRef = doc(db, "users", userId, "members", member.id);
        batch.update(memberRef, { rank: member.rank - 1 });
      }
      const draggedRef = doc(db, "users", userId, "members", draggedMember.id);
      batch.update(draggedRef, { rank: dropMember.rank });
    } else {
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

  const handleExportMemberMonth = async (member) => {
    // Get current month from selected date
    const [year, month] = selectedDate.split('-');
    const monthYear = `${year}-${month}`;
    
    try {
      // Fetch all transactions for this member
      const transQuery = query(
        collection(db, "users", userId, "transactions"),
        where("memberId", "==", member.id)
      );
      
      const snapshot = await getDocs(transQuery);
      const allTransactions = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      
      // Filter for the selected month
      const startDate = `${monthYear}-01`;
      const lastDay = new Date(parseInt(year), parseInt(month), 0).getDate();
      const endDate = `${year}-${month}-${String(lastDay).padStart(2, '0')}`;
      
      const monthTransactions = allTransactions.filter(t => t.date >= startDate && t.date <= endDate);
      
      exportMemberMonthlyToExcel({
        member,
        transactions: monthTransactions,
        allTransactions, // Pass all transactions for cumulative calculation
        monthYear
      });
    } catch (error) {
      console.error('Error exporting member data:', error);
      setAlertModal({
        isOpen: true,
        title: 'Export Failed',
        message: 'Failed to export data. Please try again.',
        type: 'error'
      });
    }
  };

  return (
    <div className="bg-white p-3 md:p-6 rounded-lg md:rounded-xl shadow-md">
      <div className="flex flex-wrap justify-between items-center mb-4 md:mb-6 gap-2 md:gap-4">
        <h2 className="text-xl md:text-3xl font-bold">Daily Ledger</h2>
        <input
          type="date"
          value={selectedDate}
          onChange={(e) => setSelectedDate(e.target.value)}
          className="bg-gray-50 border-gray-300 rounded-lg p-2 text-sm md:text-base"
        />
      </div>

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
        <p className="text-sm md:text-base">Loading members...</p>
      ) : (
        <div className="space-y-2 md:space-y-3">
          {displayedMembers.map((member, index) => {
            // Filter out zero-amount transactions from being displayed
            const memberTransactions = (transactions[member.id] || []).filter(
              (t) => t.amount > 0
            );
            const totalPaidToday = memberTransactions.reduce(
              (acc, curr) => acc + curr.amount,
              0
            );
            const hasPaid = memberTransactions.length > 0;
            return (
              <div
                key={member.id}
                className={`p-3 md:p-4 rounded-lg border ${
                  hasPaid
                    ? "bg-green-100 border-green-300"
                    : "bg-gray-50 border-gray-200"
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
                <div className="flex flex-col gap-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 md:gap-3">
                      {sortBy === "rank" && (
                        <div
                          className="flex items-center justify-center w-8 h-8 -ml-1 rounded-md cursor-grab active:cursor-grabbing text-gray-400 hover:text-gray-600 bg-gray-100/50 sm:bg-transparent"
                          title="Drag to reorder"
                        >
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            width="18"
                            height="18"
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
                      <span className="font-bold text-base md:text-lg">
                        {member.name}
                      </span>
                    </div>
                    <button
                      onClick={() => handleExportMemberMonth(member)}
                      className="text-xs sm:text-sm px-2 sm:px-3 py-1 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors flex items-center gap-1"
                      title="Download monthly Excel report"
                    >
                      <svg className="w-3 h-3 sm:w-4 sm:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                      <span className="hidden sm:inline">Excel</span>
                    </button>
                  </div>
                  <div className="flex flex-wrap items-center gap-1.5 md:gap-2 sm:justify-end">
                    {hasPaid ? (
                    <div className="font-semibold text-green-800 text-sm md:text-base">
                      Paid Today: ₹{totalPaidToday.toLocaleString()}
                    </div>
                  ) : (
                    <div className="flex flex-wrap items-center gap-1.5 md:gap-2">
                      <button
                        onClick={() =>
                          handleAddTransaction(
                            member,
                            member.defaultDailyPayment
                          )
                        }
                        className="bg-blue-500 text-white font-semibold py-1.5 md:py-2 px-3 md:px-4 rounded-lg hover:bg-blue-600 text-xs md:text-sm"
                      >
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
                          className="w-20 md:w-24 px-1.5 md:px-2 py-1.5 md:py-2 border rounded-l-lg text-xs md:text-sm"
                        />
                        <button
                          onClick={() =>
                            handleAddTransaction(
                              member,
                              customAmounts[member.id]
                            )
                          }
                          className="bg-green-500 text-white font-semibold py-1.5 md:py-2 px-2 md:px-3 rounded-r-lg hover:bg-green-600 text-xs md:text-sm"
                        >
                          Save
                        </button>
                      </div>
                    </div>
                  )}
                  </div>
                </div>
                {hasPaid && (
                  <div className="mt-2 md:mt-3 space-y-1.5 md:space-y-2">
                    {memberTransactions.map((t) => (
                      <div
                        key={t.id}
                        className="flex justify-between items-center bg-white p-2 rounded-md text-sm md:text-base"
                      >
                        {editingTransaction === t.id ? (
                          <>
                            <div className="flex items-center gap-1.5 md:gap-2">
                              <span className="text-xs md:text-sm">
                                Amount:
                              </span>
                              <input
                                type="number"
                                value={editAmount}
                                onChange={(e) => setEditAmount(e.target.value)}
                                className="w-20 md:w-24 px-1.5 md:px-2 py-1 border rounded text-xs md:text-sm"
                                autoFocus
                              />
                            </div>
                            <div className="flex gap-1.5 md:gap-2">
                              <button
                                onClick={() => handleUpdateTransaction(t.id)}
                                className="text-xs bg-green-500 hover:bg-green-600 text-white font-bold py-1 px-2 md:px-3 rounded-md"
                              >
                                Save
                              </button>
                              <button
                                onClick={handleCancelEdit}
                                className="text-xs bg-gray-400 hover:bg-gray-500 text-white font-bold py-1 px-2 md:px-3 rounded-md"
                              >
                                Cancel
                              </button>
                            </div>
                          </>
                        ) : (
                          <>
                            <span className="text-xs md:text-sm">
                              Amount: ₹{t.amount.toLocaleString()}
                            </span>
                            <div className="flex items-center space-x-2">
                              <button
                                onClick={() => handleStartEdit(t)}
                                className="text-sm bg-blue-600 hover:bg-blue-700 text-white font-semibold py-1.5 px-4 rounded-lg transition-colors"
                              >
                                Edit
                              </button>
                              <button
                                onClick={() => handleDeleteTransaction(t.id)}
                                className="text-sm bg-red-600 hover:bg-red-700 text-white font-semibold py-1.5 px-4 rounded-lg transition-colors"
                              >
                                Delete
                              </button>
                            </div>
                          </>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

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
