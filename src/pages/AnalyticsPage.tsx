// ==============================================================================
// WINDOW COMPANIES CRM — ANALYTICS & REPORTS PAGE
// Real database aggregations across Hotels, Agencies, Quotes, and Tasks.
// Features KPI summaries, distribution breakdowns, and CSV export.
// ==============================================================================

import React, { useState, useEffect, useMemo } from 'react';
import {
  BarChart3,
  TrendingUp,
  Building2,
  Briefcase,
  Send,
  Download,
  CheckCircle2,
  RefreshCw,
  Users,
  Percent
} from 'lucide-react';
import { supabase, isSupabaseConfigured } from '../lib/supabase';

interface AnalyticsKPIs {
  totalAgencies: number;
  totalHotels: number;
  totalQuotes: number;
  totalTasks: number;
  completedTasks: number;
  activeContracts: number;
  activeEmployees: number;
}

interface HotelDistribution {
  hotelId: string;
  hotelName: string;
  quoteCount: number;
}

interface AgencyEngagement {
  agencyId: string;
  agencyName: string;
  marketName: string;
  quoteCount: number;
}

interface RateTierStats {
  tier: string;
  count: number;
}

interface RawQuoteRecord {
  id: string;
  created_at: string;
  status: string | null;
  hotel_id: string | null;
  agency_id: string | null;
  rate_category: string | null;
  metadata?: {
    rate_category?: string;
  };
}

