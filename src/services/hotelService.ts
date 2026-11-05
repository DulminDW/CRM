/**
 * WINDOW COMPANIES CRM — HOTEL INVENTORY SERVICE
 * 
 * Interacts with public.hotels table using authorized Supabase client.
 * Enforces schema constraints and RLS compliance.
 */

import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { HotelRecord, HotelServiceType, HotelStatus } from '../types/hotelHierarchy';

export interface CreateHotelInput {
  hotel_name: string;
  hotel_code?: string;
  area?: string;
  service_type?: HotelServiceType;
  status?: HotelStatus;
}

export interface UpdateHotelInput {
  hotel_name?: string;
  hotel_code?: string;
  area?: string;
  service_type?: HotelServiceType;
  status?: HotelStatus;
}

export async function fetchHotels(): Promise<{ data: HotelRecord[]; error: string | null }> {
  if (!isSupabaseConfigured) {
    return { data: [], error: 'Supabase client is not configured' };
  }

  try {
    // 1. Fetch hotels ordered by name
    const { data: hotels, error: hotelErr } = await supabase
      .from('hotels')
      .select('*')
      .order('hotel_name', { ascending: true });

    if (hotelErr) {
      return { data: [], error: hotelErr.message };
    }

    if (!hotels || hotels.length === 0) {
      return { data: [], error: null };
    }

    // 2. Fetch associated season counts per hotel
    const { data: seasonData, error: seasonErr } = await supabase
      .from('hotel_seasons')
      .select('hotel_id');

    const seasonCounts: Record<string, number> = {};
    if (!seasonErr && seasonData) {
      for (const s of seasonData) {
        seasonCounts[s.hotel_id] = (seasonCounts[s.hotel_id] || 0) + 1;
      }
    }

    const enriched: HotelRecord[] = hotels.map((h) => ({
      ...h,
      season_count: seasonCounts[h.id] || 0,
    }));

    return { data: enriched, error: null };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error fetching hotels';
    return { data: [], error: message };
  }
}

export async function fetchHotelById(id: string): Promise<{ data: HotelRecord | null; error: string | null }> {
  if (!isSupabaseConfigured) {
    return { data: null, error: 'Supabase client is not configured' };
  }

  try {
    const { data, error } = await supabase
      .from('hotels')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (error) {
      return { data: null, error: error.message };
    }

    if (!data) {
      return { data: null, error: 'Hotel not found' };
    }

    // Fetch count of seasons
    const { data: seasons } = await supabase
      .from('hotel_seasons')
      .select('id')
      .eq('hotel_id', id);

    return {
      data: {
        ...data,
        season_count: seasons ? seasons.length : 0,
      },
      error: null,
    };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error fetching hotel details';
    return { data: null, error: message };
  }
}

export async function createHotel(input: CreateHotelInput): Promise<{ data: HotelRecord | null; error: string | null }> {
  if (!isSupabaseConfigured) {
    return { data: null, error: 'Supabase client is not configured' };
  }

  const trimmedName = input.hotel_name.trim();
  if (trimmedName.length < 2) {
    return { data: null, error: 'Hotel name must be at least 2 characters' };
  }

  try {
    const { data, error } = await supabase
      .from('hotels')
      .insert({
        hotel_name: trimmedName,
        hotel_code: input.hotel_code?.trim() || null,
        area: input.area?.trim() || null,
        service_type: input.service_type || 'BOTH',
        status: input.status || 'ACTIVE',
      })
      .select()
      .single();

    if (error) {
      if (error.code === '23505') {
        return { data: null, error: 'A partner hotel with this name already exists' };
      }
      return { data: null, error: error.message };
    }

    return { data: { ...data, season_count: 0 }, error: null };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error creating hotel';
    return { data: null, error: message };
  }
}

export async function updateHotel(id: string, input: UpdateHotelInput): Promise<{ data: HotelRecord | null; error: string | null }> {
  if (!isSupabaseConfigured) {
    return { data: null, error: 'Supabase client is not configured' };
  }

  const updates: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  };

  if (input.hotel_name !== undefined) {
    const trimmed = input.hotel_name.trim();
    if (trimmed.length < 2) {
      return { data: null, error: 'Hotel name must be at least 2 characters' };
    }
    updates.hotel_name = trimmed;
  }

  if (input.hotel_code !== undefined) updates.hotel_code = input.hotel_code.trim() || null;
  if (input.area !== undefined) updates.area = input.area.trim() || null;
  if (input.service_type !== undefined) updates.service_type = input.service_type;
  if (input.status !== undefined) updates.status = input.status;

  try {
    const { data, error } = await supabase
      .from('hotels')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      if (error.code === '23505') {
        return { data: null, error: 'A partner hotel with this name already exists' };
      }
      return { data: null, error: error.message };
    }

    return { data, error: null };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error updating hotel';
    return { data: null, error: message };
  }
}

export async function deleteHotel(id: string): Promise<{ success: boolean; error: string | null }> {
  if (!isSupabaseConfigured) {
    return { success: false, error: 'Supabase client is not configured' };
  }

  try {
    const { error } = await supabase
      .from('hotels')
      .delete()
      .eq('id', id);

    if (error) {
      if (error.code === '23503') {
        return {
          success: false,
          error: 'Cannot delete hotel because it has associated seasons, rate sheets, special rates, or historical quotes. Deactivate the property instead.',
        };
      }
      return { success: false, error: error.message };
    }

    return { success: true, error: null };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error deleting hotel';
    return { success: false, error: message };
  }
}

