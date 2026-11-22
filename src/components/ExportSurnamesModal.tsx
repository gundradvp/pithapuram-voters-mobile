import React, { useState, useMemo } from 'react';
import {
  X,
  Download,
  FileSpreadsheet,
  FileText,
  Copy,
  CheckCircle2,
  Building,
  Award,
  Sparkles,
  Share2,
  Check,
  ArrowUpDown
} from 'lucide-react';
import { BoothInfo, VoterCampaignProfile } from '../types';
import { Language } from '../utils/i18n';
import { SurnameGroup } from '../utils/surnameClassifier';
import {
  exportSurnamesSummaryCsv,
  exportDetailedSurnamesVotersCsv,
  generateSurnamesWhatsAppText,
  generateSingleClanWhatsAppText,
  formatSnoRanges
} from '../utils/surnameExporter';
import { exportVotersBySurnameExcel } from '../utils/voterExcelExporter';

export interface ExportSurnamesModalProps {
  isOpen: boolean;
  boothInfo: BoothInfo;
  clans: SurnameGroup[];
  profiles?: Record<number, VoterCampaignProfile>;
  initialClanId?: string;
  language?: Language;
  onClose: () => void;
}

export const ExportSurnamesModal: React.FC<ExportSurnamesModalProps> = ({
  isOpen,
  boothInfo,
  clans,
  profiles = {},
  initialClanId,
  language = 'te',
  onClose
}) => {
  const [scope, setScope] = useState<'all' | 'top10' | 'swing' | 'single'>(() => {
    return initialClanId ? 'single' : 'all';
  });
  const [selectedSingleClanId, setSelectedSingleClanId] = useState<string>(() => {
    return initialClanId || clans[0]?.id || '';
  });
  const [copiedType, setCopiedType] = useState<'all' | string | null>(null);

  const targetClans = useMemo(() => {
    if (scope === 'single') {
      const single = clans.find(c => c.id === selectedSingleClanId);
      return single ? [single] : clans.slice(0, 1);
    }
    if (scope === 'top10') {
      return clans.slice(0, 10);
    }
    if (scope === 'swing') {
      return clans.filter(c => c.neutralCount > 0);
    }
    return clans;
  }, [clans, scope, selectedSingleClanId]);

  if (!isOpen) return null;

  const totalVoters = targetClans.reduce((a, b) => a + b.totalVoters, 0);

  const handleExportSummary = () => {
    exportSurnamesSummaryCsv(boothInfo, targetClans);
  };

  const handleExportSurname9 = () => {
    const clanVoters = targetClans.flatMap(c => c.voters);
    exportVotersBySurnameExcel({
      voters: clanVoters,
      profiles,
      boothInfo,
      scopeTitle: `ఇంటిపేర్ల క్రమంలో ఓటర్ల జాబితా (${targetClans.length} వంశాలు)`,
      filePrefix: 'Clans_By_Surname',
      format: 'surname_9_fields'
    });
  };

  const handleExportDetailed = () => {
    exportDetailedSurnamesVotersCsv(boothInfo, targetClans, profiles);
  };

  const handleCopyWhatsApp = () => {
    const text = generateSurnamesWhatsAppText(boothInfo, targetClans);
    navigator.clipboard.writeText(text);
    setCopiedType('all');
    setTimeout(() => setCopiedType(null), 2500);
  };

  const handleCopySingleClan = (clan: SurnameGroup) => {
    const text = generateSingleClanWhatsAppText(boothInfo, clan);
    navigator.clipboard.writeText(text);
    setCopiedType(clan.id);
    setTimeout(() => setCopiedType(null), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-xl bg-slate-900 border border-slate-800 rounded-t-3xl sm:rounded-2xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden animate-in slide-in-from-bottom duration-300">
        
        {/* Header */}
        <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-gradient-to-r from-amber-950/30 via-slate-900 to-slate-900">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-amber-500/20 text-amber-300 border border-amber-500/40 flex items-center justify-center">
              <Download className="w-5 h-5 text-amber-400" />
            </div>
            <div>
              <h2 className="text-sm font-black text-white flex items-center gap-1.5">
                <span>{language === 'te' ? 'ఇంటిపేర్లు & క్రమ సంఖ్యల ఎగుమతి' : 'Export Surnames & Serial Numbers'}</span>
              </h2>
              <p className="text-[11px] text-slate-400">
                {language === 'te'
                  ? `బూత్ #${boothInfo.part_no || boothInfo.ward_no} (${boothInfo.clean_village || 'పిఠాపురం'}) • CSV & WhatsApp`
                  : `Booth #${boothInfo.part_no || boothInfo.ward_no} • CSV & WhatsApp Export`}
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
          
          {/* Scope Selector */}
          <div>
            <label className="text-[11px] font-bold text-slate-300 block mb-1.5">
              🎯 {language === 'te' ? 'ఎగుమతి పరిధి (Scope):' : 'Export Scope:'}
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
              <button
                type="button"
                onClick={() => setScope('all')}
                className={`py-2 px-2.5 rounded-xl text-[11px] font-bold border transition-all text-center ${
                  scope === 'all'
                    ? 'bg-amber-500 text-slate-950 font-black border-amber-400 shadow-md'
                    : 'bg-slate-950 text-slate-300 border-slate-800 hover:border-slate-700'
                }`}
              >
                {language === 'te' ? `అన్ని వంశాలు (${clans.length})` : `All (${clans.length})`}
              </button>

              <button
                type="button"
                onClick={() => setScope('top10')}
                className={`py-2 px-2.5 rounded-xl text-[11px] font-bold border transition-all text-center flex items-center justify-center gap-1 ${
                  scope === 'top10'
                    ? 'bg-amber-500 text-slate-950 font-black border-amber-400 shadow-md'
                    : 'bg-slate-950 text-slate-300 border-slate-800 hover:border-slate-700'
                }`}
              >
                <Award className="w-3 h-3 text-red-400" />
                <span>{language === 'te' ? 'టాప్ 10 వంశాలు' : 'Top 10'}</span>
              </button>

              <button
                type="button"
                onClick={() => setScope('swing')}
                className={`py-2 px-2.5 rounded-xl text-[11px] font-bold border transition-all text-center flex items-center justify-center gap-1 ${
                  scope === 'swing'
                    ? 'bg-amber-500 text-slate-950 font-black border-amber-400 shadow-md'
                    : 'bg-slate-950 text-slate-300 border-slate-800 hover:border-slate-700'
                }`}
              >
                <Sparkles className="w-3 h-3 text-cyan-400" />
                <span>{language === 'te' ? 'స్వింగ్ వంశాలు' : 'Swing'}</span>
              </button>

              <button
                type="button"
                onClick={() => setScope('single')}
                className={`py-2 px-2.5 rounded-xl text-[11px] font-bold border transition-all text-center ${
                  scope === 'single'
                    ? 'bg-amber-500 text-slate-950 font-black border-amber-400 shadow-md'
                    : 'bg-slate-950 text-slate-300 border-slate-800 hover:border-slate-700'
                }`}
              >
                {language === 'te' ? 'ఒక వంశం' : 'Single Clan'}
              </button>
            </div>

            {/* Single clan selector dropdown if single mode */}
            {scope === 'single' && (
              <div className="mt-2">
                <select
                  value={selectedSingleClanId}
                  onChange={(e) => setSelectedSingleClanId(e.target.value)}
                  className="w-full bg-slate-950 border border-amber-500/50 rounded-xl px-3 py-2 text-xs font-bold text-amber-300 focus:outline-none"
                >
                  {clans.map((c, i) => (
                    <option key={c.id} value={c.id}>
                      #{i + 1} {c.nameTe || c.nameEn} ({c.nameEn}) — {c.totalVoters} ఓటర్లు
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>

          {/* Quick Stat Pill */}
          <div className="p-3 bg-slate-950/80 border border-slate-800 rounded-2xl flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Building className="w-4 h-4 text-amber-400" />
              <span className="text-slate-300">
                {language === 'te'
                  ? `ఎంచుకున్నవి: ${targetClans.length} ఇంటిపేర్లు`
                  : `Selected: ${targetClans.length} Surnames`}
              </span>
            </div>
            <div className="font-mono font-black text-amber-400 text-xs">
              {totalVoters} {language === 'te' ? 'ఓటర్లు (S.Nos)' : 'Voters'}
            </div>
          </div>

          {/* Action Download Buttons */}
          <div className="space-y-2.5">
            <label className="text-[11px] font-bold text-slate-300 block">
              ⚡ {language === 'te' ? 'ఎగుమతి ఎంపికలు (Download & Copy):' : 'Export Actions:'}
            </label>

            {/* 0. Order by Surname 9 Fields CSV (Exact Match to Request) */}
            <button
              type="button"
              onClick={handleExportSurname9}
              className="w-full p-3.5 bg-gradient-to-r from-emerald-950/70 via-slate-900 to-slate-900 border-2 border-emerald-500 hover:border-emerald-400 rounded-2xl flex items-center justify-between text-left transition-all active:scale-[0.99] shadow-lg shadow-emerald-950/50 group cursor-pointer"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-500 text-slate-950 flex items-center justify-center font-black shrink-0 shadow-md">
                  <ArrowUpDown className="w-5 h-5 text-slate-950" />
                </div>
                <div>
                  <h4 className="text-xs font-black text-white flex items-center gap-1.5 group-hover:text-amber-300 transition-colors">
                    <span>{language === 'te' ? 'ఇంటిపేర్ల క్రమంలో ఎక్సెల్ (9 కాలమ్‌లు)' : 'Order by Surname CSV (9 Columns)'}</span>
                    <span className="px-1.5 py-0.2 bg-emerald-500 text-slate-950 text-[9px] rounded font-mono font-black">
                      RECOMMENDED
                    </span>
                  </h4>
                  <p className="text-[10.5px] text-slate-300">
                    {language === 'te'
                      ? 'S.No, ఓటరు పేరు, ఇంటి పేరు, సంబంధీకుడు, House No, Age, Gender, EPIC ID, PHONE'
                      : 'Exact 9 fields sorted alphabetically by Surname (Telugu A-Z)'}
                  </p>
                </div>
              </div>
              <Download className="w-4 h-4 text-emerald-400 group-hover:translate-y-0.5 transition-transform shrink-0" />
            </button>

            {/* 1. Summary CSV */}
            <button
              type="button"
              onClick={handleExportSummary}
              className="w-full p-3 bg-gradient-to-r from-emerald-950/50 to-slate-900 border border-emerald-500/50 hover:border-emerald-400 rounded-2xl flex items-center justify-between text-left transition-all active:scale-[0.99] shadow-sm hover:shadow-emerald-950/50"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-300 flex items-center justify-center border border-emerald-500/40 shrink-0">
                  <FileSpreadsheet className="w-5 h-5 text-emerald-400" />
                </div>
                <div>
                  <h4 className="text-xs font-black text-white flex items-center gap-1.5">
                    <span>{language === 'te' ? 'సారాంశం CSV ఎక్సెల్ డౌన్‌లోడ్' : 'Summary CSV Download'}</span>
                    <span className="px-1.5 py-0.2 bg-emerald-500/20 text-emerald-300 text-[9px] rounded font-mono font-bold">
                      EXCEL / SHEETS
                    </span>
                  </h4>
                  <p className="text-[10.5px] text-slate-400">
                    {language === 'te'
                      ? 'ప్రతి ఇంటిపేరు, మొత్తం ఓట్లు, మరియు వాటి పూర్తి క్రమ సంఖ్యల జాబితా (1, 4, 12, 15...)'
                      : 'Each surname row with total count & complete list of S.Nos'}
                  </p>
                </div>
              </div>
              <Download className="w-4 h-4 text-emerald-400 shrink-0" />
            </button>

            {/* 2. Detailed Voter-by-Voter CSV */}
            <button
              type="button"
              onClick={handleExportDetailed}
              className="w-full p-3 bg-gradient-to-r from-blue-950/50 to-slate-900 border border-blue-500/50 hover:border-blue-400 rounded-2xl flex items-center justify-between text-left transition-all active:scale-[0.99] shadow-sm hover:shadow-blue-950/50"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-500/20 text-blue-300 flex items-center justify-center border border-blue-500/40 shrink-0">
                  <FileText className="w-5 h-5 text-blue-400" />
                </div>
                <div>
                  <h4 className="text-xs font-black text-white flex items-center gap-1.5">
                    <span>{language === 'te' ? 'ఓటర్ల వారీ పూర్తి CSV' : 'Detailed Voter-by-Voter CSV'}</span>
                    <span className="px-1.5 py-0.2 bg-blue-500/20 text-blue-300 text-[9px] rounded font-mono font-bold">
                      {totalVoters} ROWS
                    </span>
                  </h4>
                  <p className="text-[10.5px] text-slate-400">
                    {language === 'te'
                      ? 'ఇంటిపేర్ల క్రమంలో ప్రతి ఓటరు S.No, పేరు, రిలేషన్, ఇంటి నెం, ఫోన్, EPIC ID'
                      : 'All voters sorted by clan with S.No, Name, Relative, House, Phone, EPIC'}
                  </p>
                </div>
              </div>
              <Download className="w-4 h-4 text-blue-400 shrink-0" />
            </button>

            {/* 3. Copy WhatsApp text */}
            <button
              type="button"
              onClick={handleCopyWhatsApp}
              className={`w-full p-3 border rounded-2xl flex items-center justify-between text-left transition-all active:scale-[0.99] shadow-sm ${
                copiedType === 'all'
                  ? 'bg-amber-500/20 border-amber-500 text-amber-200'
                  : 'bg-gradient-to-r from-amber-950/40 to-slate-900 border-amber-500/50 hover:border-amber-400'
              }`}
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-300 flex items-center justify-center border border-amber-500/40 shrink-0">
                  {copiedType === 'all' ? (
                    <Check className="w-5 h-5 text-emerald-400" />
                  ) : (
                    <Copy className="w-5 h-5 text-amber-400" />
                  )}
                </div>
                <div>
                  <h4 className="text-xs font-black text-white flex items-center gap-1.5">
                    <span>
                      {copiedType === 'all'
                        ? (language === 'te' ? 'క్లిప్‌బోర్డ్‌కు కాపీ అయ్యింది! ✓' : 'Copied to Clipboard! ✓')
                        : (language === 'te' ? 'వాట్సాప్ టెక్స్ట్ కాపీ (Copy Text)' : 'Copy WhatsApp Text')}
                    </span>
                    <span className="px-1.5 py-0.2 bg-amber-500/20 text-amber-300 text-[9px] rounded font-mono font-bold">
                      WHATSAPP READY
                    </span>
                  </h4>
                  <p className="text-[10.5px] text-slate-400">
                    {language === 'te'
                      ? 'వాట్సాప్ గ్రూపుల్లో సులువుగా పంపడానికి ఫార్మాట్ చేసిన టెక్స్ట్ మెసేజ్'
                      : 'Formatted text ready to paste into WhatsApp groups or notes'}
                  </p>
                </div>
              </div>
              <Share2 className="w-4 h-4 text-amber-400 shrink-0" />
            </button>
          </div>

          {/* S.No Preview List of Selected Clans */}
          <div className="space-y-2 pt-2">
            <div className="flex items-center justify-between text-[11px] text-slate-400">
              <span className="font-bold text-slate-300">
                👀 {language === 'te' ? 'క్రమ సంఖ్యల ప్రివ్యూ (Preview):' : 'Serial Numbers Preview:'}
              </span>
              <span>{targetClans.length} Clans</span>
            </div>

            <div className="max-h-56 overflow-y-auto space-y-2 pr-1 scrollbar-thin">
              {targetClans.map((c, idx) => {
                const snos = c.voters.map(v => v.s).sort((a, b) => a - b);
                const isCopied = copiedType === c.id;

                return (
                  <div
                    key={c.id}
                    className="p-2.5 bg-slate-950 border border-slate-800 rounded-xl space-y-1.5 hover:border-slate-700 transition-colors"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5">
                        <span className="w-4 h-4 rounded-full bg-slate-800 text-[9.5px] font-black text-amber-400 flex items-center justify-center font-mono">
                          #{idx + 1}
                        </span>
                        <span className="font-bold text-white text-xs">
                          {c.nameTe || c.nameEn}
                        </span>
                        <span className="text-slate-400 text-[10px] font-mono">
                          ({c.nameEn})
                        </span>
                        <span className="text-amber-400 font-bold font-mono text-[10.5px]">
                          • {c.totalVoters} ఓట్లు
                        </span>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleCopySingleClan(c)}
                        className="px-2 py-0.5 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded text-[10px] font-bold flex items-center gap-1 border border-slate-700 active:scale-95 transition-all"
                        title={language === 'te' ? 'ఈ ఒక్క వంశం S.No లు కాపీ చేయండి' : 'Copy this clan S.Nos'}
                      >
                        {isCopied ? (
                          <>
                            <Check className="w-2.5 h-2.5 text-emerald-400" />
                            <span className="text-emerald-300">కాపీడ్</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-2.5 h-2.5 text-amber-400" />
                            <span>కాపీ</span>
                          </>
                        )}
                      </button>
                    </div>

                    {/* S.No List Display */}
                    <div className="bg-slate-900/80 rounded-lg p-1.5 font-mono text-[10px] text-slate-300 leading-relaxed border border-slate-800/80 break-words">
                      <span className="text-amber-400 font-bold mr-1">S.Nos:</span>
                      {snos.join(', ')}
                    </div>

                    {snos.length > 3 && (
                      <div className="text-[9.5px] text-slate-400 font-mono flex items-center gap-1">
                        <span className="text-slate-500">శ్రేణి:</span>
                        <span>{formatSnoRanges(snos)}</span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

        </div>

        {/* Footer */}
        <div className="p-3 border-t border-slate-800 bg-slate-950 flex items-center justify-between">
          <span className="text-[10px] text-slate-500">
            JSP Pithapuram Election IT System
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-bold transition-colors"
          >
            {language === 'te' ? 'మూసివేయి' : 'Close'}
          </button>
        </div>

      </div>
    </div>
  );
};
