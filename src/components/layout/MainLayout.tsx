import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { Navbar } from './Navbar';
import { Lock } from 'lucide-react';

export const MainLayout: React.FC = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="min-h-screen bg-crm-bg flex">
      {/* Sidebar navigation */}
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      {/* Main content wrapper */}
      <div className="flex-1 flex flex-col min-w-0 lg:pl-64">
        {/* Top Header */}
        <Navbar onToggleSidebar={() => setSidebarOpen(true)} />

        {/* Global Security Banner for Step 6 & 7 Compliance */}
        <div className="bg-amber-50 border-b border-amber-200 px-4 py-2 text-xs text-amber-900 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Lock className="w-3.5 h-3.5 text-amber-700 flex-shrink-0" />
            <span className="font-semibold">Security Phase 1 Active:</span>
            <span>All pages below are navigational UI shells. Live data, database queries, and credentials remain disabled until user authorization.</span>
          </div>
          <span className="hidden md:inline-block px-2 py-0.5 text-[10px] bg-amber-200 text-amber-950 rounded font-mono font-medium">
            Zero-Trust Prepared
          </span>
        </div>

        {/* Page Viewport */}
        <main className="flex-1 p-4 lg:p-8 overflow-y-auto">
          <div className="max-w-7xl mx-auto">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
};
