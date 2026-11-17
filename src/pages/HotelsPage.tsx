import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Hotel,
  Plus,
  Search,
  Edit2,
  Trash2,
  CalendarDays,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  X,
  ExternalLink,
  MapPin,
  Sliders,
} from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { HotelRecord, HotelStatus, HotelServiceType } from '../types/hotelHierarchy';
import {
  fetchHotels,
  createHotel,
  updateHotel,
  deleteHotel,
  CreateHotelInput,
} from '../services/hotelService';
import { HotelDetailsModal } from '../components/hotels/HotelDetailsModal';

export const HotelsPage: React.FC = () => {
  const navigate = useNavigate();
  const { profile, hasPermission } = useAuth();
  const isAdmin = profile?.role === 'ADMIN';
  const canManageRates = hasPermission('CAN_MANAGE_RATES') || isAdmin;

  // State
  const [hotels, setHotels] = useState<HotelRecord[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | HotelStatus>('ALL');
  const [serviceTypeFilter, setServiceTypeFilter] = useState<'ALL' | HotelServiceType>('ALL');

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [editingHotel, setEditingHotel] = useState<HotelRecord | null>(null);
  const [viewingHotel, setViewingHotel] = useState<HotelRecord | null>(null);

  // Form Fields
  const [formHotelName, setFormHotelName] = useState<string>('');
  const [formHotelCode, setFormHotelCode] = useState<string>('');
  const [formArea, setFormArea] = useState<string>('');
  const [formServiceType, setFormServiceType] = useState<HotelServiceType>('BOTH');
  const [formStatus, setFormStatus] = useState<HotelStatus>('ACTIVE');
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // Delete Confirm State
  const [deletingHotel, setDeletingHotel] = useState<HotelRecord | null>(null);
  const [isDeleting, setIsDeleting] = useState<boolean>(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  // Success Notification
  const [successBanner, setSuccessBanner] = useState<string | null>(null);

  // Load Hotels
  const loadData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    const { data, error: err } = await fetchHotels();
    if (err) {
      setError(err);
    } else {
      setHotels(data);
    }
    setIsLoading(false);
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Filter Hotels
  const filteredHotels = useMemo(() => {
    return hotels.filter((h) => {
      const q = searchQuery.toLowerCase();
      const matchesSearch =
        h.hotel_name.toLowerCase().includes(q) ||
        (h.hotel_code && h.hotel_code.toLowerCase().includes(q)) ||
        (h.area && h.area.toLowerCase().includes(q));

      const matchesStatus = statusFilter === 'ALL' || h.status === statusFilter;
      const matchesService = serviceTypeFilter === 'ALL' || h.service_type === serviceTypeFilter;

      return matchesSearch && matchesStatus && matchesService;
    });
  }, [hotels, searchQuery, statusFilter, serviceTypeFilter]);

  // Modal Open Handlers
  const handleOpenCreateModal = () => {
    setEditingHotel(null);
    setFormHotelName('');
    setFormHotelCode('');
    setFormArea('');
    setFormServiceType('BOTH');
    setFormStatus('ACTIVE');
    setFormError(null);
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (hotel: HotelRecord) => {
    setEditingHotel(hotel);
    setFormHotelName(hotel.hotel_name);
    setFormHotelCode(hotel.hotel_code || '');
    setFormArea(hotel.area || '');
    setFormServiceType(hotel.service_type);
    setFormStatus(hotel.status);
    setFormError(null);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingHotel(null);
    setFormError(null);
  };

  const handleSubmitForm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (formHotelName.trim().length < 2) {
      setFormError('Hotel name must be at least 2 characters');
      return;
    }

    setIsSubmitting(true);
    setFormError(null);

    if (editingHotel) {
      const { data, error: updateErr } = await updateHotel(editingHotel.id, {
        hotel_name: formHotelName,
        hotel_code: formHotelCode,
        area: formArea,
        service_type: formServiceType,
        status: formStatus,
      });

      if (updateErr) {
        setFormError(updateErr);
        setIsSubmitting(false);
        return;
      }

      setHotels((prev) =>
        prev.map((h) => (h.id === editingHotel.id ? { ...h, ...data! } : h))
      );
      setSuccessBanner(`Hotel "${formHotelName}" updated successfully`);
    } else {
      const input: CreateHotelInput = {
        hotel_name: formHotelName,
        hotel_code: formHotelCode,
        area: formArea,
        service_type: formServiceType,
        status: formStatus,
      };

      const { data, error: createErr } = await createHotel(input);
      if (createErr) {
        setFormError(createErr);
        setIsSubmitting(false);
        return;
      }

      setHotels((prev) => [data!, ...prev]);
      setSuccessBanner(`Partner Hotel "${formHotelName}" registered successfully`);
    }

    setIsSubmitting(false);
    setIsModalOpen(false);
    setTimeout(() => setSuccessBanner(null), 4000);
  };

  // Toggle Status
  const handleToggleStatus = async (hotel: HotelRecord) => {
    if (!canManageRates) {
      setError('You need Administrator or Rates Management permissions to change hotel status.');
      return;
    }
    const newStatus: HotelStatus = hotel.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
    const { error: err } = await updateHotel(hotel.id, { status: newStatus });
    if (err) {
      setError(`Failed to update status: ${err}`);
      return;
    }
    setHotels((prev) =>
      prev.map((h) => (h.id === hotel.id ? { ...h, status: newStatus } : h))
    );
    setSuccessBanner(`Hotel "${hotel.hotel_name}" status set to ${newStatus}`);
    setTimeout(() => setSuccessBanner(null), 4000);
  };

  // Delete Handlers
  const handleConfirmDelete = async () => {
    if (!deletingHotel) return;
    setIsDeleting(true);
    setDeleteError(null);

    const { success, error: err } = await deleteHotel(deletingHotel.id);
    if (!success) {
      setDeleteError(err || 'Failed to delete hotel');
      setIsDeleting(false);
      return;
    }

    setHotels((prev) => prev.filter((h) => h.id !== deletingHotel.id));
    setSuccessBanner(`Hotel "${deletingHotel.hotel_name}" permanently removed`);
    setDeletingHotel(null);
    setIsDeleting(false);
    setTimeout(() => setSuccessBanner(null), 4000);
  };

  return (
    <div className="space-y-6">
      {/* 
        ========================================================================
        HEADER: Reference Match (Hotel icon, Title, Description, and Actions)
        ========================================================================
      */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#EAF2FF] flex items-center justify-center text-[#1455D9]">
              <Hotel className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-[#101828]">
                Hotels
              </h1>
              <p className="text-xs text-[#667085] mt-0.5">
                Manage partner hotels, service distribution channels, and seasonal calendars
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
              <span>Add Hotel</span>
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
        TOOLBAR: Search Input, Status Filter, and Service Type Filter
        ========================================================================
      */}
      <div className="bg-white p-4 rounded-xl border border-[#D9E0EA] shadow-sm flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        {/* Search */}
        <div className="relative w-full md:w-80">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#667085]" />
          <input
            type="text"
            placeholder="Search hotels by name, code, or area..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-white border border-[#D9E0EA] rounded-xl text-xs font-medium text-[#101828] placeholder-[#98A2B3] focus:outline-none focus:ring-2 focus:ring-[#1455D9]/20 focus:border-[#1455D9]"
          />
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Service Channel Filter */}
          <div className="flex items-center gap-2">
            <Sliders className="w-3.5 h-3.5 text-[#667085]" />
            <select
              value={serviceTypeFilter}
              onChange={(e) => setServiceTypeFilter(e.target.value as 'ALL' | HotelServiceType)}
              className="px-3 py-1.5 bg-white border border-[#D9E0EA] rounded-xl text-xs font-semibold text-[#101828] focus:outline-none focus:ring-2 focus:ring-[#1455D9]/20 focus:border-[#1455D9]"
            >
              <option value="ALL">All Service Channels</option>
              <option value="BOTH">Both (Online + Offline)</option>
              <option value="ONLINE">Online Channel</option>
              <option value="OFFLINE">Offline Channel</option>
            </select>
          </div>

          {/* Status Filter */}
          <div className="flex bg-slate-100 p-0.5 rounded-lg border border-[#D9E0EA] text-xs font-medium">
            {(['ALL', 'ACTIVE', 'INACTIVE'] as const).map((s) => (
              <button
                key={s}
                onClick={() => setStatusFilter(s)}
                className={`px-3 py-1 rounded-md transition-all ${
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
        HOTELS DATA TABLE: Light-blue header row, clear status badges, action icons
        ========================================================================
      */}
      <div className="bg-white rounded-2xl border border-[#D9E0EA] shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="py-20 flex flex-col items-center justify-center text-[#667085]">
            <RefreshCw className="w-8 h-8 text-[#1455D9] animate-spin mb-3" />
            <p className="text-sm font-medium">Loading partner hotel inventory...</p>
          </div>
        ) : filteredHotels.length === 0 ? (
          <div className="py-16 text-center text-[#667085]">
            <div className="w-12 h-12 rounded-full bg-[#EAF2FF] text-[#1455D9] flex items-center justify-center mx-auto mb-3">
              <Hotel className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-[#101828]">No partner hotels found</h3>
            <p className="text-xs text-[#667085] max-w-sm mx-auto mt-1 mb-5">
              {searchQuery || statusFilter !== 'ALL' || serviceTypeFilter !== 'ALL'
                ? 'Try adjusting your search query or filter toggles.'
                : 'Click "Add Hotel" above to register properties (e.g. Randoli, Beragala, Horton Heights, H.S.H.).'}
            </p>
            {canManageRates && (
              <button
                onClick={handleOpenCreateModal}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold text-white bg-[#1455D9] hover:bg-[#1044B2]"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Register First Property</span>
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[650px] text-left text-xs border-collapse">
              <thead>
                <tr className="bg-[#EAF2FF] border-b border-[#D9E0EA] text-[#08264F] font-bold tracking-wider uppercase text-[11px]">
                  <th className="py-3 px-4 min-w-[160px]">Hotel Name</th>
                  <th className="py-3 px-4 min-w-[130px]">Area / Location</th>
                  <th className="py-3 px-4 min-w-[120px]">Service Channel</th>
                  <th className="py-3 px-4 text-center min-w-[90px]">Seasons</th>
                  <th className="py-3 px-4 text-center min-w-[90px]">Status</th>
                  <th className="py-3 px-4 text-right min-w-[120px]">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#D9E0EA]">
                {filteredHotels.map((hotel) => (
                  <tr
                    key={hotel.id}
                    onClick={() => navigate(`/hotels/${hotel.id}`)}
                    className="hover:bg-blue-50/40 cursor-pointer transition-colors group"
                    title={`Click to open full page for ${hotel.hotel_name}`}
                  >
                    {/* Hotel Name & Code */}
                    <td className="py-3.5 px-4 font-bold text-[#101828]">
                      <div className="flex items-center gap-2">
                        <span className="group-hover:text-[#1455D9] transition-colors">{hotel.hotel_name}</span>
                        {hotel.hotel_code && (
                          <span className="text-[10px] bg-slate-100 text-[#667085] px-1.5 py-0.5 rounded font-mono border border-slate-200">
                            {hotel.hotel_code}
                          </span>
                        )}
                      </div>
                      <div className="text-[10px] text-slate-400 mt-0.5 font-normal">
                        ID: <span className="font-mono text-slate-500">{hotel.id.slice(0, 8)}</span>
                      </div>
                    </td>

                    {/* Area / Location */}
                    <td className="py-3.5 px-4 text-[#667085]">
                      {hotel.area ? (
                        <div className="flex items-center gap-1.5">
                          <MapPin className="w-3 h-3 text-[#1455D9]" />
                          <span>{hotel.area}</span>
                        </div>
                      ) : (
                        <span className="text-slate-300 italic">—</span>
                      )}
                    </td>

                    {/* Service Channel Badge */}
                    <td className="py-3.5 px-4">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${
                          hotel.service_type === 'BOTH'
                            ? 'bg-blue-50 text-blue-700 border-blue-200'
                            : hotel.service_type === 'ONLINE'
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                            : 'bg-purple-50 text-purple-700 border-purple-200'
                        }`}
                      >
                        {hotel.service_type}
                      </span>
                    </td>

                    {/* Number of Seasons & Link */}
                    <td className="py-3.5 px-4 text-center" onClick={(e) => e.stopPropagation()}>
                      <Link
                        to={`/seasons?hotelId=${hotel.id}`}
                        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-[#EAF2FF] text-[#1455D9] hover:bg-[#1455D9] hover:text-white transition-all"
                        title={`Manage ${hotel.season_count || 0} seasons for ${hotel.hotel_name}`}
                      >
                        <CalendarDays className="w-3 h-3" />
                        <span>{hotel.season_count || 0}</span>
                        <ExternalLink className="w-2.5 h-2.5 opacity-60" />
                      </Link>
                    </td>

                    {/* Status Toggle */}
                    <td className="py-3.5 px-4 text-center" onClick={(e) => e.stopPropagation()}>
                      <button
                        onClick={() => handleToggleStatus(hotel)}
                        disabled={!canManageRates}
                        className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold border transition-all ${
                          hotel.status === 'ACTIVE'
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
                            : 'bg-slate-100 text-slate-600 border-slate-200 hover:bg-slate-200'
                        } ${!canManageRates ? 'cursor-default opacity-85' : 'cursor-pointer'}`}
                        title={canManageRates ? 'Click to toggle status' : 'Status managed by Admin'}
                      >
                        <span
                          className={`w-1.5 h-1.5 rounded-full ${
                            hotel.status === 'ACTIVE' ? 'bg-emerald-500' : 'bg-slate-400'
                          }`}
                        />
                        <span>{hotel.status}</span>
                      </button>
                    </td>

                    {/* Actions: Edit, Delete */}
                    <td className="py-3.5 px-4 text-right" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center justify-end gap-1.5">
                        {canManageRates && (
                          <button
                            onClick={() => handleOpenEditModal(hotel)}
                            className="p-1.5 text-[#667085] hover:text-[#101828] hover:bg-slate-100 rounded-lg transition-colors"
                            title="Edit Hotel"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                        {isAdmin && (
                          <button
                            onClick={() => setDeletingHotel(hotel)}
                            className="p-1.5 text-[#667085] hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                            title="Delete Hotel (Admin Only)"
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
        ADD / EDIT HOTEL MODAL: Centered white modal, Title, Fields, Cancel & Save
        ========================================================================
      */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#061D3D]/50 backdrop-blur-sm animate-fade-in">
          <div className="bg-white w-full max-w-md rounded-2xl border border-[#D9E0EA] shadow-2xl overflow-hidden animate-scale-up">
            <div className="px-6 py-4 border-b border-[#D9E0EA] flex items-center justify-between">
              <h3 className="font-bold text-lg text-[#101828]">
                {editingHotel ? 'Edit Hotel' : 'Add Partner Hotel'}
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

              {/* Hotel Name */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-[#101828] mb-1.5">
                  Hotel Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Randoli, Beragala, Horton Heights, H.S.H."
                  value={formHotelName}
                  onChange={(e) => setFormHotelName(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-white border border-[#D9E0EA] rounded-xl text-sm text-[#101828] placeholder-[#98A2B3] focus:outline-none focus:ring-2 focus:ring-[#1455D9]/20 focus:border-[#1455D9]"
                />
              </div>

              {/* Hotel Code & Area */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-[#101828] mb-1.5">
                    Hotel Code
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. RND-01"
                    value={formHotelCode}
                    onChange={(e) => setFormHotelCode(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-white border border-[#D9E0EA] rounded-xl text-sm text-[#101828] placeholder-[#98A2B3] focus:outline-none focus:ring-2 focus:ring-[#1455D9]/20 focus:border-[#1455D9]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-[#101828] mb-1.5">
                    Area / Region
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Kandy, Nuwara Eliya"
                    value={formArea}
                    onChange={(e) => setFormArea(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-white border border-[#D9E0EA] rounded-xl text-sm text-[#101828] placeholder-[#98A2B3] focus:outline-none focus:ring-2 focus:ring-[#1455D9]/20 focus:border-[#1455D9]"
                  />
                </div>
              </div>

              {/* Service Channel & Status */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-[#101828] mb-1.5">
                    Service Channel
                  </label>
                  <select
                    value={formServiceType}
                    onChange={(e) => setFormServiceType(e.target.value as HotelServiceType)}
                    className="w-full px-3.5 py-2.5 bg-white border border-[#D9E0EA] rounded-xl text-sm font-medium text-[#101828] focus:outline-none focus:ring-2 focus:ring-[#1455D9]/20 focus:border-[#1455D9]"
                  >
                    <option value="BOTH">BOTH (Online & Offline)</option>
                    <option value="ONLINE">ONLINE Channel</option>
                    <option value="OFFLINE">OFFLINE Channel</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-[#101828] mb-1.5">
                    Status
                  </label>
                  <select
                    value={formStatus}
                    onChange={(e) => setFormStatus(e.target.value as HotelStatus)}
                    className="w-full px-3.5 py-2.5 bg-white border border-[#D9E0EA] rounded-xl text-sm font-medium text-[#101828] focus:outline-none focus:ring-2 focus:ring-[#1455D9]/20 focus:border-[#1455D9]"
                  >
                    <option value="ACTIVE">ACTIVE</option>
                    <option value="INACTIVE">INACTIVE</option>
                  </select>
                </div>
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
                  <span>{editingHotel ? 'Save Changes' : 'Save Hotel'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 
        ========================================================================
        VIEW HOTEL DETAILS MODAL (Now includes Visits & Quoted Rates History)
        ========================================================================
      */}
      <HotelDetailsModal
        hotel={viewingHotel}
        onClose={() => setViewingHotel(null)}
      />

      {/* 
        ========================================================================
        DELETE CONFIRMATION MODAL (Admin Only)
        ========================================================================
      */}
      {deletingHotel && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#061D3D]/50 backdrop-blur-sm animate-fade-in">
          <div className="bg-white w-full max-w-md rounded-2xl border border-[#D9E0EA] shadow-2xl overflow-hidden p-6 space-y-4">
            <div className="flex items-center gap-3 text-red-600">
              <div className="p-2 bg-red-50 rounded-xl">
                <Trash2 className="w-6 h-6" />
              </div>
              <h3 className="font-bold text-lg text-[#101828]">Delete Hotel?</h3>
            </div>

            <p className="text-sm text-[#667085] leading-relaxed">
              Are you sure you want to permanently delete <strong className="text-[#101828]">{deletingHotel.hotel_name}</strong>?
            </p>

            <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-900 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <span>
                <strong>Referential Safeguard:</strong> This operation will be rejected by PostgreSQL if this property has associated seasons, rate sheets, or quotes.
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
                  setDeletingHotel(null);
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
