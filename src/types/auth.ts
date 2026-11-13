// Type definitions for Authentication, Roles, and Permissions

export type UserRole = 'ADMIN' | 'STAFF';

export type PermissionKey = 'CAN_MANAGE_RATES' | 'CAN_MANAGE_USERS' | 'CAN_CREATE_CHAT_GROUPS';

export interface UserProfile {
  id: string; // matches auth.users(id)
  full_name: string;
  role: UserRole;
  is_active: boolean;
  department?: string | null;
  last_login_at?: string | null;
  created_at: string;
  updated_at: string;
}

export interface UserPermission {
  id: string;
  user_id: string;
  permission_key: PermissionKey;
  granted_by: string;
  granted_at: string;
}

export interface AuthState {
  session: import('@supabase/supabase-js').Session | null;
  user: import('@supabase/supabase-js').User | null;
  profile: UserProfile | null;
  permissions: PermissionKey[];
  isLoading: boolean;
  isConfigured: boolean;
  error: string | null;
}

export interface AuthContextType extends AuthState {
  signInWithEmail: (email: string, password: string, rememberMe?: boolean) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  hasRole: (role: UserRole) => boolean;
  hasPermission: (permission: PermissionKey) => boolean;
  canManageRates: () => boolean;
  refreshProfile: () => Promise<void>;
}

