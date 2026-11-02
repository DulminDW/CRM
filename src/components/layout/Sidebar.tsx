import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  Building2,
  Globe2,
  Users2,
  Hotel,
  CalendarDays,
  Percent,
  Sparkles,
  Calculator,
  Send,
  PhoneCall,
  MessageSquare,
  Bell,
  BarChart3,
  Settings,
  ShieldAlert,
  X
} from 'lucide-react';

interface SidebarItem {
  name: string;
  path: string;
  icon: React.ComponentType<{ className?: string }>;
  section?: string;
  badge?: string;
}

const NAV_ITEMS: SidebarItem[] = [
  { section: 'Overview', name: 'Dashboard', path: '/', icon: LayoutDashboard },
  
  { section: 'Agencies & Contacts', name: 'Travel Agencies', path: '/agencies', icon: Building2 },
  { section: 'Agencies & Contacts', name: 'Markets', path: '/markets', icon: Globe2 },
  { section: 'Agencies & Contacts', name: 'Members', path: '/members', icon: Users2 },

  { section: 'Hotels & Pricing', name: 'Hotels', path: '/hotels', icon: Hotel },
  { section: 'Hotels & Pricing', name: 'Hotel Seasons', path: '/seasons', icon: CalendarDays },
  { section: 'Hotels & Pricing', name: 'Rate Management', path: '/rates', icon: Percent },
  { section: 'Hotels & Pricing', name: 'Special Rates', path: '/special-rates', icon: Sparkles, badge: '1-3' },
  { section: 'Hotels & Pricing', name: 'Rate Calculator', path: '/calculator', icon: Calculator },

  { section: 'Distribution & Sales', name: 'Share Rates', path: '/share-rates', icon: Send },
  { section: 'Distribution & Sales', name: 'Sales Activities', path: '/sales-activities', icon: PhoneCall },

  { section: 'Communication', name: 'Team Chat', path: '/team-chat', icon: MessageSquare },
  { section: 'Communication', name: 'Notifications', path: '/notifications', icon: Bell },

  { section: 'Intelligence & Admin', name: 'Analytics & Reports', path: '/analytics', icon: BarChart3 },
  { section: 'Intelligence & Admin', name: 'Settings', path: '/settings', icon: Settings },
];

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ isOpen, onClose }) => {
  let currentSection = '';

  return (
    <>
      {/* Mobile backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      {/* Sidebar container */}
      <aside
        className={`fixed top-0 bottom-0 left-0 z-50 w-64 flex flex-col bg-crm-navy text-white transition-transform duration-200 ease-in-out lg:translate-x-0 ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Brand Header */}
        <div className="flex items-center justify-between h-16 px-5 border-b border-white/10 bg-crm-navy-dark">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 rounded-lg bg-crm-blue flex items-center justify-center font-bold text-white shadow-sm">
              W
            </div>
            <div>
              <h1 className="text-sm font-bold tracking-wide uppercase text-white">WINDOW CRM</h1>
              <p className="text-[10px] text-slate-400 font-medium">Internal Rate & Sales Desk</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="lg:hidden p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10"
            aria-label="Close navigation"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation list */}
        <div className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
          {NAV_ITEMS.map((item) => {
            const showSection = item.section && item.section !== currentSection;
            if (showSection) {
              currentSection = item.section || '';
            }

            return (
              <React.Fragment key={item.path}>
                {showSection && (
                  <div className="pt-4 pb-1 px-3 text-[10px] font-semibold tracking-wider uppercase text-slate-400">
                    {item.section}
                  </div>
                )}
                <NavLink
                  to={item.path}
                  onClick={onClose}
                  className={({ isActive }) =>
                    `flex items-center justify-between px-3 py-2 text-xs font-medium rounded-lg transition-colors ${
                      isActive
                        ? 'bg-crm-blue text-white shadow-sm'
                        : 'text-slate-300 hover:text-white hover:bg-white/5'
                    }`
                  }
                >
                  <div className="flex items-center space-x-3">
                    <item.icon className="w-4 h-4 text-slate-300" />
                    <span>{item.name}</span>
                  </div>
                  {item.badge && (
                    <span className="px-1.5 py-0.5 text-[10px] font-semibold bg-white/20 text-white rounded">
                      {item.badge}
                    </span>
                  )}
                </NavLink>
              </React.Fragment>
            );
          })}
        </div>

        {/* Security Indicator Footer */}
        <div className="p-3 border-t border-white/10 bg-crm-navy-dark">
          <div className="flex items-start space-x-2 p-2 rounded-lg bg-white/5 border border-white/10">
            <ShieldAlert className="w-4 h-4 text-amber-400 mt-0.5 flex-shrink-0" />
            <div className="text-[11px] leading-tight">
              <span className="font-semibold text-amber-300">Phase 1: Architecture Shell</span>
              <p className="text-slate-400 text-[10px] mt-0.5">Authentication & RLS strictly unconfigured until Phase 2 approval.</p>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
};
