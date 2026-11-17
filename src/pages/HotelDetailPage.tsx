import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import {
  Hotel,
  ArrowLeft,
  Building2,
  Users2,
  Send,
  MessageSquare,
  RefreshCw,
  ExternalLink,
  MapPin,
  CalendarDays,
  Sliders,
  Plus,
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { HotelRecord } from '../types/hotelHierarchy';
import { salesVisitService } from '../services/salesVisitService';
import { SalesActivityRecord } from '../types/salesVisit';
import { LogVisitModal } from '../components/visits/LogVisitModal';

export const HotelDetailPage: React.FC = () => {
  const { hotelId } = useParams<{ hotelId: string }>();
  const navigate = useNavigate();

  const [hotel, setHotel] = useState<HotelRecord | null>(null);
  const [activeTab, setActiveTab] = useState<'VISITS' | 'QUOTES' | 'SEASONS' | 'OVERVIEW'>('VISITS');
  const [visits, setVisits] = useState<SalesActivityRecord[]>([]);
  const [quotes, setQuotes] = useState<any[]>([]);
  const [seasons, setSeasons] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isLogModalOpen, setIsLogModalOpen] = useState<boolean>(false);

  // Load hotel and histories
  useEffect(() => {
    if (!hotelId) return;

    const loadAllHotelData = async () => {
      setIsLoading(true);
      try {
        const [hotelRes, visitsRes, quotesRes, seasonsRes] = await Promise.all([
          supabase.from('hotels').select('*').eq('id', hotelId).single(),
          salesVisitService.fetchVisits({ hotelId }),
          salesVisitService.fetchHotelQuoteHistory(hotelId),
          supabase.from('hotel_seasons').select('*').eq('hotel_id', hotelId).order('start_date', { ascending: true }),
        ]);

        if (hotelRes.data) {
          setHotel(hotelRes.data as HotelRecord);
        }
        setVisits(visitsRes.data || []);
        setQuotes(quotesRes.data || []);
        setSeasons(seasonsRes.data || []);
      } catch (err) {
        console.error('Error loading hotel data:', err);
      } finally {
        setIsLoading(false);
      }
    };

    loadAllHotelData();
  }, [hotelId]);

  if (isLoading) {
    return (
      <div className="py-20 text-center text-slate-500">
        <RefreshCw className="w-8 h-8 text-[#1455D9] animate-spin mx-auto mb-3" />
        <p className="text-sm font-semibold">Loading hotel window profile &amp; activity history...</p>
      </div>
    );
  }

  if (!hotel) {
    return (
      <div className="py-16 text-center text-slate-500 space-y-3">
        <Hotel className="w-12 h-12 text-slate-300 mx-auto" />
        <h3 className="text-base font-bold text-slate-800">Hotel Not Found</h3>
        <p className="text-xs text-slate-400">The requested hotel property does not exist or was removed.</p>
        <Link
          to="/hotels"
          className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#1455D9] text-white text-xs font-bold rounded-xl"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Hotels List</span>
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Top Breadcrumb & Actions Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/hotels')}
            className="p-2 text-slate-500 hover:text-slate-900 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors shadow-2xs"
            title="Back to Hotels"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold tracking-tight text-slate-900">{hotel.hotel_name}</h1>
              {hotel.hotel_code && (
                <span className="px-2 py-0.5 rounded-md bg-blue-50 text-[#1455D9] border border-blue-200 font-mono text-xs font-bold">
                  {hotel.hotel_code}
                </span>
              )}
              <span
                className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                  hotel.status === 'ACTIVE'
                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                    : 'bg-slate-100 text-slate-600 border-slate-200'
                }`}
              >
                {hotel.status}
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5 flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5 text-[#1455D9]" />
              <span>{hotel.area || 'Location Not Specified'}</span>
              <span>•</span>
              <span>Channel: {hotel.service_type}</span>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={() => setIsLogModalOpen(true)}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold text-white bg-[#1455D9] hover:bg-[#1044B2] shadow-sm transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>+ Log Discussion on this Hotel</span>
          </button>

          <Link
            to={`/rates?hotelId=${hotel.id}`}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 shadow-2xs transition-colors"
          >
            <Sliders className="w-3.5 h-3.5 text-[#1455D9]" />
            <span>Manage 4 Rates</span>
          </Link>
        </div>
      </div>

      {/* KPI Overview Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
          <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">
            Agency Pitches
          </span>
          <div className="text-2xl font-black text-slate-900 mt-1">{visits.length}</div>
          <span className="text-[10px] text-slate-400">Total discussion sessions</span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
          <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">
            Rate Quotes Sent
          </span>
          <div className="text-2xl font-black text-emerald-700 mt-1">{quotes.length}</div>
          <span className="text-[10px] text-slate-400">Shared to travel agencies</span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
          <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">
            Seasons Configured
          </span>
          <div className="text-2xl font-black text-purple-700 mt-1">{seasons.length}</div>
          <span className="text-[10px] text-slate-400">Active seasonal periods</span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
          <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">
            Service Distribution
          </span>
          <div className="text-2xl font-black text-[#1455D9] mt-1">{hotel.service_type}</div>
          <span className="text-[10px] text-slate-400">Online &amp; offline agents</span>
        </div>
      </div>

      {/* Main Tabs Container */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        {/* Navigation Tabs Bar */}
        <div className="flex items-center border-b border-slate-200 bg-slate-50/70 px-6 gap-2">
          <button
            onClick={() => setActiveTab('VISITS')}
            className={`py-3.5 px-4 text-xs font-bold border-b-2 transition-all flex items-center gap-2 ${
              activeTab === 'VISITS'
                ? 'border-[#1455D9] text-[#1455D9] bg-white'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <MessageSquare className="w-4 h-4" />
            <span>Discussions &amp; Agency Visits ({visits.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('QUOTES')}
            className={`py-3.5 px-4 text-xs font-bold border-b-2 transition-all flex items-center gap-2 ${
              activeTab === 'QUOTES'
                ? 'border-[#1455D9] text-[#1455D9] bg-white'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <Send className="w-4 h-4" />
            <span>Rates Shared History ({quotes.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('SEASONS')}
            className={`py-3.5 px-4 text-xs font-bold border-b-2 transition-all flex items-center gap-2 ${
              activeTab === 'SEASONS'
                ? 'border-[#1455D9] text-[#1455D9] bg-white'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <CalendarDays className="w-4 h-4" />
            <span>Seasonal Validity ({seasons.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('OVERVIEW')}
            className={`py-3.5 px-4 text-xs font-bold border-b-2 transition-all flex items-center gap-2 ${
              activeTab === 'OVERVIEW'
                ? 'border-[#1455D9] text-[#1455D9] bg-white'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <Hotel className="w-4 h-4" />
            <span>Property Info</span>
          </button>
        </div>

        {/* Tab 1: Agency Visits & Discussions */}
        {activeTab === 'VISITS' && (
          <div className="p-6 space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <div>
                <h3 className="text-sm font-bold text-slate-900">
                  Agency Visits &amp; Discussions
                </h3>
              </div>

              <button
                onClick={() => setIsLogModalOpen(true)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-white bg-[#1455D9]"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Log New Visit</span>
              </button>
            </div>

            {visits.length === 0 ? (
              <div className="py-16 text-center text-slate-400 border border-dashed border-slate-200 rounded-2xl">
                <MessageSquare className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                <h4 className="text-sm font-bold text-slate-700">No visits logged for this hotel yet</h4>
                <button
                  onClick={() => setIsLogModalOpen(true)}
                  className="mt-3.5 inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold text-white bg-[#1455D9]"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Log First Discussion</span>
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                {visits.map((v) => (
                  <div
                    key={v.id}
                    className="p-5 rounded-2xl border border-slate-200 bg-slate-50/40 hover:bg-white hover:shadow-xs transition-all space-y-3"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
                      <div className="flex items-center gap-3">
                        <span className="font-extrabold text-sm text-slate-900">{v.activity_date}</span>
                        <span className="text-slate-300">•</span>
                        <div className="inline-flex items-center gap-1.5 text-xs font-bold text-[#1455D9] bg-blue-50 px-2.5 py-0.5 rounded-lg border border-blue-200">
                          <Users2 className="w-3.5 h-3.5" />
                          <span>Staff: {v.staff_name || 'Staff Member'}</span>
                        </div>
                      </div>
                      <span className="inline-block px-2.5 py-1 rounded-md text-[11px] font-bold bg-slate-100 text-slate-700 border border-slate-200">
                        Type: {v.activity_type}
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                      <div>
                        <span className="text-slate-400 block text-[10px] uppercase font-bold tracking-wider">
                          Travel Agency Visited:
                        </span>
                        <div className="font-bold text-slate-900 text-sm flex items-center gap-1.5 mt-0.5">
                          <Building2 className="w-4 h-4 text-slate-500 shrink-0" />
                          <span>{v.agency_name}</span>
                        </div>
                        {v.market_name && (
                          <span className="text-slate-500 text-xs block ml-5">
                            Market Desk: {v.market_name}
                          </span>
                        )}
                      </div>

                      <div>
                        <span className="text-slate-400 block text-[10px] uppercase font-bold tracking-wider">
                          Contact Person (Agent):
                        </span>
                        <div className="font-semibold text-slate-800 mt-0.5">
                          {v.member_name ? (
                            <>
                              <span className="text-sm font-bold text-slate-900 block">{v.member_name}</span>
                              {v.member_email && (
                                <span className="text-slate-400 font-mono text-xs block mt-0.5">
                                  ✉️ {v.member_email}
                                </span>
                              )}
                              {v.member_phone && (
                                <span className="text-emerald-700 font-medium text-xs block mt-0.5">
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

                    <div className="bg-white p-4 rounded-xl border border-slate-200 text-xs text-slate-800 whitespace-pre-wrap leading-relaxed">
                      <span className="font-bold text-slate-900 block mb-1 text-xs">
                        Discussion Points &amp; Agent Feedback:
                      </span>
                      {v.notes}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Tab 2: Rates Shared History */}
        {activeTab === 'QUOTES' && (
          <div className="p-6 space-y-4">
            <div className="pb-2 border-b border-slate-100">
              <h3 className="text-sm font-bold text-slate-900">
                Rate Sharing History
              </h3>
            </div>

            {quotes.length === 0 ? (
              <div className="py-16 text-center text-slate-400 border border-dashed border-slate-200 rounded-2xl">
                <Send className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                <h4 className="text-sm font-bold text-slate-700">No rates shared yet</h4>
                <Link
                  to="/share-rates"
                  className="mt-3.5 inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold text-white bg-[#1455D9]"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>Share Rates Now</span>
                </Link>
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
                      className="p-5 rounded-2xl border border-slate-200 bg-slate-50/40 hover:bg-white hover:shadow-xs transition-all space-y-3 text-xs"
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-2.5">
                        <div className="flex items-center gap-2.5">
                          <span className="font-mono font-bold text-sm text-slate-900">
                            {q?.quote_reference || 'QUOTE-REF'}
                          </span>
                          <span className="text-slate-300">•</span>
                          <span className="text-slate-500 font-medium">
                            {new Date(item.created_at).toLocaleDateString()}
                          </span>
                        </div>
                        <span
                          className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${
                            tierColors[item.rate_tier] || 'bg-slate-100 text-slate-700'
                          }`}
                        >
                          Tier: {item.rate_tier}
                        </span>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <div>
                          <span className="text-slate-400 block text-[10px] uppercase font-bold">
                            Dispatched By (Staff):
                          </span>
                          <span className="font-bold text-slate-900 text-sm mt-0.5 block">
                            {q?.sender?.full_name || 'Staff Member'}
                          </span>
                        </div>

                        <div>
                          <span className="text-slate-400 block text-[10px] uppercase font-bold">
                            Travel Agency:
                          </span>
                          <span className="font-bold text-slate-900 text-sm mt-0.5 block">
                            {q?.agency?.name || 'Travel Agency'}
                          </span>
                        </div>

                        <div>
                          <span className="text-slate-400 block text-[10px] uppercase font-bold">
                            Season Quoted:
                          </span>
                          <span className="font-semibold text-slate-800 text-sm mt-0.5 block">
                            {item.season_name_snapshot || 'Contract Season'}
                          </span>
                        </div>
                      </div>

                      {q?.recipients && q.recipients.length > 0 && (
                        <div className="pt-2 border-t border-slate-100">
                          <span className="text-slate-400 text-[10px] uppercase font-bold block mb-1">
                            Delivered Recipients:
                          </span>
                          <div className="flex flex-wrap gap-2">
                            {q.recipients.map((rec: any, idx: number) => (
                              <span
                                key={idx}
                                className="inline-flex items-center gap-1.5 px-3 py-1 bg-white border border-slate-200 text-slate-800 rounded-lg text-xs"
                              >
                                <span className="font-semibold">{rec.original_full_name}</span>
                                <span className="text-slate-400 font-mono text-[11px]">
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
        )}

        {/* Tab 3: Seasonal Validity */}
        {activeTab === 'SEASONS' && (
          <div className="p-6 space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <div>
                <h3 className="text-sm font-bold text-slate-900">
                  Configured Seasons for {hotel.hotel_name}
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Operating seasonal contract dates for rate calculation and quoting validity.
                </p>
              </div>

              <Link
                to={`/seasons?hotelId=${hotel.id}`}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-white bg-[#1455D9]"
              >
                <span>Edit Calendar</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </Link>
            </div>

            {seasons.length === 0 ? (
              <div className="py-12 text-center text-slate-400 border border-dashed border-slate-200 rounded-xl">
                <CalendarDays className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                <p className="text-xs font-semibold text-slate-700">No seasons configured yet</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {seasons.map((s) => (
                  <div key={s.id} className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 space-y-1 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-900 text-sm">{s.season_name}</span>
                      <span className="px-2 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded font-bold text-[10px]">
                        ACTIVE
                      </span>
                    </div>
                    <div className="text-slate-500 text-xs">
                      📅 Valid: <span className="font-medium text-slate-700">{s.start_date}</span> to{' '}
                      <span className="font-medium text-slate-700">{s.end_date}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Tab 4: Overview */}
        {activeTab === 'OVERVIEW' && (
          <div className="p-6 space-y-4">
            <h3 className="text-sm font-bold text-slate-900 pb-2 border-b border-slate-100">
              Master Property Configuration
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
                <span className="text-slate-500 block font-medium">Hotel Identifier Code</span>
                <span className="font-mono font-bold text-slate-900 text-base mt-1 block">
                  {hotel.hotel_code || 'Not Set'}
                </span>
              </div>
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
                <span className="text-slate-500 block font-medium">Geographical Region</span>
                <span className="font-bold text-slate-900 text-base mt-1 block">
                  {hotel.area || 'Not Set'}
                </span>
              </div>
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
                <span className="text-slate-500 block font-medium">Contract Distribution Type</span>
                <span className="font-bold text-[#1455D9] text-base mt-1 block">
                  {hotel.service_type}
                </span>
              </div>
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
                <span className="text-slate-500 block font-medium">Operational Status</span>
                <span className="font-bold text-emerald-700 text-base mt-1 block">
                  {hotel.status}
                </span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Log Visit Modal (Pre-populated for this hotel) */}
      <LogVisitModal
        isOpen={isLogModalOpen}
        initialHotelId={hotel.id}
        onClose={() => setIsLogModalOpen(false)}
        onSuccess={async () => {
          const res = await salesVisitService.fetchVisits({ hotelId: hotel.id });
          setVisits(res.data || []);
        }}
      />
    </div>
  );
};
