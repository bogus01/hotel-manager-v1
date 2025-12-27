
import React from 'react';
import { AlertTriangle, ArrowRight, Check, X, BedDouble, Calendar } from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

interface ConflictModalProps {
    conflictData: any;
    onResolve: (action: 'move' | 'cancel' | 'update', data?: any) => void;
    onClose: () => void;
}

const ConflictModal: React.FC<ConflictModalProps> = ({ conflictData, onResolve, onClose }) => {
    if (!conflictData) return null;

    const { pending, existing, alternatives } = conflictData;

    return (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
            <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-2xl overflow-hidden border border-slate-100">
                <div className="bg-amber-500 text-white p-6 flex items-center gap-4">
                    <div className="bg-white/20 p-3 rounded-2xl">
                        <AlertTriangle size={24}/>
                    </div>
                    <div>
                        <h3 className="font-black uppercase tracking-tight text-lg">Conflit de Réservation</h3>
                        <p className="text-[10px] font-bold text-amber-100 uppercase tracking-widest">Action requise après synchronisation</p>
                    </div>
                </div>

                <div className="p-8">
                    <div className="grid grid-cols-2 gap-8 mb-8">
                        <div className="bg-slate-50 p-6 rounded-3xl border border-slate-200">
                            <p className="text-[10px] font-black text-slate-400 uppercase mb-4">Votre réservation (Hors ligne)</p>
                            <div className="space-y-3">
                                <p className="font-black text-slate-900 uppercase">{pending.clientName}</p>
                                <div className="flex items-center gap-2 text-xs text-slate-500">
                                    <BedDouble size={14}/> Chambre {pending.roomId}
                                </div>
                                <div className="flex items-center gap-2 text-xs text-slate-500">
                                    <Calendar size={14}/> {format(new Date(pending.checkIn), 'dd MMM', { locale: fr })} - {format(new Date(pending.checkOut), 'dd MMM', { locale: fr })}
                                </div>
                            </div>
                        </div>

                        <div className="bg-red-50 p-6 rounded-3xl border border-red-100">
                            <p className="text-[10px] font-black text-red-400 uppercase mb-4">Réservation existante</p>
                            <div className="space-y-3">
                                <p className="font-black text-red-900 uppercase">{existing?.client_name || 'Inconnu'}</p>
                                <div className="flex items-center gap-2 text-xs text-red-500">
                                    <BedDouble size={14}/> Chambre {existing?.room_id}
                                </div>
                                <div className="flex items-center gap-2 text-xs text-red-500">
                                    <Calendar size={14}/> {existing ? `${format(new Date(existing.check_in), 'dd MMM')} - ${format(new Date(existing.check_out), 'dd MMM')}` : 'Dates inconnues'}
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="space-y-4">
                        <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">Solutions suggérées :</p>
                        <div className="grid grid-cols-1 gap-3">
                            {alternatives.slice(0, 3).map((room: any) => (
                                <button 
                                    key={room.id}
                                    onClick={() => onResolve('move', room.id)}
                                    className="flex items-center justify-between p-4 bg-white border border-slate-200 rounded-2xl hover:border-indigo-500 hover:bg-indigo-50 transition-all group"
                                >
                                    <div className="flex items-center gap-4">
                                        <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center text-slate-400 group-hover:bg-indigo-100 group-hover:text-indigo-600">
                                            <BedDouble size={20}/>
                                        </div>
                                        <div className="text-left">
                                            <p className="text-sm font-black text-slate-700 group-hover:text-indigo-900 uppercase">Déplacer en Chambre {room.number}</p>
                                            <p className="text-[10px] text-slate-400 uppercase font-bold">{room.type} • {room.floor}e étage</p>
                                        </div>
                                    </div>
                                    <ArrowRight size={18} className="text-slate-300 group-hover:text-indigo-500 group-hover:translate-x-1 transition-all"/>
                                </button>
                            ))}
                        </div>
                    </div>
                </div>

                <div className="p-6 bg-slate-50 border-t flex gap-4">
                    <button
                        onClick={onClose}
                        className="flex-1 py-4 text-slate-400 font-black uppercase text-[10px] tracking-widest hover:text-slate-800 transition-colors"
                    >
                        Ignorer pour l'instant
                    </button>
                    <button
                        onClick={() => onResolve('cancel')}
                        className="flex-1 py-4 bg-red-600 text-white rounded-2xl font-black uppercase text-[10px] tracking-widest shadow-xl transition-all flex items-center justify-center gap-2 hover:bg-red-700"
                    >
                        <X size={18}/> Annuler MARTIN
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ConflictModal;

