import React, { useState, useMemo, useEffect } from 'react';
import {
  Printer,
  X,
  ArrowUpDown,
  Users,
  Layers,
  ShieldCheck,
  Flag,
  Vote,
  Palette,
  Check,
  MapPin,
  Sparkles,
  Phone
} from 'lucide-react';
import { MobileVoter, BoothInfo, VoterCampaignProfile } from '../types';
import { Language } from '../utils/i18n';

interface GroupPrintModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  boothInfo: BoothInfo;
  voters: MobileVoter[];
  profiles: Record<number, VoterCampaignProfile>;
  initialLayout?: PrintLayout;
  language?: Language;
}

type SortField = 'sno' | 'hn' | 'age_desc' | 'name';
type PrintLayout = 'slips' | 'table';
export type SlipsPerPage = 2 | 4 | 6 | 8 | 10;
export type ColorTheme = 'blue' | 'tricolor' | 'emerald' | 'crimson' | 'bw';
type BrandingMode = 'neutral' | 'party';
type PhoneFilter = 'all' | 'with_phone' | 'without_phone';

interface ThemeDefinition {
  id: ColorTheme;
  nameTe: string;
  nameEn: string;
  pillColor: string;
  headerGrad: string;
  subHeaderBg: string;
  subHeaderBorder: string;
  slipBorder: string;
  slipBarBg: string;
  slipBarBorder: string;
  snoBg: string;
  snoText: string;
  epicBg: string;
  epicBorder: string;
  epicText: string;
  psBoxBg: string;
  psBoxBorder: string;
  cutLineBorder: string;
  cutLineText: string;
}

const COLOR_THEMES: ThemeDefinition[] = [
  {
    id: 'blue',
    nameTe: 'రాయల్ బ్లూ & గోల్డ్',
    nameEn: 'Royal Blue & Amber',
    pillColor: 'bg-blue-600 text-white',
    headerGrad: 'bg-gradient-to-r from-blue-900 via-indigo-900 to-blue-800 text-white border-blue-950',
    subHeaderBg: 'bg-blue-50/90 text-blue-950',
    subHeaderBorder: 'border-blue-200',
    slipBorder: 'border-blue-700',
    slipBarBg: 'bg-blue-50 text-blue-950',
    slipBarBorder: 'border-blue-200',
    snoBg: 'bg-gradient-to-r from-red-600 to-rose-700 text-white',
    snoText: 'text-white',
    epicBg: 'bg-blue-100 text-blue-950',
    epicBorder: 'border-blue-400',
    epicText: 'text-blue-950',
    psBoxBg: 'bg-amber-50/80 text-amber-950',
    psBoxBorder: 'border-amber-300',
    cutLineBorder: 'border-blue-400',
    cutLineText: 'text-blue-800'
  },
  {
    id: 'tricolor',
    nameTe: 'త్రివర్ణ (కేసరి & ఆకుపచ్చ)',
    nameEn: 'Tri-Color (Saffron & Emerald)',
    pillColor: 'bg-gradient-to-r from-orange-500 to-emerald-600 text-white',
    headerGrad: 'bg-gradient-to-r from-amber-600 via-orange-600 to-emerald-700 text-white border-orange-900',
    subHeaderBg: 'bg-amber-50/90 text-amber-950',
    subHeaderBorder: 'border-amber-200',
    slipBorder: 'border-emerald-700',
    slipBarBg: 'bg-orange-50 text-orange-950',
    slipBarBorder: 'border-orange-200',
    snoBg: 'bg-gradient-to-r from-orange-600 to-amber-600 text-white',
    snoText: 'text-white',
    epicBg: 'bg-emerald-100 text-emerald-950',
    epicBorder: 'border-emerald-400',
    epicText: 'text-emerald-950',
    psBoxBg: 'bg-emerald-50/80 text-emerald-950',
    psBoxBorder: 'border-emerald-300',
    cutLineBorder: 'border-emerald-500',
    cutLineText: 'text-emerald-900'
  },
  {
    id: 'emerald',
    nameTe: 'ఎమరాల్డ్ గ్రీన్',
    nameEn: 'Emerald Green',
    pillColor: 'bg-emerald-600 text-white',
    headerGrad: 'bg-gradient-to-r from-emerald-900 via-teal-900 to-emerald-800 text-white border-emerald-950',
    subHeaderBg: 'bg-emerald-50/90 text-emerald-950',
    subHeaderBorder: 'border-emerald-200',
    slipBorder: 'border-emerald-700',
    slipBarBg: 'bg-emerald-50 text-emerald-950',
    slipBarBorder: 'border-emerald-200',
    snoBg: 'bg-gradient-to-r from-emerald-700 to-teal-700 text-white',
    snoText: 'text-white',
    epicBg: 'bg-emerald-100 text-emerald-950',
    epicBorder: 'border-emerald-400',
    epicText: 'text-emerald-950',
    psBoxBg: 'bg-teal-50/80 text-teal-950',
    psBoxBorder: 'border-teal-300',
    cutLineBorder: 'border-emerald-400',
    cutLineText: 'text-emerald-800'
  },
  {
    id: 'crimson',
    nameTe: 'రూబీ & క్రిమ్సన్',
    nameEn: 'Ruby & Crimson',
    pillColor: 'bg-rose-700 text-white',
    headerGrad: 'bg-gradient-to-r from-rose-900 via-red-900 to-rose-800 text-white border-rose-950',
    subHeaderBg: 'bg-rose-50/90 text-rose-950',
    subHeaderBorder: 'border-rose-200',
    slipBorder: 'border-rose-700',
    slipBarBg: 'bg-rose-50 text-rose-950',
    slipBarBorder: 'border-rose-200',
    snoBg: 'bg-gradient-to-r from-red-600 to-rose-700 text-white',
    snoText: 'text-white',
    epicBg: 'bg-rose-100 text-rose-950',
    epicBorder: 'border-rose-400',
    epicText: 'text-rose-950',
    psBoxBg: 'bg-amber-50/80 text-amber-950',
    psBoxBorder: 'border-amber-300',
    cutLineBorder: 'border-rose-400',
    cutLineText: 'text-rose-800'
  },
  {
    id: 'bw',
    nameTe: 'క్లాసిక్ మోనోక్రోమ్ (ఇంక్ సేవర్)',
    nameEn: 'Monochrome (Ink Saver)',
    pillColor: 'bg-slate-800 text-white',
    headerGrad: 'bg-slate-900 text-white border-slate-950',
    subHeaderBg: 'bg-slate-100 text-slate-900',
    subHeaderBorder: 'border-slate-300',
    slipBorder: 'border-slate-800',
    slipBarBg: 'bg-slate-100 text-slate-900',
    slipBarBorder: 'border-slate-300',
    snoBg: 'bg-slate-900 text-white',
    snoText: 'text-white',
    epicBg: 'bg-slate-100 text-slate-950',
    epicBorder: 'border-slate-400',
    epicText: 'text-slate-950',
    psBoxBg: 'bg-slate-50 text-slate-900',
    psBoxBorder: 'border-slate-300',
    cutLineBorder: 'border-slate-400',
    cutLineText: 'text-slate-700'
  }
];

