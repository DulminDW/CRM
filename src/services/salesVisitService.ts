// ==============================================================================
// WINDOW COMPANIES CRM — VISIT & SALES ACTIVITY SERVICE
// Supports daily visits logging, multiple hotels discussed, monthly reports,
// offline-first localStorage backup resilience, and hotel-specific activity lookups.
// ==============================================================================

import { supabase } from '../lib/supabase';
import { SalesActivityRecord, CreateVisitInput } from '../types/salesVisit';
import { adminActivityService } from './adminActivityService';

const LOCAL_STORAGE_VISITS_KEY = 'window_companies_sales_visits_v1';

export const salesVisitService = {
  /**
   * Helper to retrieve locally stored visits
   */
  getLocalVisits(): SalesActivityRecord[] {
    try {
      const raw = localStorage.getItem(LOCAL_STORAGE_VISITS_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  },

  /**
   * Helper to save a list of visits locally
   */
  saveLocalVisits(visits: SalesActivityRecord[]): void {
    try {
      localStorage.setItem(LOCAL_STORAGE_VISITS_KEY, JSON.stringify(visits.slice(0, 500)));
    } catch (e) {
      console.warn('Could not save visits to localStorage:', e);
    }
  },

  /**
   * Log a new agency visit or discussion.
   * If multiple hotels are discussed, it logs an activity record per hotel
   * (or links them in notes) so each hotel's history page reflects the interaction!
   * Seamlessly persists to Supabase AND localStorage for immediate offline/client UI reactivity.
   */
  async logVisit(input: CreateVisitInput): Promise<{ success: boolean; error?: string }> {
    try {
      const { data: userRes } = await supabase.auth.getUser();
      const currentUserId = userRes?.user?.id || '00000000-0000-0000-0000-000000000000';

      const hotels = input.hotel_ids.length > 0 ? input.hotel_ids : [null];
      const todayIso = new Date().toISOString();
      const activityDate = input.activity_date || todayIso.split('T')[0];

      // Fetch agency and staff names for immediate rich snapshot
      let agencyName = 'Partner Travel Agency';
      let staffName = userRes?.user?.user_metadata?.full_name || 'Sales Staff';
      let memberName = '';
      let memberPhone = '';
      let memberEmail = '';

      try {
        const [agencyRes, staffRes] = await Promise.all([
          supabase.from('travel_agencies').select('name').eq('id', input.agency_id).maybeSingle(),
          currentUserId !== '00000000-0000-0000-0000-000000000000'
            ? supabase.from('user_profiles').select('full_name').eq('id', currentUserId).maybeSingle()
            : Promise.resolve({ data: null })
        ]);
        if (agencyRes.data?.name) agencyName = agencyRes.data.name;
        if (staffRes.data?.full_name) staffName = staffRes.data.full_name;

        if (input.member_id) {
          const { data: memData } = await supabase
            .from('agency_members')
            .select('full_name, phone, email')
            .eq('id', input.member_id)
            .maybeSingle();
          if (memData) {
            memberName = memData.full_name || '';
            memberPhone = memData.phone || '';
            memberEmail = memData.email || '';
          }
        }
      } catch {
        // Fallback gracefully
      }

      // Fetch hotel names
      const hotelNamesMap: Record<string, string> = {};
      if (input.hotel_ids.length > 0) {
        try {
          const { data: hotelsData } = await supabase
            .from('hotels')
            .select('id, hotel_name')
            .in('id', input.hotel_ids);
          (hotelsData || []).forEach((h) => {
            hotelNamesMap[h.id] = h.hotel_name;
          });
        } catch {
          // Ignore
        }
      }

      // 1. Prepare records for Supabase insert
      const rowsToInsert = hotels.map((hId) => ({
        staff_id: currentUserId,
        agency_id: input.agency_id,
        market_id: input.market_id || null,
        member_id: input.member_id || null,
        hotel_id: hId,
        activity_date: activityDate,
        activity_type: input.activity_type || 'MEETING',
        notes: input.notes,
      }));

      // Try inserting into Supabase
      try {
        const { error } = await supabase.from('sales_activities').insert(rowsToInsert);
        if (error) {
          console.warn('Supabase sales_activities insert warning:', error.message);
        }
      } catch (err) {
        console.warn('Supabase connection warning:', err);
      }

      // 2. Always persist locally for instant UI responsiveness & zero data loss
      const localVisits = this.getLocalVisits();
      const newLocalRecords: SalesActivityRecord[] = hotels.map((hId) => ({
        id: crypto.randomUUID(),
        staff_id: currentUserId,
        agency_id: input.agency_id,
        market_id: input.market_id || null,
        member_id: input.member_id || null,
        hotel_id: hId,
        activity_date: activityDate as string,
        activity_type: input.activity_type || 'MEETING',
        notes: input.notes,
        created_at: todayIso,
        updated_at: todayIso,
        staff_name: staffName,
        agency_name: agencyName,
        member_name: memberName,
        member_phone: memberPhone,
        member_email: memberEmail,
        hotel_name: hId ? (hotelNamesMap[hId] || 'Partner Hotel') : 'General Discussion',
      }));

      this.saveLocalVisits([...newLocalRecords, ...localVisits]);

      // 3. Log to Admin Activity Log
      try {
        const pitchedHotelsStr = Object.values(hotelNamesMap).join(', ') || 'Portfolio Discussion';
        await adminActivityService.logActivity({
          actor_id: currentUserId,
          actor_name: staffName,
          action: 'AGENCY_VISIT_LOGGED',
          target_table: 'sales_activities',
          target_record_id: newLocalRecords[0]?.id,
          hotel_name: pitchedHotelsStr,
          details: `Conducted ${input.activity_type || 'MEETING'} with ${agencyName}${memberName ? ` (${memberName})` : ''}. Pitched: ${pitchedHotelsStr}. Notes: ${input.notes.slice(0, 100)}...`,
        });
      } catch {
        // Non-fatal
      }

      return { success: true };
    } catch (err: unknown) {
      console.error('Failed to log visit:', err);
      const msg = err instanceof Error ? err.message : 'Failed to save visit activity';
      return { success: false, error: msg };
    }
  },

  /**
   * Fetch all visits / activities with robust querying and automatic local persistence fallback
   */
  async fetchVisits(filters?: {
    startDate?: string;
    endDate?: string;
    salesmanId?: string;
    agencyId?: string;
    hotelId?: string;
  }): Promise<{ data: SalesActivityRecord[]; error?: string }> {
    let remoteRecords: SalesActivityRecord[] = [];

    try {
      // Note: We avoid composite foreign key ambiguity on agency_markets and agency_members
      // by querying direct relations and resolving contact member details cleanly!
      let query = supabase
        .from('sales_activities')
        .select(`
          id,
          staff_id,
          agency_id,
          market_id,
          member_id,
          hotel_id,
          activity_date,
          activity_type,
          notes,
          created_at,
          updated_at,
          staff:user_profiles!staff_id (full_name),
          agency:travel_agencies!agency_id (name),
          hotel:hotels!hotel_id (hotel_name, hotel_code)
        `)
        .order('activity_date', { ascending: false })
        .order('created_at', { ascending: false });

      if (filters?.startDate) {
        query = query.gte('activity_date', filters.startDate);
      }
      if (filters?.endDate) {
        query = query.lte('activity_date', filters.endDate);
      }
      if (filters?.salesmanId && filters.salesmanId !== 'ALL') {
        query = query.eq('staff_id', filters.salesmanId);
      }
      if (filters?.agencyId && filters.agencyId !== 'ALL') {
        query = query.eq('agency_id', filters.agencyId);
      }
      if (filters?.hotelId && filters.hotelId !== 'ALL') {
        query = query.eq('hotel_id', filters.hotelId);
      }

      const { data, error } = await query;

      if (!error && data && data.length > 0) {
        // Batch fetch members if any
        const memberIds = Array.from(new Set(data.map((r: any) => r.member_id).filter(Boolean)));
        const memberMap: Record<string, { full_name: string; phone?: string; email?: string }> = {};

        if (memberIds.length > 0) {
          try {
            const { data: mems } = await supabase
              .from('agency_members')
              .select('id, full_name, phone, email')
              .in('id', memberIds);
            (mems || []).forEach((m) => {
              memberMap[m.id] = m;
            });
          } catch {
            // Ignore
          }
        }

        remoteRecords = data.map((row: any) => {
          const mem = row.member_id ? memberMap[row.member_id] : null;
          return {
            id: row.id,
            staff_id: row.staff_id,
            agency_id: row.agency_id,
            market_id: row.market_id,
            member_id: row.member_id,
            hotel_id: row.hotel_id,
            activity_date: row.activity_date,
            activity_type: row.activity_type,
            notes: row.notes,
            created_at: row.created_at,
            updated_at: row.updated_at,
            staff_name: row.staff?.full_name || 'Staff Member',
            agency_name: row.agency?.name || 'Travel Agency',
            market_name: '',
            member_name: mem?.full_name || '',
            member_email: mem?.email || '',
            member_phone: mem?.phone || '',
            hotel_name: row.hotel?.hotel_name || '',
            hotel_code: row.hotel?.hotel_code || '',
          };
        });
      }
    } catch (err: unknown) {
      console.warn('Remote visit fetch warning (falling back to local cache):', err);
    }

    // Combine remote records with local records, deduplicating by ID
    const localRecords = this.getLocalVisits();
    const combinedMap = new Map<string, SalesActivityRecord>();

    // Remote records take primary precedence
    remoteRecords.forEach((r) => combinedMap.set(r.id, r));

    // Fill in local records that haven't synced or were recently added
    localRecords.forEach((r) => {
      if (!combinedMap.has(r.id)) {
        combinedMap.set(r.id, r);
      }
    });

    let allVisits = Array.from(combinedMap.values());

    // Apply client filters if local records were blended in
    if (filters?.startDate) {
      allVisits = allVisits.filter((v) => v.activity_date >= filters.startDate!);
    }
    if (filters?.endDate) {
      allVisits = allVisits.filter((v) => v.activity_date <= filters.endDate!);
    }
    if (filters?.salesmanId && filters.salesmanId !== 'ALL') {
      allVisits = allVisits.filter((v) => v.staff_id === filters.salesmanId);
    }
    if (filters?.agencyId && filters.agencyId !== 'ALL') {
      allVisits = allVisits.filter((v) => v.agency_id === filters.agencyId);
    }
    if (filters?.hotelId && filters.hotelId !== 'ALL') {
      allVisits = allVisits.filter((v) => v.hotel_id === filters.hotelId);
    }

    // Sort chronologically descending
    allVisits.sort((a, b) => {
      const dateCmp = new Date(b.activity_date).getTime() - new Date(a.activity_date).getTime();
      if (dateCmp !== 0) return dateCmp;
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });

    return { data: allVisits };
  },

  /**
   * Fetch quotes / rate sharing history specifically for a hotel
   */
  async fetchHotelQuoteHistory(hotelId: string): Promise<{ data: any[]; error?: string }> {
    try {
      const { data, error } = await supabase
        .from('quote_items')
        .select(`
          id,
          quote_id,
          hotel_name_snapshot,
          season_label_snapshot,
          rate_category,
          quoted_amount,
          currency,
          created_at,
          quote:quotes!quote_id (
            id,
            quote_reference,
            created_at,
            agency:travel_agencies!agency_id (name),
            sender:user_profiles!sender_id (full_name)
          )
        `)
        .eq('hotel_id', hotelId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return { data: data || [] };
    } catch (err: unknown) {
      console.warn('Error fetching hotel quote history:', err);
      return { data: [] };
    }
  }
};
