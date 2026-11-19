import React, { useState, useEffect } from 'react';
import { 
  X, UserPlus, Phone, Trash2, Edit3, Check, Copy, 
  CheckCircle2, RefreshCw, Clock, AlertTriangle, ChevronDown, ChevronUp, 
  Trees, Search, ShieldCheck, Send, User, Home, Building,
  Trophy, Award, TrendingUp, Sparkles, MessageCircle
} from 'lucide-react';
import { 
  VolunteerAssignment, 
  getAssignments, 
  saveAssignment, 
  deleteAssignment, 
  extendAssignmentTime,
  getRemainingTime,
  isAssignmentExpired,
  cleanPhoneNumber,
  generateAssignmentWhatsAppMessage as getWhatsAppShareMessage,
  getWhatsAppShareUrl,
  fetchFreshAssignments
} from '../utils/auth';
import { BoothIndexItem, LocalElectionUnit } from '../types';
import { Language } from '../utils/i18n';

interface AdminAssignmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  boothsIndex: BoothIndexItem[];
  localUnits: LocalElectionUnit[];
  language?: Language;
}

interface GroupedVillageInfo {
  villageId: string;
  name: string;
  isFullGp: boolean;
  totalVoters: number;
  assignedWards: number[];
  totalWardsCount: number;
  badgeCls: string;
}

