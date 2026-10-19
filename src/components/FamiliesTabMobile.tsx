import React, { useState, useMemo } from 'react';
import { Home, Search, Users, Phone, MessageSquare, Printer, Plus, Sliders, UserCheck, Edit3, Share2, Sparkles, ChevronDown, ChevronUp } from 'lucide-react';
import { FamilyGroup, MobileVoter, Influencer, VoterCampaignProfile, BoothInfo } from '../types';

interface FamiliesTabMobileProps {
  families: Record<string, FamilyGroup>;
  voters: MobileVoter[];
  influencers: Record<string, Influencer>;
  profiles: Record<number, VoterCampaignProfile>;
  boothInfo: BoothInfo;
  onCreateFamily: () => void;
  onEditFamily: (family: FamilyGroup) => void;
  onOpenPhoneEditor: (voter: MobileVoter) => void;
  onOpenSupportPicker: (title: string, currentPct: number, currentNotes?: string, familyId?: string) => void;
  onOpenInfluencerAssign: (targetName: string, currentInfId?: string, familyId?: string) => void;
  onOpenSlip: (voter: MobileVoter) => void;
}

export const FamiliesTabMobile: React.FC<FamiliesTabMobileProps> = ({
  families,
  voters,
  influencers,
  profiles,
  boothInfo,
  onCreateFamily,
  onEditFamily,
  onOpenPhoneEditor,
  onOpenSupportPicker,
  onOpenInfluencerAssign,
  onOpenSlip
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterMode, setFilterMode] = useState<'all' | 'full' | 'strong' | 'soft' | 'neutral' | 'opponent'>('all');
  const [expandedFamId, setExpandedFamId] = useState<string | null>(null);

  const familyList = useMemo(() => {
    return Object.values(families);
  }, [families]);

  // Counts for filters
  const counts = useMemo(() => {
    let full = 0;
    let strong = 0;
    let soft = 0;
    let neutral = 0;
    let opponent = 0;

    familyList.forEach(f => {
      if (f.supportPct === 100) full++;
      else if (f.supportPct >= 75) strong++;
      else if (f.supportPct === 40) soft++;
      else if (f.supportPct === 0) opponent++;
      else neutral++;
    });

    return { all: familyList.length, full, strong, soft, neutral, opponent };
  }, [familyList]);

  const filteredFamilies = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();

    return familyList.filter(f => {
      // Filter by leaning
      if (filterMode === 'full' && f.supportPct !== 100) return false;
      if (filterMode === 'strong' && (f.supportPct < 75 || f.supportPct === 100)) return false;
      if (filterMode === 'soft' && f.supportPct !== 40) return false;
      if (filterMode === 'neutral' && (f.supportPct === 100 || f.supportPct >= 75 || f.supportPct === 40 || f.supportPct === 0)) return false;
      if (filterMode === 'opponent' && f.supportPct !== 0) return false;

      // Filter by text search
      if (q) {
        const nameMatch = f.name.toLowerCase().includes(q);
        const hnMatch = f.houseNumbers.some(h => h.toLowerCase().includes(q));
        const headMatch = f.headName?.toLowerCase().includes(q);
        const infMatch = f.influencerName?.toLowerCase().includes(q);
        if (!nameMatch && !hnMatch && !headMatch && !infMatch) return false;
      }

      return true;
    });
  }, [familyList, searchQuery, filterMode]);

  const getLeaningBadge = (pct: number) => {
    if (pct === 100) {
      return (
        <span className="px-2 py-0.5 bg-red-600/30 text-red-300 border border-red-500/50 rounded-full text-[10px] font-black flex items-center gap-1">
          🚩 100% Full Support
        </span>
      );
    }
    if (pct >= 75) {
      return (
        <span className="px-2 py-0.5 bg-emerald-600/30 text-emerald-300 border border-emerald-500/50 rounded-full text-[10px] font-black flex items-center gap-1">
          🟢 {pct}% Strong Lean
        </span>
      );
    }
    if (pct === 40) {
      return (
        <span className="px-2 py-0.5 bg-amber-600/30 text-amber-300 border border-amber-500/50 rounded-full text-[10px] font-black flex items-center gap-1">
          🟡 40% Positive to Us
        </span>
      );
    }
    if (pct === 0) {
      return (
        <span className="px-2 py-0.5 bg-rose-950/80 text-rose-400 border border-rose-500/50 rounded-full text-[10px] font-black flex items-center gap-1">
          🔴 100% Opponent
        </span>
      );
    }
    if (pct <= 25) {
      return (
        <span className="px-2 py-0.5 bg-orange-600/30 text-orange-300 border border-orange-500/50 rounded-full text-[10px] font-bold flex items-center gap-1">
          🟠 {pct}% Doubtful
        </span>
      );
    }
    return (
      <span className="px-2 py-0.5 bg-slate-800 text-slate-300 border border-slate-700 rounded-full text-[10px] font-bold flex items-center gap-1">
        ⚪ 50% Neutral / Swing
      </span>
    );
  };

  return (
    <div className="space-y-3 pb-24 text-xs">
      {/* Search & Actions Bar */}
      <div className="sticky top-[53px] z-30 bg-slate-950/95 backdrop-blur-md pt-2 pb-1 space-y-2">
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search Family Name, Door No, Elder..."
              className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-400 shadow-md"
            />
          </div>

          <button
            onClick={onCreateFamily}
            className="px-3 py-2 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black rounded-xl text-xs flex items-center gap-1 shadow-md shadow-amber-950/40 whitespace-nowrap"
          >
            <Plus className="w-4 h-4" />
            <span>Group Family</span>
          </button>
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto py-1.5 scrollbar-none text-[11px]">
          <button
            onClick={() => setFilterMode('all')}
            className={`px-2.5 py-1 rounded-lg font-bold whitespace-nowrap transition-all ${
              filterMode === 'all'
                ? 'bg-amber-500 text-slate-950 font-black shadow-sm'
                : 'bg-slate-900 text-slate-400 border border-slate-800'
            }`}
          >
            All ({counts.all})
          </button>

          <button
            onClick={() => setFilterMode('full')}
            className={`px-2.5 py-1 rounded-lg font-bold whitespace-nowrap transition-all flex items-center gap-1 ${
              filterMode === 'full'
                ? 'bg-red-600 text-white font-black shadow-sm'
                : 'bg-slate-900 text-red-300 border border-red-500/30'
            }`}
          >
            <span>🚩 100% Full ({counts.full})</span>
          </button>

          <button
            onClick={() => setFilterMode('soft')}
            className={`px-2.5 py-1 rounded-lg font-bold whitespace-nowrap transition-all flex items-center gap-1 ${
              filterMode === 'soft'
                ? 'bg-amber-600 text-slate-950 font-black shadow-sm'
                : 'bg-slate-900 text-amber-300 border border-amber-500/30'
            }`}
          >
            <span>🟡 40% Positive ({counts.soft})</span>
          </button>

          <button
            onClick={() => setFilterMode('strong')}
            className={`px-2.5 py-1 rounded-lg font-bold whitespace-nowrap transition-all flex items-center gap-1 ${
              filterMode === 'strong'
                ? 'bg-emerald-600 text-white font-black shadow-sm'
                : 'bg-slate-900 text-emerald-300 border border-emerald-500/30'
            }`}
          >
            <span>🟢 75% Strong ({counts.strong})</span>
          </button>

          <button
            onClick={() => setFilterMode('neutral')}
            className={`px-2.5 py-1 rounded-lg font-bold whitespace-nowrap transition-all ${
              filterMode === 'neutral'
                ? 'bg-slate-700 text-white font-black shadow-sm'
                : 'bg-slate-900 text-slate-400 border border-slate-800'
            }`}
          >
            ⚪ Neutral / Swing ({counts.neutral})
          </button>

          <button
            onClick={() => setFilterMode('opponent')}
            className={`px-2.5 py-1 rounded-lg font-bold whitespace-nowrap transition-all flex items-center gap-1 ${
              filterMode === 'opponent'
                ? 'bg-rose-900 text-rose-200 font-black shadow-sm'
                : 'bg-slate-900 text-rose-400 border border-rose-500/30'
            }`}
          >
            <span>🔴 Opponents ({counts.opponent})</span>
          </button>
        </div>
      </div>

      {/* Showing count */}
      <div className="flex items-center justify-between text-[11px] text-slate-400 px-1">
        <span>
          Showing <strong className="text-white">{filteredFamilies.length}</strong> Family Groups in Booth #{boothInfo.part_no}
        </span>
      </div>

      {/* Families List */}
      <div className="space-y-3">
        {filteredFamilies.map(fam => {
          const isExpanded = expandedFamId === fam.id || filteredFamilies.length <= 3;
          const memberVoters = fam.memberSnos
            .map(sno => voters.find(v => v.s === sno))
            .filter(Boolean) as MobileVoter[];

          return (
            <div
              key={fam.id}
              className={`bg-slate-900 border rounded-2xl overflow-hidden transition-all shadow-md ${
                fam.supportPct === 100
                  ? 'border-red-500/50 bg-gradient-to-r from-red-950/20 via-slate-900 to-slate-900'
                  : fam.supportPct >= 75
                    ? 'border-emerald-500/40 bg-gradient-to-r from-emerald-950/20 via-slate-900 to-slate-900'
                    : fam.supportPct === 40
                      ? 'border-amber-500/40 bg-gradient-to-r from-amber-950/20 via-slate-900 to-slate-900'
                      : 'border-slate-800'
              }`}
            >
              {/* Family Card Top */}
              <div className="p-3.5 space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <h3 className="text-sm font-black text-white">{fam.name}</h3>
                      {getLeaningBadge(fam.supportPct)}
                    </div>
                    <div className="text-[11px] text-slate-400 flex items-center gap-2">
                      <span className="font-mono text-amber-400 font-bold">
                        H.No: {fam.houseNumbers.join(', ')}
                      </span>
                      <span>•</span>
                      <span>{memberVoters.length} Registered Electors</span>
                    </div>
                  </div>

                  <button
                    onClick={() => onEditFamily(fam)}
                    className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs"
                    title="Edit Family Settings"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                  </button>
                </div>

                {/* Assigned Influencer Banner */}
                <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-2.5 flex items-center justify-between">
                  <div className="space-y-0.5">
                    <span className="text-[10px] uppercase font-bold text-slate-400 block flex items-center gap-1">
                      <UserCheck className="w-3 h-3 text-amber-400" /> Key Influencer:
                    </span>
                    {fam.influencerName ? (
                      <div className="flex items-center gap-1.5">
                        <span className="font-bold text-white text-xs">{fam.influencerName}</span>
                        {fam.influencerMobile && (
                          <span className="font-mono text-[10px] text-emerald-400">({fam.influencerMobile})</span>
                        )}
                      </div>
                    ) : (
                      <span className="text-slate-500 italic text-[11px]">No Influencer Assigned</span>
                    )}
                  </div>

                  <div className="flex items-center gap-1">
                    {fam.influencerMobile && (
                      <a
                        href={`tel:${fam.influencerMobile}`}
                        className="p-1.5 bg-slate-800 text-emerald-400 rounded-lg"
                        title="Call Influencer"
                      >
                        <Phone className="w-3 h-3" />
                      </a>
                    )}
                    <button
                      onClick={() => onOpenInfluencerAssign(fam.name, fam.influencerId, fam.id)}
                      className="px-2 py-1 bg-amber-500/20 hover:bg-amber-500 text-amber-300 hover:text-slate-950 rounded-lg text-[10px] font-bold border border-amber-500/30 transition-colors"
                    >
                      {fam.influencerName ? 'Change' : '+ Assign'}
                    </button>
                  </div>
                </div>

                {/* Ground Notes if any */}
                {fam.campaignNotes && (
                  <p className="text-[10px] text-amber-300/90 italic bg-slate-950/50 p-2 rounded-lg border border-slate-800/80">
                    📝 {fam.campaignNotes}
                  </p>
                )}

                {/* Quick Leaning Setter */}
                <div className="flex items-center justify-between pt-1 border-t border-slate-800/60 text-[10px]">
                  <span className="text-slate-400 font-bold">Adjust Leaning:</span>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => onOpenSupportPicker(fam.name, fam.supportPct, fam.campaignNotes, fam.id)}
                      className="px-2 py-0.5 bg-slate-800 hover:bg-slate-700 text-amber-300 border border-slate-700 rounded-lg font-bold flex items-center gap-1"
                    >
                      <Sliders className="w-2.5 h-2.5" /> Change %
                    </button>
                  </div>
                </div>
              </div>

              {/* Members inside Family */}
              <div className="border-t border-slate-800 bg-slate-950/60">
                <button
                  onClick={() => setExpandedFamId(isExpanded && filteredFamilies.length > 3 ? null : fam.id)}
                  className="w-full px-3.5 py-1.5 flex items-center justify-between text-[11px] text-amber-400 font-bold hover:bg-slate-800/40"
                >
                  <span>Family Members ({memberVoters.length} Electors)</span>
                  {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                </button>

                {isExpanded && (
                  <div className="p-3 space-y-2 divide-y divide-slate-800/50">
                    {memberVoters.map(m => {
                      const prof = profiles[m.s] || {};
                      const phone = prof.customPhone || m.k_m;

                      return (
                        <div key={m.s} className="pt-2 first:pt-0 space-y-1">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="font-mono text-amber-400 font-bold text-xs">#{m.s}</span>
                              <span className="font-black text-white text-xs">{m.n}</span>
                              {m.kriya && (
                                <span className="px-1 py-0.2 bg-red-600/30 text-amber-300 border border-red-500/30 rounded text-[8px] font-bold">
                                  🚩 Kriya
                                </span>
                              )}
                            </div>
                            <span className="text-[10px] text-slate-400">
                              {m.a}y • {m.g === 'M' ? 'M' : 'F'}
                            </span>
                          </div>

                          <div className="flex items-center justify-between text-[10px] text-slate-400">
                            <span>Rel: <strong className="text-slate-300">{m.r}</strong></span>
                            {phone ? (
                              <span className="font-mono text-emerald-400 font-bold">📱 {phone}</span>
                            ) : (
                              <button
                                onClick={() => onOpenPhoneEditor(m)}
                                className="text-amber-400 underline font-semibold"
                              >
                                + Add Phone
                              </button>
                            )}
                          </div>

                          {/* Quick Dial & Actions */}
                          <div className="flex items-center justify-between pt-1 gap-1">
                            <div className="flex items-center gap-1">
                              {phone ? (
                                <>
                                  <a
                                    href={`tel:${phone}`}
                                    className="p-1 bg-slate-800 hover:bg-slate-700 text-emerald-400 rounded-md text-[10px] flex items-center gap-1"
                                    title="Call"
                                  >
                                    <Phone className="w-2.5 h-2.5" /> Call
                                  </a>
                                  <a
                                    href={`https://wa.me/91${phone}?text=${encodeURIComponent(`నమస్కారం ${m.n} గారు, జనసేన పార్టీ పిఠాపురం బూత్ #${boothInfo.part_no} నుండి సంప్రదిస్తున్నాము.`)}`}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="p-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded-md text-[10px] flex items-center gap-1"
                                    title="WhatsApp"
                                  >
                                    <MessageSquare className="w-2.5 h-2.5" /> WA
                                  </a>
                                </>
                              ) : null}
                              <button
                                onClick={() => onOpenPhoneEditor(m)}
                                className="p-1 bg-slate-800 text-slate-300 rounded-md text-[10px]"
                                title="Edit Phone"
                              >
                                Edit Phone
                              </button>
                            </div>

                            <button
                              onClick={() => onOpenSlip(m)}
                              className="p-1 bg-slate-800 text-amber-300 rounded-md text-[10px] font-bold flex items-center gap-0.5"
                            >
                              <Printer className="w-2.5 h-2.5" /> Slip
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          );
        })}

        {filteredFamilies.length === 0 && (
          <div className="py-12 text-center text-slate-500 text-xs space-y-2">
            <p className="font-bold text-slate-300 text-sm">No Family Groups Match</p>
            <p>Tap "Group Family" above to create custom household groups.</p>
          </div>
        )}
      </div>
    </div>
  );
};
