/**
 * English to Telugu Name & Surname Transliterator & Parsing Engine
 * Converts English voter names and surnames into authentic, grammatically correct Telugu script.
 */

import { MobileVoter, VoterCampaignProfile } from '../types';
import { extractSurname } from './surnameClassifier';

// Canonical Telugu Surnames Map
export const TELUGU_SURNAMES_MAP: Record<string, string> = {
  'PASAGADUGULA': 'పసగడుగుల',
  'GUNDRA': 'గుండ్ర',
  'KAKI': 'కాకి',
  'DASAM': 'దాసం',
  'INTI': 'ఇంటి',
  'UMMIDI': 'ఉమ్మిడి',
  'MUMMIDI': 'ముమ్మిడి',
  'BOMMIDI': 'బొమ్మిడి',
  'VELUGULA': 'వెలుగుల',
  'THOTA': 'తోట',
  'PENUGONDA': 'పెనుగొండ',
  'PENUGANDA': 'పెనుగండ',
  'KARRI': 'కర్రి',
  'NAKKA': 'నక్కా',
  'PENUMALLU': 'పెనుమళ్ళు',
  'DADALA': 'దడాల',
  'CHINTAPALLI': 'చింతపల్లి',
  'BANDI': 'బండి',
  'SURADA': 'సూరాడ',
  'PILLI': 'పిల్లి',
  'PILLA': 'పిల్లా',
  'MERUGU': 'మెరుగు',
  'PENKE': 'పెంకే',
  'CHOKKA': 'చొక్కా',
  'VEMAGIRI': 'వేమగిరి',
  'DASARI': 'దాసరి',
  'GANTA': 'గంటా',
  'KARANAM': 'కరణం',
  'KEERTHI': 'కీర్తి',
  'YALLA': 'యల్లా',
  'KAKADA': 'కాకడ',
  'BATHINA': 'బత్తిన',
  'PEDAPATI': 'పేడాపాటి',
  'DESHINDI': 'దేశినడి',
  'DESIDI': 'దేశిడి',
  'PADALA': 'పడాల',
  'MIRIYALA': 'మిరియాల',
  'GOPISETTY': 'గోపిశెట్టి',
  'SHIVAKOTI': 'శివకోటి',
  'SIVAKOTI': 'శివకోటి',
  'VIPPURTHI': 'విప్పుర్తి',
  'VIPPURTI': 'విప్పుర్తి',
  'KAKINADA': 'కాకినాడ',
  'JYOTHULA': 'జ్యోతుల',
  'NAGARPU': 'నాగర్పు',
  'CHESHETTI': 'చేశెట్టి',
  'KOPPISETTI': 'కొప్పిశెట్టి',
  'AKULA': 'ఆకుల',
  'GOLAPALLI': 'గొల్లపల్లి',
  'GOLLAPALLI': 'గొల్లపల్లి'
};

// Common Andhra First Names Map
export const TELUGU_FIRST_NAMES_MAP: Record<string, string> = {
  'LAVANYA': 'లావణ్య',
  'KRISHNA': 'కృష్ణ',
  'RAMARAO': 'రామారావు',
  'CHANDRAKALA': 'చంద్రకళ',
  'MANGARANI': 'మంగారాణి',
  'MANGATAYARU': 'మంగతాయారు',
  'VENKATARAMANA': 'వెంకటరమణ',
  'VENKATESH': 'వెంకటేష్',
  'VENKATESWARARAO': 'వెంకటేశ్వరరావు',
  'SATHYANARAYANA': 'సత్యనారాయణ',
  'SATYANARAYANA': 'సత్యనారాయణ',
  'SATHYANARAYAN': 'సత్యనారాయణ',
  'DURGA': 'దుర్గ',
  'DURGARAO': 'దుర్గారావు',
  'SUBBARAO': 'సుబ్బారావు',
  'LAKSHMI': 'లక్ష్మి',
  'LAXMI': 'లక్ష్మి',
  'SRINIVAS': 'శ్రీనివాస్',
  'SRINIVASARAO': 'శ్రీనివాసరావు',
  'PRASAD': 'ప్రసాద్',
  'BABU': 'బాబు',
  'RAVI': 'రవి',
  'TEJA': 'తేజ',
  'RAVITEJA': 'రవితేజ',
  'ANITHA': 'అనిత',
  'KUMARI': 'కుమారి',
  'DEVI': 'దేవి',
  'PADMA': 'పద్మ',
  'PADMAVATHI': 'పద్మావతి',
  'BHAGYALAKSHMI': 'భాగ్యలక్ష్మి',
  'BHAGYAVATHI': 'భాగ్యవతి',
  'GANGABHAVANI': 'గంగాభవాని',
  'VEERABBAI': 'వీరబ్బాయి',
  'MANIKYAM': 'మాణిక్యం',
  'MANIKYALAMMA': 'మాణిక్యాలమ్మ',
  'NAGESWARARAO': 'నాగేశ్వరరావు',
  'NAGARAJU': 'నాగరాజు',
  'SURYANARAYANA': 'సూర్యనారాయణ',
  'SURIBABU': 'సూరిబాబు',
  'APPALANARASAYYA': 'అప్పలనరసయ్య',
  'CHINNA': 'చిన్న',
  'PEDDA': 'పెద్ద',
  'RAMA': 'రామ',
  'SITA': 'సీత',
  'RADHA': 'రాధ'
};

