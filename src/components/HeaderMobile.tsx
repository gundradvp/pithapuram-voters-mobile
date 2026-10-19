import React from 'react';
import { Lock, Unlock, Wifi, WifiOff } from 'lucide-react';
import { BoothInfo } from '../types';

interface HeaderMobileProps {
  boothInfo: BoothInfo | null;
  isLocked: boolean;
  isCached: boolean;
  onOpenBoothSelector: () => void;
}

export const HeaderMobile: React.FC<HeaderMobileProps> = ({
  boothInfo,
  isLocked,
  isCached,
  onOpenBoothSelector
}) => {
  return (
    <header className="sticky top-0 z-40 bg-slate-900/95 backdrop-blur-md border-b border-slate-800 px-4 py-2.5 shadow-lg flex items-center justify-between">
      <div className="flex items-center gap-2.5 min-w-0">
        <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-red-600 via-amber-600 to-red-600 flex items-center justify-center text-white font-black text-sm shadow-md shadow-red-900/40 flex-shrink-0 border border-amber-400/30">
          🚩
        </div>
        <div className="min-w-0">
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] uppercase font-bold text-amber-400 tracking-wider">
              JSP Pithapuram
            </span>
            <span className="text-[10px] bg-slate-800 text-slate-400 px-1.5 py-0.2 rounded font-mono">
              AC #37
            </span>
          </div>
          <h1 className="text-sm font-black text-white truncate leading-tight">
            {boothInfo ? `Booth #${boothInfo.part_no}: ${boothInfo.clean_village}` : 'Select Assigned Booth'}
          </h1>
        </div>
      </div>

      <div className="flex items-center gap-2 flex-shrink-0">
        {/* Offline Badge */}
        <div 
          className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border ${
            isCached 
              ? 'bg-emerald-950/60 text-emerald-400 border-emerald-500/30' 
              : 'bg-slate-800 text-slate-400 border-slate-700'
          }`}
          title={isCached ? 'Booth data stored locally on device' : 'Loaded over network'}
        >
          {isCached ? <Wifi className="w-2.5 h-2.5" /> : <WifiOff className="w-2.5 h-2.5" />}
          <span>{isCached ? 'Offline' : 'Online'}</span>
        </div>

        {/* Booth Lock / Unlock Button */}
        <button
          onClick={onOpenBoothSelector}
          className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold transition-all shadow-sm ${
            isLocked
              ? 'bg-slate-800 hover:bg-slate-700 text-amber-300 border border-amber-500/40'
              : 'bg-amber-500 hover:bg-amber-400 text-slate-950 font-black'
          }`}
          title={isLocked ? 'Assigned Booth Locked. Tap to unlock with Admin PIN.' : 'Tap to assign/switch booth'}
        >
          {isLocked ? <Lock className="w-3 h-3 text-amber-400" /> : <Unlock className="w-3 h-3" />}
          <span>{isLocked ? `Part #${boothInfo?.part_no || ''}` : 'Change'}</span>
        </button>
      </div>
    </header>
  );
};
