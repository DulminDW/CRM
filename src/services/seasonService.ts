/**
 * WINDOW COMPANIES CRM — HOTEL SEASON SERVICE
 * 
 * Interacts with public.hotel_seasons table using authorized Supabase client.
 * Enforces schema constraints (date_to >= date_from, unique season_label per hotel) and RLS compliance.
 */

import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { HotelSeasonRecord, SeasonStatus, SeasonOverlapCheckResult } from '../types/hotelHierarchy';

export interface CreateSeasonInput {
  hotel_id: string;
  season_label: string;
  date_from: string; // YYYY-MM-DD
  date_to: string;   // YYYY-MM-DD
  status?: SeasonStatus;
}

export interface UpdateSeasonInput {
  season_label?: string;
  date_from?: string;
  date_to?: string;
  status?: SeasonStatus;
}

/**
 * Checks for overlapping seasons under the same hotel.
 * Returns non-blocking advisory overlap info.
 */
export async function checkSeasonDateOverlap(
  hotelId: string,
  dateFrom: string,
  dateTo: string,
  excludeSeasonId?: string
): Promise<SeasonOverlapCheckResult> {
  if (!isSupabaseConfigured || !hotelId || !dateFrom || !dateTo) {
    return { hasOverlap: false, overlappingSeasons: [] };
  }

  try {
    let query = supabase
      .from('hotel_seasons')
      .select('id, season_label, date_from, date_to')
      .eq('hotel_id', hotelId);

    if (excludeSeasonId) {
      query = query.neq('id', excludeSeasonId);
    }

    const { data, error } = await query;
    if (error || !data) {
      return { hasOverlap: false, overlappingSeasons: [] };
    }

    // Check overlap: (StartA <= EndB) and (EndA >= StartB)
    const overlapping = data.filter((s) => {
      return dateFrom <= s.date_to && dateTo >= s.date_from;
    });

    return {
      hasOverlap: overlapping.length > 0,
      overlappingSeasons: overlapping,
    };
  } catch {
    return { hasOverlap: false, overlappingSeasons: [] };
  }
}

export async function fetchSeasons(hotelId?: string): Promise<{ data: HotelSeasonRecord[]; error: string | null }> {
  if (!isSupabaseConfigured) {
    return { data: [], error: 'Supabase client is not configured' };
  }

  try {
    let query = supabase
      .from('hotel_seasons')
      .select(`
        id,
        hotel_id,
        season_label,
        date_from,
        date_to,
        status,
        created_at,
        updated_at,
        hotels (hotel_name, hotel_code)
      `)
      .order('date_from', { ascending: false });

    if (hotelId) {
      query = query.eq('hotel_id', hotelId);
    }

    const { data: seasons, error: seasonErr } = await query;

    if (seasonErr) {
      return { data: [], error: seasonErr.message };
    }

    if (!seasons) {
      return { data: [], error: null };
    }

    interface SeasonQueryRow {
      id: string;
      hotel_id: string;
      season_label: string;
      date_from: string;
      date_to: string;
      status: SeasonStatus;
      created_at: string;
      updated_at: string;
      hotels: { hotel_name: string; hotel_code: string | null } | null;
    }

    const typedSeasons = (seasons || []) as unknown as SeasonQueryRow[];

    const formatted: HotelSeasonRecord[] = typedSeasons.map((s) => ({
      id: s.id,
      hotel_id: s.hotel_id,
      season_label: s.season_label,
      date_from: s.date_from,
      date_to: s.date_to,
      status: s.status,
      created_at: s.created_at,
      updated_at: s.updated_at,
      hotel_name: s.hotels?.hotel_name || 'Unknown Hotel',
      hotel_code: s.hotels?.hotel_code || null,
    }));

    return { data: formatted, error: null };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error fetching seasons';
    return { data: [], error: message };
  }
}

