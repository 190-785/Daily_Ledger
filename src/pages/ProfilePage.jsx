import React, { useState } from "react";
import { auth, db } from "../firebase";
import {
  updateProfile,
  updateEmail,
  updatePassword,
  reauthenticateWithCredential,
  EmailAuthProvider,
} from "firebase/auth";
import { doc, updateDoc } from "firebase/firestore";

export default function ProfilePage({ userProfile }) {
  const user = auth.currentUser;
  const [name, setName] = useState(user?.displayName || userProfile?.displayName || "");
  const [email, setEmail] = useState(user?.email || "");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [message, setMessage] = useState({ type: "", text: "" });
  const [loading, setLoading] = useState(false);

  const reauthenticate = async () => {
    if (!currentPassword) {
      throw new Error("Current password is required for this action.");
    }
    const credential = EmailAuthProvider.credential(
      user.email,
      currentPassword
    );
    await reauthenticateWithCredential(user, credential);
  };

  const handleUpdateName = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage({ type: "", text: "" });

    try {
      // Update Firebase Auth profile
      await updateProfile(user, { displayName: name });
      
      // Update Firestore profile
      const profileRef = doc(db, 'users', user.uid, 'profile', 'info');
      await updateDoc(profileRef, {
        displayName: name,
        updatedAt: new Date()
      });
      
      setMessage({ type: "success", text: "Name updated successfully!" });
    } catch (error) {
      setMessage({ type: "error", text: error.message });
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateEmail = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage({ type: "", text: "" });

    try {
      await reauthenticate();
      await updateEmail(user, email);
      
      // Update Firestore profile
      const profileRef = doc(db, 'users', user.uid, 'profile', 'info');
      await updateDoc(profileRef, {
        email: email,
        updatedAt: new Date()
      });
      
      setMessage({
        type: "success",
        text: "Email updated successfully! Please verify your new email.",
      });
      setCurrentPassword("");
    } catch (error) {
      setMessage({ type: "error", text: error.message });
    } finally {
      setLoading(false);
    }
  };

  const handleUpdatePassword = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage({ type: "", text: "" });

    if (newPassword !== confirmPassword) {
      setMessage({ type: "error", text: "New passwords do not match!" });
      setLoading(false);
      return;
    }

    if (newPassword.length < 6) {
      setMessage({
        type: "error",
        text: "Password must be at least 6 characters long.",
      });
      setLoading(false);
      return;
    }

    try {
      await reauthenticate();
      await updatePassword(user, newPassword);
      setMessage({ type: "success", text: "Password updated successfully!" });
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (error) {
      setMessage({ type: "error", text: error.message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white p-6 rounded-xl shadow-md max-w-2xl mx-auto">
      <h2 className="text-3xl font-bold mb-6">Profile Settings</h2>

      {/* Username Display */}
      {userProfile?.username && (
        <div className="mb-6 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg border border-blue-200">
          <div className="flex items-center gap-3">
            <div className="bg-blue-600 text-white w-12 h-12 rounded-full flex items-center justify-center text-xl font-bold">
              {userProfile.username.charAt(0).toUpperCase()}
            </div>
            <div>
              <p className="text-sm text-gray-600 font-medium">Your Username</p>
              <p className="text-xl font-bold text-gray-800">@{userProfile.username}</p>
              <p className="text-xs text-gray-500 mt-1">Username cannot be changed</p>
            </div>
          </div>
        </div>
      )}

      {message.text && (
        <div
          className={`mb-6 p-4 rounded-lg ${
            message.type === "success"
              ? "bg-green-100 text-green-800"
              : "bg-red-100 text-red-800"
          }`}
        >
          {message.text}
        </div>
      )}

      {/* Update Name Section */}
      <div className="mb-8 p-6 bg-gray-50 rounded-lg border">
        <h3 className="text-xl font-semibold mb-4">Update Name</h3>
        <form onSubmit={handleUpdateName} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Display Name
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Enter your name"
              className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="bg-blue-600 text-white font-bold py-2 px-6 rounded-lg hover:bg-blue-700 disabled:bg-gray-400"
          >
            {loading ? "Updating..." : "Update Name"}
          </button>
        </form>
      </div>

      {/* Update Email Section */}
      <div className="mb-8 p-6 bg-gray-50 rounded-lg border">
        <h3 className="text-xl font-semibold mb-4">Update Email</h3>
        <form onSubmit={handleUpdateEmail} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              New Email Address
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Enter new email"
              className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Current Password (for verification)
            </label>
            <input
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              placeholder="Enter current password"
              className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="bg-blue-600 text-white font-bold py-2 px-6 rounded-lg hover:bg-blue-700 disabled:bg-gray-400"
          >
            {loading ? "Updating..." : "Update Email"}
          </button>
        </form>
      </div>

      {/* Update Password Section */}
      <div className="mb-8 p-6 bg-gray-50 rounded-lg border">
        <h3 className="text-xl font-semibold mb-4">Update Password</h3>
        <form onSubmit={handleUpdatePassword} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Current Password
            </label>
            <input
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              placeholder="Enter current password"
              className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              New Password
            </label>
            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="Enter new password (min. 6 characters)"
              className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Confirm New Password
            </label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Confirm new password"
              className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="bg-blue-600 text-white font-bold py-2 px-6 rounded-lg hover:bg-blue-700 disabled:bg-gray-400"
          >
            {loading ? "Updating..." : "Update Password"}
          </button>
        </form>
      </div>

      {/* Account Info */}
      <div className="p-6 bg-blue-50 rounded-lg border border-blue-200">
        <h3 className="text-lg font-semibold mb-3 text-blue-900">
          Account Information
        </h3>
        <p className="text-sm text-gray-700">
          <strong>Current Email:</strong> {user?.email}
        </p>
        <p className="text-sm text-gray-700 mt-2">
          <strong>Account Created:</strong>{" "}
          {user?.metadata?.creationTime
            ? new Date(user.metadata.creationTime).toLocaleDateString()
            : "N/A"}
        </p>
      </div>
    </div>
  );
}
