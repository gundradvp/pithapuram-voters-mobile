import React from 'react';
import { Lock, Unlock, Wifi, WifiOff, Languages, Palette, LogOut, Crown, UserCheck, RefreshCw, ArrowRightLeft, ChevronDown, Clock, Monitor, Smartphone, Users, Home, Trophy, DownloadCloud, MapPin } from 'lucide-react';
import { BoothInfo, TabType } from '../types';
import { Language } from '../utils/i18n';
import { ThemeId, THEMES } from '../utils/theme';
import { UserSession } from '../utils/auth';
import { SyncState } from '../utils/supabaseSync';

interface HeaderMobileProps {
  boothInfo: BoothInfo | null;
  isLocked: boolean;
  isCached: boolean;
  language: Language;
  theme: ThemeId;
  session: UserSession | null;
  remainingTime?: { isExpired: boolean; hasTimer: boolean; formatted: string; minutes: number };
  isRefreshing?: boolean;
  cloudSyncState?: SyncState;
  layoutMode?: 'mobile' | 'desktop';
  onToggleLayoutMode?: () => void;
  activeTab?: TabType;
  onTabChange?: (tab: TabType) => void;
  votersCount?: number;
  kriyaCount?: number;
  onRefreshData?: () => void;
  onOpenSyncModal?: () => void;
  onToggleLanguage: () => void;
  onOpenThemeSelector: () => void;
  onOpenBoothSelector: () => void;
  onOpenBoothDirectory?: () => void;
  onOpenAdminHub?: () => void;
  onLogout: () => void;
  onUnload?: () => void;
  onSwitchToFullVillage?: () => void;
}

