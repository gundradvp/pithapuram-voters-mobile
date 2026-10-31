import React, { useMemo } from 'react';
import { BarChart3, Users, Flag, CheckCircle2, FileSpreadsheet, MapPin, Phone, UserCheck, Sliders } from 'lucide-react';
import { MobileVoter, BoothInfo, VoterSurveyStatus, BoothData, VoterCampaignProfile, FamilyGroup, Influencer } from '../types';
import { exportSurveyReportCsv } from '../utils/storage';

interface StatsTabMobileProps {
  boothData: BoothData;
  profiles: Record<number, VoterCampaignProfile>;
  families: Record<string, FamilyGroup>;
  influencers: Record<string, Influencer>;
}

export const StatsTabMobile: React.FC<StatsTabMobileProps> = ({
  boothData,
  profiles,
  families,
  influencers
}) => {
  const { booth_info: info, voters } = boothData;

  const stats = useMemo(() => {
    let fullSupport = 0;
    let strongLean = 0;
    let softLean = 0;
    let neutralSwing = 0;
    let doubtful = 0;
    let opponent = 0;

    let voted = 0;
    let supportersMarked = 0;
    let visited = 0;
    let deceased = 0;
    let outOfCity = 0;
    let hasPhone = 0;
    let hasInfluencer = 0;

    voters.forEach(v => {
      const p = profiles[v.s] || {};
      const pct = p.supportPct; // Pure entry mode: undefined if un-entered

      if (pct === 100) fullSupport++;
      else if (pct !== undefined && pct >= 75) strongLean++;
      else if (pct === 40) softLean++;
      else if (pct === 0) opponent++;
      else if (pct !== undefined && pct <= 25) doubtful++;
      else neutralSwing++;

      if (p.survey_status === 'voted') voted++;
      if (p.survey_status === 'supporter') supportersMarked++;
      if (p.survey_status === 'visited') visited++;
      if (p.survey_status === 'deceased') deceased++;
      if (p.survey_status === 'out_of_city') outOfCity++;

      if (p.customPhone || v.k_m) hasPhone++;
      if (p.influencerId) hasInfluencer++;
    });

    const totalVoters = voters.length || 1;
    const favorableTotal = fullSupport + strongLean + softLean;
    const favorablePct = Math.round((favorableTotal / totalVoters) * 100);
    const fullPct = Math.round((fullSupport / totalVoters) * 100);
    const softPct = Math.round((softLean / totalVoters) * 100);
    const oppPct = Math.round((opponent / totalVoters) * 100);
    const neutralPct = Math.round((neutralSwing / totalVoters) * 100);

    return {
      fullSupport,
      strongLean,
      softLean,
      neutralSwing,
      doubtful,
      opponent,
      favorableTotal,
      favorablePct,
      fullPct,
      softPct,
      oppPct,
      neutralPct,
      voted,
      supportersMarked,
      visited,
      deceased,
      outOfCity,
      hasPhone,
      hasInfluencer,
      phonePct: Math.round((hasPhone / totalVoters) * 100)
    };
  }, [voters, profiles]);

  return (
    <div className="space-y-4 pb-24 text-xs">
      {/* Booth Title Card */}
      <div className="bg-gradient-to-r from-slate-900 via-amber-950/20 to-slate-900 border border-amber-500/30 rounded-2xl p-4 shadow-xl space-y-1">
        <span className="text-[10px] font-bold text-amber-400 uppercase tracking-wider flex items-center gap-1">
          <BarChart3 className="w-3.5 h-3.5" /> Campaign Command & Intelligence
        </span>
        <h2 className="text-lg font-black text-white">
          Part #{info.part_no}: {info.clean_village}
        </h2>
        <p className="text-[11px] text-slate-400 flex items-center gap-1">
          <MapPin className="w-3 h-3 text-red-400 flex-shrink-0" />
          <span className="truncate">{info.ps_address}</span>
        </p>
      </div>

      {/* POLITICAL LANDSCAPE & SENTIMENT METER */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-3 shadow-md">
        <div className="flex items-center justify-between border-b border-slate-800 pb-2">
          <span className="text-xs font-black text-white uppercase tracking-wider flex items-center gap-1.5">
            <Sliders className="w-4 h-4 text-amber-400" />
            Political Leaning Breakdown
          </span>
          <span className="text-xs font-black text-amber-400 font-mono">
            {stats.favorablePct}% Favorable
          </span>
        </div>

        {/* Visual Stacked Sentiment Bar */}
        <div className="w-full h-3.5 bg-slate-950 rounded-full overflow-hidden border border-slate-800 flex">
          <div
            title={`100% Full Support: ${stats.fullSupport}`}
            className="bg-red-600 h-full"
            style={{ width: `${(stats.fullSupport / (voters.length || 1)) * 100}%` }}
          />
          <div
            title={`75% Strong Lean: ${stats.strongLean}`}
            className="bg-emerald-500 h-full"
            style={{ width: `${(stats.strongLean / (voters.length || 1)) * 100}%` }}
          />
          <div
            title={`40% Positive: ${stats.softLean}`}
            className="bg-amber-500 h-full"
            style={{ width: `${(stats.softLean / (voters.length || 1)) * 100}%` }}
          />
          <div
            title={`Neutral: ${stats.neutralSwing}`}
            className="bg-slate-600 h-full"
            style={{ width: `${(stats.neutralSwing / (voters.length || 1)) * 100}%` }}
          />
          <div
            title={`Opponent: ${stats.opponent}`}
            className="bg-rose-900 h-full"
            style={{ width: `${(stats.opponent / (voters.length || 1)) * 100}%` }}
          />
        </div>

        {/* Sentiment Counts Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 pt-1 text-center text-[10px]">
          <div className="bg-red-950/30 border border-red-500/40 p-2 rounded-xl">
            <span className="text-red-300 font-bold block">🚩 100% Full Support</span>
            <span className="text-base font-black text-white font-mono mt-0.5 block">{stats.fullSupport}</span>
            <span className="text-slate-400 text-[9px]">{stats.fullPct}% of booth</span>
          </div>

          <div className="bg-amber-950/30 border border-amber-500/40 p-2 rounded-xl">
            <span className="text-amber-300 font-bold block">🟡 40% Positive to Us</span>
            <span className="text-base font-black text-white font-mono mt-0.5 block">{stats.softLean}</span>
            <span className="text-slate-400 text-[9px]">{stats.softPct}% of booth</span>
          </div>

          <div className="bg-emerald-950/30 border border-emerald-500/40 p-2 rounded-xl">
            <span className="text-emerald-300 font-bold block">🟢 75% Strong Lean</span>
            <span className="text-base font-black text-white font-mono mt-0.5 block">{stats.strongLean}</span>
            <span className="text-slate-400 text-[9px]">Favorable voters</span>
          </div>

          <div className="bg-slate-950 border border-slate-800 p-2 rounded-xl">
            <span className="text-slate-400 font-bold block">⚪ 50% Neutral / Swing</span>
            <span className="text-base font-black text-white font-mono mt-0.5 block">{stats.neutralSwing}</span>
            <span className="text-slate-400 text-[9px]">{stats.neutralPct}% swing voters</span>
          </div>

          <div className="bg-rose-950/40 border border-rose-900 p-2 rounded-xl">
            <span className="text-rose-400 font-bold block">🔴 100% Opponents</span>
            <span className="text-base font-black text-white font-mono mt-0.5 block">{stats.opponent}</span>
            <span className="text-slate-400 text-[9px]">{stats.oppPct}% opposition</span>
          </div>

          <div className="bg-orange-950/30 border border-orange-900 p-2 rounded-xl">
            <span className="text-orange-400 font-bold block">🟠 25% Doubtful</span>
            <span className="text-base font-black text-white font-mono mt-0.5 block">{stats.doubtful}</span>
            <span className="text-slate-400 text-[9px]">Need persuasion</span>
          </div>
        </div>
      </div>

      {/* Field Intelligence Coverage Grid */}
      <div className="grid grid-cols-2 gap-2.5">
        <div className="bg-slate-900 border border-slate-800 p-3 rounded-2xl">
          <span className="text-[10px] font-bold text-slate-400 uppercase block flex items-center gap-1">
            <Phone className="w-3 h-3 text-emerald-400" /> Phone Contacts
          </span>
          <span className="text-2xl font-black text-emerald-400 font-mono mt-0.5 block">
            {stats.hasPhone} <span className="text-xs text-slate-400">({stats.phonePct}%)</span>
          </span>
          <span className="text-[10px] text-slate-500 block mt-0.5">
            Kriya & Custom mobile numbers
          </span>
        </div>

        <div className="bg-slate-900 border border-slate-800 p-3 rounded-2xl">
          <span className="text-[10px] font-bold text-slate-400 uppercase block flex items-center gap-1">
            <UserCheck className="w-3 h-3 text-amber-400" /> Influencer Coverage
          </span>
          <span className="text-2xl font-black text-amber-400 font-mono mt-0.5 block">
            {Object.keys(influencers).length} <span className="text-xs text-slate-400">Leaders</span>
          </span>
          <span className="text-[10px] text-slate-500 block mt-0.5">
            {Object.keys(families).length} Grouped Families
          </span>
        </div>
      </div>

      {/* Polling Day Turnout & Field Survey Progress */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-3 shadow-md">
        <div className="flex items-center justify-between border-b border-slate-800 pb-2">
          <span className="text-xs font-black text-white flex items-center gap-1.5 uppercase tracking-wider">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            Polling Day Live Turnout
          </span>
          <span className="text-xs font-bold text-emerald-400 font-mono">
            {stats.voted} Votes Polled
          </span>
        </div>

        <div className="grid grid-cols-5 gap-1.5 text-center text-[10px]">
          <div className="bg-slate-950 border border-slate-800 p-2 rounded-xl">
            <span className="text-emerald-400 font-bold uppercase block truncate">Voted</span>
            <span className="text-base font-black text-white font-mono">{stats.voted}</span>
          </div>
          <div className="bg-slate-950 border border-slate-800 p-2 rounded-xl">
            <span className="text-red-400 font-bold uppercase block truncate">Ours</span>
            <span className="text-base font-black text-white font-mono">{stats.supportersMarked}</span>
          </div>
          <div className="bg-slate-950 border border-slate-800 p-2 rounded-xl">
            <span className="text-blue-400 font-bold uppercase block truncate">Visited</span>
            <span className="text-base font-black text-white font-mono">{stats.visited}</span>
          </div>
          <div className="bg-indigo-950/40 border border-indigo-500/30 p-2 rounded-xl">
            <span className="text-indigo-300 font-bold uppercase block truncate">Away</span>
            <span className="text-base font-black text-indigo-200 font-mono">{stats.outOfCity}</span>
          </div>
          <div className="bg-slate-800/80 border border-slate-700 p-2 rounded-xl">
            <span className="text-slate-300 font-bold uppercase block truncate">Deceased</span>
            <span className="text-base font-black text-slate-200 font-mono">{stats.deceased}</span>
          </div>
        </div>

        {/* Master Export Button */}
        <button
          onClick={() => exportSurveyReportCsv(boothData, profiles)}
          className="w-full py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white rounded-xl text-xs font-black flex items-center justify-center gap-2 shadow-md shadow-emerald-950/40"
        >
          <FileSpreadsheet className="w-4 h-4" />
          <span>Export Master Campaign Sheet (CSV)</span>
        </button>
      </div>
    </div>
  );
};
