import { safeStorage } from './safeStorage';

export type UserRole = 'admin' | 'volunteer' | 'demo';

export interface UserSession {
  role: UserRole;
  phone: string;
  name: string;
  loginTime: number;
}

export function setDemoSession(): UserSession {
  const session: UserSession = {
    role: 'demo',
    phone: '9999999999',
    name: 'డెమో యూజర్ (Demo Mode)',
    loginTime: Date.now()
  };
  setUserSession(session);
  return session;
}

export interface VolunteerAssignment {
  id: string;
  phone: string; // 10 digits e.g. "9000273028"
  name: string; // e.g. "Durga Prasad"
  assemblyBooths: number[]; // e.g. [11, 12, 13]
  municipalWards: string[]; // e.g. ["ward_14", "gollaprolu_ward_11"]
  notes?: string;
  assignedAt: string;
  expiryMinutes?: number; // duration in minutes e.g. 15, 30, 60, 120 (0 or undefined = no expiry)
  expiresAt?: number; // epoch timestamp in ms: when Date.now() > expiresAt, list is unloaded
}

const SESSION_STORAGE_KEY = 'jsp_user_session';
const ASSIGNMENTS_STORAGE_KEY = 'jsp_volunteer_assignments';
const ADMIN_PASSWORD_HASH = '1555'; // Static admin password requested by user

// Pre-seeded initial assignments based on user's requirements
export const DEFAULT_ASSIGNMENTS: VolunteerAssignment[] = [
  {
    id: 'assign_9000273028',
    phone: '9000273028',
    name: 'దుర్గా ప్రసాద్ (Durga Prasad)',
    assemblyBooths: [11, 12, 13],
    municipalWards: ['ward_14', 'gollaprolu_ward_11', 'gp_durgada', 'gp_vannepudi', 'mptc_durgada_1', 'mptc_durgada_1_b45', 'mptc_durgada_1_b46', 'mptc_durgada_1_b47', 'mptc_durgada_3', 'mptc_chebrolu_4', 'mptc_tatiparthy_2'],
    notes: 'పిఠాపురం అసెంబ్లీ & స్థానిక ఎన్నికల కోఆర్డినేటర్',
    assignedAt: new Date().toISOString()
  },
  {
    id: 'assign_9479797947',
    phone: '9479797947',
    name: 'గొల్లప్రోలు ఇంచార్జ్ (Gollaprolu Incharge)',
    assemblyBooths: [],
    municipalWards: ['gollaprolu_ward_11'],
    notes: 'గొల్లప్రోలు నగర పంచాయతీ 11వ వార్డు',
    assignedAt: new Date().toISOString()
  }
];

export function cleanPhoneNumber(input: string): string {
  const digits = input.replace(/\D/g, '');
  if (digits.length >= 10) {
    return digits.slice(-10);
  }
  return digits;
}

export function getAssignments(): VolunteerAssignment[] {
  try {
    const raw = safeStorage.getItem(ASSIGNMENTS_STORAGE_KEY);
    if (!raw) {
      safeStorage.setItem(ASSIGNMENTS_STORAGE_KEY, JSON.stringify(DEFAULT_ASSIGNMENTS));
      return DEFAULT_ASSIGNMENTS;
    }
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed) || parsed.length === 0) {
      safeStorage.setItem(ASSIGNMENTS_STORAGE_KEY, JSON.stringify(DEFAULT_ASSIGNMENTS));
      return DEFAULT_ASSIGNMENTS;
    }
    // Auto-migrate: ensure Durga Prasad (9000273028) has all active loaded units (Durgada, Chebrolu & Vannepudi)
    const dp = parsed.find((a: VolunteerAssignment) => cleanPhoneNumber(a.phone) === '9000273028');
    if (dp) {
      let changed = false;
      const requiredWards = ['gp_durgada', 'gp_vannepudi', 'mptc_durgada_1', 'mptc_durgada_1_b45', 'mptc_durgada_1_b46', 'mptc_durgada_1_b47', 'mptc_durgada_3', 'mptc_chebrolu_4', 'mptc_tatiparthy_2'];
      for (const w of requiredWards) {
        if (!dp.municipalWards.includes(w)) {
          dp.municipalWards.push(w);
          changed = true;
        }
      }
      if (changed) {
        safeStorage.setItem(ASSIGNMENTS_STORAGE_KEY, JSON.stringify(parsed));
      }
    }
    return parsed;
  } catch (err) {
    console.error('Failed to load volunteer assignments:', err);
    return DEFAULT_ASSIGNMENTS;
  }
}

