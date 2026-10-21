import React, { useState } from 'react';
import { X, Search, Lock, ShieldCheck, Check, AlertCircle, Building2, Home, Landmark, Users, Sparkles, CheckCircle2 } from 'lucide-react';
import { BoothIndexItem, LocalElectionUnit } from '../types';
import { verifyAdminPin } from '../utils/storage';

interface BoothAssignmentModalProps {
  boothsIndex: BoothIndexItem[];
  localUnits?: LocalElectionUnit[];
  currentPartNo: number | string | null;
  isLocked: boolean;
  onSelectBooth: (partNo: number | string, lock: boolean) => void;
  onClose: () => void;
  language?: 'te' | 'en';
}

export const BoothAssignmentModal: React.FC<BoothAssignmentModalProps> = ({
  boothsIndex,
  localUnits = [],
  currentPartNo,
  isLocked,
  onSelectBooth,
  onClose,
  language = 'te'
}) => {
  const isCurrentlyLocal = typeof currentPartNo === 'string' && (currentPartNo.startsWith('ward_') || currentPartNo.startsWith('gp_') || currentPartNo.startsWith('mptc_') || currentPartNo.startsWith('zptc_'));
  
  const [electionCategoryTab, setElectionCategoryTab] = useState<'assembly' | 'local'>(
    isCurrentlyLocal ? 'local' : 'assembly'
  );
  const [localSubCategory, setLocalSubCategory] = useState<'all' | 'municipal' | 'panchayat' | 'mptc' | 'zptc'>('all');
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

  // Filter Assembly Booths
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

  // Filter Local Election Units
  const filteredLocalUnits = localUnits.filter(u => {
    if (localSubCategory !== 'all' && u.election_type !== localSubCategory) {
      return false;
    }
    const q = searchTerm.toLowerCase().trim();
    if (!q) return true;
    return (
      u.id.toLowerCase().includes(q) ||
      u.village.toLowerCase().includes(q) ||
      u.clean_village.toLowerCase().includes(q) ||
      (u.mandal && u.mandal.toLowerCase().includes(q)) ||
      u.local_body.toLowerCase().includes(q) ||
      (u.sections && u.sections.toLowerCase().includes(q))
    );
  });

  return (
    <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-end sm:items-center justify-center p-3 animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-amber-500/40 rounded-3xl max-w-lg w-full p-4 sm:p-5 space-y-3.5 shadow-2xl relative max-h-[90vh] flex flex-col">
        {/* Modal Header */}
        <div className="flex items-start justify-between border-b border-slate-800 pb-3">
          <div>
            <div className="flex items-center gap-1.5 text-xs text-amber-400 font-bold uppercase tracking-wider">
              <ShieldCheck className="w-4 h-4 text-amber-400" />
              {language === 'te' ? 'ఎన్నికల విభాగం ఎంపిక' : 'Election Unit Selection'}
            </div>
            <h2 className="text-lg font-black text-white mt-0.5">
              {isLocked && !pinUnlocked 
                ? (language === 'te' ? 'కేటాయించిన బూత్‌కు లాక్ చేయబడింది' : 'Locked to Assigned Unit')
                : (language === 'te' ? 'బూత్ లేదా వార్డును ఎంచుకోండి' : 'Select Booth / Ward')}
            </h2>
            <p className="text-[11px] text-slate-400 mt-0.5">
              {isLocked && !pinUnlocked
                ? (language === 'te' ? 'బూత్ మార్చడానికి అడ్మిన్ పిన్ (Admin PIN) నమోదు చేయండి.' : 'Enter Admin PIN to switch assigned booth/ward.')
                : (language === 'te' ? 'శాసనసభ బూతులు లేదా స్థానిక సంస్థల వార్డులను (మున్సిపాలిటీ / పంచాయతీ) ఎంచుకోండి.' : 'Select Assembly Polling Booth or Local Election Ward.')}
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
              <span>Admin PIN Required to Switch Unit</span>
            </div>
            <p className="text-xs text-slate-300">
              This app is currently locked to <strong>#{currentPartNo}</strong> to ensure volunteers only view their designated voter list.
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
          /* SELECTION FLOW */
          <>
            {/* Top Level Category Switcher Tabs */}
            <div className="grid grid-cols-2 gap-1.5 bg-slate-950 p-1 rounded-2xl border border-slate-800">
              <button
                onClick={() => setElectionCategoryTab('assembly')}
                className={`py-2 px-3 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-1.5 ${
                  electionCategoryTab === 'assembly'
                    ? 'bg-amber-500 text-slate-950 shadow-md'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <span>🗳️</span>
                <span>{language === 'te' ? 'శాసనసభ (AC #37)' : 'Assembly Polls'}</span>
                <span className="text-[10px] opacity-80">(1-266)</span>
              </button>

              <button
                onClick={() => setElectionCategoryTab('local')}
                className={`py-2 px-3 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-1.5 ${
                  electionCategoryTab === 'local'
                    ? 'bg-gradient-to-r from-red-600 via-amber-500 to-amber-600 text-slate-950 shadow-md font-black'
                    : 'text-amber-400 hover:text-amber-300'
                }`}
              >
                <span>🏛️</span>
                <span>{language === 'te' ? 'స్థానిక ఎన్నికలు' : 'Local Elections'}</span>
                <span className="px-1.5 py-0.2 bg-red-600 text-white rounded-full text-[9px] font-mono">NEW</span>
              </button>
            </div>

            {/* Sub-Category Pills for Local Elections */}
            {electionCategoryTab === 'local' && (
              <div className="flex items-center gap-1 overflow-x-auto pb-1 text-[11px] scrollbar-none">
                <button
                  onClick={() => setLocalSubCategory('all')}
                  className={`px-2.5 py-1 rounded-lg font-bold whitespace-nowrap transition-all ${
                    localSubCategory === 'all'
                      ? 'bg-amber-500 text-slate-950 font-black'
                      : 'bg-slate-950 text-slate-400 hover:text-white border border-slate-800'
                  }`}
                >
                  {language === 'te' ? 'అన్నీ' : 'All'}
                </button>
                <button
                  onClick={() => setLocalSubCategory('municipal')}
                  className={`px-2.5 py-1 rounded-lg font-bold whitespace-nowrap transition-all flex items-center gap-1 ${
                    localSubCategory === 'municipal'
                      ? 'bg-blue-600 text-white font-black'
                      : 'bg-slate-950 text-blue-300 hover:text-white border border-blue-500/30'
                  }`}
                >
                  <Building2 className="w-3 h-3" />
                  <span>{language === 'te' ? 'మున్సిపల్ వార్డులు' : 'Municipal Wards'}</span>
                  <span className="bg-emerald-500 text-slate-950 text-[9px] px-1 rounded-full font-black">2 Ready</span>
                </button>
                <button
                  onClick={() => setLocalSubCategory('panchayat')}
                  className={`px-2.5 py-1 rounded-lg font-bold whitespace-nowrap transition-all flex items-center gap-1 ${
                    localSubCategory === 'panchayat'
                      ? 'bg-emerald-600 text-white font-black'
                      : 'bg-slate-950 text-emerald-300 hover:text-white border border-emerald-500/30'
                  }`}
                >
                  <Home className="w-3 h-3" />
                  <span>{language === 'te' ? 'గ్రామ వార్డులు' : 'Panchayat Wards'}</span>
                </button>
                <button
                  onClick={() => setLocalSubCategory('mptc')}
                  className={`px-2.5 py-1 rounded-lg font-bold whitespace-nowrap transition-all flex items-center gap-1 ${
                    localSubCategory === 'mptc'
                      ? 'bg-purple-600 text-white font-black'
                      : 'bg-slate-950 text-purple-300 hover:text-white border border-purple-500/30'
                  }`}
                >
                  <Users className="w-3 h-3" />
                  <span>MPTC</span>
                </button>
                <button
                  onClick={() => setLocalSubCategory('zptc')}
                  className={`px-2.5 py-1 rounded-lg font-bold whitespace-nowrap transition-all flex items-center gap-1 ${
                    localSubCategory === 'zptc'
                      ? 'bg-orange-600 text-white font-black'
                      : 'bg-slate-950 text-orange-300 hover:text-white border border-orange-500/30'
                  }`}
                >
                  <Landmark className="w-3 h-3" />
                  <span>ZPTC</span>
                </button>
              </div>
            )}

            {/* Search Input */}
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                placeholder={
                  electionCategoryTab === 'assembly'
                    ? (language === 'te' ? 'బూత్ నెం, గ్రామం లేదా మండలం ద్వారా శోధించండి...' : 'Search by Booth #, Village, or Mandal...')
                    : (language === 'te' ? 'వార్డు నెం, మునిసిపాలిటీ లేదా గ్రామం ద్వారా శోధించండి...' : 'Search by Ward #, Municipality, Village...')
                }
                className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-400"
              />
            </div>

            {/* Lock Toggle */}
            <div className="bg-slate-950/60 border border-slate-800 px-3 py-2 rounded-xl flex items-center justify-between">
              <span className="text-xs text-slate-300 font-medium flex items-center gap-1.5">
                <Lock className="w-3.5 h-3.5 text-amber-400" />
                {language === 'te' ? 'ఎంపిక తర్వాత ఈ బూత్/వార్డుకు లాక్ చేయండి' : 'Lock to this unit after selection'}
              </span>
              <input
                type="checkbox"
                checked={lockOnAssign}
                onChange={e => setLockOnAssign(e.target.checked)}
                className="rounded border-slate-700 text-amber-500 bg-slate-900 w-4 h-4"
              />
            </div>

            {/* Scrollable List */}
            <div className="flex-1 overflow-y-auto space-y-1.5 pr-1 divide-y divide-slate-800/40">
              {/* 1. ASSEMBLY BOOTHS LIST */}
              {electionCategoryTab === 'assembly' && (
                filteredBooths.map(b => {
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
                            {language === 'te' ? 'ఎంచుకోండి' : 'Assign'}
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })
              )}

              {/* 2. LOCAL ELECTIONS LIST */}
              {electionCategoryTab === 'local' && (
                filteredLocalUnits.map(u => {
                  const isSelected = u.id === currentPartNo || u.part_no === currentPartNo;

                  return (
                    <div
                      key={u.id}
                      onClick={() => {
                        if (u.is_loaded) {
                          onSelectBooth(u.id, lockOnAssign);
                          onClose();
                        }
                      }}
                      className={`p-2.5 rounded-xl transition-all border ${
                        isSelected
                          ? 'bg-blue-950/40 border-blue-500 text-white'
                          : u.is_loaded
                            ? 'bg-gradient-to-r from-blue-950/40 via-amber-950/30 to-slate-900 border-amber-500/60 shadow-lg cursor-pointer hover:border-amber-400'
                            : 'bg-slate-950/20 border-slate-900/60 opacity-60 cursor-not-allowed'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="space-y-1 min-w-0 flex-1">
                          {/* Badges Row */}
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className={`px-1.5 py-0.2 rounded text-[9.5px] font-black ${
                              u.election_type === 'municipal'
                                ? 'bg-blue-900/60 text-blue-300 border border-blue-500/40'
                                : u.election_type === 'panchayat'
                                  ? 'bg-emerald-900/60 text-emerald-300 border border-emerald-500/40'
                                  : 'bg-purple-900/60 text-purple-300 border border-purple-500/40'
                            }`}>
                              {u.category_label.split(' ')[0]}
                            </span>

                            {u.is_loaded && (
                              <span className="px-2 py-0.2 bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 rounded-full text-[9.5px] font-black flex items-center gap-1 animate-pulse">
                                <Sparkles className="w-3 h-3 text-emerald-400" />
                                {u.total_voters.toLocaleString()} ఓటర్లు లోడ్ అయ్యాయి (Active)
                              </span>
                            )}
                          </div>

                          {/* Unit Title */}
                          <div className="font-extrabold text-white text-xs">
                            {u.village}
                          </div>

                          <div className="text-[10px] text-slate-400">
                            {u.local_body} • {u.ps_address}
                          </div>

                          {u.sections && (
                            <div className="text-[9.5px] text-amber-300/90 font-medium">
                              వీధులు: {u.sections}
                            </div>
                          )}

                          {u.is_loaded && (
                            <div className="flex items-center gap-3 text-[10px] pt-1 text-slate-300 font-mono">
                              <span>పురుషులు: <strong className="text-white">{u.male_count}</strong></span>
                              <span>మహిళలు: <strong className="text-white">{u.female_count}</strong></span>
                              <span>క్రియా: <strong className="text-amber-400">{u.exact_kriya_count}</strong></span>
                            </div>
                          )}
                        </div>

                        {/* Right Action */}
                        <div className="flex-shrink-0 pt-1">
                          {isSelected ? (
                            <span className="w-6 h-6 rounded-full bg-emerald-500 text-slate-950 flex items-center justify-center font-bold text-xs">
                              <Check className="w-3.5 h-3.5" />
                            </span>
                          ) : u.is_loaded ? (
                            <button
                              onClick={() => {
                                onSelectBooth(u.id, lockOnAssign);
                                onClose();
                              }}
                              className="px-2.5 py-1.5 bg-gradient-to-r from-red-600 to-amber-600 hover:from-red-500 hover:to-amber-500 text-white font-black rounded-xl text-[11px] shadow-md shadow-red-950/40"
                            >
                              {language === 'te' ? 'ఓపెన్ చేయండి' : 'Open Ward'}
                            </button>
                          ) : (
                            <span className="px-2 py-1 bg-slate-800 text-slate-500 rounded-lg text-[9.5px] font-medium">
                              PDF పెండింగ్
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}

              {((electionCategoryTab === 'assembly' && filteredBooths.length === 0) ||
                (electionCategoryTab === 'local' && filteredLocalUnits.length === 0)) && (
                <div className="py-8 text-center text-slate-500 text-xs">
                  {language === 'te' ? 'మీ శోధనకు సంబంధించిన ఫలితాలు లేవు.' : 'No units matched your search.'}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
};