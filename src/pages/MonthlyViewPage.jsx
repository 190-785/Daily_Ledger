import React, { useState, useEffect, useCallback } from "react";
import { db } from "../firebase";
import { collection, onSnapshot, query } from "firebase/firestore";
import { exportMonthlyToExcel } from "../utils/excelExport";
import { AlertModal } from "../components";

// Helper function to calculate monthly target from transaction patterns
function calculateMonthlyTargetFromTransactions(memberTransactions) {
  if (memberTransactions.length === 0) return 0;

  // Sort transactions by date
  const sortedTransactions = memberTransactions.sort((a, b) => a.date.localeCompare(b.date));

  // Group transactions by month
  const monthlyTotals = {};
  sortedTransactions.forEach(transaction => {
    const month = transaction.date.slice(0, 7); // YYYY-MM format
    if (!monthlyTotals[month]) {
      monthlyTotals[month] = 0;
    }
    monthlyTotals[month] += transaction.amount;
  });

  // Find the most common monthly payment amount
  const amounts = Object.values(monthlyTotals);
  if (amounts.length === 0) return 0;

  // For virtual members, assume the monthly target is the most common payment amount
  const mostCommonAmount = amounts.sort((a,b) =>
    amounts.filter(v => v===a).length - amounts.filter(v => v===b).length
  ).pop();

  return mostCommonAmount || 0;
}

const getMonthYear = (date = new Date()) => date.toISOString().slice(0, 7);

export default function MonthlyViewPage({ userId }) {
  const [members, setMembers] = useState([]);
  const [allTransactions, setAllTransactions] = useState([]);
  const [selectedMemberId, setSelectedMemberId] = useState("");
  const [selectedMonth, setSelectedMonth] = useState(getMonthYear());
  const [monthlyData, setMonthlyData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [availableMembers, setAvailableMembers] = useState([]); // Includes virtual members
  const [alertModal, setAlertModal] = useState({ isOpen: false, title: '', message: '', type: 'info' });

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
      const transactions = snapshot.docs
        .map((doc) => ({ id: doc.id, ...doc.data() }))
        .filter((t) => t.type !== 'outstanding_cleared'); // Hide clearing transactions from display
      setAllTransactions(transactions);
      
      // Calculate available members (current + virtual members from transactions)
      const currentMemberIds = new Set(members.map(m => m.id));
      const virtualMembers = new Map();
      
      transactions.forEach(transaction => {
        if (!currentMemberIds.has(transaction.memberId) && !virtualMembers.has(transaction.memberId)) {
          virtualMembers.set(transaction.memberId, {
            id: transaction.memberId,
            name: transaction.memberName,
            isVirtual: true
          });
        }
      });
      
      const allAvailableMembers = [...members, ...Array.from(virtualMembers.values())]
        .sort((a, b) => (a.rank || 0) - (b.rank || 0));
      
      setAvailableMembers(allAvailableMembers);
    });

    return () => {
      unsubscribeMembers();
      unsubscribeTrans();
    };
  }, [userId, members]);

  const calculateMonthlyData = useCallback(() => {
    if (!selectedMemberId || !selectedMonth) {
      setMonthlyData(null);
      return;
    }

    setLoading(true);
    const member = availableMembers.find((m) => m.id === selectedMemberId);
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

    // Determine monthly target for this member
    let monthlyTarget = member.monthlyTarget || 0;
    
    // For virtual members, calculate target from transaction patterns
    if (member.isVirtual) {
      const memberTransactions = allTransactions.filter(t => t.memberId === selectedMemberId);
      monthlyTarget = calculateMonthlyTargetFromTransactions(memberTransactions);
    }

    let balanceBroughtForward = 0; // Negative means due, positive means credit
    Object.keys(months).forEach((month) => {
      balanceBroughtForward += months[month].paid - monthlyTarget;
    });

    const finalBalanceDue =
      monthlyTarget - balanceBroughtForward - totalPaidThisMonth;

    setMonthlyData({
      transactions: currentTransactions,
      balanceBroughtForward,
      totalPaid: totalPaidThisMonth,
      totalDue: monthlyTarget,
      finalBalanceDue,
    });
    setLoading(false);
  }, [selectedMemberId, selectedMonth, availableMembers, allTransactions]);

  useEffect(() => {
    calculateMonthlyData();
  }, [calculateMonthlyData]);

  const handleExportToExcel = () => {
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
    <div className="bg-white p-6 rounded-xl shadow-md">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-3xl font-bold">Monthly Statement</h2>
        <button
          onClick={handleExportToExcel}
          className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center gap-2"
          title="Export monthly data to Excel"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          Export to Excel
        </button>
      </div>
      <div className="flex flex-wrap gap-4 items-center mb-6 bg-gray-50 p-4 rounded-lg">
        <select
          value={selectedMemberId}
          onChange={(e) => setSelectedMemberId(e.target.value)}
          className="flex-1 min-w-[200px] p-2 border rounded-md"
        >
          <option value="">-- Choose member --</option>
          {availableMembers.map((m) => (
            <option key={m.id} value={m.id}>
              {m.name}{m.isVirtual ? ' (Historical)' : ''}
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
                <h4 className="text-sm font-semibold text-gray-900">Previous Balance</h4>
                <p
                  className={`text-xl font-bold ${
                    monthlyData.balanceBroughtForward < 0
                      ? "text-red-900"
                      : "text-green-900"
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
                <h4 className="text-sm font-semibold text-yellow-900">
                  Monthly Target
                </h4>
                <p className="text-xl font-bold text-gray-900">
                  ₹{monthlyData.totalDue.toLocaleString()}
                </p>
              </div>
              <div className="bg-blue-100 p-4 rounded-lg">
                <h4 className="text-sm font-semibold text-blue-900">
                  Paid This Month
                </h4>
                <p className="text-xl font-bold text-blue-950">
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
                <h4 className="text-sm font-semibold text-gray-900">Final Balance</h4>
                <p
                  className={`text-xl font-bold ${
                    monthlyData.finalBalanceDue > 0
                      ? "text-red-900"
                      : "text-green-900"
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

      {/* Alert Modal */}
      <AlertModal
        isOpen={alertModal.isOpen}
        onClose={() => setAlertModal({ isOpen: false, title: '', message: '', type: 'info' })}
        title={alertModal.title}
        message={alertModal.message}
        type={alertModal.type}
      />
    </div>
  );
}
