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
   * Attempts database write to audit_logs (mapping action to valid constraint),
   * and preserves detailed metadata locally so admin audit view is immediately functional.
   */
  async logActivity(payload: {
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
    success?: boolean;
  }): Promise<void> {
    const record: AdminActivityRecord = {
      id: typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `log_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      actor_id: payload.actor_id,
      actor_name: payload.actor_name,
      action: payload.action,
      target_table: payload.target_table,
      target_record_id: payload.target_record_id || null,
      hotel_id: payload.hotel_id || null,
      hotel_name: payload.hotel_name || null,
      season_id: payload.season_id || null,
      season_label: payload.season_label || null,
      rate_sheet_id: payload.rate_sheet_id || null,
      setup_id: payload.setup_id || null,
      setup_name: payload.setup_name || null,
      old_values: payload.old_values || null,
      new_values: payload.new_values || null,
      details: payload.details || null,
      timestamp: new Date().toISOString(),
      success: payload.success ?? true
    };

    // 1. Try writing to public.audit_logs in Supabase
    // Note: chk_audit_action constraint currently allows: 'INSERT', 'UPDATE', 'DELETE', 'PUBLISH', 'GRANT', 'REVOKE'.
    // We map custom events safely to prevent check constraint violations on remote DB.
    let mappedAction = 'INSERT';
    if (record.action.includes('UPDATE') || record.action.includes('OVERRIDDEN') || record.action.includes('RESET')) {
      mappedAction = 'UPDATE';
    } else if (record.action.includes('PUBLISHED')) {
      mappedAction = 'PUBLISH';
    } else if (record.action.includes('DELETED')) {
      mappedAction = 'DELETE';
    }

    try {
      await supabase.from('audit_logs').insert([{
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
          details: record.details
        }
      }]);
    } catch {
      // Remote insert non-fatal in pre-migration or offline mode
    }

    // 2. Append to local audit store
    try {
      const raw = localStorage.getItem(LOCAL_AUDIT_LOG_KEY);
      const list: AdminActivityRecord[] = raw ? JSON.parse(raw) : [];
      // Keep most recent 500 records
      const updated = [record, ...list].slice(0, 500);
      localStorage.setItem(LOCAL_AUDIT_LOG_KEY, JSON.stringify(updated));
    } catch (e) {
      console.warn('Local audit persistence error:', e);
    }
  },

  /**
   * Fetch activity logs with rich multi-criteria filters
   */
  async getActivities(filters?: ActivityFilterParams): Promise<AdminActivityRecord[]> {
    let logs: AdminActivityRecord[] = [];

    // Try fetching remote audit_logs
    try {
      const { data, error } = await supabase
        .from('audit_logs')
        .select('*')
        .order('timestamp', { ascending: false })
        .limit(100);

      if (!error && data && data.length > 0) {
        // Map to AdminActivityRecord
        logs = data.map((d) => {
          const newV = (d.new_values || {}) as Record<string, unknown>;
          return {
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
            details: (newV.details as string) || null,
            timestamp: d.timestamp,
            success: true
          };
        });
      }
    } catch {
      // Fallback
    }

    // Merge with local logs to ensure custom event fidelity (no duplicate IDs)
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
      if (filters.dateFrom) {
        const dFrom = new Date(filters.dateFrom).getTime();
        const logTime = new Date(log.timestamp).getTime();
        if (logTime < dFrom) return false;
      }
      if (filters.dateTo) {
        const dTo = new Date(filters.dateTo + 'T23:59:59').getTime();
        const logTime = new Date(log.timestamp).getTime();
        if (logTime > dTo) return false;
      }
      if (filters.searchQuery) {
        const q = filters.searchQuery.toLowerCase();
        const matchName = log.actor_name?.toLowerCase().includes(q);
        const matchAction = log.action?.toLowerCase().includes(q);
        const matchDetails = log.details?.toLowerCase().includes(q);
        const matchHotel = log.hotel_name?.toLowerCase().includes(q);
        const matchSetup = log.setup_name?.toLowerCase().includes(q);
        if (!matchName && !matchAction && !matchDetails && !matchHotel && !matchSetup) {
          return false;
        }
      }
      return true;
    });
  }
};
