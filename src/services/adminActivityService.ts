import { supabase } from '../lib/supabase';

export type AdminAuditActionType =
  // Calculation Setup Actions
  | 'CALCULATION_SETUP_CREATED'
  | 'CALCULATION_SETUP_UPDATED'
  | 'CALCULATION_SETUP_APPLIED'
  | 'CALCULATION_SETUP_ARCHIVED'
  | 'CALCULATION_SETUP_DELETED'
  // Rate Calculation & Grid Actions
  | 'RATE_CALCULATION_STARTED'
  | 'RATE_CALCULATION_COMPLETED'
  | 'RATE_CELL_MANUALLY_OVERRIDDEN'
  | 'RATE_CELL_RESET_TO_AUTO'
  | 'RATE_SHEET_SAVED'
  | 'RATE_SHEET_PUBLISHED'
  | 'RATE_SHEET_ARCHIVED'
  // Sales & Quoting Actions
  | 'QUOTE_DISPATCHED'
  | 'AGENCY_VISIT_LOGGED'
  | 'HOTEL_CREATED'
  | 'HOTEL_UPDATED'
  // Standard Domain Actions
  | 'INSERT'
  | 'UPDATE'
  | 'DELETE'
  | 'PUBLISH'
  | 'GRANT'
  | 'REVOKE';

export interface AdminActivityRecord {
  id: string;
  actor_id: string;
  actor_name: string;
  action: AdminAuditActionType;
  target_table: string;
  target_record_id?: string | null;
  hotel_id?: string | null;
  hotel_name?: string | null;
  season_id?: string | null;
  season_label?: string | null;
  rate_sheet_id?: string | null;
  setup_id?: string | null;
  setup_name?: string | null;
  old_values?: Record<string, unknown> | null;
  new_values?: Record<string, unknown> | null;
  details?: string | null;
  timestamp: string;
  success: boolean;
}

export interface ActivityFilterParams {
  staffId?: string;
  action?: string;
  hotelId?: string;
  dateFrom?: string;
  dateTo?: string;
  searchQuery?: string;
}

const LOCAL_AUDIT_LOG_KEY = 'window_crm_admin_activity_logs_v1';

