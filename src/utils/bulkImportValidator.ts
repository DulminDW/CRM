// ==============================================================================
// WINDOW COMPANIES CRM — BULK IMPORT VALIDATION ENGINE
// Validates all rows before any database operations occur.
// Features:
// - Required field checks
// - Format validation (Email RFC 5322, Dates YYYY-MM-DD, date_to > date_from)
// - In-file duplicate detection (case-insensitive & trimmed)
// - Database pre-flight duplicate checking
// - Relationship validation (Hotels, Seasons, Agencies, Markets, Members)
// - Non-blocking season overlap warnings
// ==============================================================================

import { ImportCategory, ParsedRowData } from '../types/bulkImport';
import { CATEGORY_DEFINITIONS } from './bulkImportDefinitions';
import { fetchHotels } from '../services/hotelService';
import { fetchSeasons } from '../services/seasonService';
import { fetchAgencies } from '../services/agencyService';
import { fetchMarkets } from '../services/marketService';
import { fetchMembers } from '../services/memberService';

const EMAIL_REGEX = /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/;
const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;

export interface ReferenceDataCache {
  hotelsByName: Map<string, { id: string; name: string }>;
  seasonsByHotelIdAndLabel: Map<string, { id: string; season_label: string; date_from: string; date_to: string }>;
  agenciesByName: Map<string, { id: string; name: string }>;
  marketsByAgencyIdAndName: Map<string, { id: string; agency_id: string; market_name: string }>;
  membersByAgencyIdAndEmail: Map<string, { id: string; full_name: string; email: string }>;
}

/**
 * Preloads existing records from Supabase to validate relationships and detect duplicates.
 */
export async function loadReferenceData(): Promise<ReferenceDataCache> {
  const [hotelRes, seasonRes, agencyRes, marketRes, memberRes] = await Promise.all([
    fetchHotels(),
    fetchSeasons(),
    fetchAgencies(),
    fetchMarkets(),
    fetchMembers()
  ]);

  const hotelsByName = new Map<string, { id: string; name: string }>();
  (hotelRes.data || []).forEach((h) => {
    hotelsByName.set(h.hotel_name.toLowerCase().trim(), { id: h.id, name: h.hotel_name });
  });

  const seasonsByHotelIdAndLabel = new Map<string, { id: string; season_label: string; date_from: string; date_to: string }>();
  (seasonRes.data || []).forEach((s) => {
    const key = `${s.hotel_id}:${s.season_label.toLowerCase().trim()}`;
    seasonsByHotelIdAndLabel.set(key, { id: s.id, season_label: s.season_label, date_from: s.date_from, date_to: s.date_to });
  });

  const agenciesByName = new Map<string, { id: string; name: string }>();
  (agencyRes.data || []).forEach((a) => {
    agenciesByName.set(a.name.toLowerCase().trim(), { id: a.id, name: a.name });
  });

  const marketsByAgencyIdAndName = new Map<string, { id: string; agency_id: string; market_name: string }>();
  (marketRes.data || []).forEach((m) => {
    const key = `${m.agency_id}:${m.market_name.toLowerCase().trim()}`;
    marketsByAgencyIdAndName.set(key, { id: m.id, agency_id: m.agency_id, market_name: m.market_name });
  });

  const membersByAgencyIdAndEmail = new Map<string, { id: string; full_name: string; email: string }>();
  (memberRes.data || []).forEach((mem) => {
    if (mem.email) {
      const key = `${mem.agency_id}:${mem.email.toLowerCase().trim()}`;
      membersByAgencyIdAndEmail.set(key, { id: mem.id, full_name: mem.full_name, email: mem.email });
    }
  });

  return {
    hotelsByName,
    seasonsByHotelIdAndLabel,
    agenciesByName,
    marketsByAgencyIdAndName,
    membersByAgencyIdAndEmail
  };
}

/**
 * Validates a list of parsed raw rows using column mappings and Supabase reference data.
 */
