
import React, { useState, useEffect, useMemo } from 'react';
import { 
  Search, Plus, Filter, Eye, Edit, Trash2, ChevronLeft, ChevronRight, 
  Printer, LogIn, LogOut, Users, Calendar, AlertCircle, XCircle, 
  Clock, Download, CheckCircle2, History, BedDouble, FileText,
  ArrowRight, LayoutList
} from 'lucide-react';
import { Reservation, ReservationStatus, Room, CurrencySettings } from '../types';
import * as api from '../services/api';
import { format, isSameDay, isBefore, startOfToday } from 'date-fns';
import fr from 'date-fns/locale/fr';
import Header from '../components/Header';
import NewReservationModal from '../components/NewReservationModal';
import ReservationModal from '../components/ReservationModal';
import { formatPrice } from '../utils/currency';

type StayTab = 'ARRIVALS' | 'DEPARTURES' | 'IN_HOUSE' | 'ALL_ACTIVE' | 'PENDING_OUT' | 'CANCELLED';

const ITEMS_PER_PAGE = 50;

const Reservations: React.FC = () => {
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [currency, setCurrency] = useState<CurrencySettings | null>(null);
  const [activeTab, setActiveTab] = useState<StayTab>('ARRIVALS');
  const [currentPage, setCurrentPage] = useState(1);
  const [loading, setLoading] = useState(true);

  // Modals
  const [isNewModalOpen, setIsNewModalOpen] = useState(false);
  const [selectedRes, setSelectedRes] = useState<Reservation | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  const today = startOfToday();

  const fetchData = () => {
      setLoading(true);
      Promise.all([
          api.fetchReservations(), 
          api.fetchRooms(),
          api.fetchCurrencySettings()
      ]).then(([res, r, curr]) => {
          setReservations(res);
          setRooms(r);
          setCurrency(curr);
          setLoading(false);
      });
  };

  useEffect(() => {
    fetchData();
  }, []);

  const filteredReservations = useMemo(() => {
      const base = reservations;
      switch (activeTab) {
          case 'ARRIVALS': return base.filter(r => isSameDay(r.checkIn, today) && r.status !== ReservationStatus.CANCELLED);
          case 'DEPARTURES': return base.filter(r => isSameDay(r.checkOut, today) && r.status !== ReservationStatus.CANCELLED);
          case 'IN_HOUSE': return base.filter(r => r.status === ReservationStatus.CHECKED_IN);
          case 'ALL_ACTIVE': return base.filter(r => r.status !== ReservationStatus.CANCELLED);
          case 'PENDING_OUT': return base.filter(r => isBefore(r.checkOut, today) && r.status === ReservationStatus.CHECKED_IN);
          case 'CANCELLED': return base.filter(r => r.status === ReservationStatus.CANCELLED);
          default: return base;
      }
  }, [reservations, activeTab, today]);

  const totalPages = Math.ceil(filteredReservations.length / ITEMS_PER_PAGE);
  const paginatedReservations = filteredReservations.slice(
      (currentPage - 1) * ITEMS_PER_PAGE, 
      currentPage * ITEMS_PER_PAGE
  );

  const counters = useMemo(() => ({
      ARRIVALS: reservations.filter(r => isSameDay(r.checkIn, today) && r.status !== ReservationStatus.CANCELLED).length,
      DEPARTURES: reservations.filter(r => isSameDay(r.checkOut, today) && r.status !== ReservationStatus.CANCELLED).length,
      IN_HOUSE: reservations.filter(r => r.status === ReservationStatus.CHECKED_IN).length,
      PENDING_OUT: reservations.filter(r => isBefore(r.checkOut, today) && r.status === ReservationStatus.CHECKED_IN).length,
  }), [reservations, today]);

  const handleEdit = (res: Reservation) => {
      setSelectedRes(res);
      setIsEditModalOpen(true);
  };

  const getStatusBadge = (status: ReservationStatus) => {
    const styles = {
      [ReservationStatus.CONFIRMED]: 'bg-blue-50 text-blue-700 border-blue-200',
      [ReservationStatus.CHECKED_IN]: 'bg-emerald-50 text-emerald-700 border-emerald-200',
      [ReservationStatus.CHECKED_OUT]: 'bg-slate-100 text-slate-500 border-slate-200',
      [ReservationStatus.OPTION]: 'bg-amber-50 text-amber-700 border-amber-200',
      [ReservationStatus.CANCELLED]: 'bg-red-50 text-red-600 border-red-200',
    };
    return (
      <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase border tracking-widest ${styles[status] || 'bg-gray-100'}`}>
        {status}
      </span>
    );
  };

  const getRoomNumber = (roomId: string) => rooms.find(r => r.id === roomId)?.number || '??';

  if (loading) return <div className="h-screen bg-slate-50 flex items-center justify-center font-black text-slate-300 animate-pulse uppercase tracking-[0.3em]">Synchronisation du registre...</div>;

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans text-slate-900 print:bg-white">
      <Header title="Registre de séjour" actions={
          <div className="flex items-center gap-2 no-print">
            <button onClick={() => window.print()} className="bg-white hover:bg-slate-50 text-slate-700 px-4 py-2 rounded-lg border border-slate-300 flex items-center gap-2 text-[10px] font-black uppercase tracking-widest transition-all">
                <Printer size={14} /> Imprimer
            </button>
            <button onClick={() => setIsNewModalOpen(true)} className="bg-indigo-600 text-white px-5 py-2 rounded-lg flex items-center gap-2 hover:bg-indigo-700 transition text-[10px] font-black uppercase tracking-widest">
                <Plus size={14} /> Nouveau Dossier
            </button>
          </div>
      } />

      <main className="flex-1 px-4 md:px-8 py-8 space-y-6 max-w-7xl mx-auto w-full">
        <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden no-print">
            <div className="flex flex-col lg:flex-row">
                <div className="flex-1 flex overflow-x-auto border-slate-100">
                    {[
                        { id: 'ARRIVALS', label: 'Arrivées du jour', icon: <LogIn size={14}/>, count: counters.ARRIVALS },
                        { id: 'DEPARTURES', label: 'Départs du jour', icon: <LogOut size={14}/>, count: counters.DEPARTURES },
                        { id: 'IN_HOUSE', label: 'En séjour', icon: <BedDouble size={14}/>, count: counters.IN_HOUSE },
                        { id: 'ALL_ACTIVE', label: 'Registre complet', icon: <LayoutList size={14}/> },
                        { id: 'PENDING_OUT', label: 'En retard', icon: <Clock size={14}/>, count: counters.PENDING_OUT },
                        { id: 'CANCELLED', label: 'Annulés', icon: <XCircle size={14}/> }
                    ].map((tab) => (
                        <button key={tab.id} onClick={() => { setActiveTab(tab.id as StayTab); setCurrentPage(1); }} className={`flex-1 flex items-center justify-center gap-2 px-6 py-3.5 transition-all border-b-2 whitespace-nowrap ${activeTab === tab.id ? `bg-slate-50 border-indigo-600 text-indigo-700` : `bg-white border-transparent text-slate-400 hover:text-slate-600 hover:bg-slate-50/50`}`}>
                            <span className={activeTab === tab.id ? 'text-indigo-600' : 'text-slate-300'}>{tab.icon}</span>
                            <span className="text-[10px] font-black uppercase tracking-widest">{tab.label}</span>
                            {tab.count !== undefined && tab.count > 0 && <span className={`ml-2 px-1.5 py-0.5 rounded text-[9px] font-black ${activeTab === tab.id ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-500'}`}>{tab.count}</span>}
                        </button>
                    ))}
                </div>
            </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex flex-col min-h-[500px] print:border-none print:shadow-none">
            <div className="p-5 border-b border-slate-100 flex justify-between items-end bg-slate-50/30">
                <div>
                    <h3 className="text-sm font-bold text-slate-800 uppercase tracking-tight flex items-center gap-2"><FileText size={16} className="text-indigo-600 no-print" />{activeTab === 'ARRIVALS' && "Arrivées attendues ce jour"}{activeTab === 'DEPARTURES' && "Départs prévus ce jour"}{activeTab === 'IN_HOUSE' && "Main Courante des Occupants"}{activeTab === 'ALL_ACTIVE' && "Registre complet des séjours"}{activeTab === 'PENDING_OUT' && "Dossiers en souffrance (Départ non fait)"}{activeTab === 'CANCELLED' && "Journal des dossiers annulés"}</h3>
                    <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest mt-0.5">Consolidation du {format(today, 'dd MMMM yyyy', { locale: fr })} • {filteredReservations.length} Dossiers</p>
                </div>
            </div>

            <div className="overflow-x-auto flex-1">
                <table className="w-full text-left text-sm border-collapse">
                    <thead className="bg-slate-50 text-[10px] font-black uppercase text-slate-400 tracking-widest border-b border-slate-100">
                        <tr>
                            <th className="px-6 py-3 w-20">Unit.</th>
                            <th className="px-6 py-3">Client / Occupant</th>
                            <th className="px-6 py-3">Séjour</th>
                            <th className="px-6 py-3 text-center">Pax</th>
                            <th className="px-6 py-3 text-right">Montant</th>
                            <th className="px-6 py-3 text-center">Statut</th>
                            <th className="px-6 py-3 text-right no-print">Action</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {paginatedReservations.map((res) => (
                            <tr key={res.id} className="hover:bg-slate-50/80 transition-colors group">
                                <td className="px-6 py-3"><div className="w-8 h-8 bg-white border border-slate-200 rounded-lg flex items-center justify-center font-bold text-slate-700 text-xs shadow-sm group-hover:border-indigo-300 group-hover:bg-indigo-50/30 transition-all tabular-nums">{getRoomNumber(res.roomId)}</div></td>
                                <td className="px-6 py-3"><div className="font-bold text-slate-800 uppercase tracking-tight text-xs">{res.clientName}</div>{res.occupantName && res.occupantName !== res.clientName && <div className="text-[8px] text-slate-400 font-bold uppercase tracking-widest mt-0.5 italic">{res.occupantName}</div>}</td>
                                <td className="px-6 py-3"><div className="flex items-center gap-2 text-xs text-slate-500 font-medium"><span className="tabular-nums">{format(res.checkIn, 'dd/MM/yy')}</span><ArrowRight size={10} className="text-slate-300" /><span className="tabular-nums">{format(res.checkOut, 'dd/MM/yy')}</span></div></td>
                                <td className="px-6 py-3 text-center"><span className="inline-flex items-center justify-center min-w-[20px] h-5 px-1 rounded bg-slate-100 text-slate-500 font-bold text-[9px] border border-slate-200">{res.adults + (res.children || 0)}</span></td>
                                <td className="px-6 py-3 text-right font-bold text-slate-700 text-xs tabular-nums">{formatPrice(res.totalPrice, currency)}</td>
                                <td className="px-6 py-3 text-center">{getStatusBadge(res.status)}</td>
                                <td className="px-6 py-3 text-right no-print"><button onClick={() => handleEdit(res)} className="p-1.5 hover:bg-indigo-600 hover:text-white text-slate-300 rounded transition-all"><Eye size={16} /></button></td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
            {totalPages > 1 && (
                <div className="p-4 border-t border-slate-100 bg-slate-50/50 flex flex-col sm:flex-row justify-between items-center gap-4 no-print">
                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-2">{filteredReservations.length} dossiers au total</span>
                    <div className="flex gap-1 mr-2"><button onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))} disabled={currentPage === 1} className="p-1.5 bg-white border border-slate-200 rounded hover:bg-slate-50 disabled:opacity-30 transition-all shadow-sm"><ChevronLeft size={14} /></button><div className="px-3 flex items-center justify-center bg-white border border-slate-200 rounded font-black text-[9px] text-slate-500">{currentPage} / {totalPages}</div><button onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))} disabled={currentPage === totalPages} className="p-1.5 bg-white border border-slate-200 rounded hover:bg-slate-50 disabled:opacity-30 transition-all shadow-sm"><ChevronRight size={14} /></button></div>
                </div>
            )}
        </div>
      </main>

      <NewReservationModal isOpen={isNewModalOpen} onClose={() => setIsNewModalOpen(false)} onSuccess={() => { fetchData(); setIsNewModalOpen(false); }} rooms={rooms} existingReservations={reservations} initialData={null} />
      {isEditModalOpen && selectedRes && (
          <ReservationModal reservation={selectedRes} allReservations={reservations} isOpen={isEditModalOpen} onClose={() => setIsEditModalOpen(false)} rooms={rooms} onSave={async (updated) => { if (updated) await api.updateReservation(updated); fetchData(); setIsEditModalOpen(false); return true; }} />
      )}
    </div>
  );
};

export default Reservations;
