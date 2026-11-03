import React, { useState, useMemo, useEffect, useRef } from 'react';
import {
  Table,
  Search,
  Download,
  Maximize2,
  Phone,
  MessageSquare,
  Check,
  X,
  ArrowUpDown,
  Star,
  CheckCircle2,
  Clock,
  RotateCcw,
  Copy,
  Volume2,
  ExternalLink,
  ChevronLeft,
  ChevronRight,
  Eye,
  Edit3,
  Sparkles,
  Printer
} from 'lucide-react';
import { MobileVoter, BoothInfo, VoterSurveyStatus, VoterCampaignProfile } from '../types';
import { Language, translations } from '../utils/i18n';
import { resolvePhotoUrl } from '../utils/photoResolver';
import { matchesPhoneticSearch } from '../utils/phoneticSearch';

interface VotersExcelGridProps {
  voters: MobileVoter[];
  boothInfo: BoothInfo;
  profiles: Record<number, VoterCampaignProfile>;
  language?: Language;
  onUpdateCustomAlias: (serialNo: number, alias: string) => void;
  onUpdateCustomPhone?: (serialNo: number, phone: string) => void;
  onUpdateSupportPct?: (serialNo: number, pct: number) => void;
  onUpdateSurveyMark: (serialNo: number, status: VoterSurveyStatus | null) => void;
  onQuickToggleOurs?: (serialNo: number) => void;
  onQuickToggleVoted?: (serialNo: number) => void;
  onOpenSlip: (voter: MobileVoter) => void;
  onOpenPhoneEditor: (voter: MobileVoter) => void;
  onOpenSupportPicker: (title: string, currentPct: number, currentNotes?: string, voterSno?: number) => void;
  onOpenLogVisit: (voter: MobileVoter) => void;
  onOpenGroupPrint?: (title: string, subtitle: string, voters: MobileVoter[], initialLayout?: 'slips' | 'table') => void;
  onSwitchToMobileView?: () => void;
}

type SortField = 'sno' | 'name' | 'hno' | 'alias' | 'support' | 'voted';
type SortOrder = 'asc' | 'desc';
type QuickFilter = 'all' | 'with_alias' | 'ours' | 'swing' | 'voted' | 'pending' | 'with_phone';

