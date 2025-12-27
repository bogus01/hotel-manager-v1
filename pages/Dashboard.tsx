
import React, { useState, useEffect, useMemo } from 'react';
import { useLocation } from 'react-router-dom';
import { 
  ArrowUpRight, 
  ArrowDownRight,
  Users, 
  BedDouble, 
  CreditCard, 
  CalendarCheck,
  TrendingUp,
  LogIn, 
  LogOut, 
  Moon,
  AlertCircle,
  Crown,
  LayoutGrid,
  BarChart3,
  Calendar,
  ChevronRight,
  Coins,
  RefreshCw,
  Search,
  Filter,
  ArrowRight,
  Table
} from 'lucide-react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  Legend,
  Cell
} from 'recharts';
import { format, addDays, isSameDay, differenceInDays, isWithinInterval, eachDayOfInterval } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Room, Reservation, ReservationStatus } from '../types';
import * as api from '../services/api';
import Header from '../components/Header';

const startOfToday = () => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
};

const StatCard = ({ title, value, change, icon, color, subtext }: { title: string, value: string, change?: string, icon: React.ReactNode, color: string, subtext: string }) => (
  <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 flex flex-col justify-between relative overflow-hidden group">
    <div className={`absolute -right-2 -top-2 opacity-5 transform rotate-12 transition-transform group-hover:scale-110`}>
        {React.cloneElement(icon as React.ReactElement, { size: 80 })}
    </div>
    <div className="flex justify-between items-start relative z-10">
      <div>
        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">{title}</p>
        <h3 className="text-3xl font-black text-slate-800 tracking-tight">{value}</h3>
      </div>
      <div className={`p-3 rounded-2xl ${color} bg-opacity-10 text-opacity-100`}>
        {React.cloneElement(icon as React.ReactElement<{ className?: string }>, { className: color.replace('bg-', 'text-'), size: 24 })}
      </div>
    </div>
    <div className="mt-4 flex items-center justify-between relative z-10">
        <div className="flex items-center text-xs">
            {change && (
                <span className={`${change.startsWith('+') ? 'text-emerald-500' : 'text-red-500'} flex items-center font-black mr-2`}>
                    {change.startsWith('+') ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />} {change}
                </span>
            )}
            <span className="text-slate-400 font-bold uppercase text-[9px] tracking-tighter">{subtext}</span>
        </div>
    </div>
  </div>
);

const HouseStatusWidget = ({ arrivals, departures, stays, dirty }: { arrivals: number, departures: number, stays: number, dirty: number }) => (
    <div className="bg-[#0f172a] text-white p-6 rounded-[2.5rem] shadow-xl border border-white/5 flex flex-col h-full">
        <h3 className="text-sm font-black uppercase tracking-[0.2em] text-indigo-400 mb-6 flex items-center gap-2">
            <LayoutGrid size={16}/> État de la Maison
        </h3>
        <div className="space-y-4 flex-1">
            <div className="flex justify-between items-center bg-white/5 p-3 rounded-2xl hover:bg-white/10 transition-colors cursor-pointer">
                <div className="flex items-center gap-3">
                    <div className="bg-emerald-50/20 p-2 rounded-xl text-emerald-400"><LogIn size={18}/></div>
                    <span className="text-xs font-bold uppercase tracking-tight">Arrivées Période</span>
                </div>
                <span className="text-xl font-black">{arrivals}</span>
            </div>
            <div className="flex justify-between items-center bg-white/5 p-3 rounded-2xl hover:bg-white/10 transition-colors cursor-pointer">
                <div className="flex items-center gap-3">
                    <div className="bg-amber-50/20 p-2 rounded-xl text-amber-400"><LogOut size={18}/></div>
                    <span className="text-xs font-bold uppercase tracking-tight">Départs Période</span>
                </div>
                <span className="text-xl font-black">{departures}</span>
            </div>
            <div className="flex justify-between items-center bg-white/5 p-3 rounded-2xl hover:bg-white/10 transition-colors cursor-pointer">
                <div className="flex items-center gap-3">
                    <div className="bg-blue-50/20 p-2 rounded-xl text-blue-400"><BedDouble size={18}/></div>
                    <span className="text-xs font-bold uppercase tracking-tight">Nuitées Total</span>
                </div>
                <span className="text-xl font-black">{stays}</span>
            </div>
            <div className="flex justify-between items-center bg-white/5 p-3 rounded-2xl hover:bg-white/10 transition-colors cursor-pointer">
                <div className="flex items-center gap-3">
                    <div className="bg-red-50/20 p-2 rounded-xl text-red-400"><AlertCircle size={18}/></div>
                    <span className="text-xs font-bold uppercase tracking-tight">À nettoyer (Sales)</span>
                </div>
                <span className="text-xl font-black text-red-400">{dirty}</span>
            </div>
        </div>
        <div className="mt-6 pt-4 border-t border-white/10 flex justify-between items-center">
            <span className="text-[10px] font-black text-indigo-300 uppercase tracking-widest">Client VIP</span>
            <div className="flex items-center gap-1 text-amber-400 font-black"><Crown size={14}/> 0</div>
        </div>
    </div>
);

