import React, { useState, useMemo } from 'react';
import { Search, Phone, PhoneCall, MessageSquare, Send, Printer, CheckCircle2, Flag, UserX, AlertCircle, Sparkles, Home, UserCheck, Sliders, Plus, Clock } from 'lucide-react';
import { MobileVoter, BoothInfo, VoterSurveyStatus, VoterCampaignProfile } from '../types';
import { Language, translations } from '../utils/i18n';

interface VotersTabMobileProps {
  voters: MobileVoter[];
  boothInfo: BoothInfo;
  profiles: Record<number, VoterCampaignProfile>;
  language?: Language;
  onOpenPhoneEditor: (voter: MobileVoter) => void;
  onOpenSupportPicker: (title: string, currentPct: number, currentNotes?: string, voterSno?: number) => void;
  onOpenLogVisit: (voter: MobileVoter) => void;
  onOpenInfluencerAssign: (targetName: string, currentInfId?: string, voterSno?: number) => void;
  onUpdateSurveyMark: (serialNo: number, status: VoterSurveyStatus | null) => void;
  onOpenSlip: (voter: MobileVoter) => void;
}

export const VotersTabMobile: React.FC<VotersTabMobileProps> = ({
  voters,
  boothInfo,
  profiles,
  language = 'te',
  onOpenPhoneEditor,
  onOpenSupportPicker,
  onOpenLogVisit,
  onOpenInfluencerAssign,
  onUpdateSurveyMark,
  onOpenSlip
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStreet, setSelectedStreet] = useState<string>('all');
  const [filterMode, setFilterMode] = useState<
    'all' | 'full' | 'soft' | 'strong' | 'neutral' | 'opponent' | 'exact' | 'similar' | 'kriya_all' | 'voted' | 'has_phone'
  >('all');
  const [visibleCount, setVisibleCount] = useState(30);
  const [activeMenuSno, setActiveMenuSno] = useState<number | null>(null);

  const t = translations[language];

  // Unique streets list for chips
  const streetsList = useMemo(() => {
    const sMap = new Map<string, number>();
    voters.forEach(v => {
      let s = v.sec || '';
      if (s.includes(' - ')) {
        s = s.split(' - ').slice(1).join(' - ');
      }
      if (s) {
        sMap.set(s, (sMap.get(s) || 0) + 1);
      }
    });
    return Array.from(sMap.entries()).sort((a, b) => b[1] - a[1]);
  }, [voters]);

  // Filter Voters
  const filteredVoters = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();

    return voters.filter(v => {
      const prof = profiles[v.s] || {};
      const pct = prof.supportPct !== undefined ? prof.supportPct : (v.kriya ? 100 : 50);
      const phone = prof.customPhone || v.k_m;

      // 1. Text Search
      if (q) {
        const nMatch = v.n.toLowerCase().includes(q);
        const rMatch = v.r.toLowerCase().includes(q);
        const idMatch = v.id.toLowerCase().includes(q);
        const hnMatch = v.hn.toLowerCase().includes(q);
        const pMatch = phone && phone.includes(q);
        const infMatch = prof.influencerName?.toLowerCase().includes(q);
        const secMatch = v.sec?.toLowerCase().includes(q);
        if (!nMatch && !rMatch && !idMatch && !hnMatch && !pMatch && !infMatch && !secMatch) return false;
      }

      // Street Filter
      if (selectedStreet !== 'all') {
        if (!v.sec || !v.sec.includes(selectedStreet)) return false;
      }

      // 2. Leaning / Filter Mode
      if (filterMode === 'full') return pct === 100;
      if (filterMode === 'soft') return pct === 40;
      if (filterMode === 'strong') return pct >= 75 && pct < 100;
      if (filterMode === 'neutral') return pct === 50;
      if (filterMode === 'opponent') return pct === 0;
      if (filterMode === 'exact') return v.k_type === 'exact';
      if (filterMode === 'similar') return v.kriya && v.k_type !== 'exact';
      if (filterMode === 'kriya_all') return v.kriya;
      if (filterMode === 'voted') return prof.survey_status === 'voted';
      if (filterMode === 'has_phone') return !!phone;

      return true;
    });
  }, [voters, searchQuery, selectedStreet, filterMode, profiles]);

  // Counts for pills
  const counts = useMemo(() => {
    let full = 0;
    let soft = 0;
    let strong = 0;
    let neutral = 0;
    let opponent = 0;
    let exact = 0;
    let similar = 0;
    let kriyaAll = 0;
    let voted = 0;
    let hasPhone = 0;

    voters.forEach(v => {
      const prof = profiles[v.s] || {};
      const pct = prof.supportPct !== undefined ? prof.supportPct : (v.kriya ? 100 : 50);
      const phone = prof.customPhone || v.k_m;

      if (pct === 100) full++;
      else if (pct >= 75) strong++;
      else if (pct === 40) soft++;
      else if (pct === 0) opponent++;
      else neutral++;

      if (v.kriya) {
        kriyaAll++;
        if (v.k_type === 'exact') exact++;
        else similar++;
      }

      if (prof.survey_status === 'voted') voted++;
      if (phone) hasPhone++;
    });

    return { all: voters.length, full, soft, strong, neutral, opponent, exact, similar, kriyaAll, voted, hasPhone };
  }, [voters, profiles]);

  const displayedVoters = filteredVoters.slice(0, visibleCount);

  const getLeaningBadge = (pct?: number) => {
    const p = pct !== undefined ? pct : 50;
    if (p === 100) {
      return (
        <span className="px-1.5 py-0.2 bg-red-600/30 text-red-300 border border-red-500/50 rounded-md text-[9px] font-black flex items-center gap-0.5">
          🚩 {language === 'te' ? '100% మనవాళ్లే' : '100% Support'}
        </span>
      );
    }
    if (p >= 75) {
      return (
        <span className="px-1.5 py-0.2 bg-emerald-600/30 text-emerald-300 border border-emerald-500/50 rounded-md text-[9px] font-black flex items-center gap-0.5">
          🟢 {p}% {language === 'te' ? 'అనుకూలం' : 'Strong'}
        </span>
      );
    }
    if (p === 40) {
      return (
        <span className="px-1.5 py-0.2 bg-amber-600/30 text-amber-300 border border-amber-500/50 rounded-md text-[9px] font-black flex items-center gap-0.5">
          🟡 {p}% {language === 'te' ? 'సానుకూలం' : 'Positive'}
        </span>
      );
    }
    if (p === 0) {
      return (
        <span className="px-1.5 py-0.2 bg-rose-950/80 text-rose-400 border border-rose-500/50 rounded-md text-[9px] font-black flex items-center gap-0.5">
          🔴 0% {language === 'te' ? 'ప్రత్యర్థి' : 'Opponent'}
        </span>
      );
    }
    if (p <= 25) {
      return (
        <span className="px-1.5 py-0.2 bg-orange-600/30 text-orange-300 border border-orange-500/50 rounded-md text-[9px] font-bold flex items-center gap-0.5">
          🟠 {p}% {language === 'te' ? 'అనుమానం' : 'Doubtful'}
        </span>
      );
    }
    return (
      <span className="px-1.5 py-0.2 bg-slate-800 text-slate-400 border border-slate-700 rounded-md text-[9px] font-medium flex items-center gap-0.5">
        ⚪ 50% {language === 'te' ? 'తేల్చుకోలేదు' : 'Neutral'}
      </span>
    );
  };

  const getStatusBadge = (status?: VoterSurveyStatus | null) => {
    switch (status) {
      case 'voted':
        return <span className="px-1.5 py-0.5 bg-emerald-600/30 text-emerald-300 border border-emerald-500/40 rounded text-[9px] font-bold flex items-center gap-0.5">✅ {t.markVoted}</span>;
      case 'supporter':
        return <span className="px-1.5 py-0.5 bg-red-600/30 text-red-300 border border-red-500/40 rounded text-[9px] font-bold flex items-center gap-0.5">🚩 {language === 'te' ? 'మద్దతుదారు' : 'Supporter'}</span>;
      case 'visited':
        return <span className="px-1.5 py-0.5 bg-blue-600/30 text-blue-300 border border-blue-500/40 rounded text-[9px] font-bold flex items-center gap-0.5">📋 {language === 'te' ? 'వెళ్లాము' : 'Visited'}</span>;
      case 'opponent':
        return <span className="px-1.5 py-0.5 bg-slate-700/60 text-slate-300 border border-slate-600 rounded text-[9px] font-bold flex items-center gap-0.5">🔴 {language === 'te' ? 'ప్రత్యర్థి' : 'Opponent'}</span>;
      case 'doubtful':
        return <span className="px-1.5 py-0.5 bg-amber-600/30 text-amber-300 border border-amber-500/40 rounded text-[9px] font-bold flex items-center gap-0.5">⚠️ {language === 'te' ? 'అనుమానం' : 'Doubtful'}</span>;
      default:
        return null;
    }
  };

  return (
    <div className="space-y-3 pb-24 text-xs">
      {/* Search Input */}
      <div className="sticky top-[51px] z-30 bg-slate-950/95 backdrop-blur-md pt-2 pb-1 space-y-2">
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={e => {
              setSearchQuery(e.target.value);
              setVisibleCount(30);
            }}
            placeholder={t.searchPlaceholder}
            className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-400 shadow-md"
          />
        </div>

        {/* Street / Locality Quick Filter Chips */}
        {streetsList.length > 1 && (
          <div className="flex items-center gap-1.5 overflow-x-auto py-0.5 scrollbar-none text-[10.5px]">
            <span className="text-slate-500 font-bold flex-shrink-0 flex items-center gap-1">
              📍 {language === 'te' ? 'వీధి:' : 'Street:'}
            </span>
            <button
              onClick={() => { setSelectedStreet('all'); setVisibleCount(30); }}
              className={`px-2 py-0.5 rounded-md font-bold whitespace-nowrap transition-all ${
                selectedStreet === 'all'
                  ? 'bg-blue-600 text-white font-black'
                  : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
              }`}
            >
              {language === 'te' ? 'అన్ని వీధులు' : 'All Streets'}
            </button>
            {streetsList.map(([stName, cnt]) => (
              <button
                key={stName}
                onClick={() => { setSelectedStreet(stName); setVisibleCount(30); }}
                className={`px-2 py-0.5 rounded-md font-bold whitespace-nowrap transition-all flex items-center gap-1 ${
                  selectedStreet === stName
                    ? 'bg-blue-500 text-slate-950 font-black'
                    : 'bg-slate-900 text-blue-300 hover:text-white border border-blue-500/30'
                }`}
              >
                <span>{stName}</span>
                <span className="font-mono text-[9.5px] opacity-80">({cnt})</span>
              </button>
            ))}
          </div>
        )}

        {/* Filter Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto py-1 scrollbar-none text-[11px]">
          <button
            onClick={() => { setFilterMode('all'); setVisibleCount(30); }}
            className={`px-2.5 py-1 rounded-lg font-bold whitespace-nowrap transition-all ${
              filterMode === 'all'
                ? 'bg-amber-500 text-slate-950 font-black shadow-sm'
                : 'bg-slate-900 text-slate-400 border border-slate-800'
            }`}
          >
            {t.filterAll} ({counts.all})
          </button>

          <button
            onClick={() => { setFilterMode('full'); setVisibleCount(30); }}
            className={`px-2.5 py-1 rounded-lg font-bold whitespace-nowrap transition-all flex items-center gap-1 ${
              filterMode === 'full'
                ? 'bg-red-600 text-white font-black shadow-sm'
                : 'bg-slate-900 text-red-300 border border-red-500/30'
            }`}
          >
            <span>{t.filterFull} ({counts.full})</span>
          </button>

          <button
            onClick={() => { setFilterMode('soft'); setVisibleCount(30); }}
            className={`px-2.5 py-1 rounded-lg font-bold whitespace-nowrap transition-all flex items-center gap-1 ${
              filterMode === 'soft'
                ? 'bg-amber-600 text-slate-950 font-black shadow-sm'
                : 'bg-slate-900 text-amber-300 border border-amber-500/30'
            }`}
          >
            <span>{t.filterSoft} ({counts.soft})</span>
          </button>

          <button
            onClick={() => { setFilterMode('strong'); setVisibleCount(30); }}
            className={`px-2.5 py-1 rounded-lg font-bold whitespace-nowrap transition-all flex items-center gap-1 ${
              filterMode === 'strong'
                ? 'bg-emerald-600 text-white font-black shadow-sm'
                : 'bg-slate-900 text-emerald-300 border border-emerald-500/30'
            }`}
          >
            <span>{t.filterStrong} ({counts.strong})</span>
          </button>

          <button
            onClick={() => { setFilterMode('has_phone'); setVisibleCount(30); }}
            className={`px-2.5 py-1 rounded-lg font-bold whitespace-nowrap transition-all flex items-center gap-1 ${
              filterMode === 'has_phone'
                ? 'bg-blue-600 text-white font-black shadow-sm'
                : 'bg-slate-900 text-blue-300 border border-blue-500/30'
            }`}
          >
            <span>{t.filterPhone} ({counts.hasPhone})</span>
          </button>

          <button
            onClick={() => { setFilterMode('exact'); setVisibleCount(30); }}
            className={`px-2.5 py-1 rounded-lg font-bold whitespace-nowrap transition-all flex items-center gap-1 ${
              filterMode === 'exact'
                ? 'bg-gradient-to-r from-red-600 to-amber-600 text-white font-black shadow-sm'
                : 'bg-slate-900 text-amber-300 border border-amber-500/30'
            }`}
          >
            <span>{t.filterKriya} ({counts.exact})</span>
          </button>

          <button
            onClick={() => { setFilterMode('voted'); setVisibleCount(30); }}
            className={`px-2.5 py-1 rounded-lg font-bold whitespace-nowrap transition-all flex items-center gap-1 ${
              filterMode === 'voted'
                ? 'bg-emerald-600 text-white font-black shadow-sm'
                : 'bg-slate-900 text-emerald-400 border border-emerald-500/30'
            }`}
          >
            <span>{t.filterVoted} ({counts.voted})</span>
          </button>

          <button
            onClick={() => { setFilterMode('opponent'); setVisibleCount(30); }}
            className={`px-2.5 py-1 rounded-lg font-bold whitespace-nowrap transition-all flex items-center gap-1 ${
              filterMode === 'opponent'
                ? 'bg-rose-900 text-rose-200 font-black shadow-sm'
                : 'bg-slate-900 text-rose-400 border border-rose-500/30'
            }`}
          >
            <span>{t.filterOpponent} ({counts.opponent})</span>
          </button>
        </div>
      </div>

      {/* Showing Count */}
      <div className="flex items-center justify-between text-[11px] text-slate-400 px-1">
        <span>
          {language === 'te' ? (
            <>
              <strong className="text-white">{displayedVoters.length}</strong> మంది ఓటర్లు కనిపిస్తున్నారు (మొత్తం: <strong className="text-amber-400 font-mono font-bold">{filteredVoters.length}</strong>)
            </>
          ) : (
            <>
              Showing <strong className="text-white">{displayedVoters.length}</strong> of <strong className="text-amber-400">{filteredVoters.length}</strong> electors
            </>
          )}
        </span>
        {searchQuery && (
          <button 
            onClick={() => setSearchQuery('')}
            className="text-amber-400 font-bold hover:underline"
          >
            {t.clearSearch}
          </button>
        )}
      </div>

      {/* Voter Cards List */}
      <div className="space-y-2.5">
        {displayedVoters.map(v => {
          const prof = profiles[v.s] || {};
          const phone = prof.customPhone || v.k_m;
          const pct = prof.supportPct !== undefined ? prof.supportPct : (v.kriya ? 100 : 50);

          return (
            <div
              key={v.s}
              className={`bg-slate-900/90 border rounded-2xl p-3.5 space-y-2.5 transition-all shadow-md relative ${
                pct === 100
                  ? 'border-red-500/50 bg-gradient-to-r from-red-950/25 via-slate-900 to-slate-900'
                  : pct >= 75
                    ? 'border-emerald-500/40 bg-gradient-to-r from-emerald-950/20 via-slate-900 to-slate-900'
                    : pct === 40
                      ? 'border-amber-500/40 bg-gradient-to-r from-amber-950/20 via-slate-900 to-slate-900'
                      : pct === 0
                        ? 'border-rose-900 bg-rose-950/20'
                        : 'border-slate-800/80 hover:border-slate-700'
              }`}
            >
              {/* Card Top Row: S.No, EPIC, Leaning & Survey Status */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <span className="px-2 py-0.5 bg-amber-500/20 text-amber-300 border border-amber-500/40 rounded-md text-[11px] font-mono font-black">
                    #{v.s}
                  </span>
                  <span className="font-mono text-[11px] font-bold text-emerald-400 bg-slate-950 px-2 py-0.5 rounded border border-slate-800">
                    {v.id || 'NO-EPIC'}
                  </span>
                </div>

                <div className="flex items-center gap-1.5">
                  {getStatusBadge(prof.survey_status)}
                  <button
                    onClick={() => onOpenSupportPicker(v.n, pct, prof.notes, v.s)}
                    className="hover:scale-105 transition-transform"
                    title={language === 'te' ? 'మద్దతు శాతాన్ని మార్చడానికి ట్యాప్ చేయండి' : 'Tap to change political leaning %'}
                  >
                    {getLeaningBadge(pct)}
                  </button>
                </div>
              </div>

              {/* Name, Kriya Badge & Details */}
              <div>
                <div className="flex items-center gap-1.5 flex-wrap">
                  <h3 className="text-sm font-black text-white">{v.n}</h3>
                  {v.kriya && (
                    <span 
                      className={`px-1.5 py-0.2 rounded text-[8px] font-extrabold uppercase tracking-wide flex items-center gap-0.5 ${
                        v.k_type === 'exact'
                          ? 'bg-gradient-to-r from-red-600 to-amber-600 text-white'
                          : 'bg-gradient-to-r from-amber-500 to-yellow-500 text-slate-950'
                      }`}
                    >
                      {v.k_type === 'exact' ? (language === 'te' ? '⭐ పక్కా క్రియా' : '⭐ Kriya Exact') : (language === 'te' ? '⚡ క్రియా మ్యాచింగ్' : '⚡ Kriya Similar')}
                    </span>
                  )}
                </div>

                <div className="text-[11px] text-slate-400 mt-0.5 flex items-center gap-2 flex-wrap">
                  <span>{t.relation}: <strong className="text-slate-300 font-medium">{v.r || '-'}</strong></span>
                  <span>•</span>
                  <span>{t.age}: <strong className="text-slate-300 font-medium">{v.a}Y ({v.g === 'M' ? (language === 'te' ? 'పురుషుడు' : 'M') : (language === 'te' ? 'మహిళ' : 'F')})</strong></span>
                  <span>•</span>
                  <span className="flex items-center gap-1">
                    <Home className="w-3 h-3 text-amber-400" />
                    {t.houseNo}: <strong className="text-amber-300 font-mono">{v.hn || '-'}</strong>
                  </span>
                </div>

                {/* Local Election & Street Information */}
                {(v.ward_no || v.ac_part || v.sec) && (
                  <div className="flex items-center gap-1.5 flex-wrap text-[10px] text-slate-400 mt-1">
                    {v.ward_no && (
                      <span className="bg-blue-950/60 text-blue-300 border border-blue-500/30 px-1.5 py-0.2 rounded font-bold font-mono">
                        🏛️ వార్డు #{v.ward_no}
                      </span>
                    )}
                    {v.ac_part && (
                      <span className="bg-slate-950 text-slate-300 border border-slate-800 px-1.5 py-0.2 rounded font-mono text-[9.5px]">
                        శాసనసభ: AC 37 - బూత్ #{v.ac_part} (క్రమం #{v.ac_sno})
                      </span>
                    )}
                    {v.sec && (
                      <span className="text-amber-300/90 text-[10px] truncate max-w-[260px]">
                        📍 {v.sec.includes(' - ') ? v.sec.split(' - ').slice(1).join(' - ') : v.sec}
                      </span>
                    )}
                  </div>
                )}

                {/* Contact Phone Row (Kriya Phone + Custom Phone) */}
                <div className="mt-2 pt-1.5 border-t border-slate-800/80 flex items-center justify-between text-[11px] flex-wrap gap-1">
                  <div className="flex items-center gap-2">
                    {v.k_m && (
                      <span className="text-red-300 font-mono text-[10px] bg-red-950/40 px-1.5 py-0.5 rounded border border-red-500/30">
                        🚩 Kriya: {v.k_m}
                      </span>
                    )}

                    {prof.customPhone && prof.customPhone !== v.k_m && (
                      <span className="text-emerald-400 font-mono text-[10px] bg-emerald-950/40 px-1.5 py-0.5 rounded border border-emerald-500/30">
                        📱 Phone: {prof.customPhone}
                      </span>
                    )}

                    {!phone && (
                      <span className="text-slate-500 text-[10px] italic">{t.noPhoneAdded}</span>
                    )}
                  </div>

                  <button
                    onClick={() => onOpenPhoneEditor(v)}
                    className="text-amber-400 hover:text-amber-300 font-bold text-[10px] underline flex items-center gap-0.5"
                  >
                    {phone ? t.editPhone : t.addPhone}
                  </button>
                </div>

                {/* Influencer Tag */}
                <div className="mt-1 flex items-center justify-between text-[10px] text-slate-400">
                  <div className="flex items-center gap-1">
                    <UserCheck className="w-3 h-3 text-amber-400" />
                    <span>{t.influencer}:</span>
                    <strong className="text-white">{prof.influencerName || t.noneAssigned}</strong>
                  </div>

                  <button
                    onClick={() => onOpenInfluencerAssign(v.n, prof.influencerId, v.s)}
                    className="text-amber-400 hover:underline font-bold"
                  >
                    {prof.influencerName ? t.changeLead : t.assignLead}
                  </button>
                </div>

                {/* Notes if any */}
                {prof.notes && (
                  <p className="mt-1 text-[10px] text-amber-300/90 italic bg-slate-950/40 p-1.5 rounded-lg border border-slate-800">
                    📝 {prof.notes}
                  </p>
                )}

                {/* Visits Touchpoints Row */}
                <div className="mt-1.5 flex items-center justify-between text-[10px] bg-slate-950/80 p-1.5 rounded-xl border border-slate-800">
                  <div className="flex items-center gap-1.5 text-slate-300">
                    <Clock className="w-3.5 h-3.5 text-amber-400 flex-shrink-0" />
                    <span>{t.visitsLogged}: <strong className="text-white font-mono font-bold">{prof.visits?.length || 0}</strong></span>
                    {prof.visits && prof.visits.length > 0 && (
                      <span className="text-amber-400/90 truncate max-w-[120px] text-[9px] italic">
                        • {prof.visits[0].keyIssue}
                      </span>
                    )}
                  </div>
                  <button
                    onClick={() => onOpenLogVisit(v)}
                    className="text-amber-400 hover:text-amber-300 font-black text-[10px] flex items-center gap-0.5 bg-amber-500/10 hover:bg-amber-500/20 px-2 py-0.5 rounded-lg border border-amber-500/30 transition-all"
                  >
                    <span>{prof.visits && prof.visits.length > 0 ? t.addVisit : t.logVisit}</span>
                  </button>
                </div>
              </div>

              {/* Action Buttons Bar: Call, WhatsApp, SMS, Slip, Mark */}
              <div className="flex items-center justify-between pt-1 border-t border-slate-800/60 gap-1.5">
                <div className="flex items-center gap-1">
                  {/* Call */}
                  {phone ? (
                    <a
                      href={`tel:${phone}`}
                      className="p-1.5 bg-slate-800 hover:bg-slate-700 text-emerald-400 rounded-lg border border-slate-700 text-xs flex items-center gap-1 font-bold"
                      title="Call Voter"
                    >
                      <PhoneCall className="w-3 h-3 text-emerald-400" />
                      <span>{t.call}</span>
                    </a>
                  ) : (
                    <button
                      onClick={() => onOpenPhoneEditor(v)}
                      className="p-1.5 bg-slate-950 text-slate-500 rounded-lg border border-slate-800 text-xs flex items-center gap-1"
                      title="Add phone number to call"
                    >
                      <Phone className="w-3 h-3" />
                      <span>+Phone</span>
                    </button>
                  )}

                  {/* WhatsApp */}
                  {phone ? (
                    <a
                      href={`https://wa.me/91${phone}?text=${encodeURIComponent(
                        boothInfo.election_type === 'municipal'
                          ? `నమస్కారం ${v.n} గారు, జనసేన పార్టీ ${boothInfo.local_body || 'పురపాలక సంఘం'} ${boothInfo.ward_no ? `${boothInfo.ward_no}వ వార్డు` : ''} ఎన్నికల ప్రచారం కొరకు సంప్రదిస్తున్నాము. మీ వార్డు ఓటరు క్రమ సంఖ్య: #${v.s}, శాసనసభ బూత్: Part #${v.ac_part || ''}. మన గాజు గ్లాసు గుర్తుపై ఓటు వేసి వార్డును అభివృద్ధి చేసుకుందాం! 🚩`
                          : `నమస్కారం ${v.n} గారు, జనసేన పార్టీ పిఠాపురం బూత్ #${boothInfo.part_no} నుండి సంప్రదిస్తున్నాము. మీ ఓటరు క్రమ సంఖ్య: #${v.s}, పోలింగ్ బూత్: ${boothInfo.clean_village}. మన గాజు గ్లాసు గుర్తుపై ఓటు వేసి పవన్ కళ్యాణ్ గారిని గెలిపించండి! 🚩`
                      )}`}
                      target="_blank"
                      rel="noreferrer"
                      className="p-1.5 bg-emerald-600/20 hover:bg-emerald-600 text-emerald-400 hover:text-white rounded-lg border border-emerald-500/30 transition-all text-xs flex items-center gap-1 font-bold"
                      title="Send WhatsApp message"
                    >
                      <MessageSquare className="w-3 h-3" />
                      <span>{t.whatsapp}</span>
                    </a>
                  ) : null}

                  {/* SMS */}
                  {phone ? (
                    <a
                      href={`sms:${phone}?body=${encodeURIComponent(`నమస్కారం ${v.n} గారు, పిఠాపురం జనసేన అభ్యర్థి పవన్ కళ్యాణ్ గారికి గాజు గ్లాసు గుర్తుపై ఓటు వేసి గెలిపించండి.`)}`}
                      className="p-1.5 bg-blue-600/20 hover:bg-blue-600 text-blue-300 hover:text-white rounded-lg border border-blue-500/30 transition-all text-xs flex items-center gap-1 font-bold"
                      title="Send SMS"
                    >
                      <Send className="w-3 h-3" />
                      <span>{t.sms}</span>
                    </a>
                  ) : null}

                  {/* Slip */}
                  <button
                    onClick={() => onOpenSlip(v)}
                    className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg border border-slate-700 text-xs flex items-center gap-1 font-bold"
                    title="View & Share Voter Slip"
                  >
                    <Printer className="w-3 h-3 text-amber-400" />
                    <span>{t.slip}</span>
                  </button>
                </div>

                {/* Status Toggle Menu */}
                <div className="relative">
                  <button
                    onClick={() => setActiveMenuSno(activeMenuSno === v.s ? null : v.s)}
                    className={`px-2 py-1 rounded-lg text-[10px] font-bold border transition-all flex items-center gap-1 ${
                      prof.survey_status
                        ? 'bg-amber-500/20 border-amber-500/40 text-amber-300 font-extrabold'
                        : 'bg-slate-800 hover:bg-slate-700 text-slate-400 border-slate-700'
                    }`}
                  >
                    <span>{prof.survey_status ? prof.survey_status.toUpperCase() : t.pollStatus}</span>
                  </button>

                  {/* Status Dropdown */}
                  {activeMenuSno === v.s && (
                    <div className="absolute right-0 bottom-8 z-30 bg-slate-900 border border-amber-500/40 rounded-xl p-1.5 shadow-2xl w-44 space-y-1 animate-in fade-in duration-100">
                      <button
                        onClick={() => { onUpdateSurveyMark(v.s, 'voted'); setActiveMenuSno(null); }}
                        className="w-full text-left px-2 py-1.5 rounded-lg text-[11px] font-bold text-emerald-300 hover:bg-emerald-950/40 flex items-center gap-1.5"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> {t.markVoted}
                      </button>
                      <button
                        onClick={() => { onUpdateSurveyMark(v.s, 'supporter'); setActiveMenuSno(null); }}
                        className="w-full text-left px-2 py-1.5 rounded-lg text-[11px] font-bold text-red-300 hover:bg-red-950/40 flex items-center gap-1.5"
                      >
                        <Flag className="w-3.5 h-3.5 text-red-400" /> {t.markSupporter}
                      </button>
                      <button
                        onClick={() => { onUpdateSurveyMark(v.s, 'visited'); setActiveMenuSno(null); }}
                        className="w-full text-left px-2 py-1.5 rounded-lg text-[11px] font-bold text-blue-300 hover:bg-blue-950/40 flex items-center gap-1.5"
                      >
                        <Sparkles className="w-3.5 h-3.5 text-blue-400" /> {t.doorVisited}
                      </button>
                      <button
                        onClick={() => { onUpdateSurveyMark(v.s, 'doubtful'); setActiveMenuSno(null); }}
                        className="w-full text-left px-2 py-1.5 rounded-lg text-[11px] font-bold text-amber-300 hover:bg-amber-950/40 flex items-center gap-1.5"
                      >
                        <AlertCircle className="w-3.5 h-3.5 text-amber-400" /> {t.markDoubtful}
                      </button>
                      <button
                        onClick={() => { onUpdateSurveyMark(v.s, 'opponent'); setActiveMenuSno(null); }}
                        className="w-full text-left px-2 py-1.5 rounded-lg text-[11px] font-bold text-slate-300 hover:bg-slate-800 flex items-center gap-1.5"
                      >
                        <UserX className="w-3.5 h-3.5 text-slate-400" /> {t.markOpponent}
                      </button>
                      {prof.survey_status && (
                        <button
                          onClick={() => { onUpdateSurveyMark(v.s, null); setActiveMenuSno(null); }}
                          className="w-full text-left px-2 py-1 rounded-lg text-[10px] text-slate-400 hover:text-white hover:bg-slate-800 border-t border-slate-800 mt-1"
                        >
                          {t.clearStatus}
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Load More Button */}
      {displayedVoters.length < filteredVoters.length && (
        <button
          onClick={() => setVisibleCount(prev => prev + 30)}
          className="w-full py-3 bg-slate-900 hover:bg-slate-800 text-amber-400 font-black rounded-2xl border border-slate-800 text-xs shadow-md transition-all flex items-center justify-center gap-1"
        >
          {language === 'te' 
            ? `ఇంకా ఓటర్లను చూడండి (${filteredVoters.length - displayedVoters.length} మిగిలి ఉన్నారు) ↓` 
            : `Load More Electors (${filteredVoters.length - displayedVoters.length} remaining) ↓`}
        </button>
      )}

      {filteredVoters.length === 0 && (
        <div className="py-12 text-center text-slate-500 text-xs space-y-1">
          <p className="font-bold text-slate-300 text-sm">{t.noVotersMatch}</p>
          <p>{t.tryAnotherSearch}</p>
        </div>
      )}
    </div>
  );
};
