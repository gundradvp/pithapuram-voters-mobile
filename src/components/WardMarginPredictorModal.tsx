import React, { useState, useMemo } from 'react';
import {
  TrendingUp,
  X,
  Trophy,
  Sliders,
  CheckCircle2,
  AlertCircle,
  Layers,
  Printer,
  ChevronRight,
  ShieldAlert,
  Sparkles
} from 'lucide-react';
import { MobileVoter, BoothInfo, VoterCampaignProfile } from '../types';

interface WardMarginPredictorModalProps {
  isOpen: boolean;
  onClose: () => void;
  voters: MobileVoter[];
  profiles: Record<number, VoterCampaignProfile>;
  boothInfo: BoothInfo;
}

interface WardStat {
  wardNo: number | string;
  totalVoters: number;
  jspOurs: number;
  opponent: number;
  neutralSwing: number;
  votedCount: number;
  projectedJspVotes: number;
  projectedOpponentVotes: number;
  margin: number;
  winner: 'jsp' | 'opponent' | 'tie';
}

export const WardMarginPredictorModal: React.FC<WardMarginPredictorModalProps> = ({
  isOpen,
  onClose,
  voters,
  profiles,
  boothInfo
}) => {
  // Estimated Turnout % (default 85% for rural panchayat elections in Andhra Pradesh)
  const [turnoutPct, setTurnoutPct] = useState<number>(85);
  // Estimated share of neutral/swing votes won by JSP (default 60%)
  const [neutralSwingShare, setNeutralSwingShare] = useState<number>(60);

  // Group and compute per ward statistics
  const wardAnalysis = useMemo(() => {
    const wardMap = new Map<number | string, {
      total: number;
      jsp: number;
      opp: number;
      neutral: number;
      voted: number;
    }>();

    voters.forEach(v => {
      const s = v.s ?? (v as any).sno;
      const w = v.ward_no ?? (v as any).w ?? (boothInfo.ward_no || 1);
      const wardKey = w;

      if (!wardMap.has(wardKey)) {
        wardMap.set(wardKey, { total: 0, jsp: 0, opp: 0, neutral: 0, voted: 0 });
      }

      const st = wardMap.get(wardKey)!;
      st.total++;

      const p = profiles[s] || {};
      const isVoted = p.survey_status === 'voted' || (p as any).is_voted;
      if (isVoted) st.voted++;

      const pct = p.supportPct;
      if (pct !== undefined) {
        if (pct >= 75) st.jsp++;
        else if (pct <= 25) st.opp++;
        else st.neutral++;
      } else if (p.survey_status === 'supporter') {
        st.jsp++;
      } else if (p.survey_status === 'opponent') {
        st.opp++;
      } else {
        st.neutral++;
      }
    });

    const wardsList: WardStat[] = [];
    let netTotalVoters = 0;
    let netProjectedJsp = 0;
    let netProjectedOpp = 0;
    let jspWardsWon = 0;
    let oppWardsWon = 0;
    let tieWards = 0;

    // Sort wards numerically
    const sortedWardKeys = Array.from(wardMap.keys()).sort((a, b) => Number(a) - Number(b));

    sortedWardKeys.forEach(w => {
      const st = wardMap.get(w)!;
      netTotalVoters += st.total;

      // Calculate projected votes based on turnout % and swing allocation
      const effectiveTurnoutFactor = turnoutPct / 100;
      const polledTotal = Math.round(st.total * effectiveTurnoutFactor);

      // Ours turnout is generally higher in motivated elections (e.g. 90%)
      const jspBase = Math.round(st.jsp * Math.min(1, effectiveTurnoutFactor * 1.05));
      const oppBase = Math.round(st.opp * Math.min(1, effectiveTurnoutFactor * 1.02));
      const neutralPolled = Math.max(0, polledTotal - (jspBase + oppBase));

      const jspSwingVotes = Math.round(neutralPolled * (neutralSwingShare / 100));
      const oppSwingVotes = Math.max(0, neutralPolled - jspSwingVotes);

      const projectedJspVotes = jspBase + jspSwingVotes;
      const projectedOpponentVotes = oppBase + oppSwingVotes;
      const margin = projectedJspVotes - projectedOpponentVotes;

      let winner: 'jsp' | 'opponent' | 'tie' = 'tie';
      if (margin > 0) {
        winner = 'jsp';
        jspWardsWon++;
      } else if (margin < 0) {
        winner = 'opponent';
        oppWardsWon++;
      } else {
        tieWards++;
      }

      netProjectedJsp += projectedJspVotes;
      netProjectedOpp += projectedOpponentVotes;

      wardsList.push({
        wardNo: w,
        totalVoters: st.total,
        jspOurs: st.jsp,
        opponent: st.opp,
        neutralSwing: st.neutral,
        votedCount: st.voted,
        projectedJspVotes,
        projectedOpponentVotes,
        margin,
        winner
      });
    });

    const netSarpanchMargin = netProjectedJsp - netProjectedOpp;

    return {
      wardsList,
      netTotalVoters,
      netProjectedJsp,
      netProjectedOpp,
      netSarpanchMargin,
      jspWardsWon,
      oppWardsWon,
      tieWards
    };
  }, [voters, profiles, boothInfo, turnoutPct, neutralSwingShare]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex flex-col items-center justify-start overflow-y-auto p-2 sm:p-4">
      <div className="bg-slate-900 border border-emerald-500/50 rounded-3xl w-full max-w-4xl shadow-2xl text-white space-y-4 my-2 overflow-hidden">
        
        {/* Header */}
        <div className="bg-gradient-to-r from-emerald-900 via-teal-900 to-slate-900 p-4 sm:p-5 border-b border-emerald-500/30">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <span className="p-2.5 bg-emerald-500/20 text-emerald-400 rounded-2xl border border-emerald-400/30 text-xl shadow">
                📊
              </span>
              <div>
                <h2 className="text-base sm:text-lg font-black text-white flex items-center gap-2">
                  <span>వార్డు-వారీ మెజారిటీ & గెలుపు గణితం (Victory Predictor)</span>
                </h2>
                <p className="text-xs text-emerald-200 mt-0.5">
                  {boothInfo.clean_village || boothInfo.ps_address} • సమగ్ర వార్డుల విశ్లేషణ
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-xl transition-all cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* NET SARPANCH VICTORY PROJECTION BANNER */}
          <div className={`mt-4 p-4 rounded-2xl border flex items-center justify-between gap-3 shadow-xl ${
            wardAnalysis.netSarpanchMargin > 0
              ? 'bg-gradient-to-r from-emerald-950 via-teal-900 to-emerald-950 border-emerald-400/60 text-emerald-100 ring-2 ring-emerald-400/30'
              : 'bg-gradient-to-r from-red-950 via-rose-900 to-red-950 border-red-400/60 text-red-100'
          }`}>
            <div className="space-y-1">
              <span className="text-[11px] font-bold uppercase tracking-wider text-amber-300 block">
                {boothInfo.clean_village} — సర్పంచ్ ఫలిత అంచనా
              </span>
              <h3 className="text-xl sm:text-2xl font-black flex items-center gap-2">
                {wardAnalysis.netSarpanchMargin > 0 ? (
                  <>
                    <span>🏆 జనసేన (JSP) విజయం ఖాయం!</span>
                    <span className="text-amber-300 font-mono">+{wardAnalysis.netSarpanchMargin} ఓట్లు</span>
                  </>
                ) : (
                  <>
                    <span>⚠️ ప్రత్యర్థి ఆధిక్యం</span>
                    <span className="text-red-300 font-mono">{wardAnalysis.netSarpanchMargin} ఓట్లు</span>
                  </>
                )}
              </h3>
              <p className="text-xs opacity-90">
                JSP వార్డులు: <strong className="text-emerald-300">{wardAnalysis.jspWardsWon}</strong> • ప్రత్యర్థి: <strong className="text-red-300">{wardAnalysis.oppWardsWon}</strong> • టై: {wardAnalysis.tieWards}
              </p>
            </div>

            <div className="text-right font-mono shrink-0">
              <div className="text-xs opacity-80">JSP పోలయ్యే ఓట్లు</div>
              <div className="text-2xl font-black text-emerald-300">{wardAnalysis.netProjectedJsp}</div>
              <div className="text-[10px] text-slate-400">vs ప్రత్యర్థి: {wardAnalysis.netProjectedOpp}</div>
            </div>
          </div>
        </div>

        {/* Dynamic Parameter Sliders */}
        <div className="px-4 sm:px-5 grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
          {/* Slider 1: Estimated Turnout */}
          <div className="bg-slate-950/80 p-3 rounded-2xl border border-slate-800 space-y-1.5">
            <div className="flex items-center justify-between font-bold">
              <span className="text-slate-300 flex items-center gap-1.5">
                <Sliders className="w-3.5 h-3.5 text-amber-400" />
                <span>అంచనా పోలింగ్ శాతం (Turnout %):</span>
              </span>
              <span className="font-mono text-amber-400 text-sm font-black">{turnoutPct}%</span>
            </div>
            <input
              type="range"
              min="65"
              max="95"
              step="1"
              value={turnoutPct}
              onChange={e => setTurnoutPct(Number(e.target.value))}
              className="w-full accent-amber-500 cursor-pointer"
            />
            <div className="flex justify-between text-[10px] text-slate-500 font-mono">
              <span>65% (తక్కువ)</span>
              <span>85% (సగటు పంచాయతీ)</span>
              <span>95% (గరిష్టం)</span>
            </div>
          </div>

          {/* Slider 2: Swing Vote Share for JSP */}
          <div className="bg-slate-950/80 p-3 rounded-2xl border border-slate-800 space-y-1.5">
            <div className="flex items-center justify-between font-bold">
              <span className="text-slate-300 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-teal-400" />
                <span>తటస్థ ఓట్లలో మనకు వచ్చే వాటా:</span>
              </span>
              <span className="font-mono text-teal-400 text-sm font-black">{neutralSwingShare}%</span>
            </div>
            <input
              type="range"
              min="40"
              max="80"
              step="5"
              value={neutralSwingShare}
              onChange={e => setNeutralSwingShare(Number(e.target.value))}
              className="w-full accent-teal-500 cursor-pointer"
            />
            <div className="flex justify-between text-[10px] text-slate-500 font-mono">
              <span>40% (కఠిన పోటీ)</span>
              <span>60% (సిఫార్సు)</span>
              <span>80% (వేవ్)</span>
            </div>
          </div>
        </div>

        {/* WARD-BY-WARD CARDS GRID */}
        <div className="px-4 sm:px-5 pb-5 max-h-[50vh] overflow-y-auto space-y-2.5">
          <div className="flex items-center justify-between text-xs text-slate-400 font-bold px-1">
            <span>వార్డుల వారీ సమీక్ష ({wardAnalysis.wardsList.length} వార్డులు)</span>
            <span>గెలుపు ఆధిక్యం (Margin)</span>
          </div>

          {wardAnalysis.wardsList.map(ws => {
            const isJspWin = ws.margin > 0;
            const isTie = ws.margin === 0;

            return (
              <div
                key={ws.wardNo}
                className={`p-3 rounded-2xl border transition-all ${
                  isJspWin
                    ? 'bg-slate-950/80 border-emerald-500/40 hover:border-emerald-400'
                    : isTie
                      ? 'bg-slate-950/80 border-slate-700'
                      : 'bg-slate-950/80 border-red-500/40 hover:border-red-400'
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2.5">
                    <span className="font-mono font-black text-sm bg-slate-900 text-white px-2.5 py-1 rounded-xl border border-slate-700">
                      వార్డు #{ws.wardNo}
                    </span>
                    <div>
                      <div className="text-xs font-bold text-slate-200">
                        మొత్తం ఓటర్లు: <span className="font-mono text-amber-300 font-black">{ws.totalVoters}</span>
                      </div>
                      <div className="text-[11px] text-slate-400 flex items-center gap-2">
                        <span>🟢 మనవాళ్ళు: <strong className="text-emerald-400">{ws.jspOurs}</strong></span>
                        <span>• 🔴 ప్రత్యర్థి: <strong className="text-red-400">{ws.opponent}</strong></span>
                        <span>• ⚪ తటస్థులు: {ws.neutralSwing}</span>
                      </div>
                    </div>
                  </div>

                  {/* Ward Margin Outcome Pill */}
                  <div className="text-right">
                    <div className={`inline-flex items-center gap-1 px-3 py-1 rounded-xl text-xs font-mono font-black shadow ${
                      isJspWin
                        ? 'bg-emerald-600 text-white'
                        : isTie
                          ? 'bg-slate-700 text-slate-200'
                          : 'bg-red-600 text-white'
                    }`}>
                      {isJspWin ? `+${ws.margin} JSP లీడ్ 🏆` : isTie ? 'TIE (సరిసమానం)' : `${ws.margin} వెనుకంజ`}
                    </div>
                    <div className="text-[10px] text-slate-400 font-mono mt-0.5">
                      JSP: {ws.projectedJspVotes} vs {ws.projectedOpponentVotes}
                    </div>
                  </div>
                </div>

                {/* Visual Bar Meter */}
                <div className="w-full bg-slate-900 h-2.5 rounded-full overflow-hidden mt-2.5 flex border border-slate-800">
                  <div
                    className="h-full bg-emerald-500 transition-all"
                    style={{
                      width: `${Math.round((ws.projectedJspVotes / (ws.projectedJspVotes + ws.projectedOpponentVotes || 1)) * 100)}%`
                    }}
                    title={`JSP: ${ws.projectedJspVotes} ఓట్లు`}
                  />
                  <div
                    className="h-full bg-red-500 transition-all"
                    style={{
                      width: `${Math.round((ws.projectedOpponentVotes / (ws.projectedJspVotes + ws.projectedOpponentVotes || 1)) * 100)}%`
                    }}
                    title={`ప్రత్యర్థి: ${ws.projectedOpponentVotes} ఓట్లు`}
                  />
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div className="bg-slate-950 p-3.5 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
          <p className="flex items-center gap-1.5">
            <span>💡</span>
            <span>డోర్-టు-డోర్ సర్వే నమోదు చేసిన ఓట్ల ఆధారంగా ఈ గెలుపు అంచనా రూపొందించబడింది.</span>
          </p>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-800 hover:bg-slate-700 text-white font-bold rounded-xl text-xs transition-all cursor-pointer"
          >
            మూసివేయి (Close)
          </button>
        </div>

      </div>
    </div>
  );
};
