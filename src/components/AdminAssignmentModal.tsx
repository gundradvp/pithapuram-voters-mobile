import React, { useState, useEffect, useMemo } from 'react';
import { 
  X, 
  UserPlus, 
  Send, 
  Trash2, 
  Edit3, 
  Check, 
  Phone, 
  Building2, 
  Landmark, 
  ShieldCheck, 
  Share2, 
  ExternalLink,
  Users,
  Copy,
  CheckCircle2,
  Trees,
  MapPin,
  RefreshCw,
  Search,
  CheckSquare,
  Square,
  ChevronDown,
  ChevronUp,
  Clock,
  AlertTriangle
} from 'lucide-react';
import { 
  VolunteerAssignment, 
  getAssignments, 
  saveAssignment, 
  deleteAssignment, 
  generateAssignmentWhatsAppMessage, 
  getWhatsAppShareUrl, 
  cleanPhoneNumber,
  fetchFreshAssignments,
  isAssignmentExpired,
  getRemainingTime,
  extendAssignmentTime
} from '../utils/auth';
import { BoothIndexItem, LocalElectionUnit } from '../types';
import { Language } from '../utils/i18n';

interface AdminAssignmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  boothsIndex: BoothIndexItem[];
  localUnits: LocalElectionUnit[];
  language: Language;
}

