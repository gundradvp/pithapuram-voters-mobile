/**
 * Indic Telugu-English Phonetic Search Engine
 * Provides resilient sound-alike search across English, Telugu, and Transliterated names.
 * Handles spelling variations (e.g. Laxmi/Lakshmi, Sivakoti/Shivakoti, Bojja/Boja, Chintha/Chinta).
 */

import { MobileVoter } from '../types';

const TEL_CONSONANTS: Record<string, string> = {
  'క': 'K', 'ఖ': 'K', 'గ': 'G', 'ఘ': 'G', 'ఙ': 'N',
  'చ': 'S', 'ఛ': 'S', 'జ': 'J', 'ఝ': 'J', 'ఞ': 'N',
  'ట': 'T', 'ఠ': 'T', 'డ': 'D', 'ఢ': 'D', 'ణ': 'N',
  'త': 'T', 'థ': 'T', 'ద': 'D', 'ధ': 'D', 'న': 'N',
  'ప': 'P', 'ఫ': 'F', 'బ': 'B', 'భ': 'B', 'మ': 'M',
  'య': 'Y', 'ర': 'R', 'ల': 'L', 'వ': 'V', 'శ': 'S', 'ష': 'S', 'స': 'S', 'హ': 'H', 'ళ': 'L', 'క్ష': 'X'
};

const TEL_VOWELS: Record<string, string> = {
  'అ': 'A', 'ఆ': 'A', 'ఇ': 'I', 'ఈ': 'I', 'ఉ': 'U', 'ఊ': 'U',
  'ఎ': 'E', 'ఏ': 'E', 'ఐ': 'AI', 'ఒ': 'O', 'ఓ': 'O', 'ఔ': 'AU',
  'ా': 'A', 'ి': 'I', 'ీ': 'I', 'ు': 'U', 'ూ': 'U', 'ృ': 'R',
  'ె': 'E', 'ే': 'E', 'ై': 'AI', 'ొ': 'O', 'ో': 'O', 'ౌ': 'AU',
  'ం': 'N', 'ః': 'H'
};

export function transliterateTelugu(text: string): string {
  if (!text) return '';
  const out: string[] = [];
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (TEL_CONSONANTS[ch]) {
      out.push(TEL_CONSONANTS[ch]);
    } else if (TEL_VOWELS[ch]) {
      out.push(TEL_VOWELS[ch]);
    } else if ((ch >= 'a' && ch <= 'z') || (ch >= 'A' && ch <= 'Z') || (ch >= '0' && ch <= '9')) {
      out.push(ch.toUpperCase());
    }
  }
  return out.join('');
}

export function toPhoneticKey(word: string): string {
  if (!word) return '';
  let t = transliterateTelugu(word).toUpperCase();
  t = t.replace(/[^A-Z0-9]/g, '');
  if (!t) return '';

  // Standardize common Telugu transliteration sound-alikes
  t = t.replace(/KSH|CSH/g, 'X');
  t = t.replace(/CH|SH/g, 'S');
  t = t.replace(/EE|EA|Y/g, 'I');
  t = t.replace(/OO|OU|OW/g, 'U');
  t = t.replace(/TH/g, 'T').replace(/DH/g, 'D').replace(/BH/g, 'B').replace(/GH/g, 'G').replace(/PH/g, 'F');
  t = t.replace(/W/g, 'V');
  t = t.replace(/Z/g, 'J');

  // Keep the first character, remove subsequent vowels
  const first = t[0];
  const rest = t.slice(1).replace(/[AEIOU]/g, '');
  t = first + rest;

  // Collapse consecutive double letters
  t = t.replace(/([A-Z0-9])\1+/g, '$1');

  return t;
}

export function extractPhoneticTokens(text: string): string[] {
  if (!text) return [];
  // Split on spaces, brackets, hyphens, slashes
  const rawWords = text.split(/[\s\(\)\[\],\-–/]+/);
  const keys: string[] = [];

  for (const w of rawWords) {
    const clean = w.trim();
    if (clean.length >= 2) {
      const k = toPhoneticKey(clean);
      if (k && k.length >= 2) {
        keys.push(k);
      }
    }
  }
  return keys;
}

// Precomputation cache to ensure sub-millisecond search across thousands of electors
const voterTokensCache = new WeakMap<MobileVoter, string[]>();

export function getVoterPhoneticTokens(voter: MobileVoter): string[] {
  let cached = voterTokensCache.get(voter);
  if (cached) return cached;

  const combinedText = `${voter.n} ${voter.r} ${voter.sec || ''}`;
  cached = extractPhoneticTokens(combinedText);
  voterTokensCache.set(voter, cached);
  return cached;
}

/**
 * Checks if a voter matches the search query.
 * First tries standard case-insensitive substring match.
 * If not matched, performs Indic phonetic sound-alike match.
 */
export function matchesPhoneticSearch(
  query: string,
  voter: MobileVoter,
  phone?: string,
  influencerName?: string
): boolean {
  const q = query.toLowerCase().trim();
  if (!q) return true;

  // 1. Instant Direct Substring Match
  if (
    voter.n.toLowerCase().includes(q) ||
    voter.r.toLowerCase().includes(q) ||
    voter.id.toLowerCase().includes(q) ||
    voter.hn.toLowerCase().includes(q) ||
    (voter.sec && voter.sec.toLowerCase().includes(q)) ||
    (phone && phone.includes(q)) ||
    (influencerName && influencerName.toLowerCase().includes(q))
  ) {
    return true;
  }

  // If query is pure digits or starts with common EPIC prefixes, don't phonetic-search
  if (/^\d+$/.test(q) || /^[a-zA-Z]{3}\d+/.test(q)) {
    return false;
  }

  // 2. Phonetic Sound-Alike Match
  const qTokens = extractPhoneticTokens(query);
  if (qTokens.length === 0) return false;

  const vTokens = getVoterPhoneticTokens(voter);

  // Every token in the query should find a matching sound in voter's tokens
  return qTokens.every(qKey => {
    return vTokens.some(vKey => {
      return vKey === qKey || vKey.startsWith(qKey) || qKey.startsWith(vKey);
    });
  });
}
