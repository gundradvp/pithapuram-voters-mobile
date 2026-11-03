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
  ArrowRightLeft,
  RefreshCw
} from 'lucide-react';
import { Language } from '../utils/i18n';
import {
  generateSyncToken,
  applySyncToken,
  downloadCampaignBackupJson,
  persistProfilesToDisk,
  savePreloadedProfiles,
  fetchFreshProfiles,
  CampaignSyncBundle
} from '../utils/storage';
import { pullBoothFromSupabase, pushBoothToSupabaseImmediate } from '../utils/supabaseSync';
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
  const [isCloudSyncing, setIsCloudSyncing] = useState(false);
  const [saveStatus, setSaveStatus] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'cloud' | 'token' | 'disk' | 'file'>('cloud');

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

  // 1.1 Share Sync Code via WhatsApp
  const handleShareSyncCodeWhatsApp = () => {
    try {
      const code = generateSyncToken(partNo);
      const msg = `🚩 *జనసేన పార్టీ - పిఠాపురం నియోజకవర్గం*\n*బూత్ #${partNo} కేటాయించిన ఓటర్ల సింక్ కోడ్*\n\nఈ కోడ్‌ను కాపీ చేసి మీ యాప్‌లో 'సింక్ (Sync)' మెనూలో పేస్ట్ చేయండి:\n\n${code}`;
      const url = `https://wa.me/?text=${encodeURIComponent(msg)}`;
      window.open(url, '_blank');
    } catch (e: any) {
      setErrorMsg(e?.message || 'Failed to share sync code');
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

  // Reload Profiles from Disk File / Git
  const handleReloadFromDisk = async () => {
    setSaveStatus(language === 'te' ? 'ఫైల్ నుండి డేటా లోడ్ అవుతోంది...' : 'Loading from disk...');
    setErrorMsg(null);
    try {
      const diskProfiles = await fetchFreshProfiles(partNo);
      if (diskProfiles && Object.keys(diskProfiles).length > 0) {
        savePreloadedProfiles(partNo, diskProfiles);
        onSyncApplied({
          version: 1,
          timestamp: Date.now(),
          partNo,
          profiles: diskProfiles,
          families: {},
          influencers: {}
        });
        setSaveStatus(
          language === 'te'
            ? `🎉 విజయవంతంగా ${Object.keys(diskProfiles).length} మంది ఓటర్లు లోడ్ అయ్యారు!`
            : `🎉 Successfully loaded ${Object.keys(diskProfiles).length} voters from disk!`
        );
        setTimeout(() => {
          setSaveStatus(null);
          onClose();
        }, 1500);
      } else {
        throw new Error(language === 'te' ? 'ఈ బూత్ కు డిస్క్ ఫైల్ అందుబాటులో లేదు' : 'No profiles found on disk');
      }
    } catch (e: any) {
      setErrorMsg(e?.message || 'Failed to reload from disk');
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

  // Cloud Sync Now Action
  const handleCloudSyncNow = async () => {
    setIsCloudSyncing(true);
    setErrorMsg(null);
    try {
      // 1. Push local changes
      await pushBoothToSupabaseImmediate(partNo, profiles);
      // 2. Pull remote changes
      const remote = await pullBoothFromSupabase(partNo);
      if (remote) {
        onSyncApplied(remote as any);
      }
      setSaveStatus(
        language === 'te'
          ? '🎉 Supabase క్లౌడ్‌తో విజయవంతంగా సింక్ అయ్యింది!'
          : '🎉 Successfully synced with Supabase Cloud!'
      );
      setTimeout(() => setSaveStatus(null), 3500);
    } catch (err: any) {
      setErrorMsg(err?.message || 'Cloud sync failed');
    } finally {
      setIsCloudSyncing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="bg-slate-900 border border-amber-500/40 rounded-3xl max-w-md w-full p-4 space-y-3.5 shadow-2xl overflow-hidden text-slate-200">
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/40">
              <RefreshCw className="w-4 h-4 text-emerald-400" />
            </div>
            <div>
              <h3 className="text-sm font-black text-white flex items-center gap-1.5">
                {language === 'te' ? 'Supabase క్లౌడ్ ఆటో-సింక్' : 'Supabase Cloud Auto-Sync'}
              </h3>
              <p className="text-[10px] text-slate-400">
                {language === 'te' ? `బూత్ / వార్డు: #${partNo} రియల్‌టైమ్ సింక్` : `Realtime auto-sync for Unit #${partNo}`}
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
            onClick={() => setActiveTab('cloud')}
            className={`flex-1 py-1 rounded-lg font-bold transition-all flex items-center justify-center gap-1 ${
              activeTab === 'cloud'
                ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white font-black shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            <span>{language === 'te' ? 'ఆటో-సింక్' : 'Auto-Sync'}</span>
          </button>
          <button
            onClick={() => setActiveTab('token')}
            className={`flex-1 py-1 rounded-lg font-bold transition-all flex items-center justify-center gap-1 ${
              activeTab === 'token'
                ? 'bg-amber-500 text-slate-950 font-black shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Sparkles className="w-3 h-3" />
            <span>{language === 'te' ? 'సింక్ కోడ్' : 'Sync Code'}</span>
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
            <span>{language === 'te' ? 'ప్రాజెక్ట్ ఫైల్' : 'File'}</span>
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

        {/* TAB 0: Supabase Cloud Live Auto-Sync */}
        {activeTab === 'cloud' && (
          <div className="space-y-3 animate-in fade-in text-xs">
            <div className="bg-gradient-to-br from-emerald-950/60 to-slate-950 p-3.5 rounded-2xl border border-emerald-500/40 space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="font-black text-emerald-300 flex items-center gap-1.5 text-xs">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
                  Supabase Cloud Live Sync
                </span>
                <span className="text-[10px] bg-emerald-900/60 text-emerald-200 font-mono px-2 py-0.5 rounded-full border border-emerald-500/40">
                  Auto-Active 🟢
                </span>
              </div>
              <p className="text-[11px] text-slate-300 leading-relaxed">
                {language === 'te'
                  ? 'మీ సోలార్ CRM క్లౌడ్ డేటాబేస్ తో అనుసంధానించబడింది! ఏ ఫోన్ లో నాయకుడికి ఓటర్లను కేటాయించినా లేదా సర్వే చేసినా బ్యాక్‌గ్రౌండ్‌లో ఆటోమేటిక్‌గా అన్ని డివైస్‌లలో సింక్ అవుతుంది.'
                  : 'Connected to your Solar CRM Supabase Database! Voter assignments, survey markings, and leader lists automatically sync across all devices in real-time.'}
              </p>

              <div className="pt-1">
                <button
                  type="button"
                  onClick={handleCloudSyncNow}
                  disabled={isCloudSyncing}
                  className="w-full py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-black rounded-xl flex items-center justify-center gap-2 shadow-lg shadow-emerald-950/50 active:scale-95 transition-all cursor-pointer"
                >
                  <RefreshCw className={`w-4 h-4 ${isCloudSyncing ? 'animate-spin' : ''}`} />
                  <span>
                    {isCloudSyncing
                      ? (language === 'te' ? 'క్లౌడ్‌తో సింక్ అవుతోంది...' : 'Syncing with Cloud...')
                      : (language === 'te' ? 'ఇప్పుడే క్లౌడ్‌తో సింక్ చేయండి (Sync Now)' : 'Sync with Supabase Now')}
                  </span>
                </button>
              </div>
            </div>

            <div className="p-2.5 rounded-xl bg-slate-950/60 border border-slate-800 text-[10px] text-slate-400 space-y-1 font-mono">
              <div className="flex justify-between">
                <span>Database:</span>
                <span className="text-slate-300">rlwcqmlspvddfscyngfw.supabase.co</span>
              </div>
              <div className="flex justify-between">
                <span>Account:</span>
                <span className="text-slate-300">durga@tejobharat.com</span>
              </div>
              <div className="flex justify-between">
                <span>Auto-Interval:</span>
                <span className="text-emerald-400 font-bold">Realtime + 8s Background Poll</span>
              </div>
            </div>
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
                  ? 'ఈ డివైస్‌లో కేటాయించిన ఓటర్లు, నాయకులు, ఫోన్ నంబర్ల డేటాను కోడ్‌గా మారుస్తుంది. దీన్ని ఇతర ఫోన్లు లేదా బోల్ట్ లో పేస్ట్ చేసి సింక్ చేయవచ్చు.'
                  : 'Generates a 1-click sync token of all assigned electors, leaders, and custom phones to sync to other devices.'}
              </p>
              <div className="flex items-center gap-1.5 pt-0.5">
                <button
                  type="button"
                  onClick={handleCopySyncCode}
                  className="flex-1 py-2 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black rounded-xl text-xs flex items-center justify-center gap-1.5 shadow-md active:scale-95 transition-all cursor-pointer"
                >
                  {isCopied ? (
                    <>
                      <CheckCircle2 className="w-4 h-4 text-slate-950" />
                      <span>{language === 'te' ? '✅ కోడ్ కాపీ అయ్యింది!' : '✅ Code Copied!'}</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-4 h-4 text-slate-950" />
                      <span>{language === 'te' ? '📋 సింక్ కోడ్ కాపీ చేయండి' : '📋 Copy Sync Code'}</span>
                    </>
                  )}
                </button>
                <button
                  type="button"
                  onClick={handleShareSyncCodeWhatsApp}
                  className="py-2 px-3 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-1 shadow-md active:scale-95 transition-all cursor-pointer"
                  title="వాట్సాప్ ద్వారా కోడ్‌ను ఇతర ఫోన్‌కు పంపండి"
                >
                  <Share2 className="w-3.5 h-3.5" />
                  <span>వాట్సాప్</span>
                </button>
              </div>
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
              💾 {language === 'te' ? 'ప్రాజెక్ట్ ఫైల్ సింక్ (Project Disk & Cloud):' : 'Project Disk & Cloud:'}
            </span>
            <p className="text-[10.5px] text-slate-400 leading-relaxed">
              {language === 'te'
                ? `ఈ ఆప్షన్ ద్వారా ప్రస్తుత బూత్ #${partNo} ఓటర్ల మార్కింగ్స్ నేరుగా "public/profiles/profiles_${partNo}.json" లో సేవ్ అవుతాయి లేదా డిస్క్ ఫైల్ నుండి బోల్ట్ లోకి వెంటనే లోడ్ చేసుకోవచ్చు.`
                : `Saves or reloads marked voters directly from "public/profiles/profiles_${partNo}.json".`}
            </p>
            <div className="space-y-2">
              <button
                onClick={handleSaveToDisk}
                className="w-full py-2 bg-gradient-to-r from-red-600 to-amber-600 hover:from-red-500 hover:to-amber-500 text-white font-black rounded-xl text-xs flex items-center justify-center gap-2 shadow-lg active:scale-95 transition-all"
              >
                <Save className="w-4 h-4 text-white" />
                <span>{language === 'te' ? '💾 ప్రాజెక్ట్ ఫైల్ కు సేవ్ చేయండి (Save to Disk)' : '💾 Save to Project File'}</span>
              </button>
              <button
                onClick={handleReloadFromDisk}
                className="w-full py-2 bg-slate-800 hover:bg-slate-700 text-amber-300 font-black rounded-xl text-xs flex items-center justify-center gap-2 border border-slate-700 shadow-md active:scale-95 transition-all"
              >
                <RefreshCw className="w-4 h-4 text-amber-400" />
                <span>{language === 'te' ? '📥 డిస్క్ ఫైల్ నుండి రీలోడ్ చేయండి (Reload from Disk)' : '📥 Reload Profiles from Disk File'}</span>
              </button>
            </div>
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
