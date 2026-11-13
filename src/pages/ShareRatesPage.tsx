import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
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
  AlertTriangle,
  Clock,
  Sparkles,
  Tag,
  Copy,
  ExternalLink,
  Check,
  Smartphone,
  HelpCircle
} from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { rateService, HotelRateSheet, HotelRateOutput } from '../services/rateService';
import { contractService, HotelContract } from '../services/contractService';
import { customRateService, CustomRateTemplate } from '../services/customRateService';
import { quoteService, SavedQuoteItem, QuoteRecord } from '../services/quoteService';
import { RecipientSelector, SelectedRecipient, RecipientScope, RecipientValidationState } from '../components/rates/RecipientSelector';
import { HotelRecord, HotelSeasonRecord } from '../types/hotelHierarchy';

export const ShareRatesPage: React.FC = () => {
  const { user } = useAuth();
  const [searchParams] = useSearchParams();

  // URL Query Parameters for Ad-Hoc Custom Negotiations
  const queryHotelId = searchParams.get('hotelId');
  const querySeasonId = searchParams.get('seasonId');
  const querySourceType = searchParams.get('sourceType');
  const queryCustomRateAmount = searchParams.get('customRateAmount');
  const queryCustomRateLabel = searchParams.get('customRateLabel');
  const queryAgencyId = searchParams.get('agencyId');
  const queryCustomNotes = searchParams.get('customNotes');

  // Wizard state: Property & Season
  const [hotels, setHotels] = useState<HotelRecord[]>([]);
  const [selectedHotelId, setSelectedHotelId] = useState<string>(queryHotelId || '');
  const [seasons, setSeasons] = useState<HotelSeasonRecord[]>([]);
  const [selectedSeasonId, setSelectedSeasonId] = useState<string>(querySeasonId || '');

  // Rate source: Standard Tier (Red/Green/Yellow) vs. Custom (Ad-hoc Negotiated Offer or Pre-configured Template)
  const [sourceType, setSourceType] = useState<'STANDARD' | 'CUSTOM'>(
    querySourceType === 'CUSTOM' ? 'CUSTOM' : 'STANDARD'
  );
  const [selectedCategory, setSelectedCategory] = useState<'RED' | 'GREEN' | 'YELLOW'>('GREEN');
  const [customTemplates, setCustomTemplates] = useState<CustomRateTemplate[]>([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('');

  // Ad-hoc negotiated rate direct input (when creating custom rate for a specific deal)
  const [isAdHocCustom, setIsAdHocCustom] = useState<boolean>(Boolean(queryCustomRateAmount));
  const [adHocRateAmount, setAdHocRateAmount] = useState<number | ''>(
    queryCustomRateAmount ? parseFloat(queryCustomRateAmount) : ''
  );
  const [adHocRateLabel, setAdHocRateLabel] = useState<string>(
    queryCustomRateLabel || 'Custom Negotiated Rate'
  );

  // Rate Sheet & Rate Outputs state (from hotel_rate_sheets / hotel_rate_outputs)
  const [activeRateSheet, setActiveRateSheet] = useState<HotelRateSheet | null>(null);
  const [publishedRateOutputs, setPublishedRateOutputs] = useState<HotelRateOutput[]>([]);

  // Contracts
  const [contracts, setContracts] = useState<HotelContract[]>([]);
  const [selectedContractId, setSelectedContractId] = useState<string>('');

  // Recipients
  const [selectedRecipients, setSelectedRecipients] = useState<SelectedRecipient[]>([]);
  const [recipientScope, setRecipientScope] = useState<RecipientScope>('INDIVIDUALS');
  const [recipientValidation, setRecipientValidation] = useState<RecipientValidationState | null>(null);

  // Special Conditions & Notes
  const [specialConditions, setSpecialConditions] = useState<string>(
    'Rates valid for minimum 2 consecutive nights. Non-combinable with existing promotional offers.'
  );
  const [notes, setNotes] = useState<string>(
    queryCustomNotes || 'Rates quoted on Half Board basis.'
  );
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
        if (queryHotelId && data.some((h) => h.id === queryHotelId)) {
          setSelectedHotelId(queryHotelId);
        } else if (data.length > 0 && data[0]) {
          setSelectedHotelId(data[0].id);
        }
        setLoadingHotels(false);
      })
      .catch((err) => {
        console.error('Failed to load hotels:', err);
        setLoadingHotels(false);
      });
  }, [queryHotelId]);

  // 2. Load seasons, contracts, and custom templates when hotel changes
  useEffect(() => {
    if (!selectedHotelId) return;

    setLoadingSeasons(true);
    rateService.getSeasonsForHotel(selectedHotelId)
      .then((data: HotelSeasonRecord[]) => {
        setSeasons(data);
        if (querySeasonId && data.some((s) => s.id === querySeasonId)) {
          setSelectedSeasonId(querySeasonId);
        } else if (data.length > 0 && data[0]) {
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
      // 1. Direct ad-hoc custom negotiated rate (from Rate Calculations or inline entry)
      if (isAdHocCustom || (typeof adHocRateAmount === 'number' && adHocRateAmount > 0)) {
        const amt = typeof adHocRateAmount === 'number' && adHocRateAmount > 0 ? adHocRateAmount : 0;
        return {
          amount: amt,
          currency: selectedContract?.currency || 'USD',
          label: adHocRateLabel || 'Negotiated Custom Offer',
          isFormulaVerified: amt > 0, // Staff-negotiated agreed rate
          roomNightCondition: null
        };
      }

      // 2. Pre-configured custom template (Custom 1, 2, 3)
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
        currency: selectedContract?.currency || 'USD',
        label: 'Custom Offer (No Rate Entered)',
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

    // Check hotel rate configs for seeded or configured tier rates
    const localConfigs = localStorage.getItem('window_companies_hotel_rate_configs');
    if (localConfigs && selectedHotelId) {
      try {
        const parsed = JSON.parse(localConfigs);
        const cfg = parsed.find((c: { hotel_id: string; rate_category: string }) => c.hotel_id === selectedHotelId && c.rate_category === selectedCategory);
        if (cfg && cfg.hb_double_base_rate > 0) {
          return {
            amount: cfg.hb_double_base_rate,
            currency: cfg.currency || 'USD',
            label: `${selectedCategory} TIER (${selectedCategory === 'RED' ? 'Lowest' : selectedCategory === 'GREEN' ? 'Normal' : 'Highest'})`,
            isFormulaVerified: Boolean(cfg.is_formula_verified),
            roomNightCondition: null
          };
        }
      } catch {
        // Fallback below
      }
    }

    // If no rate outputs entered yet in DB, preserve tier selection but mark formula unverified
    return {
      amount: 0,
      currency: selectedContract?.currency || 'USD',
      label: `${selectedCategory} TIER (Pricing Sheet Pending)`,
      isFormulaVerified: false,
      roomNightCondition: null
    };
  }, [
    sourceType,
    isAdHocCustom,
    adHocRateAmount,
    adHocRateLabel,
    selectedTemplate,
    publishedRateOutputs,
    selectedCategory,
    selectedContract,
    selectedHotelId
  ]);

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
              <td style="padding: 10px; border: 1px solid #D9E0EA;">${sourceType === 'CUSTOM' ? (isAdHocCustom ? adHocRateLabel : (selectedTemplate?.slot_label || 'Custom')) : `${selectedCategory} TIER`}</td>
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

  // State for email dispatch lifecycle and saved quote reference
  const [createdQuote, setCreatedQuote] = useState<QuoteRecord | null>(null);
  const [isOpeningEmailApp, setIsOpeningEmailApp] = useState<boolean>(false);
  const [copiedSection, setCopiedSection] = useState<'ALL' | 'BODY' | 'SUBJECT' | 'RECIPIENTS' | null>(null);
  const [showConfirmationPrompt, setShowConfirmationPrompt] = useState<boolean>(false);
  const [confirmationNotice, setConfirmationNotice] = useState<string | null>(null);
  const [isSubmittingConfirmation, setIsSubmittingConfirmation] = useState<boolean>(false);

  // CC support for rate quote emails
  const [ccRecipientsInput, setCcRecipientsInput] = useState<string>('');

  // Plain-text counterpart of outgoing email body for multi-part compliance and mailto prefill
  const emailBodyText = useMemo(() => {
    const currencyStr = activeRateInfo.currency;
    const rateDisplay = activeRateInfo.isFormulaVerified && activeRateInfo.amount > 0
      ? `${currencyStr} ${activeRateInfo.amount.toFixed(2)}`
      : `[${selectedCategory} Tier - Pending Formula Confirmation]`;

    const rateClassName = sourceType === 'CUSTOM'
      ? (isAdHocCustom ? adHocRateLabel : (selectedTemplate?.slot_label || 'Custom Negotiated Rate'))
      : `${selectedCategory} TIER RATE`;

    // Readable plain-text rate table layout with clear line breaks
    let body = `HOTEL RATES PROPOSAL
Window Companies (Pvt) Ltd. — Partner Sales Desk
------------------------------------------------------------

Dear Partner,

We are pleased to share our rate quote for ${selectedHotel?.hotel_name || 'Partner Hotel'} for the ${selectedSeason?.season_label || 'Season'} validity period (${selectedSeason?.date_from || 'N/A'} to ${selectedSeason?.date_to || 'N/A'}).

============================================================
QUOTED RATES & ROOM SPECIFICATIONS
============================================================
* Hotel:       ${selectedHotel?.hotel_name || 'N/A'}
* Season:      ${selectedSeason?.season_label || 'N/A'} (${selectedSeason?.date_from || 'N/A'} to ${selectedSeason?.date_to || 'N/A'})
* Room Type:   Double Room
* Occupancy:   Double (2 Persons)
* Meal Plan:   Half Board (HB)
* Rate Class:  ${rateClassName}
* Quoted Rate: ${rateDisplay}
============================================================
`;

    if (selectedContract) {
      body += `
CONTRACT INFORMATION:
* Contract Reference: ${selectedContract.contract_reference} (v${selectedContract.version_number}.0)
* Contract Name:      ${selectedContract.contract_name}
* Validity:           ${selectedContract.valid_from} to ${selectedContract.valid_to}
* Applicable Season:  ${selectedContract.season_label || 'All Seasons'}
`;

      const externalConditions = selectedContract.conditions?.filter((c) => !c.is_internal_only) || [];
      if (externalConditions.length > 0) {
        body += `
CONTRACT TERMS & CONDITIONS:
${externalConditions.map((c) => `* ${c.condition_title}: ${c.condition_description}`).join('\n')}
`;
      }
    }

    if (specialConditions) {
      body += `
SPECIAL CONDITIONS:
${specialConditions}
`;
    }

    if (notes) {
      body += `
CLARIFICATIONS & NOTES:
${notes}
`;
    }

    if (roomNightCommitment || activeRateInfo.roomNightCondition) {
      body += `
VOLUME COMMITMENT:
* Minimum ${roomNightCommitment || activeRateInfo.roomNightCondition} room nights required.
`;
    }

    body += `
------------------------------------------------------------
Sent via Window Companies Management System.
All rates are strictly confidential and subject to contract terms.
`;

    return body.trim();
  }, [
    selectedHotel,
    selectedSeason,
    sourceType,
    isAdHocCustom,
    adHocRateLabel,
    selectedTemplate,
    selectedCategory,
    activeRateInfo,
    selectedContract,
    specialConditions,
    notes,
    roomNightCommitment
  ]);

  // Handle Immutable Quote Saving (DRAFT state)
  const handleSaveQuote = async (): Promise<QuoteRecord | null> => {
    if (!user) {
      setErrorMessage('You must be logged in to save a quote snapshot.');
      return null;
    }
    if (selectedRecipients.length === 0) {
      setErrorMessage('Please select at least one recipient member.');
      return null;
    }
    // Check recipient email validity
    const hasInvalidEmails = selectedRecipients.some((r) => !r.email || !/^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/.test(r.email.trim()));
    if (hasInvalidEmails) {
      setErrorMessage('Cannot proceed: One or more selected recipients do not have a valid email address.');
      return null;
    }
    if (!selectedHotelId || !selectedSeasonId) {
      setErrorMessage('Please select both a Hotel and a Season.');
      return null;
    }
    if (!activeRateInfo.isFormulaVerified || activeRateInfo.amount <= 0) {
      setErrorMessage('Cannot save quote: Rate calculation is pending official company Excel formula verification.');
      return null;
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
          email_body_text: emailBodyText,
          recipients: selectedRecipients,
          items: quoteItems,
          special_conditions: conditionsWithVolume,
          notes
        },
        user.id
      );

      setCreatedQuote(savedQuote);
      setSuccessMessage(`Quote ${savedQuote.quote_reference} saved as DRAFT snapshot with ${selectedRecipients.length} frozen recipients.`);
      return savedQuote;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to save quote snapshot';
      setErrorMessage(msg);
      return null;
    } finally {
      setSavingQuote(false);
    }
  };

  // Handle mailto URL Generation and Device Email Application Launch
  const handleOpenInEmailApp = async (targetClient?: 'DEFAULT' | 'GMAIL') => {
    try {
      setIsOpeningEmailApp(true);

      const toEmails = selectedRecipients.map((r: SelectedRecipient) => r.email).filter(Boolean);
      const toStr = toEmails.join(',');
      const ccStr = ccRecipientsInput.trim();

      // Encode subject and body safely
      const encodedSubject = encodeURIComponent(emailSubject);
      const encodedBody = encodeURIComponent(emailBodyText);

      // Build query string
      const queryParts: string[] = [];
      if (ccStr) {
        queryParts.push(`cc=${encodeURIComponent(ccStr)}`);
      }
      queryParts.push(`subject=${encodedSubject}`);
      queryParts.push(`body=${encodedBody}`);

      const mailtoUrl = `mailto:${toStr}?${queryParts.join('&')}`;

      // 1. Immediately launch Gmail or Mail client without waiting or blocking
      if (targetClient === 'GMAIL') {
        const gmailUrl = `https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(toStr)}${ccStr ? `&cc=${encodeURIComponent(ccStr)}` : ''}&su=${encodedSubject}&body=${encodedBody}`;
        window.open(gmailUrl, '_blank', 'noopener,noreferrer');
      } else {
        window.location.href = mailtoUrl;
      }

      // 2. Asynchronously save quote snapshot and record handoff in the background if possible
      try {
        let targetQuote = createdQuote;
        if (!targetQuote && selectedHotelId && selectedSeasonId && selectedRecipients.length > 0) {
          targetQuote = await handleSaveQuote();
        }
        if (targetQuote) {
          await quoteService.recordOpenedInEmailApp(targetQuote.id).catch(() => {});
        }
      } catch (saveErr) {
        console.warn('Background quote save notice:', saveErr);
      }

      // Show confirmation prompt in CRM: "Did you successfully send this email?"
      setShowConfirmationPrompt(true);
      setConfirmationNotice(null);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setErrorMessage(`Failed to open email application: ${msg}`);
    } finally {
      setIsOpeningEmailApp(false);
    }
  };

  // Handle staff confirmation prompt response
  const handleUserConfirmation = async (confirmedSent: boolean) => {
    if (!createdQuote || !user) return;

    try {
      setIsSubmittingConfirmation(true);
      const res = await quoteService.recordUserSendConfirmation(
        createdQuote.id,
        user.id,
        confirmedSent,
        confirmedSent ? 'Confirmed sent manually in device email app' : 'Staff kept quote as draft in email client'
      );

      if (res.success && confirmedSent) {
        setConfirmationNotice('Thank you! Status updated to USER_CONFIRMED_SENT. Record safely archived.');
        setCreatedQuote((prev: QuoteRecord | null) => prev ? { ...prev, email_status: 'USER_CONFIRMED_SENT' } : null);
      } else {
        setConfirmationNotice('Recorded as OPENED_IN_EMAIL_APP. You can revisit and confirm later.');
        setCreatedQuote((prev: QuoteRecord | null) => prev ? { ...prev, email_status: 'OPENED_IN_EMAIL_APP' } : null);
      }
    } catch (err: unknown) {
      console.warn('Failed to record user confirmation:', err);
    } finally {
      setIsSubmittingConfirmation(false);
    }
  };

  // Clipboard copy helpers for fallback
  const handleCopy = (text: string, section: 'ALL' | 'BODY' | 'SUBJECT' | 'RECIPIENTS') => {
    navigator.clipboard.writeText(text);
    setCopiedSection(section);
    setTimeout(() => setCopiedSection(null), 2500);
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
                  sourceType === 'CUSTOM' ? 'bg-white text-purple-700 shadow-xs font-bold' : 'text-[#667085]'
                }`}
              >
                Custom / Specially Negotiated Offer
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
              /* Custom Rate Options: Ad-Hoc Negotiated Offer OR Pre-Configured Custom Templates */
              <div className="space-y-4">
                {/* Custom Sub-Mode Selector */}
                <div className="flex items-center gap-2 p-1 bg-slate-100 rounded-lg text-xs">
                  <button
                    type="button"
                    onClick={() => setIsAdHocCustom(true)}
                    className={`flex-1 py-1 px-2.5 rounded font-medium transition-colors ${
                      isAdHocCustom
                        ? 'bg-white text-purple-700 font-bold shadow-2xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    Ad-Hoc Negotiated Custom Rate
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsAdHocCustom(false)}
                    className={`flex-1 py-1 px-2.5 rounded font-medium transition-colors ${
                      !isAdHocCustom
                        ? 'bg-white text-blue-700 font-bold shadow-2xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    Use Saved Custom Template (Custom 1-3)
                  </button>
                </div>

                {isAdHocCustom ? (
                  /* Ad-Hoc Custom Deal Input */
                  <div className="p-4 bg-purple-50/60 rounded-xl border border-purple-200 space-y-3">
                    <div className="flex items-center justify-between text-xs font-semibold text-purple-900">
                      <span className="flex items-center gap-1.5">
                        <Tag className="w-3.5 h-3.5 text-purple-600" /> Specially Negotiated Custom Deal
                      </span>
                      <span className="text-[11px] font-normal text-purple-700 bg-purple-100 px-2 py-0.5 rounded">
                        Non-Template Single Quote
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[11px] font-bold text-slate-700 mb-1">
                          Negotiated HB Double Rate ({selectedContract?.currency || 'USD'}) *
                        </label>
                        <div className="relative">
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-500">$</span>
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            value={adHocRateAmount}
                            onChange={(e) => setAdHocRateAmount(e.target.value === '' ? '' : parseFloat(e.target.value))}
                            placeholder="e.g. 105.00"
                            className="w-full h-10 pl-7 pr-3 text-xs font-bold rounded-lg border border-purple-300 bg-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-[11px] font-bold text-slate-700 mb-1">
                          Rate Label / Description
                        </label>
                        <input
                          type="text"
                          value={adHocRateLabel}
                          onChange={(e) => setAdHocRateLabel(e.target.value)}
                          placeholder="e.g. Special Deal for Agency"
                          className="w-full h-10 px-3 text-xs font-medium rounded-lg border border-purple-300 bg-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                        />
                      </div>
                    </div>
                    <p className="text-[11px] text-purple-700">
                      This rate is saved directly into the permanent quote history for the target recipient without polluting reusable company templates.
                    </p>
                  </div>
                ) : (
                  /* Pre-Configured Templates (Custom 1-3) */
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
              onValidationChange={setRecipientValidation}
              initialAgencyId={queryAgencyId || undefined}
            />
          </div>

          {/* Action Bar */}
          <div className="bg-white rounded-2xl border border-[#D9E0EA] p-5 shadow-xs space-y-4">
            <div className="flex items-center justify-between text-xs pb-3 border-b border-[#D9E0EA]">
              <span className="text-[#667085]">Confirmed Recipients:</span>
              <span className="font-bold text-[#101828]">{selectedRecipients.length} members</span>
            </div>

            {recipientValidation?.hasInvalidEmails && (
              <div className="p-2.5 rounded-lg bg-amber-50 border border-amber-200 text-[11px] text-amber-800 flex items-center gap-1.5">
                <AlertTriangle className="w-3.5 h-3.5 text-amber-600 flex-shrink-0" />
                <span>{recipientValidation.invalidEmailCount} contact(s) without valid emails were excluded.</span>
              </div>
            )}

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

      {/* Email Preview & Device App Handoff Modal */}
      {previewOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl border border-[#D9E0EA] shadow-xl max-w-3xl w-full max-h-[92vh] overflow-hidden flex flex-col">
            <div className="p-4 border-b border-[#D9E0EA] flex items-center justify-between bg-[#F8FAFC]">
              <div className="flex items-center gap-2">
                <Mail className="w-5 h-5 text-[#1455D9]" />
                <h3 className="font-bold text-sm text-[#101828]">Email Preview &amp; Device App Handoff</h3>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-100 text-blue-800 border border-blue-200">
                  Pre-flight Review
                </span>
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
              {/* Notice / Feedback if copied */}
              {copiedSection && (
                <div className="p-3 rounded-xl text-xs bg-emerald-50 text-emerald-800 border border-emerald-200 flex items-center gap-2">
                  <Check className="w-4 h-4 text-emerald-600" />
                  <span>
                    <strong>Copied to clipboard:</strong> {copiedSection === 'ALL' ? 'Full email payload (Subject & Body)' : copiedSection}
                  </span>
                </div>
              )}

              {/* Status / Device Handoff Banner */}
              <div className="p-3.5 bg-blue-50/80 rounded-xl border border-blue-200 text-xs text-blue-900 space-y-1">
                <div className="flex items-center gap-2 font-bold text-blue-950">
                  <Smartphone className="w-4 h-4 text-[#1455D9]" />
                  <span>Device Email App Workflow (iOS / Android / Desktop)</span>
                </div>
                <p className="text-blue-800 text-[11px] leading-relaxed">
                  Clicking <strong>Open in Email App</strong> launches your phone or computer's default mail application (e.g. Gmail, Apple Mail, Outlook) with recipient, subject, and plain-text rate table prefilled. You review and press <strong>Send</strong> manually in your email app.
                </p>
              </div>

              {/* Recipient Details, CC & Subject Banner */}
              <div className="text-xs bg-[#F8FAFC] p-4 rounded-xl border border-[#D9E0EA] space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pb-2 border-b border-[#EAECF0]">
                  <div>
                    <span className="text-[#667085] block text-[11px]">Primary Agency:</span>
                    <strong className="text-[#101828]">{selectedRecipients[0]?.agencyName || 'Selected Agency'}</strong>
                  </div>
                  <div>
                    <span className="text-[#667085] block text-[11px]">Recipient Count:</span>
                    <strong className="text-[#101828]">{selectedRecipients.length} contact(s) targeted</strong>
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[#667085] text-[11px] font-semibold">To Recipients:</span>
                    <button
                      type="button"
                      onClick={() => handleCopy(selectedRecipients.map((r: SelectedRecipient) => r.email).join(', '), 'RECIPIENTS')}
                      className="text-[11px] text-[#1455D9] hover:underline flex items-center gap-1"
                    >
                      <Copy className="w-3 h-3" /> Copy Emails
                    </button>
                  </div>
                  <div className="text-[#101828] font-medium max-h-24 overflow-y-auto space-y-0.5 bg-white p-2 rounded-lg border border-[#D9E0EA]">
                    {selectedRecipients.map((r: SelectedRecipient) => (
                      <div key={r.memberId} className="flex items-center gap-1.5">
                        <span className="font-semibold text-slate-900">{r.fullName}</span>
                        <span className="text-[#1455D9]">&lt;{r.email}&gt;</span>
                        <span className="text-[10px] text-slate-400">({r.agencyName})</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Optional CC Recipients Input */}
                <div>
                  <label className="text-[#667085] block text-[11px] font-semibold mb-1">
                    CC Recipients (Optional, comma-separated):
                  </label>
                  <input
                    type="text"
                    value={ccRecipientsInput}
                    onChange={(e) => setCcRecipientsInput(e.target.value)}
                    placeholder="sales.team@windowcompanies.lk, supervisor@windowcompanies.lk"
                    className="w-full px-3 py-1.5 text-xs rounded-lg border border-[#D9E0EA] bg-white focus:outline-hidden focus:border-[#1455D9]"
                  />
                </div>

                <div className="pt-2 border-t border-[#EAECF0] flex items-center justify-between gap-2">
                  <div className="flex-1">
                    <span className="text-[#667085] block text-[11px] font-semibold">Subject:</span>
                    <span className="font-semibold text-[#101828]">{emailSubject}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleCopy(emailSubject, 'SUBJECT')}
                    className="text-[11px] text-[#1455D9] hover:underline flex items-center gap-1 shrink-0"
                  >
                    <Copy className="w-3 h-3" /> Copy Subject
                  </button>
                </div>
              </div>

              {/* Exact Rate Summary Strip */}
              <div className="p-3 bg-blue-50/60 rounded-xl border border-blue-200 text-xs flex flex-wrap items-center justify-between gap-3">
                <div>
                  <span className="text-blue-700 block text-[11px]">Hotel &amp; Season</span>
                  <span className="font-bold text-blue-950">
                    {selectedHotel?.hotel_name || 'N/A'} — {selectedSeason?.season_label || 'N/A'}
                  </span>
                </div>
                <div>
                  <span className="text-blue-700 block text-[11px]">Room / Occupancy / Board</span>
                  <span className="font-bold text-blue-950">Double / Half Board (HB)</span>
                </div>
                <div>
                  <span className="text-blue-700 block text-[11px]">Rate Class &amp; Quoted Rate</span>
                  <span className="font-bold text-blue-950">
                    {sourceType === 'CUSTOM' ? (isAdHocCustom ? adHocRateLabel : (selectedTemplate?.slot_label || 'Custom')) : `${selectedCategory} TIER`}:{' '}
                    {activeRateInfo.currency} {activeRateInfo.amount.toFixed(2)}
                  </span>
                </div>
              </div>

              {/* Plain-Text Rate Table Preview (Matches exactly what opens in email app) */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[#667085] text-[11px] font-semibold uppercase tracking-wider">
                    Plain-Text Rate Table (Pre-filled into Email App):
                  </span>
                  <button
                    type="button"
                    onClick={() => handleCopy(emailBodyText, 'BODY')}
                    className="text-[11px] text-[#1455D9] hover:underline flex items-center gap-1 font-semibold"
                  >
                    <Copy className="w-3 h-3" /> Copy Email Body
                  </button>
                </div>
                <pre className="p-4 border border-[#D9E0EA] rounded-xl bg-slate-900 text-slate-100 font-mono text-xs whitespace-pre-wrap max-h-72 overflow-y-auto leading-relaxed shadow-inner">
                  {emailBodyText}
                </pre>
              </div>

              {/* Internal Confidentiality & mailto character limit note */}
              <div className="space-y-1.5">
                <div className="text-[11px] text-[#667085] bg-slate-50 p-2.5 rounded-lg border border-slate-200 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0"></span>
                  <span>
                    <strong>Internal Privacy Guarantee:</strong> Internal notes, private contract margins, and unverified rates are strictly excluded from the email payload.
                  </span>
                </div>
                <div className="text-[11px] text-amber-700 bg-amber-50/70 p-2.5 rounded-lg border border-amber-200 flex items-start gap-1.5">
                  <HelpCircle className="w-3.5 h-3.5 shrink-0 mt-0.5 text-amber-600" />
                  <span>
                    <strong>Email App Notice:</strong> <code>mailto:</code> links transfer plain text safely across mobile and desktop clients. If your mail client does not open automatically, click <strong>"Copy All Content"</strong> below and paste it into any webmail or client manually.
                  </span>
                </div>
              </div>
            </div>

            {/* Modal Actions: Back, Edit, Copy All, Open in Email App */}
            <div className="p-4 border-t border-[#D9E0EA] bg-[#F8FAFC] flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setPreviewOpen(false)}
                  className="px-3.5 py-2 text-xs font-semibold rounded-lg text-[#667085] hover:bg-slate-200 transition-colors"
                >
                  ← Back to Rates
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setPreviewOpen(false);
                    window.scrollTo({ top: 350, behavior: 'smooth' });
                  }}
                  className="px-3 py-2 text-xs font-semibold rounded-lg border border-[#D9E0EA] bg-white text-[#344054] hover:bg-slate-100 transition-colors"
                >
                  Edit Rates
                </button>
                <button
                  type="button"
                  onClick={() => handleCopy(`Subject: ${emailSubject}\n\n${emailBodyText}`, 'ALL')}
                  className="px-3 py-2 text-xs font-semibold rounded-lg border border-[#D9E0EA] bg-white text-[#101828] hover:bg-slate-100 transition-colors flex items-center gap-1"
                >
                  <Copy className="w-3 h-3 text-slate-500" /> Copy Email
                </button>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleOpenInEmailApp('GMAIL')}
                  disabled={isOpeningEmailApp || savingQuote}
                  className="px-3.5 py-2 text-xs font-bold rounded-lg border border-red-200 bg-red-50 text-red-700 hover:bg-red-100 transition-colors flex items-center gap-1.5 disabled:opacity-50"
                  title="Open directly in Gmail web compose"
                >
                  <ExternalLink className="w-3.5 h-3.5" /> Continue in Gmail
                </button>

                <button
                  type="button"
                  onClick={() => handleOpenInEmailApp('DEFAULT')}
                  disabled={isOpeningEmailApp || savingQuote}
                  className="px-4 py-2 text-xs font-bold rounded-lg bg-[#1455D9] text-white hover:bg-blue-700 transition-colors flex items-center gap-1.5 disabled:opacity-50 shadow-xs"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  {isOpeningEmailApp ? 'Opening App...' : 'Open in Email App'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Staff Confirmation Dialog: "Did you successfully send this email?" */}
      {showConfirmationPrompt && (
        <div className="fixed inset-0 z-60 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl border border-[#D9E0EA] shadow-2xl max-w-md w-full overflow-hidden flex flex-col">
            <div className="p-4 border-b border-[#D9E0EA] bg-[#F8FAFC] flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Smartphone className="w-5 h-5 text-[#1455D9]" />
                <h3 className="font-bold text-sm text-[#101828]">Email Dispatch Confirmation</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowConfirmationPrompt(false)}
                className="text-[#667085] hover:text-[#101828] text-xs font-bold"
              >
                ✕
              </button>
            </div>

            <div className="p-5 space-y-4">
              <p className="text-xs text-[#344054] leading-relaxed">
                Your device's email handler was opened with pre-filled quote details for{' '}
                <strong>{selectedRecipients[0]?.agencyName || 'the partner'}</strong>.
              </p>

              <div className="p-3.5 bg-blue-50/70 border border-blue-200 rounded-xl text-xs text-blue-900 font-semibold">
                Did you successfully send this email in your email app?
              </div>

              {confirmationNotice && (
                <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800 font-medium flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>{confirmationNotice}</span>
                </div>
              )}

              <p className="text-[11px] text-[#667085]">
                Note: Web browsers cannot detect whether Send was pressed inside an external email program. Clicking <strong>Yes, I Sent It</strong> safely flags this snapshot as <code>USER_CONFIRMED_SENT</code> with your staff name and timestamp.
              </p>
            </div>

            <div className="p-4 border-t border-[#D9E0EA] bg-[#F8FAFC] flex justify-end gap-3">
              <button
                type="button"
                onClick={() => handleUserConfirmation(false)}
                disabled={isSubmittingConfirmation}
                className="px-4 py-2 text-xs font-semibold rounded-lg border border-[#D9E0EA] bg-white text-[#667085] hover:bg-slate-100 transition-colors disabled:opacity-50"
              >
                Not Sent Yet
              </button>
              <button
                type="button"
                onClick={() => handleUserConfirmation(true)}
                disabled={isSubmittingConfirmation}
                className="px-5 py-2 text-xs font-bold rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 transition-colors flex items-center gap-1.5 disabled:opacity-50 shadow-xs"
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                {isSubmittingConfirmation ? 'Recording...' : 'Yes, I Sent It'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
