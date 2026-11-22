import React, { useMemo } from 'react';
import {
  X,
  Download,
  FileSpreadsheet,
  Layers,
  ArrowUpDown,
  Table,
  CheckCircle2,
  FileText
} from 'lucide-react';
import { BoothInfo, MobileVoter, VoterCampaignProfile } from '../types';
import { Language } from '../utils/i18n';
import { exportVotersBySurnameExcel, exportVotersToExcelCsv } from '../utils/voterExcelExporter';
import { extractSurname } from '../utils/surnameClassifier';

export interface ExportExcelModalProps {
  isOpen: boolean;
  voters: MobileVoter[];
  profiles?: Record<number, VoterCampaignProfile>;
  boothInfo: BoothInfo;
  scopeTitle?: string;
  filePrefix?: string;
  language?: Language;
  onClose: () => void;
}

export const ExportExcelModal: React.FC<ExportExcelModalProps> = ({
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
