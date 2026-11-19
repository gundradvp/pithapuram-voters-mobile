import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { HeaderMobile } from './components/HeaderMobile';
import { BottomNavMobile } from './components/BottomNavMobile';
import { VotersTabMobile } from './components/VotersTabMobile';
import { FamiliesTabMobile } from './components/FamiliesTabMobile';
import { InfluencersTabMobile } from './components/InfluencersTabMobile';
import { WarRoomTabMobile } from './components/WarRoomTabMobile';
import { OfflineTabMobile } from './components/OfflineTabMobile';
import { WinningScoreBanner } from './components/WinningScoreBanner';
import { BoothAssignmentModal } from './components/BoothAssignmentModal';
import { VoterSlipModal } from './components/VoterSlipModal';
import { PhoneEditorModal } from './components/PhoneEditorModal';
import { SupportLeaningPicker } from './components/SupportLeaningPicker';
import { InfluencerAssignModal } from './components/InfluencerAssignModal';
import { CreateFamilyModal } from './components/CreateFamilyModal';
import { LogVisitModal } from './components/LogVisitModal';
import { ThemeSelectorModal } from './components/ThemeSelectorModal';
import { LoginModal } from './components/LoginModal';
import { AdminAssignmentModal } from './components/AdminAssignmentModal';
import { GroupPrintModal } from './components/GroupPrintModal';
import { SurnameLeaningModal } from './components/SurnameLeaningModal';
import { SyncBackupModal } from './components/SyncBackupModal';
import { BulkAssignModal } from './components/BulkAssignModal';
import { DEMO_BOOTH_DATA, DEMO_PROFILES } from './utils/demoData';
import {
  BoothData,
  BoothIndexItem,
  LocalElectionUnit,
  MobileVoter,
  TabType,
  VoterSurveyStatus,
  FamilyGroup,
  Influencer,
  VoterCampaignProfile,
  VoterVisit,
  WinningScoreCalculation,
  MoneyInfluenceStatus
} from './types';
import { safeStorage } from './utils/safeStorage';
import {
  getAssignedBooth,
  setAssignedBooth,
  isBoothLocked,
  getCachedBoothData,
  saveCachedBoothData,
  isBoothCached,
  isCacheStale,
  clearStaleBoothCache,
  getVoterProfiles,
  saveVoterProfile,
  saveBatchVoterProfiles,
  addVoterVisit,
  getFamilyGroups,
  saveFamilyGroup,
  deleteFamilyGroup,
  getInfluencers,
  saveInfluencer,
  calculateWinningScore,
  fetchFreshProfiles,
  savePreloadedProfiles,
  CampaignSyncBundle,
  bustAllCache,
  formatBytes,
  getEstimatedUnitSize
} from './utils/storage';
import {
  pullBoothFromSupabase,
  pushBoothToSupabaseDebounced,
  mergeRemoteProfiles,
  SyncState
} from './utils/supabaseSync';
import { classifyBoothSurnames } from './utils/surnameClassifier';
import {
  UserSession,
  getUserSession,
  logoutUser,
  getVolunteerAssignment,
  getWhatsAppShareUrl,
  fetchFreshAssignments,
  isAssignmentExpired,
  getRemainingTime
} from './utils/auth';
import { useI18n } from './utils/i18n';
import { ThemeId, getSavedTheme, setSavedTheme, applyThemeToDom } from './utils/theme';
import { Loader2, AlertCircle, Sparkles, Trophy, MessageSquare, Clock, DownloadCloud, AlertTriangle, RefreshCw, Layers, Database } from 'lucide-react';

