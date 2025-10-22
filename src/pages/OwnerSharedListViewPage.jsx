import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { doc, getDoc, collection, query, where, getDocs, orderBy as firestoreOrderBy } from 'firebase/firestore';
import { db } from '../firebase';

export default function OwnerSharedListViewPage({ userId }) {
  const { listId } = useParams();
  const navigate = useNavigate();
  const [list, setList] = useState(null);
  const [members, setMembers] = useState([]);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [dailyData, setDailyData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showPaidList, setShowPaidList] = useState(false);
  const [showUnpaidList, setShowUnpaidList] = useState(false);

  // Fetch list data
  useEffect(() => {
    const fetchList = async () => {
      try {
        setLoading(true);
        setError('');

        // Get list document from owner's lists collection
        const listRef = doc(db, 'users', userId, 'lists', listId);
        const listSnap = await getDoc(listRef);

        if (!listSnap.exists()) {
          setError('List not found.');
          return;
        }

        const listData = { id: listSnap.id, ...listSnap.data() };
        setList(listData);

        // Fetch members for this list
        const memberIds = listData.memberIds || [];
        
        if (memberIds.length === 0) {
          setMembers([]);
          return;
        }

        // Fetch members from the owner's collection
        const membersRef = collection(db, 'users', userId, 'members');
        const membersQuery = query(membersRef, firestoreOrderBy('rank', 'asc'));
        const membersSnap = await getDocs(membersQuery);
        
        const allMembers = [];
        membersSnap.forEach((doc) => {
          if (memberIds.includes(doc.id)) {
            allMembers.push({ id: doc.id, ...doc.data() });
          }
        });
        
        setMembers(allMembers);

      } catch (err) {
        console.error('Error fetching list:', err);
        setError('Failed to load list. Please try again.');
      } finally {
        setLoading(false);
      }
    };

    fetchList();
  }, [userId, listId]);

  // Fetch daily data when date changes
  useEffect(() => {
    if (!list || members.length === 0) return;
    
    const fetchDailyData = async () => {
      try {
        const dailyTransactions = [];

        for (const member of members) {
          const transactionsRef = collection(db, 'users', userId, 'transactions');
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

          dailyTransactions.push({
            member,
            transactions: memberTransactions,
            total: memberTotal,
            hasPaid: memberTotal > 0
          });
        }

        setDailyData(dailyTransactions);
      } catch (err) {
        console.error('Error fetching daily data:', err);
      }
    };

    fetchDailyData();
  }, [list, members, selectedDate, userId]);

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
    }).format(amount);
  };

  // Calculate statistics
  const totalCollected = dailyData.reduce((sum, item) => sum + item.total, 0);
  const paidMembers = dailyData.filter(item => item.hasPaid);
  const unpaidMembers = dailyData.filter(item => !item.hasPaid);
  const paidCount = paidMembers.length;
  const unpaidCount = unpaidMembers.length;

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto p-6">
        <div className="flex justify-center items-center h-64">
          <div className="text-xl font-semibold text-gray-600">Loading list...</div>
        </div>
      </div>
    );
  }

  if (error || !list) {
    return (
      <div className="max-w-6xl mx-auto p-6">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6">
          <div className="text-red-700 font-semibold mb-2">Error</div>
          <p className="text-red-600 mb-4">{error || 'Failed to load list.'}</p>
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

  return (
    <div className="max-w-6xl mx-auto p-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-lg shadow-lg p-6 mb-6">
        <button
          onClick={() => navigate('/lists')}
          className="text-white/80 hover:text-white mb-3 flex items-center gap-2"
        >
          ← Back to Lists
        </button>
        <h1 className="text-3xl font-bold mb-2">{list.name}</h1>
        {list.description && (
          <p className="text-purple-100 mb-3">{list.description}</p>
        )}
        <div className="flex flex-wrap gap-3 text-sm">
          <div className="bg-white/20 rounded-full px-3 py-1">
            👑 Owner View
          </div>
          <div className="bg-white/20 rounded-full px-3 py-1">
            👥 {members.length} member{members.length !== 1 ? 's' : ''}
          </div>
          <div className="bg-white/20 rounded-full px-3 py-1">
            🔗 Shared with {Object.keys(list.sharedWith || {}).length} user{Object.keys(list.sharedWith || {}).length !== 1 ? 's' : ''}
          </div>
        </div>
      </div>

      {/* Date Selector */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 mb-6">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          📅 Select Date
        </label>
        <input
          type="date"
          value={selectedDate}
          onChange={(e) => setSelectedDate(e.target.value)}
          className="px-4 py-2 border border-gray-300 rounded-lg w-full sm:w-auto"
        />
      </div>

      {/* Daily View */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
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

      {/* Owner-Only Statistics Section */}
      <div className="bg-gradient-to-br from-blue-50 to-purple-50 rounded-lg shadow-sm border-2 border-blue-200 p-6">
        <div className="flex items-center gap-2 mb-4">
          <span className="text-2xl">📊</span>
          <h3 className="text-xl font-bold text-gray-800">Owner Statistics</h3>
          <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded-full font-semibold">
            Only visible to you
          </span>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="bg-white rounded-lg p-4 shadow-sm border border-gray-200">
            <div className="text-sm text-gray-600 mb-1">Total Collected</div>
            <div className="text-2xl font-bold text-green-600">
              {formatCurrency(totalCollected)}
            </div>
          </div>
          
          <div className="bg-white rounded-lg p-4 shadow-sm border border-gray-200">
            <div className="text-sm text-gray-600 mb-1">Members Paid</div>
            <div className="text-2xl font-bold text-blue-600">
              {paidCount} / {members.length}
            </div>
          </div>
          
          <div className="bg-white rounded-lg p-4 shadow-sm border border-gray-200">
            <div className="text-sm text-gray-600 mb-1">Members Unpaid</div>
            <div className="text-2xl font-bold text-orange-600">
              {unpaidCount} / {members.length}
            </div>
          </div>
        </div>

        {/* Collapsible Paid Members List */}
        {paidCount > 0 && (
          <div className="mb-4">
            <button
              onClick={() => setShowPaidList(!showPaidList)}
              className="w-full flex items-center justify-between bg-white rounded-lg p-4 shadow-sm border border-green-200 hover:bg-green-50 transition-colors"
            >
              <div className="flex items-center gap-3">
                <span className="text-xl">✅</span>
                <span className="font-semibold text-gray-800">
                  Members Who Paid ({paidCount})
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
                {paidMembers.map((item) => (
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
        {unpaidCount > 0 && (
          <div>
            <button
              onClick={() => setShowUnpaidList(!showUnpaidList)}
              className="w-full flex items-center justify-between bg-white rounded-lg p-4 shadow-sm border border-orange-200 hover:bg-orange-50 transition-colors"
            >
              <div className="flex items-center gap-3">
                <span className="text-xl">⏳</span>
                <span className="font-semibold text-gray-800">
                  Members Who Didn't Pay ({unpaidCount})
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
                {unpaidMembers.map((item) => (
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
    </div>
  );
}
