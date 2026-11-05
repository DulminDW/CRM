import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Users2,
  Plus,
  Search,
  Edit2,
  Trash2,
  Mail,
  Phone,
  FileSpreadsheet,
  CheckCircle2,
  AlertTriangle,
  AlertCircle,
  RefreshCw,
  X,
  Send,
} from 'lucide-react';
import { Link, useSearchParams } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import {
  AgencyMemberRecord,
  AgencyMarketRecord,
  TravelAgencyRecord,
  DuplicateEmailCheckResult,
} from '../types/agencyHierarchy';
import { fetchAgencies } from '../services/agencyService';
import { fetchMarkets } from '../services/marketService';
import {
  fetchMembers,
  createMember,
  updateMember,
  deleteMember,
  checkDuplicateEmail,
  CreateMemberInput,
} from '../services/memberService';

export const MembersPage: React.FC = () => {
  const { profile } = useAuth();
  const isAdmin = profile?.role === 'ADMIN';

  const [searchParams, setSearchParams] = useSearchParams();
  const agencyIdParam = searchParams.get('agencyId') || 'ALL';
  const marketIdParam = searchParams.get('marketId') || 'ALL';

  // Global Lists
  const [agencies, setAgencies] = useState<TravelAgencyRecord[]>([]);
  const [markets, setMarkets] = useState<AgencyMarketRecord[]>([]);
  const [members, setMembers] = useState<AgencyMemberRecord[]>([]);

  // Filter States
  const [selectedAgencyId, setSelectedAgencyId] = useState<string>(agencyIdParam);
  const [selectedMarketId, setSelectedMarketId] = useState<string>(marketIdParam);
  const [searchQuery, setSearchQuery] = useState<string>('');

  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [editingMember, setEditingMember] = useState<AgencyMemberRecord | null>(null);

  // Form Fields
  const [formAgencyId, setFormAgencyId] = useState<string>('');
  const [formMarketId, setFormMarketId] = useState<string>('');
  const [formFullName, setFormFullName] = useState<string>('');
  const [formEmail, setFormEmail] = useState<string>('');
  const [formPhone, setFormPhone] = useState<string>('');
  const [formPosition, setFormPosition] = useState<string>('');
  const [formMemberCode, setFormMemberCode] = useState<string>('');

  // Validation & Duplicate Checking State
  const [formError, setFormError] = useState<string | null>(null);
  const [duplicateWarning, setDuplicateWarning] = useState<DuplicateEmailCheckResult | null>(null);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // Delete State
  const [deletingMember, setDeletingMember] = useState<AgencyMemberRecord | null>(null);
  const [isDeleting, setIsDeleting] = useState<boolean>(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  // Success Notification
  const [successBanner, setSuccessBanner] = useState<string | null>(null);

  // Sync URL params
  useEffect(() => {
    if (agencyIdParam !== selectedAgencyId) setSelectedAgencyId(agencyIdParam);
    if (marketIdParam !== selectedMarketId) setSelectedMarketId(marketIdParam);
  }, [agencyIdParam, marketIdParam, selectedAgencyId, selectedMarketId]);

  // Load Initial Metadata
  const loadInitialData = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    const [agencyRes, marketRes, memberRes] = await Promise.all([
      fetchAgencies(),
      fetchMarkets(),
      fetchMembers(
        selectedAgencyId !== 'ALL' ? selectedAgencyId : undefined,
        selectedMarketId !== 'ALL' ? selectedMarketId : undefined
      ),
    ]);

    if (agencyRes.error) setError(agencyRes.error);
    else setAgencies(agencyRes.data);

    if (marketRes.error) setError(marketRes.error);
    else setMarkets(marketRes.data);

    if (memberRes.error) setError(memberRes.error);
    else setMembers(memberRes.data);

    setIsLoading(false);
  }, [selectedAgencyId, selectedMarketId]);

  useEffect(() => {
    loadInitialData();
  }, [loadInitialData]);

  // Dependent Markets for the Filter Bar
  const availableMarketsForFilter = useMemo(() => {
    if (selectedAgencyId === 'ALL') return markets;
    return markets.filter((m) => m.agency_id === selectedAgencyId);
  }, [markets, selectedAgencyId]);

  // Dependent Markets for the Create/Edit Form Modal
  const availableMarketsForForm = useMemo(() => {
    if (!formAgencyId) return [];
    return markets.filter((m) => m.agency_id === formAgencyId);
  }, [markets, formAgencyId]);

  // Filter Bar Handlers
  const handleAgencyFilterChange = (agencyId: string) => {
    setSelectedAgencyId(agencyId);
    setSelectedMarketId('ALL');
    if (agencyId === 'ALL') {
      searchParams.delete('agencyId');
    } else {
      searchParams.set('agencyId', agencyId);
    }
    searchParams.delete('marketId');
    setSearchParams(searchParams);
  };

  const handleMarketFilterChange = (marketId: string) => {
    setSelectedMarketId(marketId);
    if (marketId === 'ALL') {
      searchParams.delete('marketId');
    } else {
      searchParams.set('marketId', marketId);
    }
    setSearchParams(searchParams);
  };

  // Filtered Members
  const filteredMembers = useMemo(() => {
    return members.filter((m) => {
      const q = searchQuery.toLowerCase();
      return (
        m.full_name.toLowerCase().includes(q) ||
        m.email.toLowerCase().includes(q) ||
        (m.phone && m.phone.toLowerCase().includes(q)) ||
        (m.position && m.position.toLowerCase().includes(q)) ||
        (m.agency_name && m.agency_name.toLowerCase().includes(q)) ||
        (m.market_name && m.market_name.toLowerCase().includes(q)) ||
        (m.member_code && m.member_code.toLowerCase().includes(q))
      );
    });
  }, [members, searchQuery]);

  // Pre-flight duplicate email checker
  const handleEmailBlur = async () => {
    if (!formEmail.trim() || !formAgencyId || !formMarketId) return;

    const res = await checkDuplicateEmail(
      formEmail,
      formAgencyId,
      formMarketId,
      editingMember?.id
    );

    if (res.isDuplicate) {
      setDuplicateWarning(res);
    } else {
      setDuplicateWarning(null);
    }
  };

  // Open Create Modal
  const handleOpenCreateModal = () => {
    setEditingMember(null);
    const initialAgency = selectedAgencyId !== 'ALL' ? selectedAgencyId : agencies[0]?.id || '';
    setFormAgencyId(initialAgency);

    const initialMarkets = markets.filter((m) => m.agency_id === initialAgency);
    setFormMarketId(
      selectedMarketId !== 'ALL' && selectedMarketId !== ''
        ? selectedMarketId
        : initialMarkets[0]?.id || ''
    );

    setFormFullName('');
    setFormEmail('');
    setFormPhone('');
    setFormPosition('');
    setFormMemberCode('');
    setFormError(null);
    setDuplicateWarning(null);
    setIsModalOpen(true);
  };

  // Open Edit Modal
  const handleOpenEditModal = (member: AgencyMemberRecord) => {
    setEditingMember(member);
    setFormAgencyId(member.agency_id);
    setFormMarketId(member.market_id);
    setFormFullName(member.full_name);
    setFormEmail(member.email);
    setFormPhone(member.phone || '');
    setFormPosition(member.position || '');
    setFormMemberCode(member.member_code || '');
    setFormError(null);
    setDuplicateWarning(null);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingMember(null);
    setFormError(null);
    setDuplicateWarning(null);
  };

  // Form Agency Change -> cascade updates available markets
  const handleFormAgencyChange = (agencyId: string) => {
    setFormAgencyId(agencyId);
    const agencyMarkets = markets.filter((m) => m.agency_id === agencyId);
    setFormMarketId(agencyMarkets[0]?.id || '');
    setDuplicateWarning(null);
  };

  // Submit Handler
  const handleSubmitForm = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formAgencyId) {
      setFormError('Please select a parent Travel Agency');
      return;
    }
    if (!formMarketId) {
      setFormError('Please select a regional Market Desk');
      return;
    }
    if (formFullName.trim().length < 2) {
      setFormError('Member name must be at least 2 characters');
      return;
    }

    // Pre-flight duplicate check
    const checkRes = await checkDuplicateEmail(
      formEmail,
      formAgencyId,
      formMarketId,
      editingMember?.id
    );

    if (checkRes.isDuplicate && checkRes.isSameAgencyMarket) {
      setFormError(
        `A member with email "${formEmail}" already exists under this exact agency desk (${checkRes.existingMember?.full_name}). Duplicate prohibited.`
      );
      setDuplicateWarning(checkRes);
      return;
    }

    setIsSubmitting(true);
    setFormError(null);

    if (editingMember) {
      const { data, error: updateErr } = await updateMember(editingMember.id, {
        agency_id: formAgencyId,
        market_id: formMarketId,
        full_name: formFullName,
        email: formEmail,
        phone: formPhone,
        position: formPosition,
        member_code: formMemberCode,
      });

      if (updateErr) {
        setFormError(updateErr);
        setIsSubmitting(false);
        return;
      }

      setMembers((prev) =>
        prev.map((m) => (m.id === editingMember.id ? { ...m, ...data! } : m))
      );
      setSuccessBanner(`Member "${formFullName}" updated successfully`);
    } else {
      const input: CreateMemberInput = {
        agency_id: formAgencyId,
        market_id: formMarketId,
        full_name: formFullName,
        email: formEmail,
        phone: formPhone,
        position: formPosition,
        member_code: formMemberCode,
      };

      const { data, error: createErr } = await createMember(input);
      if (createErr) {
        setFormError(createErr);
        setIsSubmitting(false);
        return;
      }

      setMembers((prev) => [data!, ...prev]);
      setSuccessBanner(`Member "${formFullName}" registered successfully`);
    }

    setIsSubmitting(false);
    setIsModalOpen(false);
    setTimeout(() => setSuccessBanner(null), 4000);
  };

  // Delete Handlers
  const handleConfirmDelete = async () => {
    if (!deletingMember) return;
    setIsDeleting(true);
    setDeleteError(null);

    const { success, error: err } = await deleteMember(deletingMember.id);
    if (!success) {
      setDeleteError(err || 'Failed to delete member');
      setIsDeleting(false);
      return;
    }

    setMembers((prev) => prev.filter((m) => m.id !== deletingMember.id));
    setSuccessBanner(`Member "${deletingMember.full_name}" was permanently removed`);
    setDeletingMember(null);
    setIsDeleting(false);
    setTimeout(() => setSuccessBanner(null), 4000);
  };

  return (
    <div className="space-y-6">
      {/* 
        ========================================================================
        HEADER: Reference Match (Users icon, Title, Subtitle)
        ========================================================================
      */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-[#EAF2FF] flex items-center justify-center text-[#1455D9]">
          <Users2 className="w-5 h-5" />
        </div>
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[#101828]">
            Members
          </h1>
          <p className="text-xs text-[#667085] mt-0.5">
            Manage contact members of travel agencies (sales, operations, management, etc.)
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
        TOOLBAR: Reference Match
        Travel Agency dropdown, Market dropdown, Search input, Import Excel button, Add Member button
        ========================================================================
      */}
      <div className="bg-white p-4 rounded-xl border border-[#D9E0EA] shadow-sm flex flex-col xl:flex-row items-stretch xl:items-center justify-between gap-3">
        {/* Dropdowns & Search */}
        <div className="flex flex-wrap items-center gap-3 flex-1">
          {/* Agency Dropdown */}
          <div className="w-full sm:w-auto flex-1 min-w-[200px]">
            <select
              value={selectedAgencyId}
              onChange={(e) => handleAgencyFilterChange(e.target.value)}
              className="w-full px-3 py-2 bg-white border border-[#D9E0EA] rounded-xl text-xs font-semibold text-[#101828] focus:outline-none focus:ring-2 focus:ring-[#1455D9]/20 focus:border-[#1455D9]"
            >
              <option value="ALL">All Travel Agencies ({agencies.length})</option>
              {agencies.map((agency) => (
                <option key={agency.id} value={agency.id}>
                  {agency.name}
                </option>
              ))}
            </select>
          </div>

          {/* Market Dropdown */}
          <div className="w-full sm:w-auto flex-1 min-w-[180px]">
            <select
              value={selectedMarketId}
              onChange={(e) => handleMarketFilterChange(e.target.value)}
              className="w-full px-3 py-2 bg-white border border-[#D9E0EA] rounded-xl text-xs font-semibold text-[#101828] focus:outline-none focus:ring-2 focus:ring-[#1455D9]/20 focus:border-[#1455D9]"
            >
              <option value="ALL">All Markets ({availableMarketsForFilter.length})</option>
              {availableMarketsForFilter.map((market) => (
                <option key={market.id} value={market.id}>
                  {market.market_name}
                </option>
              ))}
            </select>
          </div>

          {/* Search Input */}
          <div className="relative w-full sm:w-auto flex-1 min-w-[220px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#667085]" />
            <input
              type="text"
              placeholder="Search members..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-white border border-[#D9E0EA] rounded-xl text-xs font-medium text-[#101828] placeholder-[#98A2B3] focus:outline-none focus:ring-2 focus:ring-[#1455D9]/20 focus:border-[#1455D9]"
            />
          </div>
        </div>

        {/* Action Buttons: Import Excel & Add Member */}
        <div className="flex items-center gap-2.5 shrink-0 pt-2 xl:pt-0 border-t xl:border-t-0 border-slate-100">
          <button
            type="button"
            disabled
            title="Excel bulk import will be available in Phase 3 extension"
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold text-[#667085] bg-slate-50 border border-[#D9E0EA] cursor-not-allowed opacity-75"
          >
            <FileSpreadsheet className="w-4 h-4 text-[#1455D9]" />
            <span>Import Excel</span>
            <span className="text-[10px] bg-slate-200 px-1 py-0.2 rounded text-slate-600 font-mono">SOON</span>
          </button>

          <button
            onClick={handleOpenCreateModal}
            className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold text-white bg-[#1455D9] hover:bg-[#1044B2] shadow-sm hover:shadow transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>Add Member</span>
          </button>
        </div>
      </div>

      {/* 
        ========================================================================
        MEMBERS TABLE: Reference Match
        Light-blue header row, Member Name, Email, Phone, Position, Agency, Market, Actions
        ========================================================================
      */}
      <div className="bg-white rounded-2xl border border-[#D9E0EA] shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="py-20 flex flex-col items-center justify-center text-[#667085]">
            <RefreshCw className="w-8 h-8 text-[#1455D9] animate-spin mb-3" />
            <p className="text-sm font-medium">Loading contact profiles...</p>
          </div>
        ) : filteredMembers.length === 0 ? (
          <div className="py-16 text-center text-[#667085]">
            <div className="w-12 h-12 rounded-full bg-[#EAF2FF] text-[#1455D9] flex items-center justify-center mx-auto mb-3">
              <Users2 className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-[#101828]">No members found</h3>
            <p className="text-xs text-[#667085] max-w-sm mx-auto mt-1 mb-5">
              {searchQuery || selectedAgencyId !== 'ALL' || selectedMarketId !== 'ALL'
                ? 'Try adjusting your dropdown filters or search term.'
                : 'Click "Add Member" above to register an agency contact person.'}
            </p>
            <button
              onClick={handleOpenCreateModal}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold text-white bg-[#1455D9] hover:bg-[#1044B2]"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Member</span>
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                {/* Light-Blue Header Row as in Reference Design */}
                <tr className="bg-[#EAF2FF] border-b border-[#D9E0EA] text-[#08264F] font-bold tracking-wider uppercase text-[11px]">
                  <th className="py-3 px-4">Member Name</th>
                  <th className="py-3 px-4">Email</th>
                  <th className="py-3 px-4">Phone</th>
                  <th className="py-3 px-4">Position</th>
                  <th className="py-3 px-4">Agency</th>
                  <th className="py-3 px-4">Market</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#D9E0EA]">
                {filteredMembers.map((member) => (
                  <tr key={member.id} className="hover:bg-slate-50/70 transition-colors">
                    {/* Member Name */}
                    <td className="py-3.5 px-4 font-bold text-[#101828]">
                      {member.full_name}
                      {member.member_code && (
                        <span className="ml-1.5 text-[10px] bg-slate-100 text-[#667085] px-1.5 py-0.5 rounded font-mono border border-slate-200">
                          {member.member_code}
                        </span>
                      )}
                    </td>

                    {/* Email with Blue Link */}
                    <td className="py-3.5 px-4">
                      <a
                        href={`mailto:${member.email}`}
                        className="text-[#1455D9] hover:underline font-medium inline-flex items-center gap-1.5"
                      >
                        <Mail className="w-3 h-3 text-[#1455D9]/70" />
                        <span>{member.email}</span>
                      </a>
                    </td>

                    {/* Phone */}
                    <td className="py-3.5 px-4 text-[#667085]">
                      {member.phone ? (
                        <div className="flex items-center gap-1.5">
                          <Phone className="w-3 h-3 text-[#667085]/70" />
                          <span>{member.phone}</span>
                        </div>
                      ) : (
                        <span className="text-slate-300 italic">—</span>
                      )}
                    </td>

                    {/* Position */}
                    <td className="py-3.5 px-4 text-[#667085]">
                      {member.position || <span className="text-slate-300 italic">—</span>}
                    </td>

                    {/* Agency */}
                    <td className="py-3.5 px-4 font-semibold text-[#101828]">
                      {member.agency_name}
                    </td>

                    {/* Market Desk Badge */}
                    <td className="py-3.5 px-4">
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-[#EAF2FF] text-[#1455D9] border border-[#1455D9]/20">
                        {member.market_name}
                      </span>
                    </td>

                    {/* Actions: Share Rates, Edit, Delete */}
                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <Link
                          to={`/share-rates?memberId=${member.id}`}
                          className="p-1.5 text-[#667085] hover:text-[#1455D9] hover:bg-[#EAF2FF] rounded-lg transition-colors"
                          title="Share Rates with this Contact"
                        >
                          <Send className="w-3.5 h-3.5" />
                        </Link>
                        <button
                          onClick={() => handleOpenEditModal(member)}
                          className="p-1.5 text-[#667085] hover:text-[#101828] hover:bg-slate-100 rounded-lg transition-colors"
                          title="Edit Member"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        {isAdmin && (
                          <button
                            onClick={() => setDeletingMember(member)}
                            className="p-1.5 text-[#667085] hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                            title="Delete Member (Admin Only)"
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
        ADD / EDIT MEMBER MODAL: Reference Match
        Title: Add Member, Member Name, Email, Phone, Position, Agency Dropdown, Market Dropdown, Member Code, Cancel & Save
        ========================================================================
      */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#061D3D]/50 backdrop-blur-sm animate-fade-in">
          <div className="bg-white w-full max-w-lg rounded-2xl border border-[#D9E0EA] shadow-2xl overflow-hidden animate-scale-up">
            <div className="px-6 py-4 border-b border-[#D9E0EA] flex items-center justify-between">
              <h3 className="font-bold text-lg text-[#101828]">
                {editingMember ? 'Edit Member' : 'Add Member'}
              </h3>
              <button
                onClick={handleCloseModal}
                className="p-1 text-[#667085] hover:text-[#101828] rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmitForm} className="p-6 space-y-4">
              {/* Error Banner */}
              {formError && (
                <div className="p-3 bg-red-50 border border-red-200 text-red-800 rounded-xl text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
                  <span>{formError}</span>
                </div>
              )}

              {/* Duplicate Email Warning (Red alert if same desk, Amber alert if cross-desk) */}
              {duplicateWarning && (
                <div
                  className={`p-3 rounded-xl border text-xs space-y-1 ${
                    duplicateWarning.isSameAgencyMarket
                      ? 'bg-red-50 border-red-300 text-red-900'
                      : 'bg-amber-50 border-amber-300 text-amber-900'
                  }`}
                >
                  <div className="flex items-center gap-1.5 font-bold">
                    <AlertTriangle className="w-4 h-4 shrink-0" />
                    <span>Existing Email Record Detected</span>
                  </div>
                  <p className="text-[#667085] leading-relaxed">
                    A member with this email already exists under:{' '}
                    <strong className="text-[#101828]">{duplicateWarning.existingMember?.agency_name}</strong> →{' '}
                    <strong className="text-[#101828]">{duplicateWarning.existingMember?.market_name}</strong> (
                    {duplicateWarning.existingMember?.full_name}).
                  </p>
                  <p className="text-[11px] font-semibold">
                    {duplicateWarning.isSameAgencyMarket
                      ? 'Duplicate prohibited under the same desk.'
                      : 'Please verify if this contact legitimately works across multiple agency markets.'}
                  </p>
                </div>
              )}

              {/* Member Name */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-[#101828] mb-1.5">
                  Member Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Sarith Perera, Jana Smith"
                  value={formFullName}
                  onChange={(e) => setFormFullName(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-white border border-[#D9E0EA] rounded-xl text-sm text-[#101828] placeholder-[#98A2B3] focus:outline-none focus:ring-2 focus:ring-[#1455D9]/20 focus:border-[#1455D9]"
                />
              </div>

              {/* Email & Phone */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-[#101828] mb-1.5">
                    Email <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="email"
                    required
                    placeholder="e.g. sarith@agency.lk"
                    value={formEmail}
                    onChange={(e) => setFormEmail(e.target.value)}
                    onBlur={handleEmailBlur}
                    className="w-full px-3.5 py-2.5 bg-white border border-[#D9E0EA] rounded-xl text-sm text-[#101828] placeholder-[#98A2B3] focus:outline-none focus:ring-2 focus:ring-[#1455D9]/20 focus:border-[#1455D9]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-[#101828] mb-1.5">
                    Phone Number
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. +94 77 123 4567"
                    value={formPhone}
                    onChange={(e) => setFormPhone(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-white border border-[#D9E0EA] rounded-xl text-sm text-[#101828] placeholder-[#98A2B3] focus:outline-none focus:ring-2 focus:ring-[#1455D9]/20 focus:border-[#1455D9]"
                  />
                </div>
              </div>

              {/* Position */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-[#101828] mb-1.5">
                  Position
                </label>
                <input
                  type="text"
                  placeholder="e.g. Tour Manager, Reservation Officer"
                  value={formPosition}
                  onChange={(e) => setFormPosition(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-white border border-[#D9E0EA] rounded-xl text-sm text-[#101828] placeholder-[#98A2B3] focus:outline-none focus:ring-2 focus:ring-[#1455D9]/20 focus:border-[#1455D9]"
                />
              </div>

              {/* Travel Agency & Cascaded Market Dropdowns */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-[#101828] mb-1.5">
                    Travel Agency <span className="text-red-500">*</span>
                  </label>
                  <select
                    required
                    value={formAgencyId}
                    onChange={(e) => handleFormAgencyChange(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-white border border-[#D9E0EA] rounded-xl text-sm font-medium text-[#101828] focus:outline-none focus:ring-2 focus:ring-[#1455D9]/20 focus:border-[#1455D9]"
                  >
                    <option value="" disabled>
                      Select Agency
                    </option>
                    {agencies.map((a) => (
                      <option key={a.id} value={a.id}>
                        {a.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-[#101828] mb-1.5">
                    Market <span className="text-red-500">*</span>
                  </label>
                  <select
                    required
                    value={formMarketId}
                    onChange={(e) => {
                      setFormMarketId(e.target.value);
                      setDuplicateWarning(null);
                    }}
                    disabled={availableMarketsForForm.length === 0}
                    className="w-full px-3.5 py-2.5 bg-white border border-[#D9E0EA] rounded-xl text-sm font-medium text-[#101828] focus:outline-none focus:ring-2 focus:ring-[#1455D9]/20 focus:border-[#1455D9] disabled:bg-slate-100 disabled:text-slate-400"
                  >
                    {availableMarketsForForm.length === 0 ? (
                      <option value="">No markets under this agency</option>
                    ) : (
                      <>
                        <option value="" disabled>
                          Select Market
                        </option>
                        {availableMarketsForForm.map((m) => (
                          <option key={m.id} value={m.id}>
                            {m.market_name}
                          </option>
                        ))}
                      </>
                    )}
                  </select>
                </div>
              </div>

              {/* Member Code */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-[#101828] mb-1.5">
                  Member Code (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. MEM-001"
                  value={formMemberCode}
                  onChange={(e) => setFormMemberCode(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-white border border-[#D9E0EA] rounded-xl text-sm text-[#101828] placeholder-[#98A2B3] focus:outline-none focus:ring-2 focus:ring-[#1455D9]/20 focus:border-[#1455D9]"
                />
              </div>

              {/* Actions: Cancel & Save */}
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
                  <span>{editingMember ? 'Save Changes' : 'Save Member'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal (Admin Only) */}
      {deletingMember && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#061D3D]/50 backdrop-blur-sm animate-fade-in">
          <div className="bg-white w-full max-w-md rounded-2xl border border-[#D9E0EA] shadow-2xl overflow-hidden p-6 space-y-4">
            <div className="flex items-center gap-3 text-red-600">
              <div className="p-2 bg-red-50 rounded-xl">
                <Trash2 className="w-6 h-6" />
              </div>
              <h3 className="font-bold text-lg text-[#101828]">Delete Contact Profile?</h3>
            </div>

            <p className="text-sm text-[#667085] leading-relaxed">
              Are you sure you want to delete <strong className="text-[#101828]">{deletingMember.full_name}</strong> ({deletingMember.email}) from <strong className="text-[#101828]">{deletingMember.agency_name}</strong>?
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
                  setDeletingMember(null);
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
