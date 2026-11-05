import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Search,
  CheckSquare,
  Square,
  Users,
  Mail,
  ShieldCheck,
  UserPlus,
  Building2,
  X,
  AlertTriangle,
  AlertCircle,
  Plus
} from 'lucide-react';
import { fetchAgencies, createAgency } from '../../services/agencyService';
import { fetchMarkets, createMarket } from '../../services/marketService';
import {
  fetchMembers,
  createMember,
  checkDuplicateEmail,
  CreateMemberInput
} from '../../services/memberService';
import { TravelAgencyRecord, AgencyMarketRecord, AgencyMemberRecord } from '../../types/agencyHierarchy';

export interface SelectedRecipient {
  memberId: string;
  fullName: string;
  email: string;
  agencyId: string;
  agencyName: string;
  marketId?: string;
  marketName?: string;
  designation?: string;
}

interface RecipientSelectorProps {
  onSelectionChange: (recipients: SelectedRecipient[]) => void;
  initialAgencyId?: string;
}

export const RecipientSelector: React.FC<RecipientSelectorProps> = ({
  onSelectionChange,
  initialAgencyId
}) => {
  const [agencies, setAgencies] = useState<TravelAgencyRecord[]>([]);
  const [selectedAgencyId, setSelectedAgencyId] = useState<string>(initialAgencyId || '');
  const [markets, setMarkets] = useState<{ id: string; market_name: string }[]>([]);
  const [selectedMarketIds, setSelectedMarketIds] = useState<string[]>([]);
  const [members, setMembers] = useState<AgencyMemberRecord[]>([]);
  const [selectedMemberIds, setSelectedMemberIds] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);

  // Quick Add Contact Modal State
  const [addContactModalOpen, setAddContactModalOpen] = useState(false);
  const [newAgencyMode, setNewAgencyMode] = useState(false);
  const [newMarketMode, setNewMarketMode] = useState(false);
  const [newAgencyName, setNewAgencyName] = useState('');
  const [newMarketName, setNewMarketName] = useState('');
  const [formAgencyId, setFormAgencyId] = useState('');
  const [formMarketId, setFormMarketId] = useState('');
  const [formFullName, setFormFullName] = useState('');
  const [formDesignation, setFormDesignation] = useState('');
  const [formEmail, setFormEmail] = useState('');
  const [formPhone, setFormPhone] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [duplicateWarning, setDuplicateWarning] = useState<string | null>(null);

  // Load agencies
  const loadAgencies = useCallback(async () => {
    const res = await fetchAgencies();
    setAgencies(res.data);
    if (!selectedAgencyId && res.data.length > 0 && res.data[0]) {
      setSelectedAgencyId(res.data[0].id);
    }
    return res.data;
  }, [selectedAgencyId]);

  useEffect(() => {
    loadAgencies();
  }, [loadAgencies]);

  // Load markets & members when agency changes
  const loadAgencyData = useCallback(async (agencyId: string) => {
    if (!agencyId) {
      setMarkets([]);
      setSelectedMarketIds([]);
      setMembers([]);
      setSelectedMemberIds([]);
      return;
    }

    setLoading(true);
    const [marketRes, memberRes] = await Promise.all([
      fetchMarkets(agencyId),
      fetchMembers(agencyId)
    ]);

    setMarkets(marketRes.data.map((m: AgencyMarketRecord) => ({ id: m.id, market_name: m.market_name })));
    const allMktIds = marketRes.data.map((m: AgencyMarketRecord) => m.id);
    setSelectedMarketIds(allMktIds);

    setMembers(memberRes.data);
    const validMemberIds = memberRes.data
      .filter((m: AgencyMemberRecord) => m.email && m.status === 'ACTIVE')
      .map((m: AgencyMemberRecord) => m.id);
    setSelectedMemberIds(validMemberIds);
    setLoading(false);
  }, []);

  useEffect(() => {
    loadAgencyData(selectedAgencyId);
  }, [selectedAgencyId, loadAgencyData]);

  // Filter members by selected markets and search query
  const filteredMembers = useMemo(() => {
    return members.filter((m) => {
      const inSelectedMarket = !m.market_id || selectedMarketIds.includes(m.market_id);
      const q = searchQuery.toLowerCase();
      const matchesSearch =
        q === '' ||
        m.full_name.toLowerCase().includes(q) ||
        (m.email && m.email.toLowerCase().includes(q)) ||
        (m.position && m.position.toLowerCase().includes(q)) ||
        (m.market_name && m.market_name.toLowerCase().includes(q));
      return inSelectedMarket && matchesSearch;
    });
  }, [members, selectedMarketIds, searchQuery]);

  // Notify parent of selected recipients with deduplicated emails
  useEffect(() => {
    const selectedAgency = agencies.find((a) => a.id === selectedAgencyId);
    const agencyName = selectedAgency ? selectedAgency.name : 'Unknown Agency';

    const seenEmails = new Set<string>();
    const recipients: SelectedRecipient[] = [];

    members.forEach((m) => {
      if (selectedMemberIds.includes(m.id) && m.email) {
        const normalizedEmail = m.email.toLowerCase().trim();
        if (!seenEmails.has(normalizedEmail)) {
          seenEmails.add(normalizedEmail);
          recipients.push({
            memberId: m.id,
            fullName: m.full_name,
            email: m.email,
            agencyId: selectedAgencyId,
            agencyName,
            marketId: m.market_id,
            marketName: m.market_name,
            designation: m.position || undefined
          });
        }
      }
    });

    onSelectionChange(recipients);
  }, [selectedMemberIds, members, selectedAgencyId, agencies, onSelectionChange]);

  const handleSelectAll = () => {
    const validFilteredIds = filteredMembers.filter((m) => m.email && m.status === 'ACTIVE').map((m) => m.id);
    setSelectedMemberIds((prev) => Array.from(new Set([...prev, ...validFilteredIds])));
  };

  const handleDeselectAll = () => {
    const filteredIdSet = new Set(filteredMembers.map((m) => m.id));
    setSelectedMemberIds((prev) => prev.filter((id) => !filteredIdSet.has(id)));
  };

  const toggleMember = (memberId: string) => {
    setSelectedMemberIds((prev) =>
      prev.includes(memberId) ? prev.filter((id) => id !== memberId) : [...prev, memberId]
    );
  };

  const toggleMarket = (marketId: string) => {
    setSelectedMarketIds((prev) =>
      prev.includes(marketId) ? prev.filter((id) => id !== marketId) : [...prev, marketId]
    );
  };

  // Open Quick Add Modal
  const openAddContactModal = () => {
    setFormAgencyId(selectedAgencyId);
    setFormMarketId(markets.length > 0 && markets[0] ? markets[0].id : '');
    setFormFullName('');
    setFormDesignation('');
    setFormEmail('');
    setFormPhone('');
    setNewAgencyMode(false);
    setNewMarketMode(false);
    setNewAgencyName('');
    setNewMarketName('');
    setFormError(null);
    setDuplicateWarning(null);
    setAddContactModalOpen(true);
  };

  // Pre-flight duplicate email checking
  const handleEmailBlur = async () => {
    if (!formEmail.trim() || !formAgencyId || !formMarketId) return;
    try {
      const result = await checkDuplicateEmail(formEmail, formAgencyId, formMarketId);
      if (result.isDuplicate && result.existingMember) {
        if (result.isSameAgencyMarket) {
          setDuplicateWarning(
            `Notice: ${result.existingMember.full_name} is already registered under this market with this email.`
          );
        } else {
          setDuplicateWarning(
            `Cross-desk duplicate: This email is also used by ${result.existingMember.full_name} at ${result.existingMember.agency_name} (${result.existingMember.market_name}).`
          );
        }
      } else {
        setDuplicateWarning(null);
      }
    } catch {
      // Ignore background check error
    }
  };

  // Handle Quick Add Contact Submit
  const handleSaveContact = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    let targetAgencyId = formAgencyId;
    let targetMarketId = formMarketId;

    // 1. Create new agency if needed
    if (newAgencyMode) {
      if (!newAgencyName.trim()) {
        setFormError('Please enter a Travel Agency name.');
        return;
      }
      const agencyRes = await createAgency({ name: newAgencyName.trim() });
      if (agencyRes.error || !agencyRes.data) {
        setFormError(`Agency creation failed: ${agencyRes.error}`);
        return;
      }
      targetAgencyId = agencyRes.data.id;
      await loadAgencies();
      setSelectedAgencyId(targetAgencyId);
    }

    // 2. Create new market if needed
    if (newMarketMode || !targetMarketId) {
      const mktName = newMarketName.trim() || 'General Market';
      const mktRes = await createMarket({
        agency_id: targetAgencyId,
        market_name: mktName
      });
      if (mktRes.error || !mktRes.data) {
        setFormError(`Market creation failed: ${mktRes.error}`);
        return;
      }
      targetMarketId = mktRes.data.id;
    }

    // 3. Validation
    if (!formFullName.trim()) {
      setFormError('Please enter the contact person’s full name.');
      return;
    }
    if (!formEmail.trim() || !formEmail.includes('@')) {
      setFormError('Please enter a valid email address.');
      return;
    }

    try {
      setIsSubmitting(true);
      const memberInput: CreateMemberInput = {
        agency_id: targetAgencyId,
        market_id: targetMarketId,
        full_name: formFullName.trim(),
        position: formDesignation.trim() || undefined,
        email: formEmail.trim().toLowerCase(),
        phone: formPhone.trim() || undefined,
        status: 'ACTIVE'
      };

      const res = await createMember(memberInput);
      if (res.error || !res.data) {
        setFormError(res.error || 'Failed to save contact.');
        return;
      }

      // 4. Update local state & immediately select the new contact
      const newMember = res.data;
      if (targetAgencyId === selectedAgencyId) {
        await loadAgencyData(targetAgencyId);
        setSelectedMemberIds((prev) => [...prev, newMember.id]);
      } else {
        setSelectedAgencyId(targetAgencyId);
        // Will trigger loadAgencyData
      }

      setAddContactModalOpen(false);
    } catch (err: unknown) {
      setFormError(err instanceof Error ? err.message : 'Error creating contact member.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const currentAgency = agencies.find((a) => a.id === selectedAgencyId);

  return (
    <div className="space-y-4">
      {/* 1. Select Parent Agency + Quick Add Action */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
        <div className="flex-1">
          <label className="block text-xs font-semibold uppercase tracking-wider text-[#667085] mb-2">
            1. Select Travel Agency / Partner Company
          </label>
          <div className="relative">
            <select
              value={selectedAgencyId}
              onChange={(e) => setSelectedAgencyId(e.target.value)}
              className="w-full h-11 pl-10 pr-4 rounded-xl border border-[#D9E0EA] bg-[#F8FAFC] text-sm text-[#101828] font-medium focus:outline-none focus:ring-2 focus:ring-[#1455D9] focus:bg-white"
            >
              {agencies.map((agency) => (
                <option key={agency.id} value={agency.id}>
                  {agency.name} ({agency.code || 'No Code'}) — {agency.city || 'Global'}
                </option>
              ))}
            </select>
            <Building2 className="w-5 h-5 text-[#667085] absolute left-3 top-3 pointer-events-none" />
          </div>
        </div>

        <div>
          <button
            type="button"
            onClick={openAddContactModal}
            className="h-11 px-4 rounded-xl bg-[#EAF2FF] text-[#1455D9] hover:bg-blue-100 font-bold text-xs flex items-center justify-center gap-1.5 border border-[#B2CCFF] transition-colors whitespace-nowrap shadow-xs"
          >
            <UserPlus className="w-4 h-4" /> Add New Contact
          </button>
        </div>
      </div>

      {/* 2. Market Filters */}
      {markets.length > 0 && (
        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-[#667085] mb-2">
            2. Regional Market Desks (Filter)
          </label>
          <div className="flex flex-wrap gap-2">
            {markets.map((mkt) => {
              const isSelected = selectedMarketIds.includes(mkt.id);
              return (
                <button
                  key={mkt.id}
                  type="button"
                  onClick={() => toggleMarket(mkt.id)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors flex items-center gap-1.5 ${
                    isSelected
                      ? 'bg-[#EAF2FF] text-[#1455D9] border-[#B2CCFF]'
                      : 'bg-white text-[#667085] border-[#D9E0EA] hover:bg-slate-50'
                  }`}
                >
                  {isSelected ? <CheckSquare className="w-3.5 h-3.5" /> : <Square className="w-3.5 h-3.5" />}
                  {mkt.market_name}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* 3. Member Selection Table */}
      <div className="border border-[#D9E0EA] rounded-xl overflow-hidden bg-white">
        <div className="p-3 bg-[#F8FAFC] border-b border-[#D9E0EA] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="relative flex-1 max-w-sm">
            <Search className="w-4 h-4 text-[#667085] absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search contacts by name, designation, email..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full h-9 pl-9 pr-3 rounded-lg border border-[#D9E0EA] bg-white text-xs text-[#101828] focus:outline-none focus:ring-1 focus:ring-[#1455D9]"
            />
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleSelectAll}
              className="px-2.5 py-1 text-xs font-medium rounded-lg text-[#1455D9] hover:bg-[#EAF2FF]"
            >
              Select All
            </button>
            <span className="text-[#D9E0EA]">|</span>
            <button
              type="button"
              onClick={handleDeselectAll}
              className="px-2.5 py-1 text-xs font-medium rounded-lg text-[#667085] hover:bg-slate-100"
            >
              Deselect All
            </button>
          </div>
        </div>

        {/* Member list */}
        <div className="max-h-60 overflow-y-auto divide-y divide-[#D9E0EA]">
          {loading ? (
            <div className="p-6 text-center text-xs text-[#667085]">Loading contact members...</div>
          ) : filteredMembers.length === 0 ? (
            <div className="p-6 text-center text-xs text-[#667085] space-y-2">
              <p>No contact members found matching filters for {currentAgency?.name}.</p>
              <button
                type="button"
                onClick={openAddContactModal}
                className="text-xs text-[#1455D9] font-bold underline inline-flex items-center gap-1"
              >
                <Plus className="w-3.5 h-3.5" /> Add a contact person now
              </button>
            </div>
          ) : (
            filteredMembers.map((member) => {
              const isSelected = selectedMemberIds.includes(member.id);
              const hasEmail = Boolean(member.email);

              return (
                <div
                  key={member.id}
                  onClick={() => hasEmail && toggleMember(member.id)}
                  className={`p-3 flex items-center justify-between gap-3 cursor-pointer hover:bg-slate-50 transition-colors ${
                    !hasEmail ? 'opacity-50 cursor-not-allowed bg-slate-50' : isSelected ? 'bg-blue-50/40' : ''
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      disabled={!hasEmail}
                      className="text-[#1455D9]"
                    >
                      {isSelected ? (
                        <CheckSquare className="w-4 h-4" />
                      ) : (
                        <Square className="w-4 h-4 text-[#98A2B3]" />
                      )}
                    </button>
                    <div>
                      <div className="text-xs font-semibold text-[#101828] flex items-center gap-2">
                        {member.full_name}
                        {member.position && (
                          <span className="text-[10px] text-[#667085] font-normal">
                            ({member.position})
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] text-[#667085] flex items-center gap-1.5 mt-0.5">
                        <Mail className="w-3 h-3 text-[#98A2B3]" />
                        {member.email || <span className="text-amber-600 font-medium">No email address</span>}
                        {member.market_name && (
                          <span className="px-1.5 py-0.2 rounded bg-slate-100 text-[10px] text-slate-700">
                            {member.market_name}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div>
                    {member.status === 'ACTIVE' ? (
                      <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-emerald-50 text-emerald-700">
                        Active
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-slate-100 text-slate-600">
                        Inactive
                      </span>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Selected count footer */}
        <div className="p-3 bg-[#F8FAFC] border-t border-[#D9E0EA] flex items-center justify-between text-xs text-[#667085]">
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-[#1455D9]" />
            <span>
              <strong>{selectedMemberIds.length}</strong> recipients selected for{' '}
              <strong>{currentAgency?.name}</strong>
            </span>
          </div>
          <span className="text-[11px] text-emerald-700 flex items-center gap-1">
            <ShieldCheck className="w-3.5 h-3.5" /> Deduplication active
          </span>
        </div>
      </div>

      {/* QUICK ADD CONTACT MODAL */}
      {addContactModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl border border-[#D9E0EA] shadow-xl max-w-lg w-full overflow-hidden">
            <div className="p-4 border-b border-[#D9E0EA] flex items-center justify-between bg-[#F8FAFC]">
              <div className="flex items-center gap-2">
                <UserPlus className="w-5 h-5 text-[#1455D9]" />
                <h3 className="font-bold text-sm text-[#101828]">Add New Agency Contact</h3>
              </div>
              <button
                type="button"
                onClick={() => setAddContactModalOpen(false)}
                className="text-[#667085] hover:text-[#101828]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveContact} className="p-5 space-y-4">
              {formError && (
                <div className="p-3 rounded-lg bg-red-50 text-red-700 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  <span>{formError}</span>
                </div>
              )}

              {duplicateWarning && (
                <div className="p-3 rounded-lg bg-amber-50 text-amber-800 text-xs flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 flex-shrink-0 text-amber-600" />
                  <span>{duplicateWarning}</span>
                </div>
              )}

              {/* Agency Selector or New Agency Input */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-semibold text-[#667085]">
                    Travel Agency / Company *
                  </label>
                  <button
                    type="button"
                    onClick={() => setNewAgencyMode(!newAgencyMode)}
                    className="text-[11px] text-[#1455D9] hover:underline font-semibold"
                  >
                    {newAgencyMode ? 'Select Existing Agency' : '+ Create New Agency'}
                  </button>
                </div>

                {newAgencyMode ? (
                  <input
                    type="text"
                    required
                    placeholder="e.g. Jetwing Travels or Walkers Tours"
                    value={newAgencyName}
                    onChange={(e) => setNewAgencyName(e.target.value)}
                    className="w-full h-9 px-3 rounded-lg border border-[#D9E0EA] text-xs text-[#101828]"
                  />
                ) : (
                  <select
                    value={formAgencyId}
                    onChange={(e) => setFormAgencyId(e.target.value)}
                    className="w-full h-9 px-3 rounded-lg border border-[#D9E0EA] text-xs text-[#101828]"
                  >
                    {agencies.map((a) => (
                      <option key={a.id} value={a.id}>{a.name}</option>
                    ))}
                  </select>
                )}
              </div>

              {/* Market Selector or New Market Input */}
              {!newAgencyMode && (
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs font-semibold text-[#667085]">
                      Regional Market Desk *
                    </label>
                    <button
                      type="button"
                      onClick={() => setNewMarketMode(!newMarketMode)}
                      className="text-[11px] text-[#1455D9] hover:underline font-semibold"
                    >
                      {newMarketMode ? 'Select Existing Market' : '+ Create New Market'}
                    </button>
                  </div>

                  {newMarketMode ? (
                    <input
                      type="text"
                      required
                      placeholder="e.g. Indian Market Desk"
                      value={newMarketName}
                      onChange={(e) => setNewMarketName(e.target.value)}
                      className="w-full h-9 px-3 rounded-lg border border-[#D9E0EA] text-xs text-[#101828]"
                    />
                  ) : (
                    <select
                      value={formMarketId}
                      onChange={(e) => setFormMarketId(e.target.value)}
                      className="w-full h-9 px-3 rounded-lg border border-[#D9E0EA] text-xs text-[#101828]"
                    >
                      {markets.map((m) => (
                        <option key={m.id} value={m.id}>{m.market_name}</option>
                      ))}
                    </select>
                  )}
                </div>
              )}

              {/* Contact Full Name & Designation */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-[#667085] mb-1">
                    Person Full Name *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. John Doe"
                    value={formFullName}
                    onChange={(e) => setFormFullName(e.target.value)}
                    className="w-full h-9 px-3 rounded-lg border border-[#D9E0EA] text-xs text-[#101828]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#667085] mb-1">
                    Designation / Title
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Inbound Sales Lead"
                    value={formDesignation}
                    onChange={(e) => setFormDesignation(e.target.value)}
                    className="w-full h-9 px-3 rounded-lg border border-[#D9E0EA] text-xs text-[#101828]"
                  />
                </div>
              </div>

              {/* Email & Phone */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-[#667085] mb-1">
                    Email Address *
                  </label>
                  <input
                    type="email"
                    required
                    placeholder="contact@agency.com"
                    value={formEmail}
                    onChange={(e) => setFormEmail(e.target.value)}
                    onBlur={handleEmailBlur}
                    className="w-full h-9 px-3 rounded-lg border border-[#D9E0EA] text-xs text-[#101828]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#667085] mb-1">
                    Phone / Mobile
                  </label>
                  <input
                    type="tel"
                    placeholder="+94 77 123 4567"
                    value={formPhone}
                    onChange={(e) => setFormPhone(e.target.value)}
                    className="w-full h-9 px-3 rounded-lg border border-[#D9E0EA] text-xs text-[#101828]"
                  />
                </div>
              </div>

              <div className="pt-2 flex justify-end gap-3 border-t border-[#D9E0EA]">
                <button
                  type="button"
                  onClick={() => setAddContactModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-[#667085] hover:bg-slate-100 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 text-xs font-bold text-white bg-[#1455D9] hover:bg-blue-700 rounded-lg shadow-xs"
                >
                  {isSubmitting ? 'Saving...' : 'Save & Select Contact'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