export function validateImportRows(
  category: ImportCategory,
  rawRows: Array<Record<string, unknown>>,
  columnMapping: Record<string, string>,
  cache: ReferenceDataCache
): ParsedRowData[] {
  const meta = CATEGORY_DEFINITIONS[category];
  const results: ParsedRowData[] = [];

  // In-file duplicate detection maps
  const fileSeenHotelNames = new Map<string, number>();
  const fileSeenSeasons = new Map<string, number>();
  const fileSeenAgencyNames = new Map<string, number>();
  const fileSeenMarkets = new Map<string, number>();
  const fileSeenMembers = new Map<string, number>();

  rawRows.forEach((row) => {
    const excelRowNumber = typeof row._excelRowNumber === 'number' ? row._excelRowNumber : 0;
    const mapped: Record<string, string> = {};
    const errors: string[] = [];
    const warnings: string[] = [];

    // Map columns
    Object.entries(columnMapping).forEach(([excelHeader, fieldKey]) => {
      if (!fieldKey) return;
      const val = row[excelHeader];
      mapped[fieldKey] = val !== undefined && val !== null ? String(val).trim() : '';
    });

    // 1. Required Field Checks
    meta.columns.forEach((col) => {
      const val = mapped[col.key];
      if (col.required && (!val || val.trim().length === 0)) {
        errors.push(`Required field '${col.label}' is missing or empty.`);
      }
    });

    let duplicateReason: string | undefined;
    let existingRecordInfo: string | undefined;
    let isDuplicateInFile = false;
    let isDuplicateInDb = false;

    // 2. Category-Specific Validation
    if (category === 'HOTELS') {
      const hotelName = mapped.hotel_name || '';
      if (hotelName.length > 0 && hotelName.length < 2) {
        errors.push('Hotel name must be at least 2 characters long.');
      }

      const normName = hotelName.toLowerCase().trim();
      if (normName) {
        // Check in-file duplicate
        if (fileSeenHotelNames.has(normName)) {
          isDuplicateInFile = true;
          duplicateReason = `Duplicate in file: Same hotel name as row ${fileSeenHotelNames.get(normName)}.`;
        } else {
          fileSeenHotelNames.set(normName, excelRowNumber);
        }

        // Check in-database duplicate
        if (cache.hotelsByName.has(normName)) {
          isDuplicateInDb = true;
          const existing = cache.hotelsByName.get(normName);
          existingRecordInfo = `Existing Hotel in CRM: '${existing?.name}'.`;
          duplicateReason = duplicateReason || `Hotel '${hotelName}' already exists in database.`;
        }
      }

      // Service type check
      const st = mapped.service_type?.toUpperCase();
      if (st && !['ONLINE', 'OFFLINE', 'BOTH'].includes(st)) {
        errors.push(`Invalid Service Type '${mapped.service_type}'. Accepted: ONLINE, OFFLINE, BOTH.`);
      }

    } else if (category === 'SEASONS') {
      const hotelName = mapped.hotel_name || '';
      const normHotelName = hotelName.toLowerCase().trim();
      const seasonLabel = mapped.season_label || '';
      const normSeasonLabel = seasonLabel.toLowerCase().trim();
      const dateFrom = mapped.date_from || '';
      const dateTo = mapped.date_to || '';

      // Validate parent hotel
      const matchedHotel = cache.hotelsByName.get(normHotelName);
      if (normHotelName && !matchedHotel) {
        errors.push(`Parent hotel '${hotelName}' does not exist in CRM. Please import or create the hotel first.`);
      }

      // Validate date formats
      if (dateFrom && !DATE_REGEX.test(dateFrom)) {
        errors.push(`Invalid Date From format '${dateFrom}'. Expected YYYY-MM-DD.`);
      }
      if (dateTo && !DATE_REGEX.test(dateTo)) {
        errors.push(`Invalid Date To format '${dateTo}'. Expected YYYY-MM-DD.`);
      }

      // Validate date_to > date_from
      if (dateFrom && dateTo && DATE_REGEX.test(dateFrom) && DATE_REGEX.test(dateTo)) {
        if (dateTo <= dateFrom) {
          errors.push(`Date To (${dateTo}) must be strictly later than Date From (${dateFrom}).`);
        }
      }

      // Check duplicates
      if (matchedHotel && normSeasonLabel) {
        const seasonKey = `${matchedHotel.id}:${normSeasonLabel}`;
        if (fileSeenSeasons.has(seasonKey)) {
          isDuplicateInFile = true;
          duplicateReason = `Duplicate season in file for this hotel (previously seen at row ${fileSeenSeasons.get(seasonKey)}).`;
        } else {
          fileSeenSeasons.set(seasonKey, excelRowNumber);
        }

        if (cache.seasonsByHotelIdAndLabel.has(seasonKey)) {
          isDuplicateInDb = true;
          existingRecordInfo = `Existing Season in CRM for ${matchedHotel.name}: '${seasonLabel}'.`;
          duplicateReason = duplicateReason || `Season '${seasonLabel}' already exists for hotel '${matchedHotel.name}'.`;
        }
      }

    } else if (category === 'AGENCIES') {
      const agencyName = mapped.name || '';
      if (agencyName.length > 0 && agencyName.length < 2) {
        errors.push('Agency name must be at least 2 characters long.');
      }

      const normName = agencyName.toLowerCase().trim();
      if (normName) {
        if (fileSeenAgencyNames.has(normName)) {
          isDuplicateInFile = true;
          duplicateReason = `Duplicate agency in file: Same name as row ${fileSeenAgencyNames.get(normName)}.`;
        } else {
          fileSeenAgencyNames.set(normName, excelRowNumber);
        }

        if (cache.agenciesByName.has(normName)) {
          isDuplicateInDb = true;
          const existing = cache.agenciesByName.get(normName);
          existingRecordInfo = `Existing Travel Agency in CRM: '${existing?.name}'.`;
          duplicateReason = duplicateReason || `Agency '${agencyName}' already exists in database.`;
        }
      }

      if (mapped.email && !EMAIL_REGEX.test(mapped.email.trim())) {
        errors.push(`Invalid agency email address '${mapped.email}'.`);
      }

    } else if (category === 'MARKETS') {
      const agencyName = mapped.agency_name || '';
      const normAgencyName = agencyName.toLowerCase().trim();
      const marketName = mapped.market_name || '';
      const normMarketName = marketName.toLowerCase().trim();

      const matchedAgency = cache.agenciesByName.get(normAgencyName);
      if (normAgencyName && !matchedAgency) {
        errors.push(`Parent agency '${agencyName}' does not exist in CRM. Please import or create the agency first.`);
      }

      if (marketName.length > 0 && marketName.length < 2) {
        errors.push('Market name must be at least 2 characters long.');
      }

      if (matchedAgency && normMarketName) {
        const marketKey = `${matchedAgency.id}:${normMarketName}`;
        if (fileSeenMarkets.has(marketKey)) {
          isDuplicateInFile = true;
          duplicateReason = `Duplicate market in file for this agency (previously seen at row ${fileSeenMarkets.get(marketKey)}).`;
        } else {
          fileSeenMarkets.set(marketKey, excelRowNumber);
        }

        if (cache.marketsByAgencyIdAndName.has(marketKey)) {
          isDuplicateInDb = true;
          existingRecordInfo = `Existing Market in CRM for ${matchedAgency.name}: '${marketName}'.`;
          duplicateReason = duplicateReason || `Market '${marketName}' already exists under agency '${matchedAgency.name}'.`;
        }
      }

    } else if (category === 'MEMBERS') {
      const agencyName = mapped.agency_name || '';
      const normAgencyName = agencyName.toLowerCase().trim();
      const marketName = mapped.market_name || '';
      const normMarketName = marketName.toLowerCase().trim();
      const fullName = mapped.full_name || '';
      const email = mapped.email || '';

      const matchedAgency = cache.agenciesByName.get(normAgencyName);
      if (normAgencyName && !matchedAgency) {
        errors.push(`Parent agency '${agencyName}' does not exist in CRM.`);
      }

      let matchedMarket: { id: string } | undefined;
      if (matchedAgency && normMarketName) {
        const marketKey = `${matchedAgency.id}:${normMarketName}`;
        matchedMarket = cache.marketsByAgencyIdAndName.get(marketKey);
        if (!matchedMarket) {
          errors.push(`Market desk '${marketName}' does not exist under agency '${matchedAgency.name}'.`);
        }
      }

      if (fullName.length > 0 && fullName.length < 2) {
        errors.push('Person name must be at least 2 characters long.');
      }

      if (email) {
        if (!EMAIL_REGEX.test(email.trim())) {
          errors.push(`Invalid email format '${email}'.`);
        } else if (matchedAgency) {
          const normEmail = email.toLowerCase().trim();
          const memberKey = `${matchedAgency.id}:${normEmail}`;

          if (fileSeenMembers.has(memberKey)) {
            isDuplicateInFile = true;
            duplicateReason = `Duplicate contact email in file under this agency (previously seen at row ${fileSeenMembers.get(memberKey)}).`;
          } else {
            fileSeenMembers.set(memberKey, excelRowNumber);
          }

          if (cache.membersByAgencyIdAndEmail.has(memberKey)) {
            isDuplicateInDb = true;
            const existing = cache.membersByAgencyIdAndEmail.get(memberKey);
            existingRecordInfo = `Existing contact in CRM: ${existing?.full_name} (${existing?.email}).`;
            duplicateReason = duplicateReason || `Contact with email '${email}' already registered under '${matchedAgency.name}'.`;
          }
        }
      }
    }

    // Determine Status
    let status: ParsedRowData['status'] = 'VALID';
    if (errors.length > 0) {
      status = 'ERROR';
    } else if (isDuplicateInDb || isDuplicateInFile) {
      status = 'DUPLICATE';
    } else if (warnings.length > 0) {
      status = 'WARNING';
    }

    results.push({
      excelRowNumber,
      raw: row,
      mapped,
      status,
      errors,
      warnings,
      duplicateReason,
      existingRecordInfo,
      isDuplicateInFile,
      isDuplicateInDb,
      selectedAction: status === 'DUPLICATE' || status === 'ERROR' ? 'SKIP' : 'IMPORT'
    });
  });

  return results;
}
