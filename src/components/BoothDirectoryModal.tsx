import React, { useState, useEffect } from 'react';
import { 
  MapPin, 
  Navigation, 
  Search, 
  Plus, 
  Edit3, 
  Trash2, 
  ExternalLink, 
  X, 
  Check, 
  RotateCcw, 
  Building2, 
  Download,
  AlertCircle
} from 'lucide-react';
import { Language } from '../utils/i18n';

export interface PollingBoothEntry {
  id: string | number;
  booth_no?: number | string;
  name: string;
  name_te?: string;
  village: string;
  mandal: string;
  wards: number[];
  latitude: number | string;
  longitude: number | string;
  address: string;
  notes?: string;
}

const DEFAULT_DURGADA_BOOTHS: PollingBoothEntry[] = [
  {
    id: 'dur_b1',
    booth_no: 1,
    name: 'Pallapu veedhi',
    name_te: 'పల్లపు వీధి పోలింగ్ కేంద్రం',
    village: 'దుర్గడ (Durgada)',
    mandal: 'GOLLAPROLU',
    wards: [1, 2],
    latitude: 17.2117922,
    longitude: 82.3455958,
    address: 'పల్లపు వీధి, దుర్గడ గ్రామం',
    notes: 'వార్డులు 1, 2'
  },
  {
    id: 'dur_b2',
    booth_no: 2,
    name: 'SC peta Anganwadi',
    name_te: 'ఎస్సీ పేట అంగన్‌వాడీ కేంద్రం',
    village: 'దుర్గడ (Durgada)',
    mandal: 'GOLLAPROLU',
    wards: [3],
    latitude: 17.21651676,
    longitude: 82.34307714,
    address: 'ఎస్సీ పేట అంగన్‌వాడీ కేంద్రం, దుర్గడ',
    notes: 'వార్డు 3'
  },
  {
    id: 'dur_b3',
    booth_no: 3,
    name: 'EBC colony',
    name_te: 'ఈబీసీ కాలనీ పోలింగ్ కేంద్రం',
    village: 'దుర్గడ (Durgada)',
    mandal: 'GOLLAPROLU',
    wards: [4],
    latitude: 17.21239233,
    longitude: 82.34119277,
    address: 'ఈబీసీ కాలనీ ప్రాథమిక పాఠశాల, దుర్గడ',
    notes: 'వార్డు 4'
  },
  {
    id: 'dur_b4',
    booth_no: 4,
    name: 'Kothapeta MPP',
    name_te: 'కొత్తపేట ఎంపీపీ ప్రాథమిక పాఠశాల',
    village: 'దుర్గడ (Durgada)',
    mandal: 'GOLLAPROLU',
    wards: [5, 6, 7],
    latitude: 17.21705785,
    longitude: 82.34811288,
    address: 'మండల ప్రజా పరిషత్ పాఠశాల, కొత్తపేట, దుర్గడ',
    notes: 'వార్డులు 5, 6, 7'
  },
  {
    id: 'dur_b5',
    booth_no: 5,
    name: 'ZPHS High School',
    name_te: 'జెడ్పీహెచ్ఎస్ ఉన్నత పాఠశాల',
    village: 'దుర్గడ (Durgada)',
    mandal: 'GOLLAPROLU',
    wards: [8, 9, 10, 11],
    latitude: 17.2146095,
    longitude: 82.3358968,
    address: 'జిల్లా పరిషత్ ఉన్నత పాఠశాల (ZPHS), దుర్గడ',
    notes: 'వార్డులు 8, 9, 10, 11'
  },
  {
    id: 'dur_b6',
    booth_no: 6,
    name: 'SC peta',
    name_te: 'ఎస్సీ పేట పోలింగ్ కేంద్రం',
    village: 'దుర్గడ (Durgada)',
    mandal: 'GOLLAPROLU',
    wards: [12, 13, 14, 15, 16],
    latitude: 17.21667739,
    longitude: 82.34225698,
    address: 'ఎస్సీ పేట కమ్యూనిటీ భవనం / స్కూల్, దుర్గడ',
    notes: 'వార్డులు 12, 13, 14, 15, 16'
  }
];

const STORAGE_KEY = 'jsp_polling_booth_directory_v1';

