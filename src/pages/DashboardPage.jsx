import React, { useState, useEffect, useCallback } from "react";
import { collection, query, where, getDocs, onSnapshot } from "firebase/firestore";
import { db } from "/src/firebase.js";
import { updateDailyStats, updateMonthlyStats } from "/src/utils/statsCalculator.js";
import Card, { CardHeader, CardTitle, CardContent } from "/src/components/Card.jsx";
import { Heading, Text } from "/src/components/Typography.jsx";
import Button from "/src/components/Button.jsx";
import LoadingSpinner, { EmptyState } from "/src/components/LoadingSpinner.jsx";
import { FadeIn, Stagger } from "/src/components/Animations.jsx";
import { exportMonthlyToExcel } from "/src/utils/excelExport.js";

const getMonthYear = (date = new Date()) => date.toISOString().slice(0, 7);
const getTodayDate = () => new Date().toISOString().split("T")[0];

export default function DashboardPage({ userId }) {
  const [selectedMonth, setSelectedMonth] = useState(getMonthYear());
  const [selectedDate, setSelectedDate] = useState(getTodayDate());
  const [viewTab, setViewTab] = useState("daily"); // 'daily' or 'monthly'
  const [dailyStats, setDailyStats] = useState({
    totalCollected: 0,
    totalMembers: 0,
    paidMembers: [],
    pendingMembers: [],
    recentTransactions: [],
  });
  const [monthlyStats, setMonthlyStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [members, setMembers] = useState([]);
  const [allTransactions, setAllTransactions] = useState([]);

  // Load members and transactions
  useEffect(() => {
    const membersQuery = query(collection(db, "users", userId, "members"));
    const unsubscribeMembers = onSnapshot(membersQuery, (snapshot) => {
      const sortedMembers = snapshot.docs
        .map((doc) => ({ id: doc.id, ...doc.data() }))
        .sort((a, b) => (a.rank || 0) - (b.rank || 0));
      setMembers(sortedMembers);
    });

    const transQuery = query(collection(db, "users", userId, "transactions"));
    const unsubscribeTrans = onSnapshot(transQuery, (snapshot) => {
      setAllTransactions(
        snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }))
      );
    });

    return () => {
      unsubscribeMembers();
      unsubscribeTrans();
    };
  }, [userId]);

  // This function will now force a recalculation every time, ignoring the cache.
  const calculateDailyStats = useCallback(async () => {
    setLoading(true);
    try {
      const stats = await updateDailyStats(userId, selectedDate);
      
      const dateQuery = query(
        collection(db, "users", userId, "transactions"),
        where("date", "==", selectedDate)
      );
      const dateSnapshot = await getDocs(dateQuery);
      const recentTransactions = dateSnapshot.docs.map((d) => ({
        id: d.id,
        ...d.data(),
      })).sort((a, b) => b.timestamp.toDate() - a.timestamp.toDate());

      setDailyStats({ ...stats, recentTransactions });
    } catch (error) {
      console.error("Error calculating daily stats:", error);
    }
    setLoading(false);
  }, [userId, selectedDate]);
  
  // This function will also force a recalculation every time.
  const calculateMonthlyStats = useCallback(async () => {
    setLoading(true);
    try {
        const stats = await updateMonthlyStats(userId, selectedMonth);
        setMonthlyStats(stats);
    } catch (error) {
        console.error("Error calculating monthly stats:", error);
        setMonthlyStats(null); // Set to null on error
    }
    setLoading(false);
  }, [userId, selectedMonth]);


  useEffect(() => {
    if (viewTab === "daily") {
      calculateDailyStats();
    } else {
      calculateMonthlyStats();
    }
  }, [viewTab, selectedDate, selectedMonth, calculateDailyStats, calculateMonthlyStats]);

  const handleExportToExcel = () => {
    if (viewTab !== "monthly") {
      alert('Please switch to Monthly View to export data');
      return;
    }

    if (!selectedMonth) {
      alert('Please select a month to export');
      return;
    }

    // Get all transactions for the selected month (across all members)
    const startDate = new Date(`${selectedMonth}-01T00:00:00Z`);
    const monthTransactions = allTransactions.filter((t) => {
      const tDate = t.timestamp.toDate();
      return (
        tDate.getFullYear() === startDate.getFullYear() &&
        tDate.getMonth() === startDate.getMonth()
      );
    });

    // Export to Excel
    exportMonthlyToExcel({
      members,
      transactions: monthTransactions,
      monthYear: selectedMonth,
      listName: 'Daily Ledger'
    });
  };

  return (
    <FadeIn>
      <Card variant="elevated" className="p-6">
        <CardHeader>
          <div className="flex flex-wrap justify-between items-center gap-4">
            <Heading level="h2">Dashboard</Heading>
            <div className="flex gap-2">
              {viewTab === "daily" && (
                <input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="bg-gray-50 border border-gray-300 text-gray-900 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              )}
              {viewTab === "monthly" && (
                <>
                  <input
                    type="month"
                    value={selectedMonth}
                    onChange={(e) => setSelectedMonth(e.target.value)}
                    className="bg-gray-50 border border-gray-300 text-gray-900 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <button
                    onClick={handleExportToExcel}
                    className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center gap-2"
                    title="Export monthly data to Excel"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    <span className="hidden sm:inline">Export to Excel</span>
                  </button>
                </>
              )}
            </div>
          </div>
        </CardHeader>

        <CardContent>
          {/* Tab Navigation */}
          <div className="flex gap-2 mb-6 bg-gray-100 p-1 rounded-lg">
            <Button
              onClick={() => setViewTab("daily")}
              variant={viewTab === "daily" ? "primary" : "ghost"}
              fullWidth
            >
              📅 Daily View
            </Button>
            <Button
              onClick={() => setViewTab("monthly")}
              variant={viewTab === "monthly" ? "primary" : "ghost"}
              fullWidth
            >
              📊 Monthly View
            </Button>
          </div>

          {loading ? (
            <div className="flex justify-center py-12">
              <LoadingSpinner size="lg" text="Calculating stats..." />
            </div>
          ) : viewTab === "daily" ? (
            <>
              {/* Daily Stats */}
              <Stagger staggerDelay={100}>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-6">
                  <Card className="bg-gradient-to-br from-blue-900/40 to-blue-950/40 border border-blue-700/30 backdrop-blur-sm shadow-xl hover:shadow-2xl transition-all duration-300">
                    <CardContent className="text-center p-6">
                      <div className="flex items-center justify-center mb-2">
                        <div className="w-10 h-10 rounded-full bg-blue-500/20 flex items-center justify-center">
                          <span className="text-2xl">👥</span>
                        </div>
                      </div>
                      <Text size="sm" weight="semibold" className="text-blue-300/80 uppercase tracking-wider text-xs">
                        Total Members
                      </Text>
                      <Heading level="h2" className="text-blue-100 mt-3 text-4xl font-bold">
                        {dailyStats.totalMembers}
                      </Heading>
                    </CardContent>
                  </Card>
                  <Card className="bg-gradient-to-br from-emerald-900/40 to-emerald-950/40 border border-emerald-700/30 backdrop-blur-sm shadow-xl hover:shadow-2xl transition-all duration-300">
                    <CardContent className="text-center p-6">
                      <div className="flex items-center justify-center mb-2">
                        <div className="w-10 h-10 rounded-full bg-emerald-500/20 flex items-center justify-center">
                          <span className="text-2xl">💰</span>
                        </div>
                      </div>
                      <Text size="sm" weight="semibold" className="text-emerald-300/80 uppercase tracking-wider text-xs">
                        Collected Today
                      </Text>
                      <Heading level="h2" className="text-emerald-100 mt-3 text-4xl font-bold">
                        ₹{dailyStats.totalCollected.toLocaleString()}
                      </Heading>
                    </CardContent>
                  </Card>
                  <Card className="bg-gradient-to-br from-amber-900/40 to-amber-950/40 border border-amber-700/30 backdrop-blur-sm shadow-xl hover:shadow-2xl transition-all duration-300">
                    <CardContent className="text-center p-6">
                      <div className="flex items-center justify-center mb-2">
                        <div className="w-10 h-10 rounded-full bg-amber-500/20 flex items-center justify-center">
                          <span className="text-2xl">⏳</span>
                        </div>
                      </div>
                      <Text size="sm" weight="semibold" className="text-amber-300/80 uppercase tracking-wider text-xs">
                        Didn't Pay
                      </Text>
                      <Heading level="h2" className="text-amber-100 mt-3 text-4xl font-bold">
                        {dailyStats.pendingMembers.length}
                      </Heading>
                    </CardContent>
                  </Card>
                </div>
              </Stagger>

              {/* Payment Status for Selected Date */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-6">
                <div className="bg-gradient-to-br from-slate-800/40 to-slate-900/40 border border-emerald-700/30 p-5 rounded-xl shadow-lg">
                  <h3 className="text-lg font-bold text-emerald-300 mb-4 flex items-center">
                    <span className="bg-emerald-500/30 w-2 h-8 rounded-full mr-3"></span>
                    <span className="text-xl">✅</span>
                    <span className="ml-2">Paid ({dailyStats.paidMembers.length})</span>
                  </h3>
                  <div className="max-h-96 overflow-y-auto space-y-2 custom-scrollbar">
                    {dailyStats.paidMembers.length > 0 ? (
                      dailyStats.paidMembers.map((member, idx) => (
                        <div
                          key={idx}
                          className="flex justify-between items-center bg-emerald-900/20 border border-emerald-700/20 p-3 rounded-lg hover:bg-emerald-900/30 transition-colors"
                        >
                          <span className="font-medium text-slate-200">{member.memberName}</span>
                          <span className="text-emerald-400 font-bold">
                            ₹{member.amount.toLocaleString()}
                          </span>
                        </div>
                      ))
                    ) : (
                      <p className="text-slate-400 text-sm py-8 text-center">
                        No payments received on this date
                      </p>
                    )}
                  </div>
                </div>

                <div className="bg-gradient-to-br from-slate-800/40 to-slate-900/40 border border-amber-700/30 p-5 rounded-xl shadow-lg">
                  <h3 className="text-lg font-bold text-amber-300 mb-4 flex items-center">
                    <span className="bg-amber-500/30 w-2 h-8 rounded-full mr-3"></span>
                    <span className="text-xl">⏳</span>
                    <span className="ml-2">Didn't Pay ({dailyStats.pendingMembers.length})</span>
                  </h3>
                  <div className="max-h-96 overflow-y-auto space-y-2 custom-scrollbar">
                    {dailyStats.pendingMembers.length > 0 ? (
                      dailyStats.pendingMembers.map((member, idx) => (
                        <div
                          key={idx}
                          className="bg-amber-900/20 border border-amber-700/20 p-3 rounded-lg font-medium text-slate-200 hover:bg-amber-900/30 transition-colors"
                        >
                          {member.memberName}
                        </div>
                      ))
                    ) : (
                      <p className="text-emerald-400 text-sm py-8 text-center font-semibold">
                        🎉 Everyone with an outstanding balance has paid today!
                      </p>
                    )}
                  </div>
                </div>
              </div>

              {/* Transactions for Selected Date */}
              <div>
                <h3 className="text-xl font-bold mb-4 text-slate-200 flex items-center">
                  <span className="text-2xl mr-2">📜</span>
                  Transactions on {selectedDate}
                </h3>
                <div className="bg-gradient-to-br from-slate-800/40 to-slate-900/40 border border-slate-700/50 p-5 rounded-xl shadow-lg">
                  <div className="space-y-2 max-h-80 overflow-y-auto custom-scrollbar">
                    {dailyStats.recentTransactions.length > 0 ? (
                      dailyStats.recentTransactions.map((trans, idx) => (
                        <div
                          key={idx}
                          className="flex justify-between items-center bg-slate-700/30 border border-slate-600/30 p-4 rounded-lg hover:bg-slate-700/50 transition-all hover:scale-[1.01]"
                        >
                          <div>
                            <p className="font-semibold text-slate-200">{trans.memberName}</p>
                            <p className="text-xs text-slate-400 mt-1">
                              🕐 {new Date(trans.timestamp.toDate()).toLocaleTimeString()}
                            </p>
                          </div>
                          <p className="font-bold text-blue-400 text-lg">
                            ₹{trans.amount.toLocaleString()}
                          </p>
                        </div>
                      ))
                    ) : (
                      <p className="text-center text-slate-400 py-8">
                        No transactions on this date
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </>
          ) : monthlyStats ? (
            <>
              {/* Monthly Stats */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                <div className="bg-gradient-to-br from-slate-800/50 to-slate-900/50 border border-slate-700/50 p-5 rounded-xl text-center shadow-lg hover:shadow-xl transition-all">
                  <div className="flex items-center justify-center mb-3">
                    <div className="w-10 h-10 rounded-full bg-blue-500/20 flex items-center justify-center">
                      <span className="text-xl">👥</span>
                    </div>
                  </div>
                  <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                    Total Members
                  </h3>
                  <p className="text-3xl font-bold text-white mt-2">
                    {monthlyStats.totalMembers}
                  </p>
                </div>
                <div className="bg-gradient-to-br from-emerald-900/40 to-emerald-950/40 border border-emerald-700/30 p-5 rounded-xl text-center shadow-lg hover:shadow-xl transition-all">
                  <div className="flex items-center justify-center mb-3">
                    <div className="w-10 h-10 rounded-full bg-emerald-500/20 flex items-center justify-center">
                      <span className="text-xl">💰</span>
                    </div>
                  </div>
                  <h3 className="text-xs font-semibold text-emerald-300/80 uppercase tracking-wider">
                    Collected This Month
                  </h3>
                  <p className="text-3xl font-bold text-emerald-100 mt-2">
                    ₹{monthlyStats.totalCollected.toLocaleString()}
                  </p>
                </div>
                <div className="bg-gradient-to-br from-rose-900/40 to-rose-950/40 border border-rose-700/30 p-5 rounded-xl text-center shadow-lg hover:shadow-xl transition-all">
                  <div className="flex items-center justify-center mb-3">
                    <div className="w-10 h-10 rounded-full bg-rose-500/20 flex items-center justify-center">
                      <span className="text-xl">⚠️</span>
                    </div>
                  </div>
                  <h3 className="text-xs font-semibold text-rose-300/80 uppercase tracking-wider">
                    Outstanding
                  </h3>
                  <p className="text-3xl font-bold text-rose-100 mt-2">
                    ₹{monthlyStats.totalOutstanding.toLocaleString()}
                  </p>
                </div>
                <div className="bg-gradient-to-br from-violet-900/40 to-violet-950/40 border border-violet-700/30 p-5 rounded-xl text-center shadow-lg hover:shadow-xl transition-all">
                  <div className="flex items-center justify-center mb-3">
                    <div className="w-10 h-10 rounded-full bg-violet-500/20 flex items-center justify-center">
                      <span className="text-xl">📊</span>
                    </div>
                  </div>
                  <h3 className="text-xs font-semibold text-violet-300/80 uppercase tracking-wider">
                    Collection Rate
                  </h3>
                  <p className="text-3xl font-bold text-violet-100 mt-2">
                    {monthlyStats.collectionRate}%
                  </p>
                </div>
              </div>

              {/* Members with Outstanding Dues */}
              <div>
                <h3 className="text-xl font-bold mb-4 text-slate-200 flex items-center">
                  <span className="bg-rose-500/30 w-2 h-8 rounded-full mr-3"></span>
                  <span className="text-2xl mr-2">⚠️</span>
                  Members with Outstanding Dues
                  <span className="ml-3 text-sm text-slate-400 font-normal">
                    (Including previous months)
                  </span>
                </h3>
                <div className="bg-gradient-to-br from-slate-800/40 to-slate-900/40 border border-rose-700/30 p-5 rounded-xl shadow-lg">
                  <div className="space-y-3 max-h-96 overflow-y-auto custom-scrollbar">
                    {monthlyStats.membersWithDues.length > 0 ? (
                      monthlyStats.membersWithDues.map((member, index) => (
                        <div
                          key={index}
                          className="bg-rose-900/20 border border-rose-700/30 p-5 rounded-lg hover:bg-rose-900/30 transition-all hover:scale-[1.01] backdrop-blur-sm"
                        >
                          <div className="flex justify-between items-center">
                            <p className="font-bold text-lg text-slate-200">{member.memberName}</p>
                            <div className="text-right ml-4">
                              <p className="text-xs text-rose-300/80 mb-1 uppercase tracking-wide">Total Outstanding</p>
                              <p className="font-bold text-2xl text-rose-400">
                                ₹{member.due.toLocaleString()}
                              </p>
                            </div>
                          </div>
                        </div>
                      ))
                    ) : (
                      <p className="text-center text-emerald-400 py-8 font-semibold text-lg">
                        🎉 All dues are cleared (including previous months)!
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </>
          ) : (
              <EmptyState title="No Data" description="Could not load monthly statistics."/>
          )}
        </CardContent>
      </Card>
    </FadeIn>
  );
}

