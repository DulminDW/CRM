// ==============================================================================
// WINDOW COMPANIES CRM — EXCEL FILE PARSER & EXTRACTOR
// Reads .xlsx, .xls, and .csv files safely using SheetJS.
// Features:
// - Extracts worksheet names and allows sheet selection.
// - Detects header row automatically (skipping preliminary banner rows).
// - Preserves phone numbers, codes, and text strings without scientific notation.
// - Sanitizes strings and trims whitespace.
// ==============================================================================

import * as XLSX from 'xlsx';

export interface ExtractedWorkbookData {
  fileName: string;
  sheetNames: string[];
  activeSheet: string;
  rawRows: Array<Record<string, unknown>>;
  headers: string[];
}

/**
 * Reads binary file into SheetJS workbook
 */
export async function parseExcelFile(file: File): Promise<XLSX.WorkBook> {
  const data = await file.arrayBuffer();
  // cellText: true preserves formatted strings for numbers/phones without converting to scientific notation
  const workbook = XLSX.read(data, {
    type: 'array',
    cellDates: true,
    cellText: false,
    raw: true
  });
  return workbook;
}

/**
 * Extracts rows from a specific worksheet
 */
export function extractWorksheetData(
  workbook: XLSX.WorkBook,
  fileName: string,
  sheetName?: string
): ExtractedWorkbookData {
  const sheetNames = workbook.SheetNames;
  const targetSheetName = sheetName && sheetNames.includes(sheetName) ? sheetName : sheetNames[0] || '';
  const worksheet = workbook.Sheets[targetSheetName];

  if (!worksheet) {
    return {
      fileName,
      sheetNames,
      activeSheet: targetSheetName,
      rawRows: [],
      headers: []
    };
  }

  // Convert worksheet to array of arrays
  const rawMatrix: unknown[][] = XLSX.utils.sheet_to_json(worksheet, {
    header: 1,
    defval: '',
    blankrows: false
  });

  if (rawMatrix.length === 0) {
    return {
      fileName,
      sheetNames,
      activeSheet: targetSheetName,
      rawRows: [],
      headers: []
    };
  }

  // Find header row: skip empty rows or single-column title banners
  let headerRowIndex = 0;
  for (let i = 0; i < Math.min(rawMatrix.length, 10); i++) {
    const row = rawMatrix[i] || [];
    const nonBlankCount = row.filter((cell) => cell !== undefined && cell !== null && String(cell).trim().length > 0).length;
    if (nonBlankCount >= 2) {
      headerRowIndex = i;
      break;
    }
  }

  const rawHeaders = (rawMatrix[headerRowIndex] || []).map((h) => String(h || '').trim());
  const validHeaders = rawHeaders.filter((h) => h.length > 0);

  // Extract subsequent data rows
  const rawRows: Array<Record<string, unknown>> = [];
  for (let rowIndex = headerRowIndex + 1; rowIndex < rawMatrix.length; rowIndex++) {
    const rowArray = rawMatrix[rowIndex] || [];
    // Skip completely blank rows
    const hasValues = rowArray.some((cell) => cell !== undefined && cell !== null && String(cell).trim().length > 0);
    if (!hasValues) continue;

    const rowObj: Record<string, unknown> = {
      _excelRowNumber: rowIndex + 1 // 1-based row number in Excel
    };

    rawHeaders.forEach((header, colIndex) => {
      if (!header) return;
      let val = rowArray[colIndex];

      // Format Date instances to YYYY-MM-DD
      if (val instanceof Date) {
        const yyyy = val.getFullYear();
        const mm = String(val.getMonth() + 1).padStart(2, '0');
        const dd = String(val.getDate()).padStart(2, '0');
        val = `${yyyy}-${mm}-${dd}`;
      } else if (typeof val === 'number') {
        // Convert to string safely to avoid scientific notation
        val = String(val);
      } else if (typeof val === 'string') {
        val = val.trim();
      }

      rowObj[header] = val;
    });

    rawRows.push(rowObj);
  }

  return {
    fileName,
    sheetNames,
    activeSheet: targetSheetName,
    rawRows,
    headers: validHeaders
  };
}

