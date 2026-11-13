// ==============================================================================
// WINDOW COMPANIES CRM — EMPLOYEE & ACCESS DATA CONTRACTS
// ==============================================================================

export type UserRole = 'ADMIN' | 'STAFF';

export type UserPermissionKey = 'CAN_MANAGE_RATES' | 'CAN_MANAGE_USERS' | 'CAN_CREATE_CHAT_GROUPS';

export interface EmployeeProfileRecord {
  id: string;
  full_name: string;
  role: UserRole;
  department: string | null;
  phone?: string | null;
  last_login_at?: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  // Auth user email (joined or fetched via secure RPC/view)
  email?: string;
  permissions?: UserPermissionKey[];
}

export interface CreateEmployeeInput {
  full_name: string;
  email: string;
  role: UserRole;
  password?: string;
  department?: string;
  phone?: string;
  permissions?: UserPermissionKey[];
}

export interface UpdateEmployeeInput {
  full_name?: string;
  role?: UserRole;
  department?: string;
  phone?: string;
  is_active?: boolean;
  permissions?: UserPermissionKey[];
}

