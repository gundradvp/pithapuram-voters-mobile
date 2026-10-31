import React, { useState, useMemo, useEffect } from 'react';
import { Search, Phone, PhoneCall, MessageSquare, Send, Printer, CheckCircle2, Flag, UserX, AlertCircle, Sparkles, Home, UserCheck, Sliders, Plus, Clock, User, Volume2, Users, Building, ChevronDown, ChevronUp, Copy, Hash } from 'lucide-react';
import { MobileVoter, BoothInfo, VoterSurveyStatus, VoterCampaignProfile } from '../types';
import { Language, translations } from '../utils/i18n';
import { resolvePhotoUrl } from '../utils/photoResolver';
import { matchesPhoneticSearch } from '../utils/phoneticSearch';
import { classifyBoothSurnames, extractSurname, SurnameGroup } from '../utils/surnameClassifier';
import { analyzeDuplicateVoters, DuplicateMatchInfo } from '../utils/duplicateDetector';
import { DuplicateCompareModal } from './DuplicateCompareModal';

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
  onOpenGroupPrint?: (title: string, subtitle: string, voters: MobileVoter[]) => void;
  onOpenSurnameLeaning?: (clanId?: string) => void;
}

export function parseSnoQuery(raw: string): ((sno: number) => boolean) | null {
  const clean = raw.trim().replace(/^sno[:\s]*/i, '').replace(/^#+/, '').trim();
  if (!clean) return null;

  const rangeMatch = clean.match(/^(\d+)\s*(?:-|to|\.\.)\s*(\d+)$/i);
  if (rangeMatch) {
    const start = parseInt(rangeMatch[1], 10);
    const end = parseInt(rangeMatch[2], 10);
    const min = Math.min(start, end);
    const max = Math.max(start, end);
    return (sno: number) => sno >= min && sno <= max;
  }

  if (clean.includes(',') || (clean.includes(' ') && !clean.includes('-'))) {
    const nums = clean
      .split(/[,\s]+/)
      .map(x => parseInt(x.trim(), 10))
      .filter(x => !isNaN(x));
    if (nums.length > 0) {
      const set = new Set(nums);
      return (sno: number) => set.has(sno);
    }
  }

  const single = parseInt(clean, 10);
  if (!isNaN(single)) {
    return (sno: number) => sno === single;
  }

  return null;
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
  onOpenSlip,
  onOpenGroupPrint,
  onOpenSurnameLeaning
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [snoQuery, setSnoQuery] = useState('');
  const [isSnoFilterOpen, setIsSnoFilterOpen] = useState(false);
  const [selectedStreet, setSelectedStreet] = useState<string>('all');
  const [selectedSurname, setSelectedSurname] = useState<string>('all');
  const [viewMode, setViewMode] = useState<'list' | 'surnames'>('list');
  const [isPhoneticEnabled, setIsPhoneticEnabled] = useState<boolean>(true);
  const [expandedSurnameId, setExpandedSurnameId] = useState<string | null>(null);
  const [filterMode, setFilterMode] = useState<
    'all' | 'full' | 'soft' | 'strong' | 'neutral' | 'opponent' | 'exact' | 'similar' | 'kriya_all' | 'voted' | 'has_phone' | 'duplicates' | 'duplicates_exact' | 'duplicates_50'
  >('all');
  const [visibleCount, setVisibleCount] = useState(30);
  const [activeMenuSno, setActiveMenuSno] = useState<number | null>(null);
  const [copiedPhoneId, setCopiedPhoneId] = useState<string | null>(null);
  const [selectedDuplicateCluster, setSelectedDuplicateCluster] = useState<{
    voters: MobileVoter[];
    reasonTe: string;
    reasonEn: string;
    confidencePct: number;
    matchLevel: any;
  } | null>(null);

  // Auto-reset filters whenever the active booth/ward changes
  useEffect(() => {
    setSelectedSurname('all');
    setSelectedStreet('all');
    setSearchQuery('');
    setSnoQuery('');
    setIsSnoFilterOpen(false);
    setFilterMode('all');
    setVisibleCount(30);
    setSelectedDuplicateCluster(null);
  }, [boothInfo?.part_no]);

  const handleCopyPhone = (number: string, id: string) => {
    navigator.clipboard.writeText(number);
    setCopiedPhoneId(id);
    setTimeout(() => {
      setCopiedPhoneId(null);
    }, 2000);
  };

  const t = translations[language];

  // Precomputed S.No Direct Filter Predicate
  const snoFilterPredicate = useMemo(() => {
    return parseSnoQuery(snoQuery);
  }, [snoQuery]);

  // Precomputed Main Search S.No Predicate (e.g. if user types "#286" or "sno:286" in main search)
  const searchSnoPredicate = useMemo(() => {
    const q = searchQuery.trim();
    if (q.startsWith('#') || /^sno[:\s]+\d+/i.test(q)) {
      return parseSnoQuery(q);
    }
    return null;
  }, [searchQuery]);

  // S.No Range Presets for quick jumping (e.g. 1-50, 51-100, 101-150...)
  const snoRangePresets = useMemo(() => {
    if (!voters.length) return [];
    let maxSno = 0;
    voters.forEach(v => {
      if (v.s > maxSno) maxSno = v.s;
    });
    if (maxSno <= 0) maxSno = voters.length;
    const step = maxSno > 1000 ? 100 : 50;
    const presets: Array<{ label: string; start: number; end: number }> = [];
    for (let i = 1; i <= maxSno; i += step) {
      const start = i;
      const end = Math.min(i + step - 1, maxSno);
      presets.push({ label: `${start}-${end}`, start, end });
    }
    return presets;
  }, [voters]);

  // Precomputed Duplicate Votes Analysis
  const dupAnalysis = useMemo(() => {
    return analyzeDuplicateVoters(voters);
  }, [voters]);

  // Precomputed Surnames Grouping with Duplicate counts
  const surnameGroups = useMemo(() => {
    return classifyBoothSurnames(voters, profiles, dupAnalysis.voterDupMap);
  }, [voters, profiles, dupAnalysis.voterDupMap]);

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
      const pct = prof.supportPct;
      const phone = prof.customPhone || v.k_m;

      // Direct S.No Filter
      if (snoFilterPredicate) {
        if (!snoFilterPredicate(v.s)) return false;
      }

      // 1. Text Search (Phonetic Sound-alike + Exact Substring / S.No)
      if (q) {
        if (searchSnoPredicate) {
          if (!searchSnoPredicate(v.s)) return false;
        } else if (/^\d+$/.test(q) && String(v.s) === q) {
          // Direct S.No match from search input!
        } else if (isPhoneticEnabled) {
          if (!matchesPhoneticSearch(q, v, phone, prof.influencerName)) return false;
        } else {
          const snoMatch = String(v.s) === q;
          const nMatch = v.n.toLowerCase().includes(q);
          const rMatch = v.r.toLowerCase().includes(q);
          const idMatch = v.id.toLowerCase().includes(q);
          const hnMatch = v.hn.toLowerCase().includes(q);
          const pMatch = phone && phone.includes(q);
          const infMatch = prof.influencerName?.toLowerCase().includes(q);
          const secMatch = v.sec?.toLowerCase().includes(q);
          if (!snoMatch && !nMatch && !rMatch && !idMatch && !hnMatch && !pMatch && !infMatch && !secMatch) return false;
        }
      }

      // Surname Filter
      if (selectedSurname !== 'all') {
        const { en } = extractSurname(v);
        if (en !== selectedSurname) return false;
      }

      // Street Filter
      if (selectedStreet !== 'all') {
        if (!v.sec || !v.sec.includes(selectedStreet)) return false;
      }

      // 2. Leaning / Filter Mode
      if (filterMode === 'duplicates') return !!dupAnalysis.voterDupMap[v.s];
      if (filterMode === 'duplicates_exact') return dupAnalysis.voterDupMap[v.s]?.confidencePct >= 80;
      if (filterMode === 'duplicates_50') return dupAnalysis.voterDupMap[v.s]?.confidencePct < 80;
      if (filterMode === 'full') return pct === 100;
      if (filterMode === 'soft') return pct === 40;
      if (filterMode === 'strong') return pct !== undefined && pct >= 75 && pct < 100;
      if (filterMode === 'neutral') return pct === 50;
      if (filterMode === 'opponent') return pct === 0;
      if (filterMode === 'exact') return v.k_type === 'exact';
      if (filterMode === 'similar') return v.kriya && v.k_type !== 'exact';
      if (filterMode === 'kriya_all') return v.kriya;
      if (filterMode === 'voted') return prof.survey_status === 'voted';
      if (filterMode === 'has_phone') return !!phone;

      return true;
    });
  }, [voters, searchQuery, selectedStreet, selectedSurname, filterMode, profiles, isPhoneticEnabled, dupAnalysis.voterDupMap, snoFilterPredicate, searchSnoPredicate]);

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
      const pct = prof.supportPct;
      const phone = prof.customPhone || v.k_m;

      if (pct !== undefined) {
        if (pct === 100) full++;
        else if (pct >= 75) strong++;
        else if (pct === 40) soft++;
        else if (pct === 0) opponent++;
        else if (pct === 50) neutral++;
      }

      if (v.kriya) {
        kriyaAll++;
        if (v.k_type === 'exact') exact++;
        else similar++;
      }

      if (prof.survey_status === 'voted') voted++;
      if (phone) hasPhone++;
    });

    return {
      all: voters.length,
      full,
      soft,
      strong,
      neutral,
      opponent,
      exact,
      similar,
      kriyaAll,
      voted,
      hasPhone,
      duplicates: dupAnalysis.totalDuplicateVotersCount,
      exactDups: dupAnalysis.exactCount,
      partial50Dups: dupAnalysis.partial50Count
    };
  }, [voters, profiles, dupAnalysis.totalDuplicateVotersCount, dupAnalysis.exactCount, dupAnalysis.partial50Count]);

  const displayedVoters = filteredVoters.slice(0, visibleCount);

  // Surnames matching query or selected surname
  const displayedSurnameGroups = useMemo(() => {
    if (selectedSurname !== 'all') {
      return surnameGroups.filter(g => g.id === selectedSurname);
    }
    const q = searchQuery.toLowerCase().trim();
    if (!q) return surnameGroups;
    return surnameGroups.filter(g => {
      return (
        g.nameEn.toLowerCase().includes(q) ||
        g.nameTe.toLowerCase().includes(q) ||
        g.voters.some(v => matchesPhoneticSearch(q, v))
      );
    });
  }, [surnameGroups, selectedSurname, searchQuery]);

  const getLeaningBadge = (pct?: number) => {
    if (pct === undefined) {
      return (
        <span className="px-1.5 py-0.2 bg-slate-800/80 text-slate-400 border border-slate-700/80 rounded-md text-[9px] font-medium flex items-center gap-0.5">
          ⚪ {language === 'te' ? 'సర్వే కాలేదు' : 'Unsurveyed'}
        </span>
      );
    }
    if (pct === 100) {
      return (
        <span className="px-1.5 py-0.2 bg-red-600/30 text-red-300 border border-red-500/50 rounded-md text-[9px] font-black flex items-center gap-0.5">
          🚩 {language === 'te' ? '100% మనవాళ్లే' : '100% Support'}
        </span>
      );
    }
    if (pct >= 75) {
      return (
        <span className="px-1.5 py-0.2 bg-emerald-600/30 text-emerald-300 border border-emerald-500/50 rounded-md text-[9px] font-black flex items-center gap-0.5">
          🟢 {pct}% {language === 'te' ? 'అనుకూలం' : 'Strong'}
        </span>
      );
    }
    if (pct === 40) {
      return (
        <span className="px-1.5 py-0.2 bg-amber-600/30 text-amber-300 border border-amber-500/50 rounded-md text-[9px] font-black flex items-center gap-0.5">
          🟡 {pct}% {language === 'te' ? 'సానుకూలం' : 'Positive'}
        </span>
      );
    }
    if (pct === 0) {
      return (
        <span className="px-1.5 py-0.2 bg-rose-950/80 text-rose-400 border border-rose-500/50 rounded-md text-[9px] font-black flex items-center gap-0.5">
          🔴 0% {language === 'te' ? 'ప్రత్యర్థి' : 'Opponent'}
        </span>
      );
    }
    if (pct <= 25) {
      return (
        <span className="px-1.5 py-0.2 bg-orange-600/30 text-orange-300 border border-orange-500/50 rounded-md text-[9px] font-bold flex items-center gap-0.5">
          🟠 {pct}% {language === 'te' ? 'అనుమానం' : 'Doubtful'}
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

  const getMoneyBadge = (moneyStatus?: string) => {
    switch (moneyStatus) {
      case 'opponent_paid_safe':
        return <span className="px-1.5 py-0.2 bg-emerald-950 text-emerald-300 border border-emerald-500/50 rounded text-[9px] font-black flex items-center gap-0.5" title="డబ్బులు తీసుకున్నా గాజు గ్లాసుకే వేస్తారు">💰 డబ్బు తీసుకున్నా గ్లాసుకే</span>;
      case 'opponent_paid_swung':
        return <span className="px-1.5 py-0.2 bg-rose-950 text-rose-300 border border-rose-500/50 rounded text-[9px] font-black flex items-center gap-0.5" title="డబ్బు ప్రభావంతో ప్రత్యర్థి వైపు తిరిగారు">💸 డబ్బుతో మారారు</span>;
      case 'at_risk_cash':
        return <span className="px-1.5 py-0.2 bg-amber-950 text-amber-300 border border-amber-500/50 rounded text-[9px] font-black flex items-center gap-0.5" title="డబ్బుతో మారే ప్రమాదం ఉంది">⚠️ డబ్బు రిస్క్</span>;
      case 'counter_secured':
        return <span className="px-1.5 py-0.2 bg-blue-950 text-blue-300 border border-blue-500/50 rounded text-[9px] font-black flex items-center gap-0.5" title="మన బృందం భరోసా ఇచ్చి ఓటు భద్రపరిచింది">🛡️ భరోసా ఇచ్చాం</span>;
      default:
        return null;
    }
  };

  const handleShareClanWhatsApp = (clan: SurnameGroup) => {
    const isMunicipal = boothInfo.election_type === 'municipal';
    const locationName = isMunicipal
      ? `${boothInfo.local_body || 'పురపాలక సంఘం'} (${boothInfo.ward_no ? `${boothInfo.ward_no}వ వార్డు` : ''})`
      : `పిఠాపురం నియోజకవర్గం — ${boothInfo.clean_village || 'గ్రామం'}`;
    
    const text = `*🚩 జై జనసేన — ${locationName}*
*గౌరవనీయులైన ${clan.nameTe} (${clan.nameEn}) కుటుంబ పెద్దలకు నమస్కారం!*

మన ప్రాంత/వార్డు అభివృద్ధి కొరకు మరియు మన ప్రియతమ నాయకుడు పవన్ కళ్యాణ్ గారి నాయకత్వంలో మంచి పరిపాలన కోసం, మీ *${clan.nameTe}* వంశ కుటుంబ సభ్యులందరి ఆశీస్సులు, సంపూర్ణ మద్దతు *గాజు గ్లాసు* గుర్తుకు అందించవలసిందిగా వినమ్రంగా కోరుతున్నాము.

📊 *మీ కుటుంబ ఓటర్ల బలం:* ${clan.totalVoters} ఓట్లు (బూత్ #${boothInfo.part_no})
🏛️ *పోలింగ్ కేంద్రం:* ${boothInfo.ps_address}

_మీ అమూల్యమైన ఓటును గాజు గ్లాసు గుర్తుపై వేసి జనసేన పార్టీ అభ్యర్థిని భారీ మెజారిటీతో గెలిపించండి!_ 🚩`;

    const cleanPhone = clan.headPhone ? clan.headPhone.replace(/[^0-9]/g, '') : '';
    const url = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(text)}`;
    window.open(url, '_blank');
  };

  return (
    <div className="space-y-3 pb-24 text-xs">
      {/* Search Input & View Mode Controls */}
      <div className="sticky top-[51px] z-30 bg-slate-950/95 backdrop-blur-md pt-2 pb-1 space-y-2">
        <div className="flex items-center gap-1.5">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => {
                setSearchQuery(e.target.value);
                setVisibleCount(30);
              }}
              placeholder={language === 'te' ? 'పేరు, ఇంటిపేరు (శబ్దోచ్ఛారణ), ఫోన్, ID...' : t.searchPlaceholder}
              className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-400 shadow-md"
            />
          </div>

          {/* Phonetic Search Toggle */}
          <button
            onClick={() => setIsPhoneticEnabled(!isPhoneticEnabled)}
            className={`px-2 py-2 rounded-xl text-[10px] font-bold border transition-all flex items-center gap-1 shrink-0 ${
              isPhoneticEnabled
                ? 'bg-amber-500/20 border-amber-500/60 text-amber-300 font-extrabold shadow-sm'
                : 'bg-slate-900 border-slate-800 text-slate-500 hover:text-slate-300'
            }`}
            title={language === 'te' ? 'ఫోనెటిక్ శోధన (ఉచ్ఛారణ ఆధారంగా ఒకేలా ఉండే పేర్లను కనుగొంటుంది)' : 'Phonetic Sound-alike Search'}
          >
            <Volume2 className="w-3.5 h-3.5" />
            <span className="hidden sm:inline font-mono text-[9px]">{isPhoneticEnabled ? '🔊 ON' : 'OFF'}</span>
          </button>

          {/* S.No Quick Filter Toggle Button */}
          <button
            onClick={() => setIsSnoFilterOpen(!isSnoFilterOpen)}
            className={`px-2.5 py-2 rounded-xl text-[10px] font-bold border transition-all flex items-center gap-1 shrink-0 ${
              isSnoFilterOpen || snoQuery
                ? 'bg-amber-500 text-slate-950 border-amber-400 font-black shadow-md'
                : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white hover:border-slate-700'
            }`}
            title={language === 'te' ? 'క్రమ సంఖ్య (S.No) ఆధారంగా ఫిల్టర్ చేయండి' : 'Filter directly by Voter Serial Number'}
          >
            <Hash className="w-3.5 h-3.5" />
            <span className="font-mono text-[10px] font-bold">S.No</span>
          </button>

          {/* View Mode Toggle: List vs Surname Groups */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-0.5 flex items-center shrink-0">
            <button
              onClick={() => setViewMode('list')}
              className={`px-2 py-1.5 rounded-lg text-[10px] font-bold transition-all flex items-center gap-1 ${
                viewMode === 'list'
                  ? 'bg-amber-500 text-slate-950 font-black'
                  : 'text-slate-400 hover:text-white'
              }`}
              title="Standard Voter List View"
            >
              <Users className="w-3.5 h-3.5" />
              <span className="hidden xs:inline">{language === 'te' ? 'జాబితా' : 'List'}</span>
            </button>
            <button
              onClick={() => setViewMode('surnames')}
              className={`px-2 py-1.5 rounded-lg text-[10px] font-bold transition-all flex items-center gap-1 ${
                viewMode === 'surnames'
                  ? 'bg-amber-500 text-slate-950 font-black'
                  : 'text-slate-400 hover:text-white'
              }`}
              title="Group Voters by Surname Clan"
            >
              <Building className="w-3.5 h-3.5" />
              <span className="hidden xs:inline">{language === 'te' ? 'ఇంటిపేర్లు' : 'Surnames'}</span>
            </button>
          </div>
        </div>

        {/* Expandable Direct S.No Filter Tray */}
        {isSnoFilterOpen && (
          <div className="bg-slate-900/95 border border-amber-500/40 rounded-2xl p-2.5 space-y-2 animate-in fade-in slide-in-from-top-1 duration-150 shadow-lg">
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-amber-400 font-mono font-black text-xs">#</span>
                <input
                  type="text"
                  value={snoQuery}
                  onChange={(e) => setSnoQuery(e.target.value)}
                  placeholder={language === 'te' ? 'క్రమ సంఖ్య (ఉదా: 286 లేదా 100-150 లేదా 15,28,45)' : 'S.No (e.g., 286 or 100-150 or 15,28,45)'}
                  className="w-full pl-7 pr-7 py-1.5 bg-slate-950 border border-slate-700 focus:border-amber-400 rounded-xl text-xs text-white placeholder-slate-500 font-mono focus:outline-none"
                  autoFocus
                />
                {snoQuery && (
                  <button
                    onClick={() => setSnoQuery('')}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white text-xs px-1"
                    title="క్లియర్"
                  >
                    ✕
                  </button>
                )}
              </div>
              {snoQuery && (
                <button
                  onClick={() => setSnoQuery('')}
                  className="px-2 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-[10px] font-bold shrink-0"
                >
                  {language === 'te' ? 'క్లియర్' : 'Clear'}
                </button>
              )}
            </div>

            {/* Quick S.No Range Jump Chips */}
            {snoRangePresets.length > 0 && (
              <div className="flex items-center gap-1.5 overflow-x-auto py-0.5 scrollbar-none text-[10px]">
                <span className="text-slate-400 font-bold shrink-0 text-[10px] flex items-center gap-1">
                  🔢 {language === 'te' ? 'రేంజ్:' : 'Range:'}
                </span>
                {snoRangePresets.map((preset) => {
                  const isActive = snoQuery === `${preset.start}-${preset.end}`;
                  return (
                    <button
                      key={preset.label}
                      onClick={() => setSnoQuery(isActive ? '' : `${preset.start}-${preset.end}`)}
                      className={`px-2 py-0.5 rounded-lg font-mono font-bold whitespace-nowrap transition-all border ${
                        isActive
                          ? 'bg-amber-500 text-slate-950 border-amber-400 font-black shadow-sm'
                          : 'bg-slate-950 text-slate-300 border-slate-800 hover:border-amber-500/50 hover:text-amber-300'
                      }`}
                    >
                      #{preset.label}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Surnames Quick Chips */}
        {surnameGroups.length > 0 && (
          <div className="flex items-center gap-1.5 overflow-x-auto py-0.5 scrollbar-none text-[10.5px]">
            <span className="text-amber-400 font-bold flex-shrink-0 flex items-center gap-1">
              🏛️ {language === 'te' ? 'ఇంటిపేరు:' : 'Surname:'}
            </span>
            {onOpenSurnameLeaning && (
              <button
                onClick={() => onOpenSurnameLeaning(selectedSurname !== 'all' ? selectedSurname : undefined)}
                className="px-2 py-0.5 rounded-md font-black whitespace-nowrap transition-all flex items-center gap-1 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 shadow-sm"
                title="ఇంటిపేరు ప్రకారం ఒకే క్లిక్‌తో మొగ్గు సెట్ చేయండి"
              >
                <span>⚡ మొగ్గు సెట్</span>
              </button>
            )}
            <button
              onClick={() => { setSelectedSurname('all'); setVisibleCount(30); }}
              className={`px-2 py-0.5 rounded-md font-bold whitespace-nowrap transition-all ${
                selectedSurname === 'all'
                  ? 'bg-amber-500 text-slate-950 font-black'
                  : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
              }`}
            >
              {language === 'te' ? 'అన్నీ' : 'All'}
            </button>
            {surnameGroups.slice(0, 15).map(g => (
              <button
                key={g.id}
                onClick={() => { setSelectedSurname(selectedSurname === g.id ? 'all' : g.id); setVisibleCount(30); }}
                className={`px-2 py-0.5 rounded-md font-bold whitespace-nowrap transition-all flex items-center gap-1 ${
                  selectedSurname === g.id
                    ? 'bg-amber-500 text-slate-950 font-black'
                    : 'bg-slate-900 text-amber-300 hover:text-white border border-amber-500/30'
                }`}
              >
                <span>{g.nameTe || g.nameEn}</span>
                <span className="font-mono text-[9.5px] opacity-80">({g.totalVoters})</span>
              </button>
            ))}
          </div>
        )}

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

          {counts.exactDups > 0 && (
            <button
              onClick={() => { setFilterMode('duplicates_exact'); setVisibleCount(30); }}
              className={`px-2.5 py-1 rounded-lg font-bold whitespace-nowrap transition-all flex items-center gap-1 ${
                filterMode === 'duplicates_exact'
                  ? 'bg-rose-950 text-rose-200 font-black shadow-sm ring-1 ring-rose-500'
                  : 'bg-slate-900 text-rose-400 border border-rose-500/40 hover:bg-slate-800'
              }`}
              title={language === 'te' ? '100% పక్కా డూప్లికేట్ ఓట్లు (ఒకే EPIC లేదా ఒకే పేరు & బంధువు)' : '100% Exact Duplicates'}
            >
              <span>🔴 100% {language === 'te' ? 'డూప్లికేట్లు' : 'Exact Dups'} ({counts.exactDups})</span>
            </button>
          )}

          {counts.partial50Dups > 0 && (
            <button
              onClick={() => { setFilterMode('duplicates_50'); setVisibleCount(30); }}
              className={`px-2.5 py-1 rounded-lg font-bold whitespace-nowrap transition-all flex items-center gap-1 ${
                filterMode === 'duplicates_50'
                  ? 'bg-amber-950 text-amber-200 font-black shadow-sm ring-1 ring-amber-500'
                  : 'bg-slate-900 text-amber-400 border border-amber-500/40 hover:bg-slate-800'
              }`}
              title={language === 'te' ? '50% అనుమానిత డూప్లికేట్ ఓట్లు (ఒకే పేరు & సమాన వయస్సు, బంధువు పేరు వేరు)' : '50% Suspected Duplicates'}
            >
              <span>🟡 50% {language === 'te' ? 'డూప్లికేట్లు' : '50% Dups'} ({counts.partial50Dups})</span>
            </button>
          )}

          <button
            onClick={() => { setFilterMode('duplicates'); setVisibleCount(30); }}
            className={`px-2.5 py-1 rounded-lg font-bold whitespace-nowrap transition-all flex items-center gap-1 ${
              filterMode === 'duplicates'
                ? 'bg-purple-950 text-purple-200 font-black shadow-sm ring-1 ring-purple-500'
                : 'bg-slate-900 text-purple-300 border border-purple-500/40 hover:bg-slate-800'
            }`}
            title={language === 'te' ? 'అన్ని డూప్లికేట్లు (100% + 50%)' : 'All Duplicate Votes'}
          >
            <span>⚠️ {language === 'te' ? 'మొత్తం డూప్లికేట్లు' : 'All Dups'} ({counts.duplicates})</span>
          </button>
        </div>
      </div>

      {/* Showing Count */}
      <div className="flex items-center justify-between text-[11px] text-slate-400 px-1 gap-2 flex-wrap">
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

        <div className="flex items-center gap-2">
          {filteredVoters.length > 0 && onOpenGroupPrint && (
            <button
              onClick={() => {
                const groupTitle = selectedSurname !== 'all'
                  ? `${selectedSurname} వంశ ఓటర్ల జాబితా`
                  : selectedStreet !== 'all'
                    ? `${selectedStreet} వీధి ఓటర్ల జాబితా`
                    : filterMode !== 'all'
                      ? `${filterMode.toUpperCase()} వర్గం ఓటర్ల జాబితా`
                      : `బూత్ #${boothInfo.part_no} ఓటర్ల జాబితా`;
                onOpenGroupPrint(
                  groupTitle,
                  `${boothInfo.clean_village || boothInfo.ps_address} • మొత్తం ${filteredVoters.length} మంది ఓటర్లు`,
                  filteredVoters
                );
              }}
              className="px-2 py-0.5 bg-slate-900 hover:bg-slate-800 text-amber-300 border border-amber-500/30 rounded-lg text-[10.5px] font-bold flex items-center gap-1 shadow-sm transition-all"
              title="Print Current Filtered Voter List"
            >
              <Printer className="w-3 h-3 text-amber-400" />
              <span>🖨️ ప్రింట్ ({filteredVoters.length})</span>
            </button>
          )}
          {searchQuery && (
            <button 
              onClick={() => setSearchQuery('')}
              className="text-amber-400 font-bold hover:underline"
            >
              {t.clearSearch}
            </button>
          )}
        </div>
      </div>

      {/* Active Filter Indicator if S.No is filtered */}
      {snoQuery && (
        <div className="bg-amber-500/10 border border-amber-500/40 rounded-xl px-3 py-1.5 flex items-center justify-between text-[11px] animate-in fade-in">
          <span className="text-amber-300 font-bold flex items-center gap-1.5">
            🔢 {language === 'te' ? 'క్రమ సంఖ్య (S.No) ఫిల్టర్:' : 'S.No Filter:'}{' '}
            <strong className="text-white font-mono bg-amber-500/20 px-1.5 py-0.5 rounded border border-amber-500/30">#{snoQuery}</strong>
            <span className="text-slate-400 font-normal">({filteredVoters.length} {language === 'te' ? 'మంది ఓటర్లు' : 'voters'})</span>
          </span>
          <button
            onClick={() => setSnoQuery('')}
            className="text-amber-400 font-bold hover:underline text-[10px]"
          >
            {language === 'te' ? 'తీసివేయి ✕' : 'Clear ✕'}
          </button>
        </div>
      )}

      {/* Active Filter Indicator if Surname is filtered */}
      {selectedSurname !== 'all' && (
        <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl px-3 py-1.5 flex items-center justify-between text-[11px]">
          <span className="text-amber-300 font-bold flex items-center gap-1.5">
            🏛️ {language === 'te' ? 'ఎంచుకున్న ఇంటిపేరు:' : 'Filtered Surname:'}{' '}
            <strong className="text-white font-mono">
              {(() => {
                const grp = surnameGroups.find(g => g.id === selectedSurname);
                return grp ? `${grp.nameTe} (${grp.nameEn})` : selectedSurname;
              })()}
            </strong>
          </span>
          <button
            onClick={() => setSelectedSurname('all')}
            className="text-amber-400 font-bold hover:underline text-[10px]"
          >
            {language === 'te' ? 'అన్నీ చూపించు ✕' : 'Show All ✕'}
          </button>
        </div>
      )}

      {/* Main Content Area: By Surnames Clan View vs Standard List */}
      {viewMode === 'surnames' ? (
        <div className="space-y-3">
          <div className="bg-gradient-to-r from-amber-950/40 via-slate-900 to-slate-900 border border-amber-500/40 rounded-2xl p-3 flex items-center justify-between">
            <div>
              <h3 className="text-xs font-black text-white flex items-center gap-1.5">
                🏛️ {language === 'te' ? 'ఇంటిపేర్ల వర్గీకరణ & వంశ బలం' : 'Surname Clan Strength'}
              </h3>
              <p className="text-[10px] text-slate-400">
                {language === 'te'
                  ? `ఈ బూత్‌లో మొత్తం ${surnameGroups.length} ఇంటిపేర్లు ఉన్నాయి. టాప్ 10 కుటుంబాల ఓట్లు గెలుపును నిర్ణయిస్తాయి.`
                  : `${surnameGroups.length} unique surnames in this booth. Top clans hold key to victory.`}
              </p>
            </div>
            <span className="px-2 py-1 bg-amber-500/20 text-amber-300 border border-amber-500/40 rounded-lg font-mono font-black text-xs">
              {displayedSurnameGroups.length} Clans
            </span>
          </div>

          {displayedSurnameGroups.map((clan) => {
            const isExpanded = expandedSurnameId === clan.id;
            return (
              <div
                key={clan.id}
                className={`bg-slate-900 border rounded-2xl overflow-hidden transition-all shadow-md ${
                  clan.supportPct >= 75
                    ? 'border-emerald-500/40 bg-gradient-to-r from-emerald-950/15 via-slate-900 to-slate-900'
                    : clan.supportPct >= 50
                      ? 'border-amber-500/40 bg-gradient-to-r from-amber-950/15 via-slate-900 to-slate-900'
                      : 'border-slate-800'
                }`}
              >
                {/* Clan Top Info */}
                <div className="p-3.5 space-y-2.5">
                  <div className="flex items-start justify-between gap-2">
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="w-5 h-5 rounded-full bg-amber-500/20 text-amber-300 font-mono text-[10px] font-black flex items-center justify-center border border-amber-500/40">
                          #{clan.rank}
                        </span>
                        <h3 className="text-sm font-black text-white">
                          {clan.nameTe} <span className="text-slate-400 text-xs font-mono font-bold">({clan.nameEn})</span>
                        </h3>
                        {clan.targetPriority === 'high' && (
                          <span className="px-1.5 py-0.2 bg-red-600/30 text-red-300 border border-red-500/50 rounded text-[9px] font-black">
                            🎯 {language === 'te' ? 'కీలక వంశం' : 'Key Clan'}
                          </span>
                        )}
                        {clan.kriyaCount > 0 && (
                          <span className="px-1.5 py-0.2 bg-gradient-to-r from-red-600 to-amber-600 text-white rounded text-[9px] font-black flex items-center gap-0.5">
                            ⭐ {clan.kriyaCount} క్రియా
                          </span>
                        )}
                        {clan.duplicateCount !== undefined && clan.duplicateCount > 0 && (
                          <span className="px-1.5 py-0.2 bg-rose-950 text-rose-300 border border-rose-500/60 rounded text-[9px] font-black flex items-center gap-0.5 shadow-sm">
                            ⚠️ {clan.duplicateCount} {language === 'te' ? 'డూప్లికేట్లు' : 'Duplicates'}
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] text-slate-400 flex items-center gap-2 flex-wrap">
                        <span className="text-amber-400 font-mono font-black">{clan.totalVoters} ఓట్లు</span>
                        <span>•</span>
                        <span className="text-slate-300">{clan.pctOfBooth}% బూత్ ఓట్లు</span>
                        <span>•</span>
                        <span>👨 {clan.maleCount} / 👩 {clan.femaleCount}</span>
                        <span>•</span>
                        <span>🏠 {clan.houseNumbers.length} ఇళ్లు</span>
                      </div>
                    </div>

                    {/* Support Leaning Badge */}
                    <div className="text-right">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-black inline-block border ${
                        clan.supportPct >= 75
                          ? 'bg-emerald-600/30 text-emerald-300 border-emerald-500/40'
                          : clan.supportPct >= 50
                            ? 'bg-amber-600/30 text-amber-300 border-amber-500/40'
                            : 'bg-slate-800 text-slate-300 border-slate-700'
                      }`}>
                        🚩 {clan.supportPct}% {language === 'te' ? 'మద్దతు' : 'Support'}
                      </span>
                    </div>
                  </div>

                  {/* Vote Breakdown Progress Bar */}
                  <div className="space-y-1">
                    <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden flex">
                      <div style={{ width: `${(clan.fullCount / clan.totalVoters) * 100}%` }} className="bg-red-600" title={`100% Full: ${clan.fullCount}`} />
                      <div style={{ width: `${(clan.strongCount / clan.totalVoters) * 100}%` }} className="bg-emerald-500" title={`75% Strong: ${clan.strongCount}`} />
                      <div style={{ width: `${(clan.neutralCount / clan.totalVoters) * 100}%` }} className="bg-amber-500" title={`Neutral/Swing: ${clan.neutralCount}`} />
                      <div style={{ width: `${(clan.opponentCount / clan.totalVoters) * 100}%` }} className="bg-slate-600" title={`Opponents: ${clan.opponentCount}`} />
                    </div>
                    <div className="flex items-center justify-between text-[9.5px] text-slate-400">
                      <span className="text-red-400 font-bold">మనవాళ్లు: {clan.fullCount + clan.strongCount}</span>
                      <span className="text-amber-400 font-bold">స్వింగ్: {clan.neutralCount}</span>
                      <span className="text-slate-500">వ్యతిరేకం: {clan.opponentCount}</span>
                    </div>
                  </div>

                  {/* Elder & Influencer Touchpoint Banner */}
                  <div className="bg-slate-950/70 border border-slate-800/80 rounded-xl p-2.5 flex items-center justify-between text-[11px]">
                    <div className="space-y-0.5">
                      <span className="text-[10px] text-slate-400 font-bold block flex items-center gap-1">
                        <User className="w-3 h-3 text-amber-400" />
                        {language === 'te' ? 'కుటుంబ పెద్ద / ప్రముఖులు:' : 'Clan Head / Elder:'}
                      </span>
                      <div className="text-white font-bold flex items-center gap-1.5">
                        <span className="truncate max-w-[170px]">{clan.headName || 'Elder'}</span>
                        {clan.headPhone && (
                          <span className="text-emerald-400 font-mono text-[10px]">({clan.headPhone})</span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5">
                      {clan.headPhone && (
                        <>
                          <a
                            href={`tel:${clan.headPhone}`}
                            className="p-1.5 bg-slate-800 hover:bg-slate-700 text-emerald-400 rounded-lg flex items-center gap-1"
                            title="Call Elder"
                          >
                            <Phone className="w-3.5 h-3.5" />
                          </a>
                          <button
                            type="button"
                            onClick={() => handleCopyPhone(clan.headPhone!, `head_${clan.id}`)}
                            className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-lg"
                            title="Copy Elder Phone"
                          >
                            {copiedPhoneId === `head_${clan.id}` ? (
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                            ) : (
                              <Copy className="w-3.5 h-3.5 text-amber-400" />
                            )}
                          </button>
                        </>
                      )}
                      {onOpenSurnameLeaning && (
                        <button
                          onClick={() => onOpenSurnameLeaning(clan.id)}
                          className="px-2 py-1 bg-amber-500 hover:bg-amber-400 text-slate-950 rounded-lg font-black text-[10px] flex items-center gap-1 shadow-sm"
                          title="ఈ వంశ ఓటర్లందరికీ మొగ్గు సెట్ చేయండి"
                        >
                          <Sliders className="w-3 h-3 text-slate-950" />
                          <span>మొగ్గు</span>
                        </button>
                      )}
                      <button
                        onClick={() => handleShareClanWhatsApp(clan)}
                        className="px-2 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg font-black text-[10px] flex items-center gap-1 shadow-sm"
                        title="Send Glass Symbol Appeal to Family Elder on WhatsApp"
                      >
                        <MessageSquare className="w-3 h-3" />
                        <span>వాట్సాప్</span>
                      </button>
                      {onOpenGroupPrint && (
                        <button
                          onClick={() => onOpenGroupPrint(
                            `${clan.nameTe || clan.nameEn} (${clan.nameEn}) వంశ ఓటర్ల జాబితా`,
                            `బూత్ #${boothInfo.part_no} — మొత్తం ${clan.totalVoters} ఓట్లు (${clan.pctOfBooth}%)`,
                            clan.voters
                          )}
                          className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-amber-300 rounded-lg font-bold text-[10px] flex items-center gap-1 border border-slate-700 shadow-sm"
                          title="Print Clan Voter Roster"
                        >
                          <Printer className="w-3 h-3 text-amber-400" />
                          <span>ప్రింట్</span>
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                {/* Clan Members Accordion */}
                <div className="border-t border-slate-800 bg-slate-950/60">
                  <button
                    onClick={() => setExpandedSurnameId(isExpanded ? null : clan.id)}
                    className="w-full px-3.5 py-1.5 flex items-center justify-between text-[11px] text-amber-400 font-bold hover:bg-slate-800/40"
                  >
                    <span>{clan.nameTe} వంశ ఓటర్లు ({clan.voters.length} మంది)</span>
                    {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                  </button>

                  {isExpanded && (
                    <div className="p-3 space-y-2 divide-y divide-slate-800/50">
                      {clan.voters.map(m => {
                        const prof = profiles[m.s] || {};
                        const pct = prof.supportPct;

                        return (
                          <div key={m.s} className="pt-2 first:pt-0 space-y-1">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <span className="font-mono text-amber-400 font-bold">#{m.s}</span>
                                <span className="font-mono text-[10px] text-emerald-400">{m.id}</span>
                                <span className="text-white font-bold text-xs">{m.n}</span>
                                {dupAnalysis.voterDupMap[m.s] && (() => {
                                  const dup = dupAnalysis.voterDupMap[m.s];
                                  return (
                                    <button
                                      type="button"
                                      onClick={() => setSelectedDuplicateCluster({
                                        voters: [m, ...dup.matchingVoters],
                                        reasonTe: dup.reasonTe,
                                        reasonEn: dup.reasonEn,
                                        confidencePct: dup.confidencePct,
                                        matchLevel: dup.matchLevel
                                      })}
                                      className={`px-1.5 py-0.2 rounded text-[8.5px] font-black inline-flex items-center gap-0.5 border shadow-sm hover:scale-105 transition-all ${
                                        dup.confidencePct >= 80
                                          ? 'bg-rose-950 text-rose-300 border-rose-500/60'
                                          : 'bg-amber-950 text-amber-300 border-amber-500/60'
                                      }`}
                                      title={dup.reasonTe}
                                    >
                                      <span>⚠️ {dup.confidencePct >= 80 ? (language === 'te' ? '100% డూప్లికేట్' : '100% Dup') : (language === 'te' ? '50% డూప్లికేట్' : '50% Dup')} (#{dup.matchingSnos.join(', #')})</span>
                                    </button>
                                  );
                                })()}
                              </div>
                              <button
                                onClick={() => onOpenSlip(m)}
                                className="px-2 py-0.5 bg-slate-800 hover:bg-amber-500 hover:text-slate-950 text-amber-300 rounded font-bold text-[9px] border border-slate-700"
                              >
                                {m.card_url || m.card ? '📄 కార్డు' : 'స్లిప్'}
                              </button>
                            </div>

                            <div className="flex items-center justify-between text-[10.5px] text-slate-400">
                              <span>ఇంటి నెం: <strong className="text-amber-300 font-mono">{m.hn}</strong> • {m.a}Y • {m.g === 'M' ? 'పురుషుడు' : 'మహిళ'}</span>
                              <button
                                onClick={() => onOpenSupportPicker(m.n, pct !== undefined ? pct : 50, prof.notes, m.s)}
                                className="hover:scale-105"
                              >
                                {getLeaningBadge(pct)}
                              </button>
                            </div>

                            {/* Contact Row in Clan Roster */}
                            {(m.k_m || prof.customPhone) && (
                              <div className="flex items-center justify-between pt-0.5 text-[10px]">
                                <div className="flex items-center gap-1.5 flex-wrap">
                                  {m.k_m && (
                                    <span className="inline-flex items-center gap-1 bg-red-950/60 border border-red-500/30 px-1.5 py-0.2 rounded text-[9.5px]">
                                      <span className="text-red-300 font-bold">🚩 క్రియ:</span>
                                      <a href={`tel:${m.k_m}`} className="font-mono text-amber-300 font-bold hover:underline flex items-center gap-0.5" title="Call">
                                        <Phone className="w-2 h-2 text-emerald-400" />
                                        <span>{m.k_m}</span>
                                      </a>
                                      <button
                                        type="button"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          handleCopyPhone(m.k_m!, `clan_km_${m.s}`);
                                        }}
                                        className="text-slate-400 hover:text-white p-0.5"
                                        title="Copy Kriya Phone"
                                      >
                                        {copiedPhoneId === `clan_km_${m.s}` ? (
                                          <span className="text-[8px] text-emerald-400 font-bold">✓</span>
                                        ) : (
                                          <Copy className="w-2.5 h-2.5 text-amber-400" />
                                        )}
                                      </button>
                                    </span>
                                  )}
                                  {prof.customPhone && prof.customPhone !== m.k_m && (
                                    <span className="inline-flex items-center gap-1 bg-emerald-950/60 border border-emerald-500/30 px-1.5 py-0.2 rounded text-[9.5px]">
                                      <span className="text-emerald-300 font-bold">📱:</span>
                                      <a href={`tel:${prof.customPhone}`} className="font-mono text-emerald-300 font-bold hover:underline flex items-center gap-0.5" title="Call">
                                        <Phone className="w-2 h-2 text-emerald-400" />
                                        <span>{prof.customPhone}</span>
                                      </a>
                                      <button
                                        type="button"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          handleCopyPhone(prof.customPhone!, `clan_cp_${m.s}`);
                                        }}
                                        className="text-slate-400 hover:text-white p-0.5"
                                        title="Copy Phone"
                                      >
                                        {copiedPhoneId === `clan_cp_${m.s}` ? (
                                          <span className="text-[8px] text-emerald-400 font-bold">✓</span>
                                        ) : (
                                          <Copy className="w-2.5 h-2.5 text-emerald-400" />
                                        )}
                                      </button>
                                    </span>
                                  )}
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* Voter Cards List (Standard List View) */
        <div className="space-y-2.5">
        {displayedVoters.map(v => {
          const prof = profiles[v.s] || {};
          const phone = prof.customPhone || v.k_m;
          const pct = prof.supportPct;
          const sn = extractSurname(v);

          return (
            <div
              key={v.s}
              className={`bg-slate-900/90 border rounded-2xl p-3.5 space-y-2.5 transition-all shadow-md relative ${
                pct === 100
                  ? 'border-red-500/50 bg-gradient-to-r from-red-950/25 via-slate-900 to-slate-900'
                  : pct !== undefined && pct >= 75
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

                <div className="flex items-center gap-1.5 flex-wrap justify-end">
                  {getMoneyBadge(prof.moneyStatus)}
                  {getStatusBadge(prof.survey_status)}
                  <button
                    onClick={() => onOpenSupportPicker(v.n, pct !== undefined ? pct : 50, prof.notes, v.s)}
                    className="hover:scale-105 transition-transform"
                    title={language === 'te' ? 'మద్దతు శాతాన్ని మార్చడానికి ట్యాప్ చేయండి' : 'Tap to change political leaning %'}
                  >
                    {getLeaningBadge(pct)}
                  </button>
                </div>
              </div>

              {/* Name, Card Trigger, Kriya Badge & Details */}
              <div className="flex items-start gap-3 mt-1">
                {/* Clickable Card Badge Trigger */}
                <button
                  type="button"
                  onClick={() => onOpenSlip(v)}
                  className="w-12 h-14 rounded-2xl bg-gradient-to-b from-slate-800 to-slate-900 border border-slate-700/80 hover:border-amber-500/80 active:scale-95 flex flex-col items-center justify-center text-slate-400 shrink-0 shadow-inner transition-all group relative cursor-pointer"
                  title={language === 'te' ? 'పూర్తి ఓటర్ కార్డు చూడటానికి ట్యాప్ చేయండి' : 'Tap to view complete official card'}
                >
                  <div className="w-6 h-6 rounded-lg bg-amber-500/20 text-amber-400 flex items-center justify-center group-hover:scale-110 transition-transform">
                    <span className="text-[12px]">📄</span>
                  </div>
                  <span className="text-[8px] font-black text-amber-300 mt-1 uppercase tracking-tight">
                    {v.card_url || v.card ? 'కార్డు' : 'స్లిప్'}
                  </span>
                  {(v.card_url || v.card) && (
                    <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-emerald-500 border border-slate-900 shadow"></span>
                  )}
                </button>

                <div 
                  className="flex-1 min-w-0 cursor-pointer"
                  onClick={() => onOpenSlip(v)}
                  title={language === 'te' ? 'పూర్తి ఓటర్ కార్డు చూడటానికి ట్యాప్ చేయండి' : 'Tap to view complete official card'}
                >
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <h3 className="text-sm font-black text-white hover:text-amber-300 transition-colors">{v.n}</h3>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedSurname(selectedSurname === sn.en ? 'all' : sn.en);
                        setVisibleCount(30);
                      }}
                      className="px-1.5 py-0.2 rounded bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/30 text-[9px] font-bold inline-flex items-center gap-0.5"
                      title={language === 'te' ? 'ఈ ఇంటిపేరు ఓటర్లను మాత్రమే చూడండి' : 'Filter by this surname'}
                    >
                      <span>🏛️ {sn.te || sn.en}</span>
                    </button>
                    {dupAnalysis.voterDupMap[v.s] && (() => {
                      const dup = dupAnalysis.voterDupMap[v.s];
                      return (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedDuplicateCluster({
                              voters: [v, ...dup.matchingVoters],
                              reasonTe: dup.reasonTe,
                              reasonEn: dup.reasonEn,
                              confidencePct: dup.confidencePct,
                              matchLevel: dup.matchLevel
                            });
                          }}
                          className={`px-1.5 py-0.5 rounded text-[9px] font-black inline-flex items-center gap-1 shadow-sm transition-all hover:scale-105 active:scale-95 ${
                            dup.confidencePct >= 80
                              ? 'bg-rose-950 text-rose-300 border border-rose-500/60'
                              : 'bg-amber-950 text-amber-300 border border-amber-500/60'
                          }`}
                          title={`${dup.reasonTe} (సరిపోల్చడానికి ట్యాప్ చేయండి)`}
                        >
                          <span>⚠️ {dup.confidencePct >= 80 ? (language === 'te' ? '100% డూప్లికేట్' : '100% Duplicate') : (language === 'te' ? '50% డూప్లికేట్' : '50% Duplicate')}</span>
                          <span className="font-mono font-bold underline">(#{dup.matchingSnos.join(', #')})</span>
                        </button>
                      );
                    })()}
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
                </div>
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
                <div className="mt-2 pt-1.5 border-t border-slate-800/80 flex items-center justify-between text-[11px] flex-wrap gap-1.5">
                  <div className="flex items-center gap-2 flex-wrap">
                    {v.k_m && (
                      <div className="inline-flex items-center gap-1.5 bg-red-950/70 border border-red-500/40 px-2 py-0.5 rounded-lg text-[10.5px]">
                        <span className="text-red-300 font-bold">🚩 క్రియ:</span>
                        <a
                          href={`tel:${v.k_m}`}
                          className="font-mono font-black text-amber-300 hover:text-white hover:underline flex items-center gap-1"
                          title={language === 'te' ? 'కాల్ చేయండి (Click to Call)' : 'Click to Call'}
                        >
                          <Phone className="w-2.5 h-2.5 text-emerald-400" />
                          <span>{v.k_m}</span>
                        </a>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleCopyPhone(v.k_m!, `km_${v.s}`);
                          }}
                          className="p-1 hover:bg-red-900/80 rounded text-slate-300 hover:text-white transition-colors flex items-center gap-0.5"
                          title={language === 'te' ? 'క్రియా నంబర్ కాపీ చేయండి (Click to Copy)' : 'Copy Kriya Number'}
                        >
                          {copiedPhoneId === `km_${v.s}` ? (
                            <span className="text-[9px] text-emerald-400 font-bold">✓ కాపీ</span>
                          ) : (
                            <Copy className="w-2.5 h-2.5 text-amber-400" />
                          )}
                        </button>
                      </div>
                    )}

                    {prof.customPhone && prof.customPhone !== v.k_m && (
                      <div className="inline-flex items-center gap-1.5 bg-emerald-950/60 border border-emerald-500/40 px-2 py-0.5 rounded-lg text-[10.5px]">
                        <span className="text-emerald-300 font-bold">📱 ఫోన్:</span>
                        <a
                          href={`tel:${prof.customPhone}`}
                          className="font-mono font-black text-emerald-200 hover:text-white hover:underline flex items-center gap-1"
                          title={language === 'te' ? 'కాల్ చేయండి (Click to Call)' : 'Click to Call'}
                        >
                          <Phone className="w-2.5 h-2.5 text-emerald-400" />
                          <span>{prof.customPhone}</span>
                        </a>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleCopyPhone(prof.customPhone!, `cp_${v.s}`);
                          }}
                          className="p-1 hover:bg-emerald-900/80 rounded text-slate-300 hover:text-white transition-colors flex items-center gap-0.5"
                          title={language === 'te' ? 'ఫోన్ నంబర్ కాపీ చేయండి (Click to Copy)' : 'Copy Phone Number'}
                        >
                          {copiedPhoneId === `cp_${v.s}` ? (
                            <span className="text-[9px] text-emerald-400 font-bold">✓ కాపీ</span>
                          ) : (
                            <Copy className="w-2.5 h-2.5 text-emerald-400" />
                          )}
                        </button>
                      </div>
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

                  {/* Click to Copy Phone */}
                  {phone ? (
                    <button
                      type="button"
                      onClick={() => handleCopyPhone(phone, `bar_${v.s}`)}
                      className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-lg border border-slate-700 text-xs flex items-center gap-1 font-bold active:scale-95 transition-all"
                      title={language === 'te' ? 'ఫోన్ నంబర్ కాపీ చేయండి (Click to Copy)' : 'Copy Phone Number'}
                    >
                      {copiedPhoneId === `bar_${v.s}` ? (
                        <>
                          <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                          <span className="text-emerald-400 font-bold">{language === 'te' ? 'కాపీ అయింది' : 'Copied'}</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3 h-3 text-amber-400" />
                          <span>{language === 'te' ? 'కాపీ' : 'Copy'}</span>
                        </>
                      )}
                    </button>
                  ) : null}

                  {/* Slip & Card */}
                  <button
                    onClick={() => onOpenSlip(v)}
                    className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg border border-slate-700 text-xs flex items-center gap-1 font-bold active:scale-95 transition-all"
                    title="View Full Official Voter Card & Slip"
                  >
                    <Printer className="w-3 h-3 text-amber-400" />
                    <span>{v.card_url || v.card ? (language === 'te' ? 'కార్డు / స్లిప్' : 'Card / Slip') : t.slip}</span>
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
      )}

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
        <div className="py-12 text-center text-slate-500 text-xs space-y-2">
          <p className="font-bold text-slate-300 text-sm">{t.noVotersMatch}</p>
          <p>{t.tryAnotherSearch}</p>
          {(selectedSurname !== 'all' || selectedStreet !== 'all' || filterMode !== 'all' || searchQuery) && (
            <button
              onClick={() => {
                setSelectedSurname('all');
                setSelectedStreet('all');
                setFilterMode('all');
                setSearchQuery('');
                setVisibleCount(30);
              }}
              className="mt-2 px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black rounded-xl text-xs transition-transform active:scale-95 shadow-md"
            >
              {language === 'te' ? 'అన్ని ఫిల్టర్‌లను తీసివేయండి (Show All Voters)' : 'Reset All Filters'}
            </button>
          )}
        </div>
      )}
      {/* Duplicate Compare Modal */}
      {selectedDuplicateCluster && (
        <DuplicateCompareModal
          voters={selectedDuplicateCluster.voters}
          reasonTe={selectedDuplicateCluster.reasonTe}
          reasonEn={selectedDuplicateCluster.reasonEn}
          confidencePct={selectedDuplicateCluster.confidencePct}
          matchLevel={selectedDuplicateCluster.matchLevel}
          language={language}
          onClose={() => setSelectedDuplicateCluster(null)}
          onOpenSlip={onOpenSlip}
        />
      )}
    </div>
  );
};
