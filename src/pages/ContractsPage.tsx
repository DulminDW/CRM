import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  FileText,
  Plus,
  Search,
  Building,
  Calendar,
  CheckCircle2,
  AlertTriangle,
  AlertCircle,
  Clock,
  Eye,
  FileCheck,
  Lock,
  History,
  X,
  FileDown,
  Upload,
  ExternalLink,
  Loader2
} from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import {
  contractService,
  HotelContract,
  ConditionCategory
} from '../services/contractService';
import { rateService } from '../services/rateService';
import { HotelRecord, HotelSeasonRecord } from '../types/hotelHierarchy';

export const ContractsPage: React.FC = () => {
  const { user, hasPermission } = useAuth();
  const canManageRates = hasPermission('CAN_MANAGE_RATES');

  // Master Data State
  const [contracts, setContracts] = useState<HotelContract[]>([]);
  const [hotels, setHotels] = useState<HotelRecord[]>([]);
  const [seasons, setSeasons] = useState<HotelSeasonRecord[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  // Filters & Search
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [hotelFilter, setHotelFilter] = useState<string>('ALL');

  // Active Viewing Contract (Details Drawer/Modal)
  const [selectedContract, setSelectedContract] = useState<HotelContract | null>(null);
  const [detailsTab, setDetailsTab] = useState<'OVERVIEW' | 'CONDITIONS' | 'VERSIONS' | 'DOCUMENTS' | 'NOTES'>('OVERVIEW');

  // Create Contract Modal State
  const [createModalOpen, setCreateModalOpen] = useState<boolean>(false);
  const [formHotelId, setFormHotelId] = useState<string>('');
  const [formSeasonIds, setFormSeasonIds] = useState<string[]>([]);
  const [formReference, setFormReference] = useState<string>('');
  const [formName, setFormName] = useState<string>('');
  const [formValidFrom, setFormValidFrom] = useState<string>('');
  const [formValidTo, setFormValidTo] = useState<string>('');
  const [formCurrency, setFormCurrency] = useState<string>('USD');
  const [formTerms, setFormTerms] = useState<string>('');
  const [formInternalNotes, setFormInternalNotes] = useState<string>('');
  const [formConditions, setFormConditions] = useState<Array<{
    condition_title: string;
    condition_description: string;
    condition_category: ConditionCategory;
    is_mandatory: boolean;
    is_internal_only: boolean;
    display_order: number;
  }>>([]);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Version bump modal
  const [versionModalOpen, setVersionModalOpen] = useState<boolean>(false);
  const [versionLabel, setVersionLabel] = useState<string>('');
  const [versionSummary, setVersionSummary] = useState<string>('');

  // Document Upload State
  const [uploadingFile, setUploadingFile] = useState<boolean>(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadSuccess, setUploadSuccess] = useState<string | null>(null);

  // Notifications
  const [bannerMsg, setBannerMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Initial Load
  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const [contractList, hotelList] = await Promise.all([
        contractService.getContracts(),
        rateService.getHotels()
      ]);
      setContracts(contractList);
      setHotels(hotelList);
      if (hotelList.length > 0 && hotelList[0]) {
        setFormHotelId(hotelList[0].id);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Load seasons when selected hotel in form changes
  useEffect(() => {
    if (!formHotelId) {
      setSeasons([]);
      return;
    }
    rateService.getSeasonsForHotel(formHotelId).then((data) => {
      setSeasons(data);
      if (data.length > 0 && data[0]) {
        setFormSeasonIds([data[0].id]);
      } else {
        setFormSeasonIds([]);
      }
    });
  }, [formHotelId]);

  // Filtered List
  const filteredContracts = useMemo(() => {
    return contracts.filter((c) => {
      // Hotel filter
      if (hotelFilter !== 'ALL' && c.hotel_id !== hotelFilter) {
        return false;
      }
      // Status filter
      if (statusFilter !== 'ALL' && c.status !== statusFilter) {
        return false;
      }
      // Search
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const mRef = c.contract_reference.toLowerCase().includes(q);
        const mName = c.contract_name.toLowerCase().includes(q);
        const mHotel = (c.hotel_name || '').toLowerCase().includes(q);
        if (!mRef && !mName && !mHotel) return false;
      }
      return true;
    });
  }, [contracts, hotelFilter, statusFilter, searchQuery]);

  // Add default conditions helper
  const handleAddDefaultConditions = () => {
    setFormConditions([
      {
        condition_title: 'Standard Check-In & Check-Out',
        condition_description: 'Check-in time is 14:00, check-out time is 11:00. Guaranteed early check-in incurs full day charge.',
        condition_category: 'CHECK_IN_OUT',
        is_mandatory: true,
        is_internal_only: false,
        display_order: 1
      },
      {
        condition_title: 'Standard Cancellation Window',
        condition_description: 'Cancellations within 14 days of arrival incur 100% cancellation penalty during peak seasons.',
        condition_category: 'CANCELLATION',
        is_mandatory: true,
        is_internal_only: false,
        display_order: 2
      },
      {
        condition_title: 'Driver & Guide Policy',
        condition_description: 'Bus driver accommodation FOC with food. Guide room USD 40 net per night on HB basis.',
        condition_category: 'GENERAL',
        is_mandatory: false,
        is_internal_only: false,
        display_order: 3
      }
    ]);
  };

  // Submit New Contract Form
  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    if (!formReference.trim() || !formName.trim() || !formValidFrom || !formValidTo) {
      setFormError('Please fill in all required fields (Reference, Name, Start and End Dates).');
      return;
    }
    if (new Date(formValidTo) < new Date(formValidFrom)) {
      setFormError('Contract End Date must be on or after Start Date.');
      return;
    }

    try {
      setIsSubmitting(true);
      setFormError(null);
      const selHotel = hotels.find((h) => h.id === formHotelId);
      const selSeason = seasons.find((s) => formSeasonIds.includes(s.id));

      const created = await contractService.createContract(
        {
          hotel_id: formHotelId,
          season_id: formSeasonIds[0] || null,
          associated_season_ids: formSeasonIds,
          contract_reference: formReference,
          contract_name: formName,
          valid_from: formValidFrom,
          valid_to: formValidTo,
          currency: formCurrency,
          terms_and_conditions: formTerms,
          internal_notes: formInternalNotes,
          conditions: formConditions,
          status: 'ACTIVE'
        },
        user.id,
        user.email,
        selHotel?.hotel_name,
        selSeason?.season_label
      );

      setContracts((prev) => [created, ...prev]);
      setCreateModalOpen(false);
      setBannerMsg({ type: 'success', text: `Contract "${created.contract_name}" registered successfully.` });
      // Reset form
      setFormReference('');
      setFormName('');
      setFormTerms('');
      setFormInternalNotes('');
      setFormConditions([]);
    } catch (err: unknown) {
      setFormError(err instanceof Error ? err.message : 'Failed to register contract.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle Version Publish
  const handlePublishVersion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !selectedContract) return;

    try {
      const updated = await contractService.createNewVersion(
        selectedContract.id,
        versionLabel,
        versionSummary,
        user.id,
        user.email
      );

      setSelectedContract(updated);
      setContracts((prev) => prev.map((c) => (c.id === updated.id ? updated : c)));
      setVersionModalOpen(false);
      setVersionLabel('');
      setVersionSummary('');
      setBannerMsg({ type: 'success', text: `Published new version v${updated.version_number} for ${updated.contract_name}.` });
    } catch (err: unknown) {
      setBannerMsg({ type: 'error', text: err instanceof Error ? err.message : 'Failed to publish version.' });
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-[#EAF2FF] text-[#1455D9] rounded-2xl shadow-xs">
            <FileText className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold text-[#101828]">Master Hotel Contracts</h1>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                Phase 8 Production
              </span>
            </div>
            <p className="text-sm text-[#667085]">
              Master legal agreements, season associations, version history, and client-safe condition policies.
            </p>
          </div>
        </div>

        {canManageRates && (
          <button
            onClick={() => {
              setCreateModalOpen(true);
              handleAddDefaultConditions();
            }}
            className="h-11 px-5 rounded-xl bg-[#1455D9] hover:bg-blue-700 text-xs font-bold text-white flex items-center justify-center gap-2 shadow-xs transition-colors self-start sm:self-auto touch-manipulation min-h-[44px]"
          >
            <Plus className="w-4 h-4" /> Register New Contract
          </button>
        )}
      </div>

      {/* Alert Banner */}
      {bannerMsg && (
        <div
          className={`p-4 rounded-xl flex items-center justify-between text-xs font-medium border ${
            bannerMsg.type === 'success'
              ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
              : 'bg-rose-50 text-rose-800 border-rose-200'
          }`}
        >
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{bannerMsg.text}</span>
          </div>
          <button onClick={() => setBannerMsg(null)} className="font-bold underline ml-4">
            Dismiss
          </button>
        </div>
      )}

      {/* Filter & Search Bar */}
      <div className="bg-white rounded-2xl border border-[#D9E0EA] p-4 sm:p-5 shadow-xs grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* Search */}
        <div className="relative">
          <label className="block text-xs font-semibold text-[#344054] mb-1">Search Contracts</label>
          <div className="relative">
            <Search className="w-4 h-4 text-[#667085] absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Ref code, hotel, contract name..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full h-11 pl-9 pr-3 rounded-xl border border-[#D9E0EA] text-xs font-medium focus:outline-none focus:ring-2 focus:ring-[#1455D9]"
            />
          </div>
        </div>

        {/* Hotel Filter */}
        <div>
          <label className="block text-xs font-semibold text-[#344054] mb-1">Filter by Property</label>
          <select
            value={hotelFilter}
            onChange={(e) => setHotelFilter(e.target.value)}
            className="w-full h-11 px-3 rounded-xl border border-[#D9E0EA] text-xs font-medium bg-white focus:outline-none focus:ring-2 focus:ring-[#1455D9]"
          >
            <option value="ALL">All Partner Hotels</option>
            {hotels.map((h) => (
              <option key={h.id} value={h.id}>
                {h.hotel_name}
              </option>
            ))}
          </select>
        </div>

        {/* Status Filter */}
        <div>
          <label className="block text-xs font-semibold text-[#344054] mb-1">Status</label>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="w-full h-11 px-3 rounded-xl border border-[#D9E0EA] text-xs font-medium bg-white focus:outline-none focus:ring-2 focus:ring-[#1455D9]"
          >
            <option value="ALL">All Statuses</option>
            <option value="ACTIVE">ACTIVE</option>
            <option value="DRAFT">DRAFT</option>
            <option value="EXPIRED">EXPIRED</option>
            <option value="TERMINATED">TERMINATED</option>
          </select>
        </div>

        {/* Stats Count */}
        <div className="flex items-center justify-between sm:justify-end gap-3 self-end py-1">
          <div className="text-right">
            <span className="text-[11px] text-[#667085] block">Showing Results</span>
            <span className="text-sm font-bold text-[#101828]">
              {filteredContracts.length} of {contracts.length} Contracts
            </span>
          </div>
        </div>
      </div>

      {/* Contracts Data Table & Mobile Cards */}
      <div className="bg-white rounded-2xl border border-[#D9E0EA] shadow-xs overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-xs text-[#667085]">
            <Clock className="w-6 h-6 text-[#1455D9] animate-spin mx-auto mb-2" />
            Loading partner hotel contracts...
          </div>
        ) : filteredContracts.length === 0 ? (
          <div className="p-12 text-center text-xs text-[#667085] space-y-2">
            <FileText className="w-10 h-10 text-slate-300 mx-auto" />
            <h3 className="text-sm font-bold text-[#101828]">No Contracts Found</h3>
            <p className="max-w-md mx-auto text-slate-500">
              No hotel contracts match your active filter criteria. Click "Register New Contract" above to record a master agreement.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-[#F8FAFC] border-b border-[#D9E0EA]">
                  <th className="py-3 px-4 text-xs font-bold text-[#344054] uppercase tracking-wider">
                    Contract & Reference
                  </th>
                  <th className="py-3 px-4 text-xs font-bold text-[#344054] uppercase tracking-wider">
                    Property (Hotel)
                  </th>
                  <th className="py-3 px-4 text-xs font-bold text-[#344054] uppercase tracking-wider">
                    Validity Window
                  </th>
                  <th className="py-3 px-4 text-xs font-bold text-center text-[#344054] uppercase tracking-wider">
                    Version
                  </th>
                  <th className="py-3 px-4 text-xs font-bold text-center text-[#344054] uppercase tracking-wider">
                    Status
                  </th>
                  <th className="py-3 px-4 text-xs font-bold text-right text-[#344054] uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#EAECF0] text-xs">
                {filteredContracts.map((c) => {
                  const isExpired = contractService.isContractExpired(c.valid_to);
                  return (
                    <tr
                      key={c.id}
                      onClick={() => setSelectedContract(c)}
                      className="hover:bg-slate-50/70 transition-colors cursor-pointer group"
                    >
                      <td className="py-3.5 px-4 font-semibold text-[#101828]">
                        <div className="flex items-center gap-2">
                          <FileText className="w-4 h-4 text-[#1455D9] shrink-0" />
                          <div>
                            <span className="font-bold block text-sm">{c.contract_name}</span>
                            <span className="text-[11px] font-mono text-[#667085]">{c.contract_reference}</span>
                          </div>
                        </div>
                      </td>

                      <td className="py-3.5 px-4 text-[#344054]">
                        <div className="flex items-center gap-1.5">
                          <Building className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          <span className="font-medium text-xs">{c.hotel_name}</span>
                        </div>
                        <span className="text-[10px] text-slate-400 block mt-0.5">
                          {c.season_label || 'All Seasons'}
                        </span>
                      </td>

                      <td className="py-3.5 px-4 text-[#475467]">
                        <div className="flex items-center gap-1.5 font-mono text-[11px]">
                          <Calendar className="w-3.5 h-3.5 text-slate-400" />
                          <span>{c.valid_from} &rarr; {c.valid_to}</span>
                        </div>
                        {isExpired && c.status === 'ACTIVE' && (
                          <span className="text-[10px] text-rose-600 font-bold flex items-center gap-1 mt-0.5">
                            <AlertTriangle className="w-2.5 h-2.5" /> Date Passed
                          </span>
                        )}
                      </td>

                      <td className="py-3.5 px-4 text-center">
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-mono font-bold bg-blue-50 text-[#1455D9] border border-blue-200">
                          v{c.version_number}.0
                        </span>
                      </td>

                      <td className="py-3.5 px-4 text-center">
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${
                            c.status === 'ACTIVE'
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-300'
                              : c.status === 'DRAFT'
                              ? 'bg-amber-50 text-amber-700 border-amber-300'
                              : 'bg-slate-100 text-slate-600 border-slate-300'
                          }`}
                        >
                          {c.status}
                        </span>
                      </td>

                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedContract(c);
                            }}
                            className="p-1.5 rounded-lg border border-[#D9E0EA] bg-white text-[#667085] hover:text-[#101828] hover:bg-slate-50 transition-colors"
                            title="Inspect Contract Details"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Contract Details Drawer Modal */}
      {selectedContract && (
        <div className="fixed inset-0 z-50 flex items-center justify-end bg-black/40 backdrop-blur-xs p-0 sm:p-4 animate-fade-in">
          <div className="bg-white w-full max-w-2xl h-full sm:h-auto sm:max-h-[90vh] sm:rounded-2xl border border-slate-200 shadow-2xl flex flex-col overflow-hidden">
            {/* Header */}
            <div className="p-4 sm:p-5 bg-slate-50 border-b border-[#D9E0EA] flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-[#EAF2FF] text-[#1455D9] rounded-xl">
                  <FileText className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-base text-[#101828]">{selectedContract.contract_name}</h3>
                  <div className="flex items-center gap-2 text-xs text-[#667085] mt-0.5">
                    <span className="font-mono">{selectedContract.contract_reference}</span>
                    <span>&bull;</span>
                    <span>{selectedContract.hotel_name}</span>
                    <span className="px-1.5 py-0.2 rounded text-[10px] font-mono font-bold bg-blue-100 text-blue-700">
                      v{selectedContract.version_number}.0
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {canManageRates && (
                  <button
                    onClick={() => setVersionModalOpen(true)}
                    className="h-9 px-3 rounded-xl bg-white border border-[#D9E0EA] hover:bg-slate-50 text-xs font-bold text-[#101828] flex items-center gap-1.5 shadow-2xs"
                  >
                    <History className="w-3.5 h-3.5 text-[#1455D9]" /> New Version
                  </button>
                )}
                <button
                  onClick={() => setSelectedContract(null)}
                  className="p-2 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-200/60"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Tabs Navigation */}
            <div className="flex border-b border-[#D9E0EA] px-5 gap-4 text-xs font-semibold overflow-x-auto">
              {(['OVERVIEW', 'CONDITIONS', 'VERSIONS', 'DOCUMENTS', 'NOTES'] as const).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setDetailsTab(tab)}
                  className={`py-3 border-b-2 transition-colors whitespace-nowrap ${
                    detailsTab === tab
                      ? 'border-[#1455D9] text-[#1455D9] font-bold'
                      : 'border-transparent text-[#667085] hover:text-[#101828]'
                  }`}
                >
                  {tab}
                </button>
              ))}
            </div>

            {/* Tab Contents */}
            <div className="p-5 overflow-y-auto flex-1 space-y-4 text-xs">
              {detailsTab === 'OVERVIEW' && (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-3 p-4 bg-slate-50 rounded-xl border border-slate-200">
                    <div>
                      <span className="text-[#667085] block mb-1">Contract Validity Window:</span>
                      <strong className="text-slate-900 font-mono">
                        {selectedContract.valid_from} &rarr; {selectedContract.valid_to}
                      </strong>
                    </div>
                    <div>
                      <span className="text-[#667085] block mb-1">Commercial Currency:</span>
                      <strong className="text-slate-900">{selectedContract.currency}</strong>
                    </div>
                    <div>
                      <span className="text-[#667085] block mb-1">Master Hotel Property:</span>
                      <strong className="text-slate-900">{selectedContract.hotel_name}</strong>
                    </div>
                    <div>
                      <span className="text-[#667085] block mb-1">Current Lifecycle Status:</span>
                      <strong className="text-emerald-700">{selectedContract.status}</strong>
                    </div>
                  </div>

                  <div>
                    <h4 className="font-bold text-slate-900 mb-1.5 uppercase tracking-wider text-[11px]">
                      General Terms & Master Conditions
                    </h4>
                    <div className="p-3 bg-white rounded-xl border border-slate-200 text-[#344054] leading-relaxed whitespace-pre-wrap">
                      {selectedContract.terms_and_conditions || 'No custom terms recorded for this agreement.'}
                    </div>
                  </div>
                </div>
              )}

              {detailsTab === 'CONDITIONS' && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between pb-2 border-b">
                    <h4 className="font-bold text-slate-900">Configured Contract Policies</h4>
                    <span className="text-[10px] text-slate-500">
                      {(selectedContract.conditions || []).length} Policies Configured
                    </span>
                  </div>

                  {(selectedContract.conditions || []).length === 0 ? (
                    <div className="p-6 text-center text-slate-400">
                      No structured conditions recorded. Add policies during contract revision.
                    </div>
                  ) : (
                    (selectedContract.conditions || []).map((cond, i) => (
                      <div
                        key={cond.id || i}
                        className={`p-3.5 rounded-xl border space-y-1 ${
                          cond.is_internal_only
                            ? 'bg-rose-50/50 border-rose-200'
                            : 'bg-white border-slate-200'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-slate-900">{cond.condition_title}</span>
                          <div className="flex items-center gap-1.5">
                            {cond.is_internal_only ? (
                              <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-rose-100 text-rose-700">
                                INTERNAL ONLY
                              </span>
                            ) : (
                              <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-700">
                                EXTERNALLY SHAREABLE
                              </span>
                            )}
                            {cond.is_mandatory && (
                              <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800">
                                MANDATORY
                              </span>
                            )}
                          </div>
                        </div>
                        <p className="text-slate-600 leading-normal">{cond.condition_description}</p>
                      </div>
                    ))
                  )}
                </div>
              )}

              {detailsTab === 'VERSIONS' && (
                <div className="space-y-3">
                  <h4 className="font-bold text-slate-900">Immutable Contract Versions</h4>
                  <div className="space-y-2">
                    {(selectedContract.versions || []).map((v) => (
                      <div key={v.id} className="p-3 bg-white rounded-xl border border-slate-200 space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-slate-900">{v.version_label}</span>
                          <span className="text-[10px] text-slate-500 font-mono">
                            {new Date(v.created_at).toLocaleDateString()}
                          </span>
                        </div>
                        <p className="text-slate-600 text-[11px]">{v.change_summary || 'Standard terms revision.'}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {detailsTab === 'DOCUMENTS' && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between pb-2 border-b">
                    <div>
                      <h4 className="font-bold text-slate-900">Original Document Attachments</h4>
                      <p className="text-[11px] text-slate-500">
                        Private storage vault (PDF, Word, Excel &bull; Max 25MB)
                      </p>
                    </div>
                    {canManageRates && (
                      <label className={`cursor-pointer inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-[#1455D9] text-white hover:bg-blue-700 transition-colors shadow-xs ${
                        uploadingFile ? 'opacity-60 pointer-events-none' : ''
                      }`}>
                        {uploadingFile ? (
                          <>
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            <span>Uploading...</span>
                          </>
                        ) : (
                          <>
                            <Upload className="w-3.5 h-3.5" />
                            <span>Upload File</span>
                          </>
                        )}
                        <input
                          type="file"
                          className="hidden"
                          accept=".pdf,.doc,.docx,.xls,.xlsx"
                          disabled={uploadingFile}
                          onChange={async (e) => {
                            const file = e.target.files?.[0];
                            if (!file || !selectedContract || !user) return;
                            e.target.value = ''; // Reset input
                            setUploadError(null);
                            setUploadSuccess(null);

                            const validation = contractService.validateContractFile(file);
                            if (!validation.valid) {
                              setUploadError(validation.error || 'Invalid file');
                              return;
                            }

                            try {
                              setUploadingFile(true);
                              const newDoc = await contractService.uploadContractFile(
                                selectedContract.id,
                                file,
                                user.id,
                                user.email || 'Authorized Staff'
                              );

                              // Update active contract state
                              const updatedDocs = [newDoc, ...(selectedContract.documents || [])];
                              setSelectedContract({
                                ...selectedContract,
                                documents: updatedDocs
                              });

                              // Update contracts list
                              setContracts((prev) =>
                                prev.map((c) =>
                                  c.id === selectedContract.id
                                    ? { ...c, documents: updatedDocs }
                                    : c
                                )
                              );

                              setUploadSuccess(`Successfully uploaded "${file.name}" to private vault.`);
                            } catch (err: unknown) {
                              setUploadError(err instanceof Error ? err.message : 'File upload failed');
                            } finally {
                              setUploadingFile(false);
                            }
                          }}
                        />
                      </label>
                    )}
                  </div>

                  {uploadError && (
                    <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2">
                        <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
                        <span>{uploadError}</span>
                      </div>
                      <button onClick={() => setUploadError(null)} className="text-[10px] font-bold underline">
                        Dismiss
                      </button>
                    </div>
                  )}

                  {uploadSuccess && (
                    <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
                        <span>{uploadSuccess}</span>
                      </div>
                      <button onClick={() => setUploadSuccess(null)} className="text-[10px] font-bold underline">
                        Dismiss
                      </button>
                    </div>
                  )}

                  {(selectedContract.documents || []).length === 0 ? (
                    <div className="p-8 text-center text-slate-400 bg-slate-50 rounded-xl border border-dashed border-slate-300">
                      <FileDown className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                      <p>No documents uploaded yet for this contract.</p>
                      <p className="text-[11px] text-slate-400 mt-1">
                        Use the "Upload File" button to attach signed partner PDFs or rate sheets.
                      </p>
                    </div>
                  ) : (
                    (selectedContract.documents || []).map((doc) => (
                      <div
                        key={doc.id}
                        className="p-3 bg-white rounded-xl border border-slate-200 flex items-center justify-between hover:border-slate-300 transition-colors"
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className="p-2 rounded-lg bg-blue-50 text-[#1455D9] shrink-0">
                            <FileText className="w-4 h-4" />
                          </div>
                          <div className="min-w-0">
                            <span className="font-bold text-slate-900 block truncate text-xs">
                              {doc.file_name}
                            </span>
                            <div className="flex items-center gap-2 text-[10px] text-slate-400">
                              <span>{(doc.file_size_bytes / 1024).toFixed(1)} KB</span>
                              <span>&bull;</span>
                              <span className="font-mono text-[#1455D9]">Version v{doc.version_number}.0</span>
                              <span>&bull;</span>
                              <span>{new Date(doc.created_at).toLocaleDateString()}</span>
                            </div>
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={async () => {
                            try {
                              const url = await contractService.getSecureDocumentUrl(doc.storage_path);
                              if (url.startsWith('#')) {
                                setUploadSuccess(`Document verified in local vault: ${doc.file_name}`);
                              } else {
                                window.open(url, '_blank', 'noopener,noreferrer');
                              }
                            } catch (err: unknown) {
                              setUploadError(err instanceof Error ? err.message : 'Failed to retrieve document URL');
                            }
                          }}
                          className="px-2.5 py-1.5 rounded-lg border border-[#D9E0EA] bg-slate-50 hover:bg-slate-100 text-slate-700 text-[11px] font-semibold flex items-center gap-1 shrink-0 ml-2"
                        >
                          <ExternalLink className="w-3 h-3 text-slate-500" />
                          <span>View / Download</span>
                        </button>
                      </div>
                    ))
                  )}
                </div>
              )}

              {detailsTab === 'NOTES' && (
                <div className="space-y-3">
                  <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 flex items-start gap-2">
                    <Lock className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
                    <p className="text-[11px] text-amber-800 leading-normal">
                      <strong>Confidentiality Notice:</strong> Internal notes are strictly for CRM staff reference and are never included in travel agency quotes or outward rate sharing emails.
                    </p>
                  </div>

                  <div className="p-4 bg-white rounded-xl border border-slate-200 text-slate-700 whitespace-pre-wrap leading-relaxed">
                    {selectedContract.internal_notes || 'No internal notes registered for this contract.'}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Register New Contract Modal */}
      {createModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4 animate-fade-in">
          <div className="bg-white w-full max-w-xl max-h-[90vh] rounded-2xl border border-slate-200 shadow-2xl flex flex-col overflow-hidden">
            <div className="p-4 sm:p-5 bg-slate-50 border-b border-[#D9E0EA] flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileCheck className="w-5 h-5 text-[#1455D9]" />
                <h3 className="font-bold text-base text-[#101828]">Register Master Hotel Contract</h3>
              </div>
              <button
                onClick={() => setCreateModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateSubmit} className="p-5 overflow-y-auto flex-1 space-y-4 text-xs">
              {formError && (
                <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{formError}</span>
                </div>
              )}

              {/* Property & Reference */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-[#344054] mb-1">
                    Partner Hotel <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={formHotelId}
                    onChange={(e) => setFormHotelId(e.target.value)}
                    className="w-full h-10 px-3 rounded-xl border border-[#D9E0EA] text-xs font-medium bg-white focus:ring-2 focus:ring-[#1455D9]"
                  >
                    {hotels.map((h) => (
                      <option key={h.id} value={h.id}>
                        {h.hotel_name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#344054] mb-1">
                    Contract Reference <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. CTR-MR-2026-SUM"
                    value={formReference}
                    onChange={(e) => setFormReference(e.target.value)}
                    className="w-full h-10 px-3 rounded-xl border border-[#D9E0EA] text-xs font-medium focus:ring-2 focus:ring-[#1455D9]"
                  />
                </div>
              </div>

              {/* Contract Name & Currency */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-[#344054] mb-1">
                    Contract Name / Title <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Mount Randholee Summer 2026 Agreement"
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    className="w-full h-10 px-3 rounded-xl border border-[#D9E0EA] text-xs font-medium focus:ring-2 focus:ring-[#1455D9]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#344054] mb-1">Currency</label>
                  <input
                    type="text"
                    maxLength={3}
                    value={formCurrency}
                    onChange={(e) => setFormCurrency(e.target.value.toUpperCase())}
                    className="w-full h-10 px-3 rounded-xl border border-[#D9E0EA] text-xs font-bold font-mono text-center focus:ring-2 focus:ring-[#1455D9]"
                  />
                </div>
              </div>

              {/* Dates */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-[#344054] mb-1">
                    Valid From Date <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="date"
                    required
                    value={formValidFrom}
                    onChange={(e) => setFormValidFrom(e.target.value)}
                    className="w-full h-10 px-3 rounded-xl border border-[#D9E0EA] text-xs font-medium bg-white focus:ring-2 focus:ring-[#1455D9]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#344054] mb-1">
                    Valid To Date <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="date"
                    required
                    value={formValidTo}
                    onChange={(e) => setFormValidTo(e.target.value)}
                    className="w-full h-10 px-3 rounded-xl border border-[#D9E0EA] text-xs font-medium bg-white focus:ring-2 focus:ring-[#1455D9]"
                  />
                </div>
              </div>

              {/* Terms and Conditions */}
              <div>
                <label className="block text-xs font-semibold text-[#344054] mb-1">
                  Master Terms & Conditions
                </label>
                <textarea
                  rows={3}
                  placeholder="Payment within 30 days, check-in 14:00, driver FOC..."
                  value={formTerms}
                  onChange={(e) => setFormTerms(e.target.value)}
                  className="w-full p-3 rounded-xl border border-[#D9E0EA] text-xs font-medium focus:ring-2 focus:ring-[#1455D9]"
                />
              </div>

              {/* Internal Notes */}
              <div>
                <label className="block text-xs font-semibold text-[#344054] mb-1">
                  Internal Notes (Confidential)
                </label>
                <textarea
                  rows={2}
                  placeholder="Confidential remarks, internal sales targets..."
                  value={formInternalNotes}
                  onChange={(e) => setFormInternalNotes(e.target.value)}
                  className="w-full p-3 rounded-xl border border-[#D9E0EA] text-xs font-medium focus:ring-2 focus:ring-[#1455D9]"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t">
                <button
                  type="button"
                  onClick={() => setCreateModalOpen(false)}
                  className="h-10 px-4 rounded-xl border border-[#D9E0EA] text-xs font-medium text-[#344054] hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="h-10 px-5 rounded-xl bg-[#1455D9] hover:bg-blue-700 text-xs font-bold text-white shadow-xs"
                >
                  {isSubmitting ? 'Registering...' : 'Register Contract'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Version Modal */}
      {versionModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4 animate-fade-in">
          <div className="bg-white w-full max-w-md rounded-2xl border border-slate-200 shadow-2xl p-5 space-y-4 text-xs">
            <h3 className="text-base font-bold text-slate-900">Publish New Contract Version</h3>
            <p className="text-slate-500">
              Creating a new version archives the current terms and guarantees historical quotes remain unchanged.
            </p>

            <form onSubmit={handlePublishVersion} className="space-y-3">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Version Label</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. v2.0 - Mid-Season Rate Amendment"
                  value={versionLabel}
                  onChange={(e) => setVersionLabel(e.target.value)}
                  className="w-full h-10 px-3 rounded-xl border border-[#D9E0EA]"
                />
              </div>
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Change Summary</label>
                <textarea
                  rows={2}
                  required
                  placeholder="Explain why terms were revised..."
                  value={versionSummary}
                  onChange={(e) => setVersionSummary(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-[#D9E0EA]"
                />
              </div>
              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setVersionModalOpen(false)}
                  className="h-9 px-3 rounded-lg border border-slate-200 text-slate-600"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="h-9 px-4 rounded-lg bg-[#1455D9] text-white font-bold"
                >
                  Confirm & Publish
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

