
import React, { useState, useEffect } from 'react';
import { Wifi, WifiOff, RefreshCw } from 'lucide-react';
import { syncManager } from '../services/syncManager';
import { localDb } from '../services/localDb';
import { useLiveQuery } from 'dexie-react-hooks';

const ConnectionStatus: React.FC = () => {
    const [isOnline, setIsOnline] = useState(syncManager.getStatus());
    const pendingOpsCount = useLiveQuery(() => localDb.syncQueue.count()) || 0;

    useEffect(() => {
        const unsubscribe = syncManager.subscribe((online) => {
            setIsOnline(online);
        });
        return unsubscribe;
    }, []);

    if (isOnline) {
        return (
            <div className="flex items-center gap-2 px-4 py-2 bg-emerald-50 text-emerald-600 rounded-2xl border border-emerald-100 shadow-sm animate-in fade-in slide-in-from-top-2">
                <div className="relative">
                    <Wifi size={16} strokeWidth={2.5}/>
                    <span className="absolute -top-1 -right-1 w-2 h-2 bg-emerald-500 rounded-full animate-ping"></span>
                </div>
                <div className="flex flex-col">
                    <span className="text-[10px] font-black uppercase tracking-widest leading-none">Connecté</span>
                    {pendingOpsCount > 0 && (
                        <span className="text-[8px] font-bold opacity-70 animate-pulse">Synchronisation... ({pendingOpsCount})</span>
                    )}
                </div>
            </div>
        );
    }

    return (
        <div className="flex items-center gap-2 px-4 py-2 bg-amber-50 text-amber-600 rounded-2xl border border-amber-100 shadow-sm animate-pulse">
            <WifiOff size={16} strokeWidth={2.5}/>
            <div className="flex flex-col">
                <span className="text-[10px] font-black uppercase tracking-widest leading-none">Hors Ligne</span>
                {pendingOpsCount > 0 && (
                    <span className="text-[8px] font-bold opacity-70">{pendingOpsCount} opérations en attente</span>
                )}
            </div>
        </div>
    );
};

export default ConnectionStatus;

