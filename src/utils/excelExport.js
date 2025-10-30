import * as XLSX from 'xlsx';

/**
 * Exports monthly ledger data to an Excel file
 * @param {Object} params - Export parameters
 * @param {Array} params.members - Array of member objects
 * @param {Array} params.transactions - All transactions for the selected month
 * @param {string} params.monthYear - Month in YYYY-MM format
 * @param {string} params.listName - Optional list name for the file
 */
export const exportMonthlyToExcel = ({ members, transactions, monthYear, listName = 'Daily Ledger' }) => {
  // Parse month and year
  const [year, month] = monthYear.split('-');
  const monthDate = new Date(parseInt(year), parseInt(month) - 1, 1);
  const daysInMonth = new Date(parseInt(year), parseInt(month), 0).getDate();
  
  // Get month name for display
  const monthName = monthDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  
  // Create array of all dates in the month
  const dates = [];
  for (let day = 1; day <= daysInMonth; day++) {
    const date = `${year}-${month}-${String(day).padStart(2, '0')}`;
    dates.push(date);
  }
  
// Build transaction map: memberId -> date -> amount
  const transactionMap = {};
  transactions.forEach(t => {
    // FIX: Ignore transactions that are only for clearing outstanding balances
    if (t.type === 'outstanding_cleared') {
      return;
    }

    if (!transactionMap[t.memberId]) {
      transactionMap[t.memberId] = {};
    }
    transactionMap[t.memberId][t.date] = (transactionMap[t.memberId][t.date] || 0) + t.amount;
  });
  
  // Calculate daily totals
  const dailyStats = {};
  dates.forEach(date => {
    let totalPaid = 0;
    let paidCount = 0;
    let notPaidCount = 0;
    
    members.forEach(member => {
      const amount = transactionMap[member.id]?.[date] || 0;
      if (amount > 0) {
        totalPaid += amount;
        paidCount++;
      } else {
        notPaidCount++;
      }
    });
    
    dailyStats[date] = {
      totalPaid,
      paidCount,
      notPaidCount
    };
  });
  
  // Calculate monthly totals for each member
  const memberMonthlyTotals = {};
  members.forEach(member => {
    let total = 0;
    dates.forEach(date => {
      total += transactionMap[member.id]?.[date] || 0;
    });
    memberMonthlyTotals[member.id] = total;
  });
  
  // Build Excel data structure
  const data = [];
  
  // Header row 1: Month name spanning across
  const titleRow = ['Member Name', ...dates.map(d => {
    const day = new Date(d).getDate();
    return day;
  }), 'Monthly Total', 'Monthly Target', 'Balance'];
  data.push(titleRow);
  
  // Member rows
  members.forEach(member => {
    const row = [member.name];
    
    // Daily amounts
    dates.forEach(date => {
      const amount = transactionMap[member.id]?.[date] || 0;
      row.push(amount > 0 ? amount : '');
    });
    
    // Monthly total
    const monthlyTotal = memberMonthlyTotals[member.id];
    row.push(monthlyTotal);
    
    // Monthly target
    const target = member.monthlyTarget || 0;
    row.push(target);
    
    // Balance (negative = due, positive = credit)
    const balance = monthlyTotal - target;
    row.push(balance);
    
    data.push(row);
  });
  
  // Empty row separator
  data.push([]);
  
  // Daily statistics header
  data.push(['Daily Statistics', ...dates.map(() => ''), '', '', '']);
  
  // Total Paid row
  const totalPaidRow = ['Total Paid'];
  dates.forEach(date => {
    totalPaidRow.push(dailyStats[date].totalPaid);
  });
  // Add overall monthly total
  const overallMonthlyTotal = Object.values(memberMonthlyTotals).reduce((sum, val) => sum + val, 0);
  totalPaidRow.push(overallMonthlyTotal);
  totalPaidRow.push('');
  totalPaidRow.push('');
  data.push(totalPaidRow);
  
  // Paid Count row
  const paidCountRow = ['Members Paid'];
  dates.forEach(date => {
    paidCountRow.push(dailyStats[date].paidCount);
  });
  paidCountRow.push('');
  paidCountRow.push('');
  paidCountRow.push('');
  data.push(paidCountRow);
  
  // Didn't Pay Count row
  const notPaidCountRow = ['Members Didn\'t Pay'];
  dates.forEach(date => {
    notPaidCountRow.push(dailyStats[date].notPaidCount);
  });
  notPaidCountRow.push('');
  notPaidCountRow.push('');
  notPaidCountRow.push('');
  data.push(notPaidCountRow);
  
  // Empty row separator
  data.push([]);
  
  // Monthly Summary
  data.push(['MONTHLY SUMMARY']);
  data.push(['Total Members', members.length]);
  data.push(['Total Collected', overallMonthlyTotal]);
  
  const totalTarget = members.reduce((sum, m) => sum + (m.monthlyTarget || 0), 0);
  data.push(['Total Target', totalTarget]);
  data.push(['Overall Balance', overallMonthlyTotal - totalTarget]);
  
  // Calculate average daily collection
  const avgDaily = overallMonthlyTotal / daysInMonth;
  data.push(['Average Daily Collection', Math.round(avgDaily)]);
  
  // Calculate how many members are in credit/due
  let membersInCredit = 0;
  let membersInDue = 0;
  members.forEach(member => {
    const balance = memberMonthlyTotals[member.id] - (member.monthlyTarget || 0);
    if (balance >= 0) membersInCredit++;
    else membersInDue++;
  });
  data.push(['Members Paid Full/Excess', membersInCredit]);
  data.push(['Members with Balance Due', membersInDue]);
  
  // Create worksheet
  const ws = XLSX.utils.aoa_to_sheet(data);
  
  // Set column widths
  const colWidths = [{ wch: 20 }]; // Member name column
  dates.forEach(() => colWidths.push({ wch: 10 })); // Date columns
  colWidths.push({ wch: 15 }); // Monthly Total
  colWidths.push({ wch: 15 }); // Monthly Target
  colWidths.push({ wch: 12 }); // Balance
  ws['!cols'] = colWidths;
  
  // Create workbook
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, monthName);
  
  // Generate filename
  const filename = `${listName}_${monthName.replace(' ', '_')}.xlsx`;
  
  // Download file
  XLSX.writeFile(wb, filename);
};

