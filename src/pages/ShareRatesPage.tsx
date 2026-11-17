import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import {
  Send,
  Mail,
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  Clock,
  Sparkles,
  Copy,
  ExternalLink,
  Check,
  ChevronRight,
  ChevronLeft,
  Trash2,
  Plus,
  RefreshCw,
  Info,
  Sliders,
  X
} from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { notificationService } from '../services/notificationService';
import { fetchAgencies } from '../services/agencyService';
import { fetchMarkets } from '../services/marketService';
import { fetchMembers } from '../services/memberService';
import { TravelAgencyRecord, AgencyMarketRecord, AgencyMemberRecord } from '../types/agencyHierarchy';

export type RateCategory = 'RED' | 'GREEN' | 'YELLOW' | 'CUSTOM';

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

export interface HotelRateSelection {
  hotelId: string;
  hotelName: string;
  seasonId: string;
  seasonLabel: string;
  category: RateCategory;
  currency: string;
  baseDoubleHb: number;
  matrix: { roomType: string; bb: number | ''; hb: number | ''; fb: number | '' }[];
  supplements: {
    singleReduction?: number | '';
    tripleSupplement?: number | '';
    bbReduction?: number | '';
    childRate?: number | '';
    extraBedSupplement?: number | '';
  };
  conditions: string;
  taxDetails: string;
  customRateNotes?: string;
  hasLoadedRate: boolean;
  versionNumber?: number;
}

