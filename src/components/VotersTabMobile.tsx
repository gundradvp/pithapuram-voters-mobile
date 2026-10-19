import React, { useState, useMemo } from 'react';
import { Search, Phone, PhoneCall, MessageSquare, Send, Printer, CheckCircle2, Flag, UserX, AlertCircle, Sparkles, Home, UserCheck, Sliders, Plus, Clock } from 'lucide-react';
import { MobileVoter, BoothInfo, VoterSurveyStatus, VoterCampaignProfile } from '../types';

interface VotersTabMobileProps {
  voters: MobileVoter[];
  boothInfo: BoothInfo;
  profiles: Record<number, VoterCampaignProfile>;
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
  onOpenPhoneEditor,
  onOpenSupportPicker,
  onOpenLogVisit,
  onOpenInfluencerAssign,
  onUpdateSurveyMark,
  onOpenSlip
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterMode, setFilterMode] = useState<
    'all' | 'full' | 'soft' | 'strong' | 'neutral' | 'opponent' | 'exact' | 'similar' | 'kriya_all' | 'voted' | 'has_phone'
  >('all');
  const [visibleCount, setVisibleCount] = useState(30);
  const [activeMenuSno, setActiveMenuSno] = useState<number | null>(null);

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
        if (!nMatch && !rMatch && !idMatch && !hnMatch && !pMatch && !infMatch) return false;
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
  }, [voters, searchQuery, filterMode, profiles]);

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
          🚩 100% Support
        </span>
      );
    }
    if (p >= 75) {
      return (
        <span className="px-1.5 py-0.2 bg-emerald-600/30 text-emerald-300 border border-emerald-500/50 rounded-md text-[9px] font-black flex items-center gap-0.5">
          🟢 {p}% Strong
        </span>
      );
    }
    if (p === 40) {
      return (
        <span className="px-1.5 py-0.2 bg-amber-600/30 text-amber-300 border border-amber-500/50 rounded-md text-[9px] font-black flex items-center gap-0.5">
          🟡 40% Positive
        </span>
      );
    }
    if (p === 0) {
      return (
        <span className="px-1.5 py-0.2 bg-rose-950/80 text-rose-400 border border-rose-500/50 rounded-md text-[9px] font-black flex items-center gap-0.5">
          🔴 100% Opponent
        </span>
      );
    }
    if (p <= 25) {
      return (
        <span className="px-1.5 py-0.2 bg-orange-600/30 text-orange-300 border border-orange-500/50 rounded-md text-[9px] font-bold flex items-center gap-0.5">
          🟠 {p}% Doubtful
        </span>
      );
    }
    return (
      <span className="px-1.5 py-0.2 bg-slate-800 text-slate-400 border border-slate-700 rounded-md text-[9px] font-medium flex items-center gap-0.5">
        ⚪ 50% Neutral
      </span>
    );
  };

  const getStatusBadge = (status?: VoterSurveyStatus | null) => {
    switch (status) {
      case 'voted':
        return <span className="px-1.5 py-0.5 bg-emerald-600/30 text-emerald-300 border border-emerald-500/40 rounded text-[9px] font-bold flex items-center gap-0.5">✅ Voted</span>;
      case 'supporter':
        return <span className="px-1.5 py-0.5 bg-red-600/30 text-red-300 border border-red-500/40 rounded text-[9px] font-bold flex items-center gap-0.5">🚩 Supporter</span>;
      case 'visited':
        return <span className="px-1.5 py-0.5 bg-blue-600/30 text-blue-300 border border-blue-500/40 rounded text-[9px] font-bold flex items-center gap-0.5">📋 Visited</span>;
      case 'opponent':
        return <span className="px-1.5 py-0.5 bg-slate-700/60 text-slate-300 border border-slate-600 rounded text-[9px] font-bold flex items-center gap-0.5">🔴 Opponent</span>;
      case 'doubtful':
        return <span className="px-1.5 py-0.5 bg-amber-600/30 text-amber-300 border border-amber-500/40 rounded text-[9px] font-bold flex items-center gap-0.5">⚠️ Doubtful</span>;
      case 'shifted':
        return <span className="px-1.5 py-0.5 bg-purple-600/30 text-purple-300 border border-purple-500/40 rounded text-[9px] font-bold flex items-center gap-0.5">✈️ Shifted</span>;
      default:
        return null;
    }
  };

  return (
    <div className="space-y-3 pb-24 text-xs">
      {/* Search Input */}
      <div className="sticky top-[53px] z-30 bg-slate-950/95 backdrop-blur-md pt-2 pb-1 space-y-2">
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={e => {
              setSearchQuery(e.target.value);
              setVisibleCount(30);
            }}
            placeholder="Search Name, Phone, Door No, EPIC, Relative, Influencer..."
            className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-400 shadow-md"
          />
        </div>

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
            All ({counts.all})
          </button>

          <button
            onClick={() => { setFilterMode('full'); setVisibleCount(30); }}
            className={`px-2.5 py-1 rounded-lg font-bold whitespace-nowrap transition-all flex items-center gap-1 ${
              filterMode === 'full'
                ? 'bg-red-600 text-white font-black shadow-sm'
                : 'bg-slate-900 text-red-300 border border-red-500/30'
            }`}
          >
            <span>🚩 100% Full ({counts.full})</span>
          </button>

          <button
            onClick={() => { setFilterMode('soft'); setVisibleCount(30); }}
            className={`px-2.5 py-1 rounded-lg font-bold whitespace-nowrap transition-all flex items-center gap-1 ${
              filterMode === 'soft'
                ? 'bg-amber-600 text-slate-950 font-black shadow-sm'
                : 'bg-slate-900 text-amber-300 border border-amber-500/30'
            }`}
          >
            <span>🟡 40% Positive ({counts.soft})</span>
          </button>

          <button
            onClick={() => { setFilterMode('strong'); setVisibleCount(30); }}
            className={`px-2.5 py-1 rounded-lg font-bold whitespace-nowrap transition-all flex items-center gap-1 ${
              filterMode === 'strong'
                ? 'bg-emerald-600 text-white font-black shadow-sm'
                : 'bg-slate-900 text-emerald-300 border border-emerald-500/30'
            }`}
          >
            <span>🟢 75% Strong ({counts.strong})</span>
          </button>

          <button
            onClick={() => { setFilterMode('has_phone'); setVisibleCount(30); }}
            className={`px-2.5 py-1 rounded-lg font-bold whitespace-nowrap transition-all flex items-center gap-1 ${
              filterMode === 'has_phone'
                ? 'bg-blue-600 text-white font-black shadow-sm'
                : 'bg-slate-900 text-blue-300 border border-blue-500/30'
            }`}
          >
            <span>📱 Has Phone ({counts.hasPhone})</span>
          </button>

          <button
            onClick={() => { setFilterMode('exact'); setVisibleCount(30); }}
            className={`px-2.5 py-1 rounded-lg font-bold whitespace-nowrap transition-all flex items-center gap-1 ${
              filterMode === 'exact'
                ? 'bg-gradient-to-r from-red-600 to-amber-600 text-white font-black shadow-sm'
                : 'bg-slate-900 text-amber-300 border border-amber-500/30'
            }`}
          >
            <span>⭐ Kriya Exact ({counts.exact})</span>
          </button>

          <button
            onClick={() => { setFilterMode('voted'); setVisibleCount(30); }}
            className={`px-2.5 py-1 rounded-lg font-bold whitespace-nowrap transition-all flex items-center gap-1 ${
              filterMode === 'voted'
                ? 'bg-emerald-600 text-white font-black shadow-sm'
                : 'bg-slate-900 text-emerald-400 border border-emerald-500/30'
            }`}
          >
            <span>✅ Voted ({counts.voted})</span>
          </button>

          <button
            onClick={() => { setFilterMode('opponent'); setVisibleCount(30); }}
            className={`px-2.5 py-1 rounded-lg font-bold whitespace-nowrap transition-all flex items-center gap-1 ${
              filterMode === 'opponent'
                ? 'bg-rose-900 text-rose-200 font-black shadow-sm'
                : 'bg-slate-900 text-rose-400 border border-rose-500/30'
            }`}
          >
            <span>🔴 Opponent ({counts.opponent})</span>
          </button>
        </div>
      </div>

      {/* Showing Count */}
      <div className="flex items-center justify-between text-[11px] text-slate-400 px-1">
        <span>
          Showing <strong className="text-white">{displayedVoters.length}</strong> of <strong className="text-amber-400">{filteredVoters.length}</strong> electors
        </span>
        {searchQuery && (
          <button 
            onClick={() => setSearchQuery('')}
            className="text-amber-400 font-bold hover:underline"
          >
            Clear Search
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
                    title="Tap to change political leaning %"
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
                      {v.k_type === 'exact' ? '⭐ Kriya Exact' : '⚡ Kriya Similar'}
                    </span>
                  )}
                </div>

                <div className="text-[11px] text-slate-400 mt-0.5 flex items-center gap-2 flex-wrap">
                  <span>Rel: <strong className="text-slate-300 font-medium">{v.r || '-'}</strong></span>
                  <span>•</span>
                  <span>Age: <strong className="text-slate-300 font-medium">{v.a}Y ({v.g === 'M' ? 'M' : 'F'})</strong></span>
                  <span>•</span>
                  <span className="flex items-center gap-1">
                    <Home className="w-3 h-3 text-amber-400" />
                    H.No: <strong className="text-amber-300 font-mono">{v.hn || '-'}</strong>
                  </span>
                </div>

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
                      <span className="text-slate-500 text-[10px] italic">No phone added</span>
                    )}
                  </div>

                  <button
                    onClick={() => onOpenPhoneEditor(v)}
                    className="text-amber-400 hover:text-amber-300 font-bold text-[10px] underline flex items-center gap-0.5"
                  >
                    {phone ? 'Edit Phone' : '+ Add Phone'}
                  </button>
                </div>

                {/* Influencer Tag */}
                <div className="mt-1 flex items-center justify-between text-[10px] text-slate-400">
                  <div className="flex items-center gap-1">
                    <UserCheck className="w-3 h-3 text-amber-400" />
                    <span>Influencer:</span>
                    <strong className="text-white">{prof.influencerName || 'None Assigned'}</strong>
                  </div>

                  <button
                    onClick={() => onOpenInfluencerAssign(v.n, prof.influencerId, v.s)}
                    className="text-amber-400 hover:underline font-bold"
                  >
                    {prof.influencerName ? 'Change' : '+ Assign'}
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
                    <span>Visits: <strong className="text-white font-mono font-bold">{prof.visits?.length || 0}</strong></span>
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
                    <span>{prof.visits && prof.visits.length > 0 ? '+ Add Visit' : '+ Log Visit'}</span>
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
                      <span>Call</span>
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
                      href={`https://wa.me/91${phone}?text=${encodeURIComponent(`నమస్కారం ${v.n} గారు, జనసేన పార్టీ పిఠాపురం బూత్ #${boothInfo.part_no} నుండి సంప్రదిస్తున్నాము. మీ ఓటరు క్రమ సంఖ్య: #${v.s}, పోలింగ్ బూత్: ${boothInfo.clean_village}. మన గాజు గ్లాసు గుర్తుపై ఓటు వేసి పవన్ కళ్యాణ్ గారిని గెలిపించండి! 🚩`)}`}
                      target="_blank"
                      rel="noreferrer"
                      className="p-1.5 bg-emerald-600/20 hover:bg-emerald-600 text-emerald-400 hover:text-white rounded-lg border border-emerald-500/30 transition-all text-xs flex items-center gap-1 font-bold"
                      title="Send WhatsApp message"
                    >
                      <MessageSquare className="w-3 h-3" />
                      <span>WA</span>
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
                      <span>SMS</span>
                    </a>
                  ) : null}

                  {/* Slip */}
                  <button
                    onClick={() => onOpenSlip(v)}
                    className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg border border-slate-700 text-xs flex items-center gap-1 font-bold"
                    title="View & Share Voter Slip"
                  >
                    <Printer className="w-3 h-3 text-amber-400" />
                    <span>Slip</span>
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
                    <span>{prof.survey_status ? prof.survey_status.toUpperCase() : '+ Poll Status'}</span>
                  </button>

                  {/* Status Dropdown */}
                  {activeMenuSno === v.s && (
                    <div className="absolute right-0 bottom-8 z-30 bg-slate-900 border border-amber-500/40 rounded-xl p-1.5 shadow-2xl w-40 space-y-1 animate-in fade-in duration-100">
                      <button
                        onClick={() => { onUpdateSurveyMark(v.s, 'voted'); setActiveMenuSno(null); }}
                        className="w-full text-left px-2 py-1.5 rounded-lg text-[11px] font-bold text-emerald-300 hover:bg-emerald-950/40 flex items-center gap-1.5"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> Mark Voted
                      </button>
                      <button
                        onClick={() => { onUpdateSurveyMark(v.s, 'supporter'); setActiveMenuSno(null); }}
                        className="w-full text-left px-2 py-1.5 rounded-lg text-[11px] font-bold text-red-300 hover:bg-red-950/40 flex items-center gap-1.5"
                      >
                        <Flag className="w-3.5 h-3.5 text-red-400" /> Mark Supporter
                      </button>
                      <button
                        onClick={() => { onUpdateSurveyMark(v.s, 'visited'); setActiveMenuSno(null); }}
                        className="w-full text-left px-2 py-1.5 rounded-lg text-[11px] font-bold text-blue-300 hover:bg-blue-950/40 flex items-center gap-1.5"
                      >
                        <Sparkles className="w-3.5 h-3.5 text-blue-400" /> Door Visited
                      </button>
                      <button
                        onClick={() => { onUpdateSurveyMark(v.s, 'doubtful'); setActiveMenuSno(null); }}
                        className="w-full text-left px-2 py-1.5 rounded-lg text-[11px] font-bold text-amber-300 hover:bg-amber-950/40 flex items-center gap-1.5"
                      >
                        <AlertCircle className="w-3.5 h-3.5 text-amber-400" /> Doubtful
                      </button>
                      <button
                        onClick={() => { onUpdateSurveyMark(v.s, 'opponent'); setActiveMenuSno(null); }}
                        className="w-full text-left px-2 py-1.5 rounded-lg text-[11px] font-bold text-slate-300 hover:bg-slate-800 flex items-center gap-1.5"
                      >
                        <UserX className="w-3.5 h-3.5 text-slate-400" /> Opponent
                      </button>
                      {prof.survey_status && (
                        <button
                          onClick={() => { onUpdateSurveyMark(v.s, null); setActiveMenuSno(null); }}
                          className="w-full text-left px-2 py-1 rounded-lg text-[10px] text-slate-400 hover:text-white hover:bg-slate-800 border-t border-slate-800 mt-1"
                        >
                          Clear Status
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
          Load More Electors ({filteredVoters.length - displayedVoters.length} remaining) ↓
        </button>
      )}

      {filteredVoters.length === 0 && (
        <div className="py-12 text-center text-slate-500 text-xs space-y-1">
          <p className="font-bold text-slate-300 text-sm">No voters match this filter</p>
          <p>Try searching for a different name, house number, or clearing filter chips.</p>
        </div>
      )}
    </div>
  );
};
