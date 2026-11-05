import React, { useState, useEffect } from 'react';
import {
  ShieldAlert,
  Search,
  Building,
  User,
  Clock,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  Sparkles,
  FileText
} from 'lucide-react';
import { adminActivityService, AdminActivityRecord, AdminAuditActionType } from '../services/adminActivityService';
import { rateService } from '../services/rateService';
import { HotelRecord } from '../types/hotelHierarchy';

export const AdminActivityLogPage: React.FC = () => {
  const [logs, setLogs] = useState<AdminActivityRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [hotels, setHotels] = useState<HotelRecord[]>([]);

  // Filter States
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedAction, setSelectedAction] = useState<string>('');
  const [selectedHotelId, setSelectedHotelId] = useState<string>('');
  const [dateFrom, setDateFrom] = useState<string>('');
  const [dateTo, setDateTo] = useState<string>('');

  const loadData = React.useCallback(async () => {
    try {
      setLoading(true);
      const [activityList, hotelList] = await Promise.all([
        adminActivityService.getActivities({
          searchQuery: searchQuery || undefined,
          action: selectedAction || undefined,
          hotelId: selectedHotelId || undefined,
          dateFrom: dateFrom || undefined,
          dateTo: dateTo || undefined
        }),
        rateService.getHotels()
      ]);
      setLogs(activityList);
      setHotels(hotelList);
    } finally {
      setLoading(false);
    }
  }, [searchQuery, selectedAction, selectedHotelId, dateFrom, dateTo]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    loadData();
  };

  const handleResetFilters = () => {
    setSearchQuery('');
    setSelectedAction('');
    setSelectedHotelId('');
    setDateFrom('');
    setDateTo('');
  };

  // Format action badge style
  const renderActionBadge = (action: AdminAuditActionType) => {
    if (action.includes('OVERRIDDEN')) {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-50 text-amber-800 border border-amber-300">
          <AlertTriangle className="w-3 h-3 text-amber-600" />
          OVERRIDE
        </span>
      );
    }
    if (action.includes('CREATED') || action.includes('PUBLISHED') || action === 'INSERT') {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-50 text-emerald-800 border border-emerald-300">
          <CheckCircle2 className="w-3 h-3 text-emerald-600" />
          {action.replace('CALCULATION_SETUP_', '').replace('RATE_SHEET_', '')}
        </span>
      );
    }
    if (action.includes('APPLIED')) {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-50 text-blue-800 border border-blue-300">
          <Sparkles className="w-3 h-3 text-blue-600" />
          APPLIED
        </span>
      );
    }
    if (action.includes('RESET')) {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-purple-50 text-purple-800 border border-purple-300">
          <RotateCcw className="w-3 h-3 text-purple-600" />
          RESET
        </span>
      );
    }
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-slate-100 text-slate-700">
        {action}
      </span>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-[#EAF2FF] text-[#1455D9] rounded-2xl shadow-xs">
            <ShieldAlert className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold text-[#101828]">Admin Activity & Audit Log</h1>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                Append-Only Security
              </span>
            </div>
            <p className="text-sm text-[#667085]">
              Independent tamper-proof audit trail of rate calculations, manual price overrides, setup creations, and publications.
            </p>
          </div>
        </div>

        <button
          onClick={loadData}
          className="h-10 px-4 rounded-xl border border-[#D9E0EA] bg-white hover:bg-slate-50 text-xs font-bold text-[#101828] flex items-center gap-2 shadow-xs transition-colors self-start sm:self-auto"
        >
          <RotateCcw className="w-4 h-4 text-[#1455D9]" /> Refresh Log
        </button>
      </div>

      {/* Filter Toolbar */}
      <div className="bg-white rounded-2xl border border-[#D9E0EA] p-5 shadow-xs space-y-4">
        <form onSubmit={handleSearchSubmit} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          {/* Keyword Search */}
          <div className="relative">
            <Search className="w-4 h-4 text-[#667085] absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search user, hotel, setup..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full h-10 pl-9 pr-3 rounded-xl border border-[#D9E0EA] text-xs font-medium focus:outline-none focus:ring-2 focus:ring-[#1455D9]"
            />
          </div>

          {/* Action Filter */}
          <div>
            <select
              value={selectedAction}
              onChange={(e) => setSelectedAction(e.target.value)}
              className="w-full h-10 px-3 rounded-xl border border-[#D9E0EA] text-xs font-medium bg-white focus:outline-none focus:ring-2 focus:ring-[#1455D9]"
            >
              <option value="">All Action Types</option>
              <option value="CALCULATION_SETUP_CREATED">Setup Created</option>
              <option value="CALCULATION_SETUP_APPLIED">Setup Applied</option>
              <option value="RATE_CELL_MANUALLY_OVERRIDDEN">Price Overridden</option>
              <option value="RATE_CELL_RESET_TO_AUTO">Reset to Auto</option>
              <option value="RATE_SHEET_SAVED">Rate Sheet Saved</option>
              <option value="RATE_SHEET_PUBLISHED">Rate Sheet Published</option>
            </select>
          </div>

          {/* Hotel Filter */}
          <div>
            <select
              value={selectedHotelId}
              onChange={(e) => setSelectedHotelId(e.target.value)}
              className="w-full h-10 px-3 rounded-xl border border-[#D9E0EA] text-xs font-medium bg-white focus:outline-none focus:ring-2 focus:ring-[#1455D9]"
            >
              <option value="">All Hotels</option>
              {hotels.map((h) => (
                <option key={h.id} value={h.id}>
                  {h.hotel_name}
                </option>
              ))}
            </select>
          </div>

          {/* Date From */}
          <div className="relative">
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="w-full h-10 px-3 rounded-xl border border-[#D9E0EA] text-xs font-medium bg-white focus:outline-none focus:ring-2 focus:ring-[#1455D9]"
              title="From Date"
            />
          </div>

          {/* Date To & Clear */}
          <div className="flex items-center gap-2">
            <input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="w-full h-10 px-3 rounded-xl border border-[#D9E0EA] text-xs font-medium bg-white focus:outline-none focus:ring-2 focus:ring-[#1455D9]"
              title="To Date"
            />
            <button
              type="button"
              onClick={handleResetFilters}
              className="h-10 px-3 rounded-xl border border-[#D9E0EA] text-xs text-[#667085] hover:bg-slate-50 font-medium"
              title="Reset Filters"
            >
              Clear
            </button>
          </div>
        </form>
      </div>

      {/* Audit Log Table */}
      <div className="bg-white rounded-2xl border border-[#D9E0EA] shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-[#F8FAFC] border-b border-[#D9E0EA]">
                <th className="py-3 px-4 text-xs font-bold text-[#344054] uppercase tracking-wider">
                  Timestamp
                </th>
                <th className="py-3 px-4 text-xs font-bold text-[#344054] uppercase tracking-wider">
                  Staff Member (Actor)
                </th>
                <th className="py-3 px-4 text-xs font-bold text-[#344054] uppercase tracking-wider">
                  Action
                </th>
                <th className="py-3 px-4 text-xs font-bold text-[#344054] uppercase tracking-wider">
                  Target / Entity
                </th>
                <th className="py-3 px-4 text-xs font-bold text-[#344054] uppercase tracking-wider">
                  Details & Audit Values
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#EAECF0] text-xs">
              {loading ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-[#667085]">
                    Loading audit activities...
                  </td>
                </tr>
              ) : logs.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-[#667085]">
                    <FileText className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                    No audit activity records found matching the active criteria.
                  </td>
                </tr>
              ) : (
                logs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-3.5 px-4 font-mono text-[#667085] whitespace-nowrap">
                      <div className="flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5 text-slate-400" />
                        {new Date(log.timestamp).toLocaleString()}
                      </div>
                    </td>

                    <td className="py-3.5 px-4 font-medium text-[#101828]">
                      <div className="flex items-center gap-1.5">
                        <User className="w-3.5 h-3.5 text-slate-400" />
                        <span>{log.actor_name || 'Staff User'}</span>
                      </div>
                    </td>

                    <td className="py-3.5 px-4 whitespace-nowrap">
                      {renderActionBadge(log.action)}
                    </td>

                    <td className="py-3.5 px-4 text-[#344054]">
                      <div>
                        {log.hotel_name && (
                          <div className="font-bold flex items-center gap-1 text-[#101828]">
                            <Building className="w-3 h-3 text-slate-400" />
                            {log.hotel_name}
                          </div>
                        )}
                        {log.setup_name && (
                          <div className="text-[11px] text-[#1455D9] font-semibold">
                            Setup: {log.setup_name}
                          </div>
                        )}
                        <span className="text-[10px] text-slate-400 font-mono">
                          {log.target_table}
                        </span>
                      </div>
                    </td>

                    <td className="py-3.5 px-4 text-[#475467]">
                      <p className="font-medium text-[#101828] mb-1">
                        {log.details || 'Standard administrative operation'}
                      </p>
                      {(log.old_values || log.new_values) && (
                        <div className="bg-slate-50 rounded-lg p-2 border border-slate-200 font-mono text-[11px] space-y-0.5">
                          {log.old_values && (
                            <div className="text-rose-600">
                              - Previous: {JSON.stringify(log.old_values)}
                            </div>
                          )}
                          {log.new_values && (
                            <div className="text-emerald-700">
                              + New: {JSON.stringify(log.new_values)}
                            </div>
                          )}
                        </div>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
