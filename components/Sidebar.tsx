import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Home, Bell, User } from 'lucide-react';

interface HeaderProps {
  title?: string;
  actions?: React.ReactNode;
}

const Header: React.FC<HeaderProps> = ({ title, actions }) => {
  const navigate = useNavigate();

  return (
    <header className="bg-slate-900 text-white shadow-md h-16 flex items-center justify-between px-6 z-50 sticky top-0">
      <div className="flex items-center gap-4">
        <button 
          onClick={() => navigate('/')}
          className="p-2 hover:bg-slate-700 rounded-full transition-colors flex items-center gap-2 text-slate-300 hover:text-white"
          title="Retour au menu"
        >
          <div className="bg-slate-800 p-1.5 rounded-full">
            <Home size={18} />
          </div>
          <span className="font-medium text-sm hidden sm:inline">Menu Principal</span>
        </button>
        
        {title && (
          <>
            <div className="h-6 w-px bg-slate-700 mx-2 hidden sm:block"></div>
            <h1 className="text-lg font-bold tracking-wide">{title}</h1>
          </>
        )}
      </div>

      <div className="flex items-center gap-4">
        {actions}
        
        <div className="flex items-center gap-3 border-l border-slate-700 pl-4 ml-2">
          <button className="relative p-2 hover:bg-slate-800 rounded-full transition-colors">
            <Bell size={20} className="text-slate-300" />
            <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full border-2 border-slate-900"></span>
          </button>
          <div className="w-8 h-8 bg-indigo-500 rounded-full flex items-center justify-center text-sm font-bold border-2 border-slate-800">
            JD
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;