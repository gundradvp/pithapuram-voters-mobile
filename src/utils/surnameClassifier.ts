/**
 * Surname (ఇంటిపేరు) Classification & Election Winning Analytics Engine
 * Identifies family clans, computes clan vote power, analyzes survey leaning,
 * and formulates winning targets for Pithapuram Constituency elections.
 */

import { MobileVoter, VoterCampaignProfile } from '../types';

export interface SurnameGroup {
  id: string; // Canonical identifier e.g. "SHIVAKOTI"
  nameEn: string; // "SHIVAKOTI"
  nameTe: string; // "శివకోటి"
  totalVoters: number;
  pctOfBooth: number;
  maleCount: number;
  femaleCount: number;
  kriyaCount: number;
  fullCount: number;
  strongCount: number;
  neutralCount: number;
  opponentCount: number;
  unvisitedCount: number;
  supportPct: number;
  rank: number;
  voters: MobileVoter[];
  houseNumbers: string[];
  headName?: string;
  headPhone?: string;
  assignedInfluencer?: string;
  topElders: MobileVoter[]; // 60+ yrs
  topYouth: MobileVoter[]; // 18-25 yrs
  targetPriority: 'high' | 'medium' | 'low';
}

export interface WinningFormulaSummary {
  top10VoterCount: number;
  top10Percentage: number;
  top10JspSupporters: number;
  top10SwingVoters: number;
  top10KriyaCount: number;
  votesNeededFromTop10ToWin: number;
  targetWinningThreshold: number;
}

const SURNAME_ALIASES: Record<string, string> = {
  // Common Telugu spelling / transliteration variations
  'SIVAKOTI': 'SHIVAKOTI',
  'SIVAKOTHI': 'SHIVAKOTI',
  'SHIVAKOTHI': 'SHIVAKOTI',
  'VIPARTI': 'VIPPARTHI',
  'VIPPARTHI': 'VIPPARTHI',
  'VIPARTY': 'VIPPARTHI',
  'DEYAYALA': 'DEYYALA',
  'DEYYALA': 'DEYYALA',
  'BAVIRISETTY': 'BAVIRISETTI',
  'BAVIRISETTI': 'BAVIRISETTI',
  'BAVIRISHETTY': 'BAVIRISETTI',
  'RASAMSHETTY': 'RASAMSETTI',
  'RASAMSETTI': 'RASAMSETTI',
  'DODDIPATIA': 'DODDIPATLA',
  'DODDIPATLA': 'DODDIPATLA',
  'MOGLI': 'MOGALI',
  'MOGILI': 'MOGALI',
  'GOWTHU': 'GOUTHU',
  'GOUTHU': 'GOUTHU',
  'LSARAPU': 'ISARAPU',
  'ISARAPU': 'ISARAPU',
  'PABBIREDDY': 'PABBIREDDI',
  'PABBIREDDI': 'PABBIREDDI',
  'PEDDIREDDY': 'PEDDIREDDI',
  'PEDDIREDDI': 'PEDDIREDDI',
  'VEGISETTY': 'VEGISETTI',
  'VEGISETTI': 'VEGISETTI',
  'VEGISHETTY': 'VEGISETTI',
  'PALISETTI': 'POLISETTI',
  'PALISETTY': 'POLISETTI',
  'POLISETTI': 'POLISETTI',
  'TALABATHULA': 'TALABATTULA',
  'THALABATTULA': 'TALABATTULA',
  'TALABATTULA': 'TALABATTULA',
  'CHIKALA': 'CHIKKALA',
  'CHIKKALA': 'CHIKKALA',
  'JYOTULA': 'JYOTHULA',
  'JYOTHULA': 'JYOTHULA',
  'NANGINIDI': 'NANGINEEDI',
  'NANGINEEDI': 'NANGINEEDI',
  'MIRYALA': 'MIRIYALA',
  'MIRIYALA': 'MIRIYALA',
  'PAIDIPATI': 'PAIDIPATI',
  'PIDIPATI': 'PAIDIPATI',
  'PYDIPATI': 'PAIDIPATI',
  'CHINTHA': 'CHINTA',
  'CHINTA': 'CHINTA',
  'KOPPISETTY': 'KOPPISETTI',
  'KOPPISETTI': 'KOPPISETTI',
  'BURRA': 'BURRA',
  'VADAPALLI': 'VADAPALLI',
  'DOMALA': 'DOMALA',
  'CHEKKA': 'CHEKKA',
  'KOTHEM': 'KOTHEM',
  'RAVULA': 'RAVULA',
  'BOJJA': 'BOJJA',
  'PADALA': 'PADALA',
  'KANDA': 'KANDA',
  'MOYILLA': 'MOYILLA',
  'UMMIDII': 'UMMIDI',
  'UMIDI': 'UMMIDI',
  'VUMMIDI': 'UMMIDI',
  'MUMMIDII': 'MUMMIDI',
  'BOMMIDII': 'BOMMIDI',
  'AAKULA': 'AKULA',
  'YINTI': 'INTI',
  'KARNEEDI': 'KARNIDI',
  'KAMEDI': 'KARNIDI',
  'KAMIDI': 'KARNIDI',
  'KUMMA': 'KUMMARI',
  'KOMMU': 'KOMMURI'
};

