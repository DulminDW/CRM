import React from 'react';
import { Menu, ShieldCheck, UserCheck, Bell } from 'lucide-react';

interface NavbarProps {
  onToggleSidebar: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({ onToggleSidebar }) => {
  return (
    <header className="h-16 bg-white border-b border-crm-border sticky top-0 z-30 flex items-center justify-between px-4 lg:px-8">
      {/* Left items: Mobile toggle + breadcrumb hint */}
      <div className="flex items-center space-x-3">
        <button
          onClick={onToggleSidebar}
          className="lg:hidden p-2 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-100 focus:outline-none"
          aria-label="Toggle navigation"
        >
          <Menu className="w-5 h-5" />
        </button>
        <div className="hidden sm:flex items-center space-x-2 text-xs font-medium text-slate-500">
          <span className="font-semibold text-crm-navy">WINDOW COMPANIES CRM</span>
          <span>/</span>
          <span className="text-slate-700">Internal Sales & Rate Console</span>
        </div>
      </div>

      {/* Right items: Security posture banner + placeholder staff indicator */}
      <div className="flex items-center space-x-3 sm:space-x-4">
        {/* Security Phase Indicator Badge */}
        <div className="hidden md:flex items-center space-x-1.5 px-2.5 py-1 rounded-full bg-amber-50 border border-amber-200 text-[11px] text-amber-900 font-medium">
          <ShieldCheck className="w-3.5 h-3.5 text-amber-700" />
          <span>Phase 1 Architecture Shell (Pre-Auth / No Live DB)</span>
        </div>

        {/* Notifications Icon (Mock placeholder) */}
        <button
          className="p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg relative"
          title="Notifications preview"
          aria-label="Notifications"
        >
          <Bell className="w-4 h-4" />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-crm-blue rounded-full"></span>
        </button>

        {/* Staff Identity Status (Transparently marked as pre-auth placeholder) */}
        <div className="flex items-center space-x-2 pl-2 border-l border-slate-200">
          <div className="w-8 h-8 rounded-full bg-crm-navy text-white flex items-center justify-center font-semibold text-xs">
            <UserCheck className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="hidden sm:block text-left">
            <p className="text-xs font-semibold text-slate-800 leading-tight">Intern Dev Console</p>
            <p className="text-[10px] text-slate-500">Pre-Auth Sandbox</p>
          </div>
        </div>
      </div>
    </header>
  );
};
