import React, { useState, useMemo, useEffect } from 'react';
import { Search, Phone, Trophy, PhoneCall, MessageSquare, Send, Printer, CheckCircle2, Flag, Star, UserX, AlertCircle, Sparkles, Home, UserCheck, Sliders, Plus, Clock, User, Volume2, Users, Building, ChevronDown, ChevronUp, Copy, Hash, X, Mic, MicOff, Zap, RotateCcw, CheckSquare, Square, Table, Edit3, LayoutGrid, List, Layers, ArrowUpDown } from 'lucide-react';
import { MobileVoter, BoothInfo, VoterSurveyStatus, VoterCampaignProfile } from '../types';
import { Language, translations } from '../utils/i18n';
import { resolvePhotoUrl } from '../utils/photoResolver';
import { matchesPhoneticSearch } from '../utils/phoneticSearch';
import { classifyBoothSurnames, extractSurname, SurnameGroup, TELUGU_TO_CANONICAL_EN } from '../utils/surnameClassifier';
import { analyzeDuplicateVoters, DuplicateMatchInfo } from '../utils/duplicateDetector';
import { DuplicateCompareModal } from './DuplicateCompareModal';
import { SpeedDialModal } from './SpeedDialModal';
import { HourlyTurnoutModal } from './HourlyTurnoutModal';
import { VotersExcelGrid } from './VotersExcelGrid';
import { ExportSurnamesModal } from './ExportSurnamesModal';
import { exportVotersBySurnameExcel, exportVotersToExcelCsv } from '../utils/voterExcelExporter';
import { Download, FileSpreadsheet, Settings } from 'lucide-react';
import { openWhatsAppSlip } from '../utils/slipConfig';
import { SlipConfigModal } from './SlipConfigModal';

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
  onQuickToggleOurs?: (serialNo: number) => void;
  onQuickToggleVoted?: (serialNo: number) => void;
  onOpenSlip: (voter: MobileVoter) => void;
  onOpenGroupPrint?: (title: string, subtitle: string, voters: MobileVoter[], initialLayout?: 'slips' | 'table' | 'cards') => void;
  onOpenSurnameLeaning?: (clanId?: string) => void;
  onOpenBulkAssign?: (snos?: number[]) => void;
  onUpdateCustomAlias?: (serialNo: number, alias: string) => void;
  onUpdateCustomPhone?: (serialNo: number, phone: string) => void;
  onUpdateSupportPct?: (serialNo: number, pct: number) => void;
  controlledViewMode?: 'list' | 'surnames' | 'excel';
  onViewModeChange?: (mode: 'list' | 'surnames' | 'excel') => void;
  layoutMode?: 'mobile' | 'desktop';
  onToggleVictoryPredictor?: () => void;
  showVictoryPredictor?: boolean;
  onOpenOutOfVillage?: () => void;
  onOpenFastPunch?: () => void;
  onOpenWardMargin?: () => void;
  onOpenReOcrReview?: (ward?: string, sno?: number) => void;
}

const INITIAL_VISIBLE_COUNT = 50;
const LOAD_MORE_STEP = 100;

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

/* =======================================================================
   INTERNAL MODAL: EXPORT TO EXCEL (9 Fields & Order by Surname)
   ======================================================================= */
interface InlineExportExcelModalProps {
  isOpen: boolean;
  voters: MobileVoter[];
  profiles?: Record<number, VoterCampaignProfile>;
  boothInfo: BoothInfo;
  scopeTitle?: string;
  filePrefix?: string;
  language?: Language;
  onClose: () => void;
}

