import React from 'react';
import {
  Building2,
  Hotel,
  Percent,
  Send,
  Sparkles,
  ShieldCheck
} from 'lucide-react';
import { Link } from 'react-router-dom';

export const DashboardPage: React.FC = () => {
  return (
    <div className="space-y-6">
      {/* Welcome & Security Banner */}
      <div className="bg-white p-6 rounded-xl border border-crm-border shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200">
              Architecture Stage: Phase 1 Initialized
            </span>
            <span className="text-xs text-slate-400">Date: November 2026</span>
          </div>
          <h2 className="text-2xl font-bold text-crm-navy mt-2">WINDOW COMPANIES CRM</h2>
          <p className="text-sm text-slate-500 mt-1">
            Internal Sales Desk for Partner Hotel Rates, Agency Contacts, Special Quotes & Sales Distribution.
          </p>
        </div>

        <div className="flex items-center space-x-3">
          <Link
            to="/share-rates"
            className="inline-flex items-center space-x-2 px-4 py-2 rounded-lg bg-crm-blue text-white text-xs font-semibold hover:bg-crm-blue-hover transition-colors shadow-sm"
          >
            <Send className="w-4 h-4" />
            <span>Preview Share Wizard</span>
          </Link>
          <Link
            to="/rates"
            className="inline-flex items-center space-x-2 px-4 py-2 rounded-lg bg-slate-100 text-slate-700 text-xs font-semibold hover:bg-slate-200 transition-colors border border-slate-200"
          >
            <Percent className="w-4 h-4" />
            <span>Rate Management</span>
          </Link>
        </div>
      </div>

      {/* Metrics Shell (Real calculations pending live data in future phases) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Partner Hotels', icon: Hotel, count: '4 Hotels', hint: 'Randoli, Beragala, Horton Heights, H.S.H' },
          { label: 'Travel Agencies', icon: Building2, count: '~1,000 Contacts', hint: 'Hierarchy: Agency → Market → Member' },
          { label: 'Rate Option Classes', icon: Percent, count: 'Red / Green / Yellow', hint: 'Lowest, Normal, Highest rates' },
          { label: 'Special Rates Slots', icon: Sparkles, count: 'Slots 1, 2, 3', hint: 'Agency-specific negotiated rates' },
        ].map((card, idx) => (
          <div key={idx} className="bg-white p-5 rounded-xl border border-crm-border shadow-sm flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-slate-500">{card.label}</span>
              <div className="p-2 rounded-lg bg-crm-bg text-crm-blue">
                <card.icon className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-4">
              <div className="text-xl font-bold text-slate-800">{card.count}</div>
              <p className="text-[11px] text-slate-400 mt-0.5">{card.hint}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Core Workflow Guides */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Rate Color Scheme Reference */}
        <div className="bg-white p-6 rounded-xl border border-crm-border shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-800">Confirmed Rate Mapping</h3>
            <span className="text-[10px] font-semibold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
              Confirmed
            </span>
          </div>
          <p className="text-xs text-slate-500">
            Standard pricing tiers mapped to explicit color cards across the entire CRM:
          </p>
          <div className="space-y-2">
            <div className="flex items-center justify-between p-3 rounded-lg border border-red-200 bg-red-50 text-red-900 text-xs font-semibold">
              <div className="flex items-center space-x-2">
                <span className="w-3 h-3 rounded-full bg-red-500"></span>
                <span>Red Rate</span>
              </div>
              <span className="text-[11px] font-medium text-red-700">Lowest Rate</span>
            </div>
            <div className="flex items-center justify-between p-3 rounded-lg border border-emerald-200 bg-emerald-50 text-emerald-900 text-xs font-semibold">
              <div className="flex items-center space-x-2">
                <span className="w-3 h-3 rounded-full bg-emerald-500"></span>
                <span>Green Rate</span>
              </div>
              <span className="text-[11px] font-medium text-emerald-700">Normal Rate</span>
            </div>
            <div className="flex items-center justify-between p-3 rounded-lg border border-amber-200 bg-amber-50 text-amber-900 text-xs font-semibold">
              <div className="flex items-center space-x-2">
                <span className="w-3 h-3 rounded-full bg-amber-500"></span>
                <span>Yellow Rate</span>
              </div>
              <span className="text-[11px] font-medium text-amber-700">Highest Rate</span>
            </div>
          </div>
        </div>

        {/* Recipient Scopes */}
        <div className="bg-white p-6 rounded-xl border border-crm-border shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-800">Rate Distribution Scopes</h3>
            <span className="text-[10px] font-semibold text-crm-blue bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
              Confirmed
            </span>
          </div>
          <p className="text-xs text-slate-500">
            Sales staff can dispatch rate quotes under three strict validation scopes:
          </p>
          <div className="space-y-3">
            <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 text-xs">
              <div className="font-semibold text-slate-800">1. Individual Member</div>
              <p className="text-[11px] text-slate-500 mt-0.5">Dispatches rate quote directly to a single selected contact profile.</p>
            </div>
            <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 text-xs">
              <div className="font-semibold text-slate-800">2. Entire Market</div>
              <p className="text-[11px] text-slate-500 mt-0.5">E.g., Jetwing Travels → Indian Market contacts simultaneously.</p>
            </div>
            <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 text-xs">
              <div className="font-semibold text-slate-800">3. Entire Agency</div>
              <p className="text-[11px] text-slate-500 mt-0.5">All contacts across all markets under that travel agency.</p>
            </div>
          </div>
        </div>

        {/* Security Principles Checklist */}
        <div className="bg-white p-6 rounded-xl border border-crm-border shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-800">Guiding Architecture Principles</h3>
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
          </div>
          <p className="text-xs text-slate-500">
            Security requirements to be enforced in Phase 2 &amp; beyond:
          </p>
          <ul className="space-y-2 text-xs text-slate-600">
            <li className="flex items-start space-x-2">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mt-1.5 flex-shrink-0" />
              <span>Zero-trust: Client inputs never trusted without server-side validation.</span>
            </li>
            <li className="flex items-start space-x-2">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mt-1.5 flex-shrink-0" />
              <span>Default-deny: No open table access without Supabase RLS policies.</span>
            </li>
            <li className="flex items-start space-x-2">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mt-1.5 flex-shrink-0" />
              <span>Zero fake auth: No simulated login screens or faux localStorage security.</span>
            </li>
            <li className="flex items-start space-x-2">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mt-1.5 flex-shrink-0" />
              <span>Secret isolation: Service role keys kept strictly off frontend code.</span>
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
};
