import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import {
  X,
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  Zap,
  Search,
  Copy,
  Check,
  Download,
  Filter,
  Eye,
  Sparkles,
  Maximize2,
  Minimize2,
  ZoomIn,
  ZoomOut,
  Phone,
  PhoneCall,
  MessageSquare,
  UserCheck,
  Star,
  Clock,
  Edit3,
  Home,
  FileText,
  Globe,
  Save,
  CheckSquare,
  Building2,
  Navigation,
  ChevronsLeft,
  ChevronsRight,
  ArrowRight
} from 'lucide-react';
import {
  MobileVoter,
  BoothInfo,
  VoterSurveyStatus,
  VoterCampaignProfile
} from '../types';
import { resolveCardUrl } from '../utils/photoResolver';
import { saveVoterProfile } from '../utils/storage';
import {
  parseNameAndSurname,
  transliterateEnglishToTelugu,
  ParsedNameDetails
} from '../utils/teluguTransliterator';

interface ReOcrReviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  voters: MobileVoter[];
  boothId?: string;
  language?: 'te' | 'en';
  initialWard?: string;
  initialSno?: number;
  onUpdateVoters?: (updatedVoters: MobileVoter[]) => void;
  profiles?: Record<number, VoterCampaignProfile>;
  boothInfo?: BoothInfo;
  onSavePhone?: (voter: MobileVoter, phone: string, altPhone?: string) => void;
  onOpenPhoneEditor?: (voter: MobileVoter) => void;
  onOpenSupportPicker?: (title: string, currentPct: number, currentNotes?: string, voterSno?: number) => void;
  onOpenLogVisit?: (voter: MobileVoter) => void;
  onOpenInfluencerAssign?: (targetName: string, currentInfId?: string, voterSno?: number) => void;
  onUpdateSurveyMark?: (serialNo: number, status: VoterSurveyStatus | null) => void;
  onQuickToggleOurs?: (serialNo: number) => void;
  onQuickToggleVoted?: (serialNo: number) => void;
  onOpenSlip?: (voter: MobileVoter) => void;
  onUpdateProfile?: (serialNo: number, updates: Partial<VoterCampaignProfile>) => void;
}

type FilterMode = 'all' | 'marked' | 'suspected';

