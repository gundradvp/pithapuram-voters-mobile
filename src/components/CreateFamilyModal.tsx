import React, { useState, useMemo } from 'react';
import { X, Users, Home, Check, Plus, Trash2, Search, Sliders, UserCheck } from 'lucide-react';
import { FamilyGroup, MobileVoter, Influencer, SupportCategory } from '../types';

interface CreateFamilyModalProps {
  initialFamily?: FamilyGroup | null;
  voters: MobileVoter[];
  influencers: Record<string, Influencer>;
  onSaveFamily: (family: FamilyGroup) => void;
  onDeleteFamily?: (familyId: string) => void;
  onClose: () => void;
}

export const CreateFamilyModal: React.FC<CreateFamilyModalProps> = ({
  initialFamily,
  voters,
  influencers,
  onSaveFamily,
  onDeleteFamily,
  onClose
}) => {
  const [name, setName] = useState(initialFamily?.name || '');
  const [houseNumbers, setHouseNumbers] = useState(initialFamily?.houseNumbers?.join(', ') || '');
  const [headName, setHeadName] = useState(initialFamily?.headName || '');
  const [supportPct, setSupportPct] = useState<number>(initialFamily?.supportPct ?? 50);
  const [selectedInfluencerId, setSelectedInfluencerId] = useState(initialFamily?.influencerId || '');
  const [selectedSnos, setSelectedSnos] = useState<number[]>(initialFamily?.memberSnos || []);
  const [notes, setNotes] = useState(initialFamily?.campaignNotes || '');
  const [voterSearch, setVoterSearch] = useState('');

  const influencerList = Object.values(influencers);

  // Filter voters for member selector
  const availableVoters = useMemo(() => {
    const q = voterSearch.toLowerCase().trim();
    if (!q) return voters.slice(0, 50);
    return voters.filter(v => 
      v.n.toLowerCase().includes(q) || 
      v.hn.toLowerCase().includes(q) ||
      v.s.toString().includes(q)
    ).slice(0, 50);
  }, [voters, voterSearch]);

  const toggleSelectSno = (sno: number) => {
    setSelectedSnos(prev => 
      prev.includes(sno) ? prev.filter(s => s !== sno) : [...prev, sno]
    );
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    const chosenInf = influencers[selectedInfluencerId];
    const category: SupportCategory = 
      supportPct === 100 ? 'full_support' :
      supportPct >= 75 ? 'strong_lean' :
      supportPct === 40 ? 'soft_lean' :
      supportPct === 0 ? 'opponent' :
      supportPct <= 25 ? 'doubtful' : 'neutral_swing';

    const famId = initialFamily?.id || `fam_${Date.now()}`;
    const hns = houseNumbers.split(',').map(h => h.trim()).filter(Boolean);

    const payload: FamilyGroup = {
      id: famId,
      name: name.trim(),
      houseNumbers: hns.length > 0 ? hns : ['Unknown'],
      headName: headName.trim(),
      influencerId: chosenInf?.id,
      influencerName: chosenInf?.name,
      influencerMobile: chosenInf?.mobile,
      supportPct,
      supportCategory: category,
      memberSnos: selectedSnos,
      campaignNotes: notes.trim()
    };

    onSaveFamily(payload);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-sm flex items-end sm:items-center justify-center p-3 animate-in fade-in duration-150">
      <div className="bg-slate-900 border border-amber-500/40 rounded-3xl max-w-md w-full p-5 space-y-4 shadow-2xl relative max-h-[90vh] flex flex-col">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-white bg-slate-800 p-1.5 rounded-full"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Modal Header */}
        <div className="border-b border-slate-800 pb-3">
          <div className="flex items-center gap-1.5 text-xs text-amber-400 font-bold uppercase tracking-wider">
            <Home className="w-3.5 h-3.5 text-amber-400" />
            {initialFamily ? 'Edit Family Group' : 'Create & Group New Family'}
          </div>
          <h3 className="text-base font-black text-white mt-0.5">
            {initialFamily ? initialFamily.name : 'Define Household & Leaning'}
          </h3>
          <p className="text-[11px] text-slate-400 mt-0.5">
            Group related electors across houses, assign support % and link a key influencer.
          </p>
        </div>

        {/* Scrollable Form Body */}
        <form onSubmit={handleSave} className="flex-1 overflow-y-auto space-y-3.5 pr-1 text-xs">
          {/* Family Name */}
          <div>
            <label className="text-[10px] text-slate-400 uppercase font-bold block mb-1">
              Family Group Name *
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="e.g. Koppisetti Apparao Family, Sagar Colony Group"
              className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2 text-white font-bold placeholder-slate-600 focus:outline-none focus:border-amber-400 text-xs"
            />
          </div>

          {/* Door Numbers & Family Head */}
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-[10px] text-slate-400 uppercase font-bold block mb-1">
                Door / House Nos
              </label>
              <input
                type="text"
                value={houseNumbers}
                onChange={e => setHouseNumbers(e.target.value)}
                placeholder="1-24, 1-25"
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-1.5 text-white placeholder-slate-600 focus:outline-none focus:border-amber-400 text-xs font-mono"
              />
            </div>
            <div>
              <label className="text-[10px] text-slate-400 uppercase font-bold block mb-1">
                Family Elder / Head Name
              </label>
              <input
                type="text"
                value={headName}
                onChange={e => setHeadName(e.target.value)}
                placeholder="Elder Name"
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-1.5 text-white placeholder-slate-600 focus:outline-none focus:border-amber-400 text-xs"
              />
            </div>
          </div>

          {/* Political Leaning Support Percentage */}
          <div className="bg-slate-950 border border-slate-800 rounded-2xl p-3 space-y-2">
            <div className="flex items-center justify-between text-xs font-bold">
              <span className="text-slate-400 flex items-center gap-1">
                <Sliders className="w-3.5 h-3.5 text-amber-400" /> Family Support Leaning:
              </span>
              <span className={`text-base font-black font-mono ${
                supportPct === 100 ? 'text-red-400' : supportPct >= 75 ? 'text-emerald-400' : supportPct === 40 ? 'text-amber-400' : supportPct === 0 ? 'text-rose-400' : 'text-slate-300'
              }`}>
                {supportPct}% {supportPct === 100 ? '🚩 Full Support' : supportPct >= 75 ? '🟢 Favorable' : supportPct === 40 ? '🟡 40% Positive' : supportPct === 0 ? '🔴 Opponent' : '⚪ Swing'}
              </span>
            </div>

            <div className="grid grid-cols-3 gap-1.5 text-center text-[10px] font-bold">
              <button
                type="button"
                onClick={() => setSupportPct(100)}
                className={`py-1.5 rounded-lg border transition-all ${
                  supportPct === 100 ? 'bg-red-600 text-white border-red-500 font-black' : 'bg-slate-900 text-slate-400 border-slate-800'
                }`}
              >
                100% Full Support
              </button>
              <button
                type="button"
                onClick={() => setSupportPct(75)}
                className={`py-1.5 rounded-lg border transition-all ${
                  supportPct === 75 ? 'bg-emerald-600 text-white border-emerald-500 font-black' : 'bg-slate-900 text-slate-400 border-slate-800'
                }`}
              >
                75% Strong Lean
              </button>
              <button
                type="button"
                onClick={() => setSupportPct(40)}
                className={`py-1.5 rounded-lg border transition-all ${
                  supportPct === 40 ? 'bg-amber-600 text-slate-950 border-amber-500 font-black' : 'bg-slate-900 text-slate-400 border-slate-800'
                }`}
              >
                40% Positive
              </button>
              <button
                type="button"
                onClick={() => setSupportPct(50)}
                className={`py-1.5 rounded-lg border transition-all ${
                  supportPct === 50 ? 'bg-slate-700 text-white border-slate-600 font-black' : 'bg-slate-900 text-slate-400 border-slate-800'
                }`}
              >
                50% Neutral
              </button>
              <button
                type="button"
                onClick={() => setSupportPct(25)}
                className={`py-1.5 rounded-lg border transition-all ${
                  supportPct === 25 ? 'bg-orange-600 text-white border-orange-500 font-black' : 'bg-slate-900 text-slate-400 border-slate-800'
                }`}
              >
                25% Doubtful
              </button>
              <button
                type="button"
                onClick={() => setSupportPct(0)}
                className={`py-1.5 rounded-lg border transition-all ${
                  supportPct === 0 ? 'bg-rose-900 text-rose-300 border-rose-700 font-black' : 'bg-slate-900 text-slate-400 border-slate-800'
                }`}
              >
                0% Opponent
              </button>
            </div>
          </div>

          {/* Assigned Key Influencer */}
          <div>
            <label className="text-[10px] text-slate-400 uppercase font-bold block mb-1">
              Assigned Key Influencer / In-Charge
            </label>
            <select
              value={selectedInfluencerId}
              onChange={e => setSelectedInfluencerId(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white text-xs"
            >
              <option value="">-- No Influencer Assigned --</option>
              {influencerList.map(inf => (
                <option key={inf.id} value={inf.id}>
                  {inf.name} ({inf.role} • {inf.mobile})
                </option>
              ))}
            </select>
          </div>

          {/* Member Electors Selector */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-[10px] text-slate-400 uppercase font-bold">
                Select Family Members ({selectedSnos.length} Selected)
              </label>
              {selectedSnos.length > 0 && (
                <button
                  type="button"
                  onClick={() => setSelectedSnos([])}
                  className="text-red-400 text-[10px] hover:underline"
                >
                  Clear Selection
                </button>
              )}
            </div>

            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
              <input
                type="text"
                value={voterSearch}
                onChange={e => setVoterSearch(e.target.value)}
                placeholder="Search electors to add to this family..."
                className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-8 pr-3 py-1.5 text-white text-xs placeholder-slate-600 focus:outline-none focus:border-amber-400"
              />
            </div>

            <div className="max-h-36 overflow-y-auto space-y-1 bg-slate-950/80 p-2 rounded-xl border border-slate-800 divide-y divide-slate-800/40">
              {availableVoters.map(v => {
                const isChecked = selectedSnos.includes(v.s);
                return (
                  <div
                    key={v.s}
                    onClick={() => toggleSelectSno(v.s)}
                    className={`p-1.5 rounded-lg flex items-center justify-between cursor-pointer transition-colors ${
                      isChecked ? 'bg-amber-950/40 text-white font-bold' : 'text-slate-300 hover:bg-slate-800/50'
                    }`}
                  >
                    <div className="min-w-0 pr-2">
                      <span className="font-mono text-[10px] text-amber-400 mr-1.5">#{v.s}</span>
                      <span className="text-xs">{v.n}</span>
                      <span className="text-[10px] text-slate-400 ml-1.5 font-mono">H.No: {v.hn}</span>
                    </div>
                    <div className="w-4 h-4 rounded border flex items-center justify-center flex-shrink-0 border-slate-700 bg-slate-900">
                      {isChecked && <Check className="w-3 h-3 text-amber-400" />}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Ground Campaign Notes */}
          <div>
            <label className="text-[10px] text-slate-400 uppercase font-bold block mb-1">
              Campaign Notes & Strategy
            </label>
            <textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="e.g. Influenced by elder brother, expects irrigation pump help, pension sanction needed..."
              rows={2}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white text-xs placeholder-slate-600 focus:outline-none focus:border-amber-400"
            />
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2 pt-2 border-t border-slate-800">
            {initialFamily && onDeleteFamily && (
              <button
                type="button"
                onClick={() => {
                  if (confirm(`Delete family group "${initialFamily.name}"?`)) {
                    onDeleteFamily(initialFamily.id);
                    onClose();
                  }
                }}
                className="py-2.5 px-3 bg-red-950/60 hover:bg-red-900 text-red-300 rounded-xl text-xs font-bold border border-red-500/30 flex items-center gap-1"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            )}

            <button
              type="submit"
              className="flex-1 py-2.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black rounded-xl text-xs flex items-center justify-center gap-1.5 shadow-md shadow-amber-950/40"
            >
              <Check className="w-4 h-4" />
              <span>Save Family ({supportPct}%)</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
