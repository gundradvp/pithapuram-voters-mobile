import React, { useState } from 'react';
import {
  X,
  Copy,
  CheckCircle2,
  Share2,
  HardDriveDownload,
  UploadCloud,
  FileText,
  AlertCircle,
  Save,
  Sparkles,
  ArrowRightLeft
} from 'lucide-react';
import { Language } from '../utils/i18n';
import {
  generateSyncToken,
  applySyncToken,
  downloadCampaignBackupJson,
  persistProfilesToDisk,
  CampaignSyncBundle
} from '../utils/storage';
import { VoterCampaignProfile } from '../types';

interface SyncBackupModalProps {
  isOpen: boolean;
  partNo: number | string;
  profiles: Record<number, VoterCampaignProfile>;
  language?: Language;
  onClose: () => void;
  onSyncApplied: (bundle: CampaignSyncBundle) => void;
}

export const SyncBackupModal: React.FC<SyncBackupModalProps> = ({
  isOpen,
  partNo,
  profiles,
  language = 'te',
  onClose,
  onSyncApplied
}) => {
  const [pasteCode, setPasteCode] = useState('');
  const [isCopied, setIsCopied] = useState(false);
  const [saveStatus, setSaveStatus] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'token' | 'disk' | 'file'>('token');

  if (!isOpen) return null;

  // Profile statistics
  const markedSnos = Object.keys(profiles);
  const oursCount = markedSnos.filter(s => {
    const p = profiles[Number(s)];
    return p.supportPct === 100 || p.survey_status === 'supporter';
  }).length;
  const votedCount = markedSnos.filter(s => profiles[Number(s)].survey_status === 'voted').length;
  const phonesCount = markedSnos.filter(s => !!profiles[Number(s)].customPhone).length;
  const deceasedCount = markedSnos.filter(s => profiles[Number(s)].survey_status === 'deceased').length;
  const outOfCityCount = markedSnos.filter(s => profiles[Number(s)].survey_status === 'out_of_city').length;

  // 1. Copy Sync Code
  const handleCopySyncCode = () => {
    try {
      const code = generateSyncToken(partNo);
      navigator.clipboard.writeText(code);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 3000);
    } catch (e: any) {
      setErrorMsg(e?.message || 'Failed to copy sync code');
    }
  };

  // 2. Apply Pasted Sync Code
  const handleApplySyncCode = () => {
    if (!pasteCode.trim()) {
      setErrorMsg(language === 'te' ? 'దయచేసి సింక్ కోడ్ పేస్ట్ చేయండి' : 'Please paste sync code');
      return;
    }
    setErrorMsg(null);
    try {
      const bundle = applySyncToken(pasteCode.trim());
      onSyncApplied(bundle);
      setSaveStatus(
        language === 'te'
          ? `🎉 సింక్ పూర్తయింది! ${Object.keys(bundle.profiles).length} మంది ఓటర్ల సమాచారం అప్‌డేట్ అయ్యింది.`
          : `🎉 Sync applied! Updated ${Object.keys(bundle.profiles).length} voters.`
      );
      setPasteCode('');
      setTimeout(() => {
        setSaveStatus(null);
        onClose();
      }, 1500);
    } catch (e: any) {
      setErrorMsg(language === 'te' ? 'చెల్లని సింక్ కోడ్. సరిగ్గా కాపీ చేసి మళ్లీ పేస్ట్ చేయండి.' : e?.message || 'Invalid sync code');
    }
  };

  // 3. Save to Project Disk (Local Dev Server)
  const handleSaveToDisk = async () => {
    setSaveStatus(language === 'te' ? 'ప్రాజెక్ట్ ఫైల్ కు సేవ్ అవుతోంది...' : 'Saving to project disk...');
    setErrorMsg(null);
    try {
      const res = await fetch('/api/save-profiles', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ partNo, profiles })
      });
      if (res.ok) {
        setSaveStatus(
          language === 'te'
            ? `✅ విజయవంతంగా public/profiles/profiles_${partNo}.json కు సేవ్ అయ్యింది! Git push చేస్తే బోల్ట్ లో శాశ్వతంగా కనిపిస్తుంది.`
            : `✅ Saved to public/profiles/profiles_${partNo}.json!`
        );
      } else {
        throw new Error('Vite dev server endpoint not available. Use Sync Code option on Bolt/Cloud.');
      }
    } catch (e: any) {
      setErrorMsg(
        language === 'te'
          ? 'లోకల్ సర్వర్ అందుబాటులో లేదు (మీరు బోల్ట్ క్లౌడ్ లో ఉంటే పైన ఉన్న "సింక్ కోడ్" వాడండి).'
          : e?.message || 'Failed to save to local disk'
      );
      setSaveStatus(null);
    }
  };

  // 4. File Upload (JSON Restore)
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setErrorMsg(null);
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target?.result as string;
        const bundle = applySyncToken(text);
        onSyncApplied(bundle);
        setSaveStatus(
          language === 'te'
            ? `🎉 ఫైల్ రీస్టోర్ అయ్యింది! ${Object.keys(bundle.profiles).length} మంది ఓటర్లు అప్‌డేట్ అయ్యారు.`
            : `🎉 Restored from file! ${Object.keys(bundle.profiles).length} voters updated.`
        );
        setTimeout(() => {
          setSaveStatus(null);
          onClose();
        }, 1500);
      } catch (err: any) {
        setErrorMsg(language === 'te' ? 'చెల్లని బ్యాకప్ ఫైల్ ఫార్మాట్' : 'Invalid backup file format');
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="bg-slate-900 border border-amber-500/40 rounded-3xl max-w-md w-full p-4 space-y-3.5 shadow-2xl overflow-hidden text-slate-200">
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/40">
              <ArrowRightLeft className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-black text-white flex items-center gap-1.5">
                {language === 'te' ? 'లోకల్ ⇄ బోల్ట్ క్లౌడ్ డేటా సింక్' : 'Local ⇄ Bolt Cloud Data Sync'}
              </h3>
              <p className="text-[10px] text-slate-400">
                {language === 'te' ? `బూత్ / వార్డు: #${partNo} సమాచారం బదిలీ` : `Sync marked electors for Unit #${partNo}`}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-slate-800 text-slate-400 hover:text-white"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Live Marked Stats Summary */}
        <div className="bg-slate-950/80 border border-slate-800 rounded-2xl p-2.5 grid grid-cols-5 gap-1 text-center text-[10px]">
          <div className="p-1 rounded-xl bg-slate-900 border border-slate-800">
            <span className="text-slate-400 block font-bold truncate">{language === 'te' ? 'గుర్తించినవి' : 'Marked'}</span>
            <span className="text-white font-mono font-black text-xs">{markedSnos.length}</span>
          </div>
          <div className="p-1 rounded-xl bg-red-950/40 border border-red-500/30">
            <span className="text-red-300 block font-bold truncate">{language === 'te' ? 'మనవాళ్లు' : 'Ours'}</span>
            <span className="text-red-300 font-mono font-black text-xs">{oursCount}</span>
          </div>
          <div className="p-1 rounded-xl bg-emerald-950/40 border border-emerald-500/30">
            <span className="text-emerald-300 block font-bold truncate">{language === 'te' ? 'ఓటేశారు' : 'Voted'}</span>
            <span className="text-emerald-300 font-mono font-black text-xs">{votedCount}</span>
          </div>
          <div className="p-1 rounded-xl bg-indigo-950/40 border border-indigo-500/30">
            <span className="text-indigo-300 block font-bold truncate">{language === 'te' ? 'ఊర్లో లేరు' : 'Away'}</span>
            <span className="text-indigo-300 font-mono font-black text-xs">{outOfCityCount}</span>
          </div>
          <div className="p-1 rounded-xl bg-slate-800 border border-slate-700">
            <span className="text-slate-300 block font-bold truncate">{language === 'te' ? 'మరణించారు' : 'Deceased'}</span>
            <span className="text-slate-200 font-mono font-black text-xs">{deceasedCount}</span>
          </div>
        </div>

        {/* Tab Selector */}
        <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800 text-[11px]">
          <button
            onClick={() => setActiveTab('token')}
            className={`flex-1 py-1 rounded-lg font-bold transition-all flex items-center justify-center gap-1 ${
              activeTab === 'token'
                ? 'bg-amber-500 text-slate-950 font-black shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Sparkles className="w-3 h-3" />
            <span>{language === 'te' ? 'సింక్ కోడ్ (వేగవంతం)' : 'Sync Code'}</span>
          </button>
          <button
            onClick={() => setActiveTab('disk')}
            className={`flex-1 py-1 rounded-lg font-bold transition-all flex items-center justify-center gap-1 ${
              activeTab === 'disk'
                ? 'bg-amber-500 text-slate-950 font-black shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Save className="w-3 h-3" />
            <span>{language === 'te' ? 'ప్రాజెక్ట్ ఫైల్' : 'Project File'}</span>
          </button>
          <button
            onClick={() => setActiveTab('file')}
            className={`flex-1 py-1 rounded-lg font-bold transition-all flex items-center justify-center gap-1 ${
              activeTab === 'file'
                ? 'bg-amber-500 text-slate-950 font-black shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <FileText className="w-3 h-3" />
            <span>{language === 'te' ? 'ఫైల్ బ్యాకప్' : 'JSON File'}</span>
          </button>
        </div>

        {/* Notifications */}
        {saveStatus && (
          <div className="p-2.5 rounded-xl bg-emerald-950/60 border border-emerald-500/50 text-emerald-300 text-xs font-bold animate-in fade-in flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 flex-shrink-0 text-emerald-400" />
            <span>{saveStatus}</span>
          </div>
        )}
        {errorMsg && (
          <div className="p-2.5 rounded-xl bg-red-950/60 border border-red-500/50 text-red-300 text-xs font-bold animate-in fade-in flex items-center gap-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0 text-red-400" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* TAB 1: 1-Click Sync Code (Fastest Transfer between Local & Bolt) */}
        {activeTab === 'token' && (
          <div className="space-y-3 animate-in fade-in">
            {/* Step 1: Copy from Local */}
            <div className="bg-slate-950 p-3 rounded-2xl border border-slate-800 space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-amber-300 flex items-center gap-1">
                  1️⃣ {language === 'te' ? 'లోకల్ నుండి కాపీ చేయండి:' : 'Copy from Localhost:'}
                </span>
                <span className="text-[10px] text-slate-500 font-mono">1-Click Token</span>
              </div>
              <p className="text-[10.5px] text-slate-400 leading-relaxed">
                {language === 'te'
                  ? 'మీ లోకల్ సిస్టమ్‌లో గుర్తించిన మనవాళ్లు, ఓటేశారు, ఫోన్ నంబర్ల సమాచారాన్ని క్లిప్‌బోర్డ్‌కు కాపీ చేస్తుంది.'
                  : 'Copies all marked voters, leanings, and phones from your local browser.'}
              </p>
              <button
                onClick={handleCopySyncCode}
                className="w-full py-2 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black rounded-xl text-xs flex items-center justify-center gap-1.5 shadow-md active:scale-95 transition-all"
              >
                {isCopied ? (
                  <>
                    <CheckCircle2 className="w-4 h-4 text-slate-950" />
                    <span>{language === 'te' ? '✅ కోడ్ కాపీ అయ్యింది!' : '✅ Code Copied to Clipboard!'}</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4 text-slate-950" />
                    <span>{language === 'te' ? '📋 సింక్ కోడ్ కాపీ చేయండి (Copy Sync Code)' : '📋 Copy Sync Code'}</span>
                  </>
                )}
              </button>
            </div>

            {/* Step 2: Paste in Bolt */}
            <div className="bg-slate-950 p-3 rounded-2xl border border-slate-800 space-y-2">
              <span className="font-bold text-amber-300 text-xs flex items-center gap-1">
                2️⃣ {language === 'te' ? 'బోల్ట్ (Bolt) లేదా మొబైల్ లో పేస్ట్ చేయండి:' : 'Paste in Bolt / Cloud / Mobile:'}
              </span>
              <textarea
                value={pasteCode}
                onChange={(e) => setPasteCode(e.target.value)}
                placeholder={language === 'te' ? 'ఇక్కడ సింక్ కోడ్ పేస్ట్ చేసి "సింక్ చేయండి" నొక్కండి...' : 'Paste sync code here and click apply...'}
                rows={2}
                className="w-full p-2 bg-slate-900 border border-slate-700 focus:border-amber-400 rounded-xl text-xs text-white placeholder-slate-500 font-mono focus:outline-none resize-none"
              />
              <button
                onClick={handleApplySyncCode}
                disabled={!pasteCode.trim()}
                className="w-full py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-black rounded-xl text-xs flex items-center justify-center gap-1.5 shadow-md active:scale-95 transition-all"
              >
                <UploadCloud className="w-4 h-4 text-white" />
                <span>{language === 'te' ? '📥 సింక్ వర్తింపజేయి (Apply & Sync)' : '📥 Apply & Sync'}</span>
              </button>
            </div>
          </div>
        )}

        {/* TAB 2: Save to Project Disk (Local Filesystem Persistence) */}
        {activeTab === 'disk' && (
          <div className="space-y-3 bg-slate-950 p-3 rounded-2xl border border-slate-800 animate-in fade-in">
            <span className="font-bold text-amber-300 text-xs flex items-center gap-1">
              💾 {language === 'te' ? 'ప్రాజెక్ట్ ఫైల్ కు శాశ్వతంగా సేవ్ చేయండి:' : 'Save to Project Codebase:'}
            </span>
            <p className="text-[10.5px] text-slate-400 leading-relaxed">
              {language === 'te'
                ? `ఈ ఆప్షన్ ద్వారా ప్రస్తుత బూత్ #${partNo} ఓటర్ల మార్కింగ్స్ నేరుగా మీ కంప్యూటర్‌లోని "public/profiles/profiles_${partNo}.json" ఫైల్‌లో సేవ్ అవుతాయి. ఆ తర్వాత గిట్‌హబ్‌కు పుష్ చేసి బోల్ట్‌లో sync.js రన్ చేస్తే బోల్ట్ క్లౌడ్‌లో కూడా ఈ మార్పులు శాశ్వతంగా కనిపిస్తాయి!`
                : `Saves marked voters directly into your project file "public/profiles/profiles_${partNo}.json". Pushing to git and syncing to Bolt will permanently load these voters!`}
            </p>
            <button
              onClick={handleSaveToDisk}
              className="w-full py-2.5 bg-gradient-to-r from-red-600 to-amber-600 hover:from-red-500 hover:to-amber-500 text-white font-black rounded-xl text-xs flex items-center justify-center gap-2 shadow-lg active:scale-95 transition-all"
            >
              <Save className="w-4 h-4 text-white" />
              <span>{language === 'te' ? '💾 ప్రాజెక్ట్ ఫైల్ కు సేవ్ చేయండి (Save to Disk)' : '💾 Save to Project File'}</span>
            </button>
          </div>
        )}

        {/* TAB 3: File Backup / Restore */}
        {activeTab === 'file' && (
          <div className="space-y-2.5 animate-in fade-in">
            <div className="bg-slate-950 p-3 rounded-2xl border border-slate-800 space-y-2">
              <span className="font-bold text-amber-300 text-xs flex items-center gap-1">
                📤 {language === 'te' ? 'బ్యాకప్ ఫైల్ డౌన్‌లోడ్:' : 'Download Backup File:'}
              </span>
              <p className="text-[10px] text-slate-400">
                {language === 'te'
                  ? 'బూత్ ఓటర్ల మార్కింగ్స్ మరియు డేటా మొత్తం కంప్యూటర్/ఫోన్ లో .json ఫైల్‌గా భద్రపరుచుకోండి.'
                  : 'Download complete campaign data as a .json file.'}
              </p>
              <button
                onClick={() => downloadCampaignBackupJson(partNo)}
                className="w-full py-2 bg-slate-800 hover:bg-slate-700 text-amber-300 font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 border border-slate-700"
              >
                <HardDriveDownload className="w-4 h-4 text-amber-400" />
                <span>{language === 'te' ? 'బ్యాకప్ JSON డౌన్‌లోడ్' : 'Download Backup JSON'}</span>
              </button>
            </div>

            <div className="bg-slate-950 p-3 rounded-2xl border border-slate-800 space-y-2">
              <span className="font-bold text-amber-300 text-xs flex items-center gap-1">
                📥 {language === 'te' ? 'బ్యాకప్ ఫైల్ అప్‌లోడ్ చేసి రీస్టోర్ చేయండి:' : 'Restore from Backup File:'}
              </span>
              <label className="w-full py-2 bg-slate-800 hover:bg-slate-700 text-emerald-300 font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 border border-slate-700 cursor-pointer">
                <UploadCloud className="w-4 h-4 text-emerald-400" />
                <span>{language === 'te' ? 'ఫైల్ ఎంచుకోండి (.json)' : 'Choose JSON File'}</span>
                <input
                  type="file"
                  accept=".json"
                  onChange={handleFileUpload}
                  className="hidden"
                />
              </label>
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="pt-2 border-t border-slate-800 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold rounded-xl"
          >
            {language === 'te' ? 'మూసివేయి' : 'Close'}
          </button>
        </div>
      </div>
    </div>
  );
};
