import React, { useState, useEffect } from 'react';
import {
  Building2,
  Hotel,
  Send,
  ShieldCheck,
  UserPlus,
  ArrowRight,
  CheckCircle2,
  Clock,
  Briefcase
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { supabase, isSupabaseConfigured } from '../lib/supabase';

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

  const [myTasks, setMyTasks] = useState<MyTaskItem[]>([]);
  const [stats, setStats] = useState({
    hotelsCount: 0,
    agenciesCount: 0,
    myPendingTasks: 0,
    myCompletedTasks: 0
  });

  useEffect(() => {
    if (!isSupabaseConfigured || !profile) return;

    const loadDashboardData = async () => {
      try {
        const [hotelsRes, agenciesRes, tasksRes] = await Promise.all([
          supabase.from('hotels').select('id', { count: 'exact', head: true }),
          supabase.from('travel_agencies').select('id', { count: 'exact', head: true }),
          supabase.from('tasks').select('id, title, priority, status, due_date').eq('assigned_to', profile.id).order('due_date', { ascending: true })
        ]);

        const tasks = (tasksRes.data || []) as MyTaskItem[];
        setMyTasks(tasks.slice(0, 5));

        const pending = tasks.filter((t) => t.status !== 'COMPLETED' && t.status !== 'DONE').length;
        const done = tasks.filter((t) => t.status === 'COMPLETED' || t.status === 'DONE').length;

        setStats({
          hotelsCount: hotelsRes.count || 12,
          agenciesCount: agenciesRes.count || 5,
          myPendingTasks: pending,
          myCompletedTasks: done
        });
      } catch (err) {
        console.warn('Dashboard data fetch note:', err);
      }
    };

    loadDashboardData();
  }, [profile]);

  return (
    <div className="space-y-6">
      {/* Welcome & Role Hero Section */}
      <div className="bg-gradient-to-r from-crm-navy via-slate-900 to-crm-navy text-white p-6 md:p-8 rounded-2xl border border-slate-800 shadow-lg relative overflow-hidden">
        <div className="absolute right-0 top-0 bottom-0 w-1/3 bg-blue-500/5 blur-3xl pointer-events-none" />
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
                {isAdmin ? 'System Administrator Portal' : 'Staff Operations Desk'}
              </span>
              <span className="text-xs text-slate-400">Welcome, {profile?.full_name || 'Team Member'}</span>
            </div>
            <h2 className="text-2xl md:text-3xl font-extrabold tracking-tight mt-3">
              WINDOW COMPANIES CRM
            </h2>
            <p className="text-sm md:text-base text-slate-300 mt-2 leading-relaxed">
              {isAdmin
                ? 'Full administrative control over hotel contracts, partner inventory, employee provisioning, daily tasks, and corporate rate distribution.'
                : 'Manage travel agency accounts, coordinate daily task assignments, browse partner hotel portfolios, and prepare quotes quickly.'}
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            {canManageRates() ? (
              <Link
                to="/share-rates"
                className="inline-flex items-center justify-center space-x-2.5 px-6 py-3.5 rounded-xl bg-blue-600 text-white font-bold text-sm hover:bg-blue-500 transition-all shadow-md shadow-blue-600/30 group"
              >
                <Send className="w-4 h-4 transition-transform group-hover:translate-x-0.5" />
                <span>Send Hotel Rates</span>
                <ArrowRight className="w-4 h-4 opacity-75" />
              </Link>
            ) : (
              <Link
                to="/tasks"
                className="inline-flex items-center justify-center space-x-2.5 px-6 py-3.5 rounded-xl bg-emerald-600 text-white font-bold text-sm hover:bg-emerald-500 transition-all shadow-md shadow-emerald-600/30 group"
              >
                <CheckCircle2 className="w-4 h-4 transition-transform group-hover:translate-x-0.5" />
                <span>My Daily Tasks</span>
                <ArrowRight className="w-4 h-4 opacity-75" />
              </Link>
            )}

            <Link
              to="/agencies"
              className="inline-flex items-center justify-center space-x-2 px-4 py-3.5 rounded-xl bg-slate-800/80 text-slate-200 text-sm font-semibold hover:bg-slate-700 transition-colors border border-slate-700"
            >
              <Briefcase className="w-4 h-4 text-slate-400" />
              <span>Agencies</span>
            </Link>
          </div>
        </div>
      </div>

      {/* Primary KPI Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-xl border border-crm-border shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500">Partner Hotels</span>
            <div className="p-2 rounded-lg bg-blue-50 text-blue-600">
              <Hotel className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-4">
            <div className="text-xl font-bold text-slate-800">{stats.hotelsCount} Hotels</div>
            <p className="text-[11px] text-slate-400 mt-0.5">Contracted partner properties</p>
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-crm-border shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500">Travel Agencies</span>
            <div className="p-2 rounded-lg bg-purple-50 text-purple-600">
              <Building2 className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-4">
            <div className="text-xl font-bold text-slate-800">{stats.agenciesCount} Agencies</div>
            <p className="text-[11px] text-slate-400 mt-0.5">Agency &rarr; Market &rarr; Member</p>
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-crm-border shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500">My Assigned Tasks</span>
            <div className="p-2 rounded-lg bg-amber-50 text-amber-600">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-4">
            <div className="text-xl font-bold text-slate-800">{stats.myPendingTasks} Pending</div>
            <p className="text-[11px] text-slate-400 mt-0.5">{stats.myCompletedTasks} completed</p>
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-crm-border shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500">Access Tier</span>
            <div className="p-2 rounded-lg bg-emerald-50 text-emerald-600">
              <ShieldCheck className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-4">
            <div className="text-xl font-bold text-slate-800">{profile?.role || 'STAFF'}</div>
            <p className="text-[11px] text-slate-400 mt-0.5">
              {canManageRates() ? 'Rates Manager (Full Quoting)' : 'Standard Operations Staff'}
            </p>
          </div>
        </div>
      </div>

      {/* Staff Daily Tasks & Quick Actions */}
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
                <p className="text-xs text-slate-400 mt-0.5">New task assignments from Admin will appear here.</p>
              </div>
            ) : (
              myTasks.map((t) => (
                <div key={t.id} className="py-3 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <span
                      className={`w-2 h-2 rounded-full ${
                        t.status === 'COMPLETED'
                          ? 'bg-emerald-500'
                          : t.status === 'BLOCKED'
                          ? 'bg-red-500'
                          : t.priority === 'URGENT' || t.priority === 'HIGH'
                          ? 'bg-amber-500'
                          : 'bg-blue-500'
                      }`}
                    />
                    <div>
                      <h4 className="text-xs font-semibold text-slate-800">{t.title}</h4>
                      <span className="text-[10px] text-slate-400">Due: {t.due_date}</span>
                    </div>
                  </div>

                  <span
                    className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                      t.status === 'COMPLETED'
                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                        : t.status === 'BLOCKED'
                        ? 'bg-red-50 text-red-700 border border-red-200'
                        : 'bg-slate-100 text-slate-700'
                    }`}
                  >
                    {t.status}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Right 1 Col: Quick Links & Workflows */}
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
                  <div className="text-[10px] text-slate-400">Browse ~1,000 partner contacts</div>
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
                  <div className="text-[10px] text-slate-400">View 12 partner properties &amp; seasons</div>
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
    </div>
  );
};
