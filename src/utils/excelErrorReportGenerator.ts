// ==============================================================================
// WINDOW COMPANIES CRM — EXCEL ERROR REPORT GENERATOR
// Exports an Excel file containing failed or skipped rows with explanations
// and correction advice.
// ==============================================================================

import * as XLSX from 'xlsx';
import { ImportCategory, ParsedRowData, ImportExecutionResult } from '../types/bulkImport';
import { CATEGORY_DEFINITIONS } from './bulkImportDefinitions';

/**
 * Generates an Excel error and skipped rows report for staff download and review
 */
export function downloadErrorReport(
  category: ImportCategory,
  originalFileName: string,
  rows: ParsedRowData[],
  executionResult?: ImportExecutionResult
) {
  const meta = CATEGORY_DEFINITIONS[category];
  const workbook = XLSX.utils.book_new();

  // Create lookup for execution failure messages
  const execFailureMap = new Map<number, string>();
  if (executionResult) {
    executionResult.rowResults.forEach((r) => {
      if (r.status === 'FAILED' || r.status === 'SKIPPED') {
        execFailureMap.set(r.excelRowNumber, r.message || '');
      }
    });
  }

  // Filter for rows that had errors, duplicates, or failed execution
  const problematicRows = rows.filter((r) => {
    return (
      r.status === 'ERROR' ||
      r.status === 'DUPLICATE' ||
      r.selectedAction === 'SKIP' ||
      (execFailureMap.has(r.excelRowNumber) && executionResult?.rowResults.find((x) => x.excelRowNumber === r.excelRowNumber)?.status === 'FAILED')
    );
  });

  const headers = [
    'Original Excel Row',
    'Record Identifier',
    'Issue Type',
    'Error / Skip Details',
    'Suggested Correction',
    ...meta.columns.map((c) => c.label)
  ];

  const dataRows = problematicRows.map((row) => {
    const recordIdentifier =
      row.mapped.hotel_name || row.mapped.name || row.mapped.season_label || row.mapped.full_name || `Row ${row.excelRowNumber}`;

    let issueType = row.status;
    let details = '';
    let suggestion = '';

    const execErr = execFailureMap.get(row.excelRowNumber);
    if (execErr) {
      issueType = 'ERROR';
      details = `Execution Error: ${execErr}`;
      suggestion = 'Verify parent relationships and database constraints before retrying.';
    } else if (row.status === 'ERROR') {
      details = row.errors.join(' | ');
      suggestion = 'Check required fields, date formats (YYYY-MM-DD), or email syntax.';
    } else if (row.status === 'DUPLICATE') {
      details = row.duplicateReason || 'Duplicate record identified.';
      suggestion = 'Keep existing record, or edit name/email to avoid conflict.';
    } else if (row.selectedAction === 'SKIP') {
      details = 'Skipped by user action.';
      suggestion = 'Review and select IMPORT if this record should be added.';
    }

    const colValues = meta.columns.map((c) => row.mapped[c.key] || '');

    return [
      row.excelRowNumber,
      recordIdentifier,
      issueType,
      details,
      suggestion,
      ...colValues
    ];
  });

  const sheetData = [
    [`WINDOW COMPANIES CRM — IMPORT ERROR & SKIPPED REPORT`],
    [`Category: ${meta.title} | Source File: ${originalFileName}`],
    [`Generated: ${new Date().toLocaleString()}`],
    ['---------------------------------------------------------------------------------------------------'],
    headers,
    ...dataRows
  ];

  const worksheet = XLSX.utils.aoa_to_sheet(sheetData);
  worksheet['!cols'] = [
    { wch: 18 },
    { wch: 28 },
    { wch: 14 },
    { wch: 45 },
    { wch: 45 },
    ...meta.columns.map(() => ({ wch: 22 }))
  ];

  XLSX.utils.book_append_sheet(workbook, worksheet, 'Error & Skipped Rows');

  const cleanBaseName = originalFileName.replace(/\.[^/.]+$/, '');
  const outFileName = `Import_Errors_${cleanBaseName}_${meta.id}.xlsx`;
  XLSX.writeFile(workbook, outFileName);
}

