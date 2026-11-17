import React, { useState, useEffect, useMemo } from 'react';
import {
  X,
  Building2,
  Users2,
  Hotel,
  Calendar,
  Clock,
  FileText,
  Plus,
  CheckCircle2,
  AlertCircle,
  Search,
  Check,
  RefreshCw,
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { salesVisitService } from '../../services/salesVisitService';

interface LogVisitModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  initialAgencyId?: string;
  initialMemberId?: string;
  initialHotelId?: string;
}

export const LogVisitModal: React.FC<LogVisitModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  initialAgencyId,
  initialMemberId,
  initialHotelId,
}) => {
  // Master options
  const [agencies, setAgencies] = useState<{ id: string; name: string }[]>([]);
  const [markets, setMarkets] = useState<{ id: string; agency_id: string; market_name: string }[]>([]);
  const [members, setMembers] = useState<{ id: string; agency_id: string; market_id: string; full_name: string; email: string }[]>([]);
  const [hotels, setHotels] = useState<{ id: string; hotel_name: string; hotel_code: string | null }[]>([]);

  // Form states
  const [agencySearch, setAgencySearch] = useState('');
  const [selectedAgencyId, setSelectedAgencyId] = useState<string>(initialAgencyId || '');
  const [selectedMarketId, setSelectedMarketId] = useState<string>('');
  const [selectedMemberId, setSelectedMemberId] = useState<string>(initialMemberId || '');
  const [selectedHotelIds, setSelectedHotelIds] = useState<string[]>(initialHotelId ? [initialHotelId] : []);
  const visitDate = useMemo(() => {
    const now = new Date();
    return now.toISOString().split('T')[0] || '';
  }, []);
  const [activityType, setActivityType] = useState<'MEETING' | 'PHONE_CALL' | 'EMAIL_DISCUSSION'>('MEETING');
  const [notes, setNotes] = useState<string>('');

  // Quick Add Member Inline state
  const [isQuickAddingMember, setIsQuickAddingMember] = useState(false);
  const [quickMemberName, setQuickMemberName] = useState('');
  const [quickMemberEmail, setQuickMemberEmail] = useState('');
  const [quickMemberPhone, setQuickMemberPhone] = useState('');
  const [quickMemberPosition, setQuickMemberPosition] = useState('');

  // UI state
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load agencies & hotels on open
  useEffect(() => {
    if (!isOpen) return;

    const loadMasterData = async () => {
      try {
        const [agRes, hRes] = await Promise.all([
          supabase.from('travel_agencies').select('id, name').order('name'),
          supabase.from('hotels').select('id, hotel_name, hotel_code').eq('status', 'ACTIVE').order('hotel_name'),
        ]);
        if (agRes.data) setAgencies(agRes.data);
        if (hRes.data) setHotels(hRes.data);
      } catch (e) {
        console.error(e);
      }
    };
    loadMasterData();
  }, [isOpen]);

  // Load agency markets & members when selected agency changes
  useEffect(() => {
    if (!selectedAgencyId) {
      setMarkets([]);
      setMembers([]);
      setSelectedMarketId('');
      setSelectedMemberId('');
      return;
    }

    const loadAgencyDetails = async () => {
      try {
        const [mktRes, memRes] = await Promise.all([
          supabase.from('agency_markets').select('id, agency_id, market_name').eq('agency_id', selectedAgencyId).order('market_name'),
          supabase.from('agency_members').select('id, agency_id, market_id, full_name, email').eq('agency_id', selectedAgencyId).order('full_name'),
        ]);
        if (mktRes.data) {
          setMarkets(mktRes.data);
          if (mktRes.data.length > 0 && mktRes.data[0] && !selectedMarketId) {
            setSelectedMarketId(mktRes.data[0].id);
          }
        }
        if (memRes.data) setMembers(memRes.data);
      } catch (e) {
        console.error(e);
      }
    };
    loadAgencyDetails();
  }, [selectedAgencyId]);

  if (!isOpen) return null;

  // Toggle hotel selection
  const toggleHotel = (id: string) => {
    setSelectedHotelIds((prev) =>
      prev.includes(id) ? prev.filter((h) => h !== id) : [...prev, id]
    );
  };

  // Quick Add Member Inline
  const handleSaveQuickMember = async () => {
    if (!selectedAgencyId) {
      setError('Please select an agency first');
      return;
    }
    if (!quickMemberName.trim()) {
      setError('Member name is required');
      return;
    }
    const emailToUse = quickMemberEmail.trim() || `${quickMemberName.toLowerCase().replace(/[^a-z0-9]/g, '')}@agency.contact`;

    try {
      // Find or create default market if none
      let mktId = selectedMarketId;
      if (!mktId && markets.length > 0 && markets[0]) {
        mktId = markets[0].id;
      }

      const { data: newMem, error: memErr } = await supabase
        .from('agency_members')
        .insert({
          agency_id: selectedAgencyId,
          market_id: mktId || null,
          full_name: quickMemberName.trim(),
          email: emailToUse,
          phone: quickMemberPhone.trim() || null,
          position: quickMemberPosition.trim() || 'Travel Consultant',
          status: 'ACTIVE',
        })
        .select()
        .single();

      if (memErr) throw memErr;

      if (newMem) {
        setMembers((prev) => [...prev, newMem]);
        setSelectedMemberId(newMem.id);
        setIsQuickAddingMember(false);
        setQuickMemberName('');
        setQuickMemberEmail('');
        setQuickMemberPhone('');
        setQuickMemberPosition('');
        setError(null);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to add contact member');
    }
  };

  // Submit Visit Log
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAgencyId) {
      setError('Please select the travel agency visited.');
      return;
    }
    if (!notes.trim()) {
      setError('Please write discussion notes (what was discussed, feedback, etc.).');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    const res = await salesVisitService.logVisit({
      agency_id: selectedAgencyId,
      market_id: selectedMarketId || null,
      member_id: selectedMemberId || null,
      hotel_ids: selectedHotelIds,
      activity_date: visitDate,
      activity_type: activityType,
      notes: notes.trim(),
    });

    setIsSubmitting(false);

    if (res.success) {
      onSuccess();
      onClose();
    } else {
      setError(res.error || 'Failed to save visit');
    }
  };

  const filteredAgencies = agencies.filter((a) =>
    a.name.toLowerCase().includes(agencySearch.toLowerCase())
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm overflow-y-auto">
      <div className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl border border-slate-200 overflow-hidden my-8 animate-fade-in flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-4 bg-gradient-to-r from-slate-900 to-navy-900 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-500/20 border border-blue-400/30 flex items-center justify-center text-blue-300">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold">Log Agency Visit & Discussion</h2>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5 overflow-y-auto flex-1">
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-800 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
              <span>{error}</span>
            </div>
          )}

          {/* Visit Date & Type */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5 flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-blue-600" />
                  Visit Date (Today)
                </span>
                <span className="text-[10px] text-slate-400 font-medium px-1.5 py-0.5 bg-slate-100 rounded">
                  Locked to Today
                </span>
              </label>
              <input
                type="date"
                readOnly
                disabled
                value={visitDate}
                className="w-full px-3 py-2 bg-slate-100/80 border border-slate-200 rounded-xl text-xs font-semibold text-slate-600 cursor-not-allowed select-none"
                title="Date is automatically locked to today's date for audit compliance"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-blue-600" />
                Interaction Type
              </label>
              <select
                value={activityType}
                onChange={(e) => setActivityType(e.target.value as any)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#1455D9]/20 focus:border-[#1455D9]"
              >
                <option value="MEETING">Physical Office Visit / Meeting</option>
                <option value="PHONE_CALL">Direct Phone Call Discussion</option>
                <option value="EMAIL_DISCUSSION">Email Discussion / Follow-up</option>
              </select>
            </div>
          </div>

          {/* Step 1: Select Agency */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5 flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <Building2 className="w-3.5 h-3.5 text-blue-600" />
                Travel Agency *
              </span>
              <span className="text-[11px] font-normal text-slate-400 lowercase">
                {agencies.length} registered agencies
              </span>
            </label>
            <div className="space-y-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                <input
                  type="text"
                  placeholder="Filter agency list..."
                  value={agencySearch}
                  onChange={(e) => setAgencySearch(e.target.value)}
                  className="w-full pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-[#1455D9]"
                />
              </div>
              <select
                required
                value={selectedAgencyId}
                onChange={(e) => setSelectedAgencyId(e.target.value)}
                className="w-full px-3 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#1455D9]/20 focus:border-[#1455D9]"
              >
                <option value="">-- Choose Travel Agency Visited --</option>
                {filteredAgencies.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Step 2: Contact Person / Agent (Member) */}
          {selectedAgencyId && (
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                  <Users2 className="w-3.5 h-3.5 text-blue-600" />
                  Agent / Contact Person Discussed With
                </label>
                {!isQuickAddingMember && (
                  <button
                    type="button"
                    onClick={() => setIsQuickAddingMember(true)}
                    className="inline-flex items-center gap-1 text-xs font-semibold text-[#1455D9] hover:underline"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Add New Contact
                  </button>
                )}
              </div>

              {!isQuickAddingMember ? (
                <div>
                  <select
                    value={selectedMemberId}
                    onChange={(e) => setSelectedMemberId(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#1455D9]/20 focus:border-[#1455D9]"
                  >
                    <option value="">-- Select Contact Person (Optional) --</option>
                    {members.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.full_name} {m.email ? `(${m.email})` : ''}
                      </option>
                    ))}
                  </select>
                  {members.length === 0 && (
                    <p className="text-[11px] text-amber-600 mt-1">
                      No members saved under this agency yet. Click "+ Add New Contact" above to register one now.
                    </p>
                  )}
                </div>
              ) : (
                <div className="p-3 bg-white rounded-xl border border-blue-200 space-y-2.5 animate-fade-in">
                  <span className="text-xs font-bold text-[#1455D9] block">
                    Quick Register Agent Contact:
                  </span>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <input
                      type="text"
                      placeholder="Contact Full Name *"
                      value={quickMemberName}
                      onChange={(e) => setQuickMemberName(e.target.value)}
                      className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs"
                    />
                    <input
                      type="email"
                      placeholder="Email Address"
                      value={quickMemberEmail}
                      onChange={(e) => setQuickMemberEmail(e.target.value)}
                      className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs"
                    />
                    <input
                      type="text"
                      placeholder="Phone / WhatsApp"
                      value={quickMemberPhone}
                      onChange={(e) => setQuickMemberPhone(e.target.value)}
                      className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs"
                    />
                    <input
                      type="text"
                      placeholder="Designation / Position"
                      value={quickMemberPosition}
                      onChange={(e) => setQuickMemberPosition(e.target.value)}
                      className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs"
                    />
                  </div>
                  <div className="flex items-center justify-end gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => setIsQuickAddingMember(false)}
                      className="px-3 py-1 text-xs text-slate-600 hover:bg-slate-100 rounded-lg"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={handleSaveQuickMember}
                      className="px-3.5 py-1 bg-[#1455D9] hover:bg-[#1044B2] text-white text-xs font-semibold rounded-lg shadow-sm"
                    >
                      Save & Select Contact
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Step 3: Select Hotels Discussed (Multi-Select Pills) */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-semibold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                <Hotel className="w-3.5 h-3.5 text-blue-600" />
                Hotels Pitched / Discussed ({selectedHotelIds.length} Selected)
              </label>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setSelectedHotelIds(hotels.map((h) => h.id))}
                  className="text-[11px] font-semibold text-[#1455D9] hover:underline"
                >
                  Select All 12
                </button>
                <span className="text-slate-300">|</span>
                <button
                  type="button"
                  onClick={() => setSelectedHotelIds([])}
                  className="text-[11px] font-semibold text-slate-500 hover:underline"
                >
                  Clear
                </button>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-48 overflow-y-auto p-2 bg-slate-50 rounded-xl border border-slate-200">
              {hotels.map((h) => {
                const isSelected = selectedHotelIds.includes(h.id);
                return (
                  <button
                    key={h.id}
                    type="button"
                    onClick={() => toggleHotel(h.id)}
                    className={`flex items-center justify-between p-2 rounded-lg text-left text-xs font-medium border transition-all ${
                      isSelected
                        ? 'bg-blue-50 border-[#1455D9] text-[#1455D9] shadow-xs'
                        : 'bg-white border-slate-200 text-slate-700 hover:border-slate-300'
                    }`}
                  >
                    <span className="truncate pr-1">{h.hotel_name}</span>
                    {isSelected ? (
                      <Check className="w-3.5 h-3.5 text-[#1455D9] shrink-0" />
                    ) : (
                      <span className="w-3.5 h-3.5 rounded-full border border-slate-300 shrink-0" />
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Step 4: Discussion Notes */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5 text-blue-600" />
              Discussion Notes & Agent Feedback *
            </label>
            <textarea
              required
              rows={4}
              placeholder="Record key conversation points, requirements, rates discussed, complaints, client inquiries, or special deals requested..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#1455D9]/20 focus:border-[#1455D9]"
            />
          </div>

          {/* Action buttons */}
          <div className="pt-3 border-t border-slate-200 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2 text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#1455D9] hover:bg-[#1044B2] text-white text-xs font-bold rounded-xl shadow-md transition-all disabled:opacity-50"
            >
              {isSubmitting ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span>Saving Visit...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Save Visit Record</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
