import React, { useState } from 'react';
import { X, Check, Calendar, User, Clock, AlertCircle, PhoneCall, MessageSquare, History, Plus, FileText, ChevronRight } from 'lucide-react';
import { MobileVoter, VoterVisit, VoterCampaignProfile } from '../types';

interface LogVisitModalProps {
  voter: MobileVoter;
  profile?: VoterCampaignProfile;
  onSaveVisit: (visit: VoterVisit) => void;
  onClose: () => void;
}

const COMMON_ISSUES = [
  'General Campaign / Goodwill',
  'Pension Delay / Sanction',
  'Drinking Water Supply',
  'Road & Drainage Issues',
  'DWCRA Women Loan / Scheme',
  'Youth Job / Skill Training',
  'Aarogyasri / Health Grievance',
  'Ration Card / Housing Issue'
];

const VISITOR_ROLES = [
  'Ward Member',
  'Karyakartha / Volunteer',
  'Sarpanch / MPTC',
  'Booth In-charge',
  'Youth Wing Leader',
  'Candidate / Key Representative'
];

export const LogVisitModal: React.FC<LogVisitModalProps> = ({
  voter,
  profile,
  onSaveVisit,
  onClose
}) => {
  const currentSentiment = profile?.supportPct !== undefined ? profile.supportPct : (voter.kriya ? 100 : 50);
  const visits = profile?.visits || [];
  const phone = profile?.customPhone || voter.k_m;

  const [visitorRole, setVisitorRole] = useState<string>('Ward Member');
  const [visitorName, setVisitorName] = useState<string>('');
  const [keyIssue, setKeyIssue] = useState<string>('General Campaign / Goodwill');
  const [sentimentAfter, setSentimentAfter] = useState<number>(currentSentiment);
  const [notes, setNotes] = useState<string>('');
  const [showHistoryOnly, setShowHistoryOnly] = useState<boolean>(visits.length > 0 && false);

  const handleSave = () => {
    if (!notes.trim()) {
      alert('Please enter brief ground notes about the conversation.');
      return;
    }

    const now = new Date();
    const dateFormatted = now.toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit'
    });

    const newVisit: VoterVisit = {
      id: `visit_${Date.now()}`,
      date: dateFormatted,
      visitorName: visitorName.trim() ? `${visitorName.trim()} (${visitorRole})` : visitorRole,
      sentimentAfter,
      notes: notes.trim(),
      keyIssue
    };

    onSaveVisit(newVisit);
    onClose();
  };

  const getSentimentBadge = (pct: number) => {
    if (pct === 100) return <span className="px-2 py-0.5 bg-red-600/30 text-red-300 border border-red-500/50 rounded-md text-[10px] font-black">🚩 100% Support</span>;
    if (pct >= 75) return <span className="px-2 py-0.5 bg-emerald-600/30 text-emerald-300 border border-emerald-500/50 rounded-md text-[10px] font-black">🟢 {pct}% Strong</span>;
    if (pct === 40) return <span className="px-2 py-0.5 bg-amber-600/30 text-amber-300 border border-amber-500/50 rounded-md text-[10px] font-black">🟡 40% Positive</span>;
    if (pct === 0) return <span className="px-2 py-0.5 bg-rose-950/80 text-rose-400 border border-rose-500/50 rounded-md text-[10px] font-black">🔴 0% Opponent</span>;
    if (pct <= 25) return <span className="px-2 py-0.5 bg-orange-600/30 text-orange-300 border border-orange-500/50 rounded-md text-[10px] font-bold">🟠 {pct}% Doubtful</span>;
    return <span className="px-2 py-0.5 bg-slate-800 text-slate-300 border border-slate-700 rounded-md text-[10px] font-medium">⚪ 50% Neutral</span>;
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-sm flex items-end sm:items-center justify-center p-3 animate-in fade-in duration-150">
      <div className="bg-slate-900 border border-amber-500/40 rounded-3xl max-w-md w-full p-5 space-y-4 shadow-2xl relative max-h-[90vh] overflow-y-auto">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-white bg-slate-800 p-1.5 rounded-full"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Modal Header */}
        <div className="border-b border-slate-800 pb-3">
          <div className="flex items-center gap-1.5 text-xs text-amber-400 font-bold uppercase tracking-wider">
            <History className="w-3.5 h-3.5 text-amber-400" />
            Field Visit Tracker & Touchpoint Log
          </div>
          <h3 className="text-base font-black text-white mt-0.5">{voter.n}</h3>
          <div className="flex items-center gap-2 text-[11px] text-slate-400 mt-1 flex-wrap">
            <span className="font-mono text-amber-300 font-bold">S.No #{voter.s}</span>
            <span>•</span>
            <span className="font-mono text-emerald-400">{voter.id || 'NO-EPIC'}</span>
            <span>•</span>
            <span>H.No: <strong className="text-white">{voter.hn || '-'}</strong></span>
            <span>•</span>
            <span>Current: {getSentimentBadge(currentSentiment)}</span>
          </div>

          {/* Instant Call / WA Bar */}
          {phone && (
            <div className="flex items-center gap-2 mt-2 pt-2 border-t border-slate-800/60">
              <span className="text-[10px] text-slate-400">Direct Contact:</span>
              <a
                href={`tel:${phone}`}
                className="px-2 py-0.5 bg-emerald-600/20 text-emerald-400 border border-emerald-500/30 rounded-lg text-[10px] font-bold flex items-center gap-1"
              >
                <PhoneCall className="w-3 h-3" />
                <span>Call {phone}</span>
              </a>
              <a
                href={`https://wa.me/91${phone}`}
                target="_blank"
                rel="noreferrer"
                className="px-2 py-0.5 bg-emerald-600 text-slate-950 font-bold rounded-lg text-[10px] flex items-center gap-1"
              >
                <MessageSquare className="w-3 h-3" />
                <span>WhatsApp</span>
              </a>
            </div>
          )}
        </div>

        {/* Tab Switcher: Log Visit Form vs Visit History */}
        <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800">
          <button
            onClick={() => setShowHistoryOnly(false)}
            className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
              !showHistoryOnly
                ? 'bg-amber-500 text-slate-950 shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Plus className="w-3.5 h-3.5" />
            <span>+ Log New Visit</span>
          </button>

          <button
            onClick={() => setShowHistoryOnly(true)}
            className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
              showHistoryOnly
                ? 'bg-amber-500 text-slate-950 shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            <span>History ({visits.length})</span>
          </button>
        </div>

        {/* 1. New Visit Logging Form */}
        {!showHistoryOnly && (
          <div className="space-y-3.5">
            {/* Visitor Role & Optional Name */}
            <div className="space-y-1.5">
              <label className="text-[10px] uppercase font-bold text-slate-400 block">
                Visitor Designation / Role
              </label>
              <div className="grid grid-cols-2 gap-1.5">
                {VISITOR_ROLES.map(role => (
                  <button
                    key={role}
                    type="button"
                    onClick={() => setVisitorRole(role)}
                    className={`p-1.5 rounded-xl text-[11px] font-bold text-left border transition-all ${
                      visitorRole === role
                        ? 'bg-amber-500/20 text-amber-300 border-amber-500/50'
                        : 'bg-slate-950 text-slate-400 border-slate-800 hover:bg-slate-800'
                    }`}
                  >
                    {role}
                  </button>
                ))}
              </div>

              <input
                type="text"
                value={visitorName}
                onChange={e => setVisitorName(e.target.value)}
                placeholder="Visitor Name (Optional, e.g. Ramu / Suresh)"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-amber-400 mt-1"
              />
            </div>

            {/* Key Issue Discussed */}
            <div className="space-y-1">
              <label className="text-[10px] uppercase font-bold text-slate-400 block">
                Primary Issue Discussed / Voter Demand
              </label>
              <select
                value={keyIssue}
                onChange={e => setKeyIssue(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-400 font-medium"
              >
                {COMMON_ISSUES.map(iss => (
                  <option key={iss} value={iss} className="bg-slate-900 text-white">
                    {iss}
                  </option>
                ))}
              </select>
            </div>

            {/* Updated Sentiment After This Visit */}
            <div className="space-y-1.5">
              <label className="text-[10px] uppercase font-bold text-slate-400 flex items-center justify-between">
                <span>Voter Support After This Visit</span>
                <span className="text-amber-400 font-mono font-black">{sentimentAfter}%</span>
              </label>
              <div className="grid grid-cols-3 gap-1">
                {[
                  { pct: 100, label: '100% Support' },
                  { pct: 75, label: '75% Strong' },
                  { pct: 40, label: '40% Positive' },
                  { pct: 50, label: '50% Neutral' },
                  { pct: 25, label: '25% Doubtful' },
                  { pct: 0, label: '0% Opponent' }
                ].map(item => (
                  <button
                    key={item.pct}
                    type="button"
                    onClick={() => setSentimentAfter(item.pct)}
                    className={`py-1.5 px-2 rounded-xl text-[10px] font-bold border transition-all ${
                      sentimentAfter === item.pct
                        ? item.pct === 100
                          ? 'bg-red-600 text-white border-red-500 shadow-sm'
                          : item.pct >= 75
                            ? 'bg-emerald-600 text-white border-emerald-500 shadow-sm'
                            : item.pct === 40
                              ? 'bg-amber-600 text-slate-950 border-amber-500 shadow-sm'
                              : item.pct === 0
                                ? 'bg-rose-900 text-rose-200 border-rose-600 shadow-sm'
                                : 'bg-slate-700 text-white border-slate-600'
                        : 'bg-slate-950 text-slate-400 border-slate-800 hover:bg-slate-800'
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Detailed Ground Notes */}
            <div className="space-y-1">
              <label className="text-[10px] uppercase font-bold text-slate-400 block">
                Ground Notes & Next Action
              </label>
              <textarea
                value={notes}
                onChange={e => setNotes(e.target.value)}
                placeholder="What did the voter say? Will they vote Glass? Any specific promise or follow-up needed before polling day?"
                rows={3}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-amber-400"
              />
            </div>

            {/* Save Button */}
            <button
              onClick={handleSave}
              className="w-full py-2.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black rounded-xl text-xs flex items-center justify-center gap-1.5 shadow-md shadow-amber-950/40"
            >
              <Check className="w-4 h-4" />
              <span>Save Visit & Update Winning Score</span>
            </button>
          </div>
        )}

        {/* 2. Chronological Visits History */}
        {showHistoryOnly && (
          <div className="space-y-2.5">
            {visits.length === 0 ? (
              <div className="py-8 text-center text-slate-500 text-xs space-y-1">
                <AlertCircle className="w-6 h-6 text-slate-600 mx-auto" />
                <p className="font-bold text-slate-400">No visits logged yet for this voter</p>
                <p className="text-[11px]">Click "+ Log New Visit" to record the first door-to-door interaction.</p>
              </div>
            ) : (
              visits.map((v, idx) => (
                <div
                  key={v.id || idx}
                  className="bg-slate-950 border border-slate-800/80 rounded-2xl p-3 space-y-1.5 relative overflow-hidden"
                >
                  <div className="flex items-center justify-between text-[11px]">
                    <div className="flex items-center gap-1.5">
                      <span className="w-5 h-5 rounded-full bg-amber-500/20 text-amber-300 font-bold font-mono text-[10px] flex items-center justify-center border border-amber-500/40">
                        #{visits.length - idx}
                      </span>
                      <strong className="text-white">{v.visitorName}</strong>
                    </div>
                    <span className="text-[10px] text-slate-400 flex items-center gap-1">
                      <Clock className="w-3 h-3 text-slate-500" />
                      {v.date}
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-[10px]">
                    <span className="px-2 py-0.5 bg-slate-900 text-amber-300 border border-slate-800 rounded font-medium">
                      📌 {v.keyIssue || 'General Campaign'}
                    </span>
                    <div>
                      {getSentimentBadge(v.sentimentAfter)}
                    </div>
                  </div>

                  <p className="text-[11px] text-slate-300 bg-slate-900/60 p-2 rounded-xl border border-slate-800/60 leading-relaxed">
                    {v.notes}
                  </p>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
};