const CANONICAL_TELUGU_SURNAMES: Record<string, string> = {
  'UMMIDI': 'ఉమ్మిడి',
  'MUMMIDI': 'ముమ్మిడి',
  'BOMMIDI': 'బొమ్మిడి',
  'GUNDRA': 'గుండ్ర',
  'VELUGULA': 'వెలుగుల',
  'THOTA': 'తోట',
  'INTI': 'ఇంటి',
  'PENUGONDA': 'పెనుగొండ',
  'KARRI': 'కర్రి',
  'NAKKA': 'నక్కా',
  'PENUMALLU': 'పెనుమళ్ళు',
  'DADALA': 'దడాల',
  'CHINTAPALLI': 'చింతపల్లి',
  'BANDI': 'బండి',
  'SURADA': 'సూరాడ',
  'PILLI': 'పిల్లి',
  'MERUGU': 'మెరుగు',
  'PENKE': 'పెంకే',
  'CHOKKA': 'చొక్కా',
  'VEMAGIRI': 'వేమగిరి',
  'DASARI': 'దాసరి',
  'GANTA': 'గంటా',
  'DASAM': 'దాసం',
  'KARANAM': 'కరణం',
  'KEERTHI': 'కీర్తి',
  'YALLA': 'యల్లా',
  'KAKADA': 'కాకడ',
  'BATHINA': 'బత్తిన',
  'PEDAPATI': 'పేడాపాటి',
  'PILLA': 'పిల్లా',
  'BANDARU': 'బండారు',
  'GORLA': 'గొర్ల',
  'ADAPA': 'అడపా',
  'TANGELLA': 'తంగెళ్ళ',
  'VASAMSETTI': 'వాసంశెట్టి',
  'ORUGANTI': 'ఓరుగంటి',
  'KAKI': 'కాకి',
  'KARNIDI': 'కర్నీడి',
  'PONNADA': 'పొన్నాడ',
  'KOMMURI': 'కొమ్మూరి',
  'KUMMARI': 'కుమ్మరి',
  'KOPPULA': 'కొప్పుల',
  'MUTHYALA': 'ముత్యాల',
  'GUBBALA': 'గుబ్బల',
  'MADDALA': 'మద్దాల',
  'DESHLANKA': 'దేశిలంక',
  'MEDIBOINA': 'మేడిబోయిన',
  'SHAKHUNALA': 'శాఖునాల',
  'ANUPOJU': 'అనుపోజు',
  'UGGIRALA': 'ఉగ్గిరాల',
  'GATTEM': 'గట్టెం',
  'KONA': 'కోన',
  'KAKINADA': 'కాకినాడ',
  'NAGALLA': 'నాగళ్ళ',
  'SHIVAKOTI': 'శివకోటి',
  'VIPPARTHI': 'విప్పర్తి',
  'DEYYALA': 'దెయ్యాల',
  'MURRE': 'ముర్రే',
  'POTHURI': 'పోతూరి',
  'KANDA': 'కందా',
  'DODDIPATLA': 'దొడ్డిపట్ల',
  'MOYILLA': 'మోయిళ్ళ',
  'BAVIRISETTI': 'బావిరిశెట్టి',
  'RASAMSETTI': 'రసంశెట్టి',
  'ISARAPU': 'ఇసరపు',
  'PADALA': 'పడాల',
  'MOGALI': 'మొగలి',
  'MAMIDALA': 'మామిడాల',
  'MARRI': 'మర్రి',
  'GOLLAPALLI': 'గొల్లపల్లి',
  'TOGARU': 'తొగరు',
  'KURRU': 'కుర్రు',
  'RAVULA': 'రావుల',
  'KOTHEM': 'కొత్తెం',
  'BOJJA': 'బొజ్జ',
  'GOUTHU': 'గౌతు',
  'CHEKKA': 'చెక్కా',
  'POLISETTI': 'పోలిశెట్టి',
  'GADI': 'గాది',
  'DOMALA': 'దోమల',
  'VADAPALLI': 'వాడపల్లి',
  'PEDDIREDDI': 'పెద్దిరెడ్డి',
  'BURRA': 'బుర్రా',
  'KOPPISETTI': 'కొప్పిశెట్టి',
  'CHINTA': 'చింత',
  'AKULA': 'ఆకుల',
  'ANISETTI': 'అనిశెట్టి',
  'KADARI': 'కడారి',
  'GANGIREDLA': 'గంగిరెడ్ల',
  'MIRIYALA': 'మిరియాల',
  'DANGETI': 'దంగేటి',
  'NANGINEEDI': 'నంగినీడి',
  'JYOTHULA': 'జ్యోతుల',
  'BOPPANA': 'బొప్పన',
  'CHOPPARAPU': 'చొప్పరపు',
  'RAYUDU': 'రాయుడు',
  'TALABATTULA': 'తాళాబత్తుల',
  'REDDIM': 'రెడ్డిం',
  'PABBIREDDI': 'పబ్బిరెడ్డి',
  'VEGISETTI': 'వేగిశెట్టి'
};

