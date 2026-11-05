import { supabase } from '../lib/supabase';

export interface HotelContract {
  id: string;
  hotel_id: string;
  season_id?: string | null;
  contract_reference: string;
  contract_name: string;
  valid_from: string;
  valid_to: string;
  status: 'DRAFT' | 'ACTIVE' | 'EXPIRED' | 'TERMINATED';
  currency: string;
  terms_and_conditions?: string | null;
  document_storage_path?: string | null;
  version_number: number;
  created_by: string;
  created_at: string;
  updated_at: string;
  // Joins
  hotel_name?: string;
  season_label?: string;
}

export interface CreateContractPayload {
  hotel_id: string;
  season_id?: string | null;
  contract_reference: string;
  contract_name: string;
  valid_from: string;
  valid_to: string;
  status?: 'DRAFT' | 'ACTIVE';
  currency?: string;
  terms_and_conditions?: string;
}

interface ContractDbRow {
  id: string;
  hotel_id: string;
  season_id?: string | null;
  contract_reference: string;
  contract_name: string;
  valid_from: string;
  valid_to: string;
  status: 'DRAFT' | 'ACTIVE' | 'EXPIRED' | 'TERMINATED';
  currency: string;
  terms_and_conditions?: string | null;
  document_storage_path?: string | null;
  version_number: number;
  created_by: string;
  created_at: string;
  updated_at: string;
  hotels?: { name: string } | null;
  hotel_seasons?: { season_label: string } | null;
}

export const contractService = {
  /**
   * Fetch all contracts with hotel and season labels
   */
  async getContracts(): Promise<HotelContract[]> {
    const { data, error } = await supabase
      .from('hotel_contracts')
      .select(`
        *,
        hotels (name),
        hotel_seasons (season_label)
      `)
      .order('valid_from', { ascending: false });

    if (error) {
      console.warn('Note: hotel_contracts query returned error (table might be in draft migration state):', error.message);
      return [];
    }

    return ((data || []) as unknown as ContractDbRow[]).map((row) => ({
      id: row.id,
      hotel_id: row.hotel_id,
      season_id: row.season_id,
      contract_reference: row.contract_reference,
      contract_name: row.contract_name,
      valid_from: row.valid_from,
      valid_to: row.valid_to,
      status: row.status,
      currency: row.currency,
      terms_and_conditions: row.terms_and_conditions,
      document_storage_path: row.document_storage_path,
      version_number: row.version_number,
      created_by: row.created_by,
      created_at: row.created_at,
      updated_at: row.updated_at,
      hotel_name: row.hotels?.name || 'Unknown Hotel',
      season_label: row.hotel_seasons?.season_label || 'All Seasons'
    }));
  },

  /**
   * Fetch contracts for a specific hotel and optional season
   */
  async getContractsForHotel(hotelId: string, seasonId?: string): Promise<HotelContract[]> {
    let query = supabase
      .from('hotel_contracts')
      .select(`
        *,
        hotels (name),
        hotel_seasons (season_label)
      `)
      .eq('hotel_id', hotelId)
      .eq('status', 'ACTIVE');

    if (seasonId) {
      query = query.or(`season_id.is.null,season_id.eq.${seasonId}`);
    }

    const { data, error } = await query;
    if (error) {
      console.warn('Could not fetch contracts for hotel:', error.message);
      return [];
    }

    return ((data || []) as unknown as ContractDbRow[]).map((row) => ({
      ...row,
      hotel_name: row.hotels?.name || 'Unknown Hotel',
      season_label: row.hotel_seasons?.season_label || 'All Seasons'
    }));
  },

  /**
   * Create a new contract
   */
  async createContract(payload: CreateContractPayload, userId: string): Promise<HotelContract> {
    const { data, error } = await supabase
      .from('hotel_contracts')
      .insert({
        hotel_id: payload.hotel_id,
        season_id: payload.season_id || null,
        contract_reference: payload.contract_reference.trim(),
        contract_name: payload.contract_name.trim(),
        valid_from: payload.valid_from,
        valid_to: payload.valid_to,
        status: payload.status || 'ACTIVE',
        currency: payload.currency || 'USD',
        terms_and_conditions: payload.terms_and_conditions?.trim() || null,
        created_by: userId,
        version_number: 1
      })
      .select(`
        *,
        hotels (name),
        hotel_seasons (season_label)
      `)
      .single();

    if (error) {
      console.error('Error creating contract:', error);
      throw error;
    }

    const row = data as unknown as ContractDbRow;
    return {
      ...row,
      hotel_name: row.hotels?.name || 'Unknown Hotel',
      season_label: row.hotel_seasons?.season_label || 'All Seasons'
    };
  }
};
