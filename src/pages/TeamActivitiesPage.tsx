import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Users2,
  Calendar,
  Building2,
  Hotel,
  User,
  Search,
  RefreshCw,
  Download,
  MessageSquare,
  TrendingUp
} from 'lucide-react';
import { salesVisitService } from '../services/salesVisitService';
import { SalesActivityRecord } from '../types/salesVisit';
import { fetchEmployees } from '../services/employeeService';
import { EmployeeProfileRecord } from '../types/employee';
import { fetchHotels } from '../services/hotelService';
import { HotelRecord } from '../types/hotelHierarchy';
import { Link } from 'react-router-dom';

export const TeamActivitiesPage: React.FC = () => {
  const [visits, setVisits] = useState<SalesActivityRecord[]>([]);
  const [employees, setEmployees] = useState<EmployeeProfileRecord[]>([]);
  const [hotels, setHotels] = useState<HotelRecord[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  // Filters
  const [selectedStaffId, setSelectedStaffId] = useState<string>('ALL');
  const [selectedHotelId, setSelectedHotelId] = useState<string>('ALL');
  const [dateFilterType, setDateFilterType] = useState<'MONTH' | 'CUSTOM' | 'TODAY'>('MONTH');
  const [selectedMonth, setSelectedMonth] = useState<string>(new Date().toISOString().slice(0, 7)); // YYYY-MM
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Fetch initial lookups (employees & hotels)
  useEffect(() => {
    const loadLookups = async () => {
      try {
        const [empRes, hotelRes] = await Promise.all([
          fetchEmployees(),
          fetchHotels()
        ]);
        if (empRes.data) setEmployees(empRes.data);
        if (hotelRes.data) setHotels(hotelRes.data);
      } catch (err) {
        console.error('Failed to load lookup data:', err);
      }
    };
    loadLookups();
  }, []);

  // Compute actual date bounds
  const computedDateRange = useMemo(() => {
    if (dateFilterType === 'TODAY') {
      const today = new Date().toISOString().split('T')[0];
      return { start: today, end: today };
    }
    if (dateFilterType === 'MONTH') {
      const [year, month] = selectedMonth.split('-');
      const y = parseInt(year || '2026', 10);
      const m = parseInt(month || '11', 10);
      const lastDay = new Date(y, m, 0).getDate();
      return {
        start: `${selectedMonth}-01`,
        end: `${selectedMonth}-${String(lastDay).padStart(2, '0')}`
      };
    }
    return {
      start: startDate || undefined,
      end: endDate || undefined
    };
  }, [dateFilterType, selectedMonth, startDate, endDate]);

  // Load activities from DB
  const loadActivities = useCallback(async () => {
    setLoading(true);
    try {
      const res = await salesVisitService.fetchVisits({
        startDate: computedDateRange.start,
        endDate: computedDateRange.end,
        salesmanId: selectedStaffId,
        hotelId: selectedHotelId
      });
      setVisits(res.data || []);
    } catch (err) {
      console.error('Error fetching team activities:', err);
    } finally {
      setLoading(false);
    }
  }, [computedDateRange, selectedStaffId, selectedHotelId]);

  useEffect(() => {
    loadActivities();
  }, [loadActivities]);

  // Client-side text search
  const filteredVisits = useMemo(() => {
    if (!searchQuery.trim()) return visits;
    const q = searchQuery.toLowerCase();
    return visits.filter((v) => {
      const agencyMatch = (v.agency_name || '').toLowerCase().includes(q);
      const staffMatch = (v.staff_name || '').toLowerCase().includes(q);
      const memberMatch = (v.member_name || '').toLowerCase().includes(q);
      const hotelMatch = (v.hotel_name || '').toLowerCase().includes(q);
      const notesMatch = (v.notes || '').toLowerCase().includes(q);
      return agencyMatch || staffMatch || memberMatch || hotelMatch || notesMatch;
    });
  }, [visits, searchQuery]);

  // Summary Metrics
  const metrics = useMemo(() => {
    const totalRecords = filteredVisits.length;
    const uniqueAgencies = new Set(filteredVisits.map((v) => v.agency_id)).size;
    const uniqueSalesmen = new Set(filteredVisits.map((v) => v.staff_id)).size;

    return { totalRecords, uniqueAgencies, uniqueSalesmen };
  }, [filteredVisits]);

  // CSV Export Functionality
  const handleExportCSV = () => {
    if (filteredVisits.length === 0) return;
    const headers = [
      'Date',
      'Team Member',
      'Travel Agency',
      'Contact Person',
      'Contact Phone',
      'Hotel Discussed',
      'Discussion Notes'
    ];

    const rows = filteredVisits.map((v) => [
      `"${v.activity_date}"`,
      `"${v.staff_name || 'Staff'}"`,
      `"${v.agency_name || ''}"`,
      `"${v.member_name || ''}"`,
      `"${v.member_phone || ''}"`,
      `"${v.hotel_name || 'General Meeting'}"`,
      `"${(v.notes || '').replace(/"/g, '""')}"`
    ]);

    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `Team_Activities_Report_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      {/* Page Title & Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-200 flex items-center justify-center text-[#1455D9] shadow-xs">
              <Users2 className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Team Visits</h1>
              <p className="text-xs text-slate-500 mt-0.5">
                Track agency visits, meetings, and hotel updates logged across the team
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={loadActivities}
            disabled={loading}
            className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 shadow-2xs transition-colors"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-slate-500 ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>

          <button
            onClick={handleExportCSV}
            disabled={filteredVisits.length === 0}
            className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-2xs transition-colors disabled:opacity-50"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      {/* KPI Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Total Activities</span>
            <div className="p-2 rounded-lg bg-blue-50 text-[#1455D9]">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 text-2xl font-black text-slate-900">{metrics.totalRecords}</div>
          <p className="text-[11px] text-slate-400 mt-0.5">Meetings &amp; pitches logged</p>
        </div>

        <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Agencies Covered</span>
            <div className="p-2 rounded-lg bg-emerald-50 text-emerald-600">
              <Building2 className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 text-2xl font-black text-slate-900">{metrics.uniqueAgencies}</div>
          <p className="text-[11px] text-slate-400 mt-0.5">Unique travel agency partners</p>
        </div>

        <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Active Staff Members</span>
            <div className="p-2 rounded-lg bg-purple-50 text-purple-600">
              <User className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 text-2xl font-black text-slate-900">{metrics.uniqueSalesmen}</div>
          <p className="text-[11px] text-slate-400 mt-0.5">Team members reporting visits</p>
        </div>
      </div>

      {/* Comprehensive Filter Toolbar */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-2xs space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          {/* Team Member Filter */}
          <div>
            <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1 flex items-center gap-1">
              <User className="w-3 h-3 text-[#1455D9]" /> Team Member
            </label>
            <select
              value={selectedStaffId}
              onChange={(e) => setSelectedStaffId(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:border-[#1455D9]"
            >
              <option value="ALL">All Team Members ({employees.length})</option>
              {employees.map((emp) => (
                <option key={emp.id} value={emp.id}>
                  {emp.full_name} ({emp.role})
                </option>
              ))}
            </select>
          </div>

          {/* Hotel Filter */}
          <div>
            <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1 flex items-center gap-1">
              <Hotel className="w-3 h-3 text-[#1455D9]" /> Hotel Pitched
            </label>
            <select
              value={selectedHotelId}
              onChange={(e) => setSelectedHotelId(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:border-[#1455D9]"
            >
              <option value="ALL">All Hotels ({hotels.length})</option>
              {hotels.map((h) => (
                <option key={h.id} value={h.id}>
                  {h.hotel_name}
                </option>
              ))}
            </select>
          </div>

          {/* Date Type */}
          <div>
            <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1 flex items-center gap-1">
              <Calendar className="w-3 h-3 text-[#1455D9]" /> Date Filter
            </label>
            <select
              value={dateFilterType}
              onChange={(e) => setDateFilterType(e.target.value as any)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:border-[#1455D9]"
            >
              <option value="MONTH">By Month</option>
              <option value="TODAY">Today's Visits</option>
              <option value="CUSTOM">Custom Date Range</option>
            </select>
          </div>

          {/* Date Picker Input */}
          <div>
            <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">
              {dateFilterType === 'MONTH' ? 'Select Month' : dateFilterType === 'TODAY' ? "Today's Date" : 'Start & End Date'}
            </label>
            {dateFilterType === 'MONTH' ? (
              <input
                type="month"
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:border-[#1455D9]"
              />
            ) : dateFilterType === 'TODAY' ? (
              <input
                type="text"
                disabled
                value={new Date().toLocaleDateString('en-GB')}
                className="w-full px-3 py-1.5 bg-slate-100 border border-slate-200 rounded-xl text-xs font-bold text-slate-600"
              />
            ) : (
              <div className="flex items-center gap-1">
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-1/2 px-2 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-bold text-slate-800 focus:outline-none"
                  title="Start Date"
                />
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-1/2 px-2 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-bold text-slate-800 focus:outline-none"
                  title="End Date"
                />
              </div>
            )}
          </div>

          {/* Search Box */}
          <div>
            <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1 flex items-center gap-1">
              <Search className="w-3 h-3 text-slate-400" /> Search Keyword
            </label>
            <input
              type="text"
              placeholder="Agency, agent, notes..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:border-[#1455D9]"
            />
          </div>
        </div>
      </div>

      {/* Activities Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-200 bg-slate-50/60 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-bold text-slate-900">Recorded Team Visits &amp; Updates</h3>
            <span className="px-2.5 py-0.5 bg-blue-100 text-[#1455D9] rounded-full text-xs font-bold">
              {filteredVisits.length} Records
            </span>
          </div>
          <span className="text-xs text-slate-500 font-medium">
            Showing records chronologically
          </span>
        </div>

        {loading ? (
          <div className="py-20 text-center text-slate-500">
            <RefreshCw className="w-8 h-8 text-[#1455D9] animate-spin mx-auto mb-2" />
            <p className="text-xs font-semibold">Loading team visit activities...</p>
          </div>
        ) : filteredVisits.length === 0 ? (
          <div className="py-20 text-center text-slate-400">
            <MessageSquare className="w-10 h-10 text-slate-300 mx-auto mb-2" />
            <p className="text-sm font-bold text-slate-700">No team activities found</p>
            <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
              No visits or meetings matched your filter criteria. Try adjusting the date range or team member filter.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold uppercase tracking-wider">
                  <th className="py-3 px-4">Date</th>
                  <th className="py-3 px-4">Team Member</th>
                  <th className="py-3 px-4">Travel Agency &amp; Location</th>
                  <th className="py-3 px-4">Contact Person</th>
                  <th className="py-3 px-4">Hotel Discussed</th>
                  <th className="py-3 px-4">Discussion Notes &amp; Updates</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredVisits.map((v) => (
                  <tr key={v.id} className="hover:bg-blue-50/30 transition-colors">
                    {/* Date */}
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <div className="flex items-center gap-1.5 font-bold text-slate-900">
                        <Calendar className="w-3.5 h-3.5 text-blue-600" />
                        <span>{v.activity_date}</span>
                      </div>
                      <span className="text-[10px] text-slate-400">
                        {new Date(v.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </td>

                    {/* Team Member */}
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-full bg-blue-100 text-[#1455D9] flex items-center justify-center font-bold text-xs">
                          {v.staff_name ? v.staff_name.charAt(0) : 'U'}
                        </div>
                        <div>
                          <p className="font-bold text-slate-900">{v.staff_name || 'Team Member'}</p>
                          <span className="text-[10px] text-slate-400">Sales Executive</span>
                        </div>
                      </div>
                    </td>

                    {/* Travel Agency */}
                    <td className="py-3.5 px-4">
                      <div className="font-bold text-slate-900 flex items-center gap-1.5">
                        <Building2 className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span className="truncate max-w-[200px]">{v.agency_name || 'Partner Agency'}</span>
                      </div>
                      {v.market_name && (
                        <span className="text-[11px] text-slate-500 block pl-5">
                          Market: {v.market_name}
                        </span>
                      )}
                    </td>

                    {/* Contact Person */}
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      {v.member_name ? (
                        <div>
                          <p className="font-semibold text-slate-800">{v.member_name}</p>
                          {v.member_phone && (
                            <span className="text-[11px] text-slate-500 block">{v.member_phone}</span>
                          )}
                          {v.member_email && (
                            <span className="text-[11px] text-blue-600 block">{v.member_email}</span>
                          )}
                        </div>
                      ) : (
                        <span className="text-slate-400 italic">General Staff</span>
                      )}
                    </td>

                    {/* Hotel Discussed */}
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      {v.hotel_name ? (
                        <Link
                          to={`/hotels/${v.hotel_id}`}
                          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold bg-blue-50 text-[#1455D9] hover:bg-blue-100 transition-colors"
                        >
                          <Hotel className="w-3.5 h-3.5" />
                          <span>{v.hotel_name}</span>
                        </Link>
                      ) : (
                        <span className="text-slate-500">General Portfolio</span>
                      )}
                    </td>

                    {/* Notes & Updates */}
                    <td className="py-3.5 px-4">
                      <p className="text-slate-700 leading-relaxed max-w-md bg-slate-50 p-2.5 rounded-xl border border-slate-100 text-[11px]">
                        {v.notes}
                      </p>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
