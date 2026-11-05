// ==============================================================================
// WINDOW COMPANIES CRM — HOTEL & SEASON DOMAIN CONTRACTS
// ==============================================================================

export type HotelStatus = 'ACTIVE' | 'INACTIVE';
export type HotelServiceType = 'ONLINE' | 'OFFLINE' | 'BOTH';
export type SeasonStatus = 'ACTIVE' | 'UPCOMING' | 'EXPIRED';

export interface HotelRecord {
  id: string;
  hotel_name: string;
  hotel_code: string | null;
  area: string | null;
  service_type: HotelServiceType;
  status: HotelStatus;
  created_at: string;
  updated_at: string;
  // Computed / aggregated client-side counts
  season_count?: number;
}

export interface HotelSeasonRecord {
  id: string;
  hotel_id: string;
  season_label: string;
  date_from: string; // YYYY-MM-DD
  date_to: string;   // YYYY-MM-DD
  status: SeasonStatus;
  created_at: string;
  updated_at: string;
  // Joined fields
  hotel_name?: string;
  hotel_code?: string | null;
}

export interface SeasonOverlapCheckResult {
  hasOverlap: boolean;
  overlappingSeasons: Array<{
    id: string;
    season_label: string;
    date_from: string;
    date_to: string;
  }>;
}

