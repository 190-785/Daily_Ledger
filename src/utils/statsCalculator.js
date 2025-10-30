import {
  collection,
  doc,
  setDoc,
  getDocs,
  query,
  where,
  Timestamp,
} from "firebase/firestore";
import { db } from "../firebase";

/**
 * Calculates the total expected amount from a member up to a given month.
 * This is the new centralized function for this logic.
 * @param {Object} member - The member object (must have 'createdOn' and 'monthlyTarget')
 * @param {Date} asOfDate - The date to calculate up to (inclusive of this month).
 */
function calculateTotalExpected(member, asOfDate) {
  const memberCreatedDate = member.createdOn?.toDate() || new Date(0);
  let totalExpected = 0;
  
  // Start checking from the first day of the member's creation month
  let checkDate = new Date(memberCreatedDate.getFullYear(), memberCreatedDate.getMonth(), 1);
  
  // End checking at the first day of the 'asOfDate's month
  const endDate = new Date(asOfDate.getFullYear(), asOfDate.getMonth(), 1);
  
  while (checkDate <= endDate) {
    totalExpected += member.monthlyTarget || 0;
    checkDate.setMonth(checkDate.getMonth() + 1);
  }
  
  return totalExpected;
}

/**
 * Calculate and save daily stats to Firebase
 */
export async function updateDailyStats(userId, date) {
  try {
    // Get all members
    const membersSnapshot = await getDocs(
      collection(db, "users", userId, "members")
    );
    const members = membersSnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));

    // Get today's transactions
    const todayQuery = query(
      collection(db, "users", userId, "transactions"),
      where("date", "==", date)
    );
    const todaySnapshot = await getDocs(todayQuery);
    const todayTransactions = todaySnapshot.docs.map((doc) => doc.data());

    const totalCollected = todayTransactions.reduce(
      (sum, t) => sum + t.amount,
      0
    );

    // Get ALL transactions for outstanding calculation
    const allTransactionsSnapshot = await getDocs(
      collection(db, "users", userId, "transactions")
    );
    const allTransactions = allTransactionsSnapshot.docs.map((doc) =>
      doc.data()
    );

    // Sort members by rank
    members.sort((a, b) => (a.rank || 0) - (b.rank || 0));

    const paidMembers = [];
    const pendingMembers = [];

    // Calculate outstanding for each member
    for (const member of members) {
      // Get amount paid today
      const paidToday = todayTransactions
        .filter((t) => t.memberId === member.id)
        .reduce((sum, t) => sum + t.amount, 0);

      // Calculate total outstanding (all time)
      const totalPaidAllTime = allTransactions
        .filter((t) => t.memberId === member.id)
        .reduce((sum, t) => sum + t.amount, 0);

      // --- REFACTORED LOGIC ---
      // Use the centralized function to get total expected
      const currentDate = new Date(date);
      const totalExpected = calculateTotalExpected(member, currentDate);
      // --- END REFACTOR ---

      const outstandingBalance = totalExpected - totalPaidAllTime;
      
      // Debug log for troubleshooting
      if (outstandingBalance !== 0) {
        console.log(`Member: ${member.name}, Expected: ${totalExpected}, Paid: ${totalPaidAllTime}, Outstanding: ${outstandingBalance}`);
      }

      // Paid tab: Only members who paid something today (amount > 0)
      if (paidToday > 0) {
        paidMembers.push({
          memberId: member.id,
          memberName: member.name,
          rank: member.rank || 0,
          amount: paidToday,
        });
      } 
      // Didn't Pay tab: Members who didn't pay today AND have outstanding dues (> 0)
      else if (outstandingBalance > 0) {
        pendingMembers.push({
          memberId: member.id,
          memberName: member.name,
          rank: member.rank || 0,
        });
      }
      // Members with 0 outstanding are excluded from both tabs
    }

    const paidCount = paidMembers.length;
    const pendingCount = pendingMembers.length;

    // Save to Firebase
    const statsData = {
      date,
      totalCollected,
      paidCount,
      pendingCount,
      totalMembers: members.length,
      paidMembers,
      pendingMembers,
      updatedAt: Timestamp.now(),
    };

    await setDoc(
      doc(db, "users", userId, "daily_stats", date),
      statsData
    );

    return statsData;
  } catch (error) {
    console.error("Error updating daily stats:", error);
    throw error;
  }
}

