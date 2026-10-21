import React from 'react';
import { X, Check, Palette, Sun, Moon, Sparkles, Shield } from 'lucide-react';
import { THEMES, ThemeId, ThemeConfig } from '../utils/theme';
import { Language } from '../utils/i18n';

interface ThemeSelectorModalProps {
  currentTheme: ThemeId;
  language: Language;
  onSelectTheme: (theme: ThemeId) => void;
  onClose: () => void;
}

export const ThemeSelectorModal: React.FC<ThemeSelectorModalProps> = ({
  currentTheme,
  language,
  onSelectTheme,
  onClose
}) => {
  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-end sm:items-center justify-center p-3 animate-in fade-in duration-150">
      <div className="bg-slate-900 border border-amber-500/40 rounded-3xl max-w-md w-full p-5 space-y-4 shadow-2xl relative max-h-[90vh] overflow-y-auto">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-white bg-slate-800 p-1.5 rounded-full"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Modal Header */}
        <div className="border-b border-slate-800 pb-3">
          <div className="flex items-center gap-1.5 text-xs text-amber-400 font-bold uppercase tracking-wider">
            <Palette className="w-3.5 h-3.5 text-amber-400" />
            {language === 'te' ? 'ఫీల్డ్ & CRM థీమ్స్' : 'Field & CRM Themes'}
          </div>
          <h3 className="text-base font-black text-white mt-0.5">
            {language === 'te' ? 'యాప్ థీమ్ ఎంచుకోండి' : 'Choose App Theme'}
          </h3>
          <p className="text-[11px] text-slate-400 mt-0.5">
            {language === 'te' 
              ? 'తేజో సోలార్ CRM తరహా క్లీన్ వైట్, పగటిపూట ఎండలో స్పష్టత, లేదా పార్టీ రంగులను ఎంచుకోండి.' 
              : 'Choose Tejo Solar CRM clean light, high-contrast sunlight mode, or party colors.'}
          </p>
        </div>

        {/* Theme Cards List */}
        <div className="space-y-2.5">
          {THEMES.map(theme => {
            const isSelected = currentTheme === theme.id;
            return (
              <div
                key={theme.id}
                onClick={() => onSelectTheme(theme.id)}
                className={`p-3 rounded-2xl border transition-all cursor-pointer relative overflow-hidden flex items-center justify-between ${
                  isSelected
                    ? 'border-amber-400 bg-amber-500/10 ring-2 ring-amber-400/50 shadow-md'
                    : 'bg-slate-950/70 border-slate-800 hover:border-slate-700'
                }`}
              >
                <div className="flex items-start gap-3 min-w-0 flex-1">
                  {/* Theme Color Preview Swatch */}
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center text-lg flex-shrink-0 shadow-inner border"
                    style={{
                      backgroundColor: theme.bgPreview,
                      borderColor: theme.accentPreview
                    }}
                  >
                    <span>{theme.icon}</span>
                  </div>

                  {/* Theme Info */}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <h4 className="text-xs font-black text-white truncate">
                        {language === 'te' ? theme.nameTe : theme.nameEn}
                      </h4>
                      {isSelected && (
                        <span className="px-1.5 py-0.2 bg-amber-500 text-slate-950 rounded text-[9px] font-black uppercase">
                          {language === 'te' ? 'యాక్టివ్' : 'Active'}
                        </span>
                      )}
                      {!theme.isDark && (
                        <span className="px-1 py-0.2 bg-teal-500/20 text-teal-300 border border-teal-500/30 rounded text-[8px] font-bold">
                          LIGHT
                        </span>
                      )}
                    </div>
                    <p className="text-[10px] text-slate-400 mt-0.5 leading-snug">
                      {language === 'te' ? theme.descTe : theme.descEn}
                    </p>

                    {/* Mini Color Dots */}
                    <div className="flex items-center gap-1 mt-1.5">
                      <span className="w-3 h-3 rounded-full border border-white/20" style={{ backgroundColor: theme.bgPreview }} title="Background" />
                      <span className="w-3 h-3 rounded-full border border-white/20" style={{ backgroundColor: theme.cardPreview }} title="Cards" />
                      <span className="w-3 h-3 rounded-full border border-white/20" style={{ backgroundColor: theme.accentPreview }} title="Accent" />
                      <span className="w-3 h-3 rounded-full border border-white/20" style={{ backgroundColor: theme.badgePreview }} title="Badge" />
                    </div>
                  </div>
                </div>

                {/* Selected Radio Indicator */}
                <div className="ml-2 flex-shrink-0">
                  <div
                    className={`w-5 h-5 rounded-full flex items-center justify-center border transition-all ${
                      isSelected
                        ? 'bg-amber-500 border-amber-400 text-slate-950'
                        : 'border-slate-700 bg-slate-900'
                    }`}
                  >
                    {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Action Button */}
        <button
          onClick={onClose}
          className="w-full py-2.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black rounded-xl text-xs flex items-center justify-center gap-1.5 shadow-md shadow-amber-950/40"
        >
          <Check className="w-4 h-4" />
          <span>{language === 'te' ? 'పూర్తయింది (Done)' : 'Done'}</span>
        </button>
      </div>
    </div>
  );
};