/**
 * Phonetic syllabic transliteration fallback for arbitrary English names to Telugu.
 */
export function transliterateEnglishToTelugu(rawText: string): string {
  if (!rawText || typeof rawText !== 'string') return '';
  const clean = rawText.trim().toUpperCase();
  if (!clean) return '';

  // Check full word direct match in surnames or first names
  if (TELUGU_SURNAMES_MAP[clean]) return TELUGU_SURNAMES_MAP[clean];
  if (TELUGU_FIRST_NAMES_MAP[clean]) return TELUGU_FIRST_NAMES_MAP[clean];

  // Multi-word support
  const words = clean.split(/\s+/);
  if (words.length > 1) {
    return words.map(w => transliterateSingleWord(w)).join(' ');
  }

  return transliterateSingleWord(clean);
}

function transliterateSingleWord(word: string): string {
  if (TELUGU_SURNAMES_MAP[word]) return TELUGU_SURNAMES_MAP[word];
  if (TELUGU_FIRST_NAMES_MAP[word]) return TELUGU_FIRST_NAMES_MAP[word];

  const w = word.toLowerCase();
  let i = 0;
  let res = '';

  const consonants: Record<string, string> = {
    'kh': 'ఖ', 'gh': 'ఘ', 'ch': 'చ', 'chh': 'ఛ', 'jh': 'ఝ',
    'th': 'థ', 'dh': 'ధ', 'ph': 'ఫ', 'bh': 'భ', 'sh': 'ష',
    'ksh': 'క్ష', 'gn': 'జ్ఞ', 'ny': 'ఞ', 'ng': 'ఙ',
    'k': 'క', 'g': 'గ', 'j': 'జ', 't': 'త', 'd': 'ద',
    'n': 'న', 'p': 'ప', 'b': 'బ', 'm': 'మ', 'y': 'య',
    'r': 'ర', 'l': 'ల', 'v': 'వ', 'w': 'వ', 's': 'స', 'h': 'హ'
  };

  const vowels: Record<string, string> = {
    'aa': 'ా', 'ee': 'ీ', 'ii': 'ీ', 'oo': 'ూ', 'uu': 'ూ',
    'ai': 'ై', 'au': 'ౌ',
    'a': 'ా', 'i': 'ి', 'u': 'ు', 'e': 'ె', 'o': 'ొ'
  };

  const initialVowels: Record<string, string> = {
    'aa': 'ఆ', 'ee': 'ఈ', 'ii': 'ఈ', 'oo': 'ఊ', 'uu': 'ఊ',
    'ai': 'ఐ', 'au': 'ఔ',
    'a': 'అ', 'i': 'ఇ', 'u': 'ఉ', 'e': 'ఎ', 'o': 'ఒ'
  };

  while (i < w.length) {
    // Check initial vowels if at start
    if (i === 0) {
      if (i + 1 < w.length && initialVowels[w.slice(i, i + 2)]) {
        res += initialVowels[w.slice(i, i + 2)];
        i += 2;
        continue;
      }
      if (initialVowels[w[i]]) {
        res += initialVowels[w[i]];
        i += 1;
        continue;
      }
    }

    // Check 3-letter consonant (ksh)
    if (i + 2 < w.length && consonants[w.slice(i, i + 3)]) {
      const c = consonants[w.slice(i, i + 3)];
      i += 3;
      // check following vowel
      if (i < w.length) {
        if (i + 1 < w.length && vowels[w.slice(i, i + 2)]) {
          res += c + vowels[w.slice(i, i + 2)];
          i += 2;
        } else if (vowels[w[i]]) {
          res += c + (w[i] === 'a' ? '' : vowels[w[i]]);
          i += 1;
        } else {
          res += c + '్';
        }
      } else {
        res += c;
      }
      continue;
    }

    // Check 2-letter consonant
    if (i + 1 < w.length && consonants[w.slice(i, i + 2)]) {
      const c = consonants[w.slice(i, i + 2)];
      i += 2;
      if (i < w.length) {
        if (i + 1 < w.length && vowels[w.slice(i, i + 2)]) {
          res += c + vowels[w.slice(i, i + 2)];
          i += 2;
        } else if (vowels[w[i]]) {
          res += c + (w[i] === 'a' ? '' : vowels[w[i]]);
          i += 1;
        } else {
          res += c + '్';
        }
      } else {
        res += c;
      }
      continue;
    }

    // Check 1-letter consonant
    if (consonants[w[i]]) {
      const c = consonants[w[i]];
      i += 1;
      if (i < w.length) {
        if (i + 1 < w.length && vowels[w.slice(i, i + 2)]) {
          res += c + vowels[w.slice(i, i + 2)];
          i += 2;
        } else if (vowels[w[i]]) {
          res += c + (w[i] === 'a' ? '' : vowels[w[i]]);
          i += 1;
        } else {
          res += c + '్';
        }
      } else {
        res += c;
      }
      continue;
    }

    // Isolated vowel inside word
    if (i + 1 < w.length && vowels[w.slice(i, i + 2)]) {
      res += vowels[w.slice(i, i + 2)];
      i += 2;
      continue;
    }
    if (vowels[w[i]]) {
      res += vowels[w[i]];
      i += 1;
      continue;
    }

    i++;
  }

  return res || word;
}

