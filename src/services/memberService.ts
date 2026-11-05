/**
 * WINDOW COMPANIES CRM — AGENCY MEMBER SERVICE
 * 
 * Interacts with public.agency_members table using authorized Supabase client.
 * Features:
 * - Pre-flight duplicate email detection with rich context (Agency, Market, Name).
 * - Composite foreign key validation (market_id must strictly belong to agency_id).
 * - Email regex format validation before submission.
 */

import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { AgencyMemberRecord, RecordStatus, DuplicateEmailCheckResult } from '../types/agencyHierarchy';

export interface CreateMemberInput {
  agency_id: string;
  market_id: string;
  full_name: string;
  email: string;
  phone?: string;
  position?: string;
  member_code?: string;
  status?: RecordStatus;
}

export interface UpdateMemberInput {
  agency_id?: string;
  market_id?: string;
  full_name?: string;
  email?: string;
  phone?: string;
  position?: string;
  member_code?: string;
  status?: RecordStatus;
}

const EMAIL_REGEX = /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/;

export async function checkDuplicateEmail(
  email: string,
  targetAgencyId: string,
  targetMarketId: string,
  excludeMemberId?: string
): Promise<DuplicateEmailCheckResult> {
  if (!isSupabaseConfigured) {
    return { isDuplicate: false, isSameAgencyMarket: false };
  }

  const normalized = email.trim().toLowerCase();
  if (!normalized) {
    return { isDuplicate: false, isSameAgencyMarket: false };
  }

  try {
    let query = supabase
      .from('agency_members')
      .select(`
        id,
        full_name,
        email,
        agency_id,
        market_id,
        travel_agencies:agency_id (name),
        agency_markets (market_name)
      `)
      .ilike('email', normalized);

    if (excludeMemberId) {
      query = query.neq('id', excludeMemberId);
    }

    const { data, error } = await query.maybeSingle();

    if (error || !data) {
      return { isDuplicate: false, isSameAgencyMarket: false };
    }

    interface DuplicateMemberRow {
      id: string;
      full_name: string;
      email: string;
      agency_id: string;
      market_id: string;
      travel_agencies: { name: string } | null;
      agency_markets: { market_name: string } | null;
    }

    const row = data as unknown as DuplicateMemberRow;
    const isSameAgencyMarket = (row.agency_id === targetAgencyId && row.market_id === targetMarketId);

    return {
      isDuplicate: true,
      isSameAgencyMarket,
      existingMember: {
        id: row.id,
        full_name: row.full_name,
        email: row.email,
        agency_id: row.agency_id,
        market_id: row.market_id,
        agency_name: row.travel_agencies?.name || 'Unknown Agency',
        market_name: row.agency_markets?.market_name || 'Unknown Market',
      },
    };
  } catch {
    return { isDuplicate: false, isSameAgencyMarket: false };
  }
}

export async function fetchMembers(agencyId?: string, marketId?: string): Promise<{ data: AgencyMemberRecord[]; error: string | null }> {
  if (!isSupabaseConfigured) {
    return { data: [], error: 'Supabase client is not configured' };
  }

  try {
    let query = supabase
      .from('agency_members')
      .select(`
        id,
        agency_id,
        market_id,
        full_name,
        email,
        phone,
        position,
        member_code,
        status,
        created_at,
        updated_at,
        travel_agencies:agency_id (name),
        agency_markets (market_name)
      `)
      .order('full_name', { ascending: true });

    if (agencyId) {
      query = query.eq('agency_id', agencyId);
    }

    if (marketId) {
      query = query.eq('market_id', marketId);
    }

    const { data: members, error } = await query;

    if (error) {
      return { data: [], error: error.message };
    }

    if (!members) {
      return { data: [], error: null };
    }

    interface MemberQueryRow {
      id: string;
      agency_id: string;
      market_id: string;
      full_name: string;
      email: string;
      phone: string | null;
      position: string | null;
      member_code: string | null;
      status: RecordStatus;
      created_at: string;
      updated_at: string;
      travel_agencies: { name: string } | null;
      agency_markets: { market_name: string } | null;
    }

    const typedMembers = (members || []) as unknown as MemberQueryRow[];

    const formatted: AgencyMemberRecord[] = typedMembers.map((mem) => ({
      id: mem.id,
      agency_id: mem.agency_id,
      market_id: mem.market_id,
      full_name: mem.full_name,
      email: mem.email,
      phone: mem.phone,
      position: mem.position,
      member_code: mem.member_code,
      status: mem.status,
      created_at: mem.created_at,
      updated_at: mem.updated_at,
      agency_name: mem.travel_agencies?.name || 'Unknown Agency',
      market_name: mem.agency_markets?.market_name || 'Unknown Market',
    }));

    return { data: formatted, error: null };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error fetching members';
    return { data: [], error: message };
  }
}

