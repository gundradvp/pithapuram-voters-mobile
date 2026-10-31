import React, { useState } from 'react';
import { Trophy, TrendingUp, TrendingDown, Target, AlertTriangle, ShieldCheck, ChevronDown, ChevronUp, Flame, ArrowRight, X, Banknote, ShieldAlert, Sparkles, ClipboardCheck } from 'lucide-react';
import { WinningScoreCalculation } from '../types';
import { Language, translations } from '../utils/i18n';

interface WinningScoreBannerProps {
  calc: WinningScoreCalculation;
  language?: Language;
  onOpenWarRoom?: () => void;
  onToggleMode?: (mode: 'entry' | 'auto') => void;
  onHide?: () => void;
}

export const WinningScoreBanner: React.FC<WinningScoreBannerProps> = ({
  calc,
  language = 'te',
  onOpenWarRoom,
  onToggleMode,
  onHide
}) => {
  const [isExpanded, setIsExpanded] = useState<boolean>(false);
  const t = translations[language];

  const getStatusBadge = () => {
    switch (calc.status) {
      case 'safe_win':
        return (
          <span className="px-2 py-0.5 bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 rounded-full text-[10px] font-black flex items-center gap-1 animate-pulse">
            <ShieldCheck className="w-3 h-3 text-emerald-400" />
            {t.safeWinZone}
          </span>
        );
      case 'likely_win':
        return (
          <span className="px-2 py-0.5 bg-blue-500/20 text-blue-300 border border-blue-500/40 rounded-full text-[10px] font-black flex items-center gap-1">
            <TrendingUp className="w-3 h-3 text-blue-400" />
            {t.likelyWin}
          </span>
        );
      case 'battleground':
        return (
          <span className="px-2 py-0.5 bg-amber-500/20 text-amber-300 border border-amber-500/40 rounded-full text-[10px] font-black flex items-center gap-1">
            <Flame className="w-3 h-3 text-amber-400" />
            {t.battleground}
          </span>
        );
      case 'deficit_danger':
        return (
          <span className="px-2 py-0.5 bg-rose-500/20 text-rose-300 border border-rose-500/40 rounded-full text-[10px] font-black flex items-center gap-1 animate-pulse">
            <AlertTriangle className="w-3 h-3 text-rose-400" />
            {t.deficitAlert}
          </span>
        );
    }
  };

  const isEntryMode = calc.mode === 'entry';
  const progressPct = Math.min(100, Math.round((calc.projectedJspVotes / calc.targetVotesToWin) * 100));

  const hasCashData = Boolean(
    (calc.cashOpponentPaidSafeCount || 0) > 0 ||
    (calc.cashOpponentPaidSwungCount || 0) > 0 ||
    (calc.cashAtRiskCount || 0) > 0 ||
    (calc.cashSecuredCount || 0) > 0
  );

  return (
    <div className="bg-gradient-to-b from-slate-900 via-slate-950 to-slate-950 border border-amber-500/40 rounded-2xl p-3 shadow-2xl space-y-2 relative overflow-hidden transition-all mb-3">
      {/* Background Glow */}
      <div
        className={`absolute -top-12 -right-12 w-36 h-36 rounded-full blur-3xl opacity-20 pointer-events-none ${
          calc.projectedLead >= 0 ? 'bg-emerald-500' : 'bg-rose-500'
        }`}
      />

      {/* Mode Switcher Toolbar & Close (Hide) Button */}
      <div className="flex items-center justify-between pb-1.5 border-b border-slate-800/80 gap-2">
        <div className="flex items-center gap-1 bg-slate-950 p-0.5 rounded-xl border border-slate-800">
          <button
            onClick={() => onToggleMode && onToggleMode('entry')}
            className={`px-2 py-1 rounded-lg text-[10px] font-bold flex items-center gap-1 transition-all ${
              isEntryMode
                ? 'bg-amber-500 text-slate-950 font-black shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
            title="Purely based on explicit entries made by candidate/volunteers"
          >
            <ClipboardCheck className="w-3 h-3" />
            <span>{language === 'te' ? 'క్షేత్ర నమోదు మాత్రమే (Ground Truth)' : 'Pure Entry Mode'}</span>
          </button>
          <button
            onClick={() => onToggleMode && onToggleMode('auto')}
            className={`px-2 py-1 rounded-lg text-[10px] font-bold flex items-center gap-1 transition-all ${
              !isEntryMode
                ? 'bg-blue-600 text-white font-black shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
            title="Statistical algorithm extrapolating turnout & swing"
          >
            <Sparkles className="w-3 h-3" />
            <span>{language === 'te' ? 'ఆటోమేటిక్ అంచనా (Simulation)' : 'Predictive Auto'}</span>
          </button>
        </div>

        {onHide && (
          <button
            onClick={onHide}
            className="p-1 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors flex items-center gap-1 text-[10px]"
            title={language === 'te' ? 'ఈ బ్యానర్‌ను దాచండి' : 'Hide this banner'}
          >
            <span className="hidden xs:inline">{language === 'te' ? 'దాచు' : 'Hide'}</span>
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* Top Header: Score Title, Lead & Status Badge */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <div className="p-1.5 rounded-lg bg-amber-500/10 text-amber-400 border border-amber-500/30">
            <Trophy className="w-4 h-4 text-amber-400" />
          </div>
          <div>
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-[11px] font-black uppercase tracking-wider text-slate-200">
                {t.victoryPredictor}
              </span>
              {getStatusBadge()}
            </div>
            <p className="text-[10px] text-slate-400 font-medium">
              {t.targetToWin}: <strong className="text-amber-400 font-mono font-bold">{calc.targetVotesToWin}</strong> ({t.atTurnout} {calc.expectedTurnoutPct}%)
              {isEntryMode && (
                <span className="ml-1 text-slate-500">• {language === 'te' ? 'నమోదు ఆధారితం' : 'Field Entry'}</span>
              )}
            </p>
          </div>
        </div>

        {/* Lead Margin Display */}
        <div className="text-right">
          <div className={`text-sm font-black font-mono flex items-center justify-end gap-1 ${
            calc.projectedLead > 0
              ? 'text-emerald-400'
              : calc.projectedLead === 0
                ? 'text-amber-400'
                : 'text-rose-400'
          }`}>
            {calc.projectedLead > 0 ? (
              <>
                <TrendingUp className="w-4 h-4 text-emerald-400" />
                +{calc.projectedLead} {language === 'te' ? 'ఆధిక్యం' : 'Lead'}
              </>
            ) : calc.projectedLead === 0 ? (
              language === 'te' ? 'సమానం (0)' : 'Tied (0)'
            ) : (
              <>
                <TrendingDown className="w-4 h-4 text-rose-400" />
                {calc.projectedLead} {language === 'te' ? 'లోటు' : 'Deficit'}
              </>
            )}
          </div>
          <span className="text-[9px] text-slate-400 block font-mono">
            {calc.projectedJspVotes} vs {calc.projectedOpponentVotes} {language === 'te' ? 'ప్రత్యర్థి' : 'Opp'}
          </span>
        </div>
      </div>

      {/* Visual Progress Bar Toward Win Target */}
      <div className="space-y-1">
        <div className="flex items-center justify-between text-[10px] font-mono">
          <span className="text-slate-400">
            {isEntryMode ? (language === 'te' ? 'నమోదైన జనసేన:' : 'Confirmed JSP:') : t.projectedJsp}{' '}
            <strong className="text-red-400 font-bold">{calc.projectedJspVotes}</strong>
          </span>
          <span className="text-amber-400 font-bold">
            {progressPct}% {t.victoryGoal}
          </span>
          <span className="text-slate-400">
            {isEntryMode ? (language === 'te' ? 'ప్రత్యర్థి ఓట్లు:' : 'Opponent:') : t.projectedOpp}{' '}
            <strong className="text-slate-300 font-bold">{calc.projectedOpponentVotes}</strong>
          </span>
        </div>

        <div className="w-full h-2.5 bg-slate-950 rounded-full overflow-hidden border border-slate-800 relative flex">
          {/* JSP Votes */}
          <div
            className={`h-full transition-all duration-500 ${
              calc.projectedLead >= 0
                ? 'bg-gradient-to-r from-red-600 via-amber-500 to-emerald-500'
                : 'bg-gradient-to-r from-red-600 to-amber-500'
            }`}
            style={{ width: `${Math.min(100, (calc.projectedJspVotes / calc.targetVotesToWin) * 100)}%` }}
          />
          {/* Neutral Split */}
          <div
            className="h-full bg-slate-700/60 transition-all duration-500"
            style={{ width: `${Math.min(100, ((calc.projectedNeutralVotes || 0) / calc.targetVotesToWin) * 100)}%` }}
          />
          {/* Opponent Votes */}
          <div
            className="h-full bg-rose-900 transition-all duration-500"
            style={{ width: `${Math.min(100, (calc.projectedOpponentVotes / calc.targetVotesToWin) * 100)}%` }}
          />
        </div>
      </div>

      {/* Cash / Money Distribution Intelligence Badge (When Cash Factors Tagged) */}
      {hasCashData && (
        <div className="bg-slate-950/80 border border-emerald-500/30 rounded-xl p-2 text-[10px] space-y-1">
          <div className="flex items-center justify-between font-bold">
            <span className="text-emerald-400 flex items-center gap-1">
              <Banknote className="w-3.5 h-3.5" />
              <span>{language === 'te' ? 'నగదు పంపిణీ ప్రభావం (Cash Factor):' : 'Cash Attack Tracking:'}</span>
            </span>
            <span className="text-slate-400 font-mono">
              {language === 'te' ? 'క్షేత్ర నివేదిక' : 'Field Report'}
            </span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-1 text-center font-mono">
            {(calc.cashOpponentPaidSafeCount || 0) > 0 && (
              <div className="bg-emerald-950/30 border border-emerald-500/30 p-1 rounded-lg">
                <span className="text-[9px] text-emerald-400 block font-sans">💰 డబ్బు తీసుకున్నా గ్లాసుకే</span>
                <strong className="text-white text-xs">{calc.cashOpponentPaidSafeCount}</strong>
              </div>
            )}
            {(calc.cashOpponentPaidSwungCount || 0) > 0 && (
              <div className="bg-rose-950/30 border border-rose-500/30 p-1 rounded-lg">
                <span className="text-[9px] text-rose-400 block font-sans">💸 డబ్బుతో చేజారినవి</span>
                <strong className="text-rose-300 text-xs">{calc.cashOpponentPaidSwungCount}</strong>
              </div>
            )}
            {(calc.cashAtRiskCount || 0) > 0 && (
              <div className="bg-amber-950/30 border border-amber-500/30 p-1 rounded-lg">
                <span className="text-[9px] text-amber-400 block font-sans">⚠️ డబ్బు రిస్క్ ఉన్నవి</span>
                <strong className="text-amber-300 text-xs">{calc.cashAtRiskCount}</strong>
              </div>
            )}
            {(calc.cashSecuredCount || 0) > 0 && (
              <div className="bg-blue-950/30 border border-blue-500/30 p-1 rounded-lg">
                <span className="text-[9px] text-blue-400 block font-sans">🛡️ భరోసా ఇచ్చినవి</span>
                <strong className="text-blue-300 text-xs">{calc.cashSecuredCount}</strong>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Collapsible Detailed Breakdown */}
      {isExpanded && (
        <div className="pt-2 border-t border-slate-800/80 space-y-2 text-[11px] animate-in fade-in duration-100">
          <div className="grid grid-cols-4 gap-1.5 text-center">
            <div className="bg-slate-950/80 p-2 rounded-xl border border-slate-800">
              <span className="text-[9px] text-slate-400 block">{language === 'te' ? 'మొత్తం ఓటర్లు' : 'Total Electors'}</span>
              <strong className="text-white text-xs font-mono">{calc.totalElectors}</strong>
            </div>
            <div className="bg-slate-950/80 p-2 rounded-xl border border-slate-800">
              <span className="text-[9px] text-slate-400 block">
                {isEntryMode ? (language === 'te' ? 'ఇంకా సర్వే కానివి' : 'Unsurveyed') : (language === 'te' ? 'పోల్ ఓట్లు' : 'Poll Votes')}
              </span>
              <strong className="text-amber-400 text-xs font-mono">
                {isEntryMode ? (calc.unsurveyedVotes ?? (calc.totalElectors - (calc.surveyedCount || 0))) : calc.expectedPollVotes}
              </strong>
            </div>
            <div className="bg-slate-950/80 p-2 rounded-xl border border-red-500/30">
              <span className="text-[9px] text-red-300 block">{language === 'te' ? 'జనసేన ఓట్లు' : 'JSP Votes'}</span>
              <strong className="text-red-400 text-xs font-mono font-black">{calc.projectedJspVotes}</strong>
            </div>
            <div className="bg-slate-950/80 p-2 rounded-xl border border-rose-500/30">
              <span className="text-[9px] text-rose-300 block">{language === 'te' ? 'ప్రత్యర్థి' : 'Opponent'}</span>
              <strong className="text-rose-400 text-xs font-mono font-black">{calc.projectedOpponentVotes}</strong>
            </div>
          </div>

          {/* Actionable Advice */}
          <div className="bg-slate-950 p-2.5 rounded-xl border border-amber-500/30 flex items-start gap-2">
            <Target className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              {calc.neededToGuarantee > 0 ? (
                <p className="text-slate-300 text-[10px] leading-tight">
                  <strong className="text-amber-400 font-bold">{t.actionNeeded}:</strong>{' '}
                  {language === 'te' ? (
                    <>
                      గెలుపు ఖాయం కావడానికి ఇంకా <strong className="text-white font-mono underline font-bold">{calc.neededToGuarantee}</strong> మంది ఓటర్లను (ఇంటిపేర్లు లేదా కుటుంబాల ద్వారా) మన వైపు తిప్పుకోవాలి.
                    </>
                  ) : (
                    <>
                      Secure <strong className="text-white font-mono underline font-bold">{calc.neededToGuarantee}</strong> more committed voters to guarantee booth victory.
                    </>
                  )}
                </p>
              ) : (
                <p className="text-emerald-300 text-[10px] leading-tight font-bold">
                  {t.thresholdReached}
                </p>
              )}
            </div>

            {onOpenWarRoom && (
              <button
                onClick={onOpenWarRoom}
                className="px-2 py-1 bg-amber-500 hover:bg-amber-400 text-slate-950 rounded-lg text-[10px] font-black flex items-center gap-1 shadow-sm flex-shrink-0"
              >
                <span>{language === 'te' ? 'వార్ రూమ్' : 'War Room'}</span>
                <ArrowRight className="w-3 h-3" />
              </button>
            )}
          </div>
        </div>
      )}

      {/* Toggle Expand / Collapse */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full py-0.5 text-slate-400 hover:text-slate-200 text-[10px] font-bold flex items-center justify-center gap-1"
      >
        <span>{isExpanded ? t.hideDetails : t.viewBreakdown}</span>
        {isExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
      </button>
    </div>
  );
};
