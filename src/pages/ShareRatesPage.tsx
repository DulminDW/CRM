import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Send,
  Hotel as HotelIcon,
  CalendarDays,
  FileText,
  Mail,
  CheckCircle2,
  AlertCircle,
  Eye,
  FileCheck2,
  Info,
  DollarSign,
  AlertTriangle,
  Clock,
  Sparkles
} from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { rateService, HotelRateSheet, HotelRateOutput } from '../services/rateService';
import { contractService, HotelContract } from '../services/contractService';
import { customRateService, CustomRateTemplate } from '../services/customRateService';
import { quoteService, SavedQuoteItem } from '../services/quoteService';
import { RecipientSelector, SelectedRecipient, RecipientScope } from '../components/rates/RecipientSelector';
import { HotelRecord, HotelSeasonRecord } from '../types/hotelHierarchy';

export const ShareRatesPage: React.FC = () => {
  const { user } = useAuth();

  // Wizard state: Property & Season
  const [hotels, setHotels] = useState<HotelRecord[]>([]);
  const [selectedHotelId, setSelectedHotelId] = useState<string>('');
  const [seasons, setSeasons] = useState<HotelSeasonRecord[]>([]);
  const [selectedSeasonId, setSelectedSeasonId] = useState<string>('');

  // Rate source: Standard Tier (Red/Green/Yellow) vs. Custom Template (Custom 1-3)
  const [sourceType, setSourceType] = useState<'STANDARD' | 'CUSTOM'>('STANDARD');
  const [selectedCategory, setSelectedCategory] = useState<'RED' | 'GREEN' | 'YELLOW'>('GREEN');
  const [customTemplates, setCustomTemplates] = useState<CustomRateTemplate[]>([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('');

  // Rate Sheet & Rate Outputs state (from hotel_rate_sheets / hotel_rate_outputs)
  const [activeRateSheet, setActiveRateSheet] = useState<HotelRateSheet | null>(null);
  const [publishedRateOutputs, setPublishedRateOutputs] = useState<HotelRateOutput[]>([]);

  // Contracts
  const [contracts, setContracts] = useState<HotelContract[]>([]);
  const [selectedContractId, setSelectedContractId] = useState<string>('');

  // Recipients
  const [selectedRecipients, setSelectedRecipients] = useState<SelectedRecipient[]>([]);
  const [recipientScope, setRecipientScope] = useState<RecipientScope>('INDIVIDUALS');

  // Special Conditions & Notes
  const [specialConditions, setSpecialConditions] = useState<string>(
    'Rates valid for minimum 2 consecutive nights. Non-combinable with existing promotional offers.'
  );
  const [notes, setNotes] = useState<string>('Rates quoted on Half Board basis.');
  const [roomNightCommitment, setRoomNightCommitment] = useState<number | ''>('');

  // UI state
  const [loadingHotels, setLoadingHotels] = useState(true);
  const [loadingSeasons, setLoadingSeasons] = useState(false);
  const [loadingRates, setLoadingRates] = useState(false);
  const [savingQuote, setSavingQuote] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [contractModalOpen, setContractModalOpen] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // 1. Load active hotels from Supabase
  useEffect(() => {
    rateService.getHotels()
      .then((data: HotelRecord[]) => {
        setHotels(data);
        if (data.length > 0 && data[0]) {
          setSelectedHotelId(data[0].id);
        }
        setLoadingHotels(false);
      })
      .catch((err) => {
        console.error('Failed to load hotels:', err);
        setLoadingHotels(false);
      });
  }, []);

  // 2. Load seasons, contracts, and custom templates when hotel changes
  useEffect(() => {
    if (!selectedHotelId) return;

    setLoadingSeasons(true);
    rateService.getSeasonsForHotel(selectedHotelId)
      .then((data: HotelSeasonRecord[]) => {
        setSeasons(data);
        if (data.length > 0 && data[0]) {
          setSelectedSeasonId(data[0].id);
        } else {
          setSelectedSeasonId('');
        }
        setLoadingSeasons(false);
      })
      .catch((err) => {
        console.error('Failed to load seasons:', err);
        setSeasons([]);
        setSelectedSeasonId('');
        setLoadingSeasons(false);
      });

    // Load custom templates for this hotel
    customRateService.getTemplates(selectedHotelId)
      .then((data: CustomRateTemplate[]) => {
        setCustomTemplates(data);
        if (data.length > 0 && data[0]) {
          setSelectedTemplateId(data[0].id);
        } else {
          setSelectedTemplateId('');
        }
      })
      .catch((err) => {
        console.warn('Custom templates table not ready:', err);
        setCustomTemplates([]);
        setSelectedTemplateId('');
      });
  }, [selectedHotelId]);

  // 3. Load contracts and rate sheets when (hotel, season) changes
  const loadRatesAndContracts = useCallback(async (hotelId: string, seasonId: string) => {
    if (!hotelId) return;

    // Fetch contracts matching this hotel and season
    try {
      const contractData = await contractService.getContractsForHotel(hotelId, seasonId || undefined);
      setContracts(contractData);
      if (contractData.length > 0 && contractData[0]) {
        setSelectedContractId(contractData[0].id);
      } else {
        setSelectedContractId('');
      }
    } catch (err) {
      console.warn('Contracts table query failed:', err);
      setContracts([]);
      setSelectedContractId('');
    }

    // Fetch published rate sheet and outputs for this hotel and season
    if (seasonId) {
      setLoadingRates(true);
      try {
        const sheets = await rateService.getRateSheets(hotelId, seasonId);
        const published = sheets.find((s) => s.status === 'PUBLISHED') || sheets[0] || null;
        setActiveRateSheet(published);

        if (published && published.hotel_rate_outputs) {
          setPublishedRateOutputs(published.hotel_rate_outputs);
        } else {
          setPublishedRateOutputs([]);
        }
      } catch (err) {
        console.warn('Rate sheets not yet published for this season:', err);
        setActiveRateSheet(null);
        setPublishedRateOutputs([]);
      } finally {
        setLoadingRates(false);
      }
    } else {
      setActiveRateSheet(null);
      setPublishedRateOutputs([]);
    }
  }, []);

  useEffect(() => {
    loadRatesAndContracts(selectedHotelId, selectedSeasonId);
  }, [selectedHotelId, selectedSeasonId, loadRatesAndContracts]);

  // Lookup selected objects
  const selectedHotel = useMemo(() => hotels.find((h) => h.id === selectedHotelId), [hotels, selectedHotelId]);
  const selectedSeason = useMemo(() => seasons.find((s) => s.id === selectedSeasonId), [seasons, selectedSeasonId]);
  const selectedContract = useMemo(() => contracts.find((c) => c.id === selectedContractId), [contracts, selectedContractId]);
  const selectedTemplate = useMemo(() => customTemplates.find((t) => t.id === selectedTemplateId), [customTemplates, selectedTemplateId]);

  // Calculate selected rate price
  const activeRateInfo = useMemo(() => {
    if (sourceType === 'CUSTOM') {
      if (selectedTemplate) {
        return {
          amount: selectedTemplate.rate_amount,
          currency: selectedTemplate.currency || 'USD',
          label: `${selectedTemplate.slot_label}: ${selectedTemplate.template_name}`,
          isFormulaVerified: true,
          roomNightCondition: selectedTemplate.room_night_condition || null
        };
      }
      return {
        amount: 0,
        currency: 'USD',
        label: 'Custom Template (None Selected)',
        isFormulaVerified: false,
        roomNightCondition: null
      };
    }

    // Standard Tier: Red / Green / Yellow
    const matchedOutput = publishedRateOutputs.find((o) => o.rate_category === selectedCategory);
    if (matchedOutput) {
      return {
        amount: matchedOutput.amount,
        currency: matchedOutput.currency || selectedContract?.currency || 'USD',
        label: `${selectedCategory} TIER (${selectedCategory === 'RED' ? 'Lowest' : selectedCategory === 'GREEN' ? 'Normal' : 'Highest'})`,
        isFormulaVerified: true,
        roomNightCondition: null
      };
    }

    // If no rate outputs entered yet in DB, preserve tier selection but mark formula unverified
    return {
      amount: 0,
      currency: selectedContract?.currency || 'USD',
      label: `${selectedCategory} TIER (Pricing Sheet Pending)`,
      isFormulaVerified: false,
      roomNightCondition: null
    };
  }, [sourceType, selectedTemplate, publishedRateOutputs, selectedCategory, selectedContract]);

  // Compose Email Subject & Body
  const emailSubject = useMemo(() => {
    return `Partner Rates Proposal: ${selectedHotel?.hotel_name || 'Hotel'} — ${selectedSeason?.season_label || 'Season'}`;
  }, [selectedHotel, selectedSeason]);

  const emailBodyHtml = useMemo(() => {
    const currencyStr = activeRateInfo.currency;
    const rateDisplay = activeRateInfo.isFormulaVerified && activeRateInfo.amount > 0
      ? `${currencyStr} ${activeRateInfo.amount.toFixed(2)}`
      : `[${selectedCategory} Tier - Calculation Pending Formula Confirmation]`;

    return `
      <div style="font-family: Arial, sans-serif; color: #101828; line-height: 1.5;">
        <h2 style="color: #08264F; margin-bottom: 4px;">Hotel Rates Proposal</h2>
        <p style="font-size: 13px; color: #475467; margin-top: 0;">Window Companies (Pvt) Ltd. — Partner Sales Desk</p>
        
        <p>Dear Partner,</p>
        <p>We are pleased to share our rate quote for <strong>${selectedHotel?.hotel_name || 'Partner Hotel'}</strong> for the <strong>${selectedSeason?.season_label || 'Requested Season'}</strong> validity period (${selectedSeason?.date_from || 'N/A'} to ${selectedSeason?.date_to || 'N/A'}).</p>
        
        <table style="width: 100%; border-collapse: collapse; margin: 16px 0; border: 1px solid #D9E0EA; font-size: 13px;">
          <thead>
            <tr style="background: #F8FAFC; text-align: left;">
              <th style="padding: 10px; border: 1px solid #D9E0EA;">Hotel Property</th>
              <th style="padding: 10px; border: 1px solid #D9E0EA;">Season Period</th>
              <th style="padding: 10px; border: 1px solid #D9E0EA;">Room Type</th>
              <th style="padding: 10px; border: 1px solid #D9E0EA;">Meal Plan</th>
              <th style="padding: 10px; border: 1px solid #D9E0EA;">Rate Class</th>
              <th style="padding: 10px; border: 1px solid #D9E0EA; text-align: right;">Quoted Rate</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td style="padding: 10px; border: 1px solid #D9E0EA; font-weight: bold;">${selectedHotel?.hotel_name || 'N/A'}</td>
              <td style="padding: 10px; border: 1px solid #D9E0EA;">${selectedSeason?.season_label || 'N/A'}</td>
              <td style="padding: 10px; border: 1px solid #D9E0EA;">Double Room</td>
              <td style="padding: 10px; border: 1px solid #D9E0EA;">Half Board (HB)</td>
              <td style="padding: 10px; border: 1px solid #D9E0EA;">${sourceType === 'CUSTOM' ? (selectedTemplate?.slot_label || 'Custom') : `${selectedCategory} TIER`}</td>
              <td style="padding: 10px; border: 1px solid #D9E0EA; font-weight: bold; text-align: right; color: #1455D9;">${rateDisplay}</td>
            </tr>
          </tbody>
        </table>

        ${selectedContract ? `
          <div style="background: #F0F9FF; border: 1px solid #B9E6FE; padding: 10px; border-radius: 8px; margin-bottom: 12px; font-size: 12px; color: #026AA2;">
            <strong>Contract Reference:</strong> ${selectedContract.contract_reference} (v${selectedContract.version_number}.0) — ${selectedContract.contract_name} (Valid: ${selectedContract.valid_from} to ${selectedContract.valid_to})
          </div>
        ` : ''}

        ${selectedContract && selectedContract.conditions && selectedContract.conditions.filter((c) => !c.is_internal_only).length > 0 ? `
          <div style="margin-bottom: 12px; font-size: 12px;">
            <p style="margin-bottom: 4px; font-weight: bold; color: #101828;">Contract Terms &amp; Policies:</p>
            <ul style="margin: 0; padding-left: 20px; color: #344054;">
              ${selectedContract.conditions
                .filter((c) => !c.is_internal_only)
                .map((c) => `<li><strong>${c.condition_title}:</strong> ${c.condition_description}</li>`)
                .join('')}
            </ul>
          </div>
        ` : ''}

        ${specialConditions ? `
          <p style="margin-bottom: 4px;"><strong>Special Conditions:</strong></p>
          <p style="margin-top: 0; background: #F8FAFC; padding: 10px; border-radius: 6px; border: 1px solid #EAECF0; font-size: 12px;">${specialConditions}</p>
        ` : ''}

        ${notes ? `
          <p style="margin-bottom: 4px;"><strong>Clarifications &amp; Notes:</strong></p>
          <p style="margin-top: 0; background: #F8FAFC; padding: 10px; border-radius: 6px; border: 1px solid #EAECF0; font-size: 12px;">${notes}</p>
        ` : ''}

        ${(roomNightCommitment || activeRateInfo.roomNightCondition) ? `
          <p style="font-size: 12px; color: #344054;">
            <strong>Volume Commitment:</strong> Minimum ${roomNightCommitment || activeRateInfo.roomNightCondition} room nights required.
          </p>
        ` : ''}

        <p style="margin-top: 24px; color: #667085; font-size: 11px; border-top: 1px solid #EAECF0; padding-top: 12px;">
          Sent via Window Companies Management System. All rates confidential and subject to contract terms.
        </p>
      </div>
    `;
  }, [
    selectedHotel,
    selectedSeason,
    sourceType,
    selectedTemplate,
    selectedCategory,
    activeRateInfo,
    selectedContract,
    specialConditions,
    notes,
    roomNightCommitment
  ]);

  // Handle Immutable Quote Saving
  const handleSaveQuote = async () => {
    if (!user) {
      setErrorMessage('You must be logged in to save a quote snapshot.');
      return;
    }
    if (selectedRecipients.length === 0) {
      setErrorMessage('Please select at least one recipient member.');
      return;
    }
    if (!selectedHotelId || !selectedSeasonId) {
      setErrorMessage('Please select both a Hotel and a Season.');
      return;
    }

    try {
      setSavingQuote(true);
      setErrorMessage(null);

      const firstRecipient = selectedRecipients[0];
      if (!firstRecipient) {
        throw new Error('No valid recipients selected.');
      }

      // Build quote line items with frozen snapshots
      const quoteItems: SavedQuoteItem[] = [
        {
          hotel_id: selectedHotelId,
          season_id: selectedSeasonId,
          contract_id: selectedContract?.id || null,
          contract_version_id: selectedContract?.versions?.[0]?.id || null,
          contract_reference_snapshot: selectedContract ? `${selectedContract.contract_reference} (v${selectedContract.version_number}.0)` : null,
          rate_sheet_id: activeRateSheet?.id || null,
          hotel_name_snapshot: selectedHotel?.hotel_name || 'Hotel',
          season_label_snapshot: selectedSeason?.season_label || 'Season',
          room_type_snapshot: 'Double',
          meal_plan_snapshot: 'HB',
          rate_category: sourceType === 'CUSTOM' ? 'CUSTOM' : selectedCategory,
          quoted_amount: activeRateInfo.amount,
          currency: activeRateInfo.currency,
          custom_notes: notes
        }
      ];

      // Map UI recipientScope to database quote recipient_scope
      let dbRecipientScope: 'INDIVIDUAL' | 'ENTIRE_MARKET' | 'ENTIRE_AGENCY' = 'INDIVIDUAL';
      if (recipientScope === 'COMPANY') {
        dbRecipientScope = 'ENTIRE_AGENCY';
      } else if (recipientScope === 'MARKETS') {
        dbRecipientScope = 'ENTIRE_MARKET';
      } else {
        dbRecipientScope = selectedRecipients.length > 1 ? 'ENTIRE_AGENCY' : 'INDIVIDUAL';
      }

      const conditionsWithVolume = roomNightCommitment
        ? `${specialConditions} (Min ${roomNightCommitment} room nights commitment)`.trim()
        : specialConditions;

      const savedQuote = await quoteService.saveQuoteSnapshot(
        {
          agency_id: firstRecipient.agencyId,
          market_id: firstRecipient.marketId || null,
          recipient_scope: dbRecipientScope,
          email_subject: emailSubject,
          email_body_html: emailBodyHtml,
          recipients: selectedRecipients,
          items: quoteItems,
          special_conditions: conditionsWithVolume,
          notes
        },
        user.id
      );

      setSuccessMessage(`Quote ${savedQuote.quote_reference} saved successfully with ${selectedRecipients.length} frozen recipients.`);
      setPreviewOpen(false);
    } catch (err: unknown) {
      setErrorMessage(err instanceof Error ? err.message : 'Failed to save quote snapshot');
    } finally {
      setSavingQuote(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-[#EAF2FF] text-[#1455D9] rounded-xl">
              <Send className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-bold text-[#101828]">Rate Sharing &amp; Dispatch</h1>
                <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                  Sales Workflow
                </span>
              </div>
              <p className="text-sm text-[#667085]">
                Configure hotel rates, inspect contracts, bind target recipients, and snapshot proposals.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Alerts */}
      {successMessage && (
        <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-between text-emerald-800 text-sm">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 flex-shrink-0" />
            <span>{successMessage}</span>
          </div>
          <button onClick={() => setSuccessMessage(null)} className="underline text-xs font-semibold">Dismiss</button>
        </div>
      )}

      {errorMessage && (
        <div className="p-4 rounded-xl bg-red-50 border border-red-200 flex items-center justify-between text-red-700 text-sm">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-5 h-5 flex-shrink-0" />
            <span>{errorMessage}</span>
          </div>
          <button onClick={() => setErrorMessage(null)} className="underline text-xs font-semibold">Dismiss</button>
        </div>
      )}

      {/* Main Grid: Left Steps (Hotel, Season, Contract, Rate, Conditions) / Right Recipient Selector */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column (7 cols): Hotel, Season, Contract, Rate, Conditions */}
        <div className="lg:col-span-7 space-y-6">

          {/* STEP 1 & 2: Hotel Property & Seasonal Calendar */}
          <div className="bg-white rounded-2xl border border-[#D9E0EA] p-5 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-[#101828] uppercase tracking-wider flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-[#1455D9] text-white flex items-center justify-center text-xs">1</span>
                Property &amp; Seasonal Calendar
              </h3>
              {selectedHotel && (
                <span className="text-[11px] font-semibold text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
                  {selectedHotel.area || 'Islandwide'} &bull; {selectedHotel.service_type || 'BOTH'}
                </span>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-[#667085] mb-1.5">
                  1. Select Hotel Property *
                </label>
                <div className="relative">
                  <select
                    value={selectedHotelId}
                    onChange={(e) => setSelectedHotelId(e.target.value)}
                    disabled={loadingHotels}
                    className="w-full h-10 pl-9 pr-4 rounded-lg border border-[#D9E0EA] bg-[#F8FAFC] text-xs font-medium text-[#101828] focus:ring-2 focus:ring-[#1455D9] focus:bg-white"
                  >
                    {hotels.map((h) => (
                      <option key={h.id} value={h.id}>
                        {h.hotel_name} ({h.hotel_code || 'No Code'})
                      </option>
                    ))}
                  </select>
                  <HotelIcon className="w-4 h-4 text-[#667085] absolute left-3 top-3 pointer-events-none" />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#667085] mb-1.5">
                  2. Select Hotel Season *
                </label>
                <div className="relative">
                  <select
                    value={selectedSeasonId}
                    onChange={(e) => setSelectedSeasonId(e.target.value)}
                    disabled={loadingSeasons || seasons.length === 0}
                    className="w-full h-10 pl-9 pr-4 rounded-lg border border-[#D9E0EA] bg-[#F8FAFC] text-xs font-medium text-[#101828] focus:ring-2 focus:ring-[#1455D9] focus:bg-white"
                  >
                    {seasons.length === 0 ? (
                      <option value="">No active seasons configured</option>
                    ) : (
                      seasons.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.season_label} ({s.date_from} → {s.date_to})
                        </option>
                      ))
                    )}
                  </select>
                  <CalendarDays className="w-4 h-4 text-[#667085] absolute left-3 top-3 pointer-events-none" />
                </div>
              </div>
            </div>

            {seasons.length === 0 && !loadingSeasons && (
              <div className="p-3 bg-amber-50 text-amber-800 text-xs rounded-xl flex items-center gap-2 border border-amber-200">
                <AlertTriangle className="w-4 h-4 flex-shrink-0 text-amber-600" />
                <span>No seasons have been created for {selectedHotel?.hotel_name}. Please configure seasons in Hotels &amp; Seasons.</span>
              </div>
            )}
          </div>

          {/* STEP 3: Contract Selection & Inspection */}
          <div className="bg-white rounded-2xl border border-[#D9E0EA] p-5 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-[#101828] uppercase tracking-wider flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-[#1455D9] text-white flex items-center justify-center text-xs">2</span>
                Master Hotel Contract Reference
              </h3>
              {selectedContract && (
                <button
                  type="button"
                  onClick={() => setContractModalOpen(true)}
                  className="text-xs text-[#1455D9] font-semibold hover:underline flex items-center gap-1"
                >
                  <Info className="w-3.5 h-3.5" /> Inspect Terms
                </button>
              )}
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#667085] mb-1.5">
                Active Partner Contract (Scoped to Hotel &amp; Season)
              </label>
              <div className="relative">
                <select
                  value={selectedContractId}
                  onChange={(e) => setSelectedContractId(e.target.value)}
                  className="w-full h-10 pl-9 pr-4 rounded-lg border border-[#D9E0EA] bg-[#F8FAFC] text-xs font-medium text-[#101828] focus:ring-2 focus:ring-[#1455D9] focus:bg-white"
                >
                  <option value="">No specific contract attached (Ad-hoc rate)</option>
                  {contracts.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.contract_reference} — {c.contract_name} ({c.valid_from} to {c.valid_to}) [{c.currency}]
                    </option>
                  ))}
                </select>
                <FileText className="w-4 h-4 text-[#667085] absolute left-3 top-3 pointer-events-none" />
              </div>
            </div>

            {selectedContract && (
              <div className="p-3 bg-blue-50/60 border border-blue-200 rounded-xl text-xs space-y-1">
                <div className="flex items-center justify-between font-semibold text-blue-900">
                  <span>Contract: {selectedContract.contract_name}</span>
                  <span className="px-2 py-0.5 rounded bg-blue-100 text-[10px] uppercase font-bold text-blue-800">
                    {selectedContract.currency}
                  </span>
                </div>
                <p className="text-[11px] text-blue-700">
                  Validity: {selectedContract.valid_from} &rarr; {selectedContract.valid_to} &bull; Applicable Season: {selectedContract.season_label || 'All Seasons'}
                </p>
              </div>
            )}
          </div>

          {/* STEP 4 & 5: Rate Tier (Red/Green/Yellow) or Custom Template (Custom 1-3) */}
          <div className="bg-white rounded-2xl border border-[#D9E0EA] p-5 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-[#101828] uppercase tracking-wider flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-[#1455D9] text-white flex items-center justify-center text-xs">3</span>
                Rate Selection &amp; Pricing Tier
              </h3>
              <span className="text-[11px] font-semibold text-slate-500">
                Half Board (HB) &bull; Double Room
              </span>
            </div>

            {/* Source Toggle */}
            <div className="flex rounded-xl bg-[#F8FAFC] p-1 border border-[#D9E0EA]">
              <button
                type="button"
                onClick={() => setSourceType('STANDARD')}
                className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
                  sourceType === 'STANDARD' ? 'bg-white text-[#1455D9] shadow-xs' : 'text-[#667085]'
                }`}
              >
                Standard Category Tier (Red / Green / Yellow)
              </button>
              <button
                type="button"
                onClick={() => setSourceType('CUSTOM')}
                className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
                  sourceType === 'CUSTOM' ? 'bg-white text-[#1455D9] shadow-xs' : 'text-[#667085]'
                }`}
              >
                Custom Rate Templates (Custom 1, 2, 3)
              </button>
            </div>

            {/* Standard Category Tier Cards */}
            {sourceType === 'STANDARD' ? (
              <div className="space-y-3">
                <div className="grid grid-cols-3 gap-3">
                  <button
                    type="button"
                    onClick={() => setSelectedCategory('RED')}
                    className={`p-3.5 rounded-xl border text-left transition-all ${
                      selectedCategory === 'RED'
                        ? 'border-red-500 bg-red-50/70 ring-2 ring-red-500'
                        : 'border-[#D9E0EA] hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-center space-x-1.5">
                      <span className="w-2.5 h-2.5 rounded-full bg-red-500" />
                      <span className="text-[10px] font-bold text-red-700 uppercase">RED TIER</span>
                    </div>
                    <div className="text-xs font-bold text-[#101828] mt-1">LOWEST RATE</div>
                    <span className="text-[11px] text-slate-500 mt-0.5 block">High-volume partner floor</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setSelectedCategory('GREEN')}
                    className={`p-3.5 rounded-xl border text-left transition-all ${
                      selectedCategory === 'GREEN'
                        ? 'border-emerald-500 bg-emerald-50/70 ring-2 ring-emerald-500'
                        : 'border-[#D9E0EA] hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-center space-x-1.5">
                      <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                      <span className="text-[10px] font-bold text-emerald-700 uppercase">GREEN TIER</span>
                    </div>
                    <div className="text-xs font-bold text-[#101828] mt-1">NORMAL RATE</div>
                    <span className="text-[11px] text-slate-500 mt-0.5 block">Standard commercial tier</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setSelectedCategory('YELLOW')}
                    className={`p-3.5 rounded-xl border text-left transition-all ${
                      selectedCategory === 'YELLOW'
                        ? 'border-amber-500 bg-amber-50/70 ring-2 ring-amber-500'
                        : 'border-[#D9E0EA] hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-center space-x-1.5">
                      <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
                      <span className="text-[10px] font-bold text-amber-700 uppercase">YELLOW TIER</span>
                    </div>
                    <div className="text-xs font-bold text-[#101828] mt-1">HIGHEST RATE</div>
                    <span className="text-[11px] text-slate-500 mt-0.5 block">Peak / non-contracted ceiling</span>
                  </button>
                </div>

                {/* Rate Output Status Banner */}
                {loadingRates ? (
                  <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-500 flex items-center gap-2">
                    <Clock className="w-4 h-4 animate-spin text-[#1455D9]" />
                    <span>Loading verified rate sheet outputs...</span>
                  </div>
                ) : activeRateInfo.isFormulaVerified && activeRateInfo.amount > 0 ? (
                  <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-900 flex items-center justify-between">
                    <div>
                      <strong>Verified Output Rate:</strong> {activeRateInfo.currency} {activeRateInfo.amount.toFixed(2)} (Double / HB)
                    </div>
                    <span className="text-[10px] font-semibold bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded">
                      Sheet Version {activeRateSheet?.version_number || 1}
                    </span>
                  </div>
                ) : (
                  <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-900 flex items-start gap-2">
                    <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
                    <div>
                      <strong>Pricing Formula Unconfirmed:</strong> Company Excel calculation workbook is pending ingestion. The {selectedCategory} Tier classification is retained for quotes, with price calculated upon rate sheet upload.
                    </div>
                  </div>
                )}
              </div>
            ) : (
              /* Custom Rate Templates (Custom 1-3) */
              <div className="space-y-3">
                <label className="block text-xs font-semibold text-[#667085]">
                  Select Pre-Configured Custom Rate Template
                </label>
                {customTemplates.length === 0 ? (
                  <div className="p-3 bg-amber-50 text-amber-800 text-xs rounded-xl border border-amber-200">
                    No custom templates configured for {selectedHotel?.hotel_name}. Custom templates can be created under Rate Management Hub.
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    {customTemplates.map((tpl) => {
                      const isSelected = selectedTemplateId === tpl.id;
                      return (
                        <button
                          key={tpl.id}
                          type="button"
                          onClick={() => setSelectedTemplateId(tpl.id)}
                          className={`p-3 rounded-xl border text-left transition-all ${
                            isSelected
                              ? 'border-[#1455D9] bg-[#EAF2FF]/60 ring-2 ring-[#1455D9]'
                              : 'border-[#D9E0EA] bg-white hover:bg-slate-50'
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <span className="text-[10px] font-bold text-[#1455D9] uppercase">{tpl.slot_label}</span>
                            <Sparkles className="w-3.5 h-3.5 text-[#1455D9]" />
                          </div>
                          <div className="font-bold text-xs text-[#101828] mt-1">{tpl.template_name}</div>
                          <div className="text-sm font-extrabold text-[#1455D9] mt-1">
                            ${tpl.rate_amount} <span className="text-[10px] font-normal text-slate-500">{tpl.currency}</span>
                          </div>
                          {tpl.room_night_condition && (
                            <span className="text-[10px] text-slate-600 block mt-1">
                              Min {tpl.room_night_condition} R/N
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* STEP 6: Special Conditions, Notes & Room Night Commitment */}
          <div className="bg-white rounded-2xl border border-[#D9E0EA] p-5 shadow-xs space-y-4">
            <h3 className="text-sm font-bold text-[#101828] uppercase tracking-wider flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-[#1455D9] text-white flex items-center justify-center text-xs">4</span>
              Special Conditions &amp; Quote Notes
            </h3>

            <div>
              <label className="block text-xs font-semibold text-[#667085] mb-1.5">
                Special Conditions (e.g. Min Stay, Blackout Periods)
              </label>
              <textarea
                value={specialConditions}
                onChange={(e) => setSpecialConditions(e.target.value)}
                rows={2}
                className="w-full p-3 rounded-xl border border-[#D9E0EA] text-xs text-[#101828] focus:ring-1 focus:ring-[#1455D9]"
                placeholder="e.g. Rates valid for minimum 2 consecutive nights. Blackout dates: Dec 24 - Jan 5..."
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-[#667085] mb-1.5">
                  Staff Notes / Clarifications
                </label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={2}
                  className="w-full p-3 rounded-xl border border-[#D9E0EA] text-xs text-[#101828] focus:ring-1 focus:ring-[#1455D9]"
                  placeholder="e.g. Quoted per room per night on Half Board basis."
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#667085] mb-1.5">
                  Room-Night Commitment Condition (Optional)
                </label>
                <input
                  type="number"
                  min="0"
                  step="1"
                  value={roomNightCommitment}
                  onChange={(e) => setRoomNightCommitment(e.target.value === '' ? '' : parseInt(e.target.value, 10))}
                  placeholder="e.g. 1500"
                  className="w-full h-10 px-3 rounded-xl border border-[#D9E0EA] text-xs text-[#101828] focus:ring-1 focus:ring-[#1455D9]"
                />
                <span className="text-[10px] text-slate-400 mt-1 block">
                  Enforces volume minimums (e.g. 1500 room nights) as agreed in agency terms.
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column (5 cols): Recipient Selector & Action Panel */}
        <div className="lg:col-span-5 space-y-6">
          <div className="bg-white rounded-2xl border border-[#D9E0EA] p-5 shadow-xs">
            <h3 className="text-sm font-bold text-[#101828] uppercase tracking-wider flex items-center gap-2 mb-4">
              <span className="w-6 h-6 rounded-full bg-[#1455D9] text-white flex items-center justify-center text-xs">5</span>
              Recipient Targeting Hierarchy
            </h3>

            <RecipientSelector
              onSelectionChange={setSelectedRecipients}
              onScopeChange={setRecipientScope}
            />
          </div>

          {/* Action Bar */}
          <div className="bg-white rounded-2xl border border-[#D9E0EA] p-5 shadow-xs space-y-4">
            <div className="flex items-center justify-between text-xs pb-3 border-b border-[#D9E0EA]">
              <span className="text-[#667085]">Confirmed Recipients:</span>
              <span className="font-bold text-[#101828]">{selectedRecipients.length} members</span>
            </div>

            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setPreviewOpen(true)}
                disabled={selectedRecipients.length === 0}
                className="flex-1 h-11 rounded-xl border border-[#D9E0EA] bg-[#F8FAFC] hover:bg-slate-100 text-xs font-bold text-[#101828] flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
              >
                <Eye className="w-4 h-4 text-[#667085]" /> Preview Email
              </button>

              <button
                type="button"
                onClick={handleSaveQuote}
                disabled={savingQuote || selectedRecipients.length === 0}
                className="flex-1 h-11 rounded-xl bg-[#1455D9] hover:bg-blue-700 text-xs font-bold text-white flex items-center justify-center gap-2 transition-colors disabled:opacity-50 shadow-xs"
              >
                <FileCheck2 className="w-4 h-4" /> {savingQuote ? 'Saving...' : 'Save Quote Snapshot'}
              </button>
            </div>

            <p className="text-[11px] text-[#667085] text-center">
              Saving freezes an immutable quote snapshot with recipient emails, rate values, and conditions.
            </p>
          </div>
        </div>
      </div>

      {/* Contract Terms Inspection Modal */}
      {contractModalOpen && selectedContract && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl border border-[#D9E0EA] shadow-xl max-w-lg w-full overflow-hidden flex flex-col">
            <div className="p-4 border-b border-[#D9E0EA] flex items-center justify-between bg-[#F8FAFC]">
              <div className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-[#1455D9]" />
                <h3 className="font-bold text-sm text-[#101828]">Contract Details &amp; Terms</h3>
              </div>
              <button
                type="button"
                onClick={() => setContractModalOpen(false)}
                className="text-[#667085] hover:text-[#101828] text-xs font-bold"
              >
                ✕ Close
              </button>
            </div>
            <div className="p-5 space-y-3 text-xs">
              <div>
                <strong>Reference:</strong> {selectedContract.contract_reference}
              </div>
              <div>
                <strong>Contract Name:</strong> {selectedContract.contract_name}
              </div>
              <div>
                <strong>Validity:</strong> {selectedContract.valid_from} &rarr; {selectedContract.valid_to}
              </div>
              <div>
                <strong>Currency:</strong> {selectedContract.currency}
              </div>
              <div>
                <strong>Applicable Season:</strong> {selectedContract.season_label || 'All Seasons'}
              </div>
              <div className="pt-2 border-t border-[#D9E0EA]">
                <strong className="block mb-1">Commercial Terms &amp; Conditions:</strong>
                <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 text-slate-700 whitespace-pre-wrap">
                  {selectedContract.terms_and_conditions || 'No special contract conditions specified.'}
                </div>
              </div>
            </div>
            <div className="p-4 border-t border-[#D9E0EA] bg-[#F8FAFC] flex justify-end">
              <button
                type="button"
                onClick={() => setContractModalOpen(false)}
                className="px-4 py-2 text-xs font-semibold rounded-lg bg-[#1455D9] text-white hover:bg-blue-700"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Email Preview Modal */}
      {previewOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl border border-[#D9E0EA] shadow-xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col">
            <div className="p-4 border-b border-[#D9E0EA] flex items-center justify-between bg-[#F8FAFC]">
              <div className="flex items-center gap-2">
                <Mail className="w-5 h-5 text-[#1455D9]" />
                <h3 className="font-bold text-sm text-[#101828]">Outgoing Quote Email Preview</h3>
              </div>
              <button
                type="button"
                onClick={() => setPreviewOpen(false)}
                className="text-[#667085] hover:text-[#101828] text-xs font-bold"
              >
                ✕ Close
              </button>
            </div>

            <div className="p-5 overflow-y-auto space-y-4">
              <div className="text-xs bg-[#F8FAFC] p-3 rounded-lg border border-[#D9E0EA] space-y-1">
                <div>
                  <strong>To ({selectedRecipients.length}):</strong>{' '}
                  {selectedRecipients.map((r: SelectedRecipient) => r.email).join(', ')}
                </div>
                <div>
                  <strong>Subject:</strong> {emailSubject}
                </div>
              </div>

              <div
                className="p-4 border border-[#D9E0EA] rounded-xl bg-white shadow-xs"
                dangerouslySetInnerHTML={{ __html: emailBodyHtml }}
              />
            </div>

            <div className="p-4 border-t border-[#D9E0EA] bg-[#F8FAFC] flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setPreviewOpen(false)}
                className="px-4 py-2 text-xs font-semibold rounded-lg text-[#667085] hover:bg-slate-200"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveQuote}
                disabled={savingQuote}
                className="px-5 py-2 text-xs font-bold rounded-lg bg-[#1455D9] text-white hover:bg-blue-700 flex items-center gap-1.5"
              >
                <DollarSign className="w-4 h-4" /> Save Quote Snapshot
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
