import React, { useState, useEffect } from 'react';
import {
  X,
  Hotel,
  Building2,
  Users2,
  Send,
  MessageSquare,
  RefreshCw,
  ExternalLink,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { HotelRecord } from '../../types/hotelHierarchy';
import { salesVisitService } from '../../services/salesVisitService';
import { SalesActivityRecord } from '../../types/salesVisit';

interface HotelDetailsModalProps {
  hotel: HotelRecord | null;
  onClose: () => void;
}

export const HotelDetailsModal: React.FC<HotelDetailsModalProps> = ({ hotel, onClose }) => {
  const [activeTab, setActiveTab] = useState<'OVERVIEW' | 'VISITS' | 'QUOTES'>('VISITS');
  const [visits, setVisits] = useState<SalesActivityRecord[]>([]);
  const [quotes, setQuotes] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  useEffect(() => {
    if (!hotel) return;

    const loadHotelHistory = async () => {
      setIsLoading(true);
      try {
        const [visitsRes, quotesRes] = await Promise.all([
          salesVisitService.fetchVisits({ hotelId: hotel.id }),
          salesVisitService.fetchHotelQuoteHistory(hotel.id),
        ]);
        setVisits(visitsRes.data || []);
        setQuotes(quotesRes.data || []);
      } catch (err) {
        console.error('Error loading hotel history:', err);
      } finally {
        setIsLoading(false);
      }
    };

    loadHotelHistory();
  }, [hotel]);

  if (!hotel) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm overflow-y-auto animate-fade-in">
      <div className="bg-white w-full max-w-3xl rounded-2xl border border-slate-200 shadow-2xl overflow-hidden my-6 flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="px-6 py-4 bg-gradient-to-r from-slate-900 to-navy-900 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-purple-500/20 border border-purple-400/30 flex items-center justify-center text-purple-300">
              <Hotel className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold">{hotel.hotel_name}</h2>
                {hotel.hotel_code && (
                  <span className="px-2 py-0.5 rounded bg-white/10 text-slate-200 font-mono text-[10px]">
                    {hotel.hotel_code}
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-300">
                Partner Property Window · Discussions, Agency Visits &amp; Quoted Rate History
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="flex items-center border-b border-slate-200 bg-slate-50 px-6 gap-2 shrink-0">
          <button
            onClick={() => setActiveTab('VISITS')}
            className={`py-3 px-3 text-xs font-bold border-b-2 transition-all flex items-center gap-1.5 ${
              activeTab === 'VISITS'
                ? 'border-[#1455D9] text-[#1455D9]'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <MessageSquare className="w-3.5 h-3.5" />
            <span>Discussions &amp; Visits ({visits.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('QUOTES')}
            className={`py-3 px-3 text-xs font-bold border-b-2 transition-all flex items-center gap-1.5 ${
              activeTab === 'QUOTES'
                ? 'border-[#1455D9] text-[#1455D9]'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <Send className="w-3.5 h-3.5" />
            <span>Rates Shared History ({quotes.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('OVERVIEW')}
            className={`py-3 px-3 text-xs font-bold border-b-2 transition-all flex items-center gap-1.5 ${
              activeTab === 'OVERVIEW'
                ? 'border-[#1455D9] text-[#1455D9]'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <Hotel className="w-3.5 h-3.5" />
            <span>Property Overview</span>
          </button>
        </div>

        {/* Modal Content Body */}
        <div className="p-6 overflow-y-auto flex-1 space-y-4">
          {isLoading ? (
            <div className="py-16 text-center text-slate-500">
              <RefreshCw className="w-6 h-6 text-[#1455D9] animate-spin mx-auto mb-2" />
              <p className="text-xs font-medium">Loading hotel history logs...</p>
            </div>
          ) : activeTab === 'VISITS' ? (
            /* Tab 1: Agency Visits & Discussions */
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                    Agency Discussions
                  </h3>
                </div>
              </div>

              {visits.length === 0 ? (
                <div className="py-12 text-center text-slate-400 border border-dashed border-slate-200 rounded-xl">
                  <MessageSquare className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                  <p className="text-xs font-medium text-slate-600">
                    No discussions or visits logged yet.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {visits.map((v) => (
                    <div
                      key={v.id}
                      className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 hover:bg-white hover:shadow-xs transition-all space-y-2"
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-2">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-xs text-slate-900">{v.activity_date}</span>
                          <span className="text-[11px] text-slate-400">•</span>
                          <div className="inline-flex items-center gap-1 text-xs font-semibold text-[#1455D9]">
                            <Users2 className="w-3.5 h-3.5" />
                            <span>Staff: {v.staff_name || 'Staff Member'}</span>
                          </div>
                        </div>
                        <span className="inline-block px-2 py-0.5 rounded text-[10px] font-bold bg-blue-50 text-[#1455D9] border border-blue-200">
                          {v.activity_type}
                        </span>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                        <div>
                          <span className="text-slate-400 block text-[10px] uppercase font-bold">
                            Travel Agency Visited:
                          </span>
                          <div className="font-bold text-slate-800 flex items-center gap-1.5 mt-0.5">
                            <Building2 className="w-3.5 h-3.5 text-slate-500" />
                            <span>{v.agency_name}</span>
                          </div>
                          {v.market_name && (
                            <span className="text-[11px] text-slate-500 block ml-5">
                              Market Desk: {v.market_name}
                            </span>
                          )}
                        </div>

                        <div>
                          <span className="text-slate-400 block text-[10px] uppercase font-bold">
                            Contact Person (Agent):
                          </span>
                          <div className="font-semibold text-slate-800 mt-0.5">
                            {v.member_name ? (
                              <>
                                <span>{v.member_name}</span>
                                {v.member_phone && (
                                  <span className="text-emerald-700 text-[11px] block">
                                    📞 {v.member_phone}
                                  </span>
                                )}
                              </>
                            ) : (
                              <span className="text-slate-400 italic">General Staff</span>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="bg-white p-3 rounded-xl border border-slate-200 text-xs text-slate-700 whitespace-pre-wrap leading-relaxed">
                        <span className="font-bold text-slate-800 block mb-1 text-[11px]">
                          Discussion Points &amp; Feedback:
                        </span>
                        {v.notes}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : activeTab === 'QUOTES' ? (
            /* Tab 2: Rate Sharing & Quote History */
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                    Rates Dispatched For {hotel.hotel_name}
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Audit log of quotes sent to travel agencies, including rate category and sending staff
                  </p>
                </div>
              </div>

              {quotes.length === 0 ? (
                <div className="py-12 text-center text-slate-400 border border-dashed border-slate-200 rounded-xl">
                  <Send className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                  <p className="text-xs font-medium text-slate-600">
                    No rate quotes have been shared for this hotel yet.
                  </p>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    Quotes sent via "Share Rates" will automatically track here.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {quotes.map((item) => {
                    const q = item.quote;
                    const tierColors: Record<string, string> = {
                      RED: 'bg-red-50 text-red-700 border-red-200',
                      GREEN: 'bg-emerald-50 text-emerald-700 border-emerald-200',
                      YELLOW: 'bg-amber-50 text-amber-700 border-amber-200',
                      HOTEL_CONTRACT: 'bg-purple-50 text-purple-700 border-purple-200',
                      CUSTOM: 'bg-blue-50 text-blue-700 border-blue-200',
                    };

                    return (
                      <div
                        key={item.id}
                        className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 hover:bg-white hover:shadow-xs transition-all space-y-2 text-xs"
                      >
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-2">
                          <div className="flex items-center gap-2">
                            <span className="font-mono font-bold text-slate-900">
                              {q?.quote_reference || 'QUOTE-REF'}
                            </span>
                            <span className="text-[11px] text-slate-400">•</span>
                            <span className="text-slate-500">
                              {new Date(item.created_at).toLocaleDateString()}
                            </span>
                          </div>
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
                              tierColors[item.rate_tier] || 'bg-slate-100 text-slate-700'
                            }`}
                          >
                            Tier: {item.rate_tier}
                          </span>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                          <div>
                            <span className="text-slate-400 block text-[10px] uppercase font-bold">
                              Dispatched By (Staff):
                            </span>
                            <span className="font-bold text-slate-800">
                              {q?.sender?.full_name || 'Staff Member'}
                            </span>
                          </div>

                          <div>
                            <span className="text-slate-400 block text-[10px] uppercase font-bold">
                              Travel Agency:
                            </span>
                            <span className="font-semibold text-slate-800">
                              {q?.agency?.name || 'Travel Agency'}
                            </span>
                          </div>

                          <div>
                            <span className="text-slate-400 block text-[10px] uppercase font-bold">
                              Season:
                            </span>
                            <span className="font-semibold text-slate-800">
                              {item.season_name_snapshot || 'Contract Season'}
                            </span>
                          </div>
                        </div>

                        {q?.recipients && q.recipients.length > 0 && (
                          <div className="pt-1">
                            <span className="text-slate-400 text-[10px] uppercase font-bold block mb-1">
                              Recipient Agents:
                            </span>
                            <div className="flex flex-wrap gap-1.5">
                              {q.recipients.map((rec: any, idx: number) => (
                                <span
                                  key={idx}
                                  className="inline-flex items-center gap-1 px-2 py-0.5 bg-slate-100 text-slate-700 rounded text-[11px]"
                                >
                                  <span>{rec.original_full_name}</span>
                                  <span className="text-slate-400 font-mono text-[10px]">
                                    ({rec.original_email})
                                  </span>
                                </span>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          ) : (
            /* Tab 3: Overview */
            <div className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200">
                  <span className="text-slate-500 block font-medium">Hotel Code</span>
                  <span className="font-bold text-slate-900 font-mono text-sm mt-0.5 block">
                    {hotel.hotel_code || 'Not Specified'}
                  </span>
                </div>

                <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200">
                  <span className="text-slate-500 block font-medium">Area / Region</span>
                  <span className="font-bold text-slate-900 text-sm mt-0.5 block">
                    {hotel.area || 'Not Specified'}
                  </span>
                </div>

                <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200">
                  <span className="text-slate-500 block font-medium">Distribution Channel</span>
                  <span className="font-bold text-[#1455D9] text-sm mt-0.5 block">
                    {hotel.service_type}
                  </span>
                </div>

                <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200">
                  <span className="text-slate-500 block font-medium">Status</span>
                  <span className="font-bold text-emerald-700 text-sm mt-0.5 block">
                    {hotel.status}
                  </span>
                </div>
              </div>

              <div className="p-4 rounded-xl bg-blue-50 border border-blue-200 flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold text-slate-900 block">
                    Seasonal Validity Periods
                  </span>
                  <span className="text-xs text-slate-600">
                    {hotel.season_count || 0} configured seasons attached to this hotel
                  </span>
                </div>
                <Link
                  to={`/seasons?hotelId=${hotel.id}`}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-white bg-[#1455D9] hover:bg-[#1044B2] transition-colors"
                >
                  <span>Manage Seasons</span>
                  <ExternalLink className="w-3 h-3" />
                </Link>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-3 bg-slate-50 border-t border-slate-200 flex items-center justify-between shrink-0">
          <span className="text-[11px] text-slate-400 font-mono">
            Hotel ID: {hotel.id.slice(0, 8)}...
          </span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 text-xs font-semibold text-slate-700 bg-white border border-slate-200 hover:bg-slate-100 rounded-xl transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