export const ReOcrReviewModal: React.FC<ReOcrReviewModalProps> = ({
  isOpen,
  onClose,
  voters,
  boothId = 'gp_durgada',
  language = 'te',
  initialWard,
  initialSno,
  onUpdateVoters,
  profiles = {},
  boothInfo,
  onSavePhone,
  onOpenPhoneEditor,
  onOpenSupportPicker,
  onOpenLogVisit,
  onOpenInfluencerAssign,
  onUpdateSurveyMark,
  onQuickToggleOurs,
  onQuickToggleVoted,
  onOpenSlip,
  onUpdateProfile,
}) => {
  // Storage keys for persistence
  const storageKey = `reocr_marked_snos_${boothId}`;
  const lastWardKey = `reocr_last_ward_${boothId}`;
  const lastSnoKey = `reocr_last_sno_${boothId}`;

  // Marked S.Nos state (persisted in localStorage)
  const [markedSnos, setMarkedSnos] = useState<Set<number>>(() => {
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        const arr = JSON.parse(saved);
        if (Array.isArray(arr)) {
          return new Set(arr.map(Number));
        }
      }
    } catch (e) {
      // fallback
    }
    return new Set<number>();
  });

  // Compute available wards in this dataset
  interface WardMeta {
    wardNo: number;
    count: number;
    startSno: number;
  }

  const wardList: WardMeta[] = useMemo(() => {
    const map = new Map<number, { count: number; startSno: number }>();
    voters.forEach(v => {
      const w = v.ward_no ?? (v as any).w;
      if (w !== undefined && w !== null && w !== '') {
        const num = Number(w);
        if (!isNaN(num) && num > 0) {
          const sno = Number(v.s || v.sno || 0);
          const existing = map.get(num);
          if (!existing) {
            map.set(num, { count: 1, startSno: sno });
          } else {
            existing.count += 1;
            if (sno > 0 && (existing.startSno === 0 || sno < existing.startSno)) {
              existing.startSno = sno;
            }
          }
        }
      }
    });

    return Array.from(map.entries())
      .map(([wardNo, meta]) => ({
        wardNo,
        count: meta.count,
        startSno: meta.startSno,
      }))
      .sort((a, b) => a.wardNo - b.wardNo);
  }, [voters]);

  // Selected Ward State (initialized from initialWard or localStorage)
  const [selectedWard, setSelectedWard] = useState<string>(() => {
    if (initialWard && initialWard !== 'all') {
      return initialWard;
    }
    try {
      const saved = localStorage.getItem(lastWardKey);
      if (saved) return saved;
    } catch (e) {}
    return 'all';
  });

  // Current view index in the filtered list
  const [filterMode, setFilterMode] = useState<FilterMode>('all');
  const [currentIndex, setCurrentIndex] = useState<number>(0);
  const [jumpInput, setJumpInput] = useState<string>('');
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [processStatus, setProcessStatus] = useState<string | null>(null);
  const [copiedSnos, setCopiedSnos] = useState<boolean>(false);
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [imageError, setImageError] = useState<boolean>(false);
  const [imageFallbackIndex, setImageFallbackIndex] = useState<number>(0);
  const [zoomLevel, setZoomLevel] = useState<number>(100);

  // Sync marked S.Nos to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(storageKey, JSON.stringify(Array.from(markedSnos)));
    } catch (e) {
      // ignore
    }
  }, [markedSnos, storageKey]);

  // Heuristic suspicion check: Does this card have potential OCR or transliteration mismatch?
  const isSuspected = useCallback((v: MobileVoter): boolean => {
    const nameTe = (v.name_te || '').trim();
    const epic = (v.epic || v.id || '').trim();

    // 1. Noise characters in Telugu name (. : , ? / #)
    if (/[.:;,?\/#!@$%^*_=+<>|~`0-9]/.test(nameTe)) return true;

    // 2. Suspiciously short name
    if (nameTe.length > 0 && nameTe.length < 3) return true;

    // 3. No EPIC or invalid EPIC
    if (!epic || epic.length < 5 || epic.includes('UNKNOWN')) return true;

    return false;
  }, []);

  // Base list filtered by ward
  const wardFilteredVoters = useMemo(() => {
    if (selectedWard === 'all') return voters;
    return voters.filter(v => {
      const w = v.ward_no ?? (v as any).w;
      return String(w) === selectedWard;
    });
  }, [voters, selectedWard]);

  // Filtered list based on active tab and ward
  const activeList = useMemo(() => {
    if (filterMode === 'marked') {
      return wardFilteredVoters.filter(v => markedSnos.has(Number(v.s || v.sno)));
    }
    if (filterMode === 'suspected') {
      return wardFilteredVoters.filter(v => isSuspected(v));
    }
    return wardFilteredVoters;
  }, [wardFilteredVoters, filterMode, markedSnos, isSuspected]);

  // Total counts for badges in the active ward
  const suspectedCount = useMemo(() => {
    return wardFilteredVoters.filter(v => isSuspected(v)).length;
  }, [wardFilteredVoters, isSuspected]);

  const markedInWardCount = useMemo(() => {
    return wardFilteredVoters.filter(v => markedSnos.has(Number(v.s || v.sno))).length;
  }, [wardFilteredVoters, markedSnos]);

  // Bound index safely
  const safeIndex = Math.min(Math.max(0, currentIndex), Math.max(0, activeList.length - 1));
  const currentVoter: MobileVoter | undefined = activeList[safeIndex];
  const currentSno = currentVoter ? Number(currentVoter.s || currentVoter.sno) : 0;
  const isCurrentMarked = currentSno > 0 && markedSnos.has(currentSno);

  // Keep localStorage updated with current position
  useEffect(() => {
    if (currentSno > 0) {
      try {
        localStorage.setItem(lastSnoKey, String(currentSno));
        localStorage.setItem(lastWardKey, selectedWard);
      } catch (e) {}
    }
  }, [currentSno, selectedWard, lastSnoKey, lastWardKey]);

  // Handle initialWard, initialSno, or restore last position on open
  useEffect(() => {
    if (!isOpen) return;

    if (initialSno) {
      const targetVoter = voters.find(v => Number(v.s || v.sno) === Number(initialSno));
      if (targetVoter) {
        const targetWard = targetVoter.ward_no ? String(targetVoter.ward_no) : 'all';
        if (selectedWard !== targetWard && selectedWard !== 'all') {
          setSelectedWard(targetWard);
        }
        const idx = activeList.findIndex(v => Number(v.s || v.sno) === Number(initialSno));
        if (idx !== -1) {
          setCurrentIndex(idx);
          return;
        }
      }
    }

    if (initialWard && initialWard !== selectedWard) {
      setSelectedWard(initialWard);
      setCurrentIndex(0);
      return;
    }

    // Restore last viewed S.No from localStorage
    try {
      const savedSno = Number(localStorage.getItem(lastSnoKey));
      if (savedSno && !isNaN(savedSno)) {
        const idx = activeList.findIndex(v => Number(v.s || v.sno) === savedSno);
        if (idx !== -1) {
          setCurrentIndex(idx);
        }
      }
    } catch (e) {}
  }, [isOpen, initialSno, initialWard]);

  // Campaign Profile for current voter
  const currentProf: VoterCampaignProfile = currentSno ? (profiles[currentSno] || {}) : {};
  const currentPct = currentProf.supportPct;

  // Quick Phone Edit & Entry State
  const phoneInputRef = useRef<HTMLInputElement>(null);
  const [localPhones, setLocalPhones] = useState<Record<number, string>>({});
  const [isEditingPhone, setIsEditingPhone] = useState<boolean>(false);
  const [quickPhoneInput, setQuickPhoneInput] = useState<string>('');
  const [phoneSaveNotice, setPhoneSaveNotice] = useState<string | null>(null);

  // Effective Phone for current voter (local override > saved customPhone > original k_m)
  const effectivePhone = currentSno && localPhones[currentSno] !== undefined
    ? localPhones[currentSno]
    : (currentProf.customPhone || currentVoter?.k_m || '');

  // Reset phone edit state on voter change
  useEffect(() => {
    setIsEditingPhone(false);
    setQuickPhoneInput('');
    setPhoneSaveNotice(null);
  }, [currentSno]);

  // Handler: Quick Save Phone (Inline)
  const handleQuickSavePhone = useCallback(async () => {
    if (!currentVoter || !currentSno) return;
    const cleanDigits = quickPhoneInput.replace(/\D/g, '').slice(-10);

    // If input was empty and not editing, nothing to save
    if (!cleanDigits && !isEditingPhone) return;

    try {
      // 1. Local component override for instant UI feedback
      setLocalPhones(prev => ({
        ...prev,
        [currentSno]: cleanDigits
      }));

      // 2. Persist to storage & disk
      saveVoterProfile(boothId, currentSno, { customPhone: cleanDigits || undefined });

      // 3. Inform parent component
      onUpdateProfile?.(currentSno, { customPhone: cleanDigits || undefined });
      onSavePhone?.(currentVoter, cleanDigits);

      // 4. API sync to dev server if available
      if (typeof fetch !== 'undefined') {
        fetch('/api/save-profiles', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            partNo: boothId,
            profiles: {
              [currentSno]: {
                ...currentProf,
                customPhone: cleanDigits || undefined
              }
            }
          })
        }).catch(() => {});
      }

      setIsEditingPhone(false);
      setQuickPhoneInput('');
      setPhoneSaveNotice(cleanDigits ? (language === 'te' ? '✓ ఫోన్ సేవ్ అయ్యింది' : '✓ Phone Saved') : (language === 'te' ? '✓ ఫోన్ తొలగించబడింది' : '✓ Cleared'));
      setTimeout(() => setPhoneSaveNotice(null), 2500);
    } catch (err) {
      console.error('Failed to save quick phone:', err);
    }
  }, [currentVoter, currentSno, quickPhoneInput, isEditingPhone, boothId, currentProf, onUpdateProfile, onSavePhone, language]);

  const isOurs = (currentPct === 100 || currentProf.survey_status === 'supporter') && currentPct !== 50;
  const isVoted = currentProf.survey_status === 'voted';
  const isOutOfCity = currentProf.survey_status === 'out_of_city';
  const isDeceased = currentProf.survey_status === 'deceased';

  // Name & Surname Edit state
  const [isEditingName, setIsEditingName] = useState<boolean>(false);
  const [editFirstNameTe, setEditFirstNameTe] = useState<string>('');
  const [editSurnameTe, setEditSurnameTe] = useState<string>('');
  const [editFirstNameEn, setEditFirstNameEn] = useState<string>('');
  const [editSurnameEn, setEditSurnameEn] = useState<string>('');
  const [isSavingName, setIsSavingName] = useState<boolean>(false);
  const [nameSaveSuccess, setNameSaveSuccess] = useState<boolean>(false);

  // Compute parsed name details for current voter
  const parsedName: ParsedNameDetails | null = useMemo(() => {
    if (!currentVoter) return null;
    return parseNameAndSurname(currentVoter);
  }, [currentVoter]);

  // Sync edit form fields whenever current voter changes
  useEffect(() => {
    if (parsedName) {
      setEditFirstNameTe(parsedName.firstNameTe);
      setEditSurnameTe(parsedName.surnameTe);
      setEditFirstNameEn(parsedName.firstNameEn);
      setEditSurnameEn(parsedName.surnameEn);
      setIsEditingName(false);
      setNameSaveSuccess(false);
    }
  }, [currentSno, parsedName]);

  // Handler: "Select English as Correct" (1-Click Auto-Fix Telugu from English)
  const handleSelectEnglishAsCorrect = useCallback(() => {
    if (!parsedName) return;
    const transFirst = transliterateEnglishToTelugu(parsedName.firstNameEn);
    const transSurname = transliterateEnglishToTelugu(parsedName.surnameEn);
    setEditFirstNameTe(transFirst);
    setEditSurnameTe(transSurname);
    setEditFirstNameEn(parsedName.firstNameEn);
    setEditSurnameEn(parsedName.surnameEn);
    setIsEditingName(true);
  }, [parsedName]);

  // Handler: Save & Sync Corrected Name Permanently
  const handleSaveNameAndSync = async () => {
    if (!currentVoter || !currentSno) return;
    const cleanFirstTe = editFirstNameTe.trim();
    const cleanSurnameTe = editSurnameTe.trim();
    const cleanFirstEn = editFirstNameEn.trim().toUpperCase();
    const cleanSurnameEn = editSurnameEn.trim().toUpperCase();

    const fullTe = cleanSurnameTe && cleanFirstTe !== cleanSurnameTe
      ? `${cleanFirstTe} ${cleanSurnameTe}`
      : (cleanFirstTe || currentVoter.name_te || '');

    const fullEn = cleanSurnameEn && cleanFirstEn !== cleanSurnameEn
      ? `${cleanFirstEn} ${cleanSurnameEn}`
      : (cleanFirstEn || currentVoter.name_en || '');

    setIsSavingName(true);
    try {
      const res = await fetch('/api/update-voter-name', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          booth: boothId,
          sno: currentSno,
          name_te: fullTe,
          name_en: fullEn,
          surname_te: cleanSurnameTe,
          surname_en: cleanSurnameEn
        })
      });

      const data = await res.json();
      if (data.success && data.updatedVoter) {
        if (onUpdateVoters) {
          onUpdateVoters([data.updatedVoter]);
        }
        if (onUpdateProfile) {
          onUpdateProfile(currentSno, {
            customAlias: fullTe,
            correctedNameTe: fullTe,
            correctedNameEn: fullEn
          });
        }
        setNameSaveSuccess(true);
        setIsEditingName(false);
        setTimeout(() => setNameSaveSuccess(false), 3000);
      } else {
        alert(`Error: ${data.error || 'Failed to update voter name'}`);
      }
    } catch (e: any) {
      alert(`Network error: ${e?.message}`);
    } finally {
      setIsSavingName(false);
    }
  };

  // Reset image error state whenever current voter changes
  useEffect(() => {
    setImageError(false);
    setImageFallbackIndex(0);
  }, [currentSno]);

  // Navigation handlers
  const handleNext = useCallback(() => {
    if (activeList.length === 0) return;
    setCurrentIndex(prev => (prev + 1 < activeList.length ? prev + 1 : 0));
  }, [activeList.length]);

  const handlePrev = useCallback(() => {
    if (activeList.length === 0) return;
    setCurrentIndex(prev => (prev - 1 >= 0 ? prev - 1 : activeList.length - 1));
  }, [activeList.length]);

  const handleToggleCurrentMark = useCallback(() => {
    if (!currentSno) return;
    setMarkedSnos(prev => {
      const next = new Set(prev);
      if (next.has(currentSno)) {
        next.delete(currentSno);
      } else {
        next.add(currentSno);
      }
      return next;
    });
  }, [currentSno]);

  // Ground Campaign Action Handlers
  const handleToggleOurs = useCallback(() => {
    if (!currentSno) return;
    if (onQuickToggleOurs) {
      onQuickToggleOurs(currentSno);
    } else if (onUpdateSurveyMark) {
      onUpdateSurveyMark(currentSno, isOurs ? null : 'supporter');
    }
  }, [currentSno, onQuickToggleOurs, onUpdateSurveyMark, isOurs]);

  const handleToggleVoted = useCallback(() => {
    if (!currentSno) return;
    if (onQuickToggleVoted) {
      onQuickToggleVoted(currentSno);
    } else if (onUpdateSurveyMark) {
      onUpdateSurveyMark(currentSno, isVoted ? null : 'voted');
    }
  }, [currentSno, onQuickToggleVoted, onUpdateSurveyMark, isVoted]);

  const handleToggleOutOfCity = useCallback(() => {
    if (!currentSno || !onUpdateSurveyMark) return;
    onUpdateSurveyMark(currentSno, isOutOfCity ? null : 'out_of_city');
  }, [currentSno, onUpdateSurveyMark, isOutOfCity]);

  const handleToggleDeceased = useCallback(() => {
    if (!currentSno || !onUpdateSurveyMark) return;
    onUpdateSurveyMark(currentSno, isDeceased ? null : 'deceased');
  }, [currentSno, onUpdateSurveyMark, isDeceased]);

  const handleSendWhatsAppSlip = useCallback(() => {
    if (!currentVoter) return;
    const epic = currentVoter.epic || currentVoter.id || '-';
    const doorNo = currentVoter.house_no || currentVoter.door_no || currentVoter.hn || '-';
    const station = currentVoter.sec || currentVoter.polling_station_name || boothInfo?.ps_address || '-';

    const text = `🗳️ *ఓటర్ సమాచార పత్రం — పిఠాపురం నియోజకవర్గం (AC #37)*\n\nనమస్తే *${currentVoter.n}* గారు,\n\nమీ అధికారిక ఓటర్ సమాచారం:\n🔢 *క్రమ సంఖ్య (S.No):* #${currentSno}\n🆔 *ఓటర్ ఐడీ (EPIC):* ${epic}\n🏠 *ఇంటి నెం:* ${doorNo}\n🏛️ *పోలింగ్ కేంద్రం:* ${station}\n⏰ *పోలింగ్ సమయం:* ఉదయం 7:00 నుండి సాయంత్రం 5:00 వరకు\n\n_దయచేసి మీ ఓటు హక్కును సద్వినియోగం చేసుకోండి!_`;

    const cleanPhone = (effectivePhone || '').replace(/\D/g, '').slice(-10);
    const waUrl = cleanPhone
      ? `https://wa.me/91${cleanPhone}?text=${encodeURIComponent(text)}`
      : `https://wa.me/?text=${encodeURIComponent(text)}`;
    window.open(waUrl, '_blank');
  }, [currentVoter, currentSno, effectivePhone, boothInfo]);

  // Handler: Select Ward
  const handleSelectWard = (newWard: string) => {
    setSelectedWard(newWard);
    setCurrentIndex(0);
    try {
      localStorage.setItem(lastWardKey, newWard);
    } catch (e) {}
  };

  // Handler: Step jump (+10 / -10)
  const handleStepJump = (offset: number) => {
    setCurrentIndex(prev => Math.min(Math.max(0, prev + offset), Math.max(0, activeList.length - 1)));
  };

  // Handler: Jump to First / Last
  const handleJumpToFirst = () => {
    setCurrentIndex(0);
  };

  const handleJumpToLast = () => {
    setCurrentIndex(Math.max(0, activeList.length - 1));
  };

  // Handler: Universal Jump (S.No, EPIC, or Name)
  const handleSearchOrJump = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const query = jumpInput.trim();
    if (!query) return;

    const queryNum = parseInt(query.replace(/^#+/, ''), 10);
    const upperQuery = query.toUpperCase();

    // 1. Check by S.No
    let matchedVoter: MobileVoter | undefined;
    if (!isNaN(queryNum)) {
      matchedVoter = voters.find(v => Number(v.s || v.sno) === queryNum);
    }

    // 2. Check by EPIC
    if (!matchedVoter) {
      matchedVoter = voters.find(v => {
        const epic = (v.epic || v.id || '').toUpperCase();
        return epic === upperQuery || epic.includes(upperQuery);
      });
    }

    // 3. Check by Name (Telugu or English)
    if (!matchedVoter) {
      matchedVoter = voters.find(v => {
        const nTe = (v.name_te || v.n || '').toLowerCase();
        const nEn = (v.name_en || '').toLowerCase();
        const qLow = query.toLowerCase();
        return nTe.includes(qLow) || nEn.includes(qLow);
      });
    }

    if (matchedVoter) {
      const vSno = Number(matchedVoter.s || matchedVoter.sno);
      const vWard = matchedVoter.ward_no ? String(matchedVoter.ward_no) : 'all';

      // Auto switch ward if the voter is in another ward
      if (selectedWard !== 'all' && String(matchedVoter.ward_no) !== selectedWard) {
        setSelectedWard(vWard);
      }
      if (filterMode !== 'all') {
        setFilterMode('all');
      }

      setTimeout(() => {
        const listToSearch = (selectedWard !== 'all' && String(matchedVoter!.ward_no) !== selectedWard)
          ? voters.filter(v => String(v.ward_no ?? (v as any).w) === vWard)
          : activeList;
        
        const idx = listToSearch.findIndex(v => Number(v.s || v.sno) === vSno);
        if (idx !== -1) {
          setCurrentIndex(idx);
        } else {
          const allIdx = voters.findIndex(v => Number(v.s || v.sno) === vSno);
          if (allIdx !== -1) {
            setSelectedWard('all');
            setFilterMode('all');
            setCurrentIndex(allIdx);
          }
        }
      }, 50);

      setProcessStatus(
        language === 'te'
          ? `✓ కార్డు #${vSno} వద్దకు జంప్ అయ్యారు (${matchedVoter.name_te || matchedVoter.n})`
          : `✓ Jumped to card #${vSno} (${matchedVoter.name_en || matchedVoter.n})`
      );
      setTimeout(() => setProcessStatus(null), 3500);
      setJumpInput('');
    } else {
      alert(
        language === 'te'
          ? `"${query}" తో ఏ ఓటరు లేదా కార్డు లభించలేదు`
          : `No voter or card found matching "${query}"`
      );
    }
  };

  // Keyboard navigation listener (Space = Toggle Mark, Enter/Right = Next, Left = Prev, Esc = Close)
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      const targetTag = (e.target as HTMLElement)?.tagName?.toLowerCase();
      if (targetTag === 'input' || targetTag === 'textarea') return;

      if (e.code === 'Space') {
        e.preventDefault();
        handleToggleCurrentMark();
      } else if (e.code === 'KeyP' || e.key === 'p' || e.key === 'P') {
        e.preventDefault();
        if (effectivePhone && !isEditingPhone) {
          setQuickPhoneInput(effectivePhone);
          setIsEditingPhone(true);
        }
        setTimeout(() => phoneInputRef.current?.focus(), 50);
      } else if (e.code === 'Enter' || e.code === 'ArrowRight') {
        e.preventDefault();
        handleNext();
      } else if (e.code === 'ArrowLeft') {
        e.preventDefault();
        handlePrev();
      } else if (e.code === 'Escape') {
        e.preventDefault();
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, handleToggleCurrentMark, handleNext, handlePrev, onClose, effectivePhone, isEditingPhone]);

  // Card image candidates with fallbacks
  const cardImageUrls = useMemo(() => {
    if (!currentVoter) return [];
    const sno = Number(currentVoter.s || currentVoter.sno);
    const epic = (currentVoter.epic || currentVoter.id || '').trim();
    const padded = String(sno).padStart(4, '0');

    const urls: string[] = [];
    if (currentVoter.card) urls.push(currentVoter.card);
    if (currentVoter.card_url && currentVoter.card_url !== currentVoter.card) urls.push(currentVoter.card_url);
    urls.push(`/cards/durgada/card_${sno}.png`);
    if (epic) {
      urls.push(`/cards/durgada/card_sno_${padded}_${epic}.png`);
    }
    return Array.from(new Set(urls));
  }, [currentVoter]);

  const currentImageUrl = cardImageUrls[imageFallbackIndex] || cardImageUrls[0];
  const resolvedImageUrl = resolveCardUrl(currentImageUrl);

  const handleImageError = () => {
    if (imageFallbackIndex + 1 < cardImageUrls.length) {
      setImageFallbackIndex(prev => prev + 1);
    } else {
      setImageError(true);
    }
  };

  // Copy text helper
  const handleCopy = (text: string, fieldId: string) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopiedField(fieldId);
    setTimeout(() => setCopiedField(null), 1800);
  };

  // Copy marked S.Nos
  const handleCopyMarkedSnos = () => {
    const list = Array.from(markedSnos).sort((a, b) => a - b);
    if (list.length === 0) return;
    navigator.clipboard.writeText(list.join(', '));
    setCopiedSnos(true);
    setTimeout(() => setCopiedSnos(false), 2000);
  };

  // Run Re-OCR API (single or batch)
  const handleRunReOcr = async (targetSnos: number[]) => {
    if (targetSnos.length === 0) return;
    setIsProcessing(true);
    setProcessStatus(
      language === 'te'
        ? `${targetSnos.length} కార్డులకు Re-OCR జరుగుతోంది...`
        : `Running Re-OCR on ${targetSnos.length} cards...`
    );

    try {
      const res = await fetch('/api/run-reocr', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ snos: targetSnos, booth: boothId })
      });

      const data = await res.json();
      if (data.success && data.updatedVoters && onUpdateVoters) {
        onUpdateVoters(data.updatedVoters);
        setMarkedSnos(prev => {
          const next = new Set(prev);
          targetSnos.forEach(s => next.delete(s));
          return next;
        });
        setProcessStatus(
          language === 'te'
            ? `✓ ${data.count} కార్డుల రీ-ఓసీఆర్ విజయవంతంగా పూర్తయింది!`
            : `✓ Re-OCR completed successfully for ${data.count} cards!`
        );
      } else {
        setProcessStatus(`Error: ${data.error || 'Re-OCR failed'}`);
      }
    } catch (e: any) {
      setProcessStatus(`Network/API error: ${e?.message}`);
    } finally {
      setIsProcessing(false);
      setTimeout(() => setProcessStatus(null), 4000);
    }
  };

  // Support leaning badge
  const renderLeaningBadge = (pct?: number) => {
    if (pct === undefined) {
      return (
        <span className="px-2.5 py-1 bg-slate-800 text-slate-400 border border-slate-700 rounded-lg text-xs font-medium flex items-center gap-1 shadow-sm">
          ⚪ {language === 'te' ? 'సర్వే కాలేదు' : 'Unsurveyed'}
        </span>
      );
    }
    if (pct === 100) {
      return (
        <span className="px-2.5 py-1 bg-emerald-600/30 text-emerald-300 border border-emerald-500/50 rounded-lg text-xs font-black flex items-center gap-1 shadow-sm">
          ⭐ {language === 'te' ? '100% మనవాళ్లే' : '100% Support'}
        </span>
      );
    }
    if (pct >= 75) {
      return (
        <span className="px-2.5 py-1 bg-emerald-600/30 text-emerald-300 border border-emerald-500/50 rounded-lg text-xs font-black flex items-center gap-1 shadow-sm">
          🟢 {pct}% {language === 'te' ? 'అనుకూలం' : 'Strong'}
        </span>
      );
    }
    if (pct === 40) {
      return (
        <span className="px-2.5 py-1 bg-amber-600/30 text-amber-300 border border-amber-500/50 rounded-lg text-xs font-black flex items-center gap-1 shadow-sm">
          🟡 40% {language === 'te' ? 'సానుకూలం' : 'Leaning'}
        </span>
      );
    }
    return (
      <span className="px-2.5 py-1 bg-rose-900/40 text-rose-300 border border-rose-500/50 rounded-lg text-xs font-black flex items-center gap-1 shadow-sm">
        🔴 0% {language === 'te' ? 'ప్రత్యర్థులు' : 'Opponent'}
      </span>
    );
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[120] bg-black/95 backdrop-blur-md flex flex-col justify-between text-slate-100 select-none">
      {/* 1. TOP HEADER BAR */}
      <div className="bg-slate-900/98 border-b border-slate-800 px-3 sm:px-4 py-2.5 flex items-center justify-between flex-wrap gap-2.5 shrink-0">
        <div className="flex items-center gap-2.5 sm:gap-3">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-amber-500 via-orange-500 to-amber-600 flex items-center justify-center text-white shadow-lg shadow-amber-500/25 shrink-0">
            <Sparkles className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm sm:text-base font-black tracking-wide text-white">
                {language === 'te' ? 'రీ-ఓసీఆర్ రివ్యూ & ఓటర్ స్టూడియో' : 'Re-OCR Review & Voter Studio'}
              </h2>
              <span className="text-[10px] bg-amber-500/20 border border-amber-500/40 text-amber-300 px-2 py-0.5 rounded font-mono font-black">
                1 ITEM / SCREEN
              </span>
            </div>
            <p className="text-[11px] text-slate-400 hidden md:block">
              {language === 'te'
                ? 'స్పేస్ [Space]: రీ-ఓసీఆర్ ఎంపిక • ఎంటర్ [Enter]: తర్వాతి కార్డు • 1-ట్యాప్ మనవాళ్లే, ఫోన్, లీడర్, స్లిప్'
                : 'Space: Toggle Re-OCR • Enter: Next Card • 1-Tap Support, Phone, Leader, WhatsApp Slip'}
            </p>
          </div>
        </div>

        {/* WARD SELECTOR DROPDOWN */}
        {wardList.length > 0 && (
          <div className="flex items-center gap-1.5 bg-slate-950/90 px-2.5 py-1 rounded-xl border border-slate-800 shadow-inner">
            <Building2 className="w-3.5 h-3.5 text-amber-400 shrink-0" />
            <span className="text-xs text-slate-400 font-bold hidden sm:inline">
              {language === 'te' ? 'వార్డు:' : 'Ward:'}
            </span>
            <select
              value={selectedWard}
              onChange={e => handleSelectWard(e.target.value)}
              className="bg-slate-900 border border-slate-700 text-amber-300 font-bold text-xs rounded-lg px-2 py-1 focus:outline-none focus:border-amber-400 cursor-pointer"
            >
              <option value="all">
                {language === 'te' ? `🏛️ మొత్తం గ్రామం (${voters.length})` : `🏛️ All Wards (${voters.length})`}
              </option>
              {wardList.map(w => (
                <option key={w.wardNo} value={String(w.wardNo)}>
                  🏛️ {language === 'te' ? `${w.wardNo}వ వార్డు (${w.count} ఓటర్లు • #${w.startSno} నుండి)` : `Ward #${w.wardNo} (${w.count} voters • from #${w.startSno})`}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Filter Pills */}
        <div className="flex items-center gap-1 bg-slate-950/90 p-1 rounded-xl border border-slate-800">
          <button
            type="button"
            onClick={() => { setFilterMode('all'); setCurrentIndex(0); }}
            className={`px-2.5 sm:px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              filterMode === 'all'
                ? 'bg-amber-500 text-slate-950 shadow-md font-black'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            {language === 'te' ? `అన్నీ (${wardFilteredVoters.length})` : `All (${wardFilteredVoters.length})`}
          </button>

          <button
            type="button"
            onClick={() => { setFilterMode('marked'); setCurrentIndex(0); }}
            className={`px-2 sm:px-3 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1 cursor-pointer ${
              filterMode === 'marked'
                ? 'bg-amber-500 text-slate-950 shadow-md font-black'
                : markedInWardCount > 0
                  ? 'text-amber-400 hover:text-amber-300'
                  : 'text-slate-500 hover:text-slate-300'
            }`}
          >
            <span>{language === 'te' ? 'మార్క్ చేసినవి' : 'Marked'}</span>
            <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-black ${
              filterMode === 'marked' ? 'bg-slate-950 text-amber-300' : 'bg-amber-500/20 text-amber-300'
            }`}>
              {markedInWardCount}
            </span>
          </button>

          <button
            type="button"
            onClick={() => { setFilterMode('suspected'); setCurrentIndex(0); }}
            className={`px-2 sm:px-3 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1 cursor-pointer ${
              filterMode === 'suspected'
                ? 'bg-red-500 text-white shadow-md font-black'
                : 'text-red-400 hover:text-red-300'
            }`}
          >
            <AlertTriangle className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">{language === 'te' ? 'అనుమానాస్పద' : 'Suspected'}</span>
            <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-black ${
              filterMode === 'suspected' ? 'bg-white text-red-600' : 'bg-red-500/20 text-red-300'
            }`}>
              {suspectedCount}
            </span>
          </button>
        </div>

        {/* Universal Jump / Search Box & Close */}
        <div className="flex items-center gap-2">
          <form onSubmit={handleSearchOrJump} className="flex items-center gap-1">
            <input
              type="text"
              placeholder={language === 'te' ? "S.No / EPIC / పేరు..." : "S.No / EPIC / Name..."}
              value={jumpInput}
              onChange={e => setJumpInput(e.target.value)}
              className="w-28 sm:w-36 px-2.5 py-1 bg-slate-950 border border-slate-700 rounded-lg text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-400 font-bold"
            />
            <button
              type="submit"
              className="px-2.5 py-1 bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 text-white rounded-lg text-xs font-black cursor-pointer shadow-sm active:scale-95"
            >
              {language === 'te' ? 'జంప్' : 'Go'}
            </button>
          </form>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors cursor-pointer"
            title="Close (Esc)"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* 1.5 SUB-BAR: QUICK WARD JUMP PILLS */}
      {wardList.length > 1 && (
        <div className="bg-slate-950/90 border-b border-slate-800/80 px-3 sm:px-4 py-1.5 flex items-center gap-1.5 overflow-x-auto no-scrollbar shrink-0 text-xs">
          <span className="text-[11px] text-slate-400 font-bold shrink-0 flex items-center gap-1 pr-1">
            <Navigation className="w-3 h-3 text-amber-400" />
            <span>{language === 'te' ? 'వార్డు జంప్:' : 'Quick Ward:'}</span>
          </span>

          <button
            type="button"
            onClick={() => handleSelectWard('all')}
            className={`px-2.5 py-0.5 rounded-lg font-bold text-xs transition-all whitespace-nowrap cursor-pointer ${
              selectedWard === 'all'
                ? 'bg-amber-500 text-slate-950 font-black shadow-md ring-1 ring-amber-300'
                : 'bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800'
            }`}
          >
            {language === 'te' ? `మొత్తం (${voters.length})` : `All (${voters.length})`}
          </button>

          {wardList.map(w => {
            const isSel = selectedWard === String(w.wardNo);
            return (
              <button
                key={w.wardNo}
                type="button"
                onClick={() => handleSelectWard(String(w.wardNo))}
                className={`px-2.5 py-0.5 rounded-lg font-bold text-xs transition-all whitespace-nowrap cursor-pointer flex items-center gap-1 ${
                  isSel
                    ? 'bg-amber-500 text-slate-950 font-black shadow-md ring-1 ring-amber-300'
                    : 'bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-800'
                }`}
                title={`వార్డు #${w.wardNo}: ${w.count} ఓటర్లు (S.No #${w.startSno} నుండి)`}
              >
                <span>W-{w.wardNo}</span>
                <span className={`text-[10px] ${isSel ? 'text-slate-950 font-black' : 'text-slate-500'}`}>
                  ({w.count})
                </span>
              </button>
            );
          })}
        </div>
      )}

      {/* 2. MAIN CENTER: FULL SPACE UTILIZATION (WIDE CONTAINER & BIG CARD ZOOM) */}
      <div className="flex-1 overflow-y-auto p-2 sm:p-4 md:p-5 flex flex-col items-center justify-center">
        {activeList.length === 0 ? (
          <div className="text-center py-12 px-6 max-w-md bg-slate-900/80 rounded-2xl border border-slate-800">
            <CheckCircle2 className="w-12 h-12 text-emerald-400 mx-auto mb-3" />
            <h3 className="text-base font-bold text-white mb-1">
              {filterMode === 'marked'
                ? (language === 'te' ? 'రీ-ఓసీఆర్ కోసం ఏ కార్డులూ ఎంపిక చేయలేదు' : 'No cards marked for Re-OCR yet')
                : (language === 'te' ? 'కార్డులు లేవు' : 'No cards match this filter')}
            </h3>
            <p className="text-xs text-slate-400 mb-4">
              {language === 'te'
                ? 'అన్ని కార్డుల జాబితాకు వెళ్లి స్పేస్ బార్ (Space) నొక్కి రీ-ఓసీఆర్ చేయాల్సిన కార్డులను ఎంపిక చేయండి.'
                : 'Switch to All Cards and press Space to mark cards that require Re-OCR.'}
            </p>
            <button
              type="button"
              onClick={() => setFilterMode('all')}
              className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs rounded-xl shadow-lg cursor-pointer"
            >
              {language === 'te' ? 'అన్ని కార్డులు చూపించు' : 'Show All Cards'}
            </button>
          </div>
        ) : currentVoter ? (
          <div
            className={`w-full max-w-[97vw] 2xl:max-w-[1750px] bg-slate-900/95 rounded-2xl border-2 transition-all duration-200 shadow-2xl overflow-hidden flex flex-col lg:flex-row h-full max-h-[85vh] min-h-[580px] ${
              isCurrentMarked ? 'border-amber-500 shadow-amber-500/25 ring-1 ring-amber-400/40' : 'border-slate-800'
            }`}
          >
            {/* LEFT SIDE: HIGH-RESOLUTION CROPPED CARD IMAGE + NAME & SURNAME BREAKDOWN BELOW */}
            <div className="lg:w-[56%] xl:w-[57%] bg-slate-950/95 p-3 sm:p-4 flex flex-col justify-start overflow-y-auto border-b lg:border-b-0 lg:border-r border-slate-800 relative space-y-2.5">
              {/* Card Top Toolbar: S.No, EPIC, Zoom Level Controls */}
              <div className="w-full flex items-center justify-between mb-1 flex-wrap gap-2">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="px-2.5 py-1 rounded-lg bg-amber-500/20 text-amber-300 border border-amber-500/40 font-mono font-black text-sm shadow-sm">
                    #{currentSno}
                  </span>
                  <span className="px-2.5 py-1 rounded-lg bg-slate-800/90 text-slate-200 border border-slate-700 font-mono font-bold text-xs">
                    {currentVoter.epic || currentVoter.id || 'NO EPIC'}
                  </span>
                  {currentVoter.ward_no && (
                    <span className="px-2 py-0.5 rounded-lg bg-indigo-950/90 text-indigo-300 border border-indigo-700/60 font-bold text-xs flex items-center gap-1 shadow-sm">
                      <Building2 className="w-3 h-3 text-indigo-400" />
                      <span>{language === 'te' ? `వార్డు #${currentVoter.ward_no}` : `Ward #${currentVoter.ward_no}`}</span>
                    </span>
                  )}
                </div>

                {/* ZOOM CONTROLLER */}
                <div className="flex items-center gap-1.5 bg-slate-900 border border-slate-800 rounded-xl p-1 shadow-inner">
                  <button
                    type="button"
                    onClick={() => setZoomLevel(prev => Math.max(75, prev - 25))}
                    className="p-1 hover:bg-slate-800 rounded-lg text-slate-300 hover:text-white transition-colors cursor-pointer"
                    title="Zoom Out"
                  >
                    <ZoomOut className="w-4 h-4" />
                  </button>

                  <span className="text-xs font-mono font-black text-amber-300 px-1.5 min-w-[42px] text-center">
                    {zoomLevel}%
                  </span>

                  <button
                    type="button"
                    onClick={() => setZoomLevel(prev => Math.min(250, prev + 25))}
                    className="p-1 hover:bg-slate-800 rounded-lg text-slate-300 hover:text-white transition-colors cursor-pointer"
                    title="Zoom In"
                  >
                    <ZoomIn className="w-4 h-4" />
                  </button>

                  <button
                    type="button"
                    onClick={() => setZoomLevel(100)}
                    className={`text-[10.5px] font-bold px-2 py-0.5 rounded-md transition-colors cursor-pointer ${
                      zoomLevel === 100 ? 'bg-amber-500 text-slate-950 font-black' : 'text-slate-400 hover:text-white hover:bg-slate-800'
                    }`}
                    title="Standard View (100%)"
                  >
                    100%
                  </button>
                  <button
                    type="button"
                    onClick={() => setZoomLevel(130)}
                    className={`text-[10.5px] font-bold px-2 py-0.5 rounded-md transition-colors cursor-pointer ${
                      zoomLevel === 130 ? 'bg-amber-500 text-slate-950 font-black' : 'text-slate-400 hover:text-white hover:bg-slate-800'
                    }`}
                    title="Large View (130%)"
                  >
                    130%
                  </button>
                  <button
                    type="button"
                    onClick={() => setZoomLevel(160)}
                    className={`text-[10.5px] font-bold px-2 py-0.5 rounded-md transition-colors cursor-pointer ${
                      zoomLevel === 160 ? 'bg-amber-500 text-slate-950 font-black' : 'text-slate-400 hover:text-white hover:bg-slate-800'
                    }`}
                    title="Extra Large (160%)"
                  >
                    160%
                  </button>
                </div>
              </div>

              {/* EXPANDED HIGH-RES CARD IMAGE CONTAINER (PLACED DIRECTLY ABOVE NAME VALIDATION) */}
              <div className="w-full flex-shrink-0 flex items-center justify-center p-2 sm:p-3 overflow-hidden min-h-[200px] max-h-[40vh] bg-black/60 rounded-2xl border border-slate-800/80 shadow-inner">
                {!imageError ? (
                  <div
                    style={{
                      transform: `scale(${zoomLevel / 100})`,
                      transformOrigin: 'center center',
                      transition: 'transform 0.15s ease-out'
                    }}
                    className="flex items-center justify-center w-full max-w-[960px] p-1"
                  >
                    <img
                      src={resolvedImageUrl}
                      alt={`Voter Card #${currentSno}`}
                      onError={handleImageError}
                      className="w-full h-auto max-h-[36vh] object-contain rounded-xl border-2 border-slate-700 shadow-2xl select-none"
                    />
                  </div>
                ) : (
                  <div className="text-center p-6 bg-slate-900/50 rounded-2xl border border-slate-800">
                    <AlertTriangle className="w-8 h-8 text-amber-400 mx-auto mb-2" />
                    <p className="text-xs text-slate-400 font-medium">
                      {language === 'te' ? 'కార్డు చిత్రం లోడ్ కాలేదు' : 'Card image not found'}
                    </p>
                    <p className="text-[10px] text-slate-500 mt-1 font-mono">
                      /cards/durgada/card_{currentSno}.png
                    </p>
                  </div>
                )}
              </div>

              {/* VOTER NAME & SURNAME INTELLIGENCE BOX (BELOW PHOTO FOR QUICK SCAN & VALIDATION) */}
              <div className="w-full space-y-2 bg-slate-900/90 p-3 rounded-2xl border border-slate-800 shadow-md">
                {/* Header with Title & Action Buttons */}
                <div className="flex items-center justify-between flex-wrap gap-1.5 pb-2 border-b border-slate-800/80">
                  <div className="flex items-center gap-1.5">
                    <span className="text-[10px] font-black text-amber-400 uppercase tracking-wider flex items-center gap-1">
                      <span>🏷️</span>
                      <span>{language === 'te' ? 'ఓటరు పేరు & ఇంటిపేరు విశ్లేషణ:' : 'Voter Name & Surname:'}</span>
                    </span>
                    {parsedName?.isTeluguSuspected && (
                      <span className="px-1.5 py-0.2 rounded bg-red-500/20 text-red-400 border border-red-500/40 text-[9px] font-bold">
                        ⚠️ తెలుగు పేరులో తేడా
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-1.5">
                    {/* 1-Click: Select English as Correct */}
                    <button
                      type="button"
                      onClick={handleSelectEnglishAsCorrect}
                      className="px-2 py-0.5 rounded-lg bg-indigo-950/80 hover:bg-indigo-900 border border-indigo-500/40 text-indigo-300 text-[10.5px] font-bold flex items-center gap-1 transition-all active:scale-95 cursor-pointer shadow-sm"
                      title="ఇంగ్లీష్ పేరు సరైనదిగా తీసుకుని తెలుగు పేరును ఆటోమేటిక్‌గా సరిచేయండి"
                    >
                      <Globe className="w-3 h-3 text-indigo-400" />
                      <span>{language === 'te' ? '🌐 ఇంగ్లీష్ ప్రకారం తెలుగు సరిచేయి' : 'Use English as Correct'}</span>
                    </button>

                    {/* Edit Toggle Button */}
                    <button
                      type="button"
                      onClick={() => setIsEditingName(prev => !prev)}
                      className="px-2 py-0.5 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/30 text-[10.5px] font-bold flex items-center gap-1 transition-all active:scale-95 cursor-pointer"
                      title="పేరు లేదా ఇంటిపేరును మాన్యువల్‌గా ఎడిట్ చేయండి"
                    >
                      <Edit3 className="w-3 h-3 text-amber-400" />
                      <span>{isEditingName ? (language === 'te' ? 'రద్దు' : 'Cancel') : (language === 'te' ? 'సరిదిద్దు' : 'Edit')}</span>
                    </button>
                  </div>
                </div>

                {/* Normal View Mode: Shows structured Name & Surname breakdown */}
                {!isEditingName ? (
                  <div className="space-y-2 pt-1">
                    {/* Structured Name & Surname Chips */}
                    <div className="grid grid-cols-2 gap-2">
                      {/* Identified Surname */}
                      <div className="bg-slate-950/80 p-2 rounded-xl border border-slate-800">
                        <span className="text-[9.5px] font-bold text-slate-500 uppercase tracking-wider block">
                          🏛️ {language === 'te' ? 'గుర్తించిన ఇంటిపేరు (Surname):' : 'Identified Surname:'}
                        </span>
                        <div className="text-sm font-black text-amber-300 mt-0.5">
                          {parsedName?.surnameTe || '—'}
                        </div>
                        <div className="text-[11px] font-bold text-slate-400 font-mono">
                          {parsedName?.surnameEn || '—'}
                        </div>
                      </div>

                      {/* Identified First Name */}
                      <div className="bg-slate-950/80 p-2 rounded-xl border border-slate-800">
                        <span className="text-[9.5px] font-bold text-slate-500 uppercase tracking-wider block">
                          👤 {language === 'te' ? 'ఓటరు పేరు (First Name):' : 'Voter First Name:'}
                        </span>
                        <div className="text-sm font-black text-white mt-0.5">
                          {parsedName?.firstNameTe || '—'}
                        </div>
                        <div className="text-[11px] font-bold text-slate-400 font-mono">
                          {parsedName?.firstNameEn || '—'}
                        </div>
                      </div>
                    </div>

                    {/* Full Joined Display Name */}
                    <div className="pt-1 flex items-center justify-between text-xs">
                      <div>
                        <span className="text-[9.5px] text-slate-500 font-bold uppercase tracking-wider block">
                          {language === 'te' ? 'ప్రస్తుత పూర్తి పేరు (Full Display Name):' : 'Full Name:'}
                        </span>
                        <div className="text-base font-black text-white mt-0.5 leading-snug">
                          {currentVoter.name_te || '—'}
                        </div>
                        <div className="text-xs font-bold text-amber-300 font-mono">
                          {currentVoter.name_en || '—'}
                        </div>
                      </div>

                      {nameSaveSuccess && (
                        <span className="px-2.5 py-1 bg-emerald-500/20 border border-emerald-500/50 text-emerald-300 rounded-xl font-bold text-xs flex items-center gap-1 shadow-sm animate-pulse">
                          <Check className="w-3.5 h-3.5" />
                          <span>సేవ్ & సింక్ అయింది!</span>
                        </span>
                      )}
                    </div>
                  </div>
                ) : (
                  /* Inline Editing Form */
                  <div className="space-y-2.5 pt-2 bg-slate-950/95 p-3 rounded-xl border border-amber-500/40">
                    <div className="text-[11px] font-bold text-amber-300 flex items-center gap-1">
                      <Edit3 className="w-3 h-3" />
                      <span>{language === 'te' ? 'పేరు & ఇంటిపేరు సవరణ (Edit & Fix):' : 'Edit & Fix Name:'}</span>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div>
                        <label className="text-[10px] font-bold text-slate-400 block mb-0.5">
                          {language === 'te' ? 'తెలుగు ఓటరు పేరు (First Name):' : 'Telugu First Name:'}
                        </label>
                        <input
                          type="text"
                          value={editFirstNameTe}
                          onChange={e => setEditFirstNameTe(e.target.value)}
                          className="w-full px-2.5 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-white font-bold text-xs focus:outline-none focus:border-amber-400"
                          placeholder="ఉదా: లావణ్య"
                        />
                      </div>

                      <div>
                        <label className="text-[10px] font-bold text-slate-400 block mb-0.5">
                          {language === 'te' ? 'తెలుగు ఇంటిపేరు (Surname):' : 'Telugu Surname:'}
                        </label>
                        <input
                          type="text"
                          value={editSurnameTe}
                          onChange={e => setEditSurnameTe(e.target.value)}
                          className="w-full px-2.5 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-white font-bold text-xs focus:outline-none focus:border-amber-400"
                          placeholder="ఉదా: గుండ్ర"
                        />
                      </div>

                      <div>
                        <label className="text-[10px] font-bold text-slate-400 block mb-0.5">
                          English First Name:
                        </label>
                        <input
                          type="text"
                          value={editFirstNameEn}
                          onChange={e => setEditFirstNameEn(e.target.value.toUpperCase())}
                          className="w-full px-2.5 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-amber-200 font-mono font-bold text-xs focus:outline-none focus:border-amber-400"
                          placeholder="e.g. LAVANYA"
                        />
                      </div>

                      <div>
                        <label className="text-[10px] font-bold text-slate-400 block mb-0.5">
                          English Surname:
                        </label>
                        <input
                          type="text"
                          value={editSurnameEn}
                          onChange={e => setEditSurnameEn(e.target.value.toUpperCase())}
                          className="w-full px-2.5 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-amber-200 font-mono font-bold text-xs focus:outline-none focus:border-amber-400"
                          placeholder="e.g. GUNDRA"
                        />
                      </div>
                    </div>

                    {/* Live Preview */}
                    <div className="bg-slate-900 p-2 rounded-lg border border-slate-800 text-[11px] flex items-center justify-between">
                      <div>
                        <span className="text-slate-400">సరిదిద్దిన పేరు: </span>
                        <strong className="text-white">
                          {editSurnameTe ? `${editFirstNameTe} ${editSurnameTe}` : editFirstNameTe}
                        </strong>
                        <span className="text-amber-300 font-mono ml-1.5 font-bold">
                          ({editSurnameEn ? `${editFirstNameEn} ${editSurnameEn}` : editFirstNameEn})
                        </span>
                      </div>
                    </div>

                    {/* Save Button */}
                    <div className="flex items-center justify-end gap-2 pt-1">
                      <button
                        type="button"
                        onClick={() => setIsEditingName(false)}
                        className="px-3 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-bold cursor-pointer"
                      >
                        {language === 'te' ? 'రద్దు' : 'Cancel'}
                      </button>
                      <button
                        type="button"
                        onClick={handleSaveNameAndSync}
                        disabled={isSavingName}
                        className="px-4 py-1.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white rounded-lg text-xs font-black flex items-center gap-1.5 shadow-md active:scale-95 cursor-pointer disabled:opacity-50"
                      >
                        <Save className="w-3.5 h-3.5" />
                        <span>{isSavingName ? 'సేవ్ అవుతోంది...' : (language === 'te' ? '💾 పేరు సేవ్ చేయి & సింక్ చేయి' : 'Save & Sync')}</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* RIGHT SIDE: RE-OCR ACTION BUTTONS + DETAILS & GROUND CAMPAIGN CONTROLS */}
            <div className="lg:w-[44%] xl:w-[43%] p-3.5 sm:p-4 flex flex-col justify-start bg-slate-900/60 overflow-y-auto space-y-3">
              <div>
                {/* TOP IDENTITY & LEANING BADGE */}
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs text-slate-400 font-bold">
                      {language === 'te' ? 'క్రమం:' : 'S.No:'}
                    </span>
                    <span className="text-base font-black text-amber-400 font-mono">
                      #{currentSno}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleCopy(String(currentSno), 'sno')}
                      className="text-slate-400 hover:text-white p-1"
                      title="Copy S.No"
                    >
                      {copiedField === 'sno' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>

                    <span className="text-slate-600">•</span>

                    <span className="text-xs font-mono font-bold text-slate-200">
                      {currentVoter.epic || currentVoter.id || 'NO EPIC'}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleCopy(currentVoter.epic || currentVoter.id || '', 'epic')}
                      className="text-slate-400 hover:text-white p-1"
                      title="Copy EPIC"
                    >
                      {copiedField === 'epic' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                  </div>

                  {/* Leaning Support Picker Trigger */}
                  {onOpenSupportPicker ? (
                    <button
                      type="button"
                      onClick={() => onOpenSupportPicker(currentVoter.n, currentPct ?? 50, currentProf.notes, currentSno)}
                      className="cursor-pointer transition-transform hover:scale-105 active:scale-95"
                      title="మొగ్గు మార్చడానికి క్లిక్ చేయండి"
                    >
                      {renderLeaningBadge(currentPct)}
                    </button>
                  ) : (
                    renderLeaningBadge(currentPct)
                  )}
                </div>

                {/* RE-OCR ACTION BUTTONS (MOVED TO THE RIGHT FOR DIRECT ONE-TOUCH ACCESS) */}
                <div className="w-full space-y-2 bg-slate-950/90 p-3 rounded-2xl border border-amber-500/30 shadow-md mb-2.5">
                  <div className="flex items-center justify-between text-[10.5px] font-black text-amber-400 uppercase tracking-wider">
                    <span>⚡ రీ-ఓసీఆర్ యాక్షన్స్ (Re-OCR Actions):</span>
                    {isCurrentMarked && (
                      <span className="text-[10px] text-amber-300 font-bold bg-amber-500/20 px-2 py-0.5 rounded-full border border-amber-500/40">
                        ✓ రీ-ఓసీఆర్ మార్క్ అయింది
                      </span>
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={handleToggleCurrentMark}
                    className={`w-full py-2.5 px-3 rounded-xl font-black text-xs sm:text-sm flex items-center justify-center gap-2 transition-all shadow-lg active:scale-98 cursor-pointer ${
                      isCurrentMarked
                        ? 'bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 text-slate-950 ring-2 ring-amber-300/50 shadow-amber-500/30'
                        : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 hover:border-amber-500/50'
                    }`}
                  >
                    {isCurrentMarked ? (
                      <>
                        <CheckCircle2 className="w-4 h-4 fill-slate-950 text-amber-400" />
                        <span>{language === 'te' ? '✓ రీ-ఓసీఆర్ కోసం ఎంపిక చేశారు [స్పేస్]' : '✓ MARKED FOR RE-OCR [Space]'}</span>
                      </>
                    ) : (
                      <>
                        <RotateCcw className="w-4 h-4 text-amber-400" />
                        <span>{language === 'te' ? 'రీ-ఓసీఆర్ కోసం మార్క్ చేయండి [స్పేస్]' : 'Mark for Re-OCR [Space]'}</span>
                      </>
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={() => handleRunReOcr([currentSno])}
                    disabled={isProcessing}
                    className="w-full py-2 px-3 rounded-xl bg-slate-900 hover:bg-slate-800 border border-amber-500/30 text-amber-300 font-bold text-xs flex items-center justify-center gap-1.5 transition-all disabled:opacity-50 cursor-pointer shadow-sm"
                  >
                    <Zap className="w-3.5 h-3.5 text-amber-400" />
                    <span>{language === 'te' ? '⚡ ఈ ఒక్క కార్డును తక్షణమే Re-OCR చేయి' : 'Instant Re-OCR This Card'}</span>
                  </button>
                </div>

                {/* EXTRACTED FIELDS BOX (Relation, Door No, Age, Gender, Station) */}
                <div className="space-y-2 bg-slate-950/80 p-3 rounded-2xl border border-slate-800 text-xs">
                  {/* Relative Name */}
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                      {language === 'te' ? 'సంబంధీకుని పేరు & రకం:' : 'Relative Name & Relation:'}
                    </span>
                    <div className="text-xs sm:text-sm font-bold text-slate-200 mt-0.5">
                      {currentVoter.rel_name_te || '—'}
                      <span className="text-xs text-slate-400 ml-1">
                        ({currentVoter.rel_type_te || currentVoter.rel_type_en || 'సంబంధం'})
                      </span>
                      <span className="text-slate-400 font-mono text-xs ml-2">
                        • {currentVoter.rel_name_en || '—'}
                      </span>
                    </div>
                  </div>

                  {/* Door No, Age, Gender Grid */}
                  <div className="pt-2 border-t border-slate-800/80 grid grid-cols-3 gap-2">
                    <div className="bg-slate-900/60 p-2 rounded-xl border border-slate-800/60">
                      <span className="text-[9.5px] font-bold text-slate-500 uppercase tracking-wider block">
                        {language === 'te' ? 'ఇంటి నెం' : 'Door No'}
                      </span>
                      <span className="text-xs sm:text-sm font-black text-amber-200 font-mono">
                        {currentVoter.house_no || currentVoter.door_no || currentVoter.hn || '—'}
                      </span>
                    </div>
                    <div className="bg-slate-900/60 p-2 rounded-xl border border-slate-800/60">
                      <span className="text-[9.5px] font-bold text-slate-500 uppercase tracking-wider block">
                        {language === 'te' ? 'వయస్సు' : 'Age'}
                      </span>
                      <span className="text-xs sm:text-sm font-black text-slate-200">
                        {currentVoter.age || currentVoter.a || '—'} Y
                      </span>
                    </div>
                    <div className="bg-slate-900/60 p-2 rounded-xl border border-slate-800/60">
                      <span className="text-[9.5px] font-bold text-slate-500 uppercase tracking-wider block">
                        {language === 'te' ? 'లింగం' : 'Gender'}
                      </span>
                      <span className="text-xs sm:text-sm font-black text-slate-200">
                        {currentVoter.gender_te || currentVoter.gender_en || currentVoter.g || '—'}
                      </span>
                    </div>
                  </div>

                  {/* Polling Section */}
                  <div className="pt-2 border-t border-slate-800/80">
                    <span className="text-[9.5px] font-bold text-slate-500 uppercase tracking-wider block">
                      {language === 'te' ? 'పోలింగ్ కేంద్రం' : 'Polling Station'}
                    </span>
                    <p className="text-[11px] text-slate-300 truncate">
                      {currentVoter.sec || currentVoter.polling_station_name || '—'}
                    </p>
                  </div>
                </div>

                {/* ⚡ 1-TAP GROUND CAMPAIGN ACTION SWITCHES */}
                <div className="mt-3 space-y-2">
                  <div className="text-[10.5px] font-black text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
                    <Star className="w-3.5 h-3.5" />
                    <span>{language === 'te' ? 'గ్రౌండ్ సర్వే & క్యాంపెయిన్ యాక్షన్స్:' : 'Ground Survey & Campaign Actions:'}</span>
                  </div>

                  {/* Row 1: ⭐ మనవాళ్లే (100%) & 🗳️ ఓటేశారు (Voted) */}
                  <div className="grid grid-cols-2 gap-2.5">
                    {/* 1. Quick Switch for OURS (మనవాళ్లే) */}
                    <button
                      type="button"
                      onClick={handleToggleOurs}
                      className={`py-2.5 px-3 rounded-xl text-xs sm:text-sm font-black flex items-center justify-center gap-1.5 transition-all active:scale-95 shadow-md border cursor-pointer ${
                        isOurs
                          ? 'bg-gradient-to-r from-emerald-600 to-amber-600 text-white border-emerald-400 ring-2 ring-emerald-400/40 shadow-emerald-950/50'
                          : 'bg-slate-950 hover:bg-slate-800 text-slate-200 border-slate-700 hover:border-amber-500/60'
                      }`}
                      title={isOurs ? 'మనవాళ్లే (ట్యాప్ చేస్తే రీసెట్ అవుతుంది)' : '100% మనవాళ్లే అని నమోదు చేయండి'}
                    >
                      <Star className={`w-4 h-4 ${isOurs ? 'text-white fill-white' : 'text-amber-400'}`} />
                      <span className="truncate">{isOurs ? (language === 'te' ? '⭐ మనవాళ్లే (100%)' : '⭐ Ours (100%)') : (language === 'te' ? '⭐ మనవాళ్లేనా?' : '+ Mark Ours')}</span>
                    </button>

                    {/* 2. Quick Switch for VOTED (ఓటేశారు) */}
                    <button
                      type="button"
                      onClick={handleToggleVoted}
                      className={`py-2.5 px-3 rounded-xl text-xs sm:text-sm font-black flex items-center justify-center gap-1.5 transition-all active:scale-95 shadow-md border cursor-pointer ${
                        isVoted
                          ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white border-emerald-400 ring-2 ring-emerald-400/40 shadow-emerald-950/50'
                          : 'bg-slate-950 hover:bg-slate-800 text-slate-200 border-slate-700 hover:border-emerald-500/60'
                      }`}
                      title={isVoted ? 'ఓటేశారు (ట్యాప్ చేస్తే అన్‌మార్క్ అవుతుంది)' : 'ఓటు వేశారు అని మార్క్ చేయండి'}
                    >
                      <CheckCircle2 className={`w-4 h-4 ${isVoted ? 'text-white fill-emerald-800' : 'text-emerald-400'}`} />
                      <span className="truncate">{isVoted ? (language === 'te' ? '✅ ఓటేశారు (Voted)' : '✅ Voted') : (language === 'te' ? '🗳️ ఓటు వేయలేదు' : 'Mark Voted')}</span>
                    </button>
                  </div>

                  {/* Row 2: ✈️ ఊర్లో లేరు (Out of Village) & 💀 మరణించారు (Deceased) */}
                  <div className="grid grid-cols-2 gap-2.5">
                    {/* 3. Quick Switch for OUT OF VILLAGE (గ్రామంలో లేరు) */}
                    <button
                      type="button"
                      onClick={handleToggleOutOfCity}
                      className={`py-2 px-3 rounded-xl text-xs font-black flex items-center justify-center gap-1.5 transition-all active:scale-95 shadow-sm border cursor-pointer ${
                        isOutOfCity
                          ? 'bg-gradient-to-r from-indigo-600 to-blue-700 text-white border-indigo-400 ring-2 ring-indigo-400/40 shadow-indigo-950/50'
                          : 'bg-slate-950 hover:bg-slate-800 text-indigo-300 border-slate-700 hover:border-indigo-500/60'
                      }`}
                      title={isOutOfCity ? 'గ్రామంలో లేరు (ట్యాప్ చేస్తే అన్‌మార్క్ అవుతుంది)' : 'ఊర్లో లేరు / వలస వెళ్లినట్లు మార్క్ చేయండి'}
                    >
                      <span className="text-sm">✈️</span>
                      <span className="truncate">{isOutOfCity ? (language === 'te' ? 'గ్రామంలో లేరు' : 'Away') : (language === 'te' ? 'ఊర్లో లేరు?' : '+ Out of Village')}</span>
                    </button>

                    {/* 4. Quick Switch for DECEASED (మరణించారు) */}
                    <button
                      type="button"
                      onClick={handleToggleDeceased}
                      className={`py-2 px-3 rounded-xl text-xs font-black flex items-center justify-center gap-1.5 transition-all active:scale-95 shadow-sm border cursor-pointer ${
                        isDeceased
                          ? 'bg-gradient-to-r from-slate-700 to-slate-800 text-white border-slate-400 ring-2 ring-slate-400/40 shadow-slate-950/50'
                          : 'bg-slate-950 hover:bg-slate-800 text-slate-400 border-slate-700 hover:border-slate-500/60'
                      }`}
                      title={isDeceased ? 'మరణించారు (ట్యాప్ చేస్తే అన్‌మార్క్ అవుతుంది)' : 'మరణించినట్లు నమోదు చేయండి'}
                    >
                      <span className="text-sm">💀</span>
                      <span className="truncate">{isDeceased ? (language === 'te' ? 'మరణించారు' : 'Deceased') : (language === 'te' ? 'మరణించారా?' : '+ Deceased')}</span>
                    </button>
                  </div>

                  {/* CONTACT & SUB-MODAL ACTIONS: Phone, Call, WhatsApp, Leader, Visit, Slip */}
                  <div className="pt-2.5 border-t border-slate-800/80 space-y-2.5 text-xs">
                    {/* Phone Number & WhatsApp Slip Row with Quick Edit & Quick Entry */}
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <div className="flex items-center gap-2 flex-1 min-w-[260px] flex-wrap">
                        {/* Status feedback badge */}
                        {phoneSaveNotice && (
                          <span className="px-2.5 py-1 rounded-xl bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-xs font-bold flex items-center gap-1.5 animate-pulse shadow-sm">
                            <Check className="w-3.5 h-3.5 text-emerald-400" />
                            <span>{phoneSaveNotice}</span>
                          </span>
                        )}

                        {/* CASE 1: In Inline Quick Edit Mode */}
                        {isEditingPhone ? (
                          <div className="flex items-center gap-1.5 flex-1 max-w-[340px]">
                            <div className="relative flex-1">
                              <Phone className="w-3.5 h-3.5 text-cyan-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                              <input
                                ref={phoneInputRef}
                                type="tel"
                                inputMode="numeric"
                                pattern="[0-9]*"
                                maxLength={10}
                                value={quickPhoneInput}
                                autoFocus
                                onChange={e => {
                                  const val = e.target.value.replace(/\D/g, '').slice(0, 10);
                                  setQuickPhoneInput(val);
                                }}
                                onKeyDown={e => {
                                  if (e.key === 'Enter') handleQuickSavePhone();
                                  if (e.key === 'Escape') setIsEditingPhone(false);
                                }}
                                placeholder={language === 'te' ? '10-అంకెల ఫోన్ నెం...' : '10-digit mobile...'}
                                className="w-full pl-8 pr-2 py-1.5 bg-slate-950 border border-cyan-400 rounded-xl text-cyan-200 font-mono text-xs font-bold focus:outline-none ring-2 ring-cyan-500/30 shadow-inner"
                              />
                            </div>
                            <button
                              type="button"
                              onClick={handleQuickSavePhone}
                              disabled={quickPhoneInput.length > 0 && quickPhoneInput.length !== 10}
                              className="px-3 py-1.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 text-white font-bold rounded-xl text-xs flex items-center gap-1 cursor-pointer shadow-md active:scale-95 disabled:opacity-40"
                              title={language === 'te' ? 'సేవ్ చేయండి (Enter)' : 'Save (Enter)'}
                            >
                              <Check className="w-3.5 h-3.5" />
                              <span>{language === 'te' ? 'ఓకే' : 'Save'}</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setIsEditingPhone(false);
                                setQuickPhoneInput('');
                              }}
                              className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold rounded-xl text-xs cursor-pointer"
                              title={language === 'te' ? 'రద్దు (Esc)' : 'Cancel (Esc)'}
                            >
                              {language === 'te' ? 'రద్దు' : 'Cancel'}
                            </button>
                          </div>
                        ) : effectivePhone ? (
                          /* CASE 2: Phone Number Already Exists -> Display Chip with Click-to-Call, Copy & Inline Edit */
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <div className="inline-flex items-center gap-1.5 bg-blue-950/70 border border-blue-500/40 px-2.5 py-1 rounded-xl text-xs shadow-sm">
                              <span className="text-xs">📞</span>
                              <a
                                href={`tel:${effectivePhone}`}
                                className="font-mono font-bold text-cyan-200 hover:text-white hover:underline text-xs"
                                title="Click to Call"
                              >
                                {effectivePhone}
                              </a>
                              <button
                                type="button"
                                onClick={() => handleCopy(effectivePhone, 'phone')}
                                className="p-1 text-slate-400 hover:text-white cursor-pointer"
                                title="Copy Phone"
                              >
                                {copiedField === 'phone' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  setQuickPhoneInput(effectivePhone);
                                  setIsEditingPhone(true);
                                  setTimeout(() => phoneInputRef.current?.focus(), 50);
                                }}
                                className="px-2 py-0.5 bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 border border-cyan-500/30 rounded-lg text-[11px] font-bold flex items-center gap-1 cursor-pointer transition-all active:scale-95 ml-1"
                                title={language === 'te' ? 'ఫోన్ నంబర్ మార్చండి / Edit' : 'Edit Phone'}
                              >
                                <Edit3 className="w-3 h-3" />
                                <span>{language === 'te' ? 'మార్చు' : 'Edit'}</span>
                              </button>
                            </div>

                            {onOpenPhoneEditor && (
                              <button
                                type="button"
                                onClick={() => onOpenPhoneEditor(currentVoter)}
                                className="px-2 py-1 bg-slate-800/80 hover:bg-slate-700 text-slate-400 hover:text-slate-200 rounded-lg text-[11px] font-medium cursor-pointer"
                                title={language === 'te' ? 'అదనపు నంబర్ లేదా నోట్స్' : 'Alt phone or notes'}
                              >
                                + అదనపు నెం.
                              </button>
                            )}
                          </div>
                        ) : (
                          /* CASE 3: No Phone Number -> Direct Quick Entry Input Field Right Here */
                          <div className="flex items-center gap-1.5 flex-1 max-w-[320px]">
                            <div className="relative flex-1">
                              <Phone className="w-3.5 h-3.5 text-cyan-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                              <input
                                ref={phoneInputRef}
                                type="tel"
                                inputMode="numeric"
                                pattern="[0-9]*"
                                maxLength={10}
                                value={quickPhoneInput}
                                onChange={e => {
                                  const val = e.target.value.replace(/\D/g, '').slice(0, 10);
                                  setQuickPhoneInput(val);
                                }}
                                onKeyDown={e => {
                                  if (e.key === 'Enter') handleQuickSavePhone();
                                }}
                                placeholder={language === 'te' ? 'ఫోన్ నెం. [P]...' : '10-digit phone [P]...'}
                                className="w-full pl-8 pr-2 py-1.5 bg-slate-900/90 border border-slate-700 hover:border-cyan-500/50 focus:border-cyan-400 rounded-xl text-cyan-200 font-mono text-xs font-bold focus:outline-none placeholder:text-slate-500 transition-colors shadow-inner"
                              />
                            </div>
                            <button
                              type="button"
                              onClick={handleQuickSavePhone}
                              disabled={quickPhoneInput.length !== 10}
                              className="px-3 py-1.5 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 disabled:opacity-30 disabled:cursor-not-allowed text-white font-bold rounded-xl text-xs flex items-center gap-1 cursor-pointer shadow-md active:scale-95 transition-all"
                              title={language === 'te' ? 'సేవ్ చేయండి (Enter)' : 'Save Phone (Enter)'}
                            >
                              <Save className="w-3.5 h-3.5" />
                              <span>{language === 'te' ? 'సేవ్' : 'Save'}</span>
                            </button>
                          </div>
                        )}
                      </div>

                      {/* WhatsApp Slip Button */}
                      <button
                        type="button"
                        onClick={handleSendWhatsAppSlip}
                        className="px-3 py-1.5 rounded-xl bg-emerald-950/80 hover:bg-emerald-900 border border-emerald-500/50 text-emerald-300 font-bold text-xs flex items-center gap-1.5 shadow-sm active:scale-95 cursor-pointer"
                        title="వాట్సాప్‌లో ఓటర్ స్లిప్ పంపండి"
                      >
                        <MessageSquare className="w-3.5 h-3.5 text-emerald-400" />
                        <span>{language === 'te' ? 'వాట్సాప్ స్లిప్' : 'WhatsApp Slip'}</span>
                      </button>
                    </div>

                    {/* Leader Assignment, Visit, & Slip Row */}
                    <div className="flex items-center justify-between gap-2 flex-wrap pt-2 border-t border-slate-800/60 text-xs">
                      {/* Leader Info */}
                      <div className="flex items-center gap-1.5 text-slate-300">
                        <UserCheck className="w-4 h-4 text-amber-400 shrink-0" />
                        <span>నాయకుడు:</span>
                        <strong className="text-white truncate max-w-[140px]">
                          {currentProf.influencerName || 'ఎవరూ లేరు'}
                        </strong>
                        {onOpenInfluencerAssign && (
                          <button
                            type="button"
                            onClick={() => onOpenInfluencerAssign(currentVoter.n, currentProf.influencerId, currentSno)}
                            className="px-2 py-0.5 bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/30 rounded-lg text-[11px] font-bold ml-1 cursor-pointer transition-all active:scale-95"
                          >
                            {currentProf.influencerName ? 'మార్చు' : '+ కేటాయించండి'}
                          </button>
                        )}
                      </div>

                      {/* Log Visit & Slip Action Buttons */}
                      <div className="flex items-center gap-2 shrink-0">
                        {onOpenLogVisit && (
                          <button
                            type="button"
                            onClick={() => onOpenLogVisit(currentVoter)}
                            className="px-2.5 py-1 rounded-xl bg-slate-950 hover:bg-slate-800 text-amber-300 border border-slate-700 text-xs font-bold flex items-center gap-1 cursor-pointer transition-all active:scale-95 shadow-sm"
                            title="విజిట్ నమోదు చేయండి"
                          >
                            <Clock className="w-3.5 h-3.5 text-amber-400" />
                            <span>{currentProf.visits?.length ? `✓ ${currentProf.visits.length}` : '+ విజిట్'}</span>
                          </button>
                        )}

                        {onOpenSlip && (
                          <button
                            type="button"
                            onClick={() => onOpenSlip(currentVoter)}
                            className="px-2.5 py-1 rounded-xl bg-gradient-to-r from-amber-500/20 to-amber-600/20 hover:from-amber-500/30 text-amber-300 border border-amber-500/40 text-xs font-bold flex items-center gap-1 cursor-pointer transition-all active:scale-95 shadow-sm"
                            title="పూర్తి అధికారిక కార్డు స్లిప్"
                          >
                            <FileText className="w-3.5 h-3.5" />
                            <span>స్లిప్</span>
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : null}

        {/* Process Status Notification */}
        {processStatus && (
          <div className="mt-3 px-4 py-2 rounded-xl bg-amber-500/20 border border-amber-500/50 text-amber-200 text-xs font-bold animate-pulse">
            {processStatus}
          </div>
        )}
      </div>

      {/* 3. BOTTOM ACTION BAR & KEYBOARD SHORTCUTS BAR */}
      <div className="bg-slate-900/98 border-t border-slate-800 px-4 py-2.5 flex items-center justify-between flex-wrap gap-2.5 shrink-0">
        {/* Navigation Steppers, Direct Counter & Jump */}
        <div className="flex items-center gap-1.5 flex-wrap">
          {/* Jump to First Card (#1) */}
          <button
            type="button"
            onClick={handleJumpToFirst}
            disabled={safeIndex === 0}
            className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 disabled:opacity-40 disabled:cursor-not-allowed border border-slate-700 cursor-pointer shadow-sm active:scale-95"
            title={language === 'te' ? 'మొదటి కార్డు (#1)' : 'Jump to First Card (#1)'}
          >
            <ChevronsLeft className="w-4 h-4" />
          </button>

          {/* Jump -10 */}
          <button
            type="button"
            onClick={() => handleStepJump(-10)}
            disabled={safeIndex < 10}
            className="px-2 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 disabled:opacity-40 disabled:cursor-not-allowed border border-slate-700 font-mono text-xs font-bold cursor-pointer shadow-sm active:scale-95"
            title={language === 'te' ? '10 కార్డులు వెనక్కి' : '-10 Cards'}
          >
            -10
          </button>

          {/* Previous Card */}
          <button
            type="button"
            onClick={handlePrev}
            disabled={activeList.length <= 1 || safeIndex === 0}
            className="px-2.5 sm:px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white disabled:opacity-40 disabled:cursor-not-allowed border border-slate-700 flex items-center gap-1 font-bold text-xs cursor-pointer shadow-sm active:scale-95"
            title="Previous Card (Left Arrow)"
          >
            <ChevronLeft className="w-4 h-4" />
            <span>{language === 'te' ? 'మునుపటి' : 'Prev'}</span>
          </button>

          {/* Interactive Direct Counter Input */}
          <div className="flex items-center gap-1 bg-slate-950 border border-slate-800 px-2 py-1 rounded-xl shadow-inner">
            <input
              type="number"
              value={safeIndex + 1}
              onChange={e => {
                const val = parseInt(e.target.value, 10);
                if (!isNaN(val) && val >= 1 && val <= activeList.length) {
                  setCurrentIndex(val - 1);
                }
              }}
              className="w-14 bg-transparent text-center font-mono font-black text-amber-300 text-xs focus:outline-none focus:ring-1 focus:ring-amber-400 rounded"
              title={language === 'te' ? 'కార్డు సంఖ్యను టైప్ చేసి నేరుగా జంప్ అవ్వండి' : 'Type index to jump directly'}
            />
            <span className="text-slate-500 font-mono text-xs">/</span>
            <span className="font-mono font-bold text-slate-300 text-xs pr-1">
              {activeList.length}
            </span>
            {selectedWard !== 'all' && (
              <span className="text-[10px] bg-indigo-500/20 text-indigo-300 px-1.5 py-0.2 rounded font-mono font-bold border border-indigo-500/30">
                W-{selectedWard}
              </span>
            )}
          </div>

          {/* Next Card */}
          <button
            type="button"
            onClick={handleNext}
            disabled={activeList.length <= 1 || safeIndex >= activeList.length - 1}
            className="px-2.5 sm:px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white disabled:opacity-40 disabled:cursor-not-allowed border border-slate-700 flex items-center gap-1 font-bold text-xs cursor-pointer shadow-sm active:scale-95"
            title="Next Card (Enter / Right Arrow)"
          >
            <span>{language === 'te' ? 'తర్వాతి' : 'Next'}</span>
            <ChevronRight className="w-4 h-4" />
          </button>

          {/* Jump +10 */}
          <button
            type="button"
            onClick={() => handleStepJump(10)}
            disabled={safeIndex + 10 >= activeList.length}
            className="px-2 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 disabled:opacity-40 disabled:cursor-not-allowed border border-slate-700 font-mono text-xs font-bold cursor-pointer shadow-sm active:scale-95"
            title={language === 'te' ? '10 కార్డులు ముందుకు' : '+10 Cards'}
          >
            +10
          </button>

          {/* Jump to Last Card */}
          <button
            type="button"
            onClick={handleJumpToLast}
            disabled={safeIndex >= activeList.length - 1}
            className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 disabled:opacity-40 disabled:cursor-not-allowed border border-slate-700 cursor-pointer shadow-sm active:scale-95"
            title={language === 'te' ? 'చివరి కార్డు' : 'Jump to Last Card'}
          >
            <ChevronsRight className="w-4 h-4" />
          </button>
        </div>

        {/* Keyboard Shortcuts Hint */}
        <div className="hidden lg:flex items-center gap-3 text-xs text-slate-400 bg-slate-950 px-3.5 py-1.5 rounded-xl border border-slate-800">
          <span><kbd className="px-1.5 py-0.5 bg-slate-800 rounded text-amber-300 font-mono font-bold">Space</kbd> రీ-ఓసీఆర్ ఎంపిక</span>
          <span><kbd className="px-1.5 py-0.5 bg-slate-800 rounded text-amber-300 font-mono font-bold">Enter / ➔</kbd> తర్వాతి</span>
          <span><kbd className="px-1.5 py-0.5 bg-slate-800 rounded text-amber-300 font-mono font-bold">⬅</kbd> మునుపటి</span>
          <span><kbd className="px-1.5 py-0.5 bg-slate-800 rounded text-amber-300 font-mono font-bold">Esc</kbd> ముగింపు</span>
        </div>

        {/* Batch Action Buttons */}
        <div className="flex items-center gap-2">
          {/* Copy S.Nos */}
          <button
            type="button"
            onClick={handleCopyMarkedSnos}
            disabled={markedSnos.size === 0}
            className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 disabled:opacity-40 text-xs font-bold flex items-center gap-1 cursor-pointer"
            title="Copy S.Nos list"
          >
            {copiedSnos ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copiedSnos ? 'కాపీ' : `S.No లు (${markedSnos.size})`}</span>
          </button>

          {/* Batch Run Re-OCR on All Marked */}
          <button
            type="button"
            onClick={() => handleRunReOcr(Array.from(markedSnos))}
            disabled={markedSnos.size === 0 || isProcessing}
            className="px-4 py-2 rounded-xl bg-gradient-to-r from-red-600 via-amber-600 to-orange-600 hover:from-red-500 hover:to-orange-500 text-white font-black text-xs flex items-center gap-1.5 shadow-lg shadow-orange-600/30 disabled:opacity-40 disabled:cursor-not-allowed transition-all active:scale-95 cursor-pointer"
          >
            <Zap className="w-4 h-4 fill-white" />
            <span>
              {language === 'te'
                ? `ఎంపిక చేసిన ${markedSnos.size} కార్డులను Re-OCR చేయి`
                : `Run Re-OCR on Selected (${markedSnos.size})`}
            </span>
          </button>
        </div>
      </div>
    </div>
  );
};
