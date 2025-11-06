import React, { useState, useEffect } from "react";
import { db, archiveMember, unarchiveMember } from "../firebase";
import {
  collection,
  addDoc,
  updateDoc,
  doc,
  query,
  onSnapshot,
  where,
  getDocs,
  writeBatch,
  Timestamp,
} from "firebase/firestore";
import MemberListControls from "../components/MemberListControls";
import { AlertModal, ConfirmModal } from "../components/Modal";

export default function MembersPage({ userId }) {

  const [members, setMembers] = useState([]);
  const [displayedMembers, setDisplayedMembers] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    defaultDailyPayment: "",
    monthlyTarget: "",
    paymentType: "daily",
  });
  const [editingMember, setEditingMember] = useState(null);
  const [deletingMember, setDeletingMember] = useState(null);
  const [formError, setFormError] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState("addedTime");
  const [showUpdateConfirm, setShowUpdateConfirm] = useState(false);
  const [pendingMemberData, setPendingMemberData] = useState(null);
  const [showArchivedMembers, setShowArchivedMembers] = useState(true);
  const [archivingMember, setArchivingMember] = useState(null);
  const [archiveReason, setArchiveReason] = useState("");
  const [archiveError, setArchiveError] = useState("");
  const [showArchiveModal, setShowArchiveModal] = useState(false);
  const [showUnarchiveConfirm, setShowUnarchiveConfirm] = useState(null);

  useEffect(() => {
    if (!userId) return;

    const initializeRanks = async () => {
      const membersQuery = query(collection(db, "users", userId, "members"));
      const snapshot = await getDocs(membersQuery);
      
      const membersWithoutRank = snapshot.docs
        .map((doc) => ({ id: doc.id, ...doc.data() }))
        .filter((member) => member.rank === undefined);
      
      if (membersWithoutRank.length > 0) {
        membersWithoutRank.sort((a, b) => {
          const timeA = a.createdOn?.toMillis() || 0;
          const timeB = b.createdOn?.toMillis() || 0;
          return timeA - timeB;
        });
        
        const batch = writeBatch(db);
        membersWithoutRank.forEach((member, index) => {
          const memberRef = doc(db, "users", userId, "members", member.id);
          batch.update(memberRef, { rank: index + 1 });
        });
        
        await batch.commit();
      }
    };

    const initializeArchiveFields = async () => {
      const membersQuery = query(collection(db, "users", userId, "members"));
      const snapshot = await getDocs(membersQuery);
      
      const membersWithoutArchive = snapshot.docs
        .map((doc) => ({ id: doc.id, ...doc.data() }))
        .filter((member) => member.archived === undefined);
      
      if (membersWithoutArchive.length > 0) {
        const batch = writeBatch(db);
        membersWithoutArchive.forEach((member) => {
          const memberRef = doc(db, "users", userId, "members", member.id);
          batch.update(memberRef, { 
            archived: false,
            archivedOn: null,
            archivedReason: ""
          });
        });
        
        await batch.commit();
      }
    };
    
    initializeRanks();
    initializeArchiveFields();
  }, [userId]);

  useEffect(() => {
    if (!userId) return;

    const membersQuery = query(collection(db, "users", userId, "members"));
    const unsubscribe = onSnapshot(membersQuery, (snapshot) => {
      const membersData = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      setMembers(membersData);
    });
    return () => unsubscribe();
  }, [userId]);

  useEffect(() => {
    let filtered = [...members];

    // Filter by archive status
    if (!showArchivedMembers) {
      filtered = filtered.filter((member) => !member.archived);
    }

    if (searchQuery.trim()) {
      filtered = filtered.filter((member) =>
        member.name.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    switch (sortBy) {
      case "alphabetical":
        filtered.sort((a, b) => a.name.localeCompare(b.name));
        break;
      case "addedTime":
        filtered.sort((a, b) => {
          const timeA = a.createdOn?.toMillis() || 0;
          const timeB = b.createdOn?.toMillis() || 0;
          return timeA - timeB;
        });
        break;
      default:
        break;
    }

    setDisplayedMembers(filtered);
  }, [members, sortBy, searchQuery, showArchivedMembers]);

  const handleInputChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    setFormError("");
  };

  const handlePaymentTypeChange = (type) => {
    setFormData((prev) => ({
      ...prev,
      paymentType: type,
      defaultDailyPayment: type === "daily" ? prev.defaultDailyPayment : "",
    }));
    setFormError("");
  };

  const buildMemberPayload = () => {
    const paymentType = formData.paymentType;
    const name = formData.name.trim();
    const daily = Number(formData.defaultDailyPayment);
    const monthly = Number(formData.monthlyTarget);

    if (!name) {
      setFormError("Please enter the member's name.");
      return null;
    }

    if (paymentType === "daily") {
      if (!daily || daily <= 0 || !monthly || monthly <= 0) {
        setFormError("Please provide both daily and monthly amounts greater than zero.");
        return null;
      }

      return {
        name,
        defaultDailyPayment: daily,
        monthlyTarget: monthly,
        paymentType: "daily",
      };
    }

    if (!monthly || monthly <= 0) {
      setFormError("Please provide a monthly target amount greater than zero.");
      return null;
    }

    return {
      name,
      defaultDailyPayment: 0,
      monthlyTarget: monthly,
      paymentType: "monthly",
    };
  };

  const isMonthlySelection = formData.paymentType === "monthly";
  const formatCurrency = (value) => Number(value || 0).toLocaleString();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError("");
    const memberData = buildMemberPayload();
    if (!memberData) {
      return;
    }

    if (editingMember) {
      setPendingMemberData(memberData);
      setShowUpdateConfirm(true);
      return;
    }

    const maxRank = members.reduce(
      (max, member) => Math.max(max, member.rank || 0),
      0
    );

    const newMemberData = {
      ...memberData,
      createdOn: Timestamp.now(),
      rank: maxRank + 1,
      archived: false,
      archivedOn: null,
      archivedReason: "",
    };

    console.log('Creating member with data:', newMemberData);

    try {
      await addDoc(collection(db, "users", userId, "members"), newMemberData);
      resetForm();
    } catch (error) {
      console.error('Error creating member:', error);
      setFormError(`Failed to create member: ${error.message}`);
    }
  };

  const confirmUpdate = async () => {
    const memberData = pendingMemberData || buildMemberPayload();
    if (!memberData || !editingMember) {
      return;
    }

    await updateDoc(
      doc(db, "users", userId, "members", editingMember.id),
      memberData
    );
    setShowUpdateConfirm(false);
    setPendingMemberData(null);
    resetForm();
  };

  const cancelUpdate = () => {
    setShowUpdateConfirm(false);
    setPendingMemberData(null);
  };

  const handleEdit = (member) => {
    setFormData({
      name: member.name,
      defaultDailyPayment: member.defaultDailyPayment ? member.defaultDailyPayment.toString() : "",
      monthlyTarget: member.monthlyTarget ? member.monthlyTarget.toString() : "",
      paymentType: member.paymentType || "daily",
    });
    setEditingMember(member);
    setShowForm(true);
    setFormError("");
  };

  const handleDelete = async (memberId) => {
    const batch = writeBatch(db);

    const memberDocRef = doc(db, "users", userId, "members", memberId);
    batch.delete(memberDocRef);

    const transQuery = query(
      collection(db, "users", userId, "transactions"),
      where("memberId", "==", memberId)
    );
    const transSnapshot = await getDocs(transQuery);
    transSnapshot.forEach((doc) => batch.delete(doc.ref));

    await batch.commit();
    setDeletingMember(null);
  };

  const resetForm = () => {
    setFormData({
      name: "",
      defaultDailyPayment: "",
      monthlyTarget: "",
      paymentType: "daily",
    });
    setEditingMember(null);
    setShowForm(false);
    setFormError("");
    setPendingMemberData(null);
  };

  const handleArchiveClick = (member) => {
    setArchivingMember(member);
    setArchiveReason("");
    setArchiveError("");
    setShowArchiveModal(true);
  };

  const handleArchiveConfirm = async () => {
    if (!archivingMember) return;

    const result = await archiveMember(userId, archivingMember.id, archiveReason);
    
    if (result.success) {
      setShowArchiveModal(false);
      setArchivingMember(null);
      setArchiveReason("");
      setArchiveError("");
    } else {
      setArchiveError(result.error || "Failed to archive member");
    }
  };

  const handleArchiveCancel = () => {
    setShowArchiveModal(false);
    setArchivingMember(null);
    setArchiveReason("");
    setArchiveError("");
  };

  const handleUnarchiveClick = (member) => {
    setShowUnarchiveConfirm(member);
  };

  const handleUnarchiveConfirm = async () => {
    if (!showUnarchiveConfirm) return;

    const result = await unarchiveMember(userId, showUnarchiveConfirm.id);
    
    if (result.success) {
      setShowUnarchiveConfirm(null);
    } else {
      // Show error (could add error modal here)
      alert(result.error || "Failed to unarchive member");
      setShowUnarchiveConfirm(null);
    }
  };

  const handleUnarchiveCancel = () => {
    setShowUnarchiveConfirm(null);
  };

  return (
    <div className="bg-white p-6 rounded-xl shadow-md">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-3xl font-bold">Manage Members</h2>
        <button
          onClick={() => {
            setShowForm(!showForm);
            if (showForm) resetForm();
          }}
          className="bg-blue-600 text-white font-bold py-2 px-4 rounded-lg hover:bg-blue-700"
        >
          {showForm ? "Cancel" : "+ Add Member"}
        </button>
      </div>

      <MemberListControls
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        sortBy={sortBy}
        setSortBy={setSortBy}
        showRankOption={false}
        totalMembers={members.length}
        filteredCount={displayedMembers.length}
      />

      {/* Archive Filter Toggle */}
      <div className="mb-4 flex items-center gap-3 bg-gray-50 p-3 rounded-lg border">
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={showArchivedMembers}
            onChange={(e) => setShowArchivedMembers(e.target.checked)}
            className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
          />
          <span className="text-sm font-medium text-gray-700">
            Show Archived Members
          </span>
        </label>
        <span className="text-xs text-gray-500">
          ({members.filter(m => m.archived).length} archived)
        </span>
      </div>

      {showForm && (
        <div className="mb-6 p-6 bg-gray-50 rounded-lg border">
          <h3 className="text-xl font-semibold mb-4">
            {editingMember ? "Edit Member" : "Add New Member"}
          </h3>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => handlePaymentTypeChange("daily")}
                className={`px-4 py-2 text-sm font-semibold rounded-lg border transition-colors ${
                  !isMonthlySelection
                    ? "border-blue-500 bg-blue-500/10 text-blue-600"
                    : "border-gray-300 text-gray-500 hover:border-blue-400 hover:text-blue-500"
                }`}
              >
                Daily Member
              </button>
              <button
                type="button"
                onClick={() => handlePaymentTypeChange("monthly")}
                className={`px-4 py-2 text-sm font-semibold rounded-lg border transition-colors ${
                  isMonthlySelection
                    ? "border-blue-500 bg-blue-500/10 text-blue-600"
                    : "border-gray-300 text-gray-500 hover:border-blue-400 hover:text-blue-500"
                }`}
              >
                Monthly / One-time Member
              </button>
            </div>

            <p className="text-xs text-gray-500">
              {isMonthlySelection
                ? "Record flexible contributions whenever they arrive. We'll use the monthly amount as the quick-add shortcut in the ledger."
                : "Daily members collect a fixed amount each day. The monthly target is independent."}
            </p>

            <input
              type="text"
              name="name"
              value={formData.name}
              onChange={handleInputChange}
              placeholder="Full Name"
              className="w-full px-3 py-2 border rounded-md"
            />

            {!isMonthlySelection ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <label className="flex flex-col gap-2">
                  <span className="text-sm font-medium text-gray-700">Daily Default Payment</span>
                  <input
                    type="number"
                    name="defaultDailyPayment"
                    value={formData.defaultDailyPayment}
                    onChange={handleInputChange}
                    placeholder="Default Daily Payment"
                    min="0"
                    className="px-3 py-2 border rounded-md"
                  />
                </label>
                <label className="flex flex-col gap-2">
                  <span className="text-sm font-medium text-gray-700">Monthly Target</span>
                  <input
                    type="number"
                    name="monthlyTarget"
                    value={formData.monthlyTarget}
                    onChange={handleInputChange}
                    placeholder="Monthly Target"
                    min="0"
                    className="px-3 py-2 border rounded-md"
                  />
                </label>
              </div>
            ) : (
              <div className="space-y-3">
                <label className="flex flex-col gap-2">
                  <span className="text-sm font-medium text-gray-700">Monthly Target</span>
                  <input
                    type="number"
                    name="monthlyTarget"
                    value={formData.monthlyTarget}
                    onChange={handleInputChange}
                    placeholder="Monthly Target"
                    min="0"
                    className="px-3 py-2 border rounded-md"
                  />
                </label>
              </div>
            )}

            {formError && (
              <p className="text-red-500 text-sm text-center">{formError}</p>
            )}
            <div className="flex justify-end space-x-3">
              <button
                type="button"
                onClick={resetForm}
                className="bg-gray-300 font-bold py-2 px-4 rounded-lg hover:bg-gray-400"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="bg-green-500 text-white font-bold py-2 px-4 rounded-lg hover:bg-green-600"
              >
                {editingMember ? "Update" : "Save"}
              </button>
            </div>
          </form>
        </div>
      )}

      {showUpdateConfirm && (
        <div 
          className="fixed inset-0 flex items-center justify-center z-50"
          style={{ backgroundColor: "rgba(0, 0, 0, 0.4)" }}
        >
          <div className="bg-white p-8 rounded-xl shadow-2xl max-w-md w-full mx-4">
            <h3 className="text-2xl font-bold mb-4 text-gray-800">
              Confirm Update
            </h3>
            <p className="text-gray-600 mb-6">
              Are you sure you want to update this member?
            </p>
            <div className="flex justify-end space-x-3">
              <button
                onClick={cancelUpdate}
                className="bg-gray-300 hover:bg-gray-400 font-bold py-2 px-6 rounded-lg"
              >
                Cancel
              </button>
              <button
                onClick={confirmUpdate}
                className="bg-green-500 hover:bg-green-600 text-white font-bold py-2 px-6 rounded-lg"
              >
                Confirm Update
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="overflow-x-auto">
        <table className="min-w-full bg-white">
          <thead className="bg-gray-100">
            <tr>
              <th className="text-left py-3 px-4">Name</th>
              <th className="text-left py-3 px-4">Payment Type</th>
              <th className="text-left py-3 px-4">Monthly Target</th>
              <th className="text-left py-3 px-4">Daily Default</th>
              <th className="text-left py-3 px-4">Actions</th>
            </tr>
          </thead>
          <tbody>
            {displayedMembers.map((member) => {
              const isMonthlyMember = (member.paymentType || "daily") === "monthly";
              const monthlyTargetValue = Number(member.monthlyTarget || 0);
              const dailyDefaultValue = Number(member.defaultDailyPayment || 0);
              const isArchived = member.archived || false;

              return (
                <tr key={member.id} className={`border-b hover:bg-gray-50 ${isArchived ? 'bg-gray-100 opacity-60' : ''}`}>
                  <td className="py-3 px-4">
                    {member.name}
                    {isArchived && (
                      <span className="ml-2 inline-flex items-center px-2 py-0.5 text-xs font-medium rounded bg-gray-300 text-gray-700">
                        Archived
                      </span>
                    )}
                  </td>
                  <td className="py-3 px-4">
                    <span
                      className={`inline-flex items-center px-2 py-1 text-xs font-semibold rounded-full ${
                        isMonthlyMember
                          ? "bg-purple-100 text-purple-800"
                          : "bg-blue-100 text-blue-700"
                      }`}
                    >
                      {isMonthlyMember ? "Monthly" : "Daily"}
                    </span>
                  </td>
                  <td className="py-3 px-4">
                    {formatCurrency(monthlyTargetValue)}
                  </td>
                  <td className="py-3 px-4">
                    {isMonthlyMember
                      ? "—"
                      : `${formatCurrency(dailyDefaultValue)}`}
                  </td>
                  <td className="py-3 px-4">
                    {deletingMember === member.id ? (
                      <div className="flex flex-col gap-2 bg-red-50 p-2 rounded-lg">
                        <p className="text-xs text-red-800 font-semibold">
                          Delete member & all transactions?
                        </p>
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleDelete(member.id)}
                            className="text-xs bg-red-600 hover:bg-red-700 text-white font-bold py-1 px-3 rounded"
                          >
                            Yes, Delete
                          </button>
                          <button
                            onClick={() => setDeletingMember(null)}
                            className="text-xs bg-gray-400 hover:bg-gray-500 text-white font-bold py-1 px-3 rounded"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center flex-wrap gap-2">
                        {!isArchived && (
                          <>
                            <button
                              onClick={() => handleEdit(member)}
                              className="text-sm bg-blue-600 hover:bg-blue-700 text-white font-semibold py-1.5 px-4 rounded-lg transition-colors"
                            >
                              Edit
                            </button>
                            <button
                              onClick={() => handleArchiveClick(member)}
                              className="text-sm bg-orange-600 hover:bg-orange-700 text-white font-semibold py-1.5 px-4 rounded-lg transition-colors"
                            >
                              Archive
                            </button>
                            <button
                              onClick={() => setDeletingMember(member.id)}
                              className="text-sm bg-red-600 hover:bg-red-700 text-white font-semibold py-1.5 px-4 rounded-lg transition-colors"
                            >
                              Delete
                            </button>
                          </>
                        )}
                        {isArchived && (
                          <button
                            onClick={() => handleUnarchiveClick(member)}
                            className="text-sm bg-green-600 hover:bg-green-700 text-white font-semibold py-1.5 px-4 rounded-lg transition-colors"
                          >
                            Unarchive
                          </button>
                        )}
                      </div>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Archive Confirmation Modal */}
      {showArchiveModal && archivingMember && (
        <div 
          className="fixed inset-0 flex items-center justify-center z-50"
          style={{ backgroundColor: "rgba(0, 0, 0, 0.5)" }}
        >
          <div className="bg-white p-8 rounded-xl shadow-2xl max-w-md w-full mx-4">
            <h3 className="text-2xl font-bold mb-4 text-gray-800">
              Archive Member
            </h3>
            <p className="text-gray-600 mb-4">
              Are you sure you want to archive <strong>{archivingMember.name}</strong>?
            </p>
            <p className="text-sm text-gray-500 mb-4">
              This member will be removed from daily collection from {new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' })} onwards. Historical data will remain visible.
            </p>

            {archiveError && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-sm text-red-700">{archiveError}</p>
              </div>
            )}

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Reason for archiving (optional)
              </label>
              <textarea
                value={archiveReason}
                onChange={(e) => setArchiveReason(e.target.value)}
                placeholder="E.g., Left the group, Moved away, etc."
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                rows="3"
              />
            </div>

            <div className="flex justify-end space-x-3">
              <button
                onClick={handleArchiveCancel}
                className="bg-gray-300 hover:bg-gray-400 font-bold py-2 px-6 rounded-lg"
              >
                Cancel
              </button>
              <button
                onClick={handleArchiveConfirm}
                className="bg-orange-600 hover:bg-orange-700 text-white font-bold py-2 px-6 rounded-lg"
              >
                Archive Member
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Unarchive Confirmation Modal */}
      {showUnarchiveConfirm && (
        <ConfirmModal
          isOpen={!!showUnarchiveConfirm}
          title="Unarchive Member"
          message={`Are you sure you want to unarchive ${showUnarchiveConfirm.name}? They will be added back to active members.`}
          confirmLabel="Unarchive"
          cancelLabel="Cancel"
          onConfirm={handleUnarchiveConfirm}
          onCancel={handleUnarchiveCancel}
          type="info"
        />
      )}
    </div>
  );
}
