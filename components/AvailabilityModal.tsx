
import React, { useState, useMemo } from 'react';
import { X, ChevronLeft, ChevronRight, ChevronDown, Hotel, Info, Clock, CheckCircle2 } from 'lucide-react';
// Fixed: Removed startOfToday from date-fns import
import { format, addDays } from 'date-fns';
import fr from 'date-fns/locale/fr';
import { Room, Reservation, ReservationStatus } from '../types';

// Fixed: Added local startOfToday helper to replace missing date-fns export
const startOfToday = () => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
};

interface AvailabilityModalProps {
  isOpen: boolean;
  onClose: () => void;
  rooms: Room[];
  reservations: Reservation[];
}

const AvailabilityModal: React.FC<AvailabilityModalProps> = ({ isOpen, onClose, rooms, reservations }) => {
  const [startDate, setStartDate] = useState(startOfToday());
  const [expandedTypes, setExpandedTypes] = useState<Record<string, boolean>>({});

  const daysToShow = 12;
  const calendarDays = useMemo(() => {
    const days = [];
    for (let i = 0; i < daysToShow; i++) {
      days.push(addDays(startDate, i));
    }
    return days;
  }, [startDate]);

  const roomsByType = useMemo(() => {
    const grouped: Record<string, Room[]> = {};
    rooms.forEach(r => {
      if (!grouped[r.type]) grouped[r.type] = [];
      grouped[r.type].push(r);
    });
    return grouped;
  }, [rooms]);

  if (!isOpen) return null;

  const toggleType = (type: string) => {
    setExpandedTypes(prev => ({ ...prev, [type]: !prev[type] }));
  };

  const getReservationAtDate = (roomId: string, date: Date) => {
    return reservations.find(res => 
      res.roomId === roomId && 
      res.status !== ReservationStatus.CANCELLED &&
      res.checkIn.getTime() <= date.getTime() && 
      res.checkOut.getTime() > date.getTime()
    );
  };

  const getAvailableCountForType = (typeRooms: Room[], date: Date) => {
    return typeRooms.filter(r => !getReservationAtDate(r.id, date)).length;
  };

  // Calcul du total global disponible par jour (toutes catégories confondues)
  const getGlobalTotalAvailable = (date: Date) => {
    return rooms.filter(r => !getReservationAtDate(r.id, date)).length;
  };

  const handleNavigate = (direction: 'prev' | 'next') => {
    setStartDate(prev => addDays(prev, direction === 'prev' ? -daysToShow : daysToShow));
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-6xl h-[85vh] flex flex-col overflow-hidden border border-white/20">
        
        {/* Header de la Modal */}
        <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-white shrink-0 z-[60]">
          <div className="flex items-center gap-4">
            <div className="bg-indigo-600 text-white p-3 rounded-2xl shadow-lg shadow-indigo-100">
              <Hotel size={24} />
            </div>
            <div>
              <h2 className="text-xl font-black text-slate-800 uppercase tracking-tight">Vente & Disponibilités</h2>
              <p className="text-[10px] text-slate-400 font-black uppercase tracking-[0.2em] mt-0.5">Consultation de l'inventaire temps réel</p>
            </div>
          </div>
          
          <div className="flex items-center gap-6">
            <div className="hidden md:flex items-center gap-6 border-r pr-6 mr-2 border-slate-100">
               <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-emerald-500 rounded-sm shadow-sm"></div>
                  <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Disponible</span>
               </div>
               <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-amber-400 rounded-sm shadow-sm"></div>
                  <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Option</span>
               </div>
               <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-slate-300 rounded-sm shadow-sm"></div>
                  <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Occupé</span>
               </div>
            </div>
            <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-full transition-all text-slate-400 hover:rotate-90">
              <X size={24} />
            </button>
          </div>
        </div>

        {/* Navigation Calendrier */}
        <div className="px-6 py-4 bg-white border-b border-slate-100 flex items-center justify-between shrink-0 z-50">
            <div className="flex gap-2">
                <button 
                    onClick={() => handleNavigate('prev')}
                    className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-xl font-black text-[10px] uppercase tracking-widest text-slate-600 hover:bg-indigo-600 hover:text-white transition-all shadow-sm active:scale-95"
                >
                    <ChevronLeft size={16} /> Précédent
                </button>
                <button 
                    onClick={() => handleNavigate('next')}
                    className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-xl font-black text-[10px] uppercase tracking-widest text-slate-600 hover:bg-indigo-600 hover:text-white transition-all shadow-sm active:scale-95"
                >
                    Suivant <ChevronRight size={16} />
                </button>
            </div>
            
            <div className="bg-white px-4 py-2 rounded-xl border border-slate-200 shadow-sm flex items-center gap-3">
                <Clock size={16} className="text-indigo-500" />
                <span className="text-sm font-black text-slate-700 uppercase tracking-tighter">
                    Période du {format(startDate, 'dd MMMM yyyy', { locale: fr })}
                </span>
            </div>

            <button onClick={() => setStartDate(startOfToday())} className="text-[10px] font-black text-indigo-600 hover:text-indigo-800 uppercase tracking-widest px-4">Aujourd'hui</button>
        </div>

        {/* Grille principale */}
        <div className="flex-1 overflow-auto bg-slate-100/50">
            <table className="w-full border-separate border-spacing-0 table-fixed">
                <thead className="sticky top-0 z-[100]">
                    <tr>
                        <th className="w-64 p-4 bg-white border-b border-r border-slate-100 text-left sticky left-0 z-[110] shadow-[2px_0_5px_rgba(0,0,0,0.05)]">
                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Catégories</span>
                        </th>
                        {calendarDays.map((day, i) => (
                            <th key={i} className={`p-3 border-b border-r text-center transition-colors border-slate-100 ${i === 0 ? 'bg-indigo-100 shadow-inner' : 'bg-white'}`}>
                                <p className="text-[9px] font-black text-slate-400 uppercase tracking-tighter mb-1">{format(day, 'eee', { locale: fr })}</p>
                                <p className={`text-sm font-black leading-none ${i === 0 ? 'text-indigo-700' : 'text-slate-800'}`}>{format(day, 'dd')}</p>
                                <p className="text-[9px] font-bold text-slate-400 uppercase">{format(day, 'MMM', { locale: fr })}</p>
                            </th>
                        ))}
                    </tr>
                </thead>
                <tbody className="bg-white">
                    {Object.entries(roomsByType).map(([type, roomsList]) => {
                        const typeRooms = roomsList as Room[];
                        const isExpanded = expandedTypes[type];
                        
                        return (
                            <React.Fragment key={type}>
                                <tr className="group">
                                    <td className="p-4 border-b border-r border-slate-100 sticky left-0 bg-white z-[90] shadow-[2px_0_5px_rgba(0,0,0,0.02)] group-hover:bg-slate-50 transition-colors">
                                        <button 
                                            onClick={() => toggleType(type)}
                                            className="flex items-center gap-3 w-full text-left"
                                        >
                                            <div className={`p-1.5 rounded-lg transition-all ${isExpanded ? 'bg-indigo-600 text-white rotate-180' : 'bg-slate-100 text-slate-400'}`}>
                                                <ChevronDown size={14}/>
                                            </div>
                                            <div>
                                                <p className="font-black text-slate-800 text-xs uppercase tracking-tight leading-none mb-1">{type}</p>
                                                <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">{typeRooms.length} unités</p>
                                            </div>
                                        </button>
                                    </td>
                                    {calendarDays.map((day, i) => {
                                        const available = getAvailableCountForType(typeRooms, day);
                                        return (
                                            <td key={i} className={`p-2 border-b border-r border-slate-100 text-center transition-all ${i === 0 ? 'bg-indigo-50/20' : ''}`}>
                                                <div className={`h-10 rounded-xl flex items-center justify-center font-black text-base transition-all ${available > 0 ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/20 scale-105' : 'bg-slate-100 text-slate-300'}`}>
                                                    {available}
                                                </div>
                                            </td>
                                        );
                                    })}
                                </tr>
                                
                                {isExpanded && typeRooms.map(room => (
                                    <tr key={room.id} className="animate-in slide-in-from-top-1 duration-200 bg-slate-50/30">
                                        <td className="p-3 pl-12 border-b border-r border-slate-100 sticky left-0 bg-white z-[80] shadow-[2px_0_5px_rgba(0,0,0,0.02)]">
                                            <div className="flex items-center justify-between pr-2">
                                                <p className="font-black text-slate-700 text-sm">{room.number}</p>
                                                <span className="text-[8px] font-black text-slate-300 uppercase">CH</span>
                                            </div>
                                        </td>
                                        {calendarDays.map((day, i) => {
                                            const res = getReservationAtDate(room.id, day);
                                            let cellClass = "bg-emerald-100 border-emerald-200/50";
                                            if (res) {
                                                if (res.status === ReservationStatus.OPTION) {
                                                    cellClass = "bg-amber-400 shadow-inner ring-1 ring-amber-500/20";
                                                } else {
                                                    cellClass = "bg-slate-300 shadow-inner ring-1 ring-slate-400/20";
                                                }
                                            }

                                            return (
                                                <td key={i} className={`p-1.5 border-b border-r border-slate-100 ${i === 0 ? 'bg-indigo-50/10' : ''}`}>
                                                    <div 
                                                        title={res ? `${res.status} - ${res.clientName}` : 'Disponible'}
                                                        className={`h-8 rounded-lg transition-all border-2 ${cellClass}`}
                                                    />
                                                </td>
                                            );
                                        })}
                                    </tr>
                                ))}
                            </React.Fragment>
                        );
                    })}
                </tbody>
                {/* LIGNE DE RÉCAPITULATIF (TOTAL DISPONIBLE) */}
                <tfoot className="sticky bottom-0 z-[100] shadow-[0_-10px_20px_rgba(0,0,0,0.1)]">
                    <tr className="bg-[#0f172a] text-white font-black">
                        <td className="p-5 sticky left-0 bg-[#0f172a] z-[110] border-r border-white/10">
                            <span className="text-[11px] uppercase tracking-[0.2em] text-indigo-400">Total à Vendre</span>
                        </td>
                        {calendarDays.map((day, i) => {
                            const totalFree = getGlobalTotalAvailable(day);
                            return (
                                <td key={i} className={`p-5 text-center text-xl border-r border-white/5 ${i === 0 ? 'bg-indigo-900/50' : ''}`}>
                                    {totalFree}
                                </td>
                            );
                        })}
                    </tr>
                </tfoot>
            </table>
        </div>
        
        <div className="px-8 py-4 bg-white border-t border-slate-100 flex justify-between items-center shrink-0 z-[110]">
            <div className="flex items-center gap-2 text-blue-600">
                <Info size={16} />
                <p className="text-[10px] font-black uppercase tracking-widest">Calculé selon les réservations fermes et les options actives</p>
            </div>
            <div className="flex gap-6">
                <div className="flex items-center gap-2">
                    <CheckCircle2 size={14} className="text-emerald-500" />
                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Données synchronisées</span>
                </div>
            </div>
        </div>
      </div>
    </div>
  );
};

export default AvailabilityModal;
