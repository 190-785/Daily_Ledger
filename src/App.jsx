import React, { useState, useEffect } from "react";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { auth } from "./firebase";

import LoginPage from "./pages/LoginPage";
import SignupPage from "./pages/SignupPage";
import DashboardPage from "./pages/DashboardPage";
import LedgerPage from "./pages/LedgerPage";
import MembersPage from "./pages/MembersPage";
import MonthlyViewPage from "./pages/MonthlyViewPage";
import ProfilePage from "./pages/ProfilePage";
import Footer from "./components/Footer";

export default function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isLoginPage, setIsLoginPage] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen bg-gray-100">
        <div className="text-xl font-semibold">Loading App...</div>
      </div>
    );
  }

  if (!user) {
    return isLoginPage ? (
      <LoginPage switchToSignup={() => setIsLoginPage(false)} />
    ) : (
      <SignupPage switchToLogin={() => setIsLoginPage(true)} />
    );
  }

  return <MainApp user={user} />;
}

const MainApp = ({ user }) => {
  const [page, setPage] = useState("dashboard");

  const handleLogout = () => {
    signOut(auth).catch((error) => console.error("Logout failed:", error));
  };

  const renderPage = () => {
    switch (page) {
      case "dashboard":
        return <DashboardPage userId={user.uid} />;
      case "ledger":
        return <LedgerPage userId={user.uid} />;
      case "members":
        return <MembersPage userId={user.uid} />;
      case "monthly":
        return <MonthlyViewPage userId={user.uid} />;
      case "profile":
        return <ProfilePage />;
      default:
        return <DashboardPage userId={user.uid} />;
    }
  };

  return (
    <div className="bg-gray-100 min-h-screen font-sans text-gray-800 flex flex-col">
      <nav className="bg-gradient-to-r from-blue-600 to-blue-800 shadow-lg sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-4">
          <div className="flex justify-between items-center py-3">
            <div className="flex items-center gap-3">
              <div className="bg-white p-2 rounded-lg">
                <svg
                  className="w-6 h-6 text-blue-600"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  viewBox="0 0 24 24"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
              </div>
              <div>
                <h1 className="text-xl md:text-2xl font-bold text-white">
                  Collection Tracker
                </h1>
                <p className="text-xs text-blue-200 hidden md:block">
                  Daily Payment Management System
                </p>
              </div>
            </div>
            <div className="hidden md:flex items-center space-x-1">
              <button
                onClick={() => setPage("dashboard")}
                className={`px-4 py-2 rounded-lg font-semibold transition-all ${
                  page === "dashboard"
                    ? "bg-white text-blue-700 shadow-md"
                    : "text-white hover:bg-blue-700"
                }`}
              >
                📊 Dashboard
              </button>
              <button
                onClick={() => setPage("ledger")}
                className={`px-4 py-2 rounded-lg font-semibold transition-all ${
                  page === "ledger"
                    ? "bg-white text-blue-700 shadow-md"
                    : "text-white hover:bg-blue-700"
                }`}
              >
                📝 Daily Ledger
              </button>
              <button
                onClick={() => setPage("members")}
                className={`px-4 py-2 rounded-lg font-semibold transition-all ${
                  page === "members"
                    ? "bg-white text-blue-700 shadow-md"
                    : "text-white hover:bg-blue-700"
                }`}
              >
                👥 Members
              </button>
              <button
                onClick={() => setPage("monthly")}
                className={`px-4 py-2 rounded-lg font-semibold transition-all ${
                  page === "monthly"
                    ? "bg-white text-blue-700 shadow-md"
                    : "text-white hover:bg-blue-700"
                }`}
              >
                📅 Monthly View
              </button>
              <button
                onClick={() => setPage("profile")}
                className={`px-4 py-2 rounded-lg font-semibold transition-all ${
                  page === "profile"
                    ? "bg-white text-blue-700 shadow-md"
                    : "text-white hover:bg-blue-700"
                }`}
              >
                👤 Profile
              </button>
              <button
                onClick={handleLogout}
                className="px-4 py-2 rounded-lg font-semibold bg-red-500 text-white hover:bg-red-600 transition-all shadow-md ml-2"
              >
                🚪 Logout
              </button>
            </div>
            <div className="md:hidden flex items-center">
              <select
                onChange={(e) => setPage(e.target.value)}
                value={page}
                className="bg-white border-2 border-blue-300 text-blue-800 text-sm font-semibold rounded-lg p-2.5"
              >
                <option value="dashboard">📊 Dashboard</option>
                <option value="ledger">📝 Ledger</option>
                <option value="members">👥 Members</option>
                <option value="monthly">📅 Monthly</option>
                <option value="profile">👤 Profile</option>
              </select>
              <button
                onClick={handleLogout}
                className="ml-2 p-2 rounded-lg font-semibold bg-red-500 text-white text-xs hover:bg-red-600"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </nav>
      <main className="flex-grow p-4 md:p-6 max-w-6xl mx-auto w-full">
        {renderPage()}
      </main>
      <Footer />
    </div>
  );
};
