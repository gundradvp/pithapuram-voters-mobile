export type ThemeId = 
  | 'solar-crm' 
  | 'jsp-light' 
  | 'ocean-light' 
  | 'daylight' 
  | 'jsp-dark' 
  | 'oled-black' 
  | 'alliance-gold';

const THEME_STORAGE_KEY = 'jsp_app_theme_pref';

export interface ThemeConfig {
  id: ThemeId;
  nameTe: string;
  nameEn: string;
  descTe: string;
  descEn: string;
  icon: string;
  isDark: boolean;
  bgPreview: string;
  cardPreview: string;
  accentPreview: string;
  badgePreview: string;
}

export const THEMES: ThemeConfig[] = [
  {
    id: 'solar-crm',
    nameTe: '🌞 తేజో సోలార్ CRM (Tejo Clean)',
    nameEn: '🌞 Tejo Solar CRM Clean',
    descTe: 'తేజో భారత్ CRM తరహా నీట్ వైట్ కార్డ్స్, టీల్ గ్రీన్ & సాఫ్ట్ స్లేట్ లుక్',
    descEn: 'Ultra-clean white cards, teal primary accents & soft slate CRM styling',
    icon: '🌞',
    isDark: false,
    bgPreview: '#f8fafc',
    cardPreview: '#ffffff',
    accentPreview: '#0d9488',
    badgePreview: '#ccfbf1'
  },
  {
    id: 'jsp-light',
    nameTe: '🚩 పిఠాపురం లైట్ (JSP Crisp Light)',
    nameEn: '🚩 JSP Modern White Light',
    descTe: 'స్వచ్ఛమైన తెలుపు కార్డులు, పార్టీ రెడ్ & అంబర్ కాంట్రాస్ట్ హైలైట్స్',
    descEn: 'Crisp white theme with signature JSP red and golden amber highlights',
    icon: '🚩',
    isDark: false,
    bgPreview: '#f8fafc',
    cardPreview: '#ffffff',
    accentPreview: '#dc2626',
    badgePreview: '#fee2e2'
  },
  {
    id: 'ocean-light',
    nameTe: '🌊 ఓషన్ స్లేట్ (Ocean Slate Light)',
    nameEn: '🌊 Ocean Slate Light',
    descTe: 'కార్పొరేట్ బ్లూ & స్లేట్-50 కంటికి హాయిగా ఉండే ప్రొఫెషనల్ లైట్ మోడ్',
    descEn: 'Eye-friendly corporate blue & cool slate professional light theme',
    icon: '🌊',
    isDark: false,
    bgPreview: '#f0f4f8',
    cardPreview: '#ffffff',
    accentPreview: '#1e40af',
    badgePreview: '#dbeafe'
  },
  {
    id: 'daylight',
    nameTe: '☀️ ఎండలో స్పష్టత (Daylight Sun Mode)',
    nameEn: '☀️ High-Contrast Daylight',
    descTe: 'పగటిపూట గ్రామాల్లో ఎండలో తిరిగేటప్పుడు స్పష్టంగా కనిపించే వైట్ థీమ్',
    descEn: 'High-contrast bright white theme for outdoor village field work under sunlight',
    icon: '☀️',
    isDark: false,
    bgPreview: '#f1f5f9',
    cardPreview: '#ffffff',
    accentPreview: '#b91c1c',
    badgePreview: '#ffedd5'
  },
  {
    id: 'jsp-dark',
    nameTe: '🚩 జనసేన సిగ్నేచర్ డార్క్ (JSP Dark)',
    nameEn: '🚩 JSP Signature Dark',
    descTe: 'అఫీషియల్ పార్టీ కలర్స్ — డార్క్ స్లేట్, ఫ్లేమ్ రెడ్ & అంబర్ గ్లాస్',
    descEn: 'Official party colors — Charcoal slate, flame red & amber glass',
    icon: '🔥',
    isDark: true,
    bgPreview: '#020617',
    cardPreview: '#0f172a',
    accentPreview: '#ef4444',
    badgePreview: '#f59e0b'
  },
  {
    id: 'oled-black',
    nameTe: '🌙 రాత్రి సర్వే (OLED Pure Black)',
    nameEn: '🌙 OLED Pure Black',
    descTe: 'రాత్రి ప్రచారంలో బ్యాటరీని గరిష్టంగా ఆదా చేసే ప్యూర్ బ్లాక్ మోడ్',
    descEn: 'Pure pitch black to save maximum mobile battery on night surveys',
    icon: '🌙',
    isDark: true,
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
    isDark: true,
    bgPreview: '#050d1a',
    cardPreview: '#0c1a2e',
    accentPreview: '#fbbf24',
    badgePreview: '#10b981'
  }
];

export function getSavedTheme(): ThemeId {
  const saved = localStorage.getItem(THEME_STORAGE_KEY) as ThemeId | null;
  if (saved && THEMES.some(t => t.id === saved)) {
    return saved;
  }
  return 'solar-crm'; // Default to solar-crm or jsp-dark
}

export function setSavedTheme(theme: ThemeId): void {
  localStorage.setItem(THEME_STORAGE_KEY, theme);
  applyThemeToDom(theme);
}

export function applyThemeToDom(theme: ThemeId): void {
  const root = document.documentElement;
  root.setAttribute('data-theme', theme);
  const config = THEMES.find(t => t.id === theme);
  if (config && !config.isDark) {
    root.classList.remove('dark');
    root.setAttribute('data-theme-mode', 'light');
  } else {
    root.classList.add('dark');
    root.setAttribute('data-theme-mode', 'dark');
  }
}
