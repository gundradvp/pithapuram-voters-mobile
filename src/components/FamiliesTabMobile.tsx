import React, { useState, useMemo } from 'react';
import {
  Home,
  Search,
  Users,
  Phone,
  MessageSquare,
  Printer,
  Plus,
  Sliders,
  UserCheck,
  Edit3,
  ChevronDown,
  ChevronUp,
  Building,
  Trophy,
  Award
} from 'lucide-react';
import { FamilyGroup, MobileVoter, Influencer, VoterCampaignProfile, BoothInfo } from '../types';
import { Language, translations } from '../utils/i18n';
import {
  classifyBoothSurnames,
  calculateWinningFormula
} from '../utils/surnameClassifier';

interface FamiliesTabMobileProps {
  families: Record<string, FamilyGroup>;
  voters: MobileVoter[];
  influencers: Record<string, Influencer>;
  profiles: Record<number, VoterCampaignProfile>;
  boothInfo: BoothInfo;
  language?: Language;
  onCreateFamily: () => void;
  onEditFamily: (family: FamilyGroup) => void;
  onOpenPhoneEditor: (voter: MobileVoter) => void;
  onOpenSupportPicker: (title: string, currentPct: number, currentNotes?: string, familyId?: string) => void;
  onOpenInfluencerAssign: (targetName: string, currentInfId?: string, familyId?: string) => void;
  onOpenSlip: (voter: MobileVoter) => void;
}

type TabMode = 'surnames' | 'houses';
type SurnameFilter = 'all' | 'top10' | 'jsp' | 'swing' | 'elders';

