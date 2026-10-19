import React, { useState, useMemo } from 'react';
import {
  Trophy,
  Target,
  Users,
  Flame,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  PhoneCall,
  MessageSquare,
  ShieldCheck,
  Send,
  DownloadCloud,
  FileSpreadsheet,
  CheckCircle2,
  ChevronRight,
  Filter,
  UserCheck,
  Home,
  Clock,
  Sparkles
} from 'lucide-react';
import {
  BoothData,
  MobileVoter,
  VoterCampaignProfile,
  WinningScoreCalculation,
  Influencer,
  FamilyGroup
} from '../types';
import {
  calculateWinningScore,
  exportSurveyReportCsv,
  downloadBoothAsJson
} from '../utils/storage';
import { Language, translations } from '../utils/i18n';

interface WarRoomTabMobileProps {
  boothData: BoothData;
  profiles: Record<number, VoterCampaignProfile>;
  influencers: Record<string, Influencer>;
  families: Record<string, FamilyGroup>;
  language?: Language;
  onOpenPhoneEditor: (voter: MobileVoter) => void;
  onOpenSupportPicker: (title: string, currentPct: number, currentNotes?: string, voterSno?: number) => void;
  onOpenLogVisit: (voter: MobileVoter) => void;
  onOpenInfluencerAssign: (targetName: string, currentInfId?: string, voterSno?: number) => void;
  onOpenSlip: (voter: MobileVoter) => void;
}

type WarRoomFilter = 'swing' | 'unvisited' | 'doubtful' | 'supporters' | 'opponents' | 'all';

