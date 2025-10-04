import React, { useState, useEffect } from "react";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import { onAuthStateChanged } from "firebase/auth";
import { auth, getUserProfile } from "./firebase";

import LoginPage from "./pages/LoginPage";
import SignupPage from "./pages/SignupPage";
import DashboardPage from "./pages/DashboardPage";
import LedgerPage from "./pages/LedgerPage";
import MembersPage from "./pages/MembersPage";
import MonthlyViewPage from "./pages/MonthlyViewPage";
import ProfilePage from "./pages/ProfilePage";
import ListsPage from "./pages/ListsPage";
import SharedListViewPage from "./pages/SharedListViewPage";
import Layout from "./components/Layout";

export default function App() {
  return (
    <Router>
      <AppContent />
    </Router>
  );
}

function AppContent() {
  const [user, setUser] = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      
      if (currentUser) {
        // Fetch user profile including username
        try {
          const profile = await getUserProfile(currentUser.uid);
          setUserProfile(profile);
        } catch (error) {
          console.error("Error fetching user profile:", error);
        }
      } else {
        setUserProfile(null);
      }
      
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
    return (
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/signup" element={<SignupPage />} />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    );
  }

  return <MainApp user={user} userProfile={userProfile} />;
}

const MainApp = ({ user, userProfile }) => {
  return (
    <Layout userProfile={userProfile}>
      <Routes>
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="/dashboard" element={<DashboardPage userId={user.uid} />} />
        <Route path="/ledger" element={<LedgerPage userId={user.uid} />} />
        <Route path="/members" element={<MembersPage userId={user.uid} />} />
        <Route path="/monthly" element={<MonthlyViewPage userId={user.uid} />} />
        <Route path="/lists" element={<ListsPage userId={user.uid} />} />
        <Route path="/lists/shared/:listId" element={<SharedListViewPage userId={user.uid} />} />
        <Route path="/profile" element={<ProfilePage userProfile={userProfile} />} />
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </Layout>
  );
};
