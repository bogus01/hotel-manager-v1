import React, { useState, useEffect } from 'react';
import Header from '../components/Header';
import { syncManager } from '../services/syncManager';
import { Wifi, WifiOff, RefreshCw, Database, Activity, Trash2, Globe, Server, CheckCircle, XCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

import ConfirmModal from '../components/ConfirmModal';

const SettingsSync: React.FC = () => {
    const navigate = useNavigate();
    const [isOnline, setIsOnline] = useState(syncManager.getStatus());
    const [pendingCount, setPendingCount] = useState(0);
    const [projectUrl, setProjectUrl] = useState('');
    const [isSyncing, setIsSyncing] = useState(false);
    const [lastError, setLastError] = useState<string | null>(null);
    const [syncHistory, setSyncHistory] = useState<string[]>([
        `Page chargée à ${new Date().toLocaleTimeString()}`
    ]);
    const [showConfirm, setShowConfirm] = useState(false);
    const [showSuccess, setShowSuccess] = useState(false);

    useEffect(() => {
        const updateStatus = async () => {
            setIsOnline(syncManager.getStatus());
            setPendingCount(await syncManager.getPendingCount());
            setLastError(syncManager.getLastError());
        };

        const unsubscribe = syncManager.subscribe((online) => {
            setIsOnline(online);
            addLog(`Statut de connexion changé : ${online ? 'En ligne' : 'Hors ligne'}`);
            updateStatus();
        });

        const interval = setInterval(updateStatus, 2000);

        setProjectUrl(syncManager.getProjectUrl());
        updateStatus();

        return () => {
            unsubscribe();
            clearInterval(interval);
        };
    }, []);

    const addLog = (msg: string) => {
        setSyncHistory(prev => [`${new Date().toLocaleTimeString()} - ${msg}`, ...prev].slice(0, 50));
    };

    const confirmResync = () => {
        setShowConfirm(true);
    };

    const performResync = async () => {
        setIsSyncing(true);
        addLog('Démarrage de la resynchronisation forcée...');
        try {
            await syncManager.forceResync();
            addLog('Succès : Base de données locale reconstruite.');
            setShowSuccess(true);
        } catch (e) {
            const err = e instanceof Error ? e.message : 'Erreur inconnue';
            addLog(`ERREUR : ${err}`);
            setLastError(err);
            // On pourrait ajouter une modale d'erreur ici si besoin
        } finally {
            setIsSyncing(false);
        }
    };

    const handleCheckConnection = async () => {
        addLog('Vérification de la connexion...');
        const result = await syncManager.forceCheck();
        addLog(`Résultat du ping : ${result ? 'OK' : 'ÉCHEC'}`);
        setIsOnline(result);
    };

    return (
        <div className="min-h-screen bg-slate-900 text-white font-sans">
            <Header title="Synchronisation & Données" backLink="/settings" />

            <main className="p-8 max-w-5xl mx-auto">

                {/* Status Cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">

                    {/* Connection Status */}
                    <div className={`p-6 rounded-2xl border ${isOnline ? 'bg-emerald-500/10 border-emerald-500/20' : 'bg-red-500/10 border-red-500/20'} flex flex-col items-center justify-center text-center`}>
                        {isOnline ? <Wifi className="w-12 h-12 text-emerald-500 mb-3" /> : <WifiOff className="w-12 h-12 text-red-500 mb-3" />}
                        <h3 className="text-lg font-bold">{isOnline ? 'Connecté' : 'Hors Ligne'}</h3>
                        <p className="text-slate-400 text-sm mt-1">{isOnline ? 'Connexion au serveur active' : 'Mode hors-ligne activé'}</p>
                        <button
                            onClick={handleCheckConnection}
                            className="mt-4 px-4 py-2 bg-slate-800 hover:bg-slate-700 rounded-lg text-sm font-medium transition-colors"
                        >
                            Vérifier connexion
                        </button>
                    </div>

                    {/* Pending Operations */}
                    <div className="p-6 rounded-2xl bg-slate-800/50 border border-slate-700 flex flex-col items-center justify-center text-center">
                        <Activity className="w-12 h-12 text-amber-500 mb-3" />
                        <h3 className="text-lg font-bold">{pendingCount} Opérations</h3>
                        <p className="text-slate-400 text-sm mt-1">Modifications en attente d'envoi</p>
                        {pendingCount > 0 && isOnline && (
                            <div className="mt-4 flex items-center text-amber-500 text-sm animate-pulse">
                                <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                                Synchronisation en cours...
                            </div>
                        )}
                    </div>

                    {/* Environment/Database */}
                    <div className="p-6 rounded-2xl bg-slate-800/50 border border-slate-700 flex flex-col items-center justify-center text-center overflow-hidden">
                        <Database className="w-12 h-12 text-indigo-500 mb-3" />
                        <h3 className="text-lg font-bold">Base de Données</h3>
                        <div className="text-slate-400 text-xs mt-1 break-all max-w-full px-2 font-mono bg-slate-900/50 py-1 rounded">
                            {projectUrl.replace('https://', '').replace('.supabase.co', '')}
                        </div>
                        <p className="text-slate-500 text-xs mt-2">ID Projet Supabase</p>
                    </div>
                </div>

                {/* Actions & Tools */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">

                    {/* Force Resync */}
                    <div className="bg-slate-800 rounded-2xl p-6 border border-slate-700">
                        <div className="flex items-center mb-4">
                            <RefreshCw className="w-6 h-6 text-blue-400 mr-3" />
                            <h2 className="text-xl font-bold">Outils de Synchronisation</h2>
                        </div>
                        <p className="text-slate-400 mb-6 text-sm">
                            Utilisez ce bouton si vous rencontrez des problèmes de données (chambres manquantes, différences entre utilisateurs).
                            Cela va recharger l'intégralité des données depuis le serveur.
                        </p>

                        <button
                            onClick={confirmResync}
                            disabled={isSyncing || !isOnline}
                            className={`w-full py-4 rounded-xl font-bold flex items-center justify-center space-x-3 transition-all
                        ${isSyncing || !isOnline
                                    ? 'bg-slate-700 text-slate-500 cursor-not-allowed'
                                    : 'bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-900/20'}`}
                        >
                            {isSyncing ? (
                                <>
                                    <RefreshCw className="w-5 h-5 animate-spin" />
                                    <span>Synchronisation en cours...</span>
                                </>
                            ) : (
                                <>
                                    <RefreshCw className="w-5 h-5" />
                                    <span>Forcer la Synchronisation Complète</span>
                                </>
                            )}
                        </button>

                        {!isOnline && (
                            <p className="mt-3 text-red-400 text-xs text-center flex items-center justify-center">
                                <WifiOff className="w-3 h-3 mr-1" />
                                Connexion requise pour cette action
                            </p>
                        )}
                    </div>

                    {/* Logs Console */}
                    <div className="bg-slate-950 rounded-2xl p-6 border border-slate-800 flex flex-col h-80">
                        <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center">
                                <Server className="w-5 h-5 text-slate-400 mr-2" />
                                <h3 className="font-bold text-slate-300">Journal d'activité</h3>
                            </div>
                            {lastError && (
                                <span className="text-red-400 text-xs bg-red-400/10 px-2 py-1 rounded border border-red-400/20">
                                    Dernière erreur: {lastError.substring(0, 20)}...
                                </span>
                            )}
                        </div>

                        <div className="flex-1 overflow-y-auto font-mono text-xs space-y-2 pr-2 custom-scrollbar">
                            {syncHistory.map((log, i) => (
                                <div key={i} className="text-slate-400 border-b border-slate-800/50 pb-1 last:border-0">
                                    <span className="text-slate-600 mr-2">{log.split(' - ')[0]}</span>
                                    <span className={log.includes('ERREUR') ? 'text-red-400' : log.includes('Succès') ? 'text-emerald-400' : 'text-slate-300'}>
                                        {log.split(' - ').slice(1).join(' - ')}
                                    </span>
                                </div>
                            ))}
                        </div>
                    </div>

                </div>

                <ConfirmModal
                    isOpen={showConfirm}
                    onClose={() => setShowConfirm(false)}
                    onConfirm={performResync}
                    title="Attention !"
                    message={`Cette action va supprimer TOUTES les données locales et les re-télécharger depuis le serveur.\n\nUtilisez ceci uniquement si vous constatez des différences de données ou des bugs d'affichage.\n\nVos données serveur (Supabase) sont en sécurité.`}
                    confirmText="Oui, Resynchroniser"
                    type="danger"
                />

                <ConfirmModal
                    isOpen={showSuccess}
                    onClose={() => {
                        setShowSuccess(false);
                        window.location.reload();
                    }}
                    onConfirm={() => window.location.reload()}
                    title="Terminé !"
                    message="La base de données locale a été reconstruite avec succès. L'application va maintenant redémarrer pour appliquer les changements."
                    confirmText="Redémarrer maintenant"
                    cancelText="Fermer"
                    type="success"
                />

            </main>
        </div>
    );
};

export default SettingsSync;
