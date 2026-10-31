import React, { useState, useEffect } from 'react';
import { X, Clock, Share2, CheckCircle2, TrendingUp, Send, AlertCircle, Save } from 'lucide-react';
import { BoothInfo, MobileVoter, VoterCampaignProfile } from '../types';
import { Language } from '../utils/i18n';

interface HourlyTurnoutModalProps {
  boothInfo: BoothInfo;
  voters: MobileVoter[];
  profiles: Record<number, VoterCampaignProfile>;
  language?: Language;
  onClose: () => void;
}

interface TurnoutSnapshot {
  slot: string;
  labelTe: string;
  labelEn: string;
  votesPolled: number;
  totalVoters: number;
  pct: number;
  recordedAt?: string;
}

const DEFAULT_SLOTS = [
  { slot: '7_AM', labelTe: 'ఉదయం 7:00 (ప్రారంభం)', labelEn: '7:00 AM (Start)' },
  { slot: '9_AM', labelTe: 'ఉదయం 9:00', labelEn: '9:00 AM' },
  { slot: '11_AM', labelTe: 'ఉదయం 11:00', labelEn: '11:00 AM' },
  { slot: '1_PM', labelTe: 'మధ్యాహ్నం 1:00', labelEn: '1:00 PM' },
  { slot: '3_PM', labelTe: 'మధ్యాహ్నం 3:00', labelEn: '3:00 PM' },
  { slot: '5_PM', labelTe: 'సాయంత్రం 5:00 (ముగింపు)', labelEn: '5:00 PM (Final)' },
];

