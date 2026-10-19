import React, { useState } from 'react';
import { X, Check, Flag, Sparkles, AlertCircle, ThumbsUp, ThumbsDown, Sliders } from 'lucide-react';
import { Language, translations } from '../utils/i18n';

interface SupportLeaningPickerProps {
  title: string;
  subtitle?: string;
  currentPct?: number;
  currentNotes?: string;
  hasFamily?: boolean;
  language?: Language;
  onSave: (pct: number, notes?: string, applyToFamily?: boolean) => void;
  onClose: () => void;
}

export const SupportLeaningPicker: React.FC<SupportLeaningPickerProps> = ({
  title,
  subtitle,
  currentPct = 50,
  currentNotes = '',
  hasFamily = false,
  language = 'te',
  onSave,
  onClose
}) => {
  const [pct, setPct] = useState<number>(currentPct);
  const [notes, setNotes] = useState<string>(currentNotes);
  const [applyToFamily, setApplyToFamily] = useState<boolean>(false);
  const t = translations[language];

  const presets = language === 'te' ? [
    {
      pct: 100,
      label: '100% మనవాళ్లే (పక్కా మద్దతు)',
      desc: 'పవన్ కళ్యాణ్ గారికి, జనసేనకు కట్టుబడిన కార్యకర్తలు & పక్కా ఓటర్లు',
      badgeClass: 'bg-red-600/30 text-red-300 border-red-500/50',
      icon: Flag
    },
    {
      pct: 75,
      label: '75% మనకే అనుకూలం',
      desc: 'కూటమికి, పార్టీ సిద్ధాంతానికి చాలా అనుకూలం, దాదాపు మనకే వేస్తారు',
      badgeClass: 'bg-emerald-600/30 text-emerald-300 border-emerald-500/50',
      icon: ThumbsUp
    },
    {
      pct: 50,
      label: '50% ఎటూ తేల్చుకోలేదు (స్వింగ్)',
      desc: 'అభ్యర్థుల పనులను బట్టి చూస్తున్నారు, సరైన హామీ ఇస్తే మారుతారు',
      badgeClass: 'bg-slate-700/60 text-slate-300 border-slate-600',
      icon: Sparkles
    },
    {
      pct: 40,
      label: '40% సానుకూలం (ప్రయత్నిస్తే పడతారు)',
      desc: 'మనపై సానుకూలత ఉంది, 1-2 సార్లు వెళ్లి మాట్లాడితే ఓటు వేస్తారు',
      badgeClass: 'bg-amber-600/30 text-amber-300 border-amber-500/50',
      icon: ThumbsUp
    },
    {
      pct: 25,
      label: '25% అనుమానం (వ్యతిరేకత ఉండొచ్చు)',
      desc: 'సంకోచిస్తున్నారు, ప్రత్యర్థి పార్టీ లేదా కుల ఒత్తిడిలో ఉన్నారు',
      badgeClass: 'bg-orange-600/30 text-orange-300 border-orange-500/50',
      icon: AlertCircle
    },
    {
      pct: 0,
      label: '0% ప్రత్యర్థులు (మారరు)',
      desc: 'పక్కా ప్రత్యర్థి పార్టీ మద్దతుదారులు, సమయం వృధా చేయవద్దు',
      badgeClass: 'bg-rose-950/80 text-rose-400 border-rose-500/50',
      icon: ThumbsDown
    }
  ] : [
    {
      pct: 100,
      label: '100% Full Support',
      desc: 'Confirmed JSP supporters, party cadres & committed voters',
      badgeClass: 'bg-red-600/30 text-red-300 border-red-500/50',
      icon: Flag
    },
    {
      pct: 75,
      label: '75% Strong Lean',
      desc: 'Highly favorable to Pawan Kalyan & coalition, leaning heavily to us',
      badgeClass: 'bg-emerald-600/30 text-emerald-300 border-emerald-500/50',
      icon: ThumbsUp
    },
    {
      pct: 50,
      label: '50% Neutral / Swing',
      desc: 'Undecided electors, evaluating candidates, waiting to be convinced',
      badgeClass: 'bg-slate-700/60 text-slate-300 border-slate-600',
      icon: Sparkles
    },
    {
      pct: 40,
      label: '40% Positive to Us',
      desc: 'Soft incline, open to party message, needs 1-2 visits to win over',
      badgeClass: 'bg-amber-600/30 text-amber-300 border-amber-500/50',
      icon: ThumbsUp
    },
    {
      pct: 25,
      label: '25% Doubtful / Resistant',
      desc: 'Hesitant, influenced by opposition or caste pressure',
      badgeClass: 'bg-orange-600/30 text-orange-300 border-orange-500/50',
      icon: AlertCircle
    },
    {
      pct: 0,
      label: '0% Opponent',
      desc: 'Committed opposition / anti-JSP voters',
      badgeClass: 'bg-rose-950/80 text-rose-400 border-rose-500/50',
      icon: ThumbsDown
    }
  ];

  return (
    <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-sm flex items-end sm:items-center justify-center p-3 animate-in fade-in duration-150">
      <div className="bg-slate-900 border border-amber-500/40 rounded-3xl max-w-sm w-full p-5 space-y-4 shadow-2xl relative max-h-[90vh] overflow-y-auto">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-white bg-slate-800 p-1.5 rounded-full"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Modal Header */}
        <div className="border-b border-slate-800 pb-3">
          <div className="flex items-center gap-1.5 text-xs text-amber-400 font-bold uppercase tracking-wider">
            <Sliders className="w-3.5 h-3.5 text-amber-400" />
            {language === 'te' ? 'ఓటరు మొగ్గు & మద్దతు శాతం' : 'Political Leaning & Sentiment'}
          </div>
          <h3 className="text-base font-black text-white mt-0.5">{title}</h3>
          {subtitle && <p className="text-[11px] text-slate-400 mt-0.5">{subtitle}</p>}
        </div>

        {/* Current Leaning Meter */}
        <div className="bg-slate-950 border border-slate-800 rounded-2xl p-3.5 text-center space-y-2">
          <div className="flex items-center justify-between text-xs font-bold">
            <span className="text-slate-400">{language === 'te' ? 'మద్దతు శాతం:' : 'Support Percentage:'}</span>
            <span className={`text-xl font-black font-mono ${
              pct === 100 ? 'text-red-400' : pct >= 75 ? 'text-emerald-400' : pct === 40 ? 'text-amber-400' : pct === 0 ? 'text-rose-400' : 'text-slate-300'
            }`}>
              {pct}%
            </span>
          </div>

          <div className="w-full h-3 bg-slate-900 rounded-full overflow-hidden border border-slate-800 relative">
            <div
              className={`h-full transition-all duration-300 ${
                pct === 100 ? 'bg-gradient-to-r from-red-600 to-amber-500' : pct >= 75 ? 'bg-emerald-500' : pct === 40 ? 'bg-amber-500' : pct === 0 ? 'bg-rose-700' : 'bg-slate-500'
              }`}
              style={{ width: `${pct}%` }}
            />
          </div>

          {/* Slider for fine-grained adjustment */}
          <input
            type="range"
            min="0"
            max="100"
            step="5"
            value={pct}
            onChange={e => setPct(parseInt(e.target.value, 10))}
            className="w-full accent-amber-500 cursor-pointer"
          />
        </div>

        {/* Preset Percentage Options */}
        <div className="space-y-1.5">
          <label className="text-[10px] uppercase font-bold text-slate-400 block">
            {language === 'te' ? 'త్వరిత ఎంపికలు (Presets)' : 'Quick Sentiment Presets'}
          </label>
          <div className="space-y-1">
            {presets.map(p => {
              const isSelected = pct === p.pct;
              const Icon = p.icon;
              return (
                <div
                  key={p.pct}
                  onClick={() => setPct(p.pct)}
                  className={`p-2 rounded-xl border transition-all cursor-pointer flex items-center justify-between ${
                    isSelected
                      ? `${p.badgeClass} ring-1 ring-amber-400/80`
                      : 'bg-slate-950/60 border-slate-800/80 hover:bg-slate-800/50 text-slate-300'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <Icon className="w-4 h-4 flex-shrink-0" />
                    <div>
                      <span className="text-xs font-bold block">{p.label}</span>
                      <span className="text-[10px] text-slate-400 block">{p.desc}</span>
                    </div>
                  </div>
                  {isSelected && <Check className="w-4 h-4 text-amber-400 flex-shrink-0" />}
                </div>
              );
            })}
          </div>
        </div>

        {/* Campaign Notes */}
        <div>
          <label className="text-[10px] uppercase font-bold text-slate-400 block mb-1">
            {language === 'te' ? 'గ్రౌండ్ నోట్స్ (గమనికలు)' : 'Campaign Ground Notes (Optional)'}
          </label>
          <textarea
            value={notes}
            onChange={e => setNotes(e.target.value)}
            placeholder={language === 'te' ? 'ఉదా: పింఛన్ రాలేదని అడిగారు, ఇంటి పెద్దను ఒప్పించాలి, హైదరాబాద్‌లో ఉద్యోగం...' : 'e.g., Demands pension sanction, local youth leader family...'}
            rows={2}
            className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white text-xs placeholder-slate-600 focus:outline-none focus:border-amber-400"
          />
        </div>

        {/* Option to bulk apply to all family members */}
        {hasFamily && (
          <div className="bg-slate-950 border border-slate-800 p-2.5 rounded-xl flex items-center justify-between">
            <span className="text-xs text-slate-300 font-medium">
              {language === 'te' ? `కుటుంబ సభ్యులందరికీ ఈ ${pct}% వర్తింపజేయండి` : `Apply ${pct}% support to all members in this family`}
            </span>
            <input
              type="checkbox"
              checked={applyToFamily}
              onChange={e => setApplyToFamily(e.target.checked)}
              className="rounded border-slate-700 text-amber-500 bg-slate-900 w-4 h-4"
            />
          </div>
        )}

        {/* Save Button */}
        <button
          onClick={() => {
            onSave(pct, notes, applyToFamily);
            onClose();
          }}
          className="w-full py-2.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black rounded-xl text-xs flex items-center justify-center gap-1.5 shadow-md shadow-amber-950/40"
        >
          <Check className="w-4 h-4" />
          <span>{language === 'te' ? `మద్దతు శాతం సేవ్ చేయండి (${pct}%)` : `Save Support Leaning (${pct}%)`}</span>
        </button>
      </div>
    </div>
  );
};
