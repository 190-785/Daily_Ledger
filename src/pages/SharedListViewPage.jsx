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
        setSharedList(sharedListData);

        // Set default active tab based on allowed views
        const allowedViews = sharedListData.shareSettings?.allowedViews || [];
        if (allowedViews.length === 1) {
          setActiveTab(allowedViews[0]);
        }

        // Fetch members from owner's collection
        const ownerId = sharedListData.ownerUserId || sharedListData.ownerId;
        const memberIds = sharedListData.memberIds || [];
        
        if (memberIds.length > 0) {
          const membersRef = collection(db, 'users', ownerId, 'members');
          const membersQuery = query(membersRef, firestoreOrderBy('rank', 'asc'));
          const membersSnap = await getDocs(membersQuery);
          
          const allMembers = [];
          membersSnap.forEach((doc) => {
            if (memberIds.includes(doc.id)) {
              allMembers.push({ id: doc.id, ...doc.data() });
            }
          });
          setMembers(allMembers);
        }

      } catch (err) {
        console.error('Error fetching shared list:', err);
        setError('Failed to load shared list. Please try again.');
      } finally {
        setLoading(false);
      }
    };

    fetchSharedList();
  }, [userId, listId]);

  // Fetch daily data when date changes
  useEffect(() => {
    if (!sharedList || !members.length) return;
    
    const fetchDailyData = async () => {
      try {
        const ownerId = sharedList.ownerUserId || sharedList.ownerId;
        const dailyTransactions = [];

        for (const member of members) {
          const transactionsRef = collection(db, 'users', ownerId, 'transactions');
          const transactionsQuery = query(
            transactionsRef,
            where('memberId', '==', member.id),
            where('date', '==', selectedDate),
            firestoreOrderBy('timestamp', 'desc')
          );
          
          const transactionsSnap = await getDocs(transactionsQuery);
          transactionsSnap.forEach((doc) => {
            dailyTransactions.push({
              id: doc.id,
              ...doc.data(),
              memberName: member.name
            });
          });
        }

        setDailyData(dailyTransactions);
      } catch (err) {
        console.error('Error fetching daily data:', err);
      }
    };

    if (activeTab === 'daily') {
      fetchDailyData();
    }
  }, [sharedList, members, selectedDate, activeTab]);

  // Fetch monthly data
  useEffect(() => {
    if (!sharedList || !members.length || activeTab !== 'monthly') return;

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
          }
        }

        setMonthlyData(monthlyStats);
      } catch (err) {
        console.error('Error fetching monthly data:', err);
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
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
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
          <p className="text-red-600">{error || 'Failed to load shared list.'}</p>
          <button
            onClick={() => navigate('/lists')}
            className="mt-4 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
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

  const shareTypeInfo = {
    dynamic: { label: '🔄 Dynamic', desc: 'Full access with date selection' },
    lastMonth: { label: '📅 Last Month', desc: 'Fixed to previous month' },
    currentDay: { label: '📍 Current Day', desc: 'Live view of today only' }
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
            👤 Shared by @{sharedList.ownerUsername}
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

      {/* Fixed Date Display (for currentDay and lastMonth) */}
      {!isDynamic && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
          <div className="flex items-center gap-2 text-blue-700">
            <span className="font-medium">📅 Viewing:</span>
            <span>
              {isCurrentDay && 'Today'}
              {isLastMonth && 'Last Month'}
              {' '}({getAllowedDate()})
            </span>
          </div>
        </div>
      )}

      {/* Tabs (if both views allowed) */}
      {allowedViews.length === 2 && (
        <div className="flex gap-2 mb-6">
          <button
            onClick={() => setActiveTab('daily')}
            className={`flex-1 px-6 py-3 font-medium rounded-lg transition-colors ${
              activeTab === 'daily'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            📊 Daily View
          </button>
          <button
            onClick={() => setActiveTab('monthly')}
            className={`flex-1 px-6 py-3 font-medium rounded-lg transition-colors ${
              activeTab === 'monthly'
                ? 'bg-purple-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            📈 Monthly View
          </button>
        </div>
      )}

      {/* Content */}
      {allowedViews.includes(activeTab) ? (
        <>
          {/* Daily View */}
          {activeTab === 'daily' && (
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h2 className="text-xl font-bold text-gray-800 mb-4">
                Daily Transactions - {new Date(selectedDate).toLocaleDateString('en-US', { 
                  weekday: 'long', 
                  year: 'numeric', 
                  month: 'long', 
                  day: 'numeric' 
                })}
              </h2>

              {dailyData.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <div className="text-4xl mb-3">📭</div>
                  <p>No transactions found for this date</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {dailyData.map((transaction) => (
                    <div
                      key={transaction.id}
                      className={`p-4 rounded-lg border ${
                        transaction.type === 'credit'
                          ? 'bg-green-50 border-green-200'
                          : 'bg-red-50 border-red-200'
                      }`}
                    >
                      <div className="flex justify-between items-start">
                        <div>
                          <div className="font-medium text-gray-900">
                            {transaction.memberName}
                          </div>
                          {transaction.description && (
                            <div className="text-sm text-gray-600 mt-1">
                              {transaction.description}
                            </div>
                          )}
                          <div className="text-xs text-gray-500 mt-1">
                            {new Date(transaction.timestamp?.toDate()).toLocaleTimeString()}
                          </div>
                        </div>
                        <div className={`text-lg font-bold ${
                          transaction.type === 'credit' ? 'text-green-700' : 'text-red-700'
                        }`}>
                          {transaction.type === 'credit' ? '+' : '-'}
                          {formatCurrency(transaction.amount)}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Monthly View */}
          {activeTab === 'monthly' && (
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h2 className="text-xl font-bold text-gray-800 mb-4">
                Monthly Statistics - {new Date(selectedDate).toLocaleDateString('en-US', { 
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
