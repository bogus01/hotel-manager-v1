
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
    CreditCard, 
    Smartphone, 
    Banknote, 
    Building2, 
    Plus, 
    Trash2, 
    Save, 
    Globe, 
    Coins, 
    ToggleLeft, 
    ToggleRight,
    AlertCircle,
    Info,
    X,
    Check,
    HelpCircle
} from 'lucide-react';
import Header from '../components/Header';
import { PaymentMethod, CurrencySettings } from '../types';
import * as api from '../services/api';
import { formatPrice } from '../utils/currency';

const SettingsPayments: React.FC = () => {
    const [methods, setMethods] = useState<PaymentMethod[]>([]);
    const [currency, setCurrency] = useState<CurrencySettings | null>(null);
    const [loading, setLoading] = useState(true);
    const [isSavingCurrency, setIsSavingCurrency] = useState(false);
    const navigate = useNavigate();
    
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [newMethodName, setNewMethodName] = useState('');
    const [newMethodIcon, setNewMethodIcon] = useState<'card' | 'cash' | 'mobile' | 'bank' | 'other'>('mobile');

    useEffect(() => {
        Promise.all([
            api.fetchPaymentMethods(),
            api.fetchCurrencySettings()
        ]).then(([m, c]) => {
            setMethods(m);
            setCurrency(c);
            setLoading(false);
        });
    }, []);

    const handleToggleActive = async (id: string) => {
        const updated = methods.map(m => m.id === id ? { ...m, isActive: !m.isActive } : m);
        setMethods(updated);
        const target = updated.find(m => m.id === id);
        if (target) await api.updatePaymentMethod(target);
    };

    const handleDelete = async (id: string) => {
        if (window.confirm("Supprimer ce mode de paiement ?")) {
            const success = await api.deletePaymentMethod(id);
            if (success) {
                setMethods(methods.filter(m => m.id !== id));
            } else {
                alert("Impossible de supprimer un mode système.");
            }
        }
    };

    const handleCreateMethod = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newMethodName.trim()) return;
        
        const newMethod = await api.createPaymentMethod({
            name: newMethodName,
            iconType: newMethodIcon,
            isActive: true
        });
        
        setMethods([...methods, newMethod]);
        setNewMethodName('');
        setIsCreateModalOpen(false);
    };

    const handleSaveCurrency = async () => {
        if (!currency) return;
        setIsSavingCurrency(true);
        await api.updateCurrencySettings(currency);
        
        // Redirection vers les paramètres après sauvegarde réussie
        setTimeout(() => {
            setIsSavingCurrency(false);
            navigate('/settings');
        }, 500);
    };

    const getIcon = (type: string) => {
        switch(type) {
            case 'card': return <CreditCard size={20} />;
            case 'cash': return <Banknote size={20} />;
            case 'mobile': return <Smartphone size={20} />;
            case 'bank': return <Building2 size={20} />;
            default: return <Coins size={20} />;
        }
    };

    if (loading || !currency) return (
        <div className="h-screen bg-slate-50 flex items-center justify-center">
            <div className="animate-spin text-indigo-600"><Coins size={40}/></div>
        </div>
    );

    const inputClass = "w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 font-bold text-slate-700 focus:ring-2 focus:ring-indigo-500 outline-none transition-all placeholder:text-slate-300 shadow-inner";
    const labelClass = "block text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-2 flex items-center gap-1.5";

    return (
        <div className="h-screen bg-slate-50 flex flex-col font-sans overflow-hidden">
            <Header title="Modes de Paiement & Devises" backLink="/settings" backLabel="Paramètres" />
            
            <main className="flex-1 overflow-y-auto">
                <div className="max-w-5xl mx-auto w-full p-8 space-y-10 pb-24">
                    
                    <section className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden animate-in fade-in slide-in-from-bottom-4">
                        <div className="p-8 flex items-center justify-between">
                            <div>
                                <h2 className="text-xl font-black text-slate-800 flex items-center gap-3">
                                    <div className="bg-indigo-600 p-1.5 rounded text-white shadow-sm"><Globe size={18}/></div> 
                                    Configuration Monétaire
                                </h2>
                                <p className="text-sm text-slate-500 font-medium">Adaptez le système aux normes de votre pays (ex: FCFA).</p>
                            </div>
                            <div className="bg-slate-900 text-white px-5 py-2 rounded-full text-xs font-black shadow-lg">
                                {currency.code}
                            </div>
                        </div>
                        
                        <div className="p-10 grid grid-cols-1 md:grid-cols-2 gap-12">
                            <div className="space-y-8">
                                <div>
                                    <label className={labelClass}>Code Devise (ISO)</label>
                                    <input 
                                        className={inputClass}
                                        value={currency.code}
                                        onChange={e => setCurrency({...currency, code: e.target.value.toUpperCase()})}
                                        placeholder="EUR, XOF, USD..."
                                    />
                                    <p className="text-[10px] text-slate-400 mt-2 italic font-medium">Standard bancaire (ex: XOF pour l'UEMOA).</p>
                                </div>
                                <div>
                                    <label className={labelClass}>Symbole d'affichage</label>
                                    <input 
                                        className={inputClass}
                                        value={currency.symbol}
                                        onChange={e => setCurrency({...currency, symbol: e.target.value})}
                                        placeholder="€, FCFA, $..."
                                    />
                                </div>
                                <div>
                                    <label className={labelClass}>Précision décimale</label>
                                    <div className="flex p-1.5 bg-slate-100 rounded-2xl border border-slate-200 shadow-inner">
                                        {[0, 1, 2].map((num) => (
                                            <button 
                                                key={num}
                                                onClick={() => setCurrency({...currency, decimalPlaces: num})}
                                                className={`flex-1 py-2.5 text-xs font-black rounded-xl transition-all ${currency.decimalPlaces === num ? 'bg-white text-indigo-600 shadow-md ring-1 ring-slate-200' : 'text-slate-500 hover:text-slate-700'}`}
                                            >
                                                {num === 0 ? 'ZÉRO (FCFA)' : (num === 2 ? 'DEUX (EUR/USD)' : num)}
                                            </button>
                                        ))}
                                    </div>
                                    <p className="text-[10px] text-slate-400 mt-2 italic font-medium">Choisissez 0 si votre monnaie n'utilise pas de centimes.</p>
                                </div>
                            </div>

                            <div className="space-y-8">
                                <div>
                                    <label className={labelClass}>Position du symbole</label>
                                    <div className="flex p-1.5 bg-slate-100 rounded-2xl border border-slate-200 shadow-inner">
                                        <button 
                                            onClick={() => setCurrency({...currency, position: 'prefix'})}
                                            className={`flex-1 py-2.5 text-xs font-black rounded-xl transition-all ${currency.position === 'prefix' ? 'bg-white text-indigo-600 shadow-md ring-1 ring-slate-200' : 'text-slate-500 hover:text-slate-700'}`}
                                        >
                                            {currency.symbol} 1 234
                                        </button>
                                        <button 
                                            onClick={() => setCurrency({...currency, position: 'suffix'})}
                                            className={`flex-1 py-2.5 text-xs font-black rounded-xl transition-all ${currency.position === 'suffix' ? 'bg-white text-indigo-600 shadow-md ring-1 ring-slate-200' : 'text-slate-500 hover:text-slate-700'}`}
                                        >
                                            1 234 {currency.symbol}
                                        </button>
                                    </div>
                                </div>
                                
                                <div className="grid grid-cols-2 gap-8">
                                    <div>
                                        <label className={labelClass}>
                                            Sép. Milliers 
                                            <div className="group relative cursor-help">
                                                <HelpCircle size={12} className="text-slate-300" />
                                                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-48 p-2 bg-slate-900 text-white text-[9px] rounded-lg shadow-xl hidden group-hover:block z-50 normal-case tracking-normal leading-normal font-medium border border-white/10">
                                                    Exemple : l'espace pour <span className="font-bold text-indigo-400">1 000</span>
                                                </div>
                                            </div>
                                        </label>
                                        <input 
                                            className="w-full bg-slate-50 border-2 border-slate-100 rounded-xl px-4 py-3 text-center font-black text-slate-800 focus:bg-white focus:border-indigo-500 outline-none transition-all shadow-inner"
                                            value={currency.thousandSeparator}
                                            onChange={e => setCurrency({...currency, thousandSeparator: e.target.value})}
                                            maxLength={1}
                                            placeholder="(Espace)"
                                        />
                                    </div>
                                    <div className={currency.decimalPlaces === 0 ? 'opacity-30 pointer-events-none' : ''}>
                                        <label className={labelClass}>Sép. Décimales</label>
                                        <input 
                                            className="w-full bg-slate-50 border-2 border-slate-100 rounded-xl px-4 py-3 text-center font-black text-slate-800 focus:bg-white focus:border-indigo-500 outline-none transition-all shadow-inner"
                                            value={currency.decimalSeparator}
                                            onChange={e => setCurrency({...currency, decimalSeparator: e.target.value})}
                                            maxLength={1}
                                            disabled={currency.decimalPlaces === 0}
                                        />
                                    </div>
                                </div>
                                <div className="p-6 bg-indigo-900 rounded-2xl shadow-xl shadow-indigo-100 border border-indigo-700 flex items-center justify-between">
                                    <span className="text-[10px] font-black text-indigo-300 uppercase tracking-widest">Aperçu temps réel :</span>
                                    <span className="text-2xl font-black text-white">{formatPrice(1234.56, currency)}</span>
                                </div>
                            </div>
                        </div>
                        
                        <div className="px-10 py-6 flex flex-col sm:flex-row justify-between items-center gap-4">
                            <div className="flex items-center gap-3 text-sm text-slate-500 font-bold uppercase tracking-tighter">
                                <div className="p-2 bg-indigo-100 text-indigo-600 rounded-lg"><Info size={16} /></div>
                                <span>Affecte factures et rapports</span>
                            </div>
                            <button 
                                onClick={handleSaveCurrency}
                                disabled={isSavingCurrency}
                                className="bg-indigo-600 text-white px-10 py-4 rounded-2xl font-black uppercase tracking-widest text-xs hover:bg-indigo-700 shadow-xl shadow-indigo-200 transition-all hover:scale-[1.02] active:scale-95 disabled:opacity-50 flex items-center gap-3"
                            >
                                <Save size={18}/> {isSavingCurrency ? 'Sauvegarde...' : 'Appliquer les réglages'}
                            </button>
                        </div>
                    </section>

                    <section className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden animate-in fade-in slide-in-from-bottom-4 delay-100">
                        <div className="p-8 flex items-center justify-between">
                            <div>
                                <h2 className="text-xl font-black text-slate-800 flex items-center gap-3">
                                    <div className="bg-indigo-600 p-1.5 rounded text-white shadow-sm"><CreditCard size={18}/></div>
                                    Méthodes de Paiement
                                </h2>
                                <p className="text-sm text-slate-500 font-medium">Moyens de règlement autorisés en caisse.</p>
                            </div>
                            <button 
                                onClick={() => setIsCreateModalOpen(true)}
                                className="bg-slate-900 text-white px-6 py-3 rounded-2xl font-black uppercase tracking-widest text-[10px] hover:bg-slate-800 flex items-center gap-2 shadow-xl transition-all hover:scale-105 active:scale-95"
                            >
                                <Plus size={18}/> Nouveau mode
                            </button>
                        </div>

                        <div className="p-10 grid grid-cols-1 md:grid-cols-2 gap-6">
                            {methods.map((method) => (
                                <div 
                                    key={method.id} 
                                    className={`group p-6 rounded-3xl border-2 transition-all flex items-center justify-between ${method.isActive ? 'bg-white border-slate-100 shadow-sm' : 'bg-slate-50 border-slate-50 opacity-50'}`}
                                >
                                    <div className="flex items-center gap-5">
                                        <div className={`p-4 rounded-2xl shadow-inner transition-all ${method.isActive ? 'bg-indigo-50 text-indigo-600 group-hover:scale-110' : 'bg-slate-200 text-slate-400'}`}>
                                            {getIcon(method.iconType)}
                                        </div>
                                        <div>
                                            <h3 className="font-black text-slate-800 text-lg leading-tight uppercase tracking-tighter">{method.name}</h3>
                                            <p className="text-[10px] uppercase font-black tracking-[0.2em] text-slate-400 mt-1">
                                                {method.isSystem ? 'Système' : 'Personnalisé'}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <button 
                                            onClick={() => handleToggleActive(method.id)}
                                            className={`p-1 transition-all rounded-full ${method.isActive ? 'text-emerald-500 hover:scale-110' : 'text-slate-300 hover:text-slate-400'}`}
                                            title={method.isActive ? 'Désactiver' : 'Activer'}
                                        >
                                            {method.isActive ? <ToggleRight size={44} /> : <ToggleLeft size={44} />}
                                        </button>
                                        {!method.isSystem && (
                                            <button 
                                                onClick={() => handleDelete(method.id)}
                                                className="p-3 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all opacity-0 group-hover:opacity-100"
                                                title="Supprimer"
                                            >
                                                <Trash2 size={20} />
                                            </button>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </section>
                </div>
            </main>

            {isCreateModalOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
                    <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-md overflow-hidden animate-in zoom-in duration-300">
                        <form onSubmit={handleCreateMethod}>
                            <div className="p-8 flex justify-between items-center">
                                <h3 className="font-black text-xl text-slate-800 uppercase tracking-tighter">Nouveau Mode</h3>
                                <button type="button" onClick={() => setIsCreateModalOpen(false)} className="text-slate-400 hover:text-slate-600 transition-all hover:rotate-90 p-1"><X size={28}/></button>
                            </div>
                            <div className="p-10 space-y-8">
                                <div>
                                    <label className={labelClass}>Libellé du moyen</label>
                                    <input 
                                        autoFocus
                                        required
                                        className={inputClass}
                                        placeholder="Ex: Mobile Money, Wave, Lydia..."
                                        value={newMethodName}
                                        onChange={e => setNewMethodName(e.target.value)}
                                    />
                                </div>
                                <div>
                                    <label className={labelClass}>Type d'icône</label>
                                    <div className="grid grid-cols-5 gap-4">
                                        {[
                                            { id: 'mobile', icon: <Smartphone size={20}/>, label: 'Tél' },
                                            { id: 'card', icon: <CreditCard size={20}/>, label: 'CB' },
                                            { id: 'cash', icon: <Banknote size={20}/>, label: 'Cash' },
                                            { id: 'bank', icon: <Building2 size={20}/>, label: 'Bque' },
                                            { id: 'other', icon: <Coins size={20}/>, label: 'Plus' },
                                        ].map((item) => (
                                            <button 
                                                key={item.id}
                                                type="button"
                                                onClick={() => setNewMethodIcon(item.id as any)}
                                                className={`flex flex-col items-center gap-2 p-4 rounded-2xl border-2 transition-all shadow-sm ${newMethodIcon === item.id ? 'border-indigo-600 bg-indigo-50 text-indigo-600 scale-105 shadow-indigo-100' : 'border-slate-100 text-slate-400 hover:border-indigo-200'}`}
                                            >
                                                {item.icon}
                                                <span className="text-[10px] font-black uppercase tracking-tighter">{item.label}</span>
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </div>
                            <div className="p-8 flex gap-4">
                                <button type="button" onClick={() => setIsCreateModalOpen(false)} className="flex-1 py-4 text-slate-400 font-black uppercase tracking-widest text-[10px]">Fermer</button>
                                <button type="submit" className="flex-1 py-4 bg-indigo-600 text-white font-black uppercase tracking-widest text-[10px] rounded-2xl shadow-xl hover:bg-indigo-700 transition-all flex items-center justify-center gap-2"><Check size={18}/> Créer le mode</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default SettingsPayments;
