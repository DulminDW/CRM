// ==============================================================================
// WINDOW COMPANIES CRM - CORE DOMAIN TYPES
// ==============================================================================
// These types define the structural contracts according to
// WINDOW_COMPANIES_CRM_COMPLETE_PROJECT_HANDOVER.md
// ==============================================================================

export type UserRole = 'ADMIN' | 'STAFF';

export interface UserPermission {
  canManageRates: boolean;
  canManageUsers: boolean;
  canCreateChatGroups: boolean;
}

export interface UserProfile {
  id: string;
  email: string;
  fullName: string;
  role: UserRole;
  permissions: UserPermission;
  avatarUrl?: string;
  createdAt: string;
}

// ------------------------------------------------------------------------------
// Travel Agency Hierarchy
// ------------------------------------------------------------------------------
export interface TravelAgency {
  id: string;
  name: string;
  code?: string;
  country?: string;
  city?: string;
  phone?: string;
  email?: string;
  status: 'ACTIVE' | 'INACTIVE';
  marketCount?: number;
  memberCount?: number;
  createdAt: string;
}

export interface Market {
  id: string;
  agencyId: string;
  name: string; // e.g. "Indian Market", "Europe Market", "Belgium Market"
  description?: string;
  memberCount?: number;
  createdAt: string;
}

export interface AgencyMember {
  id: string;
  agencyId: string;
  marketId: string;
  name: string;
  email: string;
  phone?: string;
  position?: string; // e.g. "Manager", "Senior Executive"
  memberCode?: string;
  createdAt: string;
}

// ------------------------------------------------------------------------------
// Hotel & Season Management
// ------------------------------------------------------------------------------
export interface Hotel {
  id: string;
  name: string; // e.g. "Randoli", "Beragala", "Horton Heights"
  code?: string;
  area?: string;
  propertyType?: string;
  serviceType: 'ONLINE' | 'OFFLINE' | 'BOTH';
  status: 'ACTIVE' | 'INACTIVE';
  createdAt: string;
}

export interface HotelSeason {
  id: string;
  hotelId: string;
  seasonLabel: string; // e.g. "2026 Summer", "2026/27 Winter", "2027 Summer"
  dateIn?: string;
  dateOut?: string;
  status: 'ACTIVE' | 'EXPIRED' | 'UPCOMING';
  createdAt: string;
}

// ------------------------------------------------------------------------------
// Rates & Quote Options
// ------------------------------------------------------------------------------
export type RateCategory = 'RED' | 'GREEN' | 'YELLOW' | 'SPECIAL_1' | 'SPECIAL_2' | 'SPECIAL_3' | 'CUSTOM';

export const RATE_CATEGORY_LABELS: Record<RateCategory, { label: string; meaning: string; colorClass: string }> = {
  RED: { label: 'Red Rate', meaning: 'Lowest Rate', colorClass: 'text-red-700 bg-red-100 border-red-300' },
  GREEN: { label: 'Green Rate', meaning: 'Normal Rate', colorClass: 'text-emerald-700 bg-emerald-100 border-emerald-300' },
  YELLOW: { label: 'Yellow Rate', meaning: 'Highest Rate', colorClass: 'text-amber-700 bg-amber-100 border-amber-300' },
  SPECIAL_1: { label: 'Special Rate 1', meaning: 'Agency Negotiated Slot 1', colorClass: 'text-purple-700 bg-purple-100 border-purple-300' },
  SPECIAL_2: { label: 'Special Rate 2', meaning: 'Agency Negotiated Slot 2', colorClass: 'text-indigo-700 bg-indigo-100 border-indigo-300' },
  SPECIAL_3: { label: 'Special Rate 3', meaning: 'Agency Negotiated Slot 3', colorClass: 'text-pink-700 bg-pink-100 border-pink-300' },
  CUSTOM: { label: 'Custom Quote', meaning: 'Salesperson Entered Rate', colorClass: 'text-blue-700 bg-blue-100 border-blue-300' },
};

export type RecipientScope = 'INDIVIDUAL' | 'ENTIRE_MARKET' | 'ENTIRE_AGENCY';

export interface SpecialRate {
  id: string;
  agencyId: string;
  hotelId: string;
  seasonId?: string;
  slot: 1 | 2 | 3;
  amount: number;
  currency: string;
  dateIn: string;
  dateOut: string;
  notes?: string;
  createdBy: string;
  createdAt: string;
}

export interface SalesActivity {
  id: string;
  staffId: string;
  staffName: string;
  agencyId: string;
  agencyName: string;
  memberId?: string;
  memberName?: string;
  hotelId: string;
  hotelName: string;
  activityDate: string;
  notes: string;
  hasVoiceNote: boolean;
  voiceNoteUrl?: string;
  createdAt: string;
}
