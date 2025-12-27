
import React, { useState } from 'react';
import { Hotel, Save, Info, MapPin, Mail, Phone, Hash, Clock } from 'lucide-react';
import Header from '../components/Header';

const SettingsHotel: React.FC = () => {
  const [hotelInfo, setHotelInfo] = useState({
      name: 'Hotel Manager Paris',
      address: '12 Avenue des Champs Élysées, 75000 Paris',
      email: 'contact@hotelmanager.io',
      phone: '+33 1 23 45 67 89',
      siret: '123 456 789 00012',
      checkInTime: '15:00',
      checkOutTime: '11:00'
  });

  const handleSave = () => {
      alert("Paramètres enregistrés avec succès !");
  };

  const labelClass = "block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1";
  const inputClass = "w-full border border-slate-200 rounded-xl px-4 py-2.5 text-[13px] font-bold text-slate-700 bg-slate-50/50 focus:bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all shadow-sm";

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
      <Header title="Paramètres Établissement" backLink="/settings" backLabel="Paramètres" />
      
      <div className="flex-1 max-w-4xl mx-auto w-full p-8 overflow-y-auto">
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden animate-in fade-in slide-in-from-bottom-4">
            <div className="p-6 flex justify-between items-center">
                <div className="flex items-center gap-3">
                    <div className="bg-indigo-600 p-2 rounded-xl text-white shadow-lg shadow-indigo-100"><Hotel size={20}/></div>
                    <div>
                        <h2 className="text-sm font-bold text-slate-800 uppercase tracking-tight">Fiche d'identité de l'établissement</h2>
                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Informations légales et coordonnées</p>
                    </div>
                </div>
            </div>
            
            <div className="p-8 space-y-8">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="md:col-span-2">
                        <label className={labelClass}>Nom commercial de l'hôtel</label>
                        <input 
                            className={inputClass}
                            value={hotelInfo.name}
                            onChange={e => setHotelInfo({...hotelInfo, name: e.target.value})}
                        />
                    </div>
                    <div className="md:col-span-2">
                        <label className={labelClass}>Adresse complète de l'établissement</label>
                        <div className="relative">
                            <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-300" size={16}/>
                            <input 
                                className={`${inputClass} pl-10`}
                                value={hotelInfo.address}
                                onChange={e => setHotelInfo({...hotelInfo, address: e.target.value})}
                            />
                        </div>
                    </div>
                    <div>
                        <label className={labelClass}>Email officiel</label>
                        <div className="relative">
                            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-300" size={16}/>
                            <input 
                                className={`${inputClass} pl-10`}
                                value={hotelInfo.email}
                                onChange={e => setHotelInfo({...hotelInfo, email: e.target.value})}
                            />
                        </div>
                    </div>
                    <div>
                        <label className={labelClass}>Ligne directe réception</label>
                        <div className="relative">
                            <Phone className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-300" size={16}/>
                            <input 
                                className={`${inputClass} pl-10`}
                                value={hotelInfo.phone}
                                onChange={e => setHotelInfo({...hotelInfo, phone: e.target.value})}
                            />
                        </div>
                    </div>
                    <div>
                        <label className={labelClass}>Numéro SIRET / ID Fiscal</label>
                        <div className="relative">
                            <Hash className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-300" size={16}/>
                            <input 
                                className={`${inputClass} pl-10`}
                                value={hotelInfo.siret}
                                onChange={e => setHotelInfo({...hotelInfo, siret: e.target.value})}
                            />
                        </div>
                    </div>

                    <div className="md:col-span-2 border-t border-slate-100 pt-8 mt-4">
                        <h3 className="text-[11px] font-black text-slate-800 mb-6 uppercase tracking-[0.2em] flex items-center gap-2">
                            <Clock size={16} className="text-indigo-600"/> Horaires standards d'exploitation
                        </h3>
                        <div className="grid grid-cols-2 gap-8 max-w-md">
                            <div>
                                <label className={labelClass}>Heure de Check-in</label>
                                <input 
                                    type="time"
                                    className={`${inputClass} !text-indigo-600 !text-base`}
                                    value={hotelInfo.checkInTime}
                                    onChange={e => setHotelInfo({...hotelInfo, checkInTime: e.target.value})}
                                />
                            </div>
                            <div>
                                <label className={labelClass}>Heure de Check-out</label>
                                <input 
                                    type="time"
                                    className={`${inputClass} !text-indigo-600 !text-base`}
                                    value={hotelInfo.checkOutTime}
                                    onChange={e => setHotelInfo({...hotelInfo, checkOutTime: e.target.value})}
                                />
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            
            <div className="px-8 py-6 flex justify-between items-center">
                <div className="flex items-center gap-3 text-[10px] text-slate-400 font-bold uppercase tracking-widest">
                    <div className="p-1.5 bg-indigo-100 text-indigo-600 rounded-lg"><Info size={14} /></div>
                    <span>Ces données seront reportées sur vos factures</span>
                </div>
                <button 
                    onClick={handleSave}
                    className="bg-indigo-600 text-white px-8 py-3 rounded-xl font-black uppercase tracking-widest text-[10px] hover:bg-indigo-700 shadow-lg shadow-indigo-100 transition-all active:scale-95 flex items-center gap-3"
                >
                    <Save size={18}/> Enregistrer les modifications
                </button>
            </div>
        </div>
      </div>
    </div>
  );
};

export default SettingsHotel;
