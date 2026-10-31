import React from 'react';
import { Lock, Unlock, Wifi, WifiOff, Languages, Palette, LogOut, Crown, UserCheck, RefreshCw, ArrowRightLeft } from 'lucide-react';
import { BoothInfo } from '../types';
import { Language } from '../utils/i18n';
import { ThemeId, THEMES } from '../utils/theme';
import { UserSession } from '../utils/auth';

interface HeaderMobileProps {
  boothInfo: BoothInfo | null;
  isLocked: boolean;
  isCached: boolean;
  language: Language;
  theme: ThemeId;
  session: UserSession | null;
  isRefreshing?: boolean;
  onRefreshData?: () => void;
  onOpenSyncModal?: () => void;
  onToggleLanguage: () => void;
  onOpenThemeSelector: () => void;
  onOpenBoothSelector: () => void;
  onOpenAdminHub?: () => void;
  onLogout: () => void;
}

export const HeaderMobile: React.FC<HeaderMobileProps> = ({
  boothInfo,
  isLocked,
  isCached,
  language,
  theme,
  session,
  isRefreshing,
  onRefreshData,
  onOpenSyncModal,
  onToggleLanguage,
  onOpenThemeSelector,
  onOpenBoothSelector,
  onOpenAdminHub,
  onLogout
}) => {
  const currentThemeConfig = THEMES.find(t => t.id === theme) || THEMES[0];

  return (
    <header className="sticky top-0 z-40 bg-slate-900/95 backdrop-blur-md border-b border-slate-800 px-3 py-2 shadow-lg flex items-center justify-between">
      {/* Left: Emblem, Title & Part # */}
      <div className="flex items-center gap-2 min-w-0">
        <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-red-600 via-amber-600 to-red-600 flex items-center justify-center text-white font-black text-sm shadow-md shadow-red-900/40 flex-shrink-0 border border-amber-400/30">
          🚩
        </div>
        <div className="min-w-0">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-[10px] uppercase font-bold text-amber-400 tracking-wider">
              {language === 'te' ? 'జనసేన పిఠాపురం' : 'JSP Pithapuram'}
            </span>
            <span className={`text-[9px] px-1.5 py-0.2 rounded font-mono font-bold ${
              boothInfo?.election_type === 'municipal'
                ? 'bg-blue-900/60 text-blue-300 border border-blue-500/40'
                : boothInfo?.election_type === 'panchayat'
                  ? 'bg-emerald-900/60 text-emerald-300 border border-emerald-500/40'
                  : 'bg-slate-800 text-slate-400'
            }`}>
              {boothInfo?.election_type === 'municipal' 
                ? (language === 'te' ? '🏛️ మునిసిపల్ వార్డు' : '🏛️ Municipal Ward')
                : boothInfo?.election_type === 'panchayat'
                  ? (language === 'te' ? '🏡 పంచాయతీ వార్డు' : '🏡 GP Ward')
                  : 'AC #37'}
            </span>
            {session?.role === 'admin' && (
              <span className="px-1.5 py-0.2 rounded bg-red-600 text-white text-[9px] font-black uppercase tracking-wider animate-pulse flex items-center gap-0.5">
                <Crown className="w-2.5 h-2.5" /> ADMIN
              </span>
            )}
          </div>
          <h1 className="text-xs font-black text-white truncate leading-tight">
            {boothInfo ? (
              boothInfo.election_type === 'municipal'
                ? `${language === 'te' ? 'వార్డు' : 'Ward'} #${boothInfo.ward_no || 14}: ${boothInfo.clean_village}`
                : `${language === 'te' ? 'బూత్' : 'Booth'} #${boothInfo.part_no}: ${boothInfo.clean_village}`
            ) : (language === 'te' ? 'బూత్ / వార్డు ఎంచుకోండి' : 'Select Assigned Unit')}
          </h1>
        </div>
      </div>

      {/* Right: Actions */}
      <div className="flex items-center gap-1 flex-shrink-0">
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

        {/* Cloud & Bolt Sync Modal Button */}
        {onOpenSyncModal && (
          <button
            onClick={onOpenSyncModal}
            className="flex items-center gap-1 px-1.5 py-1 rounded-lg text-[10px] font-bold border transition-all bg-gradient-to-r from-red-600/30 to-amber-600/30 text-amber-300 border-amber-500/50 hover:bg-amber-500/30 active:scale-95 shadow-sm"
            title={language === 'te' ? 'లోకల్ & బోల్ట్ క్లౌడ్ డేటా సింక్ (Sync Data between Local & Bolt)' : 'Sync Data between Local & Bolt'}
          >
            <ArrowRightLeft className="w-3.5 h-3.5 text-amber-400" />
            <span className="hidden xs:inline">{language === 'te' ? 'సింక్' : 'Sync'}</span>
          </button>
        )}

        {/* Theme Switcher Button */}
        <button
          onClick={onOpenThemeSelector}
          className="flex items-center gap-0.5 px-1.5 py-1 rounded-lg text-[10px] font-black border transition-all bg-slate-800/80 text-amber-300 border-slate-700 hover:border-amber-400/60 active:scale-95 shadow-sm"
          title={language === 'te' ? 'యాప్ థీమ్ మార్చండి (తేజో సోలార్ CRM / లైట్ / డార్క్)' : 'Change Theme (Tejo Solar CRM / Light / Dark)'}
        >
          <Palette className="w-3.5 h-3.5 text-amber-400" />
          <span className="text-[10px]">{currentThemeConfig.icon}</span>
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
                : `#${boothInfo?.part_no || ''}`}
          </span>
        </button>

        {/* Logout Button */}
        <button
          onClick={onLogout}
          className="p-1 rounded-lg text-slate-400 hover:text-red-400 hover:bg-slate-800/80 transition-all"
          title={language === 'te' ? `లాగౌట్ (${session?.phone || ''})` : `Logout (${session?.phone || ''})`}
        >
          <LogOut className="w-3.5 h-3.5" />
        </button>
      </div>
    </header>
  );
};
