import React from 'react';
import { X, Share2, Printer, MapPin, Home, User } from 'lucide-react';
import { MobileVoter, BoothInfo } from '../types';

interface VoterSlipModalProps {
  voter: MobileVoter | null;
  boothInfo: BoothInfo | null;
  onClose: () => void;
}

export const VoterSlipModal: React.FC<VoterSlipModalProps> = ({
  voter,
  boothInfo,
  onClose
}) => {
  if (!voter || !boothInfo) return null;

  const handleShareWhatsApp = () => {
    const text = `*🚩 జనసేన పార్టీ — పిఠాపురం నియోజకవర్గం (AC #37)*
*ఓటరు సమాచార స్లిప్పు (VOTER SLIP)*

*ఓటరు పేరు:* ${voter.n}
*సంబంధీకుడు:* ${voter.r}
*EPIC ID:* ${voter.id}
*క్రమ సంఖ్య (S.No):* #${voter.s}
*పోలింగ్ బూత్:* Part #${boothInfo.part_no} - ${boothInfo.clean_village}
*ఇంటి నెంబర్:* ${voter.hn}
*వయస్సు / లింగం:* ${voter.a} Yrs / ${voter.g === 'M' ? 'Male' : 'Female'}
*పోలింగ్ కేంద్రం:* ${boothInfo.ps_address}

_మీ అమూల్యమైన ఓటును గాజు గ్లాసు గుర్తుపై వేసి జనసేన పార్టీ అభ్యర్థిని భారీ మెజారిటీతో గెలిపించండి!_ 🚩`;

    const url = `https://wa.me/?text=${encodeURIComponent(text)}`;
    window.open(url, '_blank');
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-end sm:items-center justify-center p-3 animate-in fade-in duration-150">
      <div className="bg-slate-900 border border-amber-500/40 rounded-3xl max-w-sm w-full p-5 space-y-4 shadow-2xl relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-white bg-slate-800 p-1.5 rounded-full"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Slip Header */}
        <div className="text-center border-b border-slate-800 pb-3">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-red-600/20 border border-red-500/40 rounded-full text-red-400 text-[10px] font-black uppercase tracking-wider mb-1">
            🚩 Janasena Party • Pithapuram
          </div>
          <h3 className="text-base font-black text-white">Voter Information Slip</h3>
          <p className="text-[11px] text-amber-400 font-bold">2026 SIR Draft Electoral Roll</p>
        </div>

        {/* Big Serial & Booth Number */}
        <div className="grid grid-cols-2 gap-2 text-center">
          <div className="bg-slate-950 border border-slate-800 p-2.5 rounded-xl">
            <span className="text-[10px] uppercase font-bold text-slate-400 block">Voter S.No</span>
            <span className="text-2xl font-black text-amber-400 font-mono">#{voter.s}</span>
          </div>
          <div className="bg-slate-950 border border-slate-800 p-2.5 rounded-xl">
            <span className="text-[10px] uppercase font-bold text-slate-400 block">Part / Booth</span>
            <span className="text-2xl font-black text-emerald-400 font-mono">#{boothInfo.part_no}</span>
          </div>
        </div>

        {/* Details Grid */}
        <div className="bg-slate-950/70 border border-slate-800/80 rounded-xl p-3 space-y-2 text-xs">
          <div className="flex items-start justify-between border-b border-slate-800/60 pb-1.5">
            <span className="text-slate-400 text-[11px]">EPIC Number:</span>
            <span className="font-mono font-black text-emerald-400 text-sm">{voter.id}</span>
          </div>

          <div className="border-b border-slate-800/60 pb-1.5">
            <span className="text-slate-400 text-[10px] uppercase block font-bold">Voter Name</span>
            <span className="font-extrabold text-white text-sm block mt-0.5">{voter.n}</span>
          </div>

          <div className="grid grid-cols-2 gap-2 border-b border-slate-800/60 pb-1.5">
            <div>
              <span className="text-slate-400 text-[10px] uppercase block font-bold">Relation</span>
              <span className="text-slate-200 font-medium truncate block">{voter.r}</span>
            </div>
            <div>
              <span className="text-slate-400 text-[10px] uppercase block font-bold">Age & Gender</span>
              <span className="text-slate-200 font-medium">{voter.a} Yrs • {voter.g === 'M' ? 'Male' : 'Female'}</span>
            </div>
          </div>

          <div className="border-b border-slate-800/60 pb-1.5 flex items-center justify-between">
            <span className="text-slate-400 text-[11px] flex items-center gap-1">
              <Home className="w-3 h-3 text-amber-400" /> Door / House No:
            </span>
            <span className="font-bold text-amber-400 font-mono">{voter.hn}</span>
          </div>

          <div>
            <span className="text-slate-400 text-[10px] uppercase block font-bold flex items-center gap-1">
              <MapPin className="w-3 h-3 text-red-400" /> Polling Station Location
            </span>
            <span className="text-slate-300 text-[11px] block mt-0.5 leading-snug">
              {boothInfo.ps_address}
            </span>
          </div>
        </div>

        {/* Actions */}
        <div className="grid grid-cols-2 gap-2 pt-1">
          <button
            onClick={handleShareWhatsApp}
            className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 shadow-md shadow-emerald-950/40"
          >
            <Share2 className="w-3.5 h-3.5" />
            Share WhatsApp
          </button>
          <button
            onClick={() => window.print()}
            className="w-full py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 border border-slate-700"
          >
            <Printer className="w-3.5 h-3.5 text-amber-400" />
            Print Slip
          </button>
        </div>
      </div>
    </div>
  );
};
