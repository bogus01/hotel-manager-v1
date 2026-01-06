
import React, { useState, useEffect } from 'react';
import { Hotel, Save, Info, MapPin, Mail, Phone, Hash, Clock, X, FileText } from 'lucide-react';
import Header from '../components/Header';
import { HotelSettings } from '../types';
import * as api from '../services/api';

const SettingsHotel: React.FC = () => {
    const [hotelInfo, setHotelInfo] = useState<HotelSettings>({
        name: '',
        address: '',
        email: '',
        phone: '',
        siret: '',
        checkInTime: '15:00',
        checkOutTime: '11:00'
    });
    const [loading, setLoading] = useState(true);
    const [showSuccess, setShowSuccess] = useState(false);
    const [showError, setShowError] = useState(false);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        loadHotelSettings();
    }, []);

    const loadHotelSettings = async () => {
        try {
            const settings = await api.fetchHotelSettings();
            setHotelInfo(settings);
        } catch (error) {
            console.error('Error loading hotel settings:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async () => {
        try {
            setSaving(true);
            await api.updateHotelSettings(hotelInfo);
            setShowSuccess(true);
            setTimeout(() => setShowSuccess(false), 3000);
        } catch (error) {
            console.error('Error saving hotel settings:', error);
            setShowError(true);
            setTimeout(() => setShowError(false), 3000);
        } finally {
            setSaving(false);
        }
    };

    const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                setHotelInfo({ ...hotelInfo, logo: reader.result as string });
            };
            reader.readAsDataURL(file);
        }
    };

    const labelClass = "block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1";
    const inputClass = "w-full border border-slate-200 rounded-xl px-4 py-2.5 text-[13px] font-bold text-slate-700 bg-slate-50/50 focus:bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all shadow-sm";

    if (loading) {
        return (
            <div className="min-h-screen bg-slate-50 flex items-center justify-center">
                <div className="text-slate-400 font-bold uppercase tracking-widest text-sm animate-pulse">
                    Chargement...
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
            <Header title="Paramètres Établissement" backLink="/settings" backLabel="Paramètres" />

            {showSuccess && (
                <div className="fixed top-20 left-1/2 -translate-x-1/2 z-50 bg-emerald-600 text-white px-8 py-4 rounded-2xl shadow-2xl flex items-center gap-4 animate-in slide-in-from-top-4 duration-300">
                    <div className="bg-white/20 p-2 rounded-xl">
                        <Save size={20} className="animate-bounce" />
                    </div>
                    <div>
                        <p className="text-[11px] font-black uppercase tracking-widest">Configuration mise à jour</p>
                        <p className="text-[9px] font-bold text-emerald-100 uppercase tracking-[0.2em] mt-0.5">Les modifications ont été enregistrées avec succès</p>
                    </div>
                </div>
            )}

            {showError && (
                <div className="fixed top-20 left-1/2 -translate-x-1/2 z-50 bg-red-600 text-white px-8 py-4 rounded-2xl shadow-2xl flex items-center gap-4 animate-in slide-in-from-top-4 duration-300">
                    <div className="bg-white/20 p-2 rounded-xl">
                        <Info size={20} className="animate-pulse" />
                    </div>
                    <div>
                        <p className="text-[11px] font-black uppercase tracking-widest">Erreur technique</p>
                        <p className="text-[9px] font-bold text-red-100 uppercase tracking-[0.2em] mt-0.5">Impossible d'enregistrer les paramètres pour le moment</p>
                    </div>
                </div>
            )}

            <div className="flex-1 max-w-4xl mx-auto w-full p-8 overflow-y-auto">
                <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden animate-in fade-in slide-in-from-bottom-4 mb-8">
                    <div className="p-6 flex justify-between items-center bg-slate-50/50 border-b border-slate-100">
                        <div className="flex items-center gap-3">
                            <div className="bg-indigo-600 p-2 rounded-xl text-white shadow-lg shadow-indigo-100"><Hotel size={20} /></div>
                            <div>
                                <h2 className="text-sm font-bold text-slate-800 uppercase tracking-tight">Fiche d'identité de l'établissement</h2>
                                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Informations légales et coordonnées</p>
                            </div>
                        </div>
                    </div>

                    <div className="p-8 space-y-8">
                        <div className="flex flex-col md:flex-row gap-8 items-start">
                            {/* Logo Upload Section */}
                            <div className="w-full md:w-1/3 space-y-4">
                                <label className={labelClass}>Logo de l'établissement</label>
                                <div className="relative group">
                                    <div className="aspect-square w-full bg-slate-100 rounded-[2rem] border-2 border-dashed border-slate-200 flex flex-col items-center justify-center overflow-hidden transition-all group-hover:border-indigo-400 group-hover:bg-indigo-50/30">
                                        {hotelInfo.logo ? (
                                            <div className="relative w-full h-full p-4 flex items-center justify-center">
                                                <img src={hotelInfo.logo} alt="Logo" className="max-w-full max-h-full object-contain drop-shadow-sm" />
                                                <button
                                                    onClick={() => setHotelInfo({ ...hotelInfo, logo: undefined })}
                                                    className="absolute top-2 right-2 p-1.5 bg-red-100 text-red-600 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                                                >
                                                    <X size={14} />
                                                </button>
                                            </div>
                                        ) : (
                                            <div className="text-center p-6">
                                                <div className="w-12 h-12 bg-white rounded-2xl shadow-sm flex items-center justify-center mx-auto mb-3 text-slate-300 group-hover:scale-110 transition-transform">
                                                    <Hotel size={24} />
                                                </div>
                                                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Cliquez pour ajouter</p>
                                            </div>
                                        )}
                                        <input
                                            type="file"
                                            accept="image/*"
                                            onChange={handleLogoChange}
                                            className="absolute inset-0 opacity-0 cursor-pointer"
                                        />
                                    </div>
                                    <p className="text-[8px] text-slate-400 mt-2 text-center font-bold uppercase tracking-tighter">Format recommandé : Carré ou Horizontal (PNG/JPG)</p>
                                </div>
                            </div>

                            <div className="flex-1 space-y-6 w-full">
                                <div>
                                    <label className={labelClass}>Nom commercial de l'hôtel</label>
                                    <input
                                        className={inputClass}
                                        value={hotelInfo.name}
                                        onChange={e => setHotelInfo({ ...hotelInfo, name: e.target.value })}
                                        placeholder="Ex: Grand Palace Hotel"
                                    />
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div className="md:col-span-2">
                                        <label className={labelClass}>Adresse complète de l'établissement</label>
                                        <div className="relative flex items-center">
                                            <MapPin className="absolute left-4 text-slate-300" size={16} />
                                            <input
                                                className={`${inputClass} pl-10`}
                                                value={hotelInfo.address}
                                                onChange={e => setHotelInfo({ ...hotelInfo, address: e.target.value })}
                                                placeholder="Rue, Code Postal, Ville, Pays"
                                            />
                                        </div>
                                    </div>
                                    <div>
                                        <label className={labelClass}>Email officiel</label>
                                        <div className="relative flex items-center">
                                            <Mail className="absolute left-4 text-slate-300" size={16} />
                                            <input
                                                className={`${inputClass} pl-10`}
                                                value={hotelInfo.email}
                                                onChange={e => setHotelInfo({ ...hotelInfo, email: e.target.value })}
                                                placeholder="contact@hotel.com"
                                            />
                                        </div>
                                    </div>
                                    <div>
                                        <label className={labelClass}>Ligne directe réception</label>
                                        <div className="relative flex items-center">
                                            <Phone className="absolute left-4 text-slate-300" size={16} />
                                            <input
                                                className={`${inputClass} pl-10`}
                                                value={hotelInfo.phone}
                                                onChange={e => setHotelInfo({ ...hotelInfo, phone: e.target.value })}
                                                placeholder="+33 1 23 45 67 89"
                                            />
                                        </div>
                                    </div>
                                    <div>
                                        <label className={labelClass}>Numéro SIRET / ID Fiscal</label>
                                        <div className="relative flex items-center">
                                            <Hash className="absolute left-4 text-slate-300" size={16} />
                                            <input
                                                className={`${inputClass} pl-10`}
                                                value={hotelInfo.siret}
                                                onChange={e => setHotelInfo({ ...hotelInfo, siret: e.target.value })}
                                                placeholder="123 456 789 00010"
                                            />
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-12 pt-8 border-t border-slate-50">
                            <div>
                                <h3 className="text-[11px] font-black text-slate-800 mb-6 uppercase tracking-[0.2em] flex items-center gap-2">
                                    <Clock size={16} className="text-indigo-600" /> Horaires standards
                                </h3>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="bg-slate-50/50 p-4 rounded-2xl border border-slate-100">
                                        <label className={labelClass}>Check-in</label>
                                        <input
                                            type="time"
                                            className={`${inputClass} !bg-white`}
                                            value={hotelInfo.checkInTime}
                                            onChange={e => setHotelInfo({ ...hotelInfo, checkInTime: e.target.value })}
                                        />
                                    </div>
                                    <div className="bg-slate-50/50 p-4 rounded-2xl border border-slate-100">
                                        <label className={labelClass}>Check-out</label>
                                        <input
                                            type="time"
                                            className={`${inputClass} !bg-white`}
                                            value={hotelInfo.checkOutTime}
                                            onChange={e => setHotelInfo({ ...hotelInfo, checkOutTime: e.target.value })}
                                        />
                                    </div>
                                </div>
                            </div>

                            <div>
                                <h3 className="text-[11px] font-black text-slate-800 mb-6 uppercase tracking-[0.2em] flex items-center gap-2">
                                    <FileText size={16} className="text-indigo-600" /> Personnalisation Facture
                                </h3>
                                <div>
                                    <label className={labelClass}>Message de bas de page</label>
                                    <textarea
                                        className={`${inputClass} h-32 resize-none pt-4`}
                                        value={hotelInfo.invoiceFooter || ''}
                                        onChange={e => setHotelInfo({ ...hotelInfo, invoiceFooter: e.target.value })}
                                        placeholder="Ex: Merci de votre visite ! L'établissement décline toute responsabilité pour les objets de valeur non déposés au coffre."
                                    />
                                    <p className="text-[9px] text-slate-400 mt-2 font-bold uppercase tracking-tight italic">S'affiche tout en bas de vos factures et proformas.</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="px-8 py-6 bg-slate-900 flex justify-between items-center border-t border-white/10">
                        <div className="flex items-center gap-3 text-[10px] text-indigo-300 font-bold uppercase tracking-widest">
                            <div className="p-1.5 bg-white/10 text-white rounded-lg"><Info size={14} /></div>
                            <span>Les modifications seront effectives immédiatement</span>
                        </div>
                        <button
                            onClick={handleSave}
                            disabled={saving}
                            className={`bg-indigo-600 text-white px-10 py-3.5 rounded-[1.25rem] font-black uppercase tracking-[0.1em] text-[11px] hover:bg-indigo-500 shadow-2xl shadow-indigo-500/20 transition-all active:scale-95 flex items-center gap-4 ${saving ? 'opacity-50 cursor-not-allowed' : ''}`}
                        >
                            {saving ? (
                                <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Enregistrement... </>
                            ) : (
                                <><Save size={18} strokeWidth={2.5} /> Enregistrer la configuration</>
                            )}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default SettingsHotel;