export async function createMember(input: CreateMemberInput): Promise<{ data: AgencyMemberRecord | null; error: string | null }> {
  if (!isSupabaseConfigured) {
    return { data: null, error: 'Supabase client is not configured' };
  }

  if (!input.agency_id) {
    return { data: null, error: 'Travel agency must be selected' };
  }
  if (!input.market_id) {
    return { data: null, error: 'Market desk must be selected' };
  }

  const trimmedName = input.full_name.trim();
  if (trimmedName.length < 2) {
    return { data: null, error: 'Full name must be at least 2 characters' };
  }

  const trimmedEmail = input.email.trim();
  if (!EMAIL_REGEX.test(trimmedEmail)) {
    return { data: null, error: 'Please enter a valid email address (e.g., name@agency.com)' };
  }

  try {
    // Verify market belongs to agency (composite safety)
    const { data: marketCheck, error: marketCheckErr } = await supabase
      .from('agency_markets')
      .select('id')
      .eq('id', input.market_id)
      .eq('agency_id', input.agency_id)
      .maybeSingle();

    if (marketCheckErr || !marketCheck) {
      return { data: null, error: 'The selected market desk does not belong to the selected travel agency' };
    }

    const { data, error } = await supabase
      .from('agency_members')
      .insert({
        agency_id: input.agency_id,
        market_id: input.market_id,
        full_name: trimmedName,
        email: trimmedEmail,
        phone: input.phone?.trim() || null,
        position: input.position?.trim() || null,
        member_code: input.member_code?.trim() || null,
        status: input.status || 'ACTIVE',
      })
      .select(`
        id,
        agency_id,
        market_id,
        full_name,
        email,
        phone,
        position,
        member_code,
        status,
        created_at,
        updated_at,
        travel_agencies:agency_id (name),
        agency_markets (market_name)
      `)
      .single();

    if (error) {
      return { data: null, error: error.message };
    }

    interface SingleMemberRow {
      travel_agencies: { name: string } | null;
      agency_markets: { market_name: string } | null;
    }
    const singleRow = data as unknown as SingleMemberRow;

    const formatted: AgencyMemberRecord = {
      id: data.id,
      agency_id: data.agency_id,
      market_id: data.market_id,
      full_name: data.full_name,
      email: data.email,
      phone: data.phone,
      position: data.position,
      member_code: data.member_code,
      status: data.status,
      created_at: data.created_at,
      updated_at: data.updated_at,
      agency_name: singleRow.travel_agencies?.name || 'Unknown Agency',
      market_name: singleRow.agency_markets?.market_name || 'Unknown Market',
    };

    return { data: formatted, error: null };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error creating member';
    return { data: null, error: message };
  }
}

export async function updateMember(id: string, input: UpdateMemberInput): Promise<{ data: AgencyMemberRecord | null; error: string | null }> {
  if (!isSupabaseConfigured) {
    return { data: null, error: 'Supabase client is not configured' };
  }

  const updates: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  };

  if (input.full_name !== undefined) {
    const trimmed = input.full_name.trim();
    if (trimmed.length < 2) {
      return { data: null, error: 'Full name must be at least 2 characters' };
    }
    updates.full_name = trimmed;
  }

  if (input.email !== undefined) {
    const trimmedEmail = input.email.trim();
    if (!EMAIL_REGEX.test(trimmedEmail)) {
      return { data: null, error: 'Please enter a valid email address' };
    }
    updates.email = trimmedEmail;
  }

  if (input.phone !== undefined) updates.phone = input.phone.trim() || null;
  if (input.position !== undefined) updates.position = input.position.trim() || null;
  if (input.member_code !== undefined) updates.member_code = input.member_code.trim() || null;
  if (input.status !== undefined) updates.status = input.status;

  if (input.agency_id && input.market_id) {
    // Validate composite market relationship
    const { data: marketCheck, error: marketCheckErr } = await supabase
      .from('agency_markets')
      .select('id')
      .eq('id', input.market_id)
      .eq('agency_id', input.agency_id)
      .maybeSingle();

    if (marketCheckErr || !marketCheck) {
      return { data: null, error: 'The selected market desk does not belong to the selected travel agency' };
    }
    updates.agency_id = input.agency_id;
    updates.market_id = input.market_id;
  }

  try {
    const { data, error } = await supabase
      .from('agency_members')
      .update(updates)
      .eq('id', id)
      .select(`
        id,
        agency_id,
        market_id,
        full_name,
        email,
        phone,
        position,
        member_code,
        status,
        created_at,
        updated_at,
        travel_agencies:agency_id (name),
        agency_markets (market_name)
      `)
      .single();

    if (error) {
      return { data: null, error: error.message };
    }

    interface SingleMemberRow {
      travel_agencies: { name: string } | null;
      agency_markets: { market_name: string } | null;
    }
    const singleRow = data as unknown as SingleMemberRow;

    const formatted: AgencyMemberRecord = {
      id: data.id,
      agency_id: data.agency_id,
      market_id: data.market_id,
      full_name: data.full_name,
      email: data.email,
      phone: data.phone,
      position: data.position,
      member_code: data.member_code,
      status: data.status,
      created_at: data.created_at,
      updated_at: data.updated_at,
      agency_name: singleRow.travel_agencies?.name || 'Unknown Agency',
      market_name: singleRow.agency_markets?.market_name || 'Unknown Market',
    };

    return { data: formatted, error: null };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error updating member';
    return { data: null, error: message };
  }
}

export async function deleteMember(id: string): Promise<{ success: boolean; error: string | null }> {
  if (!isSupabaseConfigured) {
    return { success: false, error: 'Supabase client is not configured' };
  }

  try {
    const { error } = await supabase
      .from('agency_members')
      .delete()
      .eq('id', id);

    if (error) {
      if (error.code === '23503') {
        return { success: false, error: 'Cannot delete member because quotes or sales records exist for this contact. Deactivate instead.' };
      }
      return { success: false, error: error.message };
    }

    return { success: true, error: null };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error deleting member';
    return { success: false, error: message };
  }
}