export function App() {
  const { lang, toggleLanguage, t } = useI18n();

  // App Theme State
  const [theme, setTheme] = useState<ThemeId>(() => getSavedTheme());
  const [isThemeModalOpen, setIsThemeModalOpen] = useState<boolean>(false);

  // User Auth & Role Session State
  const [session, setSession] = useState<UserSession | null>(() => getUserSession());
  const [isLoginModalOpen, setIsLoginModalOpen] = useState<boolean>(() => !getUserSession());
  const [isAdminModalOpen, setIsAdminModalOpen] = useState<boolean>(false);
  const [assignmentVersion, setAssignmentVersion] = useState(0);

  // Sync latest volunteer assignments across devices on startup and listen for live updates
  useEffect(() => {
    fetchFreshAssignments().then(() => {
      setAssignmentVersion(v => v + 1);
    }).catch(() => {});

    const handleUpdate = () => {
      setAssignmentVersion(v => v + 1);
    };
    window.addEventListener('jsp_assignments_updated', handleUpdate);
    window.addEventListener('storage', handleUpdate);
    return () => {
      window.removeEventListener('jsp_assignments_updated', handleUpdate);
      window.removeEventListener('storage', handleUpdate);
    };
  }, []);

  useEffect(() => {
    applyThemeToDom(theme);
  }, [theme]);

  const handleSelectTheme = (newTheme: ThemeId) => {
    setTheme(newTheme);
    setSavedTheme(newTheme);
  };

  const [boothsIndex, setBoothsIndex] = useState<BoothIndexItem[]>([]);
  const [localUnits, setLocalUnits] = useState<LocalElectionUnit[]>([]);

  // Volunteer assigned units lookup
  const currentAssignment = useMemo(() => {
    if (!session || session.role === 'admin') return null;
    return getVolunteerAssignment(session.phone);
  }, [session, assignmentVersion]);

  const assignedAssemblyBooths = useMemo(() => {
    if (session?.role === 'admin') return boothsIndex.map(b => Number(b.part_no));
    return currentAssignment?.assemblyBooths || [];
  }, [session, currentAssignment, boothsIndex]);

  const assignedMunicipalWards = useMemo(() => {
    if (session?.role === 'admin') return localUnits.map(u => u.id);
    return currentAssignment?.municipalWards || [];
  }, [session, currentAssignment, localUnits]);

  const [currentPartNo, setCurrentPartNo] = useState<number | string>(() => {
    const saved = getAssignedBooth();
    const currSession = getUserSession();
    // If the active user is Admin, they shouldn't be defaulted into a single ward from a past volunteer session
    if (currSession?.role === 'admin' && typeof saved === 'string' && saved.includes('_w')) {
      return saved.startsWith('gp_tatiparthy') ? 'gp_tatiparthy' : 'gp_durgada';
    }
    if (saved && saved !== 'ward_14' && saved !== 'gollaprolu_ward_11' && !String(saved).startsWith('ward_')) {
      return saved;
    }
    return 'gp_tatiparthy';
  });

  // Desktop vs Mobile layout mode (mobile first priority; desktop mode on laptops)
  const [layoutMode, setLayoutMode] = useState<'mobile' | 'desktop'>(() => {
    const saved = safeStorage.getItem('jsp_layout_mode');
    if (saved === 'desktop' || saved === 'mobile') return saved;
    return typeof window !== 'undefined' && window.innerWidth >= 1024 ? 'desktop' : 'mobile';
  });

  const handleToggleLayoutMode = useCallback(() => {
    setLayoutMode(prev => {
      const next = prev === 'desktop' ? 'mobile' : 'desktop';
      safeStorage.setItem('jsp_layout_mode', next);
      return next;
    });
  }, []);

  // State: load list only when click load (Requirement 3)
  const [isListLoaded, setIsListLoaded] = useState<boolean>(false);
  const [now, setNow] = useState<number>(Date.now());

  // 1-second interval to drive real-time countdown timer (Requirement 5)
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Compute remaining time for volunteer assignment
  const remainingTime = useMemo(() => {
    if (session?.role === 'admin') {
      return { isExpired: false, hasTimer: false, minutes: 999999, seconds: 0, formatted: 'అపరిమితం' };
    }
    return getRemainingTime(currentAssignment);
  }, [currentAssignment, now, session]);

  // Auto-switch to assigned unit on volunteer login if currentPartNo is not in their assigned list
  useEffect(() => {
    if (!session || session.role === 'admin') return;
    if (!currentAssignment) return;

    const isCurrentValid =
      (typeof currentPartNo === 'number' && assignedAssemblyBooths.includes(currentPartNo)) ||
      (typeof currentPartNo === 'string' && assignedMunicipalWards.includes(currentPartNo) && !currentPartNo.startsWith('ward_') && currentPartNo !== 'gollaprolu_ward_11');

    if (!isCurrentValid) {
      setBoothData(null);
      setIsListLoaded(false);
      if (assignedMunicipalWards.length > 0) {
        const validWard = assignedMunicipalWards.find(w => !w.startsWith('ward_') && w !== 'gollaprolu_ward_11') || assignedMunicipalWards[0];
        setCurrentPartNo(validWard);
        setAssignedBooth(validWard, true);
      } else if (assignedAssemblyBooths.length > 0) {
        setCurrentPartNo(assignedAssemblyBooths[0]);
        setAssignedBooth(assignedAssemblyBooths[0], true);
      }
    }
  }, [session, currentAssignment, assignedAssemblyBooths, assignedMunicipalWards, currentPartNo]);

  const [boothData, setBoothData] = useState<BoothData | null>(null);

  // Strict Security Guard: Prevent any unassigned data or residual Admin data from persisting in volunteer session
  useEffect(() => {
    if (session?.role === 'volunteer' && boothData) {
      const bPart = boothData.booth_info?.part_no ?? (boothData.booth_info as any)?.booth_no;
      const isValid =
        (typeof bPart === 'number' && assignedAssemblyBooths.includes(bPart)) ||
        (typeof bPart === 'string' && assignedMunicipalWards.includes(bPart));
      if (!isValid) {
        setBoothData(null);
        setIsListLoaded(false);
      }
    }
  }, [session, boothData, assignedAssemblyBooths, assignedMunicipalWards]);

  // STRICTLY AUTO-UNLOAD WHEN TIME EXPIRES (Requirement 5)
  useEffect(() => {
    if (session?.role === 'volunteer' && currentAssignment?.expiresAt && now >= currentAssignment.expiresAt) {
      if (isListLoaded || boothData) {
        setIsListLoaded(false);
        setBoothData(null);
      }
    }
  }, [now, session, currentAssignment, isListLoaded, boothData]);
  const [activeTab, setActiveTab] = useState<TabType>('voters');
  const [votersViewMode, setVotersViewMode] = useState<'list' | 'surnames' | 'excel'>(() => {
    try {
      const saved = localStorage.getItem('jsp_voter_view_mode') as 'list' | 'surnames' | 'excel';
      if (saved && ['list', 'surnames', 'excel'].includes(saved)) return saved;
      return typeof window !== 'undefined' && window.innerWidth >= 1024 ? 'excel' : 'list';
    } catch {
      return 'list';
    }
  });

  const handleVotersViewModeChange = (mode: 'list' | 'surnames' | 'excel') => {
    setVotersViewMode(mode);
    try {
      localStorage.setItem('jsp_voter_view_mode', mode);
    } catch {}
  };
  const [isLocked, setIsLocked] = useState<boolean>(() => isBoothLocked());
  const [isCached, setIsCached] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Real-time Download Progress Tracking (Size in MB/KB & Loading Percentage)
  const [downloadProgress, setDownloadProgress] = useState<{
    isLoading: boolean;
    loadedBytes: number;
    totalBytes: number;
    percent: number;
    formattedLoaded: string;
    formattedTotal: string;
  }>({
    isLoading: false,
    loadedBytes: 0,
    totalBytes: 0,
    percent: 0,
    formattedLoaded: '0 B',
    formattedTotal: '0 B'
  });

  // Campaign State
  const [profiles, setProfiles] = useState<Record<number, VoterCampaignProfile>>({});
  const [families, setFamilies] = useState<Record<string, FamilyGroup>>({});
  const [influencers, setInfluencers] = useState<Record<string, Influencer>>({});
  const [scoreNotification, setScoreNotification] = useState<string | null>(null);

  // Modals State
  const [isBoothSelectorOpen, setIsBoothSelectorOpen] = useState<boolean>(false);
  const [isSyncModalOpen, setIsSyncModalOpen] = useState<boolean>(false);
  const [cloudSyncState, setCloudSyncState] = useState<SyncState>('idle');
  const [selectedVoterForSlip, setSelectedVoterForSlip] = useState<MobileVoter | null>(null);
  const [selectedVoterForPhone, setSelectedVoterForPhone] = useState<MobileVoter | null>(null);
  const [selectedVoterForVisit, setSelectedVoterForVisit] = useState<MobileVoter | null>(null);

  const [supportPickerState, setSupportPickerState] = useState<{
    open: boolean;
    title: string;
    subtitle?: string;
    currentPct: number;
    currentNotes?: string;
    currentMoneyStatus?: MoneyInfluenceStatus;
    voterSno?: number;
    familyId?: string;
    hasFamily?: boolean;
  }>({
    open: false,
    title: '',
    currentPct: 50
  });

  const [surnameLeaningState, setSurnameLeaningState] = useState<{
    open: boolean;
    initialClanId?: string;
  }>({
    open: false
  });

  // Default hide Victory Predictor state (user requested: by default hide this booth victory predictor)
  const [showVictoryPredictor, setShowVictoryPredictor] = useState<boolean>(() => {
    try {
      return localStorage.getItem('jsp_show_victory_predictor') === 'true';
    } catch {
      return false;
    }
  });

  const handleToggleVictoryPredictor = (show: boolean) => {
    setShowVictoryPredictor(show);
    try {
      localStorage.setItem('jsp_show_victory_predictor', String(show));
    } catch {}
  };

  // Option to toggle between 'entry' (pure candidate ground truth) and 'auto' (statistical simulation)
  const [victoryPredictorMode, setVictoryPredictorMode] = useState<'entry' | 'auto'>(() => {
    try {
      return (localStorage.getItem('jsp_victory_mode') as 'entry' | 'auto') || 'entry';
    } catch {
      return 'entry';
    }
  });

  const handleToggleVictoryMode = (mode: 'entry' | 'auto') => {
    setVictoryPredictorMode(mode);
    try {
      localStorage.setItem('jsp_victory_mode', mode);
    } catch {}
  };

  const [influencerAssignState, setInfluencerAssignState] = useState<{
    open: boolean;
    targetName: string;
    currentInfId?: string;
    voterSno?: number;
    familyId?: string;
  }>({
    open: false,
    targetName: ''
  });

  const [createFamilyState, setCreateFamilyState] = useState<{
    open: boolean;
    initialFamily?: FamilyGroup | null;
  }>({
    open: false,
    initialFamily: null
  });

  const [groupPrintState, setGroupPrintState] = useState<{
    open: boolean;
    title: string;
    subtitle?: string;
    voters: MobileVoter[];
    initialLayout?: 'slips' | 'table' | 'cards';
  }>({
    open: false,
    title: '',
    subtitle: '',
    voters: [],
    initialLayout: 'slips'
  });

  const handleOpenGroupPrint = (
    title: string,
    subtitle: string,
    votersList: MobileVoter[],
    initialLayout: 'slips' | 'table' | 'cards' = 'slips'
  ) => {
    setGroupPrintState({
      open: true,
      title,
      subtitle,
      voters: votersList,
      initialLayout
    });
  };

  // Electors Bulk Assignment Modal State & Handlers
  const [bulkAssignState, setBulkAssignState] = useState<{
    open: boolean;
    initialSelectedSnos?: number[];
    initialInfluencerId?: string;
  }>({
    open: false
  });

  const handleBulkAssignInfluencer = (voterSnos: number[], influencer: Influencer | null) => {
    if (!boothData) return;
    const updates: Partial<VoterCampaignProfile> = {
      influencerId: influencer?.id || undefined,
      influencerName: influencer?.name || undefined,
      influencerMobile: influencer?.mobile || undefined
    };
    const updated = saveBatchVoterProfiles(currentPartNo, voterSnos, updates);
    setProfiles({ ...updated });
  };

  const handleAddNewInfluencerFromBulk = (newInf: Influencer) => {
    saveInfluencer(currentPartNo, newInf);
    setInfluencers(getInfluencers(currentPartNo));
  };

  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);

  // Helper: Robust normalizer ensuring part_no, village, clean_village, ward_no, type are never undefined
  const normalizeBoothData = (data: any, partNo: number | string): BoothData => {
    if (!data) return data;
    if (!data.booth_info) {
      data.booth_info = {};
    }
    const info = data.booth_info;
    const partStr = String(partNo || info.part_no || info.booth_no || '');

    info.part_no = info.part_no ?? (info.booth_no ?? partNo);
    info.booth_no = info.booth_no ?? String(info.part_no);

    const isWardUnit = partStr.includes('_w') || String(info.part_no).includes('_w');

    if (!info.ward_no && isWardUnit) {
      const match = partStr.match(/_w(\d+)$/i);
      if (match) info.ward_no = parseInt(match[1], 10);
    }

    let cleanVill = info.clean_village || info.village || data.village || '';
    if (!cleanVill) {
      if (partStr.includes('durgada')) cleanVill = 'దుర్గడ';
      else if (partStr.includes('tatiparthy')) cleanVill = 'తాటిపర్తి';
      else if (partStr.includes('vannepudi')) cleanVill = 'వన్నెపూడి';
      else cleanVill = `బూత్ #${info.part_no}`;
    }
    info.clean_village = cleanVill;
    info.village = info.village || cleanVill;

    info.total_voters = info.total_voters || (Array.isArray(data.voters) ? data.voters.length : 0);
    info.mandal = info.mandal || data.mandal || 'GOLLAPROLU';
    info.election_type = info.election_type || (partStr.includes('gp_') || partStr.includes('mptc_') ? 'panchayat' : 'assembly');
    info.type = info.type || (isWardUnit ? 'ward' : 'village');
    info.view_level = info.view_level || (isWardUnit ? 'ward' : 'village');

    return data as BoothData;
  };

  // Helper: Multi-source fetch for booth voter data with real-time stream progress & fallback size calculation
  const fetchFreshBoothData = async (
    partNo: number | string,
    onProgress?: (p: { loaded: number; total: number; percent: number }) => void
  ): Promise<BoothData> => {
    const ts = Date.now();
    const fetchOptions: RequestInit = {
      cache: 'no-store',
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache'
      }
    };

    const urlsToTry = [
      `/booths/booth_${partNo}.json?v=${ts}`,
      `/booths/${partNo}.json?v=${ts}`,
      `https://raw.githubusercontent.com/gundradvp/pithapuram-voters-mobile/main/public/booths/booth_${partNo}.json?v=${ts}`,
      `https://raw.githubusercontent.com/gundradvp/pithapuram-voters-mobile/main/public/booths/${partNo}.json?v=${ts}`,
      `https://cdn.jsdelivr.net/gh/gundradvp/pithapuram-voters-mobile@main/public/booths/booth_${partNo}.json`
    ];

    const estimatedSize = getEstimatedUnitSize(partNo);
    let lastError: any = null;

    for (const url of urlsToTry) {
      try {
        const res = await fetch(url, fetchOptions);
        if (res.ok) {
          const headerLength = res.headers.get('content-length');
          const totalBytes = headerLength ? parseInt(headerLength, 10) : estimatedSize;

          if (res.body && typeof res.body.getReader === 'function') {
            const reader = res.body.getReader();
            const chunks: Uint8Array[] = [];
            let receivedLength = 0;

            while (true) {
              const { done, value } = await reader.read();
              if (done) break;
              chunks.push(value);
              receivedLength += value.length;
              if (onProgress) {
                const effectiveTotal = Math.max(totalBytes, receivedLength);
                const percent = Math.min(99, Math.round((receivedLength / effectiveTotal) * 100));
                onProgress({ loaded: receivedLength, total: effectiveTotal, percent });
              }
            }

            const chunksAll = new Uint8Array(receivedLength);
            let position = 0;
            for (const chunk of chunks) {
              chunksAll.set(chunk, position);
              position += chunk.length;
            }

            if (onProgress) {
              onProgress({ loaded: receivedLength, total: receivedLength, percent: 100 });
            }

            const text = new TextDecoder('utf-8').decode(chunksAll);
            const data = JSON.parse(text);
            if (data && Array.isArray(data.voters)) {
              return normalizeBoothData(data, partNo);
            }
          } else {
            const data = await res.json();
            if (onProgress) {
              onProgress({ loaded: totalBytes, total: totalBytes, percent: 100 });
            }
            if (data && Array.isArray(data.voters)) {
              return normalizeBoothData(data, partNo);
            }
          }
        }
      } catch (e) {
        lastError = e;
      }
    }
    throw lastError || new Error(`Could not fetch fresh data for unit #${partNo}`);
  };

  // Helper: Multi-source fetch for index files
  const fetchFreshIndexData = async <T,>(filename: string, fallbackUrl: string): Promise<T> => {
    const ts = Date.now();
    const fetchOptions: RequestInit = {
      cache: 'no-store',
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache'
      }
    };

    try {
      const res = await fetch(`/${filename}?v=${ts}`, fetchOptions);
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data) && data.length > 0) return data as T;
      }
    } catch (e) {
      console.warn(`Local fetch for ${filename} failed, trying fallback`);
    }

    const resFallback = await fetch(`${fallbackUrl}?v=${ts}`, fetchOptions);
    return await resFallback.json();
  };

  // 1. Load Booths Index and Local Elections Index
  const loadIndexes = useCallback(() => {
    fetchFreshIndexData<BoothIndexItem[]>(
      'booths_index.json',
      'https://raw.githubusercontent.com/gundradvp/pithapuram-voters-mobile/main/public/booths_index.json'
    )
      .then(data => setBoothsIndex(data))
      .catch(err => console.warn('Could not load booths index:', err));

    fetchFreshIndexData<LocalElectionUnit[]>(
      'local_elections_index.json',
      'https://raw.githubusercontent.com/gundradvp/pithapuram-voters-mobile/main/public/local_elections_index.json'
    )
      .then(data => setLocalUnits(data))
      .catch(err => console.warn('Could not load local elections index:', err));
  }, []);

  useEffect(() => {
    // If cache is stale from older app builds, clear stale booths so users don't see outdated data
    if (isCacheStale()) {
      clearStaleBoothCache();
    }
    loadIndexes();
  }, [loadIndexes]);

  // 2. Load Selected Unit Data (Offline-First + Immediate Auto-Fresh Update)
  const loadBooth = useCallback(async (partNo: number | string, isSilent: boolean = false) => {
    if (!isSilent) setIsLoading(true);
    setErrorMsg(null);

    const estimatedTotal = getEstimatedUnitSize(partNo);
    if (!isSilent) {
      setDownloadProgress({
        isLoading: true,
        loadedBytes: 0,
        totalBytes: estimatedTotal,
        percent: 0,
        formattedLoaded: '0 B',
        formattedTotal: formatBytes(estimatedTotal)
      });
    }

    // If Demo Mode / Demo Booth is selected, load isolated demo dataset (never touches real data)
    if (partNo === 'demo_booth' || partNo === 'demo' || partNo === 999) {
      setBoothData(DEMO_BOOTH_DATA);
      const demoLocal = getVoterProfiles('demo_booth');
      setProfiles(Object.keys(demoLocal).length > 0 ? demoLocal : DEMO_PROFILES);
      setFamilies({});
      setInfluencers({});
      setIsLoading(false);
      setDownloadProgress(prev => ({ ...prev, isLoading: false, percent: 100 }));
      return;
    }

    // Step A: Load profiles, families, influencers immediately from localStorage
    const localProfiles = getVoterProfiles(partNo);
    setProfiles(localProfiles);
    setInfluencers(getInfluencers(partNo));

    // Step A.1: Always fetch pre-committed profiles from disk/git and merge with local storage
    fetchFreshProfiles(partNo).then(diskProfiles => {
      if (diskProfiles && Object.keys(diskProfiles).length > 0) {
        const currentLocal = getVoterProfiles(partNo);
        // Merge: local modifications + disk pre-committed profiles
        const merged: Record<number, VoterCampaignProfile> = { ...diskProfiles, ...currentLocal };
        
        for (const [snoStr, dp] of Object.entries(diskProfiles)) {
          const sno = Number(snoStr);
          if (!currentLocal[sno]) {
            merged[sno] = dp;
          } else {
            // If disk has supporter status or 100% and local is unassigned, adopt disk
            if (dp.survey_status && !currentLocal[sno].survey_status) {
              merged[sno] = { ...merged[sno], ...dp };
            }
            if (dp.supportPct !== undefined && currentLocal[sno].supportPct === undefined) {
              merged[sno] = { ...merged[sno], supportPct: dp.supportPct };
            }
          }
        }
        
        // If disk has more entries than local, adopt disk as base
        const finalProfiles = Object.keys(diskProfiles).length >= Object.keys(currentLocal).length
          ? { ...currentLocal, ...diskProfiles }
          : merged;

        savePreloadedProfiles(partNo, finalProfiles);
        setProfiles(finalProfiles);
      }
    }).catch(() => {});

    // Step A.2: Pull live updates from Supabase Cloud Auto-Sync
    pullBoothFromSupabase(partNo).then(remoteBundle => {
      if (remoteBundle && remoteBundle.profiles) {
        setProfiles(prevLocal => {
          const { merged, hasChanges } = mergeRemoteProfiles(prevLocal, remoteBundle.profiles);
          if (hasChanges) {
            savePreloadedProfiles(partNo, merged);
            return merged;
          }
          return prevLocal;
        });

        if (remoteBundle.influencers && Object.keys(remoteBundle.influencers).length > 0) {
          setInfluencers(prevInf => ({ ...prevInf, ...remoteBundle.influencers }));
        }
      }
    }).catch(() => {});

    // Step B: Check local cache first (Instant load)
    const cached = getCachedBoothData(partNo);
    const stale = isCacheStale();
    const isStaleDurgadaCache = stale || ((partNo === 'gp_durgada' || partNo === 'booth_gp_durgada') && (!cached || !cached.voters || cached.voters.length < 8000));
    const isStaleTatiparthyCache = stale || ((partNo === 'gp_tatiparthy' || partNo === 'booth_gp_tatiparthy') && (!cached || !cached.voters || cached.voters.length < 6500));
    if (cached && Array.isArray(cached.voters) && cached.voters.length > 0 && !isStaleDurgadaCache && !isStaleTatiparthyCache) {
      const normalizedCached = normalizeBoothData(cached, partNo);
      setBoothData(normalizedCached);
      setFamilies(getFamilyGroups(partNo, cached.voters));
      setIsCached(true);
      if (!isSilent) setIsLoading(false);
    }

    // Step C: Fetch latest fresh data over network with cache-busting & fallbacks
    try {
      const onlineData = await fetchFreshBoothData(partNo, ({ loaded, total, percent }) => {
        if (!isSilent) {
          setDownloadProgress({
            isLoading: true,
            loadedBytes: loaded,
            totalBytes: total,
            percent,
            formattedLoaded: formatBytes(loaded),
            formattedTotal: formatBytes(total)
          });
        }
      });
      setBoothData(onlineData);
      saveCachedBoothData(partNo, onlineData);
      setFamilies(getFamilyGroups(partNo, onlineData.voters));
      setIsCached(true);
      setIsLoading(false);
      setDownloadProgress(prev => ({ ...prev, isLoading: false, percent: 100 }));
    } catch (err) {
      console.warn('Network fetch failed, relying on cache:', err);
      if (!cached) {
        const isWard = typeof partNo === 'string' && partNo.startsWith('ward_');
        setErrorMsg(
          isWard 
            ? `పురపాలక వార్డు #${partNo.replace('ward_', '')} డేటా ఆఫ్‌లైన్‌లో అందుబాటులో లేదు. దయచేసి నెట్‌వర్క్ కనెక్ట్ చేయండి.`
            : `Booth #${partNo} data is not available offline. Please connect to internet to download it.`
        );
      }
      setIsLoading(false);
      setDownloadProgress(prev => ({ ...prev, isLoading: false }));
    }
  }, []);

  // Auto-switch to Demo Booth if Demo User
  useEffect(() => {
    if (session?.role === 'demo') {
      setCurrentPartNo('demo_booth');
      loadBooth('demo_booth');
    }
  }, [session?.role, loadBooth]);

  // 3. User-triggered or Programmatic Refresh
  const handleRefreshData = useCallback(async (isManual: boolean = true) => {
    if (isManual) setIsRefreshing(true);
    try {
      loadIndexes();
      await loadBooth(currentPartNo, true);
      if (isManual) {
        setScoreNotification(
          lang === 'te' 
            ? '✅ తాజా ఓటర్ల సమాచారం ఆటో-రిఫ్రెష్ అయ్యింది!' 
            : '✅ Fresh voter data auto-refreshed successfully!'
        );
        setTimeout(() => setScoreNotification(null), 3000);
      }
    } catch (e) {
      console.warn('Refresh error:', e);
    } finally {
      if (isManual) setIsRefreshing(false);
    }
  }, [currentPartNo, loadBooth, loadIndexes, lang]);

  // 4. Auto-Refresh on Window Focus & Tab Visibility Change (Mobile/Browser wake)
  useEffect(() => {
    const handleVisibilityOrFocus = () => {
      if (document.visibilityState === 'visible') {
        handleRefreshData(false);
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityOrFocus);
    window.addEventListener('focus', handleVisibilityOrFocus);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityOrFocus);
      window.removeEventListener('focus', handleVisibilityOrFocus);
    };
  }, [handleRefreshData]);

  // 5. Periodic Auto-Refresh every 60s when active
  useEffect(() => {
    const timer = setInterval(() => {
      if (document.visibilityState === 'visible') {
        handleRefreshData(false);
      }
    }, 60000);
    return () => clearInterval(timer);
  }, [handleRefreshData]);

  // Handle Clearing Cache & Reloading Fresh
  const handleClearCacheAndReload = useCallback(async () => {
    clearStaleBoothCache();
    await handleRefreshData(true);
  }, [handleRefreshData]);

  useEffect(() => {
    // Strictly auto-load only in demo mode. For real data, load list only when click load (Requirement 3)
    if (session?.role === 'demo') {
      loadBooth(currentPartNo);
      setIsListLoaded(true);
    } else {
      setIsLocked(isBoothLocked());
      setIsCached(isBoothCached(currentPartNo));
    }
  }, [currentPartNo, loadBooth, session?.role]);

  // Handle Load List on explicit user click (Requirement 3)
  const handleLoadList = async () => {
    if (session?.role === 'volunteer') {
      if (currentAssignment && isAssignmentExpired(currentAssignment)) {
        alert(lang === 'te' ? '⚠️ ఈ కేటాయింపు కాలపరిమితి ముగిసింది. దయచేసి అడ్మిన్‌ను సంప్రదించండి.' : '⚠️ This assignment has expired. Please contact Admin.');
        return;
      }
      const isCurrentValid =
        (typeof currentPartNo === 'number' && assignedAssemblyBooths.includes(currentPartNo)) ||
        (typeof currentPartNo === 'string' && assignedMunicipalWards.includes(currentPartNo));
      if (!isCurrentValid) {
        alert(lang === 'te' ? 'ఈ బూత్ మీకు కేటాయించబడలేదు.' : 'This booth is not assigned to you.');
        return;
      }
    }
    setIsListLoaded(true);
    await loadBooth(currentPartNo);
  };

  // Handle Unload List (Requirement 5)
  const handleUnloadList = () => {
    setIsListLoaded(false);
    setBoothData(null);
    triggerScoreNotice(lang === 'te' ? '📤 ఓటర్ల జాబితా అన్‌లోడ్ చేయబడింది' : '📤 Voter list unloaded');
  };

  // 6. Supabase Cloud Auto-Push (Debounced Background Save)
  useEffect(() => {
    if (isLoading || session?.role === 'demo' || !currentPartNo) return;
    if (Object.keys(profiles).length === 0 && Object.keys(influencers).length === 0) return;

    pushBoothToSupabaseDebounced(
      currentPartNo,
      profiles,
      influencers,
      families,
      setCloudSyncState
    );
  }, [profiles, influencers, families, currentPartNo, isLoading, session]);

  // 7. Supabase Cloud Auto-Pull (Realtime background sync across all devices)
  useEffect(() => {
    if (isLoading || session?.role === 'demo' || !currentPartNo) return;

    let isSubscribed = true;

    const syncWithSupabase = async () => {
      try {
        const remote = await pullBoothFromSupabase(currentPartNo);
        if (!isSubscribed || !remote || !remote.profiles) return;

        setProfiles(local => {
          const { merged, hasChanges } = mergeRemoteProfiles(local, remote.profiles);
          if (hasChanges) {
            savePreloadedProfiles(currentPartNo, merged);
            return merged;
          }
          return local;
        });

        if (remote.influencers && Object.keys(remote.influencers).length > 0) {
          setInfluencers(localInf => {
            let changed = false;
            const next = { ...localInf };
            Object.entries(remote.influencers!).forEach(([id, inf]) => {
              if (!next[id] || JSON.stringify(next[id]) !== JSON.stringify(inf)) {
                next[id] = inf;
                changed = true;
              }
            });
            return changed ? next : localInf;
          });
        }
      } catch {}
    };

    const interval = setInterval(syncWithSupabase, 8000);
    const handleFocus = () => syncWithSupabase();
    window.addEventListener('focus', handleFocus);

    return () => {
      isSubscribed = false;
      clearInterval(interval);
      window.removeEventListener('focus', handleFocus);
    };
  }, [currentPartNo, isLoading, session]);

  // Compute Winning Score dynamically
  const winningScore: WinningScoreCalculation | null = useMemo(() => {
    if (!boothData) return null;
    return calculateWinningScore(boothData, profiles, victoryPredictorMode);
  }, [boothData, profiles, victoryPredictorMode]);

  // Global Escape key listener to close any active modal
  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (selectedVoterForSlip) {
          setSelectedVoterForSlip(null);
          return;
        }
        if (selectedVoterForPhone) {
          setSelectedVoterForPhone(null);
          return;
        }
        if (selectedVoterForVisit) {
          setSelectedVoterForVisit(null);
          return;
        }
        if (supportPickerState.open) {
          setSupportPickerState(prev => ({ ...prev, open: false }));
          return;
        }
        if (influencerAssignState.open) {
          setInfluencerAssignState(prev => ({ ...prev, open: false }));
          return;
        }
        if (createFamilyState.open) {
          setCreateFamilyState({ open: false, initialFamily: null });
          return;
        }
        if (groupPrintState.open) {
          setGroupPrintState(prev => ({ ...prev, open: false }));
          return;
        }
        if (surnameLeaningState.open) {
          setSurnameLeaningState({ open: false });
          return;
        }
        if (bulkAssignState.open) {
          setBulkAssignState({ open: false });
          return;
        }
        if (isSyncModalOpen) {
          setIsSyncModalOpen(false);
          return;
        }
        if (isThemeModalOpen) {
          setIsThemeModalOpen(false);
          return;
        }
        if (isAdminModalOpen) {
          setIsAdminModalOpen(false);
          return;
        }
        if (isBoothSelectorOpen) {
          setIsBoothSelectorOpen(false);
          return;
        }
        if (isLoginModalOpen && session) {
          setIsLoginModalOpen(false);
          return;
        }
      }
    };

    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, [
    selectedVoterForSlip,
    selectedVoterForPhone,
    selectedVoterForVisit,
    supportPickerState.open,
    influencerAssignState.open,
    createFamilyState.open,
    groupPrintState.open,
    surnameLeaningState.open,
    bulkAssignState.open,
    isSyncModalOpen,
    isThemeModalOpen,
    isAdminModalOpen,
    isBoothSelectorOpen,
    isLoginModalOpen,
    session
  ]);

  // Show score bump toast notification
  const triggerScoreNotice = (msg: string) => {
    setScoreNotification(msg);
    setTimeout(() => {
      setScoreNotification(null);
    }, 3500);
  };

  // Handle Booth / Ward Assignment (Strictly checks volunteer assignment)
  const handleSelectBooth = (partNo: number | string, lock: boolean) => {
    if (session?.role === 'volunteer') {
      const isValid =
        (typeof partNo === 'number' && assignedAssemblyBooths.includes(partNo)) ||
        (typeof partNo === 'string' && assignedMunicipalWards.includes(partNo));
      if (!isValid) {
        alert(lang === 'te' ? 'ఈ బూత్ మీకు కేటాయించబడలేదు.' : 'This booth is not assigned to you.');
        return;
      }
    }
    setErrorMsg(null);
    // Always unload list when switching units; load only when clicked
    setIsListLoaded(false);
    setBoothData(null);
    setCurrentPartNo(partNo);
    setAssignedBooth(partNo, lock);
    setIsLocked(lock);
  };

  // Helper: Instantly switch to complete GP from any individual ward
  const handleSwitchToFullVillage = useCallback(() => {
    const curr = String(currentPartNo || '');
    let target = 'gp_durgada';
    if (curr.startsWith('gp_tatiparthy')) target = 'gp_tatiparthy';
    else if (curr.startsWith('gp_vannepudi')) target = 'gp_vannepudi';
    setErrorMsg(null);
    setCurrentPartNo(target);
    setAssignedBooth(target, false);
    setIsLocked(false);
    setIsListLoaded(true);
    loadBooth(target);
  }, [currentPartNo, loadBooth]);

  // Handle Phone Number Save
  const handleSavePhone = (voter: MobileVoter, phone: string, altPhone?: string) => {
    saveVoterProfile(currentPartNo, voter.s, { customPhone: phone, altPhone });
    setProfiles(prev => ({
      ...prev,
      [voter.s]: {
        ...prev[voter.s],
        customPhone: phone,
        altPhone
      }
    }));
    triggerScoreNotice(lang === 'te' ? `📱 ${voter.n} గారి ఫోన్ నంబర్ సేవ్ అయ్యింది` : `📱 Phone updated for ${voter.n}`);
  };

  // Handle Support Leaning Save
  const handleSaveSupport = (
    pct: number,
    notes?: string,
    applyToFamily?: boolean,
    moneyStatus?: MoneyInfluenceStatus
  ) => {
    const { voterSno, familyId } = supportPickerState;

    if (voterSno) {
      const voter = boothData?.voters.find(v => v.s === voterSno);
      const updates: Partial<VoterCampaignProfile> = {
        supportPct: pct,
        notes,
        moneyStatus: moneyStatus !== 'none' ? moneyStatus : undefined
      };
      saveVoterProfile(currentPartNo, voterSno, updates);

      // Apply to all family members if requested
      if (applyToFamily && voter) {
        const famKey = Object.values(families).find(f => f.memberSnos.includes(voterSno));
        if (famKey) {
          famKey.supportPct = pct;
          famKey.supportCategory = pct === 100 ? 'full_support' : pct >= 75 ? 'strong_lean' : pct === 0 ? 'opponent' : 'neutral_swing';
          saveFamilyGroup(currentPartNo, famKey);

          famKey.memberSnos.forEach(sno => {
            saveVoterProfile(currentPartNo, sno, updates);
          });
          setFamilies(getFamilyGroups(currentPartNo));
        }
      }

      setProfiles(getVoterProfiles(currentPartNo));

      // Notification based on money status and support category
      if (moneyStatus === 'opponent_paid_safe') {
        triggerScoreNotice(lang === 'te' ? '💰 ప్రత్యర్థి డబ్బు ఇచ్చినా మనకే ఓటు అని నమోదు అయ్యింది!' : '💰 Took opponent cash, confirmed our voter!');
      } else if (moneyStatus === 'opponent_paid_swung') {
        triggerScoreNotice(lang === 'te' ? '💸 డబ్బుతో మారిన ఓటుగా నమోదు చేయబడింది' : '💸 Marked as bought by opponent');
      } else if (pct === 100) {
        triggerScoreNotice(lang === 'te' ? `⭐ 100% మనవాళ్లే చేరారు! +1 మన ఓటు పెరిగింది` : `⭐ 100% Supporter Added! +1 Projected Vote`);
      } else if (pct >= 75) {
        triggerScoreNotice(lang === 'te' ? `🟢 మన మద్దతుదారుడు చేరారు! +0.75 ఓటు పెరిగింది` : `🟢 Strong Supporter Added! +0.75 Projected Vote`);
      } else if (pct === 40) {
        triggerScoreNotice(lang === 'te' ? `🟡 40% సానుకూల ఓటరు జతయ్యారు! +0.40 ఓటు పెరిగింది` : `🟡 40% Positive Added! +0.40 Projected Vote`);
      } else if (pct === 0) {
        triggerScoreNotice(lang === 'te' ? `🔴 ప్రత్యర్థిగా మార్చారు! ప్రత్యర్థి ఓట్ల సంఖ్య పెరిగి, లీడ్ తగ్గింది` : `🔴 Opponent Marked! Opposition vote added, margin reduced.`);
      } else {
        triggerScoreNotice(lang === 'te' ? `⚪ ఓటరు అభిప్రాయం అప్‌డేట్ అయ్యింది (${pct}%)` : `⚪ Neutral leaning updated (${pct}%)`);
      }
    } else if (familyId) {
      const fam = families[familyId];
      if (fam) {
        fam.supportPct = pct;
        fam.campaignNotes = notes;
        fam.supportCategory = pct === 100 ? 'full_support' : pct >= 75 ? 'strong_lean' : pct === 0 ? 'opponent' : 'neutral_swing';
        saveFamilyGroup(currentPartNo, fam);

        fam.memberSnos.forEach(sno => {
          saveVoterProfile(currentPartNo, sno, {
            supportPct: pct,
            moneyStatus: moneyStatus !== 'none' ? moneyStatus : undefined
          });
        });
        setFamilies(getFamilyGroups(currentPartNo));
        setProfiles(getVoterProfiles(currentPartNo));

        triggerScoreNotice(lang === 'te' ? `🏠 కుటుంబ సభ్యులందరి మద్దతు ${pct}% గా మారింది` : `🏠 Family sentiment updated to ${pct}%`);
      }
    }
  };

  // Handle Bulk Surname Leaning Save
  const handleApplySurnameLeaning = (
    surnameId: string,
    supportPct: number,
    moneyStatus: MoneyInfluenceStatus,
    overrideExisting: boolean,
    notes?: string
  ) => {
    if (!boothData) return;
    const clans = classifyBoothSurnames(boothData.voters, profiles);
    const clan = clans.find(c => c.id === surnameId);
    if (!clan) return;

    const targetSnos: number[] = [];
    clan.voters.forEach(v => {
      const existing = profiles[v.s];
      if (overrideExisting || existing?.supportPct === undefined) {
        targetSnos.push(v.s);
      }
    });

    if (targetSnos.length === 0) {
      triggerScoreNotice(lang === 'te' ? '⚠️ నమోదు చేయడానికి కొత్త ఓటర్లు లేరు (అందరూ ఇప్పటికే నమోదయ్యారు)' : 'No new voters to update in this clan');
      return;
    }

    const updates: Partial<VoterCampaignProfile> = {
      supportPct,
      moneyStatus: moneyStatus !== 'none' ? moneyStatus : undefined,
      notes: notes || undefined
    };

    const newProfiles = saveBatchVoterProfiles(currentPartNo, targetSnos, updates);
    setProfiles(newProfiles);
    triggerScoreNotice(
      lang === 'te'
        ? `✅ ${clan.nameTe || clan.nameEn} వంశంలోని ${targetSnos.length} మంది ఓటర్లకు ${supportPct}% మొగ్గు నమోదు చేయబడింది!`
        : `Applied ${supportPct}% to ${targetSnos.length} voters of ${clan.nameEn} clan`
    );
  };

  // Handle Field Visit Log
  const handleSaveVisit = (voter: MobileVoter, visit: VoterVisit) => {
    addVoterVisit(currentPartNo, voter.s, visit);
    setProfiles(getVoterProfiles(currentPartNo));
    triggerScoreNotice(lang === 'te' ? `📋 ${voter.n} గారి విజిట్ సేవ్ అయ్యింది! గెలుపు స్కోర్ అప్‌డేట్ అయ్యింది` : `📋 Field visit logged for ${voter.n}! Winning score refreshed.`);
  };

  // Handle Influencer Assignment
  const handleAssignInfluencer = (influencer: Influencer | null) => {
    const { voterSno, familyId } = influencerAssignState;

    if (voterSno) {
      saveVoterProfile(currentPartNo, voterSno, {
        influencerId: influencer?.id || '',
        influencerName: influencer?.name || '',
        influencerMobile: influencer?.mobile || ''
      });
      setProfiles(getVoterProfiles(currentPartNo));
      triggerScoreNotice(lang === 'te' ? `🤝 నాయకుడికి ఓటరును కేటాయించారు` : `🤝 Influencer assigned to voter`);
    } else if (familyId) {
      const fam = families[familyId];
      if (fam) {
        fam.influencerId = influencer?.id || '';
        fam.influencerName = influencer?.name || '';
        fam.influencerMobile = influencer?.mobile || '';
        saveFamilyGroup(currentPartNo, fam);

        fam.memberSnos.forEach(sno => {
          saveVoterProfile(currentPartNo, sno, {
            influencerId: influencer?.id || '',
            influencerName: influencer?.name || '',
            influencerMobile: influencer?.mobile || ''
          });
        });
        setFamilies(getFamilyGroups(currentPartNo));
        setProfiles(getVoterProfiles(currentPartNo));
        triggerScoreNotice(lang === 'te' ? `🤝 కుటుంబానికి నాయకుడిని కేటాయించారు` : `🤝 Influencer assigned to family`);
      }
    }
  };

  // Handle Family Create/Edit
  const handleSaveFamily = (family: FamilyGroup) => {
    saveFamilyGroup(currentPartNo, family);
    setFamilies(getFamilyGroups(currentPartNo));
    triggerScoreNotice(lang === 'te' ? `🏠 కుటుంబ గ్రూప్ సేవ్ అయ్యింది` : `🏠 Family group saved`);
  };

  const handleDeleteFamily = (familyId: string) => {
    deleteFamilyGroup(currentPartNo, familyId);
    setFamilies(getFamilyGroups(currentPartNo));
    triggerScoreNotice(lang === 'te' ? `🗑️ కుటుంబం తీసివేయబడింది` : `🗑️ Family group removed`);
  };

  // Handle New Influencer Creation
  const handleAddNewInfluencer = (newInf: Influencer) => {
    saveInfluencer(currentPartNo, newInf);
    setInfluencers(getInfluencers(currentPartNo));
    triggerScoreNotice(lang === 'te' ? `⭐ కొత్త నాయకుడు "${newInf.name}" నమోదయ్యారు` : `⭐ New Influencer registered`);
  };

  // Handle Field Survey Quick Status Mark
  const handleUpdateSurveyMark = (serialNo: number, status: VoterSurveyStatus | null) => {
    saveVoterProfile(currentPartNo, serialNo, { survey_status: status });
    setProfiles(getVoterProfiles(currentPartNo));
    if (status === 'voted') triggerScoreNotice(lang === 'te' ? `✅ ఓటు వేశారు అని మార్క్ చేశారు` : `✅ Marked Voted for S.No #${serialNo}`);
    else if (status === 'supporter') triggerScoreNotice(lang === 'te' ? `⭐ మన మద్దతుదారుడిగా మార్క్ చేశారు` : `⭐ Marked Supporter for S.No #${serialNo}`);
    else if (status === 'opponent') triggerScoreNotice(lang === 'te' ? `🔴 ప్రత్యర్థిగా మార్క్ చేశారు` : `🔴 Marked Opponent for S.No #${serialNo}`);
    else if (status === 'deceased') triggerScoreNotice(lang === 'te' ? `💀 S.No #${serialNo} మరణించినట్లుగా నమోదు చేయబడింది` : `💀 S.No #${serialNo} marked Deceased`);
    else if (status === 'out_of_city') triggerScoreNotice(lang === 'te' ? `✈️ S.No #${serialNo} ఊర్లో లేరుగా మార్క్ చేయబడింది` : `✈️ S.No #${serialNo} marked Out of City`);
    else if (status === 'doubtful') triggerScoreNotice(lang === 'te' ? `⚠️ S.No #${serialNo} అనుమానంగా మార్క్ చేశారు` : `⚠️ Marked Doubtful for S.No #${serialNo}`);
    else if (status === 'visited') triggerScoreNotice(lang === 'te' ? `📋 S.No #${serialNo} విజిట్ చేసినట్లుగా మార్క్ చేశారు` : `📋 Marked Visited for S.No #${serialNo}`);
    else triggerScoreNotice(lang === 'te' ? `స్టేటస్ రీసెట్ చేయబడింది` : `Status cleared`);
  };

  // Quick Switch 1: Toggle Ours (100% Supporter)
  const handleQuickToggleOurs = (serialNo: number) => {
    const existing = profiles[serialNo] || {};
    const isCurrentlyOurs = existing.supportPct === 100 || existing.survey_status === 'supporter';

    if (isCurrentlyOurs) {
      saveVoterProfile(currentPartNo, serialNo, {
        supportPct: 50,
        survey_status: existing.survey_status === 'supporter' ? null : existing.survey_status
      });
      setProfiles(getVoterProfiles(currentPartNo));
      triggerScoreNotice(lang === 'te' ? `⚪ #${serialNo} మద్దతు రీసెట్ చేయబడింది` : `⚪ S.No #${serialNo} support reset`);
    } else {
      saveVoterProfile(currentPartNo, serialNo, {
        supportPct: 100,
        survey_status: existing.survey_status || 'supporter'
      });
      setProfiles(getVoterProfiles(currentPartNo));
      triggerScoreNotice(
        lang === 'te'
          ? `⭐ #${serialNo} మనవాళ్లే (100% మద్దతుదారు) గా నమోదయ్యారు! +1 మన ఓటు`
          : `⭐ S.No #${serialNo} marked as Ours (100% Supporter)!`
      );
    }
  };

  // Quick Switch 2: Toggle Voted
  const handleQuickToggleVoted = (serialNo: number) => {
    const existing = profiles[serialNo] || {};
    const isCurrentlyVoted = existing.survey_status === 'voted';
    const newStatus: VoterSurveyStatus | null = isCurrentlyVoted ? null : 'voted';

    saveVoterProfile(currentPartNo, serialNo, { survey_status: newStatus });
    setProfiles(getVoterProfiles(currentPartNo));

    if (isCurrentlyVoted) {
      triggerScoreNotice(lang === 'te' ? `↩️ #${serialNo} ఓటు మార్కింగ్ తీసివేయబడింది` : `↩️ S.No #${serialNo} marked as not yet voted`);
    } else {
      triggerScoreNotice(lang === 'te' ? `✅ #${serialNo} ఓటేశారు అని నమోదైంది!` : `✅ S.No #${serialNo} marked as Voted!`);
    }
  };

  // Update Custom Input / Alias (e.g. kanniaha when parsed is kannayya)
  const handleUpdateCustomAlias = (serialNo: number, alias: string) => {
    saveVoterProfile(currentPartNo, serialNo, { customAlias: alias.trim() || undefined });
    setProfiles(getVoterProfiles(currentPartNo));
    if (alias.trim()) {
      triggerScoreNotice(lang === 'te' ? `✏️ #${serialNo} కు మీ ఇన్పుట్ "${alias.trim()}" సేవ్ అయ్యింది` : `✏️ Custom alias saved for #${serialNo}`);
    }
  };

  const handleUpdateCustomPhone = (serialNo: number, phone: string) => {
    saveVoterProfile(currentPartNo, serialNo, { customPhone: phone.trim() || undefined });
    setProfiles(getVoterProfiles(currentPartNo));
  };

  const handleUpdateSupportPct = (serialNo: number, pct: number) => {
    const newStatus = pct === 100 ? 'supporter' : pct === 0 ? 'opponent' : null;
    saveVoterProfile(currentPartNo, serialNo, { supportPct: pct, survey_status: newStatus });
    setProfiles(getVoterProfiles(currentPartNo));
  };

  // Handle Custom JSON file import
  const handleImportCustomJson = (customData: BoothData) => {
    setBoothData(customData);
    const pNo = customData.booth_info.part_no;
    setCurrentPartNo(pNo);
    saveCachedBoothData(pNo, customData);
    setIsCached(true);
    setProfiles(getVoterProfiles(pNo));
    setFamilies(getFamilyGroups(pNo, customData.voters));
    setInfluencers(getInfluencers(pNo));
  };

  // Handle Sync Applied (from Modal or Backup)
  const handleSyncApplied = (bundle: CampaignSyncBundle) => {
    if (String(bundle.partNo) === String(currentPartNo)) {
      setProfiles(bundle.profiles);
      if (bundle.families) setFamilies(bundle.families);
      if (bundle.influencers) setInfluencers(bundle.influencers);
    }
    triggerScoreNotice(
      lang === 'te'
        ? `🎉 బూత్ #${bundle.partNo} డేటా విజయవంతంగా సింక్ అయ్యింది!`
        : `🎉 Unit #${bundle.partNo} campaign data synced successfully!`
    );
  };

  const handleExitDemo = () => {
    logoutUser();
    setSession(null);
    setCurrentPartNo('gp_tatiparthy');
    loadBooth('gp_tatiparthy');
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans select-none antialiased">
      {/* Responsive Header with Desktop Tabs & Mobile Toggle */}
      <HeaderMobile
        boothInfo={boothData?.booth_info || null}
        isLocked={isLocked}
        isCached={isCached}
        language={lang}
        theme={theme}
        session={session}
        remainingTime={remainingTime}
        isRefreshing={isRefreshing}
        cloudSyncState={cloudSyncState}
        layoutMode={layoutMode}
        onToggleLayoutMode={handleToggleLayoutMode}
        activeTab={activeTab}
        onTabChange={setActiveTab}
        votersCount={boothData?.voters.length || 0}
        kriyaCount={boothData?.booth_info.total_kriya_count || 0}
        onRefreshData={() => handleRefreshData(true)}
        onOpenSyncModal={() => setIsSyncModalOpen(true)}
        onToggleLanguage={toggleLanguage}
        onOpenThemeSelector={() => setIsThemeModalOpen(true)}
        onOpenBoothSelector={() => setIsBoothSelectorOpen(true)}
        onOpenAdminHub={() => setIsAdminModalOpen(true)}
        onUnload={boothData ? handleUnloadList : undefined}
        onSwitchToFullVillage={handleSwitchToFullVillage}
        onLogout={() => {
          bustAllCache();
          logoutUser();
          setSession(null);
          setBoothData(null);
          setIsListLoaded(false);
          setProfiles({});
          setFamilies({});
          setInfluencers({});
          setIsLoginModalOpen(true);
        }}
      />

      {/* Demo Mode Notice Banner (Requirement 1 & 2) */}
      {session?.role === 'demo' && (
        <div className="bg-amber-500 text-slate-950 px-3 py-1.5 flex items-center justify-between text-xs font-black shadow-md sticky top-[49px] z-30">
          <div className="flex items-center gap-1.5 truncate">
            <span className="text-sm">🎮</span>
            <span className="truncate">
              {lang === 'te' 
                ? 'డెమో మోడ్: శాంపుల్ డేటాతో ప్లే చేస్తున్నారు (అసలు డేటా సురక్షితం)' 
                : 'Demo Mode: Testing with 50 sample voters (Real data safe)'}
            </span>
          </div>
          <button
            onClick={handleExitDemo}
            className="px-2.5 py-0.5 bg-slate-950 text-amber-300 rounded-lg text-[10px] font-black uppercase tracking-wider shrink-0 hover:bg-slate-900 active:scale-95 transition-all shadow-sm"
          >
            {lang === 'te' ? 'ఎగ్జిట్ డెమో' : 'Exit Demo'}
          </button>
        </div>
      )}

      {/* Floating Dynamic Score Notification Toast */}
      {scoreNotification && (
        <div className="fixed top-14 left-1/2 transform -translate-x-1/2 z-50 bg-amber-500 text-slate-950 px-4 py-2 rounded-2xl shadow-2xl font-black text-xs flex items-center gap-2 border border-amber-300 animate-in fade-in slide-in-from-top-2 duration-200">
          <Sparkles className="w-4 h-4 text-slate-950 flex-shrink-0" />
          <span>{scoreNotification}</span>
        </div>
      )}

      {/* Main Content Area: Expands to full screen in Excel mode or Desktop mode */}
      <main className={`flex-1 w-full mx-auto transition-all duration-150 ${
        activeTab === 'voters' && votersViewMode === 'excel'
          ? 'max-w-none w-full px-2 sm:px-4 lg:px-6 py-2'
          : layoutMode === 'desktop'
            ? 'w-full max-w-none px-3 sm:px-6 lg:px-8 py-3 pb-8'
            : 'max-w-lg p-3 pb-24'
      }`}>
        {/* Unassigned Volunteer Notice Banner */}
        {session && session.role === 'volunteer' && assignedAssemblyBooths.length === 0 && assignedMunicipalWards.length === 0 && (
          <div className="bg-amber-950/40 border border-amber-500/50 rounded-2xl p-4 text-center space-y-2 mb-4 animate-in fade-in">
            <div className="text-amber-400 font-bold text-xs">
              {lang === 'te' ? '⚠️ బూతులు ఇంకా కేటాయించబడలేదు' : '⚠️ No Booths Assigned Yet'}
            </div>
            <p className="text-[11px] text-slate-300">
              {lang === 'te' 
                ? `మీ మొబైల్ నంబర్ (+91 ${session.phone}) కు ఇంకా అసెంబ్లీ లేదా మున్సిపల్ బూతులు కేటాయించబడలేదు.`
                : `Your mobile number (+91 ${session.phone}) has not been assigned any booths or wards yet.`}
            </p>
            <a
              href={getWhatsAppShareUrl('9000273028', `నమస్తే అడ్మిన్ గారు, నా మొబైల్ నంబర్ ${session.phone} తో పిఠాపురం ఎలక్షన్ యాప్‌లో లాగిన్ అయ్యాను. దయచేసి నాకు బూత్/వార్డు బాధ్యతలు కేటాయించండి.`)}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold shadow-md shadow-emerald-950/40"
            >
              <MessageSquare className="w-3.5 h-3.5" />
              <span>{lang === 'te' ? 'అడ్మిన్‌ను వాట్సాప్‌లో కోరండి (9000273028)' : 'Request Admin on WhatsApp'}</span>
            </a>
          </div>
        )}
        {isLoading && !boothData && (
          <div className="py-12 max-w-md mx-auto px-4 animate-in fade-in">
            <div className="p-6 rounded-3xl bg-slate-900/95 border border-amber-500/40 shadow-2xl space-y-4 text-center relative overflow-hidden backdrop-blur-md">
              <div className="relative inline-flex items-center justify-center">
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-amber-500 via-indigo-600 to-emerald-500 flex items-center justify-center shadow-lg shadow-amber-950/50 border border-amber-400/40">
                  <DownloadCloud className="w-8 h-8 text-white animate-bounce" />
                </div>
              </div>

              <div>
                <span className="text-[10px] uppercase font-bold text-amber-400 tracking-wider">
                  {lang === 'te' ? 'ఓటర్ల డేటా డౌన్‌లోడ్ అవుతోంది' : 'Downloading Voter Electoral Data'}
                </span>
                <h3 className="text-base font-black text-white mt-0.5 truncate">
                  {(() => {
                    if (typeof currentPartNo === 'number') {
                      const b = boothsIndex.find(x => Number(x.part_no) === currentPartNo);
                      return `బూత్ #${currentPartNo}: ${b?.clean_village || b?.village || ''}`;
                    }
                    const u = localUnits.find(x => x.id === currentPartNo);
                    return u ? `${u.clean_village || u.village || u.id}` : `యూనిట్ #${currentPartNo}`;
                  })()}
                </h3>
              </div>

              {/* File Size & Progress Metrics */}
              <div className="bg-slate-950/80 border border-slate-800 rounded-2xl p-4 space-y-3">
                <div className="flex items-center justify-between text-xs font-mono">
                  <span className="text-slate-400 font-bold flex items-center gap-1.5">
                    <Database className="w-3.5 h-3.5 text-amber-400" />
                    <span>{lang === 'te' ? 'ఫైల్ పరిమాణం (Size):' : 'File Size:'}</span>
                  </span>
                  <span className="font-extrabold text-amber-300">
                    {downloadProgress.formattedLoaded} / {downloadProgress.formattedTotal}
                  </span>
                </div>

                {/* Animated Progress Bar */}
                <div className="w-full bg-slate-900 h-3.5 rounded-full overflow-hidden border border-slate-700/60 p-0.5 relative shadow-inner">
                  <div 
                    className="h-full bg-gradient-to-r from-amber-500 via-emerald-400 to-emerald-500 rounded-full transition-all duration-150 shadow-sm shadow-emerald-500/50"
                    style={{ width: `${Math.max(5, Math.min(100, downloadProgress.percent))}%` }}
                  />
                </div>

                <div className="flex items-center justify-between text-xs pt-0.5">
                  <span className="text-slate-400 flex items-center gap-1.5 font-medium">
                    <Loader2 className="w-3.5 h-3.5 text-amber-400 animate-spin" />
                    <span>{lang === 'te' ? 'డౌన్‌లోడ్ పురోగతి:' : 'Progress:'}</span>
                  </span>
                  <span className="font-black font-mono text-emerald-400 text-base">
                    {downloadProgress.percent}%
                  </span>
                </div>
              </div>

              <p className="text-[10.5px] text-slate-400 leading-tight">
                {lang === 'te'
                  ? 'ఒక్కసారి డౌన్‌లోడ్ అయిన తర్వాత ఇంటర్నెట్ లేకపోయినా మొత్తం ఓటర్ల జాబితా ఆఫ్‌లైన్‌లో పనిచేస్తుంది.'
                  : 'Once downloaded, the voter list will work completely offline in the field.'}
              </p>
            </div>
          </div>
        )}

        {errorMsg && !boothData && (
          <div className="bg-red-950/30 border border-red-500/40 rounded-2xl p-5 text-center space-y-3 my-8">
            <AlertCircle className="w-8 h-8 text-red-400 mx-auto" />
            <p className="text-xs text-red-300 font-bold">{errorMsg}</p>
            <button
              onClick={() => setIsBoothSelectorOpen(true)}
              className="px-4 py-2 bg-amber-500 text-slate-950 font-black rounded-xl text-xs"
            >
              {lang === 'te' ? 'వేరే బూత్ ఎంచుకోండి' : 'Select Another Booth'}
            </button>
          </div>
        )}

        {/* REQUIREMENT 3 & 5: Load List Only When Clicked, and Timer Expiry Display */}
        {(!isListLoaded || !boothData) && !isLoading && (
          <div className="py-8 max-w-md mx-auto space-y-4 animate-in fade-in">
            {/* Unit Header Card */}
            <div className="p-5 rounded-3xl bg-slate-900/90 border border-amber-500/40 shadow-2xl space-y-3.5 text-center relative overflow-hidden">
              <div className="inline-flex w-14 h-14 rounded-2xl bg-gradient-to-tr from-indigo-700 via-blue-600 to-amber-500 items-center justify-center text-white text-3xl shadow-xl shadow-indigo-950/60 border border-amber-400/50">
                🗳️
              </div>
              
              <div>
                <span className="text-[10px] uppercase font-bold text-amber-400 tracking-wider">
                  {lang === 'te' ? 'కేటాయించిన బూత్ / వార్డు' : 'Assigned Voting Unit'}
                </span>
                <h2 className="text-lg font-black text-white mt-1">
                  {(() => {
                    if (typeof currentPartNo === 'number') {
                      const b = boothsIndex.find(x => Number(x.part_no) === currentPartNo);
                      return `బూత్ #${currentPartNo}: ${b?.clean_village || b?.village || ''}`;
                    }
                    const u = localUnits.find(x => x.id === currentPartNo);
                    return u ? `${u.clean_village || u.village || u.id}` : `వార్డు / పంచాయతీ #${currentPartNo}`;
                  })()}
                </h2>
                <p className="text-xs text-slate-400 mt-1">
                  {(() => {
                    if (typeof currentPartNo === 'number') {
                      const b = boothsIndex.find(x => Number(x.part_no) === currentPartNo);
                      return b?.total_voters ? `మొత్తం ఓటర్లు: ~${b.total_voters} మంది` : 'పిఠాపురం అసెంబ్లీ నియోజకవర్గం';
                    }
                    const u = localUnits.find(x => x.id === currentPartNo);
                    return u?.total_voters ? `మొత్తం ఓటర్లు: ~${u.total_voters} మంది` : 'స్థానిక ఎన్నికల విభాగం';
                  })()}
                </p>
              </div>

              {/* Incharge / Volunteer Mobile Badge */}
              <div className="p-2.5 rounded-xl bg-slate-950/80 border border-slate-800 text-xs flex items-center justify-between">
                <span className="text-slate-400 text-[11px] font-bold">నమోదిత మొబైల్:</span>
                <span className="font-mono font-bold text-amber-400">
                  {session?.phone ? `+91 ${session.phone}` : 'లాగిన్ కాలేదు'}
                </span>
              </div>

              {/* If Expired, show alert; if Admin, show timer; for volunteer, keep silent */}
              {remainingTime.hasTimer && remainingTime.isExpired ? (
                <div className="p-3 rounded-2xl border text-xs text-left bg-red-950/70 border-red-500/60 text-red-200 space-y-1">
                  <div className="flex items-center gap-1.5 font-bold text-red-300">
                    <AlertTriangle className="w-4 h-4 text-red-400" />
                    <span>{lang === 'te' ? 'జాబితా అందుబాటులో లేదు (Access Expired)' : 'List Access Expired'}</span>
                  </div>
                  <p className="text-[11px] text-red-300 pt-0.5 leading-snug">
                    {lang === 'te'
                      ? 'ఈ ఓటర్ల జాబితాకు కేటాయించిన సమయం ముగిసింది. దయచేసి అడ్మిన్‌ను సంప్రదించండి.'
                      : 'Access to this voter list has expired. Please contact Admin.'}
                  </p>
                </div>
              ) : session?.role === 'admin' && remainingTime.hasTimer ? (
                <div className="p-2.5 rounded-2xl border text-xs text-left bg-amber-950/30 border-amber-500/40 text-amber-200 flex items-center justify-between">
                  <span className="text-[10px] font-bold text-amber-400 flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    <span>[Admin Only] మిగిలిన సమయం:</span>
                  </span>
                  <span className="font-mono font-bold text-xs">{remainingTime.formatted}</span>
                </div>
              ) : null}

              {/* Big Load List Button (Requirement 3) */}
              <div className="pt-2">
                <button
                  type="button"
                  onClick={handleLoadList}
                  disabled={remainingTime.hasTimer && remainingTime.isExpired}
                  className={`w-full py-3.5 px-4 font-black rounded-2xl text-xs sm:text-sm flex items-center justify-center gap-2.5 shadow-xl transition-all active:scale-98 cursor-pointer ${
                    remainingTime.hasTimer && remainingTime.isExpired
                      ? 'bg-slate-800 text-slate-500 border border-slate-700 cursor-not-allowed opacity-60'
                      : 'bg-gradient-to-r from-amber-500 via-amber-400 to-amber-500 hover:from-amber-400 hover:to-amber-300 text-slate-950 border border-amber-300 shadow-amber-950/50 group'
                  }`}
                >
                  <DownloadCloud className="w-4 h-4 group-hover:translate-y-0.5 transition-transform" />
                  <span>
                    {remainingTime.hasTimer && remainingTime.isExpired
                      ? (lang === 'te' ? '🔒 జాబితా అందుబాటులో లేదు (Access Expired)' : '🔒 Access Expired')
                      : (lang === 'te' ? '📥 ఓటర్ల జాబితా లోడ్ చేయండి (Click to Load)' : '📥 Click to Load Voter List')}
                  </span>
                </button>
                <p className="text-[10px] text-slate-400 mt-2 text-center">
                  {lang === 'te' ? 'క్లిక్ చేసినప్పుడు మాత్రమే ఓటర్ల వివరాలు లోడ్ అవుతాయి.' : 'Voter data strictly loads only when you click load.'}
                </p>
              </div>
            </div>
          </div>
        )}

        {boothData && (
          <>
            {/* Top Winning Score Banner (Shown only when opened via [🏆 విక్టరీ] button) */}
            {activeTab === 'voters' && votersViewMode !== 'excel' && winningScore && showVictoryPredictor && (
              <WinningScoreBanner
                calc={winningScore}
                language={lang}
                onOpenWarRoom={() => setActiveTab('warroom')}
                onToggleMode={handleToggleVictoryMode}
                onHide={() => handleToggleVictoryPredictor(false)}
              />
            )}

            {/* Admin Ward Banner: 1-click switch to full GP if Admin is currently viewing a single ward */}
            {session?.role === 'admin' && typeof currentPartNo === 'string' && currentPartNo.includes('_w') && (
              <div className="bg-gradient-to-r from-slate-900 via-emerald-950/60 to-slate-900 border border-emerald-500/40 rounded-2xl p-3 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs shadow-lg mb-3">
                <div className="flex items-center gap-2.5 min-w-0">
                  <span className="text-xl shrink-0 p-1.5 bg-emerald-500/20 rounded-xl border border-emerald-500/30">🏛️</span>
                  <div className="min-w-0">
                    <span className="font-extrabold text-white block text-xs sm:text-sm">
                      {lang === 'te' 
                        ? `మీరు ప్రస్తుతం వార్డు #${boothData.booth_info.ward_no || ''} చూస్తున్నారు (${boothData.voters.length} ఓటర్లు)` 
                        : `Viewing Ward #${boothData.booth_info.ward_no || ''} (${boothData.voters.length} voters)`}
                    </span>
                    <p className="text-[11px] text-emerald-300">
                      {lang === 'te' 
                        ? 'అడ్మిన్‌గా మీరు మొత్తం గ్రామ పంచాయతీ ఓటర్ల జాబితాను (సమగ్ర గ్రామం) ఒకే క్లిక్‌తో చూడవచ్చు.' 
                        : 'As Admin, you can switch to the complete Gram Panchayat with 1 click.'}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleSwitchToFullVillage}
                  className="px-3.5 py-2 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-black rounded-xl text-xs whitespace-nowrap shadow-md active:scale-95 transition-all flex items-center gap-1.5 cursor-pointer shrink-0"
                >
                  <span>🏡</span>
                  <span>
                    {lang === 'te' 
                      ? `${String(currentPartNo).includes('tatiparthy') ? 'తాటిపర్తి' : 'దుర్గడ'} సమగ్ర గ్రామం చూడండి` 
                      : `View Complete GP`}
                  </span>
                </button>
              </div>
            )}

            {/* TAB 1: Voters Tab */}
            {activeTab === 'voters' && (
              <VotersTabMobile
                key={String(boothData.booth_info.part_no)}
                voters={boothData.voters}
                boothInfo={boothData.booth_info}
                profiles={profiles}
                language={lang}
                layoutMode={layoutMode}
                onToggleVictoryPredictor={() => handleToggleVictoryPredictor(!showVictoryPredictor)}
                showVictoryPredictor={showVictoryPredictor}
                onOpenPhoneEditor={v => setSelectedVoterForPhone(v)}
                onOpenSupportPicker={(title, currentPct, currentNotes, voterSno) => {
                  setSupportPickerState({
                    open: true,
                    title,
                    currentPct,
                    currentNotes,
                    voterSno
                  });
                }}
                onOpenLogVisit={v => setSelectedVoterForVisit(v)}
                onOpenInfluencerAssign={(targetName, currentInfId, voterSno) => {
                  setInfluencerAssignState({
                    open: true,
                    targetName,
                    currentInfId,
                    voterSno
                  });
                }}
                onUpdateSurveyMark={handleUpdateSurveyMark}
                onQuickToggleOurs={handleQuickToggleOurs}
                onQuickToggleVoted={handleQuickToggleVoted}
                onOpenSlip={v => setSelectedVoterForSlip(v)}
                onOpenGroupPrint={handleOpenGroupPrint}
                onOpenSurnameLeaning={clanId => setSurnameLeaningState({ open: true, initialClanId: clanId })}
                onOpenBulkAssign={snos => setBulkAssignState({ open: true, initialSelectedSnos: snos })}
                onUpdateCustomAlias={handleUpdateCustomAlias}
                onUpdateCustomPhone={handleUpdateCustomPhone}
                onUpdateSupportPct={handleUpdateSupportPct}
                controlledViewMode={votersViewMode}
                onViewModeChange={handleVotersViewModeChange}
              />
            )}

            {/* TAB 2: Families Tab */}
            {activeTab === 'families' && (
              <FamiliesTabMobile
                key={String(boothData.booth_info.part_no)}
                families={families}
                voters={boothData.voters}
                influencers={influencers}
                profiles={profiles}
                boothInfo={boothData.booth_info}
                language={lang}
                onCreateFamily={() => setCreateFamilyState({ open: true, initialFamily: null })}
                onEditFamily={fam => setCreateFamilyState({ open: true, initialFamily: fam })}
                onOpenPhoneEditor={v => setSelectedVoterForPhone(v)}
                onOpenSupportPicker={(title, currentPct, currentNotes, familyId) => {
                  setSupportPickerState({
                    open: true,
                    title,
                    currentPct,
                    currentNotes,
                    familyId,
                    hasFamily: true
                  });
                }}
                onOpenInfluencerAssign={(targetName, currentInfId, familyId) => {
                  setInfluencerAssignState({
                    open: true,
                    targetName,
                    currentInfId,
                    familyId
                  });
                }}
                onOpenSlip={v => setSelectedVoterForSlip(v)}
                onOpenGroupPrint={handleOpenGroupPrint}
              />
            )}

            {/* TAB 3: Influencers Command Tab */}
            {activeTab === 'influencers' && (
              <InfluencersTabMobile
                key={String(boothData.booth_info.part_no)}
                influencers={influencers}
                voters={boothData.voters}
                families={families}
                profiles={profiles}
                boothInfo={boothData.booth_info}
                onAddNewInfluencer={() => {
                  setInfluencerAssignState({
                    open: true,
                    targetName: 'New Influencer'
                  });
                }}
                onOpenInfluencerAssign={(targetName, currentInfId) => {
                  setInfluencerAssignState({
                    open: true,
                    targetName,
                    currentInfId
                  });
                }}
                onOpenBulkAssign={infId => setBulkAssignState({ open: true, initialInfluencerId: infId })}
                onOpenGroupPrint={handleOpenGroupPrint}
                onOpenSyncModal={() => setIsSyncModalOpen(true)}
              />
            )}

            {/* TAB 4: Candidate War Room (Winning Weapon) */}
            {activeTab === 'warroom' && (
              <WarRoomTabMobile
                key={String(boothData.booth_info.part_no)}
                boothData={boothData}
                profiles={profiles}
                influencers={influencers}
                families={families}
                language={lang}
                onOpenPhoneEditor={v => setSelectedVoterForPhone(v)}
                onOpenSupportPicker={(title, currentPct, currentNotes, voterSno) => {
                  setSupportPickerState({
                    open: true,
                    title,
                    currentPct,
                    currentNotes,
                    voterSno
                  });
                }}
                onOpenLogVisit={v => setSelectedVoterForVisit(v)}
                onOpenInfluencerAssign={(targetName, currentInfId, voterSno) => {
                  setInfluencerAssignState({
                    open: true,
                    targetName,
                    currentInfId,
                    voterSno
                  });
                }}
                onOpenSlip={v => setSelectedVoterForSlip(v)}
                onOpenGroupPrint={handleOpenGroupPrint}
              />
            )}

            {/* TAB 5: Offline & Tools Tab */}
            {activeTab === 'offline' && (
              <OfflineTabMobile
                boothData={boothData}
                isCached={isCached}
                isLocked={isLocked}
                language={lang}
                theme={theme}
                onSelectTheme={handleSelectTheme}
                onRefreshCache={() => setIsCached(isBoothCached(currentPartNo))}
                onOpenBoothSelector={() => setIsBoothSelectorOpen(true)}
                onImportCustomJson={handleImportCustomJson}
                onClearAndRefresh={handleClearCacheAndReload}
                onOpenSyncModal={() => setIsSyncModalOpen(true)}
              />
            )}
          </>
        )}
      </main>

      {/* Fixed Bottom Navigation with Bilingual labels (Hidden on Desktop when in Desktop Mode) */}
      <BottomNavMobile
        activeTab={activeTab}
        onTabChange={setActiveTab}
        votersCount={boothData?.voters.length || 0}
        kriyaCount={boothData?.booth_info.total_kriya_count || 0}
        language={lang}
        layoutMode={layoutMode}
      />

      {/* Booth Assignment Modal */}
      {isBoothSelectorOpen && (
        <BoothAssignmentModal
          boothsIndex={boothsIndex}
          localUnits={localUnits}
          currentPartNo={currentPartNo}
          isLocked={isLocked}
          onSelectBooth={handleSelectBooth}
          onClose={() => setIsBoothSelectorOpen(false)}
          language={lang}
          userRole={session?.role || 'volunteer'}
          assignedAssemblyBooths={assignedAssemblyBooths}
          assignedMunicipalWards={assignedMunicipalWards}
          onOpenAdminHub={() => setIsAdminModalOpen(true)}
        />
      )}

      {/* Admin Assignment & WhatsApp Dispatch Hub Modal */}
      {isAdminModalOpen && session?.role === 'admin' && (
        <AdminAssignmentModal
          isOpen={isAdminModalOpen}
          onClose={() => setIsAdminModalOpen(false)}
          boothsIndex={boothsIndex}
          localUnits={localUnits}
          language={lang}
        />
      )}

      {/* Volunteer & Admin Login Modal */}
      {(!session || isLoginModalOpen) && (
        <LoginModal
          isOpen={!session || isLoginModalOpen}
          language={lang}
          onLoginSuccess={(newSession) => {
            setSession(newSession);
            setIsLoginModalOpen(false);
            setBoothData(null);
            setIsListLoaded(false);

            if (newSession.role === 'admin') {
              const curr = String(currentPartNo || '');
              if (curr.includes('_w')) {
                const target = curr.startsWith('gp_tatiparthy') ? 'gp_tatiparthy' : 'gp_durgada';
                setErrorMsg(null);
                setCurrentPartNo(target);
                setAssignedBooth(target, false);
                setIsLocked(false);
                setIsListLoaded(true);
                loadBooth(target);
              }
            } else if (newSession.role === 'volunteer') {
              // Immediately look up volunteer assignment and auto-switch to their assigned unit
              const assignment = getVolunteerAssignment(newSession.phone);
              let target: string | number | null = null;
              if (assignment?.municipalWards && assignment.municipalWards.length > 0) {
                target = assignment.municipalWards.find(w => !w.startsWith('ward_') && w !== 'gollaprolu_ward_11') || assignment.municipalWards[0];
              } else if (assignment?.assemblyBooths && assignment.assemblyBooths.length > 0) {
                target = assignment.assemblyBooths[0];
              }
              if (target) {
                setErrorMsg(null);
                setCurrentPartNo(target);
                setAssignedBooth(target, true);
                setIsLocked(true);
                setIsListLoaded(true);
                loadBooth(target);
              }
            }
          }}
          onClose={session ? () => setIsLoginModalOpen(false) : undefined}
        />
      )}

      {/* Voter Slip Preview & WhatsApp Share Modal */}
      {selectedVoterForSlip && boothData && (
        <VoterSlipModal
          voter={selectedVoterForSlip}
          boothInfo={boothData.booth_info}
          onClose={() => setSelectedVoterForSlip(null)}
        />
      )}

      {/* Phone Number Add/Edit Modal */}
      {selectedVoterForPhone && (
        <PhoneEditorModal
          voter={selectedVoterForPhone}
          profile={profiles[selectedVoterForPhone.s]}
          onSavePhone={(phone, altPhone) => handleSavePhone(selectedVoterForPhone, phone, altPhone)}
          onClose={() => setSelectedVoterForPhone(null)}
        />
      )}

      {/* Political Support Leaning & Percentage Selector Modal */}
      {supportPickerState.open && (
        <SupportLeaningPicker
          title={supportPickerState.title}
          subtitle={supportPickerState.subtitle}
          currentPct={supportPickerState.currentPct}
          currentNotes={supportPickerState.currentNotes}
          currentMoneyStatus={supportPickerState.voterSno ? profiles[supportPickerState.voterSno]?.moneyStatus : undefined}
          hasFamily={supportPickerState.hasFamily}
          language={lang}
          onSave={handleSaveSupport}
          onClose={() => setSupportPickerState(prev => ({ ...prev, open: false }))}
        />
      )}

      {/* Key Influencer Assign & Management Modal */}
      {influencerAssignState.open && (
        <InfluencerAssignModal
          targetName={influencerAssignState.targetName}
          currentInfluencerId={influencerAssignState.currentInfId}
          influencers={influencers}
          onAssignInfluencer={handleAssignInfluencer}
          onAddNewInfluencer={handleAddNewInfluencer}
          onClose={() => setInfluencerAssignState(prev => ({ ...prev, open: false }))}
        />
      )}

      {/* Create / Edit Custom Family Group Modal */}
      {createFamilyState.open && boothData && (
        <CreateFamilyModal
          initialFamily={createFamilyState.initialFamily}
          voters={boothData.voters}
          influencers={influencers}
          onSaveFamily={handleSaveFamily}
          onDeleteFamily={handleDeleteFamily}
          onClose={() => setCreateFamilyState({ open: false, initialFamily: null })}
        />
      )}

      {/* Field Visit & Touchpoint Logger Modal */}
      {selectedVoterForVisit && (
        <LogVisitModal
          voter={selectedVoterForVisit}
          profile={profiles[selectedVoterForVisit.s]}
          language={lang}
          onSaveVisit={visit => handleSaveVisit(selectedVoterForVisit, visit)}
          onClose={() => setSelectedVoterForVisit(null)}
        />
      )}

      {/* Theme Selector Modal */}
      {isThemeModalOpen && (
        <ThemeSelectorModal
          currentTheme={theme}
          language={lang}
          onSelectTheme={handleSelectTheme}
          onClose={() => setIsThemeModalOpen(false)}
        />
      )}

      {/* Group & Surname Clan A4 Print Modal */}
      {groupPrintState.open && boothData && (
        <GroupPrintModal
          isOpen={groupPrintState.open}
          title={groupPrintState.title}
          subtitle={groupPrintState.subtitle}
          boothInfo={boothData.booth_info}
          voters={groupPrintState.voters}
          profiles={profiles}
          initialLayout={groupPrintState.initialLayout}
          language={lang}
          onClose={() => setGroupPrintState(prev => ({ ...prev, open: false }))}
        />
      )}

      {/* Bulk Surname Leaning Assigner Modal */}
      {surnameLeaningState.open && boothData && (
        <SurnameLeaningModal
          isOpen={surnameLeaningState.open}
          surnames={classifyBoothSurnames(boothData.voters, profiles)}
          initialSurnameId={surnameLeaningState.initialClanId}
          language={lang}
          onApply={handleApplySurnameLeaning}
          onClose={() => setSurnameLeaningState({ open: false })}
        />
      )}

      {/* Electors Bulk Assign Modal */}
      {bulkAssignState.open && boothData && (
        <BulkAssignModal
          isOpen={bulkAssignState.open}
          onClose={() => setBulkAssignState({ open: false })}
          voters={boothData.voters}
          profiles={profiles}
          influencers={influencers}
          initialSelectedSnos={bulkAssignState.initialSelectedSnos}
          initialInfluencerId={bulkAssignState.initialInfluencerId}
          boothInfo={boothData.booth_info}
          onBulkAssignInfluencer={handleBulkAssignInfluencer}
          onAddNewInfluencer={handleAddNewInfluencerFromBulk}
          language={lang}
        />
      )}

      {/* Cloud & Bolt Campaign Data Sync & Backup Modal */}
      {isSyncModalOpen && (
        <SyncBackupModal
          isOpen={isSyncModalOpen}
          partNo={currentPartNo}
          profiles={profiles}
          language={lang}
          onClose={() => setIsSyncModalOpen(false)}
          onSyncApplied={handleSyncApplied}
        />
      )}
    </div>
  );
}
export { App as MobileBoothApp };
export default App;
