import React, { useState, useEffect, useMemo } from "react";
import {
  collection,
  query,
  where,
  getDocs,
  onSnapshot,
  addDoc,
  Timestamp,
  doc,
} from "firebase/firestore";
import { db } from "/src/firebase.js";
import {
  updateDailyStats,
  updateMonthlyStats,
} from "/src/utils/statsCalculator.js";
import Card, {
  CardHeader,
  CardTitle,
  CardContent,
} from "/src/components/Card.jsx";
import { Heading, Text } from "/src/components/Typography.jsx";
import Button from "/src/components/Button.jsx";
import LoadingSpinner, { EmptyState } from "/src/components/LoadingSpinner.jsx";
import { FadeIn, Stagger } from "/src/components/Animations.jsx";
import { AlertModal, ConfirmModal } from "/src/components/Modal.jsx";
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
  const initialDailyStats = useMemo(() => ({
    totalCollected: 0,
    totalMembers: 0,
    paidMembers: [],
    pendingMembers: [],
    recentTransactions: [],
  }), []);
  
  // Modal states
  const [alertModal, setAlertModal] = useState({ isOpen: false, title: '', message: '', type: 'info' });
  const [confirmModal, setConfirmModal] = useState({ isOpen: false, title: '', message: '', onConfirm: null });

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

  // This useEffect handles REACTIVE updates to the dashboard
  // It listens for changes to the cached stats docs
  useEffect(() => {
    setLoading(true);
    if (viewTab === "daily") {
      const dailyStatsRef = doc(db, "users", userId, "daily_stats", selectedDate);

      const unsubscribe = onSnapshot(dailyStatsRef, (docSnap) => {
        if (docSnap.exists()) {
          // --- THIS IS THE FIX ---
          // Merge Firestore data with initial state to ensure all keys exist
          setDailyStats(prevStats => ({
            ...initialDailyStats, // Start with the default structure
            ...docSnap.data(),     // Overwrite with Firestore data
            recentTransactions: prevStats.recentTransactions || [], // Preserve recentTransactions
          }));
          // --- END FIX ---
        } else {
          // If no stats doc exists, trigger an update to create one
          setDailyStats(initialDailyStats); // Reset to initial state first
          updateDailyStats(userId, selectedDate).catch(error => {
            console.error("Error calculating daily stats:", error);
          });
        }
        setLoading(false);
      });

      return () => unsubscribe();
    } else {
      const monthlyStatsRef = doc(db, "users", userId, "monthly_stats", selectedMonth);

      const unsubscribe = onSnapshot(monthlyStatsRef, (docSnap) => {
        if (docSnap.exists()) {
          const data = docSnap.data();
          // Check if stats are stale (older than 10 seconds)
          const updatedAt = data.updatedAt?.toDate();
          const now = new Date();
          const isStale = !updatedAt || (now - updatedAt) > 10000; // 10 seconds
          
          if (isStale) {
            // Stats exist but might be stale, recalculate in background
            setMonthlyStats(data); // Show existing data immediately
            updateMonthlyStats(userId, selectedMonth).catch(error => {
              console.error("Error refreshing monthly stats:", error);
            });
          } else {
            // Stats are fresh, just display them
            setMonthlyStats(prevStats => ({
              ...(prevStats || {}), // Keep previous state if it exists
              ...data     // Overwrite with new data
            }));
          }
        } else {
          // If no stats doc exists, trigger an update
          setMonthlyStats(null); // Set to null while it calculates
          updateMonthlyStats(userId, selectedMonth).catch(error => {
            console.error("Error calculating monthly stats:", error);
            setMonthlyStats(null); // Set to null on error
          });
        }
        setLoading(false);
      });

      return () => unsubscribe();
    }
  }, [viewTab, selectedDate, selectedMonth, userId, initialDailyStats]);

  // This useEffect fetches NON-CACHED UI data (recent transactions for today)
  // It runs separately from the stats cache.
  useEffect(() => {
    if (viewTab === "daily") {
      const fetchRecentTransactions = async () => {
        const dateQuery = query(
          collection(db, "users", userId, "transactions"),
          where("date", "==", selectedDate)
        );
        const dateSnapshot = await getDocs(dateQuery);
        const recentTransactions = dateSnapshot.docs
          .map((d) => ({
            id: d.id,
            ...d.data(),
          }))
          .sort((a, b) => b.timestamp.toDate() - a.timestamp.toDate());

        // We must set state like this to preserve the cached stats
        setDailyStats((prevStats) => ({ ...prevStats, recentTransactions }));
      };
      fetchRecentTransactions();
    }
  }, [viewTab, selectedDate, userId]);

  // This useEffect handles CACHE INVALIDATION.
  // When transactions change, it forces a recalculation of the stats
  // which then triggers the onSnapshot listeners above.
  useEffect(() => {
    // only run if transactions have loaded
    if (allTransactions.length > 0) {
      // Update stats for the *current* view
      // This ensures the cache is fresh
      updateDailyStats(userId, selectedDate).catch((error) => {
        console.error("Failed to auto-update daily stats:", error);
      });
      
      // Recalculate monthly stats for current month and future months
      // Because a transaction in previous months affects future outstanding
      const currentMonth = getMonthYear(new Date(selectedDate));
      const today = new Date();
      const todayMonth = getMonthYear(today);
      
      // Always recalculate the current month
      updateMonthlyStats(userId, currentMonth).catch((error) => {
        console.error("Failed to auto-update monthly stats:", error);
      });
      
      // If viewing a past month, also recalculate current month
      if (currentMonth !== todayMonth) {
        updateMonthlyStats(userId, todayMonth).catch((error) => {
          console.error("Failed to auto-update current month stats:", error);
        });
      }
    }
  }, [allTransactions, selectedDate, userId]); // Re-run when transactions or date change
  const handleExportToExcel = () => {
    if (viewTab !== "monthly") {
      setAlertModal({
        isOpen: true,
        title: 'Monthly View Required',
        message: 'Please switch to Monthly View to export data',
        type: 'warning'
      });
      return;
    }

    if (!selectedMonth) {
      setAlertModal({
        isOpen: true,
        title: 'Month Not Selected',
        message: 'Please select a month to export',
        type: 'warning'
      });
      return;
    }

    // Get all transactions for the selected month (across all members)
    const startDateStr = `${selectedMonth}-01`;
    const [year, month] = selectedMonth.split("-");
    const endDateStr = `${year}-${month}-${new Date(
      parseInt(year),
      parseInt(month),
      0
    )
      .getDate()
      .toString()
      .padStart(2, "0")}`;

    const monthTransactions = allTransactions.filter((t) => {
      return t.date >= startDateStr && t.date <= endDateStr;
    });

    // Export to Excel
    exportMonthlyToExcel({
      members,
      transactions: monthTransactions,
      monthYear: selectedMonth,
      listName: "Daily Ledger",
    });
  };

  const handleClearThisMonthOutstanding = async (memberData) => {
    // Calculate current month outstanding for confirmation
    const thisMonthOnly = (memberData.monthlyTarget || 0) - (memberData.paidThisMonth || 0);
    
    const confirmMessage = `Current Status:
• This Month Target: ₹${(memberData.monthlyTarget || 0).toLocaleString()}
• Paid This Month: ₹${(memberData.paidThisMonth || 0).toLocaleString()}
• Outstanding This Month: ₹${thisMonthOnly.toLocaleString()}

This will add a clearing transaction of ₹${thisMonthOnly.toLocaleString()} to mark this month as paid.

Note: Any additional payments made after clearing will be credited to the member's account.`;

    setConfirmModal({
      isOpen: true,
      title: `Clear Outstanding for ${memberData.memberName}?`,
      message: confirmMessage,
      onConfirm: () => performClearOutstanding(memberData)
    });
  };

  const performClearOutstanding = async (memberData) => {

    try {
      // Find the member
      const member = members.find((m) => m.name === memberData.memberName);
      if (!member) {
        setAlertModal({
          isOpen: true,
          title: 'Error',
          message: 'Member not found.',
          type: 'error'
        });
        return;
      }

      // Calculate this month's outstanding
      const [year, month] = selectedMonth.split("-");

      // Get this month's transactions for the member
      const monthQuery = query(
        collection(db, "users", userId, "transactions"),
        where("memberId", "==", member.id),
        where("date", ">=", `${selectedMonth}-01`),
        where(
          "date",
          "<=",
          `${year}-${month}-${new Date(parseInt(year), parseInt(month), 0)
            .getDate()
            .toString()
            .padStart(2, "0")}`
        )
      );

      const snapshot = await getDocs(monthQuery);
      const monthTransactions = snapshot.docs.map((doc) => doc.data());

      // Check if already cleared this month
      const alreadyCleared = monthTransactions.some(t => t.type === "outstanding_cleared");
      if (alreadyCleared) {
        setAlertModal({
          isOpen: true,
          title: 'Already Cleared',
          message: 'Outstanding for this month has already been cleared. If member paid additional amount, it will be credited to their account.',
          type: 'warning'
        });
        return;
      }

      // Get the total outstanding from the stats (includes previous balance)
      const totalOutstanding = memberData.outstanding;

      if (totalOutstanding <= 0) {
        setAlertModal({
          isOpen: true,
          title: 'No Outstanding Balance',
          message: 'Member has no outstanding balance.',
          type: 'success'
        });
        return;
      }

      // Add outstanding cleared transaction on the last day of the month
      const lastDayOfMonth = new Date(parseInt(year), parseInt(month), 0);
      const clearanceDate = lastDayOfMonth.toISOString().split("T")[0];

      await addDoc(collection(db, "users", userId, "transactions"), {
        memberId: member.id,
        memberName: member.name,
        amount: totalOutstanding,
        date: clearanceDate,
        timestamp: Timestamp.fromDate(new Date(clearanceDate + "T12:00:00Z")),
        description: `⚡ Outstanding cleared (₹${totalOutstanding.toLocaleString()})`,
        type: "outstanding_cleared",
      });

      // Force refresh by setting monthlyStats to null first
      setMonthlyStats(null);
      
      // Recalculate stats
      await updateMonthlyStats(userId, selectedMonth);
      
      // Show success message
      setAlertModal({
        isOpen: true,
        title: 'Success',
        message: `Successfully cleared outstanding balance of ₹${totalOutstanding.toLocaleString()} for ${member.name} in ${selectedMonth}`,
        type: 'success'
      });
    } catch (error) {
      console.error("Error clearing outstanding balance:", error);
      setAlertModal({
        isOpen: true,
        title: 'Error',
        message: 'Failed to clear outstanding balance. Please try again.',
        type: 'error'
      });
    }
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
                  <div className="mb-4">
                    <button
                      onClick={async () => {
                      try {
                        setMonthlyStats(null);
                        await updateMonthlyStats(userId, selectedMonth);
                        setAlertModal({
                          isOpen: true,
                          title: 'Success',
                          message: 'Monthly stats recalculated successfully!',
                          type: 'success'
                        });
                      } catch (error) {
                        console.error("Error recalculating monthly stats:", error);
                        setAlertModal({
                          isOpen: true,
                          title: 'Error',
                          message: 'Failed to recalculate monthly stats. Please try again.',
                          type: 'error'
                        });
                      }
                      }}
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                    >
                      Recalculate Stats
                    </button>
                  </div>
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
                    <svg
                      className="w-5 h-5"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                      />
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
                      <Text
                        size="sm"
                        weight="semibold"
                        className="text-blue-300/80 uppercase tracking-wider text-xs"
                      >
                        Total Members
                      </Text>
                      <Heading
                        level="h2"
                        className="text-blue-100 mt-3 text-4xl font-bold"
                      >
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
                      <Text
                        size="sm"
                        weight="semibold"
                        className="text-emerald-300/80 uppercase tracking-wider text-xs"
                      >
                        Collected Today
                      </Text>
                      <Heading
                        level="h2"
                        className="text-emerald-100 mt-3 text-4xl font-bold"
                      >
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
                      <Text
                        size="sm"
                        weight="semibold"
                        className="text-amber-300/80 uppercase tracking-wider text-xs"
                      >
                        Didn't Pay
                      </Text>
                      <Heading
                        level="h2"
                        className="text-amber-100 mt-3 text-4xl font-bold"
                      >
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
                    <span className="ml-2">Paid ({(dailyStats.paidMembers || []).length})</span>
                  </h3>
                  <div className="max-h-96 overflow-y-auto space-y-2 custom-scrollbar">
                    {dailyStats.paidMembers.length > 0 ? (
                      dailyStats.paidMembers.map((member, idx) => (
                        <div
                          key={idx}
                          className="flex justify-between items-center bg-emerald-900/20 border border-emerald-700/20 p-3 rounded-lg hover:bg-emerald-900/30 transition-colors"
                        >
                          <span className="font-medium text-slate-200">
                            {member.memberName}
                          </span>
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
                    <span className="ml-2">Didn't Pay ({(dailyStats.pendingMembers || []).length})</span>
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
                    {(dailyStats.recentTransactions || []).length > 0 ? (
                      dailyStats.recentTransactions.map((trans, idx) => (
                        <div
                          key={idx}
                          className="flex justify-between items-center bg-slate-700/30 border border-slate-600/30 p-4 rounded-lg hover:bg-slate-700/50 transition-all hover:scale-[1.01]"
                        >
                          <div>
                            <p className="font-semibold text-slate-200">
                              {trans.memberName}
                            </p>
                            <p className="text-xs text-slate-400 mt-1">
                              🕐{" "}
                              {new Date(
                                trans.timestamp.toDate()
                              ).toLocaleTimeString()}
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
                    {(monthlyStats.membersWithDues || []).length > 0 ? (
                      monthlyStats.membersWithDues.map((member, index) => (
                        <div
                          key={index}
                          className="bg-rose-900/20 border border-rose-700/30 p-5 rounded-lg hover:bg-rose-900/30 transition-all hover:scale-[1.01] backdrop-blur-sm"
                        >
                          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3">
                            <div className="flex-1">
                              <p className="font-bold text-lg text-slate-200">
                                {member.memberName}
                              </p>
                              <div className="mt-2 space-y-1">
                                {member.previousBalance > 0 && (
                                  <div className="flex justify-between items-center">
                                    <p className="text-xs text-orange-400">
                                      Previous Balance:
                                    </p>
                                    <p className="text-sm text-orange-300 font-semibold">
                                      ₹{member.previousBalance.toLocaleString()}
                                    </p>
                                  </div>
                                )}
                                <div className="flex justify-between items-center">
                                  <p className="text-xs text-slate-400">
                                    This Month Target:
                                  </p>
                                  <p className="text-sm text-slate-300 font-semibold">
                                    ₹{(member.monthlyTarget || 0).toLocaleString()}
                                  </p>
                                </div>
                                {member.paidThisMonth !== 0 && (
                                  <div className="flex justify-between items-center">
                                    <p className={`text-xs ${member.paidThisMonth > 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                                      Paid This Month:
                                    </p>
                                    <p className={`text-sm font-semibold ${member.paidThisMonth > 0 ? 'text-emerald-300' : 'text-red-300'}`}>
                                      {member.paidThisMonth > 0 ? '-' : '+'}₹{Math.abs(member.paidThisMonth).toLocaleString()}
                                    </p>
                                  </div>
                                )}
                                <div className="border-t border-slate-600 pt-1 mt-1">
                                  <div className="flex justify-between items-center">
                                    <p className="text-xs text-rose-300/80 uppercase tracking-wide">
                                      Total Outstanding
                                    </p>
                                    <p className="font-bold text-2xl text-rose-400">
                                      ₹{member.due.toLocaleString()}
                                    </p>
                                  </div>
                                </div>
                              </div>
                            </div>
                            <button
                              onClick={() =>
                                handleClearThisMonthOutstanding(member)
                              }
                              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg transition-colors text-sm font-medium flex items-center gap-2 whitespace-nowrap"
                              title="Clear outstanding balance for this month"
                            >
                              <svg
                                className="w-4 h-4"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M5 13l4 4L19 7"
                                />
                              </svg>
                              Clear This Month
                            </button>
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
            <EmptyState
              title="No Data"
              description="Could not load monthly statistics."
            />
          )}
        </CardContent>
      </Card>

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
    </FadeIn>
  );
}
