import React, { useState, useEffect } from 'react';
import {
  FileText,
  Plus,
  Search,
  AlertCircle,
  X
} from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { contractService, HotelContract } from '../../services/contractService';
import { rateService } from '../../services/rateService';
import { HotelRecord, HotelSeasonRecord } from '../../types/hotelHierarchy';

export const ContractsView: React.FC = () => {
  const { user, hasPermission } = useAuth();
  const canManageRates = hasPermission('CAN_MANAGE_RATES');

  const [contracts, setContracts] = useState<HotelContract[]>([]);
  const [hotels, setHotels] = useState<HotelRecord[]>([]);
  const [seasons, setSeasons] = useState<HotelSeasonRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');

  // Modal
  const [modalOpen, setModalOpen] = useState(false);
  const [hotelId, setHotelId] = useState('');
  const [seasonId, setSeasonId] = useState('');
  const [refCode, setRefCode] = useState('');
  const [name, setName] = useState('');
  const [validFrom, setValidFrom] = useState('');
  const [validTo, setValidTo] = useState('');
  const [currency] = useState('USD');
  const [terms, setTerms] = useState('');
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const loadData = async () => {
    try {
      setLoading(true);
      const [contractList, hotelList] = await Promise.all([
        contractService.getContracts(),
        rateService.getHotels()
      ]);
      setContracts(contractList);
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
    if (!refCode.trim() || !name.trim() || !validFrom || !validTo) {
      setErrorMsg('Please complete all required fields.');
      return;
    }
    if (new Date(validTo) < new Date(validFrom)) {
      setErrorMsg('Valid To date must be on or after Valid From date.');
      return;
    }

    try {
      setSaving(true);
      setErrorMsg(null);
      await contractService.createContract(
        {
          hotel_id: hotelId,
          season_id: seasonId || null,
          contract_reference: refCode,
          contract_name: name,
          valid_from: validFrom,
          valid_to: validTo,
          currency,
          terms_and_conditions: terms,
          status: 'ACTIVE'
        },
        user.id
      );
      setModalOpen(false);
      loadData();
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : 'Failed to create contract');
    } finally {
      setSaving(false);
    }
  };

  const filteredContracts = contracts.filter((c) => {
    const matchesSearch =
      searchQuery === '' ||
      c.contract_reference.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.contract_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (c.hotel_name && c.hotel_name.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesStatus = statusFilter === 'ALL' || c.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-4">
      {/* Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3 flex-1 max-w-md">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-[#667085] absolute left-3 top-3" />
            <input
              type="text"
              placeholder="Search contracts by reference, hotel..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full h-10 pl-9 pr-3 rounded-xl border border-[#D9E0EA] bg-white text-xs text-[#101828]"
            />
          </div>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="h-10 px-3 rounded-xl border border-[#D9E0EA] bg-white text-xs text-[#101828]"
          >
            <option value="ALL">All Statuses</option>
            <option value="ACTIVE">Active</option>
            <option value="DRAFT">Draft</option>
            <option value="EXPIRED">Expired</option>
          </select>
        </div>

        {canManageRates && (
          <button
            type="button"
            onClick={() => setModalOpen(true)}
            className="h-10 px-4 rounded-xl bg-[#1455D9] hover:bg-blue-700 text-white text-xs font-bold flex items-center gap-1.5 transition-colors"
          >
            <Plus className="w-4 h-4" /> Add Contract
          </button>
        )}
      </div>

      {/* Contracts Table */}
      <div className="bg-white rounded-2xl border border-[#D9E0EA] overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#F8FAFC] border-b border-[#D9E0EA] font-semibold text-[#667085]">
              <tr>
                <th className="px-6 py-3.5">Reference</th>
                <th className="px-6 py-3.5">Contract Name</th>
                <th className="px-6 py-3.5">Partner Hotel</th>
                <th className="px-6 py-3.5">Season Scope</th>
                <th className="px-6 py-3.5">Validity Period</th>
                <th className="px-6 py-3.5">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#D9E0EA]">
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-[#667085]">
                    Loading contracts...
                  </td>
                </tr>
              ) : filteredContracts.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-[#667085]">
                    No contracts found. Click &quot;Add Contract&quot; to establish master hotel terms.
                  </td>
                </tr>
              ) : (
                filteredContracts.map((c) => (
                  <tr key={c.id} className="hover:bg-slate-50">
                    <td className="px-6 py-3.5 font-bold text-[#1455D9]">{c.contract_reference}</td>
                    <td className="px-6 py-3.5 font-medium text-[#101828]">{c.contract_name}</td>
                    <td className="px-6 py-3.5 text-[#101828]">{c.hotel_name}</td>
                    <td className="px-6 py-3.5 text-[#667085]">{c.season_label}</td>
                    <td className="px-6 py-3.5 text-[#667085]">
                      {c.valid_from} → {c.valid_to}
                    </td>
                    <td className="px-6 py-3.5">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                        c.status === 'ACTIVE'
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          : 'bg-amber-50 text-amber-700 border border-amber-200'
                      }`}>
                        {c.status}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Contract Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl border border-[#D9E0EA] shadow-xl max-w-lg w-full overflow-hidden">
            <div className="p-4 border-b border-[#D9E0EA] flex items-center justify-between bg-[#F8FAFC]">
              <div className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-[#1455D9]" />
                <h3 className="font-bold text-sm text-[#101828]">Establish Partner Hotel Contract</h3>
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

                <div>
                  <label className="block text-xs font-semibold text-[#667085] mb-1">Season Association</label>
                  <select
                    value={seasonId}
                    onChange={(e) => setSeasonId(e.target.value)}
                    className="w-full h-9 px-3 rounded-lg border border-[#D9E0EA] text-xs text-[#101828]"
                  >
                    <option value="">Applicable to All Seasons</option>
                    {seasons.map((s) => (
                      <option key={s.id} value={s.id}>{s.season_label}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-[#667085] mb-1">Contract Reference *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. CTR-RAND-2026"
                    value={refCode}
                    onChange={(e) => setRefCode(e.target.value)}
                    className="w-full h-9 px-3 rounded-lg border border-[#D9E0EA] text-xs text-[#101828]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#667085] mb-1">Contract Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Master Fit Contract"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full h-9 px-3 rounded-lg border border-[#D9E0EA] text-xs text-[#101828]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-[#667085] mb-1">Valid From *</label>
                  <input
                    type="date"
                    required
                    value={validFrom}
                    onChange={(e) => setValidFrom(e.target.value)}
                    className="w-full h-9 px-3 rounded-lg border border-[#D9E0EA] text-xs text-[#101828]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#667085] mb-1">Valid To *</label>
                  <input
                    type="date"
                    required
                    value={validTo}
                    onChange={(e) => setValidTo(e.target.value)}
                    className="w-full h-9 px-3 rounded-lg border border-[#D9E0EA] text-xs text-[#101828]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#667085] mb-1">Terms & Conditions</label>
                <textarea
                  rows={2}
                  placeholder="Payment conditions, cancellation policy..."
                  value={terms}
                  onChange={(e) => setTerms(e.target.value)}
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
                  {saving ? 'Creating...' : 'Establish Contract'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
