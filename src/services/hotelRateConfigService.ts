import { supabase } from '../lib/supabase';
import { adminActivityService } from './adminActivityService';

export interface HotelRateConfigRecord {
  id: string;
  hotel_id: string;
  season_id: string;
  contract_id?: string | null;
  rate_category: 'RED' | 'GREEN' | 'YELLOW';
  currency: string;
  hb_double_base_rate: number;
  single_reduction_amount: number;
  single_reduction_unit: 'PER_ROOM_PER_NIGHT' | 'PER_PERSON_PER_NIGHT';
  triple_supplement_amount: number;
  triple_supplement_unit: 'PER_ROOM_PER_NIGHT' | 'PER_PERSON_PER_NIGHT';
  bb_reduction_amount: number;
  bb_reduction_unit: 'PER_ROOM_PER_NIGHT' | 'PER_PERSON_PER_NIGHT';
  is_formula_verified: boolean;
  calculation_rule_version: string;
  formula_source_reference?: string | null;
  internal_notes?: string | null;
  external_notes?: string | null;
  status: 'DRAFT' | 'ACTIVE' | 'ARCHIVED';
  version_number: number;
  created_by: string;
  created_at: string;
  updated_at: string;
  // Joined fields
  hotel_name?: string;
  season_label?: string;
}

export interface SaveHotelRateConfigPayload {
  hotel_id: string;
  season_id: string;
  contract_id?: string | null;
  rate_category: 'RED' | 'GREEN' | 'YELLOW';
  currency?: string;
  hb_double_base_rate: number;
  single_reduction_amount: number;
  triple_supplement_amount: number;
  bb_reduction_amount: number;
  is_formula_verified?: boolean;
  internal_notes?: string;
  external_notes?: string;
}

const LOCAL_STORAGE_RATE_CONFIGS_KEY = 'window_companies_hotel_rate_configs';

// Seed initial verified data mappings from RATE_SOURCE_TO_CALCULATION_MAPPING.md
const INITIAL_SEEDED_CONFIGS: HotelRateConfigRecord[] = [
  {
    id: 'cfg_mount_randholee_green',
    hotel_id: 'hotel-randholee',
    season_id: 'season-summer-2026',
    rate_category: 'GREEN',
    currency: 'USD',
    hb_double_base_rate: 120,
    single_reduction_amount: 10,
    single_reduction_unit: 'PER_ROOM_PER_NIGHT',
    triple_supplement_amount: 25,
    triple_supplement_unit: 'PER_ROOM_PER_NIGHT',
    bb_reduction_amount: 15,
    bb_reduction_unit: 'PER_ROOM_PER_NIGHT',
    is_formula_verified: false, // PENDING COMPANY EXCEL WORKBOOK VERIFICATION
    calculation_rule_version: 'v1.0-source-matched',
    formula_source_reference: 'All_Hotels_All_Markets_Rate_Sheets.pdf pp. 2-6 (Source Value Matched)',
    internal_notes: 'Mount Randholee Green tier value matched from p. 4 table filing. Excel workbook pending.',
    status: 'ACTIVE',
    version_number: 1,
    created_by: 'system',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  }
];

export const hotelRateConfigService = {
  /**
   * Fetch all configurations with local persistence fallback
   */
  async getConfigs(hotelId?: string, seasonId?: string): Promise<HotelRateConfigRecord[]> {
    let list: HotelRateConfigRecord[] = [];
    const local = localStorage.getItem(LOCAL_STORAGE_RATE_CONFIGS_KEY);
    if (local) {
      try {
        list = JSON.parse(local);
      } catch {
        list = [...INITIAL_SEEDED_CONFIGS];
      }
    } else {
      list = [...INITIAL_SEEDED_CONFIGS];
      localStorage.setItem(LOCAL_STORAGE_RATE_CONFIGS_KEY, JSON.stringify(list));
    }

    try {
      let query = supabase.from('hotel_rate_configs').select(`
        *,
        hotels (name),
        hotel_seasons (season_label)
      `).eq('status', 'ACTIVE');

      if (hotelId) query = query.eq('hotel_id', hotelId);
      if (seasonId) query = query.eq('season_id', seasonId);

      const { data, error } = await query;
      if (!error && data && data.length > 0) {
        return data as unknown as HotelRateConfigRecord[];
      }
    } catch {
      // Return local fallback
    }

    return list.filter((c) => {
      if (hotelId && c.hotel_id !== hotelId) return false;
      if (seasonId && c.season_id !== seasonId) return false;
      return c.status === 'ACTIVE';
    });
  },

  /**
   * Save or update a hotel rate configuration
   */
  async saveConfig(
    payload: SaveHotelRateConfigPayload,
    userId: string,
    userName?: string
  ): Promise<HotelRateConfigRecord> {
    const list = await this.getConfigs();
    const existingIndex = list.findIndex(
      (c) =>
        c.hotel_id === payload.hotel_id &&
        c.season_id === payload.season_id &&
        c.rate_category === payload.rate_category
    );

    const record: HotelRateConfigRecord = {
      id: existingIndex >= 0 ? list[existingIndex]!.id : `cfg_${Date.now()}`,
      hotel_id: payload.hotel_id,
      season_id: payload.season_id,
      contract_id: payload.contract_id || null,
      rate_category: payload.rate_category,
      currency: payload.currency || 'USD',
      hb_double_base_rate: payload.hb_double_base_rate,
      single_reduction_amount: payload.single_reduction_amount,
      single_reduction_unit: 'PER_ROOM_PER_NIGHT',
      triple_supplement_amount: payload.triple_supplement_amount,
      triple_supplement_unit: 'PER_ROOM_PER_NIGHT',
      bb_reduction_amount: payload.bb_reduction_amount,
      bb_reduction_unit: 'PER_ROOM_PER_NIGHT',
      is_formula_verified: payload.is_formula_verified ?? false,
      calculation_rule_version: 'v1.0-manual',
      internal_notes: payload.internal_notes || null,
      external_notes: payload.external_notes || null,
      status: 'ACTIVE',
      version_number: existingIndex >= 0 ? list[existingIndex]!.version_number + 1 : 1,
      created_by: userId,
      created_at: existingIndex >= 0 ? list[existingIndex]!.created_at : new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    if (existingIndex >= 0) {
      list[existingIndex] = record;
    } else {
      list.push(record);
    }

    localStorage.setItem(LOCAL_STORAGE_RATE_CONFIGS_KEY, JSON.stringify(list));

    // Audit Logging
    await adminActivityService.logActivity({
      actor_id: userId,
      actor_name: userName || 'Authorized Staff',
      action: 'RATE_SHEET_SAVED' as unknown as import('./adminActivityService').AdminAuditActionType,
      target_table: 'hotel_rate_configs',
      target_record_id: record.id,
      hotel_id: payload.hotel_id,
      new_values: {
        category: payload.rate_category,
        hbBase: payload.hb_double_base_rate,
        singleRed: payload.single_reduction_amount,
        tripleSupp: payload.triple_supplement_amount,
        bbRed: payload.bb_reduction_amount
      },
      details: `Saved rate configuration for ${payload.rate_category} tier (HB Double Base: ${payload.hb_double_base_rate})`
    });

    return record;
  }
};

