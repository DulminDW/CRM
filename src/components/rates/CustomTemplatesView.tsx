import React, { useState, useEffect } from 'react';
import {
  Sparkles,
  Plus,
  AlertCircle,
  X
} from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { customRateService, CustomRateTemplate } from '../../services/customRateService';
import { rateService } from '../../services/rateService';
import { HotelRecord, HotelSeasonRecord } from '../../types/hotelHierarchy';

export const CustomTemplatesView: React.FC = () => {
  const { user, hasPermission } = useAuth();
  const canManageRates = hasPermission('CAN_MANAGE_RATES');

  const [templates, setTemplates] = useState<CustomRateTemplate[]>([]);
  const [hotels, setHotels] = useState<HotelRecord[]>([]);
  const [hotelId, setHotelId] = useState('');
  const [seasonId, setSeasonId] = useState('');
  const [seasons, setSeasons] = useState<HotelSeasonRecord[]>([]);
  const [, setLoading] = useState(true);

  // Modal
  const [modalOpen, setModalOpen] = useState(false);
  const [slot, setSlot] = useState<'Custom 1' | 'Custom 2' | 'Custom 3'>('Custom 1');
  const [templateName, setTemplateName] = useState('');
  const [amount, setAmount] = useState<number>(0);
  const [roomNights, setRoomNights] = useState<number | ''>('');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const loadData = async () => {
    try {
      setLoading(true);
      const [tplList, hotelList] = await Promise.all([
        customRateService.getTemplates(),
        rateService.getHotels()
      ]);
      setTemplates(tplList);
      setHotels(hotelList);
      if (hotelList.length > 0 && hotelList[0]) {
        setHotelId(hotelList[0].id);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (!hotelId) return;
    rateService.getSeasonsForHotel(hotelId).then((data: HotelSeasonRecord[]) => {
      setSeasons(data);
      if (data.length > 0 && data[0]) {
        setSeasonId(data[0].id);
      } else {
        setSeasonId('');
      }
    });
  }, [hotelId]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    if (!templateName.trim() || amount <= 0) {
      setErrorMsg('Please specify a valid template name and positive rate amount.');
      return;
    }

    try {
      setSaving(true);
      setErrorMsg(null);
      await customRateService.createTemplate(
        {
          hotel_id: hotelId,
          season_id: seasonId || null,
          slot_label: slot,
          template_name: templateName,
          rate_amount: amount,
          room_night_condition: roomNights ? Number(roomNights) : null,
          special_notes: notes
        },
        user.id
      );
      setModalOpen(false);
      loadData();
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : 'Failed to create template');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-base font-bold text-[#101828]">Reusable Custom Rate Templates (1, 2, 3)</h3>
          <p className="text-xs text-[#667085]">
            Configure fast negotiated rate slots with volume room-night commitments.
          </p>
        </div>

        {canManageRates && (
          <button
            type="button"
            onClick={() => setModalOpen(true)}
            className="h-10 px-4 rounded-xl bg-[#1455D9] hover:bg-blue-700 text-white text-xs font-bold flex items-center gap-1.5 transition-colors"
          >
            <Plus className="w-4 h-4" /> Create Custom Template
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {['Custom 1', 'Custom 2', 'Custom 3'].map((slotKey) => {
          const slotTemplates = templates.filter((t) => t.slot_label === slotKey);

          return (
            <div key={slotKey} className="bg-white rounded-2xl border border-[#D9E0EA] p-5 shadow-xs space-y-3">
              <div className="flex items-center justify-between border-b border-[#D9E0EA] pb-3">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-[#1455D9]" />
                  <span className="font-bold text-sm text-[#101828]">{slotKey}</span>
                </div>
                <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-blue-50 text-[#1455D9]">
                  {slotTemplates.length} configured
                </span>
              </div>

              {slotTemplates.length === 0 ? (
                <div className="text-center py-6 text-xs text-[#667085]">
                  No template assigned to {slotKey}
                </div>
              ) : (
                <div className="space-y-2">
                  {slotTemplates.map((t) => (
                    <div key={t.id} className="p-3 rounded-xl border border-[#D9E0EA] bg-[#F8FAFC]">
                      <div className="text-xs font-bold text-[#101828]">{t.template_name}</div>
                      <div className="text-xs text-[#1455D9] font-bold mt-1">
                        ${t.rate_amount} {t.currency}
                      </div>
                      <div className="text-[11px] text-[#667085] mt-1">
                        Hotel: <strong>{t.hotel_name}</strong>
                      </div>
                      {t.room_night_condition && (
                        <div className="text-[10px] text-amber-700 bg-amber-50 px-2 py-0.5 rounded mt-1.5 inline-block">
                          Min: {t.room_night_condition} Room Nights
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl border border-[#D9E0EA] shadow-xl max-w-md w-full overflow-hidden">
            <div className="p-4 border-b border-[#D9E0EA] flex items-center justify-between bg-[#F8FAFC]">
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-[#1455D9]" />
                <h3 className="font-bold text-sm text-[#101828]">Create Custom Rate Template</h3>
              </div>
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="text-[#667085] hover:text-[#101828]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreate} className="p-5 space-y-4">
              {errorMsg && (
                <div className="p-3 rounded-lg bg-red-50 text-red-700 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  <span>{errorMsg}</span>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-[#667085] mb-1">Target Slot *</label>
                  <select
                    value={slot}
                    onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setSlot(e.target.value as 'Custom 1' | 'Custom 2' | 'Custom 3')}
                    className="w-full h-9 px-3 rounded-lg border border-[#D9E0EA] text-xs text-[#101828]"
                  >
                    <option value="Custom 1">Custom 1</option>
                    <option value="Custom 2">Custom 2</option>
                    <option value="Custom 3">Custom 3</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#667085] mb-1">Hotel Property *</label>
                  <select
                    value={hotelId}
                    onChange={(e) => setHotelId(e.target.value)}
                    className="w-full h-9 px-3 rounded-lg border border-[#D9E0EA] text-xs text-[#101828]"
                  >
                    {hotels.map((h) => (
                      <option key={h.id} value={h.id}>{h.hotel_name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#667085] mb-1">Season Association (Optional)</label>
                <select
                  value={seasonId}
                  onChange={(e) => setSeasonId(e.target.value)}
                  className="w-full h-9 px-3 rounded-lg border border-[#D9E0EA] text-xs text-[#101828]"
                >
                  <option value="">Applicable across all seasons</option>
                  {seasons.map((s) => (
                    <option key={s.id} value={s.id}>{s.season_label}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#667085] mb-1">Template Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. VIP Volume Incentive ($50 Rate)"
                  value={templateName}
                  onChange={(e) => setTemplateName(e.target.value)}
                  className="w-full h-9 px-3 rounded-lg border border-[#D9E0EA] text-xs text-[#101828]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-[#667085] mb-1">Negotiated Price ($) *</label>
                  <input
                    type="number"
                    required
                    min={0}
                    step="0.01"
                    placeholder="e.g. 50.00"
                    value={amount || ''}
                    onChange={(e) => setAmount(Number(e.target.value))}
                    className="w-full h-9 px-3 rounded-lg border border-[#D9E0EA] text-xs text-[#101828]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#667085] mb-1">Min Room Nights</label>
                  <input
                    type="number"
                    min={0}
                    placeholder="e.g. 1500"
                    value={roomNights}
                    onChange={(e) => setRoomNights(e.target.value ? Number(e.target.value) : '')}
                    className="w-full h-9 px-3 rounded-lg border border-[#D9E0EA] text-xs text-[#101828]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#667085] mb-1">Special Notes</label>
                <textarea
                  rows={2}
                  placeholder="Specific market restrictions, payment clauses..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full p-2 rounded-lg border border-[#D9E0EA] text-xs text-[#101828]"
                />
              </div>

              <div className="pt-2 flex justify-end gap-3 border-t border-[#D9E0EA]">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-[#667085] hover:bg-slate-100 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-5 py-2 text-xs font-bold text-white bg-[#1455D9] hover:bg-blue-700 rounded-lg"
                >
                  {saving ? 'Creating...' : 'Save Custom Template'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
