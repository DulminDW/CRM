// ==============================================================================
// WINDOW COMPANIES CRM — BULK IMPORT EXECUTION SERVICE
// Safely executes batch inserts into Supabase using existing service conventions.
// Records audit logs to public.excel_import_history.
// ==============================================================================

import { supabase, isSupabaseConfigured } from '../lib/supabase';
import {
  ImportCategory,
  ParsedRowData,
  ImportExecutionResult,
  ExcelImportHistoryRecord
} from '../types/bulkImport';
import { createHotel } from './hotelService';
import { createSeason } from './seasonService';
import { createAgency } from './agencyService';
import { createMarket } from './marketService';
import { createMember } from './memberService';
import { ReferenceDataCache } from '../utils/bulkImportValidator';
import { HotelServiceType, HotelStatus, SeasonStatus } from '../types/hotelHierarchy';
import { RecordStatus } from '../types/agencyHierarchy';

/**
 * Executes the database import for rows selected for import
 */
export async function executeBulkImport(
  category: ImportCategory,
  fileName: string,
  rows: ParsedRowData[],
  cache: ReferenceDataCache,
  userId: string
): Promise<ImportExecutionResult> {
  const startedAt = new Date().toISOString();
  const importId = crypto.randomUUID();

  let successfulCount = 0;
  let skippedCount = 0;
  let failedCount = 0;

  const rowResults: ImportExecutionResult['rowResults'] = [];

  for (const row of rows) {
    if (row.selectedAction === 'SKIP' || row.status === 'ERROR') {
      skippedCount++;
      rowResults.push({
        excelRowNumber: row.excelRowNumber,
        recordIdentifier: row.mapped.hotel_name || row.mapped.name || row.mapped.season_label || row.mapped.full_name || `Row ${row.excelRowNumber}`,
        status: 'SKIPPED',
        message: row.duplicateReason || (row.errors.length > 0 ? row.errors.join('; ') : 'Skipped by user')
      });
      continue;
    }

    try {
      if (category === 'HOTELS') {
        const hotelName = row.mapped.hotel_name || '';
        const res = await createHotel({
          hotel_name: hotelName,
          hotel_code: row.mapped.hotel_code || undefined,
          area: row.mapped.area || undefined,
          service_type: (row.mapped.service_type?.toUpperCase() as HotelServiceType) || 'BOTH',
          status: (row.mapped.status?.toUpperCase() as HotelStatus) || 'ACTIVE'
        });

        if (res.error || !res.data) {
          failedCount++;
          rowResults.push({
            excelRowNumber: row.excelRowNumber,
            recordIdentifier: hotelName || `Row ${row.excelRowNumber}`,
            status: 'FAILED',
            message: res.error || 'Failed to insert hotel'
          });
        } else {
          successfulCount++;
          // Update cache for subsequent lookups
          cache.hotelsByName.set(hotelName.toLowerCase().trim(), {
            id: res.data.id,
            name: res.data.hotel_name
          });
          rowResults.push({
            excelRowNumber: row.excelRowNumber,
            recordIdentifier: res.data.hotel_name,
            status: 'SUCCESS'
          });
        }

      } else if (category === 'SEASONS') {
        const hotelName = row.mapped.hotel_name || '';
        const seasonLabel = row.mapped.season_label || '';
        const hotel = cache.hotelsByName.get(hotelName.toLowerCase().trim());
        if (!hotel) {
          failedCount++;
          rowResults.push({
            excelRowNumber: row.excelRowNumber,
            recordIdentifier: seasonLabel || `Row ${row.excelRowNumber}`,
            status: 'FAILED',
            message: `Parent hotel '${hotelName}' not resolved.`
          });
          continue;
        }

        const res = await createSeason({
          hotel_id: hotel.id,
          season_label: seasonLabel,
          date_from: row.mapped.date_from || '',
          date_to: row.mapped.date_to || '',
          status: (row.mapped.status?.toUpperCase() as SeasonStatus) || 'ACTIVE'
        });

        if (res.error || !res.data) {
          failedCount++;
          rowResults.push({
            excelRowNumber: row.excelRowNumber,
            recordIdentifier: seasonLabel || `Row ${row.excelRowNumber}`,
            status: 'FAILED',
            message: res.error || 'Failed to insert season'
          });
        } else {
          successfulCount++;
          rowResults.push({
            excelRowNumber: row.excelRowNumber,
            recordIdentifier: `${hotelName} - ${res.data.season_label}`,
            status: 'SUCCESS'
          });
        }

      } else if (category === 'AGENCIES') {
        const agencyName = row.mapped.name || '';
        const res = await createAgency({
          name: agencyName,
          code: row.mapped.code || undefined,
          country: row.mapped.country || undefined,
          city: row.mapped.city || undefined,
          phone: row.mapped.phone || undefined,
          email: row.mapped.email || undefined,
          status: (row.mapped.status?.toUpperCase() as RecordStatus) || 'ACTIVE'
        });

        if (res.error || !res.data) {
          failedCount++;
          rowResults.push({
            excelRowNumber: row.excelRowNumber,
            recordIdentifier: agencyName || `Row ${row.excelRowNumber}`,
            status: 'FAILED',
            message: res.error || 'Failed to insert agency'
          });
        } else {
          successfulCount++;
          cache.agenciesByName.set(agencyName.toLowerCase().trim(), {
            id: res.data.id,
            name: res.data.name
          });
          rowResults.push({
            excelRowNumber: row.excelRowNumber,
            recordIdentifier: res.data.name,
            status: 'SUCCESS'
          });
        }

      } else if (category === 'MARKETS') {
        const agencyName = row.mapped.agency_name || '';
        const marketName = row.mapped.market_name || '';
        const agency = cache.agenciesByName.get(agencyName.toLowerCase().trim());
        if (!agency) {
          failedCount++;
          rowResults.push({
            excelRowNumber: row.excelRowNumber,
            recordIdentifier: marketName || `Row ${row.excelRowNumber}`,
            status: 'FAILED',
            message: `Parent agency '${agencyName}' not resolved.`
          });
          continue;
        }

        const res = await createMarket({
          agency_id: agency.id,
          market_name: marketName,
          description: row.mapped.description || undefined
        });

        if (res.error || !res.data) {
          failedCount++;
          rowResults.push({
            excelRowNumber: row.excelRowNumber,
            recordIdentifier: marketName || `Row ${row.excelRowNumber}`,
            status: 'FAILED',
            message: res.error || 'Failed to insert market desk'
          });
        } else {
          successfulCount++;
          cache.marketsByAgencyIdAndName.set(`${agency.id}:${marketName.toLowerCase().trim()}`, {
            id: res.data.id,
            agency_id: agency.id,
            market_name: res.data.market_name
          });
          rowResults.push({
            excelRowNumber: row.excelRowNumber,
            recordIdentifier: `${agencyName} - ${res.data.market_name}`,
            status: 'SUCCESS'
          });
        }

      } else if (category === 'MEMBERS') {
        const agencyName = row.mapped.agency_name || '';
        const marketName = row.mapped.market_name || '';
        const fullName = row.mapped.full_name || '';
        const email = row.mapped.email || '';

        const agency = cache.agenciesByName.get(agencyName.toLowerCase().trim());
        const marketKey = agency ? `${agency.id}:${marketName.toLowerCase().trim()}` : '';
        const market = cache.marketsByAgencyIdAndName.get(marketKey);

        if (!agency || !market) {
          failedCount++;
          rowResults.push({
            excelRowNumber: row.excelRowNumber,
            recordIdentifier: fullName || `Row ${row.excelRowNumber}`,
            status: 'FAILED',
            message: `Agency or market hierarchy could not be resolved.`
          });
          continue;
        }

        const res = await createMember({
          agency_id: agency.id,
          market_id: market.id,
          full_name: fullName,
          email: email.toLowerCase().trim(),
          phone: row.mapped.phone || undefined,
          position: row.mapped.position || undefined,
          member_code: row.mapped.member_code || undefined,
          status: (row.mapped.status?.toUpperCase() as RecordStatus) || 'ACTIVE'
        });

        if (res.error || !res.data) {
          failedCount++;
          rowResults.push({
            excelRowNumber: row.excelRowNumber,
            recordIdentifier: fullName || `Row ${row.excelRowNumber}`,
            status: 'FAILED',
            message: res.error || 'Failed to insert member'
          });
        } else {
          successfulCount++;
          rowResults.push({
            excelRowNumber: row.excelRowNumber,
            recordIdentifier: `${res.data.full_name} (${res.data.email})`,
            status: 'SUCCESS'
          });
        }
      }

    } catch (err) {
      failedCount++;
      rowResults.push({
        excelRowNumber: row.excelRowNumber,
        recordIdentifier: `Row ${row.excelRowNumber}`,
        status: 'FAILED',
        message: err instanceof Error ? err.message : 'Unknown exception occurred'
      });
    }
  }

  const completedAt = new Date().toISOString();
  let status: 'COMPLETED' | 'PARTIAL' | 'FAILED' = 'COMPLETED';
  if (failedCount > 0 && successfulCount > 0) status = 'PARTIAL';
  else if (failedCount > 0 && successfulCount === 0) status = 'FAILED';

  // Audit history logging
  if (isSupabaseConfigured && userId) {
    try {
      await supabase.from('excel_import_history').insert({
        id: importId,
        category,
        file_name: fileName,
        total_rows: rows.length,
        successful_rows: successfulCount,
        skipped_rows: skippedCount,
        failed_rows: failedCount,
        status,
        error_summary: rowResults.filter((r) => r.status === 'FAILED'),
        started_by: userId,
        started_at: startedAt,
        completed_at: completedAt
      });
    } catch (logErr) {
      console.warn('Could not record import history log (migration pending):', logErr);
    }
  }

  return {
    importId,
    category,
    fileName,
    totalRows: rows.length,
    successfulRows: successfulCount,
    skippedRows: skippedCount,
    failedRows: failedCount,
    status,
    startedAt,
    completedAt,
    rowResults
  };
}

/**
 * Fetches recent Excel bulk import history logs
 */
export async function fetchImportHistory(): Promise<{ data: ExcelImportHistoryRecord[]; error: string | null }> {
  if (!isSupabaseConfigured) {
    return { data: [], error: 'Supabase client is not configured' };
  }

  try {
    const { data, error } = await supabase
      .from('excel_import_history')
      .select(`
        id,
        category,
        file_name,
        total_rows,
        successful_rows,
        skipped_rows,
        failed_rows,
        status,
        error_summary,
        started_by,
        started_at,
        completed_at,
        user_profiles:started_by (full_name, email)
      `)
      .order('started_at', { ascending: false })
      .limit(30);

    if (error) {
      return { data: [], error: error.message };
    }

    return { data: (data || []) as unknown as ExcelImportHistoryRecord[], error: null };
  } catch (err: unknown) {
    return { data: [], error: err instanceof Error ? err.message : 'Failed to fetch import history' };
  }
}
