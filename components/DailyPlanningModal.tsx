
import React, { useMemo, useState } from 'react';
import { X, BedDouble, Users, Calculator, CalendarDays, ChevronDown, ChevronRight, ChevronLeft, Clock } from 'lucide-react';
import { format, addDays, startOfDay, differenceInDays } from 'date-fns';
import fr from 'date-fns/locale/fr';
import { Reservation, ReservationStatus, Room } from '../types';
import { useCurrency } from '../context/CurrencyContext';

interface DailyPlanningModalProps {
  isOpen: boolean;
  onClose: () => void;
  date: Date; // Date de référence (aujourd'hui)
  reservations: Reservation[];
  rooms: Room[];
}

interface AvailabilityCategory {
  total: number;
  freeRooms: Room[];
}

const DailyPlanningModal: React.FC<DailyPlanningModalProps> = ({
  isOpen,
  onClose,
  date: todayRef,
  reservations,
  rooms
}) => {
  const { formatPrice } = useCurrency();
  const [dayOffset, setDayOffset] = useState(0);
  const [expandedCategories, setExpandedCategories] = useState<Record<string, boolean>>({});

  const activeDate = useMemo(() => {
    return startOfDay(addDays(todayRef, dayOffset));
  }, [todayRef, dayOffset]);

  const occupiedStays = useMemo(() => {
    return reservations.filter(res => {
      if (res.status === ReservationStatus.CANCELLED) return false;
      return activeDate >= startOfDay(res.checkIn) && activeDate < startOfDay(res.checkOut);
    });
  }, [reservations, activeDate]);

  const occupiedRoomIds = useMemo(() => occupiedStays.map(s => s.roomId), [occupiedStays]);

  const availabilityData = useMemo<Record<string, AvailabilityCategory>>(() => {
    const categories: Record<string, AvailabilityCategory> = {};
    const allTypes = Array.from(new Set(rooms.map(r => r.type)));

    allTypes.forEach((type: string) => {
      categories[type] = { total: 0, freeRooms: [] };
    });

    rooms.forEach(room => {
      const isOccupied = occupiedRoomIds.includes(room.id);
      if (!isOccupied) {
        if (categories[room.type]) {
          categories[room.type].freeRooms.push(room);
          categories[room.type].total += 1;
        }
      }
    });

    return categories;
  }, [rooms, occupiedRoomIds]);

  if (!isOpen) return null;

  const toggleCategory = (type: string) => {
    setExpandedCategories(prev => ({ ...prev, [type]: !prev[type] }));
  };

  const handleNextDay = () => setDayOffset(prev => prev + 1);
  const handlePrevDay = () => setDayOffset(prev => prev - 1);

  return (
    <div className="fixed inset-0 z-[250] flex items-center justify-center bg-slate-900/60 backdrop-blur-md p-4 animate-in fade-in duration-200">
      <div className="bg-slate-50 rounded-3xl shadow-2xl w-full max-w-6xl h-[85vh] flex flex-col overflow-hidden border border-white/20">

        {/* HEADER */}
        <div className="bg-white px-6 py-4 flex justify-between items-center shrink-0 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="bg-indigo-600 p-2.5 rounded-xl text-white">
              <CalendarDays size={22} />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-800">Aperçu des Mouvements</h2>
              <p className="text-[11px] text-slate-400 font-bold uppercase tracking-widest">Main Courante Opérationnelle</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-full transition-colors text-slate-400">
            <X size={22} />
          </button>
        </div>

        {/* NAVIGATION DATE CENTRALE */}
        <div className="bg-white border-b border-slate-100 px-6 py-5 flex items-center justify-between shrink-0">
          <button
            onClick={handlePrevDay}
            className="flex items-center gap-2 px-5 py-2.5 hover:bg-slate-50 rounded-xl border border-slate-200 text-slate-500 hover:text-indigo-600 transition-all text-sm font-bold"
          >
            <ChevronLeft size={20} />
            Jour Précédent
          </button>

          <div className="flex flex-col items-center">
            <div className="flex items-center gap-3 text-indigo-700 bg-indigo-50 px-8 py-2.5 rounded-full border border-indigo-100 shadow-sm">
              <Clock size={18} />
              <h3 className="text-base font-bold uppercase tracking-wide">
                Situation du {format(activeDate, 'EEEE d MMMM yyyy', { locale: fr })}
              </h3>
            </div>
            {dayOffset !== 0 && (
              <button
                onClick={() => setDayOffset(0)}
                className="mt-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-widest hover:text-indigo-600 transition-colors"
              >
                Revenir à aujourd'hui
              </button>
            )}
          </div>

          <button
            onClick={handleNextDay}
            className="flex items-center gap-2 px-5 py-2.5 hover:bg-slate-50 rounded-xl border border-slate-200 text-slate-500 hover:text-indigo-600 transition-all text-sm font-bold"
          >
            Jour Suivant
            <ChevronRight size={20} />
          </button>
        </div>

        {/* MAIN CONTENT AREA */}
        <div className="flex-1 overflow-y-auto p-6 space-y-8">

          {/* SECTION DISPONIBILITÉS */}
          <div className="space-y-4">
            <h3 className="text-[11px] font-bold uppercase tracking-widest text-slate-400 flex items-center gap-2 px-2">
              <Calculator size={16} className="text-indigo-500" /> Disponibilités par Catégorie
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {(Object.entries(availabilityData) as [string, AvailabilityCategory][]).map(([type, data]) => {
                const isExpanded = expandedCategories[type];
                return (
                  <div key={type} className={`bg-white rounded-2xl border transition-all duration-200 ${isExpanded ? 'border-indigo-200 shadow-md ring-2 ring-indigo-50/50' : 'border-slate-200 shadow-sm'}`}>
                    <button
                      onClick={() => toggleCategory(type)}
                      className="w-full flex items-center justify-between p-5 hover:bg-slate-50 transition-colors rounded-2xl"
                    >
                      <div className="flex items-center gap-4">
                        <div className={`p-2.5 rounded-lg ${data.total > 0 ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-500'}`}>
                          <BedDouble size={20} />
                        </div>
                        <div className="text-left">
                          <h4 className="font-bold text-slate-800 text-sm uppercase tracking-tight">{type}</h4>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className={`px-4 py-1.5 rounded-lg font-bold text-lg ${data.total > 0 ? 'bg-emerald-500 text-white shadow-sm' : 'bg-red-100 text-red-500'}`}>
                          {data.total}
                        </div>
                        <ChevronDown size={18} className={`text-slate-300 transition-transform duration-300 ${isExpanded ? 'rotate-180' : ''}`} />
                      </div>
                    </button>

                    {isExpanded && (
                      <div className="px-5 pb-5 pt-1 bg-slate-50/30 border-t border-slate-50 animate-in slide-in-from-top-1 duration-200">
                        <div className="grid grid-cols-4 gap-2.5">
                          {data.freeRooms.map(room => (
                            <div key={room.id} className="bg-white px-2 py-2.5 rounded-lg border border-slate-100 shadow-sm flex flex-col items-center">
                              <span className="text-[8px] font-bold text-slate-300 uppercase">CH</span>
                              <span className="font-bold text-slate-700 text-base">{room.number}</span>
                            </div>
                          ))}
                          {data.total === 0 && (
                            <div className="col-span-4 py-3 text-center">
                              <p className="text-[10px] font-bold text-red-400 uppercase italic">Aucune unité disponible</p>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* SECTION SÉJOURS */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
              <h3 className="text-[11px] font-bold uppercase tracking-widest text-slate-500 flex items-center gap-2">
                <Users size={16} className="text-indigo-500" /> Dossiers Présents ({occupiedStays.length})
              </h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm border-collapse">
                <thead className="bg-white">
                  <tr className="text-[10px] font-bold uppercase text-slate-400 tracking-wider">
                    <th className="px-6 py-4 border-b border-slate-100">Unité</th>
                    <th className="px-6 py-4 border-b border-slate-100">Type</th>
                    <th className="px-6 py-4 border-b border-slate-100">État</th>
                    <th className="px-6 py-4 border-b border-slate-100">Occupant / Client</th>
                    <th className="px-6 py-4 border-b border-slate-100 text-center">Restant</th>
                    <th className="px-6 py-4 border-b border-slate-100 text-right">Solde Dû</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {occupiedStays.map(res => {
                    const room = rooms.find(r => r.id === res.roomId);
                    const nightsRemaining = differenceInDays(res.checkOut, activeDate);
                    const totalPaid = res.payments.reduce((a, p) => a + p.amount, 0) + (res.depositAmount || 0);
                    const balance = res.totalPrice - totalPaid;

                    return (
                      <tr key={res.id} className="hover:bg-slate-50/50 transition-colors">
                        <td className="px-6 py-4">
                          <span className="font-bold text-slate-700 bg-slate-100 px-2.5 py-1 rounded border border-slate-200">{room?.number}</span>
                        </td>
                        <td className="px-6 py-4 text-slate-400 font-semibold uppercase text-[10px]">{room?.type}</td>
                        <td className="px-6 py-4">
                          <span className={`px-2.5 py-1 rounded-full text-[9px] font-bold uppercase border tracking-tight
                              ${res.status === ReservationStatus.CHECKED_IN ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-white text-indigo-600 border-indigo-200'}
                           `}>
                            {res.status}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <div className="font-bold text-slate-800 uppercase tracking-tight text-[13px]">{res.occupantName}</div>
                          <div className="text-[10px] text-slate-400">{res.clientName}</div>
                        </td>
                        <td className="px-6 py-4 text-center">
                          <span className="font-bold text-indigo-600 text-sm">{Math.max(0, nightsRemaining)} <span className="text-[9px] uppercase">nuits</span></span>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <span className={`font-bold text-[13px] ${balance > 0.05 ? 'text-red-500' : 'text-emerald-600'}`}>
                            {formatPrice(balance)}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                  {occupiedStays.length === 0 && (
                    <tr>
                      <td colSpan={6} className="px-6 py-16 text-center text-slate-300 italic font-bold uppercase text-[11px]">
                        Aucun mouvement à afficher pour cette date
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

        </div>

        {/* FOOTER ACTIONS */}
        <div className="bg-white border-t border-slate-100 px-8 py-5 flex justify-between items-center shrink-0">
          <div className="flex items-center gap-8">
            <div className="flex items-center gap-2.5 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
              <div className="w-3 h-3 bg-emerald-500 rounded-full shadow-sm"></div> UNITÉ DISPONIBLE
            </div>
            <div className="flex items-center gap-2.5 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
              <div className="w-3 h-3 bg-indigo-500 rounded-full shadow-sm"></div> DOSSIER EN COURS
            </div>
          </div>
          <button
            onClick={onClose}
            className="bg-slate-900 text-white px-10 py-3 rounded-2xl font-bold uppercase text-[11px] tracking-widest hover:bg-slate-800 transition-all active:scale-95 shadow-lg shadow-slate-200"
          >
            Fermer l'aperçu
          </button>
        </div>

      </div>
    </div>
  );
};

export default DailyPlanningModal;
