import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { doc, getDoc, collection, query, where, getDocs, orderBy as firestoreOrderBy } from 'firebase/firestore';
import { db } from '../firebase';

export default function SharedListViewPage({ userId }) {
  const { listId } = useParams();
  const navigate = useNavigate();
  const [sharedList, setSharedList] = useState(null);
  const [members, setMembers] = useState([]);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [dailyData, setDailyData] = useState([]);
  const [monthlyData, setMonthlyData] = useState(null);
  const [activeTab, setActiveTab] = useState('daily');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showPaidList, setShowPaidList] = useState(false);
  const [showUnpaidList, setShowUnpaidList] = useState(false);

  // Fetch shared list data
  useEffect(() => {
    const fetchSharedList = async () => {
      try {
        setLoading(true);
        setError('');

        // Get shared list document from current user's sharedLists collection
        const sharedListRef = doc(db, 'users', userId, 'sharedLists', listId);
        const sharedListSnap = await getDoc(sharedListRef);

        if (!sharedListSnap.exists()) {
          setError('Shared list not found or access has been revoked.');
          return;
        }

        const sharedListData = { id: sharedListSnap.id, ...sharedListSnap.data() };
        console.log('Shared list data:', sharedListData);
        setSharedList(sharedListData);

        // Set default active tab based on allowed views
        const allowedViews = sharedListData.shareSettings?.allowedViews || [];
        if (allowedViews.length === 1) {
          setActiveTab(allowedViews[0]);
        }

        // Fetch members from owner's collection
        // Support both ownerUserId and ownerId for backwards compatibility
        const ownerId = sharedListData.ownerUserId || sharedListData.ownerId;
        const memberIds = sharedListData.memberIds || [];
        
        console.log('Owner ID:', ownerId);
        console.log('Member IDs:', memberIds);
        
        if (!ownerId) {
          console.error('No owner ID found in shared list data');
          setError('Invalid shared list configuration - missing owner ID');
          return;
        }

        if (memberIds.length === 0) {
          console.warn('No member IDs found in shared list');
          setMembers([]);
          return;
        }

        // Fetch members from the owner's collection
        try {
          const membersRef = collection(db, 'users', ownerId, 'members');
          const membersQuery = query(membersRef, firestoreOrderBy('rank', 'asc'));
          const membersSnap = await getDocs(membersQuery);
          
          console.log('Total members fetched from owner:', membersSnap.size);
          
          if (membersSnap.empty) {
            console.warn('Owner has no members in their collection');
            setMembers([]);
            return;
          }
          
          const allMembers = [];
          membersSnap.forEach((doc) => {
            if (memberIds.includes(doc.id)) {
              allMembers.push({ id: doc.id, ...doc.data() });
            }
          });
          
          console.log('Filtered members for this list:', allMembers);
          
          if (allMembers.length === 0) {
            console.warn('None of the member IDs matched actual members in owner collection');
            console.warn('Expected member IDs:', memberIds);
            console.warn('Available member IDs:', membersSnap.docs.map(d => d.id));
          }
          
          setMembers(allMembers);
        } catch (memberError) {
          console.error('Error fetching members:', memberError);
          console.error('Error code:', memberError.code);
          console.error('Error message:', memberError.message);
          
          if (memberError.code === 'permission-denied') {
            setError('You do not have permission to view the members of this list. The list owner may need to update their sharing settings.');
          } else {
            setError('Failed to load members. Please try again.');
          }
        }

      } catch (err) {
        console.error('Error fetching shared list:', err);
        console.error('Error code:', err.code);
        console.error('Error message:', err.message);
        
        if (err.code === 'permission-denied') {
          setError('Access denied. This list may have been unshared or you do not have permission.');
        } else {
          setError('Failed to load shared list. Please try again.');
        }
      } finally {
        setLoading(false);
      }
    };

    fetchSharedList();
  }, [userId, listId]);

  // Fetch daily data when date changes
  useEffect(() => {
    if (!sharedList || members.length === 0) return;
    
    const fetchDailyData = async () => {
      try {
        const ownerId = sharedList.ownerUserId || sharedList.ownerId;
        const memberDataMap = [];

        for (const member of members) {
          const transactionsRef = collection(db, 'users', ownerId, 'transactions');
          const transactionsQuery = query(
            transactionsRef,
            where('memberId', '==', member.id),
            where('date', '==', selectedDate),
            firestoreOrderBy('timestamp', 'desc')
          );
          
          const transactionsSnap = await getDocs(transactionsQuery);
          let memberTotal = 0;
          const memberTransactions = [];
          
          transactionsSnap.forEach((doc) => {
            const transData = { id: doc.id, ...doc.data() };
            memberTransactions.push(transData);
            memberTotal += transData.amount || 0;
          });

          memberDataMap.push({
            member,
            transactions: memberTransactions,
            total: memberTotal,
            hasPaid: memberTotal > 0
          });
        }

        console.log('Daily transactions fetched:', memberDataMap);
        setDailyData(memberDataMap);
      } catch (err) {
        console.error('Error fetching daily data:', err);
        console.error('Error code:', err.code);
      }
    };

    if (activeTab === 'daily') {
      fetchDailyData();
    }
  }, [sharedList, members, selectedDate, activeTab]);

  // Fetch monthly data
  useEffect(() => {
    if (!sharedList || members.length === 0 || activeTab !== 'monthly') return;

    const fetchMonthlyData = async () => {
      try {
        const ownerId = sharedList.ownerUserId || sharedList.ownerId;
        const monthlyStats = [];

        // Get year and month from selectedDate
        const [year, month] = selectedDate.split('-');
        const monthKey = `${year}-${month}`;

        for (const member of members) {
          const statsRef = doc(db, 'users', ownerId, 'monthly_stats', `${member.id}_${monthKey}`);
          const statsSnap = await getDoc(statsRef);
          
          if (statsSnap.exists()) {
            monthlyStats.push({
              memberId: member.id,
              memberName: member.name,
              ...statsSnap.data()
            });
          } else {
            // Include member even if no stats exist
            monthlyStats.push({
              memberId: member.id,
              memberName: member.name,
              totalCredit: 0,
              totalDebit: 0,
              transactionCount: 0
            });
          }
        }

        console.log('Monthly stats fetched:', monthlyStats.length);
        setMonthlyData(monthlyStats);
      } catch (err) {
        console.error('Error fetching monthly data:', err);
        console.error('Error code:', err.code);
      }
    };

    fetchMonthlyData();
  }, [sharedList, members, selectedDate, activeTab]);

  // Determine allowed date based on share type
  const getAllowedDate = () => {
    if (!sharedList) return new Date().toISOString().split('T')[0];

    const shareType = sharedList.shareSettings?.type;

    switch (shareType) {
      case 'currentDay':
        return new Date().toISOString().split('T')[0];
      
      case 'lastMonth': {
        const now = new Date();
        const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        return lastMonth.toISOString().split('T')[0];
      }
      
      case 'customDay':
        return sharedList.shareSettings?.customDay || selectedDate;
      
      case 'customMonth': {
        const customMonth = sharedList.shareSettings?.customMonth;
        if (customMonth) {
          return `${customMonth}-01`;
        }
        return selectedDate;
      }
      
      case 'dynamic':
      default:
        return selectedDate;
    }
  };

  const handleDateChange = (newDate) => {
    const shareType = sharedList?.shareSettings?.type;
    if (shareType === 'dynamic') {
      setSelectedDate(newDate);
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
    }).format(amount);
  };

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto p-6">
        <div className="flex justify-center items-center h-64">
          <div className="text-xl font-semibold text-gray-600">Loading shared list...</div>
        </div>
      </div>
    );
  }

  if (error || !sharedList) {
    return (
      <div className="max-w-6xl mx-auto p-6">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6">
          <div className="text-red-700 font-semibold mb-2">Error</div>
          <p className="text-red-600 mb-4">{error || 'Failed to load shared list.'}</p>
          <button
            onClick={() => navigate('/lists')}
            className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
          >
            Back to Lists
          </button>
        </div>
      </div>
    );
  }

  const allowedViews = sharedList.shareSettings?.allowedViews || [];
  const shareType = sharedList.shareSettings?.type;
  const isDynamic = shareType === 'dynamic';
  const isCurrentDay = shareType === 'currentDay';
  const isLastMonth = shareType === 'lastMonth';
  const isCustomDay = shareType === 'customDay';
  const isCustomMonth = shareType === 'customMonth';

  const shareTypeInfo = {
    dynamic: { label: '🔄 Dynamic', desc: 'Full access with date selection' },
    lastMonth: { label: '📅 Last Month', desc: 'Fixed to previous month' },
    currentDay: { label: '📍 Current Day', desc: 'Live view of today only' },
    customDay: { label: '📆 Custom Day', desc: 'Fixed to specific date' },
    customMonth: { label: '📊 Custom Month', desc: 'Fixed to specific month' }
  };

  return (
    <div className="max-w-6xl mx-auto p-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg shadow-lg p-6 mb-6">
        <button
          onClick={() => navigate('/lists')}
          className="text-white/80 hover:text-white mb-3 flex items-center gap-2"
        >
          ← Back to Lists
        </button>
        <h1 className="text-3xl font-bold mb-2">{sharedList.name}</h1>
        {sharedList.description && (
          <p className="text-blue-100 mb-3">{sharedList.description}</p>
        )}
        <div className="flex flex-wrap gap-3 text-sm">
          <div className="bg-white/20 rounded-full px-3 py-1">
            👤 Shared by @{sharedList.ownerUsername || 'Unknown'}
          </div>
          <div className="bg-white/20 rounded-full px-3 py-1">
            {shareTypeInfo[shareType]?.label || shareType}
          </div>
          <div className="bg-white/20 rounded-full px-3 py-1">
            👥 {members.length} member{members.length !== 1 ? 's' : ''}
          </div>
        </div>
        {!isDynamic && (
          <div className="mt-3 text-sm text-blue-100">
            ℹ️ {shareTypeInfo[shareType]?.desc}
          </div>
        )}
      </div>

      {/* No Members Warning */}
      {members.length === 0 && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
          <div className="flex items-center gap-2 text-yellow-700">
            <span className="text-2xl">⚠️</span>
            <div>
              <div className="font-medium">No Members Found</div>
              <div className="text-sm text-yellow-600 mt-1">
                This list has no members or the members couldn't be loaded. The list owner may need to add members or update sharing permissions.
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Date Selector (only for dynamic) */}
      {isDynamic && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            📅 Select Date
          </label>
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => handleDateChange(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg w-full sm:w-auto"
          />
        </div>
      )}

      {/* Fixed Date Display (for non-dynamic shares) */}
      {!isDynamic && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
          <div className="flex items-center gap-2 text-blue-700">
            <span className="font-medium">📅 Viewing:</span>
            <span>
              {isCurrentDay && 'Today'}
              {isLastMonth && 'Last Month'}
              {isCustomDay && 'Custom Date'}
              {isCustomMonth && 'Custom Month'}
              {' '}({getAllowedDate()})
            </span>
          </div>
        </div>
      )}



      {/* Content */}
      {members.length > 0 && allowedViews.includes(activeTab) ? (
        <>
          {/* Daily View */}
          {activeTab === 'daily' && (
            <>
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
                <h2 className="text-xl font-bold text-gray-800 mb-4">
                  Daily Transactions - {new Date(getAllowedDate()).toLocaleDateString('en-US', { 
                    weekday: 'long', 
                    year: 'numeric', 
                    month: 'long', 
                    day: 'numeric' 
                  })}
                </h2>

                {dailyData.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <div className="text-4xl mb-3">📭</div>
                    <p>No members found in this list</p>
                  </div>
                ) : dailyData.every(item => !item.hasPaid) ? (
                  <div className="text-center py-8 text-gray-500">
                    <div className="text-4xl mb-3">💤</div>
                    <p>No transactions found for this date</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {dailyData.filter(item => item.hasPaid).map((item) => (
                      <div
                        key={item.member.id}
                        className="p-4 rounded-lg border bg-green-50 border-green-200"
                      >
                        <div className="flex justify-between items-start mb-2">
                          <div>
                            <div className="font-medium text-gray-900 text-lg">
                              {item.member.name}
                            </div>
                            <div className="text-sm text-gray-600 mt-1">
                              {item.transactions.length} transaction{item.transactions.length !== 1 ? 's' : ''}
                            </div>
                          </div>
                          <div className="text-lg font-bold text-green-700">
                            {formatCurrency(item.total)}
                          </div>
                        </div>
                        
                        {/* Transaction details */}
                        <div className="mt-3 space-y-2 pl-4 border-l-2 border-green-300">
                          {item.transactions.map((trans) => (
                            <div key={trans.id} className="text-sm text-gray-700 flex justify-between items-center">
                              <div>
                                <span className="font-medium">{formatCurrency(trans.amount)}</span>
                                {trans.description && (
                                  <span className="text-gray-500 ml-2">- {trans.description}</span>
                                )}
                              </div>
                              <div className="text-xs text-gray-500">
                                {new Date(trans.timestamp?.toDate()).toLocaleTimeString()}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Statistics Section */}
              <div className="bg-gradient-to-br from-blue-50 to-purple-50 rounded-lg shadow-sm border-2 border-blue-200 p-6">
                <div className="flex items-center gap-2 mb-4">
                  <span className="text-2xl">📊</span>
                  <h3 className="text-xl font-bold text-gray-800">Statistics</h3>
                </div>

                {/* Summary Cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                  <div className="bg-white rounded-lg p-4 shadow-sm border border-gray-200">
                    <div className="text-sm text-gray-600 mb-1">Total Collected</div>
                    <div className="text-2xl font-bold text-green-600">
                      {formatCurrency(dailyData.reduce((sum, item) => sum + item.total, 0))}
                    </div>
                  </div>
                  
                  <div className="bg-white rounded-lg p-4 shadow-sm border border-gray-200">
                    <div className="text-sm text-gray-600 mb-1">Members Paid</div>
                    <div className="text-2xl font-bold text-blue-600">
                      {dailyData.filter(item => item.hasPaid).length} / {members.length}
                    </div>
                  </div>
                  
                  <div className="bg-white rounded-lg p-4 shadow-sm border border-gray-200">
                    <div className="text-sm text-gray-600 mb-1">Members Unpaid</div>
                    <div className="text-2xl font-bold text-orange-600">
                      {dailyData.filter(item => !item.hasPaid).length} / {members.length}
                    </div>
                  </div>
                </div>

                {/* Collapsible Paid Members List */}
                {dailyData.filter(item => item.hasPaid).length > 0 && (
                  <div className="mb-4">
                    <button
                      onClick={() => setShowPaidList(!showPaidList)}
                      className="w-full flex items-center justify-between bg-white rounded-lg p-4 shadow-sm border border-green-200 hover:bg-green-50 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <span className="text-xl">✅</span>
                        <span className="font-semibold text-gray-800">
                          Members Who Paid ({dailyData.filter(item => item.hasPaid).length})
                        </span>
                      </div>
                      <svg
                        className={`w-5 h-5 text-gray-600 transition-transform ${
                          showPaidList ? 'transform rotate-180' : ''
                        }`}
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </button>
                    
                    {showPaidList && (
                      <div className="mt-2 bg-white rounded-lg border border-green-200 divide-y divide-gray-100">
                        {dailyData.filter(item => item.hasPaid).map((item) => (
                          <div key={item.member.id} className="p-3 flex justify-between items-center hover:bg-green-50">
                            <div className="flex items-center gap-2">
                              <span className="text-green-500">●</span>
                              <span className="font-medium text-gray-700">{item.member.name}</span>
                            </div>
                            <span className="font-semibold text-green-700">
                              {formatCurrency(item.total)}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* Collapsible Unpaid Members List */}
                {dailyData.filter(item => !item.hasPaid).length > 0 && (
                  <div>
                    <button
                      onClick={() => setShowUnpaidList(!showUnpaidList)}
                      className="w-full flex items-center justify-between bg-white rounded-lg p-4 shadow-sm border border-orange-200 hover:bg-orange-50 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <span className="text-xl">⏳</span>
                        <span className="font-semibold text-gray-800">
                          Members Who Didn't Pay ({dailyData.filter(item => !item.hasPaid).length})
                        </span>
                      </div>
                      <svg
                        className={`w-5 h-5 text-gray-600 transition-transform ${
                          showUnpaidList ? 'transform rotate-180' : ''
                        }`}
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </button>
                    
                    {showUnpaidList && (
                      <div className="mt-2 bg-white rounded-lg border border-orange-200 divide-y divide-gray-100">
                        {dailyData.filter(item => !item.hasPaid).map((item) => (
                          <div key={item.member.id} className="p-3 flex items-center gap-2 hover:bg-orange-50">
                            <span className="text-orange-500">●</span>
                            <span className="font-medium text-gray-700">{item.member.name}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </>
          )}

          {/* Monthly View */}
          {activeTab === 'monthly' && (
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h2 className="text-xl font-bold text-gray-800 mb-4">
                Monthly Statistics - {new Date(getAllowedDate()).toLocaleDateString('en-US', { 
                  year: 'numeric', 
                  month: 'long'
                })}
              </h2>

              {!monthlyData || monthlyData.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <div className="text-4xl mb-3">📊</div>
                  <p>No monthly data available</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {monthlyData.map((stat) => (
                    <div
                      key={stat.memberId}
                      className="border border-gray-200 rounded-lg p-4"
                    >
                      <h3 className="font-bold text-lg text-gray-900 mb-3">
                        {stat.memberName}
                      </h3>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div className="bg-green-50 p-3 rounded">
                          <div className="text-sm text-gray-600">Total Credit</div>
                          <div className="text-lg font-bold text-green-700">
                            {formatCurrency(stat.totalCredit || 0)}
                          </div>
                        </div>
                        <div className="bg-red-50 p-3 rounded">
                          <div className="text-sm text-gray-600">Total Debit</div>
                          <div className="text-lg font-bold text-red-700">
                            {formatCurrency(stat.totalDebit || 0)}
                          </div>
                        </div>
                        <div className="bg-blue-50 p-3 rounded">
                          <div className="text-sm text-gray-600">Net Balance</div>
                          <div className={`text-lg font-bold ${
                            (stat.totalCredit || 0) - (stat.totalDebit || 0) >= 0
                              ? 'text-blue-700'
                              : 'text-red-700'
                          }`}>
                            {formatCurrency((stat.totalCredit || 0) - (stat.totalDebit || 0))}
                          </div>
                        </div>
                        <div className="bg-purple-50 p-3 rounded">
                          <div className="text-sm text-gray-600">Transactions</div>
                          <div className="text-lg font-bold text-purple-700">
                            {stat.transactionCount || 0}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </>
      ) : members.length === 0 ? (
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-6 text-center">
          <div className="text-gray-500 mb-2">Unable to load list data</div>
          <p className="text-sm text-gray-400">
            Please contact the list owner if this issue persists.
          </p>
        </div>
      ) : (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 text-center">
          <div className="text-yellow-700 font-semibold mb-2">Access Restricted</div>
          <p className="text-yellow-600">
            You don't have permission to view this content.
          </p>
        </div>
      )}
    </div>
  );
}