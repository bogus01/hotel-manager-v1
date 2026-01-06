
import React, { useState, useEffect, useMemo } from 'react';
import {
    Coins,
    Calendar,
    ArrowLeft,
    ArrowRight,
    Printer,
    CheckCircle,
    AlertCircle,
    Utensils,
    BedDouble,
    CreditCard,
    Receipt,
    Download,
    History
} from 'lucide-react';
// Fixed: Removed startOfToday from date-fns import
import { format, isSameDay, addDays } from 'date-fns';
import { fr } from 'date-fns/locale';
import Header from '../components/Header';
import { Reservation, ReservationStatus, Payment, Room } from '../types';
import * as api from '../services/api';
import { useCurrency } from '../context/CurrencyContext';

// Fixed: Added local startOfToday helper to replace missing date-fns export
const startOfToday = () => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
};

const ReportsDailyCash: React.FC = () => {
    const { formatPrice } = useCurrency();
    const [reportDate, setReportDate] = useState(startOfToday());
    const [reservations, setReservations] = useState<Reservation[]>([]);
    const [rooms, setRooms] = useState<Room[]>([]);
    const [loading, setLoading] = useState(true);
    const [isClosed, setIsClosed] = useState(false);

    useEffect(() => {
        setLoading(true);
        Promise.all([api.fetchReservations(), api.fetchRooms()]).then(([res, r]) => {
            setReservations(res);
            setRooms(r);
            setLoading(false);
        });
        // Reset closed state on date change (mock)
        setIsClosed(false);
    }, [reportDate]);

    // --- LOGIC: AGGREGATE FINANCIAL DATA ---
    const financialData = useMemo(() => {
        let totalSales = 0;
        let roomSales = 0;
        let extraSales = 0;

        const paymentsByMethod: Record<string, number> = {
            'CB': 0,
            'Espèces': 0,
            'Virement': 0,
            'Chèque': 0,
            'Compte Client': 0
        };

        const dailyTransactions: { time: Date, label: string, amount: number, method: string, type: 'payment' | 'sale' }[] = [];

        reservations.forEach(res => {
            // 1. SALES (Ventes)
            // We consider a sale "made" today if the guest checked out today OR if services were added today
            // In a real PMS, we'd have a specific date per service item. Here we approximate:
            if (isSameDay(res.checkOut, reportDate) && res.status !== ReservationStatus.CANCELLED) {
                const nights = Math.max(1, Math.round((res.checkOut.getTime() - res.checkIn.getTime()) / (1000 * 3600 * 24)));
                const rSale = res.baseRate * nights;
                roomSales += rSale;
                totalSales += rSale;

                dailyTransactions.push({
                    time: res.checkOut,
                    label: `Hébergement - ${res.clientName} (Ch. ${rooms.find(r => r.id === res.roomId)?.number})`,
                    amount: rSale,
                    method: '-',
                    type: 'sale'
                });
            }

            // Services (assuming added on checkout day for this report logic)
            if (isSameDay(res.checkOut, reportDate) && res.status !== ReservationStatus.CANCELLED) {
                res.services.forEach(svc => {
                    const sSale = svc.price * svc.quantity;
                    extraSales += sSale;
                    totalSales += sSale;
                    dailyTransactions.push({
                        time: res.checkOut,
                        label: `Extra: ${svc.name} - ${res.clientName}`,
                        amount: sSale,
                        method: '-',
                        type: 'sale'
                    });
                });
            }

            // 2. PAYMENTS (Flux de caisse réel)
            res.payments.forEach(pay => {
                if (isSameDay(new Date(pay.date), reportDate)) {
                    paymentsByMethod[pay.method] = (paymentsByMethod[pay.method] || 0) + pay.amount;
                    dailyTransactions.push({
                        time: new Date(pay.date),
                        label: `Règlement ${res.clientName}`,
                        amount: pay.amount,
                        method: pay.method,
                        type: 'payment'
                    });
                }
            });
        });

        const totalCollected = Object.entries(paymentsByMethod)
            .filter(([method]) => method !== 'Compte Client')
            // Fix: Explicitly cast val to number for safer reduction and correct typing
            .reduce((acc, [_, val]) => acc + (val as number), 0);

        return {
            totalSales,
            roomSales,
            extraSales,
            paymentsByMethod,
            totalCollected,
            transactions: dailyTransactions.sort((a, b) => b.time.getTime() - a.time.getTime())
        };
    }, [reservations, reportDate, rooms]);

    const handleCloseDay = () => {
        if (window.confirm("Voulez-vous clôturer définitivement la caisse pour cette journée ?\nCela générera un rapport comptable non modifiable.")) {
            setIsClosed(true);
        }
    };

    const handlePrint = () => window.print();

    return (
        <div className="min-h-screen bg-slate-50 flex flex-col print:bg-white">
            <Header title="Clôture de Caisse" backLink="/reports" backLabel="Rapports" />

            <div className="flex-1 max-w-6xl mx-auto w-full p-8 space-y-6">

                {/* TOP BAR: DATE SELECTOR & ACTIONS */}
                <div className="flex flex-col md:flex-row justify-between items-center gap-4 bg-white p-4 rounded-2xl border border-slate-200 shadow-sm no-print">
                    <div className="flex items-center gap-4">
                        <button onClick={() => setReportDate(addDays(reportDate, -1))} className="p-2 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-indigo-600 transition-colors"><ArrowLeft size={20} /></button>
                        <div className="flex items-center gap-2 px-4 py-1.5 bg-slate-50 rounded-xl border border-slate-200">
                            <Calendar size={18} className="text-indigo-500" />
                            <span className="font-bold text-lg text-slate-800 capitalize">{format(reportDate, 'EEEE d MMMM yyyy', { locale: fr })}</span>
                        </div>
                        <button onClick={() => setReportDate(addDays(reportDate, 1))} className="p-2 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-indigo-600 transition-colors"><ArrowRight size={20} /></button>
                    </div>

                    <div className="flex gap-3">
                        <button onClick={handlePrint} className="flex items-center gap-2 px-4 py-2 border border-slate-300 rounded-lg text-slate-600 font-bold hover:bg-slate-50 transition-all shadow-sm">
                            <Printer size={18} /> Imprimer
                        </button>
                        {!isClosed ? (
                            <button
                                onClick={handleCloseDay}
                                className="flex items-center gap-2 px-6 py-2 bg-indigo-600 text-white rounded-lg font-bold hover:bg-indigo-700 transition-all shadow-md"
                            >
                                <CheckCircle size={18} /> Clôturer la journée
                            </button>
                        ) : (
                            <div className="flex items-center gap-2 px-4 py-2 bg-emerald-50 text-emerald-700 rounded-lg font-bold border border-emerald-200">
                                <CheckCircle size={18} /> Journée Clôturée
                            </div>
                        )}
                    </div>
                </div>

                {isClosed && (
                    <div className="bg-emerald-50 border-l-4 border-emerald-500 p-4 rounded-r-lg flex items-center gap-3 no-print">
                        <CheckCircle className="text-emerald-500" size={24} />
                        <div>
                            <p className="font-bold text-emerald-800">Caisse validée</p>
                            <p className="text-sm text-emerald-700 opacity-80">La clôture a été enregistrée par Admin à {format(new Date(), 'HH:mm')}.</p>
                        </div>
                    </div>
                )}

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">

                    {/* LEFT COLUMN: SUMMARY CARDS & METHODS */}
                    <div className="lg:col-span-4 space-y-6">

                        {/* GLOBAL REVENUE */}
                        <div className="bg-slate-900 text-white p-6 rounded-2xl shadow-xl relative overflow-hidden">
                            <div className="absolute top-0 right-0 p-4 opacity-10">
                                <Coins size={80} />
                            </div>
                            <p className="text-slate-400 text-xs font-bold uppercase tracking-widest mb-1">Recette Totale (Ventes)</p>
                            <h3 className="text-4xl font-bold">{formatPrice(financialData.totalSales)}</h3>
                            <div className="mt-4 pt-4 border-t border-slate-800 flex justify-between items-center text-sm">
                                <div className="flex items-center gap-2 text-slate-400">
                                    <BedDouble size={16} /> Héb: {formatPrice(financialData.roomSales)}
                                </div>
                                <div className="flex items-center gap-2 text-slate-400">
                                    <Utensils size={16} /> Extras: {formatPrice(financialData.extraSales)}
                                </div>
                            </div>
                        </div>

                        {/* PAYMENTS BY METHOD */}
                        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                            <h4 className="font-bold text-slate-800 mb-6 flex items-center gap-2">
                                <CreditCard className="text-indigo-600" size={20} /> Encaissements réels
                            </h4>
                            <div className="space-y-4">
                                {Object.entries(financialData.paymentsByMethod).map(([method, amount]) => (
                                    <div key={method} className="flex justify-between items-center pb-3 border-b border-slate-100 last:border-0 last:pb-0">
                                        <span className={`font-medium ${method === 'Espèces' ? 'text-indigo-600 font-bold' : 'text-slate-600'}`}>{method}</span>
                                        {/* Fix: Explicitly cast amount to number to fix toFixed error on unknown type */}
                                        <span className="font-bold text-slate-800">{formatPrice(amount as number)}</span>
                                    </div>
                                ))}
                                <div className="mt-6 pt-4 bg-slate-50 -mx-6 px-6 border-t border-slate-100 flex justify-between items-baseline">
                                    <span className="text-xs font-bold text-slate-400 uppercase">Total Flux de Caisse</span>
                                    <span className="text-xl font-black text-emerald-600">{formatPrice(financialData.totalCollected)}</span>
                                </div>
                            </div>
                        </div>

                        {/* CASH DRAWER FOCUS */}
                        <div className="bg-amber-50 border border-amber-200 p-6 rounded-2xl">
                            <h4 className="font-bold text-amber-800 mb-3 flex items-center gap-2 uppercase text-xs tracking-widest">
                                <Coins size={16} /> Contrôle Caisse Espèces
                            </h4>
                            <div className="flex justify-between items-center mb-4">
                                <span className="text-sm text-amber-700">Encaissements Espèces :</span>
                                {/* Fix: Explicitly cast the value to number to fix toFixed error on unknown type */}
                                <span className="text-lg font-bold text-amber-900">{formatPrice(financialData.paymentsByMethod['Espèces'] as number || 0)}</span>
                            </div>
                            <div className="p-3 bg-white/50 rounded-lg border border-amber-100 text-xs text-amber-800 italic">
                                Vérifiez que le montant physique dans votre tiroir correspond à cette somme après avoir déduit votre fond de caisse initial.
                            </div>
                        </div>

                    </div>

                    {/* RIGHT COLUMN: TRANSACTION JOURNAL */}
                    <div className="lg:col-span-8">
                        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
                            <div className="p-5 flex justify-between items-center">
                                <h4 className="font-bold text-slate-800 flex items-center gap-2">
                                    <Receipt className="text-indigo-600" size={20} /> Journal des mouvements du jour
                                </h4>
                                <div className="flex gap-4">
                                    <div className="flex items-center gap-1.5 text-xs font-bold text-slate-400">
                                        <div className="w-2 h-2 rounded-full bg-blue-500"></div> Ventes
                                    </div>
                                    <div className="flex items-center gap-1.5 text-xs font-bold text-slate-400">
                                        <div className="w-2 h-2 rounded-full bg-emerald-500"></div> Paiements
                                    </div>
                                </div>
                            </div>

                            <div className="overflow-x-auto">
                                <table className="w-full text-left text-sm">
                                    <thead className="bg-white text-xs uppercase font-bold text-slate-400 border-b border-slate-100">
                                        <tr>
                                            <th className="px-6 py-4">Heure / Ref</th>
                                            <th className="px-6 py-4">Libellé de l'opération</th>
                                            <th className="px-6 py-4">Mode</th>
                                            <th className="px-6 py-4 text-right">Débit (Vente)</th>
                                            <th className="px-6 py-4 text-right">Crédit (Encais.)</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                        {financialData.transactions.map((t, idx) => (
                                            <tr key={idx} className="hover:bg-slate-50 transition-colors">
                                                <td className="px-6 py-4 font-mono text-slate-400 text-xs">
                                                    {format(t.time, 'HH:mm')}
                                                </td>
                                                <td className="px-6 py-4 font-medium text-slate-700">
                                                    {t.label}
                                                </td>
                                                <td className="px-6 py-4">
                                                    <span className="text-xs bg-slate-100 px-2 py-0.5 rounded text-slate-500 border border-slate-200 uppercase font-bold">
                                                        {t.method}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 text-right">
                                                    {t.type === 'sale' ? (
                                                        <span className="text-blue-600 font-bold">+{formatPrice(t.amount)}</span>
                                                    ) : '-'}
                                                </td>
                                                <td className="px-6 py-4 text-right">
                                                    {t.type === 'payment' ? (
                                                        <span className="text-emerald-600 font-bold">+{formatPrice(t.amount)}</span>
                                                    ) : '-'}
                                                </td>
                                            </tr>
                                        ))}
                                        {financialData.transactions.length === 0 && (
                                            <tr>
                                                <td colSpan={5} className="px-6 py-12 text-center text-slate-400 italic">
                                                    Aucun mouvement enregistré pour cette journée.
                                                </td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>

                            <div className="p-5 flex justify-between items-center font-bold text-slate-800">
                                <span>TOTAL DU JOUR</span>
                                <div className="flex gap-8">
                                    <div className="text-right">
                                        <p className="text-[10px] text-slate-400 uppercase">Chiffre d'Affaires</p>
                                        <p className="text-blue-700">{formatPrice(financialData.totalSales)}</p>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-[10px] text-slate-400 uppercase">Encaissements</p>
                                        <p className="text-emerald-700">{formatPrice(financialData.totalCollected)}</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                </div>

                {/* PRINT FOOTER (Visible on print only) */}
                <div className="hidden print:block border-t-2 border-slate-900 mt-12 pt-8 text-sm">
                    <div className="grid grid-cols-2 gap-8">
                        <div>
                            <p className="font-bold mb-4">Visa Réceptionniste (Matin)</p>
                            <div className="h-24 border border-slate-300 rounded-lg"></div>
                        </div>
                        <div>
                            <p className="font-bold mb-4">Visa Direction / Validation Caisse</p>
                            <div className="h-24 border border-slate-300 rounded-lg"></div>
                        </div>
                    </div>
                    <p className="mt-8 text-center text-[10px] text-slate-400 italic">
                        Rapport généré par Hôtellerie Pro PMS le {format(new Date(), 'dd/MM/yyyy HH:mm:ss')}. Document interne de contrôle.
                    </p>
                </div>

            </div>
        </div>
    );
};

export default ReportsDailyCash;