export function saveAssignment(assignment: VolunteerAssignment): void {
  const current = getAssignments();
  const cleanP = cleanPhoneNumber(assignment.phone);
  const index = current.findIndex(a => a.id === assignment.id || cleanPhoneNumber(a.phone) === cleanP);
  if (index >= 0) {
    current[index] = assignment;
  } else {
    current.push(assignment);
  }
  safeStorage.setItem(ASSIGNMENTS_STORAGE_KEY, JSON.stringify(current));
  persistAssignmentsToDisk(current).catch(() => {});
}

export function deleteAssignment(idOrPhone: string): void {
  const current = getAssignments();
  const cleanP = cleanPhoneNumber(idOrPhone);
  const filtered = current.filter(a => a.id !== idOrPhone && cleanPhoneNumber(a.phone) !== cleanP);
  safeStorage.setItem(ASSIGNMENTS_STORAGE_KEY, JSON.stringify(filtered));
  persistAssignmentsToDisk(filtered).catch(() => {});
}

/**
 * Persist assignments directly to public/assignments.json via Vite dev server API
 * Ensures other devices on the LAN or synced via Git get all assigned phone numbers!
 */
export async function persistAssignmentsToDisk(assignments: VolunteerAssignment[]): Promise<boolean> {
  try {
    const res = await fetch('/api/save-assignments', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ assignments })
    });
    return res.ok;
  } catch (err) {
    console.warn('Could not persist assignments to server disk:', err);
    return false;
  }
}

/**
 * Fetch fresh assignments from public/assignments.json (dev server or cloud)
 * and merge with local storage.
 * Critical for multi-device sync (e.g. PC to mobile or Bolt).
 */
export async function fetchFreshAssignments(): Promise<VolunteerAssignment[]> {
  const ts = Date.now();
  const urls = [
    `/assignments.json?v=${ts}`,
    `https://raw.githubusercontent.com/gundradvp/pithapuram-voters-mobile/main/public/assignments.json?v=${ts}`,
    `https://cdn.jsdelivr.net/gh/gundradvp/pithapuram-voters-mobile@main/public/assignments.json`
  ];

  for (const url of urls) {
    try {
      const res = await fetch(url, {
        cache: 'no-store',
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache'
        }
      });
      if (res.ok) {
        const diskList: VolunteerAssignment[] = await res.json();
        if (Array.isArray(diskList) && diskList.length > 0) {
          const localList = getAssignments();
          const map = new Map<string, VolunteerAssignment>();
          // Disk takes priority, but keep any unpersisted local entries as well
          localList.forEach(a => map.set(cleanPhoneNumber(a.phone), a));
          diskList.forEach(a => map.set(cleanPhoneNumber(a.phone), a));
          const merged = Array.from(map.values());
          safeStorage.setItem(ASSIGNMENTS_STORAGE_KEY, JSON.stringify(merged));
          return merged;
        }
      }
    } catch {
      // try next url
    }
  }
  return getAssignments();
}

export function getVolunteerAssignment(phone: string): VolunteerAssignment | null {
  const clean = cleanPhoneNumber(phone);
  const list = getAssignments();
  return list.find(a => cleanPhoneNumber(a.phone) === clean) || null;
}

export function isAssignmentExpired(assignment: VolunteerAssignment | null | undefined): boolean {
  if (!assignment) return false;
  if (!assignment.expiresAt) return false;
  return Date.now() > assignment.expiresAt;
}