export const adminActivityService = {
  /**
   * Log an activity record.
   */
  async logActivity(
    entry: Omit<AdminActivityRecord, 'id' | 'timestamp' | 'success'> & { success?: boolean }
  ): Promise<void> {
    const record: AdminActivityRecord = {
      ...entry,
      id: crypto.randomUUID(),
      timestamp: new Date().toISOString(),
      success: entry.success ?? true,
    };

    let mappedAction = record.action;
    if (record.action.includes('CREATED') || record.action.includes('SAVED')) {
      mappedAction = 'INSERT';
    } else if (record.action.includes('UPDATED') || record.action.includes('OVERRIDDEN')) {
      mappedAction = 'UPDATE';
    } else if (record.action.includes('PUBLISHED') || record.action.includes('APPLIED')) {
      mappedAction = 'PUBLISH';
    } else if (record.action.includes('DELETED')) {
      mappedAction = 'DELETE';
    }

    try {
      await supabase.from('audit_logs').insert([
        {
          actor_id: record.actor_id,
          action: mappedAction,
          target_table: record.target_table,
          target_record_id: record.target_record_id,
          old_values: record.old_values ? { ...record.old_values, custom_action: record.action } : { custom_action: record.action },
          new_values: {
            ...record.new_values,
            actor_name: record.actor_name,
            custom_action: record.action,
            hotel_id: record.hotel_id,
            hotel_name: record.hotel_name,
            details: record.details,
          },
        },
      ]);
    } catch {
      // Non-fatal
    }

    try {
      const raw = localStorage.getItem(LOCAL_AUDIT_LOG_KEY);
      const list: AdminActivityRecord[] = raw ? JSON.parse(raw) : [];
      const updated = [record, ...list].slice(0, 500);
      localStorage.setItem(LOCAL_AUDIT_LOG_KEY, JSON.stringify(updated));
    } catch (e) {
      console.warn('Local audit persistence error:', e);
    }
  },

  /**
   * Fetch activity logs with rich multi-criteria filters.
   * Synthesizes from audit_logs, quotes dispatches, and sales activities!
   */
  async getActivities(filters?: ActivityFilterParams): Promise<AdminActivityRecord[]> {
    let logs: AdminActivityRecord[] = [];

    try {
      // 1. Fetch remote audit_logs, quotes, sales activities, AND latest domain entities (agencies, hotels, etc.)
      const [auditRes, quotesRes, visitsRes, recentAgenciesRes, recentHotelsRes] = await Promise.all([
        supabase.from('audit_logs').select('*').order('timestamp', { ascending: false }).limit(200),
        supabase
          .from('quotes')
          .select(`
            id,
            quote_reference,
            created_at,
            sender:user_profiles!sender_id (id, full_name),
            agency:travel_agencies!agency_id (name),
            items:quote_items (hotel_name_snapshot)
          `)
          .order('created_at', { ascending: false })
          .limit(100),
        supabase
          .from('sales_activities')
          .select(`
            id,
            activity_date,
            activity_type,
            notes,
            created_at,
            staff:user_profiles!staff_id (id, full_name),
            agency:travel_agencies!agency_id (name),
            hotel:hotels!hotel_id (hotel_name)
          `)
          .order('created_at', { ascending: false })
          .limit(100),
        supabase
          .from('travel_agencies')
          .select('id, name, created_at, updated_at')
          .order('created_at', { ascending: false })
          .limit(50),
        supabase
          .from('hotels')
          .select('id, hotel_name, created_at, updated_at')
          .order('created_at', { ascending: false })
          .limit(30),
      ]);

      // Map audit_logs
      if (!auditRes.error && auditRes.data) {
        auditRes.data.forEach((d) => {
          const newV = (d.new_values || {}) as Record<string, unknown>;
          logs.push({
            id: d.id,
            actor_id: d.actor_id,
            actor_name: (newV.actor_name as string) || 'Staff User',
            action: (newV.custom_action as AdminAuditActionType) || (d.action as AdminAuditActionType),
            target_table: d.target_table,
            target_record_id: d.target_record_id,
            hotel_id: (newV.hotel_id as string) || null,
            hotel_name: (newV.hotel_name as string) || null,
            season_id: null,
            season_label: null,
            rate_sheet_id: null,
            setup_id: null,
            setup_name: null,
            old_values: d.old_values,
            new_values: d.new_values,
            details: (newV.details as string) || `Database transaction on ${d.target_table}`,
            timestamp: d.timestamp,
            success: true,
          });
        });
      }

      // Map quote dispatches as system audit records
      if (!quotesRes.error && quotesRes.data) {
        quotesRes.data.forEach((q: any) => {
          const hotelList = (q.items || []).map((i: any) => i.hotel_name_snapshot).filter(Boolean);
          const hotelNameStr = hotelList.join(', ');
          logs.push({
            id: `quote-audit-${q.id}`,
            actor_id: q.sender?.id || '',
            actor_name: q.sender?.full_name || 'Staff Member',
            action: 'QUOTE_DISPATCHED' as any,
            target_table: 'quotes',
            target_record_id: q.id,
            hotel_id: null,
            hotel_name: hotelNameStr || 'Partner Hotels',
            timestamp: q.created_at,
            details: `Dispatched quote #${q.quote_reference} for [${hotelNameStr}] to agency "${q.agency?.name || 'Partner Agency'}"`,
            success: true,
          });
        });
      }

      // Map agency visits as audit records
      if (!visitsRes.error && visitsRes.data) {
        visitsRes.data.forEach((v: any) => {
          logs.push({
            id: `visit-audit-${v.id}`,
            actor_id: v.staff?.id || '',
            actor_name: v.staff?.full_name || 'Sales Staff',
            action: 'AGENCY_VISIT_LOGGED' as any,
            target_table: 'sales_activities',
            target_record_id: v.id,
            hotel_id: null,
            hotel_name: v.hotel?.hotel_name || null,
            timestamp: v.created_at,
            details: `Conducted ${v.activity_type} with ${v.agency?.name || 'Agency'}. Pitched: ${v.hotel?.hotel_name || 'Hotel Portfolio'}. Notes: ${v.notes?.slice(0, 80)}...`,
            success: true,
          });
        });
      }

      // Map created/updated agencies as audit records
      if (!recentAgenciesRes.error && recentAgenciesRes.data) {
        recentAgenciesRes.data.forEach((ag: any) => {
          logs.push({
            id: `agency-audit-${ag.id}`,
            actor_id: '',
            actor_name: 'Sales / Admin User',
            action: 'INSERT' as any,
            target_table: 'travel_agencies',
            target_record_id: ag.id,
            timestamp: ag.updated_at || ag.created_at,
            details: `Managed agency profile for "${ag.name}"`,
            success: true,
          });
        });
      }

      // Map created/updated hotels as audit records
      if (!recentHotelsRes.error && recentHotelsRes.data) {
        recentHotelsRes.data.forEach((h: any) => {
          logs.push({
            id: `hotel-audit-${h.id}`,
            actor_id: '',
            actor_name: 'Operations Team',
            action: 'HOTEL_UPDATED' as any,
            target_table: 'hotels',
            target_record_id: h.id,
            hotel_name: h.hotel_name,
            timestamp: h.updated_at || h.created_at,
            details: `Configured inventory/contract for property "${h.hotel_name}"`,
            success: true,
          });
        });
      }
    } catch (e) {
      console.warn('Error reading audit logs:', e);
    }

    // Merge with local logs
    try {
      const raw = localStorage.getItem(LOCAL_AUDIT_LOG_KEY);
      if (raw) {
        const localList: AdminActivityRecord[] = JSON.parse(raw);
        const existingIds = new Set(logs.map((l) => l.id));
        for (const item of localList) {
          if (!existingIds.has(item.id)) {
            logs.push(item);
          }
        }
      }
    } catch (e) {
      console.warn('Error reading local activity logs:', e);
    }

    // Sort descending by timestamp
    logs.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    // Apply filters
    if (!filters) return logs;

    return logs.filter((log) => {
      if (filters.staffId && log.actor_id !== filters.staffId) {
        return false;
      }
      if (filters.action && log.action !== filters.action) {
        return false;
      }
      if (filters.hotelId && log.hotel_id !== filters.hotelId) {
        return false;
      }
      if (filters.dateFrom && new Date(log.timestamp) < new Date(filters.dateFrom)) {
        return false;
      }
      if (filters.dateTo) {
        const to = new Date(filters.dateTo);
        to.setHours(23, 59, 59, 999);
        if (new Date(log.timestamp) > to) {
          return false;
        }
      }
      if (filters.searchQuery) {
        const q = filters.searchQuery.toLowerCase();
        const matchActor = log.actor_name?.toLowerCase().includes(q);
        const matchHotel = log.hotel_name?.toLowerCase().includes(q);
        const matchDetails = log.details?.toLowerCase().includes(q);
        const matchTable = log.target_table?.toLowerCase().includes(q);
        const matchAction = log.action?.toLowerCase().includes(q);
        if (!matchActor && !matchHotel && !matchDetails && !matchTable && !matchAction) {
          return false;
        }
      }
      return true;
    });
  },
};
