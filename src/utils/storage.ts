import { BoothData, VoterSurveyStatus, FamilyGroup, Influencer, VoterCampaignProfile, MobileVoter, VoterVisit, WinningScoreCalculation } from '../types';

const ASSIGNED_BOOTH_KEY = 'jsp_mobile_assigned_booth';
const BOOTH_LOCKED_KEY = 'jsp_mobile_booth_locked';
const ADMIN_PIN_KEY = 'jsp_mobile_admin_pin';
const DEFAULT_ADMIN_PIN = '1982';

export function getAssignedBooth(): number | string | null {
  const val = localStorage.getItem(ASSIGNED_BOOTH_KEY);
  if (!val) return null;
  const num = parseInt(val, 10);
  return isNaN(num) || val.includes('_') ? val : num;
}

export function setAssignedBooth(partNo: number | string, lock: boolean = true): void {
  localStorage.setItem(ASSIGNED_BOOTH_KEY, partNo.toString());
  localStorage.setItem(BOOTH_LOCKED_KEY, lock ? 'true' : 'false');
}

export function isBoothLocked(): boolean {
  return localStorage.getItem(BOOTH_LOCKED_KEY) === 'true';
}

export function unlockBooth(): void {
  localStorage.setItem(BOOTH_LOCKED_KEY, 'false');
}

export function verifyAdminPin(pin: string): boolean {
  const storedPin = localStorage.getItem(ADMIN_PIN_KEY) || DEFAULT_ADMIN_PIN;
  return pin.trim() === storedPin;
}

export function setAdminPin(newPin: string): void {
  localStorage.setItem(ADMIN_PIN_KEY, newPin.trim());
}

// -------------------------------------------------------------
// Offline Booth Caching (Full Offline Field Work Support)
// -------------------------------------------------------------
export const DATA_CACHE_VERSION = '2026.10.29.v3';
const CACHE_VERSION_KEY = 'jsp_data_cache_version';

function getBoothStorageKey(partNo: number | string): string {
  return `jsp_offline_booth_${partNo}`;
}

export function isCacheStale(): boolean {
  return localStorage.getItem(CACHE_VERSION_KEY) !== DATA_CACHE_VERSION;
}

export function getCachedBoothData(partNo: number | string): BoothData | null {
  try {
    const raw = localStorage.getItem(getBoothStorageKey(partNo));
    if (!raw) return null;
    return JSON.parse(raw);
  } catch (err) {
    console.error('Failed to load cached booth:', err);
    return null;
  }
}

export function saveCachedBoothData(partNo: number | string, data: BoothData): boolean {
  try {
    localStorage.setItem(getBoothStorageKey(partNo), JSON.stringify(data));
    localStorage.setItem(CACHE_VERSION_KEY, DATA_CACHE_VERSION);
    return true;
  } catch (err) {
    console.error('Failed to cache booth data locally:', err);
    return false;
  }
}

export function clearStaleBoothCache(): void {
  try {
    Object.keys(localStorage).forEach(key => {
      if (key.startsWith('jsp_offline_booth_')) {
        localStorage.removeItem(key);
      }
    });
    localStorage.setItem(CACHE_VERSION_KEY, DATA_CACHE_VERSION);
  } catch (err) {
    console.warn('Could not clear stale booth cache:', err);
  }
}

export function isBoothCached(partNo: number | string): boolean {
  return !!localStorage.getItem(getBoothStorageKey(partNo));
}

// -------------------------------------------------------------
// Voter Campaign Profiles (Custom Phone, Leaning %, Influencer, Visits)
// -------------------------------------------------------------
function getVoterProfilesKey(partNo: number | string): string {
  return `jsp_voter_profiles_booth_${partNo}`;
}

