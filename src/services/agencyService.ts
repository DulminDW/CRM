/**
 * WINDOW COMPANIES CRM — TRAVEL AGENCY SERVICE
 * 
 * Interacts with public.travel_agencies table using authorized Supabase client.
 * Enforces schema constraints and RLS compliance.
 */

import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { TravelAgencyRecord, RecordStatus } from '../types/agencyHierarchy';

export interface CreateAgencyInput {
  name: string;
  code?: string;
  country?: string;
  city?: string;
  address?: string;
  phone?: string;
  email?: string;
  internal_notes?: string;
  status?: RecordStatus;
}

export interface UpdateAgencyInput {
  name?: string;
  code?: string;
  country?: string;
  city?: string;
  address?: string;
  phone?: string;
  email?: string;
  internal_notes?: string;
  status?: RecordStatus;
}

export async function fetchAgencies(): Promise<{ data: TravelAgencyRecord[]; error: string | null }> {
  if (!isSupabaseConfigured) {
    return { data: [], error: 'Supabase client is not configured' };
  }

  try {
    // 1. Fetch all agencies ordered by name
    const { data: agencies, error: agencyError } = await supabase
      .from('travel_agencies')
      .select('*')
      .order('name', { ascending: true });

    if (agencyError) {
      return { data: [], error: agencyError.message };
    }

    if (!agencies || agencies.length === 0) {
      return { data: [], error: null };
    }

    // 2. Fetch market counts per agency
    const { data: marketData, error: marketError } = await supabase
      .from('agency_markets')
      .select('agency_id');

    // 3. Fetch member counts per agency
    const { data: memberData, error: memberError } = await supabase
      .from('agency_members')
      .select('agency_id');

    const marketCounts: Record<string, number> = {};
    if (!marketError && marketData) {
      for (const m of marketData) {
        marketCounts[m.agency_id] = (marketCounts[m.agency_id] || 0) + 1;
      }
    }

    const memberCounts: Record<string, number> = {};
    if (!memberError && memberData) {
      for (const mem of memberData) {
        memberCounts[mem.agency_id] = (memberCounts[mem.agency_id] || 0) + 1;
      }
    }

    const enriched: TravelAgencyRecord[] = agencies.map(agency => ({
      ...agency,
      market_count: marketCounts[agency.id] || 0,
      member_count: memberCounts[agency.id] || 0,
    }));

    return { data: enriched, error: null };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error fetching agencies';
    return { data: [], error: message };
  }
}

export async function createAgency(input: CreateAgencyInput): Promise<{ data: TravelAgencyRecord | null; error: string | null }> {
  if (!isSupabaseConfigured) {
    return { data: null, error: 'Supabase client is not configured' };
  }

  const trimmedName = input.name.trim();
  if (trimmedName.length < 2) {
    return { data: null, error: 'Agency name must be at least 2 characters' };
  }

  try {
    // Check for duplicate name case-insensitively before insert to prevent silent overwriting
    const { data: existing } = await supabase
      .from('travel_agencies')
      .select('id, name')
      .ilike('name', trimmedName)
      .maybeSingle();

    if (existing) {
      return {
        data: null,
        error: `An agency with the name "${existing.name}" already exists. Case-insensitive duplicates are not allowed.`,
      };
    }

    const { data, error } = await supabase
      .from('travel_agencies')
      .insert({
        name: trimmedName,
        code: input.code?.trim() || null,
        country: input.country?.trim() || null,
        city: input.city?.trim() || null,
        address: input.address?.trim() || null,
        phone: input.phone?.trim() || null,
        email: input.email?.trim() || null,
        internal_notes: input.internal_notes?.trim() || null,
        status: input.status || 'ACTIVE',
      })
      .select()
      .single();

    if (error) {
      if (error.code === '23505') {
        return { data: null, error: 'An agency with this name or unique key already exists.' };
      }
      return { data: null, error: error.message };
    }

    return { data: { ...data, market_count: 0, member_count: 0 }, error: null };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error creating agency';
    return { data: null, error: message };
  }
}

export async function updateAgency(id: string, input: UpdateAgencyInput): Promise<{ data: TravelAgencyRecord | null; error: string | null }> {
  if (!isSupabaseConfigured) {
    return { data: null, error: 'Supabase client is not configured' };
  }

  const updates: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  };

  if (input.name !== undefined) {
    const trimmed = input.name.trim();
    if (trimmed.length < 2) {
      return { data: null, error: 'Agency name must be at least 2 characters' };
    }

    // Check case-insensitive duplicate against other agencies
    const { data: existing } = await supabase
      .from('travel_agencies')
      .select('id, name')
      .ilike('name', trimmed)
      .neq('id', id)
      .maybeSingle();

    if (existing) {
      return {
        data: null,
        error: `Another agency with the name "${existing.name}" already exists. Case-insensitive duplicates are not allowed.`,
      };
    }

    updates.name = trimmed;
  }
  if (input.code !== undefined) updates.code = input.code.trim() || null;
  if (input.country !== undefined) updates.country = input.country.trim() || null;
  if (input.city !== undefined) updates.city = input.city.trim() || null;
  if (input.address !== undefined) updates.address = input.address.trim() || null;
  if (input.phone !== undefined) updates.phone = input.phone.trim() || null;
  if (input.email !== undefined) updates.email = input.email.trim() || null;
  if (input.internal_notes !== undefined) updates.internal_notes = input.internal_notes.trim() || null;
  if (input.status !== undefined) updates.status = input.status;

  try {
    const { data, error } = await supabase
      .from('travel_agencies')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      if (error.code === '23505') {
        return { data: null, error: 'An agency with this name already exists' };
      }
      return { data: null, error: error.message };
    }

    return { data, error: null };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error updating agency';
    return { data: null, error: message };
  }
}

export async function deleteAgency(id: string): Promise<{ success: boolean; error: string | null }> {
  if (!isSupabaseConfigured) {
    return { success: false, error: 'Supabase client is not configured' };
  }

  try {
    const { error } = await supabase
      .from('travel_agencies')
      .delete()
      .eq('id', id);

    if (error) {
      if (error.code === '23503') {
        return { success: false, error: 'Cannot delete agency because it has associated markets, members, or rate records. Deactivate it instead.' };
      }
      return { success: false, error: error.message };
    }

    return { success: true, error: null };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error deleting agency';
    return { success: false, error: message };
  }
}

