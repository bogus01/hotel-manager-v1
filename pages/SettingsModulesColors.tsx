
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
    Palette, 
    Save, 
    RotateCcw, 
    CheckCircle2, 
    CalendarDays,
    Coins,
    BedDouble,
    Users,
    ClipboardCheck,
    LayoutDashboard,
    FileText,
    Settings as SettingsIcon,
    ArrowRight,
    Hotel,
    Coffee,
    CreditCard,
    ShieldCheck,
    Receipt,
    PieChart,
    TrendingUp,
    Calculator,
    Scale
} from 'lucide-react';
import Header from '../components/Header';
import { ModuleThemesMap } from '../types';
import * as api from '../services/api';

const THEME_OPTIONS = [
    { id: 'slate', name: 'Neutre (Slate)', from: 'from-slate-800', to: 'to-slate-900', shadow: 'shadow-slate-500/10' },
    { id: 'indigo', name: 'Indigo', from: 'from-indigo-600', to: 'to-indigo-700', shadow: 'shadow-indigo-500/20' },
    { id: 'emerald', name: 'Émeraude', from: 'from-emerald-500', to: 'to-emerald-600', shadow: 'shadow-emerald-500/20' },
    { id: 'amber', name: 'Ambre', from: 'from-amber-500', to: 'to-orange-600', shadow: 'shadow-orange-500/30' },
    { id: 'rose', name: 'Rose', from: 'from-rose-500', to: 'to-rose-600', shadow: 'shadow-rose-500/20' },
    { id: 'violet', name: 'Violet', from: 'from-violet-500', to: 'to-purple-600', shadow: 'shadow-purple-500/30' },
    { id: 'sky', name: 'Ciel', from: 'from-sky-500', to: 'to-blue-600', shadow: 'shadow-blue-500/20' }
];

const SECTIONS = [
    {
        title: "Écran d'Accueil (Navigation)",
        modules: [
            { path: '/planning', label: 'Visioplanning', icon: <CalendarDays /> },
            { path: '/reports', label: 'Rapports de caisse', icon: <Coins /> },
            { path: '/reservations', label: 'Registre de séjour', icon: <BedDouble /> },
            { path: '/clients', label: 'Clients', icon: <Users /> },
            { path: '/daily-planning', label: 'Main Courante', icon: <ClipboardCheck /> },
            { path: '/dashboard', label: 'Statistiques', icon: <LayoutDashboard /> },
            { path: '/billing', label: 'Facturation', icon: <FileText /> },
            { path: '/settings', label: 'Paramètres', icon: <SettingsIcon /> }
        ]
    },
    {
        title: "Espace Pilotage & Finance",
        modules: [
            { path: '/reports/daily-cash', label: 'Clôture de Caisse', icon: <Coins /> },
            { path: '/reports/sales-journal', label: 'Journal des Ventes', icon: <Receipt /> },
            { path: '/reports/exports', label: 'Exports Comptables', icon: <ArrowRight /> },
            { path: '/dashboard', label: 'Analyses Stats', icon: <PieChart /> },
            { path: '/billing', label: 'Prévisionnel CA', icon: <TrendingUp /> },
            { path: '/clients', label: 'Balance Agée', icon: <Calculator /> }
        ]
    },
    {
        title: "Configuration du Système",
        modules: [
            { path: '/settings/hotel', label: 'Hôtel & Infos', icon: <Hotel /> },
            { path: '/settings/rooms', label: 'Chambres & Tarifs', icon: <BedDouble /> },
            { path: '/settings/planning', label: 'Paramètre planning', icon: <CalendarDays /> },
            { path: '/settings/services', label: 'Prestations & Pensions', icon: <Coffee /> },
            { path: '/settings/payments', label: 'Modes de Paiement', icon: <CreditCard /> },
            { path: '/settings/taxes', label: 'Taxes & TVA', icon: <Scale /> },
            { path: '/settings/users', label: 'Utilisateurs', icon: <ShieldCheck /> },
            { path: '/settings/modules-colors', label: 'Thématisation', icon: <Palette /> }
        ]
    }
];