const Dashboard: React.FC = () => {
  const [rooms, setRooms] = useState<Room[]>([]);
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [loading, setLoading] = useState(true);
  
  const location = useLocation();
  const searchParams = new URLSearchParams(location.search);
  const fromReports = searchParams.get('from') === 'reports';

  const [dateRange, setDateRange] = useState({
      start: format(startOfToday(), 'yyyy-MM-dd'),
      end: format(addDays(startOfToday(), 6), 'yyyy-MM-dd')
  });

  const loadData = () => {
    setLoading(true);
    Promise.all([api.fetchRooms(), api.fetchReservations()]).then(([r, res]) => {
      setRooms(r);
      setReservations(res);
      setLoading(false);
    });
  };

  useEffect(() => { loadData(); }, []);

  const startDate = useMemo(() => new Date(dateRange.start), [dateRange.start]);
  const endDate = useMemo(() => new Date(dateRange.end), [dateRange.end]);
  const daysInPeriod = useMemo(() => differenceInDays(endDate, startDate) + 1, [startDate, endDate]);

  const bobData = useMemo(() => {
    if (daysInPeriod <= 0) return [];
    const data = [];
    const interval = eachDayOfInterval({ start: startDate, end: endDate });
    for (const date of interval) {
        const dailyRes = reservations.filter(r => r.status !== ReservationStatus.CANCELLED && r.checkIn.getTime() <= date.getTime() && r.checkOut.getTime() > date.getTime());
        const revenue = dailyRes.reduce((acc, curr) => acc + curr.baseRate, 0);
        const occupancy = Math.round((dailyRes.length / (rooms.length || 1)) * 100);
        data.push({ date: format(date, 'dd MMM', { locale: fr }), revenue, occupancy, rooms: dailyRes.length, fullDate: date });
    }
    return data;
  }, [rooms, reservations, startDate, endDate, daysInPeriod]);

  const stats = useMemo(() => {
    const totalPossibleNights = (rooms.length || 0) * daysInPeriod;
    let totalOccupiedNights = 0;
    let totalRoomRevenue = 0;
    const interval = eachDayOfInterval({ start: startDate, end: endDate });
    interval.forEach(date => {
        const dailyRes = reservations.filter(r => r.status !== ReservationStatus.CANCELLED && r.checkIn.getTime() <= date.getTime() && r.checkOut.getTime() > date.getTime());
        totalOccupiedNights += dailyRes.length;
        totalRoomRevenue += dailyRes.reduce((acc, curr) => acc + curr.baseRate, 0);
    });
    const occ = totalPossibleNights > 0 ? Math.round((totalOccupiedNights / totalPossibleNights) * 100) : 0;
    const arr = totalOccupiedNights > 0 ? totalRoomRevenue / totalOccupiedNights : 0;
    const revpar = totalPossibleNights > 0 ? totalRoomRevenue / totalPossibleNights : 0;
    const arrivals = reservations.filter(r => r.status !== ReservationStatus.CANCELLED && r.checkIn.getTime() >= startDate.getTime() && r.checkIn.getTime() <= endDate.getTime()).length;
    const departures = reservations.filter(r => r.status !== ReservationStatus.CANCELLED && r.checkOut.getTime() >= startDate.getTime() && r.checkOut.getTime() <= endDate.getTime()).length;
    const dirty = rooms.filter(r => r.status === 'A nettoyer').length;
    return { occ, rev: totalRoomRevenue, arr, revpar, arrivals, departures, stays: totalOccupiedNights, dirty };
  }, [rooms, reservations, startDate, endDate, daysInPeriod]);

  const chartData = useMemo(() => {
      const roomTypes: string[] = Array.from(new Set(rooms.map(r => r.type)));
      return bobData.map(d => {
          const entry: any = { name: d.date };
          roomTypes.forEach(type => {
              const count = reservations.filter(r => r.status !== ReservationStatus.CANCELLED && rooms.find(rm => rm.id === r.roomId)?.type === type && r.checkIn.getTime() <= d.fullDate.getTime() && r.checkOut.getTime() > d.fullDate.getTime()).length;
              entry[type] = count;
          });
          return entry;
      });
  }, [rooms, reservations, bobData]);

  const COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ec4899', '#8b5cf6', '#06b6d4'];

  if (loading) return <div className="h-screen bg-slate-50 flex items-center justify-center font-black text-slate-300 animate-pulse uppercase tracking-[0.3em]">Chargement...</div>;

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col font-sans antialiased text-slate-900">
      <Header 
        title="Statistiques & Occupation" 
        backLink={fromReports ? "/reports" : "/"} 
        backLabel={fromReports ? "Rapports" : "Menu Principal"}
      />
      
      <div className="bg-white border-b border-slate-100 px-8 py-3 sticky top-16 z-30 shadow-sm flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-4">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Période d'analyse :</span>
              <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200">
                  <div className="flex items-center gap-2 px-3 py-1">
                      <Calendar size={14} className="text-slate-400" />
                      <input type="date" value={dateRange.start} onChange={(e) => setDateRange({...dateRange, start: e.target.value})} className="bg-transparent text-xs font-bold text-slate-700 focus:outline-none"/>
                  </div>
                  <ArrowRight size={14} className="text-slate-300 mx-2" />
                  <div className="flex items-center gap-2 px-3 py-1">
                      <Calendar size={14} className="text-slate-400" />
                      <input type="date" value={dateRange.end} onChange={(e) => setDateRange({...dateRange, end: e.target.value})} className="bg-transparent text-xs font-bold text-slate-700 focus:outline-none"/>
                  </div>
              </div>
              <button onClick={loadData} className="bg-indigo-600 text-white p-2 rounded-xl hover:bg-indigo-700 transition-all shadow-md shadow-indigo-100"><RefreshCw size={16} /></button>
          </div>
          <div className="flex items-center gap-3">
              <div className="relative">
                  <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input type="text" placeholder="Chercher client..." className="pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold focus:ring-2 focus:ring-indigo-500 outline-none w-48"/>
              </div>
          </div>
      </div>

      <div className="flex-1 p-8 space-y-8 max-w-[1600px] mx-auto w-full">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <StatCard title="Occupation" value={`${stats.occ}%`} change="+2.4%" subtext={`SUR ${daysInPeriod} JOURS`} icon={<TrendingUp />} color="bg-indigo-600" />
          <StatCard title="ADR" value={`${Math.round(stats.arr)} €`} change="+5 €" subtext="PRIX MOYEN" icon={<Coins />} color="bg-emerald-500" />
          <StatCard title="RevPAR" value={`${Math.round(stats.revpar)} €`} change="+12%" subtext="PERFORMANCE" icon={<BarChart3 />} color="bg-purple-600" />
          <StatCard title="Revenu Hébergement" value={`${Math.round(stats.rev)} €`} change="+1.2k €" subtext="TOTAL HT" icon={<CreditCard />} color="bg-blue-600" />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch">
            <div className="lg:col-span-3"><HouseStatusWidget arrivals={stats.arrivals} departures={stats.departures} stays={stats.stays} dirty={stats.dirty} /></div>
            <div className="lg:col-span-6 bg-white p-8 rounded-[2.5rem] shadow-sm border border-slate-200 flex flex-col">
                <div className="flex justify-between items-center mb-8">
                    <div><h3 className="text-lg font-black text-slate-800 uppercase tracking-tight">Analyse par Catégorie</h3><p className="text-xs text-slate-400 font-bold uppercase tracking-widest mt-1">Nbre chambres occupées • {daysInPeriod} j.</p></div>
                </div>
                <div className="flex-1 h-80 min-h-[320px]">
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={chartData} margin={{top: 10, right: 10, left: -20, bottom: 0}}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                            <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 10, fontWeight: 800}} />
                            <YAxis axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 10, fontWeight: 800}} />
                            <Tooltip cursor={{fill: '#f8fafc'}} contentStyle={{borderRadius: '20px', border: 'none', boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)', padding: '15px'}}/>
                            <Legend iconType="circle" wrapperStyle={{paddingTop: '20px', fontSize: '10px', fontWeight: '800', textTransform: 'uppercase'}} />
                            {Array.from(new Set(rooms.map(r => r.type))).map((type, index) => (<Bar key={type} dataKey={type} stackId="a" fill={COLORS[index % COLORS.length]} radius={[4, 4, 4, 4]} barSize={35} />))}
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </div>
            <div className="lg:col-span-3 bg-white p-6 rounded-[2.5rem] shadow-sm border border-slate-200 overflow-hidden flex flex-col">
                <h3 className="text-sm font-black uppercase tracking-[0.2em] text-slate-400 mb-6 px-2">Business on Books</h3>
                <div className="flex-1 overflow-auto">
                    <table className="w-full text-left">
                        <thead className="bg-slate-50 text-[9px] font-black uppercase text-slate-400 sticky top-0"><tr><th className="p-3">Date</th><th className="p-3 text-right">Revenu</th><th className="p-3 text-right">Occ.</th></tr></thead>
                        <tbody className="divide-y divide-slate-100">{bobData.map((d, i) => (<tr key={i} className="hover:bg-slate-50 transition-colors"><td className="p-3 text-xs font-black text-slate-700">{d.date}</td><td className="p-3 text-right text-xs font-bold text-emerald-600">{d.revenue} €</td><td className="p-3 text-right"><div className="flex items-center justify-end gap-2"><span className="text-xs font-black text-slate-800">{d.occupancy}%</span><div className="w-1.5 h-6 bg-slate-100 rounded-full overflow-hidden"><div className="bg-indigo-600 w-full" style={{ height: `${d.occupancy}%`, marginTop: `${100 - d.occupancy}%` }}></div></div></div></td></tr>))}</tbody>
                    </table>
                </div>
            </div>
        </div>

        {/* SECTION RÉTABLIE : GRILLE DE DISPONIBILITÉ DÉTAILLÉE */}
        <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-slate-200">
            <div className="flex justify-between items-center mb-8">
                <div>
                    <h3 className="text-lg font-black text-slate-800 uppercase tracking-tight flex items-center gap-2">
                        <Table size={20} className="text-indigo-600" /> Analyse de Disponibilité
                    </h3>
                    <p className="text-xs text-slate-400 font-bold uppercase tracking-widest mt-1">Nombre d'unités restantes à vendre par jour</p>
                </div>
                <div className="flex gap-2">
                    <button className="px-4 py-2 border rounded-xl text-[10px] font-black uppercase hover:bg-slate-50 transition-all">Imprimer</button>
                    <button className="px-4 py-2 bg-indigo-600 text-white rounded-xl text-[10px] font-black uppercase shadow-lg shadow-indigo-100 transition-all">Exporter Excel</button>
                </div>
            </div>

            <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse min-w-[800px]">
                    <thead>
                        <tr className="bg-slate-50 border-b-2 border-slate-100">
                            <th className="p-4 text-[10px] font-black uppercase text-slate-400 tracking-widest w-64 sticky left-0 bg-slate-50 z-10 shadow-[2px_0_5px_rgba(0,0,0,0.05)]">Type de Chambre</th>
                            {bobData.map((d, i) => (
                                <th key={i} className={`p-4 text-center border-l border-slate-100 ${isSameDay(d.fullDate, startOfToday()) ? 'bg-indigo-50/50' : ''}`}>
                                    <span className="block text-[9px] font-black text-slate-400 uppercase tracking-tighter">{d.date.split(' ')[1]}</span>
                                    <span className="block text-lg font-black text-slate-800">{d.date.split(' ')[0]}</span>
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {Array.from(new Set(rooms.map(r => r.type))).map((type) => {
                            const totalOfType = rooms.filter(r => r.type === type).length;
                            return (
                                <tr key={type} className="hover:bg-slate-50/50 transition-colors">
                                    <td className="p-4 font-black text-slate-700 text-sm uppercase tracking-tighter sticky left-0 bg-white z-10 shadow-[2px_0_5px_rgba(0,0,0,0.02)]">{type}</td>
                                    {bobData.map((d, i) => {
                                        const occupiedCount = reservations.filter(r => 
                                            r.status !== ReservationStatus.CANCELLED &&
                                            rooms.find(rm => rm.id === r.roomId)?.type === type &&
                                            r.checkIn.getTime() <= d.fullDate.getTime() && 
                                            r.checkOut.getTime() > d.fullDate.getTime()
                                        ).length;
                                        const available = totalOfType - occupiedCount;
                                        return (
                                            <td key={i} className={`p-4 text-center border-l border-slate-50 transition-all ${isSameDay(d.fullDate, startOfToday()) ? 'bg-indigo-50/20' : ''}`}>
                                                <div className={`py-2 rounded-xl font-black text-lg ${available === 0 ? 'text-red-400 bg-red-50/50 border border-red-100' : 'text-emerald-600 bg-emerald-50/50 border border-emerald-100'}`}>
                                                    {available}
                                                </div>
                                            </td>
                                        );
                                    })}
                                </tr>
                            );
                        })}
                        <tr className="bg-[#0f172a] text-white font-black">
                            <td className="p-5 text-[11px] uppercase tracking-[0.2em] text-indigo-400 sticky left-0 bg-[#0f172a] z-10">Total à Vendre</td>
                            {bobData.map((d, i) => {
                                const totalFree = rooms.length - d.rooms;
                                return (
                                    <td key={i} className="p-5 text-center text-xl border-l border-white/5">
                                        {totalFree}
                                    </td>
                                );
                            })}
                        </tr>
                    </tbody>
                </table>
            </div>
        </div>

      </div>
    </div>
  );
};

export default Dashboard;
