
import React from 'react';
import { AlertTriangle, Check, X } from 'lucide-react';

interface ConfirmModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => void;
    title: string;
    message: string;
    confirmText?: string;
    cancelText?: string;
    type?: 'danger' | 'info' | 'success';
}

const ConfirmModal: React.FC<ConfirmModalProps> = ({
    isOpen,
    onClose,
    onConfirm,
    title,
    message,
    confirmText = "Confirmer",
    cancelText = "Annuler",
    type = 'danger'
}) => {
    if (!isOpen) return null;

    const colors = {
        danger: {
            bg: 'bg-red-600',
            bgHover: 'hover:bg-red-700',
            iconBg: 'bg-red-100',
            iconColor: 'text-red-600',
            lightBg: 'bg-red-50'
        },
        info: {
            bg: 'bg-indigo-600',
            bgHover: 'hover:bg-indigo-700',
            iconBg: 'bg-indigo-100',
            iconColor: 'text-indigo-600',
            lightBg: 'bg-indigo-50'
        },
        success: {
            bg: 'bg-emerald-600',
            bgHover: 'hover:bg-emerald-700',
            iconBg: 'bg-emerald-100',
            iconColor: 'text-emerald-600',
            lightBg: 'bg-emerald-50'
        }
    };

    const currentColors = colors[type];

    return (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
            <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-md overflow-hidden border border-slate-100 animate-in zoom-in-95 duration-200">
                <div className="p-8">
                    <div className="flex flex-col items-center text-center space-y-4">
                        <div className={`p-4 rounded-3xl ${currentColors.iconBg} ${currentColors.iconColor}`}>
                            <AlertTriangle size={32} />
                        </div>

                        <div className="space-y-2">
                            <h3 className="text-2xl font-black text-slate-800 uppercase tracking-tight">{title}</h3>
                            <p className="text-slate-500 font-medium leading-relaxed">
                                {message}
                            </p>
                        </div>
                    </div>
                </div>

                <div className="p-6 bg-slate-50 border-t border-slate-100 flex gap-3">
                    <button
                        onClick={onClose}
                        className="flex-1 py-4 text-slate-400 font-black uppercase text-[10px] tracking-widest hover:text-slate-800 transition-colors"
                    >
                        {cancelText}
                    </button>
                    <button
                        onClick={() => {
                            onConfirm();
                            onClose();
                        }}
                        className={`flex-1 py-4 ${currentColors.bg} ${currentColors.bgHover} text-white rounded-2xl font-black uppercase text-[10px] tracking-widest shadow-xl transition-all flex items-center justify-center gap-2`}
                    >
                        {confirmText}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ConfirmModal;
