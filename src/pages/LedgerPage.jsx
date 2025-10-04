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
} from "firebase/firestore";
import { updateDailyStats, updateMonthlyStats } from "../utils/statsCalculator";

export default function LedgerPage({ userId }) {
  const [members, setMembers] = useState([]);
  const [selectedDate, setSelectedDate] = useState(
    new Date().toISOString().split("T")[0]
  );
  const [transactions, setTransactions] = useState({});
  const [customAmounts, setCustomAmounts] = useState({});
  const [editingTransaction, setEditingTransaction] = useState(null);
  const [editAmount, setEditAmount] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const membersQuery = query(collection(db, "users", userId, "members"));
    const unsubscribe = onSnapshot(membersQuery, (snapshot) => {
      const sortedMembers = snapshot.docs
        .map((doc) => ({ id: doc.id, ...doc.data() }))
        .sort((a, b) => a.name.localeCompare(b.name));
      setMembers(sortedMembers);
      setLoading(false);
    });
    return () => unsubscribe();
  }, [userId]);

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
      {loading ? (
        <p>Loading members...</p>
      ) : (
        <div className="space-y-3">
          {members.map((member) => {
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
                  hasPaid ? "bg-green-100" : "bg-gray-50"
                }`}
              >
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <span className="font-bold text-lg">{member.name}</span>
                  {hasPaid ? (
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
