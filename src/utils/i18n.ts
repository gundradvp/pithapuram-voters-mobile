import { useState, useEffect } from 'react';

export type Language = 'te' | 'en';

const LANG_STORAGE_KEY = 'jsp_app_language_pref';

export function getSavedLanguage(): Language {
  const saved = localStorage.getItem(LANG_STORAGE_KEY);
  if (saved === 'en' || saved === 'te') return saved;
  return 'te'; // Default to Telugu as requested
}

export function setSavedLanguage(lang: Language): void {
  localStorage.setItem(LANG_STORAGE_KEY, lang);
}

export const translations = {
  te: {
    // Header & Global
    partyTitle: 'జనసేన పార్టీ పిఠాపురం',
    constituencyBadge: 'నియోజకవర్గం #37',
    selectBooth: 'పోలింగ్ బూత్ ఎంచుకోండి',
    booth: 'బూత్',
    offlineReady: 'ఆఫ్‌లైన్ సిద్ధం',
    online: 'ఆన్‌లైన్',
    changeBooth: 'బూత్ మార్చండి',
    locked: 'లాక్ చేయబడింది',

    // Bottom Navigation
    navVoters: 'ఓటర్లు',
    navFamilies: 'కుటుంబాలు',
    navInfluencers: 'నాయకులు',
    navWarRoom: 'వార్ రూమ్',
    navOffline: 'ఆఫ్‌లైన్ & టూల్స్',

    // Winning Score & Victory Predictor
    victoryPredictor: 'గెలుపు లెక్క (విన్నింగ్ స్కోర్)',
    targetToWin: 'గెలవడానికి కావాల్సిన ఓట్లు',
    atTurnout: 'అంచనా పోలింగ్ శాతంలో',
    projectedJsp: 'మన పార్టీ ఓట్లు',
    projectedOpp: 'ప్రత్యర్థి ఓట్లు',
    swingPot: 'నిర్ణయించుకోని ఓట్లు (స్వింగ్)',
    lead: 'ఓట్ల ఆధిక్యం (లీడ్)',
    deficit: 'ఓట్ల లోటు (లోటు)',
    safeWinZone: '🎉 సురక్షిత గెలుపు (Safe Win)',
    likelyWin: '🟢 గెలిచే అవకాశం ఎక్కువ',
    battleground: '🟡 హోరాహోరీ పోరు (Tight Fight)',
    deficitAlert: '🚨 వెనుకబడి ఉన్నాము (హెచ్చరిక)',
    victoryGoal: 'గెలుపు టార్గెట్‌లో',
    actionNeeded: 'చేయవలసిన ముఖ్యమైన పని',
    hideDetails: 'వివరాలు దాచు',
    viewBreakdown: 'గెలుపు లెక్కల వివరాలు చూడండి',
    needMoreVotes: 'గెలుపు ఖాయం కావడానికి ఇంకా {count} మంది స్వింగ్ ఓటర్లను (40% లేదా 50%) మన వైపు తిప్పుకోవాలి.',
    thresholdReached: '🎉 గెలుపు టార్గెట్ దాటింది! పోలింగ్ రోజు ఉదయం 12 లోపే మన మద్దతుదారులందరితో 100% ఓట్లు వేయించండి.',

    // Leaning Categories (Easy & Natural Telugu)
    fullSupport: '100% మనవాళ్లే (పక్కా మద్దతు)',
    strongLean: '75% మనకే అనుకూలం',
    positiveToUs: '40% సానుకూలం (ప్రయత్నిస్తే పడతారు)',
    neutralSwing: '50% ఎటూ తేల్చుకోలేదు (స్వింగ్)',
    doubtful: '25% అనుమానం (వ్యతిరేకత ఉండొచ్చు)',
    opponent: '0% ప్రత్యర్థులు (మారరు)',

    // Voter List & Card
    searchPlaceholder: 'పేరు, ఫోన్, ఇంటి నెం, ఓటర్ ID, బంధువు, నాయకుడు...',
    filterAll: 'మొత్తం',
    filterFull: '🚩 100% మనవాళ్లే',
    filterSoft: '🟡 40% సానుకూలం',
    filterStrong: '🟢 75% అనుకూలం',
    filterPhone: '📱 ఫోన్ ఉన్నవారు',
    filterKriya: '⭐ క్రియా సభ్యులు',
    filterVoted: '✅ ఓటు వేసినవారు',
    filterOpponent: '🔴 ప్రత్యర్థులు',
    showingElectors: '{shown} మంది ఓటర్లు కనిపిస్తున్నారు (మొత్తం: {total})',
    clearSearch: 'సెర్చ్ క్లియర్ చేయండి',
    noVotersMatch: 'ఈ ఫిల్టర్‌లో ఎవరూ లేరు',
    tryAnotherSearch: 'మరొక పేరు లేదా ఇంటి నంబర్ వెతకండి.',
    loadMore: 'ఇంకా ఓటర్లను చూడండి ({remaining} మిగిలి ఉన్నారు) ↓',
    relation: 'సంబంధం',
    age: 'వయస్సు',
    houseNo: 'ఇంటి నెం',
    noPhoneAdded: 'ఫోన్ నంబర్ లేదు',
    addPhone: '+ ఫోన్ నంబర్ ఇవ్వండి',
    editPhone: 'ఫోన్ మార్చండి',
    influencer: 'నాయకుడు',
    noneAssigned: 'ఎవరూ లేరు',
    assignLead: '+ కేటాయించండి',
    changeLead: 'మార్చండి',
    visitsLogged: 'సార్లు కలిశారు',
    logVisit: '+ విజిట్ నమోదు',
    addVisit: '+ మరొకసారి కలవండి',
    call: 'కాల్',
    whatsapp: 'వాట్సాప్',
    sms: 'మెసేజ్',
    slip: 'స్లిప్',
    pollStatus: '+ పోల్ స్టేటస్',
    markVoted: 'ఓటు వేశారు',
    markSupporter: 'మన మద్దతుదారుడు',
    doorVisited: 'ఇంటికి వెళ్లాము',
    markDoubtful: 'అనుమానం',
    markOpponent: 'ప్రత్యర్థి',
    clearStatus: 'స్టేటస్ తీసివేయండి',

    // Surname & Phonetic Search & Winning Formula
    groupBySurname: '🏛️ ఇంటిపేర్ల వర్గీకరణ',
    listView: '👥 ఓటర్ల జాబితా',
    phoneticSearch: 'ఫోనెటిక్ శోధన (ఉచ్ఛారణ ఆధారంగా)',
    phoneticActive: '🔊 ఫోనెటిక్ ఆన్',
    allSurnames: 'అన్ని ఇంటిపేర్లు',
    surnameClan: 'ఇంటిపేరు / వంశం',
    winningFormula: 'గెలుపు ఫార్ములా (50%+ ఓట్లు)',
    top10ClansPower: 'టాప్ 10 కులాలు / కుటుంబాల ఓటు బలం',
    clanStrength: 'ఓట్ల బలం',
    clanElders: 'కుటుంబ పెద్దలు (60+ సం)',
    clanYouth: 'యువత (18-25 సం)',
    whatsappClanMessage: 'కుటుంబ పెద్దకు వాట్సాప్ సందేశం',

    // Field Visit Modal
    visitModalTitle: 'ఓటరును కలిసిన వివరాలు (విజిట్ లాగ్)',
    directContact: 'నేరుగా సంప్రదించండి:',
    logNewVisitTab: '+ కొత్త విజిట్ రాయండి',
    historyTab: 'గతంలో కలిసిన వివరాలు',
    whoVisited: 'ఎవరు వెళ్లారు? (హోదా)',
    wardMember: 'వార్డ్ మెంబర్',
    volunteer: 'కార్యకర్త / వాలంటీర్',
    sarpanch: 'సర్పంచ్ / MPTC',
    boothConvenor: 'బూత్ కన్వీనర్',
    youthLeader: 'యూత్ నాయకుడు',
    candidateRep: 'అభ్యర్థి / ముఖ్య నాయకుడు',
    visitorNamePlaceholder: 'వెళ్లిన వారి పేరు (ఉదా: రాము / సురేష్)',
    voterConcern: 'ఓటరు చెప్పిన ప్రధాన సమస్య / డిమాండ్',
    supportAfterVisit: 'కలిసిన తర్వాత ఓటరు అభిప్రాయం',
    fieldNotes: 'మాట్లాడిన వివరాలు (గ్రౌండ్ నోట్స్)',
    fieldNotesPlaceholder: 'ఓటరు ఏమన్నారు? మన గుర్తుకు ఓటు వేస్తారా? పోలింగ్ లోపు ఏమైనా హామీ ఇచ్చారా?',
    saveVisitBtn: 'విజిట్ సేవ్ చేసి స్కోర్ అప్‌డేట్ చేయండి',
    noVisitsYet: 'ఈ ఓటరును ఇంకా ఎవరూ కలవలేదు',
    firstVisitHint: 'మొదటిసారి కలిసిన వివరాలు రాయడానికి "+ కొత్త విజిట్ రాయండి" క్లిక్ చేయండి.',

    // Common Issues
    issueGoodwill: 'సాధారణ ప్రచారం / మర్యాదపూర్వక భేటీ',
    issuePension: 'వృద్ధాప్య / వికలాంగ పింఛను సమస్య',
    issueWater: 'తాగునీటి సరఫరా సమస్య',
    issueRoad: 'రోడ్లు మరియు డ్రైనేజీ సమస్య',
    issueDwcra: 'డ్వాక్రా మహిళల రుణాలు / పథకాలు',
    issueJobs: 'యువతకు ఉద్యోగాలు / ఉపాధి',
    issueHealth: 'ఆరోగ్యశ్రీ / వైద్య సహాయం',
    issueRation: 'రేషన్ కార్డు / ఇళ్ల స్థలం',

    // War Room Tab
    warRoomTitle: 'అభ్యర్థి వార్ రూమ్ — విన్నింగ్ వెపన్',
    candidateVictoryRoom: 'అభ్యర్థి గెలుపు వ్యూహాల కేంద్రం',
    swingHitList: '🎯 స్వింగ్ ఓటర్లు (వీరితోనే గెలుపు)',
    unvisitedHitList: '🚪 ఇంకా వెళ్లని ఇళ్లు',
    doubtfulHitList: '⚠️ అనుమానం ఉన్నవారు',
    confirmedHitList: '🚩 పక్కా మనవాళ్లే',
    opponentsHitList: '🔴 ప్రత్యర్థులు',
    touchpointIntel: 'క్షేత్రస్థాయి పర్యటనల వివరాలు',
    totalVisitsCount: 'మొత్తం విజిట్స్ సంఖ్య',
    uniqueVotersMet: 'కలిసిన ఓటర్ల సంఖ్య',
    unvisitedElectors: 'ఇంకా కలవని ఓటర్లు',
    topGrievancesInBooth: 'ఈ బూత్‌లో ప్రజలు అడుగుతున్న ముఖ్య సమస్యలు:',
    exportCampaignCsv: 'ఎక్సెల్ రిపోర్ట్ డౌన్‌లోడ్ (CSV)',
    backupBoothJson: 'బూత్ సమాచారం బ్యాకప్ (JSON)',
    reportsAndExports: 'అభ్యర్థి నివేదికలు & డేటా డౌన్‌లోడ్',
    reportsDesc: 'ఓటర్ల ఫోన్ నంబర్లు, విజిట్ వివరాలు, నాయకుల కేటాయింపులతో పూర్తి రిపోర్ట్ డౌన్‌లోడ్ చేసుకోండి.',

    // Families Tab
    familiesTitle: 'కుటుంబాలు (ఇంటి సభ్యులు)',
    createFamily: '+ కొత్త కుటుంబాన్ని కలపండి',
    searchFamily: 'కుటుంబం పేరు, ఇంటి నెం, నాయకుడు...',
    familyHead: 'కుటుంబ పెద్ద',
    familyMembers: 'సభ్యులు',
    applyToAllMembers: 'కుటుంబ సభ్యులందరికీ వర్తింపజేయండి',

    // Influencers Tab
    influencersTitle: 'ముఖ్య నాయకులు / ఇన్ఫ్లుయెన్సర్లు',
    addNewInfluencer: '+ కొత్త నాయకుడిని చేర్చండి',
    assignedVotersCount: 'కేటాయించిన ఓటర్లు',
    dispatchWhatsAppList: 'వాట్సాప్‌లో ఓటర్ల లిస్ట్ పంపండి',
    callInfluencer: 'నాయకుడికి కాల్',
    influencerRole: 'బాధ్యత / హోదా',

    // Toast notices
    phoneSavedNotice: '📱 {name} గారి ఫోన్ నంబర్ సేవ్ అయ్యింది',
    supporterNotice: '🚩 మన మద్దతుదారుడు చేరారు! +ఓటు పెరిగింది',
    opponentNotice: '🔴 ప్రత్యర్థిగా మార్చారు! ఓట్ల లీడ్ తగ్గింది',
    visitLoggedNotice: '📋 విజిట్ సేవ్ అయ్యింది! గెలుపు స్కోర్ అప్‌డేట్ అయ్యింది'
  },

  en: {
    // Header & Global
    partyTitle: 'JSP Pithapuram',
    constituencyBadge: 'AC #37',
    selectBooth: 'Select Assigned Booth',
    booth: 'Booth',
    offlineReady: 'Offline',
    online: 'Online',
    changeBooth: 'Change',
    locked: 'Locked',

    // Bottom Navigation
    navVoters: 'Voters',
    navFamilies: 'Families',
    navInfluencers: 'Leaders',
    navWarRoom: 'War Room',
    navOffline: 'Offline & Tools',

    // Winning Score & Victory Predictor
    victoryPredictor: 'Booth Victory Predictor',
    targetToWin: 'Target to Win',
    atTurnout: 'at expected turnout',
    projectedJsp: 'Projected JSP',
    projectedOpp: 'Opponent Votes',
    swingPot: 'Swing Pot (Undecided)',
    lead: 'Lead Margin',
    deficit: 'Deficit',
    safeWinZone: '🎉 SAFE WIN ZONE',
    likelyWin: '🟢 LIKELY WIN',
    battleground: '🟡 BATTLEGROUND',
    deficitAlert: '🚨 DEFICIT ALERT',
    victoryGoal: 'of Victory Goal',
    actionNeeded: 'Strategic Action Needed',
    hideDetails: 'Hide Details',
    viewBreakdown: 'View Winning Score Breakdown',
    needMoreVotes: 'Convert {count} more swing voters (40% or 50%) into committed supporters to guarantee booth victory.',
    thresholdReached: '🎉 Victory threshold reached! Focus on 100% booth turnout mobilization before 12:00 PM on Polling Day.',

    // Leaning Categories
    fullSupport: '100% Full Support',
    strongLean: '75% Strong Lean',
    positiveToUs: '40% Positive to Us',
    neutralSwing: '50% Neutral / Swing',
    doubtful: '25% Doubtful / Resistant',
    opponent: '0% Opponents',

    // Voter List & Card
    searchPlaceholder: 'Search Name, Phone, Door No, EPIC, Relative, Influencer...',
    filterAll: 'All',
    filterFull: '🚩 100% Full',
    filterSoft: '🟡 40% Positive',
    filterStrong: '🟢 75% Strong',
    filterPhone: '📱 Has Phone',
    filterKriya: '⭐ Kriya Exact',
    filterVoted: '✅ Voted',
    filterOpponent: '🔴 Opponent',
    showingElectors: 'Showing {shown} of {total} electors',
    clearSearch: 'Clear Search',
    noVotersMatch: 'No voters match this filter',
    tryAnotherSearch: 'Try searching for a different name, house number, or clearing filter chips.',
    loadMore: 'Load More Electors ({remaining} remaining) ↓',
    relation: 'Rel',
    age: 'Age',
    houseNo: 'H.No',
    noPhoneAdded: 'No phone added',
    addPhone: '+ Add Phone',
    editPhone: 'Edit Phone',
    influencer: 'Influencer',
    noneAssigned: 'None Assigned',
    assignLead: '+ Assign',
    changeLead: 'Change',
    visitsLogged: 'Visits',
    logVisit: '+ Log Visit',
    addVisit: '+ Add Visit',
    call: 'Call',
    whatsapp: 'WA',
    sms: 'SMS',
    slip: 'Slip',
    pollStatus: '+ Poll Status',
    markVoted: 'Mark Voted',
    markSupporter: 'Mark Supporter',
    doorVisited: 'Door Visited',
    markDoubtful: 'Doubtful',
    markOpponent: 'Opponent',
    clearStatus: 'Clear Status',

    // Surname & Phonetic Search & Winning Formula
    groupBySurname: '🏛️ By Surnames',
    listView: '👥 Voters List',
    phoneticSearch: 'Phonetic Sound-alike Search',
    phoneticActive: '🔊 Phonetic ON',
    allSurnames: 'All Surnames',
    surnameClan: 'Surname Clan',
    winningFormula: 'Winning Formula (50%+ Votes)',
    top10ClansPower: 'Top 10 Surnames Vote Share',
    clanStrength: 'Clan Votes',
    clanElders: 'Clan Elders (60+ Yrs)',
    clanYouth: 'Youth Electors (18-25 Yrs)',
    whatsappClanMessage: 'WhatsApp Clan Elder',

    // Field Visit Modal
    visitModalTitle: 'Field Visit Tracker & Touchpoint Log',
    directContact: 'Direct Contact:',
    logNewVisitTab: '+ Log New Visit',
    historyTab: 'History',
    whoVisited: 'Visitor Designation / Role',
    wardMember: 'Ward Member',
    volunteer: 'Karyakartha / Volunteer',
    sarpanch: 'Sarpanch / MPTC',
    boothConvenor: 'Booth In-charge',
    youthLeader: 'Youth Wing Leader',
    candidateRep: 'Candidate / Key Representative',
    visitorNamePlaceholder: 'Visitor Name (Optional, e.g. Ramu / Suresh)',
    voterConcern: 'Primary Issue Discussed / Voter Demand',
    supportAfterVisit: 'Voter Support After This Visit',
    fieldNotes: 'Ground Notes & Next Action',
    fieldNotesPlaceholder: 'What did the voter say? Will they vote Glass? Any specific promise needed before polling day?',
    saveVisitBtn: 'Save Visit & Update Winning Score',
    noVisitsYet: 'No visits logged yet for this voter',
    firstVisitHint: 'Click "+ Log New Visit" to record the first door-to-door interaction.',

    // Common Issues
    issueGoodwill: 'General Campaign / Goodwill',
    issuePension: 'Pension Delay / Sanction',
    issueWater: 'Drinking Water Supply',
    issueRoad: 'Road & Drainage Issues',
    issueDwcra: 'DWCRA Women Loan / Scheme',
    issueJobs: 'Youth Job / Skill Training',
    issueHealth: 'Aarogyasri / Health Grievance',
    issueRation: 'Ration Card / Housing Issue',

    // War Room Tab
    warRoomTitle: 'Candidate War Room — Winning Weapon',
    candidateVictoryRoom: 'Candidate Victory Command Room',
    swingHitList: '🎯 Swing Hit List (Decides Victory)',
    unvisitedHitList: '🚪 Unvisited',
    doubtfulHitList: '⚠️ Doubtful',
    confirmedHitList: '🚩 Confirmed',
    opponentsHitList: '🔴 Opponents',
    touchpointIntel: 'Field Touchpoint Intelligence',
    totalVisitsCount: 'Total Visits Logged',
    uniqueVotersMet: 'Unique Voters Met',
    unvisitedElectors: 'Unvisited Electors',
    topGrievancesInBooth: 'Top Grievances Raised by Voters in Booth:',
    exportCampaignCsv: 'Export CSV Report',
    backupBoothJson: 'Backup Booth JSON',
    reportsAndExports: 'Candidate Field Reports & Exports',
    reportsDesc: 'Export full survey statuses, multiple visits history, phone numbers, and influencer mappings to Excel CSV or JSON.',

    // Families Tab
    familiesTitle: 'Family Groups & Sentiment',
    createFamily: '+ Create Custom Family',
    searchFamily: 'Search Family Name, House No, Influencer...',
    familyHead: 'Family Head',
    familyMembers: 'Members',
    applyToAllMembers: 'Apply to all family members',

    // Influencers Tab
    influencersTitle: 'Key Influencers & Leaders Hub',
    addNewInfluencer: '+ Register New Influencer',
    assignedVotersCount: 'Assigned Voters',
    dispatchWhatsAppList: 'Send WhatsApp Task List',
    callInfluencer: 'Call Leader',
    influencerRole: 'Role / Designation',

    // Toast notices
    phoneSavedNotice: '📱 Phone updated for {name}',
    supporterNotice: '🚩 Supporter added! Projected JSP votes +1',
    opponentNotice: '🔴 Opponent marked! Opposition vote added, margin reduced',
    visitLoggedNotice: '📋 Field visit logged! Winning score refreshed'
  }
};

export function useI18n() {
  const [lang, setLang] = useState<Language>(getSavedLanguage());

  const toggleLanguage = () => {
    const nextLang: Language = lang === 'te' ? 'en' : 'te';
    setLang(nextLang);
    setSavedLanguage(nextLang);
  };

  const changeLanguage = (newLang: Language) => {
    setLang(newLang);
    setSavedLanguage(newLang);
  };

  const t = translations[lang];

  return { lang, toggleLanguage, changeLanguage, t };
}