export const AdminAssignmentModal: React.FC<AdminAssignmentModalProps> = ({
  isOpen,
  onClose,
  boothsIndex,
  localUnits: _localUnits,
  language = 'te'
}) => {
  const [assignments, setAssignments] = useState<VolunteerAssignment[]>(() => getAssignments());
  const [adminTab, setAdminTab] = useState<'assignments' | 'leaderboard'>('assignments');
  const [isAddingNew, setIsAddingNew] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isBoothSelectorOpen, setIsBoothSelectorOpen] = useState(false);
  const [boothFilterQuery, setBoothFilterQuery] = useState('');
  const [expandedWardsForAssignment, setExpandedWardsForAssignment] = useState<Record<string, boolean>>({});

  // Form State
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [assemblyBoothsInput, setAssemblyBoothsInput] = useState('');
  const [selectedWards, setSelectedWards] = useState<string[]>([]);
  const [notes, setNotes] = useState('');
  const [expiryMinutes, setExpiryMinutes] = useState<number>(0);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Form Accordions
  const [showTatiparthyWards, setShowTatiparthyWards] = useState(false);
  const [showDurgadaWards, setShowDurgadaWards] = useState(false);

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

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

  const resetForm = () => {
    setName('');
    setPhone('');
    setAssemblyBoothsInput('');
    setSelectedWards([]);
    setNotes('');
    setExpiryMinutes(0);
    setEditingId(null);
    setIsAddingNew(false);
    setShowTatiparthyWards(false);
    setShowDurgadaWards(false);
  };

  const handleEdit = (a: VolunteerAssignment) => {
    setEditingId(a.id);
    setName(a.name);
    setPhone(a.phone);
    setAssemblyBoothsInput(a.assemblyBooths.join(', '));
    setSelectedWards(a.municipalWards);
    setNotes(a.notes || '');
    setExpiryMinutes(a.expiryMinutes !== undefined ? a.expiryMinutes : 0);
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
      alert(language === 'te' ? 'దయచేసి సరైన 10 అంకెల మొబైల్ నంబర్ ఇవ్వండి' : 'Enter a valid 10-digit phone number');
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
      assemblyBooths: Array.from(new Set(booths)).sort((a, b) => a - b),
      municipalWards: Array.from(new Set(selectedWards)),
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

  const toggleWardSelection = (wardId: string) => {
    setSelectedWards(prev => {
      const isSel = prev.includes(wardId);
      let next = isSel ? prev.filter(w => w !== wardId) : [...prev, wardId];

      // If an individual ward of Tatiparthy is toggled, remove the full GP unless all 14 are selected
      if (wardId.startsWith('gp_tatiparthy_w')) {
        const allTat = Array.from({ length: 14 }, (_, i) => `gp_tatiparthy_w${i + 1}`);
        const allSelected = allTat.every(w => next.includes(w));
        if (allSelected) {
          next = Array.from(new Set([...next, 'gp_tatiparthy']));
        } else {
          next = next.filter(w => w !== 'gp_tatiparthy');
        }
      }

      // If an individual ward of Durgada is toggled, remove the full GP unless all 16 are selected
      if (wardId.startsWith('gp_durgada_w')) {
        const allDur = Array.from({ length: 16 }, (_, i) => `gp_durgada_w${i + 1}`);
        const allSelected = allDur.every(w => next.includes(w));
        if (allSelected) {
          next = Array.from(new Set([...next, 'gp_durgada']));
        } else {
          next = next.filter(w => w !== 'gp_durgada');
        }
      }

      return next;
    });
  };

  const toggleTatiparthyFullGp = () => {
    const isFull = selectedWards.includes('gp_tatiparthy');
    const allTatWards = Array.from({ length: 14 }, (_, i) => `gp_tatiparthy_w${i + 1}`);
    if (isFull) {
      setSelectedWards(prev => prev.filter(w => w !== 'gp_tatiparthy' && !allTatWards.includes(w)));
    } else {
      setSelectedWards(prev => Array.from(new Set([...prev, 'gp_tatiparthy', ...allTatWards])));
    }
  };

  const toggleDurgadaFullGp = () => {
    const isFull = selectedWards.includes('gp_durgada');
    const allDurWards = Array.from({ length: 16 }, (_, i) => `gp_durgada_w${i + 1}`);
    if (isFull) {
      setSelectedWards(prev => prev.filter(w => w !== 'gp_durgada' && !allDurWards.includes(w)));
    } else {
      setSelectedWards(prev => Array.from(new Set([...prev, 'gp_durgada', ...allDurWards])));
    }
  };

  const handleCopyMessage = (a: VolunteerAssignment) => {
    const msg = getWhatsAppShareMessage(a, window.location.origin);
    navigator.clipboard.writeText(msg);
    setCopiedId(a.id);
    setTimeout(() => setCopiedId(null), 2500);
  };

  const handleOpenWhatsApp = (a: VolunteerAssignment) => {
    const msg = getWhatsAppShareMessage(a, window.location.origin);
    const url = getWhatsAppShareUrl(a.phone, msg);
    window.open(url, '_blank');
  };

  // Helper to neatly group villages for display
  const groupAssignmentVillages = (wards: string[]): GroupedVillageInfo[] => {
    const groups: GroupedVillageInfo[] = [];

    // 1. Tatiparthy
    const hasTatGp = wards.includes('gp_tatiparthy');
    const tatWards: number[] = [];
    for (let i = 1; i <= 14; i++) {
      if (wards.includes(`gp_tatiparthy_w${i}`)) tatWards.push(i);
    }
    if (hasTatGp || tatWards.length > 0) {
      const isFull = hasTatGp && (tatWards.length === 0 || tatWards.length === 14);
      groups.push({
        villageId: 'gp_tatiparthy',
        name: 'తాటిపర్తి (Tatiparthy)',
        isFullGp: isFull,
        totalVoters: isFull ? 6994 : tatWards.length * 499,
        assignedWards: tatWards,
        totalWardsCount: 14,
        badgeCls: 'bg-emerald-950/70 border-emerald-500/40 text-emerald-300'
      });
    }

    // 2. Durgada
    const hasDurGp = wards.includes('gp_durgada');
    const durWards: number[] = [];
    for (let i = 1; i <= 16; i++) {
      if (wards.includes(`gp_durgada_w${i}`)) durWards.push(i);
    }
    if (hasDurGp || durWards.length > 0) {
      const isFull = hasDurGp && (durWards.length === 0 || durWards.length === 16);
      groups.push({
        villageId: 'gp_durgada',
        name: 'దుర్గడ (Durgada)',
        isFullGp: isFull,
        totalVoters: isFull ? 8487 : durWards.length * 530,
        assignedWards: durWards,
        totalWardsCount: 16,
        badgeCls: 'bg-amber-950/70 border-amber-500/40 text-amber-300'
      });
    }

    // 3. Vannepudi
    if (wards.includes('gp_vannepudi')) {
      groups.push({
        villageId: 'gp_vannepudi',
        name: 'వన్నెపూడి (Vannepudi)',
        isFullGp: true,
        totalVoters: 3201,
        assignedWards: [],
        totalWardsCount: 0,
        badgeCls: 'bg-purple-950/70 border-purple-500/40 text-purple-300'
      });
    }

    // 4. Chebrolu
    if (wards.includes('mptc_chebrolu_4')) {
      groups.push({
        villageId: 'mptc_chebrolu_4',
        name: 'చేబ్రోలు MPTC 4',
        isFullGp: true,
        totalVoters: 2979,
        assignedWards: [],
        totalWardsCount: 0,
        badgeCls: 'bg-indigo-950/70 border-indigo-500/40 text-indigo-300'
      });
    }

    return groups;
  };

  const getInitials = (n: string) => {
    return n.trim().slice(0, 2).toUpperCase();
  };

  return (
    <div 
      className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-3 animate-in fade-in duration-200"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div 
        className="bg-slate-900 border border-amber-500/40 rounded-3xl max-w-2xl w-full p-4 sm:p-5 space-y-4 shadow-2xl relative max-h-[92vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between border-b border-slate-800 pb-3 flex-shrink-0">
          <div>
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-red-950/80 border border-red-500/40 text-red-300 text-[10px] font-black uppercase tracking-wider mb-1">
              🛡️ అడ్మిన్ కంట్రోల్ హబ్ (ADMIN HUB)
            </div>
            <h2 className="text-base font-black text-white flex items-center gap-2">
              <span>ఎన్నికల బాధ్యతల కేటాయింపు & వాట్సాప్</span>
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              గ్రామ పంచాయతీలు & అసెంబ్లీ బూతులను ఇంచార్జ్ ఫోన్ నంబర్లకు కేటాయించండి.
            </p>
          </div>
          <div className="flex items-center gap-1.5">
            <button
              onClick={handleManualSync}
              disabled={isSyncing}
              className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-bold flex items-center gap-1.5 border border-slate-700 transition-all cursor-pointer"
              title="క్లౌడ్ మరియు డిస్క్ నుండి లేటెస్ట్ డేటాను సింక్ చేయండి"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin text-amber-400' : 'text-slate-400'}`} />
              <span>{isSyncing ? 'సింకింగ్...' : 'సింక్ (Sync)'}</span>
            </button>
            <button
              onClick={onClose}
              className="text-slate-400 hover:text-white bg-slate-800 p-1.5 rounded-full transition-colors cursor-pointer"
              title="Close (Esc)"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Tab Switcher */}
        <div className="flex items-center gap-2 border-b border-slate-800 pb-2.5 flex-shrink-0">
          <button
            type="button"
            onClick={() => setAdminTab('assignments')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-black flex items-center gap-1.5 transition-all cursor-pointer ${
              adminTab === 'assignments'
                ? 'bg-gradient-to-r from-red-600 to-amber-600 text-white shadow-md shadow-red-950/40'
                : 'bg-slate-800/80 text-slate-400 hover:text-white'
            }`}
          >
            <span>📋 ఇన్చార్జి కేటాయింపులు ({assignments.length})</span>
          </button>
          <button
            type="button"
            onClick={() => setAdminTab('leaderboard')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-black flex items-center gap-1.5 transition-all cursor-pointer ${
              adminTab === 'leaderboard'
                ? 'bg-gradient-to-r from-amber-500 to-yellow-500 text-slate-950 shadow-md shadow-amber-950/40'
                : 'bg-slate-800/80 text-slate-400 hover:text-white'
            }`}
          >
            <Trophy className="w-3.5 h-3.5" />
            <span>🏆 వాలంటీర్ లీడర్‌బోర్డ్ & కవరేజ్</span>
          </button>
        </div>

        {/* Content Scrollable Body */}
        <div className="overflow-y-auto space-y-4 pr-1 flex-1">
          {adminTab === 'leaderboard' ? (
            /* VOLUNTEER ACTIVITY & COVERAGE LEADERBOARD */
            <div className="space-y-3">
              <div className="bg-gradient-to-r from-amber-950/40 via-slate-900 to-slate-900 border border-amber-500/30 rounded-2xl p-3.5 flex items-center justify-between">
                <div>
                  <h3 className="text-xs font-black text-amber-400 flex items-center gap-1.5">
                    <Trophy className="w-4 h-4 text-amber-400" />
                    <span>పిఠాపురం నియోజకవర్గం • వాలంటీర్ గ్రౌండ్ లీడర్‌బోర్డ్</span>
                  </h3>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    ప్రతి బూత్ & వార్డు ఇన్చార్జి పనితీరు, సర్వే మరియు ఓటరు కవరేజ్ ప్రగతి.
                  </p>
                </div>
                <div className="text-right">
                  <span className="text-[10px] text-slate-500 font-bold block uppercase">యాక్టివ్ ఇన్చార్జీలు</span>
                  <span className="text-sm font-black text-white">{assignments.length} మంది</span>
                </div>
              </div>

              {assignments.length === 0 ? (
                <div className="p-8 text-center bg-slate-950/60 rounded-2xl border border-slate-800 text-slate-500 text-xs">
                  ఇంకా ఎటువంటి ఇన్చార్జ్ బాధ్యతలు కేటాయించలేదు.
                </div>
              ) : (
                <div className="space-y-2.5">
                  {assignments.map((asgn, idx) => {
                    const cleanPhone = cleanPhoneNumber(asgn.phone);
                    const boothCount = (asgn.assemblyBooths || []).length;
                    const wardCount = (asgn.municipalWards || []).length;
                    
                    // Estimate electors
                    let estimatedElectors = 0;
                    if (asgn.municipalWards?.includes('gp_durgada')) estimatedElectors += 8487;
                    else if (asgn.municipalWards?.includes('gp_tatiparthy')) estimatedElectors += 6994;
                    else if (asgn.municipalWards?.includes('gp_vannepudi')) estimatedElectors += 3201;
                    else estimatedElectors += (wardCount * 500) + (boothCount * 1000);
                    if (estimatedElectors === 0) estimatedElectors = 1000;

                    const rankBadges = ['🥇 #1 Top Performer', '🥈 #2 Runner-Up', '🥉 #3 Achiever'];
                    const rankBadge = rankBadges[idx] || `🏅 #${idx + 1} Incharge`;

                    const handleSendMotivation = () => {
                      const msg = `🚩 *జై జనసేన • పిఠాపురం ఎన్నికల అడ్మిన్ టీమ్*\n\nనమస్తే *${asgn.name}* గారు,\nమీకు కేటాయించిన గ్రామ/వార్డు బాధ్యతలలో మీ పనితీరు అద్భుతంగా ఉంది. మీ కవరేజ్ లక్ష్యం పూర్తి చేసి పిఠాపురంలో భారీ మెజారిటీ సాధించే దిశగా ప్రతి ఓటర్ ఇంటిని సందర్శించండి!\n\nధన్యవాదాలు 🙏`;
                      const targetPhone = cleanPhone.startsWith('91') ? cleanPhone : `91${cleanPhone}`;
                      window.open(`https://api.whatsapp.com/send?phone=${targetPhone}&text=${encodeURIComponent(msg)}`, '_blank');
                    };

                    return (
                      <div
                        key={asgn.id || idx}
                        className="p-3.5 bg-slate-950/90 border border-slate-800 hover:border-amber-500/40 rounded-2xl transition-all shadow-md space-y-2.5"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-center gap-2.5">
                            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-amber-500 to-orange-600 flex items-center justify-center text-slate-950 font-black text-xs shadow-md">
                              {getInitials(asgn.name)}
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                <h4 className="text-xs font-black text-white">{asgn.name}</h4>
                                <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                                  {rankBadge}
                                </span>
                              </div>
                              <span className="font-mono text-[11px] text-emerald-400 font-bold">{asgn.phone}</span>
                            </div>
                          </div>

                          <button
                            type="button"
                            onClick={handleSendMotivation}
                            className="px-2.5 py-1 bg-emerald-600/20 hover:bg-emerald-600 text-emerald-300 hover:text-white rounded-lg text-[10.5px] font-bold border border-emerald-500/30 flex items-center gap-1 transition-all cursor-pointer"
                            title="Send Motivation & Review via WhatsApp"
                          >
                            <MessageCircle className="w-3 h-3 text-emerald-400" />
                            <span>వాట్సాప్ సందేశం</span>
                          </button>
                        </div>

                        {/* Progress Stats Bar */}
                        <div className="grid grid-cols-3 gap-2 text-center bg-slate-900/80 rounded-xl p-2 border border-slate-800/80">
                          <div>
                            <span className="text-[9.5px] text-slate-400 block font-bold">కేటాయించిన పరిధి</span>
                            <span className="text-xs font-black text-white">
                              {wardCount > 0 ? `${wardCount} వార్డులు` : `${boothCount} బూతులు`}
                            </span>
                          </div>
                          <div>
                            <span className="text-[9.5px] text-slate-400 block font-bold">మొత్తం ఓటర్లు (సుమారు)</span>
                            <span className="text-xs font-black text-amber-400 font-mono">
                              {estimatedElectors.toLocaleString()}
                            </span>
                          </div>
                          <div>
                            <span className="text-[9.5px] text-slate-400 block font-bold">స్టేటస్</span>
                            <span className="text-xs font-black text-emerald-400">
                              🟢 యాక్టివ్
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          ) : (
            <>
          {/* Action: Add New Incharge Button */}
          {!isAddingNew ? (
            <button
              type="button"
              onClick={() => {
                resetForm();
                setIsAddingNew(true);
              }}
              className="w-full py-3 bg-gradient-to-r from-red-600 to-amber-600 hover:from-red-500 hover:to-amber-500 text-white font-black rounded-2xl text-xs flex items-center justify-center gap-2 shadow-lg shadow-red-950/40 transition-all active:scale-98 cursor-pointer"
            >
              <UserPlus className="w-4 h-4" />
              <span>+ కొత్త ఇంచార్జ్ / వాలంటీర్ కేటాయింపు జోడించండి (+ Add Assignment)</span>
            </button>
          ) : (
            /* IMPROVISED CREATE / EDIT FORM */
            <form onSubmit={handleSave} className="p-4 rounded-2xl bg-slate-950/95 border border-amber-500/40 space-y-3.5 shadow-xl animate-in fade-in duration-150">
              <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
                <div className="flex items-center gap-2 text-xs font-black text-amber-400">
                  <ShieldCheck className="w-4 h-4 text-amber-400" />
                  <span>{editingId ? 'కేటాయింపు సవరణ (Edit Assignment)' : 'కొత్త బాధ్యత కేటాయింపు (New Assignment)'}</span>
                </div>
                <button
                  type="button"
                  onClick={resetForm}
                  className="text-xs text-slate-400 hover:text-white bg-slate-800 px-2.5 py-1 rounded-lg transition-colors cursor-pointer"
                >
                  రద్దు (Cancel)
                </button>
              </div>

              {/* 1. Incharge Personal Details */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-[11px] font-bold text-slate-300 mb-1 flex items-center gap-1">
                    <User className="w-3.5 h-3.5 text-amber-400" />
                    <span>వాలంటీర్ / ఇంచార్జ్ పేరు:</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="ఉదా: దుర్గా ప్రసాద్"
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-amber-400 transition-colors"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-300 mb-1 flex items-center gap-1">
                    <Phone className="w-3.5 h-3.5 text-emerald-400" />
                    <span>మొబైల్ నంబర్ (10 అంకెలు):</span>
                  </label>
                  <input
                    type="tel"
                    required
                    maxLength={10}
                    value={phone}
                    onChange={(e) => setPhone(e.target.value.replace(/\D/g, ''))}
                    placeholder="ఉదా: 9000273028"
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs font-mono font-bold text-white focus:outline-none focus:border-amber-400 transition-colors"
                  />
                </div>
              </div>

              {/* Role / Notes */}
              <div>
                <label className="block text-[11px] font-bold text-slate-400 mb-1">
                  బాధ్యత / నోట్స్ (Role / Notes):
                </label>
                <input
                  type="text"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="ఉదా: పిఠాపురం అసెంబ్లీ & గ్రామ పంచాయతీ ఎన్నికల కోఆర్డినేటర్"
                  className="w-full px-3 py-1.5 bg-slate-900 border border-slate-800 rounded-xl text-xs text-slate-300 focus:outline-none focus:border-slate-600"
                />
              </div>

              {/* 2. Gram Panchayats (Villages & Wards) */}
              <div className="space-y-2 p-3 rounded-2xl bg-slate-900/80 border border-slate-800">
                <div className="flex items-center justify-between flex-wrap gap-1">
                  <label className="text-xs font-bold text-emerald-400 flex items-center gap-1.5">
                    <Home className="w-4 h-4" />
                    <span>గ్రామ పంచాయతీలు & వార్డులు (ఎంచుకోండి):</span>
                  </label>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => {
                        const allTat = Array.from({ length: 14 }, (_, i) => `gp_tatiparthy_w${i + 1}`);
                        const allDur = Array.from({ length: 16 }, (_, i) => `gp_durgada_w${i + 1}`);
                        setSelectedWards(['gp_tatiparthy', 'gp_durgada', 'gp_vannepudi', 'mptc_chebrolu_4', ...allTat, ...allDur]);
                      }}
                      className="px-2 py-0.5 bg-emerald-500/20 hover:bg-emerald-500 hover:text-slate-950 text-emerald-300 rounded text-[10px] font-bold border border-emerald-500/30 transition-colors cursor-pointer"
                    >
                      అన్నీ ఎంచుకోండి
                    </button>
                    <button
                      type="button"
                      onClick={() => setSelectedWards([])}
                      className="px-2 py-0.5 bg-slate-800 text-slate-400 hover:text-white rounded text-[10px] cursor-pointer"
                    >
                      తీసివేయండి
                    </button>
                  </div>
                </div>

                <div className="space-y-2 pt-1">
                  {/* Village 1: Tatiparthy */}
                  <div className="p-2.5 rounded-xl bg-slate-950 border border-emerald-500/30 space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
                        <div>
                          <div className="text-xs font-black text-white flex items-center gap-1.5">
                            <span>🏡 తాటిపర్తి పంచాయతీ</span>
                            <span className="text-[10px] text-emerald-400 font-mono">(6,994 ఓటర్లు)</span>
                          </div>
                          <span className="text-[10px] text-slate-400">14 వార్డులు • సమగ్ర గ్రామం</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={toggleTatiparthyFullGp}
                          className={`px-2.5 py-1 rounded-lg text-[10px] font-bold border transition-all cursor-pointer ${
                            selectedWards.includes('gp_tatiparthy')
                              ? 'bg-emerald-500 text-slate-950 border-emerald-400 font-black shadow-sm'
                              : 'bg-slate-900 border-slate-700 text-slate-300 hover:text-white'
                          }`}
                        >
                          {selectedWards.includes('gp_tatiparthy') ? '✓ సమగ్ర GP ఎంపికైంది' : '+ సమగ్ర GP (All 14 Wards)'}
                        </button>
                        <button
                          type="button"
                          onClick={() => setShowTatiparthyWards(!showTatiparthyWards)}
                          className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-[10px] font-bold flex items-center gap-1 border border-slate-700 cursor-pointer"
                        >
                          <span>వార్డులు</span>
                          {showTatiparthyWards ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                        </button>
                      </div>
                    </div>

                    {/* Wards selector chips for Tatiparthy */}
                    {showTatiparthyWards && (
                      <div className="pt-2 border-t border-slate-800/80 space-y-1.5 animate-in fade-in duration-100">
                        <div className="flex items-center justify-between text-[10px] text-slate-400">
                          <span>ప్రత్యేక వార్డుల ఎంపిక (1 నుండి 14):</span>
                          <span className="font-mono text-emerald-400 font-bold">
                            {Array.from({ length: 14 }, (_, i) => `gp_tatiparthy_w${i + 1}`).filter(w => selectedWards.includes(w)).length}/14 వార్డులు
                          </span>
                        </div>
                        <div className="grid grid-cols-7 gap-1">
                          {Array.from({ length: 14 }, (_, i) => {
                            const wid = `gp_tatiparthy_w${i + 1}`;
                            const isSel = selectedWards.includes(wid);
                            return (
                              <button
                                key={wid}
                                type="button"
                                onClick={() => toggleWardSelection(wid)}
                                className={`py-1 rounded text-[10px] font-mono font-bold transition-all cursor-pointer text-center ${
                                  isSel
                                    ? 'bg-emerald-500 text-slate-950 font-black shadow-sm'
                                    : 'bg-slate-900 border border-slate-800 text-slate-400 hover:text-white'
                                }`}
                              >
                                W#{i + 1}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Village 2: Durgada */}
                  <div className="p-2.5 rounded-xl bg-slate-950 border border-amber-500/30 space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-pulse" />
                        <div>
                          <div className="text-xs font-black text-white flex items-center gap-1.5">
                            <span>🏡 దుర్గడ పంచాయతీ</span>
                            <span className="text-[10px] text-amber-400 font-mono">(8,487 ఓటర్లు)</span>
                          </div>
                          <span className="text-[10px] text-slate-400">16 వార్డులు • సమగ్ర గ్రామం</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={toggleDurgadaFullGp}
                          className={`px-2.5 py-1 rounded-lg text-[10px] font-bold border transition-all cursor-pointer ${
                            selectedWards.includes('gp_durgada')
                              ? 'bg-amber-500 text-slate-950 border-amber-400 font-black shadow-sm'
                              : 'bg-slate-900 border-slate-700 text-slate-300 hover:text-white'
                          }`}
                        >
                          {selectedWards.includes('gp_durgada') ? '✓ సమగ్ర GP ఎంపికైంది' : '+ సమగ్ర GP (All 16 Wards)'}
                        </button>
                        <button
                          type="button"
                          onClick={() => setShowDurgadaWards(!showDurgadaWards)}
                          className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-[10px] font-bold flex items-center gap-1 border border-slate-700 cursor-pointer"
                        >
                          <span>వార్డులు</span>
                          {showDurgadaWards ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                        </button>
                      </div>
                    </div>

                    {/* Wards selector chips for Durgada */}
                    {showDurgadaWards && (
                      <div className="pt-2 border-t border-slate-800/80 space-y-1.5 animate-in fade-in duration-100">
                        <div className="flex items-center justify-between text-[10px] text-slate-400">
                          <span>ప్రత్యేక వార్డుల ఎంపిక (1 నుండి 16):</span>
                          <span className="font-mono text-amber-400 font-bold">
                            {Array.from({ length: 16 }, (_, i) => `gp_durgada_w${i + 1}`).filter(w => selectedWards.includes(w)).length}/16 వార్డులు
                          </span>
                        </div>
                        <div className="grid grid-cols-8 gap-1">
                          {Array.from({ length: 16 }, (_, i) => {
                            const wid = `gp_durgada_w${i + 1}`;
                            const isSel = selectedWards.includes(wid);
                            return (
                              <button
                                key={wid}
                                type="button"
                                onClick={() => toggleWardSelection(wid)}
                                className={`py-1 rounded text-[10px] font-mono font-bold transition-all cursor-pointer text-center ${
                                  isSel
                                    ? 'bg-amber-500 text-slate-950 font-black shadow-sm'
                                    : 'bg-slate-900 border border-slate-800 text-slate-400 hover:text-white'
                                }`}
                              >
                                W#{i + 1}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Village 3 & 4: Vannepudi & Chebrolu in clean 2-column grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => toggleWardSelection('gp_vannepudi')}
                      className={`p-2.5 rounded-xl border text-left flex items-center justify-between text-xs transition-all cursor-pointer ${
                        selectedWards.includes('gp_vannepudi')
                          ? 'bg-purple-950/80 border-purple-400 text-purple-200 shadow-sm ring-1 ring-purple-400'
                          : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                      }`}
                    >
                      <div>
                        <div className="font-bold flex items-center gap-1.5">
                          <Trees className="w-3.5 h-3.5 text-purple-400" />
                          <span>వన్నెపూడి పంచాయతీ</span>
                        </div>
                        <span className="text-[10px] text-slate-400">3,201 ఓటర్లు • సర్వ గ్రామం</span>
                      </div>
                      {selectedWards.includes('gp_vannepudi') && <Check className="w-4 h-4 text-purple-400" />}
                    </button>

                    <button
                      type="button"
                      onClick={() => toggleWardSelection('mptc_chebrolu_4')}
                      className={`p-2.5 rounded-xl border text-left flex items-center justify-between text-xs transition-all cursor-pointer ${
                        selectedWards.includes('mptc_chebrolu_4')
                          ? 'bg-indigo-950/80 border-indigo-400 text-indigo-200 shadow-sm ring-1 ring-indigo-400'
                          : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                      }`}
                    >
                      <div>
                        <div className="font-bold flex items-center gap-1.5">
                          <Building className="w-3.5 h-3.5 text-indigo-400" />
                          <span>చేబ్రోలు MPTC 4</span>
                        </div>
                        <span className="text-[10px] text-slate-400">2,979 ఓటర్లు • వార్డులు 13-16</span>
                      </div>
                      {selectedWards.includes('mptc_chebrolu_4') && <Check className="w-4 h-4 text-indigo-400" />}
                    </button>
                  </div>
                </div>
              </div>

              {/* 3. Assembly Booths (AC #37 Rural Booths) */}
              <div className="space-y-2 p-3 rounded-2xl bg-slate-900/80 border border-slate-800">
                <div className="flex items-center justify-between flex-wrap gap-1">
                  <label className="text-xs font-bold text-amber-400 flex items-center gap-1.5">
                    <Building className="w-4 h-4" />
                    <span>అసెంబ్లీ బూతులు (Assembly Booths):</span>
                  </label>
                  <button
                    type="button"
                    onClick={() => setIsBoothSelectorOpen(!isBoothSelectorOpen)}
                    className="text-[10px] text-amber-400 hover:underline flex items-center gap-1 font-bold cursor-pointer"
                  >
                    <span>{isBoothSelectorOpen ? 'లిస్ట్ దాచు' : '📋 బూత్‌ల గ్రిడ్ ఎంపిక'}</span>
                    {isBoothSelectorOpen ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                  </button>
                </div>

                <input
                  type="text"
                  value={assemblyBoothsInput}
                  onChange={(e) => setAssemblyBoothsInput(e.target.value)}
                  placeholder="ఉదా: 11, 12, 13, 24, 25"
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs font-mono font-bold text-white focus:outline-none focus:border-amber-400 transition-colors"
                />

                {/* Quick Booth Pills */}
                <div className="flex items-center gap-1 flex-wrap pt-0.5">
                  <span className="text-[10px] text-slate-400">త్వరిత ఎంపిక:</span>
                  {[9, 11, 12, 13, 14, 15, 16, 17, 18, 19, 23, 24, 25].map(bNum => {
                    const currentSet = new Set(
                      assemblyBoothsInput.split(/[, ]+/).map(s => parseInt(s.trim(), 10)).filter(n => !isNaN(n) && n > 0)
                    );
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
                            ? 'bg-amber-500 text-slate-950 font-black shadow-sm'
                            : 'bg-slate-950 border border-slate-800 text-slate-400 hover:text-white'
                        }`}
                      >
                        #{bNum}
                      </button>
                    );
                  })}
                </div>

                {/* Expandable Booth Selector Grid */}
                {isBoothSelectorOpen && (
                  <div className="mt-2 p-2.5 bg-slate-950 rounded-xl border border-slate-800 space-y-2 max-h-48 overflow-y-auto animate-in fade-in duration-100">
                    <div className="relative">
                      <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input
                        type="text"
                        value={boothFilterQuery}
                        onChange={e => setBoothFilterQuery(e.target.value)}
                        placeholder="బూత్ నెం లేదా గ్రామం ద్వారా వెతకండి..."
                        className="w-full bg-slate-900 border border-slate-700 rounded-lg pl-8 pr-2 py-1 text-[11px] text-white focus:outline-none focus:border-amber-400"
                      />
                    </div>
                    <div className="grid grid-cols-6 sm:grid-cols-8 gap-1 pt-1">
                      {boothsIndex
                        .filter(b => {
                          const q = boothFilterQuery.toLowerCase().trim();
                          if (!q) return true;
                          return (
                            b.part_no.toString().includes(q) ||
                            b.clean_village.toLowerCase().includes(q) ||
                            b.village.toLowerCase().includes(q)
                          );
                        })
                        .map(b => {
                          const bNum = Number(b.part_no);
                          const currentSet = new Set(
                            assemblyBoothsInput.split(/[, ]+/).map(s => parseInt(s.trim(), 10)).filter(n => !isNaN(n) && n > 0)
                          );
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
                              className={`px-1 py-0.5 rounded text-[10px] font-mono font-bold transition-all cursor-pointer ${
                                isSel
                                  ? 'bg-amber-500 text-slate-950 font-black'
                                  : 'bg-slate-900 border border-slate-800 text-slate-400 hover:text-white'
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

              {/* 4. Timer / Expiry Selection */}
              <div className="space-y-2 p-3 rounded-2xl bg-slate-900/80 border border-slate-800">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-amber-400 flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5" />
                    <span>జాబితా కాలపరిమితి / టైమర్ (Auto-Unload):</span>
                  </label>
                  <span className="text-[10px] text-amber-300 font-mono font-bold bg-amber-950/80 px-2 py-0.5 rounded border border-amber-500/40">
                    {expiryMinutes === 0 ? 'అపరిమితం (No Expiry)' : `⏱️ ${expiryMinutes} నిమిషాలు`}
                  </span>
                </div>
                <div className="grid grid-cols-4 gap-1.5 text-xs">
                  {[
                    { label: 'అపరిమితం (0)', val: 0 },
                    { label: '1 గంట (60m)', val: 60 },
                    { label: '2 గంటలు (120m)', val: 120 },
                    { label: '4 గంటలు (240m)', val: 240 },
                    { label: '8 గంటలు (480m)', val: 480 },
                    { label: '1 రోజు (24h)', val: 1440 },
                    { label: '30 నిమిషాలు', val: 30 },
                    { label: '15 నిమిషాలు', val: 15 }
                  ].map(opt => (
                    <button
                      key={opt.val}
                      type="button"
                      onClick={() => setExpiryMinutes(opt.val)}
                      className={`py-1.5 px-1 rounded-xl text-[10px] font-bold border transition-all text-center cursor-pointer ${
                        expiryMinutes === opt.val
                          ? 'bg-amber-500 text-slate-950 border-amber-400 shadow-sm font-black'
                          : 'bg-slate-950 text-slate-300 border-slate-800 hover:border-slate-700'
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Form Save Actions */}
              <div className="flex items-center gap-2 pt-1">
                <button
                  type="submit"
                  className="flex-1 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-black rounded-xl text-xs flex items-center justify-center gap-1.5 shadow-md shadow-emerald-950/40 cursor-pointer"
                >
                  <Check className="w-4 h-4" />
                  <span>కేటాయింపును భద్రపరచండి (Save Assignment)</span>
                </button>
                <button
                  type="button"
                  onClick={resetForm}
                  className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-bold transition-colors cursor-pointer"
                >
                  రద్దు
                </button>
              </div>
            </form>
          )}

          {/* LIST OF REGISTERED INCHARGES (HIGHLY IMPROVISED, NEAT & GROUPED) */}
          <div className="space-y-3">
            <div className="flex items-center justify-between text-xs text-slate-400 px-1">
              <span className="font-bold text-white flex items-center gap-1.5">
                <span>నమోదిత ఇంచార్జ్‌లు</span>
                <span className="px-2 py-0.2 rounded-full bg-slate-800 text-amber-400 font-mono text-[10px] font-bold">
                  {assignments.length}
                </span>
              </span>
              <span className="text-[10px] text-amber-400 font-bold flex items-center gap-1">
                <span>📲 1-క్లిక్ వాట్సాప్ పంపండి</span>
              </span>
            </div>

            {assignments.length === 0 ? (
              <div className="p-8 rounded-2xl bg-slate-950/50 border border-dashed border-slate-800 text-center space-y-2">
                <p className="text-xs text-slate-400">ఇంకా ఎవరికీ బాధ్యతలు కేటాయించలేదు.</p>
                <p className="text-[11px] text-amber-400 font-bold">'+ కొత్త ఇంచార్జ్ జోడించండి' పై క్లిక్ చేయండి.</p>
              </div>
            ) : (
              assignments.map(a => {
                const villageGroups = groupAssignmentVillages(a.municipalWards);
                const isExpandedWards = !!expandedWardsForAssignment[a.id];

                return (
                  <div
                    key={a.id}
                    className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800/90 hover:border-slate-700/80 space-y-3 transition-all shadow-md"
                  >
                    {/* Person Header */}
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-amber-600 to-red-600 flex items-center justify-center text-white font-black text-xs shadow-md shrink-0">
                          {getInitials(a.name)}
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h3 className="text-xs font-black text-white truncate">
                              {a.name}
                            </h3>
                            <span className="px-2 py-0.5 rounded-md bg-slate-800 border border-slate-700 text-amber-400 font-mono text-[10px] font-bold flex items-center gap-1">
                              <Phone className="w-2.5 h-2.5 text-slate-400" />
                              <span>{a.phone}</span>
                            </span>
                          </div>
                          {a.notes && (
                            <p className="text-[10.5px] text-slate-400 mt-0.5 truncate">
                              {a.notes}
                            </p>
                          )}
                        </div>
                      </div>

                      {/* Edit / Delete Buttons */}
                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          onClick={() => handleEdit(a)}
                          className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors cursor-pointer"
                          title="Edit Assignment"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDelete(a.id)}
                          className="p-1.5 rounded-lg bg-slate-800 hover:bg-red-950 text-slate-400 hover:text-red-400 transition-colors cursor-pointer"
                          title="Delete Assignment"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    {/* NEATLY GROUPED VILLAGE & BOOTH BADGES */}
                    <div className="space-y-2 p-2.5 rounded-xl bg-slate-900/60 border border-slate-800/80">
                      {/* 1. Gram Panchayats (Grouped Cards) */}
                      {villageGroups.length > 0 && (
                        <div className="space-y-1.5">
                          <span className="text-[9.5px] font-black text-slate-400 uppercase tracking-wider block">
                            🏡 కేటాయించిన గ్రామ పంచాయతీలు:
                          </span>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                            {villageGroups.map(v => (
                              <div
                                key={v.villageId}
                                className={`p-2 rounded-xl border flex items-center justify-between text-xs font-bold ${v.badgeCls}`}
                              >
                                <div className="flex items-center gap-2 min-w-0">
                                  <span className="text-base shrink-0">🏡</span>
                                  <div className="min-w-0 truncate">
                                    <span className="block text-xs font-black truncate">
                                      {v.name}
                                    </span>
                                    <span className="text-[9.5px] opacity-80 block">
                                      {v.isFullGp 
                                        ? `సమగ్ర గ్రామం (~${v.totalVoters.toLocaleString()} ఓటర్లు)`
                                        : `${v.assignedWards.length === 1 ? `వార్డు #${v.assignedWards[0]}` : `${v.assignedWards.length} వార్డులు (${v.assignedWards.map(w => '#' + w).join(', ')})`} (~${v.totalVoters.toLocaleString()} ఓటర్లు)`}
                                    </span>
                                  </div>
                                </div>
                                <span className="text-[9px] px-1.5 py-0.5 rounded font-mono font-black bg-black/40 border border-white/10 shrink-0 ml-1">
                                  {v.isFullGp ? 'సర్వ వార్డులు' : v.assignedWards.length === 1 ? `Ward #${v.assignedWards[0]}` : `${v.assignedWards.length} Wards`}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* 2. Assembly Booths */}
                      {a.assemblyBooths.length > 0 && (
                        <div className="pt-1 border-t border-slate-800/60">
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-[9.5px] font-black text-slate-400 uppercase tracking-wider">
                              🏛️ అసెంబ్లీ బూతులు (AC #37):
                            </span>
                            <span className="text-[9.5px] text-red-300 font-mono font-bold">
                              {a.assemblyBooths.length} బూతులు
                            </span>
                          </div>
                          <div className="flex flex-wrap items-center gap-1">
                            {a.assemblyBooths.map(bn => (
                              <span
                                key={bn}
                                className="px-2 py-0.5 rounded-md bg-red-950/70 border border-red-500/40 text-red-300 text-[10px] font-mono font-bold"
                              >
                                బూత్ #{bn}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Expand / Collapse Individual Wards */}
                      {villageGroups.some(v => v.assignedWards.length > 0) && (
                        <div className="pt-1 text-right">
                          <button
                            type="button"
                            onClick={() => {
                              setExpandedWardsForAssignment(prev => ({
                                ...prev,
                                [a.id]: !prev[a.id]
                              }));
                            }}
                            className="text-[9.5px] text-amber-400 hover:underline font-bold inline-flex items-center gap-0.5 cursor-pointer"
                          >
                            <span>{isExpandedWards ? 'వార్డుల వివరాలు దాచు' : '🔎 ప్రత్యేక వార్డుల నంబర్లు చూడండి'}</span>
                            {isExpandedWards ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                          </button>
                        </div>
                      )}

                      {isExpandedWards && (
                        <div className="p-2 rounded-lg bg-slate-950 border border-slate-800/90 text-[10px] space-y-1 animate-in fade-in duration-100">
                          <span className="font-bold text-slate-400 block">కేటాయించిన అన్ని వార్డుల జాబితా:</span>
                          <div className="flex flex-wrap gap-1">
                            {a.municipalWards.map(w => (
                              <span key={w} className="px-1.5 py-0.5 rounded bg-slate-900 border border-slate-700 text-slate-300 font-mono text-[9px]">
                                {w}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}

                      {a.assemblyBooths.length === 0 && a.municipalWards.length === 0 && (
                        <span className="text-[10px] text-amber-500/80 italic block text-center py-1">
                          ఇంకా ఏ బూతులు లేదా గ్రామాలు కేటాయించలేదు
                        </span>
                      )}
                    </div>

                    {/* Timer & Expiry Status */}
                    <div className="flex items-center justify-between gap-1 flex-wrap pt-1">
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
                        >
                          +30ని.
                        </button>
                        <button
                          type="button"
                          onClick={() => handleExtend(a.id, 60)}
                          className="px-2 py-0.5 rounded bg-amber-500/20 hover:bg-amber-500 hover:text-slate-950 text-amber-300 text-[9.5px] font-bold border border-amber-500/30 transition-all cursor-pointer"
                        >
                          +1గం.
                        </button>
                        {a.expiresAt && (
                          <button
                            type="button"
                            onClick={() => handleMakeUnlimited(a.id)}
                            className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-[9.5px] font-bold border border-slate-700 transition-all cursor-pointer"
                          >
                            అపరిమితం
                          </button>
                        )}
                      </div>
                    </div>

                    {/* WhatsApp 1-Click Send & Copy Buttons */}
                    <div className="grid grid-cols-2 gap-2 pt-1 border-t border-slate-800/80">
                      <button
                        type="button"
                        onClick={() => handleOpenWhatsApp(a)}
                        className="py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-black flex items-center justify-center gap-1.5 shadow-md shadow-emerald-950/40 transition-all active:scale-98 cursor-pointer"
                      >
                        <Send className="w-3.5 h-3.5" />
                        <span>వాట్సాప్‌లో పంపండి</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => handleCopyMessage(a)}
                        className="py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 border border-slate-700 transition-all active:scale-98 cursor-pointer"
                      >
                        {copiedId === a.id ? (
                          <>
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                            <span className="text-emerald-300 font-bold">కాపీ అయ్యింది!</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3.5 h-3.5 text-amber-400" />
                            <span>వివరాలు కాపీ చేయండి</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
          </>
          )}
        </div>

        {/* Footer Note */}
        <div className="pt-2 border-t border-slate-800 text-center flex-shrink-0">
          <p className="text-[10px] text-slate-500 flex items-center justify-center gap-1">
            <ShieldCheck className="w-3 h-3 text-emerald-500" />
            <span>వాలంటీర్లు తమ మొబైల్ నంబర్‌తో లాగిన్ అయినప్పుడు మాత్రమే పైన కేటాయించిన గ్రామాలు / బూతులు కనిపిస్తాయి.</span>
          </p>
        </div>
      </div>
    </div>
  );
};

export default AdminAssignmentModal;