export function getVoterProfiles(partNo: number | string): Record<number, VoterCampaignProfile> {
  try {
    const raw = localStorage.getItem(getVoterProfilesKey(partNo));
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

export function saveVoterProfile(partNo: number | string, sno: number, updates: Partial<VoterCampaignProfile>): void {
  const profiles = getVoterProfiles(partNo);
  profiles[sno] = { ...profiles[sno], ...updates };
  try {
    localStorage.setItem(getVoterProfilesKey(partNo), JSON.stringify(profiles));
  } catch (err) {
    console.error('Failed to save voter profile:', err);
  }
}

export function addVoterVisit(partNo: number | string, sno: number, visit: VoterVisit): void {
  const profiles = getVoterProfiles(partNo);
  const current = profiles[sno] || {};
  const currentVisits = current.visits || [];
  profiles[sno] = {
    ...current,
    supportPct: visit.sentimentAfter,
    visits: [visit, ...currentVisits]
  };
  try {
    localStorage.setItem(getVoterProfilesKey(partNo), JSON.stringify(profiles));
  } catch (err) {
    console.error('Failed to add voter visit:', err);
  }
}

// -------------------------------------------------------------
// CAMPAIGN WINNING SCORE & MARGIN CALCULATOR (Winning Weapon)
// -------------------------------------------------------------
export function calculateWinningScore(
  boothData: BoothData,
  profiles: Record<number, VoterCampaignProfile>
): WinningScoreCalculation {
  const totalElectors = boothData.voters.length || 1;
  const expectedTurnoutPct = 80; // Historical Pithapuram turnout benchmark (~80%)
  const expectedPollVotes = Math.round((totalElectors * expectedTurnoutPct) / 100);
  const targetVotesToWin = Math.ceil(expectedPollVotes / 2) + 1;

  let rawJspSum = 0;
  let rawOpponentSum = 0;
  let rawNeutralSum = 0;

  boothData.voters.forEach(v => {
    const p = profiles[v.s] || {};
    const pct = p.supportPct !== undefined ? p.supportPct : (v.kriya ? 100 : 50);

    if (pct === 100) {
      rawJspSum += 1.0;
    } else if (pct >= 75) {
      rawJspSum += 0.75;
      rawNeutralSum += 0.25;
    } else if (pct === 40) {
      rawJspSum += 0.40;
      rawNeutralSum += 0.60;
    } else if (pct === 0) {
      // Marked as Opponent: directly adds to opposition vote bank
      rawOpponentSum += 1.0;
    } else if (pct <= 25) {
      rawJspSum += 0.15;
      rawOpponentSum += 0.60;
      rawNeutralSum += 0.25;
    } else {
      // 50% Neutral swing: splits 50/50 naturally
      rawJspSum += 0.35;
      rawOpponentSum += 0.35;
      rawNeutralSum += 0.30;
    }
  });

  // Scale with expected turnout rate
  const turnoutMultiplier = expectedTurnoutPct / 100;
  const projectedJspVotes = Math.round(rawJspSum * turnoutMultiplier);
  const projectedOpponentVotes = Math.round(rawOpponentSum * turnoutMultiplier);
  const projectedNeutralVotes = Math.round(rawNeutralSum * turnoutMultiplier);
  const projectedLead = projectedJspVotes - projectedOpponentVotes;

  const victoryProbability = Math.min(
    99,
    Math.max(1, Math.round((projectedJspVotes / targetVotesToWin) * 100))
  );

  const neededToGuarantee = Math.max(0, targetVotesToWin - projectedJspVotes);

  let status: WinningScoreCalculation['status'] = 'battleground';
  if (projectedLead >= 50 && projectedJspVotes >= targetVotesToWin) {
    status = 'safe_win';
  } else if (projectedLead > 10) {
    status = 'likely_win';
  } else if (projectedLead < -15) {
    status = 'deficit_danger';
  } else {
    status = 'battleground';
  }

  return {
    totalElectors,
    expectedTurnoutPct,
    expectedPollVotes,
    targetVotesToWin,
    projectedJspVotes,
    projectedOpponentVotes,
    projectedNeutralVotes,
    projectedLead,
    victoryProbability,
    status,
    neededToGuarantee
  };
}

// -------------------------------------------------------------
// Family Groups Management
// -------------------------------------------------------------
function getFamiliesKey(partNo: number | string): string {
  return `jsp_families_booth_${partNo}`;
}

export function getFamilyGroups(partNo: number | string, voters?: MobileVoter[]): Record<string, FamilyGroup> {
  try {
    const raw = localStorage.getItem(getFamiliesKey(partNo));
    if (raw) return JSON.parse(raw);

    if (voters && voters.length > 0) {
      const generated = autoGenerateHouseFamilies(partNo, voters);
      localStorage.setItem(getFamiliesKey(partNo), JSON.stringify(generated));
      return generated;
    }
    return {};
  } catch {
    return {};
  }
}

export function autoGenerateHouseFamilies(partNo: number | string, voters: MobileVoter[]): Record<string, FamilyGroup> {
  const map: Record<string, FamilyGroup> = {};
  const houseMap = new Map<string, MobileVoter[]>();

  voters.forEach(v => {
    const hn = (v.hn || 'Unknown').trim();
    if (!houseMap.has(hn)) houseMap.set(hn, []);
    houseMap.get(hn)!.push(v);
  });

  houseMap.forEach((members, hn) => {
    const famId = `fam_${hn.replace(/[^a-zA-Z0-9]/g, '_')}`;
    const head = members[0];
    const kriyaCount = members.filter(m => m.kriya).length;
    let defaultPct = 50;
    if (kriyaCount === members.length && members.length > 0) defaultPct = 100;
    else if (kriyaCount > 0) defaultPct = 75;

    map[famId] = {
      id: famId,
      name: `${head.n.split(' ')[0]} Family (H.No ${hn})`,
      houseNumbers: [hn],
      headName: head.n,
      supportPct: defaultPct,
      supportCategory: defaultPct === 100 ? 'full_support' : defaultPct >= 75 ? 'strong_lean' : 'neutral_swing',
      memberSnos: members.map(m => m.s),
      campaignNotes: ''
    };
  });

  return map;
}

export function saveFamilyGroup(partNo: number | string, family: FamilyGroup): void {
  const families = getFamilyGroups(partNo);
  families[family.id] = family;
  try {
    localStorage.setItem(getFamiliesKey(partNo), JSON.stringify(families));
  } catch (err) {
    console.error('Failed to save family group:', err);
  }
}

export function deleteFamilyGroup(partNo: number | string, familyId: string): void {
  const families = getFamilyGroups(partNo);
  delete families[familyId];
  try {
    localStorage.setItem(getFamiliesKey(partNo), JSON.stringify(families));
  } catch (err) {
    console.error('Failed to delete family group:', err);
  }
}

// -------------------------------------------------------------
// Key Influencers Hub
// -------------------------------------------------------------
function getInfluencersKey(partNo: number | string): string {
  return `jsp_influencers_booth_${partNo}`;
}

export function getInfluencers(partNo: number | string): Record<string, Influencer> {
  try {
    const raw = localStorage.getItem(getInfluencersKey(partNo));
    if (raw) return JSON.parse(raw);

    const defaults: Record<string, Influencer> = {
      'inf_1': {
        id: 'inf_1',
        name: 'Guddati Veerraju',
        mobile: '9848596259',
        role: 'Ward Member / Community Head',
        notes: 'Influences 12 households in Sagar Colony'
      },
      'inf_2': {
        id: 'inf_2',
        name: 'Nakka Srinu',
        mobile: '8341245339',
        role: 'Youth Leader / Active JSP Volunteer',
        notes: 'Covers Temple street and Old SC Peta'
      }
    };
    localStorage.setItem(getInfluencersKey(partNo), JSON.stringify(defaults));
    return defaults;
  } catch {
    return {};
  }
}

export function saveInfluencer(partNo: number | string, influencer: Influencer): void {
  const list = getInfluencers(partNo);
  list[influencer.id] = influencer;
  try {
    localStorage.setItem(getInfluencersKey(partNo), JSON.stringify(list));
  } catch (err) {
    console.error('Failed to save influencer:', err);
  }
}

export function deleteInfluencer(partNo: number | string, influencerId: string): void {
  const list = getInfluencers(partNo);
  delete list[influencerId];
  try {
    localStorage.setItem(getInfluencersKey(partNo), JSON.stringify(list));
  } catch (err) {
    console.error('Failed to delete influencer:', err);
  }
}

// -------------------------------------------------------------
// WhatsApp Message Builder for Influencer Dispatch
// -------------------------------------------------------------
export function generateInfluencerWhatsAppMessage(
  influencer: Influencer,
  boothPartNo: number | string,
  village: string,
  assignedVoters: MobileVoter[],
  profiles: Record<number, VoterCampaignProfile>
): string {
  let msg = `*🚩 జనసేన పార్టీ — పిఠాపురం నియోజకవర్గం (AC #37)*\n`;
  msg += `*బూత్ #${boothPartNo} (${village}) — ఇన్‌ఫ్లుయెన్సర్ బాధ్యత పత్రం*\n\n`;
  msg += `నమస్కారం *${influencer.name}* గారు (${influencer.role}),\n`;
  msg += `మీ పరిధిలో పార్టీ గెలుపు కొరకు బాధ్యతగా కేటాయించిన ఓటర్ల జాబితా (${assignedVoters.length} మంది):\n\n`;

  assignedVoters.forEach((v, idx) => {
    const prof = profiles[v.s] || {};
    const phone = prof.customPhone || v.k_m || 'నంబర్ లేదు';
    const pct = prof.supportPct !== undefined ? prof.supportPct : (v.kriya ? 100 : 50);
    const pctText = pct === 100 ? '100% మనవాళ్లే' : pct >= 75 ? '75% అనుకూలం' : pct === 40 ? '40% సానుకూలం (ప్రయత్నించాలి)' : pct === 0 ? 'ప్రత్యర్థి' : `${pct}% మద్దతు`;

    msg += `${idx + 1}. *${v.n}* (S.No #${v.s})\n`;
    msg += `   ఇంటి నెం: ${v.hn} • వయస్సు: ${v.a}Y • ఫోన్: ${phone}\n`;
    msg += `   మద్దతు స్థితి: ${pctText}\n`;
    if (prof.visits && prof.visits.length > 0) {
      msg += `   సందర్శనలు: ${prof.visits.length} సార్లు వెళ్లాము (చివరి గమనిక: ${prof.visits[0].notes})\n`;
    } else if (prof.notes) {
      msg += `   గమనిక: ${prof.notes}\n`;
    }
    msg += `\n`;
  });

  msg += `దయచేసి వీరందరినీ స్వయంగా కలిసి మన గాజు గ్లాసు గుర్తుకు సంపూర్ణ మద్దతు ఇవ్వవలసిందిగా కోరగలరు. జై జనసేన! 🚩`;
  return msg;
}

// -------------------------------------------------------------
// Download to Mobile Local Files (JSON Export)
// -------------------------------------------------------------
export function downloadBoothAsJson(data: BoothData): void {
  const fileName = `JSP_Pithapuram_Booth_${data.booth_info.part_no}_Voters.json`;
  const jsonContent = JSON.stringify(data, null, 2);
  const blob = new Blob([jsonContent], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export function exportSurveyReportCsv(
  data: BoothData,
  profiles: Record<number, VoterCampaignProfile>
): void {
  const headers = [
    'Part No',
    'Serial No',
    'EPIC ID',
    'Voter Name',
    'Relation',
    'House No',
    'Age',
    'Gender',
    'Phone Number',
    'Is Kriya Member',
    'Kriya Phone',
    'Support Leaning %',
    'Assigned Influencer',
    'Total Field Visits',
    'Last Visit Note',
    'Campaign Notes',
    'Survey Status'
  ];

  const rows = data.voters.map(v => {
    const p = profiles[v.s] || {};
    const pct = p.supportPct !== undefined ? `${p.supportPct}%` : (v.kriya ? '100%' : '50%');
    const phone = p.customPhone || v.k_m || '';
    const visitCount = p.visits?.length || 0;
    const lastVisitNote = p.visits?.[0]?.notes || '';
    return [
      data.booth_info.part_no,
      v.s,
      `"${v.id || ''}"`,
      `"${v.n || ''}"`,
      `"${v.r || ''}"`,
      `"${v.hn || ''}"`,
      v.a || '',
      v.g || '',
      `"${phone}"`,
      v.kriya ? 'YES' : 'NO',
      v.k_m ? `"${v.k_m}"` : '',
      `"${pct}"`,
      p.influencerName ? `"${p.influencerName}"` : '',
      visitCount,
      `"${lastVisitNote}"`,
      p.notes ? `"${p.notes}"` : '',
      p.survey_status ? `"${p.survey_status.toUpperCase()}"` : 'UNMARKED'
    ];
  });

  const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `Booth_${data.booth_info.part_no}_Campaign_Master_Report.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
