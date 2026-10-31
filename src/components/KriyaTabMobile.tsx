import React, { useState } from 'react';
import { Flag, Phone, MessageSquare, UserCheck, ShieldCheck, Search, X } from 'lucide-react';
import { MobileVoter, BoothInfo, BoothVolunteer } from '../types';

interface KriyaTabMobileProps {
  voters: MobileVoter[];
  volunteers: BoothVolunteer[];
  boothInfo: BoothInfo;
}

export const KriyaTabMobile: React.FC<KriyaTabMobileProps> = ({
  voters,
  volunteers,
  boothInfo
}) => {
  const [memberSearch, setMemberSearch] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'exact' | 'similar'>('all');

  const kriyaMembers = voters.filter(v => v.kriya);

  const filteredMembers = kriyaMembers.filter(m => {
    if (filterType === 'exact' && m.k_type !== 'exact') return false;
    if (filterType === 'similar' && m.k_type === 'exact') return false;

    const q = memberSearch.toLowerCase().trim();
    if (!q) return true;
    return (
      m.n.toLowerCase().includes(q) ||
      m.r.toLowerCase().includes(q) ||
      (m.k_m && m.k_m.includes(q)) ||
      (m.k_id && m.k_id.toString().includes(q))
    );
  });

  return (
    <div className="space-y-4 pb-24">
      {/* Search Input */}
      <div className="sticky top-[53px] z-30 bg-slate-950/95 backdrop-blur-md pt-2 pb-1">
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
          <input
            type="text"
            value={memberSearch}
            onChange={e => setMemberSearch(e.target.value)}
            placeholder="Search Kriya Member Name, Mobile, ID..."
            className={`w-full bg-slate-900 border border-slate-800 rounded-xl pl-9 ${memberSearch ? 'pr-9' : 'pr-3'} py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-400 shadow-md transition-all`}
          />
          {memberSearch && (
            <button
              type="button"
              onClick={() => setMemberSearch('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-white hover:bg-slate-800 rounded-full transition-colors flex items-center justify-center active:scale-95"
              title="Clear search"
            >
              <X className="w-3.5 h-3.5 text-slate-400 hover:text-amber-400" />
            </button>
          )}
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto py-2 text-[11px]">
          <button
            onClick={() => setFilterType('all')}
            className={`px-3 py-1 rounded-lg font-bold transition-all ${
              filterType === 'all'
                ? 'bg-red-600 text-white font-black shadow-sm'
                : 'bg-slate-900 text-slate-400 border border-slate-800'
            }`}
          >
            All Enrolled ({kriyaMembers.length})
          </button>
          <button
            onClick={() => setFilterType('exact')}
            className={`px-3 py-1 rounded-lg font-bold transition-all flex items-center gap-1 ${
              filterType === 'exact'
                ? 'bg-gradient-to-r from-red-600 to-amber-600 text-white font-black shadow-sm'
                : 'bg-slate-900 text-amber-300 border border-amber-500/30'
            }`}
          >
            ⭐ Exact Matches ({boothInfo.exact_kriya_count})
          </button>
          <button
            onClick={() => setFilterType('similar')}
            className={`px-3 py-1 rounded-lg font-bold transition-all flex items-center gap-1 ${
              filterType === 'similar'
                ? 'bg-gradient-to-r from-amber-500 to-yellow-500 text-slate-950 font-black shadow-sm'
                : 'bg-slate-900 text-yellow-300 border border-yellow-500/30'
            }`}
          >
            ⚡ Similar ({boothInfo.similar_kriya_count})
          </button>
        </div>
      </div>

      {/* BOOTH ASSIGNED VOLUNTEERS SECTION */}
      {volunteers.length > 0 && (
        <div className="bg-slate-900 border border-amber-500/30 rounded-2xl p-3.5 space-y-2.5 shadow-md">
          <div className="flex items-center justify-between border-b border-slate-800 pb-2">
            <span className="text-xs font-black text-amber-400 flex items-center gap-1.5 uppercase tracking-wider">
              <UserCheck className="w-3.5 h-3.5 text-emerald-400" />
              Assigned Booth Volunteers ({volunteers.length})
            </span>
            <span className="text-[10px] text-slate-400 font-bold">Party Network</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {volunteers.map((vol, idx) => (
              <div key={idx} className="bg-slate-950/80 border border-slate-800 p-2.5 rounded-xl flex items-center justify-between">
                <div>
                  <span className="font-extrabold text-white text-xs block">{vol.name}</span>
                  <span className="text-[10px] text-emerald-400 font-mono block">📱 {vol.mobile}</span>
                  <span className="text-[9px] text-slate-500">{vol.count} members enrolled</span>
                </div>

                <div className="flex items-center gap-1">
                  <a
                    href={`https://wa.me/91${vol.mobile}?text=${encodeURIComponent(`నమస్కారం ${vol.name} గారు, పిఠాపురం బూత్ #${boothInfo.part_no} (${boothInfo.clean_village}) ఓటర్ల ప్రచారం విషయమై సంప్రదిస్తున్నాము.`)}`}
                    target="_blank"
                    rel="noreferrer"
                    className="p-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs"
                    title="WhatsApp Volunteer"
                  >
                    <MessageSquare className="w-3 h-3" />
                  </a>
                  <a
                    href={`tel:${vol.mobile}`}
                    className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs"
                    title="Call Volunteer"
                  >
                    <Phone className="w-3 h-3 text-emerald-400" />
                  </a>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* KRIYA MEMBERS CARDS */}
      <div className="space-y-2.5">
        {filteredMembers.map(m => (
          <div
            key={m.s}
            className={`bg-slate-900 border rounded-2xl p-3.5 space-y-2 transition-all shadow-md ${
              m.k_type === 'exact'
                ? 'border-red-500/50 bg-gradient-to-r from-red-950/25 via-slate-900 to-slate-900'
                : 'border-amber-500/40 bg-gradient-to-r from-amber-950/20 via-slate-900 to-slate-900'
            }`}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-start gap-2.5">
                {/* Photo or Initials */}
                <div className="w-11 h-11 rounded-xl bg-gradient-to-tr from-red-600 to-amber-600 flex items-center justify-center text-white font-bold text-sm overflow-hidden flex-shrink-0 border border-amber-400/40">
                  {m.k_photo ? (
                    <img 
                      src={m.k_photo} 
                      alt={m.n} 
                      className="w-full h-full object-cover" 
                      onError={(e) => { (e.target as HTMLElement).style.display = 'none'; }}
                    />
                  ) : (
                    <span>🚩</span>
                  )}
                </div>

                <div className="space-y-0.5">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="font-black text-white text-sm">{m.n}</span>
                    <span className={`px-1.5 py-0.2 rounded text-[8px] font-black uppercase ${
                      m.k_type === 'exact'
                        ? 'bg-gradient-to-r from-red-600 to-amber-600 text-white'
                        : 'bg-gradient-to-r from-amber-500 to-yellow-500 text-slate-950'
                    }`}>
                      {m.k_type === 'exact' ? '⭐ 100% Exact' : '⚡ Similar'}
                    </span>
                  </div>

                  <div className="text-[11px] text-slate-400">
                    S.No: <strong className="text-amber-400 font-mono">#{m.s}</strong> • H.No: <strong className="text-slate-300 font-mono">{m.hn}</strong>
                  </div>

                  {m.k_id && (
                    <div className="text-[10px] text-amber-300 font-mono">
                      Member ID: #{m.k_id}
                    </div>
                  )}
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-1.5 flex-shrink-0">
                {m.k_m && (
                  <>
                    <a
                      href={`https://wa.me/91${m.k_m}?text=${encodeURIComponent(`నమస్కారం ${m.n} గారు, జనసేన పార్టీ పిఠాపురం బూత్ #${boothInfo.part_no} నుండి సంప్రదిస్తున్నాము.`)}`}
                      target="_blank"
                      rel="noreferrer"
                      className="p-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs flex items-center shadow-md shadow-emerald-950/40"
                      title="WhatsApp Member"
                    >
                      <MessageSquare className="w-3.5 h-3.5" />
                    </a>
                    <a
                      href={`tel:${m.k_m}`}
                      className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs border border-slate-700 flex items-center"
                      title="Call Member"
                    >
                      <Phone className="w-3.5 h-3.5 text-emerald-400" />
                    </a>
                  </>
                )}
              </div>
            </div>

            {/* Volunteer Assigned */}
            {m.v_name && (
              <div className="pt-1.5 border-t border-slate-800/80 flex items-center justify-between text-[10px] text-slate-400">
                <span>Volunteer: <strong className="text-emerald-400">{m.v_name}</strong></span>
                {m.v_mob && <span className="font-mono text-slate-500">{m.v_mob}</span>}
              </div>
            )}
          </div>
        ))}

        {filteredMembers.length === 0 && (
          <div className="py-12 text-center text-slate-500 text-xs">
            No Kriya members found matching "{memberSearch}".
          </div>
        )}
      </div>
    </div>
  );
};