export interface ParsedNameDetails {
  firstNameEn: string;
  surnameEn: string;
  firstNameTe: string;
  surnameTe: string;
  fullNameEn: string;
  fullNameTe: string;
  isTeluguSuspected: boolean;
}

/**
 * Parses voter name into First Name & Surname in English & Telugu.
 * Respects user corrections saved in VoterCampaignProfile over raw OCR strings.
 */
export function parseNameAndSurname(voter: MobileVoter, profile?: VoterCampaignProfile): ParsedNameDetails {
  // 1. Resolve full names prioritizing user campaign profile corrections
  const profileTe = (profile?.correctedNameTe || profile?.customAlias || '').trim();
  const profileEn = (profile?.correctedNameEn || '').trim();
  const profileSurnameTe = (profile?.correctedSurnameTe || profile?.surnameTe || '').trim();
  const profileSurnameEn = (profile?.correctedSurnameEn || profile?.surnameEn || '').trim().toUpperCase();

  const nameEn = (profileEn || voter.name_en || '').trim();
  const nameTe = (profileTe || voter.name_te || '').trim();

  // 2. Resolve surnames prioritizing user corrections and direct voter surname properties
  let surnameEn = profileSurnameEn || (voter.surname_en || (voter as any).surname || '').trim().toUpperCase();
  let surnameTe = profileSurnameTe || (voter.surname_te || '').trim();

  // If not explicitly defined, fall back to classifier
  if (!surnameEn || !surnameTe) {
    const extracted = extractSurname(voter, profile);
    if (!surnameEn) surnameEn = extracted.en.trim().toUpperCase();
    if (!surnameTe) surnameTe = extracted.te.trim();
  }

  // 3. Extract first name in English
  let firstNameEn = nameEn;
  if (surnameEn && nameEn.toUpperCase().includes(surnameEn)) {
    firstNameEn = nameEn
      .replace(new RegExp(`\\b${surnameEn}\\b`, 'gi'), '')
      .replace(/\s+/g, ' ')
      .trim();
  }
  if (!firstNameEn) {
    firstNameEn = nameEn;
  }

  // 4. Extract first name in Telugu
  let firstNameTe = nameTe;
  if (surnameTe && nameTe.includes(surnameTe)) {
    firstNameTe = nameTe
      .replace(new RegExp(surnameTe, 'g'), '')
      .replace(/\s+/g, ' ')
      .trim();
  }

  // Fallback transliteration if Telugu first name is missing or noisy
  if (!firstNameTe || (!profileTe && /[.:;,?\/#!@$%^*_=+<>|~`0-9]/.test(firstNameTe))) {
    firstNameTe = transliterateEnglishToTelugu(firstNameEn);
  }

  // Suspicion check: only flag if not already corrected by user
  const isCorrected = !!(profile?.correctedNameTe || profile?.correctedSurnameTe || voter.surname_te);
  const isTeluguSuspected = !isCorrected && (
    /[.:;,?\/#!@$%^*_=+<>|~`0-9]/.test(nameTe) || 
    nameTe.length < 3 ||
    (!nameTe.includes(' ') && nameEn.includes(' '))
  );

  return {
    firstNameEn,
    surnameEn,
    firstNameTe,
    surnameTe,
    fullNameEn: surnameEn && firstNameEn !== surnameEn ? `${firstNameEn} ${surnameEn}` : nameEn,
    fullNameTe: surnameTe && firstNameTe !== surnameTe ? `${firstNameTe} ${surnameTe}` : (firstNameTe || nameTe),
    isTeluguSuspected
  };
}
