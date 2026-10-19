import React, { useState } from 'react';
import { X, UserCheck, Plus, Check, Phone, ShieldCheck } from 'lucide-react';
import { Influencer } from '../types';

interface InfluencerAssignModalProps {
  targetName: string;
  currentInfluencerId?: string;
  influencers: Record<string, Influencer>;
  onAssignInfluencer: (influencer: Influencer | null) => void;
  onAddNewInfluencer: (influencer: Influencer) => void;
  onClose: () => void;
}

export const InfluencerAssignModal: React.FC<InfluencerAssignModalProps> = ({
  targetName,
  currentInfluencerId,
  influencers,
  onAssignInfluencer,
  onAddNewInfluencer,
  onClose
}) => {
  const [isCreatingNew, setIsCreatingNew] = useState(false);
  const [newName, setNewName] = useState('');
  const [newMobile, setNewMobile] = useState('');
  const [newRole, setNewRole] = useState('Ward In-Charge');
  const [newNotes, setNewNotes] = useState('');

  const influencerList = Object.values(influencers);

  const handleCreateNew = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim() || !newMobile.trim()) return;

    const newInf: Influencer = {
      id: `inf_${Date.now()}`,
      name: newName.trim(),
      mobile: newMobile.trim(),
      role: newRole.trim(),
      notes: newNotes.trim()
    };

    onAddNewInfluencer(newInf);
    onAssignInfluencer(newInf);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-sm flex items-end sm:items-center justify-center p-3 animate-in fade-in duration-150">
      <div className="bg-slate-900 border border-amber-500/40 rounded-3xl max-w-sm w-full p-5 space-y-4 shadow-2xl relative max-h-[85vh] flex flex-col">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-white bg-slate-800 p-1.5 rounded-full"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Modal Header */}
        <div className="border-b border-slate-800 pb-3">
          <div className="flex items-center gap-1.5 text-xs text-amber-400 font-bold uppercase tracking-wider">
            <UserCheck className="w-3.5 h-3.5 text-amber-400" />
            Assign Key Influencer / In-Charge
          </div>
          <h3 className="text-base font-black text-white mt-0.5 truncate">{targetName}</h3>
          <p className="text-[11px] text-slate-400 mt-0.5">
            Assign a local leader, elder, or karyakartha responsible for winning over this family/voter.
          </p>
        </div>

        {isCreatingNew ? (
          /* Form to Add New Influencer */
          <form onSubmit={handleCreateNew} className="space-y-2.5">
            <div>
              <label className="text-[10px] text-slate-400 uppercase font-bold block mb-0.5">Influencer Full Name</label>
              <input
                type="text"
                required
                value={newName}
                onChange={e => setNewName(e.target.value)}
                placeholder="e.g. Ravula Suresh, Chinnaiah"
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-1.5 text-white text-xs"
              />
            </div>

            <div>
              <label className="text-[10px] text-slate-400 uppercase font-bold block mb-0.5">Mobile Number</label>
              <input
                type="tel"
                required
                maxLength={10}
                value={newMobile}
                onChange={e => setNewMobile(e.target.value.replace(/[^0-9]/g, ''))}
                placeholder="10-digit mobile number"
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-1.5 text-white text-xs font-mono"
              />
            </div>

            <div>
              <label className="text-[10px] text-slate-400 uppercase font-bold block mb-0.5">Role / Community Position</label>
              <select
                value={newRole}
                onChange={e => setNewRole(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-1.5 text-white text-xs"
              >
                <option value="Ward Member">Ward Member</option>
                <option value="Community / Caste Elder">Community / Caste Elder</option>
                <option value="Youth Leader">Youth Leader</option>
                <option value="SHG / DWCRA Leader">SHG / DWCRA Leader</option>
                <option value="Sarpanch Associate">Sarpanch Associate</option>
                <option value="Family Elder / Head">Family Elder / Head</option>
                <option value="Active JSP Karyakartha">Active JSP Karyakartha</option>
              </select>
            </div>

            <div>
              <label className="text-[10px] text-slate-400 uppercase font-bold block mb-0.5">Notes (Optional)</label>
              <input
                type="text"
                value={newNotes}
                onChange={e => setNewNotes(e.target.value)}
                placeholder="e.g. Influences 10 houses in Temple street"
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-1.5 text-white text-xs"
              />
            </div>

            <div className="flex items-center gap-2 pt-2">
              <button
                type="button"
                onClick={() => setIsCreatingNew(false)}
                className="w-1/3 py-2 bg-slate-800 text-slate-300 font-bold rounded-xl text-xs"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="w-2/3 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black rounded-xl text-xs flex items-center justify-center gap-1 shadow-md shadow-amber-950/40"
              >
                <Plus className="w-3.5 h-3.5" />
                Add & Assign
              </button>
            </div>
          </form>
        ) : (
          /* List of Existing Influencers */
          <div className="flex-1 overflow-y-auto space-y-1.5 pr-1 divide-y divide-slate-800/40">
            {influencerList.map(inf => {
              const isSelected = inf.id === currentInfluencerId;
              return (
                <div
                  key={inf.id}
                  onClick={() => {
                    onAssignInfluencer(inf);
                    onClose();
                  }}
                  className={`p-2.5 rounded-xl transition-all cursor-pointer flex items-center justify-between border ${
                    isSelected
                      ? 'bg-amber-950/30 border-amber-500/50 text-white'
                      : 'bg-slate-950/40 border-transparent hover:bg-slate-800/40 text-slate-300'
                  }`}
                >
                  <div className="space-y-0.5 min-w-0 pr-2">
                    <div className="flex items-center gap-1.5">
                      <span className="font-extrabold text-white text-xs truncate">{inf.name}</span>
                      <span className="text-[9px] px-1.5 py-0.2 bg-slate-800 text-amber-300 rounded font-semibold">
                        {inf.role}
                      </span>
                    </div>
                    <div className="text-[10px] text-emerald-400 font-mono flex items-center gap-1">
                      <Phone className="w-2.5 h-2.5" /> {inf.mobile}
                    </div>
                    {inf.notes && <div className="text-[9px] text-slate-400 truncate">{inf.notes}</div>}
                  </div>

                  <div className="flex-shrink-0">
                    {isSelected ? (
                      <span className="w-6 h-6 rounded-full bg-emerald-500 text-slate-950 flex items-center justify-center font-bold text-xs">
                        <Check className="w-3.5 h-3.5" />
                      </span>
                    ) : (
                      <span className="px-2 py-1 bg-slate-800 hover:bg-amber-500 hover:text-slate-950 rounded-lg text-[10px] font-bold text-slate-300 transition-colors">
                        Assign
                      </span>
                    )}
                  </div>
                </div>
              );
            })}

            {currentInfluencerId && (
              <button
                onClick={() => {
                  onAssignInfluencer(null);
                  onClose();
                }}
                className="w-full py-2 bg-slate-950 text-red-400 border border-red-500/30 rounded-xl text-xs font-bold mt-2"
              >
                Remove Current Influencer
              </button>
            )}

            <button
              onClick={() => setIsCreatingNew(true)}
              className="w-full py-2.5 bg-slate-800 hover:bg-slate-700 text-amber-300 border border-slate-700 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all mt-2"
            >
              <Plus className="w-3.5 h-3.5 text-amber-400" />
              Add New Key Influencer
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
