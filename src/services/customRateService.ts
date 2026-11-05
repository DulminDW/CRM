import { supabase } from '../lib/supabase';

export interface CustomRateTemplate {
  id: string;
  hotel_id: string;
  season_id?: string | null;
  slot_label: 'Custom 1' | 'Custom 2' | 'Custom 3';
  template_name: string;
  rate_amount: number;
  currency: string;
  room_night_condition?: number | null;
  date_condition_from?: string | null;
  date_condition_to?: string | null;
  special_notes?: string | null;
  is_active: boolean;
  created_by: string;
  created_at: string;
  updated_at: string;
  // Joins
  hotel_name?: string;
  season_label?: string;
}

export interface CreateCustomRatePayload {
  hotel_id: string;
  season_id?: string | null;
  slot_label: 'Custom 1' | 'Custom 2' | 'Custom 3';
  template_name: string;
  rate_amount: number;
  currency?: string;
  room_night_condition?: number | null;
  date_condition_from?: string | null;
  date_condition_to?: string | null;
  special_notes?: string | null;
}

interface CustomTemplateDbRow {
  id: string;
  hotel_id: string;
  season_id?: string | null;
  slot_label: 'Custom 1' | 'Custom 2' | 'Custom 3';
  template_name: string;
  rate_amount: number;
  currency: string;
  room_night_condition?: number | null;
  date_condition_from?: string | null;
  date_condition_to?: string | null;
  special_notes?: string | null;
  is_active: boolean;
  created_by: string;
  created_at: string;
  updated_at: string;
  hotels?: { name: string } | null;
  hotel_seasons?: { season_label: string } | null;
}

export const customRateService = {
  /**
   * Fetch custom templates for a hotel and optional season
   */
  async getTemplates(hotelId?: string, seasonId?: string): Promise<CustomRateTemplate[]> {
    let query = supabase
      .from('custom_rate_templates')
      .select(`
        *,
        hotels (name),
        hotel_seasons (season_label)
      `)
      .eq('is_active', true);

    if (hotelId) {
      query = query.eq('hotel_id', hotelId);
    }
    if (seasonId) {
      query = query.or(`season_id.is.null,season_id.eq.${seasonId}`);
    }

    const { data, error } = await query.order('slot_label', { ascending: true });
    if (error) {
      console.warn('Could not fetch custom rate templates:', error.message);
      return [];
    }

    return ((data || []) as unknown as CustomTemplateDbRow[]).map((row) => ({
      ...row,
      hotel_name: row.hotels?.name || 'Unknown Hotel',
      season_label: row.hotel_seasons?.season_label || 'All Seasons'
    }));
  },

  /**
   * Create or update custom rate template
   */
  async createTemplate(payload: CreateCustomRatePayload, userId: string): Promise<CustomRateTemplate> {
    const { data, error } = await supabase
      .from('custom_rate_templates')
      .insert({
        hotel_id: payload.hotel_id,
        season_id: payload.season_id || null,
        slot_label: payload.slot_label,
        template_name: payload.template_name.trim(),
        rate_amount: payload.rate_amount,
        currency: payload.currency || 'USD',
        room_night_condition: payload.room_night_condition || null,
        date_condition_from: payload.date_condition_from || null,
        date_condition_to: payload.date_condition_to || null,
        special_notes: payload.special_notes?.trim() || null,
        created_by: userId,
        is_active: true
      })
      .select(`
        *,
        hotels (name),
        hotel_seasons (season_label)
      `)
      .single();

    if (error) {
      console.error('Error creating custom rate template:', error);
      throw error;
    }

    const row = data as unknown as CustomTemplateDbRow;
    return {
      ...row,
      hotel_name: row.hotels?.name || 'Unknown Hotel',
      season_label: row.hotel_seasons?.season_label || 'All Seasons'
    };
  }
};
