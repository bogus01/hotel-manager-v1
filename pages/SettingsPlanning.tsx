import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
    CalendarDays, Save, Palette, Droplet, ChevronDown, ChevronUp, 
    ZoomIn, Clock, Info, CheckCircle2, RotateCcw, MousePointer2,
    Layout
} from 'lucide-react';
import Header from '../components/Header';
import { PlanningSettings, StatusColors } from '../types';
import * as api from '../services/api';

const PRESET_SELECTION_COLORS = [
    { name: 'Indigo', value: '#6366f1' },
    { name: 'Emerald', value: '#10b981' },
    { name: 'Amber', value: '#f59e0b' },
    { name: 'Rose', value: '#f43f5e' },
    { name: 'Cyan', value: '#06b6d4' },
    { name: 'Violet', value: '#8b5cf6' },
    { name: 'Slate', value: '#64748b' },
];

const COLOR_SPECTRES = [
    { name: 'Océan (Bleus)', colors: ['#2563eb', '#3b82f6', '#60a5fa', '#93c5fd', '#1e40af'] },
    { name: 'Forêt (Verts)', colors: ['#059669', '#10b981', '#34d399', '#6ee7b7', '#064e3b'] },
    { name: 'Royal (Violets)', colors: ['#7c3aed', '#8b5cf6', '#a78bfa', '#c4b5fd', '#4c1d95'] },
    { name: 'Incandescence (Rouges)', colors: ['#e11d48', '#f43f5e', '#fb7185', '#fda4af', '#9f1239'] },
    { name: 'Ambre (Oranges)', colors: ['#d97706', '#f59e0b', '#fbbf24', '#fcd34d', '#78350f'] },
    { name: 'Ardoise (Gris)', colors: ['#475569', '#64748b', '#94a3b8', '#cbd5e1', '#1e293b'] }
];

