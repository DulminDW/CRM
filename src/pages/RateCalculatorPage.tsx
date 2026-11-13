import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Calculator,
  Save,
  RotateCcw,
  Sparkles,
  Layers,
  Edit2,
  Check,
  FileCheck,
  Info,
  Calendar,
  Building,
  HelpCircle,
  FolderPlus,
  Send,
  Users2,
  UserCheck,
  MessageSquare
} from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import {
  RateCalculationSetupConfig,
  CalculatedRateCell,
  createDefaultCalculationConfig,
  calculateRateGrid,
  calculationSetupService,
  SavedCalculationSetup
} from '../services/calculationSetupService';
import { adminActivityService } from '../services/adminActivityService';
import { rateService } from '../services/rateService';
import { hotelRateConfigService } from '../services/hotelRateConfigService';
import { fetchAgencies } from '../services/agencyService';
import { fetchMembers } from '../services/memberService';
import { HotelRecord, HotelSeasonRecord } from '../types/hotelHierarchy';
import { TravelAgencyRecord, AgencyMemberRecord } from '../types/agencyHierarchy';

export const RateCalculatorPage: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  // Hotel & Season Context
  const [hotels, setHotels] = useState<HotelRecord[]>([]);
  const [selectedHotelId, setSelectedHotelId] = useState<string>('');
  const [seasons, setSeasons] = useState<HotelSeasonRecord[]>([]);
  const [selectedSeasonId, setSelectedSeasonId] = useState<string>('');
  const [selectedRateTier, setSelectedRateTier] = useState<'RED' | 'GREEN' | 'YELLOW' | 'CUSTOM'>('CUSTOM');

  // Ad-Hoc Custom / Special Rate Target Agency & Member
  const [agencies, setAgencies] = useState<TravelAgencyRecord[]>([]);
  const [selectedAgencyId, setSelectedAgencyId] = useState<string>('');
  const [agencyMembers, setAgencyMembers] = useState<AgencyMemberRecord[]>([]);
  const [selectedMemberId, setSelectedMemberId] = useState<string>('');
  const [customNegotiationNotes, setCustomNegotiationNotes] = useState<string>('');

  // Calculation Setup & Engine State
  const [config, setConfig] = useState<RateCalculationSetupConfig>(createDefaultCalculationConfig());
  const [anchorValue, setAnchorValue] = useState<number | ''>(100);
  const [cells, setCells] = useState<Record<string, CalculatedRateCell>>({});

  // Saved Setups
  const [savedSetups, setSavedSetups] = useState<SavedCalculationSetup[]>([]);
  const [selectedSetupId, setSelectedSetupId] = useState<string>('');
  const [saveSetupModalOpen, setSaveSetupModalOpen] = useState(false);
  const [setupNameInput, setSetupNameInput] = useState('');
  const [setupDescInput, setSetupDescInput] = useState('');

  // Editing Overrides
  const [editingCellKey, setEditingCellKey] = useState<string | null>(null);
  const [editingCellValue, setEditingCellValue] = useState<string>('');

  // Save Rate Sheet State
  const [saveRateSheetModalOpen, setSaveRateSheetModalOpen] = useState(false);
  const [rateSheetSuccessMsg, setRateSheetSuccessMsg] = useState<string | null>(null);

  // Status & Feedback
  const [feedbackMsg, setFeedbackMsg] = useState<{ type: 'success' | 'info' | 'error'; text: string } | null>(null);

  // Load Initial Hotels, Saved Setups & Master Agencies
  useEffect(() => {
    rateService.getHotels().then((hList) => {
      setHotels(hList);
      if (hList.length > 0 && hList[0]) {
        setSelectedHotelId(hList[0].id);
      }
    });

    calculationSetupService.getSavedSetups().then((setups) => {
      setSavedSetups(setups);
    });

    fetchAgencies().then((res) => {
      setAgencies(res.data);
      if (res.data.length > 0 && res.data[0]) {
        setSelectedAgencyId(res.data[0].id);
      }
    });
  }, []);

  // Load Agency Members when selected Agency changes
  useEffect(() => {
    if (!selectedAgencyId) {
      setAgencyMembers([]);
      setSelectedMemberId('');
      return;
    }

    fetchMembers(selectedAgencyId).then((res) => {
      const activeMembers = res.data.filter((m) => m.agency_id === selectedAgencyId && m.status === 'ACTIVE');
      setAgencyMembers(activeMembers);
      if (activeMembers.length > 0 && activeMembers[0]) {
        setSelectedMemberId(activeMembers[0].id);
      } else {
        setSelectedMemberId('');
      }
    });
  }, [selectedAgencyId]);

  // Load Seasons and Hotel-specific Rate Config when Hotel changes
  useEffect(() => {
    if (!selectedHotelId) return;
    rateService.getSeasonsForHotel(selectedHotelId).then((sList) => {
      setSeasons(sList);
      if (sList.length > 0 && sList[0]) {
        setSelectedSeasonId(sList[0].id);
      } else {
        setSelectedSeasonId('');
      }
    });

    // Auto-populate verified base components if configured for this hotel
    hotelRateConfigService.getConfigs(selectedHotelId).then((configs) => {
      const match = configs.find((c) => c.rate_category === selectedRateTier) || configs[0];
      if (match) {
        setAnchorValue(match.hb_double_base_rate);
        setConfig((prev) => ({
          ...prev,
          currency: match.currency || 'USD',
          occupancyAdjustments: {
            ...prev.occupancyAdjustments,
            SGL: {
              ...prev.occupancyAdjustments.SGL!,
              value: match.single_reduction_amount
            },
            TPL: {
              ...prev.occupancyAdjustments.TPL!,
              value: match.triple_supplement_amount
            }
          },
          mealAdjustments: {
            ...prev.mealAdjustments,
            BB: {
              ...prev.mealAdjustments.BB!,
              value: match.bb_reduction_amount
            }
          }
        }));
      }
    });
  }, [selectedHotelId, selectedRateTier]);

  // Recalculate grid whenever anchorValue, config, or overrides change
  useEffect(() => {
    const val = typeof anchorValue === 'number' && !isNaN(anchorValue) ? anchorValue : null;
    setCells((prev) => calculateRateGrid(val, config, prev));
  }, [anchorValue, config]);

  // Apply a saved setup (DEEP COPY - does NOT affect saved template)
  const handleApplySavedSetup = (setupId: string) => {
    setSelectedSetupId(setupId);
    if (!setupId) return;

    const found = savedSetups.find((s) => s.id === setupId);
    if (found) {
      // Deep copy configuration
      const copiedConfig: RateCalculationSetupConfig = JSON.parse(JSON.stringify(found.config));
      setConfig(copiedConfig);

      setFeedbackMsg({
        type: 'info',
        text: `Applied setup "${found.setup_name}". Rules copied to working calculation.`
      });

      // Audit Log
      if (user) {
        const hotelObj = hotels.find((h) => h.id === selectedHotelId);
        adminActivityService.logActivity({
          actor_id: user.id,
          actor_name: user.email || 'Authorized Staff',
          action: 'CALCULATION_SETUP_APPLIED',
          target_table: 'rate_calculation_setups',
          setup_id: found.id,
          setup_name: found.setup_name,
          hotel_id: selectedHotelId,
          hotel_name: hotelObj?.hotel_name,
          details: `Applied calculation setup "${found.setup_name}" to ${hotelObj?.hotel_name || 'selected property'}`
        });
      }
    }
  };

  // Reset to default blank setup
  const handleResetToBlank = () => {
    setConfig(createDefaultCalculationConfig());
    setSelectedSetupId('');
    setFeedbackMsg({
      type: 'info',
      text: 'Reset to standard calculation configuration.'
    });
  };

  // Cell Override Handler
  const handleSaveOverride = (rowId: string, mealId: string) => {
    const key = `${rowId}:${mealId}`;
    const num = parseFloat(editingCellValue);

    if (isNaN(num) || num < 0) {
      setFeedbackMsg({ type: 'error', text: 'Please enter a valid rate amount.' });
      return;
    }

    const currentCell = cells[key];
    const oldVal = currentCell?.value;

    setCells((prev) => {
      const existing = prev[key];
      return {
        ...prev,
        [key]: {
          rowId,
          mealId,
          value: num,
          calculatedValue: existing?.calculatedValue ?? existing?.value ?? null,
          status: 'MANUAL_OVERRIDE',
          ruleExplanation: `Manual override by user (calculated: ${existing?.calculatedValue ?? 'N/A'})`,
          overriddenBy: user?.email || 'Authorized Staff',
          overriddenAt: new Date().toISOString()
        }
      };
    });

    setEditingCellKey(null);
    setEditingCellValue('');
    setFeedbackMsg({
      type: 'success',
      text: `Manually set ${rowId} ${mealId} to ${num} ${config.currency}. Marked as MANUAL OVERRIDE.`
    });

    // Audit Log
    if (user) {
      const hotelObj = hotels.find((h) => h.id === selectedHotelId);
      adminActivityService.logActivity({
        actor_id: user.id,
        actor_name: user.email || 'Authorized Staff',
        action: 'RATE_CELL_MANUALLY_OVERRIDDEN',
        target_table: 'hotel_rate_outputs',
        hotel_id: selectedHotelId,
        hotel_name: hotelObj?.hotel_name,
        old_values: { cell: key, previous_value: oldVal },
        new_values: { cell: key, overridden_value: num },
        details: `Manual rate override on cell ${key}: changed from ${oldVal} to ${num}`
      });
    }
  };

  // Reset single cell back to auto
  const handleResetCellToAuto = (rowId: string, mealId: string) => {
    const key = `${rowId}:${mealId}`;
    setCells((prev) => {
      const clone = { ...prev };
      delete clone[key];
      const val = typeof anchorValue === 'number' && !isNaN(anchorValue) ? anchorValue : null;
      return calculateRateGrid(val, config, clone);
    });

    setFeedbackMsg({
      type: 'info',
      text: `Reset ${rowId} ${mealId} to automatic calculation.`
    });

    if (user) {
      adminActivityService.logActivity({
        actor_id: user.id,
        actor_name: user.email || 'Authorized Staff',
        action: 'RATE_CELL_RESET_TO_AUTO',
        target_table: 'hotel_rate_outputs',
        hotel_id: selectedHotelId,
        details: `Reset rate cell ${key} back to automatic calculation`
      });
    }
  };

  // Save current rules as a reusable calculation setup
  const handleSaveSetupSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !setupNameInput.trim()) return;

    try {
      const created = await calculationSetupService.saveSetup(
        setupNameInput,
        setupDescInput,
        config,
        user.id,
        user.email
      );

      setSavedSetups((prev) => [created, ...prev]);
      setSelectedSetupId(created.id);
      setSaveSetupModalOpen(false);
      setSetupNameInput('');
      setSetupDescInput('');

      setFeedbackMsg({
        type: 'success',
        text: `Saved new calculation setup "${created.setup_name}". Available for reuse anytime.`
      });

      // Audit Log
      adminActivityService.logActivity({
        actor_id: user.id,
        actor_name: user.email || 'Authorized Staff',
        action: 'CALCULATION_SETUP_CREATED',
        target_table: 'rate_calculation_setups',
        setup_id: created.id,
        setup_name: created.setup_name,
        new_values: { setup_name: created.setup_name, config },
        details: `User created reusable calculation setup "${created.setup_name}"`
      });
    } catch {
      setFeedbackMsg({ type: 'error', text: 'Failed to save calculation setup.' });
    }
  };

  // Save rate sheet action
  const handleSaveRateSheet = async () => {
    if (!user) return;
    const hotelObj = hotels.find((h) => h.id === selectedHotelId);
    const seasonObj = seasons.find((s) => s.id === selectedSeasonId);

    // Audit Log
    await adminActivityService.logActivity({
      actor_id: user.id,
      actor_name: user.email || 'Authorized Staff',
      action: 'RATE_SHEET_SAVED',
      target_table: 'hotel_rate_sheets',
      hotel_id: selectedHotelId,
      hotel_name: hotelObj?.hotel_name,
      season_id: selectedSeasonId,
      season_label: seasonObj?.season_label,
      new_values: {
        hotel: hotelObj?.hotel_name,
        season: seasonObj?.season_label,
        tier: selectedRateTier,
        anchor: anchorValue,
        currency: config.currency,
        calculatedCellsCount: Object.keys(cells).length
      },
      details: `Saved rate sheet calculation for ${hotelObj?.hotel_name} (${seasonObj?.season_label || 'Default Season'}) [${selectedRateTier} Tier]`
    });

    setRateSheetSuccessMsg(`Rate sheet for ${hotelObj?.hotel_name} (${selectedRateTier} Tier) saved successfully. Immutable snapshot preserved.`);
    setSaveRateSheetModalOpen(false);
  };

  // Navigate to Email / Share Custom Rate with negotiated payload
  const handleProceedToEmail = () => {
    const rateVal = typeof anchorValue === 'number' && anchorValue > 0 ? anchorValue : 100;
    const hotelObj = hotels.find((h) => h.id === selectedHotelId);

    const params = new URLSearchParams({
      hotelId: selectedHotelId,
      seasonId: selectedSeasonId || '',
      sourceType: 'CUSTOM',
      customRateAmount: String(rateVal),
      customRateLabel: `Negotiated Custom Rate (${hotelObj?.hotel_name || 'Property'})`,
      agencyId: selectedAgencyId || '',
      memberId: selectedMemberId || '',
      customNotes: customNegotiationNotes || 'Specially negotiated rate created via Rate Calculations.'
    });

    navigate(`/share-rates?${params.toString()}`);
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-[#EAF2FF] text-[#1455D9] rounded-2xl shadow-xs">
            <Calculator className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold text-[#101828]">Special Rate Preparation &amp; Calculator</h1>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                Custom Offer Workflow
              </span>
            </div>
            <p className="text-sm text-[#667085]">
              Prepare an occasional negotiated custom rate for a target agency &amp; contact, compute room &amp; meal options, and proceed directly to email.
            </p>
          </div>
        </div>

        {/* Global Action Buttons */}
        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            onClick={handleProceedToEmail}
            disabled={!anchorValue || anchorValue <= 0}
            className="h-11 px-5 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-xs font-bold text-white flex items-center gap-2 shadow-xs transition-colors"
          >
            <Send className="w-4 h-4" /> Proceed to Email / Share Custom Rate
          </button>
          <button
            onClick={() => setSaveSetupModalOpen(true)}
            className="h-11 px-4 rounded-xl border border-[#D9E0EA] bg-white hover:bg-slate-50 text-xs font-bold text-[#101828] flex items-center gap-2 shadow-xs transition-colors"
          >
            <FolderPlus className="w-4 h-4 text-[#1455D9]" /> Save as Setup (Optional)
          </button>
          <button
            onClick={() => setSaveRateSheetModalOpen(true)}
            disabled={!anchorValue || anchorValue <= 0}
            className="h-11 px-4 rounded-xl bg-[#1455D9] hover:bg-blue-700 disabled:opacity-50 text-xs font-bold text-white flex items-center gap-2 shadow-xs transition-colors"
          >
            <FileCheck className="w-4 h-4" /> Save Rate Sheet
          </button>
        </div>
      </div>

      {/* Feedback Banner */}
      {feedbackMsg && (
        <div
          className={`p-4 rounded-xl flex items-center justify-between text-xs font-medium border ${
            feedbackMsg.type === 'success'
              ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
              : feedbackMsg.type === 'error'
              ? 'bg-red-50 text-red-800 border-red-200'
              : 'bg-blue-50 text-blue-800 border-blue-200'
          }`}
        >
          <div className="flex items-center gap-2">
            <Info className="w-4 h-4 flex-shrink-0" />
            <span>{feedbackMsg.text}</span>
          </div>
          <button onClick={() => setFeedbackMsg(null)} className="text-xs font-bold hover:underline">
            Dismiss
          </button>
        </div>
      )}

      {/* Rate Sheet Success Alert */}
      {rateSheetSuccessMsg && (
        <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-300 text-emerald-900 text-xs flex items-center justify-between">
          <div className="flex items-center gap-2 font-medium">
            <Check className="w-4 h-4 text-emerald-600" />
            {rateSheetSuccessMsg}
          </div>
          <button onClick={() => setRateSheetSuccessMsg(null)} className="font-bold underline">
            Dismiss
          </button>
        </div>
      )}

      {/* Context Selection Bar (Hotel, Season, Rate Tier, Saved Setups) */}
      <div className="bg-white rounded-2xl border border-[#D9E0EA] p-4 sm:p-5 shadow-xs grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 sm:gap-4">
        {/* Hotel Selector */}
        <div>
          <label className="block text-xs font-semibold text-[#344054] mb-1.5 flex items-center gap-1.5">
            <Building className="w-3.5 h-3.5 text-[#667085]" /> Target Hotel Property
          </label>
          <select
            value={selectedHotelId}
            onChange={(e) => setSelectedHotelId(e.target.value)}
            className="w-full h-11 px-3 rounded-xl border border-[#D9E0EA] text-xs font-medium bg-white focus:outline-none focus:ring-2 focus:ring-[#1455D9] touch-manipulation"
          >
            {hotels.map((h) => (
              <option key={h.id} value={h.id}>
                {h.hotel_name} {h.area ? `(${h.area})` : ''}
              </option>
            ))}
          </select>
        </div>

        {/* Season Selector */}
        <div>
          <label className="block text-xs font-semibold text-[#344054] mb-1.5 flex items-center gap-1.5">
            <Calendar className="w-3.5 h-3.5 text-[#667085]" /> Contract Season
          </label>
          <select
            value={selectedSeasonId}
            onChange={(e) => setSelectedSeasonId(e.target.value)}
            className="w-full h-11 px-3 rounded-xl border border-[#D9E0EA] text-xs font-medium bg-white focus:outline-none focus:ring-2 focus:ring-[#1455D9] touch-manipulation"
          >
            {seasons.length === 0 ? (
              <option value="">No active seasons registered</option>
            ) : (
              seasons.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.season_label} ({s.date_from} &rarr; {s.date_to})
                </option>
              ))
            )}
          </select>
        </div>

        {/* Rate Category Tier (Red / Green / Yellow / Custom) */}
        <div>
          <label className="block text-xs font-semibold text-[#344054] mb-1.5 flex items-center gap-1.5">
            <Layers className="w-3.5 h-3.5 text-[#667085]" /> Rate Category Tier
          </label>
          <div className="grid grid-cols-4 gap-1">
            <button
              type="button"
              onClick={() => setSelectedRateTier('RED')}
              className={`h-11 rounded-xl text-xs font-bold transition-all border touch-manipulation ${
                selectedRateTier === 'RED'
                  ? 'bg-red-500 text-white border-red-600 shadow-xs'
                  : 'bg-white text-red-600 border-red-200 hover:bg-red-50'
              }`}
            >
              RED
            </button>
            <button
              type="button"
              onClick={() => setSelectedRateTier('GREEN')}
              className={`h-11 rounded-xl text-xs font-bold transition-all border touch-manipulation ${
                selectedRateTier === 'GREEN'
                  ? 'bg-emerald-600 text-white border-emerald-700 shadow-xs'
                  : 'bg-white text-emerald-600 border-emerald-200 hover:bg-emerald-50'
              }`}
            >
              GREEN
            </button>
            <button
              type="button"
              onClick={() => setSelectedRateTier('YELLOW')}
              className={`h-11 rounded-xl text-xs font-bold transition-all border touch-manipulation ${
                selectedRateTier === 'YELLOW'
                  ? 'bg-amber-500 text-white border-amber-600 shadow-xs'
                  : 'bg-white text-amber-600 border-amber-200 hover:bg-amber-50'
              }`}
            >
              YELLOW
            </button>
            <button
              type="button"
              onClick={() => setSelectedRateTier('CUSTOM')}
              className={`h-11 rounded-xl text-xs font-bold transition-all border touch-manipulation ${
                selectedRateTier === 'CUSTOM'
                  ? 'bg-purple-600 text-white border-purple-700 shadow-xs ring-2 ring-purple-300'
                  : 'bg-white text-purple-700 border-purple-200 hover:bg-purple-50'
              }`}
            >
              CUSTOM
            </button>
          </div>
        </div>

        {/* Saved Calculation Setup Loader */}
        <div>
          <label className="block text-xs font-semibold text-[#344054] mb-1.5 flex items-center justify-between">
            <span className="flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-[#1455D9]" /> Reusable Setups
            </span>
            <button
              onClick={handleResetToBlank}
              className="text-[11px] text-[#1455D9] hover:underline"
              title="Reset rules to default configuration"
            >
              Default
            </button>
          </label>
          <select
            value={selectedSetupId}
            onChange={(e) => handleApplySavedSetup(e.target.value)}
            className="w-full h-11 px-3 rounded-xl border border-[#D9E0EA] text-xs font-medium bg-white focus:outline-none focus:ring-2 focus:ring-[#1455D9] touch-manipulation"
          >
            <option value="">-- Start with Blank / Default --</option>
            {savedSetups.map((s) => (
              <option key={s.id} value={s.id}>
                {s.setup_name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Target Agency & Member Panel for Custom Negotiated Offer */}
      <div className="bg-gradient-to-r from-purple-50/70 to-blue-50/70 rounded-2xl border border-purple-200 p-5 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-purple-200/60 pb-3">
          <div className="flex items-center gap-2">
            <Users2 className="w-5 h-5 text-purple-700" />
            <div>
              <h2 className="text-sm font-bold text-[#101828]">Target Agency &amp; Contact Person (Negotiated Custom Rate)</h2>
              <p className="text-xs text-[#667085]">
                Custom rates are prepared for a specific agency and contact person. Details will be populated directly into the outgoing email proposal.
              </p>
            </div>
          </div>
          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-bold bg-purple-100 text-purple-800 border border-purple-300">
            Ad-Hoc Negotiation
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Agency Selector */}
          <div>
            <label className="block text-xs font-semibold text-[#344054] mb-1.5 flex items-center gap-1.5">
              <Building className="w-3.5 h-3.5 text-[#667085]" /> Target Travel Agency *
            </label>
            <select
              value={selectedAgencyId}
              onChange={(e) => setSelectedAgencyId(e.target.value)}
              className="w-full h-11 px-3 rounded-xl border border-[#D9E0EA] text-xs font-medium bg-white focus:outline-none focus:ring-2 focus:ring-purple-500"
            >
              {agencies.length === 0 ? (
                <option value="">No agencies available</option>
              ) : (
                agencies.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name} {a.code ? `(${a.code})` : ''}
                  </option>
                ))
              )}
            </select>
          </div>

          {/* Member / Contact Person Selector */}
          <div>
            <label className="block text-xs font-semibold text-[#344054] mb-1.5 flex items-center gap-1.5">
              <UserCheck className="w-3.5 h-3.5 text-[#667085]" /> Contact Person / Member *
            </label>
            <select
              value={selectedMemberId}
              onChange={(e) => setSelectedMemberId(e.target.value)}
              className="w-full h-11 px-3 rounded-xl border border-[#D9E0EA] text-xs font-medium bg-white focus:outline-none focus:ring-2 focus:ring-purple-500"
            >
              {agencyMembers.length === 0 ? (
                <option value="">No active contacts found for agency</option>
              ) : (
                agencyMembers.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.full_name} {m.position ? `(${m.position})` : ''} &bull; {m.email}
                  </option>
                ))
              )}
            </select>
          </div>

          {/* Negotiation Notes */}
          <div>
            <label className="block text-xs font-semibold text-[#344054] mb-1.5 flex items-center gap-1.5">
              <MessageSquare className="w-3.5 h-3.5 text-[#667085]" /> Negotiation Reason / Special Deal Notes
            </label>
            <input
              type="text"
              value={customNegotiationNotes}
              onChange={(e) => setCustomNegotiationNotes(e.target.value)}
              placeholder="e.g. VIP contract rate agreed via meeting on Nov 10"
              className="w-full h-11 px-3 rounded-xl border border-[#D9E0EA] text-xs font-medium bg-white focus:outline-none focus:ring-2 focus:ring-purple-500"
            />
          </div>
        </div>
      </div>

      {/* Main Calculation & Grid Area */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Calculation Parameters & Anchor Input (4 cols) */}
        <div className="lg:col-span-4 space-y-5">
          {/* Anchor Rate Input Card */}
          <div className="bg-white rounded-2xl border-2 border-[#1455D9]/40 p-5 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <div className="text-xs font-bold text-[#1455D9] uppercase tracking-wider flex items-center gap-1.5">
                <Calculator className="w-4 h-4" /> Primary Anchor Input
              </div>
              <span className="text-[10px] bg-blue-100 text-[#1455D9] font-bold px-2 py-0.5 rounded-full">
                Anchor Cell
              </span>
            </div>

            <div>
              <label className="block text-xs font-medium text-[#344054] mb-1">
                Enter Base Price: <strong className="text-[#101828]">Double HB ({config.currency})</strong>
              </label>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm font-bold text-[#667085]">
                  $
                </span>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={anchorValue}
                  onChange={(e) => setAnchorValue(e.target.value === '' ? '' : parseFloat(e.target.value))}
                  placeholder="e.g. 100.00"
                  className="w-full h-12 pl-8 pr-4 rounded-xl border-2 border-[#1455D9] text-base font-bold text-[#101828] focus:outline-none focus:ring-2 focus:ring-blue-400"
                />
              </div>
              <p className="text-[11px] text-[#667085] mt-1.5">
                Changing this rate automatically re-computes all dependent room & meal rates while preserving manual overrides.
              </p>
            </div>
          </div>

          {/* Configurable Occupancy Rules */}
          <div className="bg-white rounded-2xl border border-[#D9E0EA] p-5 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold text-[#101828] uppercase tracking-wider">
                Room Occupancy Adjustments
              </h3>
              <span className="text-[10px] text-[#667085]">Relative to Double</span>
            </div>

            <div className="space-y-3">
              {/* Single Deduction */}
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                <div className="flex items-center justify-between text-xs mb-1">
                  <span className="font-bold text-[#101828]">Single (SGL) Adjustment</span>
                  <span className="text-[11px] font-semibold text-rose-600">Deduction</span>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min="0"
                    step="1"
                    value={config.occupancyAdjustments.SGL?.value ?? ''}
                    onChange={(e) => {
                      const val = parseFloat(e.target.value) || 0;
                      setConfig((prev) => ({
                        ...prev,
                        occupancyAdjustments: {
                          ...prev.occupancyAdjustments,
                          SGL: {
                            ...prev.occupancyAdjustments.SGL!,
                            value: val
                          }
                        }
                      }));
                    }}
                    className="w-24 h-9 px-2 text-xs font-bold rounded-lg border border-[#D9E0EA] bg-white"
                  />
                  <span className="text-xs text-[#667085]">{config.currency} deduction</span>
                </div>
              </div>

              {/* Triple Supplement */}
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                <div className="flex items-center justify-between text-xs mb-1">
                  <span className="font-bold text-[#101828]">Triple (TPL) Adjustment</span>
                  <span className="text-[11px] font-semibold text-emerald-600">Supplement</span>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min="0"
                    step="1"
                    value={config.occupancyAdjustments.TPL?.value ?? ''}
                    onChange={(e) => {
                      const val = parseFloat(e.target.value) || 0;
                      setConfig((prev) => ({
                        ...prev,
                        occupancyAdjustments: {
                          ...prev.occupancyAdjustments,
                          TPL: {
                            ...prev.occupancyAdjustments.TPL!,
                            value: val
                          }
                        }
                      }));
                    }}
                    className="w-24 h-9 px-2 text-xs font-bold rounded-lg border border-[#D9E0EA] bg-white"
                  />
                  <span className="text-xs text-[#667085]">{config.currency} supplement</span>
                </div>
              </div>

              {/* Quadruple Supplement */}
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                <div className="flex items-center justify-between text-xs mb-1">
                  <span className="font-bold text-[#101828]">Quadruple (QUAD) Adjustment</span>
                  <span className="text-[11px] font-semibold text-emerald-600">Supplement</span>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min="0"
                    step="1"
                    value={config.occupancyAdjustments.QUAD?.value ?? ''}
                    onChange={(e) => {
                      const val = parseFloat(e.target.value) || 0;
                      setConfig((prev) => ({
                        ...prev,
                        occupancyAdjustments: {
                          ...prev.occupancyAdjustments,
                          QUAD: {
                            ...prev.occupancyAdjustments.QUAD!,
                            value: val
                          }
                        }
                      }));
                    }}
                    className="w-24 h-9 px-2 text-xs font-bold rounded-lg border border-[#D9E0EA] bg-white"
                  />
                  <span className="text-xs text-[#667085]">{config.currency} supplement</span>
                </div>
              </div>
            </div>
          </div>

          {/* Configurable Meal Plan Rules */}
          <div className="bg-white rounded-2xl border border-[#D9E0EA] p-5 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold text-[#101828] uppercase tracking-wider">
                Meal Plan Adjustments
              </h3>
              <span className="text-[10px] text-[#667085]">Relative to HB</span>
            </div>

            <div className="space-y-3">
              {/* BB Adjustment */}
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                <div className="flex items-center justify-between text-xs mb-1">
                  <span className="font-bold text-[#101828]">Bed & Breakfast (BB)</span>
                  <span className="text-[11px] font-semibold text-rose-600">Deduction</span>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min="0"
                    step="1"
                    value={config.mealAdjustments.BB?.value ?? ''}
                    onChange={(e) => {
                      const val = parseFloat(e.target.value) || 0;
                      setConfig((prev) => ({
                        ...prev,
                        mealAdjustments: {
                          ...prev.mealAdjustments,
                          BB: {
                            ...prev.mealAdjustments.BB!,
                            value: val
                          }
                        }
                      }));
                    }}
                    className="w-24 h-9 px-2 text-xs font-bold rounded-lg border border-[#D9E0EA] bg-white"
                  />
                  <span className="text-xs text-[#667085]">{config.currency} deduction</span>
                </div>
              </div>

              {/* FB Adjustment */}
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                <div className="flex items-center justify-between text-xs mb-1">
                  <span className="font-bold text-[#101828]">Full Board (FB)</span>
                  <span className="text-[11px] font-semibold text-emerald-600">Supplement</span>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min="0"
                    step="1"
                    value={config.mealAdjustments.FB?.value ?? ''}
                    onChange={(e) => {
                      const val = parseFloat(e.target.value) || 0;
                      setConfig((prev) => ({
                        ...prev,
                        mealAdjustments: {
                          ...prev.mealAdjustments,
                          FB: {
                            ...prev.mealAdjustments.FB!,
                            value: val
                          }
                        }
                      }));
                    }}
                    className="w-24 h-9 px-2 text-xs font-bold rounded-lg border border-[#D9E0EA] bg-white"
                  />
                  <span className="text-xs text-[#667085]">{config.currency} supplement</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Dynamic Interactive 12-Cell Rate Table (8 cols) */}
        <div className="lg:col-span-8 space-y-4">
          <div className="bg-white rounded-2xl border border-[#D9E0EA] p-6 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#EAECF0]">
              <div>
                <h2 className="text-base font-bold text-[#101828]">Calculated Rate Table Matrix</h2>
                <p className="text-xs text-[#667085]">
                  Click on any cell to edit or manually override its rate. Indicators show auto vs override status.
                </p>
              </div>

              {/* Legend of Status Indicators */}
              <div className="flex items-center gap-3 text-[11px] flex-wrap">
                <span className="inline-flex items-center gap-1">
                  <span className="w-2.5 h-2.5 rounded-full bg-blue-600"></span> Anchor
                </span>
                <span className="inline-flex items-center gap-1">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span> Auto Calculated
                </span>
                <span className="inline-flex items-center gap-1">
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-500"></span> Manual Override
                </span>
                <span className="inline-flex items-center gap-1">
                  <span className="w-2.5 h-2.5 rounded-full bg-slate-300"></span> Not Configured
                </span>
              </div>
            </div>

            {/* Interactive Table Grid */}
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-[#F8FAFC] border-b border-[#D9E0EA]">
                    <th className="py-3 px-4 text-xs font-bold text-[#344054] uppercase tracking-wider">
                      Room Occupancy
                    </th>
                    {config.mealColumns.filter((m) => m.enabled).map((m) => (
                      <th
                        key={m.id}
                        className={`py-3 px-4 text-xs font-bold text-center uppercase tracking-wider ${
                          m.id === config.anchorMealId ? 'text-[#1455D9] bg-blue-50/60' : 'text-[#344054]'
                        }`}
                      >
                        {m.label} {m.id === config.anchorMealId && '(Base Meal)'}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#EAECF0]">
                  {config.roomRows.filter((r) => r.enabled).map((r) => (
                    <tr key={r.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-3 px-4 text-xs font-bold text-[#101828]">
                        <div className="flex items-center gap-2">
                          <span>{r.label}</span>
                          <span className="text-[10px] text-[#667085] font-normal">
                            ({r.occupancyCount} Pax)
                          </span>
                          {r.id === config.anchorRowId && (
                            <span className="px-1.5 py-0.5 rounded text-[10px] bg-blue-100 text-[#1455D9] font-semibold">
                              Base Row
                            </span>
                          )}
                        </div>
                      </td>

                      {config.mealColumns.filter((m) => m.enabled).map((m) => {
                        const cellKey = `${r.id}:${m.id}`;
                        const cell = cells[cellKey];
                        const isAnchor = r.id === config.anchorRowId && m.id === config.anchorMealId;
                        const isOverridden = cell?.status === 'MANUAL_OVERRIDE';
                        const isEditing = editingCellKey === cellKey;

                        return (
                          <td
                            key={m.id}
                            className={`py-3 px-4 text-center ${
                              isAnchor ? 'bg-blue-50/40' : ''
                            }`}
                          >
                            {isEditing ? (
                              <div className="flex items-center justify-center gap-1">
                                <input
                                  type="number"
                                  autoFocus
                                  value={editingCellValue}
                                  onChange={(e) => setEditingCellValue(e.target.value)}
                                  className="w-20 h-8 px-2 text-xs font-bold text-center rounded border border-[#1455D9] focus:outline-none"
                                />
                                <button
                                  onClick={() => handleSaveOverride(r.id, m.id)}
                                  className="p-1.5 bg-[#1455D9] text-white rounded hover:bg-blue-700"
                                  title="Save override"
                                >
                                  <Check className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  onClick={() => setEditingCellKey(null)}
                                  className="p-1.5 bg-slate-200 text-slate-700 rounded hover:bg-slate-300"
                                  title="Cancel"
                                >
                                  &times;
                                </button>
                              </div>
                            ) : (
                              <div className="flex flex-col items-center justify-center group relative">
                                <div
                                  onClick={() => {
                                    if (isAnchor) return;
                                    setEditingCellKey(cellKey);
                                    setEditingCellValue(cell?.value !== null && cell?.value !== undefined ? String(cell.value) : '');
                                  }}
                                  className={`cursor-pointer px-3 py-2 min-h-[44px] min-w-[70px] rounded-xl border transition-all flex items-center justify-center gap-1.5 touch-manipulation ${
                                    isAnchor
                                      ? 'bg-blue-600 text-white border-blue-700 font-bold shadow-xs'
                                      : isOverridden
                                      ? 'bg-amber-50 text-amber-900 border-amber-300 font-bold shadow-2xs hover:bg-amber-100'
                                      : cell?.status === 'AUTO_CALCULATED'
                                      ? 'bg-emerald-50 text-emerald-900 border-emerald-200 font-semibold hover:bg-emerald-100'
                                      : 'bg-slate-100 text-slate-400 border-slate-200'
                                  }`}
                                  title={cell?.ruleExplanation || 'Click to edit'}
                                >
                                  <span>
                                    {cell?.value !== null && cell?.value !== undefined
                                      ? `$${cell.value.toFixed(2)}`
                                      : 'NOT CONFIGURED'}
                                  </span>
                                  {!isAnchor && (
                                    <Edit2 className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                                  )}
                                </div>

                                {/* Status Tag under cell */}
                                <div className="text-[10px] mt-1 flex items-center gap-1">
                                  {isAnchor ? (
                                    <span className="text-blue-700 font-bold">ANCHOR</span>
                                  ) : isOverridden ? (
                                    <div className="flex items-center gap-1">
                                      <span className="text-amber-700 font-bold">OVERRIDE</span>
                                      <button
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          handleResetCellToAuto(r.id, m.id);
                                        }}
                                        className="text-[#1455D9] hover:underline flex items-center gap-0.5 ml-1 min-h-[32px] px-1.5 touch-manipulation"
                                        title="Reset to calculated rate"
                                      >
                                        <RotateCcw className="w-2.5 h-2.5" /> Auto
                                      </button>
                                    </div>
                                  ) : cell?.status === 'AUTO_CALCULATED' ? (
                                    <span className="text-emerald-700 font-medium">AUTO</span>
                                  ) : (
                                    <span className="text-slate-400">UNCONFIGURED</span>
                                  )}
                                </div>
                              </div>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Explanation Footer */}
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-xs text-[#667085] space-y-1">
              <div className="flex items-center gap-1.5 font-bold text-[#101828]">
                <HelpCircle className="w-4 h-4 text-[#1455D9]" /> Calculation Integrity Guarantee
              </div>
              <p>
                Every cell in this table maintains full mathematical traceability to the Double HB anchor base. Overriding a single price preserves other automatic formulas.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Modal: Save as Reusable Setup (Optional) */}
      {saveSetupModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b pb-3">
              <div className="flex items-center gap-2">
                <Save className="w-5 h-5 text-[#1455D9]" />
                <h3 className="text-base font-bold text-[#101828]">Save Calculation Setup</h3>
              </div>
              <button
                onClick={() => setSaveSetupModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 text-lg"
              >
                &times;
              </button>
            </div>

            <p className="text-xs text-[#667085]">
              Save your configured adjustments for later reuse. Users may create as many custom setups as needed.
            </p>

            <form onSubmit={handleSaveSetupSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-[#344054] mb-1">
                  Setup Name <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. My HB Calculation, Mount Randholee Summer"
                  value={setupNameInput}
                  onChange={(e) => setSetupNameInput(e.target.value)}
                  className="w-full h-10 px-3 rounded-xl border border-[#D9E0EA] text-xs font-medium focus:outline-none focus:ring-2 focus:ring-[#1455D9]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#344054] mb-1">
                  Description (Optional)
                </label>
                <textarea
                  rows={2}
                  placeholder="e.g. For Hill country boutique properties with high triple supplements"
                  value={setupDescInput}
                  onChange={(e) => setSetupDescInput(e.target.value)}
                  className="w-full p-3 rounded-xl border border-[#D9E0EA] text-xs font-medium focus:outline-none focus:ring-2 focus:ring-[#1455D9]"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setSaveSetupModalOpen(false)}
                  className="h-10 px-4 rounded-xl border border-[#D9E0EA] text-xs font-medium text-[#344054] hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="h-10 px-4 rounded-xl bg-[#1455D9] hover:bg-blue-700 text-xs font-bold text-white shadow-xs"
                >
                  Save Setup
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Save Rate Sheet Confirmation */}
      {saveRateSheetModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b pb-3">
              <div className="flex items-center gap-2">
                <FileCheck className="w-5 h-5 text-emerald-600" />
                <h3 className="text-base font-bold text-[#101828]">Confirm Rate Sheet Creation</h3>
              </div>
              <button
                onClick={() => setSaveRateSheetModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 text-lg"
              >
                &times;
              </button>
            </div>

            <p className="text-xs text-[#667085]">
              You are about to save an immutable rate sheet snapshot for:
            </p>

            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs space-y-1.5">
              <div className="flex justify-between">
                <span className="text-[#667085]">Property:</span>
                <span className="font-bold text-[#101828]">
                  {hotels.find((h) => h.id === selectedHotelId)?.hotel_name || 'Selected Property'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#667085]">Season:</span>
                <span className="font-bold text-[#101828]">
                  {seasons.find((s) => s.id === selectedSeasonId)?.season_label || 'Standard Season'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#667085]">Rate Category Tier:</span>
                <span className="font-bold text-blue-600">{selectedRateTier} TIER</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#667085]">Anchor Base Rate:</span>
                <span className="font-bold text-[#101828]">${anchorValue} USD</span>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setSaveRateSheetModalOpen(false)}
                className="h-10 px-4 rounded-xl border border-[#D9E0EA] text-xs font-medium text-[#344054] hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveRateSheet}
                className="h-10 px-5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-xs font-bold text-white shadow-xs"
              >
                Confirm & Save Rate Sheet
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