export const VotersExcelGrid: React.FC<VotersExcelGridProps> = ({
  voters,
  boothInfo,
  profiles,
  language = 'te',
  onUpdateCustomAlias,
  onUpdateCustomPhone,
  onUpdateSupportPct,
  onUpdateSurveyMark,
  onQuickToggleOurs,
  onQuickToggleVoted,
  onOpenSlip,
  onOpenPhoneEditor,
  onOpenSupportPicker,
  onOpenLogVisit,
  onOpenGroupPrint,
  onSwitchToMobileView
}) => {
  const t = translations[language];

  // Fullscreen state
  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    const handler = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', handler);
    return () => document.removeEventListener('fullscreenchange', handler);
  }, []);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().then(() => setIsFullscreen(true)).catch(() => {});
    } else {
      document.exitFullscreen().then(() => setIsFullscreen(false)).catch(() => {});
    }
  };

  // Search & Filter State
  const [searchQuery, setSearchQuery] = useState('');
  const [isPhoneticEnabled, setIsPhoneticEnabled] = useState(true);
  const [quickFilter, setQuickFilter] = useState<QuickFilter>('all');
  const [sortField, setSortField] = useState<SortField>('sno');
  const [sortOrder, setSortOrder] = useState<SortOrder>('asc');

  // Pagination
  const [pageSize, setPageSize] = useState<number>(100);
  const [currentPage, setCurrentPage] = useState<number>(1);

  // Local state for inline alias input (sno -> value)
  const [aliasDrafts, setAliasDrafts] = useState<Record<number, string>>({});
  const [savedNoticeSno, setSavedNoticeSno] = useState<number | null>(null);

  // Lightbox Modal for Card Zoom
  const [zoomVoter, setZoomVoter] = useState<MobileVoter | null>(null);
  const [copiedEpic, setCopiedEpic] = useState<string | null>(null);

  // Sync drafts when profiles update
  useEffect(() => {
    const drafts: Record<number, string> = {};
    voters.forEach((v) => {
      if (profiles[v.s]?.customAlias !== undefined) {
        drafts[v.s] = profiles[v.s]?.customAlias || '';
      }
    });
    setAliasDrafts(drafts);
  }, [profiles, voters]);

  // Handle Alias Change & Save
  const handleAliasChange = (sno: number, val: string) => {
    setAliasDrafts((prev) => ({ ...prev, [sno]: val }));
  };

  const handleAliasBlur = (sno: number) => {
    const currentVal = (aliasDrafts[sno] ?? profiles[sno]?.customAlias ?? '').trim();
    const existingVal = (profiles[sno]?.customAlias ?? '').trim();

    if (currentVal !== existingVal) {
      onUpdateCustomAlias(sno, currentVal);
      setSavedNoticeSno(sno);
      setTimeout(() => setSavedNoticeSno((prev) => (prev === sno ? null : prev)), 2000);
    }
  };

  const handleAliasKeyDown = (e: React.KeyboardEvent<HTMLInputElement>, sno: number) => {
    if (e.key === 'Enter') {
      (e.target as HTMLInputElement).blur();
    }
  };

  // Copy EPIC ID
  const handleCopyEpic = (epic: string) => {
    navigator.clipboard.writeText(epic);
    setCopiedEpic(epic);
    setTimeout(() => setCopiedEpic(null), 1500);
  };

  // Send WhatsApp Slip
  const handleSendWhatsAppSlip = (v: MobileVoter) => {
    const prof = profiles[v.s] || {};
    const phone = prof.customPhone || v.k_m || '';
    const cleanPhone = phone.replace(/[^0-9]/g, '');

    const text = `🗳️ *పిఠాపురం నియోజకవర్గం (AC #37)*
*ఓటరు సమాచార స్లిప్పు (VOTER SLIP)*

నమస్తే *${v.n}* గారు,
${prof.customAlias ? `(మన రిఫరెన్స్: ${prof.customAlias})\n` : ''}
మీ ఓటర్ సమాచారం:
🔢 *క్రమ సంఖ్య (S.No):* #${v.s}
🆔 *ఓటర్ ఐడీ (EPIC):* ${v.id}
🏠 *ఇంటి నెం:* ${v.hn || '-'}
🏛️ *పోలింగ్ కేంద్రం:* ${boothInfo.ps_address}
⏰ *పోలింగ్ సమయం:* ఉదయం 7:00 నుండి సాయంత్రం 5:00 వరకు

_దయచేసి వెంటనే మీ ఓటు హక్కును వినియోగించుకోండి! ప్రతి ఓటూ అమూల్యం._ 🗳️`;

    const targetUrl = cleanPhone
      ? `https://wa.me/${cleanPhone.startsWith('91') ? cleanPhone : '91' + cleanPhone}?text=${encodeURIComponent(text)}`
      : `https://wa.me/?text=${encodeURIComponent(text)}`;
    window.open(targetUrl, '_blank');
  };

  // Filter & Search Logic (Dual Match: Parsed Name OR Custom Alias OR S.No/EPIC/Phone)
  const filteredVoters = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();

    return voters.filter((v) => {
      const prof = profiles[v.s] || {};
      const phone = prof.customPhone || v.k_m || '';
      const customAlias = prof.customAlias || aliasDrafts[v.s] || '';

      // 1. Quick Filters
      if (quickFilter === 'with_alias') {
        if (!customAlias.trim()) return false;
      } else if (quickFilter === 'ours') {
        const isOurs = (prof.supportPct === 100) || prof.survey_status === 'supporter';
        if (!isOurs) return false;
      } else if (quickFilter === 'swing') {
        const pct = prof.supportPct ?? 50;
        if (pct !== 40 && pct !== 50) return false;
      } else if (quickFilter === 'voted') {
        if (prof.survey_status !== 'voted') return false;
      } else if (quickFilter === 'pending') {
        if (prof.survey_status === 'voted') return false;
      } else if (quickFilter === 'with_phone') {
        if (!phone) return false;
      }

      // 2. Search Query (Matches Parsed Name OR Custom Alias OR S.No OR EPIC OR H.No OR Phone)
      if (q) {
        // Direct serial number match
        if (/^\d+$/.test(q) && String(v.s) === q) {
          return true;
        }

        // Check if phonetic matching is active
        if (isPhoneticEnabled) {
          if (!matchesPhoneticSearch(q, v, phone, prof.influencerName, customAlias)) {
            return false;
          }
        } else {
          const snoMatch = String(v.s) === q;
          const nMatch = v.n.toLowerCase().includes(q);
          const rMatch = v.r.toLowerCase().includes(q);
          const idMatch = v.id.toLowerCase().includes(q);
          const hnMatch = v.hn.toLowerCase().includes(q);
          const pMatch = phone && phone.includes(q);
          const aliasMatch = customAlias && customAlias.toLowerCase().includes(q);
          if (!snoMatch && !nMatch && !rMatch && !idMatch && !hnMatch && !pMatch && !aliasMatch) {
            return false;
          }
        }
      }

      return true;
    });
  }, [voters, profiles, searchQuery, isPhoneticEnabled, quickFilter, aliasDrafts]);

  // Sorting
  const sortedVoters = useMemo(() => {
    return [...filteredVoters].sort((a, b) => {
      let comp = 0;
      const profA = profiles[a.s] || {};
      const profB = profiles[b.s] || {};

      switch (sortField) {
        case 'sno':
          comp = a.s - b.s;
          break;
        case 'name':
          comp = a.n.localeCompare(b.n);
          break;
        case 'hno':
          comp = a.hn.localeCompare(b.hn, undefined, { numeric: true });
          break;
        case 'alias': {
          const aliasA = (profA.customAlias || aliasDrafts[a.s] || '').toLowerCase();
          const aliasB = (profB.customAlias || aliasDrafts[b.s] || '').toLowerCase();
          comp = aliasA.localeCompare(aliasB);
          break;
        }
        case 'support': {
          const pctA = profA.supportPct ?? 50;
          const pctB = profB.supportPct ?? 50;
          comp = pctB - pctA;
          break;
        }
        case 'voted': {
          const vA = profA.survey_status === 'voted' ? 1 : 0;
          const vB = profB.survey_status === 'voted' ? 1 : 0;
          comp = vB - vA;
          break;
        }
        default:
          comp = a.s - b.s;
      }
      return sortOrder === 'asc' ? comp : -comp;
    });
  }, [filteredVoters, sortField, sortOrder, profiles, aliasDrafts]);

  // Pagination Slice
  const totalPages = Math.ceil(sortedVoters.length / pageSize) || 1;
  const paginatedVoters = useMemo(() => {
    if (pageSize >= 9999) return sortedVoters;
    const start = (currentPage - 1) * pageSize;
    return sortedVoters.slice(start, start + pageSize);
  }, [sortedVoters, currentPage, pageSize]);

  // Toggle Sort
  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('asc');
    }
  };

  // Export to Real Excel CSV with UTF-8 BOM
  const handleExportExcelCSV = () => {
    const headers = [
      'S.No (క్రమ సంఖ్య)',
      'EPIC ID (ఓటర్ ఐడీ)',
      'Parsed Voter Name (ఓటరు పేరు - పార్స్ చేయబడింది)',
      'Parsed Relative (సంబంధీకుడు)',
      'House No (ఇంటి నెం)',
      'Age (వయస్సు)',
      'Gender (లింగం)',
      'Section / Street (వీధి / ప్రాంతం)',
      'My Custom Input / Alias (నా ఇన్పుట్ / సెర్చ్ మారుపేరు)',
      'Custom Phone (మొబైల్ నంబర్)',
      'Support Leaning (మద్దతు %)',
      'Polling Status (ఓటింగ్ స్థితి)',
      'Influencer (నాయకుడు / ఇన్చార్జ్)',
      'Notes (గమనికలు)'
    ];

    const rows = sortedVoters.map((v) => {
      const prof = profiles[v.s] || {};
      const customAlias = prof.customAlias || aliasDrafts[v.s] || '';
      const phone = prof.customPhone || v.k_m || '';
      const support = prof.supportPct !== undefined ? `${prof.supportPct}%` : '50% (తటస్థం)';
      const status = prof.survey_status === 'voted' ? 'ఓటేశారు (Voted)' : 'ఓటు వేయలేదు (Pending)';

      return [
        v.s,
        v.id,
        `"${(v.n || '').replace(/"/g, '""')}"`,
        `"${(v.r || '').replace(/"/g, '""')}"`,
        `"${(v.hn || '').replace(/"/g, '""')}"`,
        v.a,
        v.g === 'M' ? 'పురుషుడు (M)' : 'స్త్రీ (F)',
        `"${(v.sec || '').replace(/"/g, '""')}"`,
        `"${customAlias.replace(/"/g, '""')}"`,
        phone ? `="${phone}"` : '',
        support,
        status,
        `"${(prof.influencerName || '').replace(/"/g, '""')}"`,
        `"${(prof.notes || '').replace(/"/g, '""')}"`
      ];
    });

    const csvContent = '\uFEFF' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\r\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `Pithapuram_Booth_${boothInfo.part_no}_Voters_Excel_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // Stats Counters
  const aliasCount = useMemo(() => {
    return Object.values(profiles).filter((p) => p?.customAlias?.trim()).length;
  }, [profiles]);

  return (
    <div className="w-full bg-slate-950 text-slate-100 rounded-2xl border border-slate-800 shadow-2xl flex flex-col overflow-hidden text-xs">
      {/* =========================================================================
          EXCEL SPREADSHEET TOOLBAR & HEADER
          ========================================================================= */}
      <div className="p-3 sm:p-4 bg-slate-900/90 border-b border-slate-800 space-y-3">
        {/* Row 1: Brand, Booth Badge & Actions */}
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-emerald-600/20 border border-emerald-500/50 flex items-center justify-center text-emerald-400 shrink-0 shadow-inner">
              <Table className="w-5 h-5 text-emerald-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm sm:text-base font-black text-white tracking-tight flex items-center gap-1.5">
                  <span>📊 ఓటర్ల డేటాషీట్ గ్రిడ్</span>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-950 border border-emerald-500/40 text-emerald-300 font-bold uppercase tracking-wider">
                    Excel View
                  </span>
                </h2>
              </div>
              <p className="text-[11px] text-slate-400">
                కార్డు చిత్రం, పార్స్ చేయబడిన డేటా & మీ వ్యక్తిగత ఇన్పుట్ / సెర్చ్ అలియాస్ ఎడిటర్
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {/* Switch to Mobile View button */}
            {onSwitchToMobileView && (
              <button
                type="button"
                onClick={onSwitchToMobileView}
                className="px-2.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-bold text-xs flex items-center gap-1.5 shadow-sm active:scale-95 transition-all cursor-pointer"
                title={language === 'te' ? 'సాధారణ మొబైల్ కార్డుల వ్యూకు మారండి' : 'Switch back to Mobile View'}
              >
                <span>📱</span>
                <span>{language === 'te' ? 'మొబైల్ వ్యూ' : 'Mobile View'}</span>
              </button>
            )}

            {/* Toggle Fullscreen button */}
            <button
              type="button"
              onClick={toggleFullscreen}
              className="px-2.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-cyan-300 border border-slate-700 font-bold text-xs flex items-center gap-1.5 shadow-sm active:scale-95 transition-all cursor-pointer"
              title={isFullscreen ? 'Exit Fullscreen' : 'Enter Fullscreen'}
            >
              <Maximize2 className="w-3.5 h-3.5 text-cyan-400" />
              <span>{isFullscreen ? (language === 'te' ? 'సాధారణ స్క్రీన్' : 'Exit Fullscreen') : (language === 'te' ? 'ఫుల్‌స్క్రీన్' : 'Fullscreen')}</span>
            </button>

            {/* Export CSV Button */}
            <button
              onClick={handleExportExcelCSV}
              className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-1.5 shadow-md shadow-emerald-950/40 active:scale-95 transition-all cursor-pointer"
              title="Download full data as Microsoft Excel CSV format"
            >
              <Download className="w-3.5 h-3.5" />
              <span>ఎక్సెల్ CSV</span>
            </button>

            {onOpenGroupPrint && (
              <button
                onClick={() =>
                  onOpenGroupPrint(
                    `బూత్ #${boothInfo.part_no} ఓటర్ల సమగ్ర జాబితా`,
                    `మొత్తం ${filteredVoters.length} మంది ఓటర్లు`,
                    filteredVoters,
                    'table'
                  )
                }
                className="px-2.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-amber-300 border border-slate-700 font-bold text-xs flex items-center gap-1 shadow-sm active:scale-95 transition-all cursor-pointer"
                title="Print Excel Table"
              >
                <Printer className="w-3.5 h-3.5 text-amber-400" />
                <span>ప్రింట్</span>
              </button>
            )}
          </div>
        </div>

        {/* Row 2: Dual Search Bar with Sound-Alike Engine */}
        <div className="flex items-center gap-2 flex-wrap">
          <div className="relative flex-1 min-w-[240px]">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-amber-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
              placeholder={
                language === 'te'
                  ? '🔍 పార్స్ చేసిన పేరు (kannayya) లేదా మీ ఇన్పుట్ (kanniaha) టైప్ చేయండి...'
                  : '🔍 Search parsed name (kannayya) OR your input (kanniaha)...'
              }
              className="w-full pl-9 pr-8 py-2 bg-slate-950 border border-slate-700 focus:border-emerald-400 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-emerald-400/50 shadow-inner font-sans"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white p-0.5 rounded-full"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Phonetic Search Toggle */}
          <button
            onClick={() => setIsPhoneticEnabled(!isPhoneticEnabled)}
            className={`px-2.5 py-2 rounded-xl text-xs font-bold border transition-all flex items-center gap-1.5 cursor-pointer ${
              isPhoneticEnabled
                ? 'bg-amber-500/20 border-amber-500/60 text-amber-300 shadow-sm'
                : 'bg-slate-950 border-slate-800 text-slate-500 hover:text-slate-300'
            }`}
            title="Phonetic Sound-alike Search Engine (Handles transliterations and typos)"
          >
            <Volume2 className="w-3.5 h-3.5" />
            <span className="font-mono text-[11px] font-bold">{isPhoneticEnabled ? 'ఫోనెటిక్ ON' : 'OFF'}</span>
          </button>

          {/* Page Size Selector */}
          <div className="flex items-center gap-1 text-[11px] bg-slate-950 border border-slate-800 px-2.5 py-1 rounded-xl">
            <span className="text-slate-400 font-bold">పేజీకి:</span>
            {[50, 100, 250, 9999].map((size) => (
              <button
                key={size}
                onClick={() => {
                  setPageSize(size);
                  setCurrentPage(1);
                }}
                className={`px-1.5 py-0.5 rounded font-mono font-bold transition-all ${
                  pageSize === size
                    ? 'bg-emerald-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                {size === 9999 ? 'అన్నీ' : size}
              </button>
            ))}
          </div>
        </div>

        {/* Row 3: Quick Filter Chips & Stats */}
        <div className="flex items-center justify-between gap-2 flex-wrap pt-1 border-t border-slate-800/80">
          <div className="flex items-center gap-1.5 flex-wrap text-[11px]">
            <span className="text-slate-400 font-bold mr-1">ఫిల్టర్:</span>

            <button
              onClick={() => {
                setQuickFilter('all');
                setCurrentPage(1);
              }}
              className={`px-2.5 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                quickFilter === 'all'
                  ? 'bg-amber-500 text-slate-950 font-black shadow-sm'
                  : 'bg-slate-950 text-slate-400 border border-slate-800 hover:text-white'
              }`}
            >
              అన్నీ ({voters.length})
            </button>

            <button
              onClick={() => {
                setQuickFilter('with_alias');
                setCurrentPage(1);
              }}
              className={`px-2.5 py-1 rounded-lg font-bold transition-all flex items-center gap-1 cursor-pointer ${
                quickFilter === 'with_alias'
                  ? 'bg-emerald-600 text-white font-black shadow-sm'
                  : 'bg-slate-950 text-emerald-300 border border-emerald-500/40 hover:bg-emerald-950/40'
              }`}
              title="Show only voters where you have entered your custom input/alias"
            >
              <Edit3 className="w-3 h-3" />
              <span>నా ఇన్పుట్స్ ఉన్నవి ({aliasCount})</span>
            </button>

            <button
              onClick={() => {
                setQuickFilter('ours');
                setCurrentPage(1);
              }}
              className={`px-2.5 py-1 rounded-lg font-bold transition-all flex items-center gap-1 cursor-pointer ${
                quickFilter === 'ours'
                  ? 'bg-gradient-to-r from-emerald-600 to-amber-600 text-white font-black shadow-sm'
                  : 'bg-slate-950 text-emerald-300 border border-emerald-500/30'
              }`}
            >
              <span>⭐ మనవాళ్లే</span>
            </button>

            <button
              onClick={() => {
                setQuickFilter('swing');
                setCurrentPage(1);
              }}
              className={`px-2.5 py-1 rounded-lg font-bold transition-all flex items-center gap-1 cursor-pointer ${
                quickFilter === 'swing'
                  ? 'bg-amber-600 text-slate-950 font-black shadow-sm'
                  : 'bg-slate-950 text-amber-300 border border-amber-500/30'
              }`}
            >
              <span>🎯 స్వింగ్</span>
            </button>

            <button
              onClick={() => {
                setQuickFilter('voted');
                setCurrentPage(1);
              }}
              className={`px-2.5 py-1 rounded-lg font-bold transition-all flex items-center gap-1 cursor-pointer ${
                quickFilter === 'voted'
                  ? 'bg-emerald-600 text-white font-black shadow-sm'
                  : 'bg-slate-950 text-emerald-400 border border-emerald-500/30'
              }`}
            >
              <span>✅ ఓటేశారు</span>
            </button>

            <button
              onClick={() => {
                setQuickFilter('pending');
                setCurrentPage(1);
              }}
              className={`px-2.5 py-1 rounded-lg font-bold transition-all flex items-center gap-1 cursor-pointer ${
                quickFilter === 'pending'
                  ? 'bg-amber-600 text-slate-950 font-black shadow-sm'
                  : 'bg-slate-950 text-amber-400 border border-amber-500/30'
              }`}
            >
              <span>⏳ పెండింగ్</span>
            </button>

            <button
              onClick={() => {
                setQuickFilter('with_phone');
                setCurrentPage(1);
              }}
              className={`px-2.5 py-1 rounded-lg font-bold transition-all flex items-center gap-1 cursor-pointer ${
                quickFilter === 'with_phone'
                  ? 'bg-blue-600 text-white font-black shadow-sm'
                  : 'bg-slate-950 text-blue-300 border border-blue-500/30'
              }`}
            >
              <span>📱 ఫోన్ ఉన్నవి</span>
            </button>
          </div>

          <div className="text-[11px] text-slate-400 font-mono">
            మొత్తం: <strong className="text-white font-bold">{voters.length}</strong> | చూపబడుతున్నవి:{' '}
            <strong className="text-amber-400 font-bold">{filteredVoters.length}</strong>
          </div>
        </div>
      </div>

      {/* =========================================================================
          THE EXCEL DATA SPREADSHEET TABLE
          ========================================================================= */}
      <div className="overflow-x-auto overflow-y-auto max-h-[calc(100vh-210px)] min-h-[500px] scrollbar-thin scrollbar-thumb-slate-700 select-text">
        <table className="w-full border-collapse text-left font-sans text-xs min-w-[1100px]">
          {/* Sticky Excel Table Headers */}
          <thead className="sticky top-0 z-20 bg-slate-900 border-b-2 border-emerald-500/60 shadow-md">
            <tr className="text-slate-300 font-black text-[11px] uppercase tracking-wider">
              {/* Col 1: Card Image */}
              <th className="py-2.5 px-3 border-r border-slate-800 w-[150px] shrink-0 text-center bg-slate-900/95">
                <div className="flex items-center justify-center gap-1 text-amber-400">
                  <Eye className="w-3.5 h-3.5" />
                  <span>ఓటర్ కార్డు</span>
                </div>
              </th>

              {/* Col 2: S.No & EPIC */}
              <th
                onClick={() => handleSort('sno')}
                className="py-2.5 px-3 border-r border-slate-800 w-[110px] cursor-pointer hover:bg-slate-800 transition-colors bg-slate-900/95"
              >
                <div className="flex items-center justify-between">
                  <span># క్రమం / EPIC</span>
                  <ArrowUpDown className="w-3 h-3 text-slate-500" />
                </div>
              </th>

              {/* Col 3: Parsed Voter Name */}
              <th
                onClick={() => handleSort('name')}
                className="py-2.5 px-3 border-r border-slate-800 min-w-[220px] cursor-pointer hover:bg-slate-800 transition-colors bg-slate-900/95"
              >
                <div className="flex items-center justify-between">
                  <span>ఓటరు పేరు (పార్స్ చేయబడింది)</span>
                  <ArrowUpDown className="w-3 h-3 text-slate-500" />
                </div>
              </th>

              {/* Col 4: Parsed Relative Name */}
              <th className="py-2.5 px-3 border-r border-slate-800 min-w-[180px] bg-slate-900/95">
                <span>సంబంధీకుడు (పార్స్ డేటా)</span>
              </th>

              {/* Col 5: H.No & Age/Gender */}
              <th
                onClick={() => handleSort('hno')}
                className="py-2.5 px-3 border-r border-slate-800 w-[140px] cursor-pointer hover:bg-slate-800 transition-colors bg-slate-900/95"
              >
                <div className="flex items-center justify-between">
                  <span>ఇంటి నెం / వయస్సు</span>
                  <ArrowUpDown className="w-3 h-3 text-slate-500" />
                </div>
              </th>

              {/* Col 6: My Custom Input / Search Alias (Highlighted!) */}
              <th
                onClick={() => handleSort('alias')}
                className="py-2.5 px-3 border-r-2 border-emerald-500/60 min-w-[220px] bg-emerald-950/60 text-emerald-200 cursor-pointer hover:bg-emerald-900/60 transition-colors"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <Edit3 className="w-3.5 h-3.5 text-amber-400" />
                    <span className="font-black text-amber-300">నా ఇన్పుట్ / సెర్చ్ అలియాస్</span>
                  </div>
                  <ArrowUpDown className="w-3 h-3 text-emerald-400" />
                </div>
              </th>

              {/* Col 7: Mobile Phone */}
              <th className="py-2.5 px-3 border-r border-slate-800 w-[150px] bg-slate-900/95">
                <span>ఫోన్ నంబర్</span>
              </th>

              {/* Col 8: Support Leaning */}
              <th
                onClick={() => handleSort('support')}
                className="py-2.5 px-3 border-r border-slate-800 w-[130px] cursor-pointer hover:bg-slate-800 transition-colors bg-slate-900/95"
              >
                <div className="flex items-center justify-between">
                  <span>మద్దతు స్థాయి</span>
                  <ArrowUpDown className="w-3 h-3 text-slate-500" />
                </div>
              </th>

              {/* Col 9: Polling Voted Status */}
              <th
                onClick={() => handleSort('voted')}
                className="py-2.5 px-3 border-r border-slate-800 w-[100px] text-center cursor-pointer hover:bg-slate-800 transition-colors bg-slate-900/95"
              >
                <div className="flex items-center justify-center gap-1">
                  <span>ఓటింగ్</span>
                  <ArrowUpDown className="w-3 h-3 text-slate-500" />
                </div>
              </th>

              {/* Col 10: Actions */}
              <th className="py-2.5 px-3 text-center w-[120px] bg-slate-900/95">
                <span>చర్యలు</span>
              </th>
            </tr>
          </thead>

          {/* Table Body (Excel Rows) */}
          <tbody className="divide-y divide-slate-800">
            {paginatedVoters.length === 0 ? (
              <tr>
                <td colSpan={10} className="py-12 text-center text-slate-400 bg-slate-950">
                  <div className="max-w-md mx-auto space-y-2">
                    <Search className="w-8 h-8 text-amber-400/60 mx-auto" />
                    <p className="font-bold text-white text-sm">
                      మీరు శోధించిన &quot;{searchQuery}&quot; కు సంబంధించి ఓటర్లు ఎవరూ కనబడలేదు.
                    </p>
                    <p className="text-xs text-slate-400">
                      పార్స్ చేసిన పేరు (kannayya) లేదా మీ ఇన్పుట్ (kanniaha) సరిగ్గా ఉందో లేదో చూడండి.
                    </p>
                    <button
                      onClick={() => setSearchQuery('')}
                      className="mt-2 px-3 py-1 bg-slate-800 hover:bg-slate-700 text-amber-300 rounded-lg text-xs font-bold"
                    >
                      సెర్చ్ క్లియర్ చేయండి
                    </button>
                  </div>
                </td>
              </tr>
            ) : (
              paginatedVoters.map((voter, index) => {
                const prof = profiles[voter.s] || {};
                const customAlias = aliasDrafts[voter.s] ?? prof.customAlias ?? '';
                const phone = prof.customPhone || voter.k_m || '';
                const isOurs = (prof.supportPct === 100) || prof.survey_status === 'supporter';
                const isVoted = prof.survey_status === 'voted';
                const cardPath = voter.card_url || voter.card;
                const photoPath = voter.photo_url || voter.photo;
                const isSavedJustNow = savedNoticeSno === voter.s;

                // Check if search matched parsed name vs custom input
                const qLower = searchQuery.toLowerCase().trim();
                const matchedParsedName = qLower && voter.n.toLowerCase().includes(qLower);
                const matchedCustomAlias = qLower && customAlias.toLowerCase().includes(qLower);

                return (
                  <tr
                    key={voter.s}
                    className={`transition-colors border-b border-slate-800/80 hover:bg-slate-850/80 ${
                      index % 2 === 0 ? 'bg-slate-950' : 'bg-slate-900/40'
                    } ${isOurs ? 'hover:bg-emerald-950/20' : ''}`}
                  >
                    {/* COL 1: Official Card Image Thumbnail */}
                    <td className="py-2 px-2.5 border-r border-slate-800 text-center align-middle">
                      <div className="relative group mx-auto w-[130px] rounded-lg overflow-hidden border border-slate-700 bg-slate-950 shadow-sm">
                        {cardPath ? (
                          <div
                            onClick={() => setZoomVoter(voter)}
                            className="cursor-pointer relative aspect-[16/9] overflow-hidden flex items-center justify-center bg-slate-900 group-hover:opacity-90 transition-opacity"
                            title="క్లిక్ చేసి పెద్ద కార్డ్ చూడండి (Click to Zoom Full Card)"
                          >
                            <img
                              src={resolvePhotoUrl(cardPath)}
                              alt={`Card ${voter.s}`}
                              className="w-full h-full object-cover object-top"
                              loading="lazy"
                              onError={(e) => {
                                const target = e.currentTarget as HTMLImageElement;
                                const cleanPath = cardPath.startsWith('/') ? cardPath : `/${cardPath}`;
                                const gitHubRaw = `https://raw.githubusercontent.com/gundradvp/pithapuram-voters-mobile/main/public${cleanPath}`;
                                if (!target.src.includes('raw.githubusercontent.com')) {
                                  target.src = gitHubRaw;
                                }
                              }}
                            />
                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white transition-opacity">
                              <Maximize2 className="w-4 h-4 text-amber-400" />
                            </div>
                            <span className="absolute bottom-0.5 right-0.5 text-[8px] font-mono font-bold bg-black/70 px-1 rounded text-amber-300">
                              #{voter.s}
                            </span>
                          </div>
                        ) : photoPath ? (
                          <div
                            onClick={() => setZoomVoter(voter)}
                            className="cursor-pointer flex items-center gap-1.5 p-1 bg-slate-900"
                            title="Click to Zoom"
                          >
                            <img
                              src={resolvePhotoUrl(photoPath)}
                              alt={voter.n}
                              className="w-7 h-9 object-cover rounded border border-slate-700"
                              onError={(e) => {
                                (e.currentTarget as HTMLElement).style.display = 'none';
                              }}
                            />
                            <span className="text-[9px] text-slate-400 font-mono">Photo #{voter.s}</span>
                          </div>
                        ) : (
                          <div className="py-2 text-[9px] text-slate-500 italic bg-slate-900/50">
                            కార్డు లేదు
                          </div>
                        )}
                      </div>
                    </td>

                    {/* COL 2: S.No & EPIC */}
                    <td className="py-2 px-3 border-r border-slate-800 align-middle">
                      <div className="space-y-1">
                        <div className="flex items-center gap-1">
                          <span className="font-mono font-black text-amber-400 text-xs bg-amber-950/60 border border-amber-500/30 px-1.5 py-0.5 rounded">
                            #{voter.s}
                          </span>
                        </div>
                        <div className="flex items-center gap-1">
                          <span className="font-mono font-bold text-slate-300 text-[10.5px]">
                            {voter.id}
                          </span>
                          <button
                            onClick={() => handleCopyEpic(voter.id)}
                            className="text-slate-500 hover:text-amber-400 transition-colors p-0.5"
                            title="Copy EPIC ID"
                          >
                            {copiedEpic === voter.id ? (
                              <Check className="w-3 h-3 text-emerald-400" />
                            ) : (
                              <Copy className="w-3 h-3" />
                            )}
                          </button>
                        </div>
                      </div>
                    </td>

                    {/* COL 3: Parsed Voter Name */}
                    <td className="py-2 px-3 border-r border-slate-800 align-middle">
                      <div className="space-y-0.5">
                        <div className="font-black text-white text-xs leading-tight">
                          {voter.n}
                        </div>
                        {matchedParsedName && (
                          <span className="inline-block px-1.5 py-0.2 rounded text-[8.5px] font-bold bg-amber-500/20 border border-amber-500/40 text-amber-300">
                            ✓ పేరు మ్యాచ్
                          </span>
                        )}
                        {voter.sec && (
                          <div className="text-[10px] text-slate-500 truncate max-w-[240px]">
                            {voter.sec}
                          </div>
                        )}
                      </div>
                    </td>

                    {/* COL 4: Parsed Relative Name */}
                    <td className="py-2 px-3 border-r border-slate-800 align-middle">
                      <div className="text-slate-300 text-xs leading-snug">
                        {voter.r || '-'}
                      </div>
                    </td>

                    {/* COL 5: H.No & Age/Gender */}
                    <td className="py-2 px-3 border-r border-slate-800 align-middle">
                      <div className="space-y-0.5">
                        <div className="font-mono font-bold text-white text-xs">
                          ఇంటి: <strong className="text-amber-300">{voter.hn || '-'}</strong>
                        </div>
                        <div className="text-[10px] text-slate-400 font-mono">
                          {voter.a} Yrs • {voter.g === 'M' ? 'పురుషుడు (M)' : 'స్త్రీ (F)'}
                        </div>
                      </div>
                    </td>

                    {/* COL 6: My Custom Input / Search Alias (CORE FEATURE) */}
                    <td className="py-1.5 px-2.5 border-r-2 border-emerald-500/60 bg-emerald-950/20 align-middle">
                      <div className="space-y-1">
                        <div className="relative">
                          <input
                            type="text"
                            value={customAlias}
                            onChange={(e) => handleAliasChange(voter.s, e.target.value)}
                            onBlur={() => handleAliasBlur(voter.s)}
                            onKeyDown={(e) => handleAliasKeyDown(e, voter.s)}
                            placeholder="ఉదా: kanniaha (మీ ఇన్పుట్)..."
                            className={`w-full px-2.5 py-1.5 rounded-lg text-xs font-semibold focus:outline-none transition-all ${
                              customAlias
                                ? 'bg-slate-900 border border-amber-500/50 text-amber-300 focus:border-amber-400 focus:ring-1 focus:ring-amber-400'
                                : 'bg-slate-900/60 border border-slate-700 text-slate-300 placeholder-slate-500 focus:border-emerald-400 focus:bg-slate-900'
                            }`}
                          />
                          {isSavedJustNow && (
                            <span className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-0.5 text-[9px] font-bold text-emerald-400 bg-emerald-950 px-1 rounded border border-emerald-500/40 animate-pulse">
                              <Check className="w-2.5 h-2.5" /> సేవ్!
                            </span>
                          )}
                        </div>

                        {matchedCustomAlias && (
                          <span className="inline-block px-1.5 py-0.2 rounded text-[8.5px] font-black bg-emerald-500/20 border border-emerald-500/50 text-emerald-300">
                            ⭐ మీ ఇన్పుట్ మ్యాచ్ ({customAlias})
                          </span>
                        )}
                      </div>
                    </td>

                    {/* COL 7: Mobile Phone */}
                    <td className="py-2 px-3 border-r border-slate-800 align-middle">
                      {phone ? (
                        <div className="flex items-center justify-between gap-1">
                          <a
                            href={`tel:${phone}`}
                            className="font-mono text-emerald-300 font-bold hover:underline flex items-center gap-1 text-xs"
                            title="Call Voter"
                          >
                            <Phone className="w-3 h-3 text-emerald-400" />
                            <span>{phone}</span>
                          </a>
                          <button
                            onClick={() => onOpenPhoneEditor(voter)}
                            className="text-slate-500 hover:text-amber-400 p-0.5"
                            title="Edit Phone"
                          >
                            <Edit3 className="w-2.5 h-2.5" />
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => onOpenPhoneEditor(voter)}
                          className="text-[10px] text-amber-400/90 hover:text-amber-300 hover:underline flex items-center gap-1 font-bold"
                        >
                          + ఫోన్ కలపండి
                        </button>
                      )}
                    </td>

                    {/* COL 8: Support Leaning */}
                    <td className="py-2 px-3 border-r border-slate-800 align-middle">
                      <button
                        onClick={() =>
                          onOpenSupportPicker(
                            voter.n,
                            prof.supportPct ?? 50,
                            prof.notes,
                            voter.s
                          )
                        }
                        className="text-left w-full hover:scale-102 transition-transform cursor-pointer"
                        title="Click to change Support Leaning"
                      >
                        {prof.supportPct === 100 || prof.survey_status === 'supporter' ? (
                          <span className="px-2 py-0.5 rounded bg-emerald-950/80 border border-emerald-500/50 text-emerald-300 font-bold text-[10px] inline-flex items-center gap-1">
                            ⭐ 100% మనవాళ్లే
                          </span>
                        ) : prof.supportPct === 75 ? (
                          <span className="px-2 py-0.5 rounded bg-emerald-950/50 border border-emerald-500/40 text-emerald-400 font-bold text-[10px] inline-flex items-center gap-1">
                            🟢 75% అనుకూలం
                          </span>
                        ) : prof.supportPct === 40 ? (
                          <span className="px-2 py-0.5 rounded bg-amber-950/60 border border-amber-500/40 text-amber-300 font-bold text-[10px] inline-flex items-center gap-1">
                            🟡 40% సానుకూలం
                          </span>
                        ) : prof.supportPct === 0 ? (
                          <span className="px-2 py-0.5 rounded bg-rose-950/80 border border-rose-500/50 text-rose-300 font-bold text-[10px] inline-flex items-center gap-1">
                            🔴 0% ప్రత్యర్థి
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-400 border border-slate-700 font-medium text-[10px] inline-flex items-center gap-1">
                            ⚪ 50% స్వింగ్
                          </span>
                        )}
                      </button>
                    </td>

                    {/* COL 9: Polling Status (Voted / Pending) */}
                    <td className="py-2 px-2 border-r border-slate-800 text-center align-middle">
                      <button
                        onClick={() => onQuickToggleVoted && onQuickToggleVoted(voter.s)}
                        className={`px-2 py-1 rounded-lg text-[10px] font-bold border transition-all active:scale-95 cursor-pointer ${
                          isVoted
                            ? 'bg-emerald-600 text-white border-emerald-400 shadow-sm'
                            : 'bg-slate-900 hover:bg-slate-800 text-slate-400 border-slate-700'
                        }`}
                        title={isVoted ? 'ఓటేశారు (ట్యాప్ చేస్తే రీసెట్)' : 'ఓటు వేయడానికి ట్యాప్ చేయండి'}
                      >
                        {isVoted ? '✅ ఓటేశారు' : '⏳ పెండింగ్'}
                      </button>
                    </td>

                    {/* COL 10: Actions (Slip, WhatsApp, Visit) */}
                    <td className="py-2 px-2 text-center align-middle">
                      <div className="flex items-center justify-center gap-1">
                        <button
                          onClick={() => onOpenSlip(voter)}
                          className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-amber-400 border border-slate-700 hover:border-amber-500/50 transition-colors"
                          title="ఓటరు చీటీ చూడండి (View Voter Slip)"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </button>

                        <button
                          onClick={() => handleSendWhatsAppSlip(voter)}
                          className="p-1.5 rounded-lg bg-emerald-950/80 hover:bg-emerald-900 text-emerald-400 border border-emerald-500/40 transition-colors"
                          title="WhatsApp స్లిప్ పంపండి"
                        >
                          <MessageSquare className="w-3.5 h-3.5" />
                        </button>

                        <button
                          onClick={() => onOpenLogVisit(voter)}
                          className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition-colors"
                          title="విజిట్ లాగ్ చేయండి"
                        >
                          <Clock className="w-3.5 h-3.5 text-amber-400" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* =========================================================================
          PAGINATION BAR
          ========================================================================= */}
      <div className="p-3 bg-slate-900 border-t border-slate-800 flex items-center justify-between flex-wrap gap-2 text-xs">
        <div className="text-slate-400 font-mono">
          పేజీ <strong className="text-white">{currentPage}</strong> / <strong className="text-white">{totalPages}</strong> (మొత్తం {filteredVoters.length} ఓటర్లు)
        </div>

        <div className="flex items-center gap-1.5">
          <button
            onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
            disabled={currentPage <= 1}
            className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 disabled:opacity-40 disabled:hover:bg-slate-800 text-slate-300 font-bold flex items-center gap-1 transition-all cursor-pointer"
          >
            <ChevronLeft className="w-3.5 h-3.5" />
            <span>మునుపటి</span>
          </button>

          <span className="px-2 font-mono font-bold text-amber-400">
            {currentPage}
          </span>

          <button
            onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
            disabled={currentPage >= totalPages}
            className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 disabled:opacity-40 disabled:hover:bg-slate-800 text-slate-300 font-bold flex items-center gap-1 transition-all cursor-pointer"
          >
            <span>తరువాతి</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* =========================================================================
          CARD ZOOM LIGHTBOX MODAL (Clicking on Column 1)
          ========================================================================= */}
      {zoomVoter && (
        <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-3 animate-in fade-in duration-150">
          <div className="bg-slate-900 border-2 border-amber-500/60 rounded-3xl max-w-lg w-full p-4 space-y-3 shadow-2xl relative max-h-[92vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <span className="font-mono font-black text-amber-400 text-sm bg-amber-950/80 px-2 py-0.5 rounded-lg border border-amber-500/40">
                  GP #{zoomVoter.s}
                </span>
                <div>
                  <h3 className="text-sm font-black text-white">{zoomVoter.n}</h3>
                  <span className="text-[10px] text-slate-400 font-mono">EPIC: {zoomVoter.id} • H.No: {zoomVoter.hn}</span>
                </div>
              </div>
              <button
                onClick={() => setZoomVoter(null)}
                className="p-1.5 rounded-full bg-slate-800 text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* High-Resolution Official Voter Card */}
            {(zoomVoter.card_url || zoomVoter.card) ? (
              <div className="space-y-2">
                <div className="text-[11px] font-bold text-amber-400 flex items-center justify-between">
                  <span>📄 అధికారిక ఓటర్ జాబితా స్లిప్ (Official Card Crop)</span>
                  <span className="text-[10px] font-mono text-emerald-400 bg-emerald-950/80 px-2 py-0.5 rounded border border-emerald-500/40">
                    AC #37 Pithapuram
                  </span>
                </div>
                <div className="rounded-2xl overflow-hidden border-2 border-amber-500/70 bg-slate-950 shadow-2xl p-1 relative">
                  <img
                    src={resolvePhotoUrl(zoomVoter.card_url || zoomVoter.card)}
                    alt={`Full Card ${zoomVoter.s}`}
                    className="w-full h-auto rounded-xl object-contain shadow-inner max-h-[60vh]"
                    onError={(e) => {
                      const target = e.currentTarget as HTMLImageElement;
                      const cardPath = zoomVoter.card_url || zoomVoter.card;
                      if (!cardPath) return;
                      const cleanPath = cardPath.startsWith('/') ? cardPath : `/${cardPath}`;
                      target.src = `https://raw.githubusercontent.com/gundradvp/pithapuram-voters-mobile/main/public${cleanPath}`;
                    }}
                  />
                </div>
              </div>
            ) : (zoomVoter.photo_url || zoomVoter.photo) ? (
              <div className="flex justify-center p-4">
                <img
                  src={resolvePhotoUrl(zoomVoter.photo_url || zoomVoter.photo)}
                  alt={zoomVoter.n}
                  className="w-32 h-40 object-cover rounded-2xl border-2 border-amber-500/70 shadow-xl bg-slate-950"
                />
              </div>
            ) : null}

            {/* Custom Alias in Modal */}
            <div className="p-3 bg-slate-950/80 rounded-2xl border border-slate-800 space-y-1.5 text-xs">
              <label className="text-[10.5px] uppercase font-bold text-amber-400 flex items-center gap-1">
                <Edit3 className="w-3 h-3" />
                <span>నా ఇన్పుట్ / సెర్చ్ మారుపేరు (Custom Search Alias):</span>
              </label>
              <input
                type="text"
                value={aliasDrafts[zoomVoter.s] ?? profiles[zoomVoter.s]?.customAlias ?? ''}
                onChange={(e) => handleAliasChange(zoomVoter.s, e.target.value)}
                onBlur={() => handleAliasBlur(zoomVoter.s)}
                placeholder="ఉదా: kanniaha (మీరు ఇచ్చే పేరు లేదా మారుపేరు)..."
                className="w-full px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-700 focus:border-amber-400 text-white font-medium focus:outline-none"
              />
              <p className="text-[10px] text-slate-500">
                ఇక్కడ నమోదు చేసిన పేరుతో కూడా మెయిన్ సెర్చ్‌లో ఈ ఓటరు వెంటనే కనిపిస్తారు.
              </p>
            </div>

            {/* Quick Actions in Modal */}
            <div className="flex items-center gap-2 pt-1">
              <button
                onClick={() => {
                  onOpenSlip(zoomVoter);
                  setZoomVoter(null);
                }}
                className="flex-1 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs flex items-center justify-center gap-1.5 shadow-md"
              >
                <Eye className="w-3.5 h-3.5" />
                <span>ఓటరు చీటీ వివరాలు</span>
              </button>
              <button
                onClick={() => {
                  handleSendWhatsAppSlip(zoomVoter);
                  setZoomVoter(null);
                }}
                className="flex-1 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs flex items-center justify-center gap-1.5 shadow-md shadow-emerald-950/40"
              >
                <MessageSquare className="w-3.5 h-3.5" />
                <span>వాట్సాప్ స్లిప్</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
