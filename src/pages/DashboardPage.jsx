import React, { useState, useEffect, useCallback } from "react";
import { collection, query, where, getDocs, doc, getDoc } from "firebase/firestore";
import { db } from "../firebase";
import { updateDailyStats, updateMonthlyStats } from "../utils/statsCalculator";
import Card, { CardHeader, CardTitle, CardContent } from "../components/Card";
import { Heading, Text, Badge } from "../components/Typography";
import Button from "../components/Button";
import LoadingSpinner, { EmptyState } from "../components/LoadingSpinner";
import { FadeIn, Stagger } from "../components/Animations";

const getMonthYear = (date = new Date()) => date.toISOString().slice(0, 7);
const getTodayDate = () => new Date().toISOString().split("T")[0];

export default function DashboardPage({ userId }) {
  const [selectedMonth, setSelectedMonth] = useState(getMonthYear());
  const [selectedDate, setSelectedDate] = useState(getTodayDate());
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

    try {
      // Try to get cached stats first
      const cachedStatsRef = doc(db, "users", userId, "daily_stats", selectedDate);
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

        // Get transactions for the selected date
        const dateQuery = query(
          collection(db, "users", userId, "transactions"),
          where("date", "==", selectedDate)
        );
        const dateSnapshot = await getDocs(dateQuery);
        const dateTransactions = dateSnapshot.docs.map((d) => ({
          id: d.id,
          ...d.data(),
        }));

        setDailyStats((prev) => ({
          ...prev,
          recentTransactions: dateTransactions.sort(
            (a, b) => b.timestamp.toDate() - a.timestamp.toDate()
          ),
        }));
      } else {
        // No cache, calculate and save
        const stats = await updateDailyStats(userId, selectedDate);
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
  }, [userId, selectedDate]);

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
  }, [viewTab, selectedDate, selectedMonth, calculateDailyStats, calculateMonthlyStats]);

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
                <input
                  type="month"
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(e.target.value)}
                  className="bg-gray-50 border border-gray-300 text-gray-900 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
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
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
                <CardContent className="text-center p-4">
                  <Text size="sm" weight="semibold" className="text-blue-800">
                    Total Members
                  </Text>
                  <Heading level="h2" className="text-blue-900 mt-2">
                    {dailyStats.totalMembers}
                  </Heading>
                </CardContent>
              </Card>
              <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200">
                <CardContent className="text-center p-4">
                  <Text size="sm" weight="semibold" className="text-green-800">
                    Collected on {selectedDate}
                  </Text>
                  <Heading level="h2" className="text-green-900 mt-2">
                    ₹{dailyStats.totalCollected.toLocaleString()}
                  </Heading>
                </CardContent>
              </Card>
              <Card className="bg-gradient-to-br from-orange-50 to-orange-100 border-orange-200">
                <CardContent className="text-center p-4">
                  <Text size="sm" weight="semibold" className="text-orange-800">
                    Didn't Pay
                  </Text>
                  <Heading level="h2" className="text-orange-900 mt-2">
                    {dailyStats.pendingToday.length}
                  </Heading>
                </CardContent>
              </Card>
            </div>
          </Stagger>

          {/* Payment Status for Selected Date */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            <div className="bg-white p-4 rounded-lg border-2 border-green-200">
              <h3 className="text-lg font-bold text-green-800 mb-3 flex items-center">
                <span className="bg-green-500 w-3 h-3 rounded-full mr-2"></span>
                ✅ Paid ({dailyStats.paidToday.length})
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
                    No payments received on this date
                  </p>
                )}
              </div>
            </div>

            <div className="bg-white p-4 rounded-lg border-2 border-orange-200">
              <h3 className="text-lg font-bold text-orange-800 mb-3 flex items-center">
                <span className="bg-orange-500 w-3 h-3 rounded-full mr-2"></span>
                ⏳ Didn't Pay ({dailyStats.pendingToday.length})
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
                    🎉 Everyone paid on this date!
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Transactions for Selected Date */}
          <div>
            <h3 className="text-xl font-bold mb-3">Transactions on {selectedDate}</h3>
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
                    No transactions on this date
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

          {/* Outstanding Breakdown */}
          <div className="bg-gradient-to-r from-amber-50 to-red-50 p-6 rounded-lg mb-6 border-2 border-amber-200">
            <h3 className="text-xl font-bold text-gray-800 mb-4 flex items-center">
              <span className="bg-amber-500 w-3 h-3 rounded-full mr-2"></span>
              Outstanding Balance Breakdown
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-white p-4 rounded-lg text-center">
                <h4 className="text-sm font-semibold text-gray-600 mb-2">
                  This Month Target
                </h4>
                <p className="text-2xl font-bold text-blue-600">
                  ₹{monthlyStats.totalTarget.toLocaleString()}
                </p>
              </div>
              <div className="bg-white p-4 rounded-lg text-center">
                <h4 className="text-sm font-semibold text-gray-600 mb-2">
                  Collected This Month
                </h4>
                <p className="text-2xl font-bold text-green-600">
                  ₹{monthlyStats.totalCollected.toLocaleString()}
                </p>
              </div>
              <div className="bg-white p-4 rounded-lg text-center">
                <h4 className="text-sm font-semibold text-gray-600 mb-2">
                  Total Outstanding
                </h4>
                <p className="text-2xl font-bold text-red-600">
                  ₹{monthlyStats.totalOutstanding.toLocaleString()}
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  (Includes previous months)
                </p>
              </div>
            </div>
          </div>

          {/* Monthly Target vs Collected */}
          <div className="bg-gradient-to-r from-blue-50 to-purple-50 p-6 rounded-lg mb-6 border-2 border-blue-200">
            <div className="flex justify-between items-center">
              <div>
                <h3 className="text-lg font-semibold text-gray-700 mb-2">
                  This Month Target
                </h3>
                <p className="text-3xl font-bold text-blue-600">
                  ₹{monthlyStats.totalTarget.toLocaleString()}
                </p>
              </div>
              <div className="text-center">
                <h3 className="text-lg font-semibold text-gray-700 mb-2">
                  Collection Rate
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
                  This Month Remaining
                </h3>
                <p className="text-3xl font-bold text-orange-600">
                  ₹{(monthlyStats.totalTarget - monthlyStats.totalCollected).toLocaleString()}
                </p>
              </div>
            </div>
          </div>

          {/* Members with Outstanding Dues */}
          <div>
            <h3 className="text-xl font-bold mb-3 flex items-center">
              <span className="bg-red-500 w-3 h-3 rounded-full mr-2"></span>
              Members with Outstanding Dues
              <span className="ml-2 text-sm text-gray-500 font-normal">
                (Including previous months)
              </span>
            </h3>
            <div className="bg-white p-4 rounded-lg border">
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {monthlyStats.membersWithDues.length > 0 ? (
                  monthlyStats.membersWithDues.map((member, index) => (
                    <div
                      key={index}
                      className="bg-red-50 p-4 rounded-lg hover:bg-red-100 transition-colors border border-red-200"
                    >
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <p className="font-bold text-lg text-gray-800">{member.name}</p>
                          <div className="mt-2 text-sm text-gray-600 space-y-1">
                            <p>
                              <span className="font-semibold">This Month Target:</span>{" "}
                              ₹{monthlyStats.totalTarget / monthlyStats.totalMembers}
                            </p>
                            {member.paidThisMonth !== undefined && (
                              <p>
                                <span className="font-semibold">Paid This Month:</span>{" "}
                                <span className="text-green-600">
                                  ₹{member.paidThisMonth?.toLocaleString() || 0}
                                </span>
                              </p>
                            )}
                            {member.previousBalance !== undefined && member.previousBalance > 0 && (
                              <p>
                                <span className="font-semibold">Previous Balance Due:</span>{" "}
                                <span className="text-orange-600">
                                  ₹{member.previousBalance?.toLocaleString() || 0}
                                </span>
                              </p>
                            )}
                          </div>
                        </div>
                        <div className="text-right ml-4">
                          <p className="text-xs text-gray-500 mb-1">Total Outstanding</p>
                          <p className="font-bold text-2xl text-red-600">
                            ₹{member.due.toLocaleString()}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-center text-green-600 py-4 font-semibold">
                    🎉 All dues are cleared (including previous months)!
                  </p>
                )}
              </div>
            </div>
          </div>
        </>
      )}
        </CardContent>
      </Card>
    </FadeIn>
  );
}
