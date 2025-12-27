
import React, { useState, useEffect, useMemo } from 'react';
import { useLocation } from 'react-router-dom';
import { 
  Search, Calendar, ArrowRight, Download, Filter, 
  CreditCard, Coins, TrendingUp, AlertCircle, FileText, 
  CheckCircle, Clock, ArrowUpRight, Printer, Eye,
  Receipt, Landmark, History, ChevronRight, User, Hash,
  ArrowDownCircle, BarChart3, Moon, Users
} from 'lucide-react';
// Added differenceInDays to imports
import { format, isWithinInterval, addDays, isAfter, isBefore, startOfDay, differenceInDays } from 'date-fns';
import fr from 'date-fns/locale/fr';
import Header from '../components/Header';
import { Reservation, ReservationStatus, Room, Payment, Client } from '../types';
import * as api from '../services/api';
import PaymentModal from '../components/PaymentModal';
import InvoicePreview from '../components/InvoicePreview';
import ReceiptPreview from '../components/ReceiptPreview';

const startOfToday = () => {
    const d = new Date();
    d.setHours(0,0,0,0);
    return d;
};

const Billing: React.FC = () => {
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  
  const location = useLocation();
  const searchParams = new URLSearchParams(location.search);
  const fromReports = searchParams.get('from') === 'reports';

  const [dateRange, setDateRange] = useState({
      start: format(addDays(new Date(), -30), 'yyyy-MM-dd'),
      end: format(addDays(new Date(), 30), 'yyyy-MM-dd')
  });
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'dashboard' | 'invoices' | 'payments' | 'forecast'>('dashboard');
  const [showDebtorsOnly, setShowDebtorsOnly] = useState(false);
  
  // Modals / Previews
  const [selectedResForPayment, setSelectedResForPayment] = useState<Reservation | null>(null);
  const [previewInvoice, setPreviewInvoice] = useState<Reservation | null>(null);
  const [previewReceipt, setPreviewReceipt] = useState<{ payment: Payment, res: Reservation } | null>(null);

  const fetchData = () => {
      setLoading(true);
      Promise.all([api.fetchReservations(), api.fetchRooms(), api.fetchClients()]).then(([res, r, cl]) => {
          setReservations(res);
          setRooms(r);
          setClients(cl);
          setLoading(false);
      });
  };

  useEffect(() => { fetchData(); }, []);

  const stats = useMemo(() => {
    const start = new Date(dateRange.start);
    const end = new Date(dateRange.end);
    const today = startOfToday();
    let totalCollected = 0; 
    let totalInvoiced = 0; 
    let totalOutstanding = 0; 
    let totalForecast = 0;

    reservations.forEach(res => {
        if (res.status === ReservationStatus.CANCELLED) return;
        
        // Collecté sur la période
        res.payments.forEach(pay => {
            if (isWithinInterval(new Date(pay.date), { start, end })) totalCollected += pay.amount;
        });

        // Facturé (fin de séjour sur la période)
        if (isWithinInterval(res.checkOut, { start, end })) {
            totalInvoiced += res.totalPrice;
            const paid = res.payments.reduce((acc, p) => acc + p.amount, 0) + (res.depositAmount || 0);
            const due = res.totalPrice - paid;
            if (due > 0.01) totalOutstanding += due;
        }

        // Prévisionnel (séjours futurs sur la période)
        if (isAfter(res.checkIn, today) && isWithinInterval(res.checkIn, { start, end })) {
            totalForecast += res.totalPrice;
        }
    });
    return { totalCollected, totalInvoiced, totalOutstanding, totalForecast };
  }, [reservations, dateRange]);

  // Flatten payments for the "Journal des règlements"
  const allPayments = useMemo(() => {
      const list: { payment: Payment, reservation: Reservation }[] = [];
      reservations.forEach(res => {
          res.payments.forEach(p => {
              list.push({ payment: p, reservation: res });
          });
          if (res.depositAmount && res.depositAmount > 0) {
              list.push({ 
                  payment: { id: `dep-${res.id}`, amount: res.depositAmount, date: res.checkIn, method: 'Acompte' }, 
                  reservation: res 
              });
          }
      });
      return list
        .filter(item => {
            const matchesSearch = item.reservation.clientName.toLowerCase().includes(searchQuery.toLowerCase());
            const isInRange = isWithinInterval(new Date(item.payment.date), { 
                start: new Date(dateRange.start), 
                end: new Date(dateRange.end) 
            });
            return matchesSearch && isInRange;
        })
        .sort((a, b) => new Date(b.payment.date).getTime() - new Date(a.payment.date).getTime());
  }, [reservations, dateRange, searchQuery]);

  const filteredInvoices = useMemo(() => {
      const start = new Date(dateRange.start);
      const end = new Date(dateRange.end);
      return reservations.filter(res => {
          if (res.status === ReservationStatus.CANCELLED) return false;
          const isRelevantDate = isWithinInterval(res.checkOut, { start, end });
          const matchesSearch = res.clientName.toLowerCase().includes(searchQuery.toLowerCase()) || res.id.toLowerCase().includes(searchQuery.toLowerCase());
          let matchesDebt = true;
          if (showDebtorsOnly) {
             const paid = res.payments.reduce((acc, p) => acc + p.amount, 0) + (res.depositAmount || 0);
             matchesDebt = (res.totalPrice - paid) > 0.05;
          }
          return isRelevantDate && matchesSearch && matchesDebt;
      }).sort((a,b) => b.checkOut.getTime() - a.checkOut.getTime());
  }, [reservations, dateRange, searchQuery, showDebtorsOnly]);

  const filteredForecast = useMemo(() => {
    const today = startOfToday();
    const end = new Date(dateRange.end);
    return reservations.filter(res => {
        if (res.status === ReservationStatus.CANCELLED) return false;
        return isAfter(res.checkIn, today) && isBefore(res.checkIn, end) && res.clientName.toLowerCase().includes(searchQuery.toLowerCase());
    }).sort((a,b) => a.checkIn.getTime() - b.checkIn.getTime());
  }, [reservations, dateRange, searchQuery]);

  const panelClass = "bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col";

  if (loading) return <div className="h-screen bg-slate-50 flex items-center justify-center font-black text-slate-300 animate-pulse uppercase tracking-[0.3em]">Initialisation du module financier...</div>;

  return (
    <div className="flex flex-col h-screen bg-slate-50 overflow-hidden text-slate-900 antialiased">
      <Header 
        title="Facturation & Flux Financiers" 
        backLink={fromReports ? "/reports" : "/"} 
        backLabel={fromReports ? "Rapports" : "Menu Principal"}
      />
      
      <div className="flex-1 overflow-y-auto p-6 md:p-8 space-y-8 max-w-7xl mx-auto w-full">
        
        {/* FILTRES GLOBAUX */}
        <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 flex flex-col md:flex-row gap-6 items-center justify-between">
            <div className="flex items-center gap-4 bg-slate-50 p-1.5 rounded-xl border border-slate-100">
                <div className="relative"><Calendar size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" /><input type="date" className="bg-transparent border-none pl-9 pr-3 py-1.5 text-xs font-black uppercase text-slate-700 outline-none" value={dateRange.start} onChange={e => setDateRange({...dateRange, start: e.target.value})}/></div>
                <ArrowRight size={14} className="text-slate-300" />
                <div className="relative"><Calendar size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" /><input type="date" className="bg-transparent border-none pl-9 pr-3 py-1.5 text-xs font-black uppercase text-slate-700 outline-none" value={dateRange.end} onChange={e => setDateRange({...dateRange, end: e.target.value})}/></div>
            </div>
            <div className="relative w-full md:w-96">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
                <input type="text" placeholder="Rechercher client ou n° dossier..." className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold focus:ring-2 focus:ring-indigo-500 outline-none transition-all" value={searchQuery} onChange={e => setSearchQuery(e.target.value)}/>
            </div>
        </div>

        {/* STATS CARDS */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
             <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm group hover:border-indigo-300 transition-all">
                <div className="flex justify-between items-start mb-2">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Encaissements Période</p>
                    <div className="bg-emerald-50 p-2 rounded-lg text-emerald-600"><Coins size={18}/></div>
                </div>
                <h3 className="text-2xl font-black text-slate-900 tabular-nums">{stats.totalCollected.toFixed(2)} €</h3>
                <p className="text-[9px] font-bold text-emerald-500 mt-2 flex items-center gap-1 uppercase tracking-tighter"><CheckCircle size={10}/> Argent encaissé en banque/caisse</p>
             </div>
             <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm group hover:border-indigo-300 transition-all">
                <div className="flex justify-between items-start mb-2">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">C.A. Facturé</p>
                    <div className="bg-blue-50 p-2 rounded-lg text-blue-600"><FileText size={18}/></div>
                </div>
                <h3 className="text-2xl font-black text-slate-900 tabular-nums">{stats.totalInvoiced.toFixed(2)} €</h3>
                <p className="text-[9px] font-bold text-blue-400 mt-2 uppercase tracking-tighter">Volume d'activité facturé</p>
             </div>
             <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm group hover:border-indigo-300 transition-all">
                <div className="flex justify-between items-start mb-2">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Reste à percevoir</p>
                    <div className="bg-red-50 p-2 rounded-lg text-red-600"><TrendingUp size={18}/></div>
                </div>
                <h3 className="text-2xl font-black text-red-600 tabular-nums">{stats.totalOutstanding.toFixed(2)} €</h3>
                <p className="text-[9px] font-bold text-red-400 mt-2 uppercase tracking-tighter">Factures non soldées</p>
             </div>
             <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm group hover:border-indigo-300 transition-all">
                <div className="flex justify-between items-start mb-2">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Prévisionnel Arrivées</p>
                    <div className="bg-indigo-50 p-2 rounded-lg text-indigo-600"><BarChart3 size={18}/></div>
                </div>
                <h3 className="text-2xl font-black text-slate-900 tabular-nums">{stats.totalForecast.toFixed(2)} €</h3>
                <p className="text-[9px] font-bold text-indigo-400 mt-2 uppercase tracking-tighter">C.A. attendu sur la sélection</p>
             </div>
        </div>

        {/* NAVIGATION TABS */}
        <div className="flex gap-1 bg-white p-1 rounded-2xl border border-slate-100 shadow-sm no-print overflow-x-auto">
            {[
                { id: 'dashboard', label: 'Tableau de Bord', icon: <History size={16}/> },
                { id: 'invoices', label: 'Journal des Factures', icon: <FileText size={16}/> },
                { id: 'payments', label: 'Journal des Règlements', icon: <Receipt size={16}/> },
                { id: 'forecast', label: 'Prévisionnel CA', icon: <Clock size={16}/> }
            ].map(tab => (
                <button 
                    key={tab.id} 
                    onClick={() => setActiveTab(tab.id as any)} 
                    className={`flex-1 min-w-[150px] py-3.5 px-4 rounded-xl flex items-center justify-center gap-3 transition-all font-black text-[10px] uppercase tracking-widest ${activeTab === tab.id ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-400 hover:bg-slate-50 hover:text-slate-600'}`}
                >
                    {tab.icon} {tab.label}
                </button>
            ))}
        </div>

        {/* TAB CONTENT: INVOICES (RESERVATIONS) */}
        {activeTab === 'invoices' && (
            <div className={panelClass}>
                <div className="p-6 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
                    <h4 className="font-black text-slate-700 uppercase tracking-widest text-xs flex items-center gap-2"><FileText size={16} className="text-indigo-600"/> Registre des Séjours & Factures</h4>
                    <label className="flex items-center gap-2 cursor-pointer bg-white px-3 py-1.5 rounded-lg border border-slate-100 shadow-sm transition-all hover:bg-red-50 hover:border-red-200 group">
                        <input type="checkbox" className="rounded text-red-600 focus:ring-red-500" checked={showDebtorsOnly} onChange={e => setShowDebtorsOnly(e.target.checked)}/> 
                        <span className="text-[10px] font-black uppercase text-slate-500 group-hover:text-red-600 transition-colors">Débiteurs uniquement</span>
                    </label>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                        <thead className="bg-slate-50 text-[10px] uppercase font-black text-slate-400 border-b border-slate-100">
                            <tr>
                                <th className="px-6 py-4">Dossier / Client</th>
                                <th className="px-6 py-4">Départ le</th>
                                <th className="px-6 py-4 text-right">Total TTC</th>
                                <th className="px-6 py-4 text-right">Réglé</th>
                                <th className="px-6 py-4 text-right">Solde Dû</th>
                                <th className="px-6 py-4 text-right no-print">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {filteredInvoices.map(res => {
                                const paid = res.payments.reduce((acc, p) => acc + p.amount, 0) + (res.depositAmount || 0);
                                const due = res.totalPrice - paid;
                                return (
                                    <tr key={res.id} className="hover:bg-slate-50 group">
                                        <td className="px-6 py-4">
                                            <div className="font-black text-slate-800 uppercase text-[13px] tracking-tight">{res.clientName}</div>
                                            <div className="text-[10px] font-bold text-slate-400 tracking-widest mt-0.5 uppercase flex items-center gap-2"><Hash size={10}/> Dossier #{res.id.slice(-6)}</div>
                                        </td>
                                        <td className="px-6 py-4 text-slate-500 font-bold tabular-nums">{format(res.checkOut, 'dd/MM/yyyy')}</td>
                                        <td className="px-6 py-4 text-right font-black text-slate-900 tabular-nums">{res.totalPrice.toFixed(2)} €</td>
                                        <td className="px-6 py-4 text-right font-bold text-emerald-600 tabular-nums">-{paid.toFixed(2)} €</td>
                                        <td className="px-6 py-4 text-right">
                                            <span className={`px-2 py-1 rounded-lg font-black text-[13px] tabular-nums ${due > 0.05 ? 'text-red-500 bg-red-50' : 'text-emerald-500 bg-emerald-50'}`}>
                                                {due.toFixed(2)} €
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-right no-print">
                                            <div className="flex justify-end gap-2">
                                                <button onClick={() => setPreviewInvoice(res)} className="p-2 bg-white border border-slate-100 text-slate-400 hover:text-indigo-600 hover:border-indigo-600 rounded-xl transition-all shadow-sm" title="Voir Facture"><Printer size={16}/></button>
                                                {due > 0.05 && (
                                                    <button onClick={() => setSelectedResForPayment(res)} className="px-4 py-2 bg-indigo-600 text-white rounded-xl text-[9px] font-black uppercase hover:bg-indigo-700 transition-all shadow-md shadow-indigo-100">Encaisser</button>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })}
                            {filteredInvoices.length === 0 && (
                                <tr><td colSpan={6} className="px-6 py-20 text-center text-slate-300 italic font-black uppercase text-[10px] tracking-widest">Aucun dossier à facturer sur cette période</td></tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        )}

        {/* TAB CONTENT: PAYMENTS JOURNAL */}
        {activeTab === 'payments' && (
            <div className={panelClass}>
                <div className="p-6 border-b border-slate-100 bg-slate-50/50">
                    <h4 className="font-black text-slate-700 uppercase tracking-widest text-xs flex items-center gap-2"><Receipt size={16} className="text-emerald-600"/> Journal des Flux de Caisse</h4>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                        <thead className="bg-slate-50 text-[10px] uppercase font-black text-slate-400 border-b border-slate-100">
                            <tr>
                                <th className="px-6 py-4">Date de Règlement</th>
                                <th className="px-6 py-4">Client / Dossier</th>
                                <th className="px-6 py-4">Moyen</th>
                                <th className="px-6 py-4 text-right">Montant</th>
                                <th className="px-6 py-4 text-right no-print">Justificatif</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {allPayments.map((item, idx) => (
                                <tr key={idx} className="hover:bg-slate-50 transition-colors group">
                                    <td className="px-6 py-4">
                                        <div className="text-[13px] font-black text-slate-700 tabular-nums">{format(new Date(item.payment.date), 'dd MMMM yyyy', { locale: fr })}</div>
                                        <div className="text-[10px] font-bold text-slate-400 tabular-nums mt-0.5">{format(new Date(item.payment.date), 'HH:mm')}</div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="font-black text-slate-800 uppercase text-[13px] tracking-tight">{item.reservation.clientName}</div>
                                        <div className="text-[10px] font-bold text-indigo-400 uppercase tracking-widest mt-0.5">Dossier #{item.reservation.id.slice(-6)}</div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className="px-2.5 py-1 bg-slate-100 text-slate-600 rounded-lg text-[10px] font-black uppercase border border-slate-100 shadow-sm">{item.payment.method}</span>
                                    </td>
                                    <td className="px-6 py-4 text-right font-black text-emerald-600 text-lg tabular-nums">+{item.payment.amount.toFixed(2)} €</td>
                                    <td className="px-6 py-4 text-right no-print">
                                        <button 
                                            onClick={() => setPreviewReceipt({ payment: item.payment, res: item.reservation })}
                                            className="p-2.5 bg-white border border-slate-100 text-slate-300 hover:text-emerald-600 hover:border-emerald-600 rounded-xl transition-all shadow-sm group-hover:scale-105"
                                            title="Ré-éditer le reçu"
                                        >
                                            <Printer size={18}/>
                                        </button>
                                    </td>
                                </tr>
                            ))}
                            {allPayments.length === 0 && (
                                <tr><td colSpan={5} className="px-6 py-20 text-center text-slate-300 italic font-black uppercase text-[10px] tracking-widest">Aucun règlement enregistré sur cette période</td></tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        )}

        {/* TAB CONTENT: FORECAST */}
        {activeTab === 'forecast' && (
            <div className={panelClass}>
                <div className="p-6 border-b border-slate-100 bg-slate-50/50">
                    <h4 className="font-black text-slate-700 uppercase tracking-widest text-xs flex items-center gap-2"><Clock size={16} className="text-indigo-600"/> Estimations Chiffre d'Affaires Prévisionnel</h4>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                        <thead className="bg-slate-50 text-[10px] uppercase font-black text-slate-400 border-b border-slate-100">
                            <tr>
                                <th className="px-6 py-4">Arrivée prévue</th>
                                <th className="px-6 py-4">Départ prévu</th>
                                <th className="px-6 py-4">Client</th>
                                <th className="px-6 py-4">Détails Séjour</th>
                                <th className="px-6 py-4 text-right">Estimation TTC</th>
                                <th className="px-6 py-4 text-right no-print">Accès</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {filteredForecast.map(res => (
                                <tr key={res.id} className="hover:bg-slate-50 transition-colors">
                                    <td className="px-6 py-4 text-emerald-600 font-black tabular-nums">{format(res.checkIn, 'dd/MM/yyyy')}</td>
                                    <td className="px-6 py-4 text-indigo-600 font-black tabular-nums">{format(res.checkOut, 'dd/MM/yyyy')}</td>
                                    <td className="px-6 py-4 font-black text-slate-800 uppercase text-[13px] tracking-tight">{res.clientName}</td>
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-1.5 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                                            {/* Fixed: Added Moon and Users icons and missing differenceInDays from date-fns */}
                                            <Moon size={12}/> {Math.max(1, differenceInDays(res.checkOut, res.checkIn))} Nts 
                                            <span className="mx-1">•</span> 
                                            <Users size={12}/> {res.adults + (res.children || 0)} Pax
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-right font-black text-slate-900 text-lg tabular-nums">{res.totalPrice.toFixed(2)} €</td>
                                    <td className="px-6 py-4 text-right no-print">
                                        <button onClick={() => setPreviewInvoice(res)} className="p-2 bg-indigo-50 text-indigo-600 hover:bg-indigo-600 hover:text-white rounded-xl transition-all shadow-sm" title="Prévisualiser Dossier"><Eye size={16}/></button>
                                    </td>
                                </tr>
                            ))}
                            {filteredForecast.length === 0 && (
                                <tr><td colSpan={6} className="px-6 py-20 text-center text-slate-300 italic font-black uppercase text-[10px] tracking-widest">Aucune arrivée future programmée sur cette période</td></tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        )}

      </div>

      {/* MODALS & PREVIEWS */}
      {selectedResForPayment && (
          <PaymentModal 
            isOpen={!!selectedResForPayment} 
            onClose={() => setSelectedResForPayment(null)} 
            reservation={selectedResForPayment} 
            onUpdate={fetchData} 
            allReservations={reservations} 
            rooms={rooms} 
          />
      )}

      {previewInvoice && (
          <InvoicePreview 
            reservation={previewInvoice} 
            allReservations={reservations} 
            rooms={rooms} 
            client={clients.find(c => c.id === previewInvoice.clientId) || null} 
            onClose={() => setPreviewInvoice(null)} 
          />
      )}

      {previewReceipt && (
          <ReceiptPreview 
            payment={previewReceipt.payment} 
            reservation={previewReceipt.res} 
            rooms={rooms} 
            onClose={() => setPreviewReceipt(null)} 
          />
      )}
    </div>
  );
};

export default Billing;
