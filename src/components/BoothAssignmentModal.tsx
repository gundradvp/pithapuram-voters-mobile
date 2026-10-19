import React, { useState } from 'react';
import { X, Search, Lock, Unlock, ShieldCheck, Check, AlertCircle } from 'lucide-react';
import { BoothIndexItem } from '../types';
import { verifyAdminPin } from '../utils/storage';

interface BoothAssignmentModalProps {
  boothsIndex: BoothIndexItem[];
  currentPartNo: number | null;
  isLocked: boolean;
  onSelectBooth: (partNo: number, lock: boolean) => void;
  onClose: () => void;
}

export const BoothAssignmentModal: React.FC<BoothAssignmentModalProps> = ({
  boothsIndex,
  currentPartNo,
  isLocked,
  onSelectBooth,
  onClose
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [pinInput, setPinInput] = useState('');
  const [pinUnlocked, setPinUnlocked] = useState(!isLocked);
  const [pinError, setPinError] = useState(false);
  const [lockOnAssign, setLockOnAssign] = useState(true);

  const handleVerifyPin = () => {
    if (verifyAdminPin(pinInput)) {
      setPinUnlocked(true);
      setPinError(false);
    } else {
      setPinError(true);
    }
  };

  const filteredBooths = boothsIndex.filter(b => {
    const q = searchTerm.toLowerCase().trim();
    if (!q) return true;
    return (
      b.part_no.toString().includes(q) ||
      b.village.toLowerCase().includes(q) ||
      b.clean_village.toLowerCase().includes(q) ||
      b.mandal.toLowerCase().includes(q)
    );
  });

  return (
    <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-end sm:items-center justify-center p-3 animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-amber-500/40 rounded-3xl max-w-md w-full p-5 space-y-4 shadow-2xl relative max-h-[85vh] flex flex-col">
        {/* Modal Header */}
        <div className="flex items-start justify-between border-b border-slate-800 pb-3">
          <div>
            <div className="flex items-center gap-1.5 text-xs text-amber-400 font-bold uppercase tracking-wider">
              <ShieldCheck className="w-4 h-4 text-amber-400" />
              Booth In-Charge Assignment
            </div>
            <h2 className="text-lg font-black text-white mt-0.5">
              {isLocked && !pinUnlocked ? 'Locked to Assigned Booth' : 'Assign Polling Booth'}
            </h2>
            <p className="text-[11px] text-slate-400 mt-0.5">
              {isLocked && !pinUnlocked
                ? 'Enter Admin PIN to unlock and change assigned booth.'
                : 'Select the polling station assigned to this phone / volunteer.'}
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white bg-slate-800 p-1.5 rounded-full"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* PIN VERIFICATION IF LOCKED */}
        {isLocked && !pinUnlocked ? (
          <div className="bg-slate-950/80 border border-amber-500/30 rounded-2xl p-4 space-y-3 my-auto">
            <div className="flex items-center gap-2 text-amber-400 font-bold text-xs">
              <Lock className="w-4 h-4" />
              <span>Admin PIN Required to Switch Booth</span>
            </div>
            <p className="text-xs text-slate-300">
              This app is currently locked to <strong>Part #{currentPartNo}</strong> to ensure volunteers only view their designated booth electors.
            </p>

            <div className="space-y-1.5">
              <label className="text-[10px] uppercase font-bold text-slate-400">Enter Admin PIN (Default: 1982)</label>
              <div className="flex items-center gap-2">
                <input
                  type="password"
                  maxLength={6}
                  value={pinInput}
                  onChange={e => {
                    setPinInput(e.target.value);
                    setPinError(false);
                  }}
                  onKeyDown={e => e.key === 'Enter' && handleVerifyPin()}
                  placeholder="Enter PIN"
                  className="flex-1 bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white text-sm font-mono tracking-widest text-center focus:outline-none focus:border-amber-400"
                />
                <button
                  onClick={handleVerifyPin}
                  className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black rounded-xl text-xs"
                >
                  Unlock
                </button>
              </div>
              {pinError && (
                <p className="text-[11px] text-red-400 font-medium flex items-center gap-1 mt-1">
                  <AlertCircle className="w-3 h-3" /> Incorrect PIN. (Default is 1982)
                </p>
              )}
            </div>
          </div>
        ) : (
          /* BOOTH SELECTOR LIST */
          <>
            {/* Search Input */}
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                placeholder="Search by Booth #, Village, or Mandal..."
                className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-400"
              />
            </div>

            {/* Lock Toggle */}
            <div className="bg-slate-950/60 border border-slate-800 px-3 py-2 rounded-xl flex items-center justify-between">
              <span className="text-xs text-slate-300 font-medium flex items-center gap-1.5">
                <Lock className="w-3.5 h-3.5 text-amber-400" />
                Lock to this booth after selection
              </span>
              <input
                type="checkbox"
                checked={lockOnAssign}
                onChange={e => setLockOnAssign(e.target.checked)}
                className="rounded border-slate-700 text-amber-500 bg-slate-900 w-4 h-4"
              />
            </div>

            {/* Scrollable Booth List */}
            <div className="flex-1 overflow-y-auto space-y-1.5 pr-1 divide-y divide-slate-800/40">
              {filteredBooths.map(b => {
                const isSelected = b.part_no === currentPartNo;
                return (
                  <div
                    key={b.part_no}
                    onClick={() => {
                      onSelectBooth(b.part_no, lockOnAssign);
                      onClose();
                    }}
                    className={`p-2.5 rounded-xl transition-all cursor-pointer flex items-center justify-between border ${
                      isSelected
                        ? 'bg-amber-950/30 border-amber-500/50 text-white'
                        : 'bg-slate-950/40 border-transparent hover:bg-slate-800/40 text-slate-300'
                    }`}
                  >
                    <div className="space-y-0.5 min-w-0 pr-2">
                      <div className="flex items-center gap-1.5">
                        <span className="px-1.5 py-0.2 bg-amber-500/20 text-amber-300 border border-amber-500/30 rounded text-[10px] font-mono font-bold">
                          Part #{b.part_no}
                        </span>
                        <span className="font-extrabold text-white text-xs truncate">
                          {b.clean_village}
                        </span>
                      </div>
                      <div className="text-[10px] text-slate-400 truncate">
                        Mandal: {b.mandal} • {b.total_voters.toLocaleString()} Electors
                      </div>
                      <div className="text-[10px] text-amber-400/90 font-medium">
                        🚩 {b.total_kriya_count} Kriya Enrolled ({b.kriya_percentage}%)
                      </div>
                    </div>

                    <div className="flex-shrink-0">
                      {isSelected ? (
                        <span className="w-6 h-6 rounded-full bg-emerald-500 text-slate-950 flex items-center justify-center font-bold text-xs">
                          <Check className="w-3.5 h-3.5" />
                        </span>
                      ) : (
                        <span className="px-2 py-1 bg-slate-800 hover:bg-amber-500 hover:text-slate-950 rounded-lg text-[10px] font-bold text-slate-300 transition-colors">
                          Assign
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}

              {filteredBooths.length === 0 && (
                <div className="py-8 text-center text-slate-500 text-xs">
                  No polling stations matched your search.
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
};
