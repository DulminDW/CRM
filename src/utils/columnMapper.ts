// ==============================================================================
// WINDOW COMPANIES CRM — AUTOMATIC & MANUAL COLUMN MAPPER
// Automatically matches common Excel header variations to database fields.
// ==============================================================================

import { ImportCategory } from '../types/bulkImport';
import { CATEGORY_DEFINITIONS } from './bulkImportDefinitions';

/**
 * Normalizes header string for comparison (strips punctuation, extra spaces, and asterisks)
 */
export function normalizeHeader(header: string): string {
  return header
    .toLowerCase()
    .replace(/\*/g, '')
    .replace(/[_-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Suggests best field match for a given Excel header based on defined aliases
 */
export function matchHeaderToField(category: ImportCategory, excelHeader: string): string | null {
  const meta = CATEGORY_DEFINITIONS[category];
  if (!meta) return null;

  const normalized = normalizeHeader(excelHeader);

  // Exact alias match
  for (const col of meta.columns) {
    if (normalizeHeader(col.label) === normalized) {
      return col.key;
    }
    for (const alias of col.aliases) {
      if (normalizeHeader(alias) === normalized) {
        return col.key;
      }
    }
  }

  // Substring match
  for (const col of meta.columns) {
    for (const alias of col.aliases) {
      const normAlias = normalizeHeader(alias);
      if (normalized.includes(normAlias) || normAlias.includes(normalized)) {
        return col.key;
      }
    }
  }

  return null;
}

/**
 * Generates an initial column mapping from Excel headers to target schema fields
 */
export function autoMapColumns(
  category: ImportCategory,
  excelHeaders: string[]
): Record<string, string> {
  const mapping: Record<string, string> = {};
  const usedFields = new Set<string>();

  excelHeaders.forEach((header) => {
    const matchedField = matchHeaderToField(category, header);
    if (matchedField && !usedFields.has(matchedField)) {
      mapping[header] = matchedField;
      usedFields.add(matchedField);
    } else {
      mapping[header] = ''; // Unmapped
    }
  });

  return mapping;
}

