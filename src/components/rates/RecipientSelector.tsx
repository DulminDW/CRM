import React, { useState, useEffect, useMemo } from 'react';
import { Search, CheckSquare, Square, Users, Mail, ShieldCheck } from 'lucide-react';
import { fetchAgencies } from '../../services/agencyService';
import { fetchMarkets } from '../../services/marketService';
import { fetchMembers } from '../../services/memberService';
import { TravelAgencyRecord, AgencyMarketRecord, AgencyMemberRecord } from '../../types/agencyHierarchy';

export interface SelectedRecipient {
  memberId: string;
  fullName: string;
  email: string;
  agencyId: string;
  agencyName: string;
  marketId?: string;
  marketName?: string;
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

  // Load agencies
  useEffect(() => {
    fetchAgencies().then((res) => {
      setAgencies(res.data);
      if (!selectedAgencyId && res.data.length > 0 && res.data[0]) {
        setSelectedAgencyId(res.data[0].id);
      }
    });
  }, [selectedAgencyId]);

  // Load markets when agency changes
  useEffect(() => {
    if (!selectedAgencyId) {
      setMarkets([]);
      setSelectedMarketIds([]);
      setMembers([]);
      setSelectedMemberIds([]);
      return;
    }

    setLoading(true);
    fetchMarkets(selectedAgencyId).then((res) => {
      setMarkets(res.data.map((m: AgencyMarketRecord) => ({ id: m.id, market_name: m.market_name })));
      const allMktIds = res.data.map((m: AgencyMarketRecord) => m.id);
      setSelectedMarketIds(allMktIds);
    });

    // Fetch members for this agency
    fetchMembers(selectedAgencyId).then((res) => {
      setMembers(res.data);
      const validMemberIds = res.data.filter((m: AgencyMemberRecord) => m.email && m.status === 'ACTIVE').map((m: AgencyMemberRecord) => m.id);
      setSelectedMemberIds(validMemberIds);
      setLoading(false);
    });
  }, [selectedAgencyId]);

  // Filter members by selected markets and search query
  const filteredMembers = useMemo(() => {
    return members.filter((m) => {
      const inSelectedMarket = !m.market_id || selectedMarketIds.includes(m.market_id);
      const matchesSearch =
        searchQuery === '' ||
        m.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (m.email && m.email.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (m.market_name && m.market_name.toLowerCase().includes(searchQuery.toLowerCase()));
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
            marketName: m.market_name
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

  const currentAgency = agencies.find((a) => a.id === selectedAgencyId);

  return (
    <div className="space-y-4">
      {/* 1. Select Parent Agency */}
      <div>
        <label className="block text-xs font-semibold uppercase tracking-wider text-[#667085] mb-2">
          1. Select Travel Agency / Partner Company
        </label>
        <select
          value={selectedAgencyId}
          onChange={(e) => setSelectedAgencyId(e.target.value)}
          className="w-full h-11 px-4 rounded-xl border border-[#D9E0EA] bg-[#F8FAFC] text-sm text-[#101828] font-medium focus:outline-none focus:ring-2 focus:ring-[#1455D9] focus:bg-white"
        >
          {agencies.map((agency) => (
            <option key={agency.id} value={agency.id}>
              {agency.name} ({agency.code || 'No Code'}) — {agency.city || 'Global'}
            </option>
          ))}
        </select>
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
              placeholder="Search contacts by name, email..."
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
            <div className="p-6 text-center text-xs text-[#667085]">
              No contact members found matching filters.
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
                          <span className="text-[10px] text-[#667085] font-normal">({member.position})</span>
                        )}
                      </div>
                      <div className="text-[11px] text-[#667085] flex items-center gap-1.5">
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
            <ShieldCheck className="w-3.5 h-3.5" /> Email deduplication active
          </span>
        </div>
      </div>
    </div>
  );
};
