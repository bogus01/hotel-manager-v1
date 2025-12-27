
import React, { useState, useEffect, useMemo } from 'react';
import { 
    FileText, 
    Calendar, 
    ArrowRight, 
    Printer, 
    Download, 
    Search,
    TrendingUp,
    Briefcase,
    BedDouble,
    Utensils,
    PieChart,
    Filter,
    ArrowUpDown
} from 'lucide-react';
// Fixed: Removed startOfMonth from date-fns import
import { format, isWithinInterval, endOfMonth } from 'date-fns';
import fr from 'date-fns/locale/fr';
import Header from '../components/Header';
import { Reservation, ReservationStatus, Room } from '../types';
import * as api from '../services/api';

// Fixed: Added local startOfMonth helper to replace missing date-fns export
const startOfMonth = (date: Date) => {
    return new Date(date.getFullYear(), date.getMonth(), 1);
};

interface SalesLine {
    date: Date;
    client: string;
    label: string;
    category: 'Hébergement' | 'Extra' | 'Restauration';
    ht: number;
    tvaRate: number;
    tvaAmount: number;
    ttc: number;
    ref: string;
}

const ReportsSalesJournal: React.FC = () => {
  const [dateRange, setDateRange] = useState({
    start: format(startOfMonth(new Date()), 'yyyy-MM-dd'),
    end: format(endOfMonth(new Date()), 'yyyy-MM-dd')
  });
  
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<'all' | 'Hébergement' | 'Extra' | 'Restauration'>('all');

  useEffect(() => {
    setLoading(true);
    Promise.all([api.fetchReservations(), api.fetchRooms()]).then(([res, r]) => {
        setReservations(res);
        setRooms(r);
        setLoading(false);
    });
  }, []);

  // --- BUSINESS LOGIC: GENERATE SALES ENTRIES ---
  // Fix: Explicitly type useMemo return value to ensure correct inference in subsequent steps
  const salesJournal = useMemo<SalesLine[]>(() => {
    const lines: SalesLine[] = [];
    const start = new Date(dateRange.start);
    const end = new Date(dateRange.end);

    reservations.forEach(res => {
        if (res.status === ReservationStatus.CANCELLED) return;
        if (!isWithinInterval(res.checkOut, { start, end })) return;

        const room = rooms.find(r => r.id === res.roomId);
        const nights = Math.max(1, Math.round((res.checkOut.getTime() - res.checkIn.getTime()) / (1000 * 3600 * 24)));

        // 1. Accommodation Line (10% TVA)
        const ttcRoom = res.baseRate * nights;
        const tvaRateRoom = 0.10; 
        const htRoom = ttcRoom / (1 + tvaRateRoom);
        
        lines.push({
            date: res.checkOut,
            client: res.clientName,
            label: `Hébergement - Ch. ${room?.number || '??'} (${nights} nuits)`,
            category: 'Hébergement',
            ht: htRoom,
            tvaRate: tvaRateRoom,
            tvaAmount: ttcRoom - htRoom,
            ttc: ttcRoom,
            ref: res.id
        });

        // 2. Services Lines (20% TVA)
        res.services.forEach(svc => {
            const ttc = svc.price * svc.quantity;
            const tvaRate = 0.20; 
            const ht = ttc / (1 + tvaRate);

            lines.push({
                date: res.checkOut,
                client: res.clientName,
                label: `Extra: ${svc.name}`,
                category: svc.name.toLowerCase().includes('petit') || svc.name.toLowerCase().includes('repas') ? 'Restauration' : 'Extra',
                ht: ht,
                tvaRate: tvaRate,
                tvaAmount: ttc - ht,
                ttc: ttc,
                ref: `${res.id}-s`
            });
        });
    });

    return lines.sort((a,b) => b.date.getTime() - a.date.getTime());
  }, [reservations, rooms, dateRange]);

  // Fix: Explicitly type filteredSales parameter to prevent unknown property access issues
  const filteredSales = useMemo<SalesLine[]>(() => {
      return salesJournal.filter((l: SalesLine) => {
        const matchesSearch = l.client.toLowerCase().includes(search.toLowerCase()) || l.label.toLowerCase().includes(search.toLowerCase());
        const matchesCat = categoryFilter === 'all' || l.category === categoryFilter;
        return matchesSearch && matchesCat;
      });
  }, [salesJournal, search, categoryFilter]);

  // Fix: Explicitly specify generic return type and cast initial value to avoid 'unknown' type errors during reduce
  const totals = useMemo<{ ht: number; tva: number; ttc: number }>(() => {
      const initialValue = { ht: 0, tva: 0, ttc: 0 } as { ht: number; tva: number; ttc: number };
      return (filteredSales || []).reduce((acc, curr) => ({
          ht: acc.ht + curr.ht,
          tva: acc.tva + curr.tvaAmount,
          ttc: acc.ttc + curr.ttc
      }), initialValue);
  }, [filteredSales]);

  // Breakdown by category
  // Fix: Explicitly type parameters and ensure breakdown object remains typed as Record<string, number>
  const breakdown = useMemo(() => {
      const b: Record<string, number> = { 'Hébergement': 0, 'Restauration': 0, 'Extra': 0 };
      (filteredSales || []).forEach((l: SalesLine) => { 
        if (l.category in b) {
            b[l.category] += l.ttc; 
        }
      });
      return b;
  }, [filteredSales]);

  const handlePrint = () => window.print();

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
      <Header title="Journal des Ventes" backLink="/reports" backLabel="Rapports" />
      
      <main className="flex-1 max-w-7xl mx-auto w-full p-8 space-y-6">
        
        {/* FILTERS & SEARCH */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col xl:flex-row justify-between items-center gap-6 no-print">
            <div className="flex flex-wrap items-center gap-4">
                <div className="flex items-center gap-2 p-1.5 bg-slate-100 rounded-xl border border-slate-200">
                    <input 
                        type="date" 
                        className="bg-transparent border-none text-sm font-bold text-slate-700 focus:ring-0 outline-none"
                        value={dateRange.start}
                        onChange={e => setDateRange({...dateRange, start: e.target.value})}
                    />
                    <ArrowRight size={14} className="text-slate-400" />
                    <input 
                        type="date" 
                        className="bg-transparent border-none text-sm font-bold text-slate-700 focus:ring-0 outline-none"
                        value={dateRange.end}
                        onChange={e => setDateRange({...dateRange, end: e.target.value})}
                    />
                </div>

                <div className="h-8 w-px bg-slate-200 hidden lg:block"></div>

                <div className="flex items-center gap-2">
                    <Filter size={16} className="text-slate-400" />
                    <div className="flex p-1 bg-slate-100 rounded-lg border border-slate-200">
                        {['all', 'Hébergement', 'Restauration', 'Extra'].map(cat => (
                            <button
                                key={cat}
                                onClick={() => setCategoryFilter(cat as any)}
                                className={`px-3 py-1 rounded-md text-xs font-bold transition-all ${categoryFilter === cat ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                            >
                                {cat === 'all' ? 'Tout' : cat}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            <div className="flex-1 max-w-md w-full relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                <input 
                    type="text" 
                    placeholder="Chercher client, chambre, libellé..."
                    className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg bg-slate-50 text-slate-900 focus:ring-2 focus:ring-indigo-500 transition-all outline-none"
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                />
            </div>

            <div className="flex gap-2">
                <button onClick={handlePrint} className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-300 rounded-lg text-slate-700 font-bold hover:bg-slate-50 shadow-sm transition-all">
                    <Printer size={18} />
                </button>
                <button className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg font-bold hover:bg-indigo-700 shadow-md transition-all">
                    <Download size={18} /> <span className="hidden sm:inline">Excel</span>
                </button>
            </div>
        </div>

        {/* SUMMARY CARDS */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 no-print">
            <div className="bg-slate-900 text-white p-6 rounded-2xl shadow-lg relative overflow-hidden">
                 <div className="absolute -right-4 -bottom-4 opacity-10">
                     <TrendingUp size={100} />
                 </div>
                 <p className="text-slate-400 text-xs font-black uppercase tracking-widest mb-1">Chiffre d'Affaires HT</p>
                 <h3 className="text-3xl font-bold">{totals.ht.toFixed(2)} €</h3>
                 <div className="mt-4 pt-4 border-t border-slate-800 text-[10px] text-slate-500 uppercase font-bold">Base déclarative TVA</div>
            </div>

            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
                <p className="text-slate-400 text-xs font-black uppercase tracking-widest mb-1">TVA Totale</p>
                <h3 className="text-3xl font-bold text-slate-800">{totals.tva.toFixed(2)} €</h3>
                <div className="mt-4 flex flex-wrap gap-2">
                    {/* Fix: Explicitly type reduce to ensure results are treated as numbers for toFixed calls */}
                    <span className="bg-blue-50 text-blue-600 text-[10px] font-bold px-1.5 py-0.5 rounded border border-blue-100">10%: {filteredSales.filter((l: SalesLine)=>l.tvaRate===0.1).reduce<number>((a, c) => a + c.tvaAmount, 0).toFixed(0)}€</span>
                    <span className="bg-orange-50 text-orange-600 text-[10px] font-bold px-1.5 py-0.5 rounded border border-orange-100">20%: {filteredSales.filter((l: SalesLine)=>l.tvaRate===0.2).reduce<number>((a, c) => a + c.tvaAmount, 0).toFixed(0)}€</span>
                </div>
            </div>

            <div className="bg-indigo-50 border border-indigo-200 p-6 rounded-2xl shadow-sm">
                <p className="text-indigo-400 text-xs font-black uppercase tracking-widest mb-1">Total TTC</p>
                <h3 className="text-3xl font-bold text-indigo-700">{totals.ttc.toFixed(2)} €</h3>
                <p className="text-indigo-400 text-[10px] font-bold mt-4 uppercase">Total Vendu TTC</p>
            </div>

            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
                <p className="text-slate-400 text-xs font-black uppercase tracking-widest mb-1">Répartition CA</p>
                <div className="mt-2 space-y-2">
                    {Object.entries(breakdown).map(([cat, val]) => (
                        <div key={cat} className="flex items-center justify-between text-sm mb-1">
                            <span className="text-slate-600 font-medium">{cat}</span>
                            <span className="font-bold text-slate-800">{(val as number).toFixed(0)} €</span>
                        </div>
                    ))}
                </div>
            </div>
        </div>

        {/* JOURNAL TABLE */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col print:border-none print:shadow-none">
            <div className="p-6 flex flex-col sm:flex-row justify-between sm:items-center gap-4 print:bg-white print:px-0">
                <div>
                    <h4 className="font-bold text-slate-800 flex items-center gap-2">
                        <FileText className="text-indigo-600 print:hidden" size={20}/> 
                        Registre des Opérations de Ventes
                    </h4>
                    <p className="text-xs text-slate-400 mt-1">Écritures comptables générées pour la période du {format(new Date(dateRange.start), 'dd MMMM', {locale: fr})} au {format(new Date(dateRange.end), 'dd MMMM yyyy', {locale: fr})}.</p>
                </div>
                <div className="bg-white px-4 py-2 rounded-lg border border-slate-200 text-xs font-bold text-indigo-600 shadow-sm">
                    {filteredSales.length} Écritures trouvées
                </div>
            </div>

            <div className="overflow-x-auto">
                <table className="w-full text-left text-sm border-collapse">
                    <thead className="bg-slate-50 text-[10px] uppercase font-black text-slate-400 border-b border-slate-200">
                        <tr>
                            <th className="px-6 py-4">Date <ArrowUpDown size={10} className="inline ml-1"/></th>
                            <th className="px-6 py-4">Client</th>
                            <th className="px-6 py-4">Description</th>
                            <th className="px-6 py-4 text-center">Cat.</th>
                            <th className="px-6 py-4 text-right">Base HT</th>
                            <th className="px-6 py-4 text-center">TVA %</th>
                            <th className="px-6 py-4 text-right">Montant TVA</th>
                            <th className="px-6 py-4 text-right bg-slate-100/50">Total TTC</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {/* Fix: Explicitly type line as SalesLine to avoid unknown property access errors */}
                        {(filteredSales || []).map((line: SalesLine, idx: number) => (
                            <tr key={idx} className="hover:bg-indigo-50/30 transition-colors group">
                                <td className="px-6 py-4 text-slate-500 font-mono text-xs">
                                    {format(line.date, 'dd/MM/yy')}
                                </td>
                                <td className="px-6 py-4 font-bold text-slate-800">
                                    {line.client}
                                </td>
                                <td className="px-6 py-4 text-slate-600 max-w-xs truncate">
                                    {line.label}
                                </td>
                                <td className="px-6 py-4">
                                    <div className="flex justify-center">
                                        <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase border
                                            ${line.category === 'Hébergement' ? 'bg-blue-50 text-blue-700 border-blue-100' : 
                                            line.category === 'Restauration' ? 'bg-orange-50 text-orange-700 border-orange-100' : 'bg-slate-50 text-slate-600 border-slate-200'}
                                        `}>
                                            {line.category.slice(0, 3)}
                                        </span>
                                    </div>
                                </td>
                                <td className="px-6 py-4 text-right text-slate-500 font-medium">
                                    {line.ht.toFixed(2)} €
                                </td>
                                <td className="px-6 py-4 text-center font-bold text-slate-400 text-xs">
                                    {(line.tvaRate * 100)}%
                                </td>
                                <td className="px-6 py-4 text-right text-slate-400 italic">
                                    {line.tvaAmount.toFixed(2)} €
                                </td>
                                <td className="px-6 py-4 text-right font-black text-slate-900 bg-slate-50/50 group-hover:bg-indigo-50/80">
                                    {line.ttc.toFixed(2)} €
                                </td>
                            </tr>
                        ))}
                        {filteredSales.length === 0 && (
                            <tr>
                                <td colSpan={8} className="px-6 py-20 text-center text-slate-400 italic">
                                    Aucun mouvement de vente sur cette sélection.
                                </td>
                            </tr>
                        )}
                    </tbody>
                    <tfoot className="bg-white text-slate-900 font-bold border-t border-slate-100 print:bg-white print:text-slate-900 print:border-t-slate-900">
                        <tr className="divide-x divide-slate-100">
                            <td colSpan={4} className="px-6 py-6 text-slate-400 uppercase tracking-widest text-[10px] font-black">Sommes cumulées du journal</td>
                            {/* Fix: Explicitly ensuring totals properties are numbers for toFixed calls */}
                            <td className="px-6 py-6 text-right text-indigo-600">{(totals.ht as number).toFixed(2)} €</td>
                            <td className="px-6 py-6"></td>
                            <td className="px-6 py-6 text-right text-slate-400">{(totals.tva as number).toFixed(2)} €</td>
                            <td className="px-6 py-6 text-right text-indigo-700 text-xl font-black bg-indigo-50/30">{(totals.ttc as number).toFixed(2)} €</td>
                        </tr>
                    </tfoot>
                </table>
            </div>
        </div>

        {/* PRINT FOOTER */}
        <div className="hidden print:block border-t-2 border-slate-900 mt-12 pt-8 text-sm">
            <div className="grid grid-cols-2 gap-12">
                <div>
                    <h5 className="font-bold mb-4 uppercase tracking-widest text-[10px]">Rappel des ventilations TVA</h5>
                    <table className="w-full text-xs">
                        <tbody>
                            <tr className="border-b">
                                <td className="py-2 text-slate-500">Prestations de services (10%)</td>
                                {/* Fix: Explicitly specifying generic return type of reduce to avoid 'unknown' type errors for toFixed */}
                                <td className="py-2 text-right font-bold">HT: {salesJournal.filter((l: SalesLine) => l.tvaRate === 0.1).reduce<number>((acc, curr) => acc + curr.ht, 0).toFixed(2)} €</td>
                                <td className="py-2 text-right font-bold">TVA: {salesJournal.filter((l: SalesLine) => l.tvaRate === 0.1).reduce<number>((acc, curr) => acc + curr.tvaAmount, 0).toFixed(2)} €</td>
                            </tr>
                            <tr className="border-b">
                                <td className="py-2 text-slate-500">Ventes de biens / Divers (20%)</td>
                                {/* Fix: Explicitly specifying generic return type of reduce to avoid 'unknown' type errors for toFixed */}
                                <td className="py-2 text-right font-bold">HT: {salesJournal.filter((l: SalesLine) => l.tvaRate === 0.2).reduce<number>((acc, curr) => acc + curr.ht, 0).toFixed(2)} €</td>
                                <td className="py-2 text-right font-bold">TVA: {salesJournal.filter((l: SalesLine) => l.tvaRate === 0.2).reduce<number>((acc, curr) => acc + curr.tvaAmount, 0).toFixed(2)} €</td>
                            </tr>
                        </tbody>
                    </table>
                </div>
                <div className="text-right">
                    <p className="font-bold text-xs uppercase tracking-widest mb-8">Visa Direction / Comptabilité</p>
                    <div className="h-24 w-64 border border-slate-300 rounded mt-2 ml-auto"></div>
                </div>
            </div>
            <p className="mt-20 text-center text-[9px] text-slate-400 italic">
                Journal des ventes certifié conforme aux écritures du PMS - Extrait le {format(new Date(), 'dd/MM/yyyy HH:mm')} - Hôtellerie Pro.
            </p>
        </div>

      </main>
    </div>
  );
};

export default ReportsSalesJournal;
