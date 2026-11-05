import React, { useState } from 'react';
import {
  Percent,
  FileText,
  Sparkles,
  Layers,
  History,
  Send,
  Lock,
  ArrowRight
} from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { ContractsView } from '../components/rates/ContractsView';
import { CustomTemplatesView } from '../components/rates/CustomTemplatesView';
import { QuoteHistoryView } from '../components/rates/QuoteHistoryView';
import { Link } from 'react-router-dom';

export const RateManagementPage: React.FC = () => {
  const { hasPermission } = useAuth();
  const canManageRates = hasPermission('CAN_MANAGE_RATES');

  const [activeTab, setActiveTab] = useState<'SHEETS' | 'CONTRACTS' | 'TEMPLATES' | 'HISTORY'>('SHEETS');

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-[#EAF2FF] text-[#1455D9] rounded-xl">
              <Percent className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-bold text-[#101828]">Rate Management Hub</h1>
                <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                  Phase 6 Operational
                </span>
                {!canManageRates && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-amber-50 text-amber-700 border border-amber-200">
                    <Lock className="w-3 h-3" /> View Only
                  </span>
                )}
              </div>
              <p className="text-sm text-[#667085]">
                Manage partner contracts, core pricing tiers, custom templates, and quote snapshots.
              </p>
            </div>
          </div>
        </div>

        <div>
          <Link
            to="/share-rates"
            className="h-11 px-5 rounded-xl bg-[#1455D9] hover:bg-blue-700 text-white text-xs font-bold flex items-center gap-2 shadow-xs transition-colors"
          >
            <Send className="w-4 h-4" /> Go to Rate Sharing Wizard <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>

      {/* Main Tabs Navigation */}
      <div className="flex border-b border-[#D9E0EA] gap-6 text-sm font-medium">
        <button
          onClick={() => setActiveTab('SHEETS')}
          className={`pb-3 border-b-2 flex items-center gap-2 transition-colors ${
            activeTab === 'SHEETS'
              ? 'border-[#1455D9] text-[#1455D9] font-bold'
              : 'border-transparent text-[#667085] hover:text-[#101828]'
          }`}
        >
          <Layers className="w-4 h-4" /> Core Rate Sheets
        </button>
        <button
          onClick={() => setActiveTab('CONTRACTS')}
          className={`pb-3 border-b-2 flex items-center gap-2 transition-colors ${
            activeTab === 'CONTRACTS'
              ? 'border-[#1455D9] text-[#1455D9] font-bold'
              : 'border-transparent text-[#667085] hover:text-[#101828]'
          }`}
        >
          <FileText className="w-4 h-4" /> Partner Contracts
        </button>
        <button
          onClick={() => setActiveTab('TEMPLATES')}
          className={`pb-3 border-b-2 flex items-center gap-2 transition-colors ${
            activeTab === 'TEMPLATES'
              ? 'border-[#1455D9] text-[#1455D9] font-bold'
              : 'border-transparent text-[#667085] hover:text-[#101828]'
          }`}
        >
          <Sparkles className="w-4 h-4" /> Custom Templates (1, 2, 3)
        </button>
        <button
          onClick={() => setActiveTab('HISTORY')}
          className={`pb-3 border-b-2 flex items-center gap-2 transition-colors ${
            activeTab === 'HISTORY'
              ? 'border-[#1455D9] text-[#1455D9] font-bold'
              : 'border-transparent text-[#667085] hover:text-[#101828]'
          }`}
        >
          <History className="w-4 h-4" /> Immutable Quote History
        </button>
      </div>

      {/* Tab 1: Core Rate Sheets Overview */}
      {activeTab === 'SHEETS' && (
        <div className="space-y-6">
          {/* Rate Category Indicators (Red / Green / Yellow) */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white rounded-2xl border border-red-200 p-4 shadow-xs flex items-center gap-3">
              <div className="w-4 h-12 rounded-full bg-red-500 flex-shrink-0" />
              <div>
                <div className="text-xs font-bold text-red-600 uppercase tracking-wider">Tier RED</div>
                <div className="text-sm font-bold text-[#101828]">LOWEST RATE</div>
                <p className="text-xs text-[#667085]">Special high-volume or promotional tier</p>
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-emerald-200 p-4 shadow-xs flex items-center gap-3">
              <div className="w-4 h-12 rounded-full bg-emerald-500 flex-shrink-0" />
              <div>
                <div className="text-xs font-bold text-emerald-600 uppercase tracking-wider">Tier GREEN</div>
                <div className="text-sm font-bold text-[#101828]">NORMAL RATE</div>
                <p className="text-xs text-[#667085]">Standard contract market rate</p>
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-amber-200 p-4 shadow-xs flex items-center gap-3">
              <div className="w-4 h-12 rounded-full bg-amber-500 flex-shrink-0" />
              <div>
                <div className="text-xs font-bold text-amber-600 uppercase tracking-wider">Tier YELLOW</div>
                <div className="text-sm font-bold text-[#101828]">HIGHEST RATE</div>
                <p className="text-xs text-[#667085]">Peak season / individual booking tier</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-[#D9E0EA] p-6 shadow-xs space-y-4">
            <h3 className="text-base font-semibold text-[#101828]">Rate Components & Formulas Status</h3>
            <p className="text-sm text-[#667085]">
              Core calculation components (HB Double Base, Single Reduction, Triple Supplement, BB Reduction) are registered in the system. Automated mathematical derivations remain marked as unconfirmed pending receipt of company contract Excel sheets.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 pt-2">
              <div className="p-4 rounded-xl border border-[#D9E0EA] bg-[#F8FAFC]">
                <div className="text-xs font-semibold text-[#667085] uppercase">Foundation Component</div>
                <div className="text-sm font-bold text-[#101828] mt-1">HB Double Base</div>
                <div className="mt-2 text-xs text-amber-600 font-medium">Pending Company Excel</div>
              </div>

              <div className="p-4 rounded-xl border border-[#D9E0EA] bg-[#F8FAFC]">
                <div className="text-xs font-semibold text-[#667085] uppercase">Reduction Component</div>
                <div className="text-sm font-bold text-[#101828] mt-1">Single Reduction</div>
                <div className="mt-2 text-xs text-amber-600 font-medium">Pending Company Excel</div>
              </div>

              <div className="p-4 rounded-xl border border-[#D9E0EA] bg-[#F8FAFC]">
                <div className="text-xs font-semibold text-[#667085] uppercase">Supplement Component</div>
                <div className="text-sm font-bold text-[#101828] mt-1">Triple Supplement</div>
                <div className="mt-2 text-xs text-amber-600 font-medium">Pending Company Excel</div>
              </div>

              <div className="p-4 rounded-xl border border-[#D9E0EA] bg-[#F8FAFC]">
                <div className="text-xs font-semibold text-[#667085] uppercase">Meal Plan Component</div>
                <div className="text-sm font-bold text-[#101828] mt-1">BB Reduction</div>
                <div className="mt-2 text-xs text-amber-600 font-medium">Pending Company Excel</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab 2: Partner Contracts */}
      {activeTab === 'CONTRACTS' && <ContractsView />}

      {/* Tab 3: Custom Templates */}
      {activeTab === 'TEMPLATES' && <CustomTemplatesView />}

      {/* Tab 4: Quote History */}
      {activeTab === 'HISTORY' && <QuoteHistoryView />}
    </div>
  );
};