export const GroupPrintModal: React.FC<GroupPrintModalProps> = ({
  isOpen,
  onClose,
  title,
  subtitle,
  boothInfo,
  voters,
  profiles,
  initialLayout = 'slips',
  language = 'te'
}) => {
  const [printLayout, setPrintLayout] = useState<PrintLayout>(initialLayout);

  useEffect(() => {
    if (isOpen && initialLayout) {
      setPrintLayout(initialLayout);
    }
  }, [isOpen, initialLayout]);
  const [slipsPerPage, setSlipsPerPage] = useState<SlipsPerPage>(4);
  const [colorTheme, setColorTheme] = useState<ColorTheme>('blue');
  const [brandingMode, setBrandingMode] = useState<BrandingMode>('neutral');
  const [sortBy, setSortBy] = useState<SortField>('sno');
  // Default to FALSE (print WITHOUT phone number by default, print phone number when checked)
  const [showPhone, setShowPhone] = useState<boolean>(false);
  const [showRelation, setShowRelation] = useState<boolean>(true);
  const [showLeaning, setShowLeaning] = useState<boolean>(true);
  const [showPollCheckbox, setShowPollCheckbox] = useState<boolean>(true);
  const [genderFilter, setGenderFilter] = useState<'all' | 'M' | 'F'>('all');
  // Filter by Phone Number availability ('all' | 'with_phone' | 'without_phone')
  const [phoneFilter, setPhoneFilter] = useState<PhoneFilter>('all');

  const activeTheme = useMemo(() => {
    return COLOR_THEMES.find(t => t.id === colorTheme) || COLOR_THEMES[0];
  }, [colorTheme]);

  // Helper to extract phone number from voter or campaign profile
  const getVoterPhone = (v: MobileVoter): string => {
    const voterSno = v.s ?? (v as any).sno;
    const prof = voterSno ? profiles[voterSno] : undefined;
    return String(prof?.customPhone || v.k_m || (v as any).phone || (v as any).mobile || '').trim();
  };

  // Pre-calculate phone stats for the filter badges
  const phoneStats = useMemo(() => {
    let withPhone = 0;
    let withoutPhone = 0;
    voters.forEach(v => {
      if (getVoterPhone(v)) withPhone++;
      else withoutPhone++;
    });
    return { withPhone, withoutPhone };
  }, [voters, profiles]);

  // Filtered & Sorted Voters
  const sortedVoters = useMemo(() => {
    let list = [...voters];

    // 1. Gender Filter
    if (genderFilter === 'M') {
      list = list.filter(v => v.g === 'M' || (v as any).gender_en === 'Male' || (v as any).gender_te === 'పురుషుడు');
    } else if (genderFilter === 'F') {
      list = list.filter(v => v.g === 'F' || v.g === 'W' || (v as any).gender_en === 'Female' || (v as any).gender_te === 'స్త్రీ');
    }

    // 2. Phone Number Filter
    if (phoneFilter === 'with_phone') {
      list = list.filter(v => Boolean(getVoterPhone(v)));
    } else if (phoneFilter === 'without_phone') {
      list = list.filter(v => !Boolean(getVoterPhone(v)));
    }

    // 3. Sorting
    list.sort((a, b) => {
      const snoA = a.s ?? (a as any).sno ?? 0;
      const snoB = b.s ?? (b as any).sno ?? 0;
      if (sortBy === 'sno') return snoA - snoB;
      if (sortBy === 'hn') {
        const hA = a.hn || (a as any).house_no || '';
        const hB = b.hn || (b as any).house_no || '';
        return hA.localeCompare(hB, undefined, { numeric: true, sensitivity: 'base' });
      }
      if (sortBy === 'age_desc') {
        const ageA = parseInt(String(a.a || (a as any).age), 10) || 0;
        const ageB = parseInt(String(b.a || (b as any).age), 10) || 0;
        return ageB - ageA;
      }
      if (sortBy === 'name') {
        const nA = a.n || (a as any).name_te || (a as any).name_en || '';
        const nB = b.n || (b as any).name_te || (b as any).name_en || '';
        return nA.localeCompare(nB, 'te');
      }
      return 0;
    });

    return list;
  }, [voters, sortBy, genderFilter, phoneFilter, profiles]);

  // Paginated Voter Chunks for Slip Print (Exact A4 Fit: 2, 4, 6, 8, 10 slips per page)
  const slipPages = useMemo(() => {
    const pages: MobileVoter[][] = [];
    for (let i = 0; i < sortedVoters.length; i += slipsPerPage) {
      pages.push(sortedVoters.slice(i, i + slipsPerPage));
    }
    return pages;
  }, [sortedVoters, slipsPerPage]);

  // Statistics calculation for table view
  const stats = useMemo(() => {
    const total = sortedVoters.length;
    let male = 0;
    let female = 0;
    let elders = 0;
    let youth = 0;
    let kriya = 0;
    let jsp = 0;
    let swing = 0;
    let opponent = 0;

    sortedVoters.forEach(v => {
      const isMale = v.g === 'M' || (v as any).gender_en === 'Male' || (v as any).gender_te === 'పురుషుడు';
      if (isMale) male++;
      else female++;

      const age = parseInt(String(v.a || (v as any).age), 10) || 0;
      if (age >= 60) elders++;
      if (age >= 18 && age <= 25) youth++;

      if (v.kriya || v.k_m) kriya++;

      const voterSno = v.s ?? (v as any).sno;
      const prof = voterSno ? profiles[voterSno] : undefined;
      const hasEntry = prof?.supportPct !== undefined;
      const pct = hasEntry ? prof!.supportPct! : undefined;

      if (hasEntry) {
        if (pct! >= 75) jsp++;
        else if (pct! <= 25) opponent++;
        else swing++;
      } else {
        swing++;
      }
    });

    return { total, male, female, elders, youth, kriya, jsp, swing, opponent };
  }, [sortedVoters, profiles]);

  if (!isOpen) return null;

  const handlePrint = () => {
    if (document.activeElement instanceof HTMLElement) {
      document.activeElement.blur();
    }
    window.print();
  };

  const isMunicipal = boothInfo.election_type === 'municipal';
  const boothHeaderLabel = isMunicipal
    ? `${boothInfo.local_body || 'పురపాలక సంఘం'} — ${boothInfo.ward_no ? `${boothInfo.ward_no}వ వార్డు` : ''} (బూత్ Part #${boothInfo.part_no})`
    : `పిఠాపురం శాసనసభ నియోజకవర్గం (AC #37) — బూత్ Part #${boothInfo.part_no}`;

  const todayDate = new Date().toLocaleDateString('te-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  });

  return (
    <div className="group-print-modal-overlay fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex flex-col items-center justify-start overflow-y-auto p-2 sm:p-4">
      {/* Comprehensive Print CSS for Exact A4 Fit & Proper Multi-Page Pagination with Color Preservation */}
      <style>{`
        @media print {
          @page {
            size: A4 portrait;
            margin: 6mm 5mm;
          }

          html, body {
            margin: 0 !important;
            padding: 0 !important;
            background: #ffffff !important;
            color: #000000 !important;
            height: auto !important;
            min-height: 0 !important;
            overflow: visible !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
            color-adjust: exact !important;
          }

          /* Hide everything in app outside our printable content */
          header, nav, main, footer, .no-print, [role="navigation"] {
            display: none !important;
          }

          /* Unfix modal overlay to standard block flow so all pages paginate properly */
          .group-print-modal-overlay {
            position: static !important;
            inset: auto !important;
            display: block !important;
            width: 100% !important;
            height: auto !important;
            padding: 0 !important;
            margin: 0 !important;
            background: transparent !important;
            overflow: visible !important;
            backdrop-filter: none !important;
          }

          #group-printable-content {
            position: static !important;
            display: block !important;
            width: 100% !important;
            max-width: 100% !important;
            margin: 0 !important;
            padding: 0 !important;
            background: #ffffff !important;
            border: none !important;
            box-shadow: none !important;
          }

          /* Each A4 Page is an isolated print sheet that breaks cleanly */
          .a4-print-page {
            width: 198mm !important;
            max-width: 198mm !important;
            min-height: 280mm !important;
            height: 280mm !important;
            box-sizing: border-box !important;
            margin: 0 auto !important;
            padding: 2mm 0 !important;
            border: none !important;
            box-shadow: none !important;
            display: flex !important;
            flex-direction: column !important;
            justify-content: space-between !important;
            page-break-after: always !important;
            break-after: page !important;
            page-break-inside: avoid !important;
            break-inside: avoid !important;
            overflow: hidden !important;
            background: #ffffff !important;
          }

          .a4-print-page:last-child {
            page-break-after: auto !important;
            break-after: auto !important;
          }

          .voter-slip-card {
            page-break-inside: avoid !important;
            break-inside: avoid !important;
            background: #ffffff !important;
            box-shadow: none !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
            color-adjust: exact !important;
          }

          .print-header-bg {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }

          .print-zebra:nth-child(even) {
            background-color: #f8fafc !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }

          table {
            page-break-inside: auto !important;
          }

          thead {
            display: table-header-group !important;
          }

          tr {
            page-break-inside: avoid !important;
            break-inside: avoid !important;
          }
        }
      `}</style>

      {/* Top Modal Floating Controls (Screen Only) */}
      <div className="no-print bg-slate-900 border border-amber-500/50 rounded-2xl w-full max-w-4xl p-3.5 mb-3 shadow-2xl text-white space-y-3 sticky top-2 z-20">
        {/* Header Bar */}
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div className="flex items-center gap-2">
            <span className="p-2 bg-amber-500/20 text-amber-400 rounded-xl">
              <Printer className="w-5 h-5" />
            </span>
            <div>
              <h2 className="text-sm font-black text-white flex items-center gap-1.5">
                <span>{title}</span>
                <span className="text-amber-400 font-mono text-xs">({sortedVoters.length} మంది ఓటర్లు)</span>
              </h2>
              <p className="text-[11px] text-slate-400">
                {subtitle || `${boothHeaderLabel} • A4 ప్రింట్ సెట్టింగ్‌లు`}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-black rounded-xl text-xs flex items-center gap-1.5 shadow-lg shadow-blue-950/40 hover:scale-105 active:scale-95 transition-all cursor-pointer"
            >
              <Printer className="w-4 h-4" />
              <span>🖨️ A4 పేపర్‌పై ప్రింట్ చేయండి</span>
            </button>
            <button
              onClick={onClose}
              className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-xl transition-all cursor-pointer"
              title="మూసివేయి (Close)"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Toolbar Row 1: Print Layout Mode (Slips vs Normal List) & Contextual Controls */}
        <div className="flex items-center justify-between gap-2 flex-wrap pt-2 border-t border-slate-800 text-[11px]">
          {/* Main Format Tabs: Voter Slips vs Normal Voter List */}
          <div className="flex items-center gap-1.5 p-1 bg-slate-950 rounded-xl border border-slate-700">
            <button
              type="button"
              onClick={() => setPrintLayout('slips')}
              className={`px-3 py-1.5 rounded-lg text-xs font-black flex items-center gap-1.5 transition-all cursor-pointer ${
                printLayout === 'slips'
                  ? 'bg-amber-500 text-slate-950 shadow-md font-black'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800'
              }`}
            >
              <Printer className="w-3.5 h-3.5" />
              <span>🖨️ ఓటర్ చీటీలు (Voter Slips)</span>
            </button>
            <button
              type="button"
              onClick={() => setPrintLayout('table')}
              className={`px-3 py-1.5 rounded-lg text-xs font-black flex items-center gap-1.5 transition-all cursor-pointer ${
                printLayout === 'table'
                  ? 'bg-amber-500 text-slate-950 shadow-md font-black'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800'
              }`}
            >
              <Users className="w-3.5 h-3.5" />
              <span>📋 సాధారణ ఓటర్ల జాబితా (Normal List)</span>
            </button>
          </div>

          {/* Sub-Options based on layout */}
          {printLayout === 'slips' ? (
            /* Slips per page options (2, 4, 6, 8, 10 items) */
            <div className="flex items-center gap-1 bg-slate-800/90 p-1 rounded-xl border border-slate-700 flex-wrap">
              <span className="text-amber-400 font-bold px-1.5 text-[10.5px] flex items-center gap-1">
                <Layers className="w-3.5 h-3.5" /> పేజీకి స్లిప్పులు:
              </span>
              {([2, 4, 6, 8, 10] as SlipsPerPage[]).map(num => (
                <button
                  key={num}
                  type="button"
                  onClick={() => setSlipsPerPage(num)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-black transition-all cursor-pointer ${
                    slipsPerPage === num
                      ? 'bg-amber-500 text-slate-950 shadow-md scale-105'
                      : 'text-slate-300 hover:text-white hover:bg-slate-700/60'
                  }`}
                  title={`పేజీకి ${num} ఓటర్ స్లిప్పులు (A4 లో ${num} భాగాలు)`}
                >
                  {num === 4 ? `4 (సిఫార్సు)` : num === 8 ? `8 (కాంపాక్ట్)` : `${num}`}
                </button>
              ))}
            </div>
          ) : (
            /* Table Mode Columns */
            <div className="flex items-center gap-2 bg-slate-800/90 px-2.5 py-1 rounded-xl border border-slate-700 flex-wrap">
              <span className="text-teal-400 font-bold text-[10.5px]">కాలమ్స్:</span>
              <label className="flex items-center gap-1 cursor-pointer select-none text-slate-300 hover:text-white text-[10.5px]">
                <input
                  type="checkbox"
                  checked={showRelation}
                  onChange={e => setShowRelation(e.target.checked)}
                  className="rounded accent-amber-500"
                />
                <span>సంబంధీకుడు</span>
              </label>
              <label className="flex items-center gap-1 cursor-pointer select-none text-slate-300 hover:text-white text-[10.5px]">
                <input
                  type="checkbox"
                  checked={showLeaning}
                  onChange={e => setShowLeaning(e.target.checked)}
                  className="rounded accent-amber-500"
                />
                <span>మొగ్గు</span>
              </label>
              <label className="flex items-center gap-1 cursor-pointer select-none text-slate-300 hover:text-white text-[10.5px]">
                <input
                  type="checkbox"
                  checked={showPollCheckbox}
                  onChange={e => setShowPollCheckbox(e.target.checked)}
                  className="rounded accent-amber-500"
                />
                <span>ఓటు వేశారు ☐</span>
              </label>
            </div>
          )}

          {/* Color Themes Selector */}
          <div className="flex items-center gap-1 bg-slate-800/90 p-1 rounded-xl border border-slate-700 flex-wrap">
            <span className="text-slate-400 font-bold px-1 text-[10.5px] flex items-center gap-1">
              <Palette className="w-3.5 h-3.5 text-amber-400" /> రంగులు:
            </span>
            {COLOR_THEMES.map(theme => (
              <button
                key={theme.id}
                type="button"
                onClick={() => setColorTheme(theme.id)}
                className={`px-2 py-1 rounded-lg text-[10.5px] font-bold flex items-center gap-1 transition-all cursor-pointer ${
                  colorTheme === theme.id
                    ? `${theme.pillColor} font-black shadow-md ring-1 ring-white/50 scale-105`
                    : 'text-slate-300 hover:text-white hover:bg-slate-700/50'
                }`}
                title={theme.nameEn}
              >
                {colorTheme === theme.id && <Check className="w-3 h-3" />}
                <span>{theme.nameTe}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Toolbar Row 2: Phone Filters, Phone Print Checkbox & Branding */}
        <div className="flex items-center justify-between gap-2 flex-wrap pt-2 border-t border-slate-800 text-[11px]">
          {/* Phone Number Filter (All / With Phone / Without Phone) */}
          <div className="flex items-center gap-1 bg-slate-800/90 p-1 rounded-xl border border-slate-700 flex-wrap">
            <span className="text-emerald-400 font-bold px-1 text-[10.5px] flex items-center gap-1">
              <Phone className="w-3.5 h-3.5" /> ఓటర్ల ఫిల్టర్:
            </span>
            <button
              type="button"
              onClick={() => setPhoneFilter('all')}
              className={`px-2 py-1 rounded-lg text-[10.5px] font-bold transition-all cursor-pointer ${
                phoneFilter === 'all'
                  ? 'bg-amber-500 text-slate-950 font-black shadow-md'
                  : 'text-slate-300 hover:text-white'
              }`}
            >
              అందరూ ({voters.length})
            </button>
            <button
              type="button"
              onClick={() => setPhoneFilter('with_phone')}
              className={`px-2 py-1 rounded-lg text-[10.5px] font-bold transition-all cursor-pointer flex items-center gap-1 ${
                phoneFilter === 'with_phone'
                  ? 'bg-emerald-500 text-slate-950 font-black shadow-md'
                  : 'text-slate-300 hover:text-white'
              }`}
              title="మొబైల్ / ఫోన్ నెంబర్ అందుబాటులో ఉన్న ఓటర్లు మాత్రమే"
            >
              <span>📱 ఫోన్ ఉన్నవారు ({phoneStats.withPhone})</span>
            </button>
            <button
              type="button"
              onClick={() => setPhoneFilter('without_phone')}
              className={`px-2 py-1 rounded-lg text-[10.5px] font-bold transition-all cursor-pointer ${
                phoneFilter === 'without_phone'
                  ? 'bg-amber-500 text-slate-950 font-black shadow-md'
                  : 'text-slate-300 hover:text-white'
              }`}
              title="ఫోన్ నెంబర్ లేని ఓటర్లు మాత్రమే"
            >
              ఫోన్ లేనివారు ({phoneStats.withoutPhone})
            </button>
          </div>

          {/* Print Phone Number Toggle Checkbox (Default unchecked = Print WITHOUT phone number) */}
          <label className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-bold cursor-pointer transition-all select-none shadow-sm ${
            showPhone 
              ? 'bg-emerald-950/80 text-emerald-300 border-emerald-500 ring-1 ring-emerald-500/50' 
              : 'bg-slate-800/80 text-slate-400 border-slate-700 hover:text-slate-200'
          }`}>
            <input
              type="checkbox"
              checked={showPhone}
              onChange={e => setShowPhone(e.target.checked)}
              className="w-3.5 h-3.5 rounded accent-emerald-500 cursor-pointer"
            />
            <Phone className={`w-3.5 h-3.5 ${showPhone ? 'text-emerald-400' : 'text-slate-400'}`} />
            <span>ఫోన్ నెంబర్ ముద్రించు</span>
          </label>

          {/* Format (Neutral vs Party) */}
          <div className="flex items-center gap-1 bg-slate-800/80 p-1 rounded-xl border border-slate-700">
            <button
              type="button"
              onClick={() => setBrandingMode('neutral')}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold flex items-center gap-1 transition-all cursor-pointer ${
                brandingMode === 'neutral'
                  ? 'bg-emerald-500 text-slate-950 font-black shadow-md'
                  : 'text-slate-300 hover:text-white'
              }`}
              title="పార్టీ గుర్తులు మరియు పేర్లు లేకుండా స్వచ్ఛమైన అధికారిక ఓటరు చీటీ ఫార్మాట్"
            >
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>🏛️ అధికారిక చీటీ</span>
            </button>
            <button
              type="button"
              onClick={() => setBrandingMode('party')}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold flex items-center gap-1 transition-all cursor-pointer ${
                brandingMode === 'party'
                  ? 'bg-indigo-600 text-white font-black shadow-md'
                  : 'text-slate-300 hover:text-white'
              }`}
              title="పిఠాపురం నియోజకవర్గం సమగ్ర బ్రాండింగ్"
            >
              <Vote className="w-3.5 h-3.5" />
              <span>🗳️ నియోజకవర్గం బ్రాండింగ్</span>
            </button>
          </div>
        </div>

        {/* Toolbar Row 3: Sorting & Gender */}
        <div className="flex items-center justify-between gap-2 flex-wrap pt-2 border-t border-slate-800 text-[11px]">
          {/* Sorting */}
          <div className="flex items-center gap-1 flex-wrap">
            <span className="text-slate-400 font-bold flex items-center gap-1 mr-1">
              <ArrowUpDown className="w-3 h-3 text-amber-400" /> అమరిక:
            </span>
            <button
              onClick={() => setSortBy('sno')}
              className={`px-2 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                sortBy === 'sno' ? 'bg-amber-500 text-slate-950 font-black' : 'bg-slate-800 text-slate-300'
              }`}
            >
              బూత్ క్రమం (#)
            </button>
            <button
              onClick={() => setSortBy('hn')}
              className={`px-2 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                sortBy === 'hn' ? 'bg-amber-500 text-slate-950 font-black' : 'bg-slate-800 text-slate-300'
              }`}
            >
              ఇంటి నెం
            </button>
            <button
              onClick={() => setSortBy('age_desc')}
              className={`px-2 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                sortBy === 'age_desc' ? 'bg-amber-500 text-slate-950 font-black' : 'bg-slate-800 text-slate-300'
              }`}
            >
              వయస్సు
            </button>
            <button
              onClick={() => setSortBy('name')}
              className={`px-2 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                sortBy === 'name' ? 'bg-amber-500 text-slate-950 font-black' : 'bg-slate-800 text-slate-300'
              }`}
            >
              పేరు
            </button>
          </div>

          {/* Gender Filter */}
          <div className="flex items-center gap-1 text-[11px]">
            <span className="text-slate-400 font-bold mr-1">లింగం:</span>
            <button
              type="button"
              onClick={() => setGenderFilter('all')}
              className={`px-2 py-1 rounded-lg text-[10px] font-bold transition-all cursor-pointer ${
                genderFilter === 'all' ? 'bg-amber-500 text-slate-950 font-black' : 'bg-slate-800 text-slate-300'
              }`}
            >
              అందరూ
            </button>
            <button
              type="button"
              onClick={() => setGenderFilter('M')}
              className={`px-2 py-1 rounded-lg text-[10px] font-bold transition-all cursor-pointer ${
                genderFilter === 'M' ? 'bg-amber-500 text-slate-950 font-black' : 'bg-slate-800 text-slate-300'
              }`}
            >
              👨 పురుషులు
            </button>
            <button
              type="button"
              onClick={() => setGenderFilter('F')}
              className={`px-2 py-1 rounded-lg text-[10px] font-bold transition-all cursor-pointer ${
                genderFilter === 'F' ? 'bg-amber-500 text-slate-950 font-black' : 'bg-slate-800 text-slate-300'
              }`}
            >
              👩 మహిళలు
            </button>
          </div>
        </div>
      </div>

      {/* =========================================================================
          PRINTABLE CONTAINER
          Multi-page discrete A4 sheets: Each sheet is calibrated to 1 exact A4 page.
          ========================================================================= */}
      <div id="group-printable-content" className="w-full max-w-4xl space-y-4">
        {printLayout === 'slips' ? (
          /* =======================================================================
             VOTER SLIPS VIEW: Discrete A4 Pages (2, 4, 6, 8, 10 slips per page)
             ======================================================================= */
          slipPages.map((pageVoters, pageIndex) => {
            const is8Slips = slipsPerPage === 8;
            const is10Slips = slipsPerPage === 10;
            const is6Slips = slipsPerPage === 6;
            const is2Slips = slipsPerPage === 2;
            const isCompact = is8Slips || is10Slips;

            return (
              <div
                key={pageIndex}
                className="a4-print-page w-full bg-white text-slate-900 rounded-xl shadow-2xl p-3 sm:p-5 border border-slate-300 mx-auto"
              >
                {/* Page Header (Rich Colored Banner) */}
                <div className={`rounded-xl p-2.5 mb-2 border shadow-sm ${activeTheme.headerGrad} print-header-bg`}>
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      {brandingMode === 'party' ? (
                        <>
                          <span className="text-xl shrink-0">🗳️</span>
                          <div className="min-w-0">
                            <h1 className="text-sm sm:text-base font-black tracking-tight uppercase leading-tight truncate">
                              పిఠాపురం శాసనసభ నియోజకవర్గం • PITHAPURAM AC #37
                            </h1>
                            <p className="text-[10px] font-bold opacity-90 leading-tight truncate">
                              {boothHeaderLabel}
                            </p>
                          </div>
                        </>
                      ) : (
                        <>
                          <div className="w-7 h-7 bg-white text-slate-950 font-black text-[11px] rounded flex items-center justify-center shrink-0 tracking-wider shadow">
                            ECI
                          </div>
                          <div className="min-w-0">
                            <h1 className="text-sm sm:text-base font-black tracking-tight uppercase leading-tight truncate">
                              ఓటరు సమాచార చీటీలు • VOTER INFORMATION SLIPS
                            </h1>
                            <p className="text-[10px] font-bold opacity-90 leading-tight truncate">
                              {boothHeaderLabel}
                            </p>
                          </div>
                        </>
                      )}
                    </div>

                    <div className="text-right flex flex-col items-end shrink-0">
                      <div className="inline-flex items-center gap-1 bg-white/20 backdrop-blur-sm border border-white/40 px-2.5 py-0.5 rounded-full font-bold text-[10px] text-white">
                        {brandingMode === 'party' ? (
                          <span>🗳️ ఓటు మన హక్కు • వినియోగించండి</span>
                        ) : (
                          <span>అధికారిక ఓటరు చీటీ</span>
                        )}
                      </div>
                      <span className="text-[9px] text-white/90 font-mono mt-0.5">
                        పేజీ {pageIndex + 1} / {slipPages.length} • తేదీ: {todayDate}
                      </span>
                    </div>
                  </div>

                  {/* Sub-header Banner */}
                  <div className={`mt-1.5 pt-1.5 border-t border-white/20 flex items-center justify-between text-[10px] leading-tight text-white/95`}>
                    <div className="font-bold flex items-center gap-1.5 truncate">
                      <span>{title}</span>
                      {subtitle && <span className="opacity-90 font-normal text-[9.5px]"> • {subtitle}</span>}
                      <span className="opacity-80 text-[9.5px] font-normal">
                        ({sortedVoters.length} మంది • ఈ పేజీలో {pageVoters.length} స్లిప్పులు)
                      </span>
                    </div>
                    <div className="text-right text-[9.5px] opacity-90 truncate max-w-[280px]">
                      <strong>కేంద్రం:</strong> {boothInfo.clean_village || boothInfo.ps_address}
                    </div>
                  </div>
                </div>

                {/* Slips Grid (Dynamically adapts to 2, 4, 6, 8, 10 per page) */}
                <div
                  className={`grid gap-2 flex-1 ${
                    is2Slips
                      ? 'grid-cols-1 grid-rows-2'
                      : is6Slips
                      ? 'grid-cols-2 grid-rows-3'
                      : is8Slips
                      ? 'grid-cols-2 grid-rows-4'
                      : is10Slips
                      ? 'grid-cols-2 grid-rows-5'
                      : 'grid-cols-2 grid-rows-2'
                  }`}
                >
                  {pageVoters.map((v, idx) => {
                    const voterSno = v.s ?? (v as any).sno;
                    const phone = getVoterPhone(v);
                    const voterId = v.id || (v as any).epic || '';
                    const voterName =
                      v.n ||
                      ((v as any).name_en && (v as any).name_te
                        ? `${(v as any).name_en} (${(v as any).name_te})`
                        : (v as any).name_te || (v as any).name_en || '');
                    const voterRel =
                      v.r ||
                      ((v as any).rel_name_en && (v as any).rel_name_te
                        ? `${(v as any).rel_name_en} (${(v as any).rel_name_te})`
                        : (v as any).rel_name_te || (v as any).rel_name_en || '');
                    const voterAge = v.a || (v as any).age || '';
                    const isMale =
                      v.g === 'M' || (v as any).gender_en === 'Male' || (v as any).gender_te === 'పురుషుడు';
                    const voterHn = v.hn || (v as any).house_no || '';

                    return (
                      <div
                        key={voterSno || idx}
                        className={`voter-slip-card border-2 border-dashed ${activeTheme.slipBorder} rounded-xl bg-white text-slate-900 break-inside-avoid flex flex-col justify-between shadow-sm relative min-w-0 ${
                          isCompact ? 'p-1.5' : is6Slips ? 'p-2' : 'p-2.5'
                        }`}
                      >
                        {/* Slip Card Top Header Bar */}
                        <div className="flex items-center justify-between border-b-2 border-slate-900 pb-0.5 mb-1">
                          {brandingMode === 'party' ? (
                            <>
                              <div className="flex items-center gap-1 min-w-0">
                                <span className="text-sm shrink-0">🗳️</span>
                                <div className="min-w-0">
                                  <div className="text-[10.5px] font-black tracking-tight text-indigo-900 uppercase leading-none truncate">
                                    పిఠాపురం • PITHAPURAM
                                  </div>
                                  <div className="text-[8px] font-bold text-slate-600 truncate">
                                    నియోజకవర్గం (AC #37)
                                  </div>
                                </div>
                              </div>
                              <div className="text-right flex items-center gap-0.5 bg-indigo-50 border border-indigo-200 px-1.5 py-0.2 rounded-full text-indigo-950 font-black text-[9px] shrink-0">
                                <span>ఓటరు చీటీ</span>
                              </div>
                            </>
                          ) : (
                            <>
                              <div className="min-w-0">
                                <div className="text-[11px] font-black tracking-tight text-slate-900 uppercase leading-none truncate">
                                  ఓటరు సమాచార చీటీ • VOTER SLIP
                                </div>
                                <div className="text-[8px] font-bold text-slate-600 truncate">
                                  పిఠాపురం శాసనసభ (AC #37)
                                </div>
                              </div>
                              <div className={`text-right ${activeTheme.slipBarBg} border ${activeTheme.slipBarBorder} px-1.5 py-0.5 rounded font-black text-[9px] shrink-0`}>
                                Part #{boothInfo.part_no || boothInfo.ward_no}
                              </div>
                            </>
                          )}
                        </div>

                        {/* Serial Number & Details Header Bar */}
                        <div className={`grid grid-cols-3 gap-1 ${activeTheme.slipBarBg} border ${activeTheme.slipBarBorder} rounded-lg p-1 mb-1 text-center print-header-bg`}>
                          <div>
                            <div className="text-[7px] uppercase font-bold text-slate-600">క్రమ సంఖ్య</div>
                            <div className={`font-mono font-black text-sm leading-tight text-red-700`}>
                              #{voterSno}
                            </div>
                          </div>
                          <div className="border-x border-slate-300">
                            <div className="text-[7px] uppercase font-bold text-slate-600">పోలింగ్ బూత్</div>
                            <div className="font-mono font-black text-[11px] text-slate-900 leading-tight truncate">
                              Part #{boothInfo.part_no || boothInfo.ward_no}
                            </div>
                          </div>
                          <div>
                            <div className="text-[7px] uppercase font-bold text-slate-600">వార్డు / గ్రామం</div>
                            <div className="font-bold text-[9.5px] text-slate-900 leading-tight truncate">
                              {boothInfo.ward_no
                                ? `${boothInfo.ward_no}వ వార్డు`
                                : boothInfo.clean_village || 'పిఠాపురం'}
                            </div>
                          </div>
                        </div>

                        {/* Voter Details */}
                        <div className={`space-y-0.5 mb-1 ${isCompact ? 'text-[9.5px]' : 'text-xs'}`}>
                          {/* Voter Name */}
                          <div className="flex items-start justify-between border-b border-slate-200 pb-0.5 gap-1.5">
                            <span className="text-slate-500 text-[8.5px] font-bold shrink-0">ఓటరు పేరు:</span>
                            <span className="font-black text-slate-950 text-right leading-tight break-words min-w-0">
                              {voterName}
                            </span>
                          </div>

                          {/* Relative Name */}
                          <div className="flex items-start justify-between border-b border-slate-200 pb-0.5 gap-1.5">
                            <span className="text-slate-500 text-[8.5px] font-bold shrink-0">సంబంధీకుడు:</span>
                            <span className="font-bold text-slate-800 text-right leading-tight break-words min-w-0">
                              {voterRel || '—'}
                            </span>
                          </div>

                          {/* EPIC ID */}
                          <div className="flex items-center justify-between border-b border-slate-200 pb-0.5 gap-1">
                            <span className="text-slate-500 text-[8.5px] font-bold shrink-0">ఓటరు ID:</span>
                            <span className={`font-mono font-black text-[10.5px] tracking-wider ${activeTheme.epicBg} ${activeTheme.epicText} px-1.5 py-0.2 rounded border ${activeTheme.epicBorder} shrink-0`}>
                              {voterId || '—'}
                            </span>
                          </div>

                          {/* House No & Age / Gender Pill */}
                          <div className="flex items-center justify-between pt-0.5 text-[9.5px]">
                            <div className="flex items-center gap-1 min-w-0">
                              <span className="text-slate-500 text-[8.5px] font-bold">ఇంటి నెం:</span>
                              <span className="font-mono font-bold text-slate-900 truncate">
                                {voterHn || '—'}
                              </span>
                            </div>
                            <div className="flex items-center gap-1 shrink-0">
                              <span className="font-bold text-slate-900">{voterAge} సం॥</span>
                              <span
                                className={`px-1 py-0.2 rounded text-[8px] font-black border ${
                                  isMale
                                    ? 'bg-blue-100 text-blue-800 border-blue-300'
                                    : 'bg-rose-100 text-rose-800 border-rose-300'
                                }`}
                              >
                                {isMale ? '👨 పురుషుడు' : '👩 స్త్రీ'}
                              </span>
                            </div>
                          </div>

                          {/* Phone: ONLY PRINTED WHEN CHECKED (showPhone === true) */}
                          {showPhone && phone && (
                            <div className="flex items-center justify-between border-t border-dashed border-slate-300 pt-0.5 text-[8.5px]">
                              <span className="text-slate-600 font-bold flex items-center gap-0.5">
                                <Phone className="w-2.5 h-2.5 text-emerald-600" /> ఫోన్:
                              </span>
                              <span className="font-mono font-bold text-slate-950 bg-emerald-50 px-1 py-0.2 rounded border border-emerald-300">
                                {phone}
                              </span>
                            </div>
                          )}
                        </div>

                        {/* Polling Station Address Box */}
                        <div className={`${activeTheme.psBoxBg} border ${activeTheme.psBoxBorder} rounded-lg p-1 mb-1 text-[8.5px] leading-tight`}>
                          <div className="truncate font-medium">
                            <strong className="font-bold">📍 కేంద్రం:</strong> {boothInfo.ps_address || 'స్థానిక పోలింగ్ కేంద్రం'}
                          </div>
                          {!isCompact && (
                            <div className="text-[7.5px] opacity-80 mt-0.5 flex justify-between gap-1 flex-wrap">
                              <span>⏰ ఉ॥ 7:00 – సా॥ 6:00</span>
                              <span className="font-bold text-slate-900">గుర్తింపు కార్డు తప్పనిసరి</span>
                            </div>
                          )}
                        </div>

                        {/* Bottom Cut Line */}
                        <div className={`border-t border-dashed ${activeTheme.cutLineBorder} pt-0.5 flex items-center justify-between text-[7.5px] ${activeTheme.cutLineText}`}>
                          {brandingMode === 'party' ? (
                            <>
                              <span className="flex items-center gap-1 font-black text-indigo-800">
                                <span>✂️ కట్ చేసుకోండి</span>
                                <span>• మీ ఓటు హక్కును వినియోగించుకోండి 🗳️</span>
                              </span>
                              <span className="font-mono text-[7px] text-slate-400">Voter Slip</span>
                            </>
                          ) : (
                            <>
                              <span className="font-bold">
                                ✂️ కట్ చేసుకోండి • గుర్తింపు కార్డు వెంట తీసుకురండి
                              </span>
                              <span className="font-mono text-[7px] font-bold uppercase opacity-75">
                                Voter Slip
                              </span>
                            </>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Page Footer */}
                <div className="mt-1.5 pt-1 border-t border-slate-300 flex items-center justify-between text-[8px] text-slate-500 leading-none">
                  {brandingMode === 'party' ? (
                    <>
                      <p className="font-bold text-slate-700">
                        పిఠాపురం నియోజకవర్గ సమగ్ర ఓటర్ల సహాయ సేవలు
                      </p>
                      <div className="text-right font-mono font-bold text-slate-700">
                        <span>ప్రజాస్వామ్యంలో మీ ఓటు అత్యంత విలువైనది 🗳️</span>
                      </div>
                    </>
                  ) : (
                    <>
                      <p className="font-bold text-slate-700">
                        భారత ఎన్నికల సంఘం సూచనల మేరకు ఓటరు సమాచార చీటీలు • పిఠాపురం నియోజకవర్గం
                      </p>
                      <div className="text-right font-mono font-bold text-slate-600">
                        పేజీ {pageIndex + 1} / {slipPages.length}
                      </div>
                    </>
                  )}
                </div>
              </div>
            );
          })
        ) : (
          /* =======================================================================
             TABLE / ROSTER VIEW
             ======================================================================= */
          <div className="w-full bg-white text-slate-900 rounded-xl shadow-2xl p-4 sm:p-6 border border-slate-300">
            {/* Header */}
            <div className={`rounded-xl p-3 mb-3 border ${activeTheme.headerGrad} print-header-bg`}>
              <div className="flex items-start justify-between gap-3 text-white">
                <div>
                  <h1 className="text-base sm:text-lg font-black tracking-tight uppercase">
                    {brandingMode === 'party' ? '🗳️ పిఠాపురం నియోజకవర్గం • సాధారణ ఓటర్ల జాబితా (VOTER ROSTER)' : 'భారత ఎన్నికల సంఘం • అధికారిక ఓటర్ల జాబితా (ECI VOTER ROSTER)'}
                  </h1>
                  <p className="text-[11px] font-bold opacity-90">{boothHeaderLabel}</p>
                  <p className="text-[10.5px] opacity-90 mt-0.5">
                    <strong className="text-amber-300 font-bold">{title}</strong>
                    {subtitle && <span> • {subtitle}</span>}
                    <span> • కేంద్రం: {boothInfo.clean_village || boothInfo.ps_address}</span>
                  </p>
                </div>
                <div className="text-right">
                  <span className="text-[10px] opacity-80 font-mono">
                    ముద్రణ తేదీ: {todayDate}
                  </span>
                </div>
              </div>
            </div>

            {/* Statistical Summary Box */}
            <div className="bg-slate-50 border border-slate-300 rounded-lg p-2.5 mb-3 text-[11px] print-header-bg">
              <div className="grid grid-cols-2 sm:grid-cols-6 gap-2 text-center divide-x divide-slate-200">
                <div className="px-1">
                  <span className="text-[9.5px] text-slate-500 block uppercase font-bold">మొత్తం ఓటర్లు</span>
                  <span className="font-mono font-black text-base text-slate-900">{stats.total}</span>
                </div>
                <div className="px-1">
                  <span className="text-[9.5px] text-slate-500 block uppercase font-bold">పురుషులు / మహిళలు</span>
                  <span className="font-mono font-black text-sm text-slate-800">
                    👨 {stats.male} | 👩 {stats.female}
                  </span>
                </div>
                <div className="px-1">
                  <span className="text-[9.5px] text-slate-500 block uppercase font-bold">పెద్దలు (60+)</span>
                  <span className="font-mono font-black text-sm text-purple-800">👴 {stats.elders}</span>
                </div>
                <div className="px-1">
                  <span className="text-[9.5px] text-slate-500 block uppercase font-bold">యువత (18-25)</span>
                  <span className="font-mono font-black text-sm text-blue-800">🎯 {stats.youth}</span>
                </div>
                <div className="px-1">
                  <span className="text-[9.5px] text-slate-500 block uppercase font-bold">పార్టీ మద్దతు / స్వింగ్</span>
                  <span className="font-mono font-black text-sm text-emerald-800">
                    🟢 {stats.jsp} / ⚡ {stats.swing}
                  </span>
                </div>
                <div className="px-1">
                  <span className="text-[9.5px] text-slate-500 block uppercase font-bold">క్రియా వాలంటీర్లు</span>
                  <span className="font-mono font-black text-sm text-red-700">⭐ {stats.kriya}</span>
                </div>
              </div>
            </div>

            {/* Voter Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-left text-[10px] border-collapse print-table">
                <thead>
                  <tr className="bg-slate-100 text-slate-800 font-black border-y-2 border-slate-900 uppercase tracking-tight print-header-bg">
                    <th className="py-1.5 px-1.5 text-center w-7 border-r border-slate-300">#</th>
                    <th className="py-1.5 px-1.5 text-center w-12 border-r border-slate-300">బూత్ క్రమం</th>
                    <th className="py-1.5 px-1.5 w-24 border-r border-slate-300">EPIC ID</th>
                    <th className="py-1.5 px-2 border-r border-slate-300">ఓటరు పేరు (తెలుగు)</th>
                    {showRelation && (
                      <th className="py-1.5 px-1.5 border-r border-slate-300">సంబంధీకుడు</th>
                    )}
                    <th className="py-1.5 px-1.5 text-center w-12 border-r border-slate-300">వయస్సు/లిం</th>
                    <th className="py-1.5 px-1.5 text-center w-14 border-r border-slate-300">ఇంటి నెం</th>
                    {showPhone && (
                      <th className="py-1.5 px-1.5 w-24 border-r border-slate-300">ఫోన్ / క్రియా</th>
                    )}
                    {showLeaning && (
                      <th className="py-1.5 px-1.5 text-center w-20 border-r border-slate-300">మొగ్గు</th>
                    )}
                    {showPollCheckbox && (
                      <th className="py-1.5 px-1 text-center w-16 border-r border-slate-300">ఓటు వేశారు?</th>
                    )}
                    <th className="py-1.5 px-2 w-24">గమనికలు / సంతకం</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-300">
                  {sortedVoters.map((v, index) => {
                    const voterSno = v.s ?? (v as any).sno;
                    const phone = getVoterPhone(v);
                    const prof = voterSno ? profiles[voterSno] || {} : {};
                    const pct = prof.supportPct;

                    const voterId = v.id || (v as any).epic || '';
                    const voterName =
                      v.n ||
                      ((v as any).name_en && (v as any).name_te
                        ? `${(v as any).name_en} (${(v as any).name_te})`
                        : (v as any).name_te || (v as any).name_en || '');
                    const voterRel =
                      v.r ||
                      ((v as any).rel_name_en && (v as any).rel_name_te
                        ? `${(v as any).rel_name_en} (${(v as any).rel_name_te})`
                        : (v as any).rel_name_te || (v as any).rel_name_en || '');
                    const voterAge = v.a || (v as any).age || '';
                    const isMale =
                      v.g === 'M' || (v as any).gender_en === 'Male' || (v as any).gender_te === 'పురుషుడు';
                    const voterHn = v.hn || (v as any).house_no || '';

                    let leaningText = '⚪ సర్వే కాలేదు';
                    let leaningColor = 'text-slate-500 font-medium';
                    if (pct !== undefined) {
                      if (pct === 100) {
                        leaningText = '🟢 100% మద్దతు';
                        leaningColor = 'text-emerald-800 font-black';
                      } else if (pct >= 75) {
                        leaningText = '🟢 75% అనుకూలం';
                        leaningColor = 'text-emerald-800 font-bold';
                      } else if (pct === 40) {
                        leaningText = '🟡 40% సానుకూలం';
                        leaningColor = 'text-amber-800 font-bold';
                      } else if (pct === 0) {
                        leaningText = '🔴 ప్రత్యర్థి';
                        leaningColor = 'text-rose-800 font-bold';
                      } else if (pct <= 25) {
                        leaningText = '🟠 అనుమానం';
                        leaningColor = 'text-orange-800 font-bold';
                      } else {
                        leaningText = '⚪ 50% తటస్థ';
                        leaningColor = 'text-slate-700';
                      }
                    }

                    return (
                      <tr
                        key={voterSno || index}
                        className="hover:bg-slate-50 transition-colors print-zebra"
                      >
                        <td className="py-1 px-1 text-center font-mono text-slate-500 border-r border-slate-200">
                          {index + 1}
                        </td>
                        <td className="py-1 px-1.5 text-center font-mono font-black text-slate-900 border-r border-slate-200">
                          #{voterSno}
                        </td>
                        <td className="py-1 px-1.5 font-mono text-[9.5px] font-bold text-slate-800 border-r border-slate-200">
                          {voterId}
                        </td>
                        <td className="py-1 px-2 font-bold text-slate-950 border-r border-slate-200">
                          <div className="leading-tight">
                            <span>{voterName}</span>
                            {v.kriya && (
                              <span className="ml-1 text-[8.5px] bg-red-100 text-red-800 px-1 py-0.2 rounded font-black border border-red-300">
                                ⭐ క్రియ
                              </span>
                            )}
                          </div>
                        </td>
                        {showRelation && (
                          <td className="py-1 px-1.5 text-slate-700 truncate max-w-[120px] border-r border-slate-200">
                            {voterRel || '—'}
                          </td>
                        )}
                        <td className="py-1 px-1.5 text-center font-mono text-slate-800 border-r border-slate-200">
                          {voterAge} / {isMale ? 'పు' : 'మ'}
                        </td>
                        <td className="py-1 px-1.5 text-center font-mono font-bold text-slate-900 border-r border-slate-200">
                          {voterHn || '—'}
                        </td>
                        {showPhone && (
                          <td className="py-1 px-1.5 font-mono text-[9.5px] border-r border-slate-200">
                            {phone ? (
                              <span className={v.k_m ? 'text-red-700 font-bold' : 'text-slate-800'}>
                                {phone}
                              </span>
                            ) : (
                              <span className="text-slate-300 font-mono">__________</span>
                            )}
                          </td>
                        )}
                        {showLeaning && (
                          <td className={`py-1 px-1.5 text-center text-[9px] border-r border-slate-200 ${leaningColor}`}>
                            {leaningText}
                          </td>
                        )}
                        {showPollCheckbox && (
                          <td className="py-1 px-1 text-center border-r border-slate-200">
                            <div className="inline-flex items-center gap-1 border border-slate-400 rounded px-1.5 py-0.5">
                              <span className="w-2.5 h-2.5 border border-slate-600 rounded-sm inline-block" />
                              <span className="text-[8.5px] text-slate-600">వేశారు</span>
                            </div>
                          </td>
                        )}
                        <td className="py-1 px-2 text-slate-400">
                          <div className="border-b border-dashed border-slate-300 w-full h-3">
                            {prof.notes && <span className="text-[9px] text-slate-700 truncate block">{prof.notes}</span>}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Table Footer */}
            <div className="mt-4 pt-2 border-t-2 border-slate-900 flex items-center justify-between text-[9px] text-slate-600">
              <p className="font-bold text-slate-800">
                ఓటర్ల జాబితా • పిఠాపురం నియోజకవర్గం (AC #37) — పోలింగ్ ఏజెంట్లు & బూత్ నిర్వహణ కొరకు
              </p>
              <div className="text-right font-mono font-bold text-slate-800">
                మొత్తం: {sortedVoters.length} ఓటర్లు
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
