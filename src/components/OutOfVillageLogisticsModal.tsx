import React, { useState, useMemo } from 'react';
import {
  Plane,
  X,
  Bus,
  Train,
  Calendar,
  XCircle,
  HelpCircle,
  MessageSquare,
  Printer,
  Phone,
  Search,
  CheckCircle2,
  MapPin,
  Building2,
  Users
} from 'lucide-react';
import { MobileVoter, BoothInfo, VoterCampaignProfile, TravelStatus, TravelCity } from '../types';
import { resolvePhotoUrl } from '../utils/photoResolver';

interface OutOfVillageLogisticsModalProps {
  isOpen: boolean;
  onClose: () => void;
  voters: MobileVoter[];
  profiles: Record<number, VoterCampaignProfile>;
  boothInfo: BoothInfo;
  onUpdateProfile: (serialNo: number, updates: Partial<VoterCampaignProfile>) => void;
  onOpenGroupPrint?: (title: string, subtitle: string, voters: MobileVoter[], layout?: 'slips' | 'table' | 'cards') => void;
  coordinatorPhone?: string;
}

const CITIES: { id: TravelCity | 'all'; labelTe: string; labelEn: string; icon: string }[] = [
  { id: 'all', labelTe: 'అన్ని నగరాలు', labelEn: 'All Cities', icon: '🌐' },
  { id: 'hyderabad', labelTe: 'హైదరాబాద్', labelEn: 'Hyderabad', icon: '🏙️' },
  { id: 'bangalore', labelTe: 'బెంగళూరు', labelEn: 'Bangalore', icon: '💻' },
  { id: 'vizag', labelTe: 'విశాఖపట్నం', labelEn: 'Vizag', icon: '⚓' },
  { id: 'vijayawada', labelTe: 'విజయవాడ', labelEn: 'Vijayawada', icon: '🏛️' },
  { id: 'gulf', labelTe: 'గల్ఫ్ / విదేశాలు', labelEn: 'Gulf / Abroad', icon: '✈️' },
  { id: 'chennai', labelTe: 'చెన్నై', labelEn: 'Chennai', icon: '🚆' },
  { id: 'other', labelTe: 'ఇతర ప్రాంతాలు', labelEn: 'Other', icon: '📍' }
];

