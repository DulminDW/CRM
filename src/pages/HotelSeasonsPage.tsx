import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  CalendarDays,
  Plus,
  Search,
  Edit2,
  Trash2,
  Hotel,
  CheckCircle2,
  AlertTriangle,
  AlertCircle,
  RefreshCw,
  X,
  Eye,
} from 'lucide-react';
import { Link, useSearchParams } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { HotelSeasonRecord, HotelRecord, SeasonStatus, SeasonOverlapCheckResult } from '../types/hotelHierarchy';
import { fetchHotels } from '../services/hotelService';
import {
  fetchSeasons,
  createSeason,
  updateSeason,
  deleteSeason,
  checkSeasonDateOverlap,
  CreateSeasonInput,
} from '../services/seasonService';

export const HotelSeasonsPage: React.FC = () => {
  const { profile, hasPermission } = useAuth();
  const isAdmin = profile?.role === 'ADMIN';
  const canManageRates = hasPermission('CAN_MANAGE_RATES') || isAdmin;

  const [searchParams, setSearchParams] = useSearchParams();
  const hotelIdParam = searchParams.get('hotelId') || 'ALL';

  // Global Lists
  const [hotels, setHotels] = useState<HotelRecord[]>([]);
  const [seasons, setSeasons] = useState<HotelSeasonRecord[]>([]);

  // Filter States
  const [selectedHotelId, setSelectedHotelId] = useState<string>(hotelIdParam);
  const [statusFilter, setStatusFilter] = useState<'ALL' | SeasonStatus>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');

  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [editingSeason, setEditingSeason] = useState<HotelSeasonRecord | null>(null);
  const [viewingSeason, setViewingSeason] = useState<HotelSeasonRecord | null>(null);

  // Form Fields
  const [formHotelId, setFormHotelId] = useState<string>('');
  const [formSeasonLabel, setFormSeasonLabel] = useState<string>('');
  const [formDateFrom, setFormDateFrom] = useState<string>('');
  const [formDateTo, setFormDateTo] = useState<string>('');
  const [formStatus, setFormStatus] = useState<SeasonStatus>('ACTIVE');

  // Overlap Warning & Validation
  const [formError, setFormError] = useState<string | null>(null);
  const [overlapWarning, setOverlapWarning] = useState<SeasonOverlapCheckResult | null>(null);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // Delete State
  const [deletingSeason, setDeletingSeason] = useState<HotelSeasonRecord | null>(null);
  const [isDeleting, setIsDeleting] = useState<boolean>(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  // Success Notification
  const [successBanner, setSuccessBanner] = useState<string | null>(null);

  // Sync URL query param
  useEffect(() => {
    if (hotelIdParam && hotelIdParam !== selectedHotelId) {
      setSelectedHotelId(hotelIdParam);
    }
  }, [hotelIdParam, selectedHotelId]);

  // Load Data
  const loadData = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    const [hotelRes, seasonRes] = await Promise.all([
      fetchHotels(),
      fetchSeasons(selectedHotelId !== 'ALL' ? selectedHotelId : undefined),
    ]);

    if (hotelRes.error) setError(hotelRes.error);
    else setHotels(hotelRes.data);

    if (seasonRes.error) setError(seasonRes.error);
    else setSeasons(seasonRes.data);

    setIsLoading(false);
  }, [selectedHotelId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Handle Hotel Filter Change
  const handleHotelFilterChange = (hotelId: string) => {
    setSelectedHotelId(hotelId);
    if (hotelId === 'ALL') {
      searchParams.delete('hotelId');
    } else {
      searchParams.set('hotelId', hotelId);
    }
    setSearchParams(searchParams);
  };

  // Selected Hotel Object for Summary
  const currentHotel = useMemo(() => {
    if (selectedHotelId === 'ALL') return null;
    return hotels.find((h) => h.id === selectedHotelId) || null;
  }, [hotels, selectedHotelId]);

  // Filtered Seasons
  const filteredSeasons = useMemo(() => {
    return seasons.filter((s) => {
      const q = searchQuery.toLowerCase();
      const matchesSearch =
        s.season_label.toLowerCase().includes(q) ||
        (s.hotel_name && s.hotel_name.toLowerCase().includes(q)) ||
        s.date_from.includes(q) ||
        s.date_to.includes(q);

      const matchesStatus = statusFilter === 'ALL' || s.status === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [seasons, searchQuery, statusFilter]);

  // Pre-flight Date Overlap Check
  const checkOverlap = async () => {
    if (!formHotelId || !formDateFrom || !formDateTo) return;
    if (formDateTo < formDateFrom) return;

    const res = await checkSeasonDateOverlap(
      formHotelId,
      formDateFrom,
      formDateTo,
      editingSeason?.id
    );

    if (res.hasOverlap) {
      setOverlapWarning(res);
    } else {
      setOverlapWarning(null);
    }
  };

  // Open Create Modal
  const handleOpenCreateModal = () => {
    setEditingSeason(null);
    const initialHotel = selectedHotelId !== 'ALL' ? selectedHotelId : hotels[0]?.id || '';
    setFormHotelId(initialHotel);
    setFormSeasonLabel('');
    setFormDateFrom('');
    setFormDateTo('');
    setFormStatus('ACTIVE');
    setFormError(null);
    setOverlapWarning(null);
    setIsModalOpen(true);
  };

  // Open Edit Modal
  const handleOpenEditModal = (season: HotelSeasonRecord) => {
    setEditingSeason(season);
    setFormHotelId(season.hotel_id);
    setFormSeasonLabel(season.season_label);
    setFormDateFrom(season.date_from);
    setFormDateTo(season.date_to);
    setFormStatus(season.status);
    setFormError(null);
    setOverlapWarning(null);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingSeason(null);
    setFormError(null);
    setOverlapWarning(null);
  };

  // Form Submit Handler
  const handleSubmitForm = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formHotelId) {
      setFormError('Please select a partner hotel');
      return;
    }
    if (formSeasonLabel.trim().length < 2) {
      setFormError('Season label must be at least 2 characters (e.g. 2026 Summer)');
      return;
    }
    if (!formDateFrom || !formDateTo) {
      setFormError('Both start date and end date are required');
      return;
    }
    if (formDateTo <= formDateFrom) {
      setFormError('End date (Date To) must be strictly later than start date (Date From)');
      return;
    }

    setIsSubmitting(true);
    setFormError(null);

    if (editingSeason) {
      const { data, error: updateErr } = await updateSeason(editingSeason.id, {
        season_label: formSeasonLabel,
        date_from: formDateFrom,
        date_to: formDateTo,
        status: formStatus,
      });

      if (updateErr) {
        setFormError(updateErr);
        setIsSubmitting(false);
        return;
      }

      setSeasons((prev) =>
        prev.map((s) => (s.id === editingSeason.id ? { ...s, ...data! } : s))
      );
      setSuccessBanner(`Season "${formSeasonLabel}" updated successfully`);
    } else {
      const input: CreateSeasonInput = {
        hotel_id: formHotelId,
        season_label: formSeasonLabel,
        date_from: formDateFrom,
        date_to: formDateTo,
        status: formStatus,
      };

      const { data, error: createErr } = await createSeason(input);
      if (createErr) {
        setFormError(createErr);
        setIsSubmitting(false);
        return;
      }

      setSeasons((prev) => [data!, ...prev]);
      setSuccessBanner(`Season "${formSeasonLabel}" created successfully`);
    }

    setIsSubmitting(false);
    setIsModalOpen(false);
    setTimeout(() => setSuccessBanner(null), 4000);
  };

  // Delete Handlers
  const handleConfirmDelete = async () => {
    if (!deletingSeason) return;
    setIsDeleting(true);
    setDeleteError(null);

    const { success, error: err } = await deleteSeason(deletingSeason.id);
    if (!success) {
      setDeleteError(err || 'Failed to delete season');
      setIsDeleting(false);
      return;
    }

    setSeasons((prev) => prev.filter((s) => s.id !== deletingSeason.id));
    setSuccessBanner(`Season "${deletingSeason.season_label}" permanently removed`);
    setDeletingSeason(null);
    setIsDeleting(false);
    setTimeout(() => setSuccessBanner(null), 4000);
  };

  return (
    <div className="space-y-6">
      {/* 
        ========================================================================
        HEADER: Calendar icon, Title, and Actions
        ========================================================================
      */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#EAF2FF] flex items-center justify-center text-[#1455D9]">
              <CalendarDays className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-[#101828]">
                Season Management
              </h1>
              <p className="text-xs text-[#667085] mt-0.5">
                Manage seasonal validity periods and date ranges configured per partner hotel
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={loadData}
            disabled={isLoading}
            className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-semibold text-[#667085] bg-white border border-[#D9E0EA] rounded-xl hover:bg-slate-50 transition-colors"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin text-[#1455D9]' : 'text-slate-400'}`} />
            <span>Refresh</span>
          </button>

          {canManageRates && (
            <button
              onClick={handleOpenCreateModal}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold text-white bg-[#1455D9] hover:bg-[#1044B2] shadow-sm hover:shadow transition-all"
            >
              <Plus className="w-4 h-4" />
              <span>Add Season</span>
            </button>
          )}
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
        TOOLBAR: Hotel Dropdown Filter, Search Box, and Status Pill Toggle
        ========================================================================
      */}
      <div className="bg-white p-4 rounded-xl border border-[#D9E0EA] shadow-sm flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        {/* Hotel Dropdown Filter */}
        <div className="flex items-center gap-2.5 w-full md:w-auto">
          <Hotel className="w-4 h-4 text-[#667085] shrink-0" />
          <span className="text-xs font-bold uppercase tracking-wider text-[#101828] whitespace-nowrap">
            Partner Hotel:
          </span>
          <select
            value={selectedHotelId}
            onChange={(e) => handleHotelFilterChange(e.target.value)}
            className="w-full md:w-64 px-3 py-1.5 bg-white border border-[#D9E0EA] rounded-xl text-xs font-semibold text-[#101828] focus:outline-none focus:ring-2 focus:ring-[#1455D9]/20 focus:border-[#1455D9]"
          >
            <option value="ALL">All Partner Hotels ({hotels.length})</option>
            {hotels.map((h) => (
              <option key={h.id} value={h.id}>
                {h.hotel_name} {h.hotel_code ? `(${h.hotel_code})` : ''}
              </option>
            ))}
          </select>
        </div>

        {/* Search & Status Filter */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#667085]" />
            <input
              type="text"
              placeholder="Search seasons or dates..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-1.5 bg-white border border-[#D9E0EA] rounded-xl text-xs font-medium text-[#101828] placeholder-[#98A2B3] focus:outline-none focus:ring-2 focus:ring-[#1455D9]/20 focus:border-[#1455D9]"
            />
          </div>

          <div className="flex bg-slate-100 p-0.5 rounded-lg border border-[#D9E0EA] text-xs font-medium">
            {(['ALL', 'ACTIVE', 'UPCOMING', 'EXPIRED'] as const).map((s) => (
              <button
                key={s}
                onClick={() => setStatusFilter(s)}
                className={`px-2.5 py-1 rounded-md transition-all ${
                  statusFilter === s
                    ? 'bg-white text-[#101828] shadow-sm font-bold'
                    : 'text-[#667085] hover:text-[#101828]'
                }`}
              >
                {s}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* 
        ========================================================================
        HOTEL SCOPE BANNER: Light-blue container showing active hotel context
        ========================================================================
      */}
      {currentHotel && (
        <div className="p-4 rounded-xl bg-[#EAF2FF] border border-[#D9E0EA] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-white text-[#1455D9] flex items-center justify-center font-bold text-xs shadow-sm">
              <Hotel className="w-4 h-4" />
            </div>
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#1455D9]">
                Selected Hotel Context
              </span>
              <h3 className="text-sm font-bold text-[#101828]">
                {currentHotel.hotel_name} {currentHotel.hotel_code ? `(${currentHotel.hotel_code})` : ''}
              </h3>
            </div>
          </div>

          <div className="text-right text-xs">
            <span className="text-[#667085] block">Seasons Count</span>
            <span className="font-bold text-[#101828] text-base">{filteredSeasons.length}</span>
          </div>
        </div>
      )}

      {/* 
        ========================================================================
        SEASONS TABLE: Light-blue header row, dates, hotel name, and actions
        ========================================================================
      */}
      <div className="bg-white rounded-2xl border border-[#D9E0EA] shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="py-20 flex flex-col items-center justify-center text-[#667085]">
            <RefreshCw className="w-8 h-8 text-[#1455D9] animate-spin mb-3" />
            <p className="text-sm font-medium">Loading hotel seasonal calendar...</p>
          </div>
        ) : filteredSeasons.length === 0 ? (
          <div className="py-16 text-center text-[#667085]">
            <div className="w-12 h-12 rounded-full bg-[#EAF2FF] text-[#1455D9] flex items-center justify-center mx-auto mb-3">
              <CalendarDays className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-[#101828]">No seasonal periods found</h3>
            <p className="text-xs text-[#667085] max-w-sm mx-auto mt-1 mb-5">
              {searchQuery || selectedHotelId !== 'ALL' || statusFilter !== 'ALL'
                ? 'Try adjusting your hotel filter or date search query.'
                : 'Click "Add Season" above to configure validity periods (e.g. 2026 Summer, 2026/27 Winter).'}
            </p>
            {canManageRates && (
              <button
                onClick={handleOpenCreateModal}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold text-white bg-[#1455D9] hover:bg-[#1044B2]"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Create First Season</span>
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-[#EAF2FF] border-b border-[#D9E0EA] text-[#08264F] font-bold tracking-wider uppercase text-[11px]">
                  <th className="py-3 px-4">Season Label</th>
                  <th className="py-3 px-4">Partner Hotel</th>
                  <th className="py-3 px-4">Start Date (Date From)</th>
                  <th className="py-3 px-4">End Date (Date To)</th>
                  <th className="py-3 px-4 text-center">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#D9E0EA]">
                {filteredSeasons.map((season) => (
                  <tr key={season.id} className="hover:bg-slate-50/70 transition-colors">
                    {/* Season Label */}
                    <td className="py-3.5 px-4 font-bold text-[#101828]">
                      {season.season_label}
                      <div className="text-[10px] text-slate-400 mt-0.5 font-normal">
                        ID: <span className="font-mono text-slate-500">{season.id.slice(0, 8)}</span>
                      </div>
                    </td>

                    {/* Parent Hotel */}
                    <td className="py-3.5 px-4 font-semibold text-[#101828]">
                      <Link
                        to={`/hotels`}
                        className="hover:text-[#1455D9] inline-flex items-center gap-1.5"
                      >
                        <Hotel className="w-3.5 h-3.5 text-[#667085]" />
                        <span>{season.hotel_name}</span>
                      </Link>
                    </td>

                    {/* Date From */}
                    <td className="py-3.5 px-4 font-mono font-medium text-slate-700">
                      {season.date_from}
                    </td>

                    {/* Date To */}
                    <td className="py-3.5 px-4 font-mono font-medium text-slate-700">
                      {season.date_to}
                    </td>

                    {/* Status Badge */}
                    <td className="py-3.5 px-4 text-center">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${
                          season.status === 'ACTIVE'
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                            : season.status === 'UPCOMING'
                            ? 'bg-blue-50 text-blue-700 border-blue-200'
                            : 'bg-slate-100 text-slate-600 border-slate-200'
                        }`}
                      >
                        {season.status}
                      </span>
                    </td>

                    {/* Actions: View Details, Edit, Delete */}
                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => setViewingSeason(season)}
                          className="p-1.5 text-[#667085] hover:text-[#101828] hover:bg-slate-100 rounded-lg transition-colors"
                          title="View Season Details"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </button>
                        {canManageRates && (
                          <button
                            onClick={() => handleOpenEditModal(season)}
                            className="p-1.5 text-[#667085] hover:text-[#101828] hover:bg-slate-100 rounded-lg transition-colors"
                            title="Edit Season"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                        {isAdmin && (
                          <button
                            onClick={() => setDeletingSeason(season)}
                            className="p-1.5 text-[#667085] hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                            title="Delete Season (Admin Only)"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* 
        ========================================================================
        ADD / EDIT SEASON MODAL: Hotel select, Label, Start Date, End Date, Status
        ========================================================================
      */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#061D3D]/50 backdrop-blur-sm animate-fade-in">
          <div className="bg-white w-full max-w-md rounded-2xl border border-[#D9E0EA] shadow-2xl overflow-hidden animate-scale-up">
            <div className="px-6 py-4 border-b border-[#D9E0EA] flex items-center justify-between">
              <h3 className="font-bold text-lg text-[#101828]">
                {editingSeason ? 'Edit Hotel Season' : 'Add Seasonal Period'}
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

              {/* Overlapping Season Non-blocking Advisory Warning */}
              {overlapWarning && (
                <div className="p-3 bg-amber-50 border border-amber-300 text-amber-900 rounded-xl text-xs space-y-1">
                  <div className="flex items-center gap-1.5 font-bold">
                    <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                    <span>Date Overlap Detected</span>
                  </div>
                  <p className="text-[#667085] leading-relaxed">
                    The chosen date range overlaps with existing season(s):{' '}
                    <strong>
                      {overlapWarning.overlappingSeasons.map((s) => `${s.season_label} (${s.date_from} to ${s.date_to})`).join(', ')}
                    </strong>.
                  </p>
                  <p className="text-[11px] font-semibold text-amber-800">
                    Advisory Note: Overlaps are permitted per company requirements. Please confirm this overlap is intentional.
                  </p>
                </div>
              )}

              {/* Hotel Dropdown */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-[#101828] mb-1.5">
                  Partner Hotel <span className="text-red-500">*</span>
                </label>
                {editingSeason ? (
                  <div className="px-3.5 py-2.5 bg-slate-50 border border-[#D9E0EA] rounded-xl text-sm text-[#101828] font-semibold">
                    {editingSeason.hotel_name}
                  </div>
                ) : (
                  <select
                    required
                    value={formHotelId}
                    onChange={(e) => {
                      setFormHotelId(e.target.value);
                      setOverlapWarning(null);
                    }}
                    className="w-full px-3.5 py-2.5 bg-white border border-[#D9E0EA] rounded-xl text-sm font-medium text-[#101828] focus:outline-none focus:ring-2 focus:ring-[#1455D9]/20 focus:border-[#1455D9]"
                  >
                    <option value="" disabled>
                      Select Partner Hotel
                    </option>
                    {hotels.map((h) => (
                      <option key={h.id} value={h.id}>
                        {h.hotel_name} {h.hotel_code ? `(${h.hotel_code})` : ''}
                      </option>
                    ))}
                  </select>
                )}
              </div>

              {/* Season Label */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-[#101828] mb-1.5">
                  Season Label <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. 2026 Summer, 2026/27 Winter, 2027 Summer"
                  value={formSeasonLabel}
                  onChange={(e) => setFormSeasonLabel(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-white border border-[#D9E0EA] rounded-xl text-sm text-[#101828] placeholder-[#98A2B3] focus:outline-none focus:ring-2 focus:ring-[#1455D9]/20 focus:border-[#1455D9]"
                />
              </div>

              {/* Start Date & End Date */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-[#101828] mb-1.5">
                    Start Date (Date From) <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="date"
                    required
                    value={formDateFrom}
                    onChange={(e) => {
                      setFormDateFrom(e.target.value);
                    }}
                    onBlur={checkOverlap}
                    className="w-full px-3.5 py-2.5 bg-white border border-[#D9E0EA] rounded-xl text-sm text-[#101828] focus:outline-none focus:ring-2 focus:ring-[#1455D9]/20 focus:border-[#1455D9]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-[#101828] mb-1.5">
                    End Date (Date To) <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="date"
                    required
                    value={formDateTo}
                    onChange={(e) => {
                      setFormDateTo(e.target.value);
                    }}
                    onBlur={checkOverlap}
                    className="w-full px-3.5 py-2.5 bg-white border border-[#D9E0EA] rounded-xl text-sm text-[#101828] focus:outline-none focus:ring-2 focus:ring-[#1455D9]/20 focus:border-[#1455D9]"
                  />
                </div>
              </div>

              {/* Status */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-[#101828] mb-1.5">
                  Status
                </label>
                <select
                  value={formStatus}
                  onChange={(e) => setFormStatus(e.target.value as SeasonStatus)}
                  className="w-full px-3.5 py-2.5 bg-white border border-[#D9E0EA] rounded-xl text-sm font-medium text-[#101828] focus:outline-none focus:ring-2 focus:ring-[#1455D9]/20 focus:border-[#1455D9]"
                >
                  <option value="ACTIVE">ACTIVE</option>
                  <option value="UPCOMING">UPCOMING</option>
                  <option value="EXPIRED">EXPIRED</option>
                </select>
              </div>

              {/* Action Buttons */}
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
                  <span>{editingSeason ? 'Save Changes' : 'Save Season'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 
        ========================================================================
        VIEW SEASON DETAILS MODAL
        ========================================================================
      */}
      {viewingSeason && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#061D3D]/50 backdrop-blur-sm animate-fade-in">
          <div className="bg-white w-full max-w-md rounded-2xl border border-[#D9E0EA] shadow-2xl overflow-hidden p-6 space-y-5 animate-scale-up">
            <div className="flex items-start justify-between border-b border-[#D9E0EA] pb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#EAF2FF] flex items-center justify-center text-[#1455D9]">
                  <CalendarDays className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-lg text-[#101828]">{viewingSeason.season_label}</h3>
                  <p className="text-xs text-[#667085]">
                    Hotel Season Validity Details · ID: {viewingSeason.id.slice(0, 8)}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setViewingSeason(null)}
                className="p-1 text-[#667085] hover:text-[#101828] rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="p-3 rounded-xl bg-slate-50 border border-[#D9E0EA]">
                <span className="text-[#667085] block font-medium">Parent Hotel</span>
                <span className="font-bold text-[#101828] text-sm mt-0.5 block">
                  {viewingSeason.hotel_name}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 rounded-xl bg-slate-50 border border-[#D9E0EA]">
                  <span className="text-[#667085] block font-medium">Date From</span>
                  <span className="font-bold font-mono text-[#101828] mt-0.5 block">
                    {viewingSeason.date_from}
                  </span>
                </div>
                <div className="p-3 rounded-xl bg-slate-50 border border-[#D9E0EA]">
                  <span className="text-[#667085] block font-medium">Date To</span>
                  <span className="font-bold font-mono text-[#101828] mt-0.5 block">
                    {viewingSeason.date_to}
                  </span>
                </div>
              </div>

              <div className="p-3 rounded-xl bg-slate-50 border border-[#D9E0EA]">
                <span className="text-[#667085] block font-medium">Status</span>
                <span className="font-bold text-emerald-700 mt-0.5 block">
                  {viewingSeason.status}
                </span>
              </div>
            </div>

            <div className="flex justify-between items-center pt-2">
              <Link
                to={`/hotels`}
                className="text-xs font-semibold text-[#1455D9] hover:underline"
              >
                View Parent Hotel →
              </Link>
              <button
                onClick={() => setViewingSeason(null)}
                className="px-4 py-2 text-xs font-semibold text-[#101828] bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 
        ========================================================================
        DELETE CONFIRMATION MODAL (Admin Only)
        ========================================================================
      */}
      {deletingSeason && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#061D3D]/50 backdrop-blur-sm animate-fade-in">
          <div className="bg-white w-full max-w-md rounded-2xl border border-[#D9E0EA] shadow-2xl overflow-hidden p-6 space-y-4">
            <div className="flex items-center gap-3 text-red-600">
              <div className="p-2 bg-red-50 rounded-xl">
                <Trash2 className="w-6 h-6" />
              </div>
              <h3 className="font-bold text-lg text-[#101828]">Delete Hotel Season?</h3>
            </div>

            <p className="text-sm text-[#667085] leading-relaxed">
              Are you sure you want to permanently delete <strong className="text-[#101828]">{deletingSeason.season_label}</strong> for <strong className="text-[#101828]">{deletingSeason.hotel_name}</strong>?
            </p>

            <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-900 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <span>
                <strong>Referential Safeguard:</strong> This operation will be rejected by PostgreSQL if rate sheets or special rates are associated with this season.
              </span>
            </div>

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
                  setDeletingSeason(null);
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
