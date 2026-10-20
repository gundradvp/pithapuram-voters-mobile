export type ThemeId = 'jsp-dark' | 'daylight' | 'oled-black' | 'alliance-gold';

const THEME_STORAGE_KEY = 'jsp_app_theme_pref';

export interface ThemeConfig {
  id: ThemeId;
  nameTe: string;
  nameEn: string;
  descTe: string;
  descEn: string;
  icon: string;
  bgPreview: string;
  cardPreview: string;
  accentPreview: string;
  badgePreview: string;
}

export const THEMES: ThemeConfig[] = [
  {
    id: 'jsp-dark',
    nameTe: '🚩 జనసేన రెడ్ (JSP Red Dark)',
    nameEn: '🚩 JSP Signature Dark',
    descTe: 'అఫీషియల్ పార్టీ కలర్స్ — డార్క్ స్లేట్, ఫ్లేమ్ రెడ్ & అంబర్ గ్లాస్',
    descEn: 'Official party colors — Charcoal slate, flame red & amber glass',
    icon: '🚩',
    bgPreview: '#020617',
    cardPreview: '#0f172a',
    accentPreview: '#ef4444',
    badgePreview: '#f59e0b'
  },
  {
    id: 'daylight',
    nameTe: '☀️ ఎండలో స్పష్టత (Daylight Sun Mode)',
    nameEn: '☀️ High-Contrast Daylight',
    descTe: 'పగటిపూట గ్రామాల్లో తిరిగేటప్పుడు స్పష్టంగా కనిపించే వైట్ థీమ్',
    descEn: 'Bright white, high-contrast theme for outdoor field surveys under sunlight',
    icon: '☀️',
    bgPreview: '#f1f5f9',
    cardPreview: '#ffffff',
    accentPreview: '#dc2626',
    badgePreview: '#d97706'
  },
  {
    id: 'oled-black',
    nameTe: '🌙 రాత్రి సర్వే (OLED Pure Black)',
    nameEn: '🌙 OLED Pure Black',
    descTe: 'రాత్రి ప్రచారంలో బ్యాటరీని గరిష్టంగా ఆదా చేసే ప్యూర్ బ్లాక్ మోడ్',
    descEn: 'Pure pitch black to save maximum mobile battery on night surveys',
    icon: '🌙',
    bgPreview: '#000000',
    cardPreview: '#0a0a0a',
    accentPreview: '#ff3344',
    badgePreview: '#fbbf24'
  },
  {
    id: 'alliance-gold',
    nameTe: '🏆 కూటమి గోల్డ్ (Alliance Royal Navy)',
    nameEn: '🏆 Alliance Victory Gold',
    descTe: 'రాయల్ నేవీ బ్లూ & గోల్డెన్ విక్టరీ కలర్స్ (కూటమి ప్రత్యేక థీమ్)',
    descEn: 'Royal navy blue & golden victory accents (NDA Alliance theme)',
    icon: '🏆',
    bgPreview: '#050d1a',
    cardPreview: '#0c1a2e',
    accentPreview: '#fbbf24',
    badgePreview: '#10b981'
  }
];

export function getSavedTheme(): ThemeId {
  const saved = localStorage.getItem(THEME_STORAGE_KEY) as ThemeId | null;
  if (saved && (saved === 'jsp-dark' || saved === 'daylight' || saved === 'oled-black' || saved === 'alliance-gold')) {
    return saved;
  }
  return 'jsp-dark';
}

export function setSavedTheme(theme: ThemeId): void {
  localStorage.setItem(THEME_STORAGE_KEY, theme);
  applyThemeToDom(theme);
}

export function applyThemeToDom(theme: ThemeId): void {
  const root = document.documentElement;
  root.setAttribute('data-theme', theme);
  if (theme === 'daylight') {
    root.classList.remove('dark');
  } else {
    root.classList.add('dark');
  }
}
