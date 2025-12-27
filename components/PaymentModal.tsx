import React, { useState, useEffect } from 'react';
import { X, Coins, CreditCard, Receipt, Printer, CheckCircle, AlertTriangle, Briefcase } from 'lucide-react';
import { Reservation, Payment, Room, Client } from '../types';
import * as api from '../services/api';
import { format } from 'date-fns';
import InvoicePreview from './InvoicePreview';

interface PaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  reservation: Reservation;
  onUpdate: () => void; // Trigger refresh
  allReservations: Reservation[];
  rooms: Room[];
}

const PaymentModal: React.FC<PaymentModalProps> = ({ isOpen, onClose, reservation, onUpdate, allReservations, rooms }) => {
  const [amount, setAmount] = useState<number>(0);
  const [method, setMethod] = useState<string>('CB');
  const [showInvoice, setShowInvoice] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Client info for checking Account Holder status
  const [clientInfo, setClientInfo] = useState<Client | null>(null);

  useEffect(() => {
    if (isOpen) {
        api.fetchClients().then(clients => {
            const found = clients.find(c => c.id === reservation.clientId);
            setClientInfo(found || null);
        });
    }
  }, [isOpen, reservation.clientId]);

  if (!isOpen) return null;

  // Calculate totals
  const totalPaid = reservation.payments.reduce((acc, p) => acc + p.amount, 0) + (reservation.depositAmount || 0);
  const remaining = reservation.totalPrice - totalPaid;
  
  const handleAddPayment = async () => {
      if (amount <= 0) return;
      setIsSubmitting(true);
      
      const payment: Payment = {
          id: `pay-${Date.now()}`,
          amount: amount,
          date: new Date(),
          method: method as any
      };

      await api.addPaymentToReservation(reservation.id, payment);
      setIsSubmitting(false);
      setAmount(0);
      onUpdate(); // Refresh data
  };

  const setFullBalance = () => {
      if (remaining > 0) setAmount(remaining);
  };

  const isAccountPayment = method === 'Compte Client';
  const canUseAccount = clientInfo?.isAccountHolder;

  return (
    <>
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col">
        
        {/* Header */}
        <div className="bg-slate-900 text-white p-5 flex justify-between items-center shrink-0">
          <div>
            <h3 className="font-bold text-lg flex items-center gap-2">
                <Coins size={20} className="text-emerald-400"/> Gestion Règlements
            </h3>
            <p className="text-slate-400 text-xs">Dossier: {reservation.clientName} (Ch. {rooms.find(r=>r.id===reservation.roomId)?.number})</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-700 rounded-full transition-colors">
            <X size={20} />
          </button>
        </div>

        <div className="p-6 overflow-y-auto max-h-[80vh]">
            
            {/* KPI Summary */}
            <div className="grid grid-cols-3 gap-4 mb-6">
                <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 text-center">
                    <div className="text-xs text-slate-500 uppercase font-bold">Total Facture</div>
                    <div className="text-xl font-bold text-slate-800">{reservation.totalPrice.toFixed(2)} €</div>
                </div>
                <div className="bg-emerald-50 p-3 rounded-lg border border-emerald-100 text-center">
                    <div className="text-xs text-emerald-600 uppercase font-bold">Déjà Réglé</div>
                    <div className="text-xl font-bold text-emerald-600">{totalPaid.toFixed(2)} €</div>
                </div>
                <div className={`p-3 rounded-lg border text-center ${remaining > 0.01 ? 'bg-red-50 border-red-100' : 'bg-slate-100 border-slate-200'}`}>
                    <div className={`text-xs uppercase font-bold ${remaining > 0.01 ? 'text-red-600' : 'text-slate-500'}`}>Reste Dû</div>
                    <div className={`text-xl font-bold ${remaining > 0.01 ? 'text-red-600' : 'text-slate-400'}`}>{Math.max(0, remaining).toFixed(2)} €</div>
                </div>
            </div>

            {/* Payment List */}
            <div className="mb-8">
                <h4 className="font-bold text-slate-700 mb-3 flex items-center gap-2 text-sm">
                    <Receipt size={16}/> Historique
                </h4>
                <div className="border rounded-lg overflow-hidden">
                    <table className="w-full text-sm text-left">
                        <thead className="bg-slate-50 text-xs uppercase text-slate-500">
                            <tr>
                                <th className="px-4 py-2">Date</th>
                                <th className="px-4 py-2">Mode</th>
                                <th className="px-4 py-2 text-right">Montant</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {reservation.depositAmount ? (
                                <tr>
                                    <td className="px-4 py-2 text-slate-500">-</td>
                                    <td className="px-4 py-2">Acompte Initial</td>
                                    <td className="px-4 py-2 text-right font-medium text-emerald-600">{reservation.depositAmount.toFixed(2)} €</td>
                                </tr>
                            ) : null}
                            {reservation.payments.map(p => (
                                <tr key={p.id}>
                                    <td className="px-4 py-2">{format(new Date(p.date), 'dd/MM/yyyy HH:mm')}</td>
                                    <td className="px-4 py-2">{p.method}</td>
                                    <td className="px-4 py-2 text-right font-medium text-emerald-600">{p.amount.toFixed(2)} €</td>
                                </tr>
                            ))}
                            {reservation.payments.length === 0 && !reservation.depositAmount && (
                                <tr>
                                    <td colSpan={3} className="px-4 py-4 text-center text-slate-400 italic text-xs">Aucun règlement enregistré.</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Add Payment Form */}
            {remaining > 0.01 ? (
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 mb-6">
                    <h4 className="font-bold text-slate-800 mb-3 text-sm flex items-center gap-2">
                        <CreditCard size={16}/> Nouveau Règlement
                    </h4>
                    <div className="flex flex-col gap-4">
                        <div className="flex gap-3 items-end">
                            <div className="flex-1">
                                <label className="block text-xs font-bold text-slate-500 mb-1">Montant</label>
                                <div className="relative">
                                    <input 
                                        type="number" 
                                        className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-emerald-500 outline-none bg-white text-slate-900"
                                        value={amount}
                                        onChange={e => setAmount(parseFloat(e.target.value))}
                                    />
                                    <button 
                                        onClick={setFullBalance}
                                        className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded hover:bg-emerald-100"
                                    >
                                        Tout
                                    </button>
                                </div>
                            </div>
                            <div className="w-48">
                                <label className="block text-xs font-bold text-slate-500 mb-1">Mode</label>
                                <select 
                                    className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-emerald-500 outline-none bg-white text-slate-900"
                                    value={method}
                                    onChange={e => setMethod(e.target.value)}
                                >
                                    <option value="CB">Carte Bancaire</option>
                                    <option value="Espèces">Espèces</option>
                                    <option value="Virement">Virement</option>
                                    <option value="Chèque">Chèque</option>
                                    <option value="Compte Client">Compte Client</option>
                                </select>
                            </div>
                            <button 
                                onClick={handleAddPayment}
                                disabled={amount <= 0 || isSubmitting || (isAccountPayment && !canUseAccount)}
                                className="bg-emerald-600 text-white px-4 py-2 rounded-lg font-bold hover:bg-emerald-700 disabled:opacity-50 transition shadow-sm h-[38px]"
                            >
                                Encaisser
                            </button>
                        </div>

                        {/* Special Info for "Compte Client" */}
                        {isAccountPayment && clientInfo && (
                            <div className={`text-sm p-3 rounded-lg border flex items-center gap-3 ${canUseAccount ? 'bg-blue-50 border-blue-100 text-blue-800' : 'bg-red-50 border-red-100 text-red-800'}`}>
                                {canUseAccount ? (
                                    <>
                                        <Briefcase size={18} className="shrink-0" />
                                        <div>
                                            <p className="font-bold">Mise en compte autorisée.</p>
                                            <p className="text-xs">Solde actuel du client : <span className="font-mono font-bold">{clientInfo.balance.toFixed(2)} €</span></p>
                                            <p className="text-xs mt-1 opacity-80">Le montant sera ajouté à la dette du client {clientInfo.company || clientInfo.lastName}.</p>
                                        </div>
                                    </>
                                ) : (
                                    <>
                                        <AlertTriangle size={18} className="shrink-0" />
                                        <div>
                                            <p className="font-bold">Ce client n'est pas autorisé en compte débiteur.</p>
                                            <p className="text-xs">Veuillez modifier la fiche client ou choisir un autre mode de paiement.</p>
                                        </div>
                                    </>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            ) : (
                <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-4 flex items-center gap-3 text-emerald-800 mb-6">
                    <CheckCircle size={24} className="text-emerald-600" />
                    <span className="font-bold text-sm">Cette facture est intégralement réglée.</span>
                </div>
            )}
            
            {/* Actions Footer */}
            <div className="flex justify-end pt-4 border-t gap-3">
                <button 
                    onClick={() => setShowInvoice(true)}
                    className="flex items-center gap-2 px-4 py-2 border border-slate-300 rounded-lg text-slate-700 font-medium hover:bg-slate-50"
                >
                    <Printer size={18} /> Télécharger Facture
                </button>
                <button 
                    onClick={onClose}
                    className="px-4 py-2 bg-slate-800 text-white rounded-lg font-medium hover:bg-slate-700"
                >
                    Fermer
                </button>
            </div>
        </div>
      </div>
    </div>

    {/* Invoice Preview Layer */}
    {showInvoice && (
        <InvoicePreview 
            reservation={reservation}
            allReservations={allReservations}
            rooms={rooms}
            client={clientInfo}
            onClose={() => setShowInvoice(false)}
        />
    )}
    </>
  );
};

export default PaymentModal;