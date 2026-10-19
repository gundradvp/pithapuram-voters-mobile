import React, { useState } from 'react';
import { DownloadCloud, FileCode, UploadCloud, Lock, Unlock, Check, HardDrive, Smartphone, RefreshCw, KeyRound, ShieldAlert } from 'lucide-react';
import { BoothData } from '../types';
import { saveCachedBoothData, downloadBoothAsJson, setAdminPin, verifyAdminPin } from '../utils/storage';

interface OfflineTabMobileProps {
  boothData: BoothData;
  isCached: boolean;
  isLocked: boolean;
  onRefreshCache: () => void;
  onOpenBoothSelector: () => void;
  onImportCustomJson: (data: BoothData) => void;
}

export const OfflineTabMobile: React.FC<OfflineTabMobileProps> = ({
  boothData,
  isCached,
  isLocked,
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
          alert(`Successfully imported Booth #${parsed.booth_info.part_no} (${parsed.voters.length} electors)!`);
        } else {
          alert('Invalid booth JSON format. Must contain booth_info and voters.');
        }
      } catch (err) {
        alert('Failed to parse JSON file.');
      }
    };
    reader.readAsText(file);
  };

  const handleChangePin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!verifyAdminPin(oldPin)) {
      setPinMsg({ text: 'Current PIN is incorrect.', error: true });
      return;
    }
    if (newPin.trim().length < 4) {
      setPinMsg({ text: 'New PIN must be at least 4 digits.', error: true });
      return;
    }
    setAdminPin(newPin.trim());
    setPinMsg({ text: 'Admin PIN updated successfully!', error: false });
    setOldPin('');
    setNewPin('');
    setTimeout(() => {
      setChangePinOpen(false);
      setPinMsg(null);
    }, 1500);
  };

  return (
    <div className="space-y-4 pb-24 text-xs">
      {/* Offline Status Card */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-3 shadow-md">
        <div className="flex items-center justify-between border-b border-slate-800 pb-2">
          <span className="font-extrabold text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
            <HardDrive className="w-4 h-4 text-amber-400" />
            Mobile Offline Storage
          </span>
          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
            isCached 
              ? 'bg-emerald-950/60 text-emerald-400 border-emerald-500/30' 
              : 'bg-slate-800 text-slate-400 border-slate-700'
          }`}>
            {isCached ? '✅ Cached on Phone' : '⚠️ Online Only'}
          </span>
        </div>

        <p className="text-slate-300 leading-relaxed text-[11px]">
          Download Booth #{info.part_no} to your mobile device. Once saved, you can search electors, view Kriya members, and do field surveys with zero internet connection!
        </p>

        {/* Action 1: Cache in Local Device Storage */}
        <button
          onClick={handleSaveToDeviceStorage}
          className="w-full py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white rounded-xl font-bold flex items-center justify-center gap-2 shadow-md shadow-emerald-950/40 transition-all text-xs"
        >
          {cacheSuccess ? <Check className="w-4 h-4 text-white" /> : <DownloadCloud className="w-4 h-4" />}
          <span>{cacheSuccess ? 'Saved to Device!' : 'Save Booth to Phone Storage (Offline Mode)'}</span>
        </button>

        {/* Action 2: Download JSON File to Downloads */}
        <button
          onClick={() => downloadBoothAsJson(boothData)}
          className="w-full py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl font-bold flex items-center justify-center gap-2 border border-slate-700 transition-all text-xs"
        >
          <FileCode className="w-4 h-4 text-amber-400" />
          <span>Download Booth #{info.part_no} as JSON File</span>
        </button>

        {/* Action 3: Import JSON File (e.g. from WhatsApp) */}
        <label className="w-full py-2.5 bg-slate-950 hover:bg-slate-800 text-slate-300 rounded-xl font-bold flex items-center justify-center gap-2 border border-slate-800 cursor-pointer transition-all text-xs">
          <UploadCloud className="w-4 h-4 text-blue-400" />
          <span>Import Custom Booth JSON File</span>
          <input
            type="file"
            accept=".json"
            onChange={handleFileUpload}
            className="hidden"
          />
        </label>
      </div>

      {/* BOOTH ASSIGNMENT & LOCK MANAGEMENT */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-3 shadow-md">
        <div className="flex items-center justify-between border-b border-slate-800 pb-2">
          <span className="font-extrabold text-white uppercase tracking-wider flex items-center gap-1.5">
            {isLocked ? <Lock className="w-4 h-4 text-amber-400" /> : <Unlock className="w-4 h-4 text-slate-400" />}
            Assigned Booth Access Control
          </span>
          <span className="text-[10px] font-bold text-amber-400 font-mono">
            Part #{info.part_no}
          </span>
        </div>

        <div className="space-y-1.5 text-slate-300 text-[11px]">
          <div>📍 <strong>Village:</strong> {info.clean_village} ({info.mandal} Mandal)</div>
          <div>👥 <strong>Registered Electors:</strong> {info.total_voters.toLocaleString()} Voters</div>
          <div>🚩 <strong>Kriya Footprint:</strong> {info.total_kriya_count} Members ({info.kriya_percentage}%)</div>
          <div>
            🔒 <strong>Status:</strong> {isLocked ? (
              <span className="text-amber-400 font-bold">Locked (Only this booth is visible)</span>
            ) : (
              <span className="text-slate-400 font-medium">Unlocked (Can switch booths)</span>
            )}
          </div>
        </div>

        <button
          onClick={onOpenBoothSelector}
          className="w-full py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black rounded-xl flex items-center justify-center gap-2 transition-all shadow-md text-xs"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Switch or Re-assign Polling Booth</span>
        </button>
      </div>

      {/* ADMIN PIN SETTINGS */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-3">
        <div className="flex items-center justify-between">
          <span className="font-bold text-slate-300 flex items-center gap-1.5">
            <KeyRound className="w-4 h-4 text-amber-400" />
            Admin Security PIN
          </span>
          <button
            onClick={() => setChangePinOpen(!changePinOpen)}
            className="text-amber-400 hover:underline font-bold text-[11px]"
          >
            {changePinOpen ? 'Cancel' : 'Change PIN'}
          </button>
        </div>

        <p className="text-[11px] text-slate-400">
          Default Admin PIN is <strong>1982</strong>. This PIN prevents field volunteers from accidentally browsing or modifying other booths.
        </p>

        {changePinOpen && (
          <form onSubmit={handleChangePin} className="space-y-2 pt-2 border-t border-slate-800">
            <div>
              <label className="text-[10px] text-slate-400 uppercase font-bold block">Current PIN</label>
              <input
                type="password"
                maxLength={6}
                value={oldPin}
                onChange={e => setOldPin(e.target.value)}
                placeholder="Current PIN (e.g. 1982)"
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-1.5 text-white text-xs mt-0.5"
                required
              />
            </div>
            <div>
              <label className="text-[10px] text-slate-400 uppercase font-bold block">New PIN</label>
              <input
                type="password"
                maxLength={6}
                value={newPin}
                onChange={e => setNewPin(e.target.value)}
                placeholder="Enter 4-6 digit PIN"
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-1.5 text-white text-xs mt-0.5"
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
              Update Admin PIN
            </button>
          </form>
        )}
      </div>
    </div>
  );
};
