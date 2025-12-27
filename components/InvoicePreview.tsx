
import React, { useState, useMemo, useEffect, useRef } from 'react';
import { 
  FileText, Printer, X, Hotel, Coins, 
  MapPin, Building2, BedDouble, ZoomIn, ZoomOut, 
  Maximize2, Mail, Phone, Maximize, Utensils, Receipt,
  Download
} from 'lucide-react';
import { format, differenceInDays, addDays } from 'date-fns';
import fr from 'date-fns/locale/fr';
import { Reservation, Room, ReservationStatus, Client, BoardType, BoardConfiguration, Tax } from '../types';
import * as api from '../services/api';

interface InvoicePreviewProps {
    reservation: Reservation;
    allReservations: Reservation[];
    rooms: Room[];
    client: Client | null;
    onClose: () => void;
    initialIncludeGroup?: boolean;
    isProforma?: boolean;
}

interface InvoiceLine {
    id: string;
    date: Date;
    description: string;
    quantity: number;
    unitPrice: number;
    total: number;
    tvaRate: number; // Taux au format décimal (ex: 0.18 pour 18%)
}

const InvoicePreview: React.FC<InvoicePreviewProps> = ({ 
    reservation, 
    allReservations, 
    rooms, 
    client, 
    onClose, 
    initialIncludeGroup = false,
    isProforma = false
}) => {
    const [includeGroup, setIncludeGroup] = useState(initialIncludeGroup);
    const [scale, setScale] = useState(0.9);
    const [boardPrices, setBoardPrices] = useState<BoardConfiguration | null>(null);
    const [availableTaxes, setAvailableTaxes] = useState<Tax[]>([]);
    const containerRef = useRef<HTMLDivElement>(null);
    const invoiceRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        Promise.all([
            api.fetchBoardConfig(),
            api.fetchTaxes()
        ]).then(([config, taxes]) => {
            setBoardPrices(config);
            setAvailableTaxes(taxes);
        });
    }, []);

    // Détermination du taux de TVA approprié selon la configuration de l'utilisateur
    const getTvaRateFor = (category: 'accommodation' | 'services'): number => {
        const activeTaxes = availableTaxes.filter(t => t.isActive && !t.isFixed);
        const specific = activeTaxes.find(t => t.applyTo === category);
        if (specific) return specific.rate / 100;
        const global = activeTaxes.find(t => t.applyTo === 'all');
        if (global) return global.rate / 100;
        return category === 'accommodation' ? 0.10 : 0.20; // Fallback par défaut
    };

    const handleAutoFit = () => {
        if (containerRef.current && invoiceRef.current) {
            const padding = 80;
            const containerW = containerRef.current.clientWidth - padding;
            const containerH = containerRef.current.clientHeight - padding;
            const A4W = 794; 
            const A4H = 1123;
            const scaleW = containerW / A4W;
            const scaleH = containerH / A4H;
            setScale(Math.min(scaleW, scaleH, 0.9));
        }
    };

    useEffect(() => {
        const timer = setTimeout(handleAutoFit, 100);
        window.addEventListener('resize', handleAutoFit);
        return () => {
            window.removeEventListener('resize', handleAutoFit);
            clearTimeout(timer);
        };
    }, [includeGroup, boardPrices, availableTaxes]);

    const siblings = useMemo(() => {
        const baseSiblings = allReservations.filter(r => 
            r.clientId === reservation.clientId && 
            r.status !== ReservationStatus.CANCELLED
        );
        const exists = baseSiblings.find(b => b.id === reservation.id);
        if (!exists) baseSiblings.push(reservation);
        
        return baseSiblings.map(r => r.id === reservation.id ? reservation : r);
    }, [allReservations, reservation]);

    const reservationsToBill = includeGroup ? siblings : [reservation];

    const invoiceLines = useMemo<InvoiceLine[]>(() => {
        return reservationsToBill.flatMap(res => {
            const room = rooms.find(r => r.id === res.roomId);
            const nights = Math.max(1, differenceInDays(res.checkOut, res.checkIn));
            
            // On récupère les taux configurés dynamiquement
            const accomTva = getTvaRateFor('accommodation');
            const servTva = getTvaRateFor('services');

            const lines: InvoiceLine[] = [
                {
                    id: `${res.id}-stay`,
                    date: res.checkIn,
                    description: `Hébergement Ch. ${room?.number || '??'} (${room?.type}) du ${format(res.checkIn, 'dd/MM')} au ${format(res.checkOut, 'dd/MM')}`,
                    quantity: nights,
                    unitPrice: res.baseRate,
                    total: nights * res.baseRate,
                    tvaRate: accomTva
                }
            ];

            if (res.boardType && res.boardType !== BoardType.RO && boardPrices) {
                const boardPrice = boardPrices[res.boardType as keyof BoardConfiguration] || 0;
                lines.push({
                    id: `${res.id}-board`,
                    date: res.checkIn,
                    description: `Pension: ${res.boardType} (${res.adults} PAX)`,
                    quantity: nights * res.adults,
                    unitPrice: boardPrice,
                    total: nights * res.adults * boardPrice,
                    tvaRate: servTva
                });
            }

            if (res.services && res.services.length > 0) {
                res.services.forEach(svc => {
                    lines.push({
                        id: `${res.id}-${svc.id}`,
                        date: res.checkIn, 
                        description: `${svc.name} (Ch. ${room?.number})`,
                        quantity: svc.quantity,
                        unitPrice: svc.price,
                        total: svc.quantity * svc.price,
                        tvaRate: servTva
                    });
                });
            }
            return lines;
        });
    }, [reservationsToBill, rooms, boardPrices, availableTaxes]);

    const allPayments = useMemo(() => {
        const pays = reservationsToBill.flatMap(res => {
            const resPays = res.payments.map(p => ({ 
                ...p, 
                roomNumber: rooms.find(r => r.id === res.roomId)?.number,
                isDeposit: false
            }));
            if (res.depositAmount && res.depositAmount > 0) {
                resPays.push({
                    id: `dep-${res.id}`,
                    amount: res.depositAmount,
                    date: res.checkIn,
                    method: 'Acompte',
                    roomNumber: rooms.find(r => r.id === res.roomId)?.number,
                    isDeposit: true
                });
            }
            return resPays;
        });
        return pays.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    }, [reservationsToBill, rooms]);

    const totalTTC = invoiceLines.reduce((acc, line) => acc + line.total, 0);
    
    const vatBreakdown = useMemo(() => {
        const breakdown: Record<number, { baseHT: number, vatAmount: number }> = {};
        invoiceLines.forEach(line => {
            const rate = line.tvaRate;
            const ht = line.total / (1 + rate);
            if (!breakdown[rate]) {
                breakdown[rate] = { baseHT: 0, vatAmount: 0 };
            }
            breakdown[rate].baseHT += ht;
            breakdown[rate].vatAmount += (line.total - ht);
        });
        return breakdown;
    }, [invoiceLines]);

    const totalHT = (Object.values(vatBreakdown) as { baseHT: number, vatAmount: number }[]).reduce((acc: number, curr) => acc + curr.baseHT, 0);
    const totalTVA = totalTTC - totalHT;
    const totalPaid = allPayments.reduce((acc, p) => acc + p.amount, 0);
    const balanceDue = totalTTC - totalPaid;

    const handleDownloadPDF = (e: React.MouseEvent) => {
        e.preventDefault();
        window.print();
    };

    return (
        <div className="fixed inset-0 z-[1000] bg-[#0f172a] flex flex-col no-print-background print:static print:bg-white overflow-hidden">
            <style>{`
                @media print {
                    @page { margin: 10mm; size: A4; }
                    body * { visibility: hidden; }
                    .print-area, .print-area * { visibility: visible; }
                    .print-area { 
                        position: absolute; left: 0; top: 0; width: 210mm; height: 297mm;
                        padding: 0; background: white !important; color: black;
                        transform: scale(1) !important;
                    }
                    .no-print { display: none !important; }
                }
                .invoice-paper {
                    width: 210mm;
                    height: 297mm;
                    background: white;
                    box-shadow: 0 30px 60px rgba(0,0,0,0.5);
                    padding: 15mm;
                    margin: auto;
                    transform-origin: center center;
                }
            `}</style>

            <div className="h-16 bg-[#1e293b]/90 backdrop-blur-md border-b border-white/5 flex items-center justify-between px-6 shrink-0 z-50 no-print">
                <div className="flex items-center gap-4">
                    <FileText className="text-white opacity-80" size={22}/>
                    <h2 className="text-white font-black uppercase tracking-widest text-[11px]">{isProforma ? 'Aperçu Facture Proforma' : 'Aperçu Facturation'}</h2>
                </div>

                <div className="flex bg-[#0f172a] rounded-xl p-1 border border-white/10">
                    <button 
                        onClick={() => setIncludeGroup(false)} 
                        className={`flex items-center gap-2 px-5 py-1.5 rounded-lg text-[10px] font-black uppercase transition-all ${!includeGroup ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-400 hover:text-white'}`}
                    >
                        <BedDouble size={14}/> Individuel
                    </button>
                    <button 
                        onClick={() => setIncludeGroup(true)} 
                        className={`flex items-center gap-2 px-5 py-1.5 rounded-lg text-[10px] font-black uppercase transition-all ${includeGroup ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-400 hover:text-white'}`}
                    >
                        <Building2 size={14}/> Dossier complet
                    </button>
                </div>

                <div className="flex items-center gap-4">
                    <div className="flex items-center bg-[#0f172a] rounded-xl border border-white/10 px-2 py-1 gap-2">
                        <button onClick={() => setScale(s => Math.max(0.3, s - 0.1))} className="text-slate-400 hover:text-white transition-colors"><ZoomOut size={16}/></button>
                        <div className="flex items-center gap-1 min-w-[50px] justify-center">
                            <Maximize size={12} className="text-indigo-400" />
                            <span className="text-[10px] font-black text-white tabular-nums">{Math.round(scale * 100)}%</span>
                        </div>
                        <button onClick={() => setScale(s => Math.min(2, s + 0.1))} className="text-slate-400 hover:text-white transition-colors"><ZoomIn size={16}/></button>
                    </div>

                    <button 
                        onClick={handleDownloadPDF} 
                        className="bg-white/10 hover:bg-white/20 text-white px-5 h-10 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-2 border border-white/10 active:scale-95 shadow-lg shadow-black/20"
                    >
                        <Download size={18}/> Télécharger PDF
                    </button>

                    <button 
                        onClick={() => window.print()} 
                        className="bg-[#10b981] hover:bg-[#059669] text-white px-6 h-10 rounded-xl text-[10px] font-black uppercase tracking-widest shadow-xl shadow-emerald-900/20 transition-all flex items-center gap-2 active:scale-95"
                    >
                        <Printer size={18}/> Imprimer
                    </button>

                    <button onClick={onClose} className="p-2.5 bg-white/5 text-slate-400 hover:bg-red-600 hover:text-white rounded-xl transition-all border border-white/10">
                        <X size={20}/>
                    </button>
                </div>
            </div>

            <div ref={containerRef} className="flex-1 overflow-auto p-12 flex justify-center items-start bg-[#0f172a] no-scrollbar scroll-smooth">
                <div 
                    ref={invoiceRef}
                    className="print-area invoice-paper text-slate-800 flex flex-col"
                    style={{ transform: `scale(${scale})` }}
                >
                    <div className="flex justify-between items-start mb-10 border-b border-indigo-100 pb-8">
                        <div className="space-y-4">
                            <div className="flex items-center gap-3">
                                <div className="text-indigo-600"><Hotel size={36} strokeWidth={2.5}/></div>
                                <div>
                                    <h1 className="text-2xl font-black text-slate-900 tracking-tight uppercase leading-none">Hotel Manager</h1>
                                    <p className="text-[9px] font-bold text-slate-400 uppercase tracking-[0.3em] mt-1">PMS Pro v2.5</p>
                                </div>
                            </div>
                            <div className="text-[10px] leading-relaxed text-slate-500 font-medium">
                                <p className="text-slate-800 font-bold uppercase tracking-wide">Émetteur</p>
                                <p>12 Avenue des Champs Élysées, 75000 Paris</p>
                                <p>Tél : +33 1 23 45 67 89 | contact@hotelmanager.io</p>
                            </div>
                        </div>

                        <div className="text-right">
                            <h2 className="text-4xl font-black text-slate-900 uppercase tracking-tighter">{isProforma ? 'Facture Proforma' : 'Facture'}</h2>
                            <p className="text-xs font-mono font-bold text-slate-400 mt-1">
                                {isProforma ? '#PRO-' : '#INV-'}{format(new Date(), 'yyyy')}-{reservation.id.slice(-4).toUpperCase()}
                            </p>
                            <div className="mt-4 pt-4 border-t border-slate-50 text-[10px] font-bold uppercase text-slate-500 tracking-widest">
                                {isProforma ? 'Générée' : 'Émise'} le {format(new Date(), 'dd MMMM yyyy', { locale: fr })}
                            </div>
                        </div>
                    </div>

                    <div className="mb-10 flex justify-end">
                        <div className="w-1/2 p-7 rounded-[2rem] border border-slate-100 bg-slate-50/50">
                            <p className="text-[8px] font-black text-slate-400 uppercase tracking-[0.2em] mb-3">Destinataire</p>
                            <p className="text-2xl font-black text-slate-900 uppercase tracking-tight">{reservation.clientName}</p>
                            {client?.address && <p className="text-[11px] text-slate-500 mt-2 leading-snug whitespace-pre-line">{client.address}</p>}
                            <div className="mt-5 pt-5 border-t border-slate-200/50 flex items-center gap-3">
                                <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Client:</span>
                                <span className="text-[10px] font-mono font-bold text-indigo-600 uppercase">#{reservation.clientId}</span>
                            </div>
                        </div>
                    </div>

                    <div className="flex-1">
                        <table className="w-full text-left mb-8">
                            <thead className="border-b-2 border-slate-900">
                                <tr>
                                    <th className="py-4 font-black text-[9px] uppercase tracking-widest text-slate-400">Libellé</th>
                                    <th className="py-4 text-center w-20 font-black text-[9px] uppercase tracking-widest text-slate-400">Qté</th>
                                    <th className="py-4 text-right w-24 font-black text-[9px] uppercase tracking-widest text-slate-400">P.U. HT</th>
                                    <th className="py-4 text-right w-32 font-black text-[9px] uppercase tracking-widest text-slate-400">Total TTC</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {invoiceLines.map((line, idx) => (
                                    <tr key={idx}>
                                        <td className="py-3">
                                            <div className="flex items-start gap-2">
                                                {line.description.includes('Hébergement') ? <BedDouble size={14} className="mt-0.5 text-indigo-600"/> : line.description.includes('Pension') ? <Utensils size={14} className="mt-0.5 text-emerald-600"/> : null}
                                                <div className="flex-1">
                                                    <p className="text-[11px] font-black text-slate-900 uppercase leading-snug">{line.description}</p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="py-3 text-center text-[11px] font-black text-slate-500 tabular-nums">{line.quantity}</td>
                                        <td className="py-3 text-right text-[11px] font-bold text-slate-500 tabular-nums">{(line.unitPrice / (1 + line.tvaRate)).toFixed(2)} €</td>
                                        <td className="py-3 text-right text-[11px] font-black text-slate-900 tabular-nums">{line.total.toFixed(2)} €</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>

                        {allPayments.length > 0 && (
                            <div className="mt-12 bg-slate-50/50 border border-slate-100 rounded-3xl p-6">
                                <h4 className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] mb-4 flex items-center gap-2">
                                    <Receipt size={14} className="text-emerald-600"/> Règlements perçus
                                </h4>
                                <table className="w-full text-left">
                                    <thead className="border-b border-slate-200">
                                        <tr>
                                            <th className="py-2 text-[8px] font-black text-slate-400 uppercase tracking-widest">Date</th>
                                            <th className="py-2 text-[8px] font-black text-slate-400 uppercase tracking-widest">Désignation</th>
                                            <th className="py-2 text-[8px] font-black text-slate-400 uppercase tracking-widest">Mode</th>
                                            <th className="py-2 text-right text-[8px] font-black text-slate-400 uppercase tracking-widest">Montant</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                        {allPayments.map((p, idx) => (
                                            <tr key={idx}>
                                                <td className="py-2 text-[10px] text-slate-500 tabular-nums">{format(new Date(p.date), 'dd/MM/yyyy')}</td>
                                                <td className="py-2 text-[10px] font-bold text-slate-700">
                                                    {p.isDeposit ? `Acompte initial (Ch.${p.roomNumber})` : `Versement partiel (Ch.${p.roomNumber})`}
                                                </td>
                                                <td className="py-2"><span className="text-[9px] font-black text-slate-400 border border-slate-200 px-1.5 py-0.5 rounded uppercase">{p.method}</span></td>
                                                <td className="py-2 text-right text-[10px] font-black text-emerald-600 tabular-nums">-{p.amount.toFixed(2)} €</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>

                    <div className="mt-10 flex justify-between items-end">
                        <div className="w-1/3">
                            <h4 className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-4">Détails Fiscalité</h4>
                            <div className="space-y-2">
                                {Object.entries(vatBreakdown).map(([rate, data]) => {
                                    const vatData = data as any;
                                    const ratePercent = Math.round(parseFloat(rate) * 100);
                                    if (vatData.baseHT === 0) return null;
                                    return (
                                        <div key={rate} className="flex justify-between text-[10px] text-slate-500 font-bold">
                                            <span className="uppercase">TVA {ratePercent}%</span>
                                            <span>HT: {vatData.baseHT.toFixed(2)} €</span>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>

                        <div className="w-[45%]">
                            <div className="bg-slate-900 text-white p-8 rounded-[2rem] shadow-2xl relative overflow-hidden">
                                <div className="absolute top-0 right-0 p-4 opacity-5"><Coins size={100}/></div>
                                <div className="space-y-2 mb-6">
                                    <div className="flex justify-between text-[10px] font-black text-slate-400 uppercase tracking-widest">
                                        <span>Total HT</span>
                                        <span className="font-mono">{totalHT.toFixed(2)} €</span>
                                    </div>
                                    <div className="flex justify-between text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-white/10 pb-2">
                                        <span>Total Taxes</span>
                                        <span className="font-mono">{totalTVA.toFixed(2)} €</span>
                                    </div>
                                    <div className="flex justify-between text-[10px] font-black text-slate-400 uppercase tracking-widest pt-2">
                                        <span>Total TTC</span>
                                        <span className="font-mono">{totalTTC.toFixed(2)} €</span>
                                    </div>
                                </div>
                                <div className="flex justify-between items-center border-t border-white/20 pt-4">
                                    <span className="text-[10px] font-black uppercase tracking-[0.2em] text-indigo-400">Net à Payer</span>
                                    <div className="text-right">
                                        <span className="text-4xl font-black tracking-tighter">{balanceDue.toFixed(2)}</span>
                                        <span className="text-lg font-black ml-1 opacity-40">€</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="mt-12 text-center border-t border-slate-100 pt-8">
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] italic">Hotel Manager PMS v2.5 - Document officiel</p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default InvoicePreview;
