import React from 'react';
import {
  Building2,
  Hotel,
  Percent,
  Send,
  Sparkles,
  ShieldCheck,
  UserPlus,
  ArrowRight
} from 'lucide-react';
import { Link } from 'react-router-dom';

export const DashboardPage: React.FC = () => {
  return (
    <div className="space-y-6">
      {/* Welcome & Rate Sharing Hero Section */}
      <div className="bg-gradient-to-r from-crm-navy via-slate-900 to-crm-navy text-white p-6 md:p-8 rounded-2xl border border-slate-800 shadow-lg relative overflow-hidden">
        <div className="absolute right-0 top-0 bottom-0 w-1/3 bg-blue-500/5 blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="max-w-2xl">
            <div className="flex items-center space-x-2">
              <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-500/20 text-blue-300 border border-blue-400/30">
                Sales Desk &bull; Live Rate Sharing
              </span>
              <span className="text-xs text-slate-400">November 2026</span>
            </div>
            <h2 className="text-2xl md:text-3xl font-extrabold tracking-tight mt-3">
              WINDOW COMPANIES CRM
            </h2>
            <p className="text-sm md:text-base text-slate-300 mt-2 leading-relaxed">
              Fast, on-the-go hotel rate distribution for sales representatives visiting Travel Agencies. Search existing agency contacts or add new ones on the spot and prepare quotes in seconds.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            <Link
              to="/share-rates"
              className="inline-flex items-center justify-center space-x-2.5 px-6 py-3.5 rounded-xl bg-blue-600 text-white font-bold text-sm hover:bg-blue-500 transition-all shadow-md shadow-blue-600/30 group"
            >
              <Send className="w-4 h-4 transition-transform group-hover:translate-x-0.5" />
              <span>Send Hotel Rates</span>
              <ArrowRight className="w-4 h-4 opacity-75" />
            </Link>
            <Link
              to="/rates"
              className="inline-flex items-center justify-center space-x-2 px-4 py-3.5 rounded-xl bg-slate-800/80 text-slate-200 text-sm font-semibold hover:bg-slate-700 transition-colors border border-slate-700"
            >
              <Percent className="w-4 h-4 text-slate-400" />
              <span>Rate Hub</span>
            </Link>
          </div>
        </div>
      </div>

      {/* Prominent Quick-Action Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Link
          to="/share-rates"
          className="bg-white p-5 rounded-xl border-2 border-blue-100 hover:border-blue-400 shadow-sm transition-all flex items-start space-x-4 group"
        >
          <div className="p-3 bg-blue-50 text-blue-600 rounded-xl group-hover:bg-blue-600 group-hover:text-white transition-colors">
            <Send className="w-6 h-6" />
          </div>
          <div className="flex-1">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-slate-900 group-hover:text-blue-600 transition-colors">
                Send Hotel Rates to Agency Contact
              </h3>
              <span className="text-[10px] font-bold uppercase tracking-wider bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full">
                Primary Flow
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-1 leading-normal">
              Select existing agency contacts or quickly add new ones during on-site visits, choose rate tiers (Red/Green/Yellow or Custom 1-3), review special conditions, and dispatch rate proposals.
            </p>
          </div>
        </Link>

        <Link
          to="/agencies"
          className="bg-white p-5 rounded-xl border border-crm-border hover:border-slate-400 shadow-sm transition-all flex items-start space-x-4 group"
        >
          <div className="p-3 bg-slate-100 text-slate-700 rounded-xl group-hover:bg-slate-800 group-hover:text-white transition-colors">
            <UserPlus className="w-6 h-6" />
          </div>
          <div className="flex-1">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-slate-900 group-hover:text-slate-700 transition-colors">
                Manage Agency Contacts Directory
              </h3>
              <span className="text-[10px] font-bold uppercase tracking-wider bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full">
                Directory
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-1 leading-normal">
              Browse ~1,000 agency contacts structured under Agency &rarr; Market &rarr; Member hierarchies with direct WhatsApp, phone, email, and designation records.
            </p>
          </div>
        </Link>
      </div>

      {/* Metrics Shell */}
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
            Security requirements enforced across the CRM:
          </p>
          <ul className="space-y-2 text-xs text-slate-600">
            <li className="flex items-start space-x-2">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mt-1.5 flex-shrink-0" />
              <span>Zero-trust: Client inputs validated before persisting to Supabase.</span>
            </li>
            <li className="flex items-start space-x-2">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mt-1.5 flex-shrink-0" />
              <span>Default-deny: Row Level Security restricts staff vs admin operations.</span>
            </li>
            <li className="flex items-start space-x-2">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mt-1.5 flex-shrink-0" />
              <span>Immutable Quotes: Sent quotes preserve historical rate snapshots.</span>
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
