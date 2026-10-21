export type UserRole = 'admin' | 'volunteer';

export interface UserSession {
  role: UserRole;
  phone: string;
  name: string;
  loginTime: number;
}

export interface VolunteerAssignment {
  id: string;
  phone: string; // 10 digits e.g. "9000273028"
  name: string; // e.g. "Durga Prasad"
  assemblyBooths: number[]; // e.g. [11, 12, 13]
  municipalWards: string[]; // e.g. ["ward_14", "gollaprolu_ward_11"]
  notes?: string;
  assignedAt: string;
}

const SESSION_STORAGE_KEY = 'jsp_user_session';
const ASSIGNMENTS_STORAGE_KEY = 'jsp_volunteer_assignments';
const ADMIN_PASSWORD_HASH = '1562'; // Static admin password requested by user

// Pre-seeded initial assignments based on user's requirements
export const DEFAULT_ASSIGNMENTS: VolunteerAssignment[] = [
  {
    id: 'assign_9000273028',
    phone: '9000273028',
    name: 'దుర్గా ప్రసాద్ (Durga Prasad)',
    assemblyBooths: [11, 12, 13],
    municipalWards: ['ward_14', 'gollaprolu_ward_11'],
    notes: 'పిఠాపురం అసెంబ్లీ & మునిసిపాలిటీ ఇంచార్జ్',
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
    const raw = localStorage.getItem(ASSIGNMENTS_STORAGE_KEY);
    if (!raw) {
      localStorage.setItem(ASSIGNMENTS_STORAGE_KEY, JSON.stringify(DEFAULT_ASSIGNMENTS));
      return DEFAULT_ASSIGNMENTS;
    }
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed) || parsed.length === 0) {
      localStorage.setItem(ASSIGNMENTS_STORAGE_KEY, JSON.stringify(DEFAULT_ASSIGNMENTS));
      return DEFAULT_ASSIGNMENTS;
    }
    return parsed;
  } catch (err) {
    console.error('Failed to load volunteer assignments:', err);
    return DEFAULT_ASSIGNMENTS;
  }
}

export function saveAssignment(assignment: VolunteerAssignment): void {
  const current = getAssignments();
  const index = current.findIndex(a => a.id === assignment.id || a.phone === assignment.phone);
  if (index >= 0) {
    current[index] = assignment;
  } else {
    current.push(assignment);
  }
  localStorage.setItem(ASSIGNMENTS_STORAGE_KEY, JSON.stringify(current));
}

export function deleteAssignment(idOrPhone: string): void {
  const current = getAssignments();
  const filtered = current.filter(a => a.id !== idOrPhone && a.phone !== idOrPhone);
  localStorage.setItem(ASSIGNMENTS_STORAGE_KEY, JSON.stringify(filtered));
}

export function getVolunteerAssignment(phone: string): VolunteerAssignment | null {
  const clean = cleanPhoneNumber(phone);
  const list = getAssignments();
  return list.find(a => cleanPhoneNumber(a.phone) === clean) || null;
}

export function getUserSession(): UserSession | null {
  try {
    const raw = localStorage.getItem(SESSION_STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function setUserSession(session: UserSession | null): void {
  if (!session) {
    localStorage.removeItem(SESSION_STORAGE_KEY);
  } else {
    localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(session));
  }
}

export function logoutUser(): void {
  localStorage.removeItem(SESSION_STORAGE_KEY);
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
        if (w === 'ward_14') return `• పిఠాపురం పురపాలక సంఘం - 14వ వార్డు${desc}`;
        if (w === 'gollaprolu_ward_11') return `• గొల్లప్రోలు నగర పంచాయతీ - 11వ వార్డు${desc}`;
        return `• స్థానిక వార్డు: ${w}${desc}`;
      }).join('\n')
    : '• కేటాయించలేదు';

  return `🚩 *జనసేన పార్టీ - పిఠాపురం నియోజకవర్గం*
*వాలంటీర్ / బూత్ ఇంచార్జ్ బాధ్యతల కేటాయింపు*

నమస్తే *${assignment.name}* గారు,
పిఠాపురం నియోజకవర్గ సమగ్ర ఓటర్ల ప్రచారం కొరకు మీకు క్రింది బూతులు / వార్డుల బాధ్యతలు కేటాయించబడ్డాయి:

🏛️ *అసెంబ్లీ బూతులు (Assembly Booths):*
${assemblyList}

🏢 *స్థానిక / మున్సిపాలిటీ వార్డులు (Local Wards):*
${municipalList}

📲 *మొబైల్ యాప్‌లో లాగిన్ విధానం:*
1. క్రింది లింక్ ద్వారా మొబైల్ యాప్ ఓపెన్ చేయండి.
2. మీ నమోదిత మొబైల్ నంబర్ *${assignment.phone}* ఎంటర్ చేసి లాగిన్ అవ్వండి.
3. మీకు కేటాయించిన బూతులు/వార్డుల ఓటర్ల లిస్ట్ మాత్రమే మీకు ప్రత్యక్షంగా కనిపిస్తుంది.

🔗 *యాప్ లింక్ (App Link):*
${currentUrl}

_జై హింద్! జై జనసేన!_`;
}

export function getWhatsAppShareUrl(phone: string, text: string): string {
  const cleanPhone = cleanPhoneNumber(phone);
  const fullPhone = cleanPhone.startsWith('91') ? cleanPhone : `91${cleanPhone}`;
  return `https://wa.me/${fullPhone}?text=${encodeURIComponent(text)}`;
}
