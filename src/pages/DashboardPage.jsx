import React, { useState, useEffect, useCallback } from "react";
import { collection, query, where, getDocs, doc, getDoc } from "firebase/firestore";
import { db } from "../firebase";
import { updateDailyStats, updateMonthlyStats } from "../utils/statsCalculator";

const getMonthYear = (date = new Date()) => date.toISOString().slice(0, 7);
const getTodayDate = () => new Date().toISOString().split("T")[0];

export default function DashboardPage({ userId }) {
  const [selectedMonth, setSelectedMonth] = useState(getMonthYear());
  const [viewTab, setViewTab] = useState("daily"); // 'daily' or 'monthly'
  const [dailyStats, setDailyStats] = useState({
    totalCollected: 0,
    totalMembers: 0,
    paidToday: [],
    pendingToday: [],
    recentTransactions: [],
  });
  const [monthlyStats, setMonthlyStats] = useState({
    totalCollected: 0,
    totalOutstanding: 0,
    membersWithDues: [],
    totalMembers: 0,
    collectionRate: 0,
    totalTarget: 0,
  });
  const [loading, setLoading] = useState(true);

  const calculateDailyStats = useCallback(async () => {
    setLoading(true);
    const todayDate = getTodayDate();

    try {
      // Try to get cached stats first
      const cachedStatsRef = doc(db, "users", userId, "daily_stats", todayDate);
      const cachedStatsSnap = await getDoc(cachedStatsRef);

      if (cachedStatsSnap.exists()) {
        const cached = cachedStatsSnap.data();
        setDailyStats({
          totalCollected: cached.totalCollected,
          totalMembers: cached.totalMembers,
          paidToday: cached.paidMembers.map((m) => ({
            name: m.memberName,
            amount: m.amount,
          })),
          pendingToday: cached.pendingMembers.map((m) => ({
            name: m.memberName,
          })),
          recentTransactions: [],
        });

        // Get recent transactions separately for real-time updates
        const todayQuery = query(
          collection(db, "users", userId, "transactions"),
          where("date", "==", todayDate)
        );
        const todaySnapshot = await getDocs(todayQuery);
        const todayTransactions = todaySnapshot.docs.map((d) => ({
          id: d.id,
          ...d.data(),
        }));

        setDailyStats((prev) => ({
          ...prev,
          recentTransactions: todayTransactions.sort(
            (a, b) => b.timestamp.toDate() - a.timestamp.toDate()
          ),
        }));
      } else {
        // No cache, calculate and save
        const stats = await updateDailyStats(userId, todayDate);
        setDailyStats({
          totalCollected: stats.totalCollected,
          totalMembers: stats.totalMembers,
          paidToday: stats.paidMembers.map((m) => ({
            name: m.memberName,
            amount: m.amount,
          })),
          pendingToday: stats.pendingMembers.map((m) => ({
            name: m.memberName,
          })),
          recentTransactions: [],
        });
      }
    } catch (error) {
      console.error("Error loading daily stats:", error);
    }

    setLoading(false);
  }, [userId]);

  const calculateMonthlyStats = useCallback(async () => {
    setLoading(true);

    try {
      // Try to get cached stats first
      const cachedStatsRef = doc(db, "users", userId, "monthly_stats", selectedMonth);
      const cachedStatsSnap = await getDoc(cachedStatsRef);

      if (cachedStatsSnap.exists()) {
        const cached = cachedStatsSnap.data();
        setMonthlyStats({
          totalCollected: cached.totalCollected,
          totalOutstanding: cached.totalOutstanding,
          totalTarget: cached.totalTarget,
          collectionRate: cached.collectionRate,
          totalMembers: cached.totalMembers,
          membersWithDues: cached.membersWithDues.map((m) => ({
            name: m.memberName,
            due: m.due,
          })),
        });
      } else {
        // No cache, calculate and save
        const stats = await updateMonthlyStats(userId, selectedMonth);
        setMonthlyStats({
          totalCollected: stats.totalCollected,
          totalOutstanding: stats.totalOutstanding,
          totalTarget: stats.totalTarget,
          collectionRate: stats.collectionRate,
          totalMembers: stats.totalMembers,
          membersWithDues: stats.membersWithDues.map((m) => ({
            name: m.memberName,
            due: m.due,
          })),
        });
      }
    } catch (error) {
      console.error("Error loading monthly stats:", error);
    }

    setLoading(false);
  }, [userId, selectedMonth]);

  useEffect(() => {
    if (viewTab === "daily") {
      calculateDailyStats();
    } else {
      calculateMonthlyStats();
    }
  }, [viewTab, calculateDailyStats, calculateMonthlyStats]);

  return (
    <div className="bg-white p-6 rounded-xl shadow-md">
      <div className="flex flex-wrap justify-between items-center mb-6 gap-4">
        <h2 className="text-3xl font-bold">Dashboard</h2>
        {viewTab === "monthly" && (
          <input
            type="month"
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            className="bg-gray-50 border-gray-300 text-gray-900 rounded-lg p-2"
          />
        )}
      </div>

      {/* Tab Navigation */}
      <div className="flex gap-2 mb-6 bg-gray-100 p-1 rounded-lg">
        <button
          onClick={() => setViewTab("daily")}
          className={`flex-1 py-3 px-4 rounded-lg font-semibold transition-all ${
            viewTab === "daily"
              ? "bg-blue-600 text-white shadow-md"
              : "bg-transparent text-gray-600 hover:bg-gray-200"
          }`}
        >
          📅 Today's Stats
        </button>
        <button
          onClick={() => setViewTab("monthly")}
          className={`flex-1 py-3 px-4 rounded-lg font-semibold transition-all ${
            viewTab === "monthly"
              ? "bg-blue-600 text-white shadow-md"
              : "bg-transparent text-gray-600 hover:bg-gray-200"
          }`}
        >
          📊 Monthly Stats
        </button>
      </div>
      {loading ? (
        <p className="text-center py-8">Calculating stats...</p>
      ) : viewTab === "daily" ? (
        <>
          {/* Daily Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div className="bg-blue-100 p-4 rounded-lg text-center">
              <h3 className="text-sm font-semibold text-blue-800">
                Total Members
              </h3>
              <p className="text-3xl font-bold text-blue-900 mt-2">
                {dailyStats.totalMembers}
              </p>
            </div>
            <div className="bg-green-100 p-4 rounded-lg text-center">
              <h3 className="text-sm font-semibold text-green-800">
                Collected Today
              </h3>
              <p className="text-3xl font-bold text-green-900 mt-2">
                ₹{dailyStats.totalCollected.toLocaleString()}
              </p>
            </div>
            <div className="bg-orange-100 p-4 rounded-lg text-center">
              <h3 className="text-sm font-semibold text-orange-800">
                Pending Payments
              </h3>
              <p className="text-3xl font-bold text-orange-900 mt-2">
                {dailyStats.pendingToday.length}
              </p>
            </div>
          </div>

          {/* Today's Payment Status */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            <div className="bg-white p-4 rounded-lg border-2 border-green-200">
              <h3 className="text-lg font-bold text-green-800 mb-3 flex items-center">
                <span className="bg-green-500 w-3 h-3 rounded-full mr-2"></span>
                ✅ Paid Today ({dailyStats.paidToday.length})
              </h3>
              <div className="max-h-96 overflow-y-auto space-y-2">
                {dailyStats.paidToday.length > 0 ? (
                  dailyStats.paidToday.map((member, idx) => (
                    <div
                      key={idx}
                      className="flex justify-between items-center bg-green-50 p-3 rounded"
                    >
                      <span className="font-medium">{member.name}</span>
                      <span className="text-green-700 font-bold">
                        ₹{member.amount.toLocaleString()}
                      </span>
                    </div>
                  ))
                ) : (
                  <p className="text-gray-500 text-sm py-4 text-center">
                    No payments received yet today
                  </p>
                )}
              </div>
            </div>

            <div className="bg-white p-4 rounded-lg border-2 border-orange-200">
              <h3 className="text-lg font-bold text-orange-800 mb-3 flex items-center">
                <span className="bg-orange-500 w-3 h-3 rounded-full mr-2"></span>
                ⏳ Pending Today ({dailyStats.pendingToday.length})
              </h3>
              <div className="max-h-96 overflow-y-auto space-y-2">
                {dailyStats.pendingToday.length > 0 ? (
                  dailyStats.pendingToday.map((member, idx) => (
                    <div
                      key={idx}
                      className="bg-orange-50 p-3 rounded font-medium"
                    >
                      {member.name}
                    </div>
                  ))
                ) : (
                  <p className="text-green-600 text-sm py-4 text-center font-semibold">
                    🎉 Everyone has paid today!
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Today's Transactions */}
          <div>
            <h3 className="text-xl font-bold mb-3">Today's Transactions</h3>
            <div className="bg-white p-4 rounded-lg border">
              <div className="space-y-2 max-h-80 overflow-y-auto">
                {dailyStats.recentTransactions.length > 0 ? (
                  dailyStats.recentTransactions.map((trans, idx) => (
                    <div
                      key={idx}
                      className="flex justify-between items-center bg-gray-50 p-3 rounded hover:bg-gray-100"
                    >
                      <div>
                        <p className="font-semibold">{trans.memberName}</p>
                        <p className="text-xs text-gray-500">
                          {new Date(trans.timestamp.toDate()).toLocaleTimeString()}
                        </p>
                      </div>
                      <p className="font-bold text-blue-600">
                        ₹{trans.amount.toLocaleString()}
                      </p>
                    </div>
                  ))
                ) : (
                  <p className="text-center text-gray-500 py-4">
                    No transactions yet today
                  </p>
                )}
              </div>
            </div>
          </div>
        </>
      ) : (
        <>
          {/* Monthly Stats */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-blue-100 p-4 rounded-lg text-center">
              <h3 className="text-sm font-semibold text-blue-800">
                Total Members
              </h3>
              <p className="text-3xl font-bold text-blue-900 mt-2">
                {monthlyStats.totalMembers}
              </p>
            </div>
            <div className="bg-green-100 p-4 rounded-lg text-center">
              <h3 className="text-sm font-semibold text-green-800">
                Collected This Month
              </h3>
              <p className="text-3xl font-bold text-green-900 mt-2">
                ₹{monthlyStats.totalCollected.toLocaleString()}
              </p>
            </div>
            <div className="bg-red-100 p-4 rounded-lg text-center">
              <h3 className="text-sm font-semibold text-red-800">
                Outstanding
              </h3>
              <p className="text-3xl font-bold text-red-900 mt-2">
                ₹{monthlyStats.totalOutstanding.toLocaleString()}
              </p>
            </div>
            <div className="bg-purple-100 p-4 rounded-lg text-center">
              <h3 className="text-sm font-semibold text-purple-800">
                Collection Rate
              </h3>
              <p className="text-3xl font-bold text-purple-900 mt-2">
                {monthlyStats.collectionRate}%
              </p>
            </div>
          </div>

          {/* Monthly Target vs Collected */}
          <div className="bg-gradient-to-r from-blue-50 to-purple-50 p-6 rounded-lg mb-6 border-2 border-blue-200">
            <div className="flex justify-between items-center">
              <div>
                <h3 className="text-lg font-semibold text-gray-700 mb-2">
                  Monthly Target
                </h3>
                <p className="text-3xl font-bold text-blue-600">
                  ₹{monthlyStats.totalTarget.toLocaleString()}
                </p>
              </div>
              <div className="text-center">
                <h3 className="text-lg font-semibold text-gray-700 mb-2">
                  Progress
                </h3>
                <div className="w-32 h-32 relative">
                  <svg className="transform -rotate-90 w-32 h-32">
                    <circle
                      cx="64"
                      cy="64"
                      r="56"
                      stroke="#e5e7eb"
                      strokeWidth="8"
                      fill="none"
                    />
                    <circle
                      cx="64"
                      cy="64"
                      r="56"
                      stroke="#3b82f6"
                      strokeWidth="8"
                      fill="none"
                      strokeDasharray={`${monthlyStats.collectionRate * 3.51} 351`}
                      className="transition-all duration-1000"
                    />
                  </svg>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-2xl font-bold text-blue-600">
                      {monthlyStats.collectionRate}%
                    </span>
                  </div>
                </div>
              </div>
              <div className="text-right">
                <h3 className="text-lg font-semibold text-gray-700 mb-2">
                  Remaining
                </h3>
                <p className="text-3xl font-bold text-red-600">
                  ₹{(monthlyStats.totalTarget - monthlyStats.totalCollected).toLocaleString()}
                </p>
              </div>
            </div>
          </div>

          {/* Members with Outstanding Dues */}
          <div>
            <h3 className="text-xl font-bold mb-3">
              Members with Outstanding Dues
            </h3>
            <div className="bg-white p-4 rounded-lg border">
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {monthlyStats.membersWithDues.length > 0 ? (
                  monthlyStats.membersWithDues.map((member, index) => (
                    <div
                      key={index}
                      className="flex justify-between items-center bg-red-50 p-3 rounded-lg hover:bg-red-100"
                    >
                      <p className="font-semibold">{member.name}</p>
                      <p className="font-bold text-red-600">
                        ₹{member.due.toLocaleString()}
                      </p>
                    </div>
                  ))
                ) : (
                  <p className="text-center text-green-600 py-4 font-semibold">
                    🎉 All dues are cleared for this month!
                  </p>
                )}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
