import { Outlet, Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { Button } from '../common/Button';
import { 
  LogOut, 
  User, 
  Menu, 
  X, 
  Bell, 
  Home, 
  Search, 
  Calendar, 
  QrCode, 
  Building2, 
  Sparkles,
  MapPin,
  ChevronRight,
  Shield
} from 'lucide-react';
import { useState, useEffect, useCallback } from 'react';
import { getUnreadCount } from '../../services/notificationService';
import { apiClient } from '../../services/apiClient';

export function AppShell() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [unreadCount, setUnreadCount] = useState(0);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const fetchUnread = useCallback(async () => {
    try {
      const count = await getUnreadCount();
      let adminCount = 0;
      if (user?.role === 'admin') {
        const tasks = await apiClient.get('/admin/tasks');
        adminCount = tasks.length;
      }
      setUnreadCount(count + adminCount);
    } catch {
      // silently fail — cosmetic count
    }
  }, [user?.role]);

  useEffect(() => {
    fetchUnread();
    const id = setInterval(fetchUnread, 15000);
    return () => clearInterval(id);
  }, [fetchUnread]);

  useEffect(() => {
    if (location.pathname !== '/notifications') {
      fetchUnread();
    }
    setMobileMenuOpen(false); // close mobile menu on route change
  }, [location.pathname, fetchUnread]);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  // If in admin mode, keep admin full-bleed layout
  if (location.pathname.startsWith('/admin')) {
    return (
      <div className="min-h-screen bg-[#F6F7FB] font-sans text-[#252638]">
        <Outlet />
      </div>
    );
  }

  const studentNavItems = [
    { label: 'Home', path: '/', icon: Home },
    { label: 'Find Seats', path: '/campus', icon: Search },
    { label: 'My Reservations', path: '/reservations', icon: Calendar },
    { label: 'Notifications', path: '/notifications', icon: Bell, badge: unreadCount },
  ];

  const displayName = user?.name || user?.email?.split('@')[0] || 'Student';

  return (
    <div className="min-h-screen flex flex-col bg-[#F7F8FC] font-sans text-[#0F0D26] selection:bg-[#6850F4]/15">
      {/* ─── Premium Student Header ─────────────────────────────────────────── */}
      <header className="sticky top-0 z-50 w-full bg-white/95 backdrop-blur-md border-b border-[#E8EBF2] shadow-[0_2px_12px_rgba(15,13,38,0.03)]">
        <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8 flex h-16 items-center justify-between">
          {/* Logo & Campus Tag */}
          <div className="flex items-center space-x-3.5">
            <Link to="/" className="flex items-center space-x-3 group" title="SITTO Space Hub">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center p-1 group-hover:scale-105 transition-transform duration-200">
                <img
                  src="/sitto-emblem.png"
                  alt="SITTO Emblem"
                  className="w-full h-full object-contain drop-shadow-xs select-none"
                />
              </div>
              <div className="flex flex-col">
                <div className="flex items-center space-x-2">
                  <span className="text-lg font-bold font-heading tracking-tight text-[#0F0D26]">SITTO</span>
                  <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-[#F1EDFF] text-[#6850F4]">
                    Space Hub
                  </span>
                </div>
                <div className="flex items-center text-[11px] text-gray-500 font-medium">
                  <MapPin className="w-3 h-3 text-[#6850F4] mr-1 inline" />
                  SRM KTR Campus
                </div>
              </div>
            </Link>
          </div>

          {/* Desktop Navigation Links */}
          <nav className="hidden md:flex items-center space-x-1 lg:space-x-2">
            {studentNavItems.map(item => {
              const Icon = item.icon;
              const isActive = item.path === '/' 
                ? location.pathname === '/' 
                : location.pathname.startsWith(item.path);

              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`relative flex items-center space-x-2 px-3.5 py-2 rounded-xl text-sm font-semibold transition-all duration-150 ${
                    isActive
                      ? 'bg-[#F1EDFF] text-[#6850F4]'
                      : 'text-gray-600 hover:text-[#0F0D26] hover:bg-gray-100/70'
                  }`}
                >
                  <Icon className={`w-4 h-4 ${isActive ? 'text-[#6850F4]' : 'text-gray-500'}`} />
                  <span>{item.label}</span>
                  {item.badge > 0 && (
                    <span className="ml-1.5 px-1.5 py-0.5 text-[10px] font-bold rounded-full bg-[#6850F4] text-white leading-none">
                      {item.badge > 9 ? '9+' : item.badge}
                    </span>
                  )}
                </Link>
              );
            })}
          </nav>

          {/* Profile & Controls */}
          <div className="flex items-center space-x-3">
            {/* Notification Bell Quick Button */}
            <Link
              to="/notifications"
              className="relative p-2 rounded-xl text-gray-500 hover:text-[#6850F4] hover:bg-[#F1EDFF] transition-colors"
              title="Notifications"
            >
              <Bell className="w-5 h-5" />
              {unreadCount > 0 && (
                <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-[#6850F4] ring-2 ring-white animate-pulse" />
              )}
            </Link>

            {/* Student Profile Chip */}
            <div className="hidden sm:flex items-center pl-3 pr-2 py-1.5 rounded-xl border border-gray-200/80 bg-gray-50/50 hover:bg-gray-50 transition-colors">
              <div className="w-7 h-7 rounded-lg bg-[#6850F4] text-white flex items-center justify-center font-bold text-xs mr-2 shadow-xs">
                {displayName.charAt(0).toUpperCase()}
              </div>
              <div className="flex flex-col text-left mr-2">
                <span className="text-xs font-bold text-[#0F0D26] leading-tight max-w-[120px] truncate">
                  {displayName}
                </span>
                <span className="text-[10px] text-gray-400 font-medium">Student</span>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleLogout}
                className="h-7 px-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg text-xs transition-colors"
                title="Log out"
              >
                <LogOut className="w-3.5 h-3.5" />
              </Button>
            </div>

            {/* Mobile Hamburger Button */}
            <Button
              variant="ghost"
              size="icon"
              className="md:hidden text-gray-600 hover:text-[#0F0D26] hover:bg-gray-100"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              aria-label="Toggle navigation menu"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </Button>
          </div>
        </div>

        {/* Mobile Dropdown Menu */}
        {mobileMenuOpen && (
          <div className="md:hidden border-t border-gray-100 bg-white px-4 pt-3 pb-5 space-y-1 shadow-lg animate-in slide-in-from-top duration-200">
            <div className="flex items-center p-3 mb-2 rounded-xl bg-[#F7F8FC]">
              <div className="w-9 h-9 rounded-xl bg-[#6850F4] text-white flex items-center justify-center font-bold text-sm mr-3">
                {displayName.charAt(0).toUpperCase()}
              </div>
              <div className="flex flex-col flex-1">
                <span className="text-sm font-bold text-[#0F0D26]">{displayName}</span>
                <span className="text-xs text-gray-500">{user?.email}</span>
              </div>
              <span className="text-[11px] font-bold text-[#6850F4] bg-[#F1EDFF] px-2 py-0.5 rounded-full">
                Student
              </span>
            </div>

            {studentNavItems.map(item => {
              const Icon = item.icon;
              const isActive = item.path === '/' 
                ? location.pathname === '/' 
                : location.pathname.startsWith(item.path);

              return (
                <Link
                  key={item.path}
                  to={item.path}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm font-semibold transition-colors ${
                    isActive
                      ? 'bg-[#F1EDFF] text-[#6850F4]'
                      : 'text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  <div className="flex items-center space-x-3">
                    <Icon className={`w-4 h-4 ${isActive ? 'text-[#6850F4]' : 'text-gray-500'}`} />
                    <span>{item.label}</span>
                  </div>
                  {item.badge > 0 && (
                    <span className="px-2 py-0.5 text-xs font-bold rounded-full bg-[#6850F4] text-white">
                      {item.badge}
                    </span>
                  )}
                </Link>
              );
            })}

            <div className="pt-2 mt-2 border-t border-gray-100">
              <button
                onClick={handleLogout}
                className="w-full flex items-center space-x-3 px-3.5 py-2.5 rounded-xl text-sm font-semibold text-red-600 hover:bg-red-50 transition-colors"
              >
                <LogOut className="w-4 h-4 text-red-500" />
                <span>Log Out</span>
              </button>
            </div>
          </div>
        )}
      </header>

      {/* Main Student Page Body */}
      <main className="w-full flex-1 mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        <div key={location.pathname} className="page-transition">
          <Outlet />
        </div>
      </main>

      {/* Subtle Student Space Hub Footer */}
      <footer className="border-t border-[#E8EBF2] bg-white py-6 text-center text-xs text-gray-500">
        <div className="mx-auto max-w-7xl px-4 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center space-x-2">
            <img src="/sitto-emblem.png" alt="SITTO" className="w-4 h-4 object-contain inline-block" />
            <span className="font-bold text-[#0F0D26]">SITTO Space Hub</span>
            <span>•</span>
            <span>SRM Institute of Science and Technology, Kattankulathur</span>
          </div>
          <div className="flex items-center space-x-4 text-gray-400">
            <span>Library & Lab Live Telemetry</span>
            <span>•</span>
            <span>SeatSure™ Verified</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
