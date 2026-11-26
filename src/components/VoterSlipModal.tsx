import React, { useState, useEffect } from 'react';
import { X, Share2, Printer, MapPin, Home, User, Copy, CheckCircle2, Settings, Image as ImageIcon } from 'lucide-react';
import { MobileVoter, BoothInfo } from '../types';
import { resolvePhotoUrl } from '../utils/photoResolver';
import { resolveWardPollingStation } from '../utils/boothDirectoryHelper';
import { openWhatsAppSlip, buildWhatsAppSlipMessage } from '../utils/slipConfig';
import { SlipConfigModal } from './SlipConfigModal';

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

  const [copiedEpic, setCopiedEpic] = useState(false);
  const [copiedSlipText, setCopiedSlipText] = useState(false);
  const [copiedCardImg, setCopiedCardImg] = useState(false);
  const [isSharingCard, setIsSharingCard] = useState(false);
  const [showSlipConfig, setShowSlipConfig] = useState(false);

  // Close on Escape key press
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  const handleCopyEpic = () => {
    if (!voter?.id) return;
    try {
      if (navigator?.clipboard?.writeText) {
        navigator.clipboard.writeText(voter.id);
      } else {
        const textArea = document.createElement('textarea');
        textArea.value = voter.id;
        textArea.style.position = 'fixed';
        textArea.style.opacity = '0';
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
      }
      setCopiedEpic(true);
      setTimeout(() => setCopiedEpic(false), 2000);
    } catch (err) {
      console.error('Failed to copy EPIC:', err);
    }
  };

  const formatBoothLabel = (partNo: string | number) => {
    const s = String(partNo);
    if (s === 'mptc_durgada_1' || s.startsWith('mptc_durgada_1_b')) {
      const bno = (voter as any).booth_no || (voter.s <= 1060 ? 45 : voter.s <= 2120 ? 46 : 47);
      return `MPTC 1 (#${bno})`;
    }
    if (s === 'mptc_durgada_2') return 'MPTC 2';
    if (s === 'mptc_durgada_3') return 'MPTC 3';
    if (s === 'gp_durgada') return 'GP DURGADA';
    if (s === 'ward_14') return 'WARD 14';
    if (s === 'gollaprolu_ward_11') return 'WARD 11';
    if (s === 'gp_vannepudi') return 'GP VANNEPUDI';
    if (s.startsWith('mptc_')) return s.replace('mptc_', 'MPTC ').toUpperCase();
    if (s.startsWith('ward_')) return s.replace('ward_', 'WARD ');
    if (s.startsWith('gp_')) return s.replace('gp_', 'GP ').toUpperCase();
    return `#${s}`;
  };

  const handleShareWhatsApp = () => {
    openWhatsAppSlip(voter, boothInfo);
  };

  const handleCopySlipText = () => {
    const text = buildWhatsAppSlipMessage(voter, boothInfo);
    if (navigator?.clipboard?.writeText) {
      navigator.clipboard.writeText(text);
    }
    setCopiedSlipText(true);
    setTimeout(() => setCopiedSlipText(false), 2000);
  };

  const fetchCardPngBlob = async (): Promise<Blob | null> => {
    const rawCard = voter.card_url || voter.card;
    if (!rawCard) return null;
    const url = resolvePhotoUrl(rawCard) || rawCard;
    try {
      const res = await fetch(url);
      if (!res.ok) return null;
      const blob = await res.blob();
      const imgUrl = URL.createObjectURL(blob);
      try {
        const img = await new Promise<HTMLImageElement>((resolve, reject) => {
          const el = new Image();
          el.onload = () => resolve(el);
          el.onerror = reject;
          el.src = imgUrl;
        });
        const canvas = document.createElement('canvas');
        canvas.width = img.naturalWidth || img.width;
        canvas.height = img.naturalHeight || img.height;
        const ctx = canvas.getContext('2d');
        if (!ctx) return blob;
        ctx.drawImage(img, 0, 0);
        return await new Promise<Blob | null>((resolve) =>
          canvas.toBlob((b) => resolve(b || blob), 'image/png')
        );
      } finally {
        URL.revokeObjectURL(imgUrl);
      }
    } catch {
      return null;
    }
  };

  const handleCopyCardImage = async () => {
    try {
      const pngBlob = await fetchCardPngBlob();
      if (pngBlob && navigator?.clipboard && typeof ClipboardItem !== 'undefined') {
        await navigator.clipboard.write([new ClipboardItem({ 'image/png': pngBlob })]);
        setCopiedCardImg(true);
        setTimeout(() => setCopiedCardImg(false), 2000);
      }
    } catch (err) {
      console.error('Failed to copy card image:', err);
    }
  };

  const handleShareCardAndText = async () => {
    setIsSharingCard(true);
    try {
      const text = buildWhatsAppSlipMessage(voter, boothInfo);
      const pngBlob = await fetchCardPngBlob();
      if (pngBlob && navigator.share) {
        const file = new File([pngBlob], `voter_card_${voter.s}.png`, { type: 'image/png' });
        if (navigator.canShare && navigator.canShare({ files: [file] })) {
          await navigator.share({
            files: [file],
            text,
            title: `Voter Slip #${voter.s}`,
          });
          return;
        }
      }
      // Fallback: copy card image if possible and open WhatsApp with text
      if (pngBlob && navigator?.clipboard && typeof ClipboardItem !== 'undefined') {
        try {
          await navigator.clipboard.write([new ClipboardItem({ 'image/png': pngBlob })]);
        } catch {}
      }
      openWhatsAppSlip(voter, boothInfo);
    } catch (err) {
      if ((err as any)?.name !== 'AbortError') {
        openWhatsAppSlip(voter, boothInfo);
      }
    } finally {
      setIsSharingCard(false);
    }
  };

  return (
    <div 
      className="voter-slip-print-overlay fixed inset-0 z-[200] bg-black/85 backdrop-blur-sm flex items-end sm:items-center justify-center p-3 animate-in fade-in duration-150"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div 
        className="voter-slip-print-card bg-slate-900 border border-amber-500/40 rounded-3xl max-w-sm w-full p-5 space-y-4 shadow-2xl relative max-h-[95vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="no-print absolute top-4 right-4 text-slate-400 hover:text-white bg-slate-800 p-1.5 rounded-full"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Slip Header */}
        <div className="text-center border-b border-slate-800 pb-3">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-amber-500/20 border border-amber-500/40 rounded-full text-amber-300 text-[10px] font-black uppercase tracking-wider mb-1">
            🗳️ పిఠాపురం నియోజకవర్గం • AC #37
          </div>
          <h3 className="text-base font-black text-white">Voter Information Slip</h3>
          <p className="text-[11px] text-amber-400 font-bold">2026 SIR Draft Electoral Roll</p>
        </div>

        {/* Complete Official Voter Card Image (High-Priority Ground Truth) */}
        {(voter.card_url || voter.card) ? (
          <div className="space-y-1.5">
            <div className="flex items-center justify-between px-1 text-[11px] font-bold text-amber-400">
              <span className="flex items-center gap-1.5">
                📄 అధికారిక ఓటర్ జాబితా కార్డు (Official Card)
              </span>
              <span className="font-mono text-emerald-400 bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-500/30 text-[10px]">
                GP #{voter.s}
              </span>
            </div>
            <div className="rounded-2xl overflow-hidden border-2 border-amber-500/70 bg-slate-950 shadow-2xl p-1 relative">
              <img
                src={resolvePhotoUrl(voter.card_url || voter.card)}
                alt={`Official Voter Card ${voter.s}`}
                className="w-full h-auto rounded-xl object-contain shadow-inner"
                onError={(e) => {
                  const target = e.currentTarget as HTMLImageElement;
                  const currentSrc = target.src;
                  const cardPath = voter.card_url || voter.card;
                  if (!cardPath) return;
                  const cleanPath = cardPath.startsWith('/') ? cardPath : `/${cardPath}`;
                  const gitHubRaw = `https://raw.githubusercontent.com/gundradvp/pithapuram-voters-mobile/main/public${cleanPath}`;
                  const jsdelivrCdn = `https://cdn.jsdelivr.net/gh/gundradvp/pithapuram-voters-mobile@main/public${cleanPath}`;
                  
                  if (!currentSrc.includes('raw.githubusercontent.com') && !currentSrc.includes('cdn.jsdelivr.net')) {
                    target.src = gitHubRaw;
                  } else if (currentSrc.includes('raw.githubusercontent.com')) {
                    target.src = jsdelivrCdn;
                  }
                }}
              />
            </div>
          </div>
        ) : (voter.photo_url || voter.photo) ? (
          <div className="flex justify-center -mb-1">
            <img
              src={resolvePhotoUrl(voter.photo_url || voter.photo)}
              alt={voter.n}
              className="w-16 h-20 object-cover rounded-2xl border-2 border-amber-500/60 shadow-lg bg-slate-950"
              onError={(e) => {
                (e.currentTarget as HTMLElement).style.display = 'none';
              }}
            />
          </div>
        ) : null}

        {/* Big Serial & Booth Number */}
        <div className="grid grid-cols-2 gap-2 text-center">
          <div className="bg-slate-950 border border-slate-800 p-2.5 rounded-xl">
            <span className="text-[10px] uppercase font-bold text-slate-400 block">Voter S.No</span>
            <span className="text-2xl font-black text-amber-400 font-mono">#{voter.s}</span>
          </div>
          <div className="bg-slate-950 border border-slate-800 p-2.5 rounded-xl flex flex-col justify-center">
            <span className="text-[10px] uppercase font-bold text-slate-400 block">Part / Booth</span>
            <span className="text-xl sm:text-2xl font-black text-emerald-400 font-mono truncate" title={String(boothInfo.part_no)}>
              {formatBoothLabel(boothInfo.part_no)}
            </span>
          </div>
        </div>

        {/* Details Grid */}
        <div className="bg-slate-950/70 border border-slate-800/80 rounded-xl p-3 space-y-2 text-xs">
          <div className="flex items-center justify-between border-b border-slate-800/60 pb-1.5">
            <span className="text-slate-400 text-[11px]">EPIC Number:</span>
            <button
              type="button"
              onClick={handleCopyEpic}
              className={`font-mono font-black text-sm px-2 py-0.5 rounded border transition-all flex items-center gap-1.5 active:scale-95 cursor-pointer shadow-sm ${
                copiedEpic
                  ? 'bg-emerald-950 text-emerald-300 border-emerald-500 ring-1 ring-emerald-500/50'
                  : 'bg-slate-900 text-emerald-400 hover:text-emerald-300 hover:bg-slate-800 border-slate-800 hover:border-emerald-500/50'
              }`}
              title="Click to copy Voter ID (EPIC)"
            >
              <span>{voter.id}</span>
              {copiedEpic ? (
                <span className="text-[10px] text-emerald-300 font-sans font-bold flex items-center gap-0.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                  <span>కాపీ అయింది</span>
                </span>
              ) : (
                <Copy className="w-3 h-3 text-slate-400 hover:text-emerald-400" />
              )}
            </button>
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
              {resolveWardPollingStation(voter, boothInfo)}
            </span>
          </div>
        </div>

        {/* Actions */}
        <div className="no-print space-y-2 pt-1">
          <div className="grid grid-cols-3 gap-2">
            <button
              onClick={handleShareWhatsApp}
              className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1 shadow-md shadow-emerald-950/40 cursor-pointer"
            >
              <Share2 className="w-3.5 h-3.5" />
              WhatsApp
            </button>
            <button
              type="button"
              onClick={handleCopySlipText}
              className="w-full py-2.5 bg-slate-800 hover:bg-slate-700 text-emerald-300 rounded-xl text-xs font-bold flex items-center justify-center gap-1 border border-emerald-500/40 cursor-pointer"
            >
              {copiedSlipText ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              {copiedSlipText ? 'Copied!' : 'Copy Text'}
            </button>
            <button
              onClick={() => window.print()}
              className="w-full py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-bold flex items-center justify-center gap-1 border border-slate-700 cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5 text-amber-400" />
              Print
            </button>
          </div>
          {(voter.card_url || voter.card) && (
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={handleShareCardAndText}
                disabled={isSharingCard}
                className="w-full py-2 bg-emerald-900/70 hover:bg-emerald-800/80 text-emerald-200 border border-emerald-500/40 rounded-xl text-[11px] font-bold flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-60"
              >
                <ImageIcon className="w-3.5 h-3.5 text-emerald-400" />
                <span>{isSharingCard ? 'Preparing...' : 'Share Card + Text'}</span>
              </button>
              <button
                type="button"
                onClick={handleCopyCardImage}
                className="w-full py-2 bg-slate-800 hover:bg-slate-700 text-amber-300 border border-slate-700 rounded-xl text-[11px] font-bold flex items-center justify-center gap-1.5 cursor-pointer"
              >
                {copiedCardImg ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedCardImg ? 'Card Copied!' : 'Copy Card Image'}</span>
              </button>
            </div>
          )}
          <button
            type="button"
            onClick={() => setShowSlipConfig(true)}
            className="w-full py-2 bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 border border-amber-500/40 rounded-xl text-[11px] font-bold flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <Settings className="w-3.5 h-3.5" />
            <span>వార్డ్ అభ్యర్థి & టెంప్లేట్ సెట్టింగ్స్ (Configure Slip)</span>
          </button>
        </div>
      </div>

      <SlipConfigModal
        isOpen={showSlipConfig}
        onClose={() => setShowSlipConfig(false)}
        boothInfo={boothInfo}
        sampleVoter={voter}
      />
    </div>
  );
};
