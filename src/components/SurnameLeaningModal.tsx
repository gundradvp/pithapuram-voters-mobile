import React, { useState } from 'react';
import { X, Check, Flag, Sparkles, AlertCircle, ThumbsUp, ThumbsDown, Building, Banknote, ShieldAlert, ShieldCheck } from 'lucide-react';
import { Language, translations } from '../utils/i18n';
import { SurnameGroup } from '../utils/surnameClassifier';
import { MoneyInfluenceStatus } from '../types';

interface SurnameLeaningModalProps {
  isOpen: boolean;
  surnames: SurnameGroup[];
  initialSurnameId?: string;
  language?: Language;
  onApply: (
    surnameId: string,
    supportPct: number,
    moneyStatus: MoneyInfluenceStatus,
    overrideExisting: boolean,
    notes?: string
  ) => void;
  onClose: () => void;
}

export const SurnameLeaningModal: React.FC<SurnameLeaningModalProps> = ({
  isOpen,
  surnames,
  initialSurnameId,
  language = 'te',
  onApply,
  onClose
}) => {
  const [selectedId, setSelectedId] = useState<string>(initialSurnameId || surnames[0]?.id || '');
  const [pct, setPct] = useState<number>(75);
  const [moneyStatus, setMoneyStatus] = useState<MoneyInfluenceStatus>('none');
  const [overrideExisting, setOverrideExisting] = useState<boolean>(false);
  const [notes, setNotes] = useState<string>('');

  if (!isOpen) return null;

  const currentClan = surnames.find(s => s.id === selectedId) || surnames[0];

  const presets = language === 'te' ? [
    { pct: 100, label: '100% మనవాళ్లే (పక్కా మద్దతు)', badge: 'bg-red-600/30 text-red-300 border-red-500/50', icon: Flag },
    { pct: 75, label: '75% మనకే అనుకూలం (మెజారిటీ)', badge: 'bg-emerald-600/30 text-emerald-300 border-emerald-500/50', icon: ThumbsUp },
    { pct: 50, label: '50% ఎటూ తేల్చుకోలేదు (స్వింగ్)', badge: 'bg-slate-700/60 text-slate-300 border-slate-600', icon: Sparkles },
    { pct: 40, label: '40% సానుకూలం (ప్రయత్నిస్తే పడతారు)', badge: 'bg-amber-600/30 text-amber-300 border-amber-500/50', icon: ThumbsUp },
    { pct: 25, label: '25% అనుమానం (డౌట్‌ఫుల్)', badge: 'bg-orange-600/30 text-orange-300 border-orange-500/50', icon: AlertCircle },
    { pct: 0, label: '0% ప్రత్యర్థులు (మారరు)', badge: 'bg-rose-950/80 text-rose-400 border-rose-500/50', icon: ThumbsDown }
  ] : [
    { pct: 100, label: '100% Full Support (Committed)', badge: 'bg-red-600/30 text-red-300 border-red-500/50', icon: Flag },
    { pct: 75, label: '75% Strong Lean (Majority)', badge: 'bg-emerald-600/30 text-emerald-300 border-emerald-500/50', icon: ThumbsUp },
    { pct: 50, label: '50% Neutral / Swing', badge: 'bg-slate-700/60 text-slate-300 border-slate-600', icon: Sparkles },
    { pct: 40, label: '40% Soft Incline', badge: 'bg-amber-600/30 text-amber-300 border-amber-500/50', icon: ThumbsUp },
    { pct: 25, label: '25% Doubtful / Resistant', badge: 'bg-orange-600/30 text-orange-300 border-orange-500/50', icon: AlertCircle },
    { pct: 0, label: '0% Opponent (Committed Anti)', badge: 'bg-rose-950/80 text-rose-400 border-rose-500/50', icon: ThumbsDown }
  ];

  const moneyOptions: { status: MoneyInfluenceStatus; label: string; desc: string; icon: any; color: string }[] = [
    {
      status: 'none',
      label: language === 'te' ? 'సాధారణం (డబ్బు ప్రస్తావన లేదు)' : 'Normal (No cash factor)',
      desc: language === 'te' ? 'ఎటువంటి నగదు ప్రభావం లేదా పంపిణీ నమోదు కాలేదు' : 'Standard ground voter profile',
      icon: Banknote,
      color: 'border-slate-800 text-slate-400'
    },
    {
      status: 'opponent_paid_safe',
      label: language === 'te' ? '💰 ప్రత్యర్థి డబ్బు ఇచ్చారు — కానీ మనకే ఓటు' : '💰 Opponent Distributed Cash — Still Votes JSP',
      desc: language === 'te' ? 'డబ్బులు తీసుకున్నా పవన్ కళ్యాణ్ గారికి, గాజు గ్లాసుకే వేస్తారు' : 'Voters took money, but firmly stay with Glass symbol',
      icon: ShieldCheck,
      color: 'border-emerald-500/50 text-emerald-300 bg-emerald-950/20'
    },
    {
      status: 'opponent_paid_swung',
      label: language === 'te' ? '💸 డబ్బుతో మారిన ఓట్లు (ప్రత్యర్థి చేజిక్కించుకుంది)' : '💸 Bought by Opponent (Lost to cash)',
      desc: language === 'te' ? 'డబ్బు పంపిణీ ప్రభావంతో ప్రత్యర్థి వైపు తిరిగారు' : 'Swung to opposition due to heavy cash delivery',
      icon: ShieldAlert,
      color: 'border-rose-500/50 text-rose-300 bg-rose-950/20'
    },
    {
      status: 'at_risk_cash',
      label: language === 'te' ? '⚠️ డబ్బు ప్రభావం పడే అవకాశం ఉంది (రిస్క్)' : '⚠️ At Risk (Vulnerable to cash attack)',
      desc: language === 'te' ? 'ప్రత్యర్థి డబ్బులిస్తే మారే ప్రమాదం ఉంది, వెంటనే భరోసా ఇవ్వాలి' : 'Vulnerable electors needing immediate counter engagement',
      icon: AlertCircle,
      color: 'border-amber-500/50 text-amber-300 bg-amber-950/20'
    },
    {
      status: 'counter_secured',
      label: language === 'te' ? '🛡️ మన బృందం కౌంటర్ చేసి భరోసా ఇచ్చింది' : '🛡️ Countered & Secured by our team',
      desc: language === 'te' ? 'మన నాయకులు నేరుగా మాట్లాడి ఓటు భద్రపరిచారు' : 'Secured and committed through ground follow-up',
      icon: ShieldCheck,
      color: 'border-blue-500/50 text-blue-300 bg-blue-950/20'
    }
  ];

  const handleApply = () => {
    if (!currentClan) return;
    onApply(currentClan.id, pct, moneyStatus, overrideExisting, notes);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-sm flex items-end sm:items-center justify-center p-3 animate-in fade-in duration-150">
      <div className="bg-slate-900 border border-amber-500/50 rounded-3xl w-full max-w-lg p-4 sm:p-5 text-white space-y-4 shadow-2xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-amber-500/20 text-amber-400 rounded-xl">
              <Building className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm font-black text-white">
                {language === 'te' ? 'ఇంటిపేరు ఆధారిత మొగ్గు నమోదు' : 'Bulk Surname Leaning Assigner'}
              </h2>
              <p className="text-[10px] text-slate-400">
                {language === 'te' ? 'ఒకే ఇంటిపేరు గల ఓటర్లందరికీ ఒకే క్లిక్‌తో మొగ్గు సెట్ చేయండి' : 'Apply bulk sentiment & money factors across an entire clan'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Clan Selector */}
        <div className="space-y-1.5">
          <label className="text-[10px] uppercase font-bold text-slate-400 block">
            {language === 'te' ? 'ఇంటిపేరు ఎంచుకోండి:' : 'Select Surname Clan:'}
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5 max-h-36 overflow-y-auto pr-1">
            {surnames.slice(0, 18).map(s => (
              <button
                key={s.id}
                onClick={() => setSelectedId(s.id)}
                className={`p-2 rounded-xl border text-left transition-all ${
                  selectedId === s.id
                    ? 'bg-amber-500/20 border-amber-400 text-white font-bold ring-1 ring-amber-400'
                    : 'bg-slate-950 border-slate-800 text-slate-300 hover:bg-slate-800/60'
                }`}
              >
                <div className="text-xs font-bold leading-tight truncate">{s.nameTe || s.nameEn}</div>
                <div className="text-[9.5px] text-slate-400 font-mono mt-0.5">
                  {s.totalVoters} ఓట్లు • {s.supportPct}% JSP
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Selected Clan Highlight */}
        {currentClan && (
          <div className="bg-gradient-to-r from-amber-950/40 via-slate-950 to-slate-950 border border-amber-500/40 rounded-2xl p-3 flex items-center justify-between">
            <div>
              <span className="text-[10px] text-amber-400 font-bold uppercase tracking-wider block">
                {language === 'te' ? 'ఎంచుకున్న వంశం' : 'Selected Clan'}
              </span>
              <h3 className="text-sm font-black text-white">
                {currentClan.nameTe} <span className="font-mono text-xs text-slate-400">({currentClan.nameEn})</span>
              </h3>
            </div>
            <div className="text-right">
              <span className="text-xs font-mono font-black text-amber-300 block">{currentClan.totalVoters} మంది ఓటర్లు</span>
              <span className="text-[10px] text-slate-400">{currentClan.houseNumbers.length} ఇళ్లు</span>
            </div>
          </div>
        )}

        {/* Sentiment % Preset Buttons */}
        <div className="space-y-1.5">
          <label className="text-[10px] uppercase font-bold text-slate-400 block">
            {language === 'te' ? `మొగ్గు శాతం ఎంచుకోండి (${pct}%):` : `Select Support Leaning (${pct}%):`}
          </label>
          <div className="grid grid-cols-2 gap-1.5">
            {presets.map(p => (
              <button
                key={p.pct}
                onClick={() => setPct(p.pct)}
                className={`p-2 rounded-xl border text-left flex items-center justify-between transition-all ${
                  pct === p.pct
                    ? `${p.badge} ring-1 ring-amber-400 font-black`
                    : 'bg-slate-950 border-slate-800 text-slate-300 hover:bg-slate-850'
                }`}
              >
                <span className="text-xs">{p.label}</span>
                {pct === p.pct && <Check className="w-3.5 h-3.5 text-amber-400" />}
              </button>
            ))}
          </div>
        </div>

        {/* Money Factor Options */}
        <div className="space-y-1.5 pt-1 border-t border-slate-800">
          <label className="text-[10px] uppercase font-bold text-slate-400 block flex items-center gap-1.5">
            <Banknote className="w-3.5 h-3.5 text-emerald-400" />
            <span>{language === 'te' ? 'నగదు / సాయం పంపిణీ ప్రభావం (Money / Cash Factor):' : 'Cash / Money Distribution Factor:'}</span>
          </label>
          <div className="space-y-1 max-h-40 overflow-y-auto pr-1">
            {moneyOptions.map(opt => {
              const isSelected = moneyStatus === opt.status;
              const Icon = opt.icon;
              return (
                <div
                  key={opt.status}
                  onClick={() => setMoneyStatus(opt.status)}
                  className={`p-2 rounded-xl border transition-all cursor-pointer flex items-center justify-between ${
                    isSelected
                      ? `${opt.color} ring-1 ring-amber-400`
                      : 'bg-slate-950/60 border-slate-800 hover:bg-slate-850 text-slate-300'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <Icon className="w-4 h-4 flex-shrink-0" />
                    <div>
                      <span className="text-xs font-bold block">{opt.label}</span>
                      <span className="text-[9.5px] text-slate-400 block">{opt.desc}</span>
                    </div>
                  </div>
                  {isSelected && <Check className="w-4 h-4 text-amber-400 flex-shrink-0" />}
                </div>
              );
            })}
          </div>
        </div>

        {/* Override Checkbox */}
        <div className="bg-slate-950 border border-slate-800 p-2.5 rounded-xl flex items-center justify-between">
          <span className="text-xs text-slate-300">
            {language === 'te'
              ? 'ఇప్పటికే విడిగా సర్వే చేసిన ఓటర్లను కూడా ఓవర్‌రైట్ చేయాలా?'
              : 'Overwrite already individually surveyed voters?'}
          </span>
          <input
            type="checkbox"
            checked={overrideExisting}
            onChange={e => setOverrideExisting(e.target.checked)}
            className="rounded border-slate-700 text-amber-500 bg-slate-900 w-4 h-4 accent-amber-500"
          />
        </div>

        {/* Campaign Notes */}
        <div>
          <label className="text-[10px] uppercase font-bold text-slate-400 block mb-1">
            {language === 'te' ? 'గమనికలు (కారణం / పెద్దల మాట):' : 'Notes / Ground Reason:'}
          </label>
          <input
            type="text"
            value={notes}
            onChange={e => setNotes(e.target.value)}
            placeholder={language === 'te' ? 'ఉదా: వంశ పెద్ద హామీ ఇచ్చారు, మొత్తం 75% మనకే...' : 'e.g., Clan elder committed support...'}
            className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white text-xs placeholder-slate-600 focus:outline-none focus:border-amber-400"
          />
        </div>

        {/* Submit Button */}
        <button
          onClick={handleApply}
          className="w-full py-3 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black rounded-xl text-xs flex items-center justify-center gap-2 shadow-lg shadow-amber-950/50"
        >
          <Check className="w-4 h-4" />
          <span>
            {language === 'te'
              ? `${currentClan?.nameTe || ''} వంశ ఓటర్లందరికీ (${currentClan?.totalVoters || 0} మంది) ${pct}% వర్తింపజేయండి`
              : `Apply ${pct}% Support to all ${currentClan?.totalVoters || 0} Electors`}
          </span>
        </button>
      </div>
    </div>
  );
};
