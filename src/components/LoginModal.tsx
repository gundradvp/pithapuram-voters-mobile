import React, { useState } from 'react';
import { ShieldCheck, Phone, Lock, ArrowRight, UserCheck, KeyRound, Sparkles, AlertCircle } from 'lucide-react';
import { UserSession, verifyAdminPassword, getVolunteerAssignment, setUserSession, cleanPhoneNumber } from '../utils/auth';
import { Language } from '../utils/i18n';

interface LoginModalProps {
  isOpen: boolean;
  language: Language;
  onLoginSuccess: (session: UserSession) => void;
  onClose?: () => void;
}

export const LoginModal: React.FC<LoginModalProps> = ({
  isOpen,
  language,
  onLoginSuccess,
  onClose
}) => {
  const [activeTab, setActiveTab] = useState<'volunteer' | 'admin'>('volunteer');
  const [phoneInput, setPhoneInput] = useState('');
  const [adminPasswordInput, setAdminPasswordInput] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleVolunteerLogin = (phoneToUse?: string) => {
    const raw = phoneToUse || phoneInput;
    const clean = cleanPhoneNumber(raw);
    if (!clean || clean.length < 10) {
      setErrorMsg(language === 'te' ? 'దయచేసి సరైన 10 అంకెల మొబైల్ నంబర్ నమోదు చేయండి' : 'Please enter a valid 10-digit mobile number');
      return;
    }

    const assignment = getVolunteerAssignment(clean);
    const session: UserSession = {
      role: 'volunteer',
      phone: clean,
      name: assignment ? assignment.name : (language === 'te' ? 'వాలంటీర్' : 'Volunteer'),
      loginTime: Date.now()
    };

    setUserSession(session);
    setErrorMsg(null);
    onLoginSuccess(session);
  };

  const handleAdminLogin = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (verifyAdminPassword(adminPasswordInput)) {
      const session: UserSession = {
        role: 'admin',
        phone: '9000273028',
        name: language === 'te' ? 'అడ్మిన్ కోఆర్డినేటర్ (Admin)' : 'Admin Coordinator',
        loginTime: Date.now()
      };
      setUserSession(session);
      setErrorMsg(null);
      setAdminPasswordInput('');
      onLoginSuccess(session);
    } else {
      setErrorMsg(language === 'te' ? 'పాస్‌వర్డ్ సరిపోలలేదు. దయచేసి మళ్ళీ ప్రయత్నించండి.' : 'Invalid Admin password. Please try again.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-3 animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-amber-500/40 rounded-3xl max-w-sm w-full p-5 space-y-4 shadow-2xl relative">
        {/* Header Branding */}
        <div className="text-center space-y-1">
          <div className="inline-flex w-12 h-12 rounded-2xl bg-gradient-to-tr from-red-600 via-amber-500 to-red-600 items-center justify-center text-white text-2xl shadow-lg shadow-red-900/50 border border-amber-400/40">
            🚩
          </div>
          <h2 className="text-base font-black text-white mt-2">
            {language === 'te' ? 'జనసేన పార్టీ - పిఠాపురం' : 'JSP Pithapuram'}
          </h2>
          <p className="text-[11px] text-amber-400 font-bold tracking-wide uppercase">
            {language === 'te' ? 'ఎన్నికల మొబైల్ & వార్డు పోర్టల్' : 'Election Mobile & Ward Portal'}
          </p>
        </div>

        {/* Tab Switcher (Volunteer vs Admin) */}
        <div className="grid grid-cols-2 p-1 bg-slate-950/80 rounded-xl border border-slate-800 text-xs">
          <button
            onClick={() => { setActiveTab('volunteer'); setErrorMsg(null); }}
            className={`py-2 rounded-lg font-bold flex items-center justify-center gap-1.5 transition-all ${
              activeTab === 'volunteer'
                ? 'bg-amber-500 text-slate-950 shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Phone className="w-3.5 h-3.5" />
            <span>{language === 'te' ? 'వాలంటీర్ లాగిన్' : 'Volunteer'}</span>
          </button>
          <button
            onClick={() => { setActiveTab('admin'); setErrorMsg(null); }}
            className={`py-2 rounded-lg font-bold flex items-center justify-center gap-1.5 transition-all ${
              activeTab === 'admin'
                ? 'bg-red-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <KeyRound className="w-3.5 h-3.5" />
            <span>{language === 'te' ? 'అడ్మిన్ లాగిన్' : 'Admin'}</span>
          </button>
        </div>

        {/* Error Notice */}
        {errorMsg && (
          <div className="p-2.5 rounded-xl bg-red-950/60 border border-red-500/50 text-red-200 text-xs flex items-center gap-2 animate-in fade-in">
            <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* VOLUNTEER LOGIN VIEW */}
        {activeTab === 'volunteer' && (
          <div className="space-y-3">
            <div>
              <label className="block text-[11px] font-bold text-slate-300 mb-1">
                {language === 'te' ? 'మీ 10 అంకెల మొబైల్ నంబర్:' : '10-Digit Mobile Number:'}
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400 text-xs font-bold font-mono">
                  +91
                </div>
                <input
                  type="tel"
                  maxLength={10}
                  value={phoneInput}
                  onChange={(e) => setPhoneInput(e.target.value.replace(/\D/g, ''))}
                  onKeyDown={(e) => e.key === 'Enter' && handleVolunteerLogin()}
                  placeholder="90002 73028"
                  className="w-full pl-12 pr-3 py-2.5 bg-slate-950 border border-slate-700 focus:border-amber-400 rounded-xl text-white text-sm font-mono tracking-wider focus:outline-none focus:ring-1 focus:ring-amber-400"
                />
              </div>
              <p className="text-[10px] text-slate-400 mt-1">
                {language === 'te' 
                  ? 'మీ మొబైల్ నంబర్‌కు కేటాయించిన బూత్‌లు/వార్డులు మాత్రమే కనిపిస్తాయి.' 
                  : 'Only booths/wards assigned to your number will be accessible.'}
              </p>
            </div>

            {/* Quick 1-Click Access for Tested Incharges */}
            <div className="space-y-1.5 pt-1">
              <span className="text-[10px] uppercase font-bold text-slate-400">
                {language === 'te' ? 'త్వరిత లాగిన్ (నమూనా నంబర్లు):' : 'Quick Access (Pre-assigned):'}
              </span>
              <div className="grid grid-cols-1 gap-1.5">
                <button
                  type="button"
                  onClick={() => {
                    setPhoneInput('9000273028');
                    handleVolunteerLogin('9000273028');
                  }}
                  className="w-full px-2.5 py-1.5 rounded-lg bg-slate-950/80 border border-slate-800 hover:border-amber-500/50 text-left flex items-center justify-between text-xs text-slate-300 hover:text-white transition-all group"
                >
                  <div className="truncate">
                    <span className="font-bold text-amber-400">9000273028</span>
                    <span className="text-[10px] text-slate-400 ml-1.5">(దుర్గా ప్రసాద్ - బూత్ 11-13, వార్డు 14, 11)</span>
                  </div>
                  <ArrowRight className="w-3.5 h-3.5 text-slate-500 group-hover:text-amber-400" />
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setPhoneInput('9479797947');
                    handleVolunteerLogin('9479797947');
                  }}
                  className="w-full px-2.5 py-1.5 rounded-lg bg-slate-950/80 border border-slate-800 hover:border-amber-500/50 text-left flex items-center justify-between text-xs text-slate-300 hover:text-white transition-all group"
                >
                  <div className="truncate">
                    <span className="font-bold text-amber-400">9479797947</span>
                    <span className="text-[10px] text-slate-400 ml-1.5">(గొల్లప్రోలు ఇంచార్జ్ - వార్డు 11)</span>
                  </div>
                  <ArrowRight className="w-3.5 h-3.5 text-slate-500 group-hover:text-amber-400" />
                </button>
              </div>
            </div>

            <button
              onClick={() => handleVolunteerLogin()}
              className="w-full py-2.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black rounded-xl text-xs flex items-center justify-center gap-1.5 shadow-md shadow-amber-950/40 transition-all active:scale-98"
            >
              <UserCheck className="w-4 h-4" />
              <span>{language === 'te' ? 'లాగిన్ అవ్వండి (Login)' : 'Login as Volunteer'}</span>
            </button>
          </div>
        )}

        {/* ADMIN LOGIN VIEW */}
        {activeTab === 'admin' && (
          <form onSubmit={handleAdminLogin} className="space-y-3">
            <div>
              <label className="block text-[11px] font-bold text-slate-300 mb-1">
                {language === 'te' ? 'అడ్మిన్ సెక్యూరిటీ పాస్‌వర్డ్:' : 'Admin Security Password:'}
              </label>
              <div className="relative">
                <input
                  type="password"
                  value={adminPasswordInput}
                  onChange={(e) => setAdminPasswordInput(e.target.value)}
                  placeholder="••••"
                  autoFocus
                  className="w-full px-3 py-2.5 bg-slate-950 border border-slate-700 focus:border-red-500 rounded-xl text-white text-base tracking-widest focus:outline-none focus:ring-1 focus:ring-red-500 font-mono"
                />
              </div>
              <p className="text-[10px] text-slate-400 mt-1">
                {language === 'te'
                  ? 'అడ్మిన్‌లు అన్ని 266 అసెంబ్లీ బూతులు, మున్సిపల్ వార్డులు మరియు వాలంటీర్ కేటాయింపులను నిర్వహించవచ్చు.'
                  : 'Admins have full access to all 266 booths, municipal wards, and assignment dispatches.'}
              </p>
            </div>

            <button
              type="submit"
              className="w-full py-2.5 bg-gradient-to-r from-red-600 to-red-700 hover:from-red-500 hover:to-red-600 text-white font-black rounded-xl text-xs flex items-center justify-center gap-1.5 shadow-md shadow-red-950/40 transition-all active:scale-98"
            >
              <ShieldCheck className="w-4 h-4" />
              <span>{language === 'te' ? 'అడ్మిన్ పోర్టల్‌లోకి ప్రవేశించండి' : 'Enter Admin Portal'}</span>
            </button>
          </form>
        )}
      </div>
    </div>
  );
};
