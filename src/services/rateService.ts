import { supabase } from '../lib/supabase';
import { HotelRecord, HotelSeasonRecord } from '../types/hotelHierarchy';

export interface HotelRateSheet {
  id: string;
  hotel_id: string;
  season_id: string;
  version_number: number;
  status: 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';
  currency: string;
  notes?: string;
  created_at: string;
  created_by: string;
  published_by?: string;
  published_at?: string;
  hotel_rate_components?: HotelRateComponent[];
  hotel_rate_outputs?: HotelRateOutput[];
}

export interface HotelRateComponent {
  id: string;
  rate_sheet_id: string;
  component_key: string;
  component_value: number;
  description?: string;
}

export interface HotelRateOutput {
  id: string;
  rate_sheet_id: string;
  room_type: string;
  meal_plan: string;
  rate_category: 'RED' | 'GREEN' | 'YELLOW';
  amount: number;
  currency: string;
}

export const rateService = {
  /**
   * Fetch all active hotels for selection
   */
  async getHotels(): Promise<HotelRecord[]> {
    const { data, error } = await supabase
      .from('hotels')
      .select('*')
      .eq('status', 'ACTIVE')
      .order('name', { ascending: true });

    if (error) {
      console.error('Error fetching hotels for rate management:', error);
      throw error;
    }
    return (data || []).map((row) => ({
      id: row.id,
      hotel_name: row.name,
      hotel_code: row.code,
      area: row.area,
      service_type: row.service_type,
      status: row.status,
      created_at: row.created_at,
      updated_at: row.updated_at
    })) as HotelRecord[];
  },

  /**
   * Fetch seasons for a specific hotel
   */
  async getSeasonsForHotel(hotelId: string): Promise<HotelSeasonRecord[]> {
    const { data, error } = await supabase
      .from('hotel_seasons')
      .select('*')
      .eq('hotel_id', hotelId)
      .order('date_from', { ascending: true });

    if (error) {
      console.error(`Error fetching seasons for hotel ${hotelId}:`, error);
      throw error;
    }
    return (data || []) as HotelSeasonRecord[];
  },

  /**
   * Fetch rate sheets for a specific hotel and season
   */
  async getRateSheets(hotelId: string, seasonId: string): Promise<HotelRateSheet[]> {
    const { data, error } = await supabase
      .from('hotel_rate_sheets')
      .select(`
        *,
        hotel_rate_components (*),
        hotel_rate_outputs (*)
      `)
      .eq('hotel_id', hotelId)
      .eq('season_id', seasonId)
      .order('version_number', { ascending: false });

    if (error) {
      console.error(`Error fetching rate sheets for hotel ${hotelId} season ${seasonId}:`, error);
      throw error;
    }
    return (data || []) as HotelRateSheet[];
  }
};
