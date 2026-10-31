import React, { useState } from 'react';
import { X, AlertTriangle, CheckCircle2, Copy, FileText, Phone, ShieldAlert, Users, ExternalLink } from 'lucide-react';
import { MobileVoter } from '../types';
import { Language } from '../utils/i18n';
import { DuplicateMatchLevel } from '../utils/duplicateDetector';

interface DuplicateCompareModalProps {
  voters: MobileVoter[];
  reasonTe: string;
  reasonEn: string;
  confidencePct: number;
  matchLevel: DuplicateMatchLevel;
  language?: Language;
  onClose: () => void;
  onOpenSlip: (voter: MobileVoter) => void;
}

export const DuplicateCompareModal: React.FC<DuplicateCompareModalProps> = ({
  voters,
  reasonTe,
  reasonEn,
  confidencePct,
  matchLevel,
  language = 'te',
  onClose,
  onOpenSlip
}) => {
  const [copiedId, setCopiedId] = useState<string | null>(null);

  if (!voters || voters.length < 2) return null;

  const handleCopy = (text: string, id: string) => {
    try {
      navigator.clipboard.writeText(text);
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
    } catch {}
  };

  const isExactEpic = matchLevel === 'exact' && voters.every(v => v.id && v.id === voters[0].id);

  // Compare helpers to highlight identical values in green
  const allSameName = voters.every(v => (v.n || '').trim().toLowerCase() === (voters[0].n || '').trim().toLowerCase());
  const allSameRel = voters.every(v => (v.r || '').trim().toLowerCase() === (voters[0].r || '').trim().toLowerCase());
  const allSameHn = voters.every(v => (v.hn || '').trim().toLowerCase() === (voters[0].hn || '').trim().toLowerCase());
  const allSameAge = voters.every(v => v.a === voters[0].a);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-amber-500/50 rounded-3xl max-w-2xl w-full max-h-[92vh] flex flex-col shadow-2xl overflow-hidden text-xs">
        {/* Header */}
        <div className="p-4 bg-gradient-to-r from-red-950/80 via-slate-900 to-amber-950/80 border-b border-amber-500/30 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-2xl bg-amber-500/20 text-amber-400 border border-amber-500/40 flex items-center justify-center text-lg shadow-inner">
              <AlertTriangle className="w-5 h-5 text-amber-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-black text-white">
                  {language === 'te' ? 'డూప్లికేట్ / డబుల్ ఓట్ల పోలిక' : 'Duplicate Voter Analysis'}
                </h2>
                <span className={`px-2 py-0.5 rounded-full font-mono text-[10px] font-black border ${
                  matchLevel === 'exact'
                    ? 'bg-rose-950 text-rose-300 border-rose-500/60'
                    : 'bg-amber-950 text-amber-300 border-amber-500/60'
                }`}>
                  {confidencePct}% {language === 'te' ? 'సమానత' : 'Match'}
                </span>
              </div>
              <p className="text-[11px] text-amber-300/90 font-medium">
                {language === 'te' ? reasonTe : reasonEn} ({voters.length} {language === 'te' ? 'ఎంట్రీలు ఒకే వ్యక్తిగా గుర్తించబడ్డాయి' : 'Entries identified'})
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-300 flex items-center justify-center transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Polling Agent Tactical Tip */}
        <div className="px-4 py-2 bg-amber-500/10 border-b border-amber-500/20 flex items-start gap-2 text-[10.5px] text-amber-200">
          <ShieldAlert className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
          <span>
            {language === 'te' ? (
              <>
                <strong>పోలింగ్ బూత్ ఏజెంట్ హెచ్చరిక:</strong> ఒకే వ్యక్తి రెండు వేర్వేరు క్రమ సంఖ్యలలో (S.No) నమోదై ఉన్నట్లు కనిపిస్తోంది. పోలింగ్ రోజున రెండుసార్లు ఓటు వేయకుండా బూత్ ఏజెంట్లకు ఈ వివరాలు సమర్పించి <strong>ఛాలెంజ్ ఓటు (Rule 49P / Form 14)</strong> దాఖలు చేయండి.
              </>
            ) : (
              <>
                <strong>Booth Polling Agent Alert:</strong> Appears to be the same person enrolled across multiple serial numbers. Guard against double-voting on poll day.
              </>
            )}
          </span>
        </div>

        {/* Body: Side by Side Comparison Grid */}
        <div className="p-4 overflow-y-auto space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {voters.map((v, idx) => {
              const isFirst = idx === 0;
              const phone = v.k_m || (v as any).mobile;

              return (
                <div
                  key={v.s}
                  className="bg-slate-950/80 border border-slate-800 hover:border-amber-500/40 rounded-2xl p-3.5 space-y-3 shadow-md relative"
                >
                  {/* Card Title */}
                  <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                    <div className="flex items-center gap-1.5">
                      <span className="w-6 h-6 rounded-full bg-amber-500/20 text-amber-300 font-mono text-xs font-black flex items-center justify-center border border-amber-500/40">
                        #{v.s}
                      </span>
                      <span className="font-mono text-xs font-bold text-emerald-400 bg-slate-900 px-2 py-0.5 rounded border border-slate-800">
                        {v.id || 'NO-EPIC'}
                      </span>
                    </div>

                    <button
                      onClick={() => onOpenSlip(v)}
                      className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-amber-300 rounded-lg font-bold text-[10px] flex items-center gap-1 border border-slate-700 shadow-sm"
                    >
                      <FileText className="w-3 h-3 text-amber-400" />
                      <span>{language === 'te' ? 'స్లిప్ / కార్డు' : 'Card'}</span>
                    </button>
                  </div>

                  {/* Field Values */}
                  <div className="space-y-2 text-[11px]">
                    <div>
                      <span className="text-[10px] text-slate-500 uppercase font-bold block">
                        {language === 'te' ? 'ఓటరు పేరు:' : 'Voter Name:'}
                      </span>
                      <div className={`font-black text-sm flex items-center justify-between ${allSameName ? 'text-emerald-300' : 'text-white'}`}>
                        <span>{v.n}</span>
                        {allSameName && <span className="text-[9px] text-emerald-400 font-bold bg-emerald-950/60 px-1.5 py-0.2 rounded border border-emerald-500/30">100% సేమ్</span>}
                      </div>
                      {(v as any).name_te && (v as any).name_te !== v.n && (
                        <span className="text-[10px] text-slate-400 font-bold">{(v as any).name_te}</span>
                      )}
                    </div>

                    <div>
                      <span className="text-[10px] text-slate-500 uppercase font-bold block">
                        {language === 'te' ? 'బంధువు పేరు (తండ్రి/భర్త):' : 'Relative Name:'}
                      </span>
                      <div className={`font-bold flex items-center justify-between ${allSameRel ? 'text-emerald-300' : 'text-slate-200'}`}>
                        <span>{v.r || '-'}</span>
                        {allSameRel && <span className="text-[9px] text-emerald-400 font-bold bg-emerald-950/60 px-1.5 py-0.2 rounded border border-emerald-500/30">సేమ్</span>}
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <span className="text-[10px] text-slate-500 uppercase font-bold block">
                          {language === 'te' ? 'ఇంటి నెం:' : 'House No:'}
                        </span>
                        <span className={`font-mono font-bold ${allSameHn ? 'text-emerald-300' : 'text-amber-300'}`}>
                          {v.hn || '-'}
                        </span>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-500 uppercase font-bold block">
                          {language === 'te' ? 'వయస్సు / లింగం:' : 'Age / Gender:'}
                        </span>
                        <span className={`font-bold ${allSameAge ? 'text-emerald-300' : 'text-slate-300'}`}>
                          {v.a}Y • {v.g === 'M' ? (language === 'te' ? 'పురుషుడు (M)' : 'Male') : (language === 'te' ? 'మహిళ (F)' : 'Female')}
                        </span>
                      </div>
                    </div>

                    <div>
                      <span className="text-[10px] text-slate-500 uppercase font-bold block">
                        {language === 'te' ? 'పోలింగ్ కేంద్రం / వార్డు / సెక్షన్:' : 'Polling Station / Section:'}
                      </span>
                      <span className="text-slate-400 text-[10px] block leading-tight">
                        {v.sec || (v as any).polling_station_name || 'బూత్ సెక్షన్'}
                      </span>
                    </div>

                    {phone && (
                      <div className="pt-1 flex items-center justify-between bg-slate-900 p-2 rounded-xl border border-slate-800">
                        <div className="flex items-center gap-1.5">
                          <Phone className="w-3 h-3 text-emerald-400" />
                          <span className="font-mono text-emerald-300 font-bold">{phone}</span>
                        </div>
                        <a
                          href={`tel:${phone}`}
                          className="px-2 py-0.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded font-bold text-[9px]"
                        >
                          కాల్
                        </a>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Quick Summary of Match */}
          <div className="bg-slate-950 p-3 rounded-2xl border border-slate-800 space-y-1.5 text-[11px] text-slate-400">
            <h4 className="text-xs font-bold text-white flex items-center gap-1.5">
              <span>🔍</span> {language === 'te' ? 'విశ్లేషణ సారాంశం (Verdict):' : 'Analysis Summary:'}
            </h4>
            <ul className="list-disc list-inside space-y-0.5 text-slate-300">
              {isExactEpic ? (
                <li className="text-rose-400 font-bold">
                  {language === 'te' ? 'రెండు ఎంట్రీలలో ఒకే EPIC ID (ఓటర్ కార్డు నంబర్) ఉంది. ఇది పక్కా డబుల్ నమోదు!' : 'Both entries share identical EPIC voter ID!'}
                </li>
              ) : (
                <li>
                  {language === 'te' ? 'ఓటరు పేరు, తండ్రి/భర్త పేరు మరియు వివరాలు దాదాపు సమానంగా ఉన్నాయి.' : 'Names and relatives closely match.'}
                </li>
              )}
              {allSameHn && (
                <li>
                  {language === 'te' ? 'ఇద్దరికీ ఒకే ఇంటి నంబర్ నమోదు అయింది.' : 'Enrolled under the same house number.'}
                </li>
              )}
            </ul>
          </div>
        </div>

        {/* Footer */}
        <div className="p-3 bg-slate-950 border-t border-slate-800 flex items-center justify-between gap-2">
          <button
            onClick={() => {
              const text = `🚨 పిఠాపురం డూప్లికేట్ ఓటు అలెర్ట్:\n` +
                voters.map(v => `• SNo: #${v.s} | EPIC: ${v.id} | పేరు: ${v.n} | బంధువు: ${v.r} | ఇల్లు: ${v.hn} | వయస్సు: ${v.a}Y`).join('\n') +
                `\nవివరణ: ${reasonTe}`;
              handleCopy(text, 'share_dup');
            }}
            className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-amber-300 rounded-xl font-bold flex items-center gap-1.5 text-xs transition-colors"
          >
            {copiedId === 'share_dup' ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5 text-amber-400" />}
            <span>{copiedId === 'share_dup' ? (language === 'te' ? 'కాపీ అయింది!' : 'Copied!') : (language === 'te' ? 'వివరాలు కాపీ చేయండి' : 'Copy Alert')}</span>
          </button>

          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-gradient-to-r from-red-600 to-amber-600 hover:from-red-500 hover:to-amber-500 text-white font-black rounded-xl text-xs shadow-md transition-all"
          >
            {language === 'te' ? 'సరే (Close)' : 'Close'}
          </button>
        </div>
      </div>
    </div>
  );
};
