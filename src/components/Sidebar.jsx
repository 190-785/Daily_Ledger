import { Link, useLocation } from 'react-router-dom';

export default function Sidebar({ isCollapsed, onToggleCollapse }) {
  const location = useLocation();
  
  const isActive = (path) => {
    if (path === '/') return location.pathname === '/dashboard';
    return location.pathname.startsWith(path);
  };

  const navItems = [
    { path: '/dashboard', icon: '📊', label: 'Dashboard' },
    { path: '/ledger', icon: '📝', label: 'Ledger' },
    { path: '/members', icon: '👥', label: 'Members' },
    { path: '/monthly', icon: '📅', label: 'Monthly' },
    { path: '/lists', icon: '📋', label: 'Lists' },
  ];

  return (
    <aside
      className={`
        fixed left-0 top-0 h-full bg-gradient-to-b from-blue-600 to-purple-700 text-white
        transition-all duration-300 ease-in-out z-40 shadow-2xl
        ${isCollapsed ? 'w-20' : 'w-64'}
      `}
    >
      {/* Logo/Brand Area */}
      <div className="h-16 flex items-center justify-between px-4 border-b border-white/20">
        {!isCollapsed && (
          <div className="flex items-center gap-2">
            <span className="text-2xl">📱</span>
            <span className="font-bold text-lg">Daily Ledger</span>
          </div>
        )}
        {isCollapsed && (
          <div className="w-full flex justify-center">
            <span className="text-2xl">📱</span>
          </div>
        )}
      </div>

      {/* Collapse/Expand Button */}
      <button
        onClick={onToggleCollapse}
        className="absolute -right-3 top-20 bg-white text-blue-600 rounded-full w-6 h-6 flex items-center justify-center shadow-lg hover:bg-blue-50 transition-colors"
        title={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
      >
        {isCollapsed ? '→' : '←'}
      </button>

      {/* Navigation Links */}
      <nav className="mt-6 px-2">
        {navItems.map((item) => (
          <Link
            key={item.path}
            to={item.path}
            className={`
              flex items-center gap-3 px-4 py-3 mb-2 rounded-lg transition-all
              ${isActive(item.path)
                ? 'bg-white text-blue-700 shadow-md font-semibold'
                : 'text-white/90 hover:bg-white/10 hover:text-white'
              }
              ${isCollapsed ? 'justify-center' : ''}
            `}
            title={isCollapsed ? item.label : ''}
          >
            <span className="text-xl">{item.icon}</span>
            {!isCollapsed && <span className="font-medium">{item.label}</span>}
          </Link>
        ))}
      </nav>

      {/* Bottom Section - Profile */}
      <div className="absolute bottom-0 left-0 right-0 border-t border-white/20">
        <Link
          to="/profile"
          className={`
            flex items-center gap-3 px-4 py-4 transition-all
            ${isActive('/profile')
              ? 'bg-white text-blue-700 font-semibold'
              : 'text-white/90 hover:bg-white/10 hover:text-white'
            }
            ${isCollapsed ? 'justify-center' : ''}
          `}
          title={isCollapsed ? 'Profile' : ''}
        >
          <span className="text-xl">👤</span>
          {!isCollapsed && <span className="font-medium">Profile</span>}
        </Link>
      </div>
    </aside>
  );
}
