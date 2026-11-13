import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Building2,
  Plus,
  Search,
  Edit2,
  Trash2,
  Globe2,
  Users2,
  Phone,
  Mail,
  MapPin,
  CheckCircle2,
  XCircle,
  AlertCircle,
  RefreshCw,
  X,
  ExternalLink,
  History,
  Eye,
  FileText,
  Sparkles
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { TravelAgencyRecord, RecordStatus } from '../types/agencyHierarchy';
import {
  fetchAgencies,
  createAgency,
  updateAgency,
  deleteAgency,
  CreateAgencyInput,
} from '../services/agencyService';

export const TravelAgenciesPage: React.FC = () => {
  const { profile } = useAuth();
  const isAdmin = profile?.role === 'ADMIN';

  // State
  const [agencies, setAgencies] = useState<TravelAgencyRecord[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | RecordStatus>('ALL');

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [editingAgency, setEditingAgency] = useState<TravelAgencyRecord | null>(null);
  const [viewingAgency, setViewingAgency] = useState<TravelAgencyRecord | null>(null);
  const [formName, setFormName] = useState<string>('');
  const [formCode, setFormCode] = useState<string>('');
  const [formCountry, setFormCountry] = useState<string>('');
  const [formCity, setFormCity] = useState<string>('');
  const [formAddress, setFormAddress] = useState<string>('');
  const [formPhone, setFormPhone] = useState<string>('');
  const [formEmail, setFormEmail] = useState<string>('');
  const [formInternalNotes, setFormInternalNotes] = useState<string>('');
  const [formStatus, setFormStatus] = useState<RecordStatus>('ACTIVE');
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // Delete Confirm State
  const [deletingAgency, setDeletingAgency] = useState<TravelAgencyRecord | null>(null);
  const [isDeleting, setIsDeleting] = useState<boolean>(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  // Success Notification
  const [successBanner, setSuccessBanner] = useState<string | null>(null);

  // Load Data
  const loadData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    const { data, error: err } = await fetchAgencies();
    if (err) {
      setError(err);
    } else {
      setAgencies(data);
    }
    setIsLoading(false);
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Filter Agencies
  const filteredAgencies = useMemo(() => {
    return agencies.filter((a) => {
      const matchesSearch =
        a.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (a.code && a.code.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (a.country && a.country.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (a.city && a.city.toLowerCase().includes(searchQuery.toLowerCase()));

      const matchesStatus = statusFilter === 'ALL' || a.status === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [agencies, searchQuery, statusFilter]);

  // Modal Handlers
  const handleOpenCreateModal = () => {
    setEditingAgency(null);
    setFormName('');
    setFormCode('');
    setFormCountry('');
    setFormCity('');
    setFormAddress('');
    setFormPhone('');
    setFormEmail('');
    setFormInternalNotes('');
    setFormStatus('ACTIVE');
    setFormError(null);
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (agency: TravelAgencyRecord) => {
    setEditingAgency(agency);
    setFormName(agency.name);
    setFormCode(agency.code || '');
    setFormCountry(agency.country || '');
    setFormCity(agency.city || '');
    setFormAddress(agency.address || '');
    setFormPhone(agency.phone || '');
    setFormEmail(agency.email || '');
    setFormInternalNotes(agency.internal_notes || '');
    setFormStatus(agency.status);
    setFormError(null);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingAgency(null);
    setFormError(null);
  };

  const handleSubmitForm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (formName.trim().length < 2) {
      setFormError('Agency name must be at least 2 characters');
      return;
    }

    setIsSubmitting(true);
    setFormError(null);

    if (editingAgency) {
      const { data, error: updateErr } = await updateAgency(editingAgency.id, {
        name: formName,
        code: formCode,
        country: formCountry,
        city: formCity,
        address: formAddress,
        phone: formPhone,
        email: formEmail,
        internal_notes: formInternalNotes,
        status: formStatus,
      });

      if (updateErr) {
        setFormError(updateErr);
        setIsSubmitting(false);
        return;
      }

      setAgencies((prev) =>
        prev.map((a) => (a.id === editingAgency.id ? { ...a, ...data! } : a))
      );
      setSuccessBanner(`Agency "${formName}" updated successfully`);
    } else {
      const input: CreateAgencyInput = {
        name: formName,
        code: formCode,
        country: formCountry,
        city: formCity,
        address: formAddress,
        phone: formPhone,
        email: formEmail,
        internal_notes: formInternalNotes,
        status: formStatus,
      };

      const { data, error: createErr } = await createAgency(input);
      if (createErr) {
        setFormError(createErr);
        setIsSubmitting(false);
        return;
      }

      setAgencies((prev) => [data!, ...prev]);
      setSuccessBanner(`Agency "${formName}" created successfully`);
    }

    setIsSubmitting(false);
    setIsModalOpen(false);
    setTimeout(() => setSuccessBanner(null), 4000);
  };

  // Toggle Status
  const handleToggleStatus = async (agency: TravelAgencyRecord) => {
    const newStatus: RecordStatus = agency.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
    const { error: err } = await updateAgency(agency.id, { status: newStatus });
    if (err) {
      setError(`Failed to update status: ${err}`);
      return;
    }
    setAgencies((prev) =>
      prev.map((a) => (a.id === agency.id ? { ...a, status: newStatus } : a))
    );
    setSuccessBanner(`Agency "${agency.name}" is now ${newStatus}`);
    setTimeout(() => setSuccessBanner(null), 4000);
  };

  // Delete Handlers
  const handleConfirmDelete = async () => {
    if (!deletingAgency) return;
    setIsDeleting(true);
    setDeleteError(null);

    const { success, error: err } = await deleteAgency(deletingAgency.id);
    if (!success) {
      setDeleteError(err || 'Failed to delete agency');
      setIsDeleting(false);
      return;
    }

    setAgencies((prev) => prev.filter((a) => a.id !== deletingAgency.id));
    setSuccessBanner(`Agency "${deletingAgency.name}" was permanently removed`);
    setDeletingAgency(null);
    setIsDeleting(false);
    setTimeout(() => setSuccessBanner(null), 4000);
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-navy-50 text-navy-700 rounded-xl border border-navy-100 shadow-sm">
              <Building2 className="w-6 h-6 text-navy-800" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-navy-950 tracking-tight">Travel Agencies</h1>
              <p className="text-sm text-slate-500">
                Level 1 of Contact Hierarchy — Master DMC & Partner Agency Profiles
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={loadData}
            disabled={isLoading}
            className="inline-flex items-center gap-2 px-3.5 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 hover:border-slate-300 shadow-sm transition-colors"
            title="Refresh Agencies List"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin text-navy-600' : 'text-slate-500'}`} />
            Refresh
          </button>
          <button
            onClick={handleOpenCreateModal}
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-navy-800 hover:bg-navy-900 rounded-lg shadow-sm hover:shadow transition-all"
          >
            <Plus className="w-4 h-4" />
            New Agency
          </button>
        </div>
      </div>

      {/* Success Notification */}
      {successBanner && (
        <div className="flex items-center justify-between p-3.5 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-lg text-sm animate-fade-in">
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
        <div className="flex items-center justify-between p-3.5 bg-rose-50 border border-rose-200 text-rose-800 rounded-lg text-sm">
          <div className="flex items-center gap-2.5">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{error}</span>
          </div>
          <button onClick={() => setError(null)} className="text-rose-600 hover:text-rose-800">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Controls Bar: Search & Status Filter */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col md:flex-row gap-3 justify-between items-center">
        <div className="relative w-full md:w-96">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search agencies by name, code, country, or city..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-navy-600/20 focus:border-navy-600"
          />
        </div>

        <div className="flex items-center gap-2 w-full md:w-auto">
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 whitespace-nowrap">
            Filter Status:
          </span>
            <div className="flex bg-slate-100 p-1 rounded-lg border border-slate-200 text-xs font-medium w-full sm:w-auto justify-between sm:justify-start">
              {(['ALL', 'ACTIVE', 'INACTIVE'] as const).map((s) => (
                <button
                  key={s}
                  onClick={() => setStatusFilter(s)}
                  className={`px-3 py-1.5 min-h-[36px] flex-1 sm:flex-initial rounded-md transition-all touch-manipulation text-center ${
                    statusFilter === s
                      ? 'bg-white text-navy-900 shadow-sm font-semibold'
                      : 'text-slate-600 hover:text-navy-900'
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>
        </div>
      </div>

      {/* Agencies Data Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="py-20 flex flex-col items-center justify-center text-slate-500">
            <RefreshCw className="w-8 h-8 text-navy-600 animate-spin mb-3" />
            <p className="text-sm font-medium">Loading partner agencies...</p>
          </div>
        ) : filteredAgencies.length === 0 ? (
          <div className="py-16 text-center text-slate-500">
            <Building2 className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <h3 className="text-base font-semibold text-slate-800">No travel agencies found</h3>
            <p className="text-sm text-slate-500 max-w-sm mx-auto mt-1">
              {searchQuery || statusFilter !== 'ALL'
                ? 'Try adjusting your search criteria or filter options.'
                : 'Click "New Agency" above to register your first partner travel agency.'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm border-collapse">
              <thead>
                <tr className="bg-slate-50/75 border-b border-slate-200 text-slate-600 font-semibold text-xs tracking-wider uppercase">
                  <th className="py-3 px-4">Agency Name</th>
                  <th className="py-3 px-4">Location</th>
                  <th className="py-3 px-4">Direct Contact</th>
                  <th className="py-3 px-4 text-center">Markets</th>
                  <th className="py-3 px-4 text-center">Members</th>
                  <th className="py-3 px-4 text-center">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredAgencies.map((agency) => (
                  <tr key={agency.id} className="hover:bg-slate-50/60 transition-colors">
                    {/* Name & Code */}
                    <td className="py-3.5 px-4">
                      <div className="font-semibold text-navy-950 flex items-center gap-2">
                        {agency.name}
                        {agency.code && (
                          <span className="text-xs bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded font-mono border border-slate-200">
                            {agency.code}
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-slate-400 mt-0.5">
                        ID: <span className="font-mono text-slate-500">{agency.id.slice(0, 8)}</span>
                      </div>
                    </td>

                    {/* Location */}
                    <td className="py-3.5 px-4 text-slate-600">
                      {agency.city || agency.country ? (
                        <div className="flex items-center gap-1.5 text-xs text-slate-600">
                          <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          <span>
                            {[agency.city, agency.country].filter(Boolean).join(', ')}
                          </span>
                        </div>
                      ) : (
                        <span className="text-xs text-slate-400 italic">—</span>
                      )}
                    </td>

                    {/* Contact */}
                    <td className="py-3.5 px-4">
                      <div className="space-y-1 text-xs">
                        {agency.email && (
                          <div className="flex items-center gap-1.5 text-slate-600">
                            <Mail className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                            <a href={`mailto:${agency.email}`} className="hover:text-navy-700 underline-offset-2 hover:underline">
                              {agency.email}
                            </a>
                          </div>
                        )}
                        {agency.phone && (
                          <div className="flex items-center gap-1.5 text-slate-600">
                            <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                            <span>{agency.phone}</span>
                          </div>
                        )}
                        {!agency.email && !agency.phone && (
                          <span className="text-slate-400 italic">—</span>
                        )}
                      </div>
                    </td>

                    {/* Markets Count & Link */}
                    <td className="py-3.5 px-4 text-center">
                      <Link
                        to={`/markets?agencyId=${agency.id}`}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200 transition-colors"
                        title={`View ${agency.market_count || 0} markets`}
                      >
                        <Globe2 className="w-3 h-3" />
                        <span>{agency.market_count || 0}</span>
                        <ExternalLink className="w-2.5 h-2.5 opacity-60" />
                      </Link>
                    </td>

                    {/* Members Count & Link */}
                    <td className="py-3.5 px-4 text-center">
                      <Link
                        to={`/members?agencyId=${agency.id}`}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-purple-50 text-purple-700 hover:bg-purple-100 border border-purple-200 transition-colors"
                        title={`View ${agency.member_count || 0} contact members`}
                      >
                        <Users2 className="w-3 h-3" />
                        <span>{agency.member_count || 0}</span>
                        <ExternalLink className="w-2.5 h-2.5 opacity-60" />
                      </Link>
                    </td>

                    {/* Status */}
                    <td className="py-3.5 px-4 text-center">
                      <button
                        onClick={() => handleToggleStatus(agency)}
                        className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold border transition-all ${
                          agency.status === 'ACTIVE'
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
                            : 'bg-slate-100 text-slate-600 border-slate-200 hover:bg-slate-200'
                        }`}
                        title="Click to toggle status"
                      >
                        {agency.status === 'ACTIVE' ? (
                          <>
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                            Active
                          </>
                        ) : (
                          <>
                            <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
                            Inactive
                          </>
                        )}
                      </button>
                    </td>

                    {/* Actions */}
                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => setViewingAgency(agency)}
                          className="p-1.5 text-slate-500 hover:text-navy-900 hover:bg-slate-100 rounded-lg transition-colors"
                          title="View Full Agency Profile"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <Link
                          to={`/rates?agencyId=${agency.id}&tab=HISTORY`}
                          className="p-1.5 text-slate-500 hover:text-[#1455D9] hover:bg-blue-50 rounded-lg transition-colors"
                          title="View Rate History for this Agency"
                        >
                          <History className="w-4 h-4" />
                        </Link>
                        <button
                          onClick={() => handleOpenEditModal(agency)}
                          className="p-1.5 text-slate-500 hover:text-navy-800 hover:bg-slate-100 rounded-lg transition-colors"
                          title="Edit Agency"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        {isAdmin && (
                          <button
                            onClick={() => setDeletingAgency(agency)}
                            className="p-1.5 text-slate-400 hover:text-rose-700 hover:bg-rose-50 rounded-lg transition-colors"
                            title="Delete Agency (Admin Only)"
                          >
                            <Trash2 className="w-4 h-4" />
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

      {/* CREATE / EDIT MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-navy-950/40 backdrop-blur-sm animate-fade-in">
          <div className="bg-white w-full max-w-lg rounded-2xl border border-slate-200 shadow-xl overflow-hidden animate-scale-up">
            <div className="px-6 py-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <Building2 className="w-5 h-5 text-navy-800" />
                <h3 className="font-semibold text-navy-950">
                  {editingAgency ? 'Edit Travel Agency' : 'Register New Travel Agency'}
                </h3>
              </div>
              <button
                onClick={handleCloseModal}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmitForm} className="p-6 space-y-4">
              {formError && (
                <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-lg text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
                  <span>{formError}</span>
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  Agency Name <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Jetwing Travels, Walkers Tours"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-navy-600/20 focus:border-navy-600"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                    Agency Code
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. JET-LK"
                    value={formCode}
                    onChange={(e) => setFormCode(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-navy-600/20 focus:border-navy-600"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                    Status
                  </label>
                  <select
                    value={formStatus}
                    onChange={(e) => setFormStatus(e.target.value as RecordStatus)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-navy-600/20 focus:border-navy-600"
                  >
                    <option value="ACTIVE">ACTIVE</option>
                    <option value="INACTIVE">INACTIVE</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                    Country
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Sri Lanka, India"
                    value={formCountry}
                    onChange={(e) => setFormCountry(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-navy-600/20 focus:border-navy-600"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                    City
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Colombo, Kandy"
                    value={formCity}
                    onChange={(e) => setFormCity(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-navy-600/20 focus:border-navy-600"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                    Direct Phone
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. +94 11 234 5678"
                    value={formPhone}
                    onChange={(e) => setFormPhone(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-navy-600/20 focus:border-navy-600"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                    Official Email
                  </label>
                  <input
                    type="email"
                    placeholder="e.g. info@agency.com"
                    value={formEmail}
                    onChange={(e) => setFormEmail(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-navy-600/20 focus:border-navy-600"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  Physical / Office Address
                </label>
                <input
                  type="text"
                  placeholder="e.g. No. 46/38, Nawam Mawatha, Colombo 02"
                  value={formAddress}
                  onChange={(e) => setFormAddress(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-navy-600/20 focus:border-navy-600"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  Internal Notes (Confidential)
                </label>
                <textarea
                  rows={2}
                  placeholder="Internal commercial terms, preferential treatment or partnership notes..."
                  value={formInternalNotes}
                  onChange={(e) => setFormInternalNotes(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-navy-600/20 focus:border-navy-600"
                />
              </div>

              <div className="pt-4 flex items-center justify-end gap-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={handleCloseModal}
                  disabled={isSubmitting}
                  className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 text-sm font-medium text-white bg-navy-800 hover:bg-navy-900 rounded-lg shadow-sm flex items-center gap-2"
                >
                  {isSubmitting && <RefreshCw className="w-4 h-4 animate-spin" />}
                  {editingAgency ? 'Save Changes' : 'Create Agency'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DELETE CONFIRMATION DIALOG (ADMIN ONLY) */}
      {deletingAgency && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-navy-950/40 backdrop-blur-sm animate-fade-in">
          <div className="bg-white w-full max-w-md rounded-2xl border border-slate-200 shadow-xl overflow-hidden p-6 space-y-4">
            <div className="flex items-center gap-3 text-rose-600">
              <div className="p-2 bg-rose-50 rounded-xl border border-rose-100">
                <Trash2 className="w-6 h-6" />
              </div>
              <h3 className="font-bold text-lg text-slate-900">Delete Travel Agency?</h3>
            </div>

            <p className="text-sm text-slate-600 leading-relaxed">
              Are you sure you want to permanently delete{' '}
              <strong className="text-slate-900">{deletingAgency.name}</strong>?
            </p>

            <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-900 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <span>
                <strong>Referential Safeguard:</strong> PostgreSQL foreign keys will reject this operation if any markets, members, or quote history exist for this agency.
              </span>
            </div>

            {deleteError && (
              <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-lg text-xs flex items-start gap-2">
                <XCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                <span>{deleteError}</span>
              </div>
            )}

            <div className="pt-2 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => {
                  setDeletingAgency(null);
                  setDeleteError(null);
                }}
                disabled={isDeleting}
                className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                disabled={isDeleting}
                className="px-4 py-2 text-sm font-medium text-white bg-rose-600 hover:bg-rose-700 rounded-lg shadow-sm flex items-center gap-2"
              >
                {isDeleting && <RefreshCw className="w-4 h-4 animate-spin" />}
                Delete Permanently
              </button>
            </div>
          </div>
        </div>
      )}

      {/* VIEW AGENCY PROFILE DRAWER / MODAL */}
      {viewingAgency && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-navy-950/40 backdrop-blur-sm animate-fade-in">
          <div className="bg-white w-full max-w-2xl rounded-2xl border border-slate-200 shadow-xl overflow-hidden animate-scale-up max-h-[90vh] flex flex-col">
            {/* Header */}
            <div className="px-6 py-5 bg-gradient-to-r from-navy-900 to-slate-900 text-white flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-white/10 rounded-xl backdrop-blur-sm border border-white/10">
                  <Building2 className="w-6 h-6 text-white" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-bold text-lg text-white">{viewingAgency.name}</h3>
                    {viewingAgency.code && (
                      <span className="text-xs bg-white/20 text-white px-2 py-0.5 rounded font-mono font-semibold">
                        {viewingAgency.code}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-300">Master Partner Travel Agency Profile</p>
                </div>
              </div>
              <button
                onClick={() => setViewingAgency(null)}
                className="p-1.5 text-slate-300 hover:text-white rounded-lg hover:bg-white/10 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Body */}
            <div className="p-6 space-y-6 overflow-y-auto flex-1 text-sm">
              {/* Agency Overview Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 p-4 bg-slate-50 rounded-xl border border-slate-200">
                <div>
                  <span className="text-xs text-slate-500 font-medium block">Account Status</span>
                  <span
                    className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold mt-1 border ${
                      viewingAgency.status === 'ACTIVE'
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                        : 'bg-slate-200 text-slate-700 border-slate-300'
                    }`}
                  >
                    <span
                      className={`w-1.5 h-1.5 rounded-full ${
                        viewingAgency.status === 'ACTIVE' ? 'bg-emerald-500' : 'bg-slate-500'
                      }`}
                    />
                    {viewingAgency.status}
                  </span>
                </div>
                <div>
                  <span className="text-xs text-slate-500 font-medium block">Country / Market</span>
                  <span className="font-semibold text-slate-900 mt-0.5 block">
                    {viewingAgency.country || 'Not specified'}
                  </span>
                </div>
                <div>
                  <span className="text-xs text-slate-500 font-medium block">City / Territory</span>
                  <span className="font-semibold text-slate-900 mt-0.5 block">
                    {viewingAgency.city || 'Not specified'}
                  </span>
                </div>
                <div>
                  <span className="text-xs text-slate-500 font-medium block">Official Email</span>
                  <span className="font-semibold text-slate-900 mt-0.5 block break-all">
                    {viewingAgency.email ? (
                      <a href={`mailto:${viewingAgency.email}`} className="text-blue-600 hover:underline">
                        {viewingAgency.email}
                      </a>
                    ) : (
                      '—'
                    )}
                  </span>
                </div>
                <div>
                  <span className="text-xs text-slate-500 font-medium block">Direct Phone</span>
                  <span className="font-semibold text-slate-900 mt-0.5 block">
                    {viewingAgency.phone || '—'}
                  </span>
                </div>
                <div>
                  <span className="text-xs text-slate-500 font-medium block">Internal Agency ID</span>
                  <span className="font-mono text-xs text-slate-600 mt-0.5 block">
                    {viewingAgency.id.slice(0, 13)}...
                  </span>
                </div>
              </div>

              {/* Physical Address */}
              <div>
                <h4 className="text-xs font-bold text-slate-600 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-slate-500" />
                  Physical / Office Address
                </h4>
                <p className="text-slate-800 bg-slate-50 p-3 rounded-lg border border-slate-200 text-xs leading-relaxed">
                  {viewingAgency.address || 'No physical address specified for this agency profile.'}
                </p>
              </div>

              {/* Internal Confidential Notes */}
              <div>
                <h4 className="text-xs font-bold text-slate-600 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                  <FileText className="w-3.5 h-3.5 text-slate-500" />
                  Internal CRM Notes (Confidential)
                </h4>
                <p className="text-slate-800 bg-amber-50/60 p-3 rounded-lg border border-amber-200/80 text-xs leading-relaxed">
                  {viewingAgency.internal_notes || 'No confidential internal notes recorded yet.'}
                </p>
              </div>

              {/* Associated Ecosystem Quick Links */}
              <div>
                <h4 className="text-xs font-bold text-slate-600 uppercase tracking-wider mb-3">
                  Agency Ecosystem & Records
                </h4>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <Link
                    to={`/markets?agencyId=${viewingAgency.id}`}
                    className="p-3 bg-blue-50/70 border border-blue-200 rounded-xl hover:bg-blue-100/80 transition-colors flex flex-col items-center text-center gap-1.5"
                  >
                    <Globe2 className="w-5 h-5 text-blue-700" />
                    <span className="text-xs font-bold text-blue-900">
                      {viewingAgency.market_count || 0} Markets
                    </span>
                    <span className="text-[11px] text-blue-600 flex items-center gap-0.5">
                      View Markets <ExternalLink className="w-2.5 h-2.5" />
                    </span>
                  </Link>

                  <Link
                    to={`/members?agencyId=${viewingAgency.id}`}
                    className="p-3 bg-purple-50/70 border border-purple-200 rounded-xl hover:bg-purple-100/80 transition-colors flex flex-col items-center text-center gap-1.5"
                  >
                    <Users2 className="w-5 h-5 text-purple-700" />
                    <span className="text-xs font-bold text-purple-900">
                      {viewingAgency.member_count || 0} Contacts
                    </span>
                    <span className="text-[11px] text-purple-600 flex items-center gap-0.5">
                      View Team <ExternalLink className="w-2.5 h-2.5" />
                    </span>
                  </Link>

                  <Link
                    to={`/rates?agencyId=${viewingAgency.id}&tab=HISTORY`}
                    className="p-3 bg-emerald-50/70 border border-emerald-200 rounded-xl hover:bg-emerald-100/80 transition-colors flex flex-col items-center text-center gap-1.5"
                  >
                    <History className="w-5 h-5 text-emerald-700" />
                    <span className="text-xs font-bold text-emerald-900">Shared Rates</span>
                    <span className="text-[11px] text-emerald-600 flex items-center gap-0.5">
                      Rate History <ExternalLink className="w-2.5 h-2.5" />
                    </span>
                  </Link>

                  <Link
                    to={`/special-rates?agencyId=${viewingAgency.id}`}
                    className="p-3 bg-amber-50/70 border border-amber-200 rounded-xl hover:bg-amber-100/80 transition-colors flex flex-col items-center text-center gap-1.5"
                  >
                    <Sparkles className="w-5 h-5 text-amber-700" />
                    <span className="text-xs font-bold text-amber-900">Special Rates</span>
                    <span className="text-[11px] text-amber-600 flex items-center gap-0.5">
                      Special Quotes <ExternalLink className="w-2.5 h-2.5" />
                    </span>
                  </Link>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
              <span className="text-xs text-slate-500">
                Created: {new Date(viewingAgency.created_at).toLocaleDateString()}
              </span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    const toEdit = viewingAgency;
                    setViewingAgency(null);
                    handleOpenEditModal(toEdit);
                  }}
                  className="px-4 py-2 text-xs font-semibold text-navy-800 bg-white border border-slate-300 rounded-lg hover:bg-slate-100 flex items-center gap-1.5"
                >
                  <Edit2 className="w-3.5 h-3.5" />
                  Edit Profile
                </button>
                <button
                  onClick={() => setViewingAgency(null)}
                  className="px-4 py-2 text-xs font-semibold text-white bg-navy-800 hover:bg-navy-900 rounded-lg"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
