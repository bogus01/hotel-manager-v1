
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Home, Bell, ArrowLeft, Hotel } from 'lucide-react';
import ConnectionStatus from './ConnectionStatus';

interface HeaderProps {
  title?: string;
  actions?: React.ReactNode;
  backLink?: string;
  backLabel?: string;
  hideProfile?: boolean;
}

const Header: React.FC<HeaderProps> = ({ title, actions, backLink = '/', backLabel = 'Menu Principal', hideProfile = false }) => {
  const navigate = useNavigate();
  const isAtRoot = backLink === '/';

  return (
    <header className="bg-slate-900 text-white shadow-md h-16 flex items-center justify-between px-6 z-50 sticky top-0 border-b border-white/5">
      <div className="flex items-center gap-3">
        {/* BOUTON HOME SYSTÉMATIQUE (Sauf si déjà sur Home) */}
        <button 
          onClick={() => navigate('/')}
          className="p-2 hover:bg-slate-800 rounded-xl transition-all text-slate-400 hover:text-white border border-transparent hover:border-white/10"
          title="Menu Principal"
        >
          <Home size={20} />
        </button>

        {/* BOUTON RETOUR HIÉRARCHIQUE (Si on n'est pas à la racine) */}
        {!isAtRoot && (
          <>
            <div className="h-6 w-px bg-slate-700 mx-1"></div>
            <button 
              onClick={() => navigate(backLink)}
              className="group flex items-center gap-2 px-3 py-1.5 hover:bg-indigo-600/20 rounded-xl transition-all text-indigo-400 hover:text-indigo-300 border border-transparent hover:border-indigo-500/30"
              title={`Retour à ${backLabel}`}
            >
              <ArrowLeft size={18} className="group-hover:-translate-x-1 transition-transform" />
              <span className="font-black text-[10px] uppercase tracking-widest hidden sm:inline">{backLabel}</span>
            </button>
          </>
        )}
        
        <div className="flex items-center gap-2 ml-2 group cursor-pointer" onClick={() => navigate('/')}>
          <div className="bg-indigo-600 p-1 rounded transition-transform group-hover:scale-110 shadow-lg shadow-indigo-500/20">
            <Hotel size={16} className="text-white" />
          </div>
          <span className="font-black text-sm tracking-tight hidden lg:inline">HOTEL<span className="text-indigo-400">MANAGER</span></span>
        </div>

        {title && (
          <>
            <div className="h-6 w-px bg-slate-700 mx-2 hidden sm:block"></div>
            <h1 className="text-lg font-bold tracking-wide text-slate-100 truncate max-w-[200px] md:max-w-none">{title}</h1>
          </>
        )}
      </div>

      <div className="flex items-center gap-4">
        <ConnectionStatus />
        {actions}
        
        {!hideProfile && (
          <div className="flex items-center gap-3 border-l border-slate-700 pl-4 ml-2">
            <button className="relative p-2 hover:bg-slate-800 rounded-full transition-colors">
              <Bell size={20} className="text-slate-300" />
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full border-2 border-slate-900"></span>
            </button>
            <div className="w-8 h-8 bg-indigo-500 rounded-full flex items-center justify-center text-xs font-black border-2 border-slate-800 shadow-inner">
              AD
            </div>
          </div>
        )}
      </div>
    </header>
  );
};

export default Header;