interface BoothDirectoryModalProps {
  onClose: () => void;
  language?: Language;
  onSelectWard?: (wardNo: number) => void;
}

export const BoothDirectoryModal: React.FC<BoothDirectoryModalProps> = ({
  onClose,
  language = 'te',
  onSelectWard
}) => {
  const [booths, setBooths] = useState<PollingBoothEntry[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.error(e);
    }
    return DEFAULT_DURGADA_BOOTHS;
  });

  const [searchTerm, setSearchTerm] = useState('');
  const [editingBooth, setEditingBooth] = useState<PollingBoothEntry | null>(null);
  const [isAdding, setIsAdding] = useState(false);

  // Form states
  const [formName, setFormName] = useState('');
  const [formTelugu, setFormTelugu] = useState('');
  const [formVillage, setFormVillage] = useState('దుర్గడ (Durgada)');
  const [formAddress, setFormAddress] = useState('');
  const [formWards, setFormWards] = useState('');
  const [formLat, setFormLat] = useState('');
  const [formLng, setFormLng] = useState('');
  const [formNotes, setFormNotes] = useState('');

  const saveToStorage = (updated: PollingBoothEntry[]) => {
    setBooths(updated);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    } catch (e) {
      console.error(e);
    }
  };

  const handleOpenAdd = () => {
    setEditingBooth(null);
    setFormName('');
    setFormTelugu('');
    setFormVillage('దుర్గడ (Durgada)');
    setFormAddress('');
    setFormWards('');
    setFormLat('17.21');
    setFormLng('82.34');
    setFormNotes('');
    setIsAdding(true);
  };

  const handleOpenEdit = (b: PollingBoothEntry) => {
    setEditingBooth(b);
    setFormName(b.name);
    setFormTelugu(b.name_te || '');
    setFormVillage(b.village);
    setFormAddress(b.address);
    setFormWards(b.wards.join(', '));
    setFormLat(String(b.latitude));
    setFormLng(String(b.longitude));
    setFormNotes(b.notes || '');
    setIsAdding(true);
  };

  const handleSaveForm = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim()) return;

    const parsedWards = formWards
      .split(',')
      .map(w => parseInt(w.trim(), 10))
      .filter(w => !isNaN(w) && w > 0);

    if (editingBooth) {
      // Edit
      const updated = booths.map(b => 
        b.id === editingBooth.id 
          ? {
              ...b,
              name: formName.trim(),
              name_te: formTelugu.trim(),
              village: formVillage.trim(),
              address: formAddress.trim(),
              wards: parsedWards,
              latitude: formLat.trim(),
              longitude: formLng.trim(),
              notes: formNotes.trim()
            }
          : b
      );
      saveToStorage(updated);
    } else {
      // Add
      const newEntry: PollingBoothEntry = {
        id: 'booth_' + Date.now(),
        booth_no: booths.length + 1,
        name: formName.trim(),
        name_te: formTelugu.trim(),
        village: formVillage.trim(),
        mandal: 'GOLLAPROLU',
        address: formAddress.trim(),
        wards: parsedWards,
        latitude: formLat.trim(),
        longitude: formLng.trim(),
        notes: formNotes.trim()
      };
      saveToStorage([...booths, newEntry]);
    }

    setIsAdding(false);
    setEditingBooth(null);
  };

  const handleDelete = (id: string | number) => {
    if (confirm(language === 'te' ? 'ఈ పోలింగ్ కేంద్రం తొలగించాలా?' : 'Delete this polling station?')) {
      const updated = booths.filter(b => b.id !== id);
      saveToStorage(updated);
    }
  };

  const handleResetDefaults = () => {
    if (confirm(language === 'te' ? 'దుర్గడ డిఫాల్ట్ బూత్ లిస్ట్ రీసెట్ చేయాలా?' : 'Reset to default Durgada booths?')) {
      saveToStorage(DEFAULT_DURGADA_BOOTHS);
    }
  };

  const filteredBooths = booths.filter(b => {
    const q = searchTerm.toLowerCase().trim();
    if (!q) return true;
    return (
      b.name.toLowerCase().includes(q) ||
      (b.name_te && b.name_te.includes(q)) ||
      b.address.toLowerCase().includes(q) ||
      b.wards.some(w => String(w) === q || String(w).includes(q))
    );
  });

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-2 sm:p-4">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-2xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        
        {/* Header */}
        <div className="px-4 py-3 bg-slate-950 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400 font-bold">
              <MapPin className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-black text-white flex items-center gap-2">
                <span>{language === 'te' ? 'పోలింగ్ కేంద్రాల డైరెక్టరీ' : 'Polling Booth Directory'}</span>
                <span className="px-2 py-0.5 rounded-full text-[10px] bg-blue-500/20 text-blue-300 font-mono border border-blue-500/30">
                  {booths.length} {language === 'te' ? 'కేంద్రాలు' : 'Stations'}
                </span>
              </h2>
              <p className="text-[11px] text-slate-400">
                {language === 'te' ? 'దుర్గడ గ్రామం (వార్డులు 1-16) GPS లొకేషన్లు & నావిగేషన్' : 'Durgada Village (Wards 1-16) GPS & Navigation'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            <button
              onClick={handleOpenAdd}
              className="px-2.5 py-1 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-bold flex items-center gap-1 shadow transition cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>{language === 'te' ? 'కొత్త బూత్' : 'Add'}</span>
            </button>
            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-full transition cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Search & Actions Bar */}
        <div className="p-3 bg-slate-900 border-b border-slate-800/80 flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              placeholder={language === 'te' ? 'కేంద్రం పేరు, వార్డు నంబర్ (#1, #2...)...' : 'Search booth name, ward #...'}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-400"
            />
          </div>
          <button
            onClick={handleResetDefaults}
            title={language === 'te' ? 'డిఫాల్ట్ లిస్ట్ రీసెట్' : 'Reset to defaults'}
            className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-amber-400 rounded-xl border border-slate-700 transition"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Booths List */}
        <div className="p-3 overflow-y-auto space-y-2.5 flex-1 divide-y divide-slate-800/50">
          {filteredBooths.map((b, idx) => {
            const mapUrl = `https://www.google.com/maps?q=${b.latitude},${b.longitude}`;
            return (
              <div 
                key={b.id} 
                className="pt-2.5 first:pt-0 flex flex-col gap-2 group hover:bg-slate-800/20 p-2 rounded-xl transition"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="w-5 h-5 rounded-md bg-amber-500/20 text-amber-400 font-bold text-xs flex items-center justify-center border border-amber-500/30">
                        {idx + 1}
                      </span>
                      <h3 className="text-xs font-black text-white truncate">{b.name}</h3>
                      {b.name_te && (
                        <span className="text-[11px] text-amber-300 font-medium">({b.name_te})</span>
                      )}
                    </div>
                    <p className="text-[11px] text-slate-400 mt-0.5">{b.address}</p>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      onClick={() => handleOpenEdit(b)}
                      className="p-1 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-amber-400 transition"
                      title="Edit"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleDelete(b.id)}
                      className="p-1 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-red-400 transition"
                      title="Delete"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Wards badges and Navigation button */}
                <div className="flex items-center justify-between gap-2 pt-1">
                  <div className="flex items-center gap-1 flex-wrap">
                    <span className="text-[10px] text-slate-500 uppercase font-bold">Wards:</span>
                    {b.wards.map(w => (
                      <button
                        key={w}
                        onClick={() => onSelectWard && onSelectWard(w)}
                        className="px-1.5 py-0.5 rounded bg-blue-950/80 border border-blue-500/40 text-blue-300 text-[10px] font-mono font-bold hover:bg-blue-900 transition"
                        title={language === 'te' ? `వార్డు #${w} కు మారండి` : `Switch to Ward #${w}`}
                      >
                        W#{w}
                      </button>
                    ))}
                  </div>

                  <a
                    href={mapUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-[10px] shadow transition shrink-0"
                  >
                    <Navigation className="w-3 h-3" />
                    <span>{language === 'te' ? 'మ్యాప్ నావిగేషన్' : 'Navigate'} ↗</span>
                  </a>
                </div>

                <div className="text-[10px] text-slate-500 font-mono flex items-center justify-between">
                  <span>GPS: {b.latitude}, {b.longitude}</span>
                  {b.notes && <span className="italic text-slate-400">{b.notes}</span>}
                </div>
              </div>
            );
          })}

          {filteredBooths.length === 0 && (
            <div className="py-8 text-center text-xs text-slate-500 border border-dashed border-slate-800 rounded-xl">
              {language === 'te' ? 'ఎటువంటి పోలింగ్ కేంద్రాలు కనుగొనబడలేదు' : 'No polling booths found matching search'}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-4 py-2.5 bg-slate-950 border-t border-slate-800 flex items-center justify-between text-[11px] text-slate-400">
          <span>{booths.length} {language === 'te' ? 'కేంద్రాలు నమోదు చేయబడ్డాయి' : 'locations registered'}</span>
          <button
            onClick={onClose}
            className="px-3 py-1 bg-slate-800 hover:bg-slate-700 text-white rounded-lg text-xs font-bold transition"
          >
            {language === 'te' ? 'మూసివేయి' : 'Close'}
          </button>
        </div>

      </div>

      {/* Add / Edit Form Modal */}
      {isAdding && (
        <div className="fixed inset-0 z-60 bg-black/70 flex items-center justify-center p-3">
          <form 
            onSubmit={handleSaveForm}
            className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-md p-4 space-y-3 shadow-2xl animate-in zoom-in-95 duration-100"
          >
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <h3 className="text-xs font-bold text-white flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-amber-400" />
                <span>{editingBooth ? 'Edit Polling Station' : 'Add New Polling Station'}</span>
              </h3>
              <button 
                type="button" 
                onClick={() => setIsAdding(false)} 
                className="text-slate-400 hover:text-white"
              >
                &times;
              </button>
            </div>

            <div className="space-y-2.5 text-xs">
              <div>
                <label className="block text-[10px] uppercase font-bold text-slate-400 mb-0.5">Name (English)</label>
                <input
                  type="text"
                  required
                  value={formName}
                  onChange={e => setFormName(e.target.value)}
                  placeholder="e.g. Palapu veedhi"
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-white focus:outline-none focus:border-amber-400"
                />
              </div>

              <div>
                <label className="block text-[10px] uppercase font-bold text-slate-400 mb-0.5">Telugu Name</label>
                <input
                  type="text"
                  value={formTelugu}
                  onChange={e => setFormTelugu(e.target.value)}
                  placeholder="e.g. పాలపు వీధి పోలింగ్ కేంద్రం"
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-white focus:outline-none focus:border-amber-400"
                />
              </div>

              <div>
                <label className="block text-[10px] uppercase font-bold text-slate-400 mb-0.5">Assigned Wards (comma-separated)</label>
                <input
                  type="text"
                  required
                  value={formWards}
                  onChange={e => setFormWards(e.target.value)}
                  placeholder="e.g. 1, 2 or 12, 13, 14, 15, 16"
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-white focus:outline-none focus:border-amber-400 font-mono"
                />
              </div>

              <div>
                <label className="block text-[10px] uppercase font-bold text-slate-400 mb-0.5">Address / Landmark</label>
                <input
                  type="text"
                  value={formAddress}
                  onChange={e => setFormAddress(e.target.value)}
                  placeholder="e.g. పాలపు వీధి, దుర్గడ గ్రామం"
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-white focus:outline-none focus:border-amber-400"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[10px] uppercase font-bold text-slate-400 mb-0.5">Latitude</label>
                  <input
                    type="text"
                    required
                    value={formLat}
                    onChange={e => setFormLat(e.target.value)}
                    placeholder="17.2117922"
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-white focus:outline-none focus:border-amber-400 font-mono text-[11px]"
                  />
                </div>
                <div>
                  <label className="block text-[10px] uppercase font-bold text-slate-400 mb-0.5">Longitude</label>
                  <input
                    type="text"
                    required
                    value={formLng}
                    onChange={e => setFormLng(e.target.value)}
                    placeholder="82.3455958"
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-white focus:outline-none focus:border-amber-400 font-mono text-[11px]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] uppercase font-bold text-slate-400 mb-0.5">Notes (Optional)</label>
                <input
                  type="text"
                  value={formNotes}
                  onChange={e => setFormNotes(e.target.value)}
                  placeholder="Additional notes"
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-white focus:outline-none focus:border-amber-400"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setIsAdding(false)}
                className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-1.5 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-lg text-xs shadow"
              >
                Save
              </button>
            </div>
          </form>
        </div>
      )}

    </div>
  );
};