export const ShareRatesPage: React.FC = () => {
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  // Wizard Step: 1 = Recipients, 2 = Hotels & Rates, 3 = Email Preview & Handoff, 4 = Confirmation
  const [step, setStep] = useState<number>(1);

  // ----------------------------------------------------
  // STEP 1 STATE: Agency -> Market -> Members
  // ----------------------------------------------------
  const [agencies, setAgencies] = useState<TravelAgencyRecord[]>([]);
  const [selectedAgencyId, setSelectedAgencyId] = useState<string>(searchParams.get('agencyId') || '');
  const [markets, setMarkets] = useState<AgencyMarketRecord[]>([]);
  const [selectedMarketId, setSelectedMarketId] = useState<string>('ALL');
  const [members, setMembers] = useState<AgencyMemberRecord[]>([]);
  const [selectedMemberIds, setSelectedMemberIds] = useState<string[]>([]);
  const [searchMemberQuery, setSearchMemberQuery] = useState<string>('');

  // ----------------------------------------------------
  // STEP 2 STATE: Hotels & Rate Categories
  // ----------------------------------------------------
  const [allHotels, setAllHotels] = useState<HotelItem[]>([]);
  const [allSeasons, setAllSeasons] = useState<SeasonItem[]>([]);
  const [hotelSelections, setHotelSelections] = useState<HotelRateSelection[]>([]);

  // Custom Rate Sheet Builder Modal State
  const [editingCustomIndex, setEditingCustomIndex] = useState<number | null>(null);
  const [customModalCurrency, setCustomModalCurrency] = useState<string>('USD');
  const [customModalMatrix, setCustomModalMatrix] = useState<{ roomType: string; bb: number | ''; hb: number | ''; fb: number | '' }[]>([]);
  const [customModalSupplements, setCustomModalSupplements] = useState<{
    singleReduction?: number | '';
    tripleSupplement?: number | '';
    bbReduction?: number | '';
    childRate?: number | '';
    extraBedSupplement?: number | '';
  }>({});
  const [customModalConditions, setCustomModalConditions] = useState<string>('');
  const [customModalTaxDetails, setCustomModalTaxDetails] = useState<string>('');
  const [customModalNotes, setCustomModalNotes] = useState<string>('');

  // ----------------------------------------------------
  // STEP 3 STATE: Email Preview & Customization
  // ----------------------------------------------------
  const [emailSubject, setEmailSubject] = useState<string>('');
  const [customEmailIntro, setCustomEmailIntro] = useState<string>('');
  const [internalNotes, setInternalNotes] = useState<string>('');
  const [isOpeningEmailApp, setIsOpeningEmailApp] = useState<boolean>(false);
  const [savedQuoteId, setSavedQuoteId] = useState<string | null>(null);
  const [savedQuoteRef, setSavedQuoteRef] = useState<string | null>(null);

  // Feedback & Copy State
  const [copiedType, setCopiedType] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error' | 'warning'; text: string } | null>(null);
  const [isSaving, setIsSaving] = useState<boolean>(false);

  // ====================================================
  // DATA LOADERS
  // ====================================================

  // Load Agencies
  useEffect(() => {
    async function loadAgencies() {
      const res = await fetchAgencies();
      if (res.data) {
        setAgencies(res.data);
        if (!selectedAgencyId && res.data.length > 0 && res.data[0]) {
          setSelectedAgencyId(res.data[0].id);
        }
      }
    }
    loadAgencies();
  }, []);

  // Load Markets & Members when Agency changes
  useEffect(() => {
    if (!selectedAgencyId) {
      setMarkets([]);
      setMembers([]);
      setSelectedMemberIds([]);
      return;
    }

    async function loadAgencyData() {
      const [mRes, memRes] = await Promise.all([
        fetchMarkets(selectedAgencyId),
        fetchMembers(selectedAgencyId)
      ]);
      if (mRes.data) setMarkets(mRes.data);
      if (memRes.data) {
        setMembers(memRes.data);
        // By default, select all valid members with email
        const validIds = memRes.data
          .filter((m) => m.email && /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/.test(m.email.trim()))
          .map((m) => m.id);
        setSelectedMemberIds(validIds);
      }
      setSelectedMarketId('ALL');
    }

    loadAgencyData();
  }, [selectedAgencyId]);

  // Load All Hotels & Seasons
  useEffect(() => {
    async function loadHotelsAndSeasons() {
      if (!isSupabaseConfigured) return;
      try {
        const { data: hData } = await supabase
          .from('hotels')
          .select('id, hotel_name, hotel_code, area')
          .order('hotel_name', { ascending: true });

        if (hData) setAllHotels(hData);

        const { data: sData } = await supabase
          .from('hotel_seasons')
          .select('id, season_label, date_from, date_to, hotel_id')
          .order('date_from', { ascending: true });

        if (sData) setAllSeasons(sData);

        // Prepopulate first hotel selection if query params or default
        if (hData && hData.length > 0 && hData[0] && hotelSelections.length === 0) {
          const firstHotel = hData[0];
          const firstSeason = sData?.find((s) => s.hotel_id === firstHotel.id);
          if (firstSeason) {
            addHotelSelection(firstHotel.id, firstSeason.id, 'GREEN');
          }
        }
      } catch (err) {
        console.error('Error fetching hotels/seasons:', err);
      }
    }
    loadHotelsAndSeasons();
  }, []);

  // Filtered Members for Display
  const filteredMembers = useMemo(() => {
    return members.filter((m) => {
      const matchesMarket = selectedMarketId === 'ALL' || m.market_id === selectedMarketId;
      const q = searchMemberQuery.toLowerCase();
      const matchesSearch =
        !q ||
        m.full_name.toLowerCase().includes(q) ||
        (m.email && m.email.toLowerCase().includes(q)) ||
        (m.position && m.position.toLowerCase().includes(q));
      return matchesMarket && matchesSearch;
    });
  }, [members, selectedMarketId, searchMemberQuery]);

  // Selected Recipient Objects with Duplicate & Invalid Email Detection
  const recipientAnalysis = useMemo(() => {
    const selected = members.filter((m) => selectedMemberIds.includes(m.id));
    const emailCounts: Record<string, number> = {};
    const validEmails: string[] = [];
    const invalidMembers: AgencyMemberRecord[] = [];
    const duplicateEmails: string[] = [];

    selected.forEach((m) => {
      const email = m.email ? m.email.trim().toLowerCase() : '';
      if (!email || !/^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/.test(email)) {
        invalidMembers.push(m);
      } else {
        emailCounts[email] = (emailCounts[email] || 0) + 1;
        if (emailCounts[email] === 1) {
          validEmails.push(email);
        } else if (emailCounts[email] === 2) {
          duplicateEmails.push(email);
        }
      }
    });

    return {
      selected,
      validEmails,
      invalidMembers,
      duplicateEmails,
      count: selected.length,
      validCount: validEmails.length,
    };
  }, [members, selectedMemberIds]);

  // Selected Agency Object
  const selectedAgency = useMemo(() => {
    return agencies.find((a) => a.id === selectedAgencyId);
  }, [agencies, selectedAgencyId]);

  // ====================================================
  // HOTEL RATE CONFIGURATION LOGIC
  // ====================================================

  // Add a Hotel to the selection
  const addHotelSelection = useCallback(
    async (hotelId: string, seasonId?: string, category: RateCategory = 'GREEN') => {
      const hotel = allHotels.find((h) => h.id === hotelId);
      const targetSeasonId = seasonId || allSeasons.find((s) => s.hotel_id === hotelId)?.id || '';
      const season = allSeasons.find((s) => s.id === targetSeasonId);

      const newSelection: HotelRateSelection = {
        hotelId,
        hotelName: hotel?.hotel_name || 'Hotel',
        seasonId: targetSeasonId,
        seasonLabel: season?.season_label || 'Default Season',
        category,
        currency: 'USD',
        baseDoubleHb: 0,
        matrix: [],
        supplements: {},
        conditions: 'Standard cancellation policy applies. Valid for 14 days.',
        taxDetails: 'Includes 10% Service Charge & VAT (18%)',
        customRateNotes: '',
        hasLoadedRate: false,
      };

      // Fetch saved rates from DB
      try {
        const { data } = await supabase
          .from('hotel_rate_configs')
          .select('*')
          .eq('hotel_id', hotelId)
          .eq('season_id', targetSeasonId)
          .eq('rate_category', category)
          .order('version_number', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (data) {
          newSelection.currency = (data.currency as any) || 'USD';
          newSelection.baseDoubleHb = data.hb_double_base_rate || 0;
          newSelection.matrix = Array.isArray(data.rate_matrix) ? data.rate_matrix : [];
          newSelection.supplements = data.supplements || {};
          newSelection.conditions = data.conditions || newSelection.conditions;
          newSelection.taxDetails = data.tax_details || newSelection.taxDetails;
          newSelection.versionNumber = data.version_number || 1;
          newSelection.hasLoadedRate = true;
        }
      } catch (err) {
        console.error('Error fetching rate config:', err);
      }

      setHotelSelections((prev) => {
        // Prevent duplicate hotel + season combo
        const exists = prev.some((p) => p.hotelId === hotelId && p.seasonId === targetSeasonId);
        if (exists) {
          return prev.map((p) => (p.hotelId === hotelId && p.seasonId === targetSeasonId ? newSelection : p));
        }
        return [...prev, newSelection];
      });
    },
    [allHotels, allSeasons]
  );

  // Update a specific Hotel's Category or Season
  const updateHotelSelection = async (index: number, updates: Partial<HotelRateSelection>) => {
    const current = hotelSelections[index];
    if (!current) return;

    const updated = { ...current, ...updates };

    // If hotel, season, or category changed, re-fetch rates from DB
    if (
      updates.hotelId !== undefined ||
      updates.seasonId !== undefined ||
      updates.category !== undefined
    ) {
      const hId = updates.hotelId || current.hotelId;
      const sId = updates.seasonId || current.seasonId;
      const cat = updates.category || current.category;

      const hObj = allHotels.find((h) => h.id === hId);
      const sObj = allSeasons.find((s) => s.id === sId);
      updated.hotelName = hObj?.hotel_name || current.hotelName;
      updated.seasonLabel = sObj?.season_label || current.seasonLabel;

      try {
        const { data } = await supabase
          .from('hotel_rate_configs')
          .select('*')
          .eq('hotel_id', hId)
          .eq('season_id', sId)
          .eq('rate_category', cat)
          .order('version_number', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (data) {
          updated.currency = (data.currency as any) || 'USD';
          updated.baseDoubleHb = data.hb_double_base_rate || 0;
          updated.matrix = Array.isArray(data.rate_matrix) ? data.rate_matrix : [];
          updated.supplements = data.supplements || {};
          updated.conditions = data.conditions || updated.conditions;
          updated.taxDetails = data.tax_details || updated.taxDetails;
          updated.versionNumber = data.version_number || 1;
          updated.hasLoadedRate = true;
        } else {
          updated.hasLoadedRate = false;
          updated.matrix = [];
        }
      } catch (err) {
        console.error('Error fetching rate config:', err);
      }
    }

    setHotelSelections((prev) => {
      const copy = [...prev];
      copy[index] = updated;
      return copy;
    });
  };

  // Remove a Hotel from the list
  const removeHotelSelection = (index: number) => {
    setHotelSelections((prev) => prev.filter((_, i) => i !== index));
  };

  // Open Custom Rate Builder Modal for a Hotel
  const handleOpenCustomRateBuilder = (index: number) => {
    const sel = hotelSelections[index];
    if (!sel) return;

    setEditingCustomIndex(index);
    setCustomModalCurrency(sel.currency || 'USD');
    setCustomModalConditions(sel.conditions || 'Negotiated rates applicable for confirmed bookings. Non-refundable within 7 days.');
    setCustomModalTaxDetails(sel.taxDetails || 'Includes 10% Service Charge & VAT (18%)');
    setCustomModalNotes(sel.customRateNotes || '');
    setCustomModalSupplements(sel.supplements ? { ...sel.supplements } : {
      singleReduction: 15,
      tripleSupplement: 35,
      bbReduction: 10,
      childRate: 20,
      extraBedSupplement: 30
    });

    if (sel.matrix && sel.matrix.length > 0) {
      setCustomModalMatrix(sel.matrix.map((r) => ({ ...r })));
    } else {
      // Default 4 room types matrix template
      setCustomModalMatrix([
        { roomType: 'Single Room', bb: 90, hb: 105, fb: 125 },
        { roomType: 'Double Room', bb: 110, hb: 120, fb: 145 },
        { roomType: 'Triple Room', bb: 145, hb: 160, fb: 190 },
        { roomType: 'Quad Room', bb: 180, hb: 200, fb: 235 },
      ]);
    }
  };

  // Save Custom Rate Builder Changes into HotelSelection and Return
  const handleSaveCustomRateBuilder = () => {
    if (editingCustomIndex === null) return;

    const baseDoubleRow = customModalMatrix.find((r) => r.roomType.toLowerCase().includes('double'));
    const doubleHb = baseDoubleRow && typeof baseDoubleRow.hb === 'number' ? baseDoubleRow.hb : 0;

    setHotelSelections((prev) => {
      const copy = [...prev];
      const target = copy[editingCustomIndex];
      if (target) {
        copy[editingCustomIndex] = {
          ...target,
          category: 'CUSTOM',
          currency: customModalCurrency,
          baseDoubleHb: doubleHb || target.baseDoubleHb,
          matrix: customModalMatrix,
          supplements: customModalSupplements,
          conditions: customModalConditions,
          taxDetails: customModalTaxDetails,
          customRateNotes: customModalNotes,
          hasLoadedRate: true,
          versionNumber: 1
        };
      }
      return copy;
    });

    setEditingCustomIndex(null);
  };

  // ====================================================
  // EMAIL TEMPLATE GENERATION
  // ====================================================

  // Auto-generate Subject when selections change
  useEffect(() => {
    if (hotelSelections.length === 0) {
      setEmailSubject(`Special Hotel Rates Quote — Window Companies`);
      return;
    }
    const hotelNames = hotelSelections.map((h) => h.hotelName).join(' & ');
    const seasonNames = Array.from(new Set(hotelSelections.map((h) => h.seasonLabel))).join(' / ');
    setEmailSubject(`${hotelNames} — ${seasonNames} Special Rates`);
  }, [hotelSelections]);

  // Construct Email Body Text (Plain text for mailto & Gmail composer)
  const emailBodyText = useMemo(() => {
    const firstRecipient = recipientAnalysis.selected[0];
    const greetingName = firstRecipient ? firstRecipient.full_name : 'Valued Partner';
    const agencyName = selectedAgency?.name || 'Travel Partner';

    // Rate category overview badges
    const categoriesPresent = Array.from(new Set(hotelSelections.map((h) => h.category)));
    const categoryBadge = categoriesPresent.join(' / ');

    let body = `Dear ${greetingName} and the ${agencyName} Team,\n\n`;
    body += `Warm greetings from WINDOW COMPANIES (PVT) LTD!\n\n`;
    if (customEmailIntro.trim()) {
      body += `${customEmailIntro.trim()}\n\n`;
    } else {
      body += `We are pleased to present our official contracted rate proposal (${categoryBadge} RATES) for your upcoming client bookings and tariff planning:\n\n`;
    }
    body += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n`;

    hotelSelections.forEach((sel, idx) => {
      // Category header with appropriate badge
      const catBadge = sel.category === 'GREEN'
        ? 'SPECIAL GREEN RATES'
        : sel.category === 'RED'
        ? 'SPECIAL RED RATES'
        : sel.category === 'YELLOW'
        ? 'SPECIAL YELLOW RATES'
        : 'SPECIAL CUSTOM RATES';

      // Tax label
      const taxLabel = sel.taxDetails?.toLowerCase().includes('vat')
        ? sel.taxDetails
        : 'Special HB Rates | Non-VAT';

      // Season icon
      const seasonLower = sel.seasonLabel.toLowerCase();
      const seasonIcon = seasonLower.includes('winter')
        ? '❄️'
        : seasonLower.includes('summer')
        ? '☀️'
        : seasonLower.includes('peak') || seasonLower.includes('festive')
        ? '🎄'
        : '📅';

      body += `🏨 ${idx + 1}. ${sel.hotelName.toUpperCase()}\n`;
      body += `${catBadge} | ${taxLabel}\n\n`;
      body += `${seasonIcon} ${sel.seasonLabel.toUpperCase()}\n`;

      if (sel.baseDoubleHb > 0) {
        body += `💰 HB Double: ${sel.currency} ${sel.baseDoubleHb}\n`;
      }

      // Deductions & Standard Supplements
      const sup = sel.supplements;
      if (sup.singleReduction) body += `   • Single Deduction: ${sel.currency} ${sup.singleReduction}\n`;
      if (sup.bbReduction) body += `   • BB Deduction: ${sel.currency} ${sup.bbReduction}\n`;
      if (sup.tripleSupplement) body += `   • Triple Supplement: ${sel.currency} ${sup.tripleSupplement}\n`;
      if (sup.childRate) body += `   • Child Rate: ${sel.currency} ${sup.childRate}\n`;
      if (sup.extraBedSupplement) body += `   • Extra Bed Supplement: ${sel.currency} ${sup.extraBedSupplement}\n`;

      // Full Room Matrix (if configured)
      if (sel.matrix.length > 0) {
        body += `\n📊 Room & Meal Plan Breakdown (${sel.currency}):\n`;
        body += `────────────────────────────────────────────────────────────\n`;
        body += `Room Type               | BB        | HB        | FB\n`;
        body += `────────────────────────────────────────────────────────────\n`;
        sel.matrix.forEach((row) => {
          const roomPad = row.roomType.padEnd(23, ' ');
          const bbPad = (row.bb !== '' ? `${sel.currency} ${row.bb}` : 'N/A').padEnd(9, ' ');
          const hbPad = (row.hb !== '' ? `${sel.currency} ${row.hb}` : 'N/A').padEnd(9, ' ');
          const fbPad = row.fb !== '' ? `${sel.currency} ${row.fb}` : 'N/A';
          body += `${roomPad} | ${bbPad} | ${hbPad} | ${fbPad}\n`;
        });
        body += `────────────────────────────────────────────────────────────\n`;
      }

      // Peak, Festive, or Special Supplements & Conditions
      if (sel.conditions) {
        body += `\n✨ Special Supplements & Terms:\n   ${sel.conditions.replace(/\n/g, '\n   ')}\n`;
      }

      // Direct Hotel Reservation Contacts
      const cleanHotelSlug = sel.hotelName.toLowerCase().replace(/[^a-z0-9]/g, '');
      const reservationEmail = `reservations@${cleanHotelSlug}.com`;
      const bookingWindowEmail = `${cleanHotelSlug}@bookingwindow.lk`;
      body += `\n📩 Reservations:\n   ${bookingWindowEmail} | ${reservationEmail}\n\n`;

      body += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n`;
    });

    body += `📋 GENERAL TERMS & CONDITIONS:\n`;
    body += `• All rates are quoted in USD / specified currency on Half Board (HB) Double basis unless noted.\n`;
    body += `• Check-in: 14:00 hrs | Check-out: 12:00 noon.\n`;
    body += `• All reservations are subject to room availability at the time of final confirmation.\n\n`;
    body += `Please feel free to contact us should you require any adjustments or specialized group quotations.\n\n`;
    body += `Warm regards,\n\n`;
    body += `${profile?.full_name || 'Reservations & Sales Team'}\n`;
    body += `WINDOW COMPANIES (PVT) LTD\n`;
    body += `Central Hotline: +94 (0) 11 234 5678\n`;
    body += `Central Reservations: reservations@bookingwindow.lk\n`;
    body += `Direct Email: ${user?.email || 'sales@windowcompanies.lk'}\n`;

    return body;
  }, [recipientAnalysis, selectedAgency, customEmailIntro, hotelSelections, profile, user]);

  // Construct Email Body HTML (for rich UI preview)
  const emailBodyHtml = useMemo(() => {
    return emailBodyText.replace(/\n/g, '<br/>');
  }, [emailBodyText]);

  // ====================================================
  // QUOTE SAVING & EMAIL DISPATCH
  // ====================================================

  const handleSaveQuoteRecord = async (): Promise<string | null> => {
    if (!user || !selectedAgencyId) {
      setStatusMessage({ type: 'error', text: 'You must be logged in and select an Agency.' });
      return null;
    }
    if (recipientAnalysis.validEmails.length === 0) {
      setStatusMessage({ type: 'error', text: 'Please select at least one member with a valid email.' });
      return null;
    }
    if (hotelSelections.length === 0) {
      setStatusMessage({ type: 'error', text: 'Please configure at least one Hotel.' });
      return null;
    }

    setIsSaving(true);
    setStatusMessage(null);

    try {
      // 1. Generate Quote Reference (e.g. RS-202611-001)
      const quoteRef = `RS-${Date.now().toString().slice(-6)}`;

      // 2. Insert Parent Quote
      const { data: quoteData, error: quoteErr } = await supabase
        .from('quotes')
        .insert({
          quote_reference: quoteRef,
          sender_id: user.id,
          agency_id: selectedAgencyId,
          market_id: selectedMarketId !== 'ALL' ? selectedMarketId : null,
          recipient_scope: recipientAnalysis.count > 1 ? 'ENTIRE_AGENCY' : 'INDIVIDUAL',
          quote_lifecycle: 'DRAFT',
          email_status: 'NOT_SENT',
          email_subject: emailSubject,
          email_body_html: emailBodyHtml,
          email_body_text: emailBodyText,
        })
        .select('id, quote_reference')
        .single();

      if (quoteErr || !quoteData) {
        throw new Error(quoteErr?.message || 'Failed to save quote');
      }

      const quoteId = quoteData.id;

      // 3. Insert Quote Recipients Snapshot
      const recipientInserts = recipientAnalysis.selected.map((m) => ({
        quote_id: quoteId,
        original_member_id: m.id,
        original_full_name: m.full_name,
        original_email: m.email,
        original_agency_name: selectedAgency?.name || 'Agency',
        original_market_name: markets.find((mk) => mk.id === m.market_id)?.market_name || 'Islandwide',
        delivery_status: 'PENDING',
      }));

      if (recipientInserts.length > 0) {
        const { error: recErr } = await supabase.from('quote_recipients').insert(recipientInserts);
        if (recErr) console.warn('Recipient insert notice:', recErr);
      }

      // 4. Insert Quote Items Snapshot (One item per Hotel + Rate Tier)
      const itemInserts = hotelSelections.map((sel) => ({
        quote_id: quoteId,
        hotel_id: sel.hotelId,
        season_id: sel.seasonId,
        hotel_name_snapshot: sel.hotelName,
        season_label_snapshot: sel.seasonLabel,
        room_type_snapshot: 'Double Room',
        meal_plan_snapshot: 'HB',
        rate_category: sel.category,
        quoted_amount: sel.baseDoubleHb || (sel.matrix[0]?.hb as number) || 0,
        currency: sel.currency,
        custom_notes: internalNotes || sel.customRateNotes || null,
      }));

      if (itemInserts.length > 0) {
        const { error: itemErr } = await supabase.from('quote_items').insert(itemInserts);
        if (itemErr) console.warn('Quote item insert notice:', itemErr);
      }

      setSavedQuoteId(quoteId);
      setSavedQuoteRef(quoteRef);

      // Broadcast notification to Admin and Sales Team members!
      const hotelNames = hotelSelections.map((h) => h.hotelName);
      notificationService.notifyTeamOnQuoteShared({
        senderId: user.id,
        senderName: profile?.full_name || 'Staff Member',
        agencyName: selectedAgency?.name || 'Travel Agency',
        hotelNames: hotelNames,
        quoteReference: quoteRef,
      });

      return quoteId;
    } catch (err: any) {
      setStatusMessage({ type: 'error', text: err.message || 'Failed to save quote snapshot.' });
      return null;
    } finally {
      setIsSaving(false);
    }
  };

  // Launch Default Email App (Mailto)
  const handleOpenEmailApp = async () => {
    const toEmails = recipientAnalysis.validEmails.join(',');
    const encodedSubject = encodeURIComponent(emailSubject);
    const encodedBody = encodeURIComponent(emailBodyText);
    const mailtoUrl = `mailto:${toEmails}?subject=${encodedSubject}&body=${encodedBody}`;

    setIsOpeningEmailApp(true);

    // Save Quote snapshot in background
    let qId = savedQuoteId;
    if (!qId) {
      qId = await handleSaveQuoteRecord();
    }

    // Launch email application
    window.location.href = mailtoUrl;

    if (qId) {
      // Mark as OPENED_IN_EMAIL_APP
      await supabase
        .from('quotes')
        .update({
          email_status: 'OPENED_IN_EMAIL_APP',
          opened_in_app_at: new Date().toISOString(),
        })
        .eq('id', qId);
    }

    setIsOpeningEmailApp(false);
    setStep(4); // Move to Confirmation Step
  };

  // Launch Gmail Web Composer
  const handleOpenGmail = async () => {
    const toEmails = encodeURIComponent(recipientAnalysis.validEmails.join(','));
    const encodedSubject = encodeURIComponent(emailSubject);
    const encodedBody = encodeURIComponent(emailBodyText);
    const gmailUrl = `https://mail.google.com/mail/?view=cm&fs=1&to=${toEmails}&su=${encodedSubject}&body=${encodedBody}`;

    setIsOpeningEmailApp(true);

    // Save Quote snapshot
    let qId = savedQuoteId;
    if (!qId) {
      qId = await handleSaveQuoteRecord();
    }

    // Open Gmail composer in new tab
    window.open(gmailUrl, '_blank', 'noopener,noreferrer');

    if (qId) {
      await supabase
        .from('quotes')
        .update({
          email_status: 'OPENED_IN_EMAIL_APP',
          opened_in_app_at: new Date().toISOString(),
        })
        .eq('id', qId);
    }

    setIsOpeningEmailApp(false);
    setStep(4); // Move to Confirmation Step
  };

  // Confirm Send Status
  const handleConfirmSent = async (confirmed: boolean) => {
    if (!savedQuoteId || !user) return;
    setIsSaving(true);
    try {
      await supabase
        .from('quotes')
        .update({
          email_status: confirmed ? 'USER_CONFIRMED_SENT' : 'OPENED_IN_EMAIL_APP',
          quote_lifecycle: confirmed ? 'DISPATCHED' : 'DRAFT',
          confirmed_by: user.id,
          confirmed_at: new Date().toISOString(),
          confirmation_notes: confirmed
            ? 'User verified email sent from device client.'
            : 'User marked as draft/pending send in email client.',
        })
        .eq('id', savedQuoteId);

      setStatusMessage({
        type: 'success',
        text: confirmed
          ? `Quote #${savedQuoteRef} marked as USER_CONFIRMED_SENT and archived!`
          : `Quote #${savedQuoteRef} kept in draft status.`,
      });
    } catch (err: any) {
      console.error('Error confirming quote status:', err);
    } finally {
      setIsSaving(false);
    }
  };

  // Copy to Clipboard Helper
  const handleCopy = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopiedType(label);
    setTimeout(() => setCopiedType(null), 2500);
  };

  // ====================================================
  // RENDER
  // ====================================================

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#EAF2FF] flex items-center justify-center text-[#1455D9]">
              <Send className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-bold tracking-tight text-[#101828]">
                  Rate Sharing &amp; Dispatch
                </h1>
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-50 text-[#1455D9] border border-blue-200">
                  <Sparkles className="w-3 h-3" /> Multi-Hotel &amp; Multi-Category
                </span>
              </div>
              <p className="text-xs text-[#667085] mt-0.5">
                One Agency → Multiple Members → Multiple Hotels → Different Rate Tiers → One Email Handoff
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/sales-activities')}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold text-[#101828] bg-white border border-[#D9E0EA] hover:bg-slate-50 shadow-xs transition-all"
          >
            <Clock className="w-3.5 h-3.5 text-[#667085]" />
            <span>View Rate Sharing History</span>
          </button>
        </div>
      </div>

      {/* Progress Step Indicator */}
      <div className="bg-white p-4 rounded-2xl border border-[#D9E0EA] shadow-xs">
        <div className="flex items-center justify-between max-w-3xl mx-auto">
          {/* Step 1 */}
          <button
            type="button"
            onClick={() => setStep(1)}
            className={`flex items-center gap-2.5 transition-all ${
              step === 1 ? 'text-[#1455D9] font-bold' : step > 1 ? 'text-emerald-600 font-semibold' : 'text-[#667085]'
            }`}
          >
            <span
              className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${
                step === 1
                  ? 'bg-[#1455D9] text-white ring-4 ring-blue-100'
                  : step > 1
                  ? 'bg-emerald-600 text-white'
                  : 'bg-slate-100 text-[#667085]'
              }`}
            >
              {step > 1 ? <Check className="w-3.5 h-3.5" /> : '1'}
            </span>
            <span className="text-xs hidden sm:inline">1. Recipients</span>
          </button>

          <div className={`h-0.5 flex-1 mx-3 ${step > 1 ? 'bg-emerald-500' : 'bg-slate-200'}`} />

          {/* Step 2 */}
          <button
            type="button"
            onClick={() => setStep(2)}
            className={`flex items-center gap-2.5 transition-all ${
              step === 2 ? 'text-[#1455D9] font-bold' : step > 2 ? 'text-emerald-600 font-semibold' : 'text-[#667085]'
            }`}
          >
            <span
              className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${
                step === 2
                  ? 'bg-[#1455D9] text-white ring-4 ring-blue-100'
                  : step > 2
                  ? 'bg-emerald-600 text-white'
                  : 'bg-slate-100 text-[#667085]'
              }`}
            >
              {step > 2 ? <Check className="w-3.5 h-3.5" /> : '2'}
            </span>
            <span className="text-xs hidden sm:inline">2. Hotels &amp; Rates</span>
          </button>

          <div className={`h-0.5 flex-1 mx-3 ${step > 2 ? 'bg-emerald-500' : 'bg-slate-200'}`} />

          {/* Step 3 */}
          <button
            type="button"
            onClick={() => setStep(3)}
            className={`flex items-center gap-2.5 transition-all ${
              step === 3 ? 'text-[#1455D9] font-bold' : step > 3 ? 'text-emerald-600 font-semibold' : 'text-[#667085]'
            }`}
          >
            <span
              className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${
                step === 3
                  ? 'bg-[#1455D9] text-white ring-4 ring-blue-100'
                  : step > 3
                  ? 'bg-emerald-600 text-white'
                  : 'bg-slate-100 text-[#667085]'
              }`}
            >
              {step > 3 ? <Check className="w-3.5 h-3.5" /> : '3'}
            </span>
            <span className="text-xs hidden sm:inline">3. Email &amp; Send</span>
          </button>

          <div className={`h-0.5 flex-1 mx-3 ${step > 3 ? 'bg-emerald-500' : 'bg-slate-200'}`} />

          {/* Step 4 */}
          <button
            type="button"
            onClick={() => setStep(4)}
            className={`flex items-center gap-2.5 transition-all ${
              step === 4 ? 'text-[#1455D9] font-bold' : 'text-[#667085]'
            }`}
          >
            <span
              className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${
                step === 4 ? 'bg-[#1455D9] text-white ring-4 ring-blue-100' : 'bg-slate-100 text-[#667085]'
              }`}
            >
              4
            </span>
            <span className="text-xs hidden sm:inline">4. Confirmation</span>
          </button>
        </div>
      </div>

      {/* Status Messages */}
      {statusMessage && (
        <div
          className={`p-4 rounded-xl flex items-center justify-between text-xs font-semibold ${
            statusMessage.type === 'success'
              ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
              : statusMessage.type === 'error'
              ? 'bg-red-50 text-red-800 border border-red-200'
              : 'bg-amber-50 text-amber-800 border border-amber-200'
          }`}
        >
          <div className="flex items-center gap-2">
            {statusMessage.type === 'success' && <CheckCircle2 className="w-4 h-4 text-emerald-600" />}
            {statusMessage.type === 'error' && <AlertCircle className="w-4 h-4 text-red-600" />}
            {statusMessage.type === 'warning' && <AlertTriangle className="w-4 h-4 text-amber-600" />}
            <span>{statusMessage.text}</span>
          </div>
          <button
            type="button"
            onClick={() => setStatusMessage(null)}
            className="text-[11px] underline font-bold"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* ==================================================== */}
      {/* STEP 1: RECIPIENTS SELECTION (Agency -> Market -> Members) */}
      {/* ==================================================== */}
      {step === 1 && (
        <div className="bg-white p-6 rounded-2xl border border-[#D9E0EA] shadow-xs space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-[#F0F2F5]">
            <div>
              <h2 className="text-base font-bold text-[#101828]">Step 1: Select Target Recipients</h2>
              <p className="text-xs text-[#667085] mt-0.5">
                Choose the Travel Agency, filter by specific Market, and select the individual member contacts.
              </p>
            </div>
            <div className="flex items-center gap-2 text-xs font-bold text-[#1455D9] bg-blue-50 px-3 py-1.5 rounded-xl border border-blue-200">
              <Mail className="w-4 h-4" />
              <span>{recipientAnalysis.validCount} Valid Recipient(s) Selected</span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* 1. Agency Selector */}
            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-wider text-[#101828]">
                Select Travel Agency:
              </label>
              <select
                value={selectedAgencyId}
                onChange={(e) => setSelectedAgencyId(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-[#D9E0EA] rounded-xl text-xs font-bold text-[#101828] focus:outline-none focus:ring-2 focus:ring-[#1455D9]/20 focus:border-[#1455D9]"
              >
                {agencies.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name} ({a.city || a.country || 'Global'})
                  </option>
                ))}
              </select>
            </div>

            {/* 2. Market Selector */}
            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-wider text-[#101828]">
                Filter by Market / Region:
              </label>
              <select
                value={selectedMarketId}
                onChange={(e) => setSelectedMarketId(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-[#D9E0EA] rounded-xl text-xs font-bold text-[#101828] focus:outline-none focus:ring-2 focus:ring-[#1455D9]/20 focus:border-[#1455D9]"
              >
                <option value="ALL">All Markets ({markets.length} Available)</option>
                {markets.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.market_name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* 3. Member Contacts Selection Table */}
          <div className="space-y-3 pt-2">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <h3 className="text-xs font-bold uppercase tracking-wider text-[#101828]">
                  Agency Contacts ({filteredMembers.length})
                </h3>
                <span className="text-[11px] text-[#667085]">
                  • {selectedMemberIds.length} of {members.length} selected
                </span>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  placeholder="Search contacts by name or email..."
                  value={searchMemberQuery}
                  onChange={(e) => setSearchMemberQuery(e.target.value)}
                  className="px-3 py-1.5 bg-slate-50 border border-[#D9E0EA] rounded-lg text-xs text-[#101828] focus:outline-none w-56"
                />
                <button
                  type="button"
                  onClick={() => {
                    if (selectedMemberIds.length === members.length) {
                      setSelectedMemberIds([]);
                    } else {
                      setSelectedMemberIds(members.map((m) => m.id));
                    }
                  }}
                  className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 rounded-lg text-xs font-semibold text-[#101828]"
                >
                  {selectedMemberIds.length === members.length ? 'Deselect All' : 'Select All'}
                </button>
              </div>
            </div>

            {/* Contacts List Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 max-h-72 overflow-y-auto p-1">
              {filteredMembers.length === 0 ? (
                <div className="col-span-full py-8 text-center text-xs text-[#667085] bg-slate-50 rounded-xl">
                  No contacts found matching the filters.
                </div>
              ) : (
                filteredMembers.map((m) => {
                  const isSelected = selectedMemberIds.includes(m.id);
                  const hasEmail = Boolean(m.email && /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/.test(m.email.trim()));
                  const marketObj = markets.find((mk) => mk.id === m.market_id);

                  return (
                    <div
                      key={m.id}
                      onClick={() => {
                        if (isSelected) {
                          setSelectedMemberIds((prev) => prev.filter((id) => id !== m.id));
                        } else {
                          setSelectedMemberIds((prev) => [...prev, m.id]);
                        }
                      }}
                      className={`p-3 rounded-xl border text-left cursor-pointer transition-all flex items-start gap-3 ${
                        isSelected
                          ? 'bg-blue-50/70 border-[#1455D9] shadow-xs'
                          : 'bg-white border-[#E4E7EC] hover:bg-slate-50'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => {}} // handled by parent div
                        className="mt-0.5 rounded text-[#1455D9] focus:ring-[#1455D9]"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <h4 className="text-xs font-bold text-[#101828] truncate">{m.full_name}</h4>
                          {marketObj && (
                            <span className="text-[10px] font-semibold px-1.5 py-0.2 rounded bg-slate-100 text-slate-700">
                              {marketObj.market_name}
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-[#667085] truncate">{m.position || 'Contact'}</p>
                        <p
                          className={`text-[11px] truncate mt-1 ${
                            hasEmail ? 'text-[#1455D9] font-medium' : 'text-red-500 font-semibold'
                          }`}
                        >
                          {hasEmail ? m.email : '⚠️ Missing Email Address'}
                        </p>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Recipient Warnings */}
            {recipientAnalysis.invalidMembers.length > 0 && (
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-800 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0" />
                <span>
                  <strong>Warning:</strong> {recipientAnalysis.invalidMembers.length} selected member(s) have invalid or missing email addresses and will be excluded from dispatch.
                </span>
              </div>
            )}

            {recipientAnalysis.duplicateEmails.length > 0 && (
              <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl text-xs text-blue-800 flex items-center gap-2">
                <Info className="w-4 h-4 text-[#1455D9] flex-shrink-0" />
                <span>
                  Duplicate email detected for: <strong>{recipientAnalysis.duplicateEmails.join(', ')}</strong>. The email will be sent only once.
                </span>
              </div>
            )}
          </div>

          {/* Navigation to Step 2 */}
          <div className="pt-4 border-t border-[#F0F2F5] flex justify-end">
            <button
              type="button"
              disabled={recipientAnalysis.validCount === 0}
              onClick={() => setStep(2)}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-semibold text-white bg-[#1455D9] hover:bg-[#1044B2] shadow-sm disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
              <span>Next: Select Hotels &amp; Rates</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* ==================================================== */}
      {/* STEP 2: HOTELS & RATE CATEGORIES SELECTION */}
      {/* ==================================================== */}
      {step === 2 && (
        <div className="bg-white p-6 rounded-2xl border border-[#D9E0EA] shadow-xs space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-[#F0F2F5]">
            <div>
              <h2 className="text-base font-bold text-[#101828]">Step 2: Select Hotels &amp; Rate Categories</h2>
              <p className="text-xs text-[#667085] mt-0.5">
                Add one or more hotels. For each hotel, select its season and target rate tier (RED / GREEN / YELLOW / CUSTOM).
              </p>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-700 bg-slate-100 px-3 py-1.5 rounded-xl border border-slate-200">
                {hotelSelections.length} Hotel(s) Configured
              </span>
            </div>
          </div>

          {/* Configured Hotels List */}
          <div className="space-y-4">
            {hotelSelections.map((sel, idx) => {
              const hotelSeasons = allSeasons.filter((s) => s.hotel_id === sel.hotelId);

              return (
                <div
                  key={`${sel.hotelId}-${idx}`}
                  className="p-5 rounded-2xl border border-[#D9E0EA] bg-slate-50/50 space-y-4 relative"
                >
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <span className="w-6 h-6 rounded-full bg-[#1455D9] text-white flex items-center justify-center text-xs font-bold">
                        {idx + 1}
                      </span>
                      {/* Hotel Dropdown */}
                      <div className="w-64">
                        <select
                          value={sel.hotelId}
                          onChange={(e) => updateHotelSelection(idx, { hotelId: e.target.value })}
                          className="w-full px-3 py-2 bg-white border border-[#D9E0EA] rounded-xl text-xs font-bold text-[#101828] focus:outline-none"
                        >
                          {allHotels.map((h) => (
                            <option key={h.id} value={h.id}>
                              {h.hotel_name} {h.hotel_code ? `(${h.hotel_code})` : ''}
                            </option>
                          ))}
                        </select>
                      </div>

                      {/* Season Dropdown */}
                      <div className="w-56">
                        <select
                          value={sel.seasonId}
                          onChange={(e) => updateHotelSelection(idx, { seasonId: e.target.value })}
                          className="w-full px-3 py-2 bg-white border border-[#D9E0EA] rounded-xl text-xs font-bold text-[#101828] focus:outline-none"
                        >
                          {hotelSeasons.length === 0 ? (
                            <option value="">No Seasons</option>
                          ) : (
                            hotelSeasons.map((s) => (
                              <option key={s.id} value={s.id}>
                                {s.season_label}
                              </option>
                            ))
                          )}
                        </select>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      {hotelSelections.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeHotelSelection(idx)}
                          className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-all"
                          title="Remove this hotel"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Rate Category Selector Tabs for this Hotel */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
                    {/* RED */}
                    <button
                      type="button"
                      onClick={() => updateHotelSelection(idx, { category: 'RED' })}
                      className={`p-3 rounded-xl border text-left transition-all ${
                        sel.category === 'RED'
                          ? 'bg-red-50 border-red-500 shadow-xs ring-2 ring-red-500/20'
                          : 'bg-white border-[#E4E7EC] hover:bg-slate-100'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-red-100 text-red-800">
                          RED
                        </span>
                        <span className="w-2 h-2 rounded-full bg-red-500" />
                      </div>
                      <h4 className="text-xs font-bold text-[#101828] mt-1">LOWEST</h4>
                      <p className="text-[11px] text-[#667085]">Lowest promotional tier</p>
                    </button>

                    {/* GREEN */}
                    <button
                      type="button"
                      onClick={() => updateHotelSelection(idx, { category: 'GREEN' })}
                      className={`p-3 rounded-xl border text-left transition-all ${
                        sel.category === 'GREEN'
                          ? 'bg-emerald-50 border-emerald-500 shadow-xs ring-2 ring-emerald-500/20'
                          : 'bg-white border-[#E4E7EC] hover:bg-slate-100'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800">
                          GREEN
                        </span>
                        <span className="w-2 h-2 rounded-full bg-emerald-500" />
                      </div>
                      <h4 className="text-xs font-bold text-[#101828] mt-1">NORMAL</h4>
                      <p className="text-[11px] text-[#667085]">Standard agency rate</p>
                    </button>

                    {/* YELLOW */}
                    <button
                      type="button"
                      onClick={() => updateHotelSelection(idx, { category: 'YELLOW' })}
                      className={`p-3 rounded-xl border text-left transition-all ${
                        sel.category === 'YELLOW'
                          ? 'bg-amber-50 border-amber-500 shadow-xs ring-2 ring-amber-500/20'
                          : 'bg-white border-[#E4E7EC] hover:bg-slate-100'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-amber-100 text-amber-800">
                          YELLOW
                        </span>
                        <span className="w-2 h-2 rounded-full bg-amber-500" />
                      </div>
                      <h4 className="text-xs font-bold text-[#101828] mt-1">HIGHEST</h4>
                      <p className="text-[11px] text-[#667085]">Peak season / high tier</p>
                    </button>

                    {/* CUSTOM */}
                    <button
                      type="button"
                      onClick={() => {
                        updateHotelSelection(idx, { category: 'CUSTOM' });
                        handleOpenCustomRateBuilder(idx);
                      }}
                      className={`p-3 rounded-xl border text-left transition-all ${
                        sel.category === 'CUSTOM'
                          ? 'bg-purple-50 border-purple-500 shadow-xs ring-2 ring-purple-500/20'
                          : 'bg-white border-[#E4E7EC] hover:bg-slate-100'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-purple-100 text-purple-800">
                          CUSTOM
                        </span>
                        <span className="w-2 h-2 rounded-full bg-purple-500" />
                      </div>
                      <div className="flex items-center justify-between mt-1">
                        <h4 className="text-xs font-bold text-[#101828]">NEGOTIATED</h4>
                        <span className="text-[10px] font-semibold text-purple-700 bg-purple-100 px-1 rounded">Edit Sheet ⚙️</span>
                      </div>
                      <p className="text-[11px] text-[#667085]">Click to build custom rate sheet</p>
                    </button>
                  </div>

                  {/* Loaded Rate Matrix Preview for this Hotel */}
                  <div className="bg-white p-3 rounded-xl border border-[#E4E7EC]">
                    {sel.category === 'CUSTOM' ? (
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="text-[11px] font-bold text-purple-700 flex items-center gap-1.5">
                            <Sliders className="w-3.5 h-3.5" />
                            Custom Negotiated Rate Sheet
                          </span>
                          <button
                            type="button"
                            onClick={() => handleOpenCustomRateBuilder(idx)}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold text-purple-700 bg-purple-100 hover:bg-purple-200 transition-all"
                          >
                            <Sliders className="w-3 h-3" />
                            <span>Edit Custom Rates</span>
                          </button>
                        </div>

                        {sel.matrix.length > 0 ? (
                          <div className="overflow-x-auto">
                            <table className="w-full text-left text-xs border border-purple-100 rounded-lg">
                              <thead>
                                <tr className="bg-purple-50/60 text-[10px] font-bold uppercase tracking-wider text-purple-900">
                                  <th className="p-2">Room Type</th>
                                  <th className="p-2">BB</th>
                                  <th className="p-2">HB</th>
                                  <th className="p-2">FB</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-purple-50 font-medium">
                                {sel.matrix.map((r, mIdx) => (
                                  <tr key={mIdx}>
                                    <td className="p-2 font-bold text-[#101828]">{r.roomType}</td>
                                    <td className="p-2">{r.bb !== '' ? `${sel.currency} ${r.bb}` : '—'}</td>
                                    <td className="p-2 font-bold text-purple-700">{r.hb !== '' ? `${sel.currency} ${r.hb}` : '—'}</td>
                                    <td className="p-2">{r.fb !== '' ? `${sel.currency} ${r.fb}` : '—'}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        ) : (
                          <div className="py-2 text-center text-xs text-purple-600">
                            Click "Edit Custom Rates" above to set negotiated room prices.
                          </div>
                        )}
                      </div>
                    ) : sel.hasLoadedRate ? (
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-[11px] font-bold text-emerald-700 flex items-center gap-1.5">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            Saved {sel.category} Rate Sheet Loaded (v{sel.versionNumber || 1})
                          </span>
                          <span className="text-[11px] font-bold text-[#101828]">
                            Currency: {sel.currency}
                          </span>
                        </div>

                        {/* Room Rate Grid Table */}
                        <div className="overflow-x-auto">
                          <table className="w-full text-left text-xs border border-slate-100 rounded-lg">
                            <thead>
                              <tr className="bg-slate-50 text-[10px] font-bold uppercase tracking-wider text-[#667085]">
                                <th className="p-2">Room Type</th>
                                <th className="p-2">BB</th>
                                <th className="p-2">HB</th>
                                <th className="p-2">FB</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 font-medium">
                              {sel.matrix.map((r, mIdx) => (
                                <tr key={mIdx}>
                                  <td className="p-2 font-bold text-[#101828]">{r.roomType}</td>
                                  <td className="p-2">{r.bb !== '' ? `${sel.currency} ${r.bb}` : '—'}</td>
                                  <td className="p-2 font-bold text-[#1455D9]">{r.hb !== '' ? `${sel.currency} ${r.hb}` : '—'}</td>
                                  <td className="p-2">{r.fb !== '' ? `${sel.currency} ${r.fb}` : '—'}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    ) : (
                      <div className="py-3 px-2 text-center text-xs text-amber-700 bg-amber-50/60 rounded-lg flex items-center justify-center gap-2">
                        <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0" />
                        <span>
                          No saved {sel.category} rate sheet found in Rate Management for this hotel + season. You can still customize rates in the next step.
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}

            {/* Add Another Hotel Button */}
            <button
              type="button"
              onClick={() => {
                const nextHotel = allHotels.find((h) => !hotelSelections.some((s) => s.hotelId === h.id)) || allHotels[0];
                if (nextHotel) {
                  addHotelSelection(nextHotel.id);
                }
              }}
              className="w-full py-3 border-2 border-dashed border-[#D9E0EA] hover:border-[#1455D9] text-[#1455D9] rounded-2xl text-xs font-bold flex items-center justify-center gap-2 transition-all hover:bg-blue-50/50"
            >
              <Plus className="w-4 h-4" />
              <span>Add Another Hotel to this Share</span>
            </button>
          </div>

          {/* Navigation to Step 3 */}
          <div className="pt-4 border-t border-[#F0F2F5] flex justify-between">
            <button
              type="button"
              onClick={() => setStep(1)}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold text-[#101828] bg-slate-100 hover:bg-slate-200 transition-all"
            >
              <ChevronLeft className="w-4 h-4" />
              <span>Back to Recipients</span>
            </button>
            <button
              type="button"
              disabled={hotelSelections.length === 0}
              onClick={() => setStep(3)}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-semibold text-white bg-[#1455D9] hover:bg-[#1044B2] shadow-sm disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
              <span>Next: Email Preview &amp; Dispatch</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* ==================================================== */}
      {/* STEP 3: EMAIL PREVIEW, HANDOFF & SENDING */}
      {/* ==================================================== */}
      {step === 3 && (
        <div className="bg-white p-6 rounded-2xl border border-[#D9E0EA] shadow-xs space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-[#F0F2F5]">
            <div>
              <h2 className="text-base font-bold text-[#101828]">Step 3: Email Preview &amp; Handoff</h2>
              <p className="text-xs text-[#667085] mt-0.5">
                Review the automatically composed quotation email. You can edit the message, copy details, or open directly in your preferred email app.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => handleCopy(emailBodyText, 'BODY')}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200"
              >
                {copiedType === 'BODY' ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedType === 'BODY' ? 'Copied Body' : 'Copy Content'}</span>
              </button>
            </div>
          </div>

          {/* Email Envelope Header */}
          <div className="bg-slate-50 p-4 rounded-xl border border-[#D9E0EA] space-y-3">
            {/* To Field */}
            <div className="flex items-center gap-3 text-xs">
              <span className="font-bold text-[#667085] uppercase tracking-wider w-16">To:</span>
              <div className="flex-1 flex flex-wrap gap-1.5">
                {recipientAnalysis.validEmails.map((email, eIdx) => (
                  <span
                    key={eIdx}
                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-blue-100/70 text-blue-900 font-medium text-[11px]"
                  >
                    <Mail className="w-3 h-3 text-[#1455D9]" />
                    {email}
                  </span>
                ))}
              </div>
            </div>

            {/* Subject Field */}
            <div className="flex items-center gap-3 text-xs pt-2 border-t border-slate-200">
              <span className="font-bold text-[#667085] uppercase tracking-wider w-16">Subject:</span>
              <input
                type="text"
                value={emailSubject}
                onChange={(e) => setEmailSubject(e.target.value)}
                className="flex-1 px-3 py-1.5 bg-white border border-[#D9E0EA] rounded-lg text-xs font-semibold text-[#101828] focus:outline-none"
              />
            </div>

            {/* Custom Intro Note (Optional) */}
            <div className="flex items-start gap-3 text-xs pt-2 border-t border-slate-200">
              <span className="font-bold text-[#667085] uppercase tracking-wider w-16 mt-1">Note:</span>
              <textarea
                placeholder="Optional greeting or custom remark for this email proposal..."
                value={customEmailIntro}
                onChange={(e) => setCustomEmailIntro(e.target.value)}
                rows={2}
                className="flex-1 px-3 py-1.5 bg-white border border-[#D9E0EA] rounded-lg text-xs text-[#101828] focus:outline-none"
              />
            </div>
          </div>

          {/* Full Email Preview Box */}
          <div className="border border-[#D9E0EA] rounded-xl overflow-hidden">
            <div className="bg-slate-100 px-4 py-2 border-b border-[#D9E0EA] flex items-center justify-between text-xs font-bold text-[#667085]">
              <span className="uppercase tracking-wider">Email Body Preview</span>
              <span>{hotelSelections.length} Hotel Quote(s) Included</span>
            </div>
            <pre className="p-4 bg-white text-xs font-mono text-slate-800 whitespace-pre-wrap leading-relaxed max-h-96 overflow-y-auto">
              {emailBodyText}
            </pre>
          </div>

          {/* Internal Notes (Will NOT be sent in email) */}
          <div className="bg-amber-50/50 p-4 rounded-xl border border-amber-200 space-y-2">
            <label className="text-xs font-bold text-amber-900 flex items-center gap-1.5 uppercase tracking-wider">
              <Info className="w-4 h-4 text-amber-600" />
              Internal CRM Notes (Saved for audit only — NOT included in email):
            </label>
            <input
              type="text"
              placeholder="e.g. Special deal agreed via phone with Managing Director; target 20 room nights."
              value={internalNotes}
              onChange={(e) => setInternalNotes(e.target.value)}
              className="w-full px-3 py-2 bg-white border border-amber-300 rounded-lg text-xs text-[#101828] focus:outline-none"
            />
          </div>

          {/* Send / Handoff Actions */}
          <div className="pt-4 border-t border-[#F0F2F5] flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            <button
              type="button"
              onClick={() => setStep(2)}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold text-[#101828] bg-slate-100 hover:bg-slate-200 transition-all"
            >
              <ChevronLeft className="w-4 h-4" />
              <span>Back to Hotels</span>
            </button>

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
              {/* Option A: Open in Default Email Client */}
              <button
                type="button"
                onClick={handleOpenEmailApp}
                disabled={isOpeningEmailApp || isSaving}
                className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold text-[#101828] bg-white border border-[#D9E0EA] hover:bg-slate-50 shadow-xs transition-all"
              >
                <Mail className="w-4 h-4 text-[#1455D9]" />
                <span>Open in Default Mail App</span>
              </button>

              {/* Option B: Continue in Gmail */}
              <button
                type="button"
                onClick={handleOpenGmail}
                disabled={isOpeningEmailApp || isSaving}
                className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold text-white bg-[#1455D9] hover:bg-[#1044B2] shadow-sm transition-all"
              >
                {isOpeningEmailApp ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <ExternalLink className="w-4 h-4" />
                )}
                <span>Launch in Gmail &amp; Save Snapshot</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ==================================================== */}
      {/* STEP 4: SEND CONFIRMATION & AUDIT HISTORY */}
      {/* ==================================================== */}
      {step === 4 && (
        <div className="bg-white p-8 rounded-2xl border border-[#D9E0EA] shadow-xs text-center space-y-6 max-w-2xl mx-auto">
          <div className="w-16 h-16 rounded-full bg-blue-50 text-[#1455D9] mx-auto flex items-center justify-center border-2 border-blue-100">
            <Send className="w-8 h-8" />
          </div>

          <div className="space-y-2">
            <h2 className="text-xl font-bold text-[#101828]">
              Did you send the quotation email?
            </h2>
            <p className="text-xs text-[#667085] leading-relaxed">
              Your email client has been launched with the rate quotation for{' '}
              <strong>{selectedAgency?.name}</strong>. Please confirm if the email was dispatched from your device so we can update the CRM audit record.
            </p>
          </div>

          {savedQuoteRef && (
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-50 border border-slate-200 text-xs font-mono font-bold text-slate-700">
              Quote Reference: #{savedQuoteRef}
            </div>
          )}

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
            <button
              type="button"
              disabled={isSaving}
              onClick={() => handleConfirmSent(true)}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 shadow-sm transition-all"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>Yes, I Sent It</span>
            </button>

            <button
              type="button"
              disabled={isSaving}
              onClick={() => handleConfirmSent(false)}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl text-xs font-semibold text-[#101828] bg-slate-100 hover:bg-slate-200 transition-all"
            >
              <span>Not Sent Yet (Save as Draft)</span>
            </button>
          </div>

          <div className="pt-6 border-t border-[#F0F2F5] flex items-center justify-center gap-4">
            <button
              type="button"
              onClick={() => {
                setStep(1);
                setSavedQuoteId(null);
                setSavedQuoteRef(null);
              }}
              className="text-xs font-semibold text-[#1455D9] hover:underline"
            >
              Share Rates with Another Agency
            </button>
            <span className="text-[#D9E0EA]">•</span>
            <button
              type="button"
              onClick={() => navigate('/sales-activities')}
              className="text-xs font-semibold text-[#667085] hover:underline"
            >
              View Rate Sharing History
            </button>
          </div>
        </div>
      )}

      {/* ==================================================== */}
      {/* CUSTOM RATE SHEET BUILDER MODAL */}
      {/* ==================================================== */}
      {editingCustomIndex !== null && hotelSelections[editingCustomIndex] && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-[#D9E0EA] shadow-2xl w-full max-w-4xl max-h-[92vh] overflow-y-auto space-y-5 p-6">
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-3 border-b border-[#F0F2F5]">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-purple-100 text-purple-800">
                    CUSTOM NEGOTIATED DEAL
                  </span>
                  <span className="text-xs text-[#667085]">
                    {hotelSelections[editingCustomIndex].hotelName} • {hotelSelections[editingCustomIndex].seasonLabel}
                  </span>
                </div>
                <h3 className="text-lg font-bold text-[#101828] mt-1">
                  Build Custom Rate Sheet for this Hotel
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setEditingCustomIndex(null)}
                className="p-1.5 text-[#667085] hover:bg-slate-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Currency Selector */}
            <div className="flex items-center justify-between bg-purple-50/60 p-3.5 rounded-xl border border-purple-100">
              <div>
                <h4 className="text-xs font-bold text-purple-950">Quotation Currency</h4>
                <p className="text-[11px] text-purple-700">Select which currency these custom rates are calculated in.</p>
              </div>
              <select
                value={customModalCurrency}
                onChange={(e) => setCustomModalCurrency(e.target.value)}
                className="px-3.5 py-1.5 bg-white border border-purple-200 rounded-lg text-xs font-bold text-[#101828] focus:outline-none"
              >
                <option value="USD">USD ($)</option>
                <option value="EUR">EUR (€)</option>
                <option value="GBP">GBP (£)</option>
                <option value="LKR">LKR (Rs)</option>
              </select>
            </div>

            {/* Room Matrix Input Table */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold uppercase tracking-wider text-[#101828]">
                  Room Occupancy &amp; Meal Plan Rates ({customModalCurrency})
                </h4>
                <button
                  type="button"
                  onClick={() => {
                    setCustomModalMatrix((prev) => [
                      ...prev,
                      { roomType: `Extra Room ${prev.length + 1}`, bb: '', hb: '', fb: '' }
                    ]);
                  }}
                  className="inline-flex items-center gap-1 text-[11px] font-bold text-[#1455D9] hover:underline"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Room Type</span>
                </button>
              </div>

              <div className="overflow-x-auto border border-[#D9E0EA] rounded-xl">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 border-b border-[#D9E0EA] text-[10px] font-bold uppercase tracking-wider text-[#667085]">
                    <tr>
                      <th className="p-3">Room Type</th>
                      <th className="p-3">BB Rate ({customModalCurrency})</th>
                      <th className="p-3">HB Rate ({customModalCurrency})</th>
                      <th className="p-3">FB Rate ({customModalCurrency})</th>
                      <th className="p-3 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {customModalMatrix.map((row, rIdx) => (
                      <tr key={rIdx} className="hover:bg-slate-50/50">
                        <td className="p-2.5">
                          <input
                            type="text"
                            value={row.roomType}
                            onChange={(e) => {
                              const val = e.target.value;
                              setCustomModalMatrix((prev) => {
                                const copy = [...prev];
                                if (copy[rIdx]) copy[rIdx].roomType = val;
                                return copy;
                              });
                            }}
                            className="w-full px-2.5 py-1.5 bg-white border border-[#D9E0EA] rounded-lg text-xs font-bold text-[#101828]"
                          />
                        </td>
                        <td className="p-2.5">
                          <input
                            type="number"
                            placeholder="BB"
                            value={row.bb}
                            onChange={(e) => {
                              const val = e.target.value === '' ? '' : Number(e.target.value);
                              setCustomModalMatrix((prev) => {
                                const copy = [...prev];
                                if (copy[rIdx]) copy[rIdx].bb = val;
                                return copy;
                              });
                            }}
                            className="w-28 px-2.5 py-1.5 bg-white border border-[#D9E0EA] rounded-lg text-xs text-[#101828]"
                          />
                        </td>
                        <td className="p-2.5">
                          <input
                            type="number"
                            placeholder="HB"
                            value={row.hb}
                            onChange={(e) => {
                              const val = e.target.value === '' ? '' : Number(e.target.value);
                              setCustomModalMatrix((prev) => {
                                const copy = [...prev];
                                if (copy[rIdx]) copy[rIdx].hb = val;
                                return copy;
                              });
                            }}
                            className="w-28 px-2.5 py-1.5 bg-purple-50/60 border border-purple-300 rounded-lg text-xs font-bold text-purple-900"
                          />
                        </td>
                        <td className="p-2.5">
                          <input
                            type="number"
                            placeholder="FB"
                            value={row.fb}
                            onChange={(e) => {
                              const val = e.target.value === '' ? '' : Number(e.target.value);
                              setCustomModalMatrix((prev) => {
                                const copy = [...prev];
                                if (copy[rIdx]) copy[rIdx].fb = val;
                                return copy;
                              });
                            }}
                            className="w-28 px-2.5 py-1.5 bg-white border border-[#D9E0EA] rounded-lg text-xs text-[#101828]"
                          />
                        </td>
                        <td className="p-2.5 text-right">
                          {customModalMatrix.length > 1 && (
                            <button
                              type="button"
                              onClick={() => {
                                setCustomModalMatrix((prev) => prev.filter((_, i) => i !== rIdx));
                              }}
                              className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Supplements & Reductions */}
            <div className="space-y-2">
              <h4 className="text-xs font-bold uppercase tracking-wider text-[#101828]">
                Supplements &amp; Reductions ({customModalCurrency})
              </h4>
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-[#667085]">Single Reduction (-)</label>
                  <input
                    type="number"
                    value={customModalSupplements.singleReduction || ''}
                    onChange={(e) =>
                      setCustomModalSupplements((prev) => ({
                        ...prev,
                        singleReduction: e.target.value === '' ? '' : Number(e.target.value),
                      }))
                    }
                    className="w-full px-2.5 py-1.5 bg-white border border-[#D9E0EA] rounded-lg text-xs"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-[#667085]">Triple Supp (+)</label>
                  <input
                    type="number"
                    value={customModalSupplements.tripleSupplement || ''}
                    onChange={(e) =>
                      setCustomModalSupplements((prev) => ({
                        ...prev,
                        tripleSupplement: e.target.value === '' ? '' : Number(e.target.value),
                      }))
                    }
                    className="w-full px-2.5 py-1.5 bg-white border border-[#D9E0EA] rounded-lg text-xs"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-[#667085]">BB Reduction (-)</label>
                  <input
                    type="number"
                    value={customModalSupplements.bbReduction || ''}
                    onChange={(e) =>
                      setCustomModalSupplements((prev) => ({
                        ...prev,
                        bbReduction: e.target.value === '' ? '' : Number(e.target.value),
                      }))
                    }
                    className="w-full px-2.5 py-1.5 bg-white border border-[#D9E0EA] rounded-lg text-xs"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-[#667085]">Child Rate</label>
                  <input
                    type="number"
                    value={customModalSupplements.childRate || ''}
                    onChange={(e) =>
                      setCustomModalSupplements((prev) => ({
                        ...prev,
                        childRate: e.target.value === '' ? '' : Number(e.target.value),
                      }))
                    }
                    className="w-full px-2.5 py-1.5 bg-white border border-[#D9E0EA] rounded-lg text-xs"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-[#667085]">Extra Bed Supp (+)</label>
                  <input
                    type="number"
                    value={customModalSupplements.extraBedSupplement || ''}
                    onChange={(e) =>
                      setCustomModalSupplements((prev) => ({
                        ...prev,
                        extraBedSupplement: e.target.value === '' ? '' : Number(e.target.value),
                      }))
                    }
                    className="w-full px-2.5 py-1.5 bg-white border border-[#D9E0EA] rounded-lg text-xs"
                  />
                </div>
              </div>
            </div>

            {/* Conditions & Taxes */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-[#101828]">Special Booking Conditions</label>
                <textarea
                  rows={2}
                  value={customModalConditions}
                  onChange={(e) => setCustomModalConditions(e.target.value)}
                  className="w-full px-3 py-1.5 bg-white border border-[#D9E0EA] rounded-lg text-xs"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-[#101828]">Tax Details</label>
                <textarea
                  rows={2}
                  value={customModalTaxDetails}
                  onChange={(e) => setCustomModalTaxDetails(e.target.value)}
                  className="w-full px-3 py-1.5 bg-white border border-[#D9E0EA] rounded-lg text-xs"
                />
              </div>
            </div>

            {/* Modal Actions */}
            <div className="pt-4 border-t border-[#F0F2F5] flex items-center justify-between">
              <button
                type="button"
                onClick={() => setEditingCustomIndex(null)}
                className="px-4 py-2.5 rounded-xl text-xs font-semibold text-[#667085] hover:bg-slate-100"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveCustomRateBuilder}
                className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl text-xs font-bold text-white bg-purple-600 hover:bg-purple-700 shadow-sm transition-all"
              >
                <Check className="w-4 h-4" />
                <span>Apply Custom Rate Sheet &amp; Return</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