export const WarRoomTabMobile: React.FC<WarRoomTabMobileProps> = ({
  boothData,
  profiles,
  influencers,
  families,
  language = 'te',
  onOpenPhoneEditor,
  onOpenSupportPicker,
  onOpenLogVisit,
  onOpenInfluencerAssign,
  onOpenSlip
}) => {
  const [activeFilter, setActiveFilter] = useState<WarRoomFilter>('swing');
  const t = translations[language];

  // Calculate dynamic winning score
  const winningScore: WinningScoreCalculation = useMemo(() => {
    return calculateWinningScore(boothData, profiles);
  }, [boothData, profiles]);

  // Analyze visits & ground issues
  const visitStats = useMemo(() => {
    let totalVisitsLogged = 0;
    let visitedVotersCount = 0;
    const issueMap: Record<string, number> = {};

    boothData.voters.forEach(v => {
      const p = profiles[v.s];
      if (p?.visits && p.visits.length > 0) {
        visitedVotersCount++;
        totalVisitsLogged += p.visits.length;
        p.visits.forEach(vis => {
          const iss = vis.keyIssue || 'General Campaign';
          issueMap[iss] = (issueMap[iss] || 0) + 1;
        });
      }
    });

    const sortedIssues = Object.entries(issueMap)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);

    return { totalVisitsLogged, visitedVotersCount, sortedIssues };
  }, [boothData, profiles]);

  // Segment Voters into Actionable War Room Lists
  const { swingVoters, unvisitedVoters, doubtfulVoters, confirmedSupporters, opponentVoters } = useMemo(() => {
    const swing: MobileVoter[] = [];
    const unvisited: MobileVoter[] = [];
    const doubtful: MobileVoter[] = [];
    const supporters: MobileVoter[] = [];
    const opponents: MobileVoter[] = [];

    boothData.voters.forEach(v => {
      const p = profiles[v.s] || {};
      const pct = p.supportPct !== undefined ? p.supportPct : (v.kriya ? 100 : 50);
      const visits = p.visits || [];

      // Swing: 40% Positive or 50% Neutral
      if (pct === 40 || pct === 50) {
        swing.push(v);
      }

      // Unvisited: 0 visits logged
      if (visits.length === 0) {
        unvisited.push(v);
      }

      // Doubtful: <= 25% but not 0%
      if (pct > 0 && pct <= 25) {
        doubtful.push(v);
      }

      // Confirmed Supporters: 100% or >= 75%
      if (pct >= 75) {
        supporters.push(v);
      }

      // Opponents: 0%
      if (pct === 0) {
        opponents.push(v);
      }
    });

    return {
      swingVoters: swing,
      unvisitedVoters: unvisited,
      doubtfulVoters: doubtful,
      confirmedSupporters: supporters,
      opponentVoters: opponents
    };
  }, [boothData, profiles]);

  const displayedList = useMemo(() => {
    switch (activeFilter) {
      case 'swing': return swingVoters;
      case 'unvisited': return unvisitedVoters;
      case 'doubtful': return doubtfulVoters;
      case 'supporters': return confirmedSupporters;
      case 'opponents': return opponentVoters;
      default: return boothData.voters;
    }
  }, [activeFilter, swingVoters, unvisitedVoters, doubtfulVoters, confirmedSupporters, opponentVoters, boothData.voters]);

  return (
    <div className="space-y-4 pb-24 text-xs">
      {/* War Room Header */}
      <div className="bg-gradient-to-r from-red-950 via-slate-900 to-amber-950/80 border border-amber-500/40 rounded-3xl p-4 shadow-2xl relative overflow-hidden">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-amber-500 text-slate-950 rounded-xl font-black">
              <Trophy className="w-5 h-5 text-slate-950" />
            </div>
            <div>
              <span className="text-[10px] uppercase font-bold text-amber-400 tracking-wider">
                {t.candidateVictoryRoom}
              </span>
              <h2 className="text-base font-black text-white">
                {language === 'te' ? `బూత్ #${boothData.booth_info.part_no} — అభ్యర్థి గెలుపు అస్త్రం` : `Booth #${boothData.booth_info.part_no} — Winning Weapon`}
              </h2>
            </div>
          </div>

          <div className={`px-2.5 py-1 rounded-full text-[10px] font-black font-mono border ${
            winningScore.projectedLead >= 0
              ? 'bg-emerald-600/30 text-emerald-300 border-emerald-500/50'
              : 'bg-rose-950/80 text-rose-300 border-rose-500/50'
          }`}>
            {winningScore.projectedLead >= 0 ? `+${winningScore.projectedLead} ${language === 'te' ? 'ఆధిక్యం' : 'LEAD'}` : `${winningScore.projectedLead} ${language === 'te' ? 'లోటు' : 'DEFICIT'}`}
          </div>
        </div>

        {/* Live Numbers Grid */}
        <div className="grid grid-cols-4 gap-2 mt-4 text-center">
          <div className="bg-slate-950/80 border border-slate-800 rounded-2xl p-2.5">
            <span className="text-[10px] text-slate-400 block font-bold">{t.targetToWin}</span>
            <span className="text-sm font-black text-amber-400 font-mono">{winningScore.targetVotesToWin}</span>
            <span className="text-[9px] text-slate-500 block font-mono">50% + 1 vote</span>
          </div>

          <div className="bg-slate-950/80 border border-red-500/30 rounded-2xl p-2.5">
            <span className="text-[10px] text-red-300 block font-bold">{t.projectedJsp}</span>
            <span className="text-sm font-black text-red-400 font-mono">{winningScore.projectedJspVotes}</span>
            <span className="text-[9px] text-red-400/80 block font-mono">
              {Math.round((winningScore.projectedJspVotes / winningScore.targetVotesToWin) * 100)}% Goal
            </span>
          </div>

          <div className="bg-slate-950/80 border border-rose-500/30 rounded-2xl p-2.5">
            <span className="text-[10px] text-rose-300 block font-bold">{t.projectedOpp}</span>
            <span className="text-sm font-black text-rose-400 font-mono">{winningScore.projectedOpponentVotes}</span>
            <span className="text-[9px] text-rose-400/80 block font-mono">Counter bank</span>
          </div>

          <div className="bg-slate-950/80 border border-slate-800 rounded-2xl p-2.5">
            <span className="text-[10px] text-slate-400 block font-bold">{t.swingPot}</span>
            <span className="text-sm font-black text-amber-300 font-mono">{winningScore.projectedNeutralVotes}</span>
            <span className="text-[9px] text-amber-400/80 block font-mono">Undecided</span>
          </div>
        </div>

        {/* Tactical Recommendation Bar */}
        <div className="mt-3 bg-slate-950/90 border border-amber-500/30 rounded-2xl p-3 flex items-start gap-2.5">
          <Target className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <h4 className="text-xs font-black text-amber-300">
              {language === 'te' ? 'అభ్యర్థి & వార్డ్ ఇన్‌చార్జ్ గెలుపు వ్యూహం:' : 'Winning Strategy for Candidate & Ward In-charge:'}
            </h4>
            {winningScore.neededToGuarantee > 0 ? (
              <p className="text-[11px] text-slate-300 mt-0.5 leading-relaxed">
                {language === 'te' ? (
                  <>
                    గెలుపు టార్గెట్ ({winningScore.targetVotesToWin} ఓట్లు) కంటే ప్రస్తుతం <strong className="text-amber-400 font-bold">{winningScore.neededToGuarantee} ఓట్లు తక్కువగా ఉన్నాయి</strong>. కింద ఉన్న <strong className="text-white underline font-bold">{swingVoters.length} మంది స్వింగ్ ఓటర్లపై (40% సానుకూలం / 50% తేల్చుకోనివారు)</strong> దృష్టి పెట్టండి.
                  </>
                ) : (
                  <>
                    You are currently <strong className="text-amber-400 font-bold">{winningScore.neededToGuarantee} votes short</strong> of the absolute win threshold ({winningScore.targetVotesToWin} votes). Focus your visits on the <strong className="text-white underline font-bold">{swingVoters.length} Swing Voters</strong> listed below.
                  </>
                )}
              </p>
            ) : (
              <p className="text-[11px] text-emerald-300 mt-0.5 leading-relaxed">
                🎉 {t.thresholdReached}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Field Intelligence & Touchpoints Summary */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-3.5 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <Clock className="w-4 h-4 text-amber-400" />
            <h3 className="text-xs font-black text-white uppercase tracking-wider">
              {t.touchpointIntel}
            </h3>
          </div>
          <span className="text-[10px] text-slate-400 font-mono">
            {visitStats.visitedVotersCount} / {boothData.voters.length} {language === 'te' ? 'ఓటర్లను కలిశారు' : 'visited'} ({Math.round((visitStats.visitedVotersCount / boothData.voters.length) * 100)}%)
          </span>
        </div>

        <div className="grid grid-cols-3 gap-2 text-center">
          <div className="bg-slate-950 p-2 rounded-xl border border-slate-800">
            <span className="text-[9px] text-slate-400 block">{t.totalVisitsCount}</span>
            <strong className="text-xs text-white font-mono font-bold">{visitStats.totalVisitsLogged}</strong>
          </div>
          <div className="bg-slate-950 p-2 rounded-xl border border-emerald-500/30">
            <span className="text-[9px] text-emerald-300 block">{t.uniqueVotersMet}</span>
            <strong className="text-xs text-emerald-400 font-mono font-bold">{visitStats.visitedVotersCount}</strong>
          </div>
          <div className="bg-slate-950 p-2 rounded-xl border border-rose-500/30">
            <span className="text-[9px] text-rose-300 block">{t.unvisitedElectors}</span>
            <strong className="text-xs text-rose-400 font-mono font-bold">{unvisitedVoters.length}</strong>
          </div>
        </div>

        {/* Top Voter Grievances Raised */}
        {visitStats.sortedIssues.length > 0 && (
          <div className="space-y-1.5 pt-2 border-t border-slate-800">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
              {t.topGrievancesInBooth}
            </span>
            <div className="flex items-center gap-1.5 flex-wrap">
              {visitStats.sortedIssues.map(([issue, count]) => (
                <span
                  key={issue}
                  className="px-2 py-1 bg-slate-950 border border-amber-500/30 text-amber-300 rounded-lg text-[10px] font-medium flex items-center gap-1"
                >
                  <span>📌 {issue}</span>
                  <strong className="text-white font-mono font-black bg-amber-500/20 px-1 rounded">{count}</strong>
                </span>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Actionable Hit List Selector */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-black text-white flex items-center gap-1.5">
            <Target className="w-4 h-4 text-amber-400" />
            <span>{language === 'te' ? 'గెలుపు టార్గెట్ లిస్టులు' : 'Target Action Hit Lists'}</span>
          </h3>
          <span className="text-[10px] text-slate-400 font-mono font-bold">
            {displayedList.length} {language === 'te' ? 'ఓటర్లు' : 'electors'}
          </span>
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto py-1 scrollbar-none text-[11px]">
          <button
            onClick={() => setActiveFilter('swing')}
            className={`px-3 py-1.5 rounded-xl font-black whitespace-nowrap transition-all flex items-center gap-1 ${
              activeFilter === 'swing'
                ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-950/40'
                : 'bg-slate-900 text-amber-300 border border-amber-500/30'
            }`}
          >
            <Flame className="w-3.5 h-3.5" />
            <span>{t.swingHitList} ({swingVoters.length})</span>
          </button>

          <button
            onClick={() => setActiveFilter('unvisited')}
            className={`px-3 py-1.5 rounded-xl font-bold whitespace-nowrap transition-all flex items-center gap-1 ${
              activeFilter === 'unvisited'
                ? 'bg-rose-600 text-white shadow-md'
                : 'bg-slate-900 text-rose-300 border border-rose-500/30'
            }`}
          >
            <span>{t.unvisitedHitList} ({unvisitedVoters.length})</span>
          </button>

          <button
            onClick={() => setActiveFilter('doubtful')}
            className={`px-3 py-1.5 rounded-xl font-bold whitespace-nowrap transition-all flex items-center gap-1 ${
              activeFilter === 'doubtful'
                ? 'bg-orange-600 text-white shadow-md'
                : 'bg-slate-900 text-orange-300 border border-orange-500/30'
            }`}
          >
            <span>{t.doubtfulHitList} ({doubtfulVoters.length})</span>
          </button>

          <button
            onClick={() => setActiveFilter('supporters')}
            className={`px-3 py-1.5 rounded-xl font-bold whitespace-nowrap transition-all flex items-center gap-1 ${
              activeFilter === 'supporters'
                ? 'bg-emerald-600 text-white shadow-md'
                : 'bg-slate-900 text-emerald-300 border border-emerald-500/30'
            }`}
          >
            <span>{t.confirmedHitList} ({confirmedSupporters.length})</span>
          </button>

          <button
            onClick={() => setActiveFilter('opponents')}
            className={`px-3 py-1.5 rounded-xl font-bold whitespace-nowrap transition-all flex items-center gap-1 ${
              activeFilter === 'opponents'
                ? 'bg-slate-700 text-white shadow-md'
                : 'bg-slate-900 text-slate-400 border border-slate-700'
            }`}
          >
            <span>{t.opponentsHitList} ({opponentVoters.length})</span>
          </button>
        </div>
      </div>

      {/* Voter Cards in Selected List */}
      <div className="space-y-2">
        {displayedList.slice(0, 30).map(v => {
          const prof = profiles[v.s] || {};
          const phone = prof.customPhone || v.k_m;
          const pct = prof.supportPct !== undefined ? prof.supportPct : (v.kriya ? 100 : 50);
          const visits = prof.visits || [];

          return (
            <div
              key={v.s}
              className="bg-slate-900/90 border border-slate-800 rounded-2xl p-3 space-y-2 shadow-sm hover:border-amber-500/40 transition-all"
            >
              {/* Header: S.No, EPIC, Leaning */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <span className="px-2 py-0.5 bg-amber-500/20 text-amber-300 border border-amber-500/40 rounded-md text-[10px] font-mono font-black">
                    #{v.s}
                  </span>
                  <span className="font-mono text-[10px] font-bold text-emerald-400 bg-slate-950 px-1.5 py-0.5 rounded border border-slate-800">
                    {v.id || 'NO-EPIC'}
                  </span>
                </div>

                <button
                  onClick={() => onOpenSupportPicker(v.n, pct, prof.notes, v.s)}
                  className="px-2 py-0.5 rounded-md text-[10px] font-black border transition-transform hover:scale-105"
                >
                  {pct === 100 ? (
                    <span className="text-red-400 border-red-500/40 bg-red-950/40 px-1.5 py-0.5 rounded">🚩 100% {language === 'te' ? 'మనవాళ్లే' : 'Support'}</span>
                  ) : pct >= 75 ? (
                    <span className="text-emerald-400 border-emerald-500/40 bg-emerald-950/40 px-1.5 py-0.5 rounded">🟢 {pct}% {language === 'te' ? 'అనుకూలం' : 'Strong'}</span>
                  ) : pct === 40 ? (
                    <span className="text-amber-400 border-amber-500/40 bg-amber-950/40 px-1.5 py-0.5 rounded">🟡 40% {language === 'te' ? 'సానుకూలం' : 'Positive'}</span>
                  ) : pct === 0 ? (
                    <span className="text-rose-400 border-rose-500/40 bg-rose-950/40 px-1.5 py-0.5 rounded">🔴 0% {language === 'te' ? 'ప్రత్యర్థి' : 'Opponent'}</span>
                  ) : (
                    <span className="text-slate-300 border-slate-700 bg-slate-800 px-1.5 py-0.5 rounded">⚪ 50% {language === 'te' ? 'తేల్చుకోలేదు' : 'Neutral'}</span>
                  )}
                </button>
              </div>

              {/* Name, Relative, Door No */}
              <div>
                <h4 className="text-xs font-black text-white">{v.n}</h4>
                <div className="text-[10px] text-slate-400 flex items-center gap-2 mt-0.5 flex-wrap">
                  <span>{t.relation}: <strong className="text-slate-300 font-medium">{v.r || '-'}</strong></span>
                  <span>•</span>
                  <span>{t.age}: <strong className="text-slate-300 font-medium">{v.a}Y ({v.g})</strong></span>
                  <span>•</span>
                  <span>{t.houseNo}: <strong className="text-amber-300 font-mono">{v.hn || '-'}</strong></span>
                </div>
              </div>

              {/* Visit Tracker Status */}
              <div className="flex items-center justify-between text-[10px] bg-slate-950 p-2 rounded-xl border border-slate-800">
                <div className="flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-amber-400" />
                  <span>{t.visitsLogged}: <strong className="text-white font-mono font-bold">{visits.length} {language === 'te' ? 'సార్లు' : 'logged'}</strong></span>
                </div>

                <button
                  onClick={() => onOpenLogVisit(v)}
                  className="px-2 py-0.5 bg-amber-500 text-slate-950 font-black rounded-lg text-[10px] flex items-center gap-1 shadow-sm hover:bg-amber-400"
                >
                  <span>{visits.length > 0 ? t.addVisit : t.logVisit}</span>
                </button>
              </div>

              {/* Action Buttons: Call, WhatsApp, SMS, Assign Influencer */}
              <div className="flex items-center justify-between pt-1 border-t border-slate-800/80 gap-1">
                <div className="flex items-center gap-1">
                  {phone ? (
                    <>
                      <a
                        href={`tel:${phone}`}
                        className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-emerald-400 rounded-lg text-[10px] font-bold flex items-center gap-1"
                      >
                        <PhoneCall className="w-3 h-3 text-emerald-400" />
                        <span>{t.call}</span>
                      </a>
                      <a
                        href={`https://wa.me/91${phone}`}
                        target="_blank"
                        rel="noreferrer"
                        className="px-2 py-1 bg-emerald-600 text-slate-950 font-bold rounded-lg text-[10px] flex items-center gap-1"
                      >
                        <MessageSquare className="w-3 h-3" />
                        <span>{t.whatsapp}</span>
                      </a>
                    </>
                  ) : (
                    <button
                      onClick={() => onOpenPhoneEditor(v)}
                      className="px-2 py-1 bg-slate-950 text-slate-500 rounded-lg text-[10px] border border-slate-800 hover:text-amber-400"
                    >
                      {t.addPhone}
                    </button>
                  )}

                  <button
                    onClick={() => onOpenSlip(v)}
                    className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-[10px] font-bold"
                  >
                    {t.slip}
                  </button>
                </div>

                <button
                  onClick={() => onOpenInfluencerAssign(v.n, prof.influencerId, v.s)}
                  className="text-amber-400 hover:underline text-[10px] font-bold flex items-center gap-0.5"
                >
                  <UserCheck className="w-3 h-3" />
                  <span>{prof.influencerName ? prof.influencerName.split(' ')[0] : t.assignLead}</span>
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {displayedList.length > 30 && (
        <p className="text-center text-[10px] text-slate-500">
          {language === 'te' 
            ? `ఈ లిస్టులో టాప్ 30 మందిని చూపిస్తున్నాము (మొత్తం: ${displayedList.length}). అందరినీ చూడడానికి 'ఓటర్లు' ట్యాబ్‌ను ఉపయోగించండి.` 
            : `Showing top 30 of ${displayedList.length} electors in this target list. Use Voters Tab for full list search.`}
        </p>
      )}

      {/* Export Campaign Command Report */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-3.5 space-y-2 mt-4">
        <h4 className="text-xs font-black text-white flex items-center gap-1.5">
          <DownloadCloud className="w-4 h-4 text-amber-400" />
          <span>{t.reportsAndExports}</span>
        </h4>
        <p className="text-[10px] text-slate-400">
          {t.reportsDesc}
        </p>

        <div className="grid grid-cols-2 gap-2 pt-1">
          <button
            onClick={() => exportSurveyReportCsv(boothData, profiles)}
            className="py-2.5 px-3 bg-emerald-600 hover:bg-emerald-500 text-white font-black rounded-xl text-xs flex items-center justify-center gap-1.5 shadow-md"
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>{t.exportCampaignCsv}</span>
          </button>

          <button
            onClick={() => downloadBoothAsJson(boothData)}
            className="py-2.5 px-3 bg-slate-800 hover:bg-slate-700 text-amber-400 font-bold rounded-xl text-xs border border-slate-700 flex items-center justify-center gap-1.5"
          >
            <DownloadCloud className="w-4 h-4" />
            <span>{t.backupBoothJson}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