const ExportExcelModal: React.FC<InlineExportExcelModalProps> = ({
  isOpen,
  voters,
  profiles = {},
  boothInfo,
  scopeTitle,
  filePrefix = 'Voters',
  language = 'te',
  onClose
}) => {
  if (!isOpen) return null;

  const phoneCount = useMemo(() => {
    return voters.filter(v => {
      const prof = profiles[v.s] || {};
      return !!(prof.customPhone || v.k_m || v.v_mob);
    }).length;
  }, [voters, profiles]);

  // Preview first 3 voters sorted by surname
  const previewVoters = useMemo(() => {
    const prepared = voters.slice(0, 30).map(v => {
      const prof = profiles[v.s] || {};
      const { en, te } = extractSurname(v, prof);
      const phone = (prof.customPhone || v.k_m || v.v_mob || '').trim();
      return {
        sno: v.s,
        name: v.n || '',
        surname: te || en || '',
        rel: v.r || '',
        hn: v.hn || '',
        age: v.a || '',
        gender: v.g === 'M' ? 'పురుషుడు (M)' : v.g === 'F' ? 'స్త్రీ (F)' : (v.g || ''),
        epic: v.id || '',
        phone: phone || '—'
      };
    });

    prepared.sort((a, b) => {
      const cmp = a.surname.localeCompare(b.surname, 'te-IN');
      if (cmp !== 0) return cmp;
      return a.sno - b.sno;
    });

    return prepared.slice(0, 3);
  }, [voters, profiles]);

  const handleExportSurname9 = () => {
    exportVotersBySurnameExcel({
      voters,
      profiles,
      boothInfo,
      scopeTitle,
      filePrefix,
      format: 'surname_9_fields'
    });
    onClose();
  };

  const handleExportSno9 = () => {
    exportVotersBySurnameExcel({
      voters,
      profiles,
      boothInfo,
      scopeTitle,
      filePrefix,
      format: 'sno_9_fields'
    });
    onClose();
  };

  const handleExportFull22 = () => {
    exportVotersToExcelCsv({
      voters,
      profiles,
      boothInfo,
      scopeTitle,
      filePrefix,
      format: 'full_22_fields'
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-950/85 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-xl bg-slate-900 border border-slate-800 rounded-t-3xl sm:rounded-2xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden animate-in slide-in-from-bottom duration-300">
        
        {/* Header */}
        <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-gradient-to-r from-emerald-950/40 via-slate-900 to-slate-900">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 flex items-center justify-center">
              <FileSpreadsheet className="w-5 h-5 text-emerald-400" />
            </div>
            <div>
              <h2 className="text-sm font-black text-white flex items-center gap-1.5">
                <span>{language === 'te' ? 'ఎక్సెల్ ఎగుమతి (Excel Export)' : 'Export Electors to Excel'}</span>
              </h2>
              <p className="text-[11px] text-slate-400">
                {language === 'te'
                  ? `బూత్ #${boothInfo.part_no || boothInfo.ward_no} (${boothInfo.clean_village || 'పిఠాపురం'}) • మొత్తం ${voters.length} మంది ఓటర్లు`
                  : `Booth #${boothInfo.part_no || boothInfo.ward_no} • Total ${voters.length} Electors`}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-800 hover:bg-slate-700 flex items-center justify-center text-slate-400 hover:text-white transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-4 space-y-4 overflow-y-auto flex-1 text-xs">
          
          {/* Summary Meta Bar */}
          <div className="grid grid-cols-2 gap-2 p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-center">
            <div>
              <span className="text-[10px] text-slate-400 block font-bold">ఎగుమతి ఓటర్లు</span>
              <span className="text-base font-black text-white font-mono">{voters.length}</span>
            </div>
            <div className="border-l border-slate-800">
              <span className="text-[10px] text-emerald-400 block font-bold">ఫోన్ నంబర్లు ఉన్నవారు</span>
              <span className="text-base font-black text-emerald-300 font-mono">
                {phoneCount} <span className="text-xs text-emerald-500 font-normal">({Math.round((phoneCount / (voters.length || 1)) * 100)}%)</span>
              </span>
            </div>
          </div>

          {/* Action Cards */}
          <div className="space-y-2.5">
            <label className="text-[11px] font-bold text-slate-300 block">
              ⚡ {language === 'te' ? 'ఎగుమతి ఫార్మాట్ ఎంచుకోండి (Select Format):' : 'Choose Export Format:'}
            </label>

            {/* 1. RECOMMENDED: ORDER BY SURNAME (9 Fields) */}
            <button
              type="button"
              onClick={handleExportSurname9}
              className="w-full p-3.5 bg-gradient-to-r from-amber-950/40 via-emerald-950/40 to-slate-900 border-2 border-emerald-500 hover:border-emerald-400 rounded-2xl flex items-center justify-between text-left transition-all active:scale-[0.99] shadow-lg shadow-emerald-950/50 group cursor-pointer"
            >
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-500 text-slate-950 flex items-center justify-center font-black shrink-0 shadow-md">
                  <ArrowUpDown className="w-5 h-5 text-slate-950" />
                </div>
                <div>
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <h4 className="text-xs font-black text-white group-hover:text-amber-300 transition-colors">
                      {language === 'te' ? 'ఇంటిపేర్ల క్రమంలో ఎక్సెల్ (Order by Surname)' : 'Order by Surname (9 Columns)'}
                    </h4>
                    <span className="px-1.5 py-0.2 bg-emerald-500 text-slate-950 text-[9px] rounded font-mono font-black">
                      RECOMMENDED
                    </span>
                    <span className="px-1.5 py-0.2 bg-slate-800 text-amber-300 text-[9px] rounded font-mono font-bold border border-amber-500/30">
                      9 FIELDS
                    </span>
                  </div>
                  <p className="text-[10.5px] text-slate-300 mt-1 leading-snug">
                    {language === 'te'
                      ? 'ఇంటిపేరు (తెలుగు అక్షరమాల) ప్రకారం అమర్చబడింది. కాలమ్‌లు: S.No, ఓటరు పేరు, ఇంటి పేరు, సంబంధీకుడు, House No, Age, Gender, EPIC ID, PHONE'
                      : 'Sorted by Surname (Telugu A-Z) with exact 9 fields for clean printing & verification'}
                  </p>
                </div>
              </div>
              <Download className="w-5 h-5 text-emerald-400 group-hover:translate-y-0.5 transition-transform shrink-0 ml-2" />
            </button>

            {/* 2. ORDER BY S.NO (9 Fields) */}
            <button
              type="button"
              onClick={handleExportSno9}
              className="w-full p-3 bg-slate-950 hover:bg-slate-800/80 border border-slate-800 hover:border-slate-700 rounded-2xl flex items-center justify-between text-left transition-all active:scale-[0.99] group cursor-pointer"
            >
              <div className="flex items-start gap-3">
                <div className="w-9 h-9 rounded-xl bg-blue-500/20 text-blue-300 flex items-center justify-center border border-blue-500/40 shrink-0">
                  <Table className="w-4 h-4 text-blue-400" />
                </div>
                <div>
                  <div className="flex items-center gap-1.5">
                    <h4 className="text-xs font-black text-white group-hover:text-blue-300 transition-colors">
                      {language === 'te' ? 'క్రమ సంఖ్యల ప్రకారం ఎక్సెల్ (S.No Order)' : 'Order by S.No (9 Columns)'}
                    </h4>
                    <span className="px-1.5 py-0.2 bg-blue-500/20 text-blue-300 text-[9px] rounded font-mono font-bold">
                      9 FIELDS
                    </span>
                  </div>
                  <p className="text-[10px] text-slate-400 mt-0.5">
                    {language === 'te'
                      ? 'అదే 9 కాలమ్‌లు బూత్ అసలు సీరియల్ నెంబర్ల (1, 2, 3...) క్రమంలో'
                      : 'Same 9 columns in original booth serial sequence (1, 2, 3...)'}
                  </p>
                </div>
              </div>
              <Download className="w-4 h-4 text-slate-400 group-hover:text-white shrink-0 ml-2" />
            </button>

            {/* 3. FULL 22-FIELD DETAILED REPORT */}
            <button
              type="button"
              onClick={handleExportFull22}
              className="w-full p-3 bg-slate-950 hover:bg-slate-800/80 border border-slate-800 hover:border-slate-700 rounded-2xl flex items-center justify-between text-left transition-all active:scale-[0.99] group cursor-pointer"
            >
              <div className="flex items-start gap-3">
                <div className="w-9 h-9 rounded-xl bg-purple-500/20 text-purple-300 flex items-center justify-center border border-purple-500/40 shrink-0">
                  <Layers className="w-4 h-4 text-purple-400" />
                </div>
                <div>
                  <div className="flex items-center gap-1.5">
                    <h4 className="text-xs font-black text-white group-hover:text-purple-300 transition-colors">
                      {language === 'te' ? 'పూర్తి సమగ్ర ఎక్సెల్ రిపోర్ట్ (Full Analysis)' : 'Full Detailed Report'}
                    </h4>
                    <span className="px-1.5 py-0.2 bg-purple-500/20 text-purple-300 text-[9px] rounded font-mono font-bold">
                      22 FIELDS
                    </span>
                  </div>
                  <p className="text-[10px] text-slate-400 mt-0.5">
                    {language === 'te'
                      ? 'సర్వే స్థితి, JSP మద్దతు %, క్రియా సభ్యత్వం, వీధి, నాయకుడు, గమనికలతో కూడిన పూర్తి డేటా'
                      : 'Includes survey status, support %, kriya membership, street, leader & notes'}
                  </p>
                </div>
              </div>
              <Download className="w-4 h-4 text-slate-400 group-hover:text-white shrink-0 ml-2" />
            </button>
          </div>

          {/* Table Columns Preview */}
          <div className="space-y-1.5 pt-1">
            <span className="text-[11px] font-bold text-slate-400 block">
              👀 9 కాలమ్‌ల ప్రివ్యూ (Preview of 9 Columns):
            </span>
            <div className="overflow-x-auto border border-slate-800 rounded-xl bg-slate-950">
              <table className="w-full text-[9.5px] text-left border-collapse">
                <thead>
                  <tr className="bg-slate-800/80 text-amber-300 border-b border-slate-700 font-bold whitespace-nowrap">
                    <th className="p-1 text-center">S.No</th>
                    <th className="p-1">ఓటరు పేరు (Voter Name)</th>
                    <th className="p-1 text-center text-emerald-400 font-black">ఇంటి పేరు</th>
                    <th className="p-1">సంబంధీకుడు</th>
                    <th className="p-1 text-center">House No</th>
                    <th className="p-1 text-center">AGE</th>
                    <th className="p-1 text-center">లింగం</th>
                    <th className="p-1 text-center">EPIC ID</th>
                    <th className="p-1 text-center text-emerald-400">PHONE</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800 text-slate-300">
                  {previewVoters.map((p, i) => (
                    <tr key={i} className="hover:bg-slate-900/50 whitespace-nowrap">
                      <td className="p-1 text-center font-mono font-bold text-red-400">#{p.sno}</td>
                      <td className="p-1 font-bold text-white max-w-[140px] truncate">{p.name}</td>
                      <td className="p-1 text-center font-bold text-emerald-300 bg-emerald-950/30">{p.surname}</td>
                      <td className="p-1 text-slate-400 max-w-[120px] truncate">{p.rel}</td>
                      <td className="p-1 text-center font-mono">{p.hn}</td>
                      <td className="p-1 text-center">{p.age}</td>
                      <td className="p-1 text-center">{p.gender}</td>
                      <td className="p-1 text-center font-mono font-bold">{p.epic}</td>
                      <td className="p-1 text-center font-mono text-emerald-300">{p.phone}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

        </div>

        {/* Footer */}
        <div className="p-3 border-t border-slate-800 bg-slate-950 flex items-center justify-between">
          <span className="text-[10px] text-slate-500 font-mono">
            UTF-8 BOM • Excel & Google Sheets Ready
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer"
          >
            {language === 'te' ? 'రద్దు / మూసివేయి' : 'Close'}
          </button>
        </div>

      </div>
    </div>
  );
};

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
  onQuickToggleOurs,
  onQuickToggleVoted,
  onOpenSlip,
  onOpenGroupPrint,
  onOpenSurnameLeaning,
  onOpenBulkAssign,
  onUpdateCustomAlias,
  onUpdateCustomPhone,
  onUpdateSupportPct,
  controlledViewMode,
  onViewModeChange,
  layoutMode,
  onToggleVictoryPredictor,
  showVictoryPredictor,
  onOpenOutOfVillage,
  onOpenFastPunch,
  onOpenWardMargin,
  onOpenReOcrReview
}) => {
  // Check layout: Strictly single card per row on mobile or any viewport under 1024px.
  // Multi-column is enabled ONLY on wide desktop screens (>= 1024px) when layoutMode is desktop.
  const effectiveLayoutMode = layoutMode || (typeof window !== 'undefined' && window.innerWidth >= 1024 ? 'desktop' : 'mobile');
  const isDesktopMultiCol = effectiveLayoutMode === 'desktop' && (typeof window === 'undefined' || window.innerWidth >= 1024);

  const [searchQuery, setSearchQuery] = useState('');
  const [snoQuery, setSnoQuery] = useState('');
  const [isSnoFilterOpen, setIsSnoFilterOpen] = useState(false);
  const [selectedWard, setSelectedWard] = useState<string>('all');
  const [selectedStreet, setSelectedStreet] = useState<string>('all');
    const [selectedSurname, setSelectedSurname] = useState<string>('all');
  const [isExportSurnamesModalOpen, setIsExportSurnamesModalOpen] = useState(false);
  const [exportInitialClanId, setExportInitialClanId] = useState<string | undefined>(undefined);
  const [isExportExcelModalOpen, setIsExportExcelModalOpen] = useState(false);
  const [exportExcelScope, setExportExcelScope] = useState<'selected' | 'filtered'>('filtered');
  const [isGroupSimilarSurnames, setIsGroupSimilarSurnames] = useState<boolean>(() => {
    try {
      const boothKey = String(boothInfo?.part_no || boothInfo?.ward_no || 'default');
      const saved = localStorage.getItem(`jsp_group_similar_${boothKey}`);
      return saved !== null ? saved === 'true' : false;
    } catch {
      return false;
    }
  });

  const handleToggleGroupSimilarSurnames = () => {
    setIsGroupSimilarSurnames(prev => {
      const nextVal = !prev;
      try {
        const boothKey = String(boothInfo?.part_no || boothInfo?.ward_no || 'default');
        localStorage.setItem(`jsp_group_similar_${boothKey}`, String(nextVal));
      } catch {}
      return nextVal;
    });
  };
  const [isSlipConfigOpen, setIsSlipConfigOpen] = useState(false);

  const [internalViewMode, setInternalViewMode] = useState<'list' | 'surnames' | 'excel'>(() => {
    try {
      const saved = localStorage.getItem('jsp_voter_view_mode') as 'list' | 'surnames' | 'excel';
      if (saved && ['list', 'surnames', 'excel'].includes(saved)) return saved;
      return typeof window !== 'undefined' && window.innerWidth >= 1024 ? 'excel' : 'list';
    } catch {
      return 'list';
    }
  });

  const viewMode = controlledViewMode !== undefined ? controlledViewMode : internalViewMode;

  const handleSetViewMode = (mode: 'list' | 'surnames' | 'excel') => {
    if (onViewModeChange) {
      onViewModeChange(mode);
    } else {
      setInternalViewMode(mode);
    }
    try {
      localStorage.setItem('jsp_voter_view_mode', mode);
    } catch {}
  };
  const [isPhoneticEnabled, setIsPhoneticEnabled] = useState<boolean>(true);
  const [expandedSurnameId, setExpandedSurnameId] = useState<string | null>(null);
  const [filterMode, setFilterMode] = useState<
    'all' | 'full' | 'soft' | 'strong' | 'neutral' | 'opponent' | 'exact' | 'similar' | 'kriya_all' | 'voted' | 'not_voted' | 'ours_not_voted' | 'has_phone' | 'duplicates' | 'duplicates_exact' | 'duplicates_50' | 'deceased' | 'out_of_city' | 'seniors' | 'women' | 'men' | 'manual_input'
  >('all');
  const [isSpeedDialOpen, setIsSpeedDialOpen] = useState(false);
  const [isHourlyTurnoutOpen, setIsHourlyTurnoutOpen] = useState(false);
  const [isVoiceListening, setIsVoiceListening] = useState(false);
  const [filterDisplayStyle, setFilterDisplayStyle] = useState<'dropdown' | 'chips' | 'hidden'>(() => {
    try {
      const saved = localStorage.getItem('jsp_filter_display_style');
      if (saved === 'dropdown' || saved === 'chips' || saved === 'hidden') return saved;
      return 'dropdown';
    } catch {
      return 'dropdown';
    }
  });
  const [isLiveTrackerExpanded, setIsLiveTrackerExpanded] = useState<boolean>(false);
  const [cardLayout, setCardLayout] = useState<'row' | 'grid'>(() => {
    try {
      const saved = localStorage.getItem('jsp_card_layout');
      if (saved === 'row' || saved === 'grid') return saved;
      return 'row'; // Default to wide horizontal rows matching user's mockup!
    } catch {
      return 'row';
    }
  });

  const handleSetCardLayout = (layout: 'row' | 'grid') => {
    setCardLayout(layout);
    try {
      localStorage.setItem('jsp_card_layout', layout);
    } catch {}
  };
  const [showCards, setShowCards] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem('jsp_pref_show_cards');
      if (saved !== null) return saved === 'true';
      // Default: ON for desktop (>= 1024px) in desktop layout mode, OFF for mobile
      return isDesktopMultiCol;
    } catch {
      return false;
    }
  });

  const handleToggleShowCards = () => {
    setShowCards(prev => {
      const next = !prev;
      try {
        localStorage.setItem('jsp_pref_show_cards', String(next));
      } catch {}
      return next;
    });
  };

  const [desktopViewStyle, setDesktopViewStyle] = useState<'grid' | 'list'>(() => {
    try {
      const saved = localStorage.getItem('jsp_desktop_view_style');
      if (saved === 'grid' || saved === 'list') return saved;
      return 'grid';
    } catch {
      return 'grid';
    }
  });

  const handleSetDesktopViewStyle = (style: 'grid' | 'list') => {
    setDesktopViewStyle(style);
    try {
      localStorage.setItem('jsp_desktop_view_style', style);
    } catch {}
  };

  const handleSetFilterDisplayStyle = (style: 'dropdown' | 'chips' | 'hidden') => {
    setFilterDisplayStyle(style);
    try {
      localStorage.setItem('jsp_filter_display_style', style);
    } catch {}
  };

  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (selectedWard !== 'all') count++;
    if (selectedSurname !== 'all') count++;
    if (selectedStreet !== 'all') count++;
    if (filterMode !== 'all') count++;
    if (snoQuery.trim() !== '') count++;
    return count;
  }, [selectedWard, selectedSurname, selectedStreet, filterMode, snoQuery]);

  const handleToggleOurs = (serialNo: number) => {
    if (onQuickToggleOurs) {
      onQuickToggleOurs(serialNo);
      return;
    }
    const prof = profiles[serialNo] || {};
    const isOurs = (prof.supportPct === 100 || prof.survey_status === 'supporter') && prof.supportPct !== 50;
    onUpdateSurveyMark(serialNo, isOurs ? null : 'supporter');
  };

  const handleToggleVoted = (serialNo: number) => {
    if (onQuickToggleVoted) {
      onQuickToggleVoted(serialNo);
      return;
    }
    const prof = profiles[serialNo] || {};
    const isVoted = prof.survey_status === 'voted';
    onUpdateSurveyMark(serialNo, isVoted ? null : 'voted');
  };

  const handleToggleDeceased = (serialNo: number) => {
    const prof = profiles[serialNo] || {};
    const isDeceased = prof.survey_status === 'deceased';
    onUpdateSurveyMark(serialNo, isDeceased ? null : 'deceased');
  };

  const handleToggleOutOfCity = (serialNo: number) => {
    const prof = profiles[serialNo] || {};
    const isOutOfCity = prof.survey_status === 'out_of_city';
    onUpdateSurveyMark(serialNo, isOutOfCity ? null : 'out_of_city');
  };
  const [visibleCount, setVisibleCount] = useState(INITIAL_VISIBLE_COUNT);
  const [activeMenuSno, setActiveMenuSno] = useState<number | null>(null);
  const [copiedPhoneId, setCopiedPhoneId] = useState<string | null>(null);
  const [copiedEpicId, setCopiedEpicId] = useState<string | null>(null);
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [selectedVoterSnos, setSelectedVoterSnos] = useState<Set<number>>(new Set());

  const isAnyFilterActive = useMemo(() => {
    return (
      searchQuery.trim() !== '' ||
      snoQuery.trim() !== '' ||
      selectedWard !== 'all' ||
      selectedSurname !== 'all' ||
      selectedStreet !== 'all' ||
      filterMode !== 'all'
    );
  }, [searchQuery, snoQuery, selectedWard, selectedSurname, selectedStreet, filterMode]);

  const handleResetAllFilters = () => {
    setSearchQuery('');
    setSnoQuery('');
    setIsSnoFilterOpen(false);
    setSelectedWard('all');
    setSelectedSurname('all');
    setSelectedStreet('all');
    setFilterMode('all');
    setVisibleCount(INITIAL_VISIBLE_COUNT);
    setSelectedVoterSnos(new Set());
    setIsSelectionMode(false);
  };

  const handleToggleSelectVoter = (sno: number) => {
    setSelectedVoterSnos(prev => {
      const next = new Set(prev);
      if (next.has(sno)) next.delete(sno);
      else next.add(sno);
      return next;
    });
  };

  const handleSelectAllDisplayed = () => {
    const allSnos = displayedVoters.map(v => v.s);
    setSelectedVoterSnos(new Set(allSnos));
  };

  const handlePrintSelected = (layout: 'slips' | 'table' | 'cards' = 'slips') => {
    if (!onOpenGroupPrint || selectedVoterSnos.size === 0) return;
    const selected = voters.filter(v => selectedVoterSnos.has(v.s));
    onOpenGroupPrint(
      language === 'te'
        ? (layout === 'table' ? `ఎంచుకున్న ఓటర్ల సాధారణ జాబితా (Roster)` : layout === 'cards' ? `ఎంచుకున్న ఓటర్ల అధికారిక కార్డులు (Photo Cards)` : `ఎంచుకున్న ఓటర్ల స్లిప్పులు`)
        : (layout === 'table' ? `Selected Voter Roster` : layout === 'cards' ? `Selected Voter Photo Cards` : `Selected Voter Slips`),
      `${boothInfo.clean_village || boothInfo.ps_address} • మొత్తం ${selected.length} మంది ఓటర్లు`,
      selected,
      layout
    );
  };

  const handlePrintAll = (layout: 'slips' | 'table' | 'cards' = 'slips') => {
    if (!onOpenGroupPrint || filteredVoters.length === 0) return;
    const suffix = layout === 'table' ? 'సాధారణ జాబితా (Roster)' : layout === 'cards' ? 'అధికారిక కార్డులు (Photo Cards)' : 'స్లిప్పులు';
    const groupTitle = selectedSurname !== 'all'
      ? `${selectedSurname} వంశ ఓటర్ల ${suffix}`
      : selectedStreet !== 'all'
        ? `${selectedStreet} వీధి ఓటర్ల ${suffix}`
        : filterMode === 'out_of_city'
          ? `✈️ ఊరిలో లేని ఓటర్ల ${suffix}`
          : filterMode !== 'all'
            ? `${filterMode.toUpperCase()} వర్గం ఓటర్ల ${suffix}`
            : `బూత్ #${boothInfo.part_no || boothInfo.ward_no} ఓటర్ల ${suffix}`;
    onOpenGroupPrint(
      groupTitle,
      `${boothInfo.clean_village || boothInfo.ps_address} • మొత్తం ${filteredVoters.length} మంది ఓటర్లు`,
      filteredVoters,
      layout
    );
  };

  const handleExportSelectedToExcel = () => {
    if (selectedVoterSnos.size === 0) return;
    setExportExcelScope('selected');
    setIsExportExcelModalOpen(true);
  };

  const handleExportFilteredToExcel = () => {
    if (filteredVoters.length === 0) return;
    setExportExcelScope('filtered');
    setIsExportExcelModalOpen(true);
  };

  const [selectedDuplicateCluster, setSelectedDuplicateCluster] = useState<{
    voters: MobileVoter[];
    reasonTe: string;
    reasonEn: string;
    confidencePct: number;
    matchLevel: any;
  } | null>(null);

  // Auto-reset filters whenever the active booth/ward changes
  useEffect(() => {
    setSelectedWard('all');
    setSelectedSurname('all');
    setSelectedStreet('all');
    setSearchQuery('');
    setSnoQuery('');
    setIsSnoFilterOpen(false);
    setFilterMode('all');
    setVisibleCount(INITIAL_VISIBLE_COUNT);
    setSelectedDuplicateCluster(null);
  }, [boothInfo?.part_no]);

  const handleCopyPhone = (number: string, id: string) => {
    navigator.clipboard.writeText(number);
    setCopiedPhoneId(id);
    setTimeout(() => {
      setCopiedPhoneId(null);
    }, 2000);
  };

  const handleCopyEpic = (epic: string, id: string) => {
    if (!epic || epic === 'NO-EPIC') return;
    try {
      if (navigator?.clipboard?.writeText) {
        navigator.clipboard.writeText(epic);
      } else {
        const textArea = document.createElement('textarea');
        textArea.value = epic;
        textArea.style.position = 'fixed';
        textArea.style.opacity = '0';
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
      }
      setCopiedEpicId(id);
      setTimeout(() => {
        setCopiedEpicId(null);
      }, 2000);
    } catch (err) {
      console.error('Failed to copy EPIC:', err);
    }
  };

  const handleToggleVoiceSearch = () => {
    const SpeechRec = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRec) {
      alert(language === 'te' 
        ? 'మీ బ్రౌజర్‌లో వాయిస్ సెర్చ్ సదుపాయం అందుబాటులో లేదు. Google Chrome వాడండి.' 
        : 'Voice search is not supported in this browser. Please use Chrome.');
      return;
    }

    if (isVoiceListening) {
      setIsVoiceListening(false);
      return;
    }

    try {
      const recognition = new SpeechRec();
      recognition.lang = language === 'te' ? 'te-IN' : 'en-IN';
      recognition.continuous = false;
      recognition.interimResults = false;

      recognition.onstart = () => {
        setIsVoiceListening(true);
      };

      recognition.onresult = (event: any) => {
        const rawTranscript = (event.results[0]?.[0]?.transcript || '').trim();
        if (rawTranscript) {
          const lower = rawTranscript.toLowerCase();

          // 1. Serial Number Intent: "నెంబర్ 45", "క్రమ సంఖ్య 120", "నంబర్ 5", "sno 45"
          const numMatch = rawTranscript.match(/(?:నెంబర్|నెంబరు|క్రమ\s*సంఖ్య|క్రమం|నంబర్|number|sno|serial)\s*[:#]?\s*(\d+)/i) || rawTranscript.match(/^#?(\d+)$/);
          
          if (numMatch) {
            const num = numMatch[1];
            setSnoQuery(num);
            setIsSnoFilterOpen(true);
            setSearchQuery('');
            setVisibleCount(INITIAL_VISIBLE_COUNT);
          }
          // 2. Already Voted Intent: "ఓటు వేశారు", "ఓటు వేసిన వాళ్ళు", "voted"
          else if (/ఓటు\s*(?:వేశారు|వేసిన|వేసారా)|voted/i.test(rawTranscript)) {
            setFilterMode('voted');
            setSearchQuery('');
            setVisibleCount(INITIAL_VISIBLE_COUNT);
          }
          // 3. Not Voted Yet: "ఓటు వేయలేదు", "ఓటు వేయని వారు", "not voted"
          else if (/ఓటు\s*(?:వేయలేదు|వేయని|బాకీ)|not\s*voted/i.test(rawTranscript)) {
            setFilterMode('not_voted');
            setSearchQuery('');
            setVisibleCount(INITIAL_VISIBLE_COUNT);
          }
          // 4. JSP Supporters: "మనవాళ్ళు", "మనోళ్ళు", "జనసేన మద్దతుదారులు", "supporter"
          else if (/మనవాళ్ళు|మనవారు|మనోళ్ళు|జనసేన|మద్దతు|supporter|ours/i.test(rawTranscript)) {
            setFilterMode('full');
            setSearchQuery('');
            setVisibleCount(INITIAL_VISIBLE_COUNT);
          }
          // 5. Out of Village: "ఊర్లో లేరు", "వలస వెళ్ళిన వారు", "out of city"
          else if (/ఊర్లో\s*లేరు|వలస|హైదరాబాద్|బెంగళూరు|విదేశాలు|out\s*of\s*city/i.test(rawTranscript)) {
            setFilterMode('out_of_city');
            setSearchQuery('');
            setVisibleCount(INITIAL_VISIBLE_COUNT);
          }
          // 6. Has Phone: "ఫోన్ ఉన్నవారు", "మొబైల్ ఉన్నవాళ్ళు", "phone"
          else if (/ఫోన్|మొబైల్|phone|mobile/i.test(rawTranscript)) {
            setFilterMode('has_phone');
            setSearchQuery('');
            setVisibleCount(INITIAL_VISIBLE_COUNT);
          }
          // 7. Women Electors: "మహిళలు", "ఆడవారు", "women", "female"
          else if (/మహిళలు|ఆడవారు|స్త్రీలు|women|female/i.test(rawTranscript)) {
            setFilterMode('women');
            setSearchQuery('');
            setVisibleCount(INITIAL_VISIBLE_COUNT);
          }
          // 8. Men Electors: "పురుషులు", "మగవారు", "men", "male"
          else if (/పురుషులు|మగవారు|men|male/i.test(rawTranscript)) {
            setFilterMode('men');
            setSearchQuery('');
            setVisibleCount(INITIAL_VISIBLE_COUNT);
          }
          // 9. Standard Search
          else {
            setSearchQuery(rawTranscript);
            setVisibleCount(INITIAL_VISIBLE_COUNT);
          }
        }
        setIsVoiceListening(false);
      };

      recognition.onerror = () => {
        setIsVoiceListening(false);
      };

      recognition.onend = () => {
        setIsVoiceListening(false);
      };

      recognition.start();
    } catch (err) {
      console.error('Voice search failed to start:', err);
      setIsVoiceListening(false);
    }
  };

  const handleSendWhatsAppSlip = (v: MobileVoter, phone?: string) => {
    openWhatsAppSlip(v, boothInfo, phone);
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
    return analyzeDuplicateVoters(voters, profiles);
  }, [voters, profiles]);

  // Precomputed Surnames Grouping with Duplicate counts (scoped to selected ward)
  const surnameGroups = useMemo(() => {
    const base = selectedWard !== 'all' ? voters.filter(v => String(v.ward_no ?? '') === selectedWard) : voters;
    return classifyBoothSurnames(base, profiles, dupAnalysis.voterDupMap, isGroupSimilarSurnames);
  }, [voters, selectedWard, profiles, dupAnalysis.voterDupMap, isGroupSimilarSurnames]);

  // Unique streets list for chips
  const streetsList = useMemo(() => {
    const sMap = new Map<string, number>();
    const base = selectedWard !== 'all' ? voters.filter(v => String(v.ward_no ?? '') === selectedWard) : voters;
    base.forEach(v => {
      let s = v.sec || '';
      if (s.includes(' - ')) {
        s = s.split(' - ').slice(1).join(' - ');
      }
      if (s) {
        sMap.set(s, (sMap.get(s) || 0) + 1);
      }
    });
    return Array.from(sMap.entries()).sort((a, b) => b[1] - a[1]);
  }, [voters, selectedWard]);

  // Unique wards list for chips (Panchayat Election: View by Ward inside Village)
  const wardsList = useMemo(() => {
    const wMap = new Map<number, number>();
    voters.forEach(v => {
      if (v.ward_no) {
        wMap.set(v.ward_no, (wMap.get(v.ward_no) || 0) + 1);
      }
    });
    return Array.from(wMap.entries()).sort((a, b) => a[0] - b[0]);
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

      // Ward Filter (Panchayat Election)
      if (selectedWard !== 'all') {
        if (String(v.ward_no) !== selectedWard) return false;
      }

      // 1. Text Search (Phonetic Sound-alike + Exact Substring / S.No)
      if (q) {
        if (searchSnoPredicate) {
          if (!searchSnoPredicate(v.s)) return false;
        } else if (/^\d+$/.test(q) && String(v.s) === q) {
          // Direct S.No match from search input!
        } else if (isPhoneticEnabled) {
          if (!matchesPhoneticSearch(q, v, phone, prof.influencerName, prof.customAlias)) return false;
        } else {
          const snoMatch = String(v.s) === q;
          const nMatch = v.n.toLowerCase().includes(q);
          const rMatch = v.r.toLowerCase().includes(q);
          const idMatch = v.id.toLowerCase().includes(q);
          const hnMatch = v.hn.toLowerCase().includes(q);
          const pMatch = phone && phone.includes(q);
          const infMatch = prof.influencerName?.toLowerCase().includes(q);
          const secMatch = v.sec?.toLowerCase().includes(q);
          const aliasMatch = prof.customAlias?.toLowerCase().includes(q);
          if (!snoMatch && !nMatch && !rMatch && !idMatch && !hnMatch && !pMatch && !infMatch && !secMatch && !aliasMatch) return false;
        }
      }

      // Surname Filter (Strictly respects manual user input corrections & aliases + clustered variants)
      if (selectedSurname !== 'all') {
        const activeGroup = surnameGroups.find(g => g.id === selectedSurname);
        const { en, te } = extractSurname(v, prof);
        const cleanTe = (te || '').trim();
        const vClanKey = (cleanTe && TELUGU_TO_CANONICAL_EN[cleanTe])
          ? TELUGU_TO_CANONICAL_EN[cleanTe]
          : en;
        if (activeGroup?.variantIds && activeGroup.variantIds.length > 0) {
          if (!activeGroup.variantIds.includes(vClanKey) && !activeGroup.variantIds.includes(en) && !activeGroup.voters.some(gv => gv.s === v.s)) return false;
        } else {
          if (vClanKey !== selectedSurname && en !== selectedSurname) return false;
        }
      }

      // Street Filter
      if (selectedStreet !== 'all') {
        if (!v.sec || !v.sec.includes(selectedStreet)) return false;
      }

      // 2. Leaning / Filter Mode
      if (filterMode === 'manual_input') {
        const hasManual = !!(prof.customAlias?.trim() || prof.correctedSurnameTe?.trim() || prof.correctedSurnameEn?.trim() || prof.correctedNameTe?.trim() || prof.correctedNameEn?.trim());
        if (!hasManual) return false;
      }
      if (filterMode === 'duplicates') return !!dupAnalysis.voterDupMap[v.s];
      if (filterMode === 'duplicates_exact') return dupAnalysis.voterDupMap[v.s]?.confidencePct >= 80;
      if (filterMode === 'duplicates_50') return dupAnalysis.voterDupMap[v.s]?.confidencePct < 80;
      if (filterMode === 'deceased') return prof.survey_status === 'deceased';
      if (filterMode === 'out_of_city') return prof.survey_status === 'out_of_city';
      if (filterMode === 'full') return pct === 100;
      if (filterMode === 'soft') return pct === 40;
      if (filterMode === 'strong') return pct !== undefined && pct >= 75 && pct < 100;
      if (filterMode === 'neutral') return pct === 50;
      if (filterMode === 'opponent') return pct === 0;
      if (filterMode === 'exact') return v.k_type === 'exact';
      if (filterMode === 'similar') return v.kriya && v.k_type !== 'exact';
      if (filterMode === 'kriya_all') return v.kriya;
      if (filterMode === 'voted') return prof.survey_status === 'voted';
      if (filterMode === 'not_voted') return prof.survey_status !== 'voted' && prof.survey_status !== 'deceased';
      if (filterMode === 'ours_not_voted') {
        const isOurs = (pct === 100 || prof.survey_status === 'supporter') && pct !== 50;
        return isOurs && prof.survey_status !== 'voted' && prof.survey_status !== 'deceased';
      }
      if (filterMode === 'has_phone') return !!phone;
      if (filterMode === 'seniors') return Number(v.a || 0) >= 70 && prof.survey_status !== 'deceased';
      if (filterMode === 'women') return v.g === 'F' && prof.survey_status !== 'deceased';
      if (filterMode === 'men') return v.g === 'M' && prof.survey_status !== 'deceased';

      return true;
    });
  }, [voters, searchQuery, selectedWard, selectedStreet, selectedSurname, filterMode, profiles, isPhoneticEnabled, dupAnalysis.voterDupMap, snoFilterPredicate, searchSnoPredicate]);

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
    let notVoted = 0;
    let oursNotVoted = 0;
    let hasPhone = 0;
    let deceased = 0;
    let outOfCity = 0;
    let seniors = 0;
    let women = 0;
    let men = 0;
    let womenVoted = 0;
    let menVoted = 0;
    let manualInput = 0;

    const baseVoters = selectedWard !== 'all'
      ? voters.filter(v => String(v.ward_no ?? '') === selectedWard)
      : voters;

    baseVoters.forEach(v => {
      const prof = profiles[v.s] || {};
      const pct = prof.supportPct;
      const phone = prof.customPhone || v.k_m;
      const isVoted = prof.survey_status === 'voted';
      const isDeceased = prof.survey_status === 'deceased';
      const isOutOfCity = prof.survey_status === 'out_of_city';
      const isOurs = (pct === 100 || prof.survey_status === 'supporter') && pct !== 50;
      const hasManual = !!(prof.customAlias?.trim() || prof.correctedSurnameTe?.trim() || prof.correctedSurnameEn?.trim() || prof.correctedNameTe?.trim() || prof.correctedNameEn?.trim());

      if (hasManual) manualInput++;
      if (isDeceased) deceased++;
      if (isOutOfCity) outOfCity++;

      if (!isDeceased) {
        if (Number(v.a || 0) >= 70) seniors++;
        if (v.g === 'F') {
          women++;
          if (isVoted) womenVoted++;
        } else if (v.g === 'M') {
          men++;
          if (isVoted) menVoted++;
        }
      }

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

      if (isVoted) {
        voted++;
      } else if (!isDeceased) {
        notVoted++;
        if (isOurs) oursNotVoted++;
      }
      if (phone) hasPhone++;
    });

    return {
      all: baseVoters.length,
      full,
      soft,
      strong,
      neutral,
      opponent,
      exact,
      similar,
      kriyaAll,
      voted,
      notVoted,
      oursNotVoted,
      hasPhone,
      deceased,
      outOfCity,
      seniors,
      women,
      men,
      womenVoted,
      menVoted,
      manualInput,
      duplicates: dupAnalysis.totalDuplicateVotersCount,
      exactDups: dupAnalysis.exactCount,
      partial50Dups: dupAnalysis.partial50Count
    };
  }, [voters, selectedWard, profiles, dupAnalysis.totalDuplicateVotersCount, dupAnalysis.exactCount, dupAnalysis.partial50Count]);

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
        g.voters.some(v => matchesPhoneticSearch(q, v, undefined, undefined, profiles[v.s]?.customAlias))
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
        <span className="px-1.5 py-0.2 bg-emerald-600/30 text-emerald-300 border border-emerald-500/50 rounded-md text-[9px] font-black flex items-center gap-0.5">
          ⭐ {language === 'te' ? '100% మనవాళ్లే' : '100% Support'}
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
        return <span className="px-1.5 py-0.5 bg-emerald-600/30 text-emerald-300 border border-emerald-500/40 rounded text-[9px] font-bold flex items-center gap-0.5">⭐ {language === 'te' ? 'మద్దతుదారు' : 'Supporter'}</span>;
      case 'deceased':
        return <span className="px-1.5 py-0.5 bg-slate-800 text-slate-300 border border-slate-700 rounded text-[9px] font-black flex items-center gap-0.5 shadow-sm">💀 {language === 'te' ? 'మరణించారు' : 'Deceased'}</span>;
      case 'out_of_city':
        return <span className="px-1.5 py-0.5 bg-indigo-950 text-indigo-300 border border-indigo-500/50 rounded text-[9px] font-black flex items-center gap-0.5 shadow-sm">✈️ {language === 'te' ? 'ఊర్లో లేరు' : 'Out of City'}</span>;
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
        return <span className="px-1.5 py-0.2 bg-emerald-950 text-emerald-300 border border-emerald-500/50 rounded text-[9px] font-black flex items-center gap-0.5" title="డబ్బులు తీసుకున్నా మనకే ఓటు వేస్తారు">💰 డబ్బు తీసుకున్నా మనకే</span>;
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
    
    const text = `*🗳️ పిఠాపురం నియోజకవర్గం — ${locationName}*
*గౌరవనీయులైన ${clan.nameTe} (${clan.nameEn}) కుటుంబ పెద్దలకు నమస్కారం!*

మన ప్రాంత/వార్డు ఎన్నికల సమన్వయం మరియు ఓటర్ల సౌలభ్యం కొరకు, మీ *${clan.nameTe}* వంశ కుటుంబ సభ్యులందరి ఓటర్ వివరాలను అందజేస్తున్నాము.

📊 *మీ కుటుంబ ఓటర్ల బలం:* ${clan.totalVoters} ఓట్లు (బూత్ #${boothInfo.part_no})
🏛️ *పోలింగ్ కేంద్రం:* ${boothInfo.ps_address}

_దయచేసి మీ ఓటు హక్కును వినియోగించుకోండి! ప్రతి ఓటూ అమూల్యం._ 🗳️`;

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
                setVisibleCount(INITIAL_VISIBLE_COUNT);
              }}
              placeholder={isVoiceListening ? (language === 'te' ? '🎙️ వింటున్నాము... మాట్లాడండి...' : '🎙️ Listening...') : (language === 'te' ? 'పేరు, ఇంటిపేరు (శబ్దోచ్ఛారణ), ఫోన్, ID...' : t.searchPlaceholder)}
              className={`w-full bg-slate-900 border ${isVoiceListening ? 'border-red-500 ring-2 ring-red-500/30' : 'border-slate-800'} rounded-xl pl-9 pr-16 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-400 shadow-md transition-all`}
            />
            <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => {
                    setSearchQuery('');
                    setVisibleCount(INITIAL_VISIBLE_COUNT);
                  }}
                  className="p-1 text-slate-400 hover:text-white hover:bg-slate-800 rounded-full transition-colors flex items-center justify-center active:scale-95"
                  title={language === 'te' ? 'సెర్చ్ క్లియర్ చేయండి' : 'Clear search text'}
                >
                  <X className="w-3.5 h-3.5 text-slate-400 hover:text-amber-400" />
                </button>
              )}
              {/* Telugu Voice Search Button */}
              <button
                type="button"
                onClick={handleToggleVoiceSearch}
                className={`p-1 rounded-full transition-all flex items-center justify-center active:scale-95 ${
                  isVoiceListening
                    ? 'bg-red-600 text-white animate-pulse shadow-md ring-2 ring-red-400'
                    : 'text-slate-400 hover:text-amber-400 hover:bg-slate-800'
                }`}
                title={
                  isVoiceListening
                    ? (language === 'te' ? 'వింటున్నాము... మాట్లాడండి (Listening...)' : 'Listening...')
                    : (language === 'te' ? 'తెలుగు వాయిస్ సెర్చ్ (మాట్లాడి వెతకండి)' : 'Voice Search in Telugu')
                }
              >
                <Mic className={`w-3.5 h-3.5 ${isVoiceListening ? 'animate-bounce text-white' : ''}`} />
              </button>
            </div>
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

          {/* Victory Predictor Quick Toggle Button */}
          {onToggleVictoryPredictor && (
            <button
              type="button"
              onClick={onToggleVictoryPredictor}
              className={`px-2.5 py-2 rounded-xl text-[10px] font-bold border transition-all flex items-center gap-1.5 shrink-0 cursor-pointer ${
                showVictoryPredictor
                  ? 'bg-amber-500 text-slate-950 border-amber-400 font-black shadow-md'
                  : 'bg-slate-900 border-slate-800 text-amber-300 hover:text-white hover:border-amber-500/50'
              }`}
              title={language === 'te' ? 'బూత్ గెలుపు అంచనా (విక్టరీ ప్రిడిక్టర్)' : 'Booth Victory Predictor'}
            >
              <Trophy className="w-3.5 h-3.5 text-amber-400" />
              <span className="hidden sm:inline font-bold">{language === 'te' ? 'విక్టరీ' : 'Victory'}</span>
            </button>
          )}

          {/* Slip & Ward Candidate Config Button */}
          <button
            type="button"
            onClick={() => setIsSlipConfigOpen(true)}
            className="px-2 py-2 rounded-xl text-[10px] font-bold border bg-slate-900 border-slate-800 text-emerald-300 hover:text-white hover:border-emerald-500/50 transition-all flex items-center gap-1 shrink-0 cursor-pointer"
            title={language === 'te' ? 'ఓటర్ స్లిప్ టెంప్లేట్ & వార్డ్ అభ్యర్థుల సెట్టింగ్స్' : 'Configure Voter Slip Template & Ward Candidates'}
          >
            <Settings className="w-3.5 h-3.5 text-emerald-400" />
            <span className="hidden sm:inline font-bold">{language === 'te' ? 'స్లిప్ సెట్టింగ్స్' : 'Slip Config'}</span>
          </button>

          {/* Filter Display Mode / Collapsible Toggle Button */}
          <button
            type="button"
            onClick={() => handleSetFilterDisplayStyle(filterDisplayStyle === 'hidden' ? 'dropdown' : 'hidden')}
            className={`px-2.5 py-2 rounded-xl text-[10px] font-bold border transition-all flex items-center gap-1.5 shrink-0 cursor-pointer ${
              filterDisplayStyle !== 'hidden'
                ? 'bg-amber-500 text-slate-950 border-amber-400 font-black shadow-md'
                : activeFilterCount > 0
                ? 'bg-amber-950/90 text-amber-300 border-amber-500/70 font-black ring-1 ring-amber-400/50 shadow-sm animate-pulse'
                : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white hover:border-slate-700'
            }`}
            title={
              filterDisplayStyle !== 'hidden'
                ? (language === 'te' ? 'ఫిల్టర్లు దాచండి (స్క్రీన్ ఖాళీ చేయడానికి)' : 'Hide Filters (Maximize Screen)')
                : (language === 'te' ? 'ఫిల్టర్లు చూపించండి' : 'Show Filters')
            }
          >
            <Sliders className="w-3.5 h-3.5 text-current" />
            <span className="font-bold">
              {filterDisplayStyle === 'hidden'
                ? (language === 'te' ? 'ఫిల్టర్లు' : 'Filters')
                : (language === 'te' ? 'దాచు' : 'Hide')}
            </span>
            {activeFilterCount > 0 && (
              <span className={`px-1.5 py-0.2 rounded-full font-mono text-[9px] font-black ${
                filterDisplayStyle !== 'hidden' ? 'bg-slate-950 text-amber-400' : 'bg-amber-500 text-slate-950'
              }`}>
                {activeFilterCount}
              </span>
            )}
            {filterDisplayStyle === 'hidden' ? (
              <ChevronDown className="w-3 h-3 opacity-70" />
            ) : (
              <ChevronUp className="w-3 h-3 opacity-70" />
            )}
          </button>

          {/* Card Layout Switcher: Rows (Feed) vs Grid */}
          <div className="flex items-center bg-slate-900 border border-slate-800 rounded-xl p-0.5 shrink-0">
            <button
              type="button"
              onClick={() => handleSetCardLayout('row')}
              className={`px-2 py-1.5 rounded-lg text-[10px] font-bold transition-all flex items-center gap-1 cursor-pointer ${
                cardLayout === 'row'
                  ? 'bg-amber-500 text-slate-950 font-black shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
              title={language === 'te' ? 'రో వ్యూ (స్క్రీన్‌షాట్ తరహా విశాలమైన కార్డ్స్)' : 'Wide Row View (Matching Mockup)'}
            >
              <span className="font-bold text-xs">≡</span>
              <span className="hidden sm:inline">{language === 'te' ? 'రో వ్యూ' : 'Rows'}</span>
            </button>
            <button
              type="button"
              onClick={() => handleSetCardLayout('grid')}
              className={`px-2 py-1.5 rounded-lg text-[10px] font-bold transition-all flex items-center gap-1 cursor-pointer ${
                cardLayout === 'grid'
                  ? 'bg-amber-500 text-slate-950 font-black shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
              title={language === 'te' ? 'గ్రిడ్ వ్యూ (మల్టీ కాలమ్)' : 'Grid View'}
            >
              <span className="font-bold text-xs">田</span>
              <span className="hidden sm:inline">{language === 'te' ? 'గ్రిడ్' : 'Grid'}</span>
            </button>
          </div>

          {/* View Mode Toggle: List vs Surname Groups vs Excel Grid */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-0.5 flex items-center shrink-0">
            <button
              onClick={() => handleSetViewMode('list')}
              className={`px-2 py-1.5 rounded-lg text-[10px] font-bold transition-all flex items-center gap-1 ${
                viewMode === 'list'
                  ? 'bg-amber-500 text-slate-950 font-black shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
              title="Standard Voter List View"
            >
              <Users className="w-3.5 h-3.5" />
              <span className="hidden xs:inline">{language === 'te' ? 'జాబితా' : 'List'}</span>
            </button>
            <button
              onClick={() => handleSetViewMode('surnames')}
              className={`px-2 py-1.5 rounded-lg text-[10px] font-bold transition-all flex items-center gap-1 ${
                viewMode === 'surnames'
                  ? 'bg-amber-500 text-slate-950 font-black shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
              title="Group Voters by Surname Clan"
            >
              <Building className="w-3.5 h-3.5" />
              <span className="hidden xs:inline">{language === 'te' ? 'ఇంటిపేర్లు' : 'Surnames'}</span>
            </button>
            <button
              onClick={() => handleSetViewMode('excel')}
              className={`px-2.5 py-1.5 rounded-lg text-[10px] font-bold transition-all flex items-center gap-1.5 ${
                viewMode === 'excel'
                  ? 'bg-emerald-600 text-white font-black shadow-md ring-1 ring-emerald-400/50'
                  : 'text-emerald-400 hover:text-white hover:bg-slate-800/60'
              }`}
              title={language === 'te' ? 'ఎక్సెల్ డేటాషీట్ గ్రిడ్ (కార్డు, పార్స్ డేటా & మీ ఇన్పుట్)' : 'Excel Grid View (Card, Parsed Data & Your Input)'}
            >
              <Table className="w-3.5 h-3.5 text-emerald-400" />
              <span className="font-black">{language === 'te' ? '📊 ఎక్సెల్' : '📊 Excel'}</span>
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
                    type="button"
                    onClick={() => setSnoQuery('')}
                    className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-white rounded-full transition-colors flex items-center justify-center active:scale-95"
                    title={language === 'te' ? 'క్రమ సంఖ్య క్లియర్ చేయండి' : 'Clear S.No'}
                  >
                    <X className="w-3 h-3 text-slate-400 hover:text-amber-400" />
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

        {/* Active Filter Summary Bar when Filters are Collapsed/Hidden */}
        {filterDisplayStyle === 'hidden' && activeFilterCount > 0 && (
          <div className="flex items-center gap-1.5 overflow-x-auto py-1 px-1 bg-slate-900/60 rounded-xl border border-slate-800/80 text-[10.5px] scrollbar-none animate-in fade-in duration-150">
            <span className="text-amber-400 font-bold shrink-0 flex items-center gap-1 text-[10px]">
              <Sliders className="w-3 h-3" />
              <span>{language === 'te' ? 'యాక్టివ్ ఫిల్టర్లు:' : 'Active:'}</span>
            </span>

            {selectedWard !== 'all' && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-950/80 text-emerald-300 border border-emerald-500/50 text-[10px] font-bold shrink-0">
                <span>🏛️ {language === 'te' ? `వార్డు #${selectedWard}` : `Ward #${selectedWard}`}</span>
                <button
                  type="button"
                  onClick={() => { setSelectedWard('all'); setSelectedSurname('all'); setSelectedStreet('all'); setVisibleCount(INITIAL_VISIBLE_COUNT); }}
                  className="hover:text-white p-0.5"
                  title="Remove Ward Filter"
                >
                  <X className="w-2.5 h-2.5" />
                </button>
              </span>
            )}

            {selectedSurname !== 'all' && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-950/80 text-amber-300 border border-amber-500/50 text-[10px] font-bold shrink-0">
                <span>🏷️ {surnameGroups.find(g => g.id === selectedSurname)?.nameTe || surnameGroups.find(g => g.id === selectedSurname)?.nameEn || selectedSurname}</span>
                <button
                  type="button"
                  onClick={() => { setSelectedSurname('all'); setVisibleCount(INITIAL_VISIBLE_COUNT); }}
                  className="hover:text-white p-0.5"
                  title="Remove Surname Filter"
                >
                  <X className="w-2.5 h-2.5" />
                </button>
              </span>
            )}

            {selectedStreet !== 'all' && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-blue-950/80 text-blue-300 border border-blue-500/50 text-[10px] font-bold shrink-0">
                <span>📍 {selectedStreet.length > 25 ? selectedStreet.slice(0, 25) + '...' : selectedStreet}</span>
                <button
                  type="button"
                  onClick={() => { setSelectedStreet('all'); setVisibleCount(INITIAL_VISIBLE_COUNT); }}
                  className="hover:text-white p-0.5"
                  title="Remove Street Filter"
                >
                  <X className="w-2.5 h-2.5" />
                </button>
              </span>
            )}

            {filterMode !== 'all' && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-500 text-slate-950 font-black text-[10px] shrink-0">
                <span>
                  {filterMode === 'not_voted' ? (language === 'te' ? '⏳ ఓటు వేయనివారు' : '⏳ Not Voted')
                   : filterMode === 'voted' ? (language === 'te' ? '✅ ఓటేశారు' : '✅ Voted')
                   : filterMode === 'ours_not_voted' ? (language === 'te' ? '⭐ మన పెండింగ్' : '⭐ Ours Pending')
                   : filterMode === 'full' ? (language === 'te' ? '⭐ 100% మద్దతు' : '⭐ 100% Support')
                   : filterMode === 'has_phone' ? (language === 'te' ? '📞 ఫోన్ ఉన్నవారు' : '📞 Has Phone')
                   : filterMode}
                </span>
                <button
                  type="button"
                  onClick={() => { setFilterMode('all'); setVisibleCount(INITIAL_VISIBLE_COUNT); }}
                  className="hover:text-red-950 p-0.5"
                  title="Remove Status Filter"
                >
                  <X className="w-2.5 h-2.5" />
                </button>
              </span>
            )}

            <button
              type="button"
              onClick={handleResetAllFilters}
              className="text-amber-400 hover:text-white font-bold text-[10px] underline ml-1 shrink-0"
            >
              {language === 'te' ? 'అన్నీ క్లియర్' : 'Clear All'}
            </button>

            <button
              type="button"
              onClick={() => handleSetFilterDisplayStyle('dropdown')}
              className="text-slate-400 hover:text-amber-300 font-bold text-[10px] ml-auto shrink-0 flex items-center gap-0.5"
            >
              <span>{language === 'te' ? 'విస్తరించు' : 'Expand'}</span>
              <ChevronDown className="w-3 h-3" />
            </button>
          </div>
        )}

        {/* Filter Panels Area (Shown when filterDisplayStyle !== 'hidden') */}
        {filterDisplayStyle !== 'hidden' && (
          <div className="space-y-2 pt-0.5 animate-in fade-in duration-150">
            {/* Filter View Mode Switcher Header: Dropdowns vs Chips */}
            <div className="flex items-center justify-between text-[10.5px] px-2 py-1 bg-slate-900/90 rounded-xl border border-slate-800">
              <div className="flex items-center gap-1.5">
                <span className="text-slate-400 font-bold text-[10px] flex items-center gap-1">
                  <Sliders className="w-3 h-3 text-amber-400" />
                  <span>{language === 'te' ? 'ఫిల్టర్ల వ్యూ:' : 'Filter View:'}</span>
                </span>
                <div className="flex items-center bg-slate-950 rounded-lg p-0.5 border border-slate-800">
                  <button
                    type="button"
                    onClick={() => handleSetFilterDisplayStyle('dropdown')}
                    className={`px-2 py-0.5 rounded-md text-[10px] font-bold transition-all cursor-pointer ${
                      filterDisplayStyle === 'dropdown'
                        ? 'bg-amber-500 text-slate-950 font-black shadow-xs'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    {language === 'te' ? '🔽 డ్రాప్‌డౌన్లు (స్లిమ్)' : '🔽 Dropdowns (Slim)'}
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSetFilterDisplayStyle('chips')}
                    className={`px-2 py-0.5 rounded-md text-[10px] font-bold transition-all cursor-pointer ${
                      filterDisplayStyle === 'chips'
                        ? 'bg-amber-500 text-slate-950 font-black shadow-xs'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    {language === 'te' ? '🏷️ చిప్స్ (పూర్తి)' : '🏷️ Chips (Full)'}
                  </button>
                </div>

                <button
                  type="button"
                  onClick={handleToggleGroupSimilarSurnames}
                  title={isGroupSimilarSurnames ? (language === 'te' ? 'సారూప్య ఇంటిపేర్లు వేరు చేయండి' : 'Ungroup similar surnames') : (language === 'te' ? 'సారూప్య/ఒకేలాంటి ఇంటిపేర్లను కలపండి' : 'Group similar surnames')}
                  className={`px-2 py-0.5 rounded-md text-[10px] font-bold transition-all cursor-pointer flex items-center gap-1 border ${
                    isGroupSimilarSurnames
                      ? 'bg-amber-500/20 text-amber-300 border-amber-500/60 shadow-xs'
                      : 'bg-slate-950 text-slate-400 border-slate-800 hover:text-white'
                  }`}
                >
                  <span>🔀</span>
                  <span>{isGroupSimilarSurnames ? (language === 'te' ? 'సారూప్యాలు: ఆన్' : 'Similar: ON') : (language === 'te' ? 'సారూప్యాలు' : 'Similar')}</span>
                </button>

                <button
                  type="button"
                  onClick={() => { setExportInitialClanId(undefined); setIsExportSurnamesModalOpen(true); }}
                  title={language === 'te' ? 'ఇంటిపేర్లు & వాటి క్రమ సంఖ్యల (S.Nos) ఎగుమతి' : 'Export Surnames & Serial Numbers'}
                  className="px-2 py-0.5 rounded-md text-[10px] font-bold transition-all cursor-pointer flex items-center gap-1 border bg-slate-950 text-emerald-300 border-slate-800 hover:border-emerald-500/50 hover:text-emerald-200"
                >
                  <Download className="w-2.5 h-2.5 text-emerald-400" />
                  <span>{language === 'te' ? 'వంశాలు' : 'Clans'}</span>
                </button>

                <button
                  type="button"
                  onClick={selectedVoterSnos.size > 0 ? handleExportSelectedToExcel : handleExportFilteredToExcel}
                  title={language === 'te' ? 'ఎంపిక చేసిన లేదా ఫిల్టర్ చేసిన ఓటర్లను ఫోన్ నంబర్లతో సహా ఎక్సెల్ ఫైల్ (CSV) డౌన్‌లోడ్ చేయండి' : 'Export selection/filtered electors with phone numbers to Excel CSV'}
                  className="px-2 py-0.5 rounded-md text-[10px] font-bold transition-all cursor-pointer flex items-center gap-1 border bg-emerald-950/50 text-emerald-300 border-emerald-500/40 hover:bg-emerald-900/60 hover:text-white"
                >
                  <FileSpreadsheet className="w-2.5 h-2.5 text-emerald-400" />
                  <span>
                    {selectedVoterSnos.size > 0
                      ? (language === 'te' ? `ఎక్సెల్ (${selectedVoterSnos.size})` : `Excel (${selectedVoterSnos.size})`)
                      : (language === 'te' ? `ఎక్సెల్ (${filteredVoters.length})` : `Excel (${filteredVoters.length})`)}
                  </span>
                </button>
              </div>

              <div className="flex items-center gap-2">
                {isAnyFilterActive && (
                  <button
                    type="button"
                    onClick={handleResetAllFilters}
                    className="px-2 py-0.5 rounded-md text-[10px] font-black text-amber-300 hover:text-white bg-red-950/40 border border-red-500/40 flex items-center gap-1 active:scale-95 transition-all"
                  >
                    <RotateCcw className="w-2.5 h-2.5 text-amber-400" />
                    <span>{language === 'te' ? 'అన్నీ రీసెట్' : 'Reset'}</span>
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => handleSetFilterDisplayStyle('hidden')}
                  className="px-2 py-0.5 rounded-md text-[10px] font-bold text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 flex items-center gap-1 active:scale-95 transition-all cursor-pointer"
                  title={language === 'te' ? 'ఫిల్టర్లు పూర్తిగా దాచు (స్క్రీన్ ఆదా)' : 'Hide Filters (Save Screen)'}
                >
                  <X className="w-3 h-3 text-slate-400" />
                  <span>{language === 'te' ? 'పూర్తిగా దాచు' : 'Hide'}</span>
                </button>
              </div>
            </div>

            {/* 1. SLIM DROPDOWN FILTERS BAR (Occupies only ~38px height instead of 350px!) */}
            {filterDisplayStyle === 'dropdown' && (
              <div className="space-y-2">
                <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-5 gap-1.5 text-[11px] bg-slate-900/90 border border-slate-800 rounded-xl p-1.5 shadow-md">
                  {/* Ward Dropdown */}
                  {wardsList.length > 1 && (
                    <div className="relative">
                      <select
                        value={selectedWard}
                        onChange={(e) => {
                          setSelectedWard(e.target.value);
                          setSelectedSurname('all');
                          setSelectedStreet('all');
                          setVisibleCount(INITIAL_VISIBLE_COUNT);
                        }}
                        className={`w-full bg-slate-950 border text-xs font-bold rounded-lg px-2.5 py-1.5 pr-7 appearance-none focus:outline-none cursor-pointer truncate ${
                          selectedWard !== 'all'
                            ? 'border-emerald-500 text-emerald-300 bg-emerald-950/40 ring-1 ring-emerald-500/40'
                            : 'border-slate-800 text-slate-300 hover:border-slate-700'
                        }`}
                      >
                        <option value="all">🏛️ {language === 'te' ? 'మొత్తం గ్రామం (All Wards)' : 'All Wards'} ({voters.length})</option>
                        {wardsList.map(([wNo, cnt]) => (
                          <option key={wNo} value={String(wNo)}>
                            {language === 'te' ? `వార్డు #${wNo}` : `Ward #${wNo}`} ({cnt} ఓటర్లు)
                          </option>
                        ))}
                      </select>
                      <ChevronDown className="w-3.5 h-3.5 absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                    </div>
                  )}

                  {/* Surname Dropdown */}
                  {surnameGroups.length > 0 && (
                    <div className="relative">
                      <select
                        value={selectedSurname}
                        onChange={(e) => { setSelectedSurname(e.target.value); setVisibleCount(INITIAL_VISIBLE_COUNT); }}
                        className={`w-full bg-slate-950 border text-xs font-bold rounded-lg px-2.5 py-1.5 pr-7 appearance-none focus:outline-none cursor-pointer truncate ${
                          selectedSurname !== 'all'
                            ? 'border-amber-500 text-amber-300 bg-amber-950/40 ring-1 ring-amber-500/40'
                            : 'border-slate-800 text-slate-300 hover:border-slate-700'
                        }`}
                      >
                        <option value="all">🏷️ {language === 'te' ? 'అన్ని ఇంటిపేర్లు' : 'All Surnames'} ({counts.all})</option>
                        {surnameGroups.map((g) => (
                          <option key={g.id} value={g.id}>
                            {g.nameTe || g.nameEn} ({g.totalVoters})
                          </option>
                        ))}
                      </select>
                      <ChevronDown className="w-3.5 h-3.5 absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                    </div>
                  )}

                  {/* Street / Location Dropdown */}
                  {streetsList.length > 1 && (
                    <div className="relative">
                      <select
                        value={selectedStreet}
                        onChange={(e) => { setSelectedStreet(e.target.value); setVisibleCount(INITIAL_VISIBLE_COUNT); }}
                        className={`w-full bg-slate-950 border text-xs font-bold rounded-lg px-2.5 py-1.5 pr-7 appearance-none focus:outline-none cursor-pointer truncate ${
                          selectedStreet !== 'all'
                            ? 'border-blue-500 text-blue-300 bg-blue-950/40 ring-1 ring-blue-500/40'
                            : 'border-slate-800 text-slate-300 hover:border-slate-700'
                        }`}
                      >
                        <option value="all">📍 {language === 'te' ? 'అన్ని వీధులు / బూత్‌లు' : 'All Streets/Booths'}</option>
                        {streetsList.map(([street, cnt]) => (
                          <option key={street} value={street}>
                            {street.length > 30 ? street.slice(0, 30) + '...' : street} ({cnt})
                          </option>
                        ))}
                      </select>
                      <ChevronDown className="w-3.5 h-3.5 absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                    </div>
                  )}

                  {/* Status / Category Dropdown */}
                  <div className="relative">
                    <select
                      value={filterMode}
                      onChange={(e) => { setFilterMode(e.target.value as any); setVisibleCount(INITIAL_VISIBLE_COUNT); }}
                      className={`w-full bg-slate-950 border text-xs font-bold rounded-lg px-2.5 py-1.5 pr-7 appearance-none focus:outline-none cursor-pointer truncate ${
                        filterMode !== 'all'
                          ? 'border-amber-500 text-amber-300 bg-amber-950/40 ring-1 ring-amber-500/40 font-black'
                          : 'border-slate-800 text-slate-300 hover:border-slate-700'
                      }`}
                    >
                      <option value="all">🎯 {language === 'te' ? 'అన్ని కేటగిరీలు' : 'All Categories'} ({counts.all})</option>
                      <option value="not_voted">⏳ {language === 'te' ? 'ఓటు వేయనివారు' : 'Not Voted'} ({counts.notVoted})</option>
                      <option value="ours_not_voted">⭐ {language === 'te' ? 'మన పెండింగ్' : 'Ours Pending'} ({counts.oursNotVoted})</option>
                      <option value="voted">✅ {language === 'te' ? 'ఓటేశారు' : 'Voted'} ({counts.voted})</option>
                      <option value="full">⭐ {t.filterFull} ({counts.full})</option>
                      <option value="soft">🟡 {t.filterSoft} ({counts.soft})</option>
                      <option value="strong">🟢 {t.filterStrong} ({counts.strong})</option>
                      <option value="has_phone">📞 {t.filterPhone} ({counts.hasPhone})</option>
                      <option value="exact">🔥 {language === 'te' ? 'నమోదిత నిప్పులు' : 'Verified Supporter'} ({counts.exact})</option>
                      <option value="opponent">🔴 {language === 'te' ? 'ప్రత్యర్థులు' : 'Opponents'} ({counts.opponent})</option>
                      <option value="out_of_city">✈️ {language === 'te' ? 'ఊర్లో లేరు' : 'Out of Village'} ({counts.outOfCity})</option>
                      <option value="deceased">💀 {language === 'te' ? 'మరణించారు' : 'Deceased'} ({counts.deceased})</option>
                      <option value="women">👩 {language === 'te' ? 'మహిళలు' : 'Women'} ({counts.women})</option>
                      <option value="men">👨 {language === 'te' ? 'పురుషులు' : 'Men'} ({counts.men})</option>
                      <option value="seniors">👴 {language === 'te' ? 'సీనియర్లు (60+)' : 'Seniors'} ({counts.seniors})</option>
                    </select>
                    <ChevronDown className="w-3.5 h-3.5 absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                  </div>

                  {/* Polling Tracker Quick Status Pill Button */}
                  <button
                    type="button"
                    onClick={() => setIsLiveTrackerExpanded(!isLiveTrackerExpanded)}
                    className={`col-span-2 sm:col-span-4 lg:col-span-1 px-2.5 py-1.5 rounded-lg border text-xs font-bold transition-all flex items-center justify-between gap-1.5 cursor-pointer ${
                      isLiveTrackerExpanded
                        ? 'bg-emerald-950/60 text-emerald-300 border-emerald-500/60 shadow-sm'
                        : 'bg-slate-950 text-slate-300 border-slate-800 hover:border-slate-700'
                    }`}
                    title="పోలింగ్ డే లైవ్ టర్నౌట్ & స్పీడ్-కాల్ ట్రాకర్ వివరాలు"
                  >
                    <span className="flex items-center gap-1.5 truncate">
                      <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shrink-0"></span>
                      <span className="font-bold text-[10.5px]">🗳️ {counts.voted}/{counts.all}</span>
                      <span className="text-emerald-400 font-mono text-[10px]">({Math.round((counts.voted / (counts.all || 1)) * 100)}%)</span>
                    </span>
                    <span className="text-[10px] text-slate-400 shrink-0">
                      {isLiveTrackerExpanded ? '▲' : '▼'}
                    </span>
                  </button>
                </div>

                {/* Expanded Live Tracker Card (Shown on demand when user clicks the tracker button) */}
                {isLiveTrackerExpanded && (
                  <div className="bg-slate-900/95 border border-amber-500/30 rounded-2xl p-2.5 space-y-2 shadow-md animate-in fade-in slide-in-from-top-1 duration-150">
                    <div className="flex items-center justify-between text-[11px] flex-wrap gap-1">
                      <span className="text-slate-300 font-black flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                        {language === 'te' ? '🗳️ పోలింగ్ డే లైవ్ ట్రాకర్:' : '🗳️ Polling Day Live Tracker:'}
                      </span>
                      <div className="flex items-center gap-1.5 font-mono text-[10.5px]">
                        <span className="text-emerald-400 font-bold bg-emerald-950/70 px-2 py-0.5 rounded-lg border border-emerald-500/30">
                          {counts.voted}/{counts.all} {language === 'te' ? 'ఓటేశారు' : 'Voted'} ({Math.round((counts.voted / (counts.all || 1)) * 100)}%)
                        </span>
                        <span className="text-amber-400 font-bold bg-amber-950/70 px-2 py-0.5 rounded-lg border border-amber-500/30">
                          {counts.notVoted} {language === 'te' ? 'పెండింగ్' : 'Pending'}
                        </span>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => setIsSpeedDialOpen(true)}
                        className="py-1.5 px-3 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black rounded-xl text-xs flex items-center justify-center gap-1.5 shadow-md active:scale-95 transition-all cursor-pointer"
                      >
                        <Zap className="w-3.5 h-3.5 fill-slate-950" />
                        <span>{language === 'te' ? '⚡ స్పీడ్-కాల్' : '⚡ Speed-Call'} ({counts.oursNotVoted})</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setIsHourlyTurnoutOpen(true)}
                        className="py-1.5 px-3 bg-slate-950 hover:bg-slate-800 text-amber-300 hover:text-white border border-amber-500/40 font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 shadow-sm active:scale-95 transition-all cursor-pointer"
                      >
                        <Clock className="w-3.5 h-3.5 text-amber-400" />
                        <span>{language === 'te' ? '🕒 గంటల టర్నౌట్' : '🕒 Hourly Turnout'}</span>
                      </button>
                    </div>

                    <div className="flex items-center justify-between text-[10px] text-slate-400 bg-slate-950/60 px-2 py-1 rounded-lg border border-slate-800/60">
                      <span className="flex items-center gap-1">
                        <span>👩 స్త్రీ:</span>
                        <strong className="text-rose-400 font-bold">{counts.womenVoted}/{counts.women}</strong>
                        <span className="text-slate-500">({Math.round((counts.womenVoted / Math.max(1, counts.women)) * 100)}%)</span>
                      </span>
                      <span>•</span>
                      <span className="flex items-center gap-1">
                        <span>👨 పురుషులు:</span>
                        <strong className="text-emerald-400 font-bold">{counts.menVoted}/{counts.men}</strong>
                        <span className="text-slate-500">({Math.round((counts.menVoted / Math.max(1, counts.men)) * 100)}%)</span>
                      </span>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* 2. FULL CHIPS VIEW (Shown when user chooses 'chips') */}
            {filterDisplayStyle === 'chips' && (
              <div className="space-y-2">

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
              type="button"
              onClick={handleToggleGroupSimilarSurnames}
              title={isGroupSimilarSurnames ? (language === 'te' ? 'సారూప్య ఇంటిపేర్లు వేరు చేయండి' : 'Ungroup similar surnames') : (language === 'te' ? 'సారూప్య/ఒకేలాంటి ఇంటిపేర్లను కలపండి' : 'Group similar surnames')}
              className={`px-2 py-0.5 rounded-md font-bold whitespace-nowrap transition-all flex items-center gap-1 text-[10px] border ${
                isGroupSimilarSurnames
                  ? 'bg-amber-500 text-slate-950 font-black border-amber-400 shadow-sm'
                  : 'bg-slate-900 text-slate-300 border-slate-700 hover:text-white'
              }`}
            >
              <span>🔀</span>
              <span>{isGroupSimilarSurnames ? (language === 'te' ? 'సారూప్యాలు కలిపాం' : 'Similar Grouped') : (language === 'te' ? 'సారూప్యాలు కలపండి' : 'Group Similar')}</span>
            </button>
            <button
              type="button"
              onClick={() => { setExportInitialClanId(selectedSurname !== 'all' ? selectedSurname : undefined); setIsExportSurnamesModalOpen(true); }}
              title={language === 'te' ? 'ఇంటిపేర్లు & వాటి క్రమ సంఖ్యల (S.Nos) ఎగుమతి' : 'Export Surnames & Serial Numbers'}
              className="px-2 py-0.5 rounded-md font-bold whitespace-nowrap transition-all flex items-center gap-1 text-[10px] border bg-slate-900 text-emerald-300 border-slate-700 hover:border-emerald-500/40 hover:text-white"
            >
              <Download className="w-2.5 h-2.5 text-emerald-400" />
              <span>{language === 'te' ? 'S.No ఎగుమతి' : 'Export S.Nos'}</span>
            </button>
            <button
              onClick={() => { setSelectedSurname('all'); setVisibleCount(INITIAL_VISIBLE_COUNT); }}
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
                onClick={() => { setSelectedSurname(selectedSurname === g.id ? 'all' : g.id); setVisibleCount(INITIAL_VISIBLE_COUNT); }}
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

        {/* Ward Quick Filter Chips (Panchayat Election: View by Ward or Full Village) */}
        {wardsList.length > 1 && (
          <div className="flex items-center gap-1.5 overflow-x-auto py-1 scrollbar-none text-[10.5px]">
            <span className="text-emerald-400 font-bold flex-shrink-0 flex items-center gap-1">
              🏛️ {language === 'te' ? 'వార్డు:' : 'Ward:'}
            </span>
            <button
              onClick={() => { setSelectedWard('all'); setSelectedSurname('all'); setSelectedStreet('all'); setVisibleCount(INITIAL_VISIBLE_COUNT); }}
              className={`px-2 py-0.5 rounded-md font-bold whitespace-nowrap transition-all ${
                selectedWard === 'all'
                  ? 'bg-emerald-600 text-white font-black shadow-sm'
                  : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
              }`}
            >
              {language === 'te' ? 'మొత్తం గ్రామం (All Wards)' : 'Full Village'}
            </button>
            {wardsList.map(([wNo, cnt]) => (
              <button
                key={wNo}
                onClick={() => {
                  setSelectedWard(selectedWard === String(wNo) ? 'all' : String(wNo));
                  setSelectedSurname('all');
                  setSelectedStreet('all');
                  setVisibleCount(INITIAL_VISIBLE_COUNT);
                }}
                className={`px-2 py-0.5 rounded-md font-bold whitespace-nowrap transition-all flex items-center gap-1 ${
                  selectedWard === String(wNo)
                    ? 'bg-emerald-500 text-slate-950 font-black shadow-sm'
                    : 'bg-slate-900 text-emerald-300 hover:text-white border border-emerald-500/30'
                }`}
              >
                <span>{language === 'te' ? `వార్డు #${wNo}` : `Ward #${wNo}`}</span>
                <span className="font-mono text-[9.5px] opacity-80">({cnt})</span>
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
              onClick={() => { setSelectedStreet('all'); setVisibleCount(INITIAL_VISIBLE_COUNT); }}
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
                onClick={() => { setSelectedStreet(stName); setVisibleCount(INITIAL_VISIBLE_COUNT); }}
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

        {/* Polling Day Rapid Status Switcher & Turnout Tracker */}
        <div className="bg-slate-900/95 border border-amber-500/30 rounded-2xl p-2.5 space-y-2 shadow-md">
          <div className="flex items-center justify-between text-[11px] flex-wrap gap-1">
            <span className="text-slate-300 font-black flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
              {language === 'te' ? '🗳️ పోలింగ్ డే లైవ్ ట్రాకర్:' : '🗳️ Polling Day Live Tracker:'}
            </span>
            <div className="flex items-center gap-1.5 font-mono text-[10.5px]">
              <span className="text-emerald-400 font-bold bg-emerald-950/70 px-2 py-0.5 rounded-lg border border-emerald-500/30">
                {counts.voted}/{counts.all} {language === 'te' ? 'ఓటేశారు' : 'Voted'} ({Math.round((counts.voted / (counts.all || 1)) * 100)}%)
              </span>
              <span className="text-amber-400 font-bold bg-amber-950/70 px-2 py-0.5 rounded-lg border border-amber-500/30">
                {counts.notVoted} {language === 'te' ? 'పెండింగ్' : 'Pending'}
              </span>
            </div>
          </div>

          {/* Quick Action Tools: Speed Dial & Hourly Turnout */}
          <div className="flex items-center justify-between gap-1.5 pt-0.5">
            <button
              type="button"
              onClick={() => setIsSpeedDialOpen(true)}
              className="flex-1 py-1.5 px-2 rounded-xl text-[10.5px] font-black bg-gradient-to-r from-red-600 via-amber-600 to-red-600 hover:from-red-500 hover:to-amber-500 text-white shadow-md active:scale-95 transition-all flex items-center justify-center gap-1.5 border border-amber-400/40"
              title={language === 'te' ? 'మన పెండింగ్ ఓటర్ల స్పీడ్-డయలర్ ఓపెన్ చేయండి' : 'Open Pending Ours Speed-Dialer'}
            >
              <Zap className="w-3.5 h-3.5 text-amber-300 fill-amber-300 animate-pulse" />
              <span>{language === 'te' ? `⚡ స్పీడ్-కాల్ (${counts.oursNotVoted})` : `⚡ Speed-Dial (${counts.oursNotVoted})`}</span>
            </button>

            <button
              type="button"
              onClick={() => setIsHourlyTurnoutOpen(true)}
              className="flex-1 py-1.5 px-2 rounded-xl text-[10.5px] font-black bg-slate-800 hover:bg-slate-700 text-amber-300 border border-slate-700 hover:border-amber-500/40 shadow-sm active:scale-95 transition-all flex items-center justify-center gap-1.5"
              title={language === 'te' ? 'గంట గంటకూ పోలింగ్ శాతం రికార్డ్ చేయండి & వార్ రూమ్‌కి పంపండి' : 'Record Hourly Turnout & Share to War Room'}
            >
              <Clock className="w-3.5 h-3.5 text-amber-400" />
              <span>{language === 'te' ? '🕒 గంటల టర్నౌట్' : '🕒 Hourly Turnout'}</span>
            </button>
          </div>

          {/* Gender Pulse Indicator */}
          <div className="flex items-center justify-between text-[10px] bg-slate-950/60 px-2.5 py-1 rounded-xl border border-slate-800/80 text-slate-300 font-mono">
            <span className="flex items-center gap-1">
              <span>👩 స్త్రీ:</span>
              <strong className="text-emerald-400 font-bold">{counts.womenVoted}/{counts.women}</strong>
              <span className="text-slate-500">({Math.round((counts.womenVoted / Math.max(1, counts.women)) * 100)}%)</span>
            </span>
            <span>•</span>
            <span className="flex items-center gap-1">
              <span>👨 పురుషులు:</span>
              <strong className="text-emerald-400 font-bold">{counts.menVoted}/{counts.men}</strong>
              <span className="text-slate-500">({Math.round((counts.menVoted / Math.max(1, counts.men)) * 100)}%)</span>
            </span>
          </div>

          <div className="grid grid-cols-4 gap-1.5">
            {/* 1. All */}
            <button
              type="button"
              onClick={() => { setFilterMode('all'); setVisibleCount(INITIAL_VISIBLE_COUNT); }}
              className={`py-1.5 px-1 rounded-xl text-[10.5px] font-bold border transition-all flex flex-col items-center justify-center ${
                filterMode === 'all'
                  ? 'bg-amber-500 text-slate-950 border-amber-400 font-black shadow-sm'
                  : 'bg-slate-950 text-slate-400 border-slate-800 hover:text-white'
              }`}
            >
              <span>{language === 'te' ? 'మొత్తం' : 'All'}</span>
              <span className="font-mono text-[11px] font-black">{counts.all}</span>
            </button>

            {/* 2. Quick Switch: NOT YET VOTED (ఓటు వేయనివారు) */}
            <button
              type="button"
              onClick={() => { setFilterMode('not_voted'); setVisibleCount(INITIAL_VISIBLE_COUNT); }}
              className={`py-1.5 px-1 rounded-xl text-[10.5px] font-bold border transition-all flex flex-col items-center justify-center ${
                filterMode === 'not_voted'
                  ? 'bg-amber-500 text-slate-950 border-amber-300 font-black ring-2 ring-amber-400/50 shadow-md'
                  : 'bg-amber-950/40 text-amber-300 border-amber-500/50 hover:bg-amber-950/70'
              }`}
              title={language === 'te' ? 'ఇంకా ఓటు వేయని ఓటర్లందరినీ చూడండి' : 'Show all voters who have not yet voted'}
            >
              <span className="truncate">{language === 'te' ? '⏳ ఓటు వేయనివారు' : '⏳ Not Voted'}</span>
              <span className="font-mono text-[11px] font-black text-amber-300">
                {counts.notVoted}
              </span>
            </button>

            {/* 3. Quick Switch: OURS NOT YET VOTED (మనవాళ్లలో ఓటు వేయనివారు) */}
            <button
              type="button"
              onClick={() => { setFilterMode('ours_not_voted'); setVisibleCount(INITIAL_VISIBLE_COUNT); }}
              className={`py-1.5 px-1 rounded-xl text-[10.5px] font-bold border transition-all flex flex-col items-center justify-center ${
                filterMode === 'ours_not_voted'
                  ? 'bg-gradient-to-r from-red-600 to-amber-600 text-white border-red-400 font-black ring-2 ring-red-400/50 shadow-md'
                  : 'bg-red-950/40 text-red-300 border-red-500/50 hover:bg-red-950/70'
              }`}
              title={language === 'te' ? 'మన మద్దతుదారుల్లో ఇంకా ఓటు వేయనివారిని వెంటనే బూతుకు తీసుకురండి' : 'Our supporters who have not yet voted'}
            >
              <span className="truncate">{language === 'te' ? '⭐ మన పెండింగ్' : '⭐ Ours Pending'}</span>
              <span className="font-mono text-[11px] font-black text-red-200">
                {counts.oursNotVoted}
              </span>
            </button>

            {/* 4. Quick Switch: VOTED (ఓటేశారు) */}
            <button
              type="button"
              onClick={() => { setFilterMode('voted'); setVisibleCount(INITIAL_VISIBLE_COUNT); }}
              className={`py-1.5 px-1 rounded-xl text-[10.5px] font-bold border transition-all flex flex-col items-center justify-center ${
                filterMode === 'voted'
                  ? 'bg-emerald-600 text-white border-emerald-400 font-black ring-2 ring-emerald-400/50 shadow-md'
                  : 'bg-emerald-950/40 text-emerald-300 border-emerald-500/50 hover:bg-emerald-950/70'
              }`}
              title={language === 'te' ? 'ఓటు వేసిన ఓటర్లను చూడండి' : 'Show all who have voted'}
            >
              <span className="truncate">{language === 'te' ? '✅ ఓటేశారు' : '✅ Voted'}</span>
              <span className="font-mono text-[11px] font-black text-emerald-300">
                {counts.voted}
              </span>
            </button>
          </div>
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto py-1 scrollbar-none text-[11px]">
          {isAnyFilterActive && (
            <button
              type="button"
              onClick={handleResetAllFilters}
              className="px-2.5 py-1 rounded-lg font-black whitespace-nowrap transition-all flex items-center gap-1 bg-red-600/30 hover:bg-red-600 text-amber-300 hover:text-white border border-red-500/50 shadow-sm active:scale-95 animate-in fade-in"
              title={language === 'te' ? 'అన్ని ఫిల్టర్‌లను తీసివేయండి' : 'Reset All Filters'}
            >
              <RotateCcw className="w-3 h-3 text-amber-400" />
              <span>{language === 'te' ? '🔄 ఫిల్టర్లు రీసెట్' : '🔄 Reset'}</span>
            </button>
          )}

          <button
            onClick={() => { setFilterMode('all'); setVisibleCount(INITIAL_VISIBLE_COUNT); }}
            className={`px-2.5 py-1 rounded-lg font-bold whitespace-nowrap transition-all ${
              filterMode === 'all'
                ? 'bg-amber-500 text-slate-950 font-black shadow-sm'
                : 'bg-slate-900 text-slate-400 border border-slate-800'
            }`}
          >
            {t.filterAll} ({counts.all})
          </button>

          <button
            onClick={() => { setFilterMode('full'); setVisibleCount(INITIAL_VISIBLE_COUNT); }}
            className={`px-2.5 py-1 rounded-lg font-bold whitespace-nowrap transition-all flex items-center gap-1 ${
              filterMode === 'full'
                ? 'bg-red-600 text-white font-black shadow-sm'
                : 'bg-slate-900 text-red-300 border border-red-500/30'
            }`}
          >
            <span>{t.filterFull} ({counts.full})</span>
          </button>

          <button
            onClick={() => { setFilterMode('soft'); setVisibleCount(INITIAL_VISIBLE_COUNT); }}
            className={`px-2.5 py-1 rounded-lg font-bold whitespace-nowrap transition-all flex items-center gap-1 ${
              filterMode === 'soft'
                ? 'bg-amber-600 text-slate-950 font-black shadow-sm'
                : 'bg-slate-900 text-amber-300 border border-amber-500/30'
            }`}
          >
            <span>{t.filterSoft} ({counts.soft})</span>
          </button>

          <button
            onClick={() => { setFilterMode('strong'); setVisibleCount(INITIAL_VISIBLE_COUNT); }}
            className={`px-2.5 py-1 rounded-lg font-bold whitespace-nowrap transition-all flex items-center gap-1 ${
              filterMode === 'strong'
                ? 'bg-emerald-600 text-white font-black shadow-sm'
                : 'bg-slate-900 text-emerald-300 border border-emerald-500/30'
            }`}
          >
            <span>{t.filterStrong} ({counts.strong})</span>
          </button>

          <button
            onClick={() => { setFilterMode('has_phone'); setVisibleCount(INITIAL_VISIBLE_COUNT); }}
            className={`px-2.5 py-1 rounded-lg font-bold whitespace-nowrap transition-all flex items-center gap-1 ${
              filterMode === 'has_phone'
                ? 'bg-blue-600 text-white font-black shadow-sm'
                : 'bg-slate-900 text-blue-300 border border-blue-500/30'
            }`}
          >
            <span>{t.filterPhone} ({counts.hasPhone})</span>
          </button>

          <button
            onClick={() => { setFilterMode('exact'); setVisibleCount(INITIAL_VISIBLE_COUNT); }}
            className={`px-2.5 py-1 rounded-lg font-bold whitespace-nowrap transition-all flex items-center gap-1 ${
              filterMode === 'exact'
                ? 'bg-gradient-to-r from-red-600 to-amber-600 text-white font-black shadow-sm'
                : 'bg-slate-900 text-amber-300 border border-amber-500/30'
            }`}
          >
            <span>{t.filterKriya} ({counts.exact})</span>
          </button>

          <button
            onClick={() => { setFilterMode('voted'); setVisibleCount(INITIAL_VISIBLE_COUNT); }}
            className={`px-2.5 py-1 rounded-lg font-bold whitespace-nowrap transition-all flex items-center gap-1 ${
              filterMode === 'voted'
                ? 'bg-emerald-600 text-white font-black shadow-sm'
                : 'bg-slate-900 text-emerald-400 border border-emerald-500/30'
            }`}
          >
            <span>{t.filterVoted} ({counts.voted})</span>
          </button>

          <button
            onClick={() => { setFilterMode('not_voted'); setVisibleCount(INITIAL_VISIBLE_COUNT); }}
            className={`px-2.5 py-1 rounded-lg font-bold whitespace-nowrap transition-all flex items-center gap-1 ${
              filterMode === 'not_voted'
                ? 'bg-amber-500 text-slate-950 font-black shadow-sm'
                : 'bg-slate-900 text-amber-300 border border-amber-500/40'
            }`}
          >
            <span>⏳ {language === 'te' ? 'ఓటు వేయనివారు' : 'Not Voted'} ({counts.notVoted})</span>
          </button>

          <button
            onClick={() => { setFilterMode('ours_not_voted'); setVisibleCount(INITIAL_VISIBLE_COUNT); }}
            className={`px-2.5 py-1 rounded-lg font-bold whitespace-nowrap transition-all flex items-center gap-1 ${
              filterMode === 'ours_not_voted'
                ? 'bg-gradient-to-r from-red-600 to-amber-600 text-white font-black shadow-sm'
                : 'bg-slate-900 text-red-300 border border-red-500/40'
            }`}
          >
            <span>⭐ {language === 'te' ? 'మన పెండింగ్' : 'Ours Pending'} ({counts.oursNotVoted})</span>
          </button>

          <button
            onClick={() => { setFilterMode('opponent'); setVisibleCount(INITIAL_VISIBLE_COUNT); }}
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
              onClick={() => { setFilterMode('duplicates_exact'); setVisibleCount(INITIAL_VISIBLE_COUNT); }}
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
              onClick={() => { setFilterMode('duplicates_50'); setVisibleCount(INITIAL_VISIBLE_COUNT); }}
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
            onClick={() => { setFilterMode('duplicates'); setVisibleCount(INITIAL_VISIBLE_COUNT); }}
            className={`px-2.5 py-1 rounded-lg font-bold whitespace-nowrap transition-all flex items-center gap-1 ${
              filterMode === 'duplicates'
                ? 'bg-purple-950 text-purple-200 font-black shadow-sm ring-1 ring-purple-500'
                : 'bg-slate-900 text-purple-300 border border-purple-500/40 hover:bg-slate-800'
            }`}
            title={language === 'te' ? 'అన్ని డూప్లికేట్లు (100% + 50%)' : 'All Duplicate Votes'}
          >
            <span>⚠️ {language === 'te' ? 'మొత్తం డూప్లికేట్లు' : 'All Dups'} ({counts.duplicates})</span>
          </button>

          {counts.manualInput > 0 && (
            <button
              onClick={() => { setFilterMode(filterMode === 'manual_input' ? 'all' : 'manual_input'); setVisibleCount(INITIAL_VISIBLE_COUNT); }}
              className={`px-2.5 py-1 rounded-lg font-bold whitespace-nowrap transition-all flex items-center gap-1 ${
                filterMode === 'manual_input'
                  ? 'bg-emerald-600 text-white font-black shadow-sm ring-1 ring-emerald-400'
                  : 'bg-slate-900 text-emerald-300 border border-emerald-500/40 hover:bg-slate-800'
              }`}
              title={language === 'te' ? 'మీరు మాన్యువల్ గా ఎడిట్ చేసిన / ఇన్పుట్ ఇచ్చిన ఓటర్లందరినీ చూడండి' : 'Show all voters with manual input / alias'}
            >
              <Edit3 className="w-3 h-3 text-emerald-400" />
              <span>✏️ {language === 'te' ? 'నా ఇన్పుట్స్ ఉన్నవి' : 'Manual Inputs'} ({counts.manualInput})</span>
            </button>
          )}

          <button
            onClick={() => { setFilterMode('out_of_city'); setVisibleCount(INITIAL_VISIBLE_COUNT); }}
            className={`px-2.5 py-1 rounded-lg font-bold whitespace-nowrap transition-all flex items-center gap-1 ${
              filterMode === 'out_of_city'
                ? 'bg-indigo-600 text-white font-black shadow-sm'
                : 'bg-slate-900 text-indigo-300 border border-indigo-500/40 hover:bg-slate-800'
            }`}
            title={language === 'te' ? 'ఊర్లో లేని / వలస వెళ్లిన ఓటర్లు' : 'Out of City / Migrated Voters'}
          >
            <span>✈️ {language === 'te' ? 'ఊర్లో లేరు' : 'Out of City'} ({counts.outOfCity})</span>
          </button>

          <button
            onClick={() => { setFilterMode('deceased'); setVisibleCount(INITIAL_VISIBLE_COUNT); }}
            className={`px-2.5 py-1 rounded-lg font-bold whitespace-nowrap transition-all flex items-center gap-1 ${
              filterMode === 'deceased'
                ? 'bg-slate-700 text-slate-100 font-black shadow-sm ring-1 ring-slate-400'
                : 'bg-slate-900 text-slate-400 border border-slate-700 hover:bg-slate-800'
            }`}
            title={language === 'te' ? 'చనిపోయిన ఓటర్లు (బోగస్ ఓటింగ్ నివారణకు)' : 'Deceased Voters (Prevents Impersonation / Bogus Voting)'}
          >
            <span>💀 {language === 'te' ? 'మరణించారు' : 'Deceased'} ({counts.deceased})</span>
          </button>

          {/* 70+ Senior Citizens Filter */}
          <button
            onClick={() => { setFilterMode('seniors'); setVisibleCount(INITIAL_VISIBLE_COUNT); }}
            className={`px-2.5 py-1 rounded-lg font-bold whitespace-nowrap transition-all flex items-center gap-1 ${
              filterMode === 'seniors'
                ? 'bg-amber-500 text-slate-950 font-black shadow-sm ring-1 ring-amber-400'
                : 'bg-slate-900 text-amber-300 border border-amber-500/40 hover:bg-slate-800'
            }`}
            title={language === 'te' ? '70 ఏళ్లు పైబడిన సీనియర్ సిటిజన్లు (వాహన సహాయం)' : '70+ Senior Citizens (Assistance)'}
          >
            <span>👴 {language === 'te' ? '70+ వృద్ధులు' : '70+ Seniors'} ({counts.seniors})</span>
          </button>

          {/* Women Voters Filter */}
          <button
            onClick={() => { setFilterMode('women'); setVisibleCount(INITIAL_VISIBLE_COUNT); }}
            className={`px-2.5 py-1 rounded-lg font-bold whitespace-nowrap transition-all flex items-center gap-1 ${
              filterMode === 'women'
                ? 'bg-rose-600 text-white font-black shadow-sm ring-1 ring-rose-400'
                : 'bg-slate-900 text-rose-300 border border-rose-500/40 hover:bg-slate-800'
            }`}
            title={language === 'te' ? 'మహిళా ఓటర్లు మాత్రమే' : 'Women Voters'}
          >
            <span>👩 {language === 'te' ? 'మహిళలు' : 'Women'} ({counts.women})</span>
          </button>

          {/* Men Voters Filter */}
          <button
            onClick={() => { setFilterMode('men'); setVisibleCount(INITIAL_VISIBLE_COUNT); }}
            className={`px-2.5 py-1 rounded-lg font-bold whitespace-nowrap transition-all flex items-center gap-1 ${
              filterMode === 'men'
                ? 'bg-blue-600 text-white font-black shadow-sm ring-1 ring-blue-400'
                : 'bg-slate-900 text-blue-300 border border-blue-500/40 hover:bg-slate-800'
            }`}
            title={language === 'te' ? 'పురుష ఓటర్లు మాత్రమే' : 'Men Voters'}
          >
            <span>👨 {language === 'te' ? 'పురుషులు' : 'Men'} ({counts.men})</span>
          </button>
        </div>
              </div>
            )}
          </div>
        )}
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

        <div className="flex items-center gap-1.5 flex-wrap">
          {filteredVoters.length > 0 && onOpenGroupPrint && (
            <>
              {/* Print All Filtered Voters (Slips View) */}
              <button
                type="button"
                onClick={() => handlePrintAll('slips')}
                className="px-2 py-0.5 bg-slate-900 hover:bg-slate-800 text-amber-300 border border-amber-500/30 rounded-lg text-[10.5px] font-bold flex items-center gap-1 shadow-sm active:scale-95 transition-all cursor-pointer"
                title={language === 'te' ? 'అన్ని స్లిప్పులు ఒకేసారి ప్రింట్ చేయండి (A4 Slips)' : 'Print All Filtered Voter Slips'}
              >
                <Printer className="w-3 h-3 text-amber-400" />
                <span>{language === 'te' ? `🖨️ చీటీలు (${filteredVoters.length})` : `🖨️ Slips (${filteredVoters.length})`}</span>
              </button>

              {/* Print Cards (Official Electoral Photo Cards) */}
              <button
                type="button"
                onClick={() => handlePrintAll('cards')}
                className="px-2 py-0.5 bg-gradient-to-r from-amber-600 via-orange-600 to-amber-700 hover:from-amber-500 hover:to-orange-500 text-white rounded-lg text-[10.5px] font-black flex items-center gap-1 shadow-sm active:scale-95 transition-all cursor-pointer"
                title={language === 'te' ? 'అధికారిక ఫొటో ఓటర్ కార్డులు (Photo Cards) A4 సైజులో ముద్రించండి' : 'Print Official Voter Photo Cards'}
              >
                <Layers className="w-3 h-3 text-amber-200" />
                <span>{language === 'te' ? `📇 కార్డులు (${filteredVoters.length})` : `📇 Cards (${filteredVoters.length})`}</span>
              </button>

              {/* Print Normal Voter List (Table / Roster View) */}
              <button
                type="button"
                onClick={() => handlePrintAll('table')}
                className="px-2 py-0.5 bg-slate-900 hover:bg-slate-800 text-teal-300 border border-teal-500/30 rounded-lg text-[10.5px] font-bold flex items-center gap-1 shadow-sm active:scale-95 transition-all cursor-pointer"
                title={language === 'te' ? 'సాధారణ ఓటర్ల జాబితా (Table / Roster) ప్రింట్ చేయండి' : 'Print Normal Voter List (Table / Roster)'}
              >
                <Users className="w-3 h-3 text-teal-400" />
                <span>{language === 'te' ? `📋 జాబితా (${filteredVoters.length})` : `📋 Roster (${filteredVoters.length})`}</span>
              </button>

              {/* Export Filtered Result to Excel with Phone Numbers */}
              <button
                type="button"
                onClick={handleExportFilteredToExcel}
                className="px-2 py-0.5 bg-gradient-to-r from-emerald-700 via-teal-700 to-emerald-700 hover:from-emerald-600 hover:to-teal-600 text-white rounded-lg text-[10.5px] font-black flex items-center gap-1 shadow-sm active:scale-95 transition-all cursor-pointer"
                title={language === 'te' ? 'ఫిల్టర్ చేసిన ఓటర్లందరినీ ఫోన్ నంబర్లతో సహా ఎక్సెల్ ఫైల్ (CSV) డౌన్‌లోడ్ చేయండి' : 'Export filtered electors with phone numbers to Excel CSV'}
              >
                <FileSpreadsheet className="w-3 h-3 text-emerald-200" />
                <span>{language === 'te' ? `📥 ఎక్సెల్ (${filteredVoters.length})` : `📥 Excel (${filteredVoters.length})`}</span>
              </button>

              {/* Toggle Show Cards / Off Cards */}
              <button
                type="button"
                onClick={handleToggleShowCards}
                className={`px-2 py-0.5 rounded-lg text-[10.5px] font-bold flex items-center gap-1 border transition-all active:scale-95 shadow-sm cursor-pointer ${
                  showCards
                    ? 'bg-amber-500/20 text-amber-300 border-amber-500/50 hover:bg-amber-500/30 ring-1 ring-amber-400/40'
                    : 'bg-slate-900 hover:bg-slate-800 text-slate-400 border-slate-700 hover:text-white'
                }`}
                title={language === 'te' ? (showCards ? 'కార్డుల ఫుల్ ప్రివ్యూ ఆపండి (కాంపాక్ట్ వ్యూ)' : 'కార్డుల ఫుల్ ప్రివ్యూ ఆన్ చేయండి') : (showCards ? 'Turn Off Cards' : 'Show Cards')}
              >
                <span>{showCards ? '📇 కార్డులు: ఆన్' : '📄 కార్డులు: ఆఫ్'}</span>
              </button>

              {/* Re-OCR Single-Item Review Studio */}
              {onOpenReOcrReview && (
                <button
                  type="button"
                  onClick={() => onOpenReOcrReview(selectedWard)}
                  className="px-2 py-0.5 bg-gradient-to-r from-amber-600 via-orange-600 to-amber-700 hover:from-amber-500 hover:to-orange-500 text-white rounded-lg text-[10.5px] font-black flex items-center gap-1 shadow-sm active:scale-95 transition-all cursor-pointer ring-1 ring-amber-400/50"
                  title={language === 'te' ? 'కార్డుల OCR సరిచూసే సింగిల్-కార్డ్ స్టూడియో (Re-OCR Studio)' : 'Re-OCR Single Card Review Studio'}
                >
                  <Sparkles className="w-3 h-3 text-amber-200" />
                  <span>{language === 'te' ? '🔍 రీ-ఓసీఆర్ రివ్యూ' : '🔍 Re-OCR Studio'}</span>
                </button>
              )}

              

              {/* Fast Punch Polling Mode */}
              {onOpenFastPunch && (
                <button
                  type="button"
                  onClick={onOpenFastPunch}
                  className="px-2 py-0.5 bg-gradient-to-r from-red-600 to-amber-600 hover:from-red-500 hover:to-amber-500 text-white rounded-lg text-[10.5px] font-black flex items-center gap-1 shadow-sm active:scale-95 transition-all cursor-pointer"
                  title={language === 'te' ? 'ఎన్నికల రోజు 0.2 సెకండ్లలో ఓటు టిక్ చేసే ఫాస్ట్ పంచ్ & SOS అలర్ట్' : 'Polling Day Fast-Punch & SOS Missing Supporters'}
                >
                  <span>⚡ ఫాస్ట్ పంచ్</span>
                </button>
              )}

              {/* Out of Village Logistics Hub */}
              {onOpenOutOfVillage && (
                <button
                  type="button"
                  onClick={onOpenOutOfVillage}
                  className="px-2 py-0.5 bg-sky-950/80 hover:bg-sky-900 text-sky-300 border border-sky-500/40 rounded-lg text-[10.5px] font-black flex items-center gap-1 shadow-sm active:scale-95 transition-all cursor-pointer"
                  title={language === 'te' ? 'వలస ఓటర్ల ప్రయాణం & బస్సు రవాణా సమన్వయం' : 'Out of Village Electors Travel Coordination'}
                >
                  <span>✈️ వలస ఓటర్లు</span>
                </button>
              )}

              {/* Ward Margin & Sarpanch Victory Predictor */}
              {onOpenWardMargin && (
                <button
                  type="button"
                  onClick={onOpenWardMargin}
                  className="px-2 py-0.5 bg-purple-950/80 hover:bg-purple-900 text-purple-300 border border-purple-500/40 rounded-lg text-[10.5px] font-black flex items-center gap-1 shadow-sm active:scale-95 transition-all cursor-pointer"
                  title={language === 'te' ? 'వార్డుల వారీగా మెజారిటీ & సర్పంచ్ గెలుపు అంచనా' : 'Ward-by-Ward Margin & Victory Calculator'}
                >
                  <span>📊 గెలుపు గణితం</span>
                </button>
              )}

              {/* Select Specific Voters for Printing */}
              <button
                type="button"
                onClick={() => {
                  setIsSelectionMode(!isSelectionMode);
                  if (isSelectionMode) setSelectedVoterSnos(new Set());
                }}
                className={`px-2 py-0.5 rounded-lg text-[10.5px] font-bold flex items-center gap-1 border transition-all active:scale-95 shadow-sm ${
                  isSelectionMode
                    ? 'bg-amber-500 text-slate-950 border-amber-400 font-black ring-1 ring-amber-400'
                    : 'bg-slate-900 hover:bg-slate-800 text-slate-300 border-slate-700'
                }`}
                title={language === 'te' ? 'నిర్దిష్ట ఓటర్ల స్లిప్పులు ఎంచుకుని ప్రింట్ చేయండి' : 'Select Specific Voters to Print'}
              >
                <CheckSquare className="w-3 h-3" />
                <span>
                  {isSelectionMode
                    ? (language === 'te' ? `ఎంపిక చాలు (${selectedVoterSnos.size})` : `Done (${selectedVoterSnos.size})`)
                    : (language === 'te' ? '☑️ ఎంపిక ప్రింట్' : '☑️ Select Print')}
                </span>
              </button>

              {/* Bulk Assign Voters */}
              {onOpenBulkAssign && (
                <button
                  type="button"
                  onClick={() => {
                    const snos = selectedVoterSnos.size > 0 ? Array.from(selectedVoterSnos) : undefined;
                    onOpenBulkAssign(snos);
                  }}
                  className="px-2 py-0.5 bg-slate-900 hover:bg-slate-800 text-teal-300 border border-teal-500/30 rounded-lg text-[10.5px] font-bold flex items-center gap-1 shadow-sm active:scale-95 transition-all cursor-pointer"
                  title={language === 'te' ? 'ఓటర్లను ఇన్ఫ్లుయెన్సర్ లేదా నాయకుడికి బల్క్ కేటాయించండి' : 'Bulk Assign Electors to In-Charge'}
                >
                  <Users className="w-3 h-3 text-teal-400" />
                  <span>
                    {selectedVoterSnos.size > 0
                      ? (language === 'te' ? `👥 బల్క్ కేటాయింపు (${selectedVoterSnos.size})` : `👥 Bulk Assign (${selectedVoterSnos.size})`)
                      : (language === 'te' ? '👥 బల్క్ కేటాయింపు' : '👥 Bulk Assign')}
                  </span>
                </button>
              )}
            </>
          )}

          {isAnyFilterActive && (
            <button 
              type="button"
              onClick={handleResetAllFilters}
              className="text-amber-400 font-bold hover:underline flex items-center gap-0.5 text-[10.5px]"
              title="Reset all search & filters"
            >
              <RotateCcw className="w-2.5 h-2.5" />
              <span>{language === 'te' ? 'రీసెట్' : 'Reset'}</span>
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

      {/* Active Filter Indicator: Not Yet Voted */}
      {filterMode === 'not_voted' && (
        <div className="bg-amber-500/10 border border-amber-500/40 rounded-xl px-3 py-1.5 flex items-center justify-between text-[11px] animate-in fade-in">
          <span className="text-amber-300 font-bold flex items-center gap-1.5">
            ⏳ {language === 'te' ? 'ఇంకా ఓటు వేయని ఓటర్లు:' : 'Voters not yet voted:'}{' '}
            <strong className="text-white font-mono bg-amber-500/20 px-1.5 py-0.5 rounded border border-amber-500/30">
              {filteredVoters.length} {language === 'te' ? 'మంది' : 'electors'}
            </strong>
          </span>
          <button
            onClick={() => setFilterMode('all')}
            className="text-amber-400 font-bold hover:underline text-[10px]"
          >
            {language === 'te' ? 'అన్నీ చూపించు ✕' : 'Show All ✕'}
          </button>
        </div>
      )}

      {/* Active Filter Indicator: Ours Pending */}
      {filterMode === 'ours_not_voted' && (
        <div className="bg-red-500/10 border border-red-500/40 rounded-xl px-3 py-1.5 flex items-center justify-between text-[11px] animate-in fade-in">
          <span className="text-amber-300 font-bold flex items-center gap-1.5">
            ⭐ {language === 'te' ? 'మన మద్దతుదారుల్లో ఇంకా ఓటు వేయనివారు:' : 'Our supporters not yet voted:'}{' '}
            <strong className="text-white font-mono bg-red-500/20 px-1.5 py-0.5 rounded border border-red-500/30">
              {filteredVoters.length} {language === 'te' ? 'మంది' : 'electors'}
            </strong>
          </span>
          <button
            onClick={() => setFilterMode('all')}
            className="text-red-400 font-bold hover:underline text-[10px]"
          >
            {language === 'te' ? 'అన్నీ చూపించు ✕' : 'Show All ✕'}
          </button>
        </div>
      )}

      {/* Active Filter Indicator: Deceased */}
      {filterMode === 'deceased' && (
        <div className="bg-slate-800/80 border border-slate-700 rounded-xl px-3 py-1.5 flex items-center justify-between text-[11px] animate-in fade-in">
          <span className="text-slate-300 font-bold flex items-center gap-1.5">
            💀 {language === 'te' ? 'మరణించిన ఓటర్ల జాబితా (బోగస్ ఓటింగ్ ఛాలెంజ్ కొరకు):' : 'Deceased voters list:'}{' '}
            <strong className="text-white font-mono bg-slate-700 px-1.5 py-0.5 rounded border border-slate-600">
              {filteredVoters.length} {language === 'te' ? 'మంది' : 'electors'}
            </strong>
          </span>
          <button
            onClick={() => setFilterMode('all')}
            className="text-amber-400 font-bold hover:underline text-[10px]"
          >
            {language === 'te' ? 'అన్నీ చూపించు ✕' : 'Show All ✕'}
          </button>
        </div>
      )}

      {/* Active Filter Indicator: Out of City */}
      {filterMode === 'out_of_city' && (
        <div className="bg-indigo-950/60 border border-indigo-500/40 rounded-xl px-3 py-1.5 flex items-center justify-between text-[11px] animate-in fade-in">
          <span className="text-indigo-300 font-bold flex items-center gap-1.5">
            ✈️ {language === 'te' ? 'ఊర్లో లేని / వలస వెళ్లిన ఓటర్లు:' : 'Out of City / Migrated electors:'}{' '}
            <strong className="text-white font-mono bg-indigo-900 px-1.5 py-0.5 rounded border border-indigo-400/40">
              {filteredVoters.length} {language === 'te' ? 'మంది' : 'electors'}
            </strong>
          </span>
          <button
            onClick={() => setFilterMode('all')}
            className="text-indigo-300 font-bold hover:underline text-[10px]"
          >
            {language === 'te' ? 'అన్నీ చూపించు ✕' : 'Show All ✕'}
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

      {/* Main Content Area: Excel Spreadsheet Grid vs Surnames Clan View vs Standard List */}
      {viewMode === 'excel' ? (
        <VotersExcelGrid
          voters={voters}
          boothInfo={boothInfo}
          profiles={profiles}
          language={language}
          onUpdateCustomAlias={onUpdateCustomAlias || (() => {})}
          onUpdateCustomPhone={onUpdateCustomPhone}
          onUpdateSupportPct={onUpdateSupportPct}
          onUpdateSurveyMark={onUpdateSurveyMark}
          onQuickToggleOurs={onQuickToggleOurs}
          onQuickToggleVoted={onQuickToggleVoted}
          onOpenSlip={onOpenSlip}
          onOpenPhoneEditor={onOpenPhoneEditor}
          onOpenSupportPicker={onOpenSupportPicker}
          onOpenLogVisit={onOpenLogVisit}
          onOpenGroupPrint={onOpenGroupPrint}
          onSwitchToMobileView={() => handleSetViewMode('list')}
        />
      ) : viewMode === 'surnames' ? (
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
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => { setExportInitialClanId(undefined); setIsExportSurnamesModalOpen(true); }}
                className="px-2.5 py-1 rounded-xl text-[10.5px] font-bold transition-all cursor-pointer flex items-center gap-1 border bg-slate-800 hover:bg-slate-700 text-emerald-300 border-emerald-500/40 shadow-sm"
                title={language === 'te' ? 'ఇంటిపేర్లు & క్రమ సంఖ్యల ఎగుమతి' : 'Export Surnames & Serial Numbers'}
              >
                <Download className="w-3 h-3 text-emerald-400" />
                <span>📥 S.No ఎగుమతి</span>
              </button>
              <button
                type="button"
                onClick={handleToggleGroupSimilarSurnames}
                className={`px-2 py-1 rounded-xl text-[10.5px] font-bold transition-all cursor-pointer flex items-center gap-1 border ${
                  isGroupSimilarSurnames
                    ? 'bg-amber-500 text-slate-950 font-black border-amber-400 shadow-md'
                    : 'bg-slate-800 text-slate-300 border-slate-700 hover:text-white'
                }`}
              >
                <span>🔀</span>
                <span>{isGroupSimilarSurnames ? (language === 'te' ? 'సారూప్యాలు: కలిపి ఉన్నాయి' : 'Similar: Grouped') : (language === 'te' ? 'సారూప్యాలు కలపండి' : 'Group Similar')}</span>
              </button>
              <span className="px-2 py-1 bg-amber-500/20 text-amber-300 border border-amber-500/40 rounded-lg font-mono font-black text-xs">
                {displayedSurnameGroups.length} Clans
              </span>
            </div>
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
                          <span className="px-1.5 py-0.2 bg-blue-950 text-cyan-300 border border-blue-500/50 rounded text-[9px] font-black flex items-center gap-0.5">
                            <span>A</span>
                            <Phone className="w-2.5 h-2.5 text-cyan-400" />
                            <span>{clan.kriyaCount}</span>
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
                      {clan.similarVariants && clan.similarVariants.length > 0 && (
                        <div className="flex items-center gap-1 flex-wrap pt-0.5">
                          <span className="text-[10px] text-amber-400/90 font-bold flex items-center gap-0.5">
                            🔀 {language === 'te' ? 'కలిపిన సారూప్యాలు:' : 'Merged:'}
                          </span>
                          {clan.similarVariants.map(v => (
                            <span
                              key={v.id}
                              className="px-1.5 py-0.2 bg-amber-950/60 text-amber-300 border border-amber-500/40 rounded text-[9px] font-mono"
                              title={`${v.nameEn} (${v.count} ఓట్లు)`}
                            >
                              {v.nameTe || v.nameEn} ({v.count})
                            </span>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Support Leaning Badge & S.No Export */}
                    <div className="text-right flex flex-col items-end gap-1">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-black inline-block border ${
                        clan.supportPct >= 75
                          ? 'bg-emerald-600/30 text-emerald-300 border-emerald-500/40'
                          : clan.supportPct >= 50
                            ? 'bg-amber-600/30 text-amber-300 border-amber-500/40'
                            : 'bg-slate-800 text-slate-300 border-slate-700'
                      }`}>
                        🚩 {clan.supportPct}% {language === 'te' ? 'మద్దతు' : 'Support'}
                      </span>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setExportInitialClanId(clan.id);
                          setIsExportSurnamesModalOpen(true);
                        }}
                        className="px-2 py-0.5 bg-slate-800 hover:bg-slate-700 text-emerald-300 border border-emerald-500/30 rounded text-[9.5px] font-bold flex items-center gap-1 active:scale-95 transition-all shadow-xs"
                        title={language === 'te' ? 'ఈ వంశం S.No లు ఎగుమతి/కాపీ చేయండి' : 'Export this clan S.Nos'}
                      >
                        <Download className="w-2.5 h-2.5 text-emerald-400" />
                        <span>S.No ఎగుమతి</span>
                      </button>
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
                        const isClanDeceased = prof.survey_status === 'deceased';

                        return (
                          <div key={m.s} className={`pt-2 first:pt-0 space-y-1 ${isClanDeceased ? 'opacity-70' : ''}`}>
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <span className="font-mono text-amber-400 font-bold">#{m.s}</span>
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    if (m.id) handleCopyEpic(m.id, `clan_epic_${m.s}`);
                                  }}
                                  className={`font-mono text-[10px] px-1.5 py-0.5 rounded border transition-all flex items-center gap-1 active:scale-95 cursor-pointer shadow-sm ${
                                    copiedEpicId === `clan_epic_${m.s}`
                                      ? 'bg-emerald-950/90 text-emerald-300 border-emerald-500/80 ring-1 ring-emerald-500/50'
                                      : 'text-emerald-400 hover:text-emerald-300 bg-slate-950 hover:bg-slate-800 border-slate-800 hover:border-emerald-500/50'
                                  }`}
                                  title={language === 'te' ? 'ఓటర్ ఐడీ (EPIC) కాపీ చేయండి' : 'Click to copy EPIC'}
                                >
                                  <span>{m.id}</span>
                                  {copiedEpicId === `clan_epic_${m.s}` ? (
                                    <span className="text-[8px] text-emerald-300 font-bold flex items-center gap-0.5">
                                      <CheckCircle2 className="w-2.5 h-2.5 text-emerald-400" />
                                      <span>{language === 'te' ? 'కాపీ' : 'Copied'}</span>
                                    </span>
                                  ) : (
                                    <Copy className="w-2 h-2 text-slate-500 hover:text-emerald-400" />
                                  )}
                                </button>
                                <span className={`font-bold text-xs ${isClanDeceased ? 'text-slate-400 line-through' : 'text-white'}`}>{m.n}</span>
                                {getStatusBadge(prof.survey_status)}
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
                              <div className="flex items-center gap-1.5 flex-wrap justify-end">
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleToggleOurs(m.s);
                                  }}
                                  className={`px-1.5 py-0.5 rounded text-[9.5px] font-bold border transition-all ${
                                    (pct === 100 || prof.survey_status === 'supporter') && pct !== 50
                                      ? 'bg-gradient-to-r from-red-600 to-amber-600 text-white border-red-500 font-black shadow-sm'
                                      : 'bg-slate-900 text-slate-400 border-slate-700 hover:text-white'
                                  }`}
                                  title="మనవాళ్లేనా? (Toggle Ours)"
                                >
                                  ⭐ {(pct === 100 || prof.survey_status === 'supporter') && pct !== 50 ? 'మనవాళ్లే' : 'మనవాళ్లు?'}
                                </button>
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleToggleVoted(m.s);
                                  }}
                                  className={`px-1.5 py-0.5 rounded text-[9.5px] font-bold border transition-all ${
                                    prof.survey_status === 'voted'
                                      ? 'bg-emerald-600 text-white border-emerald-500 font-black shadow-sm'
                                      : 'bg-slate-900 text-slate-400 border-slate-700 hover:text-white'
                                  }`}
                                  title="ఓటు వేశారా? (Toggle Voted)"
                                >
                                  {prof.survey_status === 'voted' ? '✅ ఓటేశారు' : '🗳️ వేయలేదు'}
                                </button>
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleToggleOutOfCity(m.s);
                                  }}
                                  className={`px-1.5 py-0.5 rounded text-[9.5px] font-bold border transition-all ${
                                    prof.survey_status === 'out_of_city'
                                      ? 'bg-indigo-600 text-white border-indigo-400 font-black shadow-sm'
                                      : 'bg-slate-900 text-indigo-300 border-slate-700 hover:bg-indigo-950/40'
                                  }`}
                                  title="ఊర్లో లేరు (Toggle Out of City)"
                                >
                                  {prof.survey_status === 'out_of_city' ? '✈️ ఊర్లో లేరు' : '✈️ లేరు'}
                                </button>
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleToggleDeceased(m.s);
                                  }}
                                  className={`px-1.5 py-0.5 rounded text-[9.5px] font-bold border transition-all ${
                                    prof.survey_status === 'deceased'
                                      ? 'bg-slate-700 text-slate-100 border-slate-400 font-black shadow-sm'
                                      : 'bg-slate-900 text-slate-400 border-slate-700 hover:bg-slate-800'
                                  }`}
                                  title="మరణించారు (Toggle Deceased)"
                                >
                                  {prof.survey_status === 'deceased' ? '💀 మరణించారు' : '💀'}
                                </button>
                                <button
                                  onClick={() => onOpenSupportPicker(m.n, pct !== undefined ? pct : 50, prof.notes, m.s)}
                                  className="hover:scale-105"
                                >
                                  {getLeaningBadge(pct)}
                                </button>
                              </div>
                            </div>

                            {/* Contact Row in Clan Roster */}
                            {(m.k_m || prof.customPhone) && (
                              <div className="flex items-center justify-between pt-0.5 text-[10px]">
                                <div className="flex items-center gap-1.5 flex-wrap">
                                  {m.k_m && (
                                    <span className="inline-flex items-center gap-1 bg-amber-950/40 border border-amber-500/30 px-1.5 py-0.2 rounded text-[9.5px]">
                                      <span className="text-amber-300 font-bold">📱 రిజిస్టర్డ్:</span>
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
                                        title="Copy Phone"
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
      ) : isDesktopMultiCol && cardLayout === 'row' ? (
        /* Desktop Compact List/Row View (Full Width) */
        <div className="space-y-1.5 w-full">
          {displayedVoters.map(v => {
            const prof = profiles[v.s] || {};
            const phone = prof.customPhone || v.k_m;
            const pct = prof.supportPct;
            const sn = extractSurname(v, prof);
            const cardPath = v.card_url || v.card;
            const photoPath = v.photo_url || v.photo;
            const isDeceased = prof.survey_status === 'deceased';
            const isOutOfCity = prof.survey_status === 'out_of_city';
            const isOurs = (pct === 100 || prof.survey_status === 'supporter') && pct !== 50;
            const isVoted = prof.survey_status === 'voted';

            return (
              <div
                key={v.s}
                className={`bg-slate-900/90 hover:bg-slate-800/90 border rounded-xl px-3 py-2 transition-all flex items-center justify-between gap-3 text-xs shadow-sm ${
                  isDeceased
                    ? 'border-slate-800 bg-slate-950/80 opacity-75 grayscale-[20%]'
                    : isOutOfCity
                      ? 'border-indigo-500/40 bg-gradient-to-r from-indigo-950/25 via-slate-900 to-slate-900'
                      : pct === 100
                        ? 'border-red-500/50 bg-gradient-to-r from-red-950/25 via-slate-900 to-slate-900'
                        : pct !== undefined && pct >= 75
                          ? 'border-emerald-500/40 bg-gradient-to-r from-emerald-950/20 via-slate-900 to-slate-900'
                          : pct === 40
                            ? 'border-amber-500/40 bg-gradient-to-r from-amber-950/20 via-slate-900 to-slate-900'
                            : 'border-slate-800 hover:border-slate-700'
                } ${selectedVoterSnos.has(v.s) ? 'ring-2 ring-emerald-500/80 border-emerald-500' : ''}`}
              >
                {/* S.No, Checkbox, Card/Slip Thumbnail, EPIC */}
                <div className="flex items-center gap-2.5 shrink-0">
                  {isSelectionMode && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleToggleSelectVoter(v.s);
                      }}
                      className="p-0.5 text-amber-400 hover:text-white"
                    >
                      {selectedVoterSnos.has(v.s) ? (
                        <CheckSquare className="w-4 h-4 text-emerald-400 fill-emerald-400/20" />
                      ) : (
                        <Square className="w-4 h-4 text-slate-500 hover:text-amber-400" />
                      )}
                    </button>
                  )}
                  <span className="w-12 text-center px-1.5 py-1 bg-amber-500/20 text-amber-300 border border-amber-500/40 rounded-lg text-xs font-mono font-black shrink-0">
                    #{v.s}
                  </span>

                  {/* Thumbnail / Card Button */}
                  <button
                    type="button"
                    onClick={() => onOpenSlip(v)}
                    className="w-10 h-10 rounded-lg bg-slate-950 border border-slate-700 hover:border-amber-400 flex items-center justify-center shrink-0 overflow-hidden relative group cursor-pointer shadow-inner"
                    title={language === 'te' ? 'పూర్తి ఓటర్ కార్డు చూడటానికి క్లిక్ చేయండి' : 'Click to view card'}
                  >
                    {photoPath ? (
                      <img src={resolvePhotoUrl(photoPath)} alt={v.n} className="w-full h-full object-cover group-hover:scale-110 transition-transform" />
                    ) : (
                      <span className="text-base">{cardPath ? '📇' : '👤'}</span>
                    )}
                  </button>

                  {/* EPIC ID & Ward */}
                  <div className="w-28 shrink-0">
                    <button
                      type="button"
                      onClick={() => handleCopyEpic(v.id, String(v.s))}
                      className="font-mono text-xs font-black text-amber-400 hover:text-white flex items-center gap-1"
                      title="EPIC ID కాపీ చేయండి"
                    >
                      <span>{v.id}</span>
                      {copiedEpicId === String(v.s) ? <span className="text-[9px] text-emerald-400 font-bold">✓</span> : <Copy className="w-2.5 h-2.5 text-slate-500" />}
                    </button>
                    {v.ward_no && (
                      <span className="text-[10px] text-blue-300 font-mono font-bold block">
                        🏛️ వార్డు #{v.ward_no}
                      </span>
                    )}
                  </div>
                </div>

                {/* Voter Details: Name, Surname, Relation, Age, House No */}
                <div className="flex-1 min-w-0 flex items-center gap-3">
                  <div className="min-w-0 flex-1 cursor-pointer" onClick={() => onOpenSlip(v)}>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`text-sm font-black truncate ${isDeceased ? 'line-through text-slate-500' : 'text-white hover:text-amber-300'}`}>
                        {v.n}
                      </span>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedSurname(selectedSurname === sn.en ? 'all' : sn.en);
                          setVisibleCount(INITIAL_VISIBLE_COUNT);
                        }}
                        className="px-1.5 py-0.2 rounded bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/30 text-[9.5px] font-bold shrink-0"
                        title="ఈ ఇంటిపేరు ఓటర్లను ఫిల్టర్ చేయండి"
                      >
                        🏛️ {sn.te || sn.en}
                      </button>
                      {prof.customAlias && (
                        <span className="px-1.5 py-0.2 rounded bg-emerald-950/80 text-emerald-300 border border-emerald-500/50 text-[9px] font-mono shrink-0">
                          {prof.customAlias}
                        </span>
                      )}
                      {dupAnalysis.voterDupMap[v.s] && (
                        <span className="px-1.5 py-0.2 rounded bg-rose-950 text-rose-300 border border-rose-500/50 text-[9px] font-bold shrink-0">
                          ⚠️ డూప్లికేట్
                        </span>
                      )}
                    </div>
                    <div className="text-[11px] text-slate-400 flex items-center gap-2 mt-0.5 flex-wrap">
                      <span>{t.relation}: <strong className="text-slate-300 font-medium">{v.r || '-'}</strong></span>
                      <span>•</span>
                      <span>{t.age}: <strong className="text-slate-300 font-medium">{v.a}Y ({v.g === 'M' ? (language === 'te' ? 'పు' : 'M') : (language === 'te' ? 'మహిళ' : 'F')})</strong></span>
                      <span>•</span>
                      <span>{t.houseNo}: <strong className="text-slate-300 font-mono">{v.hn || '-'}</strong></span>
                      {v.sec && (
                        <>
                          <span>•</span>
                          <span className="text-amber-300/80 truncate max-w-[220px]">
                            📍 {typeof v.sec === 'string' && v.sec.includes(' - ') ? v.sec.split(' - ').slice(1).join(' - ') : v.sec}
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                {/* Phone & WhatsApp */}
                <div className="w-40 shrink-0 flex items-center gap-1.5">
                  {phone ? (
                    <div className="inline-flex items-center gap-1 bg-slate-950 border border-slate-700/80 px-2 py-1 rounded-lg text-xs">
                      <Phone className="w-3 h-3 text-emerald-400" />
                      <a href={`tel:${phone}`} className="font-mono font-bold text-emerald-200 hover:text-white hover:underline text-[11px]">
                        {phone}
                      </a>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleCopyPhone(phone, `list_p_${v.s}`);
                        }}
                        className="p-0.5 text-slate-400 hover:text-white"
                        title="కాపీ"
                      >
                        {copiedPhoneId === `list_p_${v.s}` ? <span className="text-[8px] text-emerald-400">✓</span> : <Copy className="w-2.5 h-2.5 text-slate-400" />}
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => onOpenPhoneEditor(v)}
                      className="text-amber-400/80 hover:text-amber-300 text-[10.5px] font-bold border border-dashed border-slate-700 hover:border-amber-500/50 px-2 py-1 rounded-lg"
                    >
                      + ఫోన్
                    </button>
                  )}
                  {phone && (
                    <button
                      type="button"
                      onClick={() => handleSendWhatsAppSlip(v, phone)}
                      className="p-1 rounded-lg bg-emerald-950/80 hover:bg-emerald-900 text-emerald-400 border border-emerald-500/40 cursor-pointer"
                      title="వాట్సాప్ స్లిప్ పంపండి"
                    >
                      <MessageSquare className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                {/* Actions: Leaning Badge, 1-Click Status Toggles, Visits, Slip */}
                <div className="flex items-center gap-1.5 shrink-0">
                  {/* Leaning Support Picker */}
                  <button
                    type="button"
                    onClick={() => onOpenSupportPicker(v.n, pct ?? 50, prof.notes, v.s)}
                    className="cursor-pointer transition-transform hover:scale-105 active:scale-95"
                    title="మొగ్గు మార్చడానికి క్లిక్ చేయండి"
                  >
                    {getLeaningBadge(pct)}
                  </button>

                  {/* Quick Mark Ours */}
                  <button
                    type="button"
                    onClick={() => handleToggleOurs(v.s)}
                    className={`px-2 py-1 rounded-lg text-[10.5px] font-bold flex items-center gap-1 transition-all border cursor-pointer ${
                      isOurs
                        ? 'bg-gradient-to-r from-emerald-600 to-amber-600 text-white border-emerald-400 font-black shadow-sm'
                        : 'bg-slate-950 hover:bg-slate-800 text-slate-300 border-slate-700'
                    }`}
                    title={isOurs ? 'మనవాళ్లే (రిసెట్ చేయడానికి క్లిక్ చేయండి)' : 'మనవాళ్లే అని మార్క్ చేయండి'}
                  >
                    <Star className={`w-3 h-3 ${isOurs ? 'fill-current' : 'text-amber-400'}`} />
                    <span>{isOurs ? 'మనవాళ్లే' : 'మనవాళ్లే?'}</span>
                  </button>

                  {/* Quick Mark Voted */}
                  <button
                    type="button"
                    onClick={() => handleToggleVoted(v.s)}
                    className={`px-2 py-1 rounded-lg text-[10.5px] font-bold flex items-center gap-1 transition-all border cursor-pointer ${
                      isVoted
                        ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white border-emerald-400 font-black shadow-sm'
                        : 'bg-slate-950 hover:bg-slate-800 text-slate-300 border-slate-700'
                    }`}
                    title={isVoted ? 'ఓటేశారు (అన్‌మార్క్ చేయడానికి క్లిక్ చేయండి)' : 'ఓటు వేశారు అని మార్క్ చేయండి'}
                  >
                    <CheckCircle2 className={`w-3 h-3 ${isVoted ? 'fill-current' : 'text-emerald-400'}`} />
                    <span>{isVoted ? 'ఓటేశారు' : 'ఓటు?'}</span>
                  </button>

                  {/* Visit Log */}
                  <button
                    type="button"
                    onClick={() => onOpenLogVisit(v)}
                    className="px-2 py-1 rounded-lg bg-slate-950 hover:bg-slate-800 text-amber-300 border border-slate-700 text-[10.5px] font-bold cursor-pointer"
                    title="విజిట్ నమోదు చేయండి"
                  >
                    {prof.visits?.length ? `✓ ${prof.visits.length}` : '+విజిట్'}
                  </button>

                  {/* Slip button */}
                  <button
                    type="button"
                    onClick={() => onOpenSlip(v)}
                    className="px-2.5 py-1 rounded-lg bg-gradient-to-r from-amber-500/20 to-amber-600/20 hover:from-amber-500/30 hover:to-amber-600/30 text-amber-300 border border-amber-500/40 text-[10.5px] font-bold flex items-center gap-1 cursor-pointer"
                    title="పూర్తి అధికారిక కార్డు స్లిప్ చూడండి"
                  >
                    <span>📇 స్లిప్</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* Voter Cards List: Strictly 1 card per row on mobile; responsive multi-column on desktop (>= 1024px) utilizing full screen */
        <div className={
          isDesktopMultiCol
            ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3 2xl:grid-cols-4 min-[1900px]:grid-cols-5 min-[2500px]:grid-cols-6 gap-3.5"
            : "grid grid-cols-1 gap-3.5"
        }>
        {displayedVoters.map(v => {
          const prof = profiles[v.s] || {};
          const phone = prof.customPhone || v.k_m;
          const pct = prof.supportPct;
          const sn = extractSurname(v, prof);
          const cardPath = v.card_url || v.card;
          const photoPath = v.photo_url || v.photo;

          const isDeceased = prof.survey_status === 'deceased';
          const isOutOfCity = prof.survey_status === 'out_of_city';

          return (
            <div
              key={v.s}
              className={`bg-slate-900/90 border rounded-2xl p-3.5 space-y-2.5 transition-all shadow-md relative overflow-hidden ${
                isDeceased
                  ? 'border-slate-800 bg-slate-950/80 opacity-75 grayscale-[20%]'
                  : isOutOfCity
                    ? 'border-indigo-500/40 bg-gradient-to-r from-indigo-950/20 via-slate-900 to-slate-900'
                    : pct === 100
                      ? 'border-red-500/50 bg-gradient-to-r from-red-950/25 via-slate-900 to-slate-900'
                      : pct !== undefined && pct >= 75
                        ? 'border-emerald-500/40 bg-gradient-to-r from-emerald-950/20 via-slate-900 to-slate-900'
                        : pct === 40
                          ? 'border-amber-500/40 bg-gradient-to-r from-amber-950/20 via-slate-900 to-slate-900'
                          : pct === 0
                            ? 'border-rose-900 bg-rose-950/20'
                            : 'border-slate-800/80 hover:border-slate-700'
              } ${selectedVoterSnos.has(v.s) ? 'ring-2 ring-emerald-500/80 border-emerald-500 shadow-emerald-950/50' : ''}`}
            >
              {/* Card Top Row: S.No, EPIC, Leaning & Survey Status */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  {isSelectionMode && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleToggleSelectVoter(v.s);
                      }}
                      className="p-0.5 text-amber-400 hover:text-white transition-transform active:scale-90"
                      title={selectedVoterSnos.has(v.s) ? 'Deselect Voter' : 'Select Voter'}
                    >
                      {selectedVoterSnos.has(v.s) ? (
                        <CheckSquare className="w-4 h-4 text-emerald-400 fill-emerald-400/20" />
                      ) : (
                        <Square className="w-4 h-4 text-slate-500 hover:text-amber-400" />
                      )}
                    </button>
                  )}
                  <span className="px-2 py-0.5 bg-amber-500/20 text-amber-300 border border-amber-500/40 rounded-md text-[11px] font-mono font-black">
                    #{v.s}
                  </span>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      if (v.id) handleCopyEpic(v.id, `epic_${v.s}`);
                    }}
                    className={`font-mono text-[11px] font-bold px-2 py-0.5 rounded border transition-all flex items-center gap-1 active:scale-95 cursor-pointer shadow-sm group ${
                      copiedEpicId === `epic_${v.s}`
                        ? 'bg-emerald-950/90 text-emerald-300 border-emerald-500/80 ring-1 ring-emerald-500/50'
                        : 'text-emerald-400 hover:text-emerald-300 bg-slate-950 hover:bg-slate-800 border-slate-800 hover:border-emerald-500/50'
                    }`}
                    title={language === 'te' ? 'ఓటర్ ఐడీ (EPIC) కాపీ చేయండి' : 'Click to copy EPIC ID'}
                  >
                    <span>{v.id || 'NO-EPIC'}</span>
                    {copiedEpicId === `epic_${v.s}` ? (
                      <span className="text-[10px] text-emerald-300 font-sans font-bold flex items-center gap-0.5 animate-in fade-in">
                        <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                        <span className="text-[9px] uppercase tracking-tight">{language === 'te' ? 'కాపీ అయింది' : 'Copied'}</span>
                      </span>
                    ) : (
                      <Copy className="w-2.5 h-2.5 text-slate-500 group-hover:text-emerald-400 transition-colors" />
                    )}
                  </button>
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
              {showCards && cardPath ? (
                /* Layout A (Cards ON): Full official card slip on top + full width details below (Desktop/Expanded mode) */
                <div className="space-y-2 mt-1">
                  {/* Official Slip Image */}
                  <div
                    onClick={() => onOpenSlip(v)}
                    className="w-full rounded-xl overflow-hidden border border-amber-400/50 bg-slate-950/90 shadow-sm relative group cursor-pointer hover:border-amber-300 hover:shadow-md transition-all active:scale-[0.99] flex items-center justify-center p-1"
                    title={language === 'te' ? 'పూర్తి కార్డును జూమ్ చేయడానికి క్లిక్ చేయండి' : 'Click to zoom complete voter card'}
                  >
                    <img
                      src={resolvePhotoUrl(cardPath)}
                      alt={`Card #${v.s}`}
                      className="w-full h-auto max-h-[145px] sm:max-h-[160px] object-contain block rounded-lg group-hover:scale-[1.01] transition-transform duration-200"
                      loading="lazy"
                      onError={(e) => {
                        const target = e.currentTarget as HTMLImageElement;
                        const cleanPath = cardPath.startsWith('/') ? cardPath : `/${cardPath}`;
                        target.src = `https://raw.githubusercontent.com/gundradvp/pithapuram-voters-mobile/main/public${cleanPath}`;
                      }}
                    />
                    <span className="absolute bottom-2 right-2 bg-slate-950/90 text-amber-300 font-mono font-black text-[10px] px-1.5 py-0.5 rounded border border-amber-500/50 shadow">
                      #{v.s}
                    </span>
                    {onOpenReOcrReview && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onOpenReOcrReview(v.ward_no ? String(v.ward_no) : selectedWard, Number(v.s || v.sno));
                        }}
                        className="absolute top-2 right-2 bg-slate-950/90 hover:bg-amber-500 hover:text-slate-950 text-amber-300 font-black text-[10px] px-2 py-0.5 rounded border border-amber-500/40 shadow cursor-pointer flex items-center gap-1 z-10 transition-all active:scale-95"
                        title="ఈ ఒక్క కార్డును రీ-ఓసీఆర్ స్టూడియోలో చూడండి"
                      >
                        <Sparkles className="w-2.5 h-2.5 text-amber-400" />
                        <span>రీ-ఓసీఆర్</span>
                      </button>
                    )}
                  </div>

                  {/* Voter Name & Details (Full Width: Zero text clipping or overlapping) */}
                  <div 
                    className="w-full min-w-0 cursor-pointer pt-0.5"
                    onClick={() => onOpenSlip(v)}
                    title={language === 'te' ? 'పూర్తి ఓటర్ కార్డు చూడటానికి ట్యాప్ చేయండి' : 'Tap to view complete official card'}
                  >
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <h3 className={`text-sm sm:text-[14.5px] font-black transition-colors break-words leading-snug ${isDeceased ? 'text-slate-400 line-through' : 'text-white hover:text-amber-300'}`}>
                        {v.n}
                      </h3>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedSurname(selectedSurname === sn.en ? 'all' : sn.en);
                          setVisibleCount(INITIAL_VISIBLE_COUNT);
                        }}
                        className="px-1.5 py-0.2 rounded bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/30 text-[9px] font-bold inline-flex items-center gap-0.5 shrink-0"
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
                            className={`px-1.5 py-0.5 rounded text-[9px] font-black inline-flex items-center gap-1 shadow-sm transition-all hover:scale-105 active:scale-95 shrink-0 ${
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
                      {prof.customPhone ? (
                        <span 
                          className="px-1.5 py-0.2 rounded text-[8.5px] font-black tracking-wide flex items-center gap-0.5 bg-emerald-500/20 text-emerald-300 border border-emerald-500/50 shrink-0"
                          title={language === 'te' ? 'మాన్యువల్‌గా చేర్చిన ఫోన్ (M 📞)' : 'Manually added phone (M 📞)'}
                        >
                          <span className="font-mono font-black">M</span>
                          <Phone className="w-2.5 h-2.5 text-emerald-400" />
                        </span>
                      ) : v.k_m ? (
                        <span 
                          className="px-1.5 py-0.2 rounded text-[8.5px] font-black tracking-wide flex items-center gap-0.5 bg-blue-500/20 text-cyan-300 border border-blue-500/50 shrink-0"
                          title={language === 'te' ? 'జాబితా నుండి వచ్చిన ఫోన్ (A 📞)' : 'Auto list phone (A 📞)'}
                        >
                          <span className="font-mono font-black">A</span>
                          <Phone className="w-2.5 h-2.5 text-cyan-400" />
                        </span>
                      ) : null}
                    </div>

                    <div className="text-[11px] text-slate-400 mt-1 flex items-center gap-2 flex-wrap">
                      <span>{t.relation}: <strong className="text-slate-300 font-medium">{v.r || '-'}</strong></span>
                      <span>•</span>
                      <span>{t.age}: <strong className="text-slate-300 font-medium">{v.a}Y ({v.g === 'M' ? (language === 'te' ? 'పురుషుడు' : 'M') : (language === 'te' ? 'మహిళ' : 'F')})</strong></span>
                      {Number(v.a || 0) >= 70 && !isDeceased && (
                        <span className="px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 border border-amber-500/50 text-[9px] font-black inline-flex items-center gap-0.5">
                          👴 {language === 'te' ? '70+ వృద్ధులు (వాహన సహాయం)' : '70+ Senior (Vehicle Needed)'}
                        </span>
                      )}
                      <span>•</span>
                      <span className="flex items-center gap-1">
                        <Home className="w-3 h-3 text-amber-400" />
                        {t.houseNo}: <strong className="text-amber-300 font-mono">{v.hn || '-'}</strong>
                      </span>
                    </div>

                    {prof.customAlias && (
                      <div className="mt-1 flex items-center gap-1.5 flex-wrap">
                        <span className="inline-flex items-center gap-1 bg-emerald-950/80 border border-emerald-500/50 px-2 py-0.5 rounded-lg text-[10px] font-bold text-emerald-300">
                          <Edit3 className="w-3 h-3 text-amber-400" />
                          <span>నా ఇన్పుట్: <strong className="text-white font-mono">{prof.customAlias}</strong></span>
                        </span>
                        <span className="text-[9px] text-slate-500 italic">
                          ({prof.customAlias} లేదా {v.n} తో సెర్చ్ చేయవచ్చు)
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                /* Layout B (Cards OFF / Mobile View): Previous compact 1-click view badge on left + details on right */
                <div className="flex items-start gap-3 mt-1">
                  {/* Clickable Card Badge Trigger (Previous Compact View: 1-click to view complete slip) */}
                  <button
                    type="button"
                    onClick={() => onOpenSlip(v)}
                    className="w-12 h-14 rounded-2xl bg-gradient-to-b from-slate-800 to-slate-900 border border-slate-700/80 hover:border-amber-500/80 active:scale-95 flex flex-col items-center justify-center text-slate-400 shrink-0 shadow-inner transition-all group relative cursor-pointer"
                    title={language === 'te' ? 'పూర్తి ఓటర్ కార్డు చూడటానికి ట్యాప్ చేయండి' : 'Tap to view complete official card'}
                  >
                    <div className="w-6 h-6 rounded-lg bg-amber-500/20 text-amber-400 flex items-center justify-center group-hover:scale-110 transition-transform">
                      <span className="text-[12px]">{cardPath ? '📇' : photoPath ? '👤' : '📄'}</span>
                    </div>
                    <span className="text-[8px] font-black text-amber-300 mt-1 uppercase tracking-tight">
                      {cardPath ? 'కార్డు' : 'స్లిప్'}
                    </span>
                    {cardPath && (
                      <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-emerald-500 border border-slate-900 shadow"></span>
                    )}
                  </button>

                  <div 
                    className="flex-1 min-w-0 cursor-pointer"
                    onClick={() => onOpenSlip(v)}
                    title={language === 'te' ? 'పూర్తి ఓటర్ కార్డు చూడటానికి ట్యాప్ చేయండి' : 'Tap to view complete official card'}
                  >
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <h3 className={`text-sm sm:text-[14.5px] font-black transition-colors break-words leading-snug ${isDeceased ? 'text-slate-400 line-through' : 'text-white hover:text-amber-300'}`}>
                        {v.n}
                      </h3>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedSurname(selectedSurname === sn.en ? 'all' : sn.en);
                          setVisibleCount(INITIAL_VISIBLE_COUNT);
                        }}
                        className="px-1.5 py-0.2 rounded bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/30 text-[9px] font-bold inline-flex items-center gap-0.5 shrink-0"
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
                            className={`px-1.5 py-0.5 rounded text-[9px] font-black inline-flex items-center gap-1 shadow-sm transition-all hover:scale-105 active:scale-95 shrink-0 ${
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
                      {prof.customPhone ? (
                        <span 
                          className="px-1.5 py-0.2 rounded text-[8.5px] font-black tracking-wide flex items-center gap-0.5 bg-emerald-500/20 text-emerald-300 border border-emerald-500/50 shrink-0"
                          title={language === 'te' ? 'మాన్యువల్‌గా చేర్చిన ఫోన్ (M 📞)' : 'Manually added phone (M 📞)'}
                        >
                          <span className="font-mono font-black">M</span>
                          <Phone className="w-2.5 h-2.5 text-emerald-400" />
                        </span>
                      ) : v.k_m ? (
                        <span 
                          className="px-1.5 py-0.2 rounded text-[8.5px] font-black tracking-wide flex items-center gap-0.5 bg-blue-500/20 text-cyan-300 border border-blue-500/50 shrink-0"
                          title={language === 'te' ? 'జాబితా నుండి వచ్చిన ఫోన్ (A 📞)' : 'Auto list phone (A 📞)'}
                        >
                          <span className="font-mono font-black">A</span>
                          <Phone className="w-2.5 h-2.5 text-cyan-400" />
                        </span>
                      ) : null}
                    </div>

                    <div className="text-[11px] text-slate-400 mt-1 flex items-center gap-2 flex-wrap">
                      <span>{t.relation}: <strong className="text-slate-300 font-medium">{v.r || '-'}</strong></span>
                      <span>•</span>
                      <span>{t.age}: <strong className="text-slate-300 font-medium">{v.a}Y ({v.g === 'M' ? (language === 'te' ? 'పురుషుడు' : 'M') : (language === 'te' ? 'మహిళ' : 'F')})</strong></span>
                      {Number(v.a || 0) >= 70 && !isDeceased && (
                        <span className="px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 border border-amber-500/50 text-[9px] font-black inline-flex items-center gap-0.5">
                          👴 {language === 'te' ? '70+ వృద్ధులు (వాహన సహాయం)' : '70+ Senior (Vehicle Needed)'}
                        </span>
                      )}
                      <span>•</span>
                      <span className="flex items-center gap-1">
                        <Home className="w-3 h-3 text-amber-400" />
                        {t.houseNo}: <strong className="text-amber-300 font-mono">{v.hn || '-'}</strong>
                      </span>
                    </div>

                    {prof.customAlias && (
                      <div className="mt-1 flex items-center gap-1.5 flex-wrap">
                        <span className="inline-flex items-center gap-1 bg-emerald-950/80 border border-emerald-500/50 px-2 py-0.5 rounded-lg text-[10px] font-bold text-emerald-300">
                          <Edit3 className="w-3 h-3 text-amber-400" />
                          <span>నా ఇన్పుట్: <strong className="text-white font-mono">{prof.customAlias}</strong></span>
                        </span>
                        <span className="text-[9px] text-slate-500 italic">
                          ({prof.customAlias} లేదా {v.n} తో సెర్చ్ చేయవచ్చు)
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              )}
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
                        📍 {typeof v.sec === 'string' && v.sec.includes(' - ') ? v.sec.split(' - ').slice(1).join(' - ') : v.sec}
                      </span>
                    )}
                  </div>
                )}

                {/* Contact Phone Row (Kriya Phone + Custom Phone) */}
                <div className="mt-2 pt-1.5 border-t border-slate-800/80 flex items-center justify-between text-[11px] flex-wrap gap-1.5">
                  <div className="flex items-center gap-2 flex-wrap">
                    {v.k_m && (
                      <div className="inline-flex items-center gap-1.5 bg-blue-950/40 border border-blue-500/40 px-2 py-0.5 rounded-lg text-[10.5px]">
                        <span className="px-1 py-0.2 rounded bg-blue-900/60 border border-blue-500/50 text-cyan-300 text-[9px] font-mono font-black flex items-center gap-0.5" title="Auto List Mobile">
                          <span>A</span>
                          <Phone className="w-2 h-2 text-cyan-400" />
                        </span>
                        <a
                          href={`tel:${v.k_m}`}
                          className="font-mono font-black text-cyan-200 hover:text-white hover:underline flex items-center gap-1"
                          title={language === 'te' ? 'కాల్ చేయండి (Click to Call)' : 'Click to Call'}
                        >
                          <span>{v.k_m}</span>
                        </a>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleCopyPhone(v.k_m!, `km_${v.s}`);
                          }}
                          className="p-1 hover:bg-blue-900/80 rounded text-slate-300 hover:text-white transition-colors flex items-center gap-0.5"
                          title={language === 'te' ? 'నంబర్ కాపీ చేయండి (Click to Copy)' : 'Copy Phone Number'}
                        >
                          {copiedPhoneId === `km_${v.s}` ? (
                            <span className="text-[9px] text-emerald-400 font-bold">✓ కాపీ</span>
                          ) : (
                            <Copy className="w-2.5 h-2.5 text-cyan-400" />
                          )}
                        </button>
                      </div>
                    )}

                    {prof.customPhone && prof.customPhone !== v.k_m && (
                      <div className="inline-flex items-center gap-1.5 bg-emerald-950/60 border border-emerald-500/40 px-2 py-0.5 rounded-lg text-[10.5px]">
                        <span className="px-1 py-0.2 rounded bg-emerald-900/60 border border-emerald-500/50 text-emerald-300 text-[9px] font-mono font-black flex items-center gap-0.5" title="Manually Added Mobile">
                          <span>M</span>
                          <Phone className="w-2 h-2 text-emerald-400" />
                        </span>
                        <a
                          href={`tel:${prof.customPhone}`}
                          className="font-mono font-black text-emerald-200 hover:text-white hover:underline flex items-center gap-1"
                          title={language === 'te' ? 'కాల్ చేయండి (Click to Call)' : 'Click to Call'}
                        >
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

                  <div className="flex items-center gap-2 shrink-0">
                    {/* Direct 1-Tap WhatsApp Slip */}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleSendWhatsAppSlip(v, phone);
                      }}
                      className="px-2 py-0.5 rounded-lg bg-emerald-950/80 hover:bg-emerald-900 border border-emerald-500/50 text-emerald-300 font-bold text-[10px] flex items-center gap-1 active:scale-95 transition-all shadow-sm"
                      title={language === 'te' ? 'ఈ ఓటరుకు వాట్సాప్‌లో అధికారిక ఓటర్ స్లిప్ పంపండి' : 'Send Official WhatsApp Voter Slip'}
                    >
                      <MessageSquare className="w-3 h-3 text-emerald-400" />
                      <span>{language === 'te' ? 'స్లిప్' : 'Slip'}</span>
                    </button>

                    <button
                      onClick={() => onOpenPhoneEditor(v)}
                      className="text-amber-400 hover:text-amber-300 font-bold text-[10px] underline flex items-center gap-0.5"
                    >
                      {phone ? t.editPhone : t.addPhone}
                    </button>
                  </div>
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

                {/* ⚡ Quick Action Switches: 1-Tap Controls on Main Card */}
                {(() => {
                  const isOurs = (pct === 100 || prof.survey_status === 'supporter') && pct !== 50;
                  const isVoted = prof.survey_status === 'voted';
                  const isOutOfCity = prof.survey_status === 'out_of_city';
                  const isDeceased = prof.survey_status === 'deceased';

                  return (
                    <div className="space-y-1.5 pt-1 pb-0.5">
                      {/* Row 1: ⭐ మనవాళ్లే (100%) & ✅ ఓటేశారు (Voted) */}
                      <div className="grid grid-cols-2 gap-2">
                        {/* 1. Quick Switch for OURS (మనవాళ్లే) */}
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleToggleOurs(v.s);
                          }}
                          className={`py-2 px-2.5 rounded-xl text-xs font-black flex items-center justify-center gap-1.5 transition-all active:scale-95 shadow-sm border ${
                            isOurs
                              ? 'bg-gradient-to-r from-emerald-600 to-amber-600 text-white border-emerald-400 ring-2 ring-emerald-400/40 shadow-emerald-950/50'
                              : 'bg-slate-950 hover:bg-slate-800 text-slate-300 border-slate-700 hover:border-amber-500/60'
                          }`}
                          title={isOurs ? 'మనవాళ్లే (ట్యాప్ చేస్తే రీసెట్ అవుతుంది)' : '100% మన మద్దతుదారుడిగా నమోదు చేయడానికి ట్యాప్ చేయండి'}
                        >
                          <Star className={`w-3.5 h-3.5 ${isOurs ? 'text-white fill-white' : 'text-amber-400'}`} />
                          <span className="truncate">{isOurs ? (language === 'te' ? '⭐ మనవాళ్లే (100%)' : '⭐ Ours (100%)') : (language === 'te' ? '⭐ మనవాళ్లేనా?' : '+ Mark Ours')}</span>
                        </button>

                        {/* 2. Quick Switch for VOTED (ఓటేశారు) */}
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleToggleVoted(v.s);
                          }}
                          className={`py-2 px-2.5 rounded-xl text-xs font-black flex items-center justify-center gap-1.5 transition-all active:scale-95 shadow-sm border ${
                            isVoted
                              ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white border-emerald-400 ring-2 ring-emerald-400/40 shadow-emerald-950/50'
                              : 'bg-slate-950 hover:bg-slate-800 text-slate-300 border-slate-700 hover:border-emerald-500/60'
                          }`}
                          title={isVoted ? 'ఓటేశారు (ట్యాప్ చేస్తే అన్‌మార్క్ అవుతుంది)' : 'ఓటు వేశారు అని మార్క్ చేయండి'}
                        >
                          <CheckCircle2 className={`w-3.5 h-3.5 ${isVoted ? 'text-white fill-emerald-800' : 'text-emerald-400'}`} />
                          <span className="truncate">{isVoted ? (language === 'te' ? '✅ ఓటేశారు (Voted)' : '✅ Voted') : (language === 'te' ? '🗳️ ఓటు వేయలేదు' : 'Mark Voted')}</span>
                        </button>
                      </div>

                      {/* Row 2: ✈️ ఊర్లో లేరు & 💀 మరణించారు */}
                      <div className="grid grid-cols-2 gap-2">
                        {/* 3. Quick Switch for OUT OF CITY (ఊర్లో లేరు) */}
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleToggleOutOfCity(v.s);
                          }}
                          className={`py-1.5 px-2.5 rounded-xl text-xs font-black flex items-center justify-center gap-1.5 transition-all active:scale-95 shadow-sm border ${
                            isOutOfCity
                              ? 'bg-gradient-to-r from-indigo-600 to-blue-700 text-white border-indigo-400 ring-2 ring-indigo-400/40 shadow-indigo-950/50'
                              : 'bg-slate-950 hover:bg-slate-800 text-indigo-300 border-slate-700 hover:border-indigo-500/60'
                          }`}
                          title={isOutOfCity ? 'ఊర్లో లేరు (ట్యాప్ చేస్తే అన్‌మార్క్ అవుతుంది)' : 'ఊర్లో లేరు / వలస వెళ్లినట్లు మార్క్ చేయడానికి ట్యాప్ చేయండి'}
                        >
                          <span className="text-sm">✈️</span>
                          <span className="truncate">{isOutOfCity ? (language === 'te' ? '✈️ ఊర్లో లేరు (Away)' : '✈️ Out of City') : (language === 'te' ? '✈️ ఊర్లో లేరు' : '+ Out of City')}</span>
                        </button>

                        {/* 4. Quick Switch for DECEASED (మరణించారు) */}
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleToggleDeceased(v.s);
                          }}
                          className={`py-1.5 px-2.5 rounded-xl text-xs font-black flex items-center justify-center gap-1.5 transition-all active:scale-95 shadow-sm border ${
                            isDeceased
                              ? 'bg-gradient-to-r from-slate-700 to-slate-800 text-white border-slate-400 ring-2 ring-slate-400/40 shadow-slate-950/50'
                              : 'bg-slate-950 hover:bg-slate-800 text-slate-400 border-slate-700 hover:border-slate-500/60'
                          }`}
                          title={isDeceased ? 'మరణించారు (ట్యాప్ చేస్తే అన్‌మార్క్ అవుతుంది)' : 'మరణించినట్లు మార్క్ చేయడానికి ట్యాప్ చేయండి (బోగస్ ఓటింగ్ ఛాలెంజ్)'}
                        >
                          <span className="text-sm">💀</span>
                          <span className="truncate">{isDeceased ? (language === 'te' ? '💀 మరణించారు (Dead)' : '💀 Deceased') : (language === 'te' ? '💀 మరణించారు' : '+ Deceased')}</span>
                        </button>
                      </div>
                    </div>
                  );
                })()}

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
                          ? `నమస్కారం ${v.n} గారు, ${boothInfo.local_body || 'పురపాలక సంఘం'} ${boothInfo.ward_no ? `${boothInfo.ward_no}వ వార్డు` : ''} ఎన్నికల ఓటర్ సమాచారం కొరకు సంప్రదిస్తున్నాము. మీ వార్డు ఓటరు క్రమ సంఖ్య: #${v.s}, శాసనసభ బూత్: Part #${v.ac_part || ''}. దయచేసి మీ ఓటు హక్కును వినియోగించుకోండి! 🗳️`
                          : `నమస్కారం ${v.n} గారు, పిఠాపురం బూత్ #${boothInfo.part_no} ఓటర్ సమాచారం కొరకు సంప్రదిస్తున్నాము. మీ ఓటరు క్రమ సంఖ్య: #${v.s}, పోలింగ్ బూత్: ${boothInfo.clean_village}. దయచేసి మీ ఓటు హక్కును వినియోగించుకోండి! 🗳️`
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
                      href={`sms:${phone}?body=${encodeURIComponent(`నమస్కారం ${v.n} గారు, పిఠాపురం నియోజకవర్గం బూత్ #${boothInfo.part_no} ఓటరు క్రమ సంఖ్య #${v.s}. దయచేసి మీ ఓటు హక్కును వినియోగించుకోండి.`)}`}
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
                      prof.survey_status === 'deceased'
                        ? 'bg-slate-800 border-slate-700 text-slate-300 font-extrabold'
                        : prof.survey_status === 'out_of_city'
                          ? 'bg-indigo-950 border-indigo-500/50 text-indigo-300 font-extrabold'
                          : prof.survey_status
                            ? 'bg-amber-500/20 border-amber-500/40 text-amber-300 font-extrabold'
                            : 'bg-slate-800 hover:bg-slate-700 text-slate-400 border-slate-700'
                    }`}
                  >
                    <span>
                      {prof.survey_status === 'deceased'
                        ? (language === 'te' ? '💀 మరణించారు' : '💀 DECEASED')
                        : prof.survey_status === 'out_of_city'
                          ? (language === 'te' ? '✈️ ఊర్లో లేరు' : '✈️ OUT OF CITY')
                          : prof.survey_status
                            ? prof.survey_status.toUpperCase()
                            : t.pollStatus}
                    </span>
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

      {/* Load More Button (+100 Voters) */}
      {displayedVoters.length < filteredVoters.length && (
        <div className="space-y-2 pt-1">
          <button
            onClick={() => setVisibleCount(prev => prev + LOAD_MORE_STEP)}
            className="w-full py-3.5 bg-gradient-to-r from-amber-500 via-amber-400 to-amber-500 hover:from-amber-400 hover:to-amber-300 text-slate-950 font-black rounded-2xl border border-amber-300 text-xs shadow-lg active:scale-95 transition-all flex items-center justify-center gap-1.5"
          >
            <span>↓ {language === 'te' ? 'ఇంకా 100 మంది ఓటర్లను చూడండి' : 'Load Next 100 Electors'}</span>
            <span className="font-mono text-[11px] opacity-90">
              (+{Math.min(LOAD_MORE_STEP, filteredVoters.length - displayedVoters.length)} • {filteredVoters.length - displayedVoters.length} {language === 'te' ? 'మిగిలి ఉన్నారు' : 'remaining'})
            </span>
          </button>

          {filteredVoters.length - displayedVoters.length > LOAD_MORE_STEP && (
            <button
              onClick={() => setVisibleCount(filteredVoters.length)}
              className="w-full py-2 bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white font-bold rounded-xl border border-slate-800 text-[10.5px] transition-all flex items-center justify-center gap-1"
            >
              <span>⚡ {language === 'te' ? `మొత్తం ${filteredVoters.length} మంది ఓటర్లను ఒకేసారి చూపించు (Load All)` : `Load All ${filteredVoters.length} Electors`}</span>
            </button>
          )}
        </div>
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
                setVisibleCount(INITIAL_VISIBLE_COUNT);
              }}
              className="mt-2 px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black rounded-xl text-xs transition-transform active:scale-95 shadow-md"
            >
              {language === 'te' ? 'అన్ని ఫిల్టర్‌లను తీసివేయండి (Show All Voters)' : 'Reset All Filters'}
            </button>
          )}
        </div>
      )}
      {/* Floating Selection Toolbar for Multi-Print (Requirement 5) */}
      {isSelectionMode && (
        <div className="fixed bottom-14 left-0 right-0 z-40 p-2.5 bg-slate-900/95 backdrop-blur-md border-t-2 border-amber-500/80 shadow-2xl flex items-center justify-between gap-2 max-w-lg mx-auto animate-in slide-in-from-bottom-3 duration-200">
          <div className="flex items-center gap-1.5 min-w-0">
            <span className="w-7 h-7 rounded-lg bg-amber-500/20 text-amber-300 font-mono font-black text-xs flex items-center justify-center border border-amber-500/40 shrink-0">
              {selectedVoterSnos.size}
            </span>
            <span className="text-[11px] font-bold text-white truncate">
              {language === 'te' ? 'ఎంపికయ్యారు' : 'Selected'}
            </span>
          </div>

          <div className="flex items-center gap-1 shrink-0">
            <button
              type="button"
              onClick={handleSelectAllDisplayed}
              className="px-2 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-[10px] font-bold border border-slate-700 active:scale-95"
            >
              {language === 'te' ? 'అన్నీ' : 'All'}
            </button>
            <button
              type="button"
              onClick={() => setSelectedVoterSnos(new Set())}
              className="px-2 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-[10px] font-bold border border-slate-700 active:scale-95"
            >
              {language === 'te' ? 'క్లియర్' : 'Clear'}
            </button>
            <button
              type="button"
              onClick={() => handlePrintSelected('slips')}
              disabled={selectedVoterSnos.size === 0}
              className="px-2.5 py-1.5 rounded-xl bg-gradient-to-r from-red-600 via-amber-600 to-red-600 hover:from-red-500 hover:to-amber-500 text-white font-black text-[11px] flex items-center gap-1 shadow-md disabled:opacity-40 disabled:cursor-not-allowed active:scale-95 transition-all cursor-pointer"
              title="ఎంపిక చేసిన ఓటర్ల చీటీలు (Slips) ప్రింట్ చేయండి"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>{language === 'te' ? `చీటీలు (${selectedVoterSnos.size})` : `Slips (${selectedVoterSnos.size})`}</span>
            </button>
            <button
              type="button"
              onClick={() => handlePrintSelected('cards')}
              disabled={selectedVoterSnos.size === 0}
              className="px-2.5 py-1.5 rounded-xl bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 hover:from-amber-400 hover:to-orange-400 text-slate-950 font-black text-[11px] flex items-center gap-1 shadow-md disabled:opacity-40 disabled:cursor-not-allowed active:scale-95 transition-all cursor-pointer"
              title="ఎంపిక చేసిన ఓటర్ల అధికారిక ఫొటో కార్డులు (Photo Cards) ప్రింట్ చేయండి"
            >
              <Layers className="w-3.5 h-3.5" />
              <span>{language === 'te' ? `కార్డులు (${selectedVoterSnos.size})` : `Cards (${selectedVoterSnos.size})`}</span>
            </button>
            <button
              type="button"
              onClick={() => handlePrintSelected('table')}
              disabled={selectedVoterSnos.size === 0}
              className="px-2.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-teal-300 font-black text-[11px] flex items-center gap-1 border border-teal-500/30 disabled:opacity-40 disabled:cursor-not-allowed active:scale-95 transition-all cursor-pointer"
              title="ఎంపిక చేసిన ఓటర్ల సాధారణ జాబితా (Roster Table) ప్రింట్ చేయండి"
            >
              <Users className="w-3.5 h-3.5 text-teal-400" />
              <span>{language === 'te' ? `జాబితా (${selectedVoterSnos.size})` : `Roster (${selectedVoterSnos.size})`}</span>
            </button>

            {/* Export Selected to Excel with Phone Numbers */}
            <button
              type="button"
              onClick={handleExportSelectedToExcel}
              disabled={selectedVoterSnos.size === 0}
              className="px-2.5 py-1.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-black text-[11px] flex items-center gap-1 shadow-md disabled:opacity-40 disabled:cursor-not-allowed active:scale-95 transition-all cursor-pointer"
              title={language === 'te' ? 'ఎంపిక చేసిన ఓటర్లను ఫోన్ నంబర్లతో సహా ఎక్సెల్ ఫైల్ (CSV) డౌన్‌లోడ్ చేయండి' : 'Export selected electors with phone numbers to Excel CSV'}
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-200" />
              <span>{language === 'te' ? `📥 ఎక్సెల్ (${selectedVoterSnos.size})` : `📥 Excel (${selectedVoterSnos.size})`}</span>
            </button>
            {onOpenBulkAssign && (
              <button
                type="button"
                onClick={() => onOpenBulkAssign(Array.from(selectedVoterSnos))}
                disabled={selectedVoterSnos.size === 0}
                className="px-2.5 py-1.5 rounded-xl bg-teal-600 hover:bg-teal-500 text-white font-black text-[11px] flex items-center gap-1 shadow-md disabled:opacity-40 disabled:cursor-not-allowed active:scale-95 transition-all cursor-pointer"
                title="ఎంపిక చేసిన ఓటర్లను నాయకుడికి కేటాయించండి"
              >
                <Users className="w-3.5 h-3.5" />
                <span>{language === 'te' ? `కేటాయింపు (${selectedVoterSnos.size})` : `Assign (${selectedVoterSnos.size})`}</span>
              </button>
            )}
            <button
              type="button"
              onClick={() => {
                setIsSelectionMode(false);
                setSelectedVoterSnos(new Set());
              }}
              className="p-1.5 rounded-lg bg-slate-800 text-slate-400 hover:text-white"
              title="Cancel Selection Mode"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
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

      {/* Speed Dial Calling Queue Modal (Feature 1) */}
      {isSpeedDialOpen && (
        <SpeedDialModal
          voters={voters}
          profiles={profiles}
          boothInfo={boothInfo}
          language={language}
          onQuickToggleVoted={handleToggleVoted}
          onOpenPhoneEditor={onOpenPhoneEditor}
          onClose={() => setIsSpeedDialOpen(false)}
        />
      )}

      {/* Hourly Turnout Recorder Modal (Feature 2) */}
      {isHourlyTurnoutOpen && (
        <HourlyTurnoutModal
          boothInfo={boothInfo}
          voters={voters}
          profiles={profiles}
          language={language}
          onClose={() => setIsHourlyTurnoutOpen(false)}
        />
      )}

      {/* Export Surnames and Serial Numbers Modal */}
      {isExportSurnamesModalOpen && (
        <ExportSurnamesModal
          isOpen={isExportSurnamesModalOpen}
          boothInfo={boothInfo}
          clans={surnameGroups}
          profiles={profiles}
          initialClanId={exportInitialClanId}
          language={language}
          onClose={() => setIsExportSurnamesModalOpen(false)}
        />
      )}

      {/* Export to Excel Modal (Exact 9 Fields & Order by Surname) */}
      {isExportExcelModalOpen && (
        <ExportExcelModal
          isOpen={isExportExcelModalOpen}
          voters={exportExcelScope === 'selected' ? voters.filter(v => selectedVoterSnos.has(v.s)) : filteredVoters}
          profiles={profiles}
          boothInfo={boothInfo}
          scopeTitle={
            language === 'te'
              ? (exportExcelScope === 'selected'
                  ? `ఎంపిక చేసిన ${selectedVoterSnos.size} మంది ఓటర్లు`
                  : `ఫిల్టర్ చేసిన ${filteredVoters.length} మంది ఓటర్లు`)
              : (exportExcelScope === 'selected'
                  ? `Selected ${selectedVoterSnos.size} Electors`
                  : `Filtered ${filteredVoters.length} Electors`)
          }
          filePrefix={exportExcelScope === 'selected' ? `Selected_${selectedVoterSnos.size}` : 'Filtered'}
          language={language}
          onClose={() => setIsExportExcelModalOpen(false)}
        />
      )}

      {/* WhatsApp Slip & Ward Candidate Config Modal */}
      <SlipConfigModal
        isOpen={isSlipConfigOpen}
        onClose={() => setIsSlipConfigOpen(false)}
        boothInfo={boothInfo}
        voters={voters}
        language={language}
      />
    </div>
  );
};
