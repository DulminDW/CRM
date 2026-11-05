import React, { useState, useEffect } from 'react';
import { Search, Eye } from 'lucide-react';
import { quoteService, QuoteRecord, QuoteItemSnapshot } from '../../services/quoteService';

export const QuoteHistoryView: React.FC = () => {
  const [quotes, setQuotes] = useState<QuoteRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeQuoteModal, setActiveQuoteModal] = useState<QuoteRecord | null>(null);

  useEffect(() => {
    quoteService.getQuotes().then((data: QuoteRecord[]) => {
      setQuotes(data);
      setLoading(false);
    });
  }, []);

  const filteredQuotes = quotes.filter((q) => {
    const qStr = searchQuery.toLowerCase();
    return (
      q.quote_reference.toLowerCase().includes(qStr) ||
      q.email_subject.toLowerCase().includes(qStr) ||
      (q.agency_name && q.agency_name.toLowerCase().includes(qStr)) ||
      (q.sender_name && q.sender_name.toLowerCase().includes(qStr))
    );
  });

  return (
    <div className="space-y-4">
      {/* Controls */}
      <div className="flex items-center justify-between gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="w-4 h-4 text-[#667085] absolute left-3 top-3" />
          <input
            type="text"
            placeholder="Search quotes by reference, agency, sender..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full h-10 pl-9 pr-3 rounded-xl border border-[#D9E0EA] bg-white text-xs text-[#101828]"
          />
        </div>
      </div>

      {/* Quotes Table */}
      <div className="bg-white rounded-2xl border border-[#D9E0EA] overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#F8FAFC] border-b border-[#D9E0EA] font-semibold text-[#667085]">
              <tr>
                <th className="px-6 py-3.5">Reference</th>
                <th className="px-6 py-3.5">Target Agency</th>
                <th className="px-6 py-3.5">Subject</th>
                <th className="px-6 py-3.5">Recipients</th>
                <th className="px-6 py-3.5">Sender</th>
                <th className="px-6 py-3.5">Created Date</th>
                <th className="px-6 py-3.5">Email Status</th>
                <th className="px-6 py-3.5 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#D9E0EA]">
              {loading ? (
                <tr>
                  <td colSpan={8} className="px-6 py-8 text-center text-[#667085]">
                    Loading quotes...
                  </td>
                </tr>
              ) : filteredQuotes.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-6 py-8 text-center text-[#667085]">
                    No quote history found. Quotes saved via &quot;Share Rates&quot; will appear here.
                  </td>
                </tr>
              ) : (
                filteredQuotes.map((q) => (
                  <tr key={q.id} className="hover:bg-slate-50">
                    <td className="px-6 py-3.5 font-bold text-[#1455D9]">{q.quote_reference}</td>
                    <td className="px-6 py-3.5 font-medium text-[#101828]">{q.agency_name}</td>
                    <td className="px-6 py-3.5 text-[#667085] truncate max-w-xs">{q.email_subject}</td>
                    <td className="px-6 py-3.5">
                      <span className="px-2 py-0.5 rounded bg-blue-50 text-[10px] font-semibold text-[#1455D9]">
                        {q.recipients_count} frozen recipients
                      </span>
                    </td>
                    <td className="px-6 py-3.5 text-[#101828]">{q.sender_name}</td>
                    <td className="px-6 py-3.5 text-[#667085]">
                      {new Date(q.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-3.5">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                        q.email_status === 'SENT'
                          ? 'bg-emerald-50 text-emerald-700'
                          : q.email_status === 'FAILED'
                          ? 'bg-red-50 text-red-700'
                          : 'bg-slate-100 text-slate-700'
                      }`}>
                        {q.email_status}
                      </span>
                    </td>
                    <td className="px-6 py-3.5 text-right">
                      <button
                        type="button"
                        onClick={() => setActiveQuoteModal(q)}
                        className="px-2.5 py-1 text-xs text-[#1455D9] hover:bg-[#EAF2FF] rounded-lg font-semibold inline-flex items-center gap-1"
                      >
                        <Eye className="w-3.5 h-3.5" /> View Snapshot
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Snapshot Modal */}
      {activeQuoteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl border border-[#D9E0EA] shadow-xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col">
            <div className="p-4 border-b border-[#D9E0EA] flex items-center justify-between bg-[#F8FAFC]">
              <div>
                <h3 className="font-bold text-sm text-[#101828]">
                  Immutable Snapshot: {activeQuoteModal.quote_reference}
                </h3>
                <p className="text-xs text-[#667085]">
                  Preserved from {new Date(activeQuoteModal.created_at).toLocaleString()}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setActiveQuoteModal(null)}
                className="text-[#667085] hover:text-[#101828] text-xs font-bold"
              >
                ✕ Close
              </button>
            </div>

            <div className="p-5 overflow-y-auto space-y-4">
              <div className="p-3 bg-slate-50 border border-[#D9E0EA] rounded-xl text-xs space-y-1">
                <div><strong>Agency:</strong> {activeQuoteModal.agency_name}</div>
                <div><strong>Sender:</strong> {activeQuoteModal.sender_name}</div>
                <div><strong>Subject:</strong> {activeQuoteModal.email_subject}</div>
                <div><strong>Scope:</strong> {activeQuoteModal.recipient_scope}</div>
              </div>

              <div>
                <h4 className="text-xs font-bold text-[#667085] uppercase tracking-wider mb-2">Frozen Line Items</h4>
                <div className="border border-[#D9E0EA] rounded-xl overflow-hidden">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-[#F8FAFC] font-semibold text-[#667085]">
                      <tr>
                        <th className="p-2.5">Hotel Property</th>
                        <th className="p-2.5">Season Period</th>
                        <th className="p-2.5">Tier Category</th>
                        <th className="p-2.5">Quoted Rate</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#D9E0EA]">
                      {activeQuoteModal.quote_items && activeQuoteModal.quote_items.length > 0 ? (
                        activeQuoteModal.quote_items.map((item: QuoteItemSnapshot, idx: number) => (
                          <tr key={idx}>
                            <td className="p-2.5 font-medium">{item.hotel_name_snapshot}</td>
                            <td className="p-2.5 text-[#667085]">{item.season_label_snapshot}</td>
                            <td className="p-2.5 font-bold text-[#1455D9]">{item.rate_category}</td>
                            <td className="p-2.5 font-bold">${item.quoted_amount} {item.currency}</td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={4} className="p-4 text-center text-[#667085]">
                            No separate line item details attached.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              <div>
                <h4 className="text-xs font-bold text-[#667085] uppercase tracking-wider mb-2">Preserved Email Content</h4>
                <div
                  className="p-4 border border-[#D9E0EA] rounded-xl bg-white text-xs"
                  dangerouslySetInnerHTML={{ __html: activeQuoteModal.email_body_html }}
                />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
