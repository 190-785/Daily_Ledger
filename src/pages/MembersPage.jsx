import React, { useState, useEffect } from "react";
import { db } from "../firebase";
import {
  collection,
  onSnapshot,
  addDoc,
  updateDoc,
  doc,
  query,
  where,
  getDocs,
  writeBatch,
  Timestamp,
} from "firebase/firestore";

export default function MembersPage({ userId }) {
  const [members, setMembers] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    defaultDailyPayment: "",
    monthlyTarget: "",
  });
  const [editingMember, setEditingMember] = useState(null);
  const [formError, setFormError] = useState("");
  const [deletingMember, setDeletingMember] = useState(null);
  const [showUpdateConfirm, setShowUpdateConfirm] = useState(false);

  useEffect(() => {
    const membersQuery = query(collection(db, "users", userId, "members"));
    const unsubscribe = onSnapshot(membersQuery, (snapshot) => {
      const sortedMembers = snapshot.docs
        .map((doc) => ({ id: doc.id, ...doc.data() }))
        .sort((a, b) => a.name.localeCompare(b.name));
      setMembers(sortedMembers);
    });
    return () => unsubscribe();
  }, [userId]);

  const handleInputChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    setFormError("");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError("");
    const daily = Number(formData.defaultDailyPayment);
    const monthly = Number(formData.monthlyTarget);

    if (!formData.name || !daily || !monthly) {
      setFormError("Please fill out all fields.");
      return;
    }

    if (daily * 30 !== monthly) {
      setFormError(
        "Monthly Target must be exactly 30 times the Daily Payment."
      );
      return;
    }

    // Show confirmation popup for updates
    if (editingMember) {
      setShowUpdateConfirm(true);
      return;
    }

    // Add new member without confirmation
    const memberData = {
      name: formData.name,
      defaultDailyPayment: daily,
      monthlyTarget: monthly,
    };

    await addDoc(collection(db, "users", userId, "members"), {
      ...memberData,
      createdOn: Timestamp.now(),
    });
    resetForm();
  };

  const confirmUpdate = async () => {
    const daily = Number(formData.defaultDailyPayment);
    const monthly = Number(formData.monthlyTarget);

    const memberData = {
      name: formData.name,
      defaultDailyPayment: daily,
      monthlyTarget: monthly,
    };

    await updateDoc(
      doc(db, "users", userId, "members", editingMember.id),
      memberData
    );
    setShowUpdateConfirm(false);
    resetForm();
  };

  const cancelUpdate = () => {
    setShowUpdateConfirm(false);
  };

  const handleEdit = (member) => {
    setFormData({
      name: member.name,
      defaultDailyPayment: member.defaultDailyPayment,
      monthlyTarget: member.monthlyTarget,
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
    setFormData({ name: "", defaultDailyPayment: "", monthlyTarget: "" });
    setEditingMember(null);
    setShowForm(false);
    setFormError("");
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
      {showForm && (
        <div className="mb-6 p-6 bg-gray-50 rounded-lg border">
          <h3 className="text-xl font-semibold mb-4">
            {editingMember ? "Edit Member" : "Add New Member"}
          </h3>
          <form onSubmit={handleSubmit} className="space-y-4">
            <input
              type="text"
              name="name"
              value={formData.name}
              onChange={handleInputChange}
              placeholder="Full Name"
              className="w-full px-3 py-2 border rounded-md"
            />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <input
                type="number"
                name="defaultDailyPayment"
                value={formData.defaultDailyPayment}
                onChange={handleInputChange}
                placeholder="Default Daily Payment"
                className="px-3 py-2 border rounded-md"
              />
              <input
                type="number"
                name="monthlyTarget"
                value={formData.monthlyTarget}
                onChange={handleInputChange}
                placeholder="Monthly Target"
                className="px-3 py-2 border rounded-md"
              />
            </div>
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

      {/* Update Confirmation Popup */}
      {showUpdateConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-8 rounded-xl shadow-2xl max-w-md w-full mx-4">
            <h3 className="text-2xl font-bold mb-4 text-gray-800">
              Confirm Update
            </h3>
            <p className="text-gray-600 mb-6">
              Are you sure you want to update <strong>{formData.name}</strong>'s
              information?
            </p>
            <div className="bg-gray-50 p-4 rounded-lg mb-6">
              <p className="text-sm text-gray-700">
                <strong>Daily Payment:</strong> ₹
                {Number(formData.defaultDailyPayment).toLocaleString()}
              </p>
              <p className="text-sm text-gray-700">
                <strong>Monthly Target:</strong> ₹
                {Number(formData.monthlyTarget).toLocaleString()}
              </p>
            </div>
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
              <th className="text-left py-3 px-4">Monthly Target</th>
              <th className="text-left py-3 px-4">Daily Default</th>
              <th className="text-left py-3 px-4">Actions</th>
            </tr>
          </thead>
          <tbody>
            {members.map((member) => (
              <tr key={member.id} className="border-b hover:bg-gray-50">
                <td className="py-3 px-4">{member.name}</td>
                <td className="py-3 px-4">
                  ₹{member.monthlyTarget.toLocaleString()}
                </td>
                <td className="py-3 px-4">
                  ₹{member.defaultDailyPayment.toLocaleString()}
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
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => handleEdit(member)}
                        className="text-sm bg-yellow-400 hover:bg-yellow-500 text-white font-bold py-1 px-3 rounded-lg"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => setDeletingMember(member.id)}
                        className="text-sm bg-red-500 hover:bg-red-600 text-white font-bold py-1 px-3 rounded-lg"
                      >
                        Delete
                      </button>
                    </div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
