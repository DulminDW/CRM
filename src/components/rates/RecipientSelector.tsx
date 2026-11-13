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
  Plus,
  Check,
  Filter,
  UserCheck
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

export type RecipientScope = 'COMPANY' | 'MARKETS' | 'INDIVIDUALS';

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

export interface RecipientValidationState {
  hasInvalidEmails: boolean;
  hasDuplicateEmails: boolean;
  invalidEmailCount: number;
  duplicateEmailCount: number;
  duplicateEmailWarnings: { email: string; members: AgencyMemberRecord[] }[];
  invalidEmailContacts: AgencyMemberRecord[];
}

interface RecipientSelectorProps {
  onSelectionChange: (recipients: SelectedRecipient[]) => void;
  onScopeChange?: (scope: RecipientScope) => void;
  onValidationChange?: (validationState: RecipientValidationState) => void;
  initialAgencyId?: string;
}

// Validation regex matching PostgreSQL email constraints
const EMAIL_REGEX = /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/;

export const RecipientSelector: React.FC<RecipientSelectorProps> = ({
  onSelectionChange,
  onScopeChange,
  onValidationChange,
  initialAgencyId
}) => {
  // Master Agency list
  const [agencies, setAgencies] = useState<TravelAgencyRecord[]>([]);
  const [selectedAgencyId, setSelectedAgencyId] = useState<string>(initialAgencyId || '');

  // Hierarchy Data for the Selected Agency
  const [markets, setMarkets] = useState<{ id: string; market_name: string }[]>([]);
  const [members, setMembers] = useState<AgencyMemberRecord[]>([]);
  const [loading, setLoading] = useState(false);

  // Recipient Scopes: 1. COMPANY, 2. MARKETS, 3. INDIVIDUALS
  const [scope, setScope] = useState<RecipientScope>('INDIVIDUALS');

  // Scope 2: Selected Market(s)
  const [selectedMarketIds, setSelectedMarketIds] = useState<string[]>([]);

  // Scope 3: Selected Individual Member IDs
  const [selectedMemberIds, setSelectedMemberIds] = useState<string[]>([]);

  // Search query within contacts list
  const [searchQuery, setSearchQuery] = useState('');

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

  // 1. Load agencies on mount
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

  // 2. Load hierarchy data (markets & members) strictly belonging to the selected agency
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

    const agencyMarkets = marketRes.data.map((m: AgencyMarketRecord) => ({
      id: m.id,
      market_name: m.market_name
    }));
    setMarkets(agencyMarkets);

    // Filter members to strictly belong to this agency
    const agencyMembers = memberRes.data.filter(
      (m: AgencyMemberRecord) => m.agency_id === agencyId
    );
    setMembers(agencyMembers);

    // Default market selection: select all markets in the agency
    setSelectedMarketIds(agencyMarkets.map((m: { id: string }) => m.id));

    // Default member selection based on scope:
    const validMemberIds = agencyMembers
      .filter((m: AgencyMemberRecord) => m.email && EMAIL_REGEX.test(m.email.trim()) && m.status === 'ACTIVE')
      .map((m: AgencyMemberRecord) => m.id);
    setSelectedMemberIds(validMemberIds);

    setLoading(false);
  }, []);

  useEffect(() => {
    loadAgencyData(selectedAgencyId);
  }, [selectedAgencyId, loadAgencyData]);

  // Notify parent of scope changes
  const handleScopeChange = (newScope: RecipientScope) => {
    setScope(newScope);
    if (onScopeChange) {
      onScopeChange(newScope);
    }

    // Auto-align selections based on newly selected scope
    if (newScope === 'COMPANY') {
      // Entire Company: select all active members with valid email in this agency
      const validAgencyMemberIds = members
        .filter((m) => m.agency_id === selectedAgencyId && m.email && EMAIL_REGEX.test(m.email.trim()) && m.status === 'ACTIVE')
        .map((m) => m.id);
      setSelectedMemberIds(validAgencyMemberIds);
      setSelectedMarketIds(markets.map((m) => m.id));
    } else if (newScope === 'MARKETS') {
      // Selected Markets: select all members belonging to currently selected markets
      const validMarketMemberIds = members
        .filter((m) =>
          m.agency_id === selectedAgencyId &&
          m.market_id &&
          selectedMarketIds.includes(m.market_id) &&
          m.email &&
          EMAIL_REGEX.test(m.email.trim()) &&
          m.status === 'ACTIVE'
        )
        .map((m) => m.id);
      setSelectedMemberIds(validMarketMemberIds);
    }
  };

  // When selected markets change under 'MARKETS' scope, dynamically align the selected members
  const toggleMarket = (marketId: string) => {
    const updatedMarketIds = selectedMarketIds.includes(marketId)
      ? selectedMarketIds.filter((id) => id !== marketId)
      : [...selectedMarketIds, marketId];
    
    setSelectedMarketIds(updatedMarketIds);

    if (scope === 'MARKETS') {
      const validMarketMemberIds = members
        .filter((m) =>
          m.agency_id === selectedAgencyId &&
          m.market_id &&
          updatedMarketIds.includes(m.market_id) &&
          m.email &&
          EMAIL_REGEX.test(m.email.trim()) &&
          m.status === 'ACTIVE'
        )
        .map((m) => m.id);
      setSelectedMemberIds(validMarketMemberIds);
    }
  };

  // Contacts visible for individual selection (filtered by search query & market if in markets mode)
  const visibleMembers = useMemo(() => {
    return members.filter((m) => {
      // Strict agency match
      if (m.agency_id !== selectedAgencyId) return false;

      // In MARKETS scope, only show members in selected markets
      if (scope === 'MARKETS' && m.market_id && !selectedMarketIds.includes(m.market_id)) {
        return false;
      }

      const q = searchQuery.toLowerCase().trim();
      if (!q) return true;

      return (
        m.full_name.toLowerCase().includes(q) ||
        (m.email && m.email.toLowerCase().includes(q)) ||
        (m.position && m.position.toLowerCase().includes(q)) ||
        (m.market_name && m.market_name.toLowerCase().includes(q))
      );
    });
  }, [members, selectedAgencyId, scope, selectedMarketIds, searchQuery]);

  // Compute final recipients with strict deduplication by normalized email and hierarchy validation
  // Also collect duplicate warnings and invalid emails
  const { finalRecipients, duplicateEmailWarnings, invalidEmailContacts } = useMemo(() => {
    const selectedAgency = agencies.find((a) => a.id === selectedAgencyId);
    const agencyName = selectedAgency ? selectedAgency.name : 'Unknown Agency';

    // Map: normalized email -> list of members sharing that email
    const emailToMembersMap = new Map<string, AgencyMemberRecord[]>();
    const invalidList: AgencyMemberRecord[] = [];

    // Filter candidate members according to current scope
    const candidateMembers = members.filter((m) => {
      // 1. Strict agency integrity check (Never include contacts from another agency)
      if (m.agency_id !== selectedAgencyId) return false;

      // 2. Scope check
      if (scope === 'COMPANY') {
        return true;
      } else if (scope === 'MARKETS') {
        return Boolean(m.market_id && selectedMarketIds.includes(m.market_id));
      } else {
        return selectedMemberIds.includes(m.id);
      }
    });

    candidateMembers.forEach((m) => {
      if (!m.email || !EMAIL_REGEX.test(m.email.trim())) {
        invalidList.push(m);
        return;
      }

      if (m.status !== 'ACTIVE') return;

      const norm = m.email.toLowerCase().trim();
      const existing = emailToMembersMap.get(norm) || [];
      existing.push(m);
      emailToMembersMap.set(norm, existing);
    });

    const duplicates: { email: string; members: AgencyMemberRecord[] }[] = [];
    const recipients: SelectedRecipient[] = [];

    emailToMembersMap.forEach((mList, normEmail) => {
      if (mList.length > 1) {
        duplicates.push({ email: normEmail, members: mList });
      }
      // Select the first valid member for this unique email
      const primaryMember = mList[0];
      if (primaryMember) {
        recipients.push({
          memberId: primaryMember.id,
          fullName: primaryMember.full_name,
          email: primaryMember.email.trim(),
          agencyId: selectedAgencyId,
          agencyName,
          marketId: primaryMember.market_id,
          marketName: primaryMember.market_name,
          designation: primaryMember.position || undefined
        });
      }
    });

    return {
      finalRecipients: recipients,
      duplicateEmailWarnings: duplicates,
      invalidEmailContacts: invalidList
    };
  }, [members, agencies, selectedAgencyId, scope, selectedMarketIds, selectedMemberIds]);

  // Notify parent component whenever finalRecipients change or validation state changes
  useEffect(() => {
    onSelectionChange(finalRecipients);
  }, [finalRecipients, onSelectionChange]);

  useEffect(() => {
    if (onValidationChange) {
      onValidationChange({
        hasInvalidEmails: invalidEmailContacts.length > 0,
        hasDuplicateEmails: duplicateEmailWarnings.length > 0,
        invalidEmailCount: invalidEmailContacts.length,
        duplicateEmailCount: duplicateEmailWarnings.length,
        duplicateEmailWarnings,
        invalidEmailContacts
      });
    }
  }, [invalidEmailContacts, duplicateEmailWarnings, onValidationChange]);

  // Individual Selection Controls
  const handleSelectAllVisible = () => {
    const validVisibleIds = visibleMembers
      .filter((m) => m.email && EMAIL_REGEX.test(m.email.trim()) && m.status === 'ACTIVE')
      .map((m) => m.id);
    setSelectedMemberIds((prev) => Array.from(new Set([...prev, ...validVisibleIds])));
  };

  const handleDeselectAllVisible = () => {
    const visibleIdSet = new Set(visibleMembers.map((m) => m.id));
    setSelectedMemberIds((prev) => prev.filter((id) => !visibleIdSet.has(id)));
  };

  const toggleIndividualMember = (memberId: string) => {
    setSelectedMemberIds((prev) =>
      prev.includes(memberId) ? prev.filter((id) => id !== memberId) : [...prev, memberId]
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
            `Notice: ${result.existingMember.full_name} is already registered under this market desk.`
          );
        } else {
          setDuplicateWarning(
            `Cross-desk notice: This email is already registered to ${result.existingMember.full_name} under ${result.existingMember.agency_name} (${result.existingMember.market_name}).`
          );
        }
      } else {
        setDuplicateWarning(null);
      }
    } catch {
      // Ignore background check failure
    }
  };

  // Save new contact and make it immediately selectable
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
      const mktName = newMarketName.trim() || 'General Market Desk';
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
    if (!formEmail.trim() || !EMAIL_REGEX.test(formEmail.trim())) {
      setFormError('Please enter a valid email address (e.g., name@agency.com).');
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

      // 4. Update hierarchy and ensure the new contact is immediately available and selected
      const newMember = res.data;
      if (targetAgencyId === selectedAgencyId) {
        await loadAgencyData(targetAgencyId);
        setSelectedMemberIds((prev) => [...prev, newMember.id]);
        if (targetMarketId && !selectedMarketIds.includes(targetMarketId)) {
          setSelectedMarketIds((prev) => [...prev, targetMarketId]);
        }
      } else {
        setSelectedAgencyId(targetAgencyId);
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
      {/* 1. Travel Agency Selector + Quick Add Contact Action */}
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

      {/* 2. Three Recipient Scopes (Company → Market → Individual) */}
      <div className="space-y-2">
        <label className="block text-xs font-semibold uppercase tracking-wider text-[#667085]">
          2. Recipient Scope Mode
        </label>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
          <button
            type="button"
            onClick={() => handleScopeChange('COMPANY')}
            className={`p-3 rounded-xl border text-left transition-all flex flex-col justify-between min-h-[44px] touch-manipulation ${
              scope === 'COMPANY'
                ? 'border-[#1455D9] bg-[#EAF2FF]/60 text-[#1455D9] ring-2 ring-[#1455D9]/20'
                : 'border-[#D9E0EA] bg-white text-[#667085] hover:bg-slate-50'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-wider">Scope 1</span>
              {scope === 'COMPANY' && <Check className="w-4 h-4 text-[#1455D9]" />}
            </div>
            <div className="mt-1 font-bold text-xs text-[#101828]">Entire Company</div>
            <span className="text-[10px] text-[#667085] mt-0.5">All contacts in agency</span>
          </button>

          <button
            type="button"
            onClick={() => handleScopeChange('MARKETS')}
            className={`p-3 rounded-xl border text-left transition-all flex flex-col justify-between min-h-[44px] touch-manipulation ${
              scope === 'MARKETS'
                ? 'border-[#1455D9] bg-[#EAF2FF]/60 text-[#1455D9] ring-2 ring-[#1455D9]/20'
                : 'border-[#D9E0EA] bg-white text-[#667085] hover:bg-slate-50'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-wider">Scope 2</span>
              {scope === 'MARKETS' && <Check className="w-4 h-4 text-[#1455D9]" />}
            </div>
            <div className="mt-1 font-bold text-xs text-[#101828]">Selected Market(s)</div>
            <span className="text-[10px] text-[#667085] mt-0.5">By regional desks</span>
          </button>

          <button
            type="button"
            onClick={() => handleScopeChange('INDIVIDUALS')}
            className={`p-3 rounded-xl border text-left transition-all flex flex-col justify-between min-h-[44px] touch-manipulation ${
              scope === 'INDIVIDUALS'
                ? 'border-[#1455D9] bg-[#EAF2FF]/60 text-[#1455D9] ring-2 ring-[#1455D9]/20'
                : 'border-[#D9E0EA] bg-white text-[#667085] hover:bg-slate-50'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-wider">Scope 3</span>
              {scope === 'INDIVIDUALS' && <Check className="w-4 h-4 text-[#1455D9]" />}
            </div>
            <div className="mt-1 font-bold text-xs text-[#101828]">Selected Individuals</div>
            <span className="text-[10px] text-[#667085] mt-0.5">Custom member picks</span>
          </button>
        </div>
      </div>

      {/* 3. Regional Markets Filter (Visible in MARKETS scope or optionally as a filter) */}
      {markets.length > 0 && (
        <div className="bg-[#F8FAFC] p-3.5 rounded-xl border border-[#D9E0EA] space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-xs font-semibold text-[#101828] flex items-center gap-1.5">
              <Filter className="w-3.5 h-3.5 text-[#1455D9]" />
              <span>Regional Market Desks under {currentAgency?.name || 'Selected Agency'}</span>
            </label>
            <span className="text-[11px] text-[#667085]">
              {selectedMarketIds.length} of {markets.length} desks selected
            </span>
          </div>

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

      {/* Validation Warnings: Duplicate Emails or Invalid Formats */}
      {duplicateEmailWarnings.length > 0 && (
        <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-900 space-y-1">
          <div className="flex items-center gap-1.5 font-bold text-amber-950">
            <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0" />
            <span>Duplicate Email Address Detected ({duplicateEmailWarnings.length})</span>
          </div>
          <p className="text-[11px] text-amber-800">
            Multiple members share the same email address. The system automatically deduplicates to send only one email per address to prevent multiple emails to the same inbox:
          </p>
          <ul className="list-disc list-inside text-[11px] text-amber-900 pl-1">
            {duplicateEmailWarnings.map((dup) => (
              <li key={dup.email}>
                <strong>{dup.email}</strong>: shared by {dup.members.map((m) => m.full_name).join(', ')}
              </li>
            ))}
          </ul>
        </div>
      )}

      {invalidEmailContacts.length > 0 && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-900 space-y-1">
          <div className="flex items-center gap-1.5 font-bold text-red-950">
            <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0" />
            <span>Contacts with Invalid or Missing Email ({invalidEmailContacts.length})</span>
          </div>
          <p className="text-[11px] text-red-800">
            The following contacts were excluded from rate sharing because they lack a RFC 5322 compliant email address:
          </p>
          <div className="text-[11px] text-red-700 pl-1">
            {invalidEmailContacts.map((c) => `${c.full_name} (${c.email || 'no email'})`).join(', ')}
          </div>
        </div>
      )}

      {/* 4. Contact Individuals Selection Table */}
      <div className="border border-[#D9E0EA] rounded-xl overflow-hidden bg-white shadow-xs">
        {/* Table Toolbar */}
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

          {scope === 'INDIVIDUALS' ? (
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleSelectAllVisible}
                className="px-2.5 py-1 text-xs font-semibold rounded-lg text-[#1455D9] hover:bg-[#EAF2FF] transition-colors"
              >
                Select All
              </button>
              <span className="text-[#D9E0EA]">|</span>
              <button
                type="button"
                onClick={handleDeselectAllVisible}
                className="px-2.5 py-1 text-xs font-semibold rounded-lg text-[#667085] hover:bg-slate-100 transition-colors"
              >
                Deselect All
              </button>
            </div>
          ) : (
            <div className="text-xs text-[#667085] flex items-center gap-1">
              <UserCheck className="w-3.5 h-3.5 text-[#1455D9]" />
              <span>
                {scope === 'COMPANY' ? 'Entire Company targeting active' : 'Market-based targeting active'}
              </span>
            </div>
          )}
        </div>

        {/* Member List */}
        <div className="max-h-60 overflow-y-auto divide-y divide-[#D9E0EA]">
          {loading ? (
            <div className="p-6 text-center text-xs text-[#667085]">Loading contact members...</div>
          ) : visibleMembers.length === 0 ? (
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
            visibleMembers.map((member) => {
              const hasValidEmail = Boolean(member.email && EMAIL_REGEX.test(member.email.trim()));
              const isEligible = hasValidEmail && member.status === 'ACTIVE';

              // Selection status depends on current scope
              let isSelected = false;
              if (scope === 'COMPANY') {
                isSelected = isEligible && selectedMemberIds.includes(member.id);
              } else if (scope === 'MARKETS') {
                isSelected = isEligible && Boolean(member.market_id && selectedMarketIds.includes(member.market_id)) && selectedMemberIds.includes(member.id);
              } else {
                isSelected = selectedMemberIds.includes(member.id);
              }

              return (
                <div
                  key={member.id}
                  onClick={() => {
                    if (isEligible) {
                      toggleIndividualMember(member.id);
                      if (scope !== 'INDIVIDUALS') {
                        setScope('INDIVIDUALS');
                        if (onScopeChange) onScopeChange('INDIVIDUALS');
                      }
                    }
                  }}
                  className={`p-3 flex items-center justify-between gap-3 transition-colors ${
                    !isEligible
                      ? 'opacity-50 cursor-not-allowed bg-slate-50'
                      : 'cursor-pointer hover:bg-slate-50'
                  } ${isSelected && isEligible ? 'bg-blue-50/40' : ''}`}
                >
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      disabled={!isEligible}
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
                        {hasValidEmail ? (
                          <span>{member.email}</span>
                        ) : (
                          <span className="text-amber-600 font-medium flex items-center gap-1">
                            <AlertCircle className="w-3 h-3" />
                            {member.email ? 'Invalid email format' : 'Missing email'}
                          </span>
                        )}
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
              <strong>{finalRecipients.length}</strong> unique recipients confirmed for{' '}
              <strong>{currentAgency?.name}</strong>
            </span>
          </div>
          <span className="text-[11px] text-emerald-700 flex items-center gap-1">
            <ShieldCheck className="w-3.5 h-3.5" /> Deduplicated &amp; Validated
          </span>
        </div>
      </div>

      {/* 5. Active Recipient Preview / Confirmation List */}
      {finalRecipients.length > 0 && (
        <div className="p-3.5 rounded-xl border border-blue-200 bg-blue-50/50 space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="font-bold text-[#101828] flex items-center gap-1.5">
              <Mail className="w-4 h-4 text-[#1455D9]" />
              Confirmed Outgoing Recipient List ({finalRecipients.length})
            </span>
            <span className="text-[10px] font-semibold text-blue-700 uppercase bg-blue-100 px-2 py-0.5 rounded-full">
              No auto-send on selection
            </span>
          </div>
          <div className="max-h-24 overflow-y-auto space-y-1">
            {finalRecipients.map((rec) => (
              <div
                key={rec.memberId}
                className="text-[11px] text-slate-700 bg-white px-2.5 py-1 rounded border border-blue-100 flex items-center justify-between"
              >
                <span>
                  <strong>{rec.fullName}</strong> {rec.designation ? `(${rec.designation})` : ''} — {rec.email}
                </span>
                <span className="text-[10px] text-slate-400">{rec.marketName || 'General Desk'}</span>
              </div>
            ))}
          </div>
        </div>
      )}

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
