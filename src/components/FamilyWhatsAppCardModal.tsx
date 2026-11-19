import React, { useRef, useState } from 'react';
import {
  Users,
  X,
  MessageSquare,
  Share2,
  Copy,
  Check,
  MapPin,
  Home,
  CheckCircle2,
  Printer
} from 'lucide-react';
import { MobileVoter, BoothInfo, VoterCampaignProfile } from '../types';

export interface FamilyCardData {
  name: string;
  doorNo?: string;
  houseNumbers?: string[];
  members: MobileVoter[];
}

interface FamilyWhatsAppCardModalProps {
  isOpen: boolean;
  onClose: () => void;
  family: FamilyCardData;
  boothInfo: BoothInfo;
  profiles: Record<number, VoterCampaignProfile>;
}

export const FamilyWhatsAppCardModal: React.FC<FamilyWhatsAppCardModalProps> = ({
  isOpen,
  onClose,
  family,
  boothInfo,
  profiles
}) => {
  const [copied, setCopied] = useState<boolean>(false);
  const cardRef = useRef<HTMLDivElement>(null);

  if (!isOpen || !family) return null;

  const displayDoorNo = family.doorNo || (family.houseNumbers && family.houseNumbers.length > 0 ? family.houseNumbers.join(', ') : '—');
  const members = family.members || [];

  // Find family phone number (from member custom phones or kriya contacts)
  const familyPhone = (() => {
    for (const m of members) {
      const s = m.s ?? (m as any).sno;
      const p = profiles[s];
      if (p?.customPhone) return p.customPhone;
      if (m.k_m) return m.k_m;
    }
    return '';
  })();

  const generateWhatsAppText = () => {
    let msg = `🏛️ *పిఠాపురం నియోజకవర్గం • గ్రామ పంచాయతీ ఎన్నికలు*\n`;
    msg += `🏡 *కుటుంబ ఓటర్ల సమాచార చీటీ (Family Voter Slip)*\n`;
    msg += `📍 *ఇంటి నెంబర్:* ${displayDoorNo}\n`;
    msg += `🏫 *పోలింగ్ కేంద్రం:* ${boothInfo.ps_address || boothInfo.clean_village || 'స్థానిక పోలింగ్ కేంద్రం'}\n`;
    msg += `──────────────────────\n`;

    members.forEach((m, idx) => {
      const s = m.s ?? (m as any).sno;
      const gTe = m.g === 'M' || (m as any).gender_en === 'Male' ? 'పు' : 'స్త్రీ';
      msg += `*${idx + 1}. #${s} ${m.n}*\n`;
      msg += `   • EPIC: *${m.id || ''}* | వయస్సు: ${m.a} (${gTe})\n`;
      if (m.r) msg += `   • సంబంధం: ${m.r}\n`;
      msg += `\n`;
    });

    msg += `──────────────────────\n`;
    msg += `🗳️ _దయచేసి మీ అమూల్యమైన ఓటు హక్కును సకాలంలో వినియోగించుకోండి!_ 🙏\n`;
    msg += `🚩 _జనసేన పార్టీ పిఠాపురం ఎన్నికల విభాగం_`;
    return msg;
  };

  const handleCopySlip = () => {
    const text = generateWhatsAppText();
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleShareWhatsApp = () => {
    const text = generateWhatsAppText();
    if (familyPhone) {
      const cleanPhone = familyPhone.replace(/[^0-9]/g, '');
      const targetPhone = cleanPhone.startsWith('91') ? cleanPhone : `91${cleanPhone}`;
      window.open(`https://api.whatsapp.com/send?phone=${targetPhone}&text=${encodeURIComponent(text)}`, '_blank');
    } else {
      window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`, '_blank');
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex flex-col items-center justify-start overflow-y-auto p-2 sm:p-4">
      <div className="bg-slate-900 border border-amber-500/50 rounded-3xl w-full max-w-2xl shadow-2xl text-white space-y-4 my-2 overflow-hidden">
        
        {/* Header */}
        <div className="bg-gradient-to-r from-amber-600 via-orange-600 to-amber-700 p-4 text-white flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <span className="p-2 bg-slate-950/40 text-amber-200 rounded-xl text-lg font-black">
              👨‍👩‍👧‍👦
            </span>
            <div>
              <h2 className="text-base font-black leading-tight">
                కుటుంబ సమగ్ర వాట్సాప్ స్లిప్ (Family Voter Slip)
              </h2>
              <p className="text-xs text-amber-100 opacity-90">
                ఇంటి నెం: <strong className="font-mono">{displayDoorNo}</strong> • మొత్తం {members.length} మంది ఓటర్లు
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 bg-slate-950/40 hover:bg-slate-950 text-white rounded-xl transition-all cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Action Buttons Toolbar */}
        <div className="px-4 sm:px-5 flex items-center justify-between gap-2 flex-wrap">
          <div className="flex items-center gap-2 flex-wrap">
            <button
              type="button"
              onClick={handleShareWhatsApp}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-black flex items-center gap-1.5 shadow-lg shadow-emerald-950/50 active:scale-95 transition-all cursor-pointer"
            >
              <MessageSquare className="w-4 h-4" />
              <span>{familyPhone ? `వాట్సాప్ పంపండి (${familyPhone})` : 'వాట్సాప్‌లో షేర్ చేయండి'}</span>
            </button>

            <button
              type="button"
              onClick={handleCopySlip}
              className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-amber-300 rounded-xl text-xs font-bold flex items-center gap-1.5 border border-slate-700 active:scale-95 transition-all cursor-pointer"
            >
              {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
              <span>{copied ? 'కాపీ అయింది!' : 'స్లిప్ కాపీ చేయండి'}</span>
            </button>
          </div>
        </div>

        {/* Digital Family Slip Card Preview (Ready for Sharing/Screenshot) */}
        <div className="px-4 sm:px-5 pb-5">
          <div
            ref={cardRef}
            className="bg-white text-slate-900 rounded-2xl p-4 sm:p-5 border-2 border-amber-500/60 shadow-xl space-y-3"
          >
            {/* Slip Header */}
            <div className="text-center pb-2.5 border-b-2 border-slate-900 space-y-0.5">
              <span className="text-[10px] font-black uppercase tracking-wider bg-slate-900 text-white px-2.5 py-0.5 rounded-full inline-block">
                పిఠాపురం శాసనసభ నియోజకవర్గం • AC #37
              </span>
              <h3 className="text-base font-black text-slate-900 tracking-tight">
                కుటుంబ ఓటర్ల సమాచార చీటీ (FAMILY VOTER SLIP)
              </h3>
              <p className="text-[11px] font-bold text-amber-700">
                {boothInfo.clean_village || boothInfo.ps_address} • వార్డు #{boothInfo.ward_no || '—'}
              </p>
            </div>

            {/* Family Details Bar */}
            <div className="bg-amber-50 border border-amber-300 rounded-xl p-2.5 flex items-center justify-between text-xs font-medium">
              <div>
                <span className="text-slate-600 block text-[10px] font-bold">ఇంటి నెంబర్:</span>
                <span className="font-mono font-black text-slate-900 text-sm">
                  {displayDoorNo}
                </span>
              </div>
              <div className="text-right">
                <span className="text-slate-600 block text-[10px] font-bold">కుటుంబం / మొత్తం ఓటర్లు:</span>
                <span className="font-mono font-black text-amber-800 text-sm">
                  {family.name} ({members.length} మంది)
                </span>
              </div>
            </div>

            {/* Members Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-100 text-slate-800 font-black border-y border-slate-300 text-[10.5px]">
                    <th className="py-1 px-1.5 text-center">#</th>
                    <th className="py-1 px-2">ఓటరు పేరు (తెలుగు)</th>
                    <th className="py-1 px-1.5">సంబంధం</th>
                    <th className="py-1 px-1.5 text-center">వయస్సు/లిం</th>
                    <th className="py-1 px-2 font-mono">EPIC నెంబర్</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 text-[11px]">
                  {members.map((m, idx) => {
                    const s = m.s ?? (m as any).sno;
                    const isMale = m.g === 'M' || (m as any).gender_en === 'Male';
                    return (
                      <tr key={s} className="hover:bg-amber-50/50">
                        <td className="py-1.5 px-1.5 text-center font-mono font-black bg-slate-50 text-slate-900">
                          #{s}
                        </td>
                        <td className="py-1.5 px-2 font-black text-slate-900">
                          {m.n}
                        </td>
                        <td className="py-1.5 px-1.5 text-slate-600">
                          {m.r || '—'}
                        </td>
                        <td className="py-1.5 px-1.5 text-center font-bold">
                          {m.a} / {isMale ? 'పు' : 'స్త్రీ'}
                        </td>
                        <td className="py-1.5 px-2 font-mono font-bold text-blue-900 bg-blue-50/60 rounded">
                          {m.id}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Polling Station Address Box */}
            <div className="bg-slate-50 border border-slate-300 rounded-xl p-2.5 text-xs text-slate-700 leading-snug">
              <strong className="font-bold text-slate-900">📍 పోలింగ్ కేంద్రం:</strong>{' '}
              {boothInfo.ps_address || 'స్థానిక పోలింగ్ కేంద్రం'}
            </div>

            {/* Footer Appeal */}
            <div className="text-center pt-1 border-t border-dashed border-slate-300 text-[10px] text-slate-500 font-bold">
              🗳️ ప్రజాస్వామ్యంలో మీ ఓటు అత్యంత విలువైనది • సకాలంలో ఓటు వేయండి!
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};