export const AnalyticsPage: React.FC = () => {
  const [loading, setLoading] = useState(true);

  // Aggregated data states
  const [kpis, setKpis] = useState<AnalyticsKPIs>({
    totalAgencies: 0,
    totalHotels: 0,
    totalQuotes: 0,
    totalTasks: 0,
    completedTasks: 0,
    activeContracts: 0,
    activeEmployees: 0
  });

  const [topHotels, setTopHotels] = useState<HotelDistribution[]>([]);
  const [topAgencies, setTopAgencies] = useState<AgencyEngagement[]>([]);
  const [rateTiers, setRateTiers] = useState<RateTierStats[]>([]);

  const loadAnalyticsData = async () => {
    if (!isSupabaseConfigured) {
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      // 1. Fetch counts in parallel
      const [
        agenciesRes,
        hotelsRes,
        quotesRes,
        tasksRes,
        contractsRes,
        employeesRes
      ] = await Promise.all([
        supabase.from('travel_agencies').select('id, name', { count: 'exact' }),
        supabase.from('hotels').select('id, name', { count: 'exact' }),
        supabase.from('quotes').select('id, created_at, status, hotel_id, agency_id, metadata, rate_category'),
        supabase.from('tasks').select('id, status, priority'),
        supabase.from('hotel_contracts').select('id, status', { count: 'exact' }),
        supabase.from('user_profiles').select('id, is_active', { count: 'exact' })
      ]);

      const quotesData = (quotesRes.data || []) as unknown as RawQuoteRecord[];
      const tasksData = tasksRes.data || [];
      const hotelsData = hotelsRes.data || [];
      const agenciesData = agenciesRes.data || [];

      // Calculate completed tasks
      const completedTasksCount = tasksData.filter((t) => t.status === 'COMPLETED' || t.status === 'DONE').length;

      setKpis({
        totalAgencies: agenciesRes.count ?? agenciesData.length,
        totalHotels: hotelsRes.count ?? hotelsData.length,
        totalQuotes: quotesData.length,
        totalTasks: tasksData.length,
        completedTasks: completedTasksCount,
        activeContracts: contractsRes.count ?? 0,
        activeEmployees: employeesRes.count ?? 0
      });

      // 2. Aggregate hotel-wise quote distribution
      const hotelMap: Record<string, { name: string; count: number }> = {};
      hotelsData.forEach((h) => {
        hotelMap[h.id] = { name: h.name, count: 0 };
      });
      quotesData.forEach((q) => {
        if (q.hotel_id && hotelMap[q.hotel_id]) {
          const entry = hotelMap[q.hotel_id];
          if (entry) entry.count += 1;
        }
      });
      const aggregatedHotels = Object.entries(hotelMap)
        .map(([id, val]) => ({ hotelId: id, hotelName: val.name, quoteCount: val.count }))
        .sort((a, b) => b.quoteCount - a.quoteCount)
        .slice(0, 5);
      setTopHotels(aggregatedHotels);

      // 3. Aggregate agency engagement
      const agencyMap: Record<string, { name: string; count: number }> = {};
      agenciesData.forEach((a) => {
        agencyMap[a.id] = { name: a.name, count: 0 };
      });
      quotesData.forEach((q) => {
        if (q.agency_id && agencyMap[q.agency_id]) {
          const entry = agencyMap[q.agency_id];
          if (entry) entry.count += 1;
        }
      });
      const aggregatedAgencies = Object.entries(agencyMap)
        .map(([id, val]) => ({
          agencyId: id,
          agencyName: val.name,
          marketName: 'Global',
          quoteCount: val.count
        }))
        .sort((a, b) => b.quoteCount - a.quoteCount)
        .slice(0, 5);
      setTopAgencies(aggregatedAgencies);

      // 4. Aggregate rate tier distribution
      const tierCounts: Record<string, number> = { GREEN: 0, RED: 0, YELLOW: 0, CUSTOM: 0 };
      quotesData.forEach((q) => {
        const cat = (q.rate_category || q.metadata?.rate_category || 'GREEN').toUpperCase();
        if (tierCounts[cat] !== undefined) {
          tierCounts[cat] = (tierCounts[cat] ?? 0) + 1;
        } else {
          tierCounts.CUSTOM = (tierCounts.CUSTOM ?? 0) + 1;
        }
      });
      setRateTiers([
        { tier: 'GREEN (Standard Tier)', count: tierCounts.GREEN ?? 0 },
        { tier: 'RED (Budget Tier)', count: tierCounts.RED ?? 0 },
        { tier: 'YELLOW (Premium Tier)', count: tierCounts.YELLOW ?? 0 },
        { tier: 'CUSTOM (Negotiated)', count: tierCounts.CUSTOM ?? 0 }
      ]);
    } catch (err) {
      console.error('Error fetching analytics metrics:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAnalyticsData();
  }, []);

  // Export CSV summary
  const handleExportCSV = () => {
    const rows = [
      ['Metric', 'Value'],
      ['Total Travel Agencies', kpis.totalAgencies],
      ['Total Partner Hotels', kpis.totalHotels],
      ['Total Dispatched Quotes', kpis.totalQuotes],
      ['Total Operational Tasks', kpis.totalTasks],
      ['Completed Tasks', kpis.completedTasks],
      ['Active Contracts', kpis.activeContracts],
      [],
      ['Hotel Name', 'Rates Shared Count'],
      ...topHotels.map((h) => [h.hotelName, h.quoteCount]),
      [],
      ['Rate Tier', 'Dispatches'],
      ...rateTiers.map((r) => [r.tier, r.count])
    ];

    const csvContent = 'data:text/csv;charset=utf-8,' + rows.map((e) => e.join(',')).join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Window_Companies_Analytics_Report_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const taskCompletionRate = useMemo(() => {
    if (kpis.totalTasks === 0) return 100;
    return Math.round((kpis.completedTasks / kpis.totalTasks) * 100);
  }, [kpis]);

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Analytics & Business Intelligence</h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200">
              Live Database
            </span>
          </div>
          <p className="text-sm text-slate-500">
            Real-time commercial volume, rate distribution performance, hotel contracting metrics, and task tracking.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={loadAnalyticsData}
            disabled={loading}
            className="p-2.5 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 transition-colors"
            title="Refresh Data"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-blue-600' : ''}`} />
          </button>

          <button
            type="button"
            onClick={handleExportCSV}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 text-white font-medium hover:bg-emerald-700 transition-colors shadow-sm text-sm"
          >
            <Download className="w-4 h-4" /> Export CSV Report
          </button>
        </div>
      </div>

      {/* Primary KPI Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Quotes */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm relative overflow-hidden">
          <div className="flex justify-between items-start mb-3">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Dispatched Quotes</span>
            <div className="p-2 rounded-xl bg-blue-50 text-blue-600">
              <Send className="w-4 h-4" />
            </div>
          </div>
          <div className="text-3xl font-extrabold text-slate-900">{kpis.totalQuotes}</div>
          <div className="mt-2 text-xs text-slate-500 flex items-center gap-1 font-medium">
            <TrendingUp className="w-3.5 h-3.5 text-blue-600" /> Commercial rates circulars sent
          </div>
        </div>

        {/* Partner Hotels */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm">
          <div className="flex justify-between items-start mb-3">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Contracted Hotels</span>
            <div className="p-2 rounded-xl bg-purple-50 text-purple-600">
              <Building2 className="w-4 h-4" />
            </div>
          </div>
          <div className="text-3xl font-extrabold text-slate-900">{kpis.totalHotels}</div>
          <div className="mt-2 text-xs text-slate-500 flex items-center gap-1 font-medium">
            <Percent className="w-3.5 h-3.5 text-purple-600" /> {kpis.activeContracts} active contract vaults
          </div>
        </div>

        {/* Travel Agencies */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm">
          <div className="flex justify-between items-start mb-3">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Travel Agencies</span>
            <div className="p-2 rounded-xl bg-amber-50 text-amber-600">
              <Briefcase className="w-4 h-4" />
            </div>
          </div>
          <div className="text-3xl font-extrabold text-slate-900">{kpis.totalAgencies}</div>
          <div className="mt-2 text-xs text-slate-500 flex items-center gap-1 font-medium">
            <Users className="w-3.5 h-3.5 text-amber-600" /> Active travel trade partners
          </div>
        </div>

        {/* Operational Tasks */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm">
          <div className="flex justify-between items-start mb-3">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Task Completion</span>
            <div className="p-2 rounded-xl bg-emerald-50 text-emerald-600">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="text-3xl font-extrabold text-slate-900">{taskCompletionRate}%</div>
          <div className="mt-2 text-xs text-slate-500 flex items-center gap-1 font-medium">
            {kpis.completedTasks} of {kpis.totalTasks} staff tasks closed
          </div>
        </div>
      </div>

      {/* Main Charts & Breakdown Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Hotel-Wise Distribution Performance */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="font-bold text-slate-900 text-base">Top Quoted Properties</h3>
                <p className="text-xs text-slate-500">Rate distribution frequency by hotel</p>
              </div>
              <Building2 className="w-5 h-5 text-slate-400" />
            </div>

            <div className="space-y-4">
              {topHotels.length === 0 ? (
                <div className="text-center py-10 text-slate-400 text-sm">
                  No rate distribution history found in the database.
                </div>
              ) : (
                topHotels.map((h, i) => {
                  const maxCount = topHotels[0]?.quoteCount || 1;
                  const pct = Math.round((h.quoteCount / (maxCount || 1)) * 100);
                  return (
                    <div key={h.hotelId} className="space-y-1.5">
                      <div className="flex justify-between text-xs font-semibold">
                        <span className="text-slate-700">
                          {i + 1}. {h.hotelName}
                        </span>
                        <span className="text-blue-600 font-bold">{h.quoteCount} Quotes</span>
                      </div>
                      <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden">
                        <div
                          className="bg-blue-600 h-2.5 rounded-full transition-all duration-500"
                          style={{ width: `${Math.max(pct, 8)}%` }}
                        />
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-400 font-medium">
            <span>Derived from `quotes` and `hotels` tables</span>
            <span className="text-blue-600 font-semibold">Direct Aggregation</span>
          </div>
        </div>

        {/* Rate Category Breakdown */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="font-bold text-slate-900 text-base">Pricing Tier Utilization</h3>
                <p className="text-xs text-slate-500">Breakdown of GREEN, RED, YELLOW & CUSTOM shares</p>
              </div>
              <BarChart3 className="w-5 h-5 text-slate-400" />
            </div>

            <div className="space-y-4">
              {rateTiers.map((tier) => {
                const total = kpis.totalQuotes || 1;
                const pct = Math.round((tier.count / total) * 100);
                return (
                  <div key={tier.tier} className="space-y-1.5">
                    <div className="flex justify-between text-xs font-semibold">
                      <span className="text-slate-700">{tier.tier}</span>
                      <span className="text-slate-900 font-bold">
                        {tier.count} ({pct}%)
                      </span>
                    </div>
                    <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden">
                      <div
                        className={`h-2.5 rounded-full transition-all duration-500 ${
                          tier.tier.includes('GREEN')
                            ? 'bg-emerald-500'
                            : tier.tier.includes('RED')
                            ? 'bg-red-500'
                            : tier.tier.includes('YELLOW')
                            ? 'bg-amber-500'
                            : 'bg-purple-500'
                        }`}
                        style={{ width: `${tier.count > 0 ? Math.max(pct, 6) : 0}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-400 font-medium">
            <span>Standardized Commercial Rate Tiers</span>
            <span className="text-emerald-600 font-semibold">Approved Structure</span>
          </div>
        </div>
      </div>

      {/* Most Engaged Travel Agencies */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
        <div className="p-5 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h3 className="font-bold text-slate-900 text-base">Top Engaged Travel Agencies</h3>
            <p className="text-xs text-slate-500">Agencies receiving the highest volume of rate distributions</p>
          </div>
          <Briefcase className="w-5 h-5 text-slate-400" />
        </div>

        <div className="divide-y divide-slate-100">
          {topAgencies.length === 0 ? (
            <div className="p-8 text-center text-slate-400 text-sm">
              No agency quote engagement recorded yet. Dispatched quotes will appear here automatically.
            </div>
          ) : (
            topAgencies.map((agency, index) => (
              <div key={agency.agencyId} className="p-4 flex items-center justify-between hover:bg-slate-50/50 transition-colors">
                <div className="flex items-center gap-3">
                  <span className="w-6 h-6 rounded-full bg-slate-100 text-slate-600 text-xs font-bold flex items-center justify-center">
                    {index + 1}
                  </span>
                  <div>
                    <h4 className="font-semibold text-slate-900 text-sm">{agency.agencyName}</h4>
                    <span className="text-xs text-slate-400">Market: {agency.marketName}</span>
                  </div>
                </div>

                <div className="text-right">
                  <span className="text-sm font-bold text-slate-900">{agency.quoteCount}</span>
                  <span className="text-xs text-slate-400 block">Quotes Received</span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
