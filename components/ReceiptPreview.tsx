
import React, { useState, useEffect, useRef } from 'react';
import { 
  Printer, X, Hotel, Coins, CheckCircle2, Calendar, 
  Hash, BedDouble, ZoomIn, ZoomOut, Maximize, FileText, ListOrdered, Download 
} from 'lucide-react';
import { format } from 'date-fns';
import fr from 'date-fns/locale/fr';
// @ts-ignore
import html2pdf from 'html2pdf.js';
import { Payment, Reservation, Room } from '../types';

interface ReceiptPreviewProps {
  payments: Payment | Payment[]; // Supporte un seul ou plusieurs règlements
  reservation: Reservation;
  rooms: Room[];
  onClose: () => void;
}

const ReceiptPreview: React.FC<ReceiptPreviewProps> = ({ payments, reservation, rooms, onClose }) => {
  const room = rooms.find(r => r.id === reservation.roomId);
  const [scale, setScale] = useState(0.85);
  const containerRef = useRef<HTMLDivElement>(null);
  const receiptRef = useRef<HTMLDivElement>(null);

  const paymentList = Array.isArray(payments) ? payments : [payments];
  const isMulti = paymentList.length > 1;
  const totalAmount = paymentList.reduce((acc, p) => acc + p.amount, 0);

  // Moteur de mise à l'échelle automatique (Fit-to-screen)
  const handleAutoFit = () => {
    if (containerRef.current && receiptRef.current) {
        const padding = 80;
        const containerW = containerRef.current.clientWidth - padding;
        const containerH = containerRef.current.clientHeight - padding;
        const A4W = 794; 
        const A4H = 1123;
        const scaleW = containerW / A4W;
        const scaleH = containerH / A4H;
        // setScale(Math.min(scaleW, scaleH, 1.2)); // Commenté pour garder le zoom à 85% par défaut
    }
  };

  useEffect(() => {
    const timer = setTimeout(handleAutoFit, 100);
    window.addEventListener('resize', handleAutoFit);
    return () => {
        window.removeEventListener('resize', handleAutoFit);
        clearTimeout(timer);
    };
  }, []);

  const handleDownloadPDF = async (e: React.MouseEvent) => {
    e.preventDefault();
    if (!receiptRef.current) return;

    const fileName = isMulti 
        ? `Releve_Reglements_${reservation.clientName.replace(/\s+/g, '_')}.pdf` 
        : `Recu_Reglement_${reservation.clientName.replace(/\s+/g, '_')}.pdf`;

    const opt = {
        margin: 0,
        filename: fileName,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { 
            scale: 2, 
            useCORS: true, 
            letterRendering: true,
            backgroundColor: '#ffffff'
        },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
    };

    try {
        const element = receiptRef.current.cloneNode(true) as HTMLElement;
        element.style.transform = 'scale(1)';
        
        const tempContainer = document.createElement('div');
        tempContainer.style.position = 'absolute';
        tempContainer.style.left = '-9999px';
        tempContainer.style.top = '-9999px';
        tempContainer.appendChild(element);
        document.body.appendChild(tempContainer);

        await html2pdf().set(opt).from(element).save();
        
        document.body.removeChild(tempContainer);
    } catch (err) {
        console.error('Erreur lors de la génération du PDF:', err);
        alert('Une erreur est survenue lors de la génération du PDF.');
    }
  };

  const invoiceRef = `INV-${format(new Date(), 'yyyy')}-${reservation.id.slice(-4).toUpperCase()}`;

  return (
    <div className="fixed inset-0 z-[1000] bg-[#0f172a] flex flex-col no-print-background print:static print:bg-white overflow-hidden">
      <style>{`
        @media print {
          @page { margin: 0; size: A4; }
          body * { visibility: hidden; }
          .print-area, .print-area * { visibility: visible; }
          .print-area { 
            position: absolute; left: 0; top: 0; width: 210mm; height: 297mm;
            padding: 0; background: white !important; color: black;
            transform: scale(1) !important;
          }
          .no-print { display: none !important; }
        }
        .receipt-paper {
            width: 210mm;
            height: 297mm;
            background: white;
            box-shadow: 0 30px 60px rgba(0,0,0,0.5);
            padding: 20mm;
            margin: auto;
            transform-origin: center center;
        }
        .no-scrollbar::-webkit-scrollbar { display: none; }
      `}</style>

      {/* TOOLBAR NOIRE */}
      <div className="h-16 bg-[#1e293b]/90 backdrop-blur-md border-b border-white/5 flex items-center justify-between px-6 shrink-0 z-50 no-print">
        <div className="flex items-center gap-4">
          <Coins size={22} className="text-emerald-400 opacity-80" />
          <h2 className="text-white font-black uppercase tracking-widest text-[11px]">
            {isMulti ? 'Relevé Global des Règlements' : 'Justificatif de Règlement'}
          </h2>
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
                <Printer size={18}/> {isMulti ? 'Imprimer le Relevé' : 'Imprimer le Reçu'}
            </button>

            <button onClick={onClose} className="p-2.5 bg-white/5 text-slate-400 hover:bg-red-600 hover:text-white rounded-xl transition-all border border-white/10">
                <X size={20}/>
            </button>
        </div>
      </div>

      {/* ZONE DE RENDU PAPIER */}
      <div ref={containerRef} className="flex-1 overflow-auto p-12 flex justify-center items-start bg-[#0f172a] no-scrollbar scroll-smooth">
        <div 
            ref={receiptRef}
            className="print-area receipt-paper text-slate-800 flex flex-col"
            style={{ transform: `scale(${scale})` }}
        >
            {/* Header Document */}
            <div className="flex justify-between items-start mb-16 border-b-2 border-slate-100 pb-10">
              <div className="flex items-center gap-4">
                <div className="bg-slate-900 p-3 rounded-2xl shadow-lg">
                  <Hotel className="text-white" size={32} />
                </div>
                <div>
                  <h1 className="text-2xl font-black text-slate-900 tracking-tight uppercase leading-none">HOTEL<span className="text-indigo-600">MANAGER</span></h1>
                  <p className="text-[9px] text-slate-400 tracking-[0.4em] uppercase font-black mt-1">Professional PMS • Paris</p>
                </div>
              </div>
              <div className="text-right">
                <h2 className="text-3xl font-[1000] text-slate-900 mb-1 uppercase tracking-tighter">
                  {isMulti ? 'RELEVÉ' : 'JUSTIFICATIF'}
                </h2>
                <p className="font-black text-emerald-600 text-sm">{isMulti ? 'Récapitulatif des versements' : 'Règlement encaissé'}</p>
              </div>
            </div>

            {/* Infos Principales */}
            <div className="grid grid-cols-2 gap-12 mb-16">
              <div className="space-y-6">
                <div>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Émis pour le client</p>
                  <p className="text-xl font-black text-slate-900 uppercase tracking-tight">{reservation.clientName}</p>
                  <p className="text-xs text-slate-500 font-medium mt-1">ID Client: #{reservation.clientId}</p>
                </div>
                <div className="bg-slate-50 p-6 rounded-3xl border border-slate-100 space-y-4 shadow-inner">
                   <div className="flex items-center gap-3">
                      <Hash size={16} className="text-indigo-600"/>
                      <div>
                        <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Référence Dossier</p>
                        <p className="text-xs font-black text-slate-700">{reservation.id}</p>
                      </div>
                   </div>
                   <div className="flex items-center gap-3">
                      <FileText size={16} className="text-indigo-600"/>
                      <div>
                        <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Document Lié</p>
                        <p className="text-xs font-black text-slate-700">Facture #{invoiceRef}</p>
                      </div>
                   </div>
                </div>
              </div>

              <div className="space-y-6">
                <div className="text-right">
                   <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Date d'édition</p>
                   <p className="text-sm font-bold text-slate-800">{format(new Date(), 'dd MMMM yyyy à HH:mm', { locale: fr })}</p>
                </div>
                <div className="bg-indigo-900 text-white p-6 rounded-3xl shadow-xl space-y-4 border-b-4 border-indigo-700">
                    <div className="flex items-center gap-3">
                        <Calendar size={16} className="text-indigo-300"/>
                        <div>
                            <p className="text-[8px] font-black text-indigo-300 uppercase tracking-widest">Période de séjour</p>
                            <p className="text-xs font-black">Du {format(reservation.checkIn, 'dd/MM/yy')} au {format(reservation.checkOut, 'dd/MM/yy')}</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-3 border-t border-white/10 pt-4">
                        <BedDouble size={16} className="text-indigo-300"/>
                        <div>
                            <p className="text-[8px] font-black text-indigo-300 uppercase tracking-widest">Hébergement</p>
                            <p className="text-xs font-black">Chambre {room?.number} ({room?.type})</p>
                        </div>
                    </div>
                </div>
              </div>
            </div>

            {/* Contenu Central : Switch entre un versement ou le relevé */}
            {!isMulti ? (
                /* VOUCHER INDIVIDUEL (Design existant) */
                <div className="bg-slate-50 border-2 border-slate-100 rounded-[2.5rem] p-12 text-center mb-12 relative overflow-hidden shadow-inner">
                   <div className="absolute top-0 right-0 p-8 opacity-[0.03] rotate-12">
                     <Coins size={250} />
                   </div>
                   <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.4em] mb-4 block">Somme reçue par l'établissement</span>
                   <div className="text-7xl font-[1000] text-emerald-600 tracking-tighter tabular-nums flex items-baseline justify-center gap-3 drop-shadow-sm">
                     {paymentList[0].amount.toFixed(2)} <span className="text-3xl font-black opacity-40">€</span>
                   </div>
                   <div className="mt-8 flex items-center justify-center gap-10">
                      <div className="text-left">
                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Mode de règlement</p>
                        <p className="text-lg font-black text-slate-800 uppercase">{paymentList[0].method}</p>
                      </div>
                      <div className="w-px h-10 bg-slate-200"></div>
                      <div className="text-left">
                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Statut financier</p>
                        <div className="flex items-center gap-2 text-emerald-600 font-black uppercase text-sm">
                          <CheckCircle2 size={18}/> Payé & Validé
                        </div>
                      </div>
                   </div>
                </div>
            ) : (
                /* RELEVÉ GLOBAL (Tableau compact comme la facture) */
                <div className="flex-1 space-y-8">
                    <h3 className="text-sm font-black text-slate-400 uppercase tracking-[0.2em] flex items-center gap-3">
                        <ListOrdered size={16} className="text-indigo-600"/> Détail des encaissements enregistrés
                    </h3>
                    <div className="overflow-hidden border border-slate-100 rounded-3xl">
                        <table className="w-full text-left border-collapse">
                            <thead className="bg-slate-50 border-b border-slate-100">
                                <tr>
                                    <th className="px-6 py-4 font-black text-[9px] uppercase tracking-widest text-slate-400">Date versement</th>
                                    <th className="px-6 py-4 font-black text-[9px] uppercase tracking-widest text-slate-400">Méthode</th>
                                    <th className="px-6 py-4 font-black text-[9px] uppercase tracking-widest text-slate-400">Référence / Unité</th>
                                    <th className="px-6 py-4 text-right font-black text-[9px] uppercase tracking-widest text-slate-400">Somme versée</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {paymentList.map((p, idx) => (
                                    <tr key={idx} className="hover:bg-slate-50/50">
                                        <td className="px-6 py-3 text-[10px] font-bold text-slate-600 tabular-nums">{format(new Date(p.date), 'dd/MM/yyyy HH:mm')}</td>
                                        <td className="px-6 py-3"><span className="px-1.5 py-0.5 bg-slate-100 rounded text-[8px] font-black uppercase border border-slate-200">{p.method}</span></td>
                                        <td className="px-6 py-3 text-[9px] font-black text-slate-400 uppercase tracking-tighter">
                                            {(p as any).roomNum ? `CH. ${(p as any).roomNum}` : `Chambre ${room?.number}`}
                                        </td>
                                        <td className="px-6 py-3 text-right font-black text-slate-800 tabular-nums text-[10px]">{p.amount.toFixed(2)} €</td>
                                    </tr>
                                ))}
                            </tbody>
                            <tfoot className="bg-emerald-50 text-emerald-800">
                                <tr>
                                    <td colSpan={3} className="px-6 py-5 font-black uppercase text-[10px] tracking-widest">Total cumulé encaissé sur ce dossier</td>
                                    <td className="px-6 py-5 text-right font-[1000] text-xl tabular-nums">{totalAmount.toFixed(2)} €</td>
                                </tr>
                            </tfoot>
                        </table>
                    </div>
                </div>
            )}

            {/* Footer text */}
            <div className="space-y-12 mt-auto">
              <div className="border-t-2 border-dashed border-slate-100 pt-8">
                <p className="text-xs text-slate-400 leading-relaxed italic text-center max-w-lg mx-auto">
                  {isMulti 
                    ? "Ce relevé de règlements récapitule l'intégralité des versements perçus par l'établissement pour le dossier cité. Il sert de justificatif comptable pour les paiements effectués."
                    : "Ce justificatif de règlement est émis à titre officiel. Il atteste de l'encaissement effectif des sommes citées pour les prestations d'hébergement et services annexes."}
                </p>
              </div>

              <div className="flex justify-between items-end pb-10">
                <div className="space-y-2">
                   <p className="text-[10px] font-black text-slate-300 uppercase tracking-widest">Tampon de l'établissement</p>
                   <div className="w-48 h-24 border border-slate-100 rounded-2xl bg-slate-50/30"></div>
                </div>
                <div className="text-right space-y-3">
                  <div className="bg-slate-900 p-2 rounded-xl inline-block shadow-lg">
                    <Hotel size={24} className="text-white" />
                  </div>
                  <p className="text-[8px] font-bold text-slate-400 uppercase tracking-[0.2em] leading-relaxed">
                    Document généré par Hotel Manager PMS v2.5<br/>
                    Le {format(new Date(), 'dd/MM/yyyy')} à {format(new Date(), 'HH:mm')}
                  </p>
                </div>
              </div>
            </div>
        </div>
      </div>
    </div>
  );
};

export default ReceiptPreview;