export const OutOfVillageLogisticsModal: React.FC<OutOfVillageLogisticsModalProps> = ({
  isOpen,
  onClose,
  voters,
  profiles,
  boothInfo,
  onUpdateProfile,
  onOpenGroupPrint,
  coordinatorPhone = '9000273028'
}) => {
  const [selectedCity, setSelectedCity] = useState<TravelCity | 'all'>('all');
  const [selectedStatus, setSelectedStatus] = useState<TravelStatus | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Extract all out-of-city voters
  const outOfCityVoters = useMemo(() => {
    return voters.filter(v => {
      const s = v.s ?? (v as any).sno;
      return profiles[s]?.survey_status === 'out_of_city';
    });
  }, [voters, profiles]);

  // Statistics per city and per travel status
  const stats = useMemo(() => {
    const total = outOfCityVoters.length;
    let needsBus = 0;
    let selfTravel = 0;
    let cannotCome = 0;
    let pending = 0;

    const cityCounts: Record<string, number> = {};

    outOfCityVoters.forEach(v => {
      const s = v.s ?? (v as any).sno;
      const p = profiles[s] || {};
      const status = p.travelStatus || 'pending';
      if (status === 'needs_bus') needsBus++;
      else if (status === 'self_travel') selfTravel++;
      else if (status === 'cannot_come') cannotCome++;
      else pending++;

      const city = p.travelCity || (p.outOfCityLocation ? 'other' : 'other');
      cityCounts[city] = (cityCounts[city] || 0) + 1;
    });

    return { total, needsBus, selfTravel, cannotCome, pending, cityCounts };
  }, [outOfCityVoters, profiles]);

  // Filtered List
  const filteredVoters = useMemo(() => {
    return outOfCityVoters.filter(v => {
      const s = v.s ?? (v as any).sno;
      const p = profiles[s] || {};

      // City filter
      if (selectedCity !== 'all') {
        const c = p.travelCity || (p.outOfCityLocation ? 'other' : 'other');
        if (c !== selectedCity) return false;
      }

      // Status filter
      if (selectedStatus !== 'all') {
        const st = p.travelStatus || 'pending';
        if (st !== selectedStatus) return false;
      }

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const name = (v.n || '').toLowerCase();
        const id = (v.id || '').toLowerCase();
        const phone = (p.customPhone || v.k_m || '').toLowerCase();
        const sno = String(s);
        if (!name.includes(q) && !id.includes(q) && !phone.includes(q) && !sno.includes(q)) {
          return false;
        }
      }

      return true;
    });
  }, [outOfCityVoters, profiles, selectedCity, selectedStatus, searchQuery]);

  if (!isOpen) return null;

  const handleSetTravelStatus = (sno: number, status: TravelStatus) => {
    onUpdateProfile(sno, { travelStatus: status });
  };

  const handleSetTravelCity = (sno: number, city: string) => {
    onUpdateProfile(sno, { travelCity: city });
  };

  const handleSetArrivalDate = (sno: number, date: string) => {
    onUpdateProfile(sno, { arrivalDate: date });
  };

  const sendWhatsAppInvitation = (v: MobileVoter) => {
    const s = v.s ?? (v as any).sno;
    const p = profiles[s] || {};
    const phone = p.customPhone || v.k_m;
    if (!phone) {
      alert('ఈ ఓటరుకు ఫోన్ నెంబర్ నమోదు కాలేదు. దయచేసి ముందుగా ఫోన్ నెంబర్ నమోదు చేయండి.');
      return;
    }

    const cleanPhone = phone.replace(/[^0-9]/g, '');
    const targetPhone = cleanPhone.startsWith('91') ? cleanPhone : `91${cleanPhone}`;

    const text = `నమస్కారం ${v.n} గారు 🙏

మన గ్రామ పంచాయతీ ఎన్నికలకు విచ్చేసి ఓటు హక్కును వినియోగించుకోవాల్సిందిగా పిఠాపురం నాయకత్వం తరఫున కోరుతున్నాము.

🗳️ *మీ ఓటు వివరాలు:*
• బూత్ / వార్డు: ${boothInfo.clean_village || boothInfo.ps_address}
• ఓటరు క్రమ సంఖ్య: #${s}
• EPIC నెంబర్: ${v.id || ''}
• పోలింగ్ కేంద్రం: ${boothInfo.ps_address || ''}

🚌 *రవాణా / ప్రయాణ సమాచారం కొరకు సంప్రదించండి:*
📞 కో-ఆర్డినేటర్: +91 ${coordinatorPhone}

_స్వగ్రామానికి వచ్చి మన ఊరి భవిష్యత్తు కోసం ఓటు వేయండి!_ ✊`;

    window.open(`https://api.whatsapp.com/send?phone=${targetPhone}&text=${encodeURIComponent(text)}`, '_blank');
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex flex-col items-center justify-start overflow-y-auto p-2 sm:p-4">
      <div className="bg-slate-900 border border-blue-500/50 rounded-3xl w-full max-w-4xl shadow-2xl text-white space-y-4 my-2 overflow-hidden">
        
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 p-4 sm:p-5 border-b border-blue-500/30">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <span className="p-2.5 bg-blue-500/20 text-blue-400 rounded-2xl border border-blue-400/30 text-xl shadow">
                ✈️
              </span>
              <div>
                <h2 className="text-base sm:text-lg font-black text-white flex items-center gap-2">
                  <span>వలస / ఊరిలో లేని ఓటర్ల ట్రాకర్ & లాజిస్టిక్స్</span>
                  <span className="bg-blue-600 text-white text-xs px-2.5 py-0.5 rounded-full font-mono font-bold">
                    {stats.total} మంది ఓటర్లు
                  </span>
                </h2>
                <p className="text-xs text-blue-200 mt-0.5">
                  {boothInfo.clean_village || boothInfo.ps_address} • ప్రయాణ ఏర్పాట్లు & సమన్వయం
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {onOpenGroupPrint && (
                <button
                  type="button"
                  onClick={() => onOpenGroupPrint(
                    `✈️ ఊరిలో లేని ఓటర్ల అధికారిక కార్డులు`,
                    `${boothInfo.clean_village} • మొత్తం ${filteredVoters.length} మంది ఓటర్లు`,
                    filteredVoters,
                    'cards'
                  )}
                  className="px-3 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black rounded-xl text-xs flex items-center gap-1.5 shadow transition-all active:scale-95 cursor-pointer"
                  title="వీరి అధికారిక ఫొటో కార్డులను ప్రింట్ చేయండి"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>కార్డుల ప్రింట్ ({filteredVoters.length})</span>
                </button>
              )}
              <button
                type="button"
                onClick={onClose}
                className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-xl transition-all cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Quick Metrics Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 mt-4 text-xs font-mono">
            <button
              type="button"
              onClick={() => setSelectedStatus(selectedStatus === 'needs_bus' ? 'all' : 'needs_bus')}
              className={`p-2.5 rounded-2xl border text-left transition-all cursor-pointer ${
                selectedStatus === 'needs_bus'
                  ? 'bg-amber-500/20 border-amber-400 text-amber-200 ring-2 ring-amber-400/40'
                  : 'bg-slate-950/60 border-slate-800 text-slate-300 hover:border-slate-700'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-1 text-[11px] font-bold text-amber-400">
                  <Bus className="w-3.5 h-3.5" /> బస్సు కావాలి
                </span>
                <span className="text-base font-black text-amber-300">{stats.needsBus}</span>
              </div>
              <p className="text-[10px] text-slate-400 mt-1">రవాణా ఏర్పాటు అవసరం</p>
            </button>

            <button
              type="button"
              onClick={() => setSelectedStatus(selectedStatus === 'self_travel' ? 'all' : 'self_travel')}
              className={`p-2.5 rounded-2xl border text-left transition-all cursor-pointer ${
                selectedStatus === 'self_travel'
                  ? 'bg-emerald-500/20 border-emerald-400 text-emerald-200 ring-2 ring-emerald-400/40'
                  : 'bg-slate-950/60 border-slate-800 text-slate-300 hover:border-slate-700'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-1 text-[11px] font-bold text-emerald-400">
                  <Train className="w-3.5 h-3.5" /> సొంతంగా రాక
                </span>
                <span className="text-base font-black text-emerald-300">{stats.selfTravel}</span>
              </div>
              <p className="text-[10px] text-slate-400 mt-1">సొంత వాహనం/రైలు</p>
            </button>

            <button
              type="button"
              onClick={() => setSelectedStatus(selectedStatus === 'pending' ? 'all' : 'pending')}
              className={`p-2.5 rounded-2xl border text-left transition-all cursor-pointer ${
                selectedStatus === 'pending'
                  ? 'bg-blue-500/20 border-blue-400 text-blue-200 ring-2 ring-blue-400/40'
                  : 'bg-slate-950/60 border-slate-800 text-slate-300 hover:border-slate-700'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-1 text-[11px] font-bold text-blue-400">
                  <HelpCircle className="w-3.5 h-3.5" /> తేలనివారు
                </span>
                <span className="text-base font-black text-blue-300">{stats.pending}</span>
              </div>
              <p className="text-[10px] text-slate-400 mt-1">సమాచారం పెండింగ్</p>
            </button>

            <button
              type="button"
              onClick={() => setSelectedStatus(selectedStatus === 'cannot_come' ? 'all' : 'cannot_come')}
              className={`p-2.5 rounded-2xl border text-left transition-all cursor-pointer ${
                selectedStatus === 'cannot_come'
                  ? 'bg-red-500/20 border-red-400 text-red-200 ring-2 ring-red-400/40'
                  : 'bg-slate-950/60 border-slate-800 text-slate-300 hover:border-slate-700'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-1 text-[11px] font-bold text-red-400">
                  <XCircle className="w-3.5 h-3.5" /> రాలేనివారు
                </span>
                <span className="text-base font-black text-red-300">{stats.cannotCome}</span>
              </div>
              <p className="text-[10px] text-slate-400 mt-1">రాలేమని చెప్పారు</p>
            </button>
          </div>
        </div>

        {/* Filter Toolbar: City Pills & Search Bar */}
        <div className="px-4 sm:px-5 space-y-2.5">
          {/* City Selector Pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none text-xs">
            {CITIES.map(c => {
              const count = c.id === 'all' ? stats.total : (stats.cityCounts[c.id] || 0);
              const isActive = selectedCity === c.id;
              return (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => setSelectedCity(c.id)}
                  className={`px-3 py-1.5 rounded-xl font-bold whitespace-nowrap flex items-center gap-1.5 transition-all cursor-pointer ${
                    isActive
                      ? 'bg-blue-600 text-white shadow-md ring-2 ring-blue-400/50 scale-105'
                      : 'bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white'
                  }`}
                >
                  <span>{c.icon}</span>
                  <span>{c.labelTe}</span>
                  <span className="font-mono text-[10.5px] opacity-80">({count})</span>
                </button>
              );
            })}
          </div>

          {/* Search Box */}
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="పేరు, EPIC, మొబైల్ లేదా S.No ద్వారా వెతకండి..."
              className="w-full pl-9 pr-4 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
            />
          </div>
        </div>

        {/* Electors List */}
        <div className="px-4 sm:px-5 pb-5 max-h-[55vh] overflow-y-auto space-y-2.5 divide-y divide-slate-800/40">
          {filteredVoters.length === 0 ? (
            <div className="py-12 text-center text-slate-500 space-y-2">
              <Plane className="w-10 h-10 mx-auto text-blue-500/40 animate-pulse" />
              <p className="text-sm font-bold text-slate-300">ఈ ఫిల్టర్‌లో ఎలాంటి ఓటర్లు లేరు</p>
              <p className="text-xs">వేరే నగరం లేదా స్టేటస్ ఎంచుకోండి.</p>
            </div>
          ) : (
            filteredVoters.map(v => {
              const s = v.s ?? (v as any).sno;
              const p = profiles[s] || {};
              const phone = p.customPhone || v.k_m;
              const currentStatus: TravelStatus = p.travelStatus || 'pending';
              const currentCity = p.travelCity || (p.outOfCityLocation ? 'other' : 'other');

              return (
                <div key={s} className="pt-2.5 first:pt-0 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-950/50 p-3 rounded-2xl border border-slate-800/80 hover:border-slate-700 transition-all">
                  {/* Left: Voter Identity */}
                  <div className="flex items-start gap-3 min-w-0">
                    <div className="shrink-0 text-center">
                      <span className="font-mono font-black text-xs bg-blue-950 text-blue-300 border border-blue-500/40 px-2 py-0.5 rounded-lg block">
                        #{s}
                      </span>
                      {v.card_url || v.card ? (
                        <img
                          src={resolvePhotoUrl(v.card_url || v.card)}
                          alt={v.n}
                          className="w-11 h-14 object-cover rounded-lg border border-slate-700 mt-1 shadow"
                        />
                      ) : null}
                    </div>

                    <div className="min-w-0 space-y-0.5">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <h4 className="font-black text-sm text-white truncate">{v.n}</h4>
                        <span className="font-mono text-[10px] text-amber-400 bg-amber-950/60 px-1.5 py-0.2 rounded border border-amber-500/30">
                          {v.id || (v as any).epic}
                        </span>
                        <span className="text-[10px] text-slate-400">
                          వార్డు #{v.ward_no || (v as any).w || boothInfo.ward_no}
                        </span>
                      </div>

                      <p className="text-[11px] text-slate-400">
                        {v.r && <span>సంబంధం: {v.r} • </span>}
                        వయస్సు: {v.a} • ఇంటి నెం: <strong className="text-slate-200">{v.hn || '—'}</strong>
                      </p>

                      {phone ? (
                        <div className="flex items-center gap-2 pt-0.5">
                          <span className="text-[11px] font-mono font-bold text-emerald-400 flex items-center gap-1">
                            <Phone className="w-3 h-3 text-emerald-400" />
                            {phone}
                          </span>
                        </div>
                      ) : (
                        <p className="text-[10px] text-red-400 font-bold">⚠️ ఫోన్ నెంబర్ లేదు</p>
                      )}
                    </div>
                  </div>

                  {/* Right: Logistics Status & WhatsApp Action */}
                  <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap justify-between sm:justify-end border-t sm:border-t-0 pt-2 sm:pt-0 border-slate-800">
                    {/* City Selector */}
                    <select
                      value={currentCity}
                      onChange={e => handleSetTravelCity(s, e.target.value)}
                      className="bg-slate-900 border border-slate-700 rounded-xl px-2 py-1 text-xs text-blue-200 focus:outline-none focus:border-blue-400 cursor-pointer"
                      title="ఓటరు ప్రస్తుతం ఉన్న నగరం"
                    >
                      <option value="hyderabad">🏙️ హైదరాబాద్</option>
                      <option value="bangalore">💻 బెంగళూరు</option>
                      <option value="vizag">⚓ విశాఖపట్నం</option>
                      <option value="vijayawada">🏛️ విజయవాడ</option>
                      <option value="gulf">✈️ గల్ఫ్ / విదేశాలు</option>
                      <option value="chennai">🚆 చెన్నై</option>
                      <option value="other">📍 ఇతర ప్రాంతం</option>
                    </select>

                    {/* Travel Status Pill Toggle */}
                    <div className="inline-flex rounded-xl bg-slate-900 p-0.5 border border-slate-700 text-[10.5px]">
                      <button
                        type="button"
                        onClick={() => handleSetTravelStatus(s, 'needs_bus')}
                        className={`px-2 py-1 rounded-lg font-bold flex items-center gap-1 transition-all ${
                          currentStatus === 'needs_bus'
                            ? 'bg-amber-500 text-slate-950 font-black shadow'
                            : 'text-slate-400 hover:text-white'
                        }`}
                        title="రవాణా / బస్సు ఏర్పాటు అవసరం"
                      >
                        <Bus className="w-3 h-3" />
                        <span>బస్సు</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => handleSetTravelStatus(s, 'self_travel')}
                        className={`px-2 py-1 rounded-lg font-bold flex items-center gap-1 transition-all ${
                          currentStatus === 'self_travel'
                            ? 'bg-emerald-500 text-slate-950 font-black shadow'
                            : 'text-slate-400 hover:text-white'
                        }`}
                        title="సొంతంగా వస్తున్నారు"
                      >
                        <Train className="w-3 h-3" />
                        <span>సొంతం</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => handleSetTravelStatus(s, 'cannot_come')}
                        className={`px-2 py-1 rounded-lg font-bold flex items-center gap-1 transition-all ${
                          currentStatus === 'cannot_come'
                            ? 'bg-red-500 text-white font-black shadow'
                            : 'text-slate-400 hover:text-white'
                        }`}
                        title="రాలేరు"
                      >
                        <XCircle className="w-3 h-3" />
                        <span>రారు</span>
                      </button>
                    </div>

                    {/* 1-Click WhatsApp Invite */}
                    <button
                      type="button"
                      onClick={() => sendWhatsAppInvitation(v)}
                      className="px-2.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-bold text-xs flex items-center gap-1 shadow active:scale-95 transition-all cursor-pointer"
                      title="వాట్సాప్‌లో ప్రయాణ ఆహ్వాన పత్రిక పంపండి"
                    >
                      <MessageSquare className="w-3.5 h-3.5" />
                      <span>ఆహ్వానం</span>
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="bg-slate-950 p-3.5 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
          <p className="flex items-center gap-1.5">
            <span>💡</span>
            <span>ఊరిలో లేని ఓటర్ల రవాణా సమన్వయం పంచాయతీ ఎన్నికల గెలుపును నిర్దేశిస్తుంది.</span>
          </p>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-800 hover:bg-slate-700 text-white font-bold rounded-xl text-xs transition-all cursor-pointer"
          >
            పూర్తయింది (Done)
          </button>
        </div>
      </div>
    </div>
  );
};