/**
 * Calculate and save monthly stats to Firebase
 */
export async function updateMonthlyStats(userId, monthYear) {
  try {
    // Get all members
    const membersSnapshot = await getDocs(
      collection(db, "users", userId, "members")
    );
    const members = membersSnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));

    const startDate = new Date(`${monthYear}-01T00:00:00Z`);
    const endDate = new Date(
      startDate.getFullYear(),
      startDate.getMonth() + 1,
      0,
      23,
      59,
      59
    );
    const endDateStr = `${monthYear}-${endDate.getDate().toString().padStart(2, '0')}`;

    // Get this month's transactions
    const currentMonthQuery = query(
      collection(db, "users", userId, "transactions"),
      where("date", ">=", `${monthYear}-01`),
      where("date", "<=", endDateStr)
    );
    const currentMonthSnapshot = await getDocs(currentMonthQuery);
    const transactionsThisMonth = currentMonthSnapshot.docs.map((doc) =>
      doc.data()
    );

    const totalCollected = transactionsThisMonth
      .filter(t => t.type !== 'outstanding_cleared')
      .reduce((sum, t) => sum + t.amount, 0);

    // Get ALL transactions for cumulative balance calculation
    const allTransactionsSnapshot = await getDocs(
      collection(db, "users", userId, "transactions")
    );
    const allTransactions = allTransactionsSnapshot.docs.map((doc) =>
      doc.data()
    );

    let totalOutstanding = 0;
    let membersWithDues = [];

    for (const member of members) {
      // Get all transactions before this month
      const previousTransactions = allTransactions.filter(
        (t) => t.memberId === member.id && t.date < `${monthYear}-01`
      );

      // --- REFACTORED LOGIC ---
      // Calculate cumulative balance from ALL previous months
      const previousMonth = new Date(startDate);
      previousMonth.setDate(0); // This sets it to the last day of the previous month
      
      const totalExpected_previous = calculateTotalExpected(member, previousMonth);
      const totalPaid_previous = previousTransactions.reduce((sum, t) => sum + t.amount, 0);
      const previousBalanceDue = totalExpected_previous - totalPaid_previous;
      // --- END REFACTOR ---

      const paidThisMonth = transactionsThisMonth
        .filter((t) => t.memberId === member.id)
        .reduce((sum, t) => sum + t.amount, 0);

      // The final balance IS the outstanding balance
      const finalBalance =
        member.monthlyTarget + previousBalanceDue - paidThisMonth;

      if (finalBalance > 0) {
        totalOutstanding += finalBalance;
        membersWithDues.push({
          memberId: member.id,
          memberName: member.name,
          rank: member.rank || 0,
          due: finalBalance,
          paidThisMonth,
          previousBalance: previousBalanceDue,
        });
      }
    }

    // Sort by rank instead of due amount
    membersWithDues.sort((a, b) => (a.rank || 0) - (b.rank || 0));

    const totalTarget = members.reduce((sum, m) => sum + m.monthlyTarget, 0);
    const collectionRate =
      totalTarget > 0 ? Math.round((totalCollected / totalTarget) * 100) : 0;

    // Save to Firebase
    const statsData = {
      monthYear,
      totalCollected,
      totalOutstanding,
      totalTarget,
      collectionRate,
      totalMembers: members.length,
      membersWithDues,
      updatedAt: Timestamp.now(),
    };

    await setDoc(
      doc(db, "users", userId, "monthly_stats", monthYear),
      statsData
    );

    return statsData;
  } catch (error) {
    console.error("Error updating monthly stats:", error);
    throw error;
  }
}