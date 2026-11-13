/**
 * WINDOW COMPANIES CRM — AGENCY MARKET SERVICE
 * 
 * Interacts with public.agency_markets table using authorized Supabase client.
 * Enforces composite key relationships: (agency_id, market_name) uniqueness and parent validity.
 */

import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { AgencyMarketRecord } from '../types/agencyHierarchy';

export interface CreateMarketInput {
  agency_id: string;
  market_name: string;
  description?: string;
}

export interface UpdateMarketInput {
  market_name?: string;
  description?: string;
}

export async function fetchMarkets(agencyId?: string): Promise<{ data: AgencyMarketRecord[]; error: string | null }> {
  if (!isSupabaseConfigured) {
    return { data: [], error: 'Supabase client is not configured' };
  }

  try {
    let query = supabase
      .from('agency_markets')
      .select(`
        id,
        agency_id,
        market_name,
        description,
        created_at,
        updated_at,
        travel_agencies:agency_id (name)
      `)
      .order('market_name', { ascending: true });

    if (agencyId) {
      query = query.eq('agency_id', agencyId);
    }

    const { data: markets, error: marketError } = await query;

    if (marketError) {
      return { data: [], error: marketError.message };
    }

    if (!markets || markets.length === 0) {
      return { data: [], error: null };
    }

    // Fetch member count per market
    const { data: memberData, error: memberError } = await supabase
      .from('agency_members')
      .select('market_id');

    const memberCounts: Record<string, number> = {};
    if (!memberError && memberData) {
      for (const mem of memberData) {
        memberCounts[mem.market_id] = (memberCounts[mem.market_id] || 0) + 1;
      }
    }

    interface MarketQueryRow {
      id: string;
      agency_id: string;
      market_name: string;
      description: string | null;
      created_at: string;
      updated_at: string;
      travel_agencies: { name: string } | null;
    }

    const typedMarkets = (markets || []) as unknown as MarketQueryRow[];

    const formatted: AgencyMarketRecord[] = typedMarkets.map((m) => ({
      id: m.id,
      agency_id: m.agency_id,
      market_name: m.market_name,
      description: m.description,
      created_at: m.created_at,
      updated_at: m.updated_at,
      agency_name: m.travel_agencies?.name || 'Unknown Agency',
      member_count: memberCounts[m.id] || 0,
    }));

    return { data: formatted, error: null };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error fetching markets';
    return { data: [], error: message };
  }
}

export async function createMarket(input: CreateMarketInput): Promise<{ data: AgencyMarketRecord | null; error: string | null }> {
  if (!isSupabaseConfigured) {
    return { data: null, error: 'Supabase client is not configured' };
  }

  if (!input.agency_id) {
    return { data: null, error: 'Parent Travel Agency must be selected' };
  }

  const trimmedName = input.market_name.trim();
  if (trimmedName.length < 2) {
    return { data: null, error: 'Market name must be at least 2 characters' };
  }

  try {
    // Proactively check for duplicate market under the same agency case-insensitively
    const { data: existing } = await supabase
      .from('agency_markets')
      .select('id, market_name')
      .eq('agency_id', input.agency_id)
      .ilike('market_name', trimmedName)
      .maybeSingle();

    if (existing) {
      return {
        data: null,
        error: `A market named "${existing.market_name}" already exists under this agency.`,
      };
    }

    const { data, error } = await supabase
      .from('agency_markets')
      .insert({
        agency_id: input.agency_id,
        market_name: trimmedName,
        description: input.description?.trim() || null,
      })
      .select(`
        id,
        agency_id,
        market_name,
        description,
        created_at,
        updated_at,
        travel_agencies:agency_id (name)
      `)
      .single();

    if (error) {
      if (error.code === '23505') {
        return { data: null, error: 'This market name already exists under the selected travel agency' };
      }
      return { data: null, error: error.message };
    }

    const formatted: AgencyMarketRecord = {
      id: data.id,
      agency_id: data.agency_id,
      market_name: data.market_name,
      description: data.description,
      created_at: data.created_at,
      updated_at: data.updated_at,
      agency_name: (data as unknown as { travel_agencies: { name: string } | null }).travel_agencies?.name || 'Unknown Agency',
      member_count: 0,
    };

    return { data: formatted, error: null };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error creating market';
    return { data: null, error: message };
  }
}

export async function updateMarket(id: string, input: UpdateMarketInput): Promise<{ data: AgencyMarketRecord | null; error: string | null }> {
  if (!isSupabaseConfigured) {
    return { data: null, error: 'Supabase client is not configured' };
  }

  const updates: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  };

  if (input.market_name !== undefined) {
    const trimmed = input.market_name.trim();
    if (trimmed.length < 2) {
      return { data: null, error: 'Market name must be at least 2 characters' };
    }
    updates.market_name = trimmed;
  }
  if (input.description !== undefined) {
    updates.description = input.description.trim() || null;
  }

  try {
    if (input.market_name) {
      const { data: current } = await supabase
        .from('agency_markets')
        .select('agency_id')
        .eq('id', id)
        .single();

      if (current) {
        const { data: existing } = await supabase
          .from('agency_markets')
          .select('id, market_name')
          .eq('agency_id', current.agency_id)
          .ilike('market_name', input.market_name.trim())
          .neq('id', id)
          .maybeSingle();

        if (existing) {
          return {
            data: null,
            error: `Another market named "${existing.market_name}" already exists under this agency.`,
          };
        }
      }
    }

    const { data, error } = await supabase
      .from('agency_markets')
      .update(updates)
      .eq('id', id)
      .select(`
        id,
        agency_id,
        market_name,
        description,
        created_at,
        updated_at,
        travel_agencies:agency_id (name)
      `)
      .single();

    if (error) {
      if (error.code === '23505') {
        return { data: null, error: 'A market with this name already exists under this agency' };
      }
      return { data: null, error: error.message };
    }

    const formatted: AgencyMarketRecord = {
      id: data.id,
      agency_id: data.agency_id,
      market_name: data.market_name,
      description: data.description,
      created_at: data.created_at,
      updated_at: data.updated_at,
      agency_name: (data as unknown as { travel_agencies: { name: string } | null }).travel_agencies?.name || 'Unknown Agency',
    };

    return { data: formatted, error: null };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error updating market';
    return { data: null, error: message };
  }
}

export async function deleteMarket(id: string): Promise<{ success: boolean; error: string | null }> {
  if (!isSupabaseConfigured) {
    return { success: false, error: 'Supabase client is not configured' };
  }

  try {
    const { error } = await supabase
      .from('agency_markets')
      .delete()
      .eq('id', id);

    if (error) {
      if (error.code === '23503') {
        return { success: false, error: 'Cannot delete market because it contains active members or quote records.' };
      }
      return { success: false, error: error.message };
    }

    return { success: true, error: null };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error deleting market';
    return { success: false, error: message };
  }
}
