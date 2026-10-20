import React, { useState } from 'react';
import { DownloadCloud, FileCode, UploadCloud, Lock, Unlock, Check, HardDrive, Smartphone, RefreshCw, KeyRound, ShieldAlert, Palette } from 'lucide-react';
import { BoothData } from '../types';
import { saveCachedBoothData, downloadBoothAsJson, setAdminPin, verifyAdminPin } from '../utils/storage';
import { Language } from '../utils/i18n';
import { ThemeId, THEMES } from '../utils/theme';

interface OfflineTabMobileProps {
  boothData: BoothData;
  isCached: boolean;
  isLocked: boolean;
  language?: Language;
  theme?: ThemeId;
  onSelectTheme?: (theme: ThemeId) => void;
  onRefreshCache: () => void;
  onOpenBoothSelector: () => void;
  onImportCustomJson: (data: BoothData) => void;
}

export const OfflineTabMobile: React.FC<OfflineTabMobileProps> = ({
  boothData,
  isCached,
  isLocked,
  language = 'te',
  theme = 'jsp-dark',
  onSelectTheme,
  onRefreshCache,
  onOpenBoothSelector,
  onImportCustomJson
}) => {
  const { booth_info: info } = boothData;
  const [cacheSuccess, setCacheSuccess] = useState(false);
  const [changePinOpen, setChangePinOpen] = useState(false);
  const [oldPin, setOldPin] = useState('');
  const [newPin, setNewPin] = useState('');
  const [pinMsg, setPinMsg] = useState<{ text: string; error: boolean } | null>(null);

  const handleSaveToDeviceStorage = () => {
    const success = saveCachedBoothData(info.part_no, boothData);
    if (success) {
      setCacheSuccess(true);
      onRefreshCache();
      setTimeout(() => setCacheSuccess(false), 3000);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const parsed = JSON.parse(event.target?.result as string);
        if (parsed.booth_info && parsed.voters) {
          onImportCustomJson(parsed);
          alert(language === 'te' 
            ? `బూత్ #${parsed.booth_info.part_no} (${parsed.voters.length} ఓటర్లు) విజయవంతంగా దిగుమతి అయింది!` 
            : `Successfully imported Booth #${parsed.booth_info.part_no} (${parsed.voters.length} electors)!`);
        } else {
          alert(language === 'te' 
            ? 'చెల్లని బూత్ JSON ఫైల్. booth_info మరియు voters తప్పక ఉండాలి.' 
            : 'Invalid booth JSON format. Must contain booth_info and voters.');
        }
      } catch (err) {
        alert(language === 'te' ? 'JSON ఫైల్ చదవడంలో విఫలమైంది.' : 'Failed to parse JSON file.');
      }
    };
    reader.readAsText(file);
  };

  const handleChangePin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!verifyAdminPin(oldPin)) {
      setPinMsg({ text: language === 'te' ? 'ప్రస్తుత పిన్ తప్పుగా ఉంది.' : 'Current PIN is incorrect.', error: true });
      return;
    }
    if (newPin.trim().length < 4) {
      setPinMsg({ text: language === 'te' ? 'కొత్త పిన్ కనీసం 4 అంకెలు ఉండాలి.' : 'New PIN must be at least 4 digits.', error: true });
      return;
    }
    setAdminPin(newPin.trim());
    setPinMsg({ text: language === 'te' ? 'అడ్మిన్ పిన్ విజయవంతంగా మారింది!' : 'Admin PIN updated successfully!', error: false });
    setOldPin('');
    setNewPin('');
    setTimeout(() => {
      setChangePinOpen(false);
      setPinMsg(null);
    }, 1500);
  };

  return (
    <div className="space-y-4 pb-24 text-xs">
      {/* 1. APP THEMES CARD (FIELD THEMES) */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-3 shadow-md">
        <div className="flex items-center justify-between border-b border-slate-800 pb-2">
          <span className="font-extrabold text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
            <Palette className="w-4 h-4 text-amber-400" />
            {language === 'te' ? 'యాప్ డిస్‌ప్లే థీమ్స్' : 'App Display Themes'}
          </span>
          <span className="text-[10px] text-slate-400 font-mono">
            4 {language === 'te' ? 'మోడ్స్ లభ్యం' : 'Modes'}
          </span>
        </div>

        <p className="text-slate-300 text-[11px] leading-relaxed">
          {language === 'te'
            ? 'ఎండలో గ్రామాల్లో తిరిగేటప్పుడు స్పష్టంగా కనిపించే "డేలైట్ వైట్", రాత్రి ప్రచారానికి "OLED బ్లాక్", లేదా అఫీషియల్ "జనసేన రెడ్" థీమ్‌ను ఎంచుకోండి.'
            : 'Switch to Daylight for bright outdoor sun visibility, OLED Black for battery saving at night, or Official JSP Red.'}
        </p>

        <div className="grid grid-cols-2 gap-2 pt-1">
          {THEMES.map(t => {
            const isSelected = theme === t.id;
            return (
              <button
                key={t.id}
                onClick={() => onSelectTheme && onSelectTheme(t.id)}
                className={`p-2.5 rounded-xl border text-left transition-all relative overflow-hidden flex flex-col justify-between ${
                  isSelected
                    ? 'border-amber-400 bg-amber-500/10 ring-2 ring-amber-400/50 shadow-md'
                    : 'bg-slate-950/70 border-slate-800 hover:border-slate-700'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-base">{t.icon}</span>
                  {isSelected && (
                    <span className="w-4 h-4 rounded-full bg-amber-500 text-slate-950 flex items-center justify-center text-[10px] font-black">
                      ✓
                    </span>
                  )}
                </div>
                <div className="mt-2">
                  <h4 className="text-[11px] font-black text-white truncate">
                    {language === 'te' ? t.nameTe.split('(')[0] : t.nameEn}
                  </h4>
                  <span className="text-[9px] text-slate-400 block mt-0.5 truncate">
                    {t.id === 'daylight' ? (language === 'te' ? 'ఎండలో స్పష్టత' : 'Outdoor Sun') : t.id === 'oled-black' ? (language === 'te' ? 'రాత్రి బ్యాటరీ సేవర్' : 'Night Battery') : t.id === 'alliance-gold' ? (language === 'te' ? 'కూటమి రాయల్' : 'Royal Navy') : (language === 'te' ? 'అఫీషియల్ రెడ్' : 'Official Red')}
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* 2. Offline Status Card */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-3 shadow-md">
        <div className="flex items-center justify-between border-b border-slate-800 pb-2">
          <span className="font-extrabold text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
            <HardDrive className="w-4 h-4 text-amber-400" />
            {language === 'te' ? 'మొబైల్ ఆఫ్‌లైన్ స్టోరేజ్' : 'Mobile Offline Storage'}
          </span>
          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
            isCached 
              ? 'bg-emerald-950/60 text-emerald-400 border-emerald-500/30' 
              : 'bg-slate-800 text-slate-400 border-slate-700'
          }`}
          >
            {isCached ? (language === 'te' ? '✅ ఫోన్‌లో భద్రపరచబడింది' : '✅ Cached on Phone') : (language === 'te' ? '⚠️ ఆన్‌లైన్ మాత్రమే' : '⚠️ Online Only')}
          </span>
        </div>

        <p className="text-slate-300 leading-relaxed text-[11px]">
          {language === 'te'
            ? `బూత్ #${info.part_no} డేటాను మీ మొబైల్‌లో ఆఫ్‌లైన్ కోసం భద్రపరచుకోండి. ఇంటర్నెట్ లేకపోయినా ఓటర్ల శోధన, క్రియా వివరాలు, సర్వే అన్నీ పనిచేస్తాయి!`
            : `Download Booth #${info.part_no} to your mobile device. Once saved, you can search electors, view Kriya members, and do field surveys with zero internet connection!`}
        </p>

        {/* Action 1: Cache in Local Device Storage */}
        <button
          onClick={handleSaveToDeviceStorage}
          className="w-full py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white rounded-xl font-bold flex items-center justify-center gap-2 shadow-md shadow-emerald-950/40 transition-all text-xs"
        >
          {cacheSuccess ? <Check className="w-4 h-4 text-white" /> : <DownloadCloud className="w-4 h-4" />}
          <span>{cacheSuccess ? (language === 'te' ? 'ఫోన్‌లో భద్రపరచబడింది!' : 'Saved to Device!') : (language === 'te' ? 'బూత్‌ను ఫోన్‌లో సేవ్ చేయండి (ఆఫ్‌లైన్ మోడ్)' : 'Save Booth to Phone Storage (Offline Mode)')}</span>
        </button>

        {/* Action 2: Download JSON File to Downloads */}
        <button
          onClick={() => downloadBoothAsJson(boothData)}
          className="w-full py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl font-bold flex items-center justify-center gap-2 border border-slate-700 transition-all text-xs"
        >
          <FileCode className="w-4 h-4 text-amber-400" />
          <span>{language === 'te' ? `బూత్ #${info.part_no} JSON ఫైల్‌గా డౌన్‌లోడ్ చేయండి` : `Download Booth #${info.part_no} as JSON File`}</span>
        </button>

        {/* Action 3: Import JSON File (e.g. from WhatsApp) */}
        <label className="w-full py-2.5 bg-slate-950 hover:bg-slate-800 text-slate-300 rounded-xl font-bold flex items-center justify-center gap-2 border border-slate-800 cursor-pointer transition-all text-xs">
          <UploadCloud className="w-4 h-4 text-blue-400" />
          <span>{language === 'te' ? 'కస్టమ్ బూత్ JSON ఫైల్ దిగుమతి చేసుకోండి' : 'Import Custom Booth JSON File'}</span>
          <input
            type="file"
            accept=".json"
            onChange={handleFileUpload}
            className="hidden"
          />
        </label>
      </div>

      {/* 3. BOOTH ASSIGNMENT & LOCK MANAGEMENT */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-3 shadow-md">
        <div className="flex items-center justify-between border-b border-slate-800 pb-2">
          <span className="font-extrabold text-white uppercase tracking-wider flex items-center gap-1.5">
            {isLocked ? <Lock className="w-4 h-4 text-amber-400" /> : <Unlock className="w-4 h-4 text-slate-400" />}
            {language === 'te' ? 'బూత్ కేటాయింపు & లాక్ నిర్వహణ' : 'Assigned Booth Access Control'}
          </span>
          <span className="text-[10px] font-bold text-amber-400 font-mono">
            {isLocked ? (language === 'te' ? '🔒 లాక్ చేయబడింది' : '🔒 LOCKED') : (language === 'te' ? '🔓 అన్‌లాక్' : '🔓 UNLOCKED')}
          </span>
        </div>

        <p className="text-slate-300 leading-relaxed text-[11px]">
          {language === 'te'
            ? 'ఈ మొబైల్ ఒక నిర్దిష్ట బూత్ కార్యకర్త లేదా వార్డ్ మెంబర్‌కు ఇచ్చేటప్పుడు, వారు పొరపాటున వేరే బూత్ మార్చకుండా అడ్మిన్ పిన్‌తో లాక్ చేయవచ్చు.'
            : 'Lock this device to Booth #' + info.part_no + ' with an Admin PIN so field volunteers cannot accidentally switch booths.'}
        </p>

        <button
          onClick={onOpenBoothSelector}
          className="w-full py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 rounded-xl font-black flex items-center justify-center gap-2 shadow-md transition-all text-xs"
        >
          <span>{isLocked ? (language === 'te' ? 'అడ్మిన్ పిన్‌తో బూత్ అన్‌లాక్ చేయండి' : 'Unlock Booth with Admin PIN') : (language === 'te' ? 'వేరే బూత్‌ను ఎంచుకోండి / కేటాయించండి' : 'Select / Reassign Polling Booth')}</span>
        </button>

        {/* Change Admin PIN Accordion */}
        <div className="pt-2 border-t border-slate-800">
          <button
            onClick={() => setChangePinOpen(!changePinOpen)}
            className="text-amber-400 hover:text-amber-300 text-[11px] font-bold flex items-center gap-1"
          >
            <KeyRound className="w-3.5 h-3.5" />
            <span>{changePinOpen ? (language === 'te' ? 'పిన్ మార్పును మూసివేయండి' : 'Hide PIN Settings') : (language === 'te' ? 'అడ్మిన్ పిన్ మార్చండి (డిఫాల్ట్: 1982)' : 'Change Admin Security PIN (Default: 1982)')}</span>
          </button>
        </div>

        {changePinOpen && (
          <form onSubmit={handleChangePin} className="space-y-2 pt-2 bg-slate-950 p-3 rounded-xl border border-slate-800 animate-in fade-in duration-100">
            <div>
              <label className="text-[10px] text-slate-400 uppercase font-bold block">{language === 'te' ? 'ప్రస్తుత పిన్' : 'Current PIN'}</label>
              <input
                type="password"
                maxLength={6}
                value={oldPin}
                onChange={e => setOldPin(e.target.value)}
                placeholder="Enter current PIN"
                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-1.5 text-white text-xs mt-0.5"
                required
              />
            </div>

            <div>
              <label className="text-[10px] text-slate-400 uppercase font-bold block">{language === 'te' ? 'కొత్త పిన్' : 'New PIN'}</label>
              <input
                type="password"
                maxLength={6}
                value={newPin}
                onChange={e => setNewPin(e.target.value)}
                placeholder="Enter 4-6 digit PIN"
                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-1.5 text-white text-xs mt-0.5"
                required
              />
            </div>

            {pinMsg && (
              <p className={`text-[11px] font-bold ${pinMsg.error ? 'text-red-400' : 'text-emerald-400'}`}>
                {pinMsg.text}
              </p>
            )}

            <button
              type="submit"
              className="w-full py-2 bg-slate-800 hover:bg-slate-700 text-white font-bold rounded-xl text-xs"
            >
              {language === 'te' ? 'అడ్మిన్ పిన్ అప్‌డేట్ చేయండి' : 'Update Admin PIN'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
};
