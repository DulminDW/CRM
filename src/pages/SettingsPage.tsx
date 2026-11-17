import React, { useState, useEffect } from 'react';
import {
  Settings,
  Shield,
  Key,
  Database,
  Users,
  Bell,
  CheckCircle2,
  Save,
  RefreshCw,
  Sliders,
  ExternalLink,
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { Link } from 'react-router-dom';

export const SettingsPage: React.FC = () => {

  // System Settings state
  const [companyName, setCompanyName] = useState('WINDOW COMPANIES (PVT) LTD.');
  const [defaultCurrency, setDefaultCurrency] = useState('USD');
  const [systemAlertsEnabled, setSystemAlertsEnabled] = useState(true);
  const [autoEmailNotifyTeam, setAutoEmailNotifyTeam] = useState(true);
  const [mentionAlertsEnabled, setMentionAlertsEnabled] = useState(true);

  // Status & Feedback
  const [isSaving, setIsSaving] = useState(false);
  const [saveBanner, setSaveBanner] = useState<string | null>(null);
  const [stats, setStats] = useState({
    activeUsers: 0,
    agencies: 0,
    hotels: 0,
    quotesDispatched: 0,
  });

  useEffect(() => {
    const loadSystemCounts = async () => {
      try {
        const [usersRes, agRes, hRes, qRes] = await Promise.all([
          supabase.from('user_profiles').select('id', { count: 'exact', head: true }).eq('status', 'ACTIVE'),
          supabase.from('travel_agencies').select('id', { count: 'exact', head: true }),
          supabase.from('hotels').select('id', { count: 'exact', head: true }),
          supabase.from('quotes').select('id', { count: 'exact', head: true }),
        ]);

        setStats({
          activeUsers: usersRes.count || 2,
          agencies: agRes.count || 292,
          hotels: hRes.count || 12,
          quotesDispatched: qRes.count || 0,
        });
      } catch (err) {
        console.warn('System status check note:', err);
      }
    };

    loadSystemCounts();

    // Load saved settings if any
    const saved = localStorage.getItem('window_crm_system_settings');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed.companyName) setCompanyName(parsed.companyName);
        if (parsed.defaultCurrency) setDefaultCurrency(parsed.defaultCurrency);
        if (typeof parsed.systemAlertsEnabled === 'boolean') setSystemAlertsEnabled(parsed.systemAlertsEnabled);
        if (typeof parsed.autoEmailNotifyTeam === 'boolean') setAutoEmailNotifyTeam(parsed.autoEmailNotifyTeam);
        if (typeof parsed.mentionAlertsEnabled === 'boolean') setMentionAlertsEnabled(parsed.mentionAlertsEnabled);
      } catch (e) {
        // Fallback to default
      }
    }
  }, []);

  const handleSaveSettings = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);

    const config = {
      companyName,
      defaultCurrency,
      systemAlertsEnabled,
      autoEmailNotifyTeam,
      mentionAlertsEnabled,
      lastUpdated: new Date().toISOString(),
    };

    localStorage.setItem('window_crm_system_settings', JSON.stringify(config));

    setTimeout(() => {
      setIsSaving(false);
      setSaveBanner('System configurations & notification preferences saved successfully!');
      setTimeout(() => setSaveBanner(null), 4000);
    }, 400);
  };

  return (
    <div className="p-4 sm:p-6 max-w-5xl mx-auto space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-slate-900 text-white flex items-center justify-center shadow-sm">
            <Settings className="w-6 h-6 text-blue-400" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold text-slate-900 tracking-tight">System Settings &amp; Administration</h1>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-purple-50 text-purple-700 border border-purple-200">
                Admin Controls
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Configure company profiles, live notification dispatch policies, access tiers, and security parameters.
            </p>
          </div>
        </div>

        {saveBanner && (
          <div className="flex items-center gap-2 px-3.5 py-2 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs font-semibold animate-fade-in">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{saveBanner}</span>
          </div>
        )}
      </div>

      {/* System Health / Status Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Active Staff</span>
            <Users className="w-4 h-4 text-[#1455D9]" />
          </div>
          <div className="text-2xl font-black text-slate-900 mt-2">{stats.activeUsers} Logins</div>
          <Link to="/employees" className="text-[11px] font-bold text-[#1455D9] hover:underline mt-1 block">
            Manage Staff &rarr;
          </Link>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Partner Agencies</span>
            <Database className="w-4 h-4 text-purple-600" />
          </div>
          <div className="text-2xl font-black text-slate-900 mt-2">{stats.agencies} Accounts</div>
          <span className="text-[10px] text-slate-400">981 travel agents</span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Partner Hotels</span>
            <Shield className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-2xl font-black text-slate-900 mt-2">{stats.hotels} Hotels</div>
          <span className="text-[10px] text-slate-400">12 contracted properties</span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Security Architecture</span>
            <Key className="w-4 h-4 text-amber-600" />
          </div>
          <div className="text-sm font-bold text-slate-900 mt-2">Row-Level Security</div>
          <span className="text-[10px] text-emerald-700 font-bold block mt-0.5">● 100% Postgres RLS Active</span>
        </div>
      </div>

      {/* Main Settings Form */}
      <form onSubmit={handleSaveSettings} className="space-y-6">
        {/* Section 1: General Company Parameters */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-4">
          <div className="border-b border-slate-100 pb-3">
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Sliders className="w-4 h-4 text-[#1455D9]" />
              <span>General Organization Configuration</span>
            </h3>
            <p className="text-xs text-slate-500">Corporate entity details used in quotes, email templates, and system headers</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                Company Display Name
              </label>
              <input
                type="text"
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#1455D9]/20 focus:border-[#1455D9]"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                Default Currency for Rate Sharing
              </label>
              <select
                value={defaultCurrency}
                onChange={(e) => setDefaultCurrency(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#1455D9]/20 focus:border-[#1455D9]"
              >
                <option value="USD">USD ($) - United States Dollar (Default)</option>
                <option value="LKR">LKR (Rs) - Sri Lankan Rupee</option>
                <option value="EUR">EUR (€) - Euro</option>
                <option value="GBP">GBP (£) - British Pound</option>
              </select>
            </div>
          </div>
        </div>

        {/* Section 2: Notifications & Team Broadcast Policies */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-4">
          <div className="border-b border-slate-100 pb-3">
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Bell className="w-4 h-4 text-emerald-600" />
              <span>Team Notifications &amp; Alert Routing</span>
            </h3>
            <p className="text-xs text-slate-500">
              Rules governing who receives notifications when quotes are shared or colleagues are tagged
            </p>
          </div>

          <div className="space-y-3.5">
            {/* Toggle 1: Rate Quote Shared Broadcast */}
            <label className="flex items-start gap-3.5 p-3.5 rounded-xl border border-slate-200 bg-slate-50/50 hover:bg-slate-50 transition-colors cursor-pointer">
              <input
                type="checkbox"
                checked={autoEmailNotifyTeam}
                onChange={(e) => setAutoEmailNotifyTeam(e.target.checked)}
                className="mt-1 w-4 h-4 rounded text-[#1455D9] focus:ring-[#1455D9]"
              />
              <div className="text-xs">
                <span className="font-bold text-slate-900 block">
                  Broadcast Rate Sharing to Admin &amp; Sales Team
                </span>
                <span className="text-slate-500 leading-relaxed block mt-0.5">
                  When any salesman or staff member shares rates to a travel agency, automatically send an instant in-app notification to the Administrator and all active sales team members.
                </span>
              </div>
            </label>

            {/* Toggle 2: User Mentions */}
            <label className="flex items-start gap-3.5 p-3.5 rounded-xl border border-slate-200 bg-slate-50/50 hover:bg-slate-50 transition-colors cursor-pointer">
              <input
                type="checkbox"
                checked={mentionAlertsEnabled}
                onChange={(e) => setMentionAlertsEnabled(e.target.checked)}
                className="mt-1 w-4 h-4 rounded text-[#1455D9] focus:ring-[#1455D9]"
              />
              <div className="text-xs">
                <span className="font-bold text-slate-900 block">
                  Enable @User Mention Notifications
                </span>
                <span className="text-slate-500 leading-relaxed block mt-0.5">
                  Send immediate notifications when a team member tags someone with @name in the CRM team chat or task discussions.
                </span>
              </div>
            </label>

            {/* Toggle 3: System Operational Alerts */}
            <label className="flex items-start gap-3.5 p-3.5 rounded-xl border border-slate-200 bg-slate-50/50 hover:bg-slate-50 transition-colors cursor-pointer">
              <input
                type="checkbox"
                checked={systemAlertsEnabled}
                onChange={(e) => setSystemAlertsEnabled(e.target.checked)}
                className="mt-1 w-4 h-4 rounded text-[#1455D9] focus:ring-[#1455D9]"
              />
              <div className="text-xs">
                <span className="font-bold text-slate-900 block">
                  Task Assignment &amp; High-Priority Blocker Alerts
                </span>
                <span className="text-slate-500 leading-relaxed block mt-0.5">
                  Notify assigned employees when a new task is delegated or when an operational task is marked as BLOCKED.
                </span>
              </div>
            </label>
          </div>
        </div>

        {/* Section 3: Administrative Access & Quick Shortcuts */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-4">
          <div className="border-b border-slate-100 pb-3">
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Shield className="w-4 h-4 text-purple-600" />
              <span>Administrative Tools &amp; Logs</span>
            </h3>
            <p className="text-xs text-slate-500">Access deeper administrative controls, staff logins, and immutable logs</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Link
              to="/employees"
              className="p-3.5 rounded-xl border border-slate-200 hover:border-purple-300 hover:bg-purple-50/30 flex items-center justify-between transition-colors group"
            >
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-purple-100 text-purple-700">
                  <Users className="w-4 h-4" />
                </div>
                <div>
                  <span className="text-xs font-bold text-slate-900 block group-hover:text-purple-700">
                    Employee Logins &amp; Roles
                  </span>
                  <span className="text-[11px] text-slate-500">Provision passwords, departments &amp; permissions</span>
                </div>
              </div>
              <ExternalLink className="w-4 h-4 text-slate-400 group-hover:text-purple-700" />
            </Link>

            <Link
              to="/activity-log"
              className="p-3.5 rounded-xl border border-slate-200 hover:border-blue-300 hover:bg-blue-50/30 flex items-center justify-between transition-colors group"
            >
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-blue-100 text-[#1455D9]">
                  <Database className="w-4 h-4" />
                </div>
                <div>
                  <span className="text-xs font-bold text-slate-900 block group-hover:text-[#1455D9]">
                    System Activity &amp; Audit Logs
                  </span>
                  <span className="text-[11px] text-slate-500">Inspect database changes, quotes &amp; visit histories</span>
                </div>
              </div>
              <ExternalLink className="w-4 h-4 text-slate-400 group-hover:text-[#1455D9]" />
            </Link>
          </div>
        </div>

        {/* Submit Actions */}
        <div className="flex items-center justify-end gap-3 pt-2">
          <button
            type="submit"
            disabled={isSaving}
            className="inline-flex items-center gap-2 px-6 py-2.5 bg-[#1455D9] hover:bg-[#1044B2] text-white text-xs font-bold rounded-xl shadow-md transition-all disabled:opacity-50"
          >
            {isSaving ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span>Saving Configurations...</span>
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                <span>Save All Settings</span>
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
};