export const FamiliesTabMobile: React.FC<FamiliesTabMobileProps> = ({
  families,
  voters,
  influencers,
  profiles,
  boothInfo,
  language = 'te',
  onCreateFamily,
  onEditFamily,
  onOpenPhoneEditor,
  onOpenSupportPicker,
  onOpenInfluencerAssign,
  onOpenSlip
}) => {
  const [tabMode, setTabMode] = useState<TabMode>('surnames');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterMode, setFilterMode] = useState<'all' | 'full' | 'strong' | 'soft' | 'neutral' | 'opponent'>('all');
  const [surnameFilter, setSurnameFilter] = useState<SurnameFilter>('all');
  const [expandedFamId, setExpandedFamId] = useState<string | null>(null);
  const [expandedSurname, setExpandedSurname] = useState<string | null>(null);

  const t = translations[language];

  // 1. Surname Clans & Winning Blueprint Memos
  const { clanGroups, winningFormula } = useMemo(() => {
    const groups = classifyBoothSurnames(voters, profiles);
    const formula = calculateWinningFormula(groups, voters.length);
    return { clanGroups: groups, winningFormula: formula };
  }, [voters, profiles]);

  // Filtered Surname Clans
  const filteredClans = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    return clanGroups.filter((c, idx) => {
      // Filter by clan filter mode
      if (surnameFilter === 'top10' && idx >= 10) return false;
      if (surnameFilter === 'jsp' && (c.fullCount + Math.round(c.strongCount * 0.75)) <= c.opponentCount) return false;
      if (surnameFilter === 'swing' && c.neutralCount === 0) return false;
      if (surnameFilter === 'elders' && c.topElders.length === 0) return false;

      // Filter by query
      if (q) {
        const enMatch = c.nameEn.toLowerCase().includes(q);
        const teMatch = c.nameTe.toLowerCase().includes(q);
        const elderMatch = c.voters.some(v => v.n.toLowerCase().includes(q) || v.r.toLowerCase().includes(q));
        const houseMatch = c.voters.some(v => v.hn && v.hn.toLowerCase().includes(q));
        if (!enMatch && !teMatch && !elderMatch && !houseMatch) return false;
      }
      return true;
    });
  }, [clanGroups, surnameFilter, searchQuery]);

  // 2. Custom House Families Memos
  const familyList = useMemo(() => {
    return Object.values(families);
  }, [families]);

  // Counts for custom family filters
  const counts = useMemo(() => {
    let full = 0;
    let strong = 0;
    let soft = 0;
    let neutral = 0;
    let opponent = 0;

    familyList.forEach(f => {
      if (f.supportPct === 100) full++;
      else if (f.supportPct >= 75) strong++;
      else if (f.supportPct === 40) soft++;
      else if (f.supportPct === 0) opponent++;
      else neutral++;
    });

    return { all: familyList.length, full, strong, soft, neutral, opponent };
  }, [familyList]);

  const filteredFamilies = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();

    return familyList.filter(f => {
      // Filter by leaning
      if (filterMode === 'full' && f.supportPct !== 100) return false;
      if (filterMode === 'strong' && (f.supportPct < 75 || f.supportPct === 100)) return false;
      if (filterMode === 'soft' && f.supportPct !== 40) return false;
      if (filterMode === 'neutral' && (f.supportPct === 100 || f.supportPct >= 75 || f.supportPct === 40 || f.supportPct === 0)) return false;
      if (filterMode === 'opponent' && f.supportPct !== 0) return false;

      // Filter by text search
      if (q) {
        const nameMatch = f.name.toLowerCase().includes(q);
        const hnMatch = f.houseNumbers.some(h => h.toLowerCase().includes(q));
        const headMatch = f.headName?.toLowerCase().includes(q);
        const infMatch = f.influencerName?.toLowerCase().includes(q);
        if (!nameMatch && !hnMatch && !headMatch && !infMatch) return false;
      }

      return true;
    });
  }, [familyList, searchQuery, filterMode]);

  const getLeaningBadge = (pct: number) => {
    if (pct === 100) {
      return (
        <span className="px-2 py-0.5 bg-red-600/30 text-red-300 border border-red-500/50 rounded-full text-[10px] font-black flex items-center gap-1">
          🚩 100% Full Support
        </span>
      );
    }
    if (pct >= 75) {
      return (
        <span className="px-2 py-0.5 bg-emerald-600/30 text-emerald-300 border border-emerald-500/50 rounded-full text-[10px] font-black flex items-center gap-1">
          🟢 {pct}% Strong Lean
        </span>
      );
    }
    if (pct === 40) {
      return (
        <span className="px-2 py-0.5 bg-amber-600/30 text-amber-300 border border-amber-500/50 rounded-full text-[10px] font-black flex items-center gap-1">
          🟡 40% Positive to Us
        </span>
      );
    }
    if (pct === 0) {
      return (
        <span className="px-2 py-0.5 bg-rose-950/80 text-rose-400 border border-rose-500/50 rounded-full text-[10px] font-black flex items-center gap-1">
          🔴 100% Opponent
        </span>
      );
    }
    if (pct <= 25) {
      return (
        <span className="px-2 py-0.5 bg-orange-600/30 text-orange-300 border border-orange-500/50 rounded-full text-[10px] font-bold flex items-center gap-1">
          🟠 {pct}% Doubtful
        </span>
      );
    }
    return (
      <span className="px-2 py-0.5 bg-slate-800 text-slate-300 border border-slate-700 rounded-full text-[10px] font-bold flex items-center gap-1">
        ⚪ 50% Neutral / Swing
      </span>
    );
  };

  return (
    <div className="space-y-3 pb-24 text-xs">
      {/* Mode Switcher: Surnames (Clan Power) vs House Families */}
      <div className="grid grid-cols-2 gap-1.5 p-1 bg-slate-900 border border-slate-800 rounded-2xl shadow-inner">
        <button
          onClick={() => setTabMode('surnames')}
          className={`py-2 px-3 rounded-xl font-black text-xs flex items-center justify-center gap-2 transition-all ${
            tabMode === 'surnames'
              ? 'bg-gradient-to-r from-amber-500 to-amber-600 text-slate-950 shadow-md shadow-amber-950/50'
              : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
          }`}
        >
          <Building className="w-4 h-4" />
          <span>{language === 'te' ? 'ఇంటిపేర్ల వారీగా (గెలుపు వ్యూహం)' : 'By Surname Clan (Winning Formula)'}</span>
        </button>

        <button
          onClick={() => setTabMode('houses')}
          className={`py-2 px-3 rounded-xl font-black text-xs flex items-center justify-center gap-2 transition-all ${
            tabMode === 'houses'
              ? 'bg-gradient-to-r from-red-600 to-red-700 text-white shadow-md shadow-red-950/50'
              : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
          }`}
        >
          <Home className="w-4 h-4" />
          <span>{language === 'te' ? 'ఇళ్ల వారీగా (కుటుంబాలు)' : 'By House (Family Groups)'}</span>
        </button>
      </div>

      {/* SURNAMES / CLAN POWER VIEW */}
      {tabMode === 'surnames' && (
        <div className="space-y-3">
          {/* Winning Blueprint Strategic Banner */}
          <div className="bg-gradient-to-br from-red-950 via-slate-900 to-amber-950/60 border border-amber-500/40 rounded-3xl p-4 shadow-xl space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-gradient-to-br from-amber-500 to-red-600 text-slate-950 rounded-xl font-black">
                  <Trophy className="w-5 h-5 text-slate-950" />
                </div>
                <div>
                  <span className="text-[10px] uppercase font-bold text-amber-400 tracking-wider">
                    {language === 'te' ? 'పిఠాపురం గెలుపు ఫార్ములా' : 'Pithapuram Winning Formula'}
                  </span>
                  <h3 className="text-sm font-black text-white">
                    {language === 'te' ? 'టాప్ 10 వంశాలు = 50%+ ఓటు వాటా' : 'Top 10 Surnames = 50%+ Victory Margin'}
                  </h3>
                </div>
              </div>
              <span className="text-[11px] font-mono font-bold text-amber-400 bg-amber-500/10 px-2.5 py-1 rounded-full border border-amber-500/30">
                {winningFormula.top10Percentage}% {language === 'te' ? 'ఓటు వాటా' : 'Power'}
              </span>
            </div>

            {/* Quick Metrics */}
            <div className="grid grid-cols-4 gap-2 text-center">
              <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-2">
                <span className="text-[9px] text-slate-400 block">{language === 'te' ? 'గెలుపు టార్గెట్' : 'Win Target'}</span>
                <span className="text-sm font-black text-amber-400 font-mono">{winningFormula.targetWinningThreshold}</span>
                <span className="text-[8px] text-slate-500 block">50%+1</span>
              </div>
              <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-2">
                <span className="text-[9px] text-slate-400 block">{language === 'te' ? 'టాప్ 10 ఓట్లు' : 'Top 10 Votes'}</span>
                <span className="text-sm font-black text-white font-mono">{winningFormula.top10VoterCount}</span>
                <span className="text-[8px] text-slate-500 block">{winningFormula.top10Percentage}%</span>
              </div>
              <div className="bg-slate-950/80 border border-red-500/30 rounded-xl p-2">
                <span className="text-[9px] text-red-300 block">{language === 'te' ? 'పక్కా JSP' : 'Locked JSP'}</span>
                <span className="text-sm font-black text-red-400 font-mono">{winningFormula.top10JspSupporters}</span>
                <span className="text-[8px] text-red-400/80 block">Supporters</span>
              </div>
              <div className="bg-slate-950/80 border border-amber-500/30 rounded-xl p-2">
                <span className="text-[9px] text-amber-300 block">{language === 'te' ? 'గెలవాల్సినవి' : 'Needed'}</span>
                <span className="text-sm font-black text-amber-400 font-mono">{winningFormula.votesNeededFromTop10ToWin}</span>
                <span className="text-[8px] text-amber-400/80 block">{winningFormula.top10SwingVoters} లో</span>
              </div>
            </div>

            <p className="text-[11px] text-slate-300 bg-slate-950/70 p-2.5 rounded-xl border border-slate-800 leading-relaxed">
              💡 {language === 'te' ? (
                <>
                  టాప్ 10 కుల/ఇంటిపేర్ల వద్ద <strong className="text-white">{winningFormula.top10SwingVoters} స్వింగ్ ఓటర్లు</strong> ఉన్నారు. వీరిలో కేవలం <strong className="text-amber-400 font-bold">{winningFormula.votesNeededFromTop10ToWin} ఓట్లను</strong> గాజు గ్లాసు గుర్తు వైపు తిప్పితే మన గెలుపు లాక్ అవుతుంది!
                </>
              ) : (
                <>
                  Top 10 surnames command <strong className="text-white">{winningFormula.top10SwingVoters} swing voters</strong>. Converting just <strong className="text-amber-400 font-bold">{winningFormula.votesNeededFromTop10ToWin} voters</strong> locks mathematical victory!
                </>
              )}
            </p>
          </div>

          {/* Search & Filter Chips */}
          <div className="space-y-2 sticky top-[53px] z-20 bg-slate-950/95 backdrop-blur-md pt-1 pb-1">
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder={language === 'te' ? 'ఇంటిపేరు, పెద్దల పేరు, ఇంటి నెం శోధించండి...' : 'Search surname, elder name, house no...'}
                className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-400 shadow-md"
              />
            </div>

            {/* Filter Pills */}
            <div className="flex items-center gap-1.5 overflow-x-auto py-1 scrollbar-none text-[11px]">
              <button
                onClick={() => setSurnameFilter('all')}
                className={`px-2.5 py-1 rounded-lg font-bold whitespace-nowrap transition-all ${
                  surnameFilter === 'all'
                    ? 'bg-amber-500 text-slate-950 font-black shadow-sm'
                    : 'bg-slate-900 text-slate-400 border border-slate-800'
                }`}
              >
                {language === 'te' ? `మొత్తం (${clanGroups.length})` : `All (${clanGroups.length})`}
              </button>

              <button
                onClick={() => setSurnameFilter('top10')}
                className={`px-2.5 py-1 rounded-lg font-bold whitespace-nowrap transition-all flex items-center gap-1 ${
                  surnameFilter === 'top10'
                    ? 'bg-red-600 text-white font-black shadow-sm'
                    : 'bg-slate-900 text-red-300 border border-red-500/30'
                }`}
              >
                <Award className="w-3 h-3" />
                <span>{language === 'te' ? 'టాప్ 10 వంశాలు' : 'Top 10 Power'}</span>
              </button>

              <button
                onClick={() => setSurnameFilter('jsp')}
                className={`px-2.5 py-1 rounded-lg font-bold whitespace-nowrap transition-all flex items-center gap-1 ${
                  surnameFilter === 'jsp'
                    ? 'bg-emerald-600 text-white font-black shadow-sm'
                    : 'bg-slate-900 text-emerald-300 border border-emerald-500/30'
                }`}
              >
                <span>🚩 {language === 'te' ? 'JSP అనుకూలం' : 'JSP Strong'}</span>
              </button>

              <button
                onClick={() => setSurnameFilter('swing')}
                className={`px-2.5 py-1 rounded-lg font-bold whitespace-nowrap transition-all flex items-center gap-1 ${
                  surnameFilter === 'swing'
                    ? 'bg-amber-600 text-slate-950 font-black shadow-sm'
                    : 'bg-slate-900 text-amber-300 border border-amber-500/30'
                }`}
              >
                <span>🎯 {language === 'te' ? 'స్వింగ్ వంశాలు' : 'Key Swing'}</span>
              </button>

              <button
                onClick={() => setSurnameFilter('elders')}
                className={`px-2.5 py-1 rounded-lg font-bold whitespace-nowrap transition-all flex items-center gap-1 ${
                  surnameFilter === 'elders'
                    ? 'bg-purple-600 text-white font-black shadow-sm'
                    : 'bg-slate-900 text-purple-300 border border-purple-500/30'
                }`}
              >
                <span>👴 {language === 'te' ? 'పెద్దలు ఉన్నవి' : '60+ Elders'}</span>
              </button>
            </div>
          </div>

          {/* Showing Count */}
          <div className="flex items-center justify-between text-[11px] text-slate-400 px-1">
            <span>
              {language === 'te' ? `బూత్ #${boothInfo.part_no} లో ` : `In Booth #${boothInfo.part_no}: `}
              <strong className="text-white">{filteredClans.length}</strong> {language === 'te' ? 'ఇంటిపేర్లు' : 'Surname Clans'}
            </span>
            <span className="font-mono text-amber-400">
              {filteredClans.reduce((acc, c) => acc + c.totalVoters, 0)} {language === 'te' ? 'ఓటర్లు' : 'voters'}
            </span>
          </div>

          {/* Surnames Clan List */}
          <div className="space-y-3">
            {filteredClans.map((clan, idx) => {
              const isExpanded = expandedSurname === clan.id || (filteredClans.length === 1);
              const jspElectors = clan.fullCount + Math.round(clan.strongCount * 0.75);
              const jspPercent = Math.round((jspElectors / clan.totalVoters) * 100);
              const swingPercent = Math.round((clan.neutralCount / clan.totalVoters) * 100);
              const oppPercent = Math.round((clan.opponentCount / clan.totalVoters) * 100);

              const elders = clan.topElders;

              return (
                <div
                  key={clan.id}
                  className="bg-slate-900 border border-slate-800 hover:border-amber-500/40 rounded-2xl overflow-hidden transition-all shadow-md"
                >
                  {/* Clan Header */}
                  <div className="p-3.5 space-y-2.5">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="w-6 h-6 rounded-full bg-slate-800 text-amber-400 text-xs font-black flex items-center justify-center font-mono border border-slate-700">
                          #{idx + 1}
                        </span>
                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className="text-base font-black text-white">{clan.nameTe || clan.nameEn}</h3>
                            <span className="text-xs font-mono font-bold text-slate-400">
                              ({clan.nameEn})
                            </span>
                          </div>
                          <div className="text-[11px] text-slate-400 flex items-center gap-2 mt-0.5">
                            <span className="font-mono text-amber-400 font-bold">
                              {clan.totalVoters} {language === 'te' ? 'ఓటర్లు' : 'Electors'} ({clan.pctOfBooth}%)
                            </span>
                            <span>•</span>
                            <span>🏠 {clan.houseNumbers.length} {language === 'te' ? 'ఇళ్లు' : 'houses'}</span>
                          </div>
                        </div>
                      </div>

                      <div className="text-right">
                        <span className="px-2.5 py-1 bg-gradient-to-r from-red-600/30 to-amber-600/30 border border-amber-500/40 text-amber-300 font-mono font-black rounded-lg text-xs">
                          {jspPercent}% JSP
                        </span>
                      </div>
                    </div>

                    {/* Stats pills */}
                    <div className="flex items-center gap-1.5 flex-wrap text-[10px]">
                      <span className="px-2 py-0.5 bg-slate-950 border border-slate-800 rounded-md text-slate-300">
                        👴 {clan.topElders.length} {language === 'te' ? 'పెద్దలు (60+)' : 'Elders'}
                      </span>
                      <span className="px-2 py-0.5 bg-slate-950 border border-slate-800 rounded-md text-slate-300">
                        🎯 {clan.topYouth.length} {language === 'te' ? 'యువత (18-25)' : 'Youth'}
                      </span>
                      {clan.kriyaCount > 0 && (
                        <span className="px-2 py-0.5 bg-red-950/60 border border-red-500/30 rounded-md text-red-300 font-bold">
                          🚩 {clan.kriyaCount} {language === 'te' ? 'క్రియ వాలంటీర్లు' : 'Kriya'}
                        </span>
                      )}
                    </div>

                    {/* Sentiment Bar */}
                    <div className="space-y-1">
                      <div className="flex items-center justify-between text-[10px] font-mono text-slate-400">
                        <span className="text-emerald-400">{jspElectors} JSP ({jspPercent}%)</span>
                        <span className="text-amber-400">{clan.neutralCount} {language === 'te' ? 'స్వింగ్' : 'Swing'} ({swingPercent}%)</span>
                        <span className="text-rose-400">{clan.opponentCount} {language === 'te' ? 'వ్యతిరేకం' : 'Opp'} ({oppPercent}%)</span>
                      </div>
                      <div className="h-2 w-full bg-slate-950 rounded-full overflow-hidden flex border border-slate-800">
                        <div style={{ width: `${jspPercent}%` }} className="bg-emerald-500 h-full" />
                        <div style={{ width: `${swingPercent}%` }} className="bg-amber-400 h-full" />
                        <div style={{ width: `${oppPercent}%` }} className="bg-rose-500 h-full" />
                      </div>
                    </div>

                    {/* Clan Elders Section (గౌరవ పెద్దలు) */}
                    {elders.length > 0 && (
                      <div className="bg-slate-950/80 rounded-xl p-2.5 border border-slate-800/80 space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-black uppercase text-amber-400 tracking-wider flex items-center gap-1">
                            👴 {language === 'te' ? `${clan.nameTe || clan.nameEn} వంశ గౌరవ పెద్దలు:` : `Key Clan Elders:`}
                          </span>
                          <span className="text-[9px] text-slate-500">
                            {language === 'te' ? 'వీరిని కలిస్తే ఓట్లు ఏకపక్షం అవుతాయి' : 'Crucial influencers'}
                          </span>
                        </div>

                        <div className="space-y-1.5">
                          {elders.map(e => {
                            const prof = profiles[e.s] || {};
                            const phone = prof.customPhone || e.k_m;
                            const elderMsg = `నమస్కారం ${e.n} గారు, పిఠాపురం బూత్ #${boothInfo.part_no} లోని మీ ${clan.nameTe || clan.nameEn} కుటుంబాల సంక్షేమం కోసం జనసేన పార్టీ అభ్యర్థి పవన్ కళ్యాణ్ గారికి గాజు గ్లాసు గుర్తుపై ఓటు వేసి ఆశీర్వదించాల్సిందిగా వినమ్రంగా కోరుతున్నాము. జై జనసేన! 🚩`;

                            return (
                              <div key={e.s} className="bg-slate-900/90 rounded-lg p-2 border border-slate-800 flex items-center justify-between gap-2">
                                <div className="space-y-0.5 flex-1 min-w-0">
                                  <div className="flex items-center gap-1.5 flex-wrap">
                                    <span className="font-mono text-amber-400 font-bold text-[11px]">#{e.s}</span>
                                    <span className="font-bold text-white text-xs truncate">{e.n}</span>
                                    <span className="text-[10px] text-slate-400">({e.a}y)</span>
                                  </div>
                                  <div className="text-[10px] text-slate-400 truncate">
                                    {e.r && <span>{e.r} • </span>}
                                    <span className="font-mono">H: {e.hn}</span>
                                    {phone && <span className="text-emerald-400 font-mono ml-1.5">📱 {phone}</span>}
                                  </div>
                                </div>

                                <div className="flex items-center gap-1 flex-shrink-0">
                                  {phone ? (
                                    <>
                                      <a
                                        href={`tel:${phone}`}
                                        className="p-1.5 bg-slate-800 hover:bg-slate-700 text-emerald-400 rounded-lg"
                                        title="Call Elder"
                                      >
                                        <Phone className="w-3 h-3" />
                                      </a>
                                      <a
                                        href={`https://wa.me/91${phone}?text=${encodeURIComponent(elderMsg)}`}
                                        target="_blank"
                                        rel="noreferrer"
                                        className="p-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg"
                                        title="Send Clan Appeal on WhatsApp"
                                      >
                                        <MessageSquare className="w-3 h-3" />
                                      </a>
                                    </>
                                  ) : (
                                    <button
                                      onClick={() => onOpenPhoneEditor(e)}
                                      className="px-2 py-1 bg-slate-800 text-amber-300 text-[10px] rounded-lg border border-slate-700"
                                    >
                                      + Phone
                                    </button>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Voters inside Clan Accordion */}
                  <div className="border-t border-slate-800 bg-slate-950/60">
                    <button
                      onClick={() => setExpandedSurname(isExpanded ? null : clan.id)}
                      className="w-full px-3.5 py-2 flex items-center justify-between text-xs text-amber-400 font-bold hover:bg-slate-800/40"
                    >
                      <span className="flex items-center gap-1.5">
                        <Users className="w-3.5 h-3.5" />
                        <span>
                          {language === 'te'
                            ? `${clan.nameTe || clan.nameEn} వంశ ఓటర్ల జాబితా (${clan.totalVoters} మంది)`
                            : `Roster of ${clan.nameEn} (${clan.totalVoters} Voters)`}
                        </span>
                      </span>
                      {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                    </button>

                    {isExpanded && (
                      <div className="p-3 space-y-2 divide-y divide-slate-800/50">
                        {clan.voters.map(voter => {
                          const prof = profiles[voter.s] || {};
                          const phone = prof.customPhone || voter.k_m;
                          const support = prof.supportPct !== undefined ? prof.supportPct : (voter.kriya ? 100 : 50);

                          return (
                            <div key={voter.s} className="pt-2 first:pt-0 space-y-1">
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-1.5 flex-wrap">
                                  <span className="font-mono text-amber-400 font-bold text-xs">#{voter.s}</span>
                                  <span className="font-black text-white text-xs">{voter.n}</span>
                                  {voter.kriya && (
                                    <span className="px-1 py-0.2 bg-red-600/30 text-amber-300 border border-red-500/30 rounded text-[8px] font-bold">
                                      🚩 Kriya
                                    </span>
                                  )}
                                </div>
                                <div className="flex items-center gap-1.5">
                                  <span className="text-[10px] text-slate-400">
                                    {voter.a}y • {voter.g === 'M' ? 'M' : 'F'}
                                  </span>
                                  <span className="font-mono text-[9px] px-1.5 py-0.5 rounded bg-slate-900 border border-slate-800 text-amber-300">
                                    H:{voter.hn}
                                  </span>
                                </div>
                              </div>

                              <div className="flex items-center justify-between text-[10px] text-slate-400">
                                <span>Rel: <strong className="text-slate-300">{voter.r}</strong></span>
                                {getLeaningBadge(support)}
                              </div>

                              {/* Actions */}
                              <div className="flex items-center justify-between pt-1 gap-1">
                                <div className="flex items-center gap-1">
                                  {phone ? (
                                    <>
                                      <a
                                        href={`tel:${phone}`}
                                        className="p-1 bg-slate-800 hover:bg-slate-700 text-emerald-400 rounded-md text-[10px] flex items-center gap-1"
                                        title="Call"
                                      >
                                        <Phone className="w-2.5 h-2.5" /> Call
                                      </a>
                                      <a
                                        href={`https://wa.me/91${phone}?text=${encodeURIComponent(`నమస్కారం ${voter.n} గారు, జనసేన పార్టీ పిఠాపురం బూత్ #${boothInfo.part_no} నుండి సంప్రదిస్తున్నాము.`)}`}
                                        target="_blank"
                                        rel="noreferrer"
                                        className="p-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded-md text-[10px] flex items-center gap-1"
                                        title="WhatsApp"
                                      >
                                        <MessageSquare className="w-2.5 h-2.5" /> WA
                                      </a>
                                    </>
                                  ) : (
                                    <button
                                      onClick={() => onOpenPhoneEditor(voter)}
                                      className="p-1 bg-slate-800 text-amber-400 underline font-semibold rounded-md text-[10px]"
                                    >
                                      + Phone
                                    </button>
                                  )}
                                </div>

                                <div className="flex items-center gap-1">
                                  <button
                                    onClick={() => onOpenSupportPicker(voter.n, support, prof.notes, voter.s ? String(voter.s) : undefined)}
                                    className="p-1 bg-slate-800 text-slate-300 rounded-md text-[10px] border border-slate-700"
                                  >
                                    <Sliders className="w-2.5 h-2.5 inline mr-0.5" /> %
                                  </button>
                                  <button
                                    onClick={() => onOpenSlip(voter)}
                                    className="p-1 bg-slate-800 text-amber-300 rounded-md text-[10px] font-bold flex items-center gap-0.5"
                                  >
                                    <Printer className="w-2.5 h-2.5" /> Slip
                                  </button>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}

            {filteredClans.length === 0 && (
              <div className="py-12 text-center text-slate-500 text-xs space-y-2">
                <p className="font-bold text-slate-300 text-sm">
                  {language === 'te' ? 'ఎటువంటి ఇంటిపేరు లభించలేదు' : 'No Surnames Match'}
                </p>
                <p>{language === 'te' ? 'వేరే పదంతో శోధించండి.' : 'Try a different search term.'}</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* HOUSE FAMILIES VIEW (DOOR-BY-DOOR) */}
      {tabMode === 'houses' && (
        <div className="space-y-3">
          {/* Search & Actions Bar */}
          <div className="sticky top-[53px] z-30 bg-slate-950/95 backdrop-blur-md pt-2 pb-1 space-y-2">
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  placeholder="Search Family Name, Door No, Elder..."
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-400 shadow-md"
                />
              </div>

              <button
                onClick={onCreateFamily}
                className="px-3 py-2 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black rounded-xl text-xs flex items-center gap-1 shadow-md shadow-amber-950/40 whitespace-nowrap"
              >
                <Plus className="w-4 h-4" />
                <span>Group Family</span>
              </button>
            </div>

            {/* Filter Pills */}
            <div className="flex items-center gap-1.5 overflow-x-auto py-1.5 scrollbar-none text-[11px]">
              <button
                onClick={() => setFilterMode('all')}
                className={`px-2.5 py-1 rounded-lg font-bold whitespace-nowrap transition-all ${
                  filterMode === 'all'
                    ? 'bg-amber-500 text-slate-950 font-black shadow-sm'
                    : 'bg-slate-900 text-slate-400 border border-slate-800'
                }`}
              >
                All ({counts.all})
              </button>

              <button
                onClick={() => setFilterMode('full')}
                className={`px-2.5 py-1 rounded-lg font-bold whitespace-nowrap transition-all flex items-center gap-1 ${
                  filterMode === 'full'
                    ? 'bg-red-600 text-white font-black shadow-sm'
                    : 'bg-slate-900 text-red-300 border border-red-500/30'
                }`}
              >
                <span>🚩 100% Full ({counts.full})</span>
              </button>

              <button
                onClick={() => setFilterMode('soft')}
                className={`px-2.5 py-1 rounded-lg font-bold whitespace-nowrap transition-all flex items-center gap-1 ${
                  filterMode === 'soft'
                    ? 'bg-amber-600 text-slate-950 font-black shadow-sm'
                    : 'bg-slate-900 text-amber-300 border border-amber-500/30'
                }`}
              >
                <span>🟡 40% Positive ({counts.soft})</span>
              </button>

              <button
                onClick={() => setFilterMode('strong')}
                className={`px-2.5 py-1 rounded-lg font-bold whitespace-nowrap transition-all flex items-center gap-1 ${
                  filterMode === 'strong'
                    ? 'bg-emerald-600 text-white font-black shadow-sm'
                    : 'bg-slate-900 text-emerald-300 border border-emerald-500/30'
                }`}
              >
                <span>🟢 75% Strong ({counts.strong})</span>
              </button>

              <button
                onClick={() => setFilterMode('neutral')}
                className={`px-2.5 py-1 rounded-lg font-bold whitespace-nowrap transition-all ${
                  filterMode === 'neutral'
                    ? 'bg-slate-700 text-white font-black shadow-sm'
                    : 'bg-slate-900 text-slate-400 border border-slate-800'
                }`}
              >
                ⚪ Neutral / Swing ({counts.neutral})
              </button>

              <button
                onClick={() => setFilterMode('opponent')}
                className={`px-2.5 py-1 rounded-lg font-bold whitespace-nowrap transition-all flex items-center gap-1 ${
                  filterMode === 'opponent'
                    ? 'bg-rose-900 text-rose-200 font-black shadow-sm'
                    : 'bg-slate-900 text-rose-400 border border-rose-500/30'
                }`}
              >
                <span>🔴 Opponents ({counts.opponent})</span>
              </button>
            </div>
          </div>

          {/* Showing count */}
          <div className="flex items-center justify-between text-[11px] text-slate-400 px-1">
            <span>
              Showing <strong className="text-white">{filteredFamilies.length}</strong> Family Groups in Booth #{boothInfo.part_no}
            </span>
          </div>

          {/* Families List */}
          <div className="space-y-3">
            {filteredFamilies.map(fam => {
              const isExpanded = expandedFamId === fam.id || filteredFamilies.length <= 3;
              const memberVoters = fam.memberSnos
                .map(sno => voters.find(v => v.s === sno))
                .filter(Boolean) as MobileVoter[];

              return (
                <div
                  key={fam.id}
                  className={`bg-slate-900 border rounded-2xl overflow-hidden transition-all shadow-md ${
                    fam.supportPct === 100
                      ? 'border-red-500/50 bg-gradient-to-r from-red-950/20 via-slate-900 to-slate-900'
                      : fam.supportPct >= 75
                        ? 'border-emerald-500/40 bg-gradient-to-r from-emerald-950/20 via-slate-900 to-slate-900'
                        : fam.supportPct === 40
                          ? 'border-amber-500/40 bg-gradient-to-r from-amber-950/20 via-slate-900 to-slate-900'
                          : 'border-slate-800'
                  }`}
                >
                  {/* Family Card Top */}
                  <div className="p-3.5 space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <h3 className="text-sm font-black text-white">{fam.name}</h3>
                          {getLeaningBadge(fam.supportPct)}
                        </div>
                        <div className="text-[11px] text-slate-400 flex items-center gap-2">
                          <span className="font-mono text-amber-400 font-bold">
                            H.No: {fam.houseNumbers.join(', ')}
                          </span>
                          <span>•</span>
                          <span>{memberVoters.length} Registered Electors</span>
                        </div>
                      </div>

                      <button
                        onClick={() => onEditFamily(fam)}
                        className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs"
                        title="Edit Family Settings"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    {/* Assigned Influencer Banner */}
                    <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-2.5 flex items-center justify-between">
                      <div className="space-y-0.5">
                        <span className="text-[10px] uppercase font-bold text-slate-400 block flex items-center gap-1">
                          <UserCheck className="w-3 h-3 text-amber-400" /> Key Influencer:
                        </span>
                        {fam.influencerName ? (
                          <div className="flex items-center gap-1.5">
                            <span className="font-bold text-white text-xs">{fam.influencerName}</span>
                            {fam.influencerMobile && (
                              <span className="font-mono text-[10px] text-emerald-400">({fam.influencerMobile})</span>
                            )}
                          </div>
                        ) : (
                          <span className="text-slate-500 italic text-[11px]">No Influencer Assigned</span>
                        )}
                      </div>

                      <div className="flex items-center gap-1">
                        {fam.influencerMobile && (
                          <a
                            href={`tel:${fam.influencerMobile}`}
                            className="p-1.5 bg-slate-800 text-emerald-400 rounded-lg"
                            title="Call Influencer"
                          >
                            <Phone className="w-3 h-3" />
                          </a>
                        )}
                        <button
                          onClick={() => onOpenInfluencerAssign(fam.name, fam.influencerId, fam.id)}
                          className="px-2 py-1 bg-amber-500/20 hover:bg-amber-500 text-amber-300 hover:text-slate-950 rounded-lg text-[10px] font-bold border border-amber-500/30 transition-colors"
                        >
                          {fam.influencerName ? 'Change' : '+ Assign'}
                        </button>
                      </div>
                    </div>

                    {/* Ground Notes if any */}
                    {fam.campaignNotes && (
                      <p className="text-[10px] text-amber-300/90 italic bg-slate-950/50 p-2 rounded-lg border border-slate-800/80">
                        📝 {fam.campaignNotes}
                      </p>
                    )}

                    {/* Quick Leaning Setter */}
                    <div className="flex items-center justify-between pt-1 border-t border-slate-800/60 text-[10px]">
                      <span className="text-slate-400 font-bold">Adjust Leaning:</span>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => onOpenSupportPicker(fam.name, fam.supportPct, fam.campaignNotes, fam.id)}
                          className="px-2 py-0.5 bg-slate-800 hover:bg-slate-700 text-amber-300 border border-slate-700 rounded-lg font-bold flex items-center gap-1"
                        >
                          <Sliders className="w-2.5 h-2.5" /> Change %
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Members inside Family */}
                  <div className="border-t border-slate-800 bg-slate-950/60">
                    <button
                      onClick={() => setExpandedFamId(isExpanded && filteredFamilies.length > 3 ? null : fam.id)}
                      className="w-full px-3.5 py-1.5 flex items-center justify-between text-[11px] text-amber-400 font-bold hover:bg-slate-800/40"
                    >
                      <span>Family Members ({memberVoters.length} Electors)</span>
                      {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                    </button>

                    {isExpanded && (
                      <div className="p-3 space-y-2 divide-y divide-slate-800/50">
                        {memberVoters.map(m => {
                          const prof = profiles[m.s] || {};
                          const phone = prof.customPhone || m.k_m;

                          return (
                            <div key={m.s} className="pt-2 first:pt-0 space-y-1">
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-1.5 flex-wrap">
                                  <span className="font-mono text-amber-400 font-bold text-xs">#{m.s}</span>
                                  <span className="font-black text-white text-xs">{m.n}</span>
                                  {m.kriya && (
                                    <span className="px-1 py-0.2 bg-red-600/30 text-amber-300 border border-red-500/30 rounded text-[8px] font-bold">
                                      🚩 Kriya
                                    </span>
                                  )}
                                </div>
                                <span className="text-[10px] text-slate-400">
                                  {m.a}y • {m.g === 'M' ? 'M' : 'F'}
                                </span>
                              </div>

                              <div className="flex items-center justify-between text-[10px] text-slate-400">
                                <span>Rel: <strong className="text-slate-300">{m.r}</strong></span>
                                {phone ? (
                                  <span className="font-mono text-emerald-400 font-bold">📱 {phone}</span>
                                ) : (
                                  <button
                                    onClick={() => onOpenPhoneEditor(m)}
                                    className="text-amber-400 underline font-semibold"
                                  >
                                    + Add Phone
                                  </button>
                                )}
                              </div>

                              {/* Quick Dial & Actions */}
                              <div className="flex items-center justify-between pt-1 gap-1">
                                <div className="flex items-center gap-1">
                                  {phone ? (
                                    <>
                                      <a
                                        href={`tel:${phone}`}
                                        className="p-1 bg-slate-800 hover:bg-slate-700 text-emerald-400 rounded-md text-[10px] flex items-center gap-1"
                                        title="Call"
                                      >
                                        <Phone className="w-2.5 h-2.5" /> Call
                                      </a>
                                      <a
                                        href={`https://wa.me/91${phone}?text=${encodeURIComponent(`నమస్కారం ${m.n} గారు, జనసేన పార్టీ పిఠాపురం బూత్ #${boothInfo.part_no} నుండి సంప్రదిస్తున్నాము.`)}`}
                                        target="_blank"
                                        rel="noreferrer"
                                        className="p-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded-md text-[10px] flex items-center gap-1"
                                        title="WhatsApp"
                                      >
                                        <MessageSquare className="w-2.5 h-2.5" /> WA
                                      </a>
                                    </>
                                  ) : null}
                                  <button
                                    onClick={() => onOpenPhoneEditor(m)}
                                    className="p-1 bg-slate-800 text-slate-300 rounded-md text-[10px]"
                                    title="Edit Phone"
                                  >
                                    Edit Phone
                                  </button>
                                </div>

                                <button
                                  onClick={() => onOpenSlip(m)}
                                  className="p-1 bg-slate-800 text-amber-300 rounded-md text-[10px] font-bold flex items-center gap-0.5"
                                >
                                  <Printer className="w-2.5 h-2.5" /> Slip
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}

            {filteredFamilies.length === 0 && (
              <div className="py-12 text-center text-slate-500 text-xs space-y-2">
                <p className="font-bold text-slate-300 text-sm">No Family Groups Match</p>
                <p>Tap "Group Family" above to create custom household groups.</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
