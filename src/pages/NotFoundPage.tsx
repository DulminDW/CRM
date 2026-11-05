import React from 'react';
import { Link } from 'react-router-dom';
import { Compass, Home } from 'lucide-react';

export const NotFoundPage: React.FC = () => {
  return (
    <div className="min-h-screen bg-crm-bg flex flex-col items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-xl shadow-sm border border-crm-border p-8 text-center">
        <div className="w-14 h-14 rounded-full bg-slate-100 text-crm-navy flex items-center justify-center mx-auto mb-4">
          <Compass className="w-7 h-7" />
        </div>
        <h1 className="text-2xl font-bold text-slate-900 mb-1">404 - Page Not Found</h1>
        <p className="text-xs text-slate-500 mb-6">
          The requested CRM console route does not exist or has been relocated.
        </p>
        <Link
          to="/"
          className="inline-flex items-center px-4 py-2 bg-crm-navy text-white text-xs font-semibold rounded-lg hover:bg-crm-navy-light transition-colors"
        >
          <Home className="w-4 h-4 mr-2" />
          Return to Dashboard
        </Link>
      </div>
    </div>
  );
};

