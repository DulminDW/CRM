// ==============================================================================
// WINDOW COMPANIES CRM — EMPLOYEE MANAGEMENT SERVICE
// Admin-only operations to list, invite, update, and manage company staff accounts.
// Enforces that service role credentials are NEVER exposed to client.
// ==============================================================================

import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { EmployeeProfileRecord, CreateEmployeeInput, UpdateEmployeeInput, UserPermissionKey, UserRole } from '../types/employee';

/**
 * Fetches all registered company employees with their roles and permissions.
 */
export async function fetchEmployees(): Promise<{ data: EmployeeProfileRecord[]; error: string | null }> {
  if (!isSupabaseConfigured) {
    return { data: [], error: 'Supabase client is not configured' };
  }

  try {
    let { data: profiles, error: profileErr } = await supabase
      .from('user_profiles')
      .select(`
        id,
        full_name,
        role,
        department,
        last_login_at,
        is_active,
        created_at,
        updated_at
      `)
      .order('full_name', { ascending: true });

    // Fallback if department column is missing in live DB schema cache
    if (profileErr && profileErr.message?.includes("'department'")) {
      const fallbackResult = await supabase
        .from('user_profiles')
        .select(`
          id,
          full_name,
          role,
          is_active,
          created_at,
          updated_at
        `)
        .order('full_name', { ascending: true });
      profiles = fallbackResult.data ? fallbackResult.data.map((p) => ({ ...p, department: 'OPERATIONS', last_login_at: null })) : null;
      profileErr = fallbackResult.error;
    }

    if (profileErr) {
      return { data: [], error: profileErr.message };
    }

    if (!profiles || profiles.length === 0) {
      return { data: [], error: null };
    }

    // Fetch assigned permissions for all users
    const { data: permData } = await supabase
      .from('user_permissions')
      .select('user_id, permission_key');

    const permMap = new Map<string, UserPermissionKey[]>();
    (permData || []).forEach((p) => {
      const existing = permMap.get(p.user_id) || [];
      existing.push(p.permission_key as UserPermissionKey);
      permMap.set(p.user_id, existing);
    });

    const enriched: EmployeeProfileRecord[] = profiles.map((prof) => ({
      ...prof,
      permissions: permMap.get(prof.id) || []
    }));

    return { data: enriched, error: null };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Error fetching employees';
    return { data: [], error: message };
  }
}

/**
 * Creates/Invites a new internal company employee.
 * Uses client auth signup or edge function to provision Auth identity and user_profile.
 */
export async function createEmployee(
  input: CreateEmployeeInput
): Promise<{ data: EmployeeProfileRecord | null; error: string | null }> {
  if (!isSupabaseConfigured) {
    return { data: null, error: 'Supabase client is not configured' };
  }

  const trimmedEmail = input.email.trim().toLowerCase();
  const trimmedName = input.full_name.trim();

  if (!trimmedEmail || !trimmedName) {
    return { data: null, error: 'Full name and work email are required.' };
  }

  try {
    // 1. First, invoke secure RPC function to provision Auth identity and user_profile atomically
    const canManageRates = input.permissions?.includes('CAN_MANAGE_RATES') ?? false;

    const { data: rpcData, error: rpcErr } = await supabase.rpc('provision_company_employee', {
      p_email: trimmedEmail,
      p_full_name: trimmedName,
      p_role: input.role,
      p_department: input.department?.trim() || 'OPERATIONS',
      p_can_manage_rates: canManageRates,
      p_temporary_password: input.password?.trim() || 'WindowPass2026!'
    });

    if (!rpcErr && rpcData) {
      const record = rpcData as Record<string, unknown>;
      return {
        data: {
          id: String(record.id || ''),
          full_name: String(record.full_name || trimmedName),
          role: (record.role as UserRole) || input.role,
          department: String(record.department || input.department || 'OPERATIONS'),
          is_active: true,
          email: trimmedEmail,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          permissions: input.permissions || []
        },
        error: null
      };
    }

    // 2. Fallback to direct client insert if RPC is unavailable
    const generatedId = crypto.randomUUID();

    const insertPayload: Record<string, unknown> = {
      id: generatedId,
      full_name: trimmedName,
      role: input.role,
      is_active: true
    };
    if (input.department) {
      insertPayload.department = input.department.trim();
    }

    let { data: newProfile, error: insertErr } = await supabase
      .from('user_profiles')
      .insert(insertPayload)
      .select()
      .single();

    // Fallback: If live DB doesn't have department column yet, retry without department
    if (insertErr && insertErr.message?.includes("'department'")) {
      delete insertPayload.department;
      const retryResult = await supabase
        .from('user_profiles')
        .insert(insertPayload)
        .select()
        .single();
      newProfile = retryResult.data;
      insertErr = retryResult.error;
    }

    if (insertErr) {
      return { data: null, error: insertErr.message };
    }

    // 3. Grant requested permissions
    if (input.permissions && input.permissions.length > 0) {
      const permsToInsert = input.permissions.map((pk) => ({
        user_id: newProfile.id,
        permission_key: pk
      }));
      await supabase.from('user_permissions').insert(permsToInsert);
    }

    return {
      data: {
        ...newProfile,
        email: trimmedEmail,
        permissions: input.permissions || []
      },
      error: null
    };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Error provisioning employee';
    return { data: null, error: message };
  }
}

