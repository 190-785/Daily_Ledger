import { useState } from 'react';
import Sidebar from './Sidebar';
import Header from './Header';
import BottomNav from './BottomNav';
import Footer from './Footer';

export default function Layout({ children, userProfile }) {
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  const handleToggleSidebar = () => {
    setIsSidebarCollapsed(!isSidebarCollapsed);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Sidebar - Desktop Only */}
      <div className="hidden md:block">
        <Sidebar 
          isCollapsed={isSidebarCollapsed} 
          onToggleCollapse={handleToggleSidebar} 
        />
      </div>

      {/* Header */}
      <Header 
        userProfile={userProfile} 
        isSidebarCollapsed={isSidebarCollapsed} 
      />

      {/* Main Content Area */}
      <main
        className={`
          transition-all duration-300
          pt-16 pb-20 md:pb-6
          ${isSidebarCollapsed ? 'md:ml-20' : 'md:ml-64'}
        `}
      >
        <div className="p-4 md:p-6 max-w-7xl mx-auto">
          {children}
        </div>
      </main>

      {/* Bottom Navigation - Mobile Only */}
      <BottomNav />

      {/* Footer - Desktop Only (optional, hidden on mobile to avoid conflict with bottom nav) */}
      <footer
        className={`
          hidden md:block
          transition-all duration-300
          ${isSidebarCollapsed ? 'md:ml-20' : 'md:ml-64'}
        `}
      >
        <Footer />
      </footer>
    </div>
  );
}
