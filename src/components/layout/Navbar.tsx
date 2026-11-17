import React, { useState, useEffect } from 'react';
import { Menu, Bell, LogOut, ChevronDown, ShieldCheck, UserCheck } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { Link, useLocation } from 'react-router-dom';
import { notificationService } from '../../services/notificationService';

interface NavbarProps {
  onToggleSidebar: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({ onToggleSidebar }) => {
  const { profile, signOut } = useAuth();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const location = useLocation();

  useEffect(() => {
    const checkUnread = async () => {
      const res = await notificationService.getMyNotifications();
      setUnreadCount(res.unreadCount);
    };
    checkUnread();
    const interval = setInterval(checkUnread, 30000); // 30s polling for live count
    return () => clearInterval(interval);
  }, []);

  const handleSignOut = async () => {
    await signOut();
  };

  // Generate clean breadcrumb labels
  const ROUTE_LABELS: Record<string, string> = {
    agencies: 'Travel Agencies',
    markets: 'Markets',
    members: 'Members',
    hotels: 'Hotels',
    seasons: 'Hotel Seasons',
    rates: 'Rate Management',
    'special-rates': 'Special Rates',
    calculator: 'Rate Calculator',
    'share-rates': 'Share Rates',
    'sales-activities': 'Rate Sharing History',
    'team-activities': 'Team Visits',
    tasks: 'Employee Daily Tasks',
    employees: 'Company Employees',
    'team-chat': 'Team Chat',
    notifications: 'Notifications',
    analytics: 'Analytics & Reports',
    'bulk-import': 'Bulk Excel Import',
    settings: 'Settings',
  };

  const pathParts = location.pathname.split('/').filter(Boolean);
  const firstPart = pathParts[0] || '';
  const currentTitle = firstPart ? (ROUTE_LABELS[firstPart] || firstPart.charAt(0).toUpperCase() + firstPart.slice(1)) : 'Dashboard';

  return (
    <header className="h-16 bg-white border-b border-[#D9E0EA] sticky top-0 z-30 flex items-center justify-between px-4 lg:px-8">
      {/* Left: Mobile hamburger + Clean Breadcrumbs */}
      <div className="flex items-center gap-3">
        <button
          onClick={onToggleSidebar}
          className="lg:hidden p-2.5 min-h-[44px] min-w-[44px] flex items-center justify-center rounded-lg text-[#667085] hover:text-[#101828] hover:bg-slate-100 focus:outline-none touch-manipulation"
          aria-label="Toggle navigation"
        >
          <Menu className="w-5 h-5" />
        </button>

        <nav aria-label="Breadcrumb" className="flex items-center gap-2 text-xs font-medium text-[#667085]">
          <Link to="/" className="hover:text-[#1455D9] transition-colors">
            Dashboard
          </Link>
          {location.pathname !== '/' && (
            <>
              <span className="text-slate-300">/</span>
              <span className="text-[#101828] font-bold">
                {currentTitle}
              </span>
            </>
          )}
        </nav>
      </div>

      {/* Right: Security Status, Notifications, and User Profile Menu */}
      <div className="flex items-center gap-3 sm:gap-4">
        {/* PostgreSQL RLS status */}
        <div className="hidden md:flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-[11px] text-[#16A34A] font-semibold">
          <ShieldCheck className="w-3.5 h-3.5" />
          <span>RLS Protected</span>
        </div>

        {/* Notifications Icon with Dynamic Unread Counter */}
        <Link
          to="/notifications"
          className="p-2 text-[#667085] hover:text-[#101828] hover:bg-slate-100 rounded-xl relative transition-colors"
          title={unreadCount > 0 ? `${unreadCount} Unread Notifications` : 'Notifications'}
          aria-label="Notifications"
        >
          <Bell className="w-4 h-4" />
          {unreadCount > 0 && (
            <span className="absolute top-1.5 right-1.5 min-w-[16px] h-4 px-1 bg-red-600 text-white rounded-full text-[10px] font-black flex items-center justify-center ring-2 ring-white animate-pulse">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </Link>

        {/* Profile Dropdown */}
        <div className="relative">
          <button
            onClick={() => setDropdownOpen(!dropdownOpen)}
            className="flex items-center gap-2.5 p-1.5 rounded-xl hover:bg-slate-100 transition-colors focus:outline-none"
          >
            <div className="w-8 h-8 rounded-full bg-[#08264F] text-white flex items-center justify-center font-bold text-xs shadow-sm">
              {profile?.full_name ? profile.full_name.charAt(0).toUpperCase() : 'U'}
            </div>
            <div className="hidden sm:block text-left">
              <p className="text-xs font-bold text-[#101828] leading-tight">
                {profile?.full_name || 'CRM Staff'}
              </p>
              <p className="text-[10px] font-semibold text-[#667085] uppercase tracking-wider">
                {profile?.role === 'ADMIN' ? 'Administrator' : 'Sales Staff'}
              </p>
            </div>
            <ChevronDown className="w-3.5 h-3.5 text-[#667085] hidden sm:block" />
          </button>

          {/* Profile Dropdown Menu */}
          {dropdownOpen && (
            <>
              <div 
                className="fixed inset-0 z-40" 
                onClick={() => setDropdownOpen(false)} 
              />
              <div className="absolute right-0 mt-2 w-52 bg-white rounded-xl border border-[#D9E0EA] shadow-xl z-50 py-1.5 text-xs animate-scale-up">
                <div className="px-3 py-2 border-b border-[#D9E0EA]">
                  <p className="font-bold text-[#101828]">{profile?.full_name || 'CRM User'}</p>
                  <p className="text-[11px] text-[#667085] truncate">{profile?.role} Role</p>
                </div>

                <div className="py-1">
                  <div className="px-3 py-1.5 text-[#667085] flex items-center gap-2">
                    <UserCheck className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Session Active</span>
                  </div>
                </div>

                <div className="border-t border-[#D9E0EA] pt-1">
                  <button
                    onClick={() => {
                      setDropdownOpen(false);
                      handleSignOut();
                    }}
                    className="w-full px-3 py-2 text-left text-red-600 hover:bg-red-50 flex items-center gap-2 font-semibold transition-colors"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    <span>Sign Out</span>
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  );
};