const SettingsPlanning: React.FC = () => {
    const [settings, setSettings] = useState<PlanningSettings | null>(null);
    const [expandedStatusColor, setExpandedStatusColor] = useState<keyof StatusColors | null>(null);
    const [loading, setLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const navigate = useNavigate();

    useEffect(() => {
        api.fetchPlanningSettings().then(s => {
            setSettings(s);
            setLoading(false);
        });
    }, []);

    const handleSave = async () => {
        if (!settings) return;
        setIsSaving(true);
        try {
            await api.updatePlanningSettings(settings);
            // Redirection immédiate vers les paramètres après succès
            navigate('/settings');
        } catch (error) {
            console.error("Erreur lors de la sauvegarde", error);
            setIsSaving(false);
        }
    };

    if (loading || !settings) {
        return <div className="h-screen bg-slate-50 flex items-center justify-center font-black text-slate-300 animate-pulse uppercase tracking-[0.3em]">Chargement...</div>;
    }

    const labelClass = "block text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-4 flex items-center gap-2 ml-1";
    const sectionTitleClass = "text-sm font-black text-slate-700 uppercase tracking-tight flex items-center gap-3 mb-6";

    // Fix: Added missing updateStatusColor helper to manage status color updates and clear errors on lines 260 and 273
    const updateStatusColor = (key: keyof StatusColors, color: string) => {
        if (!settings) return;
        setSettings({
            ...settings,
            statusColors: {
                ...(settings.statusColors || {
                    confirmed: '#6366f1',
                    checkedIn: '#10b981',
                    checkedOut: '#64748b',
                    option: '#f59e0b',
                    cancelled: '#ef4444'
                }),
                [key]: color
            }
        });
    };

    return (
        <div className="min-h-screen bg-slate-50 flex flex-col font-sans overflow-hidden">
            <Header title="Paramètre planning" backLink="/settings" backLabel="Paramètres" />
            
            <main className="flex-1 overflow-y-auto">
                <div className="max-w-5xl mx-auto w-full p-8 space-y-10 pb-48">
                    
                    <div className="bg-white rounded-[2.5rem] shadow-sm border border-slate-100 overflow-hidden animate-in fade-in slide-in-from-bottom-4">
                        <div className="p-8 border-b border-slate-100 bg-slate-50/50">
                            <h2 className="text-xl font-black text-slate-800 flex items-center gap-3">
                                <div className="bg-indigo-600 p-1.5 rounded-xl text-white shadow-sm"><Palette size={20}/></div>
                                Identité visuelle du Calendrier
                            </h2>
                            <p className="text-sm text-slate-500 font-medium mt-1">Personnalisez l'affichage des séjours et l'ergonomie de la timeline.</p>
                        </div>

                        <div className="p-10 space-y-12">
                            
                            {/* SECTION: STYLE DES BANDES */}
                            <section>
                                <h3 className={sectionTitleClass}><Layout size={18} className="text-indigo-600"/> Style des bandes de séjour</h3>
                                <div className="grid grid-cols-2 gap-6">
                                    <button 
                                        onClick={() => setSettings({...settings, barStyle: 'translucent'})}
                                        className={`group relative flex flex-col items-center gap-4 p-8 rounded-[2rem] border-2 transition-all ${settings.barStyle === 'translucent' ? 'bg-indigo-50 border-indigo-600 shadow-lg' : 'bg-white border-slate-100 hover:border-indigo-200'}`}
                                    >
                                        <div className="w-full h-12 rounded-xl overflow-hidden border border-slate-200 flex relative">
                                            <div className="w-2 h-full bg-indigo-600"></div>
                                            <div className="flex-1 bg-indigo-100 opacity-30"></div>
                                            <div className="absolute inset-0 flex items-center px-4">
                                                <div className="w-20 h-2 bg-indigo-600/20 rounded-full"></div>
                                            </div>
                                        </div>
                                        <span className={`text-[11px] font-black uppercase tracking-widest ${settings.barStyle === 'translucent' ? 'text-indigo-700' : 'text-slate-400'}`}>1. Translucide (Défaut)</span>
                                        {settings.barStyle === 'translucent' && <div className="absolute top-4 right-4 bg-indigo-600 text-white p-1 rounded-full"><CheckCircle2 size={16}/></div>}
                                    </button>

                                    <button 
                                        onClick={() => setSettings({...settings, barStyle: 'solid'})}
                                        className={`group relative flex flex-col items-center gap-4 p-8 rounded-[2rem] border-2 transition-all ${settings.barStyle === 'solid' ? 'bg-indigo-50 border-indigo-600 shadow-lg' : 'bg-white border-slate-100 hover:border-indigo-200'}`}
                                    >
                                        <div className="w-full h-12 rounded-xl overflow-hidden border border-slate-200 flex relative">
                                            <div className="w-2 h-full bg-indigo-800"></div>
                                            <div className="flex-1 bg-indigo-600"></div>
                                            <div className="absolute inset-0 flex items-center px-4">
                                                <div className="w-20 h-2 bg-white/30 rounded-full"></div>
                                            </div>
                                        </div>
                                        <span className={`text-[11px] font-black uppercase tracking-widest ${settings.barStyle === 'solid' ? 'text-indigo-700' : 'text-slate-400'}`}>2. Couleur Pleine</span>
                                        {settings.barStyle === 'solid' && <div className="absolute top-4 right-4 bg-indigo-600 text-white p-1 rounded-full"><CheckCircle2 size={16}/></div>}
                                    </button>
                                </div>
                            </section>

                            {/* SECTION: MODES DE VUE */}
                            <section>
                                <h3 className={sectionTitleClass}><CalendarDays size={18} className="text-indigo-600"/> Ouverture par défaut</h3>
                                <div className="grid grid-cols-3 gap-2 p-1.5 bg-slate-100 rounded-2xl border border-slate-100 shadow-inner">
                                    {[
                                        { id: 'month', label: 'Vue Mensuelle' },
                                        { id: 'fortnight', label: 'Quinzaine' },
                                        { id: 'week', label: 'Semaine' }
                                    ].map(view => (
                                        <button 
                                            key={view.id}
                                            onClick={() => setSettings({...settings, defaultView: view.id as any})}
                                            className={`py-3 text-[10px] font-black uppercase rounded-xl transition-all ${settings.defaultView === view.id ? 'bg-white text-indigo-600 shadow-md border border-slate-100' : 'text-slate-500 hover:bg-white/50'}`}
                                        >
                                            {view.label}
                                        </button>
                                    ))}
                                </div>
                            </section>

                            {/* SECTION: ZOOM ET NAVIGATION */}
                            <section className="grid grid-cols-1 md:grid-cols-2 gap-10">
                                <div>
                                    <div className="flex justify-between items-center mb-4">
                                        <label className={labelClass}><ZoomIn size={14}/> Échelle de Zoom (Standard)</label>
                                        <span className="text-xs font-black text-indigo-600 bg-indigo-50 px-2 py-1 rounded-lg">{settings.defaultZoom}%</span>
                                    </div>
                                    <input 
                                        type="range" min="50" max="200" step="10" 
                                        className="w-full accent-indigo-600 cursor-pointer h-2 bg-slate-100 rounded-lg appearance-none" 
                                        value={settings.defaultZoom} 
                                        onChange={(e) => setSettings({...settings, defaultZoom: parseInt(e.target.value)})} 
                                    />
                                </div>
                                <div>
                                    <div className="flex justify-between items-center mb-4">
                                        <label className={labelClass}><Clock size={14}/> Historique affiché (Jours)</label>
                                        <span className="text-xs font-black text-indigo-600 bg-indigo-50 px-2 py-1 rounded-lg">-{settings.historyOffset} j.</span>
                                    </div>
                                    <input 
                                        type="range" min="0" max="30" step="1" 
                                        className="w-full accent-indigo-600 cursor-pointer h-2 bg-slate-100 rounded-lg appearance-none" 
                                        value={settings.historyOffset} 
                                        onChange={(e) => setSettings({...settings, historyOffset: parseInt(e.target.value)})} 
                                    />
                                </div>
                            </section>

                            {/* SECTION: COULEUR SELECTION AVEC APERÇU */}
                            <section className="border-t border-slate-100 pt-10">
                                <label className={labelClass}><MousePointer2 size={14}/> Couleur du voile de sélection</label>
                                <div className="grid grid-cols-1 md:grid-cols-12 gap-10 items-center">
                                    <div className="md:col-span-7">
                                        <div className="flex flex-wrap gap-3">
                                            {PRESET_SELECTION_COLORS.map(c => (
                                                <button 
                                                    key={c.value} 
                                                    onClick={() => setSettings({...settings, selectionColor: c.value})} 
                                                    className={`w-10 h-10 rounded-2xl border-2 transition-all ${settings.selectionColor === c.value ? 'border-slate-900 ring-4 ring-slate-100 scale-110 shadow-lg' : 'border-transparent opacity-60 hover:opacity-100'}`} 
                                                    style={{ backgroundColor: c.value }} 
                                                    title={c.name}
                                                />
                                            ))}
                                            <div className="w-px h-10 bg-slate-200 mx-2"></div>
                                            <input 
                                                type="color" 
                                                value={settings.selectionColor} 
                                                onChange={e => setSettings({...settings, selectionColor: e.target.value})} 
                                                className="w-10 h-10 rounded-2xl border-2 border-white shadow-md cursor-pointer"
                                            />
                                        </div>
                                        <p className="text-[10px] text-slate-400 mt-4 font-bold uppercase italic">Cette couleur s'affiche lorsque vous étirez la souris sur le planning pour créer une réservation.</p>
                                    </div>

                                    {/* WIDGET APERÇU DYNAMIQUE */}
                                    <div className="md:col-span-5">
                                        <div className="bg-slate-50/50 rounded-3xl p-8 border-2 border-dashed border-slate-100 flex flex-col items-center">
                                            <span className="text-[9px] font-black text-slate-300 uppercase tracking-[0.2em] mb-4">Aperçu du rendu</span>
                                            
                                            {/* LA BANDELETTE DE TEST */}
                                            <div 
                                                className="w-full h-20 rounded-2xl border-4 border-dashed flex flex-col items-center justify-center transition-all duration-300 shadow-2xl"
                                                style={{ 
                                                    backgroundColor: `${settings.selectionColor}66`, 
                                                    borderColor: settings.selectionColor
                                                }}
                                            >
                                                <div className="text-slate-900 font-black uppercase text-base leading-none tracking-tighter">
                                                    6 NUITS
                                                </div>
                                                <div className="text-slate-900/60 font-bold tabular-nums text-[10px] mt-1 uppercase tracking-widest">
                                                    30/12 - 05/01
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </section>

                            {/* SECTION: NUANCIERS PMS */}
                            <section className="border-t border-slate-100 pt-10">
                                <label className={labelClass}><Droplet size={14}/> Nuanciers standards par statut</label>
                                <div className="space-y-3 mt-6">
                                    {(['confirmed', 'checkedIn', 'checkedOut', 'option', 'cancelled'] as const).map(statusKey => {
                                        const isExpanded = expandedStatusColor === statusKey;
                                        return (
                                            <div key={statusKey} className={`rounded-[2rem] border transition-all duration-300 ${isExpanded ? 'bg-slate-50 border-indigo-200 shadow-inner p-8' : 'bg-white border-slate-100 p-5 hover:border-indigo-300 cursor-pointer'}`} onClick={() => !isExpanded && setExpandedStatusColor(statusKey)}>
                                                <div className="flex items-center justify-between">
                                                    <div className="flex items-center gap-5">
<div 
    className="w-12 h-12 rounded-2xl shadow-lg border-2 border-white flex items-center justify-center transition-transform hover:scale-110 overflow-hidden" 
    style={{ backgroundColor: settings.statusColors?.[statusKey] || (statusKey === 'confirmed' ? '#6366f1' : statusKey === 'checkedIn' ? '#10b981' : statusKey === 'checkedOut' ? '#64748b' : statusKey === 'option' ? '#f59e0b' : '#ef4444') }}
>
                                                            {isExpanded && <CheckCircle2 size={16} className="text-white drop-shadow-md"/>}
                                                        </div>
                                                        <div>
                                                            <span className="text-[11px] font-black text-slate-800 uppercase tracking-widest">
                                                                {statusKey === 'confirmed' ? 'Réservé / Confirmé' : 
                                                                statusKey === 'checkedIn' ? 'Arrivé / En séjour' :
                                                                statusKey === 'checkedOut' ? 'Parti / Historique' :
                                                                statusKey === 'option' ? 'Option / Devis' : 'Annulé'}
                                                            </span>
                                                            <p className="text-[9px] text-slate-400 font-bold uppercase mt-0.5 tracking-tighter">Couleur de référence système</p>
                                                        </div>
                                                    </div>
                                                    <button onClick={(e) => { e.stopPropagation(); setExpandedStatusColor(isExpanded ? null : statusKey); }} className="text-slate-300 hover:text-indigo-600 transition-colors">
                                                        {isExpanded ? <ChevronUp size={24}/> : <ChevronDown size={24}/>}
                                                    </button>
                                                </div>
                                                
                                                {isExpanded && (
                                                    <div className="mt-8 space-y-8 animate-in fade-in slide-in-from-top-2 duration-300">
                                                        {COLOR_SPECTRES.map((spectre, sIdx) => (
                                                            <div key={sIdx} className="space-y-3">
                                                                <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">{spectre.name}</span>
                                                                <div className="flex flex-wrap gap-3">
                                                                    {spectre.colors.map(color => (
                                                                        <button
                                                                            key={color}
                                                                            onClick={(e) => { e.stopPropagation(); updateStatusColor(statusKey, color); }}
                                                                            className={`w-10 h-10 rounded-2xl border-2 transition-all hover:scale-125 ${settings.statusColors?.[statusKey] === color ? 'border-slate-900 ring-4 ring-white scale-110 shadow-xl z-10' : 'border-transparent shadow-sm'}`}
                                                                            style={{ backgroundColor: color }}
                                                                        />
                                                                    ))}
                                                                </div>
                                                            </div>
                                                        ))}
                                                        <div className="pt-6 border-t border-slate-100 flex items-center justify-between">
                                                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Couleur personnalisée (Pipette)</label>
                                                            <input 
                                                                type="color" 
                                                                value={settings.statusColors?.[statusKey] || '#6366f1'} 
                                                                onChange={e => updateStatusColor(statusKey, e.target.value)} 
                                                                className="h-12 w-32 rounded-xl border-2 border-white shadow-md cursor-pointer" 
                                                                onClick={(e) => e.stopPropagation()}
                                                            />
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            </section>

                            {/* SECTION: OPTIONS D'AFFICHAGE */}
                            <section className="border-t border-slate-100 pt-10">
                                <label className="flex items-center justify-between cursor-pointer p-6 bg-slate-50 rounded-[2rem] border border-slate-100 hover:bg-slate-100 transition-colors shadow-inner">
                                    <div className="flex items-center gap-4">
                                        <div className={`p-3 rounded-2xl transition-colors ${settings.showRoomStatus ? 'bg-emerald-100 text-emerald-600' : 'bg-slate-200 text-slate-400'}`}>
                                            <CheckCircle2 size={24} />
                                        </div>
                                        <div>
                                            <span className="text-sm font-black text-slate-800 uppercase tracking-tight">Statut de propreté</span>
                                            <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-1">Afficher la pastille d'état dans la colonne des chambres</p>
                                        </div>
                                    </div>
                                    <button 
                                        onClick={(e) => { e.preventDefault(); setSettings({...settings, showRoomStatus: !settings.showRoomStatus}); }} 
                                        className={`w-14 h-8 rounded-full transition-all relative ${settings.showRoomStatus ? 'bg-indigo-600 shadow-indigo-200' : 'bg-slate-300 shadow-inner'}`}
                                    >
                                        <div className={`absolute top-1.5 w-5 h-5 bg-white rounded-full shadow-lg transition-all ${settings.showRoomStatus ? 'left-7' : 'left-2'}`} />
                                    </button>
                                </label>
                            </section>

                        </div>
                    </div>
                </div>
            </main>

            <footer className="fixed bottom-0 left-0 right-0 bg-slate-900/90 backdrop-blur-2xl border-t border-white/5 p-6 z-50 shadow-[0_-20px_50px_rgba(0,0,0,0.5)]">
                <div className="max-w-5xl mx-auto flex flex-col md:flex-row justify-between items-center gap-8">
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-white/5 text-indigo-400 rounded-2xl shrink-0"><Info size={20} /></div>
                        <p className="text-[9px] text-slate-400 font-black uppercase tracking-widest max-w-sm leading-relaxed">
                            Veuillez rafraîchir manuellement le planning après application pour synchroniser totalement les modifications.
                        </p>
                    </div>
                    <div className="flex gap-4 w-full md:w-auto shrink-0">
                        <button 
                            onClick={() => api.fetchPlanningSettings().then(setSettings)} 
                            className="flex-1 md:flex-none px-6 py-4 text-slate-400 hover:text-white rounded-2xl font-black uppercase text-[10px] tracking-widest transition-all border border-white/5 whitespace-nowrap"
                        >
                            <RotateCcw size={16} className="inline mr-2"/> Réinitialiser
                        </button>
                        <button 
                            onClick={handleSave}
                            disabled={isSaving}
                            className="flex-[2] md:flex-none bg-indigo-600 text-white px-10 py-4 rounded-2xl font-black uppercase tracking-widest text-[11px] shadow-2xl shadow-indigo-900/40 hover:bg-indigo-700 transition-all active:scale-95 flex items-center justify-center gap-3 disabled:opacity-50 whitespace-nowrap"
                        >
                            <Save size={20}/> {isSaving ? 'Traitement...' : 'Appliquer les réglages'}
                        </button>
                    </div>
                </div>
            </footer>
        </div>
    );
};

export default SettingsPlanning;