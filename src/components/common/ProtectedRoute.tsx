import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { UserRole, PermissionKey } from '../../types/auth';
import { Loader2, ShieldX, UserX } from 'lucide-react';

interface ProtectedRouteProps {
  children: React.ReactElement;
  requiredRole?: UserRole;
  requiredPermission?: PermissionKey;
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  children,
  requiredRole,
  requiredPermission,
}) => {
  const { session, profile, isLoading, hasRole, hasPermission, isConfigured } = useAuth();
  const location = useLocation();

  // 1. Loading state: Render accessible spinner without triggering redirect loop
  if (isLoading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-crm-bg p-4">
        <Loader2 className="w-8 h-8 text-crm-blue animate-spin mb-3" />
        <p className="text-sm text-slate-600 font-medium">Verifying employee credentials...</p>
      </div>
    );
  }

  // 2. Unauthenticated check: Redirect to Login while preserving target location
  if (!session) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // 3. Authenticated user without matching active profile check
  if (isConfigured && !profile) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-crm-bg p-4">
        <div className="max-w-md w-full bg-white rounded-xl shadow-sm border border-crm-border p-6 text-center">
          <div className="w-12 h-12 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center mx-auto mb-4">
            <UserX className="w-6 h-6" />
          </div>
          <h3 className="text-lg font-bold text-slate-900 mb-2">Profile Pending Provisioning</h3>
          <p className="text-xs text-slate-600 mb-4 leading-relaxed">
            Your login was authenticated, but no active internal employee profile was found in <code className="bg-slate-100 px-1 py-0.5 rounded text-[11px]">user_profiles</code>. Contact your CRM Administrator to activate your account.
          </p>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-crm-navy text-white text-xs font-semibold rounded-lg hover:bg-crm-navy-light"
          >
            Retry Verification
          </button>
        </div>
      </div>
    );
  }

  // 4. Inactive user check
  if (profile && !profile.is_active) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-crm-bg p-4">
        <div className="max-w-md w-full bg-white rounded-xl shadow-sm border border-rose-200 p-6 text-center">
          <div className="w-12 h-12 rounded-full bg-rose-100 text-rose-700 flex items-center justify-center mx-auto mb-4">
            <ShieldX className="w-6 h-6" />
          </div>
          <h3 className="text-lg font-bold text-slate-900 mb-2">Account Deactivated</h3>
          <p className="text-xs text-slate-600 mb-4 leading-relaxed">
            Your employee account has been marked as inactive. Please contact the Window Companies CRM Administrator.
          </p>
        </div>
      </div>
    );
  }

  // 5. Role authorization check (e.g. ADMIN required)
  if (requiredRole && !hasRole(requiredRole)) {
    return (
      <div className="p-8 max-w-2xl mx-auto">
        <div className="bg-white rounded-xl border border-rose-200 shadow-sm p-6 text-center">
          <div className="w-12 h-12 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center mx-auto mb-3">
            <ShieldX className="w-6 h-6" />
          </div>
          <h3 className="text-base font-bold text-slate-900 mb-1">Access Restricted: Admin Only</h3>
          <p className="text-xs text-slate-600 max-w-md mx-auto mb-4">
            You do not possess the required administrator authorization to view this section.
          </p>
        </div>
      </div>
    );
  }

  // 6. Granular permission check (e.g. CAN_MANAGE_RATES)
  if (requiredPermission && !hasPermission(requiredPermission)) {
    return (
      <div className="p-8 max-w-2xl mx-auto">
        <div className="bg-white rounded-xl border border-amber-200 shadow-sm p-6 text-center">
          <div className="w-12 h-12 rounded-full bg-amber-50 text-amber-600 flex items-center justify-center mx-auto mb-3">
            <ShieldX className="w-6 h-6" />
          </div>
          <h3 className="text-base font-bold text-slate-900 mb-1">Permission Required</h3>
          <p className="text-xs text-slate-600 max-w-md mx-auto mb-4">
            This module requires the <code className="bg-slate-100 px-1 py-0.5 rounded text-[11px] font-mono">{requiredPermission}</code> capability. Contact your administrator to request permission.
          </p>
        </div>
      </div>
    );
  }

  // User satisfies all authentication and authorization requirements
  return children;
};

