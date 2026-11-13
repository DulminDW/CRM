// ==============================================================================
// WINDOW COMPANIES CRM — EXCEL BULK IMPORT PAGE
// Six-step streamlined bulk import workflow for Hotels, Seasons, Agencies, Markets & Members.
// ==============================================================================

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import * as XLSX from 'xlsx';
import {
  FileSpreadsheet,
  Download,
  Upload,
  ArrowRight,
  ArrowLeft,
  CheckCircle2,
  AlertTriangle,
  AlertCircle,
  Clock,
  Layers,
  RotateCcw,
  Check,
  Building2,
  CalendarDays,
  Globe2,
  Users2,
  Hotel as HotelIcon
} from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import {
  ImportCategory,
  ParsedRowData,
  ImportExecutionResult,
  ExcelImportHistoryRecord
} from '../types/bulkImport';
import { CATEGORY_DEFINITIONS } from '../utils/bulkImportDefinitions';
import { downloadCategoryTemplate } from '../utils/excelTemplateGenerator';
import { parseExcelFile, extractWorksheetData, ExtractedWorkbookData } from '../utils/excelParser';
import { autoMapColumns } from '../utils/columnMapper';
import { loadReferenceData, validateImportRows, ReferenceDataCache } from '../utils/bulkImportValidator';
import { executeBulkImport, fetchImportHistory } from '../services/bulkImportService';
import { downloadErrorReport } from '../utils/excelErrorReportGenerator';

type StepNumber = 1 | 2 | 3 | 4 | 5 | 6;

