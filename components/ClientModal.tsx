import React, { useState, useEffect } from 'react';
import { X, User, Phone, Mail, MapPin, Building, Save, Clock, CreditCard, ArrowRight, Coins, AlertTriangle, Briefcase } from 'lucide-react';
import { Client, Reservation, ReservationStatus } from '../types';
import * as api from '../services/api';
import { format } from 'date-fns';
import fr from 'date-fns/locale/fr';

interface ClientModalProps {
  client: Client | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (client: Client) => void;
  isCreating?: boolean;
}

const ClientModal: React.FC<ClientModalProps> = ({ client, isOpen, onClose, onSave, isCreating = false }) => {
  const [activeTab, setActiveTab] = useState<'info' | 'history' | 'accounting'>('info');
  const [formData, setFormData] = useState<Partial<Client>>({});
  const [history, setHistory] = useState<Reservation[]>([]);
  const [paymentAmount, setPaymentAmount] = useState<string>('');

  useEffect(() => {
    if (isOpen) {
      if (client) {
        setFormData({ ...client });
        if (!isCreating) {
            api.fetchClientHistory(client.id).then(setHistory);
        }
      } else {
        setFormData({ civility: 'M.', balance: 0, isAccountHolder: false }); // Default for creation
      }
      setActiveTab('info');
      setPaymentAmount('');
    }
  }, [isOpen, client, isCreating]);

  if (!isOpen) return null;

  const handleChange = (field: keyof Client, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSave = () => {
    if (!formData.firstName || !formData.lastName) {
        alert("Nom et prénom obligatoires");
        return;
    }
    // Cast partial to Client because we validate required fields
    onSave(formData as Client);
    onClose();
  };

  const handleSettleDebt = async () => {
      const amount = parseFloat(paymentAmount);
      if (!client || isNaN(amount) || amount <= 0) return;
      
      const updatedClient = await api.updateClientBalance(client.id, amount);
      if (updatedClient) {
          setFormData(updatedClient); // Update local view
          setPaymentAmount('');
          // Refresh parent list
          onSave(updatedClient); 
      }
  };

  const currentBalance = formData.balance || 0;
  
  // Standardized input style for visibility
  const inputClass = "w-full border border-slate-300 rounded-lg px-3 py-2 bg-white text-slate-900 focus:ring-2 focus:ring-indigo-500 outline-none placeholder:text-slate-400";

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl h-[85vh] flex flex-col overflow-hidden">
        
        {/* Header */}
        <div className="bg-slate-900 text-white p-6 flex justify-between items-center shrink-0">
          <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-indigo-500 rounded-full flex items-center justify-center text-xl font-bold">
                  {formData.firstName?.[0]}{formData.lastName?.[0]}
              </div>
              <div>
                <h2 className="text-xl font-bold flex items-center gap-2">
                    {formData.firstName} {formData.lastName}
                    {formData.company && <span className="text-sm font-normal bg-slate-700 px-2 py-0.5 rounded text-slate-300">{formData.company}</span>}
                </h2>
                <p className="text-slate-400 text-sm">{isCreating ? 'Nouveau Client' : `Client #${client?.id}`}</p>
              </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-700 rounded-full transition-colors">
            <X size={24} />
          </button>
        </div>

        <div className="flex flex-1 overflow-hidden">
            {/* Sidebar Tabs */}
            <div className="w-48 bg-slate-50 border-r flex flex-col pt-4">
                <button 
                    onClick={() => setActiveTab('info')}
                    className={`px-4 py-3 text-sm font-bold flex items-center gap-2 transition-colors border-l-4 ${activeTab === 'info' ? 'border-indigo-500 text-indigo-700 bg-indigo-50' : 'border-transparent text-slate-500 hover:bg-slate-100'}`}
                >
                    <User size={18}/> Fiche Info
                </button>
                {!isCreating && (
                    <>
                        <button 
                            onClick={() => setActiveTab('history')}
                            className={`px-4 py-3 text-sm font-bold flex items-center gap-2 transition-colors border-l-4 ${activeTab === 'history' ? 'border-indigo-500 text-indigo-700 bg-indigo-50' : 'border-transparent text-slate-500 hover:bg-slate-100'}`}
                        >
                            <Clock size={18}/> Historique
                        </button>
                        <button 
                            onClick={() => setActiveTab('accounting')}
                            className={`px-4 py-3 text-sm font-bold flex items-center gap-2 transition-colors border-l-4 ${activeTab === 'accounting' ? 'border-indigo-500 text-indigo-700 bg-indigo-50' : 'border-transparent text-slate-500 hover:bg-slate-100'}`}
                        >
                            <CreditCard size={18}/> Comptabilité
                        </button>
                    </>
                )}
            </div>

            {/* Content Area */}
            <div className="flex-1 overflow-y-auto p-8 bg-white">
                
                {/* --- TAB: INFO --- */}
                {activeTab === 'info' && (
                    <div className="space-y-6 max-w-2xl">
                        <div className="grid grid-cols-2 gap-4">
                             <div className="col-span-1">
                                 <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Civilité</label>
                                 <select 
                                    className={inputClass}
                                    value={formData.civility}
                                    onChange={e => handleChange('civility', e.target.value)}
                                 >
                                     <option value="M.">M.</option>
                                     <option value="Mme">Mme</option>
                                     <option value="Dr">Dr</option>
                                     <option value="Sté">Société</option>
                                 </select>
                             </div>
                             <div className="col-span-1"></div> {/* Spacer */}

                             <div className="col-span-1">
                                 <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Prénom</label>
                                 <input 
                                    className={inputClass}
                                    value={formData.firstName || ''}
                                    onChange={e => handleChange('firstName', e.target.value)}
                                 />
                             </div>
                             <div className="col-span-1">
                                 <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Nom</label>
                                 <input 
                                    className={inputClass}
                                    value={formData.lastName || ''}
                                    onChange={e => handleChange('lastName', e.target.value)}
                                 />
                             </div>

                             <div className="col-span-2">
                                 <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Société</label>
                                 <div className="relative">
                                    <Building className="absolute left-3 top-2.5 text-slate-400" size={16}/>
                                    <input 
                                        className={`${inputClass} pl-10`}
                                        value={formData.company || ''}
                                        onChange={e => handleChange('company', e.target.value)}
                                        placeholder="Optionnel"
                                    />
                                 </div>
                             </div>

                             {/* Account Holder Toggle */}
                             <div className="col-span-2 bg-slate-50 p-4 rounded-lg border border-slate-200 mt-2">
                                <label className="flex items-center gap-3 cursor-pointer">
                                    <div className="relative">
                                        <input 
                                            type="checkbox" 
                                            className="sr-only peer"
                                            checked={formData.isAccountHolder || false}
                                            onChange={e => handleChange('isAccountHolder', e.target.checked)}
                                        />
                                        <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-indigo-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
                                    </div>
                                    <div>
                                        <span className="text-sm font-bold text-slate-800 flex items-center gap-2">
                                            <Briefcase size={16} /> Compte Débiteur autorisé
                                        </span>
                                        <p className="text-xs text-slate-500">
                                            Permet d'utiliser le mode de paiement "Compte Client" et d'autoriser le crédit pour ce client.
                                        </p>
                                    </div>
                                </label>
                             </div>

                             <div className="col-span-1">
                                 <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Téléphone</label>
                                 <div className="relative">
                                    <Phone className="absolute left-3 top-2.5 text-slate-400" size={16}/>
                                    <input 
                                        className={`${inputClass} pl-10`}
                                        value={formData.phone || ''}
                                        onChange={e => handleChange('phone', e.target.value)}
                                    />
                                 </div>
                             </div>
                             <div className="col-span-1">
                                 <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Email</label>
                                 <div className="relative">
                                    <Mail className="absolute left-3 top-2.5 text-slate-400" size={16}/>
                                    <input 
                                        className={`${inputClass} pl-10`}
                                        value={formData.email || ''}
                                        onChange={e => handleChange('email', e.target.value)}
                                    />
                                 </div>
                             </div>

                             <div className="col-span-2">
                                 <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Adresse</label>
                                 <div className="relative">
                                    <MapPin className="absolute left-3 top-2.5 text-slate-400" size={16}/>
                                    <input 
                                        className={`${inputClass} pl-10`}
                                        value={formData.address || ''}
                                        onChange={e => handleChange('address', e.target.value)}
                                    />
                                 </div>
                             </div>

                             <div className="col-span-2">
                                 <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Notes Internes</label>
                                 <textarea 
                                    className={`${inputClass} h-24`}
                                    value={formData.notes || ''}
                                    onChange={e => handleChange('notes', e.target.value)}
                                    placeholder="Préférences, allergies, VIP..."
                                 />
                             </div>
                        </div>
                    </div>
                )}

                {/* --- TAB: HISTORY --- */}
                {activeTab === 'history' && (
                    <div>
                        <h3 className="text-lg font-bold text-slate-800 mb-6">Historique des séjours</h3>
                        {history.length === 0 ? (
                            <p className="text-slate-500 italic">Aucun séjour enregistré pour ce client.</p>
                        ) : (
                            <div className="overflow-hidden border rounded-xl shadow-sm">
                                <table className="w-full text-sm text-left">
                                    <thead className="bg-slate-50 text-xs text-slate-500 uppercase font-bold">
                                        <tr>
                                            <th className="px-4 py-3">Dates</th>
                                            <th className="px-4 py-3">Chambre</th>
                                            <th className="px-4 py-3">Montant</th>
                                            <th className="px-4 py-3">Statut</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                        {history.sort((a,b) => b.checkIn.getTime() - a.checkIn.getTime()).map(res => (
                                            <tr key={res.id} className="hover:bg-slate-50">
                                                <td className="px-4 py-3">
                                                    <span className="font-medium text-slate-700">{format(res.checkIn, 'dd/MM/yyyy')}</span>
                                                    <span className="text-slate-400 mx-1">→</span>
                                                    <span className="text-slate-500">{format(res.checkOut, 'dd/MM/yyyy')}</span>
                                                </td>
                                                <td className="px-4 py-3">
                                                    {/* In a real app we'd map roomId to room number via context/props */}
                                                    <span className="bg-slate-100 px-2 py-0.5 rounded text-xs font-mono">
                                                        {res.roomId}
                                                    </span>
                                                </td>
                                                <td className="px-4 py-3 font-medium">{res.totalPrice} €</td>
                                                <td className="px-4 py-3">
                                                    <span className={`px-2 py-0.5 rounded-full text-xs font-bold
                                                        ${res.status === ReservationStatus.CHECKED_OUT ? 'bg-slate-100 text-slate-500' : 
                                                          res.status === ReservationStatus.CANCELLED ? 'bg-red-50 text-red-500' : 'bg-emerald-50 text-emerald-600'}
                                                    `}>
                                                        {res.status}
                                                    </span>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                )}

                {/* --- TAB: ACCOUNTING --- */}
                {activeTab === 'accounting' && (
                    <div>
                        <div className="flex gap-6 mb-8">
                            <div className={`flex-1 p-6 rounded-xl border ${currentBalance > 0 ? 'bg-red-50 border-red-200' : 'bg-emerald-50 border-emerald-200'}`}>
                                <h3 className={`text-sm font-bold uppercase tracking-wider mb-2 ${currentBalance > 0 ? 'text-red-700' : 'text-emerald-700'}`}>
                                    Solde Compte Client
                                </h3>
                                <div className="flex items-baseline gap-2">
                                    <span className={`text-4xl font-bold ${currentBalance > 0 ? 'text-red-600' : 'text-emerald-600'}`}>
                                        {currentBalance.toFixed(2)} €
                                    </span>
                                    {currentBalance > 0 && <span className="text-sm font-medium text-red-500">Dette à régler</span>}
                                    {currentBalance <= 0 && <span className="text-sm font-medium text-emerald-500">À jour</span>}
                                </div>
                            </div>
                            
                            <div className="flex-1 p-6 rounded-xl border border-slate-200 bg-white">
                                <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-4 flex items-center gap-2">
                                    <Coins size={16}/> Solder une dette
                                </h3>
                                <div className="flex gap-2">
                                    <input 
                                        type="number" 
                                        placeholder="Montant du règlement..."
                                        className={inputClass}
                                        value={paymentAmount}
                                        onChange={e => setPaymentAmount(e.target.value)}
                                    />
                                    <button 
                                        onClick={handleSettleDebt}
                                        disabled={!paymentAmount || parseFloat(paymentAmount) <= 0}
                                        className="bg-emerald-600 text-white px-4 py-2 rounded-lg font-bold hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        Encaisser
                                    </button>
                                </div>
                                <p className="text-xs text-slate-400 mt-2">
                                    Enregistre un paiement "Règlement dette" et met à jour le solde.
                                </p>
                            </div>
                        </div>

                        {currentBalance > 1000 && (
                            <div className="flex items-start gap-3 bg-amber-50 border border-amber-200 p-4 rounded-lg text-amber-800 text-sm font-medium">
                                <AlertTriangle size={20} className="shrink-0"/>
                                <div>
                                    Attention : Le solde débiteur est élevé. Veuillez contacter le client pour régularisation avant d'accepter de nouvelles mises en compte.
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t bg-slate-50 flex justify-end gap-3 shrink-0">
            <button onClick={onClose} className="px-4 py-2 text-slate-600 hover:text-slate-800 font-medium">
                Fermer
            </button>
            <button 
                onClick={handleSave}
                className="bg-indigo-600 text-white px-6 py-2 rounded-lg font-bold hover:bg-indigo-700 flex items-center gap-2"
            >
                <Save size={18}/> Enregistrer
            </button>
        </div>
      </div>
    </div>
  );
};

export default ClientModal;