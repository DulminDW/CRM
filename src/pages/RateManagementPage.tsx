import React, { useState, useEffect, useCallback } from 'react';
import {
  Percent,
  Hotel as HotelIcon,
  CalendarDays,
  FileText,
  Save,
  RefreshCw,
  Send,
  AlertCircle,
  CheckCircle2,
  Lock,
  ArrowRight
} from 'lucide-react';
import { Link, useSearchParams } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { supabase, isSupabaseConfigured } from '../lib/supabase';

export type RateCategory = 'HOTEL_CONTRACT' | 'GREEN' | 'YELLOW' | 'RED';

interface HotelItem {
  id: string;
  hotel_name: string;
  hotel_code?: string;
  area?: string;
}

interface SeasonItem {
  id: string;
  season_label: string;
  date_from: string;
  date_to: string;
  hotel_id: string;
}

interface RateMatrixRow {
  roomType: string;
  bb: number | '';
  hb: number | '';
  fb: number | '';
}

const DEFAULT_MATRIX: RateMatrixRow[] = [
  { roomType: 'Single Room', bb: '', hb: '', fb: '' },
  { roomType: 'Double Room', bb: '', hb: '', fb: '' },
  { roomType: 'Triple Room', bb: '', hb: '', fb: '' },
  { roomType: 'Quad Room', bb: '', hb: '', fb: '' },
];

