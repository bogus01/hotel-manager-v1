
import React, { useState, useEffect } from 'react';
import { Scale, Plus, Trash2, Edit, Save, Info, AlertCircle, CheckCircle2, ToggleLeft, ToggleRight, Percent, Coins, X } from 'lucide-react';
import Header from '../components/Header';
import { Tax } from '../types';
import * as api from '../services/api';

const SettingsTaxes: React.FC = () => {
    const [taxes, setTaxes] = useState<Tax[]>([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingTaxId, setEditingTaxId] = useState<string | null>(null);
    
    const [taxFormData, setTaxFormData] = useState<Omit<Tax, 'id'>>({
        name: '',
        rate: 0,
        isFixed: false,
        applyTo: 'all',
        isActive: true
    });

    useEffect(() => {
        loadTaxes();
    }, []);

    const loadTaxes = () => {
        api.fetchTaxes().then(t => {
            setTaxes(t);
            setLoading(false);
        });
    };

    const handleToggleActive = async (id: string) => {
        const updated = taxes.map(t => t.id === id ? { ...t, isActive: !t.isActive } : t);
        setTaxes(updated);
        const target = updated.find(t => t.id === id);
        if (target) await api.updateTax(target);
    };

    const handleDelete = async (e: React.MouseEvent, id: string) => {
        e.stopPropagation();
        if (window.confirm("Supprimer définitivement cette taxe ? Cette action est irréversible.")) {
            await api.deleteTax(id);
            setTaxes(prev => prev.filter(t => t.id !== id));
        }
    };

    const openEditModal = (tax: Tax) => {
        setEditingTaxId(tax.id);
        setTaxFormData({
            name: tax.name,
            rate: tax.rate,
            isFixed: tax.isFixed,
            applyTo: tax.applyTo,
            isActive: tax.isActive
        });
        setIsModalOpen(true);
    };

    const openCreateModal = () => {
        setEditingTaxId(null);
        setTaxFormData({
            name: '',
            rate: 0,
            isFixed: false,
            applyTo: 'all',
            isActive: true
        });
        setIsModalOpen(true);
    };

    const handleSaveTax = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!taxFormData.name.trim()) return;
        
        if (editingTaxId) {
            const updated = await api.updateTax({ ...taxFormData, id: editingTaxId });
            setTaxes(prev => prev.map(t => t.id === editingTaxId ? updated : t));
        } else {
            const created = await api.createTax(taxFormData);
            setTaxes(prev => [...prev, created]);
        }
        
        setIsModalOpen(false);
    };

    const labelClass = "block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1";
    const inputClass = "w-full border border-slate-200 rounded-xl px-4 py-2.5 text-[13px] font-bold text-slate-700 bg-slate-50/50 focus:bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all shadow-sm";

    if (loading) return <div className="h-screen bg-slate-50 flex items-center justify-center font-black text-slate-300 animate-pulse uppercase tracking-[0.3em]">Chargement...</div>;

    return (
        <div className="min-h-screen bg-slate-50 flex flex-col font-sans antialiased">
            <Header title="Taxes & Fiscalité" backLink="/settings" backLabel="Paramètres" />
            
            <main className="flex-1 max-w-5xl mx-auto w-full p-8 space-y-8">
                <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden animate-in fade-in slide-in-from-bottom-4">
                    <div className="p-6 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
                        <div className="flex items-center gap-3">
                            <div className="bg-rose-600 p-2 rounded-xl text-white shadow-lg shadow-rose-100"><Scale size={20}/></div>
                            <div>
                                <h2 className="text-sm font-bold text-slate-800 uppercase tracking-tight">Configuration fiscale</h2>
                                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">TVA, Taxe de séjour et prélèvements locaux</p>
                            </div>
                        </div>
                        <button 
                            onClick={openCreateModal}
                            className="bg-indigo-600 text-white px-6 py-2.5 rounded-xl font-black uppercase tracking-widest text-[10px] hover:bg-indigo-700 shadow-lg shadow-indigo-100 transition-all flex items-center gap-2"
                        >
                            <Plus size={16}/> Ajouter une taxe
                        </button>
                    </div>

                    <div className="p-8">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {taxes.map((tax) => (
                                <div 
                                    key={tax.id} 
                                    className={`group p-6 rounded-3xl border-2 transition-all flex flex-col justify-between ${tax.isActive ? 'bg-white border-slate-100 shadow-sm' : 'bg-slate-50 border-slate-50 opacity-70'}`}
                                >
                                    <div className="flex justify-between items-start mb-6">
                                        <div className="flex items-center gap-4">
                                            <div className={`p-3 rounded-2xl ${tax.isFixed ? 'bg-amber-50 text-amber-600' : 'bg-indigo-50 text-indigo-600'}`}>
                                                {tax.isFixed ? <Coins size={20}/> : <Percent size={20}/>}
                                            </div>
                                            <div>
                                                <h3 className="font-black text-slate-800 text-base uppercase tracking-tight">{tax.name}</h3>
                                                <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">
                                                    Application : {tax.applyTo === 'accommodation' ? 'Hébergement' : tax.applyTo === 'services' ? 'Services' : 'Global'}
                                                </span>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-1">
                                            <button 
                                                onClick={() => openEditModal(tax)}
                                                className="p-2 text-slate-300 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-all"
                                                title="Modifier"
                                            >
                                                <Edit size={18}/>
                                            </button>
                                            <button 
                                                onClick={() => handleToggleActive(tax.id)}
                                                className={`p-1 transition-all rounded-full ${tax.isActive ? 'text-emerald-500' : 'text-slate-300'}`}
                                            >
                                                {tax.isActive ? <ToggleRight size={40} /> : <ToggleLeft size={40} />}
                                            </button>
                                        </div>
                                    </div>

                                    <div className="flex items-end justify-between">
                                        <div className="text-3xl font-black text-slate-900 tabular-nums">
                                            {tax.rate} <span className="text-lg opacity-30">{tax.isFixed ? '€' : '%'}</span>
                                        </div>
                                        <button 
                                            onClick={(e) => handleDelete(e, tax.id)}
                                            className="p-2 text-slate-200 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all opacity-0 group-hover:opacity-100"
                                            title="Supprimer"
                                        >
                                            <Trash2 size={18}/>
                                        </button>
                                    </div>
                                </div>
                            ))}
                            {taxes.length === 0 && (
                                <div className="col-span-full py-16 text-center border-2 border-dashed border-slate-100 rounded-[2.5rem]">
                                    <Scale size={48} className="mx-auto text-slate-200 mb-4" />
                                    <p className="text-slate-400 font-bold uppercase tracking-widest text-[10px]">Aucune taxe configurée</p>
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="px-8 py-6 bg-slate-50 border-t border-slate-100 flex items-start gap-4">
                        <div className="p-2 bg-indigo-100 text-indigo-600 rounded-lg shrink-0"><Info size={18} /></div>
                        <div className="text-xs text-slate-500 font-bold uppercase tracking-tight leading-relaxed py-0.5">
                            La TVA est calculée "en-dedans" (TTC vers HT). Les taxes fixes (ex: Taxe de séjour) sont additionnées au montant total de la prestation par nuit ou par pax selon votre paramétrage.
                        </div>
                    </div>
                </div>
            </main>

            {/* MODAL UNIQUE POUR CRÉATION ET ÉDITION */}
            {isModalOpen && (
                <div className="fixed inset-0 z-[500] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
                    <form onSubmit={handleSaveTax} className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-lg overflow-hidden animate-in zoom-in duration-300 border border-white/20">
                        <div className="bg-slate-900 text-white p-6 flex justify-between items-center">
                            <div className="flex items-center gap-4">
                                <div className="bg-rose-600 p-2 rounded-xl">
                                    {editingTaxId ? <Edit size={22}/> : <Plus size={22}/>}
                                </div>
                                <h3 className="font-black uppercase tracking-tight">
                                    {editingTaxId ? 'Modifier la Taxe' : 'Nouvelle Taxe'}
                                </h3>
                            </div>
                            <button type="button" onClick={() => setIsModalOpen(false)} className="hover:bg-white/10 p-2 rounded-full transition-colors"><X size={24}/></button>
                        </div>
                        
                        <div className="p-10 space-y-8">
                            <div>
                                <label className={labelClass}>Libellé de la taxe / TVA</label>
                                <input 
                                    autoFocus required className={inputClass} 
                                    placeholder="Ex: TVA Standard, Taxe Municipale..."
                                    value={taxFormData.name}
                                    onChange={e => setTaxFormData({...taxFormData, name: e.target.value})}
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-8">
                                <div>
                                    <label className={labelClass}>Type de prélèvement</label>
                                    <div className="flex p-1 bg-slate-100 rounded-xl border border-slate-100">
                                        <button 
                                            type="button"
                                            onClick={() => setTaxFormData({...taxFormData, isFixed: false})}
                                            className={`flex-1 py-2 text-[10px] font-black uppercase rounded-lg transition-all ${!taxFormData.isFixed ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-400'}`}
                                        >
                                            Pourcentage
                                        </button>
                                        <button 
                                            type="button"
                                            onClick={() => setTaxFormData({...taxFormData, isFixed: true})}
                                            className={`flex-1 py-2 text-[10px] font-black uppercase rounded-lg transition-all ${taxFormData.isFixed ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-400'}`}
                                        >
                                            Montant Fixe
                                        </button>
                                    </div>
                                </div>
                                <div>
                                    <label className={labelClass}>Valeur ({taxFormData.isFixed ? '€' : '%'})</label>
                                    <input 
                                        required type="number" step="0.01" className={inputClass} 
                                        placeholder="0.00"
                                        value={taxFormData.rate || ''}
                                        onChange={e => setTaxFormData({...taxFormData, rate: parseFloat(e.target.value) || 0})}
                                    />
                                </div>
                            </div>

                            <div>
                                <label className={labelClass}>Appliquer sur</label>
                                <select 
                                    className={inputClass}
                                    value={taxFormData.applyTo}
                                    onChange={e => setTaxFormData({...taxFormData, applyTo: e.target.value as any})}
                                >
                                    <option value="all">Global (Tout)</option>
                                    <option value="accommodation">Hébergement uniquement</option>
                                    <option value="services">Services uniquement</option>
                                </select>
                            </div>
                        </div>

                        <div className="p-8 bg-slate-50 border-t border-slate-100 flex gap-4">
                            <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 py-3 text-slate-400 font-black uppercase text-[10px] tracking-widest">Annuler</button>
                            <button type="submit" className="flex-[2] bg-indigo-600 text-white py-4 rounded-2xl font-black uppercase tracking-widest text-[10px] shadow-xl shadow-indigo-100 hover:bg-indigo-700 transition-all flex items-center justify-center gap-2">
                                <Save size={18}/> {editingTaxId ? 'Mettre à jour' : 'Enregistrer la taxe'}
                            </button>
                        </div>
                    </form>
                </div>
            )}
        </div>
    );
};

export default SettingsTaxes;
