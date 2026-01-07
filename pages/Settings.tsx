
import React, { useState, useEffect } from 'react';
import {
  Hotel, BedDouble, Users, Settings as SettingsIcon, CreditCard, Coffee, CalendarDays, Palette, Scale, RefreshCw
} from 'lucide-react';
import Header from '../components/Header';
import ModuleButton from '../components/ModuleButton';
import { ModuleThemesMap } from '../types';
import * as api from '../services/api';

const THEME_CLASSES: Record<string, string> = {
  slate: 'bg-gradient-to-br from-slate-800 to-slate-900 shadow-slate-900/50 border-white/5',
  indigo: 'bg-gradient-to-br from-indigo-600 to-indigo-700 shadow-indigo-500/20',
  emerald: 'bg-gradient-to-br from-emerald-500 to-emerald-600 shadow-emerald-500/20',
  amber: 'bg-gradient-to-br from-amber-500 to-orange-600 shadow-orange-500/30',
  rose: 'bg-gradient-to-br from-rose-500 to-rose-600 shadow-rose-500/20',
  violet: 'bg-gradient-to-br from-violet-500 to-purple-600 shadow-purple-500/30',
  sky: 'bg-gradient-to-br from-sky-500 to-blue-600 shadow-blue-500/20'
};

const Settings: React.FC = () => {
  const [themes, setThemes] = useState<ModuleThemesMap | null>(null);

  useEffect(() => {
    api.fetchModuleThemes().then(setThemes);
  }, []);

  const getModuleColor = (path: string) => {
    if (!themes) return THEME_CLASSES.slate;
    const colorKey = themes[path] || 'slate';
    return THEME_CLASSES[colorKey];
  };

  if (!themes) return null;

  return (
    <div className="min-h-screen bg-slate-900 flex flex-col font-sans">
      <Header title="Paramètres & Configuration" />

      <div className="fixed top-0 left-0 w-full h-full overflow-hidden pointer-events-none z-0">
        <div className="absolute top-[10%] right-[10%] w-[40%] h-[40%] bg-indigo-600/10 rounded-full blur-[120px]"></div>
        <div className="absolute bottom-[10%] left-[10%] w-[30%] h-[30%] bg-blue-600/10 rounded-full blur-[100px]"></div>
      </div>

      <main className="relative z-10 flex-1 flex flex-col p-8 max-w-7xl mx-auto w-full">
        <div className="mb-8 text-white border-l-4 border-indigo-500 pl-6">
          <h2 className="text-3xl font-black uppercase tracking-tight">Configuration Système</h2>
          <p className="text-slate-400 mt-1 font-medium">Pilotage technique et personnalisation de l'environnement hôtelier.</p>
        </div>

        <div className="flex-1 flex items-center justify-center pb-8">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 w-full max-w-5xl auto-rows-[180px]">
            <ModuleButton to="/settings/hotel" icon={<Hotel />} label="Hôtel & Infos" description="Coordonnées et logo." color={getModuleColor('/settings/hotel')} />
            <ModuleButton to="/settings/rooms" icon={<BedDouble />} label="Chambres & Tarifs" description="Chambres et modèles de prix." color={getModuleColor('/settings/rooms')} />
            <ModuleButton to="/settings/planning" icon={<CalendarDays />} label="Paramètre planning" description="Zoom et style calendrier." color={getModuleColor('/settings/planning')} />
            <ModuleButton to="/settings/services" icon={<Coffee />} label="Prestations" description="Tarifs repas et extras." color={getModuleColor('/settings/services')} />
            <ModuleButton to="/settings/payments" icon={<CreditCard />} label="Modes de Paiement" description="Devise et règlements." color={getModuleColor('/settings/payments')} />
            <ModuleButton to="/settings/taxes" icon={<Scale />} label="Taxes & TVA" description="Fiscalité et taxes de séjour." color={getModuleColor('/settings/taxes')} />
            <ModuleButton to="/settings/modules-colors" icon={<Palette />} label="Thématisation" description="Couleurs des panneaux menu." color={getModuleColor('/settings/modules-colors')} />
            <ModuleButton to="/settings/users" icon={<Users />} label="Utilisateurs" description="Accès sécurisés du personnel." color={getModuleColor('/settings/users')} />
            <ModuleButton to="/settings/sync" icon={<RefreshCw />} label="Synchronisation" description="État réseau & Debug." color={getModuleColor('/settings/sync')} />
          </div>
        </div>
      </main>

      <footer className="relative z-10 text-center py-6 text-slate-500 text-[10px] font-black uppercase tracking-[0.3em]">
        PMS Admin Console • Version Stable 2.5
      </footer>
    </div>
  );
};

export default Settings;