export const AdminAssignmentModal: React.FC<AdminAssignmentModalProps> = ({
  isOpen,
  onClose,
  boothsIndex,
  localUnits,
  language
}) => {
  const [assignments, setAssignments] = useState<VolunteerAssignment[]>(() => getAssignments());
  const [isAddingNew, setIsAddingNew] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isBoothSelectorOpen, setIsBoothSelectorOpen] = useState(false);
  const [boothFilterQuery, setBoothFilterQuery] = useState('');

  // Form State
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [assemblyBoothsInput, setAssemblyBoothsInput] = useState('');
  const [selectedWards, setSelectedWards] = useState<string[]>([]);
  const [notes, setNotes] = useState('');
  const [expiryMinutes, setExpiryMinutes] = useState<number>(60);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Sync latest assignments on mount
  useEffect(() => {
    fetchFreshAssignments().then(fresh => {
      if (fresh && fresh.length > 0) {
        setAssignments(fresh);
      }
    }).catch(() => {});
  }, []);

  const handleManualSync = async () => {
    setIsSyncing(true);
    try {
      const fresh = await fetchFreshAssignments();
      if (fresh && fresh.length > 0) {
        setAssignments(fresh);
      }
    } finally {
      setIsSyncing(false);
    }
  };

  if (!isOpen) return null;

  // Assembly Booth Labels Dictionary
  const assemblyLabels: Record<number, string> = {};
  boothsIndex.forEach(b => {
    if (typeof b.part_no === 'number') {
      assemblyLabels[b.part_no] = b.clean_village;
    }
  });

  // Local Wards Dictionary
  const wardLabels: Record<string, string> = {};
  localUnits.forEach(u => {
    wardLabels[u.id] = u.clean_village || u.local_body;
  });

  const getUnitBadge = (w: string) => {
    switch (w) {
      case 'ward_14':
        return { label: '🏛️ పిఠాపురం వార్డు 14 (1,256)', cls: 'bg-blue-950/60 border-blue-500/40 text-blue-300' };
      case 'gollaprolu_ward_11':
        return { label: '🏡 గొల్లప్రోలు వార్డు 11 (991)', cls: 'bg-emerald-950/60 border-emerald-500/40 text-emerald-300' };
      case 'mptc_durgada_1':
        return { label: '🌾 దుర్గడ MPTC 1 (2,650)', cls: 'bg-teal-950/60 border-teal-500/40 text-teal-300' };
      case 'mptc_durgada_1_b45':
        return { label: '🌾 దుర్గడ #45 (1,060 - ఇంటి కాసుల స్కూల్)', cls: 'bg-teal-950/80 border-teal-400 text-teal-200' };
      case 'mptc_durgada_1_b46':
        return { label: '🌾 దుర్గడ #46 (1,060 - వేగులమ్మ గుడి)', cls: 'bg-teal-950/80 border-teal-400 text-teal-200' };
      case 'mptc_durgada_1_b47':
        return { label: '🌾 దుర్గడ #47 (530 - EBC కాలనీ)', cls: 'bg-teal-950/80 border-teal-400 text-teal-200' };
      case 'mptc_durgada_3':
        return { label: '🌾 దుర్గడ MPTC 3 (1,874)', cls: 'bg-sky-950/60 border-sky-500/40 text-sky-300' };
      case 'gp_durgada':
        return { label: '🌾 దుర్గడ సమగ్ర పంచాయతీ (4,524)', cls: 'bg-amber-950/60 border-amber-500/40 text-amber-300' };
      case 'gp_vannepudi':
        return { label: '🌴 వన్నెపూడి పంచాయతీ (3,201)', cls: 'bg-purple-950/60 border-purple-500/40 text-purple-300' };
      case 'mptc_chebrolu_4':
        return { label: '🌾 చేబ్రోలు MPTC 4 (2,979)', cls: 'bg-indigo-950/60 border-indigo-500/40 text-indigo-300' };
      case 'mptc_tatiparthy_2':
        return { label: '🌾 తాటిపర్తి MPTC 2 (3,501)', cls: 'bg-rose-950/60 border-rose-500/40 text-rose-300' };
      default:
        return { label: `📍 ${wardLabels[w] || w}`, cls: 'bg-slate-800 border-slate-700 text-slate-300' };
    }
  };

  const resetForm = () => {
    setName('');
    setPhone('');
    setAssemblyBoothsInput('');
    setSelectedWards([]);
    setNotes('');
    setExpiryMinutes(60);
    setEditingId(null);
    setIsAddingNew(false);
  };

  const handleEdit = (a: VolunteerAssignment) => {
    setEditingId(a.id);
    setName(a.name);
    setPhone(a.phone);
    setAssemblyBoothsInput(a.assemblyBooths.join(', '));
    setSelectedWards(a.municipalWards);
    setNotes(a.notes || '');
    setExpiryMinutes(a.expiryMinutes !== undefined ? a.expiryMinutes : 60);
    setIsAddingNew(true);
  };

  const handleExtend = (id: string, mins: number) => {
    extendAssignmentTime(id, mins);
    setAssignments(getAssignments());
  };

  const handleMakeUnlimited = (id: string) => {
    const current = getAssignments();
    const target = current.find(a => a.id === id);
    if (target) {
      target.expiryMinutes = 0;
      target.expiresAt = undefined;
      saveAssignment(target);
      setAssignments(getAssignments());
    }
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanPhone = cleanPhoneNumber(phone);
    if (!cleanPhone || cleanPhone.length < 10) {
      alert(language === 'te' ? 'సరైన 10 అంకెల మొబైల్ నంబర్ ఇవ్వండి' : 'Enter a valid 10-digit phone number');
      return;
    }
    if (!name.trim()) {
      alert(language === 'te' ? 'దయచేసి వాలంటీర్ పేరు నమోదు చేయండి' : 'Enter volunteer name');
      return;
    }

    // Parse assembly booths
    const booths = assemblyBoothsInput
      .split(/[, ]+/)
      .map(s => parseInt(s.trim(), 10))
      .filter(n => !isNaN(n) && n > 0);

    const assignment: VolunteerAssignment = {
      id: editingId || `assign_${cleanPhone}_${Date.now()}`,
      phone: cleanPhone,
      name: name.trim(),
      assemblyBooths: booths,
      municipalWards: selectedWards,
      notes: notes.trim(),
      assignedAt: new Date().toISOString(),
      expiryMinutes: expiryMinutes,
      expiresAt: expiryMinutes > 0 ? Date.now() + expiryMinutes * 60 * 1000 : undefined
    };

    saveAssignment(assignment);
    const updated = getAssignments();
    setAssignments(updated);
    resetForm();
  };

  const handleDelete = (id: string) => {
    if (confirm(language === 'te' ? 'ఈ కేటాయింపును ఖచ్చితంగా తొలగించాలనుకుంటున్నారా?' : 'Delete this assignment?')) {
      deleteAssignment(id);
      setAssignments(getAssignments());
    }
  };

  const handleSendWhatsApp = (a: VolunteerAssignment) => {
    const text = generateAssignmentWhatsAppMessage(a, assemblyLabels, wardLabels);
    const url = getWhatsAppShareUrl(a.phone, text);
    window.open(url, '_blank');
  };

  const handleCopyMessage = (a: VolunteerAssignment) => {
    const text = generateAssignmentWhatsAppMessage(a, assemblyLabels, wardLabels);
    navigator.clipboard.writeText(text);
    setCopiedId(a.id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const toggleWardSelection = (wardId: string) => {
    setSelectedWards(prev => 
      prev.includes(wardId) ? prev.filter(w => w !== wardId) : [...prev, wardId]
    );
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-end sm:items-center justify-center p-3 animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-red-500/40 rounded-3xl max-w-lg w-full p-4 sm:p-5 space-y-4 shadow-2xl relative max-h-[92vh] flex flex-col">
        {/* Header */}
        <div className="flex items-start justify-between border-b border-slate-800 pb-3 flex-shrink-0">
          <div>
            <div className="flex items-center gap-1.5 text-xs text-red-400 font-bold uppercase tracking-wider">
              <ShieldCheck className="w-4 h-4 text-red-400" />
              {language === 'te' ? 'అడ్మిన్ పోర్టల్' : 'Admin Hub'}
            </div>
            <h2 className="text-base sm:text-lg font-black text-white mt-0.5">
              {language === 'te' ? 'వాలంటీర్లకు బూత్‌ల కేటాయింపు & వాట్సాప్ సందేశాలు' : 'Volunteer Assignments & WhatsApp Messaging'}
            </h2>
            <p className="text-[11px] text-slate-400 mt-0.5">
              {language === 'te'
                ? 'ఎలక్షన్ ఇంచార్జ్ మొబైల్ నంబర్ మరియు కేటాయించిన అసెంబ్లీ బూతులు / మున్సిపల్ వార్డులను నిర్వహించండి.'
                : 'Assign assembly booths or municipal wards to incharge phone numbers and message them on WhatsApp.'}
            </p>
          </div>
          <div className="flex items-center gap-1.5 flex-shrink-0">
            <button
              type="button"
              onClick={handleManualSync}
              disabled={isSyncing}
              className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-amber-300 rounded-xl text-[11px] font-bold border border-slate-700 flex items-center gap-1.5 transition-all cursor-pointer shadow-sm active:scale-95"
              title="సర్వర్ & క్లౌడ్ నుండి తాజా కేటాయింపులను సమకాలీకరించండి"
            >
              <RefreshCw className={`w-3.5 h-3.5 text-amber-400 ${isSyncing ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">{isSyncing ? 'సింక్...' : 'సమకాలీకరణ (Sync)'}</span>
            </button>
            <button
              onClick={onClose}
              className="text-slate-400 hover:text-white bg-slate-800 p-1.5 rounded-full"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Content Body (Scrollable) */}
        <div className="flex-1 overflow-y-auto space-y-4 pr-1">
          {/* Add / Edit Form Modal Trigger */}
          {!isAddingNew ? (
            <button
              onClick={() => {
                resetForm();
                setIsAddingNew(true);
              }}
              className="w-full py-2.5 bg-gradient-to-r from-red-600 to-amber-600 hover:from-red-500 hover:to-amber-500 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-2 shadow-md shadow-red-950/40 transition-all active:scale-98"
            >
              <UserPlus className="w-4 h-4" />
              <span>{language === 'te' ? '+ కొత్త వాలంటీర్ కేటాయింపు జోడించండి' : '+ Add New Assignment'}</span>
            </button>
          ) : (
            /* CREATE / EDIT FORM */
            <form onSubmit={handleSave} className="p-3.5 rounded-2xl bg-slate-950/90 border border-amber-500/30 space-y-3">
              <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                <span className="text-xs font-black text-amber-400">
                  {editingId ? (language === 'te' ? 'కేటాయింపు సవరణ' : 'Edit Assignment') : (language === 'te' ? 'కొత్త బాధ్యత కేటాయింపు' : 'New Assignment')}
                </span>
                <button
                  type="button"
                  onClick={resetForm}
                  className="text-[11px] text-slate-400 hover:text-white"
                >
                  {language === 'te' ? 'రద్దు' : 'Cancel'}
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {/* Volunteer Name */}
                <div>
                  <label className="block text-[10px] font-bold text-slate-300 mb-1">
                    {language === 'te' ? 'వాలంటీర్ / ఇంచార్జ్ పేరు:' : 'Incharge Name:'}
                  </label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. దుర్గా ప్రసాద్"
                    className="w-full px-2.5 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-xs text-white focus:outline-none focus:border-amber-400"
                  />
                </div>

                {/* Phone Number */}
                <div>
                  <label className="block text-[10px] font-bold text-slate-300 mb-1">
                    {language === 'te' ? 'మొబైల్ నంబర్ (10 అంకెలు):' : 'Mobile Number (10 Digits):'}
                  </label>
                  <input
                    type="tel"
                    required
                    maxLength={10}
                    value={phone}
                    onChange={(e) => setPhone(e.target.value.replace(/\D/g, ''))}
                    placeholder="e.g. 9000273028"
                    className="w-full px-2.5 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-xs font-mono text-white focus:outline-none focus:border-amber-400"
                  />
                </div>
              </div>

              {/* Assembly Booths Multi-Input & Selector */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-[10px] font-bold text-slate-300">
                    {language === 'te' ? 'అసెంబ్లీ బూతులు (Assembly Booths):' : 'Assembly Booths:'}
                  </label>
                  <button
                    type="button"
                    onClick={() => setIsBoothSelectorOpen(!isBoothSelectorOpen)}
                    className="text-[10px] text-amber-400 hover:underline flex items-center gap-0.5 font-bold cursor-pointer"
                  >
                    <span>{isBoothSelectorOpen ? 'లిస్ట్ దాచు' : '📋 బూత్‌ల లిస్ట్ / ఎంపిక'}</span>
                    {isBoothSelectorOpen ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                  </button>
                </div>
                <input
                  type="text"
                  value={assemblyBoothsInput}
                  onChange={(e) => setAssemblyBoothsInput(e.target.value)}
                  placeholder="e.g. 11, 12, 13"
                  className="w-full px-2.5 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-xs font-mono text-white focus:outline-none focus:border-amber-400"
                />

                {/* Quick action buttons: Select All / Unselect All */}
                <div className="flex items-center justify-between gap-1 mt-1.5 flex-wrap">
                  <div className="flex items-center gap-1 flex-wrap">
                    <button
                      type="button"
                      onClick={() => {
                        const allNums = boothsIndex.map(b => Number(b.part_no)).filter(n => !isNaN(n) && n > 0);
                        const numsToUse = allNums.length > 0 ? allNums : Array.from({ length: 290 }, (_, i) => i + 1);
                        setAssemblyBoothsInput(numsToUse.join(', '));
                      }}
                      className="px-2 py-0.5 bg-amber-500/20 hover:bg-amber-500 hover:text-slate-950 text-amber-300 rounded text-[9.5px] font-bold border border-amber-500/30 transition-all flex items-center gap-1 cursor-pointer"
                    >
                      <CheckSquare className="w-3 h-3" />
                      <span>అన్నీ ఎంచుకోండి (Select All)</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setAssemblyBoothsInput('')}
                      className="px-2 py-0.5 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded text-[9.5px] font-bold border border-slate-700 transition-all flex items-center gap-1 cursor-pointer"
                    >
                      <Square className="w-3 h-3" />
                      <span>ఎంపిక తీసివేయండి (Unselect All)</span>
                    </button>
                  </div>
                  <span className="text-[9.5px] text-amber-400 font-mono font-bold">
                    {assemblyBoothsInput.split(/[, ]+/).filter(Boolean).length} బూతులు ఎంపికయ్యాయి
                  </span>
                </div>

                {/* Expandable Booth Selector Grid */}
                {isBoothSelectorOpen && (
                  <div className="mt-2 p-2.5 bg-slate-950 rounded-xl border border-slate-800 space-y-2 max-h-52 overflow-y-auto">
                    {/* Search Filter */}
                    <div className="relative">
                      <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input
                        type="text"
                        value={boothFilterQuery}
                        onChange={e => setBoothFilterQuery(e.target.value)}
                        placeholder="బూత్ నెం లేదా గ్రామం ద్వారా వెతకండి..."
                        className="w-full bg-slate-900 border border-slate-700 rounded-lg pl-8 pr-2 py-1 text-[11px] text-white"
                      />
                    </div>

                    {/* Range quick buttons */}
                    <div className="flex flex-wrap gap-1 text-[9px]">
                      <span className="text-slate-500 self-center">శ్రేణి:</span>
                      {[
                        { label: '1-50', min: 1, max: 50 },
                        { label: '51-100', min: 51, max: 100 },
                        { label: '101-150', min: 101, max: 150 },
                        { label: '151-200', min: 151, max: 200 },
                        { label: '201-250', min: 201, max: 250 },
                        { label: '251-290', min: 251, max: 290 },
                      ].map(r => (
                        <button
                          key={r.label}
                          type="button"
                          onClick={() => {
                            const current = new Set(assemblyBoothsInput.split(/[, ]+/).map(Number).filter(Boolean));
                            for (let i = r.min; i <= r.max; i++) current.add(i);
                            setAssemblyBoothsInput(Array.from(current).sort((a, b) => a - b).join(', '));
                          }}
                          className="px-1.5 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 font-mono cursor-pointer"
                        >
                          +{r.label}
                        </button>
                      ))}
                    </div>

                    {/* Booths Badges Grid */}
                    <div className="flex flex-wrap gap-1">
                      {(boothsIndex.length > 0 ? boothsIndex : Array.from({ length: 290 }, (_, i) => ({ part_no: i + 1, clean_village: '' })))
                        .filter(b => {
                          if (!boothFilterQuery.trim()) return true;
                          const q = boothFilterQuery.toLowerCase();
                          return String(b.part_no).includes(q) || (b.clean_village && b.clean_village.toLowerCase().includes(q));
                        })
                        .map(b => {
                          const bNum = Number(b.part_no);
                          const currentSet = new Set(assemblyBoothsInput.split(/[, ]+/).map(Number).filter(Boolean));
                          const isSel = currentSet.has(bNum);
                          return (
                            <button
                              key={bNum}
                              type="button"
                              onClick={() => {
                                const next = new Set(currentSet);
                                if (isSel) next.delete(bNum);
                                else next.add(bNum);
                                setAssemblyBoothsInput(Array.from(next).sort((a, b) => a - b).join(', '));
                              }}
                              className={`px-1.5 py-0.5 rounded text-[10px] font-mono font-bold transition-all cursor-pointer ${
                                isSel
                                  ? 'bg-amber-500 text-slate-950 font-black ring-1 ring-amber-400'
                                  : 'bg-slate-900 border border-slate-700 text-slate-400 hover:text-white'
                              }`}
                              title={b.clean_village || `Booth #${bNum}`}
                            >
                              #{bNum}
                            </button>
                          );
                        })}
                    </div>
                  </div>
                )}
              </div>

              {/* Municipality / Local Wards Picker */}
              <div>
                <div className="flex items-center justify-between mb-1.5 flex-wrap gap-1">
                  <label className="block text-[10px] font-bold text-slate-300">
                    {language === 'te' ? 'స్థానిక వార్డులు / పంచాయతీలు (ఎంచుకోండి):' : 'Local Wards / Panchayats (Select):'}
                  </label>
                  <div className="flex items-center gap-1 flex-wrap">
                    <button
                      type="button"
                      onClick={() => {
                        const allW = ['ward_14', 'gollaprolu_ward_11', 'mptc_durgada_1', 'mptc_durgada_3', 'gp_durgada', 'gp_vannepudi'];
                        setSelectedWards(allW);
                      }}
                      className="px-2 py-0.5 bg-amber-500/20 hover:bg-amber-500 hover:text-slate-950 text-amber-300 rounded text-[9.5px] font-bold border border-amber-500/30 transition-colors cursor-pointer"
                    >
                      అన్నీ (Select All)
                    </button>
                    <button
                      type="button"
                      onClick={() => setSelectedWards([])}
                      className="px-1.5 py-0.5 bg-slate-800 text-slate-400 hover:text-white rounded text-[9.5px] cursor-pointer"
                    >
                      తీసివేయండి (Unselect)
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedWards(prev => Array.from(new Set([...prev, 'mptc_durgada_1', 'mptc_durgada_3'])));
                      }}
                      className="px-2 py-0.5 bg-teal-500/20 hover:bg-teal-500 hover:text-slate-950 text-teal-300 rounded text-[9.5px] font-bold border border-teal-500/30 transition-colors cursor-pointer"
                      title="దుర్గడ 2 MPTCలు (MPTC 1 & 3) ఒకేసారి ఎంచుకోండి"
                    >
                      + దుర్గడ 2 MPTCలు
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedWards(prev => Array.from(new Set([...prev, 'gp_durgada', 'gp_vannepudi'])));
                      }}
                      className="px-2 py-0.5 bg-amber-500/20 hover:bg-amber-500 hover:text-slate-950 text-amber-300 rounded text-[9.5px] font-bold border border-amber-500/30 transition-colors cursor-pointer"
                      title="దుర్గడ & వన్నెపూడి GPలు రెండూ ఒకేసారి ఎంచుకోండి"
                    >
                      + దుర్గడ & వన్నెపూడి GP
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                  {/* Pithapuram Ward 14 */}
                  <button
                    type="button"
                    onClick={() => toggleWardSelection('ward_14')}
                    className={`p-2 rounded-xl border text-left flex items-center justify-between text-xs transition-all ${
                      selectedWards.includes('ward_14')
                        ? 'bg-blue-950/80 border-blue-400 text-blue-200 shadow-sm'
                        : 'bg-slate-900 border-slate-800 text-slate-400 hover:border-slate-700'
                    }`}
                  >
                    <div>
                      <div className="font-bold flex items-center gap-1">
                        <Building2 className="w-3.5 h-3.5 text-blue-400" />
                        <span>పిఠాపురం వార్డు 14</span>
                      </div>
                      <span className="text-[10px] text-slate-400">1,256 ఓటర్లు (పల్లపు వీధి...)</span>
                    </div>
                    {selectedWards.includes('ward_14') && <Check className="w-3.5 h-3.5 text-blue-400" />}
                  </button>

                  {/* Gollaprolu Ward 11 */}
                  <button
                    type="button"
                    onClick={() => toggleWardSelection('gollaprolu_ward_11')}
                    className={`p-2 rounded-xl border text-left flex items-center justify-between text-xs transition-all ${
                      selectedWards.includes('gollaprolu_ward_11')
                        ? 'bg-emerald-950/80 border-emerald-400 text-emerald-200 shadow-sm'
                        : 'bg-slate-900 border-slate-800 text-slate-400 hover:border-slate-700'
                    }`}
                  >
                    <div>
                      <div className="font-bold flex items-center gap-1">
                        <Landmark className="w-3.5 h-3.5 text-emerald-400" />
                        <span>గొల్లప్రోలు వార్డు 11</span>
                      </div>
                      <span className="text-[10px] text-slate-400">991 ఓటర్లు (రాయవరం రోడ్...)</span>
                    </div>
                    {selectedWards.includes('gollaprolu_ward_11') && <Check className="w-3.5 h-3.5 text-emerald-400" />}
                  </button>

                  {/* Durgada MPTC 1 */}
                  <button
                    type="button"
                    onClick={() => toggleWardSelection('mptc_durgada_1')}
                    className={`p-2 rounded-xl border text-left flex items-center justify-between text-xs transition-all ${
                      selectedWards.includes('mptc_durgada_1')
                        ? 'bg-teal-950/80 border-teal-400 text-teal-200 shadow-sm'
                        : 'bg-slate-900 border-slate-800 text-slate-400 hover:border-slate-700'
                    }`}
                  >
                    <div>
                      <div className="font-bold flex items-center gap-1">
                        <MapPin className="w-3.5 h-3.5 text-teal-400" />
                        <span>దుర్గడ MPTC 1</span>
                      </div>
                      <span className="text-[10px] text-slate-400">2,650 ఓటర్లు (వార్డులు 1-5)</span>
                    </div>
                    {selectedWards.includes('mptc_durgada_1') && <Check className="w-3.5 h-3.5 text-teal-400" />}
                  </button>

                  {/* Durgada MPTC 3 */}
                  <button
                    type="button"
                    onClick={() => toggleWardSelection('mptc_durgada_3')}
                    className={`p-2 rounded-xl border text-left flex items-center justify-between text-xs transition-all ${
                      selectedWards.includes('mptc_durgada_3')
                        ? 'bg-sky-950/80 border-sky-400 text-sky-200 shadow-sm'
                        : 'bg-slate-900 border-slate-800 text-slate-400 hover:border-slate-700'
                    }`}
                  >
                    <div>
                      <div className="font-bold flex items-center gap-1">
                        <MapPin className="w-3.5 h-3.5 text-sky-400" />
                        <span>దుర్గడ MPTC 3</span>
                      </div>
                      <span className="text-[10px] text-slate-400">1,874 ఓటర్లు (డోర్ నెం. 4-9)</span>
                    </div>
                    {selectedWards.includes('mptc_durgada_3') && <Check className="w-3.5 h-3.5 text-sky-400" />}
                  </button>

                  {/* Durgada Entire Gram Panchayat */}
                  <button
                    type="button"
                    onClick={() => toggleWardSelection('gp_durgada')}
                    className={`p-2 rounded-xl border text-left flex items-center justify-between text-xs transition-all ${
                      selectedWards.includes('gp_durgada')
                        ? 'bg-amber-950/80 border-amber-400 text-amber-200 shadow-sm'
                        : 'bg-slate-900 border-slate-800 text-slate-400 hover:border-slate-700'
                    }`}
                  >
                    <div>
                      <div className="font-bold flex items-center gap-1">
                        <MapPin className="w-3.5 h-3.5 text-amber-400" />
                        <span>దుర్గడ సమగ్ర GP</span>
                      </div>
                      <span className="text-[10px] text-slate-400">4,524 ఓటర్లు (MPTC 1 & 3 సమగ్ర సర్వ ఓటర్లు)</span>
                    </div>
                    {selectedWards.includes('gp_durgada') && <Check className="w-3.5 h-3.5 text-amber-400" />}
                  </button>

                  {/* Vannepudi Gram Panchayat */}
                  <button
                    type="button"
                    onClick={() => toggleWardSelection('gp_vannepudi')}
                    className={`p-2 rounded-xl border text-left flex items-center justify-between text-xs transition-all ${
                      selectedWards.includes('gp_vannepudi')
                        ? 'bg-purple-950/80 border-purple-400 text-purple-200 shadow-sm'
                        : 'bg-slate-900 border-slate-800 text-slate-400 hover:border-slate-700'
                    }`}
                  >
                    <div>
                      <div className="font-bold flex items-center gap-1">
                        <Trees className="w-3.5 h-3.5 text-purple-400" />
                        <span>వన్నెపూడి పంచాయతీ</span>
                      </div>
                      <span className="text-[10px] text-slate-400">3,201 ఓటర్లు (వన్నెపూడి సర్వ ఓటర్లు)</span>
                    </div>
                    {selectedWards.includes('gp_vannepudi') && <Check className="w-3.5 h-3.5 text-purple-400" />}
                  </button>

                  {/* Durgada Booth 45 */}
                  <button
                    type="button"
                    onClick={() => toggleWardSelection('mptc_durgada_1_b45')}
                    className={`p-2 rounded-xl border text-left flex items-center justify-between text-xs transition-all ${
                      selectedWards.includes('mptc_durgada_1_b45')
                        ? 'bg-teal-950/80 border-teal-400 text-teal-200 shadow-sm'
                        : 'bg-slate-900 border-slate-800 text-slate-400 hover:border-slate-700'
                    }`}
                  >
                    <div>
                      <div className="font-bold flex items-center gap-1">
                        <MapPin className="w-3.5 h-3.5 text-teal-400" />
                        <span>దుర్గడ బూత్ #45</span>
                      </div>
                      <span className="text-[10px] text-slate-400">1,060 ఓటర్లు (ఇంటి కాసుల వారి స్కూల్)</span>
                    </div>
                    {selectedWards.includes('mptc_durgada_1_b45') && <Check className="w-3.5 h-3.5 text-teal-400" />}
                  </button>

                  {/* Durgada Booth 46 */}
                  <button
                    type="button"
                    onClick={() => toggleWardSelection('mptc_durgada_1_b46')}
                    className={`p-2 rounded-xl border text-left flex items-center justify-between text-xs transition-all ${
                      selectedWards.includes('mptc_durgada_1_b46')
                        ? 'bg-teal-950/80 border-teal-400 text-teal-200 shadow-sm'
                        : 'bg-slate-900 border-slate-800 text-slate-400 hover:border-slate-700'
                    }`}
                  >
                    <div>
                      <div className="font-bold flex items-center gap-1">
                        <MapPin className="w-3.5 h-3.5 text-teal-400" />
                        <span>దుర్గడ బూత్ #46</span>
                      </div>
                      <span className="text-[10px] text-slate-400">1,060 ఓటర్లు (స్వర్ణ గ్రామం, వేగులమ్మ గుడి)</span>
                    </div>
                    {selectedWards.includes('mptc_durgada_1_b46') && <Check className="w-3.5 h-3.5 text-teal-400" />}
                  </button>

                  {/* Durgada Booth 47 */}
                  <button
                    type="button"
                    onClick={() => toggleWardSelection('mptc_durgada_1_b47')}
                    className={`p-2 rounded-xl border text-left flex items-center justify-between text-xs transition-all ${
                      selectedWards.includes('mptc_durgada_1_b47')
                        ? 'bg-teal-950/80 border-teal-400 text-teal-200 shadow-sm'
                        : 'bg-slate-900 border-slate-800 text-slate-400 hover:border-slate-700'
                    }`}
                  >
                    <div>
                      <div className="font-bold flex items-center gap-1">
                        <MapPin className="w-3.5 h-3.5 text-teal-400" />
                        <span>దుర్గడ బూత్ #47</span>
                      </div>
                      <span className="text-[10px] text-slate-400">530 ఓటర్లు (EBC కాలనీ)</span>
                    </div>
                    {selectedWards.includes('mptc_durgada_1_b47') && <Check className="w-3.5 h-3.5 text-teal-400" />}
                  </button>

                  {/* Chebrolu MPTC 4 */}
                  <button
                    type="button"
                    onClick={() => toggleWardSelection('mptc_chebrolu_4')}
                    className={`p-2 rounded-xl border text-left flex items-center justify-between text-xs transition-all ${
                      selectedWards.includes('mptc_chebrolu_4')
                        ? 'bg-indigo-950/80 border-indigo-400 text-indigo-200 shadow-sm'
                        : 'bg-slate-900 border-slate-800 text-slate-400 hover:border-slate-700'
                    }`}
                  >
                    <div>
                      <div className="font-bold flex items-center gap-1">
                        <MapPin className="w-3.5 h-3.5 text-indigo-400" />
                        <span>చేబ్రోలు MPTC 4</span>
                      </div>
                      <span className="text-[10px] text-slate-400">2,979 ఓటర్లు (వార్డులు 13-16)</span>
                    </div>
                    {selectedWards.includes('mptc_chebrolu_4') && <Check className="w-3.5 h-3.5 text-indigo-400" />}
                  </button>

                  {/* Tatiparthy MPTC 2 */}
                  <button
                    type="button"
                    onClick={() => toggleWardSelection('mptc_tatiparthy_2')}
                    className={`p-2 rounded-xl border text-left flex items-center justify-between text-xs transition-all ${
                      selectedWards.includes('mptc_tatiparthy_2')
                        ? 'bg-rose-950/80 border-rose-400 text-rose-200 shadow-sm'
                        : 'bg-slate-900 border-slate-800 text-slate-400 hover:border-slate-700'
                    }`}
                  >
                    <div>
                      <div className="font-bold flex items-center gap-1">
                        <MapPin className="w-3.5 h-3.5 text-rose-400" />
                        <span>తాటిపర్తి MPTC 2</span>
                      </div>
                      <span className="text-[10px] text-slate-400">3,501 ఓటర్లు (వార్డులు 8-14)</span>
                    </div>
                    {selectedWards.includes('mptc_tatiparthy_2') && <Check className="w-3.5 h-3.5 text-rose-400" />}
                  </button>
                </div>
              </div>

              {/* Expiry Timer (కాలపరిమితి / టైమర్) */}
              <div className="space-y-2 p-3 rounded-xl bg-slate-900 border border-slate-800">
                <div className="flex items-center justify-between">
                  <label className="text-[10px] font-bold text-amber-400 flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5" />
                    <span>{language === 'te' ? 'జాబితా కాలపరిమితి / టైమర్ (Timer to Unload):' : 'List Access Timer (Auto-Unload):'}</span>
                  </label>
                  <span className="text-[10px] text-amber-300 font-mono font-bold bg-amber-950/80 px-2 py-0.5 rounded border border-amber-500/40">
                    {expiryMinutes === 0 ? 'అపరిమితం (No Expiry)' : `⏱️ ${expiryMinutes} నిమిషాలు`}
                  </span>
                </div>
                <div className="grid grid-cols-4 gap-1.5 text-xs">
                  {[
                    { label: '15 నిమిషాలు', val: 15 },
                    { label: '30 నిమిషాలు', val: 30 },
                    { label: '1 గంట (60m)', val: 60 },
                    { label: '2 గంటలు', val: 120 },
                    { label: '4 గంటలు', val: 240 },
                    { label: '8 గంటలు', val: 480 },
                    { label: '1 రోజు (24h)', val: 1440 },
                    { label: 'అపరిమితం (0)', val: 0 }
                  ].map(opt => (
                    <button
                      key={opt.val}
                      type="button"
                      onClick={() => setExpiryMinutes(opt.val)}
                      className={`py-1.5 px-1 rounded-lg text-[10px] font-bold border transition-all text-center ${
                        expiryMinutes === opt.val
                          ? 'bg-amber-500 text-slate-950 border-amber-400 shadow-sm font-black'
                          : 'bg-slate-950 text-slate-300 border-slate-800 hover:border-slate-700'
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
                <div className="flex items-center gap-2 pt-1">
                  <span className="text-[10px] text-slate-400">కస్టమ్ నిమిషాలు:</span>
                  <input
                    type="number"
                    min="1"
                    max="10000"
                    value={expiryMinutes > 0 && ![15, 30, 60, 120, 240, 480, 1440].includes(expiryMinutes) ? expiryMinutes : ''}
                    onChange={(e) => {
                      const v = parseInt(e.target.value, 10);
                      setExpiryMinutes(isNaN(v) || v <= 0 ? 0 : v);
                    }}
                    placeholder="45"
                    className="w-20 px-2 py-1 bg-slate-950 border border-slate-700 rounded text-xs text-white text-center font-mono focus:border-amber-400 focus:outline-none"
                  />
                  <span className="text-[10px] text-slate-400">నిమిషాలు</span>
                </div>
                <p className="text-[9.5px] text-slate-400 flex items-center gap-1 text-amber-200/80">
                  <AlertTriangle className="w-3 h-3 text-amber-400 shrink-0" />
                  <span>ఈ సమయం దాటగానే ఓటర్ల జాబితా మొబైల్ స్క్రీన్ నుండి ఆటోమేటిక్‌గా అన్‌లోడ్ అవుతుంది.</span>
                </p>
              </div>

              {/* Notes */}
              <div>
                <label className="block text-[10px] font-bold text-slate-300 mb-1">
                  {language === 'te' ? 'గమనికలు (ఐచ్ఛికం):' : 'Notes (Optional):'}
                </label>
                <input
                  type="text"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="e.g. వార్డు ఇంచార్జ్, రౌండ్ 1 సర్వే..."
                  className="w-full px-2.5 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-xs text-white focus:outline-none focus:border-amber-400"
                />
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                className="w-full py-2 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black rounded-xl text-xs flex items-center justify-center gap-1.5 shadow-md shadow-amber-950/40"
              >
                <Check className="w-4 h-4" />
                <span>{language === 'te' ? 'కేటాయింపును భద్రపరచండి (Save)' : 'Save Assignment'}</span>
              </button>
            </form>
          )}

          {/* LIST OF ASSIGNED VOLUNTEERS */}
          <div className="space-y-2.5">
            <div className="flex items-center justify-between text-xs text-slate-400 px-1">
              <span>{language === 'te' ? `నమోదిత ఇంచార్జ్‌లు (${assignments.length})` : `Registered Incharges (${assignments.length})`}</span>
              <span className="text-[10px] text-amber-400 font-bold">1-క్లిక్ వాట్సాప్ పంపండి</span>
            </div>

            {assignments.map(a => (
              <div
                key={a.id}
                className="p-3.5 rounded-2xl bg-slate-950/70 border border-slate-800 hover:border-slate-700 space-y-2 transition-all"
              >
                {/* Person Header */}
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="text-xs font-black text-white flex items-center gap-1.5">
                      <span>{a.name}</span>
                      <span className="px-1.5 py-0.2 rounded bg-slate-800 text-amber-400 font-mono text-[10px] font-bold">
                        {a.phone}
                      </span>
                    </h3>
                    {a.notes && (
                      <p className="text-[10px] text-slate-400 mt-0.5">{a.notes}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => handleEdit(a)}
                      className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300"
                      title="Edit"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleDelete(a.id)}
                      className="p-1.5 rounded-lg bg-slate-800 hover:bg-red-950 text-slate-400 hover:text-red-400"
                      title="Delete"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Assigned Units Badges */}
                <div className="space-y-1 text-xs">
                  {/* Assembly Booths */}
                  {a.assemblyBooths.length > 0 && (
                    <div className="flex flex-wrap items-center gap-1">
                      <span className="text-[10px] font-bold text-slate-400 uppercase mr-1">
                        అసెంబ్లీ బూతులు:
                      </span>
                      {a.assemblyBooths.map(bn => (
                        <span
                          key={bn}
                          className="px-2 py-0.5 rounded-md bg-red-950/60 border border-red-500/40 text-red-300 text-[10px] font-mono font-bold"
                        >
                          బూత్ #{bn}
                        </span>
                      ))}
                    </div>
                  )}

                  {/* Municipal / Local Wards */}
                  {a.municipalWards.length > 0 && (
                    <div className="flex flex-wrap items-center gap-1">
                      <span className="text-[10px] font-bold text-slate-400 uppercase mr-1">
                        స్థానిక వార్డులు / పంచాయతీలు:
                      </span>
                      {a.municipalWards.map(w => {
                        const badge = getUnitBadge(w);
                        return (
                          <span
                            key={w}
                            className={`px-2 py-0.5 rounded-md text-[10px] font-bold border ${badge.cls}`}
                          >
                            {badge.label}
                          </span>
                        );
                      })}
                    </div>
                  )}

                  {a.assemblyBooths.length === 0 && a.municipalWards.length === 0 && (
                    <span className="text-[10px] text-amber-500/80 italic">
                      ఇంకా ఏ బూతులు కేటాయించలేదు
                    </span>
                  )}
                </div>

                {/* Timer / Expiry Status Badge & Quick Actions */}
                <div className="flex items-center justify-between gap-1 flex-wrap pt-1.5 border-t border-slate-800/60">
                  <div className="flex items-center gap-1.5">
                    {a.expiresAt ? (
                      isAssignmentExpired(a) ? (
                        <span className="px-2 py-0.5 rounded-md bg-red-950 border border-red-500/50 text-red-300 text-[10px] font-bold flex items-center gap-1">
                          <AlertTriangle className="w-3 h-3 text-red-400" />
                          <span>కాలపరిమితి ముగిసింది (Expired)</span>
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-md bg-amber-950/80 border border-amber-500/50 text-amber-300 text-[10px] font-bold font-mono flex items-center gap-1">
                          <Clock className="w-3 h-3 text-amber-400" />
                          <span>మిగిలిన సమయం: {getRemainingTime(a).formatted}</span>
                        </span>
                      )
                    ) : (
                      <span className="px-2 py-0.5 rounded-md bg-slate-900 border border-slate-800 text-slate-400 text-[10px] font-bold flex items-center gap-1">
                        <Clock className="w-3 h-3 text-slate-500" />
                        <span>అపరిమిత సమయం (No Expiry)</span>
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => handleExtend(a.id, 30)}
                      className="px-2 py-0.5 rounded bg-amber-500/20 hover:bg-amber-500 hover:text-slate-950 text-amber-300 text-[9.5px] font-bold border border-amber-500/30 transition-all cursor-pointer"
                      title="30 నిమిషాలు పొడిగించండి"
                    >
                      +30ని.
                    </button>
                    <button
                      type="button"
                      onClick={() => handleExtend(a.id, 60)}
                      className="px-2 py-0.5 rounded bg-amber-500/20 hover:bg-amber-500 hover:text-slate-950 text-amber-300 text-[9.5px] font-bold border border-amber-500/30 transition-all cursor-pointer"
                      title="1 గంట పొడిగించండి"
                    >
                      +1గం.
                    </button>
                    {a.expiresAt && (
                      <button
                        type="button"
                        onClick={() => handleMakeUnlimited(a.id)}
                        className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-[9.5px] font-bold border border-slate-700 transition-all cursor-pointer"
                        title="అపరిమితం చేయండి"
                      >
                        అపరిమితం
                      </button>
                    )}
                  </div>
                </div>

                {/* WhatsApp Action Buttons */}
                <div className="pt-1 flex items-center gap-2 border-t border-slate-800/80">
                  <button
                    onClick={() => handleSendWhatsApp(a)}
                    className="flex-1 py-1.5 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-[11px] flex items-center justify-center gap-1.5 shadow-sm shadow-emerald-950/50 transition-all active:scale-98"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>వాట్సాప్‌లో పంపండి (Send WhatsApp)</span>
                  </button>
                  <button
                    onClick={() => handleCopyMessage(a)}
                    className="py-1.5 px-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-[11px] font-bold flex items-center gap-1 transition-all"
                    title="Copy message text"
                  >
                    {copiedId === a.id ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedId === a.id ? 'కాపీ అయింది' : 'కాపీ'}</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Footer info */}
        <div className="pt-2 border-t border-slate-800 text-center flex-shrink-0">
          <p className="text-[10px] text-slate-500">
            వాలంటీర్లు వారి మొబైల్ నంబర్‌తో లాగిన్ అయినప్పుడు మాత్రమే పైన కేటాయించిన బూత్‌లు కనిపిస్తాయి.
          </p>
        </div>
      </div>
    </div>
  );
};
