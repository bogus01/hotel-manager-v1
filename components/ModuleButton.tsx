import React from 'react';
import { Link } from 'react-router-dom';

interface ModuleButtonProps {
  to: string;
  icon: React.ReactNode;
  label: string;
  color: string;
  description?: string;
  size?: 'normal' | 'large';
  onClick?: () => void;
}

const ModuleButton: React.FC<ModuleButtonProps> = ({ to, icon, label, color, description, size = 'normal', onClick }) => {
  const content = (
    <>
      {/* Icône de fond en relief - Animation de zoom supprimée, reste stable */}
      <div 
        className="absolute top-0 right-0 p-8 opacity-30 transform translate-x-4 -translate-y-4 pointer-events-none transition-opacity duration-500 group-hover:opacity-40" 
        style={{ filter: 'drop-shadow(4px 8px 6px rgba(0,0,0,0.4))' }}
      >
        {React.cloneElement(icon as React.ReactElement<{ size?: number | string }>, { 
          size: size === 'large' ? 140 : 100 
        })}
      </div>
      
      <div className="h-full flex flex-col justify-between p-6 z-10 relative">
        {/* Icône principale - Conserve son animation de micro-pulsion */}
        <div className={`rounded-2xl w-fit p-3 bg-white/20 backdrop-blur-md shadow-inner text-white mb-4 transform group-hover:scale-110 group-hover:-rotate-3 transition-all duration-300`}>
          {React.cloneElement(icon as React.ReactElement<{ size?: number | string }>, { size: size === 'large' ? 40 : 28 })}
        </div>
        
        <div>
          <h3 className={`font-bold text-white mb-1 ${size === 'large' ? 'text-3xl' : 'text-xl'} drop-shadow-sm`}>
            {label}
          </h3>
          {description && (
            <p className="text-white/80 text-sm font-medium leading-relaxed max-w-[90%]">
              {description}
            </p>
          )}
        </div>

        {/* Flèche d'action */}
        <div className="absolute bottom-6 right-6 opacity-0 group-hover:opacity-100 transform translate-x-4 group-hover:translate-x-0 transition-all duration-300">
          <div className="bg-white/20 p-2 rounded-full backdrop-blur-sm shadow-lg">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="text-white"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
          </div>
        </div>
      </div>
    </>
  );

  const containerClasses = `group relative overflow-hidden rounded-3xl transition-all duration-500 hover:scale-[1.01] hover:shadow-[0_20px_50px_rgba(0,0,0,0.3)] border border-white/10 backdrop-blur-sm
    ${size === 'large' ? 'col-span-2 row-span-2' : 'col-span-1 row-span-1'}
    ${color}`;

  if (onClick) {
      return (
        <button onClick={onClick} className={`text-left ${containerClasses}`}>
          {content}
        </button>
      )
  }

  return (
    <Link to={to} className={containerClasses}>
      {content}
    </Link>
  );
};

export default ModuleButton;