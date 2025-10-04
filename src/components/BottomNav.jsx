import { Link, useLocation } from 'react-router-dom';

export default function BottomNav() {
  const location = useLocation();
  
  const isActive = (path) => {
    if (path === '/') return location.pathname === '/dashboard';
    return location.pathname.startsWith(path);
  };

  const navItems = [
    { path: '/dashboard', icon: '📊', label: 'Dashboard' },
    { path: '/ledger', icon: '📝', label: 'Ledger' },
    { path: '/lists', icon: '📋', label: 'Lists' },
    { path: '/members', icon: '👥', label: 'Members' },
    { path: '/profile', icon: '👤', label: 'Profile' },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 shadow-lg z-50 md:hidden">
      <div className="flex justify-around items-center h-16 px-2">
        {navItems.map((item) => (
          <Link
            key={item.path}
            to={item.path}
            className={`
              flex flex-col items-center justify-center gap-1 px-3 py-2 rounded-lg flex-1 transition-all
              ${isActive(item.path)
                ? 'text-blue-600 font-semibold'
                : 'text-gray-600 hover:text-blue-600 hover:bg-blue-50'
              }
            `}
          >
            <span className={`text-2xl ${isActive(item.path) ? 'scale-110' : ''} transition-transform`}>
              {item.icon}
            </span>
            <span className="text-xs whitespace-nowrap">{item.label}</span>
          </Link>
        ))}
      </div>
    </nav>
  );
}
