
import React, { useState, useEffect, useCallback } from 'react';
import { Wifi, WifiOff, RefreshCw, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { syncManager } from '../services/syncManager';
import { localDb } from '../services/localDb';
import { useLiveQuery } from 'dexie-react-hooks';

const ConnectionStatus: React.FC = () => {
    const [isOnline, setIsOnline] = useState(syncManager.getStatus());
    const [isSyncing, setIsSyncing] = useState(false);
    const [lastSyncResult, setLastSyncResult] = useState<'success' | 'error' | null>(null);
    const pendingOpsCount = useLiveQuery(() => localDb.syncQueue.count()) || 0;

    useEffect(() => {
        const unsubscribe = syncManager.subscribe((online) => {
            setIsOnline(online);
        });
        return unsubscribe;
    }, []);

    const handleForceSync = useCallback(async () => {
        setIsSyncing(true);
        setLastSyncResult(null);
        try {
            const isConnected = await syncManager.forceCheck();
            if (isConnected) {
                await syncManager.sync();
                setLastSyncResult('success');
            } else {
                setLastSyncResult('error');
            }
        } catch (err) {
            console.error('Force sync error:', err);
            setLastSyncResult('error');
        } finally {
            setIsSyncing(false);
            // Reset le résultat après 3 secondes
            setTimeout(() => setLastSyncResult(null), 3000);
        }
    }, []);

    // État connecté
    if (isOnline) {
        return (
            <div className="flex items-center gap-2">
                <div className="flex items-center gap-2 px-4 py-2 bg-emerald-50 text-emerald-600 rounded-2xl border border-emerald-100 shadow-sm">
                    <div className="relative">
                        <Wifi size={16} strokeWidth={2.5}/>
                        <span className="absolute -top-1 -right-1 w-2 h-2 bg-emerald-500 rounded-full animate-ping"></span>
                    </div>
                    <div className="flex flex-col">
                        <span className="text-[10px] font-black uppercase tracking-widest leading-none">En Ligne</span>
                        {pendingOpsCount > 0 ? (
                            <span className="text-[8px] font-bold opacity-70 animate-pulse">
                                {pendingOpsCount} en attente
                            </span>
                        ) : (
                            <span className="text-[8px] font-bold opacity-70">Synchronisé</span>
                        )}
                    </div>
                </div>
                
                {/* Bouton de synchronisation manuelle */}
                <button 
                    onClick={handleForceSync}
                    disabled={isSyncing}
                    className={`p-2 rounded-xl transition-all ${
                        isSyncing 
                            ? 'bg-indigo-100 text-indigo-400 cursor-wait' 
                            : lastSyncResult === 'success'
                            ? 'bg-emerald-100 text-emerald-600'
                            : lastSyncResult === 'error'
                            ? 'bg-red-100 text-red-600'
                            : 'bg-slate-100 text-slate-400 hover:bg-indigo-100 hover:text-indigo-600'
                    }`}
                    title="Forcer la synchronisation"
                >
                    {isSyncing ? (
                        <RefreshCw size={16} className="animate-spin" />
                    ) : lastSyncResult === 'success' ? (
                        <CheckCircle2 size={16} />
                    ) : lastSyncResult === 'error' ? (
                        <AlertTriangle size={16} />
                    ) : (
                        <RefreshCw size={16} />
                    )}
                </button>
            </div>
        );
    }

    // État hors ligne
    return (
        <div className="flex items-center gap-2">
            <div className="flex items-center gap-2 px-4 py-2 bg-amber-50 text-amber-600 rounded-2xl border border-amber-100 shadow-sm">
                <WifiOff size={16} strokeWidth={2.5}/>
                <div className="flex flex-col">
                    <span className="text-[10px] font-black uppercase tracking-widest leading-none">Hors Ligne</span>
                    {pendingOpsCount > 0 && (
                        <span className="text-[8px] font-bold opacity-70">{pendingOpsCount} en attente</span>
                    )}
                </div>
            </div>
            
            {/* Bouton pour tenter une reconnexion */}
            <button 
                onClick={handleForceSync}
                disabled={isSyncing}
                className={`p-2 rounded-xl transition-all ${
                    isSyncing 
                        ? 'bg-amber-100 text-amber-400 cursor-wait' 
                        : 'bg-slate-100 text-slate-400 hover:bg-amber-100 hover:text-amber-600'
                }`}
                title="Tenter de se reconnecter"
            >
                <RefreshCw size={16} className={isSyncing ? 'animate-spin' : ''} />
            </button>
        </div>
    );
};

export default ConnectionStatus;

