import React, { useState, useEffect } from 'react';
import {
  Search,
  Eye,
  Filter,
  Calendar,
  Building,
  User,
  Layers,
  FileText,
  Mail,
  AlertTriangle,
  RotateCw,
  CheckCircle2,
  X
} from 'lucide-react';
import { useSearchParams } from 'react-router-dom';
import { quoteService, QuoteRecord, QuoteItemSnapshot, QuoteRecipientSnapshot } from '../../services/quoteService';

export const QuoteHistoryView: React.FC = () => {
  const [searchParams] = useSearchParams();
  const agencyIdParam = searchParams.get('agencyId');
  const memberIdParam = searchParams.get('memberId');

  const [quotes, setQuotes] = useState<QuoteRecord[]>([]);
  const [loading, setLoading] = useState(true);

  // Search & Filter State
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<string>('ALL');
  const [selectedRateType, setSelectedRateType] = useState<string>('ALL');
  const [selectedHotelFilter, setSelectedHotelFilter] = useState<string>('ALL');
  const [dateFromFilter, setDateFromFilter] = useState<string>('');
  const [dateToFilter, setDateToFilter] = useState<string>('');

  const [activeQuoteModal, setActiveQuoteModal] = useState<QuoteRecord | null>(null);
  const [retryingQuoteId, setRetryingQuoteId] = useState<string | null>(null);
  const [retryNotice, setRetryNotice] = useState<{ id: string; type: 'success' | 'warning' | 'error'; message: string } | null>(null);

  const handleRetryDispatch = async (quote: QuoteRecord) => {
    try {
      setRetryingQuoteId(quote.id);
      setRetryNotice(null);

      const res = await quoteService.dispatchQuoteEmail(quote.id);

      if (res.success && res.email_status === 'SENT') {
        setRetryNotice({
          id: quote.id,
          type: 'success',
          message: 'Email dispatched successfully! Server confirmed delivery.'
        });
        // Update local quote state
        setQuotes((prev) => prev.map((q) => q.id === quote.id ? { ...q, email_status: 'SENT' } : q));
        if (activeQuoteModal && activeQuoteModal.id === quote.id) {
          setActiveQuoteModal((prev) => prev ? { ...prev, email_status: 'SENT' } : null);
        }
      } else {
        setRetryNotice({
          id: quote.id,
          type: 'warning',
          message: res.error || 'Server email provider not configured. Attempt logged, quote remains FAILED for retry.'
        });
        // Ensure state remains FAILED
        setQuotes((prev) => prev.map((q) => q.id === quote.id ? { ...q, email_status: 'FAILED' } : q));
        if (activeQuoteModal && activeQuoteModal.id === quote.id) {
          setActiveQuoteModal((prev) => prev ? { ...prev, email_status: 'FAILED' } : null);
        }
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setRetryNotice({
        id: quote.id,
        type: 'error',
        message: `Retry failed: ${msg}`
      });
    } finally {
      setRetryingQuoteId(null);
    }
  };

  useEffect(() => {
    if (agencyIdParam || memberIdParam) {
      quoteService.getQuotesForAgencyOrMember(agencyIdParam || undefined, memberIdParam || undefined)
        .then((data: QuoteRecord[]) => {
          setQuotes(data);
          setLoading(false);
        });
    } else {
      quoteService.getQuotes().then((data: QuoteRecord[]) => {
        setQuotes(data);
        setLoading(false);
      });
    }
  }, [agencyIdParam, memberIdParam]);

  // Extract unique hotel names from quote items across all loaded quotes for filter dropdown
  const uniqueHotels = React.useMemo(() => {
    const set = new Set<string>();
    quotes.forEach((q) => {
      q.quote_items?.forEach((item) => {
        if (item.hotel_name_snapshot) set.add(item.hotel_name_snapshot);
      });
    });
    return Array.from(set).sort();
  }, [quotes]);

  const filteredQuotes = quotes.filter((q) => {
    const qStr = searchQuery.toLowerCase().trim();

    // Text Search
    const matchesSearch = !qStr || (
      q.quote_reference.toLowerCase().includes(qStr) ||
      q.email_subject.toLowerCase().includes(qStr) ||
      (q.agency_name && q.agency_name.toLowerCase().includes(qStr)) ||
      (q.sender_name && q.sender_name.toLowerCase().includes(qStr)) ||
      (q.quote_recipients && q.quote_recipients.some(r =>
        r.original_full_name.toLowerCase().includes(qStr) ||
        r.original_email.toLowerCase().includes(qStr)
      )) ||
      (q.quote_items && q.quote_items.some(item =>
        item.hotel_name_snapshot.toLowerCase().includes(qStr) ||
        item.season_label_snapshot.toLowerCase().includes(qStr) ||
        (item.contract_reference_snapshot && item.contract_reference_snapshot.toLowerCase().includes(qStr)) ||
        item.rate_category.toLowerCase().includes(qStr)
      ))
    );

    // Email Status Filter
    const matchesStatus = selectedStatus === 'ALL' || q.email_status === selectedStatus;

    // Rate Type Filter (RED, GREEN, YELLOW, CUSTOM)
    const matchesRateType = selectedRateType === 'ALL' || (
      q.quote_items && q.quote_items.some(item => item.rate_category === selectedRateType)
    );

    // Hotel Filter
    const matchesHotel = selectedHotelFilter === 'ALL' || (
      q.quote_items && q.quote_items.some(item => item.hotel_name_snapshot === selectedHotelFilter)
    );

    // Date Range Filter
    const quoteDate = q.created_at ? q.created_at.slice(0, 10) : '';
    const matchesDateFrom = !dateFromFilter || (quoteDate >= dateFromFilter);
    const matchesDateTo = !dateToFilter || (quoteDate <= dateToFilter);

    return matchesSearch && matchesStatus && matchesRateType && matchesHotel && matchesDateFrom && matchesDateTo;
  });

  return (
    <div className="space-y-4">
      {/* Comprehensive Search & Filter Controls */}
      <div className="bg-white rounded-2xl border border-[#D9E0EA] p-4 shadow-xs space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-[#667085] absolute left-3 top-3 pointer-events-none" />
            <input
              type="text"
              placeholder="Search by quote reference, agency, contact person, email, hotel, or contract..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full h-10 pl-9 pr-3 rounded-xl border border-[#D9E0EA] bg-[#F8FAFC] focus:bg-white text-xs text-[#101828] focus:ring-2 focus:ring-[#1455D9] focus:outline-none"
            />
          </div>

          {(agencyIdParam || memberIdParam) && (
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-blue-50 border border-blue-200 text-xs text-blue-800">
              <span className="font-semibold">Scoped to:</span>
              <span>{agencyIdParam ? 'Agency' : 'Member Contact'}</span>
              <a
                href="/rates?tab=HISTORY"
                className="text-[#1455D9] font-bold hover:underline ml-1"
                title="Clear scoped filter"
              >
                Clear
              </a>
            </div>
          )}
        </div>

        {/* Multi-Filter Bar: Hotel, Rate Type, Status, Date Range */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 pt-2 border-t border-[#EAECF0] text-xs">
          {/* Hotel Filter */}
          <div>
            <label className="block text-[11px] font-semibold text-[#667085] mb-1 flex items-center gap-1">
              <Building className="w-3 h-3 text-[#667085]" /> Hotel Property
            </label>
            <select
              value={selectedHotelFilter}
              onChange={(e) => setSelectedHotelFilter(e.target.value)}
              className="w-full h-9 px-2.5 rounded-lg border border-[#D9E0EA] bg-[#F8FAFC] text-xs text-[#101828] focus:ring-1 focus:ring-[#1455D9]"
            >
              <option value="ALL">All Hotels</option>
              {uniqueHotels.map((h) => (
                <option key={h} value={h}>{h}</option>
              ))}
            </select>
          </div>

          {/* Rate Category Tier */}
          <div>
            <label className="block text-[11px] font-semibold text-[#667085] mb-1 flex items-center gap-1">
              <Layers className="w-3 h-3 text-[#667085]" /> Rate Tier / Category
            </label>
            <select
              value={selectedRateType}
              onChange={(e) => setSelectedRateType(e.target.value)}
              className="w-full h-9 px-2.5 rounded-lg border border-[#D9E0EA] bg-[#F8FAFC] text-xs text-[#101828] focus:ring-1 focus:ring-[#1455D9]"
            >
              <option value="ALL">All Rate Types</option>
              <option value="RED">RED Tier (Lowest)</option>
              <option value="GREEN">GREEN Tier (Normal)</option>
              <option value="YELLOW">YELLOW Tier (Highest)</option>
              <option value="CUSTOM">CUSTOM (Negotiated)</option>
            </select>
          </div>

          {/* Email Status */}
          <div>
            <label className="block text-[11px] font-semibold text-[#667085] mb-1 flex items-center gap-1">
              <Filter className="w-3 h-3 text-[#667085]" /> Email Dispatch Status
            </label>
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="w-full h-9 px-2.5 rounded-lg border border-[#D9E0EA] bg-[#F8FAFC] text-xs text-[#101828] focus:ring-1 focus:ring-[#1455D9]"
            >
              <option value="ALL">All Statuses</option>
              <option value="NOT_SENT">Draft (Not Sent)</option>
              <option value="SENT">Dispatched (Sent)</option>
              <option value="FAILED">Failed</option>
            </select>
          </div>

          {/* Date Range */}
          <div>
            <label className="block text-[11px] font-semibold text-[#667085] mb-1 flex items-center gap-1">
              <Calendar className="w-3 h-3 text-[#667085]" /> Date Range (From &rarr; To)
            </label>
            <div className="flex items-center gap-1.5">
              <input
                type="date"
                value={dateFromFilter}
                onChange={(e) => setDateFromFilter(e.target.value)}
                className="w-1/2 h-9 px-2 rounded-lg border border-[#D9E0EA] bg-[#F8FAFC] text-[11px] text-[#101828]"
                placeholder="From"
              />
              <span className="text-[#667085]">&ndash;</span>
              <input
                type="date"
                value={dateToFilter}
                onChange={(e) => setDateToFilter(e.target.value)}
                className="w-1/2 h-9 px-2 rounded-lg border border-[#D9E0EA] bg-[#F8FAFC] text-[11px] text-[#101828]"
                placeholder="To"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Quotes Table */}
      <div className="bg-white rounded-2xl border border-[#D9E0EA] overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#F8FAFC] border-b border-[#D9E0EA] font-semibold text-[#667085]">
              <tr>
                <th className="px-5 py-3.5">Reference</th>
                <th className="px-5 py-3.5">Target Agency</th>
                <th className="px-5 py-3.5">Hotel &amp; Rate Snapshot</th>
                <th className="px-5 py-3.5">Contact Recipients</th>
                <th className="px-5 py-3.5">Shared By</th>
                <th className="px-5 py-3.5">Shared Date &amp; Time</th>
                <th className="px-5 py-3.5">Email Status</th>
                <th className="px-5 py-3.5 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#D9E0EA]">
              {loading ? (
                <tr>
                  <td colSpan={8} className="px-6 py-8 text-center text-[#667085]">
                    Loading shared rate history...
                  </td>
                </tr>
              ) : filteredQuotes.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-6 py-8 text-center text-[#667085]">
                    No quote history matches your filters. Quotes saved via &quot;Share Rates&quot; or &quot;Rate Calculator&quot; appear here as permanent immutable records.
                  </td>
                </tr>
              ) : (
                filteredQuotes.map((q) => {
                  const firstItem = q.quote_items?.[0];
                  return (
                    <tr key={q.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-5 py-3.5 font-bold text-[#1455D9] whitespace-nowrap">
                        {q.quote_reference}
                      </td>
                      <td className="px-5 py-3.5 font-semibold text-[#101828]">
                        {q.agency_name}
                      </td>
                      <td className="px-5 py-3.5">
                        {firstItem ? (
                          <div>
                            <div className="font-bold text-[#101828]">
                              {firstItem.hotel_name_snapshot}
                            </div>
                            <div className="text-[11px] text-[#667085] flex items-center gap-1.5 mt-0.5">
                              <span className={`px-1.5 py-0.2 rounded font-bold text-[10px] ${
                                firstItem.rate_category === 'RED'
                                  ? 'bg-red-100 text-red-800'
                                  : firstItem.rate_category === 'GREEN'
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : firstItem.rate_category === 'YELLOW'
                                  ? 'bg-amber-100 text-amber-800'
                                  : 'bg-purple-100 text-purple-800'
                              }`}>
                                {firstItem.rate_category}
                              </span>
                              <span>${firstItem.quoted_amount} {firstItem.currency}</span>
                              <span>&bull; {firstItem.room_type_snapshot} ({firstItem.meal_plan_snapshot})</span>
                            </div>
                          </div>
                        ) : (
                          <span className="text-slate-400 italic">No line items</span>
                        )}
                      </td>
                      <td className="px-5 py-3.5">
                        <div className="space-y-0.5">
                          {q.quote_recipients && q.quote_recipients.length > 0 ? (
                            <>
                              <div className="font-medium text-[#101828]">
                                {q.quote_recipients[0]?.original_full_name}
                              </div>
                              <div className="text-[11px] text-[#667085]">
                                {q.quote_recipients[0]?.original_email}
                              </div>
                              {q.quote_recipients.length > 1 && (
                                <span className="text-[10px] bg-slate-100 text-slate-600 px-1.5 py-0.2 rounded font-semibold inline-block">
                                  +{q.quote_recipients.length - 1} more recipient(s)
                                </span>
                              )}
                            </>
                          ) : (
                            <span className="text-slate-400 italic">0 recipients</span>
                          )}
                        </div>
                      </td>
                      <td className="px-5 py-3.5 text-[#101828] whitespace-nowrap">
                        {q.sender_name}
                      </td>
                      <td className="px-5 py-3.5 text-[#667085] whitespace-nowrap">
                        <div>{new Date(q.created_at).toLocaleDateString()}</div>
                        <div className="text-[11px] text-slate-400">{new Date(q.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
                      </td>
                      <td className="px-5 py-3.5 whitespace-nowrap">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          q.email_status === 'USER_CONFIRMED_SENT'
                            ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                            : q.email_status === 'SENT'
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : q.email_status === 'OPENED_IN_EMAIL_APP'
                            ? 'bg-blue-50 text-blue-700 border border-blue-200'
                            : q.email_status === 'FAILED'
                            ? 'bg-red-50 text-red-700 border border-red-200'
                            : 'bg-slate-100 text-slate-700 border border-slate-200'
                        }`}>
                          {q.email_status === 'USER_CONFIRMED_SENT'
                            ? 'User Confirmed Sent ✓'
                            : q.email_status === 'OPENED_IN_EMAIL_APP'
                            ? 'Opened in App ↗'
                            : q.email_status}
                        </span>
                      </td>
                      <td className="px-5 py-3.5 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-2">
                          {q.email_status === 'OPENED_IN_EMAIL_APP' || q.email_status === 'NOT_SENT' ? (
                            <button
                              type="button"
                              onClick={() => {
                                // Re-trigger mailto client
                                const toEmails = q.quote_recipients?.map((r) => r.original_email).filter(Boolean) || [];
                                const mailtoUrl = `mailto:${toEmails.join(',')}?subject=${encodeURIComponent(q.email_subject)}&body=${encodeURIComponent(q.email_body_text || '')}`;
                                window.location.href = mailtoUrl;
                              }}
                              className="px-2.5 py-1.5 text-xs text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-lg font-semibold inline-flex items-center gap-1 transition-colors"
                              title="Re-open in device email application"
                            >
                              <Mail className="w-3 h-3" /> Re-open App
                            </button>
                          ) : q.email_status === 'FAILED' ? (
                            <button
                              type="button"
                              onClick={() => handleRetryDispatch(q)}
                              disabled={retryingQuoteId === q.id}
                              className="px-2.5 py-1.5 text-xs text-amber-700 bg-amber-50 hover:bg-amber-100 border border-amber-200 rounded-lg font-semibold inline-flex items-center gap-1 transition-colors disabled:opacity-50"
                              title="Retry Email Dispatch"
                            >
                              <RotateCw className={`w-3 h-3 ${retryingQuoteId === q.id ? 'animate-spin' : ''}`} />
                              {retryingQuoteId === q.id ? 'Retrying...' : 'Retry'}
                            </button>
                          ) : (
                            <span className="text-[11px] text-emerald-700 font-medium inline-flex items-center gap-1 mr-1">
                              <CheckCircle2 className="w-3.5 h-3.5" /> Sent
                            </span>
                          )}
                          <button
                            type="button"
                            onClick={() => setActiveQuoteModal(q)}
                            className="px-3 py-1.5 text-xs text-[#1455D9] bg-[#EAF2FF] hover:bg-blue-100 rounded-lg font-bold inline-flex items-center gap-1.5 transition-colors"
                          >
                            <Eye className="w-3.5 h-3.5" /> View Exact Rates
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Comprehensive Exact Shared Rates Snapshot Modal */}
      {activeQuoteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl border border-[#D9E0EA] shadow-2xl max-w-3xl w-full max-h-[92vh] overflow-hidden flex flex-col">
            {/* Modal Header */}
            <div className="p-5 border-b border-[#D9E0EA] flex items-center justify-between bg-[#F8FAFC]">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-blue-100 text-[#1455D9] rounded-xl">
                  <FileText className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-bold text-base text-[#101828]">
                      Exact Shared Rates Snapshot: {activeQuoteModal.quote_reference}
                    </h3>
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                      Immutable Record
                    </span>
                  </div>
                  <p className="text-xs text-[#667085]">
                    Preserved historical snapshot created on {new Date(activeQuoteModal.created_at).toLocaleString()} by {activeQuoteModal.sender_name}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setActiveQuoteModal(null)}
                className="p-1.5 text-[#667085] hover:text-[#101828] hover:bg-slate-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto space-y-6">
              {/* Recipient & Metadata Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 p-4 bg-slate-50 border border-[#D9E0EA] rounded-xl text-xs">
                <div>
                  <span className="text-[#667085] block text-[11px]">Target Agency</span>
                  <strong className="text-[#101828] text-sm">{activeQuoteModal.agency_name}</strong>
                </div>
                <div>
                  <span className="text-[#667085] block text-[11px]">Recipient Scope</span>
                  <strong className="text-[#101828]">{activeQuoteModal.recipient_scope}</strong>
                </div>
                <div>
                  <span className="text-[#667085] block text-[11px]">Email Dispatch Status</span>
                  <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold mt-0.5 ${
                    activeQuoteModal.email_status === 'USER_CONFIRMED_SENT'
                      ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                      : activeQuoteModal.email_status === 'SENT'
                      ? 'bg-emerald-100 text-emerald-800'
                      : activeQuoteModal.email_status === 'OPENED_IN_EMAIL_APP'
                      ? 'bg-blue-100 text-blue-800 border border-blue-200'
                      : activeQuoteModal.email_status === 'FAILED'
                      ? 'bg-red-100 text-red-800'
                      : 'bg-slate-200 text-slate-800'
                  }`}>
                    {activeQuoteModal.email_status === 'USER_CONFIRMED_SENT'
                      ? 'User Confirmed Sent'
                      : activeQuoteModal.email_status === 'OPENED_IN_EMAIL_APP'
                      ? 'Opened in Device App'
                      : activeQuoteModal.email_status}
                  </span>
                  {activeQuoteModal.confirmed_at && (
                    <span className="block text-[10px] text-slate-500 mt-0.5">
                      Confirmed by {activeQuoteModal.confirmer_name || 'Staff'} on {new Date(activeQuoteModal.confirmed_at).toLocaleDateString()}
                    </span>
                  )}
                </div>
                <div>
                  <span className="text-[#667085] block text-[11px]">Shared By</span>
                  <strong className="text-[#101828]">{activeQuoteModal.sender_name}</strong>
                </div>
              </div>

              {/* Exact Recipients List */}
              <div>
                <h4 className="text-xs font-bold text-[#101828] uppercase tracking-wider mb-2 flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5 text-[#1455D9]" /> Actual Recipients Shared With ({activeQuoteModal.quote_recipients?.length || 0})
                </h4>
                <div className="border border-[#D9E0EA] rounded-xl overflow-hidden">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-[#F8FAFC] font-semibold text-[#667085] border-b border-[#D9E0EA]">
                      <tr>
                        <th className="p-2.5">Contact Person</th>
                        <th className="p-2.5">Email Address</th>
                        <th className="p-2.5">Agency</th>
                        <th className="p-2.5">Market</th>
                        <th className="p-2.5">Delivery Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#D9E0EA]">
                      {activeQuoteModal.quote_recipients && activeQuoteModal.quote_recipients.length > 0 ? (
                        activeQuoteModal.quote_recipients.map((rec: QuoteRecipientSnapshot) => (
                          <tr key={rec.id} className="hover:bg-slate-50/70">
                            <td className="p-2.5 font-bold text-[#101828]">{rec.original_full_name}</td>
                            <td className="p-2.5 text-[#1455D9]">{rec.original_email}</td>
                            <td className="p-2.5 text-[#344054]">{rec.original_agency_name}</td>
                            <td className="p-2.5 text-[#667085]">{rec.original_market_name || 'All Markets'}</td>
                            <td className="p-2.5">
                              <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-100 text-slate-700">
                                {rec.delivery_status}
                              </span>
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={5} className="p-4 text-center text-[#667085]">
                            No recipient snapshots recorded.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Exact Room Types, Occupancy, Meal Plan and Rate Values */}
              <div>
                <h4 className="text-xs font-bold text-[#101828] uppercase tracking-wider mb-2 flex items-center gap-1.5">
                  <Layers className="w-3.5 h-3.5 text-[#1455D9]" /> Exact Quoted Rate Values &amp; Room Specifications
                </h4>
                <div className="border border-[#D9E0EA] rounded-xl overflow-hidden">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-[#F8FAFC] font-semibold text-[#667085] border-b border-[#D9E0EA]">
                      <tr>
                        <th className="p-3">Hotel Property</th>
                        <th className="p-3">Contract Season</th>
                        <th className="p-3">Contract Ref</th>
                        <th className="p-3">Room Type</th>
                        <th className="p-3">Meal Plan</th>
                        <th className="p-3">Rate Category Tier</th>
                        <th className="p-3 text-right">Exact Quoted Rate</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#D9E0EA]">
                      {activeQuoteModal.quote_items && activeQuoteModal.quote_items.length > 0 ? (
                        activeQuoteModal.quote_items.map((item: QuoteItemSnapshot, idx: number) => (
                          <tr key={idx} className="hover:bg-slate-50/70">
                            <td className="p-3 font-bold text-[#101828]">{item.hotel_name_snapshot}</td>
                            <td className="p-3 text-[#344054]">{item.season_label_snapshot}</td>
                            <td className="p-3 text-[#667085] font-mono text-[11px]">
                              {item.contract_reference_snapshot || 'Ad-hoc (No Contract)'}
                            </td>
                            <td className="p-3 text-[#101828] font-medium">{item.room_type_snapshot}</td>
                            <td className="p-3 font-semibold text-[#344054]">{item.meal_plan_snapshot}</td>
                            <td className="p-3">
                              <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                item.rate_category === 'RED'
                                  ? 'bg-red-100 text-red-800'
                                  : item.rate_category === 'GREEN'
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : item.rate_category === 'YELLOW'
                                  ? 'bg-amber-100 text-amber-800'
                                  : 'bg-purple-100 text-purple-800'
                              }`}>
                                {item.rate_category}
                              </span>
                            </td>
                            <td className="p-3 font-extrabold text-[#1455D9] text-right text-sm">
                              {item.currency} {item.quoted_amount.toFixed(2)}
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={7} className="p-4 text-center text-[#667085]">
                            No line item snapshots attached.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Special Conditions, Supplements & Notes */}
              <div className="space-y-3">
                <h4 className="text-xs font-bold text-[#101828] uppercase tracking-wider flex items-center gap-1.5">
                  <AlertTriangle className="w-3.5 h-3.5 text-amber-600" /> Preserved Special Conditions &amp; Notes
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="p-3 bg-slate-50 border border-[#D9E0EA] rounded-xl text-xs space-y-1">
                    <span className="font-bold text-[#344054]">Staff Notes &amp; Clarifications:</span>
                    <p className="text-[#667085] whitespace-pre-wrap">
                      {activeQuoteModal.quote_items?.[0]?.custom_notes || 'No specific notes recorded.'}
                    </p>
                  </div>
                  <div className="p-3 bg-blue-50/60 border border-blue-200 rounded-xl text-xs space-y-1">
                    <span className="font-bold text-blue-900">Historical Snapshot Notice:</span>
                    <p className="text-blue-700">
                      These values reflect the historical record dispatched to the partner. They are permanently immutable and will not change even if live hotel rates or currency exchange configs are modified.
                    </p>
                  </div>
                </div>
              </div>

              {/* Complete Email Subject & Body Dispatched */}
              <div>
                <h4 className="text-xs font-bold text-[#101828] uppercase tracking-wider mb-2 flex items-center gap-1.5">
                  <Mail className="w-3.5 h-3.5 text-[#1455D9]" /> Original Email Dispatched
                </h4>
                <div className="p-3 bg-[#F8FAFC] border border-[#D9E0EA] rounded-t-xl text-xs space-y-1">
                  <div>
                    <strong>Subject:</strong> {activeQuoteModal.email_subject}
                  </div>
                  <div>
                    <strong>To:</strong>{' '}
                    {activeQuoteModal.quote_recipients?.map((r) => r.original_email).join(', ') || 'N/A'}
                  </div>
                </div>
                <div
                  className="p-5 border-x border-b border-[#D9E0EA] rounded-b-xl bg-white text-xs shadow-2xs"
                  dangerouslySetInnerHTML={{ __html: activeQuoteModal.email_body_html }}
                />
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-[#D9E0EA] bg-[#F8FAFC] flex items-center justify-between gap-3">
              <div>
                {retryNotice && retryNotice.id === activeQuoteModal.id && (
                  <span className={`text-xs font-medium ${
                    retryNotice.type === 'success'
                      ? 'text-emerald-700'
                      : retryNotice.type === 'warning'
                      ? 'text-amber-700'
                      : 'text-red-700'
                  }`}>
                    {retryNotice.message}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2">
                {(activeQuoteModal.email_status === 'OPENED_IN_EMAIL_APP' || activeQuoteModal.email_status === 'NOT_SENT') && (
                  <button
                    type="button"
                    onClick={() => {
                      const toEmails = activeQuoteModal.quote_recipients?.map((r) => r.original_email).filter(Boolean) || [];
                      const mailtoUrl = `mailto:${toEmails.join(',')}?subject=${encodeURIComponent(activeQuoteModal.email_subject)}&body=${encodeURIComponent(activeQuoteModal.email_body_text || '')}`;
                      window.location.href = mailtoUrl;
                    }}
                    className="px-4 py-2 text-xs font-semibold rounded-lg border border-blue-300 bg-blue-50 text-blue-800 hover:bg-blue-100 transition-colors flex items-center gap-1.5"
                  >
                    <Mail className="w-3.5 h-3.5 text-blue-600" />
                    Open in Email App
                  </button>
                )}
                {activeQuoteModal.email_status === 'FAILED' && (
                  <button
                    type="button"
                    onClick={() => handleRetryDispatch(activeQuoteModal)}
                    disabled={retryingQuoteId === activeQuoteModal.id}
                    className="px-4 py-2 text-xs font-semibold rounded-lg border border-amber-300 bg-amber-50 text-amber-800 hover:bg-amber-100 transition-colors flex items-center gap-1.5 disabled:opacity-50"
                  >
                    <RotateCw className={`w-3.5 h-3.5 ${retryingQuoteId === activeQuoteModal.id ? 'animate-spin' : ''}`} />
                    {retryingQuoteId === activeQuoteModal.id ? 'Retrying Dispatch...' : 'Retry Email Dispatch'}
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setActiveQuoteModal(null)}
                  className="px-5 py-2 text-xs font-bold rounded-lg bg-[#1455D9] text-white hover:bg-blue-700"
                >
                  Close Snapshot
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
