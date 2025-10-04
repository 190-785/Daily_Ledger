import React, { useState, useEffect, useCallback } from "react";
import { db } from "../firebase";
import { collection, onSnapshot, query } from "firebase/firestore";

const getMonthYear = (date = new Date()) => date.toISOString().slice(0, 7);

export default function MonthlyViewPage({ userId }) {
  const [members, setMembers] = useState([]);
  const [allTransactions, setAllTransactions] = useState([]);
  const [selectedMemberId, setSelectedMemberId] = useState("");
  const [selectedMonth, setSelectedMonth] = useState(getMonthYear());
  const [monthlyData, setMonthlyData] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const membersQuery = query(collection(db, "users", userId, "members"));
    const unsubscribeMembers = onSnapshot(membersQuery, (snapshot) => {
      const sortedMembers = snapshot.docs
        .map((doc) => ({ id: doc.id, ...doc.data() }))
        .sort((a, b) => a.name.localeCompare(b.name));
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

  const calculateMonthlyData = useCallback(() => {
    if (!selectedMemberId || !selectedMonth) {
      setMonthlyData(null);
      return;
    }

    setLoading(true);
    const member = members.find((m) => m.id === selectedMemberId);
    if (!member) {
      setLoading(false);
      return;
    }

    const startDate = new Date(`${selectedMonth}-01T00:00:00Z`);

    const previousTransactions = allTransactions.filter(
      (t) => t.memberId === selectedMemberId && t.timestamp.toDate() < startDate
    );

    const currentTransactions = allTransactions
      .filter((t) => {
        const tDate = t.timestamp.toDate();
        return (
          t.memberId === selectedMemberId &&
          tDate.getFullYear() === startDate.getFullYear() &&
          tDate.getMonth() === startDate.getMonth()
        );
      })
      .sort((a, b) => a.date.localeCompare(b.date));

    const totalPaidThisMonth = currentTransactions.reduce(
      (sum, t) => sum + t.amount,
      0
    );

    const months = {};
    previousTransactions.forEach((t) => {
      const month = t.date.slice(0, 7);
      if (!months[month]) months[month] = { paid: 0 };
      months[month].paid += t.amount;
    });

    let balanceBroughtForward = 0; // Negative means due, positive means credit
    Object.keys(months).forEach((month) => {
      balanceBroughtForward += months[month].paid - member.monthlyTarget;
    });

    const finalBalanceDue =
      member.monthlyTarget - balanceBroughtForward - totalPaidThisMonth;

    setMonthlyData({
      transactions: currentTransactions,
      balanceBroughtForward,
      totalPaid: totalPaidThisMonth,
      totalDue: member.monthlyTarget,
      finalBalanceDue,
    });
    setLoading(false);
  }, [selectedMemberId, selectedMonth, members, allTransactions]);

  useEffect(() => {
    calculateMonthlyData();
  }, [calculateMonthlyData]);

  return (
    <div className="bg-white p-6 rounded-xl shadow-md">
      <h2 className="text-3xl font-bold mb-4">Monthly Statement</h2>
      <div className="flex flex-wrap gap-4 items-center mb-6 bg-gray-50 p-4 rounded-lg">
        <select
          value={selectedMemberId}
          onChange={(e) => setSelectedMemberId(e.target.value)}
          className="flex-1 min-w-[200px] p-2 border rounded-md"
        >
          <option value="">-- Choose member --</option>
          {members.map((m) => (
            <option key={m.id} value={m.id}>
              {m.name}
            </option>
          ))}
        </select>
        <input
          type="month"
          value={selectedMonth}
          onChange={(e) => setSelectedMonth(e.target.value)}
          className="flex-1 min-w-[150px] p-2 border rounded-md"
        />
      </div>
      {loading ? (
        <p>Loading statement...</p>
      ) : (
        monthlyData && (
          <div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6 text-center">
              <div
                className={`p-4 rounded-lg ${
                  monthlyData.balanceBroughtForward < 0
                    ? "bg-red-100"
                    : "bg-green-100"
                }`}
              >
                <h4 className="text-sm font-semibold">Previous Balance</h4>
                <p
                  className={`text-xl font-bold ${
                    monthlyData.balanceBroughtForward < 0
                      ? "text-red-800"
                      : "text-green-800"
                  }`}
                >
                  ₹
                  {Math.abs(monthlyData.balanceBroughtForward).toLocaleString()}
                  {monthlyData.balanceBroughtForward < 0
                    ? " (Due)"
                    : " (Credit)"}
                </p>
              </div>
              <div className="bg-yellow-100 p-4 rounded-lg">
                <h4 className="text-sm font-semibold text-yellow-800">
                  Monthly Target
                </h4>
                <p className="text-xl font-bold text-yellow-900">
                  ₹{monthlyData.totalDue.toLocaleString()}
                </p>
              </div>
              <div className="bg-blue-100 p-4 rounded-lg">
                <h4 className="text-sm font-semibold text-blue-800">
                  Paid This Month
                </h4>
                <p className="text-xl font-bold text-blue-900">
                  ₹{monthlyData.totalPaid.toLocaleString()}
                </p>
              </div>
              <div
                className={`p-4 rounded-lg ${
                  monthlyData.finalBalanceDue > 0
                    ? "bg-red-100"
                    : "bg-green-100"
                }`}
              >
                <h4 className="text-sm font-semibold">Final Balance</h4>
                <p
                  className={`text-xl font-bold ${
                    monthlyData.finalBalanceDue > 0
                      ? "text-red-800"
                      : "text-green-800"
                  }`}
                >
                  ₹{Math.abs(monthlyData.finalBalanceDue).toLocaleString()}
                  {monthlyData.finalBalanceDue > 0 ? " (Due)" : " (Credit)"}
                </p>
              </div>
            </div>
            <h3 className="text-xl font-semibold mb-2">
              Transactions this month
            </h3>
            <div className="overflow-x-auto">
              <table className="min-w-full bg-white">
                <thead className="bg-gray-100">
                  <tr>
                    <th className="text-left py-3 px-4">Date</th>
                    <th className="text-left py-3 px-4">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {monthlyData.transactions.length > 0 ? (
                    monthlyData.transactions.map((t) => (
                      <tr key={t.id} className="border-b hover:bg-gray-50">
                        <td className="py-3 px-4">{t.date}</td>
                        <td className="py-3 px-4">
                          ₹{t.amount.toLocaleString()}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td
                        colSpan="2"
                        className="text-center py-4 text-gray-500"
                      >
                        No transactions recorded for this month.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )
      )}
    </div>
  );
}