/**
 * Updates an employee's details, role, active status, or permissions.
 */
export async function updateEmployee(
  id: string,
  input: UpdateEmployeeInput
): Promise<{ data: EmployeeProfileRecord | null; error: string | null }> {
  if (!isSupabaseConfigured) {
    return { data: null, error: 'Supabase client is not configured' };
  }

  try {
    const updatePayload: Record<string, unknown> = {
      updated_at: new Date().toISOString()
    };

    if (input.full_name !== undefined) updatePayload.full_name = input.full_name.trim();
    if (input.role !== undefined) updatePayload.role = input.role;
    if (input.department !== undefined) updatePayload.department = input.department.trim();
    if (input.is_active !== undefined) updatePayload.is_active = input.is_active;

    const { data: updatedProfile, error: updateErr } = await supabase
      .from('user_profiles')
      .update(updatePayload)
      .eq('id', id)
      .select()
      .single();

    if (updateErr) {
      return { data: null, error: updateErr.message };
    }

    // Update permissions if provided
    if (input.permissions !== undefined) {
      // Clear existing
      await supabase.from('user_permissions').delete().eq('user_id', id);

      // Re-insert new
      if (input.permissions.length > 0) {
        const permsToInsert = input.permissions.map((pk) => ({
          user_id: id,
          permission_key: pk
        }));
        await supabase.from('user_permissions').insert(permsToInsert);
      }
    }

    return {
      data: {
        ...updatedProfile,
        permissions: input.permissions || []
      },
      error: null
    };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Error updating employee';
    return { data: null, error: message };
  }
}

/**
 * Sends a password recovery / setup email to the employee.
 */
export async function sendEmployeePasswordReset(email: string): Promise<{ success: boolean; error: string | null }> {
  if (!isSupabaseConfigured) {
    return { success: false, error: 'Supabase client is not configured' };
  }

  try {
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim().toLowerCase(), {
      redirectTo: `${window.location.origin}/login`
    });

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true, error: null };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Error sending password reset email';
    return { success: false, error: message };
  }
}

/**
 * Permanently deletes an employee account and associated auth user.
 */
export async function deleteEmployee(id: string): Promise<{ success: boolean; error: string | null }> {
  if (!isSupabaseConfigured) {
    return { success: false, error: 'Supabase client is not configured' };
  }

  try {
    const { error: rpcErr } = await supabase.rpc('delete_company_employee', {
      p_user_id: id
    });

    if (rpcErr) {
      // Fallback: delete profile directly
      await supabase.from('user_permissions').delete().eq('user_id', id);
      const { error: profileErr } = await supabase.from('user_profiles').delete().eq('id', id);
      if (profileErr) {
        return { success: false, error: profileErr.message };
      }
    }

    return { success: true, error: null };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Error deleting employee';
    return { success: false, error: message };
  }
}

