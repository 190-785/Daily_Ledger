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
    <div className="bg-gradient-to-br from-slate-800/50 to-slate-900/50 border border-slate-700/50 p-8 rounded-2xl shadow-2xl max-w-2xl mx-auto">
      <h2 className="text-3xl font-bold mb-8 text-slate-100 flex items-center">
        <span className="text-3xl mr-3">⚙️</span>
        Profile Settings
      </h2>

      {/* Username Display */}
      {userProfile?.username && (
        <div className="mb-8 p-5 bg-gradient-to-br from-violet-900/30 to-indigo-900/30 border border-violet-700/30 rounded-xl shadow-lg">
          <div className="flex items-center gap-4">
            <div className="bg-gradient-to-br from-violet-600 to-indigo-600 text-white w-16 h-16 rounded-full flex items-center justify-center text-2xl font-bold shadow-lg">
              {userProfile.username.charAt(0).toUpperCase()}
            </div>
            <div>
              <p className="text-xs text-violet-300/80 font-semibold uppercase tracking-wider">Your Username</p>
              <p className="text-2xl font-bold text-violet-100 mt-1">@{userProfile.username}</p>
              <p className="text-xs text-violet-300/60 mt-2 flex items-center">
                <span className="mr-1">🔒</span>
                Username cannot be changed
              </p>
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
      <div className="mb-8 p-6 bg-slate-800/40 border border-slate-700/50 rounded-xl shadow-lg">
        <h3 className="text-xl font-semibold mb-5 text-slate-100 flex items-center">
          <span className="text-xl mr-2">✏️</span>
          Update Actual Name
        </h3>
        <form onSubmit={handleUpdateName} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Your Actual Name
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Enter your actual name (e.g. John Doe)"
              className="w-full px-4 py-3 bg-slate-700/50 border border-slate-600/50 text-slate-100 placeholder-slate-400 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent transition-all"
              required
            />
            <p className="text-xs text-slate-400 mt-2 flex items-center">
              <span className="mr-1">ℹ️</span>
              This is your real name that will be displayed in your profile
            </p>
          </div>
          <button
            type="submit"
            disabled={loading}
            className="bg-gradient-to-r from-violet-600 to-indigo-600 text-white font-bold py-3 px-6 rounded-lg hover:from-violet-700 hover:to-indigo-700 disabled:from-gray-600 disabled:to-gray-700 shadow-lg transition-all hover:scale-[1.02]"
          >
            {loading ? "Updating..." : "Update Name"}
          </button>
        </form>
      </div>

      {/* Update Email Section */}
      <div className="mb-8 p-6 bg-slate-800/40 border border-slate-700/50 rounded-xl shadow-lg">
        <h3 className="text-xl font-semibold mb-5 text-slate-100 flex items-center">
          <span className="text-xl mr-2">📧</span>
          Update Email
        </h3>
        <form onSubmit={handleUpdateEmail} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              New Email Address
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Enter new email"
              className="w-full px-4 py-3 bg-slate-700/50 border border-slate-600/50 text-slate-100 placeholder-slate-400 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent transition-all"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Current Password (for verification)
            </label>
            <input
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              placeholder="Enter current password"
              className="w-full px-4 py-3 bg-slate-700/50 border border-slate-600/50 text-slate-100 placeholder-slate-400 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent transition-all"
              required
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="bg-gradient-to-r from-violet-600 to-indigo-600 text-white font-bold py-3 px-6 rounded-lg hover:from-violet-700 hover:to-indigo-700 disabled:from-gray-600 disabled:to-gray-700 shadow-lg transition-all hover:scale-[1.02]"
          >
            {loading ? "Updating..." : "Update Email"}
          </button>
        </form>
      </div>

      {/* Update Password Section */}
      <div className="mb-8 p-6 bg-slate-800/40 border border-slate-700/50 rounded-xl shadow-lg">
        <h3 className="text-xl font-semibold mb-5 text-slate-100 flex items-center">
          <span className="text-xl mr-2">🔐</span>
          Update Password
        </h3>
        <form onSubmit={handleUpdatePassword} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Current Password
            </label>
            <input
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              placeholder="Enter current password"
              className="w-full px-4 py-3 bg-slate-700/50 border border-slate-600/50 text-slate-100 placeholder-slate-400 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent transition-all"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              New Password
            </label>
            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="Enter new password (min. 6 characters)"
              className="w-full px-4 py-3 bg-slate-700/50 border border-slate-600/50 text-slate-100 placeholder-slate-400 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent transition-all"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Confirm New Password
            </label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Confirm new password"
              className="w-full px-4 py-3 bg-slate-700/50 border border-slate-600/50 text-slate-100 placeholder-slate-400 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent transition-all"
              required
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="bg-gradient-to-r from-violet-600 to-indigo-600 text-white font-bold py-3 px-6 rounded-lg hover:from-violet-700 hover:to-indigo-700 disabled:from-gray-600 disabled:to-gray-700 shadow-lg transition-all hover:scale-[1.02]"
          >
            {loading ? "Updating..." : "Update Password"}
          </button>
        </form>
      </div>

      {/* Account Info */}
      <div className="p-6 bg-gradient-to-br from-blue-900/30 to-cyan-900/30 border border-blue-700/30 rounded-xl shadow-lg">
        <h3 className="text-lg font-semibold mb-4 text-blue-300 flex items-center">
          <span className="text-xl mr-2">ℹ️</span>
          Account Information
        </h3>
        <div className="space-y-3">
          <div className="bg-slate-800/40 p-3 rounded-lg">
            <p className="text-xs text-slate-400 uppercase tracking-wider mb-1">Current Email</p>
            <p className="text-slate-100 font-medium">{user?.email}</p>
          </div>
          <div className="bg-slate-800/40 p-3 rounded-lg">
            <p className="text-xs text-slate-400 uppercase tracking-wider mb-1">Account Created</p>
            <p className="text-slate-100 font-medium">
              {user?.metadata?.creationTime
                ? new Date(user.metadata.creationTime).toLocaleDateString()
                : "N/A"}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
