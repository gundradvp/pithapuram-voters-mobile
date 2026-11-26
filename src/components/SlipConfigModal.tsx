import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  X,
  Save,
  RotateCcw,
  Plus,
  Users,
  FileText,
  Eye,
  CheckCircle2,
  Sparkles,
  Cloud,
} from 'lucide-react';
import { BoothInfo, MobileVoter } from '../types';
import { Language } from '../utils/i18n';
import {
  DEFAULT_WHATSAPP_SLIP_TEMPLATE,
  SLIP_TEMPLATE_PLACEHOLDERS,
  WardCandidateConfig,
  WhatsAppSlipConfig,
  buildWhatsAppSlipMessage,
  loadWhatsAppSlipConfig,
  saveWhatsAppSlipConfig,
} from '../utils/slipConfig';
import {
  pullSlipConfigFromSupabase,
  pushSlipConfigToSupabase,
} from '../utils/supabaseSync';

interface SlipConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  boothInfo: BoothInfo;
  voters?: MobileVoter[];
  sampleVoter?: MobileVoter | null;
  language?: Language;
  initialTab?: 'wards' | 'template';
  onSaved?: () => void;
}

const SYMBOL_PRESETS = [
  'ప్రెజర్ కుక్కర్ 🍲',
  'గౌన్ 👗',
  'కత్తెర ✂️',
  'గ్లాస్ 🥛',
  'రింగ్ 💍',
  'బ్యాట్ 🏏',
];

