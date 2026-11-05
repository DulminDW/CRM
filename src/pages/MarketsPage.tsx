import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Globe2,
  Plus,
  Edit2,
  Trash2,
  Users2,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  X,
  ExternalLink,
} from 'lucide-react';
import { Link, useSearchParams } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { AgencyMarketRecord, TravelAgencyRecord } from '../types/agencyHierarchy';
import { fetchAgencies } from '../services/agencyService';
import {
  fetchMarkets,
  createMarket,
  updateMarket,
  deleteMarket,
  CreateMarketInput,
} from '../services/marketService';

export const MarketsPage: React.FC = () => {
  const { profile } = useAuth();
  const isAdmin = profile?.role === 'ADMIN';

  const [searchParams, setSearchParams] = useSearchParams();
  const agencyIdParam = searchParams.get('agencyId') || 'ALL';

  // State
  const [agencies, setAgencies] = useState<TravelAgencyRecord[]>([]);
  const [markets, setMarkets] = useState<AgencyMarketRecord[]>([]);
  const [selectedAgencyId, setSelectedAgencyId] = useState<string>(agencyIdParam);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [editingMarket, setEditingMarket] = useState<AgencyMarketRecord | null>(null);
  const [formAgencyId, setFormAgencyId] = useState<string>('');
  const [formMarketName, setFormMarketName] = useState<string>('');
  const [formDescription, setFormDescription] = useState<string>('');
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // Delete State
  const [deletingMarket, setDeletingMarket] = useState<AgencyMarketRecord | null>(null);
  const [isDeleting, setIsDeleting] = useState<boolean>(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  // Success Banner
  const [successBanner, setSuccessBanner] = useState<string | null>(null);

  // Synchronize URL query parameter with selected agency state
  useEffect(() => {
    if (agencyIdParam && agencyIdParam !== selectedAgencyId) {
      setSelectedAgencyId(agencyIdParam);
    }
  }, [agencyIdParam, selectedAgencyId]);

  // Load Agencies & Markets
  const loadData = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    const [agencyRes, marketRes] = await Promise.all([
      fetchAgencies(),
      fetchMarkets(selectedAgencyId !== 'ALL' ? selectedAgencyId : undefined),
    ]);

    if (agencyRes.error) {
      setError(agencyRes.error);
    } else {
      setAgencies(agencyRes.data);
    }

    if (marketRes.error) {
      setError(marketRes.error);
    } else {
      setMarkets(marketRes.data);
    }

    setIsLoading(false);
  }, [selectedAgencyId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Handle Agency Filter Change
  const handleAgencyChange = (agencyId: string) => {
    setSelectedAgencyId(agencyId);
    if (agencyId === 'ALL') {
      searchParams.delete('agencyId');
    } else {
      searchParams.set('agencyId', agencyId);
    }
    setSearchParams(searchParams);
  };

  // Selected Agency Object for Summary Banner
  const currentAgency = useMemo(() => {
    if (selectedAgencyId === 'ALL') return null;
    return agencies.find((a) => a.id === selectedAgencyId) || null;
  }, [agencies, selectedAgencyId]);

  // Total metrics
  const totalMarketCount = markets.length;
  const totalMemberCount = useMemo(() => {
    return markets.reduce((acc, m) => acc + (m.member_count || 0), 0);
  }, [markets]);

  // Modal Handlers
  const handleOpenCreateModal = () => {
    setEditingMarket(null);
    setFormAgencyId(selectedAgencyId !== 'ALL' ? selectedAgencyId : agencies[0]?.id || '');
    setFormMarketName('');
    setFormDescription('');
    setFormError(null);
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (market: AgencyMarketRecord) => {
    setEditingMarket(market);
    setFormAgencyId(market.agency_id);
    setFormMarketName(market.market_name);
    setFormDescription(market.description || '');
    setFormError(null);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingMarket(null);
    setFormError(null);
  };

  const handleSubmitForm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formAgencyId) {
      setFormError('Please select a parent Travel Agency');
      return;
    }
    if (formMarketName.trim().length < 2) {
      setFormError('Market name must be at least 2 characters');
      return;
    }

    setIsSubmitting(true);
    setFormError(null);

    if (editingMarket) {
      const { data, error: updateErr } = await updateMarket(editingMarket.id, {
        market_name: formMarketName,
        description: formDescription,
      });

      if (updateErr) {
        setFormError(updateErr);
        setIsSubmitting(false);
        return;
      }

      setMarkets((prev) =>
        prev.map((m) => (m.id === editingMarket.id ? { ...m, ...data! } : m))
      );
      setSuccessBanner(`Market "${formMarketName}" updated successfully`);
    } else {
      const input: CreateMarketInput = {
        agency_id: formAgencyId,
        market_name: formMarketName,
        description: formDescription,
      };

      const { data, error: createErr } = await createMarket(input);
      if (createErr) {
        setFormError(createErr);
        setIsSubmitting(false);
        return;
      }

      setMarkets((prev) => [data!, ...prev]);
      setSuccessBanner(`Market "${formMarketName}" registered successfully`);
    }

    setIsSubmitting(false);
    setIsModalOpen(false);
    setTimeout(() => setSuccessBanner(null), 4000);
  };

  // Delete Handlers
  const handleConfirmDelete = async () => {
    if (!deletingMarket) return;
    setIsDeleting(true);
    setDeleteError(null);

    const { success, error: err } = await deleteMarket(deletingMarket.id);
    if (!success) {
      setDeleteError(err || 'Failed to delete market');
      setIsDeleting(false);
      return;
    }

    setMarkets((prev) => prev.filter((m) => m.id !== deletingMarket.id));
    setSuccessBanner(`Market "${deletingMarket.market_name}" was permanently removed`);
    setDeletingMarket(null);
    setIsDeleting(false);
    setTimeout(() => setSuccessBanner(null), 4000);
  };

  return (
    <div className="space-y-6">
      {/* 
        ========================================================================
        HEADER: Reference Match (Globe Icon, Title, Subtitle)
        ========================================================================
      */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-[#EAF2FF] flex items-center justify-center text-[#1455D9]">
          <Globe2 className="w-5 h-5" />
        </div>
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[#101828]">
            Markets
          </h1>
          <p className="text-xs text-[#667085] mt-0.5">
            Manage markets under each travel agency and their members
          </p>
        </div>
      </div>

      {/* Success Notification */}
      {successBanner && (
        <div className="flex items-center justify-between p-3.5 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs font-medium animate-fade-in">
          <div className="flex items-center gap-2.5">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{successBanner}</span>
          </div>
          <button onClick={() => setSuccessBanner(null)} className="text-emerald-600 hover:text-emerald-800">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Error Alert */}
      {error && (
        <div className="flex items-center justify-between p-3.5 bg-red-50 border border-red-200 text-red-800 rounded-xl text-xs font-medium">
          <div className="flex items-center gap-2.5">
            <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
            <span>{error}</span>
          </div>
          <button onClick={() => setError(null)} className="text-red-600 hover:text-red-800">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* 
        ========================================================================
        TOOLBAR: Reference Match (Travel Agency label, Agency dropdown, Add Market button)
        ========================================================================
      */}
      <div className="bg-white p-4 rounded-xl border border-[#D9E0EA] shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <label htmlFor="agency-select" className="text-xs font-bold uppercase tracking-wider text-[#101828] whitespace-nowrap">
            Travel Agency:
          </label>
          <select
            id="agency-select"
            value={selectedAgencyId}
            onChange={(e) => handleAgencyChange(e.target.value)}
            className="w-full sm:w-72 px-3.5 py-2 bg-white border border-[#D9E0EA] rounded-xl text-sm font-semibold text-[#101828] focus:outline-none focus:ring-2 focus:ring-[#1455D9]/20 focus:border-[#1455D9]"
          >
            <option value="ALL">All Travel Agencies ({agencies.length})</option>
            {agencies.map((agency) => (
              <option key={agency.id} value={agency.id}>
                {agency.name} {agency.code ? `(${agency.code})` : ''}
              </option>
            ))}
          </select>
        </div>

        <button
          onClick={handleOpenCreateModal}
          className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2 rounded-xl text-sm font-semibold text-white bg-[#1455D9] hover:bg-[#1044B2] shadow-sm hover:shadow transition-all"
        >
          <Plus className="w-4 h-4" />
          <span>Add Market</span>
        </button>
      </div>

      {/* 
        ========================================================================
        AGENCY SUMMARY BANNER: Reference Match (Light blue background, Name, Metrics)
        ========================================================================
      */}
      <div className="p-4 rounded-xl bg-[#EAF2FF] border border-[#D9E0EA] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <span className="text-xs font-bold uppercase tracking-wider text-[#1455D9] block">
            Active Agency Scope
          </span>
          <h2 className="text-base font-bold text-[#101828] mt-0.5">
            {currentAgency ? currentAgency.name : 'All Registered Partner Agencies'}
          </h2>
        </div>

        <div className="flex items-center gap-6">
          <div className="text-left sm:text-right">
            <span className="text-xs text-[#667085] block">Markets</span>
            <span className="text-lg font-bold text-[#101828]">
              {totalMarketCount}
            </span>
          </div>
          <div className="w-px h-8 bg-[#D9E0EA]" />
          <div className="text-left sm:text-right">
            <span className="text-xs text-[#667085] block">Contact Members</span>
            <span className="text-lg font-bold text-[#101828]">
              {totalMemberCount}
            </span>
          </div>
        </div>
      </div>

      {/* 
        ========================================================================
        MARKET CARDS GRID: Reference Match
        Globe icon in circular light-blue background, Market Name, Member count, View Members button
        ========================================================================
      */}
      <div>
        {isLoading ? (
          <div className="py-20 flex flex-col items-center justify-center text-[#667085]">
            <RefreshCw className="w-8 h-8 text-[#1455D9] animate-spin mb-3" />
            <p className="text-sm font-medium">Loading regional market desks...</p>
          </div>
        ) : markets.length === 0 ? (
          <div className="bg-white rounded-2xl border border-[#D9E0EA] p-12 text-center text-[#667085]">
            <div className="w-12 h-12 rounded-full bg-[#EAF2FF] text-[#1455D9] flex items-center justify-center mx-auto mb-3">
              <Globe2 className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-[#101828]">No market desks found</h3>
            <p className="text-xs text-[#667085] max-w-sm mx-auto mt-1 mb-5">
              {selectedAgencyId !== 'ALL'
                ? 'No regional desks are currently created under this agency.'
                : 'Click "Add Market" above to set up your first market desk (e.g. India, Europe, Belgium).'}
            </p>
            <button
              onClick={handleOpenCreateModal}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold text-white bg-[#1455D9] hover:bg-[#1044B2]"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Create First Market</span>
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {markets.map((market) => (
              <div
                key={market.id}
                className="bg-white rounded-2xl border border-[#D9E0EA] p-5 shadow-sm hover:shadow-md transition-all flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-start justify-between gap-3 mb-4">
                    {/* Circular Light-Blue Globe Icon Badge */}
                    <div className="w-11 h-11 rounded-full bg-[#EAF2FF] flex items-center justify-center text-[#1455D9] shrink-0">
                      <Globe2 className="w-5 h-5" />
                    </div>

                    {/* Action buttons (Edit / Delete) */}
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => handleOpenEditModal(market)}
                        className="p-1.5 text-[#667085] hover:text-[#101828] hover:bg-slate-100 rounded-lg transition-colors"
                        title="Edit Market"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      {isAdmin && (
                        <button
                          onClick={() => setDeletingMarket(market)}
                          className="p-1.5 text-[#667085] hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          title="Delete Market (Admin Only)"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Market Name */}
                  <h3 className="text-base font-bold text-[#101828] tracking-tight">
                    {market.market_name}
                  </h3>

                  {/* Parent Agency indicator if looking at All Agencies */}
                  {selectedAgencyId === 'ALL' && (
                    <p className="text-xs text-[#667085] mt-0.5 truncate">
                      Agency: <span className="font-semibold text-slate-700">{market.agency_name}</span>
                    </p>
                  )}

                  {/* Optional Description */}
                  {market.description && (
                    <p className="text-xs text-[#667085] mt-2 line-clamp-2 leading-relaxed">
                      {market.description}
                    </p>
                  )}
                </div>

                {/* Bottom Card Footer: Member count & View Members Button */}
                <div className="mt-5 pt-4 border-t border-[#D9E0EA] flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-xs text-[#667085]">
                    <Users2 className="w-4 h-4 text-[#1455D9]" />
                    <span>
                      <strong className="text-[#101828] font-bold">{market.member_count || 0}</strong> Members
                    </span>
                  </div>

                  <Link
                    to={`/members?agencyId=${market.agency_id}&marketId=${market.id}`}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-[#1455D9] bg-[#EAF2FF] hover:bg-[#1455D9] hover:text-white transition-all"
                  >
                    <span>View Members</span>
                    <ExternalLink className="w-3 h-3" />
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 
        ========================================================================
        ADD / EDIT MARKET MODAL: Reference Match (Centered white modal, Title, Fields)
        ========================================================================
      */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#061D3D]/50 backdrop-blur-sm animate-fade-in">
          <div className="bg-white w-full max-w-md rounded-2xl border border-[#D9E0EA] shadow-2xl overflow-hidden animate-scale-up">
            <div className="px-6 py-4 border-b border-[#D9E0EA] flex items-center justify-between">
              <h3 className="font-bold text-lg text-[#101828]">
                {editingMarket ? 'Edit Market' : 'Add Market'}
              </h3>
              <button
                onClick={handleCloseModal}
                className="p-1 text-[#667085] hover:text-[#101828] rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmitForm} className="p-6 space-y-4">
              {formError && (
                <div className="p-3 bg-red-50 border border-red-200 text-red-800 rounded-xl text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
                  <span>{formError}</span>
                </div>
              )}

              {/* Travel Agency Dropdown */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-[#101828] mb-1.5">
                  Travel Agency <span className="text-red-500">*</span>
                </label>
                {editingMarket ? (
                  <div className="px-3.5 py-2.5 bg-slate-50 border border-[#D9E0EA] rounded-xl text-sm text-[#101828] font-semibold">
                    {editingMarket.agency_name}
                  </div>
                ) : (
                  <select
                    required
                    value={formAgencyId}
                    onChange={(e) => setFormAgencyId(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-white border border-[#D9E0EA] rounded-xl text-sm font-medium text-[#101828] focus:outline-none focus:ring-2 focus:ring-[#1455D9]/20 focus:border-[#1455D9]"
                  >
                    <option value="" disabled>
                      Select an Agency
                    </option>
                    {agencies.map((a) => (
                      <option key={a.id} value={a.id}>
                        {a.name} {a.code ? `(${a.code})` : ''}
                      </option>
                    ))}
                  </select>
                )}
              </div>

              {/* Market Name Field */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-[#101828] mb-1.5">
                  Market Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. India, Europe, Belgium"
                  value={formMarketName}
                  onChange={(e) => setFormMarketName(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-white border border-[#D9E0EA] rounded-xl text-sm text-[#101828] placeholder-[#98A2B3] focus:outline-none focus:ring-2 focus:ring-[#1455D9]/20 focus:border-[#1455D9]"
                />
              </div>

              {/* Optional Description */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-[#101828] mb-1.5">
                  Description (Optional)
                </label>
                <textarea
                  rows={3}
                  placeholder="Regional desk notes..."
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  className="w-full px-3.5 py-2 bg-white border border-[#D9E0EA] rounded-xl text-sm text-[#101828] placeholder-[#98A2B3] focus:outline-none focus:ring-2 focus:ring-[#1455D9]/20 focus:border-[#1455D9]"
                />
              </div>

              {/* Buttons: Cancel & Save */}
              <div className="pt-3 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={handleCloseModal}
                  disabled={isSubmitting}
                  className="px-4 py-2 text-xs font-semibold text-[#667085] hover:text-[#101828] bg-white border border-[#D9E0EA] rounded-xl hover:bg-slate-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 text-xs font-semibold text-white bg-[#1455D9] hover:bg-[#1044B2] rounded-xl shadow-sm transition-all flex items-center gap-2"
                >
                  {isSubmitting && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                  <span>{editingMarket ? 'Save Changes' : 'Save Market'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal (Admin Only) */}
      {deletingMarket && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#061D3D]/50 backdrop-blur-sm animate-fade-in">
          <div className="bg-white w-full max-w-md rounded-2xl border border-[#D9E0EA] shadow-2xl overflow-hidden p-6 space-y-4">
            <div className="flex items-center gap-3 text-red-600">
              <div className="p-2 bg-red-50 rounded-xl">
                <Trash2 className="w-6 h-6" />
              </div>
              <h3 className="font-bold text-lg text-[#101828]">Delete Market Desk?</h3>
            </div>

            <p className="text-sm text-[#667085] leading-relaxed">
              Are you sure you want to delete <strong className="text-[#101828]">{deletingMarket.market_name}</strong> under <strong className="text-[#101828]">{deletingMarket.agency_name}</strong>?
            </p>

            {deleteError && (
              <div className="p-3 bg-red-50 border border-red-200 text-red-800 rounded-xl text-xs flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                <span>{deleteError}</span>
              </div>
            )}

            <div className="pt-2 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => {
                  setDeletingMarket(null);
                  setDeleteError(null);
                }}
                disabled={isDeleting}
                className="px-4 py-2 text-xs font-semibold text-[#667085] bg-white border border-[#D9E0EA] rounded-xl hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                disabled={isDeleting}
                className="px-4 py-2 text-xs font-semibold text-white bg-[#DC2626] hover:bg-red-700 rounded-xl shadow-sm flex items-center gap-2"
              >
                {isDeleting && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                <span>Delete Permanently</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
