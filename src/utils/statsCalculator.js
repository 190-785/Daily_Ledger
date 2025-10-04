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

    const paidMemberIds = new Set(todayTransactions.map((t) => t.memberId));
    const paidCount = paidMemberIds.size;
    const pendingCount = members.length - paidCount;

    // Sort members by rank
    members.sort((a, b) => (a.rank || 0) - (b.rank || 0));

    const paidMembers = members
      .filter((m) => paidMemberIds.has(m.id))
      .map((m) => ({
        memberId: m.id,
        memberName: m.name,
        rank: m.rank || 0,
        amount: todayTransactions
          .filter((t) => t.memberId === m.id)
          .reduce((sum, t) => sum + t.amount, 0),
      }));

    const pendingMembers = members
      .filter((m) => !paidMemberIds.has(m.id))
      .map((m) => ({
        memberId: m.id,
        memberName: m.name,
        rank: m.rank || 0,
      }));

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

    // Get this month's transactions
    const currentMonthQuery = query(
      collection(db, "users", userId, "transactions"),
      where("timestamp", ">=", startDate),
      where("timestamp", "<=", endDate)
    );
    const currentMonthSnapshot = await getDocs(currentMonthQuery);
    const transactionsThisMonth = currentMonthSnapshot.docs.map((doc) =>
      doc.data()
    );

    const totalCollected = transactionsThisMonth.reduce(
      (sum, t) => sum + t.amount,
      0
    );

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
        (t) => t.memberId === member.id && t.timestamp.toDate() < startDate
      );

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
        previousBalanceDue += member.monthlyTarget - months[month].paid;
      });

      // Add balance for months with no transactions
      const memberCreatedDate = member.createdOn?.toDate() || new Date(0);
      let currentCheckDate = new Date(memberCreatedDate);
      while (currentCheckDate < startDate) {
        const monthKey = currentCheckDate.toISOString().slice(0, 7);
        if (!months[monthKey] && currentCheckDate >= memberCreatedDate) {
          previousBalanceDue += member.monthlyTarget;
        }
        currentCheckDate.setMonth(currentCheckDate.getMonth() + 1);
      }

      const paidThisMonth = transactionsThisMonth
        .filter((t) => t.memberId === member.id)
        .reduce((sum, t) => sum + t.amount, 0);

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