/**
 * Exports a single member's monthly data to Excel
 * @param {Object} params - Export parameters
 * @param {Object} params.member - Member object
 * @param {Array} params.transactions - Transactions for the selected month
 * @param {Array} params.allTransactions - All transactions for the member
 * @param {string} params.monthYear - Month in YYYY-MM format
 */
export const exportMemberMonthlyToExcel = ({ member, transactions, allTransactions, monthYear }) => {
  // Parse month and year
  const [year, month] = monthYear.split('-');
  const monthDate = new Date(parseInt(year), parseInt(month) - 1, 1);
  const daysInMonth = new Date(parseInt(year), parseInt(month), 0).getDate();
  
  // Get month name for display
  const monthName = monthDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  
  // Build data array
  const data = [];
  
  // Title
  data.push([`Monthly Statement - ${member.name}`]);
  data.push([monthName]);
  data.push([]);
  
  // Header
  data.push(['Date', 'Day', 'Amount', 'Status']);
  
// Build transaction map by date
  const transactionMap = {};
  let monthlyTotal = 0;
  
  transactions.forEach(t => {
    // FIX: Ignore transactions that are only for clearing outstanding balances
    if (t.type === 'outstanding_cleared') {
      return;
    }

    if (!transactionMap[t.date]) {
      transactionMap[t.date] = 0;
    }
    transactionMap[t.date] += t.amount;
    monthlyTotal += t.amount;
  });
  
  // Add daily rows
  for (let day = 1; day <= daysInMonth; day++) {
    const date = `${year}-${month}-${String(day).padStart(2, '0')}`;
    const dateObj = new Date(date);
    const dayName = dateObj.toLocaleDateString('en-US', { weekday: 'short' });
    const amount = transactionMap[date] || 0;
    const status = amount > 0 ? 'Paid' : '-';
    
    data.push([
      date,
      dayName,
      amount > 0 ? amount : '',
      status
    ]);
  }
  
  // Summary section
  data.push([]);
  data.push(['MONTHLY SUMMARY']);
  data.push(['Total Paid This Month', monthlyTotal]);
  data.push(['Monthly Target', member.monthlyTarget || 0]);
  
  const monthlyBalance = monthlyTotal - (member.monthlyTarget || 0);
  data.push(['Monthly Balance', monthlyBalance]);
  
  // Calculate cumulative balance
  const totalPaidAllTime = allTransactions.reduce((sum, t) => sum + t.amount, 0);
  
  // Calculate total expected from member creation to end of selected month
  const memberCreatedDate = member.createdOn?.toDate() || new Date(0);
  const endOfSelectedMonth = new Date(parseInt(year), parseInt(month), 0);
  
  let totalExpected = 0;
  let checkDate = new Date(memberCreatedDate.getFullYear(), memberCreatedDate.getMonth(), 1);
  while (checkDate <= endOfSelectedMonth) {
    totalExpected += member.monthlyTarget || 0;
    checkDate.setMonth(checkDate.getMonth() + 1);
  }
  
  const cumulativeBalance = totalPaidAllTime - totalExpected;
  data.push(['Cumulative Balance (All Time)', cumulativeBalance]);
  data.push(['Status', cumulativeBalance >= 0 ? 'Paid Full/Credit' : 'Balance Due']);
  
  // Payment statistics
  const daysWithPayment = Object.keys(transactionMap).length;
  const totalDays = daysInMonth;
  data.push([]);
  data.push(['Payment Statistics']);
  data.push(['Days with Payment', daysWithPayment]);
  data.push(['Days without Payment', totalDays - daysWithPayment]);
  data.push(['Payment Rate', `${Math.round((daysWithPayment / totalDays) * 100)}%`]);
  
  if (monthlyTotal > 0) {
    const avgPerPaymentDay = monthlyTotal / daysWithPayment;
    data.push(['Average per Payment Day', Math.round(avgPerPaymentDay)]);
  }
  
  // Create worksheet
  const ws = XLSX.utils.aoa_to_sheet(data);
  
  // Set column widths
  ws['!cols'] = [
    { wch: 12 }, // Date
    { wch: 10 }, // Day
    { wch: 12 }, // Amount
    { wch: 15 }  // Status
  ];
  
  // Create workbook
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, monthName);
  
  // Generate filename
  const filename = `${member.name.replace(/\s+/g, '_')}_${monthName.replace(' ', '_')}.xlsx`;
  
  // Download file
  XLSX.writeFile(wb, filename);
};
