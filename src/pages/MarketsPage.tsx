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
  Eye,
  Search,
  Building2,
} from 'lucide-react';
import { Link, useSearchParams } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { AgencyMarketRecord, TravelAgencyRecord } from '../types/agencyHierarchy';
import { supabase } from '../lib/supabase';
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
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // View Market Modal State
  const [viewingMarket, setViewingMarket] = useState<AgencyMarketRecord | null>(null);
  const [viewingMarketMembers, setViewingMarketMembers] = useState<any[]>([]);
  const [isLoadingMembers, setIsLoadingMembers] = useState<boolean>(false);

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

  // Filter markets by search query
  const filteredMarkets = useMemo(() => {
    if (!searchQuery.trim()) return markets;
    const q = searchQuery.toLowerCase();
    return markets.filter((m) =>
      m.market_name.toLowerCase().includes(q) ||
      (m.agency_name && m.agency_name.toLowerCase().includes(q)) ||
      (m.description && m.description.toLowerCase().includes(q))
    );
  }, [markets, searchQuery]);

  // Total metrics
  const totalMarketCount = filteredMarkets.length;
  const totalMemberCount = useMemo(() => {
    return filteredMarkets.reduce((acc, m) => acc + (m.member_count || 0), 0);
  }, [filteredMarkets]);

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

  // View Market Modal Handler
  const handleOpenViewModal = async (market: AgencyMarketRecord) => {
    setViewingMarket(market);
    setIsLoadingMembers(true);
    setViewingMarketMembers([]);
    try {
      const { data } = await supabase
        .from('agency_members')
        .select('*')
        .eq('market_id', market.id)
        .order('full_name', { ascending: true });
      setViewingMarketMembers(data || []);
    } catch (err) {
      console.error('Error fetching market members:', err);
    } finally {
      setIsLoadingMembers(false);
    }
  };

  const handleCloseViewModal = () => {
    setViewingMarket(null);
    setViewingMarketMembers([]);
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
        TOOLBAR: Travel Agency dropdown, Market Search, and Add Market button
        ========================================================================
      */}
      <div className="bg-white p-4 rounded-xl border border-[#D9E0EA] shadow-sm flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 flex-1">
          {/* Agency Filter Dropdown */}
          <div className="flex items-center gap-2.5">
            <label htmlFor="agency-select" className="text-xs font-bold uppercase tracking-wider text-[#101828] whitespace-nowrap">
              Agency:
            </label>
            <select
              id="agency-select"
              value={selectedAgencyId}
              onChange={(e) => handleAgencyChange(e.target.value)}
              className="w-full sm:w-64 px-3.5 py-2 bg-white border border-[#D9E0EA] rounded-xl text-sm font-semibold text-[#101828] focus:outline-none focus:ring-2 focus:ring-[#1455D9]/20 focus:border-[#1455D9]"
            >
              <option value="ALL">All Travel Agencies ({agencies.length})</option>
              {agencies.map((agency) => (
                <option key={agency.id} value={agency.id}>
                  {agency.name} {agency.code ? `(${agency.code})` : ''}
                </option>
              ))}
            </select>
          </div>

          {/* Search Box */}
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search markets by name, agency, or description..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-[#D9E0EA] rounded-xl text-sm text-[#101828] placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#1455D9]/20 focus:border-[#1455D9]"
            />
          </div>
        </div>

        <button
          onClick={handleOpenCreateModal}
          className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-white bg-[#1455D9] hover:bg-[#1044B2] shadow-sm hover:shadow transition-all shrink-0"
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
        ) : filteredMarkets.length === 0 ? (
          <div className="bg-white rounded-2xl border border-[#D9E0EA] p-12 text-center text-[#667085]">
            <div className="w-12 h-12 rounded-full bg-[#EAF2FF] text-[#1455D9] flex items-center justify-center mx-auto mb-3">
              <Globe2 className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-[#101828]">No market desks found</h3>
            <p className="text-xs text-[#667085] max-w-sm mx-auto mt-1 mb-5">
              {searchQuery
                ? `No markets matched your search "${searchQuery}".`
                : selectedAgencyId !== 'ALL'
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
            {filteredMarkets.map((market) => (
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

                    {/* Action buttons (View / Edit / Delete) */}
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => handleOpenViewModal(market)}
                        className="p-1.5 text-[#667085] hover:text-[#1455D9] hover:bg-blue-50 rounded-lg transition-colors"
                        title="View Market Details & Contacts"
                      >
                        <Eye className="w-3.5 h-3.5" />
                      </button>
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

      {/* 
        ========================================================================
        VIEW MARKET DETAILS & CONTACT MEMBERS MODAL
        ========================================================================
      */}
      {viewingMarket && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#061D3D]/50 backdrop-blur-sm animate-fade-in">
          <div className="bg-white w-full max-w-2xl rounded-2xl border border-[#D9E0EA] shadow-2xl overflow-hidden animate-scale-up max-h-[90vh] flex flex-col">
            {/* Modal Header */}
            <div className="px-6 py-5 bg-gradient-to-r from-[#08264F] to-[#0A3266] text-white flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center text-white border border-white/10">
                  <Globe2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-lg text-white leading-tight">
                    {viewingMarket.market_name}
                  </h3>
                  <p className="text-xs text-blue-200 mt-0.5">
                    Regional Desk Profile under <span className="font-semibold text-white">{viewingMarket.agency_name}</span>
                  </p>
                </div>
              </div>
              <button
                onClick={handleCloseViewModal}
                className="p-1.5 text-blue-200 hover:text-white rounded-lg hover:bg-white/10 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-6 overflow-y-auto flex-1 text-sm">
              {/* Market Key Metadata */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-4 bg-slate-50 rounded-xl border border-[#D9E0EA]">
                <div>
                  <span className="text-xs text-[#667085] font-medium block">Parent Travel Agency</span>
                  <div className="flex items-center gap-1.5 mt-1 font-semibold text-[#101828]">
                    <Building2 className="w-4 h-4 text-[#1455D9] shrink-0" />
                    <span className="truncate">{viewingMarket.agency_name}</span>
                  </div>
                </div>
                <div>
                  <span className="text-xs text-[#667085] font-medium block">Registered Members</span>
                  <div className="flex items-center gap-1.5 mt-1 font-semibold text-[#101828]">
                    <Users2 className="w-4 h-4 text-[#1455D9] shrink-0" />
                    <span>{viewingMarketMembers.length} Contact Persons</span>
                  </div>
                </div>
                <div>
                  <span className="text-xs text-[#667085] font-medium block">Created Date</span>
                  <span className="font-semibold text-[#101828] mt-1 block">
                    {new Date(viewingMarket.created_at).toLocaleDateString()}
                  </span>
                </div>
              </div>

              {/* Description */}
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-[#101828] mb-2">
                  Market Scope & Description
                </h4>
                <p className="text-xs text-[#475467] bg-white p-3.5 rounded-xl border border-[#D9E0EA] leading-relaxed">
                  {viewingMarket.description || 'No specific regional notes recorded for this market desk.'}
                </p>
              </div>

              {/* Market Contacts / Members Listing */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-[#101828] flex items-center gap-1.5">
                    <Users2 className="w-4 h-4 text-[#1455D9]" />
                    Associated Market Contacts ({viewingMarketMembers.length})
                  </h4>
                  <Link
                    to={`/members?agencyId=${viewingMarket.agency_id}&marketId=${viewingMarket.id}`}
                    className="text-xs font-semibold text-[#1455D9] hover:underline flex items-center gap-1"
                  >
                    <span>Manage Members</span>
                    <ExternalLink className="w-3 h-3" />
                  </Link>
                </div>

                {isLoadingMembers ? (
                  <div className="py-8 flex flex-col items-center justify-center text-slate-500">
                    <RefreshCw className="w-6 h-6 text-[#1455D9] animate-spin mb-2" />
                    <p className="text-xs">Loading market team...</p>
                  </div>
                ) : viewingMarketMembers.length === 0 ? (
                  <div className="p-6 bg-slate-50 border border-dashed border-slate-300 rounded-xl text-center">
                    <Users2 className="w-8 h-8 text-slate-400 mx-auto mb-2" />
                    <p className="text-xs text-[#667085]">
                      No individual members are currently assigned to this market.
                    </p>
                    <Link
                      to={`/members?agencyId=${viewingMarket.agency_id}&marketId=${viewingMarket.id}`}
                      className="inline-flex items-center gap-1.5 mt-3 px-3 py-1.5 bg-[#1455D9] text-white rounded-lg text-xs font-semibold shadow-sm hover:bg-[#1044B2]"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      Add Contact Member
                    </Link>
                  </div>
                ) : (
                  <div className="border border-[#D9E0EA] rounded-xl overflow-hidden">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-50 border-b border-[#D9E0EA] text-[#667085] font-semibold uppercase">
                        <tr>
                          <th className="py-2.5 px-3">Contact Name</th>
                          <th className="py-2.5 px-3">Position</th>
                          <th className="py-2.5 px-3">Email</th>
                          <th className="py-2.5 px-3">Phone</th>
                          <th className="py-2.5 px-3 text-center">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {viewingMarketMembers.map((m) => (
                          <tr key={m.id} className="hover:bg-slate-50/70">
                            <td className="py-2.5 px-3 font-semibold text-[#101828]">
                              {m.full_name}
                              {m.member_code && (
                                <span className="ml-1.5 px-1 py-0.5 bg-slate-100 rounded text-[10px] font-mono text-slate-600 border border-slate-200">
                                  {m.member_code}
                                </span>
                              )}
                            </td>
                            <td className="py-2.5 px-3 text-slate-600">{m.position || '—'}</td>
                            <td className="py-2.5 px-3">
                              {m.email ? (
                                <a href={`mailto:${m.email}`} className="text-blue-600 hover:underline">
                                  {m.email}
                                </a>
                              ) : (
                                '—'
                              )}
                            </td>
                            <td className="py-2.5 px-3 text-slate-600">{m.phone || '—'}</td>
                            <td className="py-2.5 px-3 text-center">
                              <span
                                className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                  m.status === 'ACTIVE'
                                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                    : 'bg-slate-100 text-slate-600 border border-slate-200'
                                }`}
                              >
                                {m.status}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-4 bg-slate-50 border-t border-[#D9E0EA] flex items-center justify-end gap-2.5">
              <button
                onClick={() => {
                  const toEdit = viewingMarket;
                  handleCloseViewModal();
                  handleOpenEditModal(toEdit);
                }}
                className="px-4 py-2 text-xs font-semibold text-[#101828] bg-white border border-[#D9E0EA] rounded-xl hover:bg-slate-100 flex items-center gap-1.5"
              >
                <Edit2 className="w-3.5 h-3.5" />
                Edit Market
              </button>
              <button
                onClick={handleCloseViewModal}
                className="px-4 py-2 text-xs font-semibold text-white bg-[#1455D9] hover:bg-[#1044B2] rounded-xl"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