export const RateManagementPage: React.FC = () => {
  const { profile, hasPermission } = useAuth();
  const isAdmin = profile?.role === 'ADMIN';
  const canEditRates = isAdmin || hasPermission('CAN_MANAGE_RATES');

  const [searchParams, setSearchParams] = useSearchParams();
  const hotelIdParam = searchParams.get('hotelId') || '';

  const [hotels, setHotels] = useState<HotelItem[]>([]);
  const [seasons, setSeasons] = useState<SeasonItem[]>([]);
  const [selectedHotelId, setSelectedHotelId] = useState<string>(hotelIdParam);
  const [selectedSeasonId, setSelectedSeasonId] = useState<string>('');
  const [activeCategory, setActiveCategory] = useState<RateCategory>('GREEN');

  // Rate Sheet State
  const [currency, setCurrency] = useState<'USD' | 'EUR' | 'GBP' | 'LKR'>('USD');
  const [matrix, setMatrix] = useState<RateMatrixRow[]>(DEFAULT_MATRIX);
  const [singleReduction, setSingleReduction] = useState<number | ''>('');
  const [tripleSupplement, setTripleSupplement] = useState<number | ''>('');
  const [bbReduction, setBbReduction] = useState<number | ''>('');
  const [childRate, setChildRate] = useState<number | ''>('');
  const [extraBedSupplement, setExtraBedSupplement] = useState<number | ''>('');
  const [taxDetails, setTaxDetails] = useState<string>('Includes 10% Service Charge & VAT (18%)');
  const [conditions, setConditions] = useState<string>('Cancellation within 14 days of arrival incurs 100% cancellation charge.');

  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Load Hotels
  const loadHotels = useCallback(async () => {
    if (!isSupabaseConfigured) return;
    try {
      const { data, error } = await supabase
        .from('hotels')
        .select('id, hotel_name, hotel_code, area')
        .order('hotel_name', { ascending: true });

      if (error) {
        console.error('Error fetching hotels:', error);
        return;
      }

      if (data && data.length > 0 && data[0]) {
        setHotels(data);
        if (!selectedHotelId) {
          setSelectedHotelId(data[0].id);
        }
      }
    } catch (err) {
      console.error('Error fetching hotels:', err);
    }
  }, [selectedHotelId]);

  useEffect(() => {
    loadHotels();
  }, [loadHotels]);

  // Load Seasons when Hotel changes
  useEffect(() => {
    if (!selectedHotelId || !isSupabaseConfigured) return;

    const loadSeasons = async () => {
      try {
        const { data, error } = await supabase
          .from('hotel_seasons')
          .select('id, season_label, date_from, date_to, hotel_id')
          .eq('hotel_id', selectedHotelId)
          .order('date_from', { ascending: true });

        if (error) {
          console.error('Error fetching seasons:', error);
          return;
        }

        if (data && data.length > 0 && data[0]) {
          setSeasons(data);
          setSelectedSeasonId(data[0].id);
        } else {
          setSeasons([]);
          setSelectedSeasonId('');
        }
      } catch (err) {
        console.error('Error fetching seasons:', err);
      }
    };

    loadSeasons();
  }, [selectedHotelId]);

  // Load Saved Rate Sheet for Hotel + Season + Category
  useEffect(() => {
    if (!selectedHotelId || !selectedSeasonId || !isSupabaseConfigured) {
      setIsLoading(false);
      return;
    }

    const loadRateSheet = async () => {
      setIsLoading(true);
      setStatusMessage(null);
      try {
        const { data } = await supabase
          .from('hotel_rate_configs')
          .select('*')
          .eq('hotel_id', selectedHotelId)
          .eq('season_id', selectedSeasonId)
          .eq('rate_category', activeCategory)
          .order('version_number', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (data) {
          setCurrency((data.currency as any) || 'USD');
          if (data.rate_matrix && Array.isArray(data.rate_matrix) && data.rate_matrix.length > 0) {
            setMatrix(data.rate_matrix.map((row: any) => ({
              roomType: String(row.roomType || 'Room'),
              bb: row.bb !== undefined && row.bb !== null ? row.bb : '',
              hb: row.hb !== undefined && row.hb !== null ? row.hb : '',
              fb: row.fb !== undefined && row.fb !== null ? row.fb : '',
            })));
          } else {
            // Fallback: Populate double HB from base rate if exists
            const baseHb = data.hb_double_base_rate ? Number(data.hb_double_base_rate) : '';
            setMatrix([
              { roomType: 'Single Room', bb: '', hb: '', fb: '' },
              { roomType: 'Double Room', bb: '', hb: baseHb, fb: '' },
              { roomType: 'Triple Room', bb: '', hb: '', fb: '' },
              { roomType: 'Quad Room', bb: '', hb: '', fb: '' },
            ]);
          }

          setSingleReduction(data.single_reduction_amount !== null ? Number(data.single_reduction_amount) : '');
          setTripleSupplement(data.triple_supplement_amount !== null ? Number(data.triple_supplement_amount) : '');
          setBbReduction(data.bb_reduction_amount !== null ? Number(data.bb_reduction_amount) : '');
          
          if (data.supplements) {
            setChildRate((data.supplements as any)?.childRate ?? '');
            setExtraBedSupplement((data.supplements as any)?.extraBedSupplement ?? '');
          }
          if (data.tax_details) setTaxDetails(data.tax_details);
          if (data.conditions) setConditions(data.conditions);
        } else {
          // Reset to default empty matrix for this sheet
          setMatrix(DEFAULT_MATRIX);
          setSingleReduction('');
          setTripleSupplement('');
          setBbReduction('');
          setChildRate('');
          setExtraBedSupplement('');
        }
      } catch (err) {
        console.error('Error fetching rate config:', err);
      } finally {
        setIsLoading(false);
      }
    };

    loadRateSheet();
  }, [selectedHotelId, selectedSeasonId, activeCategory]);

  const handleCellChange = (rowIndex: number, field: 'bb' | 'hb' | 'fb', value: string) => {
    const num = value === '' ? '' : parseFloat(value);
    setMatrix((prev) => {
      return prev.map((row, idx) => {
        if (idx === rowIndex) {
          return {
            roomType: row.roomType,
            bb: field === 'bb' ? (isNaN(num as number) ? '' : num) : row.bb,
            hb: field === 'hb' ? (isNaN(num as number) ? '' : num) : row.hb,
            fb: field === 'fb' ? (isNaN(num as number) ? '' : num) : row.fb,
          };
        }
        return row;
      });
    });
  };

  const handleSaveRateSheet = async () => {
    if (!canEditRates) {
      setStatusMessage({ type: 'error', text: 'You do not have permission to modify rates.' });
      return;
    }

    if (!selectedHotelId || !selectedSeasonId) {
      setStatusMessage({ type: 'error', text: 'Please select both a Hotel and a Season.' });
      return;
    }

    setIsSaving(true);
    setStatusMessage(null);

    try {
      // Determine base rate from Double Room HB or first non-empty cell
      const doubleHbRow = matrix.find((m) => m.roomType.toLowerCase().includes('double'));
      const baseHbRate = doubleHbRow && typeof doubleHbRow.hb === 'number' ? doubleHbRow.hb : 0;

      // 1. Check existing record
      const { data: existing } = await supabase
        .from('hotel_rate_configs')
        .select('id, version_number')
        .eq('hotel_id', selectedHotelId)
        .eq('season_id', selectedSeasonId)
        .eq('rate_category', activeCategory)
        .order('version_number', { ascending: false })
        .limit(1)
        .maybeSingle();

      const newVersion = existing ? (existing.version_number || 1) + 1 : 1;

      const payload = {
        hotel_id: selectedHotelId,
        season_id: selectedSeasonId,
        rate_category: activeCategory,
        currency,
        hb_double_base_rate: baseHbRate,
        single_reduction_amount: singleReduction !== '' ? Number(singleReduction) : 0,
        triple_supplement_amount: tripleSupplement !== '' ? Number(tripleSupplement) : 0,
        bb_reduction_amount: bbReduction !== '' ? Number(bbReduction) : 0,
        is_formula_verified: true,
        status: 'ACTIVE',
        version_number: newVersion,
        created_by: profile?.id,
        updated_by: profile?.id,
        rate_matrix: matrix,
        supplements: {
          singleReduction,
          tripleSupplement,
          bbReduction,
          childRate,
          extraBedSupplement,
        },
        tax_details: taxDetails,
        conditions: conditions,
        internal_notes: `Rate Sheet updated: ${activeCategory} (v${newVersion})`,
      };

      let saveErr = null;
      if (existing) {
        const { error: updErr } = await supabase
          .from('hotel_rate_configs')
          .update(payload)
          .eq('id', existing.id);
        saveErr = updErr;
      } else {
        const { error: insErr } = await supabase
          .from('hotel_rate_configs')
          .insert(payload);
        saveErr = insErr;
      }

      if (saveErr) {
        throw new Error(saveErr.message);
      }

      setStatusMessage({
        type: 'success',
        text: `Rate Sheet "${activeCategory}" saved successfully as Version ${newVersion}.`,
      });
      setTimeout(() => setStatusMessage(null), 5000);
    } catch (err: any) {
      setStatusMessage({ type: 'error', text: err.message || 'Failed to save rate sheet' });
    } finally {
      setIsSaving(false);
    }
  };

  const selectedHotel = hotels.find((h) => h.id === selectedHotelId);
  const selectedSeason = seasons.find((s) => s.id === selectedSeasonId);

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#EAF2FF] flex items-center justify-center text-[#1455D9]">
              <Percent className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-bold tracking-tight text-[#101828]">
                  Rate Management
                </h1>
                {!canEditRates && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">
                    <Lock className="w-3 h-3" /> View Only
                  </span>
                )}
              </div>
              <p className="text-xs text-[#667085] mt-0.5">
                Centralized Rates Hub — Hotel Contract Rate & 3 Commercial Tiers (GREEN, YELLOW, RED)
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Link
            to="/share-rates"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold text-white bg-[#1455D9] hover:bg-[#1044B2] shadow-sm transition-all"
          >
            <Send className="w-3.5 h-3.5" />
            <span>Go to Rate Sharing Wizard</span>
            <ArrowRight className="w-3.5 h-3.5 ml-0.5" />
          </Link>
        </div>
      </div>

      {/* Prominent Hotel Selector & Overview */}
      <div className="bg-white p-5 rounded-2xl border border-[#D9E0EA] shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#F0F2F5]">
          <div>
            <h2 className="text-sm font-bold text-[#101828] flex items-center gap-2">
              <HotelIcon className="w-4 h-4 text-[#1455D9]" />
              Select Partner Hotel ({hotels.length} Available)
            </h2>
            <p className="text-xs text-[#667085] mt-0.5">
              Click any hotel below to manage its Hotel Contract and RED / GREEN / YELLOW Rate Sheets
            </p>
          </div>
          {selectedHotel && (
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-blue-50 border border-blue-200 text-xs font-bold text-[#1455D9] self-start sm:self-auto">
              <span className="w-2 h-2 rounded-full bg-[#1455D9] animate-pulse"></span>
              Active: {selectedHotel.hotel_name} {selectedHotel.hotel_code ? `(${selectedHotel.hotel_code})` : ''}
            </div>
          )}
        </div>

        {/* Hotel Cards Carousel / Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2.5">
          {hotels.map((h) => {
            const isSelected = h.id === selectedHotelId;
            return (
              <button
                key={h.id}
                type="button"
                onClick={() => {
                  setSelectedHotelId(h.id);
                  setSearchParams({ hotelId: h.id });
                }}
                className={`p-3 rounded-xl border text-left transition-all flex flex-col justify-between ${
                  isSelected
                    ? 'bg-[#1455D9] text-white border-[#1455D9] shadow-md shadow-[#1455D9]/20 ring-2 ring-[#1455D9]/30'
                    : 'bg-slate-50/60 hover:bg-white text-[#101828] border-[#E4E7EC] hover:border-[#CBD5E1]'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <span
                      className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                        isSelected ? 'bg-white/20 text-white' : 'bg-slate-200/80 text-slate-700'
                      }`}
                    >
                      {h.hotel_code || 'HTL'}
                    </span>
                    {isSelected && <CheckCircle2 className="w-3.5 h-3.5 text-white" />}
                  </div>
                  <h4 className={`text-xs font-bold line-clamp-2 ${isSelected ? 'text-white' : 'text-[#101828]'}`}>
                    {h.hotel_name}
                  </h4>
                </div>
                <p className={`text-[11px] mt-2 truncate ${isSelected ? 'text-white/80' : 'text-[#667085]'}`}>
                  📍 {h.area || 'Sri Lanka'}
                </p>
              </button>
            );
          })}
        </div>

        {/* Season & Currency Selector Bar */}
        <div className="pt-3 border-t border-[#F0F2F5] flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <CalendarDays className="w-4 h-4 text-[#1455D9] shrink-0" />
            <label className="text-xs font-bold uppercase tracking-wider text-[#101828] whitespace-nowrap">
              Active Season:
            </label>
            <select
              value={selectedSeasonId}
              onChange={(e) => setSelectedSeasonId(e.target.value)}
              className="w-full sm:w-64 px-3.5 py-2 bg-slate-50 border border-[#D9E0EA] rounded-xl text-xs font-bold text-[#101828] focus:outline-none focus:ring-2 focus:ring-[#1455D9]/20 focus:border-[#1455D9]"
            >
              {seasons.length === 0 ? (
                <option value="">No Seasons Found</option>
              ) : (
                seasons.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.season_label} ({s.date_from.slice(5)} to {s.date_to.slice(5)})
                  </option>
                ))
              )}
            </select>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs font-bold uppercase tracking-wider text-[#667085]">Rate Currency:</span>
            <select
              value={currency}
              onChange={(e) => setCurrency(e.target.value as any)}
              disabled={!canEditRates}
              className="px-3.5 py-2 bg-slate-50 border border-[#D9E0EA] rounded-xl text-xs font-bold text-[#101828] focus:outline-none"
            >
              <option value="USD">USD ($)</option>
              <option value="EUR">EUR (€)</option>
              <option value="GBP">GBP (£)</option>
              <option value="LKR">LKR (Rs)</option>
            </select>
          </div>
        </div>
      </div>

      {/* Available Rate Sheets Header Tabs (4 Rate Sheets) */}
      <div className="space-y-3">
        <h2 className="text-xs font-bold uppercase tracking-wider text-[#667085]">
          Available Rate Sheets for {selectedHotel?.hotel_name || 'Selected Hotel'}
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Sheet 1: Hotel Contract Rate */}
          <button
            type="button"
            onClick={() => setActiveCategory('HOTEL_CONTRACT')}
            className={`p-4 rounded-2xl border text-left transition-all relative overflow-hidden flex flex-col justify-between ${
              activeCategory === 'HOTEL_CONTRACT'
                ? 'bg-blue-50/80 border-[#1455D9] shadow-sm ring-2 ring-[#1455D9]/20'
                : 'bg-white border-[#D9E0EA] hover:bg-slate-50'
            }`}
          >
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-blue-100 text-blue-800">
                  ORIGINAL HOTEL RATE
                </span>
                <FileText className="w-4 h-4 text-blue-600" />
              </div>
              <h3 className="text-sm font-bold text-[#101828]">Hotel Contract Rate</h3>
              <p className="text-xs text-[#667085] mt-1">
                Direct contracted rates provided by the hotel.
              </p>
            </div>
            <div className="mt-4 pt-3 border-t border-blue-100 text-[11px] font-semibold text-blue-700 flex items-center justify-between">
              <span>Primary Source</span>
              {activeCategory === 'HOTEL_CONTRACT' && <span className="font-bold">Active</span>}
            </div>
          </button>

          {/* Sheet 2: GREEN Rate (NORMAL) */}
          <button
            type="button"
            onClick={() => setActiveCategory('GREEN')}
            className={`p-4 rounded-2xl border text-left transition-all relative overflow-hidden flex flex-col justify-between ${
              activeCategory === 'GREEN'
                ? 'bg-emerald-50/80 border-emerald-500 shadow-sm ring-2 ring-emerald-500/20'
                : 'bg-white border-[#D9E0EA] hover:bg-slate-50'
            }`}
          >
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-100 text-emerald-800">
                  NORMAL – TRAVEL AGENCIES
                </span>
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
              </div>
              <h3 className="text-sm font-bold text-[#101828]">GREEN Rate Sheet</h3>
              <p className="text-xs text-[#667085] mt-1">
                Standard commercial agency rate distributed to partners.
              </p>
            </div>
            <div className="mt-4 pt-3 border-t border-emerald-100 text-[11px] font-semibold text-emerald-700 flex items-center justify-between">
              <span>Standard Market</span>
              {activeCategory === 'GREEN' && <span className="font-bold">Active</span>}
            </div>
          </button>

          {/* Sheet 3: YELLOW Rate (HIGHEST) */}
          <button
            type="button"
            onClick={() => setActiveCategory('YELLOW')}
            className={`p-4 rounded-2xl border text-left transition-all relative overflow-hidden flex flex-col justify-between ${
              activeCategory === 'YELLOW'
                ? 'bg-amber-50/80 border-amber-500 shadow-sm ring-2 ring-amber-500/20'
                : 'bg-white border-[#D9E0EA] hover:bg-slate-50'
            }`}
          >
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-amber-100 text-amber-800">
                  HIGHEST – TRAVEL AGENCIES
                </span>
                <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
              </div>
              <h3 className="text-sm font-bold text-[#101828]">YELLOW Rate Sheet</h3>
              <p className="text-xs text-[#667085] mt-1">
                Highest rate tier for peak season or high-demand periods.
              </p>
            </div>
            <div className="mt-4 pt-3 border-t border-amber-100 text-[11px] font-semibold text-amber-700 flex items-center justify-between">
              <span>Peak Tier</span>
              {activeCategory === 'YELLOW' && <span className="font-bold">Active</span>}
            </div>
          </button>

          {/* Sheet 4: RED Rate (LOWEST) */}
          <button
            type="button"
            onClick={() => setActiveCategory('RED')}
            className={`p-4 rounded-2xl border text-left transition-all relative overflow-hidden flex flex-col justify-between ${
              activeCategory === 'RED'
                ? 'bg-red-50/80 border-red-500 shadow-sm ring-2 ring-red-500/20'
                : 'bg-white border-[#D9E0EA] hover:bg-slate-50'
            }`}
          >
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-red-100 text-red-800">
                  LOWEST – TRAVEL AGENCIES
                </span>
                <span className="w-2.5 h-2.5 rounded-full bg-red-500" />
              </div>
              <h3 className="text-sm font-bold text-[#101828]">RED Rate Sheet</h3>
              <p className="text-xs text-[#667085] mt-1">
                Promotional or lowest competitive quote tier.
              </p>
            </div>
            <div className="mt-4 pt-3 border-t border-red-100 text-[11px] font-semibold text-red-700 flex items-center justify-between">
              <span>Promotional Tier</span>
              {activeCategory === 'RED' && <span className="font-bold">Active</span>}
            </div>
          </button>
        </div>
      </div>

      {/* Notifications */}
      {statusMessage && (
        <div
          className={`p-3.5 rounded-xl border text-xs font-semibold flex items-center gap-2 ${
            statusMessage.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
              : 'bg-red-50 border-red-200 text-red-800'
          }`}
        >
          {statusMessage.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          ) : (
            <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
          )}
          <span>{statusMessage.text}</span>
        </div>
      )}

      {/* Active Rate Sheet Matrix & Details */}
      <div className="bg-white rounded-2xl border border-[#D9E0EA] shadow-sm overflow-hidden p-6 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#D9E0EA] pb-4">
          <div>
            <div className="flex items-center gap-2">
              <span
                className={`w-3 h-3 rounded-full ${
                  activeCategory === 'HOTEL_CONTRACT'
                    ? 'bg-blue-600'
                    : activeCategory === 'GREEN'
                    ? 'bg-emerald-500'
                    : activeCategory === 'YELLOW'
                    ? 'bg-amber-500'
                    : 'bg-red-500'
                }`}
              />
              <h3 className="text-lg font-bold text-[#101828]">
                {activeCategory === 'HOTEL_CONTRACT'
                  ? 'Hotel Contract Rate Sheet'
                  : `${activeCategory} Commercial Rate Sheet`}
              </h3>
            </div>
            <p className="text-xs text-[#667085] mt-0.5">
              Hotel: <strong className="text-[#101828]">{selectedHotel?.hotel_name}</strong> • Season:{' '}
              <strong className="text-[#101828]">{selectedSeason?.season_label || 'All'}</strong> ({currency})
            </p>
          </div>

          {canEditRates && (
            <button
              onClick={handleSaveRateSheet}
              disabled={isSaving}
              className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl text-xs font-semibold text-white bg-[#1455D9] hover:bg-[#1044B2] shadow-sm transition-all"
            >
              {isSaving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              <span>Save Rate Sheet</span>
            </button>
          )}
        </div>

        {/* Room Occupancy & Meal Plan Grid */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-[#101828]">
              Room Occupancy & Meal Plan Grid ({currency})
            </h4>
            {isLoading && (
              <span className="text-xs text-blue-600 flex items-center gap-1">
                <RefreshCw className="w-3 h-3 animate-spin" /> Loading sheet...
              </span>
            )}
          </div>

          <div className="border border-[#D9E0EA] rounded-xl overflow-x-auto shadow-xs">
            <table className="w-full min-w-[560px] text-left text-xs">
              <thead className="bg-[#EAF2FF] border-b border-[#D9E0EA] text-[#08264F] font-bold uppercase">
                <tr>
                  <th className="py-3 px-4 min-w-[140px]">Room / Occupancy</th>
                  <th className="py-3 px-4 text-center min-w-[120px]">Bed & Breakfast (BB)</th>
                  <th className="py-3 px-4 text-center min-w-[120px]">Half Board (HB)</th>
                  <th className="py-3 px-4 text-center min-w-[120px]">Full Board (FB)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#D9E0EA]">
                {matrix.map((row, idx) => (
                  <tr key={row.roomType} className="hover:bg-slate-50/50">
                    <td className="py-3 px-4 font-bold text-[#101828]">{row.roomType}</td>
                    <td className="py-2 px-4 text-center">
                      <div className="relative max-w-[140px] mx-auto">
                        <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 font-mono text-xs">
                          {currency}
                        </span>
                        <input
                          type="number"
                          placeholder="0.00"
                          value={row.bb}
                          disabled={!canEditRates}
                          onChange={(e) => handleCellChange(idx, 'bb', e.target.value)}
                          className="w-full pl-12 pr-3 py-1.5 bg-slate-50 border border-[#D9E0EA] rounded-lg text-xs font-semibold text-[#101828] text-right focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#1455D9]"
                        />
                      </div>
                    </td>
                    <td className="py-2 px-4 text-center">
                      <div className="relative max-w-[140px] mx-auto">
                        <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 font-mono text-xs">
                          {currency}
                        </span>
                        <input
                          type="number"
                          placeholder="0.00"
                          value={row.hb}
                          disabled={!canEditRates}
                          onChange={(e) => handleCellChange(idx, 'hb', e.target.value)}
                          className="w-full pl-12 pr-3 py-1.5 bg-slate-50 border border-[#D9E0EA] rounded-lg text-xs font-semibold text-[#101828] text-right focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#1455D9]"
                        />
                      </div>
                    </td>
                    <td className="py-2 px-4 text-center">
                      <div className="relative max-w-[140px] mx-auto">
                        <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 font-mono text-xs">
                          {currency}
                        </span>
                        <input
                          type="number"
                          placeholder="0.00"
                          value={row.fb}
                          disabled={!canEditRates}
                          onChange={(e) => handleCellChange(idx, 'fb', e.target.value)}
                          className="w-full pl-12 pr-3 py-1.5 bg-slate-50 border border-[#D9E0EA] rounded-lg text-xs font-semibold text-[#101828] text-right focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#1455D9]"
                        />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Additional Rate Details & Supplements */}
        <div className="pt-4 border-t border-[#D9E0EA]">
          <h4 className="text-xs font-bold uppercase tracking-wider text-[#101828] mb-3">
            Additional Rate Details & Dynamic Supplements
          </h4>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
            <div>
              <label className="block text-[11px] font-semibold text-[#667085] mb-1">
                Single Reduction ({currency})
              </label>
              <input
                type="number"
                placeholder="e.g. 15.00"
                value={singleReduction}
                disabled={!canEditRates}
                onChange={(e) => setSingleReduction(e.target.value === '' ? '' : Number(e.target.value))}
                className="w-full px-3 py-1.5 bg-slate-50 border border-[#D9E0EA] rounded-lg text-xs font-semibold text-[#101828] focus:bg-white focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-[#667085] mb-1">
                Triple Supplement ({currency})
              </label>
              <input
                type="number"
                placeholder="e.g. 25.00"
                value={tripleSupplement}
                disabled={!canEditRates}
                onChange={(e) => setTripleSupplement(e.target.value === '' ? '' : Number(e.target.value))}
                className="w-full px-3 py-1.5 bg-slate-50 border border-[#D9E0EA] rounded-lg text-xs font-semibold text-[#101828] focus:bg-white focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-[#667085] mb-1">
                BB Reduction ({currency})
              </label>
              <input
                type="number"
                placeholder="e.g. 8.00"
                value={bbReduction}
                disabled={!canEditRates}
                onChange={(e) => setBbReduction(e.target.value === '' ? '' : Number(e.target.value))}
                className="w-full px-3 py-1.5 bg-slate-50 border border-[#D9E0EA] rounded-lg text-xs font-semibold text-[#101828] focus:bg-white focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-[#667085] mb-1">
                Child Rate / Supplement ({currency})
              </label>
              <input
                type="number"
                placeholder="e.g. 12.00"
                value={childRate}
                disabled={!canEditRates}
                onChange={(e) => setChildRate(e.target.value === '' ? '' : Number(e.target.value))}
                className="w-full px-3 py-1.5 bg-slate-50 border border-[#D9E0EA] rounded-lg text-xs font-semibold text-[#101828] focus:bg-white focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-[#667085] mb-1">
                Extra Bed Supplement ({currency})
              </label>
              <input
                type="number"
                placeholder="e.g. 20.00"
                value={extraBedSupplement}
                disabled={!canEditRates}
                onChange={(e) => setExtraBedSupplement(e.target.value === '' ? '' : Number(e.target.value))}
                className="w-full px-3 py-1.5 bg-slate-50 border border-[#D9E0EA] rounded-lg text-xs font-semibold text-[#101828] focus:bg-white focus:outline-none"
              />
            </div>
          </div>
        </div>

        {/* Tax Details & Special Conditions */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-[#101828] mb-1.5">
              Tax Details & Surcharges
            </label>
            <textarea
              rows={2}
              value={taxDetails}
              disabled={!canEditRates}
              onChange={(e) => setTaxDetails(e.target.value)}
              className="w-full px-3.5 py-2 bg-slate-50 border border-[#D9E0EA] rounded-xl text-xs text-[#101828] focus:bg-white focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-[#101828] mb-1.5">
              Special Conditions & Cancellation Policy
            </label>
            <textarea
              rows={2}
              value={conditions}
              disabled={!canEditRates}
              onChange={(e) => setConditions(e.target.value)}
              className="w-full px-3.5 py-2 bg-slate-50 border border-[#D9E0EA] rounded-xl text-xs text-[#101828] focus:bg-white focus:outline-none"
            />
          </div>
        </div>
      </div>
    </div>
  );
};
