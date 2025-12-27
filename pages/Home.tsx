
import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  CalendarDays, 
  LayoutDashboard, 
  BedDouble, 
  Users, 
  FileText, 
  LogOut, 
  Hotel,
  Settings,
  ClipboardCheck,
  Coins
} from 'lucide-react';
import { format } from 'date-fns';
import fr from 'date-fns/locale/fr';
import ModuleButton from '../components/ModuleButton';
import { ModuleThemesMap } from '../types';
import * as api from '../services/api';

const Logo = () => (
  <div className="flex items-center gap-3">
    <div className="relative flex items-center justify-center w-12 h-12">
      <div className="absolute inset-0 bg-gradient-to-br from-indigo-500 to-violet-600 rounded-xl rotate-6 opacity-20"></div>
      <div className="relative bg-gradient-to-br from-indigo-600 to-violet-700 p-2.5 rounded-xl shadow-lg shadow-indigo-500/20">
        <Hotel className="text-white" size={26} />
      </div>
    </div>
    <div>
      <h1 className="text-2xl font-black text-white tracking-tight leading-none">
        HOTEL<span className="text-indigo-400">MANAGER</span>
      </h1>
      <p className="text-slate-400 text-[10px] font-bold uppercase tracking-[0.2em] mt-1">Property Management System</p>
    </div>
  </div>
);

const THEME_CLASSES: Record<string, string> = {
    slate: 'bg-gradient-to-br from-slate-800 to-slate-900 shadow-slate-900/50 border-white/5',
    indigo: 'bg-gradient-to-br from-indigo-600 to-indigo-700 shadow-indigo-500/20',
    emerald: 'bg-gradient-to-br from-emerald-500 to-emerald-600 shadow-emerald-500/20',
    amber: 'bg-gradient-to-br from-amber-500 to-orange-600 shadow-orange-500/30',
    rose: 'bg-gradient-to-br from-rose-500 to-rose-600 shadow-rose-500/20',
    violet: 'bg-gradient-to-br from-violet-500 to-purple-600 shadow-purple-500/30',
    sky: 'bg-gradient-to-br from-sky-500 to-blue-600 shadow-blue-500/20'
};

const Home: React.FC = () => {
  const [currentTime, setCurrentTime] = useState(new Date());
  const [themes, setThemes] = useState<ModuleThemesMap | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 60000);
    api.fetchModuleThemes().then(setThemes);
    return () => clearInterval(timer);
  }, []);

  const getModuleColor = (path: string) => {
      if (!themes) return THEME_CLASSES.slate;
      const colorKey = themes[path] || 'slate';
      return THEME_CLASSES[colorKey];
  };

  if (!themes) return null;

  return (
    <div className="min-h-screen bg-slate-900 flex flex-col relative overflow-y-auto font-sans">
      <div className="fixed top-0 left-0 w-full h-full overflow-hidden pointer-events-none z-0">
        <div className="absolute -top-[20%] -left-[10%] w-[50%] h-[50%] bg-indigo-600/20 rounded-full blur-[120px]"></div>
        <div className="absolute bottom-[10%] right-[10%] w-[30%] h-[30%] bg-emerald-600/10 rounded-full blur-[100px]"></div>
      </div>

      <header className="relative z-10 px-8 py-6 flex justify-between items-center shrink-0">
        <Logo />
        <div className="flex items-center gap-8">
          <div className="text-right hidden md:block">
            <p className="text-white text-lg font-medium capitalize">
              {format(currentTime, 'EEEE d MMMM', { locale: fr })}
            </p>
            <p className="text-indigo-400 font-mono text-sm">
              {format(currentTime, 'HH:mm')}
            </p>
          </div>
          <button className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors bg-white/5 px-4 py-2 rounded-full border border-white/5 hover:bg-white/10">
            <LogOut size={18} />
            <span className="text-sm font-medium">Déconnexion</span>
          </button>
        </div>
      </header>

      <main className="relative z-10 flex-1 flex flex-col p-8 max-w-7xl mx-auto w-full">
        <div className="flex-1 flex items-center justify-center pb-8">
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-6 w-full max-w-6xl auto-rows-[180px]">
            <ModuleButton to="/planning" icon={<CalendarDays />} label="Visioplanning" description="Planning interactif, gestion des séjours et disponibilités." color={getModuleColor('/planning')} size="large" />
            <ModuleButton to="/reports" icon={<Coins />} label="Rapports de caisse" description="Clôture quotidienne, journal des ventes et stats." color={getModuleColor('/reports')} />
            <ModuleButton to="/reservations" icon={<BedDouble />} label="Registre de séjour" description="Liste des arrivées, départs et occupants." color={getModuleColor('/reservations')} />
            <ModuleButton to="/clients" icon={<Users />} label="Clients" description="Fichier client et historique." color={getModuleColor('/clients')} />
            <ModuleButton to="/daily-planning" icon={<ClipboardCheck />} label="Main Courante" description="Mouvements, état des chambres et exploitation du jour." color={getModuleColor('/daily-planning')} />
            <ModuleButton to="/dashboard" icon={<LayoutDashboard />} label="Statistiques" description="Analyse graphique." color={getModuleColor('/dashboard')} />
            <ModuleButton to="/billing" icon={<FileText />} label="Facturation" description="Factures et paiements." color={getModuleColor('/billing')} />
            <ModuleButton to="/settings" icon={<Settings />} label="Paramètres" description="Configuration du système." color={getModuleColor('/settings')} />
          </div>
        </div>
      </main>

      <footer className="relative z-10 text-center py-6 text-slate-500 text-sm shrink-0 border-t border-white/5">
        &copy; 2024 Hotel Manager PMS. Système connecté et synchronisé.
      </footer>
    </div>
  );
};

export default Home;
