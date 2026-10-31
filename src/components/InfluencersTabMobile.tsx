import React, { useState, useMemo } from 'react';
import { UserCheck, Phone, MessageSquare, Plus, Share2, Users, Home, Search, ShieldCheck, ChevronDown, ChevronUp, X } from 'lucide-react';
import { Influencer, MobileVoter, FamilyGroup, VoterCampaignProfile, BoothInfo } from '../types';
import { generateInfluencerWhatsAppMessage } from '../utils/storage';

interface InfluencersTabMobileProps {
  influencers: Record<string, Influencer>;
  voters: MobileVoter[];
  families: Record<string, FamilyGroup>;
  profiles: Record<number, VoterCampaignProfile>;
  boothInfo: BoothInfo;
  onAddNewInfluencer: () => void;
  onOpenInfluencerAssign: (targetName: string, currentInfId?: string) => void;
}

export const InfluencersTabMobile: React.FC<InfluencersTabMobileProps> = ({
  influencers,
  voters,
  families,
  profiles,
  boothInfo,
  onAddNewInfluencer
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedInfId, setExpandedInfId] = useState<string | null>(null);

  const influencerList = useMemo(() => {
    return Object.values(influencers);
  }, [influencers]);

  // Map influencers to assigned voters and families
  const influencerStats = useMemo(() => {
    const voterMap: Record<string, MobileVoter[]> = {};
    const familyMap: Record<string, FamilyGroup[]> = {};

    influencerList.forEach(inf => {
      voterMap[inf.id] = [];
      familyMap[inf.id] = [];
    });

    // 1. Check family assignments
    Object.values(families).forEach(fam => {
      const infId = fam.influencerId;
      if (infId && voterMap[infId]) {
        familyMap[infId].push(fam);
        fam.memberSnos.forEach(sno => {
          const v = voters.find(x => x.s === sno);
          if (v && !voterMap[infId].some((existing: MobileVoter) => existing.s === sno)) {
            voterMap[infId].push(v);
          }
        });
      }
    });

    // 2. Check individual profile assignments
    Object.entries(profiles).forEach(([snoStr, prof]) => {
      const sno = parseInt(snoStr, 10);
      const infId = prof.influencerId;
      if (infId && voterMap[infId]) {
        const v = voters.find(x => x.s === sno);
        if (v && !voterMap[infId].some((existing: MobileVoter) => existing.s === sno)) {
          voterMap[infId].push(v);
        }
      }
    });

    return { voterMap, familyMap };
  }, [influencerList, families, profiles, voters]);

  const filteredInfluencers = influencerList.filter(inf => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return true;
    return (
      inf.name.toLowerCase().includes(q) ||
      inf.role.toLowerCase().includes(q) ||
      inf.mobile.includes(q)
    );
  });

  const handleDispatchWhatsApp = (inf: Influencer) => {
    const assignedVoters = influencerStats.voterMap[inf.id] || [];
    if (assignedVoters.length === 0) {
      alert(`No voters are currently assigned to ${inf.name}. Assign families or electors to this influencer first.`);
      return;
    }

    const msg = generateInfluencerWhatsAppMessage(
      inf,
      boothInfo.part_no,
      boothInfo.clean_village,
      assignedVoters,
      profiles
    );

    const url = `https://wa.me/91${inf.mobile}?text=${encodeURIComponent(msg)}`;
    window.open(url, '_blank');
  };

  return (
    <div className="space-y-3.5 pb-24 text-xs">
      {/* Search & Add Bar */}
      <div className="sticky top-[53px] z-30 bg-slate-950/95 backdrop-blur-md pt-2 pb-1 space-y-2">
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search Influencer Name, Role, Mobile..."
              className={`w-full bg-slate-900 border border-slate-800 rounded-xl pl-9 ${searchQuery ? 'pr-9' : 'pr-3'} py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-400 shadow-md transition-all`}
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-white hover:bg-slate-800 rounded-full transition-colors flex items-center justify-center active:scale-95"
                title="Clear search text"
              >
                <X className="w-3.5 h-3.5 text-slate-400 hover:text-amber-400" />
              </button>
            )}
          </div>

          <button
            onClick={onAddNewInfluencer}
            className="px-3 py-2 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black rounded-xl text-xs flex items-center gap-1 shadow-md shadow-amber-950/40 whitespace-nowrap"
          >
            <Plus className="w-4 h-4" />
            <span>Add Leader</span>
          </button>
        </div>
      </div>

      {/* Influencers Hub Guide Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-amber-950/30 to-slate-900 border border-amber-500/30 p-3.5 rounded-2xl space-y-1 shadow-md">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-black text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
            <UserCheck className="w-4 h-4 text-emerald-400" />
            Influencer Assignment & WhatsApp Dispatch
          </span>
          <span className="text-[10px] bg-slate-800 text-amber-300 font-bold px-2 py-0.5 rounded-full">
            {influencerList.length} Active Leaders
          </span>
        </div>
        <p className="text-[11px] text-slate-300 leading-relaxed">
          Assign electors and families to Ward Members, Caste Elders, or Youth Leaders. Tap <strong>"Dispatch to WhatsApp"</strong> to send their assigned voter list directly into their WhatsApp chat!
        </p>
      </div>

      {/* Influencers Cards List */}
      <div className="space-y-3">
        {filteredInfluencers.map(inf => {
          const assignedVoters = influencerStats.voterMap[inf.id] || [];
          const assignedFamilies = influencerStats.familyMap[inf.id] || [];
          const isExpanded = expandedInfId === inf.id;

          return (
            <div
              key={inf.id}
              className="bg-slate-900 border border-slate-800 hover:border-amber-500/40 rounded-2xl p-3.5 space-y-2.5 transition-all shadow-md"
            >
              {/* Card Header */}
              <div className="flex items-start justify-between">
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="text-sm font-black text-white">{inf.name}</h3>
                    <span className="px-2 py-0.2 bg-amber-500/20 text-amber-300 border border-amber-500/30 rounded-md text-[9px] font-bold">
                      {inf.role}
                    </span>
                  </div>
                  <div className="text-[11px] text-emerald-400 font-mono font-bold flex items-center gap-1">
                    <Phone className="w-3 h-3 text-emerald-400" /> {inf.mobile}
                  </div>
                  {inf.notes && (
                    <p className="text-[10px] text-slate-400 italic mt-0.5">{inf.notes}</p>
                  )}
                </div>

                <div className="text-right">
                  <span className="text-base font-black text-amber-400 font-mono block">
                    {assignedVoters.length}
                  </span>
                  <span className="text-[9px] text-slate-400 uppercase font-bold block">
                    Assigned Voters
                  </span>
                </div>
              </div>

              {/* Assignment Summary Pills */}
              <div className="grid grid-cols-2 gap-2 text-center text-[10px]">
                <div className="bg-slate-950 border border-slate-800 p-1.5 rounded-xl">
                  <span className="text-slate-400 block font-bold">Assigned Families</span>
                  <span className="font-extrabold text-white text-xs">{assignedFamilies.length} Families</span>
                </div>
                <div className="bg-slate-950 border border-slate-800 p-1.5 rounded-xl">
                  <span className="text-slate-400 block font-bold">Assigned Electors</span>
                  <span className="font-extrabold text-amber-400 text-xs">{assignedVoters.length} Voters</span>
                </div>
              </div>

              {/* Action Buttons: 1-Click WhatsApp Dispatch */}
              <div className="grid grid-cols-3 gap-1.5 pt-1 border-t border-slate-800">
                <a
                  href={`tel:${inf.mobile}`}
                  className="py-2 bg-slate-800 hover:bg-slate-700 text-emerald-400 rounded-xl text-xs font-bold flex items-center justify-center gap-1 border border-slate-700"
                >
                  <Phone className="w-3.5 h-3.5" />
                  <span>Call</span>
                </a>

                <a
                  href={`https://wa.me/91${inf.mobile}`}
                  target="_blank"
                  rel="noreferrer"
                  className="py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-bold flex items-center justify-center gap-1 border border-slate-700"
                >
                  <MessageSquare className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Chat</span>
                </a>

                <button
                  onClick={() => handleDispatchWhatsApp(inf)}
                  className="py-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white rounded-xl text-xs font-black flex items-center justify-center gap-1 shadow-md shadow-emerald-950/40"
                  title="Dispatch assigned voters task list via WhatsApp"
                >
                  <Share2 className="w-3.5 h-3.5" />
                  <span>Dispatch</span>
                </button>
              </div>

              {/* Expand Assigned Voters Toggle */}
              {assignedVoters.length > 0 && (
                <div className="pt-1">
                  <button
                    onClick={() => setExpandedInfId(isExpanded ? null : inf.id)}
                    className="w-full text-center text-[10px] text-amber-400 font-bold hover:underline py-1 flex items-center justify-center gap-1"
                  >
                    <span>{isExpanded ? 'Hide Assigned Electors' : `View ${assignedVoters.length} Assigned Electors`}</span>
                    {isExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                  </button>

                  {isExpanded && (
                    <div className="mt-2 space-y-1.5 bg-slate-950/80 p-2.5 rounded-xl border border-slate-800 divide-y divide-slate-800/40 max-h-56 overflow-y-auto">
                      {assignedVoters.map(v => {
                        const prof = profiles[v.s] || {};
                        const phone = prof.customPhone || v.k_m;
                        const pct = prof.supportPct !== undefined ? prof.supportPct : (v.kriya ? 100 : 50);

                        return (
                          <div key={v.s} className="pt-1.5 first:pt-0 flex items-center justify-between text-[11px]">
                            <div>
                              <div className="flex items-center gap-1">
                                <span className="font-mono text-amber-400 font-bold">#{v.s}</span>
                                <span className="font-bold text-white">{v.n}</span>
                              </div>
                              <div className="text-[10px] text-slate-400">
                                H.No: <strong className="text-slate-300 font-mono">{v.hn}</strong> • {phone ? `📱 ${phone}` : 'No Phone'}
                              </div>
                            </div>

                            <span className={`px-1.5 py-0.2 rounded text-[9px] font-bold ${
                              pct === 100 ? 'bg-red-600/30 text-red-300' : pct >= 75 ? 'bg-emerald-600/30 text-emerald-300' : pct === 40 ? 'bg-amber-600/30 text-amber-300' : 'bg-slate-800 text-slate-400'
                            }`}>
                              {pct}%
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}

        {filteredInfluencers.length === 0 && (
          <div className="py-12 text-center text-slate-500 text-xs space-y-2">
            <p className="font-bold text-slate-300 text-sm">No Influencers Found</p>
            <p>Tap "Add Leader" above to create your first Ward Member or Community Elder.</p>
          </div>
        )}
      </div>
    </div>
  );
};
