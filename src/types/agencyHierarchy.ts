// ==============================================================================
// WINDOW COMPANIES CRM — AGENCY HIERARCHY DATA CONTRACTS & TYPES
// ==============================================================================

export type RecordStatus = 'ACTIVE' | 'INACTIVE';

export interface TravelAgencyRecord {
  id: string;
  name: string;
  code: string | null;
  country: string | null;
  city: string | null;
  address?: string | null;
  phone: string | null;
  email: string | null;
  internal_notes?: string | null;
  status: RecordStatus;
  created_at: string;
  updated_at: string;
  // Computed client-side / joined counts
  market_count?: number;
  member_count?: number;
}

export interface AgencyMarketRecord {
  id: string;
  agency_id: string;
  market_name: string;
  description: string | null;
  created_at: string;
  updated_at: string;
  // Joined fields
  agency_name?: string;
  member_count?: number;
}

export interface AgencyMemberRecord {
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
  // Joined fields
  agency_name?: string;
  market_name?: string;
}

export interface DuplicateEmailCheckResult {
  isDuplicate: boolean;
  isSameAgencyMarket: boolean;
  existingMember?: {
    id: string;
    full_name: string;
    email: string;
    agency_name: string;
    market_name: string;
    agency_id: string;
    market_id: string;
  };
}

