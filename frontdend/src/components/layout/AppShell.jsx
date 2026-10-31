import { Outlet, Link, useLocation } from 'react-router-dom';
import { useNavigate } from '../../hooks/useNavigate';
import { useAuth } from '../../hooks/useAuth';
import { Button } from '../common/Button';
import { 
  LogOut, 
  User, 
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
import { LegalLinks } from '../../legal/LegalLinks';
import { LiveClock } from '../common/LiveClock';

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

  const handleLogout = async () => {
    await logout();
    navigate('/login', { replace: true });
  };

  // If in admin mode, keep admin full-bleed layout
  if (location.pathname.startsWith('/admin')) {
    return (
      <div className="min-h-screen font-sans text-[#15140F]">
        <Outlet />
      </div>
    );
  }

  const studentNavItems = [
    { label: 'Home', path: '/', icon: Home },
    { label: 'Find Seats', path: '/campus', icon: Search },
    { label: 'My Reservations', shortLabel: 'Bookings', path: '/reservations', icon: Calendar },
    { label: 'Notifications', path: '/notifications', icon: Bell, badge: unreadCount },
  ];

  const displayName = user?.name || user?.email?.split('@')[0] || 'Student';

  return (
    <div className="min-h-screen flex flex-col font-sans text-[#15140F] selection:bg-[#2E4BFF]/15">
      {/* ─── Premium Student Header ─────────────────────────────────────────── */}
      <header className="ios-header sticky top-0 z-50 w-full glass-bar border-b">
        <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8 flex h-16 items-center justify-between">
          {/* Logo & Campus Tag */}
          <div className="flex items-center space-x-3.5">
            <Link to="/" className="flex items-center space-x-3 group" title="SITTO Space Hub">
              <div className="w-10 h-10 flex items-center justify-center group-hover:scale-105 transition-transform duration-300 ease-ios">
                <img
                  src="/sitto-icon.svg"
                  alt="SITTO Emblem"
                  className="w-full h-full rounded-[23%] select-none"
                />
              </div>
              <div className="flex flex-col">
                <div className="flex items-center space-x-2">
                  <span className="text-lg font-bold font-heading tracking-tight text-[#15140F]">SITTO</span>
                  <span className="text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-md bg-[#D7FF3A] text-[#15140F]">
                    Space Hub
                  </span>
                </div>
                <div className="flex items-center text-[11px] text-gray-500 font-mono">
                  <MapPin className="w-3 h-3 text-[#15140F] mr-1 inline" />
                  SRM KTR Campus
                </div>
              </div>
            </Link>
          </div>

          {/* Desktop Navigation Links */}
          <nav className="hidden md:flex items-center gap-1 lg:gap-1.5">
            {studentNavItems.map(item => {
              const Icon = item.icon;
              const isActive = item.path === '/' 
                ? location.pathname === '/' 
                : location.pathname.startsWith(item.path);

              return (
                <Link
                  key={item.path}
                  to={item.path}
                  title={item.label}
                  aria-current={isActive ? 'page' : undefined}
                  className={`relative isolate flex items-center gap-2 px-3 lg:px-3.5 py-2 rounded-xl text-sm font-semibold whitespace-nowrap ${
                    isActive
                      ? 'text-white'
                      : 'text-gray-600 hover:text-[#15140F] hover:bg-[#15140F]/[0.05]'
                  }`}
                >
                  {isActive && (
                    // Shared view-transition name: the pill glides to the new tab on navigation
                    <span
                      aria-hidden="true"
                      className="absolute inset-0 -z-10 rounded-xl paper-nav-pill"
                      style={{ viewTransitionName: 'nav-pill' }}
                    />
                  )}
                  <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-[#D7FF3A]' : 'text-gray-500'}`} />
                  <span className="sr-only lg:not-sr-only">{item.label}</span>
                  {item.badge > 0 && (
                    <span className="lg:ml-1.5 px-1.5 py-0.5 text-[10px] font-mono font-bold rounded-full bg-[#D7FF3A] text-[#15140F] leading-none">
                      {item.badge > 9 ? '9+' : item.badge}
                    </span>
                  )}
                </Link>
              );
            })}
          </nav>

          {/* Profile & Controls */}
          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            <LiveClock className="hidden xl:inline-flex" />

            {/* Notification Bell Quick Button */}
            <Link
              to="/notifications"
              className="hidden md:block relative p-2 rounded-xl text-gray-500 hover:text-[#15140F] hover:bg-[#15140F]/[0.05] transition-colors"
              title="Notifications"
            >
              <Bell className="w-5 h-5" />
              {unreadCount > 0 && (
                <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-[#2E4BFF] ring-2 ring-[#F3F0E8] animate-pulse" />
              )}
            </Link>

            {/* Student Profile Chip */}
            <div className="hidden sm:flex items-center pl-2 pr-1.5 py-1.5 rounded-xl border border-[#E6E1D6] bg-white hover:border-[#D3CDBF] transition-colors">
              <div className="w-7 h-7 rounded-lg bg-[#15140F] text-[#D7FF3A] flex items-center justify-center font-bold text-xs mr-2">
                {displayName.charAt(0).toUpperCase()}
              </div>
              <div className="flex flex-col text-left mr-2">
                <span className="text-xs font-bold text-[#15140F] leading-tight max-w-[120px] truncate whitespace-nowrap">
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

            {/* Mobile account button (navigation lives in the bottom tab bar) */}
            <button
              type="button"
              className="sm:hidden w-9 h-9 rounded-full bg-[#15140F] text-[#D7FF3A] font-bold text-sm flex items-center justify-center"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              aria-label={mobileMenuOpen ? 'Close account menu' : 'Open account menu'}
              aria-expanded={mobileMenuOpen}
            >
              {mobileMenuOpen ? <X className="w-4 h-4" /> : displayName.charAt(0).toUpperCase()}
            </button>
          </div>
        </div>

        {/* Mobile Account Menu */}
        {mobileMenuOpen && (
          <div className="sm:hidden border-t border-[#E6E1D6] px-4 pt-3 pb-5 space-y-1">
            <div className="flex items-center p-3 mb-2 rounded-xl bg-white border border-[#E6E1D6]">
              <div className="w-9 h-9 rounded-xl bg-[#15140F] text-[#D7FF3A] flex items-center justify-center font-bold text-sm mr-3">
                {displayName.charAt(0).toUpperCase()}
              </div>
              <div className="flex flex-col flex-1">
                <span className="text-sm font-bold text-[#15140F]">{displayName}</span>
                <span className="text-xs text-gray-500">{user?.email}</span>
              </div>
              <span className="text-[11px] font-bold text-[#2E4BFF] bg-[#E7EBFF] px-2 py-0.5 rounded-full">
                Student
              </span>
            </div>

            <div>
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
      <main className="w-full flex-1 mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-6 sm:py-8 pb-10 md:pb-8">
        <div key={location.pathname} className="page-transition">
          <Outlet />
        </div>
      </main>

      {/* Subtle Student Space Hub Footer */}
      <footer className="border-t border-[#E6E1D6] py-6 pb-28 md:pb-6 text-center text-xs text-gray-600 font-mono">
        <div className="mx-auto max-w-7xl px-4 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center space-x-2">
            <img src="/sitto-icon.svg" alt="SITTO" className="w-4 h-4 rounded-[22.5%] inline-block" />
            <span className="font-bold text-[#15140F]">SITTO Space Hub</span>
            <span>•</span>
            <span>SRM Institute of Science and Technology, Kattankulathur</span>
          </div>
          <LegalLinks />
        </div>
      </footer>

      {/* iOS-style bottom tab bar (phones and small tablets) */}
      <nav className="ios-tabbar md:hidden" aria-label="Primary">
        <div className="mx-auto grid max-w-md grid-cols-4">
          {studentNavItems.map(item => {
            const Icon = item.icon;
            const isActive = item.path === '/'
              ? location.pathname === '/'
              : location.pathname.startsWith(item.path);
            return (
              <Link
                key={item.path}
                to={item.path}
                className="ios-tab"
                aria-current={isActive ? 'page' : undefined}
              >
                <Icon strokeWidth={isActive ? 2.4 : 1.9} />
                <span>{item.shortLabel || item.label}</span>
                {item.badge > 0 && (
                  <span className="ios-tab-badge">{item.badge > 9 ? '9+' : item.badge}</span>
                )}
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
