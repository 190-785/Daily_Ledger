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

      // Get member creation date
      const memberCreatedDate = member.createdOn?.toDate() || new Date(0);
      const currentDate = new Date(date);
      
      // Calculate expected amount (monthlyTarget * number of months since creation)
      let totalExpected = 0;
      let checkDate = new Date(memberCreatedDate.getFullYear(), memberCreatedDate.getMonth(), 1);
      const endDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
      
      // Count each month from member creation to current month (inclusive)
      while (checkDate <= endDate) {
        totalExpected += member.monthlyTarget || 0;
        checkDate.setMonth(checkDate.getMonth() + 1);
      }

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
    // Get all current members
    const membersSnapshot = await getDocs(
      collection(db, "users", userId, "members")
    );
    const currentMembers = membersSnapshot.docs.map((doc) => ({
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

    // Get ALL transactions for cumulative balance calculation
    const allTransactionsSnapshot = await getDocs(
      collection(db, "users", userId, "transactions")
    );
    const allTransactions = allTransactionsSnapshot.docs.map((doc) =>
      doc.data()
    );

    // Create a map of current members for quick lookup
    const membersMap = new Map();
    currentMembers.forEach(member => {
      membersMap.set(member.id, member);
    });

    // Find memberIds that appear in ANY transactions but don't exist as current members
    const virtualMembers = new Map();
    allTransactions.forEach(transaction => {
      if (!membersMap.has(transaction.memberId) && !virtualMembers.has(transaction.memberId)) {
        console.log(`Found virtual member: ${transaction.memberName} (${transaction.memberId})`);
        // Create a virtual member with default values
        virtualMembers.set(transaction.memberId, {
          id: transaction.memberId,
          name: transaction.memberName,
          monthlyTarget: 0, // Will be calculated based on transactions
          createdOn: null, // Unknown creation date
          isVirtual: true // Mark as virtual for special handling
        });
      }
    });

    console.log(`Processing ${currentMembers.length} current members and ${virtualMembers.size} virtual members for ${monthYear}`);

    // For virtual members, try to determine monthly target from historical patterns
    virtualMembers.forEach((virtualMember, memberId) => {
      // Look for transactions for this member to estimate monthly target
      const memberTransactions = allTransactions.filter(t => t.memberId === memberId);
      if (memberTransactions.length > 0) {
        // Try to infer monthly target from transaction patterns
        virtualMember.monthlyTarget = calculateMonthlyTargetFromTransactions(memberTransactions);
      }
    });

    // Combine current members with virtual members
    const allMembersToProcess = [...currentMembers, ...Array.from(virtualMembers.values())];

    const totalCollected = transactionsThisMonth
      .filter(t => t.type !== 'outstanding_cleared')
      .reduce((sum, t) => sum + t.amount, 0);

    let totalOutstanding = 0;
    let membersWithDues = [];

    for (const member of allMembersToProcess) {
      console.log(`Processing member: ${member.name} (${member.id}), isVirtual: ${member.isVirtual}, monthlyTarget: ${member.monthlyTarget}`);

      // Check if this member was created after the month we're calculating
      const memberCreatedDate = member.createdOn?.toDate() || new Date(0);
      const isHistoricalMember = memberCreatedDate > endDate;

      // For historical members (created after the month we're viewing), calculate target from transactions
      let effectiveMonthlyTarget = member.monthlyTarget;
      if (isHistoricalMember && !member.isVirtual) {
        console.log(`Member ${member.name} was created after ${monthYear}, calculating target from transactions`);
        const memberTransactions = allTransactions.filter(t => t.memberId === member.id);
        effectiveMonthlyTarget = calculateMonthlyTargetFromTransactions(memberTransactions);
        console.log(`Effective monthly target for ${member.name}: ${effectiveMonthlyTarget}`);
      }

      // Get all transactions before this month
      const previousTransactions = allTransactions.filter(
        (t) => t.memberId === member.id && t.date < `${monthYear}-01`
      );

      console.log(`Previous transactions for ${member.name}: ${previousTransactions.length}`);

      // Group by month
      const months = {};
      previousTransactions.forEach((t) => {
        const month = t.date.slice(0, 7);
        if (!months[month]) months[month] = { paid: 0 };
        months[month].paid += t.amount;
      });

      // Calculate cumulative balance from ALL previous months
      let previousBalanceDue = 0;
      Object.keys(months).forEach((month) => {
        previousBalanceDue += effectiveMonthlyTarget - months[month].paid;
      });

      console.log(`Previous balance due for ${member.name}: ${previousBalanceDue}`);

      // For virtual members, account for months with no transactions between first transaction and view month
      if (member.isVirtual) {
        const memberTransactions = allTransactions.filter(t => t.memberId === member.id);
        if (memberTransactions.length > 0) {
          // Find the earliest transaction date
          const earliestTransaction = memberTransactions
            .sort((a, b) => a.date.localeCompare(b.date))[0];
          const earliestDate = new Date(earliestTransaction.date + 'T00:00:00Z');

          let currentCheckDate = new Date(earliestDate.getFullYear(), earliestDate.getMonth(), 1);
          const viewMonthStart = new Date(startDate.getFullYear(), startDate.getMonth(), 1);

          while (currentCheckDate < viewMonthStart) {
            const monthKey = currentCheckDate.toISOString().slice(0, 7);
            if (!months[monthKey]) {
              // This month had no transactions, so they owe the full monthly target
              previousBalanceDue += effectiveMonthlyTarget;
              console.log(`Adding missing month ${monthKey} for virtual member ${member.name}: +${effectiveMonthlyTarget}`);
            }
            currentCheckDate.setMonth(currentCheckDate.getMonth() + 1);
          }
        }
      }

      const paidThisMonth = transactionsThisMonth
        .filter((t) => t.memberId === member.id)
        .reduce((sum, t) => sum + t.amount, 0);

      console.log(`Paid this month for ${member.name}: ${paidThisMonth}`);

      const finalBalance =
        effectiveMonthlyTarget + previousBalanceDue - paidThisMonth;

      console.log(`Final balance for ${member.name}: ${finalBalance}`);

      if (finalBalance > 0) {
        console.log(`Adding ${member.name} to membersWithDues with due: ${finalBalance}`);
        totalOutstanding += finalBalance;
        membersWithDues.push({
          memberId: member.id,
          memberName: member.name,
          rank: member.rank || 0,
          due: finalBalance,
          paidThisMonth,
          previousBalance: previousBalanceDue,
          isVirtual: member.isVirtual || false,
          isHistorical: isHistoricalMember,
        });
      }
    }

    // Sort by rank instead of due amount
    membersWithDues.sort((a, b) => (a.rank || 0) - (b.rank || 0));

    const totalTarget = allMembersToProcess.reduce((sum, m) => {
      // Check if this member was created after the month we're calculating
      const memberCreatedDate = m.createdOn?.toDate() || new Date(0);
      const isHistoricalMember = memberCreatedDate > endDate;
      
      // For historical members, use effective monthly target
      let effectiveTarget = m.monthlyTarget;
      if (isHistoricalMember && !m.isVirtual) {
        const memberTransactions = allTransactions.filter(t => t.memberId === m.id);
        effectiveTarget = calculateMonthlyTargetFromTransactions(memberTransactions);
      }
      
      return sum + effectiveTarget;
    }, 0);
    const collectionRate =
      totalTarget > 0 ? Math.round((totalCollected / totalTarget) * 100) : 0;

    // Save to Firebase
    const statsData = {
      monthYear,
      totalCollected,
      totalOutstanding,
      totalTarget,
      collectionRate,
      totalMembers: allMembersToProcess.length,
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

/**
 * Calculate monthly target for virtual members based on transaction patterns
 */
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
  // This is a heuristic - you might want to refine this logic
  const mostCommonAmount = amounts.sort((a,b) =>
    amounts.filter(v => v===a).length - amounts.filter(v => v===b).length
  ).pop();

  return mostCommonAmount || 0;
}
