
import React, { useState, useEffect } from 'react';
import { 
    Coins, 
    TrendingUp, 
    ArrowRight,
    PieChart,
    Calculator,
    Receipt
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

const Reports: React.FC = () => {
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
      <Header title="Rapports & Gestion Financière" />
      
      <div className="fixed top-0 left-0 w-full h-full overflow-hidden pointer-events-none z-0">
        <div className="absolute top-[10%] right-[10%] w-[40%] h-[40%] bg-indigo-600/10 rounded-full blur-[120px]"></div>
        <div className="absolute bottom-[10%] left-[10%] w-[30%] h-[30%] bg-blue-600/10 rounded-full blur-[100px]"></div>
      </div>

      <main className="relative z-10 flex-1 flex flex-col p-8 max-w-7xl mx-auto w-full">
        <div className="mb-8 text-white border-l-4 border-amber-500 pl-6">
            <h2 className="text-2xl font-bold tracking-tight uppercase">Espace Pilotage & Comptabilité</h2>
            <p className="text-slate-400 mt-1 font-medium">Consultez vos ventes, gérez votre caisse et analysez vos performances.</p>
        </div>

        <div className="flex-1 flex items-center justify-center pb-8">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 w-full max-w-5xl auto-rows-[180px]">
            <ModuleButton to="/reports/daily-cash" icon={<Coins />} label="Clôture de Caisse" description="Rapport quotidien des ventes et journal des encaissements." color={getModuleColor('/reports/daily-cash')} />
            <ModuleButton to="/reports/sales-journal" icon={<Receipt />} label="Journal des Ventes" description="Détail des factures et prestations par période HT/TTC." color={getModuleColor('/reports/sales-journal')} />
            <ModuleButton to="/dashboard?from=reports" icon={<PieChart />} label="Statistiques" description="Taux d'occup., RevPAR et ADR." color={getModuleColor('/dashboard')} />
            <ModuleButton to="/billing?from=reports" icon={<TrendingUp />} label="Prévisionnel CA" description="Projection des revenus sur les mois à venir." color={getModuleColor('/billing')} />
            <ModuleButton to="/clients?from=reports" icon={<Calculator />} label="Balance Agée" description="Suivi des clients débiteurs et impayés." color={getModuleColor('/clients')} />
            <ModuleButton to="#" icon={<ArrowRight />} label="Exports Comptables" description="Extractions CSV/Excel pour votre comptable." color={getModuleColor('/reports/exports')} />
          </div>
        </div>
      </main>
    </div>
  );
};

export default Reports;
