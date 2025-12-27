
import React, { useState, useEffect } from 'react';
/* Added Users to lucide-react imports */
import { X, Calendar, ArrowRight, Check, AlertTriangle, RotateCcw, Users } from 'lucide-react';
import { format, differenceInDays, isSameDay } from 'date-fns';
import fr from 'date-fns/locale/fr';
import { Reservation, Room } from '../types';

interface GroupUpdateModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (selectedIds: string[]) => void;
  sourceReservation: Reservation;
  siblings: Reservation[];
  newDate: Date;
  direction: 'left' | 'right';
  rooms: Room[];
}

const GroupUpdateModal: React.FC<GroupUpdateModalProps> = ({ 
  isOpen, 
  onClose, 
  onConfirm, 
  sourceReservation, 
  siblings, 
  newDate,
  direction,
  rooms 
}) => {
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  useEffect(() => {
    if (isOpen) {
      setSelectedIds(siblings.map(r => r.id));
    }
  }, [isOpen, siblings]);

  if (!isOpen) return null;

  const toggleId = (id: string) => {
    setSelectedIds(prev => 
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const getRoomNumber = (id: string) => rooms.find(r => r.id === id)?.number || '??';
  
  const oldDate = direction === 'left' ? sourceReservation.checkIn : sourceReservation.checkOut;
  const daysDiff = differenceInDays(newDate, oldDate);
  const isExtension = direction === 'right' ? daysDiff > 0 : daysDiff < 0;

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center bg-slate-900/60 backdrop-blur-md p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-[2rem] shadow-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh] border border-white/20">
        
        <div className="bg-indigo-600 p-6 text-white flex justify-between items-center shrink-0">
          <div>
            <h3 className="font-black text-lg flex items-center gap-3 uppercase tracking-tight">
                <Calendar size={22} /> Modification Groupée
            </h3>
            <p className="text-[10px] font-bold text-indigo-200 uppercase tracking-widest mt-0.5">Dossier : {sourceReservation.clientName}</p>
          </div>
          <button onClick={onClose} className="hover:bg-white/20 p-2 rounded-full transition-colors"><X size={20}/></button>
        </div>

        <div className="p-8 flex-1 overflow-y-auto space-y-6">
          <div className="bg-indigo-50 border-2 border-indigo-100 rounded-3xl p-6">
            <p className="text-xs text-indigo-800 font-black uppercase tracking-wider mb-4">
              Nouvelle date de {direction === 'left' ? "l'arrivée" : 'départ'} :
            </p>
            <div className="flex items-center gap-4">
                <div className="flex-1 bg-white p-3 rounded-2xl border border-indigo-200 text-slate-400 font-bold text-sm line-through text-center">
                    {format(oldDate, 'dd MMM yyyy', { locale: fr })}
                </div>
                <div className="bg-indigo-600 p-2 rounded-full shadow-lg shadow-indigo-100">
                    <ArrowRight size={16} className="text-white"/>
                </div>
                <div className="flex-1 bg-white p-3 rounded-2xl border-2 border-indigo-500 text-indigo-700 font-black text-sm shadow-md text-center">
                    {format(newDate, 'dd MMM yyyy', { locale: fr })}
                </div>
            </div>
            <div className="mt-4 flex justify-center">
                <span className={`text-[10px] font-black uppercase px-3 py-1 rounded-full border ${isExtension ? 'bg-emerald-100 text-emerald-700 border-emerald-200' : 'bg-amber-100 text-amber-700 border-amber-200'}`}>
                    {isExtension ? 'Prolongation du séjour' : 'Raccourcissement du séjour'}
                </span>
            </div>
          </div>

          <div>
              <h4 className="font-black text-slate-800 text-sm uppercase tracking-tight mb-4 flex items-center gap-2">
                <Users size={18} className="text-indigo-600"/> Synchroniser le groupe ?
              </h4>
              <div className="space-y-2">
                {siblings.map(res => (
                    <div 
                        key={res.id} 
                        onClick={() => toggleId(res.id)}
                        className={`
                            p-4 rounded-2xl border-2 cursor-pointer flex justify-between items-center transition-all
                            ${selectedIds.includes(res.id) 
                                ? 'bg-indigo-50 border-indigo-500 shadow-sm' 
                                : 'bg-white border-slate-100 hover:border-slate-200'
                            }
                        `}
                    >
                        <div className="flex items-center gap-4">
                            <div className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-colors ${selectedIds.includes(res.id) ? 'bg-indigo-600 border-indigo-600 shadow-sm' : 'bg-white border-slate-200'}`}>
                                {selectedIds.includes(res.id) && <Check size={14} className="text-white" strokeWidth={4} />}
                            </div>
                            <div>
                                <span className="font-black text-slate-800 text-sm uppercase tracking-tighter">Chambre {getRoomNumber(res.roomId)}</span>
                                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{res.occupantName}</div>
                            </div>
                        </div>
                        <div className="text-right">
                            <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{direction === 'left' ? 'Arrivée' : 'Départ'} actuel</div>
                            <div className="text-xs font-bold text-slate-600">{format(direction === 'left' ? res.checkIn : res.checkOut, 'dd/MM')}</div>
                        </div>
                    </div>
                ))}
              </div>
          </div>
        </div>

        <div className="p-8 bg-slate-50 border-t flex flex-col gap-4 shrink-0">
            <div className="flex justify-between items-center">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">
                    Impact : {selectedIds.length + 1} réservation(s)
                </span>
                <button 
                    onClick={onClose} 
                    className="flex items-center gap-2 text-red-500 hover:text-red-700 text-[10px] font-black uppercase tracking-widest"
                >
                    <RotateCcw size={14} /> Annuler l'action
                </button>
            </div>
            
            <div className="flex gap-3">
                <button 
                    onClick={() => onConfirm([])} 
                    className="flex-1 py-4 bg-white border-2 border-slate-200 text-slate-600 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-100 transition-all shadow-sm"
                >
                    Juste {getRoomNumber(sourceReservation.roomId)}
                </button>
                <button 
                    onClick={() => onConfirm(selectedIds)} 
                    className="flex-[2] bg-indigo-600 text-white py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-indigo-700 shadow-xl shadow-indigo-100 transition-all active:scale-95 flex items-center justify-center gap-3"
                >
                    <Check size={18} strokeWidth={3} /> Appliquer au groupe
                </button>
            </div>
        </div>

      </div>
    </div>
  );
};

export default GroupUpdateModal;