export const HourlyTurnoutModal: React.FC<HourlyTurnoutModalProps> = ({
  boothInfo,
  voters,
  profiles,
  language = 'te',
  onClose
}) => {
  const storageKey = `jsp_hourly_turnout_${boothInfo?.part_no || 'default'}`;

  // Calculate live stats right now
  const eligibleVoters = voters.filter(v => {
    const prof = profiles[v.s] || {};
    return prof.survey_status !== 'deceased';
  });

  const liveVotedCount = voters.filter(v => {
    const prof = profiles[v.s] || {};
    return prof.survey_status === 'voted';
  }).length;

  const liveOursVoted = voters.filter(v => {
    const prof = profiles[v.s] || {};
    return prof.supportPct === 100 && prof.survey_status === 'voted';
  }).length;

  const liveOursPending = voters.filter(v => {
    const prof = profiles[v.s] || {};
    return prof.supportPct === 100 && prof.survey_status !== 'voted' && prof.survey_status !== 'deceased';
  }).length;

  const totalElectors = eligibleVoters.length || 1;
  const livePct = Number(((liveVotedCount / totalElectors) * 100).toFixed(1));

  // Load saved snapshots
  const [snapshots, setSnapshots] = useState<Record<string, TurnoutSnapshot>>(() => {
    try {
      const saved = localStorage.getItem(storageKey);
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });

  const [savedSuccessSlot, setSavedSuccessSlot] = useState<string | null>(null);

  const handleRecordSnapshot = (slot: string, labelTe: string, labelEn: string) => {
    const updated: Record<string, TurnoutSnapshot> = {
      ...snapshots,
      [slot]: {
        slot,
        labelTe,
        labelEn,
        votesPolled: liveVotedCount,
        totalVoters: totalElectors,
        pct: livePct,
        recordedAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      }
    };

    setSnapshots(updated);
    try {
      localStorage.setItem(storageKey, JSON.stringify(updated));
    } catch {}

    setSavedSuccessSlot(slot);
    setTimeout(() => setSavedSuccessSlot(null), 2500);
  };

  const handleShareToWhatsApp = () => {
    const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const dateStr = new Date().toLocaleDateString('te-IN');

    let historyText = '';
    DEFAULT_SLOTS.forEach(s => {
      const snap = snapshots[s.slot];
      if (snap) {
        historyText += `\n• *${snap.labelTe}:* ${snap.votesPolled} ఓట్లు (${snap.pct}%) - [${snap.recordedAt}]`;
      }
    });

    const boothLabel = boothInfo.election_type === 'municipal'
      ? `వార్డు #${boothInfo.ward_no || 14}: ${boothInfo.clean_village}`
      : `బూత్ #${boothInfo.part_no}: ${boothInfo.clean_village}`;

    const text = `🚩 *జనసేన పార్టీ - పిఠాపురం నియోజకవర్గం*
🏛️ *పోలింగ్ డే లైవ్ టర్నౌట్ రిపోర్ట్*
━━━━━━━━━━━━━━━━━━
📍 *కేంద్రం:* ${boothLabel}
🏢 *లొకేషన్:* ${boothInfo.ps_address || '-'}
⏰ *సమయం:* ${timeStr} | ${dateStr}

📊 *లైవ్ పోలింగ్ గణాంకాలు:*
• మొత్తం ఓటర్లు: *${totalElectors}*
• ఇప్పటివరకు పోలైన ఓట్లు: *${liveVotedCount}* (*${livePct}%*)
• ఇంకా పోల్ కావాల్సినవి: *${totalElectors - liveVotedCount}*

🚩 *జనసేన బలం (మనవాళ్లు 100%):*
• ఓటు వేసిన మనవాళ్లు: *${liveOursVoted}*
• ఇంకా బూత్‌కు రావాల్సిన మనవాళ్లు: *${liveOursPending}*
${historyText ? `\n🕒 *గంటల వారీ టర్నౌట్ రికార్డు:*${historyText}\n` : ''}
_గాజు గ్లాసు గుర్తుకే మన ఓటు! పవన్ కళ్యాణ్ గారి భారీ మెజారిటీ కోసం పనిచేస్తున్నాం!_ 🚩`;

    const url = `https://wa.me/?text=${encodeURIComponent(text)}`;
    window.open(url, '_blank');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="bg-slate-900 border-2 border-amber-500/60 rounded-3xl max-w-lg w-full max-h-[92vh] flex flex-col shadow-2xl overflow-hidden text-xs">
        
        {/* Header */}
        <div className="p-4 bg-gradient-to-r from-amber-950 via-slate-900 to-red-950/60 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/20 border border-amber-500/50 flex items-center justify-center text-amber-400 shadow-md">
              <Clock className="w-5 h-5 text-amber-400" />
            </div>
            <div>
              <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 text-[10px] font-black uppercase tracking-wider border border-amber-500/40">
                {language === 'te' ? 'పోలింగ్ డే రిపోర్టర్' : 'Hourly Polling Tracker'}
              </span>
              <h2 className="text-base font-black text-white mt-0.5">
                {language === 'te' ? '🕒 గంట గంటకూ పోలింగ్ శాతం రికార్డర్' : '🕒 Hourly Turnout Tracker'}
              </h2>
            </div>
          </div>

          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 p-2 rounded-full transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Live Turnout Card */}
        <div className="p-3.5 bg-slate-950/80 border-b border-slate-800 space-y-2">
          <div className="flex items-center justify-between text-slate-300">
            <span className="font-bold flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping inline-block" />
              {language === 'te' ? 'ప్రస్తుత లైవ్ పోలింగ్:' : 'Current Live Polling:'}
            </span>
            <span className="font-mono text-emerald-400 font-black text-sm">
              {liveVotedCount} / {totalElectors} ({livePct}%)
            </span>
          </div>

          {/* Progress Bar */}
          <div className="w-full bg-slate-800 rounded-full h-2.5 overflow-hidden">
            <div
              className="bg-gradient-to-r from-amber-500 to-emerald-500 h-full rounded-full transition-all duration-500"
              style={{ width: `${Math.min(100, livePct)}%` }}
            />
          </div>

          {/* Quick Stats Grid */}
          <div className="grid grid-cols-2 gap-2 pt-1 text-[11px]">
            <div className="bg-slate-900 border border-slate-800 p-2 rounded-xl">
              <span className="text-slate-400 block text-[10px]">🚩 ఓటేసిన మనవాళ్లు</span>
              <strong className="text-emerald-400 font-mono text-sm">{liveOursVoted}</strong>
            </div>
            <div className="bg-slate-900 border border-slate-800 p-2 rounded-xl">
              <span className="text-slate-400 block text-[10px]">⏳ మన పెండింగ్ ఓటర్లు</span>
              <strong className="text-amber-400 font-mono text-sm">{liveOursPending}</strong>
            </div>
          </div>
        </div>

        {/* Milestone Slot Tracker */}
        <div className="flex-1 overflow-y-auto p-3.5 space-y-2">
          <h3 className="text-slate-400 font-black text-[11px] uppercase tracking-wider mb-2">
            {language === 'te' ? 'పోలింగ్ సమయ స్లాట్లు (Milestone Snapshots):' : 'Turnout Milestone Slots:'}
          </h3>

          <div className="space-y-2">
            {DEFAULT_SLOTS.map(s => {
              const snap = snapshots[s.slot];
              const isSaved = savedSuccessSlot === s.slot;

              return (
                <div
                  key={s.slot}
                  className={`border rounded-2xl p-3 flex items-center justify-between transition-all ${
                    snap
                      ? 'bg-slate-950/70 border-emerald-500/40'
                      : 'bg-slate-950/40 border-slate-800 hover:border-slate-700'
                  }`}
                >
                  <div>
                    <div className="flex items-center gap-1.5">
                      <span className="font-bold text-white text-xs">
                        {language === 'te' ? s.labelTe : s.labelEn}
                      </span>
                      {snap && (
                        <span className="text-[9px] px-1.5 py-0.2 rounded bg-emerald-950 text-emerald-300 border border-emerald-500/40 font-mono font-bold">
                          ✓ {snap.recordedAt}
                        </span>
                      )}
                    </div>

                    {snap ? (
                      <p className="text-[11px] text-emerald-400 font-mono font-bold mt-0.5">
                        {snap.votesPolled} ఓట్లు ({snap.pct}%)
                      </p>
                    ) : (
                      <p className="text-[10px] text-slate-500 mt-0.5">
                        {language === 'te' ? 'ఇంకా నమోదు చేయలేదు' : 'Not recorded yet'}
                      </p>
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={() => handleRecordSnapshot(s.slot, s.labelTe, s.labelEn)}
                    className={`px-3 py-1.5 rounded-xl font-black text-[10px] flex items-center gap-1.5 active:scale-95 transition-all shadow-sm ${
                      isSaved
                        ? 'bg-emerald-600 text-white'
                        : snap
                          ? 'bg-slate-800 hover:bg-slate-700 text-amber-300 border border-slate-700'
                          : 'bg-amber-500 hover:bg-amber-400 text-slate-950'
                    }`}
                  >
                    {isSaved ? (
                      <>
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>నమోదైంది!</span>
                      </>
                    ) : snap ? (
                      <>
                        <Save className="w-3 h-3 text-amber-400" />
                        <span>అప్‌డేట్</span>
                      </>
                    ) : (
                      <>
                        <Save className="w-3 h-3" />
                        <span>ఇప్పుడే రికార్డ్ చేయండి</span>
                      </>
                    )}
                  </button>
                </div>
              );
            })}
          </div>
        </div>

        {/* Footer with WhatsApp War Room Share */}
        <div className="p-3.5 bg-slate-950 border-t border-slate-800 space-y-2">
          <button
            onClick={handleShareToWhatsApp}
            className="w-full py-2.5 rounded-2xl font-black text-xs bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-600 hover:from-emerald-500 hover:to-teal-500 text-white flex items-center justify-center gap-2 shadow-lg shadow-emerald-950/50 active:scale-98 transition-all"
          >
            <Send className="w-4 h-4" />
            <span>
              {language === 'te' ? '📲 వార్ రూమ్‌కి పోలింగ్ రిపోర్ట్ వాట్సాప్ చేయండి' : '📲 Share Turnout Report to War Room'}
            </span>
          </button>
          
          <div className="flex justify-end">
            <button
              onClick={onClose}
              className="text-slate-400 hover:text-white text-xs font-bold px-3 py-1"
            >
              {language === 'te' ? 'ముగించు' : 'Close'}
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
