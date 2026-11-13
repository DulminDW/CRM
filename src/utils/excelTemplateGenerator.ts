// ==============================================================================
// WINDOW COMPANIES CRM — EXCEL BULK IMPORT TEMPLATE GENERATOR
// Uses SheetJS (xlsx) to generate clean Excel (.xlsx) templates
// ==============================================================================

import * as XLSX from 'xlsx';
import { ImportCategory } from '../types/bulkImport';
import { CATEGORY_DEFINITIONS } from './bulkImportDefinitions';

/**
 * Generates and triggers download of an Excel template file for the specified category.
 */
export function downloadCategoryTemplate(category: ImportCategory) {
  const meta = CATEGORY_DEFINITIONS[category];
  if (!meta) return;

  const workbook = XLSX.utils.book_new();

  // 1. Data Entry Sheet
  const headerRow = meta.columns.map((c) => c.label + (c.required ? ' *' : ''));
  const headerKeys = meta.columns.map((c) => c.key);

  const sampleDataRows = meta.sampleRows.map((sample) => {
    return headerKeys.map((key) => sample[key] || '');
  });

  const sheetData = [headerRow, ...sampleDataRows];
  const worksheet = XLSX.utils.aoa_to_sheet(sheetData);

  // Set column widths based on label and content
  worksheet['!cols'] = meta.columns.map((c) => ({
    wch: Math.max(c.label.length + 8, 22)
  }));

  XLSX.utils.book_append_sheet(workbook, worksheet, meta.title);

  // 2. Field Instructions / Guidelines Sheet
  const instructionsHeader = ['Field Name', 'Required?', 'Description', 'Accepted Values / Example'];
  const instructionsRows = meta.columns.map((col) => [
    col.label,
    col.required ? 'YES' : 'NO (Optional)',
    col.description,
    col.example
  ]);

  const instructionsSheetData = [
    ['WINDOW COMPANIES MANAGEMENT SYSTEM — BULK IMPORT TEMPLATE'],
    [`Category: ${meta.title}`],
    [meta.shortDescription],
    meta.parentEntityHint ? [`Notice: ${meta.parentEntityHint}`] : [''],
    ['---------------------------------------------------------------------------------------------------'],
    instructionsHeader,
    ...instructionsRows
  ];

  const instructionsSheet = XLSX.utils.aoa_to_sheet(instructionsSheetData);
  instructionsSheet['!cols'] = [{ wch: 25 }, { wch: 15 }, { wch: 45 }, { wch: 35 }];

  XLSX.utils.book_append_sheet(workbook, instructionsSheet, 'Field Instructions');

  // Trigger download
  const fileName = `WindowCompanies_${meta.id}_Template.xlsx`;
  XLSX.writeFile(workbook, fileName);
}

