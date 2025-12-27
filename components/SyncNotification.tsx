
import React, { useState, useEffect } from 'react';
import { CheckCircle2, AlertCircle, X, RefreshCw } from 'lucide-react';
import { syncManager } from '../services/syncManager';

interface SyncNotificationProps {
    onShowConflict: (data: any) => void;
}

const SyncNotification: React.FC<SyncNotificationProps> = ({ onShowConflict }) => {
    const [status, setStatus] = useState<'idle' | 'syncing' | 'success' | 'error'>('idle');
    const [message, setMessage] = useState('');

    useEffect(() => {
        // Cette composante pourrait s'abonner à des événements globaux de syncManager
        // Pour l'instant on simule l'écoute
    }, []);

    if (status === 'idle') return null;

    return (
        <div className="fixed bottom-6 right-6 z-[1001] animate-in slide-in-from-right-10 fade-in duration-300">
            <div className={`
                flex items-center gap-4 px-6 py-4 rounded-3xl shadow-2xl border backdrop-blur-md
                ${status === 'syncing' ? 'bg-indigo-50/90 border-indigo-100 text-indigo-600' : ''}
                ${status === 'success' ? 'bg-emerald-50/90 border-emerald-100 text-emerald-600' : ''}
                ${status === 'error' ? 'bg-red-50/90 border-red-100 text-red-600' : ''}
            `}>
                {status === 'syncing' && <RefreshCw size={20} className="animate-spin"/>}
                {status === 'success' && <CheckCircle2 size={20}/>}
                {status === 'error' && <AlertCircle size={20}/>}
                
                <div className="flex flex-col">
                    <span className="text-xs font-black uppercase tracking-widest leading-tight">
                        {status === 'syncing' ? 'Synchronisation...' : status === 'success' ? 'Succès' : 'Attention'}
                    </span>
                    <span className="text-[10px] font-bold opacity-80 uppercase tracking-tight">{message}</span>
                </div>

                <button onClick={() => setStatus('idle')} className="p-1 hover:bg-black/5 rounded-lg transition-colors">
                    <X size={16}/>
                </button>
            </div>
        </div>
    );
};

export default SyncNotification;

