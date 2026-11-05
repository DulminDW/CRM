import React from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
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
  X,
  ShieldCheck,
} from 'lucide-react';

interface SidebarItem {
  name: string;
  path: string;
  icon: React.ComponentType<{ className?: string }>;
  section?: string;
  badge?: string;
  requiredRole?: 'ADMIN' | 'STAFF';
  requiredPermission?: 'CAN_MANAGE_RATES' | 'CAN_MANAGE_USERS' | 'CAN_CREATE_CHAT_GROUPS';
}

const NAV_ITEMS: SidebarItem[] = [
  { section: 'Overview', name: 'Dashboard', path: '/', icon: LayoutDashboard },

  { section: 'Agencies & Contacts', name: 'Travel Agencies', path: '/agencies', icon: Building2 },
  { section: 'Agencies & Contacts', name: 'Markets', path: '/markets', icon: Globe2 },
  { section: 'Agencies & Contacts', name: 'Members', path: '/members', icon: Users2 },

  { section: 'Hotels & Pricing', name: 'Hotels', path: '/hotels', icon: Hotel },
  { section: 'Hotels & Pricing', name: 'Hotel Seasons', path: '/seasons', icon: CalendarDays },
  { section: 'Hotels & Pricing', name: 'Rate Management', path: '/rates', icon: Percent, requiredPermission: 'CAN_MANAGE_RATES' },
  { section: 'Hotels & Pricing', name: 'Special Rates', path: '/special-rates', icon: Sparkles, badge: '1-3', requiredPermission: 'CAN_MANAGE_RATES' },
  { section: 'Hotels & Pricing', name: 'Rate Calculator', path: '/calculator', icon: Calculator },

  { section: 'Distribution & Sales', name: 'Share Rates', path: '/share-rates', icon: Send },
  { section: 'Distribution & Sales', name: 'Sales Activities', path: '/sales-activities', icon: PhoneCall },

  { section: 'Communication', name: 'Team Chat', path: '/team-chat', icon: MessageSquare },
  { section: 'Communication', name: 'Notifications', path: '/notifications', icon: Bell },

  { section: 'Intelligence & Admin', name: 'Analytics & Reports', path: '/analytics', icon: BarChart3 },
  { section: 'Intelligence & Admin', name: 'Admin Activity Log', path: '/activity-log', icon: ShieldAlert, requiredRole: 'ADMIN' },
  { section: 'Intelligence & Admin', name: 'Settings', path: '/settings', icon: Settings, requiredRole: 'ADMIN' },
];

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ isOpen, onClose }) => {
  const { profile, hasPermission } = useAuth();
  const isAdmin = profile?.role === 'ADMIN';

  const filteredItems = NAV_ITEMS.filter((item) => {
    if (item.requiredRole === 'ADMIN' && !isAdmin) return false;
    if (item.requiredPermission && !hasPermission(item.requiredPermission)) return false;
    return true;
  });

  const sections = Array.from(new Set(filteredItems.map((item) => item.section || 'General')));

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpen && (
        <div
          onClick={onClose}
          className="fixed inset-0 z-40 bg-[#061D3D]/60 backdrop-blur-sm lg:hidden animate-fade-in"
          aria-hidden="true"
        />
      )}

      {/* Deep Navy Enterprise Sidebar */}
      <aside
        className={`fixed top-0 bottom-0 left-0 z-50 w-64 bg-[#08264F] border-r border-[#0D3874] flex flex-col transition-transform duration-300 ease-in-out lg:translate-x-0 ${
          isOpen ? 'translate-x-0 shadow-2xl' : '-translate-x-full'
        }`}
      >
        {/* Top Branding Section */}
        <div className="h-16 px-5 flex items-center justify-between border-b border-[#0D3874] bg-[#061D3D]">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#1455D9] to-[#08264F] border border-white/20 flex items-center justify-center text-white font-extrabold text-sm shadow-md">
              W
            </div>
            <div>
              <span className="text-xs font-black tracking-tight text-white block leading-tight">
                WINDOW COMPANIES
              </span>
              <span className="text-[9px] font-bold tracking-widest text-[#EAF2FF]/70 uppercase block">
                Hotel & Travel CRM
              </span>
            </div>
          </div>

          <button
            onClick={onClose}
            className="lg:hidden p-1.5 rounded-lg text-white/60 hover:text-white hover:bg-white/10"
            aria-label="Close menu"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Navigation List */}
        <div className="flex-1 py-4 px-3 overflow-y-auto space-y-5">
          {sections.map((section) => (
            <div key={section} className="space-y-1">
              <div className="px-3 text-[10px] font-bold uppercase tracking-wider text-[#EAF2FF]/50">
                {section}
              </div>

              {filteredItems
                .filter((item) => (item.section || 'General') === section)
                .map((item) => {
                  const Icon = item.icon;
                  return (
                    <NavLink
                      key={item.path}
                      to={item.path}
                      onClick={onClose}
                      end={item.path === '/'}
                      className={({ isActive }) =>
                        `flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold transition-all ${
                          isActive
                            ? 'bg-[#1455D9] text-white shadow-md shadow-[#1455D9]/30 font-bold'
                            : 'text-[#EAF2FF]/80 hover:text-white hover:bg-[#0D3874]/60'
                        }`
                      }
                    >
                      <div className="flex items-center gap-2.5 truncate">
                        <Icon className="w-4 h-4 shrink-0" />
                        <span className="truncate">{item.name}</span>
                      </div>

                      {item.badge && (
                        <span className="px-1.5 py-0.5 text-[10px] font-bold rounded-md bg-[#08264F] border border-white/20 text-[#EAF2FF]">
                          {item.badge}
                        </span>
                      )}
                    </NavLink>
                  );
                })}
            </div>
          ))}
        </div>

        {/* Footer info: Authenticated Status */}
        <div className="p-3 border-t border-[#0D3874] bg-[#061D3D]/60 text-xs">
          <div className="flex items-center gap-2 px-2 py-1.5 rounded-lg bg-white/5 border border-white/10">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
            <div className="truncate text-[11px] text-[#EAF2FF]/80">
              <span className="font-semibold text-white">PostgreSQL RLS</span> Active
            </div>
          </div>
        </div>
      </aside>
    </>
  );
};
