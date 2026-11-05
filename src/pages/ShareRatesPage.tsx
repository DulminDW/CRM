import React, { useState, useEffect } from 'react';
import {
  Send,
  Hotel as HotelIcon,
  CalendarDays,
  FileText,
  Mail,
  CheckCircle2,
  AlertCircle,
  Eye,
  FileCheck2
} from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { rateService } from '../services/rateService';
import { contractService, HotelContract } from '../services/contractService';
import { customRateService, CustomRateTemplate } from '../services/customRateService';
import { quoteService, SavedQuoteItem } from '../services/quoteService';
import { RecipientSelector, SelectedRecipient } from '../components/rates/RecipientSelector';
import { HotelRecord, HotelSeasonRecord } from '../types/hotelHierarchy';

export const ShareRatesPage: React.FC = () => {
  const { user } = useAuth();

  // Wizard state
  const [hotels, setHotels] = useState<HotelRecord[]>([]);
  const [selectedHotelId, setSelectedHotelId] = useState<string>('');
  const [seasons, setSeasons] = useState<HotelSeasonRecord[]>([]);
  const [selectedSeasonId, setSelectedSeasonId] = useState<string>('');

  // Rate source: Standard Tier vs. Custom Rate
  const [sourceType, setSourceType] = useState<'STANDARD' | 'CUSTOM'>('STANDARD');
  const [selectedCategory, setSelectedCategory] = useState<'RED' | 'GREEN' | 'YELLOW'>('GREEN');
  const [customTemplates, setCustomTemplates] = useState<CustomRateTemplate[]>([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('');

  // Contracts
  const [contracts, setContracts] = useState<HotelContract[]>([]);
  const [selectedContractId, setSelectedContractId] = useState<string>('');

  // Recipients
  const [selectedRecipients, setSelectedRecipients] = useState<SelectedRecipient[]>([]);

  // Special Conditions & Notes
  const [specialConditions, setSpecialConditions] = useState<string>(
    'Rates valid for minimum 2 consecutive nights. Non-combinable with existing promotional offers.'
  );
  const [notes, setNotes] = useState<string>('Rates quoted on Half Board basis.');

  // UI state
  const [loadingHotels, setLoadingHotels] = useState(true);
  const [loadingSeasons, setLoadingSeasons] = useState(false);
  const [savingQuote, setSavingQuote] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Load hotels
  useEffect(() => {
    rateService.getHotels().then((data: HotelRecord[]) => {
      setHotels(data);
      if (data.length > 0 && data[0]) {
        setSelectedHotelId(data[0].id);
      }
      setLoadingHotels(false);
    });
  }, []);

  // Load seasons and contracts when hotel changes
  useEffect(() => {
    if (!selectedHotelId) return;

    setLoadingSeasons(true);
    rateService.getSeasonsForHotel(selectedHotelId).then((data: HotelSeasonRecord[]) => {
      setSeasons(data);
      if (data.length > 0 && data[0]) {
        setSelectedSeasonId(data[0].id);
      } else {
        setSelectedSeasonId('');
      }
      setLoadingSeasons(false);
    });

    contractService.getContractsForHotel(selectedHotelId).then((data: HotelContract[]) => {
      setContracts(data);
      if (data.length > 0 && data[0]) {
        setSelectedContractId(data[0].id);
      } else {
        setSelectedContractId('');
      }
    });

    customRateService.getTemplates(selectedHotelId).then((data: CustomRateTemplate[]) => {
      setCustomTemplates(data);
      if (data.length > 0 && data[0]) {
        setSelectedTemplateId(data[0].id);
      } else {
        setSelectedTemplateId('');
      }
    });
  }, [selectedHotelId]);

  const selectedHotel = hotels.find((h) => h.id === selectedHotelId);
  const selectedSeason = seasons.find((s) => s.id === selectedSeasonId);
  const selectedContract = contracts.find((c) => c.id === selectedContractId);
  const selectedTemplate = customTemplates.find((t) => t.id === selectedTemplateId);

  // Email subject & body generator
  const emailSubject = `Partner Rates Proposal: ${selectedHotel?.hotel_name || 'Hotel'} — ${selectedSeason?.season_label || 'Season'}`;

  const emailBodyHtml = `
    <div style="font-family: Arial, sans-serif; color: #101828; line-height: 1.5;">
      <h2 style="color: #08264F;">Hotel Rates Proposal</h2>
      <p>Dear Partner,</p>
      <p>We are pleased to share our contract rates for <strong>${selectedHotel?.hotel_name}</strong> for the <strong>${selectedSeason?.season_label}</strong> validity period (${selectedSeason?.date_from} to ${selectedSeason?.date_to}).</p>
      
      <table style="width: 100%; border-collapse: collapse; margin: 16px 0; border: 1px solid #D9E0EA;">
        <tr style="background: #F8FAFC; text-align: left;">
          <th style="padding: 8px; border: 1px solid #D9E0EA;">Room Type</th>
          <th style="padding: 8px; border: 1px solid #D9E0EA;">Meal Plan</th>
          <th style="padding: 8px; border: 1px solid #D9E0EA;">Quoted Rate (${selectedContract?.currency || 'USD'})</th>
        </tr>
        <tr>
          <td style="padding: 8px; border: 1px solid #D9E0EA;">Double Room</td>
          <td style="padding: 8px; border: 1px solid #D9E0EA;">Half Board (HB)</td>
          <td style="padding: 8px; border: 1px solid #D9E0EA; font-weight: bold;">
            ${sourceType === 'CUSTOM' && selectedTemplate ? selectedTemplate.rate_amount : '[Contracted Tier Rate]'}
          </td>
        </tr>
      </table>

      ${specialConditions ? `<p><strong>Special Conditions:</strong><br/>${specialConditions}</p>` : ''}
      ${notes ? `<p><strong>Notes:</strong><br/>${notes}</p>` : ''}

      <p style="margin-top: 24px; color: #667085; font-size: 12px;">
        Sent via Window Companies Management System. All rates confidential.
      </p>
    </div>
  `;

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

      // Build quote line items
      const quoteItems: SavedQuoteItem[] = [
        {
          hotel_id: selectedHotelId,
          season_id: selectedSeasonId,
          hotel_name_snapshot: selectedHotel?.hotel_name || 'Hotel',
          season_label_snapshot: selectedSeason?.season_label || 'Season',
          room_type_snapshot: 'Double',
          meal_plan_snapshot: 'HB',
          rate_category: sourceType === 'CUSTOM' ? 'CUSTOM' : selectedCategory,
          quoted_amount: sourceType === 'CUSTOM' && selectedTemplate ? selectedTemplate.rate_amount : 0,
          currency: selectedContract?.currency || 'USD',
          custom_notes: notes
        }
      ];

      const savedQuote = await quoteService.saveQuoteSnapshot(
        {
          agency_id: firstRecipient.agencyId,
          market_id: firstRecipient.marketId || null,
          recipient_scope: selectedRecipients.length > 1 ? 'ENTIRE_AGENCY' : 'INDIVIDUAL',
          email_subject: emailSubject,
          email_body_html: emailBodyHtml,
          recipients: selectedRecipients,
          items: quoteItems,
          special_conditions: specialConditions,
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
                <h1 className="text-2xl font-bold text-[#101828]">Rate Sharing & Dispatch</h1>
                <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                  CRM Workflow
                </span>
              </div>
              <p className="text-sm text-[#667085]">
                Configure rates, bind recipients (Agency → Market → Members), and snapshot quotes.
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
          <button onClick={() => setSuccessMessage(null)} className="underline text-xs">Dismiss</button>
        </div>
      )}

      {errorMessage && (
        <div className="p-4 rounded-xl bg-red-50 border border-red-200 flex items-center justify-between text-red-700 text-sm">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-5 h-5 flex-shrink-0" />
            <span>{errorMessage}</span>
          </div>
          <button onClick={() => setErrorMessage(null)} className="underline text-xs">Dismiss</button>
        </div>
      )}

      {/* Grid: Left Wizard Controls / Right Recipient Selector */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column (7 cols): Configuration & Step Workflow */}
        <div className="lg:col-span-7 space-y-6">
          {/* Step 1 & 2: Property & Season */}
          <div className="bg-white rounded-2xl border border-[#D9E0EA] p-5 shadow-xs space-y-4">
            <h3 className="text-sm font-bold text-[#101828] uppercase tracking-wider flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-[#1455D9] text-white flex items-center justify-center text-xs">1</span>
              Property & Seasonal Calendar
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-[#667085] mb-1.5">Hotel Property</label>
                <div className="relative">
                  <select
                    value={selectedHotelId}
                    onChange={(e) => setSelectedHotelId(e.target.value)}
                    disabled={loadingHotels}
                    className="w-full h-10 pl-9 pr-3 rounded-lg border border-[#D9E0EA] bg-[#F8FAFC] text-xs font-medium text-[#101828] focus:ring-2 focus:ring-[#1455D9]"
                  >
                    {hotels.map((h) => (
                      <option key={h.id} value={h.id}>{h.hotel_name}</option>
                    ))}
                  </select>
                  <HotelIcon className="w-4 h-4 text-[#667085] absolute left-3 top-3 pointer-events-none" />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#667085] mb-1.5">Season Period</label>
                <div className="relative">
                  <select
                    value={selectedSeasonId}
                    onChange={(e) => setSelectedSeasonId(e.target.value)}
                    disabled={loadingSeasons || seasons.length === 0}
                    className="w-full h-10 pl-9 pr-3 rounded-lg border border-[#D9E0EA] bg-[#F8FAFC] text-xs font-medium text-[#101828] focus:ring-2 focus:ring-[#1455D9]"
                  >
                    {seasons.map((s) => (
                      <option key={s.id} value={s.id}>{s.season_label} ({s.date_from} → {s.date_to})</option>
                    ))}
                  </select>
                  <CalendarDays className="w-4 h-4 text-[#667085] absolute left-3 top-3 pointer-events-none" />
                </div>
              </div>
            </div>
          </div>

          {/* Step 3 & 4: Contract / Pricing Tier */}
          <div className="bg-white rounded-2xl border border-[#D9E0EA] p-5 shadow-xs space-y-4">
            <h3 className="text-sm font-bold text-[#101828] uppercase tracking-wider flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-[#1455D9] text-white flex items-center justify-center text-xs">2</span>
              Contract Reference & Pricing Category
            </h3>

            {/* Contract Selector */}
            <div>
              <label className="block text-xs font-semibold text-[#667085] mb-1.5">Contract Reference (Optional)</label>
              <div className="relative">
                <select
                  value={selectedContractId}
                  onChange={(e) => setSelectedContractId(e.target.value)}
                  className="w-full h-10 pl-9 pr-3 rounded-lg border border-[#D9E0EA] bg-[#F8FAFC] text-xs font-medium text-[#101828]"
                >
                  <option value="">No specific contract attached</option>
                  {contracts.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.contract_reference} — {c.contract_name} ({c.valid_from} to {c.valid_to})
                    </option>
                  ))}
                </select>
                <FileText className="w-4 h-4 text-[#667085] absolute left-3 top-3 pointer-events-none" />
              </div>
            </div>

            {/* Rate Source Toggle */}
            <div className="flex rounded-xl bg-[#F8FAFC] p-1 border border-[#D9E0EA]">
              <button
                type="button"
                onClick={() => setSourceType('STANDARD')}
                className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
                  sourceType === 'STANDARD' ? 'bg-white text-[#1455D9] shadow-xs' : 'text-[#667085]'
                }`}
              >
                Standard Category Tier (Red/Green/Yellow)
              </button>
              <button
                type="button"
                onClick={() => setSourceType('CUSTOM')}
                className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
                  sourceType === 'CUSTOM' ? 'bg-white text-[#1455D9] shadow-xs' : 'text-[#667085]'
                }`}
              >
                Custom Rate Template (Custom 1-3)
              </button>
            </div>

            {/* Source Content */}
            {sourceType === 'STANDARD' ? (
              <div className="grid grid-cols-3 gap-3">
                <button
                  type="button"
                  onClick={() => setSelectedCategory('RED')}
                  className={`p-3 rounded-xl border text-left transition-all ${
                    selectedCategory === 'RED'
                      ? 'border-red-500 bg-red-50/50 ring-2 ring-red-500'
                      : 'border-[#D9E0EA] hover:bg-slate-50'
                  }`}
                >
                  <span className="text-[10px] font-bold text-red-600 block uppercase">RED TIER</span>
                  <span className="text-xs font-bold text-[#101828]">LOWEST RATE</span>
                </button>

                <button
                  type="button"
                  onClick={() => setSelectedCategory('GREEN')}
                  className={`p-3 rounded-xl border text-left transition-all ${
                    selectedCategory === 'GREEN'
                      ? 'border-emerald-500 bg-emerald-50/50 ring-2 ring-emerald-500'
                      : 'border-[#D9E0EA] hover:bg-slate-50'
                  }`}
                >
                  <span className="text-[10px] font-bold text-emerald-600 block uppercase">GREEN TIER</span>
                  <span className="text-xs font-bold text-[#101828]">NORMAL RATE</span>
                </button>

                <button
                  type="button"
                  onClick={() => setSelectedCategory('YELLOW')}
                  className={`p-3 rounded-xl border text-left transition-all ${
                    selectedCategory === 'YELLOW'
                      ? 'border-amber-500 bg-amber-50/50 ring-2 ring-amber-500'
                      : 'border-[#D9E0EA] hover:bg-slate-50'
                  }`}
                >
                  <span className="text-[10px] font-bold text-amber-600 block uppercase">YELLOW TIER</span>
                  <span className="text-xs font-bold text-[#101828]">HIGHEST RATE</span>
                </button>
              </div>
            ) : (
              <div>
                <label className="block text-xs font-semibold text-[#667085] mb-1.5">Select Custom Template</label>
                {customTemplates.length === 0 ? (
                  <div className="p-3 bg-amber-50 text-amber-800 text-xs rounded-lg">
                    No custom templates configured for {selectedHotel?.hotel_name}. Please create templates in Rate Management.
                  </div>
                ) : (
                  <select
                    value={selectedTemplateId}
                    onChange={(e) => setSelectedTemplateId(e.target.value)}
                    className="w-full h-10 px-3 rounded-lg border border-[#D9E0EA] bg-[#F8FAFC] text-xs font-medium text-[#101828]"
                  >
                    {customTemplates.map((tpl) => (
                      <option key={tpl.id} value={tpl.id}>
                        {tpl.slot_label}: {tpl.template_name} (${tpl.rate_amount})
                        {tpl.room_night_condition ? ` • Min ${tpl.room_night_condition} R/N` : ''}
                      </option>
                    ))}
                  </select>
                )}
              </div>
            )}
          </div>

          {/* Step 5: Conditions & Notes */}
          <div className="bg-white rounded-2xl border border-[#D9E0EA] p-5 shadow-xs space-y-4">
            <h3 className="text-sm font-bold text-[#101828] uppercase tracking-wider flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-[#1455D9] text-white flex items-center justify-center text-xs">3</span>
              Special Conditions & Quote Notes
            </h3>

            <div>
              <label className="block text-xs font-semibold text-[#667085] mb-1.5">Special Conditions</label>
              <textarea
                value={specialConditions}
                onChange={(e) => setSpecialConditions(e.target.value)}
                rows={2}
                className="w-full p-3 rounded-lg border border-[#D9E0EA] text-xs text-[#101828] focus:ring-1 focus:ring-[#1455D9]"
                placeholder="e.g. 1500 room night minimum commitment, blackout dates..."
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#667085] mb-1.5">Staff Notes / Clarifications</label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={2}
                className="w-full p-3 rounded-lg border border-[#D9E0EA] text-xs text-[#101828] focus:ring-1 focus:ring-[#1455D9]"
                placeholder="e.g. Quoted per room per night on Half Board basis."
              />
            </div>
          </div>
        </div>

        {/* Right Column (5 cols): Recipient Selector & Action Panel */}
        <div className="lg:col-span-5 space-y-6">
          <div className="bg-white rounded-2xl border border-[#D9E0EA] p-5 shadow-xs">
            <h3 className="text-sm font-bold text-[#101828] uppercase tracking-wider flex items-center gap-2 mb-4">
              <span className="w-6 h-6 rounded-full bg-[#1455D9] text-white flex items-center justify-center text-xs">4</span>
              Recipient Targeting Hierarchy
            </h3>

            <RecipientSelector onSelectionChange={setSelectedRecipients} />
          </div>

          {/* Action Bar */}
          <div className="bg-white rounded-2xl border border-[#D9E0EA] p-5 shadow-xs space-y-3">
            <div className="text-xs text-[#667085] flex items-center justify-between">
              <span>Ready Recipients:</span>
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
              Saving freezes an immutable quote snapshot with recipient email and rate state.
            </p>
          </div>
        </div>
      </div>

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
                <div><strong>To ({selectedRecipients.length}):</strong> {selectedRecipients.map((r: SelectedRecipient) => r.email).join(', ')}</div>
                <div><strong>Subject:</strong> {emailSubject}</div>
              </div>

              <div
                className="p-4 border border-[#D9E0EA] rounded-xl bg-white"
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
                <FileCheck2 className="w-4 h-4" /> Save Quote Snapshot
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
