import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Building2,
  Hotel,
  Send,
  UserPlus,
  ArrowRight,
  CheckCircle2,
  Briefcase,
  Calendar,
  Download,
  Users2,
  Plus,
  RefreshCw,
  Search,
  Check,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { salesVisitService } from '../services/salesVisitService';
import { SalesActivityRecord } from '../types/salesVisit';
import { LogVisitModal } from '../components/visits/LogVisitModal';

interface MyTaskItem {
  id: string;
  title: string;
  priority: string;
  status: string;
  due_date: string;
}

export const DashboardPage: React.FC = () => {
  const { profile, canManageRates } = useAuth();
  const isAdmin = profile?.role === 'ADMIN';

  // Stats & tasks
  const [myTasks, setMyTasks] = useState<MyTaskItem[]>([]);
  const [stats, setStats] = useState({
    hotelsCount: 0,
    agenciesCount: 0,
    myPendingTasks: 0,
    myCompletedTasks: 0,
    todayVisitsCount: 0,
    monthVisitsCount: 0,
  });

  // Visit Logs & Monthly Report State
  const [isLogModalOpen, setIsLogModalOpen] = useState(false);
  const [visits, setVisits] = useState<SalesActivityRecord[]>([]);
  const [isLoadingVisits, setIsLoadingVisits] = useState(false);

  // Filters for Visit Tracker
  const currentMonthStr = useMemo(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  }, []);
  const [selectedMonth, setSelectedMonth] = useState<string>(currentMonthStr);
  const [searchVisitQuery, setSearchVisitQuery] = useState('');
  const [selectedSalesmanFilter, setSelectedSalesmanFilter] = useState('ALL');
  const [employeesList, setEmployeesList] = useState<{ id: string; full_name: string }[]>([]);

  // Quick toggle task completion from dashboard
  const handleToggleMyTask = async (task: MyTaskItem) => {
    if (!profile) return;
    const isCompleted = task.status === 'COMPLETED' || task.status === 'DONE';
    const nextStatus = isCompleted ? 'IN_PROGRESS' : 'COMPLETED';

    // Optimistic UI update
    setMyTasks((prev) =>
      prev.map((t) => (t.id === task.id ? { ...t, status: nextStatus } : t))
    );

    try {
      await supabase
        .from('tasks')
        .update({
          status: nextStatus,
          updated_at: new Date().toISOString(),
          completed_at: nextStatus === 'COMPLETED' ? new Date().toISOString() : null
        })
        .eq('id', task.id);

      loadDashboardData();
    } catch (err) {
      console.error('Error updating task status:', err);
      loadDashboardData();
    }
  };

  // Load Base Stats
  const loadDashboardData = useCallback(async () => {
    if (!isSupabaseConfigured || !profile) return;
    try {
      const [hotelsRes, agenciesRes, tasksRes, employeesRes] = await Promise.all([
        supabase.from('hotels').select('id', { count: 'exact', head: true }),
        supabase.from('travel_agencies').select('id', { count: 'exact', head: true }),
        supabase.from('tasks').select('id, title, priority, status, due_date').eq('assigned_to', profile.id).order('due_date', { ascending: true }),
        supabase.from('user_profiles').select('id, full_name').eq('status', 'ACTIVE').order('full_name'),
      ]);

      const tasks = (tasksRes.data || []) as MyTaskItem[];
      setMyTasks(tasks.slice(0, 5));

      const pending = tasks.filter((t) => t.status !== 'COMPLETED' && t.status !== 'DONE').length;
      const done = tasks.filter((t) => t.status === 'COMPLETED' || t.status === 'DONE').length;

      if (employeesRes.data) {
        setEmployeesList(employeesRes.data);
      }

      setStats((prev) => ({
        ...prev,
        hotelsCount: hotelsRes.count || 12,
        agenciesCount: agenciesRes.count || 292,
        myPendingTasks: pending,
        myCompletedTasks: done,
      }));
    } catch (err) {
      console.warn('Dashboard data fetch note:', err);
    }
  }, [profile]);

  // Load Visits for the selected month
  const loadVisitsData = useCallback(async () => {
    setIsLoadingVisits(true);
    try {
      // Calculate start and end date for month
      const parts = selectedMonth.split('-').map(Number);
      const year = parts[0] || new Date().getFullYear();
      const month = parts[1] || (new Date().getMonth() + 1);
      const startOfMonth = `${year}-${String(month).padStart(2, '0')}-01`;
      const lastDay = new Date(year, month, 0).getDate();
      const endOfMonth = `${year}-${String(month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;

      const { data } = await salesVisitService.fetchVisits({
        startDate: startOfMonth,
        endDate: endOfMonth,
        salesmanId: selectedSalesmanFilter === 'ALL' ? undefined : selectedSalesmanFilter,
      });

      setVisits(data || []);

      const todayStr = new Date().toISOString().split('T')[0];
      const todayCount = (data || []).filter((v) => v.activity_date === todayStr).length;

      setStats((prev) => ({
        ...prev,
        todayVisitsCount: todayCount,
        monthVisitsCount: (data || []).length,
      }));
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoadingVisits(false);
    }
  }, [selectedMonth, selectedSalesmanFilter]);

  useEffect(() => {
    loadDashboardData();
  }, [loadDashboardData]);

  useEffect(() => {
    loadVisitsData();
  }, [loadVisitsData]);

  // Filtered visits by search query
  const filteredVisits = useMemo(() => {
    const q = searchVisitQuery.toLowerCase().trim();
    if (!q) return visits;
    return visits.filter(
      (v) =>
        (v.agency_name && v.agency_name.toLowerCase().includes(q)) ||
        (v.member_name && v.member_name.toLowerCase().includes(q)) ||
        (v.hotel_name && v.hotel_name.toLowerCase().includes(q)) ||
        (v.staff_name && v.staff_name.toLowerCase().includes(q)) ||
        (v.notes && v.notes.toLowerCase().includes(q))
    );
  }, [visits, searchVisitQuery]);

  // Export Monthly Report as CSV
  const handleExportCSV = () => {
    if (filteredVisits.length === 0) return;
    const headers = [
      'Visit Date',
      'Salesman',
      'Travel Agency',
      'Market',
      'Contact Person',
      'Contact Email',
      'Contact Phone',
      'Hotel Discussed',
      'Interaction Type',
      'Discussion Notes',
    ];
    const rows = filteredVisits.map((v) => [
      v.activity_date,
      `"${v.staff_name || ''}"`,
      `"${v.agency_name || ''}"`,
      `"${v.market_name || ''}"`,
      `"${v.member_name || ''}"`,
      `"${v.member_email || ''}"`,
      `"${v.member_phone || ''}"`,
      `"${v.hotel_name || 'General Portfolio'}"`,
      `"${v.activity_type}"`,
      `"${(v.notes || '').replace(/"/g, '""')}"`,
    ]);
    const csvContent =
      'data:text/csv;charset=utf-8,' +
      [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Window_Companies_Agency_Visits_${selectedMonth}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      {/* Welcome & Role Hero Section */}
      <div className="bg-gradient-to-r from-slate-900 via-navy-950 to-slate-900 text-white p-6 md:p-8 rounded-2xl border border-slate-800 shadow-xl relative overflow-hidden">
        <div className="absolute right-0 top-0 bottom-0 w-1/3 bg-blue-500/10 blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="max-w-2xl">
            <div className="flex items-center space-x-2">
              <span
                className={`px-2.5 py-0.5 rounded-full text-xs font-semibold border ${
                  isAdmin
                    ? 'bg-purple-500/20 text-purple-300 border-purple-400/30'
                    : 'bg-blue-500/20 text-blue-300 border-blue-400/30'
                }`}
              >
                {isAdmin ? 'System Administrator Portal' : 'Sales & Operations Desk'}
              </span>
              <span className="text-xs text-slate-400">Welcome, {profile?.full_name || 'Team Member'}</span>
            </div>
            <h2 className="text-2xl md:text-3xl font-extrabold tracking-tight mt-3">
              WINDOW COMPANIES CRM
            </h2>
            <p className="text-sm text-slate-300 mt-2 leading-relaxed">
              Track field salesman visits, client agency meetings, partner hotel pitches, and quote distributions across all partner channels.
            </p>
          </div>

          {/* Primary Quick Actions */}
          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={() => setIsLogModalOpen(true)}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold text-white bg-[#1455D9] hover:bg-[#1044B2] shadow-lg shadow-blue-900/40 transition-all cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Log Agency Visit / Discussion</span>
            </button>

            {canManageRates() && (
              <Link
                to="/share-rates"
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold text-slate-200 bg-white/10 hover:bg-white/20 border border-white/20 transition-all"
              >
                <Send className="w-4 h-4 text-emerald-400" />
                <span>Share Rates</span>
              </Link>
            )}
          </div>
        </div>
      </div>

      {/* Top 4 KPI Metrics */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Today's Visits */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Today's Visits</span>
            <div className="p-2 rounded-xl bg-blue-50 text-[#1455D9]">
              <Calendar className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-4">
            <div className="text-2xl font-extrabold text-slate-900">{stats.todayVisitsCount} Visits</div>
            <p className="text-[11px] text-slate-400 mt-0.5">Logged across sales force today</p>
          </div>
        </div>

        {/* Monthly Total Visits */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Monthly Visits ({selectedMonth})</span>
            <div className="p-2 rounded-xl bg-emerald-50 text-emerald-600">
              <Briefcase className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-4">
            <div className="text-2xl font-extrabold text-emerald-700">{stats.monthVisitsCount} Total</div>
            <p className="text-[11px] text-slate-400 mt-0.5">Agency interactions this month</p>
          </div>
        </div>

        {/* Travel Agencies Master */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Partner Agencies</span>
            <div className="p-2 rounded-xl bg-purple-50 text-purple-600">
              <Building2 className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-4">
            <div className="text-2xl font-extrabold text-slate-900">{stats.agenciesCount} Agencies</div>
            <p className="text-[11px] text-slate-400 mt-0.5">981 active contact agents</p>
          </div>
        </div>

        {/* Partner Hotels */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Hotels Portfolio</span>
            <div className="p-2 rounded-xl bg-amber-50 text-amber-600">
              <Hotel className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-4">
            <div className="text-2xl font-extrabold text-slate-900">{stats.hotelsCount} Hotels</div>
            <p className="text-[11px] text-slate-400 mt-0.5">Active contracts &amp; 4 rate tiers</p>
          </div>
        </div>
      </div>

      {/* 
        ========================================================================
        MAIN SECTION: SALESMAN AGENCY VISIT TRACKER & MONTHLY REPORT
        ========================================================================
      */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        {/* Table & Report Controls Toolbar */}
        <div className="p-5 border-b border-slate-200 flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4 bg-slate-50/60">
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base font-bold text-slate-900">
                Daily Salesman Visits &amp; Discussion Log
              </h3>
              <span className="px-2.5 py-0.5 bg-blue-100 text-[#1455D9] rounded-full text-xs font-bold">
                {filteredVisits.length} Records
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Review daily visits, agent discussions, and hotels pitched with monthly reporting
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            {/* Month Picker Filter */}
            <div className="flex items-center gap-1.5 bg-white px-3 py-1.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 shadow-2xs">
              <Calendar className="w-3.5 h-3.5 text-[#1455D9]" />
              <input
                type="month"
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                className="focus:outline-none bg-transparent cursor-pointer font-bold text-slate-800"
              />
            </div>

            {/* Salesman Filter (Available to all users) */}
            {employeesList.length > 0 && (
              <select
                value={selectedSalesmanFilter}
                onChange={(e) => setSelectedSalesmanFilter(e.target.value)}
                className="px-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 focus:outline-none focus:border-[#1455D9] shadow-2xs"
              >
                <option value="ALL">All Salesmen ({employeesList.length})</option>
                {employeesList.map((emp) => (
                  <option key={emp.id} value={emp.id}>
                    {emp.full_name}
                  </option>
                ))}
              </select>
            )}

            {/* Search Input */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
              <input
                type="text"
                placeholder="Search visits, agency, hotel..."
                value={searchVisitQuery}
                onChange={(e) => setSearchVisitQuery(e.target.value)}
                className="pl-8 pr-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs w-48 sm:w-60 focus:outline-none focus:border-[#1455D9]"
              />
            </div>

            {/* Refresh */}
            <button
              onClick={loadVisitsData}
              disabled={isLoadingVisits}
              className="p-2 text-slate-500 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors shadow-2xs"
              title="Refresh Visits"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoadingVisits ? 'animate-spin text-[#1455D9]' : ''}`} />
            </button>

            {/* Export Monthly Report */}
            <button
              onClick={handleExportCSV}
              disabled={filteredVisits.length === 0}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 transition-colors shadow-2xs disabled:opacity-50"
              title="Download Monthly Report as CSV"
            >
              <Download className="w-3.5 h-3.5 text-emerald-600" />
              <span>Export Report</span>
            </button>

            {/* Quick Add Button */}
            <button
              onClick={() => setIsLogModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold text-white bg-[#1455D9] hover:bg-[#1044B2] shadow-sm transition-all"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Log Visit</span>
            </button>
          </div>
        </div>

        {/* Data Table */}
        <div className="overflow-x-auto">
          {isLoadingVisits ? (
            <div className="py-16 text-center text-slate-500">
              <RefreshCw className="w-6 h-6 text-[#1455D9] animate-spin mx-auto mb-2" />
              <p className="text-xs font-medium">Loading visit records for {selectedMonth}...</p>
            </div>
          ) : filteredVisits.length === 0 ? (
            <div className="py-16 text-center text-slate-500">
              <Briefcase className="w-10 h-10 text-slate-300 mx-auto mb-2" />
              <h4 className="text-sm font-bold text-slate-700">No agency visits found</h4>
              <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
                No meetings or field visits have been recorded for this period yet. Click "+ Log Agency Visit" to add today's discussions.
              </p>
              <button
                onClick={() => setIsLogModalOpen(true)}
                className="mt-3 inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-semibold text-white bg-[#1455D9]"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Record First Visit</span>
              </button>
            </div>
          ) : (
            <table className="w-full min-w-[850px] text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-100/75 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider text-[11px]">
                  <th className="py-3 px-4 min-w-[110px]">Date &amp; Staff</th>
                  <th className="py-3 px-4 min-w-[180px]">Agency &amp; Market</th>
                  <th className="py-3 px-4 min-w-[160px]">Contact Person (Agent)</th>
                  <th className="py-3 px-4 min-w-[150px]">Hotel Discussed</th>
                  <th className="py-3 px-4 min-w-[240px]">Discussion Notes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {filteredVisits.map((v) => (
                  <tr key={v.id} className="hover:bg-blue-50/30 transition-colors">
                    {/* Date & Staff */}
                    <td className="py-3.5 px-4 align-top">
                      <div className="font-bold text-slate-900">{v.activity_date}</div>
                      <div className="text-[11px] text-[#1455D9] font-medium flex items-center gap-1 mt-0.5">
                        <Users2 className="w-3 h-3" />
                        <span>{v.staff_name || 'Staff'}</span>
                      </div>
                      <span className="inline-block mt-1 px-1.5 py-0.5 bg-slate-100 border border-slate-200 text-slate-600 rounded text-[10px] font-semibold">
                        {v.activity_type}
                      </span>
                    </td>

                    {/* Agency & Market */}
                    <td className="py-3.5 px-4 align-top">
                      <div className="font-bold text-slate-900 flex items-center gap-1.5">
                        <Building2 className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span>{v.agency_name}</span>
                      </div>
                      {v.market_name && (
                        <div className="text-[11px] text-slate-500 mt-0.5 ml-5">
                          Market: {v.market_name}
                        </div>
                      )}
                    </td>

                    {/* Contact Person */}
                    <td className="py-3.5 px-4 align-top">
                      {v.member_name ? (
                        <div>
                          <div className="font-semibold text-slate-800">{v.member_name}</div>
                          {v.member_email && (
                            <div className="text-[11px] text-slate-400 font-mono truncate max-w-[160px]">
                              {v.member_email}
                            </div>
                          )}
                          {v.member_phone && (
                            <div className="text-[10px] text-emerald-700 font-medium mt-0.5">
                              📞 {v.member_phone}
                            </div>
                          )}
                        </div>
                      ) : (
                        <span className="text-slate-400 italic">General Staff</span>
                      )}
                    </td>

                    {/* Hotel Discussed */}
                    <td className="py-3.5 px-4 align-top">
                      {v.hotel_name ? (
                        <div className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-purple-50 text-purple-800 rounded-lg border border-purple-200 font-semibold text-[11px]">
                          <Hotel className="w-3.5 h-3.5 text-purple-600 shrink-0" />
                          <span>{v.hotel_name}</span>
                        </div>
                      ) : (
                        <span className="text-slate-400 italic">Multiple / All Portfolio</span>
                      )}
                    </td>

                    {/* Discussion Notes */}
                    <td className="py-3.5 px-4 align-top">
                      <p className="text-xs text-slate-800 whitespace-pre-wrap leading-relaxed bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                        {v.notes}
                      </p>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Staff Daily Tasks & Quick Links */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: My Active Tasks Queue */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <h3 className="text-base font-bold text-slate-900">My Daily Assignments</h3>
              <p className="text-xs text-slate-500">Tasks assigned to you by CRM management</p>
            </div>
            <Link
              to="/tasks"
              className="text-xs font-bold text-blue-600 hover:text-blue-700 flex items-center gap-1"
            >
              <span>View All Tasks</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="divide-y divide-slate-100">
            {myTasks.length === 0 ? (
              <div className="py-8 text-center text-slate-400">
                <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-2 opacity-80" />
                <p className="text-sm font-medium text-slate-600">All caught up! No active tasks pending.</p>
                <p className="text-xs text-slate-400 mt-0.5">New task assignments will appear here.</p>
              </div>
            ) : (
              myTasks.map((t) => {
                const isCompleted = t.status === 'COMPLETED' || t.status === 'DONE';
                return (
                  <div key={t.id} className="py-3 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <button
                        type="button"
                        onClick={() => handleToggleMyTask(t)}
                        title={isCompleted ? 'Mark as In Progress' : 'Mark as Done'}
                        className={`w-5 h-5 rounded-md flex-shrink-0 flex items-center justify-center border transition-all ${
                          isCompleted
                            ? 'bg-emerald-600 border-emerald-600 text-white'
                            : 'border-slate-300 hover:border-emerald-500 hover:bg-emerald-50 text-transparent hover:text-emerald-600'
                        }`}
                      >
                        <Check className="w-3.5 h-3.5 stroke-[3]" />
                      </button>
                      <div className="min-w-0">
                        <h4
                          className={`text-xs font-semibold truncate ${
                            isCompleted ? 'line-through text-slate-400' : 'text-slate-800'
                          }`}
                        >
                          {t.title}
                        </h4>
                        <span className="text-[10px] text-slate-400">Due: {t.due_date}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 flex-shrink-0">
                      <button
                        type="button"
                        onClick={() => handleToggleMyTask(t)}
                        className={`px-2 py-0.5 rounded text-[10px] font-bold transition-all ${
                          isCompleted
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : t.status === 'BLOCKED'
                            ? 'bg-red-50 text-red-700 border border-red-200'
                            : 'bg-slate-100 hover:bg-emerald-50 hover:text-emerald-700 text-slate-700 border border-slate-200'
                        }`}
                      >
                        {isCompleted ? '✓ Done' : t.status}
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Right 1 Col: Quick Links */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-4">
          <h3 className="text-base font-bold text-slate-900 border-b border-slate-100 pb-3">Quick Navigation</h3>
          <div className="space-y-2.5">
            <Link
              to="/agencies"
              className="p-3 rounded-xl border border-slate-200 hover:border-blue-400 hover:bg-blue-50/40 transition-colors flex items-center justify-between group"
            >
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-lg bg-blue-50 text-blue-600 group-hover:bg-blue-600 group-hover:text-white transition-colors">
                  <Building2 className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-xs font-bold text-slate-800">Travel Agencies</div>
                  <div className="text-[10px] text-slate-400">292 agencies &amp; 981 contacts</div>
                </div>
              </div>
              <ArrowRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-blue-600" />
            </Link>

            <Link
              to="/hotels"
              className="p-3 rounded-xl border border-slate-200 hover:border-purple-400 hover:bg-purple-50/40 transition-colors flex items-center justify-between group"
            >
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-lg bg-purple-50 text-purple-600 group-hover:bg-purple-600 group-hover:text-white transition-colors">
                  <Hotel className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-xs font-bold text-slate-800">Partner Hotels</div>
                  <div className="text-[10px] text-slate-400">View 12 partner hotels &amp; visit histories</div>
                </div>
              </div>
              <ArrowRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-purple-600" />
            </Link>

            {isAdmin && (
              <Link
                to="/employees"
                className="p-3 rounded-xl border border-purple-200 bg-purple-50/30 hover:bg-purple-50 transition-colors flex items-center justify-between group"
              >
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-lg bg-purple-100 text-purple-700">
                    <UserPlus className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-purple-900">Staff Management</div>
                    <div className="text-[10px] text-purple-600">Provision &amp; manage employee logins</div>
                  </div>
                </div>
                <ArrowRight className="w-3.5 h-3.5 text-purple-600" />
              </Link>
            )}
          </div>
        </div>
      </div>

      {/* Log Visit Modal */}
      <LogVisitModal
        isOpen={isLogModalOpen}
        onClose={() => setIsLogModalOpen(false)}
        onSuccess={() => {
          loadVisitsData();
        }}
      />
    </div>
  );
};
