// ==============================================================================
// WINDOW COMPANIES CRM — EXCEL BULK IMPORT DATA CONTRACTS & SCHEMAS
// ==============================================================================

export type ImportCategory = 'HOTELS' | 'SEASONS' | 'AGENCIES' | 'MARKETS' | 'MEMBERS';

export interface ColumnDefinition {
  key: string;
  label: string;
  required: boolean;
  aliases: string[];
  description: string;
  example: string;
}

export type RowValidationStatus = 'VALID' | 'WARNING' | 'ERROR' | 'DUPLICATE' | 'SKIPPED';

export interface ParsedRowData {
  excelRowNumber: number;
  raw: Record<string, unknown>;
  mapped: Record<string, string>;
  status: RowValidationStatus;
  errors: string[];
  warnings: string[];
  duplicateReason?: string;
  existingRecordInfo?: string;
  isDuplicateInFile?: boolean;
  isDuplicateInDb?: boolean;
  selectedAction: 'IMPORT' | 'SKIP';
}

export interface ImportSummaryStats {
  totalRows: number;
  validRows: number;
  warningRows: number;
  errorRows: number;
  duplicateRows: number;
  readyToImportRows: number;
}

export interface ImportExecutionResult {
  importId: string;
  category: ImportCategory;
  fileName: string;
  totalRows: number;
  successfulRows: number;
  skippedRows: number;
  failedRows: number;
  status: 'COMPLETED' | 'PARTIAL' | 'FAILED';
  startedAt: string;
  completedAt: string;
  rowResults: Array<{
    excelRowNumber: number;
    recordIdentifier: string;
    status: 'SUCCESS' | 'SKIPPED' | 'FAILED';
    message?: string;
  }>;
}

export interface ExcelImportHistoryRecord {
  id: string;
  category: ImportCategory;
  file_name: string;
  total_rows: number;
  successful_rows: number;
  skipped_rows: number;
  failed_rows: number;
  status: 'IN_PROGRESS' | 'COMPLETED' | 'FAILED' | 'PARTIAL';
  error_summary: unknown;
  started_by: string;
  started_at: string;
  completed_at: string;
  user_profiles?: {
    full_name: string;
    email: string;
  };
}

export interface ErrorReportItem {
  excelRowNumber: number;
  recordIdentifier: string;
  errorType: 'ERROR' | 'WARNING' | 'DUPLICATE';
  errorMessage: string;
  suggestedCorrection: string;
  importResult: 'FAILED' | 'SKIPPED' | 'WARNING_IMPORTED';
  dataSnapshot: Record<string, string>;
}

