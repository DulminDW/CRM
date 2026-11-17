// ==============================================================================
// WINDOW COMPANIES CRM — VISIT & SALES ACTIVITY DOMAIN TYPES
// ==============================================================================

export type SalesActivityType = 'MEETING' | 'PHONE_CALL' | 'EMAIL_DISCUSSION' | 'VOICE_NOTE' | 'OTHER';

export interface SalesActivityRecord {
  id: string;
  staff_id: string;
  agency_id: string;
  market_id?: string | null;
  member_id?: string | null;
  hotel_id?: string | null;
  activity_date: string;
  activity_type: SalesActivityType;
  notes: string;
  created_at: string;
  updated_at: string;

  // Joined presentation fields
  staff_name?: string;
  agency_name?: string;
  market_name?: string;
  member_name?: string;
  member_email?: string;
  member_phone?: string;
  hotel_name?: string;
  hotel_code?: string;
  discussed_hotels?: {
    id: string;
    hotel_name: string;
    hotel_code?: string;
  }[];
}

export interface CreateVisitInput {
  agency_id: string;
  market_id?: string | null;
  member_id?: string | null;
  hotel_ids: string[]; // Can select multiple hotels discussed
  activity_date: string;
  activity_type?: SalesActivityType;
  notes: string;
  follow_up_date?: string | null;
}

