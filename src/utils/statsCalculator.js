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

    const totalCollected = todayTransactions
      .filter((t) => t.type !== "outstanding_cleared") // <-- ADD THIS LINE
      .reduce((sum, t) => sum + t.amount, 0);

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
        .filter(
          (t) => t.memberId === member.id && t.type !== "outstanding_cleared"
        ) // <-- UPDATE THIS LINE
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
      let checkDate = new Date(
        memberCreatedDate.getFullYear(),
        memberCreatedDate.getMonth(),
        1
      );
      const endDate = new Date(
        currentDate.getFullYear(),
        currentDate.getMonth(),
        1
      );

      // Count each month from member creation to current month (inclusive)
      while (checkDate <= endDate) {
        totalExpected += member.monthlyTarget || 0;
        checkDate.setMonth(checkDate.getMonth() + 1);
      }

      const outstandingBalance = totalExpected - totalPaidAllTime;

      // Debug log for troubleshooting
      if (outstandingBalance !== 0) {
        console.log(
          `Member: ${member.name}, Expected: ${totalExpected}, Paid: ${totalPaidAllTime}, Outstanding: ${outstandingBalance}`
        );
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

    await setDoc(doc(db, "users", userId, "daily_stats", date), statsData);

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
    const endDateStr = `${monthYear}-${endDate
      .getDate()
      .toString()
      .padStart(2, "0")}`;

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
    currentMembers.forEach((member) => {
      membersMap.set(member.id, member);
    });

    // Find memberIds that appear in ANY transactions but don't exist as current members
    const virtualMembers = new Map();
    allTransactions.forEach((transaction) => {
      if (
        !membersMap.has(transaction.memberId) &&
        !virtualMembers.has(transaction.memberId)
      ) {
        console.log(
          `Found virtual member: ${transaction.memberName} (${transaction.memberId})`
        );
        // Create a virtual member with default values
        virtualMembers.set(transaction.memberId, {
          id: transaction.memberId,
          name: transaction.memberName,
          monthlyTarget: 0, // Will be calculated based on transactions
          createdOn: null, // Unknown creation date
          isVirtual: true, // Mark as virtual for special handling
        });
      }
    });

    console.log(
      `Processing ${currentMembers.length} current members and ${virtualMembers.size} virtual members for ${monthYear}`
    );

    // Combine current members with virtual members
    const allMembersToProcess = [
      ...currentMembers,
      ...Array.from(virtualMembers.values()),
    ];

    const totalCollected = transactionsThisMonth
      .filter((t) => t.type !== "outstanding_cleared")
      .reduce((sum, t) => sum + t.amount, 0);

    let totalOutstanding = 0;
    let membersWithDues = [];

    // --- START: Group all previous transactions by member and month for efficiency ---
    const previousTransactions = allTransactions.filter(
      (t) => t.date < `${monthYear}-01`
    );
    const previousMonthsMap = new Map(); // <memberId, Map<monthKey, paidAmount>>
    previousTransactions.forEach((t) => {
      if (!previousMonthsMap.has(t.memberId)) {
        previousMonthsMap.set(t.memberId, new Map());
      }
      const memberMonths = previousMonthsMap.get(t.memberId);
      const monthKey = t.date.slice(0, 7);
      memberMonths.set(monthKey, (memberMonths.get(monthKey) || 0) + t.amount);
    });

    // Find earliest transaction for all members
    const earliestTransactionMap = new Map(); // <memberId, Date>
    allTransactions.forEach((t) => {
      const earliest = earliestTransactionMap.get(t.memberId);
      // Ensure date is parsed correctly, assuming YYYY-MM-DD
      const tDate = new Date(t.date + "T00:00:00Z");
      if (!earliest || tDate < earliest) {
        earliestTransactionMap.set(t.memberId, tDate);
      }
    });
    // --- END: Grouping ---

    for (const member of allMembersToProcess) {
      // Use a mutable copy if virtual so we can update its target
      let currentMember = { ...member };
      console.log(
        `Processing member: ${currentMember.name} (${currentMember.id}), isVirtual: ${currentMember.isVirtual}, monthlyTarget: ${currentMember.monthlyTarget}`
      );

      const memberCreatedDate = currentMember.createdOn?.toDate() || null;
      const isHistoricalMember =
        memberCreatedDate && memberCreatedDate > endDate;

      let effectiveMonthlyTarget = currentMember.monthlyTarget || 0;

      // For virtual members, try to determine monthly target
      if (currentMember.isVirtual) {
        const memberTransactions = allTransactions.filter(
          (t) => t.memberId === currentMember.id
        );
        if (memberTransactions.length > 0) {
          effectiveMonthlyTarget =
            calculateMonthlyTargetFromTransactions(memberTransactions);
          currentMember.monthlyTarget = effectiveMonthlyTarget; // Save it for totalTarget calc
        }
      }

      // --- START: REVISED PREVIOUS BALANCE CALCULATION ---
      let previousBalanceDue = 0;

      const memberMonths = previousMonthsMap.get(currentMember.id) || new Map();

      // Determine the first month to start charging them
      const earliestTransactionDate = earliestTransactionMap.get(
        currentMember.id
      );

      let calculationStartDate = null;

      if (memberCreatedDate) {
        // Member exists, use their creation date
        calculationStartDate = new Date(
          memberCreatedDate.getFullYear(),
          memberCreatedDate.getMonth(),
          1
        );
      } else if (earliestTransactionDate) {
        // Virtual member, use their first transaction's month
        calculationStartDate = new Date(
          earliestTransactionDate.getFullYear(),
          earliestTransactionDate.getMonth(),
          1
        );
      }

      // Get the start of the month we are viewing
      const viewMonthStart = new Date(
        startDate.getFullYear(),
        startDate.getMonth(),
        1
      );

      if (calculationStartDate && calculationStartDate < viewMonthStart) {
        let checkDate = calculationStartDate;

        // Loop from their start month up to (but not including) the month we are viewing
        while (checkDate < viewMonthStart) {
          const monthKey = checkDate.toISOString().slice(0, 7);
          const paidThisMonth = memberMonths.get(monthKey) || 0;

          previousBalanceDue += effectiveMonthlyTarget - paidThisMonth;

          console.log(
            `Adding balance for ${
              currentMember.name
            } for ${monthKey}: ${effectiveMonthlyTarget} - ${paidThisMonth} = ${
              effectiveMonthlyTarget - paidThisMonth
            }. New prevBalance: ${previousBalanceDue}`
          );

          checkDate.setMonth(checkDate.getMonth() + 1);
        }
      } else {
        console.log(
          `Skipping previous balance for ${currentMember.name}, no valid start date found before ${monthYear}.`
        );
      }

      console.log(
        `Previous balance due for ${currentMember.name}: ${previousBalanceDue}`
      );
      // --- END: REVISED PREVIOUS BALANCE CALCULATION ---

      const paidThisMonth = transactionsThisMonth
        .filter(
          (t) => t.memberId === member.id && t.type !== "outstanding_cleared"
        ) // <-- UPDATE THIS LINE
        .reduce((sum, t) => sum + t.amount, 0);
      console.log(
        `Paid this month for ${currentMember.name}: ${paidThisMonth}`
      );

      // This is the key: Target for *this* month + all previous balance - paid *this* month
      const finalBalance =
        effectiveMonthlyTarget + previousBalanceDue - paidThisMonth;

      console.log(`Final balance for ${currentMember.name}: ${finalBalance}`);

      if (finalBalance > 0) {
        console.log(
          `Adding ${currentMember.name} to membersWithDues with due: ${finalBalance}`
        );
        totalOutstanding += finalBalance;
        membersWithDues.push({
          memberId: currentMember.id,
          memberName: currentMember.name,
          rank: currentMember.rank || 0,
          due: finalBalance,
          paidThisMonth,
          previousBalance: previousBalanceDue,
          isVirtual: currentMember.isVirtual || false,
          isHistorical: isHistoricalMember,
        });
      }
    }

    // Sort by rank instead of due amount
    membersWithDues.sort((a, b) => (a.rank || 0) - (b.rank || 0));

    // --- START: REVISED TOTAL TARGET CALCULATION ---
    const totalTarget = allMembersToProcess.reduce((sum, m) => {
      const memberCreatedDate = m.createdOn?.toDate() || null;

      // Determine if member should be included in this month's target
      let includeInTarget = false;
      if (memberCreatedDate) {
        // Real member: include if created before or during this month
        const memberStartMonth = new Date(
          memberCreatedDate.getFullYear(),
          memberCreatedDate.getMonth(),
          1
        );
        if (memberStartMonth <= endDate) {
          // endDate is last day of viewed month
          includeInTarget = true;
        }
      } else {
        // Virtual member: include if they had *any* transaction (ever)
        // and we estimated a target for them.
        if (m.isVirtual && (m.monthlyTarget || 0) > 0) {
          // More precise: check if their first transaction was before/during this month
          const firstTransDate = earliestTransactionMap.get(m.id);
          if (firstTransDate && firstTransDate <= endDate) {
            includeInTarget = true;
          }
        }
      }

      if (includeInTarget) {
        // We use m.monthlyTarget, which was updated for virtual members in the loop above
        return sum + (m.monthlyTarget || 0);
      }

      return sum;
    }, 0);
    // --- END: REVISED TOTAL TARGET CALCULATION ---

    const collectionRate =
      totalTarget > 0 ? Math.round((totalCollected / totalTarget) * 100) : 0;

    // Save to Firebase
    const statsData = {
      monthYear,
      totalCollected,
      totalOutstanding,
      totalTarget,
      collectionRate,
      totalMembers: currentMembers.length, // Only count current, non-virtual members
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
  const sortedTransactions = memberTransactions.sort((a, b) =>
    a.date.localeCompare(b.date)
  );

  // Group transactions by month
  const monthlyTotals = {};
  sortedTransactions.forEach((transaction) => {
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
  const mostCommonAmount = amounts
    .sort(
      (a, b) =>
        amounts.filter((v) => v === a).length -
        amounts.filter((v) => v === b).length
    )
    .pop();

  return mostCommonAmount || 0;
}
