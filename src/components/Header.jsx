import { useState } from 'react';
import UserDropdown from './UserDropdown';

export default function Header({ userProfile, isSidebarCollapsed }) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <header 
      className={`
        fixed top-0 right-0 bg-white border-b border-gray-200 shadow-sm z-30 h-16
        transition-all duration-300
        ${isSidebarCollapsed ? 'md:left-20' : 'md:left-64'}
        left-0
      `}
    >
      <div className="h-full flex items-center justify-between px-4 md:px-6">
        {/* Left: Mobile Menu + Logo */}
        <div className="flex items-center gap-4">
          {/* Mobile Menu Button */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden text-gray-600 hover:text-gray-900"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>

          {/* Mobile Logo */}
          <div className="md:hidden flex items-center gap-2">
            <span className="text-2xl">📱</span>
            <span className="font-bold text-lg text-gray-900">Daily Ledger</span>
          </div>

          {/* Desktop Page Title (optional) */}
          <div className="hidden md:block">
            <h1 className="text-xl font-semibold text-gray-900">
              Welcome Back!
            </h1>
          </div>
        </div>

        {/* Right: Notifications + User */}
        <div className="flex items-center gap-4">
          {/* Notifications Icon (placeholder) */}
          <button 
            className="relative p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
            title="Notifications (coming soon)"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
            </svg>
            {/* Notification Badge (example) */}
            <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full"></span>
          </button>

          {/* User Dropdown */}
          <UserDropdown userProfile={userProfile} />
        </div>
      </div>

      {/* Mobile Menu Overlay */}
      {mobileMenuOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 md:hidden z-40"
          onClick={() => setMobileMenuOpen(false)}
        >
          <div 
            className="fixed left-0 top-0 bottom-0 w-64 bg-white shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-4 border-b border-gray-200 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-2xl">📱</span>
                <span className="font-bold text-lg">Daily Ledger</span>
              </div>
              <button
                onClick={() => setMobileMenuOpen(false)}
                className="text-gray-600 hover:text-gray-900"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <nav className="p-4">
              <div className="text-sm text-gray-500 mb-2">Main Navigation</div>
              {/* Menu items would go here, but we're using bottom nav on mobile */}
              <p className="text-sm text-gray-600">Use the bottom navigation bar</p>
            </nav>
          </div>
        </div>
      )}
    </header>
  );
}
