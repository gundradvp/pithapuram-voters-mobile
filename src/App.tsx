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
  WinningScoreCalculation
} from './types';
import {
  getAssignedBooth,
  setAssignedBooth,
  isBoothLocked,
  getCachedBoothData,
  saveCachedBoothData,
  isBoothCached,
  getVoterProfiles,
  saveVoterProfile,
  addVoterVisit,
  getFamilyGroups,
  saveFamilyGroup,
  deleteFamilyGroup,
  getInfluencers,
  saveInfluencer,
  calculateWinningScore
} from './utils/storage';
import {
  UserSession,
  getUserSession,
  logoutUser,
  getVolunteerAssignment,
  getWhatsAppShareUrl
} from './utils/auth';
import { useI18n } from './utils/i18n';
import { ThemeId, getSavedTheme, setSavedTheme, applyThemeToDom } from './utils/theme';
import { Loader2, AlertCircle, Sparkles, Trophy, MessageSquare } from 'lucide-react';

export function App() {
  const { lang, toggleLanguage, t } = useI18n();

  // App Theme State
  const [theme, setTheme] = useState<ThemeId>(() => getSavedTheme());
  const [isThemeModalOpen, setIsThemeModalOpen] = useState<boolean>(false);

  // User Auth & Role Session State
  const [session, setSession] = useState<UserSession | null>(() => getUserSession());
  const [isLoginModalOpen, setIsLoginModalOpen] = useState<boolean>(() => !getUserSession());
  const [isAdminModalOpen, setIsAdminModalOpen] = useState<boolean>(false);

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
  }, [session]);

  const assignedAssemblyBooths = useMemo(() => {
    if (session?.role === 'admin') return boothsIndex.map(b => Number(b.part_no));
    return currentAssignment?.assemblyBooths || [];
  }, [session, currentAssignment, boothsIndex]);

  const assignedMunicipalWards = useMemo(() => {
    if (session?.role === 'admin') return localUnits.map(u => u.id);
    return currentAssignment?.municipalWards || [];
  }, [session, currentAssignment, localUnits]);

  const [currentPartNo, setCurrentPartNo] = useState<number | string>(() => {
    return getAssignedBooth() || 'ward_14';
  });

  // Auto-switch to assigned unit on volunteer login if currentPartNo is not in their assigned list
  useEffect(() => {
    if (!session || session.role === 'admin') return;
    if (!currentAssignment) return;

    const isCurrentValid =
      (typeof currentPartNo === 'number' && assignedAssemblyBooths.includes(currentPartNo)) ||
      (typeof currentPartNo === 'string' && assignedMunicipalWards.includes(currentPartNo));

    if (!isCurrentValid) {
      if (assignedMunicipalWards.length > 0) {
        setCurrentPartNo(assignedMunicipalWards[0]);
      } else if (assignedAssemblyBooths.length > 0) {
        setCurrentPartNo(assignedAssemblyBooths[0]);
      }
    }
  }, [session, currentAssignment, assignedAssemblyBooths, assignedMunicipalWards, currentPartNo]);
  const [boothData, setBoothData] = useState<BoothData | null>(null);
  const [activeTab, setActiveTab] = useState<TabType>('voters');
  const [isLocked, setIsLocked] = useState<boolean>(() => isBoothLocked());
  const [isCached, setIsCached] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Campaign State
  const [profiles, setProfiles] = useState<Record<number, VoterCampaignProfile>>({});
  const [families, setFamilies] = useState<Record<string, FamilyGroup>>({});
  const [influencers, setInfluencers] = useState<Record<string, Influencer>>({});
  const [scoreNotification, setScoreNotification] = useState<string | null>(null);

  // Modals State
  const [isBoothSelectorOpen, setIsBoothSelectorOpen] = useState<boolean>(false);
  const [selectedVoterForSlip, setSelectedVoterForSlip] = useState<MobileVoter | null>(null);
  const [selectedVoterForPhone, setSelectedVoterForPhone] = useState<MobileVoter | null>(null);
  const [selectedVoterForVisit, setSelectedVoterForVisit] = useState<MobileVoter | null>(null);

  const [supportPickerState, setSupportPickerState] = useState<{
    open: boolean;
    title: string;
    subtitle?: string;
    currentPct: number;
    currentNotes?: string;
    voterSno?: number;
    familyId?: string;
    hasFamily?: boolean;
  }>({
    open: false,
    title: '',
    currentPct: 50
  });

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

  // 1. Load Booths Index and Local Elections Index
  useEffect(() => {
    fetch('/booths_index.json')
      .then(res => res.json())
      .then(data => {
        setBoothsIndex(data);
      })
      .catch(err => {
        console.warn('Could not load booths index online:', err);
      });

    fetch('/local_elections_index.json')
      .then(res => res.json())
      .then(data => {
        setLocalUnits(data);
      })
      .catch(err => {
        console.warn('Could not load local elections index online:', err);
      });
  }, []);

  // 2. Load Selected Unit Data (Offline First Pattern)
  const loadBooth = useCallback(async (partNo: number | string) => {
    setIsLoading(true);
    setErrorMsg(null);

    // Step A: Load profiles, families, influencers immediately from localStorage
    const localProfiles = getVoterProfiles(partNo);
    setProfiles(localProfiles);
    setInfluencers(getInfluencers(partNo));

    // Step B: Check local cache first (Instant load)
    const cached = getCachedBoothData(partNo);
    if (cached) {
      setBoothData(cached);
      setFamilies(getFamilyGroups(partNo, cached.voters));
      setIsCached(true);
      setIsLoading(false);
    }

    // Step C: Fetch latest over network
    try {
      let res = await fetch(`/booths/booth_${partNo}.json?v=${Date.now()}`);
      if (!res.ok) {
        res = await fetch(`/booths/${partNo}.json?v=${Date.now()}`);
      }
      if (!res.ok) throw new Error(`HTTP error ${res.status}`);
      const onlineData: BoothData = await res.json();
      setBoothData(onlineData);
      saveCachedBoothData(partNo, onlineData);
      setFamilies(getFamilyGroups(partNo, onlineData.voters));
      setIsCached(true);
      setIsLoading(false);
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
    }
  }, []);

  useEffect(() => {
    loadBooth(currentPartNo);
    setIsLocked(isBoothLocked());
    setIsCached(isBoothCached(currentPartNo));
  }, [currentPartNo, loadBooth]);

  // Compute Winning Score dynamically
  const winningScore: WinningScoreCalculation | null = useMemo(() => {
    if (!boothData) return null;
    return calculateWinningScore(boothData, profiles);
  }, [boothData, profiles]);

  // Show score bump toast notification
  const triggerScoreNotice = (msg: string) => {
    setScoreNotification(msg);
    setTimeout(() => {
      setScoreNotification(null);
    }, 3500);
  };

  // Handle Booth / Ward Assignment
  const handleSelectBooth = (partNo: number | string, lock: boolean) => {
    setCurrentPartNo(partNo);
    setAssignedBooth(partNo, lock);
    setIsLocked(lock);
    loadBooth(partNo);
  };

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
  const handleSaveSupport = (pct: number, notes?: string, applyToFamily?: boolean) => {
    const { voterSno, familyId } = supportPickerState;

    if (voterSno) {
      const voter = boothData?.voters.find(v => v.s === voterSno);
      saveVoterProfile(currentPartNo, voterSno, { supportPct: pct, notes });

      // Apply to all family members if requested
      if (applyToFamily && voter) {
        const famKey = Object.values(families).find(f => f.memberSnos.includes(voterSno));
        if (famKey) {
          famKey.supportPct = pct;
          famKey.supportCategory = pct === 100 ? 'full_support' : pct >= 75 ? 'strong_lean' : pct === 0 ? 'opponent' : 'neutral_swing';
          saveFamilyGroup(currentPartNo, famKey);

          famKey.memberSnos.forEach(sno => {
            saveVoterProfile(currentPartNo, sno, { supportPct: pct });
          });
          setFamilies(getFamilyGroups(currentPartNo));
        }
      }

      setProfiles(getVoterProfiles(currentPartNo));

      // Notification based on support category
      if (pct === 100) {
        triggerScoreNotice(lang === 'te' ? `🚩 100% మనవాళ్లే చేరారు! +1 మన ఓటు పెరిగింది` : `🚩 100% Supporter Added! +1 Projected JSP Vote`);
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
          saveVoterProfile(currentPartNo, sno, { supportPct: pct });
        });
        setFamilies(getFamilyGroups(currentPartNo));
        setProfiles(getVoterProfiles(currentPartNo));

        triggerScoreNotice(lang === 'te' ? `🏠 కుటుంబ సభ్యులందరి మద్దతు ${pct}% గా మారింది` : `🏠 Family sentiment updated to ${pct}%`);
      }
    }
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
    else if (status === 'supporter') triggerScoreNotice(lang === 'te' ? `🚩 మన మద్దతుదారుడిగా మార్క్ చేశారు` : `🚩 Marked Supporter for S.No #${serialNo}`);
    else if (status === 'opponent') triggerScoreNotice(lang === 'te' ? `🔴 ప్రత్యర్థిగా మార్క్ చేశారు` : `🔴 Marked Opponent for S.No #${serialNo}`);
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

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans select-none antialiased">
      {/* Sticky Mobile Header with Language & Theme Toggle */}
      <HeaderMobile
        boothInfo={boothData?.booth_info || null}
        isLocked={isLocked}
        isCached={isCached}
        language={lang}
        theme={theme}
        session={session}
        onToggleLanguage={toggleLanguage}
        onOpenThemeSelector={() => setIsThemeModalOpen(true)}
        onOpenBoothSelector={() => setIsBoothSelectorOpen(true)}
        onOpenAdminHub={() => setIsAdminModalOpen(true)}
        onLogout={() => {
          logoutUser();
          setSession(null);
          setIsLoginModalOpen(true);
        }}
      />

      {/* Floating Dynamic Score Notification Toast */}
      {scoreNotification && (
        <div className="fixed top-14 left-1/2 transform -translate-x-1/2 z-50 bg-amber-500 text-slate-950 px-4 py-2 rounded-2xl shadow-2xl font-black text-xs flex items-center gap-2 border border-amber-300 animate-in fade-in slide-in-from-top-2 duration-200">
          <Sparkles className="w-4 h-4 text-slate-950 flex-shrink-0" />
          <span>{scoreNotification}</span>
        </div>
      )}

      {/* Main Content Area */}
      <main className="flex-1 max-w-lg w-full mx-auto p-3">
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
          <div className="py-24 flex flex-col items-center justify-center space-y-3">
            <Loader2 className="w-8 h-8 text-amber-400 animate-spin" />
            <p className="text-xs text-slate-400 font-bold">{lang === 'te' ? `బూత్ #${currentPartNo} ఓటర్ల డేటా లోడ్ అవుతోంది...` : `Loading Booth #${currentPartNo} Electors...`}</p>
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

        {boothData && (
          <>
            {/* Top Winning Score Banner (Shown on Voters tab) */}
            {activeTab === 'voters' && winningScore && (
              <WinningScoreBanner
                calc={winningScore}
                language={lang}
                onOpenWarRoom={() => setActiveTab('warroom')}
              />
            )}

            {/* TAB 1: Voters Tab */}
            {activeTab === 'voters' && (
              <VotersTabMobile
                voters={boothData.voters}
                boothInfo={boothData.booth_info}
                profiles={profiles}
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
                onUpdateSurveyMark={handleUpdateSurveyMark}
                onOpenSlip={v => setSelectedVoterForSlip(v)}
              />
            )}

            {/* TAB 2: Families Tab */}
            {activeTab === 'families' && (
              <FamiliesTabMobile
                families={families}
                voters={boothData.voters}
                influencers={influencers}
                profiles={profiles}
                boothInfo={boothData.booth_info}
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
              />
            )}

            {/* TAB 3: Influencers Command Tab */}
            {activeTab === 'influencers' && (
              <InfluencersTabMobile
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
              />
            )}

            {/* TAB 4: Candidate War Room (Winning Weapon) */}
            {activeTab === 'warroom' && (
              <WarRoomTabMobile
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
              />
            )}
          </>
        )}
      </main>

      {/* Fixed Bottom Navigation with Bilingual labels */}
      <BottomNavMobile
        activeTab={activeTab}
        onTabChange={setActiveTab}
        votersCount={boothData?.voters.length || 0}
        kriyaCount={boothData?.booth_info.total_kriya_count || 0}
        language={lang}
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
    </div>
  );
}
export { App as MobileBoothApp };
export default App;
