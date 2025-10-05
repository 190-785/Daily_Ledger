import React, { useState, useEffect, useCallback } from "react";
import { collection, query, where, getDocs } from "firebase/firestore";
import { db } from "/src/firebase.js";
import { updateDailyStats, updateMonthlyStats } from "/src/utils/statsCalculator.js";
import Card, { CardHeader, CardTitle, CardContent } from "/src/components/Card.jsx";
import { Heading, Text } from "/src/components/Typography.jsx";
import Button from "/src/components/Button.jsx";
import LoadingSpinner, { EmptyState } from "/src/components/LoadingSpinner.jsx";
import { FadeIn, Stagger } from "/src/components/Animations.jsx";

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
                      <Text size="sm" weight="semibold" className="text-blue-900">
                        Total Members
                      </Text>
                      <Heading level="h2" className="text-blue-950 mt-2">
                        {dailyStats.totalMembers}
                      </Heading>
                    </CardContent>
                  </Card>
                  <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200">
                    <CardContent className="text-center p-4">
                      <Text size="sm" weight="semibold" className="text-green-900">
                        Collected on {selectedDate}
                      </Text>
                      <Heading level="h2" className="text-green-950 mt-2">
                        ₹{dailyStats.totalCollected.toLocaleString()}
                      </Heading>
                    </CardContent>
                  </Card>
                  <Card className="bg-gradient-to-br from-orange-50 to-orange-100 border-orange-200">
                    <CardContent className="text-center p-4">
                      <Text size="sm" weight="semibold" className="text-orange-900">
                        Didn't Pay
                      </Text>
                      <Heading level="h2" className="text-orange-950 mt-2">
                        {dailyStats.pendingMembers.length}
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
                    ✅ Paid ({dailyStats.paidMembers.length})
                  </h3>
                  <div className="max-h-96 overflow-y-auto space-y-2">
                    {dailyStats.paidMembers.length > 0 ? (
                      dailyStats.paidMembers.map((member, idx) => (
                        <div
                          key={idx}
                          className="flex justify-between items-center bg-green-50 p-3 rounded"
                        >
                          <span className="font-medium">{member.memberName}</span>
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
                    ⏳ Didn't Pay ({dailyStats.pendingMembers.length})
                  </h3>
                  <div className="max-h-96 overflow-y-auto space-y-2">
                    {dailyStats.pendingMembers.length > 0 ? (
                      dailyStats.pendingMembers.map((member, idx) => (
                        <div
                          key={idx}
                          className="bg-orange-50 p-3 rounded font-medium"
                        >
                          {member.memberName}
                        </div>
                      ))
                    ) : (
                      <p className="text-green-600 text-sm py-4 text-center font-semibold">
                        🎉 Everyone with an outstanding balance has paid today!
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
          ) : monthlyStats ? (
            <>
              {/* Monthly Stats */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                <div className="bg-blue-100 p-4 rounded-lg text-center">
                  <h3 className="text-sm font-semibold text-blue-900">
                    Total Members
                  </h3>
                  <p className="text-3xl font-bold text-blue-950 mt-2">
                    {monthlyStats.totalMembers}
                  </p>
                </div>
                <div className="bg-green-100 p-4 rounded-lg text-center">
                  <h3 className="text-sm font-semibold text-green-900">
                    Collected This Month
                  </h3>
                  <p className="text-3xl font-bold text-green-950 mt-2">
                    ₹{monthlyStats.totalCollected.toLocaleString()}
                  </p>
                </div>
                <div className="bg-red-100 p-4 rounded-lg text-center">
                  <h3 className="text-sm font-semibold text-red-900">
                    Outstanding
                  </h3>
                  <p className="text-3xl font-bold text-red-950 mt-2">
                    ₹{monthlyStats.totalOutstanding.toLocaleString()}
                  </p>
                </div>
                <div className="bg-purple-100 p-4 rounded-lg text-center">
                  <h3 className="text-sm font-semibold text-purple-900">
                    Collection Rate
                  </h3>
                  <p className="text-3xl font-bold text-purple-950 mt-2">
                    {monthlyStats.collectionRate}%
                  </p>
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
                          <div className="flex justify-between items-center">
                            <p className="font-bold text-lg text-gray-800">{member.memberName}</p>
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
          ) : (
              <EmptyState title="No Data" description="Could not load monthly statistics."/>
          )}
        </CardContent>
      </Card>
    </FadeIn>
  );
}