const STOP_WORDS = new Set([
  'SRI', 'KUMAR', 'KUMARI', 'RAO', 'RAVU', 'REDDY', 'REDDI', 'BABU',
  'PRASAD', 'DEVI', 'LAKSHMI', 'SATYA', 'VEERA', 'VENKATA', 'APPA',
  'FATHER', 'HUSBAND', 'MOTHER', 'WIFE', 'OTHER', 'SON', 'DAUGHTER',
  'NAIDU', 'CHOWDHARY', 'SHARMA', 'VARMA', 'SASTRY', 'MURTHY', 'SWAMY'
]);

/**
 * Extracts normalized surname in English and Telugu for a voter.
 */
export function extractSurname(voter: MobileVoter): { en: string; te: string } {
  // If voter object already has precomputed surname
  if ((voter as any).surname) {
    const sEn = (voter as any).surname.toUpperCase();
    const canonEn = SURNAME_ALIASES[sEn] || sEn;
    return {
      en: canonEn,
      te: (voter as any).surname_te || CANONICAL_TELUGU_SURNAMES[canonEn] || canonEn
    };
  }

  const rawN = voter.n || '';
  const rawR = voter.r || '';

  // 1. Separate English and Telugu from 'NAME (పేరు)'
  const enPartN = rawN.split(/[\(\[]/)[0].trim().toUpperCase();
  const enPartR = rawR.split(/[\(\[]/)[0].trim().toUpperCase();

  const nTokens = enPartN.match(/[A-Z]+/g)?.filter(t => t.length > 2) || [];
  const rTokens = enPartR.match(/[A-Z]+/g)?.filter(t => t.length > 2) || [];

  // 2. Identify common clan token between voter name & relative name
  const common = nTokens.filter(t => rTokens.includes(t) && !STOP_WORDS.has(t));
  let candidateEn = '';

  if (common.length > 0) {
    candidateEn = common[common.length - 1];
  } else if (nTokens.length > 0) {
    // Check last word of name
    const last = nTokens[nTokens.length - 1];
    if (!STOP_WORDS.has(last)) {
      candidateEn = last;
    } else if (nTokens.length > 1) {
      const first = nTokens[0];
      if (!STOP_WORDS.has(first)) {
        candidateEn = first;
      } else {
        candidateEn = nTokens[nTokens.length - 1];
      }
    } else {
      candidateEn = last;
    }
  }

  if (!candidateEn) {
    candidateEn = 'OTHER';
  }

  // Canonicalize via alias map
  const canonEn = SURNAME_ALIASES[candidateEn] || candidateEn;

  // Find Telugu equivalent
  let canonTe = CANONICAL_TELUGU_SURNAMES[canonEn];
  if (!canonTe) {
    // Attempt to extract from Telugu portion
    const teMatch = rawN.match(/\(([^)]+)\)/);
    if (teMatch) {
      // Fix broken trailing single/double syllables separated by space (e.g. 'ఉమ్మి డి' -> 'ఉమ్మిడి', 'పొన్నా డ' -> 'పొన్నాడ', 'కొమ్మూ రి' -> 'కొమ్మూరి')
      const cleanedTe = teMatch[1].trim().replace(/([\u0C00-\u0C7F]+)\s+([\u0C00-\u0C7F]{1,2})$/, '$1$2');
      const teWords = cleanedTe.split(/\s+/).filter(w => w.length > 1);
      if (teWords.length > 0) {
        canonTe = teWords[teWords.length - 1];
      }
    }
  }

  return {
    en: canonEn,
    te: canonTe || canonEn
  };
}

/**
 * Groups and classifies all voters in a booth by their Surname Clan.
 */
export function classifyBoothSurnames(
  voters: MobileVoter[],
  profiles: Record<number, VoterCampaignProfile>
): SurnameGroup[] {
  const clanMap = new Map<string, { en: string; te: string; list: MobileVoter[] }>();

  voters.forEach(v => {
    const { en, te } = extractSurname(v);
    if (!clanMap.has(en)) {
      clanMap.set(en, { en, te, list: [] });
    }
    clanMap.get(en)!.list.push(v);
  });

  const totalElectors = voters.length || 1;

  // Convert to structured SurnameGroup list and sort by voter count descending
  const sortedRaw = Array.from(clanMap.values()).sort((a, b) => b.list.length - a.list.length);

  const groups: SurnameGroup[] = sortedRaw.map((item, idx) => {
    const clanVoters = item.list;
    const total = clanVoters.length;
    let maleCount = 0;
    let femaleCount = 0;
    let kriyaCount = 0;
    let fullCount = 0;
    let strongCount = 0;
    let neutralCount = 0;
    let opponentCount = 0;
    let unvisitedCount = 0;
    let totalScore = 0;

    const houseSet = new Set<string>();
    const elders: MobileVoter[] = [];
    const youth: MobileVoter[] = [];

    clanVoters.forEach(v => {
      if (v.g === 'M') maleCount++;
      else if (v.g === 'F') femaleCount++;

      if (v.kriya) kriyaCount++;
      if (v.hn) houseSet.add(v.hn.trim());

      const ageNum = parseInt(v.a, 10);
      if (!isNaN(ageNum)) {
        if (ageNum >= 60) elders.push(v);
        else if (ageNum >= 18 && ageNum <= 25) youth.push(v);
      }

      const prof = profiles[v.s] || {};
      const hasEntry = prof.supportPct !== undefined;
      const pct = hasEntry ? prof.supportPct! : 50;

      totalScore += pct;

      if (hasEntry) {
        if (pct === 100) fullCount++;
        else if (pct >= 75) strongCount++;
        else if (pct === 40) neutralCount++;
        else if (pct === 0) opponentCount++;
        else neutralCount++;
      } else {
        neutralCount++;
      }

      if (!prof.visits || prof.visits.length === 0) {
        unvisitedCount++;
      }
    });

    const supportPct = Math.round(totalScore / total);
    const pctOfBooth = Number(((total / totalElectors) * 100).toFixed(1));

    // Sort elders and youth by serial
    elders.sort((a, b) => (parseInt(b.a, 10) || 0) - (parseInt(a.a, 10) || 0));
    youth.sort((a, b) => a.s - b.s);

    const headVoter = elders[0] || clanVoters[0];
    const headProf = profiles[headVoter.s] || {};

    const isTop10 = idx < 10;
    const hasManyNeutral = (neutralCount + unvisitedCount) > (total * 0.3);
    const targetPriority: 'high' | 'medium' | 'low' = (isTop10 && hasManyNeutral)
      ? 'high'
      : (isTop10 || total >= 15)
      ? 'medium'
      : 'low';

    return {
      id: item.en,
      nameEn: item.en,
      nameTe: item.te,
      totalVoters: total,
      pctOfBooth,
      maleCount,
      femaleCount,
      kriyaCount,
      fullCount,
      strongCount,
      neutralCount,
      opponentCount,
      unvisitedCount,
      supportPct,
      rank: idx + 1,
      voters: clanVoters,
      houseNumbers: Array.from(houseSet),
      headName: headVoter.n,
      headPhone: headProf.customPhone || headVoter.k_m,
      assignedInfluencer: headProf.influencerName,
      topElders: elders.slice(0, 5),
      topYouth: youth.slice(0, 5),
      targetPriority
    };
  });

  return groups;
}

/**
 * Calculates the Winning Formula based on the Top 10 Surnames.
 * In Andhra Pradesh assembly & local elections, securing 65-70% of the Top 10 clans guarantees a win.
 */
export function calculateWinningFormula(
  surnames: SurnameGroup[],
  totalElectors: number,
  expectedTurnoutPct = 80
): WinningFormulaSummary {
  const top10 = surnames.slice(0, 10);
  const top10VoterCount = top10.reduce((acc, g) => acc + g.totalVoters, 0);
  const top10Percentage = Number(((top10VoterCount / (totalElectors || 1)) * 100).toFixed(1));

  let top10JspSupporters = 0;
  let top10SwingVoters = 0;
  let top10KriyaCount = 0;

  top10.forEach(g => {
    top10JspSupporters += g.fullCount + Math.round(g.strongCount * 0.75);
    top10SwingVoters += g.neutralCount + g.unvisitedCount;
    top10KriyaCount += g.kriyaCount;
  });

  const expectedPollVotes = Math.round((totalElectors * expectedTurnoutPct) / 100);
  const targetWinningThreshold = Math.round(expectedPollVotes * 0.5) + 1; // 50% + 1 vote

  // Votes needed specifically from swing voters in top 10 clans
  const deficit = Math.max(0, targetWinningThreshold - top10JspSupporters);
  const votesNeededFromTop10ToWin = Math.min(deficit, top10SwingVoters);

  return {
    top10VoterCount,
    top10Percentage,
    top10JspSupporters,
    top10SwingVoters,
    top10KriyaCount,
    votesNeededFromTop10ToWin,
    targetWinningThreshold
  };
}
