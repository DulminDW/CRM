import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { Navbar } from './Navbar';

export const MainLayout: React.FC = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex">
      {/* Sidebar navigation */}
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      {/* Main content wrapper */}
      <div className="flex-1 flex flex-col min-w-0 lg:pl-64">
        {/* Top Header */}
        <Navbar onToggleSidebar={() => setSidebarOpen(true)} />

        {/* Page Viewport with iOS safe area padding */}
        <main className="flex-1 p-3 sm:p-5 lg:p-8 overflow-y-auto safe-bottom">
          <div className="max-w-7xl mx-auto w-full pb-12 sm:pb-6">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
};