export async function createSeason(input: CreateSeasonInput): Promise<{ data: HotelSeasonRecord | null; error: string | null }> {
  if (!isSupabaseConfigured) {
    return { data: null, error: 'Supabase client is not configured' };
  }

  if (!input.hotel_id) {
    return { data: null, error: 'Partner Hotel must be selected' };
  }

  const trimmedLabel = input.season_label.trim();
  if (trimmedLabel.length < 2) {
    return { data: null, error: 'Season label must be at least 2 characters' };
  }

  if (!input.date_from || !input.date_to) {
    return { data: null, error: 'Both start date (Date From) and end date (Date To) are required' };
  }

  if (input.date_to <= input.date_from) {
    return { data: null, error: 'End date (Date To) must be strictly later than start date (Date From)' };
  }

  try {
    const { data, error } = await supabase
      .from('hotel_seasons')
      .insert({
        hotel_id: input.hotel_id,
        season_label: trimmedLabel,
        date_from: input.date_from,
        date_to: input.date_to,
        status: input.status || 'ACTIVE',
      })
      .select(`
        id,
        hotel_id,
        season_label,
        date_from,
        date_to,
        status,
        created_at,
        updated_at,
        hotels (hotel_name, hotel_code)
      `)
      .single();

    if (error) {
      if (error.code === '23505') {
        return { data: null, error: 'A season with this label already exists for the selected hotel' };
      }
      return { data: null, error: error.message };
    }

    interface SingleSeasonRow {
      hotels: { hotel_name: string; hotel_code: string | null } | null;
    }
    const singleRow = data as unknown as SingleSeasonRow;

    const formatted: HotelSeasonRecord = {
      id: data.id,
      hotel_id: data.hotel_id,
      season_label: data.season_label,
      date_from: data.date_from,
      date_to: data.date_to,
      status: data.status,
      created_at: data.created_at,
      updated_at: data.updated_at,
      hotel_name: singleRow.hotels?.hotel_name || 'Unknown Hotel',
      hotel_code: singleRow.hotels?.hotel_code || null,
    };

    return { data: formatted, error: null };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error creating season';
    return { data: null, error: message };
  }
}

export async function updateSeason(id: string, input: UpdateSeasonInput): Promise<{ data: HotelSeasonRecord | null; error: string | null }> {
  if (!isSupabaseConfigured) {
    return { data: null, error: 'Supabase client is not configured' };
  }

  const updates: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  };

  if (input.season_label !== undefined) {
    const trimmed = input.season_label.trim();
    if (trimmed.length < 2) {
      return { data: null, error: 'Season label must be at least 2 characters' };
    }
    updates.season_label = trimmed;
  }

  if (input.date_from !== undefined) updates.date_from = input.date_from;
  if (input.date_to !== undefined) updates.date_to = input.date_to;
  if (input.status !== undefined) updates.status = input.status;

  if (input.date_from && input.date_to && input.date_to <= input.date_from) {
    return { data: null, error: 'End date (Date To) must be strictly later than start date (Date From)' };
  }

  try {
    const { data, error } = await supabase
      .from('hotel_seasons')
      .update(updates)
      .eq('id', id)
      .select(`
        id,
        hotel_id,
        season_label,
        date_from,
        date_to,
        status,
        created_at,
        updated_at,
        hotels (hotel_name, hotel_code)
      `)
      .single();

    if (error) {
      if (error.code === '23505') {
        return { data: null, error: 'A season with this label already exists for this hotel' };
      }
      return { data: null, error: error.message };
    }

    interface SingleSeasonRow {
      hotels: { hotel_name: string; hotel_code: string | null } | null;
    }
    const singleRow = data as unknown as SingleSeasonRow;

    const formatted: HotelSeasonRecord = {
      id: data.id,
      hotel_id: data.hotel_id,
      season_label: data.season_label,
      date_from: data.date_from,
      date_to: data.date_to,
      status: data.status,
      created_at: data.created_at,
      updated_at: data.updated_at,
      hotel_name: singleRow.hotels?.hotel_name || 'Unknown Hotel',
      hotel_code: singleRow.hotels?.hotel_code || null,
    };

    return { data: formatted, error: null };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error updating season';
    return { data: null, error: message };
  }
}

export async function deleteSeason(id: string): Promise<{ success: boolean; error: string | null }> {
  if (!isSupabaseConfigured) {
    return { success: false, error: 'Supabase client is not configured' };
  }

  try {
    const { error } = await supabase
      .from('hotel_seasons')
      .delete()
      .eq('id', id);

    if (error) {
      if (error.code === '23503') {
        return {
          success: false,
          error: 'Cannot delete season because rate sheets, special rates, or quotes depend on it. Mark it as EXPIRED instead.',
        };
      }
      return { success: false, error: error.message };
    }

    return { success: true, error: null };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error deleting season';
    return { success: false, error: message };
  }
}

