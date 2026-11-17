import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  History,
  Search,
  Filter,
  Eye,
  Mail,
  CheckCircle2,
  Copy,
  ExternalLink,
  X,
  Send,
  User
} from 'lucide-react';
import { isSupabaseConfigured } from '../lib/supabase';
import { quoteService, QuoteRecord } from '../services/quoteService';

export const SalesActivitiesPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const queryMemberId = searchParams.get('memberId');
  const queryAgencyId = searchParams.get('agencyId');

  const [quotes, setQuotes] = useState<QuoteRecord[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [senderFilter, setSenderFilter] = useState<string>('ALL');
  const [selectedQuote, setSelectedQuote] = useState<QuoteRecord | null>(null);
  const [copiedType, setCopiedType] = useState<string | null>(null);

  // Load Quotes History
  const loadQuotes = useCallback(async () => {
    if (!isSupabaseConfigured) return;
    setLoading(true);
    try {
      const data = await quoteService.getQuotes();
      setQuotes(data);
    } catch (err) {
      console.error('Error fetching quote history:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadQuotes();
  }, [loadQuotes]);

  // Unique senders for dropdown filter
  const uniqueSenders = useMemo(() => {
    const map = new Map<string, string>();
    quotes.forEach((q) => {
      if (q.sender_id && q.sender_name) {
        map.set(q.sender_id, q.sender_name);
      }
    });
    return Array.from(map.entries()).map(([id, name]) => ({ id, name }));
  }, [quotes]);

  // Filter Quotes with Deep Member Name Search & URL parameters
  const filteredQuotes = useMemo(() => {
    return quotes.filter((q) => {
      // 1. URL Filter by memberId
      if (queryMemberId) {
        const hasMember = q.quote_recipients?.some(
          (r) => r.original_member_id === queryMemberId
        );
        if (!hasMember) return false;
      }

      // 2. URL Filter by agencyId
      if (queryAgencyId && q.agency_id !== queryAgencyId) {
        return false;
      }

      // 3. Sender Filter (Admin monitoring)
      if (senderFilter !== 'ALL' && q.sender_id !== senderFilter) {
        return false;
      }

      // 4. Status Filter
      if (statusFilter !== 'ALL' && q.email_status !== statusFilter) {
        return false;
      }

      // 5. Text Search (Matches Member names, emails, sender, agency, hotel, quote ref)
      const query = searchQuery.toLowerCase().trim();
      if (!query) return true;

      const matchesRef = q.quote_reference.toLowerCase().includes(query);
      const matchesAgency = Boolean(q.agency_name && q.agency_name.toLowerCase().includes(query));
      const matchesSubject = Boolean(q.email_subject && q.email_subject.toLowerCase().includes(query));
      const matchesSender = Boolean(q.sender_name && q.sender_name.toLowerCase().includes(query));

      // Match against all recipients' names and emails
      const matchesRecipient = q.quote_recipients?.some((r) =>
        r.original_full_name.toLowerCase().includes(query) ||
        r.original_email.toLowerCase().includes(query)
      );

      // Match against hotel names in the quote
      const matchesHotel = q.quote_items?.some((it) =>
        it.hotel_name_snapshot.toLowerCase().includes(query)
      );

      return matchesRef || matchesAgency || matchesSubject || matchesSender || matchesRecipient || matchesHotel;
    });
  }, [quotes, searchQuery, statusFilter, senderFilter, queryMemberId, queryAgencyId]);

  const handleCopy = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopiedType(label);
    setTimeout(() => setCopiedType(null), 2500);
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#EAF2FF] flex items-center justify-center text-[#1455D9]">
              <History className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-bold tracking-tight text-[#101828]">
                  Rate Sharing History &amp; Dispatch Audit
                </h1>
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-50 text-[#1455D9] border border-blue-200">
                  {quotes.length} Total Dispatches
                </span>
              </div>
              <p className="text-xs text-[#667085] mt-0.5">
                Full transparent audit trail — Track <strong>who sent what rates, to which agent/member</strong>, exact prices, and email status.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <a
            href="/share-rates"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold text-white bg-[#1455D9] hover:bg-[#1044B2] shadow-sm transition-all"
          >
            <Send className="w-3.5 h-3.5" />
            <span>Create New Rate Share</span>
          </a>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-[#D9E0EA] shadow-xs flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        {/* Universal Search Input */}
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-[#667085] absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search by Agent / Member Name, Sender Employee, Agency, Hotel, Quote Ref..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-[#D9E0EA] rounded-xl text-xs text-[#101828] focus:outline-none focus:ring-2 focus:ring-[#1455D9]/20 focus:border-[#1455D9]"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {/* Sender Filter (Admin Visibility) */}
          <div className="flex items-center gap-1.5">
            <User className="w-3.5 h-3.5 text-[#667085]" />
            <select
              value={senderFilter}
              onChange={(e) => setSenderFilter(e.target.value)}
              className="px-3 py-2 bg-slate-50 border border-[#D9E0EA] rounded-xl text-xs font-bold text-[#101828] focus:outline-none"
            >
              <option value="ALL">All Senders (Staff)</option>
              {uniqueSenders.map((s) => (
                <option key={s.id} value={s.id}>
                  Sent by: {s.name}
                </option>
              ))}
            </select>
          </div>

          {/* Status Filter */}
          <div className="flex items-center gap-1.5">
            <Filter className="w-3.5 h-3.5 text-[#667085]" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-2 bg-slate-50 border border-[#D9E0EA] rounded-xl text-xs font-bold text-[#101828] focus:outline-none"
            >
              <option value="ALL">All Statuses</option>
              <option value="USER_CONFIRMED_SENT">User Confirmed Sent</option>
              <option value="OPENED_IN_EMAIL_APP">Opened in Email App</option>
              <option value="NOT_SENT">Draft / Not Sent</option>
            </select>
          </div>
        </div>
      </div>

      {/* URL Filter Notification Pill */}
      {(queryMemberId || queryAgencyId) && (
        <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl flex items-center justify-between text-xs text-blue-900">
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-[#1455D9]" />
            <span>
              Showing rate dispatch history filtered for target {queryMemberId ? 'contact member' : 'agency'}.
            </span>
          </div>
          <a href="/sales-activities" className="font-bold underline hover:text-[#1044B2]">
            Clear Filter
          </a>
        </div>
      )}

      {/* Quotes History Table */}
      <div className="bg-white rounded-2xl border border-[#D9E0EA] shadow-xs overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-xs text-[#667085]">
            Loading rate sharing history...
          </div>
        ) : filteredQuotes.length === 0 ? (
          <div className="p-12 text-center space-y-3">
            <div className="w-12 h-12 rounded-full bg-slate-100 text-[#667085] mx-auto flex items-center justify-center">
              <History className="w-6 h-6" />
            </div>
            <h3 className="text-sm font-bold text-[#101828]">No Rate Sharing Records Found</h3>
            <p className="text-xs text-[#667085] max-w-sm mx-auto">
              No matching dispatches found for the selected search terms or filters.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[750px] text-left text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-[#D9E0EA] text-[10px] font-bold uppercase tracking-wider text-[#667085]">
                  <th className="p-4 min-w-[110px]">Quote Ref</th>
                  <th className="p-4 min-w-[130px]">Shared By (Sender)</th>
                  <th className="p-4 min-w-[150px]">Travel Agency</th>
                  <th className="p-4 min-w-[160px]">Recipient Member(s)</th>
                  <th className="p-4 min-w-[160px]">Hotel(s) &amp; Rates</th>
                  <th className="p-4 min-w-[120px]">Status</th>
                  <th className="p-4 min-w-[120px]">Date Shared</th>
                  <th className="p-4 text-right min-w-[100px]">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F0F2F5]">
                {filteredQuotes.map((q) => {
                  const itemsCount = q.quote_items?.length || 0;
                  const recipients = q.quote_recipients || [];
                  const dateStr = new Date(q.created_at).toLocaleDateString('en-GB', {
                    day: 'numeric',
                    month: 'short',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                  });

                  return (
                    <tr key={q.id} className="hover:bg-slate-50/70 transition-colors">
                      {/* Quote Ref */}
                      <td className="p-4 font-mono font-bold text-[#1455D9] whitespace-nowrap">
                        #{q.quote_reference}
                      </td>

                      {/* Sender (Who sent it) */}
                      <td className="p-4 whitespace-nowrap">
                        <div className="font-bold text-[#101828] flex items-center gap-1.5">
                          <User className="w-3.5 h-3.5 text-[#1455D9]" />
                          <span>{q.sender_name || 'Staff User'}</span>
                        </div>
                        <div className="text-[10px] text-[#667085]">Employee / Staff</div>
                      </td>

                      {/* Travel Agency */}
                      <td className="p-4">
                        <div className="font-bold text-[#101828]">{q.agency_name || 'Agency'}</div>
                        <div className="text-[11px] text-[#667085] line-clamp-1">{q.email_subject}</div>
                      </td>

                      {/* Recipients (To whom it was sent) */}
                      <td className="p-4">
                        <div className="space-y-1">
                          <div className="font-bold text-[#101828]">
                            {recipients.length > 0
                              ? recipients.map((r) => r.original_full_name).join(', ')
                              : 'No recipients'}
                          </div>
                          <div className="text-[10px] text-[#667085] truncate max-w-xs">
                            {recipients.map((r) => r.original_email).join(', ')}
                          </div>
                        </div>
                      </td>

                      {/* Hotels & Rates */}
                      <td className="p-4">
                        <div className="flex flex-wrap gap-1 max-w-xs">
                          {q.quote_items?.map((it, itIdx) => (
                            <span
                              key={itIdx}
                              className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                                it.rate_category === 'GREEN'
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : it.rate_category === 'YELLOW'
                                  ? 'bg-amber-100 text-amber-800'
                                  : it.rate_category === 'RED'
                                  ? 'bg-red-100 text-red-800'
                                  : 'bg-purple-100 text-purple-800'
                              }`}
                            >
                              {it.hotel_name_snapshot} ({it.rate_category}) - {it.currency} {it.quoted_amount}
                            </span>
                          ))}
                          {itemsCount === 0 && <span className="text-[#667085]">—</span>}
                        </div>
                      </td>

                      {/* Status */}
                      <td className="p-4 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                            q.email_status === 'USER_CONFIRMED_SENT'
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : q.email_status === 'OPENED_IN_EMAIL_APP'
                              ? 'bg-blue-50 text-blue-700 border border-blue-200'
                              : 'bg-slate-100 text-slate-700 border border-slate-200'
                          }`}
                        >
                          {q.email_status === 'USER_CONFIRMED_SENT' && <CheckCircle2 className="w-3 h-3" />}
                          {q.email_status === 'OPENED_IN_EMAIL_APP' && <ExternalLink className="w-3 h-3" />}
                          <span>{q.email_status.replace(/_/g, ' ')}</span>
                        </span>
                      </td>

                      {/* Timestamp */}
                      <td className="p-4 text-[#667085] font-medium whitespace-nowrap">
                        {dateStr}
                      </td>

                      {/* Actions */}
                      <td className="p-4 text-right whitespace-nowrap">
                        <button
                          type="button"
                          onClick={() => setSelectedQuote(q)}
                          className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold text-[#1455D9] bg-blue-50 hover:bg-blue-100 transition-all"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>View Details</span>
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Quote Details Modal */}
      {selectedQuote && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-[#D9E0EA] shadow-xl w-full max-w-3xl max-h-[90vh] overflow-y-auto space-y-5 p-6">
            <div className="flex items-center justify-between pb-3 border-b border-[#F0F2F5]">
              <div>
                <span className="text-[10px] font-bold font-mono text-[#1455D9] bg-blue-50 px-2 py-0.5 rounded">
                  #{selectedQuote.quote_reference}
                </span>
                <h3 className="text-base font-bold text-[#101828] mt-1">
                  Rate Quotation for {selectedQuote.agency_name}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setSelectedQuote(null)}
                className="p-1.5 text-[#667085] hover:bg-slate-100 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Audit Details: Who sent it & When */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-3 bg-slate-50 rounded-xl border border-[#D9E0EA] text-xs">
              <div>
                <span className="text-[10px] text-[#667085] uppercase font-bold block">Sent By (Staff)</span>
                <span className="font-bold text-[#101828] mt-0.5 block">{selectedQuote.sender_name || 'Staff User'}</span>
              </div>
              <div>
                <span className="text-[10px] text-[#667085] uppercase font-bold block">Status</span>
                <span className="font-bold text-emerald-700 mt-0.5 block">{selectedQuote.email_status}</span>
              </div>
              <div>
                <span className="text-[10px] text-[#667085] uppercase font-bold block">Target Agency</span>
                <span className="font-bold text-[#101828] mt-0.5 block">{selectedQuote.agency_name}</span>
              </div>
              <div>
                <span className="text-[10px] text-[#667085] uppercase font-bold block">Date &amp; Time</span>
                <span className="font-medium text-[#101828] mt-0.5 block">
                  {new Date(selectedQuote.created_at).toLocaleString()}
                </span>
              </div>
            </div>

            {/* Recipient Details (To whom it was sent) */}
            <div className="space-y-2">
              <h4 className="text-xs font-bold uppercase tracking-wider text-[#667085]">
                Target Member Recipients ({selectedQuote.quote_recipients?.length || 0})
              </h4>
              <div className="flex flex-wrap gap-2">
                {selectedQuote.quote_recipients?.map((r, rIdx) => (
                  <div
                    key={rIdx}
                    className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs flex items-center gap-2"
                  >
                    <Mail className="w-3.5 h-3.5 text-[#1455D9]" />
                    <span className="font-bold text-[#101828]">{r.original_full_name}</span>
                    <span className="text-[#667085]">({r.original_email})</span>
                    {r.original_market_name && (
                      <span className="text-[10px] bg-blue-100 text-blue-800 px-1.5 py-0.2 rounded font-semibold">
                        {r.original_market_name}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Included Hotels & Exact Rates */}
            <div className="space-y-2">
              <h4 className="text-xs font-bold uppercase tracking-wider text-[#667085]">
                Quoted Hotel Rates ({selectedQuote.quote_items?.length || 0})
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {selectedQuote.quote_items?.map((it, iIdx) => (
                  <div key={iIdx} className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-xs text-[#101828]">{it.hotel_name_snapshot}</span>
                      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-blue-100 text-blue-800">
                        {it.rate_category}
                      </span>
                    </div>
                    <p className="text-[11px] text-[#667085]">Season: {it.season_label_snapshot}</p>
                    <p className="text-xs font-bold text-[#1455D9]">
                      Double Room HB: {it.currency} {it.quoted_amount}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            {/* Original Sent Email Body */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold uppercase tracking-wider text-[#667085]">
                  Original Sent Email Content
                </h4>
                <button
                  type="button"
                  onClick={() => handleCopy(selectedQuote.email_body_text || '', 'MODAL_BODY')}
                  className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#1455D9] hover:underline"
                >
                  {copiedType === 'MODAL_BODY' ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedType === 'MODAL_BODY' ? 'Copied' : 'Copy Email'}</span>
                </button>
              </div>
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono whitespace-pre-wrap max-h-64 overflow-y-auto text-slate-800">
                {selectedQuote.email_body_text || 'No text content recorded.'}
              </div>
            </div>

            <div className="pt-3 border-t border-[#F0F2F5] flex justify-end">
              <button
                type="button"
                onClick={() => setSelectedQuote(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-[#101828] rounded-xl text-xs font-semibold"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
