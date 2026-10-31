import React, { useState, useMemo } from 'react';
import {
  Printer,
  X,
  CheckSquare,
  Square,
  ArrowUpDown,
  Phone,
  Users,
  Building,
  Flag,
  CheckCircle2,
  Calendar,
  Layers
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
  language?: Language;
}

type SortField = 'sno' | 'hn' | 'age_desc' | 'name';

export const GroupPrintModal: React.FC<GroupPrintModalProps> = ({
  isOpen,
  onClose,
  title,
  subtitle,
  boothInfo,
  voters,
  profiles,
  language = 'te'
}) => {
  const [sortBy, setSortBy] = useState<SortField>('sno');
  const [showPhone, setShowPhone] = useState<boolean>(true);
  const [showRelation, setShowRelation] = useState<boolean>(true);
  const [showLeaning, setShowLeaning] = useState<boolean>(true);
  const [showPollCheckbox, setShowPollCheckbox] = useState<boolean>(true);
  const [genderFilter, setGenderFilter] = useState<'all' | 'M' | 'F'>('all');

  // Filtered & Sorted Voters
  const sortedVoters = useMemo(() => {
    let list = [...voters];

    if (genderFilter === 'M') {
      list = list.filter(v => v.g === 'M' || (v as any).gender_en === 'Male' || (v as any).gender_te === 'పురుషుడు');
    } else if (genderFilter === 'F') {
      list = list.filter(v => v.g === 'F' || v.g === 'W' || (v as any).gender_en === 'Female' || (v as any).gender_te === 'స్త్రీ');
    }

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
  }, [voters, sortBy, genderFilter]);

  // Statistics calculation
  const stats = useMemo(() => {
    const total = sortedVoters.length;
    let male = 0;
    let female = 0;
    let elders = 0; // 60+
    let youth = 0; // 18-25
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
      const pct = prof?.supportPct !== undefined ? prof.supportPct : (v.kriya ? 100 : 50);

      if (pct >= 75) jsp++;
      else if (pct <= 25) opponent++;
      else swing++;
    });

    return { total, male, female, elders, youth, kriya, jsp, swing, opponent };
  }, [sortedVoters, profiles]);

  if (!isOpen) return null;

  const handlePrint = () => {
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
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex flex-col items-center justify-start overflow-y-auto p-2 sm:p-4">
      {/* Print Specific CSS injected directly */}
      <style>{`
        @media print {
          @page {
            size: A4 portrait;
            margin: 8mm 6mm 8mm 6mm;
          }
          body * {
            visibility: hidden !important;
          }
          #group-printable-content, #group-printable-content * {
            visibility: visible !important;
          }
          #group-printable-content {
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 100% !important;
            margin: 0 !important;
            padding: 0 !important;
            background: #ffffff !important;
            color: #000000 !important;
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif !important;
          }
          .no-print {
            display: none !important;
          }
          .print-border {
            border: 1px solid #334155 !important;
          }
          .print-header-bg {
            background-color: #f1f5f9 !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          .print-zebra:nth-child(even) {
            background-color: #f8fafc !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          tr {
            page-break-inside: avoid !important;
          }
        }
      `}</style>

      {/* Top Modal Floating Controls (Screen Only) */}
      <div className="no-print bg-slate-900 border border-amber-500/50 rounded-2xl w-full max-w-4xl p-3.5 mb-3 shadow-2xl text-white space-y-3 sticky top-2 z-20">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div className="flex items-center gap-2">
            <span className="p-2 bg-amber-500/20 text-amber-400 rounded-xl">
              <Printer className="w-5 h-5" />
            </span>
            <div>
              <h2 className="text-sm font-black text-white flex items-center gap-1.5">
                <span>{title}</span>
                <span className="text-amber-400 font-mono text-xs">({sortedVoters.length} మంది)</span>
              </h2>
              <p className="text-[11px] text-slate-400">
                {subtitle || `${boothHeaderLabel} • A4 ప్రింట్ రెడీ జాబితా`}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="px-4 py-2 bg-gradient-to-r from-red-600 to-amber-600 hover:from-red-500 hover:to-amber-500 text-white font-black rounded-xl text-xs flex items-center gap-1.5 shadow-lg shadow-red-950/40 hover:scale-105 active:scale-95 transition-all"
            >
              <Printer className="w-4 h-4" />
              <span>🖨️ A4 పేపర్‌పై ప్రింట్ చేయండి</span>
            </button>
            <button
              onClick={onClose}
              className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-xl transition-all"
              title="మూసివేయి (Close)"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Options & Sorting Toolbar */}
        <div className="flex items-center justify-between gap-2 flex-wrap pt-2 border-t border-slate-800 text-[11px]">
          {/* Sorting buttons */}
          <div className="flex items-center gap-1 flex-wrap">
            <span className="text-slate-400 font-bold flex items-center gap-1 mr-1">
              <ArrowUpDown className="w-3 h-3 text-amber-400" /> అమరిక:
            </span>
            <button
              onClick={() => setSortBy('sno')}
              className={`px-2 py-1 rounded-lg font-bold transition-all ${
                sortBy === 'sno' ? 'bg-amber-500 text-slate-950 font-black' : 'bg-slate-800 text-slate-300'
              }`}
            >
              బూత్ క్రమం (#)
            </button>
            <button
              onClick={() => setSortBy('hn')}
              className={`px-2 py-1 rounded-lg font-bold transition-all ${
                sortBy === 'hn' ? 'bg-amber-500 text-slate-950 font-black' : 'bg-slate-800 text-slate-300'
              }`}
            >
              ఇంటి నెంబర్
            </button>
            <button
              onClick={() => setSortBy('age_desc')}
              className={`px-2 py-1 rounded-lg font-bold transition-all ${
                sortBy === 'age_desc' ? 'bg-amber-500 text-slate-950 font-black' : 'bg-slate-800 text-slate-300'
              }`}
            >
              వయస్సు (పెద్దలు)
            </button>
            <button
              onClick={() => setSortBy('name')}
              className={`px-2 py-1 rounded-lg font-bold transition-all ${
                sortBy === 'name' ? 'bg-amber-500 text-slate-950 font-black' : 'bg-slate-800 text-slate-300'
              }`}
            >
              పేరు అక్షర క్రమం
            </button>
          </div>

          {/* Column toggles */}
          <div className="flex items-center gap-2 flex-wrap">
            <label className="flex items-center gap-1 cursor-pointer select-none text-slate-300 hover:text-white">
              <input
                type="checkbox"
                checked={showPhone}
                onChange={e => setShowPhone(e.target.checked)}
                className="rounded accent-amber-500"
              />
              <span>ఫోన్ నెం</span>
            </label>
            <label className="flex items-center gap-1 cursor-pointer select-none text-slate-300 hover:text-white">
              <input
                type="checkbox"
                checked={showRelation}
                onChange={e => setShowRelation(e.target.checked)}
                className="rounded accent-amber-500"
              />
              <span>సంబంధీకుడు</span>
            </label>
            <label className="flex items-center gap-1 cursor-pointer select-none text-slate-300 hover:text-white">
              <input
                type="checkbox"
                checked={showLeaning}
                onChange={e => setShowLeaning(e.target.checked)}
                className="rounded accent-amber-500"
              />
              <span>పార్టీ మొగ్గు</span>
            </label>
            <label className="flex items-center gap-1 cursor-pointer select-none text-slate-300 hover:text-white">
              <input
                type="checkbox"
                checked={showPollCheckbox}
                onChange={e => setShowPollCheckbox(e.target.checked)}
                className="rounded accent-amber-500"
              />
              <span>ఓటు వేశారు ☐</span>
            </label>
          </div>
        </div>
      </div>

      {/* =========================================================================
          PRINTABLE CONTAINER (Previewed on screen as crisp A4 paper, printed 1:1)
          ========================================================================= */}
      <div
        id="group-printable-content"
        className="w-full max-w-4xl bg-white text-slate-900 rounded-xl shadow-2xl p-4 sm:p-7 border border-slate-200"
      >
        {/* Header Section */}
        <div className="border-b-2 border-slate-900 pb-3 mb-3">
          <div className="flex items-start justify-between gap-4">
            {/* Left: Party Title & Slogan */}
            <div className="space-y-0.5">
              <div className="flex items-center gap-2">
                <span className="text-xl">🚩</span>
                <div>
                  <h1 className="text-base sm:text-lg font-black tracking-tight text-red-700 uppercase">
                    జనసేన పార్టీ • JANASENA PARTY
                  </h1>
                  <p className="text-[11px] font-bold text-slate-700">
                    {boothHeaderLabel}
                  </p>
                </div>
              </div>
            </div>

            {/* Right: Glass Symbol & Date */}
            <div className="text-right flex flex-col items-end">
              <div className="inline-flex items-center gap-1 bg-amber-50 border border-amber-500 px-2.5 py-0.5 rounded-full text-amber-900 font-black text-xs">
                <span>🥛 గాజు గ్లాసు గుర్తుకే మన ఓటు</span>
              </div>
              <span className="text-[10px] text-slate-500 font-mono mt-1">
                ముద్రణ తేదీ: {todayDate}
              </span>
            </div>
          </div>

          {/* Group Title Banner */}
          <div className="mt-2.5 pt-2 border-t border-slate-200 flex items-center justify-between flex-wrap gap-2">
            <div>
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                గ్రూప్ / వంశ ఓటర్ల జాబితా (Voter Roster)
              </span>
              <h2 className="text-base sm:text-lg font-black text-slate-900">
                {title}
              </h2>
            </div>
            <div className="text-right text-[11px] text-slate-700 font-medium">
              <span>పోలింగ్ కేంద్రం: </span>
              <strong className="font-bold text-slate-900">{boothInfo.ps_address}</strong>
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
              <span className="text-[9.5px] text-slate-500 block uppercase font-bold">జనసేన మద్దతు / స్వింగ్</span>
              <span className="font-mono font-black text-sm text-emerald-800">
                🚩 {stats.jsp} / ⚡ {stats.swing}
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
                const prof = voterSno ? profiles[voterSno] || {} : {};
                const phone = prof.customPhone || v.k_m;
                const pct = prof.supportPct !== undefined ? prof.supportPct : (v.kriya ? 100 : 50);

                const voterId = v.id || (v as any).epic || '';
                const voterName = v.n || ((v as any).name_en && (v as any).name_te ? `${(v as any).name_en} (${(v as any).name_te})` : (v as any).name_te || (v as any).name_en || '');
                const voterRel = v.r || ((v as any).rel_name_en && (v as any).rel_name_te ? `${(v as any).rel_name_en} (${(v as any).rel_name_te})` : (v as any).rel_name_te || (v as any).rel_name_en || '');
                const voterAge = v.a || (v as any).age || '';
                const isMale = v.g === 'M' || (v as any).gender_en === 'Male' || (v as any).gender_te === 'పురుషుడు';
                const voterHn = v.hn || (v as any).house_no || '';

                let leaningText = '50% తటస్థ';
                let leaningColor = 'text-amber-800';
                if (pct === 100) {
                  leaningText = '🚩 100% JSP';
                  leaningColor = 'text-red-700 font-black';
                } else if (pct >= 75) {
                  leaningText = '🚩 75% అనుకూలం';
                  leaningColor = 'text-emerald-800 font-bold';
                } else if (pct === 40) {
                  leaningText = '⚡ 40% స్వింగ్';
                  leaningColor = 'text-amber-800';
                } else if (pct === 0) {
                  leaningText = 'వ్యతిరేకం';
                  leaningColor = 'text-slate-600';
                }

                return (
                  <tr
                    key={voterSno || index}
                    className="hover:bg-slate-50 transition-colors print-zebra"
                  >
                    {/* Index */}
                    <td className="py-1 px-1 text-center font-mono text-slate-500 border-r border-slate-200">
                      {index + 1}
                    </td>

                    {/* Booth Serial No */}
                    <td className="py-1 px-1.5 text-center font-mono font-black text-slate-900 border-r border-slate-200">
                      #{voterSno}
                    </td>

                    {/* EPIC */}
                    <td className="py-1 px-1.5 font-mono text-[9.5px] font-bold text-slate-800 border-r border-slate-200">
                      {voterId}
                    </td>

                    {/* Voter Name */}
                    <td className="py-1 px-2 font-bold text-slate-950 border-r border-slate-200">
                      <div className="leading-tight">
                        <span>{voterName}</span>
                        {v.kriya && (
                          <span className="ml-1 text-[8.5px] bg-red-100 text-red-800 px-1 py-0.2 rounded font-black border border-red-300">
                            🚩 క్రియ
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Relation */}
                    {showRelation && (
                      <td className="py-1 px-1.5 text-slate-700 truncate max-w-[120px] border-r border-slate-200">
                        {voterRel || '—'}
                      </td>
                    )}

                    {/* Age / Gender */}
                    <td className="py-1 px-1.5 text-center font-mono text-slate-800 border-r border-slate-200">
                      {voterAge} / {isMale ? 'పు' : 'మ'}
                    </td>

                    {/* House No */}
                    <td className="py-1 px-1.5 text-center font-mono font-bold text-slate-900 border-r border-slate-200">
                      {voterHn || '—'}
                    </td>

                    {/* Phone / Kriya Mobile */}
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

                    {/* Leaning */}
                    {showLeaning && (
                      <td className={`py-1 px-1.5 text-center text-[9px] border-r border-slate-200 ${leaningColor}`}>
                        {leaningText}
                      </td>
                    )}

                    {/* Polling Checkbox */}
                    {showPollCheckbox && (
                      <td className="py-1 px-1 text-center border-r border-slate-200">
                        <div className="inline-flex items-center gap-1 border border-slate-400 rounded px-1.5 py-0.5">
                          <span className="w-2.5 h-2.5 border border-slate-600 rounded-sm inline-block" />
                          <span className="text-[8.5px] text-slate-600">వేశారు</span>
                        </div>
                      </td>
                    )}

                    {/* Notes */}
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

        {/* Official Footer Section */}
        <div className="mt-4 pt-3 border-t-2 border-slate-900 flex items-center justify-between text-[9.5px] text-slate-600">
          <div>
            <p className="font-bold text-slate-800">
              జనసేన పార్టీ పిఠాపురం నియోజకవర్గ కేంద్ర సమన్వయ కార్యాలయం • పవన్ కళ్యాణ్ గారి నాయకత్వం
            </p>
            <p className="text-[8.5px] text-slate-500">
              ఈ జాబితా పోలింగ్ ఏజెంట్లు మరియు బూత్ కార్యకర్తల క్షేత్రస్థాయి వినియోగానికి మాత్రమే ఉద్దేశించబడింది.
            </p>
          </div>
          <div className="text-right font-mono font-bold text-slate-800">
            <span>గాజు గ్లాసు గుర్తు • గెలుపే మన లక్ష్యం 🚩</span>
          </div>
        </div>
      </div>
    </div>
  );
};
