import React, { useState, useMemo, useEffect, useRef } from 'react';
import {
  Zap,
  X,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  Search,
  Phone,
  Flame,
  Users,
  Clock,
  ArrowRight,
  TrendingUp,
  MapPin,
  Check
} from 'lucide-react';
import { MobileVoter, BoothInfo, VoterCampaignProfile } from '../types';
import { resolvePhotoUrl } from '../utils/photoResolver';

interface PollingFastPunchModalProps {
  isOpen: boolean;
  onClose: () => void;
  voters: MobileVoter[];
  profiles: Record<number, VoterCampaignProfile>;
  boothInfo: BoothInfo;
  onUpdateSurveyMark: (serialNo: number, status: any) => void;
  onOpenPhoneEditor?: (voter: MobileVoter) => void;
}

export const PollingFastPunchModal: React.FC<PollingFastPunchModalProps> = ({
  isOpen,
  onClose,
  voters,
  profiles,
  boothInfo,
  onUpdateSurveyMark,
  onOpenPhoneEditor
}) => {
  const [punchedSno, setPunchedSno] = useState<string>('');
  const [lastMarkedVoter, setLastMarkedVoter] = useState<MobileVoter | null>(null);
  const [showOnlyUnvotedOurs, setShowOnlyUnvotedOurs] = useState<boolean>(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Focus input when modal opens
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 150);
    }
  }, [isOpen]);

  // Map of S.No to voter for fast O(1) lookup
  const voterMap = useMemo(() => {
    const map = new Map<number, MobileVoter>();
    voters.forEach(v => {
      const s = v.s ?? (v as any).sno;
      if (s) map.set(s, v);
    });
    return map;
  }, [voters]);

  // Current active preview voter
  const currentPreviewVoter = useMemo(() => {
    const num = parseInt(punchedSno, 10);
    if (!num || isNaN(num)) return null;
    return voterMap.get(num) || null;
  }, [punchedSno, voterMap]);

  // Overall Polling Statistics
  const pollStats = useMemo(() => {
    let votedCount = 0;
    let oursTotal = 0;
    let oursVoted = 0;
    let unvotedOursList: MobileVoter[] = [];

    voters.forEach(v => {
      const s = v.s ?? (v as any).sno;
      const p = profiles[s] || {};
      const isVoted = p.survey_status === 'voted' || (p as any).is_voted;
      const isOurs = (p.supportPct !== undefined && p.supportPct >= 75) || p.survey_status === 'supporter';

      if (isVoted) votedCount++;
      if (isOurs) {
        oursTotal++;
        if (isVoted) oursVoted++;
        else unvotedOursList.push(v);
      }
    });

    const totalVoters = voters.length || 1;
    const turnoutPct = Math.round((votedCount / totalVoters) * 100);
    const oursTurnoutPct = oursTotal > 0 ? Math.round((oursVoted / oursTotal) * 100) : 0;

    return {
      totalVoters: voters.length,
      votedCount,
      turnoutPct,
      oursTotal,
      oursVoted,
      oursTurnoutPct,
      unvotedOursList
    };
  }, [voters, profiles]);

  if (!isOpen) return null;

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 2500);
  };

  const playSuccessChime = () => {
    try {
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.frequency.setValueAtTime(587.33, ctx.currentTime); // D5
      osc.frequency.setValueAtTime(880, ctx.currentTime + 0.08); // A5
      gain.gain.setValueAtTime(0.3, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.25);
      osc.start();
      osc.stop(ctx.currentTime + 0.25);
    } catch {}
  };

  const handleMarkVoted = (targetVoter?: MobileVoter) => {
    const v = targetVoter || currentPreviewVoter;
    if (!v) return;
    const s = v.s ?? (v as any).sno;
    const currentStatus = profiles[s]?.survey_status;
    const newStatus = currentStatus === 'voted' ? null : 'voted';

    onUpdateSurveyMark(s, newStatus);
    setLastMarkedVoter(v);

    if (newStatus === 'voted') {
      playSuccessChime();
      showToast(`✅ #${s} ${v.n} — ఓటు నమోదైంది!`);
    } else {
      showToast(`↩️ #${s} ${v.n} — ఓటు రద్దు చేయబడింది`);
    }

    setPunchedSno('');
    inputRef.current?.focus();
  };

  const handlePadDigit = (digit: string) => {
    if (punchedSno.length >= 5) return;
    setPunchedSno(prev => prev + digit);
  };

  const handlePadBackspace = () => {
    setPunchedSno(prev => prev.slice(0, -1));
  };

  const handlePadClear = () => {
    setPunchedSno('');
  };

  const handleUndoLast = () => {
    if (!lastMarkedVoter) return;
    const s = lastMarkedVoter.s ?? (lastMarkedVoter as any).sno;
    onUpdateSurveyMark(s, null);
    showToast(`↩️ #${s} ${lastMarkedVoter.n} అన్‌మార్క్ చేయబడింది`);
    setLastMarkedVoter(null);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex flex-col items-center justify-start overflow-y-auto p-2 sm:p-4">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-4 z-50 bg-emerald-500 text-slate-950 font-black text-sm px-4 py-2 rounded-2xl shadow-2xl border-2 border-white animate-bounce flex items-center gap-2">
          <CheckCircle2 className="w-5 h-5" />
          <span>{toastMessage}</span>
        </div>
      )}

      <div className="bg-slate-900 border border-amber-500/50 rounded-3xl w-full max-w-4xl shadow-2xl text-white space-y-3.5 my-2 overflow-hidden">
        
        {/* Header Bar */}
        <div className="bg-gradient-to-r from-amber-600 via-orange-600 to-red-600 p-3.5 sm:p-4 text-white flex items-center justify-between gap-2 shadow-lg">
          <div className="flex items-center gap-2.5">
            <span className="p-2 bg-slate-950/40 text-amber-300 rounded-xl text-lg font-black shadow">
              ⚡
            </span>
            <div>
              <h2 className="text-base sm:text-lg font-black leading-tight flex items-center gap-2">
                <span>పోలింగ్ డే హై-స్పీడ్ ఏజెంట్ మోడ్</span>
                <span className="bg-slate-950/70 text-amber-300 text-xs px-2 py-0.5 rounded-full font-mono border border-amber-400/40">
                  Part #{boothInfo.part_no || boothInfo.ward_no}
                </span>
              </h2>
              <p className="text-[11px] text-amber-100 opacity-90 truncate">
                {boothInfo.clean_village || boothInfo.ps_address} • 1-ట్యాప్ ఓటింగ్ పంచ్
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="p-2 bg-slate-950/50 hover:bg-slate-950 text-white rounded-xl transition-all cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Live Turnout Banner & SOS Toggle */}
        <div className="px-4 grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs font-mono">
          <div className="bg-slate-950/80 p-2.5 rounded-2xl border border-slate-800">
            <span className="text-[10px] text-slate-400 font-bold block uppercase">పోలైన మొత్తం ఓట్లు</span>
            <div className="flex items-baseline gap-1.5 mt-0.5">
              <span className="text-lg font-black text-white">{pollStats.votedCount}</span>
              <span className="text-xs text-slate-400">/ {pollStats.totalVoters}</span>
              <span className="text-xs font-black text-amber-400 ml-auto">{pollStats.turnoutPct}%</span>
            </div>
          </div>

          <div className="bg-slate-950/80 p-2.5 rounded-2xl border border-slate-800">
            <span className="text-[10px] text-emerald-400 font-bold block uppercase">మనవాళ్ళు పోలింగ్ (JSP)</span>
            <div className="flex items-baseline gap-1.5 mt-0.5">
              <span className="text-lg font-black text-emerald-400">{pollStats.oursVoted}</span>
              <span className="text-xs text-slate-400">/ {pollStats.oursTotal}</span>
              <span className="text-xs font-black text-emerald-300 ml-auto">{pollStats.oursTurnoutPct}%</span>
            </div>
          </div>

          {/* SOS MISSING SUPPORTERS BUTTON */}
          <button
            type="button"
            onClick={() => setShowOnlyUnvotedOurs(!showOnlyUnvotedOurs)}
            className={`col-span-2 p-2.5 rounded-2xl border flex items-center justify-between transition-all cursor-pointer ${
              showOnlyUnvotedOurs
                ? 'bg-red-600 text-white border-red-400 ring-2 ring-red-400/50 shadow-lg'
                : 'bg-red-950/50 border-red-500/50 text-red-200 hover:bg-red-900/60'
            }`}
          >
            <div className="flex items-center gap-2">
              <span className="p-1.5 bg-red-500 text-white rounded-lg animate-pulse">
                <Flame className="w-4 h-4" />
              </span>
              <div className="text-left">
                <span className="text-xs font-black block">
                  🔥 మనవాళ్ళు - ఇంకా ఓటు వేయనివారు
                </span>
                <span className="text-[10px] opacity-80">
                  {showOnlyUnvotedOurs ? 'అందరినీ చూపించు' : 'వెంటనే రప్పించడానికి లిస్ట్ చూడండి'}
                </span>
              </div>
            </div>
            <span className="text-xl font-black font-mono">
              {pollStats.unvotedOursList.length} మంది
            </span>
          </button>
        </div>

        {/* MAIN BODY: Fast Punch Pad OR SOS Unvoted List */}
        {!showOnlyUnvotedOurs ? (
          <div className="px-4 pb-4 grid grid-cols-1 md:grid-cols-12 gap-3.5">
            {/* Left 6 cols: Punch Input & Touch Keypad */}
            <div className="md:col-span-6 space-y-3">
              {/* Big S.No Input Field */}
              <div className="relative">
                <div className="bg-slate-950 border-2 border-amber-500/70 rounded-2xl p-3 flex items-center justify-between shadow-inner">
                  <div className="flex items-center gap-2">
                    <span className="text-slate-400 font-mono text-sm font-black">S.NO #</span>
                    <input
                      ref={inputRef}
                      type="text"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      value={punchedSno}
                      onChange={e => setPunchedSno(e.target.value.replace(/[^0-9]/g, '').slice(0, 5))}
                      onKeyDown={e => {
                        if (e.key === 'Enter' && currentPreviewVoter) {
                          handleMarkVoted(currentPreviewVoter);
                        }
                      }}
                      placeholder="సీరియల్ నెం..."
                      className="text-2xl font-black font-mono bg-transparent text-amber-300 focus:outline-none w-36 tracking-wider"
                    />
                  </div>
                  {punchedSno && (
                    <button
                      type="button"
                      onClick={handlePadClear}
                      className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-bold"
                    >
                      క్లియర్
                    </button>
                  )}
                </div>
              </div>

              {/* High-Contrast Fast Touch Pad (3x4 Grid) */}
              <div className="grid grid-cols-3 gap-2">
                {['1', '2', '3', '4', '5', '6', '7', '8', '9', 'C', '0', '⌫'].map(k => (
                  <button
                    key={k}
                    type="button"
                    onClick={() => {
                      if (k === 'C') handlePadClear();
                      else if (k === '⌫') handlePadBackspace();
                      else handlePadDigit(k);
                    }}
                    className={`py-3.5 rounded-2xl font-mono text-xl font-black shadow transition-all active:scale-95 cursor-pointer select-none ${
                      k === 'C'
                        ? 'bg-rose-950 text-rose-300 border border-rose-800 hover:bg-rose-900'
                        : k === '⌫'
                          ? 'bg-slate-800 text-slate-200 border border-slate-700 hover:bg-slate-700'
                          : 'bg-slate-800/90 text-white border border-slate-700 hover:bg-slate-700 text-2xl'
                    }`}
                  >
                    {k}
                  </button>
                ))}
              </div>

              {/* Quick Undo Button */}
              {lastMarkedVoter && (
                <button
                  type="button"
                  onClick={handleUndoLast}
                  className="w-full py-2 bg-slate-800 hover:bg-slate-700 text-amber-300 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 border border-slate-700 transition-all cursor-pointer"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>చివరి ఓటు రద్దు (#{(lastMarkedVoter as any).s} {lastMarkedVoter.n})</span>
                </button>
              )}
            </div>

            {/* Right 6 cols: Live Voter Card Preview & Punch Action */}
            <div className="md:col-span-6 bg-slate-950/80 rounded-2xl border border-slate-800 p-3.5 flex flex-col justify-between">
              {currentPreviewVoter ? (
                (() => {
                  const s = currentPreviewVoter.s ?? (currentPreviewVoter as any).sno;
                  const p = profiles[s] || {};
                  const isVoted = p.survey_status === 'voted' || (p as any).is_voted;
                  const isOurs = (p.supportPct !== undefined && p.supportPct >= 75) || p.survey_status === 'supporter';
                  const isNeutral = p.supportPct !== undefined && p.supportPct > 25 && p.supportPct < 75;

                  return (
                    <div className="space-y-3 h-full flex flex-col justify-between animate-in fade-in">
                      {/* Top S.No & Status */}
                      <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-black text-xl text-amber-300 bg-amber-950/80 border border-amber-500/50 px-2.5 py-0.5 rounded-xl">
                            #{s}
                          </span>
                          <span className="font-mono text-xs font-bold bg-slate-900 text-slate-300 px-2 py-0.5 rounded-lg border border-slate-700">
                            {currentPreviewVoter.id}
                          </span>
                        </div>

                        {/* Leaning Badge */}
                        {isOurs ? (
                          <span className="bg-emerald-600 text-white font-black text-xs px-2.5 py-1 rounded-xl shadow flex items-center gap-1">
                            ⭐ మనవాళ్ళు (100%)
                          </span>
                        ) : isNeutral ? (
                          <span className="bg-amber-600 text-white font-bold text-xs px-2 py-0.5 rounded-lg">
                            ❓ తటస్థులు
                          </span>
                        ) : (
                          <span className="bg-slate-800 text-slate-300 text-xs px-2 py-0.5 rounded-lg">
                            సాధారణ ఓటరు
                          </span>
                        )}
                      </div>

                      {/* Voter Details & Photo Card */}
                      <div className="flex items-start gap-3">
                        {currentPreviewVoter.card_url || currentPreviewVoter.card ? (
                          <img
                            src={resolvePhotoUrl(currentPreviewVoter.card_url || currentPreviewVoter.card)}
                            alt={currentPreviewVoter.n}
                            className="w-24 h-auto object-contain rounded-xl border border-amber-500/40 bg-slate-900 shadow shrink-0"
                          />
                        ) : null}

                        <div className="min-w-0 space-y-1">
                          <h3 className="font-black text-base text-white leading-tight">
                            {currentPreviewVoter.n}
                          </h3>
                          {currentPreviewVoter.r && (
                            <p className="text-xs text-slate-400">సంబంధం: {currentPreviewVoter.r}</p>
                          )}
                          <p className="text-xs text-slate-300 font-bold">
                            వయస్సు: {currentPreviewVoter.a} • ఇంటి నెం: <span className="font-mono text-amber-300">{currentPreviewVoter.hn || '—'}</span>
                          </p>
                          {p.customPhone && (
                            <p className="text-xs font-mono text-emerald-400 flex items-center gap-1">
                              <Phone className="w-3 h-3" /> {p.customPhone}
                            </p>
                          )}
                        </div>
                      </div>

                      {/* BIG FAST-PUNCH ACTION BUTTON */}
                      <button
                        type="button"
                        onClick={() => handleMarkVoted(currentPreviewVoter)}
                        className={`w-full py-4 rounded-2xl font-black text-base flex items-center justify-center gap-2 shadow-2xl transition-all active:scale-95 cursor-pointer ${
                          isVoted
                            ? 'bg-rose-600 hover:bg-rose-500 text-white shadow-rose-950/60 ring-2 ring-rose-300'
                            : 'bg-gradient-to-r from-emerald-500 via-teal-400 to-emerald-600 hover:from-emerald-400 hover:to-emerald-500 text-slate-950 shadow-emerald-950/60 ring-2 ring-white/60 animate-pulse'
                        }`}
                      >
                        <CheckCircle2 className="w-6 h-6" />
                        <span>{isVoted ? 'ఓటు రద్దు చేయండి (Unmark)' : 'ఓటు వేశారు (MARK VOTED)'}</span>
                      </button>
                    </div>
                  );
                })()
              ) : (
                <div className="h-full flex flex-col items-center justify-center text-center text-slate-500 space-y-2 py-12">
                  <Zap className="w-12 h-12 text-amber-500/40 animate-pulse" />
                  <p className="text-sm font-bold text-slate-300">సీరియల్ నెంబర్ ఎంటర్ చేయండి</p>
                  <p className="text-xs text-slate-500 max-w-xs">
                    కీప్యాడ్‌లో నెంబర్ నొక్కగానే ఓటరు ఫొటో & వివరాలు కనిపిస్తాయి. Enter లేదా బటన్ నొక్కగానే క్షణంలో ఓటు మార్క్ అవుతుంది.
                  </p>
                </div>
              )}
            </div>
          </div>
        ) : (
          /* SOS LIST: Our Unvoted Electors */
          <div className="px-4 pb-4 space-y-3">
            <div className="bg-red-950/40 border border-red-500/40 rounded-2xl p-3 flex items-center justify-between text-xs text-red-200">
              <span className="font-bold flex items-center gap-1.5">
                <AlertTriangle className="w-4 h-4 text-red-400" />
                <span>ఇంకా ఓటు వేయని మన మద్దతుదారులు ({pollStats.unvotedOursList.length} మంది). బైక్ టీమ్‌లను వీరి ఇళ్లకు వెంటనే పంపండి!</span>
              </span>
              <button
                type="button"
                onClick={() => setShowOnlyUnvotedOurs(false)}
                className="text-white bg-red-600 hover:bg-red-500 px-3 py-1 rounded-xl font-bold cursor-pointer"
              >
                కీప్యాడ్‌కు వెళ్లు
              </button>
            </div>

            <div className="max-h-[55vh] overflow-y-auto space-y-2">
              {pollStats.unvotedOursList.map(v => {
                const s = v.s ?? (v as any).sno;
                const p = profiles[s] || {};
                const phone = p.customPhone || v.k_m;

                return (
                  <div
                    key={s}
                    className="p-3 bg-slate-950/90 rounded-2xl border border-slate-800 hover:border-amber-500/50 flex items-center justify-between gap-3 transition-all"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <span className="font-mono font-black text-sm bg-red-950 text-red-300 border border-red-500/40 px-2.5 py-1 rounded-xl shrink-0">
                        #{s}
                      </span>
                      <div className="min-w-0 space-y-0.5">
                        <h4 className="font-black text-sm text-white truncate">{v.n}</h4>
                        <p className="text-xs text-slate-400">
                          ఇంటి నెం: <strong className="text-amber-300">{v.hn || '—'}</strong> • వయస్సు: {v.a} • వార్డు #{v.ward_no || (v as any).w || boothInfo.ward_no}
                        </p>
                        {phone && (
                          <span className="font-mono text-xs text-emerald-400 font-bold block">
                            📞 {phone}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      {phone && (
                        <a
                          href={`tel:${phone}`}
                          className="p-2 bg-emerald-600/30 text-emerald-300 hover:bg-emerald-600 hover:text-white rounded-xl transition-all"
                          title="కాల్ చేయండి"
                        >
                          <Phone className="w-4 h-4" />
                        </a>
                      )}
                      <button
                        type="button"
                        onClick={() => handleMarkVoted(v)}
                        className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold flex items-center gap-1 shadow cursor-pointer active:scale-95"
                      >
                        <Check className="w-4 h-4" />
                        <span>ఓటు వేశారు</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

      </div>
    </div>
  );
};