export const BulkImportPage: React.FC = () => {
  const { user, profile } = useAuth();

  // Wizard Navigation
  const [currentStep, setCurrentStep] = useState<StepNumber>(1);
  const [selectedCategory, setSelectedCategory] = useState<ImportCategory>('HOTELS');

  // Workbook State
  const [activeWorkbook, setActiveWorkbook] = useState<XLSX.WorkBook | null>(null);
  const [uploadedFileName, setUploadedFileName] = useState<string>('');
  const [extractedData, setExtractedData] = useState<ExtractedWorkbookData | null>(null);
  const [selectedSheetName, setSelectedSheetName] = useState<string>('');

  // Column Mapping State
  const [columnMapping, setColumnMapping] = useState<Record<string, string>>({});

  // Validation State
  const [referenceCache, setReferenceCache] = useState<ReferenceDataCache | null>(null);
  const [, setLoadingCache] = useState<boolean>(false);
  const [parsedRows, setParsedRows] = useState<ParsedRowData[]>([]);
  const [tableFilter, setTableFilter] = useState<'ALL' | 'VALID' | 'WARNING' | 'ERROR' | 'DUPLICATE' | 'READY'>('ALL');

  // Execution State
  const [isExecuting, setIsExecuting] = useState<boolean>(false);
  const [executionResult, setExecutionResult] = useState<ImportExecutionResult | null>(null);

  // History Tab
  const [historyLogs, setHistoryLogs] = useState<ExcelImportHistoryRecord[]>([]);
  const [loadingHistory, setLoadingHistory] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<'IMPORT' | 'HISTORY'>('IMPORT');

  // Category Metadata
  const currentCategoryMeta = useMemo(() => CATEGORY_DEFINITIONS[selectedCategory], [selectedCategory]);

  // Load Reference Cache when category changes or when entering step 4
  const refreshCache = useCallback(async () => {
    setLoadingCache(true);
    try {
      const cache = await loadReferenceData();
      setReferenceCache(cache);
    } catch (err) {
      console.error('Failed to load database cache for validation:', err);
    } finally {
      setLoadingCache(false);
    }
  }, []);

  useEffect(() => {
    refreshCache();
  }, [refreshCache]);

  // Load audit history
  const loadHistory = useCallback(async () => {
    setLoadingHistory(true);
    const res = await fetchImportHistory();
    setHistoryLogs(res.data);
    setLoadingHistory(false);
  }, []);

  useEffect(() => {
    if (activeTab === 'HISTORY') {
      loadHistory();
    }
  }, [activeTab, loadHistory]);

  // Handle File Upload
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const wb = await parseExcelFile(file);
      setActiveWorkbook(wb);
      setUploadedFileName(file.name);

      const firstSheet = wb.SheetNames[0] || '';
      setSelectedSheetName(firstSheet);

      const data = extractWorksheetData(wb, file.name, firstSheet);
      setExtractedData(data);

      // Auto-map columns
      const initialMap = autoMapColumns(selectedCategory, data.headers);
      setColumnMapping(initialMap);

      // Advance to Step 3 (Mapping)
      setCurrentStep(3);
    } catch (err) {
      alert(`Could not read Excel file: ${err instanceof Error ? err.message : String(err)}`);
    }
  };

  // Handle Sheet Change
  const handleSheetChange = (sheetName: string) => {
    if (!activeWorkbook) return;
    setSelectedSheetName(sheetName);
    const data = extractWorksheetData(activeWorkbook, uploadedFileName, sheetName);
    setExtractedData(data);

    const initialMap = autoMapColumns(selectedCategory, data.headers);
    setColumnMapping(initialMap);
  };

  // Run validation whenever column mapping or raw data changes
  const runValidation = useCallback(() => {
    if (!extractedData || !referenceCache) return;
    const validated = validateImportRows(
      selectedCategory,
      extractedData.rawRows,
      columnMapping,
      referenceCache
    );
    setParsedRows(validated);
  }, [selectedCategory, extractedData, columnMapping, referenceCache]);

  // Proceed from Step 3 (Mapping) to Step 4 (Preview)
  const handleProceedToPreview = () => {
    runValidation();
    setCurrentStep(4);
  };

  // Summary counts
  const stats = useMemo(() => {
    const total = parsedRows.length;
    const valid = parsedRows.filter((r) => r.status === 'VALID').length;
    const warning = parsedRows.filter((r) => r.status === 'WARNING').length;
    const error = parsedRows.filter((r) => r.status === 'ERROR').length;
    const duplicate = parsedRows.filter((r) => r.status === 'DUPLICATE').length;
    const ready = parsedRows.filter((r) => r.selectedAction === 'IMPORT' && r.status !== 'ERROR').length;
    return { total, valid, warning, error, duplicate, ready };
  }, [parsedRows]);

  // Filtered rows for preview table
  const displayedRows = useMemo(() => {
    return parsedRows.filter((row) => {
      if (tableFilter === 'ALL') return true;
      if (tableFilter === 'VALID') return row.status === 'VALID';
      if (tableFilter === 'WARNING') return row.status === 'WARNING';
      if (tableFilter === 'ERROR') return row.status === 'ERROR';
      if (tableFilter === 'DUPLICATE') return row.status === 'DUPLICATE';
      if (tableFilter === 'READY') return row.selectedAction === 'IMPORT' && row.status !== 'ERROR';
      return true;
    });
  }, [parsedRows, tableFilter]);

  // Toggle individual row action (IMPORT / SKIP)
  const toggleRowAction = (excelRowNumber: number) => {
    setParsedRows((prev) =>
      prev.map((r) => {
        if (r.excelRowNumber !== excelRowNumber) return r;
        return {
          ...r,
          selectedAction: r.selectedAction === 'IMPORT' ? 'SKIP' : 'IMPORT'
        };
      })
    );
  };

  // Bulk action toggles
  const setAllRowsAction = (action: 'IMPORT' | 'SKIP') => {
    setParsedRows((prev) =>
      prev.map((r) => {
        if (r.status === 'ERROR') return { ...r, selectedAction: 'SKIP' };
        return { ...r, selectedAction: action };
      })
    );
  };

  // Execute Import
  const handleConfirmImport = async () => {
    if (!referenceCache || !user) return;
    setIsExecuting(true);
    try {
      const result = await executeBulkImport(
        selectedCategory,
        uploadedFileName,
        parsedRows,
        referenceCache,
        user.id
      );
      setExecutionResult(result);
      setCurrentStep(6);
    } catch (err) {
      alert(`Import error: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setIsExecuting(false);
    }
  };

  // Reset / Start Over
  const handleReset = () => {
    setActiveWorkbook(null);
    setUploadedFileName('');
    setExtractedData(null);
    setColumnMapping({});
    setParsedRows([]);
    setExecutionResult(null);
    setCurrentStep(1);
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#D9E0EA]">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-2 bg-[#1455D9] text-white rounded-xl shadow-xs">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <h1 className="text-xl font-bold text-[#101828]">Bulk Excel Import</h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-50 text-[#1455D9] border border-blue-200">
              Validated Batch Engine
            </span>
          </div>
          <p className="text-xs text-[#667085] mt-1">
            Safely import Hotels, Seasons, Agencies, Markets, and Contacts into Supabase from Excel/CSV files.
          </p>
        </div>

        {/* Top Action Tabs */}
        <div className="flex items-center gap-2 bg-[#F8FAFC] p-1 rounded-xl border border-[#D9E0EA]">
          <button
            type="button"
            onClick={() => setActiveTab('IMPORT')}
            className={`px-4 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
              activeTab === 'IMPORT' ? 'bg-white text-[#1455D9] shadow-xs' : 'text-[#667085] hover:text-[#101828]'
            }`}
          >
            Import Wizard
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('HISTORY')}
            className={`px-4 py-1.5 text-xs font-semibold rounded-lg transition-colors flex items-center gap-1.5 ${
              activeTab === 'HISTORY' ? 'bg-white text-[#1455D9] shadow-xs' : 'text-[#667085] hover:text-[#101828]'
            }`}
          >
            <Clock className="w-3.5 h-3.5" />
            <span>Audit History</span>
          </button>
        </div>
      </div>

      {/* VIEW 1: AUDIT HISTORY TAB */}
      {activeTab === 'HISTORY' && (
        <div className="bg-white rounded-2xl border border-[#D9E0EA] p-5 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-sm text-[#101828] flex items-center gap-2">
              <Clock className="w-4 h-4 text-[#1455D9]" />
              Recent Excel Import Activity
            </h3>
            <button
              type="button"
              onClick={loadHistory}
              disabled={loadingHistory}
              className="text-xs text-[#1455D9] font-medium hover:underline flex items-center gap-1"
            >
              <RotateCcw className={`w-3.5 h-3.5 ${loadingHistory ? 'animate-spin' : ''}`} /> Refresh
            </button>
          </div>

          <div className="overflow-x-auto border border-[#D9E0EA] rounded-xl">
            <table className="w-full text-left text-xs divide-y divide-[#D9E0EA]">
              <thead className="bg-[#F8FAFC] text-[#667085] font-semibold">
                <tr>
                  <th className="p-3">Import Date</th>
                  <th className="p-3">Category</th>
                  <th className="p-3">Source File</th>
                  <th className="p-3 text-center">Total Rows</th>
                  <th className="p-3 text-center">Imported</th>
                  <th className="p-3 text-center">Skipped</th>
                  <th className="p-3 text-center">Failed</th>
                  <th className="p-3">Status</th>
                  <th className="p-3">User</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#D9E0EA] bg-white">
                {loadingHistory ? (
                  <tr>
                    <td colSpan={9} className="p-6 text-center text-slate-500">
                      Loading import history...
                    </td>
                  </tr>
                ) : historyLogs.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="p-6 text-center text-slate-500">
                      No import operations recorded yet.
                    </td>
                  </tr>
                ) : (
                  historyLogs.map((log) => (
                    <tr key={log.id} className="hover:bg-slate-50">
                      <td className="p-3 text-slate-700">{new Date(log.started_at).toLocaleString()}</td>
                      <td className="p-3 font-semibold text-[#101828]">{log.category}</td>
                      <td className="p-3 font-mono text-[11px] text-slate-600">{log.file_name}</td>
                      <td className="p-3 text-center font-bold">{log.total_rows}</td>
                      <td className="p-3 text-center text-emerald-600 font-semibold">{log.successful_rows}</td>
                      <td className="p-3 text-center text-slate-500">{log.skipped_rows}</td>
                      <td className="p-3 text-center text-red-600 font-semibold">{log.failed_rows}</td>
                      <td className="p-3">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            log.status === 'COMPLETED'
                              ? 'bg-emerald-50 text-emerald-700'
                              : log.status === 'PARTIAL'
                              ? 'bg-amber-50 text-amber-700'
                              : 'bg-red-50 text-red-700'
                          }`}
                        >
                          {log.status}
                        </span>
                      </td>
                      <td className="p-3 text-slate-600">{log.user_profiles?.full_name || profile?.full_name || 'Staff User'}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* VIEW 2: IMPORT WIZARD */}
      {activeTab === 'IMPORT' && (
        <div className="space-y-6">
          {/* Step Progress Tracker */}
          <div className="bg-white p-4 rounded-2xl border border-[#D9E0EA] shadow-xs">
            <div className="flex items-center justify-between max-w-4xl mx-auto overflow-x-auto gap-2 text-xs">
              {[
                { num: 1, label: 'Category' },
                { num: 2, label: 'Upload' },
                { num: 3, label: 'Map Columns' },
                { num: 4, label: 'Preview & Validate' },
                { num: 5, label: 'Confirm' },
                { num: 6, label: 'Results' }
              ].map((s) => {
                const isActive = currentStep === s.num;
                const isPast = currentStep > s.num;
                return (
                  <div key={s.num} className="flex items-center gap-2 flex-shrink-0">
                    <div
                      className={`w-7 h-7 rounded-full flex items-center justify-center font-bold text-xs ${
                        isActive
                          ? 'bg-[#1455D9] text-white ring-4 ring-blue-100'
                          : isPast
                          ? 'bg-emerald-500 text-white'
                          : 'bg-slate-100 text-slate-400'
                      }`}
                    >
                      {isPast ? <Check className="w-4 h-4" /> : s.num}
                    </div>
                    <span
                      className={`font-semibold hidden sm:inline ${
                        isActive ? 'text-[#1455D9]' : isPast ? 'text-slate-700' : 'text-slate-400'
                      }`}
                    >
                      {s.label}
                    </span>
                    {s.num < 6 && <div className="w-4 sm:w-8 h-0.5 bg-slate-200 ml-1" />}
                  </div>
                );
              })}
            </div>
          </div>

          {/* ============================================================== */}
          {/* STEP 1: SELECT IMPORT CATEGORY */}
          {/* ============================================================== */}
          {currentStep === 1 && (
            <div className="bg-white rounded-2xl border border-[#D9E0EA] p-6 shadow-xs space-y-6">
              <div>
                <h2 className="text-base font-bold text-[#101828]">Step 1 – Select Data Category</h2>
                <p className="text-xs text-[#667085] mt-0.5">
                  Choose which entity you are uploading. For child records (Seasons, Markets, Members), ensure parent entities already exist.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
                {[
                  { id: 'HOTELS', icon: HotelIcon, title: 'Hotels', countHint: '12 Company Properties' },
                  { id: 'SEASONS', icon: CalendarDays, title: 'Hotel Seasons', countHint: 'Belongs to Hotel' },
                  { id: 'AGENCIES', icon: Building2, title: 'Travel Agencies', countHint: 'Partner Profiles' },
                  { id: 'MARKETS', icon: Globe2, title: 'Markets', countHint: 'Desks per Agency' },
                  { id: 'MEMBERS', icon: Users2, title: 'Members', countHint: 'Contact Personnel' }
                ].map((cat) => {
                  const Icon = cat.icon;
                  const isSelected = selectedCategory === cat.id;
                  return (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => setSelectedCategory(cat.id as ImportCategory)}
                      className={`p-4 rounded-xl border text-left transition-all flex flex-col justify-between ${
                        isSelected
                          ? 'border-[#1455D9] bg-[#EAF2FF]/60 text-[#1455D9] ring-2 ring-[#1455D9]/20'
                          : 'border-[#D9E0EA] bg-white hover:bg-slate-50 text-slate-700'
                      }`}
                    >
                      <div>
                        <Icon className={`w-5 h-5 mb-2 ${isSelected ? 'text-[#1455D9]' : 'text-slate-500'}`} />
                        <div className="font-bold text-sm text-[#101828]">{cat.title}</div>
                      </div>
                      <span className="text-[11px] text-slate-500 mt-2">{cat.countHint}</span>
                    </button>
                  );
                })}
              </div>

              {/* Category Info Box */}
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-xs space-y-2">
                <div className="font-bold text-slate-800 flex items-center gap-2">
                  <Layers className="w-4 h-4 text-[#1455D9]" />
                  <span>Category Overview: {currentCategoryMeta.title}</span>
                </div>
                <p className="text-slate-600">{currentCategoryMeta.shortDescription}</p>
                {currentCategoryMeta.parentEntityHint && (
                  <p className="text-amber-800 font-medium bg-amber-50 p-2 rounded-lg border border-amber-200">
                    Important: {currentCategoryMeta.parentEntityHint}
                  </p>
                )}
              </div>

              <div className="flex justify-end pt-4 border-t border-[#D9E0EA]">
                <button
                  type="button"
                  onClick={() => setCurrentStep(2)}
                  className="px-5 py-2.5 rounded-xl bg-[#1455D9] hover:bg-blue-700 text-white font-bold text-xs flex items-center gap-2 shadow-xs"
                >
                  Proceed to Upload &amp; Template <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* ============================================================== */}
          {/* STEP 2: DOWNLOAD TEMPLATE & UPLOAD EXCEL */}
          {/* ============================================================== */}
          {currentStep === 2 && (
            <div className="bg-white rounded-2xl border border-[#D9E0EA] p-6 shadow-xs space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-base font-bold text-[#101828]">Step 2 – Download Template / Upload File</h2>
                  <p className="text-xs text-[#667085] mt-0.5">
                    Category: <strong>{currentCategoryMeta.title}</strong>
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setCurrentStep(1)}
                  className="text-xs text-slate-500 hover:text-slate-900 flex items-center gap-1 font-semibold"
                >
                  <ArrowLeft className="w-4 h-4" /> Change Category
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Download Template Box */}
                <div className="p-5 rounded-2xl border border-blue-200 bg-blue-50/40 space-y-4 flex flex-col justify-between">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-[#1455D9] font-bold text-sm">
                      <Download className="w-5 h-5" />
                      <span>Download Official Excel Template</span>
                    </div>
                    <p className="text-xs text-slate-600 leading-relaxed">
                      Download the standardized <strong>{currentCategoryMeta.title}</strong> template. It includes correct header columns, field instructions, and valid sample rows.
                    </p>
                    <div className="text-[11px] text-slate-500">
                      <strong>Expected Fields:</strong> {currentCategoryMeta.columns.map((c) => c.label).join(', ')}
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => downloadCategoryTemplate(selectedCategory)}
                    className="w-full h-11 rounded-xl bg-[#1455D9] hover:bg-blue-700 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-xs"
                  >
                    <Download className="w-4 h-4" /> Download {currentCategoryMeta.title} Template (.xlsx)
                  </button>
                </div>

                {/* Upload Excel Box */}
                <div className="p-5 rounded-2xl border-2 border-dashed border-[#D9E0EA] bg-[#F8FAFC] flex flex-col items-center justify-center text-center space-y-3 relative hover:border-[#1455D9] transition-colors">
                  <Upload className="w-8 h-8 text-[#1455D9]" />
                  <div>
                    <span className="font-bold text-xs text-[#101828] block">Select or Drop Excel / CSV File</span>
                    <span className="text-[11px] text-slate-500">Supports .xlsx, .xls, and .csv files</span>
                  </div>

                  <label className="cursor-pointer px-4 py-2 bg-white border border-[#D9E0EA] hover:bg-slate-50 rounded-xl text-xs font-bold text-[#1455D9] shadow-xs">
                    <span>Browse Device Files</span>
                    <input
                      type="file"
                      accept=".xlsx, .xls, .csv"
                      onChange={handleFileUpload}
                      className="hidden"
                    />
                  </label>

                  {uploadedFileName && (
                    <span className="text-xs font-semibold text-emerald-700">
                      Selected: {uploadedFileName}
                    </span>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* ============================================================== */}
          {/* STEP 3: COLUMN MAPPING */}
          {/* ============================================================== */}
          {currentStep === 3 && extractedData && (
            <div className="bg-white rounded-2xl border border-[#D9E0EA] p-6 shadow-xs space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h2 className="text-base font-bold text-[#101828]">Step 3 – Map Excel Columns</h2>
                  <p className="text-xs text-[#667085] mt-0.5">
                    Match headers in <strong>{uploadedFileName}</strong> to CRM database fields.
                  </p>
                </div>

                {/* Multi-Worksheet Selector */}
                {extractedData.sheetNames.length > 1 && (
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-slate-600">Worksheet:</span>
                    <select
                      value={selectedSheetName}
                      onChange={(e) => handleSheetChange(e.target.value)}
                      className="h-9 px-3 text-xs rounded-lg border border-[#D9E0EA] bg-[#F8FAFC] font-semibold text-[#101828]"
                    >
                      {extractedData.sheetNames.map((sn) => (
                        <option key={sn} value={sn}>
                          {sn}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>

              {/* Mapping Table */}
              <div className="border border-[#D9E0EA] rounded-xl overflow-hidden">
                <table className="w-full text-left text-xs divide-y divide-[#D9E0EA]">
                  <thead className="bg-[#F8FAFC] text-[#667085] font-semibold">
                    <tr>
                      <th className="p-3">Excel Column Header</th>
                      <th className="p-3">Sample Value (Row 1)</th>
                      <th className="p-3">Target System Field</th>
                      <th className="p-3">Requirement</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#D9E0EA] bg-white">
                    {extractedData.headers.map((excelHeader) => {
                      const sampleVal = extractedData.rawRows[0]?.[excelHeader];
                      const currentField = columnMapping[excelHeader] || '';
                      const fieldDef = currentCategoryMeta.columns.find((c) => c.key === currentField);

                      return (
                        <tr key={excelHeader} className="hover:bg-slate-50">
                          <td className="p-3 font-bold text-[#101828]">{excelHeader}</td>
                          <td className="p-3 text-slate-500 font-mono text-[11px] truncate max-w-xs">
                            {sampleVal !== undefined ? String(sampleVal) : '—'}
                          </td>
                          <td className="p-3">
                            <select
                              value={currentField}
                              onChange={(e) => {
                                const newField = e.target.value;
                                setColumnMapping((prev) => ({
                                  ...prev,
                                  [excelHeader]: newField
                                }));
                              }}
                              className="h-9 px-3 rounded-lg border border-[#D9E0EA] bg-white text-xs font-medium text-[#101828] focus:ring-2 focus:ring-[#1455D9]"
                            >
                              <option value="">(Do not import / Ignore)</option>
                              {currentCategoryMeta.columns.map((c) => (
                                <option key={c.key} value={c.key}>
                                  {c.label} {c.required ? '*' : ''}
                                </option>
                              ))}
                            </select>
                          </td>
                          <td className="p-3">
                            {fieldDef ? (
                              fieldDef.required ? (
                                <span className="text-red-700 font-bold text-[10px] uppercase bg-red-50 px-2 py-0.5 rounded">
                                  Required *
                                </span>
                              ) : (
                                <span className="text-slate-500 text-[10px] uppercase bg-slate-100 px-2 py-0.5 rounded">
                                  Optional
                                </span>
                              )
                            ) : (
                              <span className="text-slate-400 text-[10px] italic">Unmapped</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Mapping Validation Warning */}
              {(() => {
                const mappedKeys = Object.values(columnMapping);
                const missingRequired = currentCategoryMeta.columns.filter((c) => c.required && !mappedKeys.includes(c.key));

                if (missingRequired.length > 0) {
                  return (
                    <div className="p-3 bg-amber-50 border border-amber-200 text-amber-900 rounded-xl text-xs flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0" />
                      <span>
                        Notice: Required field(s) unmapped:{' '}
                        <strong>{missingRequired.map((m) => m.label).join(', ')}</strong>. Rows missing these will be flagged as errors.
                      </span>
                    </div>
                  );
                }
                return null;
              })()}

              <div className="flex items-center justify-between pt-4 border-t border-[#D9E0EA]">
                <button
                  type="button"
                  onClick={() => setCurrentStep(2)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900"
                >
                  &larr; Back to File Selection
                </button>
                <button
                  type="button"
                  onClick={handleProceedToPreview}
                  className="px-5 py-2.5 rounded-xl bg-[#1455D9] hover:bg-blue-700 text-white font-bold text-xs flex items-center gap-2 shadow-xs"
                >
                  Validate &amp; Preview Records <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* ============================================================== */}
          {/* STEP 4: PREVIEW & VALIDATE */}
          {/* ============================================================== */}
          {currentStep === 4 && (
            <div className="bg-white rounded-2xl border border-[#D9E0EA] p-6 shadow-xs space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h2 className="text-base font-bold text-[#101828]">Step 4 – Preview &amp; Validate Records</h2>
                  <p className="text-xs text-[#667085] mt-0.5">
                    Pre-flight validation complete against Supabase rules and database duplicates.
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => downloadErrorReport(selectedCategory, uploadedFileName, parsedRows)}
                    className="px-3 py-1.5 rounded-lg border border-[#D9E0EA] text-xs font-semibold text-slate-700 hover:bg-slate-50 flex items-center gap-1.5"
                  >
                    <Download className="w-3.5 h-3.5" /> Download Error/Duplicate Report
                  </button>
                  <button
                    type="button"
                    onClick={() => setCurrentStep(3)}
                    className="px-3 py-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900"
                  >
                    Remap Columns
                  </button>
                </div>
              </div>

              {/* Metrics Summary Strip */}
              <div className="grid grid-cols-2 sm:grid-cols-6 gap-2">
                {[
                  { label: 'Total Rows', count: stats.total, color: 'bg-slate-50 text-slate-800' },
                  { label: 'Valid Rows', count: stats.valid, color: 'bg-emerald-50 text-emerald-800' },
                  { label: 'Warnings', count: stats.warning, color: 'bg-amber-50 text-amber-800' },
                  { label: 'Errors', count: stats.error, color: 'bg-red-50 text-red-800' },
                  { label: 'Duplicates', count: stats.duplicate, color: 'bg-purple-50 text-purple-800' },
                  { label: 'Ready to Import', count: stats.ready, color: 'bg-blue-50 text-blue-900 font-bold' }
                ].map((m) => (
                  <div key={m.label} className={`p-3 rounded-xl border border-[#D9E0EA] ${m.color} text-center`}>
                    <div className="text-lg font-bold">{m.count}</div>
                    <div className="text-[10px] uppercase tracking-wider text-slate-500 mt-0.5">{m.label}</div>
                  </div>
                ))}
              </div>

              {/* Table Filter Toolbar */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2">
                <div className="flex flex-wrap gap-1 bg-[#F8FAFC] p-1 rounded-xl border border-[#D9E0EA] text-xs">
                  {(['ALL', 'VALID', 'WARNING', 'ERROR', 'DUPLICATE', 'READY'] as const).map((flt) => (
                    <button
                      key={flt}
                      type="button"
                      onClick={() => setTableFilter(flt)}
                      className={`px-3 py-1 rounded-lg font-semibold transition-colors ${
                        tableFilter === flt ? 'bg-white text-[#1455D9] shadow-xs' : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      {flt}
                    </button>
                  ))}
                </div>

                <div className="flex items-center gap-2 text-xs">
                  <button
                    type="button"
                    onClick={() => setAllRowsAction('IMPORT')}
                    className="text-[#1455D9] font-bold hover:underline"
                  >
                    Import All Valid
                  </button>
                  <span className="text-slate-300">|</span>
                  <button
                    type="button"
                    onClick={() => setAllRowsAction('SKIP')}
                    className="text-slate-600 font-semibold hover:underline"
                  >
                    Skip All
                  </button>
                </div>
              </div>

              {/* Preview Table */}
              <div className="border border-[#D9E0EA] rounded-xl overflow-x-auto max-h-96">
                <table className="w-full text-left text-xs divide-y divide-[#D9E0EA]">
                  <thead className="bg-[#F8FAFC] text-[#667085] font-semibold sticky top-0 z-10">
                    <tr>
                      <th className="p-3 w-16 text-center">Row</th>
                      <th className="p-3">Status</th>
                      <th className="p-3">Primary Identifier</th>
                      <th className="p-3">Key Details</th>
                      <th className="p-3">Validation Notes / Duplicate Reason</th>
                      <th className="p-3 text-center">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#D9E0EA] bg-white">
                    {displayedRows.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="p-6 text-center text-slate-500">
                          No rows match filter '{tableFilter}'.
                        </td>
                      </tr>
                    ) : (
                      displayedRows.map((row) => {
                        const identifier =
                          row.mapped.hotel_name || row.mapped.name || row.mapped.season_label || row.mapped.full_name || `Row ${row.excelRowNumber}`;

                        return (
                          <tr
                            key={row.excelRowNumber}
                            className={`hover:bg-slate-50 ${row.status === 'ERROR' ? 'bg-red-50/20' : ''}`}
                          >
                            <td className="p-3 text-center font-mono font-bold text-slate-600">{row.excelRowNumber}</td>
                            <td className="p-3">
                              <span
                                className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                  row.status === 'VALID'
                                    ? 'bg-emerald-50 text-emerald-700'
                                    : row.status === 'WARNING'
                                    ? 'bg-amber-50 text-amber-700'
                                    : row.status === 'DUPLICATE'
                                    ? 'bg-purple-50 text-purple-700'
                                    : 'bg-red-50 text-red-700'
                                }`}
                              >
                                {row.status}
                              </span>
                            </td>
                            <td className="p-3 font-bold text-[#101828]">{identifier}</td>
                            <td className="p-3 text-slate-600 font-mono text-[11px]">
                              {Object.entries(row.mapped)
                                .slice(0, 3)
                                .map(([k, v]) => `${k}: ${v}`)
                                .join(' | ')}
                            </td>
                            <td className="p-3 text-[11px]">
                              {row.errors.length > 0 && (
                                <div className="text-red-700 font-medium">{row.errors.join('; ')}</div>
                              )}
                              {row.duplicateReason && (
                                <div className="text-purple-700">{row.duplicateReason}</div>
                              )}
                              {row.existingRecordInfo && (
                                <div className="text-slate-500 italic">{row.existingRecordInfo}</div>
                              )}
                              {row.warnings.length > 0 && (
                                <div className="text-amber-700">{row.warnings.join('; ')}</div>
                              )}
                            </td>
                            <td className="p-3 text-center">
                              {row.status === 'ERROR' ? (
                                <span className="text-[10px] font-bold text-red-600">Blocked</span>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => toggleRowAction(row.excelRowNumber)}
                                  className={`px-2.5 py-1 rounded text-xs font-bold transition-colors ${
                                    row.selectedAction === 'IMPORT'
                                      ? 'bg-emerald-100 text-emerald-800'
                                      : 'bg-slate-100 text-slate-600'
                                  }`}
                                >
                                  {row.selectedAction}
                                </button>
                              )}
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>

              {/* Navigation Actions */}
              <div className="flex items-center justify-between pt-4 border-t border-[#D9E0EA]">
                <button
                  type="button"
                  onClick={() => setCurrentStep(3)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900"
                >
                  &larr; Back to Mapping
                </button>
                <button
                  type="button"
                  onClick={() => setCurrentStep(5)}
                  disabled={stats.ready === 0}
                  className="px-5 py-2.5 rounded-xl bg-[#1455D9] hover:bg-blue-700 text-white font-bold text-xs flex items-center gap-2 shadow-xs disabled:opacity-50"
                >
                  Proceed to Confirmation ({stats.ready} Ready) <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* ============================================================== */}
          {/* STEP 5: CONFIRMATION DIALOG */}
          {/* ============================================================== */}
          {currentStep === 5 && (
            <div className="bg-white rounded-2xl border border-[#D9E0EA] p-6 shadow-xs max-w-2xl mx-auto space-y-6">
              <div className="text-center space-y-2">
                <div className="w-12 h-12 rounded-full bg-blue-50 text-[#1455D9] flex items-center justify-center mx-auto">
                  <CheckCircle2 className="w-6 h-6" />
                </div>
                <h2 className="text-lg font-bold text-[#101828]">Confirm Bulk Import Execution</h2>
                <p className="text-xs text-slate-600">
                  Please review the final numbers before records are committed to Supabase.
                </p>
              </div>

              <div className="p-4 rounded-xl bg-[#F8FAFC] border border-[#D9E0EA] space-y-3 text-xs">
                <div className="flex justify-between py-1 border-b border-slate-200">
                  <span className="text-slate-600">Target Category:</span>
                  <strong className="text-[#101828]">{currentCategoryMeta.title}</strong>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-200">
                  <span className="text-slate-600">Source Excel File:</span>
                  <strong className="text-[#101828] font-mono">{uploadedFileName}</strong>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-200">
                  <span className="text-slate-600">Records to Import:</span>
                  <strong className="text-emerald-700 font-bold">{stats.ready} records</strong>
                </div>
                <div className="flex justify-between py-1">
                  <span className="text-slate-600">Records to Skip / Discard:</span>
                  <strong className="text-slate-500">{stats.total - stats.ready} records</strong>
                </div>
              </div>

              <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
                <span>
                  <strong>Safety Notice:</strong> Existing records will not be silently overwritten. Records marked for import will be inserted directly into Supabase under your logged-in audit identity.
                </span>
              </div>

              <div className="flex items-center justify-between pt-2">
                <button
                  type="button"
                  onClick={() => setCurrentStep(4)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900"
                >
                  &larr; Return to Preview
                </button>
                <button
                  type="button"
                  onClick={handleConfirmImport}
                  disabled={isExecuting}
                  className="px-6 py-2.5 rounded-xl bg-[#1455D9] hover:bg-blue-700 text-white font-bold text-xs flex items-center gap-2 shadow-xs disabled:opacity-50"
                >
                  {isExecuting ? 'Importing...' : `Confirm & Commit ${stats.ready} Records`}
                </button>
              </div>
            </div>
          )}

          {/* ============================================================== */}
          {/* STEP 6: IMPORT RESULTS & ERROR REPORT */}
          {/* ============================================================== */}
          {currentStep === 6 && executionResult && (
            <div className="bg-white rounded-2xl border border-[#D9E0EA] p-6 shadow-xs max-w-3xl mx-auto space-y-6">
              <div className="text-center space-y-2">
                <div
                  className={`w-12 h-12 rounded-full flex items-center justify-center mx-auto ${
                    executionResult.status === 'COMPLETED'
                      ? 'bg-emerald-50 text-emerald-600'
                      : executionResult.status === 'PARTIAL'
                      ? 'bg-amber-50 text-amber-600'
                      : 'bg-red-50 text-red-600'
                  }`}
                >
                  <CheckCircle2 className="w-6 h-6" />
                </div>
                <h2 className="text-lg font-bold text-[#101828]">
                  Import Operation {executionResult.status}
                </h2>
                <p className="text-xs text-slate-600">
                  Execution completed at {new Date(executionResult.completedAt).toLocaleTimeString()}.
                </p>
              </div>

              {/* Execution Summary Cards */}
              <div className="grid grid-cols-4 gap-3 text-center">
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                  <div className="text-lg font-bold text-slate-800">{executionResult.totalRows}</div>
                  <div className="text-[10px] text-slate-500 uppercase">Total Rows</div>
                </div>
                <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200">
                  <div className="text-lg font-bold text-emerald-700">{executionResult.successfulRows}</div>
                  <div className="text-[10px] text-emerald-600 uppercase">Successfully Added</div>
                </div>
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                  <div className="text-lg font-bold text-slate-500">{executionResult.skippedRows}</div>
                  <div className="text-[10px] text-slate-500 uppercase">Skipped</div>
                </div>
                <div className="p-3 rounded-xl bg-red-50 border border-red-200">
                  <div className="text-lg font-bold text-red-700">{executionResult.failedRows}</div>
                  <div className="text-[10px] text-red-600 uppercase">Failed</div>
                </div>
              </div>

              {/* Detailed Row Results Table */}
              <div className="border border-[#D9E0EA] rounded-xl overflow-hidden max-h-60 overflow-y-auto">
                <table className="w-full text-left text-xs divide-y divide-[#D9E0EA]">
                  <thead className="bg-[#F8FAFC] text-[#667085] font-semibold sticky top-0">
                    <tr>
                      <th className="p-2.5 w-16 text-center">Row</th>
                      <th className="p-2.5">Record Identifier</th>
                      <th className="p-2.5">Result</th>
                      <th className="p-2.5">Message</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#D9E0EA] bg-white">
                    {executionResult.rowResults.map((r, idx) => (
                      <tr key={idx} className="hover:bg-slate-50">
                        <td className="p-2.5 text-center font-mono font-bold text-slate-600">{r.excelRowNumber}</td>
                        <td className="p-2.5 font-bold text-[#101828]">{r.recordIdentifier}</td>
                        <td className="p-2.5">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                              r.status === 'SUCCESS'
                                ? 'bg-emerald-50 text-emerald-700'
                                : r.status === 'SKIPPED'
                                ? 'bg-slate-100 text-slate-600'
                                : 'bg-red-50 text-red-700'
                            }`}
                          >
                            {r.status}
                          </span>
                        </td>
                        <td className="p-2.5 text-slate-500 text-[11px]">{r.message || '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Actions & Error Report Download */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-4 border-t border-[#D9E0EA]">
                <button
                  type="button"
                  onClick={() => downloadErrorReport(selectedCategory, uploadedFileName, parsedRows, executionResult)}
                  className="px-4 py-2 rounded-xl border border-[#D9E0EA] bg-[#F8FAFC] hover:bg-slate-100 text-xs font-bold text-slate-800 flex items-center justify-center gap-2"
                >
                  <Download className="w-4 h-4 text-[#1455D9]" /> Download Execution &amp; Error Report (.xlsx)
                </button>

                <button
                  type="button"
                  onClick={handleReset}
                  className="px-5 py-2.5 rounded-xl bg-[#1455D9] hover:bg-blue-700 text-white font-bold text-xs shadow-xs"
                >
                  Start New Import
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
