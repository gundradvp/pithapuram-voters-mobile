import React, { useState } from 'react';
import { X, Phone, PhoneCall, MessageSquare, Send, Check, Copy, CheckCircle2 } from 'lucide-react';
import { MobileVoter, VoterCampaignProfile } from '../types';

interface PhoneEditorModalProps {
  voter: MobileVoter;
  profile?: VoterCampaignProfile;
  onSavePhone: (phone: string, altPhone?: string) => void;
  onClose: () => void;
}

export const PhoneEditorModal: React.FC<PhoneEditorModalProps> = ({
  voter,
  profile,
  onSavePhone,
  onClose
}) => {
  const [phone, setPhone] = useState(profile?.customPhone || '');
  const [altPhone, setAltPhone] = useState(profile?.altPhone || '');
  const [saved, setSaved] = useState(false);
  const [copiedKriya, setCopiedKriya] = useState(false);
  const [copiedEpic, setCopiedEpic] = useState(false);

  const handleCopyKriya = (num: string) => {
    navigator.clipboard.writeText(num);
    setCopiedKriya(true);
    setTimeout(() => setCopiedKriya(false), 2000);
  };

  const handleCopyEpic = (epic: string) => {
    if (!epic) return;
    try {
      if (navigator?.clipboard?.writeText) {
        navigator.clipboard.writeText(epic);
      }
      setCopiedEpic(true);
      setTimeout(() => setCopiedEpic(false), 2000);
    } catch {}
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    onSavePhone(phone.trim(), altPhone.trim());
    setSaved(true);
    setTimeout(() => {
      onClose();
    }, 600);
  };

  const activeNumber = phone || voter.k_m;

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-end sm:items-center justify-center p-3 animate-in fade-in duration-150">
      <div className="bg-slate-900 border border-amber-500/40 rounded-3xl max-w-sm w-full p-5 space-y-4 shadow-2xl relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-white bg-slate-800 p-1.5 rounded-full"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Modal Header */}
        <div className="border-b border-slate-800 pb-3">
          <div className="flex items-center gap-1.5 text-xs text-amber-400 font-bold uppercase tracking-wider">
            <Phone className="w-3.5 h-3.5 text-amber-400" />
            Voter Contact Management
          </div>
          <h3 className="text-base font-black text-white mt-0.5 truncate">{voter.n}</h3>
          <div className="text-[11px] text-slate-400 flex items-center gap-1.5 flex-wrap mt-0.5">
            <span>S.No: <strong className="text-amber-400 font-mono">#{voter.s}</strong></span>
            <span>•</span>
            <button
              type="button"
              onClick={() => handleCopyEpic(voter.id)}
              className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-slate-900 hover:bg-slate-800 border border-slate-800 hover:border-emerald-500/50 text-emerald-400 font-mono text-[11px] font-bold active:scale-95 transition-all cursor-pointer"
              title="Click to copy EPIC"
            >
              <span>EPIC: {voter.id}</span>
              {copiedEpic ? (
                <CheckCircle2 className="w-2.5 h-2.5 text-emerald-400" />
              ) : (
                <Copy className="w-2 h-2 text-slate-500" />
              )}
            </button>
            <span>•</span>
            <span>H.No: <strong className="text-slate-300 font-mono">{voter.hn}</strong></span>
          </div>
        </div>

        {/* Existing Kriya Number if available */}
        {voter.k_m && (
          <div className="bg-red-950/30 border border-red-500/40 rounded-xl p-2.5 flex items-center justify-between">
            <div>
              <span className="text-[10px] uppercase font-bold text-red-300 block">🚩 JSP Kriya Registered Mobile</span>
              <a
                href={`tel:${voter.k_m}`}
                className="text-sm font-mono font-black text-amber-300 hover:text-white hover:underline flex items-center gap-1 mt-0.5"
                title="Click to Call"
              >
                <PhoneCall className="w-3.5 h-3.5 text-emerald-400" />
                <span>{voter.k_m}</span>
              </a>
            </div>
            <div className="flex items-center gap-1.5">
              <a
                href={`tel:${voter.k_m}`}
                className="p-2 bg-slate-800 hover:bg-slate-700 text-emerald-400 rounded-lg text-xs"
                title="Call Kriya Phone"
              >
                <PhoneCall className="w-3.5 h-3.5" />
              </a>
              <button
                type="button"
                onClick={() => handleCopyKriya(voter.k_m!)}
                className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-lg text-xs flex items-center gap-1"
                title="Copy Kriya Phone Number"
              >
                {copiedKriya ? (
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                ) : (
                  <Copy className="w-3.5 h-3.5 text-amber-400" />
                )}
              </button>
              <a
                href={`https://wa.me/91${voter.k_m}?text=${encodeURIComponent(`నమస్కారం ${voter.n} గారు, జనసేన పార్టీ పిఠాపురం కార్యాలయం నుండి సంప్రదిస్తున్నాము.`)}`}
                target="_blank"
                rel="noreferrer"
                className="p-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs shadow-sm"
                title="WhatsApp Kriya Phone"
              >
                <MessageSquare className="w-3.5 h-3.5" />
              </a>
            </div>
          </div>
        )}

        {/* Form to Add / Edit Custom Phone Number */}
        <form onSubmit={handleSave} className="space-y-3">
          <div>
            <label className="text-[10px] uppercase font-bold text-slate-400 block mb-1">
              📱 Primary Contact Mobile Number
            </label>
            <input
              type="tel"
              maxLength={10}
              value={phone}
              onChange={e => setPhone(e.target.value.replace(/[^0-9]/g, ''))}
              placeholder="Enter 10-digit mobile number"
              className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2 text-white font-mono text-sm placeholder-slate-600 focus:outline-none focus:border-amber-400"
            />
          </div>

          <div>
            <label className="text-[10px] uppercase font-bold text-slate-400 block mb-1">
              Alternate Phone / Family Member Phone (Optional)
            </label>
            <input
              type="tel"
              maxLength={10}
              value={altPhone}
              onChange={e => setAltPhone(e.target.value.replace(/[^0-9]/g, ''))}
              placeholder="Enter alternate number"
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-white font-mono text-xs placeholder-slate-600 focus:outline-none focus:border-amber-400"
            />
          </div>

          <button
            type="submit"
            className="w-full py-2.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black rounded-xl text-xs flex items-center justify-center gap-1.5 shadow-md shadow-amber-950/40 transition-all"
          >
            {saved ? <Check className="w-4 h-4" /> : null}
            <span>{saved ? 'Phone Saved!' : 'Save Contact Number'}</span>
          </button>
        </form>

        {/* Quick Dial Actions */}
        {activeNumber && (
          <div className="pt-2 border-t border-slate-800 grid grid-cols-3 gap-2 text-center text-xs">
            <a
              href={`tel:${activeNumber}`}
              className="py-2 bg-slate-800 hover:bg-slate-700 text-emerald-400 rounded-xl font-bold flex items-center justify-center gap-1 border border-slate-700"
            >
              <PhoneCall className="w-3.5 h-3.5" />
              Call
            </a>
            <a
              href={`https://wa.me/91${activeNumber}?text=${encodeURIComponent(`నమస్కారం ${voter.n} గారు, జనసేన పార్టీ పిఠాపురం కార్యాలయం నుండి సంప్రదిస్తున్నాము.`)}`}
              target="_blank"
              rel="noreferrer"
              className="py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-bold flex items-center justify-center gap-1 shadow-md shadow-emerald-950/40"
            >
              <MessageSquare className="w-3.5 h-3.5" />
              WhatsApp
            </a>
            <a
              href={`sms:${activeNumber}?body=${encodeURIComponent(`నమస్కారం ${voter.n} గారు, జనసేన పార్టీ అభ్యర్థి పవన్ కళ్యాణ్ గారికి గాజు గ్లాసు గుర్తుపై ఓటు వేసి గెలిపించండి.`)}`}
              className="py-2 bg-blue-600/30 hover:bg-blue-600/40 text-blue-300 rounded-xl font-bold flex items-center justify-center gap-1 border border-blue-500/40"
            >
              <Send className="w-3.5 h-3.5" />
              SMS
            </a>
          </div>
        )}
      </div>
    </div>
  );
};
