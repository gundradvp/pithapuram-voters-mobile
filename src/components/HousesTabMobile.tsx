import React, { useState, useMemo } from 'react';
import { Home, Search, Users, Phone, MessageSquare, Printer, CheckCircle2, X, Copy } from 'lucide-react';
import { MobileVoter, BoothInfo, VoterSurveyStatus } from '../types';

interface HousesTabMobileProps {
  voters: MobileVoter[];
  boothInfo: BoothInfo;
  surveyMarks: Record<number, { status: VoterSurveyStatus; notes?: string }>;
  onUpdateSurveyMark: (serialNo: number, status: VoterSurveyStatus | null) => void;
  onOpenSlip: (voter: MobileVoter) => void;
}

export const HousesTabMobile: React.FC<HousesTabMobileProps> = ({
  voters,
  boothInfo,
  surveyMarks,
  onUpdateSurveyMark,
  onOpenSlip
}) => {
  const [houseSearch, setHouseSearch] = useState('');
  const [expandedHouse, setExpandedHouse] = useState<string | null>(null);
  const [copiedEpicId, setCopiedEpicId] = useState<string | null>(null);

  const handleCopyEpic = (epic: string, id: string) => {
    if (!epic) return;
    try {
      if (navigator?.clipboard?.writeText) {
        navigator.clipboard.writeText(epic);
      } else {
        const textArea = document.createElement('textarea');
        textArea.value = epic;
        textArea.style.position = 'fixed';
        textArea.style.opacity = '0';
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
      }
      setCopiedEpicId(id);
      setTimeout(() => setCopiedEpicId(null), 2000);
    } catch (err) {
      console.error('Failed to copy EPIC:', err);
    }
  };

  // Group Voters by House Number
  const houseClusters = useMemo(() => {
    const map = new Map<string, MobileVoter[]>();

    voters.forEach(v => {
      const hn = (v.hn || 'Unknown').trim();
      if (!map.has(hn)) {
        map.set(hn, []);
      }
      map.get(hn)!.push(v);
    });

    const list = Array.from(map.entries()).map(([houseNo, members]) => {
      const kriyaMembers = members.filter(m => m.kriya);
      const votedCount = members.filter(m => surveyMarks[m.s]?.status === 'voted').length;
      return {
        houseNo,
        members,
        votersCount: members.length,
        kriyaCount: kriyaMembers.length,
        votedCount,
        allVoted: votedCount === members.length && members.length > 0
      };
    });

    // Sort by house number
    return list.sort((a, b) => b.votersCount - a.votersCount);
  }, [voters, surveyMarks]);

  const filteredClusters = useMemo(() => {
    const q = houseSearch.toLowerCase().trim();
    if (!q) return houseClusters;
    return houseClusters.filter(h => 
      h.houseNo.toLowerCase().includes(q) ||
      h.members.some(m => m.n.toLowerCase().includes(q))
    );
  }, [houseClusters, houseSearch]);

  return (
    <div className="space-y-3 pb-24">
      {/* Search Bar */}
      <div className="sticky top-[53px] z-30 bg-slate-950/95 backdrop-blur-md pt-2 pb-1">
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
          <input
            type="text"
            value={houseSearch}
            onChange={e => setHouseSearch(e.target.value)}
            placeholder="Search House / Door No (e.g. 1-24, 2-15)..."
            className={`w-full bg-slate-900 border border-slate-800 rounded-xl pl-9 ${houseSearch ? 'pr-9' : 'pr-3'} py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-400 shadow-md transition-all`}
          />
          {houseSearch && (
            <button
              type="button"
              onClick={() => setHouseSearch('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-white hover:bg-slate-800 rounded-full transition-colors flex items-center justify-center active:scale-95"
              title="Clear search"
            >
              <X className="w-3.5 h-3.5 text-slate-400 hover:text-amber-400" />
            </button>
          )}
        </div>
      </div>

      {/* Summary Banner */}
      <div className="bg-amber-950/20 border border-amber-500/30 p-3 rounded-2xl flex items-center justify-between text-xs text-amber-300">
        <span className="flex items-center gap-1.5 font-bold">
          <Home className="w-4 h-4 text-amber-400" />
          {filteredClusters.length} Household Clusters
        </span>
        <span className="text-[11px] text-slate-400">Door-to-Door Field Survey</span>
      </div>

      {/* House Cluster Cards */}
      <div className="space-y-2.5">
        {filteredClusters.map(cluster => {
          const isExpanded = expandedHouse === cluster.houseNo || filteredClusters.length <= 5;
          return (
            <div
              key={cluster.houseNo}
              className={`bg-slate-900 border rounded-2xl overflow-hidden transition-all shadow-md ${
                cluster.kriyaCount > 0
                  ? 'border-red-500/40 bg-gradient-to-r from-red-950/15 via-slate-900 to-slate-900'
                  : 'border-slate-800'
              }`}
            >
              {/* Cluster Header */}
              <div
                onClick={() => setExpandedHouse(isExpanded && filteredClusters.length > 5 ? null : cluster.houseNo)}
                className="p-3.5 flex items-center justify-between cursor-pointer select-none bg-slate-950/50 hover:bg-slate-800/40 transition-colors"
              >
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-black text-amber-400 font-mono flex items-center gap-1">
                      <Home className="w-3.5 h-3.5 text-amber-400" />
                      H.No: {cluster.houseNo}
                    </span>
                    {cluster.kriyaCount > 0 && (
                      <span className="px-1.5 py-0.2 bg-red-600/30 text-amber-300 border border-red-500/40 rounded text-[9px] font-black">
                        🚩 {cluster.kriyaCount} Kriya
                      </span>
                    )}
                    {cluster.allVoted && (
                      <span className="px-1.5 py-0.2 bg-emerald-600/30 text-emerald-300 border border-emerald-500/40 rounded text-[9px] font-bold">
                        100% Voted
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-slate-400">
                    {cluster.votersCount} Registered Electors ({cluster.votedCount} Voted)
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-xs text-amber-400 font-bold">
                    {isExpanded ? '▲ Collapse' : '▼ View ( ' + cluster.votersCount + ' )'}
                  </span>
                </div>
              </div>

              {/* Members Inside House */}
              {isExpanded && (
                <div className="p-3 border-t border-slate-800/80 space-y-2 bg-slate-900/60 divide-y divide-slate-800/50">
                  {cluster.members.map(m => {
                    const mark = surveyMarks[m.s]?.status;
                    return (
                      <div key={m.s} className="pt-2 first:pt-0 space-y-1.5">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-1.5">
                            <span className="text-amber-400 font-mono font-bold text-xs">#{m.s}</span>
                            <span className="font-extrabold text-white text-xs">{m.n}</span>
                            {m.kriya && (
                              <span className="px-1.5 py-0.2 bg-gradient-to-r from-red-600 to-amber-600 text-white rounded text-[8px] font-black">
                                {m.k_type === 'exact' ? '⭐ Kriya' : '⚡ Similar'}
                              </span>
                            )}
                          </div>
                          <span className="text-[10px] text-slate-400 font-medium">
                            {m.a}y • {m.g === 'M' ? 'M' : 'F'}
                          </span>
                        </div>

                        <div className="flex items-center justify-between text-[11px] text-slate-400">
                          <span>Rel: <strong className="text-slate-300">{m.r}</strong></span>
                          <button
                            type="button"
                            onClick={() => m.id && handleCopyEpic(m.id, `house_epic_${m.s}`)}
                            className={`font-mono text-[10px] px-1.5 py-0.5 rounded border transition-all flex items-center gap-1 active:scale-95 cursor-pointer shadow-sm ${
                              copiedEpicId === `house_epic_${m.s}`
                                ? 'bg-emerald-950 text-emerald-300 border-emerald-500/80 ring-1 ring-emerald-500/50'
                                : 'text-emerald-400 hover:text-white bg-slate-900 hover:bg-slate-800 border-slate-800 hover:border-emerald-500/50'
                            }`}
                            title="Click to copy EPIC"
                          >
                            <span>{m.id}</span>
                            {copiedEpicId === `house_epic_${m.s}` ? (
                              <CheckCircle2 className="w-2.5 h-2.5 text-emerald-400" />
                            ) : (
                              <Copy className="w-2 h-2 text-slate-500 hover:text-emerald-400" />
                            )}
                          </button>
                        </div>

                        {/* Action buttons */}
                        <div className="flex items-center justify-between pt-1 gap-1">
                          <div className="flex items-center gap-1">
                            {(m.k_m || m.v_mob) && (
                              <a
                                href={`tel:${m.k_m || m.v_mob}`}
                                className="px-2 py-1 bg-slate-800 text-emerald-400 rounded-lg text-[10px] font-bold flex items-center gap-1"
                              >
                                <Phone className="w-2.5 h-2.5" /> Call
                              </a>
                            )}
                            <button
                              onClick={() => onOpenSlip(m)}
                              className="px-2 py-1 bg-slate-800 text-amber-300 rounded-lg text-[10px] font-bold flex items-center gap-1"
                            >
                              <Printer className="w-2.5 h-2.5" /> Slip
                            </button>
                          </div>

                          {/* Quick Voted Toggle */}
                          <button
                            onClick={() => onUpdateSurveyMark(m.s, mark === 'voted' ? null : 'voted')}
                            className={`px-2 py-1 rounded-lg text-[10px] font-bold border transition-all flex items-center gap-1 ${
                              mark === 'voted'
                                ? 'bg-emerald-600 text-white border-emerald-500 shadow-sm'
                                : 'bg-slate-800 text-slate-400 border-slate-700 hover:text-white'
                            }`}
                          >
                            <CheckCircle2 className="w-3 h-3" />
                            <span>{mark === 'voted' ? 'Voted' : 'Mark Voted'}</span>
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}

        {filteredClusters.length === 0 && (
          <div className="py-12 text-center text-slate-500 text-xs">
            No households found matching "{houseSearch}".
          </div>
        )}
      </div>
    </div>
  );
};
