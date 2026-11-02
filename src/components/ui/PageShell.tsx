import React from 'react';
import { LucideIcon, Lock, ShieldAlert } from 'lucide-react';

interface PageShellProps {
  title: string;
  badge?: string;
  description: string;
  icon: LucideIcon;
  plannedFeatures: string[];
  securityControls: string[];
  handoverSectionRef?: string;
}

export const PageShell: React.FC<PageShellProps> = ({
  title,
  badge,
  description,
  icon: Icon,
  plannedFeatures,
  securityControls,
  handoverSectionRef,
}) => {
  return (
    <div className="space-y-6">
      {/* Header bar */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 bg-white p-6 rounded-xl border border-crm-border shadow-sm">
        <div className="flex items-start space-x-4">
          <div className="p-3 rounded-xl bg-crm-navy/5 text-crm-blue border border-crm-blue/20">
            <Icon className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center space-x-2.5">
              <h2 className="text-xl font-bold text-slate-900 tracking-tight">{title}</h2>
              {badge && (
                <span className="px-2.5 py-0.5 text-xs font-semibold rounded-full bg-crm-blue/10 text-crm-blue">
                  {badge}
                </span>
              )}
              <span className="px-2 py-0.5 text-[11px] font-medium rounded bg-slate-100 text-slate-600 border border-slate-200">
                UI Shell
              </span>
            </div>
            <p className="mt-1 text-sm text-slate-500">{description}</p>
          </div>
        </div>

        {handoverSectionRef && (
          <div className="text-right text-xs text-slate-400">
            <span className="font-medium text-slate-600">Requirement Ref:</span> {handoverSectionRef}
          </div>
        )}
      </div>

      {/* Grid of Planned Specifications & Security Controls */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Planned Features */}
        <div className="bg-white p-6 rounded-xl border border-crm-border shadow-sm">
          <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-700 mb-4 flex items-center space-x-2">
            <span>Planned Functional Architecture</span>
          </h3>
          <ul className="space-y-2.5">
            {plannedFeatures.map((feat, idx) => (
              <li key={idx} className="flex items-start space-x-2.5 text-sm text-slate-600">
                <span className="w-1.5 h-1.5 rounded-full bg-crm-blue mt-2 flex-shrink-0" />
                <span>{feat}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Security Controls & Boundaries */}
        <div className="bg-white p-6 rounded-xl border border-crm-border shadow-sm">
          <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-700 mb-4 flex items-center space-x-2">
            <Lock className="w-4 h-4 text-emerald-600" />
            <span>Planned Security Controls & RLS Boundaries</span>
          </h3>
          <ul className="space-y-2.5">
            {securityControls.map((sec, idx) => (
              <li key={idx} className="flex items-start space-x-2.5 text-sm text-slate-600">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mt-2 flex-shrink-0" />
                <span>{sec}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Safety Notice Card */}
      <div className="p-4 rounded-xl bg-slate-50 border border-dashed border-slate-300 flex items-start space-x-3 text-xs text-slate-600">
        <ShieldAlert className="w-4 h-4 text-slate-400 mt-0.5 flex-shrink-0" />
        <div className="leading-relaxed">
          <span className="font-semibold text-slate-700">Strict Safety Enforcement:</span> Live CRUD actions, client-side queries, and mock databases are withheld in this foundation phase. Only verified structures and UI shells are presented to protect confidential company rate rules.
        </div>
      </div>
    </div>
  );
};
