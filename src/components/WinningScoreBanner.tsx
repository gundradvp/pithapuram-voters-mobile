import React, { useState } from 'react';
import { Trophy, TrendingUp, TrendingDown, Target, AlertTriangle, ShieldCheck, ChevronDown, ChevronUp, Flame, ArrowRight } from 'lucide-react';
import { WinningScoreCalculation } from '../types';

interface WinningScoreBannerProps {
  calc: WinningScoreCalculation;
  onOpenWarRoom?: () => void;
}

export const WinningScoreBanner: React.FC<WinningScoreBannerProps> = ({
  calc,
  onOpenWarRoom
}) => {
  const [isExpanded, setIsExpanded] = useState<boolean>(false);

  const getStatusBadge = () => {
    switch (calc.status) {
      case 'safe_win':
        return (
          <span className="px-2 py-0.5 bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 rounded-full text-[10px] font-black flex items-center gap-1 animate-pulse">
            <ShieldCheck className="w-3 h-3 text-emerald-400" />
            SAFE WIN ZONE
          </span>
        );
      case 'likely_win':
        return (
          <span className="px-2 py-0.5 bg-blue-500/20 text-blue-300 border border-blue-500/40 rounded-full text-[10px] font-black flex items-center gap-1">
            <TrendingUp className="w-3 h-3 text-blue-400" />
            LIKELY WIN
          </span>
        );
      case 'battleground':
        return (
          <span className="px-2 py-0.5 bg-amber-500/20 text-amber-300 border border-amber-500/40 rounded-full text-[10px] font-black flex items-center gap-1">
            <Flame className="w-3 h-3 text-amber-400" />
            BATTLEGROUND
          </span>
        );
      case 'deficit_danger':
        return (
          <span className="px-2 py-0.5 bg-rose-500/20 text-rose-300 border border-rose-500/40 rounded-full text-[10px] font-black flex items-center gap-1 animate-pulse">
            <AlertTriangle className="w-3 h-3 text-rose-400" />
            DEFICIT ALERT
          </span>
        );
    }
  };

  const progressPct = Math.min(100, Math.round((calc.projectedJspVotes / calc.targetVotesToWin) * 100));

  return (
    <div className="bg-gradient-to-b from-slate-900 to-slate-950 border border-amber-500/30 rounded-2xl p-3 shadow-xl space-y-2 relative overflow-hidden transition-all mb-3">
      {/* Background Glow */}
      <div
        className={`absolute -top-12 -right-12 w-36 h-36 rounded-full blur-3xl opacity-20 pointer-events-none ${
          calc.projectedLead >= 0 ? 'bg-emerald-500' : 'bg-rose-500'
        }`}
      />

      {/* Top Header: Score Title, Lead & Status Badge */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <div className="p-1.5 rounded-lg bg-amber-500/10 text-amber-400 border border-amber-500/30">
            <Trophy className="w-4 h-4 text-amber-400" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="text-[11px] font-black uppercase tracking-wider text-slate-200">
                Booth Victory Predictor
              </span>
              {getStatusBadge()}
            </div>
            <p className="text-[10px] text-slate-400 font-medium">
              Target: <strong className="text-amber-400">{calc.targetVotesToWin} votes</strong> to win (at {calc.expectedTurnoutPct}% turnout)
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
                +{calc.projectedLead} Lead
              </>
            ) : calc.projectedLead === 0 ? (
              'Tied (0)'
            ) : (
              <>
                <TrendingDown className="w-4 h-4 text-rose-400" />
                {calc.projectedLead} Deficit
              </>
            )}
          </div>
          <span className="text-[9px] text-slate-400 block font-mono">
            {calc.projectedJspVotes} vs {calc.projectedOpponentVotes} Opp
          </span>
        </div>
      </div>

      {/* Visual Progress Bar Toward Win Target */}
      <div className="space-y-1">
        <div className="flex items-center justify-between text-[10px] font-mono">
          <span className="text-slate-400">
            Projected JSP: <strong className="text-red-400 font-bold">{calc.projectedJspVotes}</strong>
          </span>
          <span className="text-amber-400 font-bold">
            {progressPct}% of Victory Goal
          </span>
          <span className="text-slate-400">
            Opponents: <strong className="text-slate-300 font-bold">{calc.projectedOpponentVotes}</strong>
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
            style={{ width: `${Math.min(100, (calc.projectedJspVotes / calc.expectedPollVotes) * 100)}%` }}
          />
          {/* Neutral Split */}
          <div
            className="h-full bg-slate-700/60 transition-all duration-500"
            style={{ width: `${Math.min(100, (calc.projectedNeutralVotes / calc.expectedPollVotes) * 100)}%` }}
          />
          {/* Opponent Votes */}
          <div
            className="h-full bg-rose-900 transition-all duration-500"
            style={{ width: `${Math.min(100, (calc.projectedOpponentVotes / calc.expectedPollVotes) * 100)}%` }}
          />
        </div>
      </div>

      {/* Collapsible Detailed Breakdown */}
      {isExpanded && (
        <div className="pt-2 border-t border-slate-800/80 space-y-2 text-[11px] animate-in fade-in duration-100">
          <div className="grid grid-cols-4 gap-1.5 text-center">
            <div className="bg-slate-950/80 p-2 rounded-xl border border-slate-800">
              <span className="text-[9px] text-slate-400 block">Total Electors</span>
              <strong className="text-white text-xs font-mono">{calc.totalElectors}</strong>
            </div>
            <div className="bg-slate-950/80 p-2 rounded-xl border border-slate-800">
              <span className="text-[9px] text-slate-400 block">Poll Votes</span>
              <strong className="text-amber-400 text-xs font-mono">{calc.expectedPollVotes}</strong>
            </div>
            <div className="bg-slate-950/80 p-2 rounded-xl border border-red-500/30">
              <span className="text-[9px] text-red-300 block">JSP Votes</span>
              <strong className="text-red-400 text-xs font-mono font-black">{calc.projectedJspVotes}</strong>
            </div>
            <div className="bg-slate-950/80 p-2 rounded-xl border border-rose-500/30">
              <span className="text-[9px] text-rose-300 block">Opponent</span>
              <strong className="text-rose-400 text-xs font-mono font-black">{calc.projectedOpponentVotes}</strong>
            </div>
          </div>

          {/* Actionable Winning Weapon Advice */}
          <div className="bg-slate-950 p-2.5 rounded-xl border border-amber-500/30 flex items-start gap-2">
            <Target className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              {calc.neededToGuarantee > 0 ? (
                <p className="text-slate-300 text-[10px] leading-tight">
                  <strong className="text-amber-400 font-bold">Action Needed:</strong> Convert{' '}
                  <strong className="text-white font-mono underline font-bold">{calc.neededToGuarantee}</strong> more swing voters (40% Positive or 50% Neutral) into committed supporters to guarantee booth victory.
                </p>
              ) : (
                <p className="text-emerald-300 text-[10px] leading-tight">
                  <strong className="font-bold">Victory Threshold Reached!</strong> You have surpassed the 50%+ mark. Focus on 100% booth turnout mobilization on polling day to lock in this margin.
                </p>
              )}
            </div>

            {onOpenWarRoom && (
              <button
                onClick={onOpenWarRoom}
                className="px-2 py-1 bg-amber-500 hover:bg-amber-400 text-slate-950 rounded-lg text-[10px] font-black flex items-center gap-1 shadow-sm flex-shrink-0"
              >
                <span>War Room</span>
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
        <span>{isExpanded ? 'Hide Details' : 'View Winning Score Breakdown'}</span>
        {isExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
      </button>
    </div>
  );
};
