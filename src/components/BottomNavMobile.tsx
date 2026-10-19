import React from 'react';
import { Users, Home, UserCheck, Trophy, DownloadCloud } from 'lucide-react';
import { TabType } from '../types';
import { Language } from '../utils/i18n';

interface BottomNavMobileProps {
  activeTab: TabType;
  onTabChange: (tab: TabType) => void;
  votersCount: number;
  kriyaCount: number;
  language?: Language;
}

export const BottomNavMobile: React.FC<BottomNavMobileProps> = ({
  activeTab,
  onTabChange,
  votersCount,
  language = 'te'
}) => {
  const tabs = [
    {
      id: 'voters' as TabType,
      label: language === 'te' ? 'ఓటర్లు' : 'Voters',
      icon: Users,
      badge: votersCount > 0 ? votersCount : null
    },
    {
      id: 'families' as TabType,
      label: language === 'te' ? 'కుటుంబాలు' : 'Families',
      icon: Home
    },
    {
      id: 'influencers' as TabType,
      label: language === 'te' ? 'నాయకులు' : 'Leaders',
      icon: UserCheck
    },
    {
      id: 'warroom' as TabType,
      label: language === 'te' ? 'వార్ రూమ్' : 'War Room',
      icon: Trophy
    },
    {
      id: 'offline' as TabType,
      label: language === 'te' ? 'ఆఫ్‌లైన్' : 'Offline',
      icon: DownloadCloud
    }
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 bg-slate-900/98 backdrop-blur-lg border-t border-slate-800 px-2 py-1 shadow-2xl safe-area-bottom">
      <div className="grid grid-cols-5 gap-1 max-w-lg mx-auto">
        {tabs.map(t => {
          const Icon = t.icon;
          const isActive = activeTab === t.id;
          return (
            <button
              key={t.id}
              onClick={() => onTabChange(t.id)}
              className={`flex flex-col items-center justify-center py-1.5 px-0.5 rounded-xl transition-all relative ${
                isActive
                  ? 'text-amber-400 font-extrabold bg-amber-500/10'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <div className="relative">
                <Icon className={`w-5 h-5 ${isActive ? 'text-amber-400 stroke-[2.5]' : 'stroke-2'}`} />
                {t.badge && (
                  <span className="absolute -top-1.5 -right-3.5 px-1 py-0.2 bg-red-600 text-white rounded-full text-[9px] font-mono font-bold leading-tight shadow-sm">
                    {t.badge > 999 ? `${Math.round(t.badge / 1000)}k` : t.badge}
                  </span>
                )}
              </div>
              <span className={`text-[9.5px] mt-0.5 tracking-tight ${isActive ? 'font-black' : 'font-medium'}`}>
                {t.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};