const SettingsModulesColors: React.FC = () => {
    const [themes, setThemes] = useState<ModuleThemesMap | null>(null);
    const [isSaving, setIsSaving] = useState(false);
    const [loading, setLoading] = useState(true);
    const navigate = useNavigate();

    useEffect(() => {
        api.fetchModuleThemes().then(t => {
            setThemes(t);
            setLoading(false);
        });
    }, []);

    const handleThemeChange = (path: string, colorId: string) => {
        if (!themes) return;
        setThemes({ ...themes, [path]: colorId });
    };

    const handleSave = async () => {
        if (!themes) return;
        setIsSaving(true);
        try {
            for (const [path, color] of Object.entries(themes) as [string, string][]) {
                await api.updateModuleTheme(path, color);
            }
            // Redirection immédiate après succès
            navigate('/settings');
        } catch (error) {
            console.error("Erreur lors de la sauvegarde du thème", error);
            setIsSaving(false);
        }
    };

    if (loading || !themes) {
        return <div className="h-screen bg-slate-900 flex items-center justify-center text-indigo-400 animate-pulse font-black uppercase tracking-widest">Initialisation de la charte...</div>;
    }

    return (
        <div className="min-h-screen bg-slate-900 flex flex-col font-sans overflow-hidden">
            <Header title="Charte Graphique du PMS" backLink="/settings" backLabel="Paramètres" />
            
            <main className="flex-1 overflow-y-auto">
                <div className="max-w-6xl mx-auto w-full p-8 space-y-16 pb-40">
                    
                    <div className="text-white border-l-4 border-indigo-500 pl-6">
                        <h2 className="text-3xl font-black uppercase tracking-tight">Thématisation Interactive</h2>
                        <p className="text-slate-400 mt-1 font-medium italic">Personnalisez chaque section du logiciel pour une expérience sur-mesure.</p>
                    </div>

                    {SECTIONS.map((section, sIdx) => (
                        <div key={sIdx} className="space-y-8 animate-in fade-in slide-in-from-bottom-2" style={{ animationDelay: `${sIdx * 100}ms` }}>
                            <div className="flex items-center gap-4">
                                <h3 className="text-xs font-black uppercase tracking-[0.3em] text-indigo-400 bg-indigo-500/10 px-4 py-2 rounded-full border border-indigo-500/20">{section.title}</h3>
                                <div className="flex-1 h-px bg-white/5"></div>
                            </div>

                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                {section.modules.map((module) => {
                                    const currentColorId = themes[module.path] || 'slate';
                                    const currentTheme = THEME_OPTIONS.find(t => t.id === currentColorId) || THEME_OPTIONS[0];

                                    return (
                                        <div key={module.path} className="bg-slate-800/30 rounded-[2.5rem] border border-white/5 p-6 flex items-center gap-6 transition-all hover:bg-slate-800/50 group">
                                            <div className={`w-28 h-20 rounded-2xl bg-gradient-to-br ${currentTheme.from} ${currentTheme.to} ${currentTheme.shadow} flex flex-col items-center justify-center shrink-0 relative overflow-hidden shadow-2xl`}>
                                                <div className="bg-white/20 p-2 rounded-lg text-white mb-1 relative z-10">
                                                    {React.cloneElement(module.icon as React.ReactElement, { size: 18 })}
                                                </div>
                                                <span className="text-[7px] text-white font-black uppercase tracking-tighter z-10 px-2 text-center leading-tight">{module.label}</span>
                                                <div className="absolute top-0 right-0 p-2 opacity-10">
                                                    {React.cloneElement(module.icon as React.ReactElement, { size: 40 })}
                                                </div>
                                            </div>

                                            <div className="flex-1">
                                                <div className="flex justify-between items-center mb-3">
                                                    <span className="text-[10px] font-black text-white uppercase tracking-widest">{module.label}</span>
                                                    <span className="text-[8px] font-bold text-slate-500 uppercase font-mono">{module.path}</span>
                                                </div>
                                                <div className="flex flex-wrap gap-2">
                                                    {THEME_OPTIONS.map((opt) => (
                                                        <button
                                                            key={opt.id}
                                                            onClick={() => handleThemeChange(module.path, opt.id)}
                                                            className={`w-8 h-8 rounded-xl border-2 transition-all relative ${currentColorId === opt.id ? 'border-white ring-4 ring-white/10 scale-110' : 'border-transparent opacity-30 hover:opacity-100 hover:scale-110'}`}
                                                            title={opt.name}
                                                        >
                                                            <div className={`absolute inset-0 bg-gradient-to-br ${opt.from} ${opt.to} rounded-lg`}></div>
                                                            {currentColorId === opt.id && <div className="absolute inset-0 flex items-center justify-center text-white"><CheckCircle2 size={12}/></div>}
                                                        </button>
                                                    ))}
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    ))}
                </div>
            </main>

            <footer className="fixed bottom-0 left-0 right-0 bg-slate-900/90 backdrop-blur-2xl border-t border-white/5 p-6 z-50 shadow-[0_-20px_50px_rgba(0,0,0,0.5)]">
                <div className="max-w-6xl mx-auto flex flex-col md:flex-row justify-between items-center gap-4">
                    <div className="flex items-center gap-3 text-slate-500">
                        <Palette size={20} className="text-indigo-500"/>
                        <span className="text-[10px] font-black uppercase tracking-widest">L'architecture graphique sera mise à jour sur tous les postes.</span>
                    </div>
                    <div className="flex gap-4 w-full md:w-auto">
                        <button 
                            onClick={() => api.fetchModuleThemes().then(setThemes)}
                            className="flex-1 md:flex-none px-6 py-4 text-slate-400 font-black uppercase text-[10px] tracking-widest hover:text-white transition-colors border border-white/5 rounded-2xl"
                        >
                            <RotateCcw size={16} className="inline mr-2"/> Annuler
                        </button>
                        <button 
                            onClick={handleSave}
                            disabled={isSaving}
                            className="flex-[2] md:flex-none bg-indigo-600 text-white px-10 py-4 rounded-2xl font-black uppercase tracking-widest text-[11px] shadow-2xl shadow-indigo-900/40 hover:bg-indigo-700 transition-all active:scale-95 flex items-center justify-center gap-3"
                        >
                            <Save size={18}/> {isSaving ? 'Traitement...' : 'Appliquer l\'environnement'}
                        </button>
                    </div>
                </div>
            </footer>
        </div>
    );
};

export default SettingsModulesColors;