export const SlipConfigModal: React.FC<SlipConfigModalProps> = ({
  isOpen,
  onClose,
  boothInfo,
  voters = [],
  sampleVoter = null,
  language = 'te',
  initialTab = 'wards',
  onSaved,
}) => {
  const [activeTab, setActiveTab] = useState<'wards' | 'template'>(initialTab);
  const [config, setConfig] = useState<WhatsAppSlipConfig>(() => loadWhatsAppSlipConfig());
  const [newWardNo, setNewWardNo] = useState<string>('');
  const [previewWardNo, setPreviewWardNo] = useState<string>('4');
  const [savedBanner, setSavedBanner] = useState(false);
  const [cloudStatus, setCloudStatus] = useState<string>('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (isOpen) {
      setConfig(loadWhatsAppSlipConfig());
      setActiveTab(initialTab);
      setSavedBanner(false);
      setCloudStatus('');
      pullSlipConfigFromSupabase().then((remote) => {
        if (remote) {
          setConfig(remote);
        }
      });
    }
  }, [isOpen, initialTab]);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  const wardNumbers = useMemo(() => {
    const set = new Set<number>();
    // Default 1-16 wards (Durgada GP standard)
    for (let i = 1; i <= 16; i++) set.add(i);
    // Include any ward numbers present in loaded voters
    voters.forEach((v) => {
      const w = Number(v.ward_no ?? (v as any).w);
      if (Number.isFinite(w) && w > 0) set.add(w);
    });
    // Include any ward numbers already configured
    Object.keys(config.wardCandidates).forEach((k) => {
      const w = Number(k);
      if (Number.isFinite(w) && w > 0) set.add(w);
    });
    if (boothInfo?.ward_no && Number(boothInfo.ward_no) > 0) {
      set.add(Number(boothInfo.ward_no));
    }
    return Array.from(set).sort((a, b) => a - b);
  }, [voters, config.wardCandidates, boothInfo?.ward_no]);

  const updateWardField = (
    wardNo: number,
    field: keyof Omit<WardCandidateConfig, 'wardNo'>,
    value: string
  ) => {
    const key = String(wardNo);
    setConfig((prev) => {
      const existing = prev.wardCandidates[key] || {
        wardNo,
        memberName: '',
        symbol: '',
        serialNo: '',
      };
      return {
        ...prev,
        wardCandidates: {
          ...prev.wardCandidates,
          [key]: {
            ...existing,
            wardNo,
            [field]: value,
          },
        },
      };
    });
  };

  const handleAddWard = () => {
    const parsed = parseInt(newWardNo.trim(), 10);
    if (!Number.isFinite(parsed) || parsed <= 0) return;
    const key = String(parsed);
    if (!config.wardCandidates[key]) {
      setConfig((prev) => ({
        ...prev,
        wardCandidates: {
          ...prev.wardCandidates,
          [key]: {
            wardNo: parsed,
            memberName: '',
            symbol: '',
            serialNo: '',
          },
        },
      }));
    }
    setNewWardNo('');
  };

  const handleInsertPlaceholder = (placeholder: string) => {
    const el = textareaRef.current;
    if (!el) {
      setConfig((prev) => ({ ...prev, template: prev.template + placeholder }));
      return;
    }
    const start = el.selectionStart ?? config.template.length;
    const end = el.selectionEnd ?? config.template.length;
    const next =
      config.template.slice(0, start) +
      placeholder +
      config.template.slice(end);
    setConfig((prev) => ({ ...prev, template: next }));
    requestAnimationFrame(() => {
      el.focus();
      el.setSelectionRange(start + placeholder.length, start + placeholder.length);
    });
  };

  const handleResetTemplate = () => {
    setConfig((prev) => ({ ...prev, template: DEFAULT_WHATSAPP_SLIP_TEMPLATE }));
  };

  const handleSave = async () => {
    const saved = saveWhatsAppSlipConfig({ ...config, updatedAt: Date.now() });
    setSavedBanner(true);
    setCloudStatus(language === 'te' ? 'క్లౌడ్‌కు సింక్ అవుతోంది...' : 'Syncing to cloud...');
    await pushSlipConfigToSupabase(saved);
    setCloudStatus('');
    onSaved?.();
    setTimeout(() => {
      setSavedBanner(false);
      onClose();
    }, 550);
  };

  const handleCloudSyncNow = async () => {
    setCloudStatus(language === 'te' ? 'సింక్ అవుతోంది...' : 'Syncing...');
    const remote = await pullSlipConfigFromSupabase();
    if (remote) {
      setConfig(remote);
      setCloudStatus(language === 'te' ? 'క్లౌడ్ నుండి లోడ్ అయింది!' : 'Pulled from cloud!');
    } else {
      const saved = saveWhatsAppSlipConfig({ ...config, updatedAt: Date.now() });
      const ok = await pushSlipConfigToSupabase(saved);
      setCloudStatus(
        ok
          ? (language === 'te' ? 'క్లౌడ్‌కు సేవ్ అయింది!' : 'Synced to cloud!')
          : (language === 'te' ? 'సింక్ విఫలమైంది' : 'Sync failed')
      );
    }
    setTimeout(() => setCloudStatus(''), 2500);
  };

  const configuredCount = Object.values(config.wardCandidates).filter(
    (c) => c.memberName.trim() || c.symbol.trim() || c.serialNo.trim()
  ).length;

  const previewVoter: MobileVoter = useMemo(() => {
    const targetWard = Number(previewWardNo) || Number(sampleVoter?.ward_no) || 4;
    if (sampleVoter) {
      return { ...sampleVoter, ward_no: targetWard };
    }
    const matchingVoter = voters.find((v) => Number(v.ward_no) === targetWard) || voters[0];
    if (matchingVoter) {
      return { ...matchingVoter, ward_no: targetWard };
    }
    return {
      s: 1,
      id: 'YOU0202119',
      n: 'SATHYANARAYAN DESHINDI (సత్యనారాయణ దేశినడి)',
      r: 'సత్యనారాయణ',
      hn: '1-1',
      a: '45',
      g: 'M',
      sec: 'వార్డ్ 4',
      kriya: false,
      ward_no: targetWard,
    };
  }, [sampleVoter, voters, previewWardNo]);

  const previewText = useMemo(
    () => buildWhatsAppSlipMessage(previewVoter, boothInfo, config),
    [previewVoter, boothInfo, config]
  );

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[220] bg-black/85 backdrop-blur-sm flex items-end sm:items-center justify-center p-2 sm:p-4 animate-in fade-in duration-150"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="bg-slate-900 border border-amber-500/40 rounded-3xl w-full max-w-2xl shadow-2xl flex flex-col max-h-[92vh] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-amber-600/90 via-orange-600/90 to-amber-700/90 px-4 py-3 flex items-center justify-between gap-2 shrink-0">
          <div className="min-w-0">
            <h2 className="text-sm sm:text-base font-black text-white flex items-center gap-1.5">
              <span>⚙️</span>
              <span>
                {language === 'te'
                  ? 'ఓటర్ స్లిప్ & వార్డ్ అభ్యర్థుల సెట్టింగ్స్'
                  : 'Voter Slip & Ward Candidate Settings'}
              </span>
            </h2>
            <p className="text-[11px] text-amber-100/90 truncate">
              {language === 'te'
                ? 'ప్రతి వార్డు అభ్యర్థి పేరు, గుర్తు, క్రమ సంఖ్య మరియు వాట్సాప్ మెసేజ్ టెంప్లేట్'
                : 'Configure ward member name, symbol, serial no & WhatsApp slip template'}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 bg-slate-950/40 hover:bg-slate-950 text-white rounded-full transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tab Switcher */}
        <div className="grid grid-cols-2 gap-2 p-3 bg-slate-950/70 border-b border-slate-800 shrink-0">
          <button
            type="button"
            onClick={() => setActiveTab('wards')}
            className={`py-2 px-3 rounded-xl text-xs font-black flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
              activeTab === 'wards'
                ? 'bg-amber-500 text-slate-950 shadow-md'
                : 'bg-slate-900 text-slate-300 border border-slate-800 hover:border-slate-700'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span>
              {language === 'te' ? 'వార్డ్ అభ్యర్థులు' : 'Ward Candidates'} ({configuredCount})
            </span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('template')}
            className={`py-2 px-3 rounded-xl text-xs font-black flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
              activeTab === 'template'
                ? 'bg-amber-500 text-slate-950 shadow-md'
                : 'bg-slate-900 text-slate-300 border border-slate-800 hover:border-slate-700'
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            <span>{language === 'te' ? 'వాట్సాప్ టెంప్లేట్' : 'Message Template'}</span>
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-3 sm:p-4 space-y-3">
          {activeTab === 'wards' ? (
            <>
              {/* Add extra ward bar */}
              <div className="flex items-center justify-between gap-2 bg-slate-950/80 border border-slate-800 rounded-xl p-2.5">
                <span className="text-[11px] text-slate-300 font-bold">
                  {language === 'te'
                    ? 'కొత్త వార్డు నంబర్ జోడించండి:'
                    : 'Add another ward number:'}
                </span>
                <div className="flex items-center gap-1.5">
                  <input
                    type="number"
                    min={1}
                    value={newWardNo}
                    onChange={(e) => setNewWardNo(e.target.value)}
                    placeholder="Ward #"
                    className="w-20 bg-slate-900 border border-slate-700 rounded-lg px-2 py-1 text-xs text-white font-mono focus:outline-none focus:border-amber-400"
                  />
                  <button
                    type="button"
                    onClick={handleAddWard}
                    className="px-2.5 py-1 bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 rounded-lg text-xs font-bold flex items-center gap-1 cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add</span>
                  </button>
                </div>
              </div>

              {/* Ward cards */}
              <div className="space-y-2.5">
                {wardNumbers.map((wNo) => {
                  const entry = config.wardCandidates[String(wNo)] || {
                    wardNo: wNo,
                    memberName: '',
                    symbol: '',
                    serialNo: '',
                  };
                  const isFilled =
                    entry.memberName.trim() || entry.symbol.trim() || entry.serialNo.trim();

                  return (
                    <div
                      key={wNo}
                      className={`rounded-2xl border p-3 space-y-2 transition-colors ${
                        isFilled
                          ? 'bg-slate-950/90 border-emerald-500/40'
                          : 'bg-slate-950/50 border-slate-800'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="px-2.5 py-0.5 rounded-full bg-amber-500/20 border border-amber-500/40 text-amber-300 text-xs font-black">
                          🏛️ వార్డు #{wNo}
                        </span>
                        {isFilled && (
                          <span className="text-[10px] font-bold text-emerald-400 flex items-center gap-1">
                            <CheckCircle2 className="w-3 h-3" /> Configured
                          </span>
                        )}
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-12 gap-2">
                        <div className="sm:col-span-6">
                          <label className="block text-[10px] font-bold text-slate-400 mb-1">
                            వార్డ్ మెంబర్ అభ్యర్థి పేరు (Member Name)
                          </label>
                          <input
                            type="text"
                            value={entry.memberName}
                            onChange={(e) => updateWardField(wNo, 'memberName', e.target.value)}
                            placeholder="ఉదా: రాంబాబు గారు"
                            className="w-full bg-slate-900 border border-slate-700 rounded-xl px-2.5 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-400"
                          />
                        </div>

                        <div className="sm:col-span-4">
                          <label className="block text-[10px] font-bold text-slate-400 mb-1">
                            గుర్తు (Symbol)
                          </label>
                          <input
                            type="text"
                            value={entry.symbol}
                            onChange={(e) => updateWardField(wNo, 'symbol', e.target.value)}
                            placeholder="ఉదా: ప్రెజర్ కుక్కర్ / గౌన్"
                            className="w-full bg-slate-900 border border-slate-700 rounded-xl px-2.5 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-400"
                          />
                        </div>

                        <div className="sm:col-span-2">
                          <label className="block text-[10px] font-bold text-slate-400 mb-1">
                            క్రమ సంఖ్య (S.No)
                          </label>
                          <input
                            type="text"
                            value={entry.serialNo}
                            onChange={(e) => updateWardField(wNo, 'serialNo', e.target.value)}
                            placeholder="1"
                            className="w-full bg-slate-900 border border-slate-700 rounded-xl px-2.5 py-1.5 text-xs text-amber-300 font-mono font-bold placeholder-slate-500 focus:outline-none focus:border-amber-400"
                          />
                        </div>
                      </div>

                      {/* Quick symbol chips */}
                      <div className="flex items-center gap-1 flex-wrap pt-0.5">
                        <span className="text-[10px] text-slate-500 mr-1">గుర్తు ఎంచుకోండి:</span>
                        {SYMBOL_PRESETS.map((sym) => (
                          <button
                            key={sym}
                            type="button"
                            onClick={() => updateWardField(wNo, 'symbol', sym)}
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold border transition-all cursor-pointer ${
                              entry.symbol === sym
                                ? 'bg-amber-500 text-slate-950 border-amber-400'
                                : 'bg-slate-900 text-slate-300 border-slate-700 hover:border-amber-400/60'
                            }`}
                          >
                            {sym}
                          </button>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          ) : (
            <>
              {/* Placeholder chips */}
              <div className="bg-slate-950/80 border border-slate-800 rounded-2xl p-3 space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[11px] font-bold text-amber-300 flex items-center gap-1">
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>
                      {language === 'te'
                        ? 'టెంప్లేట్‌లో చేర్చడానికి ట్యాగ్‌పై క్లిక్ చేయండి:'
                        : 'Tap a tag to insert into template:'}
                    </span>
                  </span>
                  <button
                    type="button"
                    onClick={handleResetTemplate}
                    className="px-2 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-[10px] font-bold flex items-center gap-1 border border-slate-700 cursor-pointer"
                  >
                    <RotateCcw className="w-3 h-3" />
                    <span>Reset Default</span>
                  </button>
                </div>

                <div className="flex flex-wrap gap-1.5">
                  {SLIP_TEMPLATE_PLACEHOLDERS.map((p) => (
                    <button
                      key={p.key}
                      type="button"
                      onClick={() => handleInsertPlaceholder(p.key)}
                      className="px-2 py-1 rounded-lg bg-slate-900 hover:bg-amber-500/20 text-amber-300 border border-slate-700 hover:border-amber-500/50 text-[10px] font-bold cursor-pointer transition-colors"
                      title={p.key}
                    >
                      {language === 'te' ? p.labelTe : p.labelEn}{' '}
                      <span className="font-mono text-slate-400">{p.key}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Template Editor */}
              <div>
                <label className="block text-[11px] font-bold text-slate-300 mb-1.5">
                  {language === 'te'
                    ? 'వాట్సాప్ స్లిప్ మెసేజ్ టెంప్లేట్ (సవరించవచ్చు):'
                    : 'WhatsApp Slip Message Template:'}
                </label>
                <textarea
                  ref={textareaRef}
                  rows={11}
                  value={config.template}
                  onChange={(e) => setConfig((prev) => ({ ...prev, template: e.target.value }))}
                  className="w-full bg-slate-950 border border-slate-700 rounded-2xl p-3 text-xs text-white leading-relaxed focus:outline-none focus:border-amber-400 font-sans"
                />
              </div>

              {/* Live Preview */}
              <div className="bg-emerald-950/30 border border-emerald-500/30 rounded-2xl p-3 space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[11px] font-black text-emerald-300 flex items-center gap-1.5">
                    <Eye className="w-3.5 h-3.5" />
                    <span>{language === 'te' ? 'లైవ్ ప్రివ్యూ (WhatsApp)' : 'Live WhatsApp Preview'}</span>
                  </span>
                  <div className="flex items-center gap-1.5">
                    <span className="text-[10px] text-slate-400">Preview Ward:</span>
                    <select
                      value={previewWardNo}
                      onChange={(e) => setPreviewWardNo(e.target.value)}
                      className="bg-slate-900 border border-slate-700 rounded-lg px-2 py-0.5 text-[11px] text-amber-300 font-bold focus:outline-none"
                    >
                      {wardNumbers.map((w) => (
                        <option key={w} value={String(w)}>
                          Ward #{w}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
                <pre className="whitespace-pre-wrap font-sans text-xs text-slate-100 bg-slate-950/80 border border-slate-800 rounded-xl p-3 leading-relaxed">
                  {previewText}
                </pre>
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="p-3 bg-slate-950/90 border-t border-slate-800 flex items-center justify-between gap-2 shrink-0 flex-wrap">
          <div className="flex items-center gap-2 text-[11px] font-bold">
            <button
              type="button"
              onClick={handleCloudSyncNow}
              className="px-2.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-sky-300 border border-sky-500/40 text-[11px] font-bold flex items-center gap-1 cursor-pointer"
              title="Sync ward candidates & template with Supabase cloud"
            >
              <Cloud className="w-3.5 h-3.5" />
              <span>{language === 'te' ? 'క్లౌడ్ సింక్' : 'Cloud Sync'}</span>
            </button>
            {savedBanner ? (
              <span className="flex items-center gap-1 text-emerald-400">
                <CheckCircle2 className="w-4 h-4" />
                {language === 'te' ? 'సెట్టింగ్స్ సేవ్ అయ్యాయి!' : 'Settings saved!'}
              </span>
            ) : cloudStatus ? (
              <span className="text-sky-300">{cloudStatus}</span>
            ) : null}
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold cursor-pointer"
            >
              {language === 'te' ? 'మూసివేయండి' : 'Cancel'}
            </button>
            <button
              type="button"
              onClick={handleSave}
              className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-black flex items-center gap-1.5 shadow-lg shadow-emerald-950/50 active:scale-95 transition-all cursor-pointer"
            >
              <Save className="w-3.5 h-3.5" />
              <span>{language === 'te' ? 'సేవ్ చేయండి' : 'Save Settings'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
