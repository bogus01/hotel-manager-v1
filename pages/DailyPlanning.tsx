
import React, { useMemo, useState, useEffect } from 'react';
import { 
    ArrowRight, 
    ArrowLeft, 
    LogIn, 
    LogOut, 
    BedDouble, 
    Calendar,
    ChevronRight,
    RefreshCw,
    Printer,
    Users,
    DoorOpen,
    Info,
    Activity,
    TrendingUp,
    Coins,
    BarChart3
} from 'lucide-react';
import { 
    BarChart, 
    Bar, 
    XAxis, 
    YAxis, 
    CartesianGrid, 
    Tooltip, 
    ResponsiveContainer,
    Cell,
    LabelList
} from 'recharts';
import { format, isSameDay, addDays, differenceInDays } from 'date-fns';
import fr from 'date-fns/locale/fr';
import Header from '../components/Header';
import { Reservation, ReservationStatus, Room, RoomStatus } from '../types';
import * as api from '../services/api';
import ReservationModal from '../components/ReservationModal';

const startOfToday = () => {
    const d = new Date();
    d.setHours(0,0,0,0);
    return d;
};

const DailyPlanning: React.FC = () => {
  const [date, setDate] = useState(startOfToday());
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'arrivals' | 'departures' | 'stay'>('arrivals');
  const [selectedRes, setSelectedRes] = useState<Reservation | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const loadData = () => {
    setLoading(true);
    Promise.all([api.fetchReservations(), api.fetchRooms()]).then(([res, r]) => {
        setReservations(res);
        setRooms(r);
        setLoading(false);
    });
  };

  useEffect(() => {
    loadData();
  }, []);

  const openReservation = (res: Reservation) => {
    setSelectedRes(res);
    setIsModalOpen(true);
  };

  const stats = useMemo(() => {
    const totalRooms = rooms.length;
    const dirty = rooms.filter(r => r.status === RoomStatus.DIRTY).length;
    const clean = rooms.filter(r => r.status === RoomStatus.CLEAN).length;
    const maintenance = rooms.filter(r => r.status === RoomStatus.MAINTENANCE).length;
    const roomsToSell = totalRooms - maintenance;

    const inHouse = reservations.filter(r => 
        r.status !== ReservationStatus.CANCELLED &&
        r.checkIn.getTime() <= date.getTime() && 
        r.checkOut.getTime() > date.getTime()
    );

    const occupiedRooms = inHouse.length;
    const availableRooms = Math.max(0, roomsToSell - occupiedRooms);
    const occupancyRate = roomsToSell > 0 ? Math.round((occupiedRooms / roomsToSell) * 100) : 0;
    const dailyRevenue = inHouse.reduce((acc, r) => acc + r.baseRate, 0);

    const dayArrivals = reservations.filter(r => isSameDay(r.checkIn, date) && r.status !== ReservationStatus.CANCELLED);
    const paxArrivals = dayArrivals.reduce((acc, r) => acc + (r.adults + (r.children || 0)), 0);
    const arrivalsCheckedIn = dayArrivals.filter(r => r.status === ReservationStatus.CHECKED_IN).length;

    const dayDepartures = reservations.filter(r => isSameDay(r.checkOut, date) && r.status !== ReservationStatus.CANCELLED);
    const paxDepartures = dayDepartures.reduce((acc, r) => acc + (r.adults + (r.children || 0)), 0);

    const roomTypes = Array.from(new Set(rooms.map(r => r.type)));
    const categoryStats = roomTypes.map(type => {
        const total = rooms.filter(r => r.type === type).length;
        const occupied = inHouse.filter(res => rooms.find(room => room.id === res.roomId)?.type === type).length;
        return {
            name: type,
            total,
            occupied,
            available: Math.max(0, total - occupied),
            rate: total > 0 ? Math.round((occupied / total) * 100) : 0,
            label: `${occupied}`
        };
    });

    return { 
        totalRooms, dirty, clean, maintenance, roomsToSell,
        occupiedRooms, availableRooms, occupancyRate, dailyRevenue,
        arrivalsExpected: dayArrivals.length, paxArrivals, arrivalsCheckedIn,
        departuresExpected: dayDepartures.length, paxDepartures,
        individualCount: inHouse.filter(r => reservations.filter(x => x.clientId === r.clientId).length === 1).length,
        groupCount: inHouse.filter(r => reservations.filter(x => x.clientId === r.clientId).length > 1).length,
        categoryStats,
        arrivalsList: dayArrivals,
        departuresList: dayDepartures,
        stayList: inHouse.filter(r => !isSameDay(r.checkIn, date))
    };
  }, [rooms, reservations, date]);

  const COLORS = ['#4f46e5', '#10b981', '#f59e0b', '#ec4899', '#8b5cf6', '#06b6d4'];

  if (loading) return (
    <div className="h-screen bg-white flex items-center justify-center font-bold text-slate-400 animate-pulse text-lg uppercase tracking-widest">
        Génération de la Main Courante...
    </div>
  );

  return (
    <div className="min-h-screen flex flex-col bg-slate-100 font-sans print:bg-white text-slate-900 antialiased">
      <Header title="Main Courante d'Exploitation" actions={
          <button onClick={() => window.print()} className="bg-slate-800 hover:bg-slate-700 text-white px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-widest flex items-center gap-2 transition-all no-print shadow-sm">
              <Printer size={16} /> Imprimer le Rapport
          </button>
      } />
      
      <main className="flex-1 max-w-7xl mx-auto w-full p-6 space-y-6">
        
        {/* CONTRÔLES DE DATE ET KPI RAPIDES */}
        <div className="flex flex-col md:flex-row justify-between items-center no-print gap-4">
            <div className="flex items-center gap-2 bg-white p-1 rounded-xl border border-slate-200 shadow-sm">
                <button onClick={() => setDate(addDays(date, -1))} className="p-2 hover:bg-slate-100 rounded-lg text-slate-400 transition-colors"><ArrowLeft size={20}/></button>
                <div className="flex items-center gap-3 px-4 border-x border-slate-100">
                    <Calendar size={18} className="text-indigo-600" />
                    <span className="font-bold text-base capitalize min-w-[200px] text-center text-slate-700">
                        {format(date, 'EEEE d MMMM yyyy', { locale: fr })}
                    </span>
                </div>
                <button onClick={() => setDate(addDays(date, 1))} className="p-2 hover:bg-slate-100 rounded-lg text-slate-400 transition-colors"><ArrowRight size={20}/></button>
            </div>

            <div className="flex gap-3">
                <div className="bg-white px-5 py-2.5 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4">
                    <TrendingUp size={18} className="text-indigo-600" />
                    <div>
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Occupation</p>
                        <p className="text-lg font-black text-slate-800">{stats.occupancyRate}%</p>
                    </div>
                </div>
                <div className="bg-white px-5 py-2.5 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4">
                    <Coins size={18} className="text-emerald-600" />
                    <div>
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">C.A. Hébergement</p>
                        <p className="text-lg font-black text-slate-800">{stats.dailyRevenue.toFixed(2)} €</p>
                    </div>
                </div>
                <button onClick={loadData} className="p-3 bg-white border border-slate-200 rounded-xl text-slate-400 hover:text-indigo-600 transition-all shadow-sm active:scale-95"><RefreshCw size={20}/></button>
            </div>
        </div>

        {/* 1. ÉTAT DE L'ÉTABLISSEMENT */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
                <h3 className="text-sm font-black text-slate-700 flex items-center gap-2">
                    <Info size={16} className="text-indigo-600" /> 
                    État de l'établissement : <span className="text-white bg-indigo-600 px-3 py-1 rounded-full ml-1 font-black shadow-sm">{stats.totalRooms} chambres</span>
                </h3>
                <span className="text-[10px] font-bold text-slate-300 uppercase tracking-widest">Mise à jour en temps réel</span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 divide-x divide-slate-100">
                {/* Colonne 1: Disponibilité & Occupation */}
                <div className="p-6 space-y-3">
                    <div className="flex justify-between items-center text-sm">
                        <span className="font-bold text-slate-500">Chambres disponibles</span>
                        <span className="font-black text-emerald-600">{stats.availableRooms}</span>
                    </div>
                    <div className="flex justify-between items-center text-sm">
                        <span className="font-bold text-slate-500">Chambres occupées</span>
                        <span className="font-black text-slate-900">{stats.occupiedRooms}</span>
                    </div>
                </div>
                {/* Colonne 2: Segments */}
                <div className="p-6 space-y-3">
                    <div className="flex justify-between items-center text-sm">
                        <span className="font-bold text-slate-500">Chambre individuelle</span>
                        <span className="font-black text-slate-900">{stats.individualCount}</span>
                    </div>
                    <div className="flex justify-between items-center text-sm">
                        <span className="font-bold text-slate-500">Chambre groupée</span>
                        <span className="font-black text-slate-900">{stats.groupCount}</span>
                    </div>
                </div>
                {/* Colonne 3: Gouvernante */}
                <div className="p-6 space-y-3 bg-slate-50/30">
                    <div className="flex justify-between items-center text-sm">
                        <span className="font-bold text-slate-500">Chambre propre</span>
                        <span className="font-black text-emerald-600">{stats.clean}</span>
                    </div>
                    <div className="flex justify-between items-center text-sm">
                        <span className="font-bold text-slate-500">Chambre sale</span>
                        <span className="font-black text-red-500">{stats.dirty}</span>
                    </div>
                </div>
            </div>
        </div>

        {/* 2. SYNTHÈSE DES MOUVEMENTS */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
                <h3 className="text-xs font-black uppercase tracking-widest text-slate-500 flex items-center gap-2">
                    <Activity size={16} className="text-indigo-600" /> 2. Mouvements du jour
                </h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 divide-x divide-slate-100">
                <div className="p-6 text-center space-y-1">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Check-in attendus</p>
                    <p className="text-3xl font-black text-slate-900">{stats.arrivalsExpected}</p>
                    <p className="text-[11px] font-bold text-slate-400">{stats.paxArrivals}</p>
                </div>
                <div className="p-6 text-center space-y-1">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Check-in réalisés</p>
                    <p className="text-3xl font-black text-emerald-600">{stats.arrivalsCheckedIn}</p>
                    <p className="text-[10px] font-bold text-emerald-500/50 uppercase tracking-tighter">Mise à jour PMS</p>
                </div>
                <div className="p-6 text-center space-y-1">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Check-out prévus</p>
                    <p className="text-3xl font-black text-slate-900">{stats.departuresExpected}</p>
                    <p className="text-[11px] font-bold text-slate-400">{stats.paxDepartures}</p>
                </div>
            </div>
        </div>

        {/* 3. ANALYSE PAR CATÉGORIE & VENTES */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            
            {/* GRAPHIQUE */}
            <div className="lg:col-span-5 bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
                <div className="px-6 py-4 border-b border-slate-100">
                    <h3 className="text-xs font-black uppercase tracking-widest text-slate-500 flex items-center gap-2">
                        <BarChart3 size={16} className="text-indigo-600" /> Occupation par catégorie
                    </h3>
                </div>
                <div className="flex-1 p-6 h-64 min-h-[300px]">
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={stats.categoryStats} layout="vertical" margin={{ left: 20, right: 60, top: 10, bottom: 10 }}>
                            <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="#f1f5f9" />
                            <XAxis type="number" domain={[0, 100]} hide />
                            <YAxis 
                                dataKey="name" 
                                type="category" 
                                axisLine={false} 
                                tickLine={false} 
                                width={110}
                                tick={{ fill: '#64748b', fontSize: 11, fontWeight: 700 }}
                            />
                            <Tooltip 
                                cursor={{ fill: '#f8fafc' }}
                                contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)', fontSize: '11px' }}
                            />
                            <Bar dataKey="rate" radius={[0, 4, 4, 0]} barSize={24}>
                                {stats.categoryStats.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                ))}
                                <LabelList 
                                    dataKey="label" 
                                    position="right" 
                                    style={{ fill: '#64748b', fontSize: '11px', fontWeight: 'bold', fontFamily: 'monospace' }} 
                                    offset={10}
                                />
                            </Bar>
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </div>

            {/* TABLEAU DES DISPONIBILITÉS */}
            <div className="lg:col-span-7 bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
                <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
                    <h3 className="text-xs font-black uppercase tracking-widest text-slate-500 flex items-center gap-2">
                        <DoorOpen size={16} className="text-emerald-600" /> Inventaire ventes restantes
                    </h3>
                    <span className="text-[10px] font-bold bg-emerald-50 text-emerald-700 px-3 py-1 rounded border border-emerald-100 uppercase tracking-widest">En vente</span>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-[13px] border-collapse">
                        <thead className="bg-slate-50 border-b border-slate-100">
                            <tr>
                                <th className="px-6 py-4 font-black uppercase text-slate-400 tracking-wider text-[10px]">Catégorie</th>
                                <th className="px-6 py-4 text-center font-black uppercase text-slate-400 tracking-wider text-[10px]">Occupé</th>
                                <th className="px-6 py-4 text-center font-black uppercase text-slate-400 tracking-wider text-[10px]">TO %</th>
                                <th className="px-6 py-4 text-right font-black uppercase text-slate-400 tracking-wider text-[10px]">Reste à vendre</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50 text-slate-700">
                            {stats.categoryStats.map((cat, idx) => (
                                <tr key={idx} className="hover:bg-slate-50/50 transition-colors">
                                    <td className="px-6 py-4 font-bold uppercase tracking-tight text-slate-800">{cat.name}</td>
                                    <td className="px-6 py-4 text-center font-bold">{cat.occupied}</td>
                                    <td className="px-6 py-4 text-center">
                                        <div className="flex items-center justify-center gap-2">
                                            <div className="w-16 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                                                <div className="h-full bg-indigo-500" style={{ width: `${cat.rate}%` }}></div>
                                            </div>
                                            <span className="font-bold text-slate-400 w-8">{cat.rate}%</span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <span className={`inline-block px-3 py-1 rounded-lg font-black text-sm border ${cat.available > 0 ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-red-50 text-red-600 border-red-200'}`}>
                                            {cat.available}
                                        </span>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                        <tfoot className="bg-[#0f172a] text-white font-black">
                            <tr>
                                <td className="px-6 py-4 text-[10px] uppercase tracking-widest text-indigo-400">Total hôtel</td>
                                <td className="px-6 py-4 text-center">{stats.occupiedRooms}</td>
                                <td className="px-6 py-4 text-center text-indigo-300">{stats.occupancyRate}%</td>
                                <td className="px-6 py-4 text-right text-lg text-emerald-400">{stats.availableRooms}</td>
                            </tr>
                        </tfoot>
                    </table>
                </div>
            </div>
        </div>

        {/* 4. LISTES DÉTAILLÉES */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden flex flex-col min-h-[500px]">
            <div className="flex border-b border-slate-100 no-print bg-slate-50/50">
                <button onClick={() => setActiveTab('arrivals')} className={`flex-1 py-4 text-[11px] font-black uppercase tracking-widest flex items-center justify-center gap-3 border-b-4 transition-all ${activeTab === 'arrivals' ? 'border-indigo-600 text-indigo-600 bg-white' : 'border-transparent text-slate-400 hover:text-slate-600 hover:bg-white/50'}`}>
                    <LogIn size={18} /> Check-in ({stats.arrivalsExpected})
                </button>
                <button onClick={() => setActiveTab('departures')} className={`flex-1 py-4 text-[11px] font-black uppercase tracking-widest flex items-center justify-center gap-3 border-b-4 transition-all ${activeTab === 'departures' ? 'border-indigo-600 text-indigo-600 bg-white' : 'border-transparent text-slate-400 hover:text-slate-600 hover:bg-white/50'}`}>
                    <LogOut size={18} /> Check-out ({stats.departuresExpected})
                </button>
                <button onClick={() => setActiveTab('stay')} className={`flex-1 py-4 text-[11px] font-black uppercase tracking-widest flex items-center justify-center gap-3 border-b-4 transition-all ${activeTab === 'stay' ? 'border-indigo-600 text-indigo-600 bg-white' : 'border-transparent text-slate-400 hover:text-slate-600 hover:bg-white/50'}`}>
                    <BedDouble size={18} /> En recouche ({stats.stayList.length})
                </button>
            </div>

            <div className="flex-1 overflow-x-auto">
                <table className="w-full text-left text-[13px] border-collapse">
                    <thead className="bg-slate-50 border-b border-slate-100">
                        <tr>
                            <th className="px-6 py-4 w-24 font-black text-[10px] uppercase text-slate-400 tracking-wider">Chambre</th>
                            <th className="px-6 py-4 font-black text-[10px] uppercase text-slate-400 tracking-wider">Client / occupant</th>
                            <th className="px-6 py-4 font-black text-[10px] uppercase text-slate-400 tracking-wider">Séjour</th>
                            <th className="px-6 py-4 text-center font-black text-[10px] uppercase text-slate-400 tracking-wider">Volume</th>
                            <th className="px-6 py-4 font-black text-[10px] uppercase text-slate-400 tracking-wider">Régime</th>
                            <th className="px-6 py-4 text-right font-black text-[10px] uppercase text-slate-400 tracking-wider">Solde</th>
                            <th className="px-6 py-4 text-center font-black text-[10px] uppercase text-slate-400 tracking-wider">Statut</th>
                            <th className="px-6 py-4 w-12 no-print"></th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                        {(() => {
                            const list = activeTab === 'arrivals' ? stats.arrivalsList : activeTab === 'departures' ? stats.departuresList : stats.stayList;
                            if (list.length === 0) return (
                                <tr>
                                    <td colSpan={8} className="px-6 py-20 text-center text-slate-300 italic font-bold uppercase tracking-widest text-xs">
                                        Aucun dossier trouvé
                                    </td>
                                </tr>
                            );
                            
                            return list.map(res => {
                                const room = rooms.find(r => r.id === res.roomId);
                                const totalPaid = res.payments.reduce((a,p)=>a+p.amount, 0) + (res.depositAmount || 0);
                                const balance = res.totalPrice - totalPaid;
                                
                                return (
                                    <tr key={res.id} className="hover:bg-indigo-50/30 transition-colors group">
                                        <td className="px-6 py-4">
                                            <span className="font-bold text-slate-900 bg-slate-100 px-2 py-1 rounded border border-slate-200">
                                                {room?.number || '??'}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="font-bold text-slate-800 uppercase tracking-tighter truncate max-w-[200px]">
                                                {res.occupantName || res.clientName}
                                            </div>
                                            <div className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-0.5">{room?.type}</div>
                                        </td>
                                        <td className="px-6 py-4 font-bold text-slate-600">
                                            {format(res.checkIn, 'dd/MM')} <ArrowRight size={10} className="inline opacity-20"/> {format(res.checkOut, 'dd/MM')}
                                            <span className="ml-2 text-slate-400 italic">({differenceInDays(res.checkOut, res.checkIn)})</span>
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            <div className="flex items-center justify-center gap-1.5 font-bold text-slate-700">
                                                <Users size={14} className="text-slate-300"/> {res.adults + (res.children || 0)}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className="text-[10px] font-black bg-slate-100 text-slate-600 px-2 py-0.5 rounded border border-slate-200 uppercase tracking-widest">
                                                {res.boardType?.split(' ')[0] || 'RO'}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-right font-bold tabular-nums">
                                            <span className={balance > 0.05 ? 'text-red-500' : 'text-emerald-600'}>
                                                {balance.toFixed(2)}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            <span className={`px-2 py-1 rounded-full text-[10px] font-black uppercase border tracking-tighter
                                                ${res.status === ReservationStatus.CHECKED_IN ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 
                                                  res.status === ReservationStatus.CHECKED_OUT ? 'bg-slate-100 text-slate-500 border-slate-200' : 
                                                  'bg-white text-indigo-600 border-indigo-200'}
                                            `}>
                                                {res.status}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-right no-print">
                                            <button 
                                                onClick={() => openReservation(res)}
                                                className="p-1.5 hover:bg-indigo-600 hover:text-white text-slate-300 rounded-lg transition-all"
                                            >
                                                <ChevronRight size={20} />
                                            </button>
                                        </td>
                                    </tr>
                                );
                            });
                        })()}
                    </tbody>
                </table>
            </div>
            
            <div className="hidden print:block p-8 border-t border-slate-100 bg-slate-50">
                <div className="flex justify-between items-center text-[10px] text-slate-400 font-bold uppercase tracking-widest">
                    <p>Hôtel Manager PMS - Main Courante du {format(date, 'dd/MM/yyyy')}</p>
                    <p>Document généré le {format(new Date(), 'dd/MM/yyyy')} à {format(new Date(), 'HH:mm')}</p>
                </div>
            </div>
        </div>
      </main>
      
      {isModalOpen && selectedRes && (
          <ReservationModal 
            reservation={selectedRes} 
            allReservations={reservations} 
            isOpen={isModalOpen} 
            onClose={() => setIsModalOpen(false)} 
            rooms={rooms} 
            onSave={async (updated) => { 
                await api.updateReservationDate(updated.id, updated.checkIn, updated.checkOut, updated.roomId);
                await api.updateReservationStatus(updated.id, updated.status);
                loadData(); 
                return true; 
            }} 
          />
      )}
    </div>
  );
};

export default DailyPlanning;
