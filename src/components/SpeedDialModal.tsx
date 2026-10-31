import React, { useState, useMemo } from 'react';
import { X, Phone, PhoneCall, MessageSquare, CheckCircle2, Search, Zap, AlertCircle, UserCheck } from 'lucide-react';
import { MobileVoter, BoothInfo, VoterCampaignProfile } from '../types';
import { Language } from '../utils/i18n';

interface SpeedDialModalProps {
  voters: MobileVoter[];
  profiles: Record<number, VoterCampaignProfile>;
  boothInfo: BoothInfo;
  language?: Language;
  onQuickToggleVoted: (serialNo: number) => void;
  onOpenPhoneEditor: (voter: MobileVoter) => void;
  onClose: () => void;
}

export const SpeedDialModal: React.FC<SpeedDialModalProps> = ({
  voters,
  profiles,
  boothInfo,
  language = 'te',
  onQuickToggleVoted,
  onOpenPhoneEditor,
  onClose
}) => {
  const [search, setSearch] = useState('');
  const [filterPhoneOnly, setFilterPhoneOnly] = useState(false);

  // Filter 100% "మనవాళ్లే" voters who haven't voted yet, excluding deceased & out of city
  const pendingOurs = useMemo(() => {
    return voters.filter(v => {
      const prof = profiles[v.s] || {};
      const pct = prof.supportPct;
      const status = prof.survey_status;
      
      const isOurs = pct === 100;
      const isNotVoted = status !== 'voted';
      const isAvailable = status !== 'deceased' && status !== 'out_of_city';

      return isOurs && isNotVoted && isAvailable;
    });
  }, [voters, profiles]);

  // Apply search and phone filter
  const displayedList = useMemo(() => {
    let list = pendingOurs;

    if (filterPhoneOnly) {
      list = list.filter(v => {
        const prof = profiles[v.s] || {};
        return !!(prof.customPhone || v.k_m);
      });
    }

    if (search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter(v => {
        const sMatch = String(v.s) === q || String(v.s).includes(q);
        const nMatch = (v.n || '').toLowerCase().includes(q);
        const prof = profiles[v.s] || {};
        const pMatch = (prof.customPhone || v.k_m || '').includes(q);
        return sMatch || nMatch || pMatch;
      });
    }

    return list;
  }, [pendingOurs, filterPhoneOnly, search, profiles]);

  const totalWithPhone = useMemo(() => {
    return pendingOurs.filter(v => {
      const prof = profiles[v.s] || {};
      return !!(prof.customPhone || v.k_m);
    }).length;
  }, [pendingOurs, profiles]);

  const handleSendWhatsAppSlip = (v: MobileVoter, phone: string) => {
    const cleanPhone = phone.replace(/[^0-9]/g, '');
    const text = `🚩 *జనసేన పార్టీ - పిఠాపురం నియోజకవర్గం*
🏛️ *గాజు గ్లాసు గుర్తుకే మన ఓటు!*

నమస్తే *${v.n}* గారు,

మీ ఓటర్ సమాచారం:
🔢 *క్రమ సంఖ్య (S.No):* #${v.s}
🆔 *ఓటర్ ఐడీ (EPIC):* ${v.id}
🏠 *ఇంటి నెం:* ${v.hn || '-'}
🏛️ *పోలింగ్ కేంద్రం:* ${boothInfo.ps_address}
⏰ *పోలింగ్ సమయం:* ఉదయం 7:00 నుండి సాయంత్రం 5:00 వరకు

_దయచేసి వెంటనే మీ ఓటు హక్కును వినియోగించుకోండి! జై హింద్! జై జనసేన!_ 🚩`;

    const url = `https://wa.me/${cleanPhone.startsWith('91') ? cleanPhone : '91' + cleanPhone}?text=${encodeURIComponent(text)}`;
    window.open(url, '_blank');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="bg-slate-900 border-2 border-red-500/60 rounded-3xl max-w-lg w-full max-h-[92vh] flex flex-col shadow-2xl overflow-hidden text-xs">
        
        {/* Modal Header */}
        <div className="p-4 bg-gradient-to-r from-red-950 via-slate-900 to-amber-950/60 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-red-600/30 border border-red-500/60 flex items-center justify-center text-red-400 shadow-md">
              <Zap className="w-5 h-5 text-amber-400 fill-amber-400 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="px-2 py-0.5 rounded-full bg-red-600/30 border border-red-500/50 text-red-300 text-[10px] font-black uppercase tracking-wider">
                  {language === 'te' ? 'ఎమర్జెన్సీ కాలింగ్ క్యూ' : 'Emergency Calling Queue'}
                </span>
                <span className="text-[10px] font-mono text-amber-400 font-bold">
                  {pendingOurs.length} {language === 'te' ? 'పెండింగ్' : 'Pending'}
                </span>
              </div>
              <h2 className="text-base font-black text-white mt-0.5">
                {language === 'te' ? '⚡ మన పెండింగ్ ఓటర్ల స్పీడ్-డయలర్' : '⚡ Pending Ours Speed-Dial'}
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

        {/* Stats & Search Toolbar */}
        <div className="p-3 bg-slate-950/70 border-b border-slate-800 space-y-2">
          {/* Quick Stats Pill */}
          <div className="flex items-center justify-between text-[11px] bg-slate-900 px-3 py-1.5 rounded-xl border border-slate-800">
            <span className="text-slate-300 font-bold">
              {language === 'te' ? 'మొత్తం మన పెండింగ్ ఓటర్లు:' : 'Total Pending Ours:'}{' '}
              <strong className="text-amber-400 font-mono text-sm">{pendingOurs.length}</strong>
            </span>
            <button
              onClick={() => setFilterPhoneOnly(!filterPhoneOnly)}
              className={`px-2 py-0.5 rounded-lg border text-[10px] font-bold flex items-center gap-1 transition-all ${
                filterPhoneOnly
                  ? 'bg-emerald-500 text-slate-950 border-emerald-400 font-black'
                  : 'bg-slate-800 text-emerald-400 border-emerald-500/40 hover:bg-slate-700'
              }`}
            >
              <Phone className="w-3 h-3" />
              <span>{language === 'te' ? `ఫోన్ ఉన్నవారు (${totalWithPhone})` : `With Phone (${totalWithPhone})`}</span>
            </button>
          </div>

          {/* Search box */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder={language === 'te' ? 'పేరు, క్రమ సంఖ్య (#S.No), ఫోన్ ద్వారా వెతకండి...' : 'Filter by Name, S.No, Phone...'}
              className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-8 pr-8 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-400"
            />
            {search && (
              <button
                onClick={() => setSearch('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>
        </div>

        {/* Voter List Body */}
        <div className="flex-1 overflow-y-auto p-3 space-y-2.5">
          {displayedList.length === 0 ? (
            <div className="text-center py-12 px-4 bg-slate-950/40 rounded-2xl border border-slate-800/80">
              <CheckCircle2 className="w-12 h-12 text-emerald-400 mx-auto mb-2 animate-bounce" />
              <h3 className="text-sm font-black text-white">
                {language === 'te' ? 'అద్భుతం! మన పెండింగ్ ఓటర్లు ఎవరూ లేరు!' : 'Awesome! No pending voters in this list!'}
              </h3>
              <p className="text-[11px] text-slate-400 mt-1 max-w-xs mx-auto">
                {language === 'te'
                  ? 'మన ఓటర్లందరూ ఓటు హక్కును వినియోగించుకున్నారు లేదా ఫిల్టర్ చేసిన లిస్ట్‌లో ఎవరూ లేరు.'
                  : 'All our identified voters have either cast their votes or are cleared.'}
              </p>
            </div>
          ) : (
            displayedList.map(v => {
              const prof = profiles[v.s] || {};
              const phone = prof.customPhone || v.k_m;

              return (
                <div
                  key={v.s}
                  className="bg-slate-950/80 border border-red-500/40 hover:border-amber-500/60 rounded-2xl p-3 shadow-md space-y-2 transition-all"
                >
                  {/* Top: S.No, Name, Age, H.No */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-start gap-2 min-w-0">
                      <span className="px-2 py-0.5 rounded-lg bg-amber-500/20 text-amber-300 border border-amber-500/40 font-mono font-black text-xs shrink-0">
                        #{v.s}
                      </span>
                      <div className="min-w-0">
                        <h4 className="text-xs font-black text-white truncate leading-tight">{v.n}</h4>
                        <div className="flex items-center gap-1.5 text-[10px] text-slate-400 mt-0.5 flex-wrap">
                          <span>{v.a}Y ({v.g === 'M' ? (language === 'te' ? 'పు' : 'M') : (language === 'te' ? 'స్త్రీ' : 'F')})</span>
                          <span>•</span>
                          <span>🏠 {v.hn || '-'}</span>
                          <span>•</span>
                          <span className="font-mono text-emerald-400">{v.id}</span>
                        </div>
                      </div>
                    </div>

                    <span className="px-2 py-0.5 rounded bg-red-600/30 text-red-300 border border-red-500/50 text-[9px] font-black shrink-0">
                      🚩 100%
                    </span>
                  </div>

                  {/* Contact & Actions Row */}
                  <div className="flex items-center justify-between pt-1 border-t border-slate-800/80 gap-2 flex-wrap">
                    {/* Phone / Call Buttons */}
                    <div className="flex items-center gap-1.5 flex-1 min-w-0">
                      {phone ? (
                        <>
                          <a
                            href={`tel:${phone}`}
                            className="px-2.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-black text-[11px] flex items-center gap-1 shadow-sm active:scale-95 transition-all shrink-0"
                            title={language === 'te' ? 'కాల్ చేయండి' : 'Call'}
                          >
                            <PhoneCall className="w-3.5 h-3.5 animate-pulse" />
                            <span>{phone}</span>
                          </a>

                          <button
                            type="button"
                            onClick={() => handleSendWhatsAppSlip(v, phone)}
                            className="px-2 py-1.5 bg-emerald-950/80 text-emerald-400 hover:text-white hover:bg-emerald-900 border border-emerald-500/40 rounded-xl font-bold text-[10px] flex items-center gap-1 active:scale-95 transition-all"
                            title={language === 'te' ? 'వాట్సాప్‌లో స్లిప్ పంపండి' : 'WhatsApp Slip'}
                          >
                            <MessageSquare className="w-3 h-3 text-emerald-400" />
                            <span className="hidden xs:inline">{language === 'te' ? 'స్లిప్' : 'Slip'}</span>
                          </button>
                        </>
                      ) : (
                        <button
                          type="button"
                          onClick={() => onOpenPhoneEditor(v)}
                          className="px-2 py-1 bg-slate-800 text-amber-300 hover:text-white border border-slate-700 rounded-xl text-[10px] font-bold flex items-center gap-1"
                        >
                          <Phone className="w-3 h-3 text-amber-400" />
                          <span>{language === 'te' ? '+ ఫోన్ ఇవ్వండి' : '+ Add Phone'}</span>
                        </button>
                      )}
                    </div>

                    {/* Instant Voted Button */}
                    <button
                      type="button"
                      onClick={() => onQuickToggleVoted(v.s)}
                      className="px-3 py-1.5 rounded-xl font-black text-[11px] bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white shadow-md active:scale-95 transition-all flex items-center gap-1 shrink-0"
                      title={language === 'te' ? 'ఇప్పుడే ఓటేశారు అని మార్క్ చేయండి' : 'Mark as Voted Now'}
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>{language === 'te' ? '✅ ఓటేశారు' : '✅ Voted'}</span>
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="p-3 bg-slate-950 border-t border-slate-800 flex items-center justify-between text-slate-400 text-[10px]">
          <span>
            {language === 'te' ? '💡 ఓటేశారు అని క్లిక్ చేయగానే లిస్ట్ నుండి క్లియర్ అవుతారు.' : '💡 Marking voted removes them instantly.'}
          </span>
          <button
            onClick={onClose}
            className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-white rounded-xl font-bold text-xs"
          >
            {language === 'te' ? 'ముగించు' : 'Close'}
          </button>
        </div>

      </div>
    </div>
  );
};
