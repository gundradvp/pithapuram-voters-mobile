import React, { useState, useMemo } from 'react';
import {
  X,
  Search,
  CheckSquare,
  Square,
  UserCheck,
  Users,
  Plus,
  Phone,
  Check,
  ShieldCheck,
  AlertCircle,
  Filter,
  Trash2,
  ChevronDown
} from 'lucide-react';
import { MobileVoter, Influencer, VoterCampaignProfile, BoothInfo } from '../types';
import { Language } from '../utils/i18n';

interface BulkAssignModalProps {
  isOpen: boolean;
  onClose: () => void;
  voters: MobileVoter[];
  profiles: Record<number, VoterCampaignProfile>;
  influencers: Record<string, Influencer>;
  initialSelectedSnos?: number[];
  initialInfluencerId?: string;
  boothInfo?: BoothInfo;
  onBulkAssignInfluencer: (voterSnos: number[], influencer: Influencer | null) => void;
  onAddNewInfluencer: (influencer: Influencer) => void;
  language?: Language;
}

type AssignmentFilter = 'all' | 'unassigned' | 'assigned_to_current' | 'with_phone';

export const BulkAssignModal: React.FC<BulkAssignModalProps> = ({
  isOpen,
  onClose,
  voters,
  profiles,
  influencers,
  initialSelectedSnos = [],
  initialInfluencerId,
  boothInfo,
  onBulkAssignInfluencer,
  onAddNewInfluencer,
  language = 'te'
}) => {
  const influencerList = useMemo(() => Object.values(influencers), [influencers]);

  // Selected Influencer State
  const [selectedInfluencerId, setSelectedInfluencerId] = useState<string>(
    initialInfluencerId || influencerList[0]?.id || ''
  );
  const [isInfluencerDropdownOpen, setIsInfluencerDropdownOpen] = useState(false);

  // Form for Adding a New Influencer on the Fly
  const [isCreatingNewInf, setIsCreatingNewInf] = useState(false);
  const [newName, setNewName] = useState('');
  const [newMobile, setNewMobile] = useState('');
  const [newRole, setNewRole] = useState('Ward In-Charge');

  // Multi-Selection State for Voters
  const [selectedSnos, setSelectedSnos] = useState<Set<number>>(
    new Set(initialSelectedSnos)
  );

  // Search & Filter State
  const [searchQuery, setSearchQuery] = useState('');
  const [assignmentFilter, setAssignmentFilter] = useState<AssignmentFilter>('all');
  const [genderFilter, setGenderFilter] = useState<'all' | 'M' | 'F'>('all');

  // Currently Selected Influencer Object
  const currentInfluencer = useMemo(
    () => influencerList.find(inf => inf.id === selectedInfluencerId) || influencerList[0] || null,
    [influencerList, selectedInfluencerId]
  );

  // Filter Voters List
  const filteredVoters = useMemo(() => {
    let list = [...voters];
    const q = searchQuery.toLowerCase().trim();

    // 1. Search Query
    if (q) {
      list = list.filter(v => {
        const snoStr = String(v.s || (v as any).sno || '');
        const name = (v.n || (v as any).name_en || (v as any).name_te || '').toLowerCase();
        const rel = (v.r || (v as any).rel_name_en || (v as any).rel_name_te || '').toLowerCase();
        const hn = (v.hn || (v as any).house_no || '').toLowerCase();
        const epic = (v.id || (v as any).epic || '').toLowerCase();
        const sec = (v.sec || '').toLowerCase();

        return (
          snoStr === q ||
          snoStr.includes(q) ||
          name.includes(q) ||
          rel.includes(q) ||
          hn.includes(q) ||
          epic.includes(q) ||
          sec.includes(q)
        );
      });
    }

    // 2. Gender Filter
    if (genderFilter === 'M') {
      list = list.filter(v => v.g === 'M' || (v as any).gender_en === 'Male' || (v as any).gender_te === 'పురుషుడు');
    } else if (genderFilter === 'F') {
      list = list.filter(v => v.g === 'F' || v.g === 'W' || (v as any).gender_en === 'Female' || (v as any).gender_te === 'స్త్రీ');
    }

    // 3. Assignment Status Filter
    if (assignmentFilter === 'unassigned') {
      list = list.filter(v => {
        const sno = v.s ?? (v as any).sno;
        const prof = sno ? profiles[sno] : undefined;
        return !prof?.influencerId;
      });
    } else if (assignmentFilter === 'assigned_to_current' && currentInfluencer) {
      list = list.filter(v => {
        const sno = v.s ?? (v as any).sno;
        const prof = sno ? profiles[sno] : undefined;
        return prof?.influencerId === currentInfluencer.id;
      });
    } else if (assignmentFilter === 'with_phone') {
      list = list.filter(v => {
        const sno = v.s ?? (v as any).sno;
        const prof = sno ? profiles[sno] : undefined;
        const phone = prof?.customPhone || v.k_m || (v as any).phone || (v as any).mobile;
        return Boolean(phone);
      });
    }

    return list;
  }, [voters, searchQuery, genderFilter, assignmentFilter, profiles, currentInfluencer]);

  if (!isOpen) return null;

  // Toggle single voter selection
  const handleToggleVoter = (sno: number) => {
    setSelectedSnos(prev => {
      const next = new Set(prev);
      if (next.has(sno)) {
        next.delete(sno);
      } else {
        next.add(sno);
      }
      return next;
    });
  };

  // Select all currently filtered voters
  const handleSelectAllFiltered = () => {
    setSelectedSnos(prev => {
      const next = new Set(prev);
      filteredVoters.forEach(v => {
        const sno = v.s ?? (v as any).sno;
        if (sno) next.add(sno);
      });
      return next;
    });
  };

  // Unselect all currently filtered voters
  const handleUnselectAllFiltered = () => {
    setSelectedSnos(prev => {
      const next = new Set(prev);
      filteredVoters.forEach(v => {
        const sno = v.s ?? (v as any).sno;
        if (sno) next.delete(sno);
      });
      return next;
    });
  };

  // Check if all filtered voters are selected
  const isAllFilteredSelected =
    filteredVoters.length > 0 &&
    filteredVoters.every(v => selectedSnos.has(v.s ?? (v as any).sno));

  const isSomeFilteredSelected =
    filteredVoters.some(v => selectedSnos.has(v.s ?? (v as any).sno));

  // Handle assigning to selected influencer
  const handleConfirmAssign = () => {
    if (selectedSnos.size === 0 || !currentInfluencer) return;
    const snosArray = Array.from(selectedSnos);
    onBulkAssignInfluencer(snosArray, currentInfluencer);
    onClose();
  };

  // Handle removing assignment from selected voters
  const handleConfirmUnassign = () => {
    if (selectedSnos.size === 0) return;
    const snosArray = Array.from(selectedSnos);
    onBulkAssignInfluencer(snosArray, null);
    onClose();
  };

  // Handle quick creation of an influencer
  const handleCreateNewInfluencer = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim() || !newMobile.trim()) return;

    const newInf: Influencer = {
      id: `inf_${Date.now()}`,
      name: newName.trim(),
      mobile: newMobile.trim(),
      role: newRole.trim()
    };

    onAddNewInfluencer(newInf);
    setSelectedInfluencerId(newInf.id);
    setIsCreatingNewInf(false);
    setNewName('');
    setNewMobile('');
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4 animate-in fade-in duration-150">
      <div className="bg-slate-900 border border-amber-500/40 rounded-3xl max-w-2xl w-full max-h-[92vh] flex flex-col shadow-2xl overflow-hidden relative">
        {/* Top Header */}
        <div className="p-3.5 sm:p-4 bg-slate-950 border-b border-slate-800 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <span className="p-2 bg-amber-500/20 text-amber-400 rounded-xl shrink-0">
              <Users className="w-5 h-5" />
            </span>
            <div className="min-w-0">
              <h2 className="text-sm sm:text-base font-black text-white flex items-center gap-1.5 truncate">
                <span>{language === 'te' ? 'ఓటర్ల బల్క్ కేటాయింపు' : 'Bulk Assign Electors'}</span>
                <span className="text-amber-400 font-mono text-xs">
                  ({voters.length} మంది ఓటర్లు)
                </span>
              </h2>
              <p className="text-[11px] text-slate-400 truncate">
                {language === 'te'
                  ? 'జాబితా నుండి ఓటర్లను ఎంచుకుని ఇన్ఫ్లుయెన్సర్ / ఇన్-ఛార్జ్‌కు కేటాయించండి'
                  : 'Select/unselect electors and assign them to a leader in one click'}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-xl transition-all shrink-0 cursor-pointer"
            title="మూసివేయి (Close)"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Step 1: Target Influencer Picker Banner */}
        <div className="p-3 bg-slate-900/90 border-b border-slate-800">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <div className="flex items-center gap-1.5 text-xs text-slate-300 font-bold">
              <UserCheck className="w-4 h-4 text-amber-400" />
              <span>{language === 'te' ? 'బాధ్యత వహించే నాయకుడు (Target In-Charge):' : 'Assign to In-Charge:'}</span>
            </div>

            <button
              type="button"
              onClick={() => setIsCreatingNewInf(!isCreatingNewInf)}
              className="text-[11px] text-amber-400 hover:text-amber-300 font-bold flex items-center gap-1 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>{language === 'te' ? '+ కొత్త ఇన్ఫ్లుయెన్సర్‌ను చేర్చండి' : '+ Add New In-Charge'}</span>
            </button>
          </div>

          {/* New Influencer Inline Form */}
          {isCreatingNewInf && (
            <form onSubmit={handleCreateNewInfluencer} className="mt-2.5 p-3 rounded-xl bg-slate-950 border border-amber-500/40 space-y-2">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <div>
                  <label className="text-[9.5px] uppercase font-bold text-slate-400 block mb-0.5">పేరు (Name)</label>
                  <input
                    type="text"
                    required
                    value={newName}
                    onChange={e => setNewName(e.target.value)}
                    placeholder="e.g. రావుల సురేష్"
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1 text-xs text-white"
                  />
                </div>
                <div>
                  <label className="text-[9.5px] uppercase font-bold text-slate-400 block mb-0.5">మొబైల్ (Mobile)</label>
                  <input
                    type="tel"
                    required
                    maxLength={10}
                    value={newMobile}
                    onChange={e => setNewMobile(e.target.value.replace(/\D/g, ''))}
                    placeholder="10-digit number"
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1 text-xs text-white font-mono"
                  />
                </div>
                <div>
                  <label className="text-[9.5px] uppercase font-bold text-slate-400 block mb-0.5">పాత్ర (Role)</label>
                  <select
                    value={newRole}
                    onChange={e => setNewRole(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1 text-xs text-white"
                  >
                    <option value="Ward In-Charge">Ward In-Charge</option>
                    <option value="Community / Caste Elder">Community / Caste Elder</option>
                    <option value="Youth Leader">Youth Leader</option>
                    <option value="Booth Volunteer">Booth Volunteer</option>
                    <option value="DWCRA Leader">DWCRA Leader</option>
                  </select>
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setIsCreatingNewInf(false)}
                  className="px-3 py-1 bg-slate-800 text-slate-300 rounded-lg text-xs font-bold"
                >
                  రద్దు (Cancel)
                </button>
                <button
                  type="submit"
                  className="px-3 py-1 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black rounded-lg text-xs flex items-center gap-1 shadow"
                >
                  <Plus className="w-3.5 h-3.5" />
                  చేర్చండి (Add)
                </button>
              </div>
            </form>
          )}

          {/* Influencer Dropdown Selector */}
          {!isCreatingNewInf && (
            <div className="mt-1.5 flex items-center gap-2">
              <div className="relative flex-1">
                <button
                  type="button"
                  onClick={() => setIsInfluencerDropdownOpen(!isInfluencerDropdownOpen)}
                  className="w-full bg-slate-950 hover:bg-slate-850 border border-slate-700 rounded-xl px-3 py-2 text-left flex items-center justify-between text-xs text-white cursor-pointer transition-colors"
                >
                  {currentInfluencer ? (
                    <div className="flex items-center gap-2 truncate">
                      <span className="font-black text-amber-400">{currentInfluencer.name}</span>
                      <span className="text-[10px] px-1.5 py-0.2 bg-slate-800 text-slate-300 rounded border border-slate-700">
                        {currentInfluencer.role}
                      </span>
                      <span className="text-[10px] font-mono text-emerald-400">
                        📱 {currentInfluencer.mobile}
                      </span>
                    </div>
                  ) : (
                    <span className="text-slate-400">ఎవరినీ ఎంచుకోలేదు (Select In-Charge)</span>
                  )}
                  <ChevronDown className="w-4 h-4 text-slate-400 shrink-0" />
                </button>

                {/* Dropdown Menu */}
                {isInfluencerDropdownOpen && (
                  <div className="absolute top-full left-0 right-0 mt-1 bg-slate-950 border border-slate-700 rounded-xl shadow-2xl z-30 max-h-48 overflow-y-auto divide-y divide-slate-800">
                    {influencerList.map(inf => {
                      const isSelected = inf.id === selectedInfluencerId;
                      // Count electors currently assigned
                      let assignedCount = 0;
                      Object.values(profiles).forEach(p => {
                        if (p.influencerId === inf.id) assignedCount++;
                      });

                      return (
                        <div
                          key={inf.id}
                          onClick={() => {
                            setSelectedInfluencerId(inf.id);
                            setIsInfluencerDropdownOpen(false);
                          }}
                          className={`p-2.5 flex items-center justify-between text-xs cursor-pointer transition-colors ${
                            isSelected
                              ? 'bg-amber-950/40 text-amber-300 font-bold'
                              : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                          }`}
                        >
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-bold">{inf.name}</span>
                              <span className="text-[9.5px] px-1 bg-slate-800 text-slate-400 rounded">
                                {inf.role}
                              </span>
                            </div>
                            <span className="text-[10px] text-slate-400 font-mono">
                              📱 {inf.mobile} • కేటాయించినవారు: {assignedCount} మంది
                            </span>
                          </div>
                          {isSelected && <Check className="w-4 h-4 text-amber-400" />}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Step 2: Search, Filters & Bulk Selection Controls */}
        <div className="p-3 bg-slate-900 border-b border-slate-800 space-y-2">
          {/* Search Box */}
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder={
                language === 'te'
                  ? 'ఓటరు పేరు, క్రమ సంఖ్య (#), ఇంటి నెం, వీధి ద్వారా వెతకండి...'
                  : 'Search by Voter Name, S.No (#), House No, Section...'
              }
              className="w-full bg-slate-950 border border-slate-700 rounded-xl pl-9 pr-9 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-400 shadow-inner"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-white rounded-full cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Quick Filter Buttons */}
          <div className="flex items-center justify-between gap-1 flex-wrap text-[11px]">
            {/* Assignment filter pills */}
            <div className="flex items-center gap-1 flex-wrap">
              <button
                type="button"
                onClick={() => setAssignmentFilter('all')}
                className={`px-2 py-0.5 rounded-lg font-bold transition-all cursor-pointer ${
                  assignmentFilter === 'all'
                    ? 'bg-amber-500 text-slate-950 font-black shadow'
                    : 'bg-slate-800 text-slate-300 hover:text-white'
                }`}
              >
                అందరూ ({voters.length})
              </button>
              <button
                type="button"
                onClick={() => setAssignmentFilter('unassigned')}
                className={`px-2 py-0.5 rounded-lg font-bold transition-all cursor-pointer ${
                  assignmentFilter === 'unassigned'
                    ? 'bg-amber-500 text-slate-950 font-black shadow'
                    : 'bg-slate-800 text-slate-300 hover:text-white'
                }`}
              >
                కేటాయించనివారు
              </button>
              <button
                type="button"
                onClick={() => setAssignmentFilter('assigned_to_current')}
                className={`px-2 py-0.5 rounded-lg font-bold transition-all cursor-pointer ${
                  assignmentFilter === 'assigned_to_current'
                    ? 'bg-amber-500 text-slate-950 font-black shadow'
                    : 'bg-slate-800 text-slate-300 hover:text-white'
                }`}
              >
                ఈయనకు ఉన్నవారు
              </button>
              <button
                type="button"
                onClick={() => setAssignmentFilter('with_phone')}
                className={`px-2 py-0.5 rounded-lg font-bold transition-all cursor-pointer ${
                  assignmentFilter === 'with_phone'
                    ? 'bg-emerald-500 text-slate-950 font-black shadow'
                    : 'bg-slate-800 text-slate-300 hover:text-white'
                }`}
              >
                📱 ఫోన్ ఉన్నవారు
              </button>
            </div>

            {/* Gender filter */}
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => setGenderFilter('all')}
                className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                  genderFilter === 'all' ? 'bg-amber-500 text-slate-950 font-black' : 'bg-slate-800 text-slate-400'
                }`}
              >
                అందరూ
              </button>
              <button
                type="button"
                onClick={() => setGenderFilter('M')}
                className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                  genderFilter === 'M' ? 'bg-amber-500 text-slate-950 font-black' : 'bg-slate-800 text-slate-400'
                }`}
              >
                👨 పు
              </button>
              <button
                type="button"
                onClick={() => setGenderFilter('F')}
                className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                  genderFilter === 'F' ? 'bg-amber-500 text-slate-950 font-black' : 'bg-slate-800 text-slate-400'
                }`}
              >
                👩 స్త్రీ
              </button>
            </div>
          </div>

          {/* Select and Unselect Bar (The core user request) */}
          <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between gap-2 flex-wrap bg-slate-950/60 p-2 rounded-xl">
            <div className="flex items-center gap-1.5 flex-wrap">
              {/* Select All Filtered Button */}
              <button
                type="button"
                onClick={handleSelectAllFiltered}
                className="px-2.5 py-1 bg-amber-500/20 hover:bg-amber-500 hover:text-slate-950 text-amber-300 rounded-lg text-xs font-bold border border-amber-500/40 flex items-center gap-1 transition-all cursor-pointer shadow-sm active:scale-95"
                title="ప్రస్తుతం కనిపిస్తున్న ఓటర్లందరినీ ఎంచుకోండి"
              >
                <CheckSquare className="w-3.5 h-3.5" />
                <span>అందరినీ ఎంచుకోండి (Select All)</span>
              </button>

              {/* Unselect All Filtered Button */}
              <button
                type="button"
                onClick={handleUnselectAllFiltered}
                className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-lg text-xs font-bold border border-slate-700 flex items-center gap-1 transition-all cursor-pointer shadow-sm active:scale-95"
                title="ప్రస్తుతం కనిపిస్తున్న ఓటర్ల ఎంపికను తీసివేయండి"
              >
                <Square className="w-3.5 h-3.5" />
                <span>ఎంపిక తీసివేయండి (Unselect All)</span>
              </button>

              {/* Clear Entire Selection */}
              {selectedSnos.size > 0 && (
                <button
                  type="button"
                  onClick={() => setSelectedSnos(new Set())}
                  className="px-2 py-1 bg-red-950/60 hover:bg-red-900 text-red-300 rounded-lg text-[11px] font-bold border border-red-500/30 flex items-center gap-1 transition-all cursor-pointer"
                >
                  <Trash2 className="w-3 h-3" />
                  <span>మొత్తం క్లియర్ ({selectedSnos.size})</span>
                </button>
              )}
            </div>

            {/* Counter Badge */}
            <div className="flex items-center gap-1.5 font-mono text-xs">
              <span className="text-slate-400 font-sans text-[11px]">ఎంచుకున్నవారు:</span>
              <span className={`px-2 py-0.5 rounded-full font-black ${
                selectedSnos.size > 0
                  ? 'bg-amber-500 text-slate-950 shadow-md ring-1 ring-amber-400'
                  : 'bg-slate-800 text-slate-400'
              }`}>
                {selectedSnos.size} మంది
              </span>
            </div>
          </div>
        </div>

        {/* Step 3: Voter List with Checkboxes (Select & Unselect from Bulk Assign List) */}
        <div className="flex-1 overflow-y-auto divide-y divide-slate-800/60 p-2 sm:p-3 space-y-1">
          {filteredVoters.map((v, idx) => {
            const voterSno = v.s ?? (v as any).sno;
            const isSelected = selectedSnos.has(voterSno);
            const prof = voterSno ? profiles[voterSno] || {} : {};
            const phone = prof.customPhone || v.k_m || (v as any).phone || (v as any).mobile;
            const voterName =
              v.n ||
              ((v as any).name_en && (v as any).name_te
                ? `${(v as any).name_en} (${(v as any).name_te})`
                : (v as any).name_te || (v as any).name_en || '');
            const voterRel =
              v.r ||
              ((v as any).rel_name_en && (v as any).rel_name_te
                ? `${(v as any).rel_name_en} (${(v as any).rel_name_te})`
                : (v as any).rel_name_te || (v as any).rel_name_en || '');
            const isMale =
              v.g === 'M' || (v as any).gender_en === 'Male' || (v as any).gender_te === 'పురుషుడు';
            const voterHn = v.hn || (v as any).house_no || '';
            const assignedInf = prof.influencerId ? influencers[prof.influencerId] : null;

            return (
              <div
                key={voterSno || idx}
                onClick={() => handleToggleVoter(voterSno)}
                className={`p-2.5 rounded-xl border transition-all cursor-pointer flex items-center justify-between gap-2.5 select-none ${
                  isSelected
                    ? 'bg-amber-950/40 border-amber-500/60 text-white shadow-md'
                    : 'bg-slate-950/40 border-slate-800/80 hover:bg-slate-850 text-slate-300'
                }`}
              >
                {/* Checkbox & Serial */}
                <div className="flex items-center gap-2.5 min-w-0">
                  <button
                    type="button"
                    onClick={e => {
                      e.stopPropagation();
                      handleToggleVoter(voterSno);
                    }}
                    className={`w-5 h-5 rounded-lg flex items-center justify-center shrink-0 transition-all ${
                      isSelected
                        ? 'bg-amber-500 text-slate-950 font-black shadow-sm ring-1 ring-amber-400'
                        : 'border border-slate-600 bg-slate-900 hover:border-amber-400'
                    }`}
                  >
                    {isSelected && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                  </button>

                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="font-mono font-black text-amber-400 text-xs shrink-0">
                        #{voterSno}
                      </span>
                      <span className="font-bold text-white text-xs truncate">
                        {voterName}
                      </span>
                      <span className={`text-[8.5px] px-1 rounded font-bold shrink-0 ${
                        isMale ? 'bg-blue-950 text-blue-300 border border-blue-800' : 'bg-rose-950 text-rose-300 border border-rose-800'
                      }`}>
                        {isMale ? 'పు' : 'స్త్రీ'}
                      </span>
                      {phone && (
                        <span className="text-[9.5px] font-mono text-emerald-400 flex items-center gap-0.5 shrink-0">
                          <Phone className="w-2.5 h-2.5" /> {phone}
                        </span>
                      )}
                    </div>

                    <div className="text-[10px] text-slate-400 mt-0.5 flex items-center gap-2 truncate">
                      <span>సంబంధీకుడు: <strong className="text-slate-300">{voterRel || '—'}</strong></span>
                      <span>•</span>
                      <span>ఇంటి నెం: <strong className="text-slate-300 font-mono">{voterHn || '—'}</strong></span>
                    </div>

                    {/* Assigned Leader Tag */}
                    <div className="mt-1 flex items-center gap-1">
                      {assignedInf ? (
                        <span className={`text-[9px] px-1.5 py-0.2 rounded font-bold flex items-center gap-1 ${
                          assignedInf.id === currentInfluencer?.id
                            ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                            : 'bg-slate-800 text-slate-300 border border-slate-700'
                        }`}>
                          <UserCheck className="w-2.5 h-2.5 text-amber-400" />
                          <span>ఇంచార్జ్: {assignedInf.name}</span>
                        </span>
                      ) : (
                        <span className="text-[9px] text-slate-500">
                          ⚪ ఎవరికీ కేటాయించలేదు
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Right Selection Tag */}
                <div className="shrink-0">
                  {isSelected ? (
                    <span className="text-[10px] font-bold text-amber-400 bg-amber-500/20 px-2 py-0.5 rounded-full border border-amber-500/40 flex items-center gap-1">
                      <Check className="w-3 h-3" /> ఎంపికైంది
                    </span>
                  ) : (
                    <span className="text-[10px] text-slate-500 hover:text-slate-300">
                      ఎంచుకోండి
                    </span>
                  )}
                </div>
              </div>
            );
          })}

          {filteredVoters.length === 0 && (
            <div className="py-12 text-center text-slate-500 text-xs space-y-1">
              <p className="font-bold text-slate-300">ఓటర్లు ఎవరూ కనుగొనబడలేదు</p>
              <p>శోధన పదాలు లేదా ఫిల్టర్‌లను మార్చండి.</p>
            </div>
          )}
        </div>

        {/* Step 4: Footer Action Bar */}
        <div className="p-3 sm:p-4 bg-slate-950 border-t border-slate-800 flex items-center justify-between gap-2 flex-wrap">
          <div className="text-xs text-slate-300 font-bold flex items-center gap-1">
            <span>ఎంపిక:</span>
            <span className="font-mono text-amber-400 font-black text-sm">{selectedSnos.size}</span>
            <span className="text-slate-400 font-normal">/ {voters.length} మంది</span>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {/* Unassign button if any selected */}
            {selectedSnos.size > 0 && (
              <button
                type="button"
                onClick={handleConfirmUnassign}
                className="px-3 py-2 bg-slate-800 hover:bg-red-900 text-red-300 hover:text-white rounded-xl text-xs font-bold transition-all border border-slate-700 cursor-pointer"
                title="ఎంపిక చేసిన ఓటర్ల నుండి ప్రస్తుత ఇంచార్జ్ కేటాయింపును తీసివేయండి"
              >
                కేటాయింపు తొలగించు ({selectedSnos.size})
              </button>
            )}

            {/* Confirm Bulk Assign */}
            <button
              type="button"
              disabled={selectedSnos.size === 0 || !currentInfluencer}
              onClick={handleConfirmAssign}
              className={`px-4 py-2 font-black rounded-xl text-xs flex items-center gap-1.5 shadow-lg transition-all cursor-pointer ${
                selectedSnos.size > 0 && currentInfluencer
                  ? 'bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 shadow-amber-950/40 hover:scale-105 active:scale-95'
                  : 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700'
              }`}
            >
              <Check className="w-4 h-4" />
              <span>
                {currentInfluencer
                  ? `${selectedSnos.size} మందిని ${currentInfluencer.name} కు కేటాయించండి`
                  : 'ఇన్ఫ్లుయెన్సర్‌ను ఎంచుకోండి'}
              </span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