export const HeaderMobile: React.FC<HeaderMobileProps> = ({
  boothInfo,
  isLocked,
  isCached,
  language,
  theme,
  session,
  remainingTime,
  isRefreshing,
  cloudSyncState = 'idle',
  layoutMode = 'mobile',
  onToggleLayoutMode,
  activeTab,
  onTabChange,
  votersCount = 0,
  kriyaCount = 0,
  onRefreshData,
  onOpenSyncModal,
  onToggleLanguage,
  onOpenThemeSelector,
  onOpenBoothSelector,
  onOpenBoothDirectory,
  onOpenAdminHub,
  onLogout,
  onUnload,
  onSwitchToFullVillage
}) => {
  const currentThemeConfig = THEMES.find(t => t.id === theme) || THEMES[0];

  // Normalize booth and ward identifiers safely to prevent any "undefined: undefined" glitches
  const rawPart = boothInfo?.part_no ?? (boothInfo as any)?.booth_no ?? '';
  const partStr = String(rawPart);
  const isWard = partStr.includes('_w') || boothInfo?.election_type === 'municipal' || boothInfo?.type === 'ward';
  const wardNo = boothInfo?.ward_no || (partStr.match(/_w(\d+)/i)?.[1] || '');

  let cleanVillage = boothInfo?.clean_village || boothInfo?.village || '';
  if (!cleanVillage) {
    if (partStr.includes('durgada')) cleanVillage = 'దుర్గడ';
    else if (partStr.includes('tatiparthy')) cleanVillage = 'తాటిపర్తి';
    else if (partStr.includes('vannepudi')) cleanVillage = 'వన్నెపూడి';
  }

  // Determine parent village name for quick switch if currently on an individual ward
  let parentVillageLabel = '';
  if (isWard) {
    if (partStr.includes('durgada')) parentVillageLabel = language === 'te' ? 'దుర్గడ (8,487 ఓటర్లు)' : 'Durgada GP (8,487)';
    else if (partStr.includes('tatiparthy')) parentVillageLabel = language === 'te' ? 'తాటిపర్తి (6,994 ఓటర్లు)' : 'Tatiparthy GP (6,994)';
    else if (partStr.includes('vannepudi')) parentVillageLabel = language === 'te' ? 'వన్నెపూడి (3,201 ఓటర్లు)' : 'Vannepudi GP (3,201)';
  }

  return (
    <header className="sticky top-0 z-40 bg-slate-900/95 backdrop-blur-md border-b border-slate-800 px-3 py-2 shadow-lg flex flex-col">
      <div className="flex items-center justify-between w-full">
        {/* Left: Emblem, Title & Part # (Clickable Instant Booth/Ward Switcher) */}
      <button
        type="button"
        onClick={onOpenBoothSelector}
        className="flex items-center gap-2 min-w-0 text-left p-1 -ml-1 rounded-xl hover:bg-slate-800/80 active:scale-98 transition-all cursor-pointer group"
        title={language === 'te' ? 'బూత్ లేదా వార్డును మార్చుకోవడానికి ట్యాప్ చేయండి' : 'Tap to switch Booth or Ward'}
      >
        <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-indigo-600 via-blue-600 to-amber-500 flex items-center justify-center text-white font-black text-sm shadow-md shadow-indigo-950/40 flex-shrink-0 border border-amber-400/40 group-hover:scale-105 transition-transform">
          🗳️
        </div>
        <div className="min-w-0">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-[10px] uppercase font-bold text-amber-400 tracking-wider">
              {language === 'te' ? 'పిఠాపురం ఓటర్ పోర్టల్' : 'Pithapuram Voter Portal'}
            </span>
            <span className={`text-[9px] px-1.5 py-0.2 rounded font-mono font-bold ${
              boothInfo?.election_type === 'municipal'
                ? 'bg-blue-900/60 text-blue-300 border border-blue-500/40'
                : boothInfo?.election_type === 'panchayat'
                  ? 'bg-emerald-900/60 text-emerald-300 border border-emerald-500/40'
                  : 'bg-slate-800 text-slate-400'
            }`}>
              {boothInfo?.election_type === 'municipal' 
                ? (language === 'te' ? '🏛️ వార్డు' : '🏛️ Ward')
                : boothInfo?.election_type === 'panchayat'
                  ? (language === 'te' ? '🏡 పంచాయతీ' : '🏡 GP')
                  : 'AC #37'}
            </span>
            {session?.role === 'admin' && (
              <span className="px-1.5 py-0.2 rounded bg-red-600 text-white text-[9px] font-black uppercase tracking-wider animate-pulse flex items-center gap-0.5">
                <Crown className="w-2.5 h-2.5" /> ADMIN
              </span>
            )}
            {session?.role === 'demo' && (
              <span className="px-1.5 py-0.2 rounded bg-amber-500 text-slate-950 text-[9px] font-black uppercase tracking-wider flex items-center gap-0.5 shadow-sm">
                🎮 DEMO
              </span>
            )}
            {session?.role === 'admin' && remainingTime?.hasTimer && (
              <span
                className="px-1.5 py-0.2 rounded text-[9px] font-mono font-bold flex items-center gap-1 border bg-slate-800 border-slate-700 text-amber-400"
                title={`[Admin Only] మిగిలిన సమయం: ${remainingTime.formatted}`}
              >
                <Clock className="w-2.5 h-2.5" />
                <span>{remainingTime.formatted}</span>
              </span>
            )}
          </div>
          <div className="flex items-center gap-1">
            <h1 className="text-xs font-black text-white truncate leading-tight group-hover:text-amber-300 transition-colors">
              {boothInfo ? (
                boothInfo.type === 'village' || boothInfo.view_level === 'village' || (partStr.startsWith('gp_') && !partStr.includes('_w'))
                  ? `🏡 ${cleanVillage}`
                  : isWard
                    ? `🏛️ ${language === 'te' ? 'వార్డు' : 'Ward'} #${wardNo || ''}: ${cleanVillage}`
                    : `${language === 'te' ? 'బూత్' : 'Booth'} #${partStr || ''}: ${cleanVillage}`
              ) : (language === 'te' ? 'బూత్ / వార్డు ఎంచుకోండి' : 'Select Assigned Unit')}
            </h1>
            <ChevronDown className="w-3 h-3 text-slate-400 group-hover:text-amber-400 shrink-0 transition-transform group-hover:translate-y-0.5" />
          </div>
        </div>
      </button>

      {/* Right: Actions */}
      <div className="flex items-center gap-1 flex-shrink-0">
        {/* Quick 1-click Switch to Full Village (STRICTLY ADMIN ONLY when viewing a single ward) */}
        {session?.role === 'admin' && isWard && onSwitchToFullVillage && (
          <button
            type="button"
            onClick={onSwitchToFullVillage}
            className="flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-black bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white shadow-md active:scale-95 transition-all cursor-pointer border border-emerald-400/50"
            title={language === 'te' ? 'పూర్తి గ్రామ పంచాయతీ ఓటర్ల జాబితాకు మారండి' : 'Switch to Full Gram Panchayat Voter List'}
          >
            <span>🏡</span>
            <span className="hidden xs:inline">{language === 'te' ? 'పూర్తి గ్రామం:' : 'Full GP:'}</span>
            <span className="font-bold underline">{parentVillageLabel || (language === 'te' ? 'పూర్తి గ్రామం' : 'Full GP')}</span>
          </button>
        )}

        {/* Polling Booth Directory & GPS Navigation Button */}
        {onOpenBoothDirectory && (
          <button
            type="button"
            onClick={onOpenBoothDirectory}
            className="flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-bold bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 transition-all shadow-sm active:scale-95 cursor-pointer"
            title={language === 'te' ? 'పోలింగ్ కేంద్రాల డైరెక్టరీ & GPS నావిగేషన్' : 'Polling Booth Directory & GPS Navigation'}
          >
            <MapPin className="w-3 h-3 text-amber-400" />
            <span className="hidden xs:inline">{language === 'te' ? 'కేంద్రాలు' : 'Booths'}</span>
          </button>
        )}

        {/* Admin Hub Shortcut (Only visible to Admin) */}
        {session?.role === 'admin' && onOpenAdminHub && (
          <button
            onClick={onOpenAdminHub}
            className="flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-black bg-gradient-to-r from-red-600 to-amber-600 hover:from-red-500 hover:to-amber-500 text-white shadow-sm active:scale-95 transition-all"
            title="Admin Assignment & WhatsApp Messaging Portal"
          >
            <Crown className="w-3 h-3" />
            <span className="hidden xs:inline">కేటాయింపులు</span>
          </button>
        )}

                {/* Unload Booth Button */}
        {onUnload && boothInfo && (
          <button
            type="button"
            onClick={onUnload}
            className="flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-bold bg-slate-800/80 hover:bg-rose-950/80 text-rose-300 hover:text-rose-200 border border-slate-700 hover:border-rose-500/50 transition-all shadow-sm active:scale-95 cursor-pointer"
            title={language === 'te' ? 'ఓటర్ల జాబితాను అన్‌లోడ్ చేయండి' : 'Unload Current Voter List'}
          >
            <LogOut className="w-3 h-3 text-rose-400" />
            <span className="hidden sm:inline font-bold">{language === 'te' ? 'అన్‌లోడ్' : 'Unload'}</span>
          </button>
        )}

        {/* Live Auto-Refresh Button */}
        {onRefreshData && (
          <button
            onClick={onRefreshData}
            disabled={isRefreshing}
            className={`flex items-center gap-1 px-1.5 py-1 rounded-lg text-[10px] font-bold border transition-all ${
              isRefreshing
                ? 'bg-amber-500/20 text-amber-300 border-amber-500/50 animate-pulse'
                : 'bg-slate-800/80 text-slate-300 hover:text-white border-slate-700 hover:border-amber-400/50 active:scale-95 shadow-sm'
            }`}
            title={language === 'te' ? 'తాజా సమాచారం ఆటో-రిఫ్రెష్ (Live Refresh)' : 'Auto-Refresh Latest Data'}
          >
            <RefreshCw className={`w-3.5 h-3.5 text-amber-400 ${isRefreshing ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">
              {isRefreshing ? (language === 'te' ? 'రిఫ్రెష్...' : 'Sync...') : (language === 'te' ? 'రిఫ్రెష్' : 'Refresh')}
            </span>
          </button>
        )}

        {/* Supabase Cloud Live Auto-Sync Pill */}
        {onOpenSyncModal && (
          <button
            onClick={onOpenSyncModal}
            className={`flex items-center gap-1.5 px-2 py-1 rounded-lg text-[10px] font-black border transition-all shadow-sm ${
              cloudSyncState === 'syncing'
                ? 'bg-amber-500/20 text-amber-300 border-amber-500/60 animate-pulse'
                : cloudSyncState === 'error'
                  ? 'bg-red-500/20 text-red-300 border-red-500/60'
                  : 'bg-emerald-950/80 text-emerald-300 border-emerald-500/50 hover:bg-emerald-900/90 active:scale-95'
            }`}
            title={language === 'te' ? 'Supabase క్లౌడ్ ఆటో-సింక్ (Realtime Auto-Sync across all devices)' : 'Supabase Cloud Realtime Auto-Sync'}
          >
            <span
              className={`w-2 h-2 rounded-full ${
                cloudSyncState === 'syncing'
                  ? 'bg-amber-400 animate-ping'
                  : 'bg-emerald-400 animate-pulse'
              }`}
            />
            <span className="font-extrabold whitespace-nowrap">
              {cloudSyncState === 'syncing' 
                ? (language === 'te' ? 'సింక్...' : 'Syncing...') 
                : (language === 'te' ? 'ఆటో-సింక్' : 'Auto-Sync')}
            </span>
          </button>
        )}

        {/* Theme Switcher Button */}
        <button
          onClick={onOpenThemeSelector}
          className={`flex items-center gap-1.5 px-2 py-1 rounded-lg text-[10px] font-black border transition-all active:scale-95 shadow-sm cursor-pointer ${
            theme === 'solar-crm'
              ? 'bg-amber-100 text-amber-900 border-amber-300 ring-1 ring-amber-400/50'
              : 'bg-slate-800/80 text-amber-300 border-slate-700 hover:border-amber-400/60'
          }`}
          title={language === 'te' ? 'యాప్ థీమ్ మార్చండి (తేజో సోలార్ CRM / లైట్ / డార్క్)' : 'Change Theme (Tejo Solar CRM / Light / Dark)'}
        >
          <Palette className="w-3.5 h-3.5 text-amber-500" />
          <span>{currentThemeConfig.icon}</span>
          <span className="hidden sm:inline font-bold">
            {theme === 'solar-crm' 
              ? (language === 'te' ? 'తేజో CRM' : 'Solar CRM')
              : (language === 'te' ? 'థీమ్' : 'Theme')}
          </span>
        </button>

        {/* Language Switcher Pill */}
        <button
          onClick={onToggleLanguage}
          className="flex items-center gap-1 px-1.5 py-1 rounded-lg text-[10px] font-black border transition-all bg-gradient-to-r from-red-950/60 to-amber-950/60 text-amber-300 border-amber-500/50 hover:bg-amber-500/20 active:scale-95 shadow-sm"
          title={language === 'te' ? 'Switch to English' : 'తెలుగులోకి మార్చండి'}
        >
          <Languages className="w-3.5 h-3.5 text-amber-400" />
          <span className="tracking-tight hidden xs:inline">{language === 'te' ? 'తెలుగు' : 'En'}</span>
        </button>

        {/* Booth Lock / Unlock Button */}
        <button
          onClick={onOpenBoothSelector}
          className={`flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] font-bold transition-all shadow-sm ${
            isLocked
              ? 'bg-slate-800 hover:bg-slate-700 text-amber-300 border border-amber-500/40'
              : 'bg-amber-500 hover:bg-amber-400 text-slate-950 font-black'
          }`}
          title={isLocked ? 'Tap to switch booth/ward' : 'Tap to assign/switch booth'}
        >
          {isLocked ? <Lock className="w-3 h-3 text-amber-400" /> : <Unlock className="w-3 h-3" />}
          <span>
            {boothInfo?.part_no === 'ward_14'
              ? (language === 'te' ? 'వార్డు 14' : 'W-14')
              : boothInfo?.part_no === 'gollaprolu_ward_11'
                ? (language === 'te' ? 'వార్డు 11' : 'W-11')
                : isWard && wardNo
                  ? `#W${wardNo}`
                  : partStr.startsWith('gp_')
                    ? 'GP'
                    : `#${partStr || ''}`}
          </span>
        </button>

        {/* Desktop / Mobile Mode Toggle (Shown on tablets and desktops) */}
        {onToggleLayoutMode && (
          <button
            onClick={onToggleLayoutMode}
            className={`hidden md:flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-black border transition-all shadow-sm ${
              layoutMode === 'desktop'
                ? 'bg-gradient-to-r from-blue-700 to-indigo-700 text-white border-blue-400 shadow-blue-950/50'
                : 'bg-slate-800 text-slate-300 hover:text-white border-slate-700'
            }`}
            title={layoutMode === 'desktop' ? 'మొబైల్ మోడ్‌కు మారండి (Switch to Mobile Mode)' : 'డెస్క్‌టాప్ మోడ్‌కు మారండి (Switch to Desktop Mode)'}
          >
            {layoutMode === 'desktop' ? (
              <>
                <Monitor className="w-3.5 h-3.5 text-blue-300" />
                <span className="whitespace-nowrap">💻 డెస్క్‌టాప్</span>
              </>
            ) : (
              <>
                <Smartphone className="w-3.5 h-3.5 text-amber-400" />
                <span className="whitespace-nowrap">📱 మొబైల్</span>
              </>
            )}
          </button>
        )}

        {/* Logout Button */}
        <button
          onClick={onLogout}
          className="p-1 rounded-lg text-slate-400 hover:text-red-400 hover:bg-slate-800/80 transition-all"
          title={language === 'te' ? `లాగౌట్ (${session?.phone || ''})` : `Logout (${session?.phone || ''})`}
        >
          <LogOut className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>

      {/* Desktop Tabs Header Navigation Bar (Visible in Desktop Mode on md+ screens) */}
      {layoutMode === 'desktop' && onTabChange && (
        <div className="hidden md:flex items-center justify-between border-t border-slate-800/80 bg-slate-950/90 px-3 py-1.5 -mx-3 -mb-2 mt-2 w-[calc(100%+1.5rem)]">
          <div className="flex items-center gap-2">
            <button
              onClick={() => onTabChange('voters')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                activeTab === 'voters'
                  ? 'bg-amber-500 text-slate-950 font-black shadow-md shadow-amber-950/40'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800/70'
              }`}
            >
              <Users className="w-3.5 h-3.5" />
              <span>{language === 'te' ? 'ఓటర్లు' : 'Voters'}</span>
              {votersCount > 0 && (
                <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono font-bold ${
                  activeTab === 'voters' ? 'bg-slate-950 text-amber-300' : 'bg-slate-800 text-slate-300'
                }`}>
                  {votersCount.toLocaleString()}
                </span>
              )}
            </button>

            <button
              onClick={() => onTabChange('families')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                activeTab === 'families'
                  ? 'bg-amber-500 text-slate-950 font-black shadow-md shadow-amber-950/40'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800/70'
              }`}
            >
              <Home className="w-3.5 h-3.5" />
              <span>{language === 'te' ? 'కుటుంబాలు (ఇళ్ళు)' : 'Families'}</span>
            </button>

            <button
              onClick={() => onTabChange('influencers')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                activeTab === 'influencers'
                  ? 'bg-amber-500 text-slate-950 font-black shadow-md shadow-amber-950/40'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800/70'
              }`}
            >
              <UserCheck className="w-3.5 h-3.5" />
              <span>{language === 'te' ? 'నాయకులు' : 'Leaders'}</span>
            </button>

            <button
              onClick={() => onTabChange('warroom')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                activeTab === 'warroom'
                  ? 'bg-amber-500 text-slate-950 font-black shadow-md shadow-amber-950/40'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800/70'
              }`}
            >
              <Trophy className="w-3.5 h-3.5" />
              <span>{language === 'te' ? 'వార్ రూమ్' : 'War Room'}</span>
            </button>

            <button
              onClick={() => onTabChange('offline')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                activeTab === 'offline'
                  ? 'bg-amber-500 text-slate-950 font-black shadow-md shadow-amber-950/40'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800/70'
              }`}
            >
              <DownloadCloud className="w-3.5 h-3.5" />
              <span>{language === 'te' ? 'ఆఫ్‌లైన్ & టూల్స్' : 'Offline & Tools'}</span>
            </button>
          </div>

          <div className="flex items-center gap-3 text-xs font-mono text-slate-400 pr-2">
            <span>ఓటర్లు: <strong className="text-white">{votersCount.toLocaleString()}</strong></span>
            {kriyaCount > 0 && <span>క్రియాశీల: <strong className="text-amber-400">{kriyaCount.toLocaleString()}</strong></span>}
          </div>
        </div>
      )}
    </header>
  );
};