export function getRemainingTime(assignment: VolunteerAssignment | null | undefined): {
  isExpired: boolean;
  hasTimer: boolean;
  minutes: number;
  seconds: number;
  formatted: string;
} {
  if (!assignment || !assignment.expiresAt) {
    return { isExpired: false, hasTimer: false, minutes: 999999, seconds: 0, formatted: 'అపరిమితం (No Expiry)' };
  }
  const diffMs = assignment.expiresAt - Date.now();
  if (diffMs <= 0) {
    return { isExpired: true, hasTimer: true, minutes: 0, seconds: 0, formatted: '0ని. 0సె. (సమయం ముగిసింది / Expired)' };
  }
  const totalSeconds = Math.floor(diffMs / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return {
    isExpired: false,
    hasTimer: true,
    minutes,
    seconds,
    formatted: `${minutes}ని. ${seconds < 10 ? '0' : ''}${seconds}సె.`
  };
}

export function extendAssignmentTime(idOrPhone: string, additionalMinutes: number): VolunteerAssignment | null {
  const current = getAssignments();
  const cleanP = cleanPhoneNumber(idOrPhone);
  const target = current.find(a => a.id === idOrPhone || cleanPhoneNumber(a.phone) === cleanP);
  if (!target) return null;
  
  const baseTime = (target.expiresAt && target.expiresAt > Date.now()) ? target.expiresAt : Date.now();
  target.expiresAt = baseTime + additionalMinutes * 60 * 1000;
  target.expiryMinutes = (target.expiryMinutes || 0) + additionalMinutes;
  
  saveAssignment(target);
  return target;
}

export function getUserSession(): UserSession | null {
  try {
    const raw = safeStorage.getItem(SESSION_STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function setUserSession(session: UserSession | null): void {
  if (!session) {
    safeStorage.removeItem(SESSION_STORAGE_KEY);
  } else {
    safeStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(session));
  }
}

export function logoutUser(): void {
  safeStorage.removeItem(SESSION_STORAGE_KEY);
}

export function verifyAdminPassword(input: string): boolean {
  if (!input) return false;
  return input.trim() === ADMIN_PASSWORD_HASH;
}

/**
 * Generate Telugu + English professional WhatsApp assignment dispatch message
 */
export function generateAssignmentWhatsAppMessage(
  assignment: VolunteerAssignment,
  assemblyBoothLabels?: Record<number, string>,
  localWardLabels?: Record<string, string>,
  appUrl?: string
): string {
  const currentUrl = appUrl || window.location.origin;
  
  const assemblyList = assignment.assemblyBooths.length > 0
    ? assignment.assemblyBooths.map(b => {
        const desc = assemblyBoothLabels && assemblyBoothLabels[b] ? ` (${assemblyBoothLabels[b]})` : '';
        return `• బూత్ నెం: ${b}${desc}`;
      }).join('\n')
    : '• కేటాయించలేదు';

  const municipalList = assignment.municipalWards.length > 0
    ? assignment.municipalWards.map(w => {
        const desc = localWardLabels && localWardLabels[w] ? ` (${localWardLabels[w]})` : '';
        if (w === 'ward_14') return `• పిఠాపురం పురపాలక సంఘం - 14వ వార్డు (1,256 ఓటర్లు)${desc}`;
        if (w === 'gollaprolu_ward_11') return `• గొల్లప్రోలు నగర పంచాయతీ - 11వ వార్డు (991 ఓటర్లు)${desc}`;
        if (w === 'mptc_durgada_1') return `• దుర్గడ MPTC-1 (వార్డులు 1-5 - 2,650 ఓటర్లు)${desc}`;
        if (w === 'mptc_durgada_1_b45') return `• దుర్గడ MPTC-1 - బూత్ #45 (ఇంటి కాసుల వారి స్కూల్ - 1,060 ఓటర్లు)${desc}`;
        if (w === 'mptc_durgada_1_b46') return `• దుర్గడ MPTC-1 - బూత్ #46 (స్వర్ణ గ్రామం, వేగులమ్మ గుడి - 1,060 ఓటర్లు)${desc}`;
        if (w === 'mptc_durgada_1_b47') return `• దుర్గడ MPTC-1 - బూత్ #47 (EBC కాలనీ - 530 ఓటర్లు)${desc}`;
        if (w === 'mptc_durgada_3') return `• దుర్గడ MPTC-3 (డోర్ నెం. 4-9 - 1,874 ఓటర్లు)${desc}`;
        if (w === 'gp_durgada') return `• దుర్గడ సమగ్ర గ్రామ పంచాయతీ (Durgada GP - 4,524 ఓటర్లు)${desc}`;
        if (w === 'gp_vannepudi') return `• వన్నెపూడి గ్రామ పంచాయతీ (Vannepudi GP - 3,201 ఓటర్లు)${desc}`;
        if (w === 'mptc_chebrolu_4') return `• చేబ్రోలు MPTC-4 (వార్డులు 13-16 - 2,979 ఓటర్లు)${desc}`;
        if (w === 'mptc_tatiparthy_2') return `• తాటిపర్తి MPTC-2 (వార్డులు 8-14 - 3,501 ఓటర్లు)${desc}`;
        return `• స్థానిక వార్డు/పంచాయతీ: ${w}${desc}`;
      }).join('\n')
    : '• కేటాయించలేదు';

  const timerText = assignment.expiryMinutes && assignment.expiryMinutes > 0
    ? `\n⏱️ *జాబితా కాలపరిమితి (Timer to Access):* ${assignment.expiryMinutes} నిమిషాలు\n(ఈ సమయం ముగియగానే ఓటర్ల జాబితా మొబైల్ స్క్రీన్ నుండి ఆటోమేటిక్‌గా అన్‌లోడ్ అవుతుంది)\n`
    : '';

  return `🗳️ *పిఠాపురం నియోజకవర్గం (AC #37)*
*ఎన్నికల బూత్ ఇంచార్జ్ / సమన్వయకర్త బాధ్యతల కేటాయింపు*

నమస్తే *${assignment.name}* గారు,
పిఠాపురం నియోజకవర్గ సమగ్ర ఓటర్ల సమన్వయం కొరకు మీకు క్రింది బూతులు / వార్డుల బాధ్యతలు కేటాయించబడ్డాయి:

🏛️ *అసెంబ్లీ బూతులు (Assembly Booths):*
${assemblyList}

🏢 *స్థానిక / మున్సిపాలిటీ వార్డులు (Local Wards):*
${municipalList}
${timerText}
📲 *మొబైల్ యాప్‌లో లాగిన్ విధానం:*
1. క్రింది లింక్ ద్వారా మొబైల్ యాప్ ఓపెన్ చేయండి.
2. మీ నమోదిత మొబైల్ నంబర్ *${assignment.phone}* ఎంటర్ చేసి లాగిన్ అవ్వండి.
3. మీకు కేటాయించిన బూతులు/వార్డుల ఓటర్ల లిస్ట్ మాత్రమే మీకు ప్రత్యక్షంగా కనిపిస్తుంది.
4. "ఓటర్ల జాబితా లోడ్ చేయండి" పై క్లిక్ చేయగానే లిస్ట్ ఓపెన్ అవుతుంది.

🔗 *యాప్ లింక్ (App Link):*
${currentUrl}

_ప్రజాస్వామ్యాన్ని బలపరుద్దాం! ప్రతి ఓటూ అమూల్యం._ 🗳️`;
}

export function getWhatsAppShareUrl(phone: string, text: string): string {
  const cleanPhone = cleanPhoneNumber(phone);
  const fullPhone = cleanPhone.startsWith('91') ? cleanPhone : `91${cleanPhone}`;
  return `https://wa.me/${fullPhone}?text=${encodeURIComponent(text)}`;
}
