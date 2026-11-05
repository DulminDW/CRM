/**
 * WINDOW COMPANIES CRM — CENTRALIZED AUTHENTICATION & PERMISSIONS SERVICE
 * 
 * Strictly client-safe service interfacing with Supabase Auth and database tables:
 * - auth.users (via Supabase Auth)
 * - public.user_profiles
 * - public.user_permissions
 * 
 * Zero service-role keys are used here.
 */

import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { UserProfile, PermissionKey, UserRole } from '../types/auth';

export interface ProfileQueryResult {
  profile: UserProfile | null;
  permissions: PermissionKey[];
  error: Error | null;
}

/**
 * Fetch employee profile and permissions from database tables.
 * Guaranteed to return null profile if unauthenticated or record does not exist.
 */
export async function getEmployeeProfileAndPermissions(userId: string): Promise<ProfileQueryResult> {
  if (!isSupabaseConfigured || !userId) {
    return { profile: null, permissions: [], error: null };
  }

  try {
    // 1. Fetch user profile
    const { data: profileData, error: profileError } = await supabase
      .from('user_profiles')
      .select('id, full_name, role, is_active, created_at, updated_at')
      .eq('id', userId)
      .maybeSingle();

    if (profileError) {
      return { profile: null, permissions: [], error: new Error(profileError.message) };
    }

    if (!profileData) {
      return { profile: null, permissions: [], error: null };
    }

    const profile = profileData as UserProfile;

    // 2. Fetch user permissions
    const { data: permData, error: permError } = await supabase
      .from('user_permissions')
      .select('permission_key')
      .eq('user_id', userId);

    const permissions: PermissionKey[] = [];
    if (!permError && permData) {
      for (const item of permData) {
        if (item.permission_key) {
          permissions.push(item.permission_key as PermissionKey);
        }
      }
    }

    return { profile, permissions, error: null };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to query employee profile';
    return { profile: null, permissions: [], error: new Error(message) };
  }
}

/**
 * Checks if user profile satisfies role requirement.
 */
export function checkUserRole(profile: UserProfile | null, requiredRole: UserRole): boolean {
  if (!profile || !profile.is_active) return false;
  return profile.role === requiredRole;
}

/**
 * Checks if user profile satisfies permission requirement.
 * Admins implicitly possess all permissions.
 */
export function checkUserPermission(
  profile: UserProfile | null,
  permissions: PermissionKey[],
  requiredPermission: PermissionKey
): boolean {
  if (!profile || !profile.is_active) return false;
  if (profile.role === 'ADMIN') return true;
  return permissions.includes(requiredPermission);
}